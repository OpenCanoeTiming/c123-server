// Rows 4-8 (live half). Shape equality is row 1; this keeps the narrowing of the public
// stream and the heartbeat's missing seq (§8.4), and null-versus-absent on the live reads.
import { expectTypeOf, test } from 'vitest'
import type {
  AttemptPut, PublicEventSummary, PublicEventsResponse, PublicHeartbeat, PublicOnCourseResponse,
  PublicPerson, PublicStanding, PublicStreamMessage, Timestamp,
} from '../index.js'

type StreamType = PublicStreamMessage['type']
type Frame<T extends StreamType> = Extract<PublicStreamMessage, { type: T }>

test('PublicStreamMessage narrows payload by type (§8.4)', () => {
  function narrow(m: PublicStreamMessage) {
    switch (m.type) {
      case 'attempt.deleted':
        expectTypeOf(m.attemptId).toEqualTypeOf<string>()
        expectTypeOf(m.seq).toEqualTypeOf<number>()
        break
      case 'standing.updated':
        expectTypeOf(m.standing).toEqualTypeOf<PublicStanding>()
        break
      case 'scope.replaced':
        expectTypeOf(m.scope).toEqualTypeOf<{ kind: 'phase'; phaseId: string }>()
        expectTypeOf(m.standings).toEqualTypeOf<PublicStanding[]>()
        break
      case 'oncourse.updated':
        expectTypeOf(m.asOf).toEqualTypeOf<Timestamp>()
        break
      case 'heartbeat':
        expectTypeOf(m.serverTime).toEqualTypeOf<Timestamp>()
        expectTypeOf(m.asOfSeq).toEqualTypeOf<number>()
        break
      default:
        break
    }
    // @ts-expect-error a payload key is not available before narrowing
    void m.attemptId
  }
  void narrow
})

test('the stream never carries the on-site-only messages (§8.4)', () => {
  expectTypeOf<
    Extract<StreamType, 'write.updated' | 'sources.updated' | 'check.updated' | 'flag.updated' | 'event.changed' | 'diagnostics.updated'>
  >().toBeNever()
})

test('heartbeat is a member of PublicStreamMessage and has no seq; every other frame has one (§8.4, §1.6)', () => {
  expectTypeOf<Frame<'heartbeat'>>().toEqualTypeOf<PublicHeartbeat>()
  expectTypeOf<'seq' extends keyof PublicHeartbeat ? true : false>().toEqualTypeOf<false>()
  expectTypeOf<Exclude<PublicStreamMessage, { type: 'heartbeat' }>['seq']>().toEqualTypeOf<number>()
  // @ts-expect-error no seq on a heartbeat
  const hb: PublicHeartbeat = { type: 'heartbeat', asOfSeq: 1, serverTime: '2026-09-15T10:00:00Z', seq: 1 }
  void hb
})

test('null versus absent on the live reads (§8.3, §8.4)', () => {
  // nextCursor is always present, null on the last page
  expectTypeOf<PublicEventsResponse['nextCursor']>().toEqualTypeOf<string | null>()
  // dateRange and asOf are present and null before anything exists
  expectTypeOf<PublicEventSummary['dateRange']>().toEqualTypeOf<{ start: string; end: string } | null>()
  expectTypeOf<PublicOnCourseResponse['asOf']>().toEqualTypeOf<Timestamp | null>()
  // birth data: keys are omitted per publication setting; birthYear may be null where none was pushed
  expectTypeOf<PublicPerson['birthYear']>().toEqualTypeOf<number | null | undefined>()
  expectTypeOf<PublicPerson['birthDate']>().toEqualTypeOf<string | undefined>()
  const none: PublicPerson = { givenName: 'A', familyName: 'B', externalId: null }
  void none
  // an explicit not-yet resets a field; omission leaves it (§8.3)
  const reset: AttemptPut = { outcome: { state: 'not-yet' } }
  const untouched: AttemptPut = {}
  void [reset, untouched]
  // @ts-expect-error identity is the path, never the body
  const withId: AttemptPut = { attemptId: 'x:1' }
  void withId
})
