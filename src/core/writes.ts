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
  if (!superseded) {
    retain(fs, 'operator', slotOf(s, el, 'operator-write', 'operator', field === 'gates' ? wholeVector(s, a, el['value']) : el['value'], seq, {
      confidence: 'authoritative', provisional: !assertion, ...(el['confidence'] === 'inferred' ? { confidence: 'inferred' as const } : {}),
    }));
    s.dirtyAttempts.add(a);
  }
  if (assertion) return;
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
  // a resumed write whose Attempt this lifetime first learned from a TCP row: that row is the first delivery after the restart, judged
  // against the retained value like any later one (DERIVATIONS §6 "After a restart")
  if (resumed && fs.tcp?.state === 'known') resolveEcho(s, a, fs, field, fs.tcp, undefined, true);
}

/**
 * CONTRACTS §4 INV-2 rule 4: a write presents a whole `gates` vector, the one presented from rules 1-3 with the target cell replaced; where
 * none is `known`, the course's gates with every cell `null`. With no course bound the requested cells stand alone.
 */
function wholeVector(s: CoreState, a: AttemptState, requested: unknown): unknown {
  if (!Array.isArray(requested)) return requested;
  const shown = presentGates(a, true);
  const slots = boundSlots(s, a.phaseId);
  const base = shown?.state === 'known' && Array.isArray(shown.value) ? (shown.value as Gate[]) : slots !== undefined ? gatesFromCells([], slots) : undefined;
  const cells = requested as Gate[];
  if (base === undefined || !cells.every((c) => base.some((b) => b.number === c.number))) return requested;
  return base.map((b) => cells.find((c) => c.number === b.number) ?? { ...b });
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
  // the target cell is the requested one; the slot presents the whole vector (rule 4)
  const requested = ((w?.requestedValue ?? op.value) as Gate[])[0];
  const cell = cellOf(slot.value, requested?.number);
  const matches = cell === requested?.penalty;
  // a re-delivery of the cell is no echo (§6, ADR-010's lost echo); a TCP source with no slot yet in this lifetime compares with the
  // value the write recorded as retained at submission, none retained making any first delivery a change
  // a prior that is not `known` retains no cell (§6, §10 item 44 (d)): no prior
  const before = prior?.state === 'known' ? cellOf(prior.value, requested?.number) : slot.source === 'tcp' && w?.retainedCell != null ? w.retainedCell.penalty : undefined;
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
