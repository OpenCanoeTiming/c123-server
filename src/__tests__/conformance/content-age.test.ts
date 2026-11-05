/**
 * Harness: content age resolved before applyUnit (CONFORMANCE-VECTORS §1 "Content age"; #253 row 18).
 * No core involved: a scripted port records the units the harness hands over.
 */
import { describe, it, expect } from 'vitest';
import { loadVectors, runVector, serverVectors, type Vector } from './run-vector.js';
import { newRecorder, scriptedPort } from './test-ports.js';
import type { GivenElement } from './port.js';

const A = 'K1M_BR1_6:9';
type El = Record<string, any>;

const tcpObs = (seq: number, at: string): El => ({ ingestSeq: seq, field: 'outcome', source: 'tcp', kind: 'result-row', observedAt: at, value: { kind: 'duration', totalSeconds: 85 }, confidence: 'authoritative' });
const xmlObs = (seq: number, at: string): El => ({ ...tcpObs(seq, at), source: 'xml' });
const NY = { outcome: { state: 'not-yet' } };
const rewrite = (seq: number, at: string, extra: El = {}): El => ({ ingestSeq: seq, event: 'xml-rewrite-detected', observedAt: at, ...extra });

function run(given: El[], context: El = {}, extra: Partial<Vector> = {}): GivenElement[][] {
  const rec = newRecorder();
  const v = { id: 'x', invariant: 'INV-2c', description: '', context: { attemptId: A, ...context }, given, expect: {}, ...extra } as unknown as Vector;
  runVector(v, scriptedPort({}, rec));
  return rec.units;
}

describe('harness content age (CONFORMANCE-VECTORS §1 "Content age", round 18)', () => {
  it('rule keyless-event-stamped: a keyless xml-rewrite-detected gets changedAfter = observedAt minus the default 5 s before applyUnit', () => {
    const units = run([rewrite(1, '2026-09-15T10:41:02.000Z'), xmlObs(2, '2026-09-15T10:41:02.000Z')]);
    expect((units[0]![0] as El).changedAfter).toBe('2026-09-15T10:40:57.000Z');
    expect(units[0]!.length).toBe(1);
  });

  it('rule keyless-event-stamped: context.xmlPollIntervalSeconds is used, fractional included', () => {
    const units = run([rewrite(1, '2026-09-15T10:41:02.000Z')], { xmlPollIntervalSeconds: 2.5 });
    expect((units[0]![0] as El).changedAfter).toBe('2026-09-15T10:40:59.500Z');
  });

  it('rule keyless-event-stamped: a time written with no zone stays so (retraction-xml-guard-rewrite-before-push notation)', () => {
    const units = run([rewrite(1, '2026-09-15T10:48:39.000')]);
    expect((units[0]![0] as El).changedAfter).toBe('2026-09-15T10:48:34.000');
  });

  it('rule changedAfter-present-untouched: an event carrying a timestamp or null reaches the core as written', () => {
    const units = run([
      rewrite(1, '2026-09-15T10:41:02.000Z', { changedAfter: null }),
      rewrite(2, '2026-09-15T10:41:12.000Z', { changedAfter: '2026-09-15T10:41:01.000Z' }),
    ]);
    expect(units[0]![0]).toHaveProperty('changedAfter', null);
    expect((units[1]![0] as El).changedAfter).toBe('2026-09-15T10:41:01.000Z');
  });

  it('rule no-preceding-event: a unit of xml observations with no earlier rewrite event gets a synthesised event at its head, observedAt minus the interval', () => {
    const units = run([tcpObs(1, '2026-09-15T10:41:00.000Z'), xmlObs(2, '2026-09-15T10:41:02.000Z'), xmlObs(3, '2026-09-15T10:41:02.000Z')]);
    expect(units.length).toBe(2);
    expect(units[0]!.length).toBe(1);
    const u = units[1]! as El[];
    expect(u.length).toBe(3);
    expect(u[0]!.event).toBe('xml-rewrite-detected');
    expect(u[0]!.observedAt).toBe('2026-09-15T10:41:02.000Z');
    expect(u[0]!.changedAfter).toBe('2026-09-15T10:40:57.000Z');
    expect(u.slice(1).map((e) => e.ingestSeq)).toEqual([2, 3]);
    expect(u.slice(1).every((e) => 'field' in e)).toBe(true);
  });

  it('rule no-preceding-event: an xml snapshot with no earlier event gets the same head event', () => {
    const snap: El = { ingestSeq: 1, snapshot: { source: 'xml', phaseId: 'K1M_BR1_6', mode: 'results', rows: [] }, observedAt: '2026-09-15T10:41:02.000Z' };
    const units = run([snap]);
    expect(units[0]!.length).toBe(2);
    expect((units[0]![0] as El).event).toBe('xml-rewrite-detected');
    expect((units[0]![0] as El).changedAfter).toBe('2026-09-15T10:40:57.000Z');
    expect(units[0]![1]).toMatchObject({ ingestSeq: 1 });
  });

  it('rule no-preceding-event: no synthesis for tcp elements, or for an xml element after a rewrite event', () => {
    const tcpOnly = run([tcpObs(1, '2026-09-15T10:41:00.000Z'), tcpObs(2, '2026-09-15T10:41:30.000Z')]);
    expect(tcpOnly.flat().some((e) => 'event' in e)).toBe(false);
    const withEvent = run([rewrite(1, '2026-09-15T10:41:02.000Z'), xmlObs(2, '2026-09-15T10:41:02.000Z')]);
    expect(withEvent.flat().filter((e) => 'event' in e).length).toBe(1);
  });

  it('rule outside-the-index-span: a synthesised event moves no afterGivenIndex; a step after given[1] still sees both units applied', () => {
    const seen: number[] = [];
    const rec = newRecorder();
    const v = {
      id: 'x', invariant: 'INV-2c', description: '', context: { attemptId: A },
      given: [tcpObs(1, '2026-09-15T10:41:00.000Z'), xmlObs(2, '2026-09-15T10:41:02.000Z')],
      expectSequence: [{ afterGivenIndex: 0, expect: NY }, { afterGivenIndex: 1, expect: NY }],
      expect: NY,
    } as unknown as Vector;
    const port = scriptedPort({ presented: { [A]: { outcome: { state: 'not-yet' } } } }, rec, {});
    const inner = port.createMergePort.bind(port);
    port.createMergePort = (c) => {
      const m = inner(c);
      const read = m.presented.bind(m);
      m.presented = (id) => { seen.push(rec.units.length); return read(id); };
      return m;
    };
    runVector(v, port);
    expect(rec.units.length).toBe(2);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => n === 1 || n === 2)).toBe(true);
    expect(seen[0]).toBe(1); // after given[0]: only the tcp unit applied, the synthesised event is not an index
  });

  it('rule then-is-resolved-too: a keyless event in then is stamped like one in given', () => {
    const units = run([tcpObs(1, '2026-09-15T10:41:00.000Z')], {}, { then: [rewrite(2, '2026-09-15T10:41:37.000Z'), xmlObs(3, '2026-09-15T10:41:37.000Z')] as any });
    expect((units[1]![0] as El).changedAfter).toBe('2026-09-15T10:41:32.000Z');
  });

  it('rule same-age-as-before (all server merge vectors): every xml element is preceded by an event carrying changedAfter, and the age equals the old rule', () => {
    const interval = (v: Vector) => (typeof v.context?.xmlPollIntervalSeconds === 'number' ? v.context.xmlPollIntervalSeconds : 5) * 1000;
    const parse = (t: string) => Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(t) ? t : `${t}Z`);
    let xmlElements = 0;
    for (const v of serverVectors().filter((x) => Array.isArray(x.given))) {
      const rec = newRecorder();
      // expectations are not the point: strip them so every unit, then included, is applied
      runVector({ ...v, expect: {}, expectSequence: [] } as Vector, scriptedPort({}, rec));
      const input = [...(v.given as El[]), ...((v.then ?? []) as El[])];
      let oldAge: number | null | undefined; // the old rule, from the vector as written
      const old: Array<number | null> = [];
      for (const e of input) {
        if (e.event === 'xml-rewrite-detected') oldAge = 'changedAfter' in e ? (e.changedAfter === null ? null : parse(e.changedAfter)) : parse(e.observedAt) - interval(v);
        else if ((e.field && e.source === 'xml') || e.snapshot?.source === 'xml') old.push(oldAge === undefined ? parse(e.observedAt) - interval(v) : oldAge);
      }
      let current: number | null | undefined;
      const got: Array<number | null> = [];
      for (const e of rec.units.flat() as El[]) {
        if (e.event === 'xml-rewrite-detected') {
          expect('changedAfter' in e, `${v.id}: event without changedAfter reached the core`).toBe(true);
          current = e.changedAfter === null ? null : parse(e.changedAfter);
        } else if ((e.field && e.source === 'xml') || e.snapshot?.source === 'xml') {
          expect(current, `${v.id}: xml element with no preceding event`).not.toBeUndefined();
          got.push(current!);
        }
      }
      expect(got, v.id).toEqual(old);
      xmlElements += got.length;
    }
    expect(xmlElements).toBeGreaterThan(0);
  });
});

