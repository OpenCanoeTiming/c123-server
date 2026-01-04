/**
 * Configuration types for C123 Server
 */

/**
 * XML source mode for selecting which XML file to use
 * - 'auto-main': Use main event file (CurrentEventFile from C123 config)
 * - 'auto-offline': Use offline copy (AutoCopyFolder + filename) - preferred
 * - 'manual': User-specified path
 */
export type XmlSourceMode = 'auto-main' | 'auto-offline' | 'manual';

/**
 * Parsed Canoe123 user configuration
 */
export interface Canoe123Config {
  /** Path to the current event XML file */
  currentEventFile: string | null;
  /** Path to the auto-copy folder (offline copy) */
  autoCopyFolder: string | null;
  /** Full path to the user.config file */
  configPath: string;
  /** Canoe123 version from folder name */
  version: string | null;
}

/**
 * Available XML paths detected from Canoe123 configuration
 */
export interface AvailableXmlPaths {
  /** Main event file path (CurrentEventFile) */
  main: {
    path: string | null;
    exists: boolean;
  };
  /** Offline copy path (AutoCopyFolder + filename) */
  offline: {
    path: string | null;
    exists: boolean;
  };
}

/**
 * Result of XML path detection
 */
export interface XmlPathDetectionResult {
  /** Detected XML file path (or null if not found) */
  path: string | null;
  /** Source of the path: 'autocopy' (preferred) or 'current' */
  source: 'autocopy' | 'current' | null;
  /** Whether the file exists and is accessible */
  exists: boolean;
  /** Error message if detection failed */
  error?: string;
  /** The Canoe123 config used for detection */
  canoe123Config?: Canoe123Config;
}

/**
 * Persistent application settings
 */
export interface AppSettings {
  /** Server port for HTTP + WebSocket (default: 27123) */
  port?: number;
  /** XML file path (manually configured) */
  xmlPath?: string;
  /** XML source mode: 'auto-main', 'auto-offline', or 'manual' */
  xmlSourceMode: XmlSourceMode;
  /** Enable Canoe123 XML autodetection (deprecated, use xmlSourceMode) */
  xmlAutoDetect: boolean;
  /** Autodetection check interval in ms */
  xmlAutoDetectInterval: number;
  /** Last autodetected path (for change detection) */
  lastAutoDetectedPath?: string;
  /** Timestamp of settings last update */
  lastUpdated?: string;
}

/**
 * Default settings
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  xmlSourceMode: 'auto-offline',
  xmlAutoDetect: true, // deprecated, kept for backwards compatibility
  xmlAutoDetectInterval: 30000, // 30 seconds
};
