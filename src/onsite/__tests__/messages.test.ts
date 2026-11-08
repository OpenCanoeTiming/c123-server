/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 rows 6, 9, 12 (tier 1): messages are complete (CONTRACTS §7.2, §1.6 "Creation over the push"), `event.changed`, diagnostics.
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, get, hydrate, modelFrom, openWs, view, type Env, type J, type WsClient } from './onsite-harness.js';
import { feed, JNE, NKZ, ODP, type Unit } from './datasets.js';

afterEach(disposeAll);

/** After each unit: a client that applied every message from an empty state holds exactly what a fresh hydration returns. */
async function holdsAfterEachUnit(env: Env, ws: WsClient, units: Unit[]): Promise<void> {
  for (const [i, u] of units.entries()) {
    await feed(env, u);
    await ws.barrier();
    const client = modelFrom(ws.messages);
    const fresh = (await hydrate(env)).model;
    expect(client.creation, `unit ${i}: creation rule`).toEqual([]);
    expect(view(client), `unit ${i} (${u.kind} ${u.rec.observedAt})`).toEqual(view(fresh));
  }
}

describe('row 6: messages are complete (CONTRACTS §7.2, §1.6 creation over the push; #258 O7)', () => {
  it('contract §1.6 + §7.2, jarni-so-odp with Phases, Attempts, Entries, Standings, a correction, oncourse-empty and a RaceConfig change: applying every message holds what hydration returns after each unit, ingest stamps included', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    const t = Date.parse(ODP.xmlRec().observedAt);
    await holdsAfterEachUnit(env, ws, [
      ...ODP.units(), ODP.correction(), ODP.raceConfigArmed(), ODP.emptyAt(t + 120_000),
    ]);
  });

  it('contract §7.2 creation rule (#258 O7): the creating message of an Attempt, Entry, Phase and Class carries the whole resource in fields, structural fields included, and no id key inside fields', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    for (const u of ODP.units()) await feed(env, u);
    await ws.barrier();
    const m = modelFrom(ws.messages);
    expect(m.creation).toEqual([]);
    for (const type of ['attempt.updated', 'entry.updated', 'phase.updated', 'class.updated']) expect(ws.messages.some((x) => x.type === type), type).toBe(true);
    const created = new Set<string>();
    for (const x of ws.messages) {
      const id = x.attemptId ?? x.entryId ?? x.phaseId ?? x.classId;
      if (x.fields === undefined) continue;
      const key = `${x.type}:${id as string}`;
      if (!created.has(key)) { created.add(key); continue; }
      // a later message is partial: it never restates identity
      for (const idKey of ['attemptId', 'entryId', 'phaseId', 'classId']) expect(idKey in x.fields, `${key} later message restates ${idKey}`).toBe(false);
    }
  });

  it('contract §7.2 oncourse.updated (#258 O7): asOf moves at oncourse-empty, to the ingest time of that observation', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    for (const u of ODP.listings(['1'], [31], [51])) await feed(env, u);
    await ws.barrier();
    const before = [...ws.messages].reverse().find((x) => x.type === 'oncourse.updated')!;
    expect(before.attemptIds.length).toBe(1);
    const at = Date.parse(before.asOf) + 5_000;
    await feed(env, ODP.emptyAt(at));
    await ws.barrier();
    const after = [...ws.messages].reverse().find((x) => x.type === 'oncourse.updated')!;
    expect(after.attemptIds).toEqual([]);
    expect(after.asOf).toBe(new Date(at).toISOString());
    expect((await get(env, '/api/oncourse')).body.asOf).toBe(after.asOf);
  });

  it('contract §7.2 (#258 O7): a RaceConfig that flips splitsArmed changes what is presented, so it is pushed: the client holds the hydration, not the stale splits', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    const units = ODP.units();
    for (const u of units) await feed(env, u);
    await ws.barrier();
    await feed(env, ODP.raceConfigArmed());
    await ws.barrier();
    expect(view(modelFrom(ws.messages))['attempts']).toEqual(view((await hydrate(env)).model)['attempts']);
  });

  it('vector rerun-retraction (INV-7, ADR-013), nkz-19so C1M_BR1_19:7 run 1, wipe, run 2, retraction sent as explicit not-yet: applying every message holds what hydration returns after each unit', async () => {
    const env = await boot({ startAt: NKZ.startAt, eventDate: NKZ.day });
    const ws = await openWs(env);
    await holdsAfterEachUnit(env, ws, NKZ.units());
    const wipe = ws.messages.find((x) => x.type === 'attempt.updated' && x.attemptId === NKZ.attemptId && x.fields.outcome?.state === 'not-yet');
    expect(wipe, 'the wipe is an explicit not-yet, never an omission').toBeDefined();
  });
});

