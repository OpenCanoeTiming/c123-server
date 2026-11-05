import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, rowOf, obsOf, snapshotOf, unparseable, type El } from './helpers.js';

// Row 19: every message type and XML table on a real excerpt (fixtures/tcp.ts provenance comment; fixtures/*.xml are verbatim
// recorded elements wrapped in the recorded root). Names and clubs are as recorded (public results).
// Expected values below were read by hand from the raw text in the fixtures.
const noFailure = (els: unknown) => expect(unparseable(els as any)).toEqual([]);

describe('real TCP excerpts', () => {
  it.each(Object.keys(TCP) as (keyof typeof TCP)[])('every TCP fixture parses with no failure: %s', (k) => {
    const els = parseTcp(TCP[k], ctx());
    expect(Array.isArray(els)).toBe(true);
    noFailure(els);
  });

  it('TimeOfDay nkz-19so: <TimeOfDay>09:56:06</TimeOfDay> parses (no domain element)', () => {
    const els = parseTcp(TCP.timeOfDay, ctx()) as El[];
    expect(els.filter((e) => e.attemptId || e.snapshot)).toEqual([]);
  });
  it('TVS nkz-19so: Odd_Bib 55 / Even_Bib 54 of K1M_BR1_19 parse', () => {
    noFailure(parseTcp(TCP.tvs, ctx()));
  });
  it('RaceConfig nkz-19so: 23 gates, layout RNNNNRNNRNNRNNNNRNNRNNN', () => {
    expect(obsOf(parseTcp(TCP.raceConfigSlalom, ctx()), 'layout', { courseId: '1' })?.value).toBe('RNNNNRNNRNNRNNNNRNNRNNN');
  });
  it('RaceConfig cp3-cross: DNNRNNNER with captions ST,1,2,3,4,5,6,RZ,7', () => {
    expect(obsOf(parseTcp(TCP.raceConfigCross, ctx()), 'captions', { courseId: '1' })?.value).toEqual(['ST', '1', '2', '3', '4', '5', '6', 'RZ', '7']);
  });
  it('Schedule nkz-19so: five races, K1M_BR1_19 is Order 2 status 3 (running)', () => {
    const els = parseTcp(TCP.scheduleSlalom, ctx());
    expect(obsOf(els, 'programmeOrder', { phaseId: 'K1M_BR1_19' })?.value).toBe(2);
    expect(obsOf(els, 'status', { phaseId: 'K1M_BR1_19' })?.value).toBe('running');
  });
  it('Schedule cp3-cross: WX1_XT_26 is Order 1 status 1 (scheduled)', () => {
    const els = parseTcp(TCP.scheduleCross, ctx());
    expect(obsOf(els, 'programmeOrder', { phaseId: 'WX1_XT_26' })?.value).toBe(1);
    expect(obsOf(els, 'status', { phaseId: 'WX1_XT_26' })?.value).toBe('scheduled');
  });
  it('OnCourse empty (cp3-cross): Total="0" Position="0" is course empty', () => {
    expect((parseTcp(TCP.onCourseEmpty, ctx()) as El[]).some((e) => e.event === 'oncourse-empty')).toBe(true);
  });
  it('OnCourse armed (cp3-cross WX1_XT_26 bib 25 Id 14012.WX1): at-start', () => {
    expect(obsOf(parseTcp(TCP.onCourseArmed, ctx()), 'status')).toMatchObject({ attemptId: 'WX1_XT_26:25', value: 'at-start' });
  });
  it('OnCourse running (nkz-19so bib 56): on-course, Position 2, elapsed 65 s', () => {
    const els = parseTcp(TCP.onCourseRunning, ctx());
    expect(obsOf(els, 'status')?.value).toBe('on-course');
    expect(obsOf(els, 'courseOrder')?.value).toBe(2);
    expect(obsOf(els, 'outcome')?.value).toMatchObject({ elapsedSeconds: 65 });
  });
  it('OnCourse finished (nkz-19so bib 57): finished, 88.85 + 6 = 94.85', () => {
    const els = parseTcp(TCP.onCourseFinished, ctx());
    expect(obsOf(els, 'status')?.value).toBe('finished');
    expect(obsOf(els, 'outcome')?.value).toMatchObject({ runSeconds: 88.85, penaltySeconds: 6, totalSeconds: 94.85 });
  });
  it('OnCourse Cross heat (cp3-cross WX1J_XS_26_JUN bib 2): on-course', () => {
    expect(obsOf(parseTcp(TCP.onCourseHeat, ctx()), 'status')).toMatchObject({ attemptId: 'WX1J_XS_26_JUN:2', value: 'on-course' });
  });
  it('Results slalom first run (nkz-19so): bib 55 rank 1 time 48.64; bib 83 rank 2 time 87.30', () => {
    const els = parseTcp(TCP.resultsBr1, ctx());
    expect(rowOf(els, 'K1M_BR1_19', '55')).toMatchObject({ placement: { rank: 1, order: 1 }, outcome: { runSeconds: 48.64 } });
    expect(rowOf(els, 'K1M_BR1_19', '83')).toMatchObject({ placement: { rank: 2, order: 2 }, outcome: { runSeconds: 87.3 } });
  });
  it('Results slalom marks (nkz-19so): bibs 64 and 68 are dns, unplaced', () => {
    const els = parseTcp(TCP.resultsBr1Marks, ctx());
    for (const b of ['64', '68']) expect(rowOf(els, 'K1M_BR1_19', b)).toMatchObject({ status: 'dns', placement: null });
  });
  it('Results slalom second run (nkz-19so): bib 108 run 2 is 91.64, pairTotal 88.38', () => {
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108')).toMatchObject({ pairTotal: 88.38, outcome: { runSeconds: 91.64 } });
  });
  it('Results with a gate note (jarni-ne-do bib 22): parses, reports unparseable-cell, no message failure', () => {
    const els = parseTcp(TCP.resultsNote, ctx()) as El[];
    expect(unparseable(els)).toEqual([]);
    expect(els.filter((e) => e.diagnostic?.kind === 'unparseable-cell')).toHaveLength(2);
  });
  it('Results start list (cp3-cross WX1_XT_26): bibs 25, 24, 23 in start order, start-list mode', () => {
    const s = snapshotOf(parseTcp(TCP.resultsStartList, ctx()));
    expect(s.mode).toBe('start-list');
    expect(s.rows.map((r: El) => [r.bib, r.startOrder])).toEqual([['25', 1], ['24', 2], ['23', 3]]);
  });
  it('Results Cross time trial (cp3-cross): bib 23 rank 2 87.60, one fault', () => {
    expect(rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23')).toMatchObject({ placement: { rank: 2, order: 2 }, faults: { count: 1 } });
  });
  it('Results Cross heat, lane order only (cp3-cross WX1_XS_26): eight rows, start-list mode', () => {
    const s = snapshotOf(parseTcp(TCP.resultsHeatOrderOnly, ctx()));
    expect(s.rows).toHaveLength(8);
    expect(s.mode).toBe('start-list');
  });
  it('Results Cross heat placed (cp3-cross WX1J_XS_26_JUN bib 7): heat 2, lane 4, rank 4', () => {
    expect(rowOf(parseTcp(TCP.resultsHeatPlaced, ctx()), 'WX1J_XS_26_JUN', '7')).toMatchObject({ heat: 2, startLane: 4, placement: { rank: 4, order: 4 } });
  });
  it('Results Cross junior time trial (cp3-cross MX1J_XT_26_JUN): bibs 12 and 13 rank 1 and 2, Q', () => {
    const els = parseTcp(TCP.resultsJuniorXt, ctx());
    expect(rowOf(els, 'MX1J_XT_26_JUN', '12')).toMatchObject({ placement: { rank: 1, order: 1 }, qualified: true });
    expect(rowOf(els, 'MX1J_XT_26_JUN', '13')).toMatchObject({ placement: { rank: 2, order: 2 } });
  });
  it('Results classification XER (cp3-cross): two rows, no Attempts', () => {
    const els = parseTcp(TCP.resultsXer, ctx()) as El[];
    expect(els.find((e) => e.push === 'classification')!.body.rows).toHaveLength(2);
    expect(els.filter((e) => e.snapshot)).toEqual([]);
  });
});

describe('real XML excerpts', () => {
  const slalom = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
  const cross = () => parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
  it.each(['slalom.xml', 'cross.xml', 'cross-untimed.xml'])('every XML fixture parses with no failure: %s', (f) => {
    noFailure(parseXmlSnapshot(xmlFixture(f), ctx()));
  });
  it('XML Events (nkz-19so): BibHandling EventWide -> eventBib is issued event-wide for 9047.K1M ("108")', () => {
    expect(obsOf(slalom(), 'eventBib', { entryId: '9047.K1M' })?.value).toBe('108');
  });
  it('XML Classes (nkz-19so K1M): name "K1 muži", 8 categories', () => {
    expect(obsOf(slalom(), 'name', { classId: 'K1M' })?.value).toBe('K1 muži');
    expect(obsOf(slalom(), 'ageCategories', { classId: 'K1M' })?.value).toHaveLength(8);
  });
  it('XML Schedule (nkz-19so K1M_BR2_19): order 4, DisId BR2, status 3, course 1', () => {
    const els = slalom();
    expect(obsOf(els, 'programmeOrder', { phaseId: 'K1M_BR2_19' })?.value).toBe(4);
    expect(obsOf(els, 'format', { phaseId: 'K1M_BR2_19' })?.value).toBe('BR2');
    expect(obsOf(els, 'courseId', { phaseId: 'K1M_BR2_19' })?.value).toBe('1');
  });
  it('XML CourseData (cp3-cross course 1): nine slots', () => {
    expect(obsOf(cross(), 'slots', { courseId: '1' })?.value).toHaveLength(9);
  });
  it('XML Participants (nkz-19so 9047.K1M): KRÁL Matěj, ICFId 9047, club USK Pha, category DS', () => {
    const m = obsOf(slalom(), 'members', { entryId: '9047.K1M' })?.value as El[];
    expect(m[0]).toMatchObject({ familyName: 'KRÁL', givenName: 'Matěj', externalId: { value: '9047' } });
    expect(obsOf(slalom(), 'club', { entryId: '9047.K1M' })?.value).toBe('USK Pha');
    expect(obsOf(slalom(), 'ageCategoryId', { entryId: '9047.K1M' })?.value).toBe('DS');
  });
  it('XML Attributes (cp3-cross JUN "juniors"): the sub-race WX1J_XT_26_JUN is an ordinary Phase of class WX1J', () => {
    expect(obsOf(cross(), 'classId', { phaseId: 'WX1J_XT_26_JUN' })?.value).toBe('WX1J');
  });
  it('XML Results first run (nkz-19so BR1 bib 108): 88.38 s, rank 20', () => {
    expect(rowOf(slalom(), 'K1M_BR1_19', '108')).toMatchObject({ outcome: { runSeconds: 88.38 }, placement: { rank: 20 } });
  });
  it('XML Results second run (nkz-19so BR2 bib 108): 91.64 s + 152, pairTotal 88.38, counting run 1', () => {
    expect(rowOf(slalom(), 'K1M_BR2_19', '108')).toMatchObject({ outcome: { runSeconds: 91.64, penaltySeconds: 152 }, pairTotal: 88.38, countingRun: 1 });
  });
  it('XML Results Cross (cp3-cross XT bib 23 and XS bib 1)', () => {
    expect(rowOf(cross(), 'WX1_XT_26', '23').faults.count).toBe(1);
    expect(rowOf(cross(), 'WX1J_XS_26_JUN', '1')).toMatchObject({ heat: 1, qualified: true });
  });
  it('XML Results classification (cp3-cross XER bib 4): rank 1 decided in F', () => {
    const c = (cross() as El[]).find((e) => e.push === 'classification')!;
    expect(c.body.rows[0]).toMatchObject({ rank: 1, decidedIn: 'F' });
  });
  it('XML untimed junior time trial (cp3-cross MX1J_XT_26_JUN bib 51): placement 31, no time', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('cross-untimed.xml'), ctx()), 'MX1J_XT_26_JUN', '51');
    expect(r.placement).toEqual({ rank: 31, order: 31 });
  });
});

