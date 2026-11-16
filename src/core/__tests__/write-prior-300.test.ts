/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { createMergeCore } from '../index.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { connected, coreWith, derive, tcpUnit, xmlUnit, type Unit } from './streams.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

/**
 * #300 rows 8-10 (N5; DA ruling item 15; DERIVATIONS §6 "A retained value is a `known` one", §10 item 44 (d); CONTRACTS §4 INV-2 rule 4).
 * Rows 8 and 9: TCP results rows of the recorded jarni-so-odp C1M_BR2_18 bib 56 (R19.c4RowA, the gate 13 cell edited as `ODP.restate` does) and the XML snapshot
 * (R19.rcXml, edited as `ODP.xmlWithGate13` does) that binds the course; before it no course is bound and upstream's cells are held, not a `gates` value (§4.6).
 * Row 10: element-level in the shape of the conformance vectors (a results row, then a wiping row).
 */
type Core = MergePort & { retainedCell(writeId: string): { penalty: number | null } | null | undefined };
const P = 'C1M_BR2_18';
const A = `${P}:56`;
const day = { [P]: '2026-04-18' };
const GATE = 13;
const t0 = Date.parse(R19.c4RowA.observedAt);
/** The recorded row restating the run with gate 13 = `value`, received `s` seconds after the recorded one. */
const rowUnit = (value: 0 | 2 | 50, s: number): Unit => tcpUnit(derive(R19.c4RowA, {
  observedAt: new Date(t0 + s * 1000).toISOString(),
  edit: (d) => d.replace(/Gates="((?:...){12})(...)/, (_m, a) => `Gates="${a as string}${String(value).padStart(3, ' ')}`)
    .replace(/ Pen="\d+"/, ` Pen="${value}"`).replace(/ Total="[^"]*"/, ` Total="${(81.62 + value).toFixed(2)}"`),
}), day);
/** The recorded snapshot (it binds the Phase to its 19-gate course) restating the same run with gate 13 = 2, a first read (`changedAfter: null`). */
const bindingUnit = (s: number): Unit => xmlUnit(derive(R19.rcXml, {
  observedAt: new Date(t0 + s * 1000).toISOString(),
  edit: (d) => d.replace(/<Time>120980<\/Time>/, '<Time>81620</Time>').replace(/<Total>122980<\/Total>/, '<Total>83620</Total>')
    .replace(/<dtStart>[^<]*<\/dtStart>/, '<dtStart>15:51:40.580</dtStart>')
    .replace(/<Rnk>\d+<\/Rnk>/, '<Rnk>11</Rnk>').replace(/<RnkOrder>\d+<\/RnkOrder>/, '<RnkOrder>11</RnkOrder>')
    .replace(/<TotalRnk>\d+<\/TotalRnk>/, '<TotalRnk>11</TotalRnk>').replace(/<TotalRnkOrder>\d+<\/TotalRnkOrder>/, '<TotalRnkOrder>11</TotalRnkOrder>'),
}), day, null);
/** A write resumed from the store (what the on-site layer hands over after a restart): requested 50 on gate 13, generation 1, the recorded retained cell `2`. */
const resumed = (s: number): GivenElement => ({ ingestSeq: 0, attemptId: A, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: new Date(t0 + s * 1000).toISOString(), value: [{ number: GATE, penalty: 50 }], confidence: 'authoritative', run: 1, writeId: 'w-resumed', retainedCell: { penalty: 2 } }) as unknown as GivenElement;
const status = (c: Core): string | undefined => (c.writeRequest() as { status?: string } | undefined)?.status;
const w = (c: Core): any => c.writeRequest();
/** The target cell of a `confirmedValue`: the core carries the cells it resolved against (an array of cells), the wire narrows them to `{ gate, value }` (§7.3). */
const confirmedCell = (c: Core): number | null | undefined => {
  const v = w(c).confirmedValue;
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.find((g: any) => g.number === GATE)?.penalty;
  return (v as { value: number }).value;
};

/**
 * A write of 50 to gate 13 pending with `2` recorded as the tcp source's retained cell; upstream's row is re-sent while no course is bound (the tcp slot is
 * `unavailable{not-configured}`: held cells are not a `gates` value, §4.6); the snapshot then binds the course (a first read: it resolves nothing by itself, §6 xml age guard). The caller then re-sends rows.
 */
function pendingOverUnavailableSlot(): Core {
  const c = coreWith([connected(R19.c4RowA.observedAt), rowUnit(2, 0)], { xmlConfigured: false }) as Core;
  expect((c.presented(A) as any).gates, 'precondition: no course is bound: the row\'s cells are held, the slot states not-configured').toMatchObject({ state: 'unavailable', reason: 'not-configured' });
  c.applyUnit([resumed(1)]);
  expect(status(c), 'precondition: the write is pending').toBe('pending');
  expect(w(c).writeId).toBe('w-resumed');
  expect(c.retainedCell('w-resumed'), 'precondition: the write recorded the retained 2').toEqual({ penalty: 2 });
  c.applyUnit(rowUnit(2, 2));
  expect(status(c), 'precondition: held cells are no observation of the target cell: still pending').toBe('pending');
  c.applyUnit(bindingUnit(3));
  return c;
}

describe('row 8: a non-known prior is no prior (DERIVATIONS §6, §10 item 44 (d) (i))', () => {
  it('ruling 15 (i): the course binds again and TCP re-sends 2: a re-delivery of the recorded 2: pending, no confirmedValue; then a row with the requested value: confirmed', () => {
    const c = pendingOverUnavailableSlot();
    c.applyUnit(rowUnit(2, 4));
    expect(status(c), 'a re-delivery of what the write recorded is no echo').toBe('pending');
    expect(w(c).confirmedValue, 'no confirmedValue').toBeUndefined();
    c.applyUnit(rowUnit(50, 5));
    expect(status(c)).toBe('confirmed');
    expect(confirmedCell(c)).toBe(50);
  });
});

describe('row 9: a changed value after the binding (DERIVATIONS §6, §10 item 44 (d) (ii))', () => {
  it('ruling 15 (ii) (guard): the re-delivery after the binding brings another value: mismatched with that cell', () => {
    const c = pendingOverUnavailableSlot();
    c.applyUnit(rowUnit(0, 4));
    expect(status(c)).toBe('mismatched');
    expect(confirmedCell(c)).toBe(0);
  });
});

describe('row 10: a not-yet slot at submission records no retained cell (DERIVATIONS §6 "or that none was retained"; ruling 15 caution)', () => {
  const PH = 'K1M_BR1_6', B = `${PH}:9`;
  const T = (s: number): string => new Date(Date.parse('2026-09-15T14:00:00.000Z') + s * 1000).toISOString();
  const snap = (s: number, row: Record<string, unknown>): GivenElement => ({ ingestSeq: 0, observedAt: T(s), snapshot: { source: 'tcp', phaseId: PH, mode: 'results', rows: [{ bib: '9', ...row }] } }) as unknown as GivenElement;
  const cells = (c4: number | null) => [{ number: 3, penalty: 0 }, { number: 4, penalty: c4 }, { number: 5, penalty: 0 }];
  const result = { gates: cells(2), outcome: { kind: 'duration', runSeconds: 80, penaltySeconds: 2, totalSeconds: 82 }, judgingComplete: true };
  const op = (s: number, extra: Record<string, unknown> = {}): GivenElement => ({ ingestSeq: 0, attemptId: B, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: T(s), value: [{ number: 4, penalty: 50 }], confidence: 'authoritative', run: 1, ...extra }) as unknown as GivenElement;
  /** A row with cells, then wiped in place (a row present with nothing stated: the tcp slot is `not-yet`), then the write. */
  function wipedThenWritten(): Core {
    const c = createMergeCore({ attemptId: B }) as unknown as Core;
    c.applyUnit([snap(0, result)]);
    expect((c.presented(B) as any).gates, 'precondition: the row stated the cells').toMatchObject({ state: 'known', source: 'tcp' });
    c.applyUnit([snap(1, {})]);
    expect((c.presented(B) as any).gates, 'precondition: the wiped row leaves the tcp gates slot not-yet').toEqual({ state: 'not-yet' });
    c.applyUnit([op(2)]);
    expect(status(c), 'precondition: the write is admitted: pending').toBe('pending');
    return c;
  }

  it('ruling 15: a write over a not-yet tcp slot records no retained cell: null, not a cell of null', () => {
    const c = wipedThenWritten();
    expect(c.retainedCell(w(c).writeId)).toBeNull();
  });

  it('ruling 15 + §6 "with none retained the first delivery is a change": the first delivery with the target cell blank resolves mismatched (it stays pending on main)', () => {
    const c = wipedThenWritten();
    // a row that states a result (a time), so it is not a blank row (a row with no result applies none of its fields); only the target cell is blank
    c.applyUnit([snap(3, { gates: cells(null), outcome: { kind: 'duration', runSeconds: 80, penaltySeconds: 0, totalSeconds: 80 }, judgingComplete: true })]);
    expect((c.presented(B) as any).outcome, 'precondition: the delivered row is not blank: its outcome is presented').toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 80 } });
    expect(status(c), 'a blank target cell is a change from none: not the requested 50').toBe('mismatched');
  });

  it('ruling 15 (control): a known slot at submission still records its cell: the recorded 2', () => {
    const c = createMergeCore({ attemptId: B }) as unknown as Core;
    c.applyUnit([snap(0, result)]);
    c.applyUnit([op(1)]);
    expect(c.retainedCell(w(c).writeId)).toEqual({ penalty: 2 });
  });
});
