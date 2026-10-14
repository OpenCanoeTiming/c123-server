// Spike S1 merge core: CONTRACTS §4 (INV-1…INV-7, retraction, contradiction, run generation) and
// the §7.2 delta stream it produces. Pure function of the ingested element sequence: no clock is read.
import {
  ATTEMPT_FIELDS, NO_RESULT_MARKS, NOT_YET, RESULT_VALUE_FIELDS, RUN_SCOPED,
  type Delta, type Diagnostic, type Element, type Envelope, type FieldStatement, type Gate, type Kind,
  type Known, type SnapshotRow, type Source, type UnavailableReason,
} from './types.js';
import { formatFromRaceId, formatInfo, siblingRaceIdByToken, type FormatInfo } from './format.js';
import { assembleStanding, standingKey, type StandingInput, type StandingScope } from './standing.js';
import { createHash } from 'node:crypto';
import { canonical, compareBib, eventTimeOf, localDate, r3 } from './util.js';

export type DomainConfig = {
  zone: string | null;            // venue zone offset (DERIVATIONS §0.2), e.g. "+02:00"
  pollIntervalMs: number;         // XML file-watch interval: INV-7's write-time guard
  eventId: string;                // asserted by the bridge (CONTRACTS §2.2)
  tier: 'onsite' | 'live';
  xmlState?: 'not-configured' | 'connected' | 'unreachable';
  tcpConnected?: boolean;         // vectors: context.tcpConnectedThroughout
};

type SlotName = 'inf' | 'tcp' | 'xml' | 'op' | 'bridge' | 'det';
type Obs = {
  seq: number; observedAt: string; source: Source | null; kind: Kind;
  state: 'known' | 'not-yet' | 'unavailable'; reason?: UnavailableReason; value?: unknown;
  absent?: boolean;                      // INV-7 statement "this row states no result"
  eventTime?: string | null; confidence: 'authoritative' | 'inferred';
  judgingComplete?: boolean | null; runClosed?: boolean; provisionalOverride?: boolean;
  finishTime?: string | null; runSeconds?: number | null; rowStatus?: string | null;
  detectedAt?: string | null; gen: number;
  supersededAt?: number; displaced?: boolean; writeId?: string; field?: string;
};
type Slot = Partial<Record<SlotName, Obs>> & { lastValueSeq: number };

type AttemptS = {
  id: string; phaseId: string; bib: string;
  gen: number; genStart: string | null; markAtGen: string | null;
  listed: boolean; leftThisGen: boolean; completedThisGen: boolean; finishSeenThisGen: boolean; startSeenThisGen: boolean;
  tcpAttributed: boolean;   // D1: a TCP row of this generation matched its on-course finish
  listing: { status: string | null; dtStart: string | null; dtFinish: string | null; observedAt: string; seq: number } | null;
  lastOnCourseFinish: { eventTime: string | null; runSeconds: number | null } | null;
  slots: Record<string, Slot>; presented: Record<string, Envelope>; from: Record<string, Obs | null>;
  contradiction: { finishTime: string | null; runSeconds: number | null; seq?: number } | null;
  dead: { finishTime: string | null; runSeconds: number | null }[];
  oldRunSeconds: number[];
  cells: Map<number, { penalty: number | null; kind: Kind }>; cellsFrom: Obs | null;
  staleMark: string | null;
  unparseable: Partial<Record<Source, { slot: number; text: string }[]>>;
  upstreamCatRank: number | null;
  xmlUntimed: boolean | null;
  emitted: boolean; lastEmitted: Record<string, string>; deleted: boolean;
  forceEmit: Set<string>;
  standingSig: string | null;
};

type EntityS = {
  id: string; kind: 'phase' | 'entry' | 'class' | 'course';
  plain: Record<string, unknown>; slots: Record<string, Slot>; presented: Record<string, Envelope>;
  emitted: boolean; lastEmitted: Record<string, string>; whole?: boolean;
};

export type WriteReq = {
  writeId: string; target: { attemptId: string; run: number; field: string }; requestedValue: unknown;
  submittedAt: string; status: 'pending' | 'confirmed' | 'mismatched' | 'superseded';
  confirmedValue?: unknown; confirmedAt?: string;
};

const IDENTITY_FIELDS = ['entry', 'run', 'startOrder', 'scheduledStart', 'heat', 'startLane'];
const NON_PROVISIONAL = new Set(['status', ...IDENTITY_FIELDS]);
const RETRACT_FIRST = ['status', 'outcome', 'gates', 'placement', 'underReview', 'qualified'];
const RETRACT_SECOND_ABSENT = [...RETRACT_FIRST, 'pairTotal', 'countingRun'];
const RETRACT_TIME_EMPTY = ['status', 'outcome', 'gates'];
const ROW_FIELDS = [...RETRACT_SECOND_ABSENT.filter((f) => f !== 'gates'), 'faults'];   // gates fold cell-wise

export class Domain {
  cfg: DomainConfig;
  seq = 0;
  tcpConnected: boolean;
  lastDisconnectSeq = 0;
  lastRewriteDetectedAt: string | null = null;
  xmlState: 'not-configured' | 'connected' | 'unreachable';
  upstreamInstance: string | null = null;
  clockOffset: number | null = null;
  event: Record<string, unknown> | null = null;
  eventEmitted = false;
  entities = new Map<string, EntityS>();          // `${kind}:${id}`
  attempts = new Map<string, AttemptS>();
  phaseAttempts = new Map<string, Set<string>>();
  writes: WriteReq[] = [];
  diagnostics = new Map<string, Diagnostic>();
  standingsEmitted = new Map<string, string>();
  standings = new Map<string, Record<string, unknown>>();
  classification = new Map<string, { rows: any[]; asOf: string }>();
  oncourseEmitted: string | null = null;
  oncourse: { attemptIds: string[]; featuredByUpstream: string | null; asOf: string | null } = { attemptIds: [], featuredByUpstream: null, asOf: null };
  liveOncourse: { attemptIds: string[]; featuredByUpstream: string | null } | null = null;
  tvs: { odd: string | null; even: string | null } = { odd: null, even: null };
  lastListingAt: string | null = null;
  rebaseline: { scope: { kind: 'phase'; phaseId: string } | { kind: 'event' }; seq: number; observedAt: string } | null = null;
  rebaselineAttempts = new Set<string>();
  sourcesEmitted: string | null = null;
  diagnosticsEmitted = '[]';
  currentCourse: { layout: string; captions: string[]; nrSplits: number; fabricated: boolean } | null = null;
  runningPhases: string[] = [];
  onCourseStreamSeen = false;      // once the on-course stream is ingested, "upstream lists it" is known for every Attempt
  stats = { elements: 0, deltas: 0, retractions: 0, contradictions: 0, generations: 0, inv2cRefusals: 0, staleMarks: 0 };
  // step-local
  private step: { seq: number; observedAt: string; deltas: Delta[]; touchedPhases: Set<string>; oncourseDirty: boolean; inv2c: any[] } | null = null;
  private dirty = new Set<string>();
  private stepTouched = new Set<string>();
  private standingDirty = new Set<string>();
  private listedIds = new Set<string>();
  private hashAcc = Buffer.alloc(32);
  private entityHash = new Map<string, Buffer>();
  private deletedEmitted = new Set<string>();

  constructor(cfg: DomainConfig) {
    this.cfg = cfg;
    this.tcpConnected = cfg.tcpConnected ?? false;
    this.xmlState = cfg.xmlState ?? 'not-configured';
  }

  // ───────────────────────────── element entry point ─────────────────────────────

  apply(el: Element): { ingestSeq: number; deltas: Delta[]; notes: any[] } {
    const seq = ++this.seq;
    this.stats.elements++;
    this.step = { seq, observedAt: el.observedAt, deltas: [], touchedPhases: new Set(), oncourseDirty: false, inv2c: [] };
    this.stepTouched.clear();
    switch (el.type) {
      case 'event': this.applyEvent(el, seq); break;
      case 'observation': this.applyObservation(el, seq); break;
      case 'snapshot': this.applySnapshot(el, seq); break;
      case 'listing': this.applyListing(el, seq); break;
      case 'structure': this.applyStructure(el, seq); break;
    }
    this.flush();
    const out = { ingestSeq: seq, deltas: this.step.deltas, notes: this.step.inv2c };
    this.stats.deltas += out.deltas.length;
    this.step = null;
    return out;
  }

  // ───────────────────────────── events ─────────────────────────────

  private applyEvent(el: Extract<Element, { type: 'event' }>, seq: number) {
    switch (el.event) {
      case 'tcp-connected': this.tcpConnected = true; break;
      case 'tcp-disconnected': this.tcpConnected = false; this.lastDisconnectSeq = seq; break;
      case 'xml-rewrite-detected': this.lastRewriteDetectedAt = el.observedAt; this.xmlState = 'connected'; break;
      case 'oncourse-left': if (el.attemptId) this.leave(this.attempts.get(el.attemptId), seq, el.observedAt); break;
      case 'oncourse-empty':
        for (const id of [...this.listedIds].sort()) this.leave(this.attempts.get(id), seq, el.observedAt);
        this.lastListingAt = el.observedAt;
        this.step!.oncourseDirty = true;
        break;
      case 'rebaseline': this.startRebaseline(el, seq); break;
      case 'delete': this.deleteAttempt(el.attemptId!); break;
    }
  }

  private leave(a: AttemptS | undefined, seq: number, observedAt: string) {
    if (!a || !a.listed) return;
    this.touch(a.id);
    a.listed = false;
    this.listedIds.delete(a.id);
    a.leftThisGen = true;
    this.step!.oncourseDirty = true;
    this.lastListingAt = observedAt;
    const ph = this.phaseInfo(a.phaseId);
    // DERIVATIONS §4.1 (round 9): left with a dtStart observed and no dtFinish → left-without-finish (slalom only);
    // unstaged before any start → not-started.
    if (!ph.cross && !a.finishSeenThisGen) {
      this.put(a, 'status', { seq, observedAt, source: 'tcp', kind: 'inference', state: 'known',
        value: a.startSeenThisGen ? 'left-without-finish' : 'not-started', confidence: 'authoritative', gen: a.gen }, 'inf');
    }
    this.recompute(a, ['status', ...RESULT_VALUE_FIELDS]);
  }

  // ───────────────────────────── attempts ─────────────────────────────

  private touch(id: string) { this.dirty.add(`attempt:${id}`); this.stepTouched.add(id); }

  private getAttempt(id: string, observedAt: string, source: Source | null): AttemptS {
    this.touch(id);
    let a = this.attempts.get(id);
    if (a && !a.deleted) return a;
    const i = id.lastIndexOf(':');
    const phaseId = id.slice(0, i), bib = id.slice(i + 1);
    a = {
      id, phaseId, bib, gen: 1, genStart: null, markAtGen: null,
      listed: false, leftThisGen: false, completedThisGen: false, finishSeenThisGen: false, startSeenThisGen: false, tcpAttributed: false, listing: null,
      lastOnCourseFinish: null, slots: {}, presented: {}, from: {}, contradiction: null, dead: [], oldRunSeconds: [],
      cells: new Map(), cellsFrom: null, staleMark: null, unparseable: {}, upstreamCatRank: null, xmlUntimed: null,
      emitted: false, lastEmitted: {}, deleted: false, forceEmit: new Set(), standingSig: null,
    };
    for (const f of ATTEMPT_FIELDS) a.presented[f] = NOT_YET;
    // Every Attempt starts in generation 1 (ADR-013): structural, asserted at creation.
    a.presented.run = { state: 'known', value: 1, observedAt, source: (source ?? 'tcp') as Source, confidence: 'authoritative', provisional: false };
    this.attempts.set(id, a);
    if (!this.phaseAttempts.has(phaseId)) this.phaseAttempts.set(phaseId, new Set());
    this.phaseAttempts.get(phaseId)!.add(id);
    this.ensurePhase(phaseId, observedAt);
    this.step?.touchedPhases.add(phaseId);
    return a;
  }

