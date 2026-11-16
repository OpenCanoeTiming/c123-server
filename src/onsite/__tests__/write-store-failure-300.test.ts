/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #300 rows 1-5 (N1, DA ruling item 18; CONTRACTS §7.3 "Once the socket has accepted the command the write exists", §1.5 "the writes store", §2.9, §2.10).
 * The store's file is made to fail with a failed rename after the socket accepted the command (the injected `fs`, `failWritesStore`), not a kill.
 * Channel: the write path (REST + the writes store); TCP results rows for the echo (row 5).
 * Admin log entry shape (orchestrator's choice): `{ kind: 'store-write-failed', store: 'writes', file, reason }`, one per failed write.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { disposeAll, get, openWs, post, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { FLAGS, GOOD, K, WRITES_FILE, adminLog, closedRun, failWritesStore, restartedAfterKill, write, writesFile } from './write-fixtures-300.js';

afterEach(disposeAll);

const failed = (entries: J[]): J[] => entries.filter((e) => e['kind'] === 'store-write-failed');

/** A closed run, then the first write with the writes store failing: returns everything the tests need, with the preconditions asserted. */
async function failedFirstWrite(): Promise<{ env: Env; log: J[]; ws: Awaited<ReturnType<typeof openWs>>; first: Awaited<ReturnType<typeof write>>; store: ReturnType<typeof failWritesStore>; before: { diag: J; sources: J } }> {
  const a = adminLog();
  const env = await closedRun({ extra: a.opts });
  const ws = await openWs(env);
  await ws.barrier(); ws.take();
  const before = { diag: (await get(env, '/api/diagnostics')).body, sources: (await get(env, '/api/sources')).body };
  const logged = a.entries.length;
  const store = failWritesStore(env);
  const first = await write(env, GOOD, 'k1');
  await ws.barrier();
  expect(env.tcp.written.length, 'precondition: the socket accepted the command exactly once').toBe(1);
  expect(store.failures, 'precondition: the injected store failure was hit').toBeGreaterThanOrEqual(1);
  expect(a.entries.length >= logged, 'log is append only').toBe(true);
  return { env, log: a.entries, ws, first, store, before };
}

describe('row 1 (N1 i): the socket accepted the command, the creating step\'s store write fails (CONTRACTS §7.3, §2.9)', () => {
  it('ruling 18 / contract §7.3: 202 with the WriteRequest and Location, attempt.updated and write.updated pushed adjacently, one admin log entry (store-write-failed, store writes, file), nothing in diagnostics or sources', async () => {
    const { env, log, ws, first, before } = await failedFirstWrite();
    expect(first.status, 'no 500: the write exists once the socket accepted the command').toBe(202);
    expect(first.body).toMatchObject({ target: { phaseId: ODP.phaseId, bib: '56', run: 1 }, requestedValue: GOOD, status: 'pending' });
    expect(first.headers.get('location')).toBe(`/api/writes/${first.body.writeId as string}`);
    const msgs = ws.take();
    const at = msgs.findIndex((m) => m.type === 'attempt.updated' && m.attemptId === ODP.attemptId && m.fields?.gates?.source === 'operator-write');
    expect(at, 'the optimistic value is pushed').toBeGreaterThanOrEqual(0);
    const wu = msgs.findIndex((m) => m.type === 'write.updated' && m.write?.writeId === first.body.writeId);
    expect(wu, 'the WriteRequest is pushed').toBeGreaterThanOrEqual(0);
    expect(msgs[wu]!.seq - msgs[at]!.seq, 'one unit: adjacent seqs').toBe(1);
    expect(msgs.filter((m) => m.type === 'diagnostics.updated' || m.type === 'sources.updated'), 'nothing on the wire about the store').toEqual([]);
    expect((await get(env, '/api/diagnostics')).body.diagnostics, 'GET /api/diagnostics unchanged').toEqual(before.diag.diagnostics);
    expect((await get(env, '/api/sources')).body, 'GET /api/sources unchanged').toEqual(before.sources);
    const entries = failed(log);
    expect(entries, 'exactly one admin log entry per failed write').toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'store-write-failed', store: 'writes', file: WRITES_FILE });
    expect(typeof entries[0]!['reason']).toBe('string');
    expect(entries[0]!['reason'].length).toBeGreaterThan(0);
  });
});

describe('row 2 (N1 ii): a same-key retry in that lifetime (CONTRACTS §1.5, §7.3)', () => {
  it('ruling 18 / contract §1.5: the key stays bound in memory: 200 with the same WriteRequest, still one command on the socket, GET /api/writes/{id} serves it', async () => {
    const { env, first } = await failedFirstWrite();
    expect(first.status, 'precondition: the first write was admitted (202)').toBe(202);
    const again = await write(env, GOOD, 'k1');
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(env.tcp.written, 'never a second command upstream').toHaveLength(1);
    const g = await get(env, `/api/writes/${first.body.writeId as string}`);
    expect(g.status).toBe(200);
    expect(g.body).toEqual(first.body);
  });
});

