/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #212 rows 1-9 (tier 1): the penalty write path (CONTRACTS §7.3, §1.5, §2.9; ADR-010; EVIDENCE Exhibits 13 and 14).
 * Interface: onsite-harness.ts header ("The write path"). Data: datasets.ts (jarni-so-odp C1M_BR2_18 bib 56: gate 13 = 2 in the recorded snapshot).
 * The outbound side is the fake TCP sink `env.tcp.written`; the upstream side of the echo is a TCP Results row fed back (datasets `ODP.echo`).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  boot, disposeAll, feedTcp, get, hydrate, modelFrom, openWs, post, setInstance, view, virtualClock, type Env, type J,
} from './onsite-harness.js';
import { CROSS, JNE, ODP, feed } from './datasets.js';

afterEach(disposeAll);

const HERE = dirname(fileURLToPath(import.meta.url));
// Round 28 adds the reason `upstream-disconnected` to error.schema.json; until PR #296 merges the schema is read from its branch's worktree when present.
const ROUND28 = '/workspace/timing/.worktrees/c123-server-round28/docs/arch/schemas';
const SCHEMAS = existsSync(resolve(ROUND28, 'error.schema.json')) && readFileSync(resolve(ROUND28, 'error.schema.json'), 'utf8').includes('upstream-disconnected') ? ROUND28 : resolve(HERE, '../../../docs/arch/schemas');
const errorSchema = (): ((x: unknown) => boolean) & { errors?: unknown } => {
  const Ctor = ((Ajv2020 as any).default ?? Ajv2020) as new (o: object) => any;
  const ajv = new Ctor({ strict: true, allErrors: true });
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  return ajv.compile(JSON.parse(readFileSync(resolve(SCHEMAS, 'error.schema.json'), 'utf8')));
};

const PATH = `/api/attempts/${ODP.phaseId}/56/penalty`;
const KEY = (k: string): Record<string, string> => ({ 'Idempotency-Key': k });
const write = (env: Env, body: unknown, key: string | undefined = 'k1', path = PATH): ReturnType<typeof post> => post(env, path, body, key === undefined ? {} : KEY(key));
const GOOD = { gate: ODP.gate, value: 50 };

