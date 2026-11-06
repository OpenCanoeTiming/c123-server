/**
 * #211 row 10 (tools project): the store over the real filesystem adapter (`createRealChecksFs` in src/adapters/real-io.ts,
 * the production seam beside `createRealXmlFs`) on a temp directory: restart round-trip, and a real child process killed
 * between the temporary file and the rename. No sleep pacing: the child announces the window on stdout and the test kills
 * on that line (a handshake); the test waits on the line and on the exit event, never on a duration.
 * Interfaces: see checks-harness.ts.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openChecksStore } from '../checks.js';
import { createRealChecksFs } from '../../adapters/real-io.js';
import { A1, T0, counterIds, fakeClock } from './checks-harness.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const url = (p: string): string => pathToFileURL(resolve(root, p)).href;

// The child opens the same directory with the real adapter, but its `rename` announces the window and then never returns.
const CHILD = `
import { openChecksStore } from ${JSON.stringify(url('src/store/checks.ts'))};
import { createRealChecksFs } from ${JSON.stringify(url('src/adapters/real-io.ts'))};
const [dir, eventId] = process.argv.slice(2);
const real = createRealChecksFs();
const fs = { ...real, rename: async () => { console.log('in-window'); await new Promise(() => {}); } };
let t = ${T0 + 60_000};
const store = await openChecksStore({ fs, dir, eventId, clock: { now: () => t }, newId: () => 'child-flag' });
console.log('opened');
await store.putCheck({ attemptId: ${JSON.stringify(A1)}, run: 1, gate: 8, valueAtCheck: 0 });
console.log('acknowledged');
`;

function lineWaiter(stream: NodeJS.ReadableStream) {
  const lines: string[] = [];
  const waiting: Array<{ line: string; resolve: () => void }> = [];
  let carry = '';
  stream.on('data', (d: Buffer) => {
    carry += d.toString();
    let i;
    while ((i = carry.indexOf('\n')) >= 0) { lines.push(carry.slice(0, i).trim()); carry = carry.slice(i + 1); }
    for (const w of [...waiting]) if (lines.includes(w.line)) { waiting.splice(waiting.indexOf(w), 1); w.resolve(); }
  });
  return {
    lines,
    until: (line: string): Promise<void> => (lines.includes(line) ? Promise.resolve() : new Promise((res) => { waiting.push({ line, resolve: res }); })),
  };
}

describe('checks store on the real filesystem (TEST-ARCHITECTURE §3.5; row 10)', () => {
  it('§3.5 restart round-trip on a real directory: written, a new store instance (and the same events elsewhere) read back equal', async () => {
    const base = mkdtempSync(join(tmpdir(), 'checks-'));
    try {
      const dir = join(base, 'nested', 'checks'); // the store creates it
      const s1 = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-1', clock: fakeClock(), newId: counterIds() });
      await s1.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2, checkedBy: 'j' });
      await s1.createFlag({ attemptId: A1, run: 1, gate: 7, comment: 'x', suggestedValue: 4 });
      await s1.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 4 }); // replaces over the existing file
      const s2 = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-1', clock: fakeClock(), newId: counterIds() });
      expect(s2.list()).toEqual(s1.list());
      const other = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-2', clock: fakeClock(), newId: counterIds() });
      expect(other.list()).toEqual({ checks: [], flags: [] });
      expect(readdirSync(dir).length).toBe(1); // no temporary file left after good writes (the other event wrote nothing)
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it('§3.5 crash mid-write with a real process: killed between the temporary file and the rename, the previous complete state is read back and a stale temporary file is ignored', async () => {
    const base = mkdtempSync(join(tmpdir(), 'checks-'));
    try {
      const dir = join(base, 'checks');
      const first = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-1', clock: fakeClock(), newId: counterIds() });
      await first.putCheck({ attemptId: A1, run: 1, gate: 7, valueAtCheck: 2 });
      const before = first.list();
      const filesBefore = readdirSync(dir);
      expect(filesBefore.length).toBe(1);

      const script = join(base, 'child.mjs');
      writeFileSync(script, CHILD);
      const child = spawn(process.execPath, ['--import', 'tsx', script, dir, 'event-1'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
      const out = lineWaiter(child.stdout);
      const exited = new Promise<{ code: number | null; signal: string | null }>((res) => { child.on('exit', (code, signal) => { res({ code, signal }); }); });
      const failedEarly = exited.then((e) => { throw new Error(`child exited before the window: ${JSON.stringify(e)}`); });
      failedEarly.catch(() => undefined);
      await Promise.race([out.until('in-window'), failedEarly]);
      child.kill('SIGKILL'); // the temporary file is on disk, the rename has not happened
      const end = await exited;
      expect(end.signal).toBe('SIGKILL');
      expect(out.lines).not.toContain('acknowledged'); // never acknowledged

      const filesAfter = readdirSync(dir);
      expect(filesAfter.length).toBeGreaterThan(filesBefore.length); // a leftover temporary file: the kill really was in the window
      const restarted = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-1', clock: fakeClock(), newId: counterIds() });
      expect(restarted.list()).toEqual(before);
      await restarted.putCheck({ attemptId: A1, run: 1, gate: 9, valueAtCheck: 0 });
      const again = await openChecksStore({ fs: createRealChecksFs(), dir, eventId: 'event-1', clock: fakeClock(), newId: counterIds() });
      expect(again.list().checks.map((c) => c.gate).sort()).toEqual([7, 9]);
    } finally { rmSync(base, { recursive: true, force: true }); }
  }, 60_000);
});
