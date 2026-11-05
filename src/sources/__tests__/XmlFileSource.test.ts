import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { XmlFileSource } from '../XmlFileSource.js';
import { FileWatcher } from '../FileWatcher.js';
import type { SourceStatus } from '../types.js';

describe('XmlFileSource', () => {
  let tempDir: string;
  let testFile: string;
  let source: XmlFileSource;

  const validXml = `<?xml version="1.0"?>
<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">
  <Participants>
    <EventBib>1</EventBib>
    <FamilyName>Test</FamilyName>
  </Participants>
</Canoe123Data>`;

  beforeEach(() => {
    // Create temp directory and file
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-source-test-'));
    testFile = path.join(tempDir, 'test.xml');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    source?.stop();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should read XML file and emit message', async () => {
    fs.writeFileSync(testFile, validXml);

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    expect(source.status).toBe('connected');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('<Canoe123Data');
  });

  it('should track status changes', async () => {
    fs.writeFileSync(testFile, validXml);

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const statusChanges: SourceStatus[] = [];
    source.on('status', (status) => statusChanges.push(status));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    expect(statusChanges).toContain('connecting');
    expect(statusChanges).toContain('connected');
  });

  it('should emit error for non-existent file', async () => {
    const nonExistentFile = path.join(tempDir, 'nonexistent.xml');
    source = new XmlFileSource({ path: nonExistentFile, pollInterval: 100 });

    const errors: Error[] = [];
    source.on('error', (err) => errors.push(err));

    source.start();

    // Wait for poll to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('not found');
  });

  it('should emit error for invalid XML (not Canoe123)', async () => {
    fs.writeFileSync(testFile, '<SomeOtherXml>data</SomeOtherXml>');

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const errors: Error[] = [];
    source.on('error', (err) => errors.push(err));

    source.start();

    // Wait for poll to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('not a Canoe123 file');
  });

  it('should detect file changes and emit new message', async () => {
    fs.writeFileSync(testFile, validXml);

    // 'connected' comes from the source's own immediate read, before the native
    // watcher has finished its initial scan. A write made before the watcher is
    // ready is never reported (ignoreInitial), so wait for the watcher's own
    // 'ready' instead of guessing a delay. Capture the instance it creates.
    const watcherReady: Promise<void>[] = [];
    const realStart = FileWatcher.prototype.start;
    vi.spyOn(FileWatcher.prototype, 'start').mockImplementation(function (this: FileWatcher) {
      // Subscribe before start(): 'ready' may fire before 'connected' does.
      watcherReady.push(new Promise<void>((resolve) => this.once('ready', resolve)));
      return realStart.call(this);
    });

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;
    expect(watcherReady).toHaveLength(1);
    await watcherReady[0];

    expect(messages).toHaveLength(1);

    const updatedXml = validXml.replace('Test', 'Updated');
    fs.writeFileSync(testFile, updatedXml);
    // The source skips a read when mtime is unchanged; make the change
    // unambiguous instead of sleeping until the clock ticks.
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(testFile, later, later);

    // Bounded wait on the condition (watcher stability + debounce latency).
    await vi.waitFor(() => expect(messages.length).toBeGreaterThanOrEqual(2), {
      timeout: 5000,
      interval: 20,
    });
    expect(messages[messages.length - 1]).toContain('Updated');
  });

  it('should not emit message if file has not changed', async () => {
    fs.writeFileSync(testFile, validXml);

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    const initialCount = messages.length;

    // Wait for several poll cycles
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should still only have the initial message
    expect(messages.length).toBe(initialCount);
  });

  it('should stop polling when stop() is called', async () => {
    fs.writeFileSync(testFile, validXml);

    source = new XmlFileSource({ path: testFile, pollInterval: 100 });

    const statusChanges: SourceStatus[] = [];
    source.on('status', (status) => statusChanges.push(status));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    source.stop();

    expect(source.status).toBe('disconnected');
    expect(statusChanges).toContain('disconnected');
  });

  it('should handle file:// URL paths', async () => {
    fs.writeFileSync(testFile, validXml);

    const fileUrl = `file://${testFile}`;
    source = new XmlFileSource({ path: fileUrl, pollInterval: 100 });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('<Canoe123Data');
  });

  it('should use forcePoll() for immediate read', async () => {
    fs.writeFileSync(testFile, validXml);

    source = new XmlFileSource({ path: testFile, pollInterval: 10000 }); // Long interval

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    // Don't start automatic polling, just force poll
    await source.forcePoll();

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('<Canoe123Data');
  });
});
