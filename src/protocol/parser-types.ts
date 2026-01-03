/**
 * Parsed OnCourse competitor data
 */
export interface OnCourseCompetitor {
  /** Start number */
  bib: string;
  /** Full name */
  name: string;
  /** Club name */
  club: string;
  /** Nationality code */
  nat: string;
  /** Race ID (e.g., K1M_ST_BR2_6) */
  raceId: string;
  /** Race name (e.g., "K1m - střední trať - 2. jízda") */
  raceName: string;
  /** Start order */
  startOrder: number;
  /** Warning flag (e.g., yellow card) */
  warning: string;
  /** Gate penalties as comma-separated string */
  gates: string;
  /** Course completed flag */
  completed: boolean;
  /** Start timestamp (e.g., "16:14:00.000") */
  dtStart: string | null;
  /** Finish timestamp (e.g., "10:35:11.325") */
  dtFinish: string | null;
  /** Total penalty seconds */
  pen: number;
  /** Running time as formatted string (e.g., "75.09") */
  time: string | null;
  /** Total time as formatted string (e.g., "127.09") */
  total: string | null;
  /** Difference to time-to-beat (e.g., "+12.79") */
  ttbDiff: string;
  /** Name of leader */
  ttbName: string;
  /** Current rank */
  rank: number;
  /** Position in OnCourse list (1 = closest to finish) */
  position: number;
}

/**
 * Parsed OnCourse message
 */
export interface OnCourseMessage {
  /** Total competitors on course */
  total: number;
  /** List of competitors on course */
  competitors: OnCourseCompetitor[];
}

/**
 * Parsed result row
 */
export interface ResultRow {
  /** Rank in results */
  rank: number;
  /** Start number */
  bib: string;
  /** Full name */
  name: string;
  /** Given name */
  givenName: string;
  /** Family name */
  familyName: string;
  /** Club name */
  club: string;
  /** Nationality code */
  nat: string;
  /** Start order */
  startOrder: number;
  /** Start time (e.g., "10:06:45") */
  startTime: string;
  /** Gate penalties as space-separated string */
  gates: string;
  /** Total penalty seconds */
  pen: number;
  /** Time as formatted string (e.g., "79.99") */
  time: string;
  /** Total time as formatted string (e.g., "78.99") */
  total: string;
  /** Behind leader (e.g., "+1.23") */
  behind: string;

  // BR1/BR2 fields (only present in second run results)
  /** Previous run time in centiseconds */
  prevTime?: number;
  /** Previous run penalty seconds */
  prevPen?: number;
  /** Previous run total in centiseconds */
  prevTotal?: number;
  /** Previous run rank */
  prevRank?: number;
  /** Best of both runs (TotalTotal) in centiseconds */
  totalTotal?: number;
  /** Best run rank */
  totalRank?: number;
  /** Which run was better: 1 or 2 */
  betterRun?: number;
}

/**
 * Parsed Results message
 */
export interface ResultsMessage {
  /** Race ID (e.g., K1M_ST_BR2_6) */
  raceId: string;
  /** Class ID (e.g., K1M_ST) */
  classId: string;
  /** Is this the current race? */
  isCurrent: boolean;
  /** Main title (e.g., "K1m - střední trať") */
  mainTitle: string;
  /** Subtitle (e.g., "1st and 2nd Run") */
  subTitle: string;
  /** Result rows */
  rows: ResultRow[];
}

/**
 * Parsed TimeOfDay message
 */
export interface TimeOfDayMessage {
  /** Time string (e.g., "19:04:20") */
  time: string;
}

/**
 * Parsed RaceConfig message
 */
export interface RaceConfigMessage {
  /** Number of split points */
  nrSplits: number;
  /** Number of gates */
  nrGates: number;
  /** Gate configuration (N=Normal, R=Reverse) */
  gateConfig: string;
  /** Gate captions */
  gateCaptions: string;
}

/**
 * Race in schedule
 */
export interface ScheduleRace {
  /** Order in schedule */
  order: number;
  /** Race ID */
  raceId: string;
  /** Full race name */
  race: string;
  /** Main title */
  mainTitle: string;
  /** Subtitle */
  subTitle: string;
  /** Short title */
  shortTitle: string;
  /** Race status (3=running, 5=finished) */
  raceStatus: number;
  /** Start time */
  startTime: string;
}

/**
 * Parsed Schedule message
 */
export interface ScheduleMessage {
  /** List of races */
  races: ScheduleRace[];
}

/**
 * Union of all parsed message types
 */
export type ParsedMessage =
  | { type: 'oncourse'; data: OnCourseMessage }
  | { type: 'results'; data: ResultsMessage }
  | { type: 'timeofday'; data: TimeOfDayMessage }
  | { type: 'raceconfig'; data: RaceConfigMessage }
  | { type: 'schedule'; data: ScheduleMessage }
  | { type: 'unknown'; data: null };
