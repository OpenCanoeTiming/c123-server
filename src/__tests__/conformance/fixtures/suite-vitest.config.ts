import { defineConfig } from 'vitest/config';

// Used only by suite-runs.test.ts: runs the real vectors.test.ts alone in a child vitest (root = the repo).
export default defineConfig({ test: { include: ['src/__tests__/conformance/vectors.test.ts'], typecheck: { enabled: false } } });
