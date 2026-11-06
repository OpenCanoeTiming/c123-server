/**
 * Durable gate checks and flags (CONTRACTS §2.10, ADR-016). One file per event, keyed by `eventId`.
 * Write order: temporary file (synced by the fs seam) -> rename over the target -> memory -> acknowledge.
 * The rename replaces an existing target in one step on every platform, win32 included (the real adapter
 * in `adapters/real-io.ts` carries the win32 retry); the target is never unlinked, rewritten in place or renamed away.
 * Memory changes only after the rename; a failed write leaves it at the previous state. Writes are serialised.
 * Status is derived by `core/workflow`, never stored.
 */
import { gateStatus } from '../core/workflow.js';
import type { WorkflowGiven } from '../__tests__/conformance/port.js';

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
  createFlag(input: GateKey & { comment: string; suggestedValue?: number; createdBy?: string }): Promise<GateFlag>;
  resolveFlag(flagId: string, input: { note?: string; resolvedBy?: string }): Promise<GateFlag>;
  list(): ChecksState;
  status(presented: WorkflowGiven['presented']): Record<string, string>;
}

const sameKey = (a: GateKey, b: GateKey): boolean => a.attemptId === b.attemptId && a.run === b.run && a.gate === b.gate;
const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

function parse(text: string): ChecksState {
  const raw: unknown = JSON.parse(text);
  const rec = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!isArray(rec['checks']) || !isArray(rec['flags'])) throw new Error('checks file is malformed');
  return { checks: rec['checks'] as StoredCheck[], flags: rec['flags'] as GateFlag[] };
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
    state = parse(await fs.readFile(target));
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
      return { next: { ...cur, checks: [...cur.checks.filter((c) => !sameKey(c, i)), check] }, value: check };
    }),
    deleteCheck: (k) => mutate((cur) => ({ next: { ...cur, checks: cur.checks.filter((c) => !sameKey(c, k)) }, value: undefined })),
    createFlag: (i) => mutate((cur) => {
      const flag: GateFlag = {
        flagId: newId(), attemptId: i.attemptId, run: i.run, gate: i.gate, createdAt: iso(),
        ...(i.createdBy !== undefined ? { createdBy: i.createdBy } : {}),
        comment: i.comment,
        ...(i.suggestedValue !== undefined ? { suggestedValue: i.suggestedValue } : {}),
      };
      return { next: { ...cur, flags: [...cur.flags, flag] }, value: flag };
    }),
    resolveFlag: (flagId, i) => mutate((cur) => {
      const found = cur.flags.find((f) => f.flagId === flagId);
      if (!found) throw Object.assign(new Error(`no flag ${flagId}`), { code: 'flag-not-found' });
      if (found.resolution) return { next: cur, value: found };
      const resolved: GateFlag = {
        ...found,
        resolution: {
          resolvedAt: iso(),
          ...(i.resolvedBy !== undefined ? { resolvedBy: i.resolvedBy } : {}),
          ...(i.note !== undefined ? { note: i.note } : {}),
        },
      };
      return { next: { ...cur, flags: cur.flags.map((f) => (f.flagId === flagId ? resolved : f)) }, value: resolved };
    }),
    list: () => ({ checks: [...state.checks], flags: [...state.flags] }),
    status: (presented) => gateStatus({ checks: state.checks.map((c) => ({ ...c })), flags: [...state.flags], presented }).gateStatus,
  };
}
