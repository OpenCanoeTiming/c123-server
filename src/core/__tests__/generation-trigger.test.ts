import { describe, it, expect } from 'vitest';
import { REC } from './fixtures/real-excerpts.js';
import { R19, type Rec19 } from './fixtures/round19-excerpts.js';
import { attrOf, connected, coreWith, derive, instantOf, left, tcpUnit, xmlUnit, type Unit } from './streams.js';

// Round 19 (#203), code items 1 and 2: the generation trigger (CONTRACTS §2.6; DERIVATIONS §4.11; ADR-013 Revision 4; TEST-ARCHITECTURE P10).
// `run` increments at an on-course listing with a start different from the recorded one, NO finish, and a RECORDED generation (a results-table
// row with a time or a mark, attributed after the start, that stated something new); every other start change is a correction: no `run`, no
// results-table value, no placement moves at the listing. Expected values are read off the recorded text (attrOf), never from the core.
// Cases are the seven recorded start changes of DERIVATIONS §4.11's table; a case marked "derived" re-times or edits one recorded message.

type Core = ReturnType<typeof coreWith>;
const runOf = (c: Core, a: string): unknown => (c.presented(a)['run'] as { value?: unknown }).value;
const field = (c: Core, a: string, f: string): any => c.presented(a)[f];
const sent = (c: Core, from: number, a: string) => c.notifications().slice(from).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === a) as Array<{ fields: Record<string, unknown> }>;
const keysSent = (c: Core, from: number, a: string): string[] => sent(c, from, a).flatMap((m) => Object.keys(m.fields));
const time = (r: Rec19, tag = 'Result') => Number(attrOf(r.data, tag, 'Time'));

