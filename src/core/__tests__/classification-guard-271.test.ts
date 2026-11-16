import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 CQ5 (DERIVATIONS §4.10: an `xml` snapshot replaces rows a `tcp` snapshot has stated only when its `changedAfter` is later than the `observedAt` of the
// latest `tcp` delivery of those rows: a `tcp` snapshot that built them, or one that re-delivered them equal after an `xml` snapshot built them; CONTRACTS §4
// INV-2c, INV-5; TEST-ARCHITECTURE property 15). Channel: the classification Phase's scope snapshots, both sources. Own core and stream per test.

type Std = { standingKey: string; entries: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const CP = 'MX1_XER_26';
const KEY = `classification:${CP}/all`;
const el = (e: unknown): GivenElement => e as GivenElement;
const row = (entryId: string, rank: number) => ({ entryId, bib: entryId, rank, order: rank, decidedIn: null });
const pushes = (c: Core, from = 0): Std[] => c.notifications().slice(from).filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === KEY);
const entryIds = (s: Std): string[] => s.entries.map((e) => e['entryId']);

function stream() {
  let seq = 0;
  const n = (): number => ++seq;
  const snap = (source: 'tcp' | 'xml', t: number, rows: unknown[]): GivenElement => el({ ingestSeq: n(), observedAt: at(t), snapshot: { source, phaseId: CP, mode: 'results', rows } });
  return {
    tcp: (t: number, rows: unknown[]): Unit => [snap('tcp', t, rows)],
    xml: (t: number, ageAt: number, rows: unknown[]): Unit => [el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(ageAt) }), snap('xml', t, rows)],
  };
}

describe('#271 CQ5: the guard compares with the latest tcp delivery of the rows, an equal re-delivery after an XML build included (DERIVATIONS §4.10)', () => {
  const build = () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [row('A', 1), row('B', 2)]));
    c.applyUnit(s.tcp(200, [row('A', 1), row('B', 2)])); // TCP re-delivers the XML-built rows equal at 200
    return { s, c };
  };

  it('§4.10: XML built the rows, TCP re-delivered them equal at 200, an XML with other rows and content age 150 is refused: nothing pushed, the rows presented unchanged', () => {
    const { s, c } = build();
    expect(pushes(c), 'precondition: one push, the XML build (the equal re-delivery pushed nothing)').toHaveLength(1);
    const m = c.notifications().length;
    c.applyUnit(s.xml(210, 150, [row('C', 1), row('D', 2)])); // 150 is after the XML build (95), before the tcp delivery (200)
    expect(pushes(c, m), 'refused: no push').toHaveLength(0);
    expect(entryIds(pushes(c).at(-1)!), 'the presented rows are the old ones').toEqual(['A', 'B']);
    const presented = c.standings().find((x) => x.standingKey === KEY)!;
    expect(presented.entries.map((e: any) => e.entryId)).toEqual(['A', 'B']);
  });

  it('§4.10 (control): the same stream with the XML\'s content age 250, later than the delivery at 200, is admitted: one push with the new rows', () => {
    const { s, c } = build();
    const m = c.notifications().length;
    c.applyUnit(s.xml(260, 250, [row('C', 1), row('D', 2)]));
    const p = pushes(c, m);
    expect(p).toHaveLength(1);
    expect(entryIds(p[0]!)).toEqual(['C', 'D']);
  });

  it('§4.10 (boundary): a content age equal to the latest tcp delivery is not later, so it is refused', () => {
    const { s, c } = build();
    const m = c.notifications().length;
    c.applyUnit(s.xml(210, 200, [row('C', 1), row('D', 2)]));
    expect(pushes(c, m)).toHaveLength(0);
    expect(entryIds(pushes(c).at(-1)!)).toEqual(['A', 'B']);
  });
});
