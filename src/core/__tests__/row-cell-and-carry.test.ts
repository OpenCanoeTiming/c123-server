import { describe, it, expect } from 'vitest';
import { CELL, FLIP, type Step } from './fixtures/row-cell-excerpts.js';
import { slalomSlots } from '../../ingest/__tests__/helpers.js';
import { connected, coreWith, tcpUnit, xmlUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

// #204, review of PR #264 (c123-server-204-review.md: "Re-review at f67837f" objection CQ5 and the note on carry; N2; section 3 O8b).
// Expected values come from the contract and from the raw rows named in each test, never from running the core.
// Real excerpts: fixtures/row-cell-excerpts.ts, cut by script from jarni-so-odp. Hand streams: text.ts, no real clock.

const asRec = (s: Step) => ({ recording: '2026-04-18-jarni-so-odp', chunk: s.chunk, ts: 0, observedAt: s.observedAt, data: s.data });
const gate = (c: ReturnType<typeof coreWith>, id: string, n: number): unknown =>
  ((c.presented(id)['gates'] as { value?: Array<{ number: number; penalty: number | null }> }).value ?? []).find((g) => g.number === n)?.penalty;
const prov = (c: ReturnType<typeof coreWith>, id: string, f: string): unknown => (c.presented(id)[f] as { provisional?: unknown }).provisional;
/** The `Gates` attribute of the first Type="C" result of a recorded message, split to cells (OnCourse: comma-separated). */
const cells = (data: string): string[] => /Gates="([^"]*)"/.exec(data)![1]!.split(',');

describe('a row\'s judged cell stands against a stream blank (CONTRACTS section 4 INV-2 rule 1; TEST-ARCHITECTURE property 6(b) and 11, round 21 wording; recorded jarni-so-odp C1M_BR1_18:26 cell 19)', () => {
  const ID = 'C1M_BR1_18:26';
  const DAY = { C1M_BR1_18: '2026-04-18' };
  const COURSES = { courses: { C1M_BR1_18: { courseId: '1', slots: slalomSlots(19) } } }; // RaceConfig NrGates="19" is recorded at 12:17:20.1
  const rowAt = CELL.findIndex((s) => s.kind === 'tcp' && s.data.includes('<Results'));
  const blankAt = CELL.findIndex((s) => s.observedAt === '2026-04-18T12:17:19.030Z');

  it('the excerpt is what the test says: the row (Time 90.45, Rank 19) holds cell 19 as 0; the stream listing at 12:17:19.030 has it blank, finish listed; the next listing has it 0 again', () => {
    expect(rowAt).toBeGreaterThan(0);
    const row = CELL[rowAt]!;
    expect(row.observedAt).toBe('2026-04-18T12:17:09.966Z');
    expect(/ Gates="([^"]*)"/.exec(row.data)![1]!.slice(54, 57).trim()).toBe('0'); // fixed width 3 per cell: the 19th
    expect(/ Time="90.45"/.test(row.data)).toBe(true);
    const blank = CELL[blankAt]!;
    expect(cells(blank.data)[18]).toBe('');
    expect(cells(blank.data)[17]).toBe('0');
    expect(/dtFinish="14:17:09.750"/.test(blank.data)).toBe(true);
    expect(cells(CELL[blankAt + 1]!.data)[18] === '' || CELL.slice(blankAt + 1).some((s) => s.kind === 'tcp' && /<OnCourse/.test(s.data) && cells(s.data)[18] === '0')).toBe(true);
  });

  it('vector-class rule, real jarni-so-odp C1M_BR1_18:26: from the row on, across the stream\'s blank at 12:17:19.030 (listed), gates keeps 0 at cell 19 and provisional stays false at every step', () => {
    const core = coreWith([connected(CELL[0]!.observedAt)]);
    let checked = 0;
    CELL.forEach((s, i) => {
      core.applyUnit(tcpUnit(asRec(s), DAY, COURSES));
      if (i < rowAt) return;
      expect(gate(core, ID, 19), s.observedAt).toBe(0);
      expect(prov(core, ID, 'gates'), `${s.observedAt} gates provisional`).toBe(false);
      checked++;
    });
    expect(CELL.length - rowAt).toBe(checked);
    expect(checked).toBeGreaterThan(blankAt - rowAt); // the blank step was among them
  });
});

