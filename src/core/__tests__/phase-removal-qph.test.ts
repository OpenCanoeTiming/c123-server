/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { parseTcp } from '../../ingest/index.js';
import { ctx as ingestCtx } from '../../ingest/__tests__/helpers.js';
import { at, kit } from './kit.js';
import { coreWith } from './streams.js';

/**
 * #382 rows 3-6, 9-11 (M2 P3c, Q-PH: a Phase that leaves the schedule is removed; ADR-015 Revision 9; DERIVATIONS §10 item 54 (a)-(k), §0.3, §4.12;
 * CONTRACTS §2.4, §4 INV-7, §7.2; CLIENT-OBLIGATIONS `phase.deleted`). The model is the Attempt removal (item 38; attempt-removal-p3a.test.ts).
 *
 * Channel: the core, fed hand units in the element shape of the vectors: `xml-rewrite-detected` (the content age), then the read's `schedule` statement
 * (CONFORMANCE-VECTORS §1 "Schedule statements"), then the race tables of the read. Read through `notifications()` (by index: the order of a unit),
 * `phaseIds()`, `attempts()`, `standings()` (the hydration views), `phase()` and `drainIngestDiagnostics()`. Every test builds its own core and streams;
 * time is offsets from kit.ts BASE, never a clock. Each test first asserts what the removal needs to be a removal (the Phase presented, the Standings built).
 *
 * The Phase's own `pair`/`classId`/`format` are stated with `xml` observations, as the XML parser states them in the read: a `tcp` statement would be a
 * `tcp` observation of the Phase, which the guard of item 54 (c) counts.
 */
const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });
const A = 'K1M_BR1_6';
const B = 'K1M_BR2_6';
type Msg = { type: string; [k: string]: any };

function world() {
  let seq = 0;
  const n = (): number => ++seq;
  const rw = (t: number, ca: number | null): GivenElement => ({ ingestSeq: n(), event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: ca === null ? null : at(ca) }) as GivenElement;
  const sch = (t: number, ids: string[]): GivenElement => ({ ingestSeq: n(), schedule: { source: 'xml', phaseIds: ids }, observedAt: at(t) }) as unknown as GivenElement;
  const snap = (source: 'tcp' | 'xml', phaseId: string, t: number, rows: unknown[], mode: 'results' | 'start-list' = rows.some((r) => (r as any).placement) ? 'results' : 'start-list'): GivenElement =>
    ({ ingestSeq: n(), observedAt: at(t), snapshot: { source, phaseId, mode, rows } }) as GivenElement;
  const obs = (source: 'tcp' | 'xml', t: number, key: Record<string, string>, field: string, value: unknown): GivenElement =>
    ({ ingestSeq: n(), observedAt: at(t), ...key, field, source, kind: 'result-row', value, confidence: 'authoritative' }) as unknown as GivenElement;
  /** The Phase as the XML parser states it in a read: class, format and pair (a first run states a null sibling; the second run its first run). */
  const described = (t: number, phaseId: string, role: 'first' | 'second', sibling: string | null, date?: string): GivenElement[] => [
    obs('xml', t, { phaseId }, 'classId', 'K1M'),
    obs('xml', t, { phaseId }, 'format', role === 'first' ? 'BR1' : 'BR2'),
    obs('xml', t, { phaseId }, 'pair', { role, siblingPhaseId: sibling, combination: 'best' }),
    ...(date === undefined ? [] : [obs('xml', t, { phaseId }, 'date', date)]),
  ];
  /** One whole read: the event with its content age, the schedule statement, then the read's elements. */
  const read = (t: number, ca: number | null, ids: string[], ...rest: GivenElement[][]): GivenElement[] => [rw(t, ca), sch(t, ids), ...rest.flat()];
  const erow = (bib: string, rank: number, total: number, extra: Record<string, unknown> = {}) => ({ bib, entry: { entryId: `E${bib}` }, outcome: dur(total), placement: { rank, order: rank }, judgingComplete: true, ...extra });
  return { rw, sch, snap, obs, described, read, erow };
}
const msgsOf = (c: any, from: number): Msg[] => (c.notifications() as Msg[]).slice(from);
const ofType = (ms: Msg[], type: string): Msg[] => ms.filter((m) => m['type'] === type);
const mentions = (m: unknown, id: string): boolean => JSON.stringify(m).includes(id);
const keys = (c: any): string[] => (c.standings() as Array<{ standingKey: string }>).map((s) => s.standingKey);
const drain = (c: any): Array<Record<string, any>> => c.drainIngestDiagnostics();

