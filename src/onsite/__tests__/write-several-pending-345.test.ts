/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #345 item 50 tests (A)-(I) (DERIVATIONS §10 item 50, §6; CONTRACTS §4 INV-2 rule 4; DA ruling "Item 19"): several writes pending on one Attempt.
 * Presented: the rules 1-3 vector, live, with the target cell of every pending write laid over it (later write wins on one cell). Resolved: on different
 * cells each write by §6 on its own cell; on one cell in the order sent. Channel: the write path (REST), echoes = TCP results rows (R19.c4RowA restated).
 * Base of every test: the recorded stream through closure, gates known from tcp: 19 cells, all 0 except gate 13 = 2.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, get, openWs, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed, type Unit } from './datasets.js';
import { R19 } from '../../core/__tests__/fixtures/round19-excerpts.js';
import { attemptOf, closedRun, write } from './write-fixtures-300.js';

afterEach(disposeAll);

/** A TCP results row of bib 56 restating the presented run (R19.c4RowA, Time 81.62) with the given gate cells changed; Pen and Total follow. */
function row(env: Env, over: Record<number, 0 | 2 | 50>, ms = env.clock.now() + 1000): Unit {
  return { kind: 'tcp', rec: derived(R19.c4RowA, {
    observedAt: new Date(ms).toISOString(),
    edit: (d) => {
      let pen = 0;
      const e = d.replace(/Gates="([^"]*)"/, (_m, g: string) => {
        const out: string[] = [];
        for (let i = 1; i <= 19; i++) {
          const base = Number(g.slice((i - 1) * 3, i * 3).trim() || '0');
          const v = over[i] ?? base;
          pen += v;
          out.push(String(v).padStart(3, ' '));
        }
        return `Gates="${out.join('')}${g.slice(57)}"`;
      });
      return e.replace(/ Pen="\d+"/, ` Pen="${pen}"`).replace(/ Total="[^"]*"/, ` Total="${(81.62 + pen).toFixed(2)}"`);
    },
  }) };
}
const cellOf = (g: J, n: number): number | null => g.value.find((c: J) => c.number === n).penalty;
const st = async (env: Env, id: string): Promise<J> => (await get(env, `/api/writes/${id}`)).body;
const gatesOf = async (env: Env): Promise<J> => (await attemptOf(env)).gates;

/** The base closed run and two accepted writes `[gate, value]`; preconditions asserted: vector known from tcp, both writes pending. */
async function twoWrites(a: [number, 0 | 2 | 50], b: [number, 0 | 2 | 50], env0?: Env): Promise<{ env: Env; ws: Awaited<ReturnType<typeof openWs>>; w1: J; w2: J }> {
  const env = env0 ?? await closedRun();
  const g0 = await gatesOf(env);
  expect(g0, 'precondition: the rules 1-3 vector is known from tcp').toMatchObject({ state: 'known', source: 'tcp' });
  expect(g0.value, 'precondition: 19 cells').toHaveLength(19);
  expect(cellOf(g0, a[0]), 'precondition: the first target cell differs from its request').not.toBe(a[1]);
  expect(cellOf(g0, b[0]), 'precondition: the second target cell differs from its request').not.toBe(b[1]);
  const ws = await openWs(env);
  await ws.barrier(); ws.take();
  const r1 = await write(env, { gate: a[0], value: a[1] }, 'ka');
  const r2 = await write(env, { gate: b[0], value: b[1] }, 'kb');
  expect(r1.status, 'precondition: first write admitted').toBe(202);
  expect(r2.status, 'precondition: second write admitted').toBe(202);
  expect((await st(env, r1.body.writeId)).status, 'precondition: first pending').toBe('pending');
  expect((await st(env, r2.body.writeId)).status, 'precondition: second pending').toBe('pending');
  await ws.barrier();
  return { env, ws, w1: r1.body, w2: r2.body };
}
const pushedWrites = (msgs: J[]): J[] => msgs.filter((m) => m.type === 'write.updated').map((m) => m.write);
const pushedGates = (msgs: J[]): J[] => msgs.filter((m) => m.type === 'attempt.updated' && m.attemptId === ODP.attemptId && m.fields?.gates !== undefined).map((m) => m.fields.gates);

