import { EventEmitter } from 'node:events';
import type { ParsedMessage, OnCourseCompetitor, ScheduleRace } from '../protocol/index.js';
import type { EventStateData, EventStateEvents } from './types.js';
import { Logger } from '../utils/logger.js';

const HIGHLIGHT_DURATION_MS = 10000;

/**
 * Aggregated state of the current event.
 *
 * Receives parsed messages and maintains current state of:
 * - Time of day
 * - Race configuration
 * - Schedule
 * - On-course competitors
 * - Results
 * - Highlight (recent finish)
 */
export class EventState extends EventEmitter<EventStateEvents> {
  private _state: EventStateData = {
    timeOfDay: null,
    raceConfig: null,
    schedule: [],
    currentRaceId: null,
    onCourse: [],
    results: null,
    highlightBib: null,
    scheduleFingerprint: null,
  };

  private highlightTimer: NodeJS.Timeout | null = null;
  private previousOnCourse: Map<string, OnCourseCompetitor> = new Map();
  // #150: C123 broadcasts OnCourse one competitor per TCP message. If we just
  // replace the onCourse array with each message we end up pushing a single
  // rider per push downstream, and any push that gets dropped (fetch pool,
  // in-flight guard, network blip) silently loses that one rider's update
  // until the next time C123 rebroadcasts them — visible downstream as
  // per-rider "jumps". Instead we keep a per-bib map and merge, so the
  // on-course snapshot always reflects every rider seen in the last
  // ONCOURSE_TTL_MS window.
  private onCourseByBib: Map<string, { comp: OnCourseCompetitor; seenAt: number }> = new Map();
  private static readonly ONCOURSE_TTL_MS = 10_000;

  /**
   * Get the current state (readonly snapshot)
   */
  get state(): Readonly<EventStateData> {
    return this._state;
  }

  /**
   * Process a parsed message and update state
   */
  processMessage(message: ParsedMessage): void {
    switch (message.type) {
      case 'timeofday':
        this._state.timeOfDay = message.data.time;
        break;

      case 'raceconfig':
        this._state.raceConfig = message.data;
        break;

      case 'schedule':
        this.updateSchedule(message.data.races);
        break;

      case 'oncourse':
        this.updateOnCourse(message.data.competitors);
        break;

      case 'results':
        this.updateResults(message.data);
        break;

      case 'unknown':
        // Ignore unknown messages
        return;
    }

    this.emit('change', this._state);
  }

  /**
   * Create a fingerprint from schedule to detect event changes.
   * Uses all raceIds sorted to create a stable identifier.
   */
  private createScheduleFingerprint(races: ScheduleRace[]): string {
    if (races.length === 0) {
      return '';
    }
    // Sort by order and create fingerprint from raceIds
    const sortedRaceIds = races
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((r) => r.raceId)
      .join('|');
    return sortedRaceIds;
  }

  /**
   * Update schedule and detect event changes
   */
  private updateSchedule(races: ScheduleRace[]): void {
    const newFingerprint = this.createScheduleFingerprint(races);
    const oldFingerprint = this._state.scheduleFingerprint;

    this._state.schedule = races;
    this._state.scheduleFingerprint = newFingerprint;

    // Detect schedule change (different event loaded)
    if (oldFingerprint !== null && newFingerprint !== oldFingerprint) {
      Logger.info('EventState', `Schedule changed: event reset detected`);
      this.emit('scheduleChange', newFingerprint);
    }
  }

