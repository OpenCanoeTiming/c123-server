/**
 * #203 round 19, reader (code item 11; DERIVATIONS §0.3; #255a, #255b, #255c). Harness: xml-reader-harness.ts, a fake Clock and fs, every test builds its own.
 */
import { describe, it, expect } from 'vitest';
import { createXmlReader } from '../xml-reader.js';
import { ctx } from './helpers.js';
import { fakeClock, fakeFs, file, whole, truncated, iso, type FakeFile } from './xml-reader-harness.js';

const P = '/data/event.xml';
type El = Record<string, any>;

function setup(files: Record<string, FakeFile> = { [P]: file('slalom.xml', 1000) }) {
  const clock = fakeClock();
  const f = fakeFs(clock, files);
  const units: El[][] = [];
  const statuses: El[] = [];
  const reader = createXmlReader({ path: P, pollIntervalSeconds: 5, clock, fs: f.fs, ctx: ctx(), onUnit: (els: El[]) => void units.push(els), onStatus: (st: El) => void statuses.push(st) });
  const until = async (t: number) => { await clock.advance(Math.max(0, t - clock.now())); };
  const first = async () => {
    reader.start();
    for (let i = 0; i < 2000 && f.statLog.length < 1; i++) await clock.advance(100);
    await clock.advance(0);
    return f.statLog[0]!.at;
  };
  return { clock, f, units, statuses, reader, until, first, last: () => statuses[statuses.length - 1] };
}
const event = (u: El[]): El => u.find((e) => e.event === 'xml-rewrite-detected')!;

describe('#255a observedAt is taken after the detecting stat returns (DERIVATIONS §0.3 "What the reader stamps")', () => {
  it('a stat with 1 s latency that sees the new signature: observedAt is the instant it returned, changedAfter the call time of the previous poll\'s stat; the write is before observedAt', async () => {
    const s = setup();
    const t0 = await s.first();
    await s.until(t0 + 1500);
    s.units.length = 0;
    s.f.ctl.statMs = 1000;
    await s.until(t0 + 5000 + 2000); // the poll at t0+5s sampled the old file and returned at t0+6s
    const wrote = s.clock.now();
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 10000 + 3000);
    expect(s.units).toHaveLength(1);
    const detecting = s.f.statLog.find((x) => x.mtimeMs === 2000)!;
    const previous = [...s.f.statLog].reverse().find((x) => x.at < detecting.at && x.mtimeMs === 1000)!;
    const ev = event(s.units[0]!);
    expect(detecting.at).toBe(t0 + 10000); // the call
    expect(ev.observedAt).toBe(iso(detecting.at + 1000)); // after it returned
    expect(Date.parse(ev.observedAt)).toBeGreaterThan(wrote);
    expect(ev.changedAfter).toBe(iso(previous.at)); // taken before the call of the stat that last showed the old file
    expect(s.last()?.lastRewriteDetectedAt).toBe(ev.observedAt);
    s.reader.stop();
  });

  it('with no latency the two instants coincide (the fake clock does not move inside a stat): observedAt equals the detecting call, as in the round-18 tests', async () => {
    const s = setup();
    const t0 = await s.first();
    await s.until(t0 + 1500);
    s.units.length = 0;
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 5000 + 1500);
    expect(event(s.units[0]!).observedAt).toBe(iso(t0 + 5000));
    s.reader.stop();
  });
});

describe('#255b a stuck file is re-read once per poll without counting a burst (DERIVATIONS §0.3 "Validation and the states")', () => {
  it('invalid as it stands for five polls: tornReads 4 and abandonedReads 1 from the one burst, failed polls drive the states, the reads continue one per poll', async () => {
    const s = setup({ [P]: { mtimeMs: 1000, size: 10, content: truncated(whole('slalom.xml')) } });
    const t0 = await s.first();
    await s.until(t0 + 5 * 5000 + 2500);
    expect(s.last()?.state).toBe('unreachable');
    expect(s.last()?.tornReads).toBe(4);
    expect(s.last()?.abandonedReads).toBe(1);
    expect(s.f.readLog.length).toBeGreaterThan(4);
    s.reader.stop();
  });
});

describe('#255c a first read invalid and then valid under one signature (DERIVATIONS §0.3 "changedAfter")', () => {
  it('changedAfter is null (key present): no other signature was seen', async () => {
    const s = setup({ [P]: { mtimeMs: 1000, size: 10, content: truncated(whole('slalom.xml')) } });
    const t0 = await s.first();
    await s.until(t0 + 5000 + 2500);
    expect(s.units).toHaveLength(0);
    s.f.files[P] = { mtimeMs: 1000, size: 10, content: whole('slalom.xml') };
    await s.until(t0 + 3 * 5000 + 2500);
    expect(s.units).toHaveLength(1);
    const ev = event(s.units[0]!);
    expect(Object.prototype.hasOwnProperty.call(ev, 'changedAfter')).toBe(true);
    expect(ev.changedAfter).toBeNull();
    expect(ev.observedAt).toBe(iso(t0));
    s.reader.stop();
  });

  it('a first read whose file MOVED before the read that succeeded has a changedAfter (the parenthetical of §0.3 stands)', async () => {
    const s = setup({ [P]: { mtimeMs: 1000, size: 10, content: truncated(whole('slalom.xml')) } });
    const t0 = await s.first();
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 4 * 5000 + 2500);
    expect(s.units.length).toBeGreaterThanOrEqual(1);
    const ev = event(s.units[0]!);
    expect(ev.changedAfter).not.toBeNull();
    expect(Date.parse(ev.changedAfter)).toBeLessThan(Date.parse(ev.observedAt));
    s.reader.stop();
  });
});
