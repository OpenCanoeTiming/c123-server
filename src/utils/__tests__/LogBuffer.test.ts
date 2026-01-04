import { describe, it, expect, beforeEach } from 'vitest';
import { LogBuffer, getLogBuffer, resetLogBuffer } from '../LogBuffer.js';

describe('LogBuffer', () => {
  describe('basic operations', () => {
    let buffer: LogBuffer;

    beforeEach(() => {
      buffer = new LogBuffer(5);
    });

    it('should add and retrieve entries', () => {
      buffer.add('info', 'Test', 'message 1');
      buffer.add('warn', 'Test', 'message 2');

      const entries = buffer.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('info');
      expect(entries[0].component).toBe('Test');
      expect(entries[0].message).toBe('message 1');
      expect(entries[1].level).toBe('warn');
      expect(entries[1].message).toBe('message 2');
    });

    it('should include timestamp in entries', () => {
      const entry = buffer.add('info', 'Test', 'message');
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include data in entries when provided', () => {
      const data = { foo: 'bar', count: 42 };
      buffer.add('info', 'Test', 'message', data);

      const entries = buffer.getEntries();
      expect(entries[0].data).toEqual(data);
    });

    it('should return empty array when buffer is empty', () => {
      expect(buffer.getEntries()).toHaveLength(0);
    });

    it('should return correct count', () => {
      expect(buffer.getCount()).toBe(0);
      buffer.add('info', 'Test', 'message 1');
      expect(buffer.getCount()).toBe(1);
      buffer.add('info', 'Test', 'message 2');
      expect(buffer.getCount()).toBe(2);
    });

    it('should return max size', () => {
      expect(buffer.getMaxSize()).toBe(5);
    });
  });

  describe('ring buffer behavior', () => {
    it('should wrap around when buffer is full', () => {
      const buffer = new LogBuffer(3);

      buffer.add('info', 'Test', 'message 1');
      buffer.add('info', 'Test', 'message 2');
      buffer.add('info', 'Test', 'message 3');
      buffer.add('info', 'Test', 'message 4'); // Overwrites message 1

      const entries = buffer.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toBe('message 2');
      expect(entries[1].message).toBe('message 3');
      expect(entries[2].message).toBe('message 4');
    });

    it('should maintain count at max when full', () => {
      const buffer = new LogBuffer(3);

      for (let i = 0; i < 10; i++) {
        buffer.add('info', 'Test', `message ${i}`);
      }

      expect(buffer.getCount()).toBe(3);
      expect(buffer.getMaxSize()).toBe(3);
    });

    it('should return entries in chronological order', () => {
      const buffer = new LogBuffer(3);

      buffer.add('info', 'Test', 'first');
      buffer.add('info', 'Test', 'second');
      buffer.add('info', 'Test', 'third');
      buffer.add('info', 'Test', 'fourth');
      buffer.add('info', 'Test', 'fifth');

      const entries = buffer.getEntries();
      expect(entries[0].message).toBe('third');
      expect(entries[1].message).toBe('fourth');
      expect(entries[2].message).toBe('fifth');
    });
  });

  describe('getEntriesReversed', () => {
    it('should return entries in reverse chronological order', () => {
      const buffer = new LogBuffer(5);

      buffer.add('info', 'Test', 'first');
      buffer.add('info', 'Test', 'second');
      buffer.add('info', 'Test', 'third');

      const entries = buffer.getEntriesReversed();
      expect(entries[0].message).toBe('third');
      expect(entries[1].message).toBe('second');
      expect(entries[2].message).toBe('first');
    });
  });

  describe('filtering', () => {
    let buffer: LogBuffer;

    beforeEach(() => {
      buffer = new LogBuffer(10);
      buffer.add('debug', 'Server', 'debug message');
      buffer.add('info', 'Server', 'info message');
      buffer.add('warn', 'Client', 'warn message');
      buffer.add('error', 'Server', 'error message');
      buffer.add('info', 'Client', 'another info');
    });

    it('should filter by minimum level', () => {
      const entries = buffer.getEntries({ minLevel: 'warn' });
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('warn');
      expect(entries[1].level).toBe('error');
    });

    it('should filter by specific levels', () => {
      const entries = buffer.getEntries({ levels: ['debug', 'error'] });
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('debug');
      expect(entries[1].level).toBe('error');
    });

    it('should filter by search text in component', () => {
      const entries = buffer.getEntries({ search: 'client' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.component === 'Client')).toBe(true);
    });

    it('should filter by search text in message', () => {
      const entries = buffer.getEntries({ search: 'info' });
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.message.includes('info'))).toBe(true);
    });

    it('should be case-insensitive when searching', () => {
      const entries = buffer.getEntries({ search: 'SERVER' });
      expect(entries).toHaveLength(3);
    });

    it('should apply limit', () => {
      const entries = buffer.getEntries({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should apply offset', () => {
      const entries = buffer.getEntries({ offset: 2 });
      expect(entries).toHaveLength(3);
      expect(entries[0].level).toBe('warn');
    });

    it('should apply offset and limit together', () => {
      const entries = buffer.getEntries({ offset: 1, limit: 2 });
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('info');
      expect(entries[1].level).toBe('warn');
    });

    it('should combine multiple filters', () => {
      const entries = buffer.getEntries({
        minLevel: 'info',
        search: 'server',
        limit: 2,
      });
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('info');
      expect(entries[1].level).toBe('error');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const buffer = new LogBuffer(5);

      buffer.add('info', 'Test', 'message 1');
      buffer.add('info', 'Test', 'message 2');
      expect(buffer.getCount()).toBe(2);

      buffer.clear();

      expect(buffer.getCount()).toBe(0);
      expect(buffer.getEntries()).toHaveLength(0);
    });

    it('should work correctly after clear', () => {
      const buffer = new LogBuffer(3);

      buffer.add('info', 'Test', 'before clear');
      buffer.clear();
      buffer.add('info', 'Test', 'after clear');

      const entries = buffer.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('after clear');
    });
  });

  describe('global buffer', () => {
    beforeEach(() => {
      resetLogBuffer();
    });

    it('should return same instance on multiple calls', () => {
      const buffer1 = getLogBuffer();
      const buffer2 = getLogBuffer();
      expect(buffer1).toBe(buffer2);
    });

    it('should use default max size', () => {
      const buffer = getLogBuffer();
      expect(buffer.getMaxSize()).toBe(500);
    });

    it('should use custom max size on first call', () => {
      const buffer = getLogBuffer(100);
      expect(buffer.getMaxSize()).toBe(100);
    });

    it('should reset correctly', () => {
      const buffer1 = getLogBuffer(100);
      buffer1.add('info', 'Test', 'message');

      resetLogBuffer();

      const buffer2 = getLogBuffer(200);
      expect(buffer2).not.toBe(buffer1);
      expect(buffer2.getMaxSize()).toBe(200);
      expect(buffer2.getCount()).toBe(0);
    });
  });
});
