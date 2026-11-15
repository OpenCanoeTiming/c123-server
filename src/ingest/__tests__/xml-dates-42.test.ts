/**
 * #373 row 13 (M2 P3a follow-up; DERIVATIONS §10 item 42, following item 40 (b); §0.5; §2.1; §3).
 * Item 40 (b)'s calendar check (the date part is the first ten characters, and it is unparseable
 * unless it names a calendar day) applies to every date the XML states, not only the Event's:
 * `Schedule.StartTime` (a Phase's `date`, `scheduledStart`, and the date pairing and `eventTime`
 * take from it) and `Participants.Birthdate`/`Birthdate2`. A non-empty unparseable value is
 * absent, not invented, and raises the parser's ingest-only `unparseable-field` (`where` the
 * phaseId or the participant's `Id`, `name` the attribute); an empty value is absent with no
 * diagnostic, unchanged from today.
 *
 * (iv)'s `birthYear` fallback to `Participants.Year` is the on-site serialisation's own derivation
 * (DERIVATIONS §3, "The on-site serialisation derives `birthYear` from it"), not the parser's: this
 * file only pins that the parser's `birthDate` is absent, which is the one thing the fallback
 * reads.
 */
import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture, obsOf, rowOf, diagnostics, type El } from './helpers.js';

const mini = (body: string): string => `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${body}</Canoe123Data>`;
const events = '<Events><EventId>E</EventId><IDHandling>USER</IDHandling><BibHandling>EventWide</BibHandling></Events>';
/** A minimal valid Schedule row, StartTime the only thing a case below varies. */
const scheduleRow = (raceId: string, classId: string, disId: string, startTime: string, order: number): string =>
  `<Schedule><RaceId>${raceId}</RaceId><RaceOrder>${order}</RaceOrder><StartTime>${startTime}</StartTime><Time>+0:02:00</Time><ClassId>${classId}</ClassId><DisId>${disId}</DisId><FirstBib>1</FirstBib><StartInterval>0:40</StartInterval><JuryNr>1</JuryNr><CourseNr>1</CourseNr><RaceStatus>0</RaceStatus><WorldRankingEvent>false</WorldRankingEvent></Schedule>`;
const participant = (id: string, bd: string): string =>
  `<Participants><Id>${id}</Id><ClassId>K1M</ClassId><FamilyName>AAA</FamilyName><GivenName>Bob</GivenName><Club>Klub</Club>${bd ? `<Birthdate>${bd}</Birthdate>` : ''}<Year>1990</Year><IsTeam>false</IsTeam></Participants>`;
const resultsRow = (raceId: string, id: string, bib: string): string =>
  `<Results><RaceId>${raceId}</RaceId><Id>${id}</Id><StartOrder>1</StartOrder><Bib>${bib.padStart(4, ' ')}</Bib><StartTime>09:00:00</StartTime><dtStart>9:00:00.000</dtStart><dtFinish>9:01:30.000</dtFinish><Time>90000</Time><Pen>0</Pen><Total>90000</Total><Rnk>1</Rnk><RnkOrder>1</RnkOrder></Results>`;

const ph = (els: unknown, field: string, phaseId: string): El | undefined => obsOf(els as any, field, { phaseId });
const en = (els: unknown, field: string, entryId: string): El | undefined => obsOf(els as any, field, { entryId });
const unparseableFields = (els: unknown) => diagnostics(els as any).filter((d) => d.kind === 'unparseable-field');

