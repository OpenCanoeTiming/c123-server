import { exec } from 'node:child_process';
import { Logger } from '../utils/logger.js';

export type NotificationType = 'info' | 'warning' | 'error';

interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Application User Model ID — must match the AUMID registered on the
 * Start Menu shortcut by the installer (c123-server.iss).
 * WinRT toast notifications require a registered AUMID to show.
 */
export const AUMID = 'OpenCanoeTiming.C123Server';

/**
 * Windows notification manager with WinRT toast and balloon fallback.
 *
 * Primary path: WinRT ToastNotificationManager (modern, shows in Action Center).
 * Requires AUMID registered on a Start Menu shortcut (installer does this).
 *
 * Fallback: legacy balloon tooltip via System.Windows.Forms.NotifyIcon.
 * Used when toast fails (dev mode without installer, or older Windows).
 *
 * No extra dependencies — uses built-in PowerShell on Windows 10+.
 * Silently does nothing on non-Windows platforms.
 * Includes rate limiting to prevent notification spam.
 */
export class NotificationManager {
  private enabled = true;
  private lastNotification = 0;

  /** null = not probed yet, true/false = cached result */
  private toastAvailable: boolean | null = null;

  /** Minimum interval between notifications in ms */
  private readonly minIntervalMs: number;

  constructor(minIntervalMs = 10_000) {
    this.minIntervalMs = minIntervalMs;
  }

  /**
   * Show a Windows notification if rate limit allows.
   * Tries WinRT toast first, falls back to balloon on failure.
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

    // If toast already failed, go straight to balloon
    if (this.toastAvailable === false) {
      this.execCommand(this.buildBalloonCommand(safeTitle, safeMessage, options.type ?? 'info'));
      return;
    }

    // Try toast first
    const toastCmd = this.buildToastCommand(safeTitle, safeMessage);
    exec(toastCmd, (err) => {
      if (err) {
        Logger.debug('Notify', `Toast failed, falling back to balloon: ${err.message}`);
        this.toastAvailable = false;
        // Retry with balloon
        this.execCommand(this.buildBalloonCommand(safeTitle, safeMessage, options.type ?? 'info'));
      } else if (this.toastAvailable === null) {
        this.toastAvailable = true;
        Logger.debug('Notify', 'WinRT toast notifications available');
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
   * Build PowerShell command for WinRT toast notification.
   * Requires a registered AUMID on a Start Menu shortcut.
   * Uses -EncodedCommand (Base64 UTF-16LE) to avoid cmd.exe escaping issues.
   */
  private buildToastCommand(title: string, message: string): string {
    const script = [
      '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
      '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null',
      `$xml = "<toast><visual><binding template='ToastGeneric'><text>${this.xmlEscape(title)}</text><text>${this.xmlEscape(message)}</text></binding></visual></toast>"`,
      '$doc = New-Object Windows.Data.Xml.Dom.XmlDocument',
      '$doc.LoadXml($xml)',
      `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${AUMID}').Show([Windows.UI.Notifications.ToastNotification]::new($doc))`,
    ].join('\n');

    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
  }

  /**
   * Build PowerShell command for a legacy balloon tooltip notification.
   * Uses System.Windows.Forms.NotifyIcon — works without AUMID registration.
   * Uses -EncodedCommand (Base64 UTF-16LE) to avoid cmd.exe escaping issues.
   */
  private buildBalloonCommand(title: string, message: string, type: NotificationType): string {
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

    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
  }

  /**
   * Execute a command, logging errors at debug level.
   */
  private execCommand(command: string): void {
    exec(command, (err) => {
      if (err) {
        Logger.debug('Notify', `Notification failed: ${err.message}`);
      }
    });
  }

  /**
   * Escape XML special characters for safe embedding in toast XML.
   */
  private xmlEscape(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
