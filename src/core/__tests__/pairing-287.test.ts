import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { createMergeCore } from '../index.js';
import { coreWith, type Unit } from './streams.js';
import type { MergePort } from '../../__tests__/conformance/port.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

/**
 * #287 row 12 (CONTRACTS §2.4 Pairing, §5 step 1; DERIVATIONS §2.1 "no id is parsed or built"; design-authority record item 17):
 * the core reads a Phase's STATED `pair.siblingPhaseId` and nothing else. It builds no id from `${class}_${token}_${rest}`.
 *
 * Hand streams in the element shape the parsers emit. `classIdsFromIds: false` switches off the kit's id-derived class convention, and every
 * Phase here states its own `classId`, `format` and `pair`, so a core that reads an id for any of them is the only one that can fail.
 */

type Std = { standingKey: string; scope: Record<string, unknown> };
const el = (e: unknown): GivenElement => e as GivenElement;
const duration = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });

type Described = { id: string; cls: string; format: string; role: 'first' | 'second'; sibling: string | null; combination?: 'best' | 'sum' };
/** One unit stating a Phase the way a parser does (`classId`, `format`, `pair`; source tcp, kind result-row, as the adapter states them). */
const describe_ = (t: number, p: Described): Unit => {
  const base = { observedAt: at(t), phaseId: p.id, source: 'tcp', kind: 'result-row', confidence: 'authoritative' };
  return [
    el({ ingestSeq: 0, ...base, field: 'classId', value: p.cls }),
    el({ ingestSeq: 0, ...base, field: 'format', value: p.format }),
    el({ ingestSeq: 0, ...base, field: 'pair', value: { role: p.role, siblingPhaseId: p.sibling, combination: p.combination ?? 'best' } }),
  ];
};
/** The reader's rewrite event, then the second run's results table with a combined total (the pair standing's input). */
const secondRunTable = (t: number, phaseId: string): Unit => [
  el({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(t - 5) }),
  el({ ingestSeq: 0, observedAt: at(t), snapshot: { source: 'xml', phaseId, mode: 'results', rows: [
    { bib: '9', outcome: duration(82), placement: { rank: 1, order: 1 }, judgingComplete: true, entry: { entryId: 'E9' }, pairTotal: 160 },
  ] } }),
];
const standings = (c: ReturnType<typeof coreWith>): Std[] => c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std);
const keyed = (c: ReturnType<typeof coreWith>, key: string): Std[] => standings(c).filter((s) => s.standingKey === key);

