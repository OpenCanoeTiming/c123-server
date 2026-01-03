import fsPromises from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus } from './types.js';
import { FileWatcher, type WatchMode } from './FileWatcher.js';

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_DEBOUNCE_MS = 100;

/**
 * Configuration for XmlFileSource
 */
export interface XmlFileSourceConfig {
  /** Path to XML file (local path or file:// URL) */
  path: string;
  /** Watch mode: 'native' for fs events, 'polling' for interval-based (default: 'native') */
  watchMode?: WatchMode;
  /** Poll interval in ms when using polling mode (default 1000) */
  pollInterval?: number;
  /** Debounce delay in ms for rapid changes (default: 100) */
  debounceMs?: number;
}

/**
 * File-based XML source with file watching.
 *
 * Reads C123 XML data files and watches for changes using chokidar.
 * The XML file is treated as a "live database" that C123 updates during the race.
 *
 * Features:
 * - Native fs events on Windows (ReadDirectoryChangesW) and Linux (inotify)
 * - Automatic fallback to polling for network paths (SMB shares)
 * - Debounce for rapid changes (C123 writes frequently)
 * - Configurable watch mode and poll interval
 */
export class XmlFileSource extends EventEmitter<SourceEvents> implements Source {
  private readonly path: string;
  private readonly watchMode: WatchMode;
  private readonly pollInterval: number;
  private readonly debounceMs: number;

  private fileWatcher: FileWatcher | null = null;
  private lastModified: number | null = null;
  private _status: SourceStatus = 'disconnected';

  constructor(config: XmlFileSourceConfig) {
    super();
    this.path = this.normalizePath(config.path);
    this.watchMode = config.watchMode ?? 'native';
    this.pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;
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
   * Start watching the XML file for changes.
   */
  start(): void {
    if (this.fileWatcher) {
      return; // Already running
    }

    this.setStatus('connecting');

    // Create file watcher
    this.fileWatcher = new FileWatcher({
      path: this.path,
      mode: this.watchMode,
      pollInterval: this.pollInterval,
      debounceMs: this.debounceMs,
    });

    this.fileWatcher.on('change', () => {
      this.readFile();
    });

    this.fileWatcher.on('error', (error) => {
      this.emit('error', error);
    });

    this.fileWatcher.on('ready', () => {
      // Initial read when watcher is ready
      this.readFile();
    });

    this.fileWatcher.start();

    // Also do an initial read immediately (don't wait for ready event)
    this.readFile();
  }

  /**
   * Stop watching.
   */
  stop(): void {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
      this.fileWatcher = null;
    }

    this.lastModified = null;
    this.setStatus('disconnected');
  }

  /**
   * Read the file and emit its content.
   */
  private async readFile(): Promise<void> {
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
   * Force an immediate read (useful for testing)
   */
  async forceRead(): Promise<void> {
    await this.readFile();
  }

  /**
   * @deprecated Use forceRead() instead
   */
  async forcePoll(): Promise<void> {
    await this.readFile();
  }
}
