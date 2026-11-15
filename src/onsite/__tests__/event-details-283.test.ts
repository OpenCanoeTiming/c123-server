/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #283 rows 6-10 (tier 1): the core presents `Event.details` and sends a same-id `event.changed` when the presented
 * Event changes mid-session. CONTRACTS §2.2 (the `details` bullet), §7.2 (event.changed, "also sent, with the same
 * eventId, when the presented Event ... changes", maintainer 2026-11-14), §1.6 ("replace the held Event whole");
 * CLIENT-OBLIGATIONS l.145 (on-site clients: same-id event.changed = replace the held Event whole, no re-hydration).
 * Interface: onsite-harness.ts header.
 *
 * No recorded on-site XML snapshot in this repo carries an `Events` table (round19-excerpts.js's `rcXml`, ODP's
 * dataset, has none at all). `eventsXml` below is a derived case built the same way datasets.ts's other derived
 * cases are (`derived()`): it inserts a synthetic `<Events>` block into the recorded ODP snapshot.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, feedXml, get, openWs, type Env } from './onsite-harness.js';
import { ODP } from './datasets.js';

afterEach(disposeAll);

const ROOT_OPEN = '<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">';

interface EventsFields { subTitle?: string; location?: string; facility?: string; startDate?: string; endDate?: string; mainTitle?: string }
/** `<Events>` as Canoe123 writes it: an absent field is `<Tag />`, CONTRACTS §2.2's empty-tag case. */
function eventsBlock(f: EventsFields): string {
  const tag = (name: string, v: string | undefined): string => (v ? `<${name}>${v}</${name}>` : `<${name} />`);
  return `<Events>${tag('EventId', 'CZE2.2026041800')}${tag('MainTitle', f.mainTitle ?? 'Jarní slalomy')}${tag('SubTitle', f.subTitle)}${tag('Location', f.location)}${tag('Facility', f.facility)}${tag('StartDate', f.startDate)}${tag('EndDate', f.endDate)}</Events>`;
}
/** The recorded ODP snapshot with a synthetic `<Events>` table inserted (derived case, datasets.ts's convention). */
function withEvents(d: string, f: EventsFields): string {
  if (!d.includes(ROOT_OPEN)) throw new Error('fixture has no Canoe123Data root');
  return d.replace(ROOT_OPEN, `${ROOT_OPEN}${eventsBlock(f)}`);
}
/** A derived snapshot at `at`, carrying the given Events fields. */
const snapshotAt = (at: string, f: EventsFields): { observedAt: string; data: string } => derived(ODP.xmlRec(), { observedAt: at, edit: (d) => withEvents(d, f) });

const FULL: EventsFields = { subTitle: 'Jarní pohár', location: 'Český Vrbné', facility: 'SK VS ČB', startDate: '2026-04-18T08:30:00+02:00', endDate: '2026-04-19T08:30:00+02:00' };
const T0 = '2026-04-18T14:45:50.862Z'; // the recorded snapshot's own instant (ODP.xmlRec().observedAt)
const T1 = '2026-04-18T14:46:10.000Z';
const T2 = '2026-04-18T14:46:20.000Z';
const T3 = '2026-04-18T14:46:30.000Z';

async function bootOdp(opts: Partial<Parameters<typeof boot>[0]> = {}): Promise<Env> {
  return boot({ startAt: ODP.startAt, eventDate: ODP.day, ...opts });
}

describe('row 6: the core presents Event.details (CONTRACTS §2.2)', () => {
  it('before any snapshot, Event.details is not-yet; GET /api/events/current serves it known from the first snapshot, source xml, observedAt of that snapshot', async () => {
    const env = await bootOdp();
    const before = await get(env, '/api/events/current');
    expect(before.body.event.details).toEqual({ state: 'not-yet' });

    const rec = snapshotAt(T0, FULL);
    await feedXml(env, rec);
    const after = await get(env, '/api/events/current');
    expect(after.body.event.details).toMatchObject({
      state: 'known',
      source: 'xml',
      observedAt: rec.observedAt,
      value: { subtitle: 'Jarní pohár', venue: 'Český Vrbné', facility: 'SK VS ČB', startDate: '2026-04-18', endDate: '2026-04-19' },
    });
  });
});

