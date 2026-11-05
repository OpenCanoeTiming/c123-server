// Rows 4-7. CONTRACTS §1.4, §3.1, §7.1-§7.4. Compile-time assertions, enforced by
// vitest typecheck (vitest.config.ts). Names that CONTRACTS does not give are fixed
// here and the implementer follows them (issue #199 "Naming").
import { expectTypeOf, test } from 'vitest'
import type {
  Attempt, Class, Course, Entry, Event, GateCheck, GateFlag, Observed, Person, Phase,
  PhaseStatus, SourceStatus, SourceTag, Standing, Timestamp, WriteRequest,
  // names fixed by this test:
  ErrorCode, ErrorEnvelope, WriteNotPossibleReason, Diagnostic, OnsitePerson, OnsiteEntry,
  EventCurrentResponse, ClassPhasesResponse, ClassEntriesResponse, PhaseAttemptsResponse,
  ClassStandingsResponse, OnCourseResponse, PhaseChecksResponse, SourcesResponse,
  DiagnosticsResponse, RebaselineScope, RebaselineRequest, RebaselineResponse, WsMessage,
  PenaltyWriteRequest, GateCheckRequest, GateFlagCreateRequest, FlagResolutionRequest,
} from '../index.js'
import type { OptionalKeys, RequiredKeys } from './_types.js'

type Msg<T extends string> = Extract<WsMessage, { type: T }>

const ERROR_CODES = [
  'event-not-found', 'class-not-found', 'course-not-found', 'phase-not-found',
  'attempt-not-found', 'write-not-found', 'flag-not-found', 'write-not-possible',
  'validation-failed', 'vendor-payload-rejected', 'unauthorized', 'forbidden',
  'rate-limited', 'source-unavailable',
] as const
type ErrorCodes = (typeof ERROR_CODES)[number]

// ---------------------------------------------------------------- row 4
test('error envelope per §1.4: code is the closed union, message a string', () => {
  expectTypeOf<ErrorCode>().toEqualTypeOf<ErrorCodes>()
  expectTypeOf<ErrorEnvelope>().toHaveProperty('error')
  expectTypeOf<ErrorEnvelope['error']['code']>().toEqualTypeOf<ErrorCode>()
  expectTypeOf<ErrorEnvelope['error']['message']>().toEqualTypeOf<string>()
  expectTypeOf<RequiredKeys<ErrorEnvelope>>().toEqualTypeOf<'error'>()
  expectTypeOf<RequiredKeys<ErrorEnvelope['error']>>().toEqualTypeOf<'code' | 'message'>()
  expectTypeOf<OptionalKeys<ErrorEnvelope['error']>>().toEqualTypeOf<'details'>()
  // @ts-expect-error code outside the closed vocabulary
  const bad: ErrorEnvelope = { error: { code: 'no-such-code', message: 'x' } }
  // @ts-expect-error code is required
  const noCode: ErrorEnvelope = { error: { message: 'x' } }
  void [bad, noCode]
})

// ---------------------------------------------------------------- row 5 (§3.1 PhaseStatus used by Phase.status)
test('§7.1 phase status vocabulary per §3.1 is closed (10 values)', () => {
  expectTypeOf<PhaseStatus>().toEqualTypeOf<
    'scheduled' | 'running' | 'paused' | 'unofficial' | 'official' | 'revised'
    | 'protested' | 'postponed' | 'cancelled' | 'other'
  >()
  expectTypeOf<Phase['status']>().toEqualTypeOf<Observed<PhaseStatus>>()
})