describe('unparseable input is reported, never thrown, dropped or guessed', () => {
  it('a garbage TCP message returns a result object carrying an unparseable element', () => {
    const els = parseTcp('this is not xml', ctx());
    expect(unparseable(els)).toHaveLength(1);
  });
  it('a truncated TCP message (root closing tag missing) is reported unparseable', () => {
    expect(unparseable(parseTcp(TCP.onCourseRunning.slice(0, -20), ctx()))).toHaveLength(1);
  });
  it('an unknown TCP message type is reported, not dropped silently', () => {
    const els = parseTcp('<Canoe123 System="Main"><Brand-new Foo="1" /></Canoe123>', ctx());
    expect(els.length).toBeGreaterThan(0);
    expect(JSON.stringify(els)).toContain('Brand-new');
  });
  it('a torn XML read (root closing tag missing) is reported unparseable, not parsed partially', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml').replace('</Canoe123Data>', ''), ctx());
    expect(unparseable(els)).toHaveLength(1);
    expect((els as El[]).filter((e) => e.snapshot)).toEqual([]);
  });
  it('an empty message is reported unparseable', () => {
    expect(unparseable(parseTcp('', ctx()))).toHaveLength(1);
    expect(unparseable(parseXmlSnapshot('', ctx()))).toHaveLength(1);
  });
});
