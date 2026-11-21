/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #330 (CONTRACTS §2.2 Event invariant, §1.1; ARCHITECTURE Scenario E "The multi-day event"): the on-site bridge mints the
 * eventId and persists it across days; it never changes and is never reused; a new competition is only the deliberate
 * "start a new event" action; returning to an earlier event reopens its store.
 * The event title from the snapshot and the operator name are #368 (event-name-368.test.ts); Event.details is #283.
 * Interface: `persistEvent` on OnsiteOptions (onsite-harness.ts header); main.ts always sets it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, fakeOnsiteFs, get, DATA_DIR, type Env, type FakeOnsiteFs } from './onsite-harness.js';
import type { AdminLogEntry } from '../index.js';

afterEach(disposeAll);

const START = '2026-04-18T08:00:00.000Z';
const EVENT_FILE = `${DATA_DIR}/event.json`;

const current = async (env: Env): Promise<any> => (await get(env, '/api/events/current')).body.event;
/** The process on the same data dir after a stop: the durable files carry over. */
const restart = async (env: Env, fs: FakeOnsiteFs, o: Record<string, unknown> = {}): Promise<Env> => {
  await env.h.stop();
  return boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: undefined, ...o });
};

describe('#330 the on-site process mints and persists its eventId', () => {
  it('§2.2: a first start without an eventId mints an opaque id and serves it', async () => {
    const env = await boot({ startAt: START, persistEvent: true, eventId: undefined, eventName: undefined });
    const ev = await current(env);
    expect(typeof ev.eventId).toBe('string');
    expect(ev.eventId.length).toBeGreaterThan(0);
    expect(env.fs.files.has(EVENT_FILE), 'persisted before serving').toBe(true);
  });

  it('Scenario E: a restart on the same data dir reopens the same eventId', async () => {
    const fs = fakeOnsiteFs();
    const first = await boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: undefined });
    const id = (await current(first)).eventId;
    const second = await restart(first, fs);
    expect((await current(second)).eventId).toBe(id);
  });

  it('§2.2: an explicit eventId is used and persisted as current', async () => {
    const fs = fakeOnsiteFs();
    const first = await boot({ startAt: START, fs, persistEvent: true, eventId: 'given-1', eventName: undefined });
    expect((await current(first)).eventId).toBe('given-1');
    const second = await restart(first, fs);
    expect((await current(second)).eventId).toBe('given-1');
  });

  it('#368: an operator name is persisted and survives a restart; a new non-blank boot name replaces it; none keeps following the snapshot', async () => {
    const fs = fakeOnsiteFs();
    const first = await boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: 'Spring Cup' });
    const id = (await current(first)).eventId;
    const second = await restart(first, fs);
    expect(await current(second)).toMatchObject({ eventId: id, name: 'Spring Cup' });
    const third = await restart(second, fs, { eventName: 'Autumn Cup' });
    expect(await current(third)).toMatchObject({ eventId: id, name: 'Autumn Cup' });
    const fourth = await restart(third, fs, { eventName: '  ' });
    expect(await current(fourth)).toMatchObject({ eventId: id, name: 'Autumn Cup' });

    const fs2 = fakeOnsiteFs();
    const plain = await boot({ startAt: START, fs: fs2, persistEvent: true, eventId: undefined, eventName: undefined });
    const plainId = (await current(plain)).eventId;
    expect((await current(await restart(plain, fs2))).name, 'no operator name: the name awaits the snapshot title, as before').toBe(plainId);
  });

  it('Scenario E: startNewEvent without an id mints a new distinct id; a restart reopens that one', async () => {
    const fs = fakeOnsiteFs();
    const first = await boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: undefined });
    const id1 = (await current(first)).eventId;
    await first.h.startNewEvent({ name: 'Day Two Cup' });
    const ev2 = await current(first);
    expect(ev2.eventId).not.toBe(id1);
    expect(ev2.name).toBe('Day Two Cup');
    const second = await restart(first, fs);
    expect(await current(second)).toMatchObject({ eventId: ev2.eventId, name: 'Day Two Cup' });
  });

  it('Scenario E: startNewEvent with an earlier eventId is the return to it, and the restart reopens it', async () => {
    const fs = fakeOnsiteFs();
    const first = await boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: undefined });
    const id1 = (await current(first)).eventId;
    await first.h.startNewEvent({ name: 'Other' });
    await first.h.startNewEvent({ eventId: id1, name: '' });
    const second = await restart(first, fs);
    expect((await current(second)).eventId).toBe(id1);
  });

  it('§2.10 discipline: an unreadable event file is set aside, reported, and a fresh id minted', async () => {
    const fs = fakeOnsiteFs({ [EVENT_FILE]: '{not json' });
    const entries: any[] = [];
    const env = await boot({ startAt: START, fs, persistEvent: true, eventId: undefined, eventName: undefined, adminLog: (e: AdminLogEntry | { kind: string }) => { entries.push(e); } });
    const log = entries.filter((e) => e.kind === 'store-set-aside');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ store: 'event', file: EVENT_FILE });
    expect(fs.files.get(log[0].setAsideAs)).toBe('{not json');
    const ev = await current(env);
    expect(ev.eventId.length).toBeGreaterThan(0);
    expect(JSON.parse(fs.files.get(EVENT_FILE) as string).eventId).toBe(ev.eventId);
  });
});
