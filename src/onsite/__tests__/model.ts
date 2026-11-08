/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The client side of CONTRACTS §1.6 and §7.2 as plain code with no dependency on the process under test: the model a client holds, the
 * application of every WebSocket message, hydration through REST, and the order-independent view tests compare. Shared by the T1 harness
 * and the T4 test (which folds a replay's deltas with the same rules).
 */
export type J = Record<string, any>;
export const flush = async (): Promise<void> => { for (let i = 0; i < 100; i++) await Promise.resolve(); };

// ---------------------------------------------------------------------------------------------------- HTTP

export interface Reply { status: number; body: any; headers: Headers }
export async function api(env: { h: { port: number } }, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Reply> {
  const res = await fetch(`http://127.0.0.1:${env.h.port}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed: any = text;
  try { parsed = JSON.parse(text); } catch { /* html or empty */ }
  return { status: res.status, body: parsed, headers: res.headers };
}
export const get = (env: { h: { port: number } }, path: string): Promise<Reply> => api(env, 'GET', path);

// ---------------------------------------------------------------------------------------------------- the client model (§1.6, §7.2)

export interface Model {
  event: J | null;
  classes: Map<string, J>; courses: Map<string, J>; phases: Map<string, J>; entries: Map<string, J>; attempts: Map<string, J>; standings: Map<string, J>;
  oncourse: { attemptIds: string[]; featuredByUpstream: string | null; asOf: string | null };
  diagnostics: J[];
  sources: J | null;
  checks: Map<string, J>; flags: Map<string, J>;
  /** Breaches of §7.2's creation rule seen while applying: an id key inside `fields`, a creating message that is not the whole resource. */
  creation: string[];
}
export const emptyModel = (): Model => ({
  event: null, classes: new Map(), courses: new Map(), phases: new Map(), entries: new Map(), attempts: new Map(), standings: new Map(),
  oncourse: { attemptIds: [], featuredByUpstream: null, asOf: null }, diagnostics: [], sources: null, checks: new Map(), flags: new Map(), creation: [],
});

/** The structural and Observed keys of a whole resource (CONTRACTS §2.3-§2.6): a creating message carries every one (§1.6, §7.2). */
export const WHOLE: Record<string, readonly string[]> = {
  attempt: ['phaseId', 'bib', 'entry', 'run', 'startOrder', 'scheduledStart', 'heat', 'startLane', 'status', 'outcome', 'gates', 'splits', 'faults', 'courseOrder', 'timeToBeat', 'placement', 'pairTotal', 'countingRun', 'underReview', 'qualified'],
  entry: ['classId', 'displayName', 'members', 'club', 'nation', 'ageCategoryId', 'eventBib', 'isTeam'],
  phase: ['classId', 'format', 'kind', 'scoringKind', 'pair', 'heats', 'stage', 'date', 'courseId', 'scheduledStart', 'programmeOrder', 'title', 'status'],
  class: ['code', 'name', 'discipline', 'ageCategories'],
};
const ID_KEY = { attempt: 'attemptId', entry: 'entryId', phase: 'phaseId', class: 'classId' } as const;
export const checkKey = (c: { attemptId: string; run: number; gate: number }): string => `${c.attemptId}|${c.run}|${c.gate}`;

function applyResource(m: Model, store: Map<string, J>, kind: keyof typeof ID_KEY, msg: J): void {
  const key = ID_KEY[kind];
  const id = msg[key] as string;
  const fields = msg['fields'] as J;
  const had = store.get(id);
  if (had === undefined) {
    if (key in fields) m.creation.push(`${msg['type']} ${id}: the creating message carries \`${key}\` inside fields`);
    const missing = WHOLE[kind]!.filter((k) => !(k in fields));
    if (missing.length > 0) m.creation.push(`${msg['type']} ${id}: the creating message lacks ${missing.join(',')}`);
    store.set(id, { [key]: id, ...fields });
  } else store.set(id, { ...had, ...fields });
}
const inScope = (scope: J, a: { phaseId: string }): boolean => scope['kind'] === 'event' || a.phaseId === scope['phaseId'];
const standingNames = (st: J, scope: J): boolean => {
  if (scope['kind'] === 'event') return true;
  const s = st['scope'] as J;
  return [s['phaseId'], s['firstPhaseId'], s['secondPhaseId']].includes(scope['phaseId']);
};

/** Applies one WebSocket message to the model as §1.6 and §7.2 say a client must. */
export function applyMessage(m: Model, msg: J): void {
  switch (msg['type']) {
    case 'attempt.updated': applyResource(m, m.attempts, 'attempt', msg); break;
    case 'phase.updated': applyResource(m, m.phases, 'phase', msg); break;
    case 'entry.updated': applyResource(m, m.entries, 'entry', msg); break;
    case 'class.updated': applyResource(m, m.classes, 'class', msg); break;
    case 'standing.updated': m.standings.set(msg['standing']['standingKey'], msg['standing']); break;
    case 'course.updated': m.courses.set(msg['course']['courseId'], msg['course']); break;
    case 'write.updated': break;
    case 'sources.updated': m.sources = msg['sources']; break;
    case 'check.updated': if (msg['check'] === null) m.checks.delete(checkKey(msg as any)); else m.checks.set(checkKey(msg['check']), msg['check']); break;
    case 'flag.updated': m.flags.set(msg['flag']['flagId'], msg['flag']); break;
    case 'oncourse.updated': m.oncourse = { attemptIds: msg['attemptIds'], featuredByUpstream: msg['featuredByUpstream'], asOf: msg['asOf'] }; break;
    case 'diagnostics.updated': m.diagnostics = msg['diagnostics']; break;
    case 'event.changed': m.event = msg['event']; break;
    case 'scope.replaced': {
      const scope = msg['scope'] as J;
      for (const [id, a] of [...m.attempts]) if (inScope(scope, a as { phaseId: string })) m.attempts.delete(id);
      for (const [k, st] of [...m.standings]) if (standingNames(st, scope)) m.standings.delete(k);
      for (const a of msg['attempts'] as J[]) m.attempts.set(a['attemptId'], a);
      for (const st of msg['standings'] as J[]) m.standings.set(st['standingKey'], st);
      break;
    }
    default: throw new Error(`unknown message type ${String(msg['type'])}`);
  }
}

/** Hydration, step 3 of §1.6: every §7.1 resource of the event through REST. `between` runs after each request (a test interleaves ingest there). */
export async function hydrate(env: { h: { port: number } }, between?: () => Promise<void>): Promise<{ model: Model; asOfSeqs: number[]; hydratedSeq: number }> {
  const m = emptyModel();
  const seqs: number[] = [];
  const fetchJson = async (path: string, ok = 200): Promise<J> => {
    const r = await get(env, path);
    if (r.status !== ok) throw new Error(`GET ${path} -> ${r.status} ${JSON.stringify(r.body)}`);
    if (typeof r.body['asOfSeq'] === 'number') seqs.push(r.body['asOfSeq']);
    await between?.();
    return r.body;
  };
  const cur = await fetchJson('/api/events/current');
  m.event = cur['event'];
  for (const c of cur['courses'] as J[]) m.courses.set(c['courseId'], c);
  for (const c of cur['classes'] as J[]) {
    m.classes.set(c['classId'], c);
    const id = encodeURIComponent(c['classId']);
    for (const p of (await fetchJson(`/api/classes/${id}/phases`))['phases'] as J[]) {
      m.phases.set(p['phaseId'], p);
      for (const a of (await fetchJson(`/api/phases/${encodeURIComponent(p['phaseId'])}/attempts`))['attempts'] as J[]) m.attempts.set(a['attemptId'], a);
      const ck = await fetchJson(`/api/phases/${encodeURIComponent(p['phaseId'])}/checks`);
      for (const k of ck['checks'] as J[]) m.checks.set(checkKey(k as any), k);
      for (const f of ck['flags'] as J[]) m.flags.set(f['flagId'], f);
    }
    for (const e of (await fetchJson(`/api/classes/${id}/entries`))['entries'] as J[]) m.entries.set(e['entryId'], e);
    for (const s of (await fetchJson(`/api/classes/${id}/standings`))['standings'] as J[]) m.standings.set(s['standingKey'], s);
  }
  const oc = await fetchJson('/api/oncourse');
  // Round 27 (CONTRACTS §7.1): an Attempt whose Phase's class is not yet stated is served by /api/oncourse and by /api/phases/{phaseId}/attempts,
  // the Phase itself nowhere (not reachable through a class).
  for (const a of oc['attempts'] as J[]) {
    m.attempts.set(a['attemptId'], a);
    if (!m.phases.has(a['phaseId'])) {
      for (const x of (await fetchJson(`/api/phases/${encodeURIComponent(a['phaseId'])}/attempts`))['attempts'] as J[]) m.attempts.set(x['attemptId'], x);
    }
  }
  m.oncourse = { attemptIds: (oc['attempts'] as J[]).map((a) => a['attemptId']), featuredByUpstream: oc['featuredByUpstream'], asOf: oc['asOf'] };
  m.diagnostics = (await fetchJson('/api/diagnostics'))['diagnostics'];
  const src = await get(env, '/api/sources');
  m.sources = src.body;
  await between?.();
  return { model: m, asOfSeqs: seqs, hydratedSeq: Math.min(...seqs) };
}

/** A model as plain, order-independent data for `toEqual`: maps by key, diagnostics and checks sorted. Standing entries keep their order (rank is meaning). */
export function view(m: Model): J {
  const byKey = (mp: Map<string, J>): J[] => [...mp.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
  const byJson = (xs: J[]): J[] => [...xs].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return {
    event: m.event, classes: byKey(m.classes), courses: byKey(m.courses), phases: byKey(m.phases), entries: byKey(m.entries), attempts: byKey(m.attempts),
    standings: byKey(m.standings), oncourse: m.oncourse, diagnostics: byJson(m.diagnostics), sources: m.sources, checks: byKey(m.checks), flags: byKey(m.flags),
  };
}

/** What a client holds after applying `msgs` from an empty state, except the pieces only REST carries (event, sources are pushed too, so none is exempt). */
export function modelFrom(msgs: J[]): Model {
  const m = emptyModel();
  for (const x of msgs) applyMessage(m, x);
  return m;
}

/** The seq of every message, asserted to be a number: a message without one is a contract breach (§7.2 "Every message carries seq"). */
export const seqsOf = (msgs: J[]): number[] => msgs.map((x) => { if (typeof x['seq'] !== 'number') throw new Error(`message without seq: ${JSON.stringify(x).slice(0, 200)}`); return x['seq'] as number; });

/** The maximum seq among messages, or -1. */
export const maxSeq = (msgs: J[]): number => Math.max(-1, ...seqsOf(msgs));

/** A tiny seeded generator (mulberry32) so a random interleaving is reproducible from its seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

