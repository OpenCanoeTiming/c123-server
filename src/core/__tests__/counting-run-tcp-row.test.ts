import { describe, it, expect } from 'vitest';
import { at as sec, field, kit } from './kit.js';

// #278, design-round26b.md "Ruling": a present time-empty TCP row has no BetterRunNr column and does not retract countingRun (DERIVATIONS §4.4:
// "XML only: TCP does not state it"; INV-1 omit, not absent); the next XML row with BetterRunNr 0 states `not-yet` (ne-odp C1M_BR2_19:64,
// steps 5596, 5679, 5789). The parser hands the core `countingRun: null` for BetterRunNr 0.
describe('countingRun across a TCP row (DERIVATIONS §4.4, INV-7; ne-odp C1M_BR2_19:64, steps 5596/5679/5789)', () => {
  const A = 'C1M_BR2_19:64', P = 'C1M_BR2_19';
  it('obligation §4.4 countingRun XML only: xml 1 -> time-empty tcp row leaves 1 -> xml BetterRunNr 0 presents not-yet from xml', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.xml(sec(10), sec(5), { outcome: { kind: 'duration', runSeconds: 83, penaltySeconds: 0, totalSeconds: 83 }, placement: { rank: 9, order: 9 }, pairTotal: 168.85, countingRun: 1 }));
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 1, source: 'xml' });
    c.applyUnit([k.snap('tcp', sec(20), { timeEmpty: true, placement: null, pairTotal: null })]);
    expect(field(c, A, 'countingRun'), 'a present time-empty tcp row does not retract it').toMatchObject({ state: 'known', value: 1, source: 'xml' });
    c.applyUnit(k.xml(sec(40), sec(35), { timeEmpty: true, placement: null, pairTotal: null, countingRun: null }));
    expect(field(c, A, 'countingRun')).toEqual({ state: 'not-yet' });
  });
});
