import { type Node, UNASSIGNED, Unit, asArray, classificationRow, fmtOf, isNaRace, has, int, ms, parseLayout, readDoc, splitRaceId, tx, unparseableUnit } from './common.js';
import { type Candidates, emitCourse, emitPhase } from './phase.js';
import { type RowIn, buildRow, rowIsResult } from './rows.js';
import type { CourseSlot, IngestContext, IngestElement } from './types.js';

const NA = 'not-applicable' as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isTrue = (s: string): boolean => s.trim().toLowerCase() === 'true';

function member(p: Node, sfx: '' | '2', scheme: string | undefined): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  const given = tx(p, 'GivenName' + sfx).trim();
  const family = tx(p, 'FamilyName' + sfx).trim();
  const bd = tx(p, 'Birthdate' + sfx).trim().slice(0, 10);
  const icf = tx(p, 'ICFId' + sfx).trim();
  if (given !== '') m['givenName'] = given;
  if (family !== '') m['familyName'] = family;
  if (DATE.test(bd)) m['birthDate'] = bd;
  if (icf === '') m['externalId'] = null;
  else if (scheme !== undefined) m['externalId'] = { scheme, value: icf };
  return m;
}

/** §3: one Entry from an `XML.Participants` row. */
function entry(u: Unit, p: Node, index: Map<string, Node>, bibHandling: string, ctx: IngestContext): void {
  const entryId = tx(p, 'Id');
  if (entryId === '') return;
  const key = { entryId };
  const team = isTrue(tx(p, 'IsTeam'));
  const crew = tx(p, 'FamilyName2').trim() !== '' || tx(p, 'GivenName2').trim() !== '';
  const name = (s: '' | '2') => `${tx(p, 'FamilyName' + s).trim()} ${tx(p, 'GivenName' + s).trim()}`.trim();
  u.obs('result-row', 'displayName', key, team ? tx(p, 'FamilyName').trim() : crew ? `${name('')}/${name('2')}` : name(''));
  const members: Record<string, unknown>[] = [];
  let partial = false;
  if (team) {
    for (const k of ['Member1', 'Member2', 'Member3']) {
      const ref = tx(p, k);
      if (ref === '') continue;
      const found = index.get(ref);
      if (found === undefined) { u.diagnostic({ kind: 'unresolved-member', entryId, member: ref }); partial = true; }
      else members.push(member(found, '', ctx.externalIdScheme));
    }
  } else {
    members.push(member(p, '', ctx.externalIdScheme));
    if (crew) members.push(member(p, '2', ctx.externalIdScheme));
  }
  if (partial) u.notYet('result-row', 'members', key); // no partial crew (§3)
  else u.obs('result-row', 'members', key, members);
  const club = tx(p, 'Club').trim();
  if (club !== '') u.obs('result-row', 'club', key, club);
  const noc = tx(p, 'NOC').trim();
  if (noc !== '') u.obs('result-row', 'nation', key, noc);
  const cat = tx(p, 'CatId').trim();
  if (cat !== '') u.obs('result-row', 'ageCategoryId', key, cat);
  else u.unavailable('result-row', 'ageCategoryId', key, NA);
  u.obs('result-row', 'isTeam', key, team);
  if (bibHandling === 'EventWide') {
    const eb = tx(p, 'EventBib').trim();
    if (eb !== '') u.obs('result-row', 'eventBib', key, eb);
    else u.notYet('result-row', 'eventBib', key);
  } else if (bibHandling === 'Startlist') u.unavailable('result-row', 'eventBib', key, NA);
}

function rowIn(u: Unit, phaseId: string, r: Node): RowIn | undefined {
  const bib = tx(r, 'Bib').trim();
  if (bib === '') {
    u.diagnostic({ kind: 'unparseable-field', where: phaseId, name: 'Bib', text: tx(r, 'Bib') });
    return undefined;
  }
  const where = `${phaseId}:${bib}`;
  const numeric = (name: string, f: (s: string) => number | undefined): number | undefined => {
    const raw = tx(r, name);
    const v = f(raw);
    if (v === undefined && raw.trim() !== '') u.diagnostic({ kind: 'unparseable-field', where, name, text: raw });
    return v;
  };
  return {
    bib, entryId: tx(r, 'Id'), startOrder: tx(r, 'StartOrder'), startTime: tx(r, 'StartTime'), mark: tx(r, 'Status'), pp: '',
    time: numeric('Time', ms), pen: numeric('Pen', int), total: numeric('Total', ms), pairTotal: numeric('TotalTotal', ms),
    gates: tx(r, 'Gates'), rank: tx(r, 'Rnk'), rankOrder: tx(r, 'RnkOrder'), heat: tx(r, 'HeatNr'), q: tx(r, 'Qualified'),
    xml: {
      dtStart: tx(r, 'dtStart'), dtFinish: tx(r, 'dtFinish'), totalRank: tx(r, 'TotalRnk'), totalRankOrder: tx(r, 'TotalRnkOrder'), betterRun: tx(r, 'BetterRunNr'),
      memberGates: ['Gates1', 'Gates2', 'Gates3'].filter((k) => has(r, k)).map((k) => tx(r, k)),
      splits: ['dtSplit1', 'dtSplit2', 'dtSplit3'].map((k) => tx(r, k)).filter((s) => s.trim() !== ''),
    },
  };
}

