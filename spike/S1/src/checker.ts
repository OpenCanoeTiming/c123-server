// Gate-2 checker: TEST-ARCHITECTURE §3.2's fifteen properties as a function over the step log
// (design round 8, be151b2). Properties marked D read deltas only. A property a correct replay cannot
// satisfy is reported as found, never relaxed here; the report says which entries are CHECKER-FAIL.
import { canonical, compareBib } from './util.js';

type Env = { state: string; value?: any; observedAt?: string; eventTime?: string; source?: string; confidence?: string; provisional?: boolean; reason?: string };
export type Violation = { property: number; step: number; attemptId?: string; field?: string; detail: string };

const RUN_SCOPED = ['status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified', 'courseOrder', 'timeToBeat'];
const NO_RESULT = ['dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other'];
const STATUS_ORDER = ['not-started', 'at-start', 'on-course', 'left-without-finish', 'finished', 'non-ranked', 'dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other'];
const SOURCES_ONSITE = ['tcp', 'xml', 'operator-write'];
const REASONS = ['not-configured', 'source-unreachable', 'not-applicable'];
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const CROSS_FMT = /_(X8|X4|XS|XF|XT|XT1|XT2|XER)_/;
const SECOND_FMT = /_(BR2|HT2|EL2|TR2|NHT2|SR2|SUF)_/;

type FieldMeta = { kind: 'inference' | 'result-row' | 'other'; step: number; retractedSinceTable: boolean; tableSeen: boolean };
type A = {
  id: string; phaseId: string; bib: string; fields: Record<string, Env>; meta: Record<string, FieldMeta>;
  gen: number; genStart: string | null; contradicted: { finish: string | null; runSeconds: number | null } | null;
  contradictedThisGen: boolean; leftThisGen: boolean; created: boolean;
};

export class Checker {
  violations: Violation[] = [];
  counts: Record<number, number> = {};
  checked: Record<number, number> = {};
  private attempts = new Map<string, A>();
  private oncourse: string[] = [];
  private diagnostics: any[] = [];
  private standings = new Map<string, any>();
  private recorded = new Set<string>();
  private lastSeq = -Infinity;
  private lastRewrite: string | null = null;
  private lastDisconnectStep = 0;
  private rebaselineSteps = 0;
  constructor(private pollMs = 5000, private maxPerProperty = 50) {}

  private v(property: number, step: number, detail: string, attemptId?: string, field?: string) {
    this.counts[property] = (this.counts[property] ?? 0) + 1;
    if (this.violations.filter((x) => x.property === property).length < this.maxPerProperty) {
      this.violations.push({ property, step, ...(attemptId ? { attemptId } : {}), ...(field ? { field } : {}), detail });
    }
  }
  private c(property: number) { this.checked[property] = (this.checked[property] ?? 0) + 1; }

  private att(id: string): A {
    let a = this.attempts.get(id);
    if (!a) {
      const i = id.lastIndexOf(':');
      a = { id, phaseId: id.slice(0, i), bib: id.slice(i + 1), fields: {}, meta: {}, gen: 1, genStart: null, contradicted: null,
        contradictedThisGen: false, leftThisGen: false, created: false };
      this.attempts.set(id, a);
    }
    return a;
  }
  private f(a: A, field: string): Env { return a.fields[field] ?? { state: 'not-yet' }; }

