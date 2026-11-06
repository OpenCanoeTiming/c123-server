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
  let retryTimer: unknown;
  let retrySet = false;
  let busy = false;
  type Sig = { mtimeMs: number; size: number };
  const same = (a: Sig, b: Sig): boolean => a.mtimeMs === b.mtimeMs && a.size === b.size;
  let lastGood: Sig | undefined;
  // First detection of the change not yet read whole, with the stat it was seen at (a different stat restarts it).
  let pending: { sig: Sig; at: number } | undefined;
  // The last successful stat, and the time of the last one that showed a signature other than the current one
  // (INV-2c content age, `changedAfter`). Stat times are taken before the call.
  let prevStat: { sig: Sig; at: number } | undefined;
  let changedAfter: number | undefined;
  // The signature of a file whose last burst ended torn with the stat unchanged: one read per poll until it changes.
  let stuckSig: Sig | undefined;
  let failedPolls = 0;
  let state: XmlSourceState = 'not-configured';
  let lastRewriteDetectedAt: string | null = null;
  let tornReads = 0;
  let abandonedReads = 0;

  const report = (): void => { opts.onStatus({ state, lastRewriteDetectedAt, tornReads, abandonedReads }); };
  const setState = (s: XmlSourceState): void => { if (s !== state) { state = s; report(); } };
  const observe = (sig: Sig, at: number): void => {
    if (prevStat && !same(prevStat.sig, sig)) changedAfter = prevStat.at;
    prevStat = { sig, at };
  };
  /** One failed poll: counts it and moves to reconnecting, or unreachable after the bound. */
  const failPoll = (): void => {
    failedPolls++;
    setState(failedPolls >= XML_UNREACHABLE_AFTER_FAILED_POLLS ? 'unreachable' : 'reconnecting');
  };
  const arm = (ms: number, fn: () => void): void => { timer = later(fn, ms); timerSet = true; };
  const disarm = (): void => {
    if (timerSet) { cancel(timer); timerSet = false; }
    if (retrySet) { cancel(retryTimer); retrySet = false; }
  };
  const wait = (ms: number): Promise<void> => new Promise<void>((resolve) => { retrySet = true; retryTimer = later(() => { retrySet = false; resolve(); }, ms); });

  type Attempt = { kind: 'ok'; els: IngestElement[] } | { kind: 'torn' | 'rejected' | 'moved' };

  /** One read, validated; a read that is not whole or not well-formed is torn, a rejected read is its own kind. */
  async function readOnce(p: string, at: number): Promise<Attempt> {
    let text: string;
    try { text = await fs.read(p); } catch { return { kind: 'rejected' }; }
    if (text.includes(ROOT_CLOSE) && XMLValidator.validate(text) === true) {
      const els = parseXmlSnapshot(text, { ...ctx, observedAt: iso(at) });
      if (!els.some((e) => 'unparseable' in e)) return { kind: 'ok', els };
    }
    tornReads++;
    return { kind: 'torn' };
  }

  function emit(my: number, els: IngestElement[], at: number): boolean {
    const stamp = iso(at);
    const unit: IngestElement[] = [{ event: 'xml-rewrite-detected', ingestSeq: 0, observedAt: stamp, changedAfter: changedAfter === undefined ? null : iso(changedAfter) }];
    els.forEach((e, i) => unit.push({ ...e, ingestSeq: i + 1, observedAt: stamp }));
    opts.onUnit(unit);
    if (my !== epoch) return false; // onUnit re-entered setPath/stop (#251)
    lastRewriteDetectedAt = stamp;
    return true;
  }

  async function poll(my: number, p: string, polledAt: number): Promise<void> {
    let st: Sig;
    try { st = await fs.stat(p); } catch {
      if (my !== epoch) return;
      failPoll();
      return;
    }
    if (my !== epoch) return;
    observe(st, polledAt);
    if (lastGood && same(lastGood, st)) { pending = undefined; failedPolls = 0; setState('connected'); return; }
    if (!pending || !same(pending.sig, st)) pending = { sig: st, at: polledAt };
    let ref: Sig = st;
    let last: Attempt['kind'] = 'torn';
    const extraReads = stuckSig && same(stuckSig, st) ? 0 : XML_RETRY_EXTRA_READS;
    for (let attempt = 0; attempt <= extraReads; attempt++) {
      if (attempt > 0) {
        await wait(XML_RETRY_SPACING_MS);
        if (my !== epoch) return;
      }
      const r = await readOnce(p, pending!.at);
      if (my !== epoch) return;
      last = r.kind;
      if (r.kind === 'ok') {
        // A stat that moved across the read makes it a failed attempt.
        let after: Sig | undefined;
        const closedAt = now();
        try { after = await fs.stat(p); } catch { after = undefined; }
        if (my !== epoch) return;
        if (!after) { failPoll(); report(); return; } // a closing stat that rejects is a failed poll (§2.8)
        observe(after, closedAt);
        if (!same(after, ref)) { last = 'moved'; ref = after; pending = { sig: after, at: closedAt }; report(); if (my !== epoch) return; continue; }
        // Delivery first: a throwing onUnit leaves lastGood and pending as they were, so the next poll reads again.
        if (!emit(my, r.els, pending!.at)) return;
        lastGood = ref;
        pending = undefined;
        stuckSig = undefined;
        failedPolls = 0;
        setState('connected');
        report();
        return;
      }
      report();
      if (my !== epoch) return;
    }
    abandonedReads++;
    if (last === 'rejected') failPoll();
    else if (last === 'moved') { failedPolls = 0; setState('connected'); }
    else {
      // Torn to the end: one more stat tells a file still being written from one that stays unreadable.
      const checkedAt = now();
      let again: Sig | undefined;
      try { again = await fs.stat(p); } catch { again = undefined; }
      if (my !== epoch) return;
      if (!again) failPoll();
      else {
        observe(again, checkedAt);
        if (same(again, pending!.sig)) { stuckSig = again; failPoll(); }
        else { pending = { sig: again, at: checkedAt }; failedPolls = 0; setState('connected'); }
      }
    }
    if (my !== epoch) return; // onStatus re-entered setPath/stop from a state report above
    report();
  }

  /** A poll is anchored to the previous poll's start, not to the end of its work. */
  function fire(): void {
    timerSet = false;
    const my = epoch;
    const p = path;
    if (p === undefined || !running) return;
    arm(intervalMs(), fire);
    if (busy) return;
    busy = true;
    void poll(my, p, now())
      .catch(() => {
        // A throw inside a poll is a failed poll; the handler itself must not throw (onStatus may be the thrower).
        if (my !== epoch) return;
        try { failPoll(); } catch { /* ignored */ }
      })
      .finally(() => { if (my === epoch) busy = false; });
  }

  function begin(): void {
    disarm();
    busy = false;
    lastGood = undefined;
    pending = undefined;
    prevStat = undefined;
    stuckSig = undefined;
    changedAfter = undefined;
    failedPolls = 0;
    if (path === undefined) { state = 'not-configured'; report(); return; }
    state = 'reconnecting'; // until the first poll reports (§5)
    arm(intervalMs(), fire); // before the report: a throwing or re-entering onStatus must not leave polling unarmed
    report();
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
