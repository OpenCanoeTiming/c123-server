/**
 * Per-source retention (INV-2, INV-2c, INV-5): the latest observation per source of each field. Refused candidates live
 * here too, with their content age; which of them is presented is `precedence.ts`'s question, never this module's.
 */
import { present } from './precedence.js';
import type { AttemptState, CoreState, Element, FieldSlots, Slot, Source } from './types.js';

export const tick = (s: CoreState): number => ++s.counter;

export type Channel = 'tcp' | 'xml' | 'inference' | 'operator';
type View = (fs: FieldSlots) => Slot | undefined;

export function fieldSlots(map: Map<string, FieldSlots>, field: string): FieldSlots {
  let fs = map.get(field);
  if (fs === undefined) {
    fs = {};
    map.set(field, fs);
  }
  return fs;
}

/** A value's identity: envelope states carried on a row (`{state:'unavailable',reason}`) are states, `null` is `not-yet`. */
export function slotOf(
  s: CoreState, el: Element, source: Source | 'operator-write', kind: Slot['kind'], value: unknown, seq: number,
  extra: Partial<Slot> = {},
): Slot {
  const at = Date.parse(el.observedAt);
  const age = source === 'xml' ? (s.rewrite?.changedAfter ?? null) : at;
  const base = {
    source, kind, confidence: extra.confidence ?? 'authoritative', observedAt: el.observedAt, at, seq, epoch: s.epoch, age, ...extra,
  } as const;
  if (value === null || value === undefined) return { ...base, state: 'not-yet' };
  if (typeof value === 'object' && 'state' in value) {
    const st = (value as { state: unknown }).state;
    if (st === 'unavailable') return { ...base, state: 'unavailable', reason: String((value as { reason?: unknown }).reason) };
    if (st === 'not-yet') return { ...base, state: 'not-yet' };
  }
  return { ...base, state: 'known', value };
}

const same = (a: Slot, b: Slot): boolean =>
  a.state === b.state && a.reason === b.reason && a.eventTime === b.eventTime && a.marker === b.marker && JSON.stringify(a.value) === JSON.stringify(b.value);

const laterAge = (a: number | null, b: number | null): number | null => (b !== null && (a === null || b > a) ? b : a);

/**
 * INV-5 and rule 2. An observation re-delivered equal to what its source holds is one in its own right where that changes what is
 * presented: not presented from that source (the other source displaced it across an outage), it replaces the slot whole, `at` and
 * `observedAt` included. Presented, it is a no-op for the envelope and only renews the slot's continuity and sequence, `at` kept
 * (P9). The content age only rises (round 18): a later delivery restating a candidate advances it, and INV-2c then settles it.
 * An inference has a rival only under `view`, rule 2's `status` (`at` orders the gate cell merge, so a re-sent stream cell keeps its own).
 * Returns whether the source's value changed.
 */
export function retain(fs: FieldSlots, channel: Channel, slot: Slot, statusView?: View): boolean {
  const view = statusView ?? present;
  const cur = fs[channel];
  if (cur === undefined || !same(cur, slot)) {
    fs[channel] = slot;
    return true;
  }
  const age = laterAge(cur.age, slot.age);
  const other = channel === 'tcp' ? fs.xml : channel === 'xml' ? fs.tcp : statusView !== undefined ? fs.xml : undefined;
  if (other !== undefined && view(fs) === other) {
    fs[channel] = { ...slot, age };
    return false;
  }
  cur.seq = slot.seq;
  cur.epoch = slot.epoch;
  cur.age = age;
  if (slot.judgingComplete !== undefined) cur.judgingComplete = slot.judgingComplete;
  return false;
}

/** The fields a new generation clears (CONTRACTS §2.6). */
export const RUN_SCOPED = [
  'status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified', 'courseOrder', 'timeToBeat',
] as const;

export function forgetRunScoped(a: AttemptState): void {
  for (const f of RUN_SCOPED) a.slots.delete(f);
  a.cells = {};
  delete a.splitsUnarmed;
}
