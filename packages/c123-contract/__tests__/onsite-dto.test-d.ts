// Rows 4-8 (on-site half). Shape equality with CONTRACTS is row 1; these keep only what
// two-way equality does not demonstrate: narrowing by discriminant, and null versus
// absent where the contract says so (§1.2, §1.3). Enforced by vitest typecheck.
import { expectTypeOf, test } from 'vitest'
import type {
  Diagnostic, ErrorCode, ErrorEnvelope, Gate, GateCheck, GateFlag, Observed, StandingEntry,
  Standing, WsMessage, WriteRequest, Attempt, Timestamp, Event, OnsiteEvent,
} from '../index.js'

type Err = ErrorEnvelope['error']
type NoDetails = Exclude<ErrorCode, 'validation-failed' | 'write-not-possible' | 'source-unavailable'>

test('ErrorEnvelope narrows details by code (§1.4)', () => {
  expectTypeOf<Extract<Err, { code: 'validation-failed' }>['details']>().toEqualTypeOf<{ field: string; issue: string }[]>()
  expectTypeOf<Extract<Err, { code: 'write-not-possible' }>['details']['reason']>().toEqualTypeOf<'run-not-closed' | 'team-boat' | 'cross'>()
  expectTypeOf<Extract<Err, { code: 'source-unavailable' }>['details']['reason']>().toEqualTypeOf<'not-configured' | 'unreadable' | 'invalid'>()
  expectTypeOf<Err['message']>().toEqualTypeOf<string>()
  expectTypeOf<Err['code']>().toEqualTypeOf<ErrorCode>()

  function narrow(e: Err) {
    if (e.code === 'validation-failed') expectTypeOf(e.details).toEqualTypeOf<{ field: string; issue: string }[]>()
    if (e.code === 'write-not-possible') expectTypeOf(e.details.reason).toEqualTypeOf<'run-not-closed' | 'team-boat' | 'cross'>()
    if (e.code === 'source-unavailable') expectTypeOf(e.details.reason).toEqualTypeOf<'not-configured' | 'unreadable' | 'invalid'>()
    if (e.code === 'event-not-found') {
      // @ts-expect-error details does not exist on a code that carries none
      void e.details
    }
  }
  void narrow
})

test('ErrorEnvelope: details is required on its three codes and absent on every other (§1.4)', () => {
  // every code without details is valid bare, and refused with details (fresh literals: excess keys are errors)
  expectTypeOf<{ code: NoDetails; message: string }>().toExtend<Err>()
  expectTypeOf<NoDetails>().toEqualTypeOf<'event-not-found' | 'class-not-found' | 'course-not-found' | 'phase-not-found' | 'attempt-not-found' | 'write-not-found' | 'flag-not-found' | 'vendor-payload-rejected' | 'unauthorized' | 'forbidden' | 'rate-limited'>()
  // @ts-expect-error details is absent on event-not-found
  const d_event_not_found: Err = { code: 'event-not-found', message: 'm', details: [] }
  void d_event_not_found
  // @ts-expect-error details is absent on class-not-found
  const d_class_not_found: Err = { code: 'class-not-found', message: 'm', details: [] }
  void d_class_not_found
  // @ts-expect-error details is absent on course-not-found
  const d_course_not_found: Err = { code: 'course-not-found', message: 'm', details: [] }
  void d_course_not_found
  // @ts-expect-error details is absent on phase-not-found
  const d_phase_not_found: Err = { code: 'phase-not-found', message: 'm', details: [] }
  void d_phase_not_found
  // @ts-expect-error details is absent on attempt-not-found
  const d_attempt_not_found: Err = { code: 'attempt-not-found', message: 'm', details: [] }
  void d_attempt_not_found
  // @ts-expect-error details is absent on write-not-found
  const d_write_not_found: Err = { code: 'write-not-found', message: 'm', details: [] }
  void d_write_not_found
  // @ts-expect-error details is absent on flag-not-found
  const d_flag_not_found: Err = { code: 'flag-not-found', message: 'm', details: [] }
  void d_flag_not_found
  // @ts-expect-error details is absent on vendor-payload-rejected
  const d_vendor_payload_rejected: Err = { code: 'vendor-payload-rejected', message: 'm', details: [] }
  void d_vendor_payload_rejected
  // @ts-expect-error details is absent on unauthorized
  const d_unauthorized: Err = { code: 'unauthorized', message: 'm', details: [] }
  void d_unauthorized
  // @ts-expect-error details is absent on forbidden
  const d_forbidden: Err = { code: 'forbidden', message: 'm', details: [] }
  void d_forbidden
  // @ts-expect-error details is absent on rate-limited
  const d_rate_limited: Err = { code: 'rate-limited', message: 'm', details: [] }
  void d_rate_limited
  // @ts-expect-error details is never null
  const dn: Err = { code: 'forbidden', message: 'm', details: null }
  void dn
  // the three that carry it are refused without it
  expectTypeOf<{ code: 'validation-failed'; message: string }>().not.toExtend<Err>()
  expectTypeOf<{ code: 'write-not-possible'; message: string }>().not.toExtend<Err>()
  expectTypeOf<{ code: 'source-unavailable'; message: string }>().not.toExtend<Err>()
  // and refused with another code's details
  expectTypeOf<{ code: 'write-not-possible'; message: string; details: { reason: 'invalid' } }>().not.toExtend<Err>()
  expectTypeOf<{ code: 'source-unavailable'; message: string; details: { reason: 'cross' } }>().not.toExtend<Err>()
})

