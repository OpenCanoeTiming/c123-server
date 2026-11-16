/**
 * #318 (N1, N3, CQ-A = DERIVATIONS §10 item 35): no presented state pairs a `running` outcome with a `status` other than `on-course`
 * (DERIVATIONS §4.3 `running` bullet, §4.1, §10 item 43 (a)-(c); TEST-ARCHITECTURE property 4; DA ruling item 16 tests (i)-(vii)).
 * Channel: the on-course stream (TCP `OnCourse` listings, the `inference` slot); a TCP results row where a row follows.
 * Slalom listings are constructed (text.ts, the recorded shape). The Cross time-trial finish uses the real cp3-cross WX1_XT_26:25 listings
 * (fixtures R19 xt1, xt3) and a constructed K1W_XT_19; Cross heat and time-trial at-start listings are constructed (a real heat listing edited
 * to carry a Time). Expected values come from the rules, never the core. No real clock: every instant is injected.
 * Every test applies each unit through `step`, which checks the invariant after every unit (row 8, DA test (vii)).
 */
import { describe, expect, it } from 'vitest';
import { connected, coreWith, derive, tcpUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';
import { R19 } from './fixtures/round19-excerpts.js';

type Core = ReturnType<typeof coreWith>;
const T0 = '2026-09-19T10:00:00.000Z';
const SLALOM = 'K1M_BR1_19';
const TT = 'K1W_XT_19';
const HEAT = 'K1W_XS_19';
const DAYS = { [SLALOM]: '2026-09-19', [TT]: '2026-09-19', [HEAT]: '2026-09-19', WX1_XT_26: '2026-04-26', WX1J_XS_26_JUN: '2026-04-26' };
const X = 51;
const Y = 44;
// dtStart / dtFinish are the venue's local time of day (CEST, +02:00): T0 is 12:00:00 local
const START = '11:59:40.000';
const FINISH = '12:00:01.000';

const f = (c: Core, id: string, name: string): { state?: string; value?: any } => c.presented(id)[name] as { state?: string; value?: any };
const inSet = (c: Core, id: string): boolean => c.oncourse().attemptIds.map(String).includes(id);
/** The presented pair the rule is about. */
const pair = (c: Core, id: string): { status: unknown; outcome: unknown } => ({ status: f(c, id, 'status').value, outcome: f(c, id, 'outcome') });

/** Row 8 / DA test (vii): after EVERY unit, no `running` outcome beside a `status` other than `on-course`, for each Attempt named. */
const step = (c: Core, u: Unit, ids: string[]): void => {
  c.applyUnit(u);
  for (const id of ids) {
    const o = f(c, id, 'outcome');
    if (o?.value?.kind === 'running') expect(f(c, id, 'status').value, `running presented beside status ${String(f(c, id, 'status').value)} (${id})`).toBe('on-course');
  }
};

const listing = (race: string, bib: number, ms: number, over: Record<string, unknown> = {}, edit?: (t: string) => string): Unit => {
  const text = listingText({ race, bib, total: 2, pos: bib === X ? 2 : 1, ...over });
  return tcpUnit(msg(plus(T0, ms), edit ? edit(text) : text), DAYS, { courses: {} });
};
const noGates = (t: string): string => t.replace(/ Gates="[^"]*"/, '');
const row = (race: string, ms: number, result: string): Unit =>
  tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><Results RaceId="${race}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st Run"><Row Number="1"><Participant Bib="  ${X}" Id="5151.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="${X}" StartTime="11:59:00" /><Result Type="T" HeatNr="0" Q="" ${result} Behind="" PP="" /></Row></Results></Canoe123>`), DAYS, { courses: {} });
const FINISHED_ROW = 'IRM="" Pen="0" Gates="" Time="21.00" Total="21.00" Rank="1" RankOrder="1"';

/** Y listed beside X, X listed `running` at 17 s (a start, no finish). Returns the core and the ids. */
const withRunning = (race: string): { c: Core; xid: string; ids: string[] } => {
  const xid = `${race}:${X}`;
  const ids = [xid, `${race}:${Y}`];
  const c = coreWith([connected(T0)]);
  step(c, listing(race, Y, 0, { dtStart: '11:59:10.000', time: '45.00' }), ids);
  step(c, listing(race, X, 0, { dtStart: START, time: '17.00' }), ids);
  expect(f(c, xid, 'status').value, 'precondition: on-course').toBe('on-course');
  expect(f(c, xid, 'outcome'), 'precondition: running 17').toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: 17 } });
  return { c, xid, ids };
};
/** From X's last listing at `lastMs`, only Y is listed: the leave fires at the constant (4 s, DERIVATIONS §4.1). */
const leaveAfter = (c: Core, race: string, lastMs: number, ids: string[], yOver: Record<string, unknown> = { dtStart: '11:59:10.000', time: '45.00' }): void => {
  step(c, listing(race, Y, lastMs + 2000, yOver), ids);
  step(c, listing(race, Y, lastMs + 4000, yOver), ids);
};

