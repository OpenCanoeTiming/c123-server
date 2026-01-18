import net from 'node:net';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus, TcpSourceConfig } from './types.js';
import { Logger } from '../utils/logger.js';

const DEFAULT_PORT = 27333;
const DEFAULT_INITIAL_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;

/**
 * TCP source for C123 connection.
 *
 * Connects to C123 timing system via TCP, handles pipe-delimited XML messages,
 * and provides automatic reconnection with exponential backoff.
 */
export class TcpSource extends EventEmitter<SourceEvents> implements Source {
  private readonly host: string;
  private readonly port: number;
  private readonly initialReconnectDelay: number;
  private readonly maxReconnectDelay: number;

  private socket: net.Socket | null = null;
  private buffer = '';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentReconnectDelay: number;
  private _status: SourceStatus = 'disconnected';
  private shouldReconnect = false;

  constructor(config: TcpSourceConfig) {
    super();
    this.host = config.host;
    this.port = config.port ?? DEFAULT_PORT;
    this.initialReconnectDelay = config.initialReconnectDelay ?? DEFAULT_INITIAL_RECONNECT_DELAY;
    this.maxReconnectDelay = config.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY;
    this.currentReconnectDelay = this.initialReconnectDelay;
  }

  get status(): SourceStatus {
    return this._status;
  }

  private setStatus(status: SourceStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('status', status);
    }
  }

  /**
   * Start the TCP connection to C123.
   * Will automatically reconnect on disconnection.
   */
  start(): void {
    this.shouldReconnect = true;
    this.connect();
  }

  /**
   * Stop the TCP connection.
   * Clears any pending reconnection attempts.
   */
  stop(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.buffer = '';
    this.setStatus('disconnected');
  }

  private connect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    Logger.info('TcpSource', `Connecting to ${this.host}:${this.port}`);
    this.setStatus('connecting');
    this.buffer = '';

    const socket = new net.Socket();
    this.socket = socket;

    socket.connect(this.port, this.host, () => {
      Logger.info('TcpSource', `Connected to ${this.host}:${this.port}`);
      this.currentReconnectDelay = this.initialReconnectDelay;
      this.setStatus('connected');
    });

    socket.on('data', (data) => {
      this.handleData(data);
    });

    socket.on('close', () => {
      Logger.info('TcpSource', 'Connection closed');
      this.socket = null;
      this.setStatus('disconnected');
      this.scheduleReconnect();
    });

    socket.on('error', (err) => {
      Logger.error('TcpSource', 'Connection error', err);
      this.emit('error', err);
      // close event will trigger reconnect
    });
  }

  private handleData(data: Buffer): void {
    const text = data.toString('utf8');
    this.buffer += text;

    // C123 uses pipe delimiter between XML messages
    const messages = this.buffer.split('|');
    this.buffer = messages.pop() ?? '';

    for (const msg of messages) {
      const trimmed = msg.trim();
      if (trimmed) {
        this.emit('message', trimmed);
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectTimer) {
      return;
    }

    Logger.debug('TcpSource', `Reconnecting in ${this.currentReconnectDelay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.connect();
      }
    }, this.currentReconnectDelay);

    // Exponential backoff
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Check if the TCP connection is currently writable.
   */
  get isWritable(): boolean {
    return this.socket !== null && this._status === 'connected' && this.socket.writable;
  }

  /**
   * Write an XML message to C123.
   * The message will be automatically terminated with pipe delimiter.
   *
   * @param xml - XML message to send (without trailing pipe)
   * @returns Promise that resolves when data is written, rejects on error
   * @throws Error if not connected or write fails
   */
  write(xml: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this._status !== 'connected') {
        reject(new Error('Not connected to C123'));
        return;
      }

      if (!this.socket.writable) {
        reject(new Error('Socket is not writable'));
        return;
      }

      // C123 protocol uses pipe delimiter between messages
      const message = xml.endsWith('|') ? xml : xml + '|';

      this.socket.write(message, 'utf8', (err) => {
        if (err) {
          Logger.error('TcpSource', 'Write error', err);
          reject(err);
        } else {
          Logger.info('TcpSource', `Sent ${message.length} bytes to C123`);
          Logger.debug('TcpSource', `Sent: ${xml.substring(0, 200)}${xml.length > 200 ? '...' : ''}`);
          resolve();
        }
      });
    });
  }
}
