import type {
  OnCourseCompetitor,
  ResultsMessage,
  RaceConfigMessage,
  ScheduleRace,
} from '../parsers/types.js';

/**
 * Current state of the event
 */
export interface EventStateData {
  /** Current server time from C123 */
  timeOfDay: string | null;

  /** Race configuration (gates, splits) */
  raceConfig: RaceConfigMessage | null;

  /** Schedule of races */
  schedule: ScheduleRace[];

  /** Currently active race ID */
  currentRaceId: string | null;

  /** Competitors currently on course */
  onCourse: OnCourseCompetitor[];

  /** Current results for the active race */
  results: ResultsMessage | null;

  /** Bib to highlight (recent finish) */
  highlightBib: string | null;
}

/**
 * Events emitted by EventState
 */
export interface EventStateEvents {
  /** State has changed */
  change: [state: EventStateData];

  /** New finish detected */
  finish: [competitor: OnCourseCompetitor];

  /** Race changed */
  raceChange: [raceId: string];
}
