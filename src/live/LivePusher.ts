/**
 * Live-Mini Pusher
 *
 * Main orchestrator for pushing timing data to c123-live-server.
 * Subscribes to XML changes and EventState changes, buffers data,
 * and pushes to remote server with circuit breaker protection.
 */

import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { XmlDataService } from '../service/XmlDataService.js';
import type { EventState } from '../state/EventState.js';
import type { XmlChangeNotifier } from '../xml/XmlChangeNotifier.js';
import type { EventStateData } from '../state/types.js';
import type { XmlSection, ScheduleRace } from '../protocol/types.js';
import { LiveClient, LiveApiError } from './LiveClient.js';
import { LiveTransformer } from './LiveTransformer.js';
import { deriveEventStatus, isForwardTransition, STATUS_ORDER } from './deriveEventStatus.js';
import type {
  LiveStatus,
  ChannelStatus,
  EventStatus,
} from './types.js';
import { Logger } from '../utils/logger.js';

/**
 * Pusher events
 */
export interface LivePusherEvents {
  /** Status changed */
  statusChange: [status: LiveStatus];
  /** Error occurred */
  error: [error: Error];
}

/**
 * Configuration for starting pusher
 */
export interface LivePusherConfig {
  serverUrl: string;
  apiKey: string;
  eventId: string;
  eventStatus: EventStatus;
  pushXml: boolean;
  pushOnCourse: boolean;
  pushResults: boolean;
  autoStatus: boolean;
}

/**
 * Constants
 */
const XML_DEBOUNCE_MS = 2000; // 2s debounce for XML changes
const ONCOURSE_THROTTLE_MS = 100; // 10/s max for OnCourse — payload is tiny, match source cadence (#150)
const RESULTS_DEBOUNCE_MS = 1000; // 1s debounce per raceId for Results
// #157: "Pulse" circuit breaker — fast open, fast close. Calibrated for
// high-frequency live sports data where a 30s lockout after a brief Railway
// edge-proxy blip costs an entire heat's worth of spectator data. With 3s
// timeout the CB probes for recovery almost immediately after a transient
// infra hiccup, and the first successful push closes it.
const CIRCUIT_BREAKER_THRESHOLD = 3; // Consecutive failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT_MS = 3000; // Pulse CB — 3s probe interval

/**
 * Live-Mini Pusher
 *
 * Orchestrates pushing timing data to c123-live-server.
 */
export class LivePusher extends EventEmitter<LivePusherEvents> {
  private client: LiveClient | null = null;
  private transformer: LiveTransformer;

  private xmlDataService: XmlDataService;
  private xmlChangeNotifier: XmlChangeNotifier | null = null;
  private eventState: EventState | null = null;

  private status: LiveStatus;

  // Circuit breaker
  private consecutiveFailures = 0;
  private circuitBreakerOpenAt: Date | null = null;

  // Buffers
  private onCourseLastPush: Date | null = null;
  private pendingOnCourse: EventStateData['onCourse'] | null = null;
  private lastPushedOnCourseFingerprint: string | null = null;
  private resultsDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  // Two-level dedup for results push:
  // - lastScheduledResultsRef: set when debounce timer is created, prevents oncourse/timeOfDay
  //   changes from resetting the debounce timer (they don't change state.results reference)
  // - lastPushedResultsRef: set after successful push, prevents re-pushing same data
  private lastScheduledResultsRef: object | null = null;
  private lastPushedResultsRef: object | null = null;

  // In-flight guards (#157): prevent stacking pushes on the Node fetch pool
  // for OnCourse and XML, where the next push fully replaces the previous
  // data (safe to drop when a push is in flight — next snapshot will carry
  // everything).
  private onCoursePushInFlight = false;
  private xmlPushInFlight = false;
  // Results needs a smarter guard. Dropping a push could lose the final
  // results batch of a race if no further state change follows. So we
  // queue at most one latest-wins pending push: while a push is running,
  // a new one just overwrites the pending slot, and when the in-flight
  // push finishes we fire the pending one. This keeps concurrency at 1
  // per channel even during a Railway outage (preventing socket stacking)
  // without ever losing the final data.
  private resultsPushInFlight = false;
  private resultsPushPending: NonNullable<EventStateData['results']> | null = null;