describe('vector inv2c-first-read-unknown-age-refused (CONFORMANCE-VECTORS round-18 note; #253 row 19)', () => {
  const v = loadVectors().find((x) => x.id === 'inv2c-first-read-unknown-age-refused');
  it('exists, is a server vector, and is in the ledger', () => {
    expect(v).toBeDefined();
    expect(serverVectors().map((x) => x.id)).toContain('inv2c-first-read-unknown-age-refused');
  });

  it('shape: tcp results for A and C, a disconnect, a changedAfter-null rewrite whose snapshot differs for A, empties C and fills B; then a rewrite after the outage repeating A', () => {
    const g = v!.given as El[];
    expect(g[0]!.snapshot.source).toBe('tcp');
    const tcpBibs = g[0]!.snapshot.rows.filter((r: El) => r.outcome).map((r: El) => r.bib);
    expect(tcpBibs.length).toBe(2);
    expect(g[1]!.event).toBe('tcp-disconnected');
    expect(g[2]).toHaveProperty('changedAfter', null);
    const rows = g[3]!.snapshot.rows as El[];
    const byBib = (b: string) => rows.find((r) => r.bib === b)!;
    const [a, c] = tcpBibs;
    const b = rows.map((r) => r.bib).find((x) => !tcpBibs.includes(x))!;
    expect(byBib(a).outcome.totalSeconds).not.toBe(g[0]!.snapshot.rows.find((r: El) => r.bib === a).outcome.totalSeconds);
    expect(byBib(c).outcome).toBeUndefined();
    expect(byBib(b).outcome).toBeDefined();
    const t = v!.then as El[];
    expect(t[0]!.changedAfter).toBeTruthy();
    expect(Date.parse(t[0]!.changedAfter)).toBeGreaterThan(Date.parse(g[1]!.observedAt));
    expect((t[1]!.snapshot.rows as El[]).find((r) => r.bib === a)!.outcome).toEqual(byBib(a).outcome);
  });
});
