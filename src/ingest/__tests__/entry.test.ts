import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, obsOf, allObs, type El } from './helpers.js';

// DERIVATIONS §3. Real: slalom.xml participant 9047.K1M, cross.xml participant 121081.WX1, TCP Results rows.
// Synthetic (no recording has them, stated in DERIVATIONS): a two-person crew, a team with Member1..3, a participant without ICFId.
const slalom = () => parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
const cross = () => parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
const en = (els: unknown, field: string, entryId: string): El | undefined => obsOf(els as any, field, { entryId });
const mini = (participants: string): string =>
  `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd"><Events><EventId>E</EventId><IDHandling>USER</IDHandling><BibHandling>EventWide</BibHandling></Events>${participants}</Canoe123Data>`;
const person = (id: string, o: Record<string, string> = {}): string =>
  `<Participants><Id>${id}</Id><ClassId>${o.cls ?? 'C2M'}</ClassId>${o.icf ? `<ICFId>${o.icf}</ICFId>` : ''}<FamilyName>${o.fam ?? 'FAM'}</FamilyName><GivenName>${o.giv ?? 'Giv'}</GivenName>${o.fam2 ? `<FamilyName2>${o.fam2}</FamilyName2><GivenName2>${o.giv2}</GivenName2>${o.icf2 ? `<ICFId2>${o.icf2}</ICFId2>` : ''}<Birthdate2>${o.bd2 ?? ''}</Birthdate2>` : ''}<Club>${o.club ?? 'Klub'}</Club>${o.bd ? `<Birthdate>${o.bd}</Birthdate>` : ''}<IsTeam>${o.team ?? 'false'}</IsTeam>${o.members ?? ''}</Participants>`;

