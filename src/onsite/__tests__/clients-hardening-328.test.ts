/** #328 review: a malformed request target must not stop the process (`ws` slices the path at `?` and never parses it), and a bad clients.json is set aside like the other stores' files. */
import { afterEach, describe, expect, it } from 'vitest';
import net from 'node:net';
import { boot, disposeAll, fakeOnsiteFs, get, DATA_DIR, type J } from './onsite-harness.js';
import { ODP } from './datasets.js';

afterEach(disposeAll);

const raw = (port: number, target: string): Promise<string> => new Promise((res) => {
  const s = net.connect(port, '127.0.0.1', () => {
    s.write(`GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n`);
  });
  let out = '';
  s.on('data', (d) => { out += d.toString(); });
  s.on('error', () => { res(out); });
  s.on('close', () => { res(out); });
  setTimeout(() => { s.destroy(); }, 2000);
});

describe('#328 review: upgrade routing and the clients file', () => {
  it('a malformed absolute-form request target on an upgrade gets a 400 or a closed socket and the process keeps answering', async () => {
    const env = await boot({ startAt: ODP.startAt });
    for (const path of ['/ws', '/ws/client']) {
      const reply = await raw(env.h.port, `http://[x${path}`);
      expect(reply === '' || reply.startsWith('HTTP/1.1 400')).toBe(true);
    }
    expect((await get(env, '/api/clients')).status).toBe(200);
    expect((await get(env, '/api/sources')).status).toBe(200);
  });

  it('a clients.json that is not a version 1 file is set aside under a name that never overwrites, reported as store-set-aside, and the registry starts empty', async () => {
    const file = `${DATA_DIR}/clients.json`;
    const entries: J[] = [];
    const fs = fakeOnsiteFs({ [file]: 'not json' });
    const env = await boot({ startAt: ODP.startAt, fs, adminLog: (e) => { entries.push(e as unknown as J); } });
    expect(entries).toMatchObject([{ kind: 'store-set-aside', store: 'clients', file }]);
    const aside = (entries[0] as J)['setAsideAs'] as string;
    expect(aside).toMatch(/clients\.json\.invalid-/);
    expect(fs.files.get(aside)).toBe('not json');
    expect(((await get(env, '/api/clients')).body as J)['clients']).toEqual([]);
  });

  it('a read error other than a missing file does not rename the file', async () => {
    const file = `${DATA_DIR}/clients.json`;
    const fs = fakeOnsiteFs({ [file]: '{"version":1,"clients":{}}' });
    const read = fs.fs.readFile.bind(fs.fs);
    fs.fs.readFile = async (p: string): Promise<string> => {
      if (p === file) throw Object.assign(new Error('denied'), { code: 'EACCES' });
      return read(p);
    };
    await expect(boot({ startAt: ODP.startAt, fs })).rejects.toThrow('denied');
    expect(fs.files.has(file)).toBe(true);
  });
});
