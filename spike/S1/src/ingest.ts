// Direct-injection ingest: upstream messages (TCP, XML snapshot) → CONFORMANCE-VECTORS §1 elements → merge core.
// DERIVATIONS §0–§4 are implemented here; no clock of the process is read: every time is the recorded observedAt.
import { Domain } from './merge.js';
import { cellsToGates, fabricatedCourse, parseComma, parseFixedWidth, parseLayout, type Layout } from './gates.js';
import { readSnapshot, int } from './snapshot.js';
import { parseTcp, type OnCourseMsg, type ResultsMsg } from './tcp.js';
import type { Delta, Element, FieldStatement, Gate, SnapshotRow } from './types.js';
import { eventTimeOf, r3 } from './util.js';

export type IngestConfig = { zone: string; leaveAfterMs: number; registryScheme: string };
export type StepRecord = { step: number; element: Record<string, unknown>; deltas: Delta[]; stateHash: string };

const UNASSIGNED = '<unassigned>';
const PSEUDO_CLASS = 'NA';

/** CONTRACTS §3.1: Canoe123's 14-value race status collapsed into the closed set. */
export function phaseStatus(code: number | undefined): string | undefined {
  if (code === undefined) return undefined;
  if ([0, 1, 8, 12].includes(code)) return 'scheduled';
  if (code === 3) return 'running';
  if ([2, 11].includes(code)) return 'paused';
  if ([4, 9].includes(code)) return 'unofficial';
  return ({ 5: 'official', 6: 'revised', 10: 'protested', 13: 'postponed', 7: 'cancelled' } as Record<number, string>)[code] ?? 'other';
}

/** DERIVATIONS §4.1 closed-set mapping of result marks ('*' is underReview, handled separately). */
export function markOf(s: string): string {
  const m: Record<string, string> = { DNS: 'dns', DNF: 'dnf', CAP: 'cap', RAL: 'ral', DSQ: 'dsq', 'DSQ-R': 'dsq-r', DQB: 'dqb', 'NON-RK': 'non-ranked' };
  return m[s.trim().toUpperCase()] ?? 'other';
}

const num = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const s = v.trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export type IngestStats = Record<string, number>;

export class Ingest {
  d: Domain;
  cfg: IngestConfig;
  private lastSeen = new Map<string, number>();
  private tcpConnected = false;
  private stepNo = 0;
  stats: IngestStats = {};
  private layoutCache = new Map<string, Layout>();
  private captionsByLayout = new Map<string, string[]>();   // RaceConfig: captions are TCP only (DERIVATIONS §2.3)

  constructor(d: Domain, cfg: IngestConfig, private onStep: (r: StepRecord) => void) {
    this.d = d;
    this.cfg = cfg;
  }

  private count(k: string, n = 1) { this.stats[k] = (this.stats[k] ?? 0) + n; }

  private emit(el: Element, element: Record<string, unknown>) {
    const r = this.d.apply(el);
    if (r.notes.length) element.inv2cRefused = r.notes;
    const a = 'attemptId' in el && el.attemptId ? this.d.attempts.get(el.attemptId) : undefined;
    if (a) element.run = (a as any).gen;
    this.onStep({ step: ++this.stepNo, element, deltas: r.deltas, stateHash: this.d.stateHash() });
  }

  // ───────────────────────────── course lookup ─────────────────────────────

  /** The Phase's course layout: 'unknown' before the snapshot binds it, 'not-configured' for an empty layout. */
  private course(phaseId: string): { state: 'unknown' } | { state: 'not-configured' } | { state: 'known'; layout: Layout } {
    const ph = this.d.entities.get(`phase:${phaseId}`);
    const cid = ph?.presented.courseId;
    if (!cid || cid.state !== 'known') return { state: 'unknown' };
    const c = this.d.entities.get(`course:${cid.value}`);
    const lay = c?.presented.layout;
    if (!lay || lay.state !== 'known') return { state: 'unknown' };
    const s = lay.value as string;
    if (s === '') return { state: 'not-configured' };
    let l = this.layoutCache.get(s);
    if (!l) { l = parseLayout(s); this.layoutCache.set(s, l); }
    return { state: 'known', layout: l };
  }

