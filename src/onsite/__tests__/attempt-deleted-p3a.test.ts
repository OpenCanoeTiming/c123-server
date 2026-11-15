/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #365 row 9 (M2 P3a part 2 of 3): the on-site wire and REST surface of an upstream removal (CONTRACTS §7.2
 * `attempt.deleted`, §2.10, §10 item 38 (e), (g); ADR-015 Revisions 6 and 7). No recording holds a removal
 * (DERIVATIONS §4.12: "no recording holds a removed row"), so the admitted absent-row snapshot here is
 * derived: the ODP recorded snapshot (datasets.ts) with a second row (bib 9, a fresh `Id`) injected into
 * `C1M_BR2_18`'s `<Results>` table, so bib 56's own row can go absent while the race's table still carries a
 * row -- a genuine removal, not the wholly empty table case (ADR-015 Revision 5 rule 5 / Revision 6 rule 6).
 * Interface: onsite-harness.ts header; checks and flags: checks.test.ts, write-checks.test.ts.
 *
 * #373 rows 8-9 (M2 P3a follow-up; DERIVATIONS §10 item 38 (k), (m); review of PR #370 CQ1 and
 * CQ3): resolving a flag of a removed Attempt is `404 attempt-not-found`, and a returning (or,
 * after a restart, freshly created) Attempt's stored checks and flags are pushed after the
 * creating `attempt.updated`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, feedXml, get, openWs, post, put, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';

afterEach(disposeAll);

/** The recorded snapshot's one `<Results>` block (bib 56, `C1M_BR2_18`), verbatim (checked against `R19.rcXml.data` by the merged `xml-table-emptied-321.test.ts`). */
const BLOCK56 = /<Results>[\s\S]*?<\/Results>\n/.exec(ODP.xmlRec().data)![0];
/** The same block, for a second competitor (bib 9, a fresh `Id`) of the same race (`<RaceId>` untouched): a row the parser reads independently of bib 56's. */
const BLOCK9 = BLOCK56.replace('<Id>200678.C1M</Id>', '<Id>200679.C1M</Id>').replace('<Bib>  56</Bib>', '<Bib>   9</Bib>');
const BIB9_ATTEMPT_ID = `${ODP.phaseId}:9`;

/** The race's table with bib 9 in place of bib 56: an admitted absent row removes `ODP.attemptId`, bib 9 stays named. */
const absentBib56Xml = (ms: number): { observedAt: string; data: string } => ({ observedAt: new Date(ms).toISOString(), data: ODP.xmlRec().data.replace(BLOCK56, BLOCK9) });
/** The original recorded snapshot (bib 56 only), at a later instant: the row returns. */
const returnedXml = (ms: number): { observedAt: string; data: string } => ({ observedAt: new Date(ms).toISOString(), data: ODP.xmlRec().data });
/** Review note (c): the row that returns names ANOTHER competitor (Y, a fresh `Id`) under the bib than the one removed (X, `200678.C1M`),
 * with gate 13 presented as 0 instead of the recorded 2 (`ODP.xmlWithGate13`, run 120: only `Pen`/`Total` change, the recorded run's own).
 * "The data belongs to the bib" (CONTRACTS §2.6, §2.10; DERIVATIONS §10 item 38 (g)): the bib's checks are served under Y, their derived
 * status following Y's presented gates, not X's. */
const RETURN_AS_Y_ID = '200680.C1M';
const returnedAsYXml = (ms: number): { observedAt: string; data: string } => ({
  observedAt: new Date(ms).toISOString(),
  // global: the same Id also names the Participants record; replacing both is harmless (the Attempt reads
  // only the Results row's Id as its entry pointer) and keeps the document internally consistent.
  data: ODP.xmlWithGate13(0, 120).rec.data.replace(/<Id>200678\.C1M<\/Id>/g, `<Id>${RETURN_AS_Y_ID}</Id>`),
});

const checksOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/checks`)).body;
const attemptIds = async (env: Env): Promise<string[]> => (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.map((a: J) => a.attemptId);

/** Boots, replays the recorded stream, and returns the run bib 56 presents (ODP's own: a closed run, off the on-course set). */
async function closedOdp(): Promise<{ env: Env; run: number }> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  for (const u of ODP.units()) await feed(env, u);
  // ODP.units() ends with bib 56 still listed (no TCP message after its last listing ever applies the leave
  // rule, F1): an empty on-course message closes it, as startup-store.test.ts's prime() does, so the removal
  // below is genuinely admitted (ADR-015 Revision 6 rule 2: an Attempt in the on-course set is never removed).
  await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
  expect(a, 'precondition: bib 56 is known before the removal').toBeDefined();
  expect((await get(env, '/api/oncourse')).body.attempts.map((x: J) => x.attemptId), 'precondition: off the on-course set').not.toContain(ODP.attemptId);
  return { env, run: a.run.value as number };
}

describe('#365 row 9: attempt.deleted on /ws; REST stops, then resumes serving the Attempt and its checks', () => {
  it('CONTRACTS §7.2, §10 item 38 (e), (g): the removal is one attempt.deleted { seq, attemptId } on /ws; REST no longer serves the Attempt or its checks; both are served again when the same attemptId returns', async () => {
    const { env, run } = await closedOdp();
    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop the setup traffic: only the removal's own unit is checked below.

    const check = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml, checkedBy: 'judge-1' });
    const flag = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 5, comment: 'look again' });
    await ws.barrier();
    ws.take();

    // the removal: bib 56's row is absent from a table that still carries bib 9's, content age well past bib 56's last tcp delivery.
    const removeAt = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, absentBib56Xml(removeAt));
    await ws.barrier();
    const wire = ws.take();

    const deleted = wire.filter((m) => m['type'] === 'attempt.deleted');
    expect(deleted, 'exactly one attempt.deleted').toHaveLength(1);
    expect(deleted[0], '{ type, seq, attemptId }, nothing else').toEqual({ type: 'attempt.deleted', seq: expect.any(Number), attemptId: ODP.attemptId });
    expect(wire.filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === ODP.attemptId), 'no attempt.updated for the removed Attempt in its unit').toEqual([]);

    const idsNow = await attemptIds(env);
    expect(idsNow, 'bib 56 no longer served').not.toContain(ODP.attemptId);
    expect(idsNow, 'bib 9 is').toContain(BIB9_ATTEMPT_ID);

    const checksGone = await checksOf(env);
    expect(checksGone.checks, 'checks of a removed Attempt are not served').toEqual([]);
    expect(checksGone.flags, 'nor its flags').toEqual([]);

    // a write against the removed Attempt is refused the same way an unknown one is (CONTRACTS §7.4).
    const refused = await put(env, `/api/attempts/${ODP.phaseId}/56/checks/${ODP.gate}`, {});
    expect(refused.status).toBe(404);
    expect(refused.body.error.code).toBe('attempt-not-found');

    // the row returns: a later save that carries bib 56 again, now under another competitor, Y, with gate 13
    // presented as 0 instead of the recorded 2 (review note (c)).
    const returnAt = removeAt + 600_000;
    await feedXml(env, returnedAsYXml(returnAt));
    await ws.barrier();

    const back = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
    expect(back, 'bib 56 is served again').toBeDefined();
    expect(back.run.value, 'run 1: a fresh Attempt, carrying none of the removed one\'s generation').toBe(1);
    expect(back.entry.value.entryId, 'named by Y, not the removed one\'s X').toBe(RETURN_AS_Y_ID);
    expect(back.gates.value.find((g: J) => g.number === ODP.gate).penalty, 'Y\'s own presented gate').toBe(0);

    const checksBack = await checksOf(env);
    const servedCheck = checksBack.checks.find((c: J) => c.gate === ODP.gate);
    expect(servedCheck, 'the bib\'s check is served again (CONTRACTS §2.10), now under Y').toMatchObject({
      attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: check.valueAtCheck, checkedBy: check.checkedBy, checkedAt: check.checkedAt,
    });
    expect(servedCheck.status, 'the derived status follows Y\'s presented gate (0), not the value it was checked against (2): stale').toBe('stale');
    expect(checksBack.flags.map((f: J) => f.flagId)).toContain(flag.flagId);
  });

  it('CONTRACTS §2.10: checks and flags of a removed Attempt stay in the store across a restart, served again once the row returns', async () => {
    const { env, run } = await closedOdp();
    const check = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml, checkedBy: 'judge-1' });

    const removeAt = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, absentBib56Xml(removeAt));
    expect(await attemptIds(env), 'precondition: removed').not.toContain(ODP.attemptId);
    expect((await checksOf(env)).checks, 'precondition: hidden while gone').toEqual([]);

    await env.h.stop(); // graceful: every durable write is flushed before this resolves (CONTRACTS §2.10).

    // a fresh process, the same durable filesystem: the checks file is read back on load.
    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env.fs, clock: virtualClock(removeAt + 600_000) });
    try {
      // the freshly booted process holds no Phase C1M_BR2_18 at all yet (no read has named it in this
      // lifetime, F2): GET .../checks is 404 phase-not-found, the existing contract for an unobserved Phase
      // (messages.test.ts), not an empty list -- still "not served", in a different, earlier way.
      const stillGone = await get(env2, `/api/phases/${ODP.phaseId}/checks`);
      expect(stillGone.status, 'hidden immediately after the restart, before any row names the Phase again').toBe(404);
      expect(stillGone.body.error.code).toBe('phase-not-found');

      await feedXml(env2, returnedXml(removeAt + 1_200_000));
      const checksBack = await checksOf(env2);
      expect(checksBack.checks, 'the check made before the removal is served again').toHaveLength(1);
      expect(checksBack.checks[0]).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: check.valueAtCheck, checkedBy: 'judge-1' });
    } finally {
      await env2.h.stop();
    }
  });
});

describe('#373 row 8, §10 item 38 (k): resolving a flag of a removed Attempt (review of PR #370, CQ1)', () => {
  it('CONTRACTS §2.10, §7.4: POST /api/flags/{flagId}/resolution is 404 attempt-not-found while the Attempt is gone, pushes nothing, and succeeds once it returns', async () => {
    const { env, run } = await closedOdp();
    const flag = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 5, comment: 'look again' });

    const removeAt = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, absentBib56Xml(removeAt));

    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop the setup/connect traffic: only the refused resolution's own unit is checked below.

    const refused = await post(env, `/api/flags/${flag.flagId}/resolution`, {});
    expect(refused.status).toBe(404);
    expect(refused.body.error.code).toBe('attempt-not-found');
    await ws.barrier();
    expect(ws.take().filter((m) => m['type'] === 'flag.updated'), 'nothing pushed for a refused resolution').toEqual([]);

    // the row returns (plain return, the same competitor and gates): the flag is served again, still open.
    const returnAt = removeAt + 600_000;
    await feedXml(env, returnedXml(returnAt));
    const back = await checksOf(env);
    const servedFlag = back.flags.find((f: J) => f.flagId === flag.flagId);
    expect(servedFlag, 'the flag is served again once the bib returns').toBeDefined();
    expect(servedFlag.resolution, 'the refused resolution stored nothing: still open').toBeUndefined();

    await ws.barrier();
    ws.take();
    const resolved = await post(env, `/api/flags/${flag.flagId}/resolution`, {});
    expect(resolved.status).toBe(200);
    expect(resolved.body.resolution).toBeDefined();
    await ws.barrier();
    const pushed = ws.take().filter((m) => m['type'] === 'flag.updated');
    expect(pushed, 'the resolution, now that the Attempt exists again, pushes flag.updated').toHaveLength(1);
    expect(pushed[0]['flag']).toMatchObject({ flagId: flag.flagId, resolution: expect.any(Object) });
  });
});

describe('#373 row 9, §10 item 38 (m): a returning Attempt\'s checks and flags come back over the push (review of PR #370, CQ3)', () => {
  it('(i) a connected client sees attempt.deleted, then the row returns: check.updated (status unchanged included) and flag.updated follow the creating attempt.updated', async () => {
    const { env, run } = await closedOdp();
    const check = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: ODP.penaltyInXml, checkedBy: 'judge-1' });
    const flag = await env.h.checks.createFlag({ attemptId: ODP.attemptId, run, gate: 5, comment: 'look again' });

    const removeAt = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, absentBib56Xml(removeAt));

    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop the setup/connect traffic: only the returning row's own unit is checked below.

    // a plain return (not Y's): the same gate value as the check was made against, so its derived
    // status is unchanged (still 'verified') -- pinning that the push happens even when nothing
    // about the status itself moved (row 9's own wording, "an unchanged status included").
    const returnAt = removeAt + 600_000;
    await feedXml(env, returnedXml(returnAt));
    await ws.barrier();
    const wire = ws.take();

    const creating = wire.findIndex((m) => m['type'] === 'attempt.updated' && m['attemptId'] === ODP.attemptId);
    expect(creating, 'the unit carries a creating attempt.updated for the returning bib').toBeGreaterThanOrEqual(0);

    const checkMsgs = wire.filter((m) => m['type'] === 'check.updated' && m['attemptId'] === ODP.attemptId && m['gate'] === ODP.gate);
    const flagMsgs = wire.filter((m) => m['type'] === 'flag.updated' && (m['flag'] as J).flagId === flag.flagId);
    expect(checkMsgs, 'one check.updated for the one stored check, even though its derived status did not move').toHaveLength(1);
    expect(flagMsgs, 'one flag.updated for the one stored flag').toHaveLength(1);
    expect(checkMsgs[0]['check']).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: check.valueAtCheck, status: 'verified' });
    expect(wire.indexOf(checkMsgs[0]), 'check.updated follows the creating attempt.updated').toBeGreaterThan(creating);
    expect(wire.indexOf(flagMsgs[0]), 'flag.updated follows the creating attempt.updated').toBeGreaterThan(creating);
  });

  it('(ii) a restart with a stored check, a client hydrated before the first snapshot of the new lifetime: the check is pushed when that snapshot creates the Attempt', async () => {
    const { env, run } = await closedOdp();
    // valueAtCheck deliberately mismatched with the recorded gate 13 penalty (ODP.penaltyInXml, 2): the derived
    // status is 'stale' both now and once the restarted process creates the Attempt from the same recorded data,
    // so this is CQ3's own case -- seedCheckStatuses seeds the restarted process's remembered status from a check
    // whose Attempt does not exist yet (nothing presented to equal: 'stale'), and the freshly derived status after
    // creation is ALSO 'stale' (999 still disagrees with the presented 2): no status *difference*, which is
    // exactly what a push-only-on-difference implementation misses. (Checked directly: with a matching
    // valueAtCheck, i.e. ODP.penaltyInXml, the status moves stale -> verified across the restart and a mutant
    // that never pushes on creation would still pass this test for the wrong reason.)
    const check = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 999, checkedBy: 'judge-1' });

    const removeAt = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, absentBib56Xml(removeAt));
    await env.h.stop();

    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env.fs, clock: virtualClock(removeAt + 600_000) });
    try {
      const ws = await openWs(env2); // hydrated before any read of this lifetime has named the Phase at all (F2)
      await ws.barrier();
      ws.take();

      await feedXml(env2, returnedXml(removeAt + 1_200_000));
      await ws.barrier();
      const wire = ws.take();

      const creating = wire.findIndex((m) => m['type'] === 'attempt.updated' && m['attemptId'] === ODP.attemptId);
      expect(creating, 'the first-ever snapshot of this lifetime creates the Attempt').toBeGreaterThanOrEqual(0);
      const checkMsgs = wire.filter((m) => m['type'] === 'check.updated' && m['attemptId'] === ODP.attemptId && m['gate'] === ODP.gate);
      expect(checkMsgs, 'the check stored before the restart, for an Attempt this process never created until now, is pushed').toHaveLength(1);
      expect(checkMsgs[0]['check']).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: check.valueAtCheck });
      expect(wire.indexOf(checkMsgs[0]), 'check.updated follows the creating attempt.updated').toBeGreaterThan(creating);
    } finally {
      await env2.h.stop();
    }
  });

  it('(iii) an Attempt with nothing stored sends no check.updated or flag.updated when it is created', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    for (const u of ODP.units()) await feed(env, u); // bib 56's first-ever creation: no check or flag was ever stored for it.
    await ws.barrier();
    const wire = ws.take();

    const creating = wire.findIndex((m) => m['type'] === 'attempt.updated' && m['attemptId'] === ODP.attemptId);
    expect(creating, 'bib 56 is created in this session').toBeGreaterThanOrEqual(0);
    expect(wire.filter((m) => m['type'] === 'check.updated' && m['attemptId'] === ODP.attemptId), 'nothing was stored: no check.updated').toEqual([]);
    expect(wire.filter((m) => m['type'] === 'flag.updated' && (m['flag'] as J)?.attemptId === ODP.attemptId), 'nor flag.updated').toEqual([]);
  });
});
