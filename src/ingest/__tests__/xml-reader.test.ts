/**
 * #202 XML reader. Interfaces assumed: see xml-reader-harness.ts. Rules: DERIVATIONS §0.3, §5; CONTRACTS §1.6, INV-2c, INV-7;
 * CONFORMANCE-VECTORS §1 (content age, ingest units).
 */
import { describe, it, expect } from 'vitest';
import { createXmlReader, XML_UNREACHABLE_AFTER_FAILED_POLLS } from '../xml-reader.js';
import { parseXmlSnapshot } from '../index.js';
import { ctx } from './helpers.js';
import { fakeClock, fakeFs, file, whole, truncated, malformed, phaseIds, iso, T0, type FakeFile } from './xml-reader-harness.js';

const P = '/data/event.xml';

function setup(opts: { files?: Record<string, FakeFile>; path?: string | undefined; pollIntervalSeconds?: number;
  /** Runs inside onUnit / onStatus before the test's own recording; may throw. */
  deliver?: (els: Array<Record<string, any>>) => void; statusHook?: (s: Record<string, any>) => void } = {}) {
  const clock = fakeClock();
  const f = fakeFs(clock, opts.files ?? { [P]: file('slalom.xml', 1000) });
  const units: Array<Array<Record<string, any>>> = [];
  const statuses: Array<Record<string, any>> = [];
  const reader = createXmlReader({
    path: 'path' in opts ? opts.path : P,
    pollIntervalSeconds: opts.pollIntervalSeconds ?? 5,
    clock, fs: f.fs, ctx: ctx(),
    onUnit: (els: Array<Record<string, any>>) => { opts.deliver?.(els); units.push(els); },
    onStatus: (s: Record<string, any>) => { statuses.push(s); opts.statusHook?.(s); },
  });
  const last = () => statuses[statuses.length - 1];
  /** Advance in small steps until `n` stats have happened. */
  const toPoll = async (n: number) => {
    for (let i = 0; i < 2000 && f.statLog.length < n; i++) await clock.advance(100);
    await clock.advance(0);
  };
  return { clock, f, units, statuses, reader, last, toPoll };
}

/** Advance 1 ms at a time until a poll's stat has just happened; returns with the clock at most 1 ms after it. */
async function justAfterPoll(s: ReturnType<typeof setup>) {
  const n = s.f.statLog.length;
  for (let i = 0; i < 20000 && s.f.statLog.length === n; i++) await s.clock.advance(1);
  await s.clock.advance(1);
}

/** Start and let the first poll's read happen (whether the first poll is immediate or one interval in). */
async function started(s: ReturnType<typeof setup>) {
  s.reader.start();
  await s.clock.advance(5500);
}

describe('XML reader: polling (DERIVATIONS §0.3)', () => {
  it('§0.3 polls at the interval: stat once per interval on the fake clock; a different setting changes it', async () => {
    const a = setup({ pollIntervalSeconds: 5 });
    await started(a);
    const n0 = a.f.statLog.length;
    await a.clock.advance(15000);
    expect(a.f.statLog.length - n0).toBe(3);
    await a.clock.advance(5000); // any whole-interval window holds exactly one poll per interval, whatever the phase
    expect(a.f.statLog.length - n0).toBe(4);
    a.reader.stop();

    const b = setup({ pollIntervalSeconds: 2 });
    await started(b);
    const m0 = b.f.statLog.length;
    await b.clock.advance(10000);
    expect(b.f.statLog.length - m0).toBe(5);
    b.reader.stop();
  });

  it('§0.3 reads when mtime or size changes: no change, no read, no unit; a change in either triggers one', async () => {
    const s = setup();
    await started(s);
    expect(s.f.readLog.length).toBe(1);
    expect(s.units.length).toBe(1);
    await s.clock.advance(30000);
    expect(s.f.readLog.length).toBe(1);
    expect(s.units.length).toBe(1);

    s.f.files[P] = { ...s.f.files[P]!, mtimeMs: 2000 }; // mtime only
    await s.clock.advance(5000);
    expect(s.f.readLog.length).toBe(2);
    expect(s.units.length).toBe(2);

    s.f.files[P] = { mtimeMs: 2000, size: whole('cross.xml').length, content: whole('cross.xml') }; // size only
    await s.clock.advance(5000);
    expect(s.f.readLog.length).toBe(3);
    expect(s.units.length).toBe(3);
    await s.clock.advance(20000);
    expect(s.units.length).toBe(3);
    s.reader.stop();
  });
});

