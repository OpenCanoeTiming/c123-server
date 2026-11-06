import { describe, it, expect } from 'vitest';
import { ON_COURSE_LEAVE_AFTER_SECONDS } from '../oncourse.js';
import { connected, coreWith, tcpUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

// #204 test-plan rows 3 and 7. DERIVATIONS §4.1 "The on-course list" (round 20): an Attempt has left when no on-course message names it for
// `onCourseLeaveAfterSeconds` (4 s, "or more") of ingest time while other TCP messages keep arriving; "Stated as one evaluation": at a TCP
// message arriving the constant or more after the previous TCP message nothing leaves and every listed Attempt counts from that message, at
// every other TCP message an Attempt not named for the constant has left. A false leave clears on re-listing within the generation, `status`
// returns per CONTRACTS §3.2, `provisional` is recomputed. Hand streams in the shape of the recorded messages (text.ts); no real clock.

const RACE = 'K1M_BR1_19';
const DAY = { [RACE]: '2026-09-19' };
const T0 = '2026-09-19T10:00:00.000Z';
const X = `${RACE}:51`;
const Y = `${RACE}:44`;
const LEAVE_MS = 4000;

type Core = ReturnType<typeof coreWith>;
const x = (ms: number, over: Record<string, unknown> = {}): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 2, pos: 2, ...over })), DAY);
const y = (ms: number, over: Record<string, unknown> = {}): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 44, total: 2, pos: 1, ...over })), DAY);
const inSet = (c: Core, a: string): boolean => c.oncourse().attemptIds.map(String).includes(a);
const statusOf = (c: Core, a: string): unknown => (c.presented(a)['status'] as { value?: unknown }).value;
/** X listed once at 0 with Y beside it, then only Y: one listing a second, then one at `lastMs`. */
const xThenY = (lastMs: number): Core =>
  coreWith([connected(T0), y(0), x(0), ...[1000, 2000, 3000].filter((t) => t < lastMs).map((t) => y(t)), y(lastMs)]);

