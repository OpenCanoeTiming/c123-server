import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { at } from './kit.js';
import { REC } from './fixtures/real-excerpts.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { CLS } from './fixtures/classification-excerpts.js';
import { connected, coreWith, tcpUnit, xmlUnit, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #205: Standing assembly through the merge core (CONTRACTS 2.7 and 5; DERIVATIONS 4.10; TEST-ARCHITECTURE property 15; ADR-012).
// Expected values come from the contract, never from running the core. Hand streams in the element shape of the vectors; one stream builder per test,
// the ingest sequence is a closure counter, no real clock (times are offsets from kit.ts BASE). The negative assertions ("pushes nothing") are always
// paired with a positive one earlier in the same test, so a core that pushes no Standing at all cannot pass them.

type Std = { standingKey: string; classId: string; scope: Record<string, unknown>; ageCategoryId: string | null; asOf: string; entries: Array<Record<string, any>>; anomalies: unknown[] };
type Core = ReturnType<typeof coreWith>;
const sent = (c: Core, from = 0): Std[] => c.notifications().slice(from).filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std);
const keyed = (c: Core, key: string, from = 0): Std[] => sent(c, from).filter((s) => s.standingKey === key);
const mark = (c: Core): number => c.notifications().length;
const el = (e: unknown): GivenElement => e as GivenElement;
const duration = (runSeconds: number, penaltySeconds = 0) => ({ kind: 'duration', runSeconds, penaltySeconds, totalSeconds: runSeconds + penaltySeconds });
const view = (s: Std) => s.entries.map((e) => ({ entryId: e['entryId'], rank: e['rank'], order: e['order'], decidedIn: e['decidedIn'] }));

// ---------------------------------------------------------------------------------------------------------------- classification rows

const CP = 'MX1_XER_26';
const CKEY = `classification:${CP}/all`;
const cr = (entryId: string, bib: string, rank: number | null, order: number, decidedIn: string | null = null) => ({ entryId, bib, rank, order, decidedIn });

/** Scope snapshots of the classification Phase (CONFORMANCE-VECTORS 1: ClassificationRows; an empty table is start-list mode, DERIVATIONS 0.3). */
function cls() {
  let seq = 0;
  const n = (): number => ++seq;
  const snap = (source: 'tcp' | 'xml', observedAt: string, rows: unknown[], mode: 'results' | 'start-list'): GivenElement =>
    el({ ingestSeq: n(), observedAt, snapshot: { source, phaseId: CP, mode, rows } });
  return {
    tcp: (t: number, rows: unknown[], mode: 'results' | 'start-list' = rows.length > 0 ? 'results' : 'start-list'): Unit => [snap('tcp', at(t), rows, mode)],
    xml: (t: number, changedAfter: number | null, rows: unknown[], mode: 'results' | 'start-list' = rows.length > 0 ? 'results' : 'start-list'): Unit => [
      el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: changedAfter === null ? null : at(changedAfter) }),
      snap('xml', at(t), rows, mode),
    ],
  };
}

