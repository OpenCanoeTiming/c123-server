import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTimeOfDay,
  createOnCourse,
  createResults,
  createRaceConfig,
  createSchedule,
  createConnected,
  createError,
} from '../factory.js';

describe('C123 Protocol Factory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-02T10:30:45.123Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createTimeOfDay', () => {
    it('creates TimeOfDay message with timestamp', () => {
      const msg = createTimeOfDay({ time: '10:30:45' });

      expect(msg.type).toBe('TimeOfDay');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.time).toBe('10:30:45');
    });
  });

  describe('createOnCourse', () => {
    it('creates OnCourse message with competitors', () => {
      const msg = createOnCourse({
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
      });

      expect(msg.type).toBe('OnCourse');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.total).toBe(1);
      expect(msg.data.competitors).toHaveLength(1);
      expect(msg.data.competitors[0].bib).toBe('9');
    });

    it('creates OnCourse message with empty competitors', () => {
      const msg = createOnCourse({ total: 0, competitors: [] });

      expect(msg.type).toBe('OnCourse');
      expect(msg.data.total).toBe(0);
      expect(msg.data.competitors).toHaveLength(0);
    });
  });

  describe('createResults', () => {
    it('creates Results message with rows', () => {
      const msg = createResults({
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
      });

      expect(msg.type).toBe('Results');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.raceId).toBe('K1M_ST_BR2_6');
      expect(msg.data.isCurrent).toBe(true);
      expect(msg.data.rows).toHaveLength(1);
    });
  });

  describe('createRaceConfig', () => {
    it('creates RaceConfig message', () => {
      const msg = createRaceConfig({
        nrSplits: 0,
        nrGates: 24,
        gateConfig: 'NNRNNRNRNNNRNNRNRNNRNNRN',
        gateCaptions: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24',
      });

      expect(msg.type).toBe('RaceConfig');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.nrGates).toBe(24);
      expect(msg.data.gateConfig).toBe('NNRNNRNRNNNRNNRNRNNRNNRN');
    });
  });

  describe('createSchedule', () => {
    it('creates Schedule message with races', () => {
      const msg = createSchedule({
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
          {
            order: 102,
            raceId: 'K1M_ST_BR2_6',
            race: 'K1m - střední trať - 2. jízda',
            mainTitle: 'K1m - střední trať',
            subTitle: '2nd Run',
            shortTitle: 'K1m - střední trať - 2. jízda',
            raceStatus: 3,
            startTime: '10:00:00',
          },
        ],
      });

      expect(msg.type).toBe('Schedule');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.races).toHaveLength(2);
      expect(msg.data.races[0].raceStatus).toBe(5); // finished
      expect(msg.data.races[1].raceStatus).toBe(3); // running
    });
  });

  describe('createConnected', () => {
    it('creates Connected message', () => {
      const msg = createConnected('2.0.0', true, false);

      expect(msg.type).toBe('Connected');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.version).toBe('2.0.0');
      expect(msg.data.c123Connected).toBe(true);
      expect(msg.data.xmlLoaded).toBe(false);
    });

    it('creates Connected message with all sources connected', () => {
      const msg = createConnected('2.0.0', true, true);

      expect(msg.data.c123Connected).toBe(true);
      expect(msg.data.xmlLoaded).toBe(true);
    });
  });

  describe('createError', () => {
    it('creates Error message', () => {
      const msg = createError('CONNECTION_FAILED', 'Failed to connect to C123');

      expect(msg.type).toBe('Error');
      expect(msg.timestamp).toBe('2025-01-02T10:30:45.123Z');
      expect(msg.data.code).toBe('CONNECTION_FAILED');
      expect(msg.data.message).toBe('Failed to connect to C123');
    });

    it('creates Error message with different codes', () => {
      const codes = ['XML_PARSE_ERROR', 'TIMEOUT', 'INVALID_DATA'];
      for (const code of codes) {
        const msg = createError(code, `Error: ${code}`);
        expect(msg.data.code).toBe(code);
      }
    });
  });
});
