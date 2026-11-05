// Row 13, type half. CONTRACTS §1.2, §2.11. The runtime half is schemas.test.ts.
import { expectTypeOf, test } from 'vitest'
import type { Observed, SourceTag, UnavailableReason } from '../index.js'
import { typedSamples } from './observed-samples.js'

test('Observed type samples validate: every state compiles as Observed<number> (§1.2)', () => {
  expectTypeOf(typedSamples.known).toExtend<Observed<number>>()
  expectTypeOf(typedSamples.knownNoEventTime).toExtend<Observed<number>>()
  expectTypeOf(typedSamples.knownNull).toExtend<Observed<number | null>>()
  expectTypeOf(typedSamples.notYet).toExtend<Observed<number>>()
  expectTypeOf(typedSamples.unavailable).toExtend<Observed<number>>()
})

test('Observed type: envelope refuses what the schema refuses (§1.2 omission rule, closed vocabularies)', () => {
  // @ts-expect-error eventTime is omitted, never null
  const a: Observed<number> = { state: 'known', value: 1, observedAt: 'x', eventTime: null, source: 'tcp', confidence: 'authoritative', provisional: false }
  // @ts-expect-error unknown reason
  const b: Observed<number> = { state: 'unavailable', reason: 'because' }
  // @ts-expect-error unknown source tag
  const c: Observed<number> = { state: 'known', value: 1, observedAt: 'x', source: 'cis', confidence: 'authoritative', provisional: false }
  // @ts-expect-error not-yet carries no other key
  const d: Observed<number> = { state: 'not-yet', value: 1 }
  // @ts-expect-error unavailable requires a reason
  const e: Observed<number> = { state: 'unavailable' }
  // @ts-expect-error known requires provisional
  const f: Observed<number> = { state: 'known', value: 1, observedAt: 'x', source: 'tcp', confidence: 'authoritative' }
  // @ts-expect-error value is never null unless T allows it
  const g: Observed<number> = { state: 'known', value: null, observedAt: 'x', source: 'tcp', confidence: 'authoritative', provisional: false }
  void [a, b, c, d, e, f, g]
  expectTypeOf<SourceTag>().toEqualTypeOf<'tcp' | 'xml' | 'operator-write' | 'bridge'>()
  expectTypeOf<UnavailableReason>().toEqualTypeOf<'not-configured' | 'source-unreachable' | 'not-applicable'>()
})
