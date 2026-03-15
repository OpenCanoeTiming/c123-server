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
import type { XmlSection } from '../protocol/types.js';
import { LiveClient } from './LiveClient.js';
import { LiveTransformer } from './LiveTransformer.js';
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
}

/**
 * Constants
 */
const XML_DEBOUNCE_MS = 2000; // 2s debounce for XML changes
const ONCOURSE_THROTTLE_MS = 500; // 2/s max for OnCourse (500ms between pushes)
const RESULTS_DEBOUNCE_MS = 1000; // 1s debounce per raceId for Results
const CIRCUIT_BREAKER_THRESHOLD = 5; // Consecutive failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000; // 30s pause when circuit opens

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
  private resultsDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  // Two-level dedup for results push:
  // - lastScheduledResultsRef: set when debounce timer is created, prevents oncourse/timeOfDay
  //   changes from resetting the debounce timer (they don't change state.results reference)
  // - lastPushedResultsRef: set after successful push, prevents re-pushing same data
  private lastScheduledResultsRef: object | null = null;
  private lastPushedResultsRef: object | null = null;

  // Timers
  private xmlDebounceTimer: NodeJS.Timeout | null = null;
  private onCourseThrottleTimer: NodeJS.Timeout | null = null;

  // Event listeners (stored for cleanup)
  private xmlChangeListener: ((sections: XmlSection[]) => void) | null = null;
  private eventStateListener: ((state: EventStateData) => void) | null = null;

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

    // Setup event listeners
    this.setupEventListeners();

    // Initial push of current state (in case state arrived before connect)
    const currentState = eventState.state;
    if (config.pushResults && currentState.results) {
      this.scheduleResultsPush(currentState.results);
    }

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

    if (!this.status.channels.xml.enabled) {
      throw new Error('XML push is disabled');
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
  }

  /**
   * Schedule OnCourse push with throttling (max 2/s)
   */
  private scheduleOnCoursePush(onCourse: EventStateData['onCourse']): void {
    // Always keep latest snapshot so the throttled push uses fresh data
    this.pendingOnCourse = onCourse;

    // Check throttle: don't push if last push was < 500ms ago
    const now = Date.now();
    if (this.onCourseLastPush && now - this.onCourseLastPush.getTime() < ONCOURSE_THROTTLE_MS) {
      // Still throttled, schedule for later if not already scheduled
      if (!this.onCourseThrottleTimer) {
        const delay = ONCOURSE_THROTTLE_MS - (now - this.onCourseLastPush.getTime());
        this.onCourseThrottleTimer = setTimeout(() => {
          this.onCourseThrottleTimer = null;
          if (this.pendingOnCourse) {
            this.pushOnCourse(this.pendingOnCourse);
            this.pendingOnCourse = null;
          }
        }, delay);
      }
      return;
    }

    // Not throttled, push immediately
    this.pendingOnCourse = null;
    this.pushOnCourse(onCourse);
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

    try {
      // Get full XML export
      const xmlPath = this.xmlDataService.getPath();
      if (!xmlPath) {
        Logger.warn('LivePusher', 'No XML path configured, skipping push');
        return;
      }

      // Read XML file
      const xml = await readFile(xmlPath, 'utf-8');

      Logger.info('LivePusher', 'Pushing XML');
      const response = await this.client.pushXml(xml);

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

      Logger.debug('LivePusher', `Pushing ${transformed.length} OnCourse competitors`);
      const response = await this.client.pushOnCourse({ oncourse: transformed });

      // Success
      this.handleSuccess('oncourse', response);
      this.onCourseLastPush = new Date();
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

    try {
      const transformed = await this.transformer.transformResults(results);

      if (transformed.length === 0) {
        Logger.debug('LivePusher', 'No valid Results data to push');
        return;
      }

      Logger.info(
        'LivePusher',
        `Pushing ${transformed.length} results for ${results.raceId}`,
      );
      const response = await this.client.pushResults({ results: transformed });

      // Only mark as pushed on success - failed pushes will be retried
      // on next EventState change
      this.lastPushedResultsRef = results;
      this.handleSuccess('results', response);
    } catch (error) {
      this.handleError(error as Error, 'results');
    }
  }

  /**
   * Handle successful push
   */
  private handleSuccess(
    channel: 'xml' | 'oncourse' | 'results',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _response: any,
  ): void {
    // Reset circuit breaker
    this.consecutiveFailures = 0;
    if (this.status.circuitBreaker.isOpen) {
      this.status.circuitBreaker.isOpen = false;
      this.status.circuitBreaker.openedAt = null;
      Logger.info('LivePusher', 'Circuit breaker closed');
    }
    this.status.circuitBreaker.consecutiveFailures = 0;

    // Update channel status
    const channelStatus = this.status.channels[channel];
    channelStatus.lastPushAt = new Date().toISOString();
    channelStatus.lastError = null;
    channelStatus.totalPushes++;

    this.emitStatusChange();
  }

  /**
   * Handle push error
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
    };
  }
}
