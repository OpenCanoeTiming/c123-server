/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { createMergeCore } from '../index.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

/**
 * #300 row 7 (N3; DA ruling item 14; DERIVATIONS §6 "superseded: the generation increments first. The core decides it ... for a write resumed after a
 * restart too" and §10 item 44 (c)). Element-level, in the shape of the conformance vectors (operator-write-superseded-by-rerun), with the resumed element
 * as the on-site layer hands it over: the operator element carrying the stored `target.run`, the stored `writeId` and `retainedCell`.
 */
const A = 'K1M_BR1_6:9';
const T = (s: number): string => new Date(Date.parse('2026-09-15T14:00:00.000Z') + s * 1000).toISOString();
const cells = (c3: number, c4: number, c5: number) => [{ number: 3, penalty: c3 }, { number: 4, penalty: c4 }, { number: 5, penalty: c5 }];
let seq = 0;
const row = (observedAt: string, value: unknown): GivenElement => ({ ingestSeq: ++seq, attemptId: A, field: 'gates', source: 'tcp', kind: 'result-row', observedAt, value, confidence: 'authoritative', judgingComplete: true }) as GivenElement;
const run = (observedAt: string, n: number): GivenElement => ({ ingestSeq: ++seq, attemptId: A, field: 'run', source: 'tcp', kind: 'inference', observedAt, value: n, confidence: 'authoritative' }) as GivenElement;
const resumed = (observedAt: string, runN: number, writeId: string): GivenElement =>
  ({ ingestSeq: ++seq, attemptId: A, field: 'gates', source: 'operator-write', kind: 'operator', observedAt, value: [{ number: 4, penalty: 2 }], confidence: 'authoritative', run: runN, writeId, retainedCell: { penalty: 0 } }) as unknown as GivenElement;
const writes = (c: ReturnType<typeof createMergeCore>, from: number): any[] => (c.notifications().slice(from) as any[]).filter((m) => m['type'] === 'write.updated').map((m) => m['write']);

/** An Attempt presenting run 2 with a known tcp gates vector. */
function atGenerationTwo() {
  const c = createMergeCore({ attemptId: A });
  c.applyUnit([run(T(0), 2), row(T(1), cells(0, 0, 0))]);
  expect((c.presented(A) as any).run, 'precondition: the core presents generation 2').toMatchObject({ state: 'known', value: 2 });
  expect((c.presented(A) as any).gates, 'precondition: gates are known from tcp').toMatchObject({ state: 'known', source: 'tcp', provisional: false });
  expect(c.writeRequest(), 'precondition: no write yet').toBeUndefined();
  return c;
}

describe('row 7: the core decides superseded for a resumed write (DERIVATIONS §6, §10 item 44 (c))', () => {
  it('ruling 14: an Attempt at generation 2 and a resumed element with run 1: one write, superseded, target.run 1, gates unchanged and not operator-write, write.updated emitted', () => {
    const c = atGenerationTwo();
    const gatesBefore = structuredClone((c.presented(A) as any).gates);
    const n = c.notifications().length;
    c.applyUnit([resumed(T(2), 1, 'w-resumed')]);
    const w = writes(c, n);
    expect(w, 'exactly one write.updated for the resumed write').toHaveLength(1);
    expect(w[0]).toMatchObject({ writeId: 'w-resumed', status: 'superseded', target: { run: 1 } });
    expect(c.writeRequest()).toMatchObject({ writeId: 'w-resumed', status: 'superseded', target: { run: 1 } });
    const g = (c.presented(A) as any).gates;
    expect(g, 'the presented gates are unchanged').toEqual(gatesBefore);
    expect(g.source).not.toBe('operator-write');
    expect(g.provisional).toBe(false);
    const att = (c.notifications().slice(n) as any[]).filter((m) => m['type'] === 'attempt.updated' && m['fields']?.gates?.source === 'operator-write');
    expect(att, 'no optimistic value is pushed').toEqual([]);
  });

  it('ruling 14 (control, the stored generation): a resumed element with run 2 is pending, target.run 2, presented as operator-write, so the superseded case above is not a path that never admits a write', () => {
    const c = atGenerationTwo();
    const n = c.notifications().length;
    c.applyUnit([resumed(T(2), 2, 'w-resumed')]);
    expect(c.writeRequest()).toMatchObject({ writeId: 'w-resumed', status: 'pending', target: { run: 2 } });
    expect((c.presented(A) as any).gates).toMatchObject({ source: 'operator-write', provisional: true });
    expect(writes(c, n)).toHaveLength(1);
  });
});
