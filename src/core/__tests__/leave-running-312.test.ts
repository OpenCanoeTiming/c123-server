/**
 * #312: a leave withdraws the stream's `running` outcome whatever the results table presents (TEST-ARCHITECTURE §3.2 P4, round 26: "a running clock
 * for an athlete who is not on the course"; DERIVATIONS §4.1 leave rule, #204; CONTRACTS §3.2 for `status`, which keeps a presented table finish or mark, #208).
 * Hand stream on the recorded jarni-ne-odp K1W_BR2_19:16 instants (M1 opponent finding 1): stream running 17 s at 12:59:35.752Z, a TCP row DNS at
 * 12:59:39.521Z, the leave at 12:59:40.427Z (the 4 s constant), a TCP row clearing the mark at 13:00:26.476Z. Expected values come from the rules, never the core. No real clock.
 */
import { describe, expect, it } from 'vitest';
import { connected, coreWith, tcpUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

type Core = ReturnType<typeof coreWith>;
const RACE = 'K1W_BR2_19';
const DAY = { [RACE]: '2026-09-20' };
const T0 = '2026-09-20T12:59:35.752Z';
const ROW_MS = Date.parse('2026-09-20T12:59:39.521Z') - Date.parse(T0);
const LEAVE_MS = Date.parse('2026-09-20T12:59:40.427Z') - Date.parse(T0);
const CLEAR_MS = Date.parse('2026-09-20T13:00:26.476Z') - Date.parse(T0);
const X = `${RACE}:16`;
const Y = `${RACE}:44`;

/** X running 17 s (Time on the stream, no finish), beside Y. */
const x = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 16, total: 2, pos: 2, dtStart: '14:59:18.752', time: '17.00' })), DAY, { courses: {} });
const y = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 44, total: 2, pos: 1, dtStart: '14:58:50.000', time: '45.00' })), DAY, { courses: {} });
const row = (ms: number, result: string): Unit =>
  tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1W" Current="Y" MainTitle="K1W" SubTitle="1st and 2nd Run"><Row Number="1"><Participant Bib="  16" Id="1616.K1W" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="16" StartTime="14:59:00" /><Result Type="T" HeatNr="0" Q="" ${result} Behind="" PP="" /></Row></Results></Canoe123>`), DAY, { courses: {} });
const DNS = 'IRM="DNS" Pen="" Gates="" Time="" Total="" Rank="" RankOrder=""';
const CLEARED = 'IRM="" Pen="" Gates="" Time="" Total="" Rank="" RankOrder=""';
const FINISHED = 'IRM="" Pen="0" Gates="" Time="80.00" Total="80.00" Rank="1" RankOrder="1"';

const f = (c: Core, id: string, name: string): { state?: string; value?: any } => c.presented(id)[name] as { state?: string; value?: any };
const inSet = (c: Core): boolean => c.oncourse().attemptIds.map(String).includes(X);
/** X running beside Y, the table row, Y alone until X has left. */
const upToLeave = (result: string): Core => {
  const c = coreWith([connected(T0), y(0), x(0)]);
  c.applyUnit(row(ROW_MS, result));
  c.applyUnit(y(2000));
  c.applyUnit(y(LEAVE_MS));
  return c;
};

describe('a leave withdraws the stream\'s running outcome whatever is presented (#312; TEST-ARCHITECTURE P4 round 26; M1 opponent finding 1)', () => {
  it('precondition (recorded jarni-ne-odp K1W_BR2_19:16): the stream presents running 17 s before the table row', () => {
    const c = coreWith([connected(T0), y(0), x(0)]);
    expect(f(c, X, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running', elapsedSeconds: 17 } });
  });

  it('rule P4 / #312 row 1: stream running, TCP row DNS, the leave fires -> outcome is not running (not-yet), status keeps the mark', () => {
    const c = upToLeave(DNS);
    expect(inSet(c), 'the leave rule fired').toBe(false);
    expect(f(c, X, 'status').value).toBe('dns');
    expect(f(c, X, 'outcome').value?.kind).not.toBe('running');
  });

  it('rule P4 / #312 row 1: after the TCP row clears the mark 46 s later, outcome is still not running whatever status returns to', () => {
    const c = upToLeave(DNS);
    c.applyUnit(y(CLEAR_MS - 1000));
    c.applyUnit(row(CLEAR_MS, CLEARED));
    const status = f(c, X, 'status').value;
    expect(f(c, X, 'outcome').value?.kind).not.toBe('running');
    expect(f(c, X, 'outcome')).toEqual({ state: 'not-yet' });
    expect(['not-started', 'dns'], `status ${String(status)}`).toContain(status);
  });

  it('rule P4 / #312 row 1: no running outcome is presented at any step while status is not-started or a mark', () => {
    const c = coreWith([connected(T0), y(0), x(0)]);
    const steps: Unit[] = [row(ROW_MS, DNS), y(2000), y(LEAVE_MS), y(CLEAR_MS - 1000), row(CLEAR_MS, CLEARED)];
    for (const u of steps) {
      c.applyUnit(u);
      const s = f(c, X, 'status').value;
      if (s === 'not-started' || s === 'dns' || s === 'dnf' || s === 'dsq') expect(f(c, X, 'outcome').value?.kind, `status ${String(s)}`).not.toBe('running');
    }
  });

  it('obligation CONTRACTS §3.2 / #208 guard / #312 row 2: a table finish presented before the leave -> status stays finished, the stream\'s running is gone, outcome is the table\'s', () => {
    const c = upToLeave(FINISHED);
    expect(inSet(c), 'the leave rule fired').toBe(false);
    expect(f(c, X, 'status').value).toBe('finished');
    expect(f(c, X, 'outcome').value?.kind).not.toBe('running');
    expect(f(c, X, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 80 } });
  });
});
