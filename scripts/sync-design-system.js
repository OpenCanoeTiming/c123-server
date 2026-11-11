#!/usr/bin/env node

/**
 * Copy the design system's built CSS and fonts into src/admin-ui/vendor/.
 *
 * The copy is not committed (see .gitignore). Both servers serve src/admin-ui (dev)
 * or dist/admin-ui (build, copied by scripts/copy-admin-ui.js) as static files, so the
 * design system is a build-time input and never a runtime dependency.
 *
 * Runs on:
 * - postinstall: a missing package is a warning (e.g. `npm ci --omit=dev`)
 * - prebuild (--strict): a missing package fails the build
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

// Primary: the npm package (GitHub Packages). Fallback: a sibling checkout that has been built.
const candidates = [
  join(projectRoot, 'node_modules', '@opencanoetiming', 'timing-design-system', 'dist'),
  join(projectRoot, '..', 'timing-design-system', 'dist'),
];
const source = candidates.find((dir) => existsSync(join(dir, 'timing.css')));
const target = join(projectRoot, 'src', 'admin-ui', 'vendor');

if (!source) {
  console.error('timing-design-system dist not found in:\n  ' + candidates.join('\n  '));
  if (strict) process.exit(1);
  console.error('Skipping: the admin UI is unstyled until `npm install` provides the package.');
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(join(source, 'timing.css'), join(target, 'timing.css'));
cpSync(join(source, 'fonts'), join(target, 'fonts'), { recursive: true });
console.log('✓ Synced timing.css and fonts from timing-design-system to src/admin-ui/vendor/');
