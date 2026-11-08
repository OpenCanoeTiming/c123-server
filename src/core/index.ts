/**
 * The merge core (#203): the single interpretation locus (CONTRACTS §4; ADR-003, ADR-013, ADR-015, ADR-017). Pure: no wall clock, no
 * timers, no I/O; time comes only from the elements. Elements are `parseTcp` and `parseXmlSnapshot` output plus the reader's and
 * the connection's events, delivered one unit at a time (`applyUnit`), and a unit notifies once, after its last element (§1.6).
 *
 * This file only dispatches. Retention, precedence, generations, retraction and presentation live in their own modules.
 */
import { applyListing, applyLeaveRule, leave, list, observeStreamOutcome, observeStreamStatus, oncourseView } from './oncourse.js';
import { isMark } from './precedence.js';
import { currentDiagnostics, flush } from './notify.js';
import { phaseResource, attemptFor, fmtFor, resource } from './registry.js';
import { FIRST_RUN_FIELDS, PAIR_FIELDS, SECOND_RUN_EMPTY_FIELDS, hasResult, retract } from './retraction.js';
import { retain, fieldSlots, slotOf, tick } from './retention.js';
import { applyRow, floorStatus, putCells, putIdentity, putStanding, rebindCells } from './rows.js';
import { applyClassification, dirtyHandle, observeResource, refreshCourses, viewResource } from './resources.js';
import { submitWrite, wireWrite } from './writes.js';
import { viewAttempt, viewUnknownAttempt } from './presentation.js';
import { markOf, startGeneration } from './generations.js';
import type { Standing } from '@opencanoetiming/c123-contract';
import type { AttemptState, ClassificationRow, ClassificationState, CoreState, Diagnostic, Element, MergeCoreOptions, Message, Row, Source } from './types.js';

export type { MergeCoreOptions } from './types.js';

export interface MergeCore {
  /** Merges one unit and notifies once. Returns what the core derived at it: the `oncourse-left` of the leave rule (DERIVATIONS §4.1). */
  applyUnit(elements: readonly Element[]): Element[];
  presented(attemptId: string): Record<string, unknown>;
  /** The Entry `entryId`; without one, the Entry a vector's unnamed observations address. */
  entry(entryId?: string): Record<string, unknown>;
  phase(phaseId: string): Record<string, unknown>;
  attempts(): string[];
  /** Read-only views for hydration (CONTRACTS §7.1): every resource the core holds, as `phase()` and `entry()` serve them. */
  phaseIds(): string[];
  entryIds(): string[];
  classIds(): string[];
  courseIds(): string[];
  class(classId: string): Record<string, unknown>;
  course(courseId: string): Record<string, unknown>;
  /** The Standings as last sent. */
  standings(): Standing[];
  oncourse(): { attemptIds: string[]; featuredByUpstream: string | null; asOf: string | null };
  diagnostics(): Diagnostic[];
  writeRequest(): unknown;
  notifications(): Message[];
  /** Hands over the messages so far and forgets them: a long run keeps no log (the sweep, later the WebSocket). */
  drainNotifications(): Message[];
  /** The rows of a classification Phase as last admitted (DERIVATIONS §4.10), for the Standing assembly (#205). */
  classification(phaseId: string): ClassificationState | undefined;
  counters(): CoreState['counters'];
}

const sourceOf = (el: Element): Source | undefined => {
  const v = el['source'];
  return v === 'tcp' || v === 'xml' ? v : undefined;
};
const isXmlFact = (el: Element): boolean =>
  ('field' in el && el['source'] === 'xml') || ('snapshot' in el && (el['snapshot'] as { source?: unknown }).source === 'xml');

