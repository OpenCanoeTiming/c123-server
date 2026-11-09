/**
 * The TEST-ARCHITECTURE §3.2 step log, in `scripts/replay-direct.ts`'s format (its header): `{"hydration":...}`, one `{i, elements, deltas,
 * stateHash}` per ingest unit, `{"end":{"steps":n}}`. `stateHash` is the same order-independent digest of the presented state, refreshed
 * from what each step touched. Written only when the process is asked to.
 */
import { createHash } from 'node:crypto';
import type { MergeCore } from '../core/index.js';

/** Sorted keys, undefined dropped as JSON.stringify drops it. */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canon(x))).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

const MOD = 1n << 256n;
const digestOf = (key: string, value: unknown): bigint => BigInt('0x' + createHash('sha256').update(`${key}\n${canon(value)}`).digest('hex'));

export interface StepLog {
  step(elements: readonly unknown[], deltas: readonly Record<string, unknown>[]): void;
  end(): void;
}

/** `getCore` is read at each step: a new event starts a new core, and `reset` starts the digest over. */
export function createStepLog(write: (line: string) => void, getCore: () => MergeCore, asOfSeq: number): StepLog & { reset(): void } {
  let steps = 0;
  let sum = 0n;
  const parts = new Map<string, bigint>();
  const put = (o: unknown): void => { write(canon(o)); };
  put({ hydration: { asOfSeq, state: { phases: [], attempts: [], entries: [], standings: [], oncourse: { attemptIds: [] }, diagnostics: [] } } });

  const setPart = (key: string, value: unknown): void => {
    const was = parts.get(key) ?? 0n;
    const now = value === undefined ? 0n : digestOf(key, value);
    sum = (sum - was + now + MOD) % MOD;
    if (now === 0n) parts.delete(key);
    else parts.set(key, now);
  };
  function rehash(deltas: readonly Record<string, unknown>[]): string {
    const core = getCore();
    for (const d of deltas) {
      switch (d['type']) {
        case 'attempt.updated': setPart(`a|${String(d['attemptId'])}`, core.presented(String(d['attemptId']))); break;
        case 'entry.updated': setPart(`e|${String(d['entryId'])}`, core.entry(String(d['entryId']))); break;
        case 'standing.updated': setPart(`s|${String((d['standing'] as { standingKey: string }).standingKey)}`, d['standing']); break;
        case 'scope.replaced': {
          const live = new Set(core.attempts());
          for (const k of [...parts.keys()]) if (k.startsWith('a|') && !live.has(k.slice(2))) setPart(k, undefined);
          for (const a of (d['attempts'] as { attemptId: string }[]) ?? []) setPart(`a|${a.attemptId}`, core.presented(a.attemptId));
          for (const st of (d['standings'] as { standingKey: string }[]) ?? []) setPart(`s|${st.standingKey}`, st);
          break;
        }
        case 'oncourse.updated': setPart('oncourse', core.oncourse()); break;
        case 'diagnostics.updated': setPart('diagnostics', d['diagnostics']); break;
        case 'write.updated': setPart(`w|${String((d['write'] as { writeId: string }).writeId)}`, d['write']); break;
        default: break;
      }
    }
    return sum.toString(16).padStart(64, '0');
  }
  return {
    step(elements, deltas) {
      steps++;
      put({ i: steps, elements, deltas, stateHash: rehash(deltas) });
    },
    end() { put({ end: { steps } }); },
    reset() { sum = 0n; parts.clear(); },
  };
}
