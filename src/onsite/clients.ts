/**
 * #328, RULINGS R-26, ARCHITECTURE §8: client configuration of the on-site process. It is outside the contract: its own WebSocket path
 * `/ws/client` (ConfigPush, ClientState, ForceRefresh in the legacy server's shapes) and `/api/clients`, so the admin UI reuses today's editor.
 * `/ws` carries CONTRACTS §7 messages only.
 *
 * A record is keyed by the `clientId` the client connects with, else by its IP (`::1` and `::ffff:a.b.c.d` count as IPv4). A config PUT that
 * names a new `clientId` moves the record to that key and the connected sessions with it. Records are one file in the data dir, written
 * atomically (temp file, rename) when a record changes; ClientState stays in memory.
 */
import { Router, type Request, type Response } from 'express';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ChecksFs } from '../store/checks.js';

type J = Record<string, unknown>;
type AssetKey = 'logoUrl' | 'partnerLogoUrl' | 'footerImageUrl';
const ASSET_KEYS: readonly AssetKey[] = ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'];
/** The record: every field the scoreboard knows, plus the server-managed `label`, `lastSeen` and the `clientId` it adopts. */
interface Record_ extends J {
  type?: 'vertical' | 'ledwall'; displayRows?: number; customTitle?: string; raceFilter?: string[]; showOnCourse?: boolean; showResults?: boolean;
  scrollToFinished?: boolean; browseAfterHighlight?: boolean; custom?: Record<string, string | number | boolean>;
  label?: string; lastSeen?: string; clientId?: string; assets?: Partial<Record<AssetKey, string | null>>;
}
/** What ConfigPush carries: every record field but `lastSeen`. */
const PUSHED = ['type', 'displayRows', 'customTitle', 'raceFilter', 'showOnCourse', 'showResults', 'scrollToFinished', 'browseAfterHighlight', 'custom', 'label', 'clientId'] as const;

export const normalizeIp = (addr: string): string => {
  if (addr === '::1') return '127.0.0.1';
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(addr);
  return mapped !== null ? mapped[1]! : addr;
};
const looksLikeClientId = (key: string): boolean => !/^(\d{1,3}\.){3}\d{1,3}$/.test(key) && !key.includes(':');

interface Session { id: string; ws: WebSocket; key: string; ip: string; explicit: boolean; state: J | null }

export interface ClientRegistry {
  /** `/api/clients*` and `/api/broadcast/refresh`, to mount under `/api`'s parent app. */
  routes: Router;
  /** Completes the upgrade of a `/ws/client` request. */
  upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  close(): void;
}