  private slot(a: { slots: Record<string, Slot> }, f: string): Slot {
    return (a.slots[f] ??= { lastValueSeq: 0 });
  }

  private put(a: AttemptS, f: string, o: Obs, name: SlotName) {
    o.field = f;
    const s = this.slot(a, f);
    // Rule 4: a no-echo assertion is displaced by a results-table observation that CHANGES its source's value.
    if ((name === 'tcp' || name === 'xml') && s.op && !s.op.absent && o.seq > s.op.seq) {
      if (s.op.provisionalOverride === false) {
        const prev = s[name];
        if (!o.absent && o.state === 'known' && !(prev && !prev.absent && canonical(prev.value) === canonical(o.value))) s.op.displaced = true;
      } else if (s.op.supersededAt === undefined && !o.absent && o.state === 'known') {
        s.op.supersededAt = o.seq;   // the very next results-table observation supersedes the optimistic write
        this.echo(a, f, o);
      }
    }
    s[name] = o;
    // Only a presentable results-table value supersedes an inference (a suppressed stale row does not).
    if ((name === 'tcp' || name === 'xml') && !o.absent && o.state === 'known' && !this.unusable(a, o)) s.lastValueSeq = o.seq;
    this.step?.touchedPhases.add(a.phaseId);
  }

  /** CONTRACTS §2.9 / DERIVATIONS §6: echo matching of a pending write. */
  private echo(a: AttemptS, f: string, o: Obs) {
    for (const w of this.writes) {
      if (w.status !== 'pending' || w.target.attemptId !== a.id || w.target.field !== f || w.target.run !== a.gen) continue;
      const req = w.requestedValue as any;
      let equal: boolean;
      if (f === 'gates' && Array.isArray(req) && Array.isArray(o.value)) {
        const got = o.value as Gate[];
        equal = req.every((g: Gate) => got.some((x) => x.number === g.number && x.penalty === g.penalty));
      } else equal = canonical(req) === canonical(o.value);
      w.status = equal ? 'confirmed' : 'mismatched';
      w.confirmedValue = o.value;
      w.confirmedAt = o.observedAt;
      this.emitWrite(w);
    }
  }

  private emitWrite(w: WriteReq) {
    this.pushDelta({ type: 'write.updated', write: { ...w } });
  }

  // ───────────────────────────── observations ─────────────────────────────

  private applyObservation(el: Extract<Element, { type: 'observation' }>, seq: number) {
    if (el.scope !== 'attempt') return this.applyEntityObservation(el as any, seq);
    const a = this.getAttempt(el.attemptId, el.observedAt, el.source);
    const name = slotOf(el.source, el.kind);
    const fields: string[] = [];
    for (const st of el.fields) {
      if (st.field === 'run') { this.applyRunObservation(a, st, el, seq); continue; }
      if (name === 'inf' && el.kind === 'inference') { a.listed = true; this.listedIds.add(a.id); }   // the on-course stream lists it
      // an on-course status of on-course or finished means the stream showed a start (vectors carry no listing)
      if (el.kind === 'inference' && st.field === 'status' && ['on-course', 'finished'].includes(st.value as string)) a.startSeenThisGen = true;
      const o = this.toObs(st, el.source, el.kind, el.observedAt, seq, a.gen, el.finishTime, el.runSeconds);
      if (el.kind === 'operator') {
        o.writeId = `w-${seq}`;
        if (st.provisionalOverride !== false) {
          this.writes.push({ writeId: o.writeId, target: { attemptId: a.id, run: a.gen, field: st.field }, requestedValue: st.value,
            submittedAt: el.observedAt, status: 'pending' });
          this.emitWrite(this.writes[this.writes.length - 1]!);
        }
      }
      if (el.source === 'xml') o.detectedAt = this.lastRewriteDetectedAt ?? el.observedAt;
      if (el.kind === 'inference' && st.field === 'outcome' && st.eventTime && (st.value as any)?.kind === 'duration') {
        a.finishSeenThisGen = true;
        a.lastOnCourseFinish = { eventTime: st.eventTime, runSeconds: (st.value as any).runSeconds ?? null };
        this.attributeRetained(a, (f) => fields.push(f));
      }
      if (el.rowStatus !== undefined) o.rowStatus = el.rowStatus;
      this.put(a, st.field, o, st.state && st.state !== 'known' && !el.source ? 'det' : name);
      fields.push(st.field);
      if (st.field === 'gates') {
        if (el.kind === 'inference') this.foldCells(a, o, true);
        else if (this.rule2(a, 'gates', this.slot(a, 'gates')) === o) this.foldCells(a, o, false);
      }
      if (el.kind !== 'inference' && el.source !== 'operator-write') this.expandOrdinal(a, st, o, fields, name);
    }
    this.recompute(a, fields);
    this.unavailableRunOne(a);
  }

  /** Cross: the ordinal outcome and the finish come from placement (DERIVATIONS §4.2, §4.7). */
  private expandOrdinal(a: AttemptS, st: FieldStatement, o: Obs, fields: string[], name: SlotName) {
    if (st.field !== 'placement' || this.phaseInfo(a.phaseId).scoringKind !== 'ordinal' || o.state !== 'known' || o.absent) return;
    const p = o.value as { order: number };
    this.put(a, 'outcome', { ...o, value: { kind: 'ordinal', order: p.order } }, name);
    this.put(a, 'status', { ...o, value: 'finished', eventTime: null }, name);
    fields.push('outcome', 'status');
  }

  private applyRunObservation(a: AttemptS, st: FieldStatement, el: { observedAt: string; source: Source }, seq: number) {
    const v = st.value as number;
    if (typeof v === 'number' && v > a.gen) this.newGeneration(a, seq, el.observedAt, st.eventTime ?? null, el.source, v);
  }

  private toObs(st: FieldStatement, source: Source, kind: Kind, observedAt: string, seq: number, gen: number,
                finishTime?: string | null, runSeconds?: number | null): Obs {
    const o: Obs = {
      seq, observedAt, source: st.state && st.state !== 'known' && !source ? null : source, kind,
      state: st.absent ? 'not-yet' : (st.state ?? 'known'), confidence: st.confidence ?? (kind === 'inference' ? 'inferred' : 'authoritative'),
      gen,
    };
    if (st.absent) o.absent = true;
    if (st.reason) o.reason = st.reason;
    if ('value' in st) o.value = st.value;
    if (st.eventTime) o.eventTime = st.eventTime;
    if (st.judgingComplete !== undefined) o.judgingComplete = st.judgingComplete;
    if (st.runClosed) o.runClosed = true;
    if (st.provisionalOverride !== undefined) o.provisionalOverride = st.provisionalOverride;
    if (finishTime !== undefined) o.finishTime = finishTime;
    if (runSeconds !== undefined) o.runSeconds = runSeconds;
    return o;
  }

  // ───────────────────────────── run generation (ADR-013, DERIVATIONS §4.11) ─────────────────────────────

  private newGeneration(a: AttemptS, seq: number, observedAt: string, start: string | null, source: Source, to?: number) {
    this.stats.generations++;
    const st = a.presented.status;
    a.markAtGen = st.state === 'known' && NO_RESULT_MARKS.includes(st.value as string) ? (st.value as string) : null;
    const prevOutcome = a.presented.outcome;
    if (prevOutcome.state === 'known' && typeof (prevOutcome.value as any).runSeconds === 'number') a.oldRunSeconds.push((prevOutcome.value as any).runSeconds);
    a.gen = to ?? a.gen + 1;
    a.genStart = start;
    a.leftThisGen = false; a.completedThisGen = false; a.finishSeenThisGen = false; a.startSeenThisGen = false; a.tcpAttributed = false; a.lastOnCourseFinish = null;
    a.contradiction = null; a.dead = []; a.cells = new Map(); a.cellsFrom = null; a.staleMark = null;
    for (const f of RUN_SCOPED) { a.slots[f] = { lastValueSeq: 0 }; this.setPresented(a, f, NOT_YET, null); a.forceEmit.add(f); }
    a.forceEmit.add('run');
    this.diagnostics.delete(`contradicted-finish|${a.id}`);
    this.diagnostics.delete(`stale-mark|${a.id}`);
    for (const k of [...this.diagnostics.keys()]) if (k.startsWith(`source-disagreement|${a.id}|`)) this.diagnostics.delete(k);
    a.presented.run = { state: 'known', value: a.gen, observedAt, ...(start ? { eventTime: start } : {}), source, confidence: 'authoritative', provisional: false };
    for (const w of this.writes) if (w.status === 'pending' && w.target.attemptId === a.id && w.target.run < a.gen) { w.status = 'superseded'; this.emitWrite(w); }
  }

  // ───────────────────────────── on-course listing ─────────────────────────────

  private applyListing(el: Extract<Element, { type: 'listing' }>, seq: number) {
    const a = this.getAttempt(el.attemptId, el.observedAt, 'tcp');
    const ph = this.phaseInfo(a.phaseId);
    const startEt = el.dtStart;    // eventTime (DERIVATIONS §0.2), built by the derivation
    const finishEt = el.dtFinish;
    const fields = new Set<string>(RESULT_VALUE_FIELDS);
    // Generation trigger: a non-empty dtStart different from the current generation's recorded start.
    let incremented = false;
    if (startEt && a.genStart && startEt !== a.genStart && !ph.cross) {
      this.newGeneration(a, seq, el.observedAt, startEt, 'tcp');
      incremented = true;
    } else if (startEt && !a.genStart) a.genStart = startEt;
    if (startEt) a.startSeenThisGen = true;
    a.listed = true;
    this.listedIds.add(a.id);
    this.onCourseStreamSeen = true;
    this.lastListingAt = el.observedAt;
    this.step!.oncourseDirty = true;
    if (el.completed) a.completedThisGen = true;
    if (finishEt) {
      a.finishSeenThisGen = true;
      a.lastOnCourseFinish = { eventTime: finishEt, runSeconds: el.finishRunSeconds ?? null };
      this.attributeRetained(a, (f) => fields.add(f));
    }
    // INV-2d: listed with the generation's start and no finish after a results-table finish was presented.
    if (!ph.cross && !incremented && startEt && !finishEt && startEt === a.genStart && !a.contradiction) {
      const fin = this.presentedResultFinish(a);
      if (fin) {
        a.contradiction = { ...fin, seq };
        this.stats.contradictions++;
        this.diagnostics.set(`contradicted-finish|${a.id}`, { kind: 'contradicted-finish', attemptId: a.id, finishTime: fin.finishTime, runSeconds: fin.runSeconds } as Diagnostic);
        for (const f of ['status', 'outcome', 'placement', 'pairTotal', 'countingRun']) fields.add(f);
      }
    } else if (a.contradiction && finishEt) {
      this.liftContradiction(a, seq);
      for (const f of ['status', 'outcome', 'placement', 'pairTotal', 'countingRun']) fields.add(f);
    }
    a.listing = { status: null, dtStart: el.dtStart, dtFinish: el.dtFinish, observedAt: el.observedAt, seq };
    for (const st of el.fields) {
      if (st.field === 'outcome' && st.value && (st.value as any).kind === 'duration') {
        // DERIVATIONS §4.3: stop recomputing the inference at a results-table observation, Completed, or leaving.
        const s = this.slot(a, 'outcome');
        if (s.lastValueSeq > 0 && s.inf && s.inf.seq < s.lastValueSeq) continue;
        if (a.completedThisGen && s.inf && (s.inf.value as any)?.kind === 'duration' && !el.completed) continue;
      }
      const o = this.toObs(st, 'tcp', 'inference', el.observedAt, seq, a.gen);
      if (st.field === 'status') { a.listing.status = st.value as string; if (finishEt) o.eventTime = finishEt; }
      if (st.field === 'outcome' && finishEt && (st.value as any)?.kind === 'duration') o.eventTime = finishEt;
      if (st.field === 'gates') this.foldCells(a, o, true);
      // Identity fields are not results: the on-course stream's statement competes under rule 2 as a tcp observation.
      this.put(a, st.field, o, IDENTITY_FIELDS.includes(st.field) ? 'tcp' : 'inf');
      fields.add(st.field);
    }
    if (incremented) {
      // Property 10: the increment's own delta carries run, status and every other run-scoped field as not-yet.
      this.recompute(a, ['status']);
      this.emitAttempt(a);
    }
    this.recompute(a, [...fields]);
  }

