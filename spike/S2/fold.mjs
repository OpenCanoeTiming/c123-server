// Spike S2: the client-side fold of a §7.2 delta stream (CONTRACTS §1.6 "creation over the push"), and the §7.1
// hydration bodies built from a folded state. Used twice: capture.mjs folds S1's step log up to the hydration
// point, admit.mjs folds the fixture itself (hydration + deltas) as a consumer would.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function canonical(v) {
  return JSON.stringify(sortDeep(v));
}
export function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = sortDeep(v[k]);
    return o;
  }
  return v;
}
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const byKey = (k) => (x, y) => (x[k] < y[k] ? -1 : x[k] > y[k] ? 1 : 0);

export class ClientState {
  constructor() {
    this.event = null;
    this.classes = new Map(); this.phases = new Map(); this.entries = new Map(); this.courses = new Map();
    this.attempts = new Map(); this.standings = new Map(); this.writes = new Map();
    this.checks = new Map(); this.flags = new Map();
    this.oncourse = { attemptIds: [], featuredByUpstream: null, asOf: null };
    this.diagnostics = []; this.sources = null;
    this.lastSeq = 0; this.unknownTypes = {};
  }

  /** Apply one §7.2 message. Partial `*.updated` merge into the held entity or create it (§1.6). */
  apply(d) {
    this.lastSeq = d.seq;
    const merge = (map, id, fields) => map.set(id, { ...(map.get(id) ?? {}), ...fields });
    switch (d.type) {
      case 'attempt.updated': return merge(this.attempts, d.attemptId, { attemptId: d.attemptId, ...d.fields });
      case 'attempt.deleted': return void this.attempts.delete(d.attemptId);
      case 'phase.updated': return merge(this.phases, d.phaseId, d.fields);
      case 'entry.updated': return merge(this.entries, d.entryId, d.fields);
      case 'class.updated': return merge(this.classes, d.classId, d.fields);
      case 'course.updated': return void this.courses.set(d.course.courseId, d.course);
      case 'standing.updated': return void this.standings.set(d.standing.standingKey, d.standing);
      case 'oncourse.updated': this.oncourse = { attemptIds: d.attemptIds, featuredByUpstream: d.featuredByUpstream, asOf: d.asOf }; return;
      case 'diagnostics.updated': this.diagnostics = d.diagnostics; return;
      case 'sources.updated': this.sources = d.sources; return;
      case 'write.updated': return void this.writes.set(d.write.writeId, d.write);
      case 'check.updated': return void this.checks.set(`${d.attemptId}:${d.run}:${d.gate}`, d.check);
      case 'flag.updated': return void this.flags.set(`${d.flag.attemptId}:${d.flag.run}:${d.flag.gate}`, d.flag);
      case 'event.changed':
        if (this.event && this.event.eventId !== d.event.eventId) Object.assign(this, new ClientState(), { lastSeq: d.seq });
        this.event = d.event; return;
      case 'scope.replaced': {
        const inScope = (phaseId) => d.scope.kind === 'event' || phaseId === d.scope.phaseId;
        for (const [id, a] of this.attempts) if (inScope(a.phaseId)) this.attempts.delete(id);
        for (const a of d.attempts) this.attempts.set(a.attemptId, a);
        const names = (s) => [s.scope.phaseId, s.scope.firstPhaseId, s.scope.secondPhaseId].filter(Boolean);
        for (const [k, s] of this.standings) if (names(s).some(inScope)) this.standings.delete(k);
        for (const s of d.standings) this.standings.set(s.standingKey, s);
        return;
      }
      default: this.unknownTypes[d.type] = (this.unknownTypes[d.type] ?? 0) + 1;
    }
  }

