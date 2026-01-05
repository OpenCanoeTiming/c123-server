import { EventEmitter } from 'node:events';
import type { ParsedMessage } from './protocol/index.js';
import { parseXmlMessage } from './protocol/index.js';
import type { Source, SourceStatus } from './sources/types.js';
import { TcpSource } from './sources/TcpSource.js';
import { UdpDiscovery } from './sources/UdpDiscovery.js';
import { XmlFileSource } from './sources/XmlFileSource.js';
import { EventState } from './state/EventState.js';
import { UnifiedServer } from './unified/UnifiedServer.js';
import { XmlDataService } from './service/XmlDataService.js';
import { XmlChangeNotifier } from './xml/XmlChangeNotifier.js';
import { Logger } from './utils/logger.js';
import {
  createTimeOfDay,
  createOnCourse,
  createResults,
  createRaceConfig,
  createSchedule,
} from './protocol/index.js';
import { WindowsConfigDetector, getAppSettings } from './config/index.js';
import type { AvailableXmlPaths, XmlPathDetectionResult, XmlSourceMode } from './config/index.js';

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
  /** Unified server port (default: 27123) - HTTP + WebSocket on single port */
  port?: number;
  /** Enable Canoe123 XML autodetection on Windows (default: true) */
  xmlAutoDetect?: boolean;
  /** Canoe123 autodetection check interval in ms (default: 30000) */
  xmlAutoDetectInterval?: number;
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
  port: 27123, // Unified server port (HTTP + WebSocket)
  xmlAutoDetect: true,
  xmlAutoDetectInterval: 30000,
};

/**
 * Main C123 Server orchestration.
 *
 * Coordinates all components:
 * - UDP discovery (auto-find C123)
 * - TCP source (C123 connection)
 * - XML file source (optional)
 * - Event state (finish detection, race tracking)
 * - UnifiedServer (HTTP + WebSocket on single port 27123)
 */
export class Server extends EventEmitter<ServerEvents> {
  private readonly config: Required<ServerConfig>;

  private udpDiscovery: UdpDiscovery | null = null;
  private tcpSource: TcpSource | null = null;
  private xmlSource: XmlFileSource | null = null;
  private xmlChangeNotifier: XmlChangeNotifier | null = null;
  private eventState: EventState;
  private unifiedServer: UnifiedServer;
  private xmlDataService: XmlDataService;
  private windowsConfigDetector: WindowsConfigDetector | null = null;

  private isRunning = false;
  private discoveredHost: string | null = null;
  private xmlPathSource: 'manual' | 'autodetect' | null = null;

  constructor(config?: ServerConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.eventState = new EventState();
    this.unifiedServer = new UnifiedServer({ port: this.config.port });
    this.xmlDataService = new XmlDataService();

    this.setupEventHandlers();
  }

  /**
   * Start the server and all components
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Start unified server (HTTP + WebSocket on single port)
    await this.unifiedServer.start();

    // Register components with unified server
    this.unifiedServer.setEventState(this.eventState);
    this.unifiedServer.setXmlDataService(this.xmlDataService);
    this.unifiedServer.setServer(this);

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
      this.xmlPathSource = 'manual';
    }

    // Start XML autodetection if enabled and no manual path set
    if (this.config.xmlAutoDetect && !this.config.xmlPath) {
      this.startAutoDetection();
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
    this.stopAutoDetection();

    // Stop unified server
    await this.unifiedServer.stop();

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
   * Get the unified server port (HTTP + WebSocket)
   */
  getPort(): number {
    return this.unifiedServer.getPort();
  }

  /**
   * Manually set TCP source host (useful for switching)
   */
  setTcpHost(host: string, port?: number): void {
    this.tcpSource?.stop();
    this.startTcpSource(host, port ?? this.config.tcpPort);
  }

  /**
   * Set XML source path manually (disables autodetect)
   */
  setXmlPath(path: string, saveToSettings: boolean = true): void {
    this.xmlSource?.stop();
    this.xmlChangeNotifier?.stop();
    this.config.xmlPath = path;
    this.xmlDataService.setPath(path);
    this.xmlPathSource = path ? 'manual' : null;

    if (saveToSettings && path) {
      getAppSettings().setXmlPath(path);
      this.stopAutoDetection();
    }

    if (path) {
      this.startXmlSource();
      this.startXmlChangeNotifier();
    }
  }

  /**
   * Enable XML autodetection (Windows only)
   */
  enableXmlAutoDetect(): void {
    getAppSettings().enableAutoDetect();
    this.config.xmlAutoDetect = true;
    this.startAutoDetection();
  }

  /**
   * Disable XML autodetection
   */
  disableXmlAutoDetect(): void {
    getAppSettings().disableAutoDetect();
    this.config.xmlAutoDetect = false;
    this.stopAutoDetection();
  }