describe('#205 row 4: classification rows (DERIVATIONS 4.10; CONTRACTS 5 step 2; property 15 classification case)', () => {
  it('property 15 / DERIVATIONS 4.10: an empty table before any row pushes nothing; the first row pushes the Standing once, entries in the rows\' own rank and order, sorted by order, asOf the snapshot\'s observedAt', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(10, []));
    expect(sent(c)).toHaveLength(0);
    c.applyUnit(s.tcp(20, [cr('B', '7', null, 3), cr('A', '4', 1, 1), cr('C', '9', 2, 2)]));
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ standingKey: CKEY, classId: 'MX1', scope: { kind: 'classification', phaseId: CP }, ageCategoryId: null, asOf: at(20) });
    expect(view(all[0]!)).toEqual([
      { entryId: 'A', rank: 1, order: 1, decidedIn: null },
      { entryId: 'C', rank: 2, order: 2, decidedIn: null },
      { entryId: 'B', rank: null, order: 3, decidedIn: null },
    ]);
    expect(all[0]!.entries.map((e) => e['bib'])).toEqual(['4', '9', '7']);
    expect(all[0]!.entries.every((e) => e['behindSeconds'] === null)).toBe(true); // not a duration scope
    expect(c.attempts()).toEqual([]); // creates no Attempt
  });

  it('DERIVATIONS 4.10 "decidedIn": a tcp row stating null keeps the last admitted xml row\'s decidedIn for that entryId; an entry the xml never stated stays null', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.xml(100, 95, [cr('A', '4', 1, 1, 'F'), cr('B', '7', 2, 2, 'SF')]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    expect(view(keyed(c, CKEY)[0]!)).toEqual([{ entryId: 'A', rank: 1, order: 1, decidedIn: 'F' }, { entryId: 'B', rank: 2, order: 2, decidedIn: 'SF' }]);
    c.applyUnit(s.tcp(200, [cr('B', '7', 1, 1), cr('A', '4', 2, 2), cr('C', '9', 3, 3)]));
    const now = keyed(c, CKEY);
    expect(now).toHaveLength(2);
    expect(view(now[1]!)).toEqual([{ entryId: 'B', rank: 1, order: 1, decidedIn: 'SF' }, { entryId: 'A', rank: 2, order: 2, decidedIn: 'F' }, { entryId: 'C', rank: 3, order: 3, decidedIn: null }]);
    expect(now[1]!.asOf).toBe(at(200));
  });

  it('DERIVATIONS 4.10 "replaces the Phase\'s rows whole": a later snapshot with other rows drops the entries it no longer states', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(10, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    c.applyUnit(s.tcp(20, [cr('B', '7', 1, 1), cr('C', '9', 2, 2)]));
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(2);
    expect(view(all[1]!)).toEqual([{ entryId: 'B', rank: 1, order: 1, decidedIn: null }, { entryId: 'C', rank: 2, order: 2, decidedIn: null }]);
  });

  it('DERIVATIONS 4.10 "a refused snapshot moves nothing, decidedIn included": an xml snapshot whose content is older than the tcp rows pushes nothing and its decidedIn is never used by a later tcp row', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    const m = mark(c);
    c.applyUnit(s.xml(110, 90, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'SF')])); // content age 90 s is older than the tcp delivery at 100 s
    expect(sent(c, m)).toHaveLength(0);
    c.applyUnit(s.tcp(300, [cr('B', '7', 1, 1), cr('A', '4', 2, 2)]));
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(2);
    expect(view(all[1]!)).toEqual([{ entryId: 'B', rank: 1, order: 1, decidedIn: null }, { entryId: 'A', rank: 2, order: 2, decidedIn: null }]);
  });

  it('property 15 / CONTRACTS 5 step 1: the same rows re-sent by a tcp rotation push nothing and leave asOf at the snapshot that changed it', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    const m = mark(c);
    c.applyUnit(s.tcp(700, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    expect(sent(c, m)).toHaveLength(0);
    c.applyUnit(s.tcp(900, [cr('B', '7', 1, 1), cr('A', '4', 2, 2)]));
    expect(keyed(c, CKEY).at(-1)!.asOf).toBe(at(900));
  });

  it('DERIVATIONS 4.10: an xml snapshot with a content age later than the tcp delivery replaces tcp-built rows (the guard admits the newer build); a tcp snapshot always replaces xml-built rows', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    c.applyUnit(s.xml(200, 195, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'SF')]));
    c.applyUnit(s.tcp(210, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)])); // tcp led by 10 s over an xml the file wrote at 195 s: still replaces
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(3);
    expect(view(all[1]!)).toEqual([{ entryId: 'B', rank: 1, order: 1, decidedIn: 'F' }, { entryId: 'A', rank: 2, order: 2, decidedIn: 'SF' }]);
    expect(view(all[2]!)).toEqual([{ entryId: 'A', rank: 1, order: 1, decidedIn: 'SF' }, { entryId: 'B', rank: 2, order: 2, decidedIn: 'F' }]);
  });
});

