/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx } from './helpers.js';
import { R19 } from '../../core/__tests__/fixtures/round19-excerpts.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

/**
 * #382 row 2 (M2 P3c, Q-PH: a Phase that leaves the schedule is removed): DERIVATIONS §0.3 "The schedule statement" and §10 item 54 (a), (k);
 * CONFORMANCE-VECTORS §1 "Schedule statements". The parser emits ONE schedule statement per whole read,
 * `{ ingestSeq, schedule: { source: 'xml', phaseIds }, observedAt }`, the RaceIds of the snapshot's `Schedule` rows (the `<unassigned>`
 * placeholder and class `NA` excluded, §0.4), BEFORE the read's race tables. It is the trigger of the removal (item 54 (a)): the races the
 * `Schedule` table names, never its results tables. An empty `Schedule` table is a statement of the empty set, not an absent statement: the core
 * reads "an empty statement removes nothing" and raises `xml-schedule-emptied` (item 54 (k)); an absent statement would remove nothing either but
 * could never be told from a parser that forgot to state it.
 *
 * Channel: the parser's emitted elements (the `schedule` element). Each test builds its own XML text; no clock, no shared data.
 * The name of an "emptied" flag on the statement is not fixed by any document (the vector states `phaseIds: []` alone), so it is not asserted here;
 * see the record of #382's tests.
 */
const NS = 'xmlns="http://siwidata.com/Canoe123/Data.xsd"';
const sched = (raceId: string, cls: string, dis: string, order = 1): string =>
  `<Schedule><RaceId>${raceId}</RaceId><RaceOrder>${order}</RaceOrder><StartTime>2026-09-19T09:00:00+02:00</StartTime><ClassId>${cls}</ClassId><DisId>${dis}</DisId><CourseNr>1</CourseNr><RaceStatus>0</RaceStatus></Schedule>`;
const doc = (inner: string): string => `<?xml version="1.0" standalone="yes"?><Canoe123Data ${NS}>${inner}</Canoe123Data>`;
const statements = (els: GivenElement[]): Array<Record<string, any>> => (els as Array<Record<string, any>>).filter((e) => e['schedule'] !== undefined);
const sorted = (xs: unknown): string[] => [...(xs as string[])].sort();

