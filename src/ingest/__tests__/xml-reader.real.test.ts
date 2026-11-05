/**
 * #202 row 12 (tools project): a real child process rewrites a real recorded XML non-atomically (truncate, then
 * chunks) while the real reader, built on the real adapters (`createRealClock`, `createRealXmlFs`), polls fast.
 * No sleep pacing: the writer and the test wait on each other through a stdin/stdout handshake, and the test waits
 * on conditions (the reader having seen a torn file; the expected unit having arrived), never on a duration.
 * Interfaces: see xml-reader-harness.ts.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createXmlReader } from '../xml-reader.js';
import { createRealClock, createRealXmlFs } from '../../adapters/real-io.js';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture } from './helpers.js';
import { phaseIds } from './xml-reader-harness.js';

const NAMES = ['slalom.xml', 'cross.xml', 'cross-untimed.xml'];

// Protocol, one line each way. Parent "torn <v>" -> child truncates the target and writes the first part of version v,
// answers "torn". Parent "finish" -> child writes the rest and closes, answers "done". Parent "quit" -> exit.
const WRITER = `
import { openSync, writeSync, closeSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
const [target, dir] = process.argv.slice(2);
let fd = -1, buf = null, at = 0;
const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const [cmd, v] = line.split(' ');
  if (cmd === 'torn') {
    buf = readFileSync(dir + '/v' + v + '.xml');
    fd = openSync(target, 'w');                 // truncates
    at = Math.floor(buf.length / 3);
    writeSync(fd, buf, 0, at);
    console.log('torn');
  } else if (cmd === 'finish') {
    writeSync(fd, buf, at, buf.length - at);
    closeSync(fd);
    console.log('done');
  } else if (cmd === 'quit') { process.exit(0); }
});
`;

async function waitFor(cond: () => boolean, what: string, ms = 20_000): Promise<void> {
  const until = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 2));
  }
}

describe('XML reader: real torn reads (DERIVATIONS §0.3)', () => {
  it('§0.3 torn writes on a real file: no unit from a torn file, every whole version eventually read, the torn count reported', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'xml-reader-'));
    try {
      NAMES.forEach((n, i) => writeFileSync(join(dir, `v${i}.xml`), xmlFixture(n)));
      const target = join(dir, 'event.xml');
      writeFileSync(target, xmlFixture(NAMES[0]!));
      writeFileSync(join(dir, 'writer.mjs'), WRITER);

      const units: Array<Array<Record<string, any>>> = [];
      const statuses: Array<Record<string, any>> = [];
      const reader = createXmlReader({
        path: target, pollIntervalSeconds: 0.01, clock: createRealClock(), fs: createRealXmlFs(), ctx: ctx(),
        onUnit: (els: Array<Record<string, any>>) => { units.push(els); },
        onStatus: (s: Record<string, any>) => { statuses.push(s); },
      });
      const torn = () => (statuses[statuses.length - 1]?.tornReads as number | undefined) ?? 0;

      const child = spawn(process.execPath, [join(dir, 'writer.mjs'), target, dir], { stdio: ['pipe', 'pipe', 'inherit'] });
      const lines: string[] = [];
      let carry = '';
      child.stdout.on('data', (d: Buffer) => {
        carry += d.toString();
        let i;
        while ((i = carry.indexOf('\n')) >= 0) { lines.push(carry.slice(0, i).trim()); carry = carry.slice(i + 1); }
      });
      let said = 0;
      const say = async (cmd: string, expectReply: string) => {
        child.stdin.write(cmd + '\n');
        await waitFor(() => lines.length > said, `writer reply to "${cmd}"`);
        expect(lines[said++]).toBe(expectReply);
      };

      try {
        reader.start();
        await waitFor(() => units.length === 1, 'the initial version');

        const rounds = 9;
        for (let r = 1; r <= rounds; r++) {
          const v = r % 3;
          const tornBefore = torn();
          const unitsBefore = units.length;
          await say(`torn ${v}`, 'torn');
          // the file is torn on disk until we say otherwise: wait for the reader to have read it and refused it
          await waitFor(() => torn() > tornBefore, `the reader to refuse the torn version ${r}`);
          expect(units.length).toBe(unitsBefore); // nothing emitted from a torn file
          await say('finish', 'done');
          await waitFor(() => units.length > unitsBefore, `the whole version ${r} to be read`);
        }
        child.stdin.write('quit\n');
      } finally {
        reader.stop();
        child.kill();
      }

      const sig = (ids: string[]) => [...ids].sort().join('|');
      const whole = new Map(NAMES.map((n) => [sig(phaseIds(parseXmlSnapshot(xmlFixture(n), ctx()) as Array<Record<string, any>>)), n]));
      expect(whole.size).toBe(NAMES.length); // the versions are distinguishable by their races
      const seen: string[] = [];
      for (const u of units) {
        expect(u.some((e) => e.unparseable)).toBe(false);
        expect(u[0]!.event).toBe('xml-rewrite-detected');
        const name = whole.get(sig(phaseIds(u)));
        expect(name, 'every unit is exactly one whole recorded version').toBeDefined();
        seen.push(name!);
      }
      // one unit per version written, in order: 0 (initial), then 1,2,0,1,2,0,1,2,0
      expect(seen).toEqual([0, ...Array.from({ length: 9 }, (_, i) => (i + 1) % 3)].map((i) => NAMES[i]));
      expect(torn()).toBeGreaterThanOrEqual(9);
      expect(readFileSync(target, 'utf8')).toBe(xmlFixture(NAMES[0]!));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
