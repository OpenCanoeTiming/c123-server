/**
 * #305 (M2 P3c): CQ1 and Q-TT.
 * CQ1: DERIVATIONS §4.12, CONTRACTS §2.6, §3.2 (retraction targets), TEST-ARCHITECTURE §3.2 property 1(c): after a retraction `status` is the stream's latest
 * inference for the generation; where the leave drew `left-without-finish` it returns there, in either order of the leave and the retracted row, with the
 * `oncourse-left` element's envelope (`source: 'tcp'`, `observedAt` = the TCP message at which the leave was evaluated), not the retraction's.
 * Q-TT (DERIVATIONS §4.1, §4.2, §10 items 35 and 43; CONTRACTS §2.6, §7.1): a Cross time-trial leave follows slalom; a Cross heat leave changes neither
 * `status` nor the outcome.
 * Channels are named in each test: the on-course stream (kit `listing` / `oncourse-left`), a TCP results row (`snap('tcp')`), the XML snapshot (`snap('xml')`).
 * Hand streams, injected instants only; each test builds its own core. Expected values come from the rules.
 */
import { describe, expect, it } from 'vitest';
import { at, field, kit, type Core } from './kit.js';

const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });
const FINISH_ROW = { outcome: dur(21), placement: { rank: 1, order: 1 }, judgingComplete: true };
const RUNNING = { kind: 'running', elapsedSeconds: 10, penaltySeconds: 0 };
const SLALOM = { phase: 'K1M_BR1_6', id: 'K1M_BR1_6:9' };
const TT = { phase: 'K1M_XT_19', id: 'K1M_XT_19:9' };
const HEAT = { phase: 'K1M_XS_19', id: 'K1M_XS_19:9' };

const status = (c: Core, id: string): any => field(c, id, 'status');
const inSet = (c: Core, id: string): boolean => (c.oncourse() as { attemptIds: unknown[] }).attemptIds.map(String).includes(id);
/** Item 43 per step: no presented `running` beside a `status` other than `on-course`. */
const noRunningBesideOther = (c: Core, id: string, where: string): void => {
  if (field(c, id, 'outcome')?.value?.kind === 'running') expect(status(c, id).value, `running beside ${String(status(c, id).value)} (${where})`).toBe('on-course');
};
const apply = (c: Core, u: Parameters<Core['applyUnit']>[0], id: string, where: string): void => {
  c.applyUnit(u);
  noRunningBesideOther(c, id, where);
};
/** The envelope the leave's `left-without-finish` carries: tcp, observed at the leave's message. */
const LEFT_AT = at(30);
const expectLeftWithoutFinish = (c: Core, id: string, why: string): void => {
  expect(status(c, id), why).toMatchObject({ state: 'known', value: 'left-without-finish', source: 'tcp', observedAt: LEFT_AT });
};
/** A start observed on the on-course stream (slalom / time trial): on-course with a running outcome. */
const started = (k: ReturnType<typeof kit>, runningOutcome = true) => [
  ...k.listing(at(0), at(-10)),
  ...(runningOutcome ? [k.obs('outcome', 'tcp', 'inference', at(0), RUNNING)] : []),
];

