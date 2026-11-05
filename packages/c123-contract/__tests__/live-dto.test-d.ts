// Row 8. CONTRACTS §8.3 (ingest), §8.4 (public reads), §8.6 (what is refused, as
// absence from the types). Names that CONTRACTS does not give are fixed here.
import { expectTypeOf, test } from 'vitest'
import type {
  AgeCategory, Attempt, Class, Course, Event, ExternalId, Observed, PairRole, Phase,
  PhaseStatus, Stage, Standing, Timestamp,
  // names fixed by this test:
  ClassPut, CoursePut, PhasePut, EntryPut, EntryPutMember, AttemptPut, ClassificationPut,
  ClassificationRow, OnCoursePut, PhaseAttemptsPut, PublicEventsQuery, PublicEventSummary,
  PublicEventsResponse, PublicEventResponse, PublicPerson, PublicEntry, PublicEntriesResponse,
  PublicStanding, PublicStandingsResponse, PublicAttemptsResponse, PublicOnCourseResponse,
  PublicStreamMessage, PublicHeartbeat, ErrorCode,
} from '../index.js'
import type { OptionalKeys, RequiredKeys } from './_types.js'

type SMsg<T extends string> = Extract<PublicStreamMessage, { type: T }>
type ObservedAttemptKeys =
  | 'entry' | 'run' | 'startOrder' | 'scheduledStart' | 'heat' | 'startLane' | 'status' | 'outcome'
  | 'gates' | 'splits' | 'faults' | 'courseOrder' | 'timeToBeat' | 'placement' | 'pairTotal'
  | 'countingRun' | 'underReview' | 'qualified'

// ---------------------------------------------------------------- §8.3
test('§8.3 PUT /ingest/v2/classes/{classId}', () => {
  expectTypeOf<RequiredKeys<ClassPut>>().toEqualTypeOf<'code' | 'name' | 'discipline' | 'ageCategories'>()
  expectTypeOf<OptionalKeys<ClassPut>>().toEqualTypeOf<never>()
  expectTypeOf<ClassPut['code']>().toEqualTypeOf<string>()
  expectTypeOf<ClassPut['name']>().toEqualTypeOf<string>() // bare value, wrapped by the store
  expectTypeOf<ClassPut['discipline']>().toEqualTypeOf<'slalom' | 'cross'>()
  expectTypeOf<ClassPut['ageCategories']>().toEqualTypeOf<AgeCategory[]>()
})

test('§8.3 PUT /ingest/v2/courses/{courseId}', () => {
  expectTypeOf<RequiredKeys<CoursePut>>().toEqualTypeOf<'gates' | 'sectorEndsAfterGate' | 'splitsAfterGate'>()
  expectTypeOf<OptionalKeys<CoursePut>>().toEqualTypeOf<never>()
  expectTypeOf<CoursePut['gates']>().toEqualTypeOf<{ number: number; kind: 'downstream' | 'upstream' }[]>()
  expectTypeOf<CoursePut['sectorEndsAfterGate']>().toEqualTypeOf<number[]>()
  expectTypeOf<CoursePut['splitsAfterGate']>().toEqualTypeOf<number[]>()
})

