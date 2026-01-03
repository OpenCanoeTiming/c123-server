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
   * Update on-course competitors and detect finishes
   */
  private updateOnCourse(competitors: OnCourseCompetitor[]): void {
    // Build map of current competitors
    const currentMap = new Map<string, OnCourseCompetitor>();
    for (const comp of competitors) {
      currentMap.set(comp.bib, comp);
    }

    // Detect finishes: competitor had no dtFinish before, now has one
    for (const comp of competitors) {
      const prev = this.previousOnCourse.get(comp.bib);
      if (prev && !prev.dtFinish && comp.dtFinish) {
        this.onFinish(comp);
      }
    }

    // Update previous state for next comparison
    this.previousOnCourse = currentMap;

    // Update current race from first competitor
    if (competitors.length > 0 && competitors[0].raceId) {
      const newRaceId = competitors[0].raceId;
      if (this._state.currentRaceId !== newRaceId) {
        this._state.currentRaceId = newRaceId;
        this.emit('raceChange', newRaceId);
      }
    }

    this._state.onCourse = competitors;
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
