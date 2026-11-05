import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, allObs, rowOf, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.8, §4.9. Raw: onCourseRunning (Position="2" Total="3", TTBDiff ""), onCourseFinished (Position="1", TTBDiff="+7.55" TTBName="K. KVAPIL"),
// tvs (Odd_Bib="55" Odd_RaceId="K1M_BR1_19" Even_Bib="54" Even_RaceId="K1M_BR1_19"), raceConfigCross (NrSplits="0").
const oc = (msg: string) => parseTcp(msg, ctx());
const ttb = (diff: string, name = 'X. Y') => obsOf(oc(withAttr(withAttr(TCP.onCourseFinished, 'TTBDiff', '+7.55', diff), 'TTBName', 'K. KVAPIL', name)), 'timeToBeat');

describe('§4.8 on-course extras', () => {
  it('§4.8 courseOrder is OnCourse@Position (bib 56: 2; bib 57: 1)', () => {
    expect(obsOf(oc(TCP.onCourseRunning), 'courseOrder')).toMatchObject({ attemptId: 'K1M_BR1_19:56', value: 2 });
    expect(obsOf(oc(TCP.onCourseFinished), 'courseOrder')?.value).toBe(1);
  });
  it('§4.8 a signed TTBDiff is mode delta (recorded "+7.55", holder "K. KVAPIL")', () => {
    expect(obsOf(oc(TCP.onCourseFinished), 'timeToBeat')?.value).toEqual({ mode: 'delta', seconds: 7.55, holder: 'K. KVAPIL' });
  });
  it('§4.8 a negative signed value is delta (-0.40)', () => {
    expect(ttb('-0.40')?.value).toMatchObject({ mode: 'delta', seconds: -0.4 });
  });
  it('§4.8 an unsigned value is mode target (88.38)', () => {
    expect(ttb('88.38')?.value).toMatchObject({ mode: 'target', seconds: 88.38 });
  });
  it('§4.8 an empty TTBDiff is not-yet (recorded running listing TTBDiff="")', () => {
    const o = obsOf(oc(TCP.onCourseRunning), 'timeToBeat');
    expect(o === undefined || o.state === 'not-yet').toBe(true);
  });
  it('§4.8 timeToBeat is never a rank (Rank="" on the listing; no placement from it)', () => {
    expect(allObs(oc(TCP.onCourseFinished), 'placement')).toEqual([]);
  });
  it('§4.8 splits are unavailable{not-applicable} when RaceConfig.NrSplits is 0', () => {
    expect(obsOf(parseTcp(TCP.raceConfigCross, ctx()), 'splits')).toMatchObject({ state: 'unavailable', reason: 'not-applicable' });
  });
  it('§4.8 featuredByUpstream inputs: TVS names Odd and Even bibs with their RaceIds (membership of the on-course list is the core\'s)', () => {
    const els = parseTcp(TCP.tvs, ctx());
    expect(JSON.stringify(els)).toContain('K1M_BR1_19:55');
    expect(JSON.stringify(els)).toContain('K1M_BR1_19:54');
  });
});

describe('§4.9 entry pointer', () => {
  it('§4.9 initial binding is the row\'s Id verbatim: OnCourse Id "66026.K1M"', () => {
    expect(obsOf(oc(TCP.onCourseFinished), 'entry', { attemptId: 'K1M_BR1_19:57' })?.value).toEqual({ entryId: '66026.K1M' });
  });
  it('§4.9 TCP result row: entry {entryId: "14034.K1M"} for bib 55', () => {
    expect(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '55').entry).toEqual({ entryId: '14034.K1M' });
  });
  it('§4.9 XML result row: entry is Results.Id (9047.K1M for bib 108)', () => {
    expect(rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108').entry).toEqual({ entryId: '9047.K1M' });
  });
  it('§4.9 no upstream field flags a correction: the Warning attribute is never carried as one', () => {
    const els = parseTcp(withAttr(TCP.onCourseFinished, 'Warning', '', 'Přepis výsledků'), ctx());
    expect(JSON.stringify(els)).not.toContain('Přepis');
  });
});
