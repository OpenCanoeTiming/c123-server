/**
 * Tests for deriveEventStatus
 */

import { describe, it, expect } from 'vitest';
import { deriveEventStatus, isForwardTransition, STATUS_ORDER } from '../deriveEventStatus.js';
import type { ScheduleRace } from '../../protocol/types.js';

/** Helper to create a minimal ScheduleRace with a given status */
function race(raceId: string, raceStatus: number): ScheduleRace {
  return {
    order: 1,
    raceId,
    race: raceId,
    mainTitle: raceId,
    subTitle: '',
    shortTitle: raceId,
    raceStatus,
    startTime: '10:00:00',
  };
}

describe('deriveEventStatus', () => {
  it('returns null for empty schedule', () => {
    expect(deriveEventStatus([])).toBeNull();
  });

  it('returns null when all races are excluded (Cancelled/Rescheduled/Postponed)', () => {
    expect(deriveEventStatus([
      race('r1', 7),  // Cancelled
      race('r2', 12), // Rescheduled
      race('r3', 13), // Postponed
    ])).toBeNull();
  });

  it('returns draft when all races are Scheduled (0)', () => {
    expect(deriveEventStatus([
      race('r1', 0),
      race('r2', 0),
    ])).toBe('draft');
  });

  it('returns startlist when at least one race is StartList (1)', () => {
    expect(deriveEventStatus([
      race('r1', 0),
      race('r2', 1),
    ])).toBe('startlist');
  });

  it('returns startlist for Delayed (2) races', () => {
    expect(deriveEventStatus([
      race('r1', 0),
      race('r2', 2),
    ])).toBe('startlist');
  });

  it('returns startlist for GettingReady (8) races', () => {
    expect(deriveEventStatus([
      race('r1', 8),
    ])).toBe('startlist');
  });

  it('returns running when at least one race is InProgress (3)', () => {
    expect(deriveEventStatus([
      race('r1', 1),
      race('r2', 3),
      race('r3', 0),
    ])).toBe('running');
  });

  it('returns running when at least one race is Unofficial (4)', () => {
    expect(deriveEventStatus([
      race('r1', 5),
      race('r2', 4),
    ])).toBe('running');
  });

  it('returns running for mix of InProgress and Official', () => {
    expect(deriveEventStatus([
      race('r1', 5),
      race('r2', 3),
      race('r3', 5),
    ])).toBe('running');
  });

  it('returns official when all active races are Official (5)', () => {
    expect(deriveEventStatus([
      race('r1', 5),
      race('r2', 5),
    ])).toBe('official');
  });

  it('returns official for mix of Official (5) and Revised (6)', () => {
    expect(deriveEventStatus([
      race('r1', 5),
      race('r2', 6),
    ])).toBe('official');
  });

  it('excludes Cancelled races from "all official" check', () => {
    expect(deriveEventStatus([
      race('r1', 5),
      race('r2', 7),  // Cancelled — excluded
      race('r3', 5),
    ])).toBe('official');
  });

  it('excludes Postponed races from evaluation', () => {
    expect(deriveEventStatus([
      race('r1', 3),
      race('r2', 13), // Postponed — excluded
    ])).toBe('running');
  });

  it('treats Unconfirmed (9) as startlist-level', () => {
    expect(deriveEventStatus([
      race('r1', 9),
    ])).toBe('startlist');
  });

  it('treats Protested (10) as startlist-level', () => {
    expect(deriveEventStatus([
      race('r1', 10),
    ])).toBe('startlist');
  });

  it('treats Interrupted (11) as startlist-level', () => {
    expect(deriveEventStatus([
      race('r1', 11),
    ])).toBe('startlist');
  });
});

describe('isForwardTransition', () => {
  it('returns true for draft → startlist', () => {
    expect(isForwardTransition('draft', 'startlist')).toBe(true);
  });

  it('returns true for startlist → running', () => {
    expect(isForwardTransition('startlist', 'running')).toBe(true);
  });

  it('returns true for running → official', () => {
    expect(isForwardTransition('running', 'official')).toBe(true);
  });

  it('returns true for running → finished', () => {
    expect(isForwardTransition('running', 'finished')).toBe(true);
  });

  it('returns true for finished → official', () => {
    expect(isForwardTransition('finished', 'official')).toBe(true);
  });

  it('returns false for same status', () => {
    expect(isForwardTransition('running', 'running')).toBe(false);
  });

  it('returns false for backward transition official → running', () => {
    expect(isForwardTransition('official', 'running')).toBe(false);
  });

  it('returns false for backward transition running → draft', () => {
    expect(isForwardTransition('running', 'draft')).toBe(false);
  });
});

describe('STATUS_ORDER', () => {
  it('has correct ordering', () => {
    expect(STATUS_ORDER.draft).toBeLessThan(STATUS_ORDER.startlist);
    expect(STATUS_ORDER.startlist).toBeLessThan(STATUS_ORDER.running);
    expect(STATUS_ORDER.running).toBeLessThan(STATUS_ORDER.finished);
    expect(STATUS_ORDER.finished).toBeLessThan(STATUS_ORDER.official);
  });
});
