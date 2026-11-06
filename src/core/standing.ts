/**
 * Standing assembly (CONTRACTS §2.7, §5; DERIVATIONS §4.10; ADR-012). Pure: entries in, one Standing's entries and anomalies out.
 * It relays upstream's order and rank and never ranks; the only rank assembled here is the age category's (step 4). What the
 * entries are (which Attempts, which scope) is the caller's question, `publish.ts`.
 */
import type { Anomaly, Outcome, StandingEntry } from '@opencanoetiming/c123-contract';
import { r3 } from '../ingest/common.js';

export interface EntryInput {
  entryId: string;
  bib: string;
  /** The presented `AttemptStatus`; orders the unplaced (step 3). */
  status?: string;
  placement: { rank: number | null; order: number } | null;
  provisional?: boolean;
  underReview?: boolean;
  result?: Outcome | null;
  pairTotal?: number | null;
  ageCategoryId?: string | null;
  heat?: number | null;
  decidedIn?: string | null;
}

export interface StandingInput {
  entries: EntryInput[];
  /** Assemble this age category's standing from the whole class's entries (step 4). */
  ageCategoryId?: string;
  upstreamCategoryRanks?: Record<string, number>;
  /** Defaults to true for a `phase` or `pair` scope: behind seconds and age categories are for duration scopes. */
  durationScored?: boolean;
  /** A Cross scope is never checked mechanically (step 7). */
  cross?: boolean;
  /** The entries' placement is based on `pairTotal` (an entry of a second-run Phase): it is the ranked value in every scope (steps 6-7). */
  combined?: boolean;
}

export type StandingScopeInput = { kind: string; [k: string]: unknown };

export interface AssembledStanding {
  standing: StandingEntry[];
  anomalies: Anomaly[];
  ageCategoryId: string | null;
}

/** `AttemptStatus` in declaration order (§2.6). */
const STATUS_ORDER = ['not-started', 'at-start', 'on-course', 'left-without-finish', 'finished', 'non-ranked', 'dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other'];
const statusIndex = (status: string | undefined): number => {
  const i = STATUS_ORDER.indexOf(status ?? '');
  return i < 0 ? STATUS_ORDER.length : i;
};

const INTEGER = /^\d+$/;
const byBib = (a: string, b: string): number => (INTEGER.test(a) && INTEGER.test(b) ? Number(a) - Number(b) : a < b ? -1 : a > b ? 1 : 0);

const orderOf = (e: EntryInput): number => e.placement?.order ?? 0;

/** Entries sort by relayed `order` (§5 step 2), in a heat Phase's `phase` standing by `(heat, order)`; ties keep upstream's sequence. */
const byRelayedOrder = (a: EntryInput, b: EntryInput): number => (a.heat ?? 0) - (b.heat ?? 0) || orderOf(a) - orderOf(b);

/** Classification rows in the order a Standing shows them: two builds that differ only in where the rows sit are the same Standing. */
export const inRelayedOrder = <T extends { order: number }>(rows: readonly T[]): T[] => [...rows].sort((a, b) => a.order - b.order);

export function assembleStanding(given: StandingInput, scope: StandingScopeInput): AssembledStanding {
  const pair = scope.kind === 'pair';
  const classification = scope.kind === 'classification';
  const duration = given.durationScored ?? (scope.kind === 'phase' || pair);
  const placed = given.entries.filter((e) => e.placement !== null).sort(byRelayedOrder);
  const unplaced = given.entries.filter((e) => e.placement === null).sort((a, b) => statusIndex(a.status) - statusIndex(b.status) || byBib(a.bib, b.bib));

  const ranked = (e: EntryInput): number | null => {
    if (pair || given.combined === true) return typeof e.pairTotal === 'number' ? e.pairTotal : null;
    return e.result?.kind === 'duration' ? e.result.totalSeconds : null;
  };
  const shape = (list: EntryInput[], rankOf: (e: EntryInput, i: number) => [number | null, number | null]): StandingEntry[] => {
    const lead = duration && list[0]?.placement ? ranked(list[0]) : null;
    return list.map((e, i) => {
      const [rank, order] = rankOf(e, i);
      const value = ranked(e);
      return {
        entryId: e.entryId, bib: e.bib, rank, order, result: e.result ?? null,
        ...(pair ? { pairTotalSeconds: e.pairTotal ?? null } : {}),
        behindSeconds: lead !== null && value !== null && e.placement !== null ? r3(value - lead) : null,
        provisional: e.provisional ?? false, underReview: e.underReview ?? false,
        ...(classification ? { decidedIn: e.decidedIn ?? null } : {}),
      };
    });
  };

  if (given.ageCategoryId !== undefined) {
    const category = placed.filter((e) => e.ageCategoryId === given.ageCategoryId);
    const rankIn = (e: EntryInput): number => 1 + category.filter((o) => (o.placement?.rank ?? Infinity) < (e.placement?.rank ?? Infinity)).length;
    const standing = shape(category, (e, i) => [rankIn(e), i + 1]);
    const anomalies: Anomaly[] = [];
    for (const e of standing) {
      const upstream = given.upstreamCategoryRanks?.[e.entryId];
      if (upstream !== undefined && upstream !== e.rank) anomalies.push({ kind: 'category-rank-disagreement', entryId: e.entryId, assembled: e.rank as number, upstream });
    }
    return { standing, anomalies, ageCategoryId: given.ageCategoryId };
  }

  const standing = shape([...placed, ...unplaced], (e) => [e.placement?.rank ?? null, e.placement?.order ?? null]);
  return { standing, anomalies: duration && given.cross !== true ? orderAnomalies(placed, ranked) : [], ageCategoryId: null };
}

/**
 * Step 7: an entry ordered ahead of another whose result is strictly smaller. Ties are never flagged; an anomaly names the
 * strictly smaller result nearest the front of those behind the entry. Marks and non-numeric results are not compared.
 */
function orderAnomalies(placed: EntryInput[], ranked: (e: EntryInput) => number | null): Anomaly[] {
  const comparable = placed.filter((e) => e.result?.kind !== 'no-result' && ranked(e) !== null);
  const anomalies: Anomaly[] = [];
  let smallest: EntryInput | undefined;
  for (let i = comparable.length - 1; i >= 0; i--) {
    const e = comparable[i]!;
    if (smallest !== undefined && (ranked(smallest) as number) < (ranked(e) as number)) anomalies.unshift({ kind: 'order-disagreement', entryId: e.entryId, aheadOfEntryId: smallest.entryId });
    if (smallest === undefined || (ranked(e) as number) <= (ranked(smallest) as number)) smallest = e;
  }
  return anomalies;
}
