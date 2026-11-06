/** Rule 4 and the echo (INV-2, CONTRACTS §2.9, DERIVATIONS §6). The write command itself is #212: here it enters as an element. */
import { fieldSlots, retain, slotOf } from './retention.js';
import type { AttemptState, CoreState, Element, FieldSlots, Gate, Slot } from './types.js';

export function submitWrite(s: CoreState, a: AttemptState, el: Element, field: string, seq: number): void {
  const assertion = el['provisionalOverride'] === false;
  retain(fieldSlots(a.slots, field), 'operator', slotOf(s, el, 'operator-write', 'operator', el['value'], seq, {
    confidence: 'authoritative', provisional: !assertion, ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
  }));
  s.dirtyAttempts.add(a);
  if (assertion) return;
  const w = {
    writeId: `write-${seq}`, target: { phaseId: a.phaseId, bib: a.bib, run: a.gen.n, field: 'gate-penalty' as const },
    requestedValue: el['value'], submittedAt: el.observedAt, status: 'pending' as const, attempt: a, fieldName: field,
  };
  s.writes.push(w);
  s.dirtyWrites.add(w);
}

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
  if (!matches && prior !== undefined && cell === cellOf(prior.value, requested?.number)) return;
  delete fs.operator;
  s.dirtyAttempts.add(a);
  if (w === undefined) return;
  w.status = matches ? 'confirmed' : 'mismatched';
  w.confirmedValue = slot.value;
  w.confirmedAt = slot.observedAt;
  s.dirtyWrites.add(w);
}

export const wireWrite = ({ attempt: _attempt, fieldName: _field, ...wire }: CoreState['writes'][number]): unknown => wire;
