import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, type El } from './helpers.js';

// DERIVATIONS §4.4, §4.5, §0.5; round 17 ruling 1 (review O3): `Prev*` is not read. It restates the first-run row of the same
// snapshot on the second-run Attempt, carries no dtFinish, so nothing could attribute it. Run 1 is `siblingPhaseId:bib`, its own
// Attempt. And ruling 2 / §0.5: the parser never emits `run`; the core stamps it.
// Raw: slalom.xml K1M_BR2_19 second-run rows: bib 108 PrevTime 88380 PrevPen 0 PrevTotal 88380 PrevRnk 20; bib 105 PrevStatus DNS.
const keys = (v: unknown, out: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(v)) v.forEach((x) => keys(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); keys(x, out); }
  return out;
};
const slalom = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());

describe('§4.5 Prev* is not read (review O3, round 17 ruling 1)', () => {
  it('§4.5 ruling 1: no element on a second-run Attempt carries run 1 (bibs 108, 1, 105 of K1M_BR2_19)', () => {
    const els = slalom() as El[];
    for (const bib of ['108', '1', '105']) {
      expect(els.filter((e) => e.attemptId === `K1M_BR2_19:${bib}` && e.run !== undefined)).toEqual([]);
    }
  });
  it('§0.5 the parser never emits run: no element of any XML or TCP result carries a `run` key', () => {
    for (const els of [slalom(), parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), parseTcp(TCP.resultsBr2, ctx()), parseTcp(TCP.onCourseFinished, ctx())]) {
      expect(keys(els).has('run')).toBe(false);
    }
  });
  it('§4.5 ruling 1: nothing in the output is built from PrevTime: bib 1 (PrevTime 78800, PrevPen 4, PrevTotal 82800) yields no outcome observation outside its row', () => {
    const els = slalom() as El[];
    expect(els.filter((e) => e.field === 'outcome' && e.attemptId === 'K1M_BR2_19:1')).toEqual([]);
    expect(els.filter((e) => e.field === 'placement' && e.attemptId?.startsWith('K1M_BR2_19:'))).toEqual([]);
  });
  it('§4.5 a second-run row\'s own values stay its own (bib 108 run-2 outcome stays 91.64)', () => {
    const snap = (slalom() as El[]).find((e) => e.snapshot?.phaseId === 'K1M_BR2_19')!.snapshot;
    expect(snap.rows.find((r: El) => r.bib === '108').outcome.runSeconds).toBe(91.64);
  });
  it('§4.5 PrevRnk in Cross means the previous round and is not modelled (§9): no placement observation with a run', () => {
    const els = parseXmlSnapshot(xmlFixture('cross.xml'), ctx()) as El[];
    expect(els.filter((e) => e.attemptId?.startsWith('WX1J_XS_26_JUN:') && e.run !== undefined)).toEqual([]);
  });
});
