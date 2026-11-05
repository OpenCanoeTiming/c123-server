// Rows 9-13 (runtime half of 13). The schemas under docs/arch/schemas are the authority.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, test } from 'vitest'
import { known, knownNoEventTime, knownNull, notYet, unavailable } from './observed-samples.js'
import { SCHEMAS_DIR, SCHEMA_FILES } from './paths.js'

const load = (f: string) => JSON.parse(readFileSync(join(SCHEMAS_DIR, f), 'utf8')) as object

/** Fresh strict Ajv 2020 per call. `date-time` is the only format the schemas use. */
function ajv() {
  const a = new Ajv2020({ strict: true, allErrors: true })
  a.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/)
  return a
}
const validator = (file: string) => ajv().compile(load(file))

describe('row 9 schemas are valid', () => {
  test.each(SCHEMA_FILES)('%s compiles strict', (file) => {
    expect(() => validator(file)).not.toThrow()
  })
})

// ---------------------------------------------------------------- row 10: CONTRACTS §1.2, §2.11
describe('row 10 observed schema enforces §1.2', () => {
  const v = () => validator('observed.schema.json')
  const base = {
    state: 'known', value: 82.36, observedAt: '2026-09-15T10:14:02.083Z', source: 'tcp',
    confidence: 'authoritative', provisional: false,
  }

  test('observed accepts the §1.2 examples', () => {
    const validate = v()
    const examples = [
      { state: 'known', value: 82.36, observedAt: '2026-09-15T10:14:02.083Z', eventTime: '2026-09-15T10:14:02.079Z', source: 'tcp', confidence: 'authoritative', provisional: false },
      { state: 'known', value: 'K1M', observedAt: '2026-09-15T09:00:00.000Z', source: 'xml', confidence: 'authoritative', provisional: false },
      { state: 'not-yet' },
      { state: 'unavailable', reason: 'not-applicable' },
    ]
    for (const e of examples) expect(validate(e), JSON.stringify(validate.errors)).toBe(true)
  })

  test('observed accepts the §2.11 worked-example shapes (nested Outcome value, inferred, provisional)', () => {
    const validate = v()
    const outcome = {
      state: 'known',
      value: { kind: 'duration', runSeconds: 82.36, penaltySeconds: 0, totalSeconds: 82.36 },
      observedAt: '2026-09-15T10:14:02.083Z', eventTime: '2026-09-15T10:14:02.079Z',
      source: 'tcp', confidence: 'inferred', provisional: true,
    }
    const placement = { state: 'known', value: { rank: 3, order: 3 }, observedAt: '2026-09-15T10:14:02.400Z', source: 'tcp', confidence: 'authoritative', provisional: true }
    for (const e of [outcome, placement, { ...outcome, confidence: 'authoritative' }]) {
      expect(validate(e), JSON.stringify(validate.errors)).toBe(true)
    }
  })

  test('observed accepts every unavailable reason and every source tag', () => {
    const validate = v()
    for (const reason of ['not-configured', 'source-unreachable', 'not-applicable']) {
      expect(validate({ state: 'unavailable', reason })).toBe(true)
    }
    for (const source of ['tcp', 'xml', 'operator-write', 'bridge']) {
      expect(validate({ ...base, source })).toBe(true)
    }
  })

  test('observed rejects an unknown reason', () => {
    const validate = v()
    expect(validate({ state: 'unavailable', reason: 'offline' })).toBe(false)
    expect(validate({ state: 'unavailable', reason: 'Source unreachable' })).toBe(false)
    expect(validate({ state: 'unavailable' })).toBe(false)
  })

  test('observed rejects an unknown source tag', () => {
    const validate = v()
    expect(validate({ ...base, source: 'cis' })).toBe(false)
    expect(validate({ ...base, source: 'operator-assertion' })).toBe(false)
  })

  test('observed rejects a violation of the eventTime omission rule (null instead of absent)', () => {
    const validate = v()
    expect(validate({ ...base, eventTime: null })).toBe(false)
    expect(validate({ ...base, eventTime: '' })).toBe(false)
  })

  test('observed rejects structural violations of the wire encoding (§1.2)', () => {
    const validate = v()
    expect(validate({ state: 'not-yet', value: 1 })).toBe(false)
    expect(validate({ state: 'unavailable', reason: 'not-applicable', value: 1 })).toBe(false)
    expect(validate({ state: 'known', observedAt: base.observedAt, source: 'tcp', confidence: 'authoritative', provisional: false })).toBe(false) // no value
    const { provisional: _p, ...noProv } = base
    void _p
    expect(validate(noProv)).toBe(false)
    expect(validate({ ...base, confidence: 'certain' })).toBe(false)
    expect(validate({ ...base, confidence: 0.9 })).toBe(false)
    expect(validate({ ...base, state: 'maybe' })).toBe(false)
  })
})

