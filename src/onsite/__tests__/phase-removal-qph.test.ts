/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #382 rows 7, 8, 12, 13 (M2 P3c, Q-PH: a Phase that leaves the schedule is removed; ADR-015 Revision 9; DERIVATIONS §10 item 54 (e), (f), (l);
 * CONTRACTS §2.4, §4 INV-7, §7.1 (`POST /api/rebaseline`), §7.2 (`phase.deleted`, its order in the unit), §7.4 (`404 phase-not-found`), §8.4;
 * CLIENT-OBLIGATIONS `phase.deleted` lines). The on-site wire and REST surface of the removal; the rule itself is core/__tests__/phase-removal-qph.test.ts.
 * Interface: onsite-harness.ts header. Data: datasets.ts (jarni-so-odp, C1M_BR2_18 bib 56). No recording holds a removed race (item 54 evidence E4), so the
 * removing snapshot is derived: the recorded one with its `Schedule` row renamed to another race of the class (the statement stays non-empty: an empty
 * schedule removes nothing) and its one `<Results>` block dropped (a race table of the removed race in the same read would name it again).
 * Every removal below is admitted: the clock is advanced past every TCP delivery before the file changes, so the reader's content age (its last stat of
 * the old signature) is later than all of them, and bib 56 is off the on-course set.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { WsMessage } from '@opencanoetiming/c123-contract';
import { boot, disposeAll, feedXml, get, hydrate, openWs, post, put, view, XML_PATH, applyMessage, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { adminLog, closedRun, write } from './write-fixtures-300.js';

afterEach(disposeAll);

const B = ODP.phaseId; // C1M_BR2_18
const OTHER = 'C1M_BR1_18';
/** The recorded snapshot whose schedule no longer names B (it names OTHER), and whose results table of B is gone. */
const removedXml = (ms: number): { observedAt: string; data: string } => {
  let d = ODP.xmlRec().data;
  d = d.replace(/(<Schedule>[\s\S]*?<RaceId>)C1M_BR2_18(<\/RaceId>[\s\S]*?<DisId>)BR2(<\/DisId>)/, `$1${OTHER}$2BR1$3`);
  d = d.replace(/<Results>[\s\S]*?<\/Results>\r?\n?/, '');
  if (d.includes('<RaceId>C1M_BR2_18</RaceId>') || !d.includes(`<RaceId>${OTHER}</RaceId>`)) throw new Error('fixture edit did not apply: the derived snapshot still names B');
  return { observedAt: new Date(ms).toISOString(), data: d };
};
/** The original snapshot, later: the schedule names B again. */
const returnedXml = (ms: number): { observedAt: string; data: string } => ({ observedAt: new Date(ms).toISOString(), data: ODP.xmlRec().data });

async function settle(env: Env): Promise<void> {
  await env.clock.advance(30_000); // polls of the unchanged file: the reader's last stat is later than every delivery so far
}
/** The recorded stream through the closure of bib 56, then settled. */
async function odpClosed(extra: Record<string, unknown> = {}): Promise<Env> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...extra });
  for (const u of ODP.units()) await feed(env, u);
  await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  await settle(env);
  expect((await get(env, '/api/oncourse')).body.attempts.map((x: J) => x.attemptId), 'precondition: off the on-course set').not.toContain(ODP.attemptId);
  expect((await get(env, `/api/phases/${B}/attempts`)).body.attempts.map((x: J) => x.attemptId), 'precondition: bib 56 is known').toContain(ODP.attemptId);
  return env;
}
const removeAtOf = (env: Env): number => env.clock.now() + 3_600_000;

