/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #212 row 12 (tier 4, tools project; TEST-ARCHITECTURE §3.4): the on-site process against `player.js`, fed the recorded nkz-19so stream: a penalty write on an Attempt that
 * has left the on-course set gives 202 and `write.updated{pending}` on `/ws`, and the correction command reaches the player's TCP side byte-exact.
 *
 * READ FIRST (reported, not stubbed): player.js does NOT expose inbound bytes. Its TCP receiver is `socket.on('data', () => {})` (tools/player.js, "Accept incoming data
 * (commands from c123-server) but ignore"), `/status` carries no inbound counter, and UDP:27334 is "not emulated by player". The real player is therefore used unchanged,
 * and the bytes are observed by a transparent recording proxy placed on the TCP path between the process and the player (it forwards every byte both ways and keeps what the
 * process sent). That proves what leaves the process on its socket to the player; it cannot prove what the player's receiver did with them. A realistic echo waits for
 * c123-protocol-docs#19 and is not part of this issue.
 *
 * The excerpt is nkz-19so C1M_BR1_19 bib 7 (a recorded run 10:46:59, finish 10:48:37, closure 20 s later) cut with tools/extract-excerpt.js; the process runs on the
 * player's clock exactly as in onsite-process.test.ts (--clock-rate, --clock-origin, --clock-wait-stdin, player --start-paused).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PD = '/workspace/timing/c123-protocol-docs';
const REC = path.join(PD, 'recordings/.cache/2026-09-19-2026-nkz-19so');
const PLAYER = path.join(PD, 'tools/player.js');
const EXTRACT = path.join(PD, 'tools/extract-excerpt.js');
const HAVE = [REC, PLAYER, EXTRACT].every((p) => existsSync(p));
const FROM = '2026-09-19T10:46:30.000Z';
const TO = '2026-09-19T10:49:40.000Z';
const PHASE = 'C1M_BR1_19';
const BIB = '7';

const dirs: string[] = [];
const children: ChildProcess[] = [];
const servers: Server[] = [];
const sockets: Socket[] = [];
afterAll(() => {
  for (const c of children) { try { c.kill('SIGKILL'); } catch { /* gone */ } }
  for (const s of sockets) s.destroy();
  for (const s of servers) s.close();
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'onsite-write-')); dirs.push(d); return d; };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const freePort = (): Promise<number> => new Promise((res, rej) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => { res(p); }); }); s.on('error', rej); });

function globalMs(iso: string): number {
  const m = JSON.parse(readFileSync(path.join(REC, 'manifest.json'), 'utf8')) as { chunks: { startTime: string; endTime: string; startOffset: number }[] };
  const t = Date.parse(iso);
  const c = m.chunks.find((k) => Date.parse(k.startTime) <= t && t <= Date.parse(k.endTime));
  if (c === undefined) throw new Error(`no chunk holds ${iso}`);
  return c.startOffset + (t - Date.parse(c.startTime));
}
function firstInstant(dir: string): string {
  const m = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as { chunks: { file: string }[] };
  for (const c of m.chunks) {
    const lines = readFileSync(path.join(dir, c.file), 'utf8').split('\n');
    const base = Date.parse((JSON.parse(lines[0]!) as { _meta: { startTime: string } })._meta.startTime);
    for (const l of lines.slice(1)) {
      if (!l.includes('"src":"tcp"') && !l.includes('"type":"XmlSnapshot"')) continue;
      return new Date(base + (JSON.parse(l) as { ts: number }).ts).toISOString();
    }
  }
  throw new Error('the excerpt holds no tcp or xml record');
}

/** A transparent TCP proxy: forwards both ways and keeps what the client (the process) sent towards the server (the player). */
async function recordingProxy(target: number): Promise<{ port: number; toPlayer: () => string }> {
  const chunks: Buffer[] = [];
  const server = createServer((client) => {
    sockets.push(client);
    const up = connect(target, '127.0.0.1');
    sockets.push(up);
    client.on('data', (d) => { chunks.push(Buffer.from(d)); up.write(d); });
    up.on('data', (d) => client.write(d));
    client.on('close', () => up.destroy());
    up.on('close', () => client.destroy());
    client.on('error', () => undefined);
    up.on('error', () => undefined);
  });
  servers.push(server);
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', r); });
  return { port: (server.address() as { port: number }).port, toPlayer: () => Buffer.concat(chunks).toString('utf8') };
}

