import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ChecksStore } from '../ChecksStore.js';
import type {
  CheckEntry,
  FlagEntry,
  CheckChangedEvent,
  FlagChangedEvent,
} from '../types.js';

describe('ChecksStore', () => {
  let tempDir: string;
  let store: ChecksStore;
  let testCounter = 0;

  // Mock os.homedir() to use temp directory
  const originalPlatform = process.platform;

  // Helper to get unique test file name for each test
  const getUniqueTestFile = () => `test-${++testCounter}.xml`;

  beforeEach(() => {
    // Restore all mocks first to ensure clean state
    vi.restoreAllMocks();

    // Create a unique temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'checksstore-test-'));

    // Set HOME environment variable (works on Linux/macOS)
    process.env.HOME = tempDir;

    // Mock homedir to use temp directory (for additional safety)
    vi.spyOn(require('os'), 'homedir').mockReturnValue(tempDir);

    // Create store - it will now use tempDir as home
    store = new ChecksStore();
  });

  afterEach(() => {
    // Cleanup
    if (store) {
      store.destroy();
    }

    // Restore mocks first
    vi.restoreAllMocks();

    // Remove temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('File load/save lifecycle', () => {
    it('loadForFile() creates new data when file does not exist', () => {
      const filename = getUniqueTestFile();
      store.loadForFile(filename, 'fingerprint123');

      const data = store.getAllChecks();
      expect(data).toBeDefined();
      expect(data?.xmlFilename).toBe(filename);
      expect(data?.fingerprint).toBe('fingerprint123');
      expect(data?.races).toEqual({});
    });

    it('loadForFile() loads existing data', () => {
      const filename = getUniqueTestFile();

      // First load creates the file
      store.loadForFile(filename, 'fingerprint123');
      store.setCheck('K1M-1', '1', 1, 2);
      store.flush();
      store.destroy();

      // Create a new store instance with mocked homedir
      vi.spyOn(require('os'), 'homedir').mockReturnValue(tempDir);
      const store2 = new ChecksStore();
      store2.loadForFile(filename, 'fingerprint123');

      const data = store2.getAllChecks();
      expect(data?.xmlFilename).toBe(filename);
      expect(data?.fingerprint).toBe('fingerprint123');
      expect(data?.races['K1M-1']?.checks['1:1']).toBeDefined();

      store2.destroy();
      store = null as any; // Prevent double cleanup in afterEach
    });

    it('loadForFile() archives data when fingerprint mismatches', () => {
      const filename = getUniqueTestFile();

      // Create initial data with old fingerprint
      store.loadForFile(filename, 'old-fingerprint');
      store.setCheck('K1M-1', '1', 1, 2);
      store.flush();

      const checksDir = join(tempDir, '.c123-server', 'checks');
      store.destroy();

      // Create new store and load with different fingerprint
      vi.spyOn(require('os'), 'homedir').mockReturnValue(tempDir);
      const store2 = new ChecksStore();
      store2.loadForFile(filename, 'new-fingerprint');

      // Data should be fresh
      const data = store2.getAllChecks();
      expect(data?.fingerprint).toBe('new-fingerprint');
      expect(data?.races).toEqual({});

      // Check for archived file BEFORE destroying store2
      const files = readdirSync(checksDir);
      const archivedFile = files.find(f => f.includes('.archived-'));
      expect(archivedFile).toBeDefined();

      store2.destroy();
      store = null as any; // Prevent double cleanup in afterEach
    });

    it('flush() writes data to disk immediately', () => {
      const filename = getUniqueTestFile();
      store.loadForFile(filename, 'fingerprint123');
      store.setCheck('K1M-1', '1', 1, 2);

      // Flush immediately
      store.flush();

      // Verify file exists
      const checksDir = join(tempDir, '.c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);

      // Verify file was written
      expect(existsSync(filePath)).toBe(true);

      // Verify content
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.xmlFilename).toBe(filename);
      expect(content.races['K1M-1']).toBeDefined();
    });

    it('flush() uses atomic write pattern (tmp → rename)', () => {
      const filename = getUniqueTestFile();
      store.loadForFile(filename, 'fingerprint123');
      store.setCheck('K1M-1', '1', 1, 2);

      const checksDir = join(tempDir, '.c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);

      store.flush();

      // Verify final file exists
      expect(existsSync(filePath)).toBe(true);

      // Verify tmp file doesn't exist after flush (was renamed)
      const tmpPath = `${filePath}.tmp`;
      expect(existsSync(tmpPath)).toBe(false);

      // Verify content was written correctly
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(content.races['K1M-1'].checks['1:1']).toBeDefined();
    });
  });

  describe('Check CRUD', () => {
    beforeEach(() => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');
    });

    it('setCheck() creates a new check entry', () => {
      const check = store.setCheck('K1M-1', '1', 1, 2, 'verified');

      expect(check.value).toBe(2);
      expect(check.tag).toBe('verified');
      expect(check.checkedAt).toBeDefined();

      const data = store.getChecks('K1M-1');
      expect(data.checks['1:1']).toEqual(check);
    });

    it('setCheck() updates existing check', async () => {
      const check1 = store.setCheck('K1M-1', '1', 1, 2);

      // Wait 1ms to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));

      const check2 = store.setCheck('K1M-1', '1', 1, 0, 'corrected');

      expect(check2.value).toBe(0);
      expect(check2.tag).toBe('corrected');
      expect(check2.checkedAt).not.toBe(check1.checkedAt);

      const data = store.getChecks('K1M-1');
      expect(Object.keys(data.checks)).toHaveLength(1);
    });

    it('getChecks() returns empty data for unknown race', () => {
      const data = store.getChecks('unknown-race');

      expect(data.checks).toEqual({});
      expect(data.flags).toEqual([]);
    });

    it('removeCheck() removes existing check, returns true', () => {
      store.setCheck('K1M-1', '1', 1, 2);

      const result = store.removeCheck('K1M-1', '1', 1);
      expect(result).toBe(true);

      const data = store.getChecks('K1M-1');
      expect(data.checks['1:1']).toBeUndefined();
    });

    it('removeCheck() returns false for non-existent check', () => {
      const result = store.removeCheck('K1M-1', '1', 1);
      expect(result).toBe(false);
    });

    it('clearRace() removes all checks and flags for a race', () => {
      store.setCheck('K1M-1', '1', 1, 2);
      store.setCheck('K1M-1', '2', 3, 0);
      store.createFlag('K1M-1', '3', 5, 'check this');

      store.clearRace('K1M-1');

      const data = store.getChecks('K1M-1');
      expect(data.checks).toEqual({});
      expect(data.flags).toEqual([]);
    });
  });

  describe('Flag CRUD', () => {
    beforeEach(() => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');
    });

    it('createFlag() creates flag with unique ID', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check gate 1', 2);

      expect(flag.id).toBeDefined();
      expect(flag.bib).toBe('1');
      expect(flag.gate).toBe(1);
      expect(flag.comment).toBe('check gate 1');
      expect(flag.suggestedValue).toBe(2);
      expect(flag.resolved).toBe(false);
      expect(flag.createdAt).toBeDefined();

      const data = store.getChecks('K1M-1');
      expect(data.flags).toHaveLength(1);
      expect(data.flags[0]).toEqual(flag);
    });

    it('resolveFlag() marks flag as resolved', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check gate 1');

      const result = store.resolveFlag('K1M-1', flag.id, 'looks good');

      expect(result.flag.resolved).toBe(true);
      expect(result.flag.resolvedAt).toBeDefined();
      expect(result.flag.resolution).toBe('looks good');
    });

    it('resolveFlag() auto-creates check entry when bib+gate exist', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check gate 1', 2);

      const result = store.resolveFlag('K1M-1', flag.id, 'confirmed', 2);

      expect(result.check).toBeDefined();
      expect(result.check?.value).toBe(2);
      expect(result.check?.tag).toContain('Auto-check from flag');

      const data = store.getChecks('K1M-1');
      expect(data.checks['1:1']).toBeDefined();
    });

    it('resolveFlag() uses suggested value when current value not provided', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check gate 1', 50);

      const result = store.resolveFlag('K1M-1', flag.id);

      expect(result.check?.value).toBe(50);
    });

    it('resolveFlag() throws error for non-existent flag', () => {
      expect(() => {
        store.resolveFlag('K1M-1', 'non-existent-id');
      }).toThrow();
    });

    it('resolveFlag() throws error for already resolved flag', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check');
      store.resolveFlag('K1M-1', flag.id);

      expect(() => {
        store.resolveFlag('K1M-1', flag.id);
      }).toThrow('already resolved');
    });

    it('deleteFlag() removes flag', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check gate 1');

      const deleted = store.deleteFlag('K1M-1', flag.id);

      expect(deleted).toEqual(flag);

      const data = store.getChecks('K1M-1');
      expect(data.flags).toHaveLength(0);
    });

    it('deleteFlag() returns null for non-existent flag', () => {
      const result = store.deleteFlag('K1M-1', 'non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('Scoring invalidation', () => {
    beforeEach(() => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');
    });

    it('invalidateCheck() removes existing check, returns true', () => {
      store.setCheck('K1M-1', '1', 1, 2);

      const result = store.invalidateCheck('K1M-1', '1', 1);

      expect(result).toBe(true);

      const data = store.getChecks('K1M-1');
      expect(data.checks['1:1']).toBeUndefined();
    });

    it('invalidateCheck() returns false when no check exists', () => {
      const result = store.invalidateCheck('K1M-1', '1', 1);
      expect(result).toBe(false);
    });

    it('invalidateCheck() emits check-invalidated event', () => {
      store.setCheck('K1M-1', '1', 1, 2);

      const events: CheckChangedEvent[] = [];
      store.on('checkChanged', (event) => events.push(event));

      store.invalidateCheck('K1M-1', '1', 1);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'check-invalidated',
        raceId: 'K1M-1',
        bib: '1',
        gate: 1,
      });
    });
  });

  describe('Events', () => {
    beforeEach(() => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');
    });

    it('setCheck emits checkChanged with event=check-set', () => {
      const events: CheckChangedEvent[] = [];
      store.on('checkChanged', (event) => events.push(event));

      const check = store.setCheck('K1M-1', '1', 1, 2, 'verified');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'check-set',
        raceId: 'K1M-1',
        bib: '1',
        gate: 1,
        check,
      });
    });

    it('removeCheck emits checkChanged with event=check-removed', () => {
      store.setCheck('K1M-1', '1', 1, 2);

      const events: CheckChangedEvent[] = [];
      store.on('checkChanged', (event) => events.push(event));

      store.removeCheck('K1M-1', '1', 1);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'check-removed',
        raceId: 'K1M-1',
        bib: '1',
        gate: 1,
      });
    });

    it('clearRace emits checkChanged with event=checks-cleared', () => {
      store.setCheck('K1M-1', '1', 1, 2);

      const events: CheckChangedEvent[] = [];
      store.on('checkChanged', (event) => events.push(event));

      store.clearRace('K1M-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'checks-cleared',
        raceId: 'K1M-1',
      });
    });

    it('createFlag emits flagChanged with event=flag-created', () => {
      const events: FlagChangedEvent[] = [];
      store.on('flagChanged', (event) => events.push(event));

      const flag = store.createFlag('K1M-1', '1', 1, 'check this');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'flag-created',
        raceId: 'K1M-1',
        flag,
        bib: '1',
        gate: 1,
      });
    });

    it('resolveFlag emits flagChanged with event=flag-resolved', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check this');

      const events: FlagChangedEvent[] = [];
      store.on('flagChanged', (event) => events.push(event));

      store.resolveFlag('K1M-1', flag.id);

      // Note: resolveFlag calls setCheck which emits checkChanged,
      // so we filter for flagChanged events only
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].event).toBe('flag-resolved');
      expect(events[0].raceId).toBe('K1M-1');
      expect(events[0].flag.id).toBe(flag.id);
    });

    it('deleteFlag emits flagChanged with event=flag-deleted', () => {
      const flag = store.createFlag('K1M-1', '1', 1, 'check this');

      const events: FlagChangedEvent[] = [];
      store.on('flagChanged', (event) => events.push(event));

      store.deleteFlag('K1M-1', flag.id);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event: 'flag-deleted',
        raceId: 'K1M-1',
        flag,
        bib: '1',
        gate: 1,
      });
    });
  });

  describe('Debounced flush', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('multiple rapid changes result in single disk write', () => {
      const filename = store.getAllChecks()!.xmlFilename;
      const checksDir = join(tempDir, '.c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);

      // Make multiple rapid changes
      store.setCheck('K1M-1', '1', 1, 2);
      store.setCheck('K1M-1', '2', 2, 0);
      store.setCheck('K1M-1', '3', 3, 50);

      // File should not exist yet (debounced)
      expect(existsSync(filePath)).toBe(false);

      // Advance timers to trigger debounced flush
      vi.advanceTimersByTime(2000);

      // File should now exist
      expect(existsSync(filePath)).toBe(true);

      // Verify all changes were saved
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(Object.keys(content.races['K1M-1'].checks)).toHaveLength(3);
    });

    it('flush() cancels pending debounce and writes immediately', () => {
      const filename = store.getAllChecks()!.xmlFilename;
      const checksDir = join(tempDir, '.c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);

      store.setCheck('K1M-1', '1', 1, 2);

      // File should not exist yet (debounced)
      expect(existsSync(filePath)).toBe(false);

      // Flush immediately
      store.flush();

      // File should exist immediately
      expect(existsSync(filePath)).toBe(true);

      // Make another change
      store.setCheck('K1M-1', '2', 2, 0);

      // Advance timers - should trigger second flush
      vi.advanceTimersByTime(2000);

      // Verify both checks are saved
      const content = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(Object.keys(content.races['K1M-1'].checks)).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    it('operations before loadForFile() should not crash', () => {
      expect(() => {
        store.getChecks('K1M-1');
      }).not.toThrow();

      const data = store.getChecks('K1M-1');
      expect(data.checks).toEqual({});
      expect(data.flags).toEqual([]);
    });

    it('setCheck before loadForFile() throws error', () => {
      expect(() => {
        store.setCheck('K1M-1', '1', 1, 2);
      }).toThrow('No checks file loaded');
    });

    it('createFlag before loadForFile() throws error', () => {
      expect(() => {
        store.createFlag('K1M-1', '1', 1, 'check');
      }).toThrow('No checks file loaded');
    });

    it('destroy() flushes and cleans up', () => {
      const filename = getUniqueTestFile();
      store.loadForFile(filename, 'fingerprint123');
      store.setCheck('K1M-1', '1', 1, 2);

      store.destroy();

      // Verify data was flushed
      const checksDir = join(tempDir, '.c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);
      expect(existsSync(filePath)).toBe(true);
    });

    it('handles multiple races independently', () => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');

      store.setCheck('K1M-1', '1', 1, 2);
      store.setCheck('K1W-1', '2', 3, 0);

      const data1 = store.getChecks('K1M-1');
      const data2 = store.getChecks('K1W-1');

      expect(data1.checks['1:1']).toBeDefined();
      expect(data1.checks['2:3']).toBeUndefined();

      expect(data2.checks['2:3']).toBeDefined();
      expect(data2.checks['1:1']).toBeUndefined();
    });

    it('handles gates with same bib in different gates', () => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');

      store.setCheck('K1M-1', '1', 1, 2);
      store.setCheck('K1M-1', '1', 5, 0);
      store.setCheck('K1M-1', '1', 10, 50);

      const data = store.getChecks('K1M-1');
      expect(Object.keys(data.checks)).toHaveLength(3);
      expect(data.checks['1:1'].value).toBe(2);
      expect(data.checks['1:5'].value).toBe(0);
      expect(data.checks['1:10'].value).toBe(50);
    });

    it('handles null penalty value', () => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');

      const check = store.setCheck('K1M-1', '1', 1, null, 'no penalty');

      expect(check.value).toBeNull();
      expect(check.tag).toBe('no penalty');
    });

    it('handles check without tag', () => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');

      const check = store.setCheck('K1M-1', '1', 1, 2);

      expect(check.tag).toBeUndefined();
    });

    it('handles flag without suggested value', () => {
      store.loadForFile(getUniqueTestFile(), 'fingerprint123');

      const flag = store.createFlag('K1M-1', '1', 1, 'check this');

      expect(flag.suggestedValue).toBeUndefined();
    });
  });

  describe('Windows platform', () => {
    let originalAppData: string | undefined;
    let winTempDir: string;

    beforeEach(() => {
      // Create separate temp directory for Windows tests
      winTempDir = mkdtempSync(join(tmpdir(), 'checksstore-win-test-'));

      // Save original APPDATA
      originalAppData = process.env.APPDATA;

      // Mock Windows platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      });

      // Mock APPDATA environment variable
      process.env.APPDATA = winTempDir;
    });

    afterEach(() => {
      // Restore platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });

      // Restore APPDATA
      if (originalAppData !== undefined) {
        process.env.APPDATA = originalAppData;
      } else {
        delete process.env.APPDATA;
      }

      // Clean up Windows temp directory
      if (existsSync(winTempDir)) {
        rmSync(winTempDir, { recursive: true, force: true });
      }
    });

    it('uses APPDATA on Windows', () => {
      const winStore = new ChecksStore();
      const filename = getUniqueTestFile();
      winStore.loadForFile(filename, 'fingerprint123');
      winStore.setCheck('K1M-1', '1', 1, 2);
      winStore.flush();

      // Verify file is created in APPDATA path
      const checksDir = join(winTempDir, 'c123-server', 'checks');
      const filePath = join(checksDir, `${filename}.checks.json`);
      expect(existsSync(filePath)).toBe(true);

      winStore.destroy();
    });

    it('throws error when APPDATA not set on Windows', () => {
      delete process.env.APPDATA;

      expect(() => {
        new ChecksStore();
      }).toThrow('APPDATA environment variable not found');
    });
  });
});