/** The recorded stream through the closure of the run: bib 56 has finished and has left the on-course set. */
async function closedRun(over: { xmlRec?: Parameters<typeof feed>[1] } = {}): Promise<Env> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  const units = ODP.unitsXmlFirst();
  if (over.xmlRec !== undefined) units[0] = over.xmlRec;
  for (const u of units) await feed(env, u);
  await feed(env, ODP.emptyAt(env.clock.now() + 1000)); // upstream's closure: the set is empty
  const oc = await get(env, '/api/oncourse');
  expect(oc.body.attempts.map((a: J) => a.attemptId), 'precondition: the run is closed').not.toContain(ODP.attemptId);
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
  expect(a.gates.state, 'precondition: the snapshot states the gates').toBe('known');
  return env;
}
const run = async (env: Env): Promise<number> => (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId).run.value;
const sent = (env: Env): string[] => env.tcp.written;
const cmd = (xml: string): { system: string; attrs: Record<string, string>; element: string } => {
  expect(xml.endsWith('|'), 'terminated by one |').toBe(true);
  expect(xml.slice(0, -1).includes('|')).toBe(false);
  const m = /^<Canoe123 System="([^"]*)"><([A-Za-z]+)((?:\s+[A-Za-z]+="[^"]*")*)\s*\/><\/Canoe123>\|$/.exec(xml);
  expect(m, `compact one-element envelope: ${xml}`).not.toBeNull();
  return { system: m![1]!, element: m![2]!, attrs: Object.fromEntries([...m![3]!.matchAll(/([A-Za-z]+)="([^"]*)"/g)].map((x) => [x[1]!, x[2]!])) };
};

describe('row 1: the route and its 202 (CONTRACTS §7.3)', () => {
  it('contract §7.3: POST /api/attempts/{phaseId}/{bib}/penalty on a closed run: 202, Location /api/writes/{writeId}, WriteRequest pending targeting the current generation; GET returns it', async () => {
    const env = await closedRun();
    const gen = await run(env);
    const at = env.clock.now();
    const r = await write(env, GOOD);
    expect(r.status).toBe(202);
    expect(r.body).toMatchObject({ target: { phaseId: ODP.phaseId, bib: '56', run: gen, field: 'gate-penalty' }, requestedValue: { gate: ODP.gate, value: 50 }, status: 'pending', submittedAt: new Date(at).toISOString() });
    expect(typeof r.body.writeId).toBe('string');
    expect(r.headers.get('Location')).toBe(`/api/writes/${r.body.writeId as string}`);
    expect('confirmedValue' in r.body || 'confirmedAt' in r.body).toBe(false);
    const g = await get(env, r.headers.get('Location')!);
    expect(g.status).toBe(200);
    expect(g.body).toEqual(r.body);
  });

  it('contract §1.4/§7.3: GET /api/writes/{writeId} of an id never issued is 404 write-not-found, an error.schema.json envelope', async () => {
    const env = await closedRun();
    const r = await get(env, '/api/writes/never-issued');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('write-not-found');
    const check = errorSchema();
    expect(check(r.body), JSON.stringify(check.errors)).toBe(true);
  });
});

describe('row 2: push in the same step (CONTRACTS §2.9)', () => {
  it('contract §2.9: the optimistic value (attempt.updated, provisional, source operator-write) and the WriteRequest (write.updated) are one unit: adjacent seqs, nothing between; the stream equals hydration', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await write(env, GOOD);
    expect(r.status).toBe(202);
    await ws.barrier();
    const got = ws.take();
    const a = got.find((m) => m.type === 'attempt.updated' && m.attemptId === ODP.attemptId)!;
    const w = got.find((m) => m.type === 'write.updated')!;
    expect(a, 'the optimistic value is pushed').toBeDefined();
    expect(w.write).toEqual(r.body);
    expect(a.fields.gates).toMatchObject({ state: 'known', source: 'operator-write', provisional: true });
    expect(a.fields.gates.value.find((g: J) => g.number === ODP.gate).penalty).toBe(50);
    expect(Math.abs(a.seq - w.seq), 'one unit').toBe(1);
    expect(got.filter((m) => m.seq > Math.min(a.seq, w.seq) && m.seq < Math.max(a.seq, w.seq))).toEqual([]);
    const client = modelFrom(ws.messages);
    expect(view(client)['attempts'].find((x: J) => x.attemptId === ODP.attemptId).gates).toEqual((await hydrate(env)).model.attempts.get(ODP.attemptId)!['gates']);
  });
});

describe('row 3: validation (CONTRACTS §7.3, §1.4)', () => {
  it('contract §7.3: value outside {0, 2, 50}, a non-integer or mistyped gate, a gate outside the course, an unreadable body: 400 validation-failed with details [{field, issue}]; nothing is sent upstream', async () => {
    const env = await closedRun();
    const check = errorSchema();
    for (const body of [{ gate: ODP.gate, value: 7 }, { gate: ODP.gate, value: '2' }, { gate: ODP.gate, value: null }, { gate: ODP.gate }, { value: 2 }, { gate: 99, value: 2 }, { gate: 0, value: 2 }, { gate: 1.5, value: 2 }, { gate: '13', value: 2 }, 'not json', []]) {
      const r = await write(env, body);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.body.error.code).toBe('validation-failed');
      expect(check(r.body), JSON.stringify(check.errors)).toBe(true);
      for (const d of r.body.error.details as J[]) { expect(typeof d.field).toBe('string'); expect(typeof d.issue).toBe('string'); }
    }
    expect(sent(env)).toEqual([]);
  });

  it('contract §7.3: a missing Idempotency-Key is 400 validation-failed; nothing is sent', async () => {
    const env = await closedRun();
    const r = await write(env, GOOD, undefined);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation-failed');
    expect(r.body.error.details).toEqual([{ field: 'Idempotency-Key', issue: 'missing' }]);
    expect(sent(env)).toEqual([]);
  });

  it('contract §7.3: a Phase with no course configured is 400 validation-failed (jarni-ne-do: the snapshot carries no CourseData)', async () => {
    const env = await boot({ startAt: JNE.startAt, eventDate: JNE.day });
    for (const u of JNE.units()) await feed(env, u);
    const r = await write(env, { gate: 1, value: 2 }, 'k1', `/api/attempts/${JNE.phaseId}/22/penalty`);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation-failed');
    expect(sent(env)).toEqual([]);
  });

  it('contract §1.4/§7.3: an Attempt that does not resolve (unknown bib, unknown Phase) is 404 attempt-not-found; nothing is sent', async () => {
    const env = await closedRun();
    for (const p of [`/api/attempts/${ODP.phaseId}/999/penalty`, '/api/attempts/NOPE/56/penalty']) {
      const r = await write(env, GOOD, 'k1', p);
      expect(r.status, p).toBe(404);
      expect(r.body.error.code).toBe('attempt-not-found');
    }
    expect(sent(env)).toEqual([]);
  });
});

