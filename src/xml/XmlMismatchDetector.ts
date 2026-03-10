import { EventEmitter } from 'node:events';
import type { EventState } from '../state/EventState.js';
import type { XmlDataService } from '../service/XmlDataService.js';
import { Logger } from '../utils/logger.js';

/**
 * Mismatch state exposed via API and WebSocket
 */
export interface MismatchState {
  /** Whether a mismatch is currently detected */
  detected: boolean;
  /** When the mismatch was first detected */
  detectedAt?: string;
  /** Schedule fingerprint from TCP (C123 live data) */
  tcpFingerprint?: string;
  /** Schedule fingerprint from XML file */
  xmlFingerprint?: string;
  /** Race IDs present in TCP but missing from XML */
  unmatchedRaceIds?: string[];
  /** Human-readable description */
  message?: string;
}

/**
 * Events emitted by XmlMismatchDetector
 */
export interface XmlMismatchDetectorEvents {
  /** Mismatch confirmed (after grace period) */
  mismatch: [state: MismatchState];
  /** Mismatch resolved — fingerprints match again */
  resolved: [];
  /** Error during detection */
  error: [error: Error];
}

/**
 * Configuration for XmlMismatchDetector
 */
export interface XmlMismatchDetectorConfig {
  /** Grace period before confirming mismatch (default: 10000ms) */
  gracePeriodMs?: number;
  /** Recheck interval after confirmed mismatch (default: 5000ms) */
  recheckIntervalMs?: number;
}

/**
 * Detects when TCP data (from C123) and XML file refer to different events.
 *
 * Compares the schedule fingerprint from EventState (TCP) with a fingerprint
 * computed from XmlDataService (XML file). When they differ for longer than
 * the grace period, emits a 'mismatch' event. Auto-resolves when they match again.
 */
export class XmlMismatchDetector extends EventEmitter<XmlMismatchDetectorEvents> {
  private readonly eventState: EventState;
  private readonly xmlDataService: XmlDataService;
  private readonly gracePeriodMs: number;
  private readonly recheckIntervalMs: number;

  private graceTimer: NodeJS.Timeout | null = null;
  private recheckTimer: NodeJS.Timeout | null = null;
  private _mismatchState: MismatchState = { detected: false };
  private started = false;

  // Bound handlers for cleanup
  private readonly onScheduleChange: (fingerprint: string) => void;
  private readonly onRaceChange: (raceId: string) => void;

  constructor(
    eventState: EventState,
    xmlDataService: XmlDataService,
    config?: XmlMismatchDetectorConfig,
  ) {
    super();
    this.eventState = eventState;
    this.xmlDataService = xmlDataService;
    this.gracePeriodMs = config?.gracePeriodMs ?? 10000;
    this.recheckIntervalMs = config?.recheckIntervalMs ?? 5000;

    this.onScheduleChange = () => this.checkMismatch();
    this.onRaceChange = (raceId: string) => this.checkRaceId(raceId);
  }

  /**
   * Get current mismatch state
   */
  get mismatchState(): Readonly<MismatchState> {
    return this._mismatchState;
  }

  /**
   * Start listening for schedule changes
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.eventState.on('scheduleChange', this.onScheduleChange);
    this.eventState.on('raceChange', this.onRaceChange);

    Logger.info('XmlMismatchDetector', 'Started');
  }

  /**
   * Stop listening and clean up timers
   */
  stop(): void {
    if (!this.started) return;
    this.started = false;

    this.eventState.off('scheduleChange', this.onScheduleChange);
    this.eventState.off('raceChange', this.onRaceChange);

    this.clearTimers();
    Logger.info('XmlMismatchDetector', 'Stopped');
  }

