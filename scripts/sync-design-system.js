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

const SOURCE = join(projectRoot, '..', 'timing-design-system', 'dist', 'timing.css');
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