  /** DERIVATIONS §4.6(d): Cross faults from the judging cells plus the captions (TCP only); never from Pen. */
  private faultsOf(cells: (number | null)[], layout: Layout, layoutString: string): { count: number; gates: string[]; lastCleanSlot: number } | undefined {
    const caps = this.captionsByLayout.get(layoutString.replace(/[SI]/g, ''));
    if (!caps) return undefined;
    const faulted = cells.map((c, i) => (c === 2 ? i : -1)).filter((i) => i >= 0);
    const first = faulted.length ? faulted[0]! : cells.length;
    let lastClean = 0;
    for (let i = 0; i < first; i++) if (cells[i] === 0) lastClean = i + 1;
    void layout;
    return { count: faulted.length, gates: faulted.map((i) => caps[i] ?? String(i + 1)), lastCleanSlot: lastClean };
  }

  private layoutString(phaseId: string): string {
    const ph = this.d.entities.get(`phase:${phaseId}`);
    const cid = ph?.presented.courseId;
    const c = cid?.state === 'known' ? this.d.entities.get(`course:${cid.value}`) : undefined;
    return c?.presented.layout?.state === 'known' ? (c.presented.layout as any).value as string : '';
  }

  // ───────────────────────────── TCP ─────────────────────────────

  tcp(text: string, observedAt: string) {
    this.count('tcp.messages');
    let msg;
    try { msg = parseTcp(text); } catch { this.count('tcp.unparseable'); return; }
    this.count(`tcp.type.${msg.type}`);
    if (!this.tcpConnected) {
      // The recording carries no connection events (recorder.js): the replay connects at the first TCP message.
      this.tcpConnected = true;
      this.emit({ type: 'event', event: 'tcp-connected', observedAt }, { class: 'event', event: 'tcp-connected', observedAt });
    }
    this.checkLeaves(observedAt);
    switch (msg.type) {
      case 'OnCourse': return this.onCourse(msg, observedAt);
      case 'Results': return this.results(msg, observedAt);
      case 'Schedule': {
        const races = msg.races.filter((r) => r.RaceId && r.RaceId !== UNASSIGNED).map((r) => ({
          raceId: r.RaceId!, order: int(r.Order), statusCode: int(r.RaceStatus), status: phaseStatus(int(r.RaceStatus)),
        }));
        return this.emit({ type: 'structure', observedAt, source: 'tcp', what: 'schedule', payload: { races } },
          { class: 'observation', scope: 'phase', what: 'schedule', source: 'tcp', kind: 'structure', fields: ['status', 'programmeOrder'], observedAt });
      }
      case 'RaceConfig': {
        const a = msg.a;
        const layout = a.GateConfig ?? '', captions = a.GateCaptions ?? '', nrGates = int(a.NrGates) ?? 0;
        const fabricated = fabricatedCourse(layout, captions, nrGates);
        if (fabricated) this.count('tcp.raceconfig.fabricated');
        else if (captions !== '') this.captionsByLayout.set(layout, captions.split(','));
        return this.emit({ type: 'structure', observedAt, source: 'tcp', what: 'raceconfig',
          payload: { layout, captions: captions === '' ? [] : captions.split(','), nrSplits: int(a.NrSplits) ?? 0, fabricated } },
          { class: 'observation', scope: 'course', what: 'raceconfig', source: 'tcp', kind: 'structure', fields: ['captions'], fabricated, observedAt });
      }
      case 'TimeOfDay':
        return this.emit({ type: 'structure', observedAt, source: 'tcp', what: 'timeofday', payload: { time: msg.time, system: msg.system } },
          { class: 'observation', scope: 'sources', what: 'timeofday', source: 'tcp', kind: 'structure', observedAt });
      case 'TVS': {
        const a = msg.a;
        return this.emit({ type: 'structure', observedAt, source: 'tcp', what: 'tvs',
          payload: { oddBib: a.Odd_Bib?.trim() || null, oddRaceId: a.Odd_RaceId || null, evenBib: a.Even_Bib?.trim() || null, evenRaceId: a.Even_RaceId || null } },
          { class: 'observation', scope: 'oncourse', what: 'tvs', source: 'tcp', kind: 'structure', observedAt });
      }
      case 'TimingInput': return;       // raw impulses with no bib: not modelled (DERIVATIONS §9)
      default: this.count(`tcp.unknownType.${msg.name}`); return;
    }
  }

