/**
 * The on-site process (#210; CONTRACTS §1.6, §7.1, §7.2, §2.10; CONSTRAINTS §1.3): the production pieces behind REST and `/ws` on one port.
 * TCP messages and XML snapshots become ingest units (the parsers, `createXmlReader`), units go through one merge core, and what the core
 * says is stamped from one `seq` counter and pushed. The legacy server (`src/server.ts`, `src/unified`, `src/ws`) is not touched.
 *
 * One queue serialises everything that moves state or takes a `seq`: a unit is merged whole, then its messages are stamped and sent.
 * The core never sees a clock, a `seq` or an event id; this process stamps ingest times (the injected clock), `seq` and `eventId`.
 */
import { createServer, type Server } from 'node:http';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { XMLValidator } from 'fast-xml-parser';
import { createXmlReader, parseTcp, parseXmlSnapshot, type Clock, type IngestContext, type IngestElement, type XmlFs, type XmlReader, type XmlReaderStatus } from '../ingest/index.js';
import { createContextTracker, type ContextTracker } from '../ingest/context-tracker.js';
import { createMergeCore, type IngestDiagnostic, type MergeCore } from '../core/index.js';
import { openChecksStore, ChecksFileInvalidError, type ChecksFs, type ChecksStore } from '../store/checks.js';
import { TcpSource } from '../sources/TcpSource.js';
import type { Source, WritableSource } from '../sources/types.js';
import { createApp, errorBody, type AttemptRoute, type OnsiteApi, type RestReply, type RebaselineOutcome, type RebaselineScope } from './app.js';
import { openSeq, type SeqCounter } from './seq.js';
import { canon, createStepLog, type StepLog } from './step-log.js';
import { openWritesStore, WritesFileInvalidError, penaltyCorrectionCommand, type WritesStore } from './writes-store.js';
import { checkInput, checkKeyInput, flagInput, resolutionInput, ValidationError } from './validate.js';
import { onsiteEvent, phaseOfAttempt, toWire, type CurrentEvent, type J } from './wire.js';

/** CONSTRAINTS §1.3. */
export const DEFAULT_PORT = 27123;
/** `heartbeatSeconds` (CONTRACTS §7.2). */
export const HEARTBEAT_SECONDS = 10;
const DEFAULT_TCP_PORT = 27333;
const ROOT_CLOSE = '</Canoe123Data>';

/** The UDP listener of Canoe123's broadcast (`src/sources/UdpDiscovery.ts`): used for the TCP host only, its payload never read. */
export interface OnsiteDiscovery extends EventEmitter {
  start(): Promise<void> | void;
  stop(): void;
  reset(): void;
}

/**
 * #273: a store file that failed validation was renamed aside and the store opened empty. #300: a write of the writes store failed; what it
 * carried stays in memory until the next successful one (CONTRACTS §7.3). Admin log only; nothing goes on the wire.
 */
export type AdminLogEntry = {
  kind: 'store-set-aside';
  store: 'checks' | 'writes' | 'seq';
  eventId?: string;
  file: string;
  setAsideAs: string;
  reason: string;
} | {
  kind: 'store-write-failed';
  store: 'writes';
  file: string;
  reason: string;
};

export interface OnsiteOptions {
  /** Where the admin log goes, the core's ingest-only diagnostics included (DERIVATIONS §0.5); default one stderr line. */
  adminLog?: (entry: AdminLogEntry | IngestDiagnostic) => void;
  port?: number;
  clock: Clock;
  fs: ChecksFs & XmlFs;
  dataDir: string;
  eventId?: string;
  eventName?: string;
  xml?: { path: string; pollSeconds?: number };
  tcp?: { source: Source } | { host?: string; port?: number; create?: (host: string, port: number) => Source };
  discovery?: OnsiteDiscovery | null;
  zone?: string;
  eventDate?: string;
  externalIdScheme?: string;
  newId?: () => string;
  stepLog?: (line: string) => void;
}

export interface OnsiteHandle {
  port: number;
  stop(): Promise<void>;
  kill(): void;
  startNewEvent(e: { eventId: string; name: string }): Promise<void>;
  checks: {
    putCheck(i: { attemptId: string; run: number; gate: number; valueAtCheck: number | null; checkedBy?: string }): Promise<J>;
    deleteCheck(k: { attemptId: string; run: number; gate: number }): Promise<void>;
    createFlag(i: { attemptId: string; run: number; gate: number; comment: string; suggestedValue?: number; createdBy?: string }): Promise<J>;
    resolveFlag(flagId: string, i: { note?: string; resolvedBy?: string }): Promise<J>;
  };
}

type Presented = Record<string, { run: number; gates: unknown[] | null }>;
const keyOf = (c: { attemptId: string; run: number; gate: number }): string => `${c.attemptId}|${c.run}|${c.gate}`;
const mapTcpState = (s: string): 'connected' | 'reconnecting' => (s === 'connected' ? 'connected' : 'reconnecting');
const instanceOf = (text: unknown): 'main' | 'backup' | 'offline' | null => {
  const t = typeof text === 'string' ? text.toLowerCase() : '';
  return t === 'main' || t === 'backup' || t === 'offline' ? t : null;
};

