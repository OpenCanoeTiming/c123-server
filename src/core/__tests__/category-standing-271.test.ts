import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import { RACE, xmlSnapshotUnit, type XmlRow } from './kit-271.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 N3 + CQ3 (CONTRACTS §5 step 4; DERIVATIONS §10 items 46 (c), 53; TEST-ARCHITECTURE property 15). Channel: the results table of one Phase
// (TCP/XML rows) for the numbering; the XML snapshot (`CatId`, `CatRnk`) for the check. Every test builds its own core and stream.

type Std = { standingKey: string; entries: Array<Record<string, any>>; anomalies: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const el = (e: unknown): GivenElement => e as GivenElement;
const stds = (c: Core, key: string): Std[] => c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === key);

describe('#271 CQ3: category numbering on a class tie (CONTRACTS §5 step 4; item 53 (a); jarni-ne-odp C1M_BR1_19, category ZM)', () => {
  const P = 'K1M_BR1_6';
  let seq = 0;
  const n = (): number => ++seq;
  const duration = (t: number) => ({ kind: 'duration', runSeconds: t, penaltySeconds: 0, totalSeconds: t });
  const placed = (bib: string, rank: number, order: number) => ({ bib, entry: { entryId: `E${bib}` }, outcome: duration(70 + order), placement: { rank, order }, judgingComplete: true });
  const category = (entryId: string, value: string): unknown => ({ ingestSeq: n(), entryId, field: 'ageCategoryId', source: 'xml', kind: 'result-row', observedAt: at(10), value, confidence: 'authoritative' });

  it('§5 step 4 (vector standing-age-category-assembled, recorded tie): entries tied on class rank get consecutive category ranks in class order; the unplaced DNF follows with null/null; another category is absent', () => {
    seq = 0;
    const rows = [
      placed('41', 1, 1), placed('70', 2, 2), placed('42', 10, 10), placed('43', 20, 20), placed('44', 30, 30),
      placed('53', 43, 43), placed('54', 43, 44), placed('55', 45, 45),
      { bib: '64', entry: { entryId: 'E64' }, status: 'dnf' },
    ];
    const zm = ['41', '42', '43', '44', '53', '54', '55', '64'];
    const unit: Unit = [
      el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(10), changedAfter: at(5) }),
      ...[...zm.map((b) => category(`E${b}`, 'ZM')), category('E70', 'DS')].map(el),
      el({ ingestSeq: n(), observedAt: at(10), snapshot: { source: 'xml', phaseId: P, mode: 'results', rows } }),
    ];
    const c = coreWith([]);
    c.applyUnit(unit);
    // precondition: the class standing holds the tie as relayed (53 and 54 share class rank 43, orders 43 and 44)
    const cls = stds(c, `phase:${P}/all`).at(-1)!;
    expect(cls.entries.filter((e) => ['53', '54'].includes(e['bib'])).map((e) => [e['bib'], e['rank'], e['order']])).toEqual([['53', 43, 43], ['54', 43, 44]]);
    const cat = stds(c, `phase:${P}/ZM`).at(-1)!;
    expect(cat, 'the category standing is published').toBeDefined();
    expect(cat.entries.map((e) => [e['bib'], e['rank'], e['order']])).toEqual([
      ['41', 1, 1], ['42', 2, 2], ['43', 3, 3], ['44', 4, 4], ['53', 5, 5], ['54', 6, 6], ['55', 7, 7], ['64', null, null],
    ]);
    expect(cat.entries.some((e) => e['bib'] === '70'), 'the other category is not listed').toBe(false);
    expect(cat.anomalies, 'no disagreement without a snapshot category rank').toEqual([]);
  });
});

