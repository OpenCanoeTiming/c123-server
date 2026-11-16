/**
 * #295 (M2 P2): gate cells retained while no course is bound (DERIVATIONS §0.5, §4.6). An identical re-delivery moves no `observedAt` (CONTRACTS §1.2
 * "Condition 1 in full") but takes its own ingest sequence and connection epoch (INV-5, second sentence), so after a TCP reconnect TCP's re-delivered cells
 * keep precedence over an XML vector stated in between (INV-2 rule 2: the later epoch's source, on `tcp`). Real jarni-ne-do K1M_BR2_19:51 listing; the
 * re-delivery is a derived copy of it, the XML vector a hand snapshot (cells as the parser retains them, one cell different).
 * Row 4 of the plan (content age on an identical XML re-delivery) is the `ageStream` pair below. #356: cells retained while unbound end, after the binding,
 * with the envelope a course bound throughout gives (DERIVATIONS §10 item 39; CONTRACTS §1.2 Condition 1; TEST-ARCHITECTURE §3.2 property 1).
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
const xmlCells = (ms: number, bound: boolean, changedAfter: string | null | undefined = T(base, ms - 5000), cell3 = '  2'): Unit => {
  const gates = ['  0', '  0', cell3, ...Array(9).fill('  0')].join('');
  const edit = (d: string): string => {
    const rowed = d.replace('<Bib>  51</Bib>', `<Bib>  51</Bib>\r\n    <Gates>${gates}</Gates>\r\n    <Time>83570</Time>\r\n    <Pen>2</Pen>\r\n    <Total>85570</Total>`);
    return bound ? rowed : rowed.replace(/<CourseData>[\s\S]*?<\/CourseData>\r?\n?/, '').replace('<CourseNr>2</CourseNr>', '<CourseNr />');
  };
  return xmlUnit(derive(JA51_XML, { observedAt: T(base, ms), edit }), DAY, changedAfter, bound ? {} : { courses: {} });
};
/** The snapshot that binds the course: the same XML row (equal cells), now with the course (default ctx courses, the recorded CourseData). */
const binding = (ms: number): Unit => xmlCells(ms, true);
/** The recorded snapshot as it is (its row states no result and no cells): it binds the course and nothing else, as in cells-retained.test.ts. */
const bindingPlain = (ms: number): Unit => xmlUnit(derive(JA51_XML, { observedAt: T(base, ms) }), DAY, JA51_XML.observedAt);

