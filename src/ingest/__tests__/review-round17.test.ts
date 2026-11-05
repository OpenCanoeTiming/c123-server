import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, statusOf, diagnostics, slalomSlots, withAttr, type El } from './helpers.js';

// Review of PR #246 (O4, corrections) and design round 17 (docs/arch/DERIVATIONS §0.5, §4.6, §4.4, §2.1, §4.10; CONTRACTS §1.2, §2.6, §2.7).
// ASSUMED shape (DERIVATIONS §0.5 says "the parsed cells as they stand" without a name): pre-bind cells are the field `cells`
// (row.cells on a result row, an observation `cells` on an OnCourse listing), values integers or null.
const schedule = (ids: string[]): string =>
  '<Canoe123 System="Main"><Schedule>' +
  ids.map((id, i) => `<Race Order="${i + 1}" RaceId="${id}" Race="x" MainTitle="x" SubTitle="x" ShortTitle="x" RaceStatus="0"><StartTime /></Race>`).join('') +
  '</Schedule></Canoe123>';
const unbound = () => ctx({ courses: {} });
const unknownTokens = (els: unknown) => diagnostics(els as any).filter((d) => d.kind === 'unknown-format-token');

describe('§0.5 / §4.6 no course bound: cells, no gates (round 17 ruling 5)', () => {
  it('§4.6 ruling 5: a TCP result row with no course in ctx carries the 30 parsed cells and no gates, faults or unparseable-cell', () => {
    const els = parseTcp(TCP.resultsBr1, unbound());
    const r = rowOf(els, 'K1M_BR1_19', '83');
    expect(r.gates).toBeUndefined();
    expect(r.cells).toHaveLength(30);
    expect(r.cells.slice(0, 23)).toEqual(Array(23).fill(0));
    expect(diagnostics(els)).toEqual([]);
  });
  it('§4.6 ruling 5: not unavailable{not-configured} either: that is the core\'s determination, from the snapshot', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1, unbound()), 'K1M_BR1_19', '83');
    expect(JSON.stringify(r)).not.toContain('not-configured');
  });
  it('§4.6 ruling 5: an OnCourse listing with no course carries every token as a cell (13 zeros, 10 blanks as null) and no gates', () => {
    const els = parseTcp(TCP.onCourseRunning, unbound());
    expect(obsOf(els, 'gates')).toBeUndefined();
    expect(obsOf(els, 'cells')?.value).toEqual([...Array(13).fill(0), ...Array(10).fill(null)]);
  });
  it('§4.6 ruling 5 / review row 23: cells beyond slotCount raise nothing (note remains in cell 7 of a 5-slot course)', () => {
    const c = ctx({ courses: { K1M_BR1_19: { courseId: '1', slots: slalomSlots(5) } } });
    const msg = TCP.resultsBr1;
    const g = msg.match(/Gates="([^"]*)"/)![1];
    const cells = g.match(/.{3}/g)!;
    cells[6] = 'poz';
    const els = parseTcp(msg.replace(g, cells.join('')), c);
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-cell')).toEqual([]);
  });
});

describe('§4.6(c) review O4: a non-integer member cell is reported', () => {
  const slots = slalomSlots(3);
  const cells = (a: string[]) => a.map((v) => v.padStart(3, ' ')).join('').padEnd(90, ' ');
  const team = (m1: string[]): string =>
    '<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">' +
    '<Schedule><RaceId>K1MT_TSR_19</RaceId><ClassId>K1MT</ClassId><DisId>TSR</DisId><StartTime>2026-09-19T10:00:00+02:00</StartTime><CourseNr>9</CourseNr><RaceStatus>3</RaceStatus></Schedule>' +
    `<Results><RaceId>K1MT_TSR_19</RaceId><Id>T.K1MT</Id><Bib>  7</Bib><Gates>${cells(['4', '52', '100'])}</Gates><Gates1>${cells(m1)}</Gates1><Gates2>${cells(['2', '50', '50'])}</Gates2><Gates3>${cells(['0', '0', '50'])}</Gates3><Time>90000</Time><Pen>0</Pen><Total>90000</Total><Rnk>1</Rnk><RnkOrder>1</RnkOrder></Results></Canoe123Data>`;
  const c = () => ctx({ courses: { K1MT_TSR_19: { courseId: '9', slots } }, phaseDates: { K1MT_TSR_19: '2026-09-19' } });
  it('§4.6(c) review O4: a note in a Gates1 cell (slot 2) is unparseable-cell with source xml, the attempt and the slot; the cell is null in memberPenalties', () => {
    const els = parseXmlSnapshot(team(['2', 'C', '0']), c());
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-cell')).toEqual([expect.objectContaining({ attemptId: 'K1MT_TSR_19:7', source: 'xml', slot: 2 })]);
    expect(rowOf(els, 'K1MT_TSR_19', '7').gates[1].memberPenalties[0]).toBeNull();
  });
  it('§4.6(c) review O4: a clean member row raises no unparseable-cell (control)', () => {
    expect(diagnostics(parseXmlSnapshot(team(['2', '2', '0']), c())).filter((d) => d.kind === 'unparseable-cell')).toEqual([]);
  });
});