export async function startOnsite(opts: OnsiteOptions): Promise<OnsiteHandle> {
  const { clock, fs, dataDir } = opts;
  const iso = (): string => new Date(clock.now()).toISOString();
  const log = (what: string, e: unknown): void => { console.error(`onsite: ${what}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`); };
  let dead = false;
  let stopping = false;

  const base = dataDir.endsWith('/') || dataDir.endsWith('\\') ? dataDir : `${dataDir}/`;
  const adminLog = opts.adminLog ?? ((en: AdminLogEntry | IngestDiagnostic): void => {
    if (en.kind === 'store-set-aside') console.error(`onsite: ${en.kind} store=${en.store}${en.eventId !== undefined ? ` event=${en.eventId}` : ''} file=${en.file} setAsideAs=${en.setAsideAs} reason=${en.reason}`);
    else if (en.kind === 'store-write-failed') console.error(`onsite: ${en.kind} store=${en.store} file=${en.file} reason=${en.reason}`);
    else if (en.kind === 'xml-table-emptied') console.error(`onsite: ${en.kind} phase=${en.phaseId} count=${en.count}`);
    // #367: every other ingest-only kind (`unparseable-field`, `gates-absent`, ...), whatever fields it carries
    else console.error(`onsite: ${en.kind} ${JSON.stringify(en)}`);
  });
  /** A set-aside name for `file` that nothing has in the directory: an earlier set-aside is never overwritten. */
  async function setAsideName(file: string): Promise<string> {
    const names = new Set(await fs.readdir(dataDir));
    const stem = file.slice(base.length);
    let n = 0;
    const nameAt = (i: number): string => `${stem}.invalid-${clock.now()}${i === 0 ? '' : `-${i}`}`;
    while (names.has(nameAt(n))) n++;
    return `${base}${nameAt(n)}`;
  }
  const report = (store: AdminLogEntry['store'], file: string, setAsideAs: string, reason: string, eventId?: string): void => {
    adminLog({ kind: 'store-set-aside', store, ...(eventId !== undefined ? { eventId } : {}), file, setAsideAs, reason });
  };
  /** Renames an invalid checks or writes file aside and reports it; the store then opens empty. */
  async function setAside(store: 'checks' | 'writes', eventId: string, reason: string): Promise<void> {
    const file = `${base}${store}-${encodeURIComponent(eventId)}.json`; // the error's path may name a place inside the file
    const setAsideAs = await setAsideName(file);
    await fs.rename(file, setAsideAs);
    report(store, file, setAsideAs, reason, eventId);
  }

  /**
   * An invalid seq file is copied aside, not renamed: it stays at its name until `openSeq` replaces it with a valid mark (§1.6 with
   * §2.10's discipline), so a crash in between leaves the invalid file and the next start recovers again, never at zero.
   */
  const seq: SeqCounter = await openSeq(fs, dataDir, {
    floor: () => clock.now(),
    keep: async (path, content, reason) => {
      const setAsideAs = await setAsideName(path);
      await fs.writeFile(setAsideAs, content);
      report('seq', path, setAsideAs, reason);
    },
  });

  // ------------------------------------------------------------------------------------------------ event, core, checks store
  // §10 item 40 (a): a boot flag entered non-blank is the operator naming the event; blank or absent, the name awaits the snapshot's title.
  const bootName = opts.eventName !== undefined && opts.eventName.trim() !== '' ? opts.eventName : undefined;
  let event: CurrentEvent | undefined = opts.eventId === undefined ? undefined : {
    eventId: opts.eventId, name: bootName ?? opts.eventId, details: { state: 'not-yet' }, nameFrom: bootName !== undefined ? 'operator' : 'snapshot',
  };
  const newCore = (): MergeCore => createMergeCore({ ...(opts.zone !== undefined ? { zone: opts.zone } : { zone: 'Europe/Prague' }), xmlConfigured: opts.xml !== undefined });
  let core = newCore();
  let tracker: ContextTracker = newTracker();
  function newTracker(): ContextTracker { return createContextTracker(opts.zone ?? 'Europe/Prague', opts.eventDate, opts.externalIdScheme ?? 'on-site'); }
  /** Classes whose creating message went out, and the last status pushed per check. Both belong to the event. */
  const classesSent = new Set<string>();
  const checkStatuses = new Map<string, string>();
  /** §10 item 38 (m): Attempt ids live after the last unit, to tell a creating unit (a return, or the first ever) from an ordinary update. Belongs to the event. */
  let liveAttempts = new Set<string>();

  /** #273 N2: one store instance per event, ever. A return to an earlier event gets the instance it had. */
  const stores = new Map<string, ChecksStore>();
  async function storeFor(eventId: string): Promise<ChecksStore> {
    const have = stores.get(eventId);
    if (have !== undefined) return have;
    const open = (): Promise<ChecksStore> => openChecksStore({ fs, dir: dataDir, eventId, clock, ...(opts.newId !== undefined ? { newId: opts.newId } : {}) });
    let store: ChecksStore;
    try { store = await open(); } catch (e) {
      if (!(e instanceof ChecksFileInvalidError)) throw e;
      await setAside('checks', eventId, e.reason);
      store = await open();
    }
    stores.set(eventId, store);
    return store;
  }
  let store: ChecksStore | undefined = event === undefined ? undefined : await storeFor(event.eventId);
  /** The write requests and idempotency keys, one durable file per event (`writes-store.ts`). */
  const writeStores = new Map<string, WritesStore>();
  async function writesFor(eventId: string): Promise<WritesStore> {
    const have = writeStores.get(eventId);
    if (have !== undefined) return have;
    const open = (): Promise<WritesStore> => openWritesStore({ fs, dir: dataDir, eventId, clock });
    let ws: WritesStore;
    try { ws = await open(); } catch (e) {
      if (!(e instanceof WritesFileInvalidError)) throw e;
      await setAside('writes', eventId, e.reason);
      ws = await open();
    }
    writeStores.set(eventId, ws);
    return ws;
  }
  let wstore: WritesStore | undefined = event === undefined ? undefined : await writesFor(event.eventId);
  /** Writes the core holds in this lifetime (created here or re-adopted). */
  const adopted = new Set<string>();
  /** §7.2: the statuses hydration already serves are the ones pushed; seeded at startup and at `startNewEvent`. */
  function seedCheckStatuses(s: ChecksStore): void {
    checkStatuses.clear();
    for (const c of withStatus(s)) checkStatuses.set(keyOf(c as { attemptId: string; run: number; gate: number }), c['status'] as string);
  }

  // ------------------------------------------------------------------------------------------------ the queue and the push
  let tail: Promise<unknown> = Promise.resolve();
  function enqueue<T>(task: () => Promise<T> | T): Promise<T | undefined> {
    const run = tail.then(() => (dead ? undefined : task()));
    tail = run.catch((e: unknown) => { log('task failed', e); });
    return run;
  }
  const background = (task: () => Promise<unknown> | unknown): void => { void enqueue(task).catch((e: unknown) => { log('task failed', e); }); };

  const clients = new Set<WebSocket>();
  /** Stamps the batch from the one counter, after the persisted mark covers it, and sends it to `only` or to every client. */
  async function emit(payloads: J[], only?: WebSocket): Promise<J[]> {
    if (payloads.length === 0) return [];
    await seq.reserve(payloads.length);
    if (dead) return [];
    const stamped = payloads.map((p) => ({ seq: seq.next(), ...p }));
    for (const m of stamped) {
      const text = JSON.stringify(m);
      for (const c of only === undefined ? clients : [only]) if (c.readyState === c.OPEN) c.send(text);
    }
    return stamped;
  }

  // ------------------------------------------------------------------------------------------------ sources
  let tcp: Source | undefined;
  let tcpState: 'connected' | 'reconnecting' = 'reconnecting';
  let upstreamInstance: 'main' | 'backup' | 'offline' | null = null;
  let timingClockOffsetSeconds: number | null = null;
  let xmlStatus: XmlReaderStatus = { state: opts.xml === undefined ? 'not-configured' : 'reconnecting', lastRewriteDetectedAt: null, tornReads: 0, abandonedReads: 0 };
  const sourcesNow = (): J => ({
    tcp: { state: tcpState, upstreamInstance, timingClockOffsetSeconds },
    xml: { state: xmlStatus.state, lastRewriteDetectedAt: xmlStatus.lastRewriteDetectedAt },
    live: { state: 'not-configured', pendingResources: 0, lastAcceptedAt: null, lastError: null },
  });
  let sourcesSent = '';
  /** `sources.updated` when `SourceStatus` changed since the last one sent. */
  function sourcesChange(): J[] {
    const sources = sourcesNow();
    const text = JSON.stringify(sources);
    if (text === sourcesSent) return [];
    sourcesSent = text;
    return [{ type: 'sources.updated', sources }];
  }

  // ------------------------------------------------------------------------------------------------ checks: derived status
  function presentedFor(attemptIds: Iterable<string>): Presented {
    const out: Presented = {};
    for (const id of new Set(attemptIds)) {
      const v = core.presented(id);
      const run = v['run'] as { state?: string; value?: unknown };
      if (run.state !== 'known' || typeof run.value !== 'number') continue;
      const gates = v['gates'] as { state?: string; value?: unknown };
      out[id] = { run: run.value, gates: gates.state === 'known' && Array.isArray(gates.value) ? (gates.value as unknown[]) : null };
    }
    return out;
  }
  const withStatus = (s: ChecksStore): J[] => s.checksWithStatus(presentedFor(s.list().checks.map((c) => c.attemptId))) as unknown as J[];
  if (store !== undefined) seedCheckStatuses(store);
  /** §2.10: the checks and flags the store holds stay there; only those of an Attempt that exists are served or pushed. */
  const ofExisting = <T extends { attemptId: string }>(items: T[]): T[] => {
    const live = new Set(core.attempts());
    return items.filter((c) => live.has(c.attemptId));
  };
  /**
   * §7.2, §10 item 38 (m): `check.updated` for every check whose derived `status` differs from the one last pushed;
   * and, for an Attempt a unit just created (`createdIds`: a return after removal, or the first ever, a restart
   * included), every one of its stored checks (status included unchanged) and flags, after the creating
   * `attempt.updated` (the caller appends this after `wire`, which already carries it).
   */
  function checkAndFlagPushes(createdIds: ReadonlySet<string>): J[] {
    if (store === undefined) return [];
    const out: J[] = [];
    for (const c of ofExisting(withStatus(store) as (J & { attemptId: string })[])) {
      const k = keyOf(c as { attemptId: string; run: number; gate: number });
      const created = createdIds.has(c['attemptId'] as string);
      if (!created && checkStatuses.get(k) === c['status']) continue;
      checkStatuses.set(k, c['status'] as string);
      out.push({ type: 'check.updated', attemptId: c['attemptId'], run: c['run'], gate: c['gate'], check: c });
    }
    if (createdIds.size > 0) {
      for (const f of ofExisting(store.list().flags)) if (createdIds.has(f.attemptId)) out.push({ type: 'flag.updated', flag: f as unknown as J });
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------------ units
  const stepLog: (StepLog & { reset(): void }) | undefined = opts.stepLog === undefined ? undefined : createStepLog(opts.stepLog, () => core, seq.current());

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
  function nextEventFacts(elements: IngestElement[]): { next: CurrentEvent | undefined; changed: boolean } {
    if (event === undefined) return { next: undefined, changed: false };
    let next = event;
    let changed = false;
    for (const el of elements) {
      const ev = el['eventFact'];
      if (typeof ev !== 'object' || ev === null) continue;
      const { field, value } = ev as { field: string; value: unknown };
      if (field === 'details') {
        const cur = next.details;
        if (cur.state === 'known' && JSON.stringify(cur.value) === JSON.stringify(value)) continue;
        next = { ...next, details: { state: 'known', value, observedAt: el.observedAt, source: 'xml', confidence: 'authoritative', provisional: false } as CurrentEvent['details'] };
        changed = true;
      } else if (field === 'name' && next.nameFrom === 'snapshot' && typeof value === 'string' && value !== next.name) {
        next = { ...next, name: value };
        changed = true;
      }
    }
    return { next, changed };
  }

  /** One ingest unit: merged whole, then stamped and pushed (§1.6). */
  async function processUnit(elements: IngestElement[], bind?: { key: string; writeId: string }): Promise<void> {
    for (const el of elements) {
      const status = el['sourceStatus'] as { tcp?: { upstreamInstance?: unknown; timingClockOffsetSeconds?: unknown } } | undefined;
      if (status?.tcp === undefined) continue;
      upstreamInstance = instanceOf(status.tcp.upstreamInstance);
      if (typeof status.tcp.timingClockOffsetSeconds === 'number') timingClockOffsetSeconds = Math.round(status.tcp.timingClockOffsetSeconds);
    }
    const { next: nextEvent, changed: eventChanged } = nextEventFacts(elements);
    const before = liveAttempts;
    const derived = core.applyUnit(elements); // throws: the Event stays unassigned, in step with event.changed never sent (#368 N3)
    if (eventChanged) event = nextEvent;
    const nowAttempts = new Set(core.attempts());
    const createdIds = new Set([...nowAttempts].filter((id) => !before.has(id))); // §10 item 38 (m): a return after removal, or the first ever
    liveAttempts = nowAttempts;
    for (const d of core.drainIngestDiagnostics()) adminLog(d);
    let wire = core.drainNotifications().map((m) => toWire(m, event?.eventId ?? '', classesSent));
    if (eventChanged && event !== undefined) wire = [{ type: 'event.changed', event: onsiteEvent(event) }, ...wire];
    wire = writesBesideAttempts(wire);
    // §2.9: every WriteRequest change is durable before it is pushed; a re-adopted write restating what the store holds is no change (§1.6).
    // §7.3: once the socket accepted the command the write exists; a failed store write keeps it in memory, is reported on the admin log
    // and is answered and pushed as usual
    if (wstore !== undefined) {
      const held = wstore;
      wire = wire.filter((m) => m['type'] !== 'write.updated' || canon(held.get((m['write'] as J)['writeId'] as string)) !== canon(m['write']));
      // the stored record alone carries the TCP source's retained target cell at submission (DERIVATIONS §6); the store keeps it
      const changed = wire.filter((m) => m['type'] === 'write.updated').map((m) => m['write'] as J).map((w) => {
        const retainedCell = core.retainedCell(w['writeId'] as string);
        return retainedCell === undefined ? w : { ...w, retainedCell };
      });
      // item 50: a still-pending write whose retained value moved (an earlier write on its cell was answered) is stored, not pushed
      const named = new Set(changed.map((w) => w['writeId'] as string));
      for (const w of held.pending()) {
        const id = w['writeId'] as string;
        const retainedCell = named.has(id) ? undefined : core.retainedCell(id);
        if (retainedCell !== undefined && canon(retainedCell) !== canon(w['retainedCell'] ?? null)) changed.push({ ...w, retainedCell });
      }
      if (changed.length > 0 || bind !== undefined) {
        try { await held.put(changed, bind); } catch (e) {
          adminLog({ kind: 'store-write-failed', store: 'writes', file: `${base}writes-${encodeURIComponent(event?.eventId ?? '')}.json`, reason: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    const state = [...wire, ...checkAndFlagPushes(createdIds)];
    const sent = await emit([...state, ...sourcesChange()]);
    const unitMessages = sent.filter((m) => m['type'] !== 'sources.updated');
    stepLog?.step([...elements, ...derived], unitMessages);
    await adoptPending();
  }

  /**
   * §2.9: a WriteRequest and the optimistic value it carries are one step: `write.updated` goes out right behind the `attempt.updated` of
   * its Attempt; a removed Attempt's goes right before its `attempt.deleted` (§7.2).
   */
  function writesBesideAttempts(wire: J[]): J[] {
    const out = wire.filter((m) => m['type'] !== 'write.updated');
    for (const w of wire.filter((m) => m['type'] === 'write.updated')) {
      const t = (w['write'] as { target: { phaseId: string; bib: string } }).target;
      const id = `${t.phaseId}:${t.bib}`;
      const at = out.map((m) => m['type'] === 'attempt.updated' && m['attemptId'] === id).lastIndexOf(true);
      const gone = out.findIndex((m) => m['type'] === 'attempt.deleted' && m['attemptId'] === id);
      out.splice(at >= 0 ? at + 1 : gone >= 0 ? gone : out.length, 0, w);
    }
    return out;
  }
  const runOf = (attemptId: string): number | undefined => {
    const run = core.presented(attemptId)['run'] as { state?: string; value?: unknown };
    return run.state === 'known' && typeof run.value === 'number' ? run.value : undefined;
  };
  /**
   * Pending writes the store holds from an earlier lifetime resume at load (round 28-3b, DERIVATIONS §6): each is put back into the core as
   * the operator's provisional value as soon as the core knows its Attempt (the restarted core starts empty), with no on-course condition.
   * Its record's `retainedCell` is the TCP source's retained value again (absent: none retained), so §6's ordinary comparison decides.
   * The core decides `superseded` where its generation has passed the stored one (DERIVATIONS §6); a write whose generation it does not
   * present yet waits (item 25).
   */
  async function adoptPending(): Promise<void> {
    if (wstore === undefined) return;
    const waiting = wstore.pending().filter((w) => !adopted.has(w['writeId'] as string));
    if (waiting.length === 0) return;
    const known = new Set(core.attempts());
    for (const w of waiting) {
      const t = w['target'] as { phaseId: string; bib: string; run: number };
      const aid = `${t.phaseId}:${t.bib}`;
      const run = known.has(aid) ? runOf(aid) : undefined;
      if (run === undefined) continue;
      const id = w['writeId'] as string;
      if (run < t.run) continue;
      adopted.add(id);
      const v = w['requestedValue'] as { gate: number; value: number };
      await processUnit([{
        ingestSeq: 0, attemptId: aid, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: w['submittedAt'] as string,
        value: [{ number: v.gate, penalty: v.value }], confidence: 'authoritative', run: t.run, writeId: id, retainedCell: w['retainedCell'] ?? null,
      }]);
    }
  }
  const unit = (elements: IngestElement[]): void => { background(() => processUnit(elements)); };

  function onTcpMessage(text: string): void {
    tracker.ctx.observedAt = iso();
    const els = parseTcp(text, tracker.ctx);
    if (els.length === 0) return;
    tracker.learn(els, false);
    unit(els);
  }
  function onTcpStatus(status: string): void {
    tcpState = mapTcpState(status);
    const at = iso();
    if (status === 'connected') unit([{ ingestSeq: 0, event: 'tcp-connected', observedAt: at }]);
    else if (status === 'disconnected') {
      unit([{ ingestSeq: 0, event: 'tcp-disconnected', observedAt: at }]);
      if (discoveryInUse) opts.discovery?.reset();
    } else background(async () => { await emit(sourcesChange()); });
  }

  const tcpOpt = opts.tcp;
  const given = tcpOpt !== undefined && 'source' in tcpOpt;
  const hostOpt = tcpOpt !== undefined && !('source' in tcpOpt) ? tcpOpt.host : undefined;
  // legacy rule (`src/server.ts`): discovery runs only while no TCP host is configured
  const discoveryInUse = opts.discovery !== undefined && opts.discovery !== null && !given && hostOpt === undefined;
  const makeSource = (host: string, port: number): Source => (tcpOpt !== undefined && !('source' in tcpOpt) && tcpOpt.create !== undefined ? tcpOpt.create(host, port) : new TcpSource({ host, port }));
  function attach(src: Source): void {
    if (tcp !== undefined && tcp !== src) tcp.stop();
    tcp = src;
    src.on('message', (text) => { if (tcp === src) onTcpMessage(text); });
    src.on('status', (status) => { if (tcp === src) onTcpStatus(status); });
    src.on('error', (e) => { log('tcp source', e); });
    src.start();
  }
  let discoveredHost: string | null = null;
  const tcpPort = tcpOpt !== undefined && !('source' in tcpOpt) ? (tcpOpt.port ?? DEFAULT_TCP_PORT) : DEFAULT_TCP_PORT;
  if (tcpOpt !== undefined && 'source' in tcpOpt) attach(tcpOpt.source);
  else if (hostOpt !== undefined) attach(makeSource(hostOpt, tcpPort));
  if (discoveryInUse && opts.discovery) {
    opts.discovery.on('discovered', (host: string) => {
      if (discoveredHost === host) return; // the source is already reconnecting by itself
      discoveredHost = host;
      attach(makeSource(host, tcpPort));
    });
    opts.discovery.on('error', (e: unknown) => { log('discovery', e); });
    void Promise.resolve(opts.discovery.start()).catch((e: unknown) => { log('discovery', e); });
  }

  let reader: XmlReader;
  function startReader(): void {
    reader = createXmlReader({
      path: opts.xml?.path, pollIntervalSeconds: opts.xml?.pollSeconds, clock, fs, ctx: tracker.ctx,
      onUnit: (elements) => {
        tracker.learn(elements, true);
        unit(elements);
      },
      onStatus: (status) => {
        xmlStatus = status;
        background(async () => { await emit(sourcesChange()); });
      },
    });
    reader.start();
  }
  startReader();

  // heartbeat: the one message exempt from the no-op rule (§7.2)
  let beat: unknown;
  const arm = (): void => {
    beat = clock.setTimeout(() => {
      arm();
      background(async () => {
        const sources = sourcesNow();
        sourcesSent = JSON.stringify(sources);
        await emit([{ type: 'sources.updated', sources }]);
      });
    }, HEARTBEAT_SECONDS * 1000);
  };
  arm();

  // ------------------------------------------------------------------------------------------------ re-baseline (§4, §7.1)
  async function rebaseline(scope: RebaselineScope): Promise<RebaselineOutcome> {
    return (await enqueue(async (): Promise<RebaselineOutcome> => {
      if (scope.kind === 'phase' && !core.phaseIds().includes(scope.phaseId)) return { ok: false, status: 404, code: 'phase-not-found' };
      const unavailable = (reason: 'not-configured' | 'unreadable' | 'invalid'): RebaselineOutcome => ({ ok: false, status: 409, code: 'source-unavailable', reason });
      if (opts.xml === undefined) return unavailable('not-configured');
      let sig: { mtimeMs: number; size: number };
      let text: string;
      try {
        sig = await fs.stat(opts.xml.path);
        text = await fs.read(opts.xml.path);
      } catch { return unavailable('unreadable'); }
      const at = clock.now();
      const stamp = new Date(at).toISOString();
      const ctx: IngestContext = { ...tracker.ctx, observedAt: stamp };
      const els = text.includes(ROOT_CLOSE) && XMLValidator.validate(text) === true ? parseXmlSnapshot(text, ctx) : undefined;
      if (els === undefined || els.some((e) => 'unparseable' in e)) return unavailable('invalid');
      // §4 step 2: the read has its own ingest sequence; its content age by DERIVATIONS §0.3, from the reader's successful stats
      const changedAfter = reader.changedAfterFor(sig);
      const unitEls: IngestElement[] = [
        { ingestSeq: 0, event: 'rebaseline', observedAt: stamp, scope },
        { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: stamp, changedAfter },
        ...els,
      ];
      tracker.learn(els, true);
      await processUnit(unitEls);
      const ids = core.attempts();
      const attempts = scope.kind === 'event' ? ids.length : ids.filter((a) => phaseOfAttempt(a) === scope.phaseId).length;
      return { ok: true, body: { asOfSeq: seq.current(), scope, snapshotWrittenAt: new Date(sig.mtimeMs).toISOString(), snapshotDetectedAt: stamp, attempts } };
    })) ?? { ok: false, status: 409, code: 'source-unavailable', reason: 'unreadable' }; // the process was killed under the request
  }

  // ------------------------------------------------------------------------------------------------ checks and flags, inside the queue
  async function doPutCheck(input: Parameters<OnsiteHandle['checks']['putCheck']>[0]): Promise<J> {
    const i = checkInput(input);
    const s = needStore();
    await s.putCheck(i);
    const check = withStatus(s).find((c) => keyOf(c as { attemptId: string; run: number; gate: number }) === keyOf(i)) as J;
    checkStatuses.set(keyOf(i), check['status'] as string);
    await emit([{ type: 'check.updated', attemptId: i.attemptId, run: i.run, gate: i.gate, check }]);
    return JSON.parse(JSON.stringify(check)) as J;
  }
  async function doDeleteCheck(key: Parameters<OnsiteHandle['checks']['deleteCheck']>[0]): Promise<void> {
    const k = checkKeyInput(key);
    const s = needStore();
    const existed = s.list().checks.some((c) => keyOf(c) === keyOf(k));
    await s.deleteCheck(k);
    if (!existed) return;
    checkStatuses.delete(keyOf(k));
    await emit([{ type: 'check.updated', attemptId: k.attemptId, run: k.run, gate: k.gate, check: null }]);
  }
  async function doCreateFlag(input: Parameters<OnsiteHandle['checks']['createFlag']>[0], flagId?: string): Promise<J> {
    const i = flagInput(input);
    const flag = await needStore().createFlag(flagId === undefined ? i : { ...i, flagId });
    await emit([{ type: 'flag.updated', flag }]);
    return flag as unknown as J;
  }
  /** §10 item 38 (k): a resolution is a flag write; while its Attempt does not exist, it is `attempt-not-found`, checked after `flag-not-found`, with nothing stored or pushed. */
  async function doResolveFlag(flagId: string, input: { note?: string; resolvedBy?: string }): Promise<J> {
    const i = resolutionInput(flagId, input);
    const s = needStore();
    const was = s.list().flags.find((f) => f.flagId === flagId);
    if (was !== undefined && !core.attempts().includes(was.attemptId)) throw Object.assign(new Error(`no Attempt for flag ${flagId}`), { code: 'attempt-not-found' });
    const flag = await s.resolveFlag(flagId, i);
    if (was?.resolution === undefined) await emit([{ type: 'flag.updated', flag }]);
    return flag as unknown as J;
  }

  // ------------------------------------------------------------------------------------------------ REST: writes, checks, flags (§7.3, §7.4)
  const refuse = (status: number, code: string, message: string, details?: unknown): RestReply => ({ status, body: errorBody(code, message, details) });
  const notPossible = (reason: string, message: string): RestReply => refuse(409, 'write-not-possible', message, { reason });
  const invalid = (details: { field: string; issue: string }[]): RestReply => refuse(400, 'validation-failed', 'the request is not valid', details);
  const notFound = (a: AttemptRoute): RestReply => refuse(404, 'attempt-not-found', `no Attempt ${a.bib} in Phase ${a.phaseId}`);
  const gone = (): RestReply => refuse(503, 'internal-error', 'the process is stopping');
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const known = <T>(v: unknown): T | undefined => (isObj(v) && v['state'] === 'known' ? (v['value'] as T) : undefined);

  const attemptOf = (a: AttemptRoute): string | undefined => { const id = `${a.phaseId}:${a.bib}`; return core.attempts().includes(id) ? id : undefined; };
  const isCross = (attemptId: string): boolean => {
    const classId = core.phase(phaseOfAttempt(attemptId))['classId'];
    return typeof classId === 'string' && core.classIds().includes(classId) && core.class(classId)['discipline'] === 'cross';
  };
  const isTeamBoat = (attemptId: string): boolean => {
    const entryId = known<{ entryId?: string }>(core.presented(attemptId)['entry'])?.entryId;
    return entryId !== undefined && core.entryIds().includes(entryId) && known<boolean>(core.entry(entryId)['isTeam']) === true;
  };
  /** The gate numbers of the Phase's course; undefined where the course is not configured. */
  const courseGates = (attemptId: string): number[] | undefined => {
    const courseId = known<string>(core.phase(phaseOfAttempt(attemptId))['courseId']);
    if (courseId === undefined || !core.courseIds().includes(courseId)) return undefined;
    return known<{ number: number }[]>(core.course(courseId)['gates'])?.map((g) => g.number);
  };
  const gateIssue = (attemptId: string, gate: unknown): { field: string; issue: string } | undefined => {
    const gates = courseGates(attemptId);
    if (gates === undefined) return { field: 'gate', issue: 'the Phase has no course configured' };
    return typeof gate === 'number' && gates.includes(gate) ? undefined : { field: 'gate', issue: 'is not a gate of the Phase\'s course' };
  };
  const guard = async (fn: () => Promise<RestReply>): Promise<RestReply> => {
    try { return (await enqueue(fn)) ?? gone(); } catch (e) {
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
    if (aid === undefined || wstore === undefined || event === undefined) return notFound(r);
    if (isCross(aid)) return notPossible('cross', 'penalty writes are not possible on a Kayak Cross Attempt');
    if (isTeamBoat(aid)) return notPossible('team-boat', 'a team boat is corrected in Canoe123');
    const issues: { field: string; issue: string }[] = [];
    if (key === undefined) issues.push({ field: 'Idempotency-Key', issue: 'missing' });
    const b = isObj(body) ? body : undefined;
    if (b === undefined) issues.push({ field: 'body', issue: 'must be an object' });
    else {
      if (typeof b['gate'] !== 'number' || !Number.isInteger(b['gate'])) issues.push({ field: 'gate', issue: 'must be an integer' });
      if (b['value'] !== 0 && b['value'] !== 2 && b['value'] !== 50) issues.push({ field: 'value', issue: 'must be 0, 2 or 50' });
    }
    if (issues.length > 0) return invalid(issues);
    const gate = (b as { gate: number }).gate;
    const value = (b as { value: number }).value;
    const outside = gateIssue(aid, gate);
    if (outside !== undefined) return invalid([outside]);
    if (core.oncourse().attemptIds.includes(aid)) return notPossible('run-not-closed', 'the Attempt is still on upstream\'s on-course list');
    const refusedConnection = notPossible('upstream-disconnected', 'there is no connected upstream instance to address the command to');
    const system = upstreamInstance === 'main' ? 'Main' : upstreamInstance === 'backup' ? 'Backup' : undefined;
    const source = tcp;
    if (tcpState !== 'connected' || system === undefined || source === undefined || !('write' in source) || (source as WritableSource).isWritable !== true) return refusedConnection;
    const run = runOf(aid);
    if (run === undefined) throw new Error(`internal: Attempt ${aid} presents no run`); // never a refusal (§7.3): the core presents one for every Attempt
    try {
      await (source as WritableSource).write(penaltyCorrectionCommand({ system, raceId: r.phaseId, bib: r.bib, gate, value }));
    } catch (e) {
      log('command write', e);
      return refusedConnection;
    }
    // the creating step (§2.9): the WriteRequest, the optimistic value and the push in one unit, durable before the 202
    const writeId = `w-${randomUUID()}`;
    adopted.add(writeId);
    await processUnit([{
      ingestSeq: 0, attemptId: aid, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: iso(),
      value: [{ number: gate, penalty: value }], confidence: 'authoritative', run, writeId,
    }], { key: key as string, writeId });
    return { status: 202, body: wstore.get(writeId) as J, location: `/api/writes/${writeId}` };
  }
  const inflight = new Map<string, Promise<RestReply>>();
  function penalty(r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply> {
    if (key === undefined) return guard(() => penaltyTask(r, undefined, body));
    const bound = wstore?.byWriteKey(key);
    if (bound !== undefined) return Promise.resolve({ status: 200, body: bound });
    const first = inflight.get(key);
    if (first !== undefined) return first.then((rep) => (rep.status === 202 ? { status: 200, ...(rep.body !== undefined ? { body: rep.body } : {}) } : rep));
    const p = guard(() => penaltyTask(r, key, body)).finally(() => { inflight.delete(key); });
    inflight.set(key, p);
    return p;
  }

  const currentOf = (aid: string): number => runOf(aid) ?? 1;
  const putCheck = (r: AttemptRoute, gateText: string, body: unknown): Promise<RestReply> => guard(async () => {
    const aid = attemptOf(r);
    if (aid === undefined) return notFound(r);
    if (isCross(aid)) return notPossible('cross', 'checks are not possible on a Kayak Cross Attempt');
    const issues: { field: string; issue: string }[] = [];
    const b = body === undefined ? {} : body;
    if (!isObj(b)) issues.push({ field: 'body', issue: 'must be an object' });
    else if (b['checkedBy'] !== undefined && typeof b['checkedBy'] !== 'string') issues.push({ field: 'checkedBy', issue: 'must be a string' });
    const gate = /^\d+$/.test(gateText) ? Number(gateText) : NaN;
    const outside = gateIssue(aid, gate);
    if (outside !== undefined) issues.push(outside);
    if (issues.length > 0) return invalid(issues);
    const cells = known<{ number: number; penalty: number | null }[]>(core.presented(aid)['gates']);
    const valueAtCheck = cells?.find((c) => c.number === gate)?.penalty ?? null;
    const checkedBy = (b as { checkedBy?: string }).checkedBy;
    return { status: 200, body: await doPutCheck({ attemptId: aid, run: currentOf(aid), gate, valueAtCheck, ...(checkedBy !== undefined ? { checkedBy } : {}) }) };
  });
  const deleteCheck = (r: AttemptRoute, gateText: string): Promise<RestReply> => guard(async () => {
    const aid = attemptOf(r);
    if (aid === undefined) return notFound(r);
    if (!/^\d+$/.test(gateText)) return invalid([{ field: 'gate', issue: 'must be an integer' }]);
    await doDeleteCheck({ attemptId: aid, run: currentOf(aid), gate: Number(gateText) });
    return { status: 204 };
  });
  const createFlag = (r: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply> => guard(async () => {
    const bound = key === undefined ? undefined : wstore?.flagByKey(key);
    const have = bound === undefined ? undefined : store?.list().flags.find((f) => f.flagId === bound);
    if (have !== undefined) return { status: 200, body: have as unknown as J };
    const aid = attemptOf(r);
    if (aid === undefined || wstore === undefined) return notFound(r);
    const issues: { field: string; issue: string }[] = [];
    if (key === undefined) issues.push({ field: 'Idempotency-Key', issue: 'missing' });
    if (!isObj(body)) issues.push({ field: 'body', issue: 'must be an object' });
    else {
      if (typeof body['gate'] !== 'number' || !Number.isInteger(body['gate'])) issues.push({ field: 'gate', issue: 'must be an integer' });
      if (typeof body['comment'] !== 'string') issues.push({ field: 'comment', issue: 'must be a string' });
      if (body['suggestedValue'] !== undefined && (typeof body['suggestedValue'] !== 'number' || !Number.isInteger(body['suggestedValue']))) issues.push({ field: 'suggestedValue', issue: 'must be an integer' });
      if (body['createdBy'] !== undefined && typeof body['createdBy'] !== 'string') issues.push({ field: 'createdBy', issue: 'must be a string' });
    }
    if (issues.length > 0) return invalid(issues);
    const b = body as { gate: number; comment: string; suggestedValue?: number; createdBy?: string };
    // The key and the flag live in two files: the key is bound first, to an id chosen ahead, and the flag is created under that id.
    // A kill between the two leaves a bound key with no flag; its retry creates the flag under the bound id, so there is never a second one.
    const flagId = bound ?? opts.newId?.() ?? `flag-${randomUUID()}`;
    if (bound === undefined) await wstore.bindFlag(key as string, flagId);
    const flag = await doCreateFlag({ attemptId: aid, run: currentOf(aid), gate: b.gate, comment: b.comment, ...(b.suggestedValue !== undefined ? { suggestedValue: b.suggestedValue } : {}), ...(b.createdBy !== undefined ? { createdBy: b.createdBy } : {}) }, flagId);
    return { status: 201, body: flag };
  });
  const resolveFlag = (flagId: string, body: unknown): Promise<RestReply> => guard(async () => ({ status: 200, body: await doResolveFlag(flagId, (body === undefined ? {} : body) as { note?: string; resolvedBy?: string }) }));

  // ------------------------------------------------------------------------------------------------ HTTP and /ws
  const api: OnsiteApi = {
    port: () => port,
    asOfSeq: () => seq.current(),
    event: () => event,
    core: () => core,
    sources: sourcesNow,
    checksOf: (phaseId) => {
      if (store === undefined) return { checks: [], flags: [] };
      const mine = (id: string): boolean => phaseOfAttempt(id) === phaseId;
      return {
        checks: ofExisting(withStatus(store) as (J & { attemptId: string })[]).filter((c) => mine(c.attemptId)),
        flags: ofExisting(store.list().flags).filter((f) => mine(f.attemptId)) as unknown as J[],
      };
    },
    rebaseline,
    penalty,
    writeOf: (id) => wstore?.get(id),
    putCheck,
    deleteCheck,
    createFlag,
    resolveFlag,
  };
  const server: Server = createServer(createApp(api));
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => { clients.delete(ws); });
    ws.on('error', () => { clients.delete(ws); });
    if (event !== undefined) background(async () => { if (event !== undefined) await emit([{ type: 'event.changed', event: onsiteEvent(event) }], ws); });
  });
  let port = 0;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? DEFAULT_PORT, () => { server.off('error', reject); resolve(); });
  });
  port = (server.address() as { port: number }).port;

  // ------------------------------------------------------------------------------------------------ the handle
  const closeSockets = (): void => {
    for (const c of clients) c.terminate();
    clients.clear();
    wss.close();
    server.close();
    server.closeAllConnections();
  };
  const haltSources = (): void => {
    clock.clearTimeout(beat);
    reader.stop();
    tcp?.stop();
    opts.discovery?.stop();
  };
  const needStore = (): ChecksStore => {
    if (store === undefined) throw Object.assign(new Error('no event is configured'), { code: 'event-not-found' });
    return store;
  };

  return {
    get port() { return port; },
    async stop() {
      if (stopping) return;
      stopping = true;
      haltSources();
      await tail;
      await seq.close();
      stepLog?.end();
      dead = true;
      closeSockets();
    },
    kill() {
      dead = true;
      stopping = true;
      haltSources();
      closeSockets();
    },
    startNewEvent: async (e) => {
      await enqueue(async () => {
        if (typeof e.eventId !== 'string' || e.eventId === '' || typeof e.name !== 'string') throw new ValidationError([{ field: 'event', issue: 'needs an eventId and a name' }]);
        if (event?.eventId === e.eventId) throw new ValidationError([{ field: 'eventId', issue: 'is the event that is already current' }]);
        const next = await storeFor(e.eventId);
        // §10 item 40 (a): a blank or whitespace-only name counts as none entered; `name` then awaits the snapshot's title.
        const entered = e.name.trim() !== '';
        event = { eventId: e.eventId, name: entered ? e.name : e.eventId, details: { state: 'not-yet' }, nameFrom: entered ? 'operator' : 'snapshot' };
        store = next;
        wstore = await writesFor(e.eventId);
        adopted.clear();
        core = newCore();
        tracker = newTracker();
        classesSent.clear();
        liveAttempts = new Set();
        seedCheckStatuses(next);
        stepLog?.reset();
        reader.stop();
        startReader();
        await emit([{ type: 'event.changed', event: onsiteEvent(event) }]);
      });
    },
    checks: {
      putCheck: async (input) => (await enqueue(() => doPutCheck(input))) as J,
      deleteCheck: async (key) => { await enqueue(() => doDeleteCheck(key)); },
      createFlag: async (input) => (await enqueue(() => doCreateFlag(input))) as J,
      resolveFlag: async (flagId, input) => (await enqueue(() => doResolveFlag(flagId, input))) as J,
    },
  };
}
