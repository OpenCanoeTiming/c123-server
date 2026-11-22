/**
 * #273 row 12 (tier 1, real fs): startup on an invalid checks file over a real directory (CONTRACTS §2.10, DERIVATIONS §10 item 33).
 * The production seam is the real adapters (`createRealChecksFs`, `createRealXmlFs`) on a mkdtemp directory under os.tmpdir().
 * Time comes from the injected virtual clock.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import { createRealChecksFs, createRealXmlFs } from '../../adapters/real-io.js';
import { startOnsite, type AdminLogEntry, type OnsiteHandle, type OnsiteOptions } from '../index.js';
import { virtualClock } from './onsite-harness.js';

const dirs: string[] = [];
const handles: OnsiteHandle[] = [];
afterEach(async () => {
  for (const h of handles.splice(0)) { try { await h.stop(); } catch { h.kill(); } }
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});

describe('real filesystem (CONTRACTS §2.10, DERIVATIONS §10 item 33)', () => {
  it('contract §2.10: on a real directory an invalid checks file is renamed aside and the server starts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'onsite-startup-store-'));
    dirs.push(dir);
    const bad = '{"version":1,"checks":[{"attemptId"';
    const original = join(dir, 'checks-ev-real.json');
    await writeFile(original, bad, 'utf8');
    const entries: AdminLogEntry[] = [];
    const opts = {
      port: 0, clock: virtualClock(Date.parse('2026-09-15T10:00:00.000Z')), fs: { ...createRealChecksFs(), ...createRealXmlFs() }, dataDir: dir,
      eventId: 'ev-real', eventName: 'Real', discovery: null, zone: 'Europe/Prague', externalIdScheme: 'on-site',
      adminLog: (e: AdminLogEntry) => { entries.push(e); },
    } as unknown as OnsiteOptions;
    const h = await startOnsite(opts);
    handles.push(h);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'store-set-aside', store: 'checks', eventId: 'ev-real', file: expect.any(String) });
    // the store joins with '/', which Windows accepts; compare the same file, not the spelling
    expect(normalize(entries[0]!.file)).toBe(original);
    const aside = entries[0]!.setAsideAs;
    expect(aside).not.toBe(original);
    expect(await readFile(aside, 'utf8'), 'the set-aside file holds the original bytes').toBe(bad);
    expect((await readdir(dir)).filter((n) => join(dir, n) === original), 'the original name is gone until the first write').toEqual([]);
    expect((await fetch(`http://127.0.0.1:${h.port}/api/events/current`)).status).toBe(200);
  });
});
