import { describe, it, expect } from 'vitest';
import { JA51, JA51_XML } from './fixtures/round24-excerpts.js';
import { LEAVE } from './fixtures/leave-excerpts.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { at as sec, field, kit } from './kit.js';
import { connected, coreWith, derive, tcpUnit, xmlUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

// Round 24 (#242; design-round24.md rulings 2, 3, 5, 8, 9, 10 and the code list's Core part). Expected values come from the contract sentences
// named in each test name and from the raw rows, never from running the core. Hand streams: kit.ts / text.ts (no real clock); real excerpts:
// fixtures/round24-excerpts.ts (jarni-ne-do K1M_BR2_19:51, the first C1/D1 occurrence of the ja window), fixtures/leave-excerpts.ts (cp3-cross stall10).

type Core = ReturnType<typeof coreWith>;
type Env = { state?: string; value?: unknown; source?: string; confidence?: string; provisional?: boolean; observedAt?: string; reason?: string };
const env = (c: Core, id: string, f: string): Env => c.presented(id)[f] as Env;
const withoutAt = (e: unknown): string => JSON.stringify({ ...(e as object), observedAt: undefined });
/** attempt.updated messages after notification index `from` that carry `f` for `id`. */
const carrying = (c: Core, from: number, id: string, f: string): Array<Record<string, unknown>> =>
  (c.notifications().slice(from) as Array<Record<string, any>>).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === id && m['fields'] !== undefined && f in m['fields']).map((m) => m['fields'][f]);

const JA = 'K1M_BR2_19:51';
const JA_DAY = { K1M_BR2_19: '2026-04-19' };
const duration = (runSeconds: number, penaltySeconds = 0) => ({ kind: 'duration', runSeconds, penaltySeconds, totalSeconds: runSeconds + penaltySeconds });

describe('C1 (round 24 ruling 3; CONTRACTS §1.2 "the clause reaches every field a row states": underReview, qualified are judged fields)', () => {
  it('real jarni-ne-do K1M_BR2_19:51 (listed on course, Gates cells blank beyond the 14th, run 2 not closed, no course bound): underReview and qualified are provisional at every record from the first Results row on', () => {
    const core = coreWith([connected(JA51[0]!.observedAt)]);
    const rowAt = JA51.findIndex((r) => r.data.includes('<Results'));
    expect(JA51[rowAt]!.observedAt).toBe('2026-04-19T08:50:01.918Z');
    expect(JA51.some((r) => /Completed="Y"/.test(r.data))).toBe(false); // the run is never closed in the excerpt
    let checked = 0;
    JA51.forEach((r, i) => {
      core.applyUnit(tcpUnit(r, JA_DAY, { courses: {} }));
      if (i < rowAt) return;
      for (const f of ['underReview', 'qualified']) {
        const e = env(core, JA, f);
        if (e.state === 'known') { expect(e.provisional, `${r.observedAt} ${f}`).toBe(true); checked++; }
      }
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('a row stating a result while judging is incomplete (no judgingComplete stamp, no course bound): underReview and qualified are provisional beside the outcome', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.snap('tcp', sec(10), { outcome: duration(90), placement: { rank: 2, order: 2 }, underReview: true, qualified: true })]);
    expect(field(c, A, 'outcome')).toMatchObject({ provisional: true });
    expect(field(c, A, 'underReview')).toMatchObject({ state: 'known', value: true, provisional: true });
    expect(field(c, A, 'qualified')).toMatchObject({ state: 'known', value: true, provisional: true });
  });

  it('and they stop being provisional with the rest of the row when judging completes (judgingComplete true is the row\'s own stamp)', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.snap('tcp', sec(10), { outcome: duration(90), placement: { rank: 2, order: 2 }, underReview: true, qualified: true, judgingComplete: true })]);
    expect(field(c, A, 'outcome')).toMatchObject({ provisional: false });
    expect(field(c, A, 'underReview')).toMatchObject({ state: 'known', value: true, provisional: false });
    expect(field(c, A, 'qualified')).toMatchObject({ state: 'known', value: true, provisional: false });
  });

  it('exemption 1 stays (CONTRACTS §1.2, round 21): an Attempt with no run yet, its row carrying neither time nor mark, has no run to judge: underReview is not provisional', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    c.applyUnit([k.snap('tcp', sec(10), { underReview: false, qualified: false })]);
    expect(field(c, A, 'underReview')).toMatchObject({ state: 'known', provisional: false });
  });
});

