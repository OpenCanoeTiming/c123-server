// @opencanoetiming/c123-contract: types only, no runtime code (ADR-002, ADR-003).
// Copied from the ts blocks of docs/arch/CONTRACTS.md; the drift test keeps them equal.

export type Observed<T> =
  | { state: 'known'; value: T; observedAt: Timestamp; eventTime?: Timestamp;
      source: SourceTag; confidence: 'authoritative' | 'inferred'; provisional: boolean }
  | { state: 'not-yet' }
  | { state: 'unavailable'; reason: UnavailableReason }

export type SourceTag = 'tcp' | 'xml' | 'operator-write' | 'bridge'   // bridge: live tier only, §8.3
export type UnavailableReason = 'not-configured' | 'source-unreachable' | 'not-applicable'
export type Timestamp = string   // ISO-8601 with an explicit offset or Z

export type ErrorCode =
  | 'event-not-found' | 'class-not-found' | 'course-not-found' | 'phase-not-found'
  | 'attempt-not-found' | 'write-not-found' | 'flag-not-found' | 'write-not-possible'
  | 'validation-failed' | 'vendor-payload-rejected' | 'unauthorized' | 'forbidden'
  | 'rate-limited' | 'source-unavailable'
export type WriteNotPossibleReason = 'run-not-closed' | 'team-boat' | 'cross'       // §7.3, §7.4
export type SourceUnavailableReason = 'not-configured' | 'unreadable' | 'invalid'   // §7.1 re-baseline: not configured,
                                                                             // not readable, did not validate
export type ErrorEnvelope = { error:
  | { code: Exclude<ErrorCode, 'validation-failed' | 'write-not-possible' | 'source-unavailable'>; message: string }
  | { code: 'validation-failed'; message: string; details: { field: string; issue: string }[] }
  | { code: 'write-not-possible'; message: string; details: { reason: WriteNotPossibleReason } }
  | { code: 'source-unavailable'; message: string; details: { reason: SourceUnavailableReason } }
}

export type Organiser = { organiserId: string; name: string }

export type Event = {
  eventId: string                  // opaque, §1.1
  organiserId: string              // cloud tier only
  name: string                     // organiser-authored title
  details: Observed<EventDetails>  // [D] xml
}
export type EventDetails = {
  subtitle?: string; venue?: string; facility?: string
  startDate: string; endDate: string   // as the organiser entered them in Canoe123 — fallible
}

export type Class = {
  classId: string                          // = Canoe123 ClassId, verbatim — [D]
  eventId: string
  code: string                             // = classId; opaque, never translated
  name: Observed<string>                   // organiser-authored class title — [D] xml, tcp
  discipline: 'slalom' | 'cross'           // [D] structural, from the formats of its Phases
  ageCategories: Observed<AgeCategory[]>   // [D] xml; empty list where the event uses none
}
export type AgeCategory = { ageCategoryId: string; name: string }   // Canoe123 CatId and its name

export type Phase = {
  phaseId: string                     // = Canoe123 RaceId, verbatim — [D]
  classId: string
  format: string                      // upstream's format token, verbatim, open vocabulary — [D]
  kind: 'race' | 'classification'     // [D] structural, from format
  scoringKind: 'duration' | 'ordinal' // [D] structural, from format
  pair: PairRole | null               // [D] structural, from format and schedule
  heats: boolean                      // [D] structural, from format
  stage: Stage                        // [D] structural, from format — where in the progression this Phase sits
  date: string                        // YYYY-MM-DD, the snapshot's, then immutable — INV-5
  courseId: Observed<string>          // [D] xml; not-applicable for a classification
  scheduledStart: Observed<Timestamp> // [D] xml, the scheduled start
  programmeOrder: Observed<number>    // [D] tcp, xml — position in the event's running order
  title: Observed<string>             // organiser-authored race title, where set — [D] xml
  status: Observed<PhaseStatus>       // [D] — §3.1
}
export type PairRole = { role: 'first' | 'second'; siblingPhaseId: string | null; combination: 'best' | 'sum' }
                                    // siblingPhaseId null until the schedule names the other run — DERIVATIONS §2.1

export type Stage = 'run' | 'time-trial' | 'heats' | 'quarter-final' | 'semi-final' | 'final'
           | 'super-final' | 'classification'