// ---------------------------------------------------------------- row 5: on-site tier serialisation (§7 header)
test('§7.1 Entry on-site: Person.birthDate is replaced by birthYear: number | null', () => {
  expectTypeOf<RequiredKeys<OnsitePerson>>().toEqualTypeOf<'givenName' | 'familyName' | 'birthYear' | 'externalId'>()
  expectTypeOf<OptionalKeys<OnsitePerson>>().toEqualTypeOf<never>()
  expectTypeOf<OnsitePerson['birthYear']>().toEqualTypeOf<number | null>()
  expectTypeOf<OnsitePerson['externalId']>().toEqualTypeOf<Person['externalId']>()
  expectTypeOf<keyof OnsiteEntry>().toEqualTypeOf<keyof Entry>()
  expectTypeOf<OnsiteEntry['members']>().toEqualTypeOf<Observed<OnsitePerson[]>>()
  expectTypeOf<OnsiteEntry['displayName']>().toEqualTypeOf<Entry['displayName']>()
  expectTypeOf<OnsiteEntry['isTeam']>().toEqualTypeOf<Entry['isTeam']>()
  expectTypeOf<'birthDate' extends keyof OnsitePerson ? true : false>().toEqualTypeOf<false>()
})

// ---------------------------------------------------------------- row 5: one per REST row of §7.1
test('§7.1 GET /api/events/current', () => {
  expectTypeOf<keyof EventCurrentResponse>().toEqualTypeOf<'asOfSeq' | 'event' | 'classes' | 'courses'>()
  expectTypeOf<RequiredKeys<EventCurrentResponse>>().toEqualTypeOf<'asOfSeq' | 'event' | 'classes' | 'courses'>()
  expectTypeOf<EventCurrentResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<EventCurrentResponse['event']>().toEqualTypeOf<Event>()
  expectTypeOf<EventCurrentResponse['classes']>().toEqualTypeOf<Class[]>()
  expectTypeOf<EventCurrentResponse['courses']>().toEqualTypeOf<Course[]>()
})

test('§7.1 GET /api/classes/{classId}/phases', () => {
  expectTypeOf<keyof ClassPhasesResponse>().toEqualTypeOf<'asOfSeq' | 'phases'>()
  expectTypeOf<ClassPhasesResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<ClassPhasesResponse['phases']>().toEqualTypeOf<Phase[]>()
})

test('§7.1 GET /api/classes/{classId}/entries', () => {
  expectTypeOf<keyof ClassEntriesResponse>().toEqualTypeOf<'asOfSeq' | 'entries'>()
  expectTypeOf<ClassEntriesResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<ClassEntriesResponse['entries']>().toEqualTypeOf<OnsiteEntry[]>()
})

test('§7.1 GET /api/phases/{phaseId}/attempts', () => {
  expectTypeOf<keyof PhaseAttemptsResponse>().toEqualTypeOf<'asOfSeq' | 'attempts'>()
  expectTypeOf<PhaseAttemptsResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<PhaseAttemptsResponse['attempts']>().toEqualTypeOf<Attempt[]>()
})

test('§7.1 GET /api/classes/{classId}/standings', () => {
  expectTypeOf<keyof ClassStandingsResponse>().toEqualTypeOf<'asOfSeq' | 'standings'>()
  expectTypeOf<ClassStandingsResponse['asOfSeq']>().toEqualTypeOf<number>()
  // on-site keeps anomalies (§2.7)
  expectTypeOf<ClassStandingsResponse['standings']>().toEqualTypeOf<Standing[]>()
  expectTypeOf<'anomalies' extends keyof Standing ? true : false>().toEqualTypeOf<true>()
})

test('§7.1 GET /api/oncourse', () => {
  expectTypeOf<keyof OnCourseResponse>().toEqualTypeOf<'asOfSeq' | 'attempts' | 'featuredByUpstream' | 'asOf'>()
  expectTypeOf<RequiredKeys<OnCourseResponse>>().toEqualTypeOf<'asOfSeq' | 'attempts' | 'featuredByUpstream' | 'asOf'>()
  expectTypeOf<OnCourseResponse['attempts']>().toEqualTypeOf<Attempt[]>()
  expectTypeOf<OnCourseResponse['featuredByUpstream']>().toEqualTypeOf<string | null>()
  expectTypeOf<OnCourseResponse['asOf']>().toEqualTypeOf<Timestamp | null>()
})

