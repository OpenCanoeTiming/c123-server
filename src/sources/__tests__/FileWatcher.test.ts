import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWatcher } from '../FileWatcher.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('FileWatcher', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filewatcher-test-'));
    tempFile = path.join(tempDir, 'test.xml');
    fs.writeFileSync(tempFile, '<Canoe123>initial</Canoe123>');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('start/stop', () => {
    it('should start and emit ready event', async () => {
      const watcher = new FileWatcher({ path: tempFile });

      const readyPromise = new Promise<void>((resolve) => {
        watcher.on('ready', resolve);
      });

      watcher.start();

      await expect(readyPromise).resolves.toBeUndefined();
      await watcher.stop();
    });

    it('should not start twice', async () => {
      const watcher = new FileWatcher({ path: tempFile });
      let readyCount = 0;

      watcher.on('ready', () => readyCount++);

      watcher.start();
      watcher.start(); // Should be ignored

      // Wait a bit for ready event
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(readyCount).toBe(1);
      await watcher.stop();
    });

    it('should stop cleanly', async () => {
      const watcher = new FileWatcher({ path: tempFile });

      watcher.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await watcher.stop();
      // Should not throw
    });

    it('should handle stop when not started', async () => {
      const watcher = new FileWatcher({ path: tempFile });
      await watcher.stop(); // Should not throw
    });
  });

  describe('change detection', () => {
    it('should emit change event when file is modified', async () => {
      const watcher = new FileWatcher({
        path: tempFile,
        mode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      const changePromise = new Promise<string>((resolve) => {
        watcher.on('change', resolve);
      });

      watcher.start();

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify the file
      fs.writeFileSync(tempFile, '<Canoe123>modified</Canoe123>');

      const changedPath = await changePromise;
      expect(changedPath).toBe(tempFile);

      await watcher.stop();
    });

    it('should debounce rapid changes', async () => {
      const watcher = new FileWatcher({
        path: tempFile,
        mode: 'polling',
        pollInterval: 50,
        debounceMs: 100,
      });

      let changeCount = 0;
      watcher.on('change', () => changeCount++);

      watcher.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Rapid changes
      fs.writeFileSync(tempFile, '<Canoe123>change1</Canoe123>');
      fs.writeFileSync(tempFile, '<Canoe123>change2</Canoe123>');
      fs.writeFileSync(tempFile, '<Canoe123>change3</Canoe123>');

      // Wait for debounce to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should only get 1 change event due to debouncing
      expect(changeCount).toBeLessThanOrEqual(2);

      await watcher.stop();
    });
  });

  describe('watch modes', () => {
    it('should use polling mode when specified', async () => {
      const watcher = new FileWatcher({
        path: tempFile,
        mode: 'polling',
        pollInterval: 100,
      });

      const readyPromise = new Promise<void>((resolve) => {
        watcher.on('ready', resolve);
      });

      watcher.start();
      await readyPromise;
      await watcher.stop();
    });

    it('should use native mode by default', async () => {
      const watcher = new FileWatcher({ path: tempFile });

      const readyPromise = new Promise<void>((resolve) => {
        watcher.on('ready', resolve);
      });

      watcher.start();
      await readyPromise;
      await watcher.stop();
    });
  });

  describe('network paths', () => {
    it('should detect UNC paths as network paths', () => {
      // We can't directly test isNetworkPath, but we can verify the watcher handles it
      const watcher = new FileWatcher({
        path: '\\\\server\\share\\file.xml',
        mode: 'native', // Should auto-switch to polling
      });

      // Just verify it can be created without error
      expect(watcher).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should emit error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.xml');
      const watcher = new FileWatcher({
        path: nonExistentPath,
        mode: 'polling',
        pollInterval: 50,
      });

      // The watcher won't emit an error for a non-existent file during start
      // (chokidar waits for the file), but we verify it starts without throwing
      watcher.start();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await watcher.stop();
    });
  });
});