describe('(A) different gates: both requested values presented', () => {
  it('item 50 / INV-2 rule 4: write gate 3 then gate 5 before any row: gates has 19 cells with both requested values, the rest the base, operator-write, provisional; both pending; hydration equals the push', async () => {
    const { env, ws, w1, w2 } = await twoWrites([3, 2], [5, 50]);
    const msgs = ws.messages;
    const last = pushedGates(msgs).at(-1)!;
    expect(last).toMatchObject({ state: 'known', source: 'operator-write', provisional: true });
    expect(last.value).toHaveLength(19);
    expect(cellOf(last, 3)).toBe(2);
    expect(cellOf(last, 5)).toBe(50);
    expect(cellOf(last, 13), 'the rest is the base').toBe(2);
    expect(last.value.filter((c: J) => ![3, 5, 13].includes(c.number)).every((c: J) => c.penalty === 0)).toBe(true);
    expect((await st(env, w1.writeId)).status).toBe('pending');
    expect((await st(env, w2.writeId)).status).toBe('pending');
    expect(await gatesOf(env), 'hydration equals the push').toEqual(last);
  });
});

describe('(B) a row confirms the first only; then the second', () => {
  it('item 50 / §6: a row with gate 3 as requested and gate 5 unchanged: first confirmed, second pending, one write.updated and no attempt.updated carrying gates; then gate 5 as requested: second confirmed, gates tcp', async () => {
    const { env, ws, w1, w2 } = await twoWrites([3, 2], [5, 50]);
    ws.take();
    await feed(env, row(env, { 3: 2 }));
    await ws.barrier();
    const m = ws.take();
    expect((await st(env, w1.writeId)).status).toBe('confirmed');
    expect((await st(env, w2.writeId)).status).toBe('pending');
    expect(pushedWrites(m), 'one write.updated').toHaveLength(1);
    expect(pushedGates(m), 'no gates sent: the presented vector did not change').toEqual([]);
    await feed(env, row(env, { 3: 2, 5: 50 }));
    expect((await st(env, w2.writeId)).status).toBe('confirmed');
    expect(await gatesOf(env)).toMatchObject({ state: 'known', source: 'tcp', provisional: false });
  });
});

describe('(C) a row moves the first cell to another value', () => {
  it('item 50 / §6: the first write is mismatched with that cell; gates show the row\'s gate 3 and the still-requested gate 5, operator-write', async () => {
    const { env, w1, w2 } = await twoWrites([3, 2], [5, 50]);
    await feed(env, row(env, { 3: 50 }));
    const a = await st(env, w1.writeId);
    expect(a.status).toBe('mismatched');
    expect(a.confirmedValue).toEqual({ gate: 3, value: 50 });
    expect((await st(env, w2.writeId)).status, 'the other write is not touched').toBe('pending');
    const g = await gatesOf(env);
    expect(g).toMatchObject({ source: 'operator-write', provisional: true });
    expect(cellOf(g, 3), 'the row\'s gate 3').toBe(50);
    expect(cellOf(g, 5), 'the requested gate 5').toBe(50);
  });
});

describe('(D) a row moves only another gate while one write is pending', () => {
  it('item 50 (the base is live): gates show that gate\'s new value and the requested cell; the write stays pending', async () => {
    const env = await closedRun();
    const g0 = await gatesOf(env);
    expect(cellOf(g0, 7), 'precondition: gate 7 starts at 0').toBe(0);
    const ws = await openWs(env);
    const r = await write(env, { gate: 3, value: 2 }, 'ka');
    expect(r.status, 'precondition: admitted').toBe(202);
    expect((await st(env, r.body.writeId)).status, 'precondition: pending').toBe('pending');
    await feed(env, row(env, { 7: 2 }));
    await ws.barrier();
    const g = await gatesOf(env);
    expect(g).toMatchObject({ source: 'operator-write', provisional: true });
    expect(cellOf(g, 7), 'the base moved at once').toBe(2);
    expect(cellOf(g, 3), 'the requested cell stays').toBe(2);
    expect((await st(env, r.body.writeId)).status).toBe('pending');
    expect(pushedGates(ws.messages).at(-1), 'the change was pushed').toEqual(g);
  });
});

