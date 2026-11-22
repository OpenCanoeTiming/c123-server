/**
 * The on-site process's log file (#395): `onsite.log` in the data dir, one timestamped line per entry, rotated by size to a single
 * `onsite.log.1` (an older generation is overwritten). The timestamp comes from the injected clock. A write that fails is dropped: logging
 * must never take the process down.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

export const LOG_FILE_NAME = 'onsite.log';
/** Per generation; the two files together stay below twice this. */
export const DEFAULT_LOG_MAX_BYTES = 512 * 1024;

export interface LogFile {
  readonly path: string;
  /** Appends `<ISO instant> <text>`; a text with line breaks is one line. */
  write(text: string): void;
  /** The last `limit` lines, oldest first, reaching back into the rotated file. */
  tail(limit: number): string[];
}

export function createLogFile(o: { dir: string; clock: { now(): number }; maxBytes?: number }): LogFile {
  const file = path.join(o.dir, LOG_FILE_NAME);
  const rotated = `${file}.1`;
  const maxBytes = o.maxBytes ?? DEFAULT_LOG_MAX_BYTES;
  const sizeOf = (p: string): number => {
    try {
      return statSync(p).size;
    } catch {
      return 0;
    }
  };
  const linesOf = (p: string): string[] => {
    try {
      return readFileSync(p, 'utf8')
        .split('\n')
        .filter((l) => l !== '');
    } catch {
      return [];
    }
  };
  let size = 0;
  try {
    mkdirSync(o.dir, { recursive: true });
    size = sizeOf(file);
  } catch {
    /* the first write reports nothing either */
  }
  return {
    path: file,
    write(text) {
      try {
        const line = `${new Date(o.clock.now()).toISOString()} ${text.replace(/\r?\n/g, ' ')}\n`;
        const bytes = Buffer.byteLength(line);
        if (size > 0 && size + bytes > maxBytes) {
          renameSync(file, rotated);
          size = 0;
        }
        appendFileSync(file, line);
        size += bytes;
      } catch {
        /* nothing useful to do */
      }
    },
    tail(limit) {
      if (limit <= 0) return [];
      const current = linesOf(file);
      const lines = current.length >= limit ? current : [...linesOf(rotated), ...current];
      return lines.slice(-limit);
    },
  };
}
