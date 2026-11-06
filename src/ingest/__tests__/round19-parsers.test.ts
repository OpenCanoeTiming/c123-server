import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, rowOf, statusOf, xmlFixture } from './helpers.js';

// Round 19 (#203) parser items 9 (a mark with a time; `faults` judgingComplete). DERIVATIONS §0.5, §4.1, §4.6(d); TEST-ARCHITECTURE P11.
// Recorded rows: nkz-19so K1M_BR1_19 bib 55 (Time 48.64), cp3-cross WX1_XT_26 bib 23 (Gates of 9 slots). Marks and cells edited on a recorded row are marked "derived".

describe('a row with a mark and a time (DERIVATIONS §4.1 "Result marks", code item 9; vector rerun-stale-mark-not-presented row shape)', () => {
  it('(derived: IRM DNF on the recorded bib 55 row) TCP: status dnf and outcome duration with the recorded Time 48.64', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1.replace('IRM=""', 'IRM="DNF"'), ctx()), 'K1M_BR1_19', '55');
    expect(r.status).toBe('dnf');
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 48.64 });
  });

  it('(derived: Status DNF on a recorded timed XML row) XML: the mark in status and the time as outcome duration', () => {
    const xml = xmlFixture('slalom.xml');
    const els = parseXmlSnapshot(xml, ctx());
    const timed = (els as Array<Record<string, any>>).flatMap((e) => (e.snapshot?.rows ?? []).map((r: any) => ({ phase: e.snapshot.phaseId as string, r }))).find((x) => x.r.outcome?.kind === 'duration' && x.phase === 'K1M_BR1_19');
    expect(timed).toBeDefined();
    const bib = timed!.r.bib as string;
    const re = new RegExp(`(<Results>\\s*<RaceId>K1M_BR1_19</RaceId>[\\s\\S]*?<Bib>\\s*${bib}</Bib>[\\s\\S]*?)<Status\\s*/>`);
    expect(xml).toMatch(re);
    const marked = parseXmlSnapshot(xml.replace(re, '$1<Status>DNF</Status>'), ctx());
    const r = rowOf(marked, 'K1M_BR1_19', bib);
    expect(r.status).toBe('dnf');
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: timed!.r.outcome.runSeconds });
  });

  it('a mark with no time emits status only, no outcome (a recorded DNS row, Time=""; round 20 code item 18: no-result is the core\'s presentation of status)', () => {
    const els = parseTcp(TCP.resultsBr1Marks, ctx());
    expect(statusOf(els, 'K1M_BR1_19', '64')).toBe('dns');
    expect(rowOf(els, 'K1M_BR1_19', '64').outcome).toBeUndefined();
  });
});

describe('`faults` carries judgingComplete over the slot cells (DERIVATIONS §4.6(d), code item 9; P11)', () => {
  it('recorded cp3-cross XT bib 23, all 9 slot cells judged -> judgingComplete true beside faults', () => {
    const r = rowOf(parseTcp(TCP.resultsXtFault, ctx()), 'WX1_XT_26', '23');
    expect(r.faults).toEqual({ count: 1, gates: ['3'], lastCleanSlot: 3 });
    expect(r.judgingComplete).toBe(true);
  });

  it('(derived: one slot cell blanked on the recorded row) a blank slot cell -> judgingComplete false', () => {
    const msg = TCP.resultsXtFault.replace('Gates="  0  0  0  2  0  0  0  0  0', 'Gates="  0  0  0  2  0  0  0  0   ');
    expect(msg).not.toBe(TCP.resultsXtFault);
    const r = rowOf(parseTcp(msg, ctx()), 'WX1_XT_26', '23');
    expect(r.judgingComplete).toBe(false);
  });
});
