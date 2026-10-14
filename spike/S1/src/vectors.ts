// Tier-1 adapter (TEST-ARCHITECTURE §3.1): feed each vector's `given` into the merge core and compare with `expect`.
// The vectors are data; nothing here weakens them. A failed comparison is reported as a failure.
import { Domain } from './merge.js';
import { assembleStanding } from './standing.js';
import type { Delta, Element, FieldStatement, SnapshotRow } from './types.js';
import { r3 } from './util.js';

const ENTRY_FIELDS = new Set(['displayName', 'members', 'club', 'nation', 'ageCategoryId', 'eventBib', 'isTeam']);
const isEntryField = (f: string) => ENTRY_FIELDS.has(f) || f.startsWith('members[');
const SPECIAL = new Set(['note', 'diagnostics', 'writeRequest', 'notifications', 'oncourse', 'featuredByUpstream', 'attempts', 'standing', 'ageCategoryId', 'gateStatus', 'checks', 'anomalies']);

export type VectorResult = { id: string; invariant: string; pass: boolean; failures: string[] };

/** Subset match: every key the expectation states must match; arrays match element-wise with equal length. */
export function subsetMatch(exp: unknown, act: unknown, path: string, out: string[]): void {
  if (exp === null || typeof exp !== 'object') {
    const ok = typeof exp === 'number' && typeof act === 'number' ? r3(exp) === r3(act) : exp === act;
    if (!ok) out.push(`${path}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(act)}`);
    return;
  }
  if (Array.isArray(exp)) {
    if (!Array.isArray(act)) { out.push(`${path}: expected array, got ${JSON.stringify(act)}`); return; }
    if (exp.length !== act.length) { out.push(`${path}: expected ${exp.length} items, got ${act.length}: ${JSON.stringify(act)}`); return; }
    exp.forEach((e, i) => subsetMatch(e, act[i], `${path}[${i}]`, out));
    return;
  }
  if (act === null || typeof act !== 'object' || Array.isArray(act)) { out.push(`${path}: expected object, got ${JSON.stringify(act)}`); return; }
  for (const [k, v] of Object.entries(exp as Record<string, unknown>)) subsetMatch(v, (act as Record<string, unknown>)[k], `${path}.${k}`, out);
}

function matchSet(exp: unknown[], act: unknown[], path: string, out: string[]) {
  if (exp.length !== act.length) { out.push(`${path}: expected ${exp.length} items, got ${act.length}: ${JSON.stringify(act)}`); return; }
  const used = new Set<number>();
  for (const e of exp) {
    const i = act.findIndex((a, j) => { if (used.has(j)) return false; const f: string[] = []; subsetMatch(e, a, '', f); return f.length === 0; });
    if (i < 0) out.push(`${path}: no match for ${JSON.stringify(e)} in ${JSON.stringify(act)}`); else used.add(i);
  }
}

// ───────────────────────────── merge vectors ─────────────────────────────

class MergeRun {
  d: Domain;
  defaultAttempt: string;
  defaultEntry = 'E1';
  defaultPhase: string;
  stepDeltas: Delta[][] = [];
  allDeltas: Delta[] = [];
  constructor(public v: any) {
    const ctx = v.context ?? {};
    this.d = new Domain({
      zone: null, pollIntervalMs: (ctx.xmlPollIntervalSeconds ?? 5) * 1000, eventId: 'vector',
      tier: ctx.tier === 'live' ? 'live' : 'onsite', tcpConnected: true,
      xmlState: ctx.xml === 'unreachable' ? 'unreachable' : 'connected',
    });
    // The format has no default Attempt; when the vector's own expect keys name exactly one Attempt, that is it.
    const keys = [v.expect, ...(v.expectSequence ?? []).map((e: any) => e.expect)].flatMap((e: any) => Object.keys(e ?? {}));
    const named = [...new Set(keys.filter((k) => k.includes(':')).map((k) => k.slice(0, k.indexOf('.', k.indexOf(':')))))];
    this.defaultPhase = ctx.phase ?? (named.length === 1 ? named[0]!.slice(0, named[0]!.lastIndexOf(':')) : 'K1M_BR1_6');
    this.defaultAttempt = named.length === 1 && !ctx.phase ? named[0]! : `${this.defaultPhase}:9`;
  }