describe('D2 (round 24 ruling 3; CONTRACTS §1.2 "Two exemptions": a Kayak Cross heat)', () => {
  const A = 'WX1_XS_26:3', P = 'WX1_XS_26';
  const heatRow = { outcome: { kind: 'ordinal', order: 2 }, placement: { rank: 2, order: 2 }, qualified: true, underReview: false, judgingComplete: false };

  it('before the placement is presented, qualified and underReview are under the clause like any value (a listed heat Attempt, no course, row without placement)', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.snap('tcp', sec(10), { qualified: true, underReview: false, judgingComplete: false })]);
    expect(field(c, A, 'qualified')).toMatchObject({ state: 'known', provisional: true });
    expect(field(c, A, 'underReview')).toMatchObject({ state: 'known', provisional: true });
  });

  it('from the step the placement is presented, placement, the ordinal outcome, qualified and underReview leave the clause even with judgingComplete false (real cp3-cross WX1_XF_26 / WX1_XS_26 heats: upstream\'s whole result)', () => {
    const k = kit(A, P); const c = k.core();
    c.applyUnit(k.listing(sec(1), '10:00:00.000'));
    c.applyUnit([k.snap('tcp', sec(10), heatRow)]);
    for (const f of ['placement', 'outcome', 'qualified', 'underReview']) expect(field(c, A, f), f).toMatchObject({ state: 'known', provisional: false });
  });
});

describe('C2 (round 24 ruling 5; CONTRACTS §1.6 "the first message for a new id carries the whole resource", DERIVATIONS §2.1 "a lookup with no uncertainty")', () => {
  const phaseUpdates = (c: Core, id: string): Array<Record<string, any>> => (c.notifications() as Array<Record<string, any>>).filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === id);

  it('a slalom second run first seen on TCP (no XML read yet) presents format BR2, kind race, scoringKind duration, heats false, pair second/best with no sibling, and a stage (CONTRACTS §2.4 table)', () => {
    const c = coreWith([connected('2026-04-19T08:00:00.000Z'), tcpUnit(msg('2026-04-19T08:00:01.000Z', listingText({ race: 'K1M_BR2_19', bib: 51, dtStart: '10:00:00.000' })), JA_DAY)]);
    const p = c.phase('K1M_BR2_19') as Record<string, any>;
    expect(p['format']).toBe('BR2');
    expect(p['kind']).toBe('race');
    expect(p['scoringKind']).toBe('duration');
    expect(p['heats']).toBe(false);
    expect(p['pair']).toEqual({ role: 'second', siblingPhaseId: null, combination: 'best' });
    expect(p['stage']).toBeDefined(); // the table does not list Stage's value here; presence is the rule (guess: the value is not pinned)
  });

  it('round 27 (CONTRACTS §1.6, §2.4, DERIVATIONS §2.1): nothing is sent for the Phase at the bare on-course listing; its creating phase.updated, at the first message that states its classId, carries format, kind, scoringKind, pair, heats and stage', () => {
    const c = coreWith([connected('2026-04-19T08:00:00.000Z'), tcpUnit(msg('2026-04-19T08:00:01.000Z', listingText({ race: 'K1M_BR2_19', bib: 51, dtStart: '10:00:00.000' })), JA_DAY)], { classIdsFromIds: false }); // the kit would state the class from the id
    expect(phaseUpdates(c, 'K1M_BR2_19'), 'a listing states no ClassId: the Phase is not created yet').toEqual([]);
    const row = JA51.find((r) => r.data.includes('<Results'))!; // recorded Results row of K1M_BR2_19: names RaceId and ClassId
    expect(/ClassId="K1M"/.test(row.data)).toBe(true);
    c.applyUnit(tcpUnit(row, JA_DAY));
    const first = phaseUpdates(c, 'K1M_BR2_19')[0];
    expect(first).toBeDefined();
    for (const f of ['format', 'kind', 'scoringKind', 'pair', 'heats', 'stage', 'classId']) expect(first!['fields'], f).toHaveProperty(f);
    expect(first!['fields']['format']).toBe('BR2');
    expect(first!['fields']['classId']).toBe('K1M');
  });

  it('real cp3-cross WX1_XF_26 start list (a Kayak Cross heat, first message of the id): format XF, race, ordinal, heats true, no pair', () => {
    const c = coreWith([connected(R19.xfStartList.observedAt), tcpUnit(R19.xfStartList, { WX1_XF_26: '2026-04-26' })]);
    const p = c.phase('WX1_XF_26') as Record<string, any>;
    expect(p['format']).toBe('XF');
    expect(p['kind']).toBe('race');
    expect(p['scoringKind']).toBe('ordinal');
    expect(p['heats']).toBe(true);
    expect(p['pair']).toBeNull();
    const first = phaseUpdates(c, 'WX1_XF_26')[0];
    expect(first!['fields']).toMatchObject({ format: 'XF', heats: true, scoringKind: 'ordinal' });
  });
});