test('§8.3 PUT /ingest/v2/phases/{phaseId}: structural properties only, no format token', () => {
  expectTypeOf<RequiredKeys<PhasePut>>().toEqualTypeOf<
    'classId' | 'kind' | 'stage' | 'scoringKind' | 'pair' | 'heats' | 'date' | 'courseId'
    | 'scheduledStart' | 'programmeOrder' | 'title' | 'status'
  >()
  expectTypeOf<OptionalKeys<PhasePut>>().toEqualTypeOf<never>()
  expectTypeOf<PhasePut['classId']>().toEqualTypeOf<string>()
  expectTypeOf<PhasePut['kind']>().toEqualTypeOf<'race' | 'classification'>()
  expectTypeOf<PhasePut['stage']>().toEqualTypeOf<Stage>()
  expectTypeOf<PhasePut['scoringKind']>().toEqualTypeOf<'duration' | 'ordinal'>()
  expectTypeOf<PhasePut['pair']>().toEqualTypeOf<PairRole | null>()
  expectTypeOf<PhasePut['heats']>().toEqualTypeOf<boolean>()
  expectTypeOf<PhasePut['date']>().toEqualTypeOf<string>()
  expectTypeOf<PhasePut['courseId']>().toEqualTypeOf<string | null>()
  expectTypeOf<PhasePut['scheduledStart']>().toEqualTypeOf<Timestamp | null>()
  expectTypeOf<PhasePut['programmeOrder']>().toEqualTypeOf<number | null>()
  expectTypeOf<PhasePut['title']>().toEqualTypeOf<string | null>()
  expectTypeOf<PhasePut['status']>().toEqualTypeOf<PhaseStatus>()
  // §8.3 / §8.6: the vendor format token does not exist on the live tier
  expectTypeOf<'format' extends keyof PhasePut ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<'format' extends keyof Phase ? true : false>().toEqualTypeOf<true>() // on-site Phase keeps it
})

test('§8.3 PUT /ingest/v2/entries/{entryId}: externalId is required per member, null allowed', () => {
  expectTypeOf<RequiredKeys<EntryPut>>().toEqualTypeOf<
    'classId' | 'displayName' | 'isTeam' | 'club' | 'nation' | 'ageCategoryId' | 'eventBib' | 'members'
  >()
  expectTypeOf<EntryPut['displayName']>().toEqualTypeOf<string>()
  expectTypeOf<EntryPut['isTeam']>().toEqualTypeOf<boolean>()
  expectTypeOf<EntryPut['club']>().toEqualTypeOf<string | null>()
  expectTypeOf<EntryPut['nation']>().toEqualTypeOf<string | null>()
  expectTypeOf<EntryPut['ageCategoryId']>().toEqualTypeOf<string | null>()
  expectTypeOf<EntryPut['eventBib']>().toEqualTypeOf<string | null>()
  expectTypeOf<EntryPut['members']>().toEqualTypeOf<EntryPutMember[]>()
  expectTypeOf<RequiredKeys<EntryPutMember>>().toEqualTypeOf<'givenName' | 'familyName' | 'externalId'>()
  expectTypeOf<OptionalKeys<EntryPutMember>>().toEqualTypeOf<'birthDate'>()
  expectTypeOf<NonNullable<EntryPutMember['birthDate']>>().toEqualTypeOf<string>()
  expectTypeOf<EntryPutMember['externalId']>().toEqualTypeOf<ExternalId | null>()
  // @ts-expect-error omitting externalId is refused (it is 400 validation-failed on the wire)
  const m: EntryPutMember = { givenName: 'A', familyName: 'B' }
  void m
})

test('§8.3 PUT /ingest/v2/attempts/{phaseId}/{bib}: a subset of the Observed fields of §2.6, each wrapped', () => {
  expectTypeOf<RequiredKeys<AttemptPut>>().toEqualTypeOf<never>()
  expectTypeOf<OptionalKeys<AttemptPut>>().toEqualTypeOf<ObservedAttemptKeys>()
  expectTypeOf<NonNullable<AttemptPut['outcome']>>().toEqualTypeOf<Attempt['outcome']>()
  expectTypeOf<NonNullable<AttemptPut['gates']>>().toEqualTypeOf<Attempt['gates']>()
  expectTypeOf<NonNullable<AttemptPut['timeToBeat']>>().toEqualTypeOf<Attempt['timeToBeat']>()
  expectTypeOf<NonNullable<AttemptPut['entry']>>().toEqualTypeOf<Attempt['entry']>()
  // an explicit not-yet resets a field
  const reset: AttemptPut = { outcome: { state: 'not-yet' }, placement: { state: 'not-yet' } }
  void reset
  // identity comes from the path, not the body
  // @ts-expect-error
  const withId: AttemptPut = { attemptId: 'x:1' }
  void withId
  // @ts-expect-error bare value where a wrapped Observed is required
  const bare: AttemptPut = { run: 2 }
  void bare
})

