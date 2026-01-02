/**
 * CLI-compatible message types for scoreboard communication.
 *
 * These messages match the CanoeLiveInterface JSON protocol,
 * allowing scoreboards to connect to c123-server without modifications.
 */

/**
 * Result row in top results list
 */
export interface TopResultItem {
  /** Rank in results */
  Rank: number;
  /** Start number */
  Bib: string;
  /** Full name */
  Name: string;
  /** Club name */
  Club: string;
  /** Total time as formatted string (e.g., "78.99") */
  Total: string;
  /** Total penalty seconds */
  Pen: number;
  /** Behind leader (e.g., "+1.23") */
  Behind: string;
}

/**
 * Top results message (CLI: "top")
 */
export interface TopMessage {
  msg: 'top';
  data: {
    /** Race name */
    RaceName: string;
    /** Race status (3=running, 5=finished) */
    RaceStatus: string;
    /** Bib to highlight (recent finish) */
    HighlightBib: string;
    /** Results list */
    list: TopResultItem[];
  };
}

/**
 * On-course competitor item
 */
export interface OnCourseItem {
  /** Start number */
  Bib: string;
  /** Unique key: RaceId-Bib */
  BibKey: string;
  /** Full name */
  Name: string;
  /** Club name */
  Club: string;
  /** Gate penalties as comma-separated string */
  Gates: string;
  /** Total penalty seconds as string */
  Pen: string;
  /** Running time in centiseconds as string */
  Time: string;
  /** Total time in centiseconds as string */
  Total: string;
  /** Finish timestamp or empty string */
  dtFinish: string;
  /** Position in list (1 = closest to finish) */
  _pos: number;
}

/**
 * On-course message (CLI: "oncourse")
 */
export interface CliOnCourseMessage {
  msg: 'oncourse';
  data: OnCourseItem[];
}

/**
 * Current competitor message (CLI: "comp")
 */
export interface CompMessage {
  msg: 'comp';
  data: {
    /** Start number */
    Bib: string;
    /** Full name */
    Name: string;
    /** Club name */
    Club: string;
    /** Running time in centiseconds as string */
    Time: string;
    /** Total penalty seconds as string */
    Pen: string;
    /** Gate penalties as comma-separated string */
    Gates: string;
    /** Current rank */
    Rank: string;
    /** Difference to leader */
    TTBDiff: string;
    /** Leader name */
    TTBName: string;
  };
}

/**
 * Control state message (CLI: "control")
 */
export interface ControlMessage {
  msg: 'control';
  data: {
    displayCurrent: string;
    displayTop: string;
    displayTop10: string;
    displayInfoText: string;
    displaySchedule: string;
    displayDayTime: string;
    displayTitle: string;
    displayTopBar: string;
    displayFooter: string;
    displayOnCourse: string;
    displayOnStart: string;
  };
}

/**
 * Union of all CLI message types
 */
export type CliMessage = TopMessage | CliOnCourseMessage | CompMessage | ControlMessage;

/**
 * Events emitted by WebSocketServer
 */
export interface WebSocketServerEvents {
  /** Client connected */
  connection: [clientId: string];
  /** Client disconnected */
  disconnection: [clientId: string];
  /** Error occurred */
  error: [error: Error];
}

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  /** Port to listen on */
  port: number;
}
