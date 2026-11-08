/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Harness for the #210 on-site process tests (CONTRACTS §1.6, §7.1, §7.2; TEST-ARCHITECTURE §3.2, §5; CONSTRAINTS §1.3).
 * No shared state: every `boot()` builds a fresh clock, filesystem, TCP source and process. No real clock: the process
 * reads time only through the injected `Clock`, which a test moves by hand. The HTTP and WebSocket sockets are real
 * (loopback, ephemeral port); the only waiting a test does is on a condition or on a ping/pong barrier, never on a duration.
 *
 * THE INTERFACE THE IMPLEMENTER MUST MEET (the tests are written against exactly this; a name here is a name there)
 * ------------------------------------------------------------------------------------------------------------------
 * Module `src/onsite/index.ts` exports
 *
 *   export const DEFAULT_PORT = 27123                                    // CONSTRAINTS §1.3
 *   export function startOnsite(opts: OnsiteOptions): Promise<OnsiteHandle>   // resolves once HTTP and /ws accept connections
 *
 *   OnsiteOptions = {
 *     port?: number                       // default DEFAULT_PORT; 0 = an ephemeral port (the tests' choice); HTTP, /ws and the admin page share it
 *     clock: Clock                        // src/ingest/xml-reader.ts `Clock`: the ONLY source of time. Ingest stamps (`observedAt`, `asOf`),
 *                                         // the XML poll timer, the 10 s heartbeat and the re-baseline's own read all use it
 *     fs: ChecksFs & XmlFs                // one injected filesystem: the checks store, the `seq` high-water file and the XML snapshot
 *                                         // (`stat` gives the modification time `snapshotWrittenAt` reports)
 *     dataDir: string                     // where the process keeps its durable files (checks per event, the `seq` high-water mark)
 *     eventId?: string; eventName?: string   // the configured event (§2.2: asserted, never discovered). Absent: no event configured,
 *                                         // `GET /api/events/current` is `404 event-not-found`
 *     xml?: { path: string; pollSeconds?: number }   // the snapshot file; absent: `xml.state` is `not-configured`
 *     tcp?: { source: Source }                        // a ready source (tests: `fakeTcp()`), or
 *         | { host?: string; port?: number; create?: (host: string, port: number) => Source }   // a host (default port 27333) to build one for;
 *                                         // without `host` the TCP host comes from `discovery`
 *     discovery?: DiscoveryLike | null    // the UDP listener of Canoe123's broadcast (src/sources/UdpDiscovery.ts shape); null: none
 *     zone?: string; eventDate?: string; externalIdScheme?: string   // the parser context (scripts/lib/ingest-context.ts): venue IANA zone,
 *                                         // the event's date, the scheme of `ExternalId` (defaults: 'Europe/Prague', none, 'on-site')
 *     newId?: () => string                // flag ids, as the checks store's `newId`
 *     stepLog?: (line: string) => void    // TEST-ARCHITECTURE §3.2 step log, one JSON line at a time (row 15); absent: nothing is written
 *   }
 *   OnsiteHandle = {
 *     port: number                        // the bound port
 *     stop(): Promise<void>               // graceful: stops sources, flushes durable state, closes the sockets
 *     kill(): void                        // a process kill: closes sockets, writes NOTHING more, awaits nothing
 *     startNewEvent(e: { eventId: string; name: string }): Promise<void>   // the explicit "start a new event" action (Scenario E); the contract
 *                                         // names no REST path for it, so the test drives it here; broadcasts `event.changed`
 *     checks: {                           // the wired checks store of the CURRENT event (#273 N2: exactly one instance per event); every write
 *                                         // is validated first, durable, then pushed as `check.updated` / `flag.updated`. #212's REST handlers call these.
 *       putCheck(i: { attemptId: string; run: number; gate: number; valueAtCheck: number | null; checkedBy?: string }): Promise<GateCheck>   // `status` derived
 *       deleteCheck(k: { attemptId: string; run: number; gate: number }): Promise<void>                                                      // pushes `check: null`
 *       createFlag(i: { attemptId: string; run: number; gate: number; comment: string; suggestedValue?: number; createdBy?: string }): Promise<GateFlag>
 *       resolveFlag(flagId: string, i: { note?: string; resolvedBy?: string }): Promise<GateFlag>
 *     }
 *     // A refused (malformed) input rejects with `{ code: 'validation-failed' }` BEFORE the store is touched: no file operation, no message.
 *   }
 *
 *   Entry point `src/onsite/main.ts` (what `npm run onsite` runs; the T4 tests spawn it as `node --import tsx src/onsite/main.ts <flags>`):
 *     --port <n> --data-dir <dir> --event-id <id> [--event-name <s>] --tcp-host <h> [--tcp-port <n>] --xml <path> [--xml-poll-seconds <s>]
 *     [--zone <iana>] [--event-date <YYYY-MM-DD>] [--external-id-scheme <s>] [--step-log <file>] [--no-discovery]
 *   It prints the line `listening <port>` on stdout once HTTP accepts connections, and on SIGTERM stops gracefully (closing the step log with
 *   `{"end":{"steps":n}}`) and exits 0. The step log is replay-direct.ts's format (its header): `{"hydration":...}`, one `{i,elements,deltas,stateHash}`
 *   per ingest unit, `{"end":...}`; `elements` are the unit's in ingest order, `deltas` the §7.2 messages the unit produced.
 *
 * The core (`createMergeCore`) stays pure and gains READ-ONLY views, nothing else, for hydration (every resource of the event):
 *   phaseIds(): string[]   entryIds(): string[]   classIds(): string[]   courseIds(): string[]   standings(): Standing[]   (existing: phase(id), entry(id), presented(id), attempts(),
 *   oncourse(), diagnostics()). The process stamps `seq` and the Class/Course `eventId`; the core never sees either.
 *
 * Feeding units (what a test does, and so what the process must accept):
 *   TCP: `tcp.send(text)` on the injected source (event 'message', the text as `TcpSource` emits it) and `tcp.connect()` / `tcp.disconnect()` ('status').
 *   XML: the file is put on the injected fs with a modification time; the clock moves forward; the reader's poll finds it (createXmlReader).
 *   One message, one snapshot, one connection event, one re-baseline with its re-read is one unit (§1.6).
 * Barrier: `client.barrier()` sends a WebSocket ping and waits for the pong; the server answers in order, so every message it sent before is received.
 */
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { fakeChecksFs } from '../../store/__tests__/checks-harness.js';
import { flush } from './model.js';
import type { Clock } from '../../ingest/xml-reader.js';
import type { Source, SourceStatus as ConnStatus } from '../../sources/types.js';
// The module under test. A missing module is the expected red until #210 lands.
import { startOnsite, type OnsiteHandle, type OnsiteOptions } from '../index.js';