describe('#382 row 3: a Phase the admitted schedule omits is removed with one phase.deleted (item 54 (a), (d), (g))', () => {
  it('item 54 (d)(g), vector phase-removed-when-schedule-omits-it: B, its Attempts and every Standing naming it go as ONE phase.deleted; no attempt.deleted, no standing.updated, no attempt.updated for them', () => {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B],
      w.described(100, A, 'first', null), w.described(100, B, 'second', A),
      [w.snap('xml', A, 100, [{ bib: '1' }]),
        w.snap('xml', B, 100, [w.erow('9', 1, 80), w.erow('10', 2, 85)]),
        w.obs('xml', 100, { entryId: 'E9' }, 'ageCategoryId', 'DM'), w.obs('xml', 100, { entryId: 'E10' }, 'ageCategoryId', 'DM')]));
    // preconditions: B presented, with its Attempts and Standings of two scopes
    expect(c.phaseIds()).toContain(B);
    expect(c.attempts()).toEqual(expect.arrayContaining([`${B}:9`, `${B}:10`, `${A}:1`]));
    expect(keys(c), 'precondition: the phase Standing of B').toContain(`phase:${B}/all`);
    expect(keys(c), 'precondition: the category Standing of B').toContain(`phase:${B}/DM`);

    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [A], w.snap('xml', A, 200, [{ bib: '1' }])));
    const unit = msgsOf(c, m);

    const del = ofType(unit, 'phase.deleted');
    expect(del, 'exactly one phase.deleted').toHaveLength(1);
    expect(del[0]).toMatchObject({ type: 'phase.deleted', phaseId: B });
    expect(ofType(unit, 'attempt.deleted'), 'implied, never sent (item 54 (d))').toEqual([]);
    expect(unit.filter((x) => (x['type'] === 'standing.updated' || x['type'] === 'attempt.updated') && mentions(x, B)), 'nothing is sent for what the removal implies').toEqual([]);

    expect(c.phaseIds()).not.toContain(B);
    expect(c.phaseIds(), 'A stays').toContain(A);
    expect(c.attempts().filter((a: string) => a.startsWith(`${B}:`)), 'B\'s Attempts are gone').toEqual([]);
    expect(c.attempts()).toContain(`${A}:1`);
    expect((c.standings() as unknown[]).filter((s) => mentions(s, B)), 'every Standing naming B is gone from hydration').toEqual([]);
  });

  it('item 54 (d), (a): the removal needs the statement; a read whose statement still names B (only its race table omitted) removes nothing', () => {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, B, 'second', A), w.snap('xml', B, 100, [w.erow('9', 1, 80)])));
    expect(c.phaseIds(), 'precondition').toContain(B);
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [A, B], w.snap('xml', A, 200, [{ bib: '1' }])));
    expect(ofType(msgsOf(c, m), 'phase.deleted')).toEqual([]);
    expect(c.phaseIds()).toContain(B);
    expect(c.attempts()).toContain(`${B}:9`);
  });
});

