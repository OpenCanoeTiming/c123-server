/**
 * The HTTP side of the on-site process (CONTRACTS §7.1, §1.4; CONSTRAINTS §1.3): hydration reads, the re-baseline, the discovery endpoint
 * the legacy server answers, and the admin page, all on the one port. Every handler reads the state in one synchronous step, so a body
 * and its `asOfSeq` come from the same instant.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MergeCore } from '../core/index.js';
import { classWhole, courseWhole, onsiteEntry, onsiteEvent, phaseOfAttempt, type CurrentEvent, type J } from './wire.js';

const ADMIN_UI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'admin-ui');
/** The wire-protocol version the legacy `/api/discover` reports; clients that probe for the server know it. */
const DISCOVER_VERSION = '2.0.0';

export type RebaselineScope = { kind: 'phase'; phaseId: string } | { kind: 'event' };
export type RebaselineOutcome =
  | { ok: true; body: J }
  | { ok: false; status: 404; code: 'phase-not-found' }
  | { ok: false; status: 409; code: 'source-unavailable'; reason: 'not-configured' | 'unreadable' | 'invalid' };

export interface OnsiteApi {
  port(): number;
  asOfSeq(): number;
  event(): CurrentEvent | undefined;
  core(): MergeCore;
  sources(): J;
  checksOf(phaseId: string): { checks: J[]; flags: J[] };
  rebaseline(scope: RebaselineScope): Promise<RebaselineOutcome>;
  /** §7.3, §7.4: the write routes. Each answers with the status, body and `Location` the contract names; a refusal carries the error envelope. */
  penalty(a: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply>;
  writeOf(writeId: string): J | undefined;
  putCheck(a: AttemptRoute, gate: string, body: unknown): Promise<RestReply>;
  deleteCheck(a: AttemptRoute, gate: string): Promise<RestReply>;
  createFlag(a: AttemptRoute, key: string | undefined, body: unknown): Promise<RestReply>;
  resolveFlag(flagId: string, body: unknown): Promise<RestReply>;
}
export interface AttemptRoute { phaseId: string; bib: string }
export interface RestReply { status: number; body?: J; location?: string }

export const errorBody = (code: string, message: string, details?: unknown): J => ({ error: { code, message, ...(details !== undefined ? { details } : {}) } });

export function createApp(api: OnsiteApi): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next();
  });
  app.options('{*path}', (_req, res) => { res.sendStatus(204); });

  app.get('/api/discover', (_req, res) => {
    res.json({ service: 'c123-server', version: DISCOVER_VERSION, port: api.port(), eventName: api.event()?.name ?? null });
  });

  app.get('/api/events/current', (_req, res) => {
    const event = api.event();
    if (event === undefined) { res.status(404).json(errorBody('event-not-found', 'no event is configured')); return; }
    const core = api.core();
    res.json({
      asOfSeq: api.asOfSeq(), event: onsiteEvent(event),
      classes: core.classIds().map((id) => classWhole(core.class(id), event.eventId)),
      courses: core.courseIds().map((id) => courseWhole(core.course(id), event.eventId)),
      // §7.1 (round 27b): observed Phases whose class is not yet stated, created by no message yet; their Attempts are fetched as for a listed Phase
      pendingPhaseIds: core.phaseIds().filter((p) => core.phase(p)['classId'] === undefined),
    });
  });

  const classOr404 = (req: Request, res: Response): string | undefined => {
    const id = String(req.params['classId']);
    if (api.core().classIds().includes(id)) return id;
    res.status(404).json(errorBody('class-not-found', `no Class ${id} in this event`));
    return undefined;
  };
  const phaseOr404 = (req: Request, res: Response): string | undefined => {
    const id = String(req.params['phaseId']);
    if (api.core().phaseIds().includes(id)) return id;
    res.status(404).json(errorBody('phase-not-found', `no Phase ${id} in this event`));
    return undefined;
  };

  app.get('/api/classes/:classId/phases', (req, res) => {
    const id = classOr404(req, res);
    if (id === undefined) return;
    const core = api.core();
    res.json({ asOfSeq: api.asOfSeq(), phases: core.phaseIds().map((p) => core.phase(p)).filter((p) => p['classId'] === id) });
  });
  app.get('/api/classes/:classId/entries', (req, res) => {
    const id = classOr404(req, res);
    if (id === undefined) return;
    const core = api.core();
    res.json({ asOfSeq: api.asOfSeq(), entries: core.entryIds().map((e) => core.entry(e)).filter((e) => e['classId'] === id).map(onsiteEntry) });
  });
  app.get('/api/classes/:classId/standings', (req, res) => {
    const id = classOr404(req, res);
    if (id === undefined) return;
    res.json({ asOfSeq: api.asOfSeq(), standings: api.core().standings().filter((s) => s.classId === id) });
  });
  app.get('/api/phases/:phaseId/attempts', (req, res) => {
    const id = phaseOr404(req, res);
    if (id === undefined) return;
    const core = api.core();
    res.json({ asOfSeq: api.asOfSeq(), attempts: core.attempts().filter((a) => phaseOfAttempt(a) === id).map((a) => core.presented(a)) });
  });
  app.get('/api/phases/:phaseId/checks', (req, res) => {
    const id = phaseOr404(req, res);
    if (id === undefined) return;
    res.json({ asOfSeq: api.asOfSeq(), ...api.checksOf(id) });
  });
  app.get('/api/oncourse', (_req, res) => {
    const core = api.core();
    const on = core.oncourse();
    res.json({ asOfSeq: api.asOfSeq(), attempts: on.attemptIds.map((a) => core.presented(a)), featuredByUpstream: on.featuredByUpstream, asOf: on.asOf });
  });
  app.get('/api/sources', (_req, res) => { res.json(api.sources()); });
  app.get('/api/diagnostics', (_req, res) => { res.json({ asOfSeq: api.asOfSeq(), diagnostics: api.core().diagnostics() }); });

  app.post('/api/rebaseline', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scope = scopeOf(req.body, (details) => { res.status(400).json(errorBody('validation-failed', 'malformed re-baseline request', details)); });
      if (scope === undefined) return;
      const r = await api.rebaseline(scope);
      if (r.ok) res.json(r.body);
      else if (r.status === 404) res.status(404).json(errorBody(r.code, `no Phase ${(scope as { phaseId?: string }).phaseId ?? ''} in this event`));
      else res.status(409).json(errorBody(r.code, `the XML snapshot is ${r.reason}`, { reason: r.reason }));
    } catch (e) { next(e); }
  });

  // ---- §7.3, §7.4: writes, checks and flags
  const send = (res: Response, r: RestReply): void => {
    if (r.location !== undefined) res.header('Location', r.location);
    if (r.body === undefined) res.status(r.status).end();
    else res.status(r.status).json(r.body);
  };
  const route = (req: Request): AttemptRoute => ({ phaseId: String(req.params['phaseId']), bib: String(req.params['bib']) });
  const keyOf = (req: Request): string | undefined => { const k = req.get('Idempotency-Key'); return k === undefined || k.trim() === '' ? undefined : k; };
  const handle = (fn: (req: Request) => Promise<RestReply>) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { send(res, await fn(req)); } catch (e) { next(e); }
  };
  app.post('/api/attempts/:phaseId/:bib/penalty', handle((req) => api.penalty(route(req), keyOf(req), req.body)));
  app.get('/api/writes/:writeId', (req, res) => {
    const w = api.writeOf(String(req.params['writeId']));
    if (w === undefined) res.status(404).json(errorBody('write-not-found', `no write ${String(req.params['writeId'])}`));
    else res.json(w);
  });
  app.put('/api/attempts/:phaseId/:bib/checks/:gate', handle((req) => api.putCheck(route(req), String(req.params['gate']), req.body)));
  app.delete('/api/attempts/:phaseId/:bib/checks/:gate', handle((req) => api.deleteCheck(route(req), String(req.params['gate']))));
  app.post('/api/attempts/:phaseId/:bib/flags', handle((req) => api.createFlag(route(req), keyOf(req), req.body)));
  app.post('/api/flags/:flagId/resolution', handle((req) => api.resolveFlag(String(req.params['flagId']), req.body)));

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/admin-ui', express.static(ADMIN_UI_DIR));
  // `root`, not an absolute path: send() ignores dotfiles on every segment of an absolute one, and an install may sit below a dot-directory
  app.get('/', (_req, res) => { res.sendFile('index.html', { root: ADMIN_UI_DIR }); });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const type = (err as { type?: string }).type;
    if (type === 'entity.parse.failed' || type === 'entity.too.large') res.status(400).json(errorBody('validation-failed', 'the body is not valid JSON', [{ field: 'body', issue: 'not valid JSON' }]));
    else res.status(500).json(errorBody('internal-error', 'unexpected error'));
  });
  return app;
}

/** `RebaselineRequest` (§7.1): reports what is wrong, one `{field, issue}` per refused field, and returns undefined. */
function scopeOf(body: unknown, refuse: (details: { field: string; issue: string }[]) => void): RebaselineScope | undefined {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) { refuse([{ field: 'body', issue: 'must be an object' }]); return undefined; }
  const scope = (body as { scope?: unknown }).scope;
  if (typeof scope !== 'object' || scope === null || Array.isArray(scope)) { refuse([{ field: 'scope', issue: 'must be an object' }]); return undefined; }
  const { kind, phaseId } = scope as { kind?: unknown; phaseId?: unknown };
  if (kind === 'event') return { kind: 'event' };
  if (kind === 'phase') {
    if (typeof phaseId === 'string' && phaseId !== '') return { kind: 'phase', phaseId };
    refuse([{ field: 'scope.phaseId', issue: 'must be a non-empty string' }]);
    return undefined;
  }
  refuse([{ field: 'scope.kind', issue: "must be 'phase' or 'event'" }]);
  return undefined;
}
