#!/usr/bin/env node

/**
 * Sync timing.css from timing-design-system to admin-ui
 *
 * Runs on:
 * - postinstall (after npm install)
 * - prebuild (before build)
 *
 * Fallback: if timing-design-system not found, keeps existing file (offline mode)
 */

import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Primary: from npm package (GitHub Packages)
const SOURCE_PKG = join(projectRoot, 'node_modules', '@opencanoetiming', 'timing-design-system', 'dist', 'timing.css');
// Fallback: from sibling folder (local development without npm install)
const SOURCE_LOCAL = join(projectRoot, '..', 'timing-design-system', 'dist', 'timing.css');
const SOURCE = existsSync(SOURCE_PKG) ? SOURCE_PKG : SOURCE_LOCAL;
const TARGET = join(projectRoot, 'src', 'admin-ui', 'timing.css');

function sync() {
  // Check if source exists
  if (!existsSync(SOURCE)) {
    console.log('⚠️  timing-design-system not found at:', SOURCE);
    console.log('   Keeping existing timing.css (offline mode)');
    return;
  }

  // Ensure target directory exists
  const targetDir = dirname(TARGET);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Copy file
  try {
    copyFileSync(SOURCE, TARGET);
    console.log('✓ Synced timing.css from timing-design-system');
  } catch (err) {
    console.error('✗ Failed to sync timing.css:', err.message);
    process.exit(1);
  }
}

sync();
