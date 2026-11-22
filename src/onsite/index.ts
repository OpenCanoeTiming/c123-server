/**
 * The on-site process (#210; CONTRACTS §1.6, §7.1, §7.2, §2.10; CONSTRAINTS §1.3): the production pieces behind REST and `/ws` on one port.
 * TCP messages and XML snapshots become ingest units (the parsers, `createXmlReader`), units go through one merge core, and what the core
 * says is stamped from one `seq` counter and pushed. The legacy server (`src/server.ts`, `src/unified`, `src/ws`) is not touched.
 *
 * One queue serialises everything that moves state or takes a `seq`: a unit is merged whole, then its messages are stamped and sent.
 * The core never sees a clock, a `seq` or an event id; this process stamps ingest times (the injected clock), `seq` and `eventId`.
 *
 * #397: the parts share one context object (`context.ts`): event state and stores (`event-state.ts`), the unit pipeline (`units.ts`),
 * sources (`sources.ts`), re-baseline (`rebaseline.ts`), REST handlers (`rest.ts`), HTTP and `/ws` (`http.ts`). This file wires them.
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { Clock, XmlFs } from '../ingest/index.js';
import type { IngestDiagnostic } from '../core/index.js';
import type { ChecksFs } from '../store/checks.js';
import type { Source } from '../sources/types.js';
import type { LogFile } from './log-file.js';
import { openSeq, type SeqCounter } from './seq.js';
import { createStepLog } from './step-log.js';
import { ValidationError } from './validate.js';
import { onsiteEvent, type CurrentEvent, type J } from './wire.js';
import { createBase, emit, enqueue, type OnsiteContext } from './context.js';
import { bootEvent, newCore, newTracker, seedCheckStatuses, storeFor, writeEventFile, writesFor } from './event-state.js';
import { unit } from './units.js';
import { arm, startReader, startTcp } from './sources.js';
import { createRest, doCreateFlag, doDeleteCheck, doPutCheck, doResolveFlag } from './rest.js';
import { startHttp } from './http.js';

export { DEFAULT_PORT, HEARTBEAT_SECONDS } from './context.js';

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
  store: 'checks' | 'writes' | 'seq' | 'event' | 'clients';
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
  /**
   * #330: the process owns its current event in `event.json` of the data dir. At boot without `eventId` it reopens the persisted one, or mints
   * and persists a new opaque id; an `eventId` given is persisted as current; an entered name is persisted with it. Off: no persistence, and
   * without `eventId` no event at all (the tests' default). `main.ts` always sets it.
   */
  persistEvent?: boolean;
  xml?: { path: string; pollSeconds?: number };
  tcp?: { source: Source } | { host?: string; port?: number; create?: (host: string, port: number) => Source };
  discovery?: OnsiteDiscovery | null;
  zone?: string;
  eventDate?: string;
  externalIdScheme?: string;
  newId?: () => string;
  stepLog?: (line: string) => void;
  /** #395: the log file (`main.ts` opens it in the data dir). Every admin log entry, source connect and disconnect, start and stop go to it. */
  logFile?: LogFile;
}

export interface OnsiteHandle {
  port: number;
  stop(): Promise<void>;
  kill(): void;
  /** Without `eventId` a new one is minted; one given that was current before is the return to it. */
  startNewEvent(e: { eventId?: string; name: string }): Promise<void>;
  checks: {
    putCheck(i: { attemptId: string; run: number; gate: number; valueAtCheck: number | null; checkedBy?: string }): Promise<J>;
    deleteCheck(k: { attemptId: string; run: number; gate: number }): Promise<void>;
    createFlag(i: { attemptId: string; run: number; gate: number; comment: string; suggestedValue?: number; createdBy?: string }): Promise<J>;
    resolveFlag(flagId: string, i: { note?: string; resolvedBy?: string }): Promise<J>;
  };
}

