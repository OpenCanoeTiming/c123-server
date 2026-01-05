import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import { AppSettingsManager, resetAppSettings, getAppSettings } from '../AppSettings.js';
import type { ClientConfig, CustomParamDefinition } from '../types.js';

// Mock fs and os modules
vi.mock('fs');
vi.mock('os');

describe('AppSettingsManager', () => {
  let manager: AppSettingsManager;
  let mockReadFileSync: ReturnType<typeof vi.fn>;
  let mockWriteFileSync: ReturnType<typeof vi.fn>;
  let mockExistsSync: ReturnType<typeof vi.fn>;
  let mockMkdirSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetAppSettings();

    // Setup mocks
    mockReadFileSync = vi.fn();
    mockWriteFileSync = vi.fn();
    mockExistsSync = vi.fn().mockReturnValue(false);
    mockMkdirSync = vi.fn();

    vi.mocked(fs.readFileSync).mockImplementation(mockReadFileSync);
    vi.mocked(fs.writeFileSync).mockImplementation(mockWriteFileSync);
    vi.mocked(fs.existsSync).mockImplementation(mockExistsSync);
    vi.mocked(fs.mkdirSync).mockImplementation(mockMkdirSync);
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');

    manager = new AppSettingsManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Configuration Management', () => {
    describe('getClientConfig', () => {
      it('should return undefined for unknown IP', () => {
        manager.load();
        expect(manager.getClientConfig('192.168.1.100')).toBeUndefined();
      });

      it('should return stored config for known IP', () => {
        const config: ClientConfig = {
          type: 'ledwall',
          displayRows: 8,
          label: 'Test Client',
        };

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': config,
            },
          }),
        );

        manager.load();
        const result = manager.getClientConfig('192.168.1.100');
        expect(result).toEqual(config);
      });
    });

    describe('setClientConfig', () => {
      it('should create new client config', () => {
        manager.load();

        const result = manager.setClientConfig('192.168.1.100', {
          type: 'ledwall',
          displayRows: 10,
        });

        expect(result.type).toBe('ledwall');
        expect(result.displayRows).toBe(10);
        expect(mockWriteFileSync).toHaveBeenCalled();
      });

      it('should merge with existing config', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': {
                type: 'ledwall',
                displayRows: 8,
                label: 'Original Label',
              },
            },
          }),
        );

        manager.load();

        // Update only displayRows
        const result = manager.setClientConfig('192.168.1.100', {
          displayRows: 12,
        });

        expect(result.type).toBe('ledwall'); // preserved
        expect(result.displayRows).toBe(12); // updated
        expect(result.label).toBe('Original Label'); // preserved
      });

      it('should merge custom params separately', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': {
                custom: {
                  existingKey: 'existingValue',
                  sharedKey: 'oldValue',
                },
              },
            },
          }),
        );

        manager.load();

        const result = manager.setClientConfig('192.168.1.100', {
          custom: {
            sharedKey: 'newValue',
            newKey: 'newKeyValue',
          },
        });

        expect(result.custom).toEqual({
          existingKey: 'existingValue', // preserved
          sharedKey: 'newValue', // updated
          newKey: 'newKeyValue', // added
        });
      });
    });

    describe('setClientLabel', () => {
      it('should set label for new client', () => {
        manager.load();
        manager.setClientLabel('192.168.1.100', 'TV in Hall');

        const config = manager.getClientConfig('192.168.1.100');
        expect(config?.label).toBe('TV in Hall');
      });

      it('should update label for existing client', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': {
                type: 'vertical',
                label: 'Old Label',
              },
            },
          }),
        );

        manager.load();
        manager.setClientLabel('192.168.1.100', 'New Label');

        const config = manager.getClientConfig('192.168.1.100');
        expect(config?.label).toBe('New Label');
        expect(config?.type).toBe('vertical'); // preserved
      });
    });

    describe('updateClientLastSeen', () => {
      it('should update lastSeen timestamp', () => {
        manager.load();

        const before = new Date();
        manager.updateClientLastSeen('192.168.1.100');
        const after = new Date();

        const config = manager.getClientConfig('192.168.1.100');
        expect(config?.lastSeen).toBeDefined();

        const lastSeen = new Date(config!.lastSeen!);
        expect(lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should preserve other config values when updating lastSeen', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': {
                type: 'ledwall',
                displayRows: 8,
              },
            },
          }),
        );

        manager.load();
        manager.updateClientLastSeen('192.168.1.100');

        const config = manager.getClientConfig('192.168.1.100');
        expect(config?.type).toBe('ledwall');
        expect(config?.displayRows).toBe(8);
        expect(config?.lastSeen).toBeDefined();
      });
    });

    describe('deleteClientConfig', () => {
      it('should return false for non-existent client', () => {
        manager.load();
        const result = manager.deleteClientConfig('192.168.1.100');
        expect(result).toBe(false);
      });

      it('should delete existing client config', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': { type: 'ledwall' },
              '192.168.1.101': { type: 'vertical' },
            },
          }),
        );

        manager.load();

        const result = manager.deleteClientConfig('192.168.1.100');
        expect(result).toBe(true);
        expect(manager.getClientConfig('192.168.1.100')).toBeUndefined();
        expect(manager.getClientConfig('192.168.1.101')).toBeDefined();
      });
    });

    describe('getAllClientConfigs', () => {
      it('should return empty object when no configs', () => {
        manager.load();
        expect(manager.getAllClientConfigs()).toEqual({});
      });

      it('should return all client configs', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': { type: 'ledwall', displayRows: 8 },
              '192.168.1.101': { type: 'vertical' },
            },
          }),
        );

        manager.load();
        const configs = manager.getAllClientConfigs();

        expect(Object.keys(configs)).toHaveLength(2);
        expect(configs['192.168.1.100'].type).toBe('ledwall');
        expect(configs['192.168.1.101'].type).toBe('vertical');
      });

      it('should return a copy, not the original object', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            clientConfigs: {
              '192.168.1.100': { type: 'ledwall' },
            },
          }),
        );

        manager.load();
        const configs1 = manager.getAllClientConfigs();
        const configs2 = manager.getAllClientConfigs();

        expect(configs1).not.toBe(configs2);
        expect(configs1).toEqual(configs2);
      });
    });
  });

  describe('Custom Parameter Definitions', () => {
    describe('getCustomParamDefinitions', () => {
      it('should return empty array when no definitions', () => {
        manager.load();
        expect(manager.getCustomParamDefinitions()).toEqual([]);
      });

      it('should return stored definitions', () => {
        const definitions: CustomParamDefinition[] = [
          { key: 'param1', label: 'Parameter 1', type: 'string' },
          { key: 'param2', label: 'Parameter 2', type: 'number', defaultValue: 10 },
        ];

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            customParamDefinitions: definitions,
          }),
        );

        manager.load();
        const result = manager.getCustomParamDefinitions();

        expect(result).toHaveLength(2);
        expect(result[0].key).toBe('param1');
        expect(result[1].defaultValue).toBe(10);
      });
    });

    describe('setCustomParamDefinitions', () => {
      it('should replace all definitions', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            customParamDefinitions: [{ key: 'old', label: 'Old', type: 'string' }],
          }),
        );

        manager.load();

        const newDefs: CustomParamDefinition[] = [
          { key: 'new1', label: 'New 1', type: 'string' },
          { key: 'new2', label: 'New 2', type: 'boolean' },
        ];

        manager.setCustomParamDefinitions(newDefs);

        const result = manager.getCustomParamDefinitions();
        expect(result).toHaveLength(2);
        expect(result[0].key).toBe('new1');
        expect(result[1].key).toBe('new2');
      });
    });

    describe('addCustomParamDefinition', () => {
      it('should add new definition', () => {
        manager.load();

        manager.addCustomParamDefinition({
          key: 'newParam',
          label: 'New Parameter',
          type: 'number',
          defaultValue: 42,
        });

        const result = manager.getCustomParamDefinitions();
        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('newParam');
        expect(result[0].defaultValue).toBe(42);
      });

      it('should replace existing definition with same key', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            customParamDefinitions: [
              { key: 'param1', label: 'Old Label', type: 'string' },
              { key: 'param2', label: 'Param 2', type: 'number' },
            ],
          }),
        );

        manager.load();

        manager.addCustomParamDefinition({
          key: 'param1',
          label: 'New Label',
          type: 'boolean',
        });

        const result = manager.getCustomParamDefinitions();
        expect(result).toHaveLength(2);

        const param1 = result.find((d) => d.key === 'param1');
        expect(param1?.label).toBe('New Label');
        expect(param1?.type).toBe('boolean');
      });
    });

    describe('removeCustomParamDefinition', () => {
      it('should return false for non-existent key', () => {
        manager.load();
        const result = manager.removeCustomParamDefinition('nonexistent');
        expect(result).toBe(false);
      });

      it('should remove existing definition', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(
          JSON.stringify({
            xmlSourceMode: 'auto-offline',
            xmlAutoDetect: true,
            xmlAutoDetectInterval: 30000,
            customParamDefinitions: [
              { key: 'param1', label: 'Param 1', type: 'string' },
              { key: 'param2', label: 'Param 2', type: 'number' },
            ],
          }),
        );

        manager.load();

        const result = manager.removeCustomParamDefinition('param1');
        expect(result).toBe(true);

        const defs = manager.getCustomParamDefinitions();
        expect(defs).toHaveLength(1);
        expect(defs[0].key).toBe('param2');
      });

      it('should return false when definitions array is empty', () => {
        manager.load();
        const result = manager.removeCustomParamDefinition('anyKey');
        expect(result).toBe(false);
      });
    });
  });

  describe('Persistence', () => {
    it('should save clientConfigs to file', () => {
      manager.load();
      manager.setClientConfig('192.168.1.100', { type: 'ledwall' });

      expect(mockWriteFileSync).toHaveBeenCalled();

      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.clientConfigs['192.168.1.100'].type).toBe('ledwall');
    });

    it('should save customParamDefinitions to file', () => {
      manager.load();
      manager.addCustomParamDefinition({
        key: 'test',
        label: 'Test',
        type: 'string',
      });

      expect(mockWriteFileSync).toHaveBeenCalled();

      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.customParamDefinitions).toHaveLength(1);
      expect(savedData.customParamDefinitions[0].key).toBe('test');
    });
  });

  describe('Singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getAppSettings();
      const instance2 = getAppSettings();
      expect(instance1).toBe(instance2);
    });

    it('should reset correctly', () => {
      const instance1 = getAppSettings();
      instance1.load();
      instance1.setClientConfig('192.168.1.100', { type: 'ledwall' });

      resetAppSettings();

      const instance2 = getAppSettings();
      expect(instance2).not.toBe(instance1);
      // Note: The new instance will have fresh defaults
    });
  });
});