describe('row 4: refusals (CONTRACTS §7.3)', () => {
  it('contract §7.3 run-not-closed: while the Attempt is in the on-course set, a finisher still listed included: 409 write-not-possible reason run-not-closed; no WriteRequest, no message, nothing sent, the key unbound; after the Attempt leaves the set the same key succeeds', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const units = ODP.unitsXmlFirst();
    const finishAt = units.findIndex((u) => u.rec.data.includes('dtFinish="1'));
    for (const u of units.slice(0, finishAt + 1)) await feed(env, u);
    const oc = (await get(env, '/api/oncourse')).body.attempts.find((a: J) => a.attemptId === ODP.attemptId);
    expect(oc?.status.value, 'precondition: the finisher is still listed').toBe('finished');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await write(env, GOOD, 'same-key');
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'run-not-closed' } });
    const check = errorSchema();
    expect(check(r.body), JSON.stringify(check.errors)).toBe(true);
    await ws.barrier();
    expect(ws.take(), 'a refusal changes nothing and pushes nothing').toEqual([]);
    expect(sent(env)).toEqual([]);
    await feed(env, ODP.emptyAt(env.clock.now() + 1000)); // closure
    const again = await write(env, GOOD, 'same-key');
    expect(again.status).toBe(202);
    expect(sent(env)).toHaveLength(1);
  });

  it('contract §7.3 team-boat: an Entry.isTeam Attempt: 409 write-not-possible reason team-boat; nothing sent', async () => {
    const env = await closedRun({ xmlRec: ODP.teamXml() });
    const e = (await get(env, `/api/classes/${ODP.classId}/entries`)).body.entries.find((x: J) => x.isTeam.value === true);
    expect(e, 'precondition: the entry is a team boat').toBeDefined();
    const r = await write(env, GOOD);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'team-boat' } });
    expect(sent(env)).toEqual([]);
  });

  it('contract §7.3 cross: an Attempt of a Kayak Cross Phase: 409 write-not-possible reason cross, whatever the body; nothing sent', async () => {
    const env = await boot({ startAt: CROSS.startAt, eventDate: CROSS.day });
    for (const u of CROSS.units()) await feed(env, u);
    const r = await write(env, { gate: 1, value: 2 }, 'k1', `/api/attempts/${CROSS.phaseId}/${CROSS.bib}/penalty`);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'cross' } });
    expect(sent(env)).toEqual([]);
  });
});

