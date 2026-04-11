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
 * Handles "x.y.z" and "x.y.z-pre.release.parts". Pre-release ordering follows
 * the semver 2.0 spec §11:
 *   - A version with pre-release has lower precedence than the same without
 *     ("1.0.0-rc.1" < "1.0.0").
 *   - Pre-release identifiers are compared dot-separated. Numeric identifiers
 *     compare numerically (so "rc.2" < "rc.10"), non-numeric lexically,
 *     numeric < non-numeric, and a longer set wins if all prefix parts equal.
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
  if (preA.length === 0 && preB.length === 0) return 0;
  if (preA.length === 0) return 1; // "1.0.0" > "1.0.0-rc.1"
  if (preB.length === 0) return -1;
  return comparePreRelease(preA, preB);
}

function comparePreRelease(a: string[], b: string[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const cmp = comparePreReleasePart(a[i]!, b[i]!);
    if (cmp !== 0) return cmp;
  }
  // All shared identifiers equal — longer set wins (semver §11).
  if (a.length < b.length) return -1;
  if (a.length > b.length) return 1;
  return 0;
}

function comparePreReleasePart(a: string, b: string): number {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum && bNum) {
    const ai = Number(a);
    const bi = Number(b);
    return ai < bi ? -1 : ai > bi ? 1 : 0;
  }
  // Per semver §11: numeric identifiers always have lower precedence than
  // non-numeric (e.g. "1.0.0-1" < "1.0.0-alpha").
  if (aNum) return -1;
  if (bNum) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function splitSemver(v: string): [number[], string[]] {
  const cleaned = v.replace(/^v/i, '').trim();
  // Strip build metadata (ignored for precedence per semver §10).
  const plusIdx = cleaned.indexOf('+');
  const noMeta = plusIdx >= 0 ? cleaned.slice(0, plusIdx) : cleaned;
  const dashIdx = noMeta.indexOf('-');
  const mainStr = dashIdx >= 0 ? noMeta.slice(0, dashIdx) : noMeta;
  const preStr = dashIdx >= 0 ? noMeta.slice(dashIdx + 1) : '';
  const main = mainStr.split('.').map((p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  });
  const pre = preStr.length > 0 ? preStr.split('.') : [];
  return [main, pre];
}
