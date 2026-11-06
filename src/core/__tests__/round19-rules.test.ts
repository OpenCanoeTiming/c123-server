import { describe, it, expect } from 'vitest';
import { createMergeCore } from '../index.js';
import { REC } from './fixtures/real-excerpts.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { attrOf, connected, coreWith, derive, disconnected, tcpUnit, xmlUnit, type Unit } from './streams.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

// Round 19 (#203) code items 2 to 8 (docs/arch round 19 ruling, "What changes in code"). Real excerpts where the recordings hold the shape
// (fixtures/round19-excerpts.ts, cut by script); a case marked "derived" re-times or edits one recorded message; the write and option cases
// are element-level, in the shape of the conformance vectors. Expected values come from the recorded text, never from the core.

type Core = MergePort;
const field = (c: Core, a: string, f: string): any => c.presented(a)[f];
const msgs = (c: Core, from: number, type: string) => c.notifications().slice(from).filter((m) => m['type'] === type) as Array<Record<string, any>>;
const ids = (c: Core): string[] => [...c.oncourse().attemptIds].map(String).sort();

describe('withdrawn stream finish, cp3-cross WX1_XT_26:25 (DERIVATIONS §4.1 "A finish the stream alone has stated is the stream\'s to withdraw"; code item 2; P7)', () => {
  const A = 'WX1_XT_26:25';
  const day = { WX1_XT_26: '2026-04-26' };
  const changedAfter = new Date(Date.parse(R19.xtXml.observedAt) - 5000).toISOString();
  const statusOf = (c: Core) => field(c, A, 'status');

  it('the recorded listings are what the test says: start, start deleted, finish with no start and no Time, listing without it', () => {
    expect(attrOf(R19.xt1.data, 'Result', 'dtStart')).not.toBe('');
    expect([R19.xt2, R19.xt3, R19.xt4].map((r) => attrOf(r.data, 'Result', 'dtStart'))).toEqual(['', '', '']);
    expect(attrOf(R19.xt3.data, 'Result', 'dtFinish')).not.toBe('');
    expect(attrOf(R19.xt4.data, 'Result', 'dtFinish')).toBe('');
    expect(R19.xtXml.data).toMatch(/<Status>DNS<\/Status>/);
    const row25 = /<Row Number="\d+"><Participant Bib="\s*25"[\s\S]*?<\/Row>/.exec(R19.xtRow.data)?.[0] ?? '';
    expect(attrOf(row25, 'Result', 'IRM')).toBe('DNS');
  });

  it('real cp3-cross: status at each listing is the listing\'s: on-course, at-start (start deleted), finished (finish impulse, no start), at-start (withdrawn), with no diagnostic', () => {
    const core = coreWith([connected(R19.xt1.observedAt)]);
    const seen: unknown[] = [];
    for (const r of [R19.xt1, R19.xt2, R19.xt3, R19.xt4]) {
      core.applyUnit(tcpUnit(r, day));
      seen.push(statusOf(core).value);
    }
    expect(seen).toEqual(['on-course', 'at-start', 'finished', 'at-start']);
    expect(field(core, A, 'outcome')).toEqual({ state: 'not-yet' }); // the withdrawn finish and its inference are forgotten
    expect(core.diagnostics()).toEqual([]);
  });

  it('real cp3-cross: the XML DNS of 07:30:19 applies to the at-start (rule 2 exception, two minutes before TCP\'s row), and TCP\'s own DNS row of 07:32:17 then takes over from tcp', () => {
    const core = coreWith([connected(R19.xt1.observedAt), ...[R19.xt1, R19.xt2, R19.xt3, R19.xt4].map((r) => tcpUnit(r, day))]);
    core.applyUnit(xmlUnit(R19.xtXml, day, changedAfter));
    expect(statusOf(core)).toMatchObject({ state: 'known', value: 'dns', source: 'xml' });
    core.applyUnit(tcpUnit(R19.xtRow, day));
    expect(statusOf(core)).toMatchObject({ state: 'known', value: 'dns', source: 'tcp' });
    expect(core.diagnostics()).toEqual([]);
  });

  it('vector xml-mark-does-not-override-tcp-finish stands: with the finish still listed (no withdrawing listing yet) the XML DNS is refused', () => {
    const core = coreWith([connected(R19.xt1.observedAt), ...[R19.xt1, R19.xt2, R19.xt3].map((r) => tcpUnit(r, day))]);
    core.applyUnit(xmlUnit(R19.xtXml, day, changedAfter));
    expect(statusOf(core)).toMatchObject({ value: 'finished' });
  });
});

