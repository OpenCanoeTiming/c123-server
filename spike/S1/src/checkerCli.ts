// Runs the gate-2 checker over a step log:
//   node dist/checkerCli.js <steps.jsonl> <out-prefix>
// Writes <out-prefix>.summary.json (counts per property, per field) and <out-prefix>.violations.jsonl (every violation).
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Checker } from './checker.js';

async function main() {
  const [path, out] = process.argv.slice(2);
  const ck = new Checker(5000, Infinity);
  const rl = createInterface({ input: createReadStream(path!, 'utf8'), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) { if (line) { ck.step(JSON.parse(line)); n++; } }
  const sum = ck.summary();
  const byField: Record<string, Record<string, number>> = {};
  for (const v of ck.violations) {
    const k = `P${v.property}`;
    byField[k] ??= {};
    byField[k][v.field ?? '-'] = (byField[k][v.field ?? '-'] ?? 0) + 1;
  }
  console.log(`steps ${n}`);
  for (const p of sum.properties) console.log(`P${String(p.property).padStart(2)}  checked ${String(p.checked).padStart(7)}  violations ${p.violations}${byField[`P${p.property}`] ? '  ' + JSON.stringify(byField[`P${p.property}`]) : ''}`);
  if (out) {
    writeFileSync(`${out}.summary.json`, JSON.stringify({ steps: n, properties: sum.properties, byField, rebaselineSteps: sum.rebaselineSteps,
      firstPerProperty: Object.fromEntries(sum.properties.map((p) => [p.property, ck.violations.filter((v) => v.property === p.property).slice(0, 5)])) }, null, 2) + '\n');
    writeFileSync(`${out}.violations.jsonl`, ck.violations.map((v) => JSON.stringify(v)).join('\n') + (ck.violations.length ? '\n' : ''));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