describe('#205 row 5: item 22, the maintainer\'s decision: an emptied classification table keeps the last built Standing (DERIVATIONS 4.10; CONTRACTS 5 step 1 "asOf"; property 15; vector classification-emptied-keeps-last-standing)', () => {
  const build = (): { c: Core; s: ReturnType<typeof cls> } => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    return { c, s };
  };

  it('vector classification-emptied-keeps-last-standing, assembled Standing: after the empty table (tcp or xml) the Standing still holds its entries and asOf is the last build\'s, read through scope.replaced of the Phase', () => {
    for (const source of ['tcp', 'xml'] as const) {
      const { c, s } = build();
      expect(keyed(c, CKEY)).toHaveLength(1);
      const m = mark(c);
      c.applyUnit(source === 'tcp' ? s.tcp(200, []) : s.xml(200, 195, []));
      expect(sent(c, m), `${source}: nothing pushed for the empty table`).toHaveLength(0);
      const m2 = mark(c);
      c.applyUnit([el({ ingestSeq: 99, event: 'rebaseline', observedAt: at(300), scope: { kind: 'phase', phaseId: CP } })]);
      const replaced = c.notifications().slice(m2).filter((x) => x.type === 'scope.replaced');
      expect(replaced, source).toHaveLength(1);
      const st = (replaced[0]!['standings'] as Std[]).find((x) => x.standingKey === CKEY);
      expect(st, `${source}: the classification Standing is carried`).toBeDefined();
      expect(view(st!), `${source}: entries`).toEqual([{ entryId: 'A', rank: 1, order: 1, decidedIn: null }, { entryId: 'B', rank: 2, order: 2, decidedIn: null }]);
      expect(st!.asOf, `${source}: asOf is the last build's, not the empty table's`).toBe(at(100));
    }
  });

  it('item 22: after the empty table the rows arriving again replace the Standing whole; rows equal to the last build push nothing (a silent clear would push them), other rows push once with their own asOf', () => {
    const { c, s } = build();
    c.applyUnit(s.tcp(200, []));
    c.applyUnit(s.tcp(300, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    c.applyUnit(s.tcp(400, [cr('B', '7', 1, 1), cr('A', '4', 2, 2)]));
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(2);
    expect(all[1]!.asOf).toBe(at(400));
    expect(view(all[1]!)[0]).toMatchObject({ entryId: 'B', rank: 1 });
  });

  it('item 22: an emptied table pushes nothing even after several (the vector\'s two-push total holds on the core stream)', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(0, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    c.applyUnit(s.tcp(1800, [], 'start-list'));
    c.applyUnit(s.xml(1850, 1840, [], 'start-list'));
    c.applyUnit(s.tcp(3600, [cr('B', '7', 1, 1), cr('A', '4', 2, 2)]));
    expect(keyed(c, CKEY)).toHaveLength(2);
  });
});

describe('#205 row 6: the classification guard compares content age, not the Standing\'s asOf (CONTRACTS 4 INV-2c; DERIVATIONS 4.10; #204 review finding, #265 N6)', () => {
  it('a tcp rotation re-sends equal rows (the Standing and its asOf do not move): an xml snapshot older than that delivery is refused although newer than asOf', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    c.applyUnit(s.tcp(500, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)])); // the rotation: a tcp delivery at 500
    expect(keyed(c, CKEY)).toHaveLength(1);
    const m = mark(c);
    c.applyUnit(s.xml(510, 300, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'F')])); // content from 300: after 100, before 500
    expect(sent(c, m)).toHaveLength(0);
    c.applyUnit(s.xml(620, 600, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'F')])); // content from 600: later than the last delivery
    const all = keyed(c, CKEY);
    expect(all).toHaveLength(2);
    expect(all[1]!.asOf).toBe(at(620));
    expect(view(all[1]!)[0]).toMatchObject({ entryId: 'B', rank: 1, decidedIn: 'F' });
  });

  it('an xml snapshot whose content age is unknown (null) never replaces tcp-built rows; one with a known later age does', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    c.applyUnit(s.xml(900, null, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'F')]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    c.applyUnit(s.xml(950, 940, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'F')]));
    expect(keyed(c, CKEY)).toHaveLength(2);
  });

  it('an xml snapshot older than the tcp rows it would replace is refused even when its content age is later than the Standing\'s asOf by only a tcp re-send in between (same rows, three deliveries)', () => {
    const s = cls();
    const c = coreWith([]);
    c.applyUnit(s.tcp(100, [cr('A', '4', 1, 1)]));
    c.applyUnit(s.tcp(200, [cr('A', '4', 1, 1)]));
    c.applyUnit(s.tcp(300, [cr('A', '4', 1, 1)]));
    expect(keyed(c, CKEY)).toHaveLength(1);
    c.applyUnit(s.xml(305, 250, [cr('A', '4', 2, 2, 'F')])); // 250 is after 100 (asOf) and before 300 (the last delivery)
    expect(keyed(c, CKEY)).toHaveLength(1);
  });
});

