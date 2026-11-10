// Stub data-gate test file for scripts/__tests__/gates.test.ts (#313): records the C123_PROTOCOL_DOCS it saw into the file named by C123_GATES_STUB_OUT.
import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('gates stub: records env', () => {
  const out = process.env.C123_GATES_STUB_OUT
  if (out) writeFileSync(out, process.env.C123_PROTOCOL_DOCS ?? '<unset>')
  expect(1).toBe(1)
})