export type ExternalId = { scheme: string; value: string }   // scheme: open string, e.g. 'icf', 'cz-rgc'

export type Person = {
  givenName: string
  familyName: string
  birthDate?: string                  // YYYY-MM-DD as entered upstream; see "Birth date" below
  externalId: ExternalId | null       // null = no registry identity at all; served as null on both tiers, never wrapped (§1.2)
}

export type Entry = {
  entryId: string                     // opaque, §1.1 — on-site, Canoe123 Id verbatim, never parsed
  classId: string
  displayName: Observed<string>       // upstream's pre-assembled name, or a team's name — [D]
  members: Observed<Person[]>         // 1..N — [D] xml
  club: Observed<string>              // [D] xml, tcp
  nation: Observed<string>            // [D] xml — see "Nation" below
  ageCategoryId: Observed<string>     // [D] xml; not-applicable where the class has no age categories
  eventBib: Observed<string>          // [D] xml; not-applicable where bibs are issued per race
  isTeam: Observed<boolean>           // [D] xml — a team or patrol boat (judged per member); a C2 double is not
}

export type Attempt = {
  attemptId: string                    // = `${phaseId}:${bib}`
  phaseId: string
  bib: string                          // this race's bib, trimmed — structural identity
  entry: Observed<{ entryId: string }> // mutable pointer (INV-4)
  run: Observed<number>                // run generation, 1-based — DECISIONS/ADR-013
  startOrder: Observed<number>         // [D] tcp, xml
  scheduledStart: Observed<Timestamp>  // [D] slalom; not-applicable in Cross
  heat: Observed<number>               // [D] Cross heats; not-applicable otherwise
  startLane: Observed<number>          // [D] Cross heats; not-applicable otherwise
  status: Observed<AttemptStatus>      // §3.2
  outcome: Observed<Outcome>
  gates: Observed<Gate[]>              // not-applicable in Cross (see faults)
  splits: Observed<Split[]>            // [D] where splits are armed; not-applicable otherwise
  faults: Observed<Faults>             // Cross only; derived from the judging cells, never from Pen — DERIVATIONS §4.6(d)
  courseOrder: Observed<number>        // on course only: 1 = closest to the finish — [D] tcp
  timeToBeat: Observed<TimeToBeat>     // on course only — [D] tcp
  placement: Observed<Placement>       // upstream's rank and order — §5
  pairTotal: Observed<number | null>   // second run of a pair only: the combined result, seconds
  countingRun: Observed<1 | 2>         // second run of a 'best' pair only: which run counts
  underReview: Observed<boolean>       // upstream's "under review" mark
  qualified: Observed<boolean>         // progression mark (Q): known on every placed or marked row, false without Q; not-applicable in a final, super-final or classification — DERIVATIONS §4.7
}

export type AttemptStatus =
  | 'not-started' | 'at-start' | 'on-course' | 'left-without-finish' | 'finished' | 'non-ranked'
  | 'dns' | 'dnf' | 'dsq' | 'dsq-r' | 'dqb' | 'cap' | 'ral' | 'other'
export type ResultMark = Exclude<AttemptStatus, 'not-started' | 'at-start' | 'on-course' | 'left-without-finish' | 'finished'>
                                         // a result mark (§3.2): every status that is not a lifecycle state

export type Outcome =
  | { kind: 'pending' }                                                    // nothing yet
  | { kind: 'running'; elapsedSeconds: number; penaltySeconds: number }   // on course, ticking
  | { kind: 'duration'; runSeconds: number; penaltySeconds: number; totalSeconds: number }
  | { kind: 'ordinal'; order: number }                                     // Cross, within heat
  | { kind: 'no-result'; status: 'dns' | 'dnf' | 'dsq' | 'dsq-r' | 'dqb' | 'cap' | 'ral' | 'other' }

export type Gate = { number: number; penalty: number | null; memberPenalties?: (number | null)[] }
export type Split = { number: number; elapsedSeconds: number }
export type Faults = {
  count: number          // faulted judging slots
  gates: string[]        // their captions, as upstream names them: 'ST', '1'…'6', 'RZ', '7'
  lastCleanSlot: number  // upstream's 1-based SLOT position of the last slot judged clean before the
}                        // first fault, counting the start ramp and roll zone; 0 = none; a clean run =
                         // the slot count (9 on the recorded 9-slot, 7-gate course). Not a gate number:
                         // map through Course.slots (§2.12) if a gate number is wanted