export { flush };
export * from './model.js';
import { type J } from './model.js';
export const DAY = 24 * 3600 * 1000;
export const iso = (ms: number): string => new Date(ms).toISOString();

// ---------------------------------------------------------------------------------------------------- virtual clock

export interface VClock extends Clock {
  /** Moves time forward without firing any timer (a recording's gaps are hours; a heartbeat per ten seconds of them is noise). */
  jump(ms: number): void;
  /** Moves time forward by `ms`, firing every timer that falls due, in order, each at its own instant, letting promises settle after each. */
  advance(ms: number): Promise<void>;
}
export function virtualClock(start: number): VClock {
  let t = start;
  let n = 0;
  const timers = new Map<number, { due: number; fn: () => void }>();
  const clock: VClock = {
    now: () => t,
    setTimeout: (fn, ms) => { const id = ++n; timers.set(id, { due: t + Math.max(0, ms), fn }); return id; },
    clearTimeout: (h) => { timers.delete(h as number); },
    requestFrame: (fn) => clock.setTimeout(() => { fn(t); }, 16),
    cancelFrame: (h) => { timers.delete(h as number); },
    jump: (ms) => { if (ms > t) t = ms; },
    advance: async (ms) => {
      const target = t + ms;
      for (;;) {
        let next: [number, { due: number; fn: () => void }] | undefined;
        for (const e of timers) if (e[1].due <= target && (next === undefined || e[1].due < next[1].due)) next = e;
        if (next === undefined) break;
        timers.delete(next[0]);
        if (next[1].due > t) t = next[1].due;
        next[1].fn();
        await flush();
      }
      if (target > t) t = target;
      await flush();
    },
  };
  return clock;
}

