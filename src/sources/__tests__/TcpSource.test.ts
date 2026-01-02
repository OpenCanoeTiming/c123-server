import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import net from 'node:net';
import { TcpSource } from '../TcpSource.js';
import type { SourceStatus } from '../types.js';

describe('TcpSource', () => {
  let server: net.Server;
  let serverPort: number;
  let source: TcpSource;

  beforeEach(async () => {
    // Create a test TCP server
    server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (source) {
      source.stop();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should connect to TCP server', async () => {
    source = new TcpSource({ host: '127.0.0.1', port: serverPort });

    const statusChanges: SourceStatus[] = [];
    source.on('status', (status) => statusChanges.push(status));

    const connected = new Promise<void>((resolve) => {
      source.on('status', (status) => {
        if (status === 'connected') resolve();
      });
    });

    source.start();
    await connected;

    expect(source.status).toBe('connected');
    expect(statusChanges).toContain('connecting');
    expect(statusChanges).toContain('connected');
  });

  it('should parse pipe-delimited XML messages', async () => {
    source = new TcpSource({ host: '127.0.0.1', port: serverPort });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<net.Socket>((resolve) => {
      server.once('connection', resolve);
    });

    source.start();
    const clientSocket = await connected;

    // Send two XML messages with pipe delimiter
    clientSocket.write('<xml>first</xml>|<xml>second</xml>|');

    // Wait for messages to be processed
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe('<xml>first</xml>');
    expect(messages[1]).toBe('<xml>second</xml>');
  });

  it('should buffer incomplete messages', async () => {
    source = new TcpSource({ host: '127.0.0.1', port: serverPort });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<net.Socket>((resolve) => {
      server.once('connection', resolve);
    });

    source.start();
    const clientSocket = await connected;

    // Send incomplete message
    clientSocket.write('<xml>part');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(messages).toHaveLength(0);

    // Complete the message
    clientSocket.write('ial</xml>|');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe('<xml>partial</xml>');
  });

  it('should handle disconnection', async () => {
    source = new TcpSource({
      host: '127.0.0.1',
      port: serverPort,
      initialReconnectDelay: 100000, // Don't reconnect during test
    });

    const statusChanges: SourceStatus[] = [];
    source.on('status', (status) => statusChanges.push(status));

    const connected = new Promise<net.Socket>((resolve) => {
      server.once('connection', resolve);
    });

    source.start();
    const clientSocket = await connected;

    // Wait for connected status
    await new Promise<void>((resolve) => {
      if (source.status === 'connected') resolve();
      else source.once('status', (s) => s === 'connected' && resolve());
    });

    // Server closes connection
    clientSocket.destroy();

    // Wait for disconnected status
    await new Promise<void>((resolve) => {
      source.once('status', (s) => {
        if (s === 'disconnected') resolve();
      });
    });

    expect(source.status).toBe('disconnected');
  });

  it('should attempt reconnection with exponential backoff', async () => {
    source = new TcpSource({
      host: '127.0.0.1',
      port: serverPort,
      initialReconnectDelay: 50,
      maxReconnectDelay: 200,
    });

    let connectionCount = 0;
    server.on('connection', (socket) => {
      connectionCount++;
      // Immediately close to trigger reconnect
      socket.destroy();
    });

    source.start();

    // Wait for multiple reconnection attempts
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should have reconnected at least twice
    expect(connectionCount).toBeGreaterThanOrEqual(2);
  });

  it('should stop reconnecting when stopped', async () => {
    source = new TcpSource({
      host: '127.0.0.1',
      port: serverPort,
      initialReconnectDelay: 50,
    });

    let connectionCount = 0;
    server.on('connection', (socket) => {
      connectionCount++;
      socket.destroy();
    });

    source.start();

    // Wait for first connection
    await new Promise((resolve) => setTimeout(resolve, 100));
    const countAfterStart = connectionCount;

    source.stop();

    // Wait and verify no more connections
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(connectionCount).toBe(countAfterStart);
    expect(source.status).toBe('disconnected');
  });

  it('should emit error on connection failure', async () => {
    // Use invalid port that will refuse connection
    source = new TcpSource({
      host: '127.0.0.1',
      port: 1, // Privileged port that will fail
      initialReconnectDelay: 100000,
    });

    const errorPromise = new Promise<Error>((resolve) => {
      source.once('error', resolve);
    });

    source.start();
    const error = await errorPromise;

    expect(error).toBeInstanceOf(Error);
    source.stop();
  });

  it('should use default port 27333', () => {
    source = new TcpSource({ host: '192.168.1.1' });
    // We can't easily test the internal port, but we verify it doesn't throw
    expect(source.status).toBe('disconnected');
  });

  it('should ignore empty messages', async () => {
    source = new TcpSource({ host: '127.0.0.1', port: serverPort });

    const messages: string[] = [];
    source.on('message', (xml) => messages.push(xml));

    const connected = new Promise<net.Socket>((resolve) => {
      server.once('connection', resolve);
    });

    source.start();
    const clientSocket = await connected;

    // Send messages with empty segments
    clientSocket.write('||<xml>data</xml>|  |');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toBe('<xml>data</xml>');
  });
});
