/**
 * The unit pipeline of the on-site process (#397): one ingest unit is merged whole, then its messages are stamped and pushed (§1.6);
 * the Event's facts, the writes beside their Attempts, the writes store, and the pending writes resumed from an earlier lifetime.
 */
import type { IngestElement } from '../ingest/index.js';
import { canon } from './step-log.js';
import { onsiteEvent, toWire, type CurrentEvent, type J } from './wire.js';
import { background, emit, type OnsiteContext } from './context.js';
import { checkAndFlagPushes } from './event-state.js';
import { sourcesChange } from './sources.js';

const instanceOf = (text: unknown): 'main' | 'backup' | 'offline' | null => {
  const t = typeof text === 'string' ? text.toLowerCase() : '';
  return t === 'main' || t === 'backup' || t === 'offline' ? t : null;
};

/**
 * CONTRACTS §2.2, §7.2 (#283): the Event's `details` and the default `name` off the unit's `{ eventFact }`
 * elements (ingest's `parseXmlSnapshot`). The core holds no Event at all, so this bridge-level state owns it
 * alone. `details` an equal re-delivery moves nothing (INV-5); `name` only takes the snapshot's title where
 * `nameFrom` is `'snapshot'` (§10 item 40 (a): no operator name was entered, at boot or by `startNewEvent`).
 *
 * #368 N3: computes the next Event without assigning it. The caller (`processUnit`) assigns it, and prepends
 * `event.changed`, only after `core.applyUnit` returns: a throwing `applyUnit` (its programming-error guards)
 * then leaves the presented Event, and whether `event.changed` was sent, in step with each other.
 */
function nextEventFacts(
  cx: OnsiteContext,
  elements: IngestElement[],
): { next: CurrentEvent | undefined; changed: boolean } {
  if (cx.event === undefined) return { next: undefined, changed: false };
  let next = cx.event;
  let changed = false;
  for (const el of elements) {
    const ev = el['eventFact'];
    if (typeof ev !== 'object' || ev === null) continue;
    const { field, value } = ev as { field: string; value: unknown };
    if (field === 'details') {
      const cur = next.details;
      if (cur.state === 'known' && JSON.stringify(cur.value) === JSON.stringify(value)) continue;
      next = {
        ...next,
        details: {
          state: 'known',
          value,
          observedAt: el.observedAt,
          source: 'xml',
          confidence: 'authoritative',
          provisional: false,
        } as CurrentEvent['details'],
      };
      changed = true;
    } else if (field === 'name' && next.nameFrom === 'snapshot' && typeof value === 'string' && value !== next.name) {
      next = { ...next, name: value };
      changed = true;
    }
  }
  return { next, changed };
}

