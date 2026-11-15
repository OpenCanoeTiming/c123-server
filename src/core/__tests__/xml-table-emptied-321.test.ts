import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { field, kit, type Core } from './kit.js';

/**
 * #321 rows 6-7 (M2 P3a part 1 of 3), extended by #365 row 10 (M2 P3a part 2 of 3, the #369 re-review):
 * ADR-015 Revision 5 rule 5 -- a wholly empty XML table (a race the snapshot's schedule names with no
 * result row at all) retracts nothing, whatever its content age, and the core raises the ingest-only
 * diagnostic `xml-table-emptied { phaseId, count }` (DERIVATIONS §4.12, §0.5), counting a `tcp` result
 * only where the snapshot's `changedAfter` is later than its delivery, and an `xml`-held result
 * unconditionally. The removal (#365) changes nothing of this rule: an emptied table removes no
 * Attempt either (ADR-015 Revision 6 rule 6; DERIVATIONS §10 item 38 (j)), so every assertion below
 * must stay true once the removal lands -- these are guards, not new-behaviour tests.
 *
 * `MergeCore.drainIngestDiagnostics()` (`src/core/index.ts`) is the surface: it exists once the
 * implementation lands (review note 4, PR #369) and is asserted here directly, narrowed past the
 * conformance harness's `MergePort` type (which does not declare it, since `GET /api/diagnostics`
 * and the vector harness both read the *wire* `Diagnostic` union only, closed to six admin-facing
 * kinds -- `xml-table-emptied` is not one of them, by design, DERIVATIONS §0.5). The on-site level
 * (row 8, `src/onsite/__tests__/xml-table-emptied-321.test.ts`) still owns the admin-log route and
 * the "never on the wire" assertion; this file owns the rule the diagnostic itself follows.
 *
 * Every scenario below first has the race's xml table carry at least one row, in its own unit,
 * before it is emptied: "a table that never had rows raises nothing" (DERIVATIONS §4.12) is itself
 * row 7(c), and it reads as an xml-table-specific memory -- a tcp-only result, with no xml read of
 * the race ever, is that exempt case too, not "the race was emptied" (confirmed empirically: an
 * earlier draft of row 6 without this step drained nothing at any content age). #365 row 10's own
 * re-review finding: rows 7(a) and 7(b) below never actually had this step -- `emptied()`
 * (`src/core/retraction.ts`) returns immediately when `phase.xmlTable !== 'rows'`, before the guard
 * it claims to exercise is even reached, so both blocks were passing through the never-had-rows
 * branch (vacuously true for the wrong reason) rather than the guard. Fixed here by giving each its
 * own prior xml row, in its own unit, first -- the fix for the file header's claim above, which was
 * false for exactly these two blocks (confirmed empirically: reverting either block's added step
 * here leaves it passing just the same, since `emptied()` never reaches `wouldRetract` without it).
 */
const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });
const emptyTable = (ingestSeq: number, phaseId: string, observedAt: string, changedAfter: string | null): GivenElement[] => [
  { ingestSeq, event: 'xml-rewrite-detected', observedAt, changedAfter } as GivenElement,
  { ingestSeq: ingestSeq + 1, snapshot: { source: 'xml', phaseId, mode: 'start-list', rows: [] }, observedAt } as GivenElement,
];
/** Narrowed past `MergePort`: the real core (`createMergeCore`, via `kit.ts`) always implements the fuller `MergeCore`. */
const drain = (c: Core): Array<{ kind: string; phaseId: string; count: number }> =>
  (c as unknown as { drainIngestDiagnostics(): Array<{ kind: string; phaseId: string; count: number }> }).drainIngestDiagnostics();

