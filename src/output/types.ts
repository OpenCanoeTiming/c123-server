/**
 * Events emitted by WebSocketServer
 */
export interface WebSocketServerEvents {
  /** Client connected */
  connection: [clientId: string];
  /** Client disconnected */
  disconnection: [clientId: string];
  /** Error occurred */
  error: [error: Error];
}

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  /** Port to listen on */
  port: number;
}