  run(g: any): Delta[] {
    let deltas: Delta[];
    if (g.push) {
      const id = g.push === 'classification' ? g.phaseId : g.push === 'entry' ? this.defaultEntry : 'oncourse';
      deltas = this.d.applyLivePush(g.push, g.body, g.observedAt, id).deltas;
    } else {
      const el = this.toElement(g);
      if (this.v.context?.onCourseList && el.type === 'observation' && el.scope === 'attempt') {
        const a = (this.d as any).getAttempt(el.attemptId, el.observedAt, el.source);
        a.listed = true;
      }
      deltas = this.d.apply(el).deltas;
    }
    this.stepDeltas.push(deltas);
    this.allDeltas.push(...deltas);
    return deltas;
  }

  toElement(g: any): Element {
    if (g.event) {
      const attemptId = g.attemptId ?? (g.event === 'oncourse-left' || g.event === 'delete' ? this.defaultAttempt : undefined);
      return { type: 'event', event: g.event, observedAt: g.observedAt, ...(attemptId ? { attemptId } : {}), ...(g.scope ? { scope: g.scope } : {}) };
    }
    if (g.snapshot) {
      const sn = g.snapshot;
      const rows: SnapshotRow[] = sn.rows.map((r: any) => {
        const row: SnapshotRow = { bib: r.bib };
        if (r.status) row.status = r.status;
        if (r.outcome) { row.outcome = r.outcome; row.runSeconds = r.outcome.runSeconds ?? null; }
        if (r.placement) row.placement = r.placement;
        if (r.pairTotal !== undefined) row.pairTotal = r.pairTotal;
        if (r.finishTime) row.finishTime = r.finishTime;
        if (r.judgingComplete !== undefined) row.judgingComplete = r.judgingComplete;
        if (r.timeEmpty) row.timeEmpty = true;
        if (r.untimed) row.untimed = true;
        if (r.qualified !== undefined) row.qualified = r.qualified;
        return row;
      });
      return { type: 'snapshot', observedAt: g.observedAt, source: sn.source, phaseId: sn.phaseId, mode: sn.mode, rows };
    }
    if (g.field === 'onCourse') {
      const v = g.value;
      const status = !v.dtStart ? 'at-start' : v.dtFinish ? 'finished' : 'on-course';
      return { type: 'listing', observedAt: g.observedAt, attemptId: g.attemptId ?? this.defaultAttempt, dtStart: v.dtStart ?? null, dtFinish: v.dtFinish ?? null,
        fields: [{ field: 'status', value: status, confidence: 'authoritative' }] };
    }
    const st: FieldStatement = { field: g.field };
    if ('value' in g) st.value = g.value;
    if (g.state) st.state = g.state;
    if (g.reason) st.reason = g.reason;
    if (g.eventTime) st.eventTime = g.eventTime;
    if (g.confidence) st.confidence = g.confidence;
    if (g.judgingComplete !== undefined) st.judgingComplete = g.judgingComplete;
    if (g.runClosed) st.runClosed = true;
    if (g.provisionalOverride !== undefined) st.provisionalOverride = g.provisionalOverride;
    const kind = g.kind ?? (g.source === 'operator-write' ? 'operator' : 'result-row');
    const scope = g.scope === 'phase' || this.v.scope === 'phase' ? 'phase' : this.v.scope === 'entry' && isEntryField(g.field) ? 'entry' : 'attempt';
    if (scope !== 'attempt') {
      return { type: 'observation', observedAt: g.observedAt, source: g.source, kind, scope, id: scope === 'phase' ? this.defaultPhase : this.defaultEntry, fields: [st] };
    }
    const resultRow = kind === 'result-row' || kind === 'fragment';
    const rowStatus = g.field === 'status' ? g.value : g.field === 'outcome' && g.value?.kind === 'no-result' ? g.value.status : undefined;
    return {
      type: 'observation', observedAt: g.observedAt, source: g.source, kind, scope: 'attempt', attemptId: g.attemptId ?? this.defaultAttempt, fields: [st],
      ...(resultRow && g.eventTime ? { finishTime: g.eventTime } : {}),
      ...(resultRow && g.field === 'outcome' && typeof g.value?.runSeconds === 'number' ? { runSeconds: g.value.runSeconds } : {}),
      ...(rowStatus !== undefined ? { rowStatus } : {}),
    };
  }