  private presentedResultFinish(a: AttemptS): { finishTime: string | null; runSeconds: number | null } | null {
    for (const f of ['outcome', 'status']) {
      const from = a.from[f];
      const env = a.presented[f];
      if (!from || from.absent || (from.source !== 'tcp' && from.source !== 'xml') || from.kind === 'inference') continue;
      if (env.state !== 'known') continue;
      if (f === 'status' && env.value !== 'finished') continue;
      if (f === 'outcome' && (env.value as any).kind !== 'duration') continue;
      const rs = from.runSeconds ?? (a.presented.outcome.state === 'known' ? ((a.presented.outcome as Known).value as any).runSeconds ?? null : null);
      return { finishTime: from.finishTime ?? null, runSeconds: rs };
    }
    return null;
  }

  private liftContradiction(a: AttemptS, seq: number) {
    if (!a.contradiction) return;
    a.dead.push({ finishTime: a.contradiction.finishTime, runSeconds: a.contradiction.runSeconds });
    void seq;
    a.contradiction = null;
    this.diagnostics.delete(`contradicted-finish|${a.id}`);
  }

  /**
   * ADR-017 D1 (trailing round): a TCP row of this generation that arrived before its on-course finish is retained,
   * and attributed when the finish arrives with the same Time (recorded: the result push 108 ms before the finish).
   */
  private attributeRetained(a: AttemptS, add: (f: string) => void) {
    const fin = a.lastOnCourseFinish;
    if (!fin || fin.runSeconds == null) return;
    let hit = false;
    for (const f of ROW_FIELDS) {
      const s = a.slots[f];
      const o = s?.tcp;
      if (!s || !o || o.absent || o.gen !== a.gen || o.kind !== 'result-row' || o.finishTime != null || o.runSeconds !== fin.runSeconds) continue;
      const n: Obs = { ...o, finishTime: fin.eventTime };
      // INV-5: an identical redelivery since the presented row does not move its observedAt
      const p = a.presented[f];
      if (p?.state === 'known' && a.from[f]?.source === 'tcp' && a.from[f]?.kind === 'result-row' && canonical(p.value) === canonical(o.value)) n.observedAt = p.observedAt;
      // as at a row's arrival: status and outcome carry the finish as eventTime
      if (f === 'status' && ['finished', 'non-ranked'].includes(o.value as string) && fin.eventTime) n.eventTime = fin.eventTime;
      if (f === 'outcome' && o.state === 'known' && (o.value as any)?.kind !== 'no-result' && fin.eventTime) n.eventTime = fin.eventTime;
      s.tcp = n;
      if (n.state === 'known' && n.seq > s.lastValueSeq) s.lastValueSeq = n.seq;
      add(f);
      hit = true;
    }
    if (hit && a.gen > 1) {
      a.tcpAttributed = true;
      // the retained row's gate vector, held back until now, folds as it would have at arrival
      const s = a.slots.gates;
      const g = s?.tcp;
      if (s && g && !g.absent && g.state === 'known' && g.gen === a.gen && g.runSeconds === fin.runSeconds) {
        if (g.seq > s.lastValueSeq) s.lastValueSeq = g.seq;
        if (this.rule2(a, 'gates', s) === g && !this.refusedMarkRow(a, g)) this.foldCells(a, g, false);
        add('gates');
      }
    }
  }

  /** INV-2d / ADR-017 D1: same finish by dtFinish where both carry one, else by run time. */
  private sameFinish(o: { finishTime?: string | null; runSeconds?: number | null }, fin: { finishTime: string | null; runSeconds: number | null }): boolean {
    if (o.finishTime != null && fin.finishTime != null) return o.finishTime === fin.finishTime;
    return o.runSeconds != null && fin.runSeconds != null && o.runSeconds === fin.runSeconds;
  }

  /** Whether a results-table observation describes the contradicted finish, a lifted one, or the replaced run. */
  private unusable(a: AttemptS, o: Obs): boolean {
    if (o.absent || o.kind === 'inference' || o.kind === 'operator') return false;
    if (a.contradiction && this.sameFinish(o, a.contradiction)) return true;
    // ADR-017 D1: rows carrying a contradicted finish stay unpresented, also after the lift
    for (const d of a.dead) if (this.sameFinish(o, d)) return true;
    // INV-2d: placement, pairTotal and countingRun are not-yet while contradicted, unless a later observation states them
    if (a.contradiction && a.contradiction.seq !== undefined && o.seq < a.contradiction.seq && o.field && ['placement', 'pairTotal', 'countingRun'].includes(o.field)) return true;
    if (a.gen > 1) {
      // DERIVATIONS §4.11 (D1): an XML row by dtFinish; a TCP row, which carries no finish time, is this generation's
      // only once its finish was seen on the on-course stream and the row's Time equals it; until then it is the
      // replaced run's. After that, upstream's one row per bib is the new run's.
      if (o.finishTime) return a.genStart ? o.finishTime < a.genStart : false;
      if (o.source === 'tcp' && o.runSeconds != null && !a.tcpAttributed) {
        return !(a.lastOnCourseFinish && a.lastOnCourseFinish.runSeconds === o.runSeconds);
      }
    }
    return false;
  }

  // ───────────────────────────── scope snapshots (INV-7) ─────────────────────────────

  private applySnapshot(el: Extract<Element, { type: 'snapshot' }>, seq: number) {
    const info = this.phaseInfo(el.phaseId);
    const phase = this.ensurePhase(el.phaseId, el.observedAt);
    if (el.classId) {
      // DERIVATIONS §1: classId is Results@ClassId verbatim, never the RaceId prefix; MainTitle is the TCP fallback name.
      if (!phase.plain.classId) { phase.plain.classId = el.classId; this.linkPair(phase); }
      const c = this.entity('class', el.classId);
      Object.assign(c.plain, { classId: el.classId, eventId: this.cfg.eventId, code: el.classId });
      if (el.mainTitle) this.setEntityField(c, 'name', el.mainTitle, el.source, el.observedAt);
      this.emitEntity(c);
      this.emitEntity(phase);
    }
    this.step!.touchedPhases.add(el.phaseId);
    if (info.kind === 'classification') {
      // DERIVATIONS §4.10: classification rows feed the classification Standing directly; no Attempts.
      const rows = el.rows.filter((r) => r.placement).map((r) => ({ entryId: r.entryId ?? r.bib, bib: r.bib, rank: r.placement!.rank, order: r.placement!.order,
        ...(r.decidedIn ? { decidedIn: r.decidedIn } : {}) }));
      this.classification.set(el.phaseId, { rows, asOf: el.observedAt });
      this.standingDirty.add(el.phaseId);
      return;
    }
    const second = info.pairRole === 'second';
    const detectedAt = el.source === 'xml' ? (this.lastRewriteDetectedAt ?? el.observedAt) : null;
    const seen = new Set<string>();
    const touched: AttemptS[] = [];
    for (const row of el.rows) {
      const a = this.getAttempt(`${el.phaseId}:${row.bib}`, el.observedAt, el.source);
      seen.add(a.id);
      touched.push(a);
      this.applyRow(a, row, el, seq, second, detectedAt);
    }
    if (el.source === 'tcp') {
      // TCP push: a complete statement of the race. A row absent states no result.
      for (const id of this.phaseAttempts.get(el.phaseId) ?? []) {
        if (seen.has(id)) continue;
        const a = this.attempts.get(id)!;
        if (a.deleted) continue;
        const fields = second ? RETRACT_SECOND_ABSENT : RETRACT_FIRST;
        this.applyAbsent(a, fields, el.source, seq, el.observedAt, null);
        touched.push(a);
      }
    }
    if (this.rebaseline && el.source === 'xml' && (this.rebaseline.scope.kind === 'event' || this.rebaseline.scope.phaseId === el.phaseId)) {
      this.finishRebaseline();
    }
    void touched;
  }

