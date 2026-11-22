/** Where an element's resource lives: Attempts, Phases and the format a Phase reads its rows by. */
import { fmtOf, usable, zonedDate, zonedInstant, type Fmt } from '../ingest/common.js';
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
    // §10 item 54 (h): a removed Phase created again: the second runs stating it as their sibling present it again
    if (s.removedIds.delete(phaseId)) {
      for (const other of s.phases.values())
        if (statedPair(other)?.siblingPhaseId === phaseId) s.dirtyPhases.add(other);
    }
    s.dirtyPhases.add(p);
  }
  return p;
}

/**
 * The structural format: the stated `format` only, the snapshot's `DisId` or the TCP parser's fallback (DERIVATIONS §2.1); the core reads no id.
 * The run role is the stated `pair`'s where one is stated (one source for every reader, CONTRACTS §2.4), else the stated format's.
 */
export function fmtFor(s: CoreState, phaseId: string): Fmt {
  const r = s.phases.get(phaseId);
  const stated = r?.plain.get('format');
  const fmt = fmtOf(typeof stated === 'string' ? stated : '');
  if (typeof stated !== 'string' && r?.plain.has('pair') !== true) return namedFirstRun(s, phaseId) ?? fmt;
  if (r === undefined || !r.plain.has('pair')) return fmt;
  const p = statedPair(r);
  if (p === null || p === undefined || (p.role !== 'first' && p.role !== 'second')) return { ...fmt, pair: null };
  const combination =
    p.combination === 'sum' || p.combination === 'best' ? p.combination : (fmt.pair?.combination ?? 'best');
  return { ...fmt, pair: { role: p.role, combination, siblings: fmt.pair?.siblings ?? [] } };
}

/**
 * A Phase nothing states a format or pair for, named by a second run's stated pair under item 49 (b) (the set `namingSecondRuns(s, true)` keeps,
 * the one the derivation reads): a first run of that pair's combination (DERIVATIONS §10 item 49 (d); CONTRACTS §2.4).
 */
function namedFirstRun(s: CoreState, phaseId: string): Fmt | undefined {
  const naming = [...(namingSecondRuns(s, true).get(phaseId) ?? [])].sort();
  if (naming.length === 0) return undefined;
  const combination = statedPair(s.phases.get(naming[0]!))?.combination === 'sum' ? 'sum' : 'best';
  return { ...fmtOf(''), pair: { role: 'first', combination, siblings: [] } };
}

type StatedPair = { role?: string; siblingPhaseId?: string | null; combination?: string } | null | undefined;
const statedPair = (r: ResourceState | undefined): StatedPair => r?.plain.get('pair') as StatedPair;

/**
 * The other run of a pair (CONTRACTS §2.4); the id is never built or parsed for it. One rule, by the Phase's run role (`fmtFor`):
 *   - a second run: the sibling its `pair` states;
 *   - a first run: derived, the second run that names it back, unless both classIds are stated and differ (DERIVATIONS §10 items 48, 49); held by
 *     `deriveFirstRunSiblings` for a described Phase, derived here for one the core has not created;
 *   - a single run: none.
 */
export function siblingPhaseId(s: CoreState, phaseId: string): string | undefined {
  const role = fmtFor(s, phaseId).pair?.role;
  const r = s.phases.get(phaseId);
  if (role === 'second') {
    const stated = statedPair(r)?.siblingPhaseId ?? undefined;
    return stated !== undefined && s.removedIds.has(stated) ? undefined : stated; // §10 item 54 (h)
  }
  if (role !== 'first') return undefined;
  if (r?.derivedSibling !== undefined) return r.derivedSibling ?? undefined;
  return namedBack(s, phaseId, namingSecondRuns(s, true)) ?? undefined;
}

/**
 * Each Phase named by a second run's stated pair, with the second runs naming it. `sameClass`: a second run stops naming a first run
 * only when both Phases' current `classId` are stated and differ (item 49 b). Without it, every second run whose pair names the Phase (§7.2 scopes).
 */
