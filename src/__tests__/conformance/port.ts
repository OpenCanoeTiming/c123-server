/**
 * The seam between the conformance harness and the core (issue #200).
 *
 * Tests never reach into the core. This file declares what the harness needs; `core-adapter.ts`
 * maps it onto the real code and throws `CoreMissing` until that code exists. Observations are
 * resolved (CONFORMANCE-VECTORS §1), so nothing is parsed here. The clock is the vector's own
 * `observedAt`; there is no real time anywhere.
 */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** The vector's `context`, with the harness defaults applied (see `run-vector.ts::resolveContext`). */
export interface VectorContext {
  /** The Attempt the vector's unprefixed `expect` keys address (default `K1M_BR1_6:9`). */
  attemptId: string;
  /** Content-age interval, CONFORMANCE-VECTORS §1 "Content age"; default 5 where the vector has none. */
  xmlPollIntervalSeconds: number;
  /** Every other context key, verbatim (`tcpConnectedThroughout`, `discipline`, `tier`, `phase`, ...). */
  [key: string]: unknown;
}

/** An observation: carries `field`. Source-less ones (`state: 'unavailable'`) have no `source`. */
export interface ObservationElement {
  ingestSeq: number;
  field: string;
  observedAt: string;
  source?: 'tcp' | 'xml' | 'operator-write';
  kind?: 'inference' | 'result-row' | 'operator' | 'fragment';
  value?: unknown;
  confidence?: 'authoritative' | 'inferred';
  state?: 'unavailable';
  reason?: string;
  eventTime?: string;
  run?: number;
  judgingComplete?: boolean | null;
  runClosed?: boolean;
  attemptId?: string;
  /** Observation-level `scope` (CONFORMANCE-VECTORS §1 "Scope of a field"): `'phase'` makes `status`/`scheduledStart` the Phase's. */
  scope?: string;
  /**
   * Added by the harness, never in the vector data: which resource this observation addresses, resolved by the
   * §1 "Scope of a field" rule. A `phase` observation also carries `phaseId`.
   */
  resource?: 'attempt' | 'entry' | 'phase';
  phaseId?: string;
  [extra: string]: unknown;
}

/** A connection or operator event (`tcp-disconnected`, `rebaseline`, `oncourse-left`, `delete`, ...). */
export interface EventElement {
  ingestSeq: number;
  event: string;
  observedAt: string;
  attemptId?: string;
  scope?: unknown;
  [extra: string]: unknown;
}

export interface SnapshotElement {
  ingestSeq: number;
  observedAt: string;
  snapshot: { source: string; phaseId: string; mode: 'results' | 'start-list'; rows: unknown[] };
}

/** A bare §8.3 push (live tier). Not run by c123-server, but part of the format. */
export interface PushElement {
  ingestSeq: number;
  observedAt: string;
  push: 'entry' | 'class' | 'phase' | 'course' | 'oncourse' | 'classification';
  body: unknown;
  phaseId?: string;
}

export type GivenElement = ObservationElement | EventElement | SnapshotElement | PushElement;

export type NotificationMessage = { type: string; [k: string]: unknown };

export interface MergePort {
  /** One upstream message: the unit rule (CONFORMANCE-VECTORS §1; CONTRACTS §1.6). Notifies once, after the unit. */
  applyUnit(elements: GivenElement[]): void;
  /** field -> envelope, plus the Attempt's plain fields. */
  presented(attemptId: string): Record<string, unknown>;
  /**
   * The presented Entry of `context.attemptId`, keyed by field name (`displayName`, `ageCategoryId`, `members`, ...).
   * A path such as `members[0].externalId` is read by the harness by walking this object.
   */
  entry(): Record<string, unknown>;
  /** The Phase's presented fields, keyed by field name; `phaseId` is `context.phase`, else the phase of `context.attemptId`. */
  phase(phaseId: string): Record<string, unknown>;
  /** The attemptIds of every Attempt that exists, as strings. */
  attempts(): unknown[];
  oncourse(): { attemptIds: string[]; featuredByUpstream?: unknown };
  diagnostics(): unknown[];
  /** The write status (`pending`, `confirmed`, `mismatched`, `superseded`, ...). */
  writeRequest(): unknown;
  /** Client-visible messages so far (§7.2 on site), flushed per unit. Append-only. */
  notifications(): NotificationMessage[];
}

export type StandingScope =
  | { kind: 'phase'; phaseId: string }
  | { kind: 'pair'; firstPhaseId: string; secondPhaseId: string }
  | { kind: 'heat'; phaseId: string; heat: number }
  | { kind: string; [k: string]: unknown };

/** `given.entries` plus the vector-level `ageCategoryId` and `upstreamCategoryRanks`, where present. */
export interface StandingGiven {
  entries: Array<Record<string, unknown>>;
  ageCategoryId?: string;
  upstreamCategoryRanks?: Record<string, number>;
}

export interface StandingResult {
  standing: unknown[];
  anomalies: unknown[];
  /**
   * The assembled Standing's own `ageCategoryId` (CONTRACTS §5: null = whole class). Asserted whenever the vector's
   * `expect` states one (`standing-age-category-assembled`).
   */
  ageCategoryId?: string | null;
}

/** `given` of a workflow-state vector: or a `then` step's new `presented`. */
export interface WorkflowGiven {
  checks: Array<Record<string, unknown>>;
  flags: unknown[];
  presented: Record<string, { run: number; gates: unknown[] | null }>;
}

export interface WorkflowResult {
  gateStatus: Record<string, string>;
  checks?: unknown[];
}

/** What the harness takes. `core-adapter.ts` provides the real one. */
export interface ConformancePort {
  createMergePort(context: VectorContext): MergePort;
  assembleStanding(given: StandingGiven, scope: StandingScope): StandingResult;
  gateStatus(given: WorkflowGiven): WorkflowResult;
}
