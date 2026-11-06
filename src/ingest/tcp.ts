import type { Outcome, TimeToBeat } from '@opencanoetiming/c123-contract';
import {
  type CellProblem, type Node, UNASSIGNED, Unit, asArray, at, classificationRow, commaCells, isNaRace, faultsFromCells, fmtOf, gatesFromCells, int, judgingComplete, num, r3, readDoc,
  splitRaceId, sumJudged, unparseableUnit, usable, zonedInstant,
} from './common.js';
import { type Candidates, emitPhase } from './phase.js';
import { type RowIn, buildRow, rowIsResult, splitsOf } from './rows.js';
import type { IngestContext, IngestElement } from './types.js';

const tokenOf = (phaseId: string): string => splitRaceId(phaseId).token;

/** Numeric attribute: an empty one is absent, an unreadable one is reported. */
function numAttr(u: Unit, where: string, n: Node | undefined, name: string, f: (s: string) => number | undefined): number | undefined {
  const raw = at(n, name);
  const v = f(raw);
  if (v === undefined && raw.trim() !== '') u.diagnostic({ kind: 'unparseable-field', where, name, text: raw });
  return v;
}

// ---------------------------------------------------------------- Results

function results(u: Unit, ctx: IngestContext, res: Node): void {
  const phaseId = at(res, 'RaceId');
  if (phaseId === UNASSIGNED || isNaRace(phaseId, at(res, 'ClassId'))) return;
  if (phaseId === '') {
    u.diagnostic({ kind: 'unparseable-field', where: 'Results', name: 'RaceId', text: '' });
    return;
  }
  const classId = at(res, 'ClassId');
  if (classId !== '' && classId !== 'NA') {
    u.obs('result-row', 'code', { classId }, classId);
    if (at(res, 'MainTitle').trim() !== '') u.obs('result-row', 'name', { classId }, at(res, 'MainTitle'));
  }
  const fmt = fmtOf(tokenOf(phaseId));
  const rows = asArray(res['Row']);
  for (const row of rows) {
    const p = row['Participant'] as Node | undefined;
    const entryId = at(p, 'Id');
    if (entryId === '') continue;
    const key = { entryId };
    u.obs('result-row', 'displayName', key, at(p, 'Name'));
    if (at(p, 'Club').trim() !== '') u.obs('result-row', 'club', key, at(p, 'Club'));
    if (at(p, 'Nat').trim() !== '') u.obs('result-row', 'nation', key, at(p, 'Nat'));
  }
  if (fmt.kind === 'classification') {
    if (fmt.token === 'RXER') return;
    const crows = rows.flatMap((row) => {
      const p = row['Participant'] as Node | undefined;
      const r = asArray(row['Result'])[0];
      return classificationRow(u, `${phaseId}:${at(p, 'Bib').trim()}`, { entryId: at(p, 'Id'), bib: at(p, 'Bib'), rank: at(r, 'Rank'), order: at(r, 'RankOrder'), decidedIn: '' }) ?? [];
    });
    u.add({ snapshot: { source: 'tcp', phaseId, mode: crows.some((r) => r['rank'] !== null && r['rank'] !== undefined) ? 'results' : 'start-list', rows: crows } }); // §4.10: a scope snapshot of ClassificationRows
    return;
  }
  const env = { u, phaseId, fmt, slots: ctx.courses?.[phaseId]?.slots, date: ctx.phaseDates?.[phaseId], zone: ctx.zone };
  const built: Record<string, unknown>[] = [];
  for (const row of rows) {
    const p = row['Participant'] as Node | undefined;
    const r = asArray(row['Result'])[0];
    const bib = at(p, 'Bib').trim();
    if (bib === '' || r === undefined) {
      u.diagnostic({ kind: 'unparseable-field', where: phaseId, name: bib === '' ? 'Bib' : 'Result', text: at(p, 'Bib') });
      continue;
    }
    const where = `${phaseId}:${bib}`;
    const input: RowIn = {
      bib, entryId: at(p, 'Id'), startOrder: at(p, 'StartOrder'), startTime: at(p, 'StartTime'), mark: at(r, 'IRM'), pp: at(r, 'PP'),
      time: numAttr(u, where, r, 'Time', num), pen: numAttr(u, where, r, 'Pen', int), total: numAttr(u, where, r, 'Total', num),
      pairTotal: num(at(r, 'Total')), gates: at(r, 'Gates'), rank: at(r, 'Rank'), rankOrder: at(r, 'RankOrder'), heat: at(r, 'HeatNr'), q: at(r, 'Q'),
      xml: undefined,
    };
    built.push(buildRow(env, input));
  }
  u.add({ snapshot: { source: 'tcp', phaseId, mode: built.some(rowIsResult) ? 'results' : 'start-list', rows: built } });
}

