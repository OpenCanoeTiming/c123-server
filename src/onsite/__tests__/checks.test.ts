/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 row 10 (tier 1): checks and flags on the on-site contract (CONTRACTS §2.10, §7.1, §7.2; #273 N2, N3, N7).
 * The writes are driven through `OnsiteHandle.checks` (harness header): #212 owns the REST routes, this issue owns what they call.
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, get, hydrate, openWs, type Env, type J } from './onsite-harness.js';
import { feed, ODP } from './datasets.js';

afterEach(disposeAll);

async function odp(): Promise<{ env: Env; run: number }> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  for (const u of ODP.units()) await feed(env, u);
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
  expect(a.gates.state, 'the recorded snapshot states the gates (gate 13 = 2)').toBe('known');
  expect(a.gates.value.find((g: J) => g.number === ODP.gate).penalty).toBe(ODP.penaltyInXml);
  return { env, run: a.run.value as number };
}
const checksOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/checks`)).body;
const durable = (env: Env, eventId: string): string => {
  const k = [...env.fs.files.keys()].find((p) => p.endsWith(`checks-${eventId}.json`));
  return k === undefined ? '' : env.fs.files.get(k)!;
};

describe('row 10: checks and flags (CONTRACTS §2.10, §7.1, §7.2)', () => {
  it('contract §7.1 GET /api/phases/{id}/checks: every check and flag of the Phase, all run generations, with status derived at serialisation (verified when valueAtCheck equals the presented penalty, stale otherwise; null and 0 distinct)', async () => {
    const { env, run } = await odp();
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 2, checkedBy: 'judge-1' });
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: 1, valueAtCheck: null });
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run: run + 1, gate: ODP.gate, valueAtCheck: 2 });
    const open = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 5, comment: 'touched?', suggestedValue: 2 });
    const done = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 6, comment: 'burn' });
    await env.h.checks.resolveFlag(done.flagId, { note: 'seen', resolvedBy: 'j' });
    const body = await checksOf(env);
    expect(body.checks).toHaveLength(3);
    expect(body.flags.map((f: J) => f.flagId).sort()).toEqual([open.flagId, done.flagId].sort());
    const at = (g: number, r: number): J => body.checks.find((c: J) => c.gate === g && c.run === r);
    expect(at(ODP.gate, run)).toMatchObject({ attemptId: ODP.attemptId, valueAtCheck: 2, checkedBy: 'judge-1', status: 'verified' });
    expect(at(1, run).status, 'checked while unjudged (null), presented 0: stale').toBe('stale');
    expect(at(ODP.gate, run + 1).run).toBe(run + 1);
    expect(body.flags.find((f: J) => f.flagId === done.flagId).resolution).toMatchObject({ resolvedBy: 'j', note: 'seen' });
    expect('status' in body.flags[0]).toBe(false);
    for (const c of body.checks as J[]) expect(['verified', 'stale']).toContain(c.status);
  });

  it('contract §7.2 check.updated / flag.updated: sent on every check write and delete (check null) with the derived status, and on every flag write carrying the whole GateFlag', async () => {
    const { env, run } = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const put = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 2 });
    await ws.barrier();
    const m1 = ws.take().find((m) => m.type === 'check.updated')!;
    expect(m1).toMatchObject({ attemptId: ODP.attemptId, run, gate: ODP.gate, check: { valueAtCheck: 2, status: 'verified' } });
    expect(m1.check).toEqual(put);
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 0 }); // a re-check replaces
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'check.updated')!.check).toMatchObject({ valueAtCheck: 0, status: 'stale' });
    await env.h.checks.deleteCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate });
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'check.updated')).toMatchObject({ attemptId: ODP.attemptId, run, gate: ODP.gate, check: null });
    const flag = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 3, comment: 'look', createdBy: 'j2' });
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'flag.updated')!.flag).toEqual(flag);
    const resolved = await env.h.checks.resolveFlag(flag.flagId, { note: 'ok' });
    await ws.barrier();
    expect(ws.take().find((m) => m.type === 'flag.updated')!.flag).toEqual(resolved);
    expect(resolved.resolution).toMatchObject({ note: 'ok' });
  });

  it('contract §7.2 + §2.10 (#273 N7): check.updated is sent when a check\'s derived status changes because the presented gate penalty changed (a late correction), and the pushed state equals hydration', async () => {
    const { env, run } = await odp();
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    await feed(env, ODP.correction()); // gate 13 is now presented as 0
    await ws.barrier();
    const m = ws.take().find((x) => x.type === 'check.updated' && x.gate === ODP.gate);
    expect(m, 'the status changed, so it is pushed').toBeDefined();
    expect(m!.check).toMatchObject({ valueAtCheck: ODP.penaltyInXml, status: 'stale' });
    expect((await checksOf(env)).checks[0].status).toBe('stale');
    const pushed = (await hydrate(env)).model.checks;
    expect([...pushed.values()][0]).toMatchObject({ status: 'stale' });
  });

  it('contract §2.10 (#273 N3): neither the object handed to the store nor the one it returns aliases store state', async () => {
    const { env, run } = await odp();
    const input: J = { attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 2, checkedBy: 'a' };
    const out = await env.h.checks.putCheck(input as any);
    input['valueAtCheck'] = 77; input['checkedBy'] = 'mutated';
    (out as J)['valueAtCheck'] = 99; (out as J)['checkedBy'] = 'mutated';
    const c = (await checksOf(env)).checks[0];
    expect(c).toMatchObject({ valueAtCheck: 2, checkedBy: 'a' });
    expect(JSON.parse(durable(env, 'ev-1')).checks[0]).toMatchObject({ valueAtCheck: 2, checkedBy: 'a' });
    const f = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 2, comment: 'c' });
    (f as J)['comment'] = 'mutated';
    expect((await checksOf(env)).flags[0].comment).toBe('c');
    const r = await env.h.checks.resolveFlag(f.flagId, { note: 'n' });
    (r as J)['resolution'] = undefined;
    expect((await checksOf(env)).flags[0].resolution).toMatchObject({ note: 'n' });
  });

  it('contract §2.10 (#273): a malformed check or flag is refused with validation-failed before the store is touched: no file operation, no message, nothing stored', async () => {
    const { env, run } = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const ops = env.fs.ops.length;
    const bad: J[] = [
      { attemptId: 5, run, gate: 1, valueAtCheck: 0 },
      { attemptId: ODP.attemptId, run: '1', gate: 1, valueAtCheck: 0 },
      { attemptId: ODP.attemptId, run, gate: 1.5, valueAtCheck: 0 },
      { attemptId: ODP.attemptId, run, gate: 1, valueAtCheck: '2' },
      { attemptId: ODP.attemptId, run, gate: 1 },
      { attemptId: ODP.attemptId, run, gate: 1, valueAtCheck: 0, status: 'verified' },
    ];
    for (const b of bad) await expect(env.h.checks.putCheck(b as any), JSON.stringify(b)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 1, comment: 7 } as any)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 1, comment: 'x', suggestedValue: 'a' } as any)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(env.fs.ops.slice(ops).filter((o) => /^(write|rename|unlink) /.test(o))).toEqual([]);
    await ws.barrier();
    expect(ws.take().filter((m) => m.type === 'check.updated' || m.type === 'flag.updated')).toEqual([]);
    expect(await checksOf(env)).toMatchObject({ checks: [], flags: [] });
  });

  it('contract §2.10 "keyed by eventId" (#273 N2): one store instance per event, A -> B -> A included: after the round trip A\'s earlier check is served, a new write lands in A\'s file with both, and B\'s file is untouched', async () => {
    const { env, run } = await odp();
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 2 });
    await env.h.startNewEvent({ eventId: 'ev-b', name: 'B' });
    await env.h.checks.putCheck({ attemptId: 'X:1', run: 1, gate: 1, valueAtCheck: 0 });
    const bFile = durable(env, 'ev-b');
    await env.h.startNewEvent({ eventId: 'ev-1', name: 'Test Event' }); // back to A
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: 1, valueAtCheck: 0 });
    const a = JSON.parse(durable(env, 'ev-1'));
    expect(a.checks.map((c: J) => c.gate).sort()).toEqual([1, ODP.gate].sort());
    expect(durable(env, 'ev-b')).toBe(bFile);
    expect(JSON.parse(bFile).checks).toHaveLength(1);
  });

  it('contract §2.10 (#273 N2): starting the event that is already current is refused, never a second store on it', async () => {
    const { env } = await odp();
    await expect(env.h.startNewEvent({ eventId: 'ev-1', name: 'again' })).rejects.toBeDefined();
  });
});