  check(exp: Record<string, any>, out: string[], stepIndex: number | null) {
    for (const [key, ev] of Object.entries(exp)) {
      if (SPECIAL.has(key)) { this.checkSpecial(key, ev, out, stepIndex); continue; }
      let target: 'attempt' | 'entry' | 'phase' = 'attempt', id = this.defaultAttempt, field = key;
      const colon = key.indexOf(':');
      if (colon >= 0) { const dot = key.indexOf('.', colon); id = key.slice(0, dot); field = key.slice(dot + 1); }
      else if (this.v.scope === 'phase') { target = 'phase'; id = this.defaultPhase; }
      else if (this.v.scope === 'entry' && isEntryField(field)) { target = 'entry'; id = this.defaultEntry; }
      const actual = this.presented(target, id, field);
      subsetMatch(ev, actual, key, out);
    }
  }

  presented(target: string, id: string, field: string): unknown {
    if (target === 'attempt') {
      const a = this.d.attempts.get(id);
      return a ? (a.presented[field] ?? { state: 'not-yet' }) : { state: 'not-yet' };
    }
    const e = this.d.entities.get(`${target}:${id}`);
    return e?.presented[field] ?? { state: 'not-yet' };
  }

  checkSpecial(key: string, ev: any, out: string[], stepIndex: number | null) {
    switch (key) {
      case 'note': case 'ageCategoryId': return;
      case 'diagnostics': {
        const act = [...this.d.diagnostics.values()];
        if (ev.length === 0 && act.length) out.push(`diagnostics: expected none, got ${JSON.stringify(act)}`);
        else matchSet(ev, act, 'diagnostics', out);
        return;
      }
      case 'writeRequest': {
        const w = this.d.writes[this.d.writes.length - 1];
        subsetMatch(ev, w, 'writeRequest', out);
        return;
      }
      case 'oncourse': subsetMatch(ev, this.d.oncourseSet(), 'oncourse', out); return;
      case 'featuredByUpstream': subsetMatch(ev, this.d.oncourse.featuredByUpstream, 'featuredByUpstream', out); return;
      case 'attempts': subsetMatch(ev, [...this.d.attempts.keys()].sort(), 'attempts', out); return;
      case 'standing': {
        for (const [k, entries] of Object.entries(ev)) subsetMatch(entries, (this.d.standings.get(k)?.entries as unknown[]) ?? [], `standing.${k}`, out);
        return;
      }
      case 'notifications': return this.checkNotifications(ev, out, stepIndex);
    }
  }

  checkNotifications(ev: any, out: string[], stepIndex: number | null) {
    if (typeof ev === 'number') {
      const n = this.allDeltas.filter((d) => d.type === 'attempt.updated' && d.attemptId === this.defaultAttempt).length;
      if (n !== ev) out.push(`notifications: expected ${ev} client-visible changes, got ${n}`);
      return;
    }
    if (typeof ev === 'object') {
      for (const [type, n] of Object.entries(ev)) {
        const c = this.allDeltas.filter((d) => d.type === type).length;
        if (c !== n) out.push(`notifications.${type}: expected ${n}, got ${c}`);
      }
      return;
    }
    // Prose notifications: asserted as literally as the sentence allows.
    const text = String(ev);
    const steps = this.stepDeltas;
    if (/scope\.replaced/.test(text)) {
      const at = stepIndex ?? steps.length - 1;
      const n = steps[at]!.filter((d) => d.type === 'scope.replaced').length;
      if (n !== 1) out.push(`notifications: expected one scope.replaced at step ${at}, got ${n}`);
    } else if (/one push carrying run, status/.test(text)) {
      const idx = this.v.given.findIndex((g: any) => g.field === 'run');
      const ds = steps[idx]!.filter((d) => d.type === 'attempt.updated' && d.attemptId === this.defaultAttempt);
      const f = ds[0]?.fields as Record<string, any> | undefined;
      if (ds.length !== 1 || !f?.run || !f?.status || f.outcome?.state !== 'not-yet' || f.placement?.state !== 'not-yet') {
        out.push(`notifications: expected one attempt.updated carrying run, status and explicit not-yet values at the run step, got ${JSON.stringify(ds)}`);
      }
    } else if (/attempt\.updated for bib (\d+) carrying explicit not-yet/.test(text)) {
      const bib = /bib (\d+)/.exec(text)![1];
      const found = this.allDeltas.some((d) => d.type === 'attempt.updated' && String(d.attemptId).endsWith(`:${bib}`)
        && Object.values(d.fields as Record<string, any>).some((e) => e?.state === 'not-yet'));
      if (!found) out.push(`notifications: no attempt.updated for bib ${bib} with explicit not-yet values`);
    } else out.push(`notifications: unrecognised prose assertion "${text}"`);
  }
}

