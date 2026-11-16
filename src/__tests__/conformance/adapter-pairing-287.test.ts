import { describe, it, expect } from 'vitest';
import { corePort } from './core-adapter.js';
import type { GivenElement, MergePort } from './port.js';

/**
 * #287 row 13 (CONFORMANCE-VECTORS §1, "the same convention describes a Phase no element has described ... the harness adapter's alone"; DA record item 17;
 * DERIVATIONS §10 item 48; review N12 of PR #375): the adapter states `classId`, `format` and `pair` for a Phase the vector leaves undescribed.
 * Each test builds its own port and units; the unit names a Phase only through an Attempt observation, as the vectors do.
 */
const T = '2026-09-19T10:00:00.000Z';
const named = (phaseId: string, seq = 1): GivenElement[] => [
  { ingestSeq: seq, attemptId: `${phaseId}:9`, field: 'status', source: 'tcp', kind: 'inference', observedAt: T, value: 'at-start', confidence: 'authoritative' } as GivenElement,
];
const port = (attemptId: string): MergePort => corePort.createMergePort({ attemptId, xmlPollIntervalSeconds: 5 });
const pairOf = (p: MergePort, id: string): unknown => p.phase(id)['pair'];

describe('#287 row 13: the adapter states classId, format and pair for an undescribed Phase (CONFORMANCE-VECTORS §1)', () => {
  it.each([
    ['K1M_BR2_19', 'K1M', 'BR2', { role: 'second', siblingPhaseId: 'K1M_BR1_19', combination: 'best' }],
    ['K1M_ST_BR2_6', 'K1M_ST', 'BR2', { role: 'second', siblingPhaseId: 'K1M_ST_BR1_6', combination: 'best' }],
    ['K1M-ZS_BR2_25', 'K1M-ZS', 'BR2', { role: 'second', siblingPhaseId: 'K1M-ZS_BR1_25', combination: 'best' }],
    ['X_SR2_26_JUN', 'X', 'SR2', { role: 'second', siblingPhaseId: 'X_SR1_26_JUN', combination: 'sum' }],
    ['MX1J_XT_26', 'MX1J', 'XT', null],
  ])('a Phase first seen alone, %s: class %s, format %s, pair %j (a second run names the id carrying the first run\'s token, held or not)', (id, cls, format, pair) => {
    const p = port(`${id}:9`);
    p.applyUnit(named(id));
    expect(p.phase(id)['classId']).toBe(cls);
    expect(p.phase(id)['format']).toBe(format);
    expect(pairOf(p, id)).toEqual(pair);
  });

  it('review N12 / item 48: the adapter states a first run\'s pair with siblingPhaseId null and builds no pointer; the sibling the core presents is the second run that names it, in either arrival order', () => {
    const alone = port('K1M_BR1_19:9');
    alone.applyUnit(named('K1M_BR1_19'));
    expect(pairOf(alone, 'K1M_BR1_19')).toEqual({ role: 'first', siblingPhaseId: null, combination: 'best' });

    for (const order of [['K1M_BR2_19', 'K1M_BR1_19'], ['K1M_BR1_19', 'K1M_BR2_19']] as const) {
      const p = port(`${order[0]}:9`);
      order.forEach((id, i) => p.applyUnit(named(id, i + 1)));
      expect(pairOf(p, 'K1M_BR2_19'), order.join(' then ')).toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR1_19' });
      expect(pairOf(p, 'K1M_BR1_19'), order.join(' then ')).toEqual({ role: 'first', siblingPhaseId: 'K1M_BR2_19', combination: 'best' });
    }
  });

  it('CONFORMANCE-VECTORS §1 "a Phase whose first unit carries no element of that field": a stated pair is the vector\'s own and the adapter adds none beside it', () => {
    const p = port('K1M_BR2_19:9');
    p.applyUnit([
      { ingestSeq: 1, phaseId: 'K1M_BR2_19', field: 'pair', source: 'tcp', kind: 'result-row', observedAt: T, value: { role: 'second', siblingPhaseId: null, combination: 'best' }, confidence: 'authoritative' } as GivenElement,
      ...named('K1M_BR2_19', 2),
    ]);
    expect(pairOf(p, 'K1M_BR2_19')).toEqual({ role: 'second', siblingPhaseId: null, combination: 'best' });
    expect(p.phase('K1M_BR2_19')['format']).toBe('BR2'); // the unstated fields are still the adapter's
  });
});