test('§7.1 GET /api/phases/{phaseId}/checks', () => {
  expectTypeOf<keyof PhaseChecksResponse>().toEqualTypeOf<'asOfSeq' | 'checks' | 'flags'>()
  expectTypeOf<PhaseChecksResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<PhaseChecksResponse['checks']>().toEqualTypeOf<GateCheck[]>()
  expectTypeOf<PhaseChecksResponse['flags']>().toEqualTypeOf<GateFlag[]>()
})

test('§7.1 GET /api/sources is SourceStatus, unwrapped (no asOfSeq)', () => {
  expectTypeOf<SourcesResponse>().toEqualTypeOf<SourceStatus>()
  expectTypeOf<'asOfSeq' extends keyof SourcesResponse ? true : false>().toEqualTypeOf<false>()
})

test('§7.1 GET /api/diagnostics', () => {
  expectTypeOf<keyof DiagnosticsResponse>().toEqualTypeOf<'asOfSeq' | 'diagnostics'>()
  expectTypeOf<DiagnosticsResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<DiagnosticsResponse['diagnostics']>().toEqualTypeOf<Diagnostic[]>()
})

test('§7.1 diagnostics: the six kinds of §4 INV-2b with their stated fields', () => {
  expectTypeOf<Diagnostic['kind']>().toEqualTypeOf<
    'source-disagreement' | 'contradicted-finish' | 'duplicate-finish'
    | 'stale-mark' | 'member-sum-mismatch' | 'unparseable-cell'
  >()
  type D<K extends Diagnostic['kind']> = Extract<Diagnostic, { kind: K }>
  expectTypeOf<keyof D<'source-disagreement'>>().toEqualTypeOf<'kind' | 'attemptId' | 'field' | 'sources'>()
  expectTypeOf<D<'source-disagreement'>['attemptId']>().toEqualTypeOf<string>()
  expectTypeOf<D<'source-disagreement'>['field']>().toEqualTypeOf<string>()
  expectTypeOf<D<'source-disagreement'>['sources']>().toEqualTypeOf<SourceTag[]>()
  expectTypeOf<keyof D<'contradicted-finish'>>().toEqualTypeOf<'kind' | 'attemptId' | 'finishTime' | 'runSeconds'>()
  expectTypeOf<D<'contradicted-finish'>['finishTime']>().toEqualTypeOf<Timestamp | null>()
  expectTypeOf<D<'contradicted-finish'>['runSeconds']>().toEqualTypeOf<number>()
  expectTypeOf<keyof D<'duplicate-finish'>>().toEqualTypeOf<'kind' | 'phaseId' | 'finishTime' | 'bibs'>()
  expectTypeOf<D<'duplicate-finish'>['phaseId']>().toEqualTypeOf<string>()
  expectTypeOf<D<'duplicate-finish'>['bibs']>().toEqualTypeOf<string[]>()
  expectTypeOf<keyof D<'stale-mark'>>().toEqualTypeOf<'kind' | 'attemptId' | 'run' | 'mark'>()
  expectTypeOf<D<'stale-mark'>['run']>().toEqualTypeOf<number>()
  expectTypeOf<keyof D<'member-sum-mismatch'>>().toEqualTypeOf<'kind' | 'attemptId' | 'gate' | 'crew' | 'members'>()
  expectTypeOf<D<'member-sum-mismatch'>['gate']>().toEqualTypeOf<number>()
  expectTypeOf<D<'member-sum-mismatch'>['crew']>().toEqualTypeOf<number>()
  expectTypeOf<D<'member-sum-mismatch'>['members']>().toEqualTypeOf<(number | null)[]>()
  expectTypeOf<keyof D<'unparseable-cell'>>().toEqualTypeOf<'kind' | 'attemptId' | 'source' | 'slot' | 'text'>()
  expectTypeOf<D<'unparseable-cell'>['text']>().toEqualTypeOf<string>()
  expectTypeOf<D<'unparseable-cell'>['slot']>().toEqualTypeOf<number>()
})