// ---------------------------------------------------------------- OnCourse

function onCourse(u: Unit, ctx: IngestContext, oc: Node): void {
  const p = oc['Participant'] as Node | undefined;
  if (p === undefined) {
    if (int(at(oc, 'Total')) === 0) u.add({ event: 'oncourse-empty' });
    else u.add({ unparseable: { reason: 'oncourse-without-participant', text: `Total=${at(oc, 'Total')}` } });
    return;
  }
  const phaseId = at(p, 'RaceId');
  if (phaseId === UNASSIGNED || isNaRace(phaseId)) return;
  const results = asArray(oc['Result']);
  const c = results.find((r) => at(r, 'Type') === 'C');
  const t = results.find((r) => at(r, 'Type') === 'T');
  const bib = at(p, 'Bib').trim();
  if (phaseId === '' || bib === '' || c === undefined) {
    u.add({ unparseable: { reason: 'oncourse-incomplete', text: `RaceId=${phaseId} Bib=${bib} Result[C]=${c === undefined ? 'absent' : 'present'}` } });
    return;
  }
  const attemptId = `${phaseId}:${bib}`;
  const key = { attemptId };
  const fmt = fmtOf(tokenOf(phaseId));
  const slots = ctx.courses?.[phaseId]?.slots;
  const inst = (s: string): string | undefined => zonedInstant(ctx.phaseDates?.[phaseId], s, ctx.zone);
  const dtStart = at(c, 'dtStart').trim();
  const dtFinish = at(c, 'dtFinish').trim();

  // §4.1 status: a Cross heat's listing is on-course; otherwise the finish transition decides
  const finishAt = dtFinish !== '' ? inst(dtFinish) : undefined;
  if (fmt.heats) u.obs('inference', 'status', key, 'on-course');
  else if (dtFinish !== '') u.obs('inference', 'status', key, 'finished', 'authoritative', finishAt !== undefined ? { eventTime: finishAt } : {});
  else u.obs('inference', 'status', key, dtStart !== '' ? 'on-course' : 'at-start');
  // §4.11 what the stream lists, for the core's generation and contradiction rules
  const stamp = (s: string): string | null => (s === '' ? null : (inst(s) ?? s));
  u.obs('inference', 'onCourse', key, { dtStart: stamp(dtStart), dtFinish: stamp(dtFinish) });

  // §4.6(a) gate cells
  const hasGates = c['@Gates'] !== undefined;
  // no course bound (§0.5): the cells as they stand, no gates or faults, and no unparseable-cell
  const bad: CellProblem[] = [];
  const cells = hasGates ? commaCells(at(c, 'Gates'), usable(slots) ? slots.length : 0, bad, fmt.cross) : [];
  for (const b of bad) u.diagnostic({ kind: 'unparseable-cell', attemptId, source: 'tcp', slot: b.slot, text: b.text });
  const complete = hasGates ? judgingComplete(cells, slots) : null;
  if (hasGates) {
    if (slots === undefined) u.obs('inference', 'cells', key, cells);
    else if (!usable(slots)) u.unavailable('inference', fmt.cross ? 'faults' : 'gates', key, 'not-configured');
    else if (fmt.cross) {
      const f = faultsFromCells(cells, slots);
      if (f !== undefined) u.obs('inference', 'faults', key, f, 'authoritative', { judgingComplete: complete });
    } else u.obs('inference', 'gates', key, gatesFromCells(cells, slots), 'authoritative', { judgingComplete: complete });
  }

  // §4.3 outcome
  const closed = at(c, 'Completed') === 'Y' ? { runClosed: true } : {};
  const time = numAttr(u, attemptId, t, 'Time', num);
  if (dtFinish !== '') {
    if (time === undefined) {
      // an empty Time is absent (recorded: a Cross time-trial listing with a finish impulse and no time): nothing to infer
    } else if (fmt.cross) {
      const o: Outcome = { kind: 'duration', runSeconds: time, penaltySeconds: 0, totalSeconds: time };
      u.obs('inference', 'outcome', key, o, 'inferred', { ...closed, ...(finishAt !== undefined ? { eventTime: finishAt } : {}) });
    }
    else if (!hasGates) u.diagnostic({ kind: 'gates-absent', attemptId });
    else {
      const pen = sumJudged(cells, slots);
      const o: Outcome = { kind: 'duration', runSeconds: time, penaltySeconds: pen, totalSeconds: r3(time + pen) };
      u.obs('inference', 'outcome', key, o, 'inferred',
        { judgingComplete: complete, ...closed, ...(finishAt !== undefined ? { eventTime: finishAt } : {}) });
    }
  } else if (time !== undefined) {
    const pen = fmt.cross ? 0 : numAttr(u, attemptId, t, 'Pen', int); // Pen is ignored in Cross (§4.6(d))
    // an empty Pen is absent, never zero (§0.1): no complete running outcome to state
    if (pen !== undefined) {
      const o: Outcome = { kind: 'running', elapsedSeconds: time, penaltySeconds: pen };
      u.obs('inference', 'outcome', key, o, 'authoritative', { ...(fmt.cross ? {} : { judgingComplete: complete }), ...closed });
    }
  }

  // §4.8
  const pos = int(at(oc, 'Position'));
  if (pos !== undefined && pos > 0) u.obs('inference', 'courseOrder', key, pos);
  const ttb = at(t, 'TTBDiff').trim();
  const ttbSeconds = num(ttb);
  if (ttb !== '' && ttbSeconds === undefined) u.diagnostic({ kind: 'unparseable-field', where: attemptId, name: 'TTBDiff', text: ttb });
  else if (ttbSeconds !== undefined) {
    const holder = at(t, 'TTBName').trim();
    const v: TimeToBeat = { mode: /^[+-]/.test(ttb) ? 'delta' : 'target', seconds: ttbSeconds, ...(holder !== '' ? { holder } : {}) };
    u.obs('inference', 'timeToBeat', key, v);
  }
  const sp = splitsOf(dtStart, [at(c, 'dtSplit1'), at(c, 'dtSplit2')].filter((s) => s.trim() !== ''));
  if (sp !== undefined) u.obs('inference', 'splits', key, sp);
  // §4.9
  if (at(p, 'Id') !== '') u.obs('inference', 'entry', key, { entryId: at(p, 'Id') });
}