describe('XML reader: validation and retry (DERIVATIONS §0.3)', () => {
  it('§0.3 refuses a truncated file: no unit from a read lacking the root closing tag', async () => {
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: 10, content: truncated(whole('slalom.xml')) } } });
    await started(s);
    await s.clock.advance(3000);
    expect(s.units.length).toBe(0);
    s.reader.stop();
  });

  it('§0.3 refuses malformed XML: no unit from a read that is not well-formed', async () => {
    const bad = malformed(whole('slalom.xml'));
    expect(bad).toContain('</Canoe123Data>');
    const s = setup({ files: { [P]: { mtimeMs: 1000, size: bad.length, content: bad } } });
    await started(s);
    await s.clock.advance(3000);
    expect(s.units.length).toBe(0);
    s.reader.stop();
  });

  it('§0.3 retries a torn read: torn then whole gives one unit, after the retry, nothing from the torn read', async () => {
    const s = setup();
    s.f.queueReads(truncated(whole('slalom.xml')));
    s.reader.start();
    for (let i = 0; i < 2000 && s.f.readLog.length < 1; i++) await s.clock.advance(100);
    await s.clock.advance(0);
    const firstRead = s.f.readLog[0]!.at;
    expect(s.units.length).toBe(0);
    await s.clock.advance(199);
    expect(s.units.length).toBe(0);
    expect(s.f.readLog.length).toBe(1);
    await s.clock.advance(1);
    expect(s.f.readLog.length).toBe(2);
    expect(s.f.readLog[1]!.at).toBe(firstRead + 200);
    expect(s.units.length).toBe(1);
    expect(phaseIds(s.units[0]!).length).toBeGreaterThan(0);
    s.reader.stop();
  });

  it('§0.3 abandons after the bound, next poll retries: four torn reads, no unit, one reported failure, next poll reads though stat did not change', async () => {
    const s = setup();
    const t = truncated(whole('slalom.xml'));
    s.f.queueReads(t, t, t, t);
    s.reader.start();
    for (let i = 0; i < 2000 && s.f.readLog.length < 1; i++) await s.clock.advance(100);
    const first = s.f.readLog[0]!.at;
    await s.clock.advance(1000); // past the 3 retries (200, 400, 600 ms)
    expect(s.f.readLog.map((r) => r.at)).toEqual([first, first + 200, first + 400, first + 600]);
    expect(s.units.length).toBe(0);
    expect(s.last()?.abandonedReads).toBe(1);
    expect(s.last()?.tornReads).toBe(4);
    await s.clock.advance(100); // no fifth read inside the same poll
    expect(s.f.readLog.length).toBe(4);
    // stat unchanged since the abandoned detection; the next poll still reads (file differs from last good read)
    await s.clock.advance(6000);
    expect(s.f.readLog.length).toBe(5);
    expect(s.units.length).toBe(1);
    expect(s.last()?.abandonedReads).toBe(1);
    s.reader.stop();
  });

  it('§5 lastRewriteDetectedAt is the first detection: across a retry and an abandoned read, the event time is when the change was first seen; INV-2c content age holds (CONFORMANCE-VECTORS §1)', async () => {
    const s = setup();
    await started(s);
    s.units.length = 0;

    // (a) change detected, one torn read, retry succeeds 200 ms later
    await justAfterPoll(s); // the write lands right after a poll, so detection is a full interval later
    const wroteA = s.clock.now();
    s.f.files[P] = file('cross.xml', 2000);
    s.f.queueReads(truncated(whole('cross.xml')));
    const nStat = s.f.statLog.length;
    await s.toPoll(nStat + 1);
    await s.clock.advance(1000);
    const detA = s.f.statLog.find((x) => x.mtimeMs === 2000)!.at;
    expect(s.units.length).toBe(1);
    const evA = s.units[0]!.find((e) => e.event === 'xml-rewrite-detected')!;
    expect(evA.observedAt).toBe(iso(detA)); // not the time the retry succeeded (detA + 200)
    expect(s.last()?.lastRewriteDetectedAt).toBe(iso(detA));
    expect(detA).toBeGreaterThanOrEqual(wroteA);
    // INV-2c: content age (event time minus the interval) is never later than the write. Stamped with the retry's
    // success time (detA + 200) it would be later, so this can fail.
    expect(Date.parse(evA.observedAt) - 5000).toBeLessThanOrEqual(wroteA);

    // (b) change detected, four torn reads (abandoned), the next poll succeeds
    await s.clock.advance(2000);
    const wroteB = s.clock.now();
    s.f.files[P] = file('cross-untimed.xml', 3000);
    const tb = truncated(whole('cross-untimed.xml'));
    s.f.queueReads(tb, tb, tb, tb);
    const nStatB = s.f.statLog.length;
    await s.toPoll(nStatB + 1);
    await s.clock.advance(12000);
    const detB = s.f.statLog.find((x) => x.mtimeMs === 3000)!.at;
    expect(s.units.length).toBe(2);
    const evB = s.units[1]!.find((e) => e.event === 'xml-rewrite-detected')!;
    expect(evB.observedAt).toBe(iso(detB)); // the first detection, not the poll that finally read it
    expect(s.last()?.lastRewriteDetectedAt).toBe(iso(detB));
    // INV-2c: content age = detection time minus the poll interval is not later than the write
    expect(Date.parse(evB.observedAt) - 5000).toBeLessThanOrEqual(wroteB);
    s.reader.stop();
  });
});

