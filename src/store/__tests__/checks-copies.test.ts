/**
 * #210 row 10, review B3 (#273 N3): the checks store hands out copies, never its live state. Store level, so the wiring's own copying cannot hide it.
 * Interfaces: checks-harness.ts.
 */
import { describe, expect, it } from 'vitest';
import { openChecksStore } from '../checks.js';
import { A1, DIR, T0, counterIds, fakeChecksFs, fakeClock } from './checks-harness.js';

async function open() {
  const fake = fakeChecksFs();
  const store = await openChecksStore({ fs: fake.fs, dir: DIR, eventId: 'ev-1', clock: fakeClock(T0), newId: counterIds() });
  return { fake, store };
}

describe('contract §2.10 durable state, #273 N3: the store hands out copies', () => {
  it('list() returns arrays and records that mutating does not reach: neither the next list() nor the file', async () => {
    const { fake, store } = await open();
    await store.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 2, checkedBy: 'a' });
    const f = await store.createFlag({ attemptId: A1, run: 1, gate: 3, comment: 'c' });
    await store.resolveFlag(f.flagId, { note: 'n' });
    const before = JSON.stringify(store.list());
    const l = store.list();
    l.checks.push({ attemptId: 'x', run: 1, gate: 1, checkedAt: 'x', valueAtCheck: 0 });
    l.checks[0]!.valueAtCheck = 99;
    l.flags[0]!.comment = 'mutated';
    l.flags[0]!.resolution!.note = 'mutated in place';
    l.flags.length = 0;
    expect(JSON.stringify(store.list())).toBe(before);
    const g = store.list();
    g.checks.length = 0;
    expect(store.list().checks).toHaveLength(1);
    await store.putCheck({ attemptId: A1, run: 1, gate: 9, valueAtCheck: 0 }); // the next write must not carry the mutation to disk
    const file = JSON.parse([...fake.files.entries()].find(([p]) => p.endsWith('checks-ev-1.json'))![1]);
    expect(file.checks.map((c: { gate: number; valueAtCheck: number }) => [c.gate, c.valueAtCheck])).toEqual([[8, 2], [9, 0]]);
    expect(file.flags[0].comment).toBe('c');
    expect(file.flags[0].resolution.note).toBe('n');
  });

  it('putCheck, createFlag and resolveFlag return objects that mutating does not reach (nested resolution included)', async () => {
    const { store } = await open();
    const c = await store.putCheck({ attemptId: A1, run: 1, gate: 8, valueAtCheck: 2, checkedBy: 'a' });
    c.valueAtCheck = 77; c.checkedBy = 'mutated';
    expect(store.list().checks[0]).toMatchObject({ valueAtCheck: 2, checkedBy: 'a' });
    const f = await store.createFlag({ attemptId: A1, run: 1, gate: 3, comment: 'c' });
    f.comment = 'mutated';
    expect(store.list().flags[0]!.comment).toBe('c');
    const r = await store.resolveFlag(f.flagId, { note: 'n', resolvedBy: 'j' });
    r.resolution!.note = 'mutated in place';
    r.resolution!.resolvedBy = 'mutated';
    expect(store.list().flags[0]!.resolution).toMatchObject({ note: 'n', resolvedBy: 'j' });
    const again = await store.resolveFlag(f.flagId, {}); // already resolved: unchanged, and again a copy
    again.resolution!.note = 'mutated again';
    expect(store.list().flags[0]!.resolution!.note).toBe('n');
  });

  it('inputs are copied in: mutating the object given to putCheck or createFlag afterwards does not reach the store', async () => {
    const { store } = await open();
    const i = { attemptId: A1, run: 1, gate: 8, valueAtCheck: 2 as number | null, checkedBy: 'a' };
    await store.putCheck(i);
    i.valueAtCheck = 50; i.checkedBy = 'mutated';
    expect(store.list().checks[0]).toMatchObject({ valueAtCheck: 2, checkedBy: 'a' });
  });
});