describe('#382 row 4: the guard (item 54 (c); vector phase-removal-refused-by-guard)', () => {
  /** B named by an admitted-in-time read at t=100; returns the world and the core. */
  function setup() {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, B, 'second', A), w.snap('xml', B, 100, [w.erow('9', 1, 80)])));
    expect(c.phaseIds(), 'precondition: B exists').toContain(B);
    return { w, c };
  }

  it('item 54 (c): a TCP Results of B delivered after the snapshot\'s changedAfter refuses the removal (nothing of B moves); the next read, later than it, removes', () => {
    const { w, c } = setup();
    c.applyUnit([w.snap('tcp', B, 150, [w.erow('9', 1, 80)])]);
    const m = c.notifications().length;
    c.applyUnit(w.read(160, 140, [A])); // content age 140 < the tcp delivery at 150
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'refused: older than TCP\'s push').toEqual([]);
    expect(c.phaseIds()).toContain(B);
    expect(c.attempts()).toContain(`${B}:9`);
    expect(keys(c), 'its Standing stays').toContain(`phase:${B}/all`);
    expect(msgsOf(c, m).filter((x) => x['type'] !== 'diagnostics.updated'), 'nothing moved at all').toEqual([]);

    const m2 = c.notifications().length;
    c.applyUnit(w.read(200, 170, [A])); // later than every tcp delivery
    expect(ofType(msgsOf(c, m2), 'phase.deleted'), 'the next save removes').toHaveLength(1);
    expect(c.phaseIds()).not.toContain(B);
  });

  it('item 54 (c): changedAfter EQUAL to the latest tcp delivery does not qualify ("later than"); null never qualifies', () => {
    const { w, c } = setup();
    c.applyUnit([w.snap('tcp', B, 150, [w.erow('9', 1, 80)])]);
    const m = c.notifications().length;
    c.applyUnit(w.read(160, 150, [A]));
    c.applyUnit(w.read(170, null, [A]));
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'equal and null are both refused').toEqual([]);
    expect(c.phaseIds()).toContain(B);
    c.applyUnit(w.read(180, 151, [A]));
    expect(c.phaseIds(), 'a content age after it removes').not.toContain(B);
  });

  it('item 54 (c): a TCP Schedule message naming B, delivered after changedAfter, counts like any tcp observation of the Phase', () => {
    const { w, c } = setup();
    const data = `<Canoe123 System="Main"><Schedule><Race Order="1" RaceId="${B}" Race="K1 muži" MainTitle="K1 muži" SubTitle="Run 2" ShortTitle="K1M" RaceStatus="5" /></Schedule></Canoe123>`;
    const els = parseTcp(data, ingestCtx({ observedAt: at(150) })) as unknown as GivenElement[];
    expect((els as any[]).some((e) => e.phaseId === B && e.source === 'tcp'), 'precondition: the TCP Schedule states B').toBe(true);
    c.applyUnit(els);
    const m = c.notifications().length;
    c.applyUnit(w.read(160, 140, [A]));
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'refused: TCP\'s Schedule named B after the file was written').toEqual([]);
    expect(c.phaseIds()).toContain(B);
    c.applyUnit(w.read(200, 170, [A]));
    expect(c.phaseIds()).not.toContain(B);
  });

  it('item 54 (c): a TCP observation of one of B\'s Attempts (an on-course listing), delivered after changedAfter, refuses; none of B\'s Attempts being on course', () => {
    const { w, c } = setup();
    const k = kit(`${B}:9`, B);
    c.applyUnit(k.listing(at(155), at(150), at(154), { runSeconds: 80 })); // a finished listing delivered at 155; the closure follows
    c.applyUnit([k.event('oncourse-left', at(156))]);
    expect(c.oncourse().attemptIds, 'precondition: off course, so only the delivery clause can refuse').not.toContain(`${B}:9`);
    const m = c.notifications().length;
    c.applyUnit(w.read(160, 152, [A])); // 152 is before the listing's delivery at 155
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'refused by the listing\'s delivery').toEqual([]);
    expect(c.phaseIds()).toContain(B);
    c.applyUnit(w.read(200, 170, [A]));
    expect(c.phaseIds()).not.toContain(B);
  });

  it('item 54 (c): an Attempt of B in the on-course set is never removed with it, however old the content; once it leaves, the next admitted read removes', () => {
    const { w, c } = setup();
    const k = kit(`${B}:9`, B);
    c.applyUnit(k.listing(at(120), at(120))); // started, not finished: on course
    expect(c.oncourse().attemptIds, 'precondition: on course').toContain(`${B}:9`);
    const m = c.notifications().length;
    c.applyUnit(w.read(300, 290, [A])); // changedAfter long after the listing: the delivery clause is satisfied, the on-course clause is the only refusal
    expect(ofType(msgsOf(c, m), 'phase.deleted')).toEqual([]);
    expect(c.phaseIds()).toContain(B);
    expect(c.attempts()).toContain(`${B}:9`);

    c.applyUnit([k.event('oncourse-left', at(310))]);
    expect(c.oncourse().attemptIds).not.toContain(`${B}:9`);
    const m2 = c.notifications().length;
    c.applyUnit(w.read(400, 390, [A]));
    expect(ofType(msgsOf(c, m2), 'phase.deleted'), 'now removed').toHaveLength(1);
  });
});

