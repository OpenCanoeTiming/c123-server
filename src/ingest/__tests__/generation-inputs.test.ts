import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, rowOf, instant, withAttr, type El } from './helpers.js';

// DERIVATIONS §4.11, §4.12: what the parser SUPPLIES. Deciding a generation, a retraction, a contradiction or a stale mark is the core's (#203).
describe('§4.11 run generation inputs', () => {
  it('§4.11 an on-course listing states dtStart/dtFinish as the vector\'s onCourse value (bib 56: dtStart 9:55:00.230 = 07:55:00.230Z, dtFinish null)', () => {
    const o = obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'onCourse');
    expect(o).toMatchObject({ attemptId: 'K1M_BR1_19:56', source: 'tcp', kind: 'inference', confidence: 'authoritative' });
    expect(instant(o?.value.dtStart)).toBe(Date.UTC(2026, 8, 19, 7, 55, 0, 230));
    expect(o?.value.dtFinish).toBeNull();
  });
  it('§4.11 a finished listing states both (bib 57: dtStart 9:54:18.070, dtFinish 9:55:46.920)', () => {
    const o = obsOf(parseTcp(TCP.onCourseFinished, ctx()), 'onCourse');
    expect(instant(o?.value.dtStart)).toBe(Date.UTC(2026, 8, 19, 7, 54, 18, 70));
    expect(instant(o?.value.dtFinish)).toBe(Date.UTC(2026, 8, 19, 7, 55, 46, 920));
  });
  it('§4.11 an empty dtStart is null, not an instant (armed listing)', () => {
    expect(obsOf(parseTcp(TCP.onCourseArmed, ctx()), 'onCourse')?.value).toEqual({ dtStart: null, dtFinish: null });
  });
  it('§4.11 the generation decision is the core\'s: a single listing yields no run observation', () => {
    expect((parseTcp(TCP.onCourseRunning, ctx()) as El[]).filter((e) => e.field === 'run')).toEqual([]);
  });
  it('§4.11 the localised Warning text is never carried', () => {
    expect(JSON.stringify(parseTcp(withAttr(TCP.onCourseRunning, 'Warning', '', 'Přepis výsledků!'), ctx()))).not.toContain('Přepis');
  });
  it('§4.11 attribution input: a TCP row states runSeconds (87.30) and no finish time; the XML row states dtFinish', () => {
    const t = rowOf(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19', '83');
    expect(t.outcome.runSeconds).toBe(87.3);
    expect(t).not.toHaveProperty('finishTime');
    expect(rowOf(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()), 'K1M_BR1_19', '108').finishTime).toBeDefined();
  });
  it('§4.11 a TCP row carrying a mark and no time states the mark only (DNS row: no runSeconds), for the stale-mark rule', () => {
    const r = rowOf(parseTcp(TCP.resultsBr1Marks, ctx()), 'K1M_BR1_19', '64');
    expect(r.status).toBe('dns');
    expect(JSON.stringify(r)).not.toContain('runSeconds');
  });
});

describe('§4.12 retraction and contradiction inputs', () => {
  it('§4.12 first-run row cleared in place (no time, no mark, no rank): the row states no result (synthetic: bib 83 with Time, Total, Pen, Gates, Rank cleared)', () => {
    let m = TCP.resultsBr1.split('<Row ').filter((p, i) => i === 0 || p.includes('Bib="  83"')).join('<Row ');
    m = withAttr(withAttr(withAttr(withAttr(m, 'Time', '87.30', ''), 'Total', '87.30', ''), 'Rank', '2', ''), 'Pen', '0', '');
    const g = m.match(/Gates="([^"]*)"/)![1];
    m = m.replace(g, '');
    const r = rowOf(parseTcp(m, ctx()), 'K1M_BR1_19', '83');
    expect(r.outcome).toBeUndefined();
    expect(r.placement ?? null).toBeNull();
    expect(r.status).toBeUndefined();
  });
  it('§4.12 second-run row with Time empty and IRM empty: timeEmpty, placement and pairTotal still from the row (synthetic: bib 108 with Time and gates cleared)', () => {
    let m = TCP.resultsBr2.split('<Row ').filter((p, i) => i === 0 || p.includes('Bib=" 108"') || p.includes('Bib="108"')).join('<Row ');
    if (!m.includes('Id="9047.K1M"')) throw new Error('fixture row missing');
    m = withAttr(m, 'Time', '91.64', '');
    const g = m.match(/Gates="([^"]*)"/)![1];
    m = m.replace(g, '');
    const r = rowOf(parseTcp(m, ctx()), 'K1M_BR2_19', '108');
    expect(r.timeEmpty).toBe(true);
    expect(r.outcome).toBeUndefined();
    expect(r.placement).toEqual({ rank: 20, order: 20 });
    expect(r.pairTotal).toBe(88.38);
  });
  it('§4.12 an XML row with no time, no finish time and no mark states nothing (retraction input): BR1 bib 108 with those elements removed', () => {
    const x = xmlFixture('slalom.xml').replace(/(<RaceId>K1M_BR1_19<\/RaceId>[\s\S]*?)<dtFinish>[^<]*<\/dtFinish>\s*<Time>[^<]*<\/Time>/, '$1');
    const r = rowOf(parseXmlSnapshot(x, ctx()), 'K1M_BR1_19', '108');
    expect(r.outcome === undefined || r.outcome.kind === undefined || r.outcome.kind === 'pending').toBe(true);
    expect(r.finishTime).toBeUndefined();
    expect(r.status).toBeUndefined();
  });
  it('§4.12 a start-list-mode TCP message is stated as mode start-list (INV-7 input: every result of the race deleted)', () => {
    const m = TCP.resultsStartList;
    expect((parseTcp(m, ctx()) as El[]).find((e) => e.snapshot)!.snapshot.mode).toBe('start-list');
  });
  it('§4.12 contradiction input: a listing with dtStart and an empty dtFinish states onCourse {dtStart, dtFinish: null}', () => {
    expect(obsOf(parseTcp(TCP.onCourseRunning, ctx()), 'onCourse')?.value.dtFinish).toBeNull();
  });
  it('§4.12 duplicate-finish and stale-mark and contradicted-finish are core diagnostics: the parser raises none from one message', () => {
    const els = [...parseTcp(TCP.resultsBr1Marks, ctx()), ...parseTcp(TCP.onCourseFinished, ctx()), ...parseXmlSnapshot(xmlFixture('slalom.xml'), ctx())] as El[];
    expect(els.filter((e) => e.diagnostic && ['duplicate-finish', 'stale-mark', 'contradicted-finish'].includes(e.diagnostic.kind))).toEqual([]);
  });
});
