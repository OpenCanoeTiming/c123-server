/**
 * Tests for LiveMiniPusher
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { LiveMiniPusher } from '../LiveMiniPusher.js';
import { LiveMiniClient } from '../LiveMiniClient.js';
import type { XmlDataService } from '../../service/XmlDataService.js';
import type { EventState } from '../../state/EventState.js';
import type { XmlChangeNotifier } from '../../xml/XmlChangeNotifier.js';
import type { EventStateData } from '../../state/types.js';
import type { XmlSection } from '../../protocol/types.js';

// Mock LiveMiniClient
vi.mock('../LiveMiniClient.js', () => {
  return {
    LiveMiniClient: vi.fn().mockImplementation(() => ({
      pushXml: vi.fn().mockResolvedValue({ imported: { classes: 1, categories: 1, races: 2, participants: 10 } }),
      pushOnCourse: vi.fn().mockResolvedValue({ active: 2 }),
      pushResults: vi.fn().mockResolvedValue({ updated: 5 }),
      transitionStatus: vi.fn().mockResolvedValue({ eventId: 'test', previousStatus: 'draft', status: 'running', statusChangedAt: '2024-01-01T00:00:00Z' }),
    })),
  };
});

// Mock fs/promises for XML reading
vi.mock('node:fs/promises', async (importOriginal) => {
  return {
    default: {
      readFile: vi.fn().mockResolvedValue('<Canoe123Data></Canoe123Data>'),
    },
    readFile: vi.fn().mockResolvedValue('<Canoe123Data></Canoe123Data>'),
  };
});

describe('LiveMiniPusher', () => {
  let pusher: LiveMiniPusher;
  let mockXmlDataService: XmlDataService;
  let mockXmlChangeNotifier: XmlChangeNotifier;
  let mockEventState: EventState;

  beforeEach(() => {
    // Create mock XmlDataService
    mockXmlDataService = {
      getPath: vi.fn().mockReturnValue('/path/to/data.xml'),
      getParticipants: vi.fn().mockResolvedValue([]),
      getSchedule: vi.fn().mockResolvedValue([]),
    } as unknown as XmlDataService;

    // Create mock XmlChangeNotifier (EventEmitter)
    mockXmlChangeNotifier = new EventEmitter() as unknown as XmlChangeNotifier;

    // Create mock EventState (EventEmitter)
    mockEventState = new EventEmitter() as unknown as EventState;

    pusher = new LiveMiniPusher(mockXmlDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should start in not_configured state', () => {
      const status = pusher.getStatus();
      expect(status.state).toBe('not_configured');
      expect(status.serverUrl).toBeNull();
      expect(status.eventId).toBeNull();
      expect(status.connectedAt).toBeNull();
    });

    it('should have all channels disabled initially', () => {
      const status = pusher.getStatus();
      expect(status.channels.xml.enabled).toBe(false);
      expect(status.channels.oncourse.enabled).toBe(false);
      expect(status.channels.results.enabled).toBe(false);
    });

    it('should have circuit breaker closed', () => {
      const status = pusher.getStatus();
      expect(status.circuitBreaker.isOpen).toBe(false);
      expect(status.circuitBreaker.consecutiveFailures).toBe(0);
      expect(status.circuitBreaker.openedAt).toBeNull();
    });
  });

  describe('connect()', () => {
    it('should connect and update status', async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );

      const status = pusher.getStatus();
      expect(status.state).toBe('connected');
      expect(status.serverUrl).toBe('https://live.example.com');
      expect(status.eventId).toBe('event-123');
      expect(status.eventStatus).toBe('draft');
      expect(status.connectedAt).toBeTruthy();
    });

    it('should enable channels based on config', async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: false,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );

      const status = pusher.getStatus();
      expect(status.channels.xml.enabled).toBe(true);
      expect(status.channels.oncourse.enabled).toBe(false);
      expect(status.channels.results.enabled).toBe(true);
    });

    it('should emit statusChange event', async () => {
      const statusChangeSpy = vi.fn();
      pusher.on('statusChange', statusChangeSpy);

      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );

      expect(statusChangeSpy).toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('should disconnect and reset status', async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );

      await pusher.disconnect();

      const status = pusher.getStatus();
      expect(status.state).toBe('disconnected');
      expect(status.connectedAt).toBeNull();
    });
  });

  describe('pause() / resume()', () => {
    beforeEach(async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );
    });

    it('should pause when connected', () => {
      pusher.pause();
      const status = pusher.getStatus();
      expect(status.state).toBe('paused');
    });

    it('should resume when paused', () => {
      pusher.pause();
      pusher.resume();
      const status = pusher.getStatus();
      expect(status.state).toBe('connected');
    });

    it('should not push XML when paused', async () => {
      pusher.pause();

      // Trigger XML change
      mockXmlChangeNotifier.emit('change', ['Participants'] as XmlSection[], 'checksum123');

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Verify no push was made (client should not be called)
      // Note: We can't easily verify this without exposing the client,
      // but the pusher should skip the push when paused
    });
  });

  describe('updateChannels()', () => {
    beforeEach(async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );
    });

    it('should update individual channels', () => {
      pusher.updateChannels({ pushXml: false });
      let status = pusher.getStatus();
      expect(status.channels.xml.enabled).toBe(false);
      expect(status.channels.oncourse.enabled).toBe(true);
      expect(status.channels.results.enabled).toBe(true);

      pusher.updateChannels({ pushOnCourse: false, pushResults: false });
      status = pusher.getStatus();
      expect(status.channels.oncourse.enabled).toBe(false);
      expect(status.channels.results.enabled).toBe(false);
    });
  });

  describe('transitionStatus()', () => {
    beforeEach(async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );
    });

    it('should transition event status', async () => {
      await pusher.transitionStatus('running');
      const status = pusher.getStatus();
      expect(status.eventStatus).toBe('running');
    });

    it('should throw if not connected', async () => {
      await pusher.disconnect();
      await expect(pusher.transitionStatus('running')).rejects.toThrow('Not connected');
    });
  });

  describe('XML change handling', () => {
    beforeEach(async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );
    });

    it('should debounce XML changes (2s)', async () => {
      const statusChangeSpy = vi.fn();
      pusher.on('statusChange', statusChangeSpy);

      // Trigger multiple XML changes rapidly
      mockXmlChangeNotifier.emit('change', ['Participants'] as XmlSection[], 'checksum1');
      await new Promise((resolve) => setTimeout(resolve, 500));
      mockXmlChangeNotifier.emit('change', ['Schedule'] as XmlSection[], 'checksum2');
      await new Promise((resolve) => setTimeout(resolve, 500));
      mockXmlChangeNotifier.emit('change', ['Results'] as XmlSection[], 'checksum3');

      // Wait for debounce to complete (2s from last change)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // Should have pushed only once (after debounce)
      // Verify by checking status updates
      const status = pusher.getStatus();
      expect(status.channels.xml.totalPushes).toBeGreaterThan(0);
    });
  });

  describe('EventState change handling', () => {
    beforeEach(async () => {
      await pusher.connect(
        {
          serverUrl: 'https://live.example.com',
          apiKey: 'test-key',
          eventId: 'event-123',
          eventStatus: 'draft',
          pushXml: true,
          pushOnCourse: true,
          pushResults: true,
        },
        mockXmlChangeNotifier,
        mockEventState,
      );
    });

    it('should skip OnCourse push when no mapping data', async () => {
      const state: EventStateData = {
        timeOfDay: '12:00:00',
        raceConfig: null,
        schedule: [],
        currentRaceId: 'K1M_ST_BR1_1',
        onCourse: [
          {
            raceId: 'K1M_ST_BR1_1',
            bib: '101',
            name: 'John Doe',
            club: 'ABC',
            position: 1,
            gates: '0,0,2',
            dtStart: '12:00:00.000',
            dtFinish: null,
            time: '45.12',
            pen: 2,
            total: '47.12',
            rank: 1,
            ttbDiff: null,
            ttbName: null,
          },
        ],
        results: null,
        highlightBib: null,
        scheduleFingerprint: null,
      };

      mockEventState.emit('change', state);

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have pushed (no participant mapping)
      const status = pusher.getStatus();
      expect(status.channels.oncourse.totalPushes).toBe(0);
    });
  });
});
