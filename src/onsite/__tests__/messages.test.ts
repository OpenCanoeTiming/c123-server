/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 rows 6, 9, 12 (tier 1): messages are complete (CONTRACTS §7.2, §1.6 "Creation over the push"), `event.changed`, diagnostics.
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, get, hydrate, modelFrom, openWs, view, WHOLE, type Env, type J, type WsClient } from './onsite-harness.js';
import { feed, NKZ, ODP, type Unit } from './datasets.js';

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

describe('round 27: deferred Phase creation, discipline at creation, oncourse.asOf (CONTRACTS §1.6, §2.4, §7.1, §7.2; DERIVATIONS §1, §2.1)', () => {
  it('contract §1.6/§2.4 (round 27): the on-course listing that first names a Phase creates the Attempt and not the Phase; the Attempt is served by /api/oncourse and /api/phases/{id}/attempts (not 404), the Phase by no class', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    await feed(env, ODP.units()[0]!); // a listing of C1M_BR2_18:56: no ClassId on the wire
    await ws.barrier();
    const got = ws.take();
    expect(got.some((m) => m.type === 'attempt.updated' && m.attemptId === ODP.attemptId)).toBe(true);
    expect(got.filter((m) => m.type === 'phase.updated'), 'no phase.updated while its class is unknown').toEqual([]);
    const at = await get(env, `/api/phases/${ODP.phaseId}/attempts`);
    expect(at.status).toBe(200);
    expect(at.body.attempts.map((a: J) => a.attemptId)).toEqual([ODP.attemptId]);
    expect((await get(env, '/api/oncourse')).body.attempts.map((a: J) => a.attemptId)).toEqual([ODP.attemptId]);
    const cur = await get(env, '/api/events/current');
    for (const c of cur.body.classes as J[]) {
      expect((await get(env, `/api/classes/${c.classId}/phases`)).body.phases.map((p: J) => p.phaseId)).not.toContain(ODP.phaseId);
    }
    expect((await get(env, '/api/phases/NEVER_SEEN/attempts')).status, '404 is for a phaseId never observed').toBe(404);
    // round 27b: hydration names the Phase as pending, and the checks of an observed but uncreated Phase are 200, an unknown id 404
    expect(cur.body.pendingPhaseIds).toEqual([ODP.phaseId]);
    const ck = await get(env, `/api/phases/${ODP.phaseId}/checks`);
    expect(ck.status).toBe(200);
    expect(ck.body).toMatchObject({ checks: [], flags: [] });
    expect((await get(env, '/api/phases/NEVER_SEEN/checks')).status).toBe(404);
    // a hydrating client holds the Attempt through the pending id, and equals the applied stream
    const fresh = (await hydrate(env)).model;
    expect(view(fresh)['attempts']).toEqual(view(modelFrom(ws.messages))['attempts']);
    expect(fresh.phases.has(ODP.phaseId)).toBe(false);
  });

  it('contract §2.4 (round 27): the Phase\'s creating message comes at the first unit that states its classId (a Results row), whole, classId included; the Class\'s creating message carries discipline', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const units = ODP.units();
    const firstResults = units.findIndex((u) => u.rec.data.includes('<Results'));
    expect(firstResults).toBeGreaterThan(0);
    for (const u of units.slice(0, firstResults)) await feed(env, u);
    await ws.barrier();
    expect(ws.messages.filter((m) => m.type === 'phase.updated')).toEqual([]);
    await feed(env, units[firstResults]!);
    await ws.barrier();
    expect((await get(env, '/api/events/current')).body.pendingPhaseIds, 'the id leaves the list at the creating phase.updated').toEqual([]);
    const created = ws.messages.find((m) => m.type === 'phase.updated' && m.phaseId === ODP.phaseId)!;
    expect(created, 'created at the Results unit').toBeDefined();
    expect(created.fields.classId).toBe(ODP.classId);
    expect(Object.keys(created.fields).sort()).toEqual([...WHOLE['phase']!].sort());
    const cls = ws.messages.find((m) => m.type === 'class.updated' && m.classId === ODP.classId)!;
    expect(cls.fields.discipline, 'a TCP Results message names its RaceId, whose token decides').toBe('slalom');
    expect(Object.keys(cls.fields)).toEqual(expect.arrayContaining([...WHOLE['class']!]));
  });

  it('contract §7.1/§7.2 (round 27): oncourse.asOf is the ingest time of the unit at which the set last changed (listing, order, oncourse-empty, a derived leave); a listing that changes nothing moves nothing; REST equals the last message', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const lastSet = (): J => [...ws.messages].reverse().find((m) => m.type === 'oncourse.updated')!;
    const agree = async (at: number): Promise<void> => {
      await ws.barrier();
      expect(lastSet().asOf).toBe(new Date(at).toISOString());
      expect((await get(env, '/api/oncourse')).body.asOf).toBe(lastSet().asOf);
    };
    const [a, a2, b] = ODP.listings(['1', '1', '2'], [31, 31, 32], [51, 51, 52]);
    const t = (u: { rec: { observedAt: string } }): number => Date.parse(u.rec.observedAt);
    await feed(env, a!); await agree(t(a!));
    const n = ws.messages.filter((m) => m.type === 'oncourse.updated').length;
    await feed(env, a2!); // the same listing again, 0.1 s later: nothing changed
    await ws.barrier();
    expect(ws.messages.filter((m) => m.type === 'oncourse.updated').length).toBe(n);
    expect((await get(env, '/api/oncourse')).body.asOf).toBe(new Date(t(a!)).toISOString());
    await feed(env, b!); await agree(t(b!));
    // the leave is derived at a TCP message (§4.1: not named for 4 s of ingest time while other TCP messages keep arriving; a longer gap is a stall, not a leave)
    let leaveAt = 0;
    for (let k = 1; k <= 8 && leaveAt === 0; k++) {
      const at = t(b!) + k * 1000;
      await feed(env, ODP.rowAt(at));
      await ws.barrier();
      if (lastSet().attemptIds.length === 0) leaveAt = at;
    }
    expect(leaveAt, 'both Attempts left within 8 s of messages').toBeGreaterThan(0);
    await agree(leaveAt);
    const e = leaveAt + 10_000;
    await feed(env, a!); await feed(env, ODP.emptyAt(e));
    await agree(e);
  });
});

