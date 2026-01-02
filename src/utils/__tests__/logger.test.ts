import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../logger.js';

describe('Logger', () => {
  const originalConsole = {
    debug: console.debug,
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    console.debug = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    Logger.setLevel('debug'); // Enable all levels
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    Logger.setLevel('info'); // Reset to default
  });

  it('should log debug messages', () => {
    Logger.debug('Test', 'debug message');
    expect(console.debug).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    Logger.info('Test', 'info message');
    expect(console.log).toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    Logger.warn('Test', 'warn message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    Logger.error('Test', 'error message');
    expect(console.error).toHaveBeenCalled();
  });

  it('should respect log level - suppress debug when level is info', () => {
    Logger.setLevel('info');
    Logger.debug('Test', 'debug message');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('should respect log level - suppress info when level is warn', () => {
    Logger.setLevel('warn');
    Logger.info('Test', 'info message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should include component in message', () => {
    Logger.info('MyComponent', 'test message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[MyComponent]')
    );
  });

  it('should pass data parameter when provided', () => {
    const data = { foo: 'bar' };
    Logger.info('Test', 'message', data);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Test]'),
      data
    );
  });

  it('should get and set log level', () => {
    Logger.setLevel('error');
    expect(Logger.getLevel()).toBe('error');
    Logger.setLevel('debug');
    expect(Logger.getLevel()).toBe('debug');
  });
});
