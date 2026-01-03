import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { C123XmlChange, XmlSection } from '../protocol/types.js';
import { Logger } from '../utils/logger.js';

/**
 * Events emitted by XmlWebSocketServer
 */
export interface XmlWebSocketServerEvents {
  connection: [clientId: string];
  disconnection: [clientId: string];
  error: [error: Error];
}

/**
 * Configuration for XmlWebSocketServer
 */
export interface XmlWebSocketServerConfig {
  /** Port to listen on (default: 27085) */
  port?: number;
}

const DEFAULT_PORT = 0; // Use dynamic port by default for test safety

/**
 * WebSocket server for XML change notifications.
 *
 * Clients connect to receive push notifications when the XML file changes.
 * Notifications include which sections changed and the new checksum.
 * Clients can then fetch the changed data via REST API.
 */
export class XmlWebSocketServer extends EventEmitter<XmlWebSocketServerEvents> {
  private readonly port: number;
  private server: WsServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private clientIdCounter = 0;

  constructor(config?: Partial<XmlWebSocketServerConfig>) {
    super();
    this.port = config?.port ?? DEFAULT_PORT;
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.server = new WsServer({ port: this.port });

      this.server.on('listening', () => {
        Logger.info('XmlWS', `Server listening on port ${this.getPort()}`);
        resolve();
      });

      this.server.on('error', (err) => {
        if (!this.server) {
          reject(err);
        } else {
          this.emit('error', err);
        }
      });

      this.server.on('connection', (ws) => {
        this.handleConnection(ws);
      });
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      // Close all WebSocket connections
      for (const client of this.server.clients) {
        client.terminate();
      }

      // Emit disconnection events
      for (const [clientId] of this.clients) {
        this.emit('disconnection', clientId);
      }
      this.clients.clear();

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
    if (this.server) {
      const addr = this.server.address();
      if (addr && typeof addr === 'object') {
        return addr.port;
      }
    }
    return this.port;
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast an XML change notification to all connected clients
   */
  broadcastChange(sections: XmlSection[], checksum: string): void {
    const message: C123XmlChange = {
      type: 'XmlChange',
      timestamp: new Date().toISOString(),
      data: {
        sections,
        checksum,
      },
    };

    const json = JSON.stringify(message);

    for (const [clientId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      } else {
        // Clean up dead connections
        this.clients.delete(clientId);
        this.emit('disconnection', clientId);
      }
    }

    Logger.debug('XmlWS', `Broadcast change: ${sections.join(', ')} to ${this.clients.size} clients`);
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = `xml-client-${++this.clientIdCounter}`;
    this.clients.set(clientId, ws);
    Logger.info('XmlWS', `Client connected: ${clientId}`);
    this.emit('connection', clientId);

    ws.on('close', () => {
      this.clients.delete(clientId);
      Logger.info('XmlWS', `Client disconnected: ${clientId}`);
      this.emit('disconnection', clientId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.clients.delete(clientId);
      this.emit('disconnection', clientId);
    });
  }
}