// -------------------------------------------------------------------------------------------------------- scopes and push-only-on-change

const P1 = 'K1M_BR1_6';
const P2 = 'K1M_BR2_6';

/** Result tables of one Phase, hand-built. xml tables carry the reader's rewrite event first. */
function table(phaseId: string) {
  let seq = 0;
  const n = (): number => ++seq;
  const snap = (source: 'tcp' | 'xml', t: number, rows: unknown[]): GivenElement => el({ ingestSeq: n(), observedAt: at(t), snapshot: { source, phaseId, mode: 'results', rows } });
  return {
    xml: (t: number, changedAfter: number, rows: unknown[], extra: unknown[] = []): Unit => [el({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(changedAfter) }), ...extra.map(el), snap('xml', t, rows)],
    tcp: (t: number, rows: unknown[]): Unit => [snap('tcp', t, rows)],
    category: (t: number, bib: string, value: string): unknown => ({ ingestSeq: n(), attemptId: `${phaseId}:${bib}`, field: 'ageCategoryId', source: 'xml', kind: 'result-row', observedAt: at(t), value, confidence: 'authoritative' }),
  };
}
const row = (bib: string, rank: number, order: number, total: number, extra: Record<string, unknown> = {}) => ({ bib, outcome: duration(total), placement: { rank, order }, judgingComplete: true, ...extra });

/** A TCP Schedule message through parseTcp, as the stream delivers it: `races` are the RaceIds it names. */
function scheduleUnit(races: string[]): Unit {
  const data = `<Canoe123 System="Main"><Schedule>${races.map((r, i) => `<Race Order="${i + 1}" RaceId="${r}" Race="K1 muži" MainTitle="K1 muži" SubTitle="Run" ShortTitle="K1M" RaceStatus="5" />`).join('')}</Schedule></Canoe123>`;
  return tcpUnit({ recording: 'hand', chunk: 'hand', ts: 0, observedAt: at(-60), data }, {}, { phaseDates: Object.fromEntries(races.map((r) => [r, '2026-09-15'])) }); // only the named races are candidates: the default context knows other K1M Phases
}

