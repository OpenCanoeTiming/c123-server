/**
 * #253 rows 1-13: the XML reader after contract round 18. Rules: CONTRACTS §2.8, §4 INV-2c; DERIVATIONS §0.3, §5;
 * #251 (re-entrancy). Interfaces assumed: xml-reader-harness.ts. Every test builds its own clock, fs and reader.
 *
 * `changedAfter` oracle used throughout: the time of the last successful stat (a statLog entry that has a
 * signature) before the detecting stat that showed a signature other than the one read whole.
 */
import { describe, it, expect } from 'vitest';
import { createXmlReader } from '../xml-reader.js';
import { ctx } from './helpers.js';
import { parseXmlSnapshot } from '../index.js';
import { fakeClock, fakeFs, file, whole, truncated, phaseIds, iso, type FakeFile } from './xml-reader-harness.js';

const P = '/data/event.xml';
type El = Record<string, any>;
const EMPTY_DOC = '<?xml version="1.0" encoding="utf-8"?><Canoe123Data></Canoe123Data>';

function setup(opts: { files?: Record<string, FakeFile>; path?: string | undefined; deliver?: (els: El[]) => void } = {}) {
  const clock = fakeClock();
  const f = fakeFs(clock, opts.files ?? { [P]: file('slalom.xml', 1000) });
  const units: El[][] = [];
  const statuses: El[] = [];
  const reader = createXmlReader({
    path: 'path' in opts ? opts.path : P,
    pollIntervalSeconds: 5,
    clock, fs: f.fs, ctx: ctx(),
    onUnit: (els: El[]) => { opts.deliver?.(els); units.push(els); },
    onStatus: (s: El) => { statuses.push(s); },
  });
  const last = () => statuses[statuses.length - 1];
  /** Run the clock until `ms` after `t`. */
  const until = async (t: number) => { await clock.advance(Math.max(0, t - clock.now())); };
  /** Start and wait for the first stat; returns its time (a poll grid anchor). */
  const startAndFirstStat = async () => {
    reader.start();
    for (let i = 0; i < 2000 && f.statLog.length < 1; i++) await clock.advance(100);
    await clock.advance(0);
    return f.statLog[0]!.at;
  };
  return { clock, f, units, statuses, reader, last, until, startAndFirstStat };
}
type S = ReturnType<typeof setup>;

const event = (u: El[]): El => u.find((e) => e.event === 'xml-rewrite-detected')!;
const hasKey = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
/** Index of the first stat of `path` that showed `mtime`. */
const firstStatShowing = (s: S, mtime: number) => s.f.statLog.findIndex((x) => x.mtimeMs === mtime);
/** The last stat before index `i` that had a signature other than `mtime` (the oracle). */
const lastOtherStat = (s: S, i: number, mtime: number) => {
  for (let j = i - 1; j >= 0; j--) { const x = s.f.statLog[j]!; if (x.mtimeMs !== undefined && x.mtimeMs !== mtime) return x; }
  return undefined;
};
/** Start, finish the first read, and clear the first unit. */
async function baseline(s: S): Promise<number> {
  const t0 = await s.startAndFirstStat();
  await s.until(t0 + 1500);
  s.units.length = 0;
  return t0;
}

