/**
 * The Standings of the merge core (#205; CONTRACTS §5 step 1): which Attempts feed which scope, and which of them changed. The assembly
 * itself is `standing.ts`. A unit marks the Phases it touched (`dirtyScopes`); only those are assembled, and a Standing leaves only when
 * its serialised entries and anomalies differ from the ones last sent. An Attempt joins the marked set only when what a Standing reads of
 * it changed, so a running tick, which is in none of that, assembles nothing.
 */
import type { Standing } from '@opencanoetiming/c123-contract';
import { assembleStanding, type EntryInput } from './standing.js';
import { isMark, present } from './precedence.js';
import { fmtFor, namingSecondRuns, siblingPhaseId } from './registry.js';
import type { AttemptState, CoreState, StandingFacts } from './types.js';

type Enveloped = { state?: string; value?: unknown; provisional?: boolean } | undefined;

/** Reads the presented Attempt (`viewAttempt`'s output) for what an entry shows; marks the Phase when that differs from last time. */
export function noteFacts(s: CoreState, a: AttemptState, view: Record<string, unknown>): void {
  const known = (f: string): Enveloped => {
    const e = view[f] as Enveloped;
    return e?.state === 'known' ? e : undefined;
  };
  const outcome = view['outcome'] as Enveloped;
  const o = known('outcome')?.value as { kind: string } | undefined;
  const placement = known('placement')?.value as { rank: number; order: number } | undefined;
  const pairTotal = known('pairTotal')?.value;
  const heat = known('heat')?.value;
  const facts: StandingFacts = {
    entryId: (known('entry')?.value as { entryId?: string } | undefined)?.entryId ?? a.id,
    bib: a.bib,
    status: String(known('status')?.value ?? 'not-started'),
    placement: placement === undefined ? null : { rank: placement.rank, order: placement.order },
    result: o === undefined ? (outcome?.state === 'unavailable' ? null : { kind: 'pending' }) : o.kind === 'running' ? { kind: 'pending' } : (o as StandingFacts['result']),
    pairTotal: typeof pairTotal === 'number' ? pairTotal : null,
    provisional: ['outcome', 'placement', 'pairTotal'].some((f) => known(f)?.provisional === true),
    underReview: known('underReview')?.value === true,
    heat: typeof heat === 'number' ? heat : null,
    ...(a.snapshotRow !== undefined ? { snapshotRow: a.snapshotRow } : {}),
  };
  const text = JSON.stringify(facts);
  if (text === a.factsText) return;
  a.facts = facts;
  a.factsText = text;
  s.dirtyScopes.add(a.phaseId);
  let phases = s.entryPhases.get(facts.entryId);
  if (phases === undefined) s.entryPhases.set(facts.entryId, (phases = new Set()));
  phases.add(a.phaseId);
}

const categoryOf = (s: CoreState, entryId: string): string | null => {
  const slot = present(s.entries.get(entryId)?.fields.get('ageCategoryId'));
  return slot?.state === 'known' && typeof slot.value === 'string' ? slot.value : null;
};

/** §5 step 2-3: placed Attempts, and unplaced ones that show a result or a mark; start-list rows and athletes on course are not entries. */
const isEntry = (f: StandingFacts): boolean => f.placement !== null || (f.result !== null && f.result.kind !== 'pending') || isMark(f.status);

const keyOf = (kind: string, phaseId: string, heat: number | undefined, category: string | null): string =>
  `${kind}:${phaseId}${heat === undefined ? '' : `:${heat}`}/${category ?? 'all'}`;

/**
 * CONTRACTS §5 step 4, DERIVATIONS §10 item 53 (e): the latest snapshot's category ranks, only while the whole-class standing presents the
 * snapshot's class order (its placed entries exactly the snapshot's placed rows, each with that row's rank and order); otherwise none.
 */
