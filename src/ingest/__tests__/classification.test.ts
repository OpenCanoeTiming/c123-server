import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, type El } from './helpers.js';

// DERIVATIONS §4.10. Raw: resultsXer (cp3-cross WX1_XER_26 rows: bib 4 Rank=1 RankOrder=1 Id 61039.WX1; bib 1 Rank=2 Id 9024.WX1),
// cross.xml (WX1_XER_26 bib 4: Rnk 1 RnkOrder 1 RecordType F).
// Round 18 (DERIVATIONS §0.5, §4.10): a classification table is a scope snapshot of ClassificationRows and nothing else.
const classif = (els: unknown, phaseId: string): El | undefined => {
  const e = (els as El[]).find((x) => x.snapshot?.phaseId === phaseId);
  return e && { ...e.snapshot, observedAt: e.observedAt };
};
const noAttempts = (els: unknown) => (els as El[]).filter((e) => e.attemptId);

describe('§4.10 classification rows', () => {
  it('§4.10 TCP XER rows feed a classification snapshot with rank and order from Rank/RankOrder', () => {
    const c = classif(parseTcp(TCP.resultsXer, ctx()), 'WX1_XER_26')!;
    expect(c.rows.map((r: El) => [r.entryId, r.bib, r.rank, r.order])).toEqual([['61039.WX1', '4', 1, 1], ['9024.WX1', '1', 2, 2]]);
  });
  it('§4.10 they create no Attempts: no attempt observation', () => {
    expect(noAttempts(parseTcp(TCP.resultsXer, ctx()))).toEqual([]);
  });
  it('§4.10 the snapshot carries the ingest time of the observation (ctx.observedAt), from which the core dates asOf', () => {
    expect(Date.parse(classif(parseTcp(TCP.resultsXer, ctx()), 'WX1_XER_26')!.observedAt)).toBe(Date.parse('2026-09-19T08:00:00.000Z'));
  });
  it('§4.10 XML XER row: rank/order from Rnk/RnkOrder and decidedIn from RecordType (F)', () => {
    const c = classif(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1_XER_26')!;
    expect(c.rows).toEqual([expect.objectContaining({ entryId: '61039.WX1', bib: '4', rank: 1, order: 1, decidedIn: 'F' })]);
  });
  it('§4.10 XML XER creates no Attempts (its snapshot rows are ClassificationRows, not Attempt rows)', () => {
    const els = parseXmlSnapshot(xmlFixture('cross.xml'), ctx()) as El[];
    for (const e of els.filter((x) => x.snapshot?.phaseId === 'WX1_XER_26')) for (const r of e.snapshot.rows) expect(r).not.toHaveProperty('outcome');
    expect(els.filter((e) => typeof e.attemptId === 'string' && e.attemptId.startsWith('WX1_XER_26'))).toEqual([]);
  });
  it.each(['SLER', 'WWER'])('§4.10 %s is a classification too (synthetic RaceId on the recorded XER message)', (tok) => {
    const msg = TCP.resultsXer.replace('WX1_XER_26', `WX1_${tok}_26`);
    expect(classif(parseTcp(msg, ctx()), `WX1_${tok}_26`)).toBeDefined();
    expect(noAttempts(parseTcp(msg, ctx()))).toEqual([]);
  });
  it('§4.10 the rows are relayed, never recomputed: a TCP Rank that skips (Rank="3" for the first row) stays 3', () => {
    const msg = TCP.resultsXer.replace('Rank="1" RankOrder="1"', 'Rank="3" RankOrder="1"');
    expect(classif(parseTcp(msg, ctx()), 'WX1_XER_26')!.rows[0]).toMatchObject({ rank: 3, order: 1 });
  });
  it('§4.10 an empty Rank in a classification row is rank null (synthetic)', () => {
    const msg = TCP.resultsXer.replace('Rank="2" RankOrder="2"', 'Rank="" RankOrder="2"');
    expect(classif(parseTcp(msg, ctx()), 'WX1_XER_26')!.rows[1]).toMatchObject({ rank: null, order: 2 });
  });
});
