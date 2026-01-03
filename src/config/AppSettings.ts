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
import { AppSettings as AppSettingsType, DEFAULT_APP_SETTINGS } from './types.js';

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
   * Set XML path manually (disables autodetect)
   */
  setXmlPath(xmlPath: string): void {
    this.update({
      xmlPath,
      xmlAutoDetect: false,
    });
  }

  /**
   * Enable autodetection
   */
  enableAutoDetect(): void {
    // Clear manual path and enable autodetect
    delete this.settings.xmlPath;
    this.settings.xmlAutoDetect = true;
    this.save();
  }

  /**
   * Disable autodetection
   */
  disableAutoDetect(): void {
    this.update({
      xmlAutoDetect: false,
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