test('§7.1 POST /api/rebaseline', () => {
  expectTypeOf<RebaselineScope>().toEqualTypeOf<{ kind: 'phase'; phaseId: string } | { kind: 'event' }>()
  expectTypeOf<keyof RebaselineRequest>().toEqualTypeOf<'scope'>()
  expectTypeOf<RebaselineRequest['scope']>().toEqualTypeOf<RebaselineScope>()
  expectTypeOf<keyof RebaselineResponse>().toEqualTypeOf<
    'asOfSeq' | 'scope' | 'snapshotWrittenAt' | 'snapshotDetectedAt' | 'attempts'
  >()
  expectTypeOf<RebaselineResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<RebaselineResponse['scope']>().toEqualTypeOf<RebaselineScope>()
  expectTypeOf<RebaselineResponse['attempts']>().toEqualTypeOf<number>()
  // the contract names the two timestamps but does not type them; they must be present and string-valued
  expectTypeOf<RebaselineResponse['snapshotWrittenAt']>().toExtend<string | null>()
  expectTypeOf<RebaselineResponse['snapshotDetectedAt']>().toExtend<string | null>()
})

test('§7.1 refusal codes of the read table are in the §1.4 union', () => {
  expectTypeOf<
    'event-not-found' | 'class-not-found' | 'phase-not-found' | 'source-unavailable'
  >().toExtend<ErrorCode>()
})

// ---------------------------------------------------------------- row 6
test('§7.2 WebSocket message set is exactly the 14 types, each with seq', () => {
  expectTypeOf<WsMessage['type']>().toEqualTypeOf<
    'attempt.updated' | 'phase.updated' | 'entry.updated' | 'class.updated'
    | 'standing.updated' | 'course.updated' | 'write.updated' | 'sources.updated'
    | 'check.updated' | 'flag.updated' | 'oncourse.updated' | 'diagnostics.updated'
    | 'event.changed' | 'scope.replaced'
  >()
  expectTypeOf<WsMessage['seq']>().toEqualTypeOf<number>()
})

test('§7.2 attempt.updated: attemptId and only the changed Observed fields of §2.6', () => {
  type M = Msg<'attempt.updated'>
  expectTypeOf<RequiredKeys<M>>().toEqualTypeOf<'seq' | 'type' | 'attemptId' | 'fields'>()
  expectTypeOf<M['attemptId']>().toEqualTypeOf<string>()
  type F = M['fields']
  expectTypeOf<RequiredKeys<F>>().toEqualTypeOf<never>()
  expectTypeOf<OptionalKeys<F>>().toEqualTypeOf<
    'entry' | 'run' | 'startOrder' | 'scheduledStart' | 'heat' | 'startLane' | 'status' | 'outcome'
    | 'gates' | 'splits' | 'faults' | 'courseOrder' | 'timeToBeat' | 'placement' | 'pairTotal'
    | 'countingRun' | 'underReview' | 'qualified'
  >()
  expectTypeOf<NonNullable<F['outcome']>>().toEqualTypeOf<Attempt['outcome']>()
  expectTypeOf<NonNullable<F['run']>>().toEqualTypeOf<Attempt['run']>()
  expectTypeOf<NonNullable<F['status']>>().toEqualTypeOf<Attempt['status']>()
  expectTypeOf<NonNullable<F['placement']>>().toEqualTypeOf<Attempt['placement']>()
  // an explicit not-yet is a legal field value (retraction, run generation, §7.2)
  const retraction: M = { seq: 1, type: 'attempt.updated', attemptId: 'K1M_BR1_19:57', fields: { outcome: { state: 'not-yet' } } }
  void retraction
  // @ts-expect-error identity fields are not changeable fields
  const idField: M['fields'] = { phaseId: 'x' }
  void idField
})

test('§7.2 phase.updated / entry.updated / class.updated carry seq and type (key names not pinned by the contract)', () => {
  expectTypeOf<Msg<'phase.updated'>['seq']>().toEqualTypeOf<number>()
  expectTypeOf<Msg<'entry.updated'>['seq']>().toEqualTypeOf<number>()
  expectTypeOf<Msg<'class.updated'>['seq']>().toEqualTypeOf<number>()
})

