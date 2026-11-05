import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, instant, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.3, §4.4. Raw: onCourseRunning (bib 56: Time="65   " Pen="0", Gates 13 judged then 10 blank),
// onCourseFinished (bib 57: Time="88.85" Pen="6" Total="94.85", Gates "2,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0"),
// resultsBr2 (K1M_BR2_19 bib 108: Time="91.64" Pen="0" Total="88.38" Rank="20"; Gates cells 12=2, 16=50, 20=50, 22=50 -> 152;
//   bib 89: Time="85.15" Pen="4" Total="89.15"), slalom.xml (BR2 bib 108: Time 91640 Pen 152 Total 243640 TotalTotal 88380 BetterRunNr 1).
describe('§4.3 outcome while on course', () => {
  it('§4.3 running: elapsedSeconds is OnCourse.Result[T]@Time, penaltySeconds is @Pen; as displayed, authoritative', () => {
    const o = obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'outcome');
    expect(o).toMatchObject({ attemptId: 'K1M_BR1_19:56', value: { kind: 'running', elapsedSeconds: 65, penaltySeconds: 0 }, confidence: 'authoritative', source: 'tcp' });
  });
  it('§4.3 duration inference at the finish: runSeconds = Time (88.85), penaltySeconds = sum of judged gates (2+2+2 = 6), total = sum (94.85); inferred', () => {
    const o = obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'outcome');
    expect(o).toMatchObject({ attemptId: 'K1M_BR1_19:57', value: { kind: 'duration', runSeconds: 88.85, penaltySeconds: 6, totalSeconds: 94.85 }, confidence: 'inferred', source: 'tcp' });
  });
  it('§4.3 the penalty is the sum of the gate cells, not OnCourse @Pen (Pen="6" replaced by "0", cells still sum 6)', () => {
    const o = obsOf(parseTcp(withAttr(TCP.onCourseFinished, 'Pen', '6', '0'), ctx()), 'outcome');
    expect(o?.value).toMatchObject({ penaltySeconds: 6, totalSeconds: 94.85 });
  });
  it('§4.3 judging incomplete is stated: 13 of 23 cells judged on the running listing -> judgingComplete false; all 23 judged at the finish -> true', () => {
    expect(obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'outcome')?.judgingComplete).toBe(false);
    expect(obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'outcome')?.judgingComplete).toBe(true);
  });
  it('§4.3 Completed="Y" is stated for the core (runClosed) and Completed="N" is not a close', () => {
    const closed = obsOf(parseTcp(withAttr(TCP.onCourseFinished, 'Completed', 'N', 'Y'), ctx()), 'outcome');
    const open = obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'outcome');
    expect(closed?.runClosed).toBe(true);
    expect(open?.runClosed).toBeFalsy();
  });
  it('§4.3 an on-course message never states a placement from OnCourse.Result[T]@Rank (see §4.7)', () => {
    const els = parseTcp(withAttr(TCP.onCourseFinished, 'Rank', '', '3'), ctx());
    expect((els as El[]).filter((e) => e.field === 'placement')).toEqual([]);
  });
  it('§4.3 before the finish there is no duration: an on-course listing without dtFinish never yields kind duration', () => {
    expect((parseTcp(TCP.onCourseRunning, ctx()) as El[]).filter((e) => e.field === 'outcome').every((e) => e.value.kind !== 'duration')).toBe(true);
  });
});

