import express, { Express, Request, Response } from 'express';
import { Server } from 'node:http';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { WebSocketServer } from '../output/WebSocketServer.js';
import type {
  AdminServerConfig,
  ServerStatusResponse,
  SourceStatusInfo,
  ScoreboardConfig,
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
  private wsServer: WebSocketServer | null = null;

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
    this.wsServer = ws;
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
    this.app.post('/api/scoreboards/:id/config', this.handleScoreboardConfig.bind(this));

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
    const sessions = this.wsServer?.getSessions() ?? [];

    const response: ServerStatusResponse = {
      version: VERSION,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      sources: this.getSourcesStatus(),
      scoreboards: {
        connected: sessions.length,
        list: sessions.map((s) => s.getInfo()),
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
    const sessions = this.wsServer?.getSessions() ?? [];
    res.json({
      connected: sessions.length,
      scoreboards: sessions.map((s) => s.getInfo()),
    });
  }

  /**
   * POST /api/scoreboards/:id/config - Update scoreboard configuration
   */
  private handleScoreboardConfig(req: Request, res: Response): void {
    const { id } = req.params;
    const config = req.body as Partial<ScoreboardConfig>;

    if (!this.wsServer) {
      res.status(503).json({ error: 'WebSocket server not available' });
      return;
    }

    const session = this.wsServer.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Scoreboard not found' });
      return;
    }

    // Validate config
    if (config.raceFilter !== undefined && !Array.isArray(config.raceFilter)) {
      res.status(400).json({ error: 'raceFilter must be an array' });
      return;
    }
    if (config.showOnCourse !== undefined && typeof config.showOnCourse !== 'boolean') {
      res.status(400).json({ error: 'showOnCourse must be a boolean' });
      return;
    }
    if (config.showResults !== undefined && typeof config.showResults !== 'boolean') {
      res.status(400).json({ error: 'showResults must be a boolean' });
      return;
    }

    this.wsServer.setSessionConfig(id, config);
    res.json({ success: true, config: session.getConfig() });
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
