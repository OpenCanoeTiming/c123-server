/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #331 part 1: `POST /api/admin/events` is the admin UI's "start a new event" action (CONTRACTS §2.2, §7.2 `event.changed`;
 * ARCHITECTURE Scenario E: one deliberate admin action, never inferred). Outside the §7 contract, like `/api/clients`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, get, post, openWs } from './onsite-harness.js';

afterEach(disposeAll);

const START = '2026-04-18T08:00:00.000Z';
const fresh = () => boot({ startAt: START, persistEvent: true, eventId: 'first-1', eventName: 'First' });

describe('#331 POST /api/admin/events', () => {
  it('starts a new event: 201 with the event, which /api/events/current then serves', async () => {
    const env = await fresh();
    const r = await post(env, '/api/admin/events', { name: 'Autumn Cup' });
    expect(r.status).toBe(201);
    expect(r.body.event.name).toBe('Autumn Cup');
    expect(r.body.event.eventId).not.toBe('first-1');
    const cur = (await get(env, '/api/events/current')).body.event;
    expect(cur).toEqual(r.body.event);
  });

  it('uses a given eventId', async () => {
    const env = await fresh();
    const r = await post(env, '/api/admin/events', { name: 'Cup', eventId: 'given-2' });
    expect(r.status).toBe(201);
    expect(r.body.event.eventId).toBe('given-2');
  });

  it('a connected /ws client receives event.changed with the new eventId', async () => {
    const env = await fresh();
    const ws = await openWs(env);
    await ws.until((m) => m.type === 'event.changed');
    const r = await post(env, '/api/admin/events', { name: 'Autumn Cup' });
    const m = await ws.until((x) => x.type === 'event.changed' && x.event.eventId === r.body.event.eventId);
    expect(m.event.name).toBe('Autumn Cup');
  });

  it('a body without a string name is 400 validation-failed and changes nothing', async () => {
    const env = await fresh();
    for (const body of [{}, { name: 5 }, { eventId: 'x' }]) {
      const r = await post(env, '/api/admin/events', body);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('validation-failed');
    }
    expect((await get(env, '/api/events/current')).body.event).toMatchObject({ eventId: 'first-1', name: 'First' });
  });

  it('re-posting the current eventId is 400 validation-failed', async () => {
    const env = await fresh();
    const r = await post(env, '/api/admin/events', { name: 'Again', eventId: 'first-1' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation-failed');
    expect((await get(env, '/api/events/current')).body.event.name).toBe('First');
  });
});