describe('§4.4 outcome from a result row', () => {
  it('§4.4 TCP single/first run: runSeconds = Time, penaltySeconds = Pen, totalSeconds = Total (K1M_BR1_19 bib 83: 87.30 / 0 / 87.30)', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83');
    expect(r.outcome).toEqual({ kind: 'duration', runSeconds: 87.3, penaltySeconds: 0, totalSeconds: 87.3 });
  });
  it('§4.4 TCP second run bib 108: run 2\'s own Time 91.64, penalty the sum of merged judged cells (152), total 243.64; never the row\'s Pen="0" or Total="88.38"', () => {
    const r = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108');
    expect(r.outcome).toEqual({ kind: 'duration', runSeconds: 91.64, penaltySeconds: 152, totalSeconds: 243.64 });
    expect(r.pairTotal).toBe(88.38);
  });
  it('§4.4 TCP second run bib 89: 85.15 + 4 = 89.15 (cells 1 and 22 are 2); pairTotal is the row\'s Total', () => {
    const r = rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '89');
    expect(r.outcome).toEqual({ kind: 'duration', runSeconds: 85.15, penaltySeconds: 4, totalSeconds: 89.15 });
    expect(r.pairTotal).toBe(89.15);
  });
  it('§4.4 second run: a combined Pen that disagrees with the cells is ignored (bib 89 Pen="4" replaced by "999")', () => {
    const r = rowOf(parseTcp(withAttr(TCP.resultsBr2.split('<Row ').filter((p, i) => i === 0 || p.includes('Bib="  89"')).join('<Row ') + '', 'Pen', '4', '999'), ctx()), 'K1M_BR2_19', '89');
    expect(r.outcome.penaltySeconds).toBe(4);
  });
  it('§4.4 second run with a blank gate cell: the penalty is the sum of the judged cells and judging is incomplete (bib 89, cell 22 blanked: sum 2)', () => {
    const only89 = TCP.resultsBr2.split('<Row ').filter((p, i) => i === 0 || p.includes('Bib="  89"')).join('<Row ');
    // cell 22 of the recorded Gates string is "  2"; blank it (same width)
    const g = only89.match(/Gates="([^"]*)"/)![1];
    const cells = g.match(/.{3}/g)!;
    cells[21] = '   ';
    const msg = only89.replace(g, cells.join(''));
    const r = rowOf(parseTcp(msg, ctx()), 'K1M_BR2_19', '89');
    expect(r.outcome.penaltySeconds).toBe(2);
    expect(r.judgingComplete).toBe(false);
  });
  it('§4.4 second run: judging complete when no cell is blank (bib 108, 23 judged cells)', () => {
    expect(rowOf(parseTcp(TCP.resultsBr2, ctx()), 'K1M_BR2_19', '108').judgingComplete).toBe(true);
  });
  it('§4.4 a TCP row carries no eventTime or finishTime (ADR-017 D1)', () => {
    for (const m of [TCP.resultsBr1, TCP.resultsBr2]) {
      const j = JSON.stringify(parseTcp(m, ctx()));
      expect(j).not.toContain('eventTime');
      expect(j).not.toContain('finishTime');
    }
  });
  it('§4.4 XML any row: runSeconds = Time/1000, penaltySeconds = Pen, totalSeconds = Total/1000 (BR2 bib 108: 91.64 / 152 / 243.64)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(r.outcome).toEqual({ kind: 'duration', runSeconds: 91.64, penaltySeconds: 152, totalSeconds: 243.64 });
  });
  it('§4.4 XML second-run row: pairTotal = TotalTotal/1000 (88.38), countingRun = BetterRunNr (1)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(r.pairTotal).toBe(88.38);
    expect(r.countingRun).toBe(1);
  });
  it('§4.4 XML countingRun 0 means no pair yet: not stated (first-run row BR1 bib 108 has BetterRunNr 0)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108');
    expect(r.countingRun === undefined || r.countingRun === null || r.countingRun?.state === 'not-yet').toBe(true);
  });
  it('§4.4 XML row eventTime/finishTime comes from dtFinish: BR2 bib 108 <dtFinish>11:11:52.840</dtFinish> = 09:11:52.840Z', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR2_19', '108');
    expect(instant(r.finishTime)).toBe(Date.UTC(2026, 8, 19, 9, 11, 52, 840));
  });
  it('§4.4 XML row judging complete when no cell blank (BR1 bib 108)', () => {
    expect(rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108').judgingComplete).toBe(true);
  });
  it('§4.4 untimed row (XML): placement present, no dtFinish -> outcome unavailable{not-applicable} whatever Time says (MX1J_XT_26_JUN bib 51: Time 100000, Rnk 31, no dtFinish)', () => {
    const r = rowOf(parseXmlSnapshot(xmlFixture('cross-untimed.xml'), ctx()), 'MX1J_XT_26_JUN', '51');
    expect(r.outcome).toEqual({ state: 'unavailable', reason: 'not-applicable' });
    expect(r.placement).toEqual({ rank: 31, order: 31 });
  });
  it('§4.4 before the first snapshot a TCP row is presumed timed (MX1J_XT_26_JUN Time="100.00" Rank="1" parsed alone -> duration 100)', () => {
    const r = rowOf(parseTcp(TCP.resultsJuniorXt, ctx()), 'MX1J_XT_26_JUN', '12');
    expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 100 });
  });
  it('§4.4 envelope: authoritative, source the channel', () => {
    // row-level fields are authoritative by construction; the observation form carries it, the snapshot row inherits from the snapshot source
    const s = (parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()) as El[]).find((e) => e.snapshot?.phaseId === 'K1M_BR1_19')!;
    expect(s.snapshot.source).toBe('xml');
  });
});
