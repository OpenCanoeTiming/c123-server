/**
 * One result row into the per-source slots. A row is a snapshot's, or a single field's observation in a vector (`rowOfField`),
 * so there is one path; an absent key is an omission (INV-1), `null` an explicit "no such value".
 */
import { judgingComplete, gatesFromCells, faultsFromCells, type Cells } from '../ingest/common.js';
import { isStaleMark, attribute, keepAsHistory, markOf, pendingFor, recordsGeneration, timeOf } from './generations.js';
import { isMark, markRefusedByGuard, present, presentStatus, refusedByGuard } from './precedence.js';
import { boundSlots, fmtFor } from './registry.js';
import { refuse } from './counters.js';
import { carriesContradicted } from './retraction.js';
import { fieldSlots, retain, slotOf } from './retention.js';
import { resolveEcho } from './writes.js';
import type { AttemptState, CoreState, Element, Row, Slot, Source } from './types.js';

const IDENTITY = ['entry', 'startOrder', 'scheduledStart', 'heat', 'startLane'] as const;
const NOT_APPLICABLE = { state: 'unavailable', reason: 'not-applicable' } as const;
const NOT_CONFIGURED = { state: 'unavailable', reason: 'not-configured' } as const;
/** A second run's fields that come over from run 1 (§1.2). */
export const CARRIED = ['placement', 'pairTotal', 'countingRun'] as const;

/** Retains one row value and settles rule 4 against it. */
function put(s: CoreState, a: AttemptState, source: Source, el: Element, field: string, value: unknown, seq: number, extra: Partial<Slot> = {}): void {
  const fs = fieldSlots(a.slots, field);
  const view = field === 'status' ? presentStatus : present;
  const slot = slotOf(s, el, source, 'row', value, seq, extra);
  const prior = fs[source];
  const shown = view(fs);
  const changed = retain(fs, source, slot, view);
  if (changed || view(fs) !== shown || (fs.tcp !== undefined && fs.xml !== undefined)) s.dirtyAttempts.add(a); // INV-2b is compared at a re-delivery too
  if (fs.operator !== undefined) resolveEcho(s, a, fs, field, slot, prior, changed);
  if (source !== 'xml' || !changed) return;
  if (fs.tcp !== undefined && refusedByGuard(fs.tcp, slot)) refuse(s, 'content-age');
  else if (field === 'status' && isMark(slot.value) && presentStatus(fs)?.value !== slot.value) refuse(s, 'xml-mark');
}

/** §4.6: `not-configured` when nothing can bind; otherwise the Phase is waiting for its snapshot. */
function courseUnavailable(s: CoreState, phaseId: string): boolean {
  return s.options.xmlConfigured === false || s.phases.get(phaseId)?.fields.get('courseId')?.xml?.state === 'not-yet';
}

type Held = { cells: Cells; slot: Slot };

/** The retained cells as presented while the Attempt is listed: each cell the newest judged value of either kind (INV-2 rule 1's exception). */
function mergedCells(row: Held, inf: Held | undefined, listed: boolean): Cells {
  if (!listed || inf === undefined) return row.cells;
  const newestIsOnCourse = inf.slot.at > row.slot.at || (inf.slot.at === row.slot.at && inf.slot.seq > row.slot.seq);
  return row.cells.map((c, i) => {
    const stream = inf.cells[i] ?? null;
    return newestIsOnCourse ? (stream ?? c) : (c ?? stream);
  });
}

/** Whether a row's changed cells leave the presented merged cells as they are, read with the row in its place (round 29). */
function restatesMerged(a: AttemptState, held: Held, cells: Cells): boolean {
  const inf = a.cells.inference;
  if (!a.listed || inf === undefined) return false;
  return JSON.stringify(mergedCells(held, inf, true)) === JSON.stringify(mergedCells({ cells, slot: held.slot }, inf, true));
}

