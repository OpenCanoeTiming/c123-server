/**
 * AppSettings - Persistent configuration storage for C123 Server
 *
 * Storage locations:
 * - Windows: %APPDATA%\c123-server\settings.json
 * - Linux/macOS: ~/.c123-server/settings.json
 *
 * Settings are loaded on startup and saved on change.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AppSettings as AppSettingsType,
  DEFAULT_APP_SETTINGS,
  XmlSourceMode,
  ClientConfig,
  CustomParamDefinition,
  AssetUrls,
} from './types.js';

export class AppSettingsManager {
  private settings: AppSettingsType;
  private settingsPath: string;
  private loaded: boolean = false;

  constructor() {
    this.settingsPath = this.getSettingsPath();
    this.settings = { ...DEFAULT_APP_SETTINGS };
  }

  /**
   * Get the settings file path based on platform
   */
  private getSettingsPath(): string {
    const appName = 'c123-server';

    if (process.platform === 'win32') {
      // Windows: %APPDATA%\c123-server\settings.json
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, appName, 'settings.json');
    } else {
      // Linux/macOS: ~/.c123-server/settings.json
      return path.join(os.homedir(), `.${appName}`, 'settings.json');
    }
  }

  /**
   * Ensure the settings directory exists
   */
  private ensureDirectory(): void {
    const dir = path.dirname(this.settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load settings from disk
   */
  load(): AppSettingsType {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(content) as Partial<AppSettingsType>;

        // Merge with defaults to ensure all fields exist
        this.settings = {
          ...DEFAULT_APP_SETTINGS,
          ...loaded,
        };
      }
    } catch (error) {
      // On error, use defaults
      console.error(`Failed to load settings from ${this.settingsPath}:`, error);
      this.settings = { ...DEFAULT_APP_SETTINGS };
    }

    this.loaded = true;
    return this.settings;
  }

  /**
   * Save settings to disk
   */
  save(): void {
    try {
      this.ensureDirectory();

      this.settings.lastUpdated = new Date().toISOString();

      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save settings to ${this.settingsPath}:`, error);
      throw error;
    }
  }

  /**
   * Get current settings
   */
  get(): AppSettingsType {
    if (!this.loaded) {
      this.load();
    }
    return { ...this.settings };
  }

  /**
   * Update settings (partial update)
   */
  update(updates: Partial<AppSettingsType>): AppSettingsType {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    this.save();
    return this.get();
  }

  /**
   * Set XML path manually (sets mode to 'manual')
   */
  setXmlPath(xmlPath: string): void {
    this.update({
      xmlPath,
      xmlSourceMode: 'manual',
      xmlAutoDetect: false,
    });
  }

  /**
   * Set XML source mode
   */
  setXmlSourceMode(mode: XmlSourceMode): void {
    const updates: Partial<AppSettingsType> = {
      xmlSourceMode: mode,
      xmlAutoDetect: mode !== 'manual',
    };

    // Clear manual path when switching to auto mode
    if (mode !== 'manual') {
      delete this.settings.xmlPath;
    }

    this.update(updates);
  }

  /**
   * Get XML source mode
   */
  getXmlSourceMode(): XmlSourceMode {
    return this.settings.xmlSourceMode ?? DEFAULT_APP_SETTINGS.xmlSourceMode;
  }

  /**
   * Enable autodetection (sets mode to 'auto-offline')
   */
  enableAutoDetect(): void {
    // Clear manual path and enable autodetect
    delete this.settings.xmlPath;
    this.settings.xmlAutoDetect = true;
    this.settings.xmlSourceMode = 'auto-offline';
    this.save();
  }

  /**
   * Disable autodetection (sets mode to 'manual')
   */
  disableAutoDetect(): void {
    this.update({
      xmlAutoDetect: false,
      xmlSourceMode: 'manual',
    });
  }

  /**
   * Set server port
   */
  setPort(port: number): void {
    this.update({ port });
  }

  /**
   * Get server port (or undefined for default)
   */
  getPort(): number | undefined {
    return this.settings.port;
  }

  /**
   * Set event name override
   */
  setEventNameOverride(name: string | undefined): void {
    if (name === undefined || name === '') {
      delete this.settings.eventNameOverride;
    } else {
      this.settings.eventNameOverride = name;
    }
    this.save();
  }

  /**
   * Get event name override (or undefined if not set)
   */
  getEventNameOverride(): string | undefined {
    return this.settings.eventNameOverride;
  }

  /**
   * Clear event name override
   */
  clearEventNameOverride(): void {
    delete this.settings.eventNameOverride;
    this.save();
  }

  // =========================================================================
  // Client Configuration Management
  // =========================================================================

  /**
   * Get configuration for a specific client by IP address
   */
  getClientConfig(ip: string): ClientConfig | undefined {
    return this.settings.clientConfigs?.[ip];
  }

  /**
   * Set (or update) configuration for a client
   * Performs partial merge - only provided fields are updated
   */
  setClientConfig(ip: string, config: Partial<ClientConfig>): ClientConfig {
    if (!this.settings.clientConfigs) {
      this.settings.clientConfigs = {};
    }

    const existing = this.settings.clientConfigs[ip] || {};
    const merged: ClientConfig = {
      ...existing,
      ...config,
    };

    // Merge custom params separately to preserve existing custom keys
    if (config.custom !== undefined) {
      merged.custom = {
        ...(existing.custom || {}),
        ...config.custom,
      };
    }

    // Merge assets separately to preserve existing asset keys
    // This allows partial updates like { assets: { logoUrl: 'new' } }
    // without losing partnerLogoUrl and footerImageUrl
    if (config.assets !== undefined) {
      merged.assets = {
        ...(existing.assets || {}),
        ...config.assets,
      };
      // Remove keys explicitly set to null (clear the override)
      for (const key of Object.keys(merged.assets) as Array<keyof typeof merged.assets>) {
        if (merged.assets[key] === null) {
          delete merged.assets[key];
        }
      }
      // Remove empty assets object
      if (Object.keys(merged.assets).length === 0) {
        delete merged.assets;
      }
    }

    this.settings.clientConfigs[ip] = merged;
    this.save();
    return merged;
  }

  /**
   * Set the label for a client
   */
  setClientLabel(ip: string, label: string): void {
    this.setClientConfig(ip, { label });
  }

  /**
   * Update lastSeen timestamp for a client
   */
  updateClientLastSeen(ip: string): void {
    if (!this.settings.clientConfigs) {
      this.settings.clientConfigs = {};
    }

    const existing = this.settings.clientConfigs[ip] || {};
    this.settings.clientConfigs[ip] = {
      ...existing,
      lastSeen: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Delete configuration for a client
   * Returns true if config was deleted, false if it didn't exist
   */
  deleteClientConfig(ip: string): boolean {
    if (this.settings.clientConfigs && ip in this.settings.clientConfigs) {
      delete this.settings.clientConfigs[ip];
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Get all client configurations
   */
  getAllClientConfigs(): Record<string, ClientConfig> {
    return this.settings.clientConfigs ? { ...this.settings.clientConfigs } : {};
  }

  /**
   * Get custom parameter definitions
   */
  getCustomParamDefinitions(): CustomParamDefinition[] {
    return [...(this.settings.customParamDefinitions || [])];
  }

  /**
   * Set custom parameter definitions (replaces all)
   */
  setCustomParamDefinitions(definitions: CustomParamDefinition[]): void {
    this.settings.customParamDefinitions = [...definitions];
    this.save();
  }

  /**
   * Add a custom parameter definition
   * If a definition with the same key exists, it is replaced
   */
  addCustomParamDefinition(definition: CustomParamDefinition): void {
    if (!this.settings.customParamDefinitions) {
      this.settings.customParamDefinitions = [];
    }

    const existingIndex = this.settings.customParamDefinitions.findIndex(
      (d) => d.key === definition.key,
    );

    if (existingIndex >= 0) {
      this.settings.customParamDefinitions[existingIndex] = { ...definition };
    } else {
      this.settings.customParamDefinitions.push({ ...definition });
    }
    this.save();
  }

  /**
   * Remove a custom parameter definition by key
   * Returns true if definition was removed, false if not found
   */
  removeCustomParamDefinition(key: string): boolean {
    if (!this.settings.customParamDefinitions) {
      return false;
    }

    const initialLength = this.settings.customParamDefinitions.length;
    this.settings.customParamDefinitions = this.settings.customParamDefinitions.filter(
      (d) => d.key !== key,
    );

    if (this.settings.customParamDefinitions.length < initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  // =========================================================================
  // Default Assets Management
  // =========================================================================

  /**
   * Get default assets configuration
   */
  getDefaultAssets(): AssetUrls | undefined {
    return this.settings.defaultAssets ? { ...this.settings.defaultAssets } : undefined;
  }

  /**
   * Set default assets (partial update - only provided fields are updated)
   */
  setDefaultAssets(assets: Partial<AssetUrls>): AssetUrls {
    const existing = this.settings.defaultAssets || {};
    const merged: AssetUrls = {
      ...existing,
      ...assets,
    };

    // Remove undefined/null values
    if (merged.logoUrl === undefined || merged.logoUrl === null) delete merged.logoUrl;
    if (merged.partnerLogoUrl === undefined || merged.partnerLogoUrl === null)
      delete merged.partnerLogoUrl;
    if (merged.footerImageUrl === undefined || merged.footerImageUrl === null)
      delete merged.footerImageUrl;

    // If all fields are empty, remove the whole object
    if (Object.keys(merged).length === 0) {
      delete this.settings.defaultAssets;
    } else {
      this.settings.defaultAssets = merged;
    }

    this.save();
    return this.settings.defaultAssets || {};
  }

  /**
   * Clear a specific default asset
   */
  clearDefaultAsset(key: keyof AssetUrls): void {
    if (this.settings.defaultAssets) {
      delete this.settings.defaultAssets[key];

      // Remove the whole object if empty
      if (Object.keys(this.settings.defaultAssets).length === 0) {
        delete this.settings.defaultAssets;
      }

      this.save();
    }
  }

  /**
   * Clear all default assets
   */
  clearAllDefaultAssets(): void {
    delete this.settings.defaultAssets;
    this.save();
  }

  /**
   * Get effective assets for a client (per-client overrides merged with defaults)
   * Returns merged result: per-client > global default
   */
  getEffectiveAssetsForClient(ip: string): AssetUrls {
    const defaults = this.settings.defaultAssets || {};
    const clientConfig = this.settings.clientConfigs?.[ip];
    const clientAssets = clientConfig?.assets || {};

    // Per-client overrides defaults
    return {
      ...defaults,
      ...clientAssets,
    };
  }

  /**
   * Set per-client asset overrides
   */
  setClientAssets(ip: string, assets: Partial<AssetUrls>): AssetUrls {
    if (!this.settings.clientConfigs) {
      this.settings.clientConfigs = {};
    }

    const existing = this.settings.clientConfigs[ip] || {};
    const existingAssets = existing.assets || {};

    const mergedAssets: AssetUrls = {
      ...existingAssets,
      ...assets,
    };

    // Remove undefined/null values
    if (mergedAssets.logoUrl === undefined || mergedAssets.logoUrl === null)
      delete mergedAssets.logoUrl;
    if (mergedAssets.partnerLogoUrl === undefined || mergedAssets.partnerLogoUrl === null)
      delete mergedAssets.partnerLogoUrl;
    if (mergedAssets.footerImageUrl === undefined || mergedAssets.footerImageUrl === null)
      delete mergedAssets.footerImageUrl;

    // Update client config
    if (Object.keys(mergedAssets).length === 0) {
      delete existing.assets;
    } else {
      existing.assets = mergedAssets;
    }

    this.settings.clientConfigs[ip] = existing;
    this.save();
    return mergedAssets;
  }

  /**
   * Clear all per-client asset overrides for a client
   */
  clearClientAssets(ip: string): void {
    if (this.settings.clientConfigs?.[ip]) {
      delete this.settings.clientConfigs[ip].assets;
      this.save();
    }
  }

  /**
   * Get the settings file path (for debugging/logging)
   */
  getPath(): string {
    return this.settingsPath;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_APP_SETTINGS };
    this.save();
  }
}

// Singleton instance
let instance: AppSettingsManager | null = null;

/**
 * Get the singleton AppSettings instance
 */
export function getAppSettings(): AppSettingsManager {
  if (!instance) {
    instance = new AppSettingsManager();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetAppSettings(): void {
  instance = null;
}