/** One ingest unit: merged whole, then stamped and pushed (§1.6). */
export async function processUnit(
  cx: OnsiteContext,
  elements: IngestElement[],
  bind?: { key: string; writeId: string },
): Promise<void> {
  for (const el of elements) {
    const status = el['sourceStatus'] as
      { tcp?: { upstreamInstance?: unknown; timingClockOffsetSeconds?: unknown } } | undefined;
    if (status?.tcp === undefined) continue;
    cx.upstreamInstance = instanceOf(status.tcp.upstreamInstance);
    if (typeof status.tcp.timingClockOffsetSeconds === 'number')
      cx.timingClockOffsetSeconds = Math.round(status.tcp.timingClockOffsetSeconds);
  }
  const { next: nextEvent, changed: eventChanged } = nextEventFacts(cx, elements);
  const before = cx.liveAttempts;
  const derived = cx.core.applyUnit(elements); // throws: the Event stays unassigned, in step with event.changed never sent (#368 N3)
  if (eventChanged) cx.event = nextEvent;
  const nowAttempts = new Set(cx.core.attempts());
  const createdIds = new Set([...nowAttempts].filter((id) => !before.has(id))); // §10 item 38 (m): a return after removal, or the first ever
  cx.liveAttempts = nowAttempts;
  for (const d of cx.core.drainIngestDiagnostics()) cx.adminLog(d);
  let wire = cx.core.drainNotifications().map((m) => toWire(m, cx.event?.eventId ?? '', cx.classesSent));
  if (eventChanged && cx.event !== undefined) wire = [{ type: 'event.changed', event: onsiteEvent(cx.event) }, ...wire];
  wire = writesBesideAttempts(wire);
  // §2.9: every WriteRequest change is durable before it is pushed; a re-adopted write restating what the store holds is no change (§1.6).
  // §7.3: once the socket accepted the command the write exists; a failed store write keeps it in memory, is reported on the admin log
  // and is answered and pushed as usual
  if (cx.wstore !== undefined) {
    const held = cx.wstore;
    wire = wire.filter(
      (m) =>
        m['type'] !== 'write.updated' || canon(held.get((m['write'] as J)['writeId'] as string)) !== canon(m['write']),
    );
    // the stored record alone carries the TCP source's retained target cell at submission (DERIVATIONS §6); the store keeps it
    const changed = wire
      .filter((m) => m['type'] === 'write.updated')
      .map((m) => m['write'] as J)
      .map((w) => {
        const retainedCell = cx.core.retainedCell(w['writeId'] as string);
        return retainedCell === undefined ? w : { ...w, retainedCell };
      });
    // item 50: a still-pending write whose retained value moved (an earlier write on its cell was answered) is stored, not pushed
    const named = new Set(changed.map((w) => w['writeId'] as string));
    for (const w of held.pending()) {
      const id = w['writeId'] as string;
      const retainedCell = named.has(id) ? undefined : cx.core.retainedCell(id);
      if (retainedCell !== undefined && canon(retainedCell) !== canon(w['retainedCell'] ?? null))
        changed.push({ ...w, retainedCell });
    }
    if (changed.length > 0 || bind !== undefined) {
      try {
        await held.put(changed, bind);
      } catch (e) {
        cx.adminLog({
          kind: 'store-write-failed',
          store: 'writes',
          file: `${cx.base}writes-${encodeURIComponent(cx.event?.eventId ?? '')}.json`,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
  const state = [...wire, ...checkAndFlagPushes(cx, createdIds)];
  const sent = await emit(cx, [...state, ...sourcesChange(cx)]);
  const unitMessages = sent.filter((m) => m['type'] !== 'sources.updated');
  cx.stepLog?.step([...elements, ...derived], unitMessages);
  await adoptPending(cx);
}

/**
 * §2.9: a WriteRequest and the optimistic value it carries are one step: `write.updated` goes out right behind the `attempt.updated` of
 * its Attempt; a removed Attempt's goes right before its `attempt.deleted`, a removed Phase's right before its `phase.deleted` (§7.2).
 */
function writesBesideAttempts(wire: J[]): J[] {
  const out = wire.filter((m) => m['type'] !== 'write.updated');
  for (const w of wire.filter((m) => m['type'] === 'write.updated')) {
    const t = (w['write'] as { target: { phaseId: string; bib: string } }).target;
    const id = `${t.phaseId}:${t.bib}`;
    const at = out.map((m) => m['type'] === 'attempt.updated' && m['attemptId'] === id).lastIndexOf(true);
    const gone = out.findIndex((m) => m['type'] === 'attempt.deleted' && m['attemptId'] === id);
    const phaseGone = out.findIndex((m) => m['type'] === 'phase.deleted' && m['phaseId'] === t.phaseId);
    out.splice(at >= 0 ? at + 1 : gone >= 0 ? gone : phaseGone >= 0 ? phaseGone : out.length, 0, w);
  }
  return out;
}
export const runOf = (cx: OnsiteContext, attemptId: string): number | undefined => {
  const run = cx.core.presented(attemptId)['run'] as { state?: string; value?: unknown };
  return run.state === 'known' && typeof run.value === 'number' ? run.value : undefined;
};
/**
 * Pending writes the store holds from an earlier lifetime resume at load (round 28-3b, DERIVATIONS §6): each is put back into the core as
 * the operator's provisional value as soon as the core knows its Attempt (the restarted core starts empty), with no on-course condition.
 * Its record's `retainedCell` is the TCP source's retained value again (absent: none retained), so §6's ordinary comparison decides.
 * The core decides `superseded` where its generation has passed the stored one (DERIVATIONS §6); a write whose generation it does not
 * present yet waits (item 25).
 */
async function adoptPending(cx: OnsiteContext): Promise<void> {
  if (cx.wstore === undefined) return;
  const waiting = cx.wstore.pending().filter((w) => !cx.adopted.has(w['writeId'] as string));
  if (waiting.length === 0) return;
  const known = new Set(cx.core.attempts());
  // item 50 (d): an Attempt's stored pending writes resume in one unit, in the order sent, so its first delivery is judged once against all
  const byAttempt = new Map<string, J[]>();
  const order = waiting
    .map((w, i) => ({ w, i }))
    .sort((x, y) => String(x.w['submittedAt']).localeCompare(String(y.w['submittedAt'])) || x.i - y.i);
  for (const { w } of order) {
    const t = w['target'] as { phaseId: string; bib: string; run: number };
    const aid = `${t.phaseId}:${t.bib}`;
    const run = known.has(aid) ? runOf(cx, aid) : undefined;
    if (run === undefined || run < t.run) continue;
    byAttempt.set(aid, [...(byAttempt.get(aid) ?? []), w]);
  }
  for (const [aid, ws] of byAttempt) {
    for (const w of ws) cx.adopted.add(w['writeId'] as string);
    await processUnit(
      cx,
      ws.map((w) => {
        const t = w['target'] as { run: number };
        const v = w['requestedValue'] as { gate: number; value: number };
        return {
          ingestSeq: 0,
          attemptId: aid,
          field: 'gates',
          source: 'operator-write',
          kind: 'operator',
          observedAt: w['submittedAt'] as string,
          value: [{ number: v.gate, penalty: v.value }],
          confidence: 'authoritative',
          run: t.run,
          writeId: w['writeId'] as string,
          retainedCell: w['retainedCell'] ?? null,
        };
      }),
    );
  }
}
export const unit = (cx: OnsiteContext, elements: IngestElement[]): void => {
  background(cx, () => processUnit(cx, elements));
};
