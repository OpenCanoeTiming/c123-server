#!/usr/bin/env node

/**
 * Prepare installer payload for Inno Setup.
 *
 * Creates build-output/ with a deterministic layout matching the final install:
 *   build-output/
 *   ├── runtime/
 *   │   └── node.exe              # portable Node.js runtime (Win x64)
 *   ├── app/
 *   │   ├── dist/                 # compiled TypeScript + copied admin-ui
 *   │   ├── node_modules/         # production dependencies only
 *   │   └── package.json
 *   ├── LICENSE
 *   └── README.txt
 *
 * Also writes installer/iss-defines.iss with the current version + commit
 * so the .iss script can pick them up via #include.
 *
 * Node.js runtime is downloaded once and cached in .cache/node-runtime/.
 * The zip is extracted with PowerShell's Expand-Archive, which is built into
 * every Windows 10+ machine and GitHub Actions windows-latest runners.
 *
 * Intentionally Windows-only — this script produces a Windows installer
 * payload and is not expected to run on Linux/macOS.
 */

import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Hard-fail early on non-Windows — the script uses PowerShell Expand-Archive
// and downloads node.exe. Running it on Linux/macOS would fail opaquely
// somewhere in the middle.
if (process.platform !== 'win32') {
  console.error('[payload] FAILED: This script is Windows-only (runs on Windows or GitHub Actions windows-latest).');
  process.exit(1);
}

// Pin Node.js LTS version. Keep in sync with engines.node in package.json.
const NODE_VERSION = process.env.C123_NODE_RUNTIME_VERSION ?? '20.19.1';
const NODE_ARCH = 'win-x64';
const NODE_FOLDER = `node-v${NODE_VERSION}-${NODE_ARCH}`;
const NODE_ZIP_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FOLDER}.zip`;

const BUILD_OUTPUT = join(projectRoot, 'build-output');
const APP_DIR = join(BUILD_OUTPUT, 'app');
const RUNTIME_DIR = join(BUILD_OUTPUT, 'runtime');
const CACHE_ROOT = join(projectRoot, '.cache', 'node-runtime');
const CACHED_NODE_EXE = join(CACHE_ROOT, NODE_FOLDER, 'node.exe');

function log(msg) {
  console.log(`[payload] ${msg}`);
}

function cleanBuildOutput() {
  log('Cleaning build-output/');
  rmSync(BUILD_OUTPUT, { recursive: true, force: true });
  mkdirSync(BUILD_OUTPUT, { recursive: true });
}

function runBuild() {
  log('Running npm run build');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
}

function stageApp() {
  log('Staging app/');
  mkdirSync(APP_DIR, { recursive: true });

  // Compiled output (includes dist/admin-ui copied by scripts/copy-admin-ui.js)
  cpSync(join(projectRoot, 'dist'), join(APP_DIR, 'dist'), { recursive: true });

  // package.json MUST be shipped — "type": "module" is required for ESM resolution at runtime,
  // and the version field drives the update-check banner.
  cpSync(join(projectRoot, 'package.json'), join(APP_DIR, 'package.json'));
  cpSync(join(projectRoot, 'package-lock.json'), join(APP_DIR, 'package-lock.json'));

  // Install prod deps only. --ignore-scripts skips sync-design-system postinstall
  // which would fail here (it looks for ../timing-design-system/ relative to projectRoot).
  // Optional deps (node-windows, systray2) are kept because npm defaults to including them.
  log('Installing production dependencies in app/');
  execSync('npm ci --omit=dev --ignore-scripts --no-audit --no-fund', {
    cwd: APP_DIR,
    stdio: 'inherit',
  });

  // package-lock.json is not needed in the shipped app.
  rmSync(join(APP_DIR, 'package-lock.json'), { force: true });

  // npm ci with --omit=dev leaves behind empty scope directories (e.g. @eslint/, @vitest/)
  // for the skipped dev dependency scopes. They take zero bytes but clutter node_modules —
  // remove them so the installer payload is clean.
  pruneEmptyDirs(join(APP_DIR, 'node_modules'));
}

function pruneEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    try {
      if (readdirSync(full).length === 0) {
        rmSync(full, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // not a directory — ignore
    }
  }
  if (removed > 0) log(`Pruned ${removed} empty scope dirs from node_modules`);
}

async function ensureNodeRuntime() {
  if (existsSync(CACHED_NODE_EXE)) {
    log(`Using cached Node.js runtime: ${CACHED_NODE_EXE}`);
    return;
  }

  log(`Downloading Node.js ${NODE_VERSION} (${NODE_ARCH})`);
  mkdirSync(CACHE_ROOT, { recursive: true });

  const response = await fetch(NODE_ZIP_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${NODE_ZIP_URL}: HTTP ${response.status}`);
  }

  const zipPath = join(CACHE_ROOT, `${NODE_FOLDER}.zip`);
  await pipeline(response.body, createWriteStream(zipPath));

  log('Extracting Node.js zip');
  // Expand-Archive is built into every Windows 10+ PowerShell install.
  // -LiteralPath avoids wildcard interpretation of paths containing []/?.
  execSync(
    `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${CACHE_ROOT}' -Force"`,
    { stdio: 'inherit' },
  );
  rmSync(zipPath, { force: true });

  if (!existsSync(CACHED_NODE_EXE)) {
    throw new Error(`node.exe not found after extraction: ${CACHED_NODE_EXE}`);
  }
}

