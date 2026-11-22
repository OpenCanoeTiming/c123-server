/** Rule 4 and the echo (INV-2, CONTRACTS §2.9, DERIVATIONS §6). The write command itself is #212: here it enters as an element. */
import { gatesFromCells } from '../ingest/common.js';
import { presentGates } from './presentation.js';
import { boundSlots } from './registry.js';
import { fieldSlots, retain, slotOf } from './retention.js';
import type { AttemptState, CoreState, Element, FieldSlots, Gate, Slot, WriteState } from './types.js';

export function submitWrite(s: CoreState, a: AttemptState, el: Element, field: string, seq: number): void {
  const assertion = el['provisionalOverride'] === false;
  const fs = fieldSlots(a.slots, field);
  const resumed = 'retainedCell' in el;
  // the TCP source's retained target cell at submission (DERIVATIONS §6): a resumed write brings it from its stored record, absent there none;
  // a slot that is not `known` retains no cell
  const gate = Array.isArray(el['value']) ? (el['value'] as Gate[])[0]?.number : undefined;
  const retainedCell = resumed
    ? retainedOf(el['retainedCell'])
    : fs.tcp?.state === 'known'
      ? { penalty: cellOf(fs.tcp.value, gate) }
      : null;
  // a resumed write keeps its stored generation; one the Attempt has passed is superseded, with no optimistic value (§6, §10 item 44 (c))
  const run = resumed && typeof el['run'] === 'number' ? el['run'] : a.gen.n;
  const superseded = run < a.gen.n;
  const slot = (value: unknown): Slot =>
    slotOf(s, el, 'operator-write', 'operator', value, seq, {
      confidence: 'authoritative',
      provisional: !assertion,
      ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
    });
  if (assertion) {
    // of two operator observations the later-ingested is presented (item 50 (f)); pending writes are still judged beneath it
    retain(fs, 'operator', slot((field === 'gates' ? overlay(s, a, el['value'] as Gate[]) : undefined) ?? el['value']));
    s.dirtyAttempts.add(a);
    return;
  }
  const w = {
    // the caller names the write when it has an id of its own (a durable one, or a re-adopted one); the counter's is unique within one core only
    writeId: typeof el['writeId'] === 'string' ? el['writeId'] : `write-${seq}`,
    target: { phaseId: a.phaseId, bib: a.bib, run, field: 'gate-penalty' as const },
    requestedValue: el['value'],
    submittedAt: el.observedAt,
    status: superseded ? ('superseded' as const) : ('pending' as const),
    attempt: a,
    fieldName: field,
    retainedCell,
  };
  s.writes.push(w);
  s.dirtyWrites.add(w);
  if (superseded) return;
  if (fs.operator?.provisional !== true) delete fs.operator; // the write is the later operator observation
  refreshOperator(s, a, fs, field, slot(el['value']));
  // a resumed write whose Attempt this lifetime first learned from a TCP row: that row is the first delivery after the restart, judged
  // against the retained values like any later one (DERIVATIONS §6 "After a restart"), once, after every write of the unit is in (item 50 (d))
  if (resumed) {
    s.resumed ??= new Map();
    s.resumed.set(a, (s.resumed.get(a) ?? new Set()).add(field));
  }
}

/**
 * The end of a unit (item 50): the first delivery of the resumed writes is judged, then every operator slot of a pending write follows the
 * vector below it as it stands (a binding, a listing or a leave moves it with no results-table observation of the field).
 */
export function settleWrites(s: CoreState, at: string): void {
  for (const [a, fields] of s.resumed ?? []) {
    for (const field of fields) {
      const fs = fieldSlots(a.slots, field);
      if (fs.tcp?.state === 'known') resolveEcho(s, a, fs, field, fs.tcp, undefined, false);
    }
  }
  s.resumed?.clear();
  const touched = new Map<AttemptState, Set<string>>();
  for (const w of s.writes) {
    if (s.attempts.get(w.attempt.id) !== w.attempt) continue; // a removed Attempt presents nothing more
    if (w.status === 'pending' || s.dirtyWrites.has(w))
      touched.set(w.attempt, (touched.get(w.attempt) ?? new Set()).add(w.fieldName));
  }
  const by = {
    observedAt: at,
    at: Date.parse(at),
    seq: s.counter,
    epoch: s.epoch,
    confidence: 'authoritative',
  } as Slot;
  for (const [a, fields] of touched)
    for (const field of fields) refreshOperator(s, a, fieldSlots(a.slots, field), field, by);
}