describe('#382 row 5: only a Phase an XML schedule statement has named is removed (item 54 (b))', () => {
  it('item 54 (b): a Phase only TCP has named stays when an admitted XML statement does not name it', () => {
    const w = world();
    const c: any = coreWith([]);
    const C = 'K1M_BR1_7';
    c.applyUnit([w.snap('tcp', C, 10, [w.erow('5', 1, 80)])]);
    c.applyUnit(w.read(100, null, [A], w.snap('xml', A, 100, [{ bib: '1' }])));
    expect(c.phaseIds(), 'precondition: both exist').toEqual(expect.arrayContaining([A, C]));
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [A], w.snap('xml', A, 200, [{ bib: '1' }])));
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'C was never named by an XML statement').toEqual([]);
    expect(c.phaseIds()).toContain(C);
    expect(c.attempts()).toContain(`${C}:5`);
  });

  it('item 54 (b): a Phase named by the FIRST statement is removed by a later admitted one (a first read names it too); TCP\'s own Schedule never removes', () => {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, B, 'second', A), w.snap('xml', B, 100, [w.erow('9', 1, 80)])));
    // a TCP Schedule that names only A: item 38 (d)'s rule, TCP states no absence
    const data = `<Canoe123 System="Main"><Schedule><Race Order="1" RaceId="${A}" Race="K1 muži" MainTitle="K1 muži" SubTitle="Run 1" ShortTitle="K1M" RaceStatus="5" /></Schedule></Canoe123>`;
    c.applyUnit(parseTcp(data, ingestCtx({ observedAt: at(110) })) as unknown as GivenElement[]);
    expect(c.phaseIds(), 'TCP\'s Schedule without B removes nothing').toContain(B);
    const m = c.notifications().length;
    c.applyUnit(w.read(300, 200, [A])); // 200 is after the tcp Schedule at 110
    expect(ofType(msgsOf(c, m), 'phase.deleted')).toHaveLength(1);
    expect(c.phaseIds()).not.toContain(B);
  });

  it('item 54 (b): the statement that first names the Phases removes none (nothing was named before it)', () => {
    const w = world();
    const c: any = coreWith([]);
    const m = c.notifications().length;
    c.applyUnit(w.read(100, 90, [A], w.snap('xml', A, 100, [{ bib: '1' }])));
    expect(ofType(msgsOf(c, m), 'phase.deleted')).toEqual([]);
    expect(c.phaseIds()).toContain(A);
  });
});

