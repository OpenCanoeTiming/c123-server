/**
 * Maps `port.ts` onto the real core. The merge side is wired to `createMergeCore` (#203, `src/core/index.ts`); the Standing
 * Standing assembly is wired to `src/core/standing.ts` (#205, lazy like the core); the gate checks are wired to `src/core/workflow.ts` (#211, lazy like the others).
 *
 * Thin by design. When a core issue lands, its test author wires the matching function here.
 *
 * `src/core` is imported lazily (top-level `await import`, outcome kept) so that while the module is absent only the callers of
 * `createMergePort` fail, and the standing/check vectors, ingest and tools tests keep running. A module that exists but
 * throws on load is rethrown unchanged at the call, never read as `CoreMissing`.
 */
import type {
  ConformancePort,
  GivenElement,
  MergePort,
  StandingGiven,
  StandingResult,
  StandingScope,
  VectorContext,
  WorkflowGiven,
  WorkflowResult,
} from './port.js';
import { splitRaceId } from '../../ingest/common.js';

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
  if (loaded.factory) return withConventionalClass(loaded.factory({ attemptId: context.attemptId, ...(context['xml'] !== undefined ? { xml: context['xml'] } : {}) }));
  if (absent(loaded.error)) throw new CoreMissing('createMergePort (src/core)');
  throw loaded.error;
}

/**
 * CONFORMANCE-VECTORS §1 (round 27d-2), the harness's alone: a Phase first observed with no `classId` element gets the id's class part
 * (the part before the format token) as its `classId`, stated in that unit. The core and the parsers never derive a class from an id.
 */
function withConventionalClass(port: MergePort): MergePort {
  const seen = new Set<string>();
  const applyUnit = port.applyUnit.bind(port);
  port.applyUnit = (elements) => {
    const named = new Set<string>();
    const stated = new Set<string>();
    for (const e of elements) {
      const snapshot = e['snapshot'] as { phaseId?: unknown } | undefined;
      const ids = [e['phaseId'], snapshot?.phaseId, typeof e['attemptId'] === 'string' ? e['attemptId'].slice(0, e['attemptId'].lastIndexOf(':')) : undefined];
      for (const id of ids) if (typeof id === 'string' && id !== '') named.add(id);
      if (e['field'] === 'classId' && typeof e['phaseId'] === 'string') stated.add(e['phaseId']);
    }
    const first = elements[0];
    const added: GivenElement[] = [];
    for (const phaseId of named) {
      if (seen.has(phaseId)) continue;
      seen.add(phaseId);
      if (stated.has(phaseId) || first === undefined) continue;
      added.push({ ingestSeq: 0, phaseId, field: 'classId', source: 'tcp', kind: 'result-row', observedAt: first['observedAt'], value: splitRaceId(phaseId).classKey } as GivenElement);
    }
    applyUnit([...added, ...elements]);
  };
  return port;
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

/** `src/core/workflow.ts` (#211): `gateStatus(given)`, pure. Imported by a variable path so `tsc` does not need the file to exist yet. */
type GateStatusFn = (given: WorkflowGiven) => WorkflowResult;
const WORKFLOW_MODULE = '../../core/workflow.js';
const workflow: { fn?: GateStatusFn; error?: unknown } = await import(/* @vite-ignore */ WORKFLOW_MODULE).then(
  (m: { gateStatus: GateStatusFn }) => ({ fn: m.gateStatus }),
  (error: unknown) => ({ error }),
);

export function gateStatus(given: WorkflowGiven): WorkflowResult {
  if (workflow.fn) return workflow.fn(given);
  if (absent(workflow.error)) throw new CoreMissing('gateStatus (src/core/workflow)');
  throw workflow.error;
}

export const corePort: ConformancePort = { createMergePort, assembleStanding, gateStatus };
