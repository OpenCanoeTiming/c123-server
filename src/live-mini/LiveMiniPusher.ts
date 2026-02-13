/**
 * Live-Mini Pusher
 *
 * Main orchestrator for pushing timing data to c123-live-mini-server.
 * Subscribes to XML changes and EventState changes, buffers data,
 * and pushes to remote server with circuit breaker protection.
 */

import { EventEmitter } from 'node:events';
import type { XmlDataService } from '../service/XmlDataService.js';
import type { EventState } from '../state/EventState.js';
import type { XmlChangeNotifier } from '../xml/XmlChangeNotifier.js';
import type { EventStateData } from '../state/types.js';
import type { XmlSection } from '../protocol/types.js';
import { LiveMiniClient } from './LiveMiniClient.js';
import { LiveMiniTransformer } from './LiveMiniTransformer.js';
import type {
  LiveMiniStatus,
  PusherState,
  ChannelStatus,
  EventStatus,
  CreateEventRequest,
} from './types.js';
import { Logger } from '../utils/logger.js';

/**
 * Pusher events
 */
export interface LiveMiniPusherEvents {
  /** Status changed */
  statusChange: [status: LiveMiniStatus];
  /** Error occurred */
  error: [error: Error];
}

/**
 * Configuration for starting pusher
 */
export interface LiveMiniPusherConfig {
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
 * Orchestrates pushing timing data to c123-live-mini-server.
 */
export class LiveMiniPusher extends EventEmitter<LiveMiniPusherEvents> {
  private client: LiveMiniClient | null = null;
  private transformer: LiveMiniTransformer;

  private xmlDataService: XmlDataService;
  private xmlChangeNotifier: XmlChangeNotifier | null = null;
  private eventState: EventState | null = null;

  private status: LiveMiniStatus;

  // Circuit breaker
  private consecutiveFailures = 0;
  private circuitBreakerOpenAt: Date | null = null;

  // Buffers
  private xmlBuffer: { checksum: string; sections: XmlSection[] } | null = null;
  private onCourseLastPush: Date | null = null;
  private resultsDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  // Timers
  private xmlDebounceTimer: NodeJS.Timeout | null = null;
  private onCourseThrottleTimer: NodeJS.Timeout | null = null;

  // Event listeners (stored for cleanup)
  private xmlChangeListener: ((sections: XmlSection[], checksum: string) => void) | null = null;
  private eventStateListener: ((state: EventStateData) => void) | null = null;

  constructor(xmlDataService: XmlDataService) {
    super();
    this.xmlDataService = xmlDataService;
    this.transformer = new LiveMiniTransformer(xmlDataService);

    // Initialize status
    this.status = this.createInitialStatus();
  }

