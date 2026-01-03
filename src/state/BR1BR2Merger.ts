import type { ResultsMessage, ResultRow } from '../protocol/index.js';

/**
 * Cached run result for a competitor
 */
interface CachedRunResult {
  bib: string;
  time: number; // centiseconds
  pen: number;
  total: number; // centiseconds
  rank: number;
  gates: string;
}

/**
 * Cached results for a class (e.g., K1M_ST)
 */
interface ClassCache {
  /** BR1 results by bib */
  br1: Map<string, CachedRunResult>;
  /** BR2 results by bib */
  br2: Map<string, CachedRunResult>;
}

/**
 * Merges BR1 (first run) and BR2 (second run) results.
 *
 * The C123 system only provides complete data for the current run.
 * When showing BR2 results, BR1 data may be incomplete (only PrevTime/PrevTotal available).
 *
 * This merger:
 * 1. Caches BR1 results when they are received
 * 2. Enriches BR2 results with cached BR1 data
 * 3. Calculates TotalTotal (best of both runs) if not provided
 */
export class BR1BR2Merger {
  private cache = new Map<string, ClassCache>();

  /**
   * Process results and return enriched version with both runs data.
   */
  processResults(results: ResultsMessage): ResultsMessage {
    const { raceId, classId } = results;

    // Determine if this is BR1 or BR2
    const isBR1 = raceId.includes('_BR1_');
    const isBR2 = raceId.includes('_BR2_');

    if (!isBR1 && !isBR2) {
      // Not a two-run race, return as-is
      return results;
    }

    // Get or create class cache
    let classCache = this.cache.get(classId);
    if (!classCache) {
      classCache = { br1: new Map(), br2: new Map() };
      this.cache.set(classId, classCache);
    }

    if (isBR1) {
      // Cache BR1 results
      this.cacheResults(classCache.br1, results.rows);
      return results;
    }

    // BR2: Enrich with BR1 data
    const enrichedRows = results.rows.map((row) =>
      this.enrichBR2Row(row, classCache!.br1)
    );

    // Cache BR2 results as well
    this.cacheResults(classCache.br2, enrichedRows);

    return {
      ...results,
      rows: enrichedRows,
    };
  }

  /**
   * Cache results from a run
   */
  private cacheResults(cache: Map<string, CachedRunResult>, rows: ResultRow[]): void {
    for (const row of rows) {
      const bib = row.bib.trim();
      if (!bib) continue;

      cache.set(bib, {
        bib,
        time: this.parseTimeToCs(row.time),
        pen: row.pen,
        total: this.parseTimeToCs(row.total),
        rank: row.rank,
        gates: row.gates,
      });
    }
  }

  /**
   * Enrich BR2 row with BR1 data
   */
  private enrichBR2Row(row: ResultRow, br1Cache: Map<string, CachedRunResult>): ResultRow {
    const bib = row.bib.trim();
    const br1 = br1Cache.get(bib);

    // Current run (BR2) values
    const currentTotalCs = this.parseTimeToCs(row.total);

    // If we have cached BR1 data, use it to fill in missing fields
    if (br1) {
      const prevTime = row.prevTime ?? br1.time;
      const prevPen = row.prevPen ?? br1.pen;
      const prevTotal = row.prevTotal ?? br1.total;
      const prevRank = row.prevRank ?? br1.rank;

      // Calculate totalTotal if not already provided
      const result: ResultRow = {
        ...row,
        prevTime,
        prevPen,
        prevTotal,
        prevRank,
      };

      if (row.totalTotal !== undefined) {
        result.totalTotal = row.totalTotal;
        if (row.betterRun !== undefined) {
          result.betterRun = row.betterRun;
        }
      } else if (prevTotal > 0 && currentTotalCs > 0) {
        if (prevTotal <= currentTotalCs) {
          result.totalTotal = prevTotal;
          result.betterRun = 1;
        } else {
          result.totalTotal = currentTotalCs;
          result.betterRun = 2;
        }
      }

      return result;
    }

    // No BR1 cache - try to use data from row itself (from C123's PrevTime fields)
    if (row.prevTotal !== undefined) {
      const result: ResultRow = { ...row };

      if (row.totalTotal !== undefined) {
        result.totalTotal = row.totalTotal;
        if (row.betterRun !== undefined) {
          result.betterRun = row.betterRun;
        }
      } else if (row.prevTotal > 0 && currentTotalCs > 0) {
        if (row.prevTotal <= currentTotalCs) {
          result.totalTotal = row.prevTotal;
          result.betterRun = 1;
        } else {
          result.totalTotal = currentTotalCs;
          result.betterRun = 2;
        }
      }

      return result;
    }

    return row;
  }

  /**
   * Parse time string to centiseconds
   * Handles formats: "79.99" (seconds.cs), "78990" (centiseconds)
   */
  private parseTimeToCs(time: string): number {
    if (!time) return 0;

    const trimmed = time.trim();
    if (!trimmed) return 0;

    // If contains decimal point, it's seconds.centiseconds
    if (trimmed.includes('.')) {
      const [secs, cs] = trimmed.split('.');
      return parseInt(secs, 10) * 100 + parseInt(cs.padEnd(2, '0').slice(0, 2), 10);
    }

    // Otherwise it's already centiseconds
    return parseInt(trimmed, 10) || 0;
  }

  /**
   * Clear cache for a specific class
   */
  clearClass(classId: string): void {
    this.cache.delete(classId);
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cached BR1 result for a competitor
   */
  getBR1Result(classId: string, bib: string): CachedRunResult | undefined {
    return this.cache.get(classId)?.br1.get(bib.trim());
  }

  /**
   * Get cached BR2 result for a competitor
   */
  getBR2Result(classId: string, bib: string): CachedRunResult | undefined {
    return this.cache.get(classId)?.br2.get(bib.trim());
  }

  /**
   * Check if we have BR1 results for a class
   */
  hasBR1Results(classId: string): boolean {
    const cache = this.cache.get(classId);
    return cache ? cache.br1.size > 0 : false;
  }
}