/** Cells with no course in the parser's `ctx`: gates or faults once a course is bound, else retained until one is (§0.5). */
export function putCells(s: CoreState, a: AttemptState, channel: 'tcp' | 'xml' | 'inference', cells: Cells, slot: Slot): void {
  const fmt = fmtFor(s, a.phaseId);
  const field = fmt.cross ? 'faults' : 'gates';
  const slots = boundSlots(s, a.phaseId);
  if (slots === undefined) {
    // §1.2, INV-5: an identical re-delivery moves nothing; the retained slot is the one of the last cell change. A row is identical
    // when it restates the presented merged cells, whatever its source's previous row said (round 29): the slot stays, its cells taken
    const held = a.cells[channel];
    const same = held !== undefined && held.slot.source === slot.source && held.slot.confidence === slot.confidence;
    if (!same || JSON.stringify(held.cells) !== JSON.stringify(cells)) {
      a.cells[channel] = same && channel !== 'inference' && restatesMerged(a, held, cells) ? { cells, slot: held.slot } : { cells, slot };
    }
    if (courseUnavailable(s, a.phaseId)) {
      if (retain(fieldSlots(a.slots, field), channel, { ...slot, state: 'unavailable', reason: NOT_CONFIGURED.reason })) s.dirtyAttempts.add(a);
    }
    return;
  }
  delete a.cells[channel];
  const value = fmt.cross ? (faultsFromCells(cells, slots) ?? null) : gatesFromCells(cells, slots);
  if (value === null) return;
  const bound: Slot = { ...slot, state: 'known', value, judgingComplete: judgingComplete(cells, slots) };
  delete bound.reason;
  const fs = fieldSlots(a.slots, field);
  const prior = fs[channel];
  const changed = retain(fs, channel, bound);
  if (changed) s.dirtyAttempts.add(a);
  // rule 4 at the binding too: held results-table cells that meet the course are the observation an operator slot waits for (§6)
  if (channel !== 'inference' && fs.operator !== undefined) resolveEcho(s, a, fs, field, bound, prior, changed);
}

/** "at a step that carries gate cells ... or at a scope snapshot of its race" (§4.6): retained cells meet the bound course. */
export function rebindCells(s: CoreState, a: AttemptState): void {
  for (const channel of ['tcp', 'xml', 'inference'] as const) {
    const held = a.cells[channel];
    if (held !== undefined) putCells(s, a, channel, held.cells, held.slot);
  }
}

/** The fields a row states whatever its result: never retracted (INV-7). */
export function putIdentity(s: CoreState, a: AttemptState, source: Source, el: Element, row: Row, seq: number): void {
  for (const f of IDENTITY) if (row[f] !== undefined) put(s, a, source, el, f, row[f], seq);
}

/** A row's lifecycle floor: an Attempt exists from its first row, not yet started. */
export function floorStatus(s: CoreState, a: AttemptState, source: Source, el: Element, seq: number): void {
  if (presentStatus(a.slots.get('status')) === undefined) put(s, a, source, el, 'status', 'not-started', seq);
}

/** §1.2: a run-2 row with no time and no mark restates run 1's values, and past the Attempt's first listing they stay carried, unless this run's row restated them. */
function keepCarried(s: CoreState, a: AttemptState, row: Row): void {
  if (!a.gen.started || fmtFor(s, a.phaseId).pair?.role !== 'second') return;
  for (const f of CARRIED) if (f in row && !a.gen.restated.has(f) && present(a.slots.get(f))?.state === 'known') a.carried.add(f);
}

/** The row fields a paired second-run row states with no time of its own: `placement` and `pairTotal` follow the row (INV-7). */
export function putStanding(s: CoreState, a: AttemptState, source: Source, el: Element, row: Row, seq: number): void {
  for (const f of ['placement', 'pairTotal', 'countingRun', 'underReview', 'qualified']) {
    if (f in row) put(s, a, source, el, f, row[f], seq);
  }
  keepCarried(s, a, row);
}

/** INV-5: a row's `finished` over a `finished` presented from its source becomes the status's basis (INV-7); the presented envelope does not move. */
function presentedFinish(a: AttemptState, source: Source): Partial<Slot> {
  const shown = presentStatus(a.slots.get('status'));
  if (shown?.value !== 'finished' || shown.source !== source) return {};
  return { observedAt: shown.observedAt, ...(shown.eventTime !== undefined ? { eventTime: shown.eventTime } : {}) };
}

