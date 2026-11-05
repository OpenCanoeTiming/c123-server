/**
 * Real adapters for the injected seams of `src/ingest/` (kept out of it so the ingest purity rule stands):
 * the production `Clock` (TEST-ARCHITECTURE §5) and the `fs` the XML reader polls through (#202).
 */
import { readFile, stat } from 'node:fs/promises';
import type { Clock, XmlFs } from '../ingest/xml-reader.js';

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
