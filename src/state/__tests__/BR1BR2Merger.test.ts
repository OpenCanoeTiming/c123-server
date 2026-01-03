import { describe, it, expect, beforeEach } from 'vitest';
import { BR1BR2Merger } from '../BR1BR2Merger.js';
import type { ResultsMessage, ResultRow } from '../../protocol/index.js';

describe('BR1BR2Merger', () => {
  let merger: BR1BR2Merger;

  beforeEach(() => {
    merger = new BR1BR2Merger();
  });

  function createResultRow(overrides: Partial<ResultRow> = {}): ResultRow {
    return {
      rank: 1,
      bib: '1',
      name: 'Test Racer',
      givenName: 'Test',
      familyName: 'Racer',
      club: 'Test Club',
      nat: 'CZE',
      startOrder: 1,
      startTime: '10:00:00',
      gates: '0 0 0 0',
      pen: 0,
      time: '79.99',
      total: '79.99',
      behind: '',
      ...overrides,
    };
  }

  function createResults(
    raceId: string,
    classId: string,
    rows: ResultRow[]
  ): ResultsMessage {
    return {
      raceId,
      classId,
      isCurrent: true,
      mainTitle: 'K1m - test',
      subTitle: '1st Run',
      rows,
    };
  }

  describe('processResults', () => {
    it('should return non-BR race results unchanged', () => {
      const results = createResults('K1M_ST_FINAL', 'K1M_ST', [
        createResultRow({ bib: '1', total: '79.99' }),
      ]);

      const processed = merger.processResults(results);
      expect(processed).toEqual(results);
    });

    it('should cache BR1 results', () => {
      const results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '76.99', pen: 2, total: '78.99' }),
        createResultRow({ bib: '2', time: '86.21', pen: 2, total: '88.21', rank: 2 }),
      ]);

      merger.processResults(results);

      expect(merger.hasBR1Results('K1M_ST')).toBe(true);
      expect(merger.getBR1Result('K1M_ST', '1')).toBeDefined();
      expect(merger.getBR1Result('K1M_ST', '2')).toBeDefined();
    });

    it('should enrich BR2 results with cached BR1 data', () => {
      // First, process BR1 results
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '76.99', pen: 2, total: '78.99', rank: 1 }),
      ]);
      merger.processResults(br1Results);

      // Then, process BR2 results (without BR1 data in the row)
      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '79.99', pen: 6, total: '85.99', rank: 2 }),
      ]);
      const processed = merger.processResults(br2Results);

      // Should have enriched BR1 data
      expect(processed.rows[0].prevTime).toBe(7699);
      expect(processed.rows[0].prevPen).toBe(2);
      expect(processed.rows[0].prevTotal).toBe(7899);
      expect(processed.rows[0].prevRank).toBe(1);
    });

    it('should calculate totalTotal when BR1 is better', () => {
      // BR1: 78.99
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '76.99', pen: 2, total: '78.99', rank: 1 }),
      ]);
      merger.processResults(br1Results);

      // BR2: 85.99 (worse than BR1)
      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '79.99', pen: 6, total: '85.99', rank: 2 }),
      ]);
      const processed = merger.processResults(br2Results);

      // TotalTotal should be BR1 time (7899 cs)
      expect(processed.rows[0].totalTotal).toBe(7899);
      expect(processed.rows[0].betterRun).toBe(1);
    });

    it('should calculate totalTotal when BR2 is better', () => {
      // BR1: 88.21
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '86.21', pen: 2, total: '88.21', rank: 2 }),
      ]);
      merger.processResults(br1Results);

      // BR2: 78.99 (better than BR1)
      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '76.99', pen: 2, total: '78.99', rank: 1 }),
      ]);
      const processed = merger.processResults(br2Results);

      // TotalTotal should be BR2 time (7899 cs)
      expect(processed.rows[0].totalTotal).toBe(7899);
      expect(processed.rows[0].betterRun).toBe(2);
    });

    it('should use existing prevTotal from row when no cache available', () => {
      // Process BR2 directly with prevTotal already in data
      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({
          bib: '1',
          time: '79.99',
          pen: 6,
          total: '85.99',
          prevTime: 7699,
          prevPen: 2,
          prevTotal: 7899,
          prevRank: 1,
        }),
      ]);
      const processed = merger.processResults(br2Results);

      // Should calculate totalTotal from prevTotal
      expect(processed.rows[0].totalTotal).toBe(7899);
      expect(processed.rows[0].betterRun).toBe(1);
    });

    it('should not overwrite existing totalTotal', () => {
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', total: '78.99' }),
      ]);
      merger.processResults(br1Results);

      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({
          bib: '1',
          total: '85.99',
          totalTotal: 7000, // Already calculated by C123
          betterRun: 1,
        }),
      ]);
      const processed = merger.processResults(br2Results);

      // Should keep existing totalTotal
      expect(processed.rows[0].totalTotal).toBe(7000);
      expect(processed.rows[0].betterRun).toBe(1);
    });

    it('should handle multiple competitors', () => {
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', total: '78.99', rank: 1 }),
        createResultRow({ bib: '2', total: '80.50', rank: 2 }),
        createResultRow({ bib: '3', total: '82.00', rank: 3 }),
      ]);
      merger.processResults(br1Results);

      const br2Results = createResults('K1M_ST_BR2_6', 'K1M_ST', [
        createResultRow({ bib: '1', total: '85.99', rank: 3 }),
        createResultRow({ bib: '2', total: '75.00', rank: 1 }), // Improved
        createResultRow({ bib: '3', total: '83.00', rank: 2 }),
      ]);
      const processed = merger.processResults(br2Results);

      // Bib 1: BR1 was better (78.99 < 85.99)
      expect(processed.rows[0].betterRun).toBe(1);
      expect(processed.rows[0].totalTotal).toBe(7899);

      // Bib 2: BR2 was better (75.00 < 80.50)
      expect(processed.rows[1].betterRun).toBe(2);
      expect(processed.rows[1].totalTotal).toBe(7500);

      // Bib 3: BR1 was better (82.00 < 83.00)
      expect(processed.rows[2].betterRun).toBe(1);
      expect(processed.rows[2].totalTotal).toBe(8200);
    });
  });

  describe('time parsing', () => {
    it('should parse seconds.centiseconds format', () => {
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '79.99', total: '81.99' }),
      ]);
      merger.processResults(br1Results);

      const cached = merger.getBR1Result('K1M_ST', '1');
      expect(cached?.time).toBe(7999);
      expect(cached?.total).toBe(8199);
    });

    it('should parse centiseconds format', () => {
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '7999', total: '8199' }),
      ]);
      merger.processResults(br1Results);

      const cached = merger.getBR1Result('K1M_ST', '1');
      expect(cached?.time).toBe(7999);
      expect(cached?.total).toBe(8199);
    });

    it('should handle empty time', () => {
      const br1Results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1', time: '', total: '' }),
      ]);
      merger.processResults(br1Results);

      const cached = merger.getBR1Result('K1M_ST', '1');
      expect(cached?.time).toBe(0);
      expect(cached?.total).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific class', () => {
      const results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '1' }),
      ]);
      merger.processResults(results);

      expect(merger.hasBR1Results('K1M_ST')).toBe(true);

      merger.clearClass('K1M_ST');

      expect(merger.hasBR1Results('K1M_ST')).toBe(false);
    });

    it('should clear all cache', () => {
      merger.processResults(
        createResults('K1M_ST_BR1_6', 'K1M_ST', [createResultRow({ bib: '1' })])
      );
      merger.processResults(
        createResults('C1M_ST_BR1_6', 'C1M_ST', [createResultRow({ bib: '2' })])
      );

      expect(merger.hasBR1Results('K1M_ST')).toBe(true);
      expect(merger.hasBR1Results('C1M_ST')).toBe(true);

      merger.clearAll();

      expect(merger.hasBR1Results('K1M_ST')).toBe(false);
      expect(merger.hasBR1Results('C1M_ST')).toBe(false);
    });

    it('should handle whitespace in bib numbers', () => {
      const results = createResults('K1M_ST_BR1_6', 'K1M_ST', [
        createResultRow({ bib: '   1' }),
      ]);
      merger.processResults(results);

      expect(merger.getBR1Result('K1M_ST', '1')).toBeDefined();
      expect(merger.getBR1Result('K1M_ST', '   1')).toBeDefined();
    });
  });
});