describe('the leave rule at a message ending a silence (DERIVATIONS §4.1 "Stated as one evaluation", code item 3; vector contradiction-oncourse-running-again)', () => {
  const day = { WX1J_XS_26_JUN: '2026-04-26' };
  const heat = ['1', '4', '5', '8'].map((b) => `WX1J_XS_26_JUN:${b}`).sort();
  const listed = (): Unit[] => [connected(R19.st1.observedAt), ...[R19.st1, R19.st4, R19.st5, R19.st8].map((r) => tcpUnit(r, day))];

  it('the recorded stall: the heat is listed, the next TCP message arrives 10.7 s later (cp3-cross 09:18:38Z)', () => {
    expect(Date.parse(R19.stEnd1.observedAt) - Date.parse(R19.st8.observedAt)).toBeGreaterThan(10000);
    expect(ids(coreWith(listed()))).toEqual(heat);
  });

  it('real cp3-cross: at the message that ends the silence nothing leaves (it lists bib 1 only; bibs 4, 5 and 8 are still on the set)', () => {
    const core = coreWith([...listed(), tcpUnit(R19.stEnd1, day)]);
    expect(ids(core)).toEqual(heat);
  });

  it('real cp3-cross: every listed Attempt counts from that message (the reset): 1.1 s later, a message that lists bib 1 alone still leaves 4, 5 and 8 on the set', () => {
    expect(Date.parse(R19.stNext1.observedAt) - Date.parse(R19.stEnd1.observedAt)).toBeLessThan(1500);
    const core = coreWith([...listed(), tcpUnit(R19.stEnd1, day), tcpUnit(R19.stNext1, day)]);
    expect(ids(core)).toEqual(heat);
  });
});