describe('row 1-3 changedAfter (INV-2c, DERIVATIONS §0.3 "What the reader stamps")', () => {
  it('row 1 steady state: a rewrite between two polls carries the previous poll\'s stat time; the write is later; observedAt stays the first detection', async () => {
    const s = setup();
    const t0 = await baseline(s);
    await s.until(t0 + 5000 + 1000); // just after the second poll
    const wrote = s.clock.now();
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 10000 + 1500);
    expect(s.units.length).toBe(1);
    const ev = event(s.units[0]!);
    const i = firstStatShowing(s, 2000);
    const det = s.f.statLog[i]!.at;
    expect(det).toBe(t0 + 10000);
    expect(ev.observedAt).toBe(iso(det));
    expect(ev.changedAfter).toBe(iso(t0 + 5000)); // the previous poll, taken before the call
    expect(Date.parse(ev.changedAfter)).toBeLessThan(wrote);
    expect(wrote).toBeLessThan(det);
    s.reader.stop();
  });

  it('row 2 long read: a 7 s read on a 5 s poll; changedAfter is the read\'s closing stat, not an earlier poll', async () => {
    const s = setup();
    s.f.ctl.readMs = 7000;
    const t0 = await s.startAndFirstStat(); // the baseline read starts here and ends at t0 + 7000
    await s.until(t0 + 7000 + 100);
    const closing = s.f.statLog.find((x) => x.at === t0 + 7000);
    expect(closing, 'a closing stat after the read, at its end').toBeDefined();
    s.units.length = 0;
    s.f.ctl.readMs = 0;
    const wrote = s.clock.now();
    s.f.files[P] = file('cross.xml', 2000); // written after the closing stat, before the next poll
    await s.until(t0 + 30000);
    expect(s.units.length).toBe(1);
    const ev = event(s.units[0]!);
    const det = s.f.statLog[firstStatShowing(s, 2000)]!.at;
    expect(det).toBeGreaterThan(t0 + 7000);
    expect(ev.observedAt).toBe(iso(det));
    expect(ev.changedAfter).toBe(iso(t0 + 7000)); // the closing stat: no stat between it and detection showed the old file
    expect(det - Date.parse(ev.changedAfter)).toBeLessThanOrEqual(5000);
    expect(Date.parse(ev.changedAfter)).toBeLessThan(wrote);
    s.reader.stop();
  });

  it('row 2 long read, figures: stats at t5, t12 (closing), t15; t10 skipped; file changes at t13: changedAfter t12, observedAt t15, 3 s before detection', async () => {
    const s = setup();
    s.f.ctl.readMs = 7000;
    const t0 = await s.startAndFirstStat(); // t5
    await s.until(t0 + 7000 + 100);
    s.units.length = 0;
    s.f.ctl.readMs = 0;
    await s.until(t0 + 8000); // t13
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 10000 + 1500); // past t15
    expect([...new Set(s.f.statLog.map((x) => x.at).filter((at) => at <= t0 + 10000))]).toEqual([t0, t0 + 7000, t0 + 10000]); // the poll at t10 did not run
    expect(s.units.length).toBe(1);
    const ev = event(s.units[0]!);
    expect(ev.changedAfter).toBe(iso(t0 + 7000));
    expect(ev.observedAt).toBe(iso(t0 + 10000));
    expect(Date.parse(ev.observedAt) - Date.parse(ev.changedAfter)).toBe(3000);
    s.reader.stop();
  });

  it('row 3 recovery: failed stats, then a change; changedAfter is the last good stat, earlier than one interval before detection', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.remove(P);
    await s.until(t0 + 5 * 5000 + 1500); // several failed polls
    expect(s.last()?.state).not.toBe('connected');
    const wrote = s.clock.now();
    s.f.put(P, file('cross.xml', 2000));
    await s.until(t0 + 7 * 5000 + 1500);
    expect(s.units.length).toBe(1);
    const ev = event(s.units[0]!);
    const i = firstStatShowing(s, 2000);
    const lastGood = lastOtherStat(s, i, 2000)!;
    expect(lastGood.at).toBeLessThan(t0 + 2 * 5000); // before the file went missing
    expect(ev.changedAfter).toBe(iso(lastGood.at));
    expect(ev.observedAt).toBe(iso(s.f.statLog[i]!.at));
    expect(s.f.statLog[i]!.at - lastGood.at).toBeGreaterThan(5000);
    expect(Date.parse(ev.changedAfter)).toBeLessThan(wrote);
    s.reader.stop();
  });
});

