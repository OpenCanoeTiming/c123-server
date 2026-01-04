/**
 * In-memory ring buffer for storing log entries.
 *
 * Used by the admin dashboard to display recent logs.
 * Entries are stored in a circular buffer with configurable maximum size.
 */

import type { LogLevel } from './logger.js';

/**
 * A single log entry
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Component/module name */
  component: string;
  /** Log message */
  message: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional additional data */
  data?: unknown;
}

/**
 * Options for filtering log entries
 */
export interface LogFilterOptions {
  /** Filter by log level (returns entries at or above this level) */
  minLevel?: LogLevel;
  /** Filter by specific levels */
  levels?: LogLevel[];
  /** Search text (case-insensitive, matches component or message) */
  search?: string;
  /** Maximum number of entries to return */
  limit?: number;
  /** Skip entries from the end (for pagination) */
  offset?: number;
}

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Ring buffer for log entries.
 *
 * When the buffer is full, oldest entries are overwritten.
 *
 * @example
 * ```ts
 * const buffer = new LogBuffer(100); // Keep last 100 entries
 * buffer.add('info', 'Server', 'Started on port 8080');
 *
 * // Get all entries
 * const entries = buffer.getEntries();
 *
 * // Get filtered entries
 * const errors = buffer.getEntries({ levels: ['error', 'warn'] });
 * ```
 */
export class LogBuffer {
  private readonly buffer: LogEntry[];
  private readonly maxSize: number;
  private writeIndex = 0;
  private count = 0;

  /**
   * Create a new log buffer
   * @param maxSize Maximum number of entries to keep (default: 500)
   */
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  /**
   * Add a log entry to the buffer
   */
  add(level: LogLevel, component: string, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
      level,
      component,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    this.buffer[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    if (this.count < this.maxSize) {
      this.count++;
    }

    return entry;
  }

  /**
   * Get log entries with optional filtering.
   * Entries are returned in chronological order (oldest first).
   */
  getEntries(options?: LogFilterOptions): LogEntry[] {
    const result: LogEntry[] = [];

    // Read entries in chronological order
    const startIndex = this.count < this.maxSize ? 0 : this.writeIndex;

    for (let i = 0; i < this.count; i++) {
      const index = (startIndex + i) % this.maxSize;
      const entry = this.buffer[index];

      if (!entry) continue;

      // Apply filters
      if (options?.minLevel) {
        if (levelOrder[entry.level] < levelOrder[options.minLevel]) {
          continue;
        }
      }

      if (options?.levels && options.levels.length > 0) {
        if (!options.levels.includes(entry.level)) {
          continue;
        }
      }

      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        const matchesComponent = entry.component.toLowerCase().includes(searchLower);
        const matchesMessage = entry.message.toLowerCase().includes(searchLower);
        if (!matchesComponent && !matchesMessage) {
          continue;
        }
      }

      result.push(entry);
    }

    // Apply offset and limit
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? result.length;

    return result.slice(offset, offset + limit);
  }

  /**
   * Get entries in reverse chronological order (newest first)
   */
  getEntriesReversed(options?: LogFilterOptions): LogEntry[] {
    return this.getEntries(options).reverse();
  }

  /**
   * Get the current number of entries in the buffer
   */
  getCount(): number {
    return this.count;
  }

  /**
   * Get the maximum size of the buffer
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Clear all entries from the buffer
   */
  clear(): void {
    this.buffer.fill(undefined as unknown as LogEntry);
    this.writeIndex = 0;
    this.count = 0;
  }
}

// Global log buffer instance
let globalLogBuffer: LogBuffer | null = null;

/**
 * Get or create the global log buffer instance
 */
export function getLogBuffer(maxSize?: number): LogBuffer {
  if (!globalLogBuffer) {
    globalLogBuffer = new LogBuffer(maxSize);
  }
  return globalLogBuffer;
}

/**
 * Reset the global log buffer (for testing)
 */
export function resetLogBuffer(): void {
  globalLogBuffer = null;
}
