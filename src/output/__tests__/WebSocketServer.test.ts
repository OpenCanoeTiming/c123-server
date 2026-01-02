import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketServer } from '../WebSocketServer.js';
import type { EventStateData } from '../../state/types.js';

function createMockState(overrides: Partial<EventStateData> = {}): EventStateData {
  return {
    timeOfDay: '10:30:00',
    raceConfig: null,
    schedule: [],
    currentRaceId: null,
    onCourse: [],
    results: null,
    highlightBib: null,
    scheduleFingerprint: null,
    ...overrides,
  };
}

describe('WebSocketServer', () => {
  let server: WebSocketServer;
  let testPort: number;

  beforeEach(() => {
    // Use random port to avoid conflicts
    testPort = 30000 + Math.floor(Math.random() * 10000);
    server = new WebSocketServer({ port: testPort });
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('start/stop', () => {
    it('should start and accept connections', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise<void>((resolve, reject) => {
        client.on('open', () => resolve());
        client.on('error', reject);
      });

      expect(server.getClientCount()).toBe(1);
      client.close();
    });

    it('should emit connection event', async () => {
      await server.start();

      const connectionPromise = new Promise<string>((resolve) => {
        server.on('connection', (clientId) => resolve(clientId));
      });

      const client = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      const clientId = await connectionPromise;
      expect(clientId).toMatch(/^client-\d+$/);

      client.close();
    });

    it('should emit disconnection event', async () => {
      await server.start();

      const disconnectionPromise = new Promise<string>((resolve) => {
        server.on('disconnection', (clientId) => resolve(clientId));
      });

      const client = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      client.close();
      const clientId = await disconnectionPromise;
      expect(clientId).toMatch(/^client-\d+$/);
    });

    it('should stop and close all connections', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await server.stop();

      expect(server.getClientCount()).toBe(0);
    });

    it('should be safe to call start multiple times', async () => {
      await server.start();
      await server.start();

      expect(server.getClientCount()).toBe(0);
    });

    it('should be safe to call stop multiple times', async () => {
      await server.start();
      await server.stop();
      await server.stop();
    });
  });

  describe('getPort', () => {
    it('should return configured port', () => {
      expect(server.getPort()).toBe(testPort);
    });

    it('should use default port when not configured', () => {
      const defaultServer = new WebSocketServer();
      expect(defaultServer.getPort()).toBe(27084);
    });
  });

  describe('broadcast', () => {
    it('should send messages to connected clients', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: string[] = [];

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      client.on('message', (data) => {
        receivedMessages.push(data.toString());
      });

      const state = createMockState({
        onCourse: [
          {
            bib: '5',
            name: 'Test',
            club: 'Club',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 5,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:00:00',
            dtFinish: null,
            pen: 0,
            time: 5000,
            total: 5000,
            ttbDiff: '',
            ttbName: '',
            rank: 1,
            position: 1,
          },
        ],
      });

      server.broadcast(state);

      // Wait for messages to arrive
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBeGreaterThan(0);

      const parsed = receivedMessages.map((m) => JSON.parse(m));
      const oncourse = parsed.find((m) => m.msg === 'oncourse');
      expect(oncourse).toBeDefined();
      expect(oncourse.data).toHaveLength(1);

      client.close();
    });

    it('should send messages to multiple clients', async () => {
      await server.start();

      const clients = [
        new WebSocket(`ws://localhost:${testPort}`),
        new WebSocket(`ws://localhost:${testPort}`),
      ];

      const messageCounters = [0, 0];

      await Promise.all(
        clients.map(
          (client, index) =>
            new Promise<void>((resolve) => {
              client.on('open', () => resolve());
              client.on('message', () => {
                messageCounters[index]++;
              });
            })
        )
      );

      expect(server.getClientCount()).toBe(2);

      server.broadcast(createMockState());

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(messageCounters[0]).toBeGreaterThan(0);
      expect(messageCounters[1]).toBeGreaterThan(0);
      expect(messageCounters[0]).toBe(messageCounters[1]);

      clients.forEach((c) => c.close());
    });
  });

  describe('new client receives current state', () => {
    it('should send last state to newly connected client', async () => {
      await server.start();

      // Set state before client connects
      const state = createMockState({
        onCourse: [
          {
            bib: '7',
            name: 'Pre-connected',
            club: 'Club',
            nat: '',
            raceId: 'RACE1',
            raceName: 'Race',
            startOrder: 7,
            warning: '',
            gates: '',
            completed: false,
            dtStart: '10:00:00',
            dtFinish: null,
            pen: 0,
            time: 3000,
            total: 3000,
            ttbDiff: '',
            ttbName: '',
            rank: 1,
            position: 1,
          },
        ],
      });

      server.broadcast(state);

      // Now connect client - register message handler BEFORE waiting for open
      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: string[] = [];

      client.on('message', (data) => {
        receivedMessages.push(data.toString());
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      // Wait for initial messages
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBeGreaterThan(0);

      const parsed = receivedMessages.map((m) => JSON.parse(m));
      const oncourse = parsed.find((m) => m.msg === 'oncourse');
      expect(oncourse.data[0].Bib).toBe('7');

      client.close();
    });
  });
});
