/**
 * Configuration types for C123 Server
 */

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
  /** XML file path (manually configured) */
  xmlPath?: string;
  /** Enable Canoe123 XML autodetection */
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
  xmlAutoDetect: true,
  xmlAutoDetectInterval: 30000, // 30 seconds
};