describe('XML reader: the ingest unit (CONTRACTS §1.6, INV-7)', () => {
  it('§1.6 event then snapshots, one unit: elements in order, sharing source and observedAt, one onUnit call', async () => {
    const s = setup();
    await started(s);
    expect(s.units.length).toBe(1);
    const els = s.units[0]!;
    const det = iso(s.f.statLog[0]!.at);
    expect(els[0]!.event).toBe('xml-rewrite-detected');
    expect(els[0]!.observedAt).toBe(det);
    expect(els.length).toBeGreaterThan(1);
    for (const e of els.slice(1)) {
      expect((e.snapshot ? e.snapshot.source : e.source)).toBe('xml'); // snapshots carry source inside, observations beside
      expect(e.observedAt).toBe(det);
    }
    const expected = parseXmlSnapshot(whole('slalom.xml'), ctx({ observedAt: det })) as Array<Record<string, any>>;
    const strip = (xs: Array<Record<string, any>>) => xs.map(({ ingestSeq: _i, ...r }) => r);
    expect(strip(els.slice(1))).toEqual(strip(expected));
    s.reader.stop();
  });

  it('INV-7 every race in the file: a snapshot per race in the XML, by parseXmlSnapshot, none dropped', async () => {
    for (const name of ['slalom.xml', 'cross.xml']) {
      const s = setup({ files: { [P]: file(name, 1000) } });
      await started(s);
      const want = phaseIds(parseXmlSnapshot(whole(name), ctx()) as Array<Record<string, any>>);
      expect(want.length).toBeGreaterThan(1);
      expect(phaseIds(s.units[0]!).sort()).toEqual([...want].sort());
      s.reader.stop();
    }
  });
});

describe('XML reader: source status (DERIVATIONS §5)', () => {
  it('§5 not-configured: no path gives not-configured and no reads', async () => {
    const s = setup({ path: undefined });
    await started(s);
    await s.clock.advance(30000);
    expect(s.last()?.state).toBe('not-configured');
    expect(s.f.readLog.length).toBe(0);
    expect(s.units.length).toBe(0);
    s.reader.stop();
  });

  it('§5 reconnecting then unreachable: a missing file is reconnecting, unreachable after the 5th failed poll', async () => {
    const s = setup({ files: {} });
    s.reader.start();
    for (let n = 1; n <= 4; n++) {
      await s.toPoll(n);
      expect(s.last()?.state).toBe('reconnecting');
    }
    await s.toPoll(5);
    expect(s.last()?.state).toBe('unreachable');
    expect(s.units.length).toBe(0);
    s.reader.stop();
  });

  it('§5 back to connected: a file that appears after unreachable is read and the state is connected', async () => {
    const s = setup({ files: {} });
    s.reader.start();
    await s.toPoll(5);
    expect(s.last()?.state).toBe('unreachable');
    s.f.put(P, file('slalom.xml', 5000));
    await s.clock.advance(6000);
    expect(s.last()?.state).toBe('connected');
    expect(s.units.length).toBe(1);
    s.reader.stop();
  });

  it('§5 back to connected: recovery from reconnecting (below the count) also returns to connected', async () => {
    const s = setup({ files: {} });
    s.reader.start();
    await s.toPoll(2);
    expect(s.last()?.state).toBe('reconnecting');
    s.f.put(P, file('slalom.xml', 5000));
    await s.clock.advance(6000);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });
});