function writeRow(s: CoreState, a: AttemptState, source: Source, el: Element, row: Row, stale: boolean, seq: number): void {
  const fmt = fmtFor(s, a.phaseId);
  const mark = stale ? undefined : markOf(row);
  const time = timeOf(row);
  const extra: Partial<Slot> = 'judgingComplete' in row ? { judgingComplete: row['judgingComplete'] as boolean | null } : {};
  const placed = row['placement'] !== null && row['placement'] !== undefined;
  if (recordsGeneration(a, mark, time)) a.gen.recorded = true;

  // §4.4 the untimed flag: read from the snapshot row, inherited by the Attempt's TCP rows
  if (row['untimed'] === true) {
    a.untimed = a.gen.finish === undefined;
    const tcp = a.slots.get('outcome')?.tcp;
    if (a.untimed && tcp?.state === 'known') put(s, a, 'tcp', { ingestSeq: 0, observedAt: tcp.observedAt }, 'outcome', NOT_APPLICABLE, tcp.seq);
  } else if (source === 'xml' && time !== undefined) a.untimed = false;

  let outcome: unknown = row['outcome'];
  if (a.untimed && outcome !== undefined) outcome = NOT_APPLICABLE;
  else if (outcome === undefined && fmt.heats && placed) outcome = { kind: 'ordinal', order: (row['placement'] as { order: number }).order };

  const ranOrPlaced = time !== undefined || (fmt.heats && placed) || row['status'] === 'finished' || a.untimed;
  const status = mark ?? (ranOrPlaced ? 'finished' : undefined);
  if (status !== undefined) put(s, a, source, el, 'status', status, seq, status === 'finished' ? presentedFinish(a, source) : {});
  // §2.6: rule 2's guard refuses the observation, not one field of it; the next snapshot that restates the row presents it
  if (source === 'xml' && mark !== undefined && markRefusedByGuard(fieldSlots(a.slots, 'status'))) {
    keepAsHistory(a, source, row);
    return;
  }
  if (outcome !== undefined) put(s, a, source, el, 'outcome', outcome, seq, { ...extra, ...(row['finishTime'] !== undefined ? { eventTime: row['finishTime'] as string } : {}) });
  if ('cells' in row) putCells(s, a, source, row['cells'] as Cells, slotOf(s, el, source, 'row', [], seq, extra));
  for (const f of ['gates', 'faults', 'splits']) if (row[f] !== undefined) put(s, a, source, el, f, row[f], seq, extra);
  for (const f of ['placement', 'pairTotal', 'countingRun']) if (f in row) put(s, a, source, el, f, row[f], seq, extra);
  for (const f of ['underReview', 'qualified']) if (row[f] !== undefined) put(s, a, source, el, f, row[f], seq, extra);
  if (time === undefined && mark === undefined) keepCarried(s, a, row);
  else {
    for (const f of CARRIED) {
      if (!(f in row)) continue;
      a.carried.delete(f);
      a.gen.restated.add(f);
    }
  }
}

/** The whole of one result row: contradiction, attribution, the stale mark, then the slots. */
export function applyRow(s: CoreState, a: AttemptState, source: Source, el: Element, row: Row, seq: number): void {
  putIdentity(s, a, source, el, row, seq);
  if (row['runClosed'] === true && !a.gen.completed) {
    a.gen.completed = true;
    s.dirtyAttempts.add(a);
  }
  if (carriesContradicted(a, row)) {
    keepAsHistory(a, source, row);
    refuse(s, 'contradicted-row');
    return;
  }
  const mark = markOf(row);
  if (a.contradiction !== undefined && (timeOf(row) !== undefined || mark !== undefined)) {
    delete a.contradiction;
    s.dirtyAttempts.add(a);
  }
  const stale = isStaleMark(a, mark);
  if ('status' in row || 'outcome' in row) {
    const withheld = a.withheld;
    if (stale && mark !== undefined) a.withheld = mark;
    else delete a.withheld;
    if (withheld !== a.withheld) s.dirtyAttempts.add(a);
  }
  const verdict = attribute(a, row);
  if (verdict === 'replaced') {
    keepAsHistory(a, source, row);
    refuse(s, 'replaced-run');
    return;
  }
  if (verdict === 'pending' && (mark === undefined || stale)) {
    a.pending.push({ row, source, observedAt: el.observedAt, seq, epoch: s.epoch, age: source === 'xml' ? (s.rewrite?.changedAfter ?? null) : Date.parse(el.observedAt) });
    return;
  }
  writeRow(s, a, source, el, row, stale, seq);
}

/** §4.11: the finish arrived; a row retained for it is attributed, its `observedAt` its own, and gains the finish as `eventTime`. */
export function settlePending(s: CoreState, a: AttemptState): void {
  const time = a.gen.finish?.runSeconds;
  if (time === undefined || a.pending.length === 0) return;
  const count = a.pending.length;
  const p = pendingFor(a, time);
  if (count > (p === undefined ? 0 : 1)) refuse(s, 'replaced-run');
  if (p === undefined) return;
  writeRow(s, a, p.source, { ingestSeq: 0, observedAt: p.observedAt }, p.row, isStaleMark(a, markOf(p.row)), p.seq);
}
