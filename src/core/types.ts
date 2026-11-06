/**
 * Internal shapes of the merge core (#203). Wire shapes come from `@opencanoetiming/c123-contract`; what is here is retention,
 * which never leaves the core. Nothing here reads a clock: every time is taken from an element.
 */
import type { ClassificationRow, Diagnostic, Faults, Gate, Placement, ResultMark, WriteRequest } from '@opencanoetiming/c123-contract';
import type { IngestElement } from '../ingest/index.js';

export type { ClassificationRow, Diagnostic, Faults, Gate, Placement, ResultMark };
export type Element = IngestElement;
export type Row = Record<string, unknown>;
export type Source = 'tcp' | 'xml';
export type Message = { type: string; seq: number; [key: string]: unknown };

/** One retained observation. A retraction is one too: `state: 'not-yet'`, `marker: true`, with its own sequence (INV-7). */
export interface Slot {
  state: 'known' | 'not-yet' | 'unavailable';
  value?: unknown;
  reason?: string;
  source: Source | 'operator-write';
  kind: 'row' | 'inference' | 'operator';
  confidence: 'authoritative' | 'inferred';
  observedAt: string;
  /** `observedAt` as a number, for content-age comparisons on our own clock only (INV-2c). */
  at: number;
  /** Ingest sequence (INV-6). */
  seq: number;
  /** TCP continuity: how many disconnects preceded this observation (INV-2 rule 2). */
  epoch: number;
  /** Content age in ms (INV-2c): the event's `changedAfter` for xml, null = unknown; `at` for tcp. */
  age: number | null;
  eventTime?: string;
  judgingComplete?: boolean | null;
  /** A retraction or a contradiction, not an upstream value. */
  marker?: boolean;
  /** `operator-write` only (rule 4). */
  provisional?: boolean;
}

/** The latest observation per source of one field: refused candidates stay here, with their content age. */
export interface FieldSlots {
  tcp?: Slot;
  xml?: Slot;
  inference?: Slot;
  operator?: Slot;
}

export type Contradicted = { finishTime: string | null; runSeconds: number };

export interface Generation {
  n: number;
  /** The generation's recorded start, as the stream states it; undefined until one is observed. */
  start?: string;
  /** A row with a time or a mark has recorded this run (DERIVATIONS §4.11 "Recorded"); kept through a retraction, cleared by a contradiction. */
  recorded: boolean;
  /** The marks either source held when the start was recorded: a row carrying one records nothing (§4.11, K1M_BR2_19:54). */
  markAtStart: ResultMark[];
  /** The listing being applied moved the start inside this generation (§4.11); §4.3's stops do not hold its `Time` back. */
  correcting: boolean;
  /** The generation began with an observed new start (DERIVATIONS §4.11): rows need attributing. */
  needsAttribution: boolean;
  finish?: { eventTime?: string; runSeconds?: number };
  /** The listing that starts this run has been seen (§1.2, the carried-over fields). */
  started: boolean;
  /** `Completed="Y"` was seen, or a result stated `runClosed`. */
  completed: boolean;
  firstEnvelope: { observedAt: string; source: Source };
}

export interface AttemptState {
  id: string;
  phaseId: string;
  bib: string;
  slots: Map<string, FieldSlots>;
  gen: Generation;
  listed: boolean;
  lastListedAt: number;
  /** The leave flag (DERIVATIONS §4.1): clears on re-listing. */
  left: boolean;
  /** The mark carried when the generation incremented (§4.12). */
  remembered?: ResultMark;
  /** A remembered mark withheld from the row last seen: the `stale-mark` diagnostic. */
  withheld?: ResultMark;
  /** The active contradiction (INV-2d), until lifted. */
  contradiction?: Contradicted;
  /** Every finish contradicted in this generation: rows carrying one stay unpresented, also after the lift. */
  held: Contradicted[];
  /** TCP rows with a time waiting for this generation's finish (§4.11). */
  pending: { row: Row; source: Source; observedAt: string; seq: number; epoch: number; age: number | null }[];
  /** Rows retained and never presented: a replaced run's, or one carrying a contradicted finish. */
  history: Partial<Record<Source, Row>>;
  /** Latest cells per channel while no course is bound (§0.5, §4.6). */
  cells: Partial<Record<'tcp' | 'xml' | 'inference', { cells: (number | null)[]; slot: Slot }>>;
  /** Fields carried over from run 1 while run 2 runs (§1.2). */
  carried: Set<string>;
  untimed: boolean;
  created: boolean;
  sent: Map<string, string>;
  /** Fields a generation change sends even when already `not-yet` (TEST-ARCHITECTURE property 10). */
  force: Set<string>;
  diagnostics: Diagnostic[];
  /** The finish `eventTime` last presented, for `duplicate-finish`. */
  finish?: string;
}