describe('start corrections after the finish: rows and listings in both arrival orders (DERIVATIONS §4.11 "Both arrival orders")', () => {
  interface Case { id: string; phase: string; bib: string; date: string; start: Rec19; rowA: Rec19; finish: Rec19; rowB: Rec19; corr: Rec19; stage?: Rec19 }
  const cases: Case[] = [
    { id: 'jarni-so-odp C1M_BR2_18:56 (81.62 rank 11 -> 120.98 rank 60)', phase: 'C1M_BR2_18', bib: '56', date: '2026-04-18', start: R19.c4Start, rowA: R19.c4RowA, finish: R19.c4Finish, rowB: R19.c4RowB, corr: R19.c4Corr, stage: R19.c4Stage },
    { id: 'nkz-19so K1M_BR2_19:53 (49.77 rank 1 -> 87.96 rank 30)', phase: 'K1M_BR2_19', bib: '53', date: '2026-09-19', start: R19.c5Start, rowA: R19.c5RowA, finish: R19.c5Finish, rowB: R19.c5RowB, corr: R19.c5Corr },
    { id: 'nkz-19so K1M_BR2_19:52 (92.09 -> 92.44)', phase: 'K1M_BR2_19', bib: '52', date: '2026-09-19', start: R19.c6Start, rowA: R19.c6RowA, finish: R19.c6Finish, rowB: R19.c6RowB, corr: R19.c6Corr },
  ];

  for (const c of cases) {
    const A = `${c.phase}:${c.bib}`;
    const day = { [c.phase]: c.date };
    const unit = (r: Rec19): Unit => tcpUnit(r, day);
    const tA = time(c.rowA);
    const tB = time(c.rowB);
    const rankA = Number(attrOf(c.rowA.data, 'Result', 'Rank'));
    const rankB = Number(attrOf(c.rowB.data, 'Result', 'Rank'));
    const finishAt = instantOf(c.date, attrOf(c.finish.data, 'Result', 'dtFinish'), '+02:00');
    const head = (): Unit[] => [connected(c.start.observedAt), ...(c.stage ? [unit(c.stage)] : []), unit(c.start)];

    it(`${c.id}: the recorded figures are what the test says (row A, row B, same dtFinish, a different dtStart in the correcting listing)`, () => {
      expect([tA, tB]).not.toEqual([tB, tB]);
      expect(attrOf(c.finish.data, 'Result', 'dtFinish')).toBe(attrOf(c.corr.data, 'Result', 'dtFinish'));
      expect(attrOf(c.start.data, 'Result', 'dtStart')).not.toBe(attrOf(c.corr.data, 'Result', 'dtStart'));
      expect(time(c.corr, 'Result')).toBe(tB);
      if (c.bib !== '52') expect(rankA).not.toBe(rankB); // :52 kept rank 37 and moved only its time
    });

    it(`vector start-correction-after-finish-row-first, real ${c.id}: row, finish, row, correcting listing -> run stays 1, the listing changes no presented value and placement is never not-yet`, () => {
      const core = coreWith(head());
      const placements: string[] = [];
      for (const u of [unit(c.rowA), unit(c.finish), unit(c.rowB)]) {
        core.applyUnit(u);
        placements.push(field(core, A, 'placement').state);
      }
      expect(placements).toEqual(['known', 'known', 'known']);
      expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp', value: { kind: 'duration', runSeconds: tB } });
      const before = { status: structuredClone(field(core, A, 'status')), outcome: structuredClone(field(core, A, 'outcome')), placement: structuredClone(field(core, A, 'placement')) };
      const n = core.notifications().length;
      core.applyUnit(unit(c.corr));
      expect(runOf(core, A)).toBe(1);
      expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'finished' });
      // vector start-correction-after-finish-row-first: the time and the rank stay, the unchanged finish is now the row's eventTime
      expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp', value: before.outcome.value, eventTime: finishAt });
      expect(field(core, A, 'placement')).toEqual(before.placement);
      expect(field(core, A, 'placement')).toMatchObject({ state: 'known', value: { rank: rankB } });
      expect(field(core, A, 'status')).toMatchObject({ value: before.status.value });
      expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run']));
      expect(keysSent(core, n, A).filter((k) => ['placement', 'status'].includes(k))).toEqual([]);
      expect(core.diagnostics()).toEqual([]);
    });

    it(`vector start-correction-after-finish-listing-first, real ${c.id}: the correcting listing before the second row -> still the first row's value (rule 1), no contradicted-finish; then the row supersedes`, () => {
      const core = coreWith([...head(), unit(c.rowA), unit(c.finish)]);
      const n = core.notifications().length;
      core.applyUnit(unit(c.corr));
      expect(runOf(core, A)).toBe(1);
      expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'finished' });
      expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: tA }, source: 'tcp' });
      expect(field(core, A, 'placement')).toMatchObject({ state: 'known', value: { rank: rankA } });
      expect((core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'contradicted-finish')).toEqual([]);
      expect(core.diagnostics()).toEqual([]);
      expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run']));
      core.applyUnit(unit(c.rowB));
      expect(runOf(core, A)).toBe(1);
      expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: tB }, eventTime: finishAt });
      expect(field(core, A, 'placement')).toMatchObject({ state: 'known', value: { rank: rankB } });
    });

    it(`real ${c.id}: both arrival orders end in the same presented state (DERIVATIONS §4.11)`, () => {
      const rowFirst = coreWith([...head(), unit(c.rowA), unit(c.finish), unit(c.rowB), unit(c.corr)]);
      const listingFirst = coreWith([...head(), unit(c.rowA), unit(c.finish), unit(c.corr), unit(c.rowB)]);
      for (const f of ['run', 'status', 'outcome', 'placement']) expect(field(listingFirst, A, f).value, f).toEqual(field(rowFirst, A, f).value);
      expect(field(listingFirst, A, 'outcome').eventTime).toBe(field(rowFirst, A, 'outcome').eventTime);
    });
  }
});

