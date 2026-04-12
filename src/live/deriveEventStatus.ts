/**
 * Derive Event Status from C123 Race Statuses
 *
 * Pure function that maps per-race C123 RaceStatus values
 * to a single live EventStatus for the whole event.
 */

import type { ScheduleRace } from '../protocol/types.js';
import type { EventStatus } from './types.js';

/**
 * Ordering of EventStatus for forward-only transitions.
 */
export const STATUS_ORDER: Record<EventStatus, number> = {
  draft: 0,
  startlist: 1,
  running: 2,
  finished: 3,
  official: 4,
};

/**
 * C123 RaceStatus values that are excluded from evaluation.
 * These races don't block transitions (e.g., a cancelled race
 * shouldn't prevent the event from becoming "official").
 */
const EXCLUDED_RACE_STATUSES = new Set([
  7,  // Cancelled
  12, // Rescheduled
  13, // Postponed
]);

/**
 * Derive the desired EventStatus from current race statuses.
 *
 * Priority (highest first):
 * 1. Any InProgress(3) or Unofficial(4) → running
 * 2. All Official(5) or Revised(6) → official
 * 3. Any status >= 1 (StartList, Delayed, GettingReady, etc.) → startlist
 * 4. All Scheduled(0) → draft
 *
 * Returns null if schedule is empty or all races are excluded.
 */
export function deriveEventStatus(races: ScheduleRace[]): EventStatus | null {
  if (races.length === 0) return null;

  const active = races.filter(r => !EXCLUDED_RACE_STATUSES.has(r.raceStatus));
  if (active.length === 0) return null;

  const statuses = active.map(r => r.raceStatus);

  // Any race in progress or with unofficial results → event is running
  if (statuses.some(s => s === 3 || s === 4)) return 'running';

  // All races official or revised → event is official
  if (statuses.every(s => s === 5 || s === 6)) return 'official';

  // Any race beyond Scheduled (StartList, Delayed, GettingReady, etc.)
  if (statuses.some(s => s >= 1)) return 'startlist';

  // All Scheduled
  return 'draft';
}

/**
 * Check if transitioning from current to next is a forward move.
 * Returns false for same status or backward transitions.
 */
export function isForwardTransition(current: EventStatus, next: EventStatus): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}