describe('#382 row 7: pending writes of a removed Phase\'s Attempt (item 54 (e))', () => {
  it('item 54 (e): a pending penalty write on an Attempt of B resolves mismatched without confirmedValue, and its write.updated precedes the phase.deleted on /ws', async () => {
    const env = await closedRun();
    await settle(env);
    const ws = await openWs(env);
    await ws.barrier();
    const r = await write(env);
    expect(r.status, 'precondition: the write is admitted').toBe(202);
    expect((await get(env, `/api/writes/${r.body.writeId}`)).body.status, 'precondition: pending').toBe('pending');
    await ws.barrier();
    ws.take();

    await feedXml(env, removedXml(removeAtOf(env)));
    await ws.barrier();
    const wire = ws.take();

    const iDel = wire.findIndex((m) => m['type'] === 'phase.deleted' && m['phaseId'] === B);
    expect(iDel, 'the Phase is removed').toBeGreaterThanOrEqual(0);
    const resolved = wire.map((m, i) => ({ m, i })).filter((e) => e.m['type'] === 'write.updated' && e.m['write'].writeId === r.body.writeId);
    expect(resolved, 'one resolution is pushed').toHaveLength(1);
    expect(resolved[0]!.m['write'].status).toBe('mismatched');
    expect(resolved[0]!.m['write'].confirmedValue, 'no confirmedValue: the race is gone, not the cell').toBeUndefined();
    expect(resolved[0]!.i, 'before the phase.deleted (the sequence order on /ws)').toBeLessThan(iDel);
    expect(wire.filter((m) => m['type'] === 'attempt.deleted'), 'no attempt.deleted for what the Phase implies').toEqual([]);

    const s = (await get(env, `/api/writes/${r.body.writeId}`)).body;
    expect(s.status).toBe('mismatched');
    expect(s.confirmedValue).toBeUndefined();
  });
});

