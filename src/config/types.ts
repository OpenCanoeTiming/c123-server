/**
 * Configuration types for C123 Server
 */

// ============================================================================
// Asset Configuration Types
// ============================================================================

/**
 * Asset URLs for scoreboard branding
 * Values can be:
 * - URL: http(s)://... (fetched from network)
 * - Data URI: data:image/... (embedded base64)
 */
export interface AssetUrls {
  /** Main event logo (max recommended: 200x80px) */
  logoUrl?: string;
  /** Partner/sponsor logo (max recommended: 300x80px) */
  partnerLogoUrl?: string;
  /** Footer banner image (max recommended: 1920x200px) */
  footerImageUrl?: string;
}

// ============================================================================
// Client Configuration Types
// ============================================================================

/**
 * Known scoreboard layout types
 * - 'vertical': Standard vertical layout
 * - 'ledwall': LED wall optimized layout with configurable row count
 */
export type ScoreboardLayoutType = 'vertical' | 'ledwall';

/**
 * Configuration for a client (scoreboard) pushed from server
 *
 * Parameters with undefined value mean "not set, use client default/auto-detection".
 * Only explicitly set parameters are pushed to clients.
 */
export interface ClientConfig {
  // === Known scoreboard parameters (correspond to URL params) ===

  /** Layout mode */
  type?: ScoreboardLayoutType;
  /** Number of display rows (3-20), for ledwall scaling */
  displayRows?: number;
  /** Custom title override */
  customTitle?: string;

  // === Data filtering ===

  /** Filter to specific races (race IDs) */
  raceFilter?: string[];
  /** Show OnCourse data */
  showOnCourse?: boolean;
  /** Show Results data */
  showResults?: boolean;

  // === Custom parameters (key-value for additional/future parameters) ===

  /** Custom parameters defined by admin */
  custom?: Record<string, string | number | boolean>;

  // === Metadata (server-managed) ===

  /** Human-readable label for this client (set by admin) */
  label?: string;
  /** Timestamp of last connection */
  lastSeen?: string;

  // === Identity (server-assigned) ===

  /**
   * Unique client identifier assigned by server.
   * When pushed to client, the client should adopt this ID and use it
   * for future connections (stored in localStorage).
   * This allows server to rename/reassign client identities.
   */
  clientId?: string;

  // === Assets (per-client overrides) ===

  /**
   * Per-client asset overrides.
   * If set, these override the global default assets for this specific client.
   */
  assets?: AssetUrls;
}

/**
 * Supported types for custom parameters
 */
export type CustomParamType = 'string' | 'number' | 'boolean';

/**
 * Definition of a custom parameter that can be set for clients
 */
export interface CustomParamDefinition {
  /** Unique identifier for this parameter */
  key: string;
  /** Display label for the admin UI */
  label: string;
  /** Parameter value type */
  type: CustomParamType;
  /** Default value (optional) */
  defaultValue?: string | number | boolean;
}

// ============================================================================
// XML Configuration Types
// ============================================================================

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
  /** Manual override for event name (if set, used instead of XML MainTitle) */
  eventNameOverride?: string;
  /** Timestamp of settings last update */
  lastUpdated?: string;

  // === Client Configuration ===

  /** Stored configurations for clients, keyed by IP address */
  clientConfigs?: Record<string, ClientConfig>;
  /** Definitions of custom parameters available for clients */
  customParamDefinitions?: CustomParamDefinition[];

  // === Default Assets ===

  /**
   * Default asset URLs for all scoreboards.
   * Individual clients can override these via per-client assets config.
   */
  defaultAssets?: AssetUrls;
}

/**
 * Default settings
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  xmlSourceMode: 'auto-offline',
  xmlAutoDetect: true, // deprecated, kept for backwards compatibility
  xmlAutoDetectInterval: 30000, // 30 seconds
};
