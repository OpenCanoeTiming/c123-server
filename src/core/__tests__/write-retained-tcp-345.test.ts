/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { kit, at } from './kit.js';

/**
 * #345 item 50 (g) (DA ruling item 21, CQ3; re-review N10), the TCP side: after a step that resolved a write by an XML delivery, a write left pending
 * takes the delivered value as its retained value although the TCP source's own slot still holds the older one; a TCP row restating that value is no echo.
 * Element-level, vector shapes (`kit`); the XML save's content age passes INV-2c's guard (DERIVATIONS §6).
 */
const P = 'K1M_BR1_6', A = `${P}:9`;
const cells = (c4: number) => [{ number: 3, penalty: 0 }, { number: 4, penalty: c4 }, { number: 5, penalty: 0 }];
const dur = { kind: 'duration', runSeconds: 82, penaltySeconds: 0, totalSeconds: 82 };
const statuses = (c: any): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const m of c.notifications() as any[]) if (m.type === 'write.updated') out[m.write.writeId] = m.write.status;
  return out;
};

describe('N10 (item 21): a TCP prior slot, the first write resolved by an XML save', () => {
  it('item 50 (g) / §6: TCP states 0; writes 2 then 50; an XML save confirms the first; TCP restating 2 leaves the second pending (retained 2); TCP stating 50 confirms it', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(0), { outcome: dur, gates: cells(0), judgingComplete: true })]);
    expect((c.presented(A) as any).gates, 'precondition: the TCP slot is known, gate 4 = 0').toMatchObject({ state: 'known', source: 'tcp' });
    expect((c.presented(A) as any).gates.value.find((g: any) => g.number === 4).penalty).toBe(0);
    const w = (s: number, pen: number): any => k.obs('gates', 'tcp', 'result-row', at(s), [{ number: 4, penalty: pen }], { source: 'operator-write', kind: 'operator', run: 1 } as never);
    c.applyUnit([w(5, 2)]);
    c.applyUnit([w(6, 50)]);
    const [first, second] = Object.keys(statuses(c));
    expect(Object.values(statuses(c)), 'precondition: both writes pending').toEqual(['pending', 'pending']);
    c.applyUnit(k.xml(at(20), at(10), { outcome: dur, gates: cells(2), judgingComplete: true }));
    const after = statuses(c);
    expect([after[first!], after[second!]], 'precondition: the XML save confirmed the first and left the second pending').toEqual(['confirmed', 'pending']);
    c.applyUnit([k.snap('tcp', at(30), { outcome: dur, gates: cells(2), judgingComplete: true })]);
    expect(statuses(c)[second!], 'TCP restating 2 is the first write\'s echo arriving again, not a change for the second').toBe('pending');
    expect((c.presented(A) as any).gates.value.find((g: any) => g.number === 4).penalty, '50 stays presented').toBe(50);
    c.applyUnit([k.snap('tcp', at(40), { outcome: dur, gates: cells(50), judgingComplete: true })]);
    expect(statuses(c)[second!]).toBe('confirmed');
  });
});