describe('INV-5 re-delivery after an outage regains precedence (CONTRACTS §4 INV-5, rule 2; code item 4; vector inv2-rule2-reconnect-redelivery-regains-precedence)', () => {
  const A = 'K1M_BR2_19:22';
  const day = { K1M_BR2_19: '2026-04-19' };
  const changedAfter = new Date(Date.parse(REC.j2Xml.observedAt) - 5000).toISOString();
  const tcpTotal = Number(attrOf(REC.j1Row.data, 'Result', 'Total'));
  const xmlTotal = Number(/<Total>(\d+)<\/Total>/.exec(REC.j2Xml.data)![1]) / 1000;
  const REDELIVERED_AT = '2026-04-19T08:39:00.000Z';
  const redelivery = () => derive(REC.j1Row, { observedAt: REDELIVERED_AT }); // upstream's rotation re-sends the identical table

  it('real jarni-ne-do: tcp 78.91, outage, XML 77.91 presented, reconnect, the rotation re-sends the identical TCP row -> presented from tcp again with the re-delivery\'s observedAt, one attempt.updated', () => {
    const core = coreWith([connected(REC.j1Row.observedAt), tcpUnit(REC.j1Row, day), disconnected('2026-04-19T08:37:30.000Z'), xmlUnit(REC.j2Xml, day, changedAfter)]);
    expect(field(core, A, 'outcome')).toMatchObject({ source: 'xml', value: { totalSeconds: xmlTotal } });
    core.applyUnit(connected('2026-04-19T08:38:30.000Z'));
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(redelivery(), day));
    expect(field(core, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp', observedAt: REDELIVERED_AT, value: { kind: 'duration', totalSeconds: tcpTotal } });
    const m = msgs(core, n, 'attempt.updated').filter((x) => x['attemptId'] === A);
    expect(m).toHaveLength(1);
    expect(m[0]!['fields']).toHaveProperty('outcome');
  });

  it('real jarni-ne-do: a re-delivery of a value already presented from that source changes nothing and sends nothing (INV-5 no-op, P9; the envelope keeps its observedAt)', () => {
    const core = coreWith([connected(REC.j1Row.observedAt), tcpUnit(REC.j1Row, day)]);
    const before = structuredClone(field(core, A, 'outcome'));
    const n = core.notifications().length;
    core.applyUnit(tcpUnit(redelivery(), day));
    expect(field(core, A, 'outcome')).toEqual(before);
    expect(field(core, A, 'outcome').observedAt).toBe(REC.j1Row.observedAt);
    expect(msgs(core, n, 'attempt.updated').filter((x) => x['attemptId'] === A)).toEqual([]);
  });
});

describe('WriteRequest echo (DERIVATIONS §6, code item 5; vectors operator-write-*)', () => {
  const A = 'K1M_BR1_6:9';
  const T0 = '2026-09-15T14:00:00.000Z';
  const W = '2026-09-15T14:02:11.000Z';
  let seq = 0;
  const cells = (c3: number, c4: number, c5: number) => [{ number: 3, penalty: c3 }, { number: 4, penalty: c4 }, { number: 5, penalty: c5 }];
  const row = (source: 'tcp' | 'xml', observedAt: string, value: unknown): GivenElement => ({ ingestSeq: ++seq, attemptId: A, field: 'gates', source, kind: 'result-row', observedAt, value, confidence: 'authoritative', judgingComplete: true, run: 1 });
  const write: GivenElement = { ingestSeq: 99, attemptId: A, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: W, value: [{ number: 4, penalty: 2 }], confidence: 'authoritative', run: 1 };
  const rewrite = (observedAt: string, changedAfter: string | null): GivenElement => ({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt, changedAfter });
  const status = (c: Core): unknown => (c.writeRequest() as { status?: string } | undefined)?.status;
  const fresh = (): Core => createMergeCore({ attemptId: A }) as unknown as Core;
  const submitted = (): Core => {
    const c = fresh();
    c.applyUnit([row('tcp', T0, cells(0, 0, 0))]);
    c.applyUnit([write]);
    return c;
  };

  it('vector operator-write-confirmed-by-matching-echo: a pending write is the starting point', () => {
    expect(status(submitted())).toBe('pending');
  });

  it('obligation DERIVATIONS §6 target cell: a re-push in which only another cell moved is no echo; the write stays pending', () => {
    const c = submitted();
    c.applyUnit([row('tcp', '2026-09-15T14:02:12.000Z', cells(0, 0, 2))]);
    expect(status(c)).toBe('pending');
  });

  it('obligation DERIVATIONS §6 target cell: the echo is the target cell alone, whatever the other cells hold: gate 4 penalty 2 in a three-cell row confirms', () => {
    const c = submitted();
    c.applyUnit([row('tcp', '2026-09-15T14:02:12.000Z', cells(0, 0, 2))]);
    c.applyUnit([row('tcp', '2026-09-15T14:02:13.000Z', cells(0, 2, 2))]);
    expect(status(c)).toBe('confirmed');
  });

  it('vector operator-write-mismatched-echo-wins: the target cell arrives unequal (gate 4 penalty 50) -> mismatched, the cell presented', () => {
    const c = submitted();
    c.applyUnit([row('tcp', '2026-09-15T14:02:12.000Z', cells(0, 50, 0))]);
    expect(status(c)).toBe('mismatched');
    expect((field(c, A, 'gates').value as Array<{ number: number; penalty: number }>).find((g) => g.number === 4)?.penalty).toBe(50);
  });

  it('obligation DERIVATIONS §6 xml age guard: an XML save whose content age is not later than submittedAt settles nothing (neither confirmed nor mismatched)', () => {
    const c = submitted();
    c.applyUnit([rewrite('2026-09-15T14:02:20.000Z', '2026-09-15T14:02:05.000Z'), row('xml', '2026-09-15T14:02:20.000Z', cells(0, 0, 0))]);
    expect(status(c)).toBe('pending');
    c.applyUnit([rewrite('2026-09-15T14:02:25.000Z', '2026-09-15T14:02:05.000Z'), row('xml', '2026-09-15T14:02:25.000Z', cells(0, 2, 0))]);
    expect(status(c)).toBe('pending');
  });

  it('obligation DERIVATIONS §6 xml age guard: an XML save written after the correction (changedAfter later than submittedAt) carrying the requested cell confirms', () => {
    const c = submitted();
    c.applyUnit([rewrite('2026-09-15T14:02:40.000Z', '2026-09-15T14:02:30.000Z'), row('xml', '2026-09-15T14:02:40.000Z', cells(0, 2, 0))]);
    expect(status(c)).toBe('confirmed');
  });
});

describe('Course refresh by stripped layout (DERIVATIONS §2.3, CONTRACTS §2.12; code items 6 and 10; jarni-so-odp 14:42 to 14:46)', () => {
  const day = { C1M_BR2_18: '2026-04-18' };
  const noBound = { boundCourseId: undefined }; // the caller of the core has no running Phase to name (the parser ctx is not the core's)
  const xml = (): Unit => xmlUnit(R19.rcXml, day, new Date(Date.parse(R19.rcXml.observedAt) - 5000).toISOString(), noBound);
  const tcp = (r: typeof R19.rc19): Unit => tcpUnit(r, day, noBound);
  const captionsOf = (r: typeof R19.rc19): string[] => attrOf(r.data, 'RaceConfig', 'GateCaptions').split(',');
  const courseMsgs = (c: Core, from: number, id: string) => msgs(c, from, 'course.updated').filter((m) => m['course']?.courseId === id);
  const lastCourse = (c: Core, id: string): any => courseMsgs(c, 0, id).at(-1)?.['course'];

  it('the recorded RaceConfigs: 19 gates until 14:45:11Z, then 18 gates; each equals one XML course layout with the S markers removed', () => {
    const layouts = [...R19.rcXml.data.matchAll(/<CourseNr>(\d)<\/CourseNr>\s*<CourseConfig>([A-Z]*)<\/CourseConfig>/g)].map((m) => [m[1], m[2]!.replace(/S/g, '')]);
    expect(layouts).toContainEqual(['1', attrOf(R19.rc19.data, 'RaceConfig', 'GateConfig')]);
    expect(layouts).toContainEqual(['2', attrOf(R19.rc18.data, 'RaceConfig', 'GateConfig')]);
    expect(attrOf(R19.rc19.data, 'RaceConfig', 'NrGates')).toBe('19');
    expect(attrOf(R19.rc18.data, 'RaceConfig', 'NrGates')).toBe('18');
  });

  it('real jarni-so-odp: the 19-gate RaceConfig refreshes the captions of course 1 only, with no Phase bound', () => {
    const core = coreWith([xml()]);
    const n = core.notifications().length;
    core.applyUnit(tcp(R19.rc19));
    expect(courseMsgs(core, n, '2')).toEqual([]);
    expect(lastCourse(core, '1').captions).toMatchObject({ state: 'known', value: captionsOf(R19.rc19), source: 'tcp' });
  });

  it('real jarni-so-odp: the switch to the 18-gate string refreshes course 2 and leaves course 1 as it was (19 gates, its own captions)', () => {
    const core = coreWith([xml(), tcp(R19.rc19)]);
    const course1 = structuredClone(lastCourse(core, '1'));
    const n = core.notifications().length;
    core.applyUnit(tcp(R19.rc18));
    expect(lastCourse(core, '2').captions).toMatchObject({ state: 'known', value: captionsOf(R19.rc18), source: 'tcp' });
    expect(courseMsgs(core, n, '1')).toEqual([]);
    expect(lastCourse(core, '1')).toEqual(course1);
    expect(lastCourse(core, '1').gates.value).toHaveLength(19);
    expect(lastCourse(core, '1').captions.value).toEqual(captionsOf(R19.rc19));
  });

  it('a gate string equal to no stripped layout refreshes nothing', () => {
    const odd = derive(R19.rc18, { edit: (d) => d.replace(/GateConfig="[A-Z]*"/, 'GateConfig="NNNNRNRNNRNNRRNRNR"') });
    const core = coreWith([xml(), tcp(R19.rc19)]);
    const n = core.notifications().length;
    core.applyUnit(tcp(odd));
    expect(msgs(core, n, 'course.updated')).toEqual([]);
  });

  it('a fabricated RaceConfig (NrGates 30 for a 19-gate string) names no Phase and decides no not-configured: course 1 keeps its gates', () => {
    const fabricated = derive(R19.rc19, { edit: (d) => d.replace('NrGates="19"', 'NrGates="30"') });
    const core = coreWith([xml(), tcp(fabricated)]);
    expect(lastCourse(core, '1').gates).toMatchObject({ state: 'known' });
    expect(lastCourse(core, '1').gates.value).toHaveLength(19);
    expect((core.diagnostics() as Array<{ kind: string }>).filter((d) => d.kind === 'not-configured')).toEqual([]);
  });

  it('(derived: course 2 given course 1\'s layout) two courses with equal stripped layouts are both refreshed', () => {
    const c1 = /<CourseNr>1<\/CourseNr>\s*<CourseConfig>([A-Z]*)<\/CourseConfig>/.exec(R19.rcXml.data)![1]!;
    const twin = derive(R19.rcXml, { edit: (d) => d.replace(/(<CourseNr>2<\/CourseNr>\s*<CourseConfig>)[A-Z]*(<\/CourseConfig>)/, `$1${c1}$2`) });
    const core = coreWith([xmlUnit(twin, day, new Date(Date.parse(twin.observedAt) - 5000).toISOString(), noBound)]);
    core.applyUnit(tcp(R19.rc19));
    for (const id of ['1', '2']) expect(lastCourse(core, id).captions, id).toMatchObject({ state: 'known', value: captionsOf(R19.rc19) });
  });
});

describe('inferred Phase date (DERIVATIONS §2.1 "date", code item 7)', () => {
  const phase = 'C1M_BR2_18';
  // the Phase's date as the core presents it: a plain string or an Observed; 'not-yet' when it states none
  const dateOf = (c: Core): unknown => {
    const v = c.phase(phase)['date'] as unknown;
    if (v === undefined) return 'not-yet';
    if (typeof v === 'string') return v;
    const o = v as { state?: string; value?: unknown };
    return o.state === 'known' ? o.value : 'not-yet';
  };
  // received 22:30Z on 18 April = 00:30 on 19 April in the venue's zone (CEST)
  const lateNight = derive(R19.c4Start, { observedAt: '2026-04-18T22:30:00.000Z' });
  const noDates = (r: typeof lateNight) => tcpUnit(r, {});

  it('with a zone the date is the first observation\'s date read in that zone (2026-04-19), inferred, not the UTC date', () => {
    const core = coreWith([connected(lateNight.observedAt), noDates(lateNight)], { zone: 'Europe/Prague' });
    expect(dateOf(core)).toBe('2026-04-19');
  });

  it('in the afternoon the zone and UTC agree (2026-04-18), the control for the case above', () => {
    const noon = derive(R19.c4Start, { observedAt: '2026-04-18T12:00:00.000Z' });
    const core = coreWith([connected(noon.observedAt), noDates(noon)], { zone: 'Europe/Prague' });
    expect(dateOf(core)).toBe('2026-04-18');
  });

  it('with no zone configured nothing is inferred: date stays not-yet until the snapshot states it', () => {
    const core = coreWith([connected(lateNight.observedAt), noDates(lateNight)]);
    expect(dateOf(core)).toBe('not-yet');
  });
});

describe('re-baseline is one unit (CONTRACTS §4 re-baseline; code item 8)', () => {
  const A = 'K1M_BR2_19:22';
  const day = { K1M_BR2_19: '2026-04-19' };
  const changedAfter = new Date(Date.parse(REC.j2Xml.observedAt) - 5000).toISOString();
  const tcpTotal = Number(attrOf(REC.j1Row.data, 'Result', 'Total'));
  const xmlTotal = Number(/<Total>(\d+)<\/Total>/.exec(REC.j2Xml.data)![1]) / 1000;

  it('real jarni-ne-do: [rebaseline, xml-rewrite-detected, elements] applied as one unit discards the retained tcp value, presents the snapshot and sends one scope.replaced', () => {
    const core = coreWith([connected(REC.j1Row.observedAt), tcpUnit(REC.j1Row, day)]);
    expect(field(core, A, 'outcome')).toMatchObject({ source: 'tcp', value: { totalSeconds: tcpTotal } });
    const n = core.notifications().length;
    const rebaseline: GivenElement = { ingestSeq: 0, event: 'rebaseline', observedAt: REC.j2Xml.observedAt, scope: { kind: 'phase', phaseId: 'K1M_BR2_19' } };
    core.applyUnit([rebaseline, ...xmlUnit(REC.j2Xml, day, changedAfter)]);
    expect(field(core, A, 'outcome')).toMatchObject({ source: 'xml', value: { totalSeconds: xmlTotal } });
    expect(msgs(core, n, 'scope.replaced')).toHaveLength(1);
    expect(msgs(core, n, 'scope.replaced')[0]!['scope']).toEqual({ kind: 'phase', phaseId: 'K1M_BR2_19' });
  });
});

describe('the core is told its Attempt, not left to guess (CONFORMANCE-VECTORS §1 "a keyless observation addresses context.attemptId"; adapter F5)', () => {
  const A = 'K1M_BR1_6:9';
  const keyless = (observedAt: string): GivenElement => ({ ingestSeq: 1, field: 'status', source: 'tcp', kind: 'inference', observedAt, value: 'on-course', confidence: 'authoritative' });

  it('option attemptId: a keyless observation addresses that Attempt from the first element', () => {
    const core = createMergeCore({ attemptId: A }) as unknown as Core;
    core.applyUnit([keyless('2026-09-15T10:14:02.083Z')]);
    expect(core.attempts().map(String)).toEqual([A]);
    expect(field(core, A, 'status')).toMatchObject({ state: 'known', value: 'on-course' });
  });

  it('option attemptId: an element that names another Attempt does not rename the keyless one (no "first stated name names it")', () => {
    const core = createMergeCore({ attemptId: A }) as unknown as Core;
    core.applyUnit([keyless('2026-09-15T10:14:02.083Z')]);
    core.applyUnit([{ ingestSeq: 2, attemptId: 'K1M_BR1_6:10', field: 'status', source: 'tcp', kind: 'inference', observedAt: '2026-09-15T10:14:03.000Z', value: 'at-start', confidence: 'authoritative' }]);
    expect(core.attempts().map(String).sort()).toEqual([A, 'K1M_BR1_6:10']);
    expect(field(core, A, 'status')).toMatchObject({ value: 'on-course' });
    expect(field(core, 'K1M_BR1_6:10', 'status')).toMatchObject({ value: 'at-start' });
  });
});