describe('§10 item 42 (i)-(iii): Schedule.StartTime', () => {
  it('(i) StartTime 2026-02-30T09:00:00+01:00 (30 February): no date, no scheduledStart, one unparseable-field naming the phaseId', () => {
    const edited = xmlFixture('slalom.xml').replace('<StartTime>2026-09-19T11:04:20+02:00</StartTime>', '<StartTime>2026-02-30T09:00:00+01:00</StartTime>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(ph(els, 'date', 'K1M_BR2_19'), 'no date').toBeUndefined();
    expect(ph(els, 'scheduledStart', 'K1M_BR2_19'), 'no scheduledStart').toBeUndefined();
    const own = unparseableFields(els).filter((d) => d['where'] === 'K1M_BR2_19' && d['name'] === 'StartTime');
    expect(own, 'one unparseable-field naming the phaseId').toHaveLength(1);
  });

  it('(ii) StartTime "tomorrow" (not a calendar date part at all): the same, no date, no scheduledStart, one unparseable-field', () => {
    const edited = xmlFixture('slalom.xml').replace('<StartTime>2026-09-19T11:04:20+02:00</StartTime>', '<StartTime>tomorrow</StartTime>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(ph(els, 'date', 'K1M_BR2_19'), 'no date').toBeUndefined();
    expect(ph(els, 'scheduledStart', 'K1M_BR2_19'), 'no scheduledStart').toBeUndefined();
    const own = unparseableFields(els).filter((d) => d['where'] === 'K1M_BR2_19' && d['name'] === 'StartTime');
    expect(own, 'one unparseable-field naming the phaseId').toHaveLength(1);
  });

  it('(iii) a valid StartTime is unchanged (guard: the recorded value, 2026-09-19T11:04:20+02:00)', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    expect(ph(els, 'date', 'K1M_BR2_19')).toMatchObject({ value: '2026-09-19' });
    expect(unparseableFields(els).filter((d) => d['where'] === 'K1M_BR2_19' && d['name'] === 'StartTime')).toEqual([]);
  });
});

describe('§10 item 42 (iv)-(v): Participants.Birthdate', () => {
  it('(iv) Birthdate 1990-02-30T00:00:00+01:00 (30 February): the parser\'s birthDate is absent (the on-site birthYear fallback to Year then applies), one unparseable-field naming the participant\'s Id', () => {
    const x = mini(events + participant('5.K1M', '1990-02-30T00:00:00+01:00'));
    const els = parseXmlSnapshot(x, ctx());
    const m = en(els, 'members', '5.K1M')?.value as El[];
    expect(m, 'the member is still presented (no partial crew, §3)').toHaveLength(1);
    expect('birthDate' in m[0], 'no invented birthDate').toBe(false);
    const own = unparseableFields(els).filter((d) => d['where'] === '5.K1M' && (d['name'] === 'Birthdate' || d['name'] === 'Birthdate2'));
    expect(own, 'one unparseable-field naming the participant\'s Id').toHaveLength(1);
  });

  it('(v) an empty Birthdate is absent, with no diagnostic (guard: unchanged from today)', () => {
    const x = mini(events + participant('6.K1M', ''));
    const els = parseXmlSnapshot(x, ctx());
    const m = en(els, 'members', '6.K1M')?.value as El[];
    expect('birthDate' in m[0]).toBe(false);
    expect(unparseableFields(els).filter((d) => d['where'] === '6.K1M')).toEqual([]);
  });
});

describe('§10 item 42 (vi): an invalid Schedule date gives no pairing candidate and no eventTime date', () => {
  it('two BR1 candidates of the same class, BR2\'s own StartTime invalid: siblingPhaseId stays null (CONTRACTS §2.4, "when that does not leave exactly one")', () => {
    // ctx states dates for the two BR1 candidates only (as a cold start would, from their own earlier reads); BR2's
    // own Schedule.StartTime is this snapshot's only source for its date, and it is invalid.
    const c = ctx({ phaseDates: { K1M_BR1_19: '2026-09-19', K1M_BR1_20: '2026-09-20' } });
    const x = mini(
      events +
        scheduleRow('K1M_BR1_19', 'K1M', 'BR1', '2026-09-19T09:00:00+02:00', 1) +
        scheduleRow('K1M_BR1_20', 'K1M', 'BR1', '2026-09-20T09:00:00+02:00', 2) +
        scheduleRow('K1M_BR2_19', 'K1M', 'BR2', '2026-02-30T09:00:00+02:00', 3),
    );
    const els = parseXmlSnapshot(x, c);
    expect(ph(els, 'pair', 'K1M_BR2_19')?.value, 'two candidates, BR2\'s own date unknown: no pairing candidate').toMatchObject({ siblingPhaseId: null });
  });

  it('a Results row of the Phase whose own StartTime is invalid states no eventTime/finishTime date (no date to build it from, §0.2)', () => {
    const c = ctx({ phaseDates: { K1M_BR1_19: '2026-09-19', K1M_BR1_20: '2026-09-20' } }); // no entry for K1M_BR2_19: its own (invalid) StartTime is the only source
    const x = mini(
      events +
        participant('1.K1M', '') +
        scheduleRow('K1M_BR1_19', 'K1M', 'BR1', '2026-09-19T09:00:00+02:00', 1) +
        scheduleRow('K1M_BR1_20', 'K1M', 'BR1', '2026-09-20T09:00:00+02:00', 2) +
        scheduleRow('K1M_BR2_19', 'K1M', 'BR2', '2026-02-30T09:00:00+02:00', 3) +
        resultsRow('K1M_BR2_19', '1.K1M', '1'),
    );
    const els = parseXmlSnapshot(x, c);
    const row = rowOf(els, 'K1M_BR2_19', '1');
    expect(row, 'no finishTime: there is no date (valid or inferred) to build it from').not.toHaveProperty('finishTime');
  });
});
