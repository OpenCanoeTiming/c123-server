import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { Logger } from '../utils/logger.js';
import type {
  ChecksFileData,
  RaceChecksData,
  CheckEntry,
  FlagEntry,
  ChecksStoreEvents,
  CheckChangedEvent,
  FlagChangedEvent,
} from './types.js';

/**
 * ChecksStore manages persistent penalty check and flag data.
 *
 * Data is stored in platform-specific directories:
 * - Windows: %APPDATA%\c123-server\checks\
 * - Linux/macOS: ~/.c123-server/checks/
 *
 * File naming: {xmlFilename}.checks.json
 */
export class ChecksStore extends EventEmitter<ChecksStoreEvents> {
  private checksDir: string;
  private currentData: ChecksFileData | null = null;
  private currentFilePath: string | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_DEBOUNCE_MS = 2000;

  constructor() {
    super();
    this.checksDir = this.getChecksDirectory();
    this.ensureDirectoryExists();
  }

  /**
   * Get platform-specific checks directory path
   */
  private getChecksDirectory(): string {
    const platform = os.platform();
    let baseDir: string;

    if (platform === 'win32') {
      // Windows: %APPDATA%\c123-server\checks\
      const appData = process.env.APPDATA;
      if (!appData) {
        throw new Error('APPDATA environment variable not found on Windows');
      }
      baseDir = path.join(appData, 'c123-server', 'checks');
    } else {
      // Linux/macOS: ~/.c123-server/checks/
      const homeDir = os.homedir();
      if (!homeDir) {
        throw new Error('Home directory not found');
      }
      baseDir = path.join(homeDir, '.c123-server', 'checks');
    }

    return baseDir;
  }

  /**
   * Ensure checks directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.checksDir)) {
      fs.mkdirSync(this.checksDir, { recursive: true });
      Logger.info('ChecksStore', `Created checks directory: ${this.checksDir}`);
    }
  }

  /**
   * Get file path for a given XML filename
   */
  private getFilePath(xmlFilename: string): string {
    return path.join(this.checksDir, `${xmlFilename}.checks.json`);
  }

  /**
   * Load checks file for a given XML file.
   * If fingerprint doesn't match, archive old file and create fresh data.
   */
  loadForFile(xmlFilename: string, fingerprint: string): void {
    const filePath = this.getFilePath(xmlFilename);
    this.currentFilePath = filePath;

    if (!fs.existsSync(filePath)) {
      Logger.info('ChecksStore', `No existing checks file for ${xmlFilename}, creating fresh data`);
      this.currentData = {
        xmlFilename,
        fingerprint,
        lastModified: new Date().toISOString(),
        races: {},
      };
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: ChecksFileData = JSON.parse(content);

      // Check fingerprint match
      if (data.fingerprint !== fingerprint) {
        Logger.warn(
          'ChecksStore',
          `Fingerprint mismatch for ${xmlFilename}. Archiving old checks file.`
        );

        // Archive old file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = filePath.replace('.checks.json', `.checks.archived-${timestamp}.json`);
        fs.renameSync(filePath, archivePath);
        Logger.info('ChecksStore', `Archived to ${path.basename(archivePath)}`);

        // Create fresh data
        this.currentData = {
          xmlFilename,
          fingerprint,
          lastModified: new Date().toISOString(),
          races: {},
        };
      } else {
        Logger.info('ChecksStore', `Loaded checks file for ${xmlFilename}`);
        this.currentData = data;
      }
    } catch (error) {
      Logger.error('ChecksStore', `Error loading checks file: ${error}`);
      // Create fresh data on error
      this.currentData = {
        xmlFilename,
        fingerprint,
        lastModified: new Date().toISOString(),
        races: {},
      };
    }
  }

  /**
   * Get checks data for a specific race
   */
  getChecks(raceId: string): RaceChecksData {
    if (!this.currentData) {
      Logger.debug('ChecksStore', 'getChecks: no data loaded');
      return { checks: {}, flags: [] };
    }

    return this.currentData.races[raceId] || { checks: {}, flags: [] };
  }

  /**
   * Get all checks data
   */
  getAllChecks(): ChecksFileData | null {
    return this.currentData;
  }