describe('#382 row 8: checks and flags of a removed Phase (item 54 (f))', () => {
  it('item 54 (f): GET of B\'s checks answers 404 phase-not-found, a check on its Attempt 404 attempt-not-found; when B returns, check.updated and flag.updated follow the attempt.updated that creates the Attempt', async () => {
    const env = await odpClosed();
    const run = (await get(env, `/api/phases/${B}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId).run.value as number;
    const check = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml, checkedBy: 'judge-1' });
    const flag = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 5, comment: 'look again' });
    expect((await get(env, `/api/phases/${B}/checks`)).status, 'precondition: served while B exists').toBe(200);

    const removeAt = removeAtOf(env);
    await feedXml(env, removedXml(removeAt));

    const gone = await get(env, `/api/phases/${B}/checks`);
    expect(gone.status, 'a Phase\'s reads answer 404 while it does not exist').toBe(404);
    expect(gone.body.error.code).toBe('phase-not-found');
    const refused = await put(env, `/api/attempts/${B}/56/checks/${ODP.gate}`, {});
    expect(refused.status).toBe(404);
    expect(refused.body.error.code).toBe('attempt-not-found');
    const refusedFlag = await post(env, `/api/flags/${flag.flagId}/resolution`, {});
    expect(refusedFlag.status, 'a flag of a removed Phase\'s Attempt').toBe(404);

    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    await feedXml(env, returnedXml(removeAt + 600_000));
    await ws.barrier();
    const wire = ws.take();

    const creating = wire.findIndex((m) => m['type'] === 'attempt.updated' && m['attemptId'] === ODP.attemptId);
    expect(creating, 'the returning Phase\'s read creates the Attempt').toBeGreaterThanOrEqual(0);
    const cm = wire.findIndex((m) => m['type'] === 'check.updated' && m['attemptId'] === ODP.attemptId && m['gate'] === ODP.gate);
    const fm = wire.findIndex((m) => m['type'] === 'flag.updated' && m['flag'].flagId === flag.flagId);
    expect(cm, 'check.updated is pushed').toBeGreaterThanOrEqual(0);
    expect(fm, 'flag.updated is pushed').toBeGreaterThanOrEqual(0);
    expect(cm, 'after the creating attempt.updated').toBeGreaterThan(creating);
    expect(fm, 'after the creating attempt.updated').toBeGreaterThan(creating);

    const back = await get(env, `/api/phases/${B}/checks`);
    expect(back.status).toBe(200);
    expect(back.body.checks.find((c: J) => c.gate === ODP.gate), 'the stored check is served again').toMatchObject({ attemptId: ODP.attemptId, checkedBy: check.checkedBy });
    expect(back.body.flags.map((f: J) => f.flagId)).toContain(flag.flagId);
  });
});

describe('#382 row 12: re-baseline (item 54 (l))', () => {
  /** The file changed since the last poll and is not yet polled: the re-baseline reads it on its own (CONTRACTS §4 step 2). */
  const stage = (env: Env, rec: { data: string }): void => {
    const written = env.clock.now() + 25_000;
    env.fs.put(XML_PATH, rec.data, written);
    env.clock.jump(written + 7_000);
  };

  it('item 54 (l): an event re-baseline whose read omits B sends phase.deleted before scope.replaced, and the scope.replaced holds nothing of B', async () => {
    const env = await odpClosed();
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    stage(env, removedXml(0));
    const r = await post(env, '/api/rebaseline', { scope: { kind: 'event' } });
    expect(r.status).toBe(200);
    await ws.barrier();
    const wire = ws.take();
    const iDel = wire.findIndex((m) => m['type'] === 'phase.deleted' && m['phaseId'] === B);
    const iRep = wire.findIndex((m) => m['type'] === 'scope.replaced');
    expect(iDel, 'phase.deleted is sent').toBeGreaterThanOrEqual(0);
    expect(iRep, 'scope.replaced is sent').toBeGreaterThanOrEqual(0);
    expect(iDel, 'each phase.deleted before the scope.replaced').toBeLessThan(iRep);
    const rep = wire[iRep]!;
    expect((rep['attempts'] as J[]).filter((a) => a['phaseId'] === B), 'nothing of B in the replace').toEqual([]);
    expect((rep['standings'] as J[]).filter((s) => JSON.stringify(s['scope']).includes(B))).toEqual([]);
    expect(wire.filter((m) => m['type'] === 'attempt.deleted')).toEqual([]);
  });

  it('item 54 (l): a Phase re-baseline of B whose read omits B sends phase.deleted and NO scope.replaced, and answers 200 with attempts 0', async () => {
    const env = await odpClosed();
    expect((await get(env, `/api/phases/${B}/attempts`)).body.attempts.length, 'precondition: B holds Attempts').toBeGreaterThan(0);
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    stage(env, removedXml(0));
    const r = await post(env, '/api/rebaseline', { scope: { kind: 'phase', phaseId: B } });
    expect(r.status).toBe(200);
    expect(r.body.attempts, 'the read removed the scope\'s own Phase').toBe(0);
    expect(r.body.scope).toEqual({ kind: 'phase', phaseId: B });
    await ws.barrier();
    const wire = ws.take();
    expect(wire.filter((m) => m['type'] === 'phase.deleted' && m['phaseId'] === B)).toHaveLength(1);
    expect(wire.filter((m) => m['type'] === 'scope.replaced'), 'no scope.replaced for a scope that no longer exists').toEqual([]);
  });

  it('item 54 (l): the re-baseline removes under the guard: a tcp delivery of B newer than the read\'s content age refuses it (B stays, scope.replaced as ever)', async () => {
    const env = await odpClosed();
    const written = env.clock.now() + 25_000;
    // a TCP row of bib 56 delivered after the file was written but before the re-baseline reads it
    env.fs.put(XML_PATH, removedXml(0).data, written);
    await feed(env, ODP.rowAt(written + 2_000));
    env.clock.jump(written + 7_000);
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    const r = await post(env, '/api/rebaseline', { scope: { kind: 'phase', phaseId: B } });
    expect(r.status).toBe(200);
    await ws.barrier();
    const wire = ws.take();
    expect(wire.filter((m) => m['type'] === 'phase.deleted'), 'refused by the guard').toEqual([]);
    expect((await get(env, `/api/phases/${B}/attempts`)).status).toBe(200);
    expect(r.body.attempts).toBeGreaterThan(0);
  });
});

describe('#382 N (P3c fold-in, #390 review): the step log of a removal (TEST-ARCHITECTURE §3.2 step log; CONTRACTS §7.2; item 54 (d))', () => {
  // Mutant: the step log's digest ignores `phase.deleted` (the removed Phase's Attempt and Standing parts stay in `stateHash`) -> the removal step's
  // hash equals the previous step's (only B's parts change it) -> the "hash moves" assert is red. A removal that logs attempt.deleted deltas -> red.
  it('item 54 (d) + step log: the removing read logs ONE phase.deleted delta for B, no attempt.deleted; the stateHash moves with it, and the process answers B\'s reads 404', async () => {
    const lines: string[] = [];
    const env = await odpClosed({ stepLog: (l: string) => { lines.push(l); } });
    expect((await get(env, `/api/phases/${B}/attempts`)).status, 'precondition: B served before the removal').toBe(200);
    const steps = (): J[] => lines.map((l) => JSON.parse(l) as J).filter((o) => Array.isArray(o['deltas']));
    const before = steps();
    expect(before.length, 'precondition: steps are logged').toBeGreaterThan(0);
    expect(before.some((o) => (o['deltas'] as J[]).some((d) => d['type'] === 'phase.deleted')), 'precondition: no removal logged yet').toBe(false);
    const prevHash = before.at(-1)!['stateHash'] as string;

    await feedXml(env, removedXml(removeAtOf(env)));
    expect((await get(env, `/api/phases/${B}/attempts`)).status, 'precondition: B is removed').toBe(404);

    const after = steps().slice(before.length);
    const removing = after.filter((o) => (o['deltas'] as J[]).some((d) => d['type'] === 'phase.deleted'));
    expect(removing, 'exactly one logged step carries the phase.deleted').toHaveLength(1);
    const deltas = removing[0]!['deltas'] as J[];
    expect(deltas.filter((d) => d['type'] === 'phase.deleted' && d['phaseId'] === B), 'one phase.deleted for B').toHaveLength(1);
    expect(deltas.filter((d) => d['type'] === 'attempt.deleted'), 'what the Phase implies is never logged as attempt.deleted').toEqual([]);
    expect(removing[0]!['stateHash'], 'B\'s Attempts and Standings left the digest: the hash moved').not.toBe(prevHash);
    expect(typeof removing[0]!['stateHash']).toBe('string');
  });
});

describe('#382 row 13: the /ws payload of phase.deleted (CONTRACTS §7.2, WsPayload of packages/c123-contract)', () => {
  it('§7.2: phase.deleted is exactly { type, seq, phaseId }; a client applying it from hydration holds what hydration returns afterwards (Phase, Attempts, Standings, checks and flags gone; Class, Entries, Courses kept)', async () => {
    const env = await odpClosed();
    const run = (await get(env, `/api/phases/${B}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId).run.value as number;
    await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml, checkedBy: 'judge-1' });
    const ws = await openWs(env);
    await ws.barrier();
    const held = (await hydrate(env)).model;
    expect([...held.phases.keys()], 'precondition: B held').toContain(B);
    expect([...held.standings.values()].some((s) => JSON.stringify(s.scope).includes(B)), 'precondition: a Standing naming B held').toBe(true);
    expect(held.checks.size, 'precondition: a check held').toBeGreaterThan(0);
    ws.take();

    await feedXml(env, removedXml(removeAtOf(env)));
    await ws.barrier();
    const wire = ws.take();

    const del = wire.filter((m) => m['type'] === 'phase.deleted');
    expect(del).toHaveLength(1);
    const typed = { type: 'phase.deleted', seq: del[0]!['seq'], phaseId: B } satisfies Extract<WsMessage, { type: 'phase.deleted' }>;
    expect(del[0], 'the WsMessage shape of the contract package, nothing else').toEqual(typed);
    expect(del[0]!['seq']).toEqual(expect.any(Number));

    for (const m of wire) if (m['type'] !== 'sources.updated' && m['type'] !== 'diagnostics.updated') applyMessage(held, m);
    const fresh = (await hydrate(env)).model;
    expect([...fresh.phases.keys()], 'hydration no longer lists B').not.toContain(B);
    for (const k of ['phases', 'attempts', 'standings', 'checks', 'flags', 'classes', 'entries', 'courses'] as const) {
      expect(view(held)[k], `the client's ${k} equal hydration`).toEqual(view(fresh)[k]);
    }
    expect(fresh.classes.has(ODP.classId), 'the Class is kept').toBe(true);
    expect(fresh.entries.size, 'the Entries are kept').toBeGreaterThan(0);
  });

  it('item 54 (k), DERIVATIONS §0.5: xml-schedule-emptied reaches the admin log and never /ws diagnostics.updated nor GET /api/diagnostics', async () => {
    const log = adminLog();
    const env = await odpClosed(log.opts);
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    const emptied = { observedAt: new Date(removeAtOf(env)).toISOString(), data: ODP.xmlRec().data.replace(/<Schedule>[\s\S]*?<\/Schedule>\r?\n?/, '') };
    await feedXml(env, emptied);
    await ws.barrier();
    const wire = ws.take();
    expect(wire.filter((m) => m['type'] === 'phase.deleted'), 'an empty schedule removes nothing').toEqual([]);
    expect((await get(env, `/api/phases/${B}/attempts`)).status).toBe(200);
    expect(log.entries.filter((e) => e['kind'] === 'xml-schedule-emptied'), 'one admin-log entry').toHaveLength(1);
    const diag = (await get(env, '/api/diagnostics')).body.diagnostics as J[];
    expect(diag.filter((d) => d['kind'] === 'xml-schedule-emptied')).toEqual([]);
    for (const m of wire.filter((x) => x['type'] === 'diagnostics.updated')) expect((m['diagnostics'] as J[]).filter((d) => d['kind'] === 'xml-schedule-emptied')).toEqual([]);
  });
});