  /** "Stopped listing": OnCourse re-sends every listed athlete at least once a second (DERIVATIONS §4.1). */
  private checkLeaves(observedAt: string) {
    const now = Date.parse(observedAt);
    const gone = [...this.lastSeen.entries()].filter(([, t]) => now - t > this.cfg.leaveAfterMs).map(([id]) => id).sort();
    for (const id of gone) {
      this.lastSeen.delete(id);
      this.emit({ type: 'event', event: 'oncourse-left', observedAt, attemptId: id }, { class: 'event', event: 'oncourse-left', attemptId: id, observedAt });
    }
  }

  private onCourse(m: OnCourseMsg, observedAt: string) {
    if (m.empty || !m.p) {
      this.lastSeen.clear();
      return this.emit({ type: 'event', event: 'oncourse-empty', observedAt }, { class: 'event', event: 'oncourse-empty', observedAt });
    }
    const raceId = m.p.RaceId ?? '';
    if (!raceId || raceId === UNASSIGNED) { this.count('tcp.oncourse.unassigned'); return; }
    const bib = (m.p.Bib ?? '').trim();
    if (!bib) { this.count('tcp.oncourse.noBib'); return; }
    const attemptId = `${raceId}:${bib}`;
    const date = this.d.phaseDate(raceId, observedAt);
    const c = m.c ?? {}, t = m.t ?? {};
    const dtStart = c.dtStart?.trim() ? eventTimeOf(date, c.dtStart, this.cfg.zone) : null;
    const dtFinish = c.dtFinish?.trim() ? eventTimeOf(date, c.dtFinish, this.cfg.zone) : null;
    if (c.dtStart?.trim() && !dtStart) this.count('tcp.oncourse.badStart');
    const fields: FieldStatement[] = [];
    const conf = { confidence: 'authoritative' as const };
    const info = this.d.phaseInfo(raceId);
    // DERIVATIONS §4.1. A listing with no dtStart is at-start (chStart is the arming flag; S1-reading, DESIGN-GAPS).
    // §4.2: in a Cross heat nothing transitions per competitor; a listed heat competitor is on course.
    fields.push({ field: 'status', value: info.cross && info.heats ? 'on-course' : dtFinish ? 'finished' : dtStart ? 'on-course' : 'at-start', ...conf });
    if (!dtStart && c.chStart !== '1') this.count('tcp.oncourse.listedNotArmedNoStart');
    const course = this.course(raceId);
    let cells: (number | null)[] | null = null;
    if (c.Gates !== undefined && info.cross) {
      if (course.state === 'known') {
        const p = parseComma(c.Gates, course.layout.slots.length);
        cells = p.cells;
        fields.push({ field: 'gates', state: 'unavailable', reason: 'not-applicable' });
        const f = this.faultsOf(p.cells, course.layout, this.layoutString(raceId));
        if (f) fields.push({ field: 'faults', value: f, ...conf });
      }
    } else if (c.Gates !== undefined) {
      if (course.state === 'known') {
        const p = parseComma(c.Gates, course.layout.slots.length);
        cells = p.cells;
        fields.push({ field: 'gates', value: cellsToGates(p.cells, course.layout), ...conf });
        if (p.unparseable.length) this.count('tcp.oncourse.unparseableCell', p.unparseable.length);
      } else if (course.state === 'not-configured') fields.push({ field: 'gates', state: 'unavailable', reason: 'not-configured' });
    }
    const time = info.cross && info.heats ? undefined : num(t.Time);
    let finishRunSeconds: number | null = null;
    if (dtFinish && time !== undefined) {
      // §4.3 duration inference: run = T@Time (2 dp at the finish), penalty = Σ judged cells of C@Gates.
      const pen = info.cross ? 0 : cells ? cells.reduce<number>((s, x) => s + (x ?? 0), 0) : (num(t.Pen) ?? 0);   // Cross: Pen ignored (§4.6(d))
      finishRunSeconds = time;
      fields.push({ field: 'outcome', value: { kind: 'duration', runSeconds: time, penaltySeconds: pen, totalSeconds: r3(time + pen) }, confidence: 'inferred' });
    } else if (dtStart && !dtFinish && time !== undefined) {
      fields.push({ field: 'outcome', value: { kind: 'running', elapsedSeconds: time, penaltySeconds: num(t.Pen) ?? 0 }, ...conf });
    }
    if (m.position !== null && m.position > 0) fields.push({ field: 'courseOrder', value: m.position, ...conf });
    else this.count(dtFinish ? 'tcp.oncourse.finisherNoPosition' : 'tcp.oncourse.noPosition');
    if (dtFinish) this.count(m.position !== null && m.position > 0 ? 'tcp.oncourse.finisherWithPosition' : 'tcp.oncourse.finisherNoPosition_');
    const ttb = (t.TTBDiff ?? '').trim();
    if (ttb !== '' && num(ttb) !== undefined) {
      const holder = (t.TTBName ?? '').trim();
      fields.push({ field: 'timeToBeat', value: { mode: /^[+-]/.test(ttb) ? 'delta' : 'target', seconds: num(ttb)!, ...(holder ? { holder } : {}) }, ...conf });
    }
    if (m.p.Id) fields.push({ field: 'entry', value: { entryId: m.p.Id }, ...conf });
    const so = int(m.p.StartOrder);
    if (so !== undefined) fields.push({ field: 'startOrder', value: so, ...conf });
    this.lastSeen.set(attemptId, Date.parse(observedAt));
    const completed = c.Completed === 'Y';
    this.emit({ type: 'listing', observedAt, attemptId, dtStart, dtFinish, completed, fields, finishRunSeconds },
      { class: 'on-course-listing', attemptId, source: 'tcp', kind: 'inference', fields: fields.map((f) => f.field), dtStart, dtFinish, completed,
        position: m.position, observedAt });
  }

