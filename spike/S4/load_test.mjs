#!/usr/bin/env node
/**
 * S4 step 3 -- honest load test of today's live-mini ingest routes.
 *
 * This is NOT a test of CONTRACTS Sec8.3's resource-based store (it does not
 * exist yet). It measures what today's `POST /api/v1/ingest/{results,oncourse}`
 * routes (c123-live-mini/packages/server/src/routes/ingest.ts:195,346) and
 * better-sqlite3 (WAL, synchronous=NORMAL) sustain on THIS machine, as a
 * floor: "the runtime and SQLite on this class of machine sustain X row
 * writes/s", nothing about the future store's own margin (that's M3's).
 *
 * Usage: node load_test.mjs <route> <targetReqPerSec> <durationSec> <batchSize>
 *   route: results | oncourse
 */
import { performance } from 'node:perf_hooks';

const BASE = process.env.LOAD_TEST_BASE ?? 'http://127.0.0.1:3999';
const API_KEY = process.env.LOAD_TEST_API_KEY ?? 'seed-demo-key-not-for-production';

const RACES = ['K1M-ZS_BR1_25', 'K1W-ZS_BR1_25'];
const PARTICIPANTS = {
  'K1M-ZS_BR1_25': [
    ['23128.K1M.ZS', 13], ['119238.K1M.ZS', 17], ['9069.K1M.ZS', 8], ['11052.K1M.ZS', 10],
    ['9164.K1M.ZS', 21], ['119252.K1M.ZS', 6], ['39001.K1M.ZS', 9], ['121053.K1M.ZS', 5],
    ['48024.K1M.ZS', 11], ['60090.K1M.ZS', 12],
  ],
  'K1W-ZS_BR1_25': [
    ['108047.K1W.ZS', 3], ['23176.K1W.ZS', 2], ['119246.K1W.ZS', 6], ['43028.K1W.ZS', 4],
    ['57158.K1W.ZS', 7], ['45023.K1W.ZS', 1], ['9109.K1W.ZS', 8], ['39040.K1W.ZS', 9],
    ['11079.K1W.ZS', 10], ['61003.K1W.ZS', 12],
  ],
};

function makeResultsBatch(n, seq) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const race = RACES[(seq + i) % RACES.length];
    const [participantId, bib] = PARTICIPANTS[race][(seq + i) % 10];
    const time = 70000 + ((seq + i) % 3000);
    results.push({
      raceId: race,
      participantId,
      bib,
      time,
      pen: (seq + i) % 5 === 0 ? 2 : 0,
      total: time + ((seq + i) % 5 === 0 ? 200 : 0),
      rnk: 1 + ((seq + i) % 10),
      gates: [
        { gate: 1, time: 100, pen: 0 },
        { gate: 2, time: 200, pen: (seq + i) % 7 === 0 ? 50 : 0 },
      ],
    });
  }
  return { results };
}

function makeOncourseBatch(n, seq) {
  const oncourse = [];
  for (let i = 0; i < n; i++) {
    const race = RACES[(seq + i) % RACES.length];
    const [participantId, bib] = PARTICIPANTS[race][(seq + i) % 10];
    oncourse.push({
      participantId,
      raceId: race,
      bib,
      name: 'LOADTEST ATHLETE',
      club: 'LOADTEST',
      position: 1 + (i % 4),
      gates: [0, 0, (seq + i) % 11 === 0 ? 2 : 0],
      dtStart: '09:00:00.000',
      time: 60 + ((seq + i) % 120),
      pen: (seq + i) % 11 === 0 ? 2 : 0,
    });
  }
  return { oncourse };
}

async function postOnce(path, body) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
      body: JSON.stringify(body),
    });
    const t1 = performance.now();
    const text = await res.text();
    return { ok: res.ok, status: res.status, ms: t1 - t0, bytes: Buffer.byteLength(text) };
  } catch (err) {
    const t1 = performance.now();
    return { ok: false, status: 0, ms: t1 - t0, error: String(err) };
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const [, , route, targetRpsStr, durationStr, batchStr] = process.argv;
  const targetRps = parseFloat(targetRpsStr ?? '10');
  const durationSec = parseFloat(durationStr ?? '20');
  const batchSize = parseInt(batchStr ?? '5', 10);
  const makeBody = route === 'oncourse' ? makeOncourseBatch : makeResultsBatch;
  const path = route === 'oncourse' ? '/api/v1/ingest/oncourse' : '/api/v1/ingest/results';

  const intervalMs = 1000 / targetRps;
  const endAt = performance.now() + durationSec * 1000;
  const latencies = [];
  let sent = 0;
  let errors = 0;
  let rowsWritten = 0;
  const inFlight = [];
  let seq = 0;

  const start = performance.now();
  while (performance.now() < endAt) {
    const loopStart = performance.now();
    const body = makeBody(batchSize, seq);
    seq += batchSize;
    sent++;
    const p = postOnce(path, body).then((r) => {
      latencies.push(r.ms);
      if (!r.ok) errors++;
      else rowsWritten += batchSize;
    });
    inFlight.push(p);
    const elapsed = performance.now() - loopStart;
    const wait = intervalMs - elapsed;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  await Promise.all(inFlight);
  const totalS = (performance.now() - start) / 1000;

  const result = {
    route,
    targetRps,
    batchSize,
    durationSec: totalS,
    requestsSent: sent,
    rowsWritten,
    errors,
    errorRate: errors / sent,
    achievedReqPerSec: sent / totalS,
    achievedRowsPerSec: rowsWritten / totalS,
    latencyMsP50: percentile(latencies, 50),
    latencyMsP95: percentile(latencies, 95),
    latencyMsP99: percentile(latencies, 99),
    latencyMsMax: Math.max(...latencies),
  };
  console.log(JSON.stringify(result, null, 2));
}

main();
