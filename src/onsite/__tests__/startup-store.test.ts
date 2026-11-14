/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #273 M2 P2 (tier 1): startup on an invalid store file (CONTRACTS §2.10 durability bullets, §1.6 "seq never regresses across a restart",
 * DERIVATIONS §10 item 33). A store file that fails validation (checks and flags, writes, seq) is set aside under a new name in the same
 * directory, the store opens empty, the server starts, the admin log reports it; nothing goes on the wire. A missing file is a first start.
 * Interface: onsite-harness.ts header, plus (this package) `OnsiteOptions.adminLog` and `AdminLogEntry`, declared locally below because
 * the export does not exist yet: the tests must fail on behaviour, not on an import.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  boot, DATA_DIR, disposeAll, feedTcp, fakeOnsiteFs, get, hydrate, maxSeq, openWs, post, seqsOf, setInstance, virtualClock, type Env, type FakeOnsiteFs, type J,
} from './onsite-harness.js';
import { feed, ODP } from './datasets.js';
import type { OnsiteOptions } from '../index.js';

afterEach(disposeAll);

/** The shape the issue fixes (orchestrator's technical decision); the real type is exported from src/onsite/index.ts. */
interface AdminLogEntry { kind: 'store-set-aside'; store: 'checks' | 'writes' | 'seq'; eventId?: string; file: string; setAsideAs: string; reason: string }
const logger = (): { entries: AdminLogEntry[]; opts: Partial<OnsiteOptions> } => {
  const entries: AdminLogEntry[] = [];
  return { entries, opts: { adminLog: (e: AdminLogEntry) => { entries.push(e); } } as unknown as Partial<OnsiteOptions> };
};

const PATH = `/api/attempts/${ODP.phaseId}/56/penalty`;
const GOOD = { gate: ODP.gate, value: 50 };
const NOT_JSON = '{"version":1,"checks":[{"attemptId"';
const BASE = (name: string): string => name.slice(name.lastIndexOf('/') + 1);
const inDir = (fs: FakeOnsiteFs): string[] => [...fs.files.keys()].filter((p) => p.startsWith(`${DATA_DIR}/`));

interface Primed { fs: FakeOnsiteFs; startAt: string; clockAfter: number; checks: string; writes: string; seq: string; writeId: string; sent: number; run: number; names: string[] }
/** A process that ran: a closed run, one pending write, one check, then a graceful stop. Its files are what a restart finds. Also learns the file names. */
async function prime(): Promise<Primed> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  const ws = await openWs(env);
  for (const u of ODP.unitsXmlFirst()) await feed(env, u);
  await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  const a = (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);
  const run = a.run.value as number;
  await setInstance(env, 'Main');
  const w = await post(env, PATH, GOOD, { 'Idempotency-Key': 'old-key' });
  expect(w.status, 'precondition: the write is accepted').toBe(202);
  await env.h.checks.putCheck({ attemptId: ODP.attemptId, run, gate: ODP.gate, valueAtCheck: 2 });
  await ws.barrier();
  const sent = maxSeq(ws.messages);
  await env.h.stop();
  const files = inDir(env.fs);
  const checks = files.find((p) => /checks-ev-1\.json$/.test(p));
  const writes = files.find((p) => p !== checks && /writes/i.test(BASE(p)));
  const seq = files.find((p) => p !== checks && p !== writes && /seq/i.test(BASE(p)));
  expect(checks, `a checks file among ${files.join(', ')}`).toBeDefined();
  expect(writes, `a writes file among ${files.join(', ')}`).toBeDefined();
  expect(seq, `a seq file among ${files.join(', ')}`).toBeDefined();
  return { fs: env.fs, startAt: ODP.startAt, clockAfter: env.clock.now(), checks: checks!, writes: writes!, seq: seq!, writeId: w.body.writeId as string, sent, run, names: files.map(BASE) };
}
const restart = (p: Primed, extra: Partial<OnsiteOptions> = {}, later = 3_600_000): Promise<Env> =>
  boot({ startAt: p.startAt, eventDate: ODP.day, fs: p.fs, clock: virtualClock(p.clockAfter + later), ...extra });