// ---------------------------------------------------------------- Schedule, RaceConfig, TVS, TimeOfDay

function schedule(u: Unit, ctx: IngestContext, sc: Node): void {
  const races = asArray(sc['Race']).filter((r) => at(r, 'RaceId') !== UNASSIGNED && at(r, 'RaceId') !== '' && !isNaRace(at(r, 'RaceId')));
  const candidates: Candidates = new Map(Object.entries(ctx.phaseDates ?? {}));
  for (const r of races) candidates.set(at(r, 'RaceId'), ctx.phaseDates?.[at(r, 'RaceId')]);
  for (const r of races) {
    const phaseId = at(r, 'RaceId');
    // TCP Schedule has no DisId, and its StartTime is always empty: neither is a source (§2.1)
    emitPhase(u, 'fragment', { phaseId, token: tokenOf(phaseId), order: numAttr(u, phaseId, r, 'Order', int), statusRaw: at(r, 'RaceStatus') }, candidates);
  }
}

/** §2.3: a `RaceConfig` names no race and no course. It is emitted keyed by its gate string; the Course it refreshes is the core's to find. */
function raceConfig(u: Unit, rc: Node): void {
  const layout = at(rc, 'GateConfig');
  const captionsRaw = at(rc, 'GateCaptions');
  const nrGates = int(at(rc, 'NrGates'));
  const nrSplits = int(at(rc, 'NrSplits'));
  // §2.3 fabricated course signatures; the transmitted count is otherwise ignored
  const signatures: string[] = [];
  if (layout.trim() === '' && nrGates !== undefined && nrGates > 0) signatures.push('empty-layout-nonzero-count');
  if (captionsRaw === '' && layout.trim() !== '') signatures.push('empty-captions');
  if (layout.trim() !== '' && nrGates !== undefined && [...layout].filter((ch) => 'NRDE'.includes(ch)).length !== nrGates) signatures.push('count-mismatch');
  if (signatures.length > 0) u.diagnostic({ kind: 'fabricated-course', signatures });
  u.add({
    courseRefresh: {
      gateString: layout,
      captions: captionsRaw === '' ? [] : captionsRaw.split(','),
      splitsArmed: nrSplits === undefined ? null : nrSplits > 0,
      fabricated: signatures.length > 0,
    },
  });
}

