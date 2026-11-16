import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMergeCore } from '../index.js';
import { createContextTracker } from '../../ingest/context-tracker.js';
import { parseTcp, parseXmlSnapshot } from '../../ingest/index.js';
import { TCP } from '../../ingest/__tests__/fixtures/tcp.js';
import { obsOf, withAttr, type El } from '../../ingest/__tests__/helpers.js';
import { at } from './kit.js';
import { coreWith, type Unit } from './streams.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

/**
 * #377 (DERIVATIONS §2.1, §10 items 37, 48, 49; CONFORMANCE-VECTORS §1 "the core reads no class and no pair from an id"; CONTRACTS §2.4; review N6 of PR #376).
 * The core takes `format`, and what follows from it (stage, kind, scoringKind, heats), from the STATED element only; one source of the role.
 * Channels: hand streams in the parser's element shape (TCP), TCP `Results` through the parser, and the XML snapshot (`Schedule.DisId`).
 * Each test builds its own core and clock offsets (kit.ts `at`, no real clock).
 */
const el = (e: unknown): GivenElement => e as GivenElement;
const base = (t: number, id: string) => ({ ingestSeq: 0, observedAt: at(t), phaseId: id, source: 'tcp', kind: 'result-row', confidence: 'authoritative' });
type Stated = { id: string; cls?: string; format?: string; pair?: { role: string; siblingPhaseId: string | null; combination?: string } };
/** One unit stating a Phase the way a parser does; `order` flips classId/format. Nothing is stated that the argument leaves out. */
const stateUnit = (t: number, s: Stated, order: 'class-first' | 'format-first' = 'class-first'): Unit => {
  const cls = el({ ...base(t, s.id), field: 'classId', value: s.cls ?? 'K1M' });
  const fmt = s.format === undefined ? [] : [el({ ...base(t, s.id), field: 'format', value: s.format })];
  const pair = s.pair === undefined ? [] : [el({ ...base(t, s.id), field: 'pair', value: { combination: 'best', ...s.pair } })];
  return order === 'class-first' ? [cls, ...fmt, ...pair] : [...fmt, cls, ...pair];
};
const NO_ID_CLASS = { classIdsFromIds: false };
const rec = (c: MergePort, id: string): Record<string, any> => c.phase(id) as Record<string, any>;