describe('#205 row 3: scopes (CONTRACTS 5 step 1 standingKey; property 15 first publications)', () => {
  it('property 15: a phase standing has a stable standingKey "phase:<phaseId>/all", the same string in every message, scope and classId from the Phase', () => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, [row('1', 1, 1, 80), row('2', 2, 2, 85)]));
    c.applyUnit(t.xml(100, 95, [row('1', 2, 2, 80), row('2', 1, 1, 85)]));
    const all = keyed(c, `phase:${P1}/all`);
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.standingKey)).toEqual([`phase:${P1}/all`, `phase:${P1}/all`]);
    expect(all[0]).toMatchObject({ classId: 'K1M', scope: { kind: 'phase', phaseId: P1 }, ageCategoryId: null });
    expect(sent(c).every((s) => /^phase:K1M_BR1_6\/(all|[A-Za-z0-9]+)$/.test(s.standingKey))).toBe(true);
  });

  it('property 15: the category standing\'s first publication is when an Entry\'s ageCategoryId becomes known; ranks are 1 + the same-category entries with a strictly smaller class rank, order the position in the filtered list', () => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, [row('1', 1, 1, 80), row('2', 2, 2, 85), row('3', 3, 3, 90)]));
    expect(keyed(c, `phase:${P1}/all`)).toHaveLength(1);
    expect(sent(c).filter((s) => s.standingKey !== `phase:${P1}/all`)).toHaveLength(0);
    c.applyUnit([...t.xml(20, 15, [row('1', 1, 1, 80), row('2', 2, 2, 85), row('3', 3, 3, 90)], [t.category(20, '2', 'DM'), t.category(20, '3', 'DM')])]);
    const cat = keyed(c, `phase:${P1}/DM`);
    expect(cat).toHaveLength(1);
    expect(cat[0]).toMatchObject({ ageCategoryId: 'DM', scope: { kind: 'phase', phaseId: P1 } });
    expect(cat[0]!.entries.map((e) => ({ bib: e['bib'], rank: e['rank'], order: e['order'] }))).toEqual([{ bib: '2', rank: 1, order: 1 }, { bib: '3', rank: 2, order: 2 }]);
    expect(keyed(c, `phase:${P1}/all`).at(-1)!.entries.map((e) => e['bib'])).toEqual(['1', '2', '3']); // the class standing is whole
  });

  it('property 15 / CONTRACTS 5 step 1: the pair standing\'s first publication follows the second Phase\'s pair.siblingPhaseId becoming known; its key is "pair:<second>/all", scope names both Phases', () => {
    const only2 = scheduleUnit([P2]);
    const pairOf = (u: Unit) => (u as Array<Record<string, any>>).find((e) => e['field'] === 'pair' && e['phaseId'] === P2)?.['value'];
    expect(pairOf(only2)).toMatchObject({ role: 'second', siblingPhaseId: null }); // DERIVATIONS 2.1: null until the schedule names the first run
    const t = table(P2);
    const c = coreWith([only2]);
    c.applyUnit(t.xml(10, 5, [row('9', 1, 1, 82.36, { pairTotal: 160 })]));
    expect(keyed(c, `phase:${P2}/all`)).toHaveLength(1);
    expect(keyed(c, `pair:${P2}/all`)).toHaveLength(0);
    c.applyUnit(scheduleUnit([P1, P2]));
    const pair = keyed(c, `pair:${P2}/all`);
    expect(pair).toHaveLength(1);
    expect(pair[0]).toMatchObject({ scope: { kind: 'pair', firstPhaseId: P1, secondPhaseId: P2 }, ageCategoryId: null });
    expect(pair[0]!.entries[0]).toMatchObject({ bib: '9', pairTotalSeconds: 160 });
    expect(keyed(c, `phase:${P2}/all`)).toHaveLength(1); // the phase standing did not change
  });
});