  /**
   * Get current XML path info
   */
  getXmlPathInfo(): {
    path: string | null;
    source: 'manual' | 'autodetect' | null;
    autoDetectEnabled: boolean;
    mode: XmlSourceMode;
  } {
    return {
      path: this.config.xmlPath || null,
      source: this.xmlPathSource,
      autoDetectEnabled: this.config.xmlAutoDetect,
      mode: getAppSettings().getXmlSourceMode(),
    };
  }

  /**
   * Get available XML paths (from Canoe123 config)
   */
  getAvailableXmlPaths(): AvailableXmlPaths & { error?: string } {
    if (!WindowsConfigDetector.isWindows()) {
      return {
        main: { path: null, exists: false },
        offline: { path: null, exists: false },
        error: 'Autodetection is only available on Windows',
      };
    }

    const detector = new WindowsConfigDetector();
    return detector.getAvailablePaths();
  }

  /**
   * Set XML source mode
   */
  setXmlSourceMode(mode: XmlSourceMode): void {
    getAppSettings().setXmlSourceMode(mode);

    if (mode === 'manual') {
      // Keep current manual path if any
      this.stopAutoDetection();
    } else {
      // Clear manual path, start autodetection with selected mode
      this.config.xmlPath = '';
      this.config.xmlAutoDetect = true;

      // Detect immediately with the new mode
      const detector = new WindowsConfigDetector();
      const result = detector.detectByMode(mode);
      if (result.path && result.exists) {
        this.setXmlPath(result.path, false);
        this.xmlPathSource = 'autodetect';
        getAppSettings().update({ lastAutoDetectedPath: result.path });
      }

      // Start monitoring with the mode-aware detection
      this.startAutoDetectionWithMode(mode);
    }
  }

  /**
   * Start auto-detection with a specific mode
   */
  private startAutoDetectionWithMode(mode: XmlSourceMode): void {
    if (!WindowsConfigDetector.isWindows()) {
      Logger.info('Server', 'XML autodetection is only available on Windows');
      return;
    }

    this.stopAutoDetection();

    this.windowsConfigDetector = new WindowsConfigDetector();

    const handleResult = (result: XmlPathDetectionResult) => {
      if (result.path && result.exists) {
        Logger.info('Server', `Autodetected XML (${mode}): ${result.path}`);
        if (result.path !== this.config.xmlPath) {
          this.setXmlPath(result.path, false);
          this.xmlPathSource = 'autodetect';
          getAppSettings().update({ lastAutoDetectedPath: result.path });
        }
      } else if (result.error) {
        Logger.warn('Server', `Autodetection (${mode}): ${result.error}`);
      }
    };

    // Initial detection with mode
    const initialResult = this.windowsConfigDetector.detectByMode(mode);
    handleResult(initialResult);

    // Periodic check
    const checkInterval = setInterval(() => {
      try {
        const detector = new WindowsConfigDetector();
        const result = detector.detectByMode(mode);
        handleResult(result);
      } catch (error) {
        Logger.error('Server', `Autodetection error: ${(error as Error).message}`);
      }
    }, this.config.xmlAutoDetectInterval);

    // Store interval for cleanup - we need to override the detector's internal interval
    (this.windowsConfigDetector as unknown as { customInterval: NodeJS.Timeout }).customInterval = checkInterval;
  }

  /**
   * Initialize from saved settings
   */
  initFromSettings(): void {
    const settings = getAppSettings().load();
    Logger.info('Server', `Loaded settings from ${getAppSettings().getPath()}`);

    // Apply saved port if not overridden by CLI/env
    if (settings.port && this.config.port === DEFAULT_CONFIG.port) {
      this.config.port = settings.port;
      // Update UnifiedServer with new port
      this.unifiedServer = new UnifiedServer({ port: this.config.port });
      this.setupEventHandlers();
    }

    // Apply autodetect interval if set
    if (settings.xmlAutoDetectInterval) {
      this.config.xmlAutoDetectInterval = settings.xmlAutoDetectInterval;
    }

    // Handle XML source mode
    const mode = settings.xmlSourceMode ?? 'auto-offline';

    if (mode === 'manual' && settings.xmlPath && !this.config.xmlPath) {
      // Use saved manual path if no CLI path provided
      this.config.xmlPath = settings.xmlPath;
      this.xmlPathSource = 'manual';
      this.config.xmlAutoDetect = false;
    } else if (mode !== 'manual' && !this.config.xmlPath) {
      // Auto mode - enable autodetection
      this.config.xmlAutoDetect = true;
    }
  }

  private startAutoDetection(): void {
    if (!WindowsConfigDetector.isWindows()) {
      Logger.info('Server', 'XML autodetection is only available on Windows');
      return;
    }

    this.stopAutoDetection();

    this.windowsConfigDetector = new WindowsConfigDetector();

    this.windowsConfigDetector.on('detected', (result: XmlPathDetectionResult) => {
      this.handleAutoDetectedPath(result);
    });

    this.windowsConfigDetector.on('changed', (result: XmlPathDetectionResult) => {
      Logger.info('Server', 'Canoe123 XML path changed, updating...');
      this.handleAutoDetectedPath(result);
    });

    this.windowsConfigDetector.on('error', (error: Error) => {
      Logger.error('Server', `Autodetection error: ${error.message}`);
    });

    this.windowsConfigDetector.startMonitoring(this.config.xmlAutoDetectInterval);
  }