// ---------------------------------------------------------------------------------------------------- filesystem

function makeFs(initial: Record<string, string>, mtimes: Map<string, number>) {
  const base = fakeChecksFs(initial);
  const enoent = (p: string): Error => Object.assign(new Error(`ENOENT ${p}`), { code: 'ENOENT' });
  const fs = {
    ...base.fs,
    async stat(path: string) {
      const c = base.files.get(path);
      if (c === undefined) throw enoent(path);
      return { mtimeMs: mtimes.get(path) ?? 0, size: c.length };
    },
    async read(path: string) {
      const c = base.files.get(path);
      if (c === undefined) throw enoent(path);
      return c;
    },
  };
  return {
    ...base,
    fs,
    /** A file as Canoe123 leaves it (a copy over the file, not a rename): content and modification time. */
    put(path: string, text: string, mtimeMs: number): void { base.files.set(path, text); mtimes.set(path, mtimeMs); },
    remove(path: string): void { base.files.delete(path); },
    setMtime(path: string, ms: number): void { mtimes.set(path, ms); },
  };
}
export type FakeOnsiteFs = ReturnType<typeof makeFs> & {
  /** What a restart finds after a kill: the durable files only (every completed rename), on a fresh filesystem. */
  afterKill(): FakeOnsiteFs;
};
export function fakeOnsiteFs(initial: Record<string, string> = {}): FakeOnsiteFs {
  const mtimes = new Map<string, number>();
  const made = makeFs(initial, mtimes);
  return { ...made, afterKill: () => { const copy = fakeOnsiteFs(Object.fromEntries(made.files)); for (const [p, m] of mtimes) copy.setMtime(p, m); return copy; } };
}

// ---------------------------------------------------------------------------------------------------- sources

export interface FakeTcp extends Source {
  started: number;
  stopped: number;
  send(text: string): void;
  connect(): void;
  disconnect(): void;
}
export function fakeTcp(): FakeTcp {
  const e = new EventEmitter() as unknown as FakeTcp;
  let status: ConnStatus = 'disconnected';
  Object.defineProperty(e, 'status', { get: () => status });
  e.started = 0;
  e.stopped = 0;
  e.start = () => { e.started++; };
  e.stop = () => { e.stopped++; status = 'disconnected'; };
  e.send = (text) => { e.emit('message', text); };
  e.connect = () => { status = 'connected'; e.emit('status', 'connected'); };
  e.disconnect = () => { status = 'disconnected'; e.emit('status', 'disconnected'); };
  return e;
}

export interface DiscoveryLike extends EventEmitter {
  started: number; resets: number;
  start(): Promise<void>; stop(): void; reset(): void;
  getDiscoveredHost(): string | null; isListening(): boolean;
}
export function fakeDiscovery(): DiscoveryLike {
  const e = new EventEmitter() as DiscoveryLike;
  let host: string | null = null;
  e.started = 0;
  e.resets = 0;
  e.start = async () => { e.started++; };
  e.stop = () => {};
  e.reset = () => { e.resets++; host = null; };
  e.getDiscoveredHost = () => host;
  e.isListening = () => e.started > 0;
  e.on('discovered', (h: string) => { host = h; });
  return e;
}

// ---------------------------------------------------------------------------------------------------- the booted process

export const DATA_DIR = '/data/onsite';
export const XML_PATH = '/data/c123.xml';
export const POLL_S = 5;

export interface Env {
  h: OnsiteHandle;
  clock: VClock;
  fs: FakeOnsiteFs;
  tcp: FakeTcp;
  opts: OnsiteOptions;
  /** Every WebSocket client this env opened; closed by `disposeAll`. */
  clients: WsClient[];
}
const live: Env[] = [];