const replay = async (env: Env): Promise<void> => {
  for (const u of ODP.unitsXmlFirst()) await feed(env, u);
  await feed(env, ODP.emptyAt(env.clock.now() + 1000));
};
const checksOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/checks`)).body;
const WIRE_TYPES = new Set(['attempt.updated', 'attempt.deleted', 'phase.updated', 'entry.updated', 'class.updated', 'standing.updated', 'course.updated', 'write.updated', 'sources.updated', 'check.updated', 'flag.updated', 'oncourse.updated', 'diagnostics.updated', 'event.changed', 'scope.replaced']); // CONTRACTS §7.2 WsPayload
async function expectSilentWire(env: Env): Promise<void> {
  const ws = await openWs(env);
  await replay(env);
  await ws.barrier();
  for (const m of ws.messages) {
    expect(JSON.stringify(m), 'the wire does not name a set-aside').not.toMatch(/set-aside|setAside|corrupt|invalid-store/i);
    expect(WIRE_TYPES.has(m['type']), `an unexpected message type ${String(m['type'])}`).toBe(true);
  }
  expect(JSON.stringify((await get(env, '/api/diagnostics')).body)).not.toMatch(/set-aside|setAside/i);
  expect(JSON.stringify((await get(env, '/api/sources')).body)).not.toMatch(/set-aside|setAside/i);
}

describe('#273 checks store invalid at startup (CONTRACTS §2.10, DERIVATIONS §10 item 33)', () => {
  it('contract §2.10 + DERIVATIONS §10 item 33: a checks file that is not JSON is set aside and the event opens with no checks', async () => {
    const p = await prime();
    p.fs.files.set(p.checks, NOT_JSON);
    const log = logger();
    const env = await restart(p, log.opts);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'store-set-aside', store: 'checks', eventId: 'ev-1', file: p.checks });
    const aside = log.entries[0]!.setAsideAs;
    expect(aside).not.toBe(p.checks);
    expect(aside.slice(0, aside.lastIndexOf('/'))).toBe(p.checks.slice(0, p.checks.lastIndexOf('/')));
    expect(p.fs.files.get(aside), 'the original bytes, unchanged').toBe(NOT_JSON);
    await expectSilentWire(env);
    const body = await checksOf(env);
    expect(body.checks).toEqual([]);
    expect(body.flags).toEqual([]);
  });

  for (const [what, content] of [
    ['wrong version', JSON.stringify({ version: 2, checks: [], flags: [] })],
    ['a duplicate check key', JSON.stringify({ version: 1, flags: [], checks: [
      { attemptId: ODP.attemptId, run: 1, gate: 3, checkedAt: '2026-04-18T10:00:00.000Z', valueAtCheck: 0 },
      { attemptId: ODP.attemptId, run: 1, gate: 3, checkedAt: '2026-04-18T10:01:00.000Z', valueAtCheck: 2 },
    ] })],
  ] as const) {
    it(`contract §2.10: a checks file that fails validation (${what}) is set aside the same way`, async () => {
      const p = await prime();
      p.fs.files.set(p.checks, content);
      const log = logger();
      const env = await restart(p, log.opts);
      expect(log.entries).toHaveLength(1);
      expect(log.entries[0]).toMatchObject({ kind: 'store-set-aside', store: 'checks', eventId: 'ev-1', file: p.checks });
      expect(p.fs.files.get(log.entries[0]!.setAsideAs)).toBe(content);
      await expectSilentWire(env);
      expect((await checksOf(env)).checks).toEqual([]);
    });
  }

  it('contract §2.10 never silently replaced: the first check after a set-aside writes a new file at the original name; the set-aside file is unchanged', async () => {
    const p = await prime();
    p.fs.files.set(p.checks, NOT_JSON);
    const log = logger();
    const env = await restart(p, log.opts);
    await replay(env);
    const aside = log.entries[0]!.setAsideAs;
    const put = await env.h.checks.putCheck({ attemptId: ODP.attemptId, run: p.run, gate: ODP.gate, valueAtCheck: 2 });
    const served = (await checksOf(env)).checks as J[];
    expect(served).toHaveLength(1);
    expect(served[0]).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: 2 });
    expect(put.valueAtCheck).toBe(2);
    const file = JSON.parse(p.fs.files.get(p.checks)!) as J;
    expect(file.checks).toHaveLength(1);
    expect(file.checks[0]).toMatchObject({ attemptId: ODP.attemptId, gate: ODP.gate, valueAtCheck: 2 });
    expect(p.fs.files.get(aside), 'the set-aside file is untouched').toBe(NOT_JSON);
  });
});

describe('#273 writes store invalid at startup (CONTRACTS §2.10, §1.5, DERIVATIONS §10 item 33)', () => {
  it('contract §2.10 + item 33: a writes file that fails validation is set aside; no write request or key is held; a new write is accepted', async () => {
    const p = await prime();
    p.fs.files.set(p.writes, '{"version":1,"writes":[');
    const log = logger();
    const env = await restart(p, log.opts);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'store-set-aside', store: 'writes', eventId: 'ev-1', file: p.writes });
    expect(p.fs.files.get(log.entries[0]!.setAsideAs)).toBe('{"version":1,"writes":[');
    await replay(env);
    const old = await get(env, `/api/writes/${p.writeId}`);
    expect(old.status, 'no write request is held').toBe(404);
    expect(old.body.error.code).toBe('write-not-found');
    await setInstance(env, 'Main');
    const fresh = await post(env, PATH, GOOD, { 'Idempotency-Key': 'brand-new-key' });
    expect(fresh.status).toBe(202);
    expect(fresh.body.writeId).not.toBe(p.writeId);
  });
});

describe('#273 seq file invalid at startup (CONTRACTS §1.6, DERIVATIONS §10 item 33)', () => {
  it('contract §1.6 + item 33: a seq file that fails validation is set aside; seq restarts above every seq sent before the restart, never at zero', async () => {
    const p = await prime();
    expect(p.sent).toBeGreaterThan(3);
    p.fs.files.set(p.seq, 'not a counter');
    const log = logger();
    const clock = virtualClock(p.clockAfter + 3_600_000);
    const bootNow = clock.now();
    const env = await boot({ startAt: p.startAt, eventDate: ODP.day, fs: p.fs, clock, ...log.opts });
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'store-set-aside', store: 'seq', file: p.seq });
    expect(p.fs.files.get(log.entries[0]!.setAsideAs)).toBe('not a counter');
    const ws = await openWs(env);
    await replay(env);
    await ws.barrier();
    const seqs = seqsOf(ws.messages);
    expect(seqs.length).toBeGreaterThan(0);
    expect(seqs[0]!, 'above every seq sent before the restart').toBeGreaterThan(p.sent);
    expect(seqs[0]!, 'not below the process clock at startup').toBeGreaterThanOrEqual(bootNow);
    for (const s of seqs) expect(s).toBeGreaterThanOrEqual(bootNow);
  });

  it('contract §1.6: after a seq set-aside, a graceful stop and a third start continue above the recovered counter', async () => {
    const p = await prime();
    p.fs.files.set(p.seq, '');
    const log = logger();
    const env2 = await restart(p, log.opts);
    const ws2 = await openWs(env2);
    await replay(env2);
    await ws2.barrier();
    const last2 = maxSeq(ws2.messages);
    expect(last2).toBeGreaterThan(p.sent);
    await env2.h.stop();
    const log3 = logger();
    const env3 = await boot({ startAt: p.startAt, eventDate: ODP.day, fs: p.fs, clock: virtualClock(env2.clock.now() + 3_600_000), ...log3.opts });
    expect(log3.entries, 'the recovered counter file is valid').toEqual([]);
    const ws3 = await openWs(env3);
    await replay(env3);
    await ws3.barrier();
    const first3 = seqsOf(ws3.messages)[0]!;
    expect(first3).toBeGreaterThan(last2);
  });
});

describe('#273 combined, startNewEvent, repeats, first start, default log (DERIVATIONS §10 item 33)', () => {
  it('item 33: checks, writes and seq files all invalid: the server starts with three set-aside entries', async () => {
    const p = await prime();
    p.fs.files.set(p.checks, NOT_JSON);
    p.fs.files.set(p.writes, 'garbage');
    p.fs.files.set(p.seq, 'garbage');
    const log = logger();
    const env = await restart(p, log.opts);
    expect(log.entries.map((e) => e.store).sort()).toEqual(['checks', 'seq', 'writes']);
    expect(new Set(log.entries.map((e) => e.setAsideAs)).size).toBe(3);
    expect((await get(env, '/api/events/current')).status).toBe(200);
  });

  it('item 33: startNewEvent to an event whose checks and writes files fail validation sets them aside and opens the event empty', async () => {
    const p = await prime();
    const checks2 = p.checks.replace('ev-1', 'ev-2');
    const writes2 = p.writes.replace('ev-1', 'ev-2');
    expect(writes2, 'the writes file is keyed by eventId').not.toBe(p.writes);
    p.fs.files.set(checks2, JSON.stringify({ version: 2, checks: [], flags: [] }));
    p.fs.files.set(writes2, 'garbage');
    const log = logger();
    const env = await restart(p, log.opts);
    expect(log.entries, 'ev-1 is valid').toEqual([]);
    await env.h.startNewEvent({ eventId: 'ev-2', name: 'Second' });
    expect(log.entries.map((e) => e.store).sort()).toEqual(['checks', 'writes']);
    for (const e of log.entries) expect(e).toMatchObject({ kind: 'store-set-aside', eventId: 'ev-2' });
    expect(log.entries.find((e) => e.store === 'checks')).toMatchObject({ file: checks2 });
    expect(log.entries.find((e) => e.store === 'writes')).toMatchObject({ file: writes2 });
    expect(p.fs.files.get(log.entries.find((e) => e.store === 'checks')!.setAsideAs)).toBe(JSON.stringify({ version: 2, checks: [], flags: [] }));
    const { model } = await hydrate(env);
    expect(model.event?.['eventId']).toBe('ev-2');
    expect([...model.checks.keys(), ...model.flags.keys()]).toEqual([]);
    await replay(env);
    expect((await checksOf(env)).checks).toEqual([]);
  });

  it('contract §2.10: two startups that each meet an invalid checks file leave two distinct set-aside files, neither overwritten', async () => {
    const p = await prime();
    p.fs.files.set(p.checks, 'first bad bytes');
    const log1 = logger();
    const env1 = await restart(p, log1.opts);
    await env1.h.stop();
    p.fs.files.set(p.checks, 'second bad bytes');
    const log2 = logger();
    await boot({ startAt: p.startAt, eventDate: ODP.day, fs: p.fs, clock: virtualClock(env1.clock.now() + 3_600_000), ...log2.opts });
    const a = log1.entries.find((e) => e.store === 'checks')!.setAsideAs;
    const b = log2.entries.find((e) => e.store === 'checks')!.setAsideAs;
    expect(a).not.toBe(b);
    expect(p.fs.files.get(a)).toBe('first bad bytes');
    expect(p.fs.files.get(b)).toBe('second bad bytes');
  });

  it('item 33: a missing store file is a first start: nothing set aside, nothing logged', async () => {
    const known = new Set((await prime()).names); // every file name a normal process leaves
    const log = logger();
    const fs = fakeOnsiteFs();
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs, ...log.opts });
    expect(log.entries).toEqual([]);
    await env.h.stop();
    for (const f of inDir(fs)) expect(known.has(BASE(f)), `an extra file ${f}`).toBe(true);
    expect(inDir(fs).filter((f) => /aside|invalid|corrupt|bad/i.test(BASE(f)))).toEqual([]);
  });

  it('item 33: without adminLog the set-aside is one stderr line naming the store and both paths', async () => {
    const p = await prime();
    p.fs.files.set(p.checks, NOT_JSON);
    const lines: string[] = [];
    const grab = (...a: unknown[]): void => { lines.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
    const err = vi.spyOn(console, 'error').mockImplementation(grab);
    const warn = vi.spyOn(console, 'warn').mockImplementation(grab);
    const w = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => { lines.push(String(chunk)); return true; }) as never);
    try {
      await restart(p);
    } finally { err.mockRestore(); warn.mockRestore(); w.mockRestore(); }
    const hits = lines.flatMap((l) => l.split('\n')).filter((l) => l.includes('store-set-aside'));
    expect(hits).toHaveLength(1);
    const aside = inDir(p.fs).find((f) => p.fs.files.get(f) === NOT_JSON && f !== p.checks);
    expect(aside, 'the set-aside file exists').toBeDefined();
    expect(hits[0]).toContain('checks');
    expect(hits[0]).toContain(p.checks);
    expect(hits[0]).toContain(aside!);
  });
});

void feedTcp;