describe('row 4-5 first read', () => {
  it('row 4 first read: changedAfter is null, the key present, after start and after setPath; setPath back to a file gives null again', async () => {
    const A = '/data/a.xml';
    const B = '/data/b.xml';
    const s = setup({ files: { [A]: file('slalom.xml', 1000), [B]: file('cross.xml', 1000) }, path: A });
    s.reader.start();
    await s.until(s.clock.now() + 6000);
    expect(s.units.length).toBe(1);
    expect(hasKey(event(s.units[0]!), 'changedAfter')).toBe(true);
    expect(event(s.units[0]!).changedAfter).toBeNull();

    s.f.files[A] = file('cross-untimed.xml', 2000); // a second read has a timestamp
    await s.until(s.clock.now() + 11000);
    expect(s.units.length).toBe(2);
    expect(typeof event(s.units[1]!).changedAfter).toBe('string');

    s.reader.setPath(B);
    await s.until(s.clock.now() + 11000);
    expect(s.units.length).toBe(3);
    expect(hasKey(event(s.units[2]!), 'changedAfter')).toBe(true);
    expect(event(s.units[2]!).changedAfter).toBeNull();

    s.reader.setPath(undefined);
    await s.until(s.clock.now() + 1000);
    s.reader.setPath(A); // the same file as before, with the signature it had
    await s.until(s.clock.now() + 11000);
    expect(s.units.length).toBe(4);
    expect(event(s.units[3]!).changedAfter).toBeNull();
    s.reader.stop();
  });

  it('row 5 first read with history: a file seen invalid under one signature, then valid under another, has a timestamp', async () => {
    const bad = truncated(whole('slalom.xml'));
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: bad.length, content: bad } } });
    const t0 = await s.startAndFirstStat();
    await s.until(t0 + 3 * 5000 + 1500); // the stat showed signature 1000 on several polls; nothing valid
    expect(s.units.length).toBe(0);
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 6 * 5000 + 1500);
    expect(s.units.length).toBe(1);
    const ev = event(s.units[0]!);
    expect(ev.changedAfter).not.toBeNull();
    const i = firstStatShowing(s, 2000);
    expect(ev.changedAfter).toBe(iso(lastOtherStat(s, i, 2000)!.at));
    expect(Date.parse(ev.changedAfter)).toBeLessThan(Date.parse(ev.observedAt));
    s.reader.stop();
  });

  it('row 5 first read whose file moves during the read: changedAfter is the first stat, observedAt the closing stat that showed the new signature', async () => {
    const s = setup();
    s.f.ctl.readMs = 3000;
    s.f.duringNextRead(() => { s.f.files[P] = file('cross.xml', 2000); s.f.ctl.readMs = 0; }); // moves while the first read is in flight
    const t = await s.startAndFirstStat();
    await s.until(t + 30000);
    expect(s.units.length).toBeGreaterThanOrEqual(1);
    const closing = s.f.statLog[firstStatShowing(s, 2000)]!;
    expect(closing.at).toBe(t + 3000);
    const ev = event(s.units[s.units.length - 1]!);
    expect(ev.observedAt).toBe(iso(t + 3000));
    expect(ev.changedAfter).toBe(iso(t));
    expect(phaseIds(s.units[s.units.length - 1]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('cross.xml'), ctx()) as El[]).sort());
    s.reader.stop();
  });
});