  private applyRow(a: AttemptS, row: SnapshotRow, el: { source: 'tcp' | 'xml'; mode: string; observedAt: string }, seq: number,
                   second: boolean, detectedAt: string | null) {
    const src = el.source;
    const base = { seq, observedAt: el.observedAt, source: src as Source, kind: 'result-row' as Kind, confidence: 'authoritative' as const, gen: a.gen };
    const fields: string[] = [];
    const plain = (f: string, v: unknown) => { this.put(a, f, { ...base, state: 'known', value: v }, src); fields.push(f); };
    if (row.entryId) plain('entry', { entryId: row.entryId });
    if (row.startOrder !== undefined) plain('startOrder', row.startOrder);
    if (row.scheduledStart) plain('scheduledStart', row.scheduledStart);
    if (row.heat !== undefined) row.heat === null ? (this.put(a, 'heat', { ...base, state: 'unavailable', reason: 'not-applicable' }, src), fields.push('heat')) : plain('heat', row.heat);
    if (row.startLane !== undefined && row.startLane !== null) plain('startLane', row.startLane);
    if (src === 'xml') {
      if (row.upstreamCatRank !== undefined) a.upstreamCatRank = row.upstreamCatRank;
      if (row.outcome !== undefined || row.untimed) a.xmlUntimed = row.untimed === true;
      if (row.startTime && !a.genStart) a.genStart = row.startTime;
    }
    if (row.unparseable) this.setUnparseable(a, src, row.unparseable);
    if (el.mode === 'start-list') {
      this.applyAbsent(a, second ? RETRACT_SECOND_ABSENT : RETRACT_FIRST, src, seq, el.observedAt, detectedAt);
      this.recompute(a, fields);
      return;
    }
    // TCP rows carry no finish time (E1); attribute the on-course finish of this generation when the run time matches.
    let finishTime = row.finishTime ?? null;
    if (!finishTime && src === 'tcp' && a.lastOnCourseFinish && row.runSeconds != null && a.lastOnCourseFinish.runSeconds === row.runSeconds) {
      finishTime = a.lastOnCourseFinish.eventTime;
      if (a.gen > 1) a.tcpAttributed = true;
    }
    let mark = row.status ?? null;
    // DERIVATIONS §4.12: a mark carried over a re-run is not presented on a row with the new run's finish.
    if (mark && a.markAtGen === mark && finishTime && a.genStart && finishTime > a.genStart) {
      mark = null;
      a.staleMark = a.markAtGen;
      this.diagnostics.set(`stale-mark|${a.id}`, { kind: 'stale-mark', attemptId: a.id, run: a.gen, mark: a.markAtGen });
      this.stats.staleMarks++;
    } else if (a.staleMark) {
      a.staleMark = null;
      this.diagnostics.delete(`stale-mark|${a.id}`);
    }
    const hasTime = row.outcome !== undefined && row.outcome !== null;
    const meta = { finishTime, runSeconds: row.runSeconds ?? null, rowStatus: mark ?? (hasTime ? 'finished' : null), detectedAt,
      ...(row.judgingComplete !== undefined ? { judgingComplete: row.judgingComplete } : {}) };
    const val = (f: string, v: unknown, extra: Partial<Obs> = {}) => {
      this.put(a, f, { ...base, ...meta, state: 'known', value: v, ...extra }, src);
      fields.push(f);
    };
    const rowFinish = { finishTime: row.finishTime ?? null, runSeconds: row.runSeconds ?? null };
    if (a.contradiction && (mark || ((rowFinish.finishTime != null || rowFinish.runSeconds != null) && !this.sameFinish(rowFinish, a.contradiction)))) {
      this.liftContradiction(a, seq);   // a row carrying a different finish, or a mark
      fields.push('status', 'outcome', 'placement', 'pairTotal', 'countingRun');
    }
    if (mark || hasTime || (row.placement && !second && !row.timeEmpty && row.untimed)) {
      if (mark && NO_RESULT_MARKS.includes(mark)) {
        val('status', mark);
        val('outcome', { kind: 'no-result', status: mark });
      } else if (mark === 'non-ranked' && hasTime) {
        val('status', 'non-ranked', finishTime ? { eventTime: finishTime } : {});
        val('outcome', row.outcome, finishTime ? { eventTime: finishTime } : {});
      } else {
        val('status', row.underReview ? 'finished' : 'finished', finishTime ? { eventTime: finishTime } : {});
        const untimed = row.untimed === true || (row.untimed === undefined && a.xmlUntimed === true && !a.finishSeenThisGen);
        if (untimed) val('outcome', undefined, { state: 'unavailable', reason: 'not-applicable', eventTime: null });
        else val('outcome', row.outcome, finishTime ? { eventTime: finishTime } : {});
      }
      if (row.placement) val('placement', row.placement); else this.applyAbsent(a, ['placement'], src, seq, el.observedAt, detectedAt, fields);
      if (row.gatesUnavailable) val('gates', undefined, { state: 'unavailable', reason: row.gatesUnavailable });
      else if (row.gates) { const o = { ...base, ...meta, state: 'known' as const, value: row.gates }; this.put(a, 'gates', o, src); fields.push('gates'); }
      if (second) {
        if (row.pairTotal !== undefined && row.pairTotal !== null) val('pairTotal', row.pairTotal);
        else if (row.pairTotal === null) this.applyAbsent(a, ['pairTotal'], src, seq, el.observedAt, detectedAt, fields);
        if (row.countingRun) val('countingRun', row.countingRun);
      }
      if (row.underReview !== undefined) val('underReview', row.underReview);
      if (row.qualified !== undefined) val('qualified', row.qualified);
      if (row.faults) val('faults', row.faults);
    } else if (second) {
      // Paired second run, row present with an empty time and no mark: run 2 retracted; placement and pairTotal follow the row.
      this.applyAbsent(a, RETRACT_TIME_EMPTY, src, seq, el.observedAt, detectedAt, fields);
      if (row.placement) val('placement', row.placement); else this.applyAbsent(a, ['placement'], src, seq, el.observedAt, detectedAt, fields);
      if (row.pairTotal !== undefined && row.pairTotal !== null) val('pairTotal', row.pairTotal);
      else this.applyAbsent(a, ['pairTotal'], src, seq, el.observedAt, detectedAt, fields);
      if (row.countingRun) val('countingRun', row.countingRun);
    } else {
      // First or single run (TCP or XML): the row states no result.
      this.applyAbsent(a, RETRACT_FIRST, src, seq, el.observedAt, detectedAt, fields);
    }
    if (fields.includes('gates')) {
      const s = this.slot(a, 'gates');
      const w = this.rule2(a, 'gates', s);
      if (w && w.seq === seq && !w.absent && w.state === 'known' && !this.refusedMarkRow(a, w)) this.foldCells(a, w, false);
    }
    this.recompute(a, fields);
  }

  /**
   * INV-7: record "this source states no result" for each field, when the field is presented from a
   * results-table observation or the source itself previously stated a value. Omission is never this.
   */
  private applyAbsent(a: AttemptS, fields: string[], src: 'tcp' | 'xml', seq: number, observedAt: string, detectedAt: string | null, out?: string[]) {
    const touched: string[] = [];
    // DERIVATIONS §4.12 "Never: an Attempt whose outcome is still an on-course inference" (the row may not be written yet).
    if (a.from.outcome?.kind === 'inference' && a.presented.outcome.state === 'known') return;
    for (const f of fields) {
      const s = this.slot(a, f);
      const from = a.from[f];
      const presentedFromTable = !!from && !from.absent && (from.source === 'tcp' || from.source === 'xml') && from.kind !== 'inference' && from.kind !== 'operator';
      const sourceHeldValue = !!s[src] && !s[src]!.absent && s[src]!.state === 'known';
      if (!presentedFromTable && !sourceHeldValue) continue;
      s[src] = { seq, observedAt, source: src, kind: 'result-row', state: 'not-yet', absent: true, confidence: 'authoritative', gen: a.gen, detectedAt };
      touched.push(f);
    }
    if (touched.length && a.contradiction) this.liftContradiction(a, seq);
    if (out) out.push(...touched); else this.recompute(a, touched);
  }

  // ───────────────────────────── INV-2: choosing the presented value ─────────────────────────────

  /** INV-2 rule 2 between the tcp and xml results-table slots (with INV-7's guard and the mark exception). */
  private rule2(a: AttemptS | EntityS, f: string, s: Slot): Obs | undefined {
    const isA = (a as AttemptS).gen !== undefined;
    const genOk = (o?: Obs) => o && (!isA || o.gen === (a as AttemptS).gen) ? o : undefined;
    const ok = (o?: Obs) => genOk(o) && (!isA || !this.unusable(a as AttemptS, o!)) ? o : undefined;
    const tRaw = genOk(s.tcp);
    const t = ok(s.tcp), x = ok(s.xml);
    if (!x) return t;
    if (!t) {
      // INV-2c: a tcp row held back (INV-2d, §4.11) still outdates xml content older than it.
      if (tRaw && !(this.contentAge(x) > Date.parse(tRaw.observedAt))) return undefined;
      return x;
    }
    const continuous = this.tcpConnected && t.seq > this.lastDisconnectSeq;
    // INV-2c: across sources, an xml observation supersedes a tcp one only when its content is newer.
    const newer = this.contentAge(x) > Date.parse(t.observedAt);
    if (continuous) {
      if (x.seq > t.seq) {
        const xMark = !x.absent && NO_RESULT_MARKS.includes(x.rowStatus ?? '');
        const tSilent = t.absent || t.rowStatus == null || ['not-started', 'at-start', 'left-without-finish'].includes(t.rowStatus);
        // INV-7: an xml retraction applies to a tcp value (a tcp absence already states no result)
        if (((x.absent && !t.absent) || (xMark && tSilent && (f === 'status' || f === 'outcome'))) && newer) return x;
      }
      return t;
    }
    // Rule 2 "otherwise the later-ingested observation wins, under the same guard"
    if (x.seq > t.seq) {
      if (!newer && isA && this.step) { this.stats.inv2cRefusals++; this.step.inv2c.push({ attemptId: (a as AttemptS).id, field: f, tcpObservedAt: t.observedAt, xmlContentAge: new Date(this.contentAge(x)).toISOString() }); }
      return newer ? x : t;
    }
    return t;
  }

  /** CONTRACTS §4 INV-2c content age: xml = lastRewriteDetectedAt minus the poll interval; tcp = observedAt. */
  private contentAge(o: Obs): number {
    if (o.source === 'xml') return Date.parse(o.detectedAt ?? o.observedAt) - this.cfg.pollIntervalMs;
    return Date.parse(o.observedAt);
  }

  private choose(a: AttemptS, f: string): { env: Envelope; from: Obs | null } {
    const s = this.slot(a, f);
    const op = s.op && s.op.gen === a.gen ? s.op : undefined;
    if (op && op.provisionalOverride === false && !op.displaced) return { env: this.envOf(a, f, op), from: op };
    if (op && op.provisionalOverride !== false && op.supersededAt === undefined) return { env: this.envOf(a, f, op), from: op };
    if (s.bridge) return { env: this.envOf(a, f, s.bridge), from: s.bridge };
    let R = this.rule2(a, f, s);
    const inf = s.inf && s.inf.gen === a.gen ? s.inf : undefined;
    // The mark exception's guard (INV-2 rule 2 / INV-2c): an xml mark row must be newer than the tcp status it
    // displaces, here an on-course inference; a refused row leaves the inference presented, for status and outcome.
    if (R && (f === 'status' || f === 'outcome') && this.refusedMarkRow(a, R)) {
      if (inf) return { env: this.envOf(a, f, inf), from: inf };
      R = undefined;
      return { env: a.presented[f] ?? NOT_YET, from: a.from[f] ?? null };
    }
    if (R && !R.absent) return { env: this.envOf(a, f, R), from: R };
    if (f === 'status' && R?.absent) {
      // After a retraction, status is what the on-course stream currently shows, else not-started.
      if (a.listed && inf) return { env: this.envOf(a, f, inf), from: inf };
      return { env: { state: 'known', value: 'not-started', observedAt: R.observedAt, source: R.source as Source, confidence: 'authoritative', provisional: false }, from: R };
    }
    if (inf && inf.seq > s.lastValueSeq) return { env: this.envOf(a, f, inf), from: inf };
    if (R?.absent) return { env: NOT_YET, from: R };
    if (s.det && s.det.gen === a.gen) return { env: this.envOf(a, f, s.det), from: s.det };
    return { env: NOT_YET, from: null };
  }

  /**
   * Rule 2's mark exception under INV-2c: an xml mark row displacing a tcp status of not-started, at-start or
   * left-without-finish (here an on-course inference) must be newer content; a refused row is held back whole.
   */
  private refusedMarkRow(a: AttemptS, R: Obs): boolean {
    const P = a.from.status;
    return R.source === 'xml' && NO_RESULT_MARKS.includes(R.rowStatus ?? '') && !!P && P.kind === 'inference' && P.source === 'tcp'
      && ['not-started', 'at-start', 'left-without-finish'].includes(P.value as string) && !(this.contentAge(R) > Date.parse(P.observedAt));
  }

  private envOf(a: AttemptS, f: string, o: Obs): Envelope {
    if (o.state === 'not-yet') return NOT_YET;
    if (o.state === 'unavailable') return { state: 'unavailable', reason: o.reason ?? 'not-applicable' };
    const env: Known = { state: 'known', value: o.value, observedAt: o.observedAt, source: o.source as Source, confidence: o.confidence, provisional: this.provisional(a, f, o) };
    if (o.eventTime) env.eventTime = o.eventTime;
    return env;
  }

