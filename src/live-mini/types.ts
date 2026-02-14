/**
 * Live-Mini Integration Types
 *
 * Types for pushing timing data to c123-live-mini-server.
 */

// ============================================================================
// Event Status Types (from live-mini shared)
// ============================================================================

/**
 * Event lifecycle status
 */
export type EventStatus = 'draft' | 'startlist' | 'running' | 'finished' | 'official';

/**
 * Canoe discipline types
 */
export type Discipline = 'Slalom' | 'Sprint' | 'WildWater';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create event request (POST /api/v1/admin/events)
 */
export interface CreateEventRequest {
  eventId: string;
  mainTitle: string;
  subTitle?: string;
  location?: string;
  facility?: string;
  startDate?: string;
  endDate?: string;
  discipline?: Discipline;
}

/**
 * Create event response
 */
export interface CreateEventResponse {
  id: number;
  eventId: string;
  apiKey: string;
  validity?: {
    validFrom?: string;
    validUntil?: string;
  };
}

/**
 * OnCourse input data (POST /api/v1/ingest/oncourse)
 */
export interface OnCourseInput {
  participantId: string;
  raceId: string;
  bib: number;
  name: string;
  club: string;
  position: number;
  gates: (number | null)[];
  dtStart: string | null;
  dtFinish: string | null;
  time: number | null;
  pen: number;
  total?: number | null;
  rank?: number | null;
  ttbDiff?: string | null;
  ttbName?: string | null;
}

/**
 * OnCourse push request body
 */
export interface PushOnCourseRequest {
  oncourse: OnCourseInput[];
}

/**
 * OnCourse push response
 */
export interface PushOnCourseResponse {
  active: number;
  ignored?: boolean;
}

/**
 * Result input data (POST /api/v1/ingest/results)
 */
export interface ResultInput {
  participantId: string;
  raceId: string;
  bib: number;
  rnk: number | null;
  time: number | null;
  pen: number;
  total: number | null;
  status: string | null;
  catId?: string | null;
  catRnk?: number | null;
  totalBehind?: number | null;
  catTotalBehind?: number | null;
}

/**
 * Results push request body
 */
export interface PushResultsRequest {
  results: ResultInput[];
}

/**
 * Results push response
 */
export interface PushResultsResponse {
  updated: number;
  ignored?: boolean;
}

/**
 * XML push request body (POST /api/v1/ingest/xml)
 */
export interface PushXmlRequest {
  xml: string;
}

/**
 * XML push response
 */
export interface PushXmlResponse {
  imported: {
    classes: number;
    categories: number;
    races: number;
    participants: number;
  };
}

/**
 * Event status transition request (PATCH /api/v1/admin/events/:eventId/status)
 */
export interface TransitionStatusRequest {
  status: EventStatus;
}

/**
 * Event status transition response
 */
export interface TransitionStatusResponse {
  eventId: string;
  previousStatus: EventStatus;
  status: EventStatus;
  statusChangedAt: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  currentStatus?: EventStatus;
  requestedStatus?: EventStatus;
  validTransitions?: EventStatus[];
}

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * Live-Mini connection configuration
 */
export interface LiveMiniConfig {
  /** Enable live-mini push */
  enabled: boolean;
  /** Live-mini server URL (e.g., "https://live.example.com") */
  serverUrl: string | null;
  /** API key for authentication */
  apiKey: string | null;
  /** Event ID created on live-mini */
  eventId: string | null;
  /** Current event status on live-mini */
  eventStatus: EventStatus | null;
  /** Push XML exports */
  pushXml: boolean;
  /** Push OnCourse data */
  pushOnCourse: boolean;
  /** Push Results data */
  pushResults: boolean;
}

/**
 * Default live-mini configuration
 */
export const DEFAULT_LIVE_MINI_CONFIG: LiveMiniConfig = {
  enabled: false,
  serverUrl: null,
  apiKey: null,
  eventId: null,
  eventStatus: null,
  pushXml: true,
  pushOnCourse: true,
  pushResults: true,
};

// ============================================================================
// Pusher Status
// ============================================================================

/**
 * Pusher connection state
 */
export type PusherState =
  | 'not_configured' // No config set
  | 'connected' // Connected and pushing
  | 'paused' // Connected but push disabled
  | 'error' // Connection/push error
  | 'disconnected'; // Explicitly disconnected

/**
 * Push channel status
 */
export interface ChannelStatus {
  /** Channel name: 'xml' | 'oncourse' | 'results' */
  channel: 'xml' | 'oncourse' | 'results';
  /** Whether push is enabled */
  enabled: boolean;
  /** Last successful push timestamp */
  lastPushAt: string | null;
  /** Last push error */
  lastError: string | null;
  /** Total pushes */
  totalPushes: number;
  /** Total errors */
  totalErrors: number;
}

/**
 * Live-Mini pusher status
 */
export interface LiveMiniStatus {
  /** Current pusher state */
  state: PusherState;
  /** Server URL */
  serverUrl: string | null;
  /** Event ID */
  eventId: string | null;
  /** Event status on live-mini */
  eventStatus: EventStatus | null;
  /** Per-channel push status */
  channels: {
    xml: ChannelStatus;
    oncourse: ChannelStatus;
    results: ChannelStatus;
  };
  /** Circuit breaker status */
  circuitBreaker: {
    /** Circuit open (failures exceeded threshold) */
    isOpen: boolean;
    /** Consecutive failures count */
    consecutiveFailures: number;
    /** Time when circuit opens (null if closed) */
    openedAt: string | null;
  };
  /** Last global error */
  lastError: string | null;
  /** Connected timestamp */
  connectedAt: string | null;
}