describe('XML reader: path at run time (DERIVATIONS §5)', () => {
  it('§5 path set at run time: set, change and clear; no unit from the old file afterwards', async () => {
    const A = '/data/a.xml';
    const B = '/data/b.xml';
    const s = setup({ path: undefined, files: { [A]: file('slalom.xml', 1000), [B]: file('cross.xml', 1000) } });
    await started(s);
    expect(s.units.length).toBe(0);
    expect(s.last()?.state).toBe('not-configured');

    s.reader.setPath(A);
    await s.clock.advance(6000);
    expect(s.units.length).toBe(1);
    expect(phaseIds(s.units[0]!)).toEqual(phaseIds(parseXmlSnapshot(whole('slalom.xml'), ctx()) as Array<Record<string, any>>));

    s.reader.setPath(B);
    await s.clock.advance(6000);
    expect(s.units.length).toBe(2);
    expect(phaseIds(s.units[1]!)).toEqual(phaseIds(parseXmlSnapshot(whole('cross.xml'), ctx()) as Array<Record<string, any>>));

    // the old file changes: no unit, and it is not even polled any more
    const statsOfA = s.f.statLog.filter((x) => x.path === A).length;
    s.f.files[A] = file('cross-untimed.xml', 9999);
    await s.clock.advance(20000);
    expect(s.units.length).toBe(2);
    expect(s.f.statLog.filter((x) => x.path === A).length).toBe(statsOfA);

    s.reader.setPath(undefined);
    await s.clock.advance(1000);
    expect(s.last()?.state).toBe('not-configured');
    const reads = s.f.readLog.length;
    s.f.files[B] = file('cross-untimed.xml', 8888);
    await s.clock.advance(20000);
    expect(s.units.length).toBe(2);
    expect(s.f.readLog.length).toBe(reads);
    s.reader.stop();
  });
});

describe('XML reader: stop (DERIVATIONS §0.3)', () => {
  it('stop leaves no timer: no callback after stop(), including a pending retry', async () => {
    const s = setup();
    s.f.queueReads(truncated(whole('slalom.xml')));
    s.reader.start();
    for (let i = 0; i < 2000 && s.f.readLog.length < 1; i++) await s.clock.advance(100);
    await s.clock.advance(0);
    expect(s.clock.pending()).toBeGreaterThan(0); // the retry is pending
    s.reader.stop();
    await s.clock.advance(0);
    expect(s.clock.pending()).toBe(0);
    const reads = s.f.readLog.length;
    const stats = s.f.statLog.length;
    const nUnits = s.units.length;
    const nStatus = s.statuses.length;
    await s.clock.advance(60000);
    expect(s.f.readLog.length).toBe(reads);
    expect(s.f.statLog.length).toBe(stats);
    expect(s.units.length).toBe(nUnits);
    expect(s.statuses.length).toBe(nStatus);
    expect(T0).toBeLessThan(s.clock.now());
  });
});

