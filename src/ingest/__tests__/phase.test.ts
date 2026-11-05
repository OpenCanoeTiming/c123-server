import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, allObs, instant, type El } from './helpers.js';

// DERIVATIONS §2.1, §2.2 and CONTRACTS §2.4 (token table), §3.1 (status table).
const slalom = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
const cross = () => parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
const ph = (els: unknown, field: string, phaseId: string): El | undefined => obsOf(els as any, field, { phaseId });
/** A TCP Schedule message of the recorded shape (nkz-19so 003 ts 8117) with the given races, synthetic content. */
const schedule = (races: Array<{ id: string; status?: number | string; order?: number }>): string =>
  '<Canoe123 System="Main"><Schedule>' +
  races.map((r, i) => `<Race Order="${r.order ?? i + 1}" RaceId="${r.id}" Race="x" MainTitle="x" SubTitle="x" ShortTitle="x" RaceStatus="${r.status ?? 0}"><StartTime /></Race>`).join('') +
  '</Schedule></Canoe123>';

describe('§2.1 Phase identity and structure', () => {
  it('§2.1 phaseId is RaceId verbatim (XML Schedule K1M_BR2_19)', () => {
    expect(ph(slalom(), 'format', 'K1M_BR2_19')).toBeDefined();
  });
  it('§2.1 format is XML.Schedule.DisId (BR2), classId is Schedule.ClassId', () => {
    expect(ph(slalom(), 'format', 'K1M_BR2_19')).toMatchObject({ value: 'BR2', source: 'xml' });
    expect(ph(slalom(), 'classId', 'K1M_BR2_19')?.value).toBe('K1M');
  });
  it('§2.1 TCP Schedule has no DisId: format falls back to the RaceId token between class and day number (K1M_BR1_19 -> BR1)', () => {
    const els = parseTcp(TCP.scheduleSlalom, ctx());
    expect(ph(els, 'format', 'K1M_BR1_19')).toMatchObject({ value: 'BR1', source: 'tcp' });
    expect(ph(els, 'format', 'FOR_BR1_19')?.value).toBe('BR1');
  });
  it('§2.1 an attribute sub-race keeps the token before the day number (WX1J_XT_26_JUN -> XT)', () => {
    expect(ph(parseTcp(TCP.scheduleCross, ctx()), 'format', 'WX1J_XT_26_JUN')?.value).toBe('XT');
    expect(ph(cross(), 'format', 'WX1J_XT_26_JUN')?.value).toBe('XT');
  });
  it('§2.1 an attribute sub-race is an ordinary separate Class and Phase: classId is WX1J as given, no base-class link', () => {
    const els = cross();
    expect(ph(els, 'classId', 'WX1J_XT_26_JUN')?.value).toBe('WX1J');
    expect(JSON.stringify(els)).not.toMatch(/baseClass|parentClass/);
  });
  it.each([
    ['BR1', 'run', 'race', 'duration', { role: 'first', combination: 'best' }, false],
    ['BR2', 'run', 'race', 'duration', { role: 'second', combination: 'best' }, false],
    ['HT1', 'run', 'race', 'duration', { role: 'first', combination: 'best' }, false],
    ['HT2', 'run', 'race', 'duration', { role: 'second', combination: 'best' }, false],
    ['EL1', 'run', 'race', 'duration', { role: 'first', combination: 'best' }, false],
    ['EL2', 'run', 'race', 'duration', { role: 'second', combination: 'best' }, false],
    ['TR1', 'run', 'race', 'duration', { role: 'first', combination: 'best' }, false],
    ['TR2', 'run', 'race', 'duration', { role: 'second', combination: 'best' }, false],
    ['SR1', 'run', 'race', 'duration', { role: 'first', combination: 'sum' }, false],
    ['SR2', 'run', 'race', 'duration', { role: 'second', combination: 'sum' }, false],
    ['QF', 'quarter-final', 'race', 'duration', null, false],
    ['SF', 'semi-final', 'race', 'duration', null, false],
    ['SFB', 'semi-final', 'race', 'duration', null, false],
    ['FI', 'final', 'race', 'duration', null, false],
    ['FIB', 'final', 'race', 'duration', null, false],
    ['SPF', 'final', 'race', 'duration', null, false],
    ['TSF', 'final', 'race', 'duration', null, false],
    ['TFI', 'final', 'race', 'duration', null, false],
    ['TSR', 'run', 'race', 'duration', null, false],
    ['XT', 'time-trial', 'race', 'duration', null, false],
    ['XT1', 'time-trial', 'race', 'duration', null, false],
    ['XT2', 'time-trial', 'race', 'duration', null, false],
    ['X8', 'heats', 'race', 'ordinal', null, true],
    ['X4', 'quarter-final', 'race', 'ordinal', null, true],
    ['XS', 'semi-final', 'race', 'ordinal', null, true],
    ['XF', 'final', 'race', 'ordinal', null, true],
    ['XER', 'classification', 'classification', 'ordinal', null, false],
    ['SLER', 'classification', 'classification', 'ordinal', null, false],
    ['WWER', 'classification', 'classification', 'ordinal', null, false],
    ['SUF', 'super-final', 'race', 'duration', { role: 'second', combination: 'sum' }, false],
    ['ZZZ9', 'run', 'race', 'duration', null, false],
  ])('§2.1 CONTRACTS §2.4 token %s: stage %s, kind %s, scoringKind %s, pair %j, heats %s (authoritative lookup)', (tok, stage, kind, scoring, pair, heats) => {
    const id = `K1M_${tok}_19`;
    // pair siblings present for the tokens that pair, so siblingPhaseId can be checked
    const sib: Record<string, string> = { BR1: 'BR2', BR2: 'BR1', HT1: 'HT2', HT2: 'HT1', EL1: 'EL2', EL2: 'EL1', TR1: 'TR2', TR2: 'TR1', SR1: 'SR2', SR2: 'SR1', SUF: 'BR2' };
    const races = [{ id }];
    if (sib[tok as string]) races.push({ id: `K1M_${sib[tok as string]}_19` });
    const els = parseTcp(schedule(races), ctx({ phaseDates: {} }));
    expect(ph(els, 'stage', id)).toMatchObject({ value: stage, confidence: 'authoritative' });
    expect(ph(els, 'kind', id)?.value).toBe(kind);
    expect(ph(els, 'scoringKind', id)?.value).toBe(scoring);
    expect(ph(els, 'heats', id)?.value).toBe(heats);
    const pairV = ph(els, 'pair', id)?.value;
    if (pair === null) expect(pairV ?? null).toBeNull();
    else expect(pairV).toMatchObject({ ...pair, siblingPhaseId: `K1M_${sib[tok as string]}_19` });
  });
  it('§2.1 pair.siblingPhaseId is the same class\'s first-run token Phase (XML: K1M_BR2_19 -> K1M_BR1_19, combination best)', () => {
    expect(ph(slalom(), 'pair', 'K1M_BR2_19')?.value).toEqual({ role: 'second', siblingPhaseId: 'K1M_BR1_19', combination: 'best' });
    expect(ph(slalom(), 'pair', 'K1M_BR1_19')?.value).toMatchObject({ role: 'first', siblingPhaseId: 'K1M_BR2_19' });
  });
  it('§2.1 several first runs exist: the sibling is the one with the same schedule date (K1M_BR2_19 pairs with K1M_BR1_19, not K1M_BR1_20)', () => {
    const els = parseTcp(schedule([{ id: 'K1M_BR1_20' }, { id: 'K1M_BR1_19' }, { id: 'K1M_BR2_19' }]), ctx({ phaseDates: { K1M_BR1_19: '2026-09-19', K1M_BR1_20: '2026-09-20', K1M_BR2_19: '2026-09-19' } }));
    expect((ph(els, 'pair', 'K1M_BR2_19')?.value as El).siblingPhaseId).toBe('K1M_BR1_19');
  });
  it('§2.1 date is the date part of XML.Schedule.StartTime (2026-09-19T11:04:20+02:00), source xml, authoritative', () => {
    expect(ph(slalom(), 'date', 'K1M_BR2_19')).toMatchObject({ value: '2026-09-19', source: 'xml', confidence: 'authoritative' });
  });
  it('§2.1 TCP Schedule StartTime is always empty and is never a source for date or scheduledStart', () => {
    const els = parseTcp(TCP.scheduleSlalom, ctx());
    expect(ph(els, 'scheduledStart', 'K1M_BR1_19')).toBeUndefined();
    expect(allObs(els, 'date').filter((o) => o.source === 'xml' || o.confidence === 'authoritative')).toEqual([]);
  });
  it('§2.1 scheduledStart is XML.Schedule.StartTime whole (2026-09-19T11:04:20+02:00)', () => {
    expect(instant(ph(slalom(), 'scheduledStart', 'K1M_BR2_19')?.value)).toBe(Date.UTC(2026, 8, 19, 9, 4, 20));
  });
  it('§2.1 programmeOrder is XML.Schedule.RaceOrder (4) and Schedule.Race@Order on TCP (K1M_BR1_19 Order="2")', () => {
    expect(ph(slalom(), 'programmeOrder', 'K1M_BR2_19')?.value).toBe(4);
    expect(ph(parseTcp(TCP.scheduleSlalom, ctx()), 'programmeOrder', 'K1M_BR1_19')).toMatchObject({ value: 2, source: 'tcp' });
  });
  it('§2.1 title is XML.Schedule.CustomTitle ("K1 muži 2. jízda")', () => {
    expect(ph(slalom(), 'title', 'K1M_BR2_19')?.value).toBe('K1 muži 2. jízda');
  });
  it('§2.1 title is not-yet where CustomTitle is empty (the sentinel-free recorded WX1J_XS_26_JUN row has CustomTitle; empty one is synthetic)', () => {
    const x = xmlFixture('cross.xml').replace('<CustomTitle>WX1 JUN Semifinal</CustomTitle>', '<CustomTitle />');
    expect(ph(parseXmlSnapshot(x, ctx()), 'title', 'WX1J_XS_26_JUN')).toEqual(expect.objectContaining({ state: 'not-yet' }));
  });
  it('§2.1 generated, localised titles (Race, SubTitle, ShortTitle, MainTitle of TCP Schedule) are never carried as Phase title', () => {
    const els = parseTcp(TCP.scheduleSlalom, ctx());
    expect(ph(els, 'title', 'K1M_BR1_19')).toBeUndefined();
    expect(JSON.stringify(els)).not.toContain('1st Run');
  });
  it('§2.1 courseId is XML.Schedule.CourseNr ("1"); no TCP message carries a course number', () => {
    expect(ph(slalom(), 'courseId', 'K1M_BR2_19')?.value).toBe('1');
    expect(allObs(parseTcp(TCP.scheduleSlalom, ctx()), 'courseId')).toEqual([]);
    expect(allObs(parseTcp(TCP.raceConfigSlalom, ctx()), 'courseId').filter((o) => o.resource === 'phase')).toEqual([]);
  });
  it('§2.1 a classification Phase has courseId not-applicable (CONTRACTS §2.4), XER row of cross.xml', () => {
    // CONTRACTS §2.4: "not-applicable for a classification". The XER schedule row carries <CourseNr>1</CourseNr> in the recording.
    expect(ph(cross(), 'courseId', 'WX1_XER_26')).toMatchObject({ state: 'unavailable', reason: 'not-applicable' });
  });
});