describe('#205 row 2: a Standing is pushed only when its serialised form changes (CONTRACTS 5 step 1; 2.7; property 15)', () => {
  const pushes = (rows1: unknown[], rows2: unknown[], key = `phase:${P1}/all`): number => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, rows1));
    expect(keyed(c, key)).toHaveLength(1); // the first publication
    const m = mark(c);
    c.applyUnit(t.xml(100, 95, rows2));
    return keyed(c, key, m).length;
  };

  it('vector standing-not-resent-on-running-tick: a second-run athlete\'s running ticks push no standing; the entry is pending throughout; attempt.updated is still sent', () => {
    const only = scheduleUnit([P1, P2]);
    const A = `${P2}:9`;
    const c = coreWith([only]);
    c.applyUnit([el({ ingestSeq: 1, observedAt: at(0), snapshot: { source: 'tcp', phaseId: P2, mode: 'results', rows: [{ bib: '9', placement: { rank: 3, order: 3 }, pairTotal: 82.36, timeEmpty: true }] } })]);
    c.applyUnit([
      el({ ingestSeq: 2, attemptId: A, field: 'onCourse', source: 'tcp', kind: 'inference', observedAt: at(600), value: { dtStart: '2026-09-15T10:09:59.000Z', dtFinish: null }, confidence: 'authoritative' }),
    ]);
    const phaseKey = `phase:${P2}/all`;
    expect(keyed(c, phaseKey).length).toBeGreaterThanOrEqual(1);
    const m = mark(c);
    for (const [i, s] of [10, 11, 12].entries()) {
      c.applyUnit([el({ ingestSeq: 3 + i, attemptId: A, field: 'outcome', source: 'tcp', kind: 'inference', observedAt: at(609 + i), value: { kind: 'running', elapsedSeconds: s, penaltySeconds: 0 }, confidence: 'authoritative', provisional: true })]);
    }
    expect(c.notifications().slice(m).filter((x) => x.type === 'attempt.updated').length).toBeGreaterThan(0);
    expect(sent(c, m)).toHaveLength(0);
    for (const key of [phaseKey]) expect(keyed(c, key).at(-1)!.entries.find((e) => e['bib'] === '9')!['result']).toEqual({ kind: 'pending' });
  });

  it('property 15 cause "an Attempt\'s placement": a changed rank or order pushes exactly one; the same table re-sent pushes none', () => {
    expect(pushes([row('1', 1, 1, 80), row('2', 2, 2, 85)], [row('1', 2, 2, 80), row('2', 1, 1, 85)])).toBe(1);
    expect(pushes([row('1', 1, 1, 80), row('2', 2, 2, 85)], [row('1', 1, 1, 80), row('2', 2, 2, 85)])).toBe(0);
  });

  it('property 15 cause "a result outcome": a changed time pushes exactly one, and the entry\'s result is the new outcome', () => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, [row('1', 1, 1, 80)]));
    expect(keyed(c, `phase:${P1}/all`)).toHaveLength(1);
    c.applyUnit(t.xml(100, 95, [row('1', 1, 1, 79.5)]));
    const all = keyed(c, `phase:${P1}/all`);
    expect(all).toHaveLength(2);
    expect(all[1]!.entries[0]!['result']).toMatchObject({ kind: 'duration', totalSeconds: 79.5 });
  });

  it('property 15 cause "underReview": a row marked under review pushes exactly one and the entry says so (CONTRACTS 5 step 5)', () => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, [row('1', 1, 1, 80)]));
    c.applyUnit(t.xml(100, 95, [row('1', 1, 1, 80, { underReview: true })]));
    const all = keyed(c, `phase:${P1}/all`);
    expect(all).toHaveLength(2);
    expect(all[0]!.entries[0]!['underReview']).toBe(false);
    expect(all[1]!.entries[0]!['underReview']).toBe(true);
  });

  it('property 15 cause "pairTotal": a changed combined total pushes exactly one on the pair standing', () => {
    const t = table(P2);
    const c = coreWith([scheduleUnit([P1, P2])]);
    c.applyUnit(t.xml(10, 5, [row('9', 1, 1, 82.36, { pairTotal: 160 })]));
    expect(keyed(c, `pair:${P2}/all`)).toHaveLength(1);
    c.applyUnit(t.xml(100, 95, [row('9', 1, 1, 82.36, { pairTotal: 159.5 })]));
    const all = keyed(c, `pair:${P2}/all`);
    expect(all).toHaveLength(2);
    expect(all[1]!.entries[0]).toMatchObject({ pairTotalSeconds: 159.5 });
  });

  it('property 15 cause "scope.replaced": a re-baseline carries the Standings of the scope in the scope.replaced message and pushes no standing.updated of its own', () => {
    const t = table(P1);
    const c = coreWith([]);
    c.applyUnit(t.xml(10, 5, [row('1', 1, 1, 80), row('2', 2, 2, 85)]));
    expect(keyed(c, `phase:${P1}/all`)).toHaveLength(1);
    const m = mark(c);
    c.applyUnit([...t.xml(200, 195, [row('1', 1, 1, 80), row('2', 2, 2, 85)], [{ ingestSeq: 50, event: 'rebaseline', observedAt: at(200), scope: { kind: 'phase', phaseId: P1 } }])]);
    const replaced = c.notifications().slice(m).filter((x) => x.type === 'scope.replaced');
    expect(replaced).toHaveLength(1);
    expect((replaced[0]!['standings'] as Std[]).map((s) => s.standingKey)).toContain(`phase:${P1}/all`);
  });
});