/** Round 18: content age comes from the event alone. Its absence is a programming error, found before anything is applied. */
function validate(s: CoreState, elements: readonly Element[]): void {
  let seen = s.rewrite !== undefined;
  for (const el of elements) {
    if (el['event'] === 'xml-rewrite-detected') {
      if (!('changedAfter' in el)) throw new Error('xml-rewrite-detected without changedAfter: the reader always stamps it (DERIVATIONS §0.3)');
      seen = true;
    } else if (isXmlFact(el) && !seen) throw new Error('an xml element with no xml-rewrite-detected before it (CONFORMANCE-VECTORS §1, content age)');
  }
}

/** The parsers always name an Attempt; only a vector leaves it to `context.attemptId`. Anything else is a programming error. */
function keylessAttempt(s: CoreState): string {
  if (s.options.attemptId === undefined) throw new Error('an element that names no Attempt, with no attemptId option (CONFORMANCE-VECTORS §1)');
  return s.options.attemptId;
}

function applyEvent(s: CoreState, el: Element): void {
  switch (el['event']) {
    case 'tcp-connected':
      if (s.tcpUp === true) s.epoch++; // a reconnect nobody announced still broke continuity
      s.tcpUp = true;
      return;
    case 'tcp-disconnected':
      s.tcpUp = false;
      s.epoch++;
      return;
    case 'xml-rewrite-detected': {
      const age = el['changedAfter'] as string | null;
      s.rewrite = { changedAfter: age === null ? null : Date.parse(age) };
      return;
    }
    case 'oncourse-empty':
      s.oncourseAsOf = el.observedAt; // an observation of the on-course list: the set is as of now, whether or not it held anything (§7.2)
      for (const a of [...s.listed.values()]) leave(s, a, el);
      return;
    case 'oncourse-left': {
      const id = el['attemptId'];
      const a = s.attempts.get(typeof id === 'string' ? id : keylessAttempt(s));
      if (a !== undefined) leave(s, a, el);
      return;
    }
    case 'rebaseline':
      rebaseline(s, el);
      return;
  }
}

/** §4 step 1's list, `status` marks apart; `courseOrder`, `timeToBeat` and `status`'s lifecycle values are not on it. */
const REBASELINED = ['outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified'] as const;

/** Step 1 of the re-baseline (§4): upstream's result observations go; identities, `run` and the writes stay. */
function rebaseline(s: CoreState, el: Element): void {
  const scope = el['scope'] as { kind?: string; phaseId?: string };
  for (const a of s.attempts.values()) {
    if (scope.kind !== 'event' && a.phaseId !== scope.phaseId) continue;
    for (const f of REBASELINED) {
      const fs = a.slots.get(f);
      if (fs === undefined) continue;
      delete fs.tcp;
      delete fs.xml;
      delete fs.inference;
    }
    const st = a.slots.get('status');
    for (const side of ['tcp', 'xml'] as const) if (st !== undefined && (isMark(st[side]?.value) || st[side]?.marker === true)) delete st[side]; // lifecycle values stay
    a.cells = {};
    a.held = [];
    a.pending = [];
    a.history = {};
    a.carried.clear();
    a.gen.restated.clear();
    delete a.contradiction;
    delete a.withheld;
    s.dirtyAttempts.add(a);
    floorStatus(s, a, 'xml', el, tick(s));
  }
  if (scope.kind === 'event') s.parserDiagnostics.clear();
  else for (const [k, d] of s.parserDiagnostics) if ('attemptId' in d && d.attemptId.startsWith(`${scope.phaseId}:`)) s.parserDiagnostics.delete(k);
  s.diagnosticsDirty = true;
  s.pendingRebaseline = scope;
}

const isBlank = (row: Row): boolean =>
  !('outcome' in row) && markOf(row) === undefined && row['status'] !== 'finished' && (row['placement'] === null || row['placement'] === undefined) &&
  !('underReview' in row) && !('finishTime' in row) && row['untimed'] !== true;