  /**
   * Update on-course competitors and detect finishes.
   *
   * #150: C123 sends ONE competitor per TCP OnCourse message (`<OnCourse
   * Total="3" Position="1"><Participant Bib=".../></OnCourse>`), cycling
   * through everyone currently on course. We merge each message into a
   * per-bib map and rebuild the onCourse array from the map, so the
   * snapshot state.onCourse always carries the freshest data for every
   * rider. Before this merge, the array was overwritten per-message, which
   * meant each outgoing push to live-mini contained only one rider — if
   * any push was dropped, that rider "froze" until C123 rebroadcasted them.
   */
  private updateOnCourse(competitors: OnCourseCompetitor[]): void {
    const now = Date.now();

    // Detect finishes on incoming competitors (compare with previous state)
    for (const comp of competitors) {
      const prev = this.previousOnCourse.get(comp.bib);
      if (prev && !prev.dtFinish && comp.dtFinish) {
        this.onFinish(comp);
      }
    }

    // Merge incoming competitors into the per-bib map
    for (const comp of competitors) {
      this.onCourseByBib.set(comp.bib, { comp, seenAt: now });
    }

    // Expire riders we haven't heard about for TTL
    for (const [bib, entry] of this.onCourseByBib) {
      if (now - entry.seenAt > EventState.ONCOURSE_TTL_MS) {
        this.onCourseByBib.delete(bib);
      }
    }

    // Rebuild onCourse array from the map, preserving race position order
    const merged = Array.from(this.onCourseByBib.values())
      .map((e) => e.comp)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });

    this._state.onCourse = merged;

    // Update current race from merged competitors (prefer incoming, else first in map)
    const source = competitors[0] ?? merged[0];
    if (source?.raceId && this._state.currentRaceId !== source.raceId) {
      this._state.currentRaceId = source.raceId;
      this.emit('raceChange', source.raceId);
    }

    // Remember this snapshot for next finish-detection call
    const newPrev = new Map<string, OnCourseCompetitor>();
    for (const comp of merged) {
      newPrev.set(comp.bib, comp);
    }
    this.previousOnCourse = newPrev;
  }

  /**
   * Update results
   *
   * Only accepts results that are for the current race:
   * - Results marked as isCurrent=true (C123 indicates this is the active race)
   * - Results matching the currentRaceId (from OnCourse competitors)
   *
   * This prevents results from other categories rotated by C123 from
   * overwriting the active race's results.
   */
  private updateResults(results: typeof this._state.results): void {
    if (!results) {
      this._state.results = null;
      return;
    }

    // Accept results if marked as current by C123
    if (results.isCurrent) {
      this._state.results = results;
      // Update current race ID if different
      if (results.raceId && this._state.currentRaceId !== results.raceId) {
        this._state.currentRaceId = results.raceId;
        this.emit('raceChange', results.raceId);
      }
      return;
    }

    // Accept results if they match the current race (from OnCourse)
    if (this._state.currentRaceId && results.raceId === this._state.currentRaceId) {
      this._state.results = results;
      return;
    }

    // Ignore results for other races - don't overwrite current results
    Logger.debug(
      'EventState',
      `Ignoring results for ${results.raceId} (current: ${this._state.currentRaceId})`
    );
  }

  /**
   * Handle finish detection
   */
  private onFinish(competitor: OnCourseCompetitor): void {
    this.setHighlight(competitor.bib);
    this.emit('finish', competitor);
  }

  /**
   * Set highlight bib with auto-clear timer
   */
  private setHighlight(bib: string): void {
    // Clear existing timer
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }

    this._state.highlightBib = bib;

    // Auto-clear after duration
    this.highlightTimer = setTimeout(() => {
      this._state.highlightBib = null;
      this.highlightTimer = null;
      this.emit('change', this._state);
    }, HIGHLIGHT_DURATION_MS);
  }

  /**
   * Manually set highlight (e.g., from external source)
   */
  setHighlightBib(bib: string | null): void {
    if (bib) {
      this.setHighlight(bib);
    } else {
      if (this.highlightTimer) {
        clearTimeout(this.highlightTimer);
        this.highlightTimer = null;
      }
      this._state.highlightBib = null;
    }
    this.emit('change', this._state);
  }

  /**
   * Reset state
   */
  reset(): void {
    Logger.info('EventState', 'State reset');

    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }

    this.previousOnCourse.clear();
    this.onCourseByBib.clear();

    this._state = {
      timeOfDay: null,
      raceConfig: null,
      schedule: [],
      currentRaceId: null,
      onCourse: [],
      results: null,
      highlightBib: null,
      scheduleFingerprint: null,
    };

    this.emit('change', this._state);
  }

  /**
   * Clean up timers
   */
  destroy(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
    this.removeAllListeners();
  }
}
