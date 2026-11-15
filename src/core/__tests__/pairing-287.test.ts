import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
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
    const stream = (firstSibling: string | null, secondId: string, secondClass: string): ReturnType<typeof coreWith> =>
      coreWith([
        describe_(1, { id: 'K1M_BR1_19', cls: 'K1M', format: 'BR1', role: 'first', sibling: firstSibling }),
        describe_(2, { id: secondId, cls: secondClass, format: 'BR2', role: 'second', sibling: null }),
        table(10, secondId, 'tcp'),
        table(11, 'K1M_BR1_19', 'tcp'),
        rebase(30, 'K1M_BR1_19'),
      ], { classIdsFromIds: false });

    it('control: a first run stating its second run as sibling: the re-baseline re-sends both Phases\' standings', () => {
      const keys = replacedKeys(stream('K1M_BR2_19', 'K1M_BR2_19', 'K1M'));
      expect(keys).toContain('phase:K1M_BR1_19/all');
      expect(keys).toContain('phase:K1M_BR2_19/all');
    });

    it('a first run stating sibling null: the re-baseline re-sends its own standing only, though a Phase with the conventional second-run id exists', () => {
      const c = stream(null, 'K1M_BR2_19', 'K1M');
      expect(keyed(c, 'phase:K1M_BR2_19/all').length, 'precondition: the conventional second run has a standing to re-send').toBeGreaterThan(0);
      const keys = replacedKeys(c);
      expect(keys).toContain('phase:K1M_BR1_19/all');
      expect(keys.filter((k) => k.includes('K1M_BR2_19'))).toEqual([]);
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
