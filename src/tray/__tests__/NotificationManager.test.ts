import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

import { NotificationManager, AUMID } from '../NotificationManager.js';

/**
 * Decode the PowerShell -EncodedCommand back to readable script.
 * EncodedCommand is Base64-encoded UTF-16LE.
 */
function decodeCommand(execArg: string): string {
  const match = execArg.match(/-EncodedCommand\s+(\S+)/);
  if (!match) return execArg;
  return Buffer.from(match[1], 'base64').toString('utf16le');
}

describe('NotificationManager', () => {
  let manager: NotificationManager;
  const execMock = vi.mocked(childProcess.exec);
  let platformSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    execMock.mockClear();
    // Simulate Windows for all tests (since notifications are Windows-only)
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    manager = new NotificationManager(0); // No rate limiting for tests
  });

  afterEach(() => {
    platformSpy.mockRestore();
  });

  describe('notify() — toast primary path', () => {
    it('should try WinRT toast first on Windows', () => {
      manager.notify({ title: 'Test', message: 'Hello' });

      expect(execMock).toHaveBeenCalledOnce();
      const command = execMock.mock.calls[0][0] as string;
      expect(command).toContain('powershell');
      expect(command).toContain('-EncodedCommand');

      const script = decodeCommand(command);
      expect(script).toContain('ToastNotificationManager');
      expect(script).toContain('ToastGeneric');
    });

    it('should include AUMID in toast script', () => {
      manager.notify({ title: 'Test', message: 'Hello' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain(AUMID);
    });

    it('should include title and message in toast script', () => {
      manager.notify({ title: 'C123 Server', message: 'Connected' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain('C123 Server');
      expect(script).toContain('Connected');
    });
  });

  describe('notify() — balloon fallback', () => {
    it('should fall back to balloon when toast exec fails', () => {
      // First call: toast fails
      execMock.mockImplementationOnce((_cmd, callback) => {
        (callback as (err: Error | null) => void)(new Error('WinRT not available'));
        return {} as ReturnType<typeof childProcess.exec>;
      });

      manager.notify({ title: 'Test', message: 'Hello' });

      // Should have been called twice: toast attempt + balloon fallback
      expect(execMock).toHaveBeenCalledTimes(2);

      const balloonScript = decodeCommand(execMock.mock.calls[1][0] as string);
      expect(balloonScript).toContain('ShowBalloonTip');
    });

    it('should use balloon directly after first toast failure', () => {
      // First call: toast fails
      execMock.mockImplementationOnce((_cmd, callback) => {
        (callback as (err: Error | null) => void)(new Error('WinRT not available'));
        return {} as ReturnType<typeof childProcess.exec>;
      });

      manager.notify({ title: 'Test', message: 'First' });
      execMock.mockClear();

      // Second call: should go straight to balloon
      manager.notify({ title: 'Test', message: 'Second' });

      expect(execMock).toHaveBeenCalledOnce();
      const script = decodeCommand(execMock.mock.calls[0][0] as string);
      expect(script).toContain('ShowBalloonTip');
      expect(script).not.toContain('ToastNotificationManager');
    });

    it('should use Warning ToolTipIcon for warning type in balloon', () => {
      // Force balloon mode
      (manager as unknown as { toastAvailable: boolean }).toastAvailable = false;

      manager.notify({ title: 'Test', message: 'Warn', type: 'warning' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain('ToolTipIcon]::Warning');
    });

    it('should use Error ToolTipIcon for error type in balloon', () => {
      (manager as unknown as { toastAvailable: boolean }).toastAvailable = false;

      manager.notify({ title: 'Test', message: 'Err', type: 'error' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain('ToolTipIcon]::Error');
    });

    it('should use Info ToolTipIcon when type is omitted in balloon', () => {
      (manager as unknown as { toastAvailable: boolean }).toastAvailable = false;

      manager.notify({ title: 'Test', message: 'Hello' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain('ToolTipIcon]::Info');
    });
  });

  describe('enabled/disabled', () => {
    it('should not call exec when disabled', () => {
      manager.setEnabled(false);
      manager.notify({ title: 'Test', message: 'Hello' });

      expect(execMock).not.toHaveBeenCalled();
    });

    it('should not call exec on non-Windows platforms', () => {
      platformSpy.mockReturnValue('linux');
      manager.notify({ title: 'Test', message: 'Hello' });

      expect(execMock).not.toHaveBeenCalled();
    });

    it('should re-enable after setEnabled(true)', () => {
      manager.setEnabled(false);
      manager.setEnabled(true);
      manager.notify({ title: 'Test', message: 'Hello' });

      expect(execMock).toHaveBeenCalledOnce();
    });
  });

  describe('rate limiting', () => {
    it('should rate limit notifications', () => {
      const limited = new NotificationManager(60_000);

      limited.notify({ title: 'Test', message: 'First' });
      limited.notify({ title: 'Test', message: 'Second' });

      expect(execMock).toHaveBeenCalledOnce();
    });

    it('should allow notification after interval passes', () => {
      const limited = new NotificationManager(100);

      limited.notify({ title: 'Test', message: 'First' });

      // Manually advance last notification time
      (limited as unknown as { lastNotification: number }).lastNotification = Date.now() - 200;

      limited.notify({ title: 'Test', message: 'Second' });

      expect(execMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('sanitization', () => {
    it('should remove dangerous characters from title', () => {
      manager.notify({ title: 'Test `$(rm -rf /)`', message: 'Safe' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).not.toContain('$(');
      expect(script).not.toContain('`');
    });

    it('should remove dangerous characters from message', () => {
      manager.notify({ title: 'Test', message: 'Hello "world" $PATH' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).not.toContain('"world"');
      expect(script).not.toContain('$PATH');
    });

    it('should XML-escape special characters in toast notifications', () => {
      manager.notify({ title: 'C123 & Server', message: 'Value <100>' });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).toContain('C123 &amp; Server');
      expect(script).toContain('Value &lt;100&gt;');
      expect(script).not.toContain('<100>');
    });

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(500);
      manager.notify({ title: 'Test', message: longMessage });

      const command = execMock.mock.calls[0][0] as string;
      const script = decodeCommand(command);
      expect(script).not.toContain('A'.repeat(500));
    });
  });

  describe('isEnabled()', () => {
    it('should return true by default', () => {
      expect(manager.isEnabled()).toBe(true);
    });

    it('should return false after disabling', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
    });
  });
});
