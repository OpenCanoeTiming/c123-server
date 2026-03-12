import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveMiniTransformer } from '../LiveMiniTransformer.js';
import type { XmlDataService, XmlScheduleItem, XmlParticipant, XmlResultRow } from '../../service/XmlDataService.js';
import type { OnCourseCompetitor, ResultsMessage, ResultRow } from '../../protocol/parser-types.js';

describe('LiveMiniTransformer', () => {
  let transformer: LiveMiniTransformer;
  let mockXmlService: XmlDataService;

  const mockParticipants: XmlParticipant[] = [
    {
      id: 'P001',
      classId: 'K1M_ST',
      bib: '101',
      familyName: 'Smith',
      givenName: 'John',
      club: 'Test Club',
      isTeam: false,
    },
    {
      id: 'P002',
      classId: 'K1M_ST',
      bib: '102',
      familyName: 'Doe',
      givenName: 'Jane',
      club: 'Another Club',
      isTeam: false,
    },
    {
      id: 'P003',
      classId: 'C1M_ST',
      bib: '201',
      familyName: 'Brown',
      givenName: 'Bob',
      club: 'Third Club',
      isTeam: false,
    },
  ];

  const mockSchedule: XmlScheduleItem[] = [
    {
      raceId: 'K1M_ST_BR1_1',
      classId: 'K1M_ST',
      disId: 'BR1',
    },
    {
      raceId: 'K1M_ST_BR2_2',
      classId: 'K1M_ST',
      disId: 'BR2',
    },
    {
      raceId: 'C1M_ST_BR1_3',
      classId: 'C1M_ST',
      disId: 'BR1',
    },
  ];

  beforeEach(() => {
    // Create mock XmlDataService
    mockXmlService = {
      getSchedule: vi.fn().mockResolvedValue(mockSchedule),
      getParticipants: vi.fn().mockResolvedValue(mockParticipants),
      getEventName: vi.fn().mockResolvedValue('Test Event 2025'),
      getResultsForRace: vi.fn().mockResolvedValue(null),
    } as unknown as XmlDataService;

    transformer = new LiveMiniTransformer(mockXmlService);
  });

  describe('refreshParticipantMapping', () => {
    it('should build participant mapping from XML data', async () => {
      await transformer.refreshParticipantMapping();

      expect(transformer.hasMappingData()).toBe(true);
      expect(transformer.getMappingSize()).toBe(5); // 2 participants × 2 K1M races + 1 participant × 1 C1M race = 4+1 = 5
    });

    it('should handle empty XML data', async () => {
      mockXmlService.getSchedule = vi.fn().mockResolvedValue([]);
      mockXmlService.getParticipants = vi.fn().mockResolvedValue([]);

      await transformer.refreshParticipantMapping();

      expect(transformer.hasMappingData()).toBe(false);
      expect(transformer.getMappingSize()).toBe(0);
    });

    it('should skip schedule items without classId', async () => {
      mockXmlService.getSchedule = vi.fn().mockResolvedValue([
        { raceId: 'TEST_RACE', classId: undefined },
      ]);

      await transformer.refreshParticipantMapping();

      expect(transformer.getMappingSize()).toBe(0);
    });

    it('should update lastRefresh timestamp', async () => {
      expect(transformer.getLastRefresh()).toBeNull();

      await transformer.refreshParticipantMapping();

      expect(transformer.getLastRefresh()).toBeInstanceOf(Date);
    });
  });

  describe('transformOnCourse', () => {
    beforeEach(async () => {
      await transformer.refreshParticipantMapping();
    });

    it('should transform OnCourse competitor to live-mini format', () => {
      const competitor: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 5,
        warning: '',
        gates: '0,2,0,50',
        completed: false,
        dtStart: '10:15:30.000',
        dtFinish: null,
        pen: 52,
        time: '85.50',
        total: '137.50',
        ttbDiff: '+5.23',
        ttbName: 'Leader',
        rank: 3,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result).toEqual({
        participantId: 'P001',
        raceId: 'K1M_ST_BR1_1',
        bib: 101,
        name: 'John Smith',
        club: 'Test Club',
        position: 1,
        gates: [0, 2, 0, 50],
        dtStart: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T10:15:30.000Z$/),
        dtFinish: null,
        time: 8550, // 85.50 seconds → 8550 centiseconds
        pen: 5200, // 52 seconds → 5200 centiseconds
        total: 13750, // 137.50 seconds → 13750 centiseconds
        rank: 3,
        ttbDiff: '+5.23',
        ttbName: 'Leader',
      });
    });

    it('should return null for unknown participant', () => {
      const competitor: OnCourseCompetitor = {
        bib: '999',
        name: 'Unknown',
        club: 'Unknown Club',
        nat: 'XXX',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 99,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result).toBeNull();
    });

    it('should handle gates with empty values', () => {
      const competitor: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 5,
        warning: '',
        gates: '2,,50,0',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result?.gates).toEqual([2, null, 50, 0]);
    });

    it('should handle empty gates string', () => {
      const competitor: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 5,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result?.gates).toEqual([]);
    });

    it('should convert rank=0 to null', () => {
      const competitor: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 5,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result?.rank).toBeNull();
    });

    it('should handle null timestamps', () => {
      const competitor: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 5,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result = transformer.transformOnCourse(competitor);

      expect(result?.dtStart).toBeNull();
      expect(result?.dtFinish).toBeNull();
    });
  });

  describe('transformResults', () => {
    beforeEach(async () => {
      await transformer.refreshParticipantMapping();
    });

    it('should transform Results to live-mini format', async () => {
      const resultsMessage: ResultsMessage = {
        raceId: 'K1M_ST_BR1_1',
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: 'Run 1',
        rows: [
          {
            rank: 1,
            bib: '101',
            name: 'John Smith',
            givenName: 'John',
            familyName: 'Smith',
            club: 'Test Club',
            nat: 'CZE',
            startOrder: 5,
            startTime: '10:15:00',
            gates: '0 0 0 0',
            pen: 0,
            time: '85.50',
            total: '85.50',
            behind: '0.00',
          },
          {
            rank: 2,
            bib: '102',
            name: 'Jane Doe',
            givenName: 'Jane',
            familyName: 'Doe',
            club: 'Another Club',
            nat: 'USA',
            startOrder: 6,
            startTime: '10:17:00',
            gates: '0 2 0 50',
            pen: 52,
            time: '90.25',
            total: '142.25',
            behind: '+56.75',
          },
        ],
      };

      const results = await transformer.transformResults(resultsMessage);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        participantId: 'P001',
        raceId: 'K1M_ST_BR1_1',
        bib: 101,
        rnk: 1,
        time: 8550, // 85.50 seconds → 8550 centiseconds
        pen: 0,
        total: 8550,
        status: null,
        catId: null,
        catRnk: null,
        totalBehind: null,
        catTotalBehind: null,
      });
      expect(results[1]).toEqual({
        participantId: 'P002',
        raceId: 'K1M_ST_BR1_1',
        bib: 102,
        rnk: 2,
        time: 9025, // 90.25 seconds → 9025 centiseconds
        pen: 5200, // 52 seconds → 5200 centiseconds
        total: 14225, // 142.25 seconds → 14225 centiseconds
        status: null,
        catId: null,
        catRnk: null,
        totalBehind: null,
        catTotalBehind: null,
      });
    });

    it('should skip rows without participant mapping', async () => {
      const resultsMessage: ResultsMessage = {
        raceId: 'K1M_ST_BR1_1',
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: 'Run 1',
        rows: [
          {
            rank: 1,
            bib: '101',
            name: 'John Smith',
            givenName: 'John',
            familyName: 'Smith',
            club: 'Test Club',
            nat: 'CZE',
            startOrder: 5,
            startTime: '10:15:00',
            gates: '0 0 0 0',
            pen: 0,
            time: '85.50',
            total: '85.50',
            behind: '0.00',
          },
          {
            rank: 2,
            bib: '999', // Unknown bib
            name: 'Unknown',
            givenName: 'Unknown',
            familyName: 'Unknown',
            club: 'Unknown',
            nat: 'XXX',
            startOrder: 99,
            startTime: '10:00:00',
            gates: '',
            pen: 0,
            time: '100.00',
            total: '100.00',
            behind: '+14.50',
          },
        ],
      };

      const results = await transformer.transformResults(resultsMessage);

      expect(results).toHaveLength(1); // Only first row should be included
      expect(results[0].bib).toBe(101);
    });

    it('should handle status field', async () => {
      const resultsMessage: ResultsMessage = {
        raceId: 'K1M_ST_BR1_1',
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: 'Run 1',
        rows: [
          {
            rank: 0,
            bib: '101',
            name: 'John Smith',
            givenName: 'John',
            familyName: 'Smith',
            club: 'Test Club',
            nat: 'CZE',
            startOrder: 5,
            startTime: '10:15:00',
            gates: '',
            pen: 0,
            time: '',
            total: '',
            behind: '',
            status: 'DNS',
          },
        ],
      };

      const results = await transformer.transformResults(resultsMessage);

      expect(results[0].status).toBe('DNS');
      expect(results[0].rnk).toBeNull(); // rank=0 → null
    });
  });

  describe('extractEventMetadata', () => {
    it('should extract event metadata from XML', async () => {
      const metadata = await transformer.extractEventMetadata();

      expect(metadata).toEqual({
        mainTitle: 'Test Event 2025',
        eventId: 'test-event-2025',
        location: null,
        discipline: 'Slalom',
      });
    });

    it('should handle missing event name', async () => {
      mockXmlService.getEventName = vi.fn().mockResolvedValue(null);

      const metadata = await transformer.extractEventMetadata();

      expect(metadata.mainTitle).toBeNull();
      expect(metadata.eventId).toBeNull();
    });

    it('should generate event ID from mainTitle', async () => {
      mockXmlService.getEventName = vi.fn().mockResolvedValue('World Cup Prague 2024 - Qualifying');

      const metadata = await transformer.extractEventMetadata();

      expect(metadata.eventId).toBe('world-cup-prague-2024-qualifying');
    });

    it('should handle special characters in event name', async () => {
      mockXmlService.getEventName = vi.fn().mockResolvedValue('Test & Event / 2025 @ Location');

      const metadata = await transformer.extractEventMetadata();

      expect(metadata.eventId).toBe('test-event-2025-location');
    });
  });

  describe('BR2 merge (transformResults)', () => {
    beforeEach(async () => {
      await transformer.refreshParticipantMapping();
    });

    /** Helper to create a BR2 ResultsMessage (detected via /_BR2_/ in raceId) */
    function makeBr2Message(rows: Partial<ResultRow>[]): ResultsMessage {
      return {
        raceId: 'K1M_ST_BR2_2',
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: '1st and 2nd Run',
        rows: rows.map(r => ({
          rank: 0,
          bib: '101',
          name: 'John Smith',
          givenName: 'John',
          familyName: 'Smith',
          club: 'Test Club',
          nat: 'CZE',
          startOrder: 1,
          startTime: '10:15:00',
          gates: '',
          pen: 0,
          time: '',
          total: '',
          behind: '',
          ...r,
        })),
      };
    }

    it('should use TCP data when consistent (BR2 is better, no OnCourse/XML)', async () => {
      // TCP: Time + Pen = Total → consistent → BR2 is the better run
      const msg = makeBr2Message([{
        bib: '101',
        rank: 1,
        time: '90.35',
        pen: 50,         // BR2 pen (correct — BR2 is better)
        total: '140.35', // 90.35 + 50 = 140.35 → consistent
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(5000);    // 50s → 5000cs from TCP
      expect(results[0].total).toBe(14035); // 140.35s → 14035cs from TCP
      expect(results[0].time).toBe(9035);
    });

    it('should prefer OnCourse cache even when TCP is consistent', async () => {
      // OnCourse has authoritative penalty
      transformer.updateOnCoursePenalties([{
        bib: '101', pen: 50,
        name: 'John Smith', club: 'Test Club', nat: 'CZE',
        raceId: 'K1M_ST_BR2_2', raceName: '', startOrder: 1, warning: '',
        gates: '', completed: true, dtStart: null, dtFinish: null,
        time: '90.35', total: '140.35', rank: 1, position: 1,
        ttbDiff: '', ttbName: '',
      }]);

      // TCP is consistent (BR2 is better) but OnCourse should still take priority
      const msg = makeBr2Message([{
        bib: '101', rank: 1,
        time: '90.35', pen: 50, total: '140.35', // consistent
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(5000);    // OnCourse: 50s → 5000cs
      expect(results[0].total).toBe(14035); // Computed: 9035 + 5000
    });

    it('should fix pen/total from OnCourse cache when TCP is inconsistent', async () => {
      // OnCourse: bib 101 has pen=50s (correct BR2 penalty)
      transformer.updateOnCoursePenalties([{
        bib: '101', pen: 50,
        name: 'John Smith', club: 'Test Club', nat: 'CZE',
        raceId: 'K1M_ST_BR2_2', raceName: '', startOrder: 1, warning: '',
        gates: '', completed: true, dtStart: '10:15:00.000',
        dtFinish: '10:16:30.350', time: '90.35', total: '140.35',
        rank: 1, position: 1, ttbDiff: '', ttbName: '',
      }]);

      // TCP: Time=90.35, Pen=4 (BR1!), Total=91.78 (BR1!) → inconsistent
      // 90.35 + 4 = 94.35 ≠ 91.78
      const msg = makeBr2Message([{
        bib: '101', rank: 1,
        time: '90.35', pen: 4, total: '91.78',
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].time).toBe(9035);   // TCP time (always correct)
      expect(results[0].pen).toBe(5000);    // OnCourse: 50s → 5000cs
      expect(results[0].total).toBe(14035); // Computed: 9035 + 5000
    });

    it('should fall back to XML when OnCourse cache empty', async () => {
      (mockXmlService as any).getResultsForRace = vi.fn().mockResolvedValue([
        {
          raceId: 'K1M_ST_BR2_2', id: 'P001', bib: '101',
          startOrder: 1, time: 90350, pen: 50, total: 140350, rank: 1,
        } as XmlResultRow,
      ]);

      // TCP inconsistent: 90.35 + 4 = 94.35 ≠ 91.78
      const msg = makeBr2Message([{
        bib: '101', rank: 1,
        time: '90.35', pen: 4, total: '91.78',
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(5000);    // XML: 50s × 100
      expect(results[0].total).toBe(14035); // Computed: 9035 + 5000
    });

    it('should pass through TCP data as-is when inconsistent and no penalty source', async () => {
      (mockXmlService as any).getResultsForRace = vi.fn().mockResolvedValue(null);

      // TCP inconsistent, no OnCourse, no XML → use TCP as-is (wrong pen/total but rank+time update)
      const msg = makeBr2Message([{
        bib: '101', rank: 1,
        time: '90.35', pen: 4, total: '91.78',
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].rnk).toBe(1);       // rank from TCP (always correct)
      expect(results[0].time).toBe(9035);    // time from TCP (always correct)
      expect(results[0].pen).toBe(400);      // TCP pen (BR1 value — wrong but best available)
      expect(results[0].total).toBe(9178);   // TCP total (BR1 value — wrong but best available)
    });

    it('should use TCP as fallback when consistent and no other source', async () => {
      (mockXmlService as any).getResultsForRace = vi.fn().mockResolvedValue(null);

      // TCP consistent: 90.35 + 50 = 140.35 → BR2 is best, data correct
      const msg = makeBr2Message([{
        bib: '101', rank: 1,
        time: '90.35', pen: 50, total: '140.35',
      }]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(5000);    // TCP: 50s → 5000cs (consistent)
      expect(results[0].total).toBe(14035); // TCP: 140.35s → 14035cs
    });

    it('should handle mixed batch (some consistent, some not)', async () => {
      // OnCourse cache for bib 101 (inconsistent case)
      transformer.updateOnCoursePenalties([{
        bib: '101', pen: 50,
        name: 'John Smith', club: 'Test Club', nat: 'CZE',
        raceId: 'K1M_ST_BR2_2', raceName: '', startOrder: 1, warning: '',
        gates: '', completed: true, dtStart: null, dtFinish: null,
        time: null, total: null, rank: 0, position: 1,
        ttbDiff: '', ttbName: '',
      }]);

      const msg = makeBr2Message([
        {
          bib: '101', rank: 2,
          time: '90.35', pen: 4, total: '91.78', // INCONSISTENT (90.35+4≠91.78)
        },
        {
          bib: '102', rank: 1,
          time: '80.00', pen: 6, total: '86.00', // CONSISTENT (80+6=86)
        },
      ]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(2);
      // bib 101: fixed from OnCourse (TCP was inconsistent)
      expect(results[0].bib).toBe(101);
      expect(results[0].pen).toBe(5000);    // OnCourse
      expect(results[0].total).toBe(14035); // Computed
      // bib 102: TCP consistent → use as-is (no OnCourse for this bib)
      expect(results[1].bib).toBe(102);
      expect(results[1].pen).toBe(600);     // TCP: 6s → 600cs
      expect(results[1].total).toBe(8600);  // TCP: 86.00s → 8600cs
    });

    it('should skip on-course competitors (no time, no status) in BR2', async () => {
      // On-course competitor: Time="" (null), Total="100.14" (BR1 best), no IRM
      const msg = makeBr2Message([
        {
          bib: '101', rank: 0,
          time: '', pen: 0, total: '100.14', // On course — no finish time
          // no status field → undefined
        },
        {
          bib: '102', rank: 1,
          time: '90.35', pen: 50, total: '140.35', // Finished — consistent
        },
      ]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].bib).toBe(102); // Only finished competitor
    });

    it('should keep DNS entries in BR2 (time empty but has status)', async () => {
      const msg = makeBr2Message([
        {
          bib: '101', rank: 0,
          time: '', pen: 0, total: '', // DNS — empty time but has status
          status: 'DNS',
        },
        {
          bib: '102', rank: 1,
          time: '90.35', pen: 50, total: '140.35',
        },
      ]);

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(2);
      expect(results[0].bib).toBe(101);
      expect(results[0].status).toBe('DNS');
      expect(results[1].bib).toBe(102);
    });

    it('should not affect BR1 races or standard races', async () => {
      const msg: ResultsMessage = {
        raceId: 'K1M_ST_BR1_1', // BR1 — not BR2
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: 'Run 1',
        rows: [{
          rank: 1, bib: '101',
          name: 'John Smith', givenName: 'John', familyName: 'Smith',
          club: 'Test Club', nat: 'CZE', startOrder: 1,
          startTime: '10:15:00', gates: '',
          pen: 4, time: '85.50', total: '89.50', behind: '0.00',
        }],
      };

      const results = await transformer.transformResults(msg);

      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(400);    // TCP: 4s → 400cs (no BR2 merge)
      expect(results[0].total).toBe(8950); // TCP: 89.50s → 8950cs
    });
  });

  describe('updateOnCoursePenalties', () => {
    it('should cache penalties from OnCourse entries', () => {
      transformer.updateOnCoursePenalties([{
        bib: '101',
        pen: 50,
        name: 'Smith',
        club: 'Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR2_2',
        raceName: '',
        startOrder: 1,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        time: null,
        total: null,
        rank: 0,
        position: 1,
        ttbDiff: '',
        ttbName: '',
      }]);

      // Cache is internal — verified via transformResults behavior in BR tests
      // Just ensure it doesn't throw
    });

    it('should cleanup entries after grace period', async () => {
      vi.useFakeTimers();

      const oc: OnCourseCompetitor = {
        bib: '101',
        pen: 50,
        name: 'Smith',
        club: 'Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR2_2',
        raceName: '',
        startOrder: 1,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        time: null,
        total: null,
        rank: 0,
        position: 1,
        ttbDiff: '',
        ttbName: '',
      };

      // Competitor on course
      transformer.updateOnCoursePenalties([oc]);

      // Competitor leaves OnCourse
      transformer.updateOnCoursePenalties([]);

      // Within grace period — cache should still have entry
      vi.advanceTimersByTime(5_000);
      transformer.updateOnCoursePenalties([]); // trigger cleanup

      // After grace period — entry should be removed
      vi.advanceTimersByTime(6_000); // total 11s > 10s grace
      transformer.updateOnCoursePenalties([]); // trigger cleanup

      // Verify: no OnCourse source, no XML → TCP passed through as-is
      await transformer.refreshParticipantMapping();
      (mockXmlService as any).getResultsForRace = vi.fn().mockResolvedValue(null);

      const msg: ResultsMessage = {
        raceId: 'K1M_ST_BR2_2',
        classId: 'K1M_ST',
        isCurrent: true,
        mainTitle: 'K1 Men',
        subTitle: 'Run 2',
        rows: [{
          rank: 1,
          bib: '101',
          name: 'John Smith',
          givenName: 'John',
          familyName: 'Smith',
          club: 'Test Club',
          nat: 'CZE',
          startOrder: 1,
          startTime: '10:15:00',
          gates: '',
          pen: 4,
          time: '90.35',
          total: '91.78', // inconsistent: 90.35 + 4 ≠ 91.78
          behind: '',
        }],
      };

      const results = await transformer.transformResults(msg);
      // Cache expired, no XML → TCP as-is (wrong pen/total but row not skipped)
      expect(results).toHaveLength(1);
      expect(results[0].pen).toBe(400);    // TCP pen (BR1 value)
      expect(results[0].total).toBe(9178); // TCP total (BR1 value)

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await transformer.refreshParticipantMapping();
    });

    it('should handle different participants with same bib in different races', async () => {
      // Add another participant with same bib but different class
      const customParticipants: XmlParticipant[] = [
        ...mockParticipants,
        {
          id: 'P004',
          classId: 'K1W_ST',
          bib: '101', // Same bib as P001 but different class
          familyName: 'Jones',
          givenName: 'Mary',
          club: 'Fourth Club',
          isTeam: false,
        },
      ];

      const customSchedule: XmlScheduleItem[] = [
        ...mockSchedule,
        {
          raceId: 'K1W_ST_BR1_4',
          classId: 'K1W_ST',
          disId: 'BR1',
        },
      ];

      mockXmlService.getSchedule = vi.fn().mockResolvedValue(customSchedule);
      mockXmlService.getParticipants = vi.fn().mockResolvedValue(customParticipants);

      await transformer.refreshParticipantMapping();

      // Bib 101 in K1M race should map to P001
      const competitor1: OnCourseCompetitor = {
        bib: '101',
        name: 'John Smith',
        club: 'Test Club',
        nat: 'CZE',
        raceId: 'K1M_ST_BR1_1',
        raceName: 'K1 Men - Run 1',
        startOrder: 1,
        warning: '',
        gates: '',
        completed: false,
        dtStart: null,
        dtFinish: null,
        pen: 0,
        time: null,
        total: null,
        ttbDiff: '',
        ttbName: '',
        rank: 0,
        position: 1,
      };

      const result1 = transformer.transformOnCourse(competitor1);
      expect(result1?.participantId).toBe('P001');

      // Bib 101 in K1W race should map to P004
      const competitor2: OnCourseCompetitor = {
        ...competitor1,
        raceId: 'K1W_ST_BR1_4',
        raceName: 'K1 Women - Run 1',
      };

      const result2 = transformer.transformOnCourse(competitor2);
      expect(result2?.participantId).toBe('P004');
    });
  });
});