  private stopAutoDetection(): void {
    if (this.windowsConfigDetector) {
      this.windowsConfigDetector.stopMonitoring();
      // Also clear custom interval if set
      const customInterval = (this.windowsConfigDetector as unknown as { customInterval?: NodeJS.Timeout })
        .customInterval;
      if (customInterval) {
        clearInterval(customInterval);
      }
      this.windowsConfigDetector = null;
    }
  }

  private handleAutoDetectedPath(result: XmlPathDetectionResult): void {
    if (result.path && result.exists) {
      Logger.info('Server', `Autodetected XML: ${result.path} (source: ${result.source})`);

      // Only update if path changed
      if (result.path !== this.config.xmlPath) {
        this.setXmlPath(result.path, false); // Don't save to settings, it's autodetected
        this.xmlPathSource = 'autodetect';

        // Update last autodetected path in settings
        getAppSettings().update({ lastAutoDetectedPath: result.path });
      }
    } else if (result.error) {
      Logger.warn('Server', `Autodetection: ${result.error}`);
    }
  }

  /**
   * Handle TCP disconnection - reset UDP discovery status for correct indicator
   */
  private handleTcpDisconnect(): void {
    // Only reset if we're using auto-discovery
    if (!this.config.autoDiscovery || this.config.tcpHost) {
      return;
    }

    // Reset UDP discovery state for correct status indicator
    // Note: We keep discoveredHost so re-discovery of same host is ignored
    // (TcpSource handles reconnect on its own)
    if (this.udpDiscovery) {
      this.udpDiscovery.reset();
      Logger.info('Server', 'TCP disconnected - UDP discovery reset for status update');
    }
  }

  private setupEventHandlers(): void {
    // Log race changes
    this.eventState.on('raceChange', (raceId) => {
      Logger.info('Server', `Race changed to: ${raceId}`);
    });

    // Log finish detection
    this.eventState.on('finish', (competitor) => {
      Logger.info('Server', `Finish detected: bib ${competitor.bib}`);
    });

    // Log errors
    this.unifiedServer.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private startUdpDiscovery(): void {
    this.udpDiscovery = new UdpDiscovery({ port: this.config.udpPort });

    // Use adapter to provide status for admin display
    const adapter = new UdpDiscoverySourceAdapter(this.udpDiscovery);
    this.unifiedServer.registerSource('UDP Discovery', 'udp', adapter as unknown as Source, {
      port: this.config.udpPort,
    });

    this.udpDiscovery.on('discovered', (host) => {
      // Check if this is a new host or re-discovery of the same host
      if (this.discoveredHost === host) {
        // Same host re-discovered - TcpSource is already handling reconnect
        Logger.debug('Server', `Re-discovered same C123 at ${host}, TcpSource handling reconnect`);
        return;
      }

      if (this.discoveredHost && this.discoveredHost !== host) {
        // Different host discovered - stop old TcpSource and connect to new one
        Logger.info('Server', `C123 moved from ${this.discoveredHost} to ${host}`);
        this.tcpSource?.stop();
      }

      this.discoveredHost = host;
      this.startTcpSource(host, this.config.tcpPort);
    });

    this.udpDiscovery.on('error', (err) => {
      this.emit('error', err);
    });

    this.udpDiscovery.start();
  }

  private startTcpSource(host: string, port: number): void {
    // Stop existing TcpSource if any (prevents duplicate connections)
    if (this.tcpSource) {
      this.tcpSource.stop();
    }

    this.tcpSource = new TcpSource({ host, port });

    this.unifiedServer.registerSource('C123 TCP', 'tcp', this.tcpSource, {
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
        // Reset UDP discovery to allow re-discovery
        // (C123 might have moved to a different IP)
        this.handleTcpDisconnect();
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

    this.unifiedServer.registerSource('XML File', 'xml', this.xmlSource, {
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
      this.unifiedServer.broadcastXmlChange(sections, checksum);
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

        // Update internal state (for finish detection, etc.)
        this.eventState.processMessage(parsed);

        // Broadcast C123 message to all clients
        this.broadcastParsedMessage(parsed);
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
        this.unifiedServer.broadcast(createTimeOfDay(message.data));
        break;
      case 'oncourse':
        this.unifiedServer.broadcast(createOnCourse(message.data));
        break;
      case 'results':
        // Only broadcast results marked as current (active race)
        if (message.data.isCurrent) {
          this.unifiedServer.broadcast(createResults(message.data));
        }
        break;
      case 'raceconfig':
        this.unifiedServer.broadcast(createRaceConfig(message.data));
        break;
      case 'schedule':
        this.unifiedServer.broadcast(createSchedule(message.data));
        break;
    }
  }
}