export type TimeToBeat = { mode: 'target' | 'delta'; seconds: number; holder?: string }
export type Placement = { rank: number; order: number }   // known only when upstream ranks the row — §5

export type Standing = {
  standingKey: string          // stable key of (scope, ageCategoryId) — §5
  classId: string
  scope: { kind: 'phase'; phaseId: string }
       | { kind: 'pair'; firstPhaseId: string; secondPhaseId: string }
       | { kind: 'heat'; phaseId: string; heat: number }
       | { kind: 'classification'; phaseId: string }
  ageCategoryId: string | null // null = the whole class
  asOf: Timestamp
  entries: StandingEntry[]
  anomalies: Anomaly[]
}

export type StandingEntry = {
  entryId: string
  bib: string
  rank: number | null          // relayed; age-category rank assembled — §5
  order: number | null         // null until placed
  result: Outcome | null       // the Attempt's outcome when it is a result; { kind: 'pending' } while pending or running; null for an untimed row (outcome unavailable{not-applicable}, §2.6) — §5
  pairTotalSeconds?: number | null // pair scope only: the combined result the placement is based on
  behindSeconds: number | null // this entry's ranked value minus the leader's; duration scopes only
  provisional: boolean
  underReview: boolean
  decidedIn?: string | null    // classification scope only: upstream's own round token (F, SF, 1/2, 1/4, T), verbatim, not a format; null until the snapshot states it — DERIVATIONS §4.10
}

export type Anomaly =
  | { kind: 'order-disagreement'; entryId: string; aheadOfEntryId: string }
  | { kind: 'category-rank-disagreement'; entryId: string; assembled: number; upstream: number }

export type SourceStatus = {
  tcp: { state: ConnState; upstreamInstance: 'main' | 'backup' | 'offline' | null;
         timingClockOffsetSeconds: number | null }
  xml: { state: ConnState | 'not-configured'; lastRewriteDetectedAt: Timestamp | null }
  live: { state: 'connected' | 'retrying' | 'unreachable' | 'rejected' | 'not-configured';
          pendingResources: number; lastAcceptedAt: Timestamp | null;
          lastError: { code: string; at: Timestamp } | null }
}
export type ConnState = 'connected' | 'reconnecting' | 'unreachable'

export type WriteRequest = {
  writeId: string
  target: { phaseId: string; bib: string; run: number; field: 'gate-penalty' }   // the only writable field, §7.3
  requestedValue: unknown
  submittedAt: Timestamp
  status: 'pending' | 'confirmed' | 'mismatched' | 'superseded'
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}

export type GateCheck = {
  attemptId: string; run: number; gate: number   // key
  checkedAt: Timestamp
  checkedBy?: string
  valueAtCheck: number | null   // the presented Gate.penalty the moment the check was made; null = not judged then
  status: 'verified' | 'stale'  // derived by the server at serialisation, never stored — see below
}

export type GateFlag = {
  flagId: string
  attemptId: string; run: number; gate: number
  createdAt: Timestamp; createdBy?: string
  comment: string                // judge's free text: workflow, not domain state
  suggestedValue?: number        // integer seconds
  resolution?: { resolvedAt: Timestamp; resolvedBy?: string; note?: string }   // absent = open
}

export type Course = {
  courseId: string                       // Canoe123 course number — [D] xml only
  eventId: string
  layout: Observed<string>               // upstream's layout string, one char per element
  gates: Observed<{ number: number; kind: 'downstream' | 'upstream' }[]>
  slots: Observed<{ slot: number; kind: 'gate' | 'start-ramp' | 'roll-zone'; gateNumber?: number; caption?: string }[]>
  sectorEndsAfterGate: Observed<number[]>
  splitsAfterGate: Observed<number[]>
  captions: Observed<string[]>           // [D] tcp only, current course only
}

export type PhaseStatus =
  | 'scheduled' | 'running' | 'paused' | 'unofficial' | 'official' | 'revised'
  | 'protested' | 'postponed' | 'cancelled' | 'other'

