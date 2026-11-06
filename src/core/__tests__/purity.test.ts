import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Row 10 (#203): the core is pure, no wall clock, no timers, no I/O; time comes only from the elements (TEST-ARCHITECTURE §5; #203 Interface).
// Static check of src/core/ outside __tests__, after src/ingest/__tests__/purity.test.ts.
const core = join(dirname(fileURLToPath(import.meta.url)), '..');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === '__tests__') return [];
    return statSync(p).isDirectory() ? sources(p) : /\.[cm]?tsx?$/.test(n) ? [p] : [];
  });
}
const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const NODE_IO = '(fs|fs/promises|net|dgram|http|https|http2|tls|child_process|worker_threads|cluster|os|dns|stream|readline|timers|timers/promises|perf_hooks|process|path)';

describe('purity of src/core (#203 Interface)', () => {
  it('src/core/index.ts exists (the module under test) and has sources', () => {
    expect(existsSync(join(core, 'index.ts'))).toBe(true);
    expect(sources(core).length).toBeGreaterThan(0);
  });
  it('imports nothing from Node\'s clock, timers, fs or net (static, dynamic and require forms)', () => {
    expect(existsSync(join(core, 'index.ts'))).toBe(true);
    for (const f of sources(core)) {
      const s = code(f);
      expect(s, f).not.toMatch(new RegExp(`from\\s+['"](node:)?${NODE_IO}['"]`));
      expect(s, f).not.toMatch(new RegExp(`(require|import)\\(\\s*['"](node:)?${NODE_IO}['"]\\s*\\)`));
      expect(s, f).not.toMatch(new RegExp(`^\\s*import\\s+['"](node:)?${NODE_IO}['"]`, 'm'));
    }
  });
  it('reads no clock: no Date.now, no argument-less new Date, no performance.now, no timers, no Math.random', () => {
    expect(existsSync(join(core, 'index.ts'))).toBe(true);
    for (const f of sources(core)) {
      const s = code(f);
      expect(s, f).not.toMatch(/Date\.now\s*\(/);
      expect(s, f).not.toMatch(/new\s+Date\s*\(\s*\)/);
      expect(s, f).not.toMatch(/\bDate\s*\(\s*\)/);
      expect(s, f).not.toMatch(/performance\.now\s*\(/);
      expect(s, f).not.toMatch(/\b(setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/);
      expect(s, f).not.toMatch(/Math\.random\s*\(/);
      expect(s, f).not.toMatch(/process\.hrtime/);
    }
  });
  it('does no I/O: no process.env, no fetch, no console', () => {
    expect(existsSync(join(core, 'index.ts'))).toBe(true);
    for (const f of sources(core)) {
      const s = code(f);
      expect(s, f).not.toMatch(/process\.(env|stdout|stderr)|\bfetch\s*\(|console\./);
    }
  });
});
