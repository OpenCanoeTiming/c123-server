import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ScoreboardConfig } from '../admin/types.js';
import type { C123Message, C123XmlChange, C123ForceRefresh, C123LogEntry, C123Connected, C123ScoringEvent, C123Schedule, XmlSection, LogLevel, C123ClientState } from '../protocol/types.js';
import { getLogBuffer, type LogEntry, type LogFilterOptions } from '../utils/LogBuffer.js';
import { ScoreboardSession } from '../ws/ScoreboardSession.js';
import { Logger } from '../utils/logger.js';
import type { EventState } from '../state/EventState.js';
import type { Source } from '../sources/types.js';
import type { XmlDataService } from '../service/XmlDataService.js';
import type { Server as C123Server } from '../server.js';
import type { LiveMiniPusher } from '../live-mini/LiveMiniPusher.js';
import { LiveMiniClient } from '../live-mini/LiveMiniClient.js';
import type { CreateEventRequest, EventStatus } from '../live-mini/types.js';
import { getAppSettings, WindowsConfigDetector } from '../config/index.js';
import type { ClientConfig } from '../config/types.js';

// Get admin-ui directory path (works for both dev and dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_UI_DIR = path.join(__dirname, '..', 'admin-ui');

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

  // Live-Mini status broadcast throttling (max 2/s = 500ms)
  private liveMiniStatusLastBroadcast: number = 0;
  private readonly LIVE_MINI_STATUS_THROTTLE_MS = 500;

  // Registered components
  private eventState: EventState | null = null;
  private sources: RegisteredSource[] = [];
  private xmlDataService: XmlDataService | null = null;
  private c123Server: C123Server | null = null;
  private liveMiniPusher: LiveMiniPusher | null = null;

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
   * Register LiveMiniPusher for live-mini integration
   */
  setLiveMiniPusher(pusher: LiveMiniPusher): void {
    this.liveMiniPusher = pusher;
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
    // Remove existing source with same name (e.g., when XML path changes)
    const existingIndex = this.sources.findIndex((s) => s.name === name);
    if (existingIndex !== -1) {
      this.sources.splice(existingIndex, 1);
    }

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
   *
   * @param configKey - Client identifier (explicit clientId or IP address)
   * @param clearedAssetKeys - Asset keys that were explicitly cleared (will be sent as null)
   */
  pushConfigToConfigKey(
    configKey: string,
    clearedAssetKeys?: Array<'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl'>,
  ): number {
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
        session.sendConfigPush(clearedAssetKeys);
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
   * Broadcast a scoring event to all admin dashboard connections
   * Used for real-time notification when scoring commands are sent
   */
  broadcastScoringEvent(event: C123ScoringEvent['data']): void {
    const message: C123ScoringEvent = {
      type: 'ScoringEvent',
      timestamp: new Date().toISOString(),
      data: event,
    };

    const json = JSON.stringify(message);

    // Send to admin dashboard connections (for monitoring)
    for (const ws of this.adminConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(json);
      } else {
        this.adminConnections.delete(ws);
      }
    }

    Logger.debug('Unified', `Broadcast ScoringEvent: ${event.eventType} bib=${event.bib}`);
  }

  /**
   * Broadcast Live-Mini status to all admin dashboard connections
   * Throttled to max 2/s (500ms between broadcasts)
   */
  broadcastLiveMiniStatus(status: import('../live-mini/types.js').LiveMiniStatus): void {
    if (this.adminConnections.size === 0) {
      return; // No admin connections, skip
    }

    // Throttle: skip if last broadcast was less than 500ms ago
    const now = Date.now();
    if (now - this.liveMiniStatusLastBroadcast < this.LIVE_MINI_STATUS_THROTTLE_MS) {
      return;
    }
    this.liveMiniStatusLastBroadcast = now;

    const message = {
      type: 'LiveMiniStatus',
      timestamp: new Date().toISOString(),
      data: status,
    };

    const json = JSON.stringify(message);

    // Send to admin dashboard connections
    for (const ws of this.adminConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(json);
      } else {
        this.adminConnections.delete(ws);
      }
    }

    Logger.debug('Unified', `Broadcast LiveMiniStatus: ${status.state}`);
  }

  /**
   * Broadcast default assets change to all connected clients
   * @param clearedKeys - Asset keys that were cleared (will be sent as null)
   */
  broadcastDefaultAssetsChange(clearedKeys?: Array<'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl'>): number {
    const settings = getAppSettings();
    const defaultAssets = settings.getDefaultAssets();

    let sentCount = 0;

    for (const [clientId, session] of this.sessions) {
      if (!session.isConnected()) {
        // Clean up dead connections
        this.sessions.delete(clientId);
        this.emit('disconnection', clientId);
        continue;
      }

      // Update session's default assets reference
      session.setDefaultAssets(defaultAssets);

      // Build assets object with null for cleared keys
      // But respect per-client overrides (they have priority over defaults)
      const assetsForPush: Record<string, string | null> = {};
      const clientAssets = session.getServerConfig()?.assets || {};

      // Add current values (merged: per-client > default)
      const logoValue = clientAssets.logoUrl || defaultAssets?.logoUrl;
      const partnerValue = clientAssets.partnerLogoUrl || defaultAssets?.partnerLogoUrl;
      const footerValue = clientAssets.footerImageUrl || defaultAssets?.footerImageUrl;

      if (logoValue) assetsForPush.logoUrl = logoValue;
      if (partnerValue) assetsForPush.partnerLogoUrl = partnerValue;
      if (footerValue) assetsForPush.footerImageUrl = footerValue;

      // Add null for cleared keys ONLY if client doesn't have per-client override
      if (clearedKeys) {
        for (const key of clearedKeys) {
          if (!clientAssets[key]) {
            // No per-client override, so send null to clear localStorage
            assetsForPush[key] = null;
          }
          // If client has per-client override, don't send null - keep their value
        }
      }

      // Only send if there's something to push
      if (Object.keys(assetsForPush).length === 0) {
        continue;
      }

      // Get effective config (without assets - we'll add our own)
      const config = session.getEffectiveConfig();
      // Override assets with our explicit nulls
      const configWithAssets = {
        ...config,
        assets: assetsForPush,
      };

      const message = {
        type: 'ConfigPush' as const,
        timestamp: new Date().toISOString(),
        data: configWithAssets,
      };

      session.sendRaw(JSON.stringify(message));
      sentCount++;
    }

    Logger.info(
      'Unified',
      `Broadcast assets change to ${sentCount} clients${clearedKeys ? ` (cleared: ${clearedKeys.join(', ')})` : ''}`,
    );
    return sentCount;
  }

  /**
   * Get clients data for API and WebSocket broadcast
   * Returns sorted list of all known clients (online + offline)
   */
  private getClientsData(): object[] {
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
    return Array.from(knownConfigKeys)
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
  }

  /**
   * Broadcast clients update to all admin dashboard connections
   * Used for real-time client list updates in admin dashboard
   */
  broadcastClientsUpdate(): void {
    if (this.adminConnections.size === 0) {
      return; // No admin connections, skip
    }

    const clients = this.getClientsData();
    const message = {
      type: 'ClientsUpdate',
      timestamp: new Date().toISOString(),
      data: { clients },
    };

    const json = JSON.stringify(message);

    // Send only to admin dashboard connections
    for (const ws of this.adminConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(json);
      } else {
        this.adminConnections.delete(ws);
      }
    }

    Logger.debug('Unified', `Broadcast ClientsUpdate to ${this.adminConnections.size} admin connection(s)`);
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

      // Send initial clients list immediately after connection
      const clients = this.getClientsData();
      const message = {
        type: 'ClientsUpdate',
        timestamp: new Date().toISOString(),
        data: { clients },
      };
      ws.send(JSON.stringify(message));

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
    const defaultAssets = settings.getDefaultAssets();

    // Create session with IP, stored config, explicit clientId, and default assets
    const session = new ScoreboardSession(
      sessionId,
      ws,
      ipAddress,
      undefined,
      storedConfig,
      explicitClientId,
      defaultAssets,
    );
    this.sessions.set(sessionId, session);

    const clientIdInfo = explicitClientId ? `clientId=${explicitClientId}` : `IP=${ipAddress}`;
    Logger.info('Unified', `WebSocket client connected: ${sessionId} (${clientIdInfo})`);
    this.emit('connection', sessionId);

    // Notify admin dashboard about new client
    this.broadcastClientsUpdate();

    // Send Connected message to scoreboard
    const tcpSource = this.sources.find((s) => s.type === 'tcp');
    const c123Connected = tcpSource?.source.status === 'connected';
    const xmlLoaded = this.xmlDataService?.hasData() ?? false;
    const connectedMsg: C123Connected = {
      type: 'Connected',
      timestamp: new Date().toISOString(),
      data: {
        version: VERSION,
        c123Connected,
        xmlLoaded,
      },
    };
    session.sendRaw(JSON.stringify(connectedMsg));

    // Send ConfigPush if there's stored config for this client
    if (storedConfig) {
      session.sendConfigPush();
      Logger.debug('Unified', `Sent ConfigPush to ${sessionId}`, storedConfig);
    }

    // Send Schedule if available from EventState
    if (this.eventState && this.eventState.state.schedule.length > 0) {
      const scheduleMsg: C123Schedule = {
        type: 'Schedule',
        timestamp: new Date().toISOString(),
        data: {
          races: this.eventState.state.schedule,
        },
      };
      session.sendRaw(JSON.stringify(scheduleMsg));
      Logger.debug('Unified', `Sent Schedule to ${sessionId} (${this.eventState.state.schedule.length} races)`);
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
      // Notify admin dashboard about client disconnect
      this.broadcastClientsUpdate();
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.sessions.delete(sessionId);
      this.emit('disconnection', sessionId);
      // Notify admin dashboard about client disconnect
      this.broadcastClientsUpdate();
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
    // Increase JSON body limit for asset uploads (base64 encoded images)
    // Base64 encoding adds ~33% overhead, so 50mb allows ~37mb original files
    this.app.use(express.json({ limit: '50mb' }));

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
    this.app.get('/api/xml/courses', this.handleXmlCourses.bind(this));

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

    // Default assets API routes
    this.app.get('/api/config/assets', this.handleGetAssets.bind(this));
    this.app.put('/api/config/assets', this.handleSetAssets.bind(this));
    this.app.delete('/api/config/assets/:key', this.handleDeleteAsset.bind(this));

    // C123 Write API (Scoring, RemoveFromCourse, Timing)
    this.app.post('/api/c123/scoring', this.handleC123Scoring.bind(this));
    this.app.post('/api/c123/remove-from-course', this.handleC123RemoveFromCourse.bind(this));
    this.app.post('/api/c123/timing', this.handleC123Timing.bind(this));

    // Live-Mini API
    this.app.get('/api/live-mini/status', this.handleLiveMiniStatus.bind(this));
    this.app.post('/api/live-mini/connect', this.handleLiveMiniConnect.bind(this));
    this.app.post('/api/live-mini/disconnect', this.handleLiveMiniDisconnect.bind(this));
    this.app.post('/api/live-mini/pause', this.handleLiveMiniPause.bind(this));
    this.app.post('/api/live-mini/force-push-xml', this.handleLiveMiniForceXml.bind(this));
    this.app.post('/api/live-mini/transition', this.handleLiveMiniTransition.bind(this));
    this.app.patch('/api/live-mini/config', this.handleLiveMiniConfig.bind(this));

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Static files for Admin UI (CSS, JS)
    this.app.use('/admin-ui', express.static(ADMIN_UI_DIR));

    // Dashboard UI - serve index.html
    this.app.get('/', (_req: Request, res: Response) => {
      res.sendFile(path.join(ADMIN_UI_DIR, 'index.html'));
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
   * GET /api/xml/courses - Course data with gate configuration and splits
   */
  private async handleXmlCourses(_req: Request, res: Response): Promise<void> {
    if (!this.xmlDataService) {
      res.status(503).json({ error: 'XML data service not available' });
      return;
    }

    try {
      const courses = await this.xmlDataService.getCourses();
      res.json({ courses });
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
            clientId: storedConfig.clientId,
            assets: storedConfig.assets,
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
    const clients = this.getClientsData();
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

    if (config.scrollToFinished !== undefined && typeof config.scrollToFinished !== 'boolean') {
      res.status(400).json({ error: 'scrollToFinished must be a boolean' });
      return;
    }

    if (config.clientId !== undefined) {
      if (typeof config.clientId !== 'string' || config.clientId.trim() === '') {
        res.status(400).json({ error: 'clientId must be a non-empty string' });
        return;
      }
      config.clientId = config.clientId.trim();
    }

    // Remove metadata fields from config (server-managed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { label, lastSeen, ...configToSave } = config;

    // Track which asset keys are being cleared (set to null)
    const clearedAssetKeys: Array<'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl'> = [];
    if (configToSave.assets) {
      const assetKeys = ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'] as const;
      for (const key of assetKeys) {
        if ((configToSave.assets as Record<string, unknown>)[key] === null) {
          clearedAssetKeys.push(key);
        }
      }
    }

    // Save configuration
    const settings = getAppSettings();
    const savedConfig = settings.setClientConfig(ip, configToSave);

    // Push to online clients (with cleared asset keys so they get null values)
    const pushedCount = this.pushConfigToConfigKey(
      ip,
      clearedAssetKeys.length > 0 ? clearedAssetKeys : undefined,
    );

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

  // ==========================================================================
  // Default Assets API Handlers
  // ==========================================================================

  /**
   * GET /api/config/assets - Get default assets configuration
   */
  private handleGetAssets(_req: Request, res: Response): void {
    const settings = getAppSettings();
    const assets = settings.getDefaultAssets() || {};

    res.json({
      assets: {
        logoUrl: assets.logoUrl ?? null,
        partnerLogoUrl: assets.partnerLogoUrl ?? null,
        footerImageUrl: assets.footerImageUrl ?? null,
      },
    });
  }

  /**
   * PUT /api/config/assets - Set default assets (partial update)
   *
   * Body: { logoUrl?: string | null, partnerLogoUrl?: string | null, footerImageUrl?: string | null }
   * Use null to clear a specific asset.
   */
  private handleSetAssets(req: Request, res: Response): void {
    const { logoUrl, partnerLogoUrl, footerImageUrl } = req.body;

    // Validate that values are strings, null, or undefined
    const validateAssetValue = (
      value: unknown,
      name: string,
    ): { valid: boolean; error?: string } => {
      if (value === undefined || value === null) {
        return { valid: true };
      }
      if (typeof value !== 'string') {
        return { valid: false, error: `${name} must be a string or null` };
      }
      // Validate URL or data URI format
      if (
        value.length > 0 &&
        !value.startsWith('http://') &&
        !value.startsWith('https://') &&
        !value.startsWith('data:image/')
      ) {
        return {
          valid: false,
          error: `${name} must be a URL (http/https) or data URI (data:image/...)`,
        };
      }
      // Warn if base64 is too large (> 500KB)
      if (value.startsWith('data:image/') && value.length > 500000) {
        Logger.warn(
          'Unified',
          `${name} data URI is very large (${Math.round(value.length / 1024)}KB). Consider resizing.`,
        );
      }
      return { valid: true };
    };

    // Validate each provided value
    for (const [key, value] of Object.entries({
      logoUrl,
      partnerLogoUrl,
      footerImageUrl,
    })) {
      const result = validateAssetValue(value, key);
      if (!result.valid) {
        res.status(400).json({ error: result.error });
        return;
      }
    }

    // Build update object (only include provided values)
    // Track which keys are being cleared (set to null)
    const updates: Record<string, string | undefined> = {};
    const clearedKeys: Array<'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl'> = [];

    if (logoUrl !== undefined) {
      updates.logoUrl = logoUrl ?? undefined;
      if (logoUrl === null) clearedKeys.push('logoUrl');
    }
    if (partnerLogoUrl !== undefined) {
      updates.partnerLogoUrl = partnerLogoUrl ?? undefined;
      if (partnerLogoUrl === null) clearedKeys.push('partnerLogoUrl');
    }
    if (footerImageUrl !== undefined) {
      updates.footerImageUrl = footerImageUrl ?? undefined;
      if (footerImageUrl === null) clearedKeys.push('footerImageUrl');
    }

    // Save to settings
    const settings = getAppSettings();
    settings.setDefaultAssets(updates);

    Logger.info('Unified', `Updated default assets: ${Object.keys(updates).join(', ')}`);

    // Broadcast to all connected clients
    // Pass clearedKeys so clients know to reset those to default
    this.broadcastDefaultAssetsChange(clearedKeys.length > 0 ? clearedKeys : undefined);

    // Return updated assets
    const assets = settings.getDefaultAssets() || {};
    res.json({
      success: true,
      assets: {
        logoUrl: assets.logoUrl ?? null,
        partnerLogoUrl: assets.partnerLogoUrl ?? null,
        footerImageUrl: assets.footerImageUrl ?? null,
      },
    });
  }

  /**
   * DELETE /api/config/assets/:key - Clear a specific default asset
   *
   * :key must be one of: logoUrl, partnerLogoUrl, footerImageUrl
   */
  private handleDeleteAsset(req: Request, res: Response): void {
    const { key } = req.params;

    // Validate key
    const validKeys = ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'] as const;
    if (!validKeys.includes(key as (typeof validKeys)[number])) {
      res.status(400).json({
        error: `Invalid asset key: ${key}. Must be one of: ${validKeys.join(', ')}`,
      });
      return;
    }

    // Clear the asset
    const settings = getAppSettings();
    const assetKey = key as 'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl';
    settings.clearDefaultAsset(assetKey);

    Logger.info('Unified', `Cleared default asset: ${key}`);

    // Broadcast to all connected clients with null for cleared asset
    this.broadcastDefaultAssetsChange([assetKey]);

    // Return updated assets
    const assets = settings.getDefaultAssets() || {};
    res.json({
      success: true,
      assets: {
        logoUrl: assets.logoUrl ?? null,
        partnerLogoUrl: assets.partnerLogoUrl ?? null,
        footerImageUrl: assets.footerImageUrl ?? null,
      },
    });
  }

  // ==========================================================================
  // C123 Write API Handlers (Scoring)
  // ==========================================================================

  /**
   * POST /api/c123/scoring - Send penalty command to C123
   *
   * Body: { bib: string, gate: number, value: 0 | 2 | 50, raceId?: string }
   *
   * Value meanings:
   * - 0: Clean pass (no penalty)
   * - 2: Touch (+2 seconds)
   * - 50: Missed/not taken (+50 seconds)
   *
   * Mode:
   * - Without raceId: Scoring for competitors ON COURSE
   * - With raceId: PenaltyCorrection for FINISHED competitors
   */
  private async handleC123Scoring(req: Request, res: Response): Promise<void> {
    if (!this.c123Server) {
      res.status(503).json({ error: 'Server not available' });
      return;
    }

    if (!this.c123Server.isScoringAvailable()) {
      res.status(503).json({
        error: 'Not connected to C123',
        detail: 'TCP connection to C123 is not established',
      });
      return;
    }

    const { bib, gate, value, raceId } = req.body;

    // Validate required fields
    if (bib === undefined || bib === null || bib === '') {
      res.status(400).json({ error: 'bib is required' });
      return;
    }

    if (gate === undefined || gate === null) {
      res.status(400).json({ error: 'gate is required' });
      return;
    }

    if (value === undefined) {
      res.status(400).json({ error: 'value is required (use null to delete)' });
      return;
    }

    // Validate gate range
    const gateNum = Number(gate);
    if (isNaN(gateNum) || gateNum < 1 || gateNum > 24) {
      res.status(400).json({
        error: 'gate must be a number between 1 and 24',
      });
      return;
    }

    // Validate penalty value (null = delete penalty)
    const valueNum = value === null ? null : Number(value);
    if (valueNum !== null && ![0, 2, 50].includes(valueNum)) {
      res.status(400).json({
        error: 'value must be 0, 2, 50, or null (to delete)',
        detail: '0 = clean, 2 = touch (+2s), 50 = missed (+50s), null = delete',
      });
      return;
    }

    // Validate raceId if provided
    if (raceId !== undefined && (typeof raceId !== 'string' || raceId.trim() === '')) {
      res.status(400).json({
        error: 'raceId must be a non-empty string if provided',
      });
      return;
    }

    try {
      const scoringRequest = raceId
        ? { raceId: String(raceId), bib: String(bib), gate: gateNum, value: valueNum as 0 | 2 | 50 | null }
        : { bib: String(bib), gate: gateNum, value: valueNum as 0 | 2 | 50 | null };
      await this.c123Server.sendScoring(scoringRequest);

      // Broadcast scoring event to admin connections
      const penaltyDetails = raceId
        ? { gate: gateNum, value: valueNum as 0 | 2 | 50 | null, raceId: String(raceId) }
        : { gate: gateNum, value: valueNum as 0 | 2 | 50 | null };
      this.broadcastScoringEvent({
        eventType: 'penalty',
        bib: String(bib),
        details: penaltyDetails,
      });

      res.json({
        success: true,
        raceId: raceId ? String(raceId) : undefined,
        bib: String(bib),
        gate: gateNum,
        value: valueNum,
      });
    } catch (err) {
      Logger.error('Unified', 'Scoring error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/c123/remove-from-course - Remove competitor from course
   *
   * Body: { bib: string, reason: 'DNS' | 'DNF' | 'CAP', position?: number }
   *
   * Reason meanings:
   * - DNS: Did Not Start
   * - DNF: Did Not Finish
   * - CAP: Capsized
   */
  private async handleC123RemoveFromCourse(req: Request, res: Response): Promise<void> {
    if (!this.c123Server) {
      res.status(503).json({ error: 'Server not available' });
      return;
    }

    if (!this.c123Server.isScoringAvailable()) {
      res.status(503).json({
        error: 'Not connected to C123',
        detail: 'TCP connection to C123 is not established',
      });
      return;
    }

    const { bib, reason, position } = req.body;

    // Validate required fields
    if (bib === undefined || bib === null || bib === '') {
      res.status(400).json({ error: 'bib is required' });
      return;
    }

    if (reason === undefined || reason === null || reason === '') {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    // Validate reason
    const validReasons = ['DNS', 'DNF', 'CAP'] as const;
    const reasonUpper = String(reason).toUpperCase();
    if (!validReasons.includes(reasonUpper as (typeof validReasons)[number])) {
      res.status(400).json({
        error: 'reason must be DNS, DNF, or CAP',
        detail: 'DNS = Did Not Start, DNF = Did Not Finish, CAP = Capsized',
      });
      return;
    }

    // Validate optional position
    let positionNum: number | undefined;
    if (position !== undefined && position !== null) {
      positionNum = Number(position);
      if (isNaN(positionNum) || positionNum < 1) {
        res.status(400).json({
          error: 'position must be a positive number',
        });
        return;
      }
    }

    try {
      const request: { bib: string; reason: 'DNS' | 'DNF' | 'CAP'; position?: number } = {
        bib: String(bib),
        reason: reasonUpper as 'DNS' | 'DNF' | 'CAP',
      };
      if (positionNum !== undefined) {
        request.position = positionNum;
      }
      await this.c123Server.sendRemoveFromCourse(request);

      const finalPosition = positionNum ?? 1;

      // Broadcast scoring event to admin connections
      this.broadcastScoringEvent({
        eventType: 'remove',
        bib: String(bib),
        details: { reason: reasonUpper as 'DNS' | 'DNF' | 'CAP', position: finalPosition },
      });

      res.json({
        success: true,
        bib: String(bib),
        reason: reasonUpper,
        position: finalPosition,
      });
    } catch (err) {
      Logger.error('Unified', 'RemoveFromCourse error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/c123/timing - Send manual timing impulse to C123
   *
   * Body: { bib: string, channelPosition: 'Start' | 'Finish' | 'Split1' | 'Split2' }
   */
  private async handleC123Timing(req: Request, res: Response): Promise<void> {
    if (!this.c123Server) {
      res.status(503).json({ error: 'Server not available' });
      return;
    }

    if (!this.c123Server.isScoringAvailable()) {
      res.status(503).json({
        error: 'Not connected to C123',
        detail: 'TCP connection to C123 is not established',
      });
      return;
    }

    const { bib, channelPosition } = req.body;

    // Validate required fields
    if (bib === undefined || bib === null || bib === '') {
      res.status(400).json({ error: 'bib is required' });
      return;
    }

    if (channelPosition === undefined || channelPosition === null || channelPosition === '') {
      res.status(400).json({ error: 'channelPosition is required' });
      return;
    }

    // Validate channelPosition
    const validPositions = ['Start', 'Finish', 'Split1', 'Split2'] as const;
    // Normalize case - first letter uppercase, rest lowercase
    const normalizedPosition = String(channelPosition).charAt(0).toUpperCase() +
      String(channelPosition).slice(1).toLowerCase();

    if (!validPositions.includes(normalizedPosition as (typeof validPositions)[number])) {
      res.status(400).json({
        error: 'channelPosition must be Start, Finish, Split1, or Split2',
      });
      return;
    }

    try {
      await this.c123Server.sendTiming({
        bib: String(bib),
        channelPosition: normalizedPosition as 'Start' | 'Finish' | 'Split1' | 'Split2',
      });

      // Broadcast scoring event to admin connections
      this.broadcastScoringEvent({
        eventType: 'timing',
        bib: String(bib),
        details: { channelPosition: normalizedPosition as 'Start' | 'Finish' | 'Split1' | 'Split2' },
      });

      res.json({
        success: true,
        bib: String(bib),
        channelPosition: normalizedPosition,
      });
    } catch (err) {
      Logger.error('Unified', 'Timing error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ==========================================================================
  // Live-Mini API Handlers
  // ==========================================================================

  /**
   * GET /api/live-mini/status - Get current Live-Mini pusher status
   */
  private handleLiveMiniStatus(_req: Request, res: Response): void {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    const status = this.liveMiniPusher.getStatus();
    res.json({ status });
  }

  /**
   * POST /api/live-mini/connect - Connect to live-mini server and create event
   *
   * Body: {
   *   serverUrl: string,
   *   metadata: CreateEventRequest,
   *   pushXml?: boolean,
   *   pushOnCourse?: boolean,
   *   pushResults?: boolean
   * }
   */
  private async handleLiveMiniConnect(req: Request, res: Response): Promise<void> {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    if (!this.c123Server) {
      res.status(503).json({ error: 'C123 server not available' });
      return;
    }

    const { serverUrl, metadata, pushXml, pushOnCourse, pushResults } = req.body;

    // Validate serverUrl
    if (!serverUrl || typeof serverUrl !== 'string') {
      res.status(400).json({ error: 'serverUrl is required' });
      return;
    }

    // Validate metadata
    if (!metadata || typeof metadata !== 'object') {
      res.status(400).json({ error: 'metadata is required' });
      return;
    }

    const eventMetadata = metadata as CreateEventRequest;
    if (!eventMetadata.eventId || !eventMetadata.mainTitle) {
      res.status(400).json({ error: 'metadata must include eventId and mainTitle' });
      return;
    }

    try {
      // Create event on live-mini server
      Logger.info('Unified', `Creating event on live-mini: ${serverUrl}`);
      const client = new LiveMiniClient({ serverUrl });
      const createResponse = await client.createEvent(eventMetadata);

      Logger.info('Unified', `Event created: ${createResponse.eventId}, apiKey received`);

      // Save connection to settings
      const settings = getAppSettings();
      settings.setLiveMiniConnection(
        serverUrl,
        createResponse.apiKey,
        createResponse.eventId,
        'draft',
      );

      // Update channel settings if provided
      if (pushXml !== undefined || pushOnCourse !== undefined || pushResults !== undefined) {
        settings.setLiveMiniChannels({
          pushXml: pushXml ?? true,
          pushOnCourse: pushOnCourse ?? true,
          pushResults: pushResults ?? true,
        });
      }

      // Get updated config and connect pusher
      const liveMiniConfig = settings.getLiveMiniConfig();
      const xmlChangeNotifier = this.c123Server.getXmlChangeNotifier();
      const eventState = this.c123Server.getEventState();

      if (!xmlChangeNotifier || !eventState) {
        res.status(503).json({ error: 'XmlChangeNotifier or EventState not available' });
        return;
      }

      await this.liveMiniPusher.connect(
        {
          serverUrl: liveMiniConfig.serverUrl!,
          apiKey: liveMiniConfig.apiKey!,
          eventId: liveMiniConfig.eventId!,
          eventStatus: 'draft',
          pushXml: liveMiniConfig.pushXml,
          pushOnCourse: liveMiniConfig.pushOnCourse,
          pushResults: liveMiniConfig.pushResults,
        },
        xmlChangeNotifier,
        eventState,
      );

      // Subscribe to pusher status changes
      this.liveMiniPusher.on('statusChange', (status) => {
        this.broadcastLiveMiniStatus(status);
      });

      const status = this.liveMiniPusher.getStatus();

      // Broadcast initial status
      this.broadcastLiveMiniStatus(status);

      res.json({
        success: true,
        eventId: createResponse.eventId,
        status,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini connect error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/live-mini/disconnect - Disconnect from live-mini
   *
   * Body: { clearConfig?: boolean }
   */
  private async handleLiveMiniDisconnect(req: Request, res: Response): Promise<void> {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    const { clearConfig } = req.body;

    try {
      await this.liveMiniPusher.disconnect();

      // Clear saved config if requested
      if (clearConfig === true) {
        const settings = getAppSettings();
        settings.clearLiveMiniConnection();
        Logger.info('Unified', 'Live-Mini config cleared');
      }

      const status = this.liveMiniPusher.getStatus();
      this.broadcastLiveMiniStatus(status);

      res.json({
        success: true,
        configCleared: clearConfig === true,
        status,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini disconnect error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/live-mini/pause - Pause or resume push
   *
   * Body: { paused: boolean }
   */
  private handleLiveMiniPause(req: Request, res: Response): void {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    const { paused } = req.body;

    if (typeof paused !== 'boolean') {
      res.status(400).json({ error: 'paused must be a boolean' });
      return;
    }

    try {
      if (paused) {
        this.liveMiniPusher.pause();
        Logger.info('Unified', 'Live-Mini push paused');
      } else {
        this.liveMiniPusher.resume();
        Logger.info('Unified', 'Live-Mini push resumed');
      }

      const status = this.liveMiniPusher.getStatus();
      this.broadcastLiveMiniStatus(status);

      res.json({
        success: true,
        paused,
        status,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini pause error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/live-mini/force-push-xml - Force immediate XML push
   */
  private async handleLiveMiniForceXml(_req: Request, res: Response): Promise<void> {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    try {
      await this.liveMiniPusher.forcePushXml();
      Logger.info('Unified', 'Live-Mini XML force push triggered');

      const status = this.liveMiniPusher.getStatus();
      this.broadcastLiveMiniStatus(status);

      res.json({
        success: true,
        status,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini force XML error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/live-mini/transition - Transition event status
   *
   * Body: { status: EventStatus }
   */
  private async handleLiveMiniTransition(req: Request, res: Response): Promise<void> {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    const { status } = req.body;

    // Validate status
    const validStatuses: EventStatus[] = ['draft', 'startlist', 'running', 'finished', 'official'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    try {
      await this.liveMiniPusher.transitionStatus(status as EventStatus);
      Logger.info('Unified', `Live-Mini event status transitioned to: ${status}`);

      // Update stored config
      const settings = getAppSettings();
      settings.updateLiveMiniConfig({ eventStatus: status });

      const pusherStatus = this.liveMiniPusher.getStatus();
      this.broadcastLiveMiniStatus(pusherStatus);

      res.json({
        success: true,
        eventStatus: status,
        status: pusherStatus,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini transition error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/live-mini/config - Update push channel configuration
   *
   * Body: { pushXml?: boolean, pushOnCourse?: boolean, pushResults?: boolean }
   */
  private handleLiveMiniConfig(req: Request, res: Response): void {
    if (!this.liveMiniPusher) {
      res.status(503).json({ error: 'Live-Mini pusher not available' });
      return;
    }

    const { pushXml, pushOnCourse, pushResults } = req.body;

    // Validate that at least one field is provided
    if (pushXml === undefined && pushOnCourse === undefined && pushResults === undefined) {
      res.status(400).json({ error: 'At least one channel must be specified' });
      return;
    }

    // Validate field types
    if (pushXml !== undefined && typeof pushXml !== 'boolean') {
      res.status(400).json({ error: 'pushXml must be a boolean' });
      return;
    }
    if (pushOnCourse !== undefined && typeof pushOnCourse !== 'boolean') {
      res.status(400).json({ error: 'pushOnCourse must be a boolean' });
      return;
    }
    if (pushResults !== undefined && typeof pushResults !== 'boolean') {
      res.status(400).json({ error: 'pushResults must be a boolean' });
      return;
    }

    try {
      // Update pusher
      this.liveMiniPusher.updateChannels({ pushXml, pushOnCourse, pushResults });

      // Save to settings
      const settings = getAppSettings();
      settings.setLiveMiniChannels({ pushXml, pushOnCourse, pushResults });

      Logger.info('Unified', `Live-Mini channels updated: ${JSON.stringify({ pushXml, pushOnCourse, pushResults })}`);

      const status = this.liveMiniPusher.getStatus();
      this.broadcastLiveMiniStatus(status);

      res.json({
        success: true,
        channels: {
          xml: status.channels.xml.enabled,
          oncourse: status.channels.oncourse.enabled,
          results: status.channels.results.enabled,
        },
        status,
      });
    } catch (err) {
      Logger.error('Unified', 'Live-Mini config error', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
