/**
 * The presented Attempt: envelopes, `provisional`, the gate cell merge and the values built from others (CONTRACTS §1.2, §2.6;
 * DERIVATIONS §4.4, §4.6). Computed from retention alone; nothing here is stored.
 */
import { splitRaceId, r3 } from '../ingest/common.js';
import { isMark, present, presentStatus, choose } from './precedence.js';
import { fmtFor, isInstant } from './registry.js';
import type { AttemptState, CoreState, Gate, Slot } from './types.js';

const NOT_YET = { state: 'not-yet' } as const;

export function envelope(slot: Slot | undefined, provisional: boolean, eventTime?: string): unknown {
  if (slot === undefined || slot.state === 'not-yet') return NOT_YET;
  if (slot.state === 'unavailable') return { state: 'unavailable', reason: slot.reason };
  return {
    state: 'known', value: slot.value, observedAt: slot.observedAt, ...(isInstant(eventTime) ? { eventTime } : {}),
    source: slot.source, confidence: slot.confidence, provisional,
  };
}

/** INV-2 rule 1's exception: while the Attempt is listed each cell takes the newest judged value of either kind. */
function presentGates(a: AttemptState): Slot | undefined {
  const fs = a.slots.get('gates');
  const shown = present(fs);
  if (fs === undefined || shown === undefined || fs.operator !== undefined || shown.kind === 'inference' || shown.state !== 'known') return shown;
  const inf = fs.inference;
  if (!a.listed || inf?.state !== 'known') return shown;
  const onCourse = new Map((inf.value as Gate[]).map((g) => [g.number, g.penalty]));
  const newestIsOnCourse = inf.seq > shown.seq;
  const value = (shown.value as Gate[]).map((g) => {
    const stream = onCourse.get(g.number) ?? null;
    return { ...g, penalty: newestIsOnCourse ? (stream ?? g.penalty) : (g.penalty ?? stream) };
  });
  return { ...shown, value };
}

const judgedCells = (gates: Slot | undefined): boolean | undefined =>
  gates?.state === 'known' && Array.isArray(gates.value) && gates.value.length > 0
    ? (gates.value as Gate[]).every((g) => g.penalty !== null)
    : undefined;

const JUDGED: ReadonlySet<string> = new Set(['outcome', 'gates', 'faults', 'placement', 'pairTotal', 'countingRun']);

/** §1.2, §4.4. `status` is never provisional, and neither is what no judging can move. */
function isProvisional(a: AttemptState, field: string, slot: Slot, gates: Slot | undefined, closed: boolean): boolean {
  if (slot.kind === 'operator') return slot.provisional === true;
  if (slot.kind === 'inference') return JUDGED.has(field);
  if (!JUDGED.has(field)) return false;
  if (a.carried.has(field)) return true;
  if (closed) return false;
  const complete = judgedCells(gates) ?? slot.judgingComplete;
  return complete === false || complete === null;
}

function outcomeValue(s: CoreState, a: AttemptState, slot: Slot, gates: Slot | undefined): unknown {
  const o = slot.value as { kind?: string; runSeconds?: number } | undefined;
  // §4.4: a second run's penalty is the sum of the merged cells; the row's own Pen and Total describe the counting run
  if (slot.kind !== 'row' || slot.source !== 'tcp' || o?.kind !== 'duration' || fmtFor(s, a.phaseId).pair?.role !== 'second') return slot.value;
  if (gates?.state !== 'known' || o.runSeconds === undefined) return slot.value;
  const penaltySeconds = (gates.value as Gate[]).reduce((sum, g) => sum + (g.penalty ?? 0), 0);
  return { ...o, penaltySeconds, totalSeconds: r3(o.runSeconds + penaltySeconds) };
}

/** `eventTime` of a presented outcome: its own, else the finish with the same `Time`, whichever arrived first (§4.4). */
function finishOf(a: AttemptState, slot: Slot): string | undefined {
  if (slot.eventTime !== undefined) return slot.eventTime;
  const time = (slot.value as { kind?: string; runSeconds?: number } | undefined);
  if (time?.kind !== 'duration') return undefined;
  if (a.gen.finish?.runSeconds === time.runSeconds && a.gen.finish?.eventTime !== undefined) return a.gen.finish.eventTime;
  const xml = a.slots.get('outcome')?.xml;
  return (xml?.value as { runSeconds?: number } | undefined)?.runSeconds === time.runSeconds ? xml?.eventTime : undefined;
}

