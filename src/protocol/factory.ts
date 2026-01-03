/**
 * Factory functions for creating C123 protocol messages
 */

import type {
  OnCourseMessage,
  ResultsMessage,
  TimeOfDayMessage,
  RaceConfigMessage,
  ScheduleMessage,
} from './parser-types.js';

import type {
  C123TimeOfDay,
  C123OnCourse,
  C123Results,
  C123RaceConfig,
  C123Schedule,
  C123Connected,
  C123Error,
} from './types.js';

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Create a TimeOfDay message
 */
export function createTimeOfDay(data: TimeOfDayMessage): C123TimeOfDay {
  return {
    type: 'TimeOfDay',
    timestamp: now(),
    data,
  };
}

/**
 * Create an OnCourse message
 */
export function createOnCourse(data: OnCourseMessage): C123OnCourse {
  return {
    type: 'OnCourse',
    timestamp: now(),
    data,
  };
}

/**
 * Create a Results message
 */
export function createResults(data: ResultsMessage): C123Results {
  return {
    type: 'Results',
    timestamp: now(),
    data,
  };
}

/**
 * Create a RaceConfig message
 */
export function createRaceConfig(data: RaceConfigMessage): C123RaceConfig {
  return {
    type: 'RaceConfig',
    timestamp: now(),
    data,
  };
}

/**
 * Create a Schedule message
 */
export function createSchedule(data: ScheduleMessage): C123Schedule {
  return {
    type: 'Schedule',
    timestamp: now(),
    data,
  };
}

/**
 * Create a Connected message
 */
export function createConnected(
  version: string,
  c123Connected: boolean,
  xmlLoaded: boolean
): C123Connected {
  return {
    type: 'Connected',
    timestamp: now(),
    data: {
      version,
      c123Connected,
      xmlLoaded,
    },
  };
}

/**
 * Create an Error message
 */
export function createError(code: string, message: string): C123Error {
  return {
    type: 'Error',
    timestamp: now(),
    data: {
      code,
      message,
    },
  };
}