  private results(m: ResultsMsg, observedAt: string) {
    if (!m.raceId || m.raceId === UNASSIGNED) { this.count('tcp.results.unassigned'); return; }
    if (m.classId === PSEUDO_CLASS) { this.count('tcp.results.pseudoClass'); return; }
    const info = this.d.phaseInfo(m.raceId);
    const second = info.pairRole === 'second';
    const date = this.d.phaseDate(m.raceId, observedAt);
    const course = this.course(m.raceId);
    const rows: SnapshotRow[] = [];
    for (const { p, r } of m.rows) {
      const bib = (p.Bib ?? '').trim();
      if (!bib) { this.count('tcp.results.rowNoBib'); continue; }
      const row: SnapshotRow = { bib };
      if (p.Id) row.entryId = p.Id;
      const so = int(p.StartOrder);
      if (so !== undefined) row.startOrder = so;
      if (p.StartTime?.trim()) row.scheduledStart = eventTimeOf(date, p.StartTime, this.cfg.zone);
      const irm = (r.IRM ?? '').trim(), pp = (r.PP ?? '').trim();
      const star = irm === '*' || pp === '*';
      if (irm && irm !== '*') row.status = markOf(irm);
      const time = num(r.Time), pen = num(r.Pen), total = num(r.Total);
      const rank = num(r.Rank), order = num(r.RankOrder);
      if (info.cross) {
        this.crossRow(row, info, rank, order, time, r.Gates, course, m.raceId, num(r.HeatNr), p.StartTime);
        rows.push(row);
        continue;
      }
      if (order !== undefined) row.placement = { rank: rank ?? null, order };
      this.gatesInto(row, r.Gates, course, 'tcp');
      // The cells parse without the course (fixed width, 30 cells); only presenting them as Gate[] needs it.
      const cellSum = row.gates ? row.gates.reduce((s, g) => s + (g.penalty ?? 0), 0)
        : r.Gates ? parseFixedWidth(r.Gates, 30).cells.reduce<number>((s, x) => s + (x ?? 0), 0) : undefined;
      if (time !== undefined && course.state !== 'known') row.judgingComplete = null;   // completeness unknowable without the course
      if (time !== undefined) {
        row.runSeconds = time;
        if (second) {
          // §4.4: run 2's own figures are Time and the cells; Pen/Total describe the counting run, never used for run 2.
          const p2 = cellSum ?? 0;
          row.outcome = { kind: 'duration', runSeconds: time, penaltySeconds: p2, totalSeconds: r3(time + p2) };
        } else {
          const p1 = pen ?? cellSum ?? 0;
          row.outcome = { kind: 'duration', runSeconds: time, penaltySeconds: p1, totalSeconds: total ?? r3(time + p1) };
        }
      } else if (second && !row.status) row.timeEmpty = true;
      if (second) row.pairTotal = total ?? null;
      if (star || row.status || time !== undefined) row.underReview = star;
      if ((r.Q ?? '').trim() === 'Q') row.qualified = true;
      rows.push(row);
    }
    const mode = rows.some((x) => x.placement || x.status || x.underReview) ? 'results' : 'start-list';
    this.count(`tcp.results.mode.${mode}`);
    const el: Element = { type: 'snapshot', observedAt, source: 'tcp', phaseId: m.raceId, mode, rows, classId: m.classId, mainTitle: m.mainTitle };
    this.emit(el, { class: 'scope-snapshot', source: 'tcp', phaseId: m.raceId, mode, current: m.current, observedAt, rows });
  }