function tvs(u: Unit, n: Node): void {
  const side = (p: 'Odd' | 'Even'): Record<string, string> | null => {
    const bib = at(n, `${p}_Bib`).trim();
    const phaseId = at(n, `${p}_RaceId`);
    return bib === '' || phaseId === '' ? null : { phaseId, bib, attemptId: `${phaseId}:${bib}` };
  };
  u.obs('fragment', 'featuredByUpstream', {}, { odd: side('Odd'), even: side('Even') });
}

// ---------------------------------------------------------------- entry point

/** Parse one TCP message (one `<Canoe123 System=…>` document). Pure; an unreadable message is a result, not a throw. */
export function parseTcp(message: string, ctx: IngestContext): IngestElement[] {
  const doc = readDoc(message, 'Canoe123');
  if (!doc.ok) return unparseableUnit('tcp', ctx, doc.reason, doc.text);
  const u = new Unit('tcp', ctx.observedAt);
  let offset: number | undefined;
  for (const [name, value] of Object.entries(doc.root)) {
    if (name.startsWith('@') || name.startsWith('#')) continue;
    for (const n of Array.isArray(value) ? (value as unknown[]) : [value]) {
      const node = (typeof n === 'object' && n !== null ? n : {}) as Node;
      switch (name) {
        case 'Results': results(u, ctx, node); break;
        case 'OnCourse': onCourse(u, ctx, node); break;
        case 'Schedule': schedule(u, ctx, node); break;
        case 'RaceConfig': raceConfig(u, node); break;
        case 'TVS': tvs(u, node); break;
        case 'TimeOfDay': {
          const text = typeof n === 'string' ? n.trim() : '';
          const at0 = zonedInstant(ctx.eventDate, text, ctx.zone);
          if (at0 === undefined) { if (text === '' || !/^\d{1,2}:\d{2}:\d{2}/.test(text)) u.diagnostic({ kind: 'unparseable-field', where: 'TimeOfDay', name: 'TimeOfDay', text }); }
          else offset = (Date.parse(at0) - Date.parse(ctx.observedAt)) / 1000;
          break;
        }
        case 'TimingInput': break; // raw hardware impulses with no bib: not modelled (DERIVATIONS §9)
        default: u.add({ unknownType: { name } });
      }
    }
  }
  const instance = at(doc.root, 'System');
  if (instance !== '') u.add({ sourceStatus: { tcp: { upstreamInstance: instance, ...(offset !== undefined ? { timingClockOffsetSeconds: offset } : {}) } } });
  return u.finish();
}
