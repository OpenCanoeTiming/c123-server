/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #345 rows 1-4 (CONTRACTS §4 INV-2 rule 4: "the presented value under this rule is a whole `gates` vector": the vector presented from rules 1-3 with the
 * target cell replaced by the requested one, `gates` keeping the course's count (§2.6); where no vector is `known` the base is the course's gates with every
 * cell `null`). Channel: the gates come from a TCP results row (row 1), from the XML snapshot (2b), or from none (2a); the write is
 * POST /api/attempts/{phaseId}/{bib}/penalty (§7.3).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, get, openWs, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { GOOD, attemptOf, closedRun, courseGateCount, startListOnly, write } from './write-fixtures-300.js';

afterEach(disposeAll);

const cells = (g: J): Array<{ number: number; penalty: number | null }> => g.value;
const TARGET = ODP.gate;

/** Preconditions of a known vector: the course has `n >= 3` gates, the Attempt presents `n` known cells from `source`, and a non-target cell differs from the request. */
async function knownVector(env: Env, source: 'tcp' | 'xml'): Promise<{ n: number; base: Array<{ number: number; penalty: number | null }> }> {
  const n = await courseGateCount(env);
  expect(n, 'precondition: the course has at least three gates').toBeGreaterThanOrEqual(3);
  const a = await attemptOf(env);
  expect(a.gates.state, 'precondition: the Attempt\'s gates are known').toBe('known');
  expect(a.gates.source, `precondition: ... from ${source}`).toBe(source);
  expect(cells(a.gates), 'precondition: n cells presented').toHaveLength(n);
  const base = cells(a.gates);
  expect(base.filter((c) => c.number !== TARGET).some((c) => c.penalty !== GOOD.value), 'precondition: a non-target cell differs from the requested value').toBe(true);
  expect(base.find((c) => c.number === TARGET)!.penalty, 'precondition: the target cell differs from the request').not.toBe(GOOD.value);
  return { n, base };
}
const expectWhole = (g: J, n: number, base: Array<{ number: number; penalty: number | null }>): void => {
  expect(g.state).toBe('known');
  expect(cells(g), 'the presented vector keeps the course\'s n cells').toHaveLength(n);
  expect(cells(g).map((c) => c.number)).toEqual(base.map((c) => c.number));
  expect(cells(g).find((c) => c.number === TARGET)!.penalty, 'the target cell is the requested one').toBe(GOOD.value);
  expect(cells(g).filter((c) => c.number !== TARGET), 'every other cell is the base vector\'s').toEqual(base.filter((c) => c.number !== TARGET));
  expect(g.source).toBe('operator-write');
  expect(g.provisional).toBe(true);
};
const pushedGates = (msgs: J[]): J => {
  const m = [...msgs].reverse().find((x) => x.type === 'attempt.updated' && x.attemptId === ODP.attemptId && x.fields?.gates !== undefined);
  expect(m, 'the write\'s attempt.updated carries gates').toBeDefined();
  return m!.fields.gates;
};

describe('row 1: whole vector over a known tcp vector (INV-2 rule 4)', () => {
  it('obligation INV-2 rule 4 "a whole gates vector": a write to one gate presents n cells, the target replaced, the rest the tcp vector\'s; the push equals the hydration GET', async () => {
    const env = await closedRun();
    const { n, base } = await knownVector(env, 'tcp');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await write(env);
    expect(r.status, 'precondition: the write is admitted').toBe(202);
    await ws.barrier();
    const pushed = pushedGates(ws.take());
    expectWhole(pushed, n, base);
    const got = (await attemptOf(env)).gates;
    expectWhole(got, n, base);
    expect(got, 'hydration equals the push').toEqual(pushed);
  });
});

describe('row 2a: the base when no vector is known (INV-2 rule 4: the course\'s gates, every cell null)', () => {
  it('obligation INV-2 rule 4 "every cell null": a course bound with n gates and no known gates vector: the write presents n cells, all null but the target', async () => {
    const env = await startListOnly();
    const n = await courseGateCount(env);
    expect(n, 'precondition: the course has at least three gates').toBeGreaterThanOrEqual(3);
    expect((await attemptOf(env)).gates.state, 'precondition: no gates vector is known for the Attempt').toBe('not-yet');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await write(env);
    expect(r.status, 'precondition: the write is admitted').toBe(202);
    await ws.barrier();
    const pushed = pushedGates(ws.take());
    const expected = Array.from({ length: n }, (_x, i) => ({ number: i + 1, penalty: i + 1 === TARGET ? GOOD.value : null }));
    expect(pushed).toMatchObject({ state: 'known', source: 'operator-write', provisional: true });
    expect(cells(pushed)).toEqual(expected);
    expect((await attemptOf(env)).gates, 'hydration equals the push').toEqual(pushed);
  });
});

describe('row 2b: whole vector over an xml vector', () => {
  it('obligation INV-2 rule 4: with the vector known from the XML snapshot alone, the write presents n cells, the target replaced, the rest the xml vector\'s', async () => {
    const env = await closedRun({ tcpRows: false });
    const { n, base } = await knownVector(env, 'xml');
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await write(env);
    expect(r.status, 'precondition: the write is admitted').toBe(202);
    await ws.barrier();
    const pushed = pushedGates(ws.take());
    expectWhole(pushed, n, base);
    expect((await attemptOf(env)).gates, 'hydration equals the push').toEqual(pushed);
  });
});

describe('row 3: a write resumed after a restart presents the same whole vector (adoptPending path)', () => {
  it('obligation INV-2 rule 4 + CONTRACTS §1.5: a pending write resumed from the store presents n cells in hydration after the restart', async () => {
    const env1 = await closedRun({ tcpRows: false });
    const { n, base } = await knownVector(env1, 'xml');
    const first = await write(env1);
    expect(first.status, 'precondition: the write is admitted and durable').toBe(202);
    await env1.h.stop();
    const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env1.fs, clock: virtualClock(env1.clock.now() + 60_000) });
    await feed(env2, ODP.unitsXmlFirst()[0]!);
    const w = await get(env2, `/api/writes/${first.body.writeId as string}`);
    expect(w.body.status, 'precondition: the write resumed pending').toBe('pending');
    const ws = await openWs(env2);
    await ws.barrier();
    const g = (await attemptOf(env2)).gates;
    expectWhole(g, n, base);
  });
});

describe('row 4: resolution unchanged (regression guard)', () => {
  it('obligation INV-2 rule 4 + DERIVATIONS §6: an echo stating the requested value confirms the write; the presented vector is then the tcp row\'s n cells, provisional gone', async () => {
    const env = await closedRun();
    const { n } = await knownVector(env, 'tcp');
    const r = await write(env);
    expect(r.status, 'precondition: the write is admitted').toBe(202);
    await feed(env, ODP.echo(50, env.clock.now() + 1000));
    expect((await get(env, `/api/writes/${r.body.writeId as string}`)).body.status).toBe('confirmed');
    const g = (await attemptOf(env)).gates;
    expect(g).toMatchObject({ state: 'known', source: 'tcp', provisional: false });
    expect(cells(g)).toHaveLength(n);
    expect(cells(g).find((c) => c.number === TARGET)!.penalty).toBe(GOOD.value);
    expect(cells(g).filter((c) => c.number !== TARGET).every((c) => c.penalty === 0), 'the tcp row\'s own cells').toBe(true);
  });
});
