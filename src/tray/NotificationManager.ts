import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Cross-platform system notification manager.
 *
 * Uses native OS notification mechanisms — no extra dependencies:
 * - Windows: PowerShell with WinRT ToastNotification
 * - macOS: osascript
 * - Linux: notify-send
 *
 * Includes rate limiting to prevent notification spam.
 */
export class NotificationManager {
  private enabled = true;
  private lastNotification = 0;

  /** Minimum interval between notifications in ms */
  private readonly minIntervalMs: number;

  constructor(minIntervalMs = 10_000) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * Show a system notification if rate limit allows.
   */
  notify(options: NotificationOptions): void {
    if (!this.enabled) {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotification < this.minIntervalMs) {
      Logger.debug('Notify', `Rate limited: "${options.message}"`);
      return;
    }
    this.lastNotification = now;

    const title = options.title;
    const message = options.message;
    const type = options.type ?? 'info';

    const command = this.buildCommand(title, message, type);
    if (!command) {
      return;
    }

    exec(command, (err) => {
      if (err) {
        Logger.debug('Notify', `Notification failed: ${err.message}`);
      }
    });
  }

  /**
   * Enable/disable notifications.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if notifications are enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Build platform-specific notification command.
   */
  private buildCommand(title: string, message: string, type: NotificationType): string | null {
    // Sanitize inputs to prevent command injection
    const safeTitle = this.sanitize(title);
    const safeMessage = this.sanitize(message);

    switch (process.platform) {
      case 'win32':
        return this.buildWindowsCommand(safeTitle, safeMessage);
      case 'darwin':
        return this.buildMacCommand(safeTitle, safeMessage, type);
      case 'linux':
        return this.buildLinuxCommand(safeTitle, safeMessage, type);
      default:
        Logger.debug('Notify', `Unsupported platform: ${process.platform}`);
        return null;
    }
  }

  private buildWindowsCommand(title: string, message: string): string {
    // PowerShell with WinRT toast notifications (Windows 10+)
    const ps = [
      '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null',
      '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null',
      `$template = @"`,
      `<toast>`,
      `  <visual>`,
      `    <binding template="ToastGeneric">`,
      `      <text>${title}</text>`,
      `      <text>${message}</text>`,
      `    </binding>`,
      `  </visual>`,
      `</toast>`,
      `"@`,
      '$xml = New-Object Windows.Data.Xml.Dom.XmlDocument',
      '$xml.LoadXml($template)',
      '$toast = New-Object Windows.UI.Notifications.ToastNotification $xml',
      "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('C123 Server').Show($toast)",
    ].join('; ');

    return `powershell -NoProfile -NonInteractive -Command "${ps}"`;
  }

  private buildMacCommand(title: string, message: string, type: NotificationType): string {
    const sound = type === 'error' ? ' sound name "Basso"' : '';
    return `osascript -e 'display notification "${message}" with title "${title}"${sound}'`;
  }

  private buildLinuxCommand(title: string, message: string, type: NotificationType): string {
    const urgency = type === 'error' ? 'critical' : type === 'warning' ? 'normal' : 'low';
    return `notify-send -u ${urgency} "${title}" "${message}"`;
  }

  /**
   * Sanitize string for safe use in shell commands.
   * Removes characters that could break command structure.
   */
  private sanitize(input: string): string {
    return input
      .replace(/["`$\\]/g, '')  // Remove shell-dangerous chars
      .replace(/'/g, '')         // Remove single quotes
      .replace(/\n/g, ' ')      // Replace newlines with spaces
      .substring(0, 200);        // Limit length
  }
}
