/**
 * Maps `port.ts` onto the real core. The merge side is wired to `createMergeCore` (#203, `src/core/index.ts`); the Standing
 * assembly and the gate checks are not built yet (#205, #211): `assembleStanding` and `gateStatus` throw `CoreMissing`.
 *
 * Thin by design. When a core issue lands, its test author wires the matching function here.
 *
 * `src/core` is imported lazily (top-level `await import`, outcome kept) so that while the module is absent only the callers of
 * `createMergePort` fail, and the standing/check vectors, ingest and tools tests keep running. A module that exists but
 * throws on load is rethrown unchanged at the call, never read as `CoreMissing`.
 */
import type {
  ConformancePort,
  MergePort,
  StandingGiven,
  StandingResult,
  StandingScope,
  VectorContext,
  WorkflowGiven,
  WorkflowResult,
} from './port.js';

export class CoreMissing extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
    this.name = 'CoreMissing';
  }
}

type MergeCoreFactory = (options: Record<string, unknown>) => MergePort;
const loaded: { factory?: MergeCoreFactory; error?: unknown } = await import('../../core/index.js').then(
  (m: { createMergeCore: MergeCoreFactory }) => ({ factory: m.createMergeCore }),
  (error: unknown) => ({ error }),
);
const absent = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && ((e as { code?: string }).code === 'ERR_MODULE_NOT_FOUND' || /Cannot find (module|package)|Failed to load url|Failed to resolve import/i.test(String((e as Error).message)));

/** The vector's `context` is the harness's (content age is resolved before `applyUnit`); the core takes no per-vector setting. */
export function createMergePort(_context: VectorContext): MergePort {
  if (loaded.factory) return loaded.factory({});
  if (absent(loaded.error)) throw new CoreMissing('createMergePort (src/core)');
  throw loaded.error;
}

export function assembleStanding(_given: StandingGiven, _scope: StandingScope): StandingResult {
  throw new CoreMissing('assembleStanding');
}

export function gateStatus(_given: WorkflowGiven): WorkflowResult {
  throw new CoreMissing('gateStatus');
}

export const corePort: ConformancePort = { createMergePort, assembleStanding, gateStatus };