describe.skipIf(!HAVE)('row 12: the real process against player.js (TEST-ARCHITECTURE §3.4)', () => {
  it('a penalty write on an Attempt that has left the on-course set: 202 and write.updated pending on /ws; the correction command reaches the player\'s TCP side byte-exact, naming the instance upstream states', async () => {
    const dir = path.join(tmp(), 'excerpt');
    const cut = spawnSync(process.execPath, [EXTRACT, REC, '--output', dir, '--from', String(globalMs(FROM)), '--to', String(globalMs(TO)), '--label', 'onsite-write'], { encoding: 'utf8', timeout: 120_000 });
    expect(cut.status, cut.stderr).toBe(0);
    const work = tmp();
    const xmlOut = path.join(work, 'c123.xml');
    const [playerPort, controlPort] = [await freePort(), await freePort()];
    const proxy = await recordingProxy(playerPort);
    const player = spawn(process.execPath, [PLAYER, dir, '--speed', '10', '--port', String(playerPort), '--control-port', String(controlPort), '--no-udp', '--no-cis', '--start-paused', '--xml-out', xmlOut], { stdio: 'ignore' });
    children.push(player);
    const status = async (): Promise<any> => { try { return await (await fetch(`http://127.0.0.1:${controlPort}/status`)).json(); } catch { return undefined; } };
    const control = async (cmd: string): Promise<void> => { await fetch(`http://127.0.0.1:${controlPort}/${cmd}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); };
    for (let i = 0; i < 100 && (await status()) === undefined; i++) await sleep(100);
    const proc = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'src/onsite/main.ts'), '--port', '0', '--data-dir', path.join(work, 'data'), '--event-id', 'ev-t4w',
      '--tcp-host', '127.0.0.1', '--tcp-port', String(proxy.port), '--xml', xmlOut, '--xml-poll-seconds', '5', '--clock-rate', '10', '--clock-origin', firstInstant(dir), '--clock-wait-stdin',
      '--zone', 'Europe/Prague', '--event-date', '2026-09-19', '--external-id-scheme', 'replay', '--no-discovery'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
    children.push(proc);
    const port = await new Promise<number>((res, rej) => {
      let buf = '';
      const t = setTimeout(() => { rej(new Error('the process never announced `listening <port>`')); }, 60_000);
      proc.stdout!.on('data', (d: Buffer) => { buf += d.toString(); const m = /listening (\d+)/.exec(buf); if (m) { clearTimeout(t); res(Number(m[1])); } });
      proc.on('exit', (c) => { clearTimeout(t); rej(new Error(`the process exited ${String(c)} before listening`)); });
    });
    for (let i = 0; i < 200 && (await status())?.clients?.tcp !== 1; i++) await sleep(50);
    expect((await status())?.state, 'player --start-paused: paused while the client is connected').toBe('paused');
    proc.stdin!.write('play\n');
    await control('play');
    for (let i = 0; i < 1200; i++) { const s = await status(); if (s?.state === 'stopped' && s.stats?.messagesSent > 0) break; await sleep(250); }
    // settle: the last poll of the snapshot, the closure of the run
    const base = `http://127.0.0.1:${port}`;
    const getJson = async (p: string): Promise<any> => (await fetch(base + p)).json();
    let onCourse: string[] = [`${PHASE}:${BIB}`];
    for (let i = 0; i < 60 && onCourse.includes(`${PHASE}:${BIB}`); i++) { await sleep(500); onCourse = (await getJson('/api/oncourse')).attempts.map((a: any) => a.attemptId); }
    const attempt = (await getJson(`/api/phases/${PHASE}/attempts`)).attempts.find((a: any) => a.attemptId === `${PHASE}:${BIB}`);
    expect(attempt?.status?.value, 'precondition: bib 7 finished and has left the on-course set').toBe('finished');
    expect(onCourse).not.toContain(`${PHASE}:${BIB}`);
    expect(attempt.gates.state, 'precondition: the snapshot bound the course').toBe('known');
    const instance = (await getJson('/api/sources')).tcp.upstreamInstance as string;
    expect(['main', 'backup']).toContain(instance);

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages: any[] = [];
    ws.on('message', (d) => { messages.push(JSON.parse(d.toString())); });
    await new Promise<void>((r, j) => { ws.once('open', () => { r(); }); ws.once('error', j); });
    await sleep(300);
    const before = proxy.toPlayer();
    const res = await fetch(`${base}/api/attempts/${PHASE}/${BIB}/penalty`, { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'it-1' }, body: JSON.stringify({ gate: 1, value: 2 }) });
    const text = await res.text();
    expect(res.status, `POST penalty: ${text.slice(0, 200)}`).toBe(202);
    const body: any = JSON.parse(text);
    expect(body).toMatchObject({ status: 'pending', target: { phaseId: PHASE, bib: BIB, field: 'gate-penalty' }, requestedValue: { gate: 1, value: 2 } });
    for (let i = 0; i < 60 && !messages.some((m) => m.type === 'write.updated'); i++) await sleep(100);
    ws.close();
    expect(messages.find((m) => m.type === 'write.updated')?.write).toMatchObject({ writeId: body.writeId, status: 'pending' });
    for (let i = 0; i < 60 && proxy.toPlayer() === before; i++) await sleep(100);
    const sentBytes = proxy.toPlayer().slice(before.length);
    const system = instance === 'main' ? 'Main' : 'Backup';
    expect(sentBytes, 'the compact PenaltyCorrection, | terminated, addressed to the instance upstream states').toMatch(
      new RegExp(`^<Canoe123 System="${system}"><PenaltyCorrection RaceId="${PHASE}" Bib="${BIB}" Gate="1" Value="2" ?/></Canoe123>\\|$`));
    proc.kill('SIGTERM');
    player.kill('SIGKILL');
  }, 900_000);
});
