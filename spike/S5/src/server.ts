// S5 — thin WS output over S1's live ingest (BRIEFS S5 steps 1, 2b).
//
// Drives S1's Ingest/Domain (imported, never copied) from a LIVE TCP stream and a LIVE XML file —
// not the offline excerpt replay. observedAt is this process's own wall clock at the moment each
// message is read (there is no recorded time to replay): that clock is also what the headless WS
// client (client.ts) uses, so "ingestedAt" and "received" are directly comparable (BRIEFS: "same
// machine clock").
//
// Usage:
//   node dist/S5/src/server.js --xml <path> [--tcp-host 127.0.0.1] [--tcp-port 27333]
//     [--ws-port 27501] [--poll-ms 5000] [--zone +02:00] [--leave-ms 2500]
//     [--xml-retry-ms 150] [--xml-max-retries 5]
import { connect, type Socket } from 'node:net';
import { readFileSync, existsSync } from 'node:fs';
import { WebSocketServer, type WebSocket } from 'ws';
import { Domain } from '../../S1/src/merge.js';
import { Ingest, type StepRecord } from '../../S1/src/ingest.js';
import { readSnapshot } from '../../S1/src/snapshot.js';

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= process.argv.length) { if (def !== undefined) return def; throw new Error(`missing --${name}`); }
  return process.argv[i + 1]!;
}
function num(name: string, def: number): number { const v = process.argv.indexOf(`--${name}`); return v < 0 ? def : Number(process.argv[v + 1]); }

const tcpHost = arg('tcp-host', '127.0.0.1');
const tcpPort = num('tcp-port', 27333);
const xmlPath = arg('xml');
const wsPort = num('ws-port', 27501);
const pollMs = num('poll-ms', 5000);
const zone = arg('zone', '+02:00');
const leaveMs = num('leave-ms', 2500);
const xmlRetryMs = num('xml-retry-ms', 150);
const xmlMaxRetries = num('xml-max-retries', 5);

// ───────────────────────────── domain + ingest ─────────────────────────────

const domain = new Domain({ zone, pollIntervalMs: pollMs, eventId: 'onsite-live', tier: 'onsite' });

const wss = new WebSocketServer({ port: wsPort });
const clients = new Set<WebSocket>();
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);
  ws.on('close', () => { clients.delete(ws); console.log(`[ws] client disconnected (${clients.size} total)`); });
  ws.on('error', () => clients.delete(ws));
});

