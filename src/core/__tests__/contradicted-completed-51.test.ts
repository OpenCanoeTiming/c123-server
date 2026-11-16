/**
 * #305 row 9 / DERIVATIONS §10 item 51 (as amended by PR #381), §4.1 withdrawal bullet, §4.4 "Run closed", INV-2d: the closure (`Completed="Y"`) belongs to
 * the finish that carried it; a finish withdrawn OR CONTRADICTED takes it along; the next finish's `duration` is inferred and recomputed like a first one.
 * Channels: the on-course stream (TCP `OnCourse` listings, the `inference` slot) and a TCP results row presenting the finish. Slalom K1M_BR1_19, 23 gates.
 * Constructed listings (text.ts, the recorded shape); injected instants only.
 */
import { describe, expect, it } from 'vitest';
import { connected, coreWith, tcpUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

const T0 = '2026-09-19T10:00:00.000Z';
const RACE = 'K1M_BR1_19';
const X = 51;
const ID = `${RACE}:${X}`;
const DAYS = { [RACE]: '2026-09-19' };
const START = '11:59:40.000';
const FINISH = '12:00:01.000';
const cells = (judged: number, penalties: number): string => Array.from({ length: 23 }, (_, i) => (i >= judged ? '' : i < penalties ? '2' : '0')).join(',');
const sl = (ms: number, over: Record<string, unknown>): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: X, total: 1, pos: 1, ...over })), DAYS);
const row = (ms: number, result: string): Unit =>
  tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st Run"><Row Number="1"><Participant Bib="  ${X}" Id="5151.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="${X}" StartTime="11:59:00" /><Result Type="T" HeatNr="0" Q="" ${result} Behind="" PP="" /></Row></Results></Canoe123>`), DAYS, {});
const out = (c: ReturnType<typeof coreWith>): any => c.presented(ID)['outcome'];

describe('item 51 (DERIVATIONS §10 item 51; INV-2d): a contradicted finish takes its Completed closure along', () => {
  it('item 51: a contradicted finish takes its Completed closure along', () => {
    const c = coreWith([connected(T0)]);
    const base = { dtStart: START, dtFinish: FINISH };
    c.applyUnit(sl(0, { dtStart: START, time: '17.00', gates: cells(3, 0) }));
    // on-course stream: a finish listing carrying the closure
    c.applyUnit(sl(1000, { ...base, time: '80.00', completed: true, gates: cells(10, 1) }));
    expect(out(c), 'precondition (on-course stream): the closed finish\'s duration').toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 80, penaltySeconds: 2, totalSeconds: 82 } });
    // precondition: the closure binds: a later finish listing with more judged cells is NOT recomputed (DERIVATIONS §4.4 "Run closed")
    c.applyUnit(sl(1200, { ...base, time: '80.00', completed: true, gates: cells(11, 2) }));
    expect(out(c), 'precondition (on-course stream): the closed run is not recomputed').toMatchObject({ value: { kind: 'duration', totalSeconds: 82 } });
    // TCP results row presenting the finish
    const gatesAttr = ['  2', ...Array(9).fill('  0'), ...Array(13).fill('   ')].join('');
    c.applyUnit(row(1500, `IRM="" Pen="2" Gates="${gatesAttr}" Time="80.00" Total="82.00" Rank="1" RankOrder="1"`));
    expect(c.presented(ID)['status'], 'precondition (TCP results row): the finish is presented').toMatchObject({ value: 'finished' });
    // on-course stream: the Attempt runs again with the same start (INV-2d)
    c.applyUnit(sl(2000, { dtStart: START, time: '30.00', gates: cells(10, 1) }));
    expect((c.diagnostics() as Array<{ kind: string }>).map((d) => d.kind), 'precondition: the contradiction is stated').toContain('contradicted-finish');
    // a new finish, no closure: its duration is inferred; a later judged cell recomputes it (the old Y no longer binds)
    c.applyUnit(sl(3000, { ...base, time: '85.00', gates: cells(12, 0) }));
    expect(out(c), 'the new finish\'s own duration').toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 85, penaltySeconds: 0, totalSeconds: 85 } });
    c.applyUnit(sl(4000, { ...base, time: '85.00', gates: cells(13, 1) }));
    expect(out(c), 'recomputed like a first finish, including the later judged cell').toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 85, penaltySeconds: 2, totalSeconds: 87 } });
    // its own Y closes the run: a later listing with one more penalty is no longer recomputed
    c.applyUnit(sl(5000, { ...base, time: '85.00', completed: true, gates: cells(14, 1) }));
    expect(out(c), 'the new finish\'s own Y is read like a first closure').toMatchObject({ value: { kind: 'duration', runSeconds: 85, totalSeconds: 87 } });
    c.applyUnit(sl(6000, { ...base, time: '85.00', completed: true, gates: cells(15, 2) }));
    expect(out(c), 'closed again: not recomputed').toMatchObject({ value: { kind: 'duration', runSeconds: 85, totalSeconds: 87 } });
  });
});
