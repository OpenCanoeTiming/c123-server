/**
 * The on-course stream: the list as upstream shows it, the leave rule, and what a listing says about the Attempt's lifecycle
 * (DERIVATIONS §4.1, §4.8, §4.11; INV-2d). Evaluated at every TCP message, never on a timer, so replay is deterministic.
 */
import { fieldSlots, retain, slotOf, tick } from './retention.js';
import { contradict } from './retraction.js';
import { marksHeld, startGeneration } from './generations.js';
import { isMark, present, presentStatus } from './precedence.js';
import { fmtFor, instant } from './registry.js';
import { CARRIED, settlePending } from './rows.js';
import type { AttemptState, CoreState, Element } from './types.js';

/** `onCourseLeaveAfterSeconds` (DERIVATIONS §4.1, round 20): one listing cycle above the longest recorded hiccup, 2.59 s. */
export const ON_COURSE_LEAVE_AFTER_SECONDS = 4;
const LEAVE_AFTER_MS = ON_COURSE_LEAVE_AFTER_SECONDS * 1000;

/**
 * THE leave rule, DERIVATIONS §4.1's one evaluation: at a TCP message arriving the constant or more after
 * the previous one nothing leaves and the Attempt counts from that message (the gap spans a stall, "while other TCP messages keep
 * arriving"); at every other message an Attempt not named for the constant has left.
 */
function hasStoppedListing(a: AttemptState, now: number, previousTcpAt: number | undefined): boolean {
  if (previousTcpAt === undefined) return false;
  if (now - previousTcpAt >= LEAVE_AFTER_MS) {
    a.lastListedAt = now;
    return false;
  }
  return now - a.lastListedAt >= LEAVE_AFTER_MS;
}

/** Any on-course observation lists its Attempt; a re-listing clears the leave flag. */
export function list(s: CoreState, a: AttemptState, el: Element): void {
  a.lastListedAt = Date.parse(el.observedAt);
  a.left = false;
  if (!a.listed) {
    a.listed = true;
    s.listed.set(a.id, a);
    s.dirtyAttempts.add(a);
  }
}

const setStream = (s: CoreState, a: AttemptState, el: Element, value: string, seq: number, eventTime?: string): void => {
  const slot = slotOf(s, el, 'tcp', 'inference', value, seq, eventTime !== undefined ? { eventTime } : {});
  const fs = fieldSlots(a.slots, 'status');
  const shown = presentStatus(fs);
  if (retain(fs, 'inference', slot, presentStatus) || presentStatus(fs) !== shown) s.dirtyAttempts.add(a);
};

export const streamStatus = (a: AttemptState): unknown => a.slots.get('status')?.inference?.value;

/** A status the stream states. Monotonic within a generation: going back takes a listing's evidence, not a bare `status`. */
export function observeStreamStatus(s: CoreState, a: AttemptState, el: Element, value: unknown, seq: number): void {
  const cur = streamStatus(a);
  if (value === 'finished') {
    const eventTime = instant(s, a.phaseId, el['eventTime'] as string | undefined, el.observedAt);
    a.gen.finish = { ...a.gen.finish, ...(eventTime !== undefined ? { eventTime } : {}) };
    setStream(s, a, el, 'finished', seq, eventTime);
    return;
  }
  if (cur === 'finished' || (cur === 'on-course' && value === 'at-start')) return;
  setStream(s, a, el, String(value), seq);
}

/** A `finished` or a mark the table presents: no listing displaces it (INV-2 rule 1). */
function tablePresentsResult(a: AttemptState): boolean {
  const shown = presentStatus(a.slots.get('status'));
  return shown?.kind === 'row' && (shown.value === 'finished' || isMark(shown.value));
}

/** §4.1: the stream's own finish, withdrawn by a listing without it. No diagnostic: INV-2d is for a finish the table presented. */
function withdrawFinish(s: CoreState, a: AttemptState): void {
  if (a.gen.finish === undefined && streamStatus(a) !== 'finished') return;
  delete a.gen.finish;
  delete fieldSlots(a.slots, 'outcome').inference;
  s.dirtyAttempts.add(a);
}

/**
 * §4.11: the first start is no change; a different start with no finish in a recorded generation is the re-run; every other
 * different start is a correction inside the generation. No results-table value, `run` or placement moves at a correction.
 */
function observeStart(s: CoreState, a: AttemptState, el: Element, start: string, listed: string, ended: boolean, seq: number): void {
  if (a.gen.start === undefined) a.gen.markAtStart = marksHeld(a);
  else if (listed === a.gen.startText) return;
  else if (!ended && a.gen.recorded) startGeneration(s, a, el, start, seq);
  else a.gen.correcting = true;
  a.gen.start = start;
  a.gen.startText = listed;
}

/** §1.2: the carry begins at the first listing of the generation, staged or started; a result of this run already restated the fields. */
function beginCarry(s: CoreState, a: AttemptState): void {
  if (a.gen.started) return;
  a.gen.started = true;
  if (fmtFor(s, a.phaseId).pair?.role === 'second' && !tablePresentsResult(a)) for (const f of CARRIED) if (present(a.slots.get(f))?.state === 'known') a.carried.add(f);
}