describe('row 6, review B2 (#258 O7: a first run\'s §4.5 unavailable when its sibling arrives)', () => {
  it('contract §4.5 + §1.6 + §7.2, no XML configured: a BR1 start-list Attempt, then the BR2 result of the same bib: the client that applied every message equals a fresh hydration after each unit', async () => {
    const env = await boot({ startAt: NKZ.startAt, eventDate: NKZ.day, xml: undefined });
    const ws = await openWs(env);
    const units = NKZ.units();
    const br2 = (at: string, edit: (d: string) => string): Unit => ({ kind: 'tcp', rec: derived(units[1]!.rec, { observedAt: at, edit: (d) => edit(d.replace(/C1M_BR1_19/g, 'C1M_BR2_19')) }) });
    // the first run is only listed (no outcome of its own); the second run then states a result for the same bib: the first run's outcome becomes unavailable
    const startList = units[3]!; // the recorded BR1 start-list row of bib 7: the Attempt exists, with no outcome observed
    expect(startList.rec.data).toContain('1st Run - Start List');
    const t = Date.parse(startList.rec.observedAt);
    await holdsAfterEachUnit(env, ws, [
      startList,
      br2(new Date(t + 60_000).toISOString(), (d) => d),
      br2(new Date(t + 61_000).toISOString(), (d) => d.replace('Time="96.69"', 'Time="95.00"').replace('Total="102.69"', 'Total="101.00"')),
    ]);
    const outcome = (await get(env, `/api/phases/${NKZ.phaseId}/attempts`)).body.attempts.find((a: J) => a.attemptId === NKZ.attemptId).outcome;
    expect(outcome, 'CONTRACTS §4.5: run 1 unavailable once run 2 has a result and no XML can supply it').toMatchObject({ state: 'unavailable', reason: 'not-configured' });
    const first = ws.messages.filter((x) => x.type === 'attempt.updated' && x.attemptId === NKZ.attemptId);
    expect(first.length).toBeGreaterThan(0);
  });
});

