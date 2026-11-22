import type { PairRole, PhaseStatus } from '@opencanoetiming/c123-contract';
import type { IngestContext } from './types.js';
import { type Unit, calendarDate, fmtOf, int, parseLayout, splitRaceId } from './common.js';

const NA = 'not-applicable' as const;
const NC = 'not-configured' as const;

// CONTRACTS §3.1: Canoe123's 14-value race status, collapsed once.
const STATUS: Record<number, PhaseStatus> = {
  0: 'scheduled',
  1: 'scheduled',
  8: 'scheduled',
  12: 'scheduled',
  3: 'running',
  2: 'paused',
  11: 'paused',
  4: 'unofficial',
  9: 'unofficial',
  5: 'official',
  6: 'revised',
  10: 'protested',
  13: 'postponed',
  7: 'cancelled',
};
export const phaseStatus = (raw: string): PhaseStatus | undefined => {
  if (raw.trim() === '') return undefined;
  const n = int(raw);
  return n === undefined ? 'other' : (STATUS[n] ?? 'other');
};

export interface PhaseIn {
  phaseId: string;
  /** Format token: XML `DisId`, else the `RaceId` token (TCP `Schedule` has no `DisId`). */
  token: string;
  order: number | undefined;
  statusRaw: string;
  /** XML only. */
  xml?: { classId: string; startTime: string; courseNr: string; title: string } | undefined;
}

/** What pairing reads of a Phase: its class (undefined while unknown), its format token and its schedule date. */
export interface Candidate {
  classId: string | undefined;
  token: string;
  date: string | undefined;
}
/** phaseId -> what is known of every Phase a sibling may be looked up among. */
export type Candidates = Map<string, Candidate>;

/** The Phases the caller has learned (class from a snapshot or a Results message, format from a snapshot, date from a snapshot). */
export function learnedCandidates(ctx: IngestContext): Candidates {
  const out: Candidates = new Map();
  const ids = new Set([
    ...Object.keys(ctx.phaseClasses ?? {}),
    ...Object.keys(ctx.phaseFormats ?? {}),
    ...Object.keys(ctx.phaseDates ?? {}),
  ]);
  for (const id of ids)
    out.set(id, {
      classId: ctx.phaseClasses?.[id],
      token: ctx.phaseFormats?.[id] ?? splitRaceId(id).token,
      date: ctx.phaseDates?.[id],
    });
  return out;
}

/** CONTRACTS §2.4: the Phase this one's own lookup names: same known class, a token of its format's sibling table, the day as the tiebreak. */
function lookup(id: string, c: Candidate, candidates: Candidates): string | undefined {
  const pair = fmtOf(c.token).pair;
  if (pair === null || c.classId === undefined) return undefined;
  let found = [...candidates]
    .filter(([other, o]) => other !== id && o.classId === c.classId && pair.siblings.includes(o.token))
    .map(([other]) => other);
  if (found.length > 1) {
    const sameDate = found.filter((other) => c.date !== undefined && candidates.get(other)?.date === c.date);
    if (sameDate.length > 0) found = sameDate;
  }
  return found.length === 1 ? found[0] : undefined;
}

/**
 * CONTRACTS §2.4 "Pairing", DERIVATIONS §2.1 and §10 item 49 (a). A second run names the one run its lookup finds. A first run states
 * null, always: its sibling is the core's derivation. Where the class is unknown the sibling is null. No part of a `RaceId` is read here.
 */
function siblingOf(phaseId: string, c: Candidate, candidates: Candidates): string | undefined {
  return fmtOf(c.token).pair?.role === 'second' ? lookup(phaseId, c, candidates) : undefined;
}

/** The `pair` a Phase states: its role and combination from the format, its sibling from {@link siblingOf}; null for a single run. */
export function pairOf(phaseId: string, c: Candidate, candidates: Candidates): PairRole | null {
  const fmt = fmtOf(c.token);
  if (fmt.pair === null) return null;
  return {
    role: fmt.pair.role,
    siblingPhaseId: siblingOf(phaseId, c, candidates) ?? null,
    combination: fmt.pair.combination,
  };
}

/** §2.1: one Phase's structural and scheduled fields. Fields a source does not carry are not emitted. */
export function emitPhase(u: Unit, kind: 'fragment' | 'result-row', p: PhaseIn, candidates: Candidates): void {
  const key = { phaseId: p.phaseId };
  const fmt = fmtOf(p.token);
  if (!fmt.known) u.diagnostic({ kind: 'unknown-format-token', phaseId: p.phaseId, token: p.token });
  if (p.xml !== undefined) u.obs(kind, 'classId', key, p.xml.classId);
  u.obs(kind, 'format', key, p.token);
  u.obs(kind, 'stage', key, fmt.stage);
  u.obs(kind, 'kind', key, fmt.kind);
  u.obs(kind, 'scoringKind', key, fmt.scoringKind);
  u.obs(kind, 'heats', key, fmt.heats);
  u.obs(
    kind,
    'pair',
    key,
    pairOf(
      p.phaseId,
      candidates.get(p.phaseId) ?? { classId: p.xml?.classId.trim() || undefined, token: p.token, date: undefined },
      candidates,
    ),
  );
  if (p.order !== undefined) u.obs(kind, 'programmeOrder', key, p.order);
  const status = phaseStatus(p.statusRaw);
  if (status !== undefined) u.obs(kind, 'status', key, status, 'authoritative', { scope: 'phase' });
  const x = p.xml;
  if (x === undefined) return;
  const st = x.startTime.trim();
  if (st !== '') {
    // §10 item 42: an unparseable date part states neither date nor scheduledStart at all (not a timestamp of no calendar day)
    const date = calendarDate(st);
    if (date !== undefined) {
      u.obs(kind, 'date', key, date);
      u.obs(kind, 'scheduledStart', key, st);
    } else u.diagnostic({ kind: 'unparseable-field', where: p.phaseId, name: 'StartTime', text: x.startTime });
  }
  if (x.title.trim() !== '') u.obs(kind, 'title', key, x.title);
  else u.notYet(kind, 'title', key);
  if (fmt.kind === 'classification') u.unavailable(kind, 'courseId', key, NA);
  else if (x.courseNr.trim() !== '') u.obs(kind, 'courseId', key, x.courseNr.trim());
  else u.notYet(kind, 'courseId', key);
}

/** §2.3: a snapshot course's layout, gates, slots, sector ends and splits; unavailable{not-configured} when its layout is empty. */
export function emitCourse(u: Unit, courseId: string, layout: string): void {
  const key = { courseId };
  const kind = 'result-row';
  if (layout.trim() === '') {
    for (const f of ['layout', 'gates', 'slots', 'sectorEndsAfterGate', 'splitsAfterGate'])
      u.unavailable(kind, f, key, NC);
    return;
  }
  const l = parseLayout(layout);
  if (l.unknownChars.length > 0)
    u.diagnostic({ kind: 'unknown-layout-char', courseId, chars: [...new Set(l.unknownChars)].sort() });
  u.obs(kind, 'layout', key, layout);
  u.obs(kind, 'gates', key, l.gates);
  u.obs(kind, 'slots', key, l.slots);
  u.obs(kind, 'sectorEndsAfterGate', key, l.sectorEndsAfterGate);
  u.obs(kind, 'splitsAfterGate', key, l.splitsAfterGate);
}
