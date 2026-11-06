/**
 * Fake filesystem and helpers for the #211 store tests (CONTRACTS §2.10, ADR-016, TEST-ARCHITECTURE §3.5, §5).
 * No shared state: every call builds fresh objects. No real clock: the store gets `{ now() }` and the fake never sleeps.
 *
 * ASSUMED INTERFACE (issue #211 names `src/store/checks.ts` and an injected filesystem "like the reader's", not the signatures):
 *   ChecksFs = {
 *     mkdir(dir): Promise<void>                        recursive, no error when it exists
 *     readFile(path): Promise<string>                  rejects with code 'ENOENT' when missing
 *     writeFile(path, data): Promise<void>             creates or truncates, durable (synced) when it resolves
 *     rename(from, to): Promise<void>                  atomically replaces `to` when it exists, on every platform
 *     readdir(dir): Promise<string[]>
 *     unlink(path): Promise<void>                      rejects with code 'ENOENT' when missing
 *   }
 *   openChecksStore({ fs, dir, eventId, clock: { now(): number }, newId?: () => string, platform?: NodeJS.Platform }): Promise<ChecksStore>
 *   ChecksStore = {
 *     putCheck({ attemptId, run, gate, valueAtCheck, checkedBy? }): Promise<StoredCheck>     // repeating replaces; checkedAt = ISO of clock.now()
 *     deleteCheck({ attemptId, run, gate }): Promise<void>
 *     createFlag({ attemptId, run, gate, comment, suggestedValue?, createdBy? }): Promise<GateFlag>   // flagId from newId
 *     resolveFlag(flagId, { note?, resolvedBy? }): Promise<GateFlag>                      // resolved: unchanged; unknown: rejects { code: 'flag-not-found' }
 *     list(): { checks: StoredCheck[]; flags: GateFlag[] }                                // what is stored: no `status`
 *     status(presented): Record<string, string>                                           // `attemptId:run:gate` -> flagged|verified|stale|plain (WorkflowResult.gateStatus)
 *   }
 * Every mutator resolves only once the new state is durable (temporary file written, then renamed over the target) and
 * rejects, leaving `list()` at the previous state, when either step fails.
 */
import type { WorkflowGiven } from '../../__tests__/conformance/port.js';

export const T0 = Date.parse('2026-09-15T10:00:00.000Z');
export const iso = (ms: number): string => new Date(ms).toISOString();
export const DIR = '/data/checks';

export function fakeClock(start = T0) {
  let t = start;
  return { now: (): number => t, advance: (ms: number): void => { t += ms; } };
}

export const counterIds = (prefix = 'f') => { let n = 0; return (): string => `${prefix}${++n}`; };

export async function flush(): Promise<void> { for (let i = 0; i < 100; i++) await Promise.resolve(); }

const enoent = (path: string): Error => Object.assign(new Error(`ENOENT ${path}`), { code: 'ENOENT' });

export function fakeChecksFs(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  const ops: string[] = [];
  /** Paths that have been the destination of a rename: the "durable" files. Removing or overwriting one in place is a violation. */
  const targets = new Set<string>();
  const violations: string[] = [];
  const ctl = {
    /** Runs inside `rename`, after the temporary file was written and before the target changes. May throw, or await. */
    beforeRename: undefined as undefined | ((from: string, to: string) => Promise<void> | void),
    /** Runs inside `writeFile`, before anything is written. */
    beforeWrite: undefined as undefined | ((path: string) => Promise<void> | void),
  };
  const fs = {
    async mkdir(dir: string) { ops.push(`mkdir ${dir}`); },
    async readFile(path: string) {
      ops.push(`read ${path}`);
      const c = files.get(path);
      if (c === undefined) throw enoent(path);
      return c;
    },
    async writeFile(path: string, data: string) {
      ops.push(`write ${path}`);
      if (targets.has(path)) violations.push(`in-place write over durable file ${path}`);
      await ctl.beforeWrite?.(path);
      files.set(path, data);
    },
    async rename(from: string, to: string) {
      ops.push(`rename ${from} ${to}`);
      if (targets.has(from)) violations.push(`rename away from durable file ${from}`);
      if (!files.has(from)) throw enoent(from);
      await ctl.beforeRename?.(from, to);
      // Windows semantics as the store must rely on them: rename onto an existing file replaces it in one step.
      files.set(to, files.get(from)!);
      files.delete(from);
      targets.add(to);
    },
    async readdir(dir: string) {
      ops.push(`readdir ${dir}`);
      const prefix = dir.endsWith('/') ? dir : `${dir}/`;
      return [...files.keys()].filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length).split('/')[0]!);
    },
    async unlink(path: string) {
      ops.push(`unlink ${path}`);
      if (targets.has(path)) violations.push(`unlink of durable file ${path}`);
      if (!files.delete(path)) throw enoent(path);
    },
  };
  return {
    fs, files, ops, ctl, violations,
    snapshot: (): Record<string, string> => Object.fromEntries([...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
    /** A hold on the next rename: `reached` settles once the temporary file is written and the rename is about to run. */
    holdRename() {
      let release!: () => void;
      let reject!: (e: Error) => void;
      let reached!: () => void;
      const reachedP = new Promise<void>((r) => { reached = r; });
      const gate = new Promise<void>((res, rej) => { release = res; reject = rej; });
      ctl.beforeRename = async () => { ctl.beforeRename = undefined; reached(); await gate; };
      return { reached: reachedP, release, fail: (e: Error) => { reject(e); } };
    },
    /** The next rename fails, after the temporary file was written (a crash or an I/O error in the window). */
    failNextRename(e: Error = Object.assign(new Error('EIO rename'), { code: 'EIO' })) {
      ctl.beforeRename = () => { ctl.beforeRename = undefined; throw e; };
    },
    failNextWrite(e: Error = Object.assign(new Error('ENOSPC write'), { code: 'ENOSPC' })) {
      ctl.beforeWrite = () => { ctl.beforeWrite = undefined; throw e; };
    },
  };
}
export type FakeChecksFs = ReturnType<typeof fakeChecksFs>;

export const presentedOf = (attemptId: string, run: number, gates: Array<[number, number | null]>): WorkflowGiven['presented'] => ({
  [attemptId]: { run, gates: gates.map(([number, penalty]) => ({ number, penalty })) },
});
export const A1 = 'C1W_BR1_19:38';
export const A2 = 'K1M_BR1_6:9';
