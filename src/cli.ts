#!/usr/bin/env node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { format } from 'node:util';
import { Server, ServerConfig } from './server.js';
import { Logger } from './utils/logger.js';
import { mapStatusResponse, type MinimalStatusResponse } from './tray/statusMapping.js';

/**
 * Parse command line arguments
 */
interface TrayOptions {
  targetUrl: string;
  pollIntervalMs: number;
}

function parseArgs(): {
  command: string;
  config: ServerConfig;
  debug: boolean;
  noTray: boolean;
  tray: TrayOptions;
} {
  const args = process.argv.slice(2);
  let command = 'run';
  let debug = false;
  let noTray = false;
  const config: ServerConfig = {};
  const tray: TrayOptions = {
    targetUrl: 'http://localhost:27123',
    pollIntervalMs: 3000,
  };

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

    if (
      arg === 'install' ||
      arg === 'uninstall' ||
      arg === 'start' ||
      arg === 'stop' ||
      arg === 'run' ||
      arg === 'tray'
    ) {
      command = arg;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--version' || arg === '-v') {
      console.log('c123-server v0.1.0');
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

    if (arg === '--target-url' && args[i + 1]) {
      tray.targetUrl = args[++i];
    }

    if (arg === '--poll-interval' && args[i + 1]) {
      const parsed = parseInt(args[++i], 10);
      if (!isNaN(parsed) && parsed >= 500) {
        tray.pollIntervalMs = parsed;
      }
    }
  }

  return { command, config, debug, noTray, tray };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
c123-server - C123 to Scoreboard bridge

Usage: c123-server [command] [options]

Commands:
  run         Run the server (default)
  tray        Run the standalone tray monitor (polls a running server over HTTP)
  install     Install as Windows service
  uninstall   Uninstall Windows service
  start       Start the Windows service
  stop        Stop the Windows service

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

Tray-only options (use with \`tray\` command):
  --target-url <url>   Server URL to poll (default: http://localhost:27123)
  --poll-interval <ms> Poll interval in milliseconds, min 500 (default: 3000)

Environment variables:
  C123_SERVER_PORT    Server port (overrides default, overridden by --server-port)
  PORT                Fallback for server port (if C123_SERVER_PORT not set)

Examples:
  c123-server                     # Run with auto-discovery
  c123-server --host 192.168.1.5  # Connect to specific C123
  c123-server install             # Install as Windows service
  c123-server tray                # Run standalone tray monitor (user session)
`);
}

/**
 * Run the server
 */
