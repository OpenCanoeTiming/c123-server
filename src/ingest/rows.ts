import type { Outcome } from '@opencanoetiming/c123-contract';
import {
  type CellProblem, type Fmt, type Unit, faultsFromCells, fixedCells, gatesFromCells, int, judgingComplete, markOf, r3, sumJudged, usable, zonedInstant,
} from './common.js';
import type { CourseSlot } from './types.js';

const NA = { state: 'unavailable', reason: 'not-applicable' } as const;
const NOT_CONFIGURED = { state: 'unavailable', reason: 'not-configured' } as const;

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
  /** TCP `Total` / XML `TotalTotal`, read on a second run only. */
  pairTotal: number | undefined;
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
    prev: { mark: string; time: number | undefined; pen: number | undefined; total: number | undefined; rank: string; rankOrder: string } | undefined;
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
export function splitsOf(dtStart: string, splits: string[]): { number: number; elapsedSeconds: number }[] | undefined {
  const start = todSeconds(dtStart);
  const out: { number: number; elapsedSeconds: number }[] = [];
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
  if (m === '*' || r.pp.trim() === '*') row['underReview'] = true;

  // §4.7 placement: an empty Rank is no placement; the combined rank on a second XML run
  const rank = int(second && x ? x.totalRank : r.rank);
  const order = int(second && x ? x.totalRankOrder : r.rankOrder);
  if (rank !== undefined && order === undefined) {
    u.diagnostic({ kind: 'unparseable-field', where: attemptId, name: 'RankOrder', text: second && x ? x.totalRankOrder : r.rankOrder });
    row['placement'] = null;
  } else row['placement'] = rank === undefined || order === undefined ? null : { rank, order };

  // §4.6 gate cells
  const bad: CellProblem[] = [];
  const cells = fixedCells(r.gates, usable(slots) ? slots.length : 30, bad);
  for (const b of bad) u.diagnostic({ kind: 'unparseable-cell', attemptId, source, slot: b.slot, text: b.text });
  const hasTime = r.time !== undefined;
  if (fmt.cross) {
    row['gates'] = NA;
    if (!usable(slots)) row['faults'] = NOT_CONFIGURED;
    else {
      const f = faultsFromCells(cells, slots);
      if (f !== undefined) row['faults'] = f;
    }
  } else {
    if (!usable(slots)) row['gates'] = NOT_CONFIGURED;
    else {
      const gates: Record<string, unknown>[] = gatesFromCells(cells, slots);
      if (x !== undefined && x.memberGates.length > 0) {
        const members = x.memberGates.map((g) => fixedCells(g, slots.length, []));
        gates.forEach((g, i) => {
          const slot = slots.filter((s) => s.kind === 'gate')[i];
          const mp = members.map((mc) => mc[(slot?.slot ?? i + 1) - 1] ?? null);
          g['memberPenalties'] = mp;
          const crew = g['penalty'] as number | null;
          if (crew !== null && mp.every((v) => v !== null) && (mp as number[]).reduce((a, v) => a + v, 0) !== crew) {
            u.diagnostic({ kind: 'member-sum-mismatch', attemptId, gate: g['number'], crew, members: mp });
          }
        });
      }
      row['gates'] = gates;
    }
    if (hasTime) row['judgingComplete'] = judgingComplete(cells, slots);
  }

  // §4.3-4.4 outcome
  const untimed = x !== undefined && fmt.scoringKind === 'duration' && hasTime && rank !== undefined && x.dtFinish.trim() === '';
  let outcome: Outcome | typeof NA | undefined;
  if (status !== undefined && status !== 'non-ranked') outcome = { kind: 'no-result', status: status as 'dns' };
  else if (fmt.heats) outcome = rank !== undefined && order !== undefined ? { kind: 'ordinal', order } : undefined;
  else if (!hasTime) outcome = undefined;
  else if (untimed) outcome = NA;
  else {
    const run = r.time as number;
    const o: Record<string, number | string> = { kind: 'duration', runSeconds: run };
    if (second && x === undefined) {
      const pen = sumJudged(cells, slots);
      o['penaltySeconds'] = pen;
      o['totalSeconds'] = r3(run + pen);
    } else {
      if (r.pen !== undefined) o['penaltySeconds'] = r.pen;
      if (r.total !== undefined) o['totalSeconds'] = r.total;
    }
    outcome = o as unknown as Outcome;
  }
  if (outcome !== undefined) row['outcome'] = outcome;
  if (second && !hasTime && m === undefined) row['timeEmpty'] = true;
  if (second && r.pairTotal !== undefined) row['pairTotal'] = r.pairTotal;
  if (second && fmt.pair?.combination === 'best' && x !== undefined) {
    const c = int(x.betterRun);
    if (c === 1 || c === 2) row['countingRun'] = c;
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
  row['qualified'] = r.q.trim() === 'Q' ? true : fmt.progression ? false : NA;
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

  // §4.5 run 1's detail from the second run's Prev* columns
  if (second && x?.prev !== undefined) {
    const p = x.prev;
    const pm = markOf(p.mark);
    const key = { attemptId };
    if (pm !== undefined && pm !== '*') u.obs('result-row', 'outcome', key, { kind: 'no-result', status: pm }, 'authoritative', { run: 1 });
    else if (p.time !== undefined) {
      const o: Record<string, unknown> = { kind: 'duration', runSeconds: p.time };
      if (p.pen !== undefined) o['penaltySeconds'] = p.pen;
      if (p.total !== undefined) o['totalSeconds'] = p.total;
      u.obs('result-row', 'outcome', key, o, 'authoritative', { run: 1 });
    }
    const pr = int(p.rank);
    const po = int(p.rankOrder);
    if (pr !== undefined && po !== undefined) u.obs('result-row', 'placement', key, { rank: pr, order: po }, 'authoritative', { run: 1 });
  }
  return row;
}

/** Whether a row states a placement or a mark: the structural test of results mode (§0.3). */
export const rowIsResult = (row: Record<string, unknown>): boolean =>
  (row['placement'] !== null && row['placement'] !== undefined) || row['status'] !== undefined || row['underReview'] === true;