describe('#287 row 12: the core reads the stated sibling only (CONTRACTS §2.4, DERIVATIONS §2.1)', () => {
  it('control, CONTRACTS §5 step 1: conventional ids with a stated sibling publish the pair standing (guards the hand stream)', () => {
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: 'K1M_BR2_19' }),
      describe_(2, { id: 'K1M_BR2_19', cls: 'K1M', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }),
      secondRunTable(10, 'K1M_BR2_19'),
    ], { classIdsFromIds: false });
    expect(keyed(c, 'phase:K1M_BR2_19/all')).toHaveLength(1);
    expect(keyed(c, 'pair:K1M_BR2_19/all')).toHaveLength(1);
  });

  it('CONTRACTS §2.4 (rename example): K1M-X_BR2_19 states sibling K1M_BR1_19, an id it does not share a prefix with: the pair standing is published, scope naming the stated first run', () => {
    expect('K1M-X_BR1_19').not.toBe('K1M_BR1_19'); // precondition: the id a core would build (class_token_rest) is not the stated one
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_19', cls: 'K1M-X', format: 'BR1', role: 'first', sibling: 'K1M-X_BR2_19' }),
      describe_(2, { id: 'K1M-X_BR2_19', cls: 'K1M-X', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }),
      secondRunTable(10, 'K1M-X_BR2_19'),
    ], { classIdsFromIds: false });
    expect(keyed(c, 'phase:K1M-X_BR2_19/all'), 'the phase standing exists, so the Phase is described').toHaveLength(1);
    const pair = keyed(c, 'pair:K1M-X_BR2_19/all');
    expect(pair).toHaveLength(1);
    expect(pair[0]!.scope).toEqual({ kind: 'pair', firstPhaseId: 'K1M_BR1_19', secondPhaseId: 'K1M-X_BR2_19' });
  });

  it('CONTRACTS §2.4 + item 48: a BR2 whose stated sibling is null gets no pair standing even though a Phase with the conventional id (K1M_BR1_19) exists', () => {
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: null }),
      describe_(2, { id: 'K1M_BR2_19', cls: 'K1M', format: 'BR2', role: 'second', sibling: null }),
      secondRunTable(10, 'K1M_BR2_19'),
    ], { classIdsFromIds: false });
    expect(c.phase('K1M_BR1_19')['format']).toBe('BR1'); // precondition: the conventional first run is known to the core
    expect(keyed(c, 'phase:K1M_BR2_19/all'), 'the phase standing exists').toHaveLength(1);
    expect(keyed(c, 'pair:K1M_BR2_19/all')).toEqual([]);
  });

  it('DERIVATIONS §2.1 (a class mismatch is not a pair): both K1M ids, the BR2 states class K1M_ST and sibling null: no pair standing although the ids share a prefix', () => {
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_6', cls: 'K1M', format: 'BR1', role: 'first', sibling: null }),
      describe_(2, { id: 'K1M_BR2_6', cls: 'K1M_ST', format: 'BR2', role: 'second', sibling: null }),
      secondRunTable(10, 'K1M_BR2_6'),
    ], { classIdsFromIds: false });
    expect(keyed(c, 'phase:K1M_BR2_6/all')).toHaveLength(1);
    expect(keyed(c, 'pair:K1M_BR2_6/all')).toEqual([]);
  });

  it('CONTRACTS §5 step 1 (the sibling becoming known): a pair stated later publishes the pair standing once, and the phase standing is unchanged', () => {
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_19', cls: 'K1M-X', format: 'BR1', role: 'first', sibling: null }),
      describe_(2, { id: 'K1M-X_BR2_19', cls: 'K1M-X', format: 'BR2', role: 'second', sibling: null }),
      secondRunTable(10, 'K1M-X_BR2_19'),
    ], { classIdsFromIds: false });
    expect(keyed(c, 'phase:K1M-X_BR2_19/all')).toHaveLength(1);
    expect(keyed(c, 'pair:K1M-X_BR2_19/all')).toEqual([]);
    c.applyUnit(describe_(20, { id: 'K1M-X_BR2_19', cls: 'K1M-X', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }));
    expect(keyed(c, 'pair:K1M-X_BR2_19/all')).toHaveLength(1);
    expect(keyed(c, 'phase:K1M-X_BR2_19/all')).toHaveLength(1);
  });
  describe('a re-baseline of a first run re-sends the sibling named by its stated pair, and no other (CONTRACTS §2.4; item 17 code follow-up: replacedStandings reads the stated sibling)', () => {
    const table = (t: number, phaseId: string, source: 'xml' | 'tcp', extra: Unit = []): Unit => [
      ...(source === 'xml' ? [el({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(t - 5) })] : []),
      ...extra,
      el({ ingestSeq: 0, observedAt: at(t), snapshot: { source, phaseId, mode: 'results', rows: [
        { bib: '9', outcome: duration(82), placement: { rank: 1, order: 1 }, judgingComplete: true, entry: { entryId: 'E9' }, pairTotal: 160 },
      ] } }),
    ];
    const replacedKeys = (c: ReturnType<typeof coreWith>): string[] => {
      const m = c.notifications().filter((n) => n.type === 'scope.replaced').at(-1) as Record<string, any> | undefined;
      expect(m, 'a scope.replaced message was sent').toBeDefined();
      return (m!['standings'] as Std[]).map((x) => x.standingKey);
    };
    const rebase = (t: number, phaseId: string): Unit => table(t, phaseId, 'xml', [el({ ingestSeq: 0, event: 'rebaseline', observedAt: at(t), scope: { kind: 'phase', phaseId } })]);
    const stream = (firstSibling: string | null, secondId: string, secondClass: string, secondSibling: string | null = null): ReturnType<typeof coreWith> =>
      coreWith([
        describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: firstSibling }),
        describe_(2, { id: secondId, cls: secondClass, format: 'BR2', role: 'second', sibling: secondSibling }),
        table(10, secondId, 'tcp'),
        table(11, 'K1M_BR1_19', 'tcp'),
        rebase(30, 'K1M_BR1_19'),
      ], { classIdsFromIds: false });

    it('control (item 48: the second run names the first run, so the first run\'s derived sibling is that second run): the re-baseline re-sends the first run\'s standing and the pair standing', () => {
      const keys = replacedKeys(stream('K1M_BR2_19', 'K1M_BR2_19', 'K1M', 'K1M_BR1_19'));
      expect(keys).toContain('phase:K1M_BR1_19/all');
      expect(keys).toContain('pair:K1M_BR2_19/all');
    });

    it('#333, CONTRACTS §7.2 "every Standing whose scope names one of its Phases": a first-run re-baseline does not carry the second run\'s phase standing (fixture A, K1M_BR1_19 at 09:39:00, carried 7)', () => {
      const c = stream('K1M_BR2_19', 'K1M_BR2_19', 'K1M', 'K1M_BR1_19');
      expect(keyed(c, 'phase:K1M_BR2_19/all').length, 'precondition: the second run has a phase standing').toBeGreaterThan(0);
      const keys = replacedKeys(c);
      expect(keys.filter((k) => k.startsWith('phase:K1M_BR2_19/'))).toEqual([]);
      expect(keys).toContain('pair:K1M_BR2_19/all');
    });

    it('a first run stating sibling null: the re-baseline re-sends its own standing only, though a Phase with the conventional second-run id exists', () => {
      const c = stream(null, 'K1M_BR2_19', 'K1M');
      expect(keyed(c, 'phase:K1M_BR2_19/all').length, 'precondition: the conventional second run has a standing to re-send').toBeGreaterThan(0);
      const keys = replacedKeys(c);
      expect(keys).toContain('phase:K1M_BR1_19/all');
      expect(keys.filter((k) => k.includes('K1M_BR2_19'))).toEqual([]);
    });
    it('N1, CONTRACTS §7.2 "pair on either side": a first run named by two second runs (different days, the derived sibling is the same-day one): its re-baseline\'s scope.replaced carries both pair standings', () => {
      const day = (t: number, ...d: Array<[string, string]>): Unit => [
        el({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(t - 5) }),
        ...d.map(([id, v]) => el({ ingestSeq: 0, observedAt: at(t), phaseId: id, field: 'date', source: 'xml', kind: 'result-row', value: v, confidence: 'authoritative' })),
      ];
      const c = coreWith([
        describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: null }),
        describe_(2, { id: 'K1M_BR2_19', cls: 'K1M', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }),
        describe_(3, { id: 'K1M_BR2_20', cls: 'K1M', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }),
        day(4, ['K1M_BR1_19', '2026-09-19'], ['K1M_BR2_19', '2026-09-19'], ['K1M_BR2_20', '2026-09-20']),
        table(10, 'K1M_BR2_19', 'tcp'),
        table(11, 'K1M_BR2_20', 'tcp'),
        table(12, 'K1M_BR1_19', 'tcp'),
        rebase(30, 'K1M_BR1_19'),
      ], { classIdsFromIds: false });
      expect((c.phase('K1M_BR1_19')['pair'] as { siblingPhaseId: string }).siblingPhaseId, 'precondition: the derived sibling is the same-day second run').toBe('K1M_BR2_19');
      expect(keyed(c, 'pair:K1M_BR2_19/all').length, 'precondition: both pair standings were published').toBeGreaterThan(0);
      expect(keyed(c, 'pair:K1M_BR2_20/all').length).toBeGreaterThan(0);
      const keys = replacedKeys(c);
      expect(keys).toContain('pair:K1M_BR2_19/all');
      expect(keys).toContain('pair:K1M_BR2_20/all');
    });
  });

  it('CONFORMANCE-VECTORS §1 "a deployable\'s merge reads no id": a second run whose class and format are stated but whose pair nothing has stated has no pair standing, though K1M_BR1_19 exists', () => {
    const c = coreWith([
      describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: null }),
      describe_(2, { id: 'K1M_BR2_19', cls: 'K1M', format: 'BR2', role: 'second', sibling: null }).filter((e) => (e as Record<string, unknown>)['field'] !== 'pair'),
      secondRunTable(10, 'K1M_BR2_19'),
    ], { classIdsFromIds: false });
    expect(keyed(c, 'phase:K1M_BR2_19/all'), 'the phase standing exists').toHaveLength(1);
    expect(c.phase('K1M_BR2_19')['pair']).not.toMatchObject({ role: 'second' });
    expect(keyed(c, 'pair:K1M_BR2_19/all')).toEqual([]);
  });
});

