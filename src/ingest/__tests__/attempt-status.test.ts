import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, statusOf, instant, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.1. Raw: onCourseRunning (nkz-19so bib 56, dtStart set, dtFinish ""), onCourseFinished (bib 57, dtFinish "9:55:46.920"),
// onCourseArmed (cp3-cross WX1_XT_26 bib 25, chStart="1", dtStart ""), resultsBr1Marks (bib 64/68 IRM="DNS"), slalom.xml BR2 bib 105 <Status>DNS</Status>.
const st = (msg: string, c = ctx()) => obsOf(parseTcp(msg, c), 'status');

describe('§4.1 status and result marks', () => {
  it('§4.1 the slalom finish: dtFinish becoming non-empty gives status finished, eventTime from §0.2, authoritative', () => {
    const o = st(TCP.onCourseFinished);
    expect(o).toMatchObject({ attemptId: 'K1M_BR1_19:57', value: 'finished', confidence: 'authoritative', source: 'tcp' });
    expect(instant(o?.eventTime)).toBe(Date.UTC(2026, 8, 19, 7, 55, 46, 920));
  });
  it('§4.1 on-course: dtStart non-empty and dtFinish empty (bib 56 dtStart="9:55:00.230")', () => {
    expect(st(TCP.onCourseRunning)).toMatchObject({ attemptId: 'K1M_BR1_19:56', value: 'on-course' });
  });
  it('§4.1 at-start: listed with dtStart empty (chStart="1", WX1_XT_26 bib 25)', () => {
    expect(st(TCP.onCourseArmed)).toMatchObject({ attemptId: 'WX1_XT_26:25', value: 'at-start' });
  });
  it('§4.1 chStart is the arming flag only: chStart="0" with no start is still at-start (synthetic variant of the recorded listing)', () => {
    expect(st(withAttr(TCP.onCourseArmed, 'chStart', '1', '0'))?.value).toBe('at-start');
  });
  it('§4.1 chFinish adds nothing: changing chFinish does not change status', () => {
    expect(st(withAttr(TCP.onCourseRunning, 'chFinish', '1', '0'))?.value).toBe('on-course');
    expect(st(withAttr(TCP.onCourseFinished, 'chFinish', '0', '1'))?.value).toBe('finished');
  });
  it('§4.1 no fallbacks: Time changing from whole seconds to 2 decimals while dtFinish is empty is not a finish (split hold, synthetic Time="65.12")', () => {
    expect(st(withAttr(TCP.onCourseRunning, 'Time', '65   ', '65.12'))?.value).toBe('on-course');
  });
  it('§4.1 the status observation is not provisional-marked as moving: it is an inference of kind inference with no result-row kind', () => {
    expect(st(TCP.onCourseFinished)).toMatchObject({ kind: 'inference' });
  });
  it('§4.1 a bare <OnCourse Total="0" Position="0"/> is upstream\'s explicit "course empty" (event oncourse-empty), no Attempt', () => {
    const els = parseTcp(TCP.onCourseEmpty, ctx()) as El[];
    expect(els.some((e) => e.event === 'oncourse-empty')).toBe(true);
    expect(els.some((e) => e.attemptId)).toBe(false);
  });
  it('§4.1 leaving the list is the core\'s timed rule (onCourseLeaveAfterSeconds): one OnCourse message never yields oncourse-left', () => {
    const els = parseTcp(TCP.onCourseRunning, ctx()) as El[];
    expect(els.some((e) => e.event === 'oncourse-left')).toBe(false);
  });

  describe('result marks, closed-set mapping (TCP Results.Result@IRM)', () => {
    const base = TCP.resultsBr1Marks; // bib 64 and 68, IRM="DNS"
    it.each([
      ['DNS', 'dns'], ['DNF', 'dnf'], ['CAP', 'cap'], ['RAL', 'ral'], ['DSQ', 'dsq'], ['DSQ-R', 'dsq-r'], ['DQB', 'dqb'],
    ])('§4.1 IRM=%s -> status %s and no outcome (round 20 code item 18: no-result is the core\'s presentation)', (irm, mark) => {
      const els = parseTcp(base.replace(/IRM="DNS"/g, `IRM="${irm}"`), ctx());
      expect(rowOf(els, 'K1M_BR1_19', '64').outcome).toBeUndefined();
      expect(statusOf(els, 'K1M_BR1_19', '64')).toBe(mark);
    });
    it('§4.1 IRM=NON-RK -> non-ranked, a finished run excluded from ranking', () => {
      const els = parseTcp(base.replace(/IRM="DNS"/g, 'IRM="NON-RK"'), ctx());
      expect(statusOf(els, 'K1M_BR1_19', '64')).toBe('non-ranked');
    });
    it('§4.1 any other IRM value maps to other (status other, no outcome)', () => {
      const els = parseTcp(base.replace(/IRM="DNS"/g, 'IRM="XYZ"'), ctx());
      expect(statusOf(els, 'K1M_BR1_19', '64')).toBe('other');
      expect(rowOf(els, 'K1M_BR1_19', '64').outcome).toBeUndefined();
    });
    it('§4.1 round 19 (code item 9): a row carrying a mark and a time emits the mark in status AND the time as outcome duration; no-result is the core\'s presentation (DNF on bib 55 which keeps Time="48.64")', () => {
      const msg = TCP.resultsBr1.replace('IRM=""', 'IRM="DNF"'); // bib 55 keeps Time="48.64" Rank="1"
      const r = rowOf(parseTcp(msg, ctx()), 'K1M_BR1_19', '55');
      expect(r.status).toBe('dnf');
      expect(r.outcome).toMatchObject({ kind: 'duration', runSeconds: 48.64 });
      expect(r.outcome).not.toMatchObject({ kind: 'no-result' });
    });
    it('§4.1 empty IRM with a time means finished: no mark, outcome duration', () => {
      const r = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83');
      expect(r.outcome.kind).toBe('duration');
      expect(['finished', undefined]).toContain(r.status);
    });
    it('§4.1 PP="*" means underReview true with the run otherwise finished (bib 83 with PP="*")', () => {
      const parts = TCP.resultsBr1.split('<Row ');
      parts[2] = parts[2].replace('PP=""', 'PP="*"');
      const msg = parts.join('<Row ');
      const r = rowOf(parseTcp(msg, ctx()), 'K1M_BR1_19', '83');
      expect(r.underReview).toBe(true);
      expect(r.outcome.kind).toBe('duration');
      expect(['finished', undefined]).toContain(r.status);
    });
    it('§4.1 upstream sends the * mark as empty IRM: IRM="" is never a mark', () => {
      const r = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '55');
      expect(r.underReview).toBeFalsy();
    });
    it('§4.1 on a second-run row a mark describes run 2 only; placement and pairTotal still come from the row (bib 108, IRM="DNF")', () => {
      const els = parseTcp(withAttr(TCP.resultsBr2, 'IRM', '', 'DNF'), ctx());
      const r = rowOf(els, 'K1M_BR2_19', '108');
      expect(r.status).toBe('dnf'); // round 19 (code item 9): the mark in status, the row's time beside it
      expect(r.outcome.kind).toBe('duration');
      expect(r.placement).toEqual({ rank: 20, order: 20 });
      expect(r.pairTotal).toBe(88.38);
    });
  });

  describe('result marks, XML.Results.Status', () => {
    it('§4.1 recorded <Status>DNS</Status> (K1M_BR2_19 bib 105) -> dns, no outcome (round 20 code item 18)', () => {
      const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
      expect(statusOf(els, 'K1M_BR2_19', '105')).toBe('dns');
      expect(rowOf(els, 'K1M_BR2_19', '105').outcome).toBeUndefined();
    });
    it.each([['DNF', 'dnf'], ['CAP', 'cap'], ['RAL', 'ral'], ['DSQ', 'dsq'], ['DSQ-R', 'dsq-r'], ['DQB', 'dqb'], ['NON-RK', 'non-ranked'], ['QQQ', 'other']])(
      '§4.1 XML Status=%s -> %s (synthetic variant of the recorded DNS row)', (s, mark) => {
        const x = xmlFixture('slalom.xml').replace('<Status>DNS</Status>', `<Status>${s}</Status>`);
        expect(statusOf(parseXmlSnapshot(x, ctx()), 'K1M_BR2_19', '105')).toBe(mark);
      });
    it('§4.1 XML Status * means underReview true (synthetic)', () => {
      const x = xmlFixture('slalom.xml').replace('<Status>DNS</Status>', '<Status>*</Status>');
      expect(rowOf(parseXmlSnapshot(x, ctx()), 'K1M_BR2_19', '105').underReview).toBe(true);
    });
    it('§4.1 empty XML Status with a time is finished (BR1 bib 108: <Status /> and <Time>88380</Time>)', () => {
      const r = rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108');
      expect(r.outcome.kind).toBe('duration');
      expect(['finished', undefined]).toContain(r.status);
    });
  });
});