async function runServer(config: ServerConfig, debug: boolean, noTray: boolean): Promise<void> {
  // Configure log level based on debug flag
  if (debug) {
    Logger.setLevel('debug');
  }

  const server = new Server(config);

  // Initialize from saved settings (unless overridden by CLI args)
  server.initFromSettings();

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
 * Why: under `wscript.exe tray-launcher.vbs` stdout/stderr are discarded, so
 * a silently crashing tray at login leaves zero diagnostic trail. This patch
 * intercepts at the console level (rather than replacing Logger) because
 * Logger already writes through console.*, so we catch all log output with
 * minimal surface area.
 *
 * Rotation: on startup, if the existing log is larger than LOG_ROTATE_SIZE
 * bytes, rename it to `.old` (overwriting any prior `.old`). This is a
 * single-generation rotation — good enough for a human operator debugging a
 * startup failure, and never grows unbounded.
 *
 * @returns the log file path, or null if setup failed (directory not writable etc.)
 */
function setupTrayFileLog(): string | null {
  const LOG_ROTATE_SIZE = 512 * 1024; // 512 KB
  try {
    const dir = getAppDataDir();
    fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, 'tray.log');

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
    // Colors should already be off under wscript (no TTY), but users may
    // also run `node cli.js tray` from cmd where colors ARE on — keep
    // the file consistent in both cases. The control char in the regex
    // is intentional, hence the eslint disable.
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
 * Run the standalone tray monitor.
 *
 * This is a user-session process that polls a running c123-server over HTTP
 * and reflects its state in a system tray icon. It exists because when
 * c123-server is installed as a Windows service it runs in Session 0 and
 * cannot display tray icons itself (architectural limit since Windows Vista).
 *
 * The monitor:
 * - Does NOT start its own server — it only polls an existing one.
 * - Uses the existing TrayManager driven purely by HTTP polling (no event-bus coupling).
 * - Survives the server being unreachable (goes red, stays red, explicit Quit is the only exit).
 * - Uses AbortController with a 2 s timeout so a filtered/hung socket can't stall the poll loop.
 * - Uses recursive setTimeout instead of setInterval so a slow poll cannot overlap the next one.
 * - Parameterizes TrayManager labels so "Quit" and the menu title make clear
 *   it's the MONITOR being stopped, not the underlying service.
 * - Tees all log output to `${APPDATA}/c123-server/tray.log` so a silent
 *   crash under `wscript.exe` still leaves a diagnostic trail.
 */
async function runTray(options: TrayOptions, debug: boolean): Promise<void> {
  // Set up file logging BEFORE anything else so startup errors are captured.
  const logPath = setupTrayFileLog();

  if (debug) {
    Logger.setLevel('debug');
  }

  // Parse & normalize the target URL up front.
  // - `origin` gives us a clean scheme+host+port string for both the dashboard
  //   URL and the status endpoint (handles trailing slashes, no-port cases, etc.).
  // - If the user passes an invalid URL, fail cleanly with a helpful message
  //   rather than hitting the generic fetch() failure path every 3 s.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.targetUrl);
  } catch {
    Logger.error('Tray', `Invalid --target-url: "${options.targetUrl}"`);
    process.exit(1);
  }
  const dashboardUrl = parsedUrl.origin; // e.g. "http://localhost:27123"
  const statusUrl = new URL('/api/status', parsedUrl).toString();

  // Still keep a numeric port for the existing TrayManagerConfig.port field
  // (dashboardUrl overrides it in practice). Fall back to 80/443/27123 in that
  // order if the URL has no explicit port.
  const port = parsedUrl.port
    ? parseInt(parsedUrl.port, 10)
    : parsedUrl.protocol === 'https:'
      ? 443
      : parsedUrl.protocol === 'http:'
        ? 80
        : 27123;

  const { TrayManager } = await import('./tray/TrayManager.js');

  let stopped = false;

  const shutdown = (): void => {
    if (stopped) return;
    stopped = true;
    Logger.info('Tray', 'Shutting down tray monitor');
    tray.stop();
    process.exit(0);
  };

  const tray = new TrayManager({
    port,
    dashboardUrl,
    titleText: 'C123 Server Monitor',
    quitTooltip: 'Close the monitor (server keeps running)',
    onQuit: shutdown,
  });

  const started = await tray.start();
  if (!started) {
    Logger.error('Tray', 'Failed to start system tray (systray2 not available or incompatible)');
    process.exit(1);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  Logger.info(
    'Tray',
    `Tray monitor started — polling ${statusUrl} every ${options.pollIntervalMs} ms`,
  );
  if (logPath) {
    Logger.info('Tray', `Log file: ${logPath}`);
  }

  const poll = async (): Promise<void> => {
    if (stopped) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(statusUrl, { signal: controller.signal });

      if (!res.ok) {
        const { status, message } = mapStatusResponse(null, `Server returned HTTP ${res.status}`);
        tray.setStatus(status, message);
      } else {
        const data = (await res.json()) as MinimalStatusResponse;
        const { status, message } = mapStatusResponse(data);
        tray.setStatus(status, message);
      }
    } catch {
      // Either AbortError (timeout), network error, or JSON parse error —
      // all mean "can't talk to server", which is a single user-facing state.
      const { status, message } = mapStatusResponse(null);
      tray.setStatus(status, message);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!stopped) {
      setTimeout(() => {
        void poll();
      }, options.pollIntervalMs);
    }
  };

  // Kick off first poll immediately — initial tray state comes from the
  // TrayManager default ("warning" + "Starting..."), which will be overwritten
  // by the first poll result a fraction of a second later.
  void poll();
}

/**
 * Windows service management
 */
async function handleServiceCommand(command: string): Promise<void> {
  // Dynamic import to avoid loading node-windows on non-Windows platforms
  // or when just running the server
  if (process.platform !== 'win32') {
    console.error('Windows service commands are only available on Windows');
    process.exit(1);
  }

  try {
    const { WindowsService } = await import('./service/windows-service.js');
    const service = new WindowsService();

    switch (command) {
      case 'install':
        await service.install();
        console.log('Service installed successfully');
        break;
      case 'uninstall':
        await service.uninstall();
        console.log('Service uninstalled successfully');
        break;
      case 'start':
        await service.start();
        console.log('Service started');
        break;
      case 'stop':
        await service.stop();
        console.log('Service stopped');
        break;
    }
  } catch (err) {
    console.error(`Service ${command} failed:`, err);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { command, config, debug, noTray, tray } = parseArgs();

  if (command === 'run') {
    await runServer(config, debug, noTray);
  } else if (command === 'tray') {
    await runTray(tray, debug);
  } else {
    await handleServiceCommand(command);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