function reconnectStream() {
  const core = coreWith([connected(T(base, -1000))]); // epoch 1
  core.applyUnit(tcp(0)); // C delivered
  core.applyUnit(disconnected(T(base, 500)));
  core.applyUnit(xmlCells(7000, false)); // XML states a different vector (content age 2000: later than the TCP cells at 0)
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

  // #356 (item 39): the outage XML D decides by order, connection and content age, never by comparing cells. `kind` builds D.
  type Kind = 'later-differs' | 'later-equal' | 'refused';
  const outageXml = (kind: Kind, bound: boolean): Unit =>
    kind === 'refused' ? xmlCells(7000, bound, T(base, -4000)) : kind === 'later-equal' ? xmlCells(7000, bound, T(base, 2000), '  0') : xmlCells(7000, bound, T(base, 2000));
  /** TCP C at 0, outage, D, reconnect, C re-sent at 8500, then the binding snapshot (age 5000, before the re-delivery's 8500). `bound`: the course is bound from the start. */
  const outageStream = (kind: Kind, bound: boolean, listed = false) => {
    const core = coreWith([connected(T(base, -1000))]);
    if (bound) core.applyUnit(bindingPlain(-500));
    if (listed) core.applyUnit(tcpUnit(derive(base, { observedAt: T(base, -200) }), DAY, bound ? {} : { courses: {} })); // the Attempt is also on the on-course stream
    core.applyUnit(tcp(0));
    core.applyUnit(disconnected(T(base, 500)));
    core.applyUnit(outageXml(kind, bound));
    core.applyUnit(connected(T(base, 8000)));
    core.applyUnit(tcp(8500));
    core.applyUnit(binding(10000));
    return core;
  };
  /** Precondition: on a bound course, with TCP never re-sending, what D does to C. */
  const boundDisplacement = (kind: Kind) => {
    const core = coreWith([connected(T(base, -1000)), bindingPlain(-500)]);
    core.applyUnit(tcp(0));
    core.applyUnit(disconnected(T(base, 500)));
    core.applyUnit(outageXml(kind, true));
    return gatesOf(core);
  };
  const CELLS_C = Array(12).fill(0);
  const penalties = (g: Gates): unknown => g.value!.slice(0, 12).map((x) => x.penalty);

  it('item 39 cells-retained-outage-later-differs (item 39, §1.2 Condition 1): D differs from C and would displace; after the binding the envelope carries the re-delivery\'s instant', () => {
    const pre = boundDisplacement('later-differs');
    expect(pre.source).toBe('xml'); // precondition: D displaces TCP on a bound course
    expect((pre.value![2] as { penalty: number }).penalty).toBe(2); // and differs from C cell-wise
    const g = gatesOf(outageStream('later-differs', false));
    expect(g.source).toBe('tcp');
    expect(penalties(g)).toEqual(CELLS_C);
    expect(g.observedAt).toBe(T(base, 8500));
    expect(g.observedAt).not.toBe(base.observedAt);
  });

  it('item 39 cells-retained-outage-later-equal (item 39, INV-5 no-op covers only the same source): D equal to C takes over too; TCP\'s re-send regains precedence at its own instant', () => {
    const pre = boundDisplacement('later-equal');
    expect(pre.source).toBe('xml'); // precondition: equal cells from the other source still displace (never compared by cells)
    expect(penalties(pre)).toEqual(CELLS_C); // precondition: D equals C cell-wise
    const g = gatesOf(outageStream('later-equal', false));
    expect(g.source).toBe('tcp');
    expect(penalties(g)).toEqual(CELLS_C);
    expect(g.observedAt).toBe(T(base, 8500));
  });

  it('item 39 cells-retained-outage-refused (item 39, INV-2c): D\'s content age is earlier than C\'s, nothing displaced TCP; the instant stays the first delivery\'s', () => {
    const pre = boundDisplacement('refused');
    expect(pre.source).toBe('tcp'); // precondition: INV-2c refuses D on a bound course
    expect(penalties(pre)).toEqual(CELLS_C);
    const g = gatesOf(outageStream('refused', false));
    expect(g.source).toBe('tcp');
    expect(g.observedAt).toBe(base.observedAt);
  });

  for (const kind of ['later-differs', 'later-equal', 'refused'] as const) {
    it(`property 1 (TEST-ARCHITECTURE §3.2, §4.6 "as an earlier binding would have presented them", ${kind}): the course bound throughout gives the whole gates envelope the unbound stream ends with`, () => {
      const throughout = outageStream(kind, true);
      expect(gatesOf(throughout).source).toBe('tcp'); // precondition: the control is the same stream, the course bound from its start, and TCP presents
      expect(gatesOf(outageStream(kind, false))).toEqual(gatesOf(throughout)); // source, cells (value) and observedAt, whole
    });
  }

  for (const kind of ['later-differs', 'later-equal', 'refused'] as const) {
    it(`property 1 (TEST-ARCHITECTURE §3.2, §4.6, review N1, ${kind}): the Attempt also listed on the on-course stream in the same sequence: the final gates envelope equals the bound-throughout stream's`, () => {
      const throughout = outageStream(kind, true, true);
      expect(gatesOf(outageStream(kind, false, true))).toEqual(gatesOf(throughout));
    });
  }

  // #354 N3: only rule 2's connection continuity decides. D's content age (-4000) is earlier than C's, so INV-2c refuses it during the outage and the TCP re-delivery is
  // identical to what is held (the non-displaced branch: only the connection epoch moves). The binding snapshot restates D with a content age (9000) LATER than
  // TCP's re-delivery (8500), so INV-2c alone would let xml take over; TCP stays only because it has stayed connected since its re-delivery (INV-2 rule 2: the later epoch).
  it('obligation INV-2 rule 2 (#354 N3): an XML restatement with a later content age than the re-delivery does not displace TCP, which stayed connected since it', () => {
    const final = (reconnect: boolean) => {
      const core = coreWith([connected(T(base, -1000))]);
      core.applyUnit(tcp(0));
      core.applyUnit(disconnected(T(base, 500)));
      core.applyUnit(xmlCells(7000, false, T(base, -4000))); // D, age before C's: refused, TCP's C stays held through the outage
      if (reconnect) {
        core.applyUnit(connected(T(base, 8000)));
        core.applyUnit(tcp(8500)); // C re-delivered, identical, not displaced
      }
      core.applyUnit(xmlCells(10000, true, T(base, 9000))); // binds, restates D at age 9000 (later than 8500)
      return gatesOf(core);
    };
    const pre = final(false); // precondition: with no reconnect, the same step (age later than TCP's last delivery) is what takes xml over (INV-2c satisfied)
    expect(pre.source).toBe('xml');
    const g = final(true);
    expect(g.source).toBe('tcp');
    expect(penalties(g)).toEqual(CELLS_C);
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

  // plan row 4 (INV-5 last clause, INV-2c "the age only rises"): the scenario of review B1, built from the contract text
  const ageStream = (restate: boolean) => {
    const core = coreWith([connected(T(base, -1000))]);
    core.applyUnit(tcp(0)); // C, a results row of the tcp channel
    core.applyUnit(disconnected(T(base, 500)));
    core.applyUnit(xmlCells(2000, false, T(base, -4000))); // D, content age before C's: a candidate INV-2c refuses
    if (restate) core.applyUnit(xmlCells(6000, false, T(base, 1000))); // D restated identically from a later rewrite: the retained age rises
    core.applyUnit(xmlCells(10000, true, null)); // binds the course, restates D, age unknown (first read after setPath): INV-5 keeps the retained age
    return core;
  };

  it('INV-5 + INV-2c: an identical XML cell re-delivery from a later rewrite advances the retained content age', () => {
    const g = gatesOf(ageStream(true));
    expect(g.state).toBe('known');
    expect(g.source).toBe('xml');
    expect(g.value![2]!.penalty).toBe(2);
  });

  it('INV-5 + INV-2c: an identical XML cell re-delivery from a later rewrite advances the retained content age (control: without the rewrite TCP stays)', () => {
    const g = gatesOf(ageStream(false));
    expect(g.state).toBe('known');
    expect(g.source).toBe('tcp');
    expect(g.value![2]!.penalty).toBe(0);
  });
});
