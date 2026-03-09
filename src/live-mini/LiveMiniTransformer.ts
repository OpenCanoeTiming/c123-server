/**
 * Live-Mini Transformer
 *
 * Transforms C123 protocol data to live-mini API format.
 * Handles participant ID mapping from XML.
 */

import type { OnCourseCompetitor, ResultsMessage } from '../protocol/parser-types.js';
import type { XmlDataService, XmlParticipant, XmlResultRow } from '../service/XmlDataService.js';
import type { OnCourseInput, ResultInput } from './types.js';
import { Logger } from '../utils/logger.js';

/**
 * Event metadata extracted from XML
 */
export interface EventMetadata {
  mainTitle: string | null;
  eventId: string | null;
  location: string | null;
  discipline: 'Slalom' | 'Sprint' | 'WildWater' | null;
}

/**
 * Transformer for converting C123 data to live-mini format
 */
export class LiveMiniTransformer {
  /** Participant ID mapping: "bib:raceId" -> participantId */
  private participantMap: Map<string, string> = new Map();

  /** Last XML refresh timestamp */
  private lastXmlRefresh: Date | null = null;

  /** OnCourse penalty cache for BR merge: bib -> { pen (seconds), lastSeen } */
  private onCoursePenCache: Map<string, { pen: number; lastSeen: number }> = new Map();

  /** Grace period for OnCourse penalty cache (10s, matching scoreboard) */
  private static ONCOURSE_PEN_GRACE_MS = 10_000;

  constructor(private xmlDataService: XmlDataService) {}

  /**
   * Refresh participant ID mapping from XML
   * Must be called whenever XML changes
   */
  async refreshParticipantMapping(): Promise<void> {
    this.participantMap.clear();

    try {
      const [schedule, participants] = await Promise.all([
        this.xmlDataService.getSchedule(),
        this.xmlDataService.getParticipants(),
      ]);

      // Build participant map by class
      const participantsByClass = new Map<string, XmlParticipant[]>();
      for (const p of participants) {
        if (!participantsByClass.has(p.classId)) {
          participantsByClass.set(p.classId, []);
        }
        participantsByClass.get(p.classId)!.push(p);
      }

      // For each race, map all participants of that class
      for (const scheduleItem of schedule) {
        const classId = scheduleItem.classId;
        if (!classId) continue;

        const classParticipants = participantsByClass.get(classId) ?? [];
        for (const participant of classParticipants) {
          const key = this.makeKey(participant.bib, scheduleItem.raceId);
          this.participantMap.set(key, participant.id);
        }
      }

      this.lastXmlRefresh = new Date();
      Logger.info(
        'LiveMiniTransformer',
        `Refreshed participant mapping: ${this.participantMap.size} entries`
      );
    } catch (error) {
      Logger.error(
        'LiveMiniTransformer',
        'Failed to refresh participant mapping',
        error
      );
      throw error;
    }
  }

  /**
   * Transform OnCourse competitor to live-mini format
   * Returns null if participant mapping is not available
   */
  transformOnCourse(competitor: OnCourseCompetitor): OnCourseInput | null {
    const key = this.makeKey(competitor.bib, competitor.raceId);
    const participantId = this.participantMap.get(key);

    if (!participantId) {
      Logger.warn(
        'LiveMiniTransformer',
        `No participant ID for bib=${competitor.bib} raceId=${competitor.raceId}`
      );
      return null;
    }

    return {
      participantId,
      raceId: competitor.raceId,
      bib: parseInt(competitor.bib, 10),
      name: competitor.name,
      club: competitor.club,
      position: competitor.position,
      gates: this.parseGatesOnCourse(competitor.gates),
      dtStart: this.formatTimestampISO(competitor.dtStart),
      dtFinish: this.formatTimestampISO(competitor.dtFinish),
      time: this.parseFormattedTimeToCentiseconds(competitor.time),
      pen: Math.round(competitor.pen * 100), // seconds → centiseconds
      total: this.parseFormattedTimeToCentiseconds(competitor.total),
      rank: competitor.rank > 0 ? competitor.rank : null,
      ttbDiff: competitor.ttbDiff || null,
      ttbName: competitor.ttbName || null,
    };
  }

