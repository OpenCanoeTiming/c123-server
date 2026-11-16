import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx, rowOf, xmlFixture, type El } from './helpers.js';
import { xmlFile } from '../../core/__tests__/kit-271.js';

// #271 N3, DERIVATIONS §10 item 53 (c), CONTRACTS §5 step 4: the parser carries the snapshot's category rank (`CatRnk`) of the rows of first-run and
// single-run races that state a `CatId`, and nothing from a second-run row (`CatRnk`, `TotalCatRnk`, `PrevCatRnk`) or a row with no `CatId`.
// The row key the rank is carried under is the implementation's choice (no document names it); the tests compare rows built from the same
// text with only the rank values changed: a rank is carried iff changing it changes the row, and then in exactly one leaf holding that number.
// Channel: the XML snapshot (the only source of `CatRnk`).

const flat = (v: unknown, path = ''): Array<[string, unknown]> =>
  v !== null && typeof v === 'object'
    ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => flat(x, `${path}.${k}`))
    : [[path, v]];
const leaves = (row: El): Map<string, unknown> => new Map(flat(row));
const diff = (a: El, b: El): Array<{ path: string; a: unknown; b: unknown }> => {
  const x = leaves(a);
  const y = leaves(b);
  return [...new Set([...x.keys(), ...y.keys()])].filter((k) => x.get(k) !== y.get(k)).map((path) => ({ path, a: x.get(path), b: y.get(path) }));
};

const first = (catRnk: number, catId = 'ZM') => [{ id: '9047.K1M', bib: '108', catId, rnk: 20, catRnk, timeMs: 88380 }];
const parse = (xml: string) => parseXmlSnapshot(xml, ctx());

describe('#271 N3: the parser carries CatRnk (DERIVATIONS item 53 (c), CONTRACTS §5 step 4)', () => {
  it('obligation item 53 (c): a first-run row with a CatId carries its CatRnk (6 vs 7 differ in exactly one leaf holding the number)', () => {
    const a = rowOf(parse(xmlFile(first(6))), 'K1M_BR1_19', '108');
    const b = rowOf(parse(xmlFile(first(7))), 'K1M_BR1_19', '108');
    // precondition: the two texts differ in the rank only, the rest of the row is the same
    expect(a.placement).toEqual({ rank: 20, order: 20 });
    expect(b.placement).toEqual({ rank: 20, order: 20 });
    const d = diff(a, b);
    expect(d, 'a row carrying CatRnk differs where the rank differs').toHaveLength(1);
    expect([Number(d[0]!.a), Number(d[0]!.b)]).toEqual([6, 7]);
  });

  it('obligation item 53 (c): a single-run Cross time-trial row with a CatId carries its CatRnk (recorded WX1_XT_26 bib 23, DS, CatRnk 7)', () => {
    const xml = xmlFixture('cross.xml');
    const edit = (to: number): string => {
      const i = xml.search(/<Results>\s*<RaceId>WX1_XT_26<\/RaceId>\s*<Id>[^<]*<\/Id>\s*<StartOrder>[^<]*<\/StartOrder>\s*<Bib>\s*23<\/Bib>/);
      const j = xml.indexOf('<CatRnk>7</CatRnk>', i);
      expect(i, 'the fixture holds the recorded row').toBeGreaterThan(-1);
      expect(xml.slice(i, j), 'inside that Results row').not.toContain('</Results>');
      return xml.slice(0, j) + `<CatRnk>${to}</CatRnk>` + xml.slice(j + '<CatRnk>7</CatRnk>'.length);
    };
    const a = rowOf(parse(edit(7)), 'WX1_XT_26', '23');
    const b = rowOf(parse(edit(8)), 'WX1_XT_26', '23');
    const d = diff(a, b);
    expect(d).toHaveLength(1);
    expect([Number(d[0]!.a), Number(d[0]!.b)]).toEqual([7, 8]);
  });

  it('obligation item 53 (c): a second-run row carries nothing of CatRnk, TotalCatRnk or PrevCatRnk (any value, the row is the same)', () => {
    const second = (cat: number, total: number, prev: number) => [{
      id: '9047.K1M', bib: '108', catId: 'DS', rnk: 29, timeMs: 91640,
      catRnk: cat, extra: `<PrevCatRnk>${prev}</PrevCatRnk><TotalRnk>20</TotalRnk><TotalRnkOrder>20</TotalRnkOrder><TotalTotal>180020</TotalTotal><TotalCatRnk>${total}</TotalCatRnk><TotalCatRnkOrder>${total}</TotalCatRnkOrder>`,
    }];
    const a = rowOf(parse(xmlFile(second(9, 6, 6), 'K1M_BR2_19')), 'K1M_BR2_19', '108');
    const b = rowOf(parse(xmlFile(second(3, 2, 1), 'K1M_BR2_19')), 'K1M_BR2_19', '108');
    expect(a.placement, 'precondition: the second-run row is the combined placement').toEqual({ rank: 20, order: 20 });
    expect(diff(a, b)).toEqual([]);
  });

  it('obligation item 53 (c): a first-run row whose CatId is empty carries no CatRnk', () => {
    const a = rowOf(parse(xmlFile(first(6, ''))), 'K1M_BR1_19', '108');
    const b = rowOf(parse(xmlFile(first(7, ''))), 'K1M_BR1_19', '108');
    expect(a.placement).toEqual({ rank: 20, order: 20 });
    expect(diff(a, b)).toEqual([]);
    // the same text with a CatId does carry it (the difference above is the CatId, not the fixture)
    expect(diff(rowOf(parse(xmlFile(first(6))), 'K1M_BR1_19', '108'), rowOf(parse(xmlFile(first(7))), 'K1M_BR1_19', '108'))).toHaveLength(1);
  });
});