/** `{ dtStart, dtFinish }` of one listing: a new start, a finish, or the absence of one the row states. */
export function applyListing(s: CoreState, a: AttemptState, el: Element, value: { dtStart: string | null; dtFinish: string | null }, seq: number): void {
  const fmt = fmtFor(s, a.phaseId);
  const start = instant(s, a.phaseId, value.dtStart, el.observedAt);
  const finish = instant(s, a.phaseId, value.dtFinish, el.observedAt);
  a.gen.correcting = false;
  if (start !== undefined) observeStart(s, a, el, start, typeof el['listedStart'] === 'string' ? el['listedStart'] : start, finish !== undefined, seq);
  beginCarry(s, a);
  if (finish !== undefined) {
    if (a.contradiction !== undefined) {
      delete a.contradiction;
      s.dirtyAttempts.add(a);
    }
    a.gen.finish = { ...a.gen.finish, eventTime: finish };
    setStream(s, a, el, 'finished', seq, finish);
    return;
  }
  if (start === undefined) {
    // §4.1: `at-start` whatever preceded it (staging, a start deleted, a finish withdrawn); the recorded start stays
    if (fmt.heats || tablePresentsResult(a)) return;
    withdrawFinish(s, a);
    delete fieldSlots(a.slots, 'outcome').inference;
    setStream(s, a, el, 'at-start', seq);
    return;
  }
  if (!fmt.heats) {
    if (!a.gen.correcting && contradict(s, a, el, seq)) s.dirtyAttempts.add(a);
    else withdrawFinish(s, a);
  }
  setStream(s, a, el, 'on-course', seq);
}

/** An on-course outcome. A result row stops the recomputation by precedence; `Completed` and the leave stop it here (§4.3). */
export function observeStreamOutcome(s: CoreState, a: AttemptState, el: Element, value: { kind: string; runSeconds?: number }, seq: number): void {
  const finishing = value.kind === 'duration';
  const fs = fieldSlots(a.slots, 'outcome');
  if (!finishing && a.gen.finish !== undefined) return;
  if (finishing && a.gen.completed && !a.gen.correcting && fs.inference !== undefined) return; // §4.3: a correcting listing restates the time past the stops
  const eventTime = instant(s, a.phaseId, el['eventTime'] as string | undefined, el.observedAt);
  const extra = {
    confidence: el['confidence'] === 'inferred' ? ('inferred' as const) : ('authoritative' as const),
    ...(eventTime !== undefined ? { eventTime } : {}),
    ...('judgingComplete' in el ? { judgingComplete: el['judgingComplete'] as boolean | null } : {}),
  };
  if (retain(fs, 'inference', slotOf(s, el, 'tcp', 'inference', value, seq, extra))) s.dirtyAttempts.add(a);
  // §4.4: a `Y` on a listing with no finish closes nothing; a closure that flips `provisional` is pushed
  if (el['runClosed'] === true && (finishing || a.gen.finish?.eventTime !== undefined)) {
    a.gen.completed = true;
    s.dirtyAttempts.add(a);
  }
  if (!finishing) return;
  a.gen.finish = { ...a.gen.finish, runSeconds: value.runSeconds as number, ...(eventTime !== undefined ? { eventTime } : {}) };
  if (eventTime !== undefined && streamStatus(a) !== 'finished') setStream(s, a, el, 'finished', seq, eventTime);
  settlePending(s, a);
}

/** The Attempt left upstream's list: `left-without-finish`, or back to `not-started` if it never started. Slalom only (§4.1). */
export function leave(s: CoreState, a: AttemptState, el: Element): void {
  a.listed = false;
  a.left = true;
  s.listed.delete(a.id);
  s.counters.leaves++;
  s.dirtyAttempts.add(a);
  if (fmtFor(s, a.phaseId).cross) return;
  const cur = streamStatus(a);
  if (cur === 'finished' || a.gen.finish !== undefined) return;
  const seq = tick(s);
  if (cur === 'on-course' || a.gen.start !== undefined) {
    setStream(s, a, el, 'left-without-finish', seq);
    delete fieldSlots(a.slots, 'outcome').inference;
  } else if (cur === 'at-start') setStream(s, a, el, 'not-started', seq);
}

/** The rule's one evaluation, after a TCP unit is merged, so the unit's own listings count. Returns the leaves it derived, as `oncourse-left` elements. */
export function applyLeaveRule(s: CoreState, el: Element): Element[] {
  const now = Date.parse(el.observedAt);
  const previous = s.previousTcpAt;
  s.previousTcpAt = now;
  const derived: Element[] = [];
  for (const a of [...s.listed.values()]) {
    if (!hasStoppedListing(a, now, previous)) continue;
    leave(s, a, el);
    derived.push({ ingestSeq: 0, event: 'oncourse-left', attemptId: a.id, observedAt: el.observedAt });
  }
  return derived;
}

/** `oncourse.updated`'s body (§7.2): ordered by `courseOrder`, an Attempt without one last by `startOrder` (§4.8). */
export function oncourseView(s: CoreState): { attemptIds: string[]; featuredByUpstream: string | null; asOf: string | null } {
  const order = (a: AttemptState, f: string): number => {
    const v = present(a.slots.get(f))?.value;
    return typeof v === 'number' ? v : Number.MAX_SAFE_INTEGER;
  };
  const listed = [...s.listed.values()].sort(
    (a, b) => order(a, 'courseOrder') - order(b, 'courseOrder') || order(a, 'startOrder') - order(b, 'startOrder') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const named = (side: { attemptId: string } | null | undefined): string | undefined => (side !== null && side !== undefined && s.listed.has(side.attemptId) ? side.attemptId : undefined);
  return {
    attemptIds: listed.map((a) => a.id),
    featuredByUpstream: named(s.featured?.odd) ?? named(s.featured?.even) ?? null,
    asOf: s.oncourseAsOf,
  };
}
