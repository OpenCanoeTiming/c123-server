import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LiveMiniClient,
  LiveMiniApiError,
  LiveMiniTimeoutError,
} from '../LiveMiniClient.js';
import type { CreateEventRequest, CreateEventResponse } from '../types.js';

describe('LiveMiniClient', () => {
  let client: LiveMiniClient;
  const mockServerUrl = 'https://live.example.com';
  const mockApiKey = 'test-api-key-123';

  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new LiveMiniClient({
      serverUrl: mockServerUrl,
      apiKey: mockApiKey,
      timeout: 5000,
    });
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should make POST request to create event', async () => {
      const request: CreateEventRequest = {
        eventId: 'TEST.2025062800',
        mainTitle: 'Test Event',
        location: 'Test Location',
        discipline: 'Slalom',
      };

      const response: CreateEventResponse = {
        id: 1,
        eventId: 'TEST.2025062800',
        apiKey: 'new-api-key',
        validity: {
          validFrom: '2025-06-28T00:00:00Z',
          validUntil: '2025-06-30T23:59:59Z',
        },
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => response,
      });

      const result = await client.createEvent(request);

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockServerUrl}/api/v1/admin/events`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': mockApiKey,
          },
          body: JSON.stringify(request),
        }),
      );
    });

    it('should throw error on 409 conflict (existing event)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: 'Conflict',
          message: 'Event already exists: TEST.2025062800',
        }),
      });

      await expect(
        client.createEvent({
          eventId: 'TEST.2025062800',
          mainTitle: 'Test Event',
        }),
      ).rejects.toThrow(LiveMiniApiError);
    });
  });

  describe('pushXml', () => {
    it('should push XML data', async () => {
      const xml = '<xml>test</xml>';
      const response = {
        imported: {
          classes: 5,
          categories: 3,
          races: 10,
          participants: 50,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const result = await client.pushXml(xml);

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockServerUrl}/api/v1/ingest/xml`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ xml }),
        }),
      );
    });

    it('should retry on network error with exponential backoff', async () => {
      const xml = '<xml>test</xml>';

      // First 2 calls fail with network error, 3rd succeeds
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            imported: { classes: 0, categories: 0, races: 0, participants: 0 },
          }),
        });

      const result = await client.pushXml(xml);

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should respect 429 Too Many Requests with Retry-After', async () => {
      const xml = '<xml>test</xml>';

      // First call returns 429, second succeeds
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers({ 'Retry-After': '1' }), // 1 second
          json: async () => ({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            imported: { classes: 0, categories: 0, races: 0, participants: 0 },
          }),
        });

      const result = await client.pushXml(xml);

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const clientWithLowRetry = new LiveMiniClient(
        {
          serverUrl: mockServerUrl,
          apiKey: mockApiKey,
        },
        { maxRetries: 2, initialDelayMs: 10 },
      );

      await expect(clientWithLowRetry.pushXml('<xml>test</xml>')).rejects.toThrow(
        'Network error',
      );

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('pushOnCourse', () => {
    it('should push oncourse data', async () => {
      const request = {
        oncourse: [
          {
            participantId: '12345.K1M.ZS',
            raceId: 'K1M-ZS_BR1_1',
            bib: 1,
            name: 'DOE John',
            club: 'Test Club',
            position: 1,
            gates: [0, 2, null, null],
            dtStart: '2025-01-01T10:00:00Z',
            dtFinish: null,
            time: 5000,
            pen: 200,
            total: 5200,
          },
        ],
      };

      const response = { active: 1 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const result = await client.pushOnCourse(request);

      expect(result).toEqual(response);
    });
  });

  describe('pushResults', () => {
    it('should push results data', async () => {
      const request = {
        results: [
          {
            participantId: '12345.K1M.ZS',
            raceId: 'K1M-ZS_BR1_1',
            bib: 1,
            rnk: 1,
            time: 9500,
            pen: 200,
            total: 9700,
            status: 'OK',
          },
        ],
      };

      const response = { updated: 1 };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const result = await client.pushResults(request);

      expect(result).toEqual(response);
    });
  });

  describe('transitionStatus', () => {
    it('should transition event status', async () => {
      const eventId = 'TEST.2025062800';
      const response = {
        eventId,
        previousStatus: 'draft' as const,
        status: 'startlist' as const,
        statusChangedAt: '2025-01-01T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const result = await client.transitionStatus(eventId, { status: 'startlist' });

      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockServerUrl}/api/v1/admin/events/${eventId}/status`,
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    it('should not retry on invalid transition', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'InvalidTransition',
          message: 'Invalid state transition',
          currentStatus: 'draft',
          requestedStatus: 'finished',
          validTransitions: ['startlist'],
        }),
      });

      await expect(
        client.transitionStatus('TEST.2025062800', { status: 'finished' }),
      ).rejects.toThrow(LiveMiniApiError);

      // Should not retry status transitions (enableRetry = false)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    it(
      'should timeout after configured duration',
      async () => {
        // Create client with very short timeout
        const fastTimeoutClient = new LiveMiniClient({
          serverUrl: mockServerUrl,
          apiKey: mockApiKey,
          timeout: 100, // 100ms
        });

        // Mock fetch that simulates abort signal timeout
        global.fetch = vi.fn().mockImplementation((url, options: any) => {
          return new Promise((resolve, reject) => {
            // Simulate fetch waiting for abort signal
            const abortHandler = () => {
              reject(new DOMException('The operation was aborted', 'AbortError'));
            };

            if (options?.signal) {
              options.signal.addEventListener('abort', abortHandler);
            }

            // Never resolve (simulate slow network)
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => ({}),
              });
            }, 10000);
          });
        });

        await expect(fastTimeoutClient.pushXml('<xml>test</xml>')).rejects.toThrow(
          LiveMiniTimeoutError,
        );
      },
      10000, // Test timeout: 10 seconds
    );
  });

  describe('URL normalization', () => {
    it('should remove trailing slash from server URL', () => {
      const clientWithSlash = new LiveMiniClient({
        serverUrl: 'https://live.example.com/',
        apiKey: mockApiKey,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          imported: { classes: 0, categories: 0, races: 0, participants: 0 },
        }),
      });

      clientWithSlash.pushXml('<xml>test</xml>');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://live.example.com/api/v1/ingest/xml',
        expect.anything(),
      );
    });
  });
});
