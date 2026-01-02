import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { EventStateData } from '../state/types.js';
import type { WebSocketServerConfig, WebSocketServerEvents } from './types.js';
import { formatAllMessages } from './MessageFormatter.js';

const DEFAULT_PORT = 27084;

/**
 * WebSocket server for scoreboard connections.
 *
 * Provides CLI-compatible JSON messages to connected scoreboards.
 * Broadcasts state changes to all connected clients.
 */
export class WebSocketServer extends EventEmitter<WebSocketServerEvents> {
  private readonly port: number;
  private server: WsServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private clientIdCounter = 0;
  private lastState: EventStateData | null = null;

  constructor(config?: Partial<WebSocketServerConfig>) {
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

      // Close all client connections
      for (const [clientId, ws] of this.clients) {
        ws.close();
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
    return this.port;
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Broadcast state to all connected clients
   */
  broadcast(state: EventStateData): void {
    this.lastState = state;

    const messages = formatAllMessages(state);
    for (const message of messages) {
      this.broadcastRaw(message);
    }
  }

  /**
   * Send raw message to all connected clients
   */
  private broadcastRaw(message: string): void {
    for (const [clientId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        // Clean up dead connections
        this.clients.delete(clientId);
        this.emit('disconnection', clientId);
      }
    }
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = `client-${++this.clientIdCounter}`;
    this.clients.set(clientId, ws);
    this.emit('connection', clientId);

    // Send current state to new client
    if (this.lastState) {
      const messages = formatAllMessages(this.lastState);
      for (const message of messages) {
        ws.send(message);
      }
    }

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.emit('disconnection', clientId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.clients.delete(clientId);
      this.emit('disconnection', clientId);
    });
  }
}
