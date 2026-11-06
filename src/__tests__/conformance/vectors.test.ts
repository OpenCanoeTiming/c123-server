import { describe, it } from 'vitest';
import { corePort } from './core-adapter.js';
import { isStrict, loadExpectedRed, registerVectorTests, serverVectors } from './run-vector.js';

// CONFORMANCE-VECTORS §1: c123-server runs every vector not tagged `live-ingest` (94).
// A listed id runs as `it.fails`; VECTORS_STRICT=1 makes every id a plain `it` (issue #200 "How it runs").
describe('tier-1 conformance vectors (c123-server)', () => {
  registerVectorTests({
    vectors: serverVectors(),
    port: corePort,
    expectedRed: loadExpectedRed(),
    strict: isStrict(),
    it,
  });
});