function applySnapshot(s: CoreState, el: Element, inUnit: ReadonlySet<string>): void {
  const { source, phaseId, mode, rows } = el['snapshot'] as { source: Source; phaseId: string; mode: 'results' | 'start-list'; rows: Row[] };
  const fmt = fmtFor(s, phaseId);
  const phase = phaseResource(s, phaseId, el.observedAt);
  if (fmt.kind === 'classification') {
    applyClassification(s, phaseId, source, el, rows as unknown as ClassificationRow[]);
    return;
  }
  const seq = tick(s);
  const second = fmt.pair?.role === 'second';
  const named = new Set<AttemptState>();
  for (const row of rows) {
    const a = attemptFor(s, `${phaseId}:${String(row['bib'])}`, el.observedAt, source);
    named.add(a);
    rebindCells(s, a);
    a.splitsUnarmed = s.splitsArmed === false;
    if (second && (row['timeEmpty'] === true || isBlank(row))) {
      if (hasResult(a, SECOND_RUN_EMPTY_FIELDS)) retract(s, a, source, el, SECOND_RUN_EMPTY_FIELDS, seq);
      putIdentity(s, a, source, el, row, seq);
      putStanding(s, a, source, el, row, seq);
      floorStatus(s, a, source, el, seq);
    } else if (isBlank(row) || (source === 'tcp' && mode === 'start-list')) {
      if (hasResult(a, FIRST_RUN_FIELDS)) retract(s, a, source, el, FIRST_RUN_FIELDS, seq);
      putIdentity(s, a, source, el, row, seq);
      floorStatus(s, a, source, el, seq);
    } else applyRow(s, a, source, el, row, seq);
    s.dirtyAttempts.add(a);
  }
  clearRestated(s, source, named, inUnit);
  if (source !== 'tcp') return; // an absent XML row, and an XML table with no rows, state nothing (INV-7)
  const fields = second ? [...FIRST_RUN_FIELDS, ...PAIR_FIELDS] : FIRST_RUN_FIELDS;
  for (const a of phase.attempts ?? []) {
    if (!named.has(a) && hasResult(a, fields)) retract(s, a, source, el, fields, seq);
  }
}

const rowOfField = (el: Element, field: string): Row => {
  const row: Row = { [field]: el['state'] === 'unavailable' ? { state: 'unavailable', reason: el['reason'] } : el['value'] };
  if ('judgingComplete' in el) row['judgingComplete'] = el['judgingComplete'];
  if ('runClosed' in el) row['runClosed'] = el['runClosed'];
  if (el['source'] === 'xml' && typeof el['eventTime'] === 'string') row['finishTime'] = el['eventTime'];
  return row;
};

/** A listing's cells, in Kayak Cross the `faults` built from them, are an on-course inference however the element is stamped (§1.2). */
const STREAM_CELLS = { confidence: 'inferred' } as const;

function observeAttempt(s: CoreState, a: AttemptState, el: Element, field: string): void {
  const seq = tick(s);
  const source = sourceOf(el) ?? 'tcp';
  if (field === 'splits') {
    a.splitsUnarmed = s.splitsArmed === false;
    s.dirtyAttempts.add(a);
  }
  if (el['source'] === 'operator-write') {
    submitWrite(s, a, el, field, seq);
    return;
  }
  if (el['kind'] !== 'inference') {
    applyRow(s, a, source, el, rowOfField(el, field), seq);
    return;
  }
  if (field === 'run') {
    if (typeof el['value'] === 'number' && el['value'] > a.gen.n) startGeneration(s, a, el, typeof el['eventTime'] === 'string' ? el['eventTime'] : undefined, seq);
    s.dirtyAttempts.add(a);
    return;
  }
  list(s, a, el);
  switch (field) {
    case 'onCourse':
      applyListing(s, a, el, el['value'] as { dtStart: string | null; dtFinish: string | null }, seq);
      return;
    case 'status':
      observeStreamStatus(s, a, el, el['value'], seq);
      return;
    case 'outcome':
      observeStreamOutcome(s, a, el, el['value'] as { kind: string; runSeconds?: number }, seq);
      return;
    case 'cells':
      putCells(s, a, 'inference', el['value'] as (number | null)[], slotOf(s, el, 'tcp', 'inference', [], seq, STREAM_CELLS));
      return;
  }
  const extra = 'judgingComplete' in el ? { judgingComplete: el['judgingComplete'] as boolean | null } : {};
  const value = el['state'] === 'unavailable' ? { state: 'unavailable', reason: el['reason'] } : el['value'];
  const confidence = el['confidence'] === 'inferred' || field === 'gates' || field === 'faults' ? STREAM_CELLS : {};
  // round 24: a listing's `entry` is rule 2's `tcp` side, so an `xml` row restating it moves nothing
  if (retain(fieldSlots(a.slots, field), field === 'entry' ? 'tcp' : 'inference', slotOf(s, el, 'tcp', 'inference', value, seq, { ...extra, ...confidence }))) s.dirtyAttempts.add(a);
}

