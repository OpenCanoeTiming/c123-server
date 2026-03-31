import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Windows system notification manager using PowerShell WinRT toasts.
 *
 * No extra dependencies — uses built-in PowerShell on Windows 10+.
 * Silently does nothing on non-Windows platforms.
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
   * Show a Windows toast notification if rate limit allows.
   * Does nothing on non-Windows platforms.
   */
  notify(options: NotificationOptions): void {
    if (!this.enabled || process.platform !== 'win32') {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotification < this.minIntervalMs) {
      Logger.debug('Notify', `Rate limited: "${options.message}"`);
      return;
    }
    this.lastNotification = now;

    const safeTitle = this.sanitize(options.title);
    const safeMessage = this.sanitize(options.message);

    const command = this.buildCommand(safeTitle, safeMessage);

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
   * Build PowerShell command for Windows WinRT toast notification.
   */
  private buildCommand(title: string, message: string): string {
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

  /**
   * Sanitize string for safe use in PowerShell commands.
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
