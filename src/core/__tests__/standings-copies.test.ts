/**
 * #210 row 10 family, review N6 (#273 N3, same hazard class): the core's hydration view `standings()` hands out copies of what it holds.
 */
import { describe, expect, it } from 'vitest';
import { R19 } from './fixtures/round19-excerpts.js';
import { connected, coreWith, tcpUnit } from './streams.js';

describe('core.standings() (hydration view): copies, not the held objects (#273 N3)', () => {
  it('mutating a returned Standing, its entries or its scope does not change what the next call returns', () => {
    const core = coreWith([connected(R19.xfStartList.observedAt), tcpUnit(R19.xfStartList, { WX1_XF_26: '2026-04-26' }), tcpUnit(R19.xfFinal, { WX1_XF_26: '2026-04-26' })]);
    const before = JSON.stringify(core.standings());
    const s = core.standings();
    expect(s.length, 'the recorded final heat publishes a Standing').toBeGreaterThan(0);
    s[0]!.entries.length = 0;
    s[0]!.asOf = 'mutated';
    (s[0]!.scope as { kind: string }).kind = 'mutated';
    s.length = 0;
    expect(JSON.stringify(core.standings())).toBe(before);
  });
});
