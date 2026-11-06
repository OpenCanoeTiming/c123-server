/**
 * Real adapters for the injected seams of `src/ingest/` (kept out of it so the ingest purity rule stands):
 * the production `Clock` (TEST-ARCHITECTURE §5) and the `fs` the XML reader polls through (#202).
 */
import { mkdir, open, readFile, readdir, rename, stat, unlink } from 'node:fs/promises';
import type { Clock, XmlFs } from '../ingest/xml-reader.js';
import type { ChecksFs } from '../store/checks.js';

export function createRealClock(): Clock {
  return {
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => { clearTimeout(h); },
    requestFrame: (fn) => setTimeout(() => { fn(Date.now()); }, 16),
    cancelFrame: (h) => { clearTimeout(h); },
  };
}

export function createRealXmlFs(): XmlFs {
  return {
    stat: async (path) => { const s = await stat(path); return { mtimeMs: s.mtimeMs, size: s.size }; },
    read: (path) => readFile(path, 'utf8'),
  };
}

const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY']);

/**
 * The checks store's filesystem (#211). `writeFile` syncs to disk before it resolves. `rename` replaces an existing
 * target in one step: POSIX rename(2) on Linux, MoveFileEx with REPLACE_EXISTING on win32 (what Node's rename uses);
 * on win32 a transient EPERM/EACCES/EBUSY (antivirus or indexer holding the target) is retried a few times.
 */
export function createRealChecksFs(): ChecksFs {
  return {
    mkdir: async (dir) => { await mkdir(dir, { recursive: true }); },
    readFile: (path) => readFile(path, 'utf8'),
    writeFile: async (path, data) => {
      const h = await open(path, 'w');
      try { await h.writeFile(data, 'utf8'); await h.sync(); } finally { await h.close(); }
    },
    rename: async (from, to) => {
      for (let attempt = 0; ; attempt++) {
        try { await rename(from, to); break; } catch (e) {
          const code = (e as { code?: string }).code ?? '';
          if (process.platform !== 'win32' || !RETRYABLE.has(code) || attempt >= 5) throw e;
          await new Promise<void>((r) => setTimeout(r, 20 * (attempt + 1)));
        }
      }
      if (process.platform !== 'win32') {
        // make the rename itself durable; directories cannot be opened for sync on win32
        const d = await open(to.replace(/[/\\][^/\\]*$/, '') || '.', 'r');
        try { await d.sync(); } finally { await d.close(); }
      }
    },
    readdir: (dir) => readdir(dir),
    unlink: (path) => unlink(path),
  };
}
