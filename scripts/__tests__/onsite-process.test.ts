/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 rows 14 and 15 (tier 4, tools project): the on-site process as a real process, fed by `player.js` over real sockets and the real XML
 * poll timer, presents the state the direct-injection replay presents (ADR-017 M1 gate 5, "a real process"), and its step log passes gate 2.
 * Real time is the point of this tier: nothing here injects a clock. Skipped when the recordings or the protocol-docs tools are absent.
 *
 * The excerpt is cp3-cross (Kayak Cross) cut with tools/extract-excerpt.js, so log and raw stream are one cold cut (TEST-ARCHITECTURE §3.2):
 *   10x: 2026-04-26T08:44:00Z-08:46:30Z: 3 XML snapshots, 2 oncourse-left (closures), whole finished results tables (measured on #242's replay: 582 steps)
 *   1x:  2026-04-26T08:45:00Z-08:46:15Z: 2 XML snapshots, finishes, on-course listings (the short cut)
 * Reference: `scripts/replay-direct.ts` over the same excerpt (no window), its step log's deltas folded by the §1.6/§7.2 client rules
 * (src/onsite/__tests__/model.ts). The process's side: every hydration endpoint of §7.1 read over HTTP, folded the same way.
 *
 * The process is started as `node --import tsx src/onsite/main.ts <flags>` (flags: onsite-harness.ts header) on the player's clock (round 27, ADR-017
 * Revision 7): `--clock-rate <speed> --clock-origin <the excerpt's first recorded instant>`, the XML poll setting stays 5 s and the clock scales it; poll,
 * heartbeat, ingest stamps and the leave rule all read that clock. `--external-id-scheme replay` is the replay driver's own scheme.
 *
 * CLOSED LIST removed before comparing (round 27 Q1.2), nothing else; any other difference fails, and a real-timing difference is reported with its cause:
 *   observedAt   inside every Observed `known` envelope and every provenance record: a receipt instant, later than recorded by delivery latency (N-fold at N x)
 *   asOf         on a Standing and on the on-course set: the ingest time of a unit (same reason)
 *   asOfSeq/seq  the process's counter; the replay driver counts nothing (it logs `ingestSeq: 0`)
 *   run.source   `source` on the Attempt's `run` envelope only (round 27b): the core's own stamp of the observation at which the generation was first seen, which no
 *                INV-2 rule orders between sources, so at a cold start it is the real arrival order of the poll against the stream. `source` is compared on every other field.
 * Compared in full: every structural field; every set (on-course membership and order, `featuredByUpstream`, Standing entries, diagnostics); of every Observed
 * field `state`, `value`, `eventTime`, `confidence`, `provisional`. `eventTime` is content, never stripped.
 * Two serialisation rules of the contract are applied to the reference, not tolerated as differences: Person.birthDate -> birthYear (§7 intro) and the `eventId`
 * the process gives every Class and Course (§2.3, §2.12). Not compared, the replay having no counterpart: `event` of /api/events/current (the core has no Event;
 * the bridge asserts it) and /api/sources (a connection fact): only checked present.
 * Start (c123-protocol-docs#28, player.js `--start-paused`): the player is started paused, the test waits until the process's TCP client is connected, asserts the
 * player's `/status` is `paused` (the first client gets nothing until `/play`), then writes `play` to the process's stdin (its clock starts) and POSTs `/play`
 * together. What remains is the delivery latency of one control call; the test MEASURES the offset instead of assuming it: the median of
 * (the process's stamp minus the replay's stamp) over the TCP steps both logs hold with the same elements, printed in every state-comparison failure message.
 * Nothing is stripped for it; a leave, a `provisional` flag or a content age that differs near the start of the window is read against that figure first.
 * Gate 2 (round 27 Q1.3): the checker with `--recording` must report 0 on the 1x log. At 10x the receive latency is outside the leave margin, so that log is
 * asserted written with the hydration step first and is no gate-2 evidence. Never the D-only reading.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { applyMessage, emptyModel, hydrate, view, type J } from '../../src/onsite/__tests__/model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PD = process.env.C123_PROTOCOL_DOCS ?? '/workspace/timing/c123-protocol-docs';
const REC = path.join(PD, 'recordings/.cache/2026-04-26-cp3-cross');
const PLAYER = path.join(PD, 'tools/player.js');
const EXTRACT = path.join(PD, 'tools/extract-excerpt.js');
const CHECKER = path.join(PD, 'tools/gate2/check.js');
const TSX = path.join(ROOT, 'node_modules/.bin/tsx');
const HAVE = [REC, PLAYER, EXTRACT, CHECKER].every((p) => existsSync(p));
const EVENT_ID = 'ev-t4';
let measuredOffset = 'start offset not measured yet';
const skew = (): string => `real-time start offset (player --start-paused, process clock started at play): ${measuredOffset}; report the cause of a difference, never strip`;

const dirs: string[] = [];
const children: ChildProcess[] = [];
afterAll(() => {
  for (const c of children) { try { c.kill('SIGKILL'); } catch { /* gone */ } }
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'onsite-t4-')); dirs.push(d); return d; };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const freePort = (): Promise<number> => new Promise((res, rej) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as { port: number }).port; s.close(() => { res(p); }); }); s.on('error', rej); });

