import { EventEmitter } from 'node:events';

/**
 * Source status
 */
export type SourceStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Events emitted by data sources:
 * - 'message': (xml: string) - Raw XML message received
 * - 'status': (status: SourceStatus) - Connection status changed
 * - 'error': (error: Error) - Error occurred
 */
export interface SourceEvents {
  message: [xml: string];
  status: [status: SourceStatus];
  error: [error: Error];
}

/**
 * Base interface for all data sources
 */
export interface Source extends EventEmitter<SourceEvents> {
  /** Current connection status */
  readonly status: SourceStatus;
  /** Start the source */
  start(): void;
  /** Stop the source */
  stop(): void;
}

/**
 * Interface for sources that support writing back to C123
 */
export interface WritableSource extends Source {
  /** Check if the source is currently writable */
  readonly isWritable: boolean;
  /** Write an XML message to C123 */
  write(xml: string): Promise<void>;
}

/**
 * Configuration for TcpSource
 */
export interface TcpSourceConfig {
  /** C123 host address */
  host: string;
  /** C123 port (default 27333) */
  port?: number;
  /** Initial reconnect delay in ms (default 1000) */
  initialReconnectDelay?: number;
  /** Maximum reconnect delay in ms (default 30000) */
  maxReconnectDelay?: number;
}