describe('row 5: idempotency (CONTRACTS §1.5)', () => {
  it('contract §1.5: the same key returns 200 with the same WriteRequest at every status (pending, confirmed) and sends no second command', async () => {
    const env = await closedRun();
    const first = await write(env, GOOD, 'idem');
    expect(first.status).toBe(202);
    const pending = await write(env, GOOD, 'idem');
    expect(pending.status).toBe(200);
    expect(pending.body).toEqual(first.body);
    await feed(env, ODP.echo(50, env.clock.now() + 1000));
    const now = (await get(env, `/api/writes/${first.body.writeId as string}`)).body;
    expect(now.status).toBe('confirmed');
    const confirmed = await write(env, GOOD, 'idem');
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toEqual(now);
    expect(sent(env), 'one command for one key').toHaveLength(1);
  });

  it('contract §1.5: a different key on the same field is a new correction: a new WriteRequest and a second command', async () => {
    const env = await closedRun();
    const a = await write(env, GOOD, 'k-a');
    const b = await write(env, { gate: ODP.gate, value: 0 }, 'k-b');
    expect(b.status).toBe(202);
    expect(b.body.writeId).not.toBe(a.body.writeId);
    expect(sent(env)).toHaveLength(2);
  });

  it('contract §1.5: the key-to-WriteRequest map holds for 24 h on the injected clock', async () => {
    const env = await closedRun();
    const first = await write(env, GOOD, 'long');
    env.clock.jump(env.clock.now() + 24 * 3600 * 1000 - 1000);
    const later = await write(env, GOOD, 'long');
    expect(later.status).toBe(200);
    expect(later.body.writeId).toBe(first.body.writeId);
    expect(sent(env)).toHaveLength(1);
  });

  it('round 28 item 6: after 24 h the map may be dropped; a retry is then accepted, as the same write (kept) or as a new correction (dropped)', async () => {
    const env = await closedRun();
    const first = await write(env, GOOD, 'long');
    env.clock.jump(env.clock.now() + 24 * 3600 * 1000 + 1000);
    const later = await write(env, GOOD, 'long');
    expect([200, 202]).toContain(later.status);
    if (later.status === 202) { expect(later.body.writeId).not.toBe(first.body.writeId); expect(sent(env)).toHaveLength(2); }
    else { expect(later.body.writeId).toBe(first.body.writeId); expect(sent(env)).toHaveLength(1); }
  });
});

describe('row 6: the correction command (c123-protocol.md "PenaltyCorrection"; EVIDENCE Exhibits 13, 14)', () => {
  it('Exhibit 14 + protocol: the bytes sent are one compact PenaltyCorrection carrying RaceId, Bib, Gate and Value, | terminated; never the on-course scoring command', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    expect((await get(env, '/api/sources')).body.tcp.upstreamInstance).toBe('main');
    await write(env, GOOD);
    expect(sent(env)).toHaveLength(1);
    const c = cmd(sent(env)[0]!);
    expect(c.element).toBe('PenaltyCorrection');
    expect(c.attrs).toEqual({ RaceId: ODP.phaseId, Bib: '56', Gate: String(ODP.gate), Value: '50' });
    expect(sent(env)[0]).not.toMatch(/Scoring|RemoveFromCourse|Timing/);
  });

  it('Exhibit 13 + §7.3: the envelope names the connected instance, never a constant: Main, then (after the timekeeper\'s failover) Backup', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    await write(env, GOOD, 'to-main');
    await setInstance(env, 'Backup');
    expect((await get(env, '/api/sources')).body.tcp.upstreamInstance).toBe('backup');
    await write(env, { gate: ODP.gate, value: 2 }, 'to-backup');
    expect(sent(env).map((x) => cmd(x).system)).toEqual(['Main', 'Backup']);
  });
});

