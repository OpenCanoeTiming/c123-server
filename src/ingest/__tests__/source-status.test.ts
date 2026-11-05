import { describe, it, expect } from 'vitest';
import { parseTcp } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, type El } from './helpers.js';

// DERIVATIONS §5: what the wire provides for SourceStatus. ASSUMED element: { sourceStatus: { tcp: { upstreamInstance?, timingClockOffsetSeconds? } }, observedAt }.
// Connection state, live state and xml.lastRewriteDetectedAt are not on the TCP wire (I/O, #202/#210): recorded in the result file.
const ss = (els: unknown): El | undefined => (els as El[]).find((e) => e.sourceStatus)?.sourceStatus?.tcp;
describe('§5 SourceStatus', () => {
  it.each([
    ['TimeOfDay', TCP.timeOfDay], ['OnCourse', TCP.onCourseRunning], ['Results', TCP.resultsBr1], ['RaceConfig', TCP.raceConfigSlalom],
    ['Schedule', TCP.scheduleSlalom], ['TVS', TCP.tvs],
  ])('§5 tcp.upstreamInstance is Canoe123@System on every message: %s (System="Main")', (_n, msg) => {
    expect(ss(parseTcp(msg, ctx()))?.upstreamInstance).toBe('Main');
  });
  it.each(['Backup', 'Offline'])('§5 tcp.upstreamInstance %s (synthetic System on the recorded TimeOfDay shape)', (v) => {
    expect(ss(parseTcp(TCP.timeOfDay.replace('System="Main"', `System="${v}"`), ctx()))?.upstreamInstance).toBe(v);
  });
  it('§5 tcp.timingClockOffsetSeconds = TimeOfDay minus the server clock at receipt: 09:56:06 Prague (07:56:06Z) vs observedAt 08:00:00Z = -234', () => {
    expect(ss(parseTcp(TCP.timeOfDay, ctx()))?.timingClockOffsetSeconds).toBe(-234);
  });
  it('§5 the offset is diagnostic only: TimeOfDay yields no Phase or Attempt element', () => {
    expect((parseTcp(TCP.timeOfDay, ctx()) as El[]).filter((e) => e.attemptId || e.snapshot || e.phaseId)).toEqual([]);
  });
});
