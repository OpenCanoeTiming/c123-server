import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { WebSocketServer } from '../WebSocketServer.js';
import { createOnCourse, createTimeOfDay, createResults } from '../../protocol/factory.js';
import type { C123Message, C123OnCourse, C123TimeOfDay, C123Results } from '../../protocol/types.js';

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
    it('should send C123 message to connected clients', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: C123Message[] = [];

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      const message = createOnCourse({
        total: 1,
        competitors: [
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
            time: '5000',
            total: '5000',
            ttbDiff: '',
            ttbName: '',
            rank: 1,
            position: 1,
          },
        ],
      });

      server.broadcast(message);

      // Wait for messages to arrive
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('OnCourse');
      const onCourseMsg = receivedMessages[0] as C123OnCourse;
      expect(onCourseMsg.data.competitors).toHaveLength(1);
      expect(onCourseMsg.data.competitors[0].bib).toBe('5');

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

      server.broadcast(createTimeOfDay({ time: '10:30:00' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(messageCounters[0]).toBe(1);
      expect(messageCounters[1]).toBe(1);

      clients.forEach((c) => c.close());
    });

    it('should broadcast TimeOfDay messages', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: C123Message[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      server.broadcast(createTimeOfDay({ time: '15:45:30' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('TimeOfDay');
      const timeMsg = receivedMessages[0] as C123TimeOfDay;
      expect(timeMsg.data.time).toBe('15:45:30');
      expect(timeMsg.timestamp).toBeDefined();

      client.close();
    });

    it('should broadcast Results messages', async () => {
      await server.start();

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: C123Message[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      server.broadcast(
        createResults({
          raceId: 'K1M_ST_BR1_1',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1 Men',
          subTitle: '1st Run',
          rows: [
            {
              rank: 1,
              bib: '1',
              name: 'Test Athlete',
              givenName: 'Test',
              familyName: 'Athlete',
              club: 'Club',
              nat: 'CZE',
              startOrder: 1,
              startTime: '10:00:00',
              gates: '',
              pen: 0,
              time: '85.50',
              total: '85.50',
              behind: '',
            },
          ],
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('Results');
      const resultsMsg = receivedMessages[0] as C123Results;
      expect(resultsMsg.data.raceId).toBe('K1M_ST_BR1_1');
      expect(resultsMsg.data.rows).toHaveLength(1);

      client.close();
    });
  });

  describe('session configuration', () => {
    it('should filter OnCourse messages when showOnCourse is false', async () => {
      await server.start();

      const connectionPromise = new Promise<string>((resolve) => {
        server.on('connection', (clientId) => resolve(clientId));
      });

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: C123Message[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      const clientId = await connectionPromise;

      // Disable OnCourse messages for this session
      server.setSessionConfig(clientId, { showOnCourse: false });

      // Send OnCourse - should be filtered
      server.broadcast(
        createOnCourse({
          total: 1,
          competitors: [
            {
              bib: '1',
              name: 'Test',
              club: '',
              nat: '',
              raceId: 'RACE1',
              raceName: '',
              startOrder: 1,
              warning: '',
              gates: '',
              completed: false,
              dtStart: null,
              dtFinish: null,
              pen: 0,
              time: null,
              total: null,
              ttbDiff: '',
              ttbName: '',
              rank: 0,
              position: 1,
            },
          ],
        })
      );

      // Send TimeOfDay - should pass through
      server.broadcast(createTimeOfDay({ time: '10:00:00' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only receive TimeOfDay, not OnCourse
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('TimeOfDay');

      client.close();
    });

    it('should filter Results messages when showResults is false', async () => {
      await server.start();

      const connectionPromise = new Promise<string>((resolve) => {
        server.on('connection', (clientId) => resolve(clientId));
      });

      const client = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: C123Message[] = [];

      client.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      const clientId = await connectionPromise;

      // Disable Results messages for this session
      server.setSessionConfig(clientId, { showResults: false });

      // Send Results - should be filtered
      server.broadcast(
        createResults({
          raceId: 'K1M_ST_BR1_1',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: '',
          subTitle: '',
          rows: [],
        })
      );

      // Send TimeOfDay - should pass through
      server.broadcast(createTimeOfDay({ time: '10:00:00' }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only receive TimeOfDay, not Results
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('TimeOfDay');

      client.close();
    });
  });
});