describe('#382 row 2: the parser states the races the Schedule table names', () => {
  it('§0.3 schedule statement, item 54 (a): a snapshot with Schedule rows for races A and B emits exactly one statement of exactly {A, B}, source xml', () => {
    const els = parseXmlSnapshot(doc(sched('K1M_BR1_19', 'K1M', 'BR1', 1) + sched('K1M_BR2_19', 'K1M', 'BR2', 2)), ctx());
    const st = statements(els);
    expect(st, 'one statement per read').toHaveLength(1);
    expect(st[0]!['schedule']['source']).toBe('xml');
    expect(sorted(st[0]!['schedule']['phaseIds'])).toEqual(['K1M_BR1_19', 'K1M_BR2_19']);
    expect(typeof st[0]!['observedAt'], 'stamped with the receipt time as every element is').toBe('string');
  });

  it('§0.3 schedule statement, item 54 (a): a race repeated in the table is named once; a third race changes the set', () => {
    const els = parseXmlSnapshot(doc(sched('K1M_BR1_19', 'K1M', 'BR1', 1) + sched('K1M_BR1_19', 'K1M', 'BR1', 2) + sched('C1W_BR1_19', 'C1W', 'BR1', 3)), ctx());
    expect(sorted(statements(els)[0]!['schedule']['phaseIds'])).toEqual(['C1W_BR1_19', 'K1M_BR1_19']);
  });

  it('§0.3 schedule statement, item 54 (a): the statement is the Schedule table, never a results table: a race with Results rows but no Schedule row is not named', () => {
    // R19.rcXml: Schedule names C1M_BR2_18, Results carry C1M_BR2_18. Renaming only the Schedule row's RaceId leaves a results table of a race the schedule does not name.
    const data = R19.rcXml.data.replace(/(<Schedule>[\s\S]*?<RaceId>)C1M_BR2_18(<\/RaceId>)/, '$1C1M_BR1_18$2');
    expect(data, 'precondition: the Results table still names C1M_BR2_18').toMatch(/<Results>[\s\S]*<RaceId>C1M_BR2_18<\/RaceId>/);
    const els = parseXmlSnapshot(data, ctx({ observedAt: R19.rcXml.observedAt }));
    expect((els as Array<Record<string, any>>).some((e) => e['snapshot']?.phaseId === 'C1M_BR2_18'), 'precondition: the parser still emits the race table').toBe(true);
    expect(sorted(statements(els)[0]!['schedule']['phaseIds'])).toEqual(['C1M_BR1_18']);
  });

  it('§0.3 schedule statement, §0.4: the statement comes before the read\'s race tables (the core reads the set before the tables it would otherwise recreate)', () => {
    const els = parseXmlSnapshot(R19.rcXml.data, ctx({ observedAt: R19.rcXml.observedAt }));
    const at = (els as Array<Record<string, any>>).findIndex((e) => e['schedule'] !== undefined);
    const firstTable = (els as Array<Record<string, any>>).findIndex((e) => e['snapshot'] !== undefined);
    expect(firstTable, 'precondition: the read carries a race table').toBeGreaterThanOrEqual(0);
    expect(at, 'the statement is emitted').toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(firstTable);
    expect(sorted(statements(els)[0]!['schedule']['phaseIds']), 'the recorded snapshot names one race').toEqual(['C1M_BR2_18']);
  });

  it('§0.3, §0.4: the <unassigned> placeholder and the pseudo-class NA are never named', () => {
    const els = parseXmlSnapshot(
      doc(sched('K1M_BR1_19', 'K1M', 'BR1', 1) + sched('&lt;unassigned&gt;', 'K1M', 'SR', 2) + sched('NA_Unknown_28', 'NA', 'Unknown', 3)),
      ctx(),
    );
    expect(sorted(statements(els)[0]!['schedule']['phaseIds'])).toEqual(['K1M_BR1_19']);
  });

  it('item 54 (k), §0.3: a well-formed file whose Schedule table is empty states the EMPTY set (a statement is emitted), it is not "no statement"', () => {
    const els = parseXmlSnapshot(doc('<Classes><Class><ClassId>K1M</ClassId><LongTitle>K1 men</LongTitle></Class></Classes>'), ctx());
    const st = statements(els);
    expect(st, 'an empty Schedule table still gives one statement').toHaveLength(1);
    expect(st[0]!['schedule']['source']).toBe('xml');
    expect(st[0]!['schedule']['phaseIds']).toEqual([]);
  });

  it('item 54 (k), §0.3: a file with the root closed and nothing in it ("valid and empty") states the empty set too', () => {
    const els = parseXmlSnapshot(doc(''), ctx());
    const st = statements(els);
    expect(st).toHaveLength(1);
    expect(st[0]!['schedule']['phaseIds']).toEqual([]);
  });

  it('item 54 (a): a snapshot whose Schedule names only filtered races (<unassigned>, NA) states the empty set, not a statement with the filtered ids', () => {
    const els = parseXmlSnapshot(doc(sched('&lt;unassigned&gt;', 'K1M', 'SR', 1) + sched('NA_Unknown_28', 'NA', 'Unknown', 2)), ctx());
    expect(statements(els)).toHaveLength(1);
    expect(statements(els)[0]!['schedule']['phaseIds']).toEqual([]);
  });

  it('§0.3: TCP\'s Schedule message states no such thing: parseTcp never emits a schedule statement (TCP never removes)', async () => {
    const { parseTcp } = await import('../index.js');
    const data = '<Canoe123 System="Main"><Schedule><Race Order="1" RaceId="K1M_BR1_19" Race="K1 muži" MainTitle="K1 muži" SubTitle="Run" ShortTitle="K1M" RaceStatus="5" /></Schedule></Canoe123>';
    const els = parseTcp(data, ctx());
    expect(
      (els as Array<Record<string, any>>).some((e) => e['phaseId'] === 'K1M_BR1_19' || e['snapshot'] !== undefined || e['field'] !== undefined),
      'precondition: the message is read (the Phase is stated)',
    ).toBe(true);
    expect(statements(els)).toEqual([]);
  });
});