test('§7.2 standing.updated carries the whole Standing', () => {
  expectTypeOf<RequiredKeys<Msg<'standing.updated'>>>().toEqualTypeOf<'seq' | 'type' | 'standing'>()
  expectTypeOf<Msg<'standing.updated'>['standing']>().toEqualTypeOf<Standing>()
})

test('§7.2 write.updated carries the whole WriteRequest', () => {
  expectTypeOf<RequiredKeys<Msg<'write.updated'>>>().toEqualTypeOf<'seq' | 'type' | 'write'>()
  expectTypeOf<Msg<'write.updated'>['write']>().toEqualTypeOf<WriteRequest>()
})

test('§7.2 check.updated: attemptId, run, gate, check: GateCheck | null (null = removed)', () => {
  type M = Msg<'check.updated'>
  expectTypeOf<RequiredKeys<M>>().toEqualTypeOf<'seq' | 'type' | 'attemptId' | 'run' | 'gate' | 'check'>()
  expectTypeOf<M['attemptId']>().toEqualTypeOf<string>()
  expectTypeOf<M['run']>().toEqualTypeOf<number>()
  expectTypeOf<M['gate']>().toEqualTypeOf<number>()
  expectTypeOf<M['check']>().toEqualTypeOf<GateCheck | null>()
})

test('§7.2 flag.updated carries seq and type (whole GateFlag; key name not pinned)', () => {
  expectTypeOf<Msg<'flag.updated'>['seq']>().toEqualTypeOf<number>()
})

test('§7.2 oncourse.updated: attemptIds, featuredByUpstream, asOf', () => {
  type M = Msg<'oncourse.updated'>
  expectTypeOf<RequiredKeys<M>>().toEqualTypeOf<'seq' | 'type' | 'attemptIds' | 'featuredByUpstream' | 'asOf'>()
  expectTypeOf<M['attemptIds']>().toEqualTypeOf<string[]>()
  expectTypeOf<M['featuredByUpstream']>().toEqualTypeOf<string | null>()
  expectTypeOf<M['asOf']>().toEqualTypeOf<Timestamp>()
})

test('§7.2 event.changed carries the whole Event', () => {
  expectTypeOf<RequiredKeys<Msg<'event.changed'>>>().toEqualTypeOf<'seq' | 'type' | 'event'>()
  expectTypeOf<Msg<'event.changed'>['event']>().toEqualTypeOf<Event>()
})

test('§7.2 scope.replaced: scope, every Attempt and Standing of it (never Phases, Entries, Classes, Courses)', () => {
  type M = Msg<'scope.replaced'>
  expectTypeOf<RequiredKeys<M>>().toEqualTypeOf<'seq' | 'type' | 'scope' | 'attempts' | 'standings'>()
  expectTypeOf<M['scope']>().toEqualTypeOf<RebaselineScope>()
  expectTypeOf<M['attempts']>().toEqualTypeOf<Attempt[]>()
  expectTypeOf<M['standings']>().toEqualTypeOf<Standing[]>()
})

test('§7.2 sources.updated / course.updated / diagnostics.updated carry seq and type (key names not pinned)', () => {
  expectTypeOf<Msg<'sources.updated'>['seq']>().toEqualTypeOf<number>()
  expectTypeOf<Msg<'course.updated'>['seq']>().toEqualTypeOf<number>()
  expectTypeOf<Msg<'diagnostics.updated'>['seq']>().toEqualTypeOf<number>()
})

// ---------------------------------------------------------------- row 7: §7.3
test('§7.3 POST /api/attempts/{phaseId}/{bib}/penalty: body gate + value in {0,2,50}', () => {
  expectTypeOf<keyof PenaltyWriteRequest>().toEqualTypeOf<'gate' | 'value'>()
  expectTypeOf<PenaltyWriteRequest['gate']>().toEqualTypeOf<number>()
  expectTypeOf<PenaltyWriteRequest['value']>().toEqualTypeOf<0 | 2 | 50>()
  // @ts-expect-error value outside {0,2,50}
  const bad: PenaltyWriteRequest = { gate: 1, value: 4 }
  void bad
})

