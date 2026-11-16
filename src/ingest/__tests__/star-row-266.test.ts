import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, rowOf, penalties } from './helpers.js';

// #266 Q1 (DERIVATIONS §4.6(b), §4.11, §4.1): `*` is upstream's under-review flag, not a result mark: it sets no `status`, so a row carrying `*`
// and no time states no result and no `gates` vector. Recorded: jarni-so-odp K1W_BR2_18:16, an XML `*` row. Every test builds its row from the
// recorded fixture row with one attribute changed (XML channel: slalom.xml K1M_BR2_19 bib 105, a blank-Gates `<Status>DNS</Status>` row;
// TCP channel: resultsBr1Marks bib 64, `IRM="DNS"` with blank Gates).

const PHASE = 'K1M_BR2_19';
const xmlWith = (status: string, time?: string): string => {
  const x = xmlFixture('slalom.xml').replace('<Status>DNS</Status>', `<Status>${status}</Status>${time === undefined ? '' : `<dtStart>11:12:21.000</dtStart><dtFinish>11:13:41.000</dtFinish><Time>${time}</Time><Total>${time}</Total>`}`);
  if (!x.includes(`<Status>${status}</Status>`)) throw new Error('fixture has no DNS row to vary');
  return x;
};
const tcpWith = (irm: string, pp: string): string => {
  const m = TCP.resultsBr1Marks.replace('IRM="DNS"', `IRM="${irm}"`).replace('PP=""', `PP="${pp}"`);
  if (!m.includes(`PP="${pp}"`)) throw new Error('fixture has no PP="" to vary');
  return m;
};
const stated = (r: Record<string, unknown>): string[] => ['cells', 'gates', 'faults'].filter((k) => k in r);

describe('#266 Q1: a row with * and no time states no cells (DERIVATIONS §4.6(b), §4.11)', () => {
  it('§4.6(b) channel xml: a row with * and no time states no gates (jarni-so-odp K1W_BR2_18:16 shape)', () => {
    // precondition: the same row with a result mark (DNS) states the all-null vector, so the test would see a key if one were stated
    const control = rowOf(parseXmlSnapshot(xmlWith('DNS'), ctx()), PHASE, '105');
    expect(control.status, 'precondition: DNS sets status').toBe('dns');
    expect(control.gates, 'precondition: the DNS row states the all-null vector').toBeDefined();
    expect(penalties(control.gates).every((p) => p === null), 'precondition: every cell null').toBe(true);
    expect(penalties(control.gates).length, 'precondition: one cell per slot').toBeGreaterThan(0);

    const r = rowOf(parseXmlSnapshot(xmlWith('*'), ctx()), PHASE, '105');
    expect(r.underReview, 'precondition: the * is read (underReview), the row is the one under test').toBe(true);
    expect(r.status, '* sets no status').toBeUndefined();
    expect(r.outcome, 'no time: no outcome').toBeUndefined();
    expect(stated(r), 'a * row with no time states no cells, gates or faults').toEqual([]);
  });

  it('§4.6(b) channel tcp: a Results row with PP="*" (empty IRM) and no time states no gates', () => {
    const control = rowOf(parseTcp(tcpWith('DNS', ''), ctx()), 'K1M_BR1_19', '64');
    expect(control.status, 'precondition: DNS sets status').toBe('dns');
    expect(control.gates, 'precondition: the DNS row states the all-null vector').toBeDefined();

    const r = rowOf(parseTcp(tcpWith('', '*'), ctx()), 'K1M_BR1_19', '64');
    expect(r.underReview, 'precondition: the * is read').toBe(true);
    expect(r.status).toBeUndefined();
    expect(stated(r), 'a * row with no time states no cells, gates or faults').toEqual([]);
  });

  it('§4.6(b) channel xml: a row with * and a time still states its gates vector (the time states a result)', () => {
    const r = rowOf(parseXmlSnapshot(xmlWith('*', '80000'), ctx()), PHASE, '105');
    expect(r.underReview, 'precondition: the * is read').toBe(true);
    expect(r.outcome, 'precondition: the time states an outcome').toMatchObject({ kind: 'duration' });
    expect(r.gates, 'the time states a result: the all-null vector is stated').toBeDefined();
    expect(penalties(r.gates).every((p) => p === null)).toBe(true);
  });
});
