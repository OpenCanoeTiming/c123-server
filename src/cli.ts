#!/usr/bin/env node
import { Server, ServerConfig } from './server.js';
import { Logger } from './utils/logger.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { command: string; config: ServerConfig; debug: boolean; noTray: boolean } {
  const args = process.argv.slice(2);
  let command = 'run';
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

    if (arg === 'install' || arg === 'uninstall' || arg === 'start' || arg === 'stop' || arg === 'run') {
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
  }

  return { command, config, debug, noTray };
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

Environment variables:
  C123_SERVER_PORT    Server port (overrides default, overridden by --server-port)
  PORT                Fallback for server port (if C123_SERVER_PORT not set)

Examples:
  c123-server                     # Run with auto-discovery
  c123-server --host 192.168.1.5  # Connect to specific C123
  c123-server install             # Install as Windows service
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

  // Handle shutdown signals
  let tray: import('./tray/TrayManager.js').TrayManager | null = null;

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
  });

  server.on('tcpConnected', (host) => {
    Logger.info('Server', `Connected to C123 at ${host}`);
    tray?.setStatus('ok', `Connected to C123 at ${host}`);
  });

  server.on('tcpDisconnected', () => {
    Logger.warn('Server', 'Disconnected from C123, reconnecting...');
    tray?.setStatus('warning', 'Disconnected from C123');
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

    // Start tray icon (optional, fails silently if systray2 not available)
    if (!noTray) {
      const { TrayManager } = await import('./tray/TrayManager.js');
      tray = new TrayManager({ port, onQuit: shutdown });
      await tray.start();
    }
  } catch (err) {
    Logger.error('CLI', 'Failed to start server', err);
    process.exit(1);
  }
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
  const { command, config, debug, noTray } = parseArgs();

  if (command === 'run') {
    await runServer(config, debug, noTray);
  } else {
    await handleServiceCommand(command);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
