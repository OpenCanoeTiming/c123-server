/**
 * Durable write requests and idempotency keys of the on-site process (CONTRACTS §1.5, §2.9, §2.10, §7.3, §7.4). One file per event, keyed by
 * `eventId`: every `WriteRequest` as last pushed, the `Idempotency-Key` map of penalty writes and the one of flag creations.
 * The §2.10 discipline, as `store/checks.ts` keeps it: temporary file, rename over the target, then memory, then acknowledge; writes are
 * serialised, and a failed write leaves memory at the previous state. Key entries older than the 24 h of §1.5 are dropped.
 */
import type { ChecksFs } from '../store/checks.js';

export type J = Record<string, unknown>;
export interface KeyEntry { id: string; boundAt: number }
interface State { writes: J[]; writeKeys: Record<string, KeyEntry>; flagKeys: Record<string, KeyEntry> }

/** CONTRACTS §1.5: a key stays bound this long. */
export const KEY_TTL_MS = 24 * 3600 * 1000;

export class WritesFileInvalidError extends Error {
  readonly code = 'writes-file-invalid';
  constructor(readonly path: string, readonly reason: string) {
    super(`writes file invalid at ${path}: ${reason}`);
  }
}

export interface WritesStore {
  /** A copy of the WriteRequest as last pushed. */
  get(writeId: string): J | undefined;
  /** Every WriteRequest still `pending`, as stored: with its `retainedCell` when it has one. */
  pending(): J[];
  /** The WriteRequest a bound, unexpired key maps to. */
  byWriteKey(key: string): J | undefined;
  /** The flag id a bound, unexpired key maps to. */
  flagByKey(key: string): string | undefined;
  /** Records the WriteRequests (and binds `bind.key` to one of them) in one durable step. */
  put(writes: readonly J[], bind?: { key: string; writeId: string }): Promise<void>;
  bindFlag(key: string, flagId: string): Promise<void>;
}

const isObj = (v: unknown): v is J => typeof v === 'object' && v !== null && !Array.isArray(v);

function parse(text: string, path: string): State {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new WritesFileInvalidError(path, `not JSON: ${(e as Error).message}`); }
  if (!isObj(raw) || raw['version'] !== 1) throw new WritesFileInvalidError(path, 'not a version 1 writes file');
  const keys = (name: string): Record<string, KeyEntry> => {
    const k = raw[name];
    if (!isObj(k)) throw new WritesFileInvalidError(path, `${name} must be an object`);
    for (const e of Object.values(k)) if (!isObj(e) || typeof e['id'] !== 'string' || typeof e['boundAt'] !== 'number') throw new WritesFileInvalidError(path, `${name} holds a malformed entry`);
    return k as unknown as Record<string, KeyEntry>;
  };
  const writes = raw['writes'];
  if (!Array.isArray(writes) || !writes.every((w) => isObj(w) && typeof w['writeId'] === 'string')) throw new WritesFileInvalidError(path, 'writes must be an array of WriteRequests');
  return { writes: writes as J[], writeKeys: keys('writeKeys'), flagKeys: keys('flagKeys') };
}

export async function openWritesStore(opts: { fs: ChecksFs; dir: string; eventId: string; clock: { now(): number } }): Promise<WritesStore> {
  const { fs, dir, eventId, clock } = opts;
  const base = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`;
  const target = `${base}writes-${encodeURIComponent(eventId)}.json`;
  const tmp = `${target}.tmp`;
  await fs.mkdir(dir);
  let state: State = { writes: [], writeKeys: {}, flagKeys: {} };
  try {
    state = parse(await fs.readFile(target), target);
  } catch (e) {
    if ((e as { code?: string }).code !== 'ENOENT') throw e;
  }

  let tail: Promise<unknown> = Promise.resolve();
  function mutate(fn: (cur: State) => State): Promise<void> {
    const run = tail.then(async () => {
      const next = fn(state);
      await fs.writeFile(tmp, JSON.stringify({ version: 1, ...next }));
      await fs.rename(tmp, target);
      state = next;
    });
    tail = run.catch(() => undefined);
    return run;
  }
  const live = (e: KeyEntry | undefined): e is KeyEntry => e !== undefined && clock.now() - e.boundAt < KEY_TTL_MS;
  const fresh = (m: Record<string, KeyEntry>): Record<string, KeyEntry> => Object.fromEntries(Object.entries(m).filter(([, e]) => live(e)));
  const copy = (w: J): J => JSON.parse(JSON.stringify(w)) as J;
  // `retainedCell` is of the stored record, not of the WriteRequest (DERIVATIONS §6): kept across updates, given only to `pending()`
  const wire = (w: J): J => { const out = copy(w); delete out['retainedCell']; return out; };

  return {
    get: (id) => { const w = state.writes.find((x) => x['writeId'] === id); return w === undefined ? undefined : wire(w); },
    pending: () => state.writes.filter((w) => w['status'] === 'pending').map(copy),
    byWriteKey: (key) => {
      const e = state.writeKeys[key];
      if (!live(e)) return undefined;
      const w = state.writes.find((x) => x['writeId'] === e.id);
      return w === undefined ? undefined : wire(w);
    },
    flagByKey: (key) => { const e = state.flagKeys[key]; return live(e) ? e.id : undefined; },
    put: (writes, bind) => mutate((cur) => {
      const byId = new Map(cur.writes.map((w) => [w['writeId'] as string, w]));
      for (const w of writes) {
        const was = byId.get(w['writeId'] as string);
        byId.set(w['writeId'] as string, copy(was !== undefined && 'retainedCell' in was && !('retainedCell' in w) ? { ...w, retainedCell: was['retainedCell'] } : w));
      }
      return {
        writes: [...byId.values()],
        writeKeys: { ...fresh(cur.writeKeys), ...(bind !== undefined ? { [bind.key]: { id: bind.writeId, boundAt: clock.now() } } : {}) },
        flagKeys: fresh(cur.flagKeys),
      };
    }),
    bindFlag: (key, flagId) => mutate((cur) => ({ ...cur, writeKeys: fresh(cur.writeKeys), flagKeys: { ...fresh(cur.flagKeys), [key]: { id: flagId, boundAt: clock.now() } } })),
  };
}

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The correction command (c123-protocol "PenaltyCorrection"): one compact line, the `Canoe123` envelope naming the connected instance,
 * the race id, bib, gate and value, then the stream's `|` terminator (CONTRACTS §7.3).
 */
export function penaltyCorrectionCommand(c: { system: 'Main' | 'Backup'; raceId: string; bib: string; gate: number; value: number }): string {
  return `<Canoe123 System="${c.system}"><PenaltyCorrection RaceId="${escapeAttr(c.raceId)}" Bib="${escapeAttr(c.bib)}" Gate="${c.gate}" Value="${c.value}" /></Canoe123>|`;
}
