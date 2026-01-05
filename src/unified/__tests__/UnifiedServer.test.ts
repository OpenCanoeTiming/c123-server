import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { UnifiedServer } from '../UnifiedServer.js';
import { EventState } from '../../state/EventState.js';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus } from '../../sources/types.js';
import type { C123Message } from '../../protocol/types.js';
import { getLogBuffer, resetLogBuffer } from '../../utils/LogBuffer.js';
import { Logger } from '../../utils/logger.js';

// Mock source for testing
class MockSource extends EventEmitter<SourceEvents> implements Source {
  status: SourceStatus = 'disconnected';

  start(): void {
    this.status = 'connected';
    this.emit('status', this.status);
  }

  stop(): void {
    this.status = 'disconnected';
    this.emit('status', this.status);
  }
}

describe('UnifiedServer', () => {
  describe('start/stop', () => {
    it('should start and stop cleanly', async () => {
      const server = new UnifiedServer({ port: 0 });
      await server.start();
      expect(server.getPort()).toBeGreaterThan(0);
      await server.stop();
    });

    it('should handle multiple start calls', async () => {
      const server = new UnifiedServer({ port: 0 });
      await server.start();
      await server.start();
      await server.stop();
    });

    it('should handle multiple stop calls', async () => {
      const server = new UnifiedServer({ port: 0 });
      await server.start();
      await server.stop();
      await server.stop();
    });
  });

  describe('HTTP API endpoints', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    describe('GET /health', () => {
      it('should return ok status', async () => {
        const response = await fetch(`http://localhost:${port}/health`);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toEqual({ status: 'ok' });
      });
    });

    describe('GET /api/status', () => {
      it('should return server status', async () => {
        const response = await fetch(`http://localhost:${port}/api/status`);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toMatchObject({
          version: expect.any(String),
          uptime: expect.any(Number),
          sources: expect.any(Array),
          scoreboards: {
            connected: expect.any(Number),
            list: expect.any(Array),
          },
          event: {
            currentRaceId: null,
            raceName: null,
            onCourseCount: 0,
            resultsCount: 0,
          },
        });
      });

      it('should include event state when registered', async () => {
        const eventState = new EventState();

        eventState.processMessage({
          type: 'results',
          data: {
            raceId: 'K1M-1',
            classId: 'K1M',
            isCurrent: true,
            mainTitle: 'K1 Men - Final',
            subTitle: '1st Run',
            rows: [
              {
                bib: '1',
                rank: 1,
                name: 'Test',
                givenName: 'Test',
                familyName: 'User',
                club: 'Club',
                nat: 'CZE',
                startOrder: 1,
                startTime: '10:00:00',
                gates: '',
                pen: 0,
                time: '85.00',
                total: '85.00',
                behind: '',
              },
            ],
          },
        });

        server.setEventState(eventState);

        const response = await fetch(`http://localhost:${port}/api/status`);
        const data = (await response.json()) as { event: { currentRaceId: string; raceName: string; onCourseCount: number; resultsCount: number } };

        expect(data.event).toMatchObject({
          currentRaceId: 'K1M-1',
          raceName: 'K1 Men - Final',
          onCourseCount: 0,
          resultsCount: 1,
        });

        eventState.destroy();
      });
    });

    describe('GET /api/sources', () => {
      it('should return empty sources by default', async () => {
        const response = await fetch(`http://localhost:${port}/api/sources`);
        expect(response.ok).toBe(true);

        const data = (await response.json()) as { sources: unknown[] };
        expect(data).toEqual({ sources: [] });
      });

      it('should return registered sources', async () => {
        const mockSource = new MockSource();
        mockSource.start();

        server.registerSource('C123', 'tcp', mockSource, {
          host: '192.168.1.100',
          port: 27333,
        });

        const response = await fetch(`http://localhost:${port}/api/sources`);
        const data = (await response.json()) as { sources: unknown[] };

        expect(data.sources).toHaveLength(1);
        expect(data.sources[0]).toMatchObject({
          name: 'C123',
          type: 'tcp',
          status: 'connected',
          host: '192.168.1.100',
          port: 27333,
        });

        mockSource.stop();
      });
    });

    describe('GET /api/scoreboards', () => {
      it('should return empty scoreboards by default', async () => {
        const response = await fetch(`http://localhost:${port}/api/scoreboards`);
        expect(response.ok).toBe(true);

        const data = (await response.json()) as { connected: number; scoreboards: unknown[] };
        expect(data).toEqual({
          connected: 0,
          scoreboards: [],
        });
      });
    });

    describe('CORS', () => {
      it('should include CORS headers', async () => {
        const response = await fetch(`http://localhost:${port}/api/status`);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      });
    });

    describe('GET /api/discover', () => {
      it('should return discovery info without XML service', async () => {
        const response = await fetch(`http://localhost:${port}/api/discover`);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toMatchObject({
          service: 'c123-server',
          version: expect.any(String),
          port: expect.any(Number),
          eventName: null,
        });
      });

      it('should include CORS headers for cross-origin access', async () => {
        const response = await fetch(`http://localhost:${port}/api/discover`);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      });

      it('should return correct port', async () => {
        const response = await fetch(`http://localhost:${port}/api/discover`);
        const data = (await response.json()) as { port: number };
        expect(data.port).toBe(port);
      });
    });

    describe('Dashboard UI', () => {
      it('should serve dashboard HTML at root', async () => {
        const response = await fetch(`http://localhost:${port}/`);
        expect(response.ok).toBe(true);
        expect(response.headers.get('content-type')).toContain('text/html');

        const html = await response.text();
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('C123 Server Dashboard');
        expect(html).toContain('/api/status');
      });

      it('should include key dashboard elements', async () => {
        const response = await fetch(`http://localhost:${port}/`);
        const html = await response.text();

        expect(html).toContain('Event');
        expect(html).toContain('Sources');
        expect(html).toContain('XML Configuration');
        expect(html).toContain('Clients');
        expect(html).toContain('Server Logs');
      });
    });
  });

  describe('WebSocket on /ws', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should accept WebSocket connections on /ws', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        client.on('open', () => resolve());
        client.on('error', reject);
      });

      expect(client.readyState).toBe(WebSocket.OPEN);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should reject WebSocket connections on other paths', async () => {
      const client = new WebSocket(`ws://localhost:${port}/other`);

      await new Promise<void>((resolve) => {
        client.on('error', () => resolve());
        client.on('close', () => resolve());
      });

      expect(client.readyState).not.toBe(WebSocket.OPEN);
    });

    it('should track WebSocket connections in scoreboards API', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      // Wait for connection to be registered
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch(`http://localhost:${port}/api/scoreboards`);
      const data = (await response.json()) as { connected: number; scoreboards: Array<{ id: string }> };

      expect(data.connected).toBe(1);
      expect(data.scoreboards).toHaveLength(1);
      expect(data.scoreboards[0]).toMatchObject({
        id: expect.stringMatching(/^client-\d+$/),
      });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should broadcast C123 messages to connected clients', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      const receivedMessages: C123Message[] = [];
      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      // Broadcast a message
      const message: C123Message = {
        type: 'TimeOfDay',
        timestamp: new Date().toISOString(),
        data: { time: '12:00:00' },
      };
      server.broadcast(message);

      // Wait for message to be received
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toMatchObject({
        type: 'TimeOfDay',
        data: { time: '12:00:00' },
      });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should broadcast XML change notifications', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      const receivedMessages: Array<{ type: string; data: { sections: string[]; checksum: string } }> = [];
      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      // Broadcast XML change
      server.broadcastXmlChange(['Results', 'Schedule'], 'abc123');

      // Wait for message to be received
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toMatchObject({
        type: 'XmlChange',
        data: {
          sections: ['Results', 'Schedule'],
          checksum: 'abc123',
        },
      });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should emit connection events', async () => {
      const connections: string[] = [];
      server.on('connection', (clientId) => connections.push(clientId));

      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(connections).toHaveLength(1);
      expect(connections[0]).toMatch(/^client-\d+$/);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should emit disconnection events', async () => {
      const disconnections: string[] = [];
      server.on('disconnection', (clientId) => disconnections.push(clientId));

      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      client.close();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(disconnections).toHaveLength(1);
    });

    it('should support multiple concurrent clients', async () => {
      const client1 = new WebSocket(`ws://localhost:${port}/ws`);
      const client2 = new WebSocket(`ws://localhost:${port}/ws`);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('open', () => resolve())),
        new Promise<void>((resolve) => client2.on('open', () => resolve())),
      ]);

      // Wait for connections
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(server.getClientCount()).toBe(2);

      // Broadcast and verify both clients receive
      const messages1: C123Message[] = [];
      const messages2: C123Message[] = [];
      client1.on('message', (data) => messages1.push(JSON.parse(data.toString())));
      client2.on('message', (data) => messages2.push(JSON.parse(data.toString())));

      server.broadcast({
        type: 'TimeOfDay',
        timestamp: new Date().toISOString(),
        data: { time: '15:00:00' },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);

      client1.close();
      client2.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe('session management', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should get session by ID', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const sessions = server.getSessions();
      expect(sessions).toHaveLength(1);

      const session = server.getSession(sessions[0].id);
      expect(session).toBeDefined();
      expect(session!.id).toBe(sessions[0].id);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should update session config', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const sessions = server.getSessions();
      const result = server.setSessionConfig(sessions[0].id, { showOnCourse: false });

      expect(result).toBe(true);

      const session = server.getSession(sessions[0].id);
      expect(session!.getConfig().showOnCourse).toBe(false);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should return false for non-existent session config update', () => {
      const result = server.setSessionConfig('non-existent', { showOnCourse: false });
      expect(result).toBe(false);
    });
  });

  describe('ForceRefresh functionality', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    describe('broadcastForceRefresh method', () => {
      it('should return 0 when no clients connected', () => {
        const count = server.broadcastForceRefresh();
        expect(count).toBe(0);
      });

      it('should broadcast to connected clients and return count', async () => {
        const client = new WebSocket(`ws://localhost:${port}/ws`);

        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        await new Promise((resolve) => setTimeout(resolve, 50));

        const count = server.broadcastForceRefresh('Test refresh');
        expect(count).toBe(1);

        client.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      it('should send ForceRefresh message to clients', async () => {
        const client = new WebSocket(`ws://localhost:${port}/ws`);

        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        const receivedMessages: Array<{ type: string; timestamp: string; data: { reason?: string } }> = [];
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          // Filter only ForceRefresh messages (ignore LogEntry)
          if (msg.type === 'ForceRefresh') {
            receivedMessages.push(msg);
          }
        });

        server.broadcastForceRefresh('Admin triggered refresh');

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0]).toMatchObject({
          type: 'ForceRefresh',
          timestamp: expect.any(String),
          data: {
            reason: 'Admin triggered refresh',
          },
        });

        client.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      it('should send ForceRefresh without reason', async () => {
        const client = new WebSocket(`ws://localhost:${port}/ws`);

        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        const receivedMessages: Array<{ type: string; data: { reason?: string } }> = [];
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          // Filter only ForceRefresh messages (ignore LogEntry)
          if (msg.type === 'ForceRefresh') {
            receivedMessages.push(msg);
          }
        });

        server.broadcastForceRefresh();

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0].type).toBe('ForceRefresh');
        expect(receivedMessages[0].data.reason).toBeUndefined();

        client.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      it('should broadcast to multiple clients', async () => {
        const client1 = new WebSocket(`ws://localhost:${port}/ws`);
        const client2 = new WebSocket(`ws://localhost:${port}/ws`);

        await Promise.all([
          new Promise<void>((resolve) => client1.on('open', () => resolve())),
          new Promise<void>((resolve) => client2.on('open', () => resolve())),
        ]);

        await new Promise((resolve) => setTimeout(resolve, 50));

        const messages1: Array<{ type: string }> = [];
        const messages2: Array<{ type: string }> = [];
        client1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ForceRefresh') messages1.push(msg);
        });
        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ForceRefresh') messages2.push(msg);
        });

        const count = server.broadcastForceRefresh('Refresh all');

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(count).toBe(2);
        expect(messages1).toHaveLength(1);
        expect(messages1[0].type).toBe('ForceRefresh');
        expect(messages2).toHaveLength(1);
        expect(messages2[0].type).toBe('ForceRefresh');

        client1.close();
        client2.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    });

    describe('POST /api/broadcast/refresh', () => {
      it('should trigger ForceRefresh and return success', async () => {
        const response = await fetch(`http://localhost:${port}/api/broadcast/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Test refresh' }),
        });

        expect(response.ok).toBe(true);

        const data = await response.json() as { success: boolean; clientsNotified: number; reason: string | null };
        expect(data).toMatchObject({
          success: true,
          clientsNotified: 0,
          reason: 'Test refresh',
        });
      });

      it('should work without reason', async () => {
        const response = await fetch(`http://localhost:${port}/api/broadcast/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        expect(response.ok).toBe(true);

        const data = await response.json() as { success: boolean; reason: string | null };
        expect(data.success).toBe(true);
        expect(data.reason).toBeNull();
      });

      it('should validate reason type', async () => {
        const response = await fetch(`http://localhost:${port}/api/broadcast/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 123 }),
        });

        expect(response.status).toBe(400);

        const data = await response.json() as { error: string };
        expect(data.error).toBe('reason must be a string');
      });

      it('should notify connected clients via API call', async () => {
        const client = new WebSocket(`ws://localhost:${port}/ws`);

        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        await new Promise((resolve) => setTimeout(resolve, 50));

        const receivedMessages: Array<{ type: string; data: { reason?: string } }> = [];
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          // Filter only ForceRefresh messages (ignore LogEntry)
          if (msg.type === 'ForceRefresh') {
            receivedMessages.push(msg);
          }
        });

        const response = await fetch(`http://localhost:${port}/api/broadcast/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'API triggered' }),
        });

        expect(response.ok).toBe(true);

        const data = await response.json() as { clientsNotified: number };
        expect(data.clientsNotified).toBe(1);

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(receivedMessages).toHaveLength(1);
        expect(receivedMessages[0].type).toBe('ForceRefresh');
        expect(receivedMessages[0].data.reason).toBe('API triggered');

        client.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    });
  });

  describe('Log viewer functionality', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      // Reset log buffer for clean state
      resetLogBuffer();

      // Temporarily disable buffer during server start to avoid pollution
      Logger.setBufferEnabled(false);
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
      Logger.setBufferEnabled(true);
    });

    afterEach(async () => {
      Logger.setBufferEnabled(false);
      await server.stop();
      resetLogBuffer();
    });

    describe('GET /api/logs', () => {
      it('should return empty entries when buffer is empty', async () => {
        // Reset buffer after server start logs
        resetLogBuffer();

        const response = await fetch(`http://localhost:${port}/api/logs`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ level: string; component: string; message: string }>;
          total: number;
          limit: number;
          offset: number;
          bufferSize: number;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(0);
        expect(data.total).toBe(0);
        expect(data.bufferSize).toBe(500); // Default buffer size
      });

      it('should return log entries from buffer', async () => {
        const buffer = getLogBuffer();
        buffer.add('info', 'Test', 'test message 1');
        buffer.add('warn', 'Test', 'test message 2');
        buffer.add('error', 'Test', 'test message 3');

        const response = await fetch(`http://localhost:${port}/api/logs`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ level: string; component: string; message: string }>;
          total: number;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(3);
        expect(data.total).toBe(3);
      });

      it('should apply limit parameter', async () => {
        const buffer = getLogBuffer();
        for (let i = 0; i < 10; i++) {
          buffer.add('info', 'Test', `message ${i}`);
        }

        const response = await fetch(`http://localhost:${port}/api/logs?limit=5`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ level: string; message: string }>;
          limit: number;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(5);
        expect(data.limit).toBe(5);
      });

      it('should apply offset parameter', async () => {
        const buffer = getLogBuffer();
        for (let i = 0; i < 5; i++) {
          buffer.add('info', 'Test', `message ${i}`);
        }

        const response = await fetch(`http://localhost:${port}/api/logs?offset=2&order=asc`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ message: string }>;
          offset: number;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(3);
        expect(data.offset).toBe(2);
        expect(data.entries[0].message).toBe('message 2');
      });

      it('should filter by minimum level', async () => {
        const buffer = getLogBuffer();
        buffer.add('debug', 'Test', 'debug msg');
        buffer.add('info', 'Test', 'info msg');
        buffer.add('warn', 'Test', 'warn msg');
        buffer.add('error', 'Test', 'error msg');

        const response = await fetch(`http://localhost:${port}/api/logs?level=warn`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ level: string }>;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(2);
        expect(data.entries.every((e) => e.level === 'warn' || e.level === 'error')).toBe(true);
      });

      it('should filter by specific levels', async () => {
        const buffer = getLogBuffer();
        buffer.add('debug', 'Test', 'debug msg');
        buffer.add('info', 'Test', 'info msg');
        buffer.add('warn', 'Test', 'warn msg');
        buffer.add('error', 'Test', 'error msg');

        const response = await fetch(`http://localhost:${port}/api/logs?levels=debug,error`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ level: string }>;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(2);
        expect(data.entries.map((e) => e.level).sort()).toEqual(['debug', 'error']);
      });

      it('should filter by search text', async () => {
        const buffer = getLogBuffer();
        buffer.add('info', 'Server', 'started on port 8080');
        buffer.add('info', 'Client', 'connected');
        buffer.add('warn', 'Server', 'high memory usage');

        const response = await fetch(`http://localhost:${port}/api/logs?search=server`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ component: string }>;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries).toHaveLength(2);
        expect(data.entries.every((e) => e.component === 'Server')).toBe(true);
      });

      it('should return entries in descending order by default', async () => {
        const buffer = getLogBuffer();
        buffer.add('info', 'Test', 'first');
        buffer.add('info', 'Test', 'second');
        buffer.add('info', 'Test', 'third');

        const response = await fetch(`http://localhost:${port}/api/logs`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ message: string }>;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries[0].message).toBe('third');
        expect(data.entries[2].message).toBe('first');
      });

      it('should return entries in ascending order when specified', async () => {
        const buffer = getLogBuffer();
        buffer.add('info', 'Test', 'first');
        buffer.add('info', 'Test', 'second');
        buffer.add('info', 'Test', 'third');

        const response = await fetch(`http://localhost:${port}/api/logs?order=asc`);
        expect(response.ok).toBe(true);

        interface LogsResponse {
          entries: Array<{ message: string }>;
        }
        const data = await response.json() as LogsResponse;
        expect(data.entries[0].message).toBe('first');
        expect(data.entries[2].message).toBe('third');
      });
    });

    describe('WebSocket LogEntry broadcast', () => {
      it('should broadcast log entries to connected clients', async () => {
        // Connect as admin to receive LogEntry messages
        const client = new WebSocket(`ws://localhost:${port}/ws?admin=1`);

        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        const receivedLogEntries: Array<{ type: string; data: { level: string; message: string } }> = [];
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'LogEntry') {
            receivedLogEntries.push(msg);
          }
        });

        // Wait for connection to be fully established
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Log something
        Logger.info('TestComponent', 'Test log message');

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(receivedLogEntries.length).toBeGreaterThan(0);
        const testLog = receivedLogEntries.find(
          (e) => e.data.message === 'Test log message'
        );
        expect(testLog).toBeDefined();
        expect(testLog?.data.level).toBe('info');

        client.close();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    });
  });

  describe('Client IP identification', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should capture client IP address from WebSocket connection', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const sessions = server.getSessions();
      expect(sessions).toHaveLength(1);

      const session = sessions[0];
      // Local connections will have loopback IP
      expect(session.ipAddress).toBeDefined();
      expect(['127.0.0.1', '::1', '::ffff:127.0.0.1']).toContain(session.ipAddress);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should include IP address in session info', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch(`http://localhost:${port}/api/scoreboards`);
      const data = await response.json() as { scoreboards: Array<{ ipAddress: string }> };

      expect(data.scoreboards).toHaveLength(1);
      expect(data.scoreboards[0].ipAddress).toBeDefined();

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should find sessions by IP address', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const sessions = server.getSessions();
      const ip = sessions[0].ipAddress;

      const foundSessions = server.getSessionsByIp(ip);
      expect(foundSessions).toHaveLength(1);
      expect(foundSessions[0].id).toBe(sessions[0].id);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should return empty array for unknown IP', () => {
      const sessions = server.getSessionsByIp('192.168.99.99');
      expect(sessions).toHaveLength(0);
    });
  });

  describe('ClientState message handling', () => {
    let server: UnifiedServer;
    let port: number;

    beforeEach(async () => {
      server = new UnifiedServer({ port: 0 });
      await server.start();
      port = server.getPort();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should receive and store ClientState from client', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send ClientState message
      const clientStateMsg = {
        type: 'ClientState',
        timestamp: new Date().toISOString(),
        data: {
          current: { mode: 'ledwall', rows: 8 },
          version: '2.0.0',
          capabilities: ['configpush'],
        },
      };
      client.send(JSON.stringify(clientStateMsg));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const sessions = server.getSessions();
      const state = sessions[0].getClientState();

      expect(state).toBeDefined();
      expect(state?.current).toEqual({ mode: 'ledwall', rows: 8 });
      expect(state?.version).toBe('2.0.0');
      expect(state?.capabilities).toEqual(['configpush']);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should ignore invalid messages gracefully', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send invalid message (not JSON)
      client.send('not json');

      // Send incomplete message
      client.send(JSON.stringify({ type: 'Unknown' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Server should still be working
      const sessions = server.getSessions();
      expect(sessions).toHaveLength(1);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should update client state on subsequent messages', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // First state
      client.send(JSON.stringify({
        type: 'ClientState',
        timestamp: new Date().toISOString(),
        data: { current: { view: 'results' } },
      }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second state
      client.send(JSON.stringify({
        type: 'ClientState',
        timestamp: new Date().toISOString(),
        data: { current: { view: 'oncourse' } },
      }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      const sessions = server.getSessions();
      const state = sessions[0].getClientState();

      expect(state?.current).toEqual({ view: 'oncourse' });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});
