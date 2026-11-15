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
 * What the vector's `context` gives the core (round 19, #203 F5; reshaped #337). The harness keeps content age (resolved before `applyUnit`); the
 * core is told `attemptId`, the Attempt a keyless observation addresses (CONFORMANCE-VECTORS §1; the harness has defaulted it, so it is always a
 * string), and `xmlConfigured: false` where the vector states `context.xml: 'not-configured'` (`two-run-br1-unavailable-no-live-no-xml`); no other
 * `context.xml` value is given on site (DERIVATIONS §4.5, §10 item 30), so no other value is mapped. `MergeCoreOptions.attemptId` and
 * `MergeCoreOptions.xmlConfigured` are fixed here; the core follows them and keeps no "unnamed Attempt" of its own.
 */
export function createMergePort(context: VectorContext): MergePort {
  if (loaded.factory) return withConventionalClass(loaded.factory({ attemptId: context.attemptId, ...(context['xml'] === 'not-configured' ? { xmlConfigured: false } : {}) }));
  if (absent(loaded.error)) throw new CoreMissing('createMergePort (src/core)');
  throw loaded.error;
}

/**
 * CONFORMANCE-VECTORS §1 (round 27d-2; #287), the harness's alone: a Phase whose first unit carries no element of `classId`, `format` or `pair` has it
 * stated by the adapter in that unit, as a `tcp` result-row element like any other. The core and the parsers never derive any of the three from an id.
 *   - `classId` is the part of the id before the format token;
 *   - `format` is the id's token (or, for `pair`, the format the unit states);
 *   - `pair` is the token's role and combination (`CONTRACTS.md` §2.4). A second run names the id that carries its first run's token in the token's place,
 *     whether or not the vector holds that Phase. A first run names the second run only when that Phase has already been described here, so a first run's
 *     sibling is always a second run that names it back (DERIVATIONS §10 item 48; review N12 of PR #375); otherwise `null`. A single run states `pair: null`.
 * The one place anything builds an id, which a vector's regular ids allow.
 */
const PAIR_TOKENS: Record<string, { role: 'first' | 'second'; other: string; combination: 'best' | 'sum' }> = {
  BR1: { role: 'first', other: 'BR2', combination: 'best' }, BR2: { role: 'second', other: 'BR1', combination: 'best' },
  HT1: { role: 'first', other: 'HT2', combination: 'best' }, HT2: { role: 'second', other: 'HT1', combination: 'best' },
  EL1: { role: 'first', other: 'EL2', combination: 'best' }, EL2: { role: 'second', other: 'EL1', combination: 'best' },
  TR1: { role: 'first', other: 'TR2', combination: 'best' }, TR2: { role: 'second', other: 'TR1', combination: 'best' },
  SR1: { role: 'first', other: 'SR2', combination: 'sum' }, SR2: { role: 'second', other: 'SR1', combination: 'sum' },
  TS1: { role: 'first', other: 'TS2', combination: 'sum' }, TS2: { role: 'second', other: 'TS1', combination: 'sum' },
  SUF: { role: 'second', other: 'BR2', combination: 'sum' },
};
function withConventionalClass(port: MergePort): MergePort {
  const seen = new Set<string>();
  const applyUnit = port.applyUnit.bind(port);
  port.applyUnit = (elements) => {
    const named = new Set<string>();
    const stated = new Map<string, Set<string>>();
    const statedFormat = new Map<string, string>();
    for (const e of elements) {
      const snapshot = e['snapshot'] as { phaseId?: unknown } | undefined;
      const ids = [e['phaseId'], snapshot?.phaseId, typeof e['attemptId'] === 'string' ? e['attemptId'].slice(0, e['attemptId'].lastIndexOf(':')) : undefined];
      for (const id of ids) if (typeof id === 'string' && id !== '') named.add(id);
      if (typeof e['field'] === 'string' && typeof e['phaseId'] === 'string') {
        stated.set(e['phaseId'], (stated.get(e['phaseId']) ?? new Set()).add(e['field']));
        if (e['field'] === 'format' && typeof e['value'] === 'string') statedFormat.set(e['phaseId'], e['value']);
      }
    }
    const first = elements[0];
    const added: GivenElement[] = [];
    const before = new Set(seen);
    const state = (phaseId: string, field: string, value: unknown): void => {
      added.push({ ingestSeq: 0, phaseId, field, source: 'tcp', kind: 'result-row', observedAt: first!['observedAt'], value, confidence: 'authoritative' } as GivenElement);
    };
    for (const phaseId of named) {
      if (seen.has(phaseId)) continue;
      seen.add(phaseId);
      if (first === undefined) continue;
      const has = stated.get(phaseId) ?? new Set<string>();
      const { classKey, token, rest } = splitRaceId(phaseId);
      if (!has.has('classId')) state(phaseId, 'classId', classKey);
      if (!has.has('format')) state(phaseId, 'format', token);
      if (!has.has('pair')) {
        const row = PAIR_TOKENS[statedFormat.get(phaseId) ?? token];
        if (row === undefined) state(phaseId, 'pair', null);
        else {
          const otherId = `${classKey}_${row.other}_${rest}`;
          const sibling = row.role === 'second' || before.has(otherId) || named.has(otherId) ? otherId : null;
          state(phaseId, 'pair', { role: row.role, siblingPhaseId: sibling, combination: row.combination });
        }
      }
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
