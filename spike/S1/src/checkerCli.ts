// Runs the gate-2 checker over a step log: node dist/checkerCli.js <steps.jsonl> [out.json]
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Checker } from './checker.js';

async function main() {
  const [path, out] = process.argv.slice(2);
  const ck = new Checker(5000, 200);
  const rl = createInterface({ input: createReadStream(path!, 'utf8'), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) { if (line) { ck.step(JSON.parse(line)); n++; } }
  const sum = ck.summary();
  console.log(`steps ${n}`);
  for (const p of sum.properties) console.log(`P${String(p.property).padStart(2)}  checked ${String(p.checked).padStart(7)}  violations ${p.violations}`);
  if (out) writeFileSync(out, JSON.stringify(sum, null, 2) + '\n');
}
main().catch((e) => { console.error(e); process.exit(1); });
