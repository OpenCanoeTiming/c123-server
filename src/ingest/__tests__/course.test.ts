import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, CROSS_SLOTS, slalomSlots, type El } from './helpers.js';

// DERIVATIONS §2.3. XML courses: slalom.xml CourseNr 1 "RNNNSNRNSNRNSNRNSNNNRSNNRSNNNS" (23 gates), CourseNr 2 "NNNNSRNRSNNRSNNRSRNSRNNS";
// cross.xml CourseNr 1 "DSNSNSRSNSNSNSESRS" (cross), CourseNr 2 "NNRNSNINRNSNRNRS" (has an I split point).
// TCP: RaceConfig of nkz-19so (23 gates) and cp3-cross (DNNRNNNER, captions ST,1,2,3,4,5,6,RZ,7).
const slalomXml = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
const crossXml = () => parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
const course = (els: unknown, field: string, courseId: string): El | undefined => obsOf(els as any, field, { courseId });
const rc = (over: Record<string, string>): string => {
  const base = { NrSplits: '0', NrGates: '23', GateConfig: 'RNNNNRNNRNNRNNNNRNNRNNN', GateCaptions: Array.from({ length: 23 }, (_, i) => i + 1).join(',') };
  const a = { ...base, ...over };
  return `<Canoe123 System="Main"><RaceConfig NrSplits="${a.NrSplits}" NrGates="${a.NrGates}" GateConfig="${a.GateConfig}" GateCaptions="${a.GateCaptions}" /></Canoe123>`;
};

