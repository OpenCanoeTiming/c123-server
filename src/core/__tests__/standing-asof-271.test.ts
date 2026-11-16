import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 N2 (CONTRACTS §5 step 1 "asOf" and §7.2 `scope.replaced`; TEST-ARCHITECTURE property 15): `asOf` is the ingest time of the latest observation that
// changed the Standing as serialised. A re-baseline's `scope.replaced` carries each Standing with its own asOf: the re-baseline's time only where the
// re-read changed it. Channel: the XML snapshot of the Phase (rows, categories); the operator re-baseline event.

type Std = { standingKey: string; asOf: string; entries: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const P = 'K1M_BR1_6';
const el = (e: unknown): GivenElement => e as GivenElement;
const duration = (t: number) => ({ kind: 'duration', runSeconds: t, penaltySeconds: 0, totalSeconds: t });
const erow = (bib: string, rank: number, total: number) => ({ bib, entry: { entryId: `E${bib}` }, outcome: duration(total), placement: { rank, order: rank }, judgingComplete: true });

function stream() {
  let seq = 0;
  const n = (): number => ++seq;
  const category = (t: number, entryId: string, value: string) => el({ ingestSeq: n(), entryId, field: 'ageCategoryId', source: 'xml', kind: 'result-row', observedAt: at(t), value, confidence: 'authoritative' });
  const snap = (t: number, rows: unknown[]) => el({ ingestSeq: n(), observedAt: at(t), snapshot: { source: 'xml', phaseId: P, mode: 'results', rows } });
  const rewrite = (t: number, ageAt: number) => el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(ageAt) });
  return {
    xml: (t: number, ageAt: number, rows: unknown[]): Unit => [rewrite(t, ageAt), category(t, 'E1', 'DM'), category(t, 'E2', 'DS'), snap(t, rows)],
    /** The operator re-baseline as one unit (CONTRACTS §4 steps 1-2): the event, the reader's rewrite event, the snapshot. */
    rebase: (t: number, ageAt: number, rows: unknown[]): Unit => [el({ ingestSeq: n(), event: 'rebaseline', observedAt: at(t), scope: { kind: 'phase', phaseId: P } }), rewrite(t, ageAt), snap(t, rows)],
  };
}
const replaced = (c: Core, from: number): Array<{ standings: Std[] }> => c.notifications().slice(from).filter((m) => m.type === 'scope.replaced') as never;
const standing = (r: { standings: Std[] }, key: string): Std | undefined => r.standings.find((s) => s.standingKey === key);

describe('#271 N2: asOf in scope.replaced (CONTRACTS §5 step 1, §7.2)', () => {
  it('§5 step 1 asOf: a Standing the re-baseline leaves unchanged carries the last change\'s asOf, one it changes carries the re-baseline\'s', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(10, 5, [erow('1', 1, 80), erow('2', 2, 85)]));
    const m = c.notifications().length;
    // the re-read: entry 1 (the whole DM category) unchanged, entry 2's time changed: the class Standing changes, the DM Standing does not
    c.applyUnit(s.rebase(200, 195, [erow('1', 1, 80), erow('2', 2, 86)]));
    const r = replaced(c, m);
    expect(r, 'one scope.replaced').toHaveLength(1);
    const all = standing(r[0]!, `phase:${P}/all`);
    const dm = standing(r[0]!, `phase:${P}/DM`);
    expect(all, 'the class Standing is carried').toBeDefined();
    expect(dm, 'the DM Standing is carried').toBeDefined();
    expect(all!.entries.find((e) => e['bib'] === '2')!['result']).toMatchObject({ totalSeconds: 86 }); // precondition: the re-read did change the class Standing
    expect(all!.asOf, 'changed by the re-baseline').toBe(at(200));
    expect(dm!.asOf, 'unchanged by the re-baseline: the last change\'s').toBe(at(10));
  });

  it('§5 step 1 asOf: a re-baseline that re-reads the same table changes no Standing: every carried Standing keeps its own asOf', () => {
    const s = stream();
    const c = coreWith([]);
    c.applyUnit(s.xml(10, 5, [erow('1', 1, 80), erow('2', 2, 85)]));
    c.applyUnit(s.xml(100, 95, [erow('1', 1, 80), erow('2', 2, 85.5)])); // class Standing changes at 100, DM does not
    const m = c.notifications().length;
    c.applyUnit(s.rebase(300, 295, [erow('1', 1, 80), erow('2', 2, 85.5)]));
    const r = replaced(c, m);
    expect(r).toHaveLength(1);
    const all = standing(r[0]!, `phase:${P}/all`);
    const dm = standing(r[0]!, `phase:${P}/DM`);
    expect(all, 'precondition: both carried').toBeDefined();
    expect(dm).toBeDefined();
    expect(all!.asOf).toBe(at(100));
    expect(dm!.asOf).toBe(at(10));
  });
});
