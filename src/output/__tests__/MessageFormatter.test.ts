import { describe, it, expect } from 'vitest';
import {
  formatTopMessage,
  formatOnCourseMessage,
  formatCompMessage,
  formatAllMessages,
} from '../MessageFormatter.js';
import type { EventStateData } from '../../state/types.js';

function createMockState(overrides: Partial<EventStateData> = {}): EventStateData {
  return {
    timeOfDay: '10:30:00',
    raceConfig: null,
    schedule: [
      {
        order: 1,
        raceId: 'K1M_ST_BR1_6',
        race: 'K1m - střední trať - 1. jízda',
        mainTitle: 'K1m - střední trať',
        subTitle: '1st Run',
        shortTitle: 'K1m',
        raceStatus: 3,
        startTime: '10:00:00',
      },
    ],
    currentRaceId: 'K1M_ST_BR1_6',
    onCourse: [],
    results: null,
    highlightBib: null,
    scheduleFingerprint: 'K1M_ST_BR1_6',
    ...overrides,
  };
}

describe('MessageFormatter', () => {
  describe('formatTopMessage', () => {
    it('should return null when no results', () => {
      const state = createMockState({ results: null });
      expect(formatTopMessage(state)).toBeNull();
    });

    it('should format results correctly', () => {
      const state = createMockState({
        results: {
          raceId: 'K1M_ST_BR1_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m - střední trať',
          subTitle: '1st Run',
          rows: [
            {
              rank: 1,
              bib: '5',
              name: 'NOVÁK Jan',
              givenName: 'Jan',
              familyName: 'NOVÁK',
              club: 'TJ Slavia',
              nat: 'CZE',
              startOrder: 5,
              startTime: '10:15:00',
              gates: '0 0 0 0',
              pen: 0,
              time: '75.50',
              total: '75.50',
              behind: '',
            },
            {
              rank: 2,
              bib: '3',
              name: 'SVOBODA Petr',
              givenName: 'Petr',
              familyName: 'SVOBODA',
              club: 'SK Praha',
              nat: 'CZE',
              startOrder: 3,
              startTime: '10:10:00',
              gates: '0 2 0 0',
              pen: 2,
              time: '74.80',
              total: '76.80',
              behind: '+1.30',
            },
          ],
        },
        highlightBib: '5',
      });

      const msg = formatTopMessage(state);

      expect(msg).not.toBeNull();
      expect(msg!.msg).toBe('top');
      expect(msg!.data.RaceName).toBe('K1m - střední trať');
      expect(msg!.data.RaceStatus).toBe('3');
      expect(msg!.data.HighlightBib).toBe('5');
      expect(msg!.data.list).toHaveLength(2);
      expect(msg!.data.list[0]).toEqual({
        Rank: 1,
        Bib: '5',
        Name: 'NOVÁK Jan',
        Club: 'TJ Slavia',
        Total: '75.50',
        Pen: 0,
        Behind: '',
        Time: '75.50', // Time is always included when present
      });
    });

    it('should include BR1/BR2 extended fields when present', () => {
      const state = createMockState({
        schedule: [
          {
            order: 1,
            raceId: 'K1M_ST_BR2_6',
            race: 'K1m - střední trať - 2. jízda',
            mainTitle: 'K1m - střední trať',
            subTitle: '1st and 2nd Run',
            shortTitle: 'K1m',
            raceStatus: 3,
            startTime: '14:00:00',
          },
        ],
        currentRaceId: 'K1M_ST_BR2_6',
        results: {
          raceId: 'K1M_ST_BR2_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m - střední trať',
          subTitle: '1st and 2nd Run',
          rows: [
            {
              rank: 1,
              bib: '1',
              name: 'KREJČÍ Jakub',
              givenName: 'Jakub',
              familyName: 'KREJČÍ',
              club: 'TJ DUKLA Praha',
              nat: 'CZE',
              startOrder: 1,
              startTime: '14:06:45',
              gates: '0 0 0 0 0 0 0 0 0 0 0 0 2 0 2 0 2 0 0 0 0 0 0 0',
              pen: 0,
              time: '82.36',
              total: '81.72',
              behind: '',
              // BR2 extended fields
              prevTime: 7999,
              prevPen: 2,
              prevTotal: 8199,
              prevRank: 1,
              totalTotal: 8172,
              totalRank: 1,
              betterRun: 2,
            },
            {
              rank: 2,
              bib: '3',
              name: 'SVOBODA Petr',
              givenName: 'Petr',
              familyName: 'SVOBODA',
              club: 'SK Praha',
              nat: 'CZE',
              startOrder: 3,
              startTime: '14:10:00',
              gates: '0 2 0 0',
              pen: 2,
              time: '80.50',
              total: '82.50',
              behind: '+0.78',
              // BR2 extended fields - first run was better
              prevTime: 7850,
              prevPen: 0,
              prevTotal: 7850,
              prevRank: 2,
              totalTotal: 7850,
              totalRank: 2,
              betterRun: 1,
            },
          ],
        },
      });

      const msg = formatTopMessage(state);

      expect(msg).not.toBeNull();
      expect(msg!.data.list).toHaveLength(2);

      // First competitor - BR2 was better
      const first = msg!.data.list[0];
      expect(first.Rank).toBe(1);
      expect(first.Bib).toBe('1');
      expect(first.Time).toBe('82.36');
      expect(first.PrevTime).toBe(7999);
      expect(first.PrevPen).toBe(2);
      expect(first.PrevTotal).toBe(8199);
      expect(first.PrevRank).toBe(1);
      expect(first.TotalTotal).toBe(8172);
      expect(first.TotalRank).toBe(1);
      expect(first.BetterRun).toBe(2);

      // Second competitor - BR1 was better
      const second = msg!.data.list[1];
      expect(second.BetterRun).toBe(1);
      expect(second.PrevTotal).toBe(7850);
      expect(second.TotalTotal).toBe(7850);
    });

    it('should not include BR1/BR2 fields when not present (single run race)', () => {
      const state = createMockState({
        results: {
          raceId: 'K1M_ST_BR1_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m - střední trať',
          subTitle: '1st Run',
          rows: [
            {
              rank: 1,
              bib: '5',
              name: 'NOVÁK Jan',
              givenName: 'Jan',
              familyName: 'NOVÁK',
              club: 'TJ Slavia',
              nat: 'CZE',
              startOrder: 5,
              startTime: '10:15:00',
              gates: '0 0 0 0',
              pen: 0,
              time: '75.50',
              total: '75.50',
              behind: '',
              // No BR1/BR2 fields
            },
          ],
        },
      });

      const msg = formatTopMessage(state);

      expect(msg).not.toBeNull();
      const item = msg!.data.list[0];

      // Basic fields present
      expect(item.Rank).toBe(1);
      expect(item.Total).toBe('75.50');

      // Extended fields should NOT be present (undefined)
      expect(item.PrevTime).toBeUndefined();
      expect(item.PrevPen).toBeUndefined();
      expect(item.PrevTotal).toBeUndefined();
      expect(item.TotalTotal).toBeUndefined();
      expect(item.BetterRun).toBeUndefined();
    });

    it('should handle missing schedule gracefully', () => {
      const state = createMockState({
        schedule: [],
        results: {
          raceId: 'K1M_ST_BR1_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m',
          subTitle: '',
          rows: [],
        },
      });

      const msg = formatTopMessage(state);

      expect(msg).not.toBeNull();
      expect(msg!.data.RaceStatus).toBe('0');
    });
  });

  describe('formatOnCourseMessage', () => {
    it('should return empty array when no competitors on course', () => {
      const state = createMockState({ onCourse: [] });
      const msg = formatOnCourseMessage(state);

      expect(msg.msg).toBe('oncourse');
      expect(msg.data).toEqual([]);
    });

    it('should format on-course competitors correctly', () => {
      const state = createMockState({
        onCourse: [
          {
            bib: '9',
            name: 'KOPEČEK Michal',
            club: 'VS Tábor',
            nat: 'CZE',
            raceId: 'K1M_ST_BR2_6',
            raceName: 'K1m - střední trať - 2. jízda',
            startOrder: 9,
            warning: '',
            gates: '0,0,0,2,0,0',
            completed: false,
            dtStart: '16:14:00.000',
            dtFinish: null,
            pen: 2,
            time: 8115,
            total: 8117,
            ttbDiff: '+12.79',
            ttbName: 'J. KREJČÍ',
            rank: 8,
            position: 1,
          },
        ],
      });

      const msg = formatOnCourseMessage(state);

      expect(msg.msg).toBe('oncourse');
      expect(msg.data).toHaveLength(1);
      expect(msg.data[0]).toEqual({
        Bib: '9',
        BibKey: 'K1M_ST_BR2_6-9',
        Name: 'KOPEČEK Michal',
        Club: 'VS Tábor',
        Gates: '0,0,0,2,0,0',
        Pen: '2',
        Time: '8115',
        Total: '8117',
        dtFinish: '',
        _pos: 1,
      });
    });

    it('should handle multiple competitors with positions', () => {
      const state = createMockState({
        onCourse: [
          {
            bib: '9',
            name: 'Competitor 1',
            club: 'Club A',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 9,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:00:00',
            dtFinish: null,
            pen: 0,
            time: 5000,
            total: 5000,
            ttbDiff: '',
            ttbName: '',
            rank: 1,
            position: 1,
          },
          {
            bib: '10',
            name: 'Competitor 2',
            club: 'Club B',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 10,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:01:00',
            dtFinish: null,
            pen: 0,
            time: 3000,
            total: 3000,
            ttbDiff: '',
            ttbName: '',
            rank: 2,
            position: 2,
          },
        ],
      });

      const msg = formatOnCourseMessage(state);

      expect(msg.data).toHaveLength(2);
      expect(msg.data[0]._pos).toBe(1);
      expect(msg.data[1]._pos).toBe(2);
    });
  });

  describe('formatCompMessage', () => {
    it('should return null when no competitors on course', () => {
      const state = createMockState({ onCourse: [] });
      expect(formatCompMessage(state)).toBeNull();
    });

    it('should format current competitor correctly', () => {
      const state = createMockState({
        onCourse: [
          {
            bib: '9',
            name: 'KOPEČEK Michal',
            club: 'VS Tábor',
            nat: 'CZE',
            raceId: 'K1M_ST_BR2_6',
            raceName: 'K1m',
            startOrder: 9,
            warning: '',
            gates: '0,0,0,2',
            completed: false,
            dtStart: '16:14:00.000',
            dtFinish: null,
            pen: 2,
            time: 8115,
            total: 8117,
            ttbDiff: '+12.79',
            ttbName: 'J. KREJČÍ',
            rank: 8,
            position: 1,
          },
        ],
      });

      const msg = formatCompMessage(state);

      expect(msg).not.toBeNull();
      expect(msg!.msg).toBe('comp');
      expect(msg!.data).toEqual({
        Bib: '9',
        Name: 'KOPEČEK Michal',
        Club: 'VS Tábor',
        Time: '8115',
        Pen: '2',
        Gates: '0,0,0,2',
        Rank: '8',
        TTBDiff: '+12.79',
        TTBName: 'J. KREJČÍ',
      });
    });

    it('should select competitor with lowest position', () => {
      const state = createMockState({
        onCourse: [
          {
            bib: '10',
            name: 'Competitor 2',
            club: 'Club B',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 10,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:01:00',
            dtFinish: null,
            pen: 0,
            time: 3000,
            total: 3000,
            ttbDiff: '',
            ttbName: '',
            rank: 2,
            position: 2,
          },
          {
            bib: '9',
            name: 'Competitor 1',
            club: 'Club A',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 9,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:00:00',
            dtFinish: null,
            pen: 0,
            time: 5000,
            total: 5000,
            ttbDiff: '',
            ttbName: '',
            rank: 1,
            position: 1,
          },
        ],
      });

      const msg = formatCompMessage(state);

      expect(msg!.data.Bib).toBe('9');
    });
  });

  describe('formatAllMessages', () => {
    it('should format all available messages', () => {
      const state = createMockState({
        results: {
          raceId: 'K1M_ST_BR1_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m',
          subTitle: '',
          rows: [
            {
              rank: 1,
              bib: '1',
              name: 'Test',
              givenName: 'Test',
              familyName: 'Test',
              club: 'Club',
              nat: '',
              startOrder: 1,
              startTime: '',
              gates: '',
              pen: 0,
              time: '70.00',
              total: '70.00',
              behind: '',
            },
          ],
        },
        onCourse: [
          {
            bib: '5',
            name: 'Current',
            club: 'Club',
            nat: '',
            raceId: 'K1M_ST_BR1_6',
            raceName: 'Race',
            startOrder: 5,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:00:00',
            dtFinish: null,
            pen: 0,
            time: 5000,
            total: 5000,
            ttbDiff: '',
            ttbName: '',
            rank: 2,
            position: 1,
          },
        ],
      });

      const messages = formatAllMessages(state);

      expect(messages).toHaveLength(3);

      const parsed = messages.map((m) => JSON.parse(m));
      expect(parsed[0].msg).toBe('top');
      expect(parsed[1].msg).toBe('oncourse');
      expect(parsed[2].msg).toBe('comp');
    });

    it('should only include oncourse when no results or competitors', () => {
      const state = createMockState({
        results: null,
        onCourse: [],
      });

      const messages = formatAllMessages(state);

      expect(messages).toHaveLength(1);
      const parsed = JSON.parse(messages[0]);
      expect(parsed.msg).toBe('oncourse');
      expect(parsed.data).toEqual([]);
    });
  });
});
