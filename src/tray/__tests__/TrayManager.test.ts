import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as childProcess from 'node:child_process';

// Mock child_process for openDashboard tests
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

// Mock systray2 before importing TrayManager
const mockOnClick = vi.fn();
const mockSendAction = vi.fn().mockResolvedValue(undefined);
const mockReady = vi.fn().mockResolvedValue(undefined);
const mockKill = vi.fn();

class MockSysTray {
  onClick = mockOnClick;
  sendAction = mockSendAction;
  ready = mockReady;
  kill = mockKill;

  constructor(options: unknown) {
    MockSysTray.instances.push(this);
    MockSysTray.lastOptions = options;
  }

  static instances: MockSysTray[] = [];
  static lastOptions: unknown = null;
  static reset(): void {
    MockSysTray.instances = [];
    MockSysTray.lastOptions = null;
  }
}

vi.mock('systray2', () => ({
  default: MockSysTray,
}));

import { TrayManager } from '../TrayManager.js';

describe('TrayManager', () => {
  let tray: TrayManager;
  let onQuit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClick.mockClear();
    mockSendAction.mockClear().mockResolvedValue(undefined);
    mockReady.mockClear().mockResolvedValue(undefined);
    mockKill.mockClear();
    vi.mocked(childProcess.exec).mockClear();
    MockSysTray.reset();

    onQuit = vi.fn();
    tray = new TrayManager({ port: 27123, onQuit });
  });

  afterEach(() => {
    tray.stop();
  });

  describe('start()', () => {
    it('should create systray and return true', async () => {
      const result = await tray.start();

      expect(result).toBe(true);
      expect(MockSysTray.instances).toHaveLength(1);
      expect(mockReady).toHaveBeenCalledOnce();
      expect(mockOnClick).toHaveBeenCalledOnce();
    });

    it('should configure menu with correct items', async () => {
      await tray.start();

      const config = MockSysTray.lastOptions as { menu: { tooltip: string; items: Array<{ title: string; enabled: boolean }> } };
      expect(config.menu.tooltip).toBe('C123 Server');
      expect(config.menu.items).toHaveLength(4);
      expect(config.menu.items[0].title).toBe('C123 Server');
      expect(config.menu.items[0].enabled).toBe(false);
      expect(config.menu.items[1].title).toContain('Status:');
      expect(config.menu.items[1].enabled).toBe(false);
      expect(config.menu.items[2].title).toBe('Open Dashboard');
      expect(config.menu.items[2].enabled).toBe(true);
      expect(config.menu.items[3].title).toBe('Quit');
      expect(config.menu.items[3].enabled).toBe(true);
    });

    it('should set icon from icons module', async () => {
      await tray.start();

      const config = MockSysTray.lastOptions as { menu: { icon: string } };
      expect(config.menu.icon).toBeTruthy();
      expect(typeof config.menu.icon).toBe('string');
    });

    it('should be idempotent — second call returns true without creating new instance', async () => {
      await tray.start();
      const result = await tray.start();

      expect(result).toBe(true);
      expect(MockSysTray.instances).toHaveLength(1);
    });
  });

  describe('start() with missing systray2', () => {
    it('should return false when ready() rejects', async () => {
      mockReady.mockRejectedValueOnce(new Error('No display'));

      const result = await tray.start();
      expect(result).toBe(false);
    });
  });

  describe('setStatus()', () => {
    it('should update internal state', () => {
      tray.setStatus('ok', 'Connected');

      const state = tray.getStatus();
      expect(state.status).toBe('ok');
      expect(state.message).toBe('Connected');
    });

    it('should send update action when tray is active', async () => {
      await tray.start();

      tray.setStatus('ok', 'Connected to C123 at 192.168.1.5');

      // Single update-menu with full items array — systray2 Go binary
      // ignores icon changes when items array is empty.
      expect(mockSendAction).toHaveBeenCalledWith({
        type: 'update-menu',
        menu: {
          icon: expect.any(String),
          title: '',
          tooltip: 'C123 Server - Connected to C123 at 192.168.1.5',
          items: expect.arrayContaining([
            expect.objectContaining({ title: 'C123 Server' }),
            expect.objectContaining({ title: 'Status: Connected to C123 at 192.168.1.5' }),
            expect.objectContaining({ title: 'Open Dashboard' }),
            expect.objectContaining({ title: 'Quit' }),
          ]),
        },
      });
    });

    it('should truncate long status messages in menu', async () => {
      await tray.start();

      const longMessage = 'A'.repeat(100);
      tray.setStatus('ok', longMessage);

      const menuAction = mockSendAction.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'update-menu',
      );
      const items = (menuAction![0] as { menu: { items: Array<{ title: string }> } }).menu.items;
      const statusItem = items.find((i) => i.title.startsWith('Status:'));
      expect(statusItem!.title.length).toBeLessThanOrEqual(88); // "Status: " + 77 + "..."
      expect(statusItem!.title).toContain('...');
    });

    it('should not throw when tray is not active', () => {
      expect(() => tray.setStatus('error', 'Something broke')).not.toThrow();
    });

    it('should update icon based on status', async () => {
      await tray.start();

      tray.setStatus('error', 'Error occurred');

      // update-menu call is the second sendAction call
      const menuAction = mockSendAction.mock.calls.find(
        (call) => (call[0] as { type: string }).type === 'update-menu',
      );
      expect(menuAction).toBeDefined();
      expect((menuAction![0] as { menu: { icon: string } }).menu.icon).toBeTruthy();
    });
  });

  describe('onClick handlers', () => {
    it('should call onQuit when Quit is clicked', async () => {
      await tray.start();

      const clickHandler = mockOnClick.mock.calls[0][0];
      clickHandler({ type: 'clicked', seq_id: 3, item: { title: 'Quit', tooltip: '' } });

      expect(onQuit).toHaveBeenCalledOnce();
    });

    it('should open dashboard when Open Dashboard is clicked', async () => {
      await tray.start();

      const clickHandler = mockOnClick.mock.calls[0][0];
      clickHandler({ type: 'clicked', seq_id: 2, item: { title: 'Open Dashboard', tooltip: '' } });

      const execMock = vi.mocked(childProcess.exec);
      expect(execMock).toHaveBeenCalledOnce();
      const execCall = execMock.mock.calls[0][0] as string;
      expect(execCall).toContain('http://localhost:27123');
    });

    it('should not call onQuit for other menu items', async () => {
      await tray.start();

      const clickHandler = mockOnClick.mock.calls[0][0];
      clickHandler({ type: 'clicked', seq_id: 0, item: { title: 'C123 Server', tooltip: '' } });

      expect(onQuit).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should kill systray when active', async () => {
      await tray.start();
      tray.stop();

      expect(mockKill).toHaveBeenCalledWith(false);
    });

    it('should be idempotent', async () => {
      await tray.start();
      tray.stop();
      tray.stop();

      expect(mockKill).toHaveBeenCalledOnce();
    });

    it('should not throw when tray was never started', () => {
      expect(() => tray.stop()).not.toThrow();
    });
  });

  describe('getStatus()', () => {
    it('should return initial status', () => {
      const state = tray.getStatus();
      expect(state.status).toBe('warning');
      expect(state.message).toBe('Starting...');
    });
  });
});
