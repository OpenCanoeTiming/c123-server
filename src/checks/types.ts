/** A verified gate check */
export interface CheckEntry {
  /** When the check was performed */
  checkedAt: string; // ISO 8601
  /** Penalty value snapshot at time of check (0, 2, 50, or null if no penalty) */
  value: number | null;
  /** Optional tag/note */
  tag?: string;
}

/** A review request (podnět) for a gate */
export interface FlagEntry {
  /** Unique flag ID (nanoid or uuid) */
  id: string;
  /** Bib number for the flag */
  bib: string;
  /** Gate number for the flag */
  gate: number;
  /** When the flag was created */
  createdAt: string; // ISO 8601
  /** Comment describing the issue */
  comment: string;
  /** Suggested penalty value */
  suggestedValue?: number | null;
  /** Whether this flag has been resolved */
  resolved: boolean;
  /** When it was resolved */
  resolvedAt?: string; // ISO 8601
  /** Resolution comment */
  resolution?: string;
}

/** Checks data for a single race */
export interface RaceChecksData {
  /** Map of "bib:gate" → CheckEntry */
  checks: Record<string, CheckEntry>;
  /** Array of flags */
  flags: FlagEntry[];
}

/** Top-level checks file structure (stored on disk) */
export interface ChecksFileData {
  /** XML filename this checks file belongs to */
  xmlFilename: string;
  /** Fingerprint (checksum) of the XML file when checks were created */
  fingerprint: string;
  /** Last modified timestamp */
  lastModified: string; // ISO 8601
  /** Per-race checks data. Key is raceId */
  races: Record<string, RaceChecksData>;
}

/** Events emitted by ChecksStore */
export interface ChecksStoreEvents {
  checkChanged: [data: CheckChangedEvent];
  flagChanged: [data: FlagChangedEvent];
}

export interface CheckChangedEvent {
  event: 'check-set' | 'check-removed' | 'check-invalidated' | 'checks-cleared';
  raceId: string;
  bib?: string;
  gate?: number;
  check?: CheckEntry;
}

export interface FlagChangedEvent {
  event: 'flag-created' | 'flag-resolved' | 'flag-deleted';
  raceId: string;
  flag: FlagEntry;
  /** If resolve created an auto-check */
  check?: CheckEntry;
  bib?: string;
  gate?: number;
}
