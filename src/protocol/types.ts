/**
 * C123 Protocol Types
 *
 * These types define the wire format for WebSocket messages sent to clients.
 * They wrap the parsed C123 data with envelope metadata (type, timestamp).
 */

import type {
  OnCourseMessage,
  ResultsMessage,
  TimeOfDayMessage,
  RaceConfigMessage,
  ScheduleMessage,
} from './parser-types.js';

// Re-export parser types for convenience
export type {
  OnCourseCompetitor,
  OnCourseMessage,
  ResultRow,
  ResultsMessage,
  TimeOfDayMessage,
  RaceConfigMessage,
  ScheduleRace,
  ScheduleMessage,
  ParsedMessage,
} from './parser-types.js';

/**
 * Base envelope for all C123 protocol messages
 */
interface C123MessageBase {
  /** ISO 8601 timestamp when message was received/created */
  timestamp: string;
}

/**
 * TimeOfDay message - heartbeat with current time
 */
export interface C123TimeOfDay extends C123MessageBase {
  type: 'TimeOfDay';
  data: TimeOfDayMessage;
}

/**
 * OnCourse message - competitors currently on course
 */
export interface C123OnCourse extends C123MessageBase {
  type: 'OnCourse';
  data: OnCourseMessage;
}

/**
 * Results message - result table for a race
 */
export interface C123Results extends C123MessageBase {
  type: 'Results';
  data: ResultsMessage;
}

/**
 * RaceConfig message - gate configuration
 */
export interface C123RaceConfig extends C123MessageBase {
  type: 'RaceConfig';
  data: RaceConfigMessage;
}

/**
 * Schedule message - list of races
 */
export interface C123Schedule extends C123MessageBase {
  type: 'Schedule';
  data: ScheduleMessage;
}

/**
 * Connection status message (server-generated)
 */
export interface C123Connected extends C123MessageBase {
  type: 'Connected';
  data: {
    /** Server version */
    version: string;
    /** Whether C123 source is connected */
    c123Connected: boolean;
    /** Whether XML file is loaded */
    xmlLoaded: boolean;
  };
}

/**
 * Error message (server-generated)
 */
export interface C123Error extends C123MessageBase {
  type: 'Error';
  data: {
    /** Error code */
    code: string;
    /** Human-readable error message */
    message: string;
  };
}

/**
 * XML section that can change
 */
export type XmlSection = 'Participants' | 'Schedule' | 'Results' | 'Classes';

/**
 * XML change notification (server-generated)
 * Sent when XML file changes, clients should fetch updated data via REST API
 */
export interface C123XmlChange extends C123MessageBase {
  type: 'XmlChange';
  data: {
    /** Which sections of the XML changed */
    sections: XmlSection[];
    /** New checksum of the XML file */
    checksum: string;
  };
}

/**
 * Force refresh command (server-generated)
 * Sent by admin to force all clients to reload/refresh their data
 */
export interface C123ForceRefresh extends C123MessageBase {
  type: 'ForceRefresh';
  data: {
    /** Optional reason for the refresh */
    reason?: string;
  };
}

/**
 * Union of all C123 protocol messages
 */
export type C123Message =
  | C123TimeOfDay
  | C123OnCourse
  | C123Results
  | C123RaceConfig
  | C123Schedule
  | C123Connected
  | C123Error
  | C123XmlChange
  | C123ForceRefresh;

/**
 * Type guard for C123TimeOfDay
 */
export function isTimeOfDay(msg: C123Message): msg is C123TimeOfDay {
  return msg.type === 'TimeOfDay';
}

/**
 * Type guard for C123OnCourse
 */
export function isOnCourse(msg: C123Message): msg is C123OnCourse {
  return msg.type === 'OnCourse';
}

/**
 * Type guard for C123Results
 */
export function isResults(msg: C123Message): msg is C123Results {
  return msg.type === 'Results';
}

/**
 * Type guard for C123RaceConfig
 */
export function isRaceConfig(msg: C123Message): msg is C123RaceConfig {
  return msg.type === 'RaceConfig';
}

/**
 * Type guard for C123Schedule
 */
export function isSchedule(msg: C123Message): msg is C123Schedule {
  return msg.type === 'Schedule';
}

/**
 * Type guard for C123Connected
 */
export function isConnected(msg: C123Message): msg is C123Connected {
  return msg.type === 'Connected';
}

/**
 * Type guard for C123Error
 */
export function isError(msg: C123Message): msg is C123Error {
  return msg.type === 'Error';
}

/**
 * Type guard for C123XmlChange
 */
export function isXmlChange(msg: C123Message): msg is C123XmlChange {
  return msg.type === 'XmlChange';
}

/**
 * Type guard for C123ForceRefresh
 */
export function isForceRefresh(msg: C123Message): msg is C123ForceRefresh {
  return msg.type === 'ForceRefresh';
}