  step(rec: { step: number; element: any; deltas: any[] }) {
    const el = rec.element, s = rec.step;
    if (el.observedAt) this.recorded.add(el.observedAt);
    if (el.class === 'event' && el.event === 'xml-rewrite-detected') this.lastRewrite = el.observedAt;
    if (el.class === 'event' && el.event === 'tcp-disconnected') this.lastDisconnectStep = s;
    if (el.class === 'event' && el.event === 'rebaseline') this.rebaselineSteps++;
    const oncourseBefore = [...this.oncourse];
    const diagBefore = this.diagnostics;
    // step-level facts the per-delta checks need
    const stepDiag = rec.deltas.filter((d) => d.type === 'diagnostics.updated').at(-1)?.diagnostics as any[] | undefined;
    const diagAfter = stepDiag ?? diagBefore;
    const rowsByBib = new Map<string, any>((el.rows ?? []).map((r: any) => [r.bib, r]));
    const before = new Map<string, Record<string, Env>>();
    const metaBefore = new Map<string, Record<string, FieldMeta>>();
    const changedThisStep = new Map<string, Set<string>>();
    let increments = 0;

    for (const d of rec.deltas) {
      // ── P1 (D): seq strictly increasing; observedAt values are recorded ones
      this.c(1);
      if (!(d.seq > this.lastSeq)) this.v(1, s, `seq ${d.seq} not greater than ${this.lastSeq}`);
      this.lastSeq = d.seq;
      for (const t of collectTimes(d)) if (!this.recorded.has(t)) this.v(1, s, `time ${t} in ${d.type} is not a recorded observedAt`);
      // ── P2 (D): envelopes
      if (/^(attempt|phase|entry|class)\.updated$/.test(d.type)) for (const [k, e] of Object.entries(d.fields ?? {})) if (isEnv(e)) { this.c(2); checkEnv(e as Env, (m) => this.v(2, s, `${d.type} ${k}: ${m}`, d.attemptId, k)); }
      if (d.type === 'course.updated') for (const [k, e] of Object.entries(d.course ?? {})) if (isEnv(e)) { this.c(2); checkEnv(e as Env, (m) => this.v(2, s, `course ${k}: ${m}`)); }
      if (d.type !== 'attempt.updated') continue;

      const a = this.att(d.attemptId);
      if (!before.has(a.id)) { before.set(a.id, { ...a.fields }); metaBefore.set(a.id, JSON.parse(JSON.stringify(a.meta))); }
      const creation = !a.created;
      a.created = true;
      const ch = changedThisStep.get(a.id) ?? new Set<string>();
      changedThisStep.set(a.id, ch);
      for (const [field, eAny] of Object.entries(d.fields ?? {})) {
        const e = eAny as Env;
        if (['attemptId', 'phaseId', 'bib'].includes(field)) continue;
        const prev = this.f(a, field);
        // ── P9 (D): no delta carries an equal envelope, or one differing only in observedAt
        if (!creation) {
          this.c(9);
          if (sameButObservedAt(prev, e)) this.v(9, s, `${field} re-sent ${canonical(prev) === canonical(e) ? 'unchanged' : 'differing only in observedAt'}`, a.id, field);
        }
        // ── P3: no spontaneous change
        if (!creation || e.state !== 'not-yet') {
          this.c(3);
          const ok = (el.class === 'scope-snapshot' && el.phaseId === a.phaseId)
            || (el.class === 'on-course-listing' && el.attemptId === a.id)
            || (el.class === 'event' && el.event === 'oncourse-left' && el.attemptId === a.id)
            || (el.class === 'event' && el.event === 'oncourse-empty' && oncourseBefore.includes(a.id))
            || (el.class === 'event' && el.event === 'rebaseline')
            || (el.class === 'observation' && el.scope === 'attempt' && el.attemptId === a.id);
          if (!ok && !(creation && el.class === 'scope-snapshot')) this.v(3, s, `${field} changed at a ${el.class}${el.event ? ' ' + el.event : ''}${el.phaseId ? ' of ' + el.phaseId : ''}`, a.id, field);
        }
        // ── P4: regression only at the allowed steps
        if (prev.state === 'known' && e.state !== 'known') {
          this.c(4);
          const r0 = before.get(a.id)!.run;
          const runInc = d.fields.run && d.fields.run.state === 'known' && r0?.state === 'known' && d.fields.run.value > r0.value;
          const contradicts = diagAfter.some((x) => x.kind === 'contradicted-finish' && x.attemptId === a.id) && !diagBefore.some((x) => x.kind === 'contradicted-finish' && x.attemptId === a.id);
          const ok = (el.class === 'scope-snapshot' && el.phaseId === a.phaseId) || (el.class === 'on-course-listing' && el.attemptId === a.id && (runInc || contradicts)) || el.event === 'rebaseline';
          if (!ok) this.v(4, s, `${field} regressed known→${e.state} at a ${el.class}${el.event ? ' ' + el.event : ''}`, a.id, field);
        }
        if (e.state === 'unavailable' && !REASONS.includes(e.reason ?? '')) this.v(4, s, `unavailable reason ${e.reason} not in the closed set`, a.id, field);
        // ── P6(d): sources per field
        if (e.state === 'known') {
          this.c(6);
          if ((field === 'courseOrder' || field === 'timeToBeat' || (field === 'outcome' && e.value?.kind === 'running')) && e.source !== 'tcp') this.v(6, s, `(d) ${field} presented from ${e.source}`, a.id, field);
        }
        a.fields[field] = e;
        if (canonical(prev) !== canonical(e)) ch.add(field);
        // kind of the presented value: set where value/source/eventTime changed; provisional-only changes keep it
        const valueChanged = !(prev.state === e.state && canonical(prev.value) === canonical(e.value) && prev.source === e.source && prev.eventTime === e.eventTime && prev.confidence === e.confidence);
        if (valueChanged) {
          // kind of the presented value: outcome by its content; other fields by the element that changed them
          const kind: FieldMeta['kind'] = e.state !== 'known' ? 'other'
            : field === 'outcome' ? ((e.value?.kind === 'running' || e.confidence === 'inferred') ? 'inference' : 'result-row')
            : ['placement', 'pairTotal', 'countingRun', 'underReview', 'qualified'].includes(field) ? 'result-row'
            : (el.class === 'on-course-listing' || (el.class === 'event' && el.event === 'oncourse-left')) ? 'inference'
            : el.class === 'scope-snapshot' ? 'result-row' : 'other';
          const m = a.meta[field] ?? { kind: 'other', step: 0, retractedSinceTable: false, tableSeen: false };
          if (kind === 'result-row') { m.tableSeen = true; m.retractedSinceTable = false; }
          if (e.state !== 'known' && m.tableSeen) m.retractedSinceTable = true;
          if (field === 'status' && e.state === 'known' && ['not-started'].includes(e.value) && m.tableSeen) m.retractedSinceTable = true;
          a.meta[field] = { ...m, kind, step: s };
        }
      }
      // ── P10: run generation
      const r = d.fields.run as Env | undefined;
      if (r && !creation) {
        const prevRun = before.get(a.id)!.run;
        if (prevRun?.state === 'known' && r.state === 'known' && r.value !== prevRun.value) {
          this.c(10);
          if (r.value < prevRun.value) this.v(10, s, `run decreased ${prevRun.value}→${r.value}`, a.id, 'run');
          else {
            increments++;
            if (!(el.class === 'on-course-listing' && el.attemptId === a.id && el.dtStart && el.dtStart !== a.genStart)) this.v(10, s, `run incremented at a ${el.class} (start ${el.dtStart} vs generation start ${a.genStart})`, a.id, 'run');
            for (const rf of RUN_SCOPED) {
              const x = d.fields[rf] as Env | undefined;
              if (rf === 'status') { if (!x || x.state !== 'known' || !['at-start', 'on-course'].includes(x.value)) this.v(10, s, `increment delta: status ${x ? canonical(x) : 'omitted'}`, a.id, rf); }
              else if (!x || x.state !== 'not-yet') this.v(10, s, `increment delta: ${rf} ${x ? x.state : 'omitted'}`, a.id, rf);
            }
            a.gen = r.value; a.genStart = r.eventTime ?? el.dtStart ?? null; a.contradicted = null; a.contradictedThisGen = false; a.leftThisGen = false;
            for (const k of Object.keys(a.meta)) if (RUN_SCOPED.includes(k)) delete a.meta[k];
          }
        }
      }
    }

    // a scope snapshot that restates a presented value unchanged makes it a results-table value (provenance only)
    if (el.class === 'scope-snapshot') {
      for (const row of el.rows ?? []) {
        const a = this.attempts.get(`${el.phaseId}:${row.bib}`);
        if (!a) continue;
        const stated: [string, unknown][] = [];
        if (row.gates) stated.push(['gates', row.gates]);
        if (row.placement) stated.push(['placement', row.placement]);
        for (const [field, val] of stated) {
          const e = a.fields[field];
          if (e?.state === 'known' && e.source === el.source && canonical(e.value) === canonical(val)) {
            const m = a.meta[field] ?? { kind: 'other', step: 0, retractedSinceTable: false, tableSeen: false };
            a.meta[field] = { ...m, kind: 'result-row', tableSeen: true, retractedSinceTable: false };
          }
        }
      }
    }
    // ── per-step element bookkeeping
    if (el.class === 'on-course-listing') { const a = this.att(el.attemptId); if (el.dtStart && !a.genStart) a.genStart = el.dtStart; }
    if (el.class === 'scope-snapshot' && el.source === 'xml') for (const row of el.rows ?? []) { const a = this.attempts.get(`${el.phaseId}:${row.bib}`); if (a && row.startTime && !a.genStart) a.genStart = row.startTime; }
    for (const d of rec.deltas) {
      if (d.type === 'oncourse.updated') this.oncourse = d.attemptIds;
      if (d.type === 'diagnostics.updated') this.diagnostics = d.diagnostics;
    }
    if (el.class === 'event' && (el.event === 'oncourse-left' || el.event === 'oncourse-empty')) {
      for (const id of el.event === 'oncourse-left' ? [el.attemptId] : oncourseBefore) { const a = this.attempts.get(id); if (a) a.leftThisGen = true; }
    }

    // ── per-attempt, per-step properties
    for (const [id, ch] of changedThisStep) {
      const a = this.attempts.get(id)!;
      const prev = before.get(id)!;
      const cross = CROSS_FMT.test(a.phaseId + '_');
      const listed = this.oncourse.includes(a.id);
      // P5: retraction scoped and guarded
      if (el.class === 'scope-snapshot' && el.phaseId === a.phaseId) {
        this.c(5);
        const row = rowsByBib.get(a.bib);
        const second = SECOND_FMT.test(a.phaseId + '_');
        const caseKind = !row || el.mode === 'start-list' ? (second ? 'absent2' : 'first') : row.timeEmpty ? 'timeEmpty' : 'first';
        const allowed = caseKind === 'absent2' ? ['outcome', 'gates', 'placement', 'underReview', 'qualified', 'pairTotal', 'countingRun']
          : caseKind === 'timeEmpty' ? ['outcome', 'gates'] : ['outcome', 'gates', 'placement', 'underReview', 'qualified'];
        for (const field of ch) {
          const p = prev[field] ?? { state: 'not-yet' }, n = a.fields[field]!;
          if (p.state === 'known' && n.state !== 'known') {
            if (!allowed.includes(field)) this.v(5, s, `${field} regressed in the ${caseKind} case (allowed: ${allowed.join(',')})`, id, field);
            if (p.source === 'tcp' && el.source === 'xml' && !this.guard(p)) this.v(5, s, `xml retraction of a tcp ${field} observed ${p.observedAt}, rewrite ${this.lastRewrite}`, id, field);
            if ((field === 'outcome' && p.value?.kind === 'running') || p.confidence === 'inferred') this.v(5, s, `retracted an on-course inference (${field})`, id, field);
          }
        }
        const sp = prev.status ?? { state: 'not-yet' }, sn = a.fields.status!;
        if (ch.has('status') && sp.state === 'known' && sn.state === 'known' && (NO_RESULT.includes(sp.value) || sp.value === 'finished') && !['finished', ...NO_RESULT, 'non-ranked'].includes(sn.value)) {
          const want = listed ? ['at-start', 'on-course'] : ['not-started'];
          if (!want.includes(sn.value)) this.v(5, s, `after retraction status ${sn.value}, expected ${want.join('|')} (listed=${listed})`, id, 'status');
        }
      }
      // P6(a): result-row → inference only through contradiction or retraction
      if (el.class === 'on-course-listing' || el.event === 'oncourse-left') {
        for (const field of ch) {
          const m = a.meta[field];
          if (!m || m.kind !== 'inference' || !['outcome', 'status', 'gates'].includes(field)) continue;
          this.c(6);
          const p = prev[field];
          const pm = p && p.state === 'known';
          if (pm && this.wasTable(metaBefore.get(id)?.[field], field, prev) && !a.contradictedThisGen && !diagAfter.some((x) => x.kind === 'contradicted-finish' && x.attemptId === id)) {
            if (field !== 'gates') this.v(6, s, `(a) ${field} went from a result-row value to an inference without contradiction or retraction`, id, field);
          }
        }
      }
      // P6(b): gates cell-wise while listed; after leaving, only at a results-table step
      if (ch.has('gates')) {
        const p = prev.gates, n = a.fields.gates!;
        if (p?.state === 'known' && n.state === 'known' && Array.isArray(p.value) && Array.isArray(n.value)) {
          this.c(6);
          const wasListed = oncourseBefore.includes(id);
          if (wasListed) {
            for (const g of p.value) { const ng = n.value.find((x: any) => x.number === g.number); if (g.penalty !== null && ng && ng.penalty === null) this.v(6, s, `(b) judged cell ${g.number} (${g.penalty}) became null while listed`, id, 'gates'); }
          } else if (a.leftThisGen && !(el.class === 'scope-snapshot' && el.phaseId === a.phaseId)) this.v(6, s, `(b) gates changed after leaving the list at a ${el.class}`, id, 'gates');
        }
      }
      // P6(c) + P8: tcp → xml flips
      for (const field of ch) {
        const p = prev[field], n = a.fields[field]!;
        if (p?.state === 'known' && n.state === 'known' && p.source === 'tcp' && n.source === 'xml') {
          this.c(6); this.c(8);
          const disc = this.lastDisconnectStep > (a.meta[field]?.step ?? 0) - 1 && this.lastDisconnectStep > 0;
          const markExc = field === 'status' && ['not-started', 'at-start', 'left-without-finish'].includes(p.value) && NO_RESULT.includes(n.value);
          if (!disc && !markExc && el.event !== 'rebaseline') this.v(6, s, `(c) ${field} flipped tcp→xml with TCP connected`, id, field);
          if (!this.guard(p)) this.v(8, s, `${field} flipped tcp(observed ${p.observedAt})→xml with content age ${this.lastRewrite ? new Date(Date.parse(this.lastRewrite) - this.pollMs).toISOString() : 'n/a'}`, id, field);
        }
      }
      // P7: contradiction
      const sp = prev.status, sn = a.fields.status!;
      const newDiag = diagAfter.find((x) => x.kind === 'contradicted-finish' && x.attemptId === id);
      if (sp?.state === 'known' && sp.value === 'finished' && sn.state === 'known' && sn.value === 'on-course' && this.f(a, 'run').value === (prev.run?.value ?? this.f(a, 'run').value)) {
        this.c(7);
        if (cross) this.v(7, s, 'Cross attempt went finished→on-course', id, 'status');
        if (!(el.class === 'on-course-listing' && el.attemptId === id && el.dtStart && el.dtStart === a.genStart && !el.dtFinish)) this.v(7, s, `finished→on-course at a ${el.class} (start ${el.dtStart}, gen start ${a.genStart}, finish ${el.dtFinish})`, id, 'status');
        if (!(a.fields.outcome?.state === 'known' && a.fields.outcome.value?.kind === 'running')) this.v(7, s, `outcome not running at the contradiction: ${canonical(a.fields.outcome)}`, id, 'outcome');
        for (const ff of ['placement', 'pairTotal', 'countingRun']) if (a.fields[ff]?.state === 'known') this.v(7, s, `${ff} still known at the contradiction`, id, ff);
        if (!newDiag) this.v(7, s, 'no contradicted-finish diagnostic in the contradiction step', id);
        a.contradicted = { finish: newDiag?.finishTime ?? null, runSeconds: prev.outcome?.value?.runSeconds ?? null };
        a.contradictedThisGen = true;
      }
      if (a.contradicted) {
        const o = a.fields.outcome!;
        if (o.state === 'known' && o.value?.kind === 'duration' && o.confidence === 'authoritative' && a.contradicted.finish && o.eventTime === a.contradicted.finish && newDiag) {
          this.v(7, s, `presented a results-table outcome with the contradicted finish ${a.contradicted.finish}`, id, 'outcome');
        }
      }
      // P11 is checked below for every Attempt touched or leaving the set
    }
    const leftNow = oncourseBefore.filter((x) => !this.oncourse.includes(x));
    for (const id of new Set([...changedThisStep.keys(), ...leftNow])) {
      const a = this.attempts.get(id);
      if (!a) continue;
      const prev = before.get(id) ?? a.fields;
      const ch = changedThisStep.get(id) ?? new Set<string>();
      const listed = this.oncourse.includes(id);
      for (const field of RUN_SCOPED) {
        const e = a.fields[field];
        if (!e || e.state !== 'known') continue;
        this.c(11);
        const kind = a.meta[field]?.kind;
        const inference = kind === 'inference' || (field === 'outcome' && e.value?.kind === 'running') || field === 'courseOrder' || field === 'timeToBeat';
        const g = a.fields.gates;
        const nullCell = g?.state === 'known' && Array.isArray(g.value) && g.value.some((x: any) => x.penalty === null);
        const want = inference || (nullCell && listed) || (e.source === 'operator-write');
        if (e.provisional !== want) this.v(11, s, `${field} provisional=${e.provisional}, property 11 says ${want} (kind=${kind}, nullCell=${nullCell}, listed=${listed})`, id, field);
        const p = prev[field];
        if (ch.has(field) && p?.state === 'known' && p.provisional === false && e.provisional === true) this.v(11, s, `${field} provisional false→true without a regression`, id, field);
      }
    }
    for (const [id] of changedThisStep) {
      const a = this.attempts.get(id)!;
      // P12 (D): a mark presents no-result with the same status
      const st = a.fields.status, oc = a.fields.outcome;
      if (st?.state === 'known' && NO_RESULT.includes(st.value)) {
        this.c(12);
        if (!(oc?.state === 'known' && oc.value?.kind === 'no-result' && oc.value.status === st.value)) this.v(12, s, `status ${st.value} with outcome ${canonical(oc)}`, id, 'outcome');
      }
    }
    // P7: the diagnostic disappears only at an allowed step
    for (const d of diagBefore.filter((x) => x.kind === 'contradicted-finish')) {
      if (diagAfter.some((x) => x.kind === 'contradicted-finish' && x.attemptId === d.attemptId)) continue;
      this.c(7);
      const a = this.att(d.attemptId);
      const ch = changedThisStep.get(a.id);
      const ok = (el.class === 'on-course-listing' && el.attemptId === a.id && el.dtFinish)
        || (ch && (ch.has('outcome') || ch.has('status')))
        || el.event === 'rebaseline';
      if (!ok) this.v(7, s, `contradicted-finish disappeared at a ${el.class}`, a.id);
      a.contradicted = null;
    }
    // P12 (D): duplicate finish
    const byPhase = new Map<string, Map<string, string[]>>();
    for (const id of changedThisStep.keys()) {
      const pid = this.attempts.get(id)!.phaseId;
      if (byPhase.has(pid)) continue;
      const m = new Map<string, string[]>();
      for (const a of this.attempts.values()) {
        if (a.phaseId !== pid) continue;
        const o = a.fields.outcome;
        if (o?.state === 'known' && o.value?.kind === 'duration' && o.eventTime) { if (!m.has(o.eventTime)) m.set(o.eventTime, []); m.get(o.eventTime)!.push(a.bib); }
      }
      byPhase.set(pid, m);
      for (const [t, bibs] of m) if (bibs.length > 1) {
        this.c(12);
        if (!diagAfter.some((x) => x.kind === 'duplicate-finish' && x.phaseId === pid && x.finishTime === t)) this.v(12, s, `two Attempts of ${pid} present finish ${t} (bibs ${bibs.join(',')}) without duplicate-finish`);
      }
    }
    // P5 completeness: every Attempt of R presenting results-table values whose row states no result is retracted
    if (el.class === 'scope-snapshot') {
      const second = SECOND_FMT.test(el.phaseId + '_');
      for (const a of this.attempts.values()) {
        if (a.phaseId !== el.phaseId) continue;
        const pOut = (before.get(a.id) ?? a.fields).outcome;
        const pm = (metaBefore.get(a.id) ?? a.meta).outcome;
        if (!pOut || pOut.state !== 'known') continue;
        if (!this.wasTable(pm, 'outcome', before.get(a.id) ?? a.fields)) continue;
        const row = rowsByBib.get(a.bib);
        if (el.source === 'xml' && !row) continue;
        const statesNoResult = !row || el.mode === 'start-list' || (!row.outcome && !row.status && (second ? row.timeEmpty : true));
        if (!statesNoResult) continue;
        this.c(5);
        if (pOut.source === 'tcp' && el.source === 'xml' && !this.guard(pOut)) continue;
        if (a.fields.outcome?.state === 'known') this.v(5, s, `completeness: row states no result but outcome stays ${canonical(a.fields.outcome).slice(0, 120)}`, a.id, 'outcome');
      }
    }
    // P10: no results-table observation whose finish precedes the generation's start is presented afterwards
    for (const id of changedThisStep.keys()) {
      const a = this.attempts.get(id)!;
      if (a.gen < 2 || !a.genStart) continue;
      const o = a.fields.outcome;
      if (o?.state === 'known' && o.confidence === 'authoritative' && o.eventTime && o.eventTime < a.genStart) { this.c(10); this.v(10, s, `presented a replaced run's outcome (finish ${o.eventTime} < start ${a.genStart})`, id, 'outcome'); }
    }
    // P14: the on-course set
    const oc = rec.deltas.filter((d) => d.type === 'oncourse.updated');
    for (const d of oc) {
      this.c(14);
      const added = d.attemptIds.filter((x: string) => !oncourseBefore.includes(x));
      const removed = oncourseBefore.filter((x) => !d.attemptIds.includes(x));
      for (const x of added) if (!(el.class === 'on-course-listing' && el.attemptId === x)) this.v(14, s, `${x} entered the set at a ${el.class}`, x);
      for (const x of removed) if (!(el.class === 'event' && ((el.event === 'oncourse-left' && el.attemptId === x) || el.event === 'oncourse-empty'))) this.v(14, s, `${x} left the set at a ${el.class}${el.event ? ' ' + el.event : ''}`, x);
      const ord = (id: string) => { const a = this.attempts.get(id); const c = a?.fields.courseOrder; return c?.state === 'known' ? c.value : Infinity; };
      const so = (id: string) => { const a = this.attempts.get(id); const c = a?.fields.startOrder; return c?.state === 'known' ? c.value : Infinity; };
      for (let i = 1; i < d.attemptIds.length; i++) {
        const x = d.attemptIds[i - 1], y = d.attemptIds[i];
        if (ord(x) > ord(y) || (ord(x) === Infinity && ord(y) === Infinity && so(x) > so(y))) this.v(14, s, `order: ${x} (${ord(x)}) before ${y} (${ord(y)})`, y);
      }
    }
    for (const id of this.oncourse) {
      const st = this.attempts.get(id)?.fields.status;
      if (oc.length || changedThisStep.get(id)?.has('status')) { this.c(14); if (st?.state === 'known' && ['not-started', 'left-without-finish'].includes(st.value)) this.v(14, s, `listed Attempt has status ${st.value}`, id, 'status'); }
    }
    // P15: standings
    const stDeltas = rec.deltas.filter((d) => d.type === 'standing.updated');
    for (const d of stDeltas) this.checkStanding(d.standing, s, changedThisStep, rec.deltas.some((x) => x.type === 'scope.replaced'));
    // P13: re-baseline (none expected in recorded windows)
    if (rec.deltas.some((d) => d.type === 'scope.replaced')) { this.c(13); if (el.event !== 'rebaseline' && el.class !== 'scope-snapshot') this.v(13, s, 'scope.replaced outside a re-baseline'); }
    void increments;
  }

