/**
 * Maps `port.ts` onto the real core. The core does not exist yet (M1, #203/#204/#205/#211/#212):
 * every entry point throws `CoreMissing`, so every vector fails for that one reason.
 *
 * Thin by design. When a core issue lands, its test author wires the matching function here.
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

export function createMergePort(_context: VectorContext): MergePort {
  throw new CoreMissing('createMergePort');
}

export function assembleStanding(_given: StandingGiven, _scope: StandingScope): StandingResult {
  throw new CoreMissing('assembleStanding');
}

export function gateStatus(_given: WorkflowGiven): WorkflowResult {
  throw new CoreMissing('gateStatus');
}

export const corePort: ConformancePort = { createMergePort, assembleStanding, gateStatus };
