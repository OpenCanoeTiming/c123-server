/**
 * XML snapshot reader (#202; DERIVATIONS §0.3, §5; CONTRACTS INV-2c, INV-7).
 * Polls the Canoe123 XML file by modification time and size (never `fs.watch`), validates each read, retries a torn
 * read, and emits one ingest unit per whole snapshot: `xml-rewrite-detected`, then `parseXmlSnapshot`'s elements.
 * Time and file access are injected (`Clock`, `XmlFs`); the real adapters live outside `src/ingest/`.
 */
import { XMLValidator } from 'fast-xml-parser';
import { parseXmlSnapshot } from './xml.js';
import type { IngestContext, IngestElement } from './types.js';

/** TEST-ARCHITECTURE §5. Handles are opaque; `requestFrame`/`cancelFrame` are unused here. */
export interface Clock {
  now: () => number;
  // Handles are the clock's own; `any` lets a test clock use numbers and the real one Timeout objects.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  setTimeout: (fn: () => void, ms: number) => any;
  clearTimeout: (handle: any) => void;
  requestFrame: (fn: (t: number) => void) => any;
  cancelFrame: (handle: any) => void;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Rejects when the file is missing or unreadable. */
export interface XmlFs {
  stat(path: string): Promise<{ mtimeMs: number; size: number }>;
  read(path: string): Promise<string>;
}

export type XmlSourceState = 'not-configured' | 'connected' | 'reconnecting' | 'unreachable';

export interface XmlReaderStatus {
  state: XmlSourceState;
  /** First detection of the change last read (INV-2c content age), not the moment a retry succeeded. */
  lastRewriteDetectedAt: string | null;
  /** Every invalid read. */
  tornReads: number;
  /** Reads given up after the retry bound. */
  abandonedReads: number;
}

export interface XmlReaderOptions {
  path?: string | undefined;
  /** Seconds, fractional allowed. A deployment setting, default 5 (DERIVATIONS §10 item 18). */
  pollIntervalSeconds?: number | undefined;
  clock: Clock;
  fs: XmlFs;
  ctx: IngestContext;
  onUnit: (elements: IngestElement[]) => void;
  onStatus: (status: XmlReaderStatus) => void;
}

export interface XmlReader {
  start(): void;
  stop(): void;
  setPath(path: string | undefined): void;
}

/** Technical defaults (DERIVATIONS §0.3, §5). */
export const XML_RETRY_EXTRA_READS = 3;
export const XML_RETRY_SPACING_MS = 200;
export const XML_UNREACHABLE_AFTER_FAILED_POLLS = 5;
export const XML_DEFAULT_POLL_SECONDS = 5;

const ROOT_CLOSE = '</Canoe123Data>';

export function createXmlReader(opts: XmlReaderOptions): XmlReader {
  const { clock, fs, ctx } = opts;
  // Bound once; the clock's timer functions do not depend on `this`.
  const { setTimeout: later, clearTimeout: cancel, now } = { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, now: clock.now };
  const intervalMs = (): number => (opts.pollIntervalSeconds ?? XML_DEFAULT_POLL_SECONDS) * 1000;
  const iso = (ms: number): string => new Date(ms).toISOString();

  let path = opts.path;
  let running = false;
  let epoch = 0; // bumped by stop/setPath so that in-flight work is discarded
  let timer: unknown;
  let timerSet = false;
  let lastGood: { mtimeMs: number; size: number } | undefined;
  let detectedAt: number | undefined; // first detection of a change not yet read whole
  let failedPolls = 0;
  let state: XmlSourceState = 'not-configured';
  let lastRewriteDetectedAt: string | null = null;
  let tornReads = 0;
  let abandonedReads = 0;

  const report = (): void => { opts.onStatus({ state, lastRewriteDetectedAt, tornReads, abandonedReads }); };
  const setState = (s: XmlSourceState): void => { if (s !== state) { state = s; report(); } };
  const arm = (ms: number, fn: () => void): void => { timer = later(fn, ms); timerSet = true; };
  const disarm = (): void => { if (timerSet) { cancel(timer); timerSet = false; } };

  /** One read, validated. Returns the unit's parsed elements, or undefined for a torn read. */
  async function readOnce(p: string, at: number): Promise<IngestElement[] | undefined> {
    const text = await fs.read(p);
    if (text.includes(ROOT_CLOSE) && XMLValidator.validate(text) === true) {
      const els = parseXmlSnapshot(text, { ...ctx, observedAt: iso(at) });
      if (!els.some((e) => 'unparseable' in e)) return els;
    }
    tornReads++;
    return undefined;
  }

  function emit(els: IngestElement[], at: number): void {
    const stamp = iso(at);
    const unit: IngestElement[] = [{ event: 'xml-rewrite-detected', ingestSeq: 0, observedAt: stamp }];
    els.forEach((e, i) => unit.push({ ...e, ingestSeq: i + 1, observedAt: stamp }));
    lastRewriteDetectedAt = stamp;
    opts.onUnit(unit);
    report();
  }

  async function poll(): Promise<void> {
    timerSet = false;
    const my = epoch;
    const p = path;
    if (p === undefined) return;
    const polledAt = now();
    try {
      const st = await fs.stat(p);
      if (my !== epoch) return;
      failedPolls = 0;
      setState('connected');
      const changed = !lastGood || lastGood.mtimeMs !== st.mtimeMs || lastGood.size !== st.size;
      if (changed) {
        if (detectedAt === undefined) detectedAt = polledAt;
        const at = detectedAt;
        for (let attempt = 0; attempt <= XML_RETRY_EXTRA_READS; attempt++) {
          if (attempt > 0) {
            await new Promise<void>((resolve) => { arm(XML_RETRY_SPACING_MS, resolve); });
            if (my !== epoch) return;
          }
          const els = await readOnce(p, at);
          if (my !== epoch) return;
          if (els) {
            lastGood = st;
            detectedAt = undefined;
            emit(els, at);
            break;
          }
          if (attempt === XML_RETRY_EXTRA_READS) abandonedReads++;
          report();
        }
      }
    } catch {
      if (my !== epoch) return;
      failedPolls++;
      setState(failedPolls >= XML_UNREACHABLE_AFTER_FAILED_POLLS ? 'unreachable' : 'reconnecting');
    }
    if (my === epoch && running) arm(intervalMs(), () => { void poll(); });
  }

  function begin(): void {
    disarm();
    lastGood = undefined;
    detectedAt = undefined;
    failedPolls = 0;
    if (path === undefined) { state = 'not-configured'; report(); return; }
    arm(intervalMs(), () => { void poll(); });
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      epoch++;
      begin();
    },
    stop(): void {
      running = false;
      epoch++;
      disarm();
    },
    setPath(next: string | undefined): void {
      path = next;
      epoch++;
      if (running) begin();
    },
  };
}
