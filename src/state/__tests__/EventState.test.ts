import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventState } from '../EventState.js';
import type { ParsedMessage, OnCourseCompetitor } from '../../parsers/types.js';

describe('EventState', () => {
  let state: EventState;

  beforeEach(() => {
    vi.useFakeTimers();
    state = new EventState();
  });

  afterEach(() => {
    state.destroy();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      expect(state.state).toEqual({
        timeOfDay: null,
        raceConfig: null,
        schedule: [],
        currentRaceId: null,
        onCourse: [],
        results: null,
        highlightBib: null,
        scheduleFingerprint: null,
      });
    });
  });

  describe('processMessage', () => {
    it('should update timeOfDay', () => {
      const message: ParsedMessage = {
        type: 'timeofday',
        data: { time: '14:30:00' },
      };

      state.processMessage(message);

      expect(state.state.timeOfDay).toBe('14:30:00');
    });

    it('should update raceConfig', () => {
      const message: ParsedMessage = {
        type: 'raceconfig',
        data: {
          nrSplits: 2,
          nrGates: 20,
          gateConfig: 'NRNRNRNRNRNRNRNRNRNR',
          gateCaptions: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20',
        },
      };

      state.processMessage(message);

      expect(state.state.raceConfig).toEqual(message.data);
    });

    it('should update schedule', () => {
      const message: ParsedMessage = {
        type: 'schedule',
        data: {
          races: [
            {
              order: 1,
              raceId: 'K1M_ST_BR1',
              race: 'K1m - střední trať - 1. jízda',
              mainTitle: 'K1m - střední trať',
              subTitle: '1. jízda',
              shortTitle: 'K1m ST BR1',
              raceStatus: 3,
              startTime: '10:00',
            },
          ],
        },
      };

      state.processMessage(message);

      expect(state.state.schedule).toHaveLength(1);
      expect(state.state.schedule[0].raceId).toBe('K1M_ST_BR1');
    });

    it('should update onCourse', () => {
      const competitor: OnCourseCompetitor = createCompetitor('1', 'K1M_ST_BR1');

      const message: ParsedMessage = {
        type: 'oncourse',
        data: {
          total: 1,
          competitors: [competitor],
        },
      };

      state.processMessage(message);

      expect(state.state.onCourse).toHaveLength(1);
      expect(state.state.onCourse[0].bib).toBe('1');
    });

    it('should update currentRaceId from onCourse', () => {
      const competitor = createCompetitor('1', 'K1M_ST_BR1');

      const message: ParsedMessage = {
        type: 'oncourse',
        data: { total: 1, competitors: [competitor] },
      };

      const raceChangeSpy = vi.fn();
      state.on('raceChange', raceChangeSpy);

      state.processMessage(message);

      expect(state.state.currentRaceId).toBe('K1M_ST_BR1');
      expect(raceChangeSpy).toHaveBeenCalledWith('K1M_ST_BR1');
    });

    it('should update results', () => {
      const message: ParsedMessage = {
        type: 'results',
        data: {
          raceId: 'K1M_ST_BR1',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m - střední trať',
          subTitle: '1. jízda',
          rows: [
            {
              rank: 1,
              bib: '1',
              name: 'Jan Novák',
              givenName: 'Jan',
              familyName: 'Novák',
              club: 'KV Praha',
              nat: 'CZE',
              startOrder: 1,
              startTime: '10:00:00',
              gates: '',
              pen: 0,
              time: '79.99',
              total: '79.99',
              behind: '',
            },
          ],
        },
      };

      state.processMessage(message);

      expect(state.state.results).not.toBeNull();
      expect(state.state.results?.rows).toHaveLength(1);
    });

    it('should emit change event', () => {
      const changeSpy = vi.fn();
      state.on('change', changeSpy);

      state.processMessage({
        type: 'timeofday',
        data: { time: '14:30:00' },
      });

      expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    it('should ignore unknown messages', () => {
      const changeSpy = vi.fn();
      state.on('change', changeSpy);

      state.processMessage({ type: 'unknown', data: null });

      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  describe('finish detection', () => {
    it('should detect finish when dtFinish changes from null to value', () => {
      const finishSpy = vi.fn();
      state.on('finish', finishSpy);

      // First update: competitor on course, no finish
      const comp1 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: null });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp1] },
      });

      expect(finishSpy).not.toHaveBeenCalled();

      // Second update: same competitor, now finished
      const comp2 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: '10:35:11.325' });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp2] },
      });

      expect(finishSpy).toHaveBeenCalledTimes(1);
      expect(finishSpy).toHaveBeenCalledWith(expect.objectContaining({ bib: '1' }));
    });

    it('should set highlightBib on finish', () => {
      const comp1 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: null });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp1] },
      });

      const comp2 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: '10:35:11.325' });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp2] },
      });

      expect(state.state.highlightBib).toBe('1');
    });

    it('should auto-clear highlightBib after timeout', () => {
      const comp1 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: null });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp1] },
      });

      const comp2 = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: '10:35:11.325' });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp2] },
      });

      expect(state.state.highlightBib).toBe('1');

      vi.advanceTimersByTime(10000);

      expect(state.state.highlightBib).toBeNull();
    });

    it('should not detect finish for new competitor with dtFinish already set', () => {
      const finishSpy = vi.fn();
      state.on('finish', finishSpy);

      // Competitor appears with finish already set (e.g., reconnect scenario)
      const comp = createCompetitor('1', 'K1M_ST_BR1', { dtFinish: '10:35:11.325' });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [comp] },
      });

      expect(finishSpy).not.toHaveBeenCalled();
    });
  });

  describe('setHighlightBib', () => {
    it('should manually set highlight', () => {
      state.setHighlightBib('5');

      expect(state.state.highlightBib).toBe('5');
    });

    it('should clear highlight when set to null', () => {
      state.setHighlightBib('5');
      state.setHighlightBib(null);

      expect(state.state.highlightBib).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      // Populate state
      state.processMessage({
        type: 'timeofday',
        data: { time: '14:30:00' },
      });
      state.processMessage({
        type: 'oncourse',
        data: { total: 1, competitors: [createCompetitor('1', 'K1M_ST_BR1')] },
      });

      state.reset();

      expect(state.state).toEqual({
        timeOfDay: null,
        raceConfig: null,
        schedule: [],
        currentRaceId: null,
        onCourse: [],
        results: null,
        highlightBib: null,
        scheduleFingerprint: null,
      });
    });

    it('should emit change event on reset', () => {
      const changeSpy = vi.fn();
      state.on('change', changeSpy);

      state.reset();

      expect(changeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('schedule change detection', () => {
    it('should create schedule fingerprint from races', () => {
      state.processMessage({
        type: 'schedule',
        data: {
          races: [
            createScheduleRace('K1M_ST_BR1_6', 1),
            createScheduleRace('K1M_ST_BR2_6', 2),
          ],
        },
      });

      expect(state.state.scheduleFingerprint).toBe('K1M_ST_BR1_6|K1M_ST_BR2_6');
    });

    it('should not emit scheduleChange on first schedule', () => {
      const changeSpy = vi.fn();
      state.on('scheduleChange', changeSpy);

      state.processMessage({
        type: 'schedule',
        data: {
          races: [createScheduleRace('K1M_ST_BR1_6', 1)],
        },
      });

      expect(changeSpy).not.toHaveBeenCalled();
    });

    it('should emit scheduleChange when schedule changes', () => {
      const changeSpy = vi.fn();

      // Set initial schedule
      state.processMessage({
        type: 'schedule',
        data: {
          races: [createScheduleRace('K1M_ST_BR1_6', 1)],
        },
      });

      state.on('scheduleChange', changeSpy);

      // Change schedule (different event)
      state.processMessage({
        type: 'schedule',
        data: {
          races: [createScheduleRace('C1W_HO_BR1_7', 1)],
        },
      });

      expect(changeSpy).toHaveBeenCalledWith('C1W_HO_BR1_7');
    });

    it('should not emit scheduleChange if schedule is the same', () => {
      const changeSpy = vi.fn();

      // Set initial schedule
      state.processMessage({
        type: 'schedule',
        data: {
          races: [
            createScheduleRace('K1M_ST_BR1_6', 1),
            createScheduleRace('K1M_ST_BR2_6', 2),
          ],
        },
      });

      state.on('scheduleChange', changeSpy);

      // Same schedule again
      state.processMessage({
        type: 'schedule',
        data: {
          races: [
            createScheduleRace('K1M_ST_BR1_6', 1),
            createScheduleRace('K1M_ST_BR2_6', 2),
          ],
        },
      });

      expect(changeSpy).not.toHaveBeenCalled();
    });

    it('should handle empty schedule', () => {
      state.processMessage({
        type: 'schedule',
        data: { races: [] },
      });

      expect(state.state.scheduleFingerprint).toBe('');
    });
  });
});

function createScheduleRace(raceId: string, order: number) {
  return {
    order,
    raceId,
    race: `Test Race ${order}`,
    mainTitle: 'Test',
    subTitle: '',
    shortTitle: 'T',
    raceStatus: 3,
    startTime: '10:00:00',
  };
}

function createCompetitor(
  bib: string,
  raceId: string,
  overrides: Partial<OnCourseCompetitor> = {}
): OnCourseCompetitor {
  return {
    bib,
    name: `Test Competitor ${bib}`,
    club: 'Test Club',
    nat: 'CZE',
    raceId,
    raceName: 'Test Race',
    startOrder: 1,
    warning: '',
    gates: '',
    completed: false,
    dtStart: '10:00:00.000',
    dtFinish: null,
    pen: 0,
    time: null,
    total: null,
    ttbDiff: '',
    ttbName: '',
    rank: 0,
    position: 1,
    ...overrides,
  };
}