describe('§2.2 Phase status', () => {
  it.each([
    [0, 'scheduled'], [1, 'scheduled'], [8, 'scheduled'], [12, 'scheduled'],
    [3, 'running'], [2, 'paused'], [11, 'paused'], [4, 'unofficial'], [9, 'unofficial'],
    [5, 'official'], [6, 'revised'], [10, 'protested'], [13, 'postponed'], [7, 'cancelled'],
    [14, 'other'], [99, 'other'],
  ])('§2.2 CONTRACTS §3.1: TCP Schedule RaceStatus=%s maps to %s', (n, closed) => {
    const els = parseTcp(schedule([{ id: 'K1M_BR1_19', status: n as number }]), ctx());
    const o = obsOf(els, 'status', { phaseId: 'K1M_BR1_19' });
    expect(o).toMatchObject({ value: closed, source: 'tcp', confidence: 'authoritative' });
    expect(o?.scope).toBe('phase');
  });
  it('§2.2 recorded TCP Schedule (nkz-19so): FOR_BR1_19 RaceStatus="4" unofficial, K1M_BR1_19 "3" running, C1W_BR1_19 "1" scheduled', () => {
    const els = parseTcp(TCP.scheduleSlalom, ctx());
    expect(obsOf(els, 'status', { phaseId: 'FOR_BR1_19' })?.value).toBe('unofficial');
    expect(obsOf(els, 'status', { phaseId: 'K1M_BR1_19' })?.value).toBe('running');
    expect(obsOf(els, 'status', { phaseId: 'C1W_BR1_19' })?.value).toBe('scheduled');
  });
  it('§2.2 recorded TCP Schedule (cp3-cross): WX1J_XT_26_JUN RaceStatus="7" cancelled', () => {
    expect(obsOf(parseTcp(TCP.scheduleCross, ctx()), 'status', { phaseId: 'WX1J_XT_26_JUN' })?.value).toBe('cancelled');
  });
  it('§2.2 XML.Schedule.RaceStatus: 5 official (K1M_BR1_19), 3 running (K1M_BR2_19), source xml', () => {
    expect(obsOf(slalom(), 'status', { phaseId: 'K1M_BR1_19' })).toMatchObject({ value: 'official', source: 'xml', scope: 'phase' });
    expect(obsOf(slalom(), 'status', { phaseId: 'K1M_BR2_19' })?.value).toBe('running');
  });
  it('§2.2 RaceConfig carries no race status: a RaceConfig message yields no Phase status', () => {
    expect(allObs(parseTcp(TCP.raceConfigSlalom, ctx()), 'status')).toEqual([]);
  });
});