describe('§3 Entry', () => {
  it('§3 entryId is XML.Participants.Id verbatim (9047.K1M)', () => {
    expect(en(slalom(), 'displayName', '9047.K1M') ?? en(slalom(), 'club', '9047.K1M')).toBeDefined();
  });
  it('§3 entryId on TCP is Participant@Id verbatim and never parsed: a hand-typed id "X 7/b" is kept whole (synthetic Id on a recorded row)', () => {
    const msg = TCP.resultsBr1.replace('Id="14034.K1M"', 'Id="X 7/b"');
    const r = (parseTcp(msg, ctx()) as El[]).find((e) => e.snapshot)!.snapshot.rows.find((x: El) => x.bib === '55');
    expect(r.entry).toMatchObject({ entryId: 'X 7/b' });
  });
  it('§3 displayName on TCP is the pre-assembled Participant@Name (Name="KLIMEŠ Vít")', () => {
    expect(en(parseTcp(TCP.resultsBr1, ctx()), 'displayName', '14034.K1M')).toMatchObject({ value: 'KLIMEŠ Vít', source: 'tcp' });
  });
  it('§3 single boat members from XML: given, family, birthDate as entered (2008-01-01), externalId from ICFId with scheme from configuration', () => {
    const m = en(slalom(), 'members', '9047.K1M')?.value as El[];
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ givenName: 'Matěj', familyName: 'KRÁL', birthDate: '2008-01-01', externalId: { scheme: 'cz-rgc', value: '9047' } });
  });
  it('§3 the scheme is configuration, never derived: a different ctx scheme is used verbatim', () => {
    const m = en(parseXmlSnapshot(xmlFixture('slalom.xml'), ctx({ externalIdScheme: 'icf' })), 'members', '9047.K1M')?.value as El[];
    expect(m[0].externalId).toEqual({ scheme: 'icf', value: '9047' });
  });
  it('§3 a two-person crew: second member from GivenName2/FamilyName2/Birthdate2/ICFId2 (synthetic)', () => {
    const x = mini(person('1.C2M', { fam: 'AAA', giv: 'Bob', icf: '11', fam2: 'BBB', giv2: 'Carl', icf2: '22', bd: '2000-01-01T00:00:00+01:00', bd2: '2001-01-01T00:00:00+01:00' }));
    const m = en(parseXmlSnapshot(x, ctx()), 'members', '1.C2M')?.value as El[];
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ familyName: 'AAA', externalId: { value: '11' } });
    expect(m[1]).toMatchObject({ givenName: 'Carl', familyName: 'BBB', birthDate: '2001-01-01', externalId: { value: '22' } });
  });
  it('§3 isTeam false for a C2 double (synthetic crew)', () => {
    const x = mini(person('1.C2M', { fam2: 'BBB', giv2: 'Carl' }));
    expect(en(parseXmlSnapshot(x, ctx()), 'isTeam', '1.C2M')?.value).toBe(false);
  });
  it('§3 a team: members resolved from Member1..3 ids by whole-string match against the participants index; the team\'s own ICFId is not carried (synthetic)', () => {
    const team = person('T.K1MT', { cls: 'K1MT', fam: 'Team Klub', giv: '', icf: '999', team: 'true', members: '<Member1>10.K1M</Member1><Member2>20.K1M</Member2><Member3>30.K1M</Member3>' });
    const x = mini(person('10.K1M', { fam: 'ONE', giv: 'A', icf: '1' }) + person('20.K1M', { fam: 'TWO', giv: 'B', icf: '2' }) + person('30.K1M', { fam: 'THREE', giv: 'C', icf: '3' }) + team);
    const els = parseXmlSnapshot(x, ctx());
    const m = en(els, 'members', 'T.K1MT')?.value as El[];
    expect(m.map((p) => p.familyName)).toEqual(['ONE', 'TWO', 'THREE']);
    expect(m.map((p) => p.externalId?.value)).toEqual(['1', '2', '3']);
    expect(en(els, 'isTeam', 'T.K1MT')?.value).toBe(true);
    expect(JSON.stringify(m)).not.toContain('999');
  });
  it('§3 member references are matched whole, never parsed: ids "10.K1M" and "110.K1M" are different people', () => {
    const team = person('T.K1MT', { cls: 'K1MT', team: 'true', members: '<Member1>110.K1M</Member1>' });
    const x = mini(person('10.K1M', { fam: 'WRONG' }) + person('110.K1M', { fam: 'RIGHT' }) + team);
    const m = en(parseXmlSnapshot(x, ctx()), 'members', 'T.K1MT')?.value as El[];
    expect(m.map((p) => p.familyName)).toEqual(['RIGHT']);
  });
  it('§3 round 17 ruling 27: no per-member envelope: an absent ICFId is externalId null inside the known members value, and no members[0].externalId element exists', () => {
    const x = mini(person('5.K1M', { cls: 'K1M' }));
    const els = parseXmlSnapshot(x, ctx());
    const o = en(els, 'members', '5.K1M');
    expect(o).not.toHaveProperty('state');
    expect((o?.value as El[])[0]).toHaveProperty('externalId', null);
    expect(JSON.stringify(els)).not.toContain('members[0]');
  });
  it('§3 TCP carries no registry number: no externalId in any element of a Results message', () => {
    expect(JSON.stringify(parseTcp(TCP.resultsBr1, ctx()))).not.toMatch(/externalId|ICFId|icf/i);
  });
  it('§3 birthDate is as entered, year-only entries stay YYYY-01-01 (cross.xml 121081.WX1 Birthdate 2009-01-01T00:00:00+01:00)', () => {
    const m = en(cross(), 'members', '121081.WX1')?.value as El[];
    expect(m[0].birthDate).toBe('2009-01-01');
  });
  it('§3 club is XML.Participants.Club ("USK Pha") and Results.Participant@Club on TCP ("Kralupy" for bib 55)', () => {
    expect(en(slalom(), 'club', '9047.K1M')).toMatchObject({ value: 'USK Pha', source: 'xml' });
    expect(en(parseTcp(TCP.resultsBr1, ctx()), 'club', '14034.K1M')).toMatchObject({ value: 'Kralupy', source: 'tcp' });
  });
  it('§3 club and nation are never read from OnCourse.Participant@Club (OnCourse Club="Horš.Týn")', () => {
    const els = parseTcp(TCP.onCourseFinished, ctx());
    expect(allObs(els, 'club')).toEqual([]);
    expect(allObs(els, 'nation')).toEqual([]);
    expect(JSON.stringify(els)).not.toContain('Horš.Týn');
  });
  it('§3 nation: an empty NOC / Nat is absent, never an empty string (XML <NOC />, TCP Nat="")', () => {
    const n = en(cross(), 'nation', '121081.WX1');
    expect(n === undefined || n.state !== undefined || n.value !== '').toBe(true);
    expect(allObs(parseTcp(TCP.resultsBr1, ctx()), 'nation').filter((o) => o.value === '')).toEqual([]);
  });
  it('§3 nation from XML.Participants.NOC when set (synthetic <NOC>CZE</NOC>)', () => {
    const x = mini(person('5.K1M', {}).replace('<Club>', '<NOC>CZE</NOC><Club>'));
    expect(en(parseXmlSnapshot(x, ctx()), 'nation', '5.K1M')?.value).toBe('CZE');
  });
  it('§3 ageCategoryId is XML.Participants.CatId ("DS"), never computed from the birth year', () => {
    expect(en(slalom(), 'ageCategoryId', '9047.K1M')?.value).toBe('DS');
  });
  it('§3 an empty CatId gives ageCategoryId unavailable{not-applicable} (synthetic participant with <CatId />)', () => {
    const x = mini(person('5.K1M', { bd: '2008-01-01T00:00:00+01:00' }).replace('<IsTeam>', '<CatId /><IsTeam>'));
    expect(en(parseXmlSnapshot(x, ctx()), 'ageCategoryId', '5.K1M')).toMatchObject({ state: 'unavailable', reason: 'not-applicable' });
  });
  it('§3 isTeam is XML.Participants.IsTeam (false for 9047.K1M)', () => {
    expect(en(slalom(), 'isTeam', '9047.K1M')?.value).toBe(false);
  });
  it('§3 eventBib is XML.Participants.EventBib trimmed where Events.BibHandling is EventWide (nkz-19so: "108")', () => {
    expect(xmlFixture('slalom.xml')).toContain('<BibHandling>EventWide</BibHandling>');
    expect(en(slalom(), 'eventBib', '9047.K1M')?.value).toBe('108');
  });
  it('§3 with Startlist bib handling eventBib is unavailable{not-applicable} (cp3-cross: <BibHandling>Startlist</BibHandling>)', () => {
    expect(en(cross(), 'eventBib', '121081.WX1')).toMatchObject({ state: 'unavailable', reason: 'not-applicable' });
  });
  it('§3 the Results.Participant GivenName/FamilyName attributes do not replace the pre-assembled displayName', () => {
    const o = en(parseTcp(TCP.resultsBr2, ctx()), 'displayName', '9047.K1M');
    expect(o?.value).toBe('KRÁL Matěj');
  });
});
