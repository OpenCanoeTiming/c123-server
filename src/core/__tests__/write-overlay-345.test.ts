/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { kit, at } from './kit.js';

/**
 * #345 item 50 / DA ruling item 20, core tier (element-level, vector shapes; `kit`):
 * N1 the overlay follows a re-listing and a leave (item 50 (a): the base "as it stands at each step"); N3 a pending write is judged whether or not an
 * assertion is presented over it (item 50 (f)); N5 the envelope's `observedAt` is the element's that last changed the presented vector, and a step
 * that changes no presented cell sends no `gates` (item 50 (a)); CQ2 a write whose value the field already presents is pushed as write.updated alone
 * (CLIENT-OBLIGATIONS "Expect an optimistic write", CONTRACTS §2.9, §4 rule 4; INV-5).
 */
const P = 'K1M_BR1_6', A = `${P}:9`;
const cells = (a: number | null, b: number | null, c: number | null) => [{ number: 3, penalty: a }, { number: 4, penalty: b }, { number: 5, penalty: c }];
const dur = { kind: 'duration', runSeconds: 82, penaltySeconds: 0, totalSeconds: 82 };
const op = (k: ReturnType<typeof kit>, s: number, gate: number, pen: number, extra: Record<string, unknown> = {}): any =>
  k.obs('gates', 'tcp', 'result-row', at(s), [{ number: gate, penalty: pen }], { source: 'operator-write', kind: 'operator', run: 1, ...extra } as never);
const row = (k: ReturnType<typeof kit>, s: number, c: any[]): any => k.snap('tcp', at(s), { outcome: dur, gates: c, judgingComplete: true });
const gatesOf = (c: any): any => c.presented(A)['gates'];
const statuses = (c: any): Record<string, string> => Object.fromEntries((c.notifications() as any[]).filter((m) => m.type === 'write.updated').map((m) => [m.write.writeId, m.write.status]));

describe('N1: the overlay follows a re-listing and a leave', () => {
  it('item 50 (a): a pending write on gate 4; the Attempt is re-listed and a stream cell changes: the presented vector moves with the base, the write\'s cell over it; at the leave it moves back', () => {
    const k = kit(A, P);
    const c = k.core();
    const control = kit(A, P).core();
    const kc = kit(A, P);
    c.applyUnit([row(k, 0, cells(0, 0, 0))]);
    control.applyUnit([row(kc, 0, cells(0, 0, 0))]);
    c.applyUnit([op(k, 5, 4, 2)]);
    expect(Object.values(statuses(c)), 'precondition: the write is pending').toEqual(['pending']);
    for (const [core, kk] of [[c, k], [control, kc]] as const) {
      core.applyUnit(kk.listing(at(10), at(8)));
      core.applyUnit([kk.obs('gates', 'tcp', 'inference', at(11), cells(0, 0, 50))]);
    }
    expect(gatesOf(control).value.find((g: any) => g.number === 5).penalty, 'precondition: without a write the listed vector shows the stream cell').toBe(50);
    let g = gatesOf(c);
    expect(g).toMatchObject({ source: 'operator-write', provisional: true });
    expect(g.value).toEqual([{ number: 3, penalty: 0 }, { number: 4, penalty: 2 }, { number: 5, penalty: 50 }]);
    for (const [core, kk] of [[c, k], [control, kc]] as const) core.applyUnit([kk.event('oncourse-left', at(20))]);
    expect(gatesOf(control).value.find((x: any) => x.number === 5).penalty, 'precondition: without a write the leave takes the stream cell away').toBe(0);
    g = gatesOf(c);
    expect(g).toMatchObject({ source: 'operator-write', provisional: true });
    expect(g.value).toEqual([{ number: 3, penalty: 0 }, { number: 4, penalty: 2 }, { number: 5, penalty: 0 }]);
    expect(Object.values(statuses(c))).toEqual(['pending']);
  });
});

describe('N3: a pending write is judged whether or not its value is presented', () => {
  it('item 50 (f): a pending write, then an assertion on the field, then the echo row: the write resolves', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([row(k, 0, cells(0, 0, 0))]);
    c.applyUnit([op(k, 5, 4, 2)]);
    expect(Object.values(statuses(c)), 'precondition: pending').toEqual(['pending']);
    c.applyUnit([op(k, 6, 5, 50, { provisionalOverride: false })]);
    expect(gatesOf(c), 'precondition: the assertion is what is presented').toMatchObject({ source: 'operator-write', provisional: false });
    expect(Object.values(statuses(c)), 'precondition: the write is still pending').toEqual(['pending']);
    c.applyUnit([row(k, 10, cells(0, 2, 0))]);
    expect(Object.values(statuses(c)), 'the echo resolves it though an assertion sits over it').toEqual(['confirmed']);
  });
});

describe('N5: the operator envelope\'s observedAt', () => {
  it('item 50 (a): observedAt is the element\'s that last changed the presented vector: the submission, then a row moving another cell; a row changing no presented cell leaves it and sends no gates', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([row(k, 0, cells(0, 0, 0))]);
    c.applyUnit([op(k, 5, 4, 2)]);
    expect(gatesOf(c).observedAt, 'the submission\'s instant').toBe(at(5));
    c.applyUnit([row(k, 10, cells(0, 0, 2))]);
    expect(gatesOf(c).value, 'precondition: the row\'s other cell shows, the requested cell stays').toEqual([{ number: 3, penalty: 0 }, { number: 4, penalty: 2 }, { number: 5, penalty: 2 }]);
    expect(gatesOf(c).observedAt, 'the row\'s instant').toBe(at(10));
    const n = c.notifications().length;
    c.applyUnit([row(k, 20, cells(0, 0, 2))]);
    expect(gatesOf(c).observedAt, 'a step that changes no presented cell leaves it').toBe(at(10));
    expect((c.notifications().slice(n) as any[]).filter((m) => m.type === 'attempt.updated' && m.fields?.gates !== undefined), 'and sends no gates').toEqual([]);
  });
});

describe('CQ2 (item 20): a write whose value the field already presents', () => {
  it('CLIENT-OBLIGATIONS optimistic write line / INV-5: the second write of 2 on a cell already presenting 2 is pushed as write.updated alone, no attempt.updated with gates', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([row(k, 0, cells(0, 0, 0))]);
    let n = c.notifications().length;
    c.applyUnit([op(k, 5, 4, 2)]);
    const first = (c.notifications().slice(n) as any[]);
    expect(first.filter((m) => m.type === 'attempt.updated' && m.fields?.gates !== undefined), 'precondition: the first write is pushed with its gates').toHaveLength(1);
    expect(first.filter((m) => m.type === 'write.updated')).toHaveLength(1);
    n = c.notifications().length;
    c.applyUnit([op(k, 6, 4, 2)]);
    const second = (c.notifications().slice(n) as any[]);
    expect(second.filter((m) => m.type === 'write.updated'), 'the second WriteRequest is pushed').toHaveLength(1);
    expect(second.filter((m) => m.type === 'attempt.updated' && m.fields?.gates !== undefined), 'but no gates').toEqual([]);
    expect(Object.values(statuses(c))).toEqual(['pending', 'pending']);
  });
});