describe('start corrections with no finish and no row (DERIVATIONS §4.11 table, cases 1 to 3; vector start-correction-mid-run-keeps-generation)', () => {
  it('real jarni-so-do K1M_BR1_18:138: start moved 38 s earlier mid-run (Time 0 -> 89): run 1, on-course, running 89; then the row and the finish are presented as usual', () => {
    const A = 'K1M_BR1_18:138';
    const day = { K1M_BR1_18: '2026-04-18' };
    const core = coreWith([connected(R19.c1Stage.observedAt), tcpUnit(R19.c1Stage, day)]);
    expect(field(core, A, 'status')).toMatchObject({ value: 'at-start' });
    core.applyUnit(tcpUnit(R19.c1Start, day));
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: time(R19.c1Start) } });
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(R19.c1Corr, day));
    expect(attrOf(R19.c1Corr.data, 'Result', 'dtStart')).not.toBe(attrOf(R19.c1Start.data, 'Result', 'dtStart'));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: time(R19.c1Corr) } });
    expect(time(R19.c1Corr)).toBe(89);
    expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run']));
    expect(core.diagnostics()).toEqual([]);
    core.applyUnit(tcpUnit(R19.c1Row, day));
    core.applyUnit(tcpUnit(R19.c1Finish, day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'finished' });
    expect(field(core, A, 'outcome')).toMatchObject({
      state: 'known',
      value: { kind: 'duration', runSeconds: time(R19.c1Row) },
      eventTime: instantOf('2026-04-18', attrOf(R19.c1Finish.data, 'Result', 'dtFinish'), '+02:00'),
    });
    expect(field(core, A, 'placement')).toMatchObject({ state: 'known', value: { rank: Number(attrOf(R19.c1Row.data, 'Result', 'Rank')) } });
  });

  it('real nkz-19so K1W_BR2_19:9 (a second run): start moved 40 s earlier mid-run: run 1, running 57, the carried-over pair fields and placement are not dropped', () => {
    const A = 'K1W_BR2_19:9';
    const day = { K1W_BR2_19: '2026-09-19' };
    const core = coreWith([connected(R19.c2Stage.observedAt), tcpUnit(R19.c2Stage, day), tcpUnit(R19.c2RowPre, day), tcpUnit(R19.c2Start, day)]);
    const rankPre = Number(attrOf(R19.c2RowPre.data, 'Result', 'Rank'));
    expect(field(core, A, 'placement')).toMatchObject({ state: 'known', value: { rank: rankPre } });
    const kept = { placement: structuredClone(field(core, A, 'placement')), pairTotal: structuredClone(field(core, A, 'pairTotal')), countingRun: structuredClone(field(core, A, 'countingRun')) };
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(R19.c2Corr, day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: time(R19.c2Corr) } });
    expect(time(R19.c2Corr)).toBe(57);
    expect({ placement: field(core, A, 'placement'), pairTotal: field(core, A, 'pairTotal'), countingRun: field(core, A, 'countingRun') }).toEqual(kept);
    expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run', 'pairTotal', 'countingRun', 'placement']));
    core.applyUnit(tcpUnit(R19.c2RowPost, day));
    core.applyUnit(tcpUnit(R19.c2Finish, day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: time(R19.c2RowPost) } });
    expect(field(core, A, 'placement')).toMatchObject({ value: { rank: Number(attrOf(R19.c2RowPost.data, 'Result', 'Rank')) } });
  });

  it('real nkz-20ne K1M_BR1_20:115: the start deleted (a listing with dtStart empty) and given again 5 s later: at-start with the clock gone, then run 1 on-course, running 8', () => {
    const A = 'K1M_BR1_20:115';
    const day = { K1M_BR1_20: '2026-09-20' };
    const core = coreWith([connected(R19.c3Start.observedAt), tcpUnit(R19.c3Start, day)]);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ value: { kind: 'running' } });
    core.applyUnit(tcpUnit(R19.c3Empty, day));
    expect(attrOf(R19.c3Empty.data, 'Result', 'dtStart')).toBe('');
    expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'at-start' });
    expect(field(core, A, 'outcome')).toEqual({ state: 'not-yet' });
    expect(runOf(core, A)).toBe(1);
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(R19.c3Corr, day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ value: { kind: 'running', elapsedSeconds: time(R19.c3Corr) } });
    expect(time(R19.c3Corr)).toBe(8);
    expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run']));
    core.applyUnit(tcpUnit(R19.c3Finish, day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'finished' });
  });
});