describe('ruling 2 (CONTRACTS §1.2 "such an inference while no row of the generation stating a result is presented", §4.6(e); vector gates-blank-result-cell-keeps-judged-oncourse-cell)', () => {
  it('real jarni-ne-do K1M_BR2_19:51, the no-course `cells` path: the cells taken before any snapshot stay inferred when the first snapshot binds the course, though its row (Time empty, no cells) is no row stating a result', () => {
    const before = JA51.filter((r) => r.observedAt < '2026-04-19T08:50:10.000Z');
    const core = coreWith([connected(JA51[0]!.observedAt)]);
    for (const r of before) core.applyUnit(tcpUnit(r, JA_DAY, { courses: {} }));
    expect(env(core, JA, 'gates')).toEqual({ state: 'not-yet' }); // no course: nothing to number the cells by
    expect(/<Time>/.test(/<Results>[\s\S]*?<\/Results>/.exec(JA51_XML.data)![0])).toBe(false); // the snapshot's row carries no time; PrevTime is run 1's
    const read = derive(JA51_XML, { observedAt: '2026-04-19T08:50:10.000Z' }); // the recorded content, polled after the listings
    core.applyUnit(xmlUnit(read, JA_DAY, JA51_XML.observedAt));
    const g = env(core, JA, 'gates');
    expect(g.state).toBe('known');
    expect(g).toMatchObject({ confidence: 'inferred', source: 'tcp', provisional: true });
  });

  it('the same real window with the course known to the parser (`gates` observations, not `cells`): inferred from the first listing', () => {
    const core = coreWith([connected(JA51[0]!.observedAt)]);
    let known = 0;
    for (const r of JA51) {
      core.applyUnit(tcpUnit(r, JA_DAY));
      const g = env(core, JA, 'gates');
      if (g.state === 'known') { known++; expect(g.confidence, r.observedAt).toBe('inferred'); }
    }
    expect(known).toBeGreaterThan(30);
  });

  it('INV-5 real: a re-listing that changes no cell sends no gates delta: no message restates the presented gates envelope (jarni-ne-do K1M_BR2_19:51, P9 gates)', () => {
    const core = coreWith([connected(JA51[0]!.observedAt)]);
    let last: string | undefined; let sent = 0;
    for (const r of JA51) {
      const n = core.notifications().length;
      core.applyUnit(tcpUnit(r, JA_DAY));
      for (const g of carrying(core, n, JA, 'gates')) { if (last !== undefined) expect(withoutAt(g), r.observedAt).not.toBe(last); last = withoutAt(g); sent++; }
    }
    expect(sent).toBeGreaterThan(2);
  });

  it('INV-5 real (Cross faults): cp3-cross MX1_XT_26:8 listed every second before its first Results row (08:45:00.903): faults is inferred and no re-listing restates an unchanged faults envelope (P5/P9 faults)', () => {
    const recs = LEAVE.coldXt8;
    const rowAt = recs.findIndex((r) => r.data.includes('<Results'));
    expect(recs[rowAt]!.observedAt).toBe('2026-04-26T08:45:00.903Z');
    const id = 'MX1_XT_26:8';
    const core = coreWith([connected(recs[0]!.observedAt)]);
    let last: string | undefined; let known = 0; let sent = 0;
    recs.forEach((r, i) => {
      const n = core.notifications().length;
      core.applyUnit(tcpUnit(r, { MX1_XT_26: '2026-04-26' }));
      const f = env(core, id, 'faults');
      if (i < rowAt && f.state === 'known') { known++; expect(f, r.observedAt).toMatchObject({ confidence: 'inferred', source: 'tcp', provisional: true }); }
      for (const m of carrying(core, n, id, 'faults')) { if (last !== undefined) expect(withoutAt(m), r.observedAt).not.toBe(last); last = withoutAt(m); sent++; }
    });
    expect(known).toBeGreaterThan(5);
    expect(sent).toBeGreaterThan(1);
  });

  describe('hand streams on the OnCourse + Results shapes (K1M_BR1_19 bib 51, slalom)', () => {
    const RACE = 'K1M_BR1_19', ID = `${RACE}:51`, DAY = { [RACE]: '2026-09-19' }, T0 = '2026-09-19T10:00:00.000Z';
    const live = (ms: number, gates: string, over: Record<string, unknown> = {}): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 2, pos: 1, dtStart: '12:00:00.000', gates, ...over })), DAY);
    const row = (ms: number, bibs: Array<{ bib: number; time: string; gates: string }>): Unit => tcpUnit(msg(plus(T0, ms),
      `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st Run">${bibs.map((b, n) => `<Row Number="${n + 1}"><Participant Bib="${String(b.bib).padStart(4)}" Id="${b.bib}.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="${b.bib}" StartTime="12:00:00" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="0" Gates="${b.gates}" Time="${b.time}" Total="${b.time || '0.00'}" Rank="${b.time ? n + 1 : ''}" RankOrder="${b.time ? n + 1 : ''}" Behind="" PP="" /></Row>`).join('')}</Results></Canoe123>`), DAY);
    const CELLS = '  0  0';

    it('before any row, the stream\'s cells are inferred (vector gates-blank-result-cell-keeps-judged-oncourse-cell: the on-course cells are inference observations)', () => {
      const c = coreWith([connected(T0), live(0, '0,0,,,,')]);
      expect(env(c, ID, 'gates')).toMatchObject({ state: 'known', confidence: 'inferred', source: 'tcp', provisional: true });
    });

    it('a row that states a time makes the merged vector the row\'s observation: authoritative, the row\'s source and its observedAt (CONTRACTS §1.2, §4.6(e) "not an inference")', () => {
      const c = coreWith([connected(T0), live(0, '0,0,,,,'), row(3000, [{ bib: 51, time: '82.36', gates: CELLS }])]);
      expect(env(c, ID, 'gates')).toMatchObject({ state: 'known', confidence: 'authoritative', source: 'tcp', observedAt: plus(T0, 3000) });
    });

    it('a row with no time and no mark (cells alone) is no row of the generation: the cells stay inferred (CONTRACTS §1.2, second pass)', () => {
      const c = coreWith([connected(T0), live(0, '0,0,,,,'), row(3000, [{ bib: 51, time: '', gates: CELLS }])]);
      expect(env(c, ID, 'gates')).toMatchObject({ confidence: 'inferred' });
    });

    it('a later re-listing that changes no presented cell keeps the row\'s observedAt and sends no gates delta (INV-5, "the element that last changed the presented cells")', () => {
      const c = coreWith([connected(T0), live(0, '0,0,,,,'), row(3000, [{ bib: 51, time: '82.36', gates: CELLS }])]);
      const n = c.notifications().length;
      c.applyUnit(live(4000, '0,0,,,,'));
      expect(env(c, ID, 'gates')).toMatchObject({ confidence: 'authoritative', observedAt: plus(T0, 3000) });
      expect(carrying(c, n, ID, 'gates')).toHaveLength(0);
    });

    it('after the row\'s retraction (a later table without bib 51) the next listing\'s vector is an inference again (CONTRACTS §1.2; P6(a))', () => {
      const c = coreWith([connected(T0), live(0, '0,0,,,,'), row(3000, [{ bib: 51, time: '82.36', gates: CELLS }]), row(5000, [{ bib: 44, time: '80.00', gates: CELLS }]), live(6000, '0,0,,,,')]);
      expect(env(c, ID, 'outcome')).not.toMatchObject({ state: 'known' }); // the row is gone
      expect(env(c, ID, 'gates')).toMatchObject({ state: 'known', confidence: 'inferred' });
    });
  });
});

