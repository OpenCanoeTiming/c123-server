// Literal samples shared by observed-type.test-d.ts (compile side) and
// schemas.test.ts (Ajv side), so the type and the schema are checked on the
// same values (test plan row 13). CONTRACTS §1.2.
import type { Observed } from '../index.js'

export const known: Observed<number> = {
  state: 'known',
  value: 82.36,
  observedAt: '2026-09-15T10:14:02.083Z',
  eventTime: '2026-09-15T10:14:02.079Z',
  source: 'tcp',
  confidence: 'authoritative',
  provisional: false,
}

export const knownNoEventTime: Observed<number> = {
  state: 'known',
  value: 0,
  observedAt: '2026-09-15T09:00:00.000Z',
  source: 'xml',
  confidence: 'inferred',
  provisional: true,
}

export const knownNull: Observed<number | null> = {
  state: 'known',
  value: null,
  observedAt: '2026-09-15T09:00:00.000+02:00',
  source: 'bridge',
  confidence: 'authoritative',
  provisional: false,
}

export const notYet: Observed<number> = { state: 'not-yet' }

export const unavailable: Observed<number> = { state: 'unavailable', reason: 'not-applicable' }

export const typedSamples = { known, knownNoEventTime, knownNull, notYet, unavailable }
