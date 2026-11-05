import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, penalties, diagnostics, slalomSlots, CROSS_SLOTS, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.6 (a)-(d); (e) is a merge rule of the core (recorded in the result file).
const N = null;
const only = (msg: string, bib: string): string => msg.split('<Row ').filter((p, i) => i === 0 || p.includes(`Bib="${bib}"`) || p.includes(`Bib="  ${bib}"`)).join('<Row ');
const zeros = (n: number) => Array(n).fill(0);

describe('§4.6 gate parsing', () => {
  describe('(a) OnCourse.Result[C]@Gates, comma separated', () => {
    it('§4.6(a) "0,0,0,0,0,0,0,0,0,0,0,0,0,,,,,,,,,," : 13 judged zeros then 10 blanks -> null, one entry per slot (23)', () => {
      const g = obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'gates')?.value as El[];
      expect(g).toHaveLength(23);
      expect(penalties(g)).toEqual([...zeros(13), ...Array(10).fill(N)]);
      expect(g.map((x) => x.number)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    });
    it('§4.6(a) "2,0,0,0,0,2,0,0,0,0,2,0,..." -> penalties 2 at gates 1, 6, 11 (bib 57)', () => {
      const g = obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'gates')?.value as El[];
      expect(penalties(g)).toEqual([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, ...zeros(12)]);
    });
    it('§4.6(a) null is never coerced to 0 (empty token stays null)', () => {
      const g = obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'gates')?.value as El[];
      expect(g[20].penalty).toBeNull();
    });
    it('§4.6(a) keep only the first gateCount tokens of the known course (3 tokens, 2-slot bound course -> 2 entries)', () => {
      const c = ctx({ courses: { K1M_BR1_19: { courseId: '1', slots: slalomSlots(2) } } });
      const g = obsOf(parseTcp(withAttr(TCP.onCourseRunning, 'Gates', '0,0,0,0,0,0,0,0,0,0,0,0,0,,,,,,,,,,', '0,2,50'), c), 'gates')?.value as El[];
      expect(penalties(g)).toEqual([0, 2]);
    });
    it('§4.6(a) the attribute is omitted entirely when no course configuration is attached: no known gates value', () => {
      const msg = TCP.onCourseRunning.replace(/ Gates="[^"]*"/, '');
      const o = obsOf(parseTcp(msg, ctx()), 'gates');
      expect(o === undefined || o.state !== undefined).toBe(true);
    });
  });

  describe('(b) Results.Result@Gates and XML.Results.Gates, fixed width', () => {
    it('§4.6(b) 3 characters per cell, 30 cells: bib 55 has 10 judged zeros then blanks -> [0 x10, null x13] for a 23-slot course', () => {
      const g = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '55').gates as El[];
      expect(penalties(g)).toEqual([...zeros(10), ...Array(13).fill(N)]);
    });
    it('§4.6(b) a full 23-gate row: bib 83 all zero (23 cells)', () => {
      expect(penalties(rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83').gates)).toEqual(zeros(23));
    });
    it('§4.6(b) values 2 and 50 (bib 108: cell 12 = 2, cells 16, 20, 22 = 50)', () => {
      expect(penalties(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').gates)).toEqual([...zeros(11), 2, 0, 0, 0, 50, 0, 0, 0, 50, 0, 50, 0]);
    });
    it('§4.6(b) shorter trimmed strings occur: "  0  2" (6 chars) -> [0, 2, null...] with 23 entries', () => {
      const msg = only(TCP.resultsBr1, '83');
      const g = msg.match(/Gates="([^"]*)"/)![1];
      const r = rowOf(parseTcp(msg.replace(g, '  0  2'), ctx()), 'K1M_BR1_19', '83');
      expect(penalties(r.gates)).toEqual([0, 2, ...Array(21).fill(N)]);
    });
    it('§4.6(b) a lone 3-character string and an 18-character string parse', () => {
      const msg = only(TCP.resultsBr1, '83');
      const g = msg.match(/Gates="([^"]*)"/)![1];
      expect(penalties(rowOf(parseTcp(msg.replace(g, '  2'), ctx()), 'K1M_BR1_19', '83').gates).slice(0, 2)).toEqual([2, N]);
      expect(penalties(rowOf(parseTcp(msg.replace(g, '  0  0  0  0  0  2'), ctx()), 'K1M_BR1_19', '83').gates).slice(0, 7)).toEqual([0, 0, 0, 0, 0, 2, N]);
    });
    it('§4.6(b) never split on whitespace: a blank cell in the middle stays a null and later gates keep their positions (recorded Cross heat row: cells 0,0,0,0,0,blank,0,0,2)', () => {
      const r = rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7');
      expect(r.faults).toBeDefined();
      // positions of the cells are visible through faults: the fault is in slot 9 (caption 7), not slot 8
      expect(r.faults.gates).toEqual(['7']);
    });
    it('§4.6(b) a blank cell in the middle of a slalom row keeps its slot (synthetic: "  0     0  2" -> [0, null, 0, 2])', () => {
      const msg = only(TCP.resultsBr1, '83');
      const g = msg.match(/Gates="([^"]*)"/)![1];
      expect(penalties(rowOf(parseTcp(msg.replace(g, '  0     0  2'), ctx()), 'K1M_BR1_19', '83').gates).slice(0, 5)).toEqual([0, N, 0, 2, N]);
    });
    it('§4.6(b) width is 3 whatever the course: a 9-slot Cross string of 90 characters is not cut at length/9=10 (XT bib 23: cell 4 = 2)', () => {
      const r = rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23');
      expect(r.faults.count).toBe(1);
      expect(r.faults.gates).toEqual(['3']);
    });
    it('§4.6(b) XML.Results.Gates uses the same format (BR2 bib 108)', () => {
      const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
      expect(penalties(r.gates)).toEqual([...zeros(11), 2, 0, 0, 0, 50, 0, 0, 0, 50, 0, 50, 0]);
    });
    it('§4.6(b) a non-integer cell parses as null and raises unparseable-cell with source and slot (recorded note "pozor": cell 1 = 1, slots 8 and 9 hold "poz" and "or")', () => {
      const els = parseTcp(TCP.resultsNote, ctx());
      const r = rowOf(els, 'K1M_BR2_19', '22');
      expect(penalties(r.gates)).toEqual([1, ...Array(22).fill(N)]);
      const d = diagnostics(els).filter((x) => x.kind === 'unparseable-cell');
      expect(d.map((x) => x.slot)).toEqual([8, 9]);
      expect(d.every((x) => x.source === 'tcp' && x.attemptId === 'K1M_BR2_19:22')).toBe(true);
      expect(d.map((x) => x.text.trim())).toEqual(['poz', 'or']);
    });
    it('§4.6(b) the unparseable-cell source is xml for an XML row (synthetic note in the recorded BR1 bib 108 Gates)', () => {
      const x = xmlFixture('slalom.xml');
      const bad = x.replace(/(<RaceId>K1M_BR1_19<\/RaceId>[\s\S]*?<Gates>)(.{3})/, '$1abc');
      const d = diagnostics(parseXmlSnapshot(bad, ctx())).filter((y) => y.kind === 'unparseable-cell');
      expect(d).toEqual([expect.objectContaining({ attemptId: 'K1M_BR1_19:108', source: 'xml', slot: 1 })]);
    });
    it('§4.6(b) a parseable row raises no unparseable-cell', () => {
      expect(diagnostics(parseTcp(TCP.resultsBr2, ctx()))).toEqual([]);
    });
    it('§4.6(b) keeps the first slotCount cells (bound 5-slot course, 30-cell string -> 5 entries)', () => {
      const c = ctx({ courses: { K1M_BR1_19: { courseId: '1', slots: slalomSlots(5) } } });
      expect(rowOf(parseTcp(TCP.resultsBr1, c), 'K1M_BR1_19', '83').gates).toHaveLength(5);
    });
  });

  describe('(c) team rows (synthetic: source and static sample only, no recording)', () => {
    const slots = slalomSlots(3);
    const c = () => ctx({ courses: { K1MT_TSR_19: { courseId: '9', slots } }, phaseDates: { K1MT_TSR_19: '2026-09-19' } });
    const cells = (a: (number | null)[]) => a.map((v) => (v === null ? '   ' : String(v).padStart(3, ' '))).join('').padEnd(90, ' ');
    const team = (crew: (number | null)[], m1: (number | null)[], m2: (number | null)[], m3: (number | null)[]): string =>
      '<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">' +
      '<Schedule><RaceId>K1MT_TSR_19</RaceId><ClassId>K1MT</ClassId><DisId>TSR</DisId><StartTime>2026-09-19T10:00:00+02:00</StartTime><CourseNr>9</CourseNr><RaceStatus>3</RaceStatus></Schedule>' +
      `<Results><RaceId>K1MT_TSR_19</RaceId><Id>T.K1MT</Id><Bib>  7</Bib><Gates>${cells(crew)}</Gates><Gates1>${cells(m1)}</Gates1><Gates2>${cells(m2)}</Gates2><Gates3>${cells(m3)}</Gates3><Time>90000</Time><Pen>0</Pen><Total>90000</Total><Rnk>1</Rnk><RnkOrder>1</RnkOrder></Results></Canoe123Data>`;
    it('§4.6(c) Gates1..3 fill memberPenalties; the crew cell is the per-gate sum (4, 52, 100)', () => {
      const els = parseXmlSnapshot(team([4, 52, 100], [2, 2, 0], [2, 50, 50], [0, 0, 50]), c());
      const g = rowOf(els, 'K1MT_TSR_19', '7').gates as El[];
      expect(g.map((x) => x.penalty)).toEqual([4, 52, 100]);
      expect(g.map((x) => x.memberPenalties)).toEqual([[2, 2, 0], [2, 50, 0], [0, 50, 50]]); // per gate: (member1[i], member2[i], member3[i]); sums 4, 52, 100
      expect(diagnostics(els)).toEqual([]);
    });
    it('§4.6(c) a crew cell that differs from the member sum is presented as the crew cell and raises member-sum-mismatch', () => {
      const els = parseXmlSnapshot(team([8, 52, 100], [2, 2, 0], [2, 50, 50], [0, 0, 50]), c());
      expect(rowOf(els, 'K1MT_TSR_19', '7').gates[0].penalty).toBe(8);
      expect(diagnostics(els)).toEqual([{ kind: 'member-sum-mismatch', attemptId: 'K1MT_TSR_19:7', gate: 1, crew: 8, members: [2, 2, 0] }]);
    });
    it('§4.6(c) an unjudged member cell is null in memberPenalties', () => {
      const els = parseXmlSnapshot(team([null, 52, 100], [null, 2, 0], [2, 50, 50], [0, 0, 50]), c());
      expect(rowOf(els, 'K1MT_TSR_19', '7').gates[0].memberPenalties).toEqual([null, 2, 0]);
    });
    it('§4.6(c) TCP never carries member cells: a TCP team row has no memberPenalties', () => {
      const msg = TCP.resultsBr1.replace('RaceId="K1M_BR1_19" ClassId="K1M"', 'RaceId="K1MT_TSR_19" ClassId="K1MT"');
      const els = parseTcp(only(msg, '83'), c());
      expect(JSON.stringify(els)).not.toContain('memberPenalties');
    });
  });

  describe('(d) Kayak Cross: cells are fault marks', () => {
    it('§4.6(d) gates is unavailable{not-applicable} for Cross Attempts (TCP XT bib 23)', () => {
      expect(rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23').gates).toEqual({ state: 'unavailable', reason: 'not-applicable' });
    });
    it('§4.6(d) faults, TCP, XT bib 23 (cells 0,0,0,2,0,0,0,0,0): count 1, gates ["3"], lastCleanSlot 3', () => {
      expect(rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23').faults).toEqual({ count: 1, gates: ['3'], lastCleanSlot: 3 });
    });
    it('§4.6(d) faults, XML, same fact: <NrFLT>1</NrFLT> <FLT>FLT(3)</FLT> <LastCleanGate>3</LastCleanGate> -> identical Faults', () => {
      const r = rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1_XT_26', '23');
      expect(r.faults).toEqual({ count: 1, gates: ['3'], lastCleanSlot: 3 });
      expect(r.gates).toEqual({ state: 'unavailable', reason: 'not-applicable' });
    });
    it('§4.6(d) the fault in the last slot is caption "7", counting ST and RZ in the slot position (MX1_XT bib 26: cell 9 = 2): lastCleanSlot 8', () => {
      expect(rowOf(parseTcp(TCP.resultsXtFault9, ctx()), 'MX1_XT_26', '26').faults).toEqual({ count: 1, gates: ['7'], lastCleanSlot: 8 });
    });
    it('§4.6(d) a clean run reads the slot count: XML WX1J_XS bib 1 (nine 0 cells, <LastCleanGate>9</LastCleanGate>) -> {0, [], 9}', () => {
      expect(rowOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'WX1J_XS_26_JUN', '1').faults).toEqual({ count: 0, gates: [], lastCleanSlot: 9 });
    });
    it('§4.6(d) heat row with a blank cell (0,0,0,0,0,blank,0,0,2): one fault at caption "7", lastCleanSlot 8', () => {
      expect(rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7').faults).toEqual({ count: 1, gates: ['7'], lastCleanSlot: 8 });
    });
    it('§4.6(d) Pen is ignored in Cross: heat row Pen="2" adds nothing to the outcome', () => {
      const r = rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7');
      expect(JSON.stringify(r.outcome)).not.toMatch(/penaltySeconds/);
    });
    it('§4.6(d) time trial: Pen 0 and Total = Time (XT bib 23: 87.60 / 87.60) are relayed as given', () => {
      expect(rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23').outcome).toMatchObject({ kind: 'duration', runSeconds: 87.6, totalSeconds: 87.6 });
    });
    it.each(['  1', '  5', ' 50', 'abc'])('§4.6(d) a Cross cell other than empty, 0 or 2 ("%s", slot 5) raises unparseable-cell and is null: the fault count stays the recorded one', (cell) => {
      const msg = only(TCP.resultsXtFault, '23');
      const g = msg.match(/Gates="([^"]*)"/)![1];
      const cells = g.match(/.{3}/g)!;
      cells[4] = cell;
      const els = parseTcp(msg.replace(g, cells.join('')), ctx());
      expect(diagnostics(els).filter((d) => d.kind === 'unparseable-cell')).toEqual([expect.objectContaining({ slot: 5, attemptId: 'WX1_XT_26:23', source: 'tcp' })]);
      const f = rowOf(els, 'WX1_XT_26', '23').faults;
      expect(f.count).toBe(1);
      expect(f.gates).toEqual(['3']);
    });
    it('§4.6(d) Cross cells are per slot with the 9-slot course (CROSS_SLOTS): the unparseable-cell slot is a slot position, not a gate number', () => {
      // synthetic: cell 8 (the roll zone, no gate number) holds text
      const msg = only(TCP.resultsXtFault, '23');
      const g = msg.match(/Gates="([^"]*)"/)![1];
      const cells = g.match(/.{3}/g)!;
      cells[7] = 'RZ ';
      const els = parseTcp(msg.replace(g, cells.join('')), ctx());
      expect(diagnostics(els)).toEqual([expect.objectContaining({ kind: 'unparseable-cell', slot: 8, attemptId: 'WX1_XT_26:23', source: 'tcp' })]);
      expect(CROSS_SLOTS[7].kind).toBe('roll-zone');
    });
  });
});