function observe(s: CoreState, el: Element): void {
  const field = String(el['field']);
  const source = sourceOf(el) ?? 'tcp';
  if (field === 'featuredByUpstream') {
    s.featured = el['value'] as CoreState['featured'];
    return;
  }
  const key = (name: string): string | undefined => (typeof el[name] === 'string' ? (el[name] as string) : undefined);
  const attemptId = key('attemptId');
  const entryId = key('entryId');
  const classId = key('classId');
  const courseId = key('courseId');
  const phaseId = key('phaseId');
  if (attemptId !== undefined) observeAttempt(s, attemptFor(s, attemptId, el.observedAt, source), el, field);
  else if (entryId !== undefined || el['resource'] === 'entry') {
    const r = resource(s.entries, entryId ?? '');
    if (observeResource(s, r, el, field, source, tick(s))) s.dirtyResources.add(dirtyHandle('entry', r));
  } else if (classId !== undefined) {
    const r = resource(s.classes, classId);
    if (observeResource(s, r, el, field, source, tick(s))) s.dirtyResources.add(dirtyHandle('class', r));
  } else if (courseId !== undefined) {
    const r = resource(s.courses, courseId);
    if (observeResource(s, r, el, field, source, tick(s))) s.dirtyResources.add(dirtyHandle('course', r));
  } else if (phaseId !== undefined) {
    const r = phaseResource(s, phaseId, el.observedAt);
    if (observeResource(s, r, el, field, source, tick(s))) s.dirtyPhases.add(r);
  } else observeAttempt(s, attemptFor(s, keylessAttempt(s), el.observedAt, source), el, field);
}

/** Parser diagnostics of the kinds `GET /api/diagnostics` serves; a restated row replaces its Attempt's. The ingest-only kinds reach the admin log, not this list. */
function applyDiagnostic(s: CoreState, el: Element, inUnit: Set<string>): void {
  const d = el['diagnostic'] as Diagnostic | { kind: string; signatures?: string[] };
  if (d.kind === 'unparseable-cell' || d.kind === 'member-sum-mismatch') {
    const key = JSON.stringify(d);
    inUnit.add(key);
    if (!s.parserDiagnostics.has(key)) s.diagnosticsDirty = true;
    s.parserDiagnostics.set(key, d as Diagnostic);
  }
}

/** A row restated without a cell problem it had: the diagnostic is no longer current. */
function clearRestated(s: CoreState, source: Source, named: ReadonlySet<AttemptState>, inUnit: ReadonlySet<string>): void {
  if (s.parserDiagnostics.size === 0) return;
  const ids = new Set([...named].map((a) => a.id));
  for (const [key, d] of s.parserDiagnostics) {
    if (inUnit.has(key) || !('attemptId' in d) || !ids.has(d.attemptId)) continue;
    if (d.kind === 'unparseable-cell' ? d.source === source : source === 'xml') {
      s.parserDiagnostics.delete(key);
      s.diagnosticsDirty = true;
    }
  }
}

