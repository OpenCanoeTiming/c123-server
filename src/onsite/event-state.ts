/**
 * Event state and stores of the on-site process (#397): the current event and its `event.json` (#330), the core and the context tracker,
 * the checks and writes stores per event, and the checks' derived status.
 */
import { randomUUID } from 'node:crypto';
import { createContextTracker, type ContextTracker } from '../ingest/context-tracker.js';
import { createMergeCore, type MergeCore } from '../core/index.js';
import { openChecksStore, ChecksFileInvalidError, type ChecksStore } from '../store/checks.js';
import { openWritesStore, WritesFileInvalidError, type WritesStore } from './writes-store.js';
import type { CurrentEvent, J } from './wire.js';
import type { OnsiteOptions } from './index.js';
import type { OnsiteBase, OnsiteContext } from './context.js';

type Presented = Record<string, { run: number; gates: unknown[] | null }>;
export const keyOf = (c: { attemptId: string; run: number; gate: number }): string => `${c.attemptId}|${c.run}|${c.gate}`;

const eventFileOf = (b: OnsiteBase): string => `${b.base}event.json`;
/** #330: the persisted current event, or undefined when there is none; an unreadable file is set aside and reported like the stores' files. */
async function readEventFile(b: OnsiteBase): Promise<{ eventId: string; name?: string } | undefined> {
  const eventFile = eventFileOf(b);
  let text: string;
  try { text = await b.fs.readFile(eventFile); } catch (e) {
    if ((e as { code?: string }).code === 'ENOENT') return undefined;
    throw e;
  }
  try {
    const v = JSON.parse(text) as { version?: unknown; eventId?: unknown; name?: unknown };
    if (v === null || typeof v !== 'object' || v.version !== 1) throw new Error('not a version 1 event file');
    if (typeof v.eventId !== 'string' || v.eventId === '') throw new Error('eventId is not a non-empty string');
    if (v.name !== undefined && typeof v.name !== 'string') throw new Error('name is not a string');
    return { eventId: v.eventId, ...(v.name !== undefined ? { name: v.name } : {}) };
  } catch (e) {
    const setAsideAs = await b.setAsideName(eventFile);
    await b.fs.rename(eventFile, setAsideAs);
    b.report('event', eventFile, setAsideAs, e instanceof Error ? e.message : String(e));
    return undefined;
  }
}
/** Atomic like the other stores: a temp file, then a rename. */
export async function writeEventFile(b: OnsiteBase, eventId: string, name: string | undefined): Promise<void> {
  const eventFile = eventFileOf(b);
  await b.fs.mkdir(b.dataDir);
  await b.fs.writeFile(`${eventFile}.tmp`, JSON.stringify({ version: 1, eventId, ...(name !== undefined ? { name } : {}) }));
  await b.fs.rename(`${eventFile}.tmp`, eventFile);
}

/** The event at boot: the one given, the persisted one, or a new one (#330); undefined without an id and without persistence. */
export async function bootEvent(b: OnsiteBase): Promise<CurrentEvent | undefined> {
  const { opts } = b;
  // §10 item 40 (a): a boot flag entered non-blank is the operator naming the event; blank or absent, the name awaits the snapshot's title.
  const bootName = opts.eventName !== undefined && opts.eventName.trim() !== '' ? opts.eventName : undefined;
  let bootId = opts.eventId;
  let enteredName = bootName;
  if (opts.persistEvent === true) {
    const kept = await readEventFile(b);
    bootId ??= kept?.eventId ?? randomUUID();
    if (enteredName === undefined && kept?.eventId === bootId) enteredName = kept.name;
    await writeEventFile(b, bootId, enteredName);
  }
  return bootId === undefined ? undefined : {
    eventId: bootId, name: enteredName ?? bootId, details: { state: 'not-yet' }, nameFrom: enteredName !== undefined ? 'operator' : 'snapshot',
  };
}

export const newCore = (opts: OnsiteOptions): MergeCore => createMergeCore({ ...(opts.zone !== undefined ? { zone: opts.zone } : { zone: 'Europe/Prague' }), xmlConfigured: opts.xml !== undefined });
export function newTracker(opts: OnsiteOptions): ContextTracker { return createContextTracker(opts.zone ?? 'Europe/Prague', opts.eventDate, opts.externalIdScheme ?? 'on-site'); }

