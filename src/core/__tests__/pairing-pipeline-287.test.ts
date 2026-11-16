import { describe, it, expect } from 'vitest';
import { createMergeCore } from '../index.js';
import { createContextTracker } from '../../ingest/context-tracker.js';
import { parseTcp, parseXmlSnapshot } from '../../ingest/index.js';
import { TCP } from '../../ingest/__tests__/fixtures/tcp.js';
import { withAttr } from '../../ingest/__tests__/helpers.js';
import { at } from './kit.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

/**
 * #287, item 49 (DERIVATIONS §10): parser -> context tracker -> core, the tier at which a FIRST run's sibling is asserted (a parser states it `null`; the core
 * derives it as the inverse of the second runs' stated pairs, §2.1, item 48). Each test builds its own pipeline: a tracker, a core, a clock of its own
 * (offsets from kit.ts BASE, no real clock). XML snapshots are Schedule rows only (ClassId, DisId, StartTime), delivered with the reader's rewrite event first.
 */
type Row = { id: string; cls: string; dis: string; day: string };
const xmlOf = (rows: Row[]): string =>
  `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${rows
    .map((r) => `<Schedule><RaceId>${r.id}</RaceId><RaceOrder>1</RaceOrder><StartTime>${r.day}T09:00:00+02:00</StartTime><ClassId>${r.cls}</ClassId><DisId>${r.dis}</DisId><CourseNr>1</CourseNr><RaceStatus>0</RaceStatus></Schedule>`)
    .join('')}</Canoe123Data>`;

function pipeline() {
  const tracker = createContextTracker('Europe/Prague', '2026-09-19', 'cz-rgc');
  const core = createMergeCore({}) as MergePort;
  let t = 0;
  const tick = (): number => (t += 100);
  core.applyUnit([{ ingestSeq: 0, event: 'tcp-connected', observedAt: at(0) } as GivenElement]);
  return {
    core,
    /** One XML snapshot as the reader delivers it. Returns the index of the first notification it caused. */
    xml(rows: Row[]): number {
      const now = tick();
      const from = core.notifications().length;
      tracker.ctx.observedAt = at(now);
      const els = parseXmlSnapshot(xmlOf(rows), tracker.ctx) as never as GivenElement[];
      tracker.learn(els as never, true);
      core.applyUnit([{ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: at(now), changedAfter: at(now - 5) } as GivenElement, ...els]);
      return from;
    },
    /** One TCP message. */
    tcp(msg: string): number {
      const now = tick();
      const from = core.notifications().length;
      tracker.ctx.observedAt = at(now);
      const els = parseTcp(msg, tracker.ctx) as never as GivenElement[];
      tracker.learn(els as never, false);
      core.applyUnit(els);
      return from;
    },
    sibling: (id: string): unknown => (core.phase(id)['pair'] as { siblingPhaseId?: unknown } | null)?.siblingPhaseId,
    pair: (id: string): unknown => core.phase(id)['pair'],
  };
}
type P = ReturnType<typeof pipeline>;
const R = (id: string, cls: string, dis: string, day: string): Row => ({ id, cls, dis, day });
const prefixOf = (id: string): string => id.replace(/_[A-Z0-9]+_\d+(_[A-Z]+)?$/, '');
const phaseUpdates = (p: P, from: number, id: string): Array<Record<string, any>> =>
  (p.core.notifications().slice(from) as Array<Record<string, any>>).filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === id);

