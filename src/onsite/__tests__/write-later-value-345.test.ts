/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #345 item 50 (b) as completed by DA ruling item 20 CQ1 (DERIVATIONS §6): a delivery stating a later write's value confirms the latest such write and
 * resolves the ones before it (confirmed where the delivery states their value, else mismatched with the delivered cell). Tests (J)-(M).
 * Channel: the write path (REST); echoes = TCP results rows. The cell (gate 3) holds 0 in the base vector.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { disposeAll, openWs, type Env, type J } from './onsite-harness.js';
import { attemptOf, closedRun, rowOver, write, writeState } from './write-fixtures-300.js';
import { feed } from './datasets.js';

afterEach(disposeAll);
const cell = (g: J, n: number): number | null => g.value.find((c: J) => c.number === n).penalty;
const pushedWrites = (m: J[]): J[] => m.filter((x) => x.type === 'write.updated').map((x) => x.write);
const pushedGates = (m: J[]): J[] => m.filter((x) => x.type === 'attempt.updated' && x.fields?.gates !== undefined).map((x) => x.fields.gates);

/** The base closed run and writes to gate 3 in order; preconditions: the cell holds 0 from tcp, every write admitted and pending. */
async function writes(values: Array<0 | 2 | 50>): Promise<{ env: Env; ws: Awaited<ReturnType<typeof openWs>>; ids: string[] }> {
  const env = await closedRun();
  const g0 = (await attemptOf(env)).gates;
  expect(g0, 'precondition: the vector is known from tcp').toMatchObject({ state: 'known', source: 'tcp' });
  expect(cell(g0, 3), 'precondition: the cell holds 0').toBe(0);
  const ws = await openWs(env);
  await ws.barrier(); ws.take();
  const ids: string[] = [];
  for (const [i, v] of values.entries()) {
    const r = await write(env, { gate: 3, value: v }, `k${i}`);
    expect(r.status, `precondition: write ${i} admitted`).toBe(202);
    ids.push(r.body.writeId);
  }
  for (const id of ids) expect((await writeState(env, id)).status, 'precondition: pending').toBe('pending');
  await ws.barrier();
  return { env, ws, ids };
}
const statuses = async (env: Env, ids: string[]): Promise<string[]> => Promise.all(ids.map(async (i) => (await writeState(env, i)).status));

describe('CQ1 (item 20): a delivery that states a later write\'s value', () => {
  it('(J) item 50 (b) / §6: writes 2 then 0, one row restating 0: the first is mismatched (confirmedValue that cell), the second confirmed, in one unit', async () => {
    const { env, ws, ids } = await writes([2, 0]);
    ws.take();
    await feed(env, rowOver(env, {}));
    await ws.barrier();
    const pushed = pushedWrites(ws.take());
    expect(await statuses(env, ids)).toEqual(['mismatched', 'confirmed']);
    expect((await writeState(env, ids[0]!)).confirmedValue).toEqual({ gate: 3, value: 0 });
    expect(pushed.map((w) => w.writeId).sort(), 'both resolved in one unit').toEqual([...ids].sort());
  });

  it('(K) item 50 (b): writes 2, 50, 2; rows 2, 50, 2: confirmed one per row; 2 stays presented as operator-write until the last row, with no gates push at the first two', async () => {
    const { env, ws, ids } = await writes([2, 50, 2]);
    ws.take();
    await feed(env, rowOver(env, { 3: 2 }));
    await ws.barrier();
    expect(await statuses(env, ids)).toEqual(['confirmed', 'pending', 'pending']);
    expect(pushedGates(ws.take()), 'no gates push at the first row').toEqual([]);
    expect((await attemptOf(env)).gates).toMatchObject({ source: 'operator-write', provisional: true });
    expect(cell((await attemptOf(env)).gates, 3)).toBe(2);
    await feed(env, rowOver(env, { 3: 50 }));
    await ws.barrier();
    expect(await statuses(env, ids)).toEqual(['confirmed', 'confirmed', 'pending']);
    expect(pushedGates(ws.take()), 'no gates push at the second row').toEqual([]);
    expect(cell((await attemptOf(env)).gates, 3), '2 is still presented').toBe(2);
    expect((await attemptOf(env)).gates.source).toBe('operator-write');
    await feed(env, rowOver(env, { 3: 2 }));
    expect(await statuses(env, ids)).toEqual(['confirmed', 'confirmed', 'confirmed']);
    expect((await attemptOf(env)).gates).toMatchObject({ source: 'tcp', provisional: false });
  });

  it('(L) item 50 (b): writes 2, 0, 50; one row with 50: the first mismatched, the other two pending, 50 presented; a second row restating 50: the second mismatched, the third confirmed', async () => {
    const { env, ids } = await writes([2, 0, 50]);
    await feed(env, rowOver(env, { 3: 50 }));
    expect(await statuses(env, ids)).toEqual(['mismatched', 'pending', 'pending']);
    expect((await writeState(env, ids[0]!)).confirmedValue).toEqual({ gate: 3, value: 50 });
    const g = (await attemptOf(env)).gates;
    expect(g.source).toBe('operator-write');
    expect(cell(g, 3)).toBe(50);
    await feed(env, rowOver(env, { 3: 50 }));
    expect(await statuses(env, ids)).toEqual(['mismatched', 'mismatched', 'confirmed']);
  });

  it('(M) item 50 (b): writes 2, 2 (a re-submission); one row with 2: both confirmed in one unit', async () => {
    const { env, ws, ids } = await writes([2, 2]);
    ws.take();
    await feed(env, rowOver(env, { 3: 2 }));
    await ws.barrier();
    expect(await statuses(env, ids)).toEqual(['confirmed', 'confirmed']);
    expect(pushedWrites(ws.take()).map((w) => w.writeId).sort(), 'one unit').toEqual([...ids].sort());
  });
});