function snapshotCategoryRanks(attempts: AttemptState[]): Record<string, number> | undefined {
  const same = (x: { rank: number; order: number } | null, y: { rank: number; order: number } | null): boolean =>
    x === null || y === null ? x === y : x.rank === y.rank && x.order === y.order;
  const placedOf = (a: AttemptState) => (a.facts !== undefined && isEntry(a.facts) ? a.facts.placement : null);
  if (!attempts.every((a) => same(a.snapshotRow?.placement ?? null, placedOf(a)))) return undefined;
  const ranks: Record<string, number> = {};
  for (const a of attempts) if (a.facts !== undefined && a.snapshotRow?.categoryRank !== undefined) ranks[a.facts.entryId] = a.snapshotRow.categoryRank;
  return Object.keys(ranks).length > 0 ? ranks : undefined;
}

/** Every Standing of one Phase. A Standing with no entries is returned only where one was sent before. */
function ofPhase(s: CoreState, phaseId: string, asOf: string): Standing[] {
  // §2.7 (round 27d): the Phase's class, never the RaceId prefix; a Standing is held until its Phase is created (§2.4), then sent whole
  const stated = s.phases.get(phaseId)?.plain.get('classId');
  const out: Standing[] = [];
  if (typeof stated !== 'string') return out;
  const classId = stated;
  const add = (standing: Omit<Standing, 'asOf'> & { asOf?: string }): void => {
    if (standing.entries.length === 0 && !s.standingsSent.has(standing.standingKey)) return;
    out.push({ ...standing, asOf: standing.asOf ?? asOf } as Standing);
  };
  const fmt = fmtFor(s, phaseId);

  if (fmt.kind === 'classification') {
    const rows = s.classifications.get(phaseId);
    if (rows === undefined) return out;
    const entries: EntryInput[] = rows.rows.map((r) => ({ entryId: r.entryId, bib: r.bib, placement: { rank: r.rank, order: r.order }, decidedIn: r.decidedIn }));
    const scope = { kind: 'classification', phaseId } as const;
    const { standing, anomalies } = assembleStanding({ entries }, scope);
    add({ standingKey: keyOf('classification', phaseId, undefined, null), classId, scope, ageCategoryId: null, asOf: rows.asOf, entries: standing, anomalies });
    return out;
  }

  const attempts = [...(s.phases.get(phaseId)?.attempts ?? [])];
  const facts = attempts.flatMap((a) => (a.facts !== undefined && isEntry(a.facts) ? [a.facts] : []));
  const inputs: EntryInput[] = facts.map(({ snapshotRow: _, ...f }) => ({
    ...f, ageCategoryId: categoryOf(s, f.entryId),
  }));
  const upstreamCategoryRanks = snapshotCategoryRanks(attempts);
  const duration = fmt.scoringKind === 'duration';
  const scoped = (kind: 'phase' | 'pair', scope: Standing['scope']): void => {
    const common = { entries: inputs, durationScored: duration, cross: fmt.cross, combined: fmt.pair?.role === 'second', ...(upstreamCategoryRanks !== undefined ? { upstreamCategoryRanks } : {}) };
    const whole = assembleStanding(common, scope);
    add({ standingKey: keyOf(kind, phaseId, undefined, null), classId, scope, ageCategoryId: null, entries: whole.standing, anomalies: whole.anomalies });
    if (!duration) return;
    const categories = new Set(inputs.flatMap((e) => (e.placement !== null && e.ageCategoryId !== null && e.ageCategoryId !== undefined ? [e.ageCategoryId] : [])));
    const prefix = `${kind}:${phaseId}/`;
    for (const key of s.standingKeys.get(phaseId) ?? []) if (key.startsWith(prefix) && !key.endsWith('/all')) categories.add(key.slice(prefix.length));
    for (const category of [...categories].sort()) {
      const part = assembleStanding({ ...common, ageCategoryId: category }, scope);
      add({ standingKey: keyOf(kind, phaseId, undefined, category), classId, scope, ageCategoryId: category, entries: part.standing, anomalies: part.anomalies });
    }
  };
  scoped('phase', { kind: 'phase', phaseId });
  if (fmt.pair?.role === 'second') {
    // §5 step 1: the pair exists once the stated `pair.siblingPhaseId` is non-null
    const first = siblingPhaseId(s, phaseId);
    if (first !== undefined) scoped('pair', { kind: 'pair', firstPhaseId: first, secondPhaseId: phaseId });
  }
  if (fmt.heats) {
    const heats = new Set(facts.flatMap((f) => (f.heat === null ? [] : [f.heat])));
    const heatPrefix = `heat:${phaseId}:`;
    for (const key of s.standingKeys.get(phaseId) ?? []) {
      if (!key.startsWith(heatPrefix) || !key.endsWith('/all')) continue;
      const n = Number(key.slice(heatPrefix.length, -'/all'.length));
      if (Number.isInteger(n)) heats.add(n);
    }
    for (const heat of [...heats].sort((a, b) => a - b)) {
      const scope = { kind: 'heat', phaseId, heat } as const;
      const part = assembleStanding({ entries: inputs.filter((e) => e.heat === heat), durationScored: false, cross: fmt.cross }, scope);
      add({ standingKey: keyOf('heat', phaseId, heat, null), classId, scope, ageCategoryId: null, entries: part.standing, anomalies: part.anomalies });
    }
  }
  return out;
}

