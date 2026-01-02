/**
 * Simple logger utility for C123 Server.
 *
 * Provides structured logging with component prefixes and log levels.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

function formatTime(): string {
  return new Date().toISOString().slice(11, 23);
}

/**
 * Logger with component prefixes
 */
export const Logger = {
  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return currentLevel;
  },

  /**
   * Log debug message (verbose, for development)
   */
  debug(component: string, message: string, data?: unknown): void {
    if (shouldLog('debug')) {
      if (data !== undefined) {
        console.debug(`${formatTime()} [${component}] ${message}`, data);
      } else {
        console.debug(`${formatTime()} [${component}] ${message}`);
      }
    }
  },

  /**
   * Log info message (normal operation)
   */
  info(component: string, message: string, data?: unknown): void {
    if (shouldLog('info')) {
      if (data !== undefined) {
        console.log(`${formatTime()} [${component}] ${message}`, data);
      } else {
        console.log(`${formatTime()} [${component}] ${message}`);
      }
    }
  },

  /**
   * Log warning message (potential issue)
   */
  warn(component: string, message: string, data?: unknown): void {
    if (shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(`${formatTime()} [${component}] ${message}`, data);
      } else {
        console.warn(`${formatTime()} [${component}] ${message}`);
      }
    }
  },

  /**
   * Log error message (failure)
   */
  error(component: string, message: string, error?: unknown): void {
    if (shouldLog('error')) {
      if (error !== undefined) {
        console.error(`${formatTime()} [${component}] ${message}`, error);
      } else {
        console.error(`${formatTime()} [${component}] ${message}`);
      }
    }
  },
};
