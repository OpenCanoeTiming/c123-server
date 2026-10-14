// Spike S2: S1's direct-injection replay (spike/S1/src/replay.ts at 849728a) driven unchanged through S1's own
// Domain and Ingest, reading the excerpt's metadata from excerpt.json (protocol-docs 4ab91d2 layout), which
// replay.ts does not yet do. Same inputs, same outputs (steps.jsonl, final-state.json), same canonical form.
//   node replay-s1.mjs --excerpt <dir> --recording <dir> --out <dir>
import { createReadStream, createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { Domain } from '../S1/dist/merge.js';
import { Ingest } from '../S1/dist/ingest.js';
import { canonical, sha256 } from '../S1/dist/util.js';
import { excerptMeta } from './fold.mjs';

const arg = (n, def) => { const i = process.argv.indexOf(`--${n}`); if (i < 0) { if (def !== undefined) return def; throw new Error(`missing --${n}`); } return process.argv[i + 1]; };
const t0 = process.hrtime.bigint();
const excerpt = arg('excerpt'), recording = arg('recording'), out = arg('out');
const zone = arg('zone', '+02:00'), leaveMs = Number(arg('leave-ms', '2500'));
mkdirSync(out, { recursive: true });
const rec = JSON.parse(readFileSync(join(recording, 'manifest.json'), 'utf8'));
const base = Date.parse(rec.chunks[0].startTime) - rec.chunks[0].startOffset + excerptMeta(excerpt).source.from;
const domain = new Domain({ zone, pollIntervalMs: 5000, eventId: `${rec.event?.name ?? 'event'}`, tier: 'onsite' });
const ws = createWriteStream(join(out, 'steps.jsonl'));
let steps = 0;
const ingest = new Ingest(domain, { zone, leaveAfterMs: leaveMs, registryScheme: 'cz-rgc' }, (r) => { steps++; ws.write(canonical(r) + '\n'); });
const rl = createInterface({ input: createReadStream(join(excerpt, 'data.jsonl'), 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line) continue;
  const r = JSON.parse(line);
  if (r._meta || r._snapshot || r._annotation) continue;
  const observedAt = new Date(base + r.ts).toISOString();
  if (r.src === 'tcp') ingest.tcp(r.data, observedAt);
  else if (r.src === 'xml' && r.type === 'XmlSnapshot') ingest.xml(r.data, observedAt);
}
await new Promise((res) => ws.end(res));
const finalState = canonical(domain.presentedState());
writeFileSync(join(out, 'final-state.json'), finalState + '\n');
console.log(`steps ${steps}  attempts ${domain.attempts.size}  wall ${Math.round(Number(process.hrtime.bigint() - t0) / 1e6)} ms`);
console.log(`steps.jsonl       sha256 ${sha256(readFileSync(join(out, 'steps.jsonl'), 'utf8'))}`);
console.log(`final-state.json  sha256 ${sha256(finalState + '\n')}`);
