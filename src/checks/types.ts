/** A verified gate check */
export interface CheckEntry {
  /** When the check was performed */
  checkedAt: string; // ISO 8601
  /**
   * Penalty value snapshot at the time of the check. Individual races use
   * 0, 2 or 50; team races carry cumulative values such as 52, 100 or 150.
   * Null means the value was not known — the gate was unjudged, or the XML
   * could not be read — which is deliberately distinct from a clean 0.
   */
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
  /**
   * Event fingerprint, pinned on the first write from the schedule valid at
   * that moment. Null until then: a file with no writes has nothing to protect,
   * and the preparation phase before an event is exactly when the schedule
   * churns.
   */
  fingerprint: string | null;
  /** Last modified timestamp */
  lastModified: string; // ISO 8601
  /** Per-race checks data. Key is raceId */
  races: Record<string, RaceChecksData>;
}

/**
 * Outcome of comparing the stored fingerprint against the live schedule.
 *
 * `pending-confirmation` means the schedule looks like a different event but
 * has only been seen once. The caller must re-read the XML and report again:
 * a torn read of a file being rewritten resolves itself, a real event change
 * repeats and then archives.
 */
export type ScheduleValidation = 'ok' | 'pending-confirmation' | 'archived';

/**
 * Outcome of an explicit new-event reset.
 *
 * `archive-failed` and `no-file` both mean nothing changed, but for unrelated
 * reasons that need different answers: one is a transient filesystem problem
 * with the checks intact, the other is a server that has no XML path yet.
 */
export type NewEventReset = 'reset' | 'no-file' | 'archive-failed';

/** Events emitted by ChecksStore */
export interface ChecksStoreEvents {
  checkChanged: [data: CheckChangedEvent];
  flagChanged: [data: FlagChangedEvent];
}

export interface CheckChangedEvent {
  event:
    | 'check-set'
    | 'check-removed'
    | 'check-invalidated'
    | 'checks-cleared'
    | 'checks-reset';
  /** Empty string for 'checks-reset', which discards every race at once. */
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
