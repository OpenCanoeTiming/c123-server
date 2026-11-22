/**
 * HTTP and `/ws` of the on-site process (#397): the REST app, the client registry (`clients.ts`), the upgrade router and the `/ws` push
 * sockets on one port. Returns what closes them.
 */
import { createServer, type Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { openClients } from './clients.js';
import { createApp, type OnsiteApi } from './app.js';
import { onsiteEvent, phaseOfAttempt, type J } from './wire.js';
import { background, DEFAULT_PORT, emit, type OnsiteContext } from './context.js';
import { ofExisting, withStatus } from './event-state.js';
import { rebaseline } from './rebaseline.js';
import type { RestHandlers } from './rest.js';
import { sourcesNow } from './sources.js';

export async function startHttp(cx: OnsiteContext, rest: RestHandlers): Promise<() => void> {
  const { opts, fs, dataDir, clock } = cx;
  const api: OnsiteApi = {
    port: () => cx.port,
    asOfSeq: () => cx.seq.current(),
    event: () => cx.event,
    core: () => cx.core,
    sources: () => sourcesNow(cx),
    logTail: (limit) => opts.logFile?.tail(limit) ?? [],
    checksOf: (phaseId) => {
      const store = cx.store;
      if (store === undefined) return { checks: [], flags: [] };
      const mine = (id: string): boolean => phaseOfAttempt(id) === phaseId;
      return {
        checks: ofExisting(cx, withStatus(cx, store) as (J & { attemptId: string })[]).filter((c) => mine(c.attemptId)),
        flags: ofExisting(cx, store.list().flags).filter((f) => mine(f.attemptId)) as unknown as J[],
      };
    },
    rebaseline: (scope) => rebaseline(cx, scope),
    penalty: rest.penalty,
    writeOf: (id) => cx.wstore?.get(id),
    putCheck: rest.putCheck,
    deleteCheck: rest.deleteCheck,
    createFlag: rest.createFlag,
    resolveFlag: rest.resolveFlag,
  };
  const clientReg = await openClients({
    fs, dir: dataDir, now: () => clock.now(), log: cx.log,
    setAside: async (file, reason) => { const setAsideAs = await cx.setAsideName(file); await fs.rename(file, setAsideAs); cx.report('clients', file, setAsideAs, reason); },
  });
  const server: Server = createServer(createApp({ ...api, clientRoutes: clientReg.routes }));
  // two `ws` servers with a `path` each on one HTTP server abort each other's upgrades: the paths are routed here
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const path = (req.url ?? '/').split('?')[0];
    if (path === '/ws') wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); });
    else if (path === '/ws/client') clientReg.upgrade(req, socket, head);
    else { socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); socket.destroy(); }
  });
  wss.on('connection', (ws) => {
    cx.clients.add(ws);
    ws.on('close', () => { cx.clients.delete(ws); });
    ws.on('error', () => { cx.clients.delete(ws); });
    if (cx.event !== undefined) background(cx, async () => { if (cx.event !== undefined) await emit(cx, [{ type: 'event.changed', event: onsiteEvent(cx.event) }], ws); });
  });
  cx.port = 0;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port ?? DEFAULT_PORT, () => { server.off('error', reject); resolve(); });
  });
  cx.port = (server.address() as { port: number }).port;
  cx.toFile(`start port=${cx.port} dataDir=${dataDir}`);

  return (): void => {
    for (const c of cx.clients) c.terminate();
    cx.clients.clear();
    wss.close();
    clientReg.close();
    server.close();
    server.closeAllConnections();
  };
}
