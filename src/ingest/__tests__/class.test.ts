import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, allObs, type El } from './helpers.js';

// DERIVATIONS §1. Fixtures: slalom.xml (nkz-19so snapshot), cross.xml (cp3-cross snapshot), TCP Results header.
const slalom = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
const cross = () => parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
const miniXml = (classes: string, schedule: string) =>
  `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${classes}${schedule}</Canoe123Data>`;

describe('§1 Class', () => {
  it('§1 classId and code are XML.Classes.ClassId verbatim, source xml, authoritative, no eventTime', () => {
    const o = obsOf(slalom(), 'code', { classId: 'K1M' });
    expect(o).toMatchObject({ value: 'K1M', source: 'xml', confidence: 'authoritative' });
    expect(o).not.toHaveProperty('eventTime');
  });
  it('§1 classId on TCP is Results.ClassId verbatim (ClassId="K1M")', () => {
    const els = parseTcp(TCP.resultsBr1, ctx());
    expect(obsOf(els, 'code', { classId: 'K1M' })).toMatchObject({ value: 'K1M', source: 'tcp' });
  });
  it('§1 classId is never the RaceId prefix: ClassId="K1M-ST" with RaceId "K1M_ST_BR1_19" gives "K1M-ST" (synthetic header, recorded shape)', () => {
    const msg = TCP.resultsBr1.replace('RaceId="K1M_BR1_19" ClassId="K1M"', 'RaceId="K1M_ST_BR1_19" ClassId="K1M-ST"');
    const els = parseTcp(msg, ctx());
    expect(obsOf(els, 'code', { classId: 'K1M-ST' })?.value).toBe('K1M-ST');
    expect(obsOf(els, 'code', { classId: 'K1M_ST' })).toBeUndefined();
  });
  it('§1 name is XML.Classes.Class ("K1 muži"), source xml', () => {
    expect(obsOf(slalom(), 'name', { classId: 'K1M' })).toMatchObject({ value: 'K1 muži', source: 'xml', confidence: 'authoritative' });
  });
  it('§1 name is the organiser text verbatim, not LongTitle (cross class WX1: Class "Women\'s X1", LongTitle "Women\'s Kayak Cross")', () => {
    expect(obsOf(cross(), 'name', { classId: 'WX1' })?.value).toBe("Women's X1");
  });
  it('§1 name falls back to Results.MainTitle on TCP (MainTitle="K1 muži"), source tcp', () => {
    expect(obsOf(parseTcp(TCP.resultsBr1, ctx()), 'name', { classId: 'K1M' })).toMatchObject({ value: 'K1 muži', source: 'tcp' });
  });
  it('§1 discipline is slalom for a class whose Phases have slalom formats (K1M: BR1, BR2), confidence inferred', () => {
    expect(obsOf(slalom(), 'discipline', { classId: 'K1M' })).toMatchObject({ value: 'slalom', confidence: 'inferred' });
  });
  it('§1 discipline is cross for a class with a Cross-format Phase (WX1: XT, XER) even though Events.CanoeDiscipline reads Slalom', () => {
    expect(xmlFixture('cross.xml')).toContain('<CanoeDiscipline>Slalom</CanoeDiscipline>');
    expect(obsOf(cross(), 'discipline', { classId: 'WX1' })).toMatchObject({ value: 'cross', confidence: 'inferred' });
  });
  it('§1 discipline: any one Cross format makes the class cross (XS alone, synthetic Schedule of the recorded shape)', () => {
    const x = miniXml('<Classes><ClassId>ZZ1</ClassId><Class>ZZ</Class></Classes>',
      '<Schedule><RaceId>ZZ1_BR1_19</RaceId><ClassId>ZZ1</ClassId><DisId>BR1</DisId></Schedule><Schedule><RaceId>ZZ1_XS_19</RaceId><ClassId>ZZ1</ClassId><DisId>XS</DisId></Schedule>');
    expect(obsOf(parseXmlSnapshot(x, ctx()), 'discipline', { classId: 'ZZ1' })?.value).toBe('cross');
  });
  it.each(['SLER', 'WWER'])('§1 review O1: a slalom class with a %s Phase is not cross (BR1 + classification token; only XER is a Cross classification)', (tok) => {
    const x = miniXml('<Classes><ClassId>ZZ1</ClassId><Class>ZZ</Class></Classes>',
      `<Schedule><RaceId>ZZ1_BR1_19</RaceId><ClassId>ZZ1</ClassId><DisId>BR1</DisId></Schedule><Schedule><RaceId>ZZ1_${tok}_19</RaceId><ClassId>ZZ1</ClassId><DisId>${tok}</DisId></Schedule>`);
    expect(obsOf(parseXmlSnapshot(x, ctx()), 'discipline', { classId: 'ZZ1' })).toMatchObject({ value: 'slalom', confidence: 'inferred' });
  });
  it('§1 review O1: XER is on the Cross list of §1, so BR1 + XER is cross (the boundary is SLER/WWER, not the whole classification family)', () => {
    const x = miniXml('<Classes><ClassId>ZZ1</ClassId><Class>ZZ</Class></Classes>',
      '<Schedule><RaceId>ZZ1_BR1_19</RaceId><ClassId>ZZ1</ClassId><DisId>BR1</DisId></Schedule><Schedule><RaceId>ZZ1_XER_19</RaceId><ClassId>ZZ1</ClassId><DisId>XER</DisId></Schedule>');
    expect(obsOf(parseXmlSnapshot(x, ctx()), 'discipline', { classId: 'ZZ1' })?.value).toBe('cross');
  });
  it('§1 ageCategories from XML.Classes/Categories: id and name only (K1M: 8 rows, ZM "Žáci mladší" first, SV "Super veteráni" last)', () => {
    const v = obsOf(slalom(), 'ageCategories', { classId: 'K1M' })?.value as El[];
    expect(v).toHaveLength(8);
    expect(v[0]).toEqual({ ageCategoryId: 'ZM', name: 'Žáci mladší' });
    expect(v[7]).toEqual({ ageCategoryId: 'SV', name: 'Super veteráni' });
  });
  it('§1 the age bounds (FirstYear/LastYear) are not modelled', () => {
    expect(JSON.stringify(slalom())).not.toMatch(/FirstYear|LastYear|firstYear|lastYear/);
  });
  it('§1 ageCategories for the cross class WX1 are U23, U18, U16 in file order', () => {
    const v = obsOf(cross(), 'ageCategories', { classId: 'WX1' })?.value as El[];
    expect(v.map((c) => c.ageCategoryId)).toEqual(['U23', 'U18', 'U16']);
  });
  it('§1 a class with no Categories rows has an empty list, a known value (synthetic)', () => {
    const x = miniXml('<Classes><ClassId>ZZ1</ClassId><Class>ZZ</Class></Classes>', '');
    const o = obsOf(parseXmlSnapshot(x, ctx()), 'ageCategories', { classId: 'ZZ1' });
    expect(o).toMatchObject({ value: [] });
    expect(o).not.toHaveProperty('state');
  });
  it('§1 one Class per ClassId (no duplicates from several Phases)', () => {
    expect(allObs(slalom(), 'name').filter((o) => o.classId === 'K1M')).toHaveLength(1);
  });
});