describe('N1 slalom: a finish listing with no duration to infer ends `running` (DERIVATIONS §4.3 bullet 2; §10 item 43 (a); DA item 16 (i), (iii))', () => {
  it('vector-rule #318 row 1 / DA (i): running 17, then dtStart + dtFinish + empty Time: finished, outcome not-yet; the leave changes nothing; a TCP row then presents its outcome', () => {
    const { c, xid, ids } = withRunning(SLALOM);
    const fin = listing(SLALOM, X, 1000, { dtStart: START, dtFinish: FINISH, time: '' });
    step(c, fin, ids);
    expect(pair(c, xid), 'the finish listing ends running; nothing infers a duration').toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
    leaveAfter(c, SLALOM, 1000, ids);
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid), 'the leave changes nothing').toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
    step(c, row(SLALOM, 7000, FINISHED_ROW), ids);
    expect(f(c, xid, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 21 } });
    expect(f(c, xid, 'status').value).toBe('finished');
  });

  it('vector-rule #318 row 3 / DA (iii): a finish listing with a Time and no Gates attribute: finished, outcome not-yet, gates-absent diagnostic, no running; the leave changes nothing', () => {
    const { c, xid, ids } = withRunning(SLALOM);
    const fin = listing(SLALOM, X, 1000, { dtStart: START, dtFinish: FINISH, time: '21.00' }, noGates);
    expect(fin.map((e: any) => e.diagnostic?.kind), 'precondition: the parser states gates-absent').toContain('gates-absent');
    step(c, fin, ids);
    expect(pair(c, xid)).toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
    // DERIVATIONS §0.5 (#367): `gates-absent` is ingest-only, it goes to the admin log (the drain), never to `diagnostics()`
    const log = (c as unknown as { drainIngestDiagnostics(): Array<{ kind: string; attemptId?: string }> }).drainIngestDiagnostics();
    expect(log.filter((d) => d.kind === 'gates-absent' && d.attemptId === xid)).toHaveLength(1);
    leaveAfter(c, SLALOM, 1000, ids);
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid)).toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
  });
});

describe('N1 Cross time trial: a finish listing with no Time ends `running` (DERIVATIONS §4.1 time-trial finish per competitor; §10 item 43 (a); DA item 16 (ii))', () => {
  it('vector-rule #318 row 2 / DA (ii): K1W_XT_19 running 17, then dtStart + dtFinish + empty Time: finished, not-yet; the leave changes nothing', () => {
    const { c, xid, ids } = withRunning(TT);
    expect(xid, 'precondition: a time-trial Phase (XT)').toContain('_XT_');
    step(c, listing(TT, X, 1000, { dtStart: START, dtFinish: FINISH, time: '' }), ids);
    expect(pair(c, xid)).toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
    leaveAfter(c, TT, 1000, ids);
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid), 'a Cross leave changes nothing (§10 item 35)').toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
  });

  it('vector-rule #318 row 2 / DA (ii), real cp3-cross WX1_XT_26:25: the 0.00 s running listing, then the finish impulse with no Time (recorded 07:16:59Z): finished, not-yet; the leave changes nothing', () => {
    const id = 'WX1_XT_26:25';
    const ids = [id, 'WX1_XT_26:26'];
    const other = (ms: number): Unit => tcpUnit(msg(plus(R19.xt3.observedAt, ms), listingText({ race: 'WX1_XT_26', bib: 26, total: 2, pos: 1, dtStart: '9:16:30.000', time: '27.00' })), DAYS, { courses: {} });
    const c = coreWith([connected(R19.xt1.observedAt)]);
    step(c, tcpUnit(R19.xt1, DAYS), ids);
    expect(f(c, id, 'status').value, 'precondition: on-course').toBe('on-course');
    expect(f(c, id, 'outcome'), 'precondition: running').toMatchObject({ state: 'known', value: { kind: 'running' } });
    expect(R19.xt3.data, 'precondition: the recorded finish listing has a dtFinish and an empty Time').toMatch(/dtFinish="9:16:57\.734"[\s\S]*Type="T"[^>]*Time=""/);
    step(c, tcpUnit(R19.xt3, DAYS), ids);
    expect(pair(c, id)).toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
    step(c, other(2000), ids);
    step(c, other(4000), ids);
    expect(pair(c, id), 'the leave changes nothing').toEqual({ status: 'finished', outcome: { state: 'not-yet' } });
  });
});