/** Parse one XML snapshot: every race in it is a complete statement (§0.3). Pure; a torn read is reported, never parsed. */
export function parseXmlSnapshot(xml: string, ctx: IngestContext): IngestElement[] {
  const doc = readDoc(xml, 'Canoe123Data');
  if (!doc.ok) return unparseableUnit('xml', ctx, doc.reason, doc.text);
  const root = doc.root;
  const u = new Unit('xml', ctx.observedAt);

  const bibHandling = tx(asArray(root['Events'])[0], 'BibHandling').trim();
  const schedule = asArray(root['Schedule']).filter((s) => tx(s, 'RaceId') !== UNASSIGNED && tx(s, 'RaceId') !== '' && !isNaRace(tx(s, 'RaceId'), tx(s, 'ClassId')));
  const layouts = new Map<string, string>();
  for (const c of asArray(root['CourseData'])) layouts.set(tx(c, 'CourseNr').trim(), tx(c, 'CourseConfig'));

  // dates and candidates for pairing: this snapshot first, then what the caller knows
  const dates = new Map<string, string | undefined>(Object.entries(ctx.phaseDates ?? {}));
  const candidates: Candidates = new Map(dates);
  for (const s of schedule) {
    const id = tx(s, 'RaceId');
    const st = tx(s, 'StartTime').trim().slice(0, 10);
    if (DATE.test(st)) dates.set(id, st);
    candidates.set(id, dates.get(id));
  }
  const tokenOf = (s: Node): string => tx(s, 'DisId').trim() || splitRaceId(tx(s, 'RaceId')).token;

  // §1 Class
  const crossClass = new Set<string>();
  for (const s of schedule) if (fmtOf(tokenOf(s)).cross) crossClass.add(tx(s, 'ClassId'));
  for (const c of asArray(root['Classes'])) {
    const classId = tx(c, 'ClassId');
    if (classId === '' || classId === 'NA') continue;
    const key = { classId };
    u.obs('result-row', 'code', key, classId);
    if (tx(c, 'Class').trim() !== '') u.obs('result-row', 'name', key, tx(c, 'Class'));
    u.obs('result-row', 'discipline', key, crossClass.has(classId) ? 'cross' : 'slalom', 'inferred');
    u.obs('result-row', 'ageCategories', key, asArray(c['Categories']).map((k) => ({ ageCategoryId: tx(k, 'CatId'), name: tx(k, 'Category') })));
  }

  // §2.3 Course
  for (const [courseId, layout] of layouts) emitCourse(u, 'result-row', 'xml', courseId, layout, undefined, false);

  // §2.1 Phase
  for (const s of schedule) {
    emitPhase(u, 'result-row', {
      phaseId: tx(s, 'RaceId'), token: tokenOf(s), order: int(tx(s, 'RaceOrder')), statusRaw: tx(s, 'RaceStatus'),
      xml: { classId: tx(s, 'ClassId'), startTime: tx(s, 'StartTime'), courseNr: tx(s, 'CourseNr'), title: tx(s, 'CustomTitle') },
    }, candidates);
  }

  // §3 Entry
  const participants = asArray(root['Participants']);
  const index = new Map<string, Node>();
  for (const p of participants) index.set(tx(p, 'Id'), p);
  for (const p of participants) entry(u, p, index, bibHandling, ctx);

  // §0.3 / §4 one snapshot per race
  const byRace = new Map<string, Node[]>();
  for (const r of asArray(root['Results'])) {
    const id = tx(r, 'RaceId');
    if (id === UNASSIGNED || id === '' || isNaRace(id)) continue;
    const list = byRace.get(id);
    if (list === undefined) byRace.set(id, [r]);
    else list.push(r);
  }
  const races = [...new Set([...schedule.map((s) => tx(s, 'RaceId')), ...byRace.keys()])];
  const sched = new Map(schedule.map((s) => [tx(s, 'RaceId'), s]));
  for (const phaseId of races) {
    const s = sched.get(phaseId);
    const fmt = fmtOf(s !== undefined ? tokenOf(s) : splitRaceId(phaseId).token);
    const rows = byRace.get(phaseId) ?? [];
    if (fmt.kind === 'classification') {
      if (fmt.token === 'RXER') continue;
      const crows = rows.flatMap((r) => classificationRow(u, `${phaseId}:${tx(r, 'Bib').trim()}`, {
        entryId: tx(r, 'Id'), bib: tx(r, 'Bib'), rank: tx(r, 'Rnk'), order: tx(r, 'RnkOrder'), decidedIn: tx(r, 'RecordType'),
      }) ?? []);
      u.add({ snapshot: { source: 'xml', phaseId, mode: crows.some((r) => r['rank'] !== null && r['rank'] !== undefined) ? 'results' : 'start-list', rows: crows } }); // §4.10: a scope snapshot of ClassificationRows
      continue;
    }
    // the bound course is the caller's; the snapshot's own CourseData is the fallback, without captions
    const courseNr = s !== undefined ? tx(s, 'CourseNr').trim() : '';
    const bound = ctx.courses?.[phaseId];
    let slots: CourseSlot[] | undefined = bound?.slots;
    if (courseNr !== '' && layouts.has(courseNr) && bound?.courseId !== courseNr) slots = parseLayout(layouts.get(courseNr) ?? '').slots;
    const env = { u, phaseId, fmt, slots, date: dates.get(phaseId), zone: ctx.zone };
    const built: Record<string, unknown>[] = [];
    for (const r of rows) {
      const input = rowIn(u, phaseId, r);
      if (input !== undefined) built.push(buildRow(env, input));
    }
    u.add({ snapshot: { source: 'xml', phaseId, mode: built.some(rowIsResult) ? 'results' : 'start-list', rows: built } });
  }
  return u.finish();
}

