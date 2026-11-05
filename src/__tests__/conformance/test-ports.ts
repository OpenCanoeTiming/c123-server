/** Controllable ports for the harness's own tests (no core involved). */
import type {
  ConformancePort,
  GivenElement,
  MergePort,
  NotificationMessage,
  StandingResult,
  VectorContext,
  WorkflowResult,
} from './port.js';

export interface Scripted {
  presented?: Record<string, Record<string, unknown>>;
  entry?: Record<string, unknown>;
  phases?: Record<string, Record<string, unknown>>;
  attempts?: unknown[];
  oncourse?: { attemptIds: string[]; featuredByUpstream?: unknown };
  diagnostics?: unknown[];
  writeRequest?: unknown;
  /** Messages the unit emits, by the order in which units are applied (0-based). */
  emit?: (unitNo: number, unit: GivenElement[]) => NotificationMessage[];
}

export interface Recorder {
  contexts: VectorContext[];
  /** Every unit handed to applyUnit, in order. */
  units: GivenElement[][];
  /** presented() call count after each applyUnit, to show state is read at the right moment. */
  appliedAtRead: number[];
}

export function scriptedPort(script: Scripted, rec?: Recorder, overrides?: Partial<ConformancePort>): ConformancePort {
  return {
    createMergePort(context: VectorContext): MergePort {
      rec?.contexts.push(context);
      const messages: NotificationMessage[] = [];
      let n = 0;
      return {
        applyUnit(elements) {
          rec?.units.push(elements);
          messages.push(...(script.emit?.(n, elements) ?? []));
          n++;
        },
        presented(attemptId) {
          rec?.appliedAtRead.push(n);
          return script.presented?.[attemptId] ?? {};
        },
        entry: () => script.entry ?? {},
        phase: (id) => script.phases?.[id] ?? {},
        attempts: () => script.attempts ?? [],
        oncourse: () => script.oncourse ?? { attemptIds: [] },
        diagnostics: () => script.diagnostics ?? [],
        writeRequest: () => script.writeRequest,
        notifications: () => messages,
      };
    },
    assembleStanding: () => ({ standing: [], anomalies: [] }),
    gateStatus: () => ({ gateStatus: {} }),
    ...overrides,
  };
}

export const newRecorder = (): Recorder => ({ contexts: [], units: [], appliedAtRead: [] });

const WRONG = '__wrong__';

/**
 * A port that answers every question wrongly and distinguishably (row 15). Reads of any field give
 * an envelope no vector expects; lists contain one bogus element; counts are never 0 or 1.
 */
export function wrongPort(): ConformancePort {
  const wrongEnvelope = new Proxy({}, { get: (_t, k) => (typeof k === 'string' ? { state: WRONG, value: WRONG } : undefined), has: () => true, getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true, value: { state: WRONG, value: WRONG } }) });
  const types = ['attempt.updated', 'oncourse.updated', 'standing.updated', 'scope.replaced', 'attempt.deleted'];
  return {
    createMergePort(): MergePort {
      const messages: NotificationMessage[] = [];
      return {
        applyUnit() {
          for (const type of types) for (let i = 0; i < 7; i++) messages.push({ type, attemptId: WRONG, fields: wrongEnvelope });
        },
        presented: () => wrongEnvelope as Record<string, unknown>,
        entry: () => wrongEnvelope as Record<string, unknown>,
        phase: () => wrongEnvelope as Record<string, unknown>,
        attempts: () => [WRONG],
        oncourse: () => ({ attemptIds: [WRONG], featuredByUpstream: WRONG }),
        diagnostics: () => [{ kind: WRONG }],
        writeRequest: () => ({ status: WRONG }),
        notifications: () => messages,
      };
    },
    assembleStanding: (): StandingResult => ({ standing: [{ entryId: WRONG, rank: -1 }], anomalies: [{ kind: WRONG }], ageCategoryId: WRONG }),
    gateStatus: (): WorkflowResult => ({ gateStatus: { [WRONG]: WRONG }, checks: [{ attemptId: WRONG }] }),
  };
}
