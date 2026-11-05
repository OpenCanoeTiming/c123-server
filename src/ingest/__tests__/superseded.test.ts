import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture, allObs, obsOf, type El } from './helpers.js';

// DERIVATIONS §4.5. Raw: slalom.xml K1M_BR2_19 second-run rows:
//   bib 108: PrevStatus empty, PrevTime 88380, PrevPen 0, PrevTotal 88380, PrevRnk 20
//   bib 1:   PrevTime 78800, PrevPen 4, PrevTotal 82800, PrevRnk 8
//   bib 105: PrevStatus DNS
// ASSUMED shape (DERIVATIONS gives none): run 1's detail is an observation of the second-run Attempt id with `run: 1`,
// source xml, authoritative. Whether the parser or the core builds run 1's Attempt from Prev* is NOT stated: see result file.
const run1 = (field: string, bib: string): El | undefined =>
  allObs(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), field).find((o) => o.attemptId === `K1M_BR2_19:${bib}` && o.run === 1);

describe('§4.5 a superseded run\'s detail', () => {
  it('§4.5 (a) the second run\'s row carries run 1\'s outcome from Prev* (bib 108: 88.38 / 0 / 88.38), xml, authoritative', () => {
    expect(run1('outcome', '108')).toMatchObject({ value: { kind: 'duration', runSeconds: 88.38, penaltySeconds: 0, totalSeconds: 88.38 }, source: 'xml', confidence: 'authoritative' });
  });
  it('§4.5 (a) PrevTime/PrevPen/PrevTotal in ms/seconds/ms (bib 1: 78.8 / 4 / 82.8)', () => {
    expect(run1('outcome', '1')?.value).toEqual({ kind: 'duration', runSeconds: 78.8, penaltySeconds: 4, totalSeconds: 82.8 });
  });
  it('§4.5 (a) PrevStatus DNS gives run 1 a no-result mark (bib 105)', () => {
    expect(run1('outcome', '105')?.value).toEqual({ kind: 'no-result', status: 'dns' });
  });
  it('§4.5 run 1\'s detail never leaks into run 2\'s own presented values (bib 108 run-2 outcome stays 91.64)', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    const snap = (els as El[]).find((e) => e.snapshot?.phaseId === 'K1M_BR2_19')!.snapshot;
    expect(snap.rows.find((r: El) => r.bib === '108').outcome.runSeconds).toBe(91.64);
  });
  it('§4.5 a first-run row has no Prev* and yields no run-1 detail observation for itself', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    expect(allObs(els, 'outcome').filter((o) => o.attemptId === 'K1M_BR1_19:108' && o.run === 1)).toEqual([]);
  });
  it('§4.5 PrevRnk in Cross means the previous round, not a previous run, and is not modelled (§9)', () => {
    expect(obsOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'placement', { attemptId: 'WX1J_XS_26_JUN:1', run: 1 })).toBeUndefined();
  });
});
