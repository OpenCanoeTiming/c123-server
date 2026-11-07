import { describe, it, expect } from 'vitest';
import { JA51 } from './fixtures/round24-excerpts.js';
import { at as sec, field, kit } from './kit.js';
import { connected, coreWith, tcpUnit } from './streams.js';

// Round 25 (#242; design-round25.md, code list "Core", rulings 3, 4, 5). Expected values come from the contract sentences named in each test
// name (INV-5 "where the value is already presented from that source nothing of the retained envelope changes"; round 24 ruling 2 "no delta
// when a re-listing changes no cell"; round 25 ruling 4 "a row's `finished` over a presented `finished` from the same source changes nothing
// of the envelope"), never from running the core.

type Env = { state?: string; value?: unknown; source?: string; confidence?: string; provisional?: boolean; observedAt?: string; eventTime?: string };
type Msg = { type: string; attemptId?: string; fields?: Record<string, Env> };
const JA = 'K1M_BR2_19:51';
const JA_DAY = { K1M_BR2_19: '2026-04-19' };
/** The envelope without its instant: what INV-5 says may not move when only the instant would. */
const sameButAt = (a: Env, b: Env): boolean => JSON.stringify({ ...a, observedAt: undefined }) === JSON.stringify({ ...b, observedAt: undefined });
const sentFor = (core: ReturnType<typeof coreWith>, id: string, f: string): Env[] =>
  (core.notifications() as Msg[]).filter((m) => m.type === 'attempt.updated' && m.attemptId === id && m.fields !== undefined && f in m.fields).map((m) => m.fields![f]!);

describe('P9 gates (design-round25 ruling 3; round 24 ruling 2 "no delta when a re-listing changes no cell"; INV-5)', () => {
  it('real jarni-ne-do K1M_BR2_19:51 (the recorded listings, 08:50:00..08:50:25): no gates delta restates the previous envelope with only its observedAt moved', () => {
    const core = coreWith([connected(JA51[0]!.observedAt)]);
    for (const r of JA51) core.applyUnit(tcpUnit(r, JA_DAY));
    const sent = sentFor(core, JA, 'gates');
    expect(sent.length).toBeGreaterThan(0);
    sent.forEach((e, i) => {
      if (i === 0) return;
      expect(sameButAt(e, sent[i - 1]!), `gates delta ${i} at ${e.observedAt} changes only observedAt`).toBe(false);
    });
  });

  it('the Attempt\'s own leave (jarni step 68792 shape): the listed merge presented the cells at the listing\'s instant; at the leave the same cells, source and confidence stay on that instant, no delta', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    const run = { kind: 'duration', runSeconds: 90, penaltySeconds: 2, totalSeconds: 92 };
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.snap('tcp', sec(5), { outcome: run, gates: [{ number: 1, penalty: 0 }, { number: 2, penalty: null }], judgingComplete: false })]);
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(8), [{ number: 1, penalty: 0 }, { number: 2, penalty: 2 }])]);
    c.applyUnit([k.snap('tcp', sec(9), { outcome: run, gates: [{ number: 1, penalty: 0 }, { number: 2, penalty: 2 }], judgingComplete: false })]);
    const before = field(c, A, 'gates');
    expect(before).toMatchObject({ state: 'known', value: [{ number: 1, penalty: 0 }, { number: 2, penalty: 2 }] });
    const from = c.notifications().length;
    c.applyUnit([k.event('oncourse-left', sec(10))]);
    const after = field(c, A, 'gates');
    expect(after.value).toEqual(before.value);
    expect(after.observedAt, 'no cell, source or confidence moved at the leave').toBe(before.observedAt);
    const sent = (c.notifications().slice(from) as Msg[]).filter((m) => m.attemptId === A && m.fields !== undefined && 'gates' in m.fields).map((m) => m.fields!['gates']!);
    for (const e of sent) expect(sameButAt(e, before) && e.observedAt !== before.observedAt, 'a delta restating the envelope with only observedAt moved').toBe(false);
  });

  it('a re-listing while listed with the same cells moves nothing (the listed path, the baseline of the rule)', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    const cells = [{ number: 1, penalty: 0 }, { number: 2, penalty: 2 }];
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(2), cells)]);
    const before = field(c, A, 'gates');
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(4), cells)]);
    expect(field(c, A, 'gates')).toEqual(before);
  });

  it('a changed cell does move observedAt (the rule is no weaker than "unchanged cells keep the instant")', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(2), [{ number: 1, penalty: 0 }, { number: 2, penalty: null }])]);
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(4), [{ number: 1, penalty: 0 }, { number: 2, penalty: 2 }])]);
    expect(field(c, A, 'gates').observedAt).toBe(sec(4));
  });
});

describe('P9 and P1 status (design-round25 rulings 4 and 5; INV-5; DERIVATIONS §4.11)', () => {
  const A = 'MX1_XT_26:6', P = 'MX1_XT_26';
  const finish = '10:00:20.000';

  it('real cp3-cross MX1_XT_26:6 shape (step 34661): a results row re-sending `finished` over the listing\'s `finished` keeps the whole envelope, observedAt and eventTime included', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000', finish));
    const before = field(c, A, 'status');
    expect(before).toMatchObject({ state: 'known', value: 'finished', source: 'tcp' });
    const from = c.notifications().length;
    c.applyUnit([k.snap('tcp', sec(2), { status: 'finished' })]);
    expect(field(c, A, 'status')).toEqual(before);
    const moved = (c.notifications().slice(from) as Msg[]).filter((m) => m.attemptId === A && m.fields !== undefined && 'status' in m.fields);
    expect(moved).toEqual([]);
  });

  it('the row\'s `finished` over a presented `finished` from the same source, any later delivery of it: still the envelope the listing gave', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000', finish));
    const before = field(c, A, 'status');
    c.applyUnit([k.snap('tcp', sec(2), { status: 'finished' })]);
    c.applyUnit([k.snap('tcp', sec(9), { status: 'finished' })]);
    expect(field(c, A, 'status')).toEqual(before);
  });

  it('inside one unit (nkz C1M_BR1_19:7 P1 report): a held results row and the listing that settles the finish give `status` the listing\'s envelope, never the row\'s earlier instant', () => {
    const A2 = 'C1M_BR1_19:7', P2 = 'C1M_BR1_19';
    const k = kit(A2, P2); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    // the row arrives while the stream still shows the Attempt running (held), the listing at +0.108 s settles the finish
    c.applyUnit([k.snap('tcp', sec(20.25), { status: 'finished', outcome: { kind: 'duration', runSeconds: 20, penaltySeconds: 0, totalSeconds: 20 } })]);
    c.applyUnit(k.listing(sec(20.358), '10:00:00.000', '10:00:20.000'));
    const s = field(c, A2, 'status');
    expect(s).toMatchObject({ state: 'known', value: 'finished' });
    expect(s.observedAt).toBe(sec(20.358));
    for (const e of sentFor(c, A2, 'status')) if (e.value === 'finished') expect(e.observedAt).toBe(sec(20.358));
  });
});
