/**
 * What is taken back: a scope snapshot's stated absence (INV-7, DERIVATIONS §4.12) and a finish the on-course stream contradicts
 * (INV-2d). Both retain an explicit `not-yet`, with its own sequence, in place of the value: never an omission. An absent XML row
 * admitted for the whole Attempt removes it instead (ADR-015 Revisions 6, 7).
 */
import { choose, newerContent, present, presentStatus, isMark, isNoResultMark } from './precedence.js';
import { finishOf } from './presentation.js';
import { fieldSlots, retain, slotOf } from './retention.js';
import { fmtFor, isInstant, isXmlOnly, siblingAttempt } from './registry.js';
import { refuse } from './counters.js';
import { timeOf, markOf } from './generations.js';
import { displaceOperator } from './writes.js';
import type { AttemptState, Contradicted, CoreState, Element, ResourceState, Row, Slot, Source } from './types.js';

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
const guardPasses = (age: number | null, tcp: Slot | undefined): boolean => tcp === undefined || tcp.marker === true || newerContent({ age } as Slot, tcp);

/** Whether a retraction of `status` would take a mark or a row finish away. */
const statusRetractable = (a: AttemptState): boolean => {
  const shown = presentStatus(a.slots.get('status'));
  return shown !== undefined && shown.kind === 'row' && (isMark(shown.value) || shown.value === 'finished');
};