describe('row 3 (N1 iii): the next successful write of the writes store persists what memory alone holds (ruling 18; §1.5: the file is the store\'s whole state)', () => {
  /** After the failure the store recovers; `later` is any later store write; then a kill and a restart over the durable files. */
  async function recovered(later: (env: Env) => Promise<void>): Promise<{ env2: Env; first: J; firstFile: ReturnType<typeof writesFile> }> {
    const { env, first, store } = await failedFirstWrite();
    expect(first.status, 'precondition: the first write was admitted (202)').toBe(202);
    expect(JSON.stringify(writesFile(env) ?? {}), 'precondition: the file does not hold the first write yet').not.toContain(first.body.writeId);
    store.stop();
    await later(env);
    const firstFile = writesFile(env);
    const env2 = await restartedAfterKill(env);
    return { env2, first: first.body, firstFile };
  }
  const checks = async (env2: Env, first: J, file: ReturnType<typeof writesFile>): Promise<void> => {
    expect(file?.writes.map((w) => w['writeId']), 'the file written by the later write holds the first write').toContain(first['writeId']);
    const g = await get(env2, `/api/writes/${first['writeId'] as string}`);
    expect(g.status, 'GET /api/writes/{id} serves the first write after the restart').toBe(200);
    expect(g.body).toEqual(first);
    expect(g.body.status, 'a pending write resumes pending').toBe('pending');
    const again = await write(env2, GOOD, 'k1');
    expect(again.status, 'its key still answers 200').toBe(200);
    expect(again.body).toEqual(first);
    expect(env2.tcp.written, 'no second command after the restart').toEqual([]);
    await feed(env2, ODP.echo(50, env2.clock.now() + 1000));
    expect((await get(env2, `/api/writes/${first['writeId'] as string}`)).body.status, 'the resumed write waits for its echo and is confirmed by it').toBe('confirmed');
  };

  it('ruling 18 (a): a second penalty write (another gate, another key) succeeds: after a restart the first write, its key and its pending resume are there', async () => {
    const { env2, first, firstFile } = await recovered(async (env) => {
      const second = await write(env, { gate: 5, value: 2 }, 'k2');
      expect(second.status, 'precondition: the second write is accepted and its store write succeeds').toBe(202);
    });
    await checks(env2, first, firstFile);
  });

  it('ruling 18 (b): a flag creation (its key binding shares the file) succeeds: after a restart the first write, its key and its pending resume are there', async () => {
    const { env2, first, firstFile } = await recovered(async (env) => {
      const f = await post(env, FLAGS, { gate: 5, comment: 'touched?' }, K('f1'));
      expect(f.status, 'precondition: the flag is created').toBe(201);
    });
    await checks(env2, first, firstFile);
  });
});

describe('row 4 (N1 iv): a restart before any later store write (DA ruling item 2 / DERIVATIONS §10 item 44 (a): the pinned residual)', () => {
  it('ruling 18 + item 44 (a): the first write is unknown after the restart, a same-key retry is 202 and a new write with a new command', async () => {
    const { env, first } = await failedFirstWrite();
    expect(first.status, 'precondition: the first write was admitted (202)').toBe(202);
    expect(JSON.stringify(writesFile(env) ?? {}), 'precondition: nothing of it is durable').not.toContain(first.body.writeId);
    const env2 = await restartedAfterKill(env);
    const g = await get(env2, `/api/writes/${first.body.writeId as string}`);
    expect(g.status).toBe(404);
    expect(g.body.error.code).toBe('write-not-found');
    const retry = await write(env2, GOOD, 'k1');
    expect(retry.status, 'a new request: the key was lost').toBe(202);
    expect(retry.body.writeId).not.toBe(first.body.writeId);
    expect(env2.tcp.written, 'the restated command goes upstream again').toHaveLength(1);
  });
});

describe('row 5 (N1 v): the echo arrives while the record is memory-only (ruling 18; §1.5 the file is written whole)', () => {
  it('ruling 18 / DERIVATIONS §6: the store write of the confirmed status succeeds: the file holds the write as confirmed, with its key', async () => {
    const { env, first, store } = await failedFirstWrite();
    expect(first.status, 'precondition: the first write was admitted (202)').toBe(202);
    expect(JSON.stringify(writesFile(env) ?? {}), 'precondition: the record is memory-only').not.toContain(first.body.writeId);
    store.stop();
    await feed(env, ODP.echo(50, env.clock.now() + 1000));
    expect((await get(env, `/api/writes/${first.body.writeId as string}`)).body.status, 'precondition: the echo confirmed it').toBe('confirmed');
    const file = writesFile(env);
    const stored = file?.writes.find((w) => w['writeId'] === first.body.writeId);
    expect(stored, 'the file holds the write').toBeDefined();
    expect(stored!['status']).toBe('confirmed');
    expect(file!.writeKeys['k1']?.['id'], 'with its key').toBe(first.body.writeId);
  });
});