test('§8.3 PUT /ingest/v2/phases/{phaseId}/classification: whole rows and asOf', () => {
  expectTypeOf<RequiredKeys<ClassificationPut>>().toEqualTypeOf<'rows' | 'asOf'>()
  expectTypeOf<ClassificationPut['rows']>().toEqualTypeOf<ClassificationRow[]>()
  expectTypeOf<ClassificationPut['asOf']>().toEqualTypeOf<Timestamp>()
  expectTypeOf<RequiredKeys<ClassificationRow>>().toEqualTypeOf<'entryId' | 'bib' | 'rank' | 'order' | 'decidedIn'>()
  expectTypeOf<ClassificationRow['entryId']>().toEqualTypeOf<string>()
  expectTypeOf<ClassificationRow['bib']>().toEqualTypeOf<string>()
  expectTypeOf<ClassificationRow['rank']>().toEqualTypeOf<number | null>()
  expectTypeOf<ClassificationRow['order']>().toEqualTypeOf<number>()
  expectTypeOf<ClassificationRow['decidedIn']>().toEqualTypeOf<string>()
  // §8.6: a classification carries placed rows and nothing else, never Attempt fields
  expectTypeOf<'outcome' extends keyof ClassificationRow ? true : false>().toEqualTypeOf<false>()
})

test('§8.3 PUT /ingest/v2/oncourse: the whole set in course order', () => {
  expectTypeOf<RequiredKeys<OnCoursePut>>().toEqualTypeOf<'attemptIds' | 'featuredByUpstream'>()
  expectTypeOf<OnCoursePut['attemptIds']>().toEqualTypeOf<string[]>()
  expectTypeOf<OnCoursePut['featuredByUpstream']>().toEqualTypeOf<string | null>()
})

test('§8.3 DELETE /ingest/v2/attempts/{phaseId}/{bib}: no body type exists', () => {
  // The operation takes no body; §8.6 "no append a result" -> no append/increment type is exported.
  // @ts-expect-error there is no AppendResult / increment operation in the contract
  type NoAppend = import('../index.js').AppendResult
  void (null as unknown as NoAppend)
})

test('§8.3 PUT /ingest/v2/phases/{phaseId}/attempts: replaces the Phase; each element carries bib + Observed fields', () => {
  expectTypeOf<RequiredKeys<PhaseAttemptsPut>>().toEqualTypeOf<'attempts'>()
  type El = PhaseAttemptsPut['attempts'][number]
  expectTypeOf<RequiredKeys<El>>().toEqualTypeOf<'bib'>()
  expectTypeOf<OptionalKeys<El>>().toEqualTypeOf<ObservedAttemptKeys>()
  expectTypeOf<El['bib']>().toEqualTypeOf<string>()
})

test('§8.3 refusals on the live tier use codes of the §1.4 union', () => {
  expectTypeOf<
    'validation-failed' | 'vendor-payload-rejected' | 'unauthorized' | 'forbidden' | 'rate-limited'
  >().toExtend<ErrorCode>()
})

