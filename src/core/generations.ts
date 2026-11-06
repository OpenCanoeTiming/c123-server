/**
 * Run generations and attribution (ADR-013, ADR-017 D1, DERIVATIONS §4.11, §4.12): what makes a new generation, whether a row
 * belongs to the current one, and the stale mark, which applies before attribution, not only after it.
 */
import { presentStatus, isMark } from './precedence.js';
import { RUN_SCOPED, fieldSlots, forgetRunScoped, retain, slotOf } from './retention.js';
import type { AttemptState, CoreState, Element, ResultMark, Row, Source } from './types.js';

/** The run time a row carries, if any: a marked row may keep one. */
export const timeOf = (row: Row): number | undefined => {
  const o = row['outcome'] as { kind?: unknown; runSeconds?: number } | undefined;
  return o?.kind === 'duration' ? o.runSeconds : undefined;
};
const finishOf = (row: Row): string | undefined => row['finishTime'] as string | undefined;
export const markOf = (row: Row): ResultMark | undefined => (isMark(row['status']) ? row['status'] : undefined);

/** The marks standing on the table as either source holds it. */
export function marksHeld(a: AttemptState): ResultMark[] {
  const fs = a.slots.get('status');
  return [fs?.tcp?.value, fs?.xml?.value].filter(isMark);
}

/**
 * DERIVATIONS §4.11 "Recorded": a row with a time or a mark, attributed after the recorded start, that states something the table
 * did not already hold on either source. A mark standing at the start records nothing however it arrives afterwards; `*` is no mark.
 */
export function recordsGeneration(a: AttemptState, mark: ResultMark | undefined, time: number | undefined): boolean {
  if (a.gen.start === undefined) return false;
  if (mark !== undefined && !a.gen.markAtStart.includes(mark) && !marksHeld(a).includes(mark)) return true;
  if (time === undefined) return false;
  const outcome = a.slots.get('outcome');
  return ![outcome?.tcp, outcome?.xml].some((slot) => (slot?.value as { runSeconds?: number } | undefined)?.runSeconds === time);
}

/** A generation increments on a new start at a listing with no finish, in a recorded generation, and on that alone (§4.11). */
export function startGeneration(s: CoreState, a: AttemptState, el: Element, start: string | undefined, seq: number): void {
  const presented = presentStatus(a.slots.get('status'));
  if (isMark(presented?.value)) a.remembered = presented.value;
  else delete a.remembered;
  const markAtStart = start !== undefined ? marksHeld(a) : [];
  forgetRunScoped(a);
  a.gen = {
    n: a.gen.n + 1, recorded: false, markAtStart, correcting: false, needsAttribution: start !== undefined, completed: false, started: false, restated: new Set(),
    firstEnvelope: { observedAt: el.observedAt, source: 'tcp' },
    ...(start !== undefined ? { start, startText: start } : {}),
  };
  a.held = [];
  a.pending = [];
  a.carried.clear();
  a.left = false;
  delete a.contradiction;
  delete a.withheld;
  a.force = new Set(RUN_SCOPED);
  retain(fieldSlots(a.slots, 'status'), 'inference', slotOf(s, el, 'tcp', 'inference', 'on-course', seq));
  for (const w of s.writes) {
    if (w.attempt === a && w.status === 'pending') {
      w.status = 'superseded';
      s.dirtyWrites.add(w);
    }
  }
  s.counters.generations++;
}

export type Attribution = 'present' | 'pending' | 'replaced';

/**
 * Whose run a row describes. Generation 1 and a generation with no observed start raise no question. An XML row answers by
 * its `dtFinish`; a row with a time and no finish waits for this generation's finish; a row with no time cannot be attributed.
 */
export function attribute(a: AttemptState, row: Row): Attribution {
  if (!a.gen.needsAttribution) return 'present';
  const finish = finishOf(row);
  if (finish !== undefined) return a.gen.start !== undefined && Date.parse(finish) < Date.parse(a.gen.start) ? 'replaced' : 'present';
  if (timeOf(row) === undefined) return 'present';
  return a.gen.finish !== undefined ? 'present' : 'pending';
}

/** §4.12: a mark equal to the one carried over the generation change is not presented. */
export const isStaleMark = (a: AttemptState, mark: ResultMark | undefined): boolean => mark !== undefined && mark === a.remembered;

/** The row of a finish that arrived after it: the one with the finish's `Time`; any other describes the replaced run. */
export function pendingFor(a: AttemptState, runSeconds: number): AttemptState['pending'][number] | undefined {
  const found = a.pending.filter((p) => timeOf(p.row) === runSeconds).at(-1);
  a.pending = [];
  return found;
}

export const keepAsHistory = (a: AttemptState, source: Source, row: Row): void => {
  a.history[source] = row;
};
