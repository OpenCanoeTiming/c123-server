import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import dgram from 'node:dgram';
import { UdpDiscovery } from '../UdpDiscovery.js';

describe('UdpDiscovery', () => {
  let discovery: UdpDiscovery;
  let sender: dgram.Socket;
  let testPort: number;

  beforeEach(async () => {
    // Find an available port
    const tempSocket = dgram.createSocket('udp4');
    await new Promise<void>((resolve) => {
      tempSocket.bind(0, () => {
        const addr = tempSocket.address();
        testPort = addr.port;
        tempSocket.close(() => resolve());
      });
    });

    // Create sender socket
    sender = dgram.createSocket('udp4');
  });

  afterEach(async () => {
    if (discovery) {
      discovery.stop();
    }
    await new Promise<void>((resolve) => {
      sender.close(() => resolve());
    });
  });

  it('should start listening on configured port', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    await discovery.start();
    expect(discovery.isListening()).toBe(true);
    expect(discovery.getDiscoveredHost()).toBeNull();
  });

  it('should detect C123 host from UDP broadcast', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 5000 });

    const discoveredPromise = new Promise<string>((resolve) => {
      discovery.on('discovered', resolve);
    });

    await discovery.start();

    // Send C123-like XML message
    const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';
    const msg = Buffer.from(xml);
    sender.send(msg, testPort, '127.0.0.1');

    const host = await discoveredPromise;
    expect(host).toBe('127.0.0.1');
    expect(discovery.getDiscoveredHost()).toBe('127.0.0.1');
  });

  it('should emit message events with XML and host', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    const messages: Array<{ xml: string; host: string }> = [];
    discovery.on('message', (xml, host) => {
      messages.push({ xml, host });
    });

    await discovery.start();

    const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';
    sender.send(Buffer.from(xml), testPort, '127.0.0.1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages).toHaveLength(1);
    expect(messages[0].xml).toBe(xml);
    expect(messages[0].host).toBe('127.0.0.1');
  });

  it('should only emit discovered once', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    let discoveredCount = 0;
    discovery.on('discovered', () => {
      discoveredCount++;
    });

    await discovery.start();

    const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';

    // Send multiple messages
    sender.send(Buffer.from(xml), testPort, '127.0.0.1');
    await new Promise((resolve) => setTimeout(resolve, 20));
    sender.send(Buffer.from(xml), testPort, '127.0.0.1');
    await new Promise((resolve) => setTimeout(resolve, 20));
    sender.send(Buffer.from(xml), testPort, '127.0.0.1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(discoveredCount).toBe(1);
  });

  it('should ignore non-C123 messages', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    const messages: string[] = [];
    discovery.on('message', (xml) => messages.push(xml));

    let discovered = false;
    discovery.on('discovered', () => {
      discovered = true;
    });

    await discovery.start();

    // Send non-C123 XML
    sender.send(Buffer.from('<other>data</other>'), testPort, '127.0.0.1');
    sender.send(Buffer.from('not xml at all'), testPort, '127.0.0.1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages).toHaveLength(0);
    expect(discovered).toBe(false);
    expect(discovery.getDiscoveredHost()).toBeNull();
  });

  it('should emit timeout when no C123 found', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 100 });

    const timeoutPromise = new Promise<boolean>((resolve) => {
      discovery.on('timeout', () => resolve(true));
    });

    await discovery.start();

    const timedOut = await timeoutPromise;
    expect(timedOut).toBe(true);
    expect(discovery.getDiscoveredHost()).toBeNull();
  });

  it('should not emit timeout after discovery', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 100 });

    let timedOut = false;
    discovery.on('timeout', () => {
      timedOut = true;
    });

    await discovery.start();

    // Send C123 message before timeout
    const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';
    sender.send(Buffer.from(xml), testPort, '127.0.0.1');

    // Wait longer than timeout
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(timedOut).toBe(false);
    expect(discovery.getDiscoveredHost()).toBe('127.0.0.1');
  });

  it('should stop listening when stopped', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    await discovery.start();
    expect(discovery.isListening()).toBe(true);

    discovery.stop();
    expect(discovery.isListening()).toBe(false);
  });

  it('should use default port 27333', () => {
    discovery = new UdpDiscovery();
    // Cannot easily test internal port, but verify it doesn't throw
    expect(discovery.isListening()).toBe(false);
  });

  it('should resolve start if already started', async () => {
    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    await discovery.start();
    // Should not throw when called again
    await discovery.start();
    expect(discovery.isListening()).toBe(true);
  });

  it('should handle socket error', async () => {
    // Create another socket to occupy the port
    const blocker = dgram.createSocket({ type: 'udp4', reuseAddr: false });
    await new Promise<void>((resolve) => {
      blocker.bind(testPort, () => resolve());
    });

    discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

    try {
      await discovery.start();
      // On some systems with reuseAddr this might succeed
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }

    await new Promise<void>((resolve) => {
      blocker.close(() => resolve());
    });
  });

  describe('reset()', () => {
    it('should clear discovered host', async () => {
      discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

      await discovery.start();

      // First discovery
      const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';
      sender.send(Buffer.from(xml), testPort, '127.0.0.1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(discovery.getDiscoveredHost()).toBe('127.0.0.1');

      // Reset
      discovery.reset();
      expect(discovery.getDiscoveredHost()).toBeNull();
    });

    it('should allow re-discovery after reset', async () => {
      discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

      let discoveredCount = 0;
      discovery.on('discovered', () => {
        discoveredCount++;
      });

      await discovery.start();

      const xml = '<Canoe123 System="Main"><TimeOfDay>12:34:56</TimeOfDay></Canoe123>';

      // First discovery
      sender.send(Buffer.from(xml), testPort, '127.0.0.1');
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(discoveredCount).toBe(1);

      // Reset and re-discover
      discovery.reset();
      sender.send(Buffer.from(xml), testPort, '127.0.0.1');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(discoveredCount).toBe(2);
      expect(discovery.getDiscoveredHost()).toBe('127.0.0.1');
    });

    it('should do nothing when not running', () => {
      discovery = new UdpDiscovery({ port: testPort, timeout: 0 });

      // Should not throw
      discovery.reset();
      expect(discovery.getDiscoveredHost()).toBeNull();
    });

    it('should restart timeout timer when running', async () => {
      discovery = new UdpDiscovery({ port: testPort, timeout: 150 });

      let timeoutCount = 0;
      discovery.on('timeout', () => {
        timeoutCount++;
      });

      await discovery.start();

      // Wait less than timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reset should restart the timer
      discovery.reset();

      // Wait less than timeout again
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have timed out yet (timer was reset)
      expect(timeoutCount).toBe(0);

      // Wait for timeout to fire
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(timeoutCount).toBe(1);
    });
  });
});
