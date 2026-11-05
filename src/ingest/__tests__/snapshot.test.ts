import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, snapshotOf, rowOf, type El } from './helpers.js';

// DERIVATIONS §0.3. Raw: fixtures/tcp.ts, fixtures/slalom.xml.
// Header-only Results message, recorded (cp3-cross 003 ts 25526):
const HEADER_ONLY =
  '<Canoe123 System="Main"><Results RaceId="WX1J_XF_26_JUN" ClassId="WX1J" Current="N" MainTitle="Women\'s Kayak Cross Juniors" SubTitle="Finals - Start List" /></Canoe123>';

describe('§0.3 scope snapshots', () => {
  it('§0.3 a TCP Results message is one scope snapshot of the race it names, source tcp', () => {
    const els = parseTcp(TCP.resultsBr1, ctx()) as El[];
    expect(els.filter((e) => e.snapshot)).toHaveLength(1);
    const s = snapshotOf(els);
    expect(s).toMatchObject({ source: 'tcp', phaseId: 'K1M_BR1_19' });
    expect(s.rows).toHaveLength(2);
  });
  it('§0.3 results mode when any row carries a placement (bib 55 Rank="1")', () => {
    expect(snapshotOf(parseTcp(TCP.resultsBr1, ctx())).mode).toBe('results');
  });
  it('§0.3 results mode when any row carries a mark only (DNS rows, Rank="" IRM="DNS")', () => {
    expect(snapshotOf(parseTcp(TCP.resultsBr1Marks, ctx())).mode).toBe('results');
  });
  it('§0.3 start-list mode when no row carries a placement or a mark (WX1_XT_26 start list, Rank="" IRM="")', () => {
    const s = snapshotOf(parseTcp(TCP.resultsStartList, ctx()));
    expect(s.mode).toBe('start-list');
    expect(s.rows.map((r: El) => r.bib)).toEqual(['25', '24', '23']);
  });
  it('§0.3 mode is read structurally: a Cross heat whose rows carry RankOrder 1-4 but empty Rank is start-list mode', () => {
    const s = snapshotOf(parseTcp(TCP.resultsHeatOrderOnly, ctx()));
    expect(s.mode).toBe('start-list');
    expect(s.rows).toHaveLength(8);
  });
  it('§0.3 mode does not rely on the " - Start List" subtitle: same rows, subtitle removed, still start-list', () => {
    const msg = TCP.resultsStartList.replace(' - Start List', '');
    expect(snapshotOf(parseTcp(msg, ctx())).mode).toBe('start-list');
  });
  it('§0.3 mode does not rely on the subtitle: results rows under a " - Start List" subtitle are results mode', () => {
    const msg = TCP.resultsBr1.replace('SubTitle="1st Run"', 'SubTitle="1st Run - Start List"');
    expect(snapshotOf(parseTcp(msg, ctx())).mode).toBe('results');
  });
  it('§0.3 a header-only Results message (no rows) is a start-list snapshot with no rows', () => {
    const s = snapshotOf(parseTcp(HEADER_ONLY, ctx()));
    expect(s).toMatchObject({ phaseId: 'WX1J_XF_26_JUN', mode: 'start-list', rows: [] });
  });
  it('§0.3 an XML snapshot is a snapshot of every race in it, source xml', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()) as El[];
    const snaps = els.filter((e) => e.snapshot).map((e) => e.snapshot);
    expect(snaps.map((s) => s.phaseId).sort()).toEqual(['K1M_BR1_19', 'K1M_BR2_19']);
    expect(snaps.every((s) => s.source === 'xml')).toBe(true);
    expect(snaps.find((s) => s.phaseId === 'K1M_BR1_19')!.rows).toHaveLength(1);
    expect(snaps.find((s) => s.phaseId === 'K1M_BR2_19')!.rows).toHaveLength(3);
  });
  it('§0.3 finishTime is on XML rows only: XML BR2 bib 108 has it, TCP BR2 bib 108 does not', () => {
    const x = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    const t = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    expect(x.finishTime).toBeDefined();
    expect(t).not.toHaveProperty('finishTime');
    expect(JSON.stringify(t)).not.toContain('eventTime');
  });
  it('§0.3 timeEmpty: a second-run XML row with no <Time> (bib 1: TotalTotal 82800, no Time, no dtFinish) has timeEmpty true', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '1');
    expect(r.timeEmpty).toBe(true);
  });
  it('§0.3 timeEmpty is not set on a second-run row that has run 2\'s time (bib 108)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(r.timeEmpty).toBeFalsy();
  });
  it('§0.3 a row that carries nothing states no result (XML BR2 bib 1 has no outcome)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '1');
    expect(r.outcome).toBeUndefined();
  });
});