  /**
   * Kayak Cross rows (DERIVATIONS §4.2, §4.6(d), §4.7). Heats: the order is upstream's placement, asserted per athlete;
   * RankOrder alone is the lane order of an undecided heat (E1, cp3-cross), so a placement needs Rank or Time.
   * Time trial: duration from Time, Pen ignored. Cells are fault marks: gates not applicable, faults derived.
   */
  private crossRow(row: SnapshotRow, info: ReturnType<Domain['phaseInfo']>, rank: number | undefined, order: number | undefined, time: number | undefined,
                   gates: string | undefined, course: ReturnType<Ingest['course']>, raceId: string, heatNr: number | undefined, startTime: string | undefined) {
    if (info.heats) {
      row.heat = heatNr && heatNr > 0 ? heatNr : null;
      const lane = num(startTime);
      if (lane !== undefined) row.startLane = lane;
      if (order !== undefined && (rank !== undefined || time !== undefined)) {
        row.placement = { rank: rank ?? null, order };
        row.outcome = { kind: 'ordinal', order };
      }
    } else {
      if (order !== undefined && (rank !== undefined || time !== undefined)) row.placement = { rank: rank ?? null, order };
      if (time !== undefined) { row.runSeconds = time; row.outcome = { kind: 'duration', runSeconds: time, penaltySeconds: 0, totalSeconds: time }; }
    }
    if (gates && gates.trim() && course.state === 'known') {
      const p = parseFixedWidth(gates, course.layout.slots.length);
      const f = this.faultsOf(p.cells, course.layout, this.layoutString(raceId));
      if (f && (row.outcome || row.status)) row.faults = f;
    }
    row.gatesUnavailable = 'not-applicable';
    row.judgingComplete = true;
    if (row.outcome || row.status) row.underReview = false;
  }

  /** §4.6(b) fixed-width gate cells into a row, per the Phase's course. */
  private gatesInto(row: SnapshotRow, gates: string | undefined, course: ReturnType<Ingest['course']>, src: 'tcp' | 'xml') {
    if (gates === undefined || gates === '') return;
    if (course.state === 'not-configured') { row.gatesUnavailable = 'not-configured'; row.judgingComplete = null; return; }
    if (course.state !== 'known') return;
    const p = parseFixedWidth(gates, course.layout.slots.length);
    row.gates = cellsToGates(p.cells, course.layout) as Gate[];
    row.judgingComplete = row.gates.every((g) => g.penalty !== null);
    if (p.unparseable.length) { row.unparseable = p.unparseable; this.count(`${src}.unparseableCell`, p.unparseable.length); }
  }

  // ───────────────────────────── XML snapshot ─────────────────────────────

