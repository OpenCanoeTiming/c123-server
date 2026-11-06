import type { PairRole, PhaseStatus } from '@opencanoetiming/c123-contract';
import { type Fmt, type Unit, fmtOf, int, parseLayout, splitRaceId } from './common.js';

const NA = 'not-applicable' as const;
const NC = 'not-configured' as const;

// CONTRACTS §3.1: Canoe123's 14-value race status, collapsed once.
const STATUS: Record<number, PhaseStatus> = {
  0: 'scheduled', 1: 'scheduled', 8: 'scheduled', 12: 'scheduled', 3: 'running', 2: 'paused', 11: 'paused', 4: 'unofficial', 9: 'unofficial',
  5: 'official', 6: 'revised', 10: 'protested', 13: 'postponed', 7: 'cancelled',
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

/** phaseId -> schedule date (YYYY-MM-DD) or undefined, for every Phase a sibling may be looked up among. */
export type Candidates = Map<string, string | undefined>;

function siblingOf(phaseId: string, fmt: Fmt, candidates: Candidates): string | undefined {
  if (fmt.pair === null) return undefined;
  const mine = splitRaceId(phaseId);
  let found = [...candidates.keys()].filter((id) => {
    if (id === phaseId) return false;
    const c = splitRaceId(id);
    return c.classKey === mine.classKey && fmt.pair!.siblings.includes(c.token);
  });
  if (found.length > 1) {
    const sameDate = found.filter((id) => candidates.get(id) !== undefined && candidates.get(id) === candidates.get(phaseId));
    if (sameDate.length > 0) found = sameDate;
  }
  if (found.length > 1) {
    const same = found.filter((id) => splitRaceId(id).rest === mine.rest);
    if (same.length > 0) found = same;
  }
  return found.sort()[0];
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
  if (fmt.pair === null) u.obs(kind, 'pair', key, null);
  else {
    const pair: PairRole = { role: fmt.pair.role, siblingPhaseId: siblingOf(p.phaseId, fmt, candidates) ?? null, combination: fmt.pair.combination };
    u.obs(kind, 'pair', key, pair);
  }
  if (p.order !== undefined) u.obs(kind, 'programmeOrder', key, p.order);
  const status = phaseStatus(p.statusRaw);
  if (status !== undefined) u.obs(kind, 'status', key, status, 'authoritative', { scope: 'phase' });
  const x = p.xml;
  if (x === undefined) return;
  const st = x.startTime.trim();
  if (st !== '') {
    if (/^\d{4}-\d{2}-\d{2}/.test(st)) u.obs(kind, 'date', key, st.slice(0, 10));
    u.obs(kind, 'scheduledStart', key, st);
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
    for (const f of ['layout', 'gates', 'slots', 'sectorEndsAfterGate', 'splitsAfterGate']) u.unavailable(kind, f, key, NC);
    return;
  }
  const l = parseLayout(layout);
  if (l.unknownChars.length > 0) u.diagnostic({ kind: 'unknown-layout-char', courseId, chars: [...new Set(l.unknownChars)].sort() });
  u.obs(kind, 'layout', key, layout);
  u.obs(kind, 'gates', key, l.gates);
  u.obs(kind, 'slots', key, l.slots);
  u.obs(kind, 'sectorEndsAfterGate', key, l.sectorEndsAfterGate);
  u.obs(kind, 'splitsAfterGate', key, l.splitsAfterGate);
}