// ---------------------------------------------------------------- §8.4
test('§8.4 GET /public/events (calendar)', () => {
  expectTypeOf<OptionalKeys<PublicEventsQuery>>().toEqualTypeOf<'status' | 'cursor' | 'limit'>()
  expectTypeOf<NonNullable<PublicEventsQuery['status']>>().toEqualTypeOf<'live' | 'upcoming' | 'past' | 'all'>()
  expectTypeOf<NonNullable<PublicEventsQuery['limit']>>().toEqualTypeOf<number>()
  expectTypeOf<NonNullable<PublicEventsQuery['cursor']>>().toEqualTypeOf<string>()
  expectTypeOf<RequiredKeys<PublicEventsResponse>>().toEqualTypeOf<'asOfSeq' | 'events' | 'nextCursor'>()
  expectTypeOf<PublicEventsResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<PublicEventsResponse['events']>().toEqualTypeOf<PublicEventSummary[]>()
  expectTypeOf<string>().toExtend<PublicEventsResponse['nextCursor']>()
  expectTypeOf<RequiredKeys<PublicEventSummary>>().toEqualTypeOf<'eventId' | 'organiserName' | 'name' | 'dateRange' | 'status'>()
  expectTypeOf<PublicEventSummary['dateRange']>().toEqualTypeOf<{ start: string; end: string }>()
  expectTypeOf<PublicEventSummary['status']>().toEqualTypeOf<'live' | 'upcoming' | 'past'>()
  expectTypeOf<PublicEventSummary['organiserName']>().toEqualTypeOf<string>()
})

