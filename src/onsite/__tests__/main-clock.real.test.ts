/**
 * #210 (tools project, round 27b review note 8): `main.ts` without clock flags wires the system clock at rate 1. A real child process, a real TCP
 * server standing in for Canoe123 that sends one recorded on-course listing; the ingest stamp the process gives it (`/api/oncourse` asOf, the unit's
 * ingest time, round 27 Q4) is the system time of receipt, not a time from a recording and not a scaled one.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ODP } from './datasets.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const kids: ChildProcess[] = [];
const servers: Server[] = [];
const dirs: string[] = [];
afterAll(() => { for (const k of kids) k.kill('SIGKILL'); for (const s of servers) s.close(); for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

describe('production clock wiring (CONTRACTS §1.6, TEST-ARCHITECTURE §5)', () => {
  it('main.ts without --clock-rate and --clock-origin stamps ingest with the system clock at rate 1', async () => {
    const listing = ODP.listings(['1'], [31], [51])[0]!.rec.data; // recorded text; its recorded instant (2026) is not what the process may use
    const tcp = createServer((sock) => { sock.write(`${listing}\n`); });
    servers.push(tcp);
    await new Promise<void>((r) => { tcp.listen(0, '127.0.0.1', r); });
    const tcpPort = (tcp.address() as { port: number }).port;
    const dir = mkdtempSync(join(tmpdir(), 'onsite-clock-'));
    dirs.push(dir);
    const proc = spawn(process.execPath, ['--import', 'tsx', join(root, 'src/onsite/main.ts'), '--port', '0', '--data-dir', dir, '--event-id', 'ev-clock',
      '--tcp-host', '127.0.0.1', '--tcp-port', String(tcpPort), '--event-date', ODP.day, '--no-discovery'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
    kids.push(proc);
    const port = await new Promise<number>((res, rej) => {
      let buf = '';
      const t = setTimeout(() => { rej(new Error('no `listening <port>` line')); }, 60_000);
      proc.stdout!.on('data', (d: Buffer) => { buf += d.toString(); const m = /listening (\d+)/.exec(buf); if (m) { clearTimeout(t); res(Number(m[1])); } });
      proc.on('exit', (c) => { clearTimeout(t); rej(new Error(`exited ${String(c)}`)); });
    });
    const before = Date.now();
    let body: { asOf: string | null; attempts: unknown[] } = { asOf: null, attempts: [] };
    for (let i = 0; i < 100 && body.asOf === null; i++) {
      body = (await (await fetch(`http://127.0.0.1:${port}/api/oncourse`)).json()) as typeof body;
      if (body.asOf === null) await new Promise((r) => setTimeout(r, 100));
    }
    expect(body.attempts).toHaveLength(1);
    const stamped = Date.parse(body.asOf!);
    expect(Math.abs(stamped - Date.now())).toBeLessThan(15_000);
    expect(stamped).toBeGreaterThan(before - 15_000);
    expect(new Date(stamped).getUTCFullYear()).toBe(new Date().getUTCFullYear());
  }, 120_000);
});