  /**
   * Set or update a check entry
   */
  setCheck(raceId: string, bib: string, gate: number, value: number | null, tag?: string): CheckEntry {
    if (!this.currentData) {
      throw new Error('No checks file loaded. Call loadForFile() first.');
    }

    // Ensure race exists
    if (!this.currentData.races[raceId]) {
      this.currentData.races[raceId] = { checks: {}, flags: [] };
    }

    const key = `${bib}:${gate}`;
    const check: CheckEntry = {
      checkedAt: new Date().toISOString(),
      value,
      ...(tag !== undefined && { tag }),
    };

    this.currentData.races[raceId].checks[key] = check;
    this.currentData.lastModified = new Date().toISOString();

    const event: CheckChangedEvent = {
      event: 'check-set',
      raceId,
      bib,
      gate,
      check,
    };

    this.emit('checkChanged', event);
    this.scheduleFlush();

    Logger.debug('ChecksStore', `Set check: ${raceId} ${bib}:${gate} = ${value}`);
    return check;
  }

  /**
   * Remove a check entry
   */
  removeCheck(raceId: string, bib: string, gate: number): boolean {
    if (!this.currentData || !this.currentData.races[raceId]) {
      Logger.debug('ChecksStore', `removeCheck: no data for race ${raceId}`);
      return false;
    }

    const key = `${bib}:${gate}`;
    const checks = this.currentData.races[raceId].checks;

    if (!(key in checks)) {
      Logger.debug('ChecksStore', `removeCheck: ${raceId} ${bib}:${gate} not found`);
      return false;
    }

    delete checks[key];
    this.currentData.lastModified = new Date().toISOString();

    const event: CheckChangedEvent = {
      event: 'check-removed',
      raceId,
      bib,
      gate,
    };

    this.emit('checkChanged', event);
    this.scheduleFlush();

    Logger.debug('ChecksStore', `Removed check: ${raceId} ${bib}:${gate}`);
    return true;
  }

  /**
   * Clear all checks and flags for a race
   */
  clearRace(raceId: string): void {
    if (!this.currentData || !this.currentData.races[raceId]) {
      Logger.debug('ChecksStore', `clearRace: race ${raceId} not found or no data`);
      return;
    }

    delete this.currentData.races[raceId];
    this.currentData.lastModified = new Date().toISOString();

    const event: CheckChangedEvent = {
      event: 'checks-cleared',
      raceId,
    };

    this.emit('checkChanged', event);
    this.scheduleFlush();

    Logger.info('ChecksStore', `Cleared all checks and flags for race: ${raceId}`);
  }

  /**
   * Create a new flag
   */
  createFlag(
    raceId: string,
    bib: string,
    gate: number,
    comment: string,
    suggestedValue?: number | null
  ): FlagEntry {
    if (!this.currentData) {
      throw new Error('No checks file loaded. Call loadForFile() first.');
    }

    // Ensure race exists
    if (!this.currentData.races[raceId]) {
      this.currentData.races[raceId] = { checks: {}, flags: [] };
    }

    const flag: FlagEntry = {
      id: crypto.randomUUID(),
      bib,
      gate,
      createdAt: new Date().toISOString(),
      comment,
      ...(suggestedValue !== undefined && { suggestedValue }),
      resolved: false,
    };

    this.currentData.races[raceId].flags.push(flag);
    this.currentData.lastModified = new Date().toISOString();

    const event: FlagChangedEvent = {
      event: 'flag-created',
      raceId,
      flag,
      bib,
      gate,
    };

    this.emit('flagChanged', event);
    this.scheduleFlush();

    Logger.info('ChecksStore', `Created flag: ${flag.id} for ${raceId} ${bib}:${gate}`);
    return flag;
  }

