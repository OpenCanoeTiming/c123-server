/**
 * Tiny fixture for meta.test.ts rows 4 and 5: the same registration code the real suite uses
 * (`registerVectorTests`), a port that passes exactly one vector, and a ledger listing two.
 * Run in a child vitest; never part of the suite itself.
 */
import { describe, it } from 'vitest';
import { isStrict, registerVectorTests, type Vector } from '../run-vector.js';
import { scriptedPort } from '../test-ports.js';

const vec = (id: string, attemptId: string, value: string): Vector => ({
  id, invariant: 'fixture', description: '',
  context: { attemptId },
  given: [{ ingestSeq: 1, field: 'status', source: 'tcp', kind: 'inference', observedAt: '2026-09-15T10:00:00.000Z', value: 'finished', confidence: 'authoritative' }],
  expect: { status: { state: 'known', value } },
});

// The port presents status "finished" for every Attempt: fx-passes agrees, fx-fails and fx-unlisted-fails do not.
const port = scriptedPort({ presented: Object.fromEntries(['A:1', 'A:2', 'A:3'].map((a) => [a, { status: { state: 'known', value: 'finished' } }])) });

describe('ratchet fixture', () => {
  registerVectorTests({
    vectors: [vec('fx-passes', 'A:1', 'finished'), vec('fx-fails', 'A:2', 'dnf'), vec('fx-unlisted-fails', 'A:3', 'dnf')],
    port,
    expectedRed: ['fx-passes', 'fx-fails'],
    strict: isStrict(),
    it,
  });
});