test('WsMessage narrows payload by type, and every message carries seq (§7.2)', () => {
  expectTypeOf<WsMessage['seq']>().toEqualTypeOf<number>()
  function narrow(m: WsMessage) {
    switch (m.type) {
      case 'attempt.updated':
        expectTypeOf(m.attemptId).toEqualTypeOf<string>()
        expectTypeOf(m.fields).toEqualTypeOf<Partial<Omit<Attempt, 'attemptId'>>>()
        break
      case 'check.updated':
        expectTypeOf(m.check).toEqualTypeOf<GateCheck | null>()
        expectTypeOf(m.run).toEqualTypeOf<number>()
        break
      case 'flag.updated':
        expectTypeOf(m.flag).toEqualTypeOf<GateFlag>()
        break
      case 'write.updated':
        expectTypeOf(m.write).toEqualTypeOf<WriteRequest>()
        break
      case 'standing.updated':
        expectTypeOf(m.standing).toEqualTypeOf<Standing>()
        break
      case 'diagnostics.updated':
        expectTypeOf(m.diagnostics).toEqualTypeOf<Diagnostic[]>()
        break
      case 'event.changed':
        expectTypeOf(m.event).toEqualTypeOf<OnsiteEvent>()
        break
      case 'oncourse.updated':
        expectTypeOf(m.asOf).toEqualTypeOf<Timestamp>()
        break
      default:
        break
    }
    // @ts-expect-error a payload key is not available before narrowing
    void m.standing
  }
  void narrow
})

test('the on-site Event carries no organiserId (§2.1, §2.2); Event itself does', () => {
  expectTypeOf<'organiserId' extends keyof OnsiteEvent ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<'organiserId' extends keyof Event ? true : false>().toEqualTypeOf<true>()
})

test('null stays distinct from an absent key where the contract says so (§1.2, §1.3)', () => {
  // Gate.penalty: null = not judged, required, never omitted and never coerced to 0
  const judged: Gate = { number: 1, penalty: null }
  void judged
  // @ts-expect-error penalty may be null but not absent
  const omitted: Gate = { number: 1 }
  void omitted
  // memberPenalties is absent until the snapshot; its cells may be null
  const team: Gate = { number: 1, penalty: 4, memberPenalties: [2, null, 2] }
  void team
  // @ts-expect-error an absent memberPenalties is the key omitted, not null
  const nullMembers: Gate = { number: 1, penalty: 4, memberPenalties: null }
  void nullMembers
  // rank/order are null until placed: required keys with null values
  expectTypeOf<StandingEntry['rank']>().toEqualTypeOf<number | null>()
  // @ts-expect-error eventTime is omitted, never null
  const evt: Observed<number> = { state: 'known', value: 1, observedAt: 'x', eventTime: null, source: 'tcp', confidence: 'authoritative', provisional: false }
  void evt
  // a known value of null is legal only where T allows it
  const nullable: Observed<number | null> = { state: 'known', value: null, observedAt: 'x', source: 'tcp', confidence: 'authoritative', provisional: false }
  void nullable
})