describe('§0.4 / §2.1 format tokens (review corrections)', () => {
  it.each(['SP1', 'SP2'])('§2.1 review correction: %s is in CONTRACTS §2.4\'s table and raises no unknown-format-token', (tok) => {
    expect(unknownTokens(parseTcp(schedule([`K1M_${tok}_19`]), ctx({ phaseDates: {} })))).toEqual([]);
  });
  it('§2.1 a token outside the table (ZZZ9) raises unknown-format-token and the Phase is still built', () => {
    const els = parseTcp(schedule(['K1M_ZZZ9_19']), ctx({ phaseDates: {} }));
    expect(unknownTokens(els)).toHaveLength(1);
    expect(obsOf(els, 'stage', { phaseId: 'K1M_ZZZ9_19' })?.value).toBe('run');
  });
});

describe('§4.4 / §4.6(d) Kayak Cross time trial: penaltySeconds is the stated constant 0 (round 17 ruling 6)', () => {
  const xtFinished = (pen: string) => {
    let m = withAttr(TCP.onCourseArmed, 'dtStart', '', '9:40:00.000');
    m = withAttr(m, 'dtFinish', '', '9:41:27.600');
    m = withAttr(m, 'Time', '', '87.60');
    m = withAttr(m, 'Total', '0.00', '87.60');
    return withAttr(m, 'Pen', '0', pen);
  };
  it('§4.4 ruling 6: a TCP XT result row is duration{runSeconds, penaltySeconds: 0, totalSeconds = runSeconds} (bib 23: 87.6)', () => {
    expect(rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23').outcome).toEqual({ kind: 'duration', runSeconds: 87.6, penaltySeconds: 0, totalSeconds: 87.6 });
  });
  it('§4.4 ruling 6: an XT on-course finish is duration with penaltySeconds 0 and totalSeconds = runSeconds, even when Pen says 2 (Pen is ignored in Cross)', () => {
    expect(obsOf(parseTcp(xtFinished('2'), ctx()), 'outcome', { attemptId: 'WX1_XT_26:25' })?.value).toEqual({ kind: 'duration', runSeconds: 87.6, penaltySeconds: 0, totalSeconds: 87.6 });
  });
  it('§4.4 ruling 6: an XT running listing is running with penaltySeconds 0', () => {
    let m = withAttr(TCP.onCourseArmed, 'dtStart', '', '9:40:00.000');
    m = withAttr(m, 'Time', '', '12.34');
    expect(obsOf(parseTcp(m, ctx()), 'outcome', { attemptId: 'WX1_XT_26:25' })?.value).toMatchObject({ kind: 'running', elapsedSeconds: 12.34, penaltySeconds: 0 });
  });
  it('§4.4 ruling 6: an XT row from XML states penaltySeconds 0 too (WX1_XT_26 bib 23)', () => {
    expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1_XT_26', '23').outcome).toMatchObject({ kind: 'duration', penaltySeconds: 0, totalSeconds: 87.6 });
  });
});

describe('§4.2 / §4.4 untimed row (round 17 rulings 8, 9)', () => {
  const x = () => parseXmlSnapshot(xmlFixture('cross-untimed.xml'), ctx());
  it('§4.4 ruling 8: a placed junior XT row with no dtFinish is status finished (MX1J_XT_26_JUN bib 51)', () => {
    expect(statusOf(x(), 'MX1J_XT_26_JUN', '51')).toBe('finished');
  });
  it('§4.4 ruling 9: the parser flags the XML row untimed: true, resolved for the vectors (bib 51)', () => {
    expect(rowOf(x(), 'MX1J_XT_26_JUN', '51').untimed).toBe(true);
  });
  it('§4.4 ruling 9: a timed row is not flagged untimed (WX1_XT_26 bib 23)', () => {
    expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1_XT_26', '23').untimed ?? false).toBe(false);
  });
});

describe('§4.10 decidedIn is nullable and verbatim (round 17 ruling 10)', () => {
  const classif = (els: unknown): El => (els as El[]).find((e) => e.push === 'classification')!;
  it('§4.10 ruling 10: a TCP classification row has decidedIn null (TCP carries no RecordType); the key is present', () => {
    for (const r of classif(parseTcp(TCP.resultsXer, ctx())).body.rows) expect(r).toHaveProperty('decidedIn', null);
  });
  it('§4.10 ruling 10: the XML RecordType is relayed verbatim as the round token, not a format: SF stays "SF"', () => {
    const x = xmlFixture('cross.xml').replace('<RecordType>F</RecordType>', '<RecordType>SF</RecordType>');
    expect(x).toContain('<RecordType>SF</RecordType>');
    expect(classif(parseXmlSnapshot(x, ctx())).body.rows[0]).toMatchObject({ decidedIn: 'SF' });
  });
});

describe('§2.1 pair.siblingPhaseId is nullable (round 17 rulings 15, CQ-B)', () => {
  const pair = (ids: string[], id: string) => obsOf(parseTcp(schedule(ids), ctx({ phaseDates: {} })), 'pair', { phaseId: id })?.value;
  it('§2.1 ruling 15: a second-run token with no resolvable first run keeps role and combination and states siblingPhaseId null (BR2 alone)', () => {
    expect(pair(['K1M_BR2_19'], 'K1M_BR2_19')).toEqual({ role: 'second', siblingPhaseId: null, combination: 'best' });
  });
  it('§2.1 ruling 15: a first-run token with no second run likewise (BR1 alone: role first, siblingPhaseId null)', () => {
    expect(pair(['K1M_BR1_19'], 'K1M_BR1_19')).toEqual({ role: 'first', siblingPhaseId: null, combination: 'best' });
  });
  it('§2.1 CQ-B: NHT2 has pair null until open item 21 is answered', () => {
    expect(pair(['K1M_NHT2_19'], 'K1M_NHT2_19') ?? null).toBeNull();
  });
});