describe('ADR-015 Rev 5 rule 5 (#321 row 6)', () => {
  it('ADR-015 Rev 5 rule 5, DERIVATIONS §4.12: a table with no rows retracts nothing and raises xml-table-emptied once with phaseId and count', () => {
    const A = 'K1M_BR1_6:11', P = 'K1M_BR1_6';
    const k = kit(A, P);
    const c = k.core();
    // vector retraction-xml-empty-table-retracts-nothing's setup: a tcp result, then a wholly empty table --
    // plus a prior xml read carrying a row, in its own unit (DERIVATIONS §4.12 "a table that never had
    // rows raises nothing": the first table this race's xml ever shows must itself have had a row, or the
    // emptying below is that exempt case, not "the race was emptied" -- confirmed empirically before this
    // test was written, by removing this step and seeing drainIngestDiagnostics() stay empty throughout).
    c.applyUnit([k.snap('tcp', '2026-09-15T10:40:59.500Z', { outcome: dur(90.12), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    expect(drain(c)).toEqual([]);
    c.applyUnit(k.xml('2026-09-15T10:41:00.000Z', null, { outcome: dur(90.12), placement: { rank: 1, order: 1 }, judgingComplete: true }));
    expect(field(c, A, 'outcome'), 'tcp still wins, connected (rule 2)').toMatchObject({ state: 'known', source: 'tcp' });
    expect(drain(c)).toEqual([]);

    c.applyUnit(emptyTable(4, P, '2026-09-15T10:41:37.000Z', '2026-09-15T10:41:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 }, source: 'tcp' });
    expect(field(c, A, 'placement')).toMatchObject({ state: 'known', value: { rank: 1, order: 1 }, source: 'tcp' });
    expect(drain(c)).toEqual([{ kind: 'xml-table-emptied', phaseId: P, count: 1 }]);

    // "raised once ... and again only after a snapshot of the race has carried a row" (DERIVATIONS §4.12):
    // a second emptying in a row retracts nothing new and raises nothing new.
    c.applyUnit(emptyTable(6, P, '2026-09-15T10:46:37.000Z', '2026-09-15T10:46:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 }, source: 'tcp' });
    expect(drain(c)).toEqual([]);

    // a snapshot of the race that carries a row again: still retracts nothing, raises nothing (no emptying here).
    c.applyUnit([
      { ingestSeq: 8, event: 'xml-rewrite-detected', observedAt: '2026-09-15T10:51:37.000Z', changedAfter: '2026-09-15T10:51:32.000Z' } as GivenElement,
      { ingestSeq: 9, snapshot: { source: 'xml', phaseId: P, mode: 'results', rows: [{ bib: '11', outcome: dur(90.12), placement: { rank: 1, order: 1 }, judgingComplete: true }] }, observedAt: '2026-09-15T10:51:37.000Z' } as GivenElement,
    ]);
    expect(drain(c)).toEqual([]);

    // a new emptying after the row returned: raises once more.
    c.applyUnit(emptyTable(10, P, '2026-09-15T10:56:37.000Z', '2026-09-15T10:56:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 } });
    expect(field(c, A, 'placement')).toMatchObject({ state: 'known', value: { rank: 1, order: 1 } });
    expect(drain(c)).toEqual([{ kind: 'xml-table-emptied', phaseId: P, count: 1 }]);
  });
});

describe('ADR-015 Rev 5 rule 5, the guard on the count (#321 row 7; (a), (b) rebuilt by #365 row 10)', () => {
  it('DERIVATIONS §4.12: xml-table-emptied counts a tcp result only where changedAfter is later than its delivery; a first read or a table that never had rows raises none', () => {
    const P = 'K1M_BR1_10';

    // (a) changedAfter null (a first read, e.g. after a path change or restart, DERIVATIONS §0.3): retracts
    // nothing, and the only (tcp-held) candidate is refused: no diagnostic. The table carried a row first
    // (its own unit), so this genuinely exercises the guard, not the never-had-rows branch (#365 row 10).
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(k.xml('2026-01-01T09:00:00.000Z', null, { outcome: dur(79), placement: { rank: 1, order: 1 }, judgingComplete: true }));
      c.applyUnit([k.snap('tcp', '2026-01-01T10:00:00.000Z', { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
      c.applyUnit(emptyTable(3, P, '2026-01-01T10:00:30.000Z', null));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
      expect(drain(c)).toEqual([]);
    }

    // (b) changedAfter earlier than the tcp delivery: retracts nothing, refused, no diagnostic. Same fix:
    // the table carried a row first, in its own unit, so the guard is what refuses here, not xmlTable being
    // unset (#365 row 10).
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(k.xml('2026-01-01T09:00:00.000Z', null, { outcome: dur(79), placement: { rank: 1, order: 1 }, judgingComplete: true }));
      c.applyUnit([k.snap('tcp', '2026-01-01T10:00:00.000Z', { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
      c.applyUnit(emptyTable(3, P, '2026-01-01T10:00:30.000Z', '2026-01-01T09:59:50.000Z'));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
      expect(drain(c)).toEqual([]);
    }

    // (c) a race whose table never had rows: a start-list-mode empty table, no prior result -- no Attempt, no diagnostic.
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(emptyTable(1, P, '2026-01-01T10:00:30.000Z', '2026-01-01T10:00:25.000Z'));
      expect(c.attempts()).not.toContain(A);
      expect(drain(c)).toEqual([]);
    }

    // (d) an xml-held result counts whatever the content age: raises, count 1.
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([
        { ingestSeq: 1, event: 'xml-rewrite-detected', observedAt: '2026-01-01T10:00:00.000Z', changedAfter: null } as GivenElement,
        { ingestSeq: 2, snapshot: { source: 'xml', phaseId: P, mode: 'results', rows: [{ bib: '9', outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true }] }, observedAt: '2026-01-01T10:00:00.000Z' } as GivenElement,
      ]);
      c.applyUnit(emptyTable(3, P, '2026-01-01T10:00:30.000Z', null));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'xml' });
      expect(drain(c)).toEqual([{ kind: 'xml-table-emptied', phaseId: P, count: 1 }]);
    }
  });

  it('DERIVATIONS §4.12 (review note 3, PR #369): the count is the number of such Attempts -- one tcp-held result refused by the guard and one xml-held result count 1; both counted count 2', () => {
    // rule 5 itself never retracts anything (unlike the absent-row case): both bibs stay known throughout
    // every block below. Only the diagnostic's count differs, by how many of them the absent-row case
    // *would* retract (DERIVATIONS §4.12) -- which is what this test pins down.

    // one refused (tcp-held, early changedAfter), one unconditional (xml-held): count 1, not 2.
    {
      const P = 'K1M_BR1_11';
      const A1 = `${P}:1`, A2 = `${P}:2`;
      const k1 = kit(A1, P);
      const c = k1.core();
      c.applyUnit([{ ingestSeq: 1, snapshot: { source: 'tcp', phaseId: P, mode: 'results', rows: [{ bib: '1', outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true }] }, observedAt: '2026-01-01T10:00:00.000Z' } as GivenElement]);
      c.applyUnit([
        { ingestSeq: 2, event: 'xml-rewrite-detected', observedAt: '2026-01-01T10:00:00.000Z', changedAfter: null } as GivenElement,
        { ingestSeq: 3, snapshot: { source: 'xml', phaseId: P, mode: 'results', rows: [{ bib: '2', outcome: dur(81), placement: { rank: 2, order: 2 }, judgingComplete: true }] }, observedAt: '2026-01-01T10:00:00.000Z' } as GivenElement,
      ]);
      // changedAfter predates bib 1's tcp delivery: its guard refuses; bib 2's xml-held result counts regardless.
      c.applyUnit(emptyTable(4, P, '2026-01-01T10:00:30.000Z', '2026-01-01T09:59:50.000Z'));
      expect(field(c, A1, 'outcome'), 'bib 1 stays known, tcp (refused: not counted)').toMatchObject({ state: 'known', source: 'tcp' });
      expect(field(c, A2, 'outcome'), 'bib 2 stays known, xml (counted anyway)').toMatchObject({ state: 'known', source: 'xml' });
      expect(drain(c)).toEqual([{ kind: 'xml-table-emptied', phaseId: P, count: 1 }]);
    }

    // both admitted: count 2.
    {
      const P = 'K1M_BR1_12';
      const A1 = `${P}:1`, A2 = `${P}:2`;
      const k1 = kit(A1, P);
      const c = k1.core();
      c.applyUnit([{ ingestSeq: 1, snapshot: { source: 'tcp', phaseId: P, mode: 'results', rows: [{ bib: '1', outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true }] }, observedAt: '2026-01-01T10:00:00.000Z' } as GivenElement]);
      c.applyUnit([
        { ingestSeq: 2, event: 'xml-rewrite-detected', observedAt: '2026-01-01T10:00:00.000Z', changedAfter: null } as GivenElement,
        { ingestSeq: 3, snapshot: { source: 'xml', phaseId: P, mode: 'results', rows: [{ bib: '2', outcome: dur(81), placement: { rank: 2, order: 2 }, judgingComplete: true }] }, observedAt: '2026-01-01T10:00:00.000Z' } as GivenElement,
      ]);
      // changedAfter postdates bib 1's tcp delivery: its guard admits it too; bib 2 counts as always.
      c.applyUnit(emptyTable(4, P, '2026-01-01T10:01:00.000Z', '2026-01-01T10:00:05.000Z'));
      expect(field(c, A1, 'outcome'), 'bib 1 stays known, tcp (admitted too, but rule 5 still retracts nothing)').toMatchObject({ state: 'known', source: 'tcp' });
      expect(field(c, A2, 'outcome'), 'bib 2 stays known, xml').toMatchObject({ state: 'known', source: 'xml' });
      expect(drain(c)).toEqual([{ kind: 'xml-table-emptied', phaseId: P, count: 2 }]);
    }
  });
});

describe('DERIVATIONS §4.12, §0.3 (#365 row 10)', () => {
  it('a race whose xml table has carried rows, then a first read after a path change or restart (changedAfter null) that is empty over a tcp-held result: no xml-table-emptied', () => {
    const P = 'K1M_BR1_21', A = `${P}:9`;
    const k = kit(A, P);
    const c = k.core();
    // the table carried a row once, armed (phase.xmlTable = 'rows', src/core/types.ts), before the server's xml path
    // changed or it restarted: that first read after the restart carries no content age (DERIVATIONS §0.3, null =
    // no stat since start or a different signature), whatever the race looked like before.
    c.applyUnit(k.xml('2026-01-01T09:00:00.000Z', null, { outcome: dur(79), placement: { rank: 1, order: 1 }, judgingComplete: true }));
    c.applyUnit([k.snap('tcp', '2026-01-01T10:00:00.000Z', { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });

    c.applyUnit(emptyTable(3, P, '2026-01-01T10:05:00.000Z', null));
    expect(field(c, A, 'outcome'), 'the tcp-held result is untouched: the guard refuses a null content age').toMatchObject({ state: 'known', value: { totalSeconds: 80 }, source: 'tcp' });
    expect(drain(c), 'no xml-table-emptied: changedAfter null never qualifies the candidate it would count').toEqual([]);
    expect(c.attempts(), 'ADR-015 Rev 6 rule 6, DERIVATIONS §10 item 38 (j): an emptied table removes no Attempt either').toContain(A);
  });
});
