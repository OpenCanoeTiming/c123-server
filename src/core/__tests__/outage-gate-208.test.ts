/**
 * #208 core fixes, pinned at unit level (design-round29.md ruling; CONTRACTS §1.2 round 29 and §3.2; DERIVATIONS §4.6 "No course bound yet", §4.8/#204 leave rule).
 * Hand streams on the recorded jarni-ne-do K1M_BR2_19:51 shapes (listings: text.ts; the course-binding snapshot: round24-excerpts JA51_XML, its course widened to
 * 23 gates as fixture A's K1M_BR2_19:81 has them). Expected values come from the contract sentences, never from running the core. No real clock.
 */
import { describe, expect, it } from 'vitest';
import { JA51_XML } from './fixtures/round24-excerpts.js';
import { connected, coreWith, disconnected, derive, tcpUnit, xmlUnit, type Unit } from './streams.js';
import { listingText, msg, plus } from './text.js';

type Core = ReturnType<typeof coreWith>;
type Env = { state?: string; value?: unknown; source?: string; confidence?: string; provisional?: boolean; observedAt?: string };
const env = (c: Core, id: string, f: string): Env => c.presented(id)[f] as Env;

const RACE = 'K1M_BR2_19';
const ID = `${RACE}:51`;
const DAY = { [RACE]: '2026-04-19' };
const T0 = '2026-04-19T08:50:00.000Z';
// the judged cells of fixture A's K1M_BR2_19:81: penalties 2 at gate 6, 2 at gate 19, 50 at gate 22, gate 23 clean
const PEN = [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 50, 0];
const cells = (n: number): string => PEN.map((v, i) => (i < n ? String(v) : '')).join(',');
const rowCells = (n: number): string => PEN.map((v, i) => (i < n ? String(v).padStart(3) : '   ')).join('');

describe('late-bound gates keep the merged cells\' instant (CONTRACTS §1.2 round 29; DERIVATIONS §4.6 "No course bound yet"; TEST-ARCHITECTURE §3.2 P1 binding clause)', () => {
  const row = (ms: number, n: number): Unit => tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st and 2nd Run"><Row Number="1"><Participant Bib="  51" Id="9069.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="51" StartTime="11:10:40" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="54" Gates="${rowCells(n)}" Time="159.87" Total="159.87" Rank="1" RankOrder="1" Behind="" PP="" /></Row></Results></Canoe123>`), DAY, { courses: {} });
  const listing = (ms: number, n: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 1, pos: 1, dtStart: '11:28:19.180', dtFinish: '11:30:05.050', time: '105.87', completed: true, gates: cells(n) })), DAY, { courses: {} });
  const bind = (ms: number): Unit => xmlUnit(derive(JA51_XML, { observedAt: plus(T0, ms), edit: (d) => d.replace(/(<CourseNr>2<\/CourseNr>\s*<CourseConfig>)[A-Z]*(<\/CourseConfig>)/, `$1${'N'.repeat(23)}S$2`) }), DAY, JA51_XML.observedAt);

  // fixture A K1M_BR2_19:81: steps 41 (row, cells 1-22), 48 (listing adds 23), 111 (row, cells 1-23 = the merged cells), 119 (snapshot binds)
  const stream = (bindAtMs: number | 'after-third'): Core => {
    const c = coreWith([connected(T0), row(0, 22), listing(430, 23)]);
    if (bindAtMs === 'after-third') { c.applyUnit(row(7092, 23)); c.applyUnit(bind(7831)); } else { c.applyUnit(bind(bindAtMs)); c.applyUnit(row(7092, 23)); }
    return c;
  };

  it('vector round-29-late-bound-gates: the snapshot binds after the third row -> the presented gates vector\'s observedAt is the listing\'s, not the third row\'s', () => {
    const g = env(stream('after-third'), ID, 'gates');
    expect(g).toMatchObject({ state: 'known', source: 'tcp' });
    expect(g.observedAt).toBe(plus(T0, 430));
  });

  it('vector round-29-late-bound-gates (binding independence, P1 binding clause): binding before the third row gives the same observedAt', () => {
    const g = env(stream(1000), ID, 'gates');
    expect(g).toMatchObject({ state: 'known', source: 'tcp' });
    expect(g.observedAt).toBe(plus(T0, 430));
  });

  it('vector round-29-late-bound-gates: the two bindings present the same envelope', () => {
    expect(env(stream('after-third'), ID, 'gates')).toEqual(env(stream(1000), ID, 'gates'));
  });
});

describe('round 29 / INV-2 rule 1: a late-bound row that changes a cell (CONTRACTS §1.2 round 29; §4 INV-2 rule 1 gates exception; TEST-ARCHITECTURE §3.2 P1 binding clause)', () => {
  const CHANGED = PEN.map((v, i) => (i === 5 ? 50 : v)); // the results table corrects gate 6 from 2 to 50 while the listing still judges 2
  const rowOf = (ms: number, vals: number[], n: number): Unit => tcpUnit(msg(plus(T0, ms), `<Canoe123 System="Main"><Results RaceId="${RACE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="1st and 2nd Run"><Row Number="1"><Participant Bib="  51" Id="9069.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" GivenName="Hand" FamilyName="TESTER" StartOrder="51" StartTime="11:10:40" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="102" Gates="${vals.map((v, i) => (i < n ? String(v).padStart(3) : '   ')).join('')}" Time="159.87" Total="159.87" Rank="1" RankOrder="1" Behind="" PP="" /></Row></Results></Canoe123>`), DAY, { courses: {} });
  const listing = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 1, pos: 1, dtStart: '11:28:19.180', dtFinish: '11:30:05.050', time: '105.87', completed: true, gates: cells(23) })), DAY, { courses: {} });
  const bind = (ms: number): Unit => xmlUnit(derive(JA51_XML, { observedAt: plus(T0, ms), edit: (d) => d.replace(/(<CourseNr>2<\/CourseNr>\s*<CourseConfig>)[A-Z]*(<\/CourseConfig>)/, `$1${'N'.repeat(23)}S$2`) }), DAY, JA51_XML.observedAt);
  const run = (late: boolean): Core => {
    const c = coreWith([connected(T0), rowOf(0, PEN, 22), listing(430)]);
    if (late) { c.applyUnit(rowOf(7092, CHANGED, 23)); c.applyUnit(bind(7831)); } else { c.applyUnit(bind(1000)); c.applyUnit(rowOf(7092, CHANGED, 23)); }
    return c;
  };

  it('round 29 / INV-2 rule 1: a late-bound row that changes a cell presents the new value at its own instant, as an early binding does', () => {
    const early = env(run(false), ID, 'gates');
    const late = env(run(true), ID, 'gates');
    expect(early.observedAt, 'early binding: the changing row\'s own instant').toBe(plus(T0, 7092));
    expect(late.observedAt, 'late binding: the changing row\'s own instant').toBe(plus(T0, 7092));
    expect(late.value).toEqual(early.value);
    expect(JSON.stringify(late.value), 'the new judged value 50 at gate 6 is presented').toContain('50');
    expect(late).toEqual(early);
  });
});