export type Diagnostic =
  | { kind: 'source-disagreement'; attemptId: string; field: string; sources: SourceTag[] }          // INV-2b
  | { kind: 'contradicted-finish'; attemptId: string; finishTime: Timestamp | null; runSeconds: number }   // INV-2d
  | { kind: 'duplicate-finish'; phaseId: string; finishTime: Timestamp; bibs: string[] }           // §2.6: the shared finish eventTime
  | { kind: 'stale-mark'; attemptId: string; run: number; mark: ResultMark }                       // §2.6: the mark not presented
  | { kind: 'member-sum-mismatch'; attemptId: string; gate: number; crew: number; members: (number | null)[] }   // §2.6
  | { kind: 'unparseable-cell'; attemptId: string; source: 'tcp' | 'xml'; slot: number; text: string }           // §1.3: slot = Course.slots[].slot

export type OnsitePerson = Omit<Person, 'birthDate'> & { birthYear: number | null }   // null: neither a birth date nor a year entered upstream (DERIVATIONS `birthDate`)
export type OnsiteEntry = Omit<Entry, 'members'> & { members: Observed<OnsitePerson[]> }
export type OnsiteEvent = Omit<Event, 'organiserId'>

export type EventCurrentResponse = { asOfSeq: number; event: OnsiteEvent; classes: Class[]; courses: Course[]; pendingPhaseIds: string[] }
export type ClassPhasesResponse = { asOfSeq: number; phases: Phase[] }
export type ClassEntriesResponse = { asOfSeq: number; entries: OnsiteEntry[] }
export type PhaseAttemptsResponse = { asOfSeq: number; attempts: Attempt[] }
export type ClassStandingsResponse = { asOfSeq: number; standings: Standing[] }
export type OnCourseResponse = { asOfSeq: number; attempts: Attempt[]; featuredByUpstream: string | null; asOf: Timestamp | null }
export type PhaseChecksResponse = { asOfSeq: number; checks: GateCheck[]; flags: GateFlag[] }
export type SourcesResponse = SourceStatus
export type DiagnosticsResponse = { asOfSeq: number; diagnostics: Diagnostic[] }
export type RebaselineScope = { kind: 'phase'; phaseId: string } | { kind: 'event' }
export type RebaselineRequest = { scope: RebaselineScope }
export type RebaselineResponse = { asOfSeq: number; scope: RebaselineScope; snapshotWrittenAt: Timestamp;
                            snapshotDetectedAt: Timestamp; attempts: number }

export type WsMessage = { seq: number } & WsPayload
export type WsPayload =
  | { type: 'attempt.updated'; attemptId: string; fields: Partial<Omit<Attempt, 'attemptId'>> }
  | { type: 'phase.updated'; phaseId: string; fields: Partial<Omit<Phase, 'phaseId'>> }
  | { type: 'entry.updated'; entryId: string; fields: Partial<Omit<OnsiteEntry, 'entryId'>> }
  | { type: 'class.updated'; classId: string; fields: Partial<Omit<Class, 'classId'>> }
  | { type: 'standing.updated'; standing: Standing }
  | { type: 'course.updated'; course: Course }
  | { type: 'write.updated'; write: WriteRequest }
  | { type: 'sources.updated'; sources: SourceStatus }
  | { type: 'check.updated'; attemptId: string; run: number; gate: number; check: GateCheck | null }
  | { type: 'flag.updated'; flag: GateFlag }
  | { type: 'oncourse.updated'; attemptIds: string[]; featuredByUpstream: string | null; asOf: Timestamp }
  | { type: 'diagnostics.updated'; diagnostics: Diagnostic[] }
  | { type: 'event.changed'; event: OnsiteEvent }
  | { type: 'scope.replaced'; scope: RebaselineScope; attempts: Attempt[]; standings: Standing[] }

export type PenaltyWriteRequest = { gate: number; value: 0 | 2 | 50 }

export type GateCheckRequest = { checkedBy?: string }
export type GateFlagCreateRequest = { gate: number; comment: string; suggestedValue?: number; createdBy?: string }
export type FlagResolutionRequest = { note?: string; resolvedBy?: string }

export type LivePhase = Omit<Phase, 'format'>   // no format token on the live tier — ADR-007

export type ClassPut = { code: string; name: string; discipline: 'slalom' | 'cross'; ageCategories: AgeCategory[] }
export type CoursePut = { gates: { number: number; kind: 'downstream' | 'upstream' }[]; sectorEndsAfterGate: number[];
                   splitsAfterGate: number[] }
