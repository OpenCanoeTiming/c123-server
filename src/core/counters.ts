/** Counts for the whole-recording sweep (row 14). Nothing reads them inside the core. */
import type { CoreState } from './types.js';

export const refuse = (s: CoreState, reason: string): void => {
  s.counters.refusals[reason] = (s.counters.refusals[reason] ?? 0) + 1;
};
