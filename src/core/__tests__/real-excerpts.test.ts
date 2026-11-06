import { describe, it, expect } from 'vitest';
import { REC } from './fixtures/real-excerpts.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { CLS, type ClsRec } from './fixtures/classification-excerpts.js';
import { attrOf, connected, coreWith, disconnected, instantOf, tcpUnit, xmlUnit, type Unit } from './streams.js';

// Row 13 (#203), tier 2: real excerpts through parseTcp / parseXmlSnapshot and createMergeCore, no adapter in between.
// The excerpts are cut from the recordings (fixtures/real-excerpts.ts, provenance on top), stream order as recorded; units are frozen,
// so a core that mutates parser output throws. Expected values are read from the recorded rows (attrOf), never from an implementation.
// The recordings hold no connection records (TEST-ARCHITECTURE §9: the recorder does not yet write them): `tcp-connected` before the first
// recorded message, and the jarni-ne-do `tcp-disconnected`, are synthetic events at the stated times; every message and snapshot is recorded.

const SLALOM_DAY = { C1M_BR1_19: '2026-09-19' };
const J_DAY = { K1M_BR2_19: '2026-04-19' };
const X_DAY = { WX1_XER_26: '2026-04-26' };
const XF_DAY = { WX1_XF_26: '2026-04-26' };

