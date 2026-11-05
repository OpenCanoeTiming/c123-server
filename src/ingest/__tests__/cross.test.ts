import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, statusOf, withAttr } from './helpers.js';

// DERIVATIONS §4.2. Raw: resultsHeatOrderOnly (cp3-cross 008, WX1_XS_26, every row Rank="" RankOrder 1-4),
// resultsHeatPlaced (WX1J_XS_26_JUN bib 7: HeatNr="2" StartTime="4" Time="3.00" Rank="4" RankOrder="4"), onCourseHeat (WX1J_XS_26_JUN bib 2,
// chStart="0" dtStart="" dtFinish="").
describe('§4.2 Kayak Cross status and order', () => {
  it('§4.2 RankOrder alone is the lane order, not a placement: no row of the heat is finished and none has a placement', () => {
    const els = parseTcp(TCP.resultsHeatOrderOnly, ctx());
    for (const bib of ['1', '4', '5', '8', '2', '3', '6', '7']) {
      const r = rowOf(els, 'WX1_XS_26', bib);
      expect(r.placement ?? null).toBeNull();
      expect(statusOf(els, 'WX1_XS_26', bib)).not.toBe('finished');
      expect(r.outcome?.kind).not.toBe('ordinal');
    }
  });
  it('§4.2 status becomes finished when the bib\'s row gains a non-empty Rank (WX1J_XS bib 7 Rank="4")', () => {
    const els = parseTcp(TCP.resultsHeatPlaced, ctx());
    expect(statusOf(els, 'WX1J_XS_26_JUN', '7')).toBe('finished');
  });
  it('§4.2 same row with Rank emptied (RankOrder kept) is not finished', () => {
    const els = parseTcp(withAttr(TCP.resultsHeatPlaced, 'Rank', '4', ''), ctx());
    expect(statusOf(els, 'WX1J_XS_26_JUN', '7')).not.toBe('finished');
  });
  it('§4.2 the finished status carries no eventTime, is authoritative, from the channel it arrived on', () => {
    const els = parseTcp(TCP.resultsHeatPlaced, ctx());
    const o = obsOf(els, 'status', { attemptId: 'WX1J_XS_26_JUN:7' });
    expect(o).toBeDefined();
    expect(o).toMatchObject({ source: 'tcp', confidence: 'authoritative' });
    expect(o).not.toHaveProperty('eventTime');
    expect(JSON.stringify(els)).not.toContain('eventTime');
  });
  it('§4.2 XML: Rnk non-empty gives finished for a heat row, source xml (WX1J_XS_26_JUN bib 1 Rnk 1)', () => {
    const els = parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
    expect(statusOf(els, 'WX1J_XS_26_JUN', '1')).toBe('finished');
    const o = obsOf(els, 'status', { attemptId: 'WX1J_XS_26_JUN:1' });
    expect(o).toBeDefined();
    expect(o).toMatchObject({ source: 'xml' });
  });
  it('§4.2 in a Cross heat a listing is on-course although chStart=0 and dtStart is empty (WX1J_XS bib 2)', () => {
    expect(obsOf(parseTcp(TCP.onCourseHeat, ctx()), 'status')).toMatchObject({ attemptId: 'WX1J_XS_26_JUN:2', value: 'on-course' });
  });
  it('§4.2 until a placement the Attempt stays on-course: a heat listing never yields finished or at-start', () => {
    const v = parseTcp(TCP.onCourseHeat, ctx()).filter((e: any) => e.field === 'status').map((e: any) => e.value);
    expect(v).toEqual(['on-course']);
  });
  it('§4.2 ordinal order is placement.order, never derived from Time: Time="3.00" and Rank 4 give order 4', () => {
    const r = rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7');
    expect(r.outcome).toEqual({ kind: 'ordinal', order: 4 });
    expect(r.placement).toEqual({ rank: 4, order: 4 });
  });
  it('§4.2 XML heat order is RnkOrder, not Time/1000 (<Time>1000</Time>, <RnkOrder>1</RnkOrder> in the semi-final; order 1)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1J_XS_26_JUN', '1');
    expect(r.outcome).toEqual({ kind: 'ordinal', order: 1 });
  });
  it('§4.2 a placed row with faults and a heat Time keeps the placement given, not a recomputed one (Pen="2", Rank="4")', () => {
    const r = rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7');
    expect(r.placement.rank).toBe(4);
    expect(JSON.stringify(r.outcome)).not.toContain('penaltySeconds');
  });
});
