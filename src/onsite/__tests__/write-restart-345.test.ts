/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #345 / #300 after DA ruling item 20: O1 (several writes on one gate across a restart resume in one step, in the order sent: the outcome of a single
 * lifetime, DERIVATIONS §6 "After a restart", §10 item 50 (d)), N2 (a write resumed before its course binds presents nothing; from the binding the whole
 * vector, §10 item 50 (e), CONTRACTS §4 rule 4), N4 (a flag whose store write fails is not acknowledged, its key stays unbound, CONTRACTS §2.10, §7.4).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, feedXml, get, post, setInstance, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { FLAGS, GOOD, K, adminLog, attemptOf, closedRun, courseGateCount, failWritesStore, startListOnly, startListXml, rowOver, write, writeState, writesFile } from './write-fixtures-300.js';

afterEach(disposeAll);
const cell = (g: J, n: number): number | null => g.value.find((c: J) => c.number === n).penalty;

describe('O1 (item 20): TCP-first restart with two writes on one gate', () => {
  for (const restart of [true, false]) {
    it(`item 50 (d) / §6 "no outcome depends on uptime" (${restart ? 'after a restart, TCP row first' : 'control, no restart'}): gate holds 0, A asks 2, B asks 50; the row stating 2 creates the Attempt: A confirmed, B pending with retained 2, 50 presented`, async () => {
      const env1 = await closedRun();
      expect(cell((await attemptOf(env1)).gates, 3), 'precondition: the cell holds 0').toBe(0);
      const a = await write(env1, { gate: 3, value: 2 }, 'ka');
      const b = await write(env1, { gate: 3, value: 50 }, 'kb');
      expect([a.status, b.status], 'precondition: both admitted').toEqual([202, 202]);
      expect([(await writeState(env1, a.body.writeId)).status, (await writeState(env1, b.body.writeId)).status], 'precondition: both pending').toEqual(['pending', 'pending']);
      let env = env1;
      if (restart) {
        await env1.h.stop();
        env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env1.fs, clock: virtualClock(env1.clock.now() + 60_000) });
        await setInstance(env, 'Main');
      }
      await feed(env, rowOver(env, { 3: 2 }));
      if (restart) {
        expect([(await writeState(env, a.body.writeId)).status, (await writeState(env, b.body.writeId)).status], 'before the XML read nothing is judged on unbound cells').toEqual(['pending', 'pending']);
        await feed(env, ODP.unitsXmlFirst()[0]!);
      }
      expect((await writeState(env, a.body.writeId)).status).toBe('confirmed');
      expect((await writeState(env, b.body.writeId)).status).toBe('pending');
      const g = (await attemptOf(env)).gates;
      expect(g).toMatchObject({ source: 'operator-write', provisional: true });
      expect(cell(g, 3), '50 is presented').toBe(50);
      await feed(env, rowOver(env, { 3: 2 }));
      expect((await writeState(env, b.body.writeId)).status, 'B\'s retained value is 2: a re-sent 2 is a re-delivery').toBe('pending');
      await feed(env, rowOver(env, { 3: 50 }));
      expect((await writeState(env, b.body.writeId)).status).toBe('confirmed');
    });
  }
});

