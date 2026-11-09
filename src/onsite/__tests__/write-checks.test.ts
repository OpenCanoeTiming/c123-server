/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #212 rows 10 and 11 (tier 1): gate checks and flags over REST (CONTRACTS §7.4, §2.10, §1.5, §7.2). The routes sit on the store wired by #210
 * (`handle.checks`): acknowledged only after the durable write, followed by `check.updated` / `flag.updated`.
 * Interface: onsite-harness.ts header. Data: datasets.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, del, disposeAll, get, openWs, post, put, virtualClock, type Env, type J } from './onsite-harness.js';
import { CROSS, ODP, feed } from './datasets.js';

afterEach(disposeAll);

const AID = ODP.attemptId;
const CHECK = (gate: number, a = `${ODP.phaseId}/56`): string => `/api/attempts/${a}/checks/${gate}`;
const FLAGS = (a = `${ODP.phaseId}/56`): string => `/api/attempts/${a}/flags`;
const K = (k: string): Record<string, string> => ({ 'Idempotency-Key': k });

async function odp(): Promise<{ env: Env; run: number }> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  for (const u of ODP.unitsXmlFirst()) await feed(env, u);
  await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === AID);
  expect(a.gates.state, 'precondition: the snapshot states the gates (gate 13 = 2)').toBe('known');
  return { env, run: a.run.value as number };
}
const pen = async (env: Env, gate = ODP.gate): Promise<number | null> =>
  (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === AID).gates.value.find((g: J) => g.number === gate).penalty;
const checksOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/checks`)).body;

describe('row 10: gate checks over REST (CONTRACTS §7.4)', () => {
  it('contract §7.4: PUT …/checks/{gate} returns 200 GateCheck for the current generation, valueAtCheck the presented penalty, status verified; GET /checks lists it', async () => {
    const { env, run } = await odp();
    const at = env.clock.now();
    const r = await put(env, CHECK(ODP.gate), { checkedBy: 'judge-1' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ attemptId: AID, run, gate: ODP.gate, checkedAt: new Date(at).toISOString(), checkedBy: 'judge-1', valueAtCheck: ODP.penaltyInXml, status: 'verified' });
    expect((await checksOf(env)).checks).toEqual([r.body]);
  });

  it('contract §7.4: a check made while the gate is unjudged records null; the body may be empty or carry only checkedBy', async () => {
    const { env } = await odp();
    const r = await put(env, CHECK(ODP.gate), {});
    expect(r.status).toBe(200);
    expect('checkedBy' in r.body).toBe(false);
  });

  it('contract §7.4: repeating it replaces the snapshot (a judge re-verifies after a correction): the new presented penalty, verified again', async () => {
    const { env } = await odp();
    await put(env, CHECK(ODP.gate), {});
    await feed(env, ODP.correction()); // gate 13 is now presented as 0
    expect((await checksOf(env)).checks[0].status).toBe('stale');
    const again = await put(env, CHECK(ODP.gate), {});
    expect(again.body).toMatchObject({ valueAtCheck: await pen(env), status: 'verified' });
    expect(again.body.valueAtCheck).toBe(0);
    expect((await checksOf(env)).checks).toHaveLength(1);
  });

  it('contract §7.4: DELETE …/checks/{gate} is 204 whether or not a check existed; the check is gone and check.updated carries check null', async () => {
    const { env } = await odp();
    const ws = await openWs(env);
    await put(env, CHECK(ODP.gate), {});
    await ws.barrier(); ws.take();
    expect((await del(env, CHECK(ODP.gate))).status).toBe(204);
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'check.updated')).toMatchObject({ attemptId: AID, gate: ODP.gate, check: null });
    ws.take();
    expect((await del(env, CHECK(ODP.gate))).status).toBe(204);
    await ws.barrier();
    expect(ws.take().filter((m) => m.type === 'check.updated'), 'round 28 item 7: nothing was removed, nothing is pushed').toEqual([]);
    expect((await checksOf(env)).checks).toEqual([]);
  });

  it('contract §7.4 errors: unknown Attempt 404 attempt-not-found (PUT and DELETE); a gate outside the course 400; a Phase with no course 400; a Cross Attempt 409 write-not-possible reason cross', async () => {
    const { env } = await odp();
    for (const call of [() => put(env, CHECK(ODP.gate, `${ODP.phaseId}/999`), {}), () => del(env, CHECK(ODP.gate, 'NOPE/56'))]) {
      const r = await call();
      expect(r.status).toBe(404);
      expect(r.body.error.code).toBe('attempt-not-found');
    }
    for (const g of [99, 0]) {
      const r = await put(env, CHECK(g), {});
      expect(r.status, `gate ${g}`).toBe(400);
      expect(r.body.error.code).toBe('validation-failed');
    }
    expect((await put(env, CHECK(ODP.gate), { checkedBy: 5 })).status).toBe(400);
    const cross = await boot({ startAt: CROSS.startAt, eventDate: CROSS.day });
    for (const u of CROSS.units()) await feed(cross, u);
    const r = await put(cross, CHECK(1, `${CROSS.phaseId}/${CROSS.bib}`), {});
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'write-not-possible', details: { reason: 'cross' } });
    expect((await put(cross, CHECK(1, `${CROSS.phaseId}/${CROSS.bib}`), {})).status).toBe(409);
    expect((await checksOf(env)).checks).toEqual([]);
  });

  it('contract §7.4 + §2.10: acknowledged only after the durable write, then check.updated: with the rename held there is no response and no push; released, both follow', async () => {
    const { env, run } = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const hold = env.fs.holdRename();
    let answered = false;
    const p = put(env, CHECK(ODP.gate), {}).then((r) => { answered = true; return r; });
    await Promise.race([hold.reached, p]); // an answer before the rename is reached fails below, at once
    await ws.barrier();
    expect(answered, 'not acknowledged before it is durable').toBe(false);
    expect(ws.take().filter((m) => m.type === 'check.updated'), 'not pushed before it is durable').toEqual([]);
    hold.release();
    const r = await p;
    expect(r.status).toBe(200);
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'check.updated')).toMatchObject({ attemptId: AID, run, gate: ODP.gate, check: r.body });
  });
});

describe('row 11: flags over REST (CONTRACTS §7.4, §1.5)', () => {
  it('contract §7.4: POST …/flags with an Idempotency-Key is 201 GateFlag, open, for the current generation; the same key returns the same flag; a different key a new one', async () => {
    const { env, run } = await odp();
    const body = { gate: 5, comment: 'touched?', suggestedValue: 2, createdBy: 'j1' };
    const a = await post(env, FLAGS(), body, K('f1'));
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ attemptId: AID, run, gate: 5, comment: 'touched?', suggestedValue: 2, createdBy: 'j1', createdAt: new Date(env.clock.now()).toISOString() });
    expect(typeof a.body.flagId).toBe('string');
    expect('resolution' in a.body).toBe(false);
    const same = await post(env, FLAGS(), body, K('f1'));
    expect(same.status, 'round 28 item 5: a retry with the same key is 200').toBe(200);
    expect(same.body).toEqual(a.body);
    const other = await post(env, FLAGS(), body, K('f2'));
    expect(other.body.flagId).not.toBe(a.body.flagId);
    expect((await checksOf(env)).flags).toHaveLength(2);
  });

  it('contract §7.4 errors: a missing key, a missing comment, a non-integer gate or suggestedValue: 400 validation-failed; an unknown Attempt: 404 attempt-not-found', async () => {
    const { env } = await odp();
    expect((await post(env, FLAGS(), { gate: 5, comment: 'x' })).status).toBe(400);
    for (const b of [{ gate: 5 }, { comment: 'x' }, { gate: 1.5, comment: 'x' }, { gate: 5, comment: 'x', suggestedValue: 'a' }, { gate: 5, comment: 7 }]) {
      const r = await post(env, FLAGS(), b, K('k'));
      expect(r.status, JSON.stringify(b)).toBe(400);
      expect(r.body.error.code).toBe('validation-failed');
    }
    const r = await post(env, FLAGS(`${ODP.phaseId}/999`), { gate: 5, comment: 'x' }, K('k'));
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('attempt-not-found');
    expect((await checksOf(env)).flags).toEqual([]);
  });

  it('contract §7.4: POST /api/flags/{id}/resolution is 200, resolved; repeating it returns 200 unchanged; an unknown id is 404 flag-not-found', async () => {
    const { env } = await odp();
    const f = (await post(env, FLAGS(), { gate: 5, comment: 'x' }, K('f1'))).body;
    env.clock.jump(env.clock.now() + 5000);
    const r = await post(env, `/api/flags/${f.flagId as string}/resolution`, { note: 'seen', resolvedBy: 'j2' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ flagId: f.flagId, resolution: { resolvedAt: new Date(env.clock.now()).toISOString(), resolvedBy: 'j2', note: 'seen' } });
    env.clock.jump(env.clock.now() + 5000);
    const again = await post(env, `/api/flags/${f.flagId as string}/resolution`, { note: 'other' });
    expect(again.status).toBe(200);
    expect(again.body).toEqual(r.body);
    const nf = await post(env, '/api/flags/never/resolution', {});
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('flag-not-found');
  });

  it('contract §7.3/§7.4: a flag may be raised on a Cross Attempt (a review request is workflow); a flag never changes a penalty', async () => {
    const cross = await boot({ startAt: CROSS.startAt, eventDate: CROSS.day });
    for (const u of CROSS.units()) await feed(cross, u);
    const c = await post(cross, FLAGS(`${CROSS.phaseId}/${CROSS.bib}`), { gate: 1, comment: 'fault?' }, K('c1'));
    expect(c.status).toBe(201);
    const { env } = await odp();
    const before = await pen(env);
    await post(env, FLAGS(), { gate: ODP.gate, comment: 'should be 0', suggestedValue: 0 }, K('f1'));
    expect(await pen(env)).toBe(before);
    expect(env.tcp.written, 'a flag sends nothing upstream').toEqual([]);
  });

  it('contract §7.4 + §7.2: flag.updated carries the whole flag after each durable write (create and resolve), never before it is durable', async () => {
    const { env } = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const hold = env.fs.holdRename();
    let answered = false;
    const p = post(env, FLAGS(), { gate: 5, comment: 'x' }, K('f1')).then((r) => { answered = true; return r; });
    await Promise.race([hold.reached, p]); // an answer before the rename is reached fails below, at once
    await ws.barrier();
    expect(answered).toBe(false);
    expect(ws.take().filter((m) => m.type === 'flag.updated')).toEqual([]);
    hold.release();
    const f = (await p).body;
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'flag.updated')!.flag).toEqual(f);
    const resolved = (await post(env, `/api/flags/${f.flagId as string}/resolution`, {})).body;
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'flag.updated')!.flag).toEqual(resolved);
  });
});

describe('round 28-2: the flag key map is durable (CONTRACTS §1.5)', () => {
  for (const kind of ['stop', 'kill'] as const) {
    it(`a flag POST retried with the same key after a ${kind} and start over the same data dir is 200 with the same flag, and no second flag exists`, async () => {
      const { env } = await odp();
      const first = await post(env, FLAGS(), { gate: 5, comment: 'x' }, K('durable-flag'));
      expect(first.status).toBe(201);
      let fs2 = env.fs;
      if (kind === 'stop') await env.h.stop();
      else { fs2 = env.fs.afterKill(); env.h.kill(); }
      const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: fs2, clock: virtualClock(env.clock.now() + 60_000) });
      for (const u of ODP.unitsXmlFirst()) await feed(env2, u);
      await feed(env2, ODP.emptyAt(env2.clock.now() + 1000));
      const again = await post(env2, FLAGS(), { gate: 5, comment: 'x' }, K('durable-flag'));
      expect(again.status).toBe(200);
      expect(again.body).toEqual(first.body);
      expect((await checksOf(env2)).flags).toHaveLength(1);
    });
  }
});
