import { describe, it, expect } from 'vitest';
import { Server } from '../server.js';
import net from 'node:net';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { WebSocket } from 'ws';
import type { C123Message, C123OnCourse, C123Results } from '../protocol/types.js';

/**
 * Scoreboard Integration Test
 *
 * Tests that C123 Server emits valid C123 protocol messages.
 *
 * This test:
 * 1. Creates a mock TCP server replaying recorded C123 messages
 * 2. Starts the C123 Server connected to the mock
 * 3. Connects a WebSocket client
 * 4. Validates received messages match C123 protocol format
 */

interface RecordingEntry {
  ts: number;
  src: string;
  type: string;
  data: unknown;
  _meta?: unknown;
}

const RECORDING_PATH = path.resolve(
  import.meta.dirname,
  '../../../analysis/recordings/rec-2025-12-28T09-34-10.jsonl'
);

// C123 protocol message validation
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateC123Message(
  msg: unknown
): { valid: true; type: string } | { valid: false; error: string } {
  if (!isObject(msg)) {
    return { valid: false, error: 'Message is not an object' };
  }

  if (typeof msg.type !== 'string') {
    return { valid: false, error: 'type must be a string' };
  }

  if (typeof msg.timestamp !== 'string') {
    return { valid: false, error: 'timestamp must be a string' };
  }

  if (!isObject(msg.data) && !Array.isArray(msg.data)) {
    return { valid: false, error: 'data must be an object or array' };
  }

  return { valid: true, type: msg.type };
}

async function loadRecording(): Promise<RecordingEntry[]> {
  const entries: RecordingEntry[] = [];

  const fileStream = fs.createReadStream(RECORDING_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line) as RecordingEntry;
      entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

function extractTcpMessages(entries: RecordingEntry[]): string[] {
  return entries
    .filter((e) => e.src === 'tcp' && typeof e.data === 'string')
    .map((e) => e.data as string);
}

/** Helper to create isolated test environment with dynamic ports */
async function createTestEnv() {
  const entries = await loadRecording();
  const tcpMessages = extractTcpMessages(entries);

  // Create mock TCP server
  const mockTcpServer = net.createServer();
  await new Promise<void>((resolve) => {
    mockTcpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const mockTcpPort = (mockTcpServer.address() as net.AddressInfo).port;

  // Setup connection handler that sends messages
  const connectionHandler = (socket: net.Socket) => {
    let index = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    const sendNext = () => {
      if (index < tcpMessages.length && !socket.destroyed) {
        socket.write(tcpMessages[index] + '|', (err) => {
          if (err) return; // Socket closed, stop sending
          index++;
          timeoutId = setTimeout(sendNext, 5);
        });
      }
    };

    socket.on('close', () => {
      if (timeoutId) clearTimeout(timeoutId);
    });
    socket.on('error', () => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    sendNext();
  };

  mockTcpServer.on('connection', connectionHandler);

  // Create server with dynamic port (0 = auto-assign)
  const server = new Server({
    port: 0,
    autoDiscovery: false,
    tcpHost: '127.0.0.1',
    tcpPort: mockTcpPort,
  });

  return {
    server,
    mockTcpServer,
    async cleanup() {
      await server.stop();
      mockTcpServer.removeAllListeners('connection');
      await new Promise<void>((resolve) => {
        mockTcpServer.close(() => resolve());
      });
    },
  };
}

describe('Scoreboard Integration', () => {
  it('should emit valid C123 protocol messages', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      // Track received messages by type
      const receivedByType: Record<string, C123Message[]> = {
        TimeOfDay: [],
        OnCourse: [],
        Results: [],
        Schedule: [],
        RaceConfig: [],
      };

      // Validation errors
      const validationErrors: string[] = [];

      await server.start();
      const port = server.getPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Connect WebSocket client
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        ws.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Process messages
      ws.on('message', (data) => {
        let message: unknown;

        try {
          message = JSON.parse(data.toString());
        } catch (err) {
          validationErrors.push(`Parse error: ${err}`);
          return;
        }

        const validation = validateC123Message(message);
        if (!validation.valid) {
          validationErrors.push(validation.error);
          return;
        }

        if (validation.type in receivedByType) {
          receivedByType[validation.type].push(message as C123Message);
        }
      });

      // Wait for messages to flow through
      await new Promise((resolve) => setTimeout(resolve, 2000));

      ws.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assertions
      expect(validationErrors).toEqual([]);
      expect(receivedByType.OnCourse.length).toBeGreaterThan(0);
      expect(receivedByType.TimeOfDay.length).toBeGreaterThan(0);

      // Verify OnCourse message structure
      const firstOnCourse = receivedByType.OnCourse[0] as C123OnCourse;
      expect(firstOnCourse.type).toBe('OnCourse');
      expect(firstOnCourse.timestamp).toBeDefined();
      expect(firstOnCourse.data).toHaveProperty('competitors');
      expect(Array.isArray(firstOnCourse.data.competitors)).toBe(true);
    } finally {
      await cleanup();
    }
  }, 15000);

  it('should include required fields in Results message', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      let resultsMessage: C123Results | null = null;

      await server.start();
      const port = server.getPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        ws.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as C123Message;
          if (msg.type === 'Results' && msg.data.rows?.length > 0 && !resultsMessage) {
            resultsMessage = msg as C123Results;
          }
        } catch {
          // Ignore
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      ws.close();

      // Verify Results message has required fields
      expect(resultsMessage).not.toBeNull();
      expect(resultsMessage!.type).toBe('Results');
      expect(resultsMessage!.timestamp).toBeDefined();
      expect(resultsMessage!.data.raceId).toBeDefined();
      expect(resultsMessage!.data.rows).toBeDefined();

      const firstResult = resultsMessage!.data.rows[0];

      // Required fields
      expect(firstResult).toHaveProperty('rank');
      expect(firstResult).toHaveProperty('bib');
      expect(firstResult).toHaveProperty('name');
      expect(firstResult).toHaveProperty('total');
      expect(firstResult).toHaveProperty('pen');
    } finally {
      await cleanup();
    }
  }, 15000);

  it('should include required fields in OnCourse message', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      let onCourseMessage: C123OnCourse | null = null;

      await server.start();
      const port = server.getPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        ws.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.on('error', reject);
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as C123Message;
          if (
            msg.type === 'OnCourse' &&
            msg.data.competitors?.length > 0 &&
            !onCourseMessage
          ) {
            onCourseMessage = msg as C123OnCourse;
          }
        } catch {
          // Ignore
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      ws.close();

      // Verify OnCourse message has required fields
      expect(onCourseMessage).not.toBeNull();
      expect(onCourseMessage!.type).toBe('OnCourse');
      expect(onCourseMessage!.timestamp).toBeDefined();
      expect(onCourseMessage!.data.competitors).toBeDefined();

      const firstCompetitor = onCourseMessage!.data.competitors[0];

      // Required fields
      expect(firstCompetitor).toHaveProperty('bib');
      expect(firstCompetitor).toHaveProperty('name');
      expect(firstCompetitor).toHaveProperty('raceId');
      expect(firstCompetitor).toHaveProperty('position');
    } finally {
      await cleanup();
    }
  }, 15000);
});
