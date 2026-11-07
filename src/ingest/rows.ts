import type { Faults, Gate, Outcome, Placement, Split } from '@opencanoetiming/c123-contract';
import {
  type CellProblem, type Fmt, type Unit, faultsFromCells, fixedCells, gatesFromCells, int, judgingComplete, markOf, r3, sumJudged, usable, zonedInstant,
} from './common.js';
import type { CourseSlot } from './types.js';

const NOT_CONFIGURED = { state: 'unavailable', reason: 'not-configured' } as const;
const NA = { state: 'unavailable', reason: 'not-applicable' } as const;

/** A results row of either interface, with units already normalised to seconds (§0.1). */
export interface RowIn {
  bib: string;
  entryId: string;
  startOrder: string;
  startTime: string;
  /** TCP `IRM`, XML `Status`. */
  mark: string;
  /** TCP `PP`. */
  pp: string;
  time: number | undefined;
  pen: number | undefined;
  total: number | undefined;
  /** TCP `Total` / XML `TotalTotal`, read on a second run only; null where a TCP `Total` is empty (no pair total, §4.12). */
  pairTotal: number | null | undefined;
  gates: string;
  rank: string;
  rankOrder: string;
  heat: string;
  q: string;
  /** XML-only columns; undefined for a TCP row. */
  xml: {
    dtStart: string;
    dtFinish: string;
    totalRank: string;
    totalRankOrder: string;
    betterRun: string;
    memberGates: string[];
    splits: string[];
  } | undefined;
}

export interface RowEnv {
  u: Unit;
  phaseId: string;
  fmt: Fmt;
  slots: CourseSlot[] | undefined;
  date: string | undefined;
  zone: string | undefined;
}

const tod = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const todSeconds = (s: string): number | undefined => {
  const m = tod.exec(s.trim());
  return m === null ? undefined : Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number((m[4] ?? '').padEnd(3, '0') || 0) / 1000;
};
/** `Result[C]@dtSplitN` / `XML.Results.dtSplitN` minus `dtStart` (§4.8). undefined when nothing is stated. */
export function splitsOf(dtStart: string, splits: string[]): Split[] | undefined {
  const start = todSeconds(dtStart);
  const out: Split[] = [];
  splits.forEach((s, i) => {
    const t = todSeconds(s);
    if (start !== undefined && t !== undefined) out.push({ number: i + 1, elapsedSeconds: r3(t - start) });
  });
  return out.length > 0 ? out : undefined;
}

