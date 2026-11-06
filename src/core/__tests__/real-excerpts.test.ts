import { describe, it, expect } from 'vitest';
import { REC } from './fixtures/real-excerpts.js';
import { attrOf, connected, coreWith, disconnected, instantOf, tcpUnit, xmlUnit, type Unit } from './streams.js';

// Row 13 (#203), tier 2: real excerpts through parseTcp / parseXmlSnapshot and createMergeCore, no adapter in between.
// The excerpts are cut from the recordings (fixtures/real-excerpts.ts, provenance on top), stream order as recorded; units are frozen,
// so a core that mutates parser output throws. Expected values are read from the recorded rows (attrOf), never from an implementation.
// The recordings hold no connection records (TEST-ARCHITECTURE §9: the recorder does not yet write them): `tcp-connected` before the first
// recorded message, and the jarni-ne-do `tcp-disconnected`, are synthetic events at the stated times; every message and snapshot is recorded.

const SLALOM_DAY = { C1M_BR1_19: '2026-09-19' };
const J_DAY = { K1M_BR2_19: '2026-04-19' };
const X_DAY = { WX1_XER_26: '2026-04-26' };

describe('cp3-cross: a Kayak Cross final (vector inv1-*, CONTRACTS §4 INV-1; DERIVATIONS §4.7 placement)', () => {
  const stream = (): Unit[] => [connected(REC.c1StartList.observedAt), tcpUnit(REC.c1StartList, X_DAY), tcpUnit(REC.c2Final, X_DAY)];
  const recorded = [...REC.c2Final.data.matchAll(/<Participant Bib="\s*(\d+)"[^>]*\/><Result [^>]*\bRank="(\d*)" RankOrder="(\d*)"/g)].map((m) => ({ bib: m[1]!, rank: Number(m[2]), order: Number(m[3]) }));

  it('real cp3-cross WX1_XER_26 final: the recorded rows carry ranks 1..8 (the excerpt is what the test says it is)', () => {
    expect(recorded.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(attrOf(REC.c2Final.data, 'Results', 'SubTitle')).toBe('Final Result');
    expect(attrOf(REC.c1StartList.data, 'Results', 'SubTitle')).toBe('Final Result - Start List');
  });

  it('real cp3-cross WX1_XER_26 final: every row\'s placement is the recorded Rank and RankOrder, for an Attempt of that bib (INV-7 snapshot of the race)', () => {
    const core = coreWith(stream());
    for (const r of recorded) {
      expect(core.presented(`WX1_XER_26:${r.bib}`).placement, `bib ${r.bib}`).toMatchObject({ state: 'known', value: { rank: r.rank, order: r.order } });
    }
    expect(core.attempts().map(String)).toEqual(expect.arrayContaining(recorded.map((r) => `WX1_XER_26:${r.bib}`)));
  });

  it('real cp3-cross WX1_XER_26 final: the empty start-list message before it states nothing, and the final raises no stale-mark or contradiction', () => {
    const core = coreWith(stream());
    expect(core.attempts()).toHaveLength(recorded.length);
    expect(core.attempts().map(String).filter((a) => !a.startsWith('WX1_XER_26:'))).toEqual([]);
    expect((core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'stale-mark' || d.kind === 'contradiction')).toEqual([]);
  });
});

describe('nkz-19so: C1M_BR1_19 bib 7, the recorded re-run (DERIVATIONS §4.11 "The recorded episode"; vectors rerun-*, retraction-*)', () => {
  const A = 'C1M_BR1_19:7';
  const steps = (n: number): Unit[] =>
    [
      connected(REC.n1Start.observedAt),
      tcpUnit(REC.n1Start, SLALOM_DAY),
      tcpUnit(REC.n2Row, SLALOM_DAY),
      tcpUnit(REC.n3Finish, SLALOM_DAY),
      tcpUnit(REC.n4Wiped, SLALOM_DAY),
      tcpUnit(REC.n5Gone, SLALOM_DAY),
      tcpUnit(REC.n6Start, SLALOM_DAY),
      tcpUnit(REC.n7Row, SLALOM_DAY),
      tcpUnit(REC.n8Finish, SLALOM_DAY),
    ].slice(0, n);
  const row = (r: { data: string }) => ({
    runSeconds: Number(attrOf(r.data, 'Result', 'Time')),
    penaltySeconds: Number(attrOf(r.data, 'Result', 'Pen')),
    totalSeconds: Number(attrOf(r.data, 'Result', 'Total')),
    rank: Number(attrOf(r.data, 'Result', 'Rank')),
    order: Number(attrOf(r.data, 'Result', 'RankOrder')),
  });
  const finishOf = (r: { data: string }) => instantOf('2026-09-19', attrOf(r.data, 'Result', 'dtFinish'), '+02:00');
  const messagesFor = (core: ReturnType<typeof coreWith>) => core.notifications().filter((m) => m.attemptId === A);

  it('real nkz-19so run 1: the row arrives 55 ms before the finish; after the finish the outcome is the recorded 96.69 + 6 = 102.69, finished at dtFinish, placed 1', () => {
    expect(row(REC.n2Row)).toMatchObject({ runSeconds: 96.69, penaltySeconds: 6, totalSeconds: 102.69, rank: 1 });
    const p = coreWith(steps(4)).presented(A);
    const want = row(REC.n2Row);
    expect(p.status).toMatchObject({ state: 'known', value: 'finished' });
    expect(p.outcome).toMatchObject({
      state: 'known',
      value: { kind: 'duration', runSeconds: want.runSeconds, penaltySeconds: want.penaltySeconds, totalSeconds: want.totalSeconds },
      eventTime: finishOf(REC.n3Finish),
    });
    expect(p.placement).toMatchObject({ state: 'known', value: { rank: want.rank, order: want.order } });
  });

  it('real nkz-19so run 1 wiped in place (10:56:58, row present with no time, rank or penalty): outcome and placement are retracted to explicit not-yet (INV-7, DERIVATIONS §4.12)', () => {
    expect(attrOf(REC.n4Wiped.data, 'Result', 'Time')).toBe('');
    expect(attrOf(REC.n4Wiped.data, 'Result', 'Rank')).toBe('');
    const core = coreWith(steps(4));
    const before = core.notifications().length;
    core.applyUnit(steps(5)[4]!);
    const p = core.presented(A);
    expect(p.outcome).toEqual({ state: 'not-yet' });
    expect(p.placement).toEqual({ state: 'not-yet' });
    const sent = core.notifications().slice(before).filter((m) => m.attemptId === A);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'attempt.updated', fields: { outcome: { state: 'not-yet' }, placement: { state: 'not-yet' } } });
  });

  it('real nkz-19so row gone at 12:02:04 (a TCP table without the row): a retraction again, a no-op: still not-yet, nothing sent for the Attempt', () => {
    expect(REC.n5Gone.data).not.toMatch(/Bib="\s*7"/);
    const core = coreWith(steps(5));
    const before = messagesFor(core).length;
    core.applyUnit(tcpUnit(REC.n5Gone, SLALOM_DAY));
    expect(core.presented(A).outcome).toEqual({ state: 'not-yet' });
    expect(messagesFor(core)).toHaveLength(before);
    expect(core.attempts().map(String)).toContain(A);
  });

  it('real nkz-19so run 2 starts (dtStart differs): the generation changes, the Attempt is on-course again and the change is pushed (ADR-013, vector rerun-status-transition-legal-only-with-generation)', () => {
    expect(attrOf(REC.n6Start.data, 'Result', 'dtStart')).not.toBe(attrOf(REC.n1Start.data, 'Result', 'dtStart'));
    const core = coreWith(steps(6));
    expect(core.presented(A).status).toMatchObject({ state: 'known', value: 'on-course' });
    expect(core.presented(A).placement).toEqual({ state: 'not-yet' });
    expect(messagesFor(core).at(-1)).toMatchObject({ type: 'attempt.updated', fields: { status: { value: 'on-course' } } });
  });

  it('real nkz-19so run 2: the row 108 ms before the finish is retained, not presented as run 2\'s (vector rerun-tcp-row-before-new-finish-not-presented)', () => {
    const p = coreWith(steps(7)).presented(A);
    const want = row(REC.n7Row);
    expect(want.totalSeconds).toBe(87.57);
    expect(p.status).toMatchObject({ state: 'known', value: 'on-course' });
    expect(p.outcome).not.toMatchObject({ state: 'known', value: { kind: 'duration', totalSeconds: want.totalSeconds } });
    expect(p.placement).not.toMatchObject({ state: 'known', value: { rank: want.rank } });
  });

  it('real nkz-19so run 2: when the finish arrives with the same Time the row is attributed: 83.57 + 4 = 87.57, finished at dtFinish, placed 9 (DERIVATIONS §4.11 "Attribution per source")', () => {
    const p = coreWith(steps(8)).presented(A);
    const want = row(REC.n7Row);
    expect(attrOf(REC.n8Finish.data, 'Result', 'Time')).toBe(attrOf(REC.n7Row.data, 'Result', 'Time'));
    expect(p.status).toMatchObject({ state: 'known', value: 'finished' });
    expect(p.outcome).toMatchObject({
      state: 'known',
      value: { kind: 'duration', runSeconds: want.runSeconds, penaltySeconds: want.penaltySeconds, totalSeconds: want.totalSeconds },
      eventTime: finishOf(REC.n8Finish),
    });
    expect(p.placement).toMatchObject({ state: 'known', value: { rank: want.rank, order: want.order } });
  });

  it('real nkz-19so whole episode: no exception, one Attempt for bib 7 of this Phase and no stale-mark withheld (the run 1 row was retracted, not a mark)', () => {
    const core = coreWith(steps(9));
    expect(core.attempts().map(String).filter((a) => a === A)).toEqual([A]);
    expect(core.presented(A).status).toMatchObject({ state: 'known' });
    expect((core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'stale-mark')).toEqual([]);
  });
});

