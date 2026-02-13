import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveMiniTransformer } from '../LiveMiniTransformer.js';
import type { XmlDataService, XmlScheduleItem, XmlParticipant } from '../../service/XmlDataService.js';
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
        time: 85.50,
        pen: 5200, // 52 seconds → 5200 centiseconds
        total: 137.50,
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

    it('should transform Results to live-mini format', () => {
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

      const results = transformer.transformResults(resultsMessage);

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

    it('should skip rows without participant mapping', () => {
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

      const results = transformer.transformResults(resultsMessage);

      expect(results).toHaveLength(1); // Only first row should be included
      expect(results[0].bib).toBe(101);
    });

    it('should handle status field', () => {
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

      const results = transformer.transformResults(resultsMessage);

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
