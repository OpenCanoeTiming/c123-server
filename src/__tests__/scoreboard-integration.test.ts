import { describe, it, expect } from 'vitest';
import { Server } from '../server.js';
import net from 'node:net';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { WebSocket } from 'ws';

/**
 * Scoreboard Integration Test
 *
 * Tests that C123 Server output is compatible with the scoreboard CLIProvider.
 * Uses the same message parsing logic as the scoreboard to validate compatibility.
 *
 * This test:
 * 1. Creates a mock TCP server replaying recorded C123 messages
 * 2. Starts the C123 Server connected to the mock
 * 3. Connects a WebSocket client simulating CLIProvider
 * 4. Validates received messages match expected CLI format
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

// CLI message validation (mirrors scoreboard validation logic)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateTopMessage(
  msg: Record<string, unknown>
): { valid: true } | { valid: false; error: string } {
  if (!isObject(msg.data)) {
    return { valid: false, error: 'data must be an object' };
  }
  const data = msg.data;
  if (typeof data.RaceName !== 'string') {
    return { valid: false, error: 'RaceName must be a string' };
  }
  if (!Array.isArray(data.list)) {
    return { valid: false, error: 'list must be an array' };
  }
  return { valid: true };
}

function validateOnCourseMessage(
  msg: Record<string, unknown>
): { valid: true } | { valid: false; error: string } {
  if (!Array.isArray(msg.data)) {
    return { valid: false, error: 'data must be an array' };
  }
  return { valid: true };
}

function validateCompMessage(
  msg: Record<string, unknown>
): { valid: true } | { valid: false; error: string } {
  if (!isObject(msg.data)) {
    return { valid: false, error: 'data must be an object' };
  }
  return { valid: true };
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

  // Create server with dynamic ports (0 = auto-assign)
  const server = new Server({
    wsPort: 0,
    adminPort: 0,
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
  it('should emit valid CLI-compatible messages that scoreboard can parse', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      // Track received messages by type
      const receivedByType: Record<string, unknown[]> = {
        top: [],
        oncourse: [],
        comp: [],
      };

      // Validation errors
      const validationErrors: string[] = [];

      await server.start();
      const wsPort = server.getWsPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Connect WebSocket client (simulating scoreboard CLIProvider)
      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);

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

      // Process messages like CLIProvider would
      ws.on('message', (data) => {
        let message: unknown;

        try {
          message = JSON.parse(data.toString());
        } catch (err) {
          validationErrors.push(`Parse error: ${err}`);
          return;
        }

        if (!isObject(message)) {
          validationErrors.push('Message is not an object');
          return;
        }

        const type = (message.msg || message.type) as string;

        switch (type) {
          case 'top': {
            const validation = validateTopMessage(message);
            if (!validation.valid) {
              validationErrors.push(`top: ${validation.error}`);
            } else {
              receivedByType.top.push(message);
            }
            break;
          }
          case 'oncourse': {
            const validation = validateOnCourseMessage(message);
            if (!validation.valid) {
              validationErrors.push(`oncourse: ${validation.error}`);
            } else {
              receivedByType.oncourse.push(message);
            }
            break;
          }
          case 'comp': {
            const validation = validateCompMessage(message);
            if (!validation.valid) {
              validationErrors.push(`comp: ${validation.error}`);
            } else {
              receivedByType.comp.push(message);
            }
            break;
          }
          // Other message types are optional, ignore silently
        }
      });

      // Wait for messages to flow through
      await new Promise((resolve) => setTimeout(resolve, 2000));

      ws.close();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assertions
      expect(validationErrors).toEqual([]);
      expect(receivedByType.top.length).toBeGreaterThan(0);
      expect(receivedByType.oncourse.length).toBeGreaterThan(0);

      // Verify top message structure matches what scoreboard expects
      const firstTop = receivedByType.top[0] as {
        msg: string;
        data: Record<string, unknown>;
      };
      expect(firstTop.msg).toBe('top');
      expect(firstTop.data).toHaveProperty('RaceName');
      expect(firstTop.data).toHaveProperty('RaceStatus');
      expect(firstTop.data).toHaveProperty('list');
      expect(Array.isArray(firstTop.data.list)).toBe(true);

      // Verify oncourse message structure
      const firstOnCourse = receivedByType.oncourse[0] as {
        msg: string;
        data: unknown[];
      };
      expect(firstOnCourse.msg).toBe('oncourse');
      expect(Array.isArray(firstOnCourse.data)).toBe(true);
    } finally {
      await cleanup();
    }
  }, 15000);

  it('should include required fields in top message results', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      let topMessage: { data: { list: Record<string, unknown>[] } } | null =
        null;

      await server.start();
      const wsPort = server.getWsPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);

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
          const msg = JSON.parse(data.toString());
          if (msg.msg === 'top' && msg.data?.list?.length > 0 && !topMessage) {
            topMessage = msg;
          }
        } catch {
          // Ignore
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      ws.close();

      // Verify result item has required fields for scoreboard
      expect(topMessage).not.toBeNull();
      const firstResult = topMessage!.data.list[0];

      // Required fields that scoreboard uses
      expect(firstResult).toHaveProperty('Rank');
      expect(firstResult).toHaveProperty('Bib');
      expect(firstResult).toHaveProperty('Name');
      expect(firstResult).toHaveProperty('Total');
      expect(firstResult).toHaveProperty('Pen');
    } finally {
      await cleanup();
    }
  }, 15000);

  it('should include required fields in oncourse message', async () => {
    const { server, cleanup } = await createTestEnv();

    try {
      let onCourseMessage: { data: Record<string, unknown>[] } | null = null;

      await server.start();
      const wsPort = server.getWsPort();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);

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
          const msg = JSON.parse(data.toString());
          if (
            msg.msg === 'oncourse' &&
            msg.data?.length > 0 &&
            !onCourseMessage
          ) {
            onCourseMessage = msg;
          }
        } catch {
          // Ignore
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      ws.close();

      // Verify oncourse item has required fields for scoreboard
      expect(onCourseMessage).not.toBeNull();
      const firstCompetitor = onCourseMessage!.data[0];

      // Required fields that scoreboard uses
      expect(firstCompetitor).toHaveProperty('Bib');
      expect(firstCompetitor).toHaveProperty('Name');
    } finally {
      await cleanup();
    }
  }, 15000);
});