/** Global player ms of an instant (manifest chunk startOffset + distance into the chunk). */
function globalMs(iso: string): number {
  const m = JSON.parse(readFileSync(path.join(REC, 'manifest.json'), 'utf8')) as { chunks: { startTime: string; endTime: string; startOffset: number }[] };
  const t = Date.parse(iso);
  const c = m.chunks.find((k) => Date.parse(k.startTime) <= t && t <= Date.parse(k.endTime));
  if (c === undefined) throw new Error(`no chunk holds ${iso}`);
  return c.startOffset + (t - Date.parse(c.startTime));
}

/**
 * The first difference between two compared sections, for the failure message only (the comparison itself is `toEqual`, unchanged): the element's key
 * (attemptId, standingKey, entryId, ...), the path of the field inside it, and both values.
 */
function firstDiff(got: unknown, want: unknown): string {
  const keyOf = (x: unknown, i: number): string => { const o = x as J; return String(o?.['attemptId'] ?? o?.['standingKey'] ?? o?.['entryId'] ?? o?.['phaseId'] ?? o?.['classId'] ?? o?.['courseId'] ?? i); };
  const walk = (a: unknown, b: unknown, p: string): string | undefined => {
    if (JSON.stringify(a) === JSON.stringify(b)) return undefined;
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const k of new Set([...Object.keys(a as J), ...Object.keys(b as J)])) {
        const d = walk((a as J)[k], (b as J)[k], `${p}.${k}`);
        if (d !== undefined) return d;
      }
    }
    return `${p}: process ${JSON.stringify(a)} vs replay ${JSON.stringify(b)}`;
  };
  if (Array.isArray(got) && Array.isArray(want)) {
    const gk = new Map(got.map((x, i) => [keyOf(x, i), x] as const)), wk = new Map(want.map((x, i) => [keyOf(x, i), x] as const));
    for (const k of new Set([...gk.keys(), ...wk.keys()])) {
      if (!gk.has(k)) return `${k}: missing in the process`;
      if (!wk.has(k)) return `${k}: missing in the replay`;
      const d = walk(gk.get(k), wk.get(k), k);
      if (d !== undefined) return d;
    }
    return 'same elements, different order';
  }
  return walk(got, want, '') ?? 'no difference found';
}

