/** The tracker lives in `src/ingest` (the on-site process uses it too, and `src` may not import from `scripts`); the drivers keep this path. */
export { createContextTracker } from '../../src/ingest/context-tracker.js';
export type { ContextTracker } from '../../src/ingest/context-tracker.js';
