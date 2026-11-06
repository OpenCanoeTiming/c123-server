/** Where an element's resource lives: Attempts, Phases and the format a Phase reads its rows by. */
import { fmtOf, splitRaceId, usable, zonedDate, zonedInstant, type Fmt } from '../ingest/common.js';
import type { CourseSlot } from '../ingest/index.js';
import type { AttemptState, CoreState, ResourceState, Source } from './types.js';

export function resource(map: Map<string, ResourceState>, id: string): ResourceState {
  let r = map.get(id);
  if (r === undefined) {
    r = { id, fields: new Map(), plain: new Map(), created: false, sent: new Map() };
    map.set(id, r);
  }
  return r;
}

/**
 * A Phase exists from its first observation, dated by it in the venue's zone until the snapshot states the date, once (DERIVATIONS
 * §2.1, INV-5). With no zone nothing is inferred: `date` stays unstated, as `eventTime` is omitted (§0.2).
 */
export function phaseResource(s: CoreState, phaseId: string, observedAt: string): ResourceState {
  const p = resource(s.phases, phaseId);
  if (p.attempts === undefined) {
    p.attempts = new Set();
    const inferred = zonedDate(observedAt, s.options.zone);
    if (inferred !== undefined) p.plain.set('date', inferred);
    s.dirtyPhases.add(p);
  }
  return p;
}

/** The structural format: the snapshot's `DisId` where read, else the `RaceId` token (DERIVATIONS §2.1). */
export function fmtFor(s: CoreState, phaseId: string): Fmt {
  const stated = s.phases.get(phaseId)?.plain.get('format');
  return fmtOf(typeof stated === 'string' ? stated : splitRaceId(phaseId).token);
}

/** The other run of a pair: the schedule's word where it was read, else the sibling format token on the same class and round (§4.5). */
export function siblingPhaseId(s: CoreState, phaseId: string): string | undefined {
  const fmt = fmtFor(s, phaseId);
  if (fmt.pair === null) return undefined;
  const stated = s.phases.get(phaseId)?.plain.get('pair') as { siblingPhaseId?: string | null } | undefined;
  const { classKey, rest } = splitRaceId(phaseId);
  return stated?.siblingPhaseId ?? `${classKey}_${fmt.pair.siblings[0] ?? ''}_${rest}`;
}

/** The course bound to a Phase, known only once a snapshot binds it (§4.6). */
export function boundSlots(s: CoreState, phaseId: string): CourseSlot[] | undefined {
  const courseId = s.phases.get(phaseId)?.fields.get('courseId')?.xml;
  if (courseId?.state !== 'known') return undefined;
  const fs = s.courses.get(String(courseId.value))?.fields.get('slots');
  const slots = fs?.xml?.value as CourseSlot[] | undefined;
  return usable(slots) ? slots : undefined;
}

const newAttempt = (id: string, phaseId: string, bib: string, observedAt: string, source: Source): AttemptState => ({
  id, phaseId, bib, slots: new Map(),
  gen: { n: 1, recorded: false, markAtStart: [], correcting: false, needsAttribution: false, completed: false, started: false, restated: new Set(), firstEnvelope: { observedAt, source } },
  listed: false, lastListedAt: 0, left: false, held: [], pending: [], history: {}, cells: {}, carried: new Set(), untimed: false,
  created: false, sent: new Map(), force: new Set(), diagnostics: [],
});

/** `attemptId` is `${phaseId}:${bib}` (CONTRACTS §2.6). */
export function attemptFor(s: CoreState, id: string, observedAt: string, source: Source): AttemptState {
  const known = s.attempts.get(id);
  if (known !== undefined) return known;
  const cut = id.lastIndexOf(':');
  const a = newAttempt(id, id.slice(0, cut), id.slice(cut + 1), observedAt, source);
  s.attempts.set(id, a);
  phaseResource(s, a.phaseId, observedAt).attempts?.add(a);
  return a;
}

const BARE_TIME = /^\d{1,2}:\d{2}:\d{2}/;

/**
 * §0.2 at the ingest seam: where the parser had no Phase date it left a bare time of day; the core builds the instant from the
 * date it holds, the inferred one (the date of the first observation, §2.1) if the snapshot has not stated it.
 */
export function instant(s: CoreState, phaseId: string, text: string | null | undefined, observedAt: string): string | undefined {
  if (text === null || text === undefined) return undefined;
  if (!BARE_TIME.test(text)) return text;
  const stated = s.phases.get(phaseId)?.plain.get('date');
  return zonedInstant(typeof stated === 'string' ? stated : zonedDate(observedAt, s.options.zone), text, s.options.zone) ?? text;
}

export const isInstant = (t: string | undefined): t is string => t !== undefined && t.includes('T');
