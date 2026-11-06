import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, rowOf, obsOf, penalties, instant, snapshotOf } from './helpers.js';

// DERIVATIONS §0.1. Raw lines are in fixtures/tcp.ts and fixtures/*.xml; expected values were read by hand from them.

describe('§0.1 units', () => {
  it('§0.1 run time, total: TCP formatted seconds (nkz-19so Results K1M_BR1_19 bib 83: Time="87.30" Total="87.30")', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83');
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 87.3, totalSeconds: 87.3 });
  });
  it('§0.1 run time, total: XML integer milliseconds (slalom.xml K1M_BR1_19 bib 108: <Time>88380</Time> <Total>88380</Total>)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108');
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 88.38, totalSeconds: 88.38, penaltySeconds: 0 });
  });
  it('§0.1 running time is whole seconds, space-padded (OnCourse K1M_BR1_19 bib 56: Time="65   ")', () => {
    const els = parseTcp(TCP.onCourseRunning, ctx());
    expect(obsOf(els, 'outcome')?.value).toMatchObject({ kind: 'running', elapsedSeconds: 65 });
  });
  it('§0.1 penalty is integer seconds on both interfaces (TCP bib 89 Pen="4"; XML bib 108 BR2 <Pen>152</Pen>)', () => {
    const tcp = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '89');
    expect(tcp.outcome).toMatchObject({ penaltySeconds: 4 });
    const xml = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(xml.outcome).toMatchObject({ penaltySeconds: 152 });
  });
  it('§0.1 second-run combined total: TCP Total="88.38" and XML <TotalTotal>88380</TotalTotal> give the same pairTotal (bib 108)', () => {
    const tcp = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    const xml = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(tcp.pairTotal).toBe(88.38);
    expect(xml.pairTotal).toBe(88.38);
  });
  it('§0.1 gate penalties on a result row: TCP and XML fixed width give the same Gate[] for the same fact (BR2 bib 108)', () => {
    const tcp = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    const xml = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(penalties(tcp.gates)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 50, 0, 0, 0, 50, 0, 50, 0]);
    expect(xml.gates).toEqual(tcp.gates);
  });
  it('§0.1 time of day (finish) becomes eventTime via §0.2, TCP (OnCourse dtFinish="9:55:46.920", 2026-09-19 CEST = 07:55:46.920Z)', () => {
    const st = obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'status');
    expect(instant(st?.eventTime)).toBe(Date.UTC(2026, 8, 19, 7, 55, 46, 920));
  });
  it('§0.1 time of day (finish), XML <dtFinish>09:22:29.420</dtFinish> BR1 bib 108 = 07:22:29.420Z', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108');
    expect(instant(r.finishTime)).toBe(Date.UTC(2026, 8, 19, 7, 22, 29, 420));
  });
  it('§0.1 bib is trimmed: Results Bib="  55" -> "55"; OnCourse Bib="57" -> "57"; XML <Bib> 108</Bib> -> "108"', () => {
    expect(snapshotOf(parseTcp(TCP.resultsBr1, ctx())).rows.map((r: any) => r.bib)).toEqual(['55', '83']);
    expect(obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'status')?.attemptId).toBe('K1M_BR1_19:57');
    const bibs = snapshotOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19').rows.map((r: any) => r.bib);
    expect(bibs).toContain('108');
    expect(bibs).toContain('1');
  });
  it('§0.1 "behind" gaps are not relayed (Results Behind="+38.66")', () => {
    const json = JSON.stringify(parseTcp(TCP.resultsBr1, ctx()));
    expect(json).not.toContain('38.66');
    expect(json.toLowerCase()).not.toContain('behind');
  });
  it('§0.1 an empty attribute is absent, never zero (start-list row Time="" Total="")', () => {
    const r = rowOf(parseTcp(TCP.resultsStartList, ctx()), 'WX1_XT_26', '25');
    expect(r.outcome?.kind === 'duration').toBeFalsy();
    expect(JSON.stringify(r)).not.toMatch(/"runSeconds":0|"totalSeconds":0|"penaltySeconds":0/);
  });
  it('§0.1 an empty attribute is absent: DNS row Time="" gives no time', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1Marks, ctx()), 'K1M_BR1_19', '64');
    expect(r.status).toBe('dns'); // round 20 code item 18: the parser never emits no-result (CONTRACTS §2.6); a mark with no time states no outcome
    expect(r.outcome).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('runSeconds');
  });
});
