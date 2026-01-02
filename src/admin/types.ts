import type { SourceStatus } from '../sources/types.js';

/**
 * Status information for a data source
 */
export interface SourceStatusInfo {
  name: string;
  type: 'tcp' | 'udp' | 'xml';
  status: SourceStatus;
  host?: string;
  port?: number;
  path?: string;
  lastUpdate?: string;
}

/**
 * Connected scoreboard information
 */
export interface ScoreboardInfo {
  id: string;
  connectedAt: string;
  lastActivity?: string;
  config?: ScoreboardConfig;
}

/**
 * Per-scoreboard configuration
 */
export interface ScoreboardConfig {
  raceFilter?: string[];
  showOnCourse?: boolean;
  showResults?: boolean;
}

/**
 * Server status response
 */
export interface ServerStatusResponse {
  version: string;
  uptime: number;
  sources: SourceStatusInfo[];
  scoreboards: {
    connected: number;
    list: ScoreboardInfo[];
  };
  event: {
    currentRaceId: string | null;
    raceName: string | null;
    onCourseCount: number;
    resultsCount: number;
  };
}

/**
 * AdminServer configuration
 */
export interface AdminServerConfig {
  port: number;
}