  xml(text: string, observedAt: string) {
    this.count('xml.snapshots');
    this.emit({ type: 'event', event: 'xml-rewrite-detected', observedAt }, { class: 'event', event: 'xml-rewrite-detected', observedAt });
    const r = readSnapshot(text);
    if (!r.ok) { this.count('xml.invalid'); return; }
    const t = r.tables;
    const bibHandling = t.event.BibHandling ?? '';
    const pById = new Map(t.participants.map((p) => [p.Id ?? '', p]));
    const person = (p: Record<string, string>, two: boolean) => {
      const g = two ? p.GivenName2 : p.GivenName, f = two ? p.FamilyName2 : p.FamilyName, icf = two ? p.ICFId2 : p.ICFId;
      const bd = two ? p.Birthdate2 : p.Birthdate;
      const by = bd && /^\d{4}/.test(bd) ? Number(bd.slice(0, 4)) : (!two ? int(p.Year) ?? null : null);
      return { givenName: g ?? '', familyName: f ?? '', birthYear: by, externalId: icf?.trim() ? { scheme: this.cfg.registryScheme, value: icf.trim() } : null };
    };
    const entries = t.participants.filter((p) => p.Id && p.ClassId !== PSEUDO_CLASS).map((p) => {
      const team = p.IsTeam === 'true';
      let members: unknown[];
      if (team) members = ['Member1', 'Member2', 'Member3'].map((k) => p[k]).filter((x): x is string => !!x).map((id) => pById.get(id)).filter(Boolean).map((m) => person(m!, false));
      else members = [person(p, false), ...(p.FamilyName2 ? [person(p, true)] : [])];
      const display = team ? (p.FamilyName ?? '') : `${p.FamilyName ?? ''} ${p.GivenName ?? ''}`.trim() + (p.FamilyName2 ? `/${p.FamilyName2} ${p.GivenName2 ?? ''}`.trimEnd() : '');
      const fields: Record<string, unknown> = { displayName: display, members, isTeam: team };
      if (p.Club?.trim()) fields.club = p.Club;
      if (p.NOC?.trim()) fields.nation = p.NOC;
      fields.ageCategoryId = p.CatId?.trim() ? p.CatId : { unavailable: 'not-applicable' };
      fields.eventBib = bibHandling === 'EventWide' && p.EventBib?.trim() ? p.EventBib.trim() : { unavailable: 'not-applicable' };
      return { entryId: p.Id, classId: p.ClassId, fields };
    });
    const courses = t.courses.map((c) => {
      const layout = c.CourseConfig ?? '';
      const l = parseLayout(layout);
      return { courseId: String(c.CourseNr ?? '').trim(), layout, gates: layout === '' ? null : l.gates, slots: l.slots,
        sectorEndsAfterGate: l.sectorEndsAfterGate, splitsAfterGate: l.splitsAfterGate };
    });
    const classes = t.classes.filter((c) => c.row.ClassId && c.row.ClassId !== PSEUDO_CLASS).map((c) => ({
      classId: c.row.ClassId!, name: c.row.Class ?? c.row.ClassId!,
      ageCategories: c.categories.map((k) => ({ ageCategoryId: k.CatId ?? '', name: k.Category ?? '' })),
    }));
    const phases = t.schedule.filter((s) => s.RaceId && s.RaceId !== UNASSIGNED && s.ClassId !== PSEUDO_CLASS).map((s) => {
      const st = s.StartTime?.trim();
      return { phaseId: s.RaceId!, classId: s.ClassId ?? null, format: s.DisId || undefined, date: st ? st.slice(0, 10) : undefined,
        scheduledStart: st && !Number.isNaN(Date.parse(st)) ? new Date(Date.parse(st)).toISOString() : undefined, order: int(s.RaceOrder),
        title: s.CustomTitle?.trim() ? s.CustomTitle : undefined, courseId: s.CourseNr?.trim() ? s.CourseNr.trim() : undefined,
        status: phaseStatus(int(s.RaceStatus)) };
    });
    const ev = t.event;
    const event = { name: ev.MainTitle ?? '', details: { ...(ev.SubTitle ? { subtitle: ev.SubTitle } : {}), ...(ev.Location ? { venue: ev.Location } : {}),
      ...(ev.Facility ? { facility: ev.Facility } : {}), startDate: (ev.StartDate ?? '').slice(0, 10), endDate: (ev.EndDate ?? '').slice(0, 10) } };
    this.emit({ type: 'structure', observedAt, source: 'xml', what: 'xml-structure', payload: { event, courses, classes, phases, entries } },
      { class: 'observation', scope: 'event', what: 'xml-structure', source: 'xml', kind: 'structure', observedAt,
        counts: { courses: courses.length, classes: classes.length, phases: phases.length, entries: entries.length } });
    // One scope snapshot per race (CONTRACTS §4: an XML snapshot is a complete statement of every race in it).
    const byRace = new Map<string, Record<string, string>[]>();
    for (const row of t.results) {
      const rid = row.RaceId ?? '';
      if (!rid || rid === UNASSIGNED) { this.count('xml.results.unassigned'); continue; }
      if (!byRace.has(rid)) byRace.set(rid, []);
      byRace.get(rid)!.push(row);
    }
    for (const rid of [...byRace.keys()].sort()) {
      if (!phases.some((p) => p.phaseId === rid)) { this.count('xml.results.raceWithoutSchedule'); }
      const rows = byRace.get(rid)!.map((x) => this.xmlRow(rid, x, observedAt)).filter((x): x is SnapshotRow => !!x);
      this.emit({ type: 'snapshot', observedAt, source: 'xml', phaseId: rid, mode: 'results', rows },
        { class: 'scope-snapshot', source: 'xml', phaseId: rid, mode: 'results', observedAt, rows });
    }
  }

