/**
 * REST handlers of the on-site process (#397; CONTRACTS §7.3, §7.4): writes, checks and flags. Every handler runs inside the queue;
 * the checks and flags operations are also the handle's `checks`.
 */
import { randomUUID } from 'node:crypto';
import type { ChecksStore } from '../store/checks.js';
import type { WritableSource } from '../sources/types.js';
import { errorBody, type AttemptRoute, type RestReply } from './app.js';
import { penaltyCorrectionCommand } from './writes-store.js';
import { checkInput, checkKeyInput, flagInput, resolutionInput, ValidationError } from './validate.js';
import { phaseOfAttempt, type J } from './wire.js';
import type { OnsiteHandle } from './index.js';
import { emit, enqueue, type OnsiteContext } from './context.js';
import { keyOf, withStatus } from './event-state.js';
import { processUnit, runOf } from './units.js';

export const needStore = (cx: OnsiteContext): ChecksStore => {
  if (cx.store === undefined) throw Object.assign(new Error('no event is configured'), { code: 'event-not-found' });
  return cx.store;
};

// ------------------------------------------------------------------------------------------------ checks and flags, inside the queue
export async function doPutCheck(
  cx: OnsiteContext,
  input: Parameters<OnsiteHandle['checks']['putCheck']>[0],
): Promise<J> {
  const i = checkInput(input);
  const s = needStore(cx);
  await s.putCheck(i);
  const check = withStatus(cx, s).find(
    (c) => keyOf(c as { attemptId: string; run: number; gate: number }) === keyOf(i),
  ) as J;
  cx.checkStatuses.set(keyOf(i), check['status'] as string);
  await emit(cx, [{ type: 'check.updated', attemptId: i.attemptId, run: i.run, gate: i.gate, check }]);
  return JSON.parse(JSON.stringify(check)) as J;
}
export async function doDeleteCheck(
  cx: OnsiteContext,
  key: Parameters<OnsiteHandle['checks']['deleteCheck']>[0],
): Promise<void> {
  const k = checkKeyInput(key);
  const s = needStore(cx);
  const existed = s.list().checks.some((c) => keyOf(c) === keyOf(k));
  await s.deleteCheck(k);
  if (!existed) return;
  cx.checkStatuses.delete(keyOf(k));
  await emit(cx, [{ type: 'check.updated', attemptId: k.attemptId, run: k.run, gate: k.gate, check: null }]);
}
export async function doCreateFlag(
  cx: OnsiteContext,
  input: Parameters<OnsiteHandle['checks']['createFlag']>[0],
  flagId?: string,
): Promise<J> {
  const i = flagInput(input);
  const flag = await needStore(cx).createFlag(flagId === undefined ? i : { ...i, flagId });
  await emit(cx, [{ type: 'flag.updated', flag }]);
  return flag as unknown as J;
}
/** §10 item 38 (k): a resolution is a flag write; while its Attempt does not exist, it is `attempt-not-found`, checked after `flag-not-found`, with nothing stored or pushed. */
export async function doResolveFlag(
  cx: OnsiteContext,
  flagId: string,
  input: { note?: string; resolvedBy?: string },
): Promise<J> {
  const i = resolutionInput(flagId, input);
  const s = needStore(cx);
  const was = s.list().flags.find((f) => f.flagId === flagId);
  if (was !== undefined && !cx.core.attempts().includes(was.attemptId))
    throw Object.assign(new Error(`no Attempt for flag ${flagId}`), { code: 'attempt-not-found' });
  const flag = await s.resolveFlag(flagId, i);
  if (was?.resolution === undefined) await emit(cx, [{ type: 'flag.updated', flag }]);
  return flag as unknown as J;
}

// ------------------------------------------------------------------------------------------------ REST: writes, checks, flags (§7.3, §7.4)
const refuse = (status: number, code: string, message: string, details?: unknown): RestReply => ({
  status,
  body: errorBody(code, message, details),
});
const notPossible = (reason: string, message: string): RestReply =>
  refuse(409, 'write-not-possible', message, { reason });