// ---------------------------------------------------------------- row 11: CONTRACTS §1.4
describe('row 11 error schema enforces §1.4', () => {
  const v = () => validator('error.schema.json')

  test('error accepts the §1.4 example and every code of the closed table', () => {
    const validate = v()
    expect(validate({ error: { code: 'phase-not-found', message: 'no Phase K1M_ST_BR3_6 in this event' } }), JSON.stringify(validate.errors)).toBe(true)
    for (const code of [
      'event-not-found', 'class-not-found', 'course-not-found', 'phase-not-found', 'attempt-not-found',
      'write-not-found', 'flag-not-found', 'write-not-possible', 'validation-failed',
      'vendor-payload-rejected', 'unauthorized', 'forbidden', 'rate-limited', 'source-unavailable',
    ]) {
      expect(validate({ error: { code, message: 'm' } }), code).toBe(true)
    }
  })

  test('error accepts validation-failed details [{field, issue}]', () => {
    const validate = v()
    expect(validate({ error: { code: 'validation-failed', message: 'm', details: [{ field: 'gate', issue: 'out of range' }] } })).toBe(true)
  })

  test('error rejects a missing code, an unknown code and a missing message', () => {
    const validate = v()
    expect(validate({ error: { message: 'x' } })).toBe(false)
    expect(validate({ error: { code: 'something-else', message: 'x' } })).toBe(false)
    expect(validate({ error: { code: 'PhaseNotFound', message: 'x' } })).toBe(false)
    expect(validate({ error: { code: 'phase-not-found' } })).toBe(false)
    expect(validate({ code: 'phase-not-found', message: 'x' })).toBe(false)
  })
})

// ---------------------------------------------------------------- row 12: TEST-ARCHITECTURE §3.2, §4
describe('row 12 admission block', () => {
  // fixture-admitted.schema.json does not compile under strictTypes (its `then` branch uses
  // `properties` without `type: object`); that is row 9's red, recorded in the result file.
  // Row 12 asserts behaviour, so it compiles with strictTypes off and everything else strict.
  const admissionValidator = () => {
    const a = new Ajv2020({ strict: true, strictTypes: false, allErrors: true })
    return a.compile(load('fixture-admitted.schema.json'))
  }
  const sha = 'a'.repeat(64)
  const pair = [sha, 'b'.repeat(64)]
  const admitted = () => ({
    status: 'admitted',
    gate1: true,
    gate2: true,
    gate3: {
      mechanical: {
        attempts: 40, fields: 400, match: 400, mismatch: 0, changedAfterWindow: 0,
        changedAfterWindowEqualsWindowEnd: 0, noFinalRow: 0,
        report: { file: 'gate3-report.json', sha256: sha },
        against: 'published-results', windowSpansWholeRaces: true,
      },
      human: 'human-checked-2026-09-20 by J. Novak',
    },
    evidence: {
      gate1: { stepLogSha256: pair, finalStateSha256: pair, candidateSha256: pair },
      gate2: { checker: 'gate2-properties@1', violations: {} },
    },
  })

  test('fixture-admitted accepts a fully admitted block', () => {
    const validate = admissionValidator()
    expect(validate(admitted()), JSON.stringify(validate.errors)).toBe(true)
  })

  test('fixture-admitted accepts a candidate that fails the gates (candidates are legal)', () => {
    const validate = admissionValidator()
    const c = admitted()
    c.status = 'candidate'
    c.gate1 = false
    c.gate3.human = 'TODO'
    expect(validate(c), JSON.stringify(validate.errors)).toBe(true)
  })

  const refusals: [string, (b: ReturnType<typeof admitted>) => void][] = [
    ['gate 1 false', (b) => { b.gate1 = false }],
    ['gate 2 false', (b) => { b.gate2 = false }],
    ['a mismatch', (b) => { b.gate3.mechanical.mismatch = 1 }],
    ['a window that does not span whole races', (b) => { b.gate3.mechanical.windowSpansWholeRaces = false }],
    ['a check against window-end-xml instead of published results', (b) => { b.gate3.mechanical.against = 'window-end-xml' }],
    ['a human line that is a TODO', (b) => { b.gate3.human = 'TODO' }],
    ['a human line without a date', (b) => { b.gate3.human = 'human-checked by J. Novak' }],
    ['a human line without a name', (b) => { b.gate3.human = 'human-checked-2026-09-20' }],
    ['an empty human line', (b) => { b.gate3.human = '' }],
  ]
  test.each(refusals)('fixture-admitted refuses status admitted with %s', (_name, mutate) => {
    const validate = admissionValidator()
    const b = admitted()
    mutate(b)
    expect(validate(b)).toBe(false)
  })

  test('fixture-admitted refuses a block missing a required part', () => {
    const validate = admissionValidator()
    for (const key of ['status', 'gate1', 'gate2', 'gate3', 'evidence'] as const) {
      const b: Record<string, unknown> = admitted()
      delete b[key]
      expect(validate(b), `without ${key}`).toBe(false)
    }
    const noHuman = admitted() as { gate3: { human?: string } }
    delete noHuman.gate3.human
    expect(validate(noHuman)).toBe(false)
    expect(validate({ ...admitted(), status: 'verified' })).toBe(false)
  })
})

// ---------------------------------------------------------------- row 13 runtime half
describe('row 13 types agree with schemas', () => {
  test('Observed type samples validate', () => {
    const validate = validator('observed.schema.json')
    for (const [name, sample] of Object.entries({ known, knownNoEventTime, knownNull, notYet, unavailable })) {
      expect(validate(sample), `${name}: ${JSON.stringify(validate.errors)}`).toBe(true)
    }
  })
})