  /**
   * Check if a race ID from TCP exists in XML schedule.
   * Triggers full mismatch check if race is unknown.
   */
  private async checkRaceId(raceId: string): Promise<void> {
    if (!this.xmlDataService.getPath()) return;

    try {
      const xmlSchedule = await this.xmlDataService.getSchedule();
      const xmlRaceIds = new Set(xmlSchedule.map((s) => s.raceId));

      if (!xmlRaceIds.has(raceId)) {
        Logger.warn('XmlMismatchDetector', `Race ${raceId} from TCP not found in XML`);
        await this.checkMismatch();
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Compare TCP schedule fingerprint with XML schedule fingerprint.
   * Starts grace period if mismatch detected, resolves if they match.
   */
  async checkMismatch(): Promise<void> {
    const tcpFingerprint = this.eventState.state.scheduleFingerprint;

    // No TCP schedule yet — nothing to compare
    if (!tcpFingerprint) return;

    // No XML path configured — nothing to compare
    if (!this.xmlDataService.getPath()) return;

    try {
      const xmlFingerprint = await this.computeXmlFingerprint();

      // No XML schedule — nothing to compare
      if (!xmlFingerprint) return;

      if (tcpFingerprint === xmlFingerprint) {
        this.handleMatch();
      } else {
        this.handlePotentialMismatch(tcpFingerprint, xmlFingerprint);
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Compute schedule fingerprint from XML data.
   * Mirrors EventState.createScheduleFingerprint() algorithm.
   */
  private async computeXmlFingerprint(): Promise<string> {
    const schedule = await this.xmlDataService.getSchedule();
    if (schedule.length === 0) return '';

    return schedule
      .slice()
      .sort((a, b) => (a.raceOrder ?? 0) - (b.raceOrder ?? 0))
      .map((s) => s.raceId)
      .join('|');
  }

  /**
   * Fingerprints match — resolve any active mismatch
   */
  private handleMatch(): void {
    this.clearTimers();

    if (this._mismatchState.detected) {
      Logger.info('XmlMismatchDetector', 'Mismatch resolved — fingerprints match');
      this._mismatchState = { detected: false };
      this.emit('resolved');
    }
  }

  /**
   * Fingerprints differ — start grace period or confirm mismatch
   */
  private handlePotentialMismatch(tcpFingerprint: string, xmlFingerprint: string): void {
    // Already confirmed — update state but don't re-emit
    if (this._mismatchState.detected) {
      this._mismatchState.tcpFingerprint = tcpFingerprint;
      this._mismatchState.xmlFingerprint = xmlFingerprint;
      this._mismatchState.unmatchedRaceIds = this.findUnmatchedRaceIds(tcpFingerprint, xmlFingerprint);
      return;
    }

    // Grace period already running
    if (this.graceTimer) return;

    Logger.info('XmlMismatchDetector', `Potential mismatch detected, waiting ${this.gracePeriodMs}ms grace period`);

    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      // Re-verify after grace period
      void this.confirmMismatch();
    }, this.gracePeriodMs);
  }

  /**
   * Re-check after grace period and confirm mismatch if still present
   */
  private async confirmMismatch(): Promise<void> {
    const tcpFingerprint = this.eventState.state.scheduleFingerprint;
    if (!tcpFingerprint) return;

    try {
      const xmlFingerprint = await this.computeXmlFingerprint();
      if (!xmlFingerprint) return;

      if (tcpFingerprint === xmlFingerprint) {
        this.handleMatch();
        return;
      }

      const unmatchedRaceIds = this.findUnmatchedRaceIds(tcpFingerprint, xmlFingerprint);

      this._mismatchState = {
        detected: true,
        detectedAt: new Date().toISOString(),
        tcpFingerprint,
        xmlFingerprint,
        unmatchedRaceIds,
        message: `XML file does not match C123 live data (${unmatchedRaceIds.length} unmatched races)`,
      };

      Logger.warn('XmlMismatchDetector', this._mismatchState.message!);
      this.emit('mismatch', this._mismatchState);

      // Start periodic recheck for auto-resolution
      this.startRecheck();
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Find race IDs present in TCP but missing from XML
   */
  private findUnmatchedRaceIds(tcpFingerprint: string, xmlFingerprint: string): string[] {
    const tcpIds = new Set(tcpFingerprint.split('|'));
    const xmlIds = new Set(xmlFingerprint.split('|'));
    return [...tcpIds].filter((id) => !xmlIds.has(id));
  }

  /**
   * Start periodic recheck to detect auto-resolution
   */
  private startRecheck(): void {
    if (this.recheckTimer) return;

    this.recheckTimer = setInterval(() => {
      void this.checkMismatch();
    }, this.recheckIntervalMs);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    if (this.recheckTimer) {
      clearInterval(this.recheckTimer);
      this.recheckTimer = null;
    }
  }
}