describe('a finished listed Attempt\'s second-run placement and pairTotal do not flip provisional at a time-empty XML row after the TCP row restated them (TEST-ARCHITECTURE property 11 round 21, "carried over from run 1 ... until a row of run 2, carrying its time or its mark, restates that field"; recorded jarni-so-odp C1M_BR2_18:15)', () => {
  const ID = 'C1M_BR2_18:15';
  const DAY = { C1M_BR2_18: '2026-04-18' };
  const COURSES = { courses: { C1M_BR2_18: { courseId: '1', slots: slalomSlots(19) } } };
  const at = (t: string): number => FLIP.findIndex((s) => s.observedAt === `2026-04-18T${t}Z`);
  const tcpRow = at('13:29:00.341');
  const xmlStep = at('13:29:00.401');
  const run = (until: number, hook?: (i: number, core: ReturnType<typeof coreWith>) => void): ReturnType<typeof coreWith> => {
    const core = coreWith([connected(FLIP[0]!.observedAt)]);
    FLIP.slice(0, until + 1).forEach((s, i) => {
      core.applyUnit(s.kind === 'xml' ? xmlUnit(asRec(s), DAY, new Date(Date.parse(s.observedAt) - 5000).toISOString(), COURSES) : tcpUnit(asRec(s), DAY, COURSES));
      hook?.(i, core);
    });
    return core;
  };

  it('the raw rows: the TCP row at 13:29:00.341 states Time 82.09, Total 82.09, Rank 8; the XML row 60 ms later states no Time, only run 1\'s totals (PrevTotal = TotalTotal 83600) and TotalRnk 8 (the excerpt is what the test says)', () => {
    expect(FLIP[tcpRow]!.data).toMatch(/ Time="82.09" Total="82.09" Rank="8" RankOrder="8"/);
    const x = FLIP[xmlStep]!.data;
    expect(/<Results>[\s\S]*<Time>/.test(x)).toBe(false); // the Results block has no <Time> (the Schedule's <Time> is the race's)
    expect(/<PrevTotal>83600<\/PrevTotal>/.test(x) && /<TotalTotal>83600<\/TotalTotal>/.test(x)).toBe(true);
    expect(/<TotalRnk>8<\/TotalRnk>\s*<TotalRnkOrder>8<\/TotalRnkOrder>/.test(x)).toBe(true);
    expect(FLIP[xmlStep + 1]!.observedAt).toBe('2026-04-18T13:29:00.479Z'); // the finish listing follows the XML step
    expect(FLIP.some((s) => s.observedAt === '2026-04-18T13:29:20.116Z' && / Time="82.09" Total="82.09" Rank="8"/.test(s.data))).toBe(true); // the TCP row restated at the end
  });

  it('property 11 round 21: after the TCP row restated them, placement (8, 8) and pairTotal are provisional false, and the time-empty XML row at 13:29:00.401 leaves both false (no listed false-to-true item applies); they stay false to 13:29:20.116', () => {
    const seen: Array<[string, unknown, unknown, unknown, unknown]> = [];
    run(FLIP.length - 1, (i, core) => {
      if (i < tcpRow) return;
      const p = core.presented(ID) as Record<string, { state?: string; value?: any; provisional?: boolean }>;
      seen.push([FLIP[i]!.observedAt, p['placement']?.value, p['placement']?.provisional, p['pairTotal']?.state, p['pairTotal']?.provisional]);
    });
    expect(seen.length).toBeGreaterThan(3);
    for (const [t, placement, placementProv, pairState, pairProv] of seen) {
      expect(placement, t).toEqual({ rank: 8, order: 8 });
      expect(placementProv, `${t} placement provisional`).toBe(false);
      expect(pairState, t).toBe('known');
      expect(pairProv, `${t} pairTotal provisional`).toBe(false);
    }
  });

  it('the XML row states run 1\'s total only (83.60), no Time: it does not displace the TCP row\'s run 2 Total 82.09 (content older than the row, INV-7 guard; changedAfter taken as the steady state, observedAt minus the 5 s poll)', () => {
    const core = run(xmlStep);
    expect((core.presented(ID)['pairTotal'] as { value?: unknown }).value).toBe(82.09);
  });
});

