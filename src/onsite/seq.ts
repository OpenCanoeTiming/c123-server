/**
 * The one `seq` counter of the on-site process and its high-water mark (CONTRACTS §1.6): strictly increasing, never regressing across a
 * restart. The mark is persisted as §2.10 persists: a temporary file, then a rename over the target. It is kept ahead of the counter by
 * a block, so a kill at any point leaves a mark at or above every `seq` ever sent; a message is stamped only once the mark covers it,
 * and a graceful stop writes the exact counter back.
 */
import type { ChecksFs } from '../store/checks.js';

/** How far above the counter the persisted mark is kept: one durable write per this many messages. */
export const SEQ_BLOCK = 1000;

export interface SeqCounter {
  /** The last `seq` taken; what a REST response carries as `asOfSeq`. */
  current(): number;
  /** Takes the next value. Only after `reserve(n)` covered it. */
  next(): number;
  /** Makes the persisted mark cover `n` more values; resolves once it is durable. */
  reserve(n: number): Promise<void>;
  /** A graceful stop: the mark becomes the counter itself. */
  close(): Promise<void>;
}

export class SeqFileInvalidError extends Error {
  readonly code = 'seq-file-invalid';
  constructor(readonly path: string, readonly reason: string) {
    super(`seq file invalid at ${path}: ${reason}`);
  }
}

/**
 * Startup on a seq file that fails validation (DERIVATIONS §10 item 33). `keep` stores the file's content under a new name; then the
 * counter starts at `floor` and the new mark is persisted over the invalid file (temporary file, rename). The invalid file stays at its
 * name until a valid mark replaces it, so a crash at any point leaves either it (the next start recovers again) or the new mark.
 */
export interface SeqRecovery {
  /** The counter starts at no less than this; the clock in ms is above any counter issued in practice. */
  floor(): number;
  keep(path: string, content: string, reason: string): Promise<void>;
}

/** Throws `SeqFileInvalidError` on a file that fails validation unless `recover` is given; any other read error but ENOENT is rethrown. */
export async function openSeq(fs: ChecksFs, dir: string, recover?: SeqRecovery): Promise<SeqCounter> {
  const base = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`;
  const target = `${base}seq.json`;
  const tmp = `${target}.tmp`;
  await fs.mkdir(dir);
  let counter = 0;
  let text: string | undefined;
  try {
    text = await fs.readFile(target);
  } catch (e) {
    if ((e as { code?: string }).code !== 'ENOENT') throw e;
  }
  if (text !== undefined) {
    let reason: string | undefined;
    try {
      const raw: unknown = JSON.parse(text);
      const mark = (raw as { highWater?: unknown } | null)?.highWater;
      if ((raw as { version?: unknown } | null)?.version !== 1 || typeof mark !== 'number' || !Number.isInteger(mark) || mark < 0) reason = 'not a version 1 high-water mark';
      else counter = mark;
    } catch (e) {
      reason = (e as Error).message;
    }
    if (reason !== undefined) {
      if (recover === undefined) throw new SeqFileInvalidError(target, reason);
      await recover.keep(target, text, reason);
      counter = recover.floor();
    }
  }
  let mark = -1; // nothing is persisted until the first write below
  const persist = async (to: number): Promise<void> => {
    await fs.writeFile(tmp, JSON.stringify({ version: 1, highWater: to }));
    await fs.rename(tmp, target);
    mark = to;
  };
  await persist(counter + SEQ_BLOCK);
  return {
    current: () => counter,
    next: () => ++counter,
    reserve: async (n) => {
      if (counter + n > mark) await persist(counter + n + SEQ_BLOCK);
    },
    close: async () => {
      if (mark !== counter) await persist(counter);
    },
  };
}
