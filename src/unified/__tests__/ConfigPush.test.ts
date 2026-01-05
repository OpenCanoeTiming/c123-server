/**
 * Tests for ConfigPush mechanism (15.5)
 *
 * Tests the push mechanism for client configuration:
 * - ConfigPush sent on connection when stored config exists
 * - ConfigPush sent when config is updated via API
 * - pushConfigToIp method functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { UnifiedServer } from '../UnifiedServer.js';
import { resetAppSettings, getAppSettings } from '../../config/index.js';
import type { C123ConfigPush } from '../../protocol/types.js';

const BASE_PORT = 28000;
let portCounter = 0;

function getNextPort(): number {
  return BASE_PORT + portCounter++;
}

// Helper: Create WebSocket with message handler already attached
// This ensures we don't miss messages sent immediately on connection
function createClientWithHandler(
  url: string,
  onMessage: (msg: unknown) => void,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);

    // Attach handler BEFORE open - so we catch messages sent on connect
    client.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        onMessage(msg);
      } catch {
        // Ignore parse errors
      }
    });

    client.on('open', () => resolve(client));
    client.on('error', reject);
  });
}

// Helper to collect all messages of a type
async function collectMessages<T>(
  client: WebSocket,
  type: string,
  duration = 100,
): Promise<T[]> {
  return new Promise((resolve) => {
    const messages: T[] = [];

    const handler = (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          messages.push(msg as T);
        }
      } catch {
        // Ignore parse errors
      }
    };

    client.on('message', handler);

    setTimeout(() => {
      client.off('message', handler);
      resolve(messages);
    }, duration);
  });
}

describe('ConfigPush Mechanism', () => {
  let server: UnifiedServer;
  let port: number;

  beforeEach(async () => {
    resetAppSettings();
    port = getNextPort();
    server = new UnifiedServer({ port });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    resetAppSettings();
  });

  describe('ConfigPush on connection', () => {
    it('should NOT send ConfigPush when no stored config exists', async () => {
      // No config stored - use collector that starts before connection
      const messages: C123ConfigPush[] = [];
      const client = await createClientWithHandler(
        `ws://localhost:${port}/ws`,
        (msg) => {
          if ((msg as { type?: string }).type === 'ConfigPush') {
            messages.push(msg as C123ConfigPush);
          }
        },
      );

      // Wait a bit for any messages
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(0);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should send ConfigPush on connection when stored config exists', async () => {
      // Pre-store config for localhost IP (127.0.0.1)
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'ledwall',
        displayRows: 10,
        customTitle: 'Test Scoreboard',
      });

      // Collect messages starting BEFORE connection opens
      const messages: C123ConfigPush[] = [];
      const client = await createClientWithHandler(
        `ws://localhost:${port}/ws`,
        (msg) => {
          if ((msg as { type?: string }).type === 'ConfigPush') {
            messages.push(msg as C123ConfigPush);
          }
        },
      );

      // Wait for message
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('ConfigPush');
      expect(messages[0].data.type).toBe('ledwall');
      expect(messages[0].data.displayRows).toBe(10);
      expect(messages[0].data.customTitle).toBe('Test Scoreboard');

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should only send defined parameters in ConfigPush', async () => {
      // Pre-store partial config (only type)
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'vertical',
      });

      const messages: C123ConfigPush[] = [];
      const client = await createClientWithHandler(
        `ws://localhost:${port}/ws`,
        (msg) => {
          if ((msg as { type?: string }).type === 'ConfigPush') {
            messages.push(msg as C123ConfigPush);
          }
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0].data.type).toBe('vertical');
      // Undefined parameters should not be in the message
      expect(messages[0].data.displayRows).toBeUndefined();
      expect(messages[0].data.customTitle).toBeUndefined();

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should update lastSeen timestamp on connection', async () => {
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', { type: 'ledwall' });

      const beforeConnect = new Date().toISOString();

      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const config = settings.getClientConfig('127.0.0.1');
      expect(config?.lastSeen).toBeDefined();

      // lastSeen should be after beforeConnect
      const lastSeen = new Date(config!.lastSeen!);
      const before = new Date(beforeConnect);
      expect(lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe('pushConfigToIp method', () => {
    it('should return 0 when no sessions exist for IP', () => {
      const count = server.pushConfigToIp('192.168.1.99');
      expect(count).toBe(0);
    });

    it('should return 0 when config does not exist for IP', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Ensure no config stored for 127.0.0.1 (in case previous test left one)
      const settings = getAppSettings();
      settings.deleteClientConfig('127.0.0.1');

      // Now push should return 0 - session exists but no config
      const count = server.pushConfigToIp('127.0.0.1');
      expect(count).toBe(0);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should push config to connected client and return count', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Store config for 127.0.0.1
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'ledwall',
        displayRows: 8,
      });

      // Set up message listener
      const messages: C123ConfigPush[] = [];
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ConfigPush') {
          messages.push(msg);
        }
      });

      // Push config
      const count = server.pushConfigToIp('127.0.0.1');
      expect(count).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0].data.type).toBe('ledwall');
      expect(messages[0].data.displayRows).toBe(8);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should push to multiple sessions from same IP', async () => {
      const client1 = new WebSocket(`ws://localhost:${port}/ws`);
      const client2 = new WebSocket(`ws://localhost:${port}/ws`);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('open', () => resolve())),
        new Promise<void>((resolve) => client2.on('open', () => resolve())),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Store config
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', { type: 'vertical' });

      // Set up message listeners
      const messages1: C123ConfigPush[] = [];
      const messages2: C123ConfigPush[] = [];
      client1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ConfigPush') messages1.push(msg);
      });
      client2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ConfigPush') messages2.push(msg);
      });

      // Push config
      const count = server.pushConfigToIp('127.0.0.1');
      expect(count).toBe(2);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);

      client1.close();
      client2.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe('ConfigPush via API', () => {
    it('should push config to client when updated via PUT /api/clients/:ip/config', async () => {
      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Set up message listener
      const messages: C123ConfigPush[] = [];
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ConfigPush') {
          messages.push(msg);
        }
      });

      // Update config via API
      const response = await fetch(`http://localhost:${port}/api/clients/127.0.0.1/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ledwall',
          displayRows: 12,
          customTitle: 'Updated Title',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.pushedToSessions).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client should have received ConfigPush
      expect(messages).toHaveLength(1);
      expect(messages[0].data.type).toBe('ledwall');
      expect(messages[0].data.displayRows).toBe(12);
      expect(messages[0].data.customTitle).toBe('Updated Title');

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should save config and report 0 pushed sessions when client not connected', async () => {
      // No client connected
      const response = await fetch(`http://localhost:${port}/api/clients/192.168.1.99/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vertical', displayRows: 5 }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.pushedToSessions).toBe(0);

      // Config should still be saved
      const settings = getAppSettings();
      const config = settings.getClientConfig('192.168.1.99');
      expect(config?.type).toBe('vertical');
      expect(config?.displayRows).toBe(5);
    });

    it('should push merged config after partial update', async () => {
      // Pre-store some config
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'ledwall',
        displayRows: 10,
      });

      const client = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve) => {
        client.on('open', () => resolve());
      });

      // Skip initial ConfigPush
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Set up message listener
      const messages: C123ConfigPush[] = [];
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ConfigPush') {
          messages.push(msg);
        }
      });

      // Update only displayRows via API
      const response = await fetch(`http://localhost:${port}/api/clients/127.0.0.1/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayRows: 15 }),
      });

      expect(response.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Client should receive merged config (type preserved, displayRows updated)
      expect(messages).toHaveLength(1);
      expect(messages[0].data.type).toBe('ledwall'); // Preserved
      expect(messages[0].data.displayRows).toBe(15); // Updated

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('should include custom parameters in ConfigPush', async () => {
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'vertical',
        custom: {
          theme: 'dark',
          animationSpeed: 500,
        },
      });

      const messages: C123ConfigPush[] = [];
      const client = await createClientWithHandler(
        `ws://localhost:${port}/ws`,
        (msg) => {
          if ((msg as { type?: string }).type === 'ConfigPush') {
            messages.push(msg as C123ConfigPush);
          }
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0].data.type).toBe('vertical');
      expect(messages[0].data.custom).toEqual({
        theme: 'dark',
        animationSpeed: 500,
      });

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  describe('ConfigPush message format', () => {
    it('should have correct message structure', async () => {
      const settings = getAppSettings();
      settings.setClientConfig('127.0.0.1', {
        type: 'ledwall',
        displayRows: 8,
      });

      const messages: C123ConfigPush[] = [];
      const client = await createClientWithHandler(
        `ws://localhost:${port}/ws`,
        (msg) => {
          if ((msg as { type?: string }).type === 'ConfigPush') {
            messages.push(msg as C123ConfigPush);
          }
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: 'ConfigPush',
        timestamp: expect.any(String),
        data: expect.any(Object),
      });

      // Timestamp should be valid ISO string
      expect(new Date(messages[0].timestamp).toISOString()).toBe(messages[0].timestamp);

      client.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});
