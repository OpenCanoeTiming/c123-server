/**
 * Tests for XmlSourceMode and related functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WindowsConfigDetector } from '../WindowsConfigDetector.js';
import { AppSettingsManager, resetAppSettings } from '../AppSettings.js';
import type { XmlSourceMode } from '../types.js';

describe('XmlSourceMode', () => {
  describe('WindowsConfigDetector.detectByMode', () => {
    it('should return error for manual mode', () => {
      const detector = new WindowsConfigDetector();
      const result = detector.detectByMode('manual');

      expect(result.path).toBeNull();
      expect(result.source).toBeNull();
      expect(result.exists).toBe(false);
      expect(result.error).toBe('Manual mode - no autodetection');
    });

    it('should return error for auto modes on non-Windows', () => {
      // This test only runs on non-Windows
      if (process.platform === 'win32') {
        return;
      }

      const detector = new WindowsConfigDetector();

      const resultMain = detector.detectByMode('auto-main');
      expect(resultMain.error).toBe('Autodetection is only available on Windows');

      const resultOffline = detector.detectByMode('auto-offline');
      expect(resultOffline.error).toBe('Autodetection is only available on Windows');
    });
  });

  describe('WindowsConfigDetector.getAvailablePaths', () => {
    it('should return error for non-Windows platform', () => {
      if (process.platform === 'win32') {
        return;
      }

      const detector = new WindowsConfigDetector();
      const result = detector.getAvailablePaths();

      expect(result.main.path).toBeNull();
      expect(result.main.exists).toBe(false);
      expect(result.offline.path).toBeNull();
      expect(result.offline.exists).toBe(false);
      expect(result.error).toBe('Autodetection is only available on Windows');
    });

    it('should return both main and offline paths structure', () => {
      const detector = new WindowsConfigDetector();
      const result = detector.getAvailablePaths();

      // Structure should always be present
      expect(result).toHaveProperty('main');
      expect(result).toHaveProperty('offline');
      expect(result.main).toHaveProperty('path');
      expect(result.main).toHaveProperty('exists');
      expect(result.offline).toHaveProperty('path');
      expect(result.offline).toHaveProperty('exists');
    });
  });

  describe('AppSettingsManager.setXmlSourceMode', () => {
    let tempDir: string;
    let settingsManager: AppSettingsManager;

    beforeEach(() => {
      resetAppSettings();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c123-test-'));
      // Create a new instance with mocked path
      settingsManager = new AppSettingsManager();
      // Override the settings path
      (settingsManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json'
      );
    });

    afterEach(() => {
      resetAppSettings();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should set mode to auto-offline', () => {
      settingsManager.setXmlSourceMode('auto-offline');
      const settings = settingsManager.get();

      expect(settings.xmlSourceMode).toBe('auto-offline');
      expect(settings.xmlAutoDetect).toBe(true);
    });

    it('should set mode to auto-main', () => {
      settingsManager.setXmlSourceMode('auto-main');
      const settings = settingsManager.get();

      expect(settings.xmlSourceMode).toBe('auto-main');
      expect(settings.xmlAutoDetect).toBe(true);
    });

    it('should set mode to manual', () => {
      // First set an auto mode
      settingsManager.setXmlSourceMode('auto-offline');
      // Then switch to manual
      settingsManager.setXmlSourceMode('manual');
      const settings = settingsManager.get();

      expect(settings.xmlSourceMode).toBe('manual');
      expect(settings.xmlAutoDetect).toBe(false);
    });

    it('should clear manual path when switching to auto mode', () => {
      // Set manual path first
      settingsManager.setXmlPath('/some/path.xml');
      expect(settingsManager.get().xmlPath).toBe('/some/path.xml');

      // Switch to auto mode
      settingsManager.setXmlSourceMode('auto-offline');
      expect(settingsManager.get().xmlPath).toBeUndefined();
    });

    it('should return correct mode from getXmlSourceMode', () => {
      settingsManager.setXmlSourceMode('auto-main');
      expect(settingsManager.getXmlSourceMode()).toBe('auto-main');

      settingsManager.setXmlSourceMode('auto-offline');
      expect(settingsManager.getXmlSourceMode()).toBe('auto-offline');

      settingsManager.setXmlSourceMode('manual');
      expect(settingsManager.getXmlSourceMode()).toBe('manual');
    });
  });

  describe('AppSettingsManager.setXmlPath', () => {
    let tempDir: string;
    let settingsManager: AppSettingsManager;

    beforeEach(() => {
      resetAppSettings();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c123-test-'));
      settingsManager = new AppSettingsManager();
      (settingsManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json'
      );
    });

    afterEach(() => {
      resetAppSettings();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should set mode to manual when setting path', () => {
      settingsManager.setXmlPath('/some/path.xml');
      const settings = settingsManager.get();

      expect(settings.xmlPath).toBe('/some/path.xml');
      expect(settings.xmlSourceMode).toBe('manual');
      expect(settings.xmlAutoDetect).toBe(false);
    });
  });

  describe('Valid XmlSourceMode values', () => {
    it('should accept all valid mode values', () => {
      const validModes: XmlSourceMode[] = ['auto-main', 'auto-offline', 'manual'];

      for (const mode of validModes) {
        expect(typeof mode).toBe('string');
      }
    });
  });

  describe('AppSettingsManager.eventNameOverride', () => {
    let tempDir: string;
    let settingsManager: AppSettingsManager;

    beforeEach(() => {
      resetAppSettings();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'c123-test-'));
      settingsManager = new AppSettingsManager();
      (settingsManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json'
      );
    });

    afterEach(() => {
      resetAppSettings();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return undefined by default', () => {
      expect(settingsManager.getEventNameOverride()).toBeUndefined();
    });

    it('should set and get event name override', () => {
      settingsManager.setEventNameOverride('Test Event 2025');
      expect(settingsManager.getEventNameOverride()).toBe('Test Event 2025');
    });

    it('should persist event name override', () => {
      settingsManager.setEventNameOverride('Persistent Event');

      // Create a new instance and load
      const newManager = new AppSettingsManager();
      (newManager as unknown as { settingsPath: string }).settingsPath = path.join(
        tempDir,
        'settings.json'
      );
      newManager.load();

      expect(newManager.getEventNameOverride()).toBe('Persistent Event');
    });

    it('should clear event name override with undefined', () => {
      settingsManager.setEventNameOverride('Some Event');
      expect(settingsManager.getEventNameOverride()).toBe('Some Event');

      settingsManager.setEventNameOverride(undefined);
      expect(settingsManager.getEventNameOverride()).toBeUndefined();
    });

    it('should clear event name override with empty string', () => {
      settingsManager.setEventNameOverride('Some Event');
      settingsManager.setEventNameOverride('');
      expect(settingsManager.getEventNameOverride()).toBeUndefined();
    });

    it('should clear event name override with clearEventNameOverride', () => {
      settingsManager.setEventNameOverride('Some Event');
      settingsManager.clearEventNameOverride();
      expect(settingsManager.getEventNameOverride()).toBeUndefined();
    });
  });
});
