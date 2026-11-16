import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { coreWith } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #271 CQ3 (code) and CQ7 (CONTRACTS §5 step 6; DERIVATIONS §10 items 46, 52 neighbours; recorded: cp3-cross MX1_XT_26 bib 48 at 08:05:56.796Z, placed
// fourth, 66.70 behind a leader's 66.74). `behindSeconds` is the ranked value minus the first-ordered entry's: null for an untimed row's entry in a
// second-run Phase too, and never negative. Channel: TCP results rows (scope snapshot of the Phase); the `pair` fact the schedule states.

type Std = { standingKey: string; entries: Array<Record<string, any>> };
const el = (e: unknown): GivenElement => e as GivenElement;
const stds = (c: ReturnType<typeof coreWith>, key: string): Std[] => c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === key);
const duration = (t: number) => ({ kind: 'duration', runSeconds: t, penaltySeconds: 0, totalSeconds: t });
const behind = (s: Std) => s.entries.map((e) => [e['bib'], e['behindSeconds']]);

describe('#271 CQ3: behindSeconds of an untimed second-run row (CONTRACTS §5 step 6, step 2)', () => {
  const P1 = 'K1M_BR1_6';
  const P2 = 'K1M_BR2_6';
  const pairFact = el({ ingestSeq: 1, observedAt: at(1), field: 'pair', phaseId: P2, source: 'tcp', kind: 'result-row', value: { role: 'second', siblingPhaseId: P1, combination: 'best' }, confidence: 'authoritative' });
  const timed = (bib: string, rank: number, run: number, pairTotal: number) => ({ bib, entry: { entryId: `E${bib}` }, outcome: duration(run), placement: { rank, order: rank }, pairTotal, judgingComplete: true });

  const untimedNa = { state: 'unavailable', reason: 'not-applicable' };
  const build = (second: Record<string, unknown>) => {
    const c = coreWith([]);
    c.applyUnit([pairFact]);
    c.applyUnit([el({ ingestSeq: 5, observedAt: at(10), snapshot: { source: 'tcp', phaseId: P2, mode: 'results', rows: [
      timed('1', 1, 80, 170),
      { bib: '2', entry: { entryId: 'E2' }, placement: { rank: 2, order: 2 }, pairTotal: 175, judgingComplete: true, ...second },
      timed('3', 3, 82, 180),
    ] } })]);
    return c;
  };

  it('§5 step 6 + step 2: an entry whose row is untimed (outcome unavailable{not-applicable}) has behindSeconds null in its phase and pair standings, the timed entries keep the combined gap', () => {
    const c = build({ outcome: untimedNa });
    expect(c.presented(`${P2}:2`)['outcome'], 'precondition: the Attempt presents the untimed outcome').toMatchObject({ state: 'unavailable', reason: 'not-applicable' });
    for (const key of [`phase:${P2}/all`, `pair:${P2}/all`]) {
      const s = stds(c, key).at(-1);
      expect(s, `${key} published`).toBeDefined();
      const untimed = s!.entries.find((e) => e['bib'] === '2')!;
      expect(untimed['rank'], `${key}: precondition, the untimed entry is placed`).toBe(2);
      expect(untimed['result'], `${key}: precondition, step 2 gives no result`).toBeNull();
      expect(behind(s!), key).toEqual([['1', 0], ['2', null], ['3', 10]]);
    }
    expect(stds(c, `pair:${P2}/all`).at(-1)!.entries.find((e) => e['bib'] === '2')!['pairTotalSeconds'], 'precondition: it has a pairTotal').toBe(175);
  });

  it('§5 step 6 (guard): a pending second-run row (timeEmpty, outcome not yet) has a numeric ranked value, pairTotal: behindSeconds is the combined gap', () => {
    const c = build({ timeEmpty: true });
    for (const key of [`phase:${P2}/all`, `pair:${P2}/all`]) {
      const s = stds(c, key).at(-1)!;
      expect(s.entries.find((e) => e['bib'] === '2')!['result'], `${key}: precondition, pending`).toEqual({ kind: 'pending' });
      expect(behind(s), key).toEqual([['1', 0], ['2', 5], ['3', 10]]);
    }
  });
});

describe('#271 CQ7: behindSeconds is never negative (CONTRACTS §5 step 6; recorded cp3-cross MX1_XT_26 bib 48)', () => {
  const XT = 'MX1_XT_26';
  const row = (bib: string, order: number, total: number) => ({ bib, entry: { entryId: `E${bib}` }, outcome: duration(total), placement: { rank: order, order }, judgingComplete: true });

  it('§5 step 6: a Cross time trial entry ordered behind a leader but with a smaller value has behindSeconds null; one with a larger value gets the positive difference', () => {
    const c = coreWith([]);
    c.applyUnit([el({ ingestSeq: 1, observedAt: at(10), snapshot: { source: 'tcp', phaseId: XT, mode: 'results', rows: [
      row('1', 1, 66.74), row('2', 2, 66.9), row('3', 3, 66.7), row('4', 4, 67),
    ] } })]);
    const s = stds(c, `phase:${XT}/all`).at(-1);
    expect(s, 'published').toBeDefined();
    expect(s!.entries.map((e) => [e['bib'], e['rank']]), 'precondition: the relayed order stands').toEqual([['1', 1], ['2', 2], ['3', 3], ['4', 4]]);
    const b = Object.fromEntries(behind(s!));
    expect(b['1']).toBe(0);
    expect(b['2']).toBeCloseTo(0.16, 6);
    expect(b['3'], 'smaller than the first-ordered entry\'s: null, never negative').toBeNull();
    expect(b['4']).toBeCloseTo(0.26, 6);
    expect(behind(s!).every(([, v]) => v === null || (v as number) >= 0)).toBe(true);
  });

  it('§5 step 6: the same in a slalom first-run Phase (the rule is not Cross-only): a value smaller than the first-ordered entry\'s is null', () => {
    const P = 'K1M_BR1_6';
    const c = coreWith([]);
    c.applyUnit([el({ ingestSeq: 1, observedAt: at(10), snapshot: { source: 'tcp', phaseId: P, mode: 'results', rows: [row('1', 1, 80), row('2', 2, 79), row('3', 3, 82)] } })]);
    const s = stds(c, `phase:${P}/all`).at(-1)!;
    expect(s.entries.map((e) => e['bib']), 'precondition').toEqual(['1', '2', '3']);
    expect(behind(s)).toEqual([['1', 0], ['2', null], ['3', 2]]);
  });
});
