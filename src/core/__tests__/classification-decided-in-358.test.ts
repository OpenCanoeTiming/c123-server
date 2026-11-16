import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #358 CQ-A and CQ-B (DERIVATIONS §10 item 52, §4.10 "decidedIn"; TEST-ARCHITECTURE property 15). Channel: the classification Phase's scope snapshots (XML and
// TCP) and the operator re-baseline unit. Every test builds its own core and stream.

type Std = { standingKey: string; entries: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const CP = 'MX1_XER_26';
const KEY = `classification:${CP}/all`;
const el = (e: unknown): GivenElement => e as GivenElement;
const row = (entryId: string, rank: number, decidedIn: string | null = null) => ({ entryId, bib: entryId, rank, order: rank, decidedIn });
/** The Standing as presented now (a re-baseline carries it in scope.replaced, not in a standing.updated). */
const last = (c: Core): Std => c.standings().find((s) => s.standingKey === KEY) as unknown as Std;
const decided = (s: Std): Record<string, unknown> => Object.fromEntries(s.entries.map((e) => [e['entryId'], e['decidedIn']]));

function stream() {
  let seq = 0;
  const n = (): number => ++seq;
  const snap = (source: 'tcp' | 'xml', t: number, rows: unknown[], mode: 'results' | 'start-list' = rows.length > 0 ? 'results' : 'start-list'): GivenElement =>
    el({ ingestSeq: n(), observedAt: at(t), snapshot: { source, phaseId: CP, mode, rows } });
  const rewrite = (t: number, ageAt: number): GivenElement => el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(ageAt) });
  return {
    tcp: (t: number, rows: unknown[]): Unit => [snap('tcp', t, rows)],
    xml: (t: number, ageAt: number, rows: unknown[]): Unit => [rewrite(t, ageAt), snap('xml', t, rows)],
    rebase: (t: number, ageAt: number, rows: unknown[]): Unit => [el({ ingestSeq: n(), event: 'rebaseline', observedAt: at(t), scope: { kind: 'phase', phaseId: CP } }), rewrite(t, ageAt), snap('xml', t, rows)],
  };
}

describe('#358 CQ-A: the kept decidedIn is the latest admitted XML snapshot\'s, replaced whole (DERIVATIONS item 52 (a))', () => {
  it('item 52 (a): an entry the latest admitted XML omits reads null on a later TCP row; the entry it states keeps its value', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F'), row('B', 2, 'SF')]));
    expect(decided(last(c)), 'precondition: after the first XML A is F').toEqual({ A: 'F', B: 'SF' });
    c.applyUnit(s.xml(200, 195, [row('B', 1, 'SF')]));
    expect(decided(last(c)), 'precondition: the second XML was admitted and omits A').toEqual({ B: 'SF' });
    c.applyUnit(s.tcp(300, [row('A', 1), row('B', 2)]));
    const now = last(c);
    expect(now.entries.map((e) => e['entryId']), 'precondition: the TCP build lists both').toEqual(['A', 'B']);
    expect(decided(now)).toEqual({ A: null, B: 'SF' });
  });

  it('item 52 (a): an admitted XML that states the entry again states it anew (A:F, then A:SF, TCP: SF), and an emptied XML table replaces nothing (A keeps F)', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.xml(150, 145, []));
    c.applyUnit(s.tcp(200, [row('A', 1)]));
    expect(decided(last(c)), 'an emptied table is no retraction of the kept values').toEqual({ A: 'F' });
    c.applyUnit(s.xml(300, 295, [row('A', 1, 'SF')]));
    c.applyUnit(s.tcp(400, [row('B', 1), row('A', 2)]));
    expect(decided(last(c))).toEqual({ B: null, A: 'SF' });
  });

  it('item 52 (a) with #271 N1: no XML omitted A (xml A:F, tcp [B], tcp [A,B]) still reads A F', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('B', 1)]));
    c.applyUnit(s.tcp(300, [row('A', 1), row('B', 2)]));
    expect(decided(last(c))).toEqual({ A: 'F', B: null });
  });

  it('item 52 (a) + INV-2c: a refused XML snapshot that omits A does not replace the kept values (A keeps F)', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F'), row('B', 2, 'SF')]));
    c.applyUnit(s.tcp(200, [row('B', 1), row('A', 2)])); // a tcp build with other ranks: the guard's own domain (the equal re-delivery is #271 CQ5's)
    const m = c.notifications().length;
    c.applyUnit(s.xml(210, 150, [row('B', 1, 'SF')])); // content age 150 is not later than the tcp delivery at 200: refused
    expect(c.notifications().slice(m).filter((x) => x.type === 'standing.updated'), 'precondition: refused').toHaveLength(0);
    c.applyUnit(s.tcp(300, [row('A', 1), row('B', 2)]));
    expect(decided(last(c))).toEqual({ A: 'F', B: 'SF' });
  });
});

describe('#358 CQ-B: a re-baseline keeps the classification rows and the kept decidedIn (DERIVATIONS item 52 (b); CONTRACTS §4 step 1, §7.2)', () => {
  const standingOf = (c: Core, from: number): Std => {
    const r = c.notifications().slice(from).filter((m) => m.type === 'scope.replaced');
    expect(r, 'one scope.replaced').toHaveLength(1);
    const st = (r[0]!['standings'] as Std[]).find((x) => x.standingKey === KEY);
    expect(st, 'the classification Standing is carried').toBeDefined();
    return st!;
  };

  it('item 52 (b): a re-baseline whose read holds an emptied classification table keeps the rows and A\'s decidedIn F, in scope.replaced and on the next TCP row', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('A', 1)]));
    const m = c.notifications().length;
    c.applyUnit(s.rebase(300, 295, []));
    const carried = standingOf(c, m);
    expect(carried.entries.map((e) => e['entryId'])).toEqual(['A']);
    expect(decided(carried)).toEqual({ A: 'F' });
    c.applyUnit(s.tcp(400, [row('B', 1), row('A', 2)]));
    expect(decided(last(c))).toEqual({ B: null, A: 'F' });
  });

  it('item 52 (b) + INV-2c: a re-baseline read older than the latest tcp delivery of the rows is refused: the rows and the kept decidedIn stay', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('A', 1), row('B', 2)])); // a tcp build with other rows (the guard's own domain)
    const m = c.notifications().length;
    c.applyUnit(s.rebase(300, 150, [row('A', 1, 'SF'), row('Z', 2, 'F')]));
    const carried = standingOf(c, m);
    expect(carried.entries.map((e) => e['entryId']), 'the refused read\'s rows are not presented').toEqual(['A', 'B']);
    expect(decided(carried)).toEqual({ A: 'F', B: null });
    c.applyUnit(s.tcp(400, [row('A', 1), row('B', 2), row('C', 3)]));
    expect(decided(last(c))).toEqual({ A: 'F', B: null, C: null });
  });

  it('item 52 (b): a re-baseline read that is admitted with A:SF replaces the rows and the kept decidedIn as any snapshot does', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('A', 1)]));
    const m = c.notifications().length;
    c.applyUnit(s.rebase(300, 295, [row('A', 1, 'SF')]));
    expect(decided(standingOf(c, m))).toEqual({ A: 'SF' });
    c.applyUnit(s.tcp(400, [row('A', 1)]));
    expect(decided(last(c))).toEqual({ A: 'SF' });
  });
});