export interface BootOptions extends Partial<Omit<OnsiteOptions, 'clock' | 'fs'>> {
  startAt: string;
  clock?: VClock;
  fs?: FakeOnsiteFs;
  /** Connect the fake TCP source before returning (default true). */
  connected?: boolean;
}
export async function boot(o: BootOptions): Promise<Env> {
  const clock = o.clock ?? virtualClock(Date.parse(o.startAt));
  const fs = o.fs ?? fakeOnsiteFs();
  const tcp = o.tcp !== undefined && 'source' in o.tcp ? (o.tcp.source as FakeTcp) : fakeTcp();
  let n = 0;
  const { startAt: _s, clock: _c, fs: _f, connected, ...rest } = o;
  const opts: OnsiteOptions = {
    port: 0,
    dataDir: DATA_DIR,
    eventId: 'ev-1',
    eventName: 'Test Event',
    xml: { path: XML_PATH, pollSeconds: POLL_S },
    tcp: { source: tcp },
    discovery: null,
    zone: 'Europe/Prague',
    externalIdScheme: 'on-site',
    newId: () => `flag-${++n}`,
    ...rest,
    clock,
    fs: fs.fs,
  };
  const h = await startOnsite(opts);
  const env: Env = { h, clock, fs, tcp, opts, clients: [] };
  live.push(env);
  if (connected !== false && opts.tcp !== undefined && 'source' in opts.tcp) tcp.connect();
  await flush();
  return env;
}
export async function disposeAll(): Promise<void> {
  for (const env of live.splice(0)) {
    for (const c of env.clients) c.close();
    try { env.h.kill(); } catch { /* already gone */ }
  }
}

/** One TCP message, received at the recorded instant (the process stamps `observedAt` from the clock, so the clock is put there first). */
export async function feedTcp(env: Env, rec: { observedAt: string; data: string }): Promise<void> {
  env.clock.jump(Date.parse(rec.observedAt));
  env.tcp.send(rec.data);
  await flush();
}
/** One XML snapshot: the file appears with its modification time, time moves to the recorded instant and past one poll, the reader delivers it. */
export async function feedXml(env: Env, rec: { observedAt: string; data: string }, path = XML_PATH): Promise<void> {
  const at = Date.parse(rec.observedAt);
  env.fs.put(path, rec.data, at);
  env.clock.jump(at);
  await env.clock.advance((env.opts.xml?.pollSeconds ?? POLL_S) * 1000);
}
/** A recorded record, received later or with its text edited: the only way a derived (not recorded) case is built. */
export const derived = (r: { observedAt: string; data: string }, over: { observedAt?: string; edit?: (d: string) => string }): { observedAt: string; data: string } => ({
  observedAt: over.observedAt ?? r.observedAt,
  data: over.edit ? over.edit(r.data) : r.data,
});
export const EMPTY_ONCOURSE = '<Canoe123 System="Main"><OnCourse Total="0" Position="0" /></Canoe123>';

// ---------------------------------------------------------------------------------------------------- WebSocket client

export interface WsClient {
  messages: J[];
  /** Resolves when `pred` holds for some message received so far or later; rejects after `ms` of real time (a bound, not a pacing). */
  until(pred: (m: J) => boolean, ms?: number): Promise<J>;
  /** Everything the server sent before this call has been received when it resolves. */
  barrier(): Promise<void>;
  /** The messages received since the last `take`. */
  take(): J[];
  close(): void;
}
export async function openWs(env: Env | { h: { port: number }; clients?: WsClient[] }): Promise<WsClient> {
  const ws = new WebSocket(`ws://127.0.0.1:${env.h.port}/ws`);
  const messages: J[] = [];
  let taken = 0;
  const waiters: Array<() => void> = [];
  ws.on('message', (d) => { messages.push(JSON.parse(d.toString())); for (const w of [...waiters]) w(); });
  await new Promise<void>((res, rej) => { ws.once('open', () => { res(); }); ws.once('error', rej); });
  const client: WsClient = {
    messages,
    until: (pred, ms = 5000) => new Promise<J>((res, rej) => {
      const check = (): boolean => { const m = messages.find(pred); if (m !== undefined) { res(m); return true; } return false; };
      if (check()) return;
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); rej(new Error(`no matching message within ${ms} ms; got ${messages.map((m) => m['type']).join(',')}`)); }, ms);
      const w = (): void => { if (check()) { clearTimeout(timer); waiters.splice(waiters.indexOf(w), 1); } };
      waiters.push(w);
    }),
    barrier: async () => {
      await flush();
      await new Promise<void>((res) => { ws.once('pong', () => { res(); }); ws.ping(); });
    },
    take: () => { const out = messages.slice(taken); taken = messages.length; return out; },
    close: () => { ws.terminate(); },
  };
  (env.clients ?? []).push(client);
  return client;
}

export { startOnsite };
