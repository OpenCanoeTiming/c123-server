import { describe, it, expect } from 'vitest';
import { parseTcp } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, obsOf, instant } from './helpers.js';

// DERIVATIONS §0.2. Base: real OnCourse (nkz-19so 003 ts 991): dtStart="9:54:18.070" dtFinish="9:55:46.920", bib 57, K1M_BR1_19.
// Variants substitute the time of day (synthetic) to hit DST edges; the structure is the recorded one.
const withFinish = (t: string): string => TCP.onCourseFinished.replace('dtFinish="9:55:46.920"', `dtFinish="${t}"`);
const finish = (t: string, c: Record<string, unknown>) => obsOf(parseTcp(withFinish(t), c as any), 'status');
const phaseDate = (d: string) => ctx({ phaseDates: { K1M_BR1_19: d } });

describe('§0.2 eventTime', () => {
  it('§0.2 eventTime = Phase.date + time of day + zone (2026-09-19, Europe/Prague, +02:00): 9:55:46.920 -> 07:55:46.920Z', () => {
    expect(instant(finish('9:55:46.920', ctx())?.eventTime)).toBe(Date.UTC(2026, 8, 19, 7, 55, 46, 920));
  });
  it('§0.2 the zone is an IANA name, not a fixed offset: the same time of day in January (+01:00) is 08:55:46.920Z', () => {
    expect(instant(finish('9:55:46.920', phaseDate('2026-01-15'))?.eventTime)).toBe(Date.UTC(2026, 0, 15, 8, 55, 46, 920));
  });
  it('§0.2 spring switch 2026-03-29 (02:00 CET -> 03:00 CEST): 1:30:00 is +01:00 (00:30Z)', () => {
    expect(instant(finish('1:30:00.000', phaseDate('2026-03-29'))?.eventTime)).toBe(Date.UTC(2026, 2, 29, 0, 30, 0));
  });
  it('§0.2 spring switch 2026-03-29: 3:30:00 is +02:00 (01:30Z)', () => {
    expect(instant(finish('3:30:00.000', phaseDate('2026-03-29'))?.eventTime)).toBe(Date.UTC(2026, 2, 29, 1, 30, 0));
  });
  it('§0.2 the day after the spring switch is already +02:00', () => {
    expect(instant(finish('9:00:00.000', phaseDate('2026-03-30'))?.eventTime)).toBe(Date.UTC(2026, 2, 30, 7, 0, 0));
  });
  it('§0.2 autumn switch 2026-10-25 (03:00 CEST -> 02:00 CET): 1:30:00 is +02:00 (23:30Z the day before)', () => {
    expect(instant(finish('1:30:00.000', phaseDate('2026-10-25'))?.eventTime)).toBe(Date.UTC(2026, 9, 24, 23, 30, 0));
  });
  it('§0.2 autumn switch 2026-10-25: 3:30:00, after the repeated hour, is +01:00 (02:30Z)', () => {
    expect(instant(finish('3:30:00.000', phaseDate('2026-10-25'))?.eventTime)).toBe(Date.UTC(2026, 9, 25, 2, 30, 0));
  });
  it('§0.2 review correction: the repeated hour pins the later instant, standard time: 2:30:00 on 2026-10-25 is 01:30Z', () => {
    expect(instant(finish('2:30:00.000', phaseDate('2026-10-25'))?.eventTime)).toBe(Date.UTC(2026, 9, 25, 1, 30, 0));
  });
  it('§0.2 the skipped spring hour is shifted forward by the gap: 2:30:00 on 2026-03-29 is 03:30 CEST = 01:30Z', () => {
    expect(instant(finish('2:30:00.000', phaseDate('2026-03-29'))?.eventTime)).toBe(Date.UTC(2026, 2, 29, 1, 30, 0));
  });
  it('§0.2 the day after the autumn switch is +01:00', () => {
    expect(instant(finish('9:00:00.000', phaseDate('2026-10-26'))?.eventTime)).toBe(Date.UTC(2026, 9, 26, 8, 0, 0));
  });
  it('§0.2 the date is the Phase.date, not the date of observedAt', () => {
    const c = ctx({ observedAt: '2026-09-20T00:30:00.000Z' });
    expect(instant(finish('9:55:46.920', c)?.eventTime)).toBe(Date.UTC(2026, 8, 19, 7, 55, 46, 920));
  });
  it('§0.2 never shifted to the server clock: a wildly different observedAt leaves eventTime unchanged', () => {
    const a = finish('9:55:46.920', ctx({ observedAt: '2026-09-19T08:00:00.000Z' }))?.eventTime;
    const b = finish('9:55:46.920', ctx({ observedAt: '2026-09-19T19:59:00.000Z' }))?.eventTime;
    expect(instant(a)).toBe(instant(b));
  });
  it('§0.2 failure mode: no configured zone means eventTime is omitted, never guessed', () => {
    const st = finish('9:55:46.920', ctx({ zone: undefined }));
    expect(st?.value).toBe('finished');
    expect(st).not.toHaveProperty('eventTime');
  });
});