describe('N2: Completed="Y" on a running listing (Time, no dtFinish) closes nothing (DERIVATIONS section 4.4 "Run closed": a Y on a listing with no finish closes nothing, there being no result to complete)', () => {
  const RACE = 'K1M_BR1_19';
  const DAY = { [RACE]: '2026-09-19' };
  const T0 = '2026-09-19T10:00:00.000Z';
  const X = `${RACE}:51`;
  const L = (ms: number, over: Record<string, unknown>): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, ...over })), DAY);
  /** A results-table row of the Attempt holding a blank cell 2 (judging not complete), as the parser emits a Results push. */
  const row = (ms: number, outcome?: Record<string, unknown>): Unit => [
    { ingestSeq: 0, observedAt: plus(T0, ms), snapshot: { source: 'tcp', phaseId: RACE, mode: 'results', rows: [{ bib: '51', ...(outcome ? { outcome } : {}), gates: [{ number: 1, penalty: 0 }, { number: 2, penalty: null }], judgingComplete: false }] } } as never,
  ];
  const running = { dtStart: '12:00:00.000', time: '45   ', gates: '0,,,,,' };

  it('hand stream: started at 12:00:00.000, listed running, a row stating Time 45 with a blank cell 2 (the push precedes the finish on the stream), then the listing with Completed="Y" and no dtFinish: status on-course, gates still provisional', () => {
    const c = coreWith([connected(T0), L(0, running), L(1000, running), row(1500, { kind: 'duration', runSeconds: 45, penaltySeconds: 0, totalSeconds: 45 }), L(2000, { ...running, completed: true })]);
    expect((c.presented(X)['status'] as { value?: unknown }).value).toBe('on-course');
    expect(prov(c, X, 'gates')).toBe(true);
  });

  it('control: the finish listed with Completed N, the row blank at a cell, then a later listing with the same finish and Completed Y closes the run: gates provisional false (DERIVATIONS section 4.4)', () => {
    const fin = { dtStart: '12:00:00.000', dtFinish: '12:00:45.000', time: '45.00', gates: '0,,,,,' };
    const c = coreWith([connected(T0), L(0, { dtStart: '12:00:00.000', gates: '0,,,,,' }), L(1000, fin), row(1500, { kind: 'duration', runSeconds: 45, penaltySeconds: 0, totalSeconds: 45 }), L(2000, { ...fin, completed: true })]);
    expect(prov(c, X, 'gates')).toBe(false);
  });
});

describe('O8b: the same listed start under two Phase dates is the same start, no run 2 (DERIVATIONS section 4.11 "Every other change of the listed start is a start correction"; review section 3 O8b)', () => {
  const RACE = 'K1M_BR1_18'; // not in the helpers' default Phase dates: the first listing is parsed with no date known
  const A = `${RACE}:52`;
  const T = (ms: number): string => plus('2026-04-19T07:05:00.000Z', ms);
  const listing = (ms: number, dates: Record<string, string>, over: Record<string, unknown>): Unit =>
    tcpUnit(msg(T(ms), listingText({ race: RACE, bib: 52, ...over })), dates);
  const results = (ms: number, time: string): Unit =>
    tcpUnit(
      msg(
        T(ms),
        `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st Run"><Row Number="1"><Participant Bib="  52" Id="24079.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="52" StartTime="10:16:00" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="0" Gates="" Time="${time}" Total="${time}" Rank="1" RankOrder="1" Behind="" PP="" /></Row></Results></Canoe123>`,
      ),
      { [RACE]: '2026-04-18' },
    );
  const NEXT_DAY = { [RACE]: '2026-04-18' }; // the Phase date filled in after the first listing; the first observation fell on 2026-04-19
  const OPTIONS = { zone: 'Europe/Prague' };
  const run = (c: ReturnType<typeof coreWith>): unknown => (c.presented(A)['run'] as { value?: unknown }).value;
  const start = { dtStart: '9:04:10.000' };

  it('listing with no Phase date known, the date filled in, the row (Time 90.00), the same start listed again without a finish: run stays 1, status on-course', () => {
    const c = coreWith([connected(T(-1000)), listing(0, {}, start), results(800, '90.00'), listing(1600, NEXT_DAY, start)], OPTIONS);
    expect(run(c)).toBe(1);
    expect((c.presented(A)['status'] as { value?: unknown }).value).toBe('on-course');
  });

  it('the same, the second listing carrying the finish and Time 90.00: run stays 1', () => {
    const c = coreWith([connected(T(-1000)), listing(0, {}, start), results(800, '90.00'), listing(1600, NEXT_DAY, { ...start, dtFinish: '9:05:40.000', time: '90.00' })], OPTIONS);
    expect(run(c)).toBe(1);
  });

  it('control: a really new start (another time of day) listed after the finished run is run 2', () => {
    const c = coreWith(
      [connected(T(-1000)), listing(0, {}, start), results(800, '90.00'), listing(1600, NEXT_DAY, { ...start, dtFinish: '9:05:40.000', time: '90.00' }), listing(2400, NEXT_DAY, { dtStart: '9:10:00.000' })],
      OPTIONS,
    );
    expect(run(c)).toBe(2);
  });
});
