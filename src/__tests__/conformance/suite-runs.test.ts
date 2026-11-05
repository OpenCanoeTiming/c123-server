/**
 * Child-vitest tests (project `tools`, issue #232 split): they run the real `vectors.test.ts`, and the ratchet
 * fixture, as separate vitest processes, so the real wiring is under test (review O1).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serverVectors } from './run-vector.js';

const here = dirname(fileURLToPath(import.meta.url));
// The repo root, or (for a scratch copy) wherever this directory sits.
const root = resolve(here, '../../..');

interface Run {
  exit: number | null;
  results: Array<{ title: string; status: string; message: string }>;
}

function child(config: string, rootDir: string, strict: boolean): Run {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('VITEST') && k !== 'VECTORS_STRICT') env[k] = v;
  if (strict) env.VECTORS_STRICT = '1';
  const r = spawnSync(
    process.execPath,
    [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', config, '--root', rootDir, '--reporter=json'],
    { env, encoding: 'utf8', timeout: 90_000 },
  );
  const json = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))) as {
    testResults: Array<{ assertionResults: Array<{ title: string; status: string; failureMessages?: string[] }> }>;
  };
  const results = json.testResults.flatMap((t) =>
    t.assertionResults.map((a) => ({ title: a.title, status: a.status, message: (a.failureMessages ?? []).join('\n') })),
  );
  return { exit: r.status, results };
}

describe('the real vectors.test.ts in a child vitest (issue #200 rows 1, 2, 5; review O1)', () => {
  const ids = serverVectors().map((v) => `vector ${v.id}`);
  const suite = (strict: boolean) => child(resolve(here, 'fixtures/suite-vitest.config.ts'), root, strict);

  it('normal run: exactly the 87 server vectors, each one reads passed, exit 0', () => {
    const { exit, results } = suite(false);
    expect(results.map((r) => r.title).sort()).toEqual([...ids].sort());
    expect(results.length).toBe(87);
    expect(results.filter((r) => r.status !== 'passed').map((r) => r.title)).toEqual([]);
    expect(exit).toBe(0);
  }, 120_000);

  it('VECTORS_STRICT=1: exactly the 87 titles again, each one failed, exit 1 (the ledger is ignored by the real suite)', () => {
    const { exit, results } = suite(true);
    expect(results.map((r) => r.title).sort()).toEqual([...ids].sort());
    expect(results.filter((r) => r.status !== 'failed').map((r) => r.title)).toEqual([]);
    expect(exit).toBe(1);
    // THIS CLAUSE GOES WHEN THE CORE IS WIRED (M1): while `corePort` is unwired every vector fails for the one
    // reason CoreMissing, which pins today's failure mode (a TypeError in the wiring would read as red too).
    // Once vectors pass, strict mode shows the true state and this assertion is removed with the last listed id.
    expect(results.filter((r) => !/CoreMissing/.test(r.message)).map((r) => r.title)).toEqual([]);
  }, 120_000);
});

describe('the ledger ratchet in a fixture child vitest (issue #200 rows 4, 5)', () => {
  const runFixture = (strict: boolean) => {
    const { exit, results } = child(resolve(here, 'fixtures/ratchet-vitest.config.ts'), resolve(here, 'fixtures'), strict);
    return { exit, status: Object.fromEntries(results.map((r) => [r.title, r.status])) };
  };

  it('a passing vector on the list fails the suite (ledger ratchet, via it.fails)', () => {
    const { exit, status } = runFixture(false);
    expect(status['vector fx-passes']).toBe('failed'); // listed, but passes: goes red, forcing it off the list
    expect(status['vector fx-fails']).toBe('passed'); // listed and failing: reads green
    expect(status['vector fx-unlisted-fails']).toBe('failed'); // not listed: a plain it, red
    expect(exit).toBe(1);
  }, 120_000);

  it('VECTORS_STRICT ignores the ledger: an unpassed vector is red and none reads as passing', () => {
    const { exit, status } = runFixture(true);
    expect(status['vector fx-passes']).toBe('passed');
    expect(status['vector fx-fails']).toBe('failed');
    expect(status['vector fx-unlisted-fails']).toBe('failed');
    expect(exit).toBe(1);
  }, 120_000);
});