describe('a leave keeps a presented table row\'s status (CONTRACTS §3.2: no finished -> left-without-finish; DERIVATIONS §4.1 leave rule, #204)', () => {
  const x = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 51, total: 2, pos: 2, dtStart: '11:10:40.000' })), DAY);
  const y = (ms: number): Unit => tcpUnit(msg(plus(T0, ms), listingText({ race: RACE, bib: 44, total: 2, pos: 1, dtStart: '11:10:20.000' })), DAY);
  const snapshot = (ms: number, add: string): Unit => xmlUnit(derive(JA51_XML, { observedAt: plus(T0, ms), edit: (d) => d.replace('<Status />\r\n    <TotalTotal>', `${add}\r\n    <TotalTotal>`) }), DAY, plus(T0, 500));
  const inSet = (c: Core): boolean => c.oncourse().attemptIds.map(String).includes(ID);
  const status = (c: Core): unknown => (env(c, ID, 'status') as { value?: unknown }).value;
  /** X listed (beside Y), an outage in which the XML row is presented, the reconnect, then only Y for 4 s: X has left by the leave rule (fixture A K1M_BR2_19:71, #208). */
  const run = (add: string): { c: Core; before: unknown } => {
    const c = coreWith([connected(T0), y(0), x(0), disconnected(plus(T0, 500)), snapshot(2000, add)]); // the outage: the XML row is presented over the stream's view
    const before = status(c);
    c.applyUnit(connected(plus(T0, 3000)));
    for (const t of [3100, 4100, 5100, 6100, 7100, 8100]) c.applyUnit(y(t)); // the first ends the silence; X is not named for 4 s after it
    expect(inSet(c), 'the leave rule fired: X is off the on-course set').toBe(false);
    return { c, before };
  };

  it('obligation CONTRACTS §3.2 / #204: an XML finished presented while the Attempt is listed on course, then the leave rule fires -> status stays finished', () => {
    const { c, before } = run('<Status /><Time>80000</Time><Pen>0</Pen><Total>80000</Total><Rnk>1</Rnk><RnkOrder>1</RnkOrder>');
    expect(before, 'precondition: finished was presented before the leave').toBe('finished');
    expect(status(c)).toBe('finished');
  });

  it('obligation CONTRACTS §3.2 / #204: an XML no-result mark (DNF) presented while listed, then the leave rule fires -> the mark stays', () => {
    const { c, before } = run('<Status>DNF</Status>');
    expect(before, 'precondition: the mark was presented before the leave').toBe('dnf');
    expect(status(c)).toBe('dnf');
  });
});