describe('the one recorded re-run: nkz-19so C1M_BR1_19:7 (DERIVATIONS §4.11 case 7; vector rerun-trigger-new-start-after-recorded-finish)', () => {
  const A = 'C1M_BR1_19:7';
  const day = { C1M_BR1_19: '2026-09-19' };
  // The closure at 10:48:45 is an event the recordings do not hold (the recorder writes no connection records, TEST-ARCHITECTURE §9).
  const run1 = (): Unit[] => [connected(REC.n1Start.observedAt), tcpUnit(REC.n1Start, day), tcpUnit(REC.n2Row, day), tcpUnit(REC.n3Finish, day), left(A, '2026-09-19T10:48:45.300Z')];

  it('real nkz-19so: run 1 raced and closed, then the row is retracted (start-list push): status not-started, run still 1 (a retraction does not un-record the run)', () => {
    const core = coreWith([...run1(), tcpUnit(REC.n4Wiped, day)]);
    expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'not-started' });
    expect(runOf(core, A)).toBe(1);
    core.applyUnit(tcpUnit(REC.n5Gone, day));
    expect(runOf(core, A)).toBe(1);
  });

  it('real nkz-19so, staged with no start at 12:40:09 then the new start at 12:40:20: at-start with run 1, then run 2, on-course, every run-scoped field not-yet, one attempt.updated carrying run 2', () => {
    const core = coreWith([...run1(), tcpUnit(REC.n4Wiped, day), tcpUnit(REC.n5Gone, day), tcpUnit(R19.n6Stage, day)]);
    expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'at-start' });
    expect(runOf(core, A)).toBe(1);
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(REC.n6Start, day));
    expect(runOf(core, A)).toBe(2);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ value: { kind: 'running' } });
    for (const f of ['placement', 'gates', 'pairTotal']) expect(field(core, A, f), f).toEqual({ state: 'not-yet' });
    const m = sent(core, n, A);
    expect(m).toHaveLength(1);
    expect(m[0]!.fields).toMatchObject({ run: { state: 'known', value: 2 }, status: { value: 'on-course' } });
  });

  it('real nkz-19so, the staging listing missed: the first listing with the new start increments, the same end state (DERIVATIONS §4.11 "Both arrival orders")', () => {
    const withStage = coreWith([...run1(), tcpUnit(REC.n4Wiped, day), tcpUnit(REC.n5Gone, day), tcpUnit(R19.n6Stage, day), tcpUnit(REC.n6Start, day)]);
    const without = coreWith([...run1(), tcpUnit(REC.n4Wiped, day), tcpUnit(REC.n5Gone, day), tcpUnit(REC.n6Start, day)]);
    expect(runOf(without, A)).toBe(2);
    for (const f of ['run', 'status', 'outcome', 'placement']) expect(field(without, A, f), f).toEqual(field(withStage, A, f));
  });

  it('real nkz-19so, the row retracted but the stream finish and row 96.69 were recorded: the start change with no finish after a retraction still increments (kept through a retraction)', () => {
    // same stream as above without the staging listing and without the closure event: the Attempt is still listed when the new start arrives
    const core = coreWith([connected(REC.n1Start.observedAt), tcpUnit(REC.n1Start, day), tcpUnit(REC.n2Row, day), tcpUnit(REC.n3Finish, day), tcpUnit(REC.n4Wiped, day), tcpUnit(REC.n6Start, day)]);
    expect(runOf(core, A)).toBe(2);
  });
});

