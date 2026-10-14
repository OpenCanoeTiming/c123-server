// Spike S1 types: the CONTRACTS §1.2 envelope and the CONFORMANCE-VECTORS §1 element vocabulary.

export type Source = 'tcp' | 'xml' | 'operator-write' | 'bridge';
export type Kind = 'inference' | 'result-row' | 'operator' | 'fragment' | 'structure';
export type UnavailableReason = 'not-configured' | 'source-unreachable' | 'not-applicable';

export type Known = {
  state: 'known';
  value: unknown;
  observedAt: string;
  eventTime?: string;
  source: Source;
  confidence: 'authoritative' | 'inferred';
  provisional: boolean;
};
export type Envelope = Known | { state: 'not-yet' } | { state: 'unavailable'; reason: UnavailableReason };

export const NOT_YET: Envelope = { state: 'not-yet' };

export type AttemptStatus =
  | 'not-started' | 'at-start' | 'on-course' | 'left-without-finish' | 'finished' | 'non-ranked'
  | 'dns' | 'dnf' | 'dsq' | 'dsq-r' | 'dqb' | 'cap' | 'ral' | 'other';
export const STATUS_ORDER: AttemptStatus[] = [
  'not-started', 'at-start', 'on-course', 'left-without-finish', 'finished', 'non-ranked',
  'dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other',
];
export const NO_RESULT_MARKS = ['dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other'];

export type Gate = { number: number; penalty: number | null; memberPenalties?: (number | null)[] };

/** Run-scoped fields, CONTRACTS §2.6 "Run generation". */
export const RUN_SCOPED = [
  'status', 'outcome', 'gates', 'splits', 'faults', 'placement', 'pairTotal', 'countingRun',
  'underReview', 'qualified', 'courseOrder', 'timeToBeat',
] as const;
export const ATTEMPT_FIELDS = [
  'entry', 'run', 'startOrder', 'scheduledStart', 'heat', 'startLane', ...RUN_SCOPED,
] as const;
/** Fields whose provisional flag follows §1.2's result rules (status is excluded, DERIVATIONS §4.1). */
export const RESULT_VALUE_FIELDS = ['outcome', 'gates', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified', 'faults', 'splits'];

/** One field statement of a resolved observation. `absent` = the statement "no result" (INV-7). */
export type FieldStatement = {
  field: string;
  value?: unknown;
  state?: 'known' | 'not-yet' | 'unavailable';
  reason?: UnavailableReason;
  absent?: true;
  eventTime?: string | null;
  confidence?: 'authoritative' | 'inferred';
  judgingComplete?: boolean | null;
  runClosed?: boolean;
  provisionalOverride?: boolean;
};

/** A scope-snapshot row, resolved (CONFORMANCE-VECTORS §1 shape, plus the fields our derivation adds). */
export type SnapshotRow = {
  bib: string;
  entryId?: string;
  startOrder?: number;
  scheduledStart?: string | null;
  status?: string;            // mark, as an AttemptStatus
  outcome?: unknown;          // resolved Outcome value when the row states a time
  placement?: { rank: number | null; order: number } | null;
  pairTotal?: number | null;
  countingRun?: 1 | 2;
  gates?: Gate[] | null;      // null = the row states no gate vector
  gatesUnavailable?: 'not-configured';
  finishTime?: string | null; // the row's own finish time of day as eventTime, XML only on the wire
  startTime?: string | null;  // the row's own start time (XML dtStart) as eventTime
  runSeconds?: number | null; // run time the row states (for INV-2d value matching)
  judgingComplete?: boolean | null;
  timeEmpty?: boolean;        // second-run row present with no run-2 time
  underReview?: boolean;
  qualified?: boolean;
  untimed?: boolean;
  upstreamCatRank?: number | null;
  unparseable?: { slot: number; text: string }[];
  explicitEntry?: boolean;
};

export type Element =
  | { type: 'observation'; observedAt: string; source: Source; kind: Kind; scope: 'attempt'; attemptId: string;
      fields: FieldStatement[]; run?: number; finishTime?: string | null; runSeconds?: number | null; rowStatus?: string | null }
  | { type: 'observation'; observedAt: string; source: Source; kind: Kind; scope: 'phase' | 'entry' | 'class' | 'course' | 'event';
      id: string; fields: FieldStatement[] }
  | { type: 'event'; event: 'tcp-connected' | 'tcp-disconnected' | 'xml-rewrite-detected' | 'oncourse-empty' | 'oncourse-left' | 'rebaseline' | 'delete';
      observedAt: string; attemptId?: string; scope?: { kind: 'phase'; phaseId: string } | { kind: 'event' } }
  | { type: 'snapshot'; observedAt: string; source: 'tcp' | 'xml'; phaseId: string; mode: 'results' | 'start-list'; rows: SnapshotRow[];
      classId?: string; mainTitle?: string }
  | { type: 'listing'; observedAt: string; attemptId: string; dtStart: string | null; dtFinish: string | null; completed?: boolean;
      fields: FieldStatement[]; finishRunSeconds?: number | null; chStart?: boolean }
  | { type: 'structure'; observedAt: string; source: 'tcp' | 'xml'; what: string; payload: unknown };

export type Delta = { seq: number; type: string; [k: string]: unknown };

export type Diagnostic =
  | { kind: 'source-disagreement'; attemptId: string; field: string; sources: Source[] }
  | { kind: 'contradicted-finish'; attemptId: string; finishTime: string | null }   // null: TCP rows carry no finish time (S1 gap)
  | { kind: 'duplicate-finish'; phaseId: string; finishTime: string; bibs: string[] }
  | { kind: 'stale-mark'; attemptId: string; run: number; mark: string }
  | { kind: 'member-sum-mismatch'; attemptId: string; gate: number; crew: number; members: (number | null)[] }
  | { kind: 'unparseable-cell'; attemptId: string; source: Source; slot: number; text: string };