  private guard(p: Env): boolean {
    return !!this.lastRewrite && !!p.observedAt && Date.parse(this.lastRewrite) - this.pollMs > Date.parse(p.observedAt);
  }

  private wasTable(m: FieldMeta | undefined, field: string, prev: Record<string, Env>): boolean {
    const p = prev[field];
    if (!p || p.state !== 'known') return false;
    if (field === 'outcome' && (p.value?.kind === 'running' || p.confidence === 'inferred')) return false;
    return m ? (m.kind === 'result-row' || (m.tableSeen && !m.retractedSinceTable && m.kind !== 'inference')) : false;
  }

  private checkStanding(st: any, s: number, changed: Map<string, Set<string>>, replaced: boolean) {
    this.c(15);
    const key = st.standingKey as string;
    const prevSt = this.standings.get(key);
    this.standings.set(key, st);
    const sc = st.scope;
    const phaseId = sc.kind === 'pair' ? sc.secondPhaseId : sc.phaseId;
    const attempt = (bib: string) => this.attempts.get(`${phaseId}:${bib}`);
    // a standing changes only at a step that changed one of its Attempts' placement/outcome/pairTotal/provisional/underReview
    const relevant = [...changed.entries()].some(([id, fs]) => id.startsWith(`${phaseId}:`) && ['placement', 'outcome', 'pairTotal', 'underReview'].some((f) => fs.has(f)));
    if (!relevant && !replaced) this.v(15, s, `${key} changed at a step that changed none of its Attempts' placement, outcome, pairTotal, provisional or underReview${prevSt ? '' : ' (first publication)'}`);
    const entries = st.entries as any[];
    if (st.ageCategoryId === null) {
      let lastOrder = -Infinity, unplaced = false, lastU: any = null;
      for (const e of entries) {
        const a = attempt(e.bib);
        if (e.order !== null) {
          if (unplaced) this.v(15, s, `${key}: placed entry ${e.bib} after unplaced ones`);
          const pl = a?.fields.placement;
          if (!(pl?.state === 'known' && pl.value.rank === e.rank && pl.value.order === e.order)) this.v(15, s, `${key}: entry ${e.bib} rank/order ${e.rank}/${e.order} vs placement ${canonical(pl)}`, a?.id, 'placement');
          if (e.order < lastOrder && sc.kind !== 'heat') this.v(15, s, `${key}: entries not sorted by order at ${e.bib}`);
          lastOrder = e.order;
        } else {
          unplaced = true;
          const sa = a?.fields.status?.value ?? null;
          if (lastU) {
            const ra = STATUS_ORDER.indexOf(lastU.status), rb = STATUS_ORDER.indexOf(sa);
            if (ra > rb || (ra === rb && compareBib(lastU.bib, e.bib) > 0)) this.v(15, s, `${key}: unplaced order ${lastU.bib} before ${e.bib}`);
          }
          lastU = { bib: e.bib, status: sa };
        }
        if (a) {
          const prov = ['outcome', 'placement', 'pairTotal'].some((f) => a.fields[f]?.state === 'known' && a.fields[f]!.provisional === true);
          const ur = a.fields.underReview?.state === 'known' && a.fields.underReview.value === true;
          if (e.provisional !== prov) this.v(15, s, `${key}: entry ${e.bib} provisional ${e.provisional} vs Attempt ${prov}`, a.id);
          if (e.underReview !== ur) this.v(15, s, `${key}: entry ${e.bib} underReview ${e.underReview} vs Attempt ${ur}`, a.id);
        }
      }
    } else {
      const classRank = (e: any) => attempt(e.bib)?.fields.placement?.value?.rank ?? null;
      for (const e of entries) {
        const r = classRank(e);
        const want = r === null ? null : 1 + entries.filter((x) => { const xr = classRank(x); return xr !== null && xr < r; }).length;
        if (e.rank !== want) this.v(15, s, `${key}: category rank of ${e.bib} is ${e.rank}, property 15 says ${want}`);
      }
    }
  }

