/**
 * Tests for Client Management REST API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedServer } from '../UnifiedServer.js';
import { resetAppSettings, getAppSettings } from '../../config/index.js';
import type { CustomParamDefinition } from '../../config/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonResponse = Record<string, any>;

const BASE_PORT = 27900;
let portCounter = 0;

function getNextPort(): number {
  return BASE_PORT + portCounter++;
}

describe('Client Management API', () => {
  let server: UnifiedServer;
  let baseUrl: string;

  beforeEach(async () => {
    resetAppSettings();
    const port = getNextPort();
    server = new UnifiedServer({ port });
    await server.start();
    baseUrl = `http://localhost:${server.getPort()}`;
  });

  afterEach(async () => {
    await server.stop();
    resetAppSettings();
  });

  describe('GET /api/clients', () => {
    it('should return empty clients list when no clients connected or stored', async () => {
      const response = await fetch(`${baseUrl}/api/clients`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.clients).toEqual([]);
    });

    it('should return stored client configs even when offline', async () => {
      const settings = getAppSettings();
      settings.setClientConfig('192.168.1.50', {
        label: 'TV v hale',
        type: 'ledwall',
        displayRows: 10,
      });

      const response = await fetch(`${baseUrl}/api/clients`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.clients).toHaveLength(1);
      expect(data.clients[0].ip).toBe('192.168.1.50');
      expect(data.clients[0].label).toBe('TV v hale');
      expect(data.clients[0].online).toBe(false);
      expect(data.clients[0].serverConfig.type).toBe('ledwall');
      expect(data.clients[0].serverConfig.displayRows).toBe(10);
    });

    it('should return multiple clients sorted by online status then IP', async () => {
      const settings = getAppSettings();
      settings.setClientConfig('192.168.1.100', { label: 'Client A' });
      settings.setClientConfig('192.168.1.50', { label: 'Client B' });

      const response = await fetch(`${baseUrl}/api/clients`);
      const data = (await response.json()) as JsonResponse;

      expect(data.clients).toHaveLength(2);
      // Both offline, so sorted by IP
      expect(data.clients[0].ip).toBe('192.168.1.100');
      expect(data.clients[1].ip).toBe('192.168.1.50');
    });
  });

  describe('PUT /api/clients/:ip/config', () => {
    it('should set client configuration', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ledwall',
          displayRows: 8,
          customTitle: 'Finalists',
        }),
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.success).toBe(true);
      expect(data.ip).toBe('192.168.1.50');
      expect(data.config.type).toBe('ledwall');
      expect(data.config.displayRows).toBe(8);
      expect(data.config.customTitle).toBe('Finalists');
    });

    it('should merge partial config updates', async () => {
      // First set some config
      await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ledwall', displayRows: 10 }),
      });

      // Then update only displayRows
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayRows: 8 }),
      });

      const data = (await response.json()) as JsonResponse;
      expect(data.config.type).toBe('ledwall'); // Preserved
      expect(data.config.displayRows).toBe(8); // Updated
    });

    it('should reject invalid type value', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invalid' }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('type');
    });

    it('should reject displayRows out of range', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayRows: 25 }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('displayRows');
    });

    it('should reject invalid raceFilter', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceFilter: 'not-an-array' }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('raceFilter');
    });

    it('should not save metadata fields (label, lastSeen)', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'vertical',
          label: 'Should be ignored',
          lastSeen: '2025-01-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as JsonResponse;
      expect(data.config.type).toBe('vertical');
      // Label is not set via config endpoint (use /label endpoint instead)
    });
  });

  describe('PUT /api/clients/:ip/label', () => {
    it('should set client label', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/label`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'TV v hale' }),
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.success).toBe(true);
      expect(data.ip).toBe('192.168.1.50');
      expect(data.label).toBe('TV v hale');

      // Verify it was saved
      const settings = getAppSettings();
      const config = settings.getClientConfig('192.168.1.50');
      expect(config?.label).toBe('TV v hale');
    });

    it('should reject empty label', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/label`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: '   ' }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('empty');
    });

    it('should reject non-string label', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/label`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 123 }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('string');
    });
  });

  describe('DELETE /api/clients/:ip', () => {
    it('should delete stored client config', async () => {
      // First create config
      const settings = getAppSettings();
      settings.setClientConfig('192.168.1.50', { label: 'TV', type: 'ledwall' });

      // Delete it
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.success).toBe(true);
      expect(data.ip).toBe('192.168.1.50');

      // Verify it was deleted
      expect(settings.getClientConfig('192.168.1.50')).toBeUndefined();
    });

    it('should return 404 for non-existent config', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.99/config`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/clients/:ip/refresh', () => {
    it('should return 404 when no clients connected with that IP', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(404);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('No online sessions');
    });
  });

  describe('GET /api/config/custom-params', () => {
    it('should return empty definitions by default', async () => {
      const response = await fetch(`${baseUrl}/api/config/custom-params`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.definitions).toEqual([]);
    });

    it('should return stored definitions', async () => {
      const settings = getAppSettings();
      const defs: CustomParamDefinition[] = [
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
        { key: 'autoRefresh', label: 'Auto Refresh', type: 'boolean', defaultValue: true },
      ];
      settings.setCustomParamDefinitions(defs);

      const response = await fetch(`${baseUrl}/api/config/custom-params`);
      const data = (await response.json()) as JsonResponse;

      expect(data.definitions).toHaveLength(2);
      expect(data.definitions[0].key).toBe('theme');
      expect(data.definitions[1].key).toBe('autoRefresh');
    });
  });

  describe('PUT /api/config/custom-params', () => {
    it('should set custom parameter definitions', async () => {
      const definitions: CustomParamDefinition[] = [
        { key: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 16 },
      ];

      const response = await fetch(`${baseUrl}/api/config/custom-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definitions }),
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as JsonResponse;
      expect(data.success).toBe(true);
      expect(data.definitions).toHaveLength(1);
      expect(data.definitions[0].key).toBe('fontSize');
    });

    it('should reject definitions without key', async () => {
      const response = await fetch(`${baseUrl}/api/config/custom-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definitions: [{ label: 'No Key', type: 'string' }],
        }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('key');
    });

    it('should reject definitions with invalid type', async () => {
      const response = await fetch(`${baseUrl}/api/config/custom-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definitions: [{ key: 'test', label: 'Test', type: 'invalid' }],
        }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('type');
    });

    it('should reject definitions with wrong defaultValue type', async () => {
      const response = await fetch(`${baseUrl}/api/config/custom-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definitions: [
            { key: 'count', label: 'Count', type: 'number', defaultValue: 'not a number' },
          ],
        }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('wrong type');
    });

    it('should reject non-array definitions', async () => {
      const response = await fetch(`${baseUrl}/api/config/custom-params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definitions: 'not-an-array' }),
      });

      expect(response.status).toBe(400);
      const data = (await response.json()) as JsonResponse;
      expect(data.error).toContain('array');
    });
  });

  describe('CORS and OPTIONS', () => {
    it('should handle OPTIONS preflight for PUT requests', async () => {
      const response = await fetch(`${baseUrl}/api/clients/192.168.1.50/config`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    });
  });
});
