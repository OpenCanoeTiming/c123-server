/**
 * #328, RULINGS R-26, ARCHITECTURE §8: client configuration lives on the on-site process's own socket `/ws/client` and `/api/clients`, outside the
 * contract; `/ws` stays CONTRACTS §7 only. Message shapes and routes are today's legacy ones (src/unified/UnifiedServer.ts). The regression tests
 * are the three defects confirmed in the issue's state review: a rename leaves the record behind, `browseAfterHighlight` is never pushed or listed,
 * `::1` is a different key from `127.0.0.1`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { boot, del, disposeAll, get, openWs, post, put, type Env, type J } from './onsite-harness.js';
import { ODP } from './datasets.js';

afterEach(disposeAll);

interface Cli { messages: J[]; until(pred: (m: J) => boolean): Promise<J>; barrier(): Promise<void>; send(m: J): void; close(): void }
async function openClient(env: Env, clientId?: string): Promise<Cli> {
  const ws = new WebSocket(`ws://127.0.0.1:${env.h.port}/ws/client${clientId !== undefined ? `?clientId=${encodeURIComponent(clientId)}` : ''}`);
  const messages: J[] = [];
  const waiters: Array<() => void> = [];
  ws.on('message', (d) => { messages.push(JSON.parse(d.toString())); for (const w of [...waiters]) w(); });
  await new Promise<void>((res, rej) => { ws.once('open', () => { res(); }); ws.once('error', rej); });
  const cli: Cli = {
    messages,
    until: (pred) => new Promise<J>((res, rej) => {
      const timer = setTimeout(() => { rej(new Error(`no matching message; got ${JSON.stringify(messages)}`)); }, 5000);
      const check = (): boolean => { const m = messages.find(pred); if (m === undefined) return false; clearTimeout(timer); res(m); return true; };
      if (!check()) { const w = (): void => { if (check()) waiters.splice(waiters.indexOf(w), 1); }; waiters.push(w); }
    }),
    barrier: () => new Promise<void>((res) => { ws.once('pong', () => { res(); }); ws.ping(); }),
    send: (m) => { ws.send(JSON.stringify(m)); },
    close: () => { ws.terminate(); },
  };
  env.clients.push({ messages, until: cli.until, barrier: cli.barrier, take: () => [], close: cli.close });
  return cli;
}
const isPush = (m: J): boolean => m['type'] === 'ConfigPush';
const rows = async (env: Env): Promise<J[]> => (await get(env, '/api/clients')).body.clients as J[];

describe('#328: /ws/client and /api/clients', () => {
  it('R-26: a ConfigPush is sent on connect when a record exists for the client, none when there is no record', async () => {
    const env = await boot({ startAt: ODP.startAt });
    expect((await put(env, '/api/clients/scoreboard-a/config', { type: 'ledwall', displayRows: 8 })).status).toBe(200);
    const known = await openClient(env, 'scoreboard-a');
    const push = await known.until(isPush);
    expect(push['data']).toMatchObject({ type: 'ledwall', displayRows: 8, clientId: undefined });
    const unknown = await openClient(env, 'scoreboard-b');
    await unknown.barrier();
    expect(unknown.messages.filter(isPush)).toEqual([]);
  });

  it('R-26: a change through PUT /api/clients/:key/config is pushed to the connected client; the record is kept for the next connect', async () => {
    const env = await boot({ startAt: ODP.startAt });
    const cli = await openClient(env, 'scoreboard-a');
    await cli.barrier();
    const r = await put(env, '/api/clients/scoreboard-a/config', { customTitle: 'Finals' });
    expect(r.body).toMatchObject({ success: true, ip: 'scoreboard-a', pushedToSessions: 1 });
    expect((await cli.until(isPush))['data']).toMatchObject({ customTitle: 'Finals' });
    expect((await put(env, '/api/clients/scoreboard-a/config', { type: 'sideways' })).status).toBe(400);
  });

  it('R-26: ClientState from the client is listed with the row; ForceRefresh goes to one client and to all', async () => {
    const env = await boot({ startAt: ODP.startAt });
    const a = await openClient(env, 'a');
    const b = await openClient(env, 'b');
    a.send({ type: 'ClientState', timestamp: 'x', data: { current: { type: 'vertical' }, version: '1.2.3' } });
    await a.barrier();
    const row = (await rows(env)).find((c) => c['configKey'] === 'a')!;
    expect(row).toMatchObject({ online: true, hasExplicitId: true, sessionCount: 1, clientState: { current: { type: 'vertical' }, version: '1.2.3' } });
    expect((await post(env, '/api/clients/a/refresh', { reason: 'new layout' })).body).toMatchObject({ success: true, sessionsRefreshed: 1, reason: 'new layout' });
    expect((await a.until((m) => m['type'] === 'ForceRefresh'))['data']).toEqual({ reason: 'new layout' });
    await b.barrier();
    expect(b.messages.filter((m) => m['type'] === 'ForceRefresh')).toEqual([]);
    expect((await post(env, '/api/clients/nobody/refresh', {})).status).toBe(404);
    await post(env, '/api/broadcast/refresh', {});
    await b.until((m) => m['type'] === 'ForceRefresh');
  });

  it('R-26: label and delete; a deleted record is gone from the list and from the next connect', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, '/api/clients/a/config', { displayRows: 6 });
    expect((await put(env, '/api/clients/a/label', { label: 'Finish line' })).body).toMatchObject({ success: true, label: 'Finish line' });
    expect(await rows(env)).toMatchObject([{ configKey: 'a', label: 'Finish line', online: false }]);
    expect((await del(env, '/api/clients/a')).body).toMatchObject({ success: true });
    expect(await rows(env)).toEqual([]);
    expect((await del(env, '/api/clients/a')).status).toBe(404);
  });

  it('#328 defect 1: PUT with a new clientId moves the record to the new key (no second row) and later edits reach the session', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, '/api/clients/127.0.0.1/config', { displayRows: 7 });
    const cli = await openClient(env);
    await cli.until(isPush);
    const r = await put(env, '/api/clients/127.0.0.1/config', { clientId: 'finish-line' });
    expect(r.body).toMatchObject({ success: true, ip: 'finish-line', pushedToSessions: 1 });
    expect(cli.messages.filter(isPush).at(-1)!['data']).toMatchObject({ clientId: 'finish-line', displayRows: 7 });
    const list = await rows(env);
    expect(list.map((c) => c['configKey'])).toEqual(['finish-line']);
    expect(list[0]).toMatchObject({ online: true, serverConfig: { displayRows: 7, clientId: 'finish-line' } });
    const before = cli.messages.filter(isPush).length;
    await put(env, '/api/clients/finish-line/config', { customTitle: 'After rename' });
    await cli.until((m) => isPush(m) && (m['data'] as J)['customTitle'] === 'After rename');
    expect(cli.messages.filter(isPush).length).toBe(before + 1);
    const again = await openClient(env, 'finish-line');
    expect((await again.until(isPush))['data']).toMatchObject({ displayRows: 7, customTitle: 'After rename' });
  });

  it('#328 defect 2: browseAfterHighlight and scrollToFinished are pushed and listed', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, '/api/clients/a/config', { scrollToFinished: false, browseAfterHighlight: true });
    const cli = await openClient(env, 'a');
    expect((await cli.until(isPush))['data']).toMatchObject({ scrollToFinished: false, browseAfterHighlight: true });
    expect((await rows(env))[0]!['serverConfig']).toMatchObject({ scrollToFinished: false, browseAfterHighlight: true });
    expect((await put(env, '/api/clients/a/config', { browseAfterHighlight: 'yes' })).status).toBe(400);
  });

  it('#328 defect 3 (#145): ::1 and ::ffff:a.b.c.d count as IPv4; a record set for ::1 is the 127.0.0.1 record', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, `/api/clients/${encodeURIComponent('::1')}/config`, { displayRows: 9 });
    await put(env, `/api/clients/${encodeURIComponent('::ffff:127.0.0.1')}/config`, { customTitle: 'T' });
    expect((await rows(env)).map((c) => c['configKey'])).toEqual(['127.0.0.1']);
    const cli = await openClient(env);
    expect((await cli.until(isPush))['data']).toMatchObject({ displayRows: 9, customTitle: 'T' });
  });

  it('R-26: the records survive a restart on the same data dir, written once per change (not per ClientState)', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, '/api/clients/a/config', { displayRows: 5 });
    const cli = await openClient(env, 'a');
    await cli.until(isPush);
    const writes = env.fs.files.get('/data/onsite/clients.json');
    expect(writes).toBeDefined();
    cli.send({ type: 'ClientState', timestamp: 'x', data: { current: {} } });
    await cli.barrier();
    cli.send({ type: 'ClientState', timestamp: 'x', data: { current: { type: 'vertical' } } });
    await cli.barrier();
    expect(env.fs.files.get('/data/onsite/clients.json')).toBe(writes);
    env.h.kill();
    const again = await boot({ startAt: ODP.startAt, fs: env.fs.afterKill() });
    expect(await rows(again)).toMatchObject([{ configKey: 'a', serverConfig: { displayRows: 5 } }]);
  });

  it('R-26: /ws still carries no ConfigPush and /ws/client does not carry §7 messages', async () => {
    const env = await boot({ startAt: ODP.startAt });
    await put(env, '/api/clients/127.0.0.1/config', { displayRows: 5 });
    const ws = await openWs(env);
    await ws.barrier();
    expect(ws.messages.filter(isPush)).toEqual([]);
    const cli = await openClient(env);
    await cli.until(isPush);
    expect(cli.messages.every((m) => m['type'] === 'ConfigPush')).toBe(true);
  });
});
