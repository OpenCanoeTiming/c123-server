import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

import { NotificationManager } from '../NotificationManager.js';

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

  describe('notify()', () => {
    it('should call exec with PowerShell command on Windows', () => {
      manager.notify({ title: 'Test', message: 'Hello' });

      expect(execMock).toHaveBeenCalledOnce();
      const command = execMock.mock.calls[0][0] as string;
      expect(command).toContain('powershell');
      expect(command).toContain('ToastNotification');
    });

    it('should include title and message in command', () => {
      manager.notify({ title: 'C123 Server', message: 'Connected' });

      const command = execMock.mock.calls[0][0] as string;
      expect(command).toContain('C123 Server');
      expect(command).toContain('Connected');
    });

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
      expect(command).not.toContain('$(');
      expect(command).not.toContain('`');
    });

    it('should remove dangerous characters from message', () => {
      manager.notify({ title: 'Test', message: 'Hello "world" $PATH' });

      const command = execMock.mock.calls[0][0] as string;
      expect(command).not.toContain('"world"');
      expect(command).not.toContain('$PATH');
    });

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(500);
      manager.notify({ title: 'Test', message: longMessage });

      const command = execMock.mock.calls[0][0] as string;
      expect(command).not.toContain('A'.repeat(500));
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