describe('#287 item 49 (a), rows 1-9: parser + tracker + core, the presented Phase `pair.siblingPhaseId` of every Phase', () => {
  const D19 = '2026-09-19';
  const cases: Array<[name: string, rows: Row[], expected: Record<string, string | null>]> = [
    ['row 1 (K1M_ST underscore class)', [R('K1M_ST_BR1_6', 'K1M_ST', 'BR1', '2026-09-06'), R('K1M_ST_BR2_6', 'K1M_ST', 'BR2', '2026-09-06')], { K1M_ST_BR1_6: 'K1M_ST_BR2_6', K1M_ST_BR2_6: 'K1M_ST_BR1_6' }],
    ['row 2 (K1M-ZS hyphenated class)', [R('K1M-ZS_BR1_25', 'K1M-ZS', 'BR1', '2026-04-25'), R('K1M-ZS_BR2_25', 'K1M-ZS', 'BR2', '2026-04-25')], { 'K1M-ZS_BR1_25': 'K1M-ZS_BR2_25', 'K1M-ZS_BR2_25': 'K1M-ZS_BR1_25' }],
    ['row 4 (_JUN suffix on a pair, constructed)', [R('X_BR1_26_JUN', 'X', 'BR1', '2026-04-26'), R('X_BR2_26_JUN', 'X', 'BR2', '2026-04-26')], { X_BR1_26_JUN: 'X_BR2_26_JUN', X_BR2_26_JUN: 'X_BR1_26_JUN' }],
    ['row 5 (renamed class, prefixes differ)', [R('K1M_BR1_19', 'K1M-X', 'BR1', D19), R('K1M-X_BR2_19', 'K1M-X', 'BR2', D19)], { K1M_BR1_19: 'K1M-X_BR2_19', 'K1M-X_BR2_19': 'K1M_BR1_19' }],
    ['row 6 (BR1 19th, BR1 20th, BR2 20th)', [R('K1M_BR1_19', 'K1M', 'BR1', D19), R('K1M_BR1_20', 'K1M', 'BR1', '2026-09-20'), R('K1M_BR2_20', 'K1M', 'BR2', '2026-09-20')], { K1M_BR1_19: null, K1M_BR1_20: 'K1M_BR2_20', K1M_BR2_20: 'K1M_BR1_20' }],
    ['row 7 (BR1 19th, BR1 20th, BR2 21st)', [R('K1M_BR1_19', 'K1M', 'BR1', D19), R('K1M_BR1_20', 'K1M', 'BR1', '2026-09-20'), R('K1M_BR2_21', 'K1M', 'BR2', '2026-09-21')], { K1M_BR1_19: null, K1M_BR1_20: null, K1M_BR2_21: null }],
    ['row 8 (BR1 19th, BR2 20th)', [R('K1M_BR1_19', 'K1M', 'BR1', D19), R('K1M_BR2_20', 'K1M', 'BR2', '2026-09-20')], { K1M_BR1_19: 'K1M_BR2_20', K1M_BR2_20: 'K1M_BR1_19' }],
    ['row 8b (the recorded shape)', [R('K1M_BR1_19', 'K1M', 'BR1', D19), R('K1M_BR2_19', 'K1M', 'BR2', D19), R('K1M_BR1_20', 'K1M', 'BR1', '2026-09-20'), R('K1M_BR2_20', 'K1M', 'BR2', '2026-09-20')],
      { K1M_BR1_19: 'K1M_BR2_19', K1M_BR2_19: 'K1M_BR1_19', K1M_BR1_20: 'K1M_BR2_20', K1M_BR2_20: 'K1M_BR1_20' }],
    ['row 9 (K1M_BR2_6 of class K1M_ST shares a prefix with K1M_BR1_6 of class K1M)', [R('K1M_BR1_6', 'K1M', 'BR1', '2026-09-06'), R('K1M_BR2_6', 'K1M_ST', 'BR2', '2026-09-06')], { K1M_BR1_6: null, K1M_BR2_6: null }],
    ['row 9 (the K1M_ST second run picks the K1M_ST first run, not the prefix match)', [R('K1M_BR1_6', 'K1M', 'BR1', '2026-09-06'), R('K1M_ST_BR1_6', 'K1M_ST', 'BR1', '2026-09-06'), R('K1M_BR2_6', 'K1M_ST', 'BR2', '2026-09-06')],
      { K1M_BR1_6: null, K1M_ST_BR1_6: 'K1M_BR2_6', K1M_BR2_6: 'K1M_ST_BR1_6' }],
    ['TS1/TS2 sum pair', [R('K1M_TS1_19', 'K1M', 'TS1', D19), R('K1M_TS2_19', 'K1M', 'TS2', D19)], { K1M_TS1_19: 'K1M_TS2_19', K1M_TS2_19: 'K1M_TS1_19' }],
  ];
  it.each(cases)('%s', (_name, rows, expected) => {
    for (const order of [rows, [...rows].reverse()]) {
      const p = pipeline();
      p.xml(order);
      for (const r of rows) expect(p.core.phase(r.id)['classId'], `precondition: ${r.id} is described with its ClassId`).toBe(r.cls);
      if (_name.startsWith('row 5')) expect(prefixOf('K1M_BR1_19')).not.toBe(prefixOf('K1M-X_BR2_19')); // precondition: the prefix rule cannot find it
      if (_name.startsWith('row 9 (K1M_BR2_6')) expect(prefixOf('K1M_BR1_6')).toBe(prefixOf('K1M_BR2_6')); // precondition: they would pair under the prefix rule
      for (const [id, sib] of Object.entries(expected)) {
        expect(p.pair(id), `${id} has a stated pair`).not.toBeNull();
        expect(p.sibling(id), id).toBe(sib);
      }
    }
  });

  it('row 3: a single run (MX1J_XT_26_JUN) has pair null', () => {
    const p = pipeline();
    p.xml([R('MX1J_XT_26_JUN', 'MX1J', 'XT', '2026-04-26')]);
    expect(p.core.phase('MX1J_XT_26_JUN')['classId']).toBe('MX1J');
    expect(p.pair('MX1J_XT_26_JUN')).toBeNull();
  });
});