describe('XML reader: review objections (PR #250)', () => {
  it('O1 §0.3 baseline stat is taken after the successful read: a file that moved across the read gives no surplus unit of the same content (INV-2c, INV-7 guard)', async () => {
    const s = setup();
    await started(s);
    s.units.length = 0;
    const base = s.f.readLog.length;
    // the poll sees stat 2000; during the read the writer finishes: stat 3000 and the final content
    s.f.files[P] = file('cross.xml', 2000);
    s.f.duringNextRead(() => { s.f.files[P] = file('cross-untimed.xml', 3000); });
    await s.clock.advance(5100);
    await s.clock.advance(60000); // many polls with the stat now at rest
    expect(s.units.length).toBe(1);
    expect(phaseIds(s.units[0]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('cross-untimed.xml'), ctx()) as Array<Record<string, any>>).sort());
    const det = s.f.statLog.find((x) => x.mtimeMs === 2000)!.at;
    expect(s.units[0]![0]!.observedAt).toBe(iso(det));
    expect(s.f.readLog.length - base).toBeLessThanOrEqual(2);
    s.reader.stop();
  });

  it('O2 §0.3 polls are anchored to polledAt + interval: a 1.5 s read does not stretch the gap between stats (INV-2c interval bound)', async () => {
    const s = setup();
    s.f.ctl.readMs = 1500;
    s.reader.start();
    await s.clock.advance(7000);
    s.f.files[P] = file('cross.xml', 2000); // changes after the first read (baseline exists), so a later poll reads again
    await s.clock.advance(40000);
    expect(s.f.readLog.length).toBeGreaterThanOrEqual(2);
    // polls only: extra stats between polls (a read's post-read check) are allowed, a poll missing from the grid is not
    const first = s.f.statLog[0]!.at;
    const at = new Set(s.f.statLog.map((x) => x.at));
    for (let k = 0; first + k * 5000 <= first + 35000; k++) expect(at.has(first + k * 5000), `poll at first + ${k} * 5000`).toBe(true);
    s.reader.stop();
  });

  it('O2 §0.3 the first read gets the moved-during-read check too: a file that moves during the first read gives one unit, the final content (INV-2c, INV-7 guard)', async () => {
    const s = setup();
    s.f.duringNextRead(() => { s.f.files[P] = file('cross-untimed.xml', 3000); });
    s.reader.start();
    await s.clock.advance(5100);
    await s.clock.advance(60000);
    expect(s.units.length).toBe(1);
    expect(phaseIds(s.units[0]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('cross-untimed.xml'), ctx()) as Array<Record<string, any>>).sort());
    expect(s.units[0]![0]!.observedAt).toBe(iso(s.f.statLog[0]!.at));
    expect(s.f.readLog.length).toBeLessThanOrEqual(2);
    s.reader.stop();
  });

  it('O3 §5 a different stat seen by a later poll restarts detection: an abandoned bad write does not stamp a later, different version', async () => {
    const s = setup();
    await started(s);
    s.units.length = 0;
    const bad = truncated(whole('cross.xml'));
    s.f.files[P] = { mtimeMs: 2000, size: bad.length, content: bad }; // a bad write that stays bad
    await s.clock.advance(60000);
    expect(s.units.length).toBe(0);
    const wrote = s.clock.now();
    s.f.files[P] = file('cross-untimed.xml', 3000); // a whole new version, much later
    await s.clock.advance(10000);
    expect(s.units.length).toBe(1);
    const det = s.f.statLog.find((x) => x.mtimeMs === 3000)!.at;
    const ev = s.units[0]![0]!;
    expect(ev.event).toBe('xml-rewrite-detected');
    expect(ev.observedAt).toBe(iso(det));
    expect(s.last()?.lastRewriteDetectedAt).toBe(iso(det));
    expect(Date.parse(ev.observedAt) - 5000).toBeLessThanOrEqual(wrote);
    for (const e of s.units[0]!) expect(e.observedAt).toBe(iso(det));
    s.reader.stop();
  });

  it('O4 §0.3 a rejected read takes the same bounded retry as a torn one: one transient EBUSY, retried 200 ms later, no reconnecting', async () => {
    const s = setup();
    s.f.rejectReads(1);
    s.reader.start();
    for (let i = 0; i < 2000 && s.f.readLog.length < 1; i++) await s.clock.advance(100);
    const first = s.f.readLog[0]!.at;
    await s.clock.advance(1000);
    expect(s.f.readLog.map((r) => r.at)).toEqual([first, first + 200]);
    expect(s.units.length).toBe(1);
    expect(s.statuses.every((x) => x.state !== 'reconnecting' && x.state !== 'unreachable')).toBe(true);
    s.reader.stop();
  });

  it('O4 §5 an abandoned rejected read is a failed poll that a successful stat does not clear: reconnecting, then unreachable at the 5th', async () => {
    const s = setup();
    s.f.ctl.alwaysReject = Object.assign(new Error('EBUSY read'), { code: 'EBUSY' });
    s.reader.start();
    const toRead = async (n: number) => {
      for (let i = 0; i < 4000 && s.f.readLog.length < n; i++) await s.clock.advance(100);
      await s.clock.advance(0);
    };
    for (let poll = 1; poll <= 4; poll++) {
      await toRead(4 * poll); // bounded: 1 read + 3 retries per poll
      expect(s.f.readLog.length).toBe(4 * poll);
      expect(s.last()?.state).toBe('reconnecting');
      expect(s.units.length).toBe(0);
    }
    await toRead(20);
    expect(s.f.readLog.length).toBe(20);
    expect(s.last()?.state).toBe('unreachable');
    await s.clock.advance(5000 * 4);
    expect(s.last()?.state).toBe('unreachable');
    // recovery
    s.f.ctl.alwaysReject = undefined;
    await s.clock.advance(6000);
    expect(s.last()?.state).toBe('connected');
    expect(s.units.length).toBe(1);
    s.reader.stop();
  });
});

