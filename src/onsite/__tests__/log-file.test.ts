/**
 * #395 (tier 1, real fs): the on-site log file in the data dir, rotated by size, on a mkdtemp directory under os.tmpdir().
 * Time comes from the injected virtual clock (TEST-ARCHITECTURE §5).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRealChecksFs, createRealXmlFs } from '../../adapters/real-io.js';
import { startOnsite, type OnsiteHandle, type OnsiteOptions } from '../index.js';
import { createLogFile } from '../log-file.js';
import { fakeTcp, flush, virtualClock } from './onsite-harness.js';

const dirs: string[] = [];
const handles: OnsiteHandle[] = [];
afterEach(async () => {
  for (const h of handles.splice(0)) { try { await h.stop(); } catch { h.kill(); } }
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});
const tmp = async (): Promise<string> => { const d = await mkdtemp(join(tmpdir(), 'onsite-log-')); dirs.push(d); return d; };
const START = Date.parse('2026-09-15T10:00:00.000Z');

describe('log file (#395)', () => {
  it('issue #395: every line carries the timestamp of the injected clock', async () => {
    const dir = await tmp();
    const clock = virtualClock(START);
    const log = createLogFile({ dir, clock });
    log.write('hello');
    clock.jump(START + 1500);
    log.write('again');
    expect(log.path).toBe(join(dir, 'onsite.log'));
    expect((await readFile(log.path, 'utf8')).split('\n')).toEqual(['2026-09-15T10:00:00.000Z hello', '2026-09-15T10:00:01.500Z again', '']);
  });

  it('issue #395: rotation by size keeps the newest lines, and the last-lines read spans the rotation', async () => {
    const dir = await tmp();
    const log = createLogFile({ dir, clock: virtualClock(START), maxBytes: 600 });
    for (let i = 1; i <= 100; i++) log.write(`line ${String(i).padStart(3, '0')}`);
    const names = (await readdir(dir)).sort();
    expect(names).toEqual(['onsite.log', 'onsite.log.1']);
    for (const n of names) expect((await readFile(join(dir, n), 'utf8')).length, `${n} stays near the limit`).toBeLessThanOrEqual(600);
    const last = log.tail(500);
    expect(last.length).toBeLessThan(100);
    expect(last.at(-1)).toMatch(/ line 100$/);
    const nums = last.map((l) => Number(/line (\d+)$/.exec(l)![1]));
    expect(nums, 'consecutive, newest last, none missing between the oldest kept and the newest').toEqual(nums.map((_, i) => nums[0]! + i));
    expect(nums[0]!).toBeGreaterThan(50);
    expect(log.tail(3).map((l) => l.slice(25))).toEqual(['line 098', 'line 099', 'line 100']);
  });

  it('issue #395: a restart appends to the existing file and reads its lines back', async () => {
    const dir = await tmp();
    createLogFile({ dir, clock: virtualClock(START) }).write('first run');
    const again = createLogFile({ dir, clock: virtualClock(START + 1000) });
    again.write('second run');
    expect(again.tail(10).map((l) => l.slice(25))).toEqual(['first run', 'second run']);
  });

  it('issue #395: start, store set aside, source connect and disconnect, and stop go to the file; GET /api/logs returns the last lines', async () => {
    const dir = await tmp();
    await (await import('node:fs/promises')).writeFile(join(dir, 'checks-ev-log.json'), '{"version":1,"checks":[{"attemptId"', 'utf8');
    const clock = virtualClock(START);
    const tcp = fakeTcp();
    const logFile = createLogFile({ dir, clock });
    const opts = {
      port: 0, clock, fs: { ...createRealChecksFs(), ...createRealXmlFs() }, dataDir: dir, eventId: 'ev-log', eventName: 'Log',
      tcp: { source: tcp }, discovery: null, zone: 'Europe/Prague', externalIdScheme: 'on-site', logFile,
    } as unknown as OnsiteOptions;
    const h = await startOnsite(opts);
    handles.push(h);
    tcp.connect();
    await flush();
    clock.jump(START + 5000);
    tcp.disconnect();
    await flush();
    const body = (await (await fetch(`http://127.0.0.1:${h.port}/api/logs?limit=100`)).json()) as { lines: string[] };
    const text = body.lines.join('\n');
    expect(text).toMatch(/^2026-09-15T10:00:00.000Z .*start/m);
    expect(text).toMatch(/store-set-aside store=checks event=ev-log file=\S*checks-ev-log\.json/);
    expect(text).toMatch(/^2026-09-15T10:00:00.000Z .*tcp connected/m);
    expect(text).toMatch(/^2026-09-15T10:00:05.000Z .*tcp disconnected/m);
    const two = (await (await fetch(`http://127.0.0.1:${h.port}/api/logs?limit=2`)).json()) as { lines: string[] };
    expect(two.lines).toEqual(body.lines.slice(-2));
    await h.stop();
    handles.length = 0;
    expect(logFile.tail(1)[0]).toMatch(/ stop$/);
  });
});