describe('N3: a listing that shows at-start states no `running`, whatever its Time (DERIVATIONS §4.3 bullet 1; §4.1; §7.1; DA item 16 (iv), (v))', () => {
  it('vector-rule #318 row 5 / DA (iv), slalom: dtStart empty + Time 17.00: at-start, outcome not-yet; after the leave not-started, not-yet', () => {
    const xid = `${SLALOM}:${X}`;
    const ids = [xid, `${SLALOM}:${Y}`];
    const c = coreWith([connected(T0)]);
    const at = listing(SLALOM, X, 0, { dtStart: '', time: '17.00' });
    expect(listingText({ race: SLALOM, bib: X, dtStart: '', time: '17.00' }), 'precondition: dtStart is empty').toMatch(/dtStart=""/);
    step(c, listing(SLALOM, Y, 0, { dtStart: '11:59:10.000', time: '45.00' }), ids);
    step(c, at, ids);
    expect(pair(c, xid), 'at-start states no running').toEqual({ status: 'at-start', outcome: { state: 'not-yet' } });
    leaveAfter(c, SLALOM, 0, ids);
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid)).toEqual({ status: 'not-started', outcome: { state: 'not-yet' } });
  });

  it('vector-rule #318 row 6 / DA (v), Cross time trial: dtStart empty + Time 17.00 in K1W_XT_19: at-start, not-yet; after the leave still at-start (§7.1)', () => {
    const xid = `${TT}:${X}`;
    const ids = [xid, `${TT}:${Y}`];
    const c = coreWith([connected(T0)]);
    expect(xid, 'precondition: a time-trial Phase (XT), not a heat').toContain('_XT_');
    step(c, listing(TT, Y, 0, { dtStart: '11:59:10.000', time: '45.00' }), ids);
    step(c, listing(TT, X, 0, { dtStart: '', time: '17.00' }), ids);
    expect(pair(c, xid)).toEqual({ status: 'at-start', outcome: { state: 'not-yet' } });
    leaveAfter(c, TT, 0, ids);
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid), 'a Cross leave changes nothing').toEqual({ status: 'at-start', outcome: { state: 'not-yet' } });
  });
});

describe('item 35: a Cross heat listing is on-course and keeps its `running` through a leave (DERIVATIONS §4.2, §10 item 35; DA item 16 (vi))', () => {
  it('vector-rule #318 row 7 / DA (vi), K1W_XS_19: no dtStart and a Time of 17.00: on-course with running 17; after the leave the same', () => {
    const xid = `${HEAT}:${X}`;
    const ids = [xid, `${HEAT}:${Y}`];
    const c = coreWith([connected(T0)]);
    expect(xid, 'precondition: a heat Phase (XS), not a time trial').toContain('_XS_');
    expect(listingText({ race: HEAT, bib: X, dtStart: '', time: '17.00' }), 'precondition: no dtStart').toMatch(/dtStart=""/);
    step(c, listing(HEAT, Y, 0, { dtStart: '', time: '30.00' }), ids);
    step(c, listing(HEAT, X, 0, { dtStart: '', time: '17.00' }), ids);
    const before = pair(c, xid);
    expect(before.status).toBe('on-course');
    expect(before.outcome).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: 17 } });
    leaveAfter(c, HEAT, 0, ids, { dtStart: '', time: '30.00' });
    expect(inSet(c, xid), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, xid), 'a Cross leave changes nothing (§10 item 35)').toEqual(before);
  });

  it('vector-rule #318 row 7 / DA (vi), real cp3-cross WX1J_XS_26_JUN:1 listing edited to carry a Time: on-course with running; after the leave the same (derived: Time edited)', () => {
    const id = 'WX1J_XS_26_JUN:1';
    const ids = [id, 'WX1J_XS_26_JUN:2'];
    const edited = derive(R19.stNext1, { edit: (d) => d.replace('Time=""', 'Time="17.00"') });
    const other = (ms: number): Unit => tcpUnit(msg(plus(edited.observedAt, ms), listingText({ race: 'WX1J_XS_26_JUN', bib: 2, total: 2, pos: 2, dtStart: '', time: '30.00' })), DAYS, { courses: {} });
    const c = coreWith([connected(edited.observedAt)]);
    expect(edited.data, 'precondition: dtStart empty, a Time').toMatch(/dtStart=""[\s\S]*Time="17\.00"/);
    step(c, tcpUnit(edited, DAYS), ids);
    const before = pair(c, id);
    expect(before.status).toBe('on-course');
    expect(before.outcome).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: 17 } });
    step(c, other(2000), ids);
    step(c, other(4000), ids);
    expect(inSet(c, id), 'precondition: the leave rule fired').toBe(false);
    expect(pair(c, id)).toEqual(before);
  });
});