describe('#271 N3: the snapshot CatRnk reaches the category check (CONTRACTS §5 step 4; item 53 (c), (d))', () => {
  const dis = (s: Std) => s.anomalies.filter((a) => a['kind'] === 'category-rank-disagreement');
  const ZM = (bib: string, rnk: number | undefined, catRnk: number | undefined, extra: Partial<XmlRow> = {}): XmlRow =>
    ({ id: `${bib}.K1M`, bib, catId: 'ZM', rnk, catRnk, timeMs: rnk === undefined ? undefined : 80000 + rnk * 1000, ...extra });
  const KEY = `phase:${RACE}/ZM`;
  const ids = (s: Std) => s.entries.map((e) => [e['bib'], e['rank']]);

  it('§5 step 4: a placed entry whose snapshot CatRnk differs records exactly one category-rank-disagreement (assembled and upstream named), the assembled rank stays presented', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([ZM('1', 1, 1), ZM('2', 2, 9)], 100, 95));
    const s = stds(c, KEY).at(-1)!;
    expect(ids(s), 'precondition: the category standing is assembled').toEqual([['1', 1], ['2', 2]]);
    const d = dis(s);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ kind: 'category-rank-disagreement', assembled: 2, upstream: 9 });
    expect(String(d[0]!['entryId'])).toContain('2.K1M');
  });

  it('§5 step 4: a snapshot CatRnk equal to the assembled rank records nothing', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([ZM('1', 1, 1), ZM('2', 2, 2)], 100, 95));
    const s = stds(c, KEY).at(-1)!;
    expect(ids(s), 'precondition').toEqual([['1', 1], ['2', 2]]);
    expect(dis(s)).toEqual([]);
  });

  it('§5 step 4 + item 53 (d): an unplaced row\'s CatRnk (a list position, recorded bib 64 CatRnk 9) records nothing', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([ZM('1', 1, 1), ZM('2', 2, 2), ZM('64', undefined, 9, { status: 'DNF' })], 100, 95));
    const s = stds(c, KEY).at(-1)!;
    expect(ids(s), 'precondition: placed entries ranked, the DNF listed after with null').toEqual([['1', 1], ['2', 2], ['64', null]]);
    expect(dis(s)).toEqual([]);
  });

  it('§5 step 4 (property 15 "raising or clearing an anomaly"): a later snapshot with the right CatRnk clears the anomaly', () => {
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([ZM('1', 1, 1), ZM('2', 2, 9)], 100, 95));
    expect(dis(stds(c, KEY).at(-1)!), 'precondition: raised').toHaveLength(1);
    c.applyUnit(xmlSnapshotUnit([ZM('1', 1, 1), ZM('2', 2, 2)], 200, 195));
    const s = stds(c, KEY).at(-1)!;
    expect(ids(s)).toEqual([['1', 1], ['2', 2]]);
    expect(dis(s)).toEqual([]);
  });

  it('item 53 (c): a second-run Phase\'s row CatRnk and TotalCatRnk are not read (a differing value records nothing)', () => {
    const BR2 = 'K1M_BR2_19';
    const second = (bib: string, rank: number, cat: number, total: number): XmlRow => ({
      id: `${bib}.K1M`, bib, catId: 'ZM', rnk: rank, catRnk: cat, timeMs: 90000 + rank * 1000,
      extra: `<PrevCatRnk>${total}</PrevCatRnk><TotalRnk>${rank}</TotalRnk><TotalRnkOrder>${rank}</TotalRnkOrder><TotalTotal>${170000 + rank * 1000}</TotalTotal><TotalCatRnk>${total}</TotalCatRnk><TotalCatRnkOrder>${total}</TotalCatRnkOrder>`,
    });
    const c = coreWith([]);
    c.applyUnit(xmlSnapshotUnit([second('1', 1, 7, 8), second('2', 2, 8, 9)], 100, 95, BR2));
    const s = stds(c, `phase:${BR2}/ZM`).at(-1)!;
    expect(ids(s), 'precondition: the second-run category standing is assembled over the combined placement').toEqual([['1', 1], ['2', 2]]);
    expect(dis(s)).toEqual([]);
  });
});