describe('the constant (#204 row 3; DERIVATIONS §4.1 round 20, §10 item 16)', () => {
  it('ON_COURSE_LEAVE_AFTER_SECONDS is the ruled 4 s (maintainer, round 20)', () => {
    expect(ON_COURSE_LEAVE_AFTER_SECONDS).toBe(4);
    expect(LEAVE_MS).toBe(ON_COURSE_LEAVE_AFTER_SECONDS * 1000);
  });

  it('one tick under the constant (3.999 s since X was named, other messages every second): X is still on the set, status at-start', () => {
    const c = xThenY(LEAVE_MS - 1);
    expect(inSet(c, X)).toBe(true);
    expect(statusOf(c, X)).toBe('at-start');
  });

  it('at the constant (4.000 s, "or more"): X has left; unstaged before any start it returns to not-started (CONTRACTS §3.2)', () => {
    const c = xThenY(LEAVE_MS);
    expect(inSet(c, X)).toBe(false);
    expect(inSet(c, Y)).toBe(true);
    expect(statusOf(c, X)).toBe('not-started');
  });

  it('the stall exemption at the constant: a message arriving 4.000 s after the previous TCP message ends a silence, nothing leaves and X counts from it', () => {
    const c = coreWith([connected(T0), y(0), x(0), y(LEAVE_MS)]);
    expect(inSet(c, X)).toBe(true);
    expect(statusOf(c, X)).toBe('at-start');
  });

  it('after a silence every listed Attempt counts from the message that ended it: X survives 3.999 s more of other messages and leaves at 4.000 s', () => {
    const base = [connected(T0), y(0), x(0), y(LEAVE_MS), y(5000), y(6000), y(7000)];
    expect(inSet(coreWith([...base, y(LEAVE_MS + LEAVE_MS - 1)]), X)).toBe(true);
    expect(inSet(coreWith([...base, y(LEAVE_MS + LEAVE_MS)]), X)).toBe(false);
  });

  it('a message that is not an OnCourse listing (a TimeOfDay) is another TCP message too: it ends a silence and counts for the gap', () => {
    const tod = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><TimeOfDay>12:00:0${Math.floor(ms / 1000)}</TimeOfDay></Canoe123>`), DAY);
    const c = coreWith([connected(T0), y(0), x(0), tod(1000), tod(2000), tod(3000), tod(LEAVE_MS)]);
    expect(inSet(c, X)).toBe(false); // X was not named for 4.000 s while TimeOfDay kept arriving every second
    expect(inSet(c, Y)).toBe(false); // so was Y: only X and Y exist and neither was named
  });
});

describe('a false leave clears on re-listing within the generation (#204 row 7; DERIVATIONS §4.1 "A false leave is not harmless"; CONTRACTS §3.2)', () => {
  const START = '12:00:00.000';
  const FINISH = '12:01:22.360';

  it('at-start, leave, re-listing: not-started then at-start again, in the set, run unchanged', () => {
    const c = coreWith([connected(T0), y(0), x(0)]);
    const run = (c.presented(X)['run'] as { value: unknown }).value;
    for (const t of [1000, 2000, 3000, 4000]) c.applyUnit(y(t));
    expect(statusOf(c, X)).toBe('not-started');
    expect(inSet(c, X)).toBe(false);
    c.applyUnit(x(4500));
    expect(statusOf(c, X)).toBe('at-start');
    expect(inSet(c, X)).toBe(true);
    expect((c.presented(X)['run'] as { value: unknown }).value).toBe(run);
  });

  it('on-course (a start, no finish), leave, re-listing: left-without-finish then on-course again, the leave flag gone (CONTRACTS §3.2 left-without-finish -> on-course)', () => {
    const c = coreWith([connected(T0), y(0), x(0, { dtStart: START })]);
    expect(statusOf(c, X)).toBe('on-course');
    for (const t of [1000, 2000, 3000, 4000]) c.applyUnit(y(t));
    expect(statusOf(c, X)).toBe('left-without-finish');
    expect(inSet(c, X)).toBe(false);
    c.applyUnit(x(4500, { dtStart: START }));
    expect(statusOf(c, X)).toBe('on-course');
    expect(inSet(c, X)).toBe(true);
    expect((c.presented(X)['run'] as { value: unknown }).value).toBe(1);
  });

  it('a finisher with a result row holding a blank cell: the leave closes the run (provisional false), the re-listing recomputes it (true again), status finished throughout', () => {
    const row = {
      ingestSeq: 0,
      observedAt: plus(T0, 1500),
      snapshot: {
        source: 'tcp',
        phaseId: RACE,
        mode: 'results',
        rows: [{ bib: '51', outcome: { kind: 'duration', runSeconds: 82.36, penaltySeconds: 2, totalSeconds: 84.36 }, gates: [{ number: 3, penalty: null }, { number: 4, penalty: 2 }], placement: { rank: 4, order: 4 }, judgingComplete: false }],
      },
    };
    const fin = { dtStart: START, dtFinish: FINISH, time: '82.36' };
    const c = coreWith([connected(T0), y(0), x(0, { dtStart: START }), y(500), x(1000, fin), [row as never]]);
    const prov = (f: string): unknown => (c.presented(X)[f] as { provisional?: unknown }).provisional;
    expect(statusOf(c, X)).toBe('finished');
    expect(prov('gates')).toBe(true);
    expect(prov('outcome')).toBe(true);
    for (const t of [2000, 3000, 4000, 5000]) c.applyUnit(y(t));
    expect(inSet(c, X)).toBe(false);
    expect(prov('gates')).toBe(false); // D4: a leave closes the run (DERIVATIONS §4.4)
    expect(statusOf(c, X)).toBe('finished');
    c.applyUnit(x(5500, fin));
    expect(inSet(c, X)).toBe(true);
    expect(prov('gates')).toBe(true); // §4.1: "provisional is recomputed" (the cell upstream still lists blank is not final)
    expect(prov('outcome')).toBe(true);
    expect(statusOf(c, X)).toBe('finished');
  });
});
