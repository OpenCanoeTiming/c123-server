import { describe, it, expect } from 'vitest';
import { parseTcp } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, rowOf } from './helpers.js';

// Round 20 (#204) parser items 17 and 18 (design-round20 "What changes in code"; DERIVATIONS §4.6(b), §0.5; CONTRACTS §2.6).
// Rows are the recorded nkz-19so K1M_BR1_19 rows of fixtures/tcp.ts (bib 55: Time 48.64 Rank 1, ten judged cells then blank; bib 64: IRM DNS, no time);
// an edited attribute is marked "derived". Expected values come from the rules, not from the parser.

const BLANK_GATES = /Gates="[^"]*"/g;
/** The recorded text with every row's `Gates` attribute replaced by the empty string (D2: `Gates=""`). */
const emptyGates = (text: string): string => text.replace(BLANK_GATES, 'Gates=""');
const unbound = { courses: {} }; // no course bound: cells are retained (DERIVATIONS §0.5), gates once a course is bound

describe('D2: `Gates=""` is thirty missing cells, not no statement, on a row stating a result (DERIVATIONS §4.6(b) "blank means null"; item 17)', () => {
  it('(derived: Gates="" on the recorded bib 55 row, Time 48.64) bound course: gates is the course\'s 23 slots, every penalty null', () => {
    const r = rowOf(parseTcp(emptyGates(TCP.resultsBr1), ctx()), 'K1M_BR1_19', '55');
    expect(r.gates).toHaveLength(23);
    expect((r.gates as Array<{ penalty: unknown }>).map((g) => g.penalty)).toEqual(Array(23).fill(null));
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 48.64 });
  });

  it('(derived: Gates="" on the recorded bib 55 row) no course bound: thirty blank cells are retained, none of them a number', () => {
    const r = rowOf(parseTcp(emptyGates(TCP.resultsBr1), ctx(unbound)), 'K1M_BR1_19', '55');
    expect(r.cells).toEqual(Array(30).fill(null));
    expect(r).not.toHaveProperty('gates');
  });

  it('(derived: Gates="" on the recorded bib 64 DNS row) a mark states a result too: its cells are blank, once bound all-null gates', () => {
    const r = rowOf(parseTcp(emptyGates(TCP.resultsBr1Marks), ctx()), 'K1M_BR1_19', '64');
    expect(r.status).toBe('dns');
    expect((r.gates as Array<{ penalty: unknown }>).map((g) => g.penalty)).toEqual(Array(23).fill(null));
  });

  it('(derived: IRM and Gates="" on the recorded bib 64 row, no time, no mark, no rank) a row stating none of the three states nothing, Gates included: no cells, no gates', () => {
    const msg = emptyGates(TCP.resultsBr1Marks).replace(/IRM="DNS"/g, 'IRM=""');
    const r = rowOf(parseTcp(msg, ctx()), 'K1M_BR1_19', '64');
    expect(r).not.toHaveProperty('cells');
    expect(r).not.toHaveProperty('gates');
    expect(r).not.toHaveProperty('faults');
  });

  it('(derived: Gates="" and a Rank on the recorded bib 64 row, no time, no mark) a placement alone is no result of this run (B5): no cells, no gates', () => {
    const msg = emptyGates(TCP.resultsBr1Marks).replace(/IRM="DNS"/g, 'IRM=""').replace('Rank="" RankOrder="105"', 'Rank="105" RankOrder="105"');
    const r = rowOf(parseTcp(msg, ctx()), 'K1M_BR1_19', '64');
    expect(r.placement).toMatchObject({ rank: 105 });
    expect(r).not.toHaveProperty('cells');
    expect(r).not.toHaveProperty('gates');
  });
});

describe('a marked row never carries no-result on the parser\'s output (CONTRACTS §2.6 round 20; item 18; DERIVATIONS §0.5 "the parser emits the time beside the mark")', () => {
  it.each(['DNS', 'DNF', 'CAP', 'RAL', 'DSQ', 'DSQ-R', 'DQB', 'NON-RK', 'XYZ'])('recorded bib 64 with IRM=%s and no time: a status mark, no outcome key, never kind no-result', (irm) => {
    const r = rowOf(parseTcp(TCP.resultsBr1Marks.replace(/IRM="DNS"/g, `IRM="${irm}"`), ctx()), 'K1M_BR1_19', '64');
    expect(typeof r.status).toBe('string');
    expect(r).not.toHaveProperty('outcome');
    expect(JSON.stringify(r)).not.toContain('no-result');
  });

  it('(derived: IRM DNF on the recorded bib 55 row) with a time the row emits status and the duration, and nothing else in outcome', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1.replace('IRM=""', 'IRM="DNF"'), ctx()), 'K1M_BR1_19', '55');
    expect(r.status).toBe('dnf');
    expect(r.outcome).toEqual({ kind: 'duration', runSeconds: 48.64, penaltySeconds: 0, totalSeconds: 48.64 });
    expect(JSON.stringify(r)).not.toContain('no-result');
  });
});
