import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer } from 'node:http';
import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { ScoreboardConfig } from '../admin/types.js';
import type { C123Message, C123XmlChange, XmlSection } from '../protocol/types.js';
import { ScoreboardSession } from '../ws/ScoreboardSession.js';
import { Logger } from '../utils/logger.js';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { XmlDataService } from '../service/XmlDataService.js';
import type { Server as C123Server } from '../server.js';
import { getAppSettings, WindowsConfigDetector } from '../config/index.js';

const DEFAULT_PORT = 27123;
const VERSION = '2.0.0';

/**
 * Configuration for UnifiedServer
 */
export interface UnifiedServerConfig {
  /** Port to listen on (default: 27123) */
  port?: number;
}

/**
 * Events emitted by UnifiedServer
 */
export interface UnifiedServerEvents {
  /** WebSocket client connected */
  connection: [clientId: string];
  /** WebSocket client disconnected */
  disconnection: [clientId: string];
  /** Error occurred */
  error: [error: Error];
}

interface RegisteredSource {
  name: string;
  type: 'tcp' | 'udp' | 'xml';
  source: Source;
  host?: string;
  port?: number;
  path?: string;
}

interface SourceStatusInfo {
  name: string;
  type: 'tcp' | 'udp' | 'xml';
  status: string;
  host?: string;
  port?: number;
  path?: string;
}

interface ServerStatusResponse {
  version: string;
  uptime: number;
  sources: SourceStatusInfo[];
  scoreboards: {
    connected: number;
    list: ReturnType<ScoreboardSession['getInfo']>[];
  };
  event: {
    currentRaceId: string | null;
    raceName: string | null;
    onCourseCount: number;
    resultsCount: number;
  };
}

/**
 * Unified HTTP/WebSocket server for C123.
 *
 * Combines all services on a single port:
 * - `/` - Admin dashboard (SPA)
 * - `/ws` - WebSocket for scoreboards (real-time C123 data + XML change notifications)
 * - `/api/*` - REST API (status, config, XML data)
 *
 * This replaces the separate AdminServer, WebSocketServer, and XmlWebSocketServer.
 */
export class UnifiedServer extends EventEmitter<UnifiedServerEvents> {
  private readonly port: number;
  private readonly app: Express;
  private httpServer: HttpServer | null = null;
  private wss: WsServer | null = null;
  private startTime: number = Date.now();

  // WebSocket sessions for scoreboards
  private sessions: Map<string, ScoreboardSession> = new Map();
  private clientIdCounter = 0;

  // Registered components
  private eventState: EventState | null = null;
  private sources: RegisteredSource[] = [];
  private xmlDataService: XmlDataService | null = null;
  private c123Server: C123Server | null = null;

  constructor(config?: UnifiedServerConfig) {
    super();
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
   * Register XmlDataService for XML REST API
   */
  setXmlDataService(service: XmlDataService): void {
    this.xmlDataService = service;
  }

  /**
   * Register main Server for config management
   */
  setServer(server: C123Server): void {
    this.c123Server = server;
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
   * Start the unified server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        resolve();
        return;
      }

      this.startTime = Date.now();

      // Create HTTP server from Express app
      this.httpServer = createServer(this.app);

      // Create WebSocket server attached to HTTP server
      this.wss = new WsServer({ noServer: true });

      // Handle WebSocket upgrade requests
      this.httpServer.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '/', `http://${request.headers.host}`);

