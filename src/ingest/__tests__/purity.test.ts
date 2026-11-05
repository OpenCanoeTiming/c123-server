import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// #201 Shape: pure, no I/O, no clock (TEST-ARCHITECTURE §5). Static check of src/ingest/ outside __tests__.
const ingest = join(dirname(fileURLToPath(import.meta.url)), '..');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === '__tests__') return [];
    return statSync(p).isDirectory() ? sources(p) : /\.[cm]?tsx?$/.test(n) ? [p] : [];
  });
}
describe('purity', () => {
  it('no clock, no I/O: src/ingest/index.ts exists (the module under test)', () => {
    expect(existsSync(join(ingest, 'index.ts'))).toBe(true);
  });
  it('no clock, no I/O: no import of fs, net, http(s), dgram, child_process, path-to-disk modules', () => {
    for (const f of sources(ingest)) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/from\s+['"](node:)?(fs|fs\/promises|net|dgram|http|https|tls|child_process|worker_threads|os)['"]/);
      expect(s, f).not.toMatch(/require\(\s*['"](node:)?(fs|net|dgram|http|https|child_process)['"]\s*\)/);
    }
  });
  it('no clock, no I/O: no Date.now(), no argument-less new Date(), no performance.now(), no timers', () => {
    for (const f of sources(ingest)) {
      const s = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(s, f).not.toMatch(/Date\.now\s*\(/);
      expect(s, f).not.toMatch(/new\s+Date\s*\(\s*\)/);
      expect(s, f).not.toMatch(/performance\.now\s*\(/);
      expect(s, f).not.toMatch(/\b(setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/);
    }
  });
  it('no clock, no I/O: no process.env, no fetch, no console I/O', () => {
    for (const f of sources(ingest)) {
      const s = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(s, f).not.toMatch(/process\.env|\bfetch\s*\(|console\./);
    }
  });
});
