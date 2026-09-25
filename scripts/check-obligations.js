#!/usr/bin/env node
/**
 * Keeps docs/arch/CLIENT-OBLIGATIONS.md in step with the documents it is derived from.
 *
 *   node scripts/check-obligations.js            # citations resolve
 *   node scripts/check-obligations.js <baseRef>  # ...and no cited section changed without the checklist
 *
 * Every obligation cites its source, e.g. "(CONTRACTS §7.2; ADR-015)". Check 1 fails when a cited
 * section or ADR no longer exists. Check 2 fails when a change since <baseRef> touches a cited
 * section but leaves CLIENT-OBLIGATIONS.md untouched. Set OBLIGATIONS_ACK=1 to accept that a change
 * affects no obligation.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ARCH = 'docs/arch';
const CHECKLIST = `${ARCH}/CLIENT-OBLIGATIONS.md`;
const DOCS = ['TEST-ARCHITECTURE', 'CONFORMANCE-VECTORS', 'CONTRACTS', 'DERIVATIONS', 'ARCHITECTURE'];
const TOKEN = new RegExp(`\\b(${DOCS.join('|')})\\b|\\bADR-(\\d{3})\\b|§([0-9]+(?:\\.[0-9A-Z]+)*)`, 'g');

/** Section index of one document: id → { start, end } line numbers (1-based, inclusive). */
function sections(text) {
  const lines = text.split('\n');
  const heads = [];
  let inFence = false;
  const parents = [];
  lines.forEach((line, i) => {
    if (line.startsWith('```')) inFence = !inFence;
    const m = !inFence && /^(#{2,6})\s+(.*)$/.exec(line);
    if (!m) return;
    const level = m[1].length;
    const title = m[2];
    while (parents.length && parents[parents.length - 1].level >= level) parents.pop();
    const parent = parents[parents.length - 1];
    let id = null;
    const num = /^(\d+(?:\.\d+)*)\.?\s/.exec(title);
    const letter = /^([A-Z])\s+[—–-]\s/.exec(title);
    if (num) id = num[1];
    else if (letter && parent?.id) id = `${parent.id}.${letter[1]}`;
    const head = { id, level, line: i + 1 };
    heads.push(head);
    parents.push(head);
  });
  const index = new Map();
  heads.forEach((h, k) => {
    if (!h.id) return;
    const next = heads.slice(k + 1).find((o) => o.level <= h.level);
    index.set(h.id, { start: h.line, end: next ? next.line - 1 : lines.length });
  });
  return index;
}

/** Citations per checklist line: [{ line, text, refs: [{ doc, section } | { adr }] }]. */
function citations(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const refs = [];
    // Citations live in parentheses; a bare § in running prose is not one.
    for (const group of line.replace(/"[^"]*"/g, '""').matchAll(/\(([^()]*)\)/g)) {
      let doc = null;
      for (const m of group[1].matchAll(TOKEN)) {
        if (m[1]) doc = m[1];
        else if (m[2]) refs.push({ adr: m[2] });
        else refs.push({ doc, section: m[3] });
      }
    }
    if (refs.length) out.push({ line: i + 1, text: line.trim(), refs });
  });
  return out;
}

const adrFiles = readdirSync(join(ARCH, 'DECISIONS'));
const adrFile = (n) => adrFiles.find((f) => f.startsWith(`ADR-${n}-`));
const index = Object.fromEntries(
  DOCS.map((d) => [d, sections(readFileSync(join(ARCH, `${d}.md`), 'utf8'))]),
);
const cited = citations(readFileSync(CHECKLIST, 'utf8'));

// Check 1: every citation resolves.
const broken = [];
for (const c of cited) {
  for (const r of c.refs) {
    if (r.adr && !adrFile(r.adr)) broken.push(`${c.line}: ADR-${r.adr} does not exist`);
    else if (!r.adr && !r.doc) broken.push(`${c.line}: §${r.section} names no document`);
    else if (!r.adr && !index[r.doc].has(r.section)) broken.push(`${c.line}: ${r.doc} §${r.section} does not exist`);
  }
}
if (broken.length) {
  console.error(`CLIENT-OBLIGATIONS.md cites what is not there:\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log(`CLIENT-OBLIGATIONS.md: ${cited.length} citing lines, all citations resolve.`);

// Check 2: cited sections changed since <baseRef> without the checklist changing.
const base = process.argv[2];
if (!base) process.exit(0);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const changedFiles = git('diff', '--name-only', `${base}...HEAD`, '--', ARCH).split('\n').filter(Boolean);
if (changedFiles.includes(CHECKLIST)) {
  console.log('CLIENT-OBLIGATIONS.md changed in this range; reviewed together.');
  process.exit(0);
}
const changedLines = {}; // doc → line numbers in HEAD, or 'all' for an ADR
for (const file of changedFiles) {
  const adr = /DECISIONS\/ADR-(\d{3})-/.exec(file);
  if (adr) { changedLines[`ADR-${adr[1]}`] = 'all'; continue; }
  const doc = DOCS.find((d) => file === `${ARCH}/${d}.md`);
  if (!doc || !existsSync(file)) continue;
  const lines = [];
  for (const h of git('diff', '-U0', `${base}...HEAD`, '--', file).matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(h[1]);
    const count = h[2] === undefined ? 1 : Number(h[2]);
    for (let n = start; n < start + Math.max(count, 1); n++) lines.push(n);
  }
  changedLines[doc] = lines;
}
const stale = [];
for (const c of cited) {
  for (const r of c.refs) {
    if (r.adr) {
      if (changedLines[`ADR-${r.adr}`]) stale.push(`${c.line}: ADR-${r.adr} changed`);
      continue;
    }
    const span = index[r.doc].get(r.section);
    const lines = changedLines[r.doc];
    if (Array.isArray(lines) && lines.some((n) => n >= span.start && n <= span.end)) {
      stale.push(`${c.line}: ${r.doc} §${r.section} changed`);
    }
  }
}
if (!stale.length) {
  console.log('No cited section changed.');
  process.exit(0);
}
const report = `Cited sections changed but CLIENT-OBLIGATIONS.md did not:\n  ${[...new Set(stale)].join('\n  ')}`;
if (process.env.OBLIGATIONS_ACK === '1') {
  console.log(`${report}\nAcknowledged (OBLIGATIONS_ACK=1): these changes affect no obligation.`);
  process.exit(0);
}
console.error(`${report}\nUpdate the checklist, or label the PR "obligations-unchanged" if no obligation is affected.`);
process.exit(1);