        if (url.pathname === '/ws') {
          this.wss!.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      });

      // Handle WebSocket connections
      this.wss.on('connection', (ws) => {
        this.handleWebSocketConnection(ws);
      });

      this.httpServer.on('error', (err) => {
        if (!this.httpServer?.listening) {
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      this.httpServer.listen(this.port, () => {
        Logger.info('Unified', `Server listening on port ${this.getPort()}`);
        resolve();
      });
    });
  }

  /**
   * Stop the unified server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        resolve();
        return;
      }

      // Close all WebSocket connections
      if (this.wss) {
        for (const client of this.wss.clients) {
          client.terminate();
        }

        // Emit disconnection events
        for (const [clientId] of this.sessions) {
          this.emit('disconnection', clientId);
        }
        this.sessions.clear();

        this.wss.close();
        this.wss = null;
      }

      this.httpServer.close(() => {
        this.httpServer = null;
        resolve();
      });
    });
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    if (this.httpServer) {
      const addr = this.httpServer.address();
      if (addr && typeof addr === 'object') {
        return addr.port;
      }
    }
    return this.port;
  }

  /**
   * Get number of connected WebSocket clients
   */
  getClientCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session by client ID
   */
  getSession(clientId: string): ScoreboardSession | undefined {
    return this.sessions.get(clientId);
  }

  /**
   * Get all sessions
   */
  getSessions(): ScoreboardSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Update configuration for a specific scoreboard
   */
  setSessionConfig(clientId: string, config: Partial<ScoreboardConfig>): boolean {
    const session = this.sessions.get(clientId);
    if (!session) {
      return false;
    }
    session.setConfig(config);
    return true;
  }

  /**
   * Broadcast a C123 message to all connected clients
   */
  broadcast(message: C123Message): void {
    for (const [clientId, session] of this.sessions) {
      if (session.isConnected()) {
        session.send(message);
      } else {
        // Clean up dead connections
        this.sessions.delete(clientId);
        this.emit('disconnection', clientId);
      }
    }
  }

  /**
   * Broadcast an XML change notification to all connected clients
   */
  broadcastXmlChange(sections: XmlSection[], checksum: string): void {
    const message: C123XmlChange = {
      type: 'XmlChange',
      timestamp: new Date().toISOString(),
      data: {
        sections,
        checksum,
      },
    };

    const json = JSON.stringify(message);

    for (const [clientId, session] of this.sessions) {
      if (session.isConnected()) {
        session.sendRaw(json);
      } else {
        // Clean up dead connections
        this.sessions.delete(clientId);
        this.emit('disconnection', clientId);
      }
    }

    Logger.debug('Unified', `Broadcast XML change: ${sections.join(', ')} to ${this.sessions.size} clients`);
  }

  /**
   * Handle WebSocket connection
   */
  private handleWebSocketConnection(ws: WebSocket): void {
    const clientId = `client-${++this.clientIdCounter}`;
    const session = new ScoreboardSession(clientId, ws);
    this.sessions.set(clientId, session);
    Logger.info('Unified', `WebSocket client connected: ${clientId}`);
    this.emit('connection', clientId);

    ws.on('close', () => {
      this.sessions.delete(clientId);
      Logger.info('Unified', `WebSocket client disconnected: ${clientId}`);
      this.emit('disconnection', clientId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.sessions.delete(clientId);
      this.emit('disconnection', clientId);
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    this.app.use(express.json());

    // CORS headers
    this.app.use((_req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    // Discovery endpoint (for autodiscovery by scoreboards)
    this.app.get('/api/discover', this.handleDiscover.bind(this));

    // API routes
    this.app.get('/api/status', this.handleStatus.bind(this));
    this.app.get('/api/sources', this.handleSources.bind(this));
    this.app.get('/api/scoreboards', this.handleScoreboards.bind(this));
    this.app.post('/api/scoreboards/:id/config', this.handleScoreboardConfig.bind(this));

    // XML REST API routes
    this.app.get('/api/xml/status', this.handleXmlStatus.bind(this));
    this.app.get('/api/xml/schedule', this.handleXmlSchedule.bind(this));
    this.app.get('/api/xml/participants', this.handleXmlParticipants.bind(this));
    this.app.get('/api/xml/races', this.handleXmlRaces.bind(this));
    this.app.get('/api/xml/races/:id', this.handleXmlRaceDetail.bind(this));
    this.app.get('/api/xml/races/:id/startlist', this.handleXmlRaceStartlist.bind(this));
    this.app.get('/api/xml/races/:id/results', this.handleXmlRaceResults.bind(this));
    this.app.get('/api/xml/races/:id/results/:run', this.handleXmlRaceResultsByRun.bind(this));

    // Config API routes
    this.app.get('/api/config', this.handleGetConfig.bind(this));
    this.app.get('/api/config/xml', this.handleGetXmlConfig.bind(this));
    this.app.post('/api/config/xml', this.handleSetXmlConfig.bind(this));
    this.app.post('/api/config/xml/autodetect', this.handleToggleAutodetect.bind(this));
    this.app.get('/api/config/xml/detect', this.handleDetectXml.bind(this));

    // Event API routes
    this.app.get('/api/event', this.handleGetEvent.bind(this));
    this.app.post('/api/event', this.handleSetEvent.bind(this));

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Dashboard UI
    this.app.get('/', (_req: Request, res: Response) => {
      res.send(this.getDashboardHtml());
    });
  }

  /**
   * GET /api/discover - Discovery endpoint for autodiscovery
   * Returns minimal info for quick identification by scoreboards.
   * Must respond fast (< 50ms) - no I/O blocking.
   */
  private async handleDiscover(_req: Request, res: Response): Promise<void> {
    // Check for manual override first (synchronous, fast)
    const settings = getAppSettings();
    let eventName: string | null = settings.getEventNameOverride() ?? null;

    // If no override, get from XML if available (cached, so fast)
    if (!eventName && this.xmlDataService) {
      try {
        eventName = await this.xmlDataService.getEventName();
      } catch {
        // Ignore errors - eventName stays null
      }
    }

    res.json({
      service: 'c123-server',
      version: VERSION,
      port: this.getPort(),
      eventName,
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
        connected: this.sessions.size,
        list: Array.from(this.sessions.values()).map((s) => s.getInfo()),
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
      connected: this.sessions.size,
      scoreboards: Array.from(this.sessions.values()).map((s) => s.getInfo()),
    });
  }

  /**
   * POST /api/scoreboards/:id/config - Update scoreboard configuration
   */
  private handleScoreboardConfig(req: Request, res: Response): void {
    const { id } = req.params;
    const config = req.body as Partial<ScoreboardConfig>;

    const session = this.sessions.get(id);
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

    this.setSessionConfig(id, config);
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

  /**
   * GET /api/xml/status - XML data availability and stats
   */
  private async handleXmlStatus(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const status = await this.xmlDataService.getStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/schedule - Race schedule
   */
  private async handleXmlSchedule(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const schedule = await this.xmlDataService.getSchedule();
      res.json({ schedule });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/participants - All participants
   */
  private async handleXmlParticipants(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const participants = await this.xmlDataService.getParticipants();
      res.json({ participants });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races - List of all races
   */
  private async handleXmlRaces(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const races = await this.xmlDataService.getRaces();
      res.json({ races });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id - Race detail
   */
  private async handleXmlRaceDetail(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const race = await this.xmlDataService.getRaceDetail(id);

      if (!race) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      res.json({ race });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/startlist - Race startlist
   */
  private async handleXmlRaceStartlist(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const startlist = await this.xmlDataService.getStartlist(id);

      if (!startlist) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      res.json({ startlist });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/results - Race results (with optional ?merged=true)
   */
  private async handleXmlRaceResults(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id } = req.params;
      const merged = req.query.merged === 'true';

      if (merged) {
        const race = await this.xmlDataService.getRaceDetail(id);
        if (!race) {
          res.status(404).json({ error: 'Race not found' });
          return;
        }

        const results = await this.xmlDataService.getMergedResults(race.classId);
        res.json({ results, merged: true, classId: race.classId });
        return;
      }

      const results = await this.xmlDataService.getResultsWithParticipants(id);

      if (!results) {
        res.status(404).json({ error: 'Race not found or no results' });
        return;
      }

      res.json({ results });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/xml/races/:id/results/:run - Race results for specific run (BR1 or BR2)
   */
  private async handleXmlRaceResultsByRun(req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const { id, run } = req.params;
      const runUpper = run.toUpperCase();

      if (runUpper !== 'BR1' && runUpper !== 'BR2') {
        res.status(400).json({ error: 'Invalid run parameter. Use BR1 or BR2.' });
        return;
      }

      const race = await this.xmlDataService.getRaceDetail(id);
      if (!race) {
        res.status(404).json({ error: 'Race not found' });
        return;
      }

      const races = await this.xmlDataService.getRaces();
      const targetRace = races.find((r) => r.classId === race.classId && r.disId === runUpper);

      if (!targetRace) {
        res.status(404).json({ error: `No ${runUpper} race found for this class` });
        return;
      }

      const results = await this.xmlDataService.getResultsWithParticipants(targetRace.raceId);

      if (!results) {
        res.status(404).json({ error: 'No results available for this run' });
        return;
      }

      res.json({ results, run: runUpper, raceId: targetRace.raceId });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/config - Get all configuration
   */
  private handleGetConfig(_req: Request, res: Response): void {
    const settings = getAppSettings().get();
    const xmlInfo = this.c123Server?.getXmlPathInfo() ?? {
      path: null,
      source: null,
      autoDetectEnabled: settings.xmlAutoDetect,
    };

    res.json({
      settings,
      xml: xmlInfo,
      isWindows: WindowsConfigDetector.isWindows(),
      settingsPath: getAppSettings().getPath(),
    });
  }

  /**
   * GET /api/config/xml - Get XML configuration
   */
  private handleGetXmlConfig(_req: Request, res: Response): void {
    const settings = getAppSettings().get();
    const xmlInfo = this.c123Server?.getXmlPathInfo() ?? {
      path: null,
      source: null,
      autoDetectEnabled: settings.xmlAutoDetect,
      mode: settings.xmlSourceMode ?? 'auto-offline',
    };
    const availablePaths = this.c123Server?.getAvailableXmlPaths() ?? {
      main: { path: null, exists: false },
      offline: { path: null, exists: false },
    };

    res.json({
      path: xmlInfo.path,
      source: xmlInfo.source,
      autoDetectEnabled: xmlInfo.autoDetectEnabled,
      mode: xmlInfo.mode,
      availablePaths: {
        main: availablePaths.main,
        offline: availablePaths.offline,
      },
      isWindows: WindowsConfigDetector.isWindows(),
    });
  }

  /**
   * POST /api/config/xml - Set XML path manually or change mode
   *
   * Body options:
   * - { path: string } - Set manual path (sets mode to 'manual')
   * - { mode: 'auto-main' | 'auto-offline' | 'manual' } - Switch mode
   * - { mode: 'manual', path: string } - Switch to manual with path
   */
  private handleSetXmlConfig(req: Request, res: Response): void {
    const { path, mode } = req.body;

    if (!this.c123Server) {
      res.status(503).json({ error: 'Server not available' });
      return;
    }

    // Validate mode if provided
    const validModes = ['auto-main', 'auto-offline', 'manual'];
    if (mode !== undefined && !validModes.includes(mode)) {
      res.status(400).json({
        error: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
      });
      return;
    }

    try {
      // If mode is specified, handle mode change
      if (mode !== undefined) {
        if (mode === 'manual') {
          // Manual mode requires a path
          if (!path || typeof path !== 'string') {
            res.status(400).json({ error: 'path is required for manual mode' });
            return;
          }
          this.c123Server.setXmlPath(path);
        } else {
          // Auto mode
          if (!WindowsConfigDetector.isWindows()) {
            res.status(400).json({ error: 'Auto modes are only available on Windows' });
            return;
          }
          this.c123Server.setXmlSourceMode(mode);
        }
      } else if (path) {
        // Legacy: just setting path (implies manual mode)
        if (typeof path !== 'string') {
          res.status(400).json({ error: 'path must be a string' });
          return;
        }
        this.c123Server.setXmlPath(path);
      } else {
        res.status(400).json({ error: 'Either path or mode is required' });
        return;
      }

      const xmlInfo = this.c123Server.getXmlPathInfo();
      const availablePaths = this.c123Server.getAvailableXmlPaths();

      res.json({
        success: true,
        path: xmlInfo.path,
        source: xmlInfo.source,
        autoDetectEnabled: xmlInfo.autoDetectEnabled,
        mode: xmlInfo.mode,
        availablePaths: {
          main: availablePaths.main,
          offline: availablePaths.offline,
        },
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/config/xml/autodetect - Toggle autodetection
   * Note: This is a legacy endpoint. Prefer using POST /api/config/xml with mode parameter.
   */
  private handleToggleAutodetect(req: Request, res: Response): void {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }

    if (!this.c123Server) {
      res.status(503).json({ error: 'Server not available' });
      return;
    }

    if (!WindowsConfigDetector.isWindows() && enabled) {
      res.status(400).json({ error: 'Autodetection is only available on Windows' });
      return;
    }

    try {
      if (enabled) {
        this.c123Server.enableXmlAutoDetect();
      } else {
        this.c123Server.disableXmlAutoDetect();
      }

      const xmlInfo = this.c123Server.getXmlPathInfo();
      res.json({
        success: true,
        autoDetectEnabled: xmlInfo.autoDetectEnabled,
        mode: xmlInfo.mode,
        path: xmlInfo.path,
        source: xmlInfo.source,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/config/xml/detect - Manually trigger detection (for testing)
   */
  private handleDetectXml(_req: Request, res: Response): void {
    if (!WindowsConfigDetector.isWindows()) {
      res.status(400).json({
        error: 'Autodetection is only available on Windows',
        isWindows: false,
      });
      return;
    }

    try {
      const detector = new WindowsConfigDetector();
      const result = detector.detect();

      res.json({
        detected: result,
        isWindows: true,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/event - Get event name
   * Returns event name (from override or XML MainTitle) and its source.
   */
  private async handleGetEvent(_req: Request, res: Response): Promise<void> {
    const settings = getAppSettings();
    const override = settings.getEventNameOverride();

    // If override is set, return it
    if (override) {
      res.json({
        name: override,
        source: 'manual',
      });
      return;
    }

    // Otherwise try to get from XML
    if (this.xmlDataService) {
      try {
        const xmlName = await this.xmlDataService.getEventName();
        res.json({
          name: xmlName,
          source: xmlName ? 'xml' : null,
        });
        return;
      } catch {
        // Ignore errors
      }
    }

    res.json({
      name: null,
      source: null,
    });
  }

  /**
   * POST /api/event - Set event name override
   * Body: { name: string } to set, { name: null } or {} to clear
   */
  private handleSetEvent(req: Request, res: Response): void {
    const { name } = req.body;

    const settings = getAppSettings();

    if (name === null || name === undefined || name === '') {
      settings.clearEventNameOverride();
      res.json({
        success: true,
        name: null,
        source: null,
        message: 'Event name override cleared, will use XML MainTitle if available',
      });
    } else if (typeof name !== 'string') {
      res.status(400).json({ error: 'name must be a string or null' });
    } else {
      settings.setEventNameOverride(name);
      res.json({
        success: true,
        name,
        source: 'manual',
      });
    }
  }

  /**
   * Generate inline dashboard HTML
   */
  private getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C123 Server - Admin Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { color: #00d4ff; margin-bottom: 20px; }
    h2 { color: #ccc; font-size: 1.1em; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }
    .card { background: #16213e; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
    .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    .status.connected { background: #00ff88; }
    .status.disconnected { background: #ff4444; }
    .status.connecting { background: #ffaa00; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat { text-align: center; }
    .stat-value { font-size: 2em; color: #00d4ff; font-weight: bold; }
    .stat-label { color: #888; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #333; }
    th { color: #888; font-weight: normal; }
    .config-form { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .config-form label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
    .config-form input[type="checkbox"] { width: 16px; height: 16px; }
    .btn { background: #00d4ff; color: #1a1a2e; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #00b8e6; }
    .error { color: #ff6b6b; }
    #lastUpdate { color: #666; font-size: 0.85em; margin-top: 20px; }
    .port-info { color: #00d4ff; font-size: 0.9em; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>C123 Server Dashboard <span class="port-info">:${this.port}</span></h1>

  <div class="grid">
    <div class="card stat">
      <div class="stat-value" id="uptime">-</div>
      <div class="stat-label">Uptime</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="scoreboardCount">0</div>
      <div class="stat-label">Scoreboards</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="onCourseCount">0</div>
      <div class="stat-label">On Course</div>
    </div>
    <div class="card stat">
      <div class="stat-value" id="resultsCount">0</div>
      <div class="stat-label">Results</div>
    </div>
  </div>

  <h2>Event</h2>
  <div class="card">
    <div style="margin-bottom: 10px;">
      <strong>Current race:</strong> <span id="currentRace">-</span>
    </div>
    <div style="margin-bottom: 10px;">
      <strong>Event name:</strong> <span id="eventName">-</span>
      <span id="eventSource" style="margin-left: 10px; color: #888;"></span>
    </div>
    <div class="config-form">
      <input type="text" id="eventNameInput" placeholder="Event name override" style="flex: 1; min-width: 200px; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
      <button class="btn" onclick="setEventName()">Set</button>
      <button class="btn" onclick="clearEventName()" style="background: #666;">Clear</button>
    </div>
    <div id="eventError" class="error" style="margin-top: 10px; display: none;"></div>
  </div>

  <h2>Sources</h2>
  <div class="card">
    <table id="sourcesTable">
      <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Details</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <h2>XML Configuration</h2>
  <div class="card" id="xmlConfigCard">
    <div style="margin-bottom: 10px;">
      <strong>Current path:</strong> <span id="xmlPath">-</span>
      <span id="xmlSource" style="margin-left: 10px; color: #888;"></span>
    </div>

    <!-- Mode selector (Windows only) -->
    <div id="modeSelector" style="display: none; margin-bottom: 15px;">
      <strong style="display: block; margin-bottom: 8px;">Source mode:</strong>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
          <input type="radio" name="xmlMode" value="auto-offline" style="margin-top: 3px;">
          <div>
            <div>Auto - offline copy (recommended)</div>
            <div id="offlinePath" style="font-size: 0.85em; color: #888;"></div>
          </div>
        </label>
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
          <input type="radio" name="xmlMode" value="auto-main" style="margin-top: 3px;">
          <div>
            <div>Auto - main event file</div>
            <div id="mainPath" style="font-size: 0.85em; color: #888;"></div>
          </div>
        </label>
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
          <input type="radio" name="xmlMode" value="manual" style="margin-top: 3px;">
          <div>Manual path</div>
        </label>
      </div>
    </div>

    <!-- Manual path input -->
    <div id="manualPathSection" class="config-form">
      <input type="text" id="xmlPathInput" placeholder="XML file path" style="flex: 1; min-width: 200px; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
      <button class="btn" onclick="setXmlPath()">Set Path</button>
    </div>
    <div id="xmlConfigError" class="error" style="margin-top: 10px; display: none;"></div>
  </div>

  <h2>Connected Scoreboards</h2>
  <div class="card">
    <table id="scoreboardsTable">
      <thead><tr><th>ID</th><th>Connected</th><th>Last Activity</th><th>Config</th></tr></thead>
      <tbody></tbody>
    </table>
    <div id="noScoreboards" style="color: #666; padding: 10px;">No scoreboards connected</div>
  </div>

  <div id="lastUpdate"></div>

  <script>
    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return h + 'h ' + m + 'm';
      if (m > 0) return m + 'm ' + s + 's';
      return s + 's';
    }

    function formatTime(iso) {
      if (!iso) return '-';
      const d = new Date(iso);
      return d.toLocaleTimeString();
    }

    function statusClass(status) {
      if (status === 'connected') return 'connected';
      if (status === 'connecting') return 'connecting';
      return 'disconnected';
    }

    async function refresh() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();

        document.getElementById('uptime').textContent = formatUptime(data.uptime);
        document.getElementById('scoreboardCount').textContent = data.scoreboards.connected;
        document.getElementById('onCourseCount').textContent = data.event.onCourseCount;
        document.getElementById('resultsCount').textContent = data.event.resultsCount;

        // Current race display
        const currentRace = data.event.raceName
          ? data.event.raceName + ' (ID: ' + (data.event.currentRaceId || '-') + ')'
          : 'No active race';
        document.getElementById('currentRace').textContent = currentRace;

        // Sources
        const sourcesBody = document.querySelector('#sourcesTable tbody');
        sourcesBody.innerHTML = data.sources.map(s =>
          '<tr>' +
          '<td>' + s.name + '</td>' +
          '<td>' + s.type.toUpperCase() + '</td>' +
          '<td><span class="status ' + statusClass(s.status) + '"></span>' + s.status + '</td>' +
          '<td>' + (s.host ? s.host + ':' + s.port : (s.path || '-')) + '</td>' +
          '</tr>'
        ).join('');

        // Scoreboards
        const scoreboardsBody = document.querySelector('#scoreboardsTable tbody');
        const noScoreboards = document.getElementById('noScoreboards');
        if (data.scoreboards.list.length === 0) {
          scoreboardsBody.innerHTML = '';
          noScoreboards.style.display = 'block';
        } else {
          noScoreboards.style.display = 'none';
          scoreboardsBody.innerHTML = data.scoreboards.list.map(s =>
            '<tr>' +
            '<td>' + s.id.substring(0, 8) + '</td>' +
            '<td>' + formatTime(s.connectedAt) + '</td>' +
            '<td>' + formatTime(s.lastActivity) + '</td>' +
            '<td>' + formatConfig(s.config) + '</td>' +
            '</tr>'
          ).join('');
        }

        document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
      } catch (e) {
        document.getElementById('lastUpdate').innerHTML = '<span class="error">Error: ' + e.message + '</span>';
      }
    }

    function formatConfig(cfg) {
      if (!cfg) return '-';
      const parts = [];
      if (cfg.showOnCourse === false) parts.push('oncourse: off');
      if (cfg.showResults === false) parts.push('results: off');
      if (cfg.raceFilter && cfg.raceFilter.length) parts.push('filter: ' + cfg.raceFilter.join(', '));
      return parts.length ? parts.join('; ') : 'default';
    }

    // XML Config functions
    let currentMode = 'manual';

    async function loadXmlConfig() {
      try {
        const res = await fetch('/api/config/xml');
        const data = await res.json();

        document.getElementById('xmlPath').textContent = data.path || '(not set)';
        document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';

        if (data.isWindows) {
          document.getElementById('modeSelector').style.display = 'block';

          // Update available paths display
          const mainPathEl = document.getElementById('mainPath');
          const offlinePathEl = document.getElementById('offlinePath');

          if (data.availablePaths) {
            const mainPath = data.availablePaths.main;
            const offlinePath = data.availablePaths.offline;

            mainPathEl.textContent = mainPath.path
              ? (mainPath.exists ? mainPath.path : mainPath.path + ' (not found)')
              : '(not configured)';
            mainPathEl.style.color = mainPath.exists ? '#00ff88' : '#ff6b6b';

            offlinePathEl.textContent = offlinePath.path
              ? (offlinePath.exists ? offlinePath.path : offlinePath.path + ' (not found)')
              : '(not configured)';
            offlinePathEl.style.color = offlinePath.exists ? '#00ff88' : '#ff6b6b';
          }

          // Select current mode radio
          currentMode = data.mode || 'manual';
          const modeRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
          if (modeRadio) modeRadio.checked = true;

          // Show/hide manual path input based on mode
          updateManualPathVisibility(currentMode);
        }

        if (data.path) {
          document.getElementById('xmlPathInput').value = data.path;
        }

        document.getElementById('xmlConfigError').style.display = 'none';
      } catch (e) {
        showXmlError('Failed to load config: ' + e.message);
      }
    }

    function updateManualPathVisibility(mode) {
      const manualSection = document.getElementById('manualPathSection');
      if (mode === 'manual') {
        manualSection.style.display = 'flex';
      } else {
        manualSection.style.display = 'none';
      }
    }

    async function setXmlPath() {
      const path = document.getElementById('xmlPathInput').value.trim();
      if (!path) {
        showXmlError('Please enter a path');
        return;
      }

      try {
        const res = await fetch('/api/config/xml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'manual', path })
        });
        const data = await res.json();

        if (data.error) {
          showXmlError(data.error);
          return;
        }

        document.getElementById('xmlPath').textContent = data.path || '(not set)';
        document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';
        document.getElementById('xmlConfigError').style.display = 'none';
        loadXmlConfig(); // Reload to update all fields
      } catch (e) {
        showXmlError('Failed to set path: ' + e.message);
      }
    }

    // Mode radio change handler
    document.querySelectorAll('input[name="xmlMode"]').forEach(function(radio) {
      radio.addEventListener('change', async function() {
        const newMode = this.value;

        if (newMode === 'manual') {
          updateManualPathVisibility('manual');
          return; // Wait for user to enter path and click Set Path
        }

        try {
          const res = await fetch('/api/config/xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: newMode })
          });
          const data = await res.json();

          if (data.error) {
            showXmlError(data.error);
            // Revert to previous mode
            const prevRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
            if (prevRadio) prevRadio.checked = true;
            return;
          }

          currentMode = newMode;
          document.getElementById('xmlPath').textContent = data.path || '(not set)';
          document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';
          document.getElementById('xmlConfigError').style.display = 'none';
          updateManualPathVisibility(newMode);
        } catch (e) {
          showXmlError('Failed to change mode: ' + e.message);
          // Revert to previous mode
          const prevRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
          if (prevRadio) prevRadio.checked = true;
        }
      });
    });

    function showXmlError(msg) {
      const el = document.getElementById('xmlConfigError');
      el.textContent = msg;
      el.style.display = 'block';
    }

    // Event name functions
    async function loadEventName() {
      try {
        const res = await fetch('/api/event');
        const data = await res.json();

        document.getElementById('eventName').textContent = data.name || '(not set)';
        document.getElementById('eventSource').textContent = data.source ? '(' + data.source + ')' : '';

        if (data.source === 'manual') {
          document.getElementById('eventNameInput').value = data.name || '';
        } else {
          document.getElementById('eventNameInput').value = '';
          document.getElementById('eventNameInput').placeholder = data.name ? 'Override: ' + data.name : 'Event name override';
        }

        document.getElementById('eventError').style.display = 'none';
      } catch (e) {
        showEventError('Failed to load event name: ' + e.message);
      }
    }

    async function setEventName() {
      const name = document.getElementById('eventNameInput').value.trim();
      if (!name) {
        showEventError('Please enter an event name');
        return;
      }

      try {
        const res = await fetch('/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (data.error) {
          showEventError(data.error);
          return;
        }

        document.getElementById('eventName').textContent = data.name || '(not set)';
        document.getElementById('eventSource').textContent = data.source ? '(' + data.source + ')' : '';
        document.getElementById('eventError').style.display = 'none';
      } catch (e) {
        showEventError('Failed to set event name: ' + e.message);
      }
    }

    async function clearEventName() {
      try {
        const res = await fetch('/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: null })
        });
        const data = await res.json();

        if (data.error) {
          showEventError(data.error);
          return;
        }

        loadEventName(); // Reload to get XML name if available
      } catch (e) {
        showEventError('Failed to clear event name: ' + e.message);
      }
    }

    function showEventError(msg) {
      const el = document.getElementById('eventError');
      el.textContent = msg;
      el.style.display = 'block';
    }

    refresh();
    loadXmlConfig();
    loadEventName();
    setInterval(refresh, 2000);
    setInterval(loadXmlConfig, 5000);
    setInterval(loadEventName, 5000);
  </script>
</body>
</html>`;
  }
}