describe('row 7: no TCP connection (CONTRACTS §7.3, §1.4, §2.8; round 28 items 1 and 3)', () => {
  it('round 28: with TCP not connected the write is 409 write-not-possible reason upstream-disconnected (an error.schema.json envelope): no WriteRequest, no push, nothing sent, the key unbound; the same key succeeds after reconnect', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    env.tcp.disconnect();
    await ws.barrier(); ws.take();
    const r = await write(env, GOOD, 'offline');
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'upstream-disconnected' } });
    const check = errorSchema();
    expect(check(r.body), JSON.stringify(check.errors)).toBe(true);
    await ws.barrier();
    expect(ws.take().filter((m) => m.type === 'write.updated' || m.type === 'attempt.updated')).toEqual([]);
    expect(sent(env)).toEqual([]);
    env.tcp.connect();
    const ok = await write(env, GOOD, 'offline');
    expect(ok.status).toBe(202);
  });

  it('round 28 item 3: a socket write that is rejected is the same 409 upstream-disconnected: no WriteRequest and no optimistic value are left behind, the key is unbound', async () => {
    const env = await closedRun();
    const before = JSON.stringify((await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts);
    env.tcp.failNextWrite();
    const r = await write(env, GOOD, 'flaky');
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'upstream-disconnected' } });
    expect(JSON.stringify((await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts)).toBe(before);
    expect((await write(env, GOOD, 'flaky')).status).toBe(202);
  });
});

describe('validation order, most permanent first (round 28 item 4)', () => {
  const BAD = { gate: 99, value: 7 };
  it('404 attempt-not-found before everything else (bad body, no key)', async () => {
    const env = await closedRun();
    const r = await write(env, BAD, undefined, `/api/attempts/${ODP.phaseId}/999/penalty`);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('attempt-not-found');
  });

  it('409 cross and 409 team-boat before the body and the header are looked at', async () => {
    const cross = await boot({ startAt: CROSS.startAt, eventDate: CROSS.day });
    for (const u of CROSS.units()) await feed(cross, u);
    const c = await write(cross, BAD, undefined, `/api/attempts/${CROSS.phaseId}/${CROSS.bib}/penalty`);
    expect(c.status).toBe(409);
    expect(c.body.error.details.reason).toBe('cross');
    const team = await closedRun({ xmlRec: ODP.teamXml() });
    const t = await write(team, BAD, undefined);
    expect(t.status).toBe(409);
    expect(t.body.error.details.reason).toBe('team-boat');
  });

  it('400 for the header and the body shape before the course: a missing key reports Idempotency-Key even when the gate is also outside the course; a bad value is 400 before run-not-closed', async () => {
    const env = await closedRun();
    const noKey = await write(env, { gate: 99, value: 2 }, undefined);
    expect(noKey.status).toBe(400);
    expect(noKey.body.error.details.map((d: J) => d.field)).toContain('Idempotency-Key');
    const live = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const units = ODP.unitsXmlFirst();
    for (const u of units.slice(0, units.findIndex((u) => u.rec.data.includes('dtFinish="1')) + 1)) await feed(live, u);
    expect((await get(live, '/api/oncourse')).body.attempts.map((a: J) => a.attemptId), 'precondition: the run is not closed').toContain(ODP.attemptId);
    const bad = await write(live, { gate: ODP.gate, value: 7 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('validation-failed');
  });

  it('409 run-not-closed before 409 upstream-disconnected; a valid body on a closed run with TCP down is upstream-disconnected', async () => {
    const live = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const units = ODP.unitsXmlFirst();
    for (const u of units.slice(0, units.findIndex((u) => u.rec.data.includes('dtFinish="1')) + 1)) await feed(live, u);
    live.tcp.disconnect();
    const r = await write(live, GOOD);
    expect(r.status).toBe(409);
    expect(r.body.error.details.reason).toBe('run-not-closed');
    const closed = await closedRun();
    closed.tcp.disconnect();
    expect((await write(closed, { gate: 99, value: 2 })).status, 'validation before the connection check').toBe(400);
    expect((await write(closed, GOOD)).body.error.details.reason).toBe('upstream-disconnected');
  });
});

describe('row 8: lifecycle (CONTRACTS §2.9, ADR-010)', () => {
  const status = async (env: Env, id: string): Promise<J> => (await get(env, `/api/writes/${id}`)).body;
  const lastWrite = (ws: { messages: J[] }): J => [...ws.messages].reverse().find((m) => m.type === 'write.updated')!.write;

  it('an echo of the same field and generation stating the requested value: confirmed, with confirmedValue and confirmedAt; pushed as write.updated', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    const r = await write(env, GOOD);
    await feed(env, ODP.echo(50, env.clock.now() + 1000));
    await ws.barrier();
    const w = await status(env, r.body.writeId);
    expect(w.status).toBe('confirmed');
    expect(w.confirmedValue).toBeDefined();
    expect(w.confirmedAt).toEqual(expect.any(String));
    expect(lastWrite(ws)).toEqual(w);
  });

  it('an echo stating another value: mismatched, with the value upstream holds', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    const r = await write(env, GOOD);
    await feed(env, ODP.echo(0, env.clock.now() + 1000));
    await ws.barrier();
    const w = await status(env, r.body.writeId);
    expect(w.status).toBe('mismatched');
    expect(w.confirmedValue).toBeDefined();
    expect(lastWrite(ws)).toEqual(w);
  });

  it('a re-run first (a new generation): superseded, never matched against the re-run\'s penalties', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    const gen = await run(env);
    const r = await write(env, GOOD);
    await feed(env, ODP.rerun(env.clock.now() + 1000));
    await ws.barrier();
    expect(await run(env), 'precondition: the generation moved').toBe(gen + 1);
    const w = await status(env, r.body.writeId);
    expect(w.status).toBe('superseded');
    expect(lastWrite(ws)).toEqual(w);
  });

  it('a retraction of the field resolves it mismatched with no confirmedValue (rule 4)', async () => {
    const env = await closedRun();
    const r = await write(env, GOOD);
    await feed(env, ODP.wipe(env.clock.now() + 1000));
    const w = await status(env, r.body.writeId);
    expect(w.status).toBe('mismatched');
    expect('confirmedValue' in w).toBe(false);
    expect(w.confirmedAt).toEqual(expect.any(String));
  });

  it('ADR-010: with no echo the write stays pending across any amount of injected time, and nothing is pushed for it', async () => {
    const env = await closedRun();
    const ws = await openWs(env);
    const r = await write(env, GOOD);
    await ws.barrier(); ws.take();
    env.clock.jump(env.clock.now() + 14 * 24 * 3600 * 1000);
    await env.clock.advance(600_000); // heartbeats and polls run on the injected clock
    await ws.barrier();
    expect((await status(env, r.body.writeId)).status).toBe('pending');
    expect(ws.take().filter((m) => m.type === 'write.updated')).toEqual([]);
  });
});

