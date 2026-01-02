import { WebSocketServer as WsServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import type { EventStateData } from '../state/types.js';
import type { ScoreboardConfig } from '../admin/types.js';
import type { WebSocketServerConfig, WebSocketServerEvents } from './types.js';
import { ScoreboardSession } from './ScoreboardSession.js';

const DEFAULT_PORT = 27084;

/**
 * WebSocket server for scoreboard connections.
 *
 * Provides CLI-compatible JSON messages to connected scoreboards.
 * Broadcasts state changes to all connected clients.
 * Supports per-scoreboard configuration via ScoreboardSession.
 */
export class WebSocketServer extends EventEmitter<WebSocketServerEvents> {
  private readonly port: number;
  private server: WsServer | null = null;
  private sessions: Map<string, ScoreboardSession> = new Map();
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

    // Send updated state with new config applied
    if (this.lastState) {
      session.send(this.lastState);
    }
    return true;
  }

  /**
   * Broadcast state to all connected clients
   */
  broadcast(state: EventStateData): void {
    this.lastState = state;

    for (const [clientId, session] of this.sessions) {
      if (session.isConnected()) {
        session.send(state);
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
    this.emit('connection', clientId);

    // Send current state to new client
    if (this.lastState) {
      session.send(this.lastState);
    }

    ws.on('close', () => {
      this.sessions.delete(clientId);
      this.emit('disconnection', clientId);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
      this.sessions.delete(clientId);
      this.emit('disconnection', clientId);
    });
  }
}
