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
  ScheduleValidation,
} from './types.js';
import { isSameEvent } from './fingerprint.js';

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

  /**
   * Fingerprint of the live schedule, pushed in by the server whenever the XML
   * Schedule section changes. Empty when the schedule is unknown — the store
   * never reads the XML itself.
   */
  private liveFingerprint = '';

  /**
   * Fingerprint that last looked like a different event, still awaiting a
   * second sighting before we act on it. See validateAgainstSchedule().
   */
  private pendingMismatch: string | null = null;

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
   * Load the checks file for an XML file.
   *
   * The fingerprint is neither supplied nor checked here. It is pinned on the
   * first write and validated once the schedule is known; see
   * setScheduleFingerprint().
   */
  loadForFile(xmlFilename: string): void {
    // Writes are debounced, so a pending change to the outgoing file would be
    // lost by switching without flushing it first.
    this.flush();

    const filePath = this.getFilePath(xmlFilename);
    this.currentFilePath = filePath;

    // A new XML file means the live schedule is unknown until it is parsed.
    // Carrying the previous file's fingerprint over would pin the wrong event,
    // and a pending mismatch left armed would let the very first sighting for
    // the new file archive without the confirmation the guarantee rests on.
    this.liveFingerprint = '';
    this.pendingMismatch = null;

    if (!fs.existsSync(filePath)) {
      Logger.info('ChecksStore', `No existing checks file for ${xmlFilename}, creating fresh data`);
      this.currentData = this.emptyData(xmlFilename);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = this.parseChecksFile(content, xmlFilename);
      this.currentData = data;
      Logger.info(
        'ChecksStore',
        `Loaded checks file for ${xmlFilename} (fingerprint: ${data.fingerprint || 'unpinned'})`
      );
    } catch (error) {
      Logger.error('ChecksStore', `Error loading checks file: ${error}`);

      // Move the unreadable file aside before falling back. Otherwise the next
      // flush overwrites it, destroying the only copy of whatever checks it
      // held — one bad race entry among fifty good ones would take the lot,
      // which is exactly the loss this whole mechanism exists to prevent.
      this.moveAside(filePath, 'unreadable');

      this.currentData = this.emptyData(xmlFilename);
    }
  }

  /**
   * Parse and structurally validate a checks file.
   *
   * A file with the right JSON syntax but the wrong shape — an older schema, a
   * hand-edited file, a truncated write — would otherwise be accepted whole and
   * make every later operation throw on a missing `races`, including the
   * new-event reset that is meant to be the way out. Anything unusable is
   * rejected here so the caller falls back to fresh data.
   */
  private parseChecksFile(content: string, xmlFilename: string): ChecksFileData {
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('checks file is not an object');
    }

    const data = parsed as Partial<ChecksFileData>;

    if (typeof data.races !== 'object' || data.races === null || Array.isArray(data.races)) {
      throw new Error('checks file has no usable "races" object');
    }

    for (const [raceId, race] of Object.entries(data.races)) {
      if (typeof race !== 'object' || race === null) {
        throw new Error(`race "${raceId}" is not an object`);
      }
      if (typeof race.checks !== 'object' || race.checks === null || Array.isArray(race.checks)) {
        throw new Error(`race "${raceId}" has no usable "checks" object`);
      }
      if (!Array.isArray(race.flags)) {
        throw new Error(`race "${raceId}" has no usable "flags" array`);
      }
      // Entries must at least be objects carrying an id — deleteFlag and
      // resolveFlag read `.id` off every element.
      for (const flag of race.flags) {
        if (typeof flag !== 'object' || flag === null || typeof flag.id !== 'string') {
          throw new Error(`race "${raceId}" has a flag without a usable id`);
        }
      }
    }

    return {
      // The path is authoritative; a copied file must not misreport which XML
      // it belongs to.
      xmlFilename,
      fingerprint: typeof data.fingerprint === 'string' && data.fingerprint !== ''
        ? data.fingerprint
        : null,
      lastModified:
        typeof data.lastModified === 'string' ? data.lastModified : new Date().toISOString(),
      races: data.races as ChecksFileData['races'],
    };
  }

  /**
   * Report the fingerprint of the current schedule.
   *
   * Called by the server whenever the XML Schedule section changes, which also
   * covers the first parse after startup and after an XML path switch. Passing
   * an empty string means the schedule is unknown; that never archives anything.
   */
  setScheduleFingerprint(fingerprint: string): ScheduleValidation {
    this.liveFingerprint = fingerprint;
    return this.validateAgainstSchedule();
  }

  /**
   * Archive the current checks file and start empty.
   *
   * The operator's escape hatch when the overlap heuristic decides wrongly —
   * most plausibly with a single-race schedule, where the ratio degenerates to
   * comparing one token. The fingerprint is unpinned and re-pins on the next
   * write.
   */
  resetForNewEvent(): boolean {
    if (!this.currentData) {
      Logger.warn('ChecksStore', 'resetForNewEvent: no checks file loaded');
      return false;
    }

    Logger.info('ChecksStore', 'Starting a new event: archiving current checks');
    this.archiveAndReset();

    // The operator has declared the current schedule stale. Keeping it as the
    // live fingerprint would let a check made before the new XML loads pin the
    // OLD event, which the next schedule change would then archive away.
    // Unpinned is safe — it never archives — and the next schedule change
    // supplies the real value.
    this.liveFingerprint = '';
    this.pendingMismatch = null;

    return true;
  }

  /**
   * Rename a checks file out of the way, keeping it recoverable.
   *
   * Returns the new path, or null if there was nothing to move.
   */
  private moveAside(filePath: string, label: 'archived' | 'unreadable'): string | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const target = this.freeSidecarPath(filePath, label);
    try {
      fs.renameSync(filePath, target);
      Logger.info('ChecksStore', `Moved ${label} checks file to ${path.basename(target)}`);
      return target;
    } catch (error) {
      Logger.error('ChecksStore', `Error moving ${label} checks file aside: ${error}`);
      return null;
    }
  }

  /**
   * Pick a sidecar filename that does not already exist.
   *
   * The timestamp has millisecond resolution and renameSync overwrites
   * silently, so two files set aside in the same millisecond would destroy the
   * first — which is the only copy of the discarded checks.
   */
  private freeSidecarPath(filePath: string, label: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = filePath.replace('.checks.json', `.checks.${label}-${timestamp}`);

    let candidate = `${base}.json`;
    let suffix = 1;
    while (fs.existsSync(candidate)) {
      candidate = `${base}-${suffix}.json`;
      suffix++;
    }

    return candidate;
  }

  private emptyData(xmlFilename: string): ChecksFileData {
    return {
      xmlFilename,
      fingerprint: null,
      lastModified: new Date().toISOString(),
      races: {},
    };
  }

  /**
   * Compare the pinned fingerprint against the live schedule and archive when
   * they describe different events.
   */
  private validateAgainstSchedule(): ScheduleValidation {
    if (!this.currentData) {
      return 'ok';
    }

    // An unknown or empty schedule tells us nothing. Treating it as an empty
    // intersection would let a transient XML read failure wipe the event. Any
    // pending suspicion is dropped rather than left armed with nothing to
    // resolve it — the next real schedule has to make the case again.
    if (!this.liveFingerprint) {
      this.pendingMismatch = null;
      return 'ok';
    }

    const stored = this.currentData.fingerprint;

    // Never pinned: no writes yet, so there is nothing to protect.
    if (!stored) {
      return 'ok';
    }

    if (isSameEvent(stored, this.liveFingerprint)) {
      this.pendingMismatch = null;

      // Same event with an edited schedule — track the latest so a long event
      // that drifts race by race keeps comparing against recent reality.
      if (stored !== this.liveFingerprint) {
        this.currentData.fingerprint = this.liveFingerprint;
        this.currentData.lastModified = new Date().toISOString();
        this.scheduleFlush();
        Logger.info('ChecksStore', 'Schedule changed within the same event, fingerprint refreshed');
      }
      return 'ok';
    }

    // Require the same mismatch twice before destroying anything. Canoe123
    // rewrites the multi-megabyte XML after every competitor, so a read can
    // catch the file mid-write and return a truncated but still well-formed
    // schedule. That transient looks exactly like a different event, and
    // archiving on it would discard the day's checks. A genuinely different
    // event keeps reporting the same schedule; a torn read does not.
    if (this.pendingMismatch !== this.liveFingerprint) {
      this.pendingMismatch = this.liveFingerprint;
      Logger.warn(
        'ChecksStore',
        `Schedule looks like a different event (stored: ${stored}, current: ${this.liveFingerprint}). Awaiting confirmation before archiving.`
      );
      return 'pending-confirmation';
    }

    Logger.warn(
      'ChecksStore',
      `Schedule confirmed as a different event (stored: ${stored}, current: ${this.liveFingerprint}). Archiving.`
    );
    this.pendingMismatch = null;
    this.archiveAndReset();
    return 'archived';
  }

  /**
   * Pin the fingerprint if it is not pinned yet. Called from every write.
   *
   * An empty live fingerprint never pins: storing one would be
   * indistinguishable from the unpinned state and would disable the check.
   */
  private pinFingerprintIfNeeded(): void {
    if (!this.currentData || this.currentData.fingerprint || !this.liveFingerprint) {
      return;
    }

    this.currentData.fingerprint = this.liveFingerprint;
    Logger.info('ChecksStore', `Pinned event fingerprint: ${this.liveFingerprint}`);
  }

  /**
   * Move the current file aside and start empty, keeping the same XML filename.
   */
  private archiveAndReset(): void {
    if (!this.currentData || !this.currentFilePath) {
      return;
    }

    // Nothing worth keeping: a file that was never written to needs no archive.
    const hasContent =
      Object.keys(this.currentData.races).length > 0 || this.currentData.fingerprint !== null;

    if (hasContent) {
      // Write debounced changes out before moving the file aside. Writes are
      // held for FLUSH_DEBOUNCE_MS, so a mismatch detected inside that window
      // would otherwise discard the checks with no archive to recover from.
      this.flush();

      this.moveAside(this.currentFilePath, 'archived');
    }

    this.currentData = this.emptyData(this.currentData.xmlFilename);

    const event: CheckChangedEvent = { event: 'checks-reset', raceId: '' };
    this.emit('checkChanged', event);

    this.flush();
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

    this.pinFingerprintIfNeeded();

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

    this.pinFingerprintIfNeeded();

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