describe('row 9: a closed Phase (CONTRACTS §2.9, maintainer answer A2)', () => {
  it('a write to a run of a Phase that is no longer running is accepted and tracked the same way (the recorded snapshot states the race as finished)', async () => {
    const env = await closedRun();
    const phase = (await get(env, `/api/classes/${ODP.classId}/phases`)).body.phases.find((p: J) => p.phaseId === ODP.phaseId);
    expect(['running', 'paused']).not.toContain(phase.status.value);
    const r = await write(env, GOOD);
    expect(r.status).toBe(202);
    await feedTcp(env, ODP.echo(50, env.clock.now() + 1000).rec);
    expect((await get(env, `/api/writes/${r.body.writeId as string}`)).body.status).toBe('confirmed');
  });
});

describe('round 28 item 8: the key map and the WriteRequests are durable (CONTRACTS §1.5 "at least 24 hours", §2.9, §2.10 discipline)', () => {
  /** A pending write on a closed run, then the process is stopped (graceful) or killed; a new process starts over the same data directory. */
  async function restarted(kind: 'stop' | 'kill'): Promise<{ env1: Env; env2: Env; first: J }> {
    const env1 = await closedRun();
    await setInstance(env1, 'Main');
    const first = await write(env1, GOOD, 'durable-key');
    expect(first.status).toBe(202);
    let fs2 = env1.fs;
    if (kind === 'stop') await env1.h.stop();
    else { fs2 = env1.fs.afterKill(); env1.h.kill(); } // an acknowledged write is durable: only completed renames survive
    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: fs2, clock: virtualClock(env1.clock.now() + 60_000) });
    return { env1, env2, first: first.body };
  }
  const replay = async (env: Env): Promise<void> => {
    for (const u of ODP.unitsXmlFirst()) await feed(env, u);
    await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  };

  for (const kind of ['stop', 'kill'] as const) {
    it(`a pending WriteRequest survives a ${kind} and start over the same data dir: GET /api/writes/{id} returns it unchanged, still pending`, async () => {
      const { env2, first } = await restarted(kind);
      const g = await get(env2, `/api/writes/${first.writeId as string}`);
      expect(g.status).toBe(200);
      expect(g.body).toEqual(first);
      expect(g.body.status).toBe('pending');
    });

    it(`its key survives a ${kind}: the same key returns 200 with the same WriteRequest and sends no second command upstream`, async () => {
      const { env2, first } = await restarted(kind);
      await replay(env2);
      await setInstance(env2, 'Main');
      const again = await write(env2, GOOD, 'durable-key');
      expect(again.status).toBe(200);
      expect(again.body).toEqual(first);
      expect(sent(env2), 'a restart must not turn a retried key into a second command').toEqual([]);
    });
  }

  it('a pending write resumes waiting for its echo after a restart: an echo of the same field and generation then confirms it', async () => {
    const { env2, first } = await restarted('stop');
    await replay(env2);
    await feed(env2, ODP.echo(50, env2.clock.now() + 1000));
    const w = (await get(env2, `/api/writes/${first.writeId as string}`)).body;
    expect(w.status).toBe('confirmed');
    expect(w.writeId).toBe(first.writeId);
  });

  it('a write is not durable before it is acknowledged, and not acknowledged before it is durable: with the rename held there is no 202; a kill then leaves neither the write nor the key', async () => {
    const env1 = await closedRun();
    await setInstance(env1, 'Main');
    const hold = env1.fs.holdRename();
    let answered = false;
    const done = write(env1, GOOD, 'held-key').then(() => { answered = true; });
    await Promise.race([hold.reached, done]); // an answer before the rename is reached fails below, at once
    await env1.clock.advance(0);
    expect(answered, 'not acknowledged before it is durable').toBe(false);
    const fs2 = env1.fs.afterKill();
    env1.h.kill();
    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: fs2, clock: virtualClock(env1.clock.now() + 60_000) });
    await replay(env2);
    await setInstance(env2, 'Main');
    const retry = await write(env2, GOOD, 'held-key');
    expect(retry.status, 'the key was never durable: a new correction').toBe(202);
  });
});

