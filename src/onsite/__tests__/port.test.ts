/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 row 13 (tier 1): one port and discovery (CONSTRAINTS §1.3; ADR-011). A client finds the server the way the legacy server lets it:
 * GET /api/discover (src/unified/UnifiedServer.ts, docs/REST-API.md "Discovery API"): { service: 'c123-server', version, port, eventName }
 * with CORS open, probed by subnet scan. The legacy UDP rules (src/server.ts startUdpDiscovery, handleTcpDisconnect): discovery runs only
 * when no TCP host is configured; the first discovery builds the TCP source; the same host again changes nothing; another host replaces the
 * source; a TCP disconnect resets discovery.
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { api, boot, disposeAll, fakeDiscovery, fakeTcp, flush, get, openWs, type J } from './onsite-harness.js';
import { DEFAULT_PORT } from '../index.js';
import { ODP, feed } from './datasets.js';

afterEach(disposeAll);

describe('row 13: one port, discovery (CONSTRAINTS §1.3)', () => {
  it('CONSTRAINTS §1.3: the default port is 27123', () => {
    expect(DEFAULT_PORT).toBe(27123);
  });

  it('CONSTRAINTS §1.3: HTTP (REST), the admin page and /ws all answer on the one configured port', async () => {
    const env = await boot({ startAt: ODP.startAt });
    const rest = await get(env, '/api/sources');
    expect(rest.status).toBe(200);
    const page = await get(env, '/');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(String(page.body)).toContain('<!DOCTYPE html>');
    const ws = await openWs(env);
    await ws.barrier();
    const raw = new WebSocket(`ws://127.0.0.1:${env.h.port}/ws`);
    await new Promise<void>((res, rej) => { raw.once('open', () => { res(); }); raw.once('error', rej); });
    raw.terminate();
  });

  it('legacy GET /api/discover: { service: "c123-server", version, port = the bound port, eventName } with CORS open; eventName is the configured name, null when none', async () => {
    const env = await boot({ startAt: ODP.startAt });
    const r = await get(env, '/api/discover');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['eventName', 'port', 'service', 'version']);
    expect(r.body).toMatchObject({ service: 'c123-server', port: env.h.port, eventName: 'Test Event' });
    expect(typeof r.body.version).toBe('string');
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    const bare = await boot({ startAt: ODP.startAt, eventId: undefined, eventName: undefined });
    expect((await get(bare, '/api/discover')).body.eventName).toBeNull();
  });

  it('legacy discovery: with no TCP host configured the UDP listener is started; the first discovered host builds the TCP source on Canoe123\'s port 27333', async () => {
    const discovery = fakeDiscovery();
    const built: Array<[string, number]> = [];
    const made = fakeTcp();
    await boot({ startAt: ODP.startAt, tcp: { create: (h, p) => { built.push([h, p]); return made; } }, discovery, connected: false });
    expect(discovery.started).toBe(1);
    discovery.emit('discovered', '10.1.2.3');
    await flush();
    expect(built).toEqual([['10.1.2.3', 27333]]);
    expect(made.started).toBe(1);
  });

  it('legacy discovery: a configured TCP host means no discovery is started', async () => {
    const discovery = fakeDiscovery();
    const made = fakeTcp();
    await boot({ startAt: ODP.startAt, tcp: { host: '10.9.9.9', create: () => made }, discovery, connected: false });
    expect(discovery.started).toBe(0);
    expect(made.started).toBe(1);
  });

  it('legacy discovery: the same host again changes nothing; a different host stops the old source and builds a new one; a TCP disconnect resets discovery', async () => {
    const discovery = fakeDiscovery();
    const sources: Array<{ host: string; src: ReturnType<typeof fakeTcp> }> = [];
    await boot({ startAt: ODP.startAt, tcp: { create: (host) => { const src = fakeTcp(); sources.push({ host, src }); return src; } }, discovery, connected: false });
    discovery.emit('discovered', '10.1.2.3');
    await flush();
    discovery.emit('discovered', '10.1.2.3');
    await flush();
    expect(sources.map((s) => s.host)).toEqual(['10.1.2.3']);
    discovery.emit('discovered', '10.1.2.4');
    await flush();
    expect(sources.map((s) => s.host)).toEqual(['10.1.2.3', '10.1.2.4']);
    expect(sources[0]!.src.stopped).toBeGreaterThan(0);
    const resets = discovery.resets;
    sources[1]!.src.connect();
    sources[1]!.src.disconnect();
    await flush();
    expect(discovery.resets).toBe(resets + 1);
  });

  it('ADR-011: the UDP payload is used for the TCP host only, never parsed into state: a broadcast OnCourse message creates no Attempt, no message and no seq', async () => {
    const discovery = fakeDiscovery();
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, tcp: { create: () => fakeTcp() }, discovery, connected: false });
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const before = (await get(env, '/api/diagnostics')).body.asOfSeq;
    const listing = ODP.listings(['1'], [41], [61])[0]!.rec.data;
    discovery.emit('message', listing, '10.1.2.3');
    await flush();
    await ws.barrier();
    expect(ws.take().filter((m: J) => m.type === 'attempt.updated' || m.type === 'oncourse.updated')).toEqual([]);
    expect((await get(env, '/api/oncourse')).body.attempts).toEqual([]);
    expect((await get(env, '/api/classes/C1M/phases')).status).toBe(404);
    expect((await get(env, '/api/diagnostics')).body.asOfSeq).toBe(before);
    void api; void feed;
  });
});
