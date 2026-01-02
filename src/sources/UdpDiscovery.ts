import dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { Logger } from '../utils/logger.js';

const DEFAULT_PORT = 27333;
const DEFAULT_DISCOVERY_TIMEOUT = 30000;

/**
 * Configuration for UdpDiscovery
 */
export interface UdpDiscoveryConfig {
  /** Port to listen on (default 27333) */
  port?: number;
  /** Discovery timeout in ms (default 30000). Set to 0 for no timeout. */
  timeout?: number;
}

/**
 * Events emitted by UdpDiscovery:
 * - 'discovered': (host: string) - C123 host discovered
 * - 'message': (xml: string, host: string) - XML message received
 * - 'error': (error: Error) - Error occurred
 * - 'timeout': () - Discovery timed out without finding C123
 */
export interface UdpDiscoveryEvents {
  discovered: [host: string];
  message: [xml: string, host: string];
  error: [error: Error];
  timeout: [];
}

/**
 * UDP Discovery for C123 auto-detection.
 *
 * Listens for UDP broadcast messages on port 27333.
 * When C123 sends XML data, it detects the source IP and emits 'discovered'.
 * Also emits individual XML messages for optional direct consumption.
 */
export class UdpDiscovery extends EventEmitter<UdpDiscoveryEvents> {
  private readonly port: number;
  private readonly timeout: number;

  private socket: dgram.Socket | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private discoveredHost: string | null = null;
  private isRunning = false;

  constructor(config?: UdpDiscoveryConfig) {
    super();
    this.port = config?.port ?? DEFAULT_PORT;
    this.timeout = config?.timeout ?? DEFAULT_DISCOVERY_TIMEOUT;
  }

  /**
   * Get the discovered C123 host (null if not yet discovered)
   */
  getDiscoveredHost(): string | null {
    return this.discoveredHost;
  }

  /**
   * Check if discovery is currently running
   */
  isListening(): boolean {
    return this.isRunning;
  }

  /**
   * Start listening for UDP broadcasts
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        resolve();
        return;
      }

      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.socket = socket;

      socket.on('error', (err) => {
        if (!this.isRunning) {
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });

      socket.bind(this.port, () => {
        this.isRunning = true;
        this.startTimeoutTimer();
        Logger.info('UdpDiscovery', `Listening on port ${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.clearTimeoutTimer();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isRunning = false;
    Logger.debug('UdpDiscovery', 'Stopped');
  }

  /**
   * Handle incoming UDP message
   */
  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    const host = rinfo.address;
    const xml = msg.toString('utf8').trim();

    // Validate that this looks like C123 XML
    if (!xml.includes('<Canoe123')) {
      return;
    }

    // Emit message event for optional consumption
    this.emit('message', xml, host);

    // First discovery triggers discovered event
    if (!this.discoveredHost) {
      this.discoveredHost = host;
      this.clearTimeoutTimer();
      Logger.info('UdpDiscovery', `Discovered C123 at ${host}`);
      this.emit('discovered', host);
    }
  }

  /**
   * Start timeout timer for discovery
   */
  private startTimeoutTimer(): void {
    if (this.timeout <= 0) {
      return;
    }

    this.timeoutTimer = setTimeout(() => {
      this.timeoutTimer = null;
      if (!this.discoveredHost) {
        this.emit('timeout');
      }
    }, this.timeout);
  }

  /**
   * Clear timeout timer
   */
  private clearTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}