describe('round 28-2: the key in flight, the creating step, key replay first, no instance (CONTRACTS §1.5, §2.9, §7.3)', () => {
  it('B1: the key is reserved before the socket write: a same-key request during the write waits for the outcome or is answered from it, and never sends a second command; one WriteRequest, one push', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const hold = env.tcp.holdNextWrite();
    const a = write(env, GOOD, 'in-flight');
    await Promise.race([hold.reached, a]);
    expect(env.tcp.written, 'the first request is at the socket').toHaveLength(1);
    const b = write(env, GOOD, 'in-flight');
    await ws.barrier();
    hold.release();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.status).toBe(202);
    expect(rb.status, 'the second request is answered from the first\'s outcome').toBe(200);
    expect(rb.body).toEqual(ra.body);
    expect(sent(env), 'never a second command upstream').toHaveLength(1);
    await ws.barrier();
    expect(ws.take().filter((m) => m.type === 'write.updated'), 'one WriteRequest, one push').toHaveLength(1);
  });

  it('B1: a same-key request that arrives while the first fails at the socket is answered from that outcome: 409 upstream-disconnected, no WriteRequest; the key is then free', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const hold = env.tcp.holdNextWrite();
    const a = write(env, GOOD, 'doomed');
    await Promise.race([hold.reached, a]);
    const b = write(env, GOOD, 'doomed');
    hold.fail();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.status).toBe(409);
    expect(rb.status).toBe(409);
    expect(rb.body.error.details.reason).toBe('upstream-disconnected');
    expect(sent(env)).toHaveLength(1);
    expect((await write(env, GOOD, 'doomed')).status, 'the key was released').toBe(202);
  });

  it('B1: no ingest unit is applied between the socket write and the WriteRequest\'s creation: an echo that arrives during the held write is not lost, the write resolves confirmed, and its push precedes the unit\'s', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const hold = env.tcp.holdNextWrite();
    const a = write(env, GOOD, 'racing');
    await Promise.race([hold.reached, a]);
    await feed(env, ODP.echo(50, env.clock.now() + 1000)); // upstream\'s echo arrives while the command is still at the socket
    hold.release();
    const r = await a;
    expect(r.status).toBe(202);
    await ws.barrier();
    const w = (await get(env, `/api/writes/${r.body.writeId as string}`)).body;
    expect(w.status, 'the echo was applied after the write existed').toBe('confirmed');
    const pushes = ws.messages.filter((m) => m.type === 'write.updated');
    expect(pushes.map((m) => m.write.status)).toEqual(['pending', 'confirmed']);
    expect(pushes[0]!.seq).toBeLessThan(pushes[1]!.seq);
    const optimistic = ws.messages.find((m) => m.type === 'attempt.updated' && m.fields.gates?.source === 'operator-write');
    expect(optimistic, 'the optimistic value is pushed before the echo\'s unit').toBeDefined();
    expect(optimistic!.seq).toBeLessThan(pushes[1]!.seq);
  });

  it('B2: a bound key is answered 200 with its WriteRequest before any refusal: after TCP has dropped', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const first = await write(env, GOOD, 'bound');
    env.tcp.disconnect();
    const again = await write(env, GOOD, 'bound');
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    expect((await write(env, GOOD, 'fresh')).body.error.details.reason, 'a new key is refused').toBe('upstream-disconnected');
  });

  it('B2: ... after a re-run has started (the run is on course again, the write superseded): 200 with the superseded WriteRequest, not run-not-closed', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const first = await write(env, GOOD, 'bound');
    await feed(env, ODP.rerun(env.clock.now() + 1000));
    const again = await write(env, GOOD, 'bound');
    expect(again.status).toBe(200);
    expect(again.body.writeId).toBe(first.body.writeId);
    expect(again.body.status).toBe('superseded');
    expect((await write(env, GOOD, 'fresh')).body.error.details.reason, 'a new key is refused').toBe('run-not-closed');
  });

  it('B2: ... after a re-baseline (which keeps every WriteRequest, a pending one pending): 200, the same pending WriteRequest', async () => {
    const env = await closedRun();
    await setInstance(env, 'Main');
    const first = await write(env, GOOD, 'bound');
    const rb = await post(env, '/api/rebaseline', { scope: { kind: 'event' } });
    expect(rb.status, 'precondition: the re-baseline ran').toBe(200);
    const again = await write(env, GOOD, 'bound');
    expect(again.status).toBe(200);
    expect(again.body.writeId).toBe(first.body.writeId);
    expect(sent(env)).toHaveLength(1);
  });

  it('28-2: tcp.state connected with upstreamInstance null (no upstream message seen yet) is 409 upstream-disconnected: there is no instance to address; nothing is sent', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    await feed(env, ODP.unitsXmlFirst()[0]!); // the snapshot only: no TCP message, so no instance is known
    expect((await get(env, '/api/sources')).body.tcp).toMatchObject({ state: 'connected', upstreamInstance: null });
    const r = await write(env, GOOD);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'upstream-disconnected' } });
    expect(sent(env)).toEqual([]);
  });

  it('28-2: tcp.state connected with upstreamInstance offline (upstream\'s offline mode writes nothing) is 409 upstream-disconnected; nothing is sent', async () => {
    const env = await closedRun();
    await setInstance(env, 'Offline');
    expect((await get(env, '/api/sources')).body.tcp).toMatchObject({ state: 'connected', upstreamInstance: 'offline' });
    const r = await write(env, GOOD);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'upstream-disconnected' } });
    expect(sent(env)).toEqual([]);
  });
});