  private xmlRow(raceId: string, x: Record<string, string>, observedAt: string): SnapshotRow | null {
    const bib = (x.Bib ?? '').trim();
    if (!bib) { this.count('xml.results.rowNoBib'); return null; }
    const info = this.d.phaseInfo(raceId);
    const second = info.pairRole === 'second';
    const date = this.d.phaseDate(raceId, observedAt);
    const course = this.course(raceId);
    const row: SnapshotRow = { bib };
    if (x.Id) row.entryId = x.Id;
    const so = int(x.StartOrder);
    if (so !== undefined) row.startOrder = so;
    if (x.StartTime?.trim() && !info.cross) row.scheduledStart = eventTimeOf(date, x.StartTime, this.cfg.zone);
    const status = (x.Status ?? '').trim();
    if (status === '*') row.underReview = true;
    else if (status) row.status = markOf(status);
    const dtStart = x.dtStart?.trim() ? eventTimeOf(date, x.dtStart, this.cfg.zone) : null;
    const dtFinish = x.dtFinish?.trim() ? eventTimeOf(date, x.dtFinish, this.cfg.zone) : null;
    if (dtStart) row.startTime = dtStart;
    if (dtFinish) row.finishTime = dtFinish;
    const timeMs = num(x.Time), pen = num(x.Pen), totalMs = num(x.Total);
    if (info.kind === 'classification') {
      const o = num(x.RnkOrder);
      if (o !== undefined) row.placement = { rank: num(x.Rnk) ?? null, order: o };
      if ((x.RecordType ?? '').trim()) row.decidedIn = x.RecordType!.trim();
      return row;
    }
    if (info.cross) {
      this.crossRow(row, info, num(x.Rnk), num(x.RnkOrder), timeMs !== undefined ? r3(timeMs / 1000) : undefined, x.Gates, course, raceId, num(x.HeatNr), x.StartTime);
      if (!info.heats && row.placement && timeMs !== undefined && !dtFinish) row.untimed = true;   // §4.4 untimed (junior time trial)
      if ((x.Qualified ?? '').trim() === 'Q') row.qualified = true;
      return row;
    }
    const rank = num(second ? x.TotalRnk : x.Rnk), order = num(second ? x.TotalRnkOrder : x.RnkOrder);
    if (order !== undefined) row.placement = { rank: rank ?? null, order };
    this.gatesInto(row, x.Gates, course, 'xml');
    if (timeMs !== undefined) {
      const run = r3(timeMs / 1000);
      const p = pen ?? 0;
      row.runSeconds = run;
      row.outcome = { kind: 'duration', runSeconds: run, penaltySeconds: p, totalSeconds: totalMs !== undefined ? r3(totalMs / 1000) : r3(run + p) };
      // §4.4 untimed: a placed row with no finish time.
      if (row.placement && !dtFinish) row.untimed = true;
    } else if (second && !row.status) row.timeEmpty = true;
    if (second) {
      const tt = num(x.TotalTotal);
      row.pairTotal = tt !== undefined ? r3(tt / 1000) : null;
      const br = num(x.BetterRunNr);
      if (info.combination === 'best' && (br === 1 || br === 2)) row.countingRun = br;
    }
    if (row.underReview === undefined && (row.status || timeMs !== undefined)) row.underReview = false;
    if ((x.Qualified ?? '').trim() === 'Q') row.qualified = true;
    // The snapshot's own category rank is one only where the row's CatId is set: on second-run rows before run 2,
    // CatId is empty and TotalCatRnk equals TotalRnk (E1, nkz-19so; S1 UPSTREAM-NEW).
    const cat = (x.CatId ?? '').trim() ? num(second ? x.TotalCatRnk : x.CatRnk) : undefined;
    row.upstreamCatRank = cat ?? null;
    return row;
  }
}
