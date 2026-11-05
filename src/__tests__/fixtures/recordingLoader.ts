/**
 * Recording Loader for E2E Tests
 *
 * Loads test recordings from:
 * 1. Local c123-protocol-docs (if available)
 * 2. GitHub raw URL (downloaded and cached)
 *
 * This removes the hard dependency on having c123-protocol-docs
 * checked out locally next to c123-server.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import https from 'node:https';
import { randomBytes } from 'node:crypto';

const RECORDING_FILENAME = 'rec-2025-12-28T09-34-10.jsonl';

// Local paths to check (relative to project root)
const LOCAL_PATHS = [
  // c123-protocol-docs checked out next to c123-server
  path.resolve(import.meta.dirname, '../../../../c123-protocol-docs/recordings', RECORDING_FILENAME),
  // Legacy analysis folder path
  path.resolve(import.meta.dirname, '../../../../analysis/recordings', RECORDING_FILENAME),
];

// GitHub raw URL
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/OpenCanoeTiming/c123-protocol-docs/main/recordings/${RECORDING_FILENAME}`;

// Cache directory (inside project, gitignored)
const CACHE_DIR = path.resolve(import.meta.dirname, '../../../.cache');
const CACHE_PATH = path.join(CACHE_DIR, RECORDING_FILENAME);

export interface RecordingEntry {
  ts: number;
  src: string;
  type: string;
  data: unknown;
  _meta?: unknown;
}

/**
 * Find the recording file path - checks local paths first, then cache
 */
function findRecordingPath(): string | null {
  // Check local paths
  for (const localPath of LOCAL_PATHS) {
    if (fs.existsSync(localPath)) {
      return localPath;
    }
  }

  // Check cache
  if (fs.existsSync(CACHE_PATH)) {
    return CACHE_PATH;
  }

  return null;
}

/**
 * Download file from URL to destination.
 *
 * Several test files (each in its own worker) call getRecordingPath() on a
 * cold cache at the same time. They must not share a write target: each
 * download goes to its own temp file and is renamed over `dest` only when
 * complete, so no worker unlinks or reads another worker's partial file.
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  // Ensure cache directory exists
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const tmp = `${dest}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    await downloadToFile(url, tmp);
    fs.renameSync(tmp, dest);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function downloadToFile(url: string, tmp: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmp);
    const fail = (err: Error) => {
      file.close(() => reject(err));
    };

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          response.resume();
          if (redirectUrl && redirects < 5) {
            file.close(() => {
              downloadToFile(redirectUrl, tmp, redirects + 1).then(resolve, reject);
            });
            return;
          }
        }

        if (response.statusCode !== 200) {
          response.resume();
          fail(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          // Resolve only once the handle is closed. Resolving on 'finish'
          // alone lets the caller open the file mid-close and read it short,
          // which surfaces as a recording with zero entries.
          file.close(() => resolve());
        });
      })
      .on('error', (err) => fail(err));
  });
}

/**
 * Get recording path - downloads from GitHub if not available locally
 * Returns null if recording cannot be obtained (skip tests in that case)
 */
export async function getRecordingPath(): Promise<string | null> {
  // Check if already available
  const existingPath = findRecordingPath();
  if (existingPath && isUsable(existingPath)) {
    return existingPath;
  }

  // Try to download from GitHub
  try {
    await downloadFile(GITHUB_RAW_URL, CACHE_PATH);
    return isUsable(CACHE_PATH) ? CACHE_PATH : null;
  } catch (error) {
    // Download failed (offline, rate limited, etc.)
    console.warn(`Could not download recording from GitHub: ${error}`);
    return null;
  }
}

/**
 * An empty file is not a recording.
 *
 * Returning its path anyway makes the suite fail on empty assertions rather
 * than skip, which is what this module promises when a recording cannot be
 * obtained.
 */
function isUsable(recordingPath: string): boolean {
  try {
    return fs.statSync(recordingPath).size > 0;
  } catch {
    return false;
  }
}

/**
 * Load recording entries from file
 */
export async function loadRecording(recordingPath: string): Promise<RecordingEntry[]> {
  const entries: RecordingEntry[] = [];

  const fileStream = fs.createReadStream(recordingPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line) as RecordingEntry;
      entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/**
 * Extract TCP messages from recording entries
 */
export function extractTcpMessages(entries: RecordingEntry[]): string[] {
  return entries
    .filter((e) => e.src === 'tcp' && typeof e.data === 'string')
    .map((e) => e.data as string);
}
