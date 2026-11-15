/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #373 rows 1-3 (M2 P3a follow-up, #368 CQ1; DERIVATIONS §10 item 40 (a); CONTRACTS §2.2, §7.2):
 * every operator-entered name -- the boot flag `--event-name` or the "start a new event" action --
 * wins over the snapshot's own title (`Events.MainTitle`), and the snapshot's title never
 * displaces it; a blank or whitespace-only name counts as none entered, and `name` then follows
 * the snapshot's own title. Interface: onsite-harness.ts header.
 *
 * No recorded on-site XML snapshot in this repo carries an `Events` table (datasets.ts's own
 * note, "ODP's dataset, has none at all"); a derived snapshot carrying only `MainTitle` (every
 * other `Events` field the empty-tag absence `CONTRACTS.md` §2.2 reads, so `details` stays
 * `not-yet`) isolates the name rule from the `details` rule: an `event.changed` this snapshot
 * raises, if any, is for `name` alone.
 *
 * Rows 1 and 2 boot with `eventName: undefined` (no `--event-name`): the DA ruling record notes
 * today's merged code checks only the boot flag (`opts.eventName === undefined`,
 * `src/onsite/index.ts` ~l.283), so booting with the flag set would let that check alone, not
 * `startNewEvent`'s own name, explain why a later snapshot's title does not win -- these two rows
 * boot without it so the behaviour under test is `startNewEvent`'s. Row 3 covers the boot flag
 * and, run against this branch, both its cases already pass: pinned as today's behaviour.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, feedXml, get, openWs, type Env } from './onsite-harness.js';
import { ODP } from './datasets.js';

afterEach(disposeAll);

const ROOT_OPEN = '<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">';
const mainTitleOnlyEvents = (title: string): string =>
  `<Events><EventId>CZE1.1</EventId><MainTitle>${title}</MainTitle><SubTitle /><Location /><Facility /><StartDate /><EndDate /></Events>`;
const withMainTitle = (data: string, title: string): string => {
  if (!data.includes(ROOT_OPEN)) throw new Error('fixture has no Canoe123Data root');
  return data.replace(ROOT_OPEN, `${ROOT_OPEN}${mainTitleOnlyEvents(title)}`);
};
/** The recorded ODP snapshot (no Events table of its own) with a synthetic MainTitle-only Events table inserted. */
const snapshotWithTitle = (at: string, title: string): { observedAt: string; data: string } =>
  derived(ODP.xmlRec(), { observedAt: at, edit: (d) => withMainTitle(d, title) });

const T0 = ODP.startAt;
const T1 = '2026-04-18T13:10:00.000Z';
const T2 = '2026-04-18T13:20:00.000Z';

describe('§10 item 40 (a): a name typed in "start a new event" wins over MainTitle', () => {
  it('startNewEvent({name:\'X\'}), then a snapshot whose MainTitle is Y: name stays X, no event.changed for the name', async () => {
    // eventName: undefined -- no boot flag, so the boot-flag check alone cannot be the reason the name stays X.
    const env: Env = await boot({ startAt: T0, eventDate: ODP.day, eventName: undefined });
    await env.h.startNewEvent({ eventId: 'ev-2', name: 'X' });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop startNewEvent's own event.changed: only the snapshot's unit is checked below.

    await feedXml(env, snapshotWithTitle(T1, 'Y'));
    await ws.barrier();
    const changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'the snapshot\'s title never displaces an entered name, and nothing else of the Event moved: no event.changed').toEqual([]);

    expect((await get(env, '/api/events/current')).body.event.name).toBe('X');
  });
});

describe('§10 item 40 (a): a blank name is none; the snapshot\'s title is presented', () => {
  it('startNewEvent({name:\'  \'}), then the snapshot: name becomes Y with one same-id event.changed', async () => {
    const env: Env = await boot({ startAt: T0, eventDate: ODP.day, eventName: undefined });
    await env.h.startNewEvent({ eventId: 'ev-2', name: '  ' });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    await feedXml(env, snapshotWithTitle(T1, 'Y'));
    await ws.barrier();
    const changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'a whitespace-only name entered none: name takes the snapshot\'s title, one same-id event.changed').toHaveLength(1);
    expect(changed[0].event).toMatchObject({ eventId: 'ev-2', name: 'Y' });

    expect((await get(env, '/api/events/current')).body.event.name).toBe('Y');
  });
});

describe('§10 item 40 (a): --event-name wins at boot; without it the name follows MainTitle', () => {
  it('boot with --event-name "X": a snapshot with MainTitle "Y" leaves X, no event.changed for the name', async () => {
    const env: Env = await boot({ startAt: T0, eventDate: ODP.day, eventName: 'X' });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    await feedXml(env, snapshotWithTitle(T1, 'Y'));
    await ws.barrier();
    const changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'the boot flag already named the event; the snapshot\'s title moves nothing of the Event').toEqual([]);
    expect((await get(env, '/api/events/current')).body.event.name).toBe('X');
  });

  it('boot without --event-name: the name follows a changed MainTitle, Y then Y2, one event.changed each', async () => {
    const env: Env = await boot({ startAt: T0, eventDate: ODP.day, eventName: undefined });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    await feedXml(env, snapshotWithTitle(T1, 'Y'));
    await ws.barrier();
    let changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'no name was entered at boot: the first snapshot\'s title is presented, one event.changed').toHaveLength(1);
    expect(changed[0].event.name).toBe('Y');
    expect((await get(env, '/api/events/current')).body.event.name).toBe('Y');

    await feedXml(env, snapshotWithTitle(T2, 'Y2'));
    await ws.barrier();
    changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'a changed title follows it: one more event.changed').toHaveLength(1);
    expect(changed[0].event.name).toBe('Y2');
    expect((await get(env, '/api/events/current')).body.event.name).toBe('Y2');
  });

  it('a blank --event-name ("  ") counts as none: the snapshot\'s title is presented, one same-id event.changed (review of PR #374, N4)', async () => {
    const env: Env = await boot({ startAt: T0, eventDate: ODP.day, eventName: '  ' });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    await feedXml(env, snapshotWithTitle(T1, 'Y'));
    await ws.barrier();
    const changed = ws.take().filter((m: any) => m.type === 'event.changed');
    expect(changed, 'a whitespace-only boot flag entered none: the snapshot\'s title is presented, one same-id event.changed').toHaveLength(1);
    expect(changed[0].event).toMatchObject({ eventId: 'ev-1', name: 'Y' });
    expect((await get(env, '/api/events/current')).body.event.name).toBe('Y');
  });
});
