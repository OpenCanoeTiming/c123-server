import type { WebSocket } from 'ws';
import type { ScoreboardConfig } from '../admin/types.js';
import type { C123Message, C123ConfigPush } from '../protocol/types.js';
import type { ClientConfig, AssetUrls } from '../config/types.js';

/**
 * Client state as reported by the client via ClientState message
 */
export interface ClientReportedState {
  /** Current values the client is using */
  current: Record<string, unknown>;
  /** Client version (optional) */
  version?: string | undefined;
  /** Client capabilities (optional) */
  capabilities?: string[] | undefined;
  /** Timestamp of last state update */
  lastUpdated?: string | undefined;
}

/**
 * Session info for admin API (extended with IP and configKey)
 */
export interface SessionInfo {
  id: string;
  connectedAt: string;
  lastActivity: string;
  ipAddress: string;
  /** Key used for config storage - either explicit clientId or IP fallback */
  configKey: string;
  /** True if configKey is an explicit clientId (not IP-based) */
  hasExplicitId: boolean;
  config: ScoreboardConfig;
  clientState?: ClientReportedState | undefined;
}

/**
 * Per-scoreboard session with individual configuration.
 *
 * Manages connection state for a single scoreboard client.
 * Sends C123 protocol messages directly without transformation.
 *
 * Extended with:
 * - IP address identification for persistent client config
 * - configKey for config storage (explicit clientId or IP fallback)
 * - Client state tracking (what the client reports)
 */
export class ScoreboardSession {
  readonly id: string;
  readonly connectedAt: Date;
  readonly ipAddress: string;
  /** Key used for config storage - either explicit clientId or IP fallback */
  readonly configKey: string;
  /** True if configKey is an explicit clientId (not IP-based) */
  readonly hasExplicitId: boolean;
  private lastActivity: Date;
  private config: ScoreboardConfig;
  private ws: WebSocket;
  private clientState: ClientReportedState | undefined;
  private serverConfig: ClientConfig | undefined;
  private defaultAssets: AssetUrls | undefined;