/** Listen for unhandled rejections on the process for the duration of fn; the listener is removed afterwards. */
async function withRejectionWatch(fn: () => Promise<void>): Promise<unknown[]> {
  const seen: unknown[] = [];
  const h = (reason: unknown) => { seen.push(reason); };
  process.on('unhandledRejection', h);
  try {
    await fn();
    await new Promise<void>((r) => { setImmediate(r); }); // real macrotask: let the process raise pending rejections
    await new Promise<void>((r) => { setImmediate(r); });
  } finally {
    process.off('unhandledRejection', h);
  }
  return seen;
}

describe('XML reader: a throw inside a poll (review N1, DERIVATIONS §5: a source failure is a state, not an exit)', () => {
  it('N1 §5 onUnit throws once: no unhandled rejection, the poll is failed (reconnecting), timers keep firing, the next poll redelivers the same content with the first detection stamp (INV-2c)', async () => {
    let calls = 0;
    const s = setup({ deliver: () => { calls++; if (calls === 1) throw new Error('boom'); } });
    const seen = await withRejectionWatch(async () => {
      s.reader.start();
      await s.toPoll(1);
      await s.clock.advance(1000);
      expect(calls).toBe(1);
      expect(s.units.length).toBe(0); // the throwing delivery was not a delivery
      expect(s.last()?.state).toBe('reconnecting');
      const stats = s.f.statLog.length;
      await s.clock.advance(5100);
      expect(s.f.statLog.length).toBeGreaterThan(stats); // the next poll ran
      await s.clock.advance(5000);
    });
    expect(seen).toEqual([]);
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(s.units.length).toBe(1);
    const det = iso(s.f.statLog[0]!.at);
    expect(phaseIds(s.units[0]!).sort()).toEqual(phaseIds(parseXmlSnapshot(whole('slalom.xml'), ctx()) as Array<Record<string, any>>).sort());
    expect(s.units[0]![0]!.event).toBe('xml-rewrite-detected');
    expect(s.units[0]![0]!.observedAt).toBe(det); // first detection, not the retry time
    expect(s.last()?.lastRewriteDetectedAt).toBe(det);
    expect(s.last()?.state).toBe('connected');
    s.reader.stop();
  });

  it('N1 §5 onUnit always throws: unreachable after XML_UNREACHABLE_AFTER_FAILED_POLLS polls, reconnecting before, no crash', async () => {
    const s = setup({ deliver: () => { throw new Error('boom'); } });
    const N = XML_UNREACHABLE_AFTER_FAILED_POLLS;
    const seen = await withRejectionWatch(async () => {
      s.reader.start();
      await s.toPoll(1);
      const first = s.f.statLog[0]!.at;
      await s.clock.advance(first + (N - 2) * 5000 + 1000 - s.clock.now()); // N - 1 polls done
      expect(s.last()?.state).toBe('reconnecting');
      await s.clock.advance(5000); // the N-th poll
      expect(s.last()?.state).toBe('unreachable');
      await s.clock.advance(20000);
      expect(s.last()?.state).toBe('unreachable');
    });
    expect(seen).toEqual([]);
    expect(s.units.length).toBe(0);
    s.reader.stop();
  });

  it('N1 §5 onStatus throws: no unhandled rejection, polling continues', async () => {
    let armed = false;
    const s = setup({ files: {}, statusHook: () => { if (armed) throw new Error('boom'); } });
    const seen = await withRejectionWatch(async () => {
      s.reader.start();
      armed = true;
      await s.toPoll(1);
      const n = s.f.statLog.length;
      await s.clock.advance(15500);
      expect(s.f.statLog.length - n).toBeGreaterThanOrEqual(3);
    });
    expect(seen).toEqual([]);
    s.reader.stop();
  });
});
