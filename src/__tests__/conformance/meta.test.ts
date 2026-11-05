import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorMismatch } from './matcher.js';
import { CoreMissing, corePort } from './core-adapter.js';
import {
  groupUnits, isServerVector, loadExpectedRed, loadVectors, modeFor, registerVectorTests, runVector, serverVectors, testName,
  type ItLike, type Vector,
} from './run-vector.js';
import { wrongPort } from './test-ports.js';
import type { GivenElement } from './port.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

/** The six `live-ingest` vectors live-mini-server runs (CONFORMANCE-VECTORS §1, round 14). Named, not counted. */
const LIVE_INGEST = [
  'live-explicit-not-yet-resets-field',
  'live-bare-value-wrapped-as-bridge',
  'live-attempt-deleted',
  'live-oncourse-set-replaced-whole',
  'live-running-then-finished-latest-wins',
  'live-classification-rows-replaced-whole',
];

describe('vector count and ids (issue #200 rows 1, 2)', () => {
  it('vector count and ids: the JSON, CONFORMANCE-VECTORS §1 and the server set agree (93 total, 87 server)', () => {
    const all = loadVectors();
    const doc = readFileSync(resolve(root, 'docs/arch/CONFORMANCE-VECTORS.md'), 'utf8');
    const total = /\*\*(\d+) vectors:/.exec(doc);
    const server = /c123-server runs (\d+)\b/.exec(doc);
    expect(total, 'the document states the vector total').not.toBeNull();
    expect(server, 'the document states the server count').not.toBeNull();
    expect(all.length).toBe(Number(total![1]));
    expect(serverVectors(all).length).toBe(Number(server![1]));
    expect(serverVectors(all).length).toBe(87);
    expect(new Set(all.map((v) => v.id)).size).toBe(all.length);
  });

  it('vector count and ids: the server runs every vector not tagged live-ingest, and the six excluded are exactly the named ones', () => {
    const all = loadVectors();
    const excluded = all.filter((v) => !isServerVector(v)).map((v) => v.id).sort();
    expect(excluded).toEqual([...LIVE_INGEST].sort());
    expect(all.filter((v) => v.invariant === 'live-ingest').length).toBe(6);
    // each of the six also carries context.tier 'live' (§1), and no other vector is excluded for any other reason
    for (const v of all.filter((x) => x.invariant === 'live-ingest')) expect(v.context?.tier, v.id).toBe('live');
    expect(serverVectors(all).map((v) => v.id).sort()).toEqual(all.map((v) => v.id).filter((i) => !LIVE_INGEST.includes(i)).sort());
  });

  it('vector count and ids: one generated test per server vector, named "vector <id>", none dropped, none extra', () => {
    const names: string[] = [];
    const collect: ItLike = Object.assign((name: string) => void names.push(name), { fails: (name: string) => void names.push(name) });
    registerVectorTests({ vectors: serverVectors(), port: corePort, expectedRed: loadExpectedRed(), strict: false, it: collect });
    expect(names.length).toBe(87);
    expect(new Set(names).size).toBe(87);
    expect(new Set(names)).toEqual(new Set(loadVectors().filter((v) => v.invariant !== 'live-ingest').map((v) => `vector ${v.id}`)));
    for (const id of LIVE_INGEST) expect(names).not.toContain(`vector ${id}`);
  });

  it('vector count and ids: no afterGivenIndex falls inside an ingest unit and none is out of range (§1, round 12 R4b)', () => {
    for (const v of serverVectors()) {
      if (!Array.isArray(v.given)) continue;
      const n = v.given.length;
      const units = groupUnits(v.given as GivenElement[]);
      for (const s of v.expectSequence ?? []) {
        expect(s.afterGivenIndex, v.id).toBeGreaterThanOrEqual(-1);
        expect(s.afterGivenIndex, v.id).toBeLessThan(n);
        const inside = units.find((u) => u.start < s.afterGivenIndex + 1 && s.afterGivenIndex < u.start + u.elements.length - 1);
        expect(inside, `${v.id}: afterGivenIndex ${s.afterGivenIndex} falls inside a unit`).toBeUndefined();
      }
    }
  });

  it('vector count and ids: the suite files contain no skip, todo, only or filter', () => {
    for (const f of ['vectors.test.ts', 'run-vector.ts']) {
      const src = readFileSync(resolve(here, f), 'utf8');
      expect(src, f).not.toMatch(/\.(skip|todo|only|skipIf|runIf)\b|\b(xit|xdescribe|fit|fdescribe)\(/);
    }
    // the only selection is the live-ingest tag, in one named function
    expect(readFileSync(resolve(here, 'vectors.test.ts'), 'utf8')).toContain('serverVectors()');
  });
});

describe('expected-red ledger and modes (issue #200 rows 3, 4, 5)', () => {
  it('expected-red lists only real ids: every listed id is a server vector, no duplicates', () => {
    const listed = loadExpectedRed();
    const real = new Set(serverVectors().map((v) => v.id));
    expect(new Set(listed).size).toBe(listed.length);
    for (const id of listed) expect(real.has(id), `${id} is not a server vector id`).toBe(true);
    for (const id of LIVE_INGEST) expect(listed).not.toContain(id);
  });

  it('expected-red at the start of M1: every id the server runs is listed (87), the core being absent', () => {
    // This test is the ratchet's starting position; it is the one that changes (ids leave) as core issues land.
    expect(loadExpectedRed().length).toBeLessThanOrEqual(87);
    expect([...loadExpectedRed()].sort()).toEqual(serverVectors().map((v) => v.id).sort());
  });

  it('modes: a listed id runs as it.fails, an unlisted one as a plain it', () => {
    expect(modeFor('a', ['a'], false)).toBe('fails');
    expect(modeFor('b', ['a'], false)).toBe('plain');
  });

  it('VECTORS_STRICT ignores the ledger: every id is a plain it (mode)', () => {
    expect(modeFor('a', ['a'], true)).toBe('plain');
    expect(testName('a')).toBe('vector a');
  });

  // The ratchet itself is vitest's `it.fails`; proving that the registration wires it, and that it bites, takes
  // one small child run of a fixture that uses the real registration code (issue #200 "Test plan" rows 4, 5).
  const runFixture = (strict: boolean) => {
    const env: NodeJS.ProcessEnv = {};
    for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('VITEST') && k !== 'VECTORS_STRICT') env[k] = v;
    if (strict) env.VECTORS_STRICT = '1';
    const r = spawnSync(
      process.execPath,
      [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', resolve(here, 'fixtures/ratchet-vitest.config.ts'), '--root', resolve(here, 'fixtures'), '--reporter=json'],
      { env, encoding: 'utf8', timeout: 90_000 },
    );
    const out = r.stdout.slice(r.stdout.indexOf('{'));
    const json = JSON.parse(out) as { testResults: Array<{ assertionResults: Array<{ title: string; status: string }> }> };
    const status: Record<string, string> = {};
    for (const t of json.testResults) for (const a of t.assertionResults) status[a.title] = a.status;
    return { exit: r.status, status };
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
    expect(status['vector fx-passes']).toBe('passed'); // really passes
    expect(status['vector fx-fails']).toBe('failed'); // really fails, though listed
    expect(status['vector fx-unlisted-fails']).toBe('failed');
    expect(exit).toBe(1);
  }, 120_000);
});