test('§8.4 GET /public/events/{eventId}', () => {
  expectTypeOf<keyof PublicEventResponse>().toEqualTypeOf<'asOfSeq' | 'event' | 'classes' | 'phases' | 'courses'>()
  expectTypeOf<PublicEventResponse['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<PublicEventResponse['event']>().toEqualTypeOf<Event>()
  expectTypeOf<PublicEventResponse['classes']>().toEqualTypeOf<Class[]>()
  expectTypeOf<PublicEventResponse['phases']>().toEqualTypeOf<Phase[]>()
  expectTypeOf<PublicEventResponse['courses']>().toEqualTypeOf<Course[]>()
})

test('§8.4 GET /public/events/{eventId}/classes/{classId}/entries: birth data per the publication setting', () => {
  expectTypeOf<keyof PublicEntriesResponse>().toEqualTypeOf<'asOfSeq' | 'entries'>()
  expectTypeOf<PublicEntriesResponse['entries']>().toEqualTypeOf<PublicEntry[]>()
  expectTypeOf<PublicEntry['members']>().toEqualTypeOf<Observed<PublicPerson[]>>()
  // 'year' (default) serves birthYear only, 'full' serves birthDate, 'none' serves neither: both optional
  expectTypeOf<OptionalKeys<PublicPerson>>().toEqualTypeOf<'birthYear' | 'birthDate'>()
  expectTypeOf<RequiredKeys<PublicPerson>>().toEqualTypeOf<'givenName' | 'familyName' | 'externalId'>()
  expectTypeOf<NonNullable<PublicPerson['birthDate']>>().toEqualTypeOf<string>()
  expectTypeOf<NonNullable<PublicPerson['birthYear']>>().toExtend<number>()
})

test('§8.4 GET /public/events/{eventId}/classes/{classId}/standings: Standing without anomalies', () => {
  expectTypeOf<keyof PublicStandingsResponse>().toEqualTypeOf<'asOfSeq' | 'standings'>()
  expectTypeOf<PublicStandingsResponse['standings']>().toEqualTypeOf<PublicStanding[]>()
  expectTypeOf<'anomalies' extends keyof PublicStanding ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<keyof PublicStanding>().toEqualTypeOf<Exclude<keyof Standing, 'anomalies'>>()
  expectTypeOf<PublicStanding['entries']>().toEqualTypeOf<Standing['entries']>()
  // @ts-expect-error anomalies is not part of the public Standing (§2.7, §8.4)
  const s: PublicStanding['anomalies'] = []
  void s
})

test('§8.4 GET /public/events/{eventId}/phases/{phaseId}/attempts', () => {
  expectTypeOf<keyof PublicAttemptsResponse>().toEqualTypeOf<'asOfSeq' | 'attempts'>()
  expectTypeOf<PublicAttemptsResponse['attempts']>().toEqualTypeOf<Attempt[]>()
})

test('§8.4 GET /public/events/{eventId}/oncourse: same shape as §7.1 but asOf is never null', () => {
  expectTypeOf<RequiredKeys<PublicOnCourseResponse>>().toEqualTypeOf<'asOfSeq' | 'attempts' | 'featuredByUpstream' | 'asOf'>()
  expectTypeOf<PublicOnCourseResponse['attempts']>().toEqualTypeOf<Attempt[]>()
  expectTypeOf<PublicOnCourseResponse['featuredByUpstream']>().toEqualTypeOf<string | null>()
  expectTypeOf<PublicOnCourseResponse['asOf']>().toEqualTypeOf<Timestamp>()
})

test('§8.4 SSE stream carries the §7.2 shapes it lists, and never write/sources/check/flag/event.changed', () => {
  expectTypeOf<
    'attempt.updated' | 'attempt.deleted' | 'phase.updated' | 'entry.updated' | 'class.updated'
    | 'course.updated' | 'standing.updated' | 'oncourse.updated' | 'scope.replaced'
  >().toExtend<PublicStreamMessage['type']>()
  expectTypeOf<
    Extract<
      PublicStreamMessage['type'],
      'write.updated' | 'sources.updated' | 'check.updated' | 'flag.updated' | 'event.changed' | 'diagnostics.updated'
    >
  >().toBeNever()
})

test('§8.4 SSE attempt.deleted is { seq, attemptId }', () => {
  expectTypeOf<RequiredKeys<SMsg<'attempt.deleted'>>>().toEqualTypeOf<'seq' | 'type' | 'attemptId'>()
  expectTypeOf<SMsg<'attempt.deleted'>['attemptId']>().toEqualTypeOf<string>()
  expectTypeOf<SMsg<'attempt.deleted'>['seq']>().toEqualTypeOf<number>()
})

test('§8.4 SSE standing.updated carries a Standing without anomalies', () => {
  expectTypeOf<SMsg<'standing.updated'>['standing']>().toEqualTypeOf<PublicStanding>()
})

test('§8.4 SSE scope.replaced: attempts and anomaly-free standings', () => {
  expectTypeOf<SMsg<'scope.replaced'>['attempts']>().toEqualTypeOf<Attempt[]>()
  expectTypeOf<SMsg<'scope.replaced'>['standings']>().toEqualTypeOf<PublicStanding[]>()
})

test('§8.4 SSE oncourse.updated is the whole set, as §7.2', () => {
  expectTypeOf<SMsg<'oncourse.updated'>['attemptIds']>().toEqualTypeOf<string[]>()
  expectTypeOf<SMsg<'oncourse.updated'>['featuredByUpstream']>().toEqualTypeOf<string | null>()
  expectTypeOf<SMsg<'oncourse.updated'>['asOf']>().toEqualTypeOf<Timestamp>()
})

test('§8.4 SSE heartbeat is { asOfSeq, serverTime }', () => {
  expectTypeOf<RequiredKeys<PublicHeartbeat>>().toEqualTypeOf<'asOfSeq' | 'serverTime'>()
  expectTypeOf<PublicHeartbeat['asOfSeq']>().toEqualTypeOf<number>()
  expectTypeOf<PublicHeartbeat['serverTime']>().toExtend<string>()
})

// ---------------------------------------------------------------- §8.6
test('§8.6 what is refused is absent from the types: no vendor payload, no anomalies, no format, no checks', () => {
  expectTypeOf<'anomalies' extends keyof PublicStanding ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<'format' extends keyof PhasePut ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<'attemptId' extends keyof AttemptPut ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<'phaseId' extends keyof AttemptPut ? true : false>().toEqualTypeOf<false>()
  // closed vocabularies are unions, not string (§8.6 last bullet)
  expectTypeOf<string extends ClassPut['discipline'] ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<string extends PhasePut['scoringKind'] ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<string extends PhasePut['kind'] ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<string extends PhasePut['status'] ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<string extends NonNullable<PhasePut['pair']>['combination'] ? true : false>().toEqualTypeOf<false>()
})