  summary() {
    const props = Array.from({ length: 15 }, (_, i) => i + 1).map((p) => ({ property: p, checked: this.checked[p] ?? 0, violations: this.counts[p] ?? 0 }));
    return { properties: props, rebaselineSteps: this.rebaselineSteps, sample: this.violations };
  }
}

function isEnv(e: unknown): boolean {
  return !!e && typeof e === 'object' && !Array.isArray(e) && ['known', 'not-yet', 'unavailable'].includes((e as any).state);
}

function checkEnv(e: Env, bad: (m: string) => void) {
  const keys = Object.keys(e);
  if (e.state === 'known') {
    for (const k of ['value', 'observedAt', 'source', 'confidence', 'provisional']) if (!(k in e) || (e as any)[k] === null && k !== 'value') bad(`known envelope without ${k}`);
    for (const k of keys) if (!['state', 'value', 'observedAt', 'eventTime', 'source', 'confidence', 'provisional'].includes(k)) bad(`unexpected key ${k}`);
    if ('eventTime' in e && (e.eventTime === null || !TS.test(e.eventTime!))) bad(`eventTime ${e.eventTime}`);
    if (!TS.test(e.observedAt ?? '')) bad(`observedAt ${e.observedAt}`);
    if (!SOURCES_ONSITE.includes(e.source ?? '')) bad(`source ${e.source} on site`);
    if (!['authoritative', 'inferred'].includes(e.confidence ?? '')) bad(`confidence ${e.confidence}`);
    if (typeof e.provisional !== 'boolean') bad('provisional not boolean');
  } else if (e.state === 'not-yet') {
    if (keys.length !== 1) bad(`not-yet carries ${keys.join(',')}`);
  } else if (e.state === 'unavailable') {
    if (keys.length !== 2 || !REASONS.includes(e.reason ?? '')) bad(`unavailable ${canonical(e)}`);
  }
}

function sameButObservedAt(a: Env, b: Env): boolean {
  if (a.state !== b.state) return false;
  const { observedAt: _x, ...p } = a as any; const { observedAt: _y, ...q } = b as any;
  return canonical(p) === canonical(q);
}

function collectTimes(d: any): string[] {
  const out: string[] = [];
  const walk = (x: any, key: string) => {
    if (typeof x === 'string') { if (key === 'observedAt' || key === 'asOf' || key === 'lastRewriteDetectedAt') out.push(x); return; }
    if (Array.isArray(x)) { for (const y of x) walk(y, key); return; }
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, k);
  };
  walk(d, '');
  return out;
}