// ------------------------------------------------------------------------------------------------------------- purity and determinism

describe('#205 row 7: purity and determinism (TEST-ARCHITECTURE section 5; CONTRACTS 4 determinism paragraph)', () => {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'standing.ts');
  const code = (): string => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('src/core/standing.ts exists and, like the rest of src/core, reads no clock, no timers, no random, does no I/O and imports nothing from Node', () => {
    expect(existsSync(file)).toBe(true);
    const s = code();
    expect(s).not.toMatch(/Date\.now\s*\(|new\s+Date\s*\(\s*\)|\bDate\s*\(\s*\)|performance\.now|Math\.random|process\.hrtime/);
    expect(s).not.toMatch(/\b(setTimeout|setInterval|setImmediate|queueMicrotask)\s*\(/);
    expect(s).not.toMatch(/process\.(env|stdout|stderr)|\bfetch\s*\(|console\./);
    expect(s).not.toMatch(/from\s+['"](node:)?(fs|fs\/promises|net|http|https|child_process|worker_threads|os|dns|stream|timers|perf_hooks|process|path)['"]/);
  });

  const streams = (): Unit[] => {
    const t = table(P1);
    const s = cls();
    const day = { WX1_XF_26: '2026-04-26' };
    return [
      connected(R19.xfStartList.observedAt),
      tcpUnit(R19.xfStartList, day),
      tcpUnit(R19.xfFinal, day),
      tcpUnit(REC.c1StartList, { WX1_XER_26: '2026-04-26' }),
      tcpUnit(REC.c2Final, { WX1_XER_26: '2026-04-26' }),
      t.xml(10, 5, [row('1', 1, 1, 80), row('2', 2, 2, 85)]),
      t.xml(20, 15, [row('1', 1, 1, 80), row('2', 2, 2, 85)], [t.category(20, '2', 'DM')]),
      s.tcp(30, [cr('A', '4', 1, 1), cr('B', '7', 2, 2)]),
      s.xml(40, 35, [cr('B', '7', 1, 1, 'F'), cr('A', '4', 2, 2, 'F')]),
      s.tcp(50, []),
      xmlUnit(CLS[1]!, { MX1_XER_26: '2026-04-26' }, new Date(Date.parse(CLS[1]!.observedAt) - 5000).toISOString()),
    ];
  };

  it('obligation section 4 determinism: two fresh cores fed the same units push the same standing.updated sequence (and units are frozen: an assembler that mutates its input throws)', () => {
    const a = coreWith(streams());
    const b = coreWith(streams());
    expect(sent(a).length).toBeGreaterThan(4);
    expect(sent(b)).toEqual(sent(a));
    expect(b.notifications()).toEqual(a.notifications());
  });

  it('obligation section 4 determinism: another core running beside it does not change the sequence (no module state in the assembly)', () => {
    const alone = coreWith(streams());
    coreWith(streams().slice(5));
    const again = coreWith(streams());
    expect(sent(alone).length).toBeGreaterThan(0);
    expect(sent(again)).toEqual(sent(alone));
  });
});