function dispatch(s: CoreState, el: Element, inUnit: Set<string>): void {
  if ('event' in el) applyEvent(s, el);
  else if ('snapshot' in el) applySnapshot(s, el, inUnit);
  else if ('diagnostic' in el) applyDiagnostic(s, el, inUnit);
  else if ('courseRefresh' in el) refreshCourses(s, el, tick(s));
  else if ('field' in el) observe(s, el);
  // `sourceStatus`, `unparseable` and `unknownType` state nothing the merge reads
}

export function createMergeCore(options: MergeCoreOptions = {}): MergeCore {
  const s: CoreState = {
    options, counter: options.initialSeq ?? 0, epoch: 0, tcpUp: undefined, rewrite: undefined, xmlRead: false, previousTcpAt: undefined,
    attempts: new Map(), phases: new Map(), entries: new Map(), classes: new Map(), courses: new Map(), classifications: new Map(),
    listed: new Map(), oncourseAsOf: null, oncourseStatedAsOf: null, oncourseSent: '[[],null]', featured: null, writes: [], splitsArmed: undefined,
    parserDiagnostics: new Map(), phaseDiagnostics: new Map(), diagnosticsSent: '[]', diagnosticsDirty: false, log: [],
    dirtyAttempts: new Set(), dirtyPhases: new Set(), dirtyResources: new Set(), dirtyWrites: new Set(), pendingRebaseline: undefined,
    dirtyScopes: new Set(), unitAt: '', standingsSent: new Map(), standingKeys: new Map(), standingsHeld: new Map(), entryPhases: new Map(),
    counters: { generations: 0, retractions: 0, contradictions: 0, leaves: 0, refusals: {} },
  };
  return {
    applyUnit(elements) {
      validate(s, elements);
      s.unitAt = elements.at(-1)?.observedAt ?? s.unitAt;
      const inUnit = new Set<string>();
      for (const el of elements) dispatch(s, el, inUnit);
      const tcp = elements.find((el) => el['source'] === 'tcp');
      const derived = tcp === undefined ? [] : applyLeaveRule(s, tcp);
      const xml = elements.some(isXmlFact);
      if (xml && !s.xmlRead) {
        s.xmlRead = true;
        for (const a of s.attempts.values()) s.dirtyAttempts.add(a);
      }
      flush(s, xml);
      return derived;
    },
    presented: (id) => {
      const a = s.attempts.get(id);
      return a === undefined ? viewUnknownAttempt(s, id) : viewAttempt(s, a);
    },
    entry: (entryId = '') => {
      const r = s.entries.get(entryId) ?? [...s.entries.values()][0];
      return r === undefined ? {} : viewResource(r, 'entry');
    },
    phase: (phaseId) => {
      const r = s.phases.get(phaseId);
      return r === undefined ? { phaseId } : viewResource(r, 'phase');
    },
    attempts: () => [...s.attempts.keys()],
    phaseIds: () => [...s.phases.keys()],
    entryIds: () => [...s.entries.keys()],
    classIds: () => [...s.classes.keys()],
    courseIds: () => [...s.courses.keys()],
    class: (id) => {
      const r = s.classes.get(id);
      return r === undefined ? { classId: id } : viewResource(r, 'class');
    },
    course: (id) => {
      const r = s.courses.get(id);
      return r === undefined ? { courseId: id } : viewResource(r, 'course');
    },
    standings: () => [...s.standingsHeld.values()],
    oncourse: () => oncourseView(s),
    diagnostics: () => currentDiagnostics(s),
    writeRequest: () => {
      const w = s.writes.at(-1);
      return w === undefined ? undefined : wireWrite(w);
    },
    notifications: () => s.log,
    drainNotifications: () => s.log.splice(0),
    classification: (phaseId) => s.classifications.get(phaseId),
    counters: () => s.counters,
  };
}
