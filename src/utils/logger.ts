/**
 * Simple logger utility for C123 Server.
 *
 * Provides structured logging with component prefixes, log levels,
 * and optional color output for terminal readability.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';
let useColors = process.stdout.isTTY ?? false;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

function formatTime(): string {
  return new Date().toISOString().slice(11, 23);
}

function colorize(text: string, color: keyof typeof colors): string {
  if (!useColors) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

function formatLevel(level: LogLevel): string {
  const labels: Record<LogLevel, string> = {
    debug: 'DBG',
    info: 'INF',
    warn: 'WRN',
    error: 'ERR',
  };
  const levelColors: Record<LogLevel, keyof typeof colors> = {
    debug: 'dim',
    info: 'green',
    warn: 'yellow',
    error: 'red',
  };
  return colorize(labels[level], levelColors[level]);
}

function formatComponent(component: string): string {
  return colorize(`[${component}]`, 'cyan');
}

function formatMessage(level: LogLevel, component: string, message: string): string {
  const time = colorize(formatTime(), 'dim');
  const lvl = formatLevel(level);
  const comp = formatComponent(component);
  return `${time} ${lvl} ${comp} ${message}`;
}

/**
 * Logger with component prefixes and color support
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
   * Enable or disable color output
   */
  setColors(enabled: boolean): void {
    useColors = enabled;
  },

  /**
   * Log debug message (verbose, for development)
   */
  debug(component: string, message: string, data?: unknown): void {
    if (shouldLog('debug')) {
      const formatted = formatMessage('debug', component, message);
      if (data !== undefined) {
        console.debug(formatted, data);
      } else {
        console.debug(formatted);
      }
    }
  },

  /**
   * Log info message (normal operation)
   */
  info(component: string, message: string, data?: unknown): void {
    if (shouldLog('info')) {
      const formatted = formatMessage('info', component, message);
      if (data !== undefined) {
        console.log(formatted, data);
      } else {
        console.log(formatted);
      }
    }
  },

  /**
   * Log warning message (potential issue)
   */
  warn(component: string, message: string, data?: unknown): void {
    if (shouldLog('warn')) {
      const formatted = formatMessage('warn', component, message);
      if (data !== undefined) {
        console.warn(formatted, data);
      } else {
        console.warn(formatted);
      }
    }
  },

  /**
   * Log error message (failure)
   */
  error(component: string, message: string, error?: unknown): void {
    if (shouldLog('error')) {
      const formatted = formatMessage('error', component, message);
      if (error !== undefined) {
        console.error(formatted, error);
      } else {
        console.error(formatted);
      }
    }
  },
};
