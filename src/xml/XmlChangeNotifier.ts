import { EventEmitter } from 'node:events';
import fsPromises from 'node:fs/promises';
import crypto from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { FileWatcher, type WatchMode } from '../sources/FileWatcher.js';
import type { XmlSection } from '../protocol/types.js';

/**
 * Events emitted by XmlChangeNotifier
 */
export interface XmlChangeNotifierEvents {
  change: [sections: XmlSection[], checksum: string];
  error: [error: Error];
}

/**
 * Configuration for XmlChangeNotifier
 */
export interface XmlChangeNotifierConfig {
  /** Path to XML file */
  path: string;
  /** Watch mode: 'native' for fs events, 'polling' for interval-based (default: 'native') */
  watchMode?: WatchMode;
  /** Poll interval in ms when using polling mode (default: 1000) */
  pollInterval?: number;
  /** Debounce delay in ms for rapid changes (default: 100) */
  debounceMs?: number;
}

/**
 * Hashes for each XML section
 */
interface SectionHashes {
  Participants: string | null;
  Schedule: string | null;
  Results: string | null;
  Classes: string | null;
}

const ALL_SECTIONS: XmlSection[] = ['Participants', 'Schedule', 'Results', 'Classes'];

/**
 * Monitors an XML file for changes and detects which sections changed.
 *
 * Uses chokidar for efficient file watching and computes per-section
 * hashes to determine exactly which parts of the XML changed.
 */
export class XmlChangeNotifier extends EventEmitter<XmlChangeNotifierEvents> {
  private readonly path: string;
  private readonly watchMode: WatchMode;
  private readonly pollInterval: number;
  private readonly debounceMs: number;

  private fileWatcher: FileWatcher | null = null;
  private lastHashes: SectionHashes = {
    Participants: null,
    Schedule: null,
    Results: null,
    Classes: null,
  };
  private lastChecksum: string | null = null;
  private parser: XMLParser;

  constructor(config: XmlChangeNotifierConfig) {
    super();
    this.path = config.path;
    this.watchMode = config.watchMode ?? 'native';
    this.pollInterval = config.pollInterval ?? 1000;
    this.debounceMs = config.debounceMs ?? 100;

    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseTagValue: false, // Keep as strings for consistent hashing
      trimValues: true,
    });
  }

  /**
   * Start watching the XML file for changes
   */
  start(): void {
    if (this.fileWatcher) {
      return;
    }

    this.fileWatcher = new FileWatcher({
      path: this.path,
      mode: this.watchMode,
      pollInterval: this.pollInterval,
      debounceMs: this.debounceMs,
    });

    this.fileWatcher.on('change', () => {
      this.checkForChanges();
    });

    this.fileWatcher.on('error', (error) => {
      this.emit('error', error);
    });

    this.fileWatcher.on('ready', () => {
      // Initial read to establish baseline
      this.checkForChanges();
    });

    this.fileWatcher.start();

    // Also do an initial read immediately
    this.checkForChanges();
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.fileWatcher) {
      await this.fileWatcher.stop();
      this.fileWatcher = null;
    }
  }

  /**
   * Get the current file checksum
   */
  getChecksum(): string | null {
    return this.lastChecksum;
  }

  /**
   * Check for changes in the XML file
   */
  private async checkForChanges(): Promise<void> {
    try {
      const content = await fsPromises.readFile(this.path, 'utf-8');

      // Calculate overall file checksum
      const checksum = this.computeHash(content);

      // Skip if file hasn't changed
      if (checksum === this.lastChecksum) {
        return;
      }

      const previousChecksum = this.lastChecksum;
      this.lastChecksum = checksum;

      // Parse XML
      const parsed = this.parser.parse(content);
      if (!parsed.Canoe123Data) {
        this.emit('error', new Error('Invalid XML: not a Canoe123 file'));
        return;
      }

      const data = parsed.Canoe123Data;

      // Compute hashes for each section
      const newHashes: SectionHashes = {
        Participants: this.computeSectionHash(data.Participants),
        Schedule: this.computeSectionHash(data.Schedule),
        Results: this.computeSectionHash(data.Results),
        Classes: this.computeSectionHash(data.Classes),
      };

      // Detect which sections changed
      const changedSections: XmlSection[] = [];

      for (const section of ALL_SECTIONS) {
        const oldHash = this.lastHashes[section];
        const newHash = newHashes[section];

        // Section changed if:
        // - Both exist and hashes differ
        // - One exists and other doesn't
        if (oldHash !== newHash) {
          changedSections.push(section);
        }
      }

      // Update stored hashes
      this.lastHashes = newHashes;

      // Emit change event
      // On first read (previousChecksum is null), emit all sections that have data
      if (previousChecksum === null) {
        const presentSections = ALL_SECTIONS.filter((s) => newHashes[s] !== null);
        if (presentSections.length > 0) {
          this.emit('change', presentSections, checksum);
        }
      } else if (changedSections.length > 0) {
        this.emit('change', changedSections, checksum);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.emit('error', error);
      }
    }
  }

  /**
   * Compute a hash for a section's data
   */
  private computeSectionHash(data: unknown): string | null {
    if (data === undefined || data === null) {
      return null;
    }

    const json = JSON.stringify(data);
    return crypto.createHash('md5').update(json).digest('hex');
  }

  /**
   * Compute a hash for raw content
   */
  private computeHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}
