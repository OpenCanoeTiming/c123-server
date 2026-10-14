// S5 — headless WS client (BRIEFS S5 step 1): counts messages and measures receive latency against
// each message's ingest timestamp (same machine clock, per server.ts). Prints a summary (count, p50,
// p95, max) on exit (Ctrl+C / SIGINT, or --duration seconds).
//
// Usage: node dist/S5/src/client.js [--url ws://localhost:27501] [--duration 3600] [--label c1]
import WebSocket from 'ws';

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= process.argv.length) { if (def !== undefined) return def; throw new Error(`missing --${name}`); }
  return process.argv[i + 1]!;
}

const url = arg('url', 'ws://localhost:27501');
const durationArg = process.argv.indexOf('--duration');
const durationS = durationArg >= 0 ? Number(process.argv[durationArg + 1]) : null;
const label = arg('label', 'client');

const latenciesMs: number[] = [];
let count = 0;
let connectedAt: number | null = null;
let lastMsgAt: number | null = null;

const ws = new WebSocket(url);

ws.on('open', () => {
  connectedAt = Date.now();
  console.log(`[${label}] connected to ${url}`);
});

ws.on('message', (raw: Buffer) => {
  const now = Date.now();
  lastMsgAt = now;
  count++;
  try {
    const msg = JSON.parse(raw.toString('utf8')) as { ingestedAt: string };
    const latency = now - Date.parse(msg.ingestedAt);
    latenciesMs.push(latency);
  } catch {
    // unparseable message: counted, not timed
  }
});

ws.on('close', () => {
  console.log(`[${label}] connection closed`);
  summarize();
  process.exit(0);
});
ws.on('error', (e: Error) => console.log(`[${label}] error: ${e.message}`));

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx]!;
}

function summarize() {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const summary = {
    label,
    url,
    count,
    withTiming: sorted.length,
    p50Ms: percentile(sorted, 0.50),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.length ? sorted[sorted.length - 1] : NaN,
    minMs: sorted.length ? sorted[0] : NaN,
    connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null,
    lastMessageAt: lastMsgAt ? new Date(lastMsgAt).toISOString() : null,
  };
  console.log(`[${label}] SUMMARY ${JSON.stringify(summary)}`);
}

if (durationS) {
  setTimeout(() => { summarize(); ws.close(); }, durationS * 1000);
}

function onSignal() { summarize(); ws.close(); setTimeout(() => process.exit(0), 200); }
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);
