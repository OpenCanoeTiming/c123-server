/** Where an element's resource lives: Attempts, Phases and the format a Phase reads its rows by. */
import { fmtOf, splitRaceId, zonedInstant, type Fmt } from '../ingest/common.js';
import type { AttemptState, CoreState, ResourceState, Source } from './types.js';

export function resource(map: Map<string, ResourceState>, id: string): ResourceState {
  let r = map.get(id);
  if (r === undefined) {
    r = { id, fields: new Map(), plain: new Map(), created: false, sent: new Map() };
    map.set(id, r);
  }
  return r;
}

export function phaseResource(s: CoreState, phaseId: string): ResourceState {
  const p = resource(s.phases, phaseId);
  if (p.attempts === undefined) {
    p.attempts = new Set();
    s.dirtyPhases.add(p);
  }
  return p;
}

/** The structural format: the snapshot's `DisId` where read, else the `RaceId` token (DERIVATIONS §2.1). */
export function fmtFor(s: CoreState, phaseId: string | undefined): Fmt {
  if (phaseId === undefined) return fmtOf('');
  const stated = s.phases.get(phaseId)?.plain.get('format');
  return fmtOf(typeof stated === 'string' ? stated : splitRaceId(phaseId).token);
}

const newAttempt = (id: string, phaseId: string | undefined, bib: string, observedAt: string, source: Source): AttemptState => ({
  id, phaseId, bib, slots: new Map(),
  gen: { n: 1, needsAttribution: false, completed: false, started: false, firstEnvelope: { observedAt, source } },
  listed: false, lastListedAt: 0, left: false, held: [], pending: [], history: {}, cells: {}, carried: new Set(), untimed: false,
  created: false, sent: new Map(), force: new Set(), diagnostics: [],
});

function name(s: CoreState, a: AttemptState, id: string): void {
  const cut = id.lastIndexOf(':');
  a.id = id;
  a.phaseId = id.slice(0, cut);
  a.bib = id.slice(cut + 1);
  s.attempts.set(id, a);
  phaseResource(s, a.phaseId).attempts?.add(a);
}

/** `attemptId` is `${phaseId}:${bib}` (CONTRACTS §2.6). The first name stated also names an Attempt so far unnamed. */
export function attemptFor(s: CoreState, id: string, observedAt: string, source: Source): AttemptState {
  const known = s.attempts.get(id);
  if (known !== undefined) return known;
  const a = s.unnamed ?? newAttempt(id, undefined, '', observedAt, source);
  s.unnamed = undefined;
  s.attempts.delete('');
  name(s, a, id);
  return a;
}

/**
 * An observation that names no Attempt. The parsers always name one; a vector may leave it to `context.attemptId`, which the
 * core is not told (`core-adapter.ts` passes no context), so such elements address the one Attempt there is.
 */
export function unnamedAttempt(s: CoreState, observedAt: string, source: Source): AttemptState {
  if (s.unnamed === undefined) {
    s.unnamed = newAttempt('', undefined, '', observedAt, source);
    s.attempts.set('', s.unnamed);
  }
  return s.unnamed;
}

const BARE_TIME = /^\d{1,2}:\d{2}:\d{2}/;

/**
 * §0.2 at the ingest seam: where the parser had no Phase date it left a bare time of day; the core builds the instant from the
 * date it holds, the inferred one (the date of the first observation, §2.1) if the snapshot has not stated it.
 */
export function instant(s: CoreState, phaseId: string | undefined, text: string | null | undefined, observedAt: string): string | undefined {
  if (text === null || text === undefined) return undefined;
  if (!BARE_TIME.test(text)) return text;
  if (phaseId === undefined) return text;
  const stated = s.phases.get(phaseId)?.plain.get('date');
  return zonedInstant(typeof stated === 'string' ? stated : observedAt.slice(0, 10), text, s.options.zone) ?? text;
}

export const isInstant = (t: string | undefined): t is string => t !== undefined && t.includes('T');
