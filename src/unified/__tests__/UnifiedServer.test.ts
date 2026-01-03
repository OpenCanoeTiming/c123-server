import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { UnifiedServer } from '../UnifiedServer.js';
import { EventState } from '../../state/EventState.js';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus } from '../../sources/types.js';
import type { C123Message } from '../../protocol/types.js';

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

        expect(html).toContain('Uptime');
        expect(html).toContain('Scoreboards');
        expect(html).toContain('Sources');
        expect(html).toContain('On Course');
        expect(html).toContain('Results');
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
});
