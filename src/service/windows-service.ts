import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type for node-windows Service class
interface NodeWindowsService {
  install(): void;
  uninstall(): void;
  start(): void;
  stop(): void;
  on(event: 'install' | 'uninstall' | 'start' | 'stop' | 'alreadyinstalled', callback: () => void): void;
  on(event: 'error', callback: (err: Error) => void): void;
}

interface NodeWindowsModule {
  Service: new (options: {
    name: string;
    description?: string;
    script: string;
    nodeOptions?: string[];
    env?: Array<{ name: string; value: string }>;
  }) => NodeWindowsService;
}

/**
 * Windows service wrapper for C123 Server.
 *
 * Uses node-windows to install/uninstall the server as a Windows service.
 * The service will:
 * - Start automatically on boot
 * - Restart on crash
 * - Run in the background
 */
export class WindowsService {
  private serviceName = 'C123Server';
  private serviceDescription = 'C123 to Scoreboard bridge - canoe slalom timing middleware';

  /**
   * Install as Windows service
   */
  async install(): Promise<void> {
    const nodeWindows = await this.loadNodeWindows();

    const svc = new nodeWindows.Service({
      name: this.serviceName,
      description: this.serviceDescription,
      script: join(__dirname, '..', 'cli.js'),
      nodeOptions: ['--experimental-specifier-resolution=node'],
      env: [
        {
          name: 'NODE_ENV',
          value: 'production',
        },
      ],
    });

    return new Promise((resolve, reject) => {
      svc.on('install', () => {
        svc.start();
        resolve();
      });

      svc.on('alreadyinstalled', () => {
        reject(new Error('Service is already installed'));
      });

      svc.on('error', (err: Error) => {
        reject(err);
      });

      svc.install();
    });
  }

  /**
   * Uninstall Windows service
   */
  async uninstall(): Promise<void> {
    const nodeWindows = await this.loadNodeWindows();

    const svc = new nodeWindows.Service({
      name: this.serviceName,
      script: join(__dirname, '..', 'cli.js'),
    });

    return new Promise((resolve, reject) => {
      svc.on('uninstall', () => {
        resolve();
      });

      svc.on('error', (err: Error) => {
        reject(err);
      });

      svc.uninstall();
    });
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    const nodeWindows = await this.loadNodeWindows();

    const svc = new nodeWindows.Service({
      name: this.serviceName,
      script: join(__dirname, '..', 'cli.js'),
    });

    return new Promise((resolve, reject) => {
      svc.on('start', () => {
        resolve();
      });

      svc.on('error', (err: Error) => {
        reject(err);
      });

      svc.start();
    });
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    const nodeWindows = await this.loadNodeWindows();

    const svc = new nodeWindows.Service({
      name: this.serviceName,
      script: join(__dirname, '..', 'cli.js'),
    });

    return new Promise((resolve, reject) => {
      svc.on('stop', () => {
        resolve();
      });

      svc.on('error', (err: Error) => {
        reject(err);
      });

      svc.stop();
    });
  }

  /**
   * Dynamically load node-windows
   */
  private async loadNodeWindows(): Promise<NodeWindowsModule> {
    try {
      // Dynamic import to avoid loading on non-Windows
      const mod = await import('node-windows');
      return mod as NodeWindowsModule;
    } catch {
      throw new Error(
        'node-windows is not installed. Run: npm install node-windows'
      );
    }
  }
}
