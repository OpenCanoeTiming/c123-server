import { EventEmitter } from 'node:events';
import type { ParsedMessage } from './protocol/index.js';
import { parseXmlMessage } from './protocol/index.js';
import type { Source, SourceStatus } from './sources/types.js';
import { TcpSource } from './sources/TcpSource.js';
import { UdpDiscovery } from './sources/UdpDiscovery.js';
import { XmlFileSource } from './sources/XmlFileSource.js';
import { EventState } from './state/EventState.js';
import { BR1BR2Merger } from './state/BR1BR2Merger.js';
import { WebSocketServer } from './ws/WebSocketServer.js';
import { AdminServer } from './admin/AdminServer.js';
import { XmlDataService } from './service/XmlDataService.js';
import { XmlChangeNotifier } from './xml/XmlChangeNotifier.js';
import { XmlWebSocketServer } from './xml/XmlWebSocketServer.js';
import { Logger } from './utils/logger.js';
import {
  createTimeOfDay,
  createOnCourse,
  createResults,
  createRaceConfig,
  createSchedule,
} from './protocol/index.js';

/**
 * Wrapper to make UdpDiscovery compatible with Source interface for admin display
 */
class UdpDiscoverySourceAdapter implements Pick<Source, 'status'> {
  constructor(private discovery: UdpDiscovery) {}

  get status(): SourceStatus {
    if (this.discovery.getDiscoveredHost()) {
      return 'connected';
    }
    return this.discovery.isListening() ? 'connecting' : 'disconnected';
  }
}

/**
 * Server configuration
 */
export interface ServerConfig {
  /** TCP source host (if not using auto-discovery) */
  tcpHost?: string;
  /** TCP source port (default: 27333) */
  tcpPort?: number;
  /** Enable UDP auto-discovery (default: true) */
  autoDiscovery?: boolean;
  /** UDP discovery port (default: 27333) */
  udpPort?: number;
  /** XML file source path (local or URL) */
  xmlPath?: string;
  /** XML polling interval in ms (default: 2000) */
  xmlPollInterval?: number;
  /** WebSocket server port (default: 27084) */
  wsPort?: number;
  /** Admin server port (default: 8084) */
  adminPort?: number;
  /** XML WebSocket server port (default: 27085) */
  xmlWsPort?: number;
}

/**
 * Server events
 */
export interface ServerEvents {
  started: [];
  stopped: [];
  error: [Error];
  tcpConnected: [string];
  tcpDisconnected: [];
}

const DEFAULT_CONFIG: Required<ServerConfig> = {
  tcpHost: '',
  tcpPort: 27333,
  autoDiscovery: true,
  udpPort: 27333,
  xmlPath: '',
  xmlPollInterval: 2000,
  wsPort: 27084,
  adminPort: 8084,
  xmlWsPort: 0, // Use dynamic port by default for test safety
};

/**
 * Main C123 Server orchestration.
 *
 * Coordinates all components:
 * - UDP discovery (auto-find C123)
 * - TCP source (C123 connection)
 * - XML file source (optional)
 * - Event state (finish detection, race tracking)
 * - BR1/BR2 merger
 * - WebSocket server (C123 protocol output)
 * - Admin server (dashboard)
 */
export class Server extends EventEmitter<ServerEvents> {
  private readonly config: Required<ServerConfig>;

  private udpDiscovery: UdpDiscovery | null = null;
  private tcpSource: TcpSource | null = null;
  private xmlSource: XmlFileSource | null = null;
  private xmlChangeNotifier: XmlChangeNotifier | null = null;
  private eventState: EventState;
  private merger: BR1BR2Merger;
  private wsServer: WebSocketServer;
  private adminServer: AdminServer;
  private xmlDataService: XmlDataService;
  private xmlWsServer: XmlWebSocketServer;

  private isRunning = false;
  private discoveredHost: string | null = null;

  constructor(config?: ServerConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.eventState = new EventState();
    this.merger = new BR1BR2Merger();
    this.wsServer = new WebSocketServer({ port: this.config.wsPort });
    this.adminServer = new AdminServer({ port: this.config.adminPort });
    this.xmlDataService = new XmlDataService();
    this.xmlWsServer = new XmlWebSocketServer({ port: this.config.xmlWsPort });

    this.setupEventHandlers();
  }

  /**
   * Start the server and all components
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Start output servers first
    await this.wsServer.start();
    await this.adminServer.start();
    await this.xmlWsServer.start();

    // Register state with admin
    this.adminServer.setEventState(this.eventState);
    this.adminServer.setWebSocketServer(this.wsServer);
    this.adminServer.setXmlDataService(this.xmlDataService);

    // Start data sources
    if (this.config.autoDiscovery && !this.config.tcpHost) {
      this.startUdpDiscovery();
    } else if (this.config.tcpHost) {
      this.startTcpSource(this.config.tcpHost, this.config.tcpPort);
    }

    if (this.config.xmlPath) {
      this.startXmlSource();
      this.startXmlChangeNotifier();
      // Also configure XmlDataService for REST API
      this.xmlDataService.setPath(this.config.xmlPath);
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Stop the server and all components
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop data sources
    this.udpDiscovery?.stop();
    this.tcpSource?.stop();
    this.xmlSource?.stop();
    await this.xmlChangeNotifier?.stop();

    // Stop output servers
    await this.wsServer.stop();
    await this.adminServer.stop();
    await this.xmlWsServer.stop();

    // Cleanup
    this.eventState.destroy();

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Check if server is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get the discovered C123 host (if any)
   */
  getDiscoveredHost(): string | null {
    return this.discoveredHost;
  }

