import express, { Express, Request, Response } from 'express';
import { Server } from 'node:http';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { WebSocketServer } from '../output/WebSocketServer.js';
import type {
  AdminServerConfig,
  ServerStatusResponse,
  SourceStatusInfo,
  ScoreboardInfo,
} from './types.js';

const DEFAULT_PORT = 8084;
const VERSION = '0.1.0';

interface RegisteredSource {
  name: string;
  type: 'tcp' | 'udp' | 'xml';
  source: Source;
  host?: string;
  port?: number;
  path?: string;
}

/**
 * Admin HTTP server for monitoring and configuration.
 *
 * Provides REST API endpoints:
 * - GET /api/status - Overall server status
 * - GET /api/sources - Data source status
 * - GET /api/scoreboards - Connected scoreboards
 */
export class AdminServer {
  private readonly port: number;
  private readonly app: Express;
  private server: Server | null = null;
  private startTime: number = Date.now();

  private eventState: EventState | null = null;
  private sources: RegisteredSource[] = [];
  private scoreboards: Map<string, ScoreboardInfo> = new Map();

  constructor(config?: Partial<AdminServerConfig>) {
    this.port = config?.port ?? DEFAULT_PORT;
    this.app = express();
    this.setupRoutes();
  }

  /**
   * Register EventState for status reporting
   */
  setEventState(state: EventState): void {
    this.eventState = state;
  }

  /**
   * Register WebSocketServer for scoreboard tracking
   */
  setWebSocketServer(ws: WebSocketServer): void {
    ws.on('connection', (clientId) => {
      this.scoreboards.set(clientId, {
        id: clientId,
        connectedAt: new Date().toISOString(),
      });
    });

    ws.on('disconnection', (clientId) => {
      this.scoreboards.delete(clientId);
    });
  }

  /**
   * Register a data source for status reporting
   */
  registerSource(
    name: string,
    type: 'tcp' | 'udp' | 'xml',
    source: Source,
    meta?: { host?: string; port?: number; path?: string }
  ): void {
    this.sources.push({
      name,
      type,
      source,
      ...meta,
    });
  }

  /**
   * Start the admin server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.startTime = Date.now();

      this.server = this.app.listen(this.port, () => {
        resolve();
      });

      this.server.on('error', (err) => {
        if (!this.server) {
          reject(err);
        }
      });
    });
  }

  /**
   * Stop the admin server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    this.app.use(express.json());

    // CORS headers for dashboard
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    // API routes
    this.app.get('/api/status', this.handleStatus.bind(this));
    this.app.get('/api/sources', this.handleSources.bind(this));
    this.app.get('/api/scoreboards', this.handleScoreboards.bind(this));

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });
  }

  /**
   * GET /api/status - Overall server status
   */
  private handleStatus(_req: Request, res: Response): void {
    const state = this.eventState?.state;

    const response: ServerStatusResponse = {
      version: VERSION,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      sources: this.getSourcesStatus(),
      scoreboards: {
        connected: this.scoreboards.size,
        list: Array.from(this.scoreboards.values()),
      },
      event: {
        currentRaceId: state?.currentRaceId ?? null,
        raceName: state?.results?.mainTitle ?? null,
        onCourseCount: state?.onCourse.length ?? 0,
        resultsCount: state?.results?.rows.length ?? 0,
      },
    };

    res.json(response);
  }

  /**
   * GET /api/sources - Data source status
   */
  private handleSources(_req: Request, res: Response): void {
    res.json({ sources: this.getSourcesStatus() });
  }

  /**
   * GET /api/scoreboards - Connected scoreboards
   */
  private handleScoreboards(_req: Request, res: Response): void {
    res.json({
      connected: this.scoreboards.size,
      scoreboards: Array.from(this.scoreboards.values()),
    });
  }

  /**
   * Get status of all registered sources
   */
  private getSourcesStatus(): SourceStatusInfo[] {
    return this.sources.map((s) => {
      const info: SourceStatusInfo = {
        name: s.name,
        type: s.type,
        status: s.source.status,
      };
      if (s.host !== undefined) info.host = s.host;
      if (s.port !== undefined) info.port = s.port;
      if (s.path !== undefined) info.path = s.path;
      return info;
    });
  }
}