describe('row 6-10 the burst endings (CONTRACTS §2.8, DERIVATIONS §0.3 "Validation and the states")', () => {
  const torn = () => truncated(whole('slalom.xml'));

  it('row 6 torn, stat unchanged: a failed poll each time, reconnecting then unreachable from the fifth; one re-read per poll; tornReads counts every invalid read', async () => {
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: 10, content: torn() } } });
    const t0 = await s.startAndFirstStat();
    const reads = (a: number, b: number) => s.f.readLog.filter((r) => r.at >= a && r.at < b).length;
    const states: string[] = [];
    for (let k = 0; k < 6; k++) {
      await s.until(t0 + k * 5000 + 2500);
      states.push(s.last()!.state);
    }
    expect(states).toEqual(['reconnecting', 'reconnecting', 'reconnecting', 'reconnecting', 'unreachable', 'unreachable']);
    expect(reads(t0, t0 + 5000)).toBe(4); // the first burst
    for (let k = 1; k < 6; k++) expect(reads(t0 + k * 5000, t0 + (k + 1) * 5000), `poll ${k}`).toBe(1);
    expect(s.units.length).toBe(0);
    expect(s.last()?.abandonedReads).toBeGreaterThanOrEqual(1);
    expect(s.last()?.tornReads).toBe(s.f.readLog.length);
    // it validates (same stat, whole content): delivered, connected, stamped with the first detection
    s.f.files[P] = { mtimeMs: 1000, size: 10, content: whole('slalom.xml') };
    await s.until(t0 + 6 * 5000 + 2500);
    expect(s.units.length).toBe(1);
    expect(event(s.units[0]!).observedAt).toBe(iso(t0));
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });

  it('row 6 torn, stat unchanged: the poll after the burst reads again although the stat did not change, and a stat change ends the loop', async () => {
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: 10, content: torn() } } });
    const t0 = await s.startAndFirstStat();
    await s.until(t0 + 2 * 5000 + 2500);
    expect(s.last()?.state).toBe('reconnecting');
    s.f.files[P] = file('cross.xml', 2000);
    await s.until(t0 + 4 * 5000 + 2500);
    expect(s.units.length).toBe(1);
    expect(s.last()?.state).toBe('connected');
    expect(event(s.units[0]!).observedAt).toBe(iso(s.f.statLog[firstStatShowing(s, 2000)]!.at));
    s.reader.stop();
  });

  it('row 7 torn, stat changed: the new stat is the new detection, read at the next poll; the poll is not a failure', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = file('cross.xml', 2000);
    const t = truncated(whole('cross.xml'));
    s.f.queueReads(t, t, t, t);
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => { s.f.files[P] = file('cross-untimed.xml', 3000); }); // the writer moves on during the last read
    await s.until(t0 + 5000 + 2500); // the burst poll
    expect(s.units.length).toBe(0);
    expect(s.last()?.state).toBe('connected');
    expect(s.last()?.tornReads).toBeGreaterThanOrEqual(4);
    await s.until(t0 + 10000 + 2500); // the next poll reads
    expect(s.units.length).toBe(1);
    expect(s.last()?.state).toBe('connected');
    const i = firstStatShowing(s, 3000);
    const ev = event(s.units[0]!);
    expect(ev.observedAt).toBe(iso(s.f.statLog[i]!.at)); // the stat that showed the new signature, not the abandoned one
    expect(ev.changedAfter).toBe(iso(lastOtherStat(s, i, 3000)!.at));
    expect(phaseIds(s.units[0]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('cross-untimed.xml'), ctx()) as El[]).sort());
    s.reader.stop();
  });

  it('row 8 rejected: a burst ending on a rejected read is a failed poll (reconnecting), also when torn reads came first and the stat moved', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = file('cross.xml', 2000);
    const t = truncated(whole('cross.xml'));
    s.f.queueReads(t, t, t);
    s.f.rejectReads(1);
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => { s.f.files[P] = file('cross-untimed.xml', 3000); });
    await s.until(t0 + 5000 + 2500);
    expect(s.units.length).toBe(0);
    expect(s.last()?.state).toBe('reconnecting');
    await s.until(t0 + 10000 + 2500);
    expect(s.units.length).toBe(1);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });

  it('row 9 moved: every read valid, the stat still moving across the whole burst; connected, and the next poll reads again', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = file('cross.xml', 2000);
    for (let k = 0; k < 4; k++) s.f.duringNextRead(() => { s.f.files[P] = file('cross.xml', 3000 + k * 1000); });
    const before = s.statuses.length;
    await s.until(t0 + 5000 + 2500);
    expect(s.statuses.slice(before).every((x) => x.state === 'connected')).toBe(true);
    expect(s.last()?.state).toBe('connected');
    const readsAfterBurst = s.f.readLog.length;
    await s.until(t0 + 10000 + 2500);
    expect(s.f.readLog.length).toBeGreaterThan(readsAfterBurst);
    expect(s.units.length).toBeGreaterThanOrEqual(1);
    expect(s.statuses.slice(before).every((x) => x.state === 'connected')).toBe(true);
    s.reader.stop();
  });

  it('row 10 a post-burst stat that rejects is a failed poll when the last attempt was torn', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = file('cross.xml', 2000);
    const t = truncated(whole('cross.xml'));
    s.f.queueReads(t, t, t, t);
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => {});
    s.f.duringNextRead(() => { s.f.remove(P); }); // the file is gone when the burst ends
    await s.until(t0 + 5000 + 2500);
    expect(s.last()?.state).toBe('reconnecting');
    expect(s.units.length).toBe(0);
    s.f.put(P, file('cross.xml', 2000));
    await s.until(t0 + 10000 + 2500);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });

  it('row 10 a closing stat that rejects is a failed poll when the read itself was valid', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = file('cross.xml', 2000);
    s.f.duringNextRead(() => { s.f.remove(P); }); // valid content captured, then the file vanishes before the closing stat
    await s.until(t0 + 5000 + 2500);
    expect(s.last()?.state).toBe('reconnecting');
    s.f.put(P, file('cross.xml', 2000));
    await s.until(t0 + 10000 + 2500);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });
});

