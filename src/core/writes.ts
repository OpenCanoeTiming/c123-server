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
  const retainedCell = resumed ? retainedOf(el['retainedCell']) : fs.tcp?.state === 'known' ? { penalty: cellOf(fs.tcp.value, gate) } : null;
  // a resumed write keeps its stored generation; one the Attempt has passed is superseded, with no optimistic value (§6, §10 item 44 (c))
  const run = resumed && typeof el['run'] === 'number' ? el['run'] : a.gen.n;
  const superseded = run < a.gen.n;
  const slot = (value: unknown): Slot => slotOf(s, el, 'operator-write', 'operator', value, seq, {
    confidence: 'authoritative', provisional: !assertion, ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
  });
  if (assertion) {
    retain(fs, 'operator', slot(field === 'gates' ? overlay(s, a, el['value'] as Gate[]) : el['value']));
    s.dirtyAttempts.add(a);
    return;
  }
  const w = {
    // the caller names the write when it has an id of its own (a durable one, or a re-adopted one); the counter's is unique within one core only
    writeId: typeof el['writeId'] === 'string' ? el['writeId'] : `write-${seq}`,
    target: { phaseId: a.phaseId, bib: a.bib, run, field: 'gate-penalty' as const },
    requestedValue: el['value'], submittedAt: el.observedAt, status: superseded ? 'superseded' as const : 'pending' as const, attempt: a, fieldName: field,
    retainedCell,
  };
  s.writes.push(w);
  s.dirtyWrites.add(w);
  if (superseded) return;
  if (fs.operator?.provisional !== true) delete fs.operator; // an assertion gives way to a write awaiting its echo
  refreshOperator(s, a, fs, field, slot(el['value']));
  // a resumed write whose Attempt this lifetime first learned from a TCP row: that row is the first delivery after the restart, judged
  // against the retained value like any later one (DERIVATIONS §6 "After a restart")
  if (resumed && fs.tcp?.state === 'known') resolveEcho(s, a, fs, field, fs.tcp, undefined, true);
}

/** The pending writes of the Attempt's field, in the order sent. */
const pendingOf = (s: CoreState, a: AttemptState, field: string): WriteState[] =>
  s.writes.filter((x) => x.attempt === a && x.fieldName === field && x.status === 'pending');
const targetOf = (w: WriteState): Gate | undefined => (Array.isArray(w.requestedValue) ? (w.requestedValue as Gate[])[0] : undefined);

/**
 * CONTRACTS §4 INV-2 rule 4, DERIVATIONS §10 item 50: a whole `gates` vector, the one presented from rules 1-3 as it stands with every given
 * cell laid over it in order (a later one wins on its cell); where none is `known`, the course's gates with every cell `null`. With no course
 * bound, or a cell outside the base, the given cells stand alone.
 */
function overlay(s: CoreState, a: AttemptState, cells: Gate[]): Gate[] {
  const byGate = new Map<number, Gate>();
  for (const c of cells) byGate.set(c.number, c);
  const shown = presentGates(a, true);
  const slots = boundSlots(s, a.phaseId);
  const base = shown?.state === 'known' && Array.isArray(shown.value) ? (shown.value as Gate[]) : slots !== undefined ? gatesFromCells([], slots) : undefined;
  if (base === undefined || ![...byGate.keys()].every((n) => base.some((b) => b.number === n))) return [...byGate.values()];
  return base.map((b) => byGate.get(b.number) ?? { ...b });
}

/**
 * Rule 4's operator slot is derived (item 50): the vector below it with every pending write's cell laid over it. Recomputed at a submission,
 * a resolution and an observation of the vector below; gone when no write is pending. Its envelope moves only when the vector does:
 * `observedAt` is the element's (`by`) that last changed it.
 */
function refreshOperator(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, by: Slot): void {
  const op = fs.operator;
  if (op !== undefined && op.provisional !== true) return; // an assertion is not a pending write's
  const pending = pendingOf(s, a, field);
  if (pending.length === 0) {
    if (op !== undefined) {
      delete fs.operator;
      s.dirtyAttempts.add(a);
    }
    return;
  }
  const cells = pending.map(targetOf).filter((c): c is Gate => c !== undefined);
  const value = field === 'gates' ? overlay(s, a, cells) : pending.at(-1)!.requestedValue;
  if (op !== undefined && JSON.stringify(op.value) === JSON.stringify(value)) return;
  fs.operator = {
    ...(op ?? { source: 'operator-write', kind: 'operator', confidence: by.confidence, epoch: by.epoch, age: by.at }),
    state: 'known', value, provisional: true, observedAt: by.observedAt, at: by.at, seq: by.seq,
  } as Slot;
  s.dirtyAttempts.add(a);
}

