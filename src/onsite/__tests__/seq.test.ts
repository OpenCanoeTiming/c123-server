/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 rows 4, 5, 7, 8 (tier 1): the one `seq` counter, its persistence across a restart, the handshake, the heartbeat (CONTRACTS §1.6, §7.2).
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyMessage, boot, disposeAll, fakeOnsiteFs, get, hydrate, maxSeq, modelFrom, openWs, rng, seqsOf, view, virtualClock, XML_PATH, type J,
} from './onsite-harness.js';
import { feed, ODP, NKZ } from './datasets.js';

afterEach(disposeAll);

describe('row 4: one seq counter (CONTRACTS §1.6)', () => {
  it('contract §1.6: every message on every connection is stamped from one counter: strictly increasing per connection, the same seq and content on both connections', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const a = await openWs(env);
    const b = await openWs(env);
    await b.barrier();
    a.take(); b.take();
    for (const u of ODP.units()) await feed(env, u);
    await a.barrier(); await b.barrier();
    const sa = seqsOf(a.messages), sb = seqsOf(b.messages);
    expect(sb.length).toBeGreaterThan(5);
    for (const s of [sa, sb]) for (let i = 1; i < s.length; i++) expect(s[i]!, `at ${i}`).toBeGreaterThan(s[i - 1]!);
    const bySeq = new Map(a.messages.map((m) => [m.seq, m]));
    for (const m of b.messages) if (bySeq.has(m.seq)) expect(bySeq.get(m.seq)).toEqual(m);
    const connectTime = new Set(b.messages.filter((m) => m.type === 'event.changed').map((m) => m.seq));
    expect(sb.filter((s) => !sa.includes(s) && !connectTime.has(s)), 'a seq only one connection saw would be a per-connection counter').toEqual([]);
    // each outbound message takes the next value: nothing is skipped on the connection that was open throughout
    for (let i = 1; i < sb.length; i++) expect(sb[i]).toBe(sb[i - 1]! + 1);
  });

  it('contract §1.6: every REST asOfSeq is that counter: after a unit it equals the last seq sent, and a read consumes none', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier();
    for (const u of ODP.units()) {
      await feed(env, u);
      await ws.barrier();
      const r1 = await get(env, '/api/diagnostics');
      const r2 = await get(env, '/api/oncourse');
      expect(r1.body.asOfSeq).toBe(maxSeq(ws.messages));
      expect(r2.body.asOfSeq).toBe(r1.body.asOfSeq);
    }
  });

  it('contract §1.6: one unit\'s messages all follow the seq that a hydration read before it carried, and the hydration read after it carries the last of them', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    const units = ODP.units();
    for (const u of units.slice(0, 3)) await feed(env, u);
    await ws.barrier();
    const before = (await get(env, '/api/diagnostics')).body.asOfSeq as number;
    ws.take();
    await feed(env, units[3]!);
    await ws.barrier();
    const unit = ws.take();
    expect(unit.length).toBeGreaterThan(0);
    for (const m of unit) expect(m.seq).toBeGreaterThan(before);
    expect((await get(env, '/api/diagnostics')).body.asOfSeq).toBe(maxSeq(unit));
  });
});

describe('row 5: seq never regresses across a restart (CONTRACTS §1.6)', () => {
  async function run(kind: 'stop' | 'kill' | 'kill-in-write') {
    const fs = fakeOnsiteFs();
    const clock = virtualClock(Date.parse(NKZ.startAt));
    const env1 = await boot({ startAt: NKZ.startAt, eventDate: NKZ.day, fs, clock });
    const ws1 = await openWs(env1);
    const units = NKZ.units();
    for (const u of units.slice(0, 4)) await feed(env1, u);
    await ws1.barrier();
    if (kind === 'kill-in-write') {
      fs.holdRename(); // the next durable write never completes: a kill between the temporary file and the rename
      for (const u of units.slice(4, 6)) await feed(env1, u);
      await ws1.barrier();
    }
    const sent = maxSeq(ws1.messages);
    expect(sent).toBeGreaterThan(3);
    let fs2 = fs;
    if (kind === 'stop') await env1.h.stop();
    else { fs2 = fs.afterKill(); env1.h.kill(); }
    const env2 = await boot({ startAt: NKZ.startAt, eventDate: NKZ.day, fs: fs2, clock: virtualClock(Date.parse(NKZ.startAt) + 3_600_000) });
    const ws2 = await openWs(env2);
    await feed(env2, units[0]!);
    await ws2.barrier();
    const first = seqsOf(ws2.messages);
    expect(first.length).toBeGreaterThan(0);
    for (const s of first) expect(s, `seq after the restart (${kind})`).toBeGreaterThan(sent);
    expect((await get(env2, '/api/diagnostics')).body.asOfSeq).toBeGreaterThan(sent);
  }
  it('contract §1.6: stop, start over the same directory: the first new seq is above every seq sent before', () => run('stop'));
  it('contract §1.6: kill without stopping, start over the durable files: the first new seq is above every seq sent before', () => run('kill'));
  it('contract §1.6 (as #211 row 10): kill between the temporary file and the rename of a durable write: the first new seq is above every seq sent before', () => run('kill-in-write'));
});

