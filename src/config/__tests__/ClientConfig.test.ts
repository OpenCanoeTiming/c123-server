/**
 * Tests for ClientConfig and CustomParamDefinition functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppSettingsManager, resetAppSettings } from '../AppSettings.js';
import type { ClientConfig, CustomParamDefinition } from '../types.js';

describe('ClientConfig', () => {
  let tempDir: string;
  let settingsManager: AppSettingsManager;

  beforeEach(() => {
    resetAppSettings();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c123-test-'));
    settingsManager = new AppSettingsManager();
    // Override the settings path
    (settingsManager as unknown as { settingsPath: string }).settingsPath = path.join(
      tempDir,
      'settings.json',
    );
  });

  afterEach(() => {
    resetAppSettings();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getClientConfig', () => {
    it('should return undefined for unknown client', () => {
      expect(settingsManager.getClientConfig('192.168.1.50')).toBeUndefined();
    });

    it('should return stored config for known client', () => {
      settingsManager.setClientConfig('192.168.1.50', { label: 'TV' });
      const config = settingsManager.getClientConfig('192.168.1.50');

      expect(config).toBeDefined();
      expect(config?.label).toBe('TV');
    });
  });

  describe('setClientConfig', () => {
    it('should create new client config', () => {
      const config = settingsManager.setClientConfig('192.168.1.50', {
        label: 'Main Display',
        type: 'ledwall',
        displayRows: 8,
      });

      expect(config.label).toBe('Main Display');
      expect(config.type).toBe('ledwall');
      expect(config.displayRows).toBe(8);
    });

    it('should merge with existing config', () => {
      settingsManager.setClientConfig('192.168.1.50', {
        label: 'Display',
        type: 'ledwall',
      });

      const updated = settingsManager.setClientConfig('192.168.1.50', {
        displayRows: 10,
      });

      expect(updated.label).toBe('Display');
      expect(updated.type).toBe('ledwall');
      expect(updated.displayRows).toBe(10);
    });

    it('should merge custom params separately', () => {
      settingsManager.setClientConfig('192.168.1.50', {
        custom: { param1: 'value1' },
      });

      const updated = settingsManager.setClientConfig('192.168.1.50', {
        custom: { param2: 'value2' },
      });

      expect(updated.custom?.param1).toBe('value1');
      expect(updated.custom?.param2).toBe('value2');
    });

    it('should allow overriding custom params', () => {
      settingsManager.setClientConfig('192.168.1.50', {
        custom: { param1: 'original' },
      });

      const updated = settingsManager.setClientConfig('192.168.1.50', {
        custom: { param1: 'updated' },
      });

      expect(updated.custom?.param1).toBe('updated');
    });

    it('should persist config to disk', () => {
      settingsManager.setClientConfig('192.168.1.50', {
        label: 'Persisted',
        type: 'vertical',
      });

      // Create new instance
      const newManager = new AppSettingsManager();
      (newManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json',
      );
      newManager.load();

      const config = newManager.getClientConfig('192.168.1.50');
      expect(config?.label).toBe('Persisted');
      expect(config?.type).toBe('vertical');
    });
  });

  describe('setClientLabel', () => {
    it('should set label for new client', () => {
      settingsManager.setClientLabel('192.168.1.51', 'Startovka');
      const config = settingsManager.getClientConfig('192.168.1.51');

      expect(config?.label).toBe('Startovka');
    });

    it('should update label for existing client', () => {
      settingsManager.setClientConfig('192.168.1.51', { type: 'ledwall' });
      settingsManager.setClientLabel('192.168.1.51', 'New Label');

      const config = settingsManager.getClientConfig('192.168.1.51');
      expect(config?.label).toBe('New Label');
      expect(config?.type).toBe('ledwall');
    });
  });

  describe('updateClientLastSeen', () => {
    it('should set lastSeen for new client', () => {
      const before = new Date();
      settingsManager.updateClientLastSeen('192.168.1.52');
      const after = new Date();

      const config = settingsManager.getClientConfig('192.168.1.52');
      expect(config?.lastSeen).toBeDefined();

      const lastSeen = new Date(config!.lastSeen!);
      expect(lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update lastSeen for existing client', () => {
      settingsManager.setClientConfig('192.168.1.52', { label: 'Test' });

      settingsManager.updateClientLastSeen('192.168.1.52');

      const config = settingsManager.getClientConfig('192.168.1.52');
      expect(config?.label).toBe('Test');
      expect(config?.lastSeen).toBeDefined();
    });
  });

  describe('deleteClientConfig', () => {
    it('should delete existing config', () => {
      settingsManager.setClientConfig('192.168.1.53', { label: 'ToDelete' });
      expect(settingsManager.getClientConfig('192.168.1.53')).toBeDefined();

      const result = settingsManager.deleteClientConfig('192.168.1.53');

      expect(result).toBe(true);
      expect(settingsManager.getClientConfig('192.168.1.53')).toBeUndefined();
    });

    it('should return false for non-existent config', () => {
      const result = settingsManager.deleteClientConfig('192.168.1.99');
      expect(result).toBe(false);
    });
  });

  describe('getAllClientConfigs', () => {
    it('should return empty object when no configs', () => {
      const configs = settingsManager.getAllClientConfigs();
      expect(configs).toEqual({});
    });

    it('should return all stored configs', () => {
      settingsManager.setClientConfig('192.168.1.50', { label: 'A' });
      settingsManager.setClientConfig('192.168.1.51', { label: 'B' });
      settingsManager.setClientConfig('192.168.1.52', { label: 'C' });

      const configs = settingsManager.getAllClientConfigs();

      expect(Object.keys(configs)).toHaveLength(3);
      expect(configs['192.168.1.50']?.label).toBe('A');
      expect(configs['192.168.1.51']?.label).toBe('B');
      expect(configs['192.168.1.52']?.label).toBe('C');
    });

    it('should return a copy (not reference)', () => {
      settingsManager.setClientConfig('192.168.1.50', { label: 'Original' });

      const configs = settingsManager.getAllClientConfigs();
      configs['192.168.1.50'] = { label: 'Modified' };

      expect(settingsManager.getClientConfig('192.168.1.50')?.label).toBe('Original');
    });
  });
});

describe('CustomParamDefinition', () => {
  let tempDir: string;
  let settingsManager: AppSettingsManager;

  beforeEach(() => {
    resetAppSettings();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c123-test-'));
    settingsManager = new AppSettingsManager();
    (settingsManager as unknown as { settingsPath: string }).settingsPath = path.join(
      tempDir,
      'settings.json',
    );
  });

  afterEach(() => {
    resetAppSettings();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getCustomParamDefinitions', () => {
    it('should return empty array by default', () => {
      const defs = settingsManager.getCustomParamDefinitions();
      expect(defs).toEqual([]);
    });
  });

  describe('setCustomParamDefinitions', () => {
    it('should replace all definitions', () => {
      const defs: CustomParamDefinition[] = [
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
        { key: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14 },
      ];

      settingsManager.setCustomParamDefinitions(defs);

      const result = settingsManager.getCustomParamDefinitions();
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('theme');
      expect(result[1].key).toBe('fontSize');
    });

    it('should persist definitions', () => {
      settingsManager.setCustomParamDefinitions([
        { key: 'test', label: 'Test', type: 'boolean' },
      ]);

      const newManager = new AppSettingsManager();
      (newManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json',
      );
      newManager.load();

      const defs = newManager.getCustomParamDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].key).toBe('test');
    });
  });

  describe('addCustomParamDefinition', () => {
    it('should add new definition', () => {
      settingsManager.addCustomParamDefinition({
        key: 'newParam',
        label: 'New Parameter',
        type: 'string',
      });

      const defs = settingsManager.getCustomParamDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].key).toBe('newParam');
    });

    it('should replace existing definition with same key', () => {
      settingsManager.addCustomParamDefinition({
        key: 'param',
        label: 'Original',
        type: 'string',
      });

      settingsManager.addCustomParamDefinition({
        key: 'param',
        label: 'Updated',
        type: 'number',
      });

      const defs = settingsManager.getCustomParamDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].label).toBe('Updated');
      expect(defs[0].type).toBe('number');
    });

    it('should add multiple definitions', () => {
      settingsManager.addCustomParamDefinition({ key: 'a', label: 'A', type: 'string' });
      settingsManager.addCustomParamDefinition({ key: 'b', label: 'B', type: 'number' });
      settingsManager.addCustomParamDefinition({ key: 'c', label: 'C', type: 'boolean' });

      const defs = settingsManager.getCustomParamDefinitions();
      expect(defs).toHaveLength(3);
    });
  });

  describe('removeCustomParamDefinition', () => {
    it('should remove existing definition', () => {
      settingsManager.addCustomParamDefinition({ key: 'toRemove', label: 'Remove Me', type: 'string' });
      expect(settingsManager.getCustomParamDefinitions()).toHaveLength(1);

      const result = settingsManager.removeCustomParamDefinition('toRemove');

      expect(result).toBe(true);
      expect(settingsManager.getCustomParamDefinitions()).toHaveLength(0);
    });

    it('should return false for non-existent definition', () => {
      const result = settingsManager.removeCustomParamDefinition('nonExistent');
      expect(result).toBe(false);
    });

    it('should not affect other definitions', () => {
      settingsManager.addCustomParamDefinition({ key: 'a', label: 'A', type: 'string' });
      settingsManager.addCustomParamDefinition({ key: 'b', label: 'B', type: 'string' });
      settingsManager.addCustomParamDefinition({ key: 'c', label: 'C', type: 'string' });

      settingsManager.removeCustomParamDefinition('b');

      const defs = settingsManager.getCustomParamDefinitions();
      expect(defs).toHaveLength(2);
      expect(defs.find((d) => d.key === 'a')).toBeDefined();
      expect(defs.find((d) => d.key === 'b')).toBeUndefined();
      expect(defs.find((d) => d.key === 'c')).toBeDefined();
    });
  });
});
