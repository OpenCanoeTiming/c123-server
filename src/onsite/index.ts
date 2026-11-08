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
import { WebSocketServer, type WebSocket } from 'ws';
import { XMLValidator } from 'fast-xml-parser';
import { createXmlReader, parseTcp, parseXmlSnapshot, type Clock, type IngestContext, type IngestElement, type XmlFs, type XmlReader, type XmlReaderStatus } from '../ingest/index.js';
import { createContextTracker, type ContextTracker } from '../ingest/context-tracker.js';
import { createMergeCore, type MergeCore } from '../core/index.js';
import { openChecksStore, type ChecksFs, type ChecksStore } from '../store/checks.js';
import { TcpSource } from '../sources/TcpSource.js';
import type { Source } from '../sources/types.js';
import { createApp, type OnsiteApi, type RebaselineOutcome, type RebaselineScope } from './app.js';
import { openSeq, type SeqCounter } from './seq.js';
import { createStepLog, type StepLog } from './step-log.js';
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

export interface OnsiteOptions {
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

  const seq: SeqCounter = await openSeq(fs, dataDir);

  // ------------------------------------------------------------------------------------------------ event, core, checks store
  let event: CurrentEvent | undefined = opts.eventId === undefined ? undefined : { eventId: opts.eventId, name: opts.eventName ?? opts.eventId };
  const newCore = (): MergeCore => createMergeCore({ ...(opts.zone !== undefined ? { zone: opts.zone } : { zone: 'Europe/Prague' }), xmlConfigured: opts.xml !== undefined });
  let core = newCore();
  let tracker: ContextTracker = newTracker();
  function newTracker(): ContextTracker { return createContextTracker(opts.zone ?? 'Europe/Prague', opts.eventDate, opts.externalIdScheme ?? 'on-site'); }
  /** Classes whose creating message went out, and the last status pushed per check. Both belong to the event. */
  const classesSent = new Set<string>();
  const checkStatuses = new Map<string, string>();

  /** #273 N2: one store instance per event, ever. A return to an earlier event gets the instance it had. */
  const stores = new Map<string, ChecksStore>();
  async function storeFor(eventId: string): Promise<ChecksStore> {
    const have = stores.get(eventId);
    if (have !== undefined) return have;
    const store = await openChecksStore({ fs, dir: dataDir, eventId, clock, ...(opts.newId !== undefined ? { newId: opts.newId } : {}) });
    stores.set(eventId, store);
    return store;
  }
  let store: ChecksStore | undefined = event === undefined ? undefined : await storeFor(event.eventId);
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
  /** §7.2: `check.updated` for every check whose derived `status` differs from the one last pushed. */
  function checkStatusChanges(): J[] {
    if (store === undefined) return [];
    const out: J[] = [];
    for (const c of withStatus(store)) {
      const k = keyOf(c as { attemptId: string; run: number; gate: number });
      if (checkStatuses.get(k) === c['status']) continue;
      checkStatuses.set(k, c['status'] as string);
      out.push({ type: 'check.updated', attemptId: c['attemptId'], run: c['run'], gate: c['gate'], check: c });
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------------ units
  const stepLog: (StepLog & { reset(): void }) | undefined = opts.stepLog === undefined ? undefined : createStepLog(opts.stepLog, () => core, seq.current());

  /** One ingest unit: merged whole, then stamped and pushed (§1.6). */
  async function processUnit(elements: IngestElement[]): Promise<void> {
    for (const el of elements) {
      const status = el['sourceStatus'] as { tcp?: { upstreamInstance?: unknown; timingClockOffsetSeconds?: unknown } } | undefined;
      if (status?.tcp === undefined) continue;
      upstreamInstance = instanceOf(status.tcp.upstreamInstance);
      if (typeof status.tcp.timingClockOffsetSeconds === 'number') timingClockOffsetSeconds = Math.round(status.tcp.timingClockOffsetSeconds);
    }
    const derived = core.applyUnit(elements);
    const wire = core.drainNotifications().map((m) => toWire(m, event?.eventId ?? '', classesSent));
    const state = [...wire, ...checkStatusChanges()];
    const sent = await emit([...state, ...sourcesChange()]);
    const unitMessages = sent.filter((m) => m['type'] !== 'sources.updated');
    stepLog?.step([...elements, ...derived], unitMessages);
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
      return { checks: withStatus(store).filter((c) => mine(c['attemptId'] as string)), flags: store.list().flags.filter((f) => mine(f.attemptId)) as unknown as J[] };
    },
    rebaseline,
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
        event = { eventId: e.eventId, name: e.name };
        store = next;
        core = newCore();
        tracker = newTracker();
        classesSent.clear();
        seedCheckStatuses(next);
        stepLog?.reset();
        reader.stop();
        startReader();
        await emit([{ type: 'event.changed', event: onsiteEvent(event) }]);
      });
    },
    checks: {
      putCheck: async (input) => (await enqueue(async () => {
        const i = checkInput(input);
        const s = needStore();
        await s.putCheck(i);
        const check = withStatus(s).find((c) => keyOf(c as { attemptId: string; run: number; gate: number }) === keyOf(i)) as J;
        checkStatuses.set(keyOf(i), check['status'] as string);
        await emit([{ type: 'check.updated', attemptId: i.attemptId, run: i.run, gate: i.gate, check }]);
        return JSON.parse(JSON.stringify(check)) as J;
      })) as J,
      deleteCheck: async (key) => {
        await enqueue(async () => {
          const k = checkKeyInput(key);
          const s = needStore();
          const existed = s.list().checks.some((c) => keyOf(c) === keyOf(k));
          await s.deleteCheck(k);
          if (!existed) return;
          checkStatuses.delete(keyOf(k));
          await emit([{ type: 'check.updated', attemptId: k.attemptId, run: k.run, gate: k.gate, check: null }]);
        });
      },
      createFlag: async (input) => (await enqueue(async () => {
        const i = flagInput(input);
        const flag = await needStore().createFlag(i);
        await emit([{ type: 'flag.updated', flag }]);
        return flag as unknown as J;
      })) as J,
      resolveFlag: async (flagId, input) => (await enqueue(async () => {
        const i = resolutionInput(flagId, input);
        const s = needStore();
        const was = s.list().flags.find((f) => f.flagId === flagId);
        const flag = await s.resolveFlag(flagId, i);
        if (was?.resolution === undefined) await emit([{ type: 'flag.updated', flag }]);
        return flag as unknown as J;
      })) as J,
    },
  };
}
