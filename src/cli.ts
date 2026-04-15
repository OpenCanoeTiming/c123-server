#!/usr/bin/env node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { format } from 'node:util';
import { Server, ServerConfig } from './server.js';
import { Logger } from './utils/logger.js';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  config: ServerConfig;
  debug: boolean;
  noTray: boolean;
} {
  const args = process.argv.slice(2);
  let debug = false;
  let noTray = false;
  const config: ServerConfig = {};

  // Environment variables for port (C123_SERVER_PORT takes precedence over PORT)
  const envPort = process.env.C123_SERVER_PORT || process.env.PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
      config.port = parsed;
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--version' || arg === '-v') {
      console.log('c123-server v0.9.0');
      process.exit(0);
    }

    if (arg === '--host' && args[i + 1]) {
      config.tcpHost = args[++i];
      config.autoDiscovery = false;
    }

    if (arg === '--port' && args[i + 1]) {
      config.tcpPort = parseInt(args[++i], 10);
    }

    if (arg === '--server-port' && args[i + 1]) {
      config.port = parseInt(args[++i], 10);
    }

    if (arg === '--xml' && args[i + 1]) {
      config.xmlPath = args[++i];
    }

    if (arg === '--no-discovery') {
      config.autoDiscovery = false;
    }

    if (arg === '--no-autodetect') {
      config.xmlAutoDetect = false;
    }

    if (arg === '--debug' || arg === '-d') {
      debug = true;
    }

    if (arg === '--no-tray') {
      noTray = true;
    }
  }

  return { config, debug, noTray };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
c123-server - C123 to Scoreboard bridge

Usage: c123-server [options]

Options:
  --host <ip>         C123 host IP (disables auto-discovery)
  --port <port>       C123 source port (default: 27333)
  --server-port <p>   Server port for HTTP + WebSocket (default: 27123)
  --xml <path>        XML file path for results data
  --no-discovery      Disable UDP auto-discovery
  --no-autodetect     Disable Canoe123 XML autodetection (Windows)
  --no-tray           Disable system tray icon
  -d, --debug         Enable verbose debug logging
  -h, --help          Show this help message
  -v, --version       Show version

Environment variables:
  C123_SERVER_PORT    Server port (overrides default, overridden by --server-port)
  PORT                Fallback for server port (if C123_SERVER_PORT not set)

Examples:
  c123-server                     # Run with auto-discovery
  c123-server --host 192.168.1.5  # Connect to specific C123
  c123-server --no-tray           # Headless mode (no tray icon)