function stageRuntime() {
  log('Staging runtime/');
  mkdirSync(RUNTIME_DIR, { recursive: true });
  cpSync(CACHED_NODE_EXE, join(RUNTIME_DIR, 'node.exe'));
}

function stageDocs() {
  log('Staging LICENSE + README.txt');
  const licenseSrc = join(projectRoot, 'LICENSE');
  if (existsSync(licenseSrc)) {
    cpSync(licenseSrc, join(BUILD_OUTPUT, 'LICENSE'));
  }

  const readmeText = [
    'C123 Server',
    '===========',
    '',
    'C123 Server runs as a tray application — start it from the Start Menu.',
    'A system tray icon shows the server status (green/yellow/red).',
    '',
    'Admin dashboard:',
    '  http://localhost:27123',
    '',
    'Stop the server:',
    '  Right-click the tray icon -> Quit',
    '  or press Ctrl+C if running from a command prompt',
    '',
    'Uninstall:',
    '  Settings -> Apps -> "C123 Server" -> Uninstall',
    '',
    'User settings (preserved across upgrades and uninstall):',
    '  %APPDATA%\\c123-server\\settings.json',
    '',
    'Documentation and issue tracker:',
    '  https://github.com/OpenCanoeTiming/c123-server',
    '',
  ].join('\r\n');
  writeFileSync(join(BUILD_OUTPUT, 'README.txt'), readmeText);
}

function compileStampAumid() {
  const cscExe = join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe',
  );
  if (!existsSync(cscExe)) {
    throw new Error(`csc.exe not found at ${cscExe} — .NET Framework 4.x is required`);
  }

  const srcFile = join(projectRoot, 'installer', 'stamp-aumid.cs');
  const outFile = join(BUILD_OUTPUT, 'stamp-aumid.exe');
  log('Compiling stamp-aumid.exe');
  execSync(
    `"${cscExe}" /nologo /optimize /platform:anycpu /out:"${outFile}" "${srcFile}"`,
    { cwd: projectRoot, stdio: 'inherit' },
  );
  if (!existsSync(outFile)) {
    throw new Error('stamp-aumid.exe compilation produced no output');
  }
}

function writeIssDefines() {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
  const version = pkg.version ?? '0.0.0';

  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: projectRoot })
      .toString()
      .trim();
  } catch {
    // not a git checkout — fine
  }

  const defines = [
    '; Auto-generated by scripts/prepare-installer-payload.js — do not edit.',
    `#define AppVersion "${version}"`,
    `#define BuildCommit "${commit}"`,
    '',
  ].join('\r\n');

  const installerDir = join(projectRoot, 'installer');
  mkdirSync(installerDir, { recursive: true });
  writeFileSync(join(installerDir, 'iss-defines.iss'), defines);
  log(`Wrote installer/iss-defines.iss (version=${version}, commit=${commit})`);
}

async function main() {
  try {
    cleanBuildOutput();
    runBuild();
    stageApp();
    await ensureNodeRuntime();
    stageRuntime();
    stageDocs();
    compileStampAumid();
    writeIssDefines();
    log(`Payload ready at: ${BUILD_OUTPUT}`);
  } catch (err) {
    console.error(`[payload] FAILED: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main();
