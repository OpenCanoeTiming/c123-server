/**
 * The one context object the parts of the on-site process share (#397). The parts read and write its fields at call time (`cx.event`,
 * `cx.core`, `cx.store`, ...), never a copy taken earlier, so every handler sees the same state.
 *
 * Also the log helpers and the queue and the push: one queue serialises everything that moves state or takes a `seq`; `emit` stamps and sends.
 */
import type { WebSocket } from 'ws';
import type { Clock, XmlFs, XmlReader, XmlReaderStatus } from '../ingest/index.js';
import type { ContextTracker } from '../ingest/context-tracker.js';
import type { IngestDiagnostic, MergeCore } from '../core/index.js';
import type { ChecksFs, ChecksStore } from '../store/checks.js';
import type { Source } from '../sources/types.js';
import type { SeqCounter } from './seq.js';
import type { StepLog } from './step-log.js';
import type { WritesStore } from './writes-store.js';
import type { CurrentEvent, J } from './wire.js';
import type { AdminLogEntry, OnsiteOptions } from './index.js';

/** CONSTRAINTS §1.3. */
export const DEFAULT_PORT = 27123;
/** `heartbeatSeconds` (CONTRACTS §7.2). */
export const HEARTBEAT_SECONDS = 10;

/** What exists before anything is opened: the options, the log helpers, the set-aside helpers and the per-event store maps. */
export interface OnsiteBase {
  readonly opts: OnsiteOptions;
  readonly clock: Clock;
  readonly fs: ChecksFs & XmlFs;
  readonly dataDir: string;
  /** `dataDir` with a trailing separator. */
  readonly base: string;
  iso(): string;
  toFile(text: string): void;
  log(what: string, e: unknown): void;
  adminLog(en: AdminLogEntry | IngestDiagnostic): void;
  /** A set-aside name for `file` that nothing has in the directory: an earlier set-aside is never overwritten. */
  setAsideName(file: string): Promise<string>;
  report(store: AdminLogEntry['store'], file: string, setAsideAs: string, reason: string, eventId?: string): void;
  /** #273 N2: one store instance per event, ever. A return to an earlier event gets the instance it had. */
  readonly stores: Map<string, ChecksStore>;
  /** The write requests and idempotency keys, one durable file per event (`writes-store.ts`). */
  readonly writeStores: Map<string, WritesStore>;
}

export interface OnsiteContext extends OnsiteBase {
  dead: boolean;
  stopping: boolean;
  readonly seq: SeqCounter;

  // event, core, checks store
  event: CurrentEvent | undefined;
  core: MergeCore;
  tracker: ContextTracker;
  /** Classes whose creating message went out, and the last status pushed per check. Both belong to the event. */
  readonly classesSent: Set<string>;
  readonly checkStatuses: Map<string, string>;
  /** §10 item 38 (m): Attempt ids live after the last unit, to tell a creating unit (a return, or the first ever) from an ordinary update. Belongs to the event. */
  liveAttempts: Set<string>;
  store: ChecksStore | undefined;
  wstore: WritesStore | undefined;
  /** Writes the core holds in this lifetime (created here or re-adopted). */
  readonly adopted: Set<string>;

  // the queue and the push
  tail: Promise<unknown>;
  readonly clients: Set<WebSocket>;

  // sources
  tcp: Source | undefined;
  tcpState: 'connected' | 'reconnecting';
  upstreamInstance: 'main' | 'backup' | 'offline' | null;
  timingClockOffsetSeconds: number | null;
  xmlStatus: XmlReaderStatus;
  sourcesSent: string;
  /** Set by `startReader` before anything reads it. */
  reader: XmlReader;
  beat: unknown;

  stepLog: (StepLog & { reset(): void }) | undefined;
  port: number;
}

export function createBase(opts: OnsiteOptions): OnsiteBase {
  const { clock, fs, dataDir } = opts;
  const iso = (): string => new Date(clock.now()).toISOString();
  const toFile = (text: string): void => { opts.logFile?.write(text); };
  const log = (what: string, e: unknown): void => {
    const text = `${what}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`;
    console.error(`onsite: ${text}`);
    toFile(text);
  };

  const base = dataDir.endsWith('/') || dataDir.endsWith('\\') ? dataDir : `${dataDir}/`;
  const adminLine = (en: AdminLogEntry | IngestDiagnostic): string => {
    if (en.kind === 'store-set-aside') return `${en.kind} store=${en.store}${en.eventId !== undefined ? ` event=${en.eventId}` : ''} file=${en.file} setAsideAs=${en.setAsideAs} reason=${en.reason}`;
    if (en.kind === 'store-write-failed') return `${en.kind} store=${en.store} file=${en.file} reason=${en.reason}`;
    if (en.kind === 'xml-table-emptied') return `${en.kind} phase=${en.phaseId} count=${en.count}`;
    // #367: every other ingest-only kind (`unparseable-field`, `gates-absent`, ...), whatever fields it carries
    return `${en.kind} ${JSON.stringify(en)}`;
  };
  const sink = opts.adminLog ?? ((en: AdminLogEntry | IngestDiagnostic): void => { console.error(`onsite: ${adminLine(en)}`); });
  const adminLog = (en: AdminLogEntry | IngestDiagnostic): void => { toFile(adminLine(en)); sink(en); };
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
  return {
    opts, clock, fs, dataDir, base, iso, toFile, log, adminLog, setAsideName, report,
    stores: new Map<string, ChecksStore>(),
    writeStores: new Map<string, WritesStore>(),
  };
}

// ------------------------------------------------------------------------------------------------ the queue and the push
export function enqueue<T>(cx: OnsiteContext, task: () => Promise<T> | T): Promise<T | undefined> {
  const run = cx.tail.then(() => (cx.dead ? undefined : task()));
  cx.tail = run.catch((e: unknown) => { cx.log('task failed', e); });
  return run;
}
export const background = (cx: OnsiteContext, task: () => Promise<unknown> | unknown): void => { void enqueue(cx, task).catch((e: unknown) => { cx.log('task failed', e); }); };

/** Stamps the batch from the one counter, after the persisted mark covers it, and sends it to `only` or to every client. */
export async function emit(cx: OnsiteContext, payloads: J[], only?: WebSocket): Promise<J[]> {
  if (payloads.length === 0) return [];
  await cx.seq.reserve(payloads.length);
  if (cx.dead) return [];
  const stamped = payloads.map((p) => ({ seq: cx.seq.next(), ...p }));
  for (const m of stamped) {
    const text = JSON.stringify(m);
    for (const c of only === undefined ? cx.clients : [only]) if (c.readyState === c.OPEN) c.send(text);
  }
  return stamped;
}
