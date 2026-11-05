import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, rowOf, penalties, withAttr } from './helpers.js';

// DERIVATIONS §6: what the wire provides for echo matching. Matching (confirmed / mismatched / superseded) is the core's.
// The parser must supply a field-level, comparable value for the target field of a correction: the gate penalty of one gate, per generation.
// keeps the header and the closing tags: only whole <Row> elements are dropped
const keepRow = (msg: string, needle: string): string => msg.replace(/<Row [\s\S]*?<\/Row>/g, (r) => (r.includes(needle) ? r : ''));

describe('§6 WriteRequest echo matching', () => {
  it('§6 an echo is a later results-table observation: a Results row states each gate\'s penalty separately (bib 108 gate 16 = 50)', () => {
    expect(penalties(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').gates)[15]).toBe(50);
  });
  it('§6 field-level: a row refreshed for an unrelated reason leaves the target gate value unchanged (Rank changed, gates equal)', () => {
    const a = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    const b = rowOf(parseTcp(withAttr(TCP.resultsBr2, 'Rank', '20', '21'), ctx()), 'K1M_BR2_19', '108');
    expect(b.gates).toEqual(a.gates);
    expect(b.placement).not.toEqual(a.placement);
  });
  it('§6 a correction of one gate changes only that gate in the parsed row (gate 12: "  2" -> "  0")', () => {
    const m = keepRow(TCP.resultsBr2, 'Id="9047.K1M"');
    const g = m.match(/Gates="([^"]*)"/)![1];
    const cells = g.match(/.{3}/g)!;
    cells[11] = '  0';
    const a = penalties(rowOf(parseTcp(m, ctx()), 'K1M_BR2_19', '108').gates);
    const b = penalties(rowOf(parseTcp(m.replace(g, cells.join('')), ctx()), 'K1M_BR2_19', '108').gates);
    expect(a[11]).toBe(2);
    expect(b[11]).toBe(0);
    expect(b.filter((_, i) => i !== 11)).toEqual(a.filter((_, i) => i !== 11));
  });
  it('§6 the same fact from XML gives the same field value (the echo may be confirmed from either channel)', () => {
    const t = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    const x = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(x.gates).toEqual(t.gates);
  });
  it('§6 the penalty total of the run is stated on the row, comparable to a requested value (152 for the corrected run)', () => {
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').outcome.penaltySeconds).toBe(152);
  });
});