describe('N2 (item 20): a write resumed before its course binds', () => {
  it('item 50 (e) / §4 rule 4: restart with a stored pending write, a TCP row first, no XML yet: gates is not a single-cell operator-write value, the write is pending; the XML binding then presents the whole vector with its cell', async () => {
    const env1 = await closedRun();
    const w = await write(env1, GOOD, 'k1');
    expect(w.status, 'precondition: admitted').toBe(202);
    await env1.h.stop();
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env1.fs, clock: virtualClock(env1.clock.now() + 60_000) });
    await setInstance(env, 'Main');
    await feed(env, ODP.restate(2, env.clock.now() + 1000));
    const before = await attemptOf(env);
    expect(before, 'precondition: the row created the Attempt').toBeDefined();
    const bg = before.gates;
    expect(bg.source === 'operator-write' && Array.isArray(bg.value) && bg.value.length === 1, 'no single-cell operator-write value is served').toBe(false);
    expect(bg.state === 'known' && bg.source === 'operator-write', 'nothing of the write is presented without a course').toBe(false);
    expect((await writeState(env, w.body.writeId)).status).toBe('pending');
    await feed(env, ODP.unitsXmlFirst()[0]!);
    const g = (await attemptOf(env)).gates;
    expect(g).toMatchObject({ state: 'known', source: 'operator-write', provisional: true });
    expect(g.value, 'the whole vector').toHaveLength(await courseGateCount(env));
    expect(cell(g, ODP.gate)).toBe(50);
    expect((await writeState(env, w.body.writeId)).status).toBe('pending');
  });

  it('item 50 (e): an Attempt with no cells of its own at the binding: the binding presents the course\'s n cells, null but the requested one', async () => {
    const env1 = await startListOnly();
    const w = await write(env1, GOOD, 'k1');
    expect(w.status, 'precondition: admitted').toBe(202);
    await env1.h.stop();
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env1.fs, clock: virtualClock(env1.clock.now() + 60_000) });
    await feedXml(env, startListXml());
    const a = await attemptOf(env);
    expect(a, 'precondition: the start-list row created the Attempt').toBeDefined();
    const n = await courseGateCount(env);
    expect(a.gates).toMatchObject({ state: 'known', source: 'operator-write', provisional: true });
    expect(a.gates.value).toEqual(Array.from({ length: n }, (_x, i) => ({ number: i + 1, penalty: i + 1 === ODP.gate ? 50 : null })));
    expect((await writeState(env, w.body.writeId)).status).toBe('pending');
  });
});

describe('N4 (item 20): a flag creation whose store write fails', () => {
  it('§2.10 / §7.4: answers 500 and leaves its key unbound: a same-key retry is a new creation (201); the earlier memory-only write record is not lost and reaches the file with the next successful write', async () => {
    const a = adminLog();
    const issued: string[] = [];
    let n = 0;
    const env = await closedRun({ extra: { ...a.opts, newId: () => { const id = `flag-${++n}`; issued.push(id); return id; } } });
    const store = failWritesStore(env);
    const first = await write(env, GOOD, 'k1');
    expect(first.status, 'precondition: the write is admitted though its store write fails').toBe(202);
    const hits = store.failures;
    expect(hits, 'precondition: the injected failure was hit').toBeGreaterThanOrEqual(1);
    const flag = await post(env, FLAGS, { gate: 5, comment: 'touched?' }, K('f1'));
    expect(store.failures, 'precondition: the flag\'s key binding hit the failing store').toBeGreaterThan(hits);
    expect(flag.status, 'a flag not durably bound is not acknowledged').toBe(500);
    expect((await get(env, `/api/writes/${first.body.writeId as string}`)).status, 'the earlier write is still served').toBe(200);
    expect(issued, 'precondition: the failed creation chose a flag id').toHaveLength(1);
    store.stop();
    const retry = await post(env, FLAGS, { gate: 5, comment: 'touched?' }, K('f1'));
    expect(retry.status, 'the key was never bound: a new creation, not 200').toBe(201);
    expect(issued, 'the retry chose a new id').toHaveLength(2);
    expect(retry.body.flagId, 'a new creation, not the failed one under its bound id').toBe(issued[1]);
    expect(retry.body.flagId).not.toBe(issued[0]);
    const file = writesFile(env);
    expect(file, 'the next successful write of the store wrote the file').toBeDefined();
    expect(file!.writes.map((w) => w['writeId']), 'the memory-only write was persisted by the next successful write').toContain(first.body.writeId);
    expect(file?.writeKeys['k1']?.['id']).toBe(first.body.writeId);
    expect(file?.flagKeys['f1']?.['id']).toBe(retry.body.flagId);
    expect((await writeState(env, first.body.writeId)).status).toBe('pending');
  });
});