  /**
   * Update OnCourse penalty cache.
   * Called on every EventState change to keep cache fresh.
   * Entries kept for 10s grace period after competitor leaves OnCourse.
   */
  updateOnCoursePenalties(onCourse: OnCourseCompetitor[]): void {
    const now = Date.now();
    const currentBibs = new Set(onCourse.map(c => c.bib));

    // Update current competitors
    for (const oc of onCourse) {
      this.onCoursePenCache.set(oc.bib, { pen: oc.pen, lastSeen: now });
    }

    // Cleanup: remove entries not seen for > grace period
    for (const [bib, entry] of this.onCoursePenCache) {
      if (!currentBibs.has(bib) && now - entry.lastSeen > LiveMiniTransformer.ONCOURSE_PEN_GRACE_MS) {
        this.onCoursePenCache.delete(bib);
      }
    }
  }

  /**
   * Transform Results rows to live-mini format.
   * Returns only rows with valid participant mapping.
   *
   * For BR2 races (detected via raceId pattern /_BR2_/):
   * C123 TCP puts best-run pen/total in standard fields. TCP does NOT
   * include betterRun/totalTotal fields. Corruption is detected per-row
   * via consistency check: Total ≈ Time + Pen → consistent (BR2 is best),
   * otherwise → corrupted (pen/total are from BR1 best-run).
   * Fix: OnCourse penalty cache > XML > TCP passthrough (if consistent) > skip.
   */
  async transformResults(resultsMessage: ResultsMessage): Promise<ResultInput[]> {
    const results: ResultInput[] = [];
    const isBr2 = /_BR2_/.test(resultsMessage.raceId);

    // One-time XML lookup for BR2 race (build bib→XmlResultRow map)
    let xmlByBib: Map<string, XmlResultRow> | null = null;
    if (isBr2) {
      const xmlRows = await this.xmlDataService.getResultsForRace(resultsMessage.raceId);
      if (xmlRows) {
        xmlByBib = new Map(xmlRows.map(r => [r.bib, r]));
      }
    }

    for (const row of resultsMessage.rows) {
      const key = this.makeKey(row.bib, resultsMessage.raceId);
      const participantId = this.participantMap.get(key);

      if (!participantId) {
        Logger.warn(
          'LiveMiniTransformer',
          `No participant ID for bib=${row.bib} raceId=${resultsMessage.raceId}`
        );
        continue;
      }

      let time = this.parseFormattedTimeToCentiseconds(row.time);
      let pen = Math.round(row.pen * 100); // seconds → centiseconds
      let total = this.parseFormattedTimeToCentiseconds(row.total);

      // BR2 race: TCP pen/total may be best-run (BR1) values, not actual BR2
      // Detect per-row via consistency: Total ≈ Time + Pen means data is correct
      if (isBr2) {
        const tcpConsistent = this.isTcpConsistent(row.time, row.pen, row.total);
        const cached = this.onCoursePenCache.get(row.bib);
        const xmlRow = xmlByBib?.get(row.bib);

        if (cached !== undefined) {
          // Priority 1: OnCourse penalty (freshest, includes post-finish corrections)
          pen = Math.round(cached.pen * 100);
          total = time != null ? time + pen : null;
        } else if (xmlRow?.pen != null) {
          // Priority 2: XML penalty (may be stale but correct per-run data)
          pen = xmlRow.pen * 100;
          total = time != null ? time + pen : null;
        } else if (tcpConsistent) {
          // Priority 3: TCP data is consistent → BR2 is the better run, data is correct
          // pen/total already set from TCP, use as-is
        } else {
          // No reliable penalty source and TCP is corrupted → skip
          Logger.debug(
            'LiveMiniTransformer',
            `BR2 merge: no penalty source for bib=${row.bib}, TCP inconsistent, skipping`
          );
          continue;
        }
      }

      results.push({
        participantId,
        raceId: resultsMessage.raceId,
        bib: parseInt(row.bib, 10),
        rnk: row.rank > 0 ? row.rank : null,
        time,
        pen,
        total,
        status: row.status || null,
        catId: null,
        catRnk: null,
        totalBehind: null,
        catTotalBehind: null,
      });
    }

    return results;
  }

