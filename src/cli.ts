#!/usr/bin/env node
import { Server, ServerConfig } from './server.js';

/**
 * Parse command line arguments
 */
function parseArgs(): { command: string; config: ServerConfig } {
  const args = process.argv.slice(2);
  let command = 'run';
  const config: ServerConfig = {};

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

    if (arg === '--ws-port' && args[i + 1]) {
      config.wsPort = parseInt(args[++i], 10);
    }

    if (arg === '--admin-port' && args[i + 1]) {
      config.adminPort = parseInt(args[++i], 10);
    }

    if (arg === '--xml' && args[i + 1]) {
      config.xmlPath = args[++i];
    }

    if (arg === '--no-discovery') {
      config.autoDiscovery = false;
    }
  }

  return { command, config };
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
  --host <ip>       C123 host IP (disables auto-discovery)
  --port <port>     C123 port (default: 27333)
  --ws-port <port>  WebSocket port for scoreboards (default: 27084)
  --admin-port <p>  Admin dashboard port (default: 8084)
  --xml <path>      XML file path for results data
  --no-discovery    Disable UDP auto-discovery
  -h, --help        Show this help message
  -v, --version     Show version

Examples:
  c123-server                     # Run with auto-discovery
  c123-server --host 192.168.1.5  # Connect to specific C123
  c123-server install             # Install as Windows service
`);
}

/**
 * Run the server
 */
async function runServer(config: ServerConfig): Promise<void> {
  const server = new Server(config);

  // Handle shutdown signals
  const shutdown = async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Error handling
  server.on('error', (err) => {
    console.error('Server error:', err.message);
  });

  server.on('tcpConnected', (host) => {
    console.log(`Connected to C123 at ${host}`);
  });

  server.on('tcpDisconnected', () => {
    console.log('Disconnected from C123, reconnecting...');
  });

  // Start
  try {
    await server.start();
    console.log('C123 Server started');
    console.log(`  WebSocket: ws://localhost:${config.wsPort ?? 27084}`);
    console.log(`  Admin:     http://localhost:${config.adminPort ?? 8084}`);

    if (config.autoDiscovery !== false && !config.tcpHost) {
      console.log('  Waiting for C123 discovery...');
    }
  } catch (err) {
    console.error('Failed to start server:', err);
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
  const { command, config } = parseArgs();

  if (command === 'run') {
    await runServer(config);
  } else {
    await handleServiceCommand(command);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