export interface ResourceState {
  id: string;
  fields: Map<string, FieldSlots>;
  plain: Map<string, unknown>;
  created: boolean;
  sent: Map<string, string>;
  /** Phase only: the snapshot has assigned `date` (INV-5). */
  dateFixed?: boolean;
  /** Phase only: the attempts of this race. */
  attempts?: Set<AttemptState>;
}

export interface ClassificationState {
  rows: ClassificationRow[];
  asOf: string;
  builtBy: Source;
  at: number;
}

export interface WriteState extends WriteRequest {
  attempt: AttemptState;
  fieldName: string;
}

export interface Counters {
  generations: number;
  retractions: number;
  contradictions: number;
  leaves: number;
  refusals: Record<string, number>;
}

export interface MergeCoreOptions {
  /** IANA zone of the venue (DERIVATIONS §0.2); without it a bare time of day stays unbuilt, `eventTime` omitted. */
  zone?: string;
  /** The XML source is not configured (SourceStatus.xml): nothing can ever bind a course. */
  xmlConfigured?: boolean;
  /** First `seq` (the persisted high-water mark, CONTRACTS §1.6). */
  initialSeq?: number;
  /** The Attempt a keyless observation addresses (CONFORMANCE-VECTORS §1, `context.attemptId`). The parsers always name one. */
  attemptId?: string;
  /** `context.xml` where a vector states it; `'unreachable'`: the XML source is configured and not answering. */
  xml?: string;
}

/** Everything one core holds. No module state: two cores never share anything. */
export interface CoreState {
  options: MergeCoreOptions;
  counter: number;
  /** TCP disconnects so far. */
  epoch: number;
  tcpUp: boolean | undefined;
  /** The latest `xml-rewrite-detected`; `null` age = unknown. */
  rewrite: { changedAfter: number | null } | undefined;
  xmlRead: boolean;
  /** Receipt of the previous TCP message, for the leave rule. */
  previousTcpAt: number | undefined;
  attempts: Map<string, AttemptState>;
  phases: Map<string, ResourceState>;
  entries: Map<string, ResourceState>;
  classes: Map<string, ResourceState>;
  courses: Map<string, ResourceState>;
  classifications: Map<string, ClassificationState>;
  listed: Map<string, AttemptState>;
  oncourseAsOf: string | null;
  oncourseSent: string;
  featured: { odd: { attemptId: string } | null; even: { attemptId: string } | null } | null;
  writes: WriteState[];
  /** The latest `RaceConfig`'s armed splits (§2.3, §4.8): session state, held for no Phase. */
  splitsArmed: boolean | undefined;
  parserDiagnostics: Map<string, Diagnostic>;
  phaseDiagnostics: Map<string, Diagnostic[]>;
  diagnosticsSent: string;
  diagnosticsDirty: boolean;
  log: Message[];
  dirtyAttempts: Set<AttemptState>;
  dirtyPhases: Set<ResourceState>;
  dirtyResources: Set<{ type: 'entry' | 'class' | 'course'; resource: ResourceState }>;
  dirtyWrites: Set<WriteState>;
  pendingRebaseline: unknown;
  counters: Counters;
}
