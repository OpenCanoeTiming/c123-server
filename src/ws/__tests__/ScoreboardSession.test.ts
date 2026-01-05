import { describe, test, expect, vi } from 'vitest';
import { ScoreboardSession } from '../ScoreboardSession.js';
import type { ClientConfig } from '../../config/types.js';

// Mock WebSocket with typed send
interface MockWebSocket {
  readyState: number;
  OPEN: number;
  send: ReturnType<typeof vi.fn>;
}

function createMockWebSocket(readyState = 1): MockWebSocket {
  return {
    readyState,
    OPEN: 1,
    send: vi.fn(),
  };
}

// Cast mock to WebSocket for type compatibility
function asWs(mock: MockWebSocket): import('ws').WebSocket {
  return mock as unknown as import('ws').WebSocket;
}

describe('ScoreboardSession', () => {
  describe('constructor and basic properties', () => {
    test('should create session with required parameters', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      expect(session.id).toBe('client-1');
      expect(session.ipAddress).toBe('192.168.1.50');
      expect(session.connectedAt).toBeInstanceOf(Date);
    });

    test('should create session with server config', () => {
      const ws = createMockWebSocket();
      const serverConfig: ClientConfig = {
        type: 'ledwall',
        displayRows: 10,
        label: 'TV v hale',
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, serverConfig);

      expect(session.getServerConfig()).toEqual(serverConfig);
    });

    test('should create session with scoreboard config', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', {
        showOnCourse: false,
        showResults: true,
      });

      expect(session.getConfig()).toEqual({
        showOnCourse: false,
        showResults: true,
      });
    });
  });

  describe('getInfo', () => {
    test('should return session info with IP address', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '10.0.0.5');

      const info = session.getInfo();

      expect(info.id).toBe('client-1');
      expect(info.ipAddress).toBe('10.0.0.5');
      expect(info.connectedAt).toBeDefined();
      expect(info.lastActivity).toBeDefined();
      expect(info.config).toBeDefined();
    });

    test('should include client state when set', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      session.setClientState({
        current: { view: 'results' },
        version: '1.0.0',
      });

      const info = session.getInfo();

      expect(info.clientState).toBeDefined();
      expect(info.clientState?.current).toEqual({ view: 'results' });
      expect(info.clientState?.version).toBe('1.0.0');
      expect(info.clientState?.lastUpdated).toBeDefined();
    });
  });

  describe('IP address', () => {
    test('getIpAddress should return IP', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '172.16.0.1');

      expect(session.getIpAddress()).toBe('172.16.0.1');
    });

    test('should handle IPv6 address', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '::1');

      expect(session.getIpAddress()).toBe('::1');
    });

    test('should handle unknown IP', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), 'unknown');

      expect(session.getIpAddress()).toBe('unknown');
    });
  });

  describe('client state', () => {
    test('should return undefined when no client state set', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      expect(session.getClientState()).toBeUndefined();
    });

    test('should store and return client state', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      session.setClientState({
        current: { mode: 'ledwall', rows: 8 },
        version: '2.0.0',
        capabilities: ['configpush', 'forcerefresh'],
      });

      const state = session.getClientState();
      expect(state?.current).toEqual({ mode: 'ledwall', rows: 8 });
      expect(state?.version).toBe('2.0.0');
      expect(state?.capabilities).toEqual(['configpush', 'forcerefresh']);
      expect(state?.lastUpdated).toBeDefined();
    });

    test('should update lastUpdated on each setClientState call', async () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      session.setClientState({ current: { a: 1 } });
      const firstUpdate = session.getClientState()?.lastUpdated;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      session.setClientState({ current: { a: 2 } });
      const secondUpdate = session.getClientState()?.lastUpdated;

      expect(firstUpdate).not.toBe(secondUpdate);
    });

    test('should return copy of client state to prevent mutation', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      session.setClientState({ current: { x: 1 } });
      const state1 = session.getClientState();
      const state2 = session.getClientState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('server config', () => {
    test('should return undefined when no server config set', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      expect(session.getServerConfig()).toBeUndefined();
    });

    test('should store and return server config', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        type: 'vertical',
        customTitle: 'Test Event',
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      expect(session.getServerConfig()).toEqual(config);
    });

    test('should update server config via setServerConfig', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      const newConfig: ClientConfig = {
        type: 'ledwall',
        displayRows: 12,
      };
      session.setServerConfig(newConfig);

      expect(session.getServerConfig()).toEqual(newConfig);
    });

    test('should return copy of server config to prevent mutation', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = { type: 'ledwall' };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      const config1 = session.getServerConfig();
      const config2 = session.getServerConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('getEffectiveConfig', () => {
    test('should return empty object when no server config', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      expect(session.getEffectiveConfig()).toEqual({});
    });

    test('should return only defined values from server config', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        type: 'ledwall',
        displayRows: 10,
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      const effective = session.getEffectiveConfig();

      expect(effective.type).toBe('ledwall');
      expect(effective.displayRows).toBe(10);
      expect(effective.customTitle).toBeUndefined();
      expect(effective.raceFilter).toBeUndefined();
    });

    test('should include all set properties', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        type: 'vertical',
        displayRows: 8,
        customTitle: 'Finals',
        raceFilter: ['K1M_ST_BR1', 'K1M_ST_BR2'],
        showOnCourse: true,
        showResults: false,
        custom: { theme: 'dark' },
        label: 'Main Screen',
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      const effective = session.getEffectiveConfig();

      expect(effective.type).toBe('vertical');
      expect(effective.displayRows).toBe(8);
      expect(effective.customTitle).toBe('Finals');
      expect(effective.raceFilter).toEqual(['K1M_ST_BR1', 'K1M_ST_BR2']);
      expect(effective.showOnCourse).toBe(true);
      expect(effective.showResults).toBe(false);
      expect(effective.custom).toEqual({ theme: 'dark' });
      expect(effective.label).toBe('Main Screen');
    });

    test('should return copy of arrays to prevent mutation', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        raceFilter: ['race1', 'race2'],
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      const effective = session.getEffectiveConfig();
      expect(effective.raceFilter).toEqual(['race1', 'race2']);
      expect(effective.raceFilter).not.toBe(config.raceFilter);
    });
  });

  describe('sendConfigPush', () => {
    test('should not send if not connected', () => {
      const ws = createMockWebSocket(3); // CLOSED state
      const config: ClientConfig = { type: 'ledwall' };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      session.sendConfigPush();

      expect(ws.send).not.toHaveBeenCalled();
    });

    test('should not send if no config to push', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50');

      session.sendConfigPush();

      expect(ws.send).not.toHaveBeenCalled();
    });

    test('should send ConfigPush message with config', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        type: 'ledwall',
        displayRows: 10,
        label: 'TV Screen',
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      session.sendConfigPush();

      expect(ws.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(ws.send.mock.calls[0][0] as string);

      expect(sentMessage.type).toBe('ConfigPush');
      expect(sentMessage.timestamp).toBeDefined();
      expect(sentMessage.data.type).toBe('ledwall');
      expect(sentMessage.data.displayRows).toBe(10);
      expect(sentMessage.data.label).toBe('TV Screen');
    });

    test('should only include defined properties in ConfigPush', () => {
      const ws = createMockWebSocket();
      const config: ClientConfig = {
        displayRows: 5,
        // type is undefined
        // customTitle is undefined
      };
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', undefined, config);

      session.sendConfigPush();

      const sentMessage = JSON.parse(ws.send.mock.calls[0][0] as string);

      expect(sentMessage.data.displayRows).toBe(5);
      expect('type' in sentMessage.data).toBe(false);
      expect('customTitle' in sentMessage.data).toBe(false);
    });
  });

  describe('filtering messages', () => {
    test('should filter OnCourse messages when showOnCourse is false', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', {
        showOnCourse: false,
      });

      session.send({
        type: 'OnCourse',
        timestamp: new Date().toISOString(),
        data: { total: 0, competitors: [] },
      });

      expect(ws.send).not.toHaveBeenCalled();
    });

    test('should filter Results messages when showResults is false', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', {
        showResults: false,
      });

      session.send({
        type: 'Results',
        timestamp: new Date().toISOString(),
        data: {
          raceId: 'K1M_ST_BR1',
          classId: 'K1M_ST',
          isCurrent: true,
          mainTitle: 'K1m',
          subTitle: '1st Run',
          rows: [],
        },
      });

      expect(ws.send).not.toHaveBeenCalled();
    });

    test('should always send TimeOfDay regardless of filters', () => {
      const ws = createMockWebSocket();
      const session = new ScoreboardSession('client-1', asWs(ws), '192.168.1.50', {
        showOnCourse: false,
        showResults: false,
      });

      session.send({
        type: 'TimeOfDay',
        timestamp: new Date().toISOString(),
        data: { time: '10:30:00' },
      });

      expect(ws.send).toHaveBeenCalledTimes(1);
    });
  });
});
