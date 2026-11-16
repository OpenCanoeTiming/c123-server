import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith } from './streams.js';
import { RACE, xmlSnapshotUnit, type XmlRow } from './kit-271.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 DERIVATIONS §10 item 53 (e), CONTRACTS §5 step 4: the category-rank check compares only while the whole-class standing presents the latest snapshot's
// class order (the same placed entries, each with that row's rank and order); otherwise nothing is compared and an anomaly recorded earlier is withdrawn.
// Channel: the XML snapshot (CatId, CatRnk, class order) and TCP result rows (a newer class order). Own core and stream per test; entries A = bib 1, B = bib 2.

type Std = { standingKey: string; entries: Array<Record<string, any>>; anomalies: Array<Record<string, any>> };
const el = (e: unknown): GivenElement => e as GivenElement;
const KEY = `phase:${RACE}/ZM`;
const cat = (c: ReturnType<typeof coreWith>): Std => (c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === KEY).at(-1))!;
const dis = (s: Std) => s.anomalies.filter((a) => a['kind'] === 'category-rank-disagreement');
const order = (s: Std) => s.entries.map((e) => [e['bib'], e['rank']]);
const row = (bib: string, rnk: number, catRnk: number): XmlRow => ({ id: `${bib}.K1M`, bib, catId: 'ZM', rnk, catRnk, timeMs: 80000 + rnk * 1000 });
const tcpRows = (t: number, ranks: Array<[bib: string, rank: number]>, seq: number): GivenElement =>
  el({ ingestSeq: seq, observedAt: at(t), snapshot: { source: 'tcp', phaseId: RACE, mode: 'results', rows: ranks.map(([bib, rank]) => ({
    bib, entry: { entryId: `${bib}.K1M` }, outcome: { kind: 'duration', runSeconds: 80 + rank, penaltySeconds: 0, totalSeconds: 80 + rank }, placement: { rank, order: rank }, judgingComplete: true,
  })) } });

describe('#271 item 53 (e): the check compares only on the snapshot\'s class order', () => {
  it('item 53 (e) (i): XML A 1 / B 2 with CatRnk 1, 2, then TCP B 1 / A 2: no anomaly (category order B, A against the snapshot\'s ranks is upstream\'s lag)', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([row('1', 1, 1), row('2', 2, 2)], 100, 95));
    expect(order(cat(c)), 'precondition: XML order').toEqual([['1', 1], ['2', 2]]);
    expect(dis(cat(c)), 'precondition: equal at the snapshot\'s own order').toEqual([]);
    c.applyUnit([tcpRows(200, [['2', 1], ['1', 2]], 900)]);
    expect(order(cat(c)), 'precondition: the TCP order is presented, B first').toEqual([['2', 1], ['1', 2]]);
    expect(dis(cat(c)), 'a check against the stale snapshot would flag both entries').toEqual([]);
  });

  it('item 53 (e) (i): an anomaly raised on the snapshot\'s own order is withdrawn when TCP presents another class order', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([row('1', 1, 1), row('2', 2, 5)], 100, 95));
    expect(dis(cat(c)), 'precondition: raised while the order is the snapshot\'s').toHaveLength(1);
    c.applyUnit([tcpRows(200, [['2', 1], ['1', 2]], 900)]);
    expect(order(cat(c)), 'precondition').toEqual([['2', 1], ['1', 2]]);
    expect(dis(cat(c))).toEqual([]);
  });

  it('item 53 (e) (i): a TCP push with the snapshot\'s own order and rows keeps comparing (anomaly stays); one with another set of placed entries stops the comparison', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([row('1', 1, 1), row('2', 2, 5)], 100, 95));
    c.applyUnit([tcpRows(200, [['1', 1], ['2', 2]], 900)]);
    expect(dis(cat(c)), 'same placed entries, same (rank, order): still compared').toHaveLength(1);
    c.applyUnit([tcpRows(300, [['1', 1], ['2', 2], ['9', 3]], 901)]);
    expect(dis(cat(c)), 'an added placed row: the order is no longer the snapshot\'s').toEqual([]);
  });

  it('item 53 (e) (ii): a snapshot restating B 1 / A 2 with CatRnk 1, 2 after the TCP order: no anomaly', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([row('1', 1, 1), row('2', 2, 2)], 100, 95));
    c.applyUnit([tcpRows(200, [['2', 1], ['1', 2]], 900)]);
    c.applyUnit(xmlSnapshotUnit([row('2', 1, 1), row('1', 2, 2)], 300, 295));
    expect(order(cat(c)), 'precondition: B first').toEqual([['2', 1], ['1', 2]]);
    expect(dis(cat(c))).toEqual([]);
  });

  it('item 53 (e) (iii): the same snapshot with a wrong CatRnk for A: exactly one category-rank-disagreement', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([row('1', 1, 1), row('2', 2, 2)], 100, 95));
    c.applyUnit([tcpRows(200, [['2', 1], ['1', 2]], 900)]);
    c.applyUnit(xmlSnapshotUnit([row('2', 1, 1), row('1', 2, 7)], 300, 295));
    expect(order(cat(c)), 'precondition: B first').toEqual([['2', 1], ['1', 2]]);
    const d = dis(cat(c));
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ assembled: 2, upstream: 7 });
    expect(String(d[0]!['entryId'])).toContain('1.K1M');
  });
});