  /**
   * Get the WebSocket server port
   */
  getWsPort(): number {
    return this.wsServer.getPort();
  }

  /**
   * Get the Admin server port
   */
  getAdminPort(): number {
    return this.adminServer.getPort();
  }

  /**
   * Get the XML WebSocket server port
   */
  getXmlWsPort(): number {
    return this.xmlWsServer.getPort();
  }

  /**
   * Manually set TCP source host (useful for switching)
   */
  setTcpHost(host: string, port?: number): void {
    this.tcpSource?.stop();
    this.startTcpSource(host, port ?? this.config.tcpPort);
  }

  /**
   * Set XML source path
   */
  setXmlPath(path: string): void {
    this.xmlSource?.stop();
    this.config.xmlPath = path;
    this.xmlDataService.setPath(path);
    if (path) {
      this.startXmlSource();
    }
  }

  private setupEventHandlers(): void {
    // Handle schedule change (different event loaded in C123)
    this.eventState.on('scheduleChange', () => {
      Logger.warn('Server', 'Event change detected, clearing BR1/BR2 cache');
      this.merger.clearAll();
    });

    // Log race changes
    this.eventState.on('raceChange', (raceId) => {
      Logger.info('Server', `Race changed to: ${raceId}`);
    });

    // Log finish detection
    this.eventState.on('finish', (competitor) => {
      Logger.info('Server', `Finish detected: bib ${competitor.bib}`);
    });

    // Log errors
    this.wsServer.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private startUdpDiscovery(): void {
    this.udpDiscovery = new UdpDiscovery({ port: this.config.udpPort });

    // Use adapter to provide status for admin display
    const adapter = new UdpDiscoverySourceAdapter(this.udpDiscovery);
    this.adminServer.registerSource('UDP Discovery', 'udp', adapter as unknown as Source, {
      port: this.config.udpPort,
    });

    this.udpDiscovery.on('discovered', (host) => {
      if (!this.discoveredHost) {
        this.discoveredHost = host;
        this.startTcpSource(host, this.config.tcpPort);
      }
    });

    this.udpDiscovery.on('error', (err) => {
      this.emit('error', err);
    });

    this.udpDiscovery.start();
  }

  private startTcpSource(host: string, port: number): void {
    this.tcpSource = new TcpSource({ host, port });

    this.adminServer.registerSource('C123 TCP', 'tcp', this.tcpSource, {
      host,
      port,
    });

    this.tcpSource.on('message', (xml) => {
      this.handleXmlMessage(xml);
    });

    this.tcpSource.on('status', (status) => {
      if (status === 'connected') {
        this.emit('tcpConnected', host);
      } else if (status === 'disconnected') {
        this.emit('tcpDisconnected');
      }
    });

    this.tcpSource.on('error', (err) => {
      this.emit('error', err);
    });

    this.tcpSource.start();
  }

  private startXmlSource(): void {
    this.xmlSource = new XmlFileSource({
      path: this.config.xmlPath,
      pollInterval: this.config.xmlPollInterval,
    });

    this.adminServer.registerSource('XML File', 'xml', this.xmlSource, {
      path: this.config.xmlPath,
    });

    this.xmlSource.on('message', (xml) => {
      this.handleXmlMessage(xml);
    });

    this.xmlSource.on('error', (err) => {
      this.emit('error', err);
    });

    this.xmlSource.start();
  }

  private startXmlChangeNotifier(): void {
    this.xmlChangeNotifier = new XmlChangeNotifier({
      path: this.config.xmlPath,
      pollInterval: this.config.xmlPollInterval,
      debounceMs: 200, // Slightly higher debounce for change notifications
    });

    this.xmlChangeNotifier.on('change', (sections, checksum) => {
      Logger.info('Server', `XML changed: ${sections.join(', ')}`);
      this.xmlWsServer.broadcastChange(sections, checksum);
      // Clear XmlDataService cache so next REST request gets fresh data
      this.xmlDataService.clearCache();
    });

    this.xmlChangeNotifier.on('error', (err) => {
      this.emit('error', err);
    });

    this.xmlChangeNotifier.start();
  }

  private handleXmlMessage(xml: string): void {
    try {
      const parsedMessages = parseXmlMessage(xml);

      for (const parsed of parsedMessages) {
        if (parsed.type === 'unknown') {
          continue;
        }

        // Apply BR1/BR2 merging for results
        let message: ParsedMessage = parsed;
        if (parsed.type === 'results') {
          message = {
            type: 'results',
            data: this.merger.processResults(parsed.data),
          };
        }

        // Update internal state (for finish detection, etc.)
        this.eventState.processMessage(message);

        // Broadcast C123 message to all clients
        this.broadcastParsedMessage(message);
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Convert parsed message to C123 protocol format and broadcast
   */
  private broadcastParsedMessage(message: ParsedMessage): void {
    switch (message.type) {
      case 'timeofday':
        this.wsServer.broadcast(createTimeOfDay(message.data));
        break;
      case 'oncourse':
        this.wsServer.broadcast(createOnCourse(message.data));
        break;
      case 'results':
        // Only broadcast results marked as current (active race)
        if (message.data.isCurrent) {
          this.wsServer.broadcast(createResults(message.data));
        }
        break;
      case 'raceconfig':
        this.wsServer.broadcast(createRaceConfig(message.data));
        break;
      case 'schedule':
        this.wsServer.broadcast(createSchedule(message.data));
        break;
    }
  }
}