export async function startOnsite(opts: OnsiteOptions): Promise<OnsiteHandle> {
  const b = createBase(opts);
  const { clock, fs, dataDir } = b;

  /**
   * An invalid seq file is copied aside, not renamed: it stays at its name until `openSeq` replaces it with a valid mark (§1.6 with
   * §2.10's discipline), so a crash in between leaves the invalid file and the next start recovers again, never at zero.
   */
  const seq: SeqCounter = await openSeq(fs, dataDir, {
    floor: () => clock.now(),
    keep: async (path, content, reason) => {
      const setAsideAs = await b.setAsideName(path);
      await fs.writeFile(setAsideAs, content);
      b.report('seq', path, setAsideAs, reason);
    },
  });

  // ------------------------------------------------------------------------------------------------ event, core, checks store
  const event: CurrentEvent | undefined = await bootEvent(b);
  const core = newCore(opts);
  const tracker = newTracker(opts);
  const store = event === undefined ? undefined : await storeFor(b, event.eventId);
  const wstore = event === undefined ? undefined : await writesFor(b, event.eventId);
  const cx: OnsiteContext = {
    ...b,
    dead: false,
    stopping: false,
    seq,
    event,
    core,
    tracker,
    classesSent: new Set<string>(),
    checkStatuses: new Map<string, string>(),
    liveAttempts: new Set<string>(),
    store,
    wstore,
    adopted: new Set<string>(),
    tail: Promise.resolve(),
    clients: new Set(),
    tcp: undefined,
    tcpState: 'reconnecting',
    upstreamInstance: null,
    timingClockOffsetSeconds: null,
    xmlStatus: { state: opts.xml === undefined ? 'not-configured' : 'reconnecting', lastRewriteDetectedAt: null, tornReads: 0, abandonedReads: 0 },
    sourcesSent: '',
    reader: undefined as unknown as OnsiteContext['reader'], // set by startReader below, before anything reads it
    beat: undefined,
    stepLog: undefined,
    port: 0,
  };
  if (cx.store !== undefined) seedCheckStatuses(cx, cx.store);

  // ------------------------------------------------------------------------------------------------ units and sources
  cx.stepLog = opts.stepLog === undefined ? undefined : createStepLog(opts.stepLog, () => cx.core, seq.current());
  const onUnit = (elements: Parameters<typeof unit>[1]): void => { unit(cx, elements); };
  startTcp(cx, onUnit);
  startReader(cx, onUnit);
  arm(cx);

  // ------------------------------------------------------------------------------------------------ HTTP and /ws
  const closeSockets = await startHttp(cx, createRest(cx));

  // ------------------------------------------------------------------------------------------------ the handle
  const haltSources = (): void => {
    clock.clearTimeout(cx.beat);
    cx.reader.stop();
    cx.tcp?.stop();
    opts.discovery?.stop();
  };

  return {
    get port() { return cx.port; },
    async stop() {
      if (cx.stopping) return;
      cx.stopping = true;
      cx.toFile('stop');
      haltSources();
      await cx.tail;
      await seq.close();
      cx.stepLog?.end();
      cx.dead = true;
      closeSockets();
    },
    kill() {
      cx.dead = true;
      cx.stopping = true;
      haltSources();
      closeSockets();
    },
    startNewEvent: async (e) => {
      await enqueue(cx, async () => {
        if ((e.eventId !== undefined && (typeof e.eventId !== 'string' || e.eventId === '')) || typeof e.name !== 'string') throw new ValidationError([{ field: 'event', issue: 'needs a name, and an eventId that is non-empty when given' }]);
        const eventId = e.eventId ?? randomUUID();
        if (cx.event?.eventId === eventId) throw new ValidationError([{ field: 'eventId', issue: 'is the event that is already current' }]);
        const next = await storeFor(cx, eventId);
        // §10 item 40 (a): a blank or whitespace-only name counts as none entered; `name` then awaits the snapshot's title.
        const entered = e.name.trim() !== '';
        if (opts.persistEvent === true) await writeEventFile(cx, eventId, entered ? e.name : undefined);
        cx.event = { eventId, name: entered ? e.name : eventId, details: { state: 'not-yet' }, nameFrom: entered ? 'operator' : 'snapshot' };
        cx.store = next;
        cx.wstore = await writesFor(cx, eventId);
        cx.adopted.clear();
        cx.core = newCore(opts);
        cx.tracker = newTracker(opts);
        cx.classesSent.clear();
        cx.liveAttempts = new Set();
        seedCheckStatuses(cx, next);
        cx.stepLog?.reset();
        cx.reader.stop();
        startReader(cx, onUnit);
        await emit(cx, [{ type: 'event.changed', event: onsiteEvent(cx.event) }]);
      });
    },
    checks: {
      putCheck: async (input) => (await enqueue(cx, () => doPutCheck(cx, input))) as J,
      deleteCheck: async (key) => { await enqueue(cx, () => doDeleteCheck(cx, key)); },
      createFlag: async (input) => (await enqueue(cx, () => doCreateFlag(cx, input))) as J,
      resolveFlag: async (flagId, input) => (await enqueue(cx, () => doResolveFlag(cx, flagId, input))) as J,
    },
  };
}
