import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { AdminServer } from '../AdminServer.js';
import { EventState } from '../../state/EventState.js';
import { WebSocketServer } from '../../ws/WebSocketServer.js';
import { EventEmitter } from 'node:events';
import type { Source, SourceEvents, SourceStatus } from '../../sources/types.js';

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

describe('AdminServer', () => {
  describe('start/stop', () => {
    it('should start and stop cleanly', async () => {
      const adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      expect(adminServer.getPort()).toBeGreaterThan(0);
      await adminServer.stop();
    });

    it('should handle multiple start calls', async () => {
      const adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      await adminServer.start();
      await adminServer.stop();
    });

    it('should handle multiple stop calls', async () => {
      const adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      await adminServer.stop();
      await adminServer.stop();
    });
  });

  describe('API endpoints', () => {
    let adminServer: AdminServer;
    let port: number;

    beforeEach(async () => {
      adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      port = adminServer.getPort();
    });

    afterEach(async () => {
      await adminServer.stop();
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

        // Process a results message to set race info
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

        adminServer.setEventState(eventState);

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

        adminServer.registerSource('C123', 'tcp', mockSource, {
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

      it('should track scoreboard connections', async () => {
        // Create a real WebSocketServer on dynamic port
        const wsServer = new WebSocketServer({ port: 0 });
        await wsServer.start();
        const wsPort = wsServer.getPort();
        adminServer.setWebSocketServer(wsServer);

        // Connect a client
        const client = new WebSocket(`ws://localhost:${wsPort}`);
        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        // Wait for connection to be registered
        await new Promise((resolve) => setTimeout(resolve, 50));

        const response = await fetch(`http://localhost:${port}/api/scoreboards`);
        const data = (await response.json()) as { connected: number; scoreboards: Array<{ id: string; connectedAt: string }> };

        expect(data.connected).toBe(1);
        expect(data.scoreboards).toHaveLength(1);
        expect(data.scoreboards[0]).toMatchObject({
          id: expect.stringMatching(/^client-\d+$/),
          connectedAt: expect.any(String),
        });

        client.close();
        await wsServer.stop();
      });

      it('should track scoreboard disconnections', async () => {
        // Create a real WebSocketServer on dynamic port
        const wsServer = new WebSocketServer({ port: 0 });
        await wsServer.start();
        const wsPort = wsServer.getPort();
        adminServer.setWebSocketServer(wsServer);

        // Connect a client
        const client = new WebSocket(`ws://localhost:${wsPort}`);
        await new Promise<void>((resolve) => {
          client.on('open', () => resolve());
        });

        // Wait for connection
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Disconnect
        client.close();

        // Wait for disconnection to be registered
        await new Promise((resolve) => setTimeout(resolve, 50));

        const response = await fetch(`http://localhost:${port}/api/scoreboards`);
        const data = (await response.json()) as { connected: number; scoreboards: unknown[] };

        expect(data.connected).toBe(0);
        expect(data.scoreboards).toHaveLength(0);

        await wsServer.stop();
      });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      const port = adminServer.getPort();

      const response = await fetch(`http://localhost:${port}/api/status`);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      await adminServer.stop();
    });
  });

  describe('Dashboard UI', () => {
    let adminServer: AdminServer;
    let port: number;

    beforeEach(async () => {
      adminServer = new AdminServer({ port: 0 });
      await adminServer.start();
      port = adminServer.getPort();
    });

    afterEach(async () => {
      await adminServer.stop();
    });

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

      // Check for key sections
      expect(html).toContain('Uptime');
      expect(html).toContain('Scoreboards');
      expect(html).toContain('Sources');
      expect(html).toContain('On Course');
      expect(html).toContain('Results');
    });
  });
});
