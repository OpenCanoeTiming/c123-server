/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #365 row 9 (M2 P3a part 2 of 3): the on-site wire and REST surface of an upstream removal (CONTRACTS §7.2
 * `attempt.deleted`, §2.10, §10 item 38 (e), (g); ADR-015 Revisions 6 and 7). No recording holds a removal
 * (DERIVATIONS §4.12: "no recording holds a removed row"), so the admitted absent-row snapshot here is
 * derived: the ODP recorded snapshot (datasets.ts) with a second row (bib 9, a fresh `Id`) injected into
 * `C1M_BR2_18`'s `<Results>` table, so bib 56's own row can go absent while the race's table still carries a
 * row -- a genuine removal, not the wholly empty table case (ADR-015 Revision 5 rule 5 / Revision 6 rule 6).
 * Interface: onsite-harness.ts header; checks and flags: checks.test.ts, write-checks.test.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, feedXml, get, openWs, put, virtualClock, type Env, type J } from './onsite-harness.js';
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

const checksOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/checks`)).body;
const attemptIds = async (env: Env): Promise<string[]> => (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.map((a: J) => a.attemptId);

/** Boots, replays the recorded stream, and returns the run bib 56 presents (ODP's own: a closed run, off the on-course set). */
async function closedOdp(): Promise<{ env: Env; run: number }> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  for (const u of ODP.units()) await feed(env, u);
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
  expect(a, 'precondition: bib 56 is known before the removal').toBeDefined();
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

    // the row returns: a later save that carries bib 56 again.
    const returnAt = removeAt + 600_000;
    await feedXml(env, returnedXml(returnAt));
    await ws.barrier();

    const back = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
    expect(back, 'bib 56 is served again').toBeDefined();
    expect(back.run.value, 'run 1: a fresh Attempt, carrying none of the removed one\'s generation').toBe(1);

    const checksBack = await checksOf(env);
    expect(checksBack.checks.map((c: J) => c.gate), 'the bib\'s check is served again (CONTRACTS §2.10)').toContain(ODP.gate);
    expect(checksBack.checks.find((c: J) => c.gate === ODP.gate)).toMatchObject(check);
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
      // the freshly booted process has not yet read any xml naming bib 56 in this lifetime: still hidden -- the check
      // survived in the store, not in a (gone) Attempt that no read has recreated yet.
      expect((await checksOf(env2)).checks, 'hidden immediately after the restart, before any row names it again').toEqual([]);

      await feedXml(env2, returnedXml(removeAt + 1_200_000));
      const checksBack = await checksOf(env2);
      expect(checksBack.checks, 'the check made before the removal is served again').toHaveLength(1);
      expect(checksBack.checks[0]).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: check.valueAtCheck, checkedBy: 'judge-1' });
    } finally {
      await env2.h.stop();
    }
  });
});