export function namingSecondRuns(s: CoreState, sameClass: boolean): Map<string, string[]> {
  const naming = new Map<string, string[]>();
  for (const [id, r] of s.phases) {
    const p = statedPair(r);
    if (p?.role !== 'second' || typeof p.siblingPhaseId !== 'string' || s.removedIds.has(p.siblingPhaseId)) continue;
    if (sameClass) {
      const cls = r.plain.get('classId');
      const firstCls = s.phases.get(p.siblingPhaseId)?.plain.get('classId');
      if (typeof cls === 'string' && typeof firstCls === 'string' && cls !== firstCls) continue;
    }
    const list = naming.get(p.siblingPhaseId);
    if (list === undefined) naming.set(p.siblingPhaseId, [id]);
    else list.push(id);
  }
  return naming;
}

/** DERIVATIONS §10 item 48: the one second run naming the first run; where several do, the one on its day; else `null`. Candidates sorted. */
function namedBack(s: CoreState, firstId: string, naming: ReadonlyMap<string, string[]>): string | null {
  const candidates = [...(naming.get(firstId) ?? [])].sort();
  if (candidates.length === 1) return candidates[0]!;
  const day = s.phases.get(firstId)?.plain.get('date');
  const sameDay = candidates.filter((c) => day !== undefined && s.phases.get(c)?.plain.get('date') === day);
  return sameDay.length === 1 ? sameDay[0]! : null;
}

/** A first run's sibling, derived again for every first run; one whose sibling changed is marked, its Phase and its Attempts. */
export function deriveFirstRunSiblings(s: CoreState): void {
  const naming = namingSecondRuns(s, true);
  for (const [id, r] of s.phases) {
    if (fmtFor(s, id).pair?.role !== 'first') continue;
    const pick = namedBack(s, id, naming);
    if (r.derivedSibling === pick) continue;
    r.derivedSibling = pick;
    s.dirtyPhases.add(r);
    for (const a of r.attempts ?? []) s.dirtyAttempts.add(a);
  }
}

/** The sibling Phase's Attempt of the same bib, where a sibling is stated and the Attempt exists. */
export function siblingAttempt(s: CoreState, phaseId: string, bib: string): AttemptState | undefined {
  const sibling = siblingPhaseId(s, phaseId);
  return sibling === undefined ? undefined : s.attempts.get(`${sibling}:${bib}`);
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
  id,
  phaseId,
  bib,
  slots: new Map(),
  gen: {
    n: 1,
    recorded: false,
    markAtStart: [],
    correcting: false,
    needsAttribution: false,
    completed: false,
    started: false,
    restated: new Set(),
    firstEnvelope: { observedAt, source },
  },
  listed: false,
  lastListedAt: 0,
  left: false,
  rowNamed: false,
  held: [],
  pending: [],
  history: {},
  cells: {},
  carried: new Set(),
  untimed: false,
  created: false,
  sent: new Map(),
  force: new Set(),
  diagnostics: [],
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
export function instant(
  s: CoreState,
  phaseId: string,
  text: string | null | undefined,
  observedAt: string,
): string | undefined {
  if (text === null || text === undefined) return undefined;
  if (!BARE_TIME.test(text)) return text;
  const stated = s.phases.get(phaseId)?.plain.get('date');
  return (
    zonedInstant(typeof stated === 'string' ? stated : zonedDate(observedAt, s.options.zone), text, s.options.zone) ??
    text
  );
}

export const isInstant = (t: string | undefined): t is string => t !== undefined && t.includes('T');

/** The Attempt fields that differ from the default of both sources carrying them. */
const ATTEMPT_FIELDS: Readonly<Record<string, { xmlOnly: boolean }>> = {
  countingRun: { xmlOnly: true }, // no TCP column carries it (DERIVATIONS §4.4)
};

/** INV-2 rule 3's XML-only Attempt field: never a `tcp` observation, so a retraction or contradiction of it is the xml source's own. */
export const isXmlOnly = (field: string): boolean => ATTEMPT_FIELDS[field]?.xmlOnly === true;