`);
}

/**
 * Return the C123 Server user-settings directory for the current platform.
 * Matches AppSettingsManager.getSettingsPath() so both live in the same dir.
 *   Windows: %APPDATA%\c123-server
 *   Linux/macOS: ~/.c123-server
 */
function getAppDataDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'c123-server');
  }
  return path.join(os.homedir(), '.c123-server');
}

/**
 * Tee console.{log,error,warn,debug} to a log file in the app-data dir.
 *
 * Why: under `wscript.exe launcher.vbs` stdout/stderr are discarded, so
 * a silently crashing server at login leaves zero diagnostic trail. This
 * patch intercepts at the console level (rather than replacing Logger)
 * because Logger already writes through console.*, so we catch all log
 * output with minimal surface area.
 *
 * Rotation: on startup, if the existing log is larger than LOG_ROTATE_SIZE
 * bytes, rename it to `.old` (overwriting any prior `.old`). This is a
 * single-generation rotation — good enough for a human operator debugging a
 * startup failure, and never grows unbounded.
 *
 * @returns the log file path, or null if setup failed (directory not writable etc.)
 */
function setupFileLog(): string | null {
  const LOG_ROTATE_SIZE = 512 * 1024; // 512 KB
  try {
    const dir = getAppDataDir();
    fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, 'server.log');

    try {
      if (fs.statSync(logPath).size > LOG_ROTATE_SIZE) {
        fs.renameSync(logPath, logPath + '.old');
      }
    } catch {
      // File doesn't exist yet — nothing to rotate.
    }

    const origLog = console.log.bind(console);
    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);
    const origDebug = console.debug.bind(console);

    // Strip ANSI escape codes so the file stays readable in Notepad/less.
    // eslint-disable-next-line no-control-regex
    const ansiEscapeRegex = /\x1b\[[0-9;]*m/g;

    const writeToFile = (...args: unknown[]): void => {
      try {
        const line = format(...args).replace(ansiEscapeRegex, '');
        fs.appendFileSync(logPath, line + '\n');
      } catch {
        // Logging itself failed — nothing useful we can do.
      }
    };

    console.log = (...args: unknown[]) => {
      origLog(...args);
      writeToFile(...args);
    };
    console.error = (...args: unknown[]) => {
      origError(...args);
      writeToFile(...args);
    };
    console.warn = (...args: unknown[]) => {
      origWarn(...args);
      writeToFile(...args);
    };
    console.debug = (...args: unknown[]) => {
      origDebug(...args);
      writeToFile(...args);
    };

    return logPath;
  } catch {
    return null;
  }
}

/**
 * Check if another instance of C123 Server is already running on the given port.
 * Makes a quick HTTP request to /api/status — if it responds, another instance is up.
 */
async function checkSingleInstance(port: number): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`http://localhost:${port}/api/status`, {
      signal: controller.signal,
    });
    if (res.ok) {
      Logger.error('CLI', `C123 Server is already running on port ${port}`);
      Logger.error('CLI', 'Stop the existing instance first, or use --server-port to pick a different port.');
      process.exit(1);
    }
  } catch {
    // Connection refused or timeout — port is free, proceed normally
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Run the server
 */
async function runServer(config: ServerConfig, debug: boolean, noTray: boolean): Promise<void> {
  // Configure log level based on debug flag
  if (debug) {
    Logger.setLevel('debug');
  }

  // When launched via wscript.exe (no TTY), tee log output to a file so
  // startup failures leave a diagnostic trail.
  if (!process.stdout.isTTY) {
    const logPath = setupFileLog();
    if (logPath) {
      Logger.debug('CLI', `Log file: ${logPath}`);
    }
  }

  const server = new Server(config);

  // Initialize from saved settings (unless overridden by CLI args)
  server.initFromSettings();

  // Single-instance guard: check if another server is already running
  await checkSingleInstance(server.getPort());

  // Initialize tray early so the initial menu uses the latest status when start() is called
  let tray: import('./tray/TrayManager.js').TrayManager | null = null;
  if (!noTray) {
    try {
      const { TrayManager } = await import('./tray/TrayManager.js');
      tray = new TrayManager({ port: server.getPort(), onQuit: () => shutdown() });
    } catch {
      // TrayManager import failed — continue without tray
    }
  }
  const { NotificationManager } = await import('./tray/NotificationManager.js');
  const notifications = new NotificationManager();

  const shutdown = async () => {
    Logger.info('CLI', 'Shutting down...');
    tray?.stop();
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Error handling
  server.on('error', (err) => {
    Logger.error('Server', err.message, err);
    tray?.setStatus('error', err.message);
    notifications.notify({ title: 'C123 Server', message: err.message, type: 'error' });
  });

  server.on('tcpConnected', (host) => {
    Logger.info('Server', `Connected to C123 at ${host}`);
    tray?.setStatus('ok', `Connected to C123 at ${host}`);
    notifications.notify({ title: 'C123 Server', message: `Connected to C123 at ${host}`, type: 'info' });
  });

  server.on('tcpDisconnected', () => {
    Logger.warn('Server', 'Disconnected from C123, reconnecting...');
    tray?.setStatus('warning', 'Disconnected from C123');
    notifications.notify({ title: 'C123 Server', message: 'Disconnected from C123', type: 'warning' });
  });

  server.on('clientDisconnected', (sessionId) => {
    notifications.notify({ title: 'C123 Server', message: `Client disconnected: ${sessionId}`, type: 'warning' });
  });

  server.on('liveError', (message) => {
    notifications.notify({ title: 'C123 Server — Live', message, type: 'error' });
  });

  server.on('xmlMismatch', (message) => {
    notifications.notify({ title: 'C123 Server — XML', message, type: 'warning' });
  });

  server.on('xmlMismatchResolved', () => {
    notifications.notify({ title: 'C123 Server — XML', message: 'XML mismatch resolved', type: 'info' });
  });

  // Start
  try {
    await server.start();
    const port = server.getPort();
    Logger.info('CLI', 'C123 Server started');
    Logger.info('CLI', `Dashboard: http://localhost:${port}`);
    Logger.info('CLI', `WebSocket: ws://localhost:${port}/ws`);
    Logger.info('CLI', `REST API:  http://localhost:${port}/api/*`);

    if (config.autoDiscovery !== false && !config.tcpHost) {
      Logger.info('CLI', 'Waiting for C123 discovery...');
    }
  } catch (err) {
    Logger.error('CLI', 'Failed to start server', err);
    process.exit(1);
  }

  // Start tray icon outside server try/catch — tray failure must not kill the server.
  // TrayManager was created early (above) so setStatus() calls update internal fields.
  // start() then uses the latest status when creating the icon.
  if (tray) {
    try {
      await tray.start();
    } catch (err) {
      Logger.debug('CLI', `Tray icon not available: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { config, debug, noTray } = parseArgs();
  await runServer(config, debug, noTray);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