test('§7.3 penalty write response is a WriteRequest (pending/confirmed/mismatched/superseded) and GET /api/writes/{writeId}', () => {
  expectTypeOf<WriteRequest['status']>().toEqualTypeOf<'pending' | 'confirmed' | 'mismatched' | 'superseded'>()
  expectTypeOf<WriteRequest['target']['field']>().toEqualTypeOf<'gate-penalty'>()
  expectTypeOf<RequiredKeys<WriteRequest>>().toEqualTypeOf<'writeId' | 'target' | 'requestedValue' | 'submittedAt' | 'status'>()
  expectTypeOf<OptionalKeys<WriteRequest>>().toEqualTypeOf<'confirmedValue' | 'confirmedAt'>()
})

test('§7.3 refusals: write-not-possible reasons are run-not-closed, team-boat, cross; codes are in §1.4', () => {
  expectTypeOf<WriteNotPossibleReason>().toEqualTypeOf<'run-not-closed' | 'team-boat' | 'cross'>()
  expectTypeOf<
    'attempt-not-found' | 'validation-failed' | 'write-not-possible' | 'write-not-found'
  >().toExtend<ErrorCode>()
})

// ---------------------------------------------------------------- row 7: §7.4
test('§7.4 PUT /api/attempts/{phaseId}/{bib}/checks/{gate}: body {checkedBy?}, response GateCheck', () => {
  expectTypeOf<RequiredKeys<GateCheckRequest>>().toEqualTypeOf<never>()
  expectTypeOf<OptionalKeys<GateCheckRequest>>().toEqualTypeOf<'checkedBy'>()
  expectTypeOf<NonNullable<GateCheckRequest['checkedBy']>>().toEqualTypeOf<string>()
  expectTypeOf<GateCheck['status']>().toEqualTypeOf<'verified' | 'stale'>()
  expectTypeOf<GateCheck['valueAtCheck']>().toEqualTypeOf<number | null>()
  expectTypeOf<RequiredKeys<GateCheck>>().toEqualTypeOf<'attemptId' | 'run' | 'gate' | 'checkedAt' | 'valueAtCheck' | 'status'>()
  expectTypeOf<OptionalKeys<GateCheck>>().toEqualTypeOf<'checkedBy'>()
  expectTypeOf<'attempt-not-found' | 'validation-failed' | 'write-not-possible'>().toExtend<ErrorCode>()
})

test('§7.4 DELETE /api/attempts/{phaseId}/{bib}/checks/{gate}: refusal code is in §1.4', () => {
  expectTypeOf<'attempt-not-found'>().toExtend<ErrorCode>()
})

test('§7.4 POST /api/attempts/{phaseId}/{bib}/flags: body and GateFlag response', () => {
  expectTypeOf<RequiredKeys<GateFlagCreateRequest>>().toEqualTypeOf<'gate' | 'comment'>()
  expectTypeOf<OptionalKeys<GateFlagCreateRequest>>().toEqualTypeOf<'suggestedValue' | 'createdBy'>()
  expectTypeOf<GateFlagCreateRequest['gate']>().toEqualTypeOf<number>()
  expectTypeOf<GateFlagCreateRequest['comment']>().toEqualTypeOf<string>()
  expectTypeOf<NonNullable<GateFlagCreateRequest['suggestedValue']>>().toEqualTypeOf<number>()
  expectTypeOf<RequiredKeys<GateFlag>>().toEqualTypeOf<'flagId' | 'attemptId' | 'run' | 'gate' | 'createdAt' | 'comment'>()
  expectTypeOf<OptionalKeys<GateFlag>>().toEqualTypeOf<'createdBy' | 'suggestedValue' | 'resolution'>()
})

test('§7.4 POST /api/flags/{flagId}/resolution: body and refusal', () => {
  expectTypeOf<RequiredKeys<FlagResolutionRequest>>().toEqualTypeOf<never>()
  expectTypeOf<OptionalKeys<FlagResolutionRequest>>().toEqualTypeOf<'note' | 'resolvedBy'>()
  expectTypeOf<'flag-not-found'>().toExtend<ErrorCode>()
})
