import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { XmlWebSocketServer } from '../XmlWebSocketServer.js';
import type { C123XmlChange } from '../../protocol/types.js';

describe('XmlWebSocketServer', () => {
  let server: XmlWebSocketServer;

  beforeEach(() => {
    server = new XmlWebSocketServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('start/stop', () => {
    it('should start and accept connections', async () => {
      await server.start();
      const port = server.getPort();
      expect(port).toBeGreaterThan(0);

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);

      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          expect(server.getClientCount()).toBe(1);
          ws.close();
          resolve();
        });
      });
    });

    it('should emit connection event', async () => {
      await server.start();
      const port = server.getPort();

      const connectionPromise = new Promise<string>((resolve) => {
        server.on('connection', (clientId) => resolve(clientId));
      });

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      const clientId = await connectionPromise;

      expect(clientId).toMatch(/^xml-client-\d+$/);
      ws.close();
    });

    it('should emit disconnection event', async () => {
      await server.start();
      const port = server.getPort();

      const connectionPromise = new Promise<string>((resolve) => {
        server.on('connection', (clientId) => resolve(clientId));
      });

      const disconnectionPromise = new Promise<string>((resolve) => {
        server.on('disconnection', (clientId) => resolve(clientId));
      });

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      await connectionPromise;

      // Wait for connection to be fully established before closing
      await new Promise<void>((resolve) => ws.on('open', resolve));

      ws.close();
      const disconnectedId = await disconnectionPromise;

      expect(disconnectedId).toMatch(/^xml-client-\d+$/);
    });

    it('should stop and close all connections', async () => {
      await server.start();
      const port = server.getPort();

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise<void>((resolve) => ws.on('open', resolve));

      expect(server.getClientCount()).toBe(1);

      await server.stop();

      expect(server.getClientCount()).toBe(0);
    });

    it('should be safe to call start multiple times', async () => {
      await server.start();
      await server.start();
      await server.start();

      expect(server.getPort()).toBeGreaterThan(0);
    });

    it('should be safe to call stop multiple times', async () => {
      await server.start();
      await server.stop();
      await server.stop();
      await server.stop();
    });
  });

  describe('broadcast', () => {
    it('should broadcast xml-change message to connected clients', async () => {
      await server.start();
      const port = server.getPort();

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);

      const messagePromise = new Promise<C123XmlChange>((resolve) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });

      await new Promise<void>((resolve) => ws.on('open', resolve));

      server.broadcastChange(['Results', 'Participants'], 'abc123');

      const message = await messagePromise;

      expect(message.type).toBe('XmlChange');
      expect(message.data.sections).toEqual(['Results', 'Participants']);
      expect(message.data.checksum).toBe('abc123');
      expect(message.timestamp).toBeTruthy();

      ws.close();
    });

    it('should broadcast to multiple clients', async () => {
      await server.start();
      const port = server.getPort();

      const ws1 = new WebSocket(`ws://127.0.0.1:${port}`);
      const ws2 = new WebSocket(`ws://127.0.0.1:${port}`);

      const messagePromise1 = new Promise<C123XmlChange>((resolve) => {
        ws1.on('message', (data) => resolve(JSON.parse(data.toString())));
      });

      const messagePromise2 = new Promise<C123XmlChange>((resolve) => {
        ws2.on('message', (data) => resolve(JSON.parse(data.toString())));
      });

      await Promise.all([
        new Promise<void>((resolve) => ws1.on('open', resolve)),
        new Promise<void>((resolve) => ws2.on('open', resolve)),
      ]);

      expect(server.getClientCount()).toBe(2);

      server.broadcastChange(['Schedule'], 'xyz789');

      const [msg1, msg2] = await Promise.all([messagePromise1, messagePromise2]);

      expect(msg1.type).toBe('XmlChange');
      expect(msg1.data.sections).toEqual(['Schedule']);
      expect(msg2.type).toBe('XmlChange');
      expect(msg2.data.sections).toEqual(['Schedule']);

      ws1.close();
      ws2.close();
    });

    it('should include proper timestamp in broadcast', async () => {
      await server.start();
      const port = server.getPort();

      const ws = new WebSocket(`ws://127.0.0.1:${port}`);

      const messagePromise = new Promise<C123XmlChange>((resolve) => {
        ws.on('message', (data) => resolve(JSON.parse(data.toString())));
      });

      await new Promise<void>((resolve) => ws.on('open', resolve));

      const beforeBroadcast = Date.now();
      server.broadcastChange(['Results'], 'test123');

      const message = await messagePromise;
      const afterBroadcast = Date.now();

      const messageTime = new Date(message.timestamp).getTime();
      expect(messageTime).toBeGreaterThanOrEqual(beforeBroadcast);
      expect(messageTime).toBeLessThanOrEqual(afterBroadcast);

      ws.close();
    });
  });

  describe('client count', () => {
    it('should track client count correctly', async () => {
      await server.start();
      const port = server.getPort();

      expect(server.getClientCount()).toBe(0);

      const ws1 = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise<void>((resolve) => ws1.on('open', resolve));
      expect(server.getClientCount()).toBe(1);

      const ws2 = new WebSocket(`ws://127.0.0.1:${port}`);
      await new Promise<void>((resolve) => ws2.on('open', resolve));
      expect(server.getClientCount()).toBe(2);

      const disconnectPromise = new Promise<void>((resolve) => {
        server.on('disconnection', () => resolve());
      });

      ws1.close();
      await disconnectPromise;
      expect(server.getClientCount()).toBe(1);

      ws2.close();
    });
  });
});
