/**
 * The Standings of the merge core (#205; CONTRACTS §5 step 1): which Attempts feed which scope, and which of them changed. The assembly
 * itself is `standing.ts`. A unit marks the Phases it touched (`dirtyScopes`); only those are assembled, and a Standing leaves only when
 * its serialised entries and anomalies differ from the ones last sent. An Attempt joins the marked set only when what a Standing reads of
 * it changed, so a running tick, which is in none of that, assembles nothing.
 */
import type { Standing } from '@opencanoetiming/c123-contract';
import { splitRaceId } from '../ingest/common.js';
import { assembleStanding, type EntryInput } from './standing.js';
import { isMark, present } from './precedence.js';
import { fmtFor, siblingPhaseId } from './registry.js';
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
const isEntry = (f: StandingFacts): boolean => f.placement !== null || f.status === 'finished' || isMark(f.status);

const keyOf = (kind: string, phaseId: string, heat: number | undefined, category: string | null): string =>
  `${kind}:${phaseId}${heat === undefined ? '' : `:${heat}`}/${category ?? 'all'}`;

/** Every Standing of one Phase. A Standing with no entries is returned only where one was sent before. */
function ofPhase(s: CoreState, phaseId: string, asOf: string): Standing[] {
  const classId = splitRaceId(phaseId).classKey;
  const out: Standing[] = [];
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

  const facts = [...(s.phases.get(phaseId)?.attempts ?? [])].flatMap((a) => (a.facts !== undefined && isEntry(a.facts) ? [a.facts] : []));
  const inputs: EntryInput[] = facts.map((f) => ({
    ...f, ageCategoryId: categoryOf(s, f.entryId),
  }));
  const duration = fmt.scoringKind === 'duration';
  const scoped = (kind: 'phase' | 'pair', scope: Standing['scope']): void => {
    const common = { entries: inputs, durationScored: duration, cross: fmt.cross };
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
    // §5 step 1: the pair exists once `pair.siblingPhaseId` is known. A parser's `null` says the schedule has not named it; with no `pair`
    // observed at all (a stream of snapshots alone, vector standing-not-resent-on-running-tick) the format token names the first run.
    const stated = s.phases.get(phaseId)?.plain.get('pair') as { siblingPhaseId?: string | null } | undefined;
    const first = stated === undefined ? siblingPhaseId(s, phaseId) : (stated.siblingPhaseId ?? undefined);
    if (first !== undefined) scoped('pair', { kind: 'pair', firstPhaseId: first, secondPhaseId: phaseId });
  }
  if (fmt.heats) {
    for (const heat of [...new Set(facts.flatMap((f) => (f.heat === null ? [] : [f.heat])))].sort((a, b) => a - b)) {
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
  for (const id of [...phases]) {
    const sibling = fmtFor(s, id).pair?.role === 'first' ? siblingPhaseId(s, id) : undefined;
    if (sibling !== undefined && s.phases.has(sibling)) phases.add(sibling);
  }
  const out: Standing[] = [];
  for (const phaseId of phases) {
    for (const key of s.standingKeys.get(phaseId) ?? []) s.standingsSent.delete(key);
    s.standingKeys.delete(phaseId);
    for (const st of ofPhase(s, phaseId, s.unitAt)) {
      if (st.entries.length === 0) continue;
      remember(s, phaseId, st);
      out.push(st);
    }
  }
  return out;
}