describe('CQ1: the leave recorded behind a table value (DERIVATIONS §4.12; CONTRACTS §2.6, §3.2; TEST-ARCHITECTURE §3.2 property 1(c))', () => {
  it('§3.2: the leave behind a table finished, then the row retracted, returns to left-without-finish (table first)', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k), SLALOM.id, 'start');
    expect(status(c, SLALOM.id).value, 'precondition (on-course stream): started').toBe('on-course');
    apply(c, [k.snap('tcp', at(20), FINISH_ROW)], SLALOM.id, 'table finish');
    expect(status(c, SLALOM.id), 'precondition (TCP results row): presented finished from the table').toMatchObject({ state: 'known', value: 'finished', source: 'tcp' });
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'leave');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): the leave rule fired').toBe(false);
    expect(status(c, SLALOM.id).value, 'precondition: status still the table\'s finished').toBe('finished');
    apply(c, [k.snap('tcp', at(40), {})], SLALOM.id, 'retraction');
    expect(field(c, SLALOM.id, 'outcome'), 'the row retracted: outcome gone').toEqual({ state: 'not-yet' });
    expectLeftWithoutFinish(c, SLALOM.id, 'back to the leave\'s left-without-finish, the leave\'s envelope, not the retraction\'s');
  });

  it('§3.2: the leave behind a table finished, then the row retracted, returns to left-without-finish (leave first)', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k), SLALOM.id, 'start');
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'leave');
    expect(status(c, SLALOM.id), 'precondition (on-course stream): the leave presented left-without-finish').toMatchObject({ value: 'left-without-finish', source: 'tcp', observedAt: LEFT_AT });
    apply(c, [k.snap('tcp', at(35), FINISH_ROW)], SLALOM.id, 'table finish');
    expect(status(c, SLALOM.id).value, 'precondition (TCP results row): the table finish presents finished').toBe('finished');
    apply(c, [k.snap('tcp', at(40), {})], SLALOM.id, 'retraction');
    expectLeftWithoutFinish(c, SLALOM.id, 'same envelope as in the other order');
  });

  // P3c fold-in (#383 review N1; mutant M6 of that review). The first leave's left-without-finish is recorded behind the table finish; the Attempt is listed
  // again (a re-listing ends the leave), listed with a finish of its own, and leaves a second time: the leave of a finisher draws no left-without-finish, so it records nothing.
  // Mutant: a re-listing leaves `gen.leftBehind` set -> the retraction returns to the FIRST leave's left-without-finish (observedAt at(30)) instead of
  // not-started on the retraction's own instant: both asserts red.
  it('§4.12 / §3.2: a re-listing clears the recorded leave; the Attempt listed again as a finisher and leaving a second time, the row retracted: not-started on the retraction\'s instant, never the first leave\'s left-without-finish', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k), SLALOM.id, 'start');
    apply(c, [k.snap('tcp', at(20), FINISH_ROW)], SLALOM.id, 'table finish');
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'first leave');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): the first leave rule fired').toBe(false);
    apply(c, k.listing(at(35), at(-10), at(33), { runSeconds: 28 }), SLALOM.id, 're-listing, with a finish');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): listed again').toBe(true);
    apply(c, [k.event('oncourse-left', at(50))], SLALOM.id, 'second leave');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): the second leave rule fired').toBe(false);
    expect(status(c, SLALOM.id).value, 'precondition: finished').toBe('finished');
    apply(c, [k.snap('tcp', at(60), {})], SLALOM.id, 'retraction');
    expect(field(c, SLALOM.id, 'outcome'), 'precondition: the row retracted, outcome gone').toMatchObject({ state: 'not-yet' });
    const s = status(c, SLALOM.id);
    expect(s, 'a finisher who left returns to not-started (§4.12); the first leave\'s record was cleared by the re-listing').toMatchObject({ state: 'known', value: 'not-started', source: 'tcp', observedAt: at(60) });
    expect(s.value, 'never the cleared leave\'s left-without-finish').not.toBe('left-without-finish');
  });

  it('§3.2: a leave behind a table mark, the mark retracted', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k), SLALOM.id, 'start');
    // an XML mark cannot outrank an on-course stream (INV-2 rule 2), so the leave comes first and the admitted XML snapshot's DNF follows it
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'leave');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): the leave rule fired').toBe(false);
    expectLeftWithoutFinish(c, SLALOM.id, 'precondition: the leave presented left-without-finish');
    apply(c, k.xml(at(35), at(32), { status: 'dnf' }), SLALOM.id, 'xml mark');
    expect(status(c, SLALOM.id), 'precondition (XML snapshot): the mark supersedes the leave (INV-2 rule 2 exception)').toMatchObject({ state: 'known', value: 'dnf', source: 'xml' });
    // a later admitted XML snapshot keeps this bib's row with no mark and no time (the result deleted, the row kept): INV-7's retraction, not a removal
    apply(c, k.xml(at(45), at(41), {}), SLALOM.id, 'xml retraction');
    expectLeftWithoutFinish(c, SLALOM.id, 'the mark gone: left-without-finish, the leave\'s envelope');
  });

  it('§3.2: a leave behind a TCP table DNF mark, the mark retracted (row 3b)', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k), SLALOM.id, 'start');
    apply(c, [k.snap('tcp', at(20), { status: 'dnf' })], SLALOM.id, 'tcp dnf row');
    expect(status(c, SLALOM.id), 'precondition (TCP results row): dnf presented from tcp before the leave').toMatchObject({ state: 'known', value: 'dnf', source: 'tcp' });
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'leave');
    expect(inSet(c, SLALOM.id), 'precondition (on-course stream): the leave rule fired').toBe(false);
    expect(status(c, SLALOM.id).value, 'precondition: status still the mark').toBe('dnf');
    apply(c, [k.snap('tcp', at(40), {})], SLALOM.id, 'mark retracted');
    expectLeftWithoutFinish(c, SLALOM.id, 'the mark retracted: left-without-finish, the leave\'s envelope, not the retraction\'s');
  });

  it('§3.2: a stream finish then the leave; a retraction returns to finished/not-started as before (guard)', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    apply(c, started(k, false), SLALOM.id, 'start');
    apply(c, k.listing(at(20), at(-10), at(18), { runSeconds: 28 }), SLALOM.id, 'stream finish');
    expect(status(c, SLALOM.id), 'precondition (on-course stream): the stream\'s own finish').toMatchObject({ value: 'finished', source: 'tcp' });
    apply(c, [k.event('oncourse-left', LEFT_AT)], SLALOM.id, 'leave');
    expect(status(c, SLALOM.id).value, 'precondition: the leave of a finisher keeps finished').toBe('finished');
    apply(c, [k.snap('tcp', at(35), FINISH_ROW)], SLALOM.id, 'table row');
    expect(status(c, SLALOM.id).value, 'precondition (TCP results row): finished').toBe('finished');
    apply(c, [k.snap('tcp', at(40), {})], SLALOM.id, 'retraction');
    // DERIVATIONS §4.12: a finisher who left the list at closure has no left-without-finish inference and returns to not-started
    expect(status(c, SLALOM.id), 'a finisher who left returns to not-started, never left-without-finish').toMatchObject({ state: 'known', value: 'not-started', source: 'tcp' });
  });
});