describe('#382 row 6: an empty schedule removes nothing and raises xml-schedule-emptied once (item 54 (k); vector phase-kept-when-schedule-table-empty)', () => {
  function two() {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, B, 'second', A), w.snap('xml', A, 100, [{ bib: '1' }]), w.snap('xml', B, 100, [{ bib: '9' }])));
    expect(c.phaseIds(), 'precondition').toEqual(expect.arrayContaining([A, B]));
    drain(c);
    return { w, c };
  }

  it('item 54 (k): an admitted empty statement removes nothing, raises one xml-schedule-emptied (count of the Phases it would have removed); a second empty one raises none', () => {
    const { w, c } = two();
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, []));
    expect(ofType(msgsOf(c, m), 'phase.deleted'), 'removes nothing').toEqual([]);
    expect(c.phaseIds()).toEqual(expect.arrayContaining([A, B]));
    expect(c.attempts()).toEqual(expect.arrayContaining([`${A}:1`, `${B}:9`]));
    const first = drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied');
    expect(first, 'raised once').toHaveLength(1);
    expect(first[0]).toMatchObject({ kind: 'xml-schedule-emptied', count: 2 });

    c.applyUnit(w.read(300, 290, []));
    expect(drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied'), 'not again while it stays empty').toEqual([]);
    expect(c.phaseIds()).toEqual(expect.arrayContaining([A, B]));
  });

  it('item 54 (k): a statement that names a race re-arms it; the next empty one raises again', () => {
    const { w, c } = two();
    c.applyUnit(w.read(200, 190, []));
    expect(drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied'), 'precondition: raised').toHaveLength(1);
    c.applyUnit(w.read(300, 290, [A, B]));
    expect(drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied'), 'a naming statement raises nothing').toEqual([]);
    c.applyUnit(w.read(400, 390, []));
    expect(drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied'), 're-armed: raised again').toHaveLength(1);
    expect(c.phaseIds()).toEqual(expect.arrayContaining([A, B]));
  });

  it('item 54 (k): under the guard: an empty statement whose content age is not admitted (null, or before a tcp delivery) raises none; with no Phase an XML statement named it raises none', () => {
    const { w, c } = two();
    c.applyUnit([w.snap('tcp', B, 150, [{ bib: '9', placement: { rank: 1, order: 1 }, outcome: dur(80), judgingComplete: true }])]);
    c.applyUnit(w.read(160, null, []));
    c.applyUnit(w.read(170, 140, []));
    // A is admitted (no tcp observation of it), B is not: the count is the Phases that WOULD have been removed, the guard applied
    const raised = drain(c).filter((d) => d['kind'] === 'xml-schedule-emptied');
    expect(raised.every((d) => d['count'] === 1), 'only A would have gone, B is held by the guard').toBe(true);
    const fresh = world();
    const c2: any = coreWith([]);
    c2.applyUnit(fresh.read(100, 90, []));
    expect(drain(c2), 'nothing to remove: nothing raised').toEqual([]);
  });
});

describe('#382 row 9: pairing after a removal (item 54 (h))', () => {
  const sib = (c: any, id: string): unknown => (c.phase(id)['pair'] as { siblingPhaseId?: unknown } | null)?.siblingPhaseId;
  function pair() {
    const w = world();
    const c: any = coreWith([]);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, A, 'first', null), w.described(100, B, 'second', A),
      w.snap('xml', A, 100, [{ bib: '1' }]), w.snap('xml', B, 100, [w.erow('9', 1, 82.36, { pairTotal: 160 })])));
    expect(sib(c, B), 'precondition: the second run names the first').toBe(A);
    expect(sib(c, A), 'precondition: the first run is derived naming the second').toBe(B);
    return { w, c };
  }

  it.each([['without restating', false], ['with the parser restating the first run\'s null sibling', true]])('item 54 (h)(i), vector phase-removed-when-schedule-omits-it: the second run removed (%s): the first run presents sibling null, its phase.updated after the phase.deleted, in the same unit', (_n, restate) => {
    const { w, c } = pair();
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [A], restate ? w.described(200, A, 'first', null) : [], w.snap('xml', A, 200, [{ bib: '1' }])));
    const unit = msgsOf(c, m);
    const iDel = unit.findIndex((x) => x['type'] === 'phase.deleted' && x['phaseId'] === B);
    const upd = unit.map((x, i) => ({ x, i })).filter((e) => e.x['type'] === 'phase.updated' && e.x['phaseId'] === A && e.x['fields']?.['pair'] !== undefined);
    expect(iDel, 'the unit carries the phase.deleted').toBeGreaterThanOrEqual(0);
    expect(upd, 'one phase.updated carries the first run\'s pair').toHaveLength(1);
    expect(upd[0]!.x['fields']['pair'], 'derived again: no sibling').toMatchObject({ role: 'first', siblingPhaseId: null });
    expect(upd[0]!.i, 'after the phase.deleted').toBeGreaterThan(iDel);
    expect(sib(c, A)).toBeNull();
  });

  it('item 54 (h): the first run removed: the surviving second run presents siblingPhaseId null (not the removed Phase), its phase.updated after the phase.deleted, same unit; its pair Standing goes with the first run and is published again when a first run is named', () => {
    const { w, c } = pair();
    expect(keys(c), 'precondition: the second run\'s pair Standing is built').toContain(`pair:${B}/all`);
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [B], w.snap('xml', B, 200, [w.erow('9', 1, 82.36, { pairTotal: 160 })])));
    const unit = msgsOf(c, m);
    const iDel = unit.findIndex((x) => x['type'] === 'phase.deleted' && x['phaseId'] === A);
    const upd = unit.map((x, i) => ({ x, i })).filter((e) => e.x['type'] === 'phase.updated' && e.x['phaseId'] === B && e.x['fields']?.['pair'] !== undefined);
    expect(iDel).toBeGreaterThanOrEqual(0);
    expect(upd, 'the surviving second run is sent again').toHaveLength(1);
    expect(upd[0]!.x['fields']['pair']).toMatchObject({ role: 'second', siblingPhaseId: null });
    expect(upd[0]!.i).toBeGreaterThan(iDel);
    expect(sib(c, B), 'never a pointer to a removed Phase at a unit boundary').toBeNull();
    expect(keys(c), 'the pair Standing naming the removed first run is gone').not.toContain(`pair:${B}/all`);

    // a later statement names a first run again: the second run's pair Standing comes back from its entries
    const m2 = c.notifications().length;
    c.applyUnit(w.read(300, 290, [A, B], w.described(300, A, 'first', null), w.described(300, B, 'second', A), w.snap('xml', A, 300, [{ bib: '1' }]), w.snap('xml', B, 300, [w.erow('9', 1, 82.36, { pairTotal: 160 })])));
    expect(sib(c, B)).toBe(A);
    expect(ofType(msgsOf(c, m2), 'standing.updated').some((s) => s['standing']?.standingKey === `pair:${B}/all`), 'published again').toBe(true);
  });

  it('item 54 (h): "narrow on purpose": a second run naming a Phase nothing has stated keeps item 49 (b)\'s presentation; removing an unrelated Phase sends no phase.updated for it', () => {
    const w = world();
    const c: any = coreWith([]);
    const V = 'K1M_BR1_8';
    c.applyUnit(w.read(100, null, [A, B, V], w.described(100, A, 'first', null), w.described(100, B, 'second', A), w.snap('xml', V, 100, [{ bib: '4' }]), w.snap('xml', B, 100, [{ bib: '9' }]), w.snap('xml', A, 100, [{ bib: '1' }])));
    expect(c.phaseIds(), 'precondition').toContain(V);
    const m = c.notifications().length;
    c.applyUnit(w.read(200, 190, [A, B], w.snap('xml', A, 200, [{ bib: '1' }])));
    const unit = msgsOf(c, m);
    expect(ofType(unit, 'phase.deleted').map((x) => x['phaseId'])).toEqual([V]);
    expect(unit.filter((x) => x['type'] === 'phase.updated' && x['fields']?.['pair'] !== undefined), 'A and B named nothing removed: no pair re-sent').toEqual([]);
  });
});

