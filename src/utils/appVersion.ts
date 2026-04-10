/**
 * Application version — read once at module load from package.json.
 *
 * Works in both dev (tsx runs src/utils/appVersion.ts) and prod (compiled
 * dist/utils/appVersion.js) because the relative path "../../package.json"
 * resolves to the project root in both cases.
 *
 * Separate from the hardcoded VERSION = '2.0.0' constant in UnifiedServer —
 * that is the wire-protocol version used in /api/status and /api/info.
 * APP_VERSION is the semver from package.json used for update checks.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readVersion();

/**
 * Compare two semver-like version strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 *
 * Handles "x.y.z" and "x.y.z-suffix". Pre-release suffixes are sorted
 * lexicographically and considered LOWER than the corresponding release
 * (e.g. "1.0.0-rc1" < "1.0.0"). Simple enough for our update-check use case.
 */
export function compareVersions(a: string, b: string): number {
  const [mainA, preA] = splitSemver(a);
  const [mainB, preB] = splitSemver(b);

  for (let i = 0; i < Math.max(mainA.length, mainB.length); i++) {
    const x = mainA[i] ?? 0;
    const y = mainB[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }

  // Main parts equal — pre-release < release < pre-release with higher tag
  if (preA === '' && preB === '') return 0;
  if (preA === '') return 1; // "1.0.0" > "1.0.0-rc1"
  if (preB === '') return -1;
  return preA < preB ? -1 : preA > preB ? 1 : 0;
}

function splitSemver(v: string): [number[], string] {
  const cleaned = v.replace(/^v/i, '').trim();
  const dashIdx = cleaned.indexOf('-');
  const mainStr = dashIdx >= 0 ? cleaned.slice(0, dashIdx) : cleaned;
  const preStr = dashIdx >= 0 ? cleaned.slice(dashIdx + 1) : '';
  const main = mainStr.split('.').map((p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  });
  return [main, preStr];
}
