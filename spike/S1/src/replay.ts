// Direct-injection replay of one excerpt (BRIEFS S1 step 3). Usage:
//   node dist/replay.js --excerpt <dir> --recording <dir> --out <dir> [--zone +02:00] [--leave-ms 3000]
// Writes <out>/steps.jsonl (one canonical JSON line per element) and <out>/final-state.json (canonical
// presented state), and prints both sha256s. No clock of the process feeds the domain: observedAt is
// recording start + excerpt offset + the record's ts. The wall-clock duration is measured for the report only.
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { Domain } from './merge.js';
import { Ingest, type StepRecord } from './ingest.js';
import { canonical, sha256 } from './util.js';

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= process.argv.length) { if (def !== undefined) return def; throw new Error(`missing --${name}`); }
  return process.argv[i + 1]!;
}

async function main() {
  const t0 = process.hrtime.bigint();
  const excerpt = arg('excerpt'), recording = arg('recording'), out = arg('out');
  const zone = arg('zone', '+02:00'), leaveMs = Number(arg('leave-ms', '3000'));   // onCourseLeaveAfterSeconds = 3 s (DERIVATIONS §4.1, round 9)
  mkdirSync(out, { recursive: true });
  const recManifest = JSON.parse(readFileSync(join(recording, 'manifest.json'), 'utf8'));
  // Excerpt metadata: excerpt.json in the layout of protocol-docs main 4ab91d2 (manifest.json is then the v3 player
  // manifest); manifest.json in the earlier layout.
  const exMetaPath = existsSync(join(excerpt, 'excerpt.json')) ? join(excerpt, 'excerpt.json') : join(excerpt, 'manifest.json');
  const exManifest = JSON.parse(readFileSync(exMetaPath, 'utf8'));
  // extract-excerpt.js writes _meta.startTime as new Date(offset): unusable (1970). Absolute time comes from the
  // source recording: its start = first chunk's startTime minus its startOffset.
  const recStart = Date.parse(recManifest.chunks[0].startTime) - recManifest.chunks[0].startOffset;
  const from = exManifest.source.from as number;
  const base = recStart + from;

  const domain = new Domain({ zone, pollIntervalMs: 5000, eventId: `${recManifest.event?.name ?? 'event'}`, tier: 'onsite' });
  const stepsPath = join(out, 'steps.jsonl');
  const ws = createWriteStream(stepsPath);
  let steps = 0, deltas = 0;
  const deltaTypes: Record<string, number> = {};
  const inv2c: unknown[] = [];
  const write = (r: StepRecord) => {
    steps++;
    deltas += r.deltas.length;
    for (const d of r.deltas) deltaTypes[d.type] = (deltaTypes[d.type] ?? 0) + 1;
    if (r.element.inv2cRefused) inv2c.push({ step: r.step, refused: r.element.inv2cRefused });
    ws.write(canonical(r) + '\n');
  };
  const ingest = new Ingest(domain, { zone, leaveAfterMs: leaveMs, registryScheme: 'cz-rgc' }, write);
  const ignored: Record<string, number> = {};
  let records = 0, firstAt: string | null = null, lastAt: string | null = null;
  const rl = createInterface({ input: createReadStream(join(excerpt, 'data.jsonl'), 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const rec = JSON.parse(line);
    if (rec._meta || rec._snapshot || rec._annotation) continue;   // the excerpt's synthesized _snapshot is not a recorded element
    records++;
    const observedAt = new Date(base + rec.ts).toISOString();
    firstAt ??= observedAt; lastAt = observedAt;
    if (rec.src === 'tcp') ingest.tcp(rec.data, observedAt);
    else if (rec.src === 'xml' && rec.type === 'XmlSnapshot') ingest.xml(rec.data, observedAt);
    else ignored[`${rec.src}/${rec.type}`] = (ignored[`${rec.src}/${rec.type}`] ?? 0) + 1;   // UDP, CIS, mobile: not consumed (ADR-011)
  }
  await new Promise<void>((res) => ws.end(res));
  const finalState = canonical(domain.presentedState());
  writeFileSync(join(out, 'final-state.json'), finalState + '\n');
  const stepsSha = sha256(readFileSync(stepsPath, 'utf8'));
  const stateSha = sha256(finalState + '\n');
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const summary = {
    excerpt, source: exManifest.source, checksum: exManifest.checksum, window: { first: firstAt, last: lastAt },
    records, steps, deltas, deltaTypes, ignored, ingest: ingest.stats, domain: domain.stats, inv2cRefusals: inv2c,
    attempts: domain.attempts.size, stepsSha256: stepsSha, finalStateSha256: stateSha, wallClockMs: Math.round(ms),
    rssMB: Math.round(process.memoryUsage().rss / 1e6),
  };
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`steps ${steps}  deltas ${deltas}  attempts ${domain.attempts.size}  wall ${Math.round(ms)} ms`);
  console.log(`steps.jsonl       sha256 ${stepsSha}`);
  console.log(`final-state.json  sha256 ${stateSha}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