describe('harness can fail (issue #200 row 15)', () => {
  it('a wrong port fails every vector: each of the 87 raises a wrong-answer mismatch, none passes vacuously', () => {
    const port = wrongPort();
    const passed: string[] = [];
    const crashed: string[] = [];
    for (const v of serverVectors()) {
      try {
        runVector(v, port);
        passed.push(v.id);
      } catch (e) {
        if (!(e instanceof VectorMismatch)) crashed.push(`${v.id}: ${(e as Error).message}`);
      }
    }
    expect(passed, 'vectors that a wrong port passes (they assert nothing)').toEqual([]);
    expect(crashed, 'failed for a reason other than a wrong answer').toEqual([]);
  });

  it('a wrong port also fails when it answers with nothing at all (empty answers)', () => {
    const empty = {
      createMergePort: () => ({
        applyUnit() {}, presented: () => ({}), entry: () => ({}), phase: () => ({}), attempts: () => [], oncourse: () => ({ attemptIds: [] }),
        diagnostics: () => [], writeRequest: () => undefined, notifications: () => [],
      }),
      assembleStanding: () => ({ standing: [], anomalies: [] }),
      gateStatus: () => ({ gateStatus: {} }),
    };
    const vacuous = serverVectors().filter((v: Vector) => {
      try { runVector(v, empty); return true; } catch { return false; }
    });
    // Only vectors that expect nothing to happen may pass an empty port; each must be named and justified here.
    expect(vacuous.map((v) => v.id)).toEqual([]);
  });
});

describe('core-adapter contract (issue #200 row 13, "Seam")', () => {
  it('until the core exists every entry point throws CoreMissing (the one reason every vector is red)', () => {
    expect(() => corePort.createMergePort({ attemptId: 'x', xmlPollIntervalSeconds: 5 })).toThrow(CoreMissing);
    expect(() => corePort.assembleStanding({ entries: [] }, { kind: 'phase', phaseId: 'p' })).toThrow(CoreMissing);
    expect(() => corePort.gateStatus({ checks: [], flags: [], presented: {} })).toThrow(CoreMissing);
  });
});
