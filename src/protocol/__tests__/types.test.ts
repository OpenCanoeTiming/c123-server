import { describe, it, expect } from 'vitest';
import {
  isTimeOfDay,
  isOnCourse,
  isResults,
  isRaceConfig,
  isSchedule,
  isConnected,
  isError,
  type C123Message,
  type C123TimeOfDay,
  type C123OnCourse,
  type C123Results,
  type C123RaceConfig,
  type C123Schedule,
  type C123Connected,
  type C123Error,
} from '../types.js';

describe('C123 Protocol Types', () => {
  const timestamp = '2025-01-02T10:30:45.123Z';

  describe('type guards', () => {
    it('isTimeOfDay correctly identifies TimeOfDay messages', () => {
      const msg: C123TimeOfDay = {
        type: 'TimeOfDay',
        timestamp,
        data: { time: '10:30:45' },
      };
      expect(isTimeOfDay(msg)).toBe(true);
      expect(isOnCourse(msg)).toBe(false);
      expect(isResults(msg)).toBe(false);
    });

    it('isOnCourse correctly identifies OnCourse messages', () => {
      const msg: C123OnCourse = {
        type: 'OnCourse',
        timestamp,
        data: {
          total: 1,
          competitors: [
            {
              bib: '9',
              name: 'PRSKAVEC Jiří',
              club: 'USK Praha',
              nat: 'CZE',
              raceId: 'K1M_ST_BR2_6',
              raceName: 'K1m - střední trať - 2. jízda',
              startOrder: 9,
              warning: '',
              gates: '0,0,0,2,0',
              completed: false,
              dtStart: '16:14:00.000',
              dtFinish: null,
              pen: 2,
              time: '8115',
              total: '8117',
              ttbDiff: '+12.79',
              ttbName: 'J. KREJČÍ',
              rank: 8,
              position: 1,
            },
          ],
        },
      };
      expect(isOnCourse(msg)).toBe(true);
      expect(isTimeOfDay(msg)).toBe(false);
      expect(isResults(msg)).toBe(false);
    });

    it('isResults correctly identifies Results messages', () => {
      const msg: C123Results = {
        type: 'Results',
        timestamp,
        data: {
          raceId: 'K1M_ST_BR2_6',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m - střední trať',
          subTitle: '2nd Run',
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
              startTime: '10:06:45',
              gates: '0 0 0 0 2 0',
              pen: 2,
              time: '79.99',
              total: '81.99',
              behind: '',
            },
          ],
        },
      };
      expect(isResults(msg)).toBe(true);
      expect(isTimeOfDay(msg)).toBe(false);
      expect(isOnCourse(msg)).toBe(false);
    });

    it('isRaceConfig correctly identifies RaceConfig messages', () => {
      const msg: C123RaceConfig = {
        type: 'RaceConfig',
        timestamp,
        data: {
          nrSplits: 0,
          nrGates: 24,
          gateConfig: 'NNRNNRNRNNNRNNRNRNNRNNRN',
          gateCaptions: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24',
        },
      };
      expect(isRaceConfig(msg)).toBe(true);
      expect(isTimeOfDay(msg)).toBe(false);
    });

    it('isSchedule correctly identifies Schedule messages', () => {
      const msg: C123Schedule = {
        type: 'Schedule',
        timestamp,
        data: {
          races: [
            {
              order: 101,
              raceId: 'K1M_ST_BR1_6',
              race: 'K1m - střední trať - 1. jízda',
              mainTitle: 'K1m - střední trať',
              subTitle: '1st Run',
              shortTitle: 'K1m - střední trať - 1. jízda',
              raceStatus: 5,
              startTime: '',
            },
          ],
        },
      };
      expect(isSchedule(msg)).toBe(true);
      expect(isResults(msg)).toBe(false);
    });

    it('isConnected correctly identifies Connected messages', () => {
      const msg: C123Connected = {
        type: 'Connected',
        timestamp,
        data: {
          version: '2.0.0',
          c123Connected: true,
          xmlLoaded: false,
        },
      };
      expect(isConnected(msg)).toBe(true);
      expect(isError(msg)).toBe(false);
    });

    it('isError correctly identifies Error messages', () => {
      const msg: C123Error = {
        type: 'Error',
        timestamp,
        data: {
          code: 'CONNECTION_FAILED',
          message: 'Failed to connect to C123',
        },
      };
      expect(isError(msg)).toBe(true);
      expect(isConnected(msg)).toBe(false);
    });
  });

  describe('message structure', () => {
    it('all messages have required envelope fields', () => {
      const messages: C123Message[] = [
        { type: 'TimeOfDay', timestamp, data: { time: '10:30:45' } },
        {
          type: 'OnCourse',
          timestamp,
          data: { total: 0, competitors: [] },
        },
        {
          type: 'Results',
          timestamp,
          data: {
            raceId: 'K1M_ST_BR1_6',
            classId: 'K1M_ST',
            isCurrent: false,
            mainTitle: 'K1m',
            subTitle: '1st Run',
            rows: [],
          },
        },
        {
          type: 'RaceConfig',
          timestamp,
          data: { nrSplits: 0, nrGates: 24, gateConfig: '', gateCaptions: '' },
        },
        { type: 'Schedule', timestamp, data: { races: [] } },
        {
          type: 'Connected',
          timestamp,
          data: { version: '2.0.0', c123Connected: true, xmlLoaded: false },
        },
        {
          type: 'Error',
          timestamp,
          data: { code: 'TEST', message: 'Test error' },
        },
      ];

      for (const msg of messages) {
        expect(msg).toHaveProperty('type');
        expect(msg).toHaveProperty('timestamp');
        expect(msg).toHaveProperty('data');
        expect(typeof msg.type).toBe('string');
        expect(typeof msg.timestamp).toBe('string');
      }
    });

    it('Results with BR1/BR2 fields', () => {
      const msg: C123Results = {
        type: 'Results',
        timestamp,
        data: {
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
              startTime: '10:06:45',
              gates: '0 0 0 0 2 0',
              pen: 2,
              time: '79.99',
              total: '81.99',
              behind: '',
              // BR1/BR2 fields
              prevTime: 76990,
              prevPen: 2,
              prevTotal: 78990,
              prevRank: 1,
              totalTotal: 7899000,
              totalRank: 1,
              betterRun: 1,
            },
          ],
        },
      };

      expect(isResults(msg)).toBe(true);
      expect(msg.data.rows[0].prevTime).toBe(76990);
      expect(msg.data.rows[0].betterRun).toBe(1);
    });
  });
});
