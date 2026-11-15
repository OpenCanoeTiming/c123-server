/**
 * #283 rows 1-5 (tier 1): `parseXmlSnapshot` emits `Event.details` from the snapshot's `Events` table.
 * Rule (merged, PR #355, a46a573): CONTRACTS §2.2 (the `details` bullet), DERIVATIONS §0.5 (ingest-only diagnostics).
 * `eventObsOf` (helpers.ts) documents the assumed element shape.
 *
 * #373 rows 4-6 (M2 P3a follow-up, #368 CQ2/N1/N2; DERIVATIONS §10 item 40 (b), 42): the date part
 * is unparseable unless it names a calendar day, not merely ten digits and dashes in the right
 * shape; and the fact's element key is its own, `eventFact`, never `event` (helpers.ts's
 * `eventObsOf`, finding #368 N1).
 */
import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture, eventObsOf, diagnostics, type El } from './helpers.js';
import { EVENTS_JARNI_283 } from './fixtures/events-jarni-283.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

describe('CONTRACTS §2.2: Event.details from the Events table', () => {
  it('row 1: the parser emits the Events table (slalom.xml: SubTitle, Location, Facility, StartDate, EndDate all present)', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    const ev = eventObsOf(els, 'details');
    expect(ev).toMatchObject({
      source: 'xml',
      value: { subtitle: 'prostě budějckej NKZ', venue: 'Areál Lídy Polesné', facility: 'SK VS ČB', startDate: '2026-09-19', endDate: '2026-09-20' },
    });
  });

  it('row 2: the date part is the YYYY-MM-DD as written, no zone conversion (cp3-cross StartDate 2026-04-25T00:00:00+02:00; a -05:00 offset keeps its own date)', () => {
    const crossEls = parseXmlSnapshot(xmlFixture('cross.xml'), ctx());
    expect(eventObsOf(crossEls, 'details')?.value).toMatchObject({ startDate: '2026-04-25', endDate: '2026-04-25' });

    // Synthetic: no recorded snapshot in this repo carries a negative offset; a converting implementation would move
    // 2026-04-25T23:30:00-05:00 to 2026-04-26 in UTC. CONTRACTS §2.2 requires the date to stay as written.
    const edited = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '<StartDate>2026-04-25T23:30:00-05:00</StartDate>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(eventObsOf(els, 'details')?.value).toMatchObject({ startDate: '2026-04-25' });
  });

  it('row 3: an empty or whitespace-only SubTitle, Location or Facility leaves the field absent (cp3-cross <Location />; synthetic whitespace-only SubTitle)', () => {
    const crossDetails = eventObsOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'details')?.value as El | undefined;
    expect(crossDetails, 'a details observation (cp3-cross)').toBeDefined();
    expect('venue' in crossDetails!).toBe(false);
    expect(crossDetails!.facility).toBe('Praha Troja');
    expect(crossDetails!.subtitle).toBe('Vodácký areál Praha Troja');

    const whitespaceSub = xmlFixture('slalom.xml').replace('<SubTitle>prostě budějckej NKZ</SubTitle>', '<SubTitle> </SubTitle>');
    const v = eventObsOf(parseXmlSnapshot(whitespaceSub, ctx()), 'details')?.value as El | undefined;
    expect(v, 'a details observation (whitespace-only SubTitle)').toBeDefined();
    expect('subtitle' in v!).toBe(false);
    expect(v!.venue).toBe('Areál Lídy Polesné');
    expect(v!.facility).toBe('SK VS ČB');
  });

  it('row 4: a missing StartDate/EndDate states no details (no diagnostic); an unparseable one states no details and raises the ingest-only unparseable-field (DERIVATIONS §0.5)', () => {
    const missing = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '');
    const missingEls = parseXmlSnapshot(missing, ctx());
    expect(eventObsOf(missingEls, 'details')).toBeUndefined();
    expect(diagnostics(missingEls).filter((d) => d.kind === 'unparseable-field')).toEqual([]);

    const garbled = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '<StartDate>not-a-date</StartDate>');
    const garbledEls = parseXmlSnapshot(garbled, ctx());
    expect(eventObsOf(garbledEls, 'details')).toBeUndefined();
    expect(diagnostics(garbledEls).filter((d) => d.kind === 'unparseable-field')).toHaveLength(1);
  });

  it('row 5: recorded excerpts give the recorded details (cp3-cross venue absent for <Location />; a jarni-ne-odp excerpt subtitle absent for <SubTitle />)', () => {
    const crossDetails = eventObsOf(parseXmlSnapshot(xmlFixture('cross.xml'), ctx()), 'details')?.value as El | undefined;
    expect(crossDetails, 'a details observation (cp3-cross)').toBeDefined();
    expect('venue' in crossDetails!).toBe(false);
    expect(crossDetails).toMatchObject({ facility: 'Praha Troja', startDate: '2026-04-25', endDate: '2026-04-25' });

    const jarniDetails = eventObsOf(parseXmlSnapshot(EVENTS_JARNI_283, ctx()), 'details')?.value as El | undefined;
    expect(jarniDetails, 'a details observation (jarni-ne-odp excerpt)').toBeDefined();
    expect('subtitle' in jarniDetails!).toBe(false);
    expect(jarniDetails).toMatchObject({ venue: 'Areál Lídy Polesné', facility: 'SK VS ČB', startDate: '2026-04-18', endDate: '2026-04-19' });
  });
});

