/**
 * #211: the durable gate checks and flags store (CONTRACTS §2.10, ADR-016, TEST-ARCHITECTURE §3.5), over an injected fake
 * filesystem. Interfaces: see checks-harness.ts. Rows 2 to 9 and 11 of the issue's test plan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChecksStore } from '../checks.js';
import { A1, A2, DIR, T0, counterIds, fakeChecksFs, fakeClock, flush, iso, presentedOf } from './checks-harness.js';
import type { FakeChecksFs } from './checks-harness.js';

const open = (f: FakeChecksFs, eventId = 'event-1', clock = fakeClock(), extra: Record<string, unknown> = {}) =>
  openChecksStore({ fs: f.fs, dir: DIR, eventId, clock, newId: counterIds(), ...extra } as Parameters<typeof openChecksStore>[0]);
const key = (attemptId: string, run: number, gate: number) => `${attemptId}:${run}:${gate}`;

describe('restart round-trip (TEST-ARCHITECTURE §3.5 "restart round-trip"; row 2)', () => {
  it('§3.5 restart round-trip: checks and flags written, a new store instance over the same directory reads back equal', async () => {
    const f = fakeChecksFs();
    const clock = fakeClock();
    const s1 = await open(f, 'event-1', clock);
    await s1.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2, checkedBy: 'judge-a' });
    clock.advance(1000);
    await s1.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: null });
    clock.advance(1000);
    const flag = await s1.createFlag({ attemptId: A2, run: 1, gate: 3, comment: 'looks like a touch', suggestedValue: 2, createdBy: 'judge-b' });
    clock.advance(1000);
    await s1.resolveFlag(flag.flagId, { note: 'checked on video', resolvedBy: 'judge-c' });
    await s1.createFlag({ attemptId: A2, run: 1, gate: 4, comment: 'open one' });
    const before = s1.list();

    const s2 = await open(f, 'event-1', fakeClock(T0 + 999_999));
    expect(s2.list()).toEqual(before);
    expect(before.checks.length).toBe(2);
    expect(before.flags.length).toBe(2);
  });

  it('§3.5 restart round-trip: valueAtCheck null survives as null (not 0, not absent) and checkedAt is the clock\'s ISO time', async () => {
    const f = fakeChecksFs();
    const s1 = await open(f);
    await s1.putCheck({ attemptId: A1, run: 1, gate: 4, valueAtCheck: null });
    const s2 = await open(f);
    const c = s2.list().checks[0]!;
    expect(c.valueAtCheck).toBeNull();
    expect(c.checkedAt).toBe(iso(T0));
    expect('status' in c).toBe(false); // never stored (CONTRACTS §2.10)
  });

  it('§3.5 restart round-trip: a deleted check stays deleted after a restart', async () => {
    const f = fakeChecksFs();
    const s1 = await open(f);
    await s1.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    await s1.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 0 });
    await s1.deleteCheck({ attemptId: A1, run: 1, gate: 7 });
    const s2 = await open(f);
    expect(s2.list().checks.map((c) => c.gate)).toEqual([8]);
  });

  it('CONTRACTS §2.10 repeating a check replaces the snapshot (re-verify after a correction), one check per (attemptId, run, gate)', async () => {
    const f = fakeChecksFs();
    const clock = fakeClock();
    const s = await open(f, 'event-1', clock);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    clock.advance(60_000);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 50 });
    const checks = (await open(f)).list().checks;
    expect(checks.length).toBe(1);
    expect(checks[0]).toMatchObject({ valueAtCheck: 50, checkedAt: iso(T0 + 60_000) });
  });
});

describe('crash mid-write (TEST-ARCHITECTURE §3.5 "crash mid-write"; ADR-016; row 3)', () => {
  it('§3.5 crash mid-write: a failure between the temporary file and the rename leaves the previous complete state on disk', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const durable = f.snapshot();
    expect(Object.keys(durable).length).toBe(1); // the target alone: no temporary file left after a good write

    f.failNextRename();
    await expect(s.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 0 })).rejects.toThrow();

    const after = f.snapshot();
    const [targetPath] = Object.keys(durable);
    expect(after[targetPath!]).toBe(durable[targetPath!]); // target byte-for-byte as before
    expect(Object.keys(after).length).toBeGreaterThan(1); // the temporary file was really written: the failure is in the window
    const restarted = await open(f);
    expect(restarted.list().checks.map((c) => c.gate)).toEqual([7]);
  });

  it('§3.5 crash mid-write: a failure writing the temporary file also leaves the previous complete state', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const durable = f.snapshot();
    f.failNextWrite();
    await expect(s.deleteCheck({ attemptId: A1, run: 1, gate: 7 })).rejects.toThrow();
    const [targetPath] = Object.keys(durable);
    expect(f.snapshot()[targetPath!]).toBe(durable[targetPath!]);
    expect((await open(f)).list().checks.length).toBe(1);
  });

  it('§3.5 crash mid-write: a stale temporary file at start is ignored (not read as state, not an error), and later writes still succeed', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    f.failNextRename();
    await expect(s.putCheck({ attemptId: A1, run: 1, gate: 9, valueAtCheck: 4 })).rejects.toThrow();
    const stale = Object.keys(f.snapshot()).length;
    expect(stale).toBe(2); // target + leftover temporary file, "the process died here"

    const restarted = await open(f); // must not throw on the leftover, must not read it
    expect(restarted.list().checks.map((c) => c.gate)).toEqual([7]);
    await restarted.putCheck({ attemptId: A1, run: 1, gate: 10, valueAtCheck: 0 });
    expect((await open(f)).list().checks.map((c) => c.gate).sort((a, b) => a - b)).toEqual([7, 10]);
  });

  it('§3.5 crash mid-write: a first write that fails leaves no state at all, and the next start is an empty store', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    f.failNextRename();
    await expect(s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 })).rejects.toThrow();
    expect((await open(f)).list()).toEqual({ checks: [], flags: [] });
  });
});

describe('acknowledge after durable write (ADR-016, CONTRACTS §2.10 "acknowledged only after it is durable"; row 4)', () => {
  it('ADR-016 acknowledge after durable write: the promise does not resolve while the rename is pending, and resolves after it with the new state on disk', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    const hold = f.holdRename();
    let resolved = false;
    const p = s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 }).then((c) => { resolved = true; return c; });
    await hold.reached;
    await flush();
    expect(resolved).toBe(false);
    expect(f.snapshot()).not.toEqual({}); // the temporary file is there, the target is not
    hold.release();
    const c = await p;
    expect(resolved).toBe(true);
    expect(c).toMatchObject({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    expect((await open(f)).list().checks.length).toBe(1); // already durable when the promise resolved
  });

  it('ADR-016 acknowledge after durable write: a flag creation and a resolution are acknowledged only after the rename too', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    const h1 = f.holdRename();
    let created = false;
    const pc = s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'c' }).then((x) => { created = true; return x; });
    await h1.reached; await flush();
    expect(created).toBe(false);
    h1.release();
    const flag = await pc;
    const h2 = f.holdRename();
    let resolvedFlag = false;
    const pr = s.resolveFlag(flag.flagId, {}).then((x) => { resolvedFlag = true; return x; });
    await h2.reached; await flush();
    expect(resolvedFlag).toBe(false);
    h2.release();
    await pr;
    expect((await open(f)).list().flags[0]!.resolution).toBeDefined();
  });

  it('ADR-016 failed write rejects and memory stays at the previous state (rename fails)', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const before = s.list();
    f.failNextRename();
    await expect(s.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 0 })).rejects.toThrow();
    expect(s.list()).toEqual(before);
    expect(s.status(presentedOf(A1, 1, [[7, 2], [8, 0]]))).toEqual({ [key(A1, 1, 7)]: 'verified', [key(A1, 1, 8)]: 'plain' });
  });

  it('ADR-016 failed write rejects and memory stays at the previous state (temporary write fails; a flag; a delete)', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const before = s.list();
    f.failNextWrite();
    await expect(s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x' })).rejects.toThrow();
    expect(s.list()).toEqual(before);
    f.failNextRename();
    await expect(s.deleteCheck({ attemptId: A1, run: 1, gate: 7 })).rejects.toThrow();
    expect(s.list()).toEqual(before);
  });

  it('ADR-016 a failed resolution leaves the flag open in memory and on disk', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    const flag = await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x' });
    f.failNextRename();
    await expect(s.resolveFlag(flag.flagId, { note: 'n' })).rejects.toThrow();
    expect(s.list().flags[0]!.resolution).toBeUndefined();
    expect(s.status(presentedOf(A1, 1, [[7, 2]]))[key(A1, 1, 7)]).toBe('flagged');
    expect((await open(f)).list().flags[0]!.resolution).toBeUndefined();
  });
});

describe('event switch without merging (CONTRACTS §2.10 "keyed by eventId"; row 5)', () => {
  it('§3.5 event switch: a new event opens an empty store and leaves the old file unchanged; back to the old event reads it', async () => {
    const f = fakeChecksFs();
    const a = await open(f, 'event-A');
    await a.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    await a.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'old event' });
    const oldFiles = f.snapshot();
    const oldList = a.list();

    const b = await open(f, 'event-B');
    expect(b.list()).toEqual({ checks: [], flags: [] });
    expect(f.snapshot()).toEqual(oldFiles); // opening alone changes nothing on disk
    await b.putCheck({ attemptId: A2, run: 1, gate: 1, valueAtCheck: 0 });
    for (const [path, content] of Object.entries(oldFiles)) expect(f.snapshot()[path], `${path} changed`).toBe(content);
    expect(Object.keys(f.snapshot()).length).toBe(Object.keys(oldFiles).length + 1); // a file of its own

    const back = await open(f, 'event-A');
    expect(back.list()).toEqual(oldList);
    expect(back.status(presentedOf(A2, 1, [[1, 0]]))[key(A2, 1, 1)]).toBe('plain'); // nothing of B leaked
    expect((await open(f, 'event-B')).list().checks.length).toBe(1);
  });

  it('§2.10 the same attemptId in two events is two different checks', async () => {
    const f = fakeChecksFs();
    const a = await open(f, 'event-A');
    const b = await open(f, 'event-B');
    await a.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    await b.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 50 });
    expect((await open(f, 'event-A')).list().checks[0]!.valueAtCheck).toBe(2);
    expect((await open(f, 'event-B')).list().checks[0]!.valueAtCheck).toBe(50);
  });
});

describe('derived status (CONTRACTS §2.10; rows 6 to 9)', () => {
  it('§3.5 re-run not carried over: a run-1 check reads plain for run 2, and still verified under run 1', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    expect(s.status(presentedOf(A1, 2, [[7, 2]]))).toEqual({ [key(A1, 2, 7)]: 'plain' });
    expect(s.status(presentedOf(A1, 1, [[7, 2]]))).toEqual({ [key(A1, 1, 7)]: 'verified' });
    expect(s.list().checks.length).toBe(1); // not deleted by the new generation
  });

  it('§3.5 re-run not carried over: an open run-1 flag does not show as flagged in run 2', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x' });
    expect(s.status(presentedOf(A1, 2, [[7, 2]]))[key(A1, 2, 7)]).toBe('plain');
    expect(s.status(presentedOf(A1, 1, [[7, 2]]))[key(A1, 1, 7)]).toBe('flagged');
  });

  it('§3.5 re-baseline preserved: checks and flags survive, status recomputed against the rebuilt values (also across a restart)', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    await s.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 0 });
    await s.createFlag({ attemptId: A1, run: 1, gate: 9, comment: 'x' });
    const stored = s.list();
    expect(s.status(presentedOf(A1, 1, [[7, 2], [8, 0], [9, 2]]))).toEqual({
      [key(A1, 1, 7)]: 'verified', [key(A1, 1, 8)]: 'verified', [key(A1, 1, 9)]: 'flagged',
    });
    // the re-baseline rebuilds the presented values: gate 7 now differs, gate 8 is unjudged, gate 9 changed under its flag
    const rebuilt = presentedOf(A1, 1, [[7, 4], [8, null], [9, 0]]);
    const restarted = await open(f);
    expect(restarted.list()).toEqual(stored);
    expect(restarted.status(rebuilt)).toEqual({ [key(A1, 1, 7)]: 'stale', [key(A1, 1, 8)]: 'stale', [key(A1, 1, 9)]: 'flagged' });
  });

  it('§3.5 stale after a late correction: a check against 2, a later presented 50, reads stale; re-verifying reads verified', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    expect(s.status(presentedOf(A1, 1, [[7, 2]]))[key(A1, 1, 7)]).toBe('verified');
    expect(s.status(presentedOf(A1, 1, [[7, 50]]))[key(A1, 1, 7)]).toBe('stale');
    expect((await open(f)).status(presentedOf(A1, 1, [[7, 50]]))[key(A1, 1, 7)]).toBe('stale');
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 50 });
    expect(s.status(presentedOf(A1, 1, [[7, 50]]))[key(A1, 1, 7)]).toBe('verified');
  });

  it('§3.5 flag lifecycle: create, flagged, resolve, back to the check status; with no check back to plain', async () => {
    const f = fakeChecksFs();
    const clock = fakeClock();
    const s = await open(f, 'event-1', clock);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const p = presentedOf(A1, 1, [[7, 2], [8, 0]]);
    expect(s.status(p)).toEqual({ [key(A1, 1, 7)]: 'verified', [key(A1, 1, 8)]: 'plain' });

    clock.advance(5000);
    const flag = await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'check again', suggestedValue: 50, createdBy: 'judge-a' });
    const flag8 = await s.createFlag({ attemptId: A1, run: 1, gate: 8, comment: 'touch?' });
    expect(flag).toMatchObject({ attemptId: A1, run: 1, gate: 7, comment: 'check again', suggestedValue: 50, createdBy: 'judge-a', createdAt: iso(T0 + 5000) });
    expect(flag.resolution).toBeUndefined();
    expect(flag.flagId).not.toBe(flag8.flagId);
    expect(s.status(p)).toEqual({ [key(A1, 1, 7)]: 'flagged', [key(A1, 1, 8)]: 'flagged' });

    clock.advance(5000);
    const resolved = await s.resolveFlag(flag.flagId, { note: 'ok', resolvedBy: 'judge-b' });
    expect(resolved.resolution).toEqual({ resolvedAt: iso(T0 + 10_000), resolvedBy: 'judge-b', note: 'ok' });
    expect(s.status(p)).toEqual({ [key(A1, 1, 7)]: 'verified', [key(A1, 1, 8)]: 'flagged' });
    await s.resolveFlag(flag8.flagId, {});
    expect(s.status(p)).toEqual({ [key(A1, 1, 7)]: 'verified', [key(A1, 1, 8)]: 'plain' });
    expect(s.list().flags.length).toBe(2); // resolved flags are kept
  });

  it('§3.5 flag lifecycle: with a check gone stale a resolved flag shows stale (back to the check status)', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    const flag = await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x' });
    await s.resolveFlag(flag.flagId, {});
    expect(s.status(presentedOf(A1, 1, [[7, 50]]))[key(A1, 1, 7)]).toBe('stale');
  });

  it('CONTRACTS §7.4 resolving a resolved flag returns it unchanged (resolvedAt not moved); an unknown flag rejects flag-not-found', async () => {
    const f = fakeChecksFs();
    const clock = fakeClock();
    const s = await open(f, 'event-1', clock);
    const flag = await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x' });
    const first = await s.resolveFlag(flag.flagId, { note: 'first', resolvedBy: 'a' });
    clock.advance(60_000);
    const again = await s.resolveFlag(flag.flagId, { note: 'second', resolvedBy: 'b' });
    expect(again).toEqual(first);
    await expect(s.resolveFlag('no-such-flag', {})).rejects.toMatchObject({ code: 'flag-not-found' });
  });

  it('CONTRACTS §2.10 a flag keeps its place across a restart: open flag still flagged, resolution fields intact', async () => {
    const f = fakeChecksFs();
    const s = await open(f);
    const flag = await s.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x', suggestedValue: 2 });
    const r = await open(f);
    expect(r.status(presentedOf(A1, 1, [[7, 0]]))[key(A1, 1, 7)]).toBe('flagged');
    const resolved = await r.resolveFlag(flag.flagId, { note: 'n' });
    expect((await open(f)).list().flags[0]).toEqual(resolved);
  });
});

describe('Windows (row 11; CONTRACTS §2.10 "temporary file then a rename")', () => {
  it.each(['win32', 'linux'] as const)('§3.5 the rename path works where the target exists, on %s: replaced in one step, the target is never removed, overwritten in place or renamed away', async (platform) => {
    const f = fakeChecksFs();
    const s = await open(f, 'event-1', fakeClock(), { platform });
    await s.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
    await s.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 0 }); // the target now exists
    await s.createFlag({ attemptId: A1, run: 1, gate: 8, comment: 'x' });
    await s.deleteCheck({ attemptId: A1, run: 1, gate: 7 });
    expect(f.violations).toEqual([]);
    expect(f.ops.filter((o) => o.startsWith('rename ')).length).toBe(4);
    expect(Object.keys(f.snapshot()).length).toBe(1); // no temporary files left behind
    const r = await open(f, 'event-1', fakeClock(), { platform });
    expect(r.list().checks.map((c) => c.gate)).toEqual([8]);
    expect(r.list().flags.length).toBe(1);
  });

  it('ADR-016 the store states its win32 atomic-replace in code (issue row 11: "stated in code")', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, '../checks.ts'), 'utf8');
    expect(src).toMatch(/win32/);
  });
});
