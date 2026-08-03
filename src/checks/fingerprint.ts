import type { XmlScheduleItem } from '../service/XmlDataService.js';

/**
 * Minimum fraction of the stored races that must still be present for a checks
 * file to be considered the same event.
 *
 * Strict equality is wrong here: operators routinely add a heat, add a category
 * or reorder races mid-event, and any of those would archive the file and
 * discard every check made that day.
 */
export const SAME_EVENT_MIN_RATIO = 0.5;

/**
 * Build the event fingerprint from a schedule.
 *
 * Not to be confused with `EventState.createScheduleFingerprint`, which serves
 * a different purpose from a different source: it detects that the *TCP* feed
 * switched events, orders race IDs by race order, carries no day component and
 * compares by exact equality. This one identifies the event a persisted checks
 * file belongs to and must tolerate a schedule being edited mid-event.
 *
 * One `raceId@YYYY-MM-DD` token per race, deduplicated, sorted, joined by `|`.
 * Kept human-readable rather than hashed: this guards against data loss, and
 * diagnosing a file that archived unexpectedly means reading the stored value.
 *
 * Returns `''` for an empty schedule. Callers must never pin an empty
 * fingerprint, and must never archive by comparing against one.
 */
export function computeScheduleFingerprint(schedule: XmlScheduleItem[]): string {
  const tokens = schedule.map((item) => `${item.raceId}@${scheduleDay(item.startTime)}`);
  return [...new Set(tokens)].sort().join('|');
}

/**
 * Day component of a race token.
 *
 * StartTime looks like `2024-06-25T13:30:00+02:00`. The first 10 characters are
 * the day as the organiser sees it. Parsing to `Date` and formatting as UTC
 * would shift late-evening races into the next or previous day, making the
 * fingerprint unstable on its own.
 *
 * StartTime is optional — extreme heats (XT, X4) omit it — and those races
 * contribute a token with an empty day rather than being skipped. Skipping them
 * would give an all-extreme event an empty fingerprint, which is the hole this
 * mechanism exists to close.
 */
function scheduleDay(startTime: string | undefined): string {
  return startTime ? startTime.slice(0, 10) : '';
}

/**
 * Whether a stored fingerprint and the current one describe the same event.
 *
 * An empty stored fingerprint matches anything: nothing has been pinned, so
 * there is nothing to protect.
 */
export function isSameEvent(stored: string, current: string): boolean {
  const storedTokens = splitTokens(stored);
  if (storedTokens.length === 0) {
    return true;
  }

  const currentTokens = new Set(splitTokens(current));
  const overlap = storedTokens.filter((token) => currentTokens.has(token)).length;

  return overlap >= storedTokens.length * SAME_EVENT_MIN_RATIO;
}

function splitTokens(fingerprint: string): string[] {
  return fingerprint ? fingerprint.split('|') : [];
}
