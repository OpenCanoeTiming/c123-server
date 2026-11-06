/**
 * Per-source retention (INV-2, INV-2c, INV-5): the latest observation per source of each field. Refused candidates live
 * here too, with their content age; which of them is presented is `precedence.ts`'s question, never this module's.
 */
import type { AttemptState, CoreState, Element, FieldSlots, Slot, Source } from './types.js';

export const tick = (s: CoreState): number => ++s.counter;

export type Channel = keyof FieldSlots;

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

/**
 * INV-5: an identical re-delivery changes nothing retained, except that the content age only rises (round 18): a later
 * rewrite restating a refused candidate advances its age, and INV-2c then settles it. Returns whether the value changed.
 */
export function retain(fs: FieldSlots, channel: Channel, slot: Slot): boolean {
  const cur = fs[channel];
  if (cur !== undefined && same(cur, slot)) {
    if (slot.age !== null && (cur.age === null || slot.age > cur.age)) cur.age = slot.age;
    if (slot.judgingComplete !== undefined) cur.judgingComplete = slot.judgingComplete;
    return false;
  }
  fs[channel] = slot;
  return true;
}

/** The fields a new generation clears (CONTRACTS §2.6). */
export const RUN_SCOPED = [
  'status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified', 'courseOrder', 'timeToBeat',
] as const;

export function forgetRunScoped(a: AttemptState): void {
  for (const f of RUN_SCOPED) a.slots.delete(f);
  a.cells = {};
}
