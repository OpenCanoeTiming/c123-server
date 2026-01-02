import fsPromises from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus } from './types.js';

const DEFAULT_POLL_INTERVAL = 2000;

/**
 * Configuration for XmlFileSource
 */
export interface XmlFileSourceConfig {
  /** Path to XML file (local path or file:// URL) */
  path: string;
  /** Poll interval in ms (default 2000) */
  pollInterval?: number;
}

/**
 * File-based XML source with polling.
 *
 * Reads C123 XML data files and polls for changes.
 * The XML file is treated as a "live database" that C123 updates during the race.
 */
export class XmlFileSource extends EventEmitter<SourceEvents> implements Source {
  private readonly path: string;
  private readonly pollInterval: number;

  private pollTimer: NodeJS.Timeout | null = null;
  private lastModified: number | null = null;
  private _status: SourceStatus = 'disconnected';

  constructor(config: XmlFileSourceConfig) {
    super();
    this.path = this.normalizePath(config.path);
    this.pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL;
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
   * Normalize path - handle file:// URLs
   */
  private normalizePath(path: string): string {
    if (path.startsWith('file://')) {
      // Convert file:// URL to local path
      return new URL(path).pathname;
    }
    return path;
  }

  /**
   * Start polling the XML file for changes.
   */
  start(): void {
    if (this.pollTimer) {
      return; // Already running
    }

    this.setStatus('connecting');

    // Initial read
    this.pollFile();

    // Start polling timer
    this.pollTimer = setInterval(() => {
      this.pollFile();
    }, this.pollInterval);
  }

  /**
   * Stop polling.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.lastModified = null;
    this.setStatus('disconnected');
  }

  /**
   * Poll the file for changes.
   */
  private async pollFile(): Promise<void> {

    try {
      // Check file stats first
      const stats = await fsPromises.stat(this.path);
      const mtime = stats.mtimeMs;

      // Only read if file has changed
      if (this.lastModified !== null && mtime === this.lastModified) {
        return;
      }

      this.lastModified = mtime;

      // Read file content
      const content = await fsPromises.readFile(this.path, 'utf-8');

      // Validate it's C123 XML
      if (!content.includes('<Canoe123')) {
        this.emit('error', new Error('Invalid XML: not a Canoe123 file'));
        return;
      }

      // Update status on first successful read
      if (this._status !== 'connected') {
        this.setStatus('connected');
      }

      // Emit the entire file content as a message
      this.emit('message', content);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Handle file not found gracefully
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        if (this._status === 'connected') {
          // File was available but now gone
          this.setStatus('connecting');
        }
        this.emit('error', new Error(`File not found: ${this.path}`));
      } else {
        this.emit('error', error);
      }
    }
  }

  /**
   * Force an immediate poll (useful for testing)
   */
  async forcePoll(): Promise<void> {
    await this.pollFile();
  }
}
