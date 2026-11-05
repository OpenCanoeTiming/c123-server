/**
 * Fake Clock and fake fs for the #202 XML reader tests (TEST-ARCHITECTURE §5: the fake Clock is not a global
 * fake-timer patch; time moves only when `advance` says so). No shared state: every call builds fresh objects.
 *
 * ASSUMED INTERFACES (issue #202 Shape names them, not their signatures):
 *   Clock  = TEST-ARCHITECTURE §5 (now, setTimeout, clearTimeout, requestFrame, cancelFrame)
 *   fs     = { stat(path): Promise<{ mtimeMs: number; size: number }>; read(path): Promise<string> }, rejecting when missing
 *   onUnit = (elements: IngestElement[]) => void        one call is one ingest unit
 *   onStatus = (s: { state; lastRewriteDetectedAt: string | null; tornReads: number; abandonedReads: number }) => void
 *   reader = { start(), stop(), setPath(path | undefined) }
 *   Poll interval is in seconds (may be fractional). Detection time and unit `observedAt` are ISO strings.
 */
import { xmlFixture } from './helpers.js';

export const T0 = Date.parse('2026-09-15T10:00:00.000Z');
export const iso = (ms: number): string => new Date(ms).toISOString();

type Timer = { id: number; at: number; fn: () => void };

export function fakeClock(start = T0) {
  let t = start;
  let next = 1;
  let timers: Timer[] = [];
  const flush = async (): Promise<void> => { for (let i = 0; i < 200; i++) await Promise.resolve(); };
  const clock = {
    now: (): number => t,
    setTimeout(fn: () => void, ms: number): number { const id = next++; timers.push({ id, at: t + Math.max(0, ms), fn }); return id; },
    clearTimeout(h: number): void { timers = timers.filter((x) => x.id !== h); },
    requestFrame(fn: (n: number) => void): number { return clock.setTimeout(() => fn(t), 16); },
    cancelFrame(h: number): void { clock.clearTimeout(h); },
    pending: (): number => timers.length,
    /** Move time forward, running due timers in order, letting promises settle after each. */
    async advance(ms: number): Promise<void> {
      const target = t + ms;
      await flush();
      for (;;) {
        const due = timers.filter((x) => x.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        timers = timers.filter((x) => x !== due);
        t = Math.max(t, due.at);
        due.fn();
        await flush();
      }
      t = target;
      await flush();
    },
  };
  return clock;
}
export type FakeClock = ReturnType<typeof fakeClock>;

export interface FakeFile { mtimeMs: number; size: number; content: string }

export function fakeFs(clock: FakeClock, files: Record<string, FakeFile> = {}) {
  const statLog: { at: number; path: string; mtimeMs?: number; size?: number }[] = [];
  const readLog: { at: number; path: string }[] = [];
  const queued: Array<string | Error> = [];
  const hooks: Array<() => void> = [];
  const ctl = { readMs: 0, alwaysReject: undefined as Error | undefined };
  const fs = {
    async stat(path: string) {
      const f = files[path];
      statLog.push({ at: clock.now(), path, ...(f ? { mtimeMs: f.mtimeMs, size: f.size } : {}) });
      if (!f) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });
      return { mtimeMs: f.mtimeMs, size: f.size };
    },
    async read(path: string) {
      readLog.push({ at: clock.now(), path });
      const f = files[path];
      if (!f) throw Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });
      const next = queued.length > 0 ? queued.shift()! : undefined;
      const content = typeof next === 'string' ? next : f.content;
      const hook = hooks.shift();
      // a read takes ctl.readMs of fake time; the file may move while it is in flight (hook)
      if (ctl.readMs > 0) await new Promise<void>((r) => { clock.setTimeout(r, ctl.readMs); });
      hook?.();
      if (next instanceof Error) throw next;
      if (ctl.alwaysReject) throw ctl.alwaysReject;
      return content;
    },
  };
  return {
    fs, files, statLog, readLog, ctl,
    /** The next reads return these, in order, whatever the file holds (a tearing writer); then the file's own content. */
    queueReads: (...c: string[]) => { queued.push(...c); },
    /** The next n reads reject (a sharing violation on a file being copied over), in order with queueReads. */
    rejectReads: (n: number, code = 'EBUSY') => { for (let i = 0; i < n; i++) queued.push(Object.assign(new Error(`${code} read`), { code })); },
    /** Run fn while the next read is in flight, after it captured its content (the file moves under the read). */
    duringNextRead: (fn: () => void) => { hooks.push(fn); },
    put: (path: string, f: FakeFile) => { files[path] = f; },
    remove: (path: string) => { delete files[path]; },
  };
}

export const whole = (name: string): string => xmlFixture(name);
export const ROOT_CLOSE = '</Canoe123Data>';
/** A read that stops before the root closing tag. */
export const truncated = (xml: string): string => xml.slice(0, xml.indexOf(ROOT_CLOSE) - 40);
/** Root closing tag present, but not well-formed (a mismatched tag inside). */
export const malformed = (xml: string): string => xml.replace('</Events>', '</Evnts>');
export const file = (name: string, mtimeMs: number): FakeFile => ({ mtimeMs, size: whole(name).length, content: whole(name) });
export const phaseIds = (els: Array<Record<string, any>>): string[] =>
  els.filter((e) => e.snapshot).map((e) => e.snapshot.phaseId as string);