  /** CONTRACTS §1.2 provisional; TEST-ARCHITECTURE §3.2 property 11. */
  private provisional(a: AttemptS, f: string, o: Obs): boolean {
    if (NON_PROVISIONAL.has(f)) return false;
    if (o.source === 'operator-write') return o.provisionalOverride !== false && o.supersededAt === undefined;
    if (o.source === 'bridge') return false;
    if (o.kind === 'inference') return true;
    // CONTRACTS §1.2 (D4, round 10): a second run's placement, pairTotal and countingRun carried over from run 1 (a row
    // with no run-2 time and no mark) are provisional from the start of run 2 until run 2's own row replaces them.
    if (['placement', 'pairTotal', 'countingRun'].includes(f) && this.phaseInfo(a.phaseId).pairRole === 'second'
        && a.startSeenThisGen && o.kind === 'result-row' && o.rowStatus == null) return true;
    // Where gates are presented, property 11's reading: a result value is provisional exactly while the presented
    // gates have a blank cell and upstream still lists the Attempt (run not closed). Where no gate vector is
    // presented (no course; vectors), the observation's own judging flag decides, until the run closes (§1.2, §4.4).
    const gv = f === 'gates' ? (o.state === 'known' ? o.value : undefined) : (a.presented.gates?.state === 'known' ? (a.presented.gates as Known).value : undefined);
    if (Array.isArray(gv) && this.gateCount(a.phaseId)) {
      return (gv as Gate[]).some((c) => c.penalty === null) && a.listed && !a.leftThisGen;
    }
    // Closure is upstream removing the Attempt from its list (CONTRACTS §1.2, round 9). With the on-course stream
    // ingested that is known for every Attempt; the vectors, which carry no listing, state it as runClosed.
    if (this.onCourseStreamSeen) {
      if (!a.listed || a.leftThisGen) return false;
      if (!this.gateCount(a.phaseId)) return true;   // no course bound: completeness cannot be judged yet (D4)
    } else if (o.runClosed || this.closed(a)) return false;
    const complete = o.judgingComplete === undefined ? true : o.judgingComplete === true;
    return !complete;
  }

  private closed(a: AttemptS): boolean {
    const st = a.presented.status;
    return a.completedThisGen || a.leftThisGen || (st.state === 'known' && NO_RESULT_MARKS.includes(st.value as string));
  }

  private gatesComplete(a: AttemptS): boolean {
    const n = this.gateCount(a.phaseId);
    if (!n || a.cells.size < n) return false;
    for (const c of a.cells.values()) if (c.penalty === null) return false;
    return true;
  }

  // ───────────────────────────── gates: cell-wise merge (INV-2 rule 1, DERIVATIONS §4.6(e)) ─────────────────────────────

  private foldCells(a: AttemptS, o: Obs, fromInference: boolean) {
    const gates = o.value as Gate[] | undefined;
    if (!Array.isArray(gates) || o.state !== 'known') return;
    const stillListed = a.listed && !a.leftThisGen;
    if (fromInference && !stillListed) return;     // after leaving, cells change only at a results-table step
    if (!fromInference && !stillListed) {
      a.cells = new Map(gates.map((g) => [g.number, { penalty: g.penalty, kind: 'result-row' as Kind }]));
      a.cellsFrom = o;
      return;
    }
    let changed = false;
    for (const g of gates) {
      const cur = a.cells.get(g.number);
      if (g.penalty !== null) {
        // a newer judged value overwrites; restating the same value changes nothing (DERIVATIONS §4.6(e))
        if (!cur || cur.penalty !== g.penalty) { a.cells.set(g.number, { penalty: g.penalty, kind: o.kind }); changed = true; }
      } else if (!cur) {
        a.cells.set(g.number, { penalty: null, kind: o.kind }); changed = true;
      } else if (!fromInference && cur.kind !== 'inference' && cur.penalty !== null) {
        // A blank result-row cell never overwrites a cell the on-course stream judged; a result row may blank its own.
        a.cells.set(g.number, { penalty: null, kind: o.kind }); changed = true;
      }
    }
    // A result row that states exactly the merged vector now backs it (provenance for provisional, property 11).
    const restated = !fromInference && gates.every((g) => a.cells.get(g.number)?.penalty === g.penalty) && a.cells.size === gates.length;
    if (changed || !a.cellsFrom || restated) a.cellsFrom = o;
  }

  private chooseGates(a: AttemptS): { env: Envelope; from: Obs | null } {
    const s = this.slot(a, 'gates');
    const op = s.op && s.op.gen === a.gen ? s.op : undefined;
    const cellsValue = () => [...a.cells.entries()].sort((x, y) => x[0] - y[0]).map(([number, c]) => ({ number, penalty: c.penalty }));
    if (op && ((op.provisionalOverride === false && !op.displaced) || (op.provisionalOverride !== false && op.supersededAt === undefined))) {
      const merged = new Map(a.cells);
      for (const g of op.value as Gate[]) merged.set(g.number, { penalty: g.penalty, kind: 'operator' });
      const value = [...merged.entries()].sort((x, y) => x[0] - y[0]).map(([number, c]) => ({ number, penalty: c.penalty }));
      return { env: this.envOf(a, 'gates', { ...op, value }), from: op };
    }
    if (s.bridge) return { env: this.envOf(a, 'gates', s.bridge), from: s.bridge };
    const R = this.rule2(a, 'gates', s);
    if (R && !R.absent && R.state !== 'known') return { env: this.envOf(a, 'gates', R), from: R };
    if (R?.absent && !(s.inf && s.inf.gen === a.gen && s.inf.seq > R.seq)) { a.cells = new Map(); a.cellsFrom = null; return { env: NOT_YET, from: R }; }
    if (a.cellsFrom && a.cells.size) {
      const from = a.cellsFrom;
      return { env: this.envOf(a, 'gates', { ...from, value: cellsValue() }), from };
    }
    if (s.det && s.det.gen === a.gen) return { env: this.envOf(a, 'gates', s.det), from: s.det };
    return { env: NOT_YET, from: null };
  }

  // ───────────────────────────── recompute and present ─────────────────────────────

  private recompute(a: AttemptS, fields: string[]) {
    if (this.rebaseline && this.rebaselineAttempts.has(a.id)) return;   // presented at the re-baseline's close
    const set = new Set(fields);
    if (set.has('gates') || set.has('outcome')) { set.add('gates'); set.add('outcome'); }
    // provisional of every result field can move with closure and judging completeness
    for (const f of RESULT_VALUE_FIELDS) if (a.presented[f]?.state === 'known') set.add(f);
    const order = ['status', 'gates', 'outcome', ...[...set].filter((f) => f !== 'status' && f !== 'gates' && f !== 'outcome').sort()];
    for (const f of order) {
      if (!set.has(f) || f === 'run') continue;
      let { env, from } = f === 'gates' ? this.chooseGates(a) : this.choose(a, f);
      if (f === 'outcome' && env.state === 'known') env = this.secondRunOutcome(a, env, from);
      this.present(a, f, env, from);
      this.disagreement(a, f);
    }
  }

  /** DERIVATIONS §4.4: a second run's own penalty is the sum of the merged, judged cells; never the row's Pen/Total. */
  private secondRunOutcome(a: AttemptS, env: Known, from: Obs | null): Envelope {
    const v = env.value as any;
    if (!from || from.source !== 'tcp' || from.kind !== 'result-row' || v?.kind !== 'duration') return env;
    if (this.phaseInfo(a.phaseId).pairRole !== 'second' || !this.gateCount(a.phaseId) || a.cells.size === 0) return env;
    let pen = 0;
    for (const c of a.cells.values()) if (c.penalty !== null) pen += c.penalty;
    return { ...env, value: { kind: 'duration', runSeconds: v.runSeconds, penaltySeconds: pen, totalSeconds: r3(v.runSeconds + pen) } };
  }

  private present(a: AttemptS, f: string, env: Envelope, from: Obs | null) {
    const prev = a.presented[f] ?? NOT_YET;
    // INV-5: an envelope that differs only in observedAt is not a change.
    if (prev.state === 'known' && env.state === 'known') {
      const { observedAt: _p, ...pr } = prev; const { observedAt: _e, ...en } = env;
      if (canonical(pr) === canonical(en)) { a.from[f] = from ?? a.from[f] ?? null; return; }
    }
    this.setPresented(a, f, env, from);
  }

  private setPresented(a: AttemptS, f: string, env: Envelope, from: Obs | null) {
    this.touch(a.id);
    a.presented[f] = env;
    a.from[f] = from;
    this.step?.touchedPhases.add(a.phaseId);
    if (f === 'status' || f === 'courseOrder' || f === 'startOrder') this.step && (this.step.oncourseDirty = true);
  }

  /** INV-2b: a settled, retained, non-presented observation that disagrees is surfaced, never adopted. */
  private disagreement(a: AttemptS, f: string) {
    const key = `source-disagreement|${a.id}|${f}`;
    const s = this.slot(a, f);
    const t = s.tcp, x = s.xml;
    const from = a.from[f];
    let raise = false;
    if (t && x && !t.absent && !x.absent && t.state === 'known' && x.state === 'known' && t.gen === a.gen && x.gen === a.gen && from && (from === t || from === x)) {
      const settled = x.seq > t.seq && x.detectedAt != null && Date.parse(x.detectedAt) - this.cfg.pollIntervalMs > Date.parse(t.observedAt)
        && !this.provisional(a, f, t) && !this.provisional(a, f, x);
      raise = settled && canonical(t.value) !== canonical(x.value);
    }
    if (raise) this.diagnostics.set(key, { kind: 'source-disagreement', attemptId: a.id, field: f, sources: ['tcp', 'xml'] });
    else this.diagnostics.delete(key);
  }

  private setUnparseable(a: AttemptS, src: Source, cells: { slot: number; text: string }[]) {
    for (const k of [...this.diagnostics.keys()]) if (k.startsWith(`unparseable-cell|${a.id}|${src}|`)) this.diagnostics.delete(k);
    for (const c of cells) this.diagnostics.set(`unparseable-cell|${a.id}|${src}|${c.slot}`, { kind: 'unparseable-cell', attemptId: a.id, source: src, slot: c.slot, text: c.text });
  }

  /** DERIVATIONS §4.5 failure mode: run 1 unavailable only once run 2 is observed and neither path can supply it. */
  private unavailableRunOne(a: AttemptS) {
    const info = this.phaseInfo(a.phaseId);
    if (info.pairRole !== 'second' || a.presented.outcome.state !== 'known') return;
    if (this.xmlState === 'connected') return;
    const sib = this.siblingPhase(a.phaseId);
    if (!sib) return;
    const b = this.getAttempt(`${sib}:${a.bib}`, this.step!.observedAt, null);
    if (b.presented.outcome.state !== 'not-yet') return;
    const reason: UnavailableReason = this.xmlState === 'unreachable' ? 'source-unreachable' : 'not-configured';
    this.put(b, 'outcome', { seq: this.step!.seq, observedAt: this.step!.observedAt, source: null, kind: 'structure', state: 'unavailable', reason, confidence: 'authoritative', gen: b.gen }, 'det');
    this.recompute(b, ['outcome']);
  }

  // ───────────────────────────── re-baseline (§4, ADR-015) ─────────────────────────────

  private startRebaseline(el: Extract<Element, { type: 'event' }>, seq: number) {
    const scope = el.scope ?? { kind: 'event' };
    this.rebaseline = { scope, seq, observedAt: el.observedAt };
    this.rebaselineAttempts.clear();
    for (const a of this.attempts.values()) {
      if (a.deleted || (scope.kind === 'phase' && a.phaseId !== scope.phaseId)) continue;
      this.rebaselineAttempts.add(a.id);
      this.touch(a.id);
      for (const f of ['status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified']) {
        const s = this.slot(a, f);
        delete s.tcp; delete s.xml; delete s.inf; delete s.op; s.lastValueSeq = 0;
      }
      a.cells = new Map(); a.cellsFrom = null; a.contradiction = null; a.dead = [];
      for (const k of [...this.diagnostics.keys()]) if (k.includes(`|${a.id}`)) this.diagnostics.delete(k);
    }
  }