/** §4.5: run 1 unavailable once run 2 has been observed and neither path can supply it. */
function firstRunUnavailable(s: CoreState, phaseId: string | undefined, bib: string): unknown {
  if (phaseId === undefined || s.xmlRead) return undefined;
  const fmt = fmtFor(s, phaseId);
  if (fmt.pair?.role !== 'first') return undefined;
  const stated = s.phases.get(phaseId)?.plain.get('pair') as { siblingPhaseId?: string | null } | undefined;
  const { classKey, rest } = splitRaceId(phaseId);
  const sibling = stated?.siblingPhaseId ?? `${classKey}_${fmt.pair.siblings[0] ?? ''}_${rest}`;
  const second = s.attempts.get(`${sibling}:${bib}`);
  if (second === undefined || present(second.slots.get('outcome'))?.state !== 'known') return undefined;
  return { state: 'unavailable', reason: s.options.xmlConfigured === false ? 'not-configured' : 'source-unreachable' };
}

const PLAIN_ENVELOPED = ['startOrder', 'scheduledStart', 'heat', 'startLane', 'courseOrder', 'timeToBeat', 'underReview', 'qualified'] as const;

export function viewAttempt(s: CoreState, a: AttemptState): Record<string, unknown> {
  const fmt = fmtFor(s, a.phaseId);
  const statusSlot = presentStatus(a.slots.get('status'));
  const closed = a.gen.completed || a.left || isMark(statusSlot?.value);
  const gates = presentGates(a);
  const field = (name: string, slot: Slot | undefined = present(a.slots.get(name))): unknown =>
    envelope(slot, slot !== undefined && isProvisional(a, name, slot, gates, closed));

  const outcomeSlot = present(a.slots.get('outcome'));
  let outcome: unknown;
  if (outcomeSlot === undefined || outcomeSlot.state !== 'known') {
    outcome = (outcomeSlot === undefined ? firstRunUnavailable(s, a.phaseId, a.bib) : undefined) ?? field('outcome', outcomeSlot);
  } else {
    const value = outcomeValue(s, a, outcomeSlot, gates);
    outcome = envelope({ ...outcomeSlot, value }, isProvisional(a, 'outcome', outcomeSlot, gates, closed), finishOf(a, outcomeSlot));
  }

  const out: Record<string, unknown> = {
    attemptId: a.id, phaseId: a.phaseId, bib: a.bib,
    entry: envelope(present(a.slots.get('entry')), false),
    run: { state: 'known', value: a.gen.n, observedAt: a.gen.firstEnvelope.observedAt, source: a.gen.firstEnvelope.source, confidence: 'authoritative', provisional: false },
    status: envelope(statusSlot, false, statusSlot?.value === 'finished' ? (a.gen.finish?.eventTime ?? statusSlot.eventTime) : undefined),
    outcome,
    gates: fmt.cross ? { state: 'unavailable', reason: 'not-applicable' } : field('gates', gates),
    splits: field('splits'),
    faults: field('faults'),
    placement: field('placement'),
    pairTotal: field('pairTotal'),
    countingRun: field('countingRun'),
  };
  for (const f of PLAIN_ENVELOPED) out[f] = field(f);
  const armed = s.courses.get(String(s.phases.get(a.phaseId ?? '')?.fields.get('courseId')?.xml?.value))?.plain.get('splitsArmed');
  if (armed === false) out['splits'] = { state: 'unavailable', reason: 'not-applicable' };
  return out;
}

/** A never-observed Attempt: every field `not-yet`, or run 1 unavailable (§4.5). */
export function viewUnknownAttempt(s: CoreState, id: string): Record<string, unknown> {
  const cut = id.lastIndexOf(':');
  const fields = ['entry', 'run', 'startOrder', 'scheduledStart', 'heat', 'startLane', 'status', 'outcome', 'gates', 'splits', 'faults', 'courseOrder', 'timeToBeat', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified'];
  const out: Record<string, unknown> = { attemptId: id, phaseId: id.slice(0, cut), bib: id.slice(cut + 1) };
  for (const f of fields) out[f] = NOT_YET;
  out['outcome'] = firstRunUnavailable(s, id.slice(0, cut), id.slice(cut + 1)) ?? NOT_YET;
  return out;
}

/** Whether the two sources' values of a field are both settled (INV-2b). */
export function settled(a: AttemptState, slot: Slot | undefined): boolean {
  if (slot === undefined || a.gen.completed || a.left) return slot !== undefined;
  return slot.judgingComplete === undefined || slot.judgingComplete === true;
}

export { choose };