  /**
   * Connect to live-mini server and start pushing
   */
  async connect(
    config: LiveMiniPusherConfig,
    xmlChangeNotifier: XmlChangeNotifier,
    eventState: EventState,
  ): Promise<void> {
    // Disconnect if already connected
    if (this.client) {
      await this.disconnect();
    }

    // Create client
    this.client = new LiveMiniClient({
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
      Logger.info('LiveMiniPusher', 'Participant mapping refreshed');
    } catch (error) {
      Logger.warn('LiveMiniPusher', 'Failed to refresh participant mapping', error);
    }

    // Setup event listeners
    this.setupEventListeners();

    // Reset circuit breaker
    this.consecutiveFailures = 0;
    this.circuitBreakerOpenAt = null;
    this.status.circuitBreaker.isOpen = false;
    this.status.circuitBreaker.consecutiveFailures = 0;
    this.status.circuitBreaker.openedAt = null;

    Logger.info(
      'LiveMiniPusher',
      `Connected to ${config.serverUrl} (event: ${config.eventId})`,
    );
    this.emitStatusChange();
  }

  /**
   * Disconnect from live-mini server
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

    // Clear buffers
    this.xmlBuffer = null;
    this.onCourseLastPush = null;

    // Clear references
    this.client = null;
    this.xmlChangeNotifier = null;
    this.eventState = null;

    // Update status
    this.status.state = 'disconnected';
    this.status.connectedAt = null;

    Logger.info('LiveMiniPusher', 'Disconnected');
    this.emitStatusChange();
  }

  /**
   * Pause pushing (keep connection, stop data flow)
   */
  pause(): void {
    if (this.status.state === 'connected') {
      this.status.state = 'paused';
      Logger.info('LiveMiniPusher', 'Paused');
      this.emitStatusChange();
    }
  }

  /**
   * Resume pushing
   */
  resume(): void {
    if (this.status.state === 'paused') {
      this.status.state = 'connected';
      Logger.info('LiveMiniPusher', 'Resumed');
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

    Logger.info('LiveMiniPusher', 'Force pushing XML');
    await this.pushXml();
  }

  /**
   * Transition event status on live-mini
   */
  async transitionStatus(status: EventStatus): Promise<void> {
    if (!this.client || !this.status.eventId) {
      throw new Error('Not connected');
    }

    Logger.info('LiveMiniPusher', `Transitioning event status to: ${status}`);

    try {
      const response = await this.client.transitionStatus(this.status.eventId, { status });
      this.status.eventStatus = response.status;
      Logger.info('LiveMiniPusher', `Event status transitioned to: ${response.status}`);
      this.emitStatusChange();
    } catch (error) {
      Logger.error('LiveMiniPusher', 'Failed to transition status', error);
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
      'LiveMiniPusher',
      `Channels updated: xml=${this.status.channels.xml.enabled} oncourse=${this.status.channels.oncourse.enabled} results=${this.status.channels.results.enabled}`,
    );
    this.emitStatusChange();
  }

  /**
   * Get current status
   */
  getStatus(): LiveMiniStatus {
    return { ...this.status };
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
    this.xmlChangeListener = (sections: XmlSection[], checksum: string) => {
      this.handleXmlChange(sections, checksum);
    };
    this.xmlChangeNotifier.on('change', this.xmlChangeListener);

    // EventState change listener (for OnCourse and Results)
    this.eventStateListener = (state: EventStateData) => {
      this.handleEventStateChange(state);
    };
    this.eventState.on('change', this.eventStateListener);

    Logger.info('LiveMiniPusher', 'Event listeners setup');
  }

  /**
   * Handle XML change event
   * Debounces XML push by 2 seconds
   */
  private handleXmlChange(sections: XmlSection[], checksum: string): void {
    // Skip if paused or not connected
    if (this.status.state !== 'connected') {
      return;
    }

    // Skip if XML push disabled
    if (!this.status.channels.xml.enabled) {
      return;
    }

    Logger.debug('LiveMiniPusher', `XML changed: ${sections.join(', ')}`);

    // Buffer the change
    this.xmlBuffer = { sections, checksum };

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

    // Handle OnCourse push (throttle 2/s)
    if (this.status.channels.oncourse.enabled && state.onCourse.length > 0) {
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
    // Check throttle: don't push if last push was < 500ms ago
    const now = Date.now();
    if (this.onCourseLastPush && now - this.onCourseLastPush.getTime() < ONCOURSE_THROTTLE_MS) {
      // Still throttled, schedule for later if not already scheduled
      if (!this.onCourseThrottleTimer) {
        const delay = ONCOURSE_THROTTLE_MS - (now - this.onCourseLastPush.getTime());
        this.onCourseThrottleTimer = setTimeout(() => {
          this.pushOnCourse(onCourse);
          this.onCourseThrottleTimer = null;
        }, delay);
      }
      return;
    }

    // Not throttled, push immediately
    this.pushOnCourse(onCourse);
  }

  /**
   * Schedule Results push with debouncing (1s per raceId)
   */
  private scheduleResultsPush(results: NonNullable<EventStateData['results']>): void {
    const raceId = results.raceId;

    // Clear existing timer for this raceId
    const existingTimer = this.resultsDebounceTimers.get(raceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce: push after 1s of no changes for this raceId
    const timer = setTimeout(() => {
      this.pushResults(results);
      this.resultsDebounceTimers.delete(raceId);
    }, RESULTS_DEBOUNCE_MS);

    this.resultsDebounceTimers.set(raceId, timer);
  }

  /**
   * Push XML to live-mini
   */
  private async pushXml(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.warn('LiveMiniPusher', 'Circuit breaker open, skipping XML push');
      return;
    }

    try {
      // Get full XML export
      const xmlPath = this.xmlDataService.getPath();
      if (!xmlPath) {
        Logger.warn('LiveMiniPusher', 'No XML path configured, skipping push');
        return;
      }

      // Read XML file
      const fs = await import('node:fs/promises');
      const xml = await fs.readFile(xmlPath, 'utf-8');

      Logger.info('LiveMiniPusher', 'Pushing XML');
      const response = await this.client.pushXml(xml);

      // Success
      this.handleSuccess('xml', response);

      // Refresh participant mapping after XML push
      try {
        await this.transformer.refreshParticipantMapping();
        Logger.info('LiveMiniPusher', 'Participant mapping refreshed after XML push');
      } catch (error) {
        Logger.warn('LiveMiniPusher', 'Failed to refresh participant mapping', error);
      }
    } catch (error) {
      this.handleError(error as Error, 'xml');
    }
  }

  /**
   * Push OnCourse data to live-mini
   */
  private async pushOnCourse(onCourse: EventStateData['onCourse']): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.debug('LiveMiniPusher', 'Circuit breaker open, skipping OnCourse push');
      return;
    }

    // Skip if no participant mapping available
    if (!this.transformer.hasMappingData()) {
      Logger.debug('LiveMiniPusher', 'No participant mapping, skipping OnCourse push');
      return;
    }

    try {
      // Transform OnCourse data
      const transformed = onCourse
        .map((comp) => this.transformer.transformOnCourse(comp))
        .filter((t): t is NonNullable<typeof t> => t !== null);

      if (transformed.length === 0) {
        Logger.debug('LiveMiniPusher', 'No valid OnCourse data to push');
        return;
      }

      Logger.debug('LiveMiniPusher', `Pushing ${transformed.length} OnCourse competitors`);
      const response = await this.client.pushOnCourse({ oncourse: transformed });

      // Success
      this.handleSuccess('oncourse', response);
      this.onCourseLastPush = new Date();
    } catch (error) {
      this.handleError(error as Error, 'oncourse');
    }
  }

  /**
   * Push Results data to live-mini
   */
  private async pushResults(results: NonNullable<EventStateData['results']>): Promise<void> {
    if (!this.client) {
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      Logger.debug('LiveMiniPusher', 'Circuit breaker open, skipping Results push');
      return;
    }

    // Skip if no participant mapping available
    if (!this.transformer.hasMappingData()) {
      Logger.debug('LiveMiniPusher', 'No participant mapping, skipping Results push');
      return;
    }

    try {
      // Transform Results data
      const transformed = this.transformer.transformResults(results);

      if (transformed.length === 0) {
        Logger.debug('LiveMiniPusher', 'No valid Results data to push');
        return;
      }

      Logger.info(
        'LiveMiniPusher',
        `Pushing ${transformed.length} results for ${results.raceId}`,
      );
      const response = await this.client.pushResults({ results: transformed });

      // Success
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
    response: any,
  ): void {
    // Reset circuit breaker
    this.consecutiveFailures = 0;
    if (this.status.circuitBreaker.isOpen) {
      this.status.circuitBreaker.isOpen = false;
      this.status.circuitBreaker.openedAt = null;
      Logger.info('LiveMiniPusher', 'Circuit breaker closed');
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
    Logger.error('LiveMiniPusher', `${channel} push failed`, error);

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
        'LiveMiniPusher',
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
      Logger.info('LiveMiniPusher', 'Circuit breaker timeout elapsed, attempting retry');
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
  private createInitialStatus(): LiveMiniStatus {
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
