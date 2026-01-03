import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'node:events';

/**
 * Events emitted by FileWatcher
 */
export interface FileWatcherEvents {
  change: [path: string];
  error: [error: Error];
  ready: [];
}

/**
 * Watch mode: native fs events or polling
 */
export type WatchMode = 'native' | 'polling';

/**
 * Configuration for FileWatcher
 */
export interface FileWatcherConfig {
  /** Path to watch (file or directory) */
  path: string;
  /** Watch mode: 'native' for fs events, 'polling' for interval-based (default: 'native') */
  mode?: WatchMode;
  /** Poll interval in ms when using polling mode (default: 1000) */
  pollInterval?: number;
  /** Debounce delay in ms for rapid changes (default: 100) */
  debounceMs?: number;
}

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_DEBOUNCE_MS = 100;

/**
 * Cross-platform file watcher using chokidar.
 *
 * Features:
 * - Native fs events on Windows (ReadDirectoryChangesW) and Linux (inotify)
 * - Fallback to polling for network paths (SMB shares)
 * - Debounce for rapid changes (C123 writes frequently)
 *
 * Usage:
 * ```ts
 * const watcher = new FileWatcher({ path: './data.xml' });
 * watcher.on('change', (path) => console.log('Changed:', path));
 * watcher.start();
 * ```
 */
export class FileWatcher extends EventEmitter<FileWatcherEvents> {
  private readonly path: string;
  private readonly mode: WatchMode;
  private readonly pollInterval: number;
  private readonly debounceMs: number;

  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChange = false;

  constructor(config: FileWatcherConfig) {
    super();
    this.path = config.path;
    this.mode = config.mode ?? 'native';
    this.pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL;
    this.debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  }

  /**
   * Start watching the file/directory.
   */
  start(): void {
    if (this.watcher) {
      return; // Already running
    }

    const usePolling = this.mode === 'polling' || this.isNetworkPath(this.path);

    const options: Parameters<typeof watch>[1] = {
      persistent: true,
      usePolling,
      // Ignore initial add event - we only care about changes
      ignoreInitial: true,
      // Await write finish before emitting (helps with large files)
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 50,
      },
    };

    if (usePolling) {
      options.interval = this.pollInterval;
    }

    this.watcher = watch(this.path, options);

    this.watcher.on('change', (path) => {
      this.handleChange(path);
    });

    this.watcher.on('error', (error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
    });

    this.watcher.on('ready', () => {
      this.emit('ready');
    });
  }

  /**
   * Stop watching.
   */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.pendingChange = false;
  }

  /**
   * Check if a path is a network path (SMB/UNC on Windows).
   * Network paths typically don't support native fs events.
   */
  private isNetworkPath(path: string): boolean {
    // Windows UNC path: \\server\share
    if (path.startsWith('\\\\')) {
      return true;
    }
    // Mapped network drive detection is more complex,
    // but UNC paths are the most common case
    return false;
  }

  /**
   * Handle file change with debouncing.
   * Debouncing prevents multiple rapid events when C123 writes frequently.
   */
  private handleChange(path: string): void {
    // Mark that we have a pending change
    this.pendingChange = true;

    // If we already have a debounce timer, let it run
    if (this.debounceTimer) {
      return;
    }

    // Start debounce timer
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;

      if (this.pendingChange) {
        this.pendingChange = false;
        this.emit('change', path);
      }
    }, this.debounceMs);
  }
}