describe('CQ2 (round 27d): Standing.classId is the Phase\'s classId, never the RaceId prefix; a Standing follows its Phase', () => {
  it('contract §2.7/§2.3: a class whose ClassId differs from its RaceId prefix (C1M-ST against C1M_BR2_18): standing.updated carries classId C1M-ST and /api/classes/C1M-ST/standings serves the Standings', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    await feed(env, ODP.hyphenRow());
    await ws.barrier();
    const pushed = ws.messages.filter((m) => m.type === 'standing.updated');
    expect(pushed.length, 'the recorded row has a rank, so a Standing is published').toBeGreaterThan(0);
    for (const m of pushed) expect(m.standing.classId).toBe('C1M-ST');
    const rest = await get(env, '/api/classes/C1M-ST/standings');
    expect(rest.status).toBe(200);
    expect((rest.body.standings as J[]).map((s) => s.standingKey).sort()).toEqual(pushed.map((m) => m.standing.standingKey).sort());
    expect((await get(env, '/api/classes/C1M/standings')).status, 'no class C1M was stated').toBe(404);
    expect(view(modelFrom(ws.messages))['standings']).toEqual(view((await hydrate(env)).model)['standings']);
    // within the unit that creates the Phase, its message precedes the Standing's (round 27d-2)
    const phase = ws.messages.find((m) => m.type === 'phase.updated' && m.phaseId === ODP.phaseId)!;
    expect(phase.fields.classId).toBe('C1M-ST');
    expect(phase.seq).toBeLessThan(Math.min(...pushed.map((m) => m.seq)));
  });

  it('contract §1.6 + round 27d: no standing.updated precedes the creating phase.updated of a Phase the Standing names (TCP-only nkz and the odp stream)', async () => {
    for (const [boot_, units] of [[{ startAt: NKZ.startAt, eventDate: NKZ.day }, NKZ.units()], [{ startAt: ODP.startAt, eventDate: ODP.day }, ODP.units()]] as const) {
      const env = await boot(boot_);
      const ws = await openWs(env);
      for (const u of units) await feed(env, u);
      await ws.barrier();
      const created = new Map<string, number>();
      for (const m of ws.messages) if (m.type === 'phase.updated' && !created.has(m.phaseId)) created.set(m.phaseId, m.seq);
      const standings = ws.messages.filter((m) => m.type === 'standing.updated');
      for (const m of standings) {
        const sc = m.standing.scope as J;
        // the Phase the Standing is of (a pair\'s sibling may never be observed on this stream, so it is ordered only when it exists)
        for (const id of [sc.phaseId, sc.secondPhaseId ?? sc.firstPhaseId, sc.firstPhaseId].filter((x) => typeof x === 'string')) {
          if (id !== sc.phaseId && id !== sc.secondPhaseId && !created.has(id)) continue;
          expect(created.has(id), `${m.standing.standingKey}: its Phase ${id} was created`).toBe(true);
          expect(created.get(id)!, `${m.standing.standingKey} follows the creating phase.updated of ${id}`).toBeLessThan(m.seq);
        }
      }
      await disposeAll();
    }
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
      const m = await c.until((x) => x.type === 'event.changed' && x.event.eventId === 'ev-2');
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
  const cells = (l: J[]): J[] => l.filter((d) => d.kind === 'unparseable-cell');
  const odp = async (): Promise<Env> => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    for (const u of ODP.units()) await feed(env, u); // the snapshot binds the Phase to its Course, so gate cells can be read (and misread)
    return env;
  };

  it('contract §7.1/§7.2: GET /api/diagnostics and diagnostics.updated carry the whole current list when it changes: text in two gate cells raises two unparseable-cell, a restated clean row clears them', async () => {
    const env = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    await feed(env, ODP.textRow());
    await ws.barrier();
    const first = [...ws.messages].reverse().find((x) => x.type === 'diagnostics.updated')!;
    expect(first, 'the list changed, so it is pushed').toBeDefined();
    expect(cells(first.diagnostics)).toHaveLength(2);
    expect(first.diagnostics).toEqual(await diag(env));
    await feed(env, ODP.cleanRow());
    await ws.barrier();
    const last = [...ws.messages].reverse().find((x) => x.type === 'diagnostics.updated')!;
    expect(last.seq).toBeGreaterThan(first.seq);
    expect(cells(last.diagnostics)).toEqual([]);
    expect(last.diagnostics).toEqual(await diag(env));
  });

  it('INV-5: the same row received again changes no diagnostic, so no diagnostics.updated is sent', async () => {
    const env = await odp();
    const ws = await openWs(env);
    await feed(env, ODP.textRow());
    await ws.barrier();
    expect(cells(await diag(env)).length).toBeGreaterThan(0);
    const n = ws.messages.filter((x) => x.type === 'diagnostics.updated').length;
    await feed(env, ODP.textRowAgain());
    await ws.barrier();
    expect(ws.messages.filter((x) => x.type === 'diagnostics.updated').length).toBe(n);
  });
});