  // Timers
  private xmlDebounceTimer: NodeJS.Timeout | null = null;
  private onCourseThrottleTimer: NodeJS.Timeout | null = null;

  // Event listeners (stored for cleanup)
  private xmlChangeListener: ((sections: XmlSection[]) => void) | null = null;
  private eventStateListener: ((state: EventStateData) => void) | null = null;

  // Auto-status
  private autoStatusEnabled = false;
  private previousRaceStatuses: Map<string, number> = new Map();
  private isTransitioning = false;

  constructor(xmlDataService: XmlDataService) {
    super();
    this.xmlDataService = xmlDataService;
    this.transformer = new LiveTransformer(xmlDataService);

    // Initialize status
    this.status = this.createInitialStatus();
  }

  /**
   * Connect to live server and start pushing
   */
  async connect(
    config: LivePusherConfig,
    xmlChangeNotifier: XmlChangeNotifier,
    eventState: EventState,
  ): Promise<void> {
    // Disconnect if already connected
    if (this.client) {
      await this.disconnect();
    }

    // Create client
    this.client = new LiveClient({
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
    });

    // Update status
    this.status.state = 'connected';
    this.status.serverUrl = config.serverUrl;
    this.status.eventId = config.eventId;
    this.status.eventStatus = config.eventStatus;
    this.status.connectedAt = new Date().toISOString();

    // Update channel enabled flags
    this.status.channels.xml.enabled = config.pushXml;
    this.status.channels.oncourse.enabled = config.pushOnCourse;
    this.status.channels.results.enabled = config.pushResults;

    // Auto-status
    this.autoStatusEnabled = config.autoStatus;
    this.status.autoStatus = config.autoStatus;
    this.previousRaceStatuses.clear();

    // Store references
    this.xmlChangeNotifier = xmlChangeNotifier;
    this.eventState = eventState;

    // Refresh participant mapping from XML
    try {
      await this.transformer.refreshParticipantMapping();
      Logger.info('LivePusher', 'Participant mapping refreshed');
    } catch (error) {
      Logger.warn('LivePusher', 'Failed to refresh participant mapping', error);
    }

    // Initial push of current state (in case state arrived before connect)
    const currentState = eventState.state;
    if (config.pushResults && currentState.results) {
      this.scheduleResultsPush(currentState.results);
    }

    // Auto-status: init baseline BEFORE listeners to avoid false change detection
    if (this.autoStatusEnabled && currentState.schedule.length > 0) {
      this.initRaceStatuses(currentState.schedule);
      this.evaluateAutoStatus();
    }

    // Setup event listeners (after init so race status baseline is set)
    this.setupEventListeners();

    // Reset circuit breaker
    this.consecutiveFailures = 0;
    this.circuitBreakerOpenAt = null;
    this.status.circuitBreaker.isOpen = false;
    this.status.circuitBreaker.consecutiveFailures = 0;
    this.status.circuitBreaker.openedAt = null;

    Logger.info(
      'LivePusher',
      `Connected to ${config.serverUrl} (event: ${config.eventId})`,
    );
    this.emitStatusChange();
  }

