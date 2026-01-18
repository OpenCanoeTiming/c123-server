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
 * Download file from URL to destination
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(dest);
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(err);
      });
  });
}

/**
 * Get recording path - downloads from GitHub if not available locally
 * Returns null if recording cannot be obtained (skip tests in that case)
 */
export async function getRecordingPath(): Promise<string | null> {
  // Check if already available
  const existingPath = findRecordingPath();
  if (existingPath) {
    return existingPath;
  }

  // Try to download from GitHub
  try {
    await downloadFile(GITHUB_RAW_URL, CACHE_PATH);
    return CACHE_PATH;
  } catch (error) {
    // Download failed (offline, rate limited, etc.)
    console.warn(`Could not download recording from GitHub: ${error}`);
    return null;
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
