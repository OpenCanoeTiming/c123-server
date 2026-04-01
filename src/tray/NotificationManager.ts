import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Windows system notification manager using balloon tooltip notifications.
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

    const command = this.buildCommand(safeTitle, safeMessage, options.type ?? 'info');

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
   * Build PowerShell command for a Windows balloon tooltip notification.
   *
   * Uses System.Windows.Forms.NotifyIcon (balloon tooltip) instead of
   * WinRT ToastNotificationManager — WinRT requires a registered AUMID
   * and silently drops toasts from unregistered apps. Balloon tooltips
   * work without registration on all Windows 10+ machines.
   *
   * Uses -EncodedCommand (Base64 UTF-16LE) to avoid cmd.exe escaping issues.
   */
  private buildCommand(title: string, message: string, type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      info: 'Info',
      warning: 'Warning',
      error: 'Error',
    };
    const tipIcon = iconMap[type];

    const script = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$n = New-Object System.Windows.Forms.NotifyIcon',
      '$n.Icon = [System.Drawing.SystemIcons]::Information',
      '$n.Visible = $true',
      `$n.ShowBalloonTip(5000, "${title}", "${message}", [System.Windows.Forms.ToolTipIcon]::${tipIcon})`,
      'Start-Sleep 4',
      '$n.Dispose()',
    ].join('\n');

    // PowerShell -EncodedCommand expects Base64-encoded UTF-16LE
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
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
