/**
 * Durable gate checks and flags (CONTRACTS §2.10, ADR-016). One file per event, keyed by `eventId`.
 * Write order: temporary file (synced by the fs seam) -> rename over the target -> memory -> acknowledge.
 * The rename replaces an existing target in one step on every platform, win32 included (the real adapter
 * in `adapters/real-io.ts` carries the win32 retry); the target is never unlinked, rewritten in place or renamed away.
 * Memory changes only after the rename; a failed write leaves it at the previous state. Writes are serialised.
 * Status is derived by `core/workflow`, never stored.
 */
import { checkStatus, gateStatus, type WorkflowGiven } from '../core/workflow.js';

export interface ChecksFs {
  mkdir(dir: string): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  readdir(dir: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
}

export interface StoredCheck {
  attemptId: string; run: number; gate: number;
  checkedAt: string; checkedBy?: string;
  valueAtCheck: number | null;
}
export interface GateFlag {
  flagId: string;
  attemptId: string; run: number; gate: number;
  createdAt: string; createdBy?: string;
  comment: string;
  suggestedValue?: number;
  resolution?: { resolvedAt: string; resolvedBy?: string; note?: string };
}
export interface ChecksState { checks: StoredCheck[]; flags: GateFlag[] }
export interface GateKey { attemptId: string; run: number; gate: number }

export interface ChecksStoreOptions {
  fs: ChecksFs;
  dir: string;
  eventId: string;
  clock: { now(): number };
  newId?: () => string;
  /** Informational: both win32 and posix rely on rename-over-existing being atomic (see the file header). */
  platform?: NodeJS.Platform;
}

export interface ChecksStore {
  putCheck(input: GateKey & { valueAtCheck: number | null; checkedBy?: string }): Promise<StoredCheck>;
  deleteCheck(key: GateKey): Promise<void>;
  /** `flagId`: an id the caller chose ahead (the on-site key map binds it before the flag is created); otherwise `newId`. */
  createFlag(input: GateKey & { comment: string; suggestedValue?: number; createdBy?: string; flagId?: string }): Promise<GateFlag>;
  resolveFlag(flagId: string, input: { note?: string; resolvedBy?: string }): Promise<GateFlag>;
  /** Copies: nothing a caller holds aliases what the store holds (#273 N3). */
  list(): ChecksState;
  /** Every check with its own `status`, derived now against `presented` and never stored (CONTRACTS §2.10, §7.1). */
  checksWithStatus(presented: WorkflowGiven['presented']): Array<StoredCheck & { status: 'verified' | 'stale' }>;
  status(presented: WorkflowGiven['presented']): Record<string, string>;
}

const copyCheck = (c: StoredCheck): StoredCheck => ({ ...c });
const copyFlag = (f: GateFlag): GateFlag => ({ ...f, ...(f.resolution !== undefined ? { resolution: { ...f.resolution } } : {}) });

const sameKey = (a: GateKey, b: GateKey): boolean => a.attemptId === b.attemptId && a.run === b.run && a.gate === b.gate;
const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** Thrown by `openChecksStore` when the file exists but cannot be read as a version-1 store; the file is left as it is. */
export class ChecksFileInvalidError extends Error {
  readonly code = 'checks-file-invalid';
  constructor(readonly path: string, readonly reason: string) {
    super(`checks file invalid at ${path}: ${reason}`);
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const optStr = (v: unknown): boolean => v === undefined || isStr(v);

function checkReason(c: unknown): string | null {
  if (!isObj(c)) return 'not an object';
  if (!isStr(c['attemptId']) || !isInt(c['run']) || !isInt(c['gate'])) return 'attemptId, run or gate missing or mistyped';
  if (!isStr(c['checkedAt']) || !optStr(c['checkedBy'])) return 'checkedAt or checkedBy mistyped';
  if (!('valueAtCheck' in c) || (c['valueAtCheck'] !== null && typeof c['valueAtCheck'] !== 'number')) return 'valueAtCheck must be a number or null';
  if ('status' in c) return 'status is derived, never stored';
  return null;
}

function flagReason(f: unknown): string | null {
  if (!isObj(f)) return 'not an object';
  if (!isStr(f['flagId']) || !isStr(f['attemptId']) || !isInt(f['run']) || !isInt(f['gate'])) return 'flagId, attemptId, run or gate missing or mistyped';
  if (!isStr(f['createdAt']) || !optStr(f['createdBy']) || !isStr(f['comment'])) return 'createdAt, createdBy or comment missing or mistyped';
  if (f['suggestedValue'] !== undefined && typeof f['suggestedValue'] !== 'number') return 'suggestedValue mistyped';
  const r = f['resolution'];
  if ('resolution' in f && r !== undefined) {
    if (!isObj(r) || !isStr(r['resolvedAt']) || !optStr(r['resolvedBy']) || !optStr(r['note'])) return 'resolution must be an object with resolvedAt';
  }
  return null;
}

function parse(text: string, path: string): ChecksState {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new ChecksFileInvalidError(path, `not JSON: ${(e as Error).message}`); }
  if (!isObj(raw)) throw new ChecksFileInvalidError(path, 'not an object');
  if (raw['version'] !== 1) throw new ChecksFileInvalidError(path, `unsupported version ${JSON.stringify(raw['version'])}`);
  const checks = raw['checks'];
  const flags = raw['flags'];
  if (!isArray(checks) || !isArray(flags)) throw new ChecksFileInvalidError(path, 'checks and flags must be arrays');
  const keys = new Set<string>();
  checks.forEach((c, i) => {
    const why = checkReason(c);
    if (why) throw new ChecksFileInvalidError(`checks[${i}]`, why);
    const k = c as StoredCheck;
    const key = JSON.stringify([k.attemptId, k.run, k.gate]);
    if (keys.has(key)) throw new ChecksFileInvalidError(`checks[${i}]`, 'duplicate attemptId, run and gate');
    keys.add(key);
  });
  const ids = new Set<string>();
  flags.forEach((f, i) => {
    const why = flagReason(f);
    if (why) throw new ChecksFileInvalidError(`flags[${i}]`, why);
    const id = (f as GateFlag).flagId;
    if (ids.has(id)) throw new ChecksFileInvalidError(`flags[${i}]`, 'duplicate flagId');
    ids.add(id);
  });
  return { checks: checks as StoredCheck[], flags: flags as GateFlag[] };
}

export async function openChecksStore(opts: ChecksStoreOptions): Promise<ChecksStore> {
  const { fs, dir, eventId, clock } = opts;
  let seq = 0;
  const newId = opts.newId ?? ((): string => `flag-${clock.now().toString(36)}-${(++seq).toString(36)}`);
  const base = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`;
  const target = `${base}checks-${encodeURIComponent(eventId)}.json`;
  const tmp = `${target}.tmp`;

  await fs.mkdir(dir);
  let state: ChecksState = { checks: [], flags: [] };
  try {
    state = parse(await fs.readFile(target), target);
  } catch (e) {
    if ((e as { code?: string }).code !== 'ENOENT') throw e;
  }

  let tail: Promise<unknown> = Promise.resolve();
  /** Serialised: `fn` sees the state left by every earlier write, and memory moves only after the rename. */
  function mutate<T>(fn: (cur: ChecksState) => { next: ChecksState; value: T }): Promise<T> {
    const run = tail.then(async () => {
      const { next, value } = fn(state);
      if (next !== state) {
        await fs.writeFile(tmp, JSON.stringify({ version: 1, ...next }));
        await fs.rename(tmp, target);
        state = next;
      }
      return value;
    });
    tail = run.catch(() => undefined);
    return run;
  }
  const iso = (): string => new Date(clock.now()).toISOString();

  return {
    putCheck: (i) => mutate((cur) => {
      const check: StoredCheck = {
        attemptId: i.attemptId, run: i.run, gate: i.gate, checkedAt: iso(),
        ...(i.checkedBy !== undefined ? { checkedBy: i.checkedBy } : {}),
        valueAtCheck: i.valueAtCheck,
      };
      return { next: { ...cur, checks: [...cur.checks.filter((c) => !sameKey(c, i)), check] }, value: copyCheck(check) };
    }),
    deleteCheck: (k) => mutate((cur) => ({ next: { ...cur, checks: cur.checks.filter((c) => !sameKey(c, k)) }, value: undefined })),
    createFlag: (i) => mutate((cur) => {
      const flag: GateFlag = {
        flagId: i.flagId ?? newId(), attemptId: i.attemptId, run: i.run, gate: i.gate, createdAt: iso(),
        ...(i.createdBy !== undefined ? { createdBy: i.createdBy } : {}),
        comment: i.comment,
        ...(i.suggestedValue !== undefined ? { suggestedValue: i.suggestedValue } : {}),
      };
      return { next: { ...cur, flags: [...cur.flags, flag] }, value: copyFlag(flag) };
    }),
    resolveFlag: (flagId, i) => mutate((cur) => {
      const found = cur.flags.find((f) => f.flagId === flagId);
      if (!found) throw Object.assign(new Error(`no flag ${flagId}`), { code: 'flag-not-found' });
      if (found.resolution) return { next: cur, value: copyFlag(found) };
      const resolved: GateFlag = {
        ...found,
        resolution: {
          resolvedAt: iso(),
          ...(i.resolvedBy !== undefined ? { resolvedBy: i.resolvedBy } : {}),
          ...(i.note !== undefined ? { note: i.note } : {}),
        },
      };
      return { next: { ...cur, flags: cur.flags.map((f) => (f.flagId === flagId ? resolved : f)) }, value: copyFlag(resolved) };
    }),
    list: () => ({ checks: state.checks.map(copyCheck), flags: state.flags.map(copyFlag) }),
    checksWithStatus: (presented) => state.checks.map((c) => ({ ...copyCheck(c), status: checkStatus(c, presented) })),
    status: (presented) => gateStatus({ checks: state.checks.map((c) => ({ ...c })), flags: [...state.flags], presented }).gateStatus,
  };
}