export function buildRow(env: RowEnv, r: RowIn): Record<string, unknown> {
  const { u, phaseId, fmt, slots } = env;
  const source = u.source;
  const attemptId = `${phaseId}:${r.bib}`;
  const x = r.xml;
  const second = fmt.pair?.role === 'second';
  const row: Record<string, unknown> = { bib: r.bib, entry: { entryId: r.entryId } };

  // §4.1 marks
  const m = markOf(r.mark);
  const status = m !== undefined && m !== '*' ? m : undefined;
  if (status !== undefined) row['status'] = status;

  // §4.7 placement: an empty Rank is no placement; the combined rank on a second XML run
  const rank = int(second && x ? x.totalRank : r.rank);
  const order = int(second && x ? x.totalRankOrder : r.rankOrder);
  if (rank !== undefined && order === undefined) {
    u.diagnostic({ kind: 'unparseable-field', where: attemptId, name: 'RankOrder', text: second && x ? x.totalRankOrder : r.rankOrder });
    row['placement'] = null;
  } else row['placement'] = rank === undefined || order === undefined ? null : ({ rank, order } satisfies Placement);

  // §4.1: every row carrying a time, a mark or a placement states underReview, false without the mark; a blank row states nothing (INV-7)
  const star = m === '*' || r.pp.trim() === '*';
  const carrying = r.time !== undefined || m !== undefined || row['placement'] !== null || star;
  if (carrying) row['underReview'] = star;

  // §4.6 gate cells
  const bad: CellProblem[] = [];
  // no course bound (§0.5): the cells as they stand, no gates or faults, and no unparseable-cell (a cell may belong to no slot)
  const cells = fixedCells(r.gates, usable(slots) ? slots.length : 0, bad, fmt.cross);
  for (const b of bad) u.diagnostic({ kind: 'unparseable-cell', attemptId, source, slot: b.slot, text: b.text });
  const hasTime = r.time !== undefined;
  // §4.6(b): blank is thirty missing cells where the row states a result, by a time or a mark; a row stating neither states nothing, `Gates` included
  const statesCells = r.gates.trim() !== '' || hasTime || m !== undefined;
  if (statesCells && slots === undefined) row['cells'] = cells;
  else if (statesCells && !usable(slots)) row[fmt.cross ? 'faults' : 'gates'] = NOT_CONFIGURED; // a bound course with an empty layout: the snapshot's determination
  else if (statesCells && slots !== undefined && fmt.cross) {
    row['gates'] = NA;
    const f = faultsFromCells(cells, slots);
    if (f !== undefined) row['faults'] = f satisfies Faults;
  } else if (statesCells && slots !== undefined) {
    const gates: Gate[] = gatesFromCells(cells, slots);
    if (x !== undefined && x.memberGates.length > 0) {
      const memberBad: CellProblem[] = [];
      const members = x.memberGates.map((g) => fixedCells(g, slots.length, memberBad));
      for (const b of memberBad) u.diagnostic({ kind: 'unparseable-cell', attemptId, source, slot: b.slot, text: b.text });
      const gateSlots = slots.filter((s) => s.kind === 'gate');
      for (const [i, g] of gates.entries()) {
        const mp = members.map((mc) => mc[(gateSlots[i]?.slot ?? i + 1) - 1] ?? null);
        g.memberPenalties = mp;
        if (g.penalty !== null && mp.every((v) => v !== null) && mp.reduce<number>((a, v) => a + (v ?? 0), 0) !== g.penalty) {
          u.diagnostic({ kind: 'member-sum-mismatch', attemptId, gate: g.number, crew: g.penalty, members: mp });
        }
      }
    }
    row['gates'] = gates;
  }
  // §4.6(d): `faults` carries no blank of its own, so it is stamped over the slot cells exactly as `gates` is
  if (fmt.cross ? row['faults'] !== undefined : hasTime) row['judgingComplete'] = judgingComplete(cells, slots);

  // §4.3-4.4 outcome
  const untimed = x !== undefined && fmt.scoringKind === 'duration' && hasTime && rank !== undefined && x.dtFinish.trim() === '';
  // §0.5: a row states what it carries. A mark beside a time stays beside it; `no-result` is the core's presentation (§4.1)
  let outcome: Outcome | typeof NA | undefined;
  if (fmt.heats) outcome = rank !== undefined && order !== undefined ? { kind: 'ordinal', order } : undefined;
  else if (r.time === undefined) outcome = undefined;
  else if (untimed) outcome = NA;
  else if (fmt.cross) outcome = { kind: 'duration', runSeconds: r.time, penaltySeconds: 0, totalSeconds: r.time }; // §4.4: no time penalties in Cross
  else if (second && x === undefined) {
    const pen = sumJudged(cells, slots);
    outcome = { kind: 'duration', runSeconds: r.time, penaltySeconds: pen, totalSeconds: r3(r.time + pen) };
  } else if (r.pen !== undefined && r.total !== undefined) outcome = { kind: 'duration', runSeconds: r.time, penaltySeconds: r.pen, totalSeconds: r.total };
  // an empty Pen or Total is absent, never zero (§0.1): no complete duration to state
  if (outcome !== undefined) row['outcome'] = outcome;
  if (untimed) {
    row['untimed'] = true;
    if (status === undefined) row['status'] = 'finished'; // §4.2: a placed row never seen on course is finished
  }
  if (second && !hasTime && m === undefined) row['timeEmpty'] = true;
  if (second && r.pairTotal !== undefined) row['pairTotal'] = r.pairTotal;
  if (second && fmt.pair?.combination === 'best' && x !== undefined) {
    const c = int(x.betterRun);
    row['countingRun'] = c === 1 || c === 2 ? c : null; // BetterRunNr 0: no pair yet, `not-yet` (§4.4)
  }

  // §4.7 other row fields
  const heat = int(r.heat);
  row['heat'] = heat !== undefined && heat !== 0 ? heat : NA;
  if (fmt.heats) {
    const lane = int(r.startTime);
    if (lane !== undefined) row['startLane'] = lane;
    row['scheduledStart'] = NA;
  } else {
    row['startLane'] = NA;
    const st = zonedInstant(env.date, r.startTime, env.zone);
    if (st !== undefined) row['scheduledStart'] = st;
  }
  const so = int(r.startOrder);
  if (so !== undefined) row['startOrder'] = so;
  // §4.7 qualified: known on every row carrying a time, a mark or a placement outside final/super-final/classification; a stated Q is never dropped
  const noCut = fmt.stage === 'final' || fmt.stage === 'super-final' || fmt.kind === 'classification';
  if (r.q.trim() === 'Q') row['qualified'] = true;
  else if (noCut) row['qualified'] = NA;
  else if (carrying) row['qualified'] = false;
  if (x !== undefined) {
    if (x.dtFinish.trim() !== '') {
      const ft = zonedInstant(env.date, x.dtFinish, env.zone);
      if (ft !== undefined) row['finishTime'] = ft;
    }
    const sp = splitsOf(x.dtStart, x.splits);
    if (sp !== undefined) row['splits'] = sp;
  }

  // §4.2 Kayak Cross heat: a placement is the finish
  if (fmt.heats && rank !== undefined) u.obs('result-row', 'status', { attemptId }, 'finished');

  return row;
}

/** Whether a row states a placement or a mark: the structural test of results mode (§0.3). */
export const rowIsResult = (row: Record<string, unknown>): boolean =>
  (row['placement'] !== null && row['placement'] !== undefined) || row['status'] !== undefined || row['underReview'] === true;