describe('#287 a first run\'s sibling is derived in the core: the inverse of the second runs\' stated pairs (DERIVATIONS §2.1, §10 item 48; CONTRACTS §2.4)', () => {
  const BASE = { source: 'tcp', kind: 'result-row', confidence: 'authoritative' };
  /** The Phase's `date`, as the snapshot states it: an xml unit with the reader's rewrite event first. */
  const dated = (t: number, ...days: Array<[id: string, day: string]>): Unit => [
    el({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(t - 5) }),
    ...days.map(([id, day]) => el({ ingestSeq: 0, observedAt: at(t), phaseId: id, field: 'date', source: 'xml', kind: 'result-row', value: day, confidence: 'authoritative' })),
  ];
  const sibling = (c: ReturnType<typeof coreWith>, id: string): unknown => (c.phase(id)['pair'] as { siblingPhaseId?: unknown } | null)?.siblingPhaseId;
  const phaseUpdates = (c: ReturnType<typeof coreWith>, from: number, id: string): Array<Record<string, any>> =>
    (c.notifications().slice(from) as Array<Record<string, any>>).filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === id);
  const R = (id: string, format: string, role: 'first' | 'second', sibling: string | null) => ({ id, cls: 'K1M', format, role, sibling });
  void BASE;

  it('(a) item 48: a BR1 stated with sibling null, then a unit in which the BR2 states sibling BR1: the BR1 presents the BR2 and its change is notified in that unit', () => {
    const c = coreWith([describe_(1, R('K1M_BR1_19', 'BR1', 'first', null))], { classIdsFromIds: false });
    expect(sibling(c, 'K1M_BR1_19'), 'precondition: no second run names it yet').toBeNull();
    const m = c.notifications().length;
    c.applyUnit(describe_(5, R('K1M_BR2_19', 'BR2', 'second', 'K1M_BR1_19')));
    expect(sibling(c, 'K1M_BR1_19')).toBe('K1M_BR2_19');
    const changes = phaseUpdates(c, m, 'K1M_BR1_19');
    expect(changes.length, 'a phase.updated for the first run in the same unit').toBeGreaterThan(0);
    expect(JSON.stringify(changes.at(-1)!['fields']['pair'])).toContain('K1M_BR2_19');
  });

  it('(b) DERIVATIONS §2.1 example: BR1 19th, BR1 20th, then the BR2 of the 20th last: the BR1 of the 20th names it, the BR1 of the 19th stays null', () => {
    const c = coreWith([
      describe_(1, R('K1M_BR1_19', 'BR1', 'first', null)),
      describe_(2, R('K1M_BR1_20', 'BR1', 'first', null)),
      dated(3, ['K1M_BR1_19', '2026-09-19'], ['K1M_BR1_20', '2026-09-20']),
    ], { classIdsFromIds: false });
    expect(sibling(c, 'K1M_BR1_19')).toBeNull(); // preconditions: both first runs exist, nothing names either
    expect(sibling(c, 'K1M_BR1_20')).toBeNull();
    c.applyUnit(describe_(6, R('K1M_BR2_20', 'BR2', 'second', 'K1M_BR1_20')));
    c.applyUnit(dated(7, ['K1M_BR2_20', '2026-09-20']));
    expect(sibling(c, 'K1M_BR1_20')).toBe('K1M_BR2_20');
    expect(sibling(c, 'K1M_BR1_19')).toBeNull();
  });

  it('(b2) item 48 shape: two BR2 naming one BR1 (a day each): the BR1 names the one on its own day', () => {
    const c = coreWith([
      describe_(1, R('K1M_BR1_19', 'BR1', 'first', null)),
      describe_(2, R('K1M_BR2_19', 'BR2', 'second', 'K1M_BR1_19')),
      describe_(3, R('K1M_BR2_20', 'BR2', 'second', 'K1M_BR1_19')),
      dated(4, ['K1M_BR1_19', '2026-09-19'], ['K1M_BR2_19', '2026-09-19'], ['K1M_BR2_20', '2026-09-20']),
    ], { classIdsFromIds: false });
    expect(sibling(c, 'K1M_BR2_20')).toBe('K1M_BR1_19'); // precondition: both second runs state the one first run
    expect(sibling(c, 'K1M_BR1_19')).toBe('K1M_BR2_19');
  });

  it.each([
    ['none on its day (BR1 19th; BR2s on the 20th and 21st)', [['K1M_BR2_20', '2026-09-20'], ['K1M_BR2_21', '2026-09-21']] as Array<[string, string]>],
    ['more than one on its day (two BR2 on the 19th)', [['K1M_BR2_19', '2026-09-19'], ['K1M_BR2_19B', '2026-09-19']] as Array<[string, string]>],
    ['no date known for the second runs', [] as Array<[string, string]>],
  ])('(d) item 48 tie: several second runs name one first run and %s: the first run presents null', (_n, days) => {
    const seconds = days.length > 0 ? days.map(([id]) => id) : ['K1M_BR2_20', 'K1M_BR2_21'];
    const c = coreWith([
      describe_(1, R('K1M_BR1_19', 'BR1', 'first', null)),
      ...seconds.map((id, i) => describe_(2 + i, R(id, 'BR2', 'second', 'K1M_BR1_19'))),
      ...(days.length > 0 ? [dated(5, ['K1M_BR1_19', '2026-09-19'], ...days)] : []),
    ], { classIdsFromIds: false });
    for (const id of seconds) expect(sibling(c, id), `precondition: ${id} names the first run`).toBe('K1M_BR1_19');
    expect(sibling(c, 'K1M_BR1_19')).toBeNull();
  });

  it('(c) a BR1 whose stated sibling names a BR2 that does not name it back presents null', () => {
    const c = coreWith([
      describe_(1, R('K1M_BR1_19', 'BR1', 'first', 'K1M_BR2_19')),
      describe_(2, R('K1M_BR2_19', 'BR2', 'second', 'K1M_BR1_20')),
      describe_(3, R('K1M_BR1_20', 'BR1', 'first', null)),
    ], { classIdsFromIds: false });
    expect(sibling(c, 'K1M_BR2_19'), 'precondition: the BR2 names the other first run').toBe('K1M_BR1_20');
    expect(sibling(c, 'K1M_BR1_20')).toBe('K1M_BR2_19');
    expect(sibling(c, 'K1M_BR1_19')).toBeNull();
  });
});