describe('#377 row 2: the core takes a Phase\'s format and its derived fields from the stated element, never from its id (DERIVATIONS §2.1)', () => {
  it.each([
    // [id the token of which would say BR1/XF, stated format, stage, kind, scoringKind, heats]
    ['K1M_BR1_19', 'XF', 'final', 'race', 'ordinal', true],
    ['K1M_XF_19', 'BR2', 'run', 'race', 'duration', false],
    ['K1M_BR1_19', 'XT', 'time-trial', 'race', 'duration', false],
  ] as const)('§2.1: id %s stating format %s presents stage %s, kind %s, scoringKind %s, heats %s (both element orders)', (id, format, stage, kind, scoringKind, heats) => {
    for (const order of ['class-first', 'format-first'] as const) {
      const c = coreWith([stateUnit(1, { id, format }, order)], NO_ID_CLASS);
      const p = rec(c, id);
      expect(p['classId'], `precondition (${order}): the Phase is described by the stated element`).toBe('K1M');
      expect(p['format'], order).toBe(format);
      expect(p['stage'], order).toBe(stage);
      expect(p['kind'], order).toBe(kind);
      expect(p['scoringKind'], order).toBe(scoringKind);
      expect(p['heats'], order).toBe(heats);
    }
  });

  it('§2.1 pair.role: K1M_BR1_19 stating format BR2 and the second-run pair presents role second; K1M_BR2_19 stating BR1 presents first (tokens swapped)', () => {
    const c = coreWith([
      stateUnit(1, { id: 'K1M_BR1_19', format: 'BR2', pair: { role: 'second', siblingPhaseId: null } }),
      stateUnit(2, { id: 'K1M_BR2_20', format: 'BR1', pair: { role: 'first', siblingPhaseId: null } }),
    ], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR1_19')['pair']).toMatchObject({ role: 'second' });
    expect(rec(c, 'K1M_BR2_20')['pair']).toMatchObject({ role: 'first' });
  });

  it('§2.1 no statement, no format: a Phase whose elements state no format does not present the id\'s token as its format (a mutant reading splitRaceId(id).token presents BR2)', () => {
    const c = coreWith([stateUnit(1, { id: 'K1M_BR2_19' })], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR2_19')['classId'], 'precondition: the Phase is presented').toBe('K1M');
    expect(rec(c, 'K1M_BR2_19')['format']).not.toBe('BR2');
  });
});

describe('#377 row 3, §10 item 37: the snapshot\'s DisId is the Phase\'s format from its first statement on; a later TCP token does not displace it', () => {
  const xmlOf = (id: string, dis: string): string =>
    `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd"><Schedule><RaceId>${id}</RaceId><RaceOrder>1</RaceOrder><StartTime>2026-09-19T09:00:00+02:00</StartTime><ClassId>K1M</ClassId><DisId>${dis}</DisId><CourseNr>1</CourseNr><RaceStatus>0</RaceStatus></Schedule></Canoe123Data>`;

  it('item 37: Schedule DisId XF for id K1M_BR1_19, admitted; then a TCP Results for the same id (token BR1): format, stage, scoringKind, heats stay XF\'s and no phase.updated carries them', () => {
    const tracker = createContextTracker('Europe/Prague', '2026-09-19', 'cz-rgc');
    const core = createMergeCore({}) as MergePort;
    core.applyUnit([el({ ingestSeq: 0, event: 'tcp-connected', observedAt: at(0) })]);
    tracker.ctx.observedAt = at(100);
    const xml = parseXmlSnapshot(xmlOf('K1M_BR1_19', 'XF'), tracker.ctx) as never as GivenElement[];
    expect(obsOf(xml as never, 'format', { phaseId: 'K1M_BR1_19' })?.value, 'precondition: the snapshot states XF').toBe('XF');
    tracker.learn(xml as never, true);
    core.applyUnit([el({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(100), changedAfter: at(95) }), ...xml]);
    const before = rec(core, 'K1M_BR1_19');
    expect(before['format'], 'precondition: the snapshot\'s DisId is presented').toBe('XF');
    const from = core.notifications().length;
    tracker.ctx.observedAt = at(200);
    const tcp = parseTcp(TCP.resultsBr1, tracker.ctx) as never as GivenElement[];
    expect(TCP.resultsBr1, 'precondition: the TCP message names this id and no DisId').toContain('RaceId="K1M_BR1_19"');
    tracker.learn(tcp as never, false);
    core.applyUnit(tcp);
    const p = rec(core, 'K1M_BR1_19');
    expect(p['format']).toBe('XF');
    expect(p['stage']).toBe('final');
    expect(p['scoringKind']).toBe('ordinal');
    expect(p['heats']).toBe(true);
    expect(p['kind']).toBe('race');
    const moved = (core.notifications().slice(from) as Array<Record<string, any>>)
      .filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === 'K1M_BR1_19')
      .filter((m) => ['format', 'stage', 'kind', 'scoringKind', 'heats'].some((f) => f in (m['fields'] ?? {})));
    expect(moved).toEqual([]);
  });
});

describe('#377 row 4: a TCP-first Phase presents the parsed format end to end (parser -> tracker -> core, no XML)', () => {
  const run = (msg: string) => {
    const tracker = createContextTracker('Europe/Prague', '2026-09-19', 'cz-rgc');
    const core = createMergeCore({}) as MergePort;
    core.applyUnit([el({ ingestSeq: 0, event: 'tcp-connected', observedAt: at(0) })]);
    tracker.ctx.observedAt = at(100);
    const els = parseTcp(msg, tracker.ctx) as never as GivenElement[];
    tracker.learn(els as never, false);
    core.applyUnit(els);
    return { core, els };
  };

  it.each([
    { id: 'K1M_BR2_19', msg: TCP.resultsBr2, format: 'BR2', role: 'second' },
    { id: 'K1M-X_BR2_19', msg: withAttr(withAttr(TCP.resultsBr2, 'RaceId', 'K1M_BR2_19', 'K1M-X_BR2_19'), 'ClassId', 'K1M', 'K1M-X'), format: 'BR2', role: 'second' },
    { id: 'K1M_BR1_19', msg: TCP.resultsBr1, format: 'BR1', role: 'first' },
  ])('TCP-first Phase presents format from the parser fallback: $id -> format $format, pair.role $role, the parser output carries `format`', ({ id, msg, format, role }) => {
    expect(msg, 'precondition: no DisId, no snapshot').not.toMatch(/DisId/);
    const { core, els } = run(msg);
    expect(obsOf(els as never as El[] as never, 'format', { phaseId: id }), 'the parser states format').toMatchObject({ value: format, source: 'tcp' });
    const p = rec(core, id);
    expect(p['format']).toBe(format);
    expect(p['pair']).toMatchObject({ role });
  });
});

describe('#377 row 5, review N6 of PR #376: the pair override and the first-run derivation read the same stated role (§10 items 48, 49)', () => {
  it('N6: ids with swapped tokens, formats and pairs stated: the stated second run names the stated first run and the first run, derived, names it back', () => {
    const c = coreWith([
      // K1M_BR2_19 states BR1 (first run); K1M_BR1_19 states BR2 (second run, names K1M_BR2_19). The tokens say the opposite.
      stateUnit(1, { id: 'K1M_BR2_19', format: 'BR1', pair: { role: 'first', siblingPhaseId: null } }),
      stateUnit(2, { id: 'K1M_BR1_19', format: 'BR2', pair: { role: 'second', siblingPhaseId: 'K1M_BR2_19' } }),
    ], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR1_19')['format'], 'precondition: the stated format, not the token').toBe('BR2');
    expect(rec(c, 'K1M_BR1_19')['pair']).toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR2_19' });
    expect(rec(c, 'K1M_BR2_19')['pair']).toMatchObject({ role: 'first', siblingPhaseId: 'K1M_BR1_19' });
  });

  it('N6: a Phase that states its pair and no format: the first run\'s derived sibling follows the STATED roles (a mutant falling back to the id token for the derivation reads K1M_BR2_19 as the second run and names null)', () => {
    const c = coreWith([
      stateUnit(1, { id: 'K1M_BR2_19', pair: { role: 'first', siblingPhaseId: null } }),
      stateUnit(2, { id: 'K1M_BR1_19', pair: { role: 'second', siblingPhaseId: 'K1M_BR2_19' } }),
    ], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR1_19')['pair'], 'precondition: the second run presents its stated role').toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR2_19' });
    expect(rec(c, 'K1M_BR2_19')['pair']).toMatchObject({ role: 'first', siblingPhaseId: 'K1M_BR1_19' });
  });

  it('N6: the stated role also wins the presented pair when the stated format\'s own role differs (one source: the stated pair)', () => {
    const c = coreWith([
      stateUnit(1, { id: 'K1M_BR1_19', format: 'BR1', pair: { role: 'second', siblingPhaseId: 'K1M_BR3_19' } }),
      stateUnit(2, { id: 'K1M_BR3_19', format: 'BR1', pair: { role: 'first', siblingPhaseId: null } }),
    ], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR1_19')['pair'], 'the presented pair is the stated one').toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR3_19' });
    expect(rec(c, 'K1M_BR3_19')['pair'], 'and the first run\'s derivation reads the same stated roles').toMatchObject({ role: 'first', siblingPhaseId: 'K1M_BR1_19' });
  });
});