describe('row 7: the handshake (CONTRACTS §1.6 steps 1-5)', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    it(`contract §1.6 handshake, seed ${seed}: open /ws at a random point of the ingest, buffer, hydrate with units arriving between the requests, drop seq <= min(asOfSeq), apply: equals a fresh hydration`, async () => {
      const rand = rng(seed);
      const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
      const units = ODP.units();
      const openAt = Math.floor(rand() * units.length);
      let next = 0;
      const feedNext = async (): Promise<void> => { if (next < units.length) await feed(env, units[next++]!); };
      for (; next < openAt; ) await feedNext();
      const ws = await openWs(env); // step 1: open first
      // steps 2-3: buffer (the socket does), then hydrate, with a unit possibly landing after any request
      const { model, hydratedSeq } = await hydrate(env, async () => { if (rand() < 0.5) await feedNext(); });
      while (next < units.length) await feedNext();
      await ws.barrier();
      // step 4-5: discard seq <= hydratedSeq, apply the rest in seq order
      const rest = ws.messages.filter((m) => m.seq > hydratedSeq).sort((a, b) => a.seq - b.seq);
      for (const m of rest) applyMessage(model, m);
      const fresh = (await hydrate(env)).model;
      expect(model.creation).toEqual([]);
      expect(view(model)).toEqual(view(fresh));
    });
  }
});

describe('row 8: heartbeat (CONTRACTS §7.2 liveness; INV-5)', () => {
  it('contract §7.2: with the injected clock and no input, sources.updated arrives at least every 10 s, each with its own increasing seq, and no other message is sent', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    const at: number[] = [];
    let seen = 0;
    for (let s = 1; s <= 35; s++) {
      await env.clock.advance(1000);
      await ws.barrier();
      const got = ws.take();
      for (const m of got) { expect(m.type).toBe('sources.updated'); at.push(s); seen++; }
    }
    expect(seen).toBeGreaterThanOrEqual(3);
    expect(at[0]!).toBeLessThanOrEqual(10);
    for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBeLessThanOrEqual(10);
    expect(at.at(-1)!).toBeGreaterThanOrEqual(26);
    const seqs = seqsOf(ws.messages.filter((m) => m.type === 'sources.updated'));
    for (let i = 1; i < seqs.length; i++) expect(seqs[i]!).toBeGreaterThan(seqs[i - 1]!);
    expect(ws.messages.at(-1)!.sources).toEqual((await get(env, '/api/sources')).body);
  });

  it('INV-5: an XML poll that finds the file unchanged states nothing: only the heartbeat is sent', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    for (const u of ODP.units()) await feed(env, u);
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();
    await env.clock.advance(31_000); // six polls of the same file (mtime and size unchanged) and three heartbeats
    await ws.barrier();
    const got = ws.take();
    expect(got.length).toBeGreaterThanOrEqual(3);
    expect(got.map((m) => m.type).filter((t) => t !== 'sources.updated' && t !== 'event.changed')).toEqual([]);
    void XML_PATH;
  });

  it('contract §7.2: a connection event or a unit between heartbeats is not delayed or swallowed by the heartbeat: its messages keep their own seq', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    await env.clock.advance(10_000);
    const u = ODP.units()[0]!;
    await feed(env, u);
    await ws.barrier();
    const s = seqsOf(ws.messages);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeGreaterThan(s[i - 1]!);
    expect(ws.messages.some((m) => m.type === 'attempt.updated')).toBe(true);
    void modelFrom; void ({} as J);
  });
});