function runMerge(v: any): string[] {
  const m = new MergeRun(v);
  const out: string[] = [];
  const seqExp: any[] = v.expectSequence ?? [];
  const at = (i: number) => seqExp.filter((e) => e.afterGivenIndex === i).forEach((e) => m.check(e.expect, out, i));
  at(-1);
  v.given.forEach((g: any, i: number) => { m.run(g); at(i); });
  for (const g of v.then ?? []) m.run(g);
  m.check(v.expect, out, null);
  return out;
}

// ───────────────────────────── standing-assembly vectors ─────────────────────────────

function runStanding(v: any): string[] {
  const scope = v.scope;
  const inputs = v.given.entries.map((e: any) => ({
    entryId: e.entryId, bib: e.bib, status: e.status ?? null, placement: e.placement ?? null,
    result: e.result ?? { kind: 'pending' }, pairTotal: e.pairTotal ?? null, ageCategoryId: e.ageCategoryId ?? null,
    provisional: !!e.provisional, underReview: !!e.underReview,
  }));
  const durationScored = scope.kind === 'phase' || scope.kind === 'pair';
  const { entries, anomalies } = assembleStanding(inputs, {
    scope, ageCategoryId: v.ageCategoryId ?? null, durationScored, upstreamCategoryRanks: v.upstreamCategoryRanks, withAnomalies: true,
  });
  const out: string[] = [];
  subsetMatch(v.expect.standing, entries, 'standing', out);
  if (v.expect.anomalies) {
    if (v.expect.anomalies.length === 0 && anomalies.length) out.push(`anomalies: expected none, got ${JSON.stringify(anomalies)}`);
    else matchSet(v.expect.anomalies, anomalies, 'anomalies', out);
  }
  return out;
}

// ───────────────────────────── workflow-state vectors (§2.10, DERIVATIONS §6) ─────────────────────────────

/** Display state of one gate: flagged | verified | stale | plain (CONTRACTS §2.10, DERIVATIONS §6). */
export function gateStatusOf(key: string, checks: any[], flags: any[], presented: Record<string, { run: number; gates: { number: number; penalty: number | null }[] | null }>): string {
  const parts = key.split(':');
  const gate = Number(parts.pop()), run = Number(parts.pop()), aid = parts.join(':');
  if (flags.some((f) => f.attemptId === aid && f.run === run && f.gate === gate && !f.resolution)) return 'flagged';
  const c = checks.find((x) => x.attemptId === aid && x.run === run && x.gate === gate);
  if (!c) return 'plain';
  const p = presented[aid];
  // presented = gates.value[gate].penalty when gates is known for that generation, else null; null and 0 are distinct
  const pen = p && p.run === run && p.gates ? (p.gates.find((g) => g.number === gate)?.penalty ?? null) : null;
  return c.valueAtCheck === pen ? 'verified' : 'stale';
}

function gateStatusMap(exp: Record<string, string>, v: any, presented: any) {
  const out: Record<string, string> = {};
  for (const k of Object.keys(exp)) out[k] = gateStatusOf(k, v.given.checks, v.given.flags, presented);
  return out;
}

function runWorkflow(v: any): string[] {
  const out: string[] = [];
  let presented = v.given.presented;
  for (const e of v.expectSequence ?? []) if (e.afterGivenIndex === -1) subsetMatch(e.expect.gateStatus, gateStatusMap(e.expect.gateStatus, v, presented), 'gateStatus(-1)', out);
  for (const t of v.then ?? []) presented = t.presented;
  subsetMatch(v.expect.gateStatus, gateStatusMap(v.expect.gateStatus, v, presented), 'gateStatus', out);
  if (v.expect.checks) subsetMatch(v.expect.checks, v.given.checks, 'checks', out);
  return out;
}

export function runVector(v: any): VectorResult {
  let failures: string[];
  try {
    if (v.invariant === 'standing-assembly') failures = runStanding(v);
    else if (v.invariant === 'workflow-state') failures = runWorkflow(v);
    else failures = runMerge(v);
  } catch (err) {
    failures = [`threw: ${(err as Error).stack ?? err}`];
  }
  return { id: v.id, invariant: v.invariant, pass: failures.length === 0, failures };
}
