/**
 * WindowsConfigDetector - Detects Canoe123 XML configuration on Windows
 *
 * Canoe123 stores its configuration in:
 * %LOCALAPPDATA%\SIWIDATA\Canoe123.exe_Url_<guid>\<version>\user.config
 *
 * The configuration contains:
 * - CurrentEventFile: path to the live XML file
 * - AutoCopyFolder: path to offline copy folder (preferred)
 *
 * We prefer AutoCopyFolder + filename because it's the offline copy
 * that doesn't get locked by Canoe123.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { AvailableXmlPaths, Canoe123Config, XmlPathDetectionResult, XmlSourceMode } from './types.js';

export interface WindowsConfigDetectorEvents {
  detected: (result: XmlPathDetectionResult) => void;
  changed: (result: XmlPathDetectionResult) => void;
  error: (error: Error) => void;
}

export class WindowsConfigDetector extends EventEmitter {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastDetectedPath: string | null = null;

  constructor() {
    super();
  }

  /**
   * Get the SIWIDATA folder path
   */
  private getSiwidataPath(): string | null {
    if (process.platform !== 'win32') {
      return null;
    }

    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      return null;
    }

    return path.join(localAppData, 'SIWIDATA');
  }

  /**
   * Find the most recent Canoe123 configuration folder
   */
  private findLatestCanoe123Folder(): string | null {
    const siwidataPath = this.getSiwidataPath();
    if (!siwidataPath || !fs.existsSync(siwidataPath)) {
      return null;
    }

    try {
      const entries = fs.readdirSync(siwidataPath, { withFileTypes: true });
      const canoe123Folders = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('Canoe123.exe_Url_'))
        .map((e) => ({
          name: e.name,
          path: path.join(siwidataPath, e.name),
        }));

      if (canoe123Folders.length === 0) {
        return null;
      }

      // Find the folder with the most recent user.config
      let latestFolder: { path: string; mtime: number } | null = null;

      for (const folder of canoe123Folders) {
        const versionFolders = this.findVersionFolders(folder.path);
        for (const versionPath of versionFolders) {
          const configPath = path.join(versionPath, 'user.config');
          if (fs.existsSync(configPath)) {
            const stats = fs.statSync(configPath);
            if (!latestFolder || stats.mtimeMs > latestFolder.mtime) {
              latestFolder = { path: versionPath, mtime: stats.mtimeMs };
            }
          }
        }
      }

      return latestFolder?.path ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Find version subfolders (e.g., 2.25.3.30510)
   */
  private findVersionFolders(canoe123Path: string): string[] {
    try {
      const entries = fs.readdirSync(canoe123Path, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory() && /^\d+\.\d+/.test(e.name))
        .map((e) => path.join(canoe123Path, e.name));
    } catch {
      return [];
    }
  }

  /**
   * Parse user.config XML file
   */
  parseUserConfig(configPath: string): Canoe123Config {
    const result: Canoe123Config = {
      currentEventFile: null,
      autoCopyFolder: null,
      configPath,
      version: null,
    };

    // Extract version from path
    const versionMatch = configPath.match(/[\\/](\d+\.\d+\.\d+\.\d+)[\\/]/);
    if (versionMatch) {
      result.version = versionMatch[1];
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');

      // Parse CurrentEventFile
      const currentEventMatch = content.match(
        /<setting\s+name="CurrentEventFile"[^>]*>[\s\S]*?<value>([^<]*)<\/value>/
      );
      if (currentEventMatch) {
        result.currentEventFile = currentEventMatch[1].trim() || null;
      }

      // Parse AutoCopyFolder
      const autoCopyMatch = content.match(
        /<setting\s+name="AutoCopyFolder"[^>]*>[\s\S]*?<value>([^<]*)<\/value>/
      );
      if (autoCopyMatch) {
        result.autoCopyFolder = autoCopyMatch[1].trim() || null;
      }
    } catch {
      // Ignore parse errors, return partial result
    }

    return result;
  }

  /**
   * Detect XML path from Canoe123 configuration
   *
   * Priority:
   * 1. AutoCopyFolder + filename from CurrentEventFile (offline copy)
   * 2. CurrentEventFile directly (live file)
   */
  detect(): XmlPathDetectionResult {
    // Check if we're on Windows
    if (process.platform !== 'win32') {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'Autodetection is only available on Windows',
      };
    }

    // Find latest Canoe123 config folder
    const configFolder = this.findLatestCanoe123Folder();
    if (!configFolder) {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'Canoe123 configuration not found in AppData',
      };
    }

    const configPath = path.join(configFolder, 'user.config');
    if (!fs.existsSync(configPath)) {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'user.config file not found',
      };
    }

    // Parse the config
    const canoe123Config = this.parseUserConfig(configPath);

    if (!canoe123Config.currentEventFile) {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'CurrentEventFile not set in Canoe123 configuration',
        canoe123Config,
      };
    }

    // Try AutoCopyFolder first (preferred - offline copy)
    if (canoe123Config.autoCopyFolder) {
      const filename = path.basename(canoe123Config.currentEventFile);
      const offlinePath = path.join(canoe123Config.autoCopyFolder, filename);

      if (fs.existsSync(offlinePath)) {
        return {
          path: offlinePath,
          source: 'autocopy',
          exists: true,
          canoe123Config,
        };
      }
    }

    // Fallback to CurrentEventFile
    const exists = fs.existsSync(canoe123Config.currentEventFile);
    const result: XmlPathDetectionResult = {
      path: canoe123Config.currentEventFile,
      source: 'current',
      exists,
      canoe123Config,
    };
    if (!exists) {
      result.error = 'CurrentEventFile does not exist';
    }
    return result;
  }

  /**
   * Start periodic checking for configuration changes
   */
  startMonitoring(intervalMs: number = 30000): void {
    this.stopMonitoring();

    // Initial detection
    const initialResult = this.detect();
    this.lastDetectedPath = initialResult.path;
    this.emit('detected', initialResult);

    // Periodic check
    this.checkInterval = setInterval(() => {
      try {
        const result = this.detect();

        if (result.path !== this.lastDetectedPath) {
          this.lastDetectedPath = result.path;
          this.emit('changed', result);
        }
      } catch (error) {
        this.emit('error', error as Error);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get available XML paths from Canoe123 configuration
   * Returns both main and offline paths with existence info.
   */
  getAvailablePaths(): AvailableXmlPaths & { canoe123Config?: Canoe123Config; error?: string } {
    const result: AvailableXmlPaths & { canoe123Config?: Canoe123Config; error?: string } = {
      main: { path: null, exists: false },
      offline: { path: null, exists: false },
    };

    // Check if we're on Windows
    if (process.platform !== 'win32') {
      result.error = 'Autodetection is only available on Windows';
      return result;
    }

    // Find latest Canoe123 config folder
    const configFolder = this.findLatestCanoe123Folder();
    if (!configFolder) {
      result.error = 'Canoe123 configuration not found in AppData';
      return result;
    }

    const configPath = path.join(configFolder, 'user.config');
    if (!fs.existsSync(configPath)) {
      result.error = 'user.config file not found';
      return result;
    }

    // Parse the config
    const canoe123Config = this.parseUserConfig(configPath);
    result.canoe123Config = canoe123Config;

    if (!canoe123Config.currentEventFile) {
      result.error = 'CurrentEventFile not set in Canoe123 configuration';
      return result;
    }

    // Main path (CurrentEventFile)
    result.main.path = canoe123Config.currentEventFile;
    result.main.exists = fs.existsSync(canoe123Config.currentEventFile);

    // Offline path (AutoCopyFolder + filename)
    if (canoe123Config.autoCopyFolder && canoe123Config.currentEventFile) {
      const filename = path.basename(canoe123Config.currentEventFile);
      const offlinePath = path.join(canoe123Config.autoCopyFolder, filename);
      result.offline.path = offlinePath;
      result.offline.exists = fs.existsSync(offlinePath);
    }

    return result;
  }

  /**
   * Detect XML path based on specified mode
   */
  detectByMode(mode: XmlSourceMode): XmlPathDetectionResult {
    if (mode === 'manual') {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'Manual mode - no autodetection',
      };
    }

    // Check if we're on Windows
    if (process.platform !== 'win32') {
      return {
        path: null,
        source: null,
        exists: false,
        error: 'Autodetection is only available on Windows',
      };
    }

    const available = this.getAvailablePaths();

    if (available.error && !available.main.path && !available.offline.path) {
      const result: XmlPathDetectionResult = {
        path: null,
        source: null,
        exists: false,
        error: available.error,
      };
      if (available.canoe123Config) {
        result.canoe123Config = available.canoe123Config;
      }
      return result;
    }

    if (mode === 'auto-main') {
      const result: XmlPathDetectionResult = {
        path: available.main.path,
        source: 'current',
        exists: available.main.exists,
      };
      if (!available.main.exists) {
        result.error = 'Main event file does not exist';
      }
      if (available.canoe123Config) {
        result.canoe123Config = available.canoe123Config;
      }
      return result;
    }

    if (mode === 'auto-offline') {
      // Prefer offline, fallback to main if offline not available
      if (available.offline.path && available.offline.exists) {
        const result: XmlPathDetectionResult = {
          path: available.offline.path,
          source: 'autocopy',
          exists: true,
        };
        if (available.canoe123Config) {
          result.canoe123Config = available.canoe123Config;
        }
        return result;
      }

      // Fallback to main if offline doesn't exist
      if (available.main.path && available.main.exists) {
        const result: XmlPathDetectionResult = {
          path: available.main.path,
          source: 'current',
          exists: true,
        };
        if (available.canoe123Config) {
          result.canoe123Config = available.canoe123Config;
        }
        return result;
      }

      const result: XmlPathDetectionResult = {
        path: available.offline.path || available.main.path,
        source: available.offline.path ? 'autocopy' : 'current',
        exists: false,
        error: 'Neither offline nor main event file exists',
      };
      if (available.canoe123Config) {
        result.canoe123Config = available.canoe123Config;
      }
      return result;
    }

    return {
      path: null,
      source: null,
      exists: false,
      error: `Unknown mode: ${mode}`,
    };
  }

  /**
   * Check if running on Windows
   */
  static isWindows(): boolean {
    return process.platform === 'win32';
  }
}