describe('#382 row 10: a returning Phase is created whole, run 1, none of the removed result state (item 54 (j); vector phase-removed-then-returns)', () => {
  it('item 54 (j): B removed (an Attempt in generation 2 with a tcp result), then a statement naming B with a start-list row: B is new and whole, the Attempt run 1, not-yet, the date the snapshot\'s', () => {
    const w = world();
    const c: any = coreWith([]);
    const AT = `${B}:9`;
    const k = kit(AT, B);
    c.applyUnit(w.read(100, null, [A, B], w.described(100, A, 'first', null), w.described(100, B, 'second', A, '2026-09-15'), w.snap('xml', A, 100, [{ bib: '1' }]), w.snap('xml', B, 100, [{ bib: '9' }])));
    c.applyUnit([{ ingestSeq: 900, attemptId: AT, field: 'run', source: 'tcp', kind: 'inference', observedAt: at(110), value: 2, confidence: 'authoritative' } as unknown as GivenElement]);
    c.applyUnit([k.snap('tcp', at(120), { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    expect(c.presented(AT)['run'], 'precondition: generation 2').toMatchObject({ state: 'known', value: 2 });
    expect(c.presented(AT)['outcome'], 'precondition: a tcp result').toMatchObject({ state: 'known', source: 'tcp' });
    expect(c.phase(B)['date'], 'precondition: the old date').toBe('2026-09-15');

    c.applyUnit(w.read(300, 290, [A], w.snap('xml', A, 300, [{ bib: '1' }])));
    expect(c.phaseIds(), 'precondition: removed').not.toContain(B);
    expect(c.attempts()).not.toContain(AT);

    const m = c.notifications().length;
    c.applyUnit(w.read(400, 390, [A, B], w.described(400, A, 'first', null), w.described(400, B, 'second', A, '2026-09-16'), w.snap('xml', B, 400, [{ bib: '9' }])));
    const unit = msgsOf(c, m);
    const created = unit.filter((x) => x['type'] === 'phase.updated' && x['phaseId'] === B);
    expect(created, 'a phase.updated creates B').toHaveLength(1);
    for (const f of ['classId', 'format', 'pair', 'date']) expect(created[0]!['fields'], `whole resource: ${f}`).toHaveProperty(f);
    expect(c.phase(B)['date'], 'the date is the snapshot\'s, INV-5 once-only is per Phase').toBe('2026-09-16');
    expect(c.attempts()).toContain(AT);
    expect(c.presented(AT)['run'], 'run 1: none of the removed Attempt\'s generation').toMatchObject({ state: 'known', value: 1 });
    expect(c.presented(AT)['outcome'], 'none of the removed result state').toEqual({ state: 'not-yet' });
    expect(unit.filter((x) => x['type'] === 'attempt.updated' && x['attemptId'] === AT), 'the Attempt is created in the unit').not.toEqual([]);
  });
});

describe('#382 row 11: a removed classification Phase takes its rows and kept decidedIn (item 54 (i); item 52)', () => {
  it('item 54 (i): an XER Phase with an xml row decidedIn F, removed and returning: a tcp row stating null does not bring the kept F back; its Standing was removed with it', () => {
    const w = world();
    const c: any = coreWith([]);
    const X = 'MX1_XER_26';
    const crow = (decidedIn: string | null) => ({ entryId: 'EA', bib: '4', rank: 1, order: 1, decidedIn });
    const sentFor = (from: number): Array<Record<string, any>> => ofType(msgsOf(c, from), 'standing.updated').map((s) => s['standing']).filter((s) => s.standingKey === `classification:${X}/all`);
    c.applyUnit(w.read(100, null, [A, X], w.snap('xml', X, 100, [crow('F')], 'results')));
    expect(keys(c), 'precondition: the classification Standing').toContain(`classification:${X}/all`);
    expect(c.standings().find((s: any) => s.standingKey === `classification:${X}/all`).entries[0], 'precondition: kept decidedIn F').toMatchObject({ decidedIn: 'F' });

    const m = c.notifications().length;
    c.applyUnit(w.read(300, 290, [A], w.snap('xml', A, 300, [{ bib: '1' }])));
    expect(ofType(msgsOf(c, m), 'phase.deleted').map((x) => x['phaseId'])).toEqual([X]);
    expect(keys(c), 'the classification Standing went with it').not.toContain(`classification:${X}/all`);

    c.applyUnit(w.read(400, 390, [A, X], w.snap('xml', X, 400, [], 'start-list')));
    const m2 = c.notifications().length;
    c.applyUnit([w.snap('tcp', X, 500, [crow(null)], 'results')]);
    const rows = sentFor(m2);
    expect(rows, 'the tcp row builds the Standing again').toHaveLength(1);
    expect(rows[0]!['entries'][0], 'no kept decidedIn from before the removal').toMatchObject({ entryId: 'EA', decidedIn: null });
  });
});