/** The pending writes of the Attempt's field, in the order sent. */
const pendingOf = (s: CoreState, a: AttemptState, field: string): WriteState[] =>
  s.writes.filter((x) => x.attempt === a && x.fieldName === field && x.status === 'pending');
const targetOf = (w: WriteState): Gate | undefined =>
  Array.isArray(w.requestedValue) ? (w.requestedValue as Gate[])[0] : undefined;

/**
 * CONTRACTS §4 INV-2 rule 4, DERIVATIONS §10 item 50: a whole `gates` vector, the one presented from rules 1-3 as it stands with every given
 * cell laid over it in order (a later one wins on its cell); where none is `known`, the bound course's gates with every cell `null`. With
 * neither there is no vector to lay a cell over, and a cell outside the base lays nothing (item 50 (e)): undefined where nothing is laid.
 */
function overlay(s: CoreState, a: AttemptState, cells: Gate[]): Gate[] | undefined {
  const shown = presentGates(a, true);
  const slots = boundSlots(s, a.phaseId);
  const base =
    shown?.state === 'known' && Array.isArray(shown.value)
      ? (shown.value as Gate[])
      : slots !== undefined
        ? gatesFromCells([], slots)
        : undefined;
  if (base === undefined) return undefined;
  const byGate = new Map<number, Gate>();
  for (const c of cells) if (base.some((b) => b.number === c.number)) byGate.set(c.number, c);
  if (byGate.size === 0) return undefined;
  return base.map((b) => byGate.get(b.number) ?? { ...b });
}

/**
 * Rule 4's operator slot is derived (item 50): the vector below it with every pending write's cell laid over it. Recomputed at a submission,
 * a resolution, an observation of the field and at the end of each unit; gone when nothing is laid over. Its envelope moves only when the
 * vector does: `observedAt` is the element's (`by`) that last changed it. An assertion presented over pending writes stays (item 50 (f)).
 */
function refreshOperator(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, by: Slot): void {
  const op = fs.operator;
  if (op !== undefined && op.provisional !== true) return;
  const pending = pendingOf(s, a, field);
  const cells = pending.map(targetOf).filter((c): c is Gate => c !== undefined);
  const value =
    pending.length === 0 ? undefined : field === 'gates' ? overlay(s, a, cells) : pending.at(-1)!.requestedValue;
  if (value === undefined) {
    if (op !== undefined) {
      delete fs.operator;
      s.dirtyAttempts.add(a);
    }
    return;
  }
  if (op !== undefined && JSON.stringify(op.value) === JSON.stringify(value)) return;
  fs.operator = {
    ...(op ?? { source: 'operator-write', kind: 'operator', confidence: by.confidence, epoch: by.epoch, age: by.at }),
    state: 'known',
    value,
    provisional: true,
    observedAt: by.observedAt,
    at: by.at,
    seq: by.seq,
  } as Slot;
  s.dirtyAttempts.add(a);
}

const retainedOf = (v: unknown): WriteState['retainedCell'] =>
  typeof v === 'object' && v !== null && 'penalty' in v
    ? { penalty: (v as { penalty: Gate['penalty'] }).penalty }
    : null;

/** The target gate's cell of a `gates` value (DERIVATIONS §6); absent from the value, `null`. */
const cellOf = (value: unknown, gate: number | undefined): Gate['penalty'] =>
  Array.isArray(value) ? ((value as Gate[]).find((c) => c.number === gate)?.penalty ?? null) : null;

/** An `xml` observation is an echo only with content written after the write's submission (§6). */
const tooOld = (w: WriteState, slot: Slot): boolean =>
  slot.source === 'xml' && (slot.age === null || slot.age <= Date.parse(w.submittedAt));