  private finishRebaseline() {
    const rb = this.rebaseline!;
    this.rebaseline = null;
    const ids = [...this.rebaselineAttempts].sort();
    this.rebaselineAttempts.clear();
    for (const id of ids) {
      const a = this.attempts.get(id)!;
      this.recompute(a, ['status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified']);
    }
    const attempts = ids.map((id) => this.attemptResource(this.attempts.get(id)!));
    for (const id of ids) { const a = this.attempts.get(id)!; a.emitted = true; for (const f of ATTEMPT_FIELDS) a.lastEmitted[f] = canonical(a.presented[f]); }
    const phases = new Set(ids.map((id) => this.attempts.get(id)!.phaseId));
    this.refreshStandings(phases, true);
    const standings = [...this.standings.entries()].filter(([, st]) => this.standingInScope(st, phases)).map(([, st]) => st);
    for (const st of standings) { const { asOf: _a, ...content } = st; this.standingsEmitted.set(st.standingKey as string, canonical(content)); }
    this.pushDelta({ type: 'scope.replaced', scope: rb.scope, attempts, standings });
  }

  private standingInScope(st: Record<string, unknown>, phases: Set<string>): boolean {
    const sc = st.scope as any;
    return phases.has(sc.phaseId) || phases.has(sc.firstPhaseId) || phases.has(sc.secondPhaseId);
  }

  // ───────────────────────────── live tier (CONTRACTS §8.3; vectors only) ─────────────────────────────

  applyLivePush(push: string, body: any, observedAt: string, id: string): { ingestSeq: number; deltas: Delta[] } {
    const seq = ++this.seq;
    this.step = { seq, observedAt, deltas: [], touchedPhases: new Set(), oncourseDirty: false, inv2c: [] };
    if (push === 'entry') {
      const e = this.entity('entry', id);
      const wrap = (v: unknown): Obs => v === null
        ? { seq, observedAt, source: 'bridge', kind: 'structure', state: 'unavailable', reason: 'not-applicable', confidence: 'authoritative', gen: 1 }
        : { seq, observedAt, source: 'bridge', kind: 'structure', state: 'known', value: v, confidence: 'authoritative', gen: 1 };
      for (const [k, v] of Object.entries(body)) {
        if (k === 'classId') { e.plain.classId = v; continue; }
        this.slot(e, k).bridge = wrap(v);
        if (k === 'members' && Array.isArray(v)) v.forEach((m: any, i: number) => {
          for (const [mk, mv] of Object.entries(m)) this.slot(e, `members[${i}].${mk}`).bridge = wrap(mv);
        });
      }
      for (const f of Object.keys(e.slots)) e.presented[f] = this.entityChoose(e, f);
      this.emitEntity(e);
    } else if (push === 'oncourse') {
      for (const aid of body.attemptIds as string[]) this.getAttempt(aid, observedAt, 'bridge');
      this.liveOncourse = { attemptIds: [...body.attemptIds], featuredByUpstream: body.featuredByUpstream ?? null };
      this.step.oncourseDirty = true;
    } else if (push === 'classification') {
      this.ensurePhase(id, observedAt);
      this.classification.set(id, { rows: body.rows, asOf: body.asOf ?? observedAt });
      this.step.touchedPhases.add(id);
      this.standingDirty.add(id);
    }
    this.flush();
    const out = { ingestSeq: seq, deltas: this.step.deltas };
    this.step = null;
    return out;
  }

  private deleteAttempt(id: string) {
    const a = this.attempts.get(id);
    if (!a || a.deleted) return;
    a.deleted = true;
    this.listedIds.delete(id);
    this.standingDirty.add(a.phaseId);
    this.attempts.delete(id);
    this.dirty.add(`attempt:${id}`);
    this.phaseAttempts.get(a.phaseId)?.delete(id);
    this.step!.touchedPhases.add(a.phaseId);
    if (!this.deletedEmitted.has(id)) { this.deletedEmitted.add(id); this.pushDelta({ type: 'attempt.deleted', attemptId: id }); }
  }

  // ───────────────────────────── entities: phase / entry / class / course ─────────────────────────────

  entity(kind: EntityS['kind'], id: string): EntityS {
    const k = `${kind}:${id}`;
    this.dirty.add(k);
    let e = this.entities.get(k);
    if (!e) { e = { id, kind, plain: {}, slots: {}, presented: {}, emitted: false, lastEmitted: {} }; this.entities.set(k, e); }
    return e;
  }

  private applyEntityObservation(el: { observedAt: string; source: Source; kind: Kind; scope: 'phase' | 'entry' | 'class' | 'course' | 'event'; id: string; fields: FieldStatement[] }, seq: number) {
    if (el.scope === 'event') return;
    if (el.scope === 'phase') this.ensurePhase(el.id, el.observedAt);
    const e = this.entity(el.scope, el.id);
    const name = slotOf(el.source, el.kind);
    for (const st of el.fields) {
      const o = this.toObs(st, el.source, el.kind, el.observedAt, seq, 1);
      const s = this.slot(e, st.field);
      if (name === 'op' && st.provisionalOverride === false) o.provisionalOverride = false;
      if ((name === 'tcp' || name === 'xml') && s.op && s.op.provisionalOverride === false && o.seq > s.op.seq) {
        const prev = s[name];
        if (!(prev && canonical(prev.value) === canonical(o.value))) s.op.displaced = true;
      }
      s[st.state && st.state !== 'known' && !el.source ? 'det' : name] = o;
      const env = this.entityChoose(e, st.field);
      const prev = e.presented[st.field];
      if (prev && prev.state === 'known' && env.state === 'known') {
        const { observedAt: _a, ...p } = prev; const { observedAt: _b, ...n } = env;
        if (canonical(p) === canonical(n)) continue;
      }
      e.presented[st.field] = env;
    }
    this.emitEntity(e);
  }

  private entityChoose(e: EntityS, f: string): Envelope {
    const s = this.slot(e, f);
    const env = (o: Obs): Envelope => o.state === 'unavailable' ? { state: 'unavailable', reason: o.reason ?? 'not-applicable' }
      : o.state === 'not-yet' ? NOT_YET
      : { state: 'known', value: o.value, observedAt: o.observedAt, ...(o.eventTime ? { eventTime: o.eventTime } : {}),
          source: o.source as Source, confidence: o.confidence, provisional: false };
    if (s.op && s.op.provisionalOverride === false && !s.op.displaced) return env(s.op);
    if (s.bridge) return env(s.bridge);
    const R = this.rule2(e, f, s);
    if (R) return env(R);
    if (s.inf) return env(s.inf);
    if (s.det) return env(s.det);
    return NOT_YET;
  }

  /** Set an entity field from a structure payload (XML or TCP), through rule 2. */
  setEntityField(e: EntityS, f: string, value: unknown, src: 'tcp' | 'xml', observedAt: string, opts: Partial<Obs> = {}) {
    const o: Obs = { seq: this.step!.seq, observedAt, source: src, kind: 'structure', state: 'known', value, confidence: 'authoritative', gen: 1, ...opts };
    this.slot(e, f)[src] = o;
    const env = this.entityChoose(e, f);
    const prev = e.presented[f];
    if (prev && prev.state === 'known' && env.state === 'known') {
      const { observedAt: _a, ...p } = prev; const { observedAt: _b, ...n } = env;
      if (canonical(p) === canonical(n)) return;
    }
    e.presented[f] = env;
  }

  ensurePhase(phaseId: string, observedAt: string): EntityS {
    const e = this.entity('phase', phaseId);
    if (!e.plain.format) {
      const fmt = formatFromRaceId(phaseId);
      const info = formatInfo(fmt);
      Object.assign(e.plain, { phaseId, classId: e.plain.classId ?? null, format: fmt, kind: info.kind, scoringKind: info.scoringKind,
        heats: info.heats, stage: info.stage, pair: null, date: null, dateConfidence: null });
    }
    if (!e.plain.date && this.cfg.zone) { e.plain.date = localDate(observedAt, this.cfg.zone); e.plain.dateConfidence = 'inferred'; }
    return e;
  }

  phaseInfo(phaseId: string): FormatInfo {
    const e = this.entities.get(`phase:${phaseId}`);
    return formatInfo((e?.plain.format as string) ?? formatFromRaceId(phaseId));
  }

  phaseDate(phaseId: string, observedAt: string): string | null {
    return (this.ensurePhase(phaseId, observedAt).plain.date as string) ?? null;
  }

  siblingPhase(phaseId: string): string | null {
    const e = this.entities.get(`phase:${phaseId}`);
    const info = this.phaseInfo(phaseId);
    if (!info.pairWith) return null;
    const classId = e?.plain.classId as string | null;
    if (classId) {
      const cands = [...this.entities.values()].filter((x) => x.kind === 'phase' && x.plain.classId === classId && x.plain.format === info.pairWith);
      const same = cands.filter((x) => x.plain.date === e!.plain.date);
      const pick = (same.length ? same : cands).map((x) => x.id).sort()[0];
      if (pick) return pick;
    }
    return siblingRaceIdByToken(phaseId, info.pairWith);
  }

  gateCount(phaseId: string): number | null {
    const ph = this.entities.get(`phase:${phaseId}`);
    const cid = ph?.presented.courseId;
    if (cid?.state === 'known') {
      const c = this.entities.get(`course:${cid.value}`);
      const g = c?.presented.gates;
      if (g?.state === 'known') return (g.value as unknown[]).length;
      return null;
    }
    return null;
  }

  private applyStructure(el: Extract<Element, { type: 'structure' }>, seq: number) {
    void seq;
    const p = el.payload as any;
    switch (el.what) {
      case 'xml-structure': this.applyXmlStructure(p, el.observedAt); break;
      case 'schedule': {
        this.runningPhases = [];
        for (const r of p.races as any[]) {
          const e = this.ensurePhase(r.raceId, el.observedAt);
          if (r.status !== undefined) this.setEntityField(e, 'status', r.status, 'tcp', el.observedAt);
          if (r.order !== undefined) this.setEntityField(e, 'programmeOrder', r.order, 'tcp', el.observedAt);
          if (r.statusCode === 3) this.runningPhases.push(r.raceId);
          this.emitEntity(e);
        }
        break;
      }
      case 'raceconfig': {
        this.currentCourse = p;
        // RaceConfig refreshes only the currently running Phase's course, and only its captions.
        if (this.runningPhases.length === 1) {
          const ph = this.entities.get(`phase:${this.runningPhases[0]}`);
          const cid = ph?.presented.courseId;
          if (cid?.state === 'known' && !p.fabricated) {
            const c = this.entity('course', String(cid.value));
            this.setEntityField(c, 'captions', p.captions, 'tcp', el.observedAt);
            this.emitEntity(c);
          }
        }
        break;
      }
      case 'results-header': {
        const e = this.ensurePhase(p.raceId, el.observedAt);
        if (p.classId && !e.plain.classId) { e.plain.classId = p.classId; this.linkPair(e); }
        if (p.classId) {
          const c = this.entity('class', p.classId);
          c.plain.classId = p.classId;
          if (p.mainTitle) this.setEntityField(c, 'name', p.mainTitle, 'tcp', el.observedAt);
          this.emitEntity(c);
        }
        this.emitEntity(e);
        break;
      }
      case 'timeofday': {
        if (p.system) this.upstreamInstance = p.system;
        const d = this.cfg.zone ? localDate(el.observedAt, this.cfg.zone) : null;
        const et = eventTimeOf(d, p.time, this.cfg.zone);
        if (et) this.clockOffset = r3((Date.parse(et) - Date.parse(el.observedAt)) / 1000);
        break;
      }
      case 'tvs': {
        this.tvs = { odd: p.oddRaceId && p.oddBib ? `${p.oddRaceId}:${p.oddBib}` : null, even: p.evenRaceId && p.evenBib ? `${p.evenRaceId}:${p.evenBib}` : null };
        this.step!.oncourseDirty = true;
        break;
      }
      case 'system': if (p.system) this.upstreamInstance = p.system; break;
    }
  }

