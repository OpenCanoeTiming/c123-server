/**
 * Cross-platform script to copy admin-ui to dist folder
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const src = join(rootDir, 'src', 'admin-ui');
const dest = join(rootDir, 'dist', 'admin-ui');

// Ensure dist exists
if (!existsSync(join(rootDir, 'dist'))) {
  mkdirSync(join(rootDir, 'dist'), { recursive: true });
}

// Copy admin-ui folder
cpSync(src, dest, { recursive: true });

console.log('✓ Copied admin-ui to dist/');