export async function openClients(opts: { fs: ChecksFs; dir: string; now: () => number; log?: (what: string, e: unknown) => void; setAside: (file: string, reason: string) => Promise<void> }): Promise<ClientRegistry> {
  const { fs, dir, now } = opts;
  const log = opts.log ?? ((): void => undefined);
  const base = dir.endsWith('/') || dir.endsWith('\\') ? dir : `${dir}/`;
  const target = `${base}clients.json`;
  const tmp = `${target}.tmp`;
  await fs.mkdir(dir);
  const records = new Map<string, Record_>();
  let text: string | undefined;
  try { text = await fs.readFile(target); } catch (e) {
    if ((e as { code?: string }).code !== 'ENOENT') throw e;
  }
  if (text !== undefined) {
    try {
      const raw = JSON.parse(text) as { version?: unknown; clients?: unknown };
      if (raw === null || typeof raw !== 'object' || raw.version !== 1 || typeof raw.clients !== 'object' || raw.clients === null) throw new Error('not a version 1 clients file');
      for (const [k, v] of Object.entries(raw.clients)) records.set(k, v as Record_);
    } catch (e) {
      // not parseable or not the right shape: set aside and start empty; the operator sets the clients up again
      await opts.setAside(target, e instanceof Error ? e.message : String(e));
    }
  }

  let tail: Promise<unknown> = Promise.resolve();
  /** One write at a time, each of the whole current state. */
  const persist = (): Promise<void> => {
    const run = tail.then(async () => {
      await fs.writeFile(tmp, JSON.stringify({ version: 1, clients: Object.fromEntries(records) }));
      await fs.rename(tmp, target);
    });
    tail = run.catch(() => undefined);
    return run;
  };

  const sessions = new Set<Session>();
  let counter = 0;
  const wss = new WebSocketServer({ noServer: true });
  const online = (key: string): Session[] => [...sessions].filter((s) => s.key === key && s.ws.readyState === s.ws.OPEN);

  const configOf = (rec: Record_ | undefined, clearedAssets?: readonly AssetKey[]): J => {
    const out: J = {};
    if (rec === undefined) return out;
    for (const k of PUSHED) if (rec[k] != null) out[k] = k === 'raceFilter' ? [...(rec.raceFilter as string[])] : k === 'custom' ? { ...rec.custom } : rec[k];
    const assets: Record<string, string | null> = { ...(rec.assets as Record<string, string>) };
    for (const k of clearedAssets ?? []) if (!assets[k]) assets[k] = null;
    if (Object.keys(assets).length > 0) out['assets'] = assets;
    return out;
  };
  const push = (s: Session, clearedAssets?: readonly AssetKey[]): void => {
    const data = configOf(records.get(s.key), clearedAssets);
    if (Object.keys(data).length > 0) s.ws.send(JSON.stringify({ type: 'ConfigPush', timestamp: new Date(now()).toISOString(), data }));
  };
  const refresh = (list: Session[], reason?: string): void => {
    const json = JSON.stringify({ type: 'ForceRefresh', timestamp: new Date(now()).toISOString(), data: reason !== undefined ? { reason } : {} });
    for (const s of list) s.ws.send(json);
  };

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const explicit = new URLSearchParams((req.url ?? '/').split('?')[1] ?? '').get('clientId') || undefined;
    const ip = normalizeIp(req.socket.remoteAddress ?? 'unknown');
    const s: Session = { id: `client-${++counter}`, ws, key: explicit ?? ip, ip, explicit: explicit !== undefined, state: null };
    sessions.add(s);
    ws.on('close', () => { sessions.delete(s); });
    ws.on('error', () => { sessions.delete(s); });
    ws.on('message', (d) => {
      try {
        const m = JSON.parse(d.toString()) as { type?: unknown; data?: { current?: J; version?: string; capabilities?: string[] } };
        if (m.type === 'ClientState' && m.data) s.state = { current: m.data.current ?? {}, version: m.data.version, capabilities: m.data.capabilities };
      } catch { /* a client may send what it likes */ }
    });
    records.set(s.key, { ...records.get(s.key), lastSeen: new Date(now()).toISOString() });
    persist().catch((e) => { log('clients file write failed', e); }).then(() => { if (sessions.has(s)) push(s); });
  });

  // ---- merge of a PUT body into a record: custom and assets merge key by key, a null asset clears it
  const merge = (existing: Record_ | undefined, patch: Record_): Record_ => {
    const merged: Record_ = { ...existing, ...patch };
    if (patch.custom !== undefined) merged.custom = { ...existing?.custom, ...patch.custom };
    if (patch.assets !== undefined) {
      const assets = { ...existing?.assets, ...patch.assets };
      for (const k of ASSET_KEYS) if (assets[k] === null) delete assets[k];
      if (Object.keys(assets).length === 0) delete merged.assets; else merged.assets = assets;
    }
    return merged;
  };

  const info = (key: string): J => {
    const rec = records.get(key);
    const live = online(key);
    const first = live[0];
    return {
      ip: key, configKey: key, hasExplicitId: first?.explicit ?? looksLikeClientId(key), label: rec?.label ?? null,
      online: live.length > 0, sessionId: first?.id ?? null, sessionCount: live.length, ipAddress: first?.ip ?? null,
      serverConfig: rec === undefined ? null : {
        type: rec.type, displayRows: rec.displayRows, customTitle: rec.customTitle, raceFilter: rec.raceFilter, showOnCourse: rec.showOnCourse,
        showResults: rec.showResults, scrollToFinished: rec.scrollToFinished, browseAfterHighlight: rec.browseAfterHighlight, custom: rec.custom,
        clientId: rec.clientId, assets: rec.assets,
      },
      clientState: first?.state ?? null,
      lastSeen: rec?.lastSeen ?? null,
    };
  };

  const router = Router();
  const keyOf = (req: Request, res: Response): string | undefined => {
    const raw = String(req.params['ip'] ?? '').trim();
    if (raw === '' || raw === 'undefined') { res.status(400).json({ error: 'IP address is required' }); return undefined; }
    return normalizeIp(raw);
  };
  const failed = (res: Response, e: unknown): void => { log('clients file write failed', e); res.status(500).json({ error: 'could not store the client configuration' }); };

  router.get('/clients', (_req, res) => {
    const keys = new Set<string>([...records.keys(), ...[...sessions].map((s) => s.key)]);
    const list = [...keys].map(info).sort((a, b) => (a['online'] !== b['online'] ? (a['online'] ? -1 : 1) : String(a['ip']).localeCompare(String(b['ip']))));
    res.json({ clients: list });
  });

  router.put('/clients/:ip/config', async (req, res) => {
    const key = keyOf(req, res);
    if (key === undefined) return;
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record_;
    const bad = (error: string): void => { res.status(400).json({ error }); };
    if (body.type !== undefined && body.type !== 'vertical' && body.type !== 'ledwall') return bad('type must be "vertical" or "ledwall"');
    if (body.displayRows !== undefined) {
      const rows = Number(body.displayRows);
      if (isNaN(rows) || rows < 3 || rows > 20) return bad('displayRows must be a number between 3 and 20');
      body.displayRows = rows;
    }
    if (body.raceFilter !== undefined && !Array.isArray(body.raceFilter)) return bad('raceFilter must be an array');
    for (const f of ['showOnCourse', 'showResults', 'scrollToFinished', 'browseAfterHighlight'] as const) {
      if (body[f] !== undefined && typeof body[f] !== 'boolean') return bad(`${f} must be a boolean`);
    }
    if (body.clientId !== undefined) {
      if (typeof body.clientId !== 'string' || body.clientId.trim() === '') return bad('clientId must be a non-empty string');
      body.clientId = body.clientId.trim();
    }
    // `label` and `lastSeen` are server-managed
    const patch: Record_ = { ...body };
    delete patch.label;
    delete patch.lastSeen;
    const cleared = ASSET_KEYS.filter((k) => (patch.assets as Record<string, unknown> | undefined)?.[k] === null);
    const saved = merge(records.get(key), patch);
    // a new clientId moves the record, and the sessions that were on the old key, to the new one
    const newKey = patch.clientId !== undefined && patch.clientId !== key ? patch.clientId : key;
    const targets = online(key);
    const previous = records.get(key);
    if (newKey !== key) records.delete(key);
    records.set(newKey, newKey === key ? saved : { ...records.get(newKey), ...saved });
    for (const s of targets) { s.key = newKey; if (newKey !== key) s.explicit = true; }
    try { await persist(); } catch (e) {
      if (newKey !== key) { records.delete(newKey); if (previous !== undefined) records.set(key, previous); for (const s of targets) s.key = key; } else if (previous !== undefined) records.set(key, previous); else records.delete(key);
      failed(res, e);
      return;
    }
    for (const s of targets) push(s, cleared.length > 0 ? cleared : undefined);
    res.json({ success: true, ip: newKey, config: records.get(newKey), pushedToSessions: targets.length });
  });

  router.put('/clients/:ip/label', async (req, res) => {
    const key = keyOf(req, res);
    if (key === undefined) return;
    const label = (req.body as { label?: unknown } | undefined)?.label;
    if (typeof label !== 'string') { res.status(400).json({ error: 'label must be a string' }); return; }
    const trimmed = label.trim();
    if (trimmed.length === 0) { res.status(400).json({ error: 'label cannot be empty' }); return; }
    const previous = records.get(key);
    records.set(key, { ...previous, label: trimmed });
    try { await persist(); } catch (e) {
      if (previous !== undefined) records.set(key, previous); else records.delete(key);
      failed(res, e);
      return;
    }
    res.json({ success: true, ip: key, label: trimmed });
  });

  router.delete('/clients/:ip', async (req, res) => {
    const key = keyOf(req, res);
    if (key === undefined) return;
    const previous = records.get(key);
    if (previous === undefined) { res.status(404).json({ error: 'Client configuration not found' }); return; }
    records.delete(key);
    try { await persist(); } catch (e) { records.set(key, previous); failed(res, e); return; }
    res.json({ success: true, ip: key, message: 'Client configuration deleted' });
  });

  router.post('/clients/:ip/refresh', (req, res) => {
    const key = keyOf(req, res);
    if (key === undefined) return;
    const reason = (req.body as { reason?: unknown } | undefined)?.reason;
    if (reason !== undefined && typeof reason !== 'string') { res.status(400).json({ error: 'reason must be a string' }); return; }
    const live = online(key);
    if (live.length === 0) { res.status(404).json({ error: 'No online sessions found for this IP' }); return; }
    refresh(live, reason);
    res.json({ success: true, ip: key, sessionsRefreshed: live.length, reason: reason || null });
  });

  router.post('/broadcast/refresh', (req, res) => {
    const reason = (req.body as { reason?: unknown } | undefined)?.reason;
    if (reason !== undefined && typeof reason !== 'string') { res.status(400).json({ error: 'reason must be a string' }); return; }
    const live = [...sessions].filter((s) => s.ws.readyState === s.ws.OPEN);
    refresh(live, reason);
    res.json({ success: true, clientsNotified: live.length, reason: reason || null });
  });

  return {
    routes: router,
    upgrade: (req, socket, head) => { wss.handleUpgrade(req, socket, head, (ws) => { wss.emit('connection', ws, req); }); },
    close: () => { for (const s of sessions) s.ws.terminate(); sessions.clear(); wss.close(); },
  };
}
