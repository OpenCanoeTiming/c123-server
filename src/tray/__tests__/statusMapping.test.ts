import { describe, it, expect } from 'vitest';
import { mapStatusResponse, type MinimalStatusResponse } from '../statusMapping.js';
import type { SourceStatusInfo } from '../../admin/types.js';

function makeSource(name: string, status: SourceStatusInfo['status']): SourceStatusInfo {
  return { name, type: 'tcp', status };
}

function makeResponse(
  sources: SourceStatusInfo[],
  raceName: string | null = null,
): MinimalStatusResponse {
  return {
    sources,
    event: {
      currentRaceId: null,
      raceName,
      onCourseCount: 0,
      resultsCount: 0,
    },
  };
}

describe('mapStatusResponse', () => {
  describe('fetch failures', () => {
    it('returns error with custom message when fetchError is set', () => {
      const result = mapStatusResponse(null, 'Server returned HTTP 503');
      expect(result).toEqual({ status: 'error', message: 'Server returned HTTP 503' });
    });

    it('returns error with "Server unreachable" when data is null and no fetchError', () => {
      const result = mapStatusResponse(null);
      expect(result).toEqual({ status: 'error', message: 'Server unreachable' });
    });

    it('prefers fetchError over data when both are provided', () => {
      const data = makeResponse([makeSource('TCP', 'connected')]);
      const result = mapStatusResponse(data, 'Timeout');
      expect(result.status).toBe('error');
      expect(result.message).toBe('Timeout');
    });
  });

  describe('no sources configured', () => {
    it('returns warning when sources array is empty', () => {
      const result = mapStatusResponse(makeResponse([]));
      expect(result).toEqual({ status: 'warning', message: 'No data sources configured' });
    });
  });

  describe('all connected (ok)', () => {
    it('returns ok with raceName when present', () => {
      const data = makeResponse(
        [makeSource('TCP', 'connected'), makeSource('XML', 'connected')],
        'Men K1 Final',
      );
      expect(mapStatusResponse(data)).toEqual({ status: 'ok', message: 'Men K1 Final' });
    });

    it('returns ok with default message when raceName is null', () => {
      const data = makeResponse([makeSource('TCP', 'connected')], null);
      expect(mapStatusResponse(data)).toEqual({
        status: 'ok',
        message: 'C123 Server running',
      });
    });

    it('returns ok with default message when raceName is an empty string (|| not ??)', () => {
      // Regression: `??` would have kept the empty string and produced a
      // blank "Status: " line; `||` correctly falls through.
      const data = makeResponse([makeSource('TCP', 'connected')], '');
      expect(mapStatusResponse(data)).toEqual({
        status: 'ok',
        message: 'C123 Server running',
      });
    });
  });

  describe('connecting (warning)', () => {
    it('returns warning when a single source is connecting', () => {
      const data = makeResponse([
        makeSource('TCP', 'connecting'),
        makeSource('XML', 'connected'),
      ]);
      expect(mapStatusResponse(data)).toEqual({
        status: 'warning',
        message: '1 source(s) reconnecting: TCP',
      });
    });

    it('lists all connecting source names', () => {
      const data = makeResponse([
        makeSource('TCP', 'connecting'),
        makeSource('UDP', 'connecting'),
        makeSource('XML', 'connected'),
      ]);
      expect(mapStatusResponse(data)).toEqual({
        status: 'warning',
        message: '2 source(s) reconnecting: TCP, UDP',
      });
    });
  });

  describe('disconnected (error) — priority over everything else', () => {
    it('returns error for a single disconnected source', () => {
      const data = makeResponse([
        makeSource('XML', 'disconnected'),
        makeSource('TCP', 'connected'),
      ]);
      expect(mapStatusResponse(data)).toEqual({
        status: 'error',
        message: '1 source(s) disconnected: XML',
      });
    });

    it('lists all disconnected source names', () => {
      const data = makeResponse([
        makeSource('XML', 'disconnected'),
        makeSource('TCP', 'disconnected'),
      ]);
      expect(mapStatusResponse(data)).toEqual({
        status: 'error',
        message: '2 source(s) disconnected: XML, TCP',
      });
    });

    it('wins over connecting: any disconnected source → error, not warning', () => {
      // A mixed state (one hard-down + one reconnecting) is still a user-
      // visible failure and should be red.
      const data = makeResponse([
        makeSource('XML', 'disconnected'),
        makeSource('TCP', 'connecting'),
      ]);
      expect(mapStatusResponse(data)).toEqual({
        status: 'error',
        message: '1 source(s) disconnected: XML',
      });
    });
  });

  describe('malformed data', () => {
    it('treats missing sources array as empty', () => {
      const data = { event: { currentRaceId: null, raceName: null, onCourseCount: 0, resultsCount: 0 } } as unknown as MinimalStatusResponse;
      expect(mapStatusResponse(data)).toEqual({
        status: 'warning',
        message: 'No data sources configured',
      });
    });

    it('tolerates missing event object', () => {
      const data = { sources: [makeSource('TCP', 'connected')] } as unknown as MinimalStatusResponse;
      expect(mapStatusResponse(data)).toEqual({
        status: 'ok',
        message: 'C123 Server running',
      });
    });
  });
});