describe('row 11-12 states', () => {
  it('row 11 §5 reconnecting from begin(): a path set reports reconnecting before the first poll; no path reports not-configured; setPath restarts it', async () => {
    const s = setup();
    s.reader.start();
    expect(s.last()?.state).toBe('reconnecting'); // synchronously, before any poll
    expect(s.f.readLog.length).toBe(0);
    await s.until(s.clock.now() + 6000);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();

    const n = setup({ path: undefined });
    n.reader.start();
    expect(n.last()?.state).toBe('not-configured');
    n.reader.setPath(P);
    expect(n.last()?.state).toBe('reconnecting');
    n.reader.setPath(undefined);
    expect(n.last()?.state).toBe('not-configured');
    n.reader.stop();
  });

  it('row 12 §0.3 valid, naming no race: the unit is the event alone, connected, lastRewriteDetectedAt advances', async () => {
    const s = setup();
    const t0 = await baseline(s);
    s.f.files[P] = { mtimeMs: 2000, size: EMPTY_DOC.length, content: EMPTY_DOC };
    await s.until(t0 + 2 * 5000 + 1500);
    expect(s.units.length).toBe(1);
    expect(s.units[0]!.length).toBe(1);
    expect(s.units[0]![0]!.event).toBe('xml-rewrite-detected');
    expect(s.last()?.state).toBe('connected');
    const det = iso(s.f.statLog[firstStatShowing(s, 2000)]!.at);
    expect(s.last()?.lastRewriteDetectedAt).toBe(det);
    expect(Date.parse(det)).toBeGreaterThan(t0);
    s.reader.stop();
  });

  it('row 12 §0.3 valid, naming no race: also as the first read', async () => {
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: EMPTY_DOC.length, content: EMPTY_DOC } } });
    s.reader.start();
    await s.until(s.clock.now() + 6000);
    expect(s.units.length).toBe(1);
    expect(s.units[0]!.length).toBe(1);
    expect(s.units[0]![0]!.changedAfter).toBeNull();
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });
});

describe('row 13 #251 re-entrancy: calls made from inside onUnit', () => {
  it('#251 probe setPath(undefined) inside onUnit ends not-configured and polls no more', async () => {
    const h: { r?: S } = {};
    let once = true;
    const s = setup({ deliver: () => { if (once) { once = false; h.r!.reader.setPath(undefined); } } });
    h.r = s;
    s.reader.start();
    await s.until(s.clock.now() + 6000);
    expect(s.last()?.state).toBe('not-configured');
    const stats = s.f.statLog.length;
    await s.until(s.clock.now() + 30000);
    expect(s.last()?.state).toBe('not-configured');
    expect(s.f.statLog.length).toBe(stats);
    s.reader.stop();
  });

  it('#251 probe setPath(Q) inside onUnit, Q with the same mtime and size but other content, reads Q: 2 units', async () => {
    const Q = '/data/q.xml';
    const size = whole('slalom.xml').length;
    const files = { [P]: { mtimeMs: 1000, size, content: whole('slalom.xml') }, [Q]: { mtimeMs: 1000, size, content: whole('cross.xml') } };
    const h: { r?: S } = {};
    let once = true;
    const s = setup({ files, deliver: () => { if (once) { once = false; h.r!.reader.setPath(Q); } } });
    h.r = s;
    s.reader.start();
    await s.until(s.clock.now() + 20000);
    expect(s.units.length).toBe(2);
    expect(s.f.readLog.some((r) => r.path === Q)).toBe(true);
    expect(phaseIds(s.units[1]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('cross.xml'), ctx()) as El[]).sort());
    s.reader.stop();
  });

  it('#251 probe stop() then start() inside onUnit gives 2 units', async () => {
    const h: { r?: S } = {};
    let once = true;
    const s = setup({ deliver: () => { if (once) { once = false; h.r!.reader.stop(); h.r!.reader.start(); } } });
    h.r = s;
    s.reader.start();
    await s.until(s.clock.now() + 20000);
    expect(s.units.length).toBe(2);
    s.reader.stop();
  });
});