describe('jarni-ne-do: K1M_BR2_19 bib 22 across a TCP outage (CONTRACTS §4 INV-2 rule 2; vectors inv2-rule2-xml-takes-over-after-disconnect, inv2-rule2-connected-tcp-beats-later-xml)', () => {
  const A = 'K1M_BR2_19:22';
  const TCP_AT = REC.j1Row.observedAt;
  const DISCONNECT_AT = '2026-04-19T08:37:30.000Z';
  const changedAfter = new Date(Date.parse(REC.j2Xml.observedAt) - 5000).toISOString(); // the previous poll, the steady state (DERIVATIONS §0.3)
  const tcpTotal = Number(attrOf(REC.j1Row.data, 'Result', 'Total'));
  const tcpPen = Number(attrOf(REC.j1Row.data, 'Result', 'Pen'));
  const xmlTotal = Number(/<Total>(\d+)<\/Total>/.exec(REC.j2Xml.data)![1]) / 1000;
  const xmlPen = Number(/<Pen>(\d+)<\/Pen>/.exec(REC.j2Xml.data)![1]);
  const live = (): Unit[] => [connected(TCP_AT), tcpUnit(REC.j1Row, J_DAY)];

  it('real jarni-ne-do: the recorded TCP row and the later XML row differ (the excerpt can tell the sources apart)', () => {
    expect(changedAfter > TCP_AT).toBe(true);
    expect({ tcpTotal, tcpPen }).toEqual({ tcpTotal: 78.91, tcpPen: 1 });
    expect({ xmlTotal, xmlPen }).toEqual({ xmlTotal: 77.91, xmlPen: 0 });
  });

  it('real jarni-ne-do: the TCP row is presented from tcp while connected', () => {
    expect(coreWith(live()).presented(A).outcome).toMatchObject({ state: 'known', source: 'tcp', value: { kind: 'duration', totalSeconds: tcpTotal, penaltySeconds: tcpPen } });
    expect(coreWith(live()).presented(A).placement).toMatchObject({ state: 'known', value: { rank: Number(attrOf(REC.j1Row.data, 'Result', 'Rank')) } });
  });

  it('real jarni-ne-do: a disconnect alone changes nothing presented (INV-1: a missing source is omission, not a statement)', () => {
    const core = coreWith(live());
    const before = structuredClone(core.presented(A));
    expect(before.outcome).toMatchObject({ state: 'known', source: 'tcp' });
    const sent = core.notifications().length;
    core.applyUnit(disconnected(DISCONNECT_AT));
    expect(core.presented(A)).toEqual(before);
    expect(core.notifications().slice(sent).filter((m) => m.attemptId === A)).toEqual([]);
  });

  it('real jarni-ne-do: after the disconnect, the XML snapshot with newer content takes over: the recorded XML Total, from xml (rule 2)', () => {
    const core = coreWith([...live(), disconnected(DISCONNECT_AT), xmlUnit(REC.j2Xml, J_DAY, changedAfter)]);
    expect(core.presented(A).outcome).toMatchObject({ state: 'known', source: 'xml', value: { kind: 'duration', totalSeconds: xmlTotal, penaltySeconds: xmlPen } });
  });

  it('real jarni-ne-do: with TCP connected throughout, the same XML snapshot does not displace the TCP value (rule 2)', () => {
    const core = coreWith([...live(), xmlUnit(REC.j2Xml, J_DAY, changedAfter)]);
    expect(core.presented(A).outcome).toMatchObject({ state: 'known', source: 'tcp', value: { kind: 'duration', totalSeconds: tcpTotal, penaltySeconds: tcpPen } });
  });

  it('real jarni-ne-do: an XML snapshot whose content age is unknown (changedAfter null) does not take over after the disconnect (INV-2c: null fails every comparison)', () => {
    const core = coreWith([...live(), disconnected(DISCONNECT_AT), xmlUnit(REC.j2Xml, J_DAY, null)]);
    expect(core.presented(A).outcome).toMatchObject({ state: 'known', source: 'tcp', value: { totalSeconds: tcpTotal } });
  });
});