describe('#377 DERIVATIONS §10 item 49 (d): a Phase held with neither format nor pair, named by a second run, is that pair\'s first run', () => {
  const derived = ['format', 'stage', 'kind', 'scoringKind', 'heats'] as const;
  it('item 49 (d): before: no pair; named by the second run: pair first/combination/sibling = the second run, and no format, stage, kind, scoringKind, heats; a later stated format makes them appear', () => {
    // ids chosen so that a token read would say otherwise: the held Phase's id says BR2, the naming run's id says XF
    const c = coreWith([stateUnit(1, { id: 'K1M_BR2_19' })], NO_ID_CLASS);
    expect(rec(c, 'K1M_BR2_19')['classId'], 'precondition: the core holds the Phase (its class is stated)').toBe('K1M');
    expect(rec(c, 'K1M_BR2_19')['pair'] ?? null, 'precondition: before a second run names it, no pair is presented').toBeNull();
    c.applyUnit(stateUnit(2, { id: 'K1M_XF_19', format: 'BR2', pair: { role: 'second', siblingPhaseId: 'K1M_BR2_19', combination: 'sum' } }));
    const p = rec(c, 'K1M_BR2_19');
    expect(p['pair'], 'item 49 (d), item 48 inverse sibling, the naming pair\'s combination').toEqual({ role: 'first', combination: 'sum', siblingPhaseId: 'K1M_XF_19' });
    for (const f of derived) expect(p[f] ?? null, `${f} is not presented while no format is stated (a mutant presenting the unknown-token row shows stage run, kind race, scoringKind duration, heats false)`).toBeNull();
    c.applyUnit(stateUnit(3, { id: 'K1M_BR2_19', format: 'XF' }));
    const q = rec(c, 'K1M_BR2_19');
    expect(q['format']).toBe('XF');
    expect(q['stage']).toBe('final');
    expect(q['kind']).toBe('race');
    expect(q['scoringKind']).toBe('ordinal');
    expect(q['heats']).toBe(true);
  });
});

