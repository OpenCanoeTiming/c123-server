import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, unparseable, obsOf, type El } from './helpers.js';

// DERIVATIONS §0.4. slalom.xml contains, recorded: Schedule RaceId "<unassigned>" (DisId SR) and Classes NA
// ("Not entered/assigned"). The TCP and XML-Results sentinel rows below are SYNTHETIC variants of recorded rows
// (no recording carries a TCP row for the sentinel): the recorded row text with RaceId replaced and, on TCP, Id/Name emptied.
const UNASSIGNED_TCP_ONCOURSE = TCP.onCourseRunning
  .replace('RaceId="K1M_BR1_19"', 'RaceId="&lt;unassigned&gt;"').replace('Id="103003.K1M"', 'Id=""').replace('Name="ŠAMÁNEK Filip"', 'Name=""');
const UNASSIGNED_TCP_RESULTS = TCP.resultsBr1.replace('RaceId="K1M_BR1_19"', 'RaceId="&lt;unassigned&gt;"')
  .replace(/Id="[^"]*" Name="[^"]*"/g, 'Id="" Name=""');
const withExtraXmlRow = (): string => {
  const x = xmlFixture('slalom.xml');
  const row = x.match(/<Results>(?:(?!<\/Results>)[\s\S])*K1M_BR1_19[\s\S]*?<\/Results>/)![0];
  return x.replace('</Canoe123Data>', row.replace('<RaceId>K1M_BR1_19</RaceId>', '<RaceId>&lt;unassigned&gt;</RaceId>') + '\r\n</Canoe123Data>');
};
const mentions = (els: unknown, s: string): boolean => JSON.stringify(els).includes(s);

describe('§0.4 ingest filters', () => {
  it('§0.4 staged-without-race sentinel: an OnCourse row with RaceId "<unassigned>" never becomes an Attempt', () => {
    const els = parseTcp(UNASSIGNED_TCP_ONCOURSE, ctx());
    expect(els.filter((e: El) => e.attemptId)).toEqual([]);
    expect(mentions(els, 'unassigned')).toBe(false);
    expect(unparseable(els)).toEqual([]);
  });
  it('§0.4 staged-without-race sentinel: a TCP Results message for RaceId "<unassigned>" never becomes a Phase', () => {
    const els = parseTcp(UNASSIGNED_TCP_RESULTS, ctx());
    expect(els.filter((e: El) => e.snapshot)).toEqual([]);
    expect(mentions(els, 'unassigned')).toBe(false);
    expect(unparseable(els)).toEqual([]);
  });
  it('§0.4 the snapshot pseudo-schedule row "<unassigned>" never becomes a Phase', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    expect(mentions(els, 'unassigned')).toBe(false);
  });
  it('§0.4 XML Results rows with RaceId "<unassigned>" never become Attempts or a snapshot', () => {
    const els = parseXmlSnapshot(withExtraXmlRow(), ctx());
    expect(mentions(els, 'unassigned')).toBe(false);
    expect((els as El[]).filter((e) => e.snapshot).map((e) => e.snapshot.phaseId).sort()).toEqual(['K1M_BR1_19', 'K1M_BR2_19']);
  });
  it('§0.4 the sentinel filter drops only the sentinel: the real BR1 snapshot keeps its row', () => {
    const els = parseXmlSnapshot(withExtraXmlRow(), ctx()) as El[];
    const br1 = els.find((e) => e.snapshot?.phaseId === 'K1M_BR1_19')!;
    expect(br1.snapshot.rows).toHaveLength(1);
  });
  it('§0.4 the pseudo-class NA ("Not entered/assigned") never becomes a Class', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()) as El[];
    expect(els.some((e) => e.classId === 'NA')).toBe(false);
    expect(mentions(els, 'Not entered')).toBe(false);
  });
  it('§0.4 the NA filter drops only NA: class K1M is still produced', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    expect(obsOf(els, 'name', { classId: 'K1M' })?.value).toBe('K1 muži');
  });
  it('§0.4 row-number, print, finance and UI columns are never carried (CheckListPrintIndex, EntryFee, Tag, Selected, Draw, Ranking, RankingPoints, Number)', () => {
    const json = JSON.stringify([parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), parseTcp(TCP.resultsBr1, ctx())]).toLowerCase();
    for (const k of ['checklist', 'entryfee', '"selected"', '"draw"', 'rankingpoints', '"tag"']) expect(json).not.toContain(k);
  });
  it('§0.4 _Bib is not read as a bib (participant 9047.K1M: <_Bib>2</_Bib>, <EventBib>108</EventBib>)', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    expect(obsOf(els, 'eventBib', { entryId: '9047.K1M' })?.value).toBe('108');
    expect((els as El[]).some((e) => e.bib === '2')).toBe(false);
  });
});