  constructor(
    id: string,
    ws: WebSocket,
    ipAddress: string,
    config?: Partial<ScoreboardConfig>,
    serverConfig?: ClientConfig,
    /** Explicit clientId from URL query param (if provided) */
    explicitClientId?: string,
    /** Default assets for all clients (merged with per-client overrides) */
    defaultAssets?: AssetUrls,
  ) {
    this.id = id;
    this.ws = ws;
    this.ipAddress = ipAddress;
    // Use explicit clientId if provided, otherwise fall back to IP
    this.configKey = explicitClientId || ipAddress;
    this.hasExplicitId = !!explicitClientId;
    this.connectedAt = new Date();
    this.lastActivity = new Date();
    this.serverConfig = serverConfig;
    this.defaultAssets = defaultAssets;
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
  getInfo(): SessionInfo {
    return {
      id: this.id,
      connectedAt: this.connectedAt.toISOString(),
      lastActivity: this.lastActivity.toISOString(),
      ipAddress: this.ipAddress,
      configKey: this.configKey,
      hasExplicitId: this.hasExplicitId,
      config: { ...this.config },
      clientState: this.clientState ? { ...this.clientState } : undefined,
    };
  }

  /**
   * Get the config key (explicit clientId or IP fallback)
   */
  getConfigKey(): string {
    return this.configKey;
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

  // =========================================================================
  // Client State Management
  // =========================================================================

  /**
   * Get the IP address of this client
   */
  getIpAddress(): string {
    return this.ipAddress;
  }

  /**
   * Get the current client state (as reported by client)
   */
  getClientState(): ClientReportedState | undefined {
    return this.clientState ? { ...this.clientState } : undefined;
  }

  /**
   * Update client state (from ClientState message)
   */
  setClientState(state: {
    current: Record<string, unknown>;
    version?: string | undefined;
    capabilities?: string[] | undefined;
  }): void {
    this.clientState = {
      current: state.current,
      version: state.version,
      capabilities: state.capabilities,
      lastUpdated: new Date().toISOString(),
    };
    this.lastActivity = new Date();
  }

  /**
   * Get server-side configuration for this client
   */
  getServerConfig(): ClientConfig | undefined {
    return this.serverConfig ? { ...this.serverConfig } : undefined;
  }

  /**
   * Set server-side configuration for this client
   */
  setServerConfig(config: ClientConfig): void {
    this.serverConfig = { ...config };
  }

  /**
   * Update default assets (called when global defaults change)
   */
  setDefaultAssets(assets: AssetUrls | undefined): void {
    this.defaultAssets = assets ? { ...assets } : undefined;
  }

  /**
   * Get effective configuration by merging server config with defaults.
   * Server config values override defaults when set.
   * Returns only the known scoreboard parameters from server config.
   * Assets are merged: per-client overrides > global defaults.
   */
  getEffectiveConfig(): ClientConfig {
    const result: ClientConfig = {};

    if (this.serverConfig) {
      // Copy only defined values from server config
      // Note: null means "cleared/use default", so we skip both undefined and null
      if (this.serverConfig.type != null) {
        result.type = this.serverConfig.type;
      }
      if (this.serverConfig.displayRows != null) {
        result.displayRows = this.serverConfig.displayRows;
      }
      if (this.serverConfig.customTitle != null) {
        result.customTitle = this.serverConfig.customTitle;
      }
      if (this.serverConfig.raceFilter != null) {
        result.raceFilter = [...this.serverConfig.raceFilter];
      }
      if (this.serverConfig.showOnCourse != null) {
        result.showOnCourse = this.serverConfig.showOnCourse;
      }
      if (this.serverConfig.showResults != null) {
        result.showResults = this.serverConfig.showResults;
      }
      if (this.serverConfig.scrollToFinished != null) {
        result.scrollToFinished = this.serverConfig.scrollToFinished;
      }
      if (this.serverConfig.custom != null) {
        result.custom = { ...this.serverConfig.custom };
      }
      if (this.serverConfig.label != null) {
        result.label = this.serverConfig.label;
      }
      if (this.serverConfig.clientId != null) {
        result.clientId = this.serverConfig.clientId;
      }
    }

    // Merge assets: per-client overrides > global defaults
    const effectiveAssets = this.getEffectiveAssets();
    if (effectiveAssets && Object.keys(effectiveAssets).length > 0) {
      result.assets = effectiveAssets;
    }

    return result;
  }

  /**
   * Get effective assets by merging per-client overrides with global defaults.
   * Per-client values override global defaults when set.
   */
  private getEffectiveAssets(): AssetUrls | undefined {
    const defaults = this.defaultAssets || {};
    const clientAssets = this.serverConfig?.assets || {};

    // Merge: per-client overrides defaults
    const merged: AssetUrls = {
      ...defaults,
      ...clientAssets,
    };

    // Return undefined if empty
    if (Object.keys(merged).length === 0) {
      return undefined;
    }

    return merged;
  }

  /**
   * Send ConfigPush message to this client
   * Sends only defined parameters (undefined = client uses its default)
   *
   * @param clearedAssetKeys - Asset keys that were explicitly cleared (will be sent as null)
   */
  sendConfigPush(clearedAssetKeys?: Array<'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl'>): void {
    if (!this.isConnected()) {
      return;
    }

    const config = this.getEffectiveConfig();

    // Add null values for explicitly cleared asset keys
    if (clearedAssetKeys && clearedAssetKeys.length > 0) {
      const assetsWithNulls: Record<string, string | null> = { ...(config.assets || {}) };
      for (const key of clearedAssetKeys) {
        // Only send null if there's no effective value (i.e., no default)
        if (!assetsWithNulls[key]) {
          assetsWithNulls[key] = null;
        }
      }
      // Type assertion needed because we're adding null values
      (config as { assets?: Record<string, string | null> }).assets = assetsWithNulls;
    }

    // Only send if there's something to push
    if (Object.keys(config).length === 0) {
      return;
    }

    const message: C123ConfigPush = {
      type: 'ConfigPush',
      timestamp: new Date().toISOString(),
      data: config,
    };

    this.lastActivity = new Date();
    this.ws.send(JSON.stringify(message));
  }
}