const retainedOf = (v: unknown): WriteState['retainedCell'] =>
  typeof v === 'object' && v !== null && 'penalty' in v ? { penalty: (v as { penalty: Gate['penalty'] }).penalty } : null;

/** The target gate's cell of a `gates` value (DERIVATIONS §6); absent from the value, `null`. */
const cellOf = (value: unknown, gate: number | undefined): Gate['penalty'] =>
  Array.isArray(value) ? ((value as Gate[]).find((c) => c.number === gate)?.penalty ?? null) : null;

/** An `xml` observation is an echo only with content written after the write's submission (§6). */
const tooOld = (w: WriteState, slot: Slot): boolean => slot.source === 'xml' && (slot.age === null || slot.age <= Date.parse(w.submittedAt));

const resolve = (s: CoreState, w: WriteState, status: 'confirmed' | 'mismatched', slot: Slot): void => {
  w.status = status;
  w.confirmedValue = slot.value;
  w.confirmedAt = slot.observedAt;
  s.dirtyWrites.add(w);
};

/**
 * A results-table observation of a field an operator slot holds. A pending write's echo is its target cell: an observation that moves it
 * or states the requested penalty (rule 4, §6); a row in which only another cell moved re-delivers it and is no echo, and an `xml`
 * observation is one only with content written after the submission. Writes on different cells are judged independently; on one cell in
 * the order sent: the oldest is judged, and when it resolves the next is `confirmed` in the same step if the delivery states its requested
 * value, else its retained value becomes the delivered one (item 50). An assertion falls only to a value its source changed.
 */
export function resolveEcho(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, slot: Slot, prior: Slot | undefined, changed: boolean): void {
  const op = fs.operator;
  if (op === undefined) return;
  if (op.provisional !== true) {
    if (changed) delete fs.operator;
    return;
  }
  const byGate = new Map<number | undefined, WriteState[]>();
  for (const w of pendingOf(s, a, field)) {
    const n = targetOf(w)?.number;
    byGate.set(n, [...(byGate.get(n) ?? []), w]);
  }
  for (const [gate, queue] of byGate) {
    const head = queue[0]!;
    if (tooOld(head, slot)) continue;
    const cell = cellOf(slot.value, gate);
    const matches = cell === targetOf(head)?.penalty;
    // a re-delivery of the cell is no echo (§6, ADR-010's lost echo); a prior that is not `known` retains no cell, and a TCP source with
    // none in this lifetime compares with the value the write recorded as retained at submission, none retained making any delivery a change
    const before = prior?.state === 'known' ? cellOf(prior.value, gate) : slot.source === 'tcp' && head.retainedCell != null ? head.retainedCell.penalty : undefined;
    if (!matches && cell === before) continue;
    resolve(s, head, matches ? 'confirmed' : 'mismatched', slot);
    for (const next of queue.slice(1)) {
      if (!tooOld(next, slot) && cell === targetOf(next)?.penalty) {
        resolve(s, next, 'confirmed', slot);
        continue;
      }
      // the delivery that answered the earlier write is what the source retains now (stored with the record too)
      if (slot.source === 'tcp') next.retainedCell = { penalty: cell };
      break;
    }
  }
  refreshOperator(s, a, fs, field, slot);
}

/** The vector below a pending write moved (an on-course cell, say): the presented vector follows (item 50). */
export function followBase(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, by: Slot): void {
  if (fs.operator?.provisional === true) refreshOperator(s, a, fs, field, by);
}

/** CQ5: a retraction displaces the operator slot of a field it retracts; every pending write resolves with no value to confirm (rule 4). */
export function displaceOperator(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, observedAt: string): void {
  if (fs.operator === undefined) return;
  delete fs.operator;
  for (const w of pendingOf(s, a, field)) {
    w.status = 'mismatched';
    w.confirmedAt = observedAt;
    s.dirtyWrites.add(w);
  }
}

export const wireWrite = ({ attempt: _attempt, fieldName: _field, retainedCell: _retained, ...wire }: CoreState['writes'][number]): unknown => wire;