  /**
   * Extract event metadata from XML
   */
  async extractEventMetadata(): Promise<EventMetadata> {
    try {
      const eventName = await this.xmlDataService.getEventName();

      return {
        mainTitle: eventName,
        eventId: this.generateEventId(eventName),
        location: null, // Not available in C123 XML
        discipline: 'Slalom', // Default, could be detected from class names
      };
    } catch (error) {
      Logger.warn('LiveMiniTransformer', 'Failed to extract event metadata', error);
      return {
        mainTitle: null,
        eventId: null,
        location: null,
        discipline: null,
      };
    }
  }

  /**
   * Check if participant mapping is available
   */
  hasMappingData(): boolean {
    return this.participantMap.size > 0;
  }

  /**
   * Get last refresh timestamp
   */
  getLastRefresh(): Date | null {
    return this.lastXmlRefresh;
  }

  /**
   * Get mapping size (for debugging)
   */
  getMappingSize(): number {
    return this.participantMap.size;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Check if TCP Result row data is self-consistent: Total ≈ Time + Pen.
   * For BR2 races, C123 puts best-run values in Pen/Total fields.
   * When BR2 is the better run, Pen/Total ARE the BR2 values → consistent.
   * When BR1 is better, Pen/Total are BR1 values but Time is BR2 → inconsistent.
   */
  private isTcpConsistent(time: string | null, pen: number, total: string | null): boolean {
    if (!time || !total) return false;
    const t = parseFloat(time);
    const tot = parseFloat(total);
    if (isNaN(t) || isNaN(tot)) return false;
    return Math.abs(tot - (t + pen)) < 0.02;
  }

  /**
   * Make map key from bib and raceId
   */
  private makeKey(bib: string, raceId: string): string {
    return `${bib.trim()}:${raceId}`;
  }

  /**
   * Parse gates from OnCourse format (comma-separated)
   * Examples:
   *   "" → []
   *   "2,0,50" → [2, 0, 50]
   *   "2,,50" → [2, null, 50]
   */
  private parseGatesOnCourse(gates: string): (number | null)[] {
    if (!gates || gates.trim() === '') {
      return [];
    }

    return gates.split(',').map((g) => {
      const trimmed = g.trim();
      if (trimmed === '') return null;
      const num = parseInt(trimmed, 10);
      return isNaN(num) ? null : num;
    });
  }

  /**
   * Parse formatted time string to centiseconds
   * Examples:
   *   "79.99" → 7999
   *   "78.99" → 7899
   */
  private parseFormattedTimeToCentiseconds(time: string | null): number | null {
    if (!time) return null;
    const parsed = parseFloat(time);
    if (isNaN(parsed)) return null;
    return Math.round(parsed * 100);
  }

  /**
   * Format timestamp to ISO 8601 string
   * Examples:
   *   null → null
   *   "16:14:00.000" → "2024-01-01T16:14:00.000Z" (with current date)
   *   "10:35:11.325" → "2024-01-01T10:35:11.325Z"
   */
  private formatTimestampISO(timestamp: string | null): string | null {
    if (!timestamp) return null;

    try {
      // C123 timestamps are time-only (HH:MM:SS.mmm)
      // Add current date to make it a valid ISO timestamp
      const now = new Date();
      const datePart = now.toISOString().split('T')[0]; // YYYY-MM-DD
      return `${datePart}T${timestamp}Z`;
    } catch {
      return null;
    }
  }

  /**
   * Generate event ID from event name
   * Examples:
   *   "World Cup Prague 2024" → "world-cup-prague-2024"
   */
  private generateEventId(eventName: string | null): string | null {
    if (!eventName) return null;

    return eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