describe('which marks record the generation (DERIVATIONS §4.11 "Recorded"; third pass C2; code item 1 markAtStart)', () => {
  const A = 'K1M_BR2_19:54';
  const day = { K1M_BR2_19: '2026-09-19', K1M_BR1_19: '2026-09-19' };
  const corrected = (): Rec19 => derive(R19.m54Start, { observedAt: '2026-09-19T09:47:10.000Z', edit: (d) => d.replace('dtStart="11:46:59.980"', 'dtStart="11:46:58.980"') });
  const changedAfter = new Date(Date.parse(R19.m54Xml.observedAt) - 5000).toISOString();

  it('the recorded figures: TCP DNS before the start, the XML first carries DNS 3.1 s after it (K1M_BR2_19:54)', () => {
    expect(attrOf(R19.m54Row.data, 'Result', 'IRM')).toBe('DNS');
    expect(Date.parse(R19.m54Row.observedAt)).toBeLessThan(Date.parse(R19.m54Start.observedAt));
    expect(Date.parse(R19.m54Xml.observedAt) - Date.parse(R19.m54Start.observedAt)).toBeGreaterThan(3000);
    expect(Date.parse(R19.m54Xml.observedAt) - Date.parse(R19.m54Start.observedAt)).toBeLessThan(3200);
    expect(R19.m54Xml.data).toMatch(/<Status>DNS<\/Status>/);
  });

  it('real nkz-19so K1M_BR2_19:54 (derived: a start correction of 1 s added after the XML): a mark standing on TCP at the start and first carried by XML 3.1 s later records nothing, so the correction keeps run 1', () => {
    const core = coreWith([connected(R19.m54Row.observedAt), tcpUnit(R19.m54Row, day), tcpUnit(R19.m54Start, day), xmlUnit(R19.m54Xml, day, changedAfter)]);
    expect(runOf(core, A)).toBe(1);
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(corrected(), day));
    expect(attrOf(corrected().data, 'Result', 'dtStart')).not.toBe(attrOf(R19.m54Start.data, 'Result', 'dtStart'));
    expect(runOf(core, A)).toBe(1);
    expect(keysSent(core, n, A)).not.toEqual(expect.arrayContaining(['run']));
  });

  it('(derived: the DNS row re-timed to arrive after the start) a mark no source held at the start, attributed after it, records: the start change with no finish is a re-run, run 2', () => {
    const late = derive(R19.m54Row, { observedAt: '2026-09-19T09:47:05.000Z' });
    const core = coreWith([connected(R19.m54Start.observedAt), tcpUnit(R19.m54Start, day), tcpUnit(late, day)]);
    expect(runOf(core, A)).toBe(1);
    core.applyUnit(tcpUnit(corrected(), day));
    expect(runOf(core, A)).toBe(2);
  });

  it('(derived: the DNS row re-sent by a later rotation) a pre-start DNS re-sent by its own source after the start is INV-5\'s re-delivery and records nothing: run stays 1', () => {
    const rotation = derive(R19.m54Row, { observedAt: '2026-09-19T09:47:05.000Z' });
    const core = coreWith([connected(R19.m54Row.observedAt), tcpUnit(R19.m54Row, day), tcpUnit(R19.m54Start, day), tcpUnit(rotation, day)]);
    core.applyUnit(tcpUnit(corrected(), day));
    expect(runOf(core, A)).toBe(1);
  });
});