  /**
   * Disconnect from live server
   */
  async disconnect(): Promise<void> {
    // Cleanup event listeners
    if (this.xmlChangeListener && this.xmlChangeNotifier) {
      this.xmlChangeNotifier.off('change', this.xmlChangeListener);
      this.xmlChangeListener = null;
    }

    if (this.eventStateListener && this.eventState) {
      this.eventState.off('change', this.eventStateListener);
      this.eventStateListener = null;
    }

    // Clear timers
    if (this.xmlDebounceTimer) {
      clearTimeout(this.xmlDebounceTimer);
      this.xmlDebounceTimer = null;
    }
    if (this.onCourseThrottleTimer) {
      clearTimeout(this.onCourseThrottleTimer);
      this.onCourseThrottleTimer = null;
    }
    for (const timer of this.resultsDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.resultsDebounceTimers.clear();
    this.lastScheduledResultsRef = null;
    this.lastPushedResultsRef = null;

    // Clear buffers
    this.onCourseLastPush = null;
    this.pendingOnCourse = null;
    this.lastPushedOnCourseFingerprint = null;
    this.onCoursePushInFlight = false;
    this.xmlPushInFlight = false;
    this.resultsPushInFlight = false;
    this.resultsPushPending = null;

    // Clear auto-status state
    this.previousRaceStatuses.clear();

    // Clear references
    this.client = null;
    this.xmlChangeNotifier = null;
    this.eventState = null;

    // Update status
    this.status.state = 'disconnected';
    this.status.connectedAt = null;

    Logger.info('LivePusher', 'Disconnected');
    this.emitStatusChange();
  }

  /**
   * Reset state back to not_configured.
   * Use after disconnect + clearConfig to allow UI to show setup form again.
   * Separate from disconnect() because disconnect() is also called internally in connect().
   */
  reset(): void {
    this.status = this.createInitialStatus();
    this.emitStatusChange();
  }

  /**
   * Pause pushing (keep connection, stop data flow)
   */
  pause(): void {
    if (this.status.state === 'connected') {
      this.status.state = 'paused';
      Logger.info('LivePusher', 'Paused');
      this.emitStatusChange();
    }
  }

  /**
   * Resume pushing
   */
  resume(): void {
    if (this.status.state === 'paused') {
      this.status.state = 'connected';
      Logger.info('LivePusher', 'Resumed');
      this.emitStatusChange();
    }
  }

  /**
   * Force immediate XML push (bypasses debounce)
   */
  async forcePushXml(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    Logger.info('LivePusher', 'Force pushing XML');
    await this.pushXml();
  }

  /**
   * Transition event status on live
   */
  async transitionStatus(status: EventStatus): Promise<void> {
    if (!this.client || !this.status.eventId) {
      throw new Error('Not connected');
    }

    Logger.info('LivePusher', `Transitioning event status to: ${status}`);

    try {
      const response = await this.client.transitionStatus(this.status.eventId, { status });
      this.status.eventStatus = response.status;
      Logger.info('LivePusher', `Event status transitioned to: ${response.status}`);
      this.emitStatusChange();
    } catch (error) {
      Logger.error('LivePusher', 'Failed to transition status', error);
      throw error;
    }
  }

  /**
   * Update which channels are enabled
   */
  updateChannels(channels: {
    pushXml?: boolean;
    pushOnCourse?: boolean;
    pushResults?: boolean;
  }): void {
    if (channels.pushXml !== undefined) {
      this.status.channels.xml.enabled = channels.pushXml;
    }
    if (channels.pushOnCourse !== undefined) {
      this.status.channels.oncourse.enabled = channels.pushOnCourse;
    }
    if (channels.pushResults !== undefined) {
      this.status.channels.results.enabled = channels.pushResults;
    }

    Logger.info(
      'LivePusher',
      `Channels updated: xml=${this.status.channels.xml.enabled} oncourse=${this.status.channels.oncourse.enabled} results=${this.status.channels.results.enabled}`,
    );
    this.emitStatusChange();
  }

  /**
   * Update auto-status toggle
   */
  updateAutoStatus(enabled: boolean): void {
    this.autoStatusEnabled = enabled;
    this.status.autoStatus = enabled;

    if (enabled && this.eventState) {
      // Re-evaluate immediately when toggled on
      this.initRaceStatuses(this.eventState.state.schedule);
      this.evaluateAutoStatus();
    }

    Logger.info('LivePusher', `Auto-status ${enabled ? 'enabled' : 'disabled'}`);
    this.emitStatusChange();
  }

  /**
   * Get current status
   */
  getStatus(): LiveStatus {
    return structuredClone(this.status);
  }

  // ==========================================================================
  // Private methods
  // ==========================================================================

  /**
   * Setup event listeners for XML and EventState changes
   */
  private setupEventListeners(): void {
    if (!this.xmlChangeNotifier || !this.eventState) {
      return;
    }

    // XML change listener (debounced)
    this.xmlChangeListener = (sections: XmlSection[]) => {
      this.handleXmlChange(sections);
    };
    this.xmlChangeNotifier.on('change', this.xmlChangeListener);

    // EventState change listener (for OnCourse and Results)
    this.eventStateListener = (state: EventStateData) => {
      this.handleEventStateChange(state);
    };
    this.eventState.on('change', this.eventStateListener);

    Logger.info('LivePusher', 'Event listeners setup');
  }

  /**
   * Handle XML change event
   * Debounces XML push by 2 seconds
   */
  private handleXmlChange(sections: XmlSection[]): void {
    // Skip if paused or not connected
    if (this.status.state !== 'connected') {
      return;
    }

    // Skip if XML push disabled
    if (!this.status.channels.xml.enabled) {
      return;
    }

    Logger.debug('LivePusher', `XML changed: ${sections.join(', ')}`);

    // Clear existing timer
    if (this.xmlDebounceTimer) {
      clearTimeout(this.xmlDebounceTimer);
    }

    // Debounce: push after 2s of no changes
    this.xmlDebounceTimer = setTimeout(() => {
      this.pushXml();
      this.xmlDebounceTimer = null;
    }, XML_DEBOUNCE_MS);
  }

  /**
   * Handle EventState change event
   * Throttles OnCourse (2/s) and debounces Results (1s per raceId)
   */
  private handleEventStateChange(state: EventStateData): void {
    // Skip if paused or not connected
    if (this.status.state !== 'connected') {
      return;
    }

    // Always update OnCourse penalty cache for BR merge (even when push is throttled)
    if (state.onCourse.length > 0) {
      this.transformer.updateOnCoursePenalties(state.onCourse);
    }

    // Handle OnCourse push (throttle 2/s) — push even when empty to clear panel
    if (this.status.channels.oncourse.enabled) {
      this.scheduleOnCoursePush(state.onCourse);
    }

    // Handle Results push (debounce 1s per raceId)
    if (this.status.channels.results.enabled && state.results) {
      this.scheduleResultsPush(state.results);
    }

    // Auto-status: check for race status changes in schedule
    if (this.autoStatusEnabled && this.haveRaceStatusesChanged(state.schedule)) {
      this.evaluateAutoStatus();
    }
  }

  /**
   * Schedule OnCourse push with throttling (max 10/s).
   *
   * Fixes (#150):
   * - `onCourseLastPush` is marked synchronously *before* firing the async push,
   *   so concurrent change events during the HTTP round-trip get throttled
   *   instead of racing into duplicate concurrent POSTs.
   * - If the pending snapshot is byte-identical to the last one pushed, skip —
   *   avoids broadcasting the same frame to WS clients multiple times.
   */
  private scheduleOnCoursePush(onCourse: EventStateData['onCourse']): void {
    // Always keep latest snapshot so the throttled push uses fresh data
    this.pendingOnCourse = onCourse;

    // Check throttle: don't push if last push was < ONCOURSE_THROTTLE_MS ago
    const now = Date.now();
    if (this.onCourseLastPush && now - this.onCourseLastPush.getTime() < ONCOURSE_THROTTLE_MS) {
      // Still throttled, schedule for later if not already scheduled
      if (!this.onCourseThrottleTimer) {
        const delay = ONCOURSE_THROTTLE_MS - (now - this.onCourseLastPush.getTime());
        this.onCourseThrottleTimer = setTimeout(() => {
          this.onCourseThrottleTimer = null;
          if (this.pendingOnCourse) {
            const snap = this.pendingOnCourse;
            this.pendingOnCourse = null;
            this.firePushOnCourse(snap);
          }
        }, delay);
      }
      return;
    }

    // Not throttled, push immediately
    this.pendingOnCourse = null;
    this.firePushOnCourse(onCourse);
  }

  /**
   * Fire an OnCourse push: update throttle marker synchronously, skip if
   * content is unchanged from last push or a previous push is still in
   * flight, then kick the async request.
   *
   * In-flight guard (#157): oncourse data is ephemeral — we always push the
   * latest snapshot next time, so dropping one while another is pending is
   * fine and prevents fetch-pool saturation when Railway hangs.
   */
  private firePushOnCourse(onCourse: EventStateData['onCourse']): void {
    // Reserve the throttle slot *before* awaiting HTTP so that change events
    // during the round-trip don't stampede into duplicate concurrent pushes.
    this.onCourseLastPush = new Date();

    if (this.onCoursePushInFlight) {
      return;
    }

    const fingerprint = this.fingerprintOnCourse(onCourse);
    if (fingerprint !== null && fingerprint === this.lastPushedOnCourseFingerprint) {
      return;
    }
    this.lastPushedOnCourseFingerprint = fingerprint;

    this.onCoursePushInFlight = true;
    this.pushOnCourse(onCourse).finally(() => {
      this.onCoursePushInFlight = false;
    });
  }

  /**
   * Compact fingerprint of an OnCourse snapshot used to skip identical pushes.
   * Returns null if an entry shape is unexpected (play it safe → always push).
   */
  private fingerprintOnCourse(onCourse: EventStateData['onCourse']): string | null {
    try {
      return onCourse
        .map((c) => {
          const gates = Array.isArray(c.gates) ? c.gates.join(',') : '';
          return [
            c.bib ?? '',
            c.raceId ?? '',
            c.position ?? '',
            c.time ?? '',
            c.pen ?? '',
            c.total ?? '',
            c.dtStart ?? '',
            c.dtFinish ?? '',
            c.rank ?? '',
            gates,
          ].join('|');
        })
        .join(';');
    } catch {
      return null;
    }
  }

  /**
   * Schedule Results push with debouncing (1s per raceId).
   *
   * Uses object reference comparison instead of content fingerprinting:
   * EventState.updateResults() replaces _state.results reference only when
   * a new results message is accepted. OnCourse/TimeOfDay changes don't
   * touch _state.results, so the reference stays the same.
   *
   * Two-level skip:
   * 1. lastScheduledResultsRef - prevents oncourse from resetting debounce timer
   * 2. lastPushedResultsRef - prevents re-pushing already pushed data
   */
  private scheduleResultsPush(results: NonNullable<EventStateData['results']>): void {
    if (results === this.lastScheduledResultsRef || results === this.lastPushedResultsRef) {
      return;
    }
    this.lastScheduledResultsRef = results;

    const raceId = results.raceId;
    const existingTimer = this.resultsDebounceTimers.get(raceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.pushResults(results);
      this.resultsDebounceTimers.delete(raceId);
    }, RESULTS_DEBOUNCE_MS);

    this.resultsDebounceTimers.set(raceId, timer);
  }

