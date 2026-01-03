import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { XmlChangeNotifier } from '../XmlChangeNotifier.js';
import type { XmlSection } from '../../protocol/types.js';

describe('XmlChangeNotifier', () => {
  let tempDir: string;
  let xmlPath: string;
  let notifier: XmlChangeNotifier;

  const baseXml = `<?xml version="1.0"?>
<Canoe123Data>
  <Participants>
    <Participant Id="1" Name="Test" />
  </Participants>
  <Schedule>
    <Race Id="K1M_BR1" />
  </Schedule>
  <Results>
    <Result Id="1" Time="100" />
  </Results>
</Canoe123Data>`;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'xml-notifier-test-'));
    xmlPath = path.join(tempDir, 'test.xml');
    await writeFile(xmlPath, baseXml, 'utf-8');
  });

  afterEach(async () => {
    await notifier?.stop();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('basic functionality', () => {
    it('should emit initial change event on start', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
      });

      const changePromise = new Promise<{ sections: XmlSection[]; checksum: string }>((resolve) => {
        notifier.on('change', (sections, checksum) => {
          resolve({ sections, checksum });
        });
      });

      notifier.start();

      const { sections, checksum } = await changePromise;

      expect(sections).toContain('Participants');
      expect(sections).toContain('Schedule');
      expect(sections).toContain('Results');
      expect(checksum).toBeTruthy();
    });

    it('should provide checksum after initial read', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
      });

      expect(notifier.getChecksum()).toBeNull();

      const changePromise = new Promise<void>((resolve) => {
        notifier.on('change', () => resolve());
      });

      notifier.start();
      await changePromise;

      expect(notifier.getChecksum()).toBeTruthy();
    });
  });

  describe('diff detection', () => {
    it('should detect change in Results section only', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      let changeCount = 0;
      let lastSections: XmlSection[] = [];

      notifier.on('change', (sections) => {
        changeCount++;
        lastSections = sections;
      });

      notifier.start();

      // Wait for initial change
      await new Promise((r) => setTimeout(r, 100));
      expect(changeCount).toBe(1);

      // Modify only Results section
      const modifiedXml = baseXml.replace('Time="100"', 'Time="150"');
      await writeFile(xmlPath, modifiedXml, 'utf-8');

      // Wait for change detection
      await new Promise((r) => setTimeout(r, 200));

      expect(changeCount).toBe(2);
      expect(lastSections).toEqual(['Results']);
    });

    it('should detect change in Participants section only', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      let changeCount = 0;
      let lastSections: XmlSection[] = [];

      notifier.on('change', (sections) => {
        changeCount++;
        lastSections = sections;
      });

      notifier.start();

      // Wait for initial change
      await new Promise((r) => setTimeout(r, 100));

      // Modify only Participants section
      const modifiedXml = baseXml.replace('Name="Test"', 'Name="Modified"');
      await writeFile(xmlPath, modifiedXml, 'utf-8');

      // Wait for change detection
      await new Promise((r) => setTimeout(r, 200));

      expect(changeCount).toBe(2);
      expect(lastSections).toEqual(['Participants']);
    });

    it('should detect changes in multiple sections', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      let changeCount = 0;
      let lastSections: XmlSection[] = [];

      notifier.on('change', (sections) => {
        changeCount++;
        lastSections = sections;
      });

      notifier.start();

      // Wait for initial change
      await new Promise((r) => setTimeout(r, 100));

      // Modify both Participants and Results
      const modifiedXml = baseXml.replace('Name="Test"', 'Name="Modified"').replace('Time="100"', 'Time="200"');
      await writeFile(xmlPath, modifiedXml, 'utf-8');

      // Wait for change detection
      await new Promise((r) => setTimeout(r, 200));

      expect(changeCount).toBe(2);
      expect(lastSections).toContain('Participants');
      expect(lastSections).toContain('Results');
      expect(lastSections).not.toContain('Schedule');
    });

    it('should not emit change if file content unchanged', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      let changeCount = 0;

      notifier.on('change', () => {
        changeCount++;
      });

      notifier.start();

      // Wait for initial change
      await new Promise((r) => setTimeout(r, 100));
      expect(changeCount).toBe(1);

      // Write same content - should not trigger change
      await writeFile(xmlPath, baseXml, 'utf-8');

      // Wait
      await new Promise((r) => setTimeout(r, 200));

      expect(changeCount).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should emit error for invalid XML', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      const errorPromise = new Promise<Error>((resolve) => {
        notifier.on('error', (err) => resolve(err));
      });

      notifier.start();

      // Wait for initial read
      await new Promise((r) => setTimeout(r, 100));

      // Write invalid XML (not Canoe123 format)
      await writeFile(xmlPath, '<NotCanoe123>invalid</NotCanoe123>', 'utf-8');

      const error = await errorPromise;
      expect(error.message).toContain('not a Canoe123 file');
    });

    it('should handle file not found gracefully', async () => {
      const nonexistentPath = path.join(tempDir, 'nonexistent.xml');

      notifier = new XmlChangeNotifier({
        path: nonexistentPath,
        watchMode: 'polling',
        pollInterval: 50,
      });

      // Should not throw
      notifier.start();

      // Should not emit change for nonexistent file
      const changeHandler = vi.fn();
      notifier.on('change', changeHandler);

      await new Promise((r) => setTimeout(r, 100));
      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('start/stop', () => {
    it('should stop watching when stopped', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
        debounceMs: 10,
      });

      let changeCount = 0;
      notifier.on('change', () => changeCount++);

      notifier.start();

      // Wait for initial change
      await new Promise((r) => setTimeout(r, 100));
      expect(changeCount).toBe(1);

      // Stop watching
      await notifier.stop();

      // Modify file
      const modifiedXml = baseXml.replace('Time="100"', 'Time="999"');
      await writeFile(xmlPath, modifiedXml, 'utf-8');

      // Wait - should not trigger additional change
      await new Promise((r) => setTimeout(r, 200));

      expect(changeCount).toBe(1);
    });

    it('should be safe to call stop multiple times', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
      });

      notifier.start();
      await new Promise((r) => setTimeout(r, 50));

      // Should not throw
      await notifier.stop();
      await notifier.stop();
      await notifier.stop();
    });

    it('should be safe to call start multiple times', async () => {
      notifier = new XmlChangeNotifier({
        path: xmlPath,
        watchMode: 'polling',
        pollInterval: 50,
      });

      let changeCount = 0;
      notifier.on('change', () => changeCount++);

      // Multiple starts should not cause issues
      notifier.start();
      notifier.start();
      notifier.start();

      await new Promise((r) => setTimeout(r, 100));

      // Should only emit one initial change
      expect(changeCount).toBe(1);
    });
  });
});