function retractStatus(s: CoreState, a: AttemptState, source: Source, el: Element, seq: number): boolean {
  const fs = a.slots.get('status');
  if (fs === undefined || !statusRetractable(a)) return false;
  const m = marker(s, el, source, seq, 'not-started');
  if (source === 'xml') {
    // the refused branch (DERIVATIONS §10 item 41 (b)): moves nothing of the field, its `xml` slot included
    if (!guardPasses(m.age, fs.tcp)) {
      refuse(s, 'retraction-guard');
      return false;
    }
    delete fs.tcp;
  }
  fs[source] = m;
  // "what the on-course stream currently shows, else not-started": after a leave, the leave's own inference (§4.12); a Cross
  // heat's leave changes nothing, so its stream still shows `on-course` (§4.2)
  const leaveDrew = fs.inference?.value === 'left-without-finish' || fs.inference?.value === 'not-started';
  if (!a.listed && !leaveDrew && !fmtFor(s, a.phaseId).heats) {
    delete fs.inference;
    delete a.gen.finish;
  }
  if (!a.listed && a.gen.leftBehind !== undefined) {
    fs.inference = a.gen.leftBehind;
    delete a.gen.leftBehind;
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
    // an xml-only field (INV-2 rule 3) is never a tcp observation: its not-yet is the xml source's own, so the XML's next row presents
    const side: Source = isXmlOnly(f) ? 'xml' : source;
    const m = marker(s, el, side, seq, null);
    if (source === 'xml') {
      // the refused branch (DERIVATIONS §10 item 41 (b)): moves nothing of the field, its `xml` slot included
      if (!guardPasses(m.age, fs.tcp)) {
        refuse(s, 'retraction-guard');
        continue;
      }
      delete fs.tcp;
    }
    fs[side] = m;
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

/**
 * INV-7's absent row: no row of a table that carries other rows carries the Attempt's bib. The one decision for such an Attempt:
 * an XML snapshot admitted for it removes it (ADR-015 Revisions 6, 7); otherwise it retracts as the TCP absent-row case, from an
 * XML snapshot field by field under the guard (DERIVATIONS §4.12).
 */
export function absentRow(s: CoreState, a: AttemptState, source: Source, el: Element, fields: readonly string[], seq: number): void {
  if (source === 'xml' && admitted(s, a)) remove(s, a, el);
  else if (hasResult(a, fields)) retract(s, a, source, el, fields, seq);
}

/**
 * The guard over the whole Attempt (§4.12, §10 item 38 (b), (c)): a results-table row of its race named it, `changedAfter` is later
 * than every `tcp` observation of it, a listing included (`null` never qualifies), and it is not in the on-course set.
 */
function admitted(s: CoreState, a: AttemptState): boolean {
  const age = s.rewrite?.changedAfter ?? null;
  return a.rowNamed && !a.listed && age !== null && age > (a.tcpAt ?? -Infinity);
}

/**
 * The removal, in the unit (ADR-015 Revision 6 rule 4): a pending write resolves `mismatched` without `confirmedValue`, the Attempt
 * leaves every read and the Standings of its Phase, and the flush sends its one `attempt.deleted`. The Entry stays; a returning row
 * creates a new Attempt, none of this one's result state carried (§10 item 38 (h), (i)).
 */
function remove(s: CoreState, a: AttemptState, el: Element): void {
  for (const w of s.writes) {
    if (w.attempt !== a || w.status !== 'pending') continue;
    w.status = 'mismatched';
    w.confirmedAt = el.observedAt;
    s.dirtyWrites.add(w);
  }
  s.attempts.delete(a.id);
  s.phases.get(a.phaseId)?.attempts?.delete(a);
  s.dirtyAttempts.delete(a);
  s.dirtyScopes.add(a.phaseId);
  // §4.5: a first run's `outcome` reads its second run's result
  const first = fmtFor(s, a.phaseId).pair?.role === 'second' ? siblingAttempt(s, a.phaseId, a.bib) : undefined;
  if (first !== undefined) s.dirtyAttempts.add(first);
  for (const [k, d] of s.parserDiagnostics) {
    if (!('attemptId' in d) || d.attemptId !== a.id) continue;
    s.parserDiagnostics.delete(k);
    s.diagnosticsDirty = true;
  }
  s.removed.push(a);
}

/** Whether an absent XML row would retract anything of the Attempt now: a `tcp` result only past the guard (§4.12). */
function wouldRetract(s: CoreState, a: AttemptState, fields: readonly string[]): boolean {
  if (!hasResult(a, fields)) return false;
  const age = s.rewrite?.changedAfter ?? null;
  if (statusRetractable(a) && guardPasses(age, a.slots.get('status')?.tcp)) return true;
  return fields.some((f) => {
    const fs = a.slots.get(f);
    const row = fs === undefined ? undefined : choose(fs.tcp, fs.xml);
    return isResultSlot(row) && guardPasses(age, fs?.tcp);
  });
}

/**
 * An XML table with no rows retracts nothing (INV-7). Where the race holds a result an absent row would retract, it raises the
 * ingest-only `xml-table-emptied` once per emptying: never for a table that has not carried a row since (§4.12).
 */
export function emptied(s: CoreState, phase: ResourceState, fields: readonly string[]): void {
  if (phase.xmlTable !== 'rows') return;
  const count = [...(phase.attempts ?? [])].filter((a) => wouldRetract(s, a, fields)).length;
  if (count === 0) return;
  phase.xmlTable = 'emptied';
  s.ingestLog.push({ kind: 'xml-table-emptied', phaseId: phase.id, count });
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
    delete fs.tcp;
    delete fs.inference;
    // an xml-only field (INV-2 rule 3) is never a tcp observation: its not-yet is the xml source's own latest observation
    const source: Source = isXmlOnly(f) ? 'xml' : 'tcp';
    fs[source] = marker(s, el, source, seq, null);
  }
  const st = fieldSlots(a.slots, 'status');
  delete st.xml;
  st.tcp = marker(s, el, 'tcp', seq, 'not-started');
  retain(st, 'inference', slotOf(s, el, 'tcp', 'inference', 'on-course', seq));
  delete a.gen.finish;
  a.gen.restated.clear();
  a.gen.completed = false; // §10 item 51: the closure goes with the contradicted finish
  a.gen.recorded = false; // the athlete is on course with that start: the row described no finish of this run (§4.11)
  a.held.push(record);
  a.contradiction = record;
  s.counters.contradictions++;
  return true;
}
