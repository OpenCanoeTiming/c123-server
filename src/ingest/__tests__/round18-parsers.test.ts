/**
 * #253 rows 15-17: parsers after contract round 18. DERIVATIONS §0.3 (mode, empty table), §0.5, §4.10, §2.3;
 * CONTRACTS §2.12. Both parsers, tcp and xml.
 */
import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { XML } from './fixtures/xml.js';
import { ctx, xmlFixture, obsOf, type El } from './helpers.js';

const snap = (els: unknown, phaseId: string): El | undefined => (els as El[]).find((e) => e.snapshot?.phaseId === phaseId)?.snapshot;
const xer = (rows: string): string => xmlFixture('cross.xml').replace(/<Results>\s*<RaceId>WX1_XER_26<\/RaceId>[\s\S]*?<\/Results>/, rows);
const xerRow = (bib: string, rnk: string): string =>
  `<Results><RaceId>WX1_XER_26</RaceId><Id>61039.WX1</Id><StartOrder>1</StartOrder><Bib>${bib}</Bib><Status /><Rnk>${rnk}</Rnk><RnkOrder>1</RnkOrder><RecordType>F</RecordType></Results>`;
const tcpXer = (rows: string): string =>
  `<Canoe123 System="Main"><Results RaceId="WX1_XER_26" ClassId="WX1" Current="N" MainTitle="Women's Kayak Cross" SubTitle="Results">${rows}</Results></Canoe123>`;

describe('row 15 no on-site classification push (DERIVATIONS §0.5, §4.10)', () => {
  it('§0.5 the TCP parser emits no {push:"classification"} element; the snapshot stays', () => {
    const els = parseTcp(TCP.resultsXer, ctx()) as El[];
    expect(els.filter((e) => e.push !== undefined)).toEqual([]);
    expect(snap(els, 'WX1_XER_26')?.rows).toHaveLength(2);
  });
  it('§0.5 the XML parser emits no {push:"classification"} element; the snapshot stays', () => {
    const els = parseXmlSnapshot(xmlFixture('cross.xml'), ctx()) as El[];
    expect(els.filter((e) => e.push !== undefined)).toEqual([]);
    expect(snap(els, 'WX1_XER_26')?.rows).toHaveLength(1);
  });
  it('§0.5 no recorded XML fixture yields any push element', () => {
    for (const name of Object.keys(XML)) expect((parseXmlSnapshot(xmlFixture(name), ctx()) as El[]).filter((e) => 'push' in e)).toEqual([]);
  });
});

describe('row 16 structural mode of a classification snapshot (DERIVATIONS §0.3)', () => {
  it('§0.3 XML: a ranked row gives results mode (recorded XER bib 4, Rnk 1)', () => {
    expect(snap(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1_XER_26')).toMatchObject({ source: 'xml', mode: 'results' });
  });
  it('§0.3 XML: no rank on any row gives start-list mode, rows kept', () => {
    const s = snap(parseXmlSnapshot(xer(xerRow('4', '')), ctx()), 'WX1_XER_26')!;
    expect(s.mode).toBe('start-list');
    expect(s.rows).toHaveLength(1);
    expect(s.rows[0].rank).toBeNull();
  });
  it('§0.3 XML: any rank non-null among nulls gives results mode', () => {
    const s = snap(parseXmlSnapshot(xer(xerRow('4', '') + xerRow('5', '2')), ctx()), 'WX1_XER_26')!;
    expect(s.mode).toBe('results');
  });
  it('§0.3 XML: an XER race with no Results row is an empty table: start-list mode, rows []', () => {
    const s = snap(parseXmlSnapshot(xer(''), ctx()), 'WX1_XER_26')!;
    expect(s).toMatchObject({ source: 'xml', mode: 'start-list', rows: [] });
  });
  it('§0.3 TCP: a ranked row gives results mode (recorded XER)', () => {
    expect(snap(parseTcp(TCP.resultsXer, ctx()), 'WX1_XER_26')).toMatchObject({ source: 'tcp', mode: 'results' });
  });
  it('§0.3 TCP: both ranks empty gives start-list mode', () => {
    const msg = TCP.resultsXer.replace('Rank="1" RankOrder="1"', 'Rank="" RankOrder="1"').replace('Rank="2" RankOrder="2"', 'Rank="" RankOrder="2"');
    const s = snap(parseTcp(msg, ctx()), 'WX1_XER_26')!;
    expect(s.mode).toBe('start-list');
    expect(s.rows).toHaveLength(2);
  });
  it('§0.3 TCP: a Results message of a classification with no row is a start-list snapshot with rows []', () => {
    expect(snap(parseTcp(tcpXer(''), ctx()), 'WX1_XER_26')).toMatchObject({ source: 'tcp', mode: 'start-list', rows: [] });
  });
  it('§0.3 RXER stays skipped by both parsers (a title that never carries rows, §4.10)', () => {
    const msg = TCP.resultsXer.replaceAll('WX1_XER_26', 'WX1_RXER_26');
    expect((parseTcp(msg, ctx()) as El[]).filter((e) => e.snapshot || e.push)).toEqual([]);
    const x = xmlFixture('cross.xml').replaceAll('WX1_XER_26', 'WX1_RXER_26').replace('<DisId>XER</DisId>', '<DisId>RXER</DisId>');
    expect((parseXmlSnapshot(x, ctx()) as El[]).filter((e) => e.snapshot?.phaseId === 'WX1_RXER_26')).toEqual([]);
  });
});

describe('row 17 sector ends (CONTRACTS §2.12, DERIVATIONS §2.3)', () => {
  const ends = (els: unknown, id: string) => obsOf(els as any, 'sectorEndsAfterGate', { courseId: id })?.value as number[] | undefined;
  const strictlyIncreasing = (a: number[]) => a.every((v, i) => i === 0 || v > a[i - 1]!);
  it('§2.3 "DSNSNSRSNSNSNSESRS" gives [1,2,3,4,5,6,7]: the S after the roll zone repeats gate 6 and adds nothing', () => {
    expect(ends(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), '1')).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('§2.12 strictly increasing on every recorded layout, every XML fixture', () => {
    let seen = 0;
    for (const name of Object.keys(XML)) {
      const els = parseXmlSnapshot(xmlFixture(name), ctx()) as El[];
      for (const e of els.filter((x) => x.field === 'sectorEndsAfterGate')) {
        expect(strictlyIncreasing(e.value), `${name} course ${e.courseId}`).toBe(true);
        seen++;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(4);
  });
  it('§2.12 synthetic: doubled S markers and a layout starting with S give a strictly increasing list', () => {
    const x = xmlFixture('cross.xml').replace('<CourseConfig>NNRNSNINRNSNRNRS</CourseConfig>', '<CourseConfig>SNNSSNNSS</CourseConfig>');
    expect(ends(parseXmlSnapshot(x, ctx()), '2')).toEqual([2, 4]);
  });
});
