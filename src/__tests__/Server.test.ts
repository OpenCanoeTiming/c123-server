import { describe, it, expect, afterEach, vi } from 'vitest';
import { Server, ServerConfig } from '../server.js';

describe('Server', () => {
  let server: Server;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create server with default config', () => {
      server = new Server();
      expect(server.running).toBe(false);
    });

    it('should create server with custom config', () => {
      const config: ServerConfig = {
        port: 27200,
        autoDiscovery: false,
      };
      server = new Server(config);
      expect(server.running).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start and stop server', async () => {
      server = new Server({
        port: 0, // Use dynamic port
        autoDiscovery: false,
      });

      await server.start();
      expect(server.running).toBe(true);

      await server.stop();
      expect(server.running).toBe(false);
    });

    it('should emit started event on start', async () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      const startedHandler = vi.fn();
      server.on('started', startedHandler);

      await server.start();
      expect(startedHandler).toHaveBeenCalledOnce();
    });

    it('should emit stopped event on stop', async () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      const stoppedHandler = vi.fn();
      server.on('stopped', stoppedHandler);

      await server.start();
      await server.stop();
      expect(stoppedHandler).toHaveBeenCalledOnce();
    });

    it('should not start twice', async () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      await server.start();
      await server.start(); // Should not throw
      expect(server.running).toBe(true);
    });

    it('should not stop when not running', async () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      await server.stop(); // Should not throw
      expect(server.running).toBe(false);
    });
  });

  describe('discovered host', () => {
    it('should return null when not discovered', () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      expect(server.getDiscoveredHost()).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should handle errors gracefully when setting invalid XML path', async () => {
      server = new Server({
        port: 0,
        autoDiscovery: false,
      });

      const errorHandler = vi.fn();
      server.on('error', errorHandler);

      await server.start();

      // Setting a non-existent path will trigger an async error
      // We just verify it doesn't crash the server
      server.setXmlPath('/tmp/nonexistent-test.xml');

      // Give it time for the polling to trigger
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear the path
      server.setXmlPath('');
    });
  });
});
