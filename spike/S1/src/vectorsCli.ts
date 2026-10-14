// Prints one line per tier-1 vector: PASS/FAIL, id, invariant, first failure. Exit code 0 always; the table is the result.
import { readFileSync, writeFileSync } from 'node:fs';
import { runVector } from './vectors.js';

const path = process.argv[2] ?? new URL('../../../docs/arch/vectors/tier1-conformance.json', import.meta.url).pathname;
const vectors = JSON.parse(readFileSync(path, 'utf8')).vectors as any[];
const results = vectors.map(runVector);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  [${r.invariant}]${r.pass ? '' : '  ' + r.failures.join(' | ')}`);
const pass = results.filter((r) => r.pass).length;
console.log(`\n${pass}/${results.length} pass`);
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(results, null, 2) + '\n');