  /** CONTRACTS §7.1: every GET body a client can hydrate from, keyed by path. */
  responses(asOfSeq) {
    const list = (map, k) => [...map.values()].sort(byKey(k));
    const r = {};
    if (this.event) r['/api/events/current'] = { asOfSeq, event: this.event, classes: list(this.classes, 'classId'), courses: list(this.courses, 'courseId') };
    for (const c of list(this.classes, 'classId')) {
      const id = c.classId;
      r[`/api/classes/${id}/phases`] = { asOfSeq, phases: list(this.phases, 'phaseId').filter((p) => p.classId === id) };
      r[`/api/classes/${id}/entries`] = { asOfSeq, entries: list(this.entries, 'entryId').filter((e) => e.classId === id) };
      r[`/api/classes/${id}/standings`] = { asOfSeq, standings: list(this.standings, 'standingKey').filter((s) => s.classId === id) };
    }
    for (const p of list(this.phases, 'phaseId')) {
      const id = p.phaseId;
      r[`/api/phases/${id}/attempts`] = { asOfSeq, attempts: list(this.attempts, 'attemptId').filter((a) => a.phaseId === id) };
      const ck = (m) => [...m.entries()].filter(([k]) => k.startsWith(`${id}:`)).sort(([x], [y]) => (x < y ? -1 : 1)).map(([, v]) => v);
      r[`/api/phases/${id}/checks`] = { asOfSeq, checks: ck(this.checks), flags: ck(this.flags) };
    }
    r['/api/oncourse'] = { asOfSeq, attempts: this.oncourse.attemptIds.map((id) => this.attempts.get(id)), featuredByUpstream: this.oncourse.featuredByUpstream, asOf: this.oncourse.asOf };
    if (this.sources) r['/api/sources'] = this.sources;
    r['/api/diagnostics'] = { asOfSeq, diagnostics: this.diagnostics };
    return r;
  }

  /** The inverse of responses(): what a client holds after hydrating from them. */
  static fromResponses(r) {
    const s = new ClientState();
    const ev = r['/api/events/current'];
    if (ev) {
      s.event = ev.event;
      for (const c of ev.classes) s.classes.set(c.classId, c);
      for (const c of ev.courses) s.courses.set(c.courseId, c);
    }
    for (const [path, body] of Object.entries(r)) {
      if (/^\/api\/classes\/[^/]+\/phases$/.test(path)) for (const p of body.phases) s.phases.set(p.phaseId, p);
      else if (/^\/api\/classes\/[^/]+\/entries$/.test(path)) for (const e of body.entries) s.entries.set(e.entryId, e);
      else if (/^\/api\/classes\/[^/]+\/standings$/.test(path)) for (const x of body.standings) s.standings.set(x.standingKey, x);
      else if (/^\/api\/phases\/[^/]+\/attempts$/.test(path)) for (const a of body.attempts) s.attempts.set(a.attemptId, a);
    }
    const oc = r['/api/oncourse'];
    for (const a of oc.attempts) s.attempts.set(a.attemptId, a);   // an on-course Attempt whose Phase is not served
    s.oncourse = { attemptIds: oc.attempts.map((a) => a.attemptId), featuredByUpstream: oc.featuredByUpstream, asOf: oc.asOf };
    s.sources = r['/api/sources'] ?? null;
    s.diagnostics = r['/api/diagnostics'].diagnostics;
    return s;
  }

  /** Same shape and order as S1's presentedState() (final-state.json), minus `seq`, for the self-checks. */
  presented() {
    const list = (map, k) => [...map.values()].sort(byKey(k));
    return {
      event: this.event, phases: list(this.phases, 'phaseId'), classes: list(this.classes, 'classId'),
      entries: list(this.entries, 'entryId'), courses: list(this.courses, 'courseId'),
      attempts: list(this.attempts, 'attemptId'), standings: list(this.standings, 'standingKey'),
      oncourse: this.oncourse, diagnostics: this.diagnostics, sources: this.sources, writes: list(this.writes, 'writeId'),
    };
  }
}

/** Section-by-section comparison of two presented states: { section: 'equal' | 'differs (n of m)' }. */
export function compareStates(a, b) {
  const out = {};
  for (const k of Object.keys(a)) {
    if (canonical(a[k]) === canonical(b[k])) { out[k] = 'equal'; continue; }
    if (Array.isArray(a[k]) && Array.isArray(b[k])) {
      const sb = new Set(b[k].map(canonical));
      out[k] = `differs (${a[k].filter((x) => !sb.has(canonical(x))).length} of ${a[k].length} not in the other, lengths ${a[k].length}/${b[k].length})`;
    } else out[k] = 'differs';
  }
  return out;
}

/** The excerpt's metadata: excerpt.json in the merged layout (protocol-docs 4ab91d2), manifest.json before it. */
export function excerptMeta(dir) {
  const p = existsSync(join(dir, 'excerpt.json')) ? join(dir, 'excerpt.json') : join(dir, 'manifest.json');
  const m = JSON.parse(readFileSync(p, 'utf8'));
  if (!m.source || !m.checksum) throw new Error(`${p} carries no excerpt metadata`);
  return m;
}
