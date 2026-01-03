import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { ScoreboardConfig } from '../admin/types.js';
import type { WebSocketServerConfig, WebSocketServerEvents } from './types.js';
import type { C123Message } from '../protocol/types.js';
import { ScoreboardSession } from './ScoreboardSession.js';
import { Logger } from '../utils/logger.js';

const DEFAULT_PORT = 27084;

/**
 * WebSocket server for scoreboard connections.
 *
 * @deprecated This class is deprecated and will be removed in a future version.
 * Use UnifiedServer instead, which combines Admin, WebSocket, and XML WebSocket
 * functionality on a single port (27123) with WebSocket at /ws path.
 *
 * Broadcasts C123 protocol messages to connected scoreboards.
 * Supports per-scoreboard configuration via ScoreboardSession.
 */
export class WebSocketServer extends EventEmitter<WebSocketServerEvents> {
  private readonly port: number;
  private server: WsServer | null = null;
  private sessions: Map<string, ScoreboardSession> = new Map();
  private clientIdCounter = 0;

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
        Logger.info('WebSocket', `Server listening on port ${this.getPort()}`);
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

      // Close all WebSocket connections first
      for (const client of this.server.clients) {
        client.terminate();
      }

      // Emit disconnection events and clear sessions
      for (const [clientId] of this.sessions) {
        this.emit('disconnection', clientId);
      }
      this.sessions.clear();

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
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = `client-${++this.clientIdCounter}`;
    const session = new ScoreboardSession(clientId, ws);
    this.sessions.set(clientId, session);
    Logger.info('WebSocket', `Client connected: ${clientId}`);
    this.emit('connection', clientId);

    ws.on('close', () => {
      this.sessions.delete(clientId);
      Logger.info('WebSocket', `Client disconnected: ${clientId}`);
      this.emit('disconnection', clientId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.sessions.delete(clientId);
      this.emit('disconnection', clientId);
    });
  }
}