describe('#373 row 4, §10 item 40 (b): a date part that is not a calendar date is unparseable, not merely ten digits and dashes', () => {
  it('StartDate month 13 (2026-13-45T00:00:00+02:00): no details, one unparseable-field', () => {
    const edited = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '<StartDate>2026-13-45T00:00:00+02:00</StartDate>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(eventObsOf(els, 'details')).toBeUndefined();
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-field')).toHaveLength(1);
  });
  it('EndDate 29 February of a non-leap year (2026-02-29T00:00:00+02:00): no details, one unparseable-field, the same as StartDate', () => {
    const edited = xmlFixture('slalom.xml').replace('<EndDate>2026-09-20T08:30:37+02:00</EndDate>', '<EndDate>2026-02-29T00:00:00+02:00</EndDate>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(eventObsOf(els, 'details')).toBeUndefined();
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-field')).toHaveLength(1);
  });
  it('29 February of a leap year (2024-02-29T00:00:00+02:00) is accepted', () => {
    const edited = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '<StartDate>2024-02-29T00:00:00+02:00</StartDate>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(eventObsOf(els, 'details')?.value).toMatchObject({ startDate: '2024-02-29' });
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-field')).toEqual([]);
  });
  it('what follows the date part is not read: 2026-04-25garbage is accepted as 2026-04-25 (DERIVATIONS §10 item 40 (b)\'s own example)', () => {
    const edited = xmlFixture('slalom.xml').replace('<StartDate>2026-09-19T08:30:37+02:00</StartDate>', '<StartDate>2026-04-25garbage</StartDate>');
    const els = parseXmlSnapshot(edited, ctx());
    expect(eventObsOf(els, 'details')?.value).toMatchObject({ startDate: '2026-04-25' });
    expect(diagnostics(els).filter((d) => d.kind === 'unparseable-field')).toEqual([]);
  });
});

describe('#373 row 5, #368 N2: test gaps (exactly one details observation; an empty Facility)', () => {
  it('row 1\'s fixture (slalom.xml) states exactly one details observation, not none and not several', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx());
    const own = (els as El[]).filter((e) => e.eventFact && e.eventFact.field === 'details');
    expect(own, 'exactly one details observation for this one Events table').toHaveLength(1);
  });
  it('an empty Facility (<Facility />) leaves the field absent, the same as an empty SubTitle or Location (row 3)', () => {
    const edited = xmlFixture('slalom.xml').replace('<Facility>SK VS ČB</Facility>', '<Facility />');
    const v = eventObsOf(parseXmlSnapshot(edited, ctx()), 'details')?.value as El | undefined;
    expect(v, 'a details observation (empty Facility)').toBeDefined();
    expect('facility' in v!).toBe(false);
    expect(v!.venue).toBe('Areál Lídy Polesné'); // untouched: only Facility was emptied
  });
});

describe('#373 row 6, #368 N1: the event fact\'s element key is its own, never event', () => {
  it('no element parseXmlSnapshot emits carries the key "event" with an object value (the string-valued connection/operator signals CONFORMANCE-VECTORS §1 lists are a closed set; #368 N1)', () => {
    const els = parseXmlSnapshot(xmlFixture('slalom.xml'), ctx()) as unknown as GivenElement[];
    for (const e of els as unknown as Array<Record<string, unknown>>) {
      if ('event' in e) expect(typeof e.event, `an "event" key must stay string-valued, never an object: ${JSON.stringify(e)}`).not.toBe('object');
    }
  });
});