  /**
   * Resolve a flag and optionally create an auto-check
   */
  resolveFlag(
    raceId: string,
    flagId: string,
    resolution?: string,
    currentValue?: number | null
  ): { flag: FlagEntry; check?: CheckEntry } {
    if (!this.currentData || !this.currentData.races[raceId]) {
      throw new Error(`Race ${raceId} not found`);
    }

    const flags = this.currentData.races[raceId].flags;
    const flag = flags.find((f) => f.id === flagId);

    if (!flag) {
      throw new Error(`Flag ${flagId} not found in race ${raceId}`);
    }

    if (flag.resolved) {
      throw new Error(`Flag ${flagId} is already resolved`);
    }

    // Resolve the flag
    flag.resolved = true;
    flag.resolvedAt = new Date().toISOString();
    if (resolution !== undefined) {
      flag.resolution = resolution;
    }

    this.currentData.lastModified = new Date().toISOString();

    // Auto-create check if we have bib/gate info
    let check: CheckEntry | undefined;
    if (flag.bib && flag.gate !== undefined) {
      const value = currentValue !== undefined ? currentValue : flag.suggestedValue ?? null;
      check = this.setCheck(raceId, flag.bib, flag.gate, value, `Auto-check from flag ${flagId}`);
    }

    const event: FlagChangedEvent = {
      event: 'flag-resolved',
      raceId,
      flag,
      bib: flag.bib,
      gate: flag.gate,
      ...(check !== undefined && { check }),
    };

    this.emit('flagChanged', event);
    this.scheduleFlush();

    Logger.info('ChecksStore', `Resolved flag: ${flagId} in race ${raceId}`);

    const result: { flag: FlagEntry; check?: CheckEntry } = { flag };
    if (check !== undefined) {
      result.check = check;
    }
    return result;
  }

  /**
   * Delete a flag
   */
  deleteFlag(raceId: string, flagId: string): FlagEntry | null {
    if (!this.currentData || !this.currentData.races[raceId]) {
      Logger.debug('ChecksStore', `deleteFlag: no data for race ${raceId}`);
      return null;
    }

    const flags = this.currentData.races[raceId].flags;
    const index = flags.findIndex((f) => f.id === flagId);

    if (index === -1) {
      Logger.debug('ChecksStore', `deleteFlag: flag ${flagId} not found in race ${raceId}`);
      return null;
    }

    const [flag] = flags.splice(index, 1);
    this.currentData.lastModified = new Date().toISOString();

    const event: FlagChangedEvent = {
      event: 'flag-deleted',
      raceId,
      flag,
      bib: flag.bib,
      gate: flag.gate,
    };

    this.emit('flagChanged', event);
    this.scheduleFlush();

    Logger.info('ChecksStore', `Deleted flag: ${flagId} from race ${raceId}`);
    return flag;
  }

  /**
   * Invalidate a check (called after scoring write)
   */
  invalidateCheck(raceId: string, bib: string, gate: number): boolean {
    if (!this.currentData || !this.currentData.races[raceId]) {
      Logger.debug('ChecksStore', `invalidateCheck: no data for race ${raceId}`);
      return false;
    }

    const key = `${bib}:${gate}`;
    const checks = this.currentData.races[raceId].checks;

    if (!(key in checks)) {
      return false;
    }

    delete checks[key];
    this.currentData.lastModified = new Date().toISOString();

    const event: CheckChangedEvent = {
      event: 'check-invalidated',
      raceId,
      bib,
      gate,
    };

    this.emit('checkChanged', event);
    this.scheduleFlush();

    Logger.debug('ChecksStore', `Invalidated check: ${raceId} ${bib}:${gate}`);
    return true;
  }

  /**
   * Schedule a debounced flush to disk
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.FLUSH_DEBOUNCE_MS);
  }

  /**
   * Immediately write data to disk (atomic write)
   */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (!this.currentData || !this.currentFilePath) {
      return;
    }

    try {
      const json = JSON.stringify(this.currentData, null, 2);
      const tmpPath = `${this.currentFilePath}.tmp`;

      // Atomic write: write to temp file then rename
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, this.currentFilePath);

      Logger.debug('ChecksStore', `Flushed checks to disk: ${path.basename(this.currentFilePath)}`);
    } catch (error) {
      Logger.error('ChecksStore', `Error flushing checks to disk: ${error}`);
    }
  }

  /**
   * Cleanup: flush and clear timers
   */
  destroy(): void {
    this.flush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    Logger.info('ChecksStore', 'Destroyed ChecksStore');
  }
}