describe('ruling 8 / D6 (rule 2: a listing\'s `entry` is the `tcp` side)', () => {
  it('an xml row restating the entry a listing stated changes nothing presented, `source` and `observedAt` included, and sends no entry delta', () => {
    const A = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P); const c = k.core();
    c.applyUnit([k.obs('entry', 'tcp', 'inference', sec(1), { entryId: '9069.K1M' })]);
    const n = c.notifications().length;
    c.applyUnit([k.rewrite(sec(10), null), k.obs('entry', 'xml', 'result-row', sec(10), { entryId: '9069.K1M' })]);
    expect(field(c, A, 'entry')).toMatchObject({ state: 'known', value: { entryId: '9069.K1M' }, source: 'tcp', observedAt: sec(1) });
    expect(carrying(c, n, A, 'entry')).toHaveLength(0);
  });
});

describe('ruling 9 / D8 (DERIVATIONS §4.8 `splits`; TEST-ARCHITECTURE properties 3 and 4)', () => {
  const RACE = 'K1M_BR1_19', ID = `${RACE}:51`, DAY = { [RACE]: '2026-09-19' }, T0 = '2026-09-19T10:00:00.000Z';
  const RC0 = '<Canoe123 System="Main"><RaceConfig NrSplits="0" NrGates="23" GateConfig="RNNNNRNNRNNRNNNNRNNRNNN" GateCaptions="1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23" /></Canoe123>';
  const live = (ms: number, split = ''): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 2, pos: 1, dtStart: '12:00:00.000' }).replace('dtSplit1=""', `dtSplit1="${split}"`)), DAY);

  it('the RaceConfig step itself presents nothing for splits (not-yet stays), no attempt message carries splits at it', () => {
    const c = coreWith([connected(T0), live(0)]);
    const n = c.notifications().length;
    c.applyUnit(tcpUnit(msg(plus(T0, 1000), RC0), DAY));
    expect(env(c, ID, 'splits')).toEqual({ state: 'not-yet' });
    expect(carrying(c, n, ID, 'splits')).toHaveLength(0);
  });

  it('the Attempt\'s next step that carries splits presents unavailable{not-applicable}', () => {
    const c = coreWith([connected(T0), live(0), tcpUnit(msg(plus(T0, 1000), RC0), DAY)]);
    const n = c.notifications().length;
    c.applyUnit(live(2000, '12:00:30.000'));
    expect(env(c, ID, 'splits')).toEqual({ state: 'unavailable', reason: 'not-applicable' });
    expect(carrying(c, n, ID, 'splits').length).toBeGreaterThan(0);
  });
});

