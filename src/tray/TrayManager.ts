import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';
import { getIcon, type TrayStatus } from './icons.js';

export type { TrayStatus } from './icons.js';

export interface TrayManagerConfig {
  /** Server port for dashboard URL */
  port: number;
  /** Called when user clicks Quit in the tray menu */
  onQuit: () => void;
}

// Menu item seq_id constants (order in the items array)
const SEQ = {
  TITLE: 0,
  STATUS: 1,
  OPEN_DASHBOARD: 2,
  QUIT: 3,
} as const;

/**
 * System tray icon manager for C123 Server.
 *
 * Uses systray2 (optional dependency) to show a tray icon with status
 * and quick actions. Fails silently if systray2 is not available.
 */
export class TrayManager {
  private systray: import('systray2').default | null = null;
  private currentStatus: TrayStatus = 'warning';
  private statusMessage = 'Starting...';

  constructor(private readonly config: TrayManagerConfig) {}

  /**
   * Start the tray icon.
   * @returns true if tray was created, false if systray2 is not available
   */
  async start(): Promise<boolean> {
    try {
      const SysTray = (await import('systray2')).default;

      const icon = getIcon(this.currentStatus);

      this.systray = new SysTray({
        menu: {
          icon,
          title: '',
          tooltip: 'C123 Server',
          items: [
            {
              title: 'C123 Server',
              tooltip: '',
              enabled: false,
            },
            {
              title: `Status: ${this.statusMessage}`,
              tooltip: '',
              enabled: false,
            },
            {
              title: 'Open Dashboard',
              tooltip: `Open http://localhost:${this.config.port}`,
              enabled: true,
            },
            {
              title: 'Quit',
              tooltip: 'Stop C123 Server',
              enabled: true,
            },
          ],
        },
        debug: false,
      });

      this.systray.onClick((action) => {
        switch (action.seq_id) {
          case SEQ.OPEN_DASHBOARD:
            this.openDashboard();
            break;
          case SEQ.QUIT:
            this.config.onQuit();
            break;
        }
      });

      await this.systray.ready();
      Logger.info('Tray', 'System tray icon active');
      return true;
    } catch {
      Logger.debug('Tray', 'System tray not available (systray2 not installed or no display)');
      return false;
    }
  }

  /**
   * Update tray icon and status message.
   */
  setStatus(status: TrayStatus, message: string): void {
    this.currentStatus = status;
    this.statusMessage = message;

    if (!this.systray) {
      return;
    }

    const icon = getIcon(status);

    this.systray.sendAction({
      type: 'update-menu-and-item',
      menu: {
        icon,
        tooltip: `C123 Server - ${message}`,
      },
      item: {
        title: `Status: ${message}`,
      },
      seq_id: SEQ.STATUS,
    });
  }

  /**
   * Get current status (for testing).
   */
  getStatus(): { status: TrayStatus; message: string } {
    return { status: this.currentStatus, message: this.statusMessage };
  }

  /**
   * Remove the tray icon and clean up.
   */
  stop(): void {
    if (this.systray) {
      try {
        this.systray.kill(false);
      } catch {
        // Ignore errors during cleanup
      }
      this.systray = null;
    }
  }

  /**
   * Open the admin dashboard in the default browser.
   */
  private openDashboard(): void {
    const url = `http://localhost:${this.config.port}`;

    let command: string;
    switch (process.platform) {
      case 'win32':
        command = `start "" "${url}"`;
        break;
      case 'darwin':
        command = `open "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
        break;
    }

    exec(command, (err) => {
      if (err) {
        Logger.warn('Tray', `Failed to open browser: ${err.message}`);
      }
    });
  }
}