const STRIP = ['observedAt', 'asOf', 'asOfSeq', 'seq'] as const;
function strip(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(strip);
  if (x !== null && typeof x === 'object') return Object.fromEntries(Object.entries(x as J).filter(([k]) => !(STRIP as readonly string[]).includes(k)).map(([k, v]) => [k, strip(v)]));
  return x;
}
/** The contract's on-site serialisation applied to the replay's core output (not a tolerance): birthDate -> birthYear, eventId on Class and Course. */
function onsite(m: ReturnType<typeof emptyModel>): void {
  for (const [id, e] of m.entries) {
    const mem = e['members'] as J;
    if (mem?.state === 'known') e['members'] = { ...mem, value: (mem.value as J[]).map(({ birthDate, ...p }) => ({ ...p, birthYear: typeof birthDate === 'string' ? Number(birthDate.slice(0, 4)) : null })) };
    m.entries.set(id, e);
  }
  for (const c of [...m.classes.values(), ...m.courses.values()]) c['eventId'] = EVENT_ID;
}
const compared = (m: ReturnType<typeof emptyModel>): J => {
  const v = view(m);
  delete v['event']; delete v['sources']; delete v['checks']; delete v['flags'];
  return strip(v) as J;
};
/** Closed list, last item (round 27b): `source` on `run` only, the core's own stamp of the observation at which the generation was first seen (cold-start arrival order). */
const comparedPair = (p: ReturnType<typeof emptyModel>, r: ReturnType<typeof emptyModel>, key: string): [unknown, unknown] => {
  const one = (m: ReturnType<typeof emptyModel>): unknown => {
    const v = compared(m)[key];
    if (key !== 'attempts') return v;
    return (v as J[]).map((a) => { const run = a['run'] as J | undefined; if (run === undefined || !('source' in run)) return a; const { source: _s, ...rest } = run; return { ...a, run: rest }; });
  };
  return [one(p), one(r)];
};