/** Renames an invalid checks or writes file aside and reports it; the store then opens empty. */
async function setAside(b: OnsiteBase, store: 'checks' | 'writes', eventId: string, reason: string): Promise<void> {
  const file = `${b.base}${store}-${encodeURIComponent(eventId)}.json`; // the error's path may name a place inside the file
  const setAsideAs = await b.setAsideName(file);
  await b.fs.rename(file, setAsideAs);
  b.report(store, file, setAsideAs, reason, eventId);
}

export async function storeFor(b: OnsiteBase, eventId: string): Promise<ChecksStore> {
  const have = b.stores.get(eventId);
  if (have !== undefined) return have;
  const { fs, dataDir, clock, opts } = b;
  const open = (): Promise<ChecksStore> => openChecksStore({ fs, dir: dataDir, eventId, clock, ...(opts.newId !== undefined ? { newId: opts.newId } : {}) });
  let store: ChecksStore;
  try { store = await open(); } catch (e) {
    if (!(e instanceof ChecksFileInvalidError)) throw e;
    await setAside(b, 'checks', eventId, e.reason);
    store = await open();
  }
  b.stores.set(eventId, store);
  return store;
}
export async function writesFor(b: OnsiteBase, eventId: string): Promise<WritesStore> {
  const have = b.writeStores.get(eventId);
  if (have !== undefined) return have;
  const { fs, dataDir, clock } = b;
  const open = (): Promise<WritesStore> => openWritesStore({ fs, dir: dataDir, eventId, clock });
  let ws: WritesStore;
  try { ws = await open(); } catch (e) {
    if (!(e instanceof WritesFileInvalidError)) throw e;
    await setAside(b, 'writes', eventId, e.reason);
    ws = await open();
  }
  b.writeStores.set(eventId, ws);
  return ws;
}
/** §7.2: the statuses hydration already serves are the ones pushed; seeded at startup and at `startNewEvent`. */
export function seedCheckStatuses(cx: OnsiteContext, s: ChecksStore): void {
  cx.checkStatuses.clear();
  for (const c of withStatus(cx, s)) cx.checkStatuses.set(keyOf(c as { attemptId: string; run: number; gate: number }), c['status'] as string);
}

// ------------------------------------------------------------------------------------------------ checks: derived status
function presentedFor(cx: OnsiteContext, attemptIds: Iterable<string>): Presented {
  const out: Presented = {};
  for (const id of new Set(attemptIds)) {
    const v = cx.core.presented(id);
    const run = v['run'] as { state?: string; value?: unknown };
    if (run.state !== 'known' || typeof run.value !== 'number') continue;
    const gates = v['gates'] as { state?: string; value?: unknown };
    out[id] = { run: run.value, gates: gates.state === 'known' && Array.isArray(gates.value) ? (gates.value as unknown[]) : null };
  }
  return out;
}
export const withStatus = (cx: OnsiteContext, s: ChecksStore): J[] => s.checksWithStatus(presentedFor(cx, s.list().checks.map((c) => c.attemptId))) as unknown as J[];
/** §2.10: the checks and flags the store holds stay there; only those of an Attempt that exists are served or pushed. */
export const ofExisting = <T extends { attemptId: string }>(cx: OnsiteContext, items: T[]): T[] => {
  const live = new Set(cx.core.attempts());
  return items.filter((c) => live.has(c.attemptId));
};
/**
 * §7.2, §10 item 38 (m): `check.updated` for every check whose derived `status` differs from the one last pushed;
 * and, for an Attempt a unit just created (`createdIds`: a return after removal, or the first ever, a restart
 * included), every one of its stored checks (status included unchanged) and flags, after the creating
 * `attempt.updated` (the caller appends this after `wire`, which already carries it).
 */
export function checkAndFlagPushes(cx: OnsiteContext, createdIds: ReadonlySet<string>): J[] {
  const store = cx.store;
  if (store === undefined) return [];
  const out: J[] = [];
  for (const c of ofExisting(cx, withStatus(cx, store) as (J & { attemptId: string })[])) {
    const k = keyOf(c as { attemptId: string; run: number; gate: number });
    const created = createdIds.has(c['attemptId'] as string);
    if (!created && cx.checkStatuses.get(k) === c['status']) continue;
    cx.checkStatuses.set(k, c['status'] as string);
    out.push({ type: 'check.updated', attemptId: c['attemptId'], run: c['run'], gate: c['gate'], check: c });
  }
  if (createdIds.size > 0) {
    for (const f of ofExisting(cx, store.list().flags)) if (createdIds.has(f.attemptId)) out.push({ type: 'flag.updated', flag: f as unknown as J });
  }
  return out;
}
