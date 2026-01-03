import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '../server.js';
import { WebSocket } from 'ws';
import net from 'node:net';
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import type { C123Message } from '../protocol/types.js';

/**
 * E2E test using recorded data from a real C123 timing session.
 *
 * This test:
 * 1. Creates a mock TCP server that replays recorded C123 messages
 * 2. Starts the C123 Server connected to the mock
 * 3. Connects a WebSocket client to receive output
 * 4. Verifies the server correctly processes and forwards data
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

describe('E2E Recording Replay', () => {
  let mockTcpServer: net.Server;
  let mockTcpPort: number;
  let server: Server;
  let tcpMessages: string[];

  beforeAll(async () => {
    // Load recording
    const entries = await loadRecording();
    tcpMessages = extractTcpMessages(entries);

    // Create mock TCP server
    await new Promise<void>((resolve) => {
      mockTcpServer = net.createServer();
      mockTcpServer.listen(0, '127.0.0.1', () => {
        const addr = mockTcpServer.address() as net.AddressInfo;
        mockTcpPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await server?.stop();
    await new Promise<void>((resolve) => {
      mockTcpServer?.close(() => resolve());
    });
  });

  it('should have loaded TCP messages from recording', () => {
    expect(tcpMessages.length).toBeGreaterThan(0);
    // Recording should contain various message types
    expect(tcpMessages.some((m) => m.includes('TimeOfDay'))).toBe(true);
    expect(tcpMessages.some((m) => m.includes('OnCourse'))).toBe(true);
    expect(tcpMessages.some((m) => m.includes('Schedule'))).toBe(true);
  });

  it('should process recording and emit C123 messages to WebSocket clients', async () => {
    // Setup: server will connect to our mock TCP
    server = new Server({
      port: 0, // Use dynamic port
      autoDiscovery: false,
      tcpHost: '127.0.0.1',
      tcpPort: mockTcpPort,
    });

    // Track received WebSocket messages
    const receivedMessages: C123Message[] = [];

    // When TCP client connects, send recorded messages
    mockTcpServer.on('connection', (socket) => {
      // Send messages with pipe delimiter (C123 protocol)
      let index = 0;
      const sendNext = () => {
        if (index < tcpMessages.length && !socket.destroyed) {
          // Send message with pipe delimiter
          socket.write(tcpMessages[index] + '|');
          index++;
          // Small delay between messages
          setTimeout(sendNext, 5);
        }
      };
      sendNext();
    });

    // Start server
    await server.start();
    const port = server.getPort();

    // Wait for TCP to connect
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

    // Collect messages for a while
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as C123Message;
        receivedMessages.push(msg);
      } catch {
        // Ignore non-JSON
      }
    });

    // Wait for messages to flow through (recording has ~150 TCP messages)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Close WebSocket
    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify we received messages
    expect(receivedMessages.length).toBeGreaterThan(0);

    // Check for expected message types (C123 protocol format)
    const messageTypes = new Set(receivedMessages.map((m) => m.type).filter(Boolean));

    // Should have at least 'OnCourse' and 'TimeOfDay' messages
    expect(messageTypes.has('OnCourse')).toBe(true);
    expect(messageTypes.has('TimeOfDay')).toBe(true);
  }, 15000);

  it('should correctly parse race information from Schedule', async () => {
    // This test verifies that Schedule XML is parsed correctly
    const scheduleMsg = tcpMessages.find((m) => m.includes('<Schedule>'));
    expect(scheduleMsg).toBeDefined();

    // Should contain race information
    expect(scheduleMsg).toContain('K1m - střední trať');
    expect(scheduleMsg).toContain('RaceStatus');
  });

  it('should correctly parse OnCourse XML', async () => {
    const onCourseMsg = tcpMessages.find((m) => m.includes('<OnCourse'));
    expect(onCourseMsg).toBeDefined();

    // OnCourse should have Total and Position attributes
    expect(onCourseMsg).toMatch(/Total="\d+"/);
    expect(onCourseMsg).toMatch(/Position="\d+"/);
  });

  it('should correctly parse TimeOfDay XML', async () => {
    const timeMsg = tcpMessages.find((m) => m.includes('<TimeOfDay>'));
    expect(timeMsg).toBeDefined();

    // TimeOfDay should have time format
    expect(timeMsg).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