  private applyXmlStructure(p: any, observedAt: string) {
    if (!this.event) {
      this.event = { eventId: this.cfg.eventId, name: p.event.name, details: { state: 'known', value: p.event.details, observedAt, source: 'xml', confidence: 'authoritative', provisional: false } };
    }
    for (const c of p.courses as any[]) {
      const e = this.entity('course', c.courseId);
      Object.assign(e.plain, { courseId: c.courseId, eventId: this.cfg.eventId });
      e.whole = true;
      this.setEntityField(e, 'layout', c.layout, 'xml', observedAt);
      if (c.gates === null) {
        for (const f of ['gates', 'slots']) { this.slot(e, f).det = { seq: this.step!.seq, observedAt, source: null, kind: 'structure', state: 'unavailable', reason: 'not-configured', confidence: 'authoritative', gen: 1 }; e.presented[f] = { state: 'unavailable', reason: 'not-configured' }; }
      } else {
        this.setEntityField(e, 'gates', c.gates, 'xml', observedAt);
        this.setEntityField(e, 'slots', c.slots, 'xml', observedAt);
      }
      this.setEntityField(e, 'sectorEndsAfterGate', c.sectorEndsAfterGate, 'xml', observedAt);
      this.setEntityField(e, 'splitsAfterGate', c.splitsAfterGate, 'xml', observedAt);
      this.emitEntity(e);
    }
    for (const c of p.classes as any[]) {
      const e = this.entity('class', c.classId);
      Object.assign(e.plain, { classId: c.classId, eventId: this.cfg.eventId, code: c.classId });
      this.setEntityField(e, 'name', c.name, 'xml', observedAt);
      this.setEntityField(e, 'ageCategories', c.ageCategories, 'xml', observedAt);
    }
    for (const r of p.phases as any[]) {
      const e = this.ensurePhase(r.phaseId, observedAt);
      if (r.format) {
        const info = formatInfo(r.format);
        Object.assign(e.plain, { format: r.format, kind: info.kind, scoringKind: info.scoringKind, heats: info.heats, stage: info.stage });
      }
      if (r.classId) e.plain.classId = r.classId;
      if (r.date && e.plain.dateConfidence !== 'authoritative') {
        if (!e.plain.date || e.plain.dateConfidence === 'inferred') { e.plain.dateMismatch = e.plain.date && e.plain.date !== r.date ? e.plain.date : undefined; }
        // Phase.date is assigned once; the inferred fallback is upgraded to the snapshot's date only when they agree.
        if (!e.plain.date || e.plain.date === r.date) { e.plain.date = r.date; e.plain.dateConfidence = 'authoritative'; }
      }
      if (r.courseId !== undefined) this.setEntityField(e, 'courseId', r.courseId, 'xml', observedAt);
      if (r.scheduledStart) this.setEntityField(e, 'scheduledStart', r.scheduledStart, 'xml', observedAt);
      if (r.order !== undefined) this.setEntityField(e, 'programmeOrder', r.order, 'xml', observedAt);
      if (r.title) this.setEntityField(e, 'title', r.title, 'xml', observedAt);
      if (r.status !== undefined) this.setEntityField(e, 'status', r.status, 'xml', observedAt);
    }
    for (const r of p.phases as any[]) { const e = this.entity('phase', r.phaseId); this.linkPair(e); this.emitEntity(e); }
    // discipline: 'cross' if any Phase of the class has a Cross format
    for (const c of p.classes as any[]) {
      const e = this.entity('class', c.classId);
      const cross = [...this.entities.values()].some((x) => x.kind === 'phase' && x.plain.classId === c.classId && formatInfo(x.plain.format as string).cross);
      e.plain.discipline = cross ? 'cross' : 'slalom';
      this.emitEntity(e);
    }
    for (const ph of this.entities.values()) if (ph.kind === 'phase' && this.phaseAttempts.has(ph.id)) this.standingDirty.add(ph.id);
    for (const en of p.entries as any[]) {
      const e = this.entity('entry', en.entryId);
      Object.assign(e.plain, { entryId: en.entryId, classId: en.classId });
      for (const [k, v] of Object.entries(en.fields)) {
        if (v && typeof v === 'object' && (v as any).unavailable) {
          const s = this.slot(e, k);
          s.xml = { seq: this.step!.seq, observedAt, source: 'xml', kind: 'structure', state: 'unavailable', reason: (v as any).unavailable, confidence: 'authoritative', gen: 1 };
          const env = this.entityChoose(e, k);
          if (canonical(env) !== canonical(e.presented[k] ?? NOT_YET)) e.presented[k] = env;
        } else this.setEntityField(e, k, v, 'xml', observedAt);
      }
      this.emitEntity(e);
    }
  }

  private linkPair(e: EntityS) {
    const info = formatInfo(e.plain.format as string);
    if (!info.pairRole || !e.plain.classId) return;
    const sib = this.siblingPhase(e.id);
    if (sib) e.plain.pair = { role: info.pairRole, siblingPhaseId: sib, combination: info.combination };
  }

  // ───────────────────────────── deltas ─────────────────────────────

  private pushDelta(d: Omit<Delta, 'seq'>) {
    this.step!.deltas.push({ seq: ++this.seq, ...d } as Delta);
  }

  attemptResource(a: AttemptS): Record<string, unknown> {
    const out: Record<string, unknown> = { attemptId: a.id, phaseId: a.phaseId, bib: a.bib };
    for (const f of ATTEMPT_FIELDS) out[f] = a.presented[f] ?? NOT_YET;
    return out;
  }

  private emitAttempt(a: AttemptS) {
    if (a.deleted) return;
    if (!a.emitted) {
      a.emitted = true;
      const res = this.attemptResource(a);
      for (const f of ATTEMPT_FIELDS) a.lastEmitted[f] = canonical(a.presented[f]);
      const { attemptId, ...fields } = res;
      this.pushDelta({ type: 'attempt.updated', attemptId, fields });
      return;
    }
    const fields: Record<string, unknown> = {};
    for (const f of ATTEMPT_FIELDS) {
      const c = canonical(a.presented[f]);
      // Property 10: a run-generation change is sent with every run-scoped field explicitly, none omitted.
      if (a.lastEmitted[f] !== c || a.forceEmit.has(f)) { fields[f] = a.presented[f]; a.lastEmitted[f] = c; }
    }
    a.forceEmit.clear();
    if (Object.keys(fields).length) this.pushDelta({ type: 'attempt.updated', attemptId: a.id, fields });
  }