describe('(E)-(G) the same gate written twice: answered in the order sent', () => {
  it('(E) item 50: write 2 then 50: gates present 50; a row with 2 confirms the first, the second pending with 50 still presented; a row with 50 confirms the second', async () => {
    const { env, w1, w2 } = await twoWrites([3, 2], [3, 50]);
    expect(cellOf(await gatesOf(env), 3), 'the later value stands').toBe(50);
    await feed(env, row(env, { 3: 2 }));
    expect((await st(env, w1.writeId)).status).toBe('confirmed');
    expect((await st(env, w2.writeId)).status, 'not judged against the first command\'s echo').toBe('pending');
    expect(cellOf(await gatesOf(env), 3)).toBe(50);
    await feed(env, row(env, { 3: 50 }));
    expect((await st(env, w2.writeId)).status).toBe('confirmed');
  });

  it('(F) item 50: a single row with 50: the first is mismatched (confirmedValue that cell), the second confirmed, in one unit', async () => {
    const { env, ws, w1, w2 } = await twoWrites([3, 2], [3, 50]);
    ws.take();
    await feed(env, row(env, { 3: 50 }));
    await ws.barrier();
    const ws1 = pushedWrites(ws.take());
    const a = await st(env, w1.writeId);
    expect(a.status).toBe('mismatched');
    expect(a.confirmedValue).toEqual({ gate: 3, value: 50 });
    expect((await st(env, w2.writeId)).status).toBe('confirmed');
    expect(ws1.map((w) => w.writeId).sort(), 'both resolved in one unit').toEqual([w1.writeId, w2.writeId].sort());
  });

  it('(G) item 50 / INV-5: a row re-sending the old value first: both stay pending', async () => {
    const { env, w1, w2 } = await twoWrites([3, 2], [3, 50]);
    await feed(env, row(env, {}));
    expect((await st(env, w1.writeId)).status).toBe('pending');
    expect((await st(env, w2.writeId)).status).toBe('pending');
  });

  it('(H) item 50 "After a restart": as (E) with a restart after the row with 2: a row re-sending 2 leaves the second pending (its retained value became 2, durably); a row with 50 confirms it', async () => {
    const { env, w1, w2 } = await twoWrites([3, 2], [3, 50]);
    await feed(env, row(env, { 3: 2 }));
    expect((await st(env, w1.writeId)).status, 'precondition: first confirmed').toBe('confirmed');
    expect((await st(env, w2.writeId)).status, 'precondition: second pending').toBe('pending');
    await env.h.stop();
    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env.fs, clock: virtualClock(env.clock.now() + 60_000) });
    await feed(env2, ODP.unitsXmlFirst()[0]!);
    expect((await st(env2, w2.writeId)).status, 'precondition: resumed pending').toBe('pending');
    await feed(env2, row(env2, { 3: 2 }));
    expect((await st(env2, w2.writeId)).status, 're-sent 2 is a re-delivery of the retained 2').toBe('pending');
    await feed(env2, row(env2, { 3: 50 }, env2.clock.now() + 2000));
    expect((await st(env2, w2.writeId)).status).toBe('confirmed');
  });
});

describe('(I) a retraction resolves every pending write', () => {
  it('item 50 / INV-2 rule 4 (retraction): two writes pending, the row wiped: both mismatched without confirmedValue', async () => {
    const { env, w1, w2 } = await twoWrites([3, 2], [5, 50]);
    await feed(env, ODP.wipe(env.clock.now() + 1000));
    for (const w of [w1, w2]) {
      const s = await st(env, w.writeId);
      expect(s.status).toBe('mismatched');
      expect(s.confirmedValue).toBeUndefined();
    }
  });
});
