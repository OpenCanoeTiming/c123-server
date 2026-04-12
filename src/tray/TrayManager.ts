import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';
import { getIcon, type TrayStatus } from './icons.js';

export type { TrayStatus } from './icons.js';

export interface TrayManagerConfig {
  /** Server port — used to build `http://localhost:${port}` if dashboardUrl is not given */
  port: number;
  /**
   * Full dashboard URL. Overrides the default `http://localhost:${port}`.
   * Set this in the standalone tray monitor so "Open Dashboard" opens the
   * actual polled server (not a hardcoded localhost) when --target-url points
   * at a non-default host or port.
   */
  dashboardUrl?: string;
  /**
   * Title shown as the menu header and in the tray tooltip prefix.
   * Default: "C123 Server". The standalone tray monitor overrides this to
   * "C123 Server Monitor" so users can tell the processes apart.
   */
  titleText?: string;
  /**
   * Tooltip on the Quit menu item. Default: "Stop C123 Server".
   * The standalone tray monitor overrides this to make clear that Quit only
   * closes the monitor, not the underlying service.
   */
  quitTooltip?: string;
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
    if (this.systray) {
      return true; // Already started
    }

    try {
      // systray2 is a CJS module — handle both ESM interop shapes:
      // tsx/ts-node: mod.default → constructor function
      // compiled ESM (node): mod.default → { default: constructor }
      const mod = await import('systray2');
      const SysTray = typeof mod.default === 'function'
        ? mod.default
        : (mod as unknown as { default: { default: typeof mod.default } }).default.default;

      const icon = getIcon(this.currentStatus);
      const instance = new SysTray({
        menu: {
          icon,
          title: '',
          tooltip: this.getTitleText(),
          items: this.buildMenuItems(),
        },
        debug: false,
      });

      instance.onClick((action) => {
        switch (action.seq_id) {
          case SEQ.OPEN_DASHBOARD:
            this.openDashboard();
            break;
          case SEQ.QUIT:
            this.config.onQuit();
            break;
        }
      });

      await instance.ready();
      // Assign only after ready() resolves to prevent premature sendAction calls
      this.systray = instance;
      Logger.info('Tray', 'System tray icon active');
      return true;
    } catch (err) {
      Logger.debug('Tray', `System tray not available: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /**
   * Get the configured title text (falls back to "C123 Server").
   */
  private getTitleText(): string {
    return this.config.titleText ?? 'C123 Server';
  }

  /**
   * Get the configured dashboard URL (falls back to localhost:port).
   */
  private getDashboardUrl(): string {
    return this.config.dashboardUrl ?? `http://localhost:${this.config.port}`;
  }

  /**
   * Build the full menu items array for the current state.
   */
  private buildMenuItems(): Array<{ title: string; tooltip: string; enabled: boolean }> {
    const truncated = this.statusMessage.length > 80
      ? this.statusMessage.substring(0, 77) + '...'
      : this.statusMessage;

    const dashboardUrl = this.getDashboardUrl();
    const quitTooltip = this.config.quitTooltip ?? 'Stop C123 Server';

    return [
      { title: this.getTitleText(), tooltip: '', enabled: false },
      { title: `Status: ${truncated}`, tooltip: '', enabled: false },
      { title: 'Open Dashboard', tooltip: `Open ${dashboardUrl}`, enabled: true },
      { title: 'Quit', tooltip: quitTooltip, enabled: true },
    ];
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
    const truncated = message.length > 80 ? message.substring(0, 77) + '...' : message;

    Logger.debug('Tray', `setStatus: ${status} "${message}"`);

    // Send full menu update with all items — systray2 Go binary ignores
    // icon changes when items array is empty.
    this.safeSendAction({
      type: 'update-menu',
      menu: {
        icon,
        title: '',
        tooltip: `${this.getTitleText()} - ${truncated}`,
        items: this.buildMenuItems(),
      },
    });
  }

  /**
   * Get current tray status and message.
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
   * Send an action to systray2, catching any errors.
   * sendAction is typed as void but may return a Promise at runtime.
   */
  private safeSendAction(action: Parameters<import('systray2').default['sendAction']>[0]): void {
    try {
      // Cast through unknown because sendAction is typed as void
      // but actually returns a Promise at runtime in systray2
      const result: unknown = this.systray!.sendAction(action);
      if (result && typeof (result as { catch?: (...args: unknown[]) => unknown }).catch === 'function') {
        (result as Promise<unknown>).catch((err: unknown) => {
          Logger.warn('Tray', `sendAction failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    } catch (err) {
      Logger.warn('Tray', `sendAction threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Open the admin dashboard in the default browser.
   */
  private openDashboard(): void {
    const url = this.getDashboardUrl();

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
