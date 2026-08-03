/**
 * Integration tests for the Penalty Checks REST API.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { UnifiedServer } from '../UnifiedServer.js';
import { ChecksStore } from '../../checks/ChecksStore.js';
import { resetAppSettings } from '../../config/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonResponse = Record<string, any>;

const BASE_PORT = 27950;
let portCounter = 0;

function getNextPort(): number {
  return BASE_PORT + portCounter++;
}

describe('Penalty Checks API', () => {
  let server: UnifiedServer;
  let store: ChecksStore;
  let baseUrl: string;
  let tempDir: string;

  beforeEach(async () => {
    resetAppSettings();
    tempDir = mkdtempSync(join(tmpdir(), 'checks-api-test-'));
    process.env.HOME = tempDir;

    store = new ChecksStore();
    store.loadForFile('test-event.xml');
    store.setScheduleFingerprint('K1M_BR1@2026-04-19|C1W_BR1@2026-04-19');

    server = new UnifiedServer({ port: getNextPort() });
    await server.start();
    server.setChecksStore(store);
    baseUrl = `http://localhost:${server.getPort()}`;
  });

  afterEach(async () => {
    await server.stop();
    store.destroy();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    resetAppSettings();
  });

  describe('GET /api/checks/:raceId', () => {
    it('returns a flat shape with checks and flags side by side', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data).toEqual({ checks: {}, flags: [] });
    });

    it('returns checks keyed by bib:gate', async () => {
      store.setCheck('K1M_BR1', '42', 5, 2, 'per protocol');

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1`);
      const data = (await response.json()) as JsonResponse;

      expect(data.checks['42:5'].value).toBe(2);
      expect(data.checks['42:5'].tag).toBe('per protocol');
      expect(data.flags).toEqual([]);
    });

    it('returns flags as an array carrying their own bib and gate', async () => {
      store.createFlag('K1M_BR1', '42', 7, 'disputed gate', 50);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1`);
      const data = (await response.json()) as JsonResponse;

      expect(data.flags).toHaveLength(1);
      expect(data.flags[0].bib).toBe('42');
      expect(data.flags[0].gate).toBe(7);
      expect(data.flags[0].suggestedValue).toBe(50);
    });

    it('returns empty structures for an unknown race', async () => {
      const response = await fetch(`${baseUrl}/api/checks/NOPE`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data).toEqual({ checks: {}, flags: [] });
    });
  });

  describe('GET /api/checks', () => {
    it('returns every race in one call', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);
      store.setCheck('C1W_BR1', '7', 3, 50);

      const response = await fetch(`${baseUrl}/api/checks`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(Object.keys(data.races).sort()).toEqual(['C1W_BR1', 'K1M_BR1']);
      expect(data.races.K1M_BR1.checks['1:1'].value).toBe(0);
      expect(data.races.C1W_BR1.checks['7:3'].value).toBe(50);
    });

    it('exposes the xml filename and the pinned fingerprint', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);

      const response = await fetch(`${baseUrl}/api/checks`);
      const data = (await response.json()) as JsonResponse;

      expect(data.xmlFilename).toBe('test-event.xml');
      expect(data.fingerprint).toBe('K1M_BR1@2026-04-19|C1W_BR1@2026-04-19');
    });

    it('reports a null fingerprint before the first write', async () => {
      const response = await fetch(`${baseUrl}/api/checks`);
      const data = (await response.json()) as JsonResponse;

      expect(data.fingerprint).toBeNull();
      expect(data.races).toEqual({});
    });
  });

  describe('POST /api/checks/new-event', () => {
    it('clears every race', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);
      store.setCheck('C1W_BR1', '7', 3, 50);

      const response = await fetch(`${baseUrl}/api/checks/new-event`, { method: 'POST' });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.success).toBe(true);

      const after = (await (await fetch(`${baseUrl}/api/checks`)).json()) as JsonResponse;
      expect(after.races).toEqual({});
      expect(after.fingerprint).toBeNull();
    });

    it('does not disturb the loaded xml filename', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);
      await fetch(`${baseUrl}/api/checks/new-event`, { method: 'POST' });

      const after = (await (await fetch(`${baseUrl}/api/checks`)).json()) as JsonResponse;
      expect(after.xmlFilename).toBe('test-event.xml');
    });
  });

  describe('PUT /api/checks/:raceId/check', () => {
    it('stores an explicitly supplied value', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5, value: 2, tag: 'paper' }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBe(2);
      expect(data.check.tag).toBe('paper');
      expect(store.getChecks('K1M_BR1').checks['42:5'].value).toBe(2);
    });

    it('accepts an explicit null value', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5, value: null }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBeNull();
    });

    it('rejects a missing bib', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate: 5, value: 2 }),
      });
      expect(response.status).toBe(400);
    });

    it('rejects a gate outside 1..25', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 26, value: 2 }),
      });
      expect(response.status).toBe(400);
    });

    it('rejects a fractional gate', async () => {
      // "42:3.5" would be unreachable by every invalidation path.
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 3.5, value: 2 }),
      });
      expect(response.status).toBe(400);
      expect(store.getChecks('K1M_BR1').checks['42:3.5']).toBeUndefined();
    });

    it('rejects an empty-string value instead of recording it as clean', async () => {
      // Number('') is 0, so a client form bug would otherwise be stored as
      // "verified, no penalty" — the most damaging value to get wrong.
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5, value: '' }),
      });
      expect(response.status).toBe(400);
      expect(store.getChecks('K1M_BR1').checks['42:5']).toBeUndefined();
    });

    it('accepts a numeric string, matching how gate already behaved', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: '5', value: '2' }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBe(2);
    });

    it('rejects a non-string tag', async () => {
      // Anything accepted here is persisted to disk and broadcast to clients.
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5, value: 2, tag: { evil: [1, 2, 3] } }),
      });
      expect(response.status).toBe(400);
      expect(store.getChecks('K1M_BR1').checks['42:5']).toBeUndefined();
    });

    it('rejects a boolean value', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5, value: true }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/checks/:raceId/check', () => {
    it('removes a check', async () => {
      store.setCheck('K1M_BR1', '42', 5, 2);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5 }),
      });
      expect(response.status).toBe(200);
      expect(store.getChecks('K1M_BR1').checks['42:5']).toBeUndefined();
    });

    it('returns 404 for a check that was never set', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '99', gate: 1 }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/checks/:raceId', () => {
    it('clears one race and leaves the others alone', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);
      store.setCheck('C1W_BR1', '7', 3, 50);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1`, { method: 'DELETE' });
      expect(response.status).toBe(200);

      expect(store.getChecks('K1M_BR1').checks).toEqual({});
      expect(store.getChecks('C1W_BR1').checks['7:3']).toBeDefined();
    });

    it('leaves the fingerprint pinned', async () => {
      store.setCheck('K1M_BR1', '1', 1, 0);
      await fetch(`${baseUrl}/api/checks/K1M_BR1`, { method: 'DELETE' });

      const data = (await (await fetch(`${baseUrl}/api/checks`)).json()) as JsonResponse;
      expect(data.fingerprint).toBe('K1M_BR1@2026-04-19|C1W_BR1@2026-04-19');
    });
  });

  describe('POST /api/checks/:raceId/flag', () => {
    it('creates a flag and returns 201', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 7, comment: 'disputed', suggestedValue: 50 }),
      });
      expect(response.status).toBe(201);

      const data = (await response.json()) as JsonResponse;
      expect(data.flag.comment).toBe('disputed');
      expect(data.flag.resolved).toBe(false);
      expect(data.flag.id).toBeTruthy();
    });

    it('rejects a missing comment', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 7 }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/checks/:raceId/flag/:id', () => {
    it('resolves a flag and auto-creates a check', async () => {
      const flag = store.createFlag('K1M_BR1', '42', 7, 'disputed', 50);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'confirmed on video' }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.flag.resolved).toBe(true);
      expect(data.flag.resolution).toBe('confirmed on video');
      expect(data.check).toBeDefined();
      expect(store.getChecks('K1M_BR1').checks['42:7']).toBeDefined();
    });

    it('returns 404 for an unknown flag', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/nope`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
    });

    it('returns 409 when the flag is already resolved', async () => {
      const flag = store.createFlag('K1M_BR1', '42', 7, 'disputed');
      store.resolveFlag('K1M_BR1', flag.id, 'done', 2);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/checks/:raceId/flag/:id', () => {
    it('deletes a flag', async () => {
      const flag = store.createFlag('K1M_BR1', '42', 7, 'disputed');

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/${flag.id}`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(200);
      expect(store.getChecks('K1M_BR1').flags).toEqual([]);
    });

    it('returns 404 for an unknown flag', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/nope`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(404);
    });
  });

  describe('gate value snapshot from XML', () => {
    // Gates is fixed-width: three characters per gate, right-aligned and
    // space-padded (docs/XML-FORMAT.md). Built from cells rather than written
    // as a literal so the alignment cannot drift. Gate 4 is unjudged; gate 5
    // is 50. Splitting on whitespace would drop the blank and read gate 4
    // as 50.
    const GATES = ['0', '2', '0', '', '50', '0'].map((v) => v.padStart(3)).join('');

    beforeEach(() => {
      server.setXmlDataService({
        getResultsForRace: async (raceId: string) =>
          raceId === 'K1M_BR1' ? [{ bib: '42', gates: GATES }] : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    });

    it('reads the gate at its fixed-width position, not its split index', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 5 }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBe(50);
    });

    it('records an unjudged gate as null rather than as clean', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 4 }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBeNull();
    });

    it('returns null for a gate past the end of the string', async () => {
      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bib: '42', gate: 7 }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBeNull();
    });

    it('reads the earlier gates correctly too', async () => {
      const put = async (gate: number) => {
        const r = await fetch(`${baseUrl}/api/checks/K1M_BR1/check`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bib: '42', gate }),
        });
        return ((await r.json()) as JsonResponse).check.value;
      };

      expect(await put(1)).toBe(0);
      expect(await put(2)).toBe(2);
      expect(await put(3)).toBe(0);
    });

    it('falls back to suggestedValue when the gate cannot be read', async () => {
      // Gate 4 is unjudged, so resolving must not record an affirmative
      // "clean" — the flag's suggestion is the better answer.
      const flag = store.createFlag('K1M_BR1', '42', 4, 'protocol says 50', 50);

      const response = await fetch(`${baseUrl}/api/checks/K1M_BR1/flag/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'per paper protocol' }),
      });
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.check.value).toBe(50);
    });
  });

  describe('without a ChecksStore', () => {
    it('answers 503 on every checks route', async () => {
      const bare = new UnifiedServer({ port: getNextPort() });
      await bare.start();
      const bareUrl = `http://localhost:${bare.getPort()}`;

      try {
        expect((await fetch(`${bareUrl}/api/checks`)).status).toBe(503);
        expect((await fetch(`${bareUrl}/api/checks/K1M_BR1`)).status).toBe(503);
        expect(
          (await fetch(`${bareUrl}/api/checks/new-event`, { method: 'POST' })).status
        ).toBe(503);
      } finally {
        await bare.stop();
      }
    });
  });

  describe('with a store but no checks file loaded', () => {
    // The production not-ready state: the store is always constructed, but no
    // XML path has been set yet. This must not surface as a 500 carrying an
    // internal message, nor as a misleading 404.
    let bare: UnifiedServer;
    let bareUrl: string;

    beforeEach(async () => {
      bare = new UnifiedServer({ port: getNextPort() });
      await bare.start();
      bare.setChecksStore(new ChecksStore());
      bareUrl = `http://localhost:${bare.getPort()}`;
    });

    afterEach(async () => {
      await bare.stop();
    });

    const json = { 'Content-Type': 'application/json' };

    it('answers 503 on every mutating route', async () => {
      const cases: Array<[string, RequestInit]> = [
        [
          '/api/checks/R1/check',
          { method: 'PUT', headers: json, body: JSON.stringify({ bib: '1', gate: 1, value: 2 }) },
        ],
        [
          '/api/checks/R1/check',
          { method: 'DELETE', headers: json, body: JSON.stringify({ bib: '1', gate: 1 }) },
        ],
        ['/api/checks/R1', { method: 'DELETE' }],
        [
          '/api/checks/R1/flag',
          { method: 'POST', headers: json, body: JSON.stringify({ bib: '1', gate: 1, comment: 'x' }) },
        ],
        ['/api/checks/R1/flag/z', { method: 'PATCH', headers: json, body: JSON.stringify({}) }],
        ['/api/checks/R1/flag/z', { method: 'DELETE' }],
        ['/api/checks/new-event', { method: 'POST' }],
      ];

      for (const [path, init] of cases) {
        const response = await fetch(`${bareUrl}${path}`, init);
        expect({ path, method: init.method, status: response.status }).toEqual({
          path,
          method: init.method,
          status: 503,
        });
      }
    });
  });
});