describe('#287 item 49 (a), row 10: the TCP path through the tracker and the core', () => {
  const resultsOf = (base: string, raceId: string, classId: string): string =>
    withAttr(withAttr(base, 'RaceId', base === TCP.resultsBr1 ? 'K1M_BR1_19' : 'K1M_BR2_19', raceId), 'ClassId', 'K1M', classId);

  it.each([
    ['same prefix', 'K1M_BR2_19', 'K1M'],
    ['renamed class, prefixes differ', 'K1M-X_BR2_19', 'K1M-X'],
  ])('a snapshot with the BR1, then the BR2\'s Results (%s): the BR2 names the BR1, and the core presents the BR1 naming the BR2', (_n, br2, cls) => {
    const p = pipeline();
    p.xml([R('K1M_BR1_19', cls, 'BR1', '2026-09-19')]);
    expect(p.sibling('K1M_BR1_19'), 'precondition: no second run yet').toBeNull();
    p.tcp(resultsOf(TCP.resultsBr2, br2, cls));
    expect(p.core.phase(br2)['classId']).toBe(cls); // precondition: the Results created and described the Phase
    expect(p.sibling(br2)).toBe('K1M_BR1_19');
    expect(p.sibling('K1M_BR1_19')).toBe(br2);
  });

  it('no snapshot: a BR1 Results then a BR2 Results, both with ClassId (renamed class): they pair; the first run follows the second run that arrives later', () => {
    const p = pipeline();
    p.tcp(resultsOf(TCP.resultsBr1, 'K1M_BR1_19', 'K1M-X'));
    expect(p.pair('K1M_BR1_19'), 'precondition: the first run is described').toMatchObject({ role: 'first' });
    expect(p.sibling('K1M_BR1_19')).toBeNull();
    p.tcp(resultsOf(TCP.resultsBr2, 'K1M-X_BR2_19', 'K1M-X'));
    expect(p.sibling('K1M-X_BR2_19')).toBe('K1M_BR1_19');
    expect(p.sibling('K1M_BR1_19')).toBe('K1M-X_BR2_19');
  });

  it('the BR2\'s Results alone (the first run\'s class unknown, ids sharing a prefix): the sibling is null', () => {
    const p = pipeline();
    p.tcp(resultsOf(TCP.resultsBr2, 'K1M_BR2_19', 'K1M'));
    expect(p.pair('K1M_BR2_19')).toMatchObject({ role: 'second' }); // precondition: the pair is stated
    expect(prefixOf('K1M_BR1_19')).toBe(prefixOf('K1M_BR2_19'));
    expect(p.sibling('K1M_BR2_19')).toBeNull();
  });
});

