/** Rule 4 and the echo (INV-2, CONTRACTS §2.9, DERIVATIONS §6). The write command itself is #212: here it enters as an element. */
import { fieldSlots, retain, slotOf } from './retention.js';
import type { AttemptState, CoreState, Element, FieldSlots, Gate, Slot, WriteState } from './types.js';

export function submitWrite(s: CoreState, a: AttemptState, el: Element, field: string, seq: number): void {
  const assertion = el['provisionalOverride'] === false;
  const fs = fieldSlots(a.slots, field);
  // the TCP source's retained target cell at submission (DERIVATIONS §6): a resumed write brings it from its stored record, absent there none
  const gate = Array.isArray(el['value']) ? (el['value'] as Gate[])[0]?.number : undefined;
  const retainedCell = 'retainedCell' in el ? retainedOf(el['retainedCell']) : fs.tcp === undefined ? null : { penalty: cellOf(fs.tcp.value, gate) };
  retain(fs, 'operator', slotOf(s, el, 'operator-write', 'operator', el['value'], seq, {
    confidence: 'authoritative', provisional: !assertion, ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
  }));
  s.dirtyAttempts.add(a);
  if (assertion) return;
  const w = {
    // the caller names the write when it has an id of its own (a durable one, or a re-adopted one); the counter's is unique within one core only
    writeId: typeof el['writeId'] === 'string' ? el['writeId'] : `write-${seq}`,
    target: { phaseId: a.phaseId, bib: a.bib, run: a.gen.n, field: 'gate-penalty' as const },
    requestedValue: el['value'], submittedAt: el.observedAt, status: 'pending' as const, attempt: a, fieldName: field,
    retainedCell,
  };
  s.writes.push(w);
  s.dirtyWrites.add(w);
}

const retainedOf = (v: unknown): WriteState['retainedCell'] =>
  typeof v === 'object' && v !== null && 'penalty' in v ? { penalty: (v as { penalty: Gate['penalty'] }).penalty } : null;

/** The target gate's cell of a `gates` value (DERIVATIONS §6); absent from the value, `null`. */
const cellOf = (value: unknown, gate: number | undefined): Gate['penalty'] =>
  Array.isArray(value) ? ((value as Gate[]).find((c) => c.number === gate)?.penalty ?? null) : null;

/**
 * A results-table observation of a field an operator slot holds. A pending write's echo is the target cell: an observation that
 * moves it or states the requested penalty (rule 4, §6); a row in which only another cell moved re-delivers it and is no echo, and
 * an `xml` observation is one only with content written after the submission. An assertion falls only to a value its source changed.
 */
export function resolveEcho(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, slot: Slot, prior: Slot | undefined, changed: boolean): void {
  const op = fs.operator;
  if (op === undefined) return;
  if (op.provisional !== true) {
    if (changed) delete fs.operator;
    return;
  }
  const w = s.writes.find((x) => x.attempt === a && x.fieldName === field && x.status === 'pending');
  if (w !== undefined && slot.source === 'xml' && (slot.age === null || slot.age <= Date.parse(w.submittedAt))) return;
  const requested = (op.value as Gate[])[0];
  const cell = cellOf(slot.value, requested?.number);
  const matches = cell === requested?.penalty;
  // a re-delivery of the cell is no echo (§6, ADR-010's lost echo); a TCP source with no slot yet in this lifetime compares with the
  // value the write recorded as retained at submission, none retained making any first delivery a change
  const before = prior !== undefined ? cellOf(prior.value, requested?.number) : slot.source === 'tcp' && w?.retainedCell != null ? w.retainedCell.penalty : undefined;
  if (!matches && cell === before) return;
  delete fs.operator;
  s.dirtyAttempts.add(a);
  if (w === undefined) return;
  w.status = matches ? 'confirmed' : 'mismatched';
  w.confirmedValue = slot.value;
  w.confirmedAt = slot.observedAt;
  s.dirtyWrites.add(w);
}

/** CQ5: a retraction displaces the operator slot of a field it retracts; a pending write resolves with no value to confirm (rule 4). */
export function displaceOperator(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, observedAt: string): void {
  if (fs.operator === undefined) return;
  delete fs.operator;
  const w = s.writes.find((x) => x.attempt === a && x.fieldName === field && x.status === 'pending');
  if (w === undefined) return;
  w.status = 'mismatched';
  w.confirmedAt = observedAt;
  s.dirtyWrites.add(w);
}

export const wireWrite = ({ attempt: _attempt, fieldName: _field, retainedCell: _retained, ...wire }: CoreState['writes'][number]): unknown => wire;
