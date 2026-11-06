/**
 * Maps `port.ts` onto the real core. The merge side is wired to `createMergeCore` (#203, `src/core/index.ts`); the Standing
 * Standing assembly is wired to `src/core/standing.ts` (#205, lazy like the core); the gate checks are not built yet (#211): `gateStatus` throws `CoreMissing`.
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

/**
 * What the vector's `context` gives the core (round 19, #203 F5). The harness keeps content age (resolved before `applyUnit`); the core is told
 * `attemptId`, the Attempt a keyless observation addresses (CONFORMANCE-VECTORS §1; the harness has defaulted it, so it is always a string), and
 * `xml` where the vector states it (`two-run-br1-unavailable-no-live-no-xml`: `'unreachable'`), verbatim. These two option names are fixed here
 * (`MergeCoreOptions.attemptId`, `MergeCoreOptions.xml`); the core follows them and keeps no "unnamed Attempt" of its own.
 */
export function createMergePort(context: VectorContext): MergePort {
  if (loaded.factory) return loaded.factory({ attemptId: context.attemptId, ...(context['xml'] !== undefined ? { xml: context['xml'] } : {}) });
  if (absent(loaded.error)) throw new CoreMissing('createMergePort (src/core)');
  throw loaded.error;
}

/** `src/core/standing.ts` (#205): `assembleStanding(given, scope)`, pure. Imported by a variable path so `tsc` does not need the file to exist yet. */
type StandingFn = (given: StandingGiven, scope: StandingScope) => StandingResult;
const STANDING_MODULE = '../../core/standing.js';
const standing: { fn?: StandingFn; error?: unknown } = await import(/* @vite-ignore */ STANDING_MODULE).then(
  (m: { assembleStanding: StandingFn }) => ({ fn: m.assembleStanding }),
  (error: unknown) => ({ error }),
);

export function assembleStanding(given: StandingGiven, scope: StandingScope): StandingResult {
  if (standing.fn) return standing.fn(given, scope);
  if (absent(standing.error)) throw new CoreMissing('assembleStanding (src/core/standing)');
  throw standing.error;
}

export function gateStatus(_given: WorkflowGiven): WorkflowResult {
  throw new CoreMissing('gateStatus');
}

export const corePort: ConformancePort = { createMergePort, assembleStanding, gateStatus };
