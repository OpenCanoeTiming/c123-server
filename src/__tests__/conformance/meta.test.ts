import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorMismatch } from './matcher.js';
import { CoreMissing, corePort } from './core-adapter.js';
import {
  assertClosedKeys, groupUnits, isServerVector, loadExpectedRed, loadVectors, modeFor, registerVectorTests, runVector, serverVectors, testName,
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
  it('vector count and ids: the JSON, CONFORMANCE-VECTORS §1 and the server set agree (94 total, 88 server)', () => {
    const all = loadVectors();
    const doc = readFileSync(resolve(root, 'docs/arch/CONFORMANCE-VECTORS.md'), 'utf8');
    const total = /\*\*(\d+) vectors:/.exec(doc);
    const server = /c123-server runs (\d+)\b/.exec(doc);
    expect(total, 'the document states the vector total').not.toBeNull();
    expect(server, 'the document states the server count').not.toBeNull();
    expect(all.length).toBe(Number(total![1]));
    expect(serverVectors(all).length).toBe(Number(server![1]));
    expect(serverVectors(all).length).toBe(88);
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
    expect(names.length).toBe(88);
    expect(new Set(names).size).toBe(88);
    expect(new Set(names)).toEqual(new Set(loadVectors().filter((v) => v.invariant !== 'live-ingest').map((v) => `vector ${v.id}`)));
    for (const id of LIVE_INGEST) expect(names).not.toContain(`vector ${id}`);
  });

  it('vector count and ids: no afterGivenIndex, in a step or in notifications, falls inside an ingest unit or out of range (§1, R4b)', () => {
    const indices = (expect: Record<string, unknown>): number[] => {
      const n = expect.notifications;
      if (typeof n !== 'object' || n === null) return [];
      return Object.values(n).flatMap((s) => (typeof s === 'object' && s !== null && 'afterGivenIndex' in s ? [(s as { afterGivenIndex: number }).afterGivenIndex] : []));
    };
    let seen = 0;
    for (const v of serverVectors()) {
      if (!Array.isArray(v.given)) continue;
      const n = v.given.length;
      const units = groupUnits(v.given as GivenElement[]);
      const lasts = new Set(units.map((u) => u.start + u.elements.length - 1));
      const all = [
        ...(v.expectSequence ?? []).map((s) => s.afterGivenIndex),
        ...indices(v.expect),
        ...(v.expectSequence ?? []).flatMap((s) => indices(s.expect)),
      ];
      for (const i of all) {
        seen++;
        expect(Number.isInteger(i), `${v.id}: ${i}`).toBe(true);
        expect(i, v.id).toBeGreaterThanOrEqual(-1);
        expect(i, v.id).toBeLessThan(n);
        expect(i === -1 || lasts.has(i), `${v.id}: afterGivenIndex ${i} falls inside a unit`).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('vector count and ids: every vector passes the closed key sets (no assertion outside the read paths)', () => {
    for (const v of serverVectors()) expect(() => assertClosedKeys(v), v.id).not.toThrow();
  });

  it('row 15 vacuity: every expect and every expectSequence step holds a key other than note (review O4)', () => {
    const real = (e: Record<string, unknown>) => Object.keys(e).some((k) => k !== 'note');
    for (const v of serverVectors()) {
      expect(real(v.expect), `${v.id}: expect`).toBe(true);
      (v.expectSequence ?? []).forEach((s, i) => expect(real(s.expect), `${v.id}: step ${i}`).toBe(true));
    }
  });

  it('vector count and ids: the suite files contain no skip, todo, only or filter', () => {
    for (const f of ['vectors.test.ts', 'run-vector.ts']) {
      const src = readFileSync(resolve(here, f), 'utf8');
      expect(src, f).not.toMatch(/\.(skip|todo|only|skipIf|runIf)\b|\b(xit|xdescribe|fit|fdescribe)\(/);
    }
    // the only selection is the live-ingest tag, in one named function
    // The wiring that a child run cannot tell apart while every id is still listed (review O1, edit 4): the ledger
    // must be the file's, not derived from the vectors. The child runs in suite-runs.test.ts cover the rest.
    const wiring = readFileSync(resolve(here, 'vectors.test.ts'), 'utf8');
    expect(wiring).toContain('vectors: serverVectors(),');
    expect(wiring).toContain('expectedRed: loadExpectedRed(),');
    expect(wiring).toContain('strict: isStrict(),');
    expect(wiring).toContain('port: corePort,');
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

  it('expected-red at the start of M1: every id the server runs is listed (88), the core being absent', () => {
    // This test is the ratchet's starting position; it is the one that changes (ids leave) as core issues land.
    expect(loadExpectedRed().length).toBeLessThanOrEqual(88);
    expect([...loadExpectedRed()].sort()).toEqual(serverVectors().map((v) => v.id).sort());
  });

  it('the ledger is read from the file it is given, not from a constant', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    const file = join(dir, 'red.json');
    writeFileSync(file, JSON.stringify(['only-this']));
    expect(loadExpectedRed(file)).toEqual(['only-this']);
    expect(loadExpectedRed()).toEqual(JSON.parse(readFileSync(resolve(here, 'expected-red.json'), 'utf8')));
  });

  it('modes: a listed id runs as it.fails, an unlisted one as a plain it', () => {
    expect(modeFor('a', ['a'], false)).toBe('fails');
    expect(modeFor('b', ['a'], false)).toBe('plain');
  });

  it('VECTORS_STRICT ignores the ledger: every id is a plain it (mode)', () => {
    expect(modeFor('a', ['a'], true)).toBe('plain');
    expect(testName('a')).toBe('vector a');
  });
});

describe('harness can fail (issue #200 row 15)', () => {
  it('a wrong port fails every vector: each of the 88 raises a wrong-answer mismatch, none passes vacuously', () => {
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
