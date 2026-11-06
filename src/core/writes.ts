/** Rule 4 and the echo (INV-2, CONTRACTS §2.9, DERIVATIONS §6). The write command itself is #212: here it enters as an element. */
import { fieldSlots, retain, slotOf } from './retention.js';
import type { AttemptState, CoreState, Element, FieldSlots, Slot } from './types.js';

export function submitWrite(s: CoreState, a: AttemptState, el: Element, field: string, seq: number): void {
  const assertion = el['provisionalOverride'] === false;
  retain(fieldSlots(a.slots, field), 'operator', slotOf(s, el, 'operator-write', 'operator', el['value'], seq, {
    confidence: 'authoritative', provisional: !assertion, ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
  }));
  s.dirtyAttempts.add(a);
  if (assertion) return;
  const w = {
    writeId: `write-${seq}`, target: { phaseId: a.phaseId ?? '', bib: a.bib, run: a.gen.n, field: 'gate-penalty' as const },
    requestedValue: el['value'], submittedAt: el.observedAt, status: 'pending' as const, attempt: a, fieldName: field,
  };
  s.writes.push(w);
  s.dirtyWrites.add(w);
}

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * A results-table observation of a field an operator slot holds. A pending write's echo is the very next observation, and a
 * re-delivery of what the source already held is not one unless it states the requested value (INV-5). An assertion falls only
 * to a value its source changed.
 */
export function resolveEcho(s: CoreState, a: AttemptState, fs: FieldSlots, field: string, slot: Slot, changed: boolean): void {
  const op = fs.operator;
  if (op === undefined) return;
  if (op.provisional !== true) {
    if (changed) delete fs.operator;
    return;
  }
  const matches = equal(slot.value, op.value);
  if (!changed && !matches) return;
  delete fs.operator;
  s.dirtyAttempts.add(a);
  const w = s.writes.find((x) => x.attempt === a && x.fieldName === field && x.status === 'pending');
  if (w === undefined) return;
  w.status = matches ? 'confirmed' : 'mismatched';
  w.confirmedValue = slot.value;
  w.confirmedAt = slot.observedAt;
  s.dirtyWrites.add(w);
}

export const wireWrite = ({ attempt: _attempt, fieldName: _field, ...wire }: CoreState['writes'][number]): unknown => wire;