describe('#287 item 49 (b): a second run names a first run only while the two Phases\' classId are equal', () => {
  it('O1, two snapshots (CONTRACTS §2.4 rename example): K1M_BR2_19 stays class K1M and keeps naming K1M_BR1_19, the first run is renamed K1M-X: it presents K1M-X_BR2_19', () => {
    const p = pipeline();
    p.xml([R('K1M_BR1_19', 'K1M', 'BR1', '2026-09-19'), R('K1M_BR2_19', 'K1M', 'BR2', '2026-09-19')]);
    expect(p.sibling('K1M_BR1_19'), 'precondition: before the rename the first run names K1M_BR2_19').toBe('K1M_BR2_19');
    const from = p.xml([R('K1M_BR1_19', 'K1M-X', 'BR1', '2026-09-19'), R('K1M-X_BR2_19', 'K1M-X', 'BR2', '2026-09-19')]);
    expect(p.core.phase('K1M_BR1_19')['classId'], 'precondition: the first run is now K1M-X').toBe('K1M-X');
    expect(p.core.phase('K1M_BR2_19')['classId'], 'precondition: the stale second run is still in the core, class K1M').toBe('K1M');
    expect(p.sibling('K1M_BR2_19'), 'precondition: and still names the first run').toBe('K1M_BR1_19');
    expect(p.sibling('K1M-X_BR2_19')).toBe('K1M_BR1_19');
    expect(p.sibling('K1M_BR1_19')).toBe('K1M-X_BR2_19');
    expect(JSON.stringify(phaseUpdates(p, from, 'K1M_BR1_19').at(-1)?.['fields']?.['pair']), 'the change is notified in that snapshot\'s unit').toContain('K1M-X_BR2_19');
  });

  it('core only: a second run stating the first run as sibling with a different classId does not count; the same-class one does', () => {
    const core = createMergeCore({}) as MergePort;
    const base = { source: 'tcp', kind: 'result-row', confidence: 'authoritative', observedAt: at(1) };
    const stated = (id: string, cls: string, format: string, role: string, sibling: string | null) => [
      { ingestSeq: 0, ...base, phaseId: id, field: 'classId', value: cls }, { ingestSeq: 0, ...base, phaseId: id, field: 'format', value: format },
      { ingestSeq: 0, ...base, phaseId: id, field: 'pair', value: { role, siblingPhaseId: sibling, combination: 'best' } },
    ] as unknown as GivenElement[];
    const sib = (id: string): unknown => (core.phase(id)['pair'] as { siblingPhaseId?: unknown } | null)?.siblingPhaseId;
    core.applyUnit(stated('K1M_BR1_19', 'K1M-X', 'BR1', 'first', null));
    core.applyUnit(stated('K1M_BR2_19', 'K1M', 'BR2', 'second', 'K1M_BR1_19'));
    expect(sib('K1M_BR2_19'), 'precondition: the other class\'s second run states the first run').toBe('K1M_BR1_19');
    expect(sib('K1M_BR1_19')).toBeNull();
    core.applyUnit(stated('K1M-X_BR2_19', 'K1M-X', 'BR2', 'second', 'K1M_BR1_19'));
    expect(sib('K1M_BR1_19')).toBe('K1M-X_BR2_19');
  });

  it('item 49 (c), the stated known gap: a second run deleted from the schedule but of the first run\'s class stays as last stated, and the first run goes on naming it', () => {
    const p = pipeline();
    p.xml([R('K1M_BR1_19', 'K1M', 'BR1', '2026-09-19'), R('K1M_BR2_19', 'K1M', 'BR2', '2026-09-19')]);
    expect(p.sibling('K1M_BR1_19')).toBe('K1M_BR2_19');
    p.xml([R('K1M_BR1_19', 'K1M', 'BR1', '2026-09-19')]); // the second run's schedule row has gone
    expect(p.core.phase('K1M_BR2_19')['classId'], 'the deleted Phase is still in the core as last stated').toBe('K1M');
    expect(p.sibling('K1M_BR1_19')).toBe('K1M_BR2_19'); // KNOWN GAP (DERIVATIONS §10 item 49 (c)): the pointer names a Phase that is no longer scheduled
  });
});

describe('#287 N4 (CONTRACTS §1.6, DERIVATIONS §2.1): the first phase.updated of a Phase first seen on TCP carries its pair', () => {
  it('a Results for a BR2 first seen on TCP, the first run\'s class known from an earlier snapshot: the first phase.updated of the BR2 carries classId, format and pair naming the BR1', () => {
    const p = pipeline();
    p.xml([R('K1M-X_BR1_19', 'K1M-X', 'BR1', '2026-09-19')]);
    const msg = withAttr(withAttr(TCP.resultsBr2, 'RaceId', 'K1M_BR2_19', 'K1M-X_BR2_19'), 'ClassId', 'K1M', 'K1M-X');
    expect(p.core.phase('K1M-X_BR2_19')['classId'], 'precondition: the BR2 is unknown to the core').not.toBe('K1M-X');
    const from = p.tcp(msg);
    const first = phaseUpdates(p, from, 'K1M-X_BR2_19')[0];
    expect(first, 'a phase.updated creates the Phase').toBeDefined();
    for (const f of ['classId', 'format', 'pair']) expect(first!['fields'], f).toHaveProperty(f);
    expect(first!['fields']['pair']).toMatchObject({ role: 'second', siblingPhaseId: 'K1M-X_BR1_19' });
  });
});