describe('side finding 2 / ruling 10 (CONTRACTS §4 step 1\'s discard list): scope.replaced discards only the list', () => {
  it('after [rebaseline, xml-rewrite-detected, snapshot] courseOrder and the lifecycle status keep their tcp source and observedAt (the discard list does not name them)', () => {
    const RACE = 'K1M_BR1_19', ID = `${RACE}:51`, T0 = '2026-09-19T10:00:00.000Z';
    const k = kit(ID, RACE); const c = coreWith([connected(T0), tcpUnit(msg(plus(T0, 1000), listingText({ race: RACE, bib: 51, total: 2, pos: 2, dtStart: '12:00:00.000' })), { [RACE]: '2026-09-19' })]);
    const before = { courseOrder: env(c, ID, 'courseOrder'), status: env(c, ID, 'status') };
    expect(before.courseOrder).toMatchObject({ state: 'known', source: 'tcp' });
    expect(before.status).toMatchObject({ value: 'on-course', source: 'tcp' });
    c.applyUnit([{ ingestSeq: 0, event: 'rebaseline', observedAt: plus(T0, 5000), scope: { kind: 'phase', phaseId: RACE } } as never, ...k.xml(plus(T0, 5000), plus(T0, 4000), { startOrder: 51 })]);
    expect(env(c, ID, 'courseOrder')).toEqual(before.courseOrder);
    expect(env(c, ID, 'status')).toEqual(before.status);
  });
});