describe('#377 DERIVATIONS §10 item 49 (b) with (d), §2.1 "The class check needs both classes stated": a second run of another class does not name a held Phase', () => {
  const second = { role: 'second', siblingPhaseId: 'A_19', combination: 'sum' };
  const pairMoves = (c: MergePort, from: number, id: string) =>
    (c.notifications().slice(from) as Array<Record<string, any>>)
      .filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === id && (m['fields'] ?? {})['pair'] != null);
  it('item 49 (b) with (d): A_19 (class K1M, nothing else) named by B_19 (class C1W, format BR2, pair second -> A_19): A_19 presents no pair and no phase.updated carries one', () => {
    const c = coreWith([stateUnit(1, { id: 'A_19', cls: 'K1M' })], NO_ID_CLASS);
    expect(rec(c, 'A_19')['classId'], 'precondition: A_19 states class K1M').toBe('K1M');
    expect(rec(c, 'A_19')['format'] ?? null, 'precondition: A_19 states no format').toBeNull();
    expect(rec(c, 'A_19')['pair'] ?? null, 'precondition: A_19 presents no pair before the second run').toBeNull();
    const from = c.notifications().length;
    c.applyUnit(stateUnit(2, { id: 'B_19', cls: 'C1W', format: 'BR2', pair: second }));
    expect(rec(c, 'B_19')['classId'], 'precondition: B_19 states class C1W, differing from A_19').toBe('C1W');
    expect(rec(c, 'B_19')['format'], 'precondition: B_19 states format BR2').toBe('BR2');
    expect(rec(c, 'A_19')['pair'] ?? null, 'item 49 (b): a second run of another stated class does not name A_19; no pair').toBeNull();
    expect(pairMoves(c, from, 'A_19'), 'no phase.updated for A_19 carries a pair').toEqual([]);
  });
  it('control, item 49 (d): the same with B_19 of class K1M gives A_19 pair {first, siblingPhaseId B_19 (item 48 inverse sibling, as the (d) test above), sum}', () => {
    const c = coreWith([stateUnit(1, { id: 'A_19', cls: 'K1M' })], NO_ID_CLASS);
    expect(rec(c, 'A_19')['pair'] ?? null, 'precondition: no pair before').toBeNull();
    c.applyUnit(stateUnit(2, { id: 'B_19', cls: 'K1M', format: 'BR2', pair: second }));
    expect(rec(c, 'B_19')['classId'], 'precondition: B_19 states class K1M').toBe('K1M');
    expect(rec(c, 'A_19')['pair']).toEqual({ role: 'first', siblingPhaseId: 'B_19', combination: 'sum' });
  });
});

describe('#377 row 6, DERIVATIONS §2.1 / CONFORMANCE-VECTORS §1: src/core reads no id token', () => {
  const coreDir = fileURLToPath(new URL('../', import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p);
      return n.endsWith('.ts') ? [p] : [];
    });
  const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('§2.1: no splitRaceId import or call under src/core (excluding __tests__)', () => {
    const list = files(coreDir);
    expect(list.length, 'precondition: the scan sees the core\'s files').toBeGreaterThan(3);
    expect(list.some((f) => f.endsWith('registry.ts')), 'precondition: registry.ts is among them').toBe(true);
    const offenders = list.filter((f) => /\bsplitRaceId\b/.test(code(readFileSync(f, 'utf8')))).map((f) => f.slice(coreDir.length));
    expect(offenders).toEqual([]);
  });
});
