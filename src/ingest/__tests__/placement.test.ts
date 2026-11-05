import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, rowOf, instant, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.7. Raw: resultsBr1 (bib 55 Rank 1, bib 83 Rank 2, StartOrder 63, StartTime 9:56:20), resultsBr1Marks (Rank "" RankOrder 105/106),
// resultsBr2 (bib 108 Rank=20 RankOrder=20), slalom.xml (BR2 bib 108: Rnk 29 RnkOrder 29 TotalRnk 20 TotalRnkOrder 20; bib 1: TotalRnk 8, no Time),
// resultsHeatPlaced (HeatNr 2, StartTime "4"), cross.xml (WX1J_XS bib 1: HeatNr 1, StartTime "1", Qualified Q).
const slalomXml = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
describe('§4.7 placement, pairTotal, countingRun, qualified, heats', () => {
  it('§4.7 single/first run TCP: placement {rank: Rank, order: RankOrder} (bib 83: 2/2)', () => {
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83').placement).toEqual({ rank: 2, order: 2 });
  });
  it('§4.7 first-run XML: Rnk, RnkOrder (BR1 bib 108: 20/20)', () => {
    expect(rowOf(slalomXml(), 'K1M_BR1_19', '108').placement).toEqual({ rank: 20, order: 20 });
  });
  it('§4.7 second run XML: the combined TotalRnk/TotalRnkOrder (20/20), not the run-2-only Rnk/RnkOrder (29/29)', () => {
    expect(rowOf(slalomXml(), 'K1M_BR2_19', '108').placement).toEqual({ rank: 20, order: 20 });
  });
  it('§4.7 second run TCP: Rank/RankOrder as the combined values (bib 108: 20/20)', () => {
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').placement).toEqual({ rank: 20, order: 20 });
  });
  it('§4.7 an empty Rank means no placement: DNS rows with RankOrder 105 and 106 have placement null', () => {
    const els = parseTcp(TCP.resultsBr1Marks, ctx());
    expect(rowOf(els, 'K1M_BR1_19', '64').placement).toBeNull();
    expect(rowOf(els, 'K1M_BR1_19', '68').placement).toBeNull();
  });
  it('§4.7 RankOrder alone is carried for no one (the 105 never appears as an order)', () => {
    expect(JSON.stringify(parseTcp(TCP.resultsBr1Marks, ctx()).filter((e: El) => e.snapshot))).not.toMatch(/"order":10[56]/);
  });
  it('§4.7 a ral row with a Rank carries a placement (synthetic IRM="RAL" on bib 83 which keeps Rank="2")', () => {
    const parts = TCP.resultsBr1.split('<Row ');
    parts[2] = parts[2].replace('IRM=""', 'IRM="RAL"');
    const r = rowOf(parseTcp(parts.join('<Row '), ctx()), 'K1M_BR1_19', '83');
    expect(r.placement).toEqual({ rank: 2, order: 2 });
    expect(r.outcome).toEqual({ kind: 'no-result', status: 'ral' });
  });
  it('§4.7 OnCourse.Result[T]@Rank is never a placement', () => {
    const els = parseTcp(withAttr(TCP.onCourseRunning, 'Rank', '', '7'), ctx());
    expect((els as El[]).filter((e) => e.field === 'placement')).toEqual([]);
  });
  it('§4.7 pairTotal: TCP second run = Result@Total (88.38), XML = TotalTotal/1000 (88.38); a first-run row has none', () => {
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').pairTotal).toBe(88.38);
    expect(rowOf(slalomXml(), 'K1M_BR2_19', '108').pairTotal).toBe(88.38);
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83').pairTotal).toBeUndefined();
    expect(rowOf(slalomXml(), 'K1M_BR1_19', '108').pairTotal).toBeUndefined();
  });
  it('§4.7 a second-run Attempt that has not run still has the combined placement and pairTotal (XML bib 1: TotalRnk 8, TotalTotal 82800)', () => {
    const r = rowOf(slalomXml(), 'K1M_BR2_19', '1');
    expect(r.placement).toEqual({ rank: 8, order: 8 });
    expect(r.pairTotal).toBe(82.8);
  });
  it('§4.7 countingRun is XML only: BetterRunNr 1 on the second-run XML row; absent on TCP', () => {
    expect(rowOf(slalomXml(), 'K1M_BR2_19', '108').countingRun).toBe(1);
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').countingRun).toBeUndefined();
  });
  it('§4.7 heat is HeatNr (TCP 2, XML 1); zero means not applicable', () => {
    expect(rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7').heat).toBe(2);
    expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1J_XS_26_JUN', '1').heat).toBe(1);
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83').heat).toEqual({ state: 'unavailable', reason: 'not-applicable' });
  });
  it('§4.7 startLane: in Cross heats StartTime carries the lane (TCP "4"; XML "1"), not a time', () => {
    expect(rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7').startLane).toBe(4);
    expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1J_XS_26_JUN', '1').startLane).toBe(1);
    expect(rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7').scheduledStart).toEqual({ state: 'unavailable', reason: 'not-applicable' });
  });
  it('§4.7 scheduledStart: in slalom StartTime H:MM:SS is the scheduled start built per §0.2 (bib 55 "9:56:20" = 07:56:20Z)', () => {
    expect(instant(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '55').scheduledStart)).toBe(Date.UTC(2026, 8, 19, 7, 56, 20));
  });
  it('§4.7 startOrder is @StartOrder (bib 55: 63)', () => {
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '55').startOrder).toBe(63);
  });
  it('§4.7 qualified: Q="Q" -> true on a progression format (junior time trial bib 12); XML <Qualified>Q</Qualified> -> true', () => {
    expect(rowOf(parseTcp(TCP.resultsJuniorXt, ctx()), 'MX1J_XT_26_JUN', '12').qualified).toBe(true);
    expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1J_XS_26_JUN', '1').qualified).toBe(true);
  });
  it('§4.7 round 17 ruling 14: qualified is known false on a run Phase without a cut (slalom BR1), not unavailable', () => {
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83').qualified).toBe(false);
  });
  it('§4.7 Behind is not placement data and Category ranks are not read from rows without CatId (XML bib 1 has <CatId />)', () => {
    expect(JSON.stringify(rowOf(slalomXml(), 'K1M_BR2_19', '1'))).not.toMatch(/atRnk|categoryRank/);
  });
});