  /**
   * Push XML to live
   */
  private async pushXml(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.warn('LivePusher', 'Circuit breaker open, skipping XML push');
      return;
    }

    // In-flight guard: if a previous XML push is still outstanding, skip
    // this one. Next XML change will schedule another push.
    if (this.xmlPushInFlight) {
      Logger.warn('LivePusher', 'XML push already in flight, skipping');
      return;
    }

    try {
      // Get full XML export
      const xmlPath = this.xmlDataService.getPath();
      if (!xmlPath) {
        Logger.warn('LivePusher', 'No XML path configured, skipping push');
        return;
      }

      // Read XML file
      const xml = await readFile(xmlPath, 'utf-8');
      const sizeBytes = Buffer.byteLength(xml, 'utf8');

      Logger.info('LivePusher', `Pushing XML (${sizeBytes}B)`);
      const t0 = Date.now();
      this.xmlPushInFlight = true;
      const response = await this.client.pushXml(xml);
      Logger.info('LivePusher', `XML push OK in ${Date.now() - t0}ms`);

      // Success
      this.handleSuccess('xml', response);

      // Refresh participant mapping after XML push
      try {
        await this.transformer.refreshParticipantMapping();
        Logger.info('LivePusher', 'Participant mapping refreshed after XML push');
      } catch (error) {
        Logger.warn('LivePusher', 'Failed to refresh participant mapping', error);
      }
    } catch (error) {
      this.handleError(error as Error, 'xml');
    } finally {
      this.xmlPushInFlight = false;
    }
  }

  /**
   * Push OnCourse data to live
   */
  private async pushOnCourse(onCourse: EventStateData['onCourse']): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.debug('LivePusher', 'Circuit breaker open, skipping OnCourse push');
      return;
    }

    // Skip if no participant mapping available
    if (!this.transformer.hasMappingData()) {
      Logger.debug('LivePusher', 'No participant mapping, skipping OnCourse push');
      return;
    }

    try {
      // Transform OnCourse data
      const transformed = onCourse
        .map((comp) => this.transformer.transformOnCourse(comp))
        .filter((t): t is NonNullable<typeof t> => t !== null);

      const payload = { oncourse: transformed };
      const sizeBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      Logger.debug(
        'LivePusher',
        `Pushing ${transformed.length} OnCourse competitors (${sizeBytes}B)`,
      );
      const response = await this.client.pushOnCourse(payload);

      // Success. NOTE: onCourseLastPush is already set synchronously in
      // firePushOnCourse() to block concurrent pushes during the round-trip.
      this.handleSuccess('oncourse', response);
    } catch (error) {
      this.handleError(error as Error, 'oncourse');
    }
  }

  /**
   * Push Results data to live
   */
  private async pushResults(results: NonNullable<EventStateData['results']>): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.debug('LivePusher', 'Circuit breaker open, skipping Results push');
      return;
    }

    // Skip if no participant mapping available
    if (!this.transformer.hasMappingData()) {
      Logger.debug('LivePusher', 'No participant mapping, skipping Results push');
      return;
    }

    // Latest-wins in-flight guard (#157). If a previous push is still running
    // we save the new data as "pending" and return — when the in-flight push
    // finishes it drains the pending slot and fires once with the freshest
    // data. This prevents request stacking during a Railway outage (where a
    // single push can hang 60s in retry loop) while still guaranteeing the
    // final results of a race land even if no further EventState change
    // happens.
    if (this.resultsPushInFlight) {
      this.resultsPushPending = results;
      Logger.debug(
        'LivePusher',
        `Results push in flight, queued latest for ${results.raceId}`,
      );
      return;
    }
    this.resultsPushInFlight = true;

    try {
      const transformed = await this.transformer.transformResults(results);

      if (transformed.length === 0) {
        Logger.debug('LivePusher', 'No valid Results data to push');
        return;
      }

      const payload = { results: transformed };
      const sizeBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
      Logger.info(
        'LivePusher',
        `Pushing ${transformed.length} results for ${results.raceId} (${sizeBytes}B)`,
      );
      const t0 = Date.now();
      const response = await this.client.pushResults(payload);
      Logger.info('LivePusher', `Results push OK in ${Date.now() - t0}ms`);

      // Only mark as pushed on success - failed pushes will be retried
      // on next EventState change
      this.lastPushedResultsRef = results;
      this.handleSuccess('results', response);
    } catch (error) {
      this.handleError(error as Error, 'results');
    } finally {
      this.resultsPushInFlight = false;
      // Drain the latest-wins queue on next tick so the stack unwinds cleanly
      if (this.resultsPushPending) {
        const next = this.resultsPushPending;
        this.resultsPushPending = null;
        setImmediate(() => {
          this.pushResults(next).catch(() => {/* handleError logged */});
        });
      }
    }
  }

  /**
   * Handle successful push.
   *
   * Clears per-channel error AND global error/state so the UI stops showing
   * a stale red badge once traffic recovers. Previously the global
   * `status.lastError` and `status.state='error'` were left set after CB
   * opened, requiring a manual Force-push XML to clear them (#157 UX).
   */
  private handleSuccess(
    channel: 'xml' | 'oncourse' | 'results',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _response: any,
  ): void {
    // Reset circuit breaker
    const wasOpen = this.status.circuitBreaker.isOpen;
    this.consecutiveFailures = 0;
    if (wasOpen) {
      this.status.circuitBreaker.isOpen = false;
      this.status.circuitBreaker.openedAt = null;
      this.circuitBreakerOpenAt = null;
      Logger.info('LivePusher', `Circuit breaker closed after successful ${channel} push`);
    }
    this.status.circuitBreaker.consecutiveFailures = 0;

    // Restore healthy global state if we were in 'error' due to prior failures.
    if (this.status.state === 'error') {
      this.status.state = 'connected';
    }
    this.status.lastError = null;

    // Update channel status
    const channelStatus = this.status.channels[channel];
    channelStatus.lastPushAt = new Date().toISOString();
    channelStatus.lastError = null;
    channelStatus.totalPushes++;

    this.emitStatusChange();
  }

  /**
   * Handle push error.
   *
   * #157: All failures — transient (5xx / timeout) AND app-level (4xx) — count
   * toward the circuit breaker. The CB is tuned to be a fast-open/fast-close
   * pulse (3 consecutive failures → 3s lockout), so a brief Railway proxy
   * blip trips it but recovery arrives in 3s, not 30s. `handleSuccess`
   * already clears `status.lastError` and resets `state='connected'`, so the
   * admin UI's red badge goes away on its own once traffic recovers.
   *
   * An earlier iteration exempted transient errors entirely — that was
   * "lying to the architecture": the CB stayed closed even during real
   * outages, and nothing rate-limited stacked Results pushes. The pulse CB
   * gives us the right backpressure without the 30s lockout problem the
   * original constants had.
   */
  private handleError(error: Error, channel: 'xml' | 'oncourse' | 'results'): void {
    Logger.error('LivePusher', `${channel} push failed`, error);

    // Update channel status
    const channelStatus = this.status.channels[channel];
    channelStatus.lastError = error.message;
    channelStatus.totalErrors++;

    // Update global error
    this.status.lastError = `${channel}: ${error.message}`;

    // Increment circuit breaker
    this.consecutiveFailures++;
    this.status.circuitBreaker.consecutiveFailures = this.consecutiveFailures;

    // Open circuit if threshold reached
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpenAt = new Date();
      this.status.circuitBreaker.isOpen = true;
      this.status.circuitBreaker.openedAt = this.circuitBreakerOpenAt.toISOString();
      this.status.state = 'error';
      Logger.warn(
        'LivePusher',
        `Circuit breaker opened after ${this.consecutiveFailures} failures`,
      );
    }

    this.emitStatusChange();
    this.emit('error', error);
  }

  /**
   * Check if circuit breaker is open
   * Auto-closes after timeout
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitBreakerOpenAt) {
      return false;
    }

    const elapsed = Date.now() - this.circuitBreakerOpenAt.getTime();
    if (elapsed > CIRCUIT_BREAKER_TIMEOUT_MS) {
      // Timeout elapsed, close circuit
      Logger.info('LivePusher', 'Circuit breaker timeout elapsed, attempting retry');
      this.circuitBreakerOpenAt = null;
      this.consecutiveFailures = 0;
      this.status.circuitBreaker.isOpen = false;
      this.status.circuitBreaker.openedAt = null;
      this.status.circuitBreaker.consecutiveFailures = 0;
      this.status.state = 'connected';
      this.emitStatusChange();
      return false;
    }

    return true;
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(): void {
    this.emit('statusChange', this.getStatus());
  }

  /**
   * Initialize race status map without triggering evaluation.
   * Used on connect to set baseline before first change detection.
   */
  private initRaceStatuses(races: ScheduleRace[]): void {
    this.previousRaceStatuses.clear();
    for (const race of races) {
      this.previousRaceStatuses.set(race.raceId, race.raceStatus);
    }
  }

  /**
   * Check if any race status has changed since last check.
   * Updates the stored map and returns true if a change was detected.
   */
  private haveRaceStatusesChanged(races: ScheduleRace[]): boolean {
    let changed = false;
    const newMap = new Map<string, number>();

    for (const race of races) {
      newMap.set(race.raceId, race.raceStatus);
      const prev = this.previousRaceStatuses.get(race.raceId);
      if (prev !== race.raceStatus) {
        changed = true;
      }
    }

    // Also detect if race set changed (new/removed races)
    if (newMap.size !== this.previousRaceStatuses.size) {
      changed = true;
    }

    this.previousRaceStatuses = newMap;
    return changed;
  }

  /**
   * Evaluate current schedule and auto-transition if needed.
   * Only transitions forward (never backwards).
   */
  private async evaluateAutoStatus(): Promise<void> {
    if (this.isTransitioning) return;
    if (!this.eventState || !this.client) return;
    if (this.status.state !== 'connected') return;

    const desired = deriveEventStatus(this.eventState.state.schedule);
    if (!desired) return;

    const current = this.status.eventStatus;
    if (!current) return;
    if (!isForwardTransition(current, desired)) return;

    Logger.info('LivePusher', `Auto-status: transitioning ${current} → ${desired}`);
    this.isTransitioning = true;
    try {
      await this.transitionStatus(desired);
    } catch (error) {
      // If the server reports its current status, sync our local state.
      // This handles the case where we reconnected to an event that was
      // already ahead of our local status (e.g., server at 'running',
      // local at 'draft') — the server rejects the no-op transition but
      // tells us where it actually is.
      if (error instanceof LiveApiError && error.response?.currentStatus) {
        const serverStatus = error.response.currentStatus as EventStatus;
        if (serverStatus in STATUS_ORDER) {
          Logger.info('LivePusher', `Auto-status: synced local status from server: ${serverStatus}`);
          this.status.eventStatus = serverStatus;
          this.emitStatusChange();
        }
      }
      // Clear cached statuses so the next state update re-triggers evaluation
      this.previousRaceStatuses.clear();
      Logger.warn('LivePusher', 'Auto-status: transition failed, will retry on next change', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Create initial status
   */
  private createInitialStatus(): LiveStatus {
    const createChannelStatus = (channel: 'xml' | 'oncourse' | 'results'): ChannelStatus => ({
      channel,
      enabled: false,
      lastPushAt: null,
      lastError: null,
      totalPushes: 0,
      totalErrors: 0,
    });

    return {
      state: 'not_configured',
      serverUrl: null,
      eventId: null,
      eventStatus: null,
      channels: {
        xml: createChannelStatus('xml'),
        oncourse: createChannelStatus('oncourse'),
        results: createChannelStatus('results'),
      },
      circuitBreaker: {
        isOpen: false,
        consecutiveFailures: 0,
        openedAt: null,
      },
      lastError: null,
      connectedAt: null,
      autoStatus: false,
    };
  }
}
