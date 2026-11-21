import { describe, it, expect } from 'vitest';
import { DUP } from './fixtures/duplicate-finish-excerpts.js';
import { attrOf, connected, coreWith, instantOf, tcpUnit, type Unit } from './streams.js';

// #340, tier 2: one recorded TCP `duplicate-finish` (DERIVATIONS §4.12 "Duplicate finishes", §10 item 20; CONTRACTS §2.6, §4 Diagnostic kinds)
// through parseTcp and createMergeCore. jarni-ne-odp C1M_BR1_19: bib 64 is reported finished at dtFinish 13:39:27.400 (11:39:26.983Z received);
// 14 s later bib 65 is reported finished at the very same dtFinish (11:39:41.191Z). Expected values are read from the recorded messages
// (attrOf), never from an implementation. The recording holds no connection records: the `connected` first is synthetic (TEST-ARCHITECTURE §9).

const DAY = { C1M_BR1_19: '2026-04-19' };
const PHASE = 'C1M_BR1_19';
const A64 = `${PHASE}:64`;
const A65 = `${PHASE}:65`;
const stream = (through: 'd2First' | 'd3Second'): Unit[] => [
  connected(DUP.d1Running.observedAt),
  tcpUnit(DUP.d1Running, DAY),
  tcpUnit(DUP.d2First, DAY),
  ...(through === 'd3Second' ? [tcpUnit(DUP.d3Second, DAY)] : []),
];
const given = (r: { data: string }) => ({
  runSeconds: Number(attrOf(r.data, 'Result', 'Time')),
  penaltySeconds: Number(attrOf(r.data, 'Result', 'Pen')),
  totalSeconds: Number(attrOf(r.data, 'Result', 'Total')),
});
const finishOf = (r: { data: string }) => instantOf('2026-04-19', attrOf(r.data, 'Result', 'dtFinish'), '+02:00');
const duplicates = (core: ReturnType<typeof coreWith>) => (core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'duplicate-finish');

describe('jarni-ne-odp C1M_BR1_19 bibs 64 and 65 at dtFinish 13:39:27.400 (DERIVATIONS §4.12 "Duplicate finishes", §10 item 20)', () => {
  it('the excerpt is what the test says it is: two reports of one Phase carry the same dtFinish, for two bibs, and bib 65 has no finish before', () => {
    expect(attrOf(DUP.d2First.data, 'Participant', 'Bib')).toBe('64');
    expect(attrOf(DUP.d3Second.data, 'Participant', 'Bib')).toBe('65');
    expect(attrOf(DUP.d2First.data, 'Participant', 'RaceId')).toBe(PHASE);
    expect(attrOf(DUP.d3Second.data, 'Participant', 'RaceId')).toBe(PHASE);
    expect(attrOf(DUP.d2First.data, 'Result', 'dtFinish')).toBe('13:39:27.400');
    expect(attrOf(DUP.d3Second.data, 'Result', 'dtFinish')).toBe('13:39:27.400');
    expect(attrOf(DUP.d1Running.data, 'Participant', 'Bib')).toBe('65');
    expect(attrOf(DUP.d1Running.data, 'Result', 'dtFinish')).toBe('');
  });

  it('the first report (bib 64) raises no duplicate-finish: one finish on the Phase is not a duplicate', () => {
    expect(duplicates(coreWith(stream('d2First')))).toEqual([]);
  });

  it('the second report (bib 65, same dtFinish) raises one duplicate-finish naming both bibs and the shared finish instant', () => {
    const d = duplicates(coreWith(stream('d3Second')));
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ kind: 'duplicate-finish', phaseId: PHASE, finishTime: finishOf(DUP.d2First) });
    expect([...(d[0] as unknown as { bibs: string[] }).bibs].sort()).toEqual(['64', '65']);
  });

  it('nothing is auto-resolved: each Attempt keeps the finish and the time it was given, and the first one is unchanged by the second report', () => {
    const before = coreWith(stream('d2First')).presented(A64);
    const core = coreWith(stream('d3Second'));
    const w64 = given(DUP.d2First);
    const w65 = given(DUP.d3Second);
    for (const [id, want, rec] of [[A64, w64, DUP.d2First], [A65, w65, DUP.d3Second]] as const) {
      const p = core.presented(id);
      expect(p.status, id).toMatchObject({ state: 'known', value: 'finished' });
      expect(p.outcome, id).toMatchObject({ state: 'known', value: { kind: 'duration', ...want }, eventTime: finishOf(rec) });
    }
    expect(core.presented(A64)).toEqual(before);
    expect(core.attempts().map(String).sort()).toEqual([A64, A65]);
  });
});