const textOf = (st: Standing): string => JSON.stringify([st.entries, st.anomalies]);

function remember(s: CoreState, phaseId: string, st: Standing): void {
  s.standingsSent.set(st.standingKey, textOf(st));
  s.standingsHeld.set(st.standingKey, st);
  let keys = s.standingKeys.get(phaseId);
  if (keys === undefined) s.standingKeys.set(phaseId, (keys = new Set()));
  keys.add(st.standingKey);
}

/** The Standings of the marked Phases that changed since they were last sent, in the order assembled. */
export function changedStandings(s: CoreState): Standing[] {
  const out: Standing[] = [];
  for (const phaseId of s.dirtyScopes) {
    for (const st of ofPhase(s, phaseId, s.unitAt)) {
      if (s.standingsSent.get(st.standingKey) === textOf(st)) continue;
      remember(s, phaseId, st);
      out.push(st);
    }
  }
  s.dirtyScopes.clear();
  return out;
}

/** `scope.replaced`: every Standing whose scope names a Phase of the re-baseline's scope, sent whole and recorded as sent. */
export function replacedStandings(s: CoreState, scope: { kind?: string; phaseId?: string }): Standing[] {
  const phases = scope.kind === 'event' ? new Set([...s.phases.keys(), ...s.classifications.keys()]) : new Set(scope.phaseId === undefined ? [] : [scope.phaseId]);
  // §7.2: every Standing whose scope names one of the scope's Phases, `pair` on either side: the pair standings of every second run naming it
  const naming = namingSecondRuns(s, false);
  for (const id of [...phases]) {
    if (fmtFor(s, id).pair?.role !== 'first') continue;
    for (const second of [...(naming.get(id) ?? [])].sort()) phases.add(second);
  }
  const out: Standing[] = [];
  for (const phaseId of phases) {
    const before = new Map<string, Standing>();
    for (const key of s.standingKeys.get(phaseId) ?? []) {
      const held = s.standingsHeld.get(key);
      if (held !== undefined) before.set(key, held);
      s.standingsSent.delete(key);
      s.standingsHeld.delete(key);
    }
    s.standingKeys.delete(phaseId);
    for (const assembled of ofPhase(s, phaseId, s.unitAt)) {
      if (assembled.entries.length === 0) continue;
      // §5 step 1: `asOf` moves only with a change; a Standing the re-baseline leaves as it was keeps the last change's
      const prior = before.get(assembled.standingKey);
      const st = prior !== undefined && textOf(prior) === textOf(assembled) ? { ...assembled, asOf: prior.asOf } : assembled;
      remember(s, phaseId, st);
      out.push(st);
    }
  }
  return out;
}
