import { describe, it, expect } from 'vitest';
import { at as sec, field, kit } from './kit.js';

// Round 26 (#278; design-round26.md "Code list", Core part). Expected values come from the contract sentences named in each test name
// (INV-5 "the envelope presented is the re-delivery's, observedAt included"; INV-5 + P9 "a delta that differs only in observedAt is not sent";
// DERIVATIONS §4.12 / INV-7 "take placement and pairTotal from the row"; §1.2 "the element's that last changed the presented cells"),
// never from running the core. Real instants are shifted onto the kit's clock; the shapes are the recorded ones named per test.

type Env = { state?: string; value?: any; source?: string; observedAt?: string };
type Msg = { type: string; attemptId?: string; fields?: Record<string, Env> };
const sentFor = (c: ReturnType<ReturnType<typeof kit>['core']>, id: string, f: string): Env[] =>
  (c.notifications() as Msg[]).filter((m) => m.type === 'attempt.updated' && m.attemptId === id && m.fields !== undefined && f in m.fields).map((m) => m.fields![f]!);

describe('G6 (P1): a row admitted after an earlier read of it was refused is presented with the admitting re-delivery\'s observedAt (INV-5; so-odp C1M_BR1_18:69, steps 20277 refused, 20490 admitted)', () => {
  const A = 'C1M_BR1_18:69', P = 'C1M_BR1_18';
  it('obligation INV-5 re-delivery envelope: dns and its no-result outcome carry the admitting snapshot\'s instant, never the refused read\'s', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit([k.obs('status', 'tcp', 'inference', sec(28), 'left-without-finish')]); // 12:47:28.058
    c.applyUnit(k.xml(sec(32), sec(27), { status: 'dns' })); // 12:47:32.346, changedAfter not later than the leave: refused
    expect(field(c, A, 'status')).toMatchObject({ value: 'left-without-finish', source: 'tcp' });
    c.applyUnit(k.xml(sec(67), sec(62), { status: 'dns' })); // 12:48:07.374, changedAfter 12:48:02.374: admitted
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'dns', source: 'xml' });
    expect(field(c, A, 'status').observedAt, 'status of the admitting snapshot').toBe(sec(67));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'no-result' } });
    expect(field(c, A, 'outcome').observedAt, 'the no-result outcome is the status\'s envelope').toBe(sec(67));
    for (const f of ['status', 'outcome']) for (const e of sentFor(c, A, f)) if (e.value === 'dns' || e.value?.kind === 'no-result') expect(e.observedAt, `${f} sent`).toBe(sec(67));
  });
});

describe('G13 (P9, P1): the run-2 outcome\'s observedAt follows the element that last changed runSeconds or a presented merged cell (INV-5; DERIVATIONS §4.4; nkz-20ne K1M_BR2_20:63, steps 62857/62858)', () => {
  const A = 'K1M_BR2_20:63', P = 'K1M_BR2_20';
  const dur = (runSeconds: number, penaltySeconds: number) => ({ kind: 'duration', runSeconds, penaltySeconds, totalSeconds: runSeconds + penaltySeconds });
  const g = (c2: number | null) => [{ number: 1, penalty: 0 }, { number: 2, penalty: c2 }, { number: 3, penalty: 4 }];
  /** The recorded order: row with the 50 (pen 54) and listings keeping every cell judged; then the row with Pen 4 and the 50 cell blank. */
  const upToRow2 = () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(0), '10:00:00.000'));
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(10), g(50))]);
    c.applyUnit(k.listing(sec(20), '10:00:00.000', '10:01:43.000', { runSeconds: 103.81 }));
    c.applyUnit([k.snap('tcp', sec(22.431), { outcome: dur(103.81, 54), gates: g(50), judgingComplete: true })]); // 09:41:22.431: pen 54, 157.81
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(23), g(50))]);
    return { k, c };
  };

  it('62857: the re-delivered row\'s raw outcome changes (Pen 4, a gate blank) but the merged penalty stays 54: no delta, observedAt stays where it was', () => {
    const { k, c } = upToRow2();
    const before = field(c, A, 'outcome');
    expect(before).toMatchObject({ state: 'known', value: { kind: 'duration', penaltySeconds: 54 } });
    const from = c.notifications().length;
    c.applyUnit([k.snap('tcp', sec(25.154), { outcome: dur(103.81, 4), gates: g(null), judgingComplete: true })]); // 09:41:25.154
    const after = field(c, A, 'outcome');
    expect(after.value.penaltySeconds, 'the stream\'s 50 is still judged').toBe(54);
    expect(after.observedAt, 'unchanged value keeps its instant (the row\'s 25.154 is not a change of the presented cells)').toBe(before.observedAt);
    const moved = (c.notifications().slice(from) as Msg[]).filter((m) => m.attemptId === A && m.fields !== undefined && 'outcome' in m.fields);
    expect(moved, 'P9: no outcome delta differing only in observedAt').toEqual([]);
  });

  it('62858 (the half-fix guard): the listing that clears the stream\'s 50 changes the merged cell: outcome 54 -> 4 is presented with that LISTING\'s instant, not the row\'s earlier 25.154', () => {
    const { k, c } = upToRow2();
    c.applyUnit([k.snap('tcp', sec(25.154), { outcome: dur(103.81, 4), gates: g(null), judgingComplete: true })]);
    c.applyUnit([k.obs('gates', 'tcp', 'inference', sec(25.347), g(null))]); // 09:41:25.347: the 50 cleared
    const o = field(c, A, 'outcome');
    expect(o).toMatchObject({ state: 'known', value: { kind: 'duration', penaltySeconds: 4 } });
    expect(o.observedAt, 'the element that last changed the presented merged cell').toBe(sec(25.347));
    const sent = sentFor(c, A, 'outcome').filter((e) => e.value?.penaltySeconds === 4);
    expect(sent.length).toBeGreaterThan(0);
    for (const e of sent) expect(e.observedAt, 'the delta sent').toBe(sec(25.347));
  });

  it('a changed runSeconds is a change of the outcome: its instant is the element that changed it (the rule is no weaker than "keep the first instant")', () => {
    const { k, c } = upToRow2();
    c.applyUnit([k.snap('tcp', sec(30), { outcome: dur(104.31, 54), gates: g(50), judgingComplete: true })]);
    expect(field(c, A, 'outcome')).toMatchObject({ value: { runSeconds: 104.31 } });
    expect(field(c, A, 'outcome').observedAt).toBe(sec(30));
  });
});

describe('G11 (P5; DERIVATIONS §4.12, INV-7): a second-run row with Time empty and an empty Total states pairTotal not-yet (ne-odp C1M_BR2_19:64, step 5679)', () => {
  const A = 'C1M_BR2_19:64', P = 'C1M_BR2_19';
  it('obligation §4.12 take pairTotal from the row: the row\'s pairTotal null (empty Total) replaces the held 166.85 with not-yet, as null placement does', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit([k.snap('tcp', sec(1), { outcome: { kind: 'duration', runSeconds: 83, penaltySeconds: 0, totalSeconds: 83 }, placement: { rank: 9, order: 9 }, pairTotal: 166.85 })]);
    expect(field(c, A, 'pairTotal')).toMatchObject({ state: 'known', value: 166.85 });
    c.applyUnit([k.snap('tcp', sec(7), { timeEmpty: true, placement: null, pairTotal: null })]);
    expect(field(c, A, 'placement')).toEqual({ state: 'not-yet' });
    expect(field(c, A, 'pairTotal')).toEqual({ state: 'not-yet' });
  });
});
