/**
 * What is taken back: a scope snapshot's stated absence (INV-7, DERIVATIONS §4.12) and a finish the on-course stream contradicts
 * (INV-2d). Both retain an explicit `not-yet`, with its own sequence, in place of the value: never an omission.
 */
import { choose, newerContent, present, presentStatus, isMark, isNoResultMark } from './precedence.js';
import { finishOf } from './presentation.js';
import { fieldSlots, retain, slotOf } from './retention.js';
import { isInstant } from './registry.js';
import { refuse } from './counters.js';
import { timeOf, markOf } from './generations.js';
import { displaceOperator } from './writes.js';
import type { AttemptState, Contradicted, CoreState, Element, Row, Slot, Source } from './types.js';

export const FIRST_RUN_FIELDS = ['outcome', 'gates', 'faults', 'placement', 'underReview', 'qualified'] as const;
export const PAIR_FIELDS = ['pairTotal', 'countingRun'] as const;
export const SECOND_RUN_EMPTY_FIELDS = ['outcome', 'gates', 'faults'] as const;

const isResultSlot = (slot: Slot | undefined): boolean => slot !== undefined && slot.kind === 'row' && slot.marker !== true && slot.state !== 'not-yet';

/** Never an on-course inference, an Attempt never present in a results-table observation, or a row that was never present. */
export function hasResult(a: AttemptState, fields: readonly string[]): boolean {
  const status = presentStatus(a.slots.get('status'));
  if (isResultSlot(status) && status?.value !== 'not-started') return true;
  return fields.some((f) => isResultSlot(present(a.slots.get(f))));
}

const marker = (s: CoreState, el: Element, source: Source, seq: number, value: unknown): Slot => ({
  ...slotOf(s, el, source, 'row', value, seq), marker: true,
});

/** INV-7's guard: an XML retraction applies to a `tcp` observation only when the snapshot's content is later than it. */
const guardPasses = (candidate: Slot, tcp: Slot | undefined): boolean => tcp === undefined || tcp.marker === true || newerContent(candidate, tcp);

function retractStatus(s: CoreState, a: AttemptState, source: Source, el: Element, seq: number): boolean {
  const fs = a.slots.get('status');
  const shown = presentStatus(fs);
  if (fs === undefined || shown === undefined || shown.kind !== 'row' || !(isMark(shown.value) || shown.value === 'finished')) return false;
  const m = marker(s, el, source, seq, 'not-started');
  if (source === 'xml') {
    if (!guardPasses(m, fs.tcp)) {
      refuse(s, 'retraction-guard');
      return false;
    }
    delete fs.tcp;
  }
  fs[source] = m;
  // "what the on-course stream currently shows, else not-started"
  if (!a.listed) {
    delete fs.inference;
    delete a.gen.finish;
  }
  return true;
}

/** Retracts `fields` and any mark or row finish in `status`. Returns whether anything changed. */
export function retract(s: CoreState, a: AttemptState, source: Source, el: Element, fields: readonly string[], seq: number): boolean {
  let changed = retractStatus(s, a, source, el, seq);
  for (const f of fields) {
    const fs = a.slots.get(f);
    if (fs === undefined) continue;
    const row = choose(fs.tcp, fs.xml);
    if (row === undefined || row.marker === true) continue;
    const m = marker(s, el, source, seq, null);
    if (source === 'xml') {
      if (!guardPasses(m, fs.tcp)) {
        refuse(s, 'retraction-guard');
        continue;
      }
      delete fs.tcp;
    }
    fs[source] = m;
    delete fs.inference;
    displaceOperator(s, a, fs, f, el.observedAt);
    changed = true;
  }
  if (changed) {
    delete a.contradiction;
    delete a.withheld;
    a.pending = [];
    a.gen.restated.clear();
    s.counters.retractions++;
    s.dirtyAttempts.add(a);
  }
  return changed;
}

/** Whether a row carries a contradicted finish: by `dtFinish` where both have one, else by run time; a mark is no finish. */
export function carriesContradicted(a: AttemptState, row: Row): boolean {
  if (markOf(row) !== undefined) return false;
  const time = timeOf(row);
  const finish = row['finishTime'] as string | undefined;
  return a.held.some((c) => (finish !== undefined && c.finishTime !== null ? finish === c.finishTime : time !== undefined && time === c.runSeconds));
}

const CONTRADICTED_FIELDS = ['outcome', 'placement', 'pairTotal', 'countingRun'] as const;

/**
 * INV-2d: the stream lists the Attempt with the generation's start and no finish, after a finish was presented from a
 * results-table observation: a row's `duration` in `outcome`, from either source and whatever `status` shows; a mark is no finish.
 * Returns false when no such finish is presented.
 */
export function contradict(s: CoreState, a: AttemptState, el: Element, seq: number): boolean {
  const shown = presentStatus(a.slots.get('status'));
  const outcome = present(a.slots.get('outcome'));
  if (isNoResultMark(shown?.value) || outcome?.kind !== 'row') return false;
  const value = outcome.value as { kind?: string; runSeconds?: number } | undefined;
  if (value?.kind !== 'duration' || value.runSeconds === undefined) return false;
  const eventTime = finishOf(a, outcome);
  const record: Contradicted = { finishTime: isInstant(eventTime) ? eventTime : null, runSeconds: value.runSeconds };
  for (const f of CONTRADICTED_FIELDS) {
    const fs = a.slots.get(f);
    if (fs === undefined) continue;
    delete fs.xml;
    delete fs.inference;
    fs.tcp = marker(s, el, 'tcp', seq, null);
  }
  const st = fieldSlots(a.slots, 'status');
  delete st.xml;
  st.tcp = marker(s, el, 'tcp', seq, 'not-started');
  retain(st, 'inference', slotOf(s, el, 'tcp', 'inference', 'on-course', seq));
  delete a.gen.finish;
  a.gen.restated.clear();
  a.gen.recorded = false; // the athlete is on course with that start: the row described no finish of this run (§4.11)
  a.held.push(record);
  a.contradiction = record;
  s.counters.contradictions++;
  return true;
}