describe('what records and what un-records (DERIVATIONS §4.11, second pass B2 and Q1)', () => {
  const A = 'C1M_BR2_18:56';
  const day = { C1M_BR2_18: '2026-04-18' };
  const newStartNoFinish = (observedAt: string): Rec19 =>
    derive(R19.c4Start, { observedAt, edit: (d) => d.replace('dtStart="15:51:40.580"', 'dtStart="15:51:01.220"') });
  const sameStartNoFinish = (observedAt: string): Rec19 => derive(R19.c4Start, { observedAt });

  it('(derived) the stream alone never records: a finish listed with no row behind it, then a listing with a new start and no finish: run 1, the finish withdrawn (on-course, running, no diagnostic)', () => {
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4Finish, day)]);
    expect(field(core, A, 'status')).toMatchObject({ value: 'finished' });
    core.applyUnit(tcpUnit(newStartNoFinish('2026-04-18T13:53:10.000Z'), day));
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, A, 'outcome')).toMatchObject({ value: { kind: 'running' } });
    expect(core.diagnostics()).toEqual([]);
  });

  it('(derived) a row with a time attributed after the start records: the same start change with no finish afterwards is a re-run (run 2)', () => {
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4RowA, day)]);
    expect(runOf(core, A)).toBe(1);
    core.applyUnit(tcpUnit(newStartNoFinish('2026-04-18T13:53:10.000Z'), day));
    expect(runOf(core, A)).toBe(2);
  });

  it('(derived) a contradiction un-records (INV-2d: the athlete is on course with that start, the row described no finish of this run): the following start change is a correction, run 1', () => {
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4RowA, day), tcpUnit(R19.c4Finish, day)]);
    core.applyUnit(tcpUnit(sameStartNoFinish('2026-04-18T13:53:05.000Z'), day));
    expect((core.diagnostics() as Array<{ kind: string }>).map((d) => d.kind)).toContain('contradicted-finish');
    core.applyUnit(tcpUnit(newStartNoFinish('2026-04-18T13:53:10.000Z'), day));
    expect(runOf(core, A)).toBe(1);
  });
});

describe('a correcting listing that carries the generation\'s finish restates the time even after Completed (DERIVATIONS §4.3, second pass B5; code item 1 observeStreamOutcome)', () => {
  const A = 'C1M_BR2_18:56';
  const day = { C1M_BR2_18: '2026-04-18' };
  const finishAt = instantOf('2026-04-18', attrOf(R19.c4Finish.data, 'Result', 'dtFinish'), '+02:00');
  const corrTime = time(R19.c4Corr);
  const expectRestated = (core: Core): void => {
    expect(runOf(core, A)).toBe(1);
    expect(field(core, A, 'status')).toMatchObject({ value: 'finished' });
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: corrTime }, eventTime: finishAt });
  };

  it('(derived: Completed edited to Y on the recorded finish listing) the run closed with 81.62, then the correcting listing states 120.98: no row ever follows, the presented time is 120.98', () => {
    const closed = derive(R19.c4Finish, { observedAt: '2026-04-18T13:53:05.000Z', edit: (d) => d.replace('Completed="N"', 'Completed="Y"') });
    expect(attrOf(closed.data, 'Result', 'Completed')).toBe('Y');
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4Finish, day), tcpUnit(closed, day)]);
    expect(field(core, A, 'outcome')).toMatchObject({ value: { kind: 'duration', runSeconds: time(R19.c4Finish) } });
    core.applyUnit(tcpUnit(R19.c4Corr, day));
    expectRestated(core);
  });

  it('(derived: the Attempt left the list before the correcting listing) stop (c): the re-listing with the corrected start restates the time', () => {
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4Finish, day), left(A, '2026-04-18T13:53:20.000Z'), tcpUnit(R19.c4Corr, day)]);
    expectRestated(core);
  });

  it('real jarni-so-odp: the correcting listing missed, the next one (Completed Y, corrected start, 120.98) is the first to state it: the presented time is 120.98, run 1', () => {
    expect(attrOf(R19.c4Closed.data, 'Result', 'Completed')).toBe('Y');
    expect(time(R19.c4Closed)).toBe(corrTime);
    const core = coreWith([connected(R19.c4Start.observedAt), tcpUnit(R19.c4Start, day), tcpUnit(R19.c4Finish, day), tcpUnit(R19.c4Closed, day)]);
    expectRestated(core);
  });
});
