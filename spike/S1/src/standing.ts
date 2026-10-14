// CONTRACTS §5 standing assembly: relay upstream's rank and order, never rank.
import { STATUS_ORDER, NO_RESULT_MARKS } from './types.js';
import { compareBib, r3 } from './util.js';

export type StandingInput = {
  entryId: string;
  bib: string;
  status: string | null;
  placement: { rank: number | null; order: number } | null;
  result: any;                       // Outcome value, or { kind: 'pending' }
  pairTotal?: number | null;
  ageCategoryId?: string | null;
  provisional: boolean;
  underReview: boolean;
  heat?: number | null;
  decidedIn?: string;
};

export type StandingScope =
  | { kind: 'phase'; phaseId: string }
  | { kind: 'pair'; firstPhaseId: string; secondPhaseId: string }
  | { kind: 'heat'; phaseId: string; heat: number }
  | { kind: 'classification'; phaseId: string };

export function standingKey(scope: StandingScope, ageCategoryId: string | null): string {
  const pid = scope.kind === 'pair' ? scope.secondPhaseId : scope.phaseId;
  const heat = scope.kind === 'heat' ? `:${scope.heat}` : '';
  return `${scope.kind}:${pid}${heat}/${ageCategoryId ?? 'all'}`;
}

export type AssembleOpts = {
  scope: StandingScope;
  ageCategoryId: string | null;
  durationScored: boolean;   // false for Cross / ordinal scopes
  heatPhase?: boolean;       // a heat Phase's phase standing sorts by (heat, order)
  upstreamCategoryRanks?: Record<string, number>;  // entryId -> snapshot's own category rank
  withAnomalies: boolean;    // live tier assembles without step 4's check and step 7
};

const statusRank = (s: string | null) => (s === null ? STATUS_ORDER.length : Math.max(0, STATUS_ORDER.indexOf(s as never)));

function rankedValue(e: StandingInput, scope: StandingScope): number | null {
  if (scope.kind === 'pair') return typeof e.pairTotal === 'number' ? e.pairTotal : null;
  return e.result && typeof e.result.totalSeconds === 'number' ? e.result.totalSeconds : null;
}

export function assembleStanding(inputs: StandingInput[], o: AssembleOpts) {
  // Step 2: placed entries sort by order (heat Phase: by (heat, order)).
  const placed = inputs.filter((e) => e.placement && typeof e.placement.order === 'number');
  placed.sort((a, b) => {
    if (o.heatPhase) {
      const h = (a.heat ?? 0) - (b.heat ?? 0);
      if (h !== 0) return h;
    }
    return a.placement!.order - b.placement!.order || compareBib(a.bib, b.bib);
  });
  // Step 3: unplaced after, by AttemptStatus declaration order then bib.
  const unplaced = inputs.filter((e) => !(e.placement && typeof e.placement.order === 'number'));
  unplaced.sort((a, b) => statusRank(a.status) - statusRank(b.status) || compareBib(a.bib, b.bib));

  let rows: { e: StandingInput; rank: number | null; order: number | null }[];
  const anomalies: any[] = [];
  if (o.ageCategoryId === null) {
    rows = [...placed.map((e) => ({ e, rank: e.placement!.rank, order: e.placement!.order as number | null })),
            ...unplaced.map((e) => ({ e, rank: null, order: null }))];
  } else {
    // Step 4: the whole-class standing's placed entries of this category, in class order.
    const cat = placed.filter((e) => e.ageCategoryId === o.ageCategoryId);
    rows = cat.map((e, i) => {
      const r = e.placement!.rank;
      const rank = r === null ? null : 1 + cat.filter((x) => x.placement!.rank !== null && x.placement!.rank < r).length;
      return { e, rank, order: i + 1 };
    });
    if (o.withAnomalies && o.upstreamCategoryRanks) {
      for (const row of rows) {
        const up = o.upstreamCategoryRanks[row.e.entryId];
        if (typeof up === 'number' && row.rank !== null && up !== row.rank) {
          anomalies.push({ kind: 'category-rank-disagreement', entryId: row.e.entryId, assembled: row.rank, upstream: up });
        }
      }
    }
  }
  // Step 6: behindSeconds against the first-ordered entry, duration scopes only.
  const leaderValue = o.durationScored && rows.length > 0 ? rankedValue(rows[0]!.e, o.scope) : null;
  const entries = rows.map(({ e, rank, order }) => {
    const v = rankedValue(e, o.scope);
    const out: Record<string, unknown> = {
      entryId: e.entryId, bib: e.bib, rank, order,
      result: e.result ?? { kind: 'pending' },
      behindSeconds: o.durationScored && v !== null && leaderValue !== null ? r3(v - leaderValue) : null,
      provisional: e.provisional, underReview: e.underReview,
    };
    if (o.scope.kind === 'pair') out.pairTotalSeconds = e.pairTotal ?? null;
    if (o.scope.kind === 'classification' && e.decidedIn !== undefined) out.decidedIn = e.decidedIn;
    return out;
  });
  // Step 7: order-disagreement, duration-scored phase or pair scopes, placed entries with a numeric
  // result and no no-result mark. Ties never flagged; Cross never checked.
  if (o.withAnomalies && o.durationScored && (o.scope.kind === 'phase' || o.scope.kind === 'pair')) {
    const cand = rows.filter((r) => r.order !== null && rankedValue(r.e, o.scope) !== null && !NO_RESULT_MARKS.includes(r.e.status ?? ''));
    for (let i = 0; i < cand.length; i++) {
      for (let j = i + 1; j < cand.length; j++) {
        const vi = rankedValue(cand[i]!.e, o.scope)!, vj = rankedValue(cand[j]!.e, o.scope)!;
        if (vi > vj) anomalies.push({ kind: 'order-disagreement', entryId: cand[i]!.e.entryId, aheadOfEntryId: cand[j]!.e.entryId });
      }
    }
  }
  return { entries, anomalies };
}