let totalDeltas = 0;
function onStep(r: StepRecord) {
  const ingestedAt = (r.element as { observedAt?: string }).observedAt ?? new Date().toISOString();
  for (const d of r.deltas) {
    totalDeltas++;
    const msg = JSON.stringify({ ingestedAt, delta: d });
    for (const ws of clients) if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

const ingest = new Ingest(domain, { zone, leaveAfterMs: leaveMs, registryScheme: 'cz-rgc' }, onStep);

// ───────────────────────────── TCP: live stream, reconnect with backoff ─────────────────────────────
// Mirrors recorder.js's own reconnect scheme (1s -> 30s, recordings/README.md) -- this is a live process,
// not a replay; the recording carries no connection events (S1-9), but a live process must survive a
// real disconnect (player restart, cable pull, Canoe123 restart).

let tcpBuf = '';
let backoffMs = 1000;
const BACKOFF_MAX = 30000;

function connectTcp() {
  const sock: Socket = connect(tcpPort, tcpHost, () => {
    console.log(`[tcp] connected to ${tcpHost}:${tcpPort}`);
    backoffMs = 1000;
  });
  sock.setEncoding('utf8');
  sock.on('data', (chunk: string) => {
    tcpBuf += chunk;
    const parts = tcpBuf.split('|');
    tcpBuf = parts.pop() ?? ''; // last part: incomplete (no trailing '|' yet) -- c123-protocol.md: `|` delimited
    for (const p of parts) {
      if (!p) continue;
      ingest.tcp(p, new Date().toISOString());
    }
  });
  sock.on('close', () => {
    console.log(`[tcp] disconnected; reconnecting in ${backoffMs} ms`);
    setTimeout(connectTcp, backoffMs);
    backoffMs = Math.min(BACKOFF_MAX, backoffMs * 2);
  });
  sock.on('error', (e: Error) => console.log(`[tcp] error: ${e.message}`));
}

// ───────────────────────────── XML: poll + torn-read retry (BRIEFS step 2b) ─────────────────────────────
// File-watch mechanism: POLLING at `pollIntervalMs`, shared with Domain's cfg.pollIntervalMs -- the same
// number INV-7's content-age guard is stated in (merge.ts: "XML file-watch interval"). fs.watch was not
// used: it is unreliable over SMB/network shares and some AV filter drivers on Windows, and the poll
// interval already has contractual meaning here (DERIVATIONS §0.3), so one number should drive both.
//
// Canoe123 copies the file over, not an atomic rename (CONTRACTS §2.8): a read can land mid-write and see
// a truncated/invalid document. On a changed read that fails §0.3 validation, retry a few times at a much
// shorter interval than the main poll before giving up for this tick (the next poll tick sees the content
// as "changed" again -- lastRaw is not advanced on failure -- and tries once more).
let lastRaw: string | null = null;
const xmlStats = { ticks: 0, readAttempts: 0, changed: 0, validationFailures: 0, retriesUsed: 0, recoveredAfterRetry: 0, gaveUpAfterRetries: 0 };

function sleepSync(ms: number) {
  const until = Date.now() + ms;
  while (Date.now() < until) { /* spike-only busy-wait: keeps the retry loop synchronous and simple */ }
}

function pollXml() {
  xmlStats.ticks++;
  if (!existsSync(xmlPath)) { console.log(`[xml] not found: ${xmlPath}`); return; }
  let text = readFileSync(xmlPath, 'utf8');
  xmlStats.readAttempts++;
  if (text === lastRaw) return; // unchanged since last processed read
  xmlStats.changed++;
  let r = readSnapshot(text);
  let attempt = 0;
  while (!r.ok && attempt < xmlMaxRetries) {
    xmlStats.validationFailures++;
    attempt++;
    xmlStats.retriesUsed++;
    sleepSync(xmlRetryMs);
    if (!existsSync(xmlPath)) continue;
    text = readFileSync(xmlPath, 'utf8');
    xmlStats.readAttempts++;
    r = readSnapshot(text);
  }
  if (!r.ok) {
    xmlStats.validationFailures++;
    xmlStats.gaveUpAfterRetries++;
    console.log(`[xml] gave up after ${xmlMaxRetries} retries: ${r.reason}`);
    return; // lastRaw NOT updated: next tick sees content as changed again and retries
  }
  if (attempt > 0) xmlStats.recoveredAfterRetry++;
  lastRaw = text;
  ingest.xml(text, new Date().toISOString());
}

// ───────────────────────────── status + shutdown ─────────────────────────────

const statusTimer = setInterval(() => {
  console.log(`[status] attempts=${domain.attempts.size} deltas=${totalDeltas} clients=${clients.size} ` +
    `xml{ticks=${xmlStats.ticks} changed=${xmlStats.changed} failures=${xmlStats.validationFailures} retries=${xmlStats.retriesUsed} gaveUp=${xmlStats.gaveUpAfterRetries}}`);
}, 10000);

function shutdown() {
  clearInterval(statusTimer);
  clearInterval(xmlTimer);
  console.log('\n[shutdown] final counters:');
  console.log(JSON.stringify({ ingestStats: ingest.stats, domainStats: domain.stats, xmlStats, totalDeltas }, null, 2));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`[s5] xml=${xmlPath} tcp=${tcpHost}:${tcpPort} ws=:${wsPort} poll=${pollMs}ms leave=${leaveMs}ms zone=${zone}`);
connectTcp();
const xmlTimer = setInterval(pollXml, pollMs);
pollXml(); // first read is the cold-start scope snapshot
