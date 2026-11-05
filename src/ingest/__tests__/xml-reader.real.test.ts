/**
 * #202 row 12 (tools project): a real child process rewrites a real recorded XML non-atomically
 * (truncate, then chunks) while the real reader polls fast. Real timers and real files by design.
 * `../xml-reader.js` does not exist yet: a missing import is the right red. Interfaces: see xml-reader-harness.ts.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createXmlReader } from '../xml-reader.js';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture } from './helpers.js';
import { phaseIds } from './xml-reader-harness.js';

const NAMES = ['slalom.xml', 'cross.xml', 'cross-untimed.xml'];
const WRITER = `
import { openSync, writeSync, closeSync, readFileSync } from 'node:fs';
const [target, dir, rounds] = process.argv.slice(2);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
for (let r = 1; r <= Number(rounds); r++) {
  const buf = readFileSync(dir + '/v' + (r % 3) + '.xml');
  const fd = openSync(target, 'w');            // truncates
  const n = 5, size = Math.ceil(buf.length / n);
  for (let i = 0; i < n; i++) { writeSync(fd, buf, i * size, Math.min(size, buf.length - i * size)); sleep(25); }
  closeSync(fd);
  sleep(200);                                   // the whole version stays put long enough to be polled
}
`;

describe('XML reader: real torn reads (DERIVATIONS §0.3)', () => {
  it('§0.3 torn writes on a real file: no unit from a torn file, every whole version eventually read, the torn count reported', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xml-reader-'));
    NAMES.forEach((n, i) => writeFileSync(join(dir, `v${i}.xml`), xmlFixture(n)));
    const target = join(dir, 'event.xml');
    writeFileSync(target, xmlFixture(NAMES[0]!));
    writeFileSync(join(dir, 'writer.mjs'), WRITER);

    const units: Array<Array<Record<string, any>>> = [];
    const statuses: Array<Record<string, any>> = [];
    const clock = {
      now: () => Date.now(),
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      clearTimeout: (h: any) => clearTimeout(h),
      requestFrame: (fn: (t: number) => void) => setTimeout(() => fn(Date.now()), 16),
      cancelFrame: (h: any) => clearTimeout(h),
    };
    const reader = createXmlReader({
      path: target, pollIntervalSeconds: 0.01, clock,
      fs: { stat: async (p: string) => { const s = await stat(p); return { mtimeMs: s.mtimeMs, size: s.size }; }, read: (p: string) => readFile(p, 'utf8') },
      ctx: ctx(),
      onUnit: (els: Array<Record<string, any>>) => { units.push(els); },
      onStatus: (s: Record<string, any>) => { statuses.push(s); },
    });
    reader.start();

    const rounds = 9;
    await new Promise<void>((res, rej) => {
      const c = spawn(process.execPath, [join(dir, 'writer.mjs'), target, dir, String(rounds)], { stdio: 'inherit' });
      c.on('exit', (code) => (code === 0 ? res() : rej(new Error(`writer exit ${code}`))));
      c.on('error', rej);
    });
    await new Promise((r) => setTimeout(r, 400));
    reader.stop();

    const sig = (ids: string[]) => [...ids].sort().join('|');
    const whole = new Map(NAMES.map((n) => [sig(phaseIds(parseXmlSnapshot(xmlFixture(n), ctx()) as Array<Record<string, any>>)), n]));
    expect(whole.size).toBe(NAMES.length); // the versions are distinguishable by their races
    const seen = new Set<string>();
    for (const u of units) {
      expect(u.some((e) => e.unparseable)).toBe(false);
      expect(u[0]!.event).toBe('xml-rewrite-detected');
      const name = whole.get(sig(phaseIds(u)));
      expect(name, 'every unit is exactly one whole recorded version').toBeDefined();
      seen.add(name!);
    }
    expect([...seen].sort()).toEqual([...NAMES].sort());
    // the last write was version rounds % 3
    expect(whole.get(sig(phaseIds(units[units.length - 1]!)))).toBe(NAMES[rounds % 3]);
    expect(units.length).toBeGreaterThanOrEqual(rounds);
    const last = statuses[statuses.length - 1]!;
    expect(last.tornReads).toBeGreaterThan(0);
    expect(readFileSync(target, 'utf8')).toBe(xmlFixture(NAMES[rounds % 3]!));
  }, 60_000);
});
