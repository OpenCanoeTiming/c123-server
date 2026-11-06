import { describe, it, expect } from 'vitest';
import { R19 } from './fixtures/round19-excerpts.js';
import { attrOf, connected, coreWith, tcpUnit, xmlUnit } from './streams.js';

// #203 F9 (found by `npm run sweep:merge`, row 14): the untimed flag (DERIVATIONS §4.4) is resolved on the XML row and "already inherited onto a TCP row of
// the same Attempt by the core" (CONFORMANCE-VECTORS §1). It must reach a TCP row retained BEFORE the snapshot was read: cp3-cross, junior time trial
// WX1J_XT_26_JUN, whose TCP rows carry the placeholder Time (rank x 1, later x 1000) and a real Rank, and whose XML rows carry no finish time.
describe('untimed flag on a retained TCP row, real cp3-cross WX1J_XT_26_JUN (DERIVATIONS §4.4; vector untimed-row-outcome-not-applicable)', () => {
  const day = { WX1J_XT_26_JUN: '2026-04-26' };
  const rows = [...R19.juTcp.data.matchAll(/<Row Number="\d+"><Participant Bib="\s*(\d+)"[\s\S]*?<\/Row>/g)].filter((m) => /Rank="[1-9]/.test(m[0])).map((m) => ({
    bib: m[1]!,
    time: attrOf(m[0], 'Result', 'Time'),
    rank: Number(attrOf(m[0], 'Result', 'Rank')),
    order: Number(attrOf(m[0], 'Result', 'RankOrder')),
  }));
  const changedAfter = new Date(Date.parse(R19.juXml.observedAt) - 5000).toISOString();

  it('the recorded rows are what the test says: TCP rows with a placeholder Time and a real Rank, XML rows with no finish time, the TCP message first', () => {
    expect(rows.length).toBeGreaterThan(0); // the first TCP push with a ranked row (06:11:58Z): bib 24, Time 15.00 as the placeholder
    expect(rows.every((r) => r.time !== '' && r.rank > 0)).toBe(true);
    expect(R19.juXml.data).toMatch(/<Results>/);
    expect(R19.juXml.data).not.toMatch(/<dtFinish>/);
    expect(Date.parse(R19.juTcp.observedAt)).toBeLessThan(Date.parse(R19.juXml.observedAt));
  });

  it('real cp3-cross: after the XML snapshot, every retained TCP row presents outcome unavailable{not-applicable} and keeps its recorded placement', () => {
    const core = coreWith([connected(R19.juTcp.observedAt), tcpUnit(R19.juTcp, day), xmlUnit(R19.juXml, day, changedAfter)]);
    for (const r of rows) {
      const p = core.presented(`WX1J_XT_26_JUN:${r.bib}`);
      expect(p['outcome'], `bib ${r.bib}`).toEqual({ state: 'unavailable', reason: 'not-applicable' });
      expect(p['placement'], `bib ${r.bib}`).toMatchObject({ state: 'known', value: { rank: r.rank, order: r.order } });
    }
    // the sweep's symptom was a false disagreement on the duration the flag should have hidden
    expect((core.diagnostics() as Array<{ field?: string }>).filter((d) => d.field === 'outcome')).toEqual([]);
  });
});