export type PhasePut = { classId: string; kind: 'race' | 'classification'; stage: Stage; scoringKind: 'duration' | 'ordinal';
                  pair: PairRole | null; heats: boolean; date: string; courseId: string | null;
                  scheduledStart: Timestamp | null; programmeOrder: number | null; title: string | null;
                  status: PhaseStatus }
export type EntryPutMember = { givenName: string; familyName: string; birthDate?: string; externalId: ExternalId | null }
export type EntryPut = { classId: string; displayName: string; isTeam: boolean; club: string | null; nation: string | null;
                  ageCategoryId: string | null; eventBib: string | null; members: EntryPutMember[] }
export type AttemptPut = Partial<Omit<Attempt, 'attemptId' | 'phaseId' | 'bib'>>   // non-empty at runtime; identity is the path
export type ClassificationRow = { entryId: string; bib: string; rank: number | null; order: number; decidedIn: string | null }
export type ClassificationPut = { rows: ClassificationRow[]; asOf: Timestamp }
export type OnCoursePut = { attemptIds: string[]; featuredByUpstream: string | null }
export type PhaseAttemptsPut = { attempts: ({ bib: string } & AttemptPut)[] }

export type ClassPutResponse = { class: Class }
export type CoursePutResponse = { course: Course }
export type PhasePutResponse = { phase: LivePhase }
export type EntryPutResponse = { entry: Entry }                       // as stored: birthDate as pushed, §8.4's setting applies to reads
export type AttemptPutResponse = { attempt: Attempt }
export type ClassificationPutResponse = { standing: PublicStanding }  // the classification Standing assembled from the rows
export type OnCoursePutResponse = { attemptIds: string[]; featuredByUpstream: string | null; asOf: Timestamp }
export type PhaseAttemptsPutResponse = { attempts: Attempt[] }

export type PublicEventsQuery = { status?: 'live' | 'upcoming' | 'past' | 'all'; cursor?: string; limit?: number }
export type PublicEventSummary = { eventId: string; organiserName: string; name: string;
                            dateRange: { start: string; end: string } | null; status: 'live' | 'upcoming' | 'past' }
export type PublicEventsResponse = { asOfSeq: number; events: PublicEventSummary[]; nextCursor: string | null }
export type PublicEventResponse = { asOfSeq: number; event: Event; classes: Class[]; phases: LivePhase[]; courses: Course[] }
export type PublicPerson = Omit<Person, 'birthDate'> & { birthYear?: number | null; birthDate?: string }   // per birthDatePublication
export type PublicEntry = Omit<Entry, 'members'> & { members: Observed<PublicPerson[]> }
export type PublicEntriesResponse = { asOfSeq: number; entries: PublicEntry[] }
export type PublicStanding = Omit<Standing, 'anomalies'>
export type PublicStandingsResponse = { asOfSeq: number; standings: PublicStanding[] }
export type PublicAttemptsResponse = { asOfSeq: number; attempts: Attempt[] }
export type PublicOnCourseResponse = { asOfSeq: number; attempts: Attempt[]; featuredByUpstream: string | null; asOf: Timestamp | null }
export type PublicHeartbeat = { type: 'heartbeat'; asOfSeq: number; serverTime: Timestamp }
export type PublicStreamMessage =
  | { seq: number; type: 'attempt.updated'; attemptId: string; fields: Partial<Omit<Attempt, 'attemptId'>> }
  | { seq: number; type: 'attempt.deleted'; attemptId: string }
  | { seq: number; type: 'phase.updated'; phaseId: string; fields: Partial<Omit<LivePhase, 'phaseId'>> }
  | { seq: number; type: 'entry.updated'; entryId: string; fields: Partial<Omit<PublicEntry, 'entryId'>> }
  | { seq: number; type: 'class.updated'; classId: string; fields: Partial<Omit<Class, 'classId'>> }
  | { seq: number; type: 'course.updated'; course: Course }
  | { seq: number; type: 'standing.updated'; standing: PublicStanding }
  | { seq: number; type: 'oncourse.updated'; attemptIds: string[]; featuredByUpstream: string | null; asOf: Timestamp }
  | { seq: number; type: 'scope.replaced'; scope: { kind: 'phase'; phaseId: string }; attempts: Attempt[];
      standings: PublicStanding[] }
  | PublicHeartbeat