/** The first recorded tcp or xml instant of an excerpt: the origin of the process's clock (the time basis the replay and the checker read). */
function firstInstant(dir: string): string {
  const m = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as { chunks: { file: string; startTime: string }[] };
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

function excerpt(from: string, to: string): string {
  const out = path.join(tmp(), 'excerpt');
  const r = spawnSync(process.execPath, [EXTRACT, REC, '--output', out, '--from', String(globalMs(from)), '--to', String(globalMs(to)), '--label', 'onsite-t4'], { encoding: 'utf8', timeout: 120_000 });
  expect(r.status, r.stderr).toBe(0);
  return out;
}

function reference(dir: string): ReturnType<typeof emptyModel> & { leaves: number; log: string } {
  const out = path.join(tmp(), 'ref.jsonl');
  const r = spawnSync(TSX, ['--max-old-space-size=3072', path.join(ROOT, 'scripts/replay-direct.ts'), '--recording', dir, '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: 300_000 });
  expect(r.status, r.stderr).toBe(0);
  const m = Object.assign(emptyModel(), { leaves: 0, log: out });
  for (const line of readFileSync(out, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const o = JSON.parse(line) as J;
    m.leaves += ((o['elements'] ?? []) as J[]).filter((e) => e['event'] === 'oncourse-left').length;
    for (const d of (o['deltas'] ?? []) as J[]) applyMessage(m, d);
  }
  onsite(m);
  return m;
}

/** Median and 90th percentile of (process stamp - replay stamp) over steps whose elements are equal once stamps are removed (the same ingest unit in both logs). */
function startOffset(processLog: string, replayLog: string): string {
  const noStamp = (k: string, v: unknown): unknown => (k === 'observedAt' || k === 'ingestSeq' ? undefined : v);
  const steps = (f: string): { key: string; at: number }[] => readFileSync(f, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as J)
    .filter((o) => Array.isArray(o['elements']) && (o['elements'] as J[]).length > 0 && !(o['elements'] as J[]).some((e) => e['event'] === 'xml-rewrite-detected')) // TCP units: an XML unit is stamped at the poll, up to one poll later by design
    .map((o) => ({ key: JSON.stringify(o['elements'], noStamp), at: Date.parse(((o['elements'] as J[])[0] as J)['observedAt'] as string) }));
  const want = new Map<string, number[]>();
  for (const r of steps(replayLog)) (want.get(r.key) ?? want.set(r.key, []).get(r.key)!).push(r.at);
  const d: number[] = [];
  for (const p of steps(processLog)) { const q = want.get(p.key); if (q !== undefined && q.length > 0) d.push(p.at - q.shift()!); }
  if (d.length === 0) return 'no step matched in both logs';
  d.sort((a, b) => a - b);
  const pct = (f: number): number => d[Math.min(d.length - 1, Math.floor(f * d.length))]!;
  return `process minus replay stamps: p50 ${pct(0.5)} ms over ${d.length} matched TCP steps (first-in-first-out match of equal units; a repeated identical unit can pair with a later one, so only the median is a figure)`;
}

interface Run { model: ReturnType<typeof emptyModel>; log: string; sources: J; steps: number }
async function realProcess(dir: string, speed: number, replayLog: string): Promise<Run> {
  const work = tmp();
  const xmlOut = path.join(work, 'c123.xml');
  const log = path.join(work, 'steps.jsonl');
  const [tcpPort, controlPort] = [await freePort(), await freePort()];
  const player = spawn(process.execPath, [PLAYER, dir, '--speed', String(speed), '--port', String(tcpPort), '--control-port', String(controlPort), '--no-udp', '--no-cis', '--start-paused', '--xml-out', xmlOut], { stdio: 'ignore' });
  children.push(player);
  const status = async (): Promise<J | undefined> => { try { return (await (await fetch(`http://127.0.0.1:${controlPort}/status`)).json()) as J; } catch { return undefined; } };
  const control = async (cmd: string): Promise<void> => { await fetch(`http://127.0.0.1:${controlPort}/${cmd}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); };
  for (let i = 0; i < 100 && (await status()) === undefined; i++) await sleep(100);
  const poll = 5; // the setting; the clock scales it
  const proc = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'src/onsite/main.ts'),
    '--port', '0', '--data-dir', path.join(work, 'data'), '--event-id', EVENT_ID, '--event-name', 'T4', '--tcp-host', '127.0.0.1', '--tcp-port', String(tcpPort),
    '--xml', xmlOut, '--xml-poll-seconds', String(poll), '--clock-rate', String(speed), '--clock-origin', firstInstant(dir), '--clock-wait-stdin', '--zone', 'Europe/Prague', '--event-date', '2026-04-26', '--external-id-scheme', 'replay',
    '--step-log', log, '--no-discovery'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
  children.push(proc);
  const port = await new Promise<number>((res, rej) => {
    let buf = '';
    const t = setTimeout(() => { rej(new Error('the process never announced `listening <port>`')); }, 60_000);
    proc.stdout!.on('data', (d: Buffer) => { buf += d.toString(); const m = /listening (\d+)/.exec(buf); if (m) { clearTimeout(t); res(Number(m[1])); } });
    proc.on('exit', (c) => { clearTimeout(t); rej(new Error(`the process exited ${String(c)} before listening`)); });
  });
  // the process's TCP client is connected and the player has sent it nothing: paused. Then the clock and the stream start together.
  for (let i = 0; i < 200 && ((await status())?.['clients'] as J | undefined)?.['tcp'] !== 1; i++) await sleep(50);
  const before = await status();
  expect(before?.['state'], 'player --start-paused: /status is paused while the first client is connected').toBe('paused');
  expect((before?.['stats'] as J | undefined)?.['messagesSent'], 'nothing has been sent to the client yet').toBe(0);
  proc.stdin!.write('play\n');
  await control('play');
  // wait for the end of the excerpt
  for (let i = 0; i < 1200; i++) { const s = await status(); if (s !== undefined && s['state'] === 'stopped' && (s['stats'] as J)?.['messagesSent'] > 0) break; await sleep(250); }
  // settle: bodies equal on two reads three polls apart (the last snapshot is read by the poll timer, not by the end of playback)
  let prev = '';
  let model = emptyModel();
  for (let i = 0; i < 40; i++) {
    await sleep(Math.max(1500, (poll / speed) * 3000)); // wall time of three polls on the scaled clock
    model = (await hydrate({ h: { port } })).model;
    const now = JSON.stringify(compared(model));
    if (now === prev) break;
    prev = now;
  }
  const sources = (await (await fetch(`http://127.0.0.1:${port}/api/sources`)).json()) as J;
  proc.kill('SIGTERM');
  const code = await new Promise<number | null>((res) => { proc.on('exit', (c) => { res(c); }); setTimeout(() => { res(-1); }, 20_000); });
  expect(code, 'SIGTERM stops the process gracefully, exit 0, closing the step log').toBe(0);
  player.kill('SIGKILL');
  const steps = readFileSync(log, 'utf8').trim().split('\n').length;
  measuredOffset = startOffset(log, replayLog);
  process.stdout.write(`[onsite-t4 ${speed}x] ${measuredOffset}\n`);
  return { model, log, sources, steps };
}

const WINDOWS = [
  { speed: 10, from: '2026-04-26T08:44:00.000Z', to: '2026-04-26T08:46:30.000Z' },
  { speed: 1, from: '2026-04-26T08:45:00.000Z', to: '2026-04-26T08:46:15.000Z' },
] as const;

describe.skipIf(!HAVE)('rows 14 and 15: a real process fed by player.js (ADR-017 gate 5; TEST-ARCHITECTURE §3.2)', () => {
  for (const w of WINDOWS) {
    describe(`cp3-cross ${w.from.slice(11, 19)}-${w.to.slice(11, 19)}Z at ${w.speed}x`, () => {
      let run: Run;
      let ref: ReturnType<typeof reference>;
      let dir: string;
      let started: Promise<void> | undefined;
      const start = (): Promise<void> => (started ??= (async () => {
        dir = excerpt(w.from, w.to);
        ref = reference(dir);
        run = await realProcess(dir, w.speed, ref.log);
      })());

      for (const k of ['classes', 'courses', 'phases', 'entries', 'attempts', 'standings', 'oncourse', 'diagnostics']) {
        it(`ADR-017 gate 5, ${w.speed}x: the hydrated "${k}" equal the direct-injection replay's final state, stamps removed (closed list in the header)`, async () => {
          await start();
          const [got, expected] = comparedPair(run.model, ref, k);
          expect(expected, `the replay's ${k} is not empty where the window has it`).toBeDefined();
          if (k === 'attempts' || k === 'entries' || k === 'standings') expect((expected as J[]).length).toBeGreaterThan(0);
          expect(got, `${skew()}\nfirst difference: ${firstDiff(got, expected)}`).toEqual(expected);
        }, 900_000);
      }

      it(`ADR-017 gate 5, ${w.speed}x: the replay excerpt has what the row needs (finishes, a closure, XML polls), the process saw them`, async () => {
        await start();
        const attempts = [...ref.attempts.values()];
        expect(attempts.some((a) => (a['status'] as J)?.value === 'finished')).toBe(true);
        if (w.speed === 10) expect(ref.leaves, 'the 10x window holds closures (oncourse-left steps), as the header says').toBeGreaterThanOrEqual(2);
        expect(run.sources.xml.state).toBe('connected');
        expect(run.sources.xml.lastRewriteDetectedAt).toEqual(expect.any(String));
        expect(run.sources.tcp.state).toBe('connected');
      }, 900_000);

      it(`ADR-017 Revision 7, ${w.speed}x: the process writes the step log when asked, first line the hydration step`, async () => {
        await start();
        expect(run.steps).toBeGreaterThan(2);
        const first = JSON.parse(readFileSync(run.log, 'utf8').split('\n')[0]!) as J;
        expect(first).toHaveProperty('hydration');
        const last = JSON.parse(readFileSync(run.log, 'utf8').trim().split('\n').at(-1)!) as J;
        expect(last).toHaveProperty('end');
      }, 900_000);

      // Round 27 Q1.3: the 1x log only; at 10x the latency is outside the leave margin and the log is no gate-2 evidence.
      // Declared only for 1x (not skipped at 10x): `npm run gates` fails on any skip (#313).
      if (w.speed === 1) it(`TEST-ARCHITECTURE §3.2, ${w.speed}x: the gate-2 checker with --recording reports 0 violations on the log`, async () => {
        await start();
        const c = spawnSync(process.execPath, [CHECKER, run.log, '--recording', dir], { encoding: 'utf8', timeout: 600_000 });
        expect(c.status, `checker: ${c.stdout.slice(0, 600)} ${c.stderr.slice(0, 300)}`).toBe(0);
        expect((JSON.parse(c.stdout) as { violations: unknown[] }).violations).toEqual([]);
      }, 900_000);
    });
  }
});
