import { describe, it, expect } from 'vitest';
import { computeScheduleFingerprint, isSameEvent } from '../fingerprint.js';
import type { XmlScheduleItem } from '../../service/XmlDataService.js';

function race(raceId: string, startTime?: string): XmlScheduleItem {
  return startTime === undefined ? { raceId } : { raceId, startTime };
}

describe('computeScheduleFingerprint', () => {
  it('builds sorted raceId@day tokens joined by pipe', () => {
    const schedule = [
      race('K1M_BR2', '2026-04-19T13:30:00+02:00'),
      race('C1W_BR1', '2026-04-19T09:00:00+02:00'),
      race('K1M_BR1', '2026-04-19T10:00:00+02:00'),
    ];

    expect(computeScheduleFingerprint(schedule)).toBe(
      'C1W_BR1@2026-04-19|K1M_BR1@2026-04-19|K1M_BR2@2026-04-19'
    );
  });

  it('takes the day as written, without shifting a late race into UTC', () => {
    // 23:30+02:00 is 21:30Z the same day, but a +14:00 zone would roll over.
    // Slicing the string keeps the organiser's day in every zone.
    const schedule = [race('K1M_BR1', '2026-04-19T23:30:00+02:00')];

    expect(computeScheduleFingerprint(schedule)).toBe('K1M_BR1@2026-04-19');
  });

  it('emits an empty day for races without StartTime', () => {
    // Extreme heats (XT, X4) omit StartTime entirely.
    const schedule = [race('K1XM-ZS_XT_25')];

    expect(computeScheduleFingerprint(schedule)).toBe('K1XM-ZS_XT_25@');
  });

  it('returns an empty string for an empty schedule', () => {
    expect(computeScheduleFingerprint([])).toBe('');
  });

  it('deduplicates identical tokens', () => {
    const schedule = [
      race('K1M_BR1', '2026-04-19T10:00:00+02:00'),
      race('K1M_BR1', '2026-04-19T10:00:00+02:00'),
    ];

    expect(computeScheduleFingerprint(schedule)).toBe('K1M_BR1@2026-04-19');
  });

  it('separates the same race held on different days', () => {
    const april = computeScheduleFingerprint([race('K1M_BR1', '2026-04-19T10:00:00+02:00')]);
    const may = computeScheduleFingerprint([race('K1M_BR1', '2026-05-19T10:00:00+02:00')]);

    expect(april).not.toBe(may);
  });
});

describe('isSameEvent', () => {
  const stored = 'A@2026-04-19|B@2026-04-19|C@2026-04-19|D@2026-04-19';

  it('accepts an added race', () => {
    expect(isSameEvent(stored, `${stored}|E@2026-04-19`)).toBe(true);
  });

  it('accepts a removed race', () => {
    expect(isSameEvent(stored, 'A@2026-04-19|B@2026-04-19|C@2026-04-19')).toBe(true);
  });

  it('accepts exactly half the stored races surviving', () => {
    expect(isSameEvent(stored, 'A@2026-04-19|B@2026-04-19')).toBe(true);
  });

  it('rejects fewer than half surviving', () => {
    expect(isSameEvent(stored, 'A@2026-04-19')).toBe(false);
  });

  it('rejects a completely different schedule', () => {
    expect(isSameEvent(stored, 'X@2026-05-01|Y@2026-05-01')).toBe(false);
  });

  it('rejects the same races on a different day', () => {
    expect(isSameEvent(stored, 'A@2026-05-19|B@2026-05-19|C@2026-05-19|D@2026-05-19')).toBe(false);
  });

  it('treats an unpinned stored fingerprint as matching anything', () => {
    expect(isSameEvent('', 'A@2026-04-19')).toBe(true);
  });

  it('handles an odd stored count at the boundary', () => {
    const three = 'A@2026-04-19|B@2026-04-19|C@2026-04-19';
    // 2 of 3 is 0.67, above the ratio; 1 of 3 is 0.33, below it.
    expect(isSameEvent(three, 'A@2026-04-19|B@2026-04-19')).toBe(true);
    expect(isSameEvent(three, 'A@2026-04-19')).toBe(false);
  });
});