describe('#315 N2 / item 35 and Q-TT: a Cross DNF row, the leave, the row cleared (DERIVATIONS §4.1, §4.2, §10 items 35, 43; CONTRACTS §2.6, §7.1)', () => {
  /** A Cross heat listing: no dtStart, status on-course with a running outcome (item 35). */
  const heatStart = (k: ReturnType<typeof kit>) => [
    k.obs('onCourse', 'tcp', 'inference', at(0), { dtStart: null, dtFinish: null }),
    k.obs('status', 'tcp', 'inference', at(0), 'on-course'),
    k.obs('outcome', 'tcp', 'inference', at(0), RUNNING),
  ];

  it('item 35: a Cross heat DNF row, the leave, the row cleared → on-course with running', () => {
    const k = kit(HEAT.id, HEAT.phase);
    const c = k.core();
    apply(c, heatStart(k), HEAT.id, 'heat start');
    expect(status(c, HEAT.id).value, 'precondition (on-course stream): on-course').toBe('on-course');
    expect(field(c, HEAT.id, 'outcome'), 'precondition: running').toMatchObject({ state: 'known', value: { kind: 'running' } });
    apply(c, [k.snap('tcp', at(20), { status: 'dnf' })], HEAT.id, 'dnf row');
    expect(status(c, HEAT.id), 'precondition (TCP results row): the mark is presented').toMatchObject({ value: 'dnf', source: 'tcp' });
    apply(c, [k.event('oncourse-left', LEFT_AT)], HEAT.id, 'leave');
    expect(inSet(c, HEAT.id), 'precondition (on-course stream): the leave rule fired').toBe(false);
    apply(c, [k.snap('tcp', at(40), {})], HEAT.id, 'row cleared');
    expect(status(c, HEAT.id).value, 'a heat leave changes neither status nor outcome').toBe('on-course');
    expect(field(c, HEAT.id, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running' } });
  });

  it('Q-TT: a Cross time-trial DNF row, the leave, the row cleared → left-without-finish', () => {
    const k = kit(TT.id, TT.phase);
    const c = k.core();
    apply(c, started(k), TT.id, 'tt start');
    expect(status(c, TT.id).value, 'precondition (on-course stream): on-course').toBe('on-course');
    apply(c, [k.snap('tcp', at(20), { status: 'dnf' })], TT.id, 'dnf row');
    expect(status(c, TT.id), 'precondition (TCP results row): the mark is presented').toMatchObject({ value: 'dnf', source: 'tcp' });
    apply(c, [k.event('oncourse-left', LEFT_AT)], TT.id, 'leave');
    expect(inSet(c, TT.id), 'precondition (on-course stream): the leave rule fired').toBe(false);
    apply(c, [k.snap('tcp', at(40), {})], TT.id, 'row cleared');
    expectLeftWithoutFinish(c, TT.id, 'a time-trial leave follows slalom: left-without-finish, the leave\'s envelope');
    expect(field(c, TT.id, 'outcome').value?.kind, 'the stream\'s running is withdrawn').not.toBe('running');
  });

  it('Q-TT: a Cross time-trial leave with a start and no finish: left-without-finish, no running, off the list', () => {
    const k = kit(TT.id, TT.phase);
    const c = k.core();
    apply(c, started(k), TT.id, 'tt start');
    expect(field(c, TT.id, 'outcome'), 'precondition: running').toMatchObject({ value: { kind: 'running' } });
    apply(c, [k.event('oncourse-left', LEFT_AT)], TT.id, 'leave');
    expectLeftWithoutFinish(c, TT.id, 'status');
    expect(field(c, TT.id, 'outcome')).toEqual({ state: 'not-yet' });
  });

  it('Q-TT: a Cross time-trial leave from at-start returns to not-started', () => {
    const k = kit(TT.id, TT.phase);
    const c = k.core();
    apply(c, k.listing(at(0), null), TT.id, 'staged');
    expect(status(c, TT.id).value, 'precondition (on-course stream): at-start').toBe('at-start');
    apply(c, [k.event('oncourse-left', LEFT_AT)], TT.id, 'leave');
    expect(status(c, TT.id).value).toBe('not-started');
  });
});

describe('Q-TT, heats unchanged (guard; DERIVATIONS §10 item 35, item 43)', () => {
  it('item 35: a Cross heat leave with a start changes neither status nor outcome, and no running beside another status at any step', () => {
    const k = kit(HEAT.id, HEAT.phase);
    const c = k.core();
    apply(c, [
      k.obs('onCourse', 'tcp', 'inference', at(0), { dtStart: null, dtFinish: null }),
      k.obs('status', 'tcp', 'inference', at(0), 'on-course'),
      k.obs('outcome', 'tcp', 'inference', at(0), RUNNING),
    ], HEAT.id, 'heat start');
    const before = { s: status(c, HEAT.id), o: field(c, HEAT.id, 'outcome') };
    expect(before.s.value, 'precondition (on-course stream): on-course').toBe('on-course');
    apply(c, [k.event('oncourse-left', LEFT_AT)], HEAT.id, 'leave');
    expect(inSet(c, HEAT.id), 'precondition: the leave rule fired').toBe(false);
    expect(status(c, HEAT.id).value).toBe('on-course');
    expect(field(c, HEAT.id, 'outcome')).toEqual(before.o);
  });
});