describe('row 7: the connect-time event.changed carries the presented details (CONTRACTS §7.2)', () => {
  it('a client connecting after the first snapshot receives event.changed whose event.details equals the hydration\'s', async () => {
    const env = await bootOdp();
    await feedXml(env, snapshotAt(T0, FULL));
    const ws = await openWs(env);
    const m = await ws.until((x) => x.type === 'event.changed');
    const hydrated = await get(env, '/api/events/current');
    expect(m.event.details).toEqual(hydrated.body.event.details);
    expect(m.event.details.state).toBe('known');
  });
});

describe('row 8: a later snapshot changes details and its observedAt; an equal re-delivery moves nothing (CONTRACTS §2.2, INV-5)', () => {
  it('a second snapshot with another Location serves the new venue and that snapshot\'s observedAt; a third, equal snapshot leaves observedAt at the second\'s', async () => {
    const env = await bootOdp();
    await feedXml(env, snapshotAt(T0, FULL));

    const second = snapshotAt(T1, { ...FULL, location: 'Nové Město' });
    await feedXml(env, second);
    let details = (await get(env, '/api/events/current')).body.event.details;
    expect(details).toMatchObject({ state: 'known', observedAt: second.observedAt, value: { venue: 'Nové Město' } });

    const third = snapshotAt(T2, { ...FULL, location: 'Nové Město' }); // equal to `second`
    await feedXml(env, third);
    details = (await get(env, '/api/events/current')).body.event.details;
    expect(details).toMatchObject({ observedAt: second.observedAt, value: { venue: 'Nové Město' } });
  });
});

describe('row 9: a snapshot without details keeps what is presented (CONTRACTS §2.2)', () => {
  it('a later snapshot with an unparseable StartDate leaves the presented details as they were', async () => {
    const env = await bootOdp();
    await feedXml(env, snapshotAt(T0, FULL));
    const before = (await get(env, '/api/events/current')).body.event.details;
    expect(before.state, 'the first snapshot must have been presented before the second can be shown to change nothing').toBe('known');

    await feedXml(env, snapshotAt(T1, { ...FULL, startDate: 'not-a-date' }));
    const after = (await get(env, '/api/events/current')).body.event.details;
    expect(after).toEqual(before);
  });
});

describe('row 10: same-id event.changed on a change of the presented Event (CONTRACTS §7.2, maintainer 2026-11-14, #283)', () => {
  it('a change of details or name mid-session sends event.changed with the same eventId; an equal re-delivery sends none', async () => {
    const env = await bootOdp({ eventName: 'Jarní slalomy' }); // matches FULL's mainTitle default, so the first snapshot changes only `details`
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    // First snapshot: details go from not-yet to known.
    await feedXml(env, snapshotAt(T0, FULL));
    await ws.barrier();
    let changed = ws.take().filter((x: any) => x.type === 'event.changed');
    expect(changed).toHaveLength(1);
    expect(changed[0].event.eventId).toBe('ev-1');
    expect(changed[0].event.details.value).toMatchObject({ venue: 'Český Vrbné' });

    // Second snapshot: Location changes -> details changes.
    await feedXml(env, snapshotAt(T1, { ...FULL, location: 'Nové Město' }));
    await ws.barrier();
    changed = ws.take().filter((x: any) => x.type === 'event.changed');
    expect(changed).toHaveLength(1);
    expect(changed[0].event.eventId).toBe('ev-1');
    expect(changed[0].event.details.value.venue).toBe('Nové Město');

    // Third snapshot: equal to the second -> no push (INV-5).
    await feedXml(env, snapshotAt(T2, { ...FULL, location: 'Nové Město' }));
    await ws.barrier();
    expect(ws.take().filter((x: any) => x.type === 'event.changed')).toEqual([]);

    // Fourth snapshot: the event title (Events.MainTitle) changes -> `name` changes (CONTRACTS §2.2: name defaults to the snapshot's title).
    await feedXml(env, snapshotAt(T3, { ...FULL, location: 'Nové Město', mainTitle: 'Jarní slalomy 2' }));
    await ws.barrier();
    changed = ws.take().filter((x: any) => x.type === 'event.changed');
    expect(changed).toHaveLength(1);
    expect(changed[0].event.eventId).toBe('ev-1');
    expect(changed[0].event.name).toBe('Jarní slalomy 2');
  });
});