describe('cp3-cross: a Kayak Cross final heat WX1_XF_26 (vector inv1-*, CONTRACTS §4 INV-1; DERIVATIONS §4.2, §4.7 placement)', () => {
  // A heat (CONTRACTS §2.4: format XF, a Phase with Attempts), not the classification Phase WX1_XER_26, which holds no Attempts (below).
  const stream = (): Unit[] => [connected(R19.xfStartList.observedAt), tcpUnit(R19.xfStartList, XF_DAY), tcpUnit(R19.xfFinal, XF_DAY)];
  const recorded = [...R19.xfFinal.data.matchAll(/<Participant Bib="\s*(\d+)"[^>]*\/><Result [^>]*\bRank="(\d*)" RankOrder="(\d*)"/g)].map((m) => ({ bib: m[1]!, rank: Number(m[2]), order: Number(m[3]) }));

  it('real cp3-cross WX1_XF_26 final: the recorded rows carry ranks 1..8 and the start list holds the same 8 bibs (the excerpt is what the test says it is)', () => {
    expect(recorded.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(attrOf(R19.xfFinal.data, 'Results', 'RaceId')).toBe('WX1_XF_26');
    expect(attrOf(R19.xfStartList.data, 'Results', 'SubTitle')).toBe('Finals - Start List');
    expect([...R19.xfStartList.data.matchAll(/<Participant Bib="\s*(\d+)"/g)].map((m) => m[1]).sort()).toEqual(recorded.map((r) => r.bib).sort());
  });

  it('real cp3-cross WX1_XF_26 final: every row\'s placement is the recorded Rank and RankOrder, for an Attempt of that bib (INV-7 snapshot of the race)', () => {
    const core = coreWith(stream());
    for (const r of recorded) {
      expect(core.presented(`WX1_XF_26:${r.bib}`).placement, `bib ${r.bib}`).toMatchObject({ state: 'known', value: { rank: r.rank, order: r.order } });
    }
    expect(core.attempts().map(String)).toEqual(expect.arrayContaining(recorded.map((r) => `WX1_XF_26:${r.bib}`)));
  });

  it('real cp3-cross WX1_XF_26 final: the start-list message before it states no placement, the final creates no Attempt beyond the 8, and raises no stale-mark or contradiction', () => {
    const afterList = coreWith(stream().slice(0, 2));
    for (const r of recorded) expect(afterList.presented(`WX1_XF_26:${r.bib}`).placement, `bib ${r.bib}`).toEqual({ state: 'not-yet' });
    const core = coreWith(stream());
    expect(core.attempts()).toHaveLength(recorded.length);
    expect(core.attempts().map(String).filter((a) => !a.startsWith('WX1_XF_26:'))).toEqual([]);
    expect((core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'stale-mark' || d.kind === 'contradiction')).toEqual([]);
  });
});

describe('cp3-cross: the classification Phase WX1_XER_26 holds no Attempts (CONTRACTS §2.4, DERIVATIONS §4.10, CONFORMANCE-VECTORS §1 "creates no Attempt")', () => {
  const stream = (): Unit[] => [connected(REC.c1StartList.observedAt), tcpUnit(REC.c1StartList, X_DAY), tcpUnit(REC.c2Final, X_DAY)];
  const recorded = [...REC.c2Final.data.matchAll(/<Participant Bib="\s*(\d+)"[^>]*\/><Result [^>]*\bRank="(\d*)" RankOrder="(\d*)"/g)].map((m) => ({ bib: m[1]!, rank: Number(m[2]), order: Number(m[3]) }));

  it('real cp3-cross WX1_XER_26 final: the recorded rows carry ranks 1..8 (the excerpt is what the test says it is)', () => {
    expect(recorded.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(attrOf(REC.c2Final.data, 'Results', 'SubTitle')).toBe('Final Result');
    expect(attrOf(REC.c1StartList.data, 'Results', 'SubTitle')).toBe('Final Result - Start List');
  });

  it('real cp3-cross WX1_XER_26 final: classification() holds the recorded Rank and RankOrder of each bib, and the core has no Attempt', () => {
    const core = coreWith(stream());
    const rows = (core.classification('WX1_XER_26')?.rows ?? []) as unknown as Array<Record<string, unknown>>;
    expect(rows).toHaveLength((REC.c2Final.data.match(/<Row /g) ?? []).length); // every recorded row, ranked or not
    for (const r of recorded) {
      const row = rows.find((x) => String(x['bib']).trim() === r.bib);
      expect(row, `bib ${r.bib}`).toBeDefined();
      expect({ rank: Number(row!['rank']), order: Number(row!['order']) }, `bib ${r.bib}`).toEqual({ rank: r.rank, order: r.order });
    }
    expect(core.attempts()).toEqual([]);
  });
});

describe('nkz-19so: C1M_BR1_19 bib 7, the recorded re-run (DERIVATIONS §4.11 "The recorded episode"; vectors rerun-*, retraction-*)', () => {
  const A = 'C1M_BR1_19:7';
  /** The stream up to and including the named record (the synthetic `connected` first), by name so no count can be off by one. */
  const ORDER = ['n1Start', 'n2Row', 'n3Finish', 'n4Wiped', 'n5Gone', 'n6Start', 'n7Row', 'n8Finish'] as const;
  type Key = (typeof ORDER)[number];
  const through = (last: Key): Unit[] => [connected(REC.n1Start.observedAt), ...ORDER.slice(0, ORDER.indexOf(last) + 1).map((k) => tcpUnit(REC[k], SLALOM_DAY))];
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
    const p = coreWith(through('n3Finish')).presented(A);
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
    const core = coreWith(through('n3Finish'));
    const before = core.notifications().length;
    core.applyUnit(tcpUnit(REC.n4Wiped, SLALOM_DAY));
    const p = core.presented(A);
    expect(p.outcome).toEqual({ state: 'not-yet' });
    expect(p.placement).toEqual({ state: 'not-yet' });
    const sent = core.notifications().slice(before).filter((m) => m.attemptId === A);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'attempt.updated', fields: { outcome: { state: 'not-yet' }, placement: { state: 'not-yet' } } });
  });

  it('real nkz-19so row gone at 12:02:04 (a TCP table without the row): a retraction again, a no-op: still not-yet, nothing sent for the Attempt', () => {
    expect(REC.n5Gone.data).not.toMatch(/Bib="\s*7"/);
    const core = coreWith(through('n4Wiped'));
    const before = messagesFor(core).length;
    core.applyUnit(tcpUnit(REC.n5Gone, SLALOM_DAY));
    expect(core.presented(A).outcome).toEqual({ state: 'not-yet' });
    expect(messagesFor(core)).toHaveLength(before);
    expect(core.attempts().map(String)).toContain(A);
  });

  it('real nkz-19so run 2 starts (dtStart differs): the generation changes, the Attempt is on-course again and the change is pushed (ADR-013, vector rerun-status-transition-legal-only-with-generation)', () => {
    expect(attrOf(REC.n6Start.data, 'Result', 'dtStart')).not.toBe(attrOf(REC.n1Start.data, 'Result', 'dtStart'));
    const core = coreWith(through('n6Start'));
    expect(core.presented(A).status).toMatchObject({ state: 'known', value: 'on-course' });
    expect(core.presented(A).placement).toEqual({ state: 'not-yet' });
    expect(messagesFor(core).at(-1)).toMatchObject({ type: 'attempt.updated', fields: { status: { value: 'on-course' } } });
  });

  it('real nkz-19so run 2: the row 108 ms before the finish is retained, not presented as run 2\'s (vector rerun-tcp-row-before-new-finish-not-presented)', () => {
    const p = coreWith(through('n7Row')).presented(A);
    const want = row(REC.n7Row);
    expect(want.totalSeconds).toBe(87.57);
    expect(p.status).toMatchObject({ state: 'known', value: 'on-course' });
    expect(p.outcome).not.toMatchObject({ state: 'known', value: { kind: 'duration', totalSeconds: want.totalSeconds } });
    expect(p.placement).not.toMatchObject({ state: 'known', value: { rank: want.rank } });
  });

  it('real nkz-19so run 2: when the finish arrives with the same Time the row is attributed: 83.57 + 4 = 87.57, finished at dtFinish, placed 9 (DERIVATIONS §4.11 "Attribution per source")', () => {
    const p = coreWith(through('n8Finish')).presented(A);
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
    const core = coreWith(through('n8Finish'));
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

// ---------------------------------------------------------------------------------------------------------------------------------------
// #204 rows 4 to 8 and the round-20 cold start: real excerpts of every TCP record of a window (fixtures/leave-excerpts.ts, cut by script from the
// recordings), each fed through parseTcp in recorded order. The recordings hold no connection records (TEST-ARCHITECTURE §9): `tcp-connected`
// precedes the first record of a window. The leave rule is DERIVATIONS §4.1 (4 s, "or more", evaluated at every ingested TCP message, a message
// arriving the constant or more after the previous one ends a silence and nothing leaves). The expected in-set / status at each step is that
// rule applied to the RECORDED timestamps and texts below (`leaveModel`), never read from the core.
// ---------------------------------------------------------------------------------------------------------------------------------------

import { LEAVE, type LeaveRec } from './fixtures/leave-excerpts.js';
import { derive } from './streams.js';

const LEAVE_MS = 4000;
const raceDates = (recs: readonly LeaveRec[]): Record<string, string> =>
  Object.fromEntries([...new Set(recs.flatMap((r) => [...r.data.matchAll(/RaceId="([^"]+)"/g)].map((m) => m[1]!)))].map((id) => [id, recs[0]!.observedAt.slice(0, 10)]));
const namesBib = (r: { data: string }, race: string, bib: string): boolean =>
  r.data.includes('<OnCourse ') && r.data.includes(`RaceId="${race}"`) && new RegExp(`Bib="\\s*${bib}"`).test(r.data);
const isCourseEmpty = (r: { data: string }): boolean => /<OnCourse Total="0" Position="0"\s*\/>/.test(r.data);

/** DERIVATIONS §4.1 applied to the recorded records: after each record, is the Attempt on the set and what `status` does the stream state for it. */
function leaveModel(recs: readonly { observedAt: string; data: string }[], race: string, bib: string): Array<{ listed: boolean; status: string | undefined }> {
  let listed = false;
  let last = 0;
  let prev: number | undefined;
  let status: string | undefined;
  return recs.map((r) => {
    const t = Date.parse(r.observedAt);
    if (listed && prev !== undefined && t - prev >= LEAVE_MS) last = t; // the silence ended: every listed Attempt counts from this message
    if (namesBib(r, race, bib)) {
      listed = true;
      last = t;
      const c = /Type="C"[^>]*dtStart="([^"]*)"[^>]*dtFinish="([^"]*)"/.exec(r.data)!;
      status = c[2] !== '' ? 'finished' : c[1] !== '' ? 'on-course' : 'at-start';
    } else if (isCourseEmpty(r)) {
      if (listed) status = status === 'on-course' ? 'left-without-finish' : status === 'at-start' ? 'not-started' : status;
      listed = false;
    } else if (listed && prev !== undefined && t - prev < LEAVE_MS && t - last >= LEAVE_MS) {
      listed = false;
      status = status === 'on-course' ? 'left-without-finish' : status === 'at-start' ? 'not-started' : status;
    }
    prev = t;
    return { listed, status };
  });
}

/** Feeds the window one record at a time and returns the core's view of one Attempt after each. */
function replayAttempt(recs: readonly LeaveRec[], id: string, over: Record<string, unknown> = {}): Array<{ listed: boolean; status: unknown; set: string[]; core: ReturnType<typeof coreWith> }> {
  const core = coreWith([connected(recs[0]!.observedAt)]);
  const dates = raceDates(recs);
  return recs.map((r) => {
    core.applyUnit(tcpUnit(r, dates, over));
    const set = core.oncourse().attemptIds.map(String);
    return { listed: set.includes(id), status: (core.presented(id)['status'] as { value?: unknown } | undefined)?.value, set, core };
  });
}

describe('#204 row 4: cp3-cross 09:18:38Z, the 10.7 s TCP stall with the Cross heat WX1J_XS_26_JUN on course (DERIVATIONS §4.1 "Stated as one evaluation")', () => {
  const recs = LEAVE.stall10;
  const heat = ['1', '4', '5', '8'].map((b) => `WX1J_XS_26_JUN:${b}`).sort();

  it('the excerpt is what the test says: four heat Attempts listed every second, then 10.68 s with no TCP message at all, then TimeOfDay and the heat again', () => {
    const times = recs.map((r) => Date.parse(r.observedAt));
    const gaps = times.slice(1).map((t, i) => t - times[i]!);
    expect(Math.max(...gaps)).toBeGreaterThan(10_000);
    expect(Math.max(...gaps)).toBeLessThan(11_000);
    expect(heat.every((id) => recs.some((r) => namesBib(r, 'WX1J_XS_26_JUN', id.split(':')[1]!)))).toBe(true);
  });

  it('real: from the first complete listing to the end of the window the on-course set is exactly the four heat Attempts at every record, across the stall (no oncourse-left)', () => {
    const steps = replayAttempt(recs, heat[0]!);
    const from = steps.findIndex((s) => [...s.set].sort().join() === heat.join());
    expect(from).toBeGreaterThanOrEqual(0);
    for (const s of steps.slice(from)) expect([...s.set].sort()).toEqual(heat);
  });

  it('real: no Attempt of the heat is anything but on-course at any record, and no record leaves a trace of a leave (no left-without-finish: a Cross heat never uses it)', () => {
    const core = coreWith([connected(recs[0]!.observedAt)]);
    for (const r of recs) {
      core.applyUnit(tcpUnit(r, raceDates(recs)));
      for (const id of core.attempts().map(String)) expect((core.presented(id)['status'] as { value?: unknown }).value, id).toBe('on-course');
    }
    expect(core.diagnostics()).toEqual([]);
  });
});

describe('#204 row 5: nkz-20ne 11:53:51Z, the 21.5 s TCP stall with an empty course (DERIVATIONS §4.1)', () => {
  const recs = LEAVE.stall21;

  it('the excerpt is what the test says: Total 0 at 11:53:51.872, then 21.53 s with no TCP message, then RaceConfig', () => {
    const i = recs.findIndex((r) => r.observedAt === '2026-09-20T11:53:51.872Z');
    expect(isCourseEmpty(recs[i]!)).toBe(true);
    expect(Date.parse(recs[i + 1]!.observedAt) - Date.parse(recs[i]!.observedAt)).toBeGreaterThan(21_000);
  });

  it('real: the course is empty at every record, no Attempt exists, nothing is on the set', () => {
    const steps = replayAttempt(recs, 'FOR_BR2_20:5');
    for (const s of steps) expect(s.set).toEqual([]);
    expect(steps.at(-1)!.core.attempts()).toEqual([]);
  });

  it('(derived: one recorded listing, FOR_BR2_20 bib 5 of 11:58:29, re-timed to just after the last Total 0) the Attempt staged across the stall is still listed at the message that ends it and leaves only at upstream\'s own "course empty" 0.6 s later', () => {
    const listing = LEAVE.forListing.find((r) => namesBib(r, 'FOR_BR2_20', '5'))!;
    const staged = { ...listing, observedAt: '2026-09-20T11:53:51.900Z' };
    const all = [...recs.filter((r) => r.observedAt <= '2026-09-20T11:53:51.872Z'), staged, ...recs.filter((r) => r.observedAt > '2026-09-20T11:53:51.872Z')];
    const steps = replayAttempt(all, 'FOR_BR2_20:5');
    const at = (iso: string): number => all.findIndex((r) => r.observedAt === iso);
    expect(steps[at('2026-09-20T11:53:51.900Z')]!.listed).toBe(true);
    for (const iso of ['2026-09-20T11:54:13.404Z', '2026-09-20T11:54:13.405Z', '2026-09-20T11:54:14.011Z']) {
      expect(steps[at(iso)]!.listed, iso).toBe(true);
      expect(steps[at(iso)]!.status, iso).toBe('at-start');
    }
    const empty = steps[at('2026-09-20T11:54:14.022Z')]!;
    expect(isCourseEmpty(all[at('2026-09-20T11:54:14.022Z')]!)).toBe(true);
    expect(empty.listed).toBe(false);
    expect(empty.status).toBe('not-started');
  });
});

describe('#204 row 6: the four real unstages of 3.04, 3.68, 3.86 and 4.29 s (DERIVATIONS §4.1 round 20: "A removal and a restage faster than the constant are not seen ... a slower one is a leave and a re-listing")', () => {
  interface Gap { name: string; win: readonly LeaveRec[]; race: string; bib: string; seconds: number; leaves: boolean }
  const gaps: Gap[] = [
    { name: 'jarni-ne-do K1M_BR1_19:51 3.04 s', win: LEAVE.gap304, race: 'K1M_BR1_19', bib: '51', seconds: 3.04, leaves: false },
    { name: 'cp3-cross WX1_XT_26:19 3.68 s', win: LEAVE.gap368, race: 'WX1_XT_26', bib: '19', seconds: 3.68, leaves: false },
    { name: 'nkz-20ne K1W_BR1_20:46 3.86 s', win: LEAVE.gap386, race: 'K1W_BR1_20', bib: '46', seconds: 3.86, leaves: false },
    { name: 'jarni-ne-do K1M_BR2_19:83 4.29 s', win: LEAVE.gap429, race: 'K1M_BR2_19', bib: '83', seconds: 4.29, leaves: true },
  ];

  for (const g of gaps) {
    const id = `${g.race}:${g.bib}`;
    const named = g.win.filter((r) => namesBib(r, g.race, g.bib));
    const longest = Math.max(...named.slice(1).map((r, i) => Date.parse(r.observedAt) - Date.parse(named[i]!.observedAt))) / 1000;

    it(`${g.name}: the excerpt holds the recorded gap, other TCP messages arriving throughout (no silence of ${LEAVE_MS / 1000} s)`, () => {
      expect(longest).toBeCloseTo(g.seconds, 2);
      const t = g.win.map((r) => Date.parse(r.observedAt));
      expect(Math.max(...t.slice(1).map((x, i) => x - t[i]!))).toBeLessThan(LEAVE_MS);
    });

    it(`${g.name}: ${g.leaves ? 'a leave at the first message 4 s or more after the last naming, then a re-listing' : 'no leave: the Attempt is on the set at every record (the removal and restage are not seen)'}; the core follows the rule at every record`, () => {
      const model = leaveModel(g.win, g.race, g.bib);
      expect(model.some((m, i) => i > 0 && model[i - 1]!.listed && !m.listed)).toBe(g.leaves);
      const steps = replayAttempt(g.win, id);
      steps.forEach((s, i) => {
        if (model[i]!.status === undefined) return; // not yet listed in the window
        expect({ listed: s.listed, status: s.status }, `${g.win[i]!.observedAt}`).toEqual(model[i]);
      });
      if (g.leaves) {
        const out = model.findIndex((m, i) => i > 0 && model[i - 1]!.listed && !m.listed);
        const back = model.findIndex((m, i) => i > out && m.listed);
        expect(steps[out]!.status).toBe('not-started'); // unstaged before any start (CONTRACTS §3.2)
        expect(steps[back]!.status).toBe('at-start'); // not-started -> at-start, the generation untouched
        expect((steps[back]!.core.presented(id)['run'] as { value: unknown }).value).toBe((steps[0]!.core.presented(id)['run'] as { value: unknown }).value);
      }
    });
  }
});

describe('#204 row 8 (per-unit assert against the raw stream, stated as such; the gate-2 checker #249 is not in): no result value is provisional:false in the windows of rows 4 to 6 unless the raw stream closed its run (CONTRACTS §1.2, P11)', () => {
  const closed = (r: { data: string }): boolean => /Completed="Y"/.test(r.data) && /dtFinish="[^"]+"/.test(r.data);
  const windows: Array<[string, readonly LeaveRec[]]> = [['stall10', LEAVE.stall10], ['stall21', LEAVE.stall21], ['gap304', LEAVE.gap304], ['gap368', LEAVE.gap368], ['gap386', LEAVE.gap386], ['gap429', LEAVE.gap429]];
  for (const [name, recs] of windows) {
    it(`${name}: after every record every stream-derived outcome/gates/faults/placement is provisional while the raw stream has not closed its run`, () => {
      const core = coreWith([connected(recs[0]!.observedAt)]);
      const dates = raceDates(recs);
      const closedBibs = new Set<string>(); // closed by the raw stream, or holding a results-table row (judged by its own cells: a complete row is final, P11)
      for (const r of recs) {
        core.applyUnit(tcpUnit(r, dates));
        if (closed(r)) closedBibs.add(/Bib="\s*(\d+)"/.exec(r.data)![1]!);
        if (r.data.includes('<Results ')) for (const m of r.data.matchAll(/<Participant Bib="\s*(\d+)"/g)) closedBibs.add(m[1]!);
        for (const id of core.attempts().map(String)) {
          if (closedBibs.has(id.split(':')[1]!)) continue;
          for (const f of ['outcome', 'gates', 'faults', 'placement']) {
            const v = core.presented(id)[f] as { state?: string; provisional?: boolean; source?: string } | undefined;
            if (v?.state === 'known' && v.source !== undefined) expect(v.provisional, `${r.observedAt} ${id}.${f}`).toBe(true);
          }
        }
      }
    });
  }
});

describe('#204 B3 (design-round20 second pass; DERIVATIONS §4.4): cp3-cross WX1_XT_26:19, a staged listing with Completed="Y" and no start closes nothing', () => {
  const recs = LEAVE.gap368;
  const id = 'WX1_XT_26:19';

  it('the excerpt is what the test says: Y with no dtStart and no dtFinish at 07:35:54.193Z, the start 9:35:59.069 listed 07:35:59.476Z with Completed N', () => {
    const y = recs.find((r) => namesBib(r, 'WX1_XT_26', '19') && /Completed="Y"/.test(r.data))!;
    expect(y.observedAt).toBe('2026-04-26T07:35:54.193Z');
    expect(attrOf(y.data, 'Result', 'dtStart')).toBe('');
    expect(attrOf(y.data, 'Result', 'dtFinish')).toBe('');
    expect(recs.some((r) => namesBib(r, 'WX1_XT_26', '19') && attrOf(r.data, 'Result', 'dtStart') === '9:35:59.069' && /Completed="N"/.test(r.data))).toBe(true);
  });

  it('real: from the Y listing to the end of the window (the athlete started and running, nothing finished) the run is not closed: every known result field of the Attempt stays provisional', () => {
    const core = coreWith([connected(recs[0]!.observedAt)]);
    const dates = raceDates(recs);
    let seenY = false;
    let checked = 0;
    for (const r of recs) {
      core.applyUnit(tcpUnit(r, dates));
      if (namesBib(r, 'WX1_XT_26', '19') && /Completed="Y"/.test(r.data)) seenY = true;
      if (!seenY) continue;
      for (const f of ['outcome', 'gates', 'faults', 'placement']) {
        const v = core.presented(id)[f] as { state?: string; provisional?: boolean } | undefined;
        if (v?.state === 'known') {
          checked++;
          expect(v.provisional, `${r.observedAt} ${f}`).toBe(true);
        }
      }
    }
    expect(checked).toBeGreaterThan(0); // the test looked at something
  });
});

describe('#204 B3 recorded effect and O2 (design-round20 second pass; #258 O2; DERIVATIONS §4.4): cp3-cross WX1_XT_26:19 over the whole run, no course bound', () => {
  const recs = LEAVE.b3;
  const id = 'WX1_XT_26:19';
  const closing = recs.findIndex((r) => r.observedAt === '2026-04-26T07:37:55.676Z');
  const firstRow = recs.findIndex((r) => r.data.includes('<Results '));

  it('the excerpt is what the test says: the result row at 07:37:10.099, the first Completed Y carrying a dtFinish at 07:37:55.676 (the staged Y of 07:35:54.193 earlier is not it)', () => {
    expect(closing).toBeGreaterThan(firstRow);
    expect(recs[firstRow]!.observedAt).toBe('2026-04-26T07:37:10.099Z');
    expect(attrOf(recs[closing]!.data, 'Result', 'dtFinish')).not.toBe('');
    expect(recs.filter((r) => /Completed="Y"/.test(r.data)).map((r) => r.observedAt)).toEqual(['2026-04-26T07:35:54.193Z', '2026-04-26T07:37:55.676Z']);
  });

  it('real: from the result row to the record before the real closure the run is not closed, the course unbound: the outcome is provisional (the 46 s a staged Y must not take away)', () => {
    const core = coreWith([connected(recs[0]!.observedAt)]);
    let looked = 0;
    recs.forEach((r, i) => {
      core.applyUnit(tcpUnit(r, raceDates(recs), { courses: {} }));
      if (i < firstRow || i >= closing) return;
      const o = core.presented(id)['outcome'] as { state?: string; provisional?: boolean };
      expect(o.state, r.observedAt).toBe('known');
      expect(o.provisional, r.observedAt).toBe(true);
      looked++;
    });
    expect(looked).toBeGreaterThan(5);
  });

  it('real: the Completed Y with the finish closes the run (provisional false), and the change is pushed in that same step (#258 O2: the Attempt is marked dirty)', () => {
    const core = coreWith([connected(recs[0]!.observedAt)]);
    for (const r of recs.slice(0, closing)) core.applyUnit(tcpUnit(r, raceDates(recs), { courses: {} }));
    const from = core.notifications().length;
    core.applyUnit(tcpUnit(recs[closing]!, raceDates(recs), { courses: {} }));
    expect(core.presented(id)['outcome']).toMatchObject({ state: 'known', provisional: false });
    const sent = core.notifications().slice(from).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === id) as Array<{ fields: Record<string, { provisional?: boolean }> }>;
    expect(sent.some((m) => m.fields['outcome']?.provisional === false)).toBe(true);
  });
});

describe('#258 cold start (design-round20 "Cold start", code items 2, 3, 15; CONTRACTS §1.2, P11): before any snapshot binds the course', () => {
  it('real nkz-19so K1M_BR2_19:80, run 2 running since 09:28:59, the Results row at 09:30:05.265 (no Time, Rank 31, Total 91.42, Gates=""): the carried placement and pairTotal are provisional', () => {
    const recs = LEAVE.cold80;
    const row = recs.at(-1)!;
    expect(row.observedAt).toBe('2026-09-19T09:30:05.265Z');
    expect(attrOf(row.data, 'Result', 'Time')).toBe('');
    const core = coreWith([connected(recs[0]!.observedAt)]);
    for (const r of recs) core.applyUnit(tcpUnit(r, raceDates(recs), { courses: {} }));
    const id = 'K1M_BR2_19:80';
    expect(core.presented(id)['status']).toMatchObject({ value: 'on-course' });
    expect(core.presented(id)['placement']).toMatchObject({ state: 'known', value: { rank: Number(attrOf(row.data, 'Result', 'Rank')) }, provisional: true });
    expect(core.presented(id)['pairTotal']).toMatchObject({ state: 'known', value: Number(attrOf(row.data, 'Result', 'Total')), provisional: true });
  });

  it('real cp3-cross MX1_XT_26:8, the Results row with Time 62.09 at 08:45:00.903 and no course bound: the result is provisional (completeness cannot be judged), also after the finish listing 164 ms later', () => {
    const recs = LEAVE.coldXt8;
    const rowAt = recs.findIndex((r) => r.observedAt === '2026-04-26T08:45:00.903Z');
    expect(rowAt).toBeGreaterThan(0);
    expect(recs.at(-1)!.observedAt).toBe('2026-04-26T08:45:01.067Z');
    const core = coreWith([connected(recs[0]!.observedAt)]);
    const id = 'MX1_XT_26:8';
    const time = Number(attrOf(recs[rowAt]!.data, 'Result', 'Time'));
    recs.forEach((r, i) => {
      core.applyUnit(tcpUnit(r, raceDates(recs), { courses: {} }));
      if (i < rowAt) return;
      expect(core.presented(id)['outcome'], r.observedAt).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: time }, provisional: true });
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------
// #258 O1 / design-round20 CQ1, P12: the recorded Attempts at which a refused XML mark was presented through `outcome` (fixtures/nine-excerpts.ts,
// cut by script). P12 (TEST-ARCHITECTURE; CONTRACTS §2.6, §4 rule 2): `outcome.kind === 'no-result'` iff the presented `status` is a result mark
// other than `non-ranked`, and then the same status. The expected relation is the contract's; the stream is the recorded one.
// ---------------------------------------------------------------------------------------------------------------------------------------

import { NINE } from './fixtures/nine-excerpts.js';

describe('#258 O1 recorded instances: P12 holds at every step of the stream around each (no-result is status\'s presentation)', () => {
  const MARKS = new Set(['dns', 'dnf', 'cap', 'ral', 'dsq', 'dsq-r', 'dqb', 'other']);
  for (const c of NINE) {
    it(`real ${c.recording} ${c.id} at ${c.at.slice(11, 23)}Z: the xml row states a mark, and at every step outcome no-result iff status is that mark`, () => {
      const [race, bib] = [c.id.split(':')[0]!, c.id.split(':')[1]!];
      const xml = c.steps.find((s) => s.kind === 'xml')!;
      const block = new RegExp(`<Results>\\s*<RaceId>${race}</RaceId>[\\s\\S]*?<Bib>\\s*${bib}</Bib>[\\s\\S]*?</Results>`).exec(xml.data)![0];
      expect(/<Status>[A-Z-]+<\/Status>/.test(block), 'the recorded xml row states a mark').toBe(true);
      const dates = Object.fromEntries([...new Set(c.steps.flatMap((s) => [...s.data.matchAll(/RaceId[=>"]+([A-Z0-9_]+)/g)].map((m) => m[1]!)))].map((r) => [r, c.at.slice(0, 10)]));
      const core = coreWith([connected(c.steps[0]!.observedAt)]);
      let steps = 0;
      for (const s of c.steps) {
        const rec = { recording: c.recording, chunk: s.chunk, ts: 0, observedAt: s.observedAt, data: s.data };
        core.applyUnit(s.kind === 'xml' ? xmlUnit(rec, dates, s.changedAfter ?? null) : tcpUnit(rec, dates));
        const p = core.presented(c.id) as Record<string, { state?: string; value?: any }>;
        if (p['status']?.state !== 'known') continue;
        const status = p['status']!.value as string;
        const outcome = p['outcome'];
        const nr = outcome?.state === 'known' && outcome.value?.kind === 'no-result';
        expect(nr, `${s.observedAt} status ${status}`).toBe(MARKS.has(status));
        if (nr) expect(outcome!.value.status, s.observedAt).toBe(status);
        steps++;
      }
      expect(steps).toBeGreaterThan(3);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------
// #205 row 8 (tier 2): the Standing assembled from real cp3-cross streams. Expected values are read from the recorded text by regex (raw Rank, RankOrder,
// Rnk, RnkOrder, RecordType), never from the parser or the core. Publication steps are CONTRACTS section 5 step 1 and DERIVATIONS 4.10 applied to the
// raw records: TCP replaces always; an xml snapshot replaces tcp-built rows when its content age (observedAt minus the 5 s poll) is later than the tcp
// delivery; a Standing is pushed only when its serialised form changes; asOf is the observedAt of the snapshot that changed it.
// ---------------------------------------------------------------------------------------------------------------------------------------

type StandingMsg = { standingKey: string; classId: string; scope: Record<string, unknown>; ageCategoryId: string | null; asOf: string; entries: Array<Record<string, unknown>>; anomalies: unknown[] };
const standingsOf = (core: ReturnType<typeof coreWith>, from: number): StandingMsg[] =>
  core.notifications().slice(from).filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as StandingMsg);
type Want = { entryId: string; rank: number | null; order: number; decidedIn: string | null };
const byId = <T extends { entryId: unknown }>(xs: T[]): T[] => [...xs].sort((a, b) => String(a.entryId).localeCompare(String(b.entryId)));
/** Rows of a recorded TCP Results message: Participant Id, Result Rank and RankOrder. */
const rawTcpRows = (data: string): Array<{ entryId: string; rank: number | null; order: number }> =>
  [...data.matchAll(/<Participant [^>]*?\bId="([^"]*)"[^>]*\/><Result [^>]*?\bRank="(\d*)" RankOrder="(\d*)"/g)].map((m) => ({ entryId: m[1]!, rank: m[2] === '' ? null : Number(m[2]), order: Number(m[3]) }));
/** Rows of one race in a recorded XML snapshot: Id, Rnk, RnkOrder, RecordType. */
const rawXmlRows = (data: string, race: string): Array<{ entryId: string; rank: number | null; order: number; decidedIn: string | null }> =>
  [...data.matchAll(/<Results>[\s\S]*?<\/Results>/g)]
    .map((m) => m[0])
    .filter((b) => b.includes(`<RaceId>${race}</RaceId>`))
    .map((b) => ({
      entryId: /<Id>([^<]*)<\/Id>/.exec(b)![1]!,
      rank: /<Rnk>(\d+)<\/Rnk>/.exec(b) ? Number(/<Rnk>(\d+)<\/Rnk>/.exec(b)![1]) : null,
      order: Number(/<RnkOrder>(\d+)<\/RnkOrder>/.exec(b)![1]),
      decidedIn: /<RecordType>([^<]+)<\/RecordType>/.exec(b)?.[1] ?? null,
    }));
const raceOfTcp = (r: ClsRec): string => attrOf(r.data, 'Results', 'RaceId');
const CLS_DAYS = { MX1_XER_26: '2026-04-26', WX1J_XER_26_JUN: '2026-04-26' };
const unitOf = (r: ClsRec): Unit =>
  r.kind === 'tcp' ? tcpUnit(r, CLS_DAYS) : xmlUnit(r, CLS_DAYS, new Date(Date.parse(r.observedAt) - 5000).toISOString());
const hhmmss = (r: ClsRec): string => r.observedAt.slice(11, 23);
const rec = (kind: 'tcp' | 'xml', time: string, race?: string): ClsRec => {
  const f = CLS.find((r) => r.kind === kind && hhmmss(r) === time && (race === undefined || r.kind === 'xml' || raceOfTcp(r) === race));
  if (f === undefined) throw new Error(`no ${kind} record at ${time}`);
  return f;
};

describe('#205 row 8: cp3-cross XER hour, MX1_XER_26 and WX1J_XER_26_JUN: the published sequence of round 18 (DERIVATIONS 4.10; CONTRACTS 5 step 1; TEST-ARCHITECTURE property 15)', () => {
  const PUBLISHED: Record<string, string[]> = {
    MX1_XER_26: ['10:26:02.742', '10:26:13.728', '10:27:42.823', '10:28:42.303'],
    WX1J_XER_26_JUN: ['10:26:05.202', '10:26:13.728', '10:28:12.887', '10:29:03.919', '10:29:24.174'],
  };

  it('real cp3-cross: the excerpt is what the test says, and the leads recorded in DERIVATIONS 4.10 (89 s, 119 s; 21 s, 44 s) hold between these records', () => {
    const secs = (a: ClsRec, b: ClsRec): number => Math.floor((Date.parse(b.observedAt) - Date.parse(a.observedAt)) / 1000);
    const x1 = rec('xml', '10:26:13.728');
    expect(secs(x1, rec('tcp', '10:27:42.823', 'MX1_XER_26'))).toBe(89);
    expect(secs(x1, rec('tcp', '10:28:12.887', 'WX1J_XER_26_JUN'))).toBe(119);
    expect(secs(rec('tcp', '10:28:42.303', 'MX1_XER_26'), rec('xml', '10:29:03.919'))).toBe(21);
    expect(secs(rec('tcp', '10:29:24.174', 'WX1J_XER_26_JUN'), rec('xml', '10:30:08.999'))).toBe(44);
    expect(rawXmlRows(x1.data, 'MX1_XER_26')).toHaveLength(52);
    expect(rawXmlRows(x1.data, 'WX1J_XER_26_JUN')).toHaveLength(15);
    expect(rawTcpRows(rec('tcp', '10:27:42.823', 'MX1_XER_26').data)).toHaveLength(52);
    // the two builds really differ in the order they state, at the moments the sequence below turns on
    expect(rawTcpRows(rec('tcp', '10:26:02.742', 'MX1_XER_26').data).map((r) => r.order)).not.toEqual(rawTcpRows(rec('tcp', '10:27:42.823', 'MX1_XER_26').data).map((r) => r.order));
  });

  for (const race of Object.keys(PUBLISHED)) {
    it(`real cp3-cross ${race}: a classification Standing is pushed exactly at ${PUBLISHED[race]!.join(', ')}; every other tcp rotation and xml save of the hour moves nothing; asOf is the observedAt of the snapshot that changed it`, () => {
      const key = `classification:${race}/all`;
      const core = coreWith([connected(CLS[0]!.observedAt)]);
      const decided = new Map<string, string | null>(); // last admitted xml decidedIn per entryId, from the raw xml
      const pushed: string[] = [];
      for (const r of CLS) {
        if (r.kind === 'tcp' && raceOfTcp(r) !== race) continue;
        const before = core.notifications().length;
        core.applyUnit(unitOf(r));
        const mine = standingsOf(core, before).filter((s) => s.standingKey === key);
        const rows = r.kind === 'xml' ? rawXmlRows(r.data, race) : rawTcpRows(r.data);
        if (r.kind === 'xml') for (const x of rows as Array<{ entryId: string; decidedIn: string | null }>) decided.set(x.entryId, x.decidedIn);
        if (rows.length === 0) {
          expect(mine, `${r.kind} ${hhmmss(r)} states no rows`).toHaveLength(0);
          continue;
        }
        if (PUBLISHED[race]!.includes(hhmmss(r))) {
          expect(mine, `${r.kind} ${hhmmss(r)} changed the Standing`).toHaveLength(1);
          const s = mine[0]!;
          pushed.push(hhmmss(r));
          expect(s.asOf, `${hhmmss(r)} asOf`).toBe(r.observedAt);
          const want: Want[] = rows.map((x) => ({ entryId: x.entryId, rank: x.rank, order: x.order, decidedIn: r.kind === 'xml' ? (x as { decidedIn: string | null }).decidedIn : (decided.get(x.entryId) ?? null) }));
          expect(byId(s.entries.map((e) => ({ entryId: e['entryId'], rank: e['rank'], order: e['order'], decidedIn: e['decidedIn'] }))), `${hhmmss(r)} entries`).toEqual(byId(want));
          const orders = s.entries.map((e) => e['order'] as number);
          expect(orders, `${hhmmss(r)} sorted by order`).toEqual([...orders].sort((a, b) => a - b));
        } else {
          expect(mine, `${r.kind} ${hhmmss(r)} changed nothing`).toHaveLength(0);
        }
      }
      expect(pushed).toEqual(PUBLISHED[race]);
    });

    it(`real cp3-cross ${race}: at the window end the Standing's rank and order equal the window-end XML (10:39:29), entry for entry, asOf is the last change`, () => {
      const key = `classification:${race}/all`;
      const core = coreWith([connected(CLS[0]!.observedAt), ...CLS.filter((r) => r.kind === 'xml' || raceOfTcp(r) === race).map(unitOf)]);
      const all = standingsOf(core, 0).filter((s) => s.standingKey === key);
      expect(all.length).toBe(PUBLISHED[race]!.length);
      const last = all.at(-1)!;
      expect(last.asOf).toBe(`2026-04-26T${PUBLISHED[race]!.at(-1)}Z`);
      const end = rawXmlRows(rec('xml', '10:39:29.676').data, race);
      expect(byId(last.entries.map((e) => ({ entryId: e['entryId'], rank: e['rank'], order: e['order'], decidedIn: e['decidedIn'] })))).toEqual(byId(end));
    });
  }
});

describe('#205 row 8: cp3-cross finals: the Standing holds the recorded placements (CONTRACTS 5 steps 1-2; DERIVATIONS 4.7, 4.10; property 15)', () => {
  it('real cp3-cross WX1_XF_26 final (heat 1): the heat and the phase standing carry the recorded Rank and RankOrder of the 8 bibs, sorted by order', () => {
    const core = coreWith([connected(R19.xfStartList.observedAt), tcpUnit(R19.xfStartList, XF_DAY), tcpUnit(R19.xfFinal, XF_DAY)]);
    const recorded = [...R19.xfFinal.data.matchAll(/<Participant Bib="\s*(\d+)"[^>]*\/><Result [^>]*\bRank="(\d*)" RankOrder="(\d*)"/g)].map((m) => ({ bib: m[1]!, rank: Number(m[2]), order: Number(m[3]) }));
    expect(recorded).toHaveLength(8);
    const sent = standingsOf(core, 0);
    for (const key of ['heat:WX1_XF_26:1/all', 'phase:WX1_XF_26/all']) {
      const s = sent.filter((x) => x.standingKey === key).at(-1);
      expect(s, key).toBeDefined();
      expect(s!.entries.map((e) => ({ bib: String(e['bib']).trim(), rank: e['rank'], order: e['order'] })), key).toEqual(recorded.map((r) => ({ bib: r.bib, rank: r.rank, order: r.order })));
    }
    expect(sent.filter((x) => x.standingKey === 'heat:WX1_XF_26:1/all').at(-1)!.scope).toEqual({ kind: 'heat', phaseId: 'WX1_XF_26', heat: 1 });
    expect(sent.some((x) => /^classification:/.test(x.standingKey))).toBe(false); // a heat Phase feeds no classification
  });

  it('real cp3-cross WX1_XER_26 final: the classification Standing is first pushed at the first row (the start list before it pushes nothing); its entries are the recorded rows', () => {
    const core = coreWith([connected(REC.c1StartList.observedAt), tcpUnit(REC.c1StartList, { WX1_XER_26: '2026-04-26' })]);
    expect(standingsOf(core, 0).filter((s) => s.standingKey === 'classification:WX1_XER_26/all')).toHaveLength(0);
    const before = core.notifications().length;
    core.applyUnit(tcpUnit(REC.c2Final, { WX1_XER_26: '2026-04-26' }));
    const sent = standingsOf(core, before).filter((s) => s.standingKey === 'classification:WX1_XER_26/all');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.asOf).toBe(REC.c2Final.observedAt);
    expect(sent[0]!.scope).toEqual({ kind: 'classification', phaseId: 'WX1_XER_26' });
    expect(sent[0]!.ageCategoryId).toBeNull();
    const want = rawTcpRows(REC.c2Final.data);
    expect(want.length).toBeGreaterThan(0);
    expect(byId(sent[0]!.entries.map((e) => ({ entryId: e['entryId'], rank: e['rank'], order: e['order'] })))).toEqual(byId(want));
  });
});
