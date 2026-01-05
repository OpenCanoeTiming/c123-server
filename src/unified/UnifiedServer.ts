import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { ScoreboardConfig } from '../admin/types.js';
import type { C123Message, C123XmlChange, C123ForceRefresh, C123LogEntry, XmlSection, LogLevel, C123ClientState } from '../protocol/types.js';
import { getLogBuffer, type LogEntry, type LogFilterOptions } from '../utils/LogBuffer.js';
import { ScoreboardSession } from '../ws/ScoreboardSession.js';
import { Logger } from '../utils/logger.js';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { XmlDataService } from '../service/XmlDataService.js';
import type { Server as C123Server } from '../server.js';
import { getAppSettings, WindowsConfigDetector } from '../config/index.js';
import type { ClientConfig } from '../config/types.js';

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

  // Admin dashboard WebSocket connections (for log streaming only)
  private adminConnections: Set<WebSocket> = new Set();

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

      // Set up log broadcast callback
      Logger.setBroadcastCallback((entry) => {
        this.broadcastLogEntry(entry);
      });

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

      // Handle WebSocket connections (with request for IP extraction and admin/clientId detection)
      this.wss.on('connection', (ws, request) => {
        const url = new URL(request.url || '/', `http://${request.headers.host}`);
        const isAdmin = url.searchParams.get('admin') === '1';
        const clientId = url.searchParams.get('clientId') || undefined;
        this.handleWebSocketConnection(ws, request, isAdmin, clientId);
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

      // Clear log broadcast callback
      Logger.setBroadcastCallback(null);

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
   * Get sessions by config key (clientId or IP)
   * Returns all sessions with the same configKey
   */
  getSessionsByConfigKey(configKey: string): ScoreboardSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.getConfigKey() === configKey,
    );
  }

  /**
   * @deprecated Use getSessionsByConfigKey instead
   */
  getSessionsByIp(ipAddress: string): ScoreboardSession[] {
    return this.getSessionsByConfigKey(ipAddress);
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
   * Push configuration to a client by config key (clientId or IP)
   * Updates server config and sends ConfigPush to all connected sessions with that configKey
   * Returns number of sessions that received the push
   */
  pushConfigToConfigKey(configKey: string): number {
    const sessions = this.getSessionsByConfigKey(configKey);
    const settings = getAppSettings();
    const config = settings.getClientConfig(configKey);

    if (!config) {
      return 0;
    }

    let count = 0;
    for (const session of sessions) {
      if (session.isConnected()) {
        session.setServerConfig(config);
        session.sendConfigPush();
        count++;
      }
    }

    Logger.debug('Unified', `Pushed config to ${count} session(s) for configKey ${configKey}`);
    return count;
  }

  /**
   * @deprecated Use pushConfigToConfigKey instead
   */
  pushConfigToIp(ipAddress: string): number {
    return this.pushConfigToConfigKey(ipAddress);
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
   * Broadcast a force refresh command to all connected clients
   * This tells clients to reload their data and UI
   */
  broadcastForceRefresh(reason?: string): number {
    const message: C123ForceRefresh = {
      type: 'ForceRefresh',
      timestamp: new Date().toISOString(),
      data: reason !== undefined ? { reason } : {},
    };

    const json = JSON.stringify(message);
    let sentCount = 0;

    for (const [clientId, session] of this.sessions) {
      if (session.isConnected()) {
        session.sendRaw(json);
        sentCount++;
      } else {
        // Clean up dead connections
        this.sessions.delete(clientId);
        this.emit('disconnection', clientId);
      }
    }

    Logger.info('Unified', `Broadcast ForceRefresh to ${sentCount} clients${reason ? `: ${reason}` : ''}`);
    return sentCount;
  }

  /**
   * Broadcast a log entry to all connected clients
   * Used for real-time log viewing in admin dashboard
   */
  broadcastLogEntry(entry: LogEntry): void {
    const message: C123LogEntry = {
      type: 'LogEntry',
      timestamp: entry.timestamp,
      data: {
        level: entry.level,
        component: entry.component,
        message: entry.message,
        data: entry.data,
      },
    };

    const json = JSON.stringify(message);

    // Send only to admin dashboard connections (not to scoreboards)
    for (const ws of this.adminConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(json);
      } else {
        // Clean up dead connections
        this.adminConnections.delete(ws);
      }
    }
  }

  /**
   * Handle WebSocket connection
   *
   * @param ws - WebSocket instance
   * @param request - HTTP request (for IP extraction)
   * @param isAdmin - True if this is an admin dashboard connection (for log streaming only)
   * @param explicitClientId - Explicit clientId from URL query param (if provided)
   */
  private handleWebSocketConnection(
    ws: WebSocket,
    request?: IncomingMessage,
    isAdmin = false,
    explicitClientId?: string,
  ): void {
    // Admin connections are for log streaming only - don't create ScoreboardSession
    if (isAdmin) {
      this.adminConnections.add(ws);
      Logger.debug('Unified', 'Admin dashboard connected for log streaming');

      ws.on('close', () => {
        this.adminConnections.delete(ws);
        Logger.debug('Unified', 'Admin dashboard disconnected');
      });

      ws.on('error', () => {
        this.adminConnections.delete(ws);
      });
      return;
    }

    const sessionId = `client-${++this.clientIdCounter}`;

    // Extract client IP from request
    const ipAddress = this.extractClientIp(request);

    // Config key is explicit clientId if provided, otherwise IP
    const configKey = explicitClientId || ipAddress;

    // Load stored config for this client (by configKey)
    const settings = getAppSettings();
    const storedConfig = settings.getClientConfig(configKey);

    // Create session with IP, stored config, and explicit clientId
    const session = new ScoreboardSession(
      sessionId,
      ws,
      ipAddress,
      undefined,
      storedConfig,
      explicitClientId,
    );
    this.sessions.set(sessionId, session);

    const clientIdInfo = explicitClientId ? `clientId=${explicitClientId}` : `IP=${ipAddress}`;
    Logger.info('Unified', `WebSocket client connected: ${sessionId} (${clientIdInfo})`);
    this.emit('connection', sessionId);

    // Send ConfigPush if there's stored config for this client
    if (storedConfig) {
      session.sendConfigPush();
      Logger.debug('Unified', `Sent ConfigPush to ${sessionId}`, storedConfig);
    }

    // Update lastSeen timestamp for this configKey
    settings.updateClientLastSeen(configKey);

    // Handle incoming messages
    ws.on('message', (data) => {
      this.handleWebSocketMessage(session, data);
    });

    ws.on('close', () => {
      this.sessions.delete(sessionId);
      Logger.info('Unified', `WebSocket client disconnected: ${sessionId}`);
      this.emit('disconnection', sessionId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.sessions.delete(sessionId);
      this.emit('disconnection', sessionId);
    });
  }

  /**
   * Extract client IP address from WebSocket request
   */
  private extractClientIp(request?: IncomingMessage): string {
    if (!request) {
      return 'unknown';
    }

    // Check X-Forwarded-For header (for proxies)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      const firstIp = ips.split(',')[0].trim();
      if (firstIp) {
        return firstIp;
      }
    }

    // Check X-Real-IP header (for nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Use socket remote address
    const socketAddress = request.socket?.remoteAddress;
    if (socketAddress) {
      // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
      if (socketAddress.startsWith('::ffff:')) {
        return socketAddress.substring(7);
      }
      return socketAddress;
    }

    return 'unknown';
  }

  /**
   * Handle incoming WebSocket message from client
   */
  private handleWebSocketMessage(session: ScoreboardSession, data: unknown): void {
    try {
      const messageStr = data instanceof Buffer ? data.toString('utf-8') : String(data);
      const message = JSON.parse(messageStr);

      // Handle ClientState message
      if (message.type === 'ClientState' && message.data) {
        const clientStateMsg = message as C123ClientState;
        session.setClientState({
          current: clientStateMsg.data.current || {},
          version: clientStateMsg.data.version,
          capabilities: clientStateMsg.data.capabilities,
        });
        Logger.debug('Unified', `Received ClientState from ${session.id}`, clientStateMsg.data);
      }
    } catch {
      // Ignore parse errors - client may send invalid messages
      Logger.debug('Unified', `Invalid message from ${session.id}`);
    }
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
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    // Handle OPTIONS preflight requests
    this.app.options('*', (_req: Request, res: Response) => {
      res.sendStatus(204);
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

    // Broadcast API routes
    this.app.post('/api/broadcast/refresh', this.handleBroadcastRefresh.bind(this));

    // Logs API route
    this.app.get('/api/logs', this.handleGetLogs.bind(this));

    // Client management API routes
    this.app.get('/api/clients', this.handleGetClients.bind(this));
    this.app.put('/api/clients/:ip/config', this.handleSetClientConfig.bind(this));
    this.app.put('/api/clients/:ip/label', this.handleSetClientLabel.bind(this));
    this.app.delete('/api/clients/:ip', this.handleDeleteClient.bind(this));
    this.app.post('/api/clients/:ip/refresh', this.handleRefreshClient.bind(this));

    // Custom parameters API routes
    this.app.get('/api/config/custom-params', this.handleGetCustomParams.bind(this));
    this.app.put('/api/config/custom-params', this.handleSetCustomParams.bind(this));

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
   * POST /api/broadcast/refresh - Force refresh all connected clients
   * Body: { reason?: string } - optional reason for the refresh
   */
  private handleBroadcastRefresh(req: Request, res: Response): void {
    const { reason } = req.body;

    if (reason !== undefined && typeof reason !== 'string') {
      res.status(400).json({ error: 'reason must be a string' });
      return;
    }

    const clientCount = this.broadcastForceRefresh(reason);

    res.json({
      success: true,
      clientsNotified: clientCount,
      reason: reason || null,
    });
  }

  /**
   * GET /api/logs - Get log entries from buffer
   *
   * Query parameters:
   * - limit: Maximum number of entries to return (default: 100, max: 500)
   * - offset: Number of entries to skip (for pagination)
   * - level: Filter by log level (debug, info, warn, error) - minimum level
   * - levels: Comma-separated list of specific levels to include
   * - search: Search text (case-insensitive, matches component or message)
   * - order: 'asc' (oldest first) or 'desc' (newest first, default)
   */
  private handleGetLogs(req: Request, res: Response): void {
    const buffer = getLogBuffer();

    // Parse query parameters
    const limitParam = parseInt(req.query.limit as string, 10);
    const offsetParam = parseInt(req.query.offset as string, 10);
    const limit = isNaN(limitParam) ? 100 : Math.min(Math.max(1, limitParam), 500);
    const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

    const options: LogFilterOptions = {
      limit,
      offset,
    };

    // Level filter (minimum level)
    const minLevel = req.query.level as string;
    if (minLevel && ['debug', 'info', 'warn', 'error'].includes(minLevel)) {
      options.minLevel = minLevel as LogLevel;
    }

    // Specific levels filter
    const levelsParam = req.query.levels as string;
    if (levelsParam) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      const requestedLevels = levelsParam.split(',').filter((l) => validLevels.includes(l.trim()));
      if (requestedLevels.length > 0) {
        options.levels = requestedLevels as LogLevel[];
      }
    }

    // Search filter
    const search = req.query.search as string;
    if (search && search.trim()) {
      options.search = search.trim();
    }

    // Get entries
    const order = req.query.order as string;
    const entries = order === 'asc' ? buffer.getEntries(options) : buffer.getEntriesReversed(options);

    res.json({
      entries,
      total: buffer.getCount(),
      limit,
      offset,
      bufferSize: buffer.getMaxSize(),
    });
  }

  // ==========================================================================
  // Client Management API Handlers
  // ==========================================================================

  /**
   * Response type for GET /api/clients
   */
  private buildClientInfo(
    configKey: string,
    storedConfig: ClientConfig | undefined,
    onlineSessions: ScoreboardSession[],
  ): object {
    const isOnline = onlineSessions.length > 0;
    const firstSession = onlineSessions[0];
    // Check if this is an explicit clientId (not IP-based)
    const hasExplicitId = firstSession?.hasExplicitId ?? this.looksLikeClientId(configKey);

    return {
      // Keep 'ip' for backwards compatibility, but it's actually configKey
      ip: configKey,
      // New fields for clientId support
      configKey,
      hasExplicitId,
      label: storedConfig?.label ?? null,
      online: isOnline,
      sessionId: firstSession?.id ?? null,
      sessionCount: onlineSessions.length,
      // Show actual IP if available
      ipAddress: firstSession?.ipAddress ?? null,
      serverConfig: storedConfig
        ? {
            type: storedConfig.type,
            displayRows: storedConfig.displayRows,
            customTitle: storedConfig.customTitle,
            raceFilter: storedConfig.raceFilter,
            showOnCourse: storedConfig.showOnCourse,
            showResults: storedConfig.showResults,
            custom: storedConfig.custom,
          }
        : null,
      clientState: firstSession?.getClientState() ?? null,
      lastSeen: storedConfig?.lastSeen ?? null,
    };
  }

  /**
   * Heuristic to detect if a string looks like a clientId (not an IP)
   */
  private looksLikeClientId(key: string): boolean {
    // IPv4: contains dots and numbers only
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(key)) return false;
    // IPv6: contains colons
    if (key.includes(':')) return false;
    // Anything else is probably a clientId
    return true;
  }

  /**
   * GET /api/clients - List all clients (online + known offline)
   *
   * Returns combined list of:
   * - Currently connected clients (from sessions, identified by configKey)
   * - Previously connected clients with stored config
   */
  private handleGetClients(_req: Request, res: Response): void {
    const settings = getAppSettings();
    const storedConfigs = settings.getAllClientConfigs();

    // Collect all known configKeys (from sessions + stored configs)
    const knownConfigKeys = new Set<string>();

    // Add configKeys from active sessions
    for (const session of this.sessions.values()) {
      knownConfigKeys.add(session.getConfigKey());
    }

    // Add configKeys from stored configs
    for (const key of Object.keys(storedConfigs)) {
      knownConfigKeys.add(key);
    }

    // Build client list
    const clients = Array.from(knownConfigKeys)
      .map((configKey) => {
        const storedConfig = storedConfigs[configKey];
        const onlineSessions = this.getSessionsByConfigKey(configKey).filter((s) => s.isConnected());
        return this.buildClientInfo(configKey, storedConfig, onlineSessions);
      })
      // Sort: online first, then by IP
      .sort((a, b) => {
        const aOnline = (a as { online: boolean }).online;
        const bOnline = (b as { online: boolean }).online;
        if (aOnline !== bOnline) return bOnline ? 1 : -1;
        return ((a as { ip: string }).ip).localeCompare((b as { ip: string }).ip);
      });

    res.json({ clients });
  }

  /**
   * PUT /api/clients/:ip/config - Set client configuration
   *
   * Body: Partial<ClientConfig> - only provided fields are updated
   * Automatically pushes changes to online clients.
   */
  private handleSetClientConfig(req: Request, res: Response): void {
    const ip = req.params.ip;
    const config = req.body as Partial<ClientConfig>;

    // Validate IP parameter
    if (!ip || ip === 'undefined') {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    // Validate config fields if provided
    if (config.type !== undefined && config.type !== 'vertical' && config.type !== 'ledwall') {
      res.status(400).json({ error: 'type must be "vertical" or "ledwall"' });
      return;
    }

    if (config.displayRows !== undefined) {
      const rows = Number(config.displayRows);
      if (isNaN(rows) || rows < 3 || rows > 20) {
        res.status(400).json({ error: 'displayRows must be a number between 3 and 20' });
        return;
      }
      config.displayRows = rows;
    }

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

    // Remove metadata fields from config (server-managed)
    const { label: _label, lastSeen: _lastSeen, ...configToSave } = config;

    // Save configuration
    const settings = getAppSettings();
    const savedConfig = settings.setClientConfig(ip, configToSave);

    // Push to online clients
    const pushedCount = this.pushConfigToIp(ip);

    Logger.info('Unified', `Updated config for client ${ip}, pushed to ${pushedCount} session(s)`);

    res.json({
      success: true,
      ip,
      config: savedConfig,
      pushedToSessions: pushedCount,
    });
  }

  /**
   * PUT /api/clients/:ip/label - Set client label
   *
   * Body: { label: string }
   */
  private handleSetClientLabel(req: Request, res: Response): void {
    const ip = req.params.ip;
    const { label } = req.body;

    // Validate IP parameter
    if (!ip || ip === 'undefined') {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    // Validate label
    if (typeof label !== 'string') {
      res.status(400).json({ error: 'label must be a string' });
      return;
    }

    const trimmedLabel = label.trim();
    if (trimmedLabel.length === 0) {
      res.status(400).json({ error: 'label cannot be empty' });
      return;
    }

    // Save label
    const settings = getAppSettings();
    settings.setClientLabel(ip, trimmedLabel);

    Logger.info('Unified', `Set label for client ${ip}: "${trimmedLabel}"`);

    res.json({
      success: true,
      ip,
      label: trimmedLabel,
    });
  }

  /**
   * DELETE /api/clients/:ip - Delete stored client configuration
   *
   * Note: This only removes stored config, it doesn't disconnect the client.
   */
  private handleDeleteClient(req: Request, res: Response): void {
    const ip = req.params.ip;

    // Validate IP parameter
    if (!ip || ip === 'undefined') {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    const settings = getAppSettings();
    const deleted = settings.deleteClientConfig(ip);

    if (!deleted) {
      res.status(404).json({ error: 'Client configuration not found' });
      return;
    }

    Logger.info('Unified', `Deleted config for client ${ip}`);

    res.json({
      success: true,
      ip,
      message: 'Client configuration deleted',
    });
  }

  /**
   * POST /api/clients/:ip/refresh - Force refresh a specific client
   *
   * Body: { reason?: string }
   */
  private handleRefreshClient(req: Request, res: Response): void {
    const ip = req.params.ip;
    const { reason } = req.body;

    // Validate IP parameter
    if (!ip || ip === 'undefined') {
      res.status(400).json({ error: 'IP address is required' });
      return;
    }

    // Validate reason if provided
    if (reason !== undefined && typeof reason !== 'string') {
      res.status(400).json({ error: 'reason must be a string' });
      return;
    }

    // Find sessions for this IP
    const sessions = this.getSessionsByIp(ip).filter((s) => s.isConnected());

    if (sessions.length === 0) {
      res.status(404).json({ error: 'No online sessions found for this IP' });
      return;
    }

    // Send ForceRefresh to all sessions with this IP
    const message: C123ForceRefresh = {
      type: 'ForceRefresh',
      timestamp: new Date().toISOString(),
      data: reason !== undefined ? { reason } : {},
    };

    const json = JSON.stringify(message);
    for (const session of sessions) {
      session.sendRaw(json);
    }

    Logger.info('Unified', `Sent ForceRefresh to ${sessions.length} session(s) for IP ${ip}`);

    res.json({
      success: true,
      ip,
      sessionsRefreshed: sessions.length,
      reason: reason || null,
    });
  }

  /**
   * GET /api/config/custom-params - Get custom parameter definitions
   */
  private handleGetCustomParams(_req: Request, res: Response): void {
    const settings = getAppSettings();
    const definitions = settings.getCustomParamDefinitions();

    res.json({ definitions });
  }

  /**
   * PUT /api/config/custom-params - Set custom parameter definitions
   *
   * Body: { definitions: CustomParamDefinition[] }
   */
  private handleSetCustomParams(req: Request, res: Response): void {
    const { definitions } = req.body;

    // Validate definitions
    if (!Array.isArray(definitions)) {
      res.status(400).json({ error: 'definitions must be an array' });
      return;
    }

    // Validate each definition
    for (const def of definitions) {
      if (typeof def.key !== 'string' || def.key.trim().length === 0) {
        res.status(400).json({ error: 'Each definition must have a non-empty key' });
        return;
      }

      if (typeof def.label !== 'string' || def.label.trim().length === 0) {
        res.status(400).json({ error: 'Each definition must have a non-empty label' });
        return;
      }

      if (!['string', 'number', 'boolean'].includes(def.type)) {
        res.status(400).json({
          error: `Invalid type "${def.type}" for key "${def.key}". Must be string, number, or boolean`,
        });
        return;
      }

      // Validate defaultValue type if provided
      if (def.defaultValue !== undefined) {
        const expectedType = def.type;
        const actualType = typeof def.defaultValue;
        if (actualType !== expectedType) {
          res.status(400).json({
            error: `Default value for "${def.key}" has wrong type. Expected ${expectedType}, got ${actualType}`,
          });
          return;
        }
      }
    }

    // Save definitions
    const settings = getAppSettings();
    settings.setCustomParamDefinitions(definitions);

    Logger.info('Unified', `Updated custom param definitions (${definitions.length} definitions)`);

    res.json({
      success: true,
      definitions: settings.getCustomParamDefinitions(),
    });
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

    /* Clients grid */
    .clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .client-card { background: #0f0f23; border-radius: 6px; padding: 12px; border: 1px solid #333; transition: border-color 0.2s; }
    .client-card:hover { border-color: #00d4ff; }
    .client-card.online { border-left: 3px solid #00ff88; }
    .client-card.offline { border-left: 3px solid #666; }
    .client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .client-ip { font-family: monospace; color: #00d4ff; font-size: 0.95em; }
    .client-status { display: flex; align-items: center; gap: 6px; }
    .client-status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .client-status-dot.online { background: #00ff88; }
    .client-status-dot.offline { background: #666; }
    .client-label { color: #eee; font-size: 0.9em; margin-bottom: 8px; cursor: pointer; }
    .client-label:hover { color: #00d4ff; }
    .client-label.empty { color: #666; font-style: italic; }
    .client-params { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; font-size: 0.8em; }
    .client-param { background: #1a1a2e; padding: 2px 6px; border-radius: 3px; color: #888; }
    .client-param-value { color: #eee; }
    .client-actions { display: flex; gap: 6px; }
    .client-btn { background: #333; color: #eee; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 0.8em; }
    .client-btn:hover { background: #444; }
    .client-btn.refresh { background: #ff9800; color: #1a1a2e; }
    .client-btn.refresh:hover { background: #ffa726; }

    /* Modal */
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #16213e; border-radius: 8px; width: 90%; max-width: 400px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #333; }
    .modal-header h3 { margin: 0; color: #00d4ff; font-size: 1.1em; }
    .modal-body { padding: 15px; }
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

  <h2>Connected Scoreboards</h2>
  <div class="card">
    <table id="scoreboardsTable">
      <thead><tr><th>ID</th><th>Connected</th><th>Last Activity</th><th>Config</th></tr></thead>
      <tbody></tbody>
    </table>
    <div id="noScoreboards" style="color: #666; padding: 10px;">No scoreboards connected</div>
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

  <h2>Clients</h2>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <span id="clientsStatus">Loading...</span>
      <button class="btn" onclick="refreshAllClients()" style="background: #ff9800;">Refresh All Clients</button>
    </div>

    <!-- Clients grid -->
    <div id="clientsGrid" class="clients-grid"></div>
    <div id="noClients" style="color: #666; padding: 20px; text-align: center;">No clients connected or configured</div>
    <div id="clientMessage" style="color: #00ff88; margin-top: 10px; display: none;"></div>
  </div>

  <!-- Client detail modal -->
  <div id="clientModal" class="modal" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Client: <span id="modalClientIp"></span></h3>
        <button onclick="closeClientModal()" style="background: none; border: none; color: #888; font-size: 1.5em; cursor: pointer;">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888;">Label</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="modalLabel" placeholder="Client name" style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
            <button class="btn" onclick="saveClientLabel()">Save</button>
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888;">Layout Type</label>
          <select id="modalType" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
            <option value="">(auto)</option>
            <option value="vertical">Vertical</option>
            <option value="ledwall">LED Wall</option>
          </select>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888;">Display Rows (3-20)</label>
          <input type="number" id="modalDisplayRows" min="3" max="20" placeholder="(auto)" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888;">Custom Title</label>
          <input type="text" id="modalCustomTitle" placeholder="(none)" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #888;">Client State (reported)</label>
          <pre id="modalClientState" style="background: #0f0f23; padding: 8px; border-radius: 4px; font-size: 11px; overflow-x: auto; max-height: 100px;">-</pre>
        </div>

        <div style="display: flex; gap: 8px; justify-content: space-between;">
          <button class="btn" onclick="saveClientConfig()" style="flex: 1;">Save Config</button>
          <button class="btn" onclick="deleteClientConfig()" style="background: #ff4444;">Delete</button>
        </div>
      </div>
      <div id="modalError" class="error" style="padding: 10px; display: none;"></div>
    </div>
  </div>

  <h2>Server Logs</h2>
  <div class="card">
    <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; align-items: center;">
      <div style="display: flex; gap: 5px; align-items: center;">
        <label style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
          <input type="checkbox" id="logLevelDebug" onchange="filterLogs()"> <span style="color: #888;">debug</span>
        </label>
        <label style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
          <input type="checkbox" id="logLevelInfo" checked onchange="filterLogs()"> <span style="color: #00ff88;">info</span>
        </label>
        <label style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
          <input type="checkbox" id="logLevelWarn" checked onchange="filterLogs()"> <span style="color: #ffaa00;">warn</span>
        </label>
        <label style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
          <input type="checkbox" id="logLevelError" checked onchange="filterLogs()"> <span style="color: #ff6b6b;">error</span>
        </label>
      </div>
      <input type="text" id="logSearch" placeholder="Search logs..." onkeyup="filterLogs()" style="flex: 1; min-width: 150px; padding: 4px 8px; border-radius: 4px; border: 1px solid #333; background: #0f0f23; color: #eee;">
      <label style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
        <input type="checkbox" id="logAutoScroll" checked> Auto-scroll
      </label>
      <button class="btn" onclick="clearLogDisplay()" style="background: #666; padding: 4px 8px;">Clear</button>
    </div>
    <div id="logContainer" style="max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; background: #0f0f23; border-radius: 4px; padding: 8px;">
      <div id="logEntries"></div>
      <div id="noLogs" style="color: #666; padding: 10px; text-align: center;">No log entries</div>
    </div>
    <div style="margin-top: 5px; color: #666; font-size: 0.8em;">
      <span id="logStats">0 entries</span>
    </div>
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

    // Refresh clients function
    async function refreshClients() {
      try {
        const res = await fetch('/api/broadcast/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Admin triggered refresh' })
        });
        const data = await res.json();

        if (data.error) {
          showRefreshMessage('Error: ' + data.error, true);
          return;
        }

        showRefreshMessage('Refresh signal sent to ' + data.clientsNotified + ' client(s)', false);
      } catch (e) {
        showRefreshMessage('Failed: ' + e.message, true);
      }
    }

    function showRefreshMessage(msg, isError) {
      const el = document.getElementById('refreshMessage');
      el.textContent = msg;
      el.style.color = isError ? '#ff6b6b' : '#00ff88';
      el.style.display = 'block';
      setTimeout(function() { el.style.display = 'none'; }, 3000);
    }

    // Log viewer functions
    let logEntries = [];
    let ws = null;
    const MAX_LOG_ENTRIES = 200;

    const levelColors = {
      debug: '#888',
      info: '#00ff88',
      warn: '#ffaa00',
      error: '#ff6b6b'
    };

    function formatLogTime(iso) {
      if (!iso) return '';
      return iso.slice(11, 23); // HH:mm:ss.SSS
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function renderLogEntry(entry) {
      const time = formatLogTime(entry.timestamp);
      const color = levelColors[entry.level] || '#eee';
      const level = entry.level.toUpperCase().padEnd(5);
      return '<div class="log-entry" data-level="' + entry.level + '" style="margin-bottom: 2px;">' +
        '<span style="color: #666;">' + time + '</span> ' +
        '<span style="color: ' + color + ';">' + level + '</span> ' +
        '<span style="color: #00d4ff;">[' + escapeHtml(entry.component) + ']</span> ' +
        '<span>' + escapeHtml(entry.message) + '</span>' +
        '</div>';
    }

    function renderAllLogs() {
      const container = document.getElementById('logEntries');
      const noLogs = document.getElementById('noLogs');
      const filtered = getFilteredLogs();

      if (filtered.length === 0) {
        container.innerHTML = '';
        noLogs.style.display = 'block';
      } else {
        noLogs.style.display = 'none';
        container.innerHTML = filtered.map(renderLogEntry).join('');
      }

      updateLogStats();

      if (document.getElementById('logAutoScroll').checked) {
        const logContainer = document.getElementById('logContainer');
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }

    function getFilteredLogs() {
      const showDebug = document.getElementById('logLevelDebug').checked;
      const showInfo = document.getElementById('logLevelInfo').checked;
      const showWarn = document.getElementById('logLevelWarn').checked;
      const showError = document.getElementById('logLevelError').checked;
      const search = document.getElementById('logSearch').value.toLowerCase().trim();

      return logEntries.filter(function(entry) {
        // Level filter
        if (entry.level === 'debug' && !showDebug) return false;
        if (entry.level === 'info' && !showInfo) return false;
        if (entry.level === 'warn' && !showWarn) return false;
        if (entry.level === 'error' && !showError) return false;

        // Search filter
        if (search) {
          const matchComponent = entry.component.toLowerCase().includes(search);
          const matchMessage = entry.message.toLowerCase().includes(search);
          if (!matchComponent && !matchMessage) return false;
        }

        return true;
      });
    }

    function filterLogs() {
      renderAllLogs();
    }

    function updateLogStats() {
      const filtered = getFilteredLogs();
      document.getElementById('logStats').textContent =
        filtered.length + ' of ' + logEntries.length + ' entries shown';
    }

    function clearLogDisplay() {
      logEntries = [];
      renderAllLogs();
    }

    function addLogEntry(entry) {
      logEntries.push(entry);
      // Keep buffer limited
      if (logEntries.length > MAX_LOG_ENTRIES) {
        logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
      }
      renderAllLogs();
    }

    async function loadInitialLogs() {
      try {
        const res = await fetch('/api/logs?limit=100&order=asc');
        const data = await res.json();
        logEntries = data.entries || [];
        renderAllLogs();
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }

    function connectLogWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host + '/ws?admin=1');

      ws.onmessage = function(event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'LogEntry') {
            addLogEntry({
              level: msg.data.level,
              component: msg.data.component,
              message: msg.data.message,
              timestamp: msg.timestamp,
              data: msg.data.data
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws.onclose = function() {
        // Reconnect after 3 seconds
        setTimeout(connectLogWebSocket, 3000);
      };

      ws.onerror = function() {
        ws.close();
      };
    }

    // ===========================================
    // Client Management Functions
    // ===========================================
    let clientsData = [];
    let currentModalIp = null;

    async function loadClients() {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        clientsData = data.clients || [];
        renderClients();
      } catch (e) {
        console.error('Failed to load clients:', e);
      }
    }

    function renderClients() {
      const grid = document.getElementById('clientsGrid');
      const noClients = document.getElementById('noClients');
      const status = document.getElementById('clientsStatus');

      const onlineCount = clientsData.filter(c => c.online).length;
      status.textContent = onlineCount + ' online, ' + clientsData.length + ' total';

      if (clientsData.length === 0) {
        grid.innerHTML = '';
        noClients.style.display = 'block';
        return;
      }

      noClients.style.display = 'none';
      grid.innerHTML = clientsData.map(renderClientCard).join('');
    }

    function renderClientCard(client) {
      const statusClass = client.online ? 'online' : 'offline';
      const statusText = client.online ? 'online' : 'offline';
      const label = client.label || '(unnamed)';
      const labelClass = client.label ? '' : 'empty';

      // Build params display
      const params = [];
      if (client.serverConfig) {
        if (client.serverConfig.type) params.push({ key: 'type', value: client.serverConfig.type });
        if (client.serverConfig.displayRows) params.push({ key: 'rows', value: client.serverConfig.displayRows });
        if (client.serverConfig.customTitle) params.push({ key: 'title', value: truncate(client.serverConfig.customTitle, 15) });
      }

      const paramsHtml = params.length > 0
        ? params.map(p => '<span class="client-param">' + p.key + ': <span class="client-param-value">' + escapeHtml(String(p.value)) + '</span></span>').join('')
        : '<span class="client-param">default config</span>';

      // Show configKey (clientId or IP) and actual IP if different
      const configKey = client.configKey || client.ip;
      const idTypeLabel = client.hasExplicitId ? 'ID' : 'IP';
      const ipInfo = client.hasExplicitId && client.ipAddress
        ? '<span style="font-size: 0.8em; color: #666; margin-left: 5px;">(' + escapeHtml(client.ipAddress) + ')</span>'
        : '';

      return '<div class="client-card ' + statusClass + '" data-ip="' + escapeHtml(configKey) + '">' +
        '<div class="client-header">' +
        '<span class="client-ip" title="' + idTypeLabel + ': ' + escapeHtml(configKey) + '">' + escapeHtml(configKey) + '</span>' + ipInfo +
        '<div class="client-status">' +
        '<span class="client-status-dot ' + statusClass + '"></span>' +
        '<span style="font-size: 0.8em; color: #888;">' + statusText + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="client-label ' + labelClass + '" onclick="openClientModal(\\'' + escapeHtml(configKey) + '\\')">' + escapeHtml(label) + '</div>' +
        '<div class="client-params">' + paramsHtml + '</div>' +
        '<div class="client-actions">' +
        '<button class="client-btn" onclick="openClientModal(\\'' + escapeHtml(configKey) + '\\')">Edit</button>' +
        (client.online ? '<button class="client-btn refresh" onclick="refreshClient(\\'' + escapeHtml(configKey) + '\\')">Refresh</button>' : '') +
        '</div>' +
        '</div>';
    }

    function truncate(str, len) {
      if (!str) return '';
      return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function openClientModal(configKey) {
      currentModalIp = configKey;
      const client = clientsData.find(c => (c.configKey || c.ip) === configKey);

      // Show configKey and IP info
      const idInfo = client?.hasExplicitId
        ? configKey + ' (from ' + (client?.ipAddress || 'unknown IP') + ')'
        : configKey;
      document.getElementById('modalClientIp').textContent = idInfo;
      document.getElementById('modalLabel').value = client?.label || '';

      // Config fields
      const cfg = client?.serverConfig || {};
      document.getElementById('modalType').value = cfg.type || '';
      document.getElementById('modalDisplayRows').value = cfg.displayRows || '';
      document.getElementById('modalCustomTitle').value = cfg.customTitle || '';

      // Client state
      const state = client?.clientState;
      document.getElementById('modalClientState').textContent = state ? JSON.stringify(state, null, 2) : '-';

      document.getElementById('modalError').style.display = 'none';
      document.getElementById('clientModal').style.display = 'flex';
    }

    function closeClientModal() {
      document.getElementById('clientModal').style.display = 'none';
      currentModalIp = null;
    }

    async function saveClientLabel() {
      if (!currentModalIp) return;
      const label = document.getElementById('modalLabel').value.trim();

      if (!label) {
        showModalError('Please enter a label');
        return;
      }

      try {
        const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp) + '/label', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label })
        });
        const data = await res.json();

        if (data.error) {
          showModalError(data.error);
          return;
        }

        loadClients();
        showClientMessage('Label saved for ' + currentModalIp);
      } catch (e) {
        showModalError('Failed: ' + e.message);
      }
    }

    async function saveClientConfig() {
      if (!currentModalIp) return;

      const config = {};
      const type = document.getElementById('modalType').value;
      const rows = document.getElementById('modalDisplayRows').value;
      const title = document.getElementById('modalCustomTitle').value.trim();

      if (type) config.type = type;
      if (rows) config.displayRows = parseInt(rows, 10);
      if (title) config.customTitle = title;

      try {
        const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp) + '/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        const data = await res.json();

        if (data.error) {
          showModalError(data.error);
          return;
        }

        loadClients();
        closeClientModal();
        showClientMessage('Config saved and pushed to ' + data.pushedToSessions + ' session(s)');
      } catch (e) {
        showModalError('Failed: ' + e.message);
      }
    }

    async function deleteClientConfig() {
      if (!currentModalIp) return;

      if (!confirm('Delete configuration for ' + currentModalIp + '?')) return;

      try {
        const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp), {
          method: 'DELETE'
        });
        const data = await res.json();

        if (data.error) {
          showModalError(data.error);
          return;
        }

        loadClients();
        closeClientModal();
        showClientMessage('Config deleted for ' + currentModalIp);
      } catch (e) {
        showModalError('Failed: ' + e.message);
      }
    }

    async function refreshClient(ip) {
      try {
        const res = await fetch('/api/clients/' + encodeURIComponent(ip) + '/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Admin triggered refresh' })
        });
        const data = await res.json();

        if (data.error) {
          showClientMessage('Error: ' + data.error, true);
          return;
        }

        showClientMessage('Refresh sent to ' + ip);
      } catch (e) {
        showClientMessage('Failed: ' + e.message, true);
      }
    }

    async function refreshAllClients() {
      try {
        const res = await fetch('/api/broadcast/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Admin triggered refresh' })
        });
        const data = await res.json();

        if (data.error) {
          showClientMessage('Error: ' + data.error, true);
          return;
        }

        showClientMessage('Refresh sent to ' + data.clientsNotified + ' client(s)');
      } catch (e) {
        showClientMessage('Failed: ' + e.message, true);
      }
    }

    function showModalError(msg) {
      const el = document.getElementById('modalError');
      el.textContent = msg;
      el.style.display = 'block';
    }

    function showClientMessage(msg, isError) {
      const el = document.getElementById('clientMessage');
      el.textContent = msg;
      el.style.color = isError ? '#ff6b6b' : '#00ff88';
      el.style.display = 'block';
      setTimeout(function() { el.style.display = 'none'; }, 3000);
    }

    // Close modal when clicking outside
    document.getElementById('clientModal').addEventListener('click', function(e) {
      if (e.target === this) closeClientModal();
    });

    refresh();
    loadXmlConfig();
    loadEventName();
    loadInitialLogs();
    loadClients();
    connectLogWebSocket();
    setInterval(refresh, 2000);
    setInterval(loadXmlConfig, 5000);
    setInterval(loadEventName, 5000);
    setInterval(loadClients, 3000);
  </script>
</body>
</html>`;
  }
}
