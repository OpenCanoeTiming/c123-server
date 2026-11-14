import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 N1: `decidedIn` kept per entryId across a TCP build that drops the entry (DERIVATIONS 4.10; TEST-ARCHITECTURE 3.2 property 15; CONTRACTS 2.7, 5).
// Hand streams in the element shape of the vectors; every test builds its own core and counter; times are offsets from kit.ts BASE (no real clock).

type Std = { standingKey: string; entries: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const CP = 'MX1_XER_26';
const CKEY = `classification:${CP}/all`;
const el = (e: unknown): GivenElement => e as GivenElement;
const keyed = (c: Core): Std[] => c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === CKEY);
const decided = (s: Std): Record<string, unknown> => Object.fromEntries(s.entries.map((e) => [e['entryId'], e['decidedIn']]));
const row = (entryId: string, rank: number, decidedIn: string | null = null) => ({ entryId, bib: entryId, rank, order: rank, decidedIn });

function cls() {
  let seq = 0;
  const n = (): number => ++seq;
  const snap = (source: 'tcp' | 'xml', t: number, rows: unknown[]): GivenElement => el({ ingestSeq: n(), observedAt: at(t), snapshot: { source, phaseId: CP, mode: 'results', rows } });
  return {
    tcp: (t: number, rows: unknown[]): Unit => [snap('tcp', t, rows)],
    xml: (t: number, changedAfter: number, rows: unknown[]): Unit => [el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(changedAfter) }), snap('xml', t, rows)],
  };
}

describe('#271 N1: decidedIn kept per entryId (DERIVATIONS 4.10, property 15)', () => {
  it('DERIVATIONS §4.10: decidedIn survives a TCP build that drops the entry (xml A:F, tcp [B], tcp [A,B])', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('B', 1)]));
    c.applyUnit(s.tcp(300, [row('A', 1), row('B', 2)]));
    const last = keyed(c).at(-1)!;
    expect(last.entries.map((e) => e['entryId'])).toEqual(['A', 'B']);
    expect(decided(last)).toEqual({ A: 'F', B: null });
  });

  it('DERIVATIONS §4.10: the kept decidedIn is the last admitted XML row\'s', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.xml(200, 195, [row('A', 1, 'SF')]));
    c.applyUnit(s.tcp(300, [row('B', 1)]));
    c.applyUnit(s.tcp(400, [row('A', 1), row('B', 2)]));
    expect(decided(keyed(c).at(-1)!)).toEqual({ A: 'SF', B: null });
  });

  it('DERIVATIONS §4.10 + INV-2c: a refused XML snapshot does not move the kept decidedIn', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('A', 1), row('B', 2)]));
    expect(decided(keyed(c).at(-1)!)).toEqual({ A: 'F', B: null });
    const m = c.notifications().length;
    c.applyUnit(s.xml(210, 150, [row('A', 1, 'SF')])); // content age 150 s not later than the tcp delivery at 200 s: refused
    expect(c.notifications().slice(m).filter((x) => x.type === 'standing.updated')).toHaveLength(0);
    c.applyUnit(s.tcp(300, [row('B', 1)]));
    c.applyUnit(s.tcp(400, [row('A', 1), row('B', 2)]));
    expect(decided(keyed(c).at(-1)!)).toEqual({ A: 'F', B: null });
  });

  it('DERIVATIONS §4.10: an entry no admitted XML row has stated keeps decidedIn null', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1, 'F')]));
    c.applyUnit(s.tcp(200, [row('A', 1), row('C', 2)]));
    expect(decided(keyed(c).at(-1)!)).toEqual({ A: 'F', C: null });
  });
});
