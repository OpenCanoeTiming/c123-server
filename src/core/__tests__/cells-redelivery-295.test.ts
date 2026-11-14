/**
 * #295 (M2 P2): gate cells retained while no course is bound (DERIVATIONS §0.5, §4.6). An identical re-delivery moves no `observedAt` (CONTRACTS §1.2
 * "Condition 1 in full") but takes its own ingest sequence and connection epoch (INV-5, second sentence), so after a TCP reconnect TCP's re-delivered cells
 * keep precedence over an XML vector stated in between (INV-2 rule 2: the later epoch's source, on `tcp`). Real jarni-ne-do K1M_BR2_19:51 listing; the
 * re-delivery is a derived copy of it, the XML vector a hand snapshot (cells as the parser retains them, one cell different).
 * Row 4 of the plan (content age on an identical XML re-delivery) is not expressed here; see the record.
 */
import { describe, expect, it } from 'vitest';
import { JA51, JA51_XML } from './fixtures/round24-excerpts.js';
import { msg, plus } from './text.js';
import { connected, coreWith, derive, disconnected, tcpUnit, xmlUnit, type Unit } from './streams.js';

const PHASE = 'K1M_BR2_19';
const JA = `${PHASE}:51`;
const DAY = { [PHASE]: '2026-04-19' };
const T = (r: { observedAt: string }, ms: number): string => new Date(Date.parse(r.observedAt) + ms).toISOString();
const TWELVE = '0,0,0,0,0,0,0,0,0,0,0,0,,,,,,';
const base = JA51.find((r) => r.data.includes(`Gates="${TWELVE}"`) && r.data.includes('<OnCourse'))!; // only its instant is used: the stream's first instant
type Gates = { state: string; source?: string; observedAt: string; value?: Array<{ number: number; penalty: number | null }> };
const gatesOf = (c: ReturnType<typeof coreWith>): Gates => c.presented(JA)['gates'] as Gates;
/**
 * A TCP Results-table row of the Attempt (the `tcp` channel, not the on-course stream's inference): Time 83.57, twelve judged cells, all 0, no course bound.
 * No on-course listing of this Attempt is in any stream here, so no inference slot competes.
 */
const tcp = (ms: number): Unit => {
  const gates = Array(12).fill('  0').join('');
  const text = `<Canoe123 System="Main"><Results RaceId="${PHASE}" ClassId="K1M" Current="Y" MainTitle="K1M" SubTitle="2nd Run"><Row Number="43"><Participant Bib="  51" Id="9069.K1M" Name="KOLÁŘ Lukáš" Club="USK Praha" Nat="" GivenName="Lukáš" FamilyName="KOLÁŘ" StartOrder="51" StartTime="11:10:40" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="0" Gates="${gates}" Time="83.57" Total="83.57" Rank="43" RankOrder="43" Behind="" PP="" /></Row></Results></Canoe123>`;
  return tcpUnit(msg(plus(base.observedAt, ms), text), DAY, { courses: {} });
};
/**
 * The recorded XML snapshot with a result (Time, Pen, Total) and a `Gates` text stating cell 3 as 2 where the TCP listing states 0: an XML vector for the
 * same Attempt. `bound` false leaves the course out (no CourseData, an empty Schedule CourseNr, no ctx course): the vector is retained while no course is bound.
 */
const xmlCells = (ms: number, bound: boolean): Unit => {
  const gates = ['  0', '  0', '  2', ...Array(9).fill('  0')].join('');
  const edit = (d: string): string => {
    const rowed = d.replace('<Bib>  51</Bib>', `<Bib>  51</Bib>\r\n    <Gates>${gates}</Gates>\r\n    <Time>83570</Time>\r\n    <Pen>2</Pen>\r\n    <Total>85570</Total>`);
    return bound ? rowed : rowed.replace(/<CourseData>[\s\S]*?<\/CourseData>\r?\n?/, '').replace('<CourseNr>2</CourseNr>', '<CourseNr />');
  };
  return xmlUnit(derive(JA51_XML, { observedAt: T(base, ms), edit }), DAY, T(base, ms - 5000), bound ? {} : { courses: {} });
};
/** The snapshot that binds the course: the same XML row (equal cells), now with the course (default ctx courses, the recorded CourseData). */
const binding = (ms: number): Unit => xmlCells(ms, true);
/** The recorded snapshot as it is (its row states no result and no cells): it binds the course and nothing else, as in cells-retained.test.ts. */
const bindingPlain = (ms: number): Unit => xmlUnit(derive(JA51_XML, { observedAt: T(base, ms) }), DAY, JA51_XML.observedAt);

function reconnectStream() {
  const core = coreWith([connected(T(base, -1000))]); // epoch 1
  core.applyUnit(tcp(0)); // C delivered
  core.applyUnit(disconnected(T(base, 500)));
  core.applyUnit(xmlCells(1000)); // XML states a different vector
  core.applyUnit(connected(T(base, 8000))); // epoch 2
  core.applyUnit(tcp(8500)); // C re-delivered unchanged
  core.applyUnit(binding(10000));
  return core;
}

describe('retained cells re-delivered after a reconnect (#295, CONTRACTS INV-5 and INV-2 rule 2)', () => {
  it('the recorded listing is what the test says: twelve clean cells', () => {
    expect(base).toBeDefined();
    expect(base.observedAt).toBe('2026-04-19T08:50:09.491Z');
  });

  it('INV-5 + rule 2: identical TCP cells re-delivered after a reconnect, then a course binding: the vector presented is TCP\'s', () => {
    const g = gatesOf(reconnectStream());
    expect(g.state).toBe('known');
    expect(g.source).toBe('tcp');
    expect(g.value!.slice(0, 12).map((x) => x.penalty)).toEqual(Array(12).fill(0)); // not the XML vector's 2 at cell 3
  });

  it('contract §1.2 + INV-5: the identical re-delivery moves no observedAt: after the binding the gates envelope carries the first delivery\'s instant', () => {
    expect(gatesOf(reconnectStream()).observedAt).toBe(base.observedAt);
  });

  it('INV-5: identical cells re-delivered on one connection: no notification, envelope unchanged at the binding', () => {
    const core = coreWith([connected(T(base, -1000))]);
    core.applyUnit(tcp(0));
    const before = core.notifications().length;
    core.applyUnit(tcp(1000)); // identical, same connection
    const during = core.notifications().slice(before).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === JA);
    expect(during).toEqual([]);
    const mark = core.notifications().length;
    core.applyUnit(bindingPlain(2000));
    const bound = core.notifications().slice(mark).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === JA);
    expect(bound).toHaveLength(1);
    expect(gatesOf(core).state).toBe('known');
    expect(gatesOf(core).observedAt).toBe(base.observedAt);
  });
});