describe('§2.3 Course', () => {
  it('§2.3 courseId and layout come from XML.CourseData (CourseNr 1, CourseConfig as recorded)', () => {
    expect(course(slalomXml(), 'layout', '1')).toMatchObject({ value: 'RNNNSNRNSNRNSNRNSNNNRSNNRSNNNS', source: 'xml' });
    expect(course(slalomXml(), 'layout', '2')?.value).toBe('NNNNSRNRSNNRSNNRSRNSRNNS');
  });
  it('§2.3 N is a downstream gate and R an upstream gate, numbered 1.. in order (course 1: 23 gates)', () => {
    const g = course(slalomXml(), 'gates', '1')?.value as El[];
    expect(g).toHaveLength(23);
    expect(g.map((x) => x.number)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    const up = [1, 6, 9, 12, 17, 20];
    expect(g.filter((x) => x.kind === 'upstream').map((x) => x.number)).toEqual(up);
    expect(g.filter((x) => x.kind === 'downstream')).toHaveLength(17);
  });
  it('§2.3 S ends a sector: the number of the gate before it (course 1: 4,7,10,13,17,20,23)', () => {
    expect(course(slalomXml(), 'sectorEndsAfterGate', '1')?.value).toEqual([4, 7, 10, 13, 17, 20, 23]);
    expect(course(slalomXml(), 'sectorEndsAfterGate', '2')?.value).toEqual([4, 7, 10, 13, 15, 18]);
  });
  it('§2.3 I is a split point: the gate before it (cp3-cross course 2 "NNRNSNINRNSNRNRS": after gate 5), sectors after 4, 8, 12', () => {
    expect(course(crossXml(), 'splitsAfterGate', '2')?.value).toEqual([5]);
    expect(course(crossXml(), 'sectorEndsAfterGate', '2')?.value).toEqual([4, 8, 12]);
  });
  it('§2.3 a course without I has no split points (course 1 of nkz-19so)', () => {
    expect(course(slalomXml(), 'splitsAfterGate', '1')?.value).toEqual([]);
  });
  it('§2.3 slalom slots: one per N/R, gateNumber = slot (course 1: 23 slots)', () => {
    const s = course(slalomXml(), 'slots', '1')?.value as El[];
    expect(s).toHaveLength(23);
    expect(s[0]).toMatchObject({ slot: 1, kind: 'gate', gateNumber: 1 });
    expect(s[22]).toMatchObject({ slot: 23, kind: 'gate', gateNumber: 23 });
  });
  it('§2.3 Cross layout "DSNSNSRSNSNSNSESRS": D start ramp and E roll zone are slots without a gate number; S produces no slot; 9 slots, 7 gates', () => {
    const s = course(crossXml(), 'slots', '1')?.value as El[];
    expect(s.map((x) => [x.slot, x.kind, x.gateNumber])).toEqual([
      [1, 'start-ramp', undefined], [2, 'gate', 1], [3, 'gate', 2], [4, 'gate', 3], [5, 'gate', 4], [6, 'gate', 5], [7, 'gate', 6], [8, 'roll-zone', undefined], [9, 'gate', 7],
    ]);
    const g = course(crossXml(), 'gates', '1')?.value as El[];
    expect(g.map((x) => [x.number, x.kind])).toEqual([[1, 'downstream'], [2, 'downstream'], [3, 'upstream'], [4, 'downstream'], [5, 'downstream'], [6, 'downstream'], [7, 'upstream']]);
  });
  it('§2.3 XML carries no captions: slots from XML have none; captions come from TCP only', () => {
    const s = course(crossXml(), 'slots', '1')?.value as El[];
    expect(s.every((x) => x.caption === undefined)).toBe(true);
    expect(course(crossXml(), 'captions', '1')).toBeUndefined();
  });
  it('§2.3 review O2 / round 17 ruling 12: RaceConfig states no sectorEndsAfterGate and no layout (TCP strips the S markers; they are the snapshot\'s alone), for slalom and Cross', () => {
    for (const msg of [TCP.raceConfigCross, TCP.raceConfigSlalom]) {
      const els = parseTcp(msg, ctx());
      expect(els.filter((e: El) => e.field === 'sectorEndsAfterGate' || e.field === 'layout')).toEqual([]);
      expect(JSON.stringify(els)).not.toContain('sectorEndsAfterGate');
    }
  });
  // Round 19 (code item 10, F6/F10a): a RaceConfig names no race and no course, so the parser emits ONE course-refresh element keyed by its gate
  // string, whatever ctx.boundCourseId is; the core matches it to the Course whose stripped layout equals the string (DERIVATIONS §2.3).
  // The ruling fixes the element's payload `{ gateString, captions, splitsArmed, fabricated }`; the text does not name the wrapper key, so the tests find
  // the element by `gateString`, flat or nested one level.
  const refreshOf = (els: unknown): El | undefined => {
    for (const e of els as El[]) {
      if (e.gateString !== undefined) return e;
      for (const v of Object.values(e)) if (typeof v === 'object' && v !== null && (v as El).gateString !== undefined) return v as El;
    }
    return undefined;
  };
  it('§2.3 round 19: a recorded cp3-cross RaceConfig yields a course-refresh with the gate string verbatim and the captions ST,1,2,3,4,5,6,RZ,7, with no course bound', () => {
    const r = refreshOf(parseTcp(TCP.raceConfigCross, ctx({ boundCourseId: undefined })));
    expect(r).toMatchObject({ gateString: 'DNNRNNNER', captions: ['ST', '1', '2', '3', '4', '5', '6', 'RZ', '7'], splitsArmed: false, fabricated: false });
  });
  it('§2.3 round 19: the refresh does not depend on ctx.boundCourseId (bound to course 1, bound to nothing, bound to another course: the same payload)', () => {
    const a = refreshOf(parseTcp(TCP.raceConfigSlalom, ctx()));
    expect(a).toBeDefined();
    expect(refreshOf(parseTcp(TCP.raceConfigSlalom, ctx({ boundCourseId: undefined })))).toEqual(a);
    expect(refreshOf(parseTcp(TCP.raceConfigSlalom, ctx({ boundCourseId: '2' })))).toEqual(a);
  });
  it('§2.3 round 19: recorded slalom RaceConfig (23 gates, captions 1..23): the string RNNNNRNNRNNRNNNNRNNRNNN and 23 captions', () => {
    expect(refreshOf(parseTcp(TCP.raceConfigSlalom, ctx()))).toMatchObject({ gateString: 'RNNNNRNNRNNRNNNNRNNRNNN', captions: Array.from({ length: 23 }, (_, i) => String(i + 1)), fabricated: false });
  });
  it('§2.3 round 19: NrSplits="0" -> splitsArmed false; NrSplits="2" -> splitsArmed true (what splits presents is the core\'s, §4.8)', () => {
    expect(refreshOf(parseTcp(rc({ NrSplits: '0' }), ctx()))?.splitsArmed).toBe(false);
    expect(refreshOf(parseTcp(rc({ NrSplits: '2' }), ctx()))?.splitsArmed).toBe(true);
  });
  it('§2.3 round 19: a refresh states no course number, no layout and no sector ends (the snapshot\'s alone)', () => {
    const els = parseTcp(TCP.raceConfigCross, ctx());
    const r = refreshOf(els)!;
    expect(r.courseId).toBeUndefined();
    expect(JSON.stringify(els)).not.toContain('sectorEndsAfterGate');
    expect(els.filter((e: El) => e.field === 'layout')).toEqual([]);
  });
  it('§2.3 round 19: the transmitted gate count is ignored; a count that disagrees with the string sets fabricated (NrGates="30", 23-gate string) and raises the ingest-only diagnostic, the string still carried', () => {
    const els = parseTcp(rc({ NrGates: '30' }), ctx());
    expect(refreshOf(els)).toMatchObject({ gateString: 'RNNNNRNNRNNRNNNNRNNRNNN', fabricated: true });
    expect(els.some((e: El) => e.diagnostic?.kind === 'fabricated-course')).toBe(true);
  });
  it.each([
    ['(a) empty gate string while the count is non-zero', { NrGates: '25', GateConfig: '', GateCaptions: '' }],
    ['(b) captions empty while the gate string is not', { GateCaptions: '' }],
    ['(c) the string\'s gate count differs from the transmitted count', { GateConfig: 'RNNNNRNNRNNRNNNNRNNRNN' }],
  ])('§2.3 round 19 fabricated course %s: fabricated true, the diagnostic raised, and the RaceConfig decides no not-configured (no gates/slots observation of any course)', (_n, over) => {
    const els = parseTcp(rc(over), ctx());
    expect(refreshOf(els)?.fabricated).toBe(true);
    expect(els.some((e: El) => e.diagnostic?.kind === 'fabricated-course')).toBe(true);
    expect(els.filter((e: El) => e.state === 'unavailable' && e.reason === 'not-configured')).toEqual([]);
  });
  it('§2.3 a consistent recorded RaceConfig is not flagged fabricated and raises no diagnostic', () => {
    const els = parseTcp(TCP.raceConfigSlalom, ctx());
    expect(refreshOf(els)?.fabricated).toBe(false);
    expect(els.some((e: El) => e.diagnostic)).toBe(false);
  });
  it('§2.3 failure mode: an empty layout in the snapshot gives gates unavailable{not-configured} (cp3-cross CourseNr 6 has <CourseConfig />; synthetic CourseData of that recorded shape)', () => {
    const x = xmlFixture('cross.xml').replace('</Canoe123Data>', '<CourseData><CourseNr>6</CourseNr><CourseConfig /></CourseData></Canoe123Data>');
    expect(course(parseXmlSnapshot(x, ctx()), 'gates', '6')).toMatchObject({ state: 'unavailable', reason: 'not-configured' });
  });
  it('§2.3 the same applies to every Attempt\'s gates on that course (bound course with an empty layout)', () => {
    const c = ctx({ courses: { K1M_BR1_19: { courseId: '6', slots: [] } } });
    const row = (parseTcp(TCP.resultsBr1, c) as El[]).find((e) => e.snapshot)!.snapshot.rows[0];
    expect(row.gates).toMatchObject({ state: 'unavailable', reason: 'not-configured' });
  });
});
