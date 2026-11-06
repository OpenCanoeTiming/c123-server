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

/** A generation increments on a new start, and on that alone. */
export function startGeneration(s: CoreState, a: AttemptState, el: Element, start: string | undefined, seq: number): void {
  const presented = presentStatus(a.slots.get('status'));
  if (isMark(presented?.value)) a.remembered = presented.value;
  else delete a.remembered;
  forgetRunScoped(a);
  a.gen = {
    n: a.gen.n + 1, needsAttribution: start !== undefined, completed: false, started: false, firstEnvelope: a.gen.firstEnvelope,
    ...(start !== undefined ? { start } : {}),
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
