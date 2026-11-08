/**
 * Entry of the on-site process (`npm run onsite`): real clock, real filesystem, real TCP source and UDP discovery behind `startOnsite`.
 *
 *   --port <n> --data-dir <dir> --event-id <id> [--event-name <s>] --tcp-host <h> [--tcp-port <n>] --xml <path> [--xml-poll-seconds <s>]
 *   [--zone <iana>] [--event-date <YYYY-MM-DD>] [--external-id-scheme <s>] [--step-log <file>] [--no-discovery]
 *   [--clock-rate <n>] [--clock-origin <iso>] [--clock-wait-stdin]   (the process's clock: rate seconds per wall second from origin; default 1 and the
 *   system time; with --clock-wait-stdin it stands at origin until one line is read on stdin)
 *
 * It prints `listening <port>` once HTTP accepts connections. SIGTERM and SIGINT stop it gracefully (the step log gets its `end` line) and
 * exit 0. Without `--tcp-host` the TCP host comes from Canoe123's UDP broadcast, unless `--no-discovery`.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { createRealChecksFs, createRealClock, createRealXmlFs, createScaledClock } from '../adapters/real-io.js';
import { UdpDiscovery } from '../sources/UdpDiscovery.js';
import { DEFAULT_PORT, startOnsite, type OnsiteDiscovery, type OnsiteOptions } from './index.js';

const FLAGS = new Set(['--port', '--data-dir', '--event-id', '--event-name', '--tcp-host', '--tcp-port', '--xml', '--xml-poll-seconds', '--zone', '--event-date', '--external-id-scheme', '--step-log', '--clock-rate', '--clock-origin']);
const USAGE = 'usage: npm run onsite -- --data-dir <dir> [--port <n>] [--event-id <id> [--event-name <s>]] [--tcp-host <h> [--tcp-port <n>]] [--xml <path> [--xml-poll-seconds <s>]] [--zone <iana>] [--event-date <YYYY-MM-DD>] [--external-id-scheme <s>] [--step-log <file>] [--no-discovery] [--clock-rate <n>] [--clock-origin <iso>] [--clock-wait-stdin]\n';

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}`);
  process.exit(2);
}

const args = new Map<string, string>();
let discover = true;
let waitStdin = false;
for (let k = 2; k < process.argv.length; k++) {
  const flag = process.argv[k] ?? '';
  if (flag === '--no-discovery') { discover = false; continue; }
  if (flag === '--clock-wait-stdin') { waitStdin = true; continue; }
  const value = process.argv[++k];
  if (!FLAGS.has(flag) || value === undefined) fail(`bad argument ${flag}`);
  args.set(flag, value as string);
}
const num = (flag: string): number | undefined => {
  const v = args.get(flag);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) fail(`${flag} is not a number: ${v}`);
  return n;
};
const text = (flag: string): string | undefined => args.get(flag);

const dataDir = text('--data-dir');
if (dataDir === undefined) fail('--data-dir is required');
const tcpHost = text('--tcp-host');
const xmlPath = text('--xml');
const stepLog = text('--step-log');
if (stepLog !== undefined) writeFileSync(stepLog, '');
const clockRate = num('--clock-rate') ?? 1;
if (clockRate <= 0) fail('--clock-rate must be above 0');
const clockOriginText = text('--clock-origin');
const clockOrigin = clockOriginText === undefined ? undefined : Date.parse(clockOriginText);
if (clockOrigin !== undefined && !Number.isFinite(clockOrigin)) fail(`--clock-origin is not an instant: ${clockOriginText ?? ''}`);
const scaled = clockRate === 1 && clockOrigin === undefined && !waitStdin ? undefined : createScaledClock(clockRate, clockOrigin ?? Date.now(), waitStdin);
if (scaled !== undefined && waitStdin) {
  let buf = '';
  const onData = (d: Buffer): void => {
    buf += d.toString();
    if (!buf.includes('\n')) return;
    process.stdin.off('data', onData);
    process.stdin.pause();
    scaled.start();
  };
  process.stdin.on('data', onData);
}

const opts: OnsiteOptions = {
  port: num('--port') ?? DEFAULT_PORT,
  clock: scaled ?? createRealClock(),
  fs: { ...createRealChecksFs(), ...createRealXmlFs() },
  dataDir: dataDir as string,
  ...(text('--event-id') !== undefined ? { eventId: text('--event-id') as string, ...(text('--event-name') !== undefined ? { eventName: text('--event-name') as string } : {}) } : {}),
  ...(xmlPath !== undefined ? { xml: { path: xmlPath, ...(num('--xml-poll-seconds') !== undefined ? { pollSeconds: num('--xml-poll-seconds') as number } : {}) } } : {}),
  tcp: { ...(tcpHost !== undefined ? { host: tcpHost } : {}), ...(num('--tcp-port') !== undefined ? { port: num('--tcp-port') as number } : {}) },
  discovery: discover && tcpHost === undefined ? (new UdpDiscovery() as unknown as OnsiteDiscovery) : null,
  ...(text('--zone') !== undefined ? { zone: text('--zone') as string } : {}),
  ...(text('--event-date') !== undefined ? { eventDate: text('--event-date') as string } : {}),
  ...(text('--external-id-scheme') !== undefined ? { externalIdScheme: text('--external-id-scheme') as string } : {}),
  ...(stepLog !== undefined ? { stepLog: (line: string): void => { appendFileSync(stepLog, `${line}\n`); } } : {}),
};

const handle = await startOnsite(opts);
process.stdout.write(`listening ${handle.port}\n`);
const stop = (): void => {
  void handle.stop().then(() => { process.exit(0); }, (e: unknown) => { console.error(e); process.exit(1); });
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