const invalid = (details: { field: string; issue: string }[]): RestReply =>
  refuse(400, 'validation-failed', 'the request is not valid', details);
const notFound = (a: AttemptRoute): RestReply =>
  refuse(404, 'attempt-not-found', `no Attempt ${a.bib} in Phase ${a.phaseId}`);
const gone = (): RestReply => refuse(503, 'internal-error', 'the process is stopping');
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const known = <T>(v: unknown): T | undefined => (isObj(v) && v['state'] === 'known' ? (v['value'] as T) : undefined);

export interface RestHandlers {
  penalty(r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply>;
  putCheck(r: AttemptRoute, gateText: string, body: unknown): Promise<RestReply>;
  deleteCheck(r: AttemptRoute, gateText: string): Promise<RestReply>;
  createFlag(r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply>;
  resolveFlag(flagId: string, body: unknown): Promise<RestReply>;
}

export function createRest(cx: OnsiteContext): RestHandlers {
  const { opts } = cx;
  const attemptOf = (a: AttemptRoute): string | undefined => {
    const id = `${a.phaseId}:${a.bib}`;
    return cx.core.attempts().includes(id) ? id : undefined;
  };
  const isCross = (attemptId: string): boolean => {
    const classId = cx.core.phase(phaseOfAttempt(attemptId))['classId'];
    return (
      typeof classId === 'string' &&
      cx.core.classIds().includes(classId) &&
      cx.core.class(classId)['discipline'] === 'cross'
    );
  };
  const isTeamBoat = (attemptId: string): boolean => {
    const entryId = known<{ entryId?: string }>(cx.core.presented(attemptId)['entry'])?.entryId;
    return (
      entryId !== undefined &&
      cx.core.entryIds().includes(entryId) &&
      known<boolean>(cx.core.entry(entryId)['isTeam']) === true
    );
  };
  /** The gate numbers of the Phase's course; undefined where the course is not configured. */
  const courseGates = (attemptId: string): number[] | undefined => {
    const courseId = known<string>(cx.core.phase(phaseOfAttempt(attemptId))['courseId']);
    if (courseId === undefined || !cx.core.courseIds().includes(courseId)) return undefined;
    return known<{ number: number }[]>(cx.core.course(courseId)['gates'])?.map((g) => g.number);
  };
  const gateIssue = (attemptId: string, gate: unknown): { field: string; issue: string } | undefined => {
    const gates = courseGates(attemptId);
    if (gates === undefined) return { field: 'gate', issue: 'the Phase has no course configured' };
    return typeof gate === 'number' && gates.includes(gate)
      ? undefined
      : { field: 'gate', issue: "is not a gate of the Phase's course" };
  };
  const guard = async (fn: () => Promise<RestReply>): Promise<RestReply> => {
    try {
      return (await enqueue(cx, fn)) ?? gone();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (e instanceof ValidationError) return invalid(e.details);
      if (code === 'flag-not-found') return refuse(404, 'flag-not-found', (e as Error).message);
      if (code === 'attempt-not-found') return refuse(404, 'attempt-not-found', (e as Error).message);
      if (code === 'event-not-found') return refuse(404, 'attempt-not-found', 'no event is configured');
      throw e;
    }
  };

  /** §7.3. The queue serialises the whole request: no ingest unit is applied between the socket write and the step that creates the WriteRequest. */
  async function penaltyTask(r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply> {
    const aid = attemptOf(r);
    if (aid === undefined || cx.wstore === undefined || cx.event === undefined) return notFound(r);
    if (isCross(aid)) return notPossible('cross', 'penalty writes are not possible on a Kayak Cross Attempt');
    if (isTeamBoat(aid)) return notPossible('team-boat', 'a team boat is corrected in Canoe123');
    const issues: { field: string; issue: string }[] = [];
    if (key === undefined) issues.push({ field: 'Idempotency-Key', issue: 'missing' });
    const b = isObj(body) ? body : undefined;
    if (b === undefined) issues.push({ field: 'body', issue: 'must be an object' });
    else {
      if (typeof b['gate'] !== 'number' || !Number.isInteger(b['gate']))
        issues.push({ field: 'gate', issue: 'must be an integer' });
      if (b['value'] !== 0 && b['value'] !== 2 && b['value'] !== 50)
        issues.push({ field: 'value', issue: 'must be 0, 2 or 50' });
    }
    if (issues.length > 0) return invalid(issues);
    const gate = (b as { gate: number }).gate;
    const value = (b as { value: number }).value;
    const outside = gateIssue(aid, gate);
    if (outside !== undefined) return invalid([outside]);
    if (cx.core.oncourse().attemptIds.includes(aid))
      return notPossible('run-not-closed', "the Attempt is still on upstream's on-course list");
    const refusedConnection = notPossible(
      'upstream-disconnected',
      'there is no connected upstream instance to address the command to',
    );
    const system = cx.upstreamInstance === 'main' ? 'Main' : cx.upstreamInstance === 'backup' ? 'Backup' : undefined;
    const source = cx.tcp;
    if (
      cx.tcpState !== 'connected' ||
      system === undefined ||
      source === undefined ||
      !('write' in source) ||
      (source as WritableSource).isWritable !== true
    )
      return refusedConnection;
    const run = runOf(cx, aid);
    if (run === undefined) throw new Error(`internal: Attempt ${aid} presents no run`); // never a refusal (§7.3): the core presents one for every Attempt
    try {
      await (source as WritableSource).write(
        penaltyCorrectionCommand({ system, raceId: r.phaseId, bib: r.bib, gate, value }),
      );
    } catch (e) {
      cx.log('command write', e);
      return refusedConnection;
    }
    // the creating step (§2.9): the WriteRequest, the optimistic value and the push in one unit, durable before the 202
    const writeId = `w-${randomUUID()}`;
    cx.adopted.add(writeId);
    await processUnit(
      cx,
      [
        {
          ingestSeq: 0,
          attemptId: aid,
          field: 'gates',
          source: 'operator-write',
          kind: 'operator',
          observedAt: cx.iso(),
          value: [{ number: gate, penalty: value }],
          confidence: 'authoritative',
          run,
          writeId,
        },
      ],
      { key: key as string, writeId },
    );
    return { status: 202, body: cx.wstore.get(writeId) as J, location: `/api/writes/${writeId}` };
  }
  const inflight = new Map<string, Promise<RestReply>>();
  function penalty(r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply> {
    if (key === undefined) return guard(() => penaltyTask(r, undefined, body));
    const bound = cx.wstore?.byWriteKey(key);
    if (bound !== undefined) return Promise.resolve({ status: 200, body: bound });
    const first = inflight.get(key);
    if (first !== undefined)
      return first.then((rep) =>
        rep.status === 202 ? { status: 200, ...(rep.body !== undefined ? { body: rep.body } : {}) } : rep,
      );
    const p = guard(() => penaltyTask(r, key, body)).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, p);
    return p;
  }

  const currentOf = (aid: string): number => runOf(cx, aid) ?? 1;
  const putCheck = (r: AttemptRoute, gateText: string, body: unknown): Promise<RestReply> =>
    guard(async () => {
      const aid = attemptOf(r);
      if (aid === undefined) return notFound(r);
      if (isCross(aid)) return notPossible('cross', 'checks are not possible on a Kayak Cross Attempt');
      const issues: { field: string; issue: string }[] = [];
      const b = body === undefined ? {} : body;
      if (!isObj(b)) issues.push({ field: 'body', issue: 'must be an object' });
      else if (b['checkedBy'] !== undefined && typeof b['checkedBy'] !== 'string')
        issues.push({ field: 'checkedBy', issue: 'must be a string' });
      const gate = /^\d+$/.test(gateText) ? Number(gateText) : NaN;
      const outside = gateIssue(aid, gate);
      if (outside !== undefined) issues.push(outside);
      if (issues.length > 0) return invalid(issues);
      const cells = known<{ number: number; penalty: number | null }[]>(cx.core.presented(aid)['gates']);
      const valueAtCheck = cells?.find((c) => c.number === gate)?.penalty ?? null;
      const checkedBy = (b as { checkedBy?: string }).checkedBy;
      return {
        status: 200,
        body: await doPutCheck(cx, {
          attemptId: aid,
          run: currentOf(aid),
          gate,
          valueAtCheck,
          ...(checkedBy !== undefined ? { checkedBy } : {}),
        }),
      };
    });
  const deleteCheck = (r: AttemptRoute, gateText: string): Promise<RestReply> =>
    guard(async () => {
      const aid = attemptOf(r);
      if (aid === undefined) return notFound(r);
      if (!/^\d+$/.test(gateText)) return invalid([{ field: 'gate', issue: 'must be an integer' }]);
      await doDeleteCheck(cx, { attemptId: aid, run: currentOf(aid), gate: Number(gateText) });
      return { status: 204 };
    });
  const createFlag = (r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply> =>
    guard(async () => {
      const bound = key === undefined ? undefined : cx.wstore?.flagByKey(key);
      const have = bound === undefined ? undefined : cx.store?.list().flags.find((f) => f.flagId === bound);
      if (have !== undefined) return { status: 200, body: have as unknown as J };
      const aid = attemptOf(r);
      if (aid === undefined || cx.wstore === undefined) return notFound(r);
      const issues: { field: string; issue: string }[] = [];
      if (key === undefined) issues.push({ field: 'Idempotency-Key', issue: 'missing' });
      if (!isObj(body)) issues.push({ field: 'body', issue: 'must be an object' });
      else {
        if (typeof body['gate'] !== 'number' || !Number.isInteger(body['gate']))
          issues.push({ field: 'gate', issue: 'must be an integer' });
        if (typeof body['comment'] !== 'string') issues.push({ field: 'comment', issue: 'must be a string' });
        if (
          body['suggestedValue'] !== undefined &&
          (typeof body['suggestedValue'] !== 'number' || !Number.isInteger(body['suggestedValue']))
        )
          issues.push({ field: 'suggestedValue', issue: 'must be an integer' });
        if (body['createdBy'] !== undefined && typeof body['createdBy'] !== 'string')
          issues.push({ field: 'createdBy', issue: 'must be a string' });
      }
      if (issues.length > 0) return invalid(issues);
      const b = body as { gate: number; comment: string; suggestedValue?: number; createdBy?: string };
      // The key and the flag live in two files: the key is bound first, to an id chosen ahead, and the flag is created under that id.
      // A kill between the two leaves a bound key with no flag; its retry creates the flag under the bound id, so there is never a second one.
      const flagId = bound ?? opts.newId?.() ?? `flag-${randomUUID()}`;
      if (bound === undefined) {
        // §2.10: a flag whose key binding failed is not acknowledged and leaves its key unbound; the failure goes to the admin log (as item 18's)
        try {
          await cx.wstore.bindFlag(key as string, flagId);
        } catch (e) {
          cx.adminLog({
            kind: 'store-write-failed',
            store: 'writes',
            file: `${cx.base}writes-${encodeURIComponent(cx.event?.eventId ?? '')}.json`,
            reason: e instanceof Error ? e.message : String(e),
          });
          throw e;
        }
      }
      const flag = await doCreateFlag(
        cx,
        {
          attemptId: aid,
          run: currentOf(aid),
          gate: b.gate,
          comment: b.comment,
          ...(b.suggestedValue !== undefined ? { suggestedValue: b.suggestedValue } : {}),
          ...(b.createdBy !== undefined ? { createdBy: b.createdBy } : {}),
        },
        flagId,
      );
      return { status: 201, body: flag };
    });
  const resolveFlag = (flagId: string, body: unknown): Promise<RestReply> =>
    guard(async () => ({
      status: 200,
      body: await doResolveFlag(cx, flagId, (body === undefined ? {} : body) as { note?: string; resolvedBy?: string }),
    }));

  return { penalty, putCheck, deleteCheck, createFlag, resolveFlag };
}