describe('row 9: event.changed (CONTRACTS §7.2)', () => {
  it('contract §7.2: sent to a client on connect while an event is configured, carrying the whole OnsiteEvent', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    const m = await ws.until((x) => x.type === 'event.changed');
    expect(typeof m.seq).toBe('number');
    expect(m.event).toEqual((await get(env, '/api/events/current')).body.event);
    expect(Object.keys(m.event).sort()).toEqual(['details', 'eventId', 'name']);
  });

  it('contract §7.2: not sent on connect when no event is configured', async () => {
    const env = await boot({ startAt: ODP.startAt, eventId: undefined, eventName: undefined });
    const ws = await openWs(env);
    await ws.barrier();
    expect(ws.messages.filter((x) => x.type === 'event.changed')).toEqual([]);
  });

  it('contract §7.2 + ARCHITECTURE Scenario E: the explicit new-event action sends event.changed with the new whole event to every connected client; REST then serves the new event, empty', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    for (const u of ODP.units()) await feed(env, u);
    const a = await openWs(env);
    const b = await openWs(env);
    await a.barrier(); await b.barrier();
    a.take(); b.take();
    await env.h.startNewEvent({ eventId: 'ev-2', name: 'Second Event' });
    for (const c of [a, b]) {
      const m = await c.until((x) => x.type === 'event.changed');
      expect(m.event).toMatchObject({ eventId: 'ev-2', name: 'Second Event' });
      expect('organiserId' in m.event).toBe(false);
    }
    const cur = await get(env, '/api/events/current');
    expect(cur.body.event.eventId).toBe('ev-2');
    expect(cur.body.classes).toEqual([]);
  });
});

describe('row 12: diagnostics (CONTRACTS §7.1, §7.2)', () => {
  const diag = async (env: Env): Promise<J[]> => (await get(env, '/api/diagnostics')).body.diagnostics as J[];

  it('contract §7.1/§7.2: GET /api/diagnostics and diagnostics.updated carry the whole current list when it changes: the recorded text cells raise two unparseable-cell, a restated clean row clears them', async () => {
    const env = await boot({ startAt: JNE.startAt, eventDate: JNE.day });
    const ws = await openWs(env);
    await feed(env, JNE.units()[0]!);
    await ws.barrier();
    const first = [...ws.messages].reverse().find((x) => x.type === 'diagnostics.updated')!;
    expect(first.diagnostics.map((d: J) => d.kind)).toEqual(['unparseable-cell', 'unparseable-cell']);
    expect(first.diagnostics).toEqual(await diag(env));
    await feed(env, JNE.restated());
    await ws.barrier();
    const last = [...ws.messages].reverse().find((x) => x.type === 'diagnostics.updated')!;
    expect(last.seq).toBeGreaterThan(first.seq);
    expect(last.diagnostics).toEqual([]);
    expect(await diag(env)).toEqual([]);
  });

  it('INV-5: the same row received again changes no diagnostic, so no diagnostics.updated is sent', async () => {
    const env = await boot({ startAt: JNE.startAt, eventDate: JNE.day });
    const ws = await openWs(env);
    await feed(env, JNE.units()[0]!);
    await ws.barrier();
    const n = ws.messages.filter((x) => x.type === 'diagnostics.updated').length;
    await feed(env, JNE.sameRow());
    await ws.barrier();
    expect(ws.messages.filter((x) => x.type === 'diagnostics.updated').length).toBe(n);
  });
});