describe('#287 item 49 (b) as amended: a second run stops naming a first run only when both classIds are stated and differ', () => {
  const base = { source: 'tcp', kind: 'result-row', confidence: 'authoritative', observedAt: at(1) };
  const state = (id: string, field: string, value: unknown): GivenElement => ({ ingestSeq: 0, ...base, phaseId: id, field, value }) as GivenElement;
  const pairValue = (c: ReturnType<typeof coreWith>, id: string): { siblingPhaseId?: unknown } | null => c.phase(id)['pair'] as { siblingPhaseId?: unknown } | null;

  it('a second run names a first run the core holds with no stated classId: the first run presents that second run as its sibling', () => {
    const c = coreWith([
      [state('K1M_BR1_19', 'format', 'BR1'), state('K1M_BR1_19', 'pair', { role: 'first', siblingPhaseId: null, combination: 'best' })],
      describe_(2, { id: 'K1M_BR2_19', cls: 'K1M', format: 'BR2', role: 'second', sibling: 'K1M_BR1_19' }),
    ], { classIdsFromIds: false });
    expect(c.phase('K1M_BR1_19')['classId'], 'precondition: the first run has no stated class').not.toBe('K1M');
    expect(pairValue(c, 'K1M_BR2_19')?.siblingPhaseId, 'precondition: the second run states the first run').toBe('K1M_BR1_19');
    expect(pairValue(c, 'K1M_BR1_19')?.siblingPhaseId).toBe('K1M_BR2_19');
  });

  it('the first run is nothing-stated (no Phase in the core), only its Attempt is viewed (vector two-run-br1-unavailable-no-live-no-xml): run 2 observed, the first run\'s outcome is unavailable{not-configured}', () => {
    const c = createMergeCore({ attemptId: 'K1M_BR2_6:9', xmlConfigured: false }) as MergePort;
    c.applyUnit([
      state('K1M_BR2_6', 'classId', 'K1M'), state('K1M_BR2_6', 'format', 'BR2'),
      state('K1M_BR2_6', 'pair', { role: 'second', siblingPhaseId: 'K1M_BR1_6', combination: 'best' }),
    ]);
    c.applyUnit([{ ingestSeq: 1, attemptId: 'K1M_BR2_6:9', field: 'outcome', source: 'tcp', kind: 'result-row', observedAt: '2026-09-15T10:14:02.400Z', value: duration(82.36), confidence: 'authoritative', judgingComplete: true } as GivenElement]);
    expect(c.attempts(), 'precondition: run 2 is observed and run 1 has no Phase').toContain('K1M_BR2_6:9');
    expect(c.presented('K1M_BR2_6:9')['outcome'], 'precondition: run 2 presents its outcome').toMatchObject({ state: 'known' });
    expect(c.presented('K1M_BR1_6:9')['outcome']).toMatchObject({ state: 'unavailable', reason: 'not-configured' });
  });
});
