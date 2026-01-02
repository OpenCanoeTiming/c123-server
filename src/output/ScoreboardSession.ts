import type { WebSocket } from 'ws';
import type { ScoreboardConfig } from '../admin/types.js';
import type { EventStateData } from '../state/types.js';
import { formatAllMessages, formatFilteredMessages } from './MessageFormatter.js';

/**
 * Per-scoreboard session with individual configuration.
 *
 * Manages connection state and filtering for a single scoreboard client.
 * Allows runtime configuration changes via admin API.
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
   * Send state to this scoreboard, applying configured filters
   */
  send(state: EventStateData): void {
    if (!this.isConnected()) {
      return;
    }

    this.lastActivity = new Date();

    // Apply filters
    const messages = this.hasFilters()
      ? formatFilteredMessages(state, this.config)
      : formatAllMessages(state);

    for (const message of messages) {
      this.ws.send(message);
    }
  }

  /**
   * Send raw message without filtering
   */
  sendRaw(message: string): void {
    if (!this.isConnected()) {
      return;
    }
    this.lastActivity = new Date();
    this.ws.send(message);
  }

  /**
   * Check if any filters are configured
   */
  private hasFilters(): boolean {
    return (
      this.config.showOnCourse === false ||
      this.config.showResults === false ||
      (this.config.raceFilter !== undefined && this.config.raceFilter.length > 0)
    );
  }
}