  entityResource(e: EntityS): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e.plain)) if (v !== undefined && k !== 'dateConfidence' && k !== 'dateMismatch') out[k] = v;
    for (const k of Object.keys(e.presented).sort()) out[k] = e.presented[k];
    return out;
  }

  private emitEntity(e: EntityS) {
    if (!this.step) return;
    const res = this.entityResource(e);
    const type = `${e.kind}.updated`;
    const idKey = `${e.kind}Id`;
    if (!e.emitted || e.whole) {
      const c = canonical(res);
      if (e.lastEmitted.__whole === c) return;
      e.emitted = true; e.lastEmitted.__whole = c;
      for (const [k, v] of Object.entries(res)) e.lastEmitted[k] = canonical(v);
      this.pushDelta(e.kind === 'course' ? { type, course: res } : { type, [idKey]: e.id, fields: res });
      return;
    }
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(res)) {
      const c = canonical(v);
      if (e.lastEmitted[k] !== c) { fields[k] = v; e.lastEmitted[k] = c; }
    }
    e.lastEmitted.__whole = canonical(res);
    if (Object.keys(fields).length) this.pushDelta({ type, [idKey]: e.id, fields });
  }

  private flush() {
    const st = this.step!;
    if (this.event && !this.eventEmitted) { this.eventEmitted = true; this.pushDelta({ type: 'event.changed', event: this.event }); }
    // attempts touched in this step, in id order for determinism
    const touched = [...this.stepTouched].sort().map((id) => this.attempts.get(id)).filter((a): a is AttemptS => !!a && !a.deleted);
    if (!this.rebaseline) for (const a of touched) this.emitAttempt(a);
    for (const a of touched) {
      const sig = this.standingSig(a);
      if (sig !== a.standingSig) { a.standingSig = sig; this.standingDirty.add(a.phaseId); }
    }
    for (const pid of st.touchedPhases) if (this.classification.has(pid)) this.standingDirty.add(pid);
    const phases = new Set(this.standingDirty);
    this.standingDirty.clear();
    this.duplicateFinishes(phases);
    this.refreshStandings(phases, false);
    if (st.oncourseDirty || this.liveOncourse) this.refreshOncourse();
    const diag = canonical([...this.diagnostics.values()].sort((x, y) => (canonical(x) < canonical(y) ? -1 : 1)));
    if (diag !== this.diagnosticsEmitted) { this.diagnosticsEmitted = diag; this.pushDelta({ type: 'diagnostics.updated', diagnostics: JSON.parse(diag) }); }
    const src = canonical(this.sources());
    if (src !== this.sourcesEmitted) { this.sourcesEmitted = src; this.pushDelta({ type: 'sources.updated', sources: JSON.parse(src) }); }
  }

  sources() {
    return {
      tcp: { state: this.tcpConnected ? 'connected' : 'unreachable', upstreamInstance: this.upstreamInstance ? this.upstreamInstance.toLowerCase() : null, timingClockOffsetSeconds: this.clockOffset },
      xml: { state: this.xmlState, lastRewriteDetectedAt: this.lastRewriteDetectedAt },
      live: { state: 'not-configured', pendingResources: 0, lastAcceptedAt: null, lastError: null },
    };
  }

  /** §2.6 duplicate-finish: two Attempts of one Phase presenting the same finish time. */
  private duplicateFinishes(phases: Set<string>) {
    for (const pid of phases) {
      for (const k of [...this.diagnostics.keys()]) if (k.startsWith(`duplicate-finish|${pid}|`)) this.diagnostics.delete(k);
      const by = new Map<string, string[]>();
      for (const id of this.phaseAttempts.get(pid) ?? []) {
        const a = this.attempts.get(id)!;
        const o = a.presented.outcome, s = a.presented.status;
        const t = (o.state === 'known' && (o.value as any).kind === 'duration' && o.eventTime) ? o.eventTime
          : (s.state === 'known' && s.value === 'finished' && s.eventTime) ? s.eventTime : null;
        if (t) { if (!by.has(t)) by.set(t, []); by.get(t)!.push(a.bib); }
      }
      for (const [t, bibs] of by) if (bibs.length > 1) {
        this.diagnostics.set(`duplicate-finish|${pid}|${t}`, { kind: 'duplicate-finish', phaseId: pid, finishTime: t, bibs: bibs.sort(compareBib) });
      }
    }
  }

  // ───────────────────────────── on-course set (§7.1) ─────────────────────────────

  oncourseSet(): string[] {
    if (this.liveOncourse) return this.liveOncourse.attemptIds;
    // The set is upstream's list: a finish changes status, not membership (round 8).
    const members = [...this.listedIds].map((id) => this.attempts.get(id)!).filter((a) => a && a.listed);
    const co = (a: AttemptS) => (a.presented.courseOrder.state === 'known' ? (a.presented.courseOrder.value as number) : Infinity);
    const so = (a: AttemptS) => (a.presented.startOrder.state === 'known' ? (a.presented.startOrder.value as number) : Infinity);
    members.sort((x, y) => co(x) - co(y) || so(x) - so(y) || (x.id < y.id ? -1 : 1));
    return members.map((a) => a.id);
  }

  private refreshOncourse() {
    const ids = this.oncourseSet();
    let featured: string | null;
    if (this.liveOncourse) featured = this.liveOncourse.featuredByUpstream;
    else featured = this.tvs.odd && ids.includes(this.tvs.odd) ? this.tvs.odd : this.tvs.even && ids.includes(this.tvs.even) ? this.tvs.even : null;
    const key = canonical({ ids, featured });
    if (key === this.oncourseEmitted) return;
    this.oncourseEmitted = key;
    this.oncourse = { attemptIds: ids, featuredByUpstream: featured, asOf: this.lastListingAt ?? this.step!.observedAt };
    this.pushDelta({ type: 'oncourse.updated', attemptIds: ids, featuredByUpstream: featured, asOf: this.oncourse.asOf });
  }

  // ───────────────────────────── standings (§5) ─────────────────────────────

  /** The Attempt's contribution to its Phase's standings, with the observedAt values behind asOf. */
  private standingSig(a: AttemptS): string | null {
    const i = this.standingInput(a);
    if (!i) return null;
    return canonical([i, a.upstreamCatRank]);
  }

  standingInputs(phaseId: string): StandingInput[] {
    const out: StandingInput[] = [];
    for (const id of this.phaseAttempts.get(phaseId) ?? []) {
      const i = this.standingInput(this.attempts.get(id)!);
      if (i) out.push(i);
    }
    return out;
  }

  private standingInput(a: AttemptS): StandingInput | null {
    {
      const pl = a.presented.placement, oc = a.presented.outcome, st = a.presented.status, pt = a.presented.pairTotal;
      const placed = pl.state === 'known' && pl.value && typeof (pl.value as any).order === 'number';
      // CONTRACTS §5 step 3 (D2): an unplaced entry presents an outcome other than pending or running, or a mark.
      const isResult = oc.state === 'known' && ['duration', 'no-result', 'ordinal'].includes((oc.value as any).kind);
      const otherOutcome = oc.state !== 'not-yet' && !(oc.state === 'known' && ['pending', 'running'].includes((oc.value as any).kind));
      const marked = st.state === 'known' && NO_RESULT_MARKS.includes(st.value as string);
      if (!placed && !otherOutcome && !marked) return null;
      const entryId = a.presented.entry.state === 'known' ? (a.presented.entry.value as any).entryId : a.id;
      const entry = this.entities.get(`entry:${entryId}`);
      const cat = entry?.presented.ageCategoryId;
      const ur = a.presented.underReview;
      return {
        entryId, bib: a.bib, status: st.state === 'known' ? (st.value as string) : null,
        placement: placed ? (pl.value as any) : null,
        // §2.7 (D3): the outcome when it is a result; pending while pending or running
        result: isResult ? (oc as Known).value : { kind: 'pending' },
        pairTotal: pt.state === 'known' ? (pt.value as number) : null,
        ageCategoryId: cat?.state === 'known' ? (cat.value as string) : null,
        provisional: [oc, pl, pt].some((e) => e.state === 'known' && e.provisional),
        underReview: ur.state === 'known' && ur.value === true,
        heat: a.presented.heat.state === 'known' ? (a.presented.heat.value as number) : null,
      };
    }
  }

  private standingAsOf(phaseId: string, entries: StandingInput[]): string | null {
    let max: string | null = null;
    const ids = new Set(entries.map((e) => e.bib));
    for (const id of this.phaseAttempts.get(phaseId) ?? []) {
      const a = this.attempts.get(id)!;
      if (!ids.has(a.bib)) continue;
      for (const f of ['placement', 'outcome', 'pairTotal']) {
        const e = a.presented[f];
        if (e.state === 'known' && (!max || e.observedAt > max)) max = e.observedAt;
      }
    }
    return max;
  }

  private refreshStandings(phases: Set<string>, silent: boolean) {
    const done = new Set<string>();
    for (const pid of phases) {
      const ph = this.entities.get(`phase:${pid}`);
      const info = this.phaseInfo(pid);
      if (!ph) continue;   // classId is null until a Results header or the snapshot names the class
      const classId = (ph.plain.classId as string) ?? null;
      const cls = this.entities.get(`class:${classId}`);
      const cats = cls?.presented.ageCategories?.state === 'known' ? (cls.presented.ageCategories.value as { ageCategoryId: string }[]).map((c) => c.ageCategoryId) : [];
      const scopes: { scope: StandingScope; inputsFrom: string; heatPhase?: boolean }[] = [];
      if (info.kind === 'classification') scopes.push({ scope: { kind: 'classification', phaseId: pid }, inputsFrom: pid });
      else {
        scopes.push({ scope: { kind: 'phase', phaseId: pid }, inputsFrom: pid, heatPhase: info.heats });
        if (info.heats) {
          const heats = new Set<number>();
          for (const id of this.phaseAttempts.get(pid) ?? []) { const h = this.attempts.get(id)!.presented.heat; if (h.state === 'known') heats.add(h.value as number); }
          for (const h of [...heats].sort((x, y) => x - y)) scopes.push({ scope: { kind: 'heat', phaseId: pid, heat: h }, inputsFrom: pid });
        }
        if (info.pairRole === 'second') {
          const sib = (ph.plain.pair as any)?.siblingPhaseId ?? this.siblingPhase(pid);
          if (sib) scopes.push({ scope: { kind: 'pair', firstPhaseId: sib, secondPhaseId: pid }, inputsFrom: pid });
        }
      }
      for (const sc of scopes) {
        let inputs: StandingInput[];
        let asOf: string | null;
        if (sc.scope.kind === 'classification') {
          const c = this.classification.get(pid);
          inputs = (c?.rows ?? []).map((r: any) => ({ entryId: r.entryId, bib: r.bib, status: null, placement: { rank: r.rank, order: r.order },
            result: { kind: 'pending' }, provisional: false, underReview: false, decidedIn: r.decidedIn }));
          asOf = c?.asOf ?? null;
        } else {
          inputs = this.standingInputs(sc.inputsFrom);
          if (sc.scope.kind === 'heat') { const h = sc.scope.heat; inputs = inputs.filter((i) => i.heat === h); }
          asOf = this.standingAsOf(sc.inputsFrom, inputs);
        }
        const durationScored = info.scoringKind === 'duration' && sc.scope.kind !== 'classification';
        const catList = durationScored ? [null, ...cats] : [null];
        for (const cat of catList) {
          const key = standingKey(sc.scope, cat);
          if (done.has(key)) continue;
          done.add(key);
          const upstream: Record<string, number> = {};
          if (cat) for (const id of this.phaseAttempts.get(sc.inputsFrom) ?? []) {
            const a = this.attempts.get(id)!;
            if (a.upstreamCatRank != null && a.presented.entry.state === 'known') upstream[(a.presented.entry.value as any).entryId] = a.upstreamCatRank;
          }
          const { entries, anomalies } = assembleStanding(inputs, { scope: sc.scope, ageCategoryId: cat, durationScored,
            heatPhase: sc.heatPhase ?? false, upstreamCategoryRanks: upstream, withAnomalies: this.cfg.tier === 'onsite' });
          // §5 step 1 (D3): pushed only when the serialised standing changes; asOf is the ingest time of the
          // observation that changed it (a classification's: its last row observation).
          const content: Record<string, unknown> = { standingKey: key, classId, scope: sc.scope, ageCategoryId: cat, entries };
          if (this.cfg.tier === 'onsite') content.anomalies = anomalies;
          const c = canonical(content);
          const prevC = this.standingsEmitted.get(key);
          if (prevC === c) continue;
          if (prevC === undefined && entries.length === 0) continue;   // an empty standing is not published until it has entries
          const standing = { ...content, asOf: sc.scope.kind === 'classification' ? asOf : (this.step?.observedAt ?? asOf) };
          this.standings.set(key, standing);
          this.dirty.add(`standing:${key}`);
          if (!silent) { this.standingsEmitted.set(key, c); this.pushDelta({ type: 'standing.updated', standing }); }
        }
      }
    }
  }

  // ───────────────────────────── canonical state ─────────────────────────────

  /**
   * State hash after a step: sha256(globals ‖ XOR over entities of sha256(key ‖ canonical(entity incl. retained
   * observations))). Per-entity digests are recomputed only for entities touched in the step, so the hash
   * covers the whole state without re-serialising it per step (a literal per-step sha256 of the multi-MB
   * canonical state is not affordable over ~15k steps). The end-of-replay state file is hashed literally.
   */
  stateHash(): string {
    for (const key of this.dirty) {
      const i = key.indexOf(':');
      const kind = key.slice(0, i), id = key.slice(i + 1);
      let obj: unknown = undefined;
      if (kind === 'attempt') { const a = this.attempts.get(id); if (a) obj = this.attemptInternal(a); }
      else if (kind === 'standing') obj = this.standings.get(id);
      else { const e = this.entities.get(key); if (e) obj = { r: this.entityResource(e), s: e.slots }; }
      const old = this.entityHash.get(key);
      if (old) xorInto(this.hashAcc, old);
      if (obj === undefined) { this.entityHash.delete(key); continue; }
      const h = createHash('sha256').update(key).update('\n').update(canonical(obj)).digest();
      this.entityHash.set(key, h);
      xorInto(this.hashAcc, h);
    }
    this.dirty.clear();
    const globals = canonical({ seq: this.seq, tcp: this.tcpConnected, disc: this.lastDisconnectSeq, rw: this.lastRewriteDetectedAt, xml: this.xmlState,
      inst: this.upstreamInstance, off: this.clockOffset, event: this.event, oncourse: this.oncourse, tvs: this.tvs, writes: this.writes,
      diag: this.diagnosticsEmitted, cc: this.currentCourse, run: this.runningPhases, last: this.lastListingAt, rb: this.rebaseline, ocs: this.onCourseStreamSeen,
      se: [...this.standingsEmitted.entries()].length, cls: [...this.classification.entries()] });
    return createHash('sha256').update(this.hashAcc).update(globals).digest('hex');
  }

  private attemptInternal(a: AttemptS) {
    return { r: this.attemptResource(a), gen: a.gen, gs: a.genStart, mg: a.markAtGen, l: a.listed, lt: a.leftThisGen, c: a.completedThisGen,
      f: a.finishSeenThisGen, lof: a.lastOnCourseFinish, s: a.slots, k: a.contradiction, d: a.dead, o: a.oldRunSeconds,
      cells: [...a.cells.entries()], sm: a.staleMark, uc: a.upstreamCatRank, xu: a.xmlUntimed, lst: a.listing };
  }

  /** The canonical presented state (what a client would hold), for the end-of-replay state file. */
  presentedState() {
    return {
      seq: this.seq,
      event: this.event,
      phases: this.listEntities('phase'), classes: this.listEntities('class'), entries: this.listEntities('entry'), courses: this.listEntities('course'),
      attempts: [...this.attempts.values()].sort((x, y) => (x.id < y.id ? -1 : 1)).map((a) => this.attemptResource(a)),
      standings: [...this.standings.values()].sort((x, y) => ((x.standingKey as string) < (y.standingKey as string) ? -1 : 1)),
      oncourse: this.oncourse,
      diagnostics: JSON.parse(this.diagnosticsEmitted),
      sources: this.sources(),
      writes: this.writes,
    };
  }

  private listEntities(kind: string) {
    return [...this.entities.values()].filter((e) => e.kind === kind).sort((x, y) => (x.id < y.id ? -1 : 1)).map((e) => this.entityResource(e));
  }
}

function slotOf(source: Source, kind: Kind): SlotName {
  if (source === 'operator-write' || kind === 'operator') return 'op';
  if (source === 'bridge') return 'bridge';
  if (kind === 'inference') return 'inf';
  if (source === 'xml') return 'xml';
  return 'tcp';
}

function xorInto(acc: Buffer, h: Buffer) {
  for (let i = 0; i < 32; i++) acc[i] = acc[i]! ^ h[i]!;
}