const resolve = (s: CoreState, w: WriteState, status: 'confirmed' | 'mismatched', slot: Slot): void => {
  w.status = status;
  w.confirmedValue = slot.value;
  w.confirmedAt = slot.observedAt;
  s.dirtyWrites.add(w);
};

/**
 * A results-table observation of a field. A pending write's echo is its target cell: an observation that moves it or states the requested
 * penalty (rule 4, §6); a row in which only another cell moved re-delivers it and is no echo, and an `xml` observation is one only with
 * content written after the submission. Writes on different cells are judged independently; on one cell in the order sent (DERIVATIONS §6,
 * item 50 (b)): (1) an echo for the oldest resolves it, and each next is `confirmed` while the delivery states its value too; (2) no echo for
 * the oldest but the value of a later one: the latest such is `confirmed` and every one before it resolves, `confirmed` where the delivery
 * states its value, else `mismatched`; (3) otherwise nothing. After a step that resolved one, the writes left on the cell retain the delivered
 * value. A pending write is judged whether or not its value is presented; an assertion falls only to a value its source changed.
 */
export function resolveEcho(
  s: CoreState,
  a: AttemptState,
  fs: FieldSlots,
  field: string,
  slot: Slot,
  prior: Slot | undefined,
  changed: boolean,
): void {
  const op = fs.operator;
  if (op !== undefined && op.provisional !== true && changed) delete fs.operator;
  const byGate = new Map<number | undefined, WriteState[]>();
  for (const w of pendingOf(s, a, field)) {
    const n = targetOf(w)?.number;
    byGate.set(n, [...(byGate.get(n) ?? []), w]);
  }
  for (const [gate, queue] of byGate) {
    const cell = cellOf(slot.value, gate);
    const states = (w: WriteState): boolean => !tooOld(w, slot) && cell === targetOf(w)?.penalty;
    const head = queue[0]!;
    // a re-delivery of the cell is no echo (§6, ADR-010's lost echo); a prior that is not `known` retains no cell, and a TCP source with
    // none in this lifetime compares with the value the write recorded as retained, none retained making any delivery a change
    const before =
      prior?.state === 'known'
        ? cellOf(prior.value, gate)
        : slot.source === 'tcp' && head.retainedCell != null
          ? head.retainedCell.penalty
          : undefined;
    // a value a resolution moved in is the earlier write's echo arriving again, from either source (item 50 (g))
    const again = head.retainedMoved === true && head.retainedCell !== null && cell === head.retainedCell.penalty;
    let left: WriteState[];
    if (!tooOld(head, slot) && (states(head) || (cell !== before && !again))) {
      resolve(s, head, states(head) ? 'confirmed' : 'mismatched', slot);
      let i = 1;
      while (i < queue.length && states(queue[i]!)) resolve(s, queue[i++]!, 'confirmed', slot);
      left = queue.slice(i);
    } else {
      let last = -1;
      queue.forEach((w, i) => {
        if (i > 0 && states(w)) last = i;
      });
      if (last < 0) continue;
      for (const w of queue.slice(0, last + 1)) resolve(s, w, states(w) ? 'confirmed' : 'mismatched', slot);
      left = queue.slice(last + 1);
    }
    // the delivery that answered the earlier writes is upstream's table as the later commands were sent over (stored with the records too),
    // whichever source delivered it (item 50 (g))
    for (const w of left) {
      w.retainedCell = { penalty: cell };
      w.retainedMoved = true;
    }
  }
  refreshOperator(s, a, fs, field, slot);
}

/** CQ5: a retraction displaces the operator slot of a field it retracts; every pending write resolves with no value to confirm (rule 4). */
export function displaceOperator(
  s: CoreState,
  a: AttemptState,
  fs: FieldSlots,
  field: string,
  observedAt: string,
): void {
  delete fs.operator;
  for (const w of pendingOf(s, a, field)) {
    w.status = 'mismatched';
    w.confirmedAt = observedAt;
    s.dirtyWrites.add(w);
  }
}

export const wireWrite = ({
  attempt: _attempt,
  fieldName: _field,
  retainedCell: _retained,
  retainedMoved: _moved,
  ...wire
}: CoreState['writes'][number]): unknown => wire;
