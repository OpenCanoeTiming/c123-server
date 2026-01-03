import type { WebSocket } from 'ws';
import type { ScoreboardConfig } from '../admin/types.js';
import type { C123Message } from '../protocol/types.js';

/**
 * Per-scoreboard session with individual configuration.
 *
 * Manages connection state for a single scoreboard client.
 * Sends C123 protocol messages directly without transformation.
 */
export class ScoreboardSession {
  readonly id: string;
  readonly connectedAt: Date;
  private lastActivity: Date;
  private config: ScoreboardConfig;
  private ws: WebSocket;

  constructor(id: string, ws: WebSocket, config?: Partial<ScoreboardConfig>) {
    this.id = id;
    this.ws = ws;
    this.connectedAt = new Date();
    this.lastActivity = new Date();
    this.config = {
      showOnCourse: config?.showOnCourse ?? true,
      showResults: config?.showResults ?? true,
    };
    if (config?.raceFilter) {
      this.config.raceFilter = config.raceFilter;
    }
  }

  /**
   * Get session info for admin API
   */
  getInfo(): {
    id: string;
    connectedAt: string;
    lastActivity: string;
    config: ScoreboardConfig;
  } {
    return {
      id: this.id,
      connectedAt: this.connectedAt.toISOString(),
      lastActivity: this.lastActivity.toISOString(),
      config: { ...this.config },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ScoreboardConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ScoreboardConfig>): void {
    if (config.showOnCourse !== undefined) {
      this.config.showOnCourse = config.showOnCourse;
    }
    if (config.showResults !== undefined) {
      this.config.showResults = config.showResults;
    }
    if (config.raceFilter !== undefined) {
      this.config.raceFilter = config.raceFilter;
    }
  }

  /**
   * Check if WebSocket connection is open
   */
  isConnected(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }

  /**
   * Send a C123 protocol message to this scoreboard
   */
  send(message: C123Message): void {
    if (!this.isConnected()) {
      return;
    }

    // Apply filters based on message type
    if (!this.shouldSendMessage(message)) {
      return;
    }

    this.lastActivity = new Date();
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send raw JSON string without filtering
   */
  sendRaw(message: string): void {
    if (!this.isConnected()) {
      return;
    }
    this.lastActivity = new Date();
    this.ws.send(message);
  }

  /**
   * Check if message should be sent based on config filters
   */
  private shouldSendMessage(message: C123Message): boolean {
    // OnCourse filtering
    if (message.type === 'OnCourse' && this.config.showOnCourse === false) {
      return false;
    }

    // Results filtering
    if (message.type === 'Results' && this.config.showResults === false) {
      return false;
    }

    // Race filter for Results and OnCourse
    if (this.config.raceFilter && this.config.raceFilter.length > 0) {
      if (message.type === 'Results') {
        const raceId = message.data.raceId;
        if (!this.config.raceFilter.includes(raceId)) {
          return false;
        }
      }
      // Note: OnCourse doesn't have a single raceId, competitors may be from different races
      // For now, we don't filter OnCourse by race - let the client handle it
    }

    // Always send TimeOfDay, Schedule, RaceConfig, Connected, Error
    return true;
  }
}
