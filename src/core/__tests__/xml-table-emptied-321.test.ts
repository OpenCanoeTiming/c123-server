import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { field, kit } from './kit.js';

/**
 * #321 rows 6-7 (M2 P3a part 1 of 3): ADR-015 Revision 5 rule 5 -- a wholly empty XML table (a race
 * the snapshot's schedule names with no result row at all) retracts nothing, whatever its content
 * age, and the core raises the ingest-only diagnostic `xml-table-emptied { phaseId, count }`
 * (DERIVATIONS §4.12, §0.5), counting a `tcp` result only where the snapshot's `changedAfter` is
 * later than its delivery.
 *
 * That diagnostic cannot be asserted at this surface, and this file does not invent one to carry
 * it: `MergeCore.diagnostics()` (`src/core/index.ts`) returns the `Diagnostic` union of
 * `@opencanoetiming/c123-contract`, which is closed to six admin-facing kinds (none `xml-table-emptied`),
 * and `GET /api/diagnostics` is wired straight to that method (`src/onsite/app.ts`), so widening it
 * would put the diagnostic on the wire -- against DERIVATIONS §0.5's "never GET /api/diagnostics".
 * `MergeCore.applyUnit`'s return value is documented to carry only the leave rule's `oncourse-left`.
 * `OnsiteOptions.adminLog`'s `AdminLogEntry` has today only `'store-set-aside'` (finding #367;
 * `src/onsite/index.ts`): no admin-log route for an ingest-only kind exists yet either. So the
 * diagnostic, its count and the "once per emptying" rule are asserted only at the on-site level
 * (row 8, `src/onsite/__tests__/xml-table-emptied-321.test.ts`), where this PR builds the route.
 * What a merge port can show is the one thing left: nothing is ever retracted by an empty table.
 * Row 6 replays vector `retraction-xml-empty-table-retracts-nothing`'s setup (CONFORMANCE-VECTORS.md
 * §2), which already passes today -- these are guards, not new coverage, kept here so a future
 * regression on the retraction side of rule 5 is still caught beside the diagnostic's own tests.
 */
const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });
const emptyTable = (ingestSeq: number, phaseId: string, observedAt: string, changedAfter: string | null): GivenElement[] => [
  { ingestSeq, event: 'xml-rewrite-detected', observedAt, changedAfter } as GivenElement,
  { ingestSeq: ingestSeq + 1, snapshot: { source: 'xml', phaseId, mode: 'start-list', rows: [] }, observedAt } as GivenElement,
];

describe('ADR-015 Rev 5 rule 5 (#321 row 6)', () => {
  it('ADR-015 Rev 5 rule 5, DERIVATIONS §4.12: a table with no rows retracts nothing and raises xml-table-emptied once with phaseId and count (guard: retraction side, passes today; the diagnostic itself is row 8)', () => {
    const A = 'K1M_BR1_6:11', P = 'K1M_BR1_6';
    const k = kit(A, P);
    const c = k.core();
    // vector retraction-xml-empty-table-retracts-nothing's setup: a tcp result, then a wholly empty table.
    c.applyUnit([k.snap('tcp', '2026-09-15T10:40:59.500Z', { outcome: dur(90.12), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    c.applyUnit(emptyTable(2, P, '2026-09-15T10:41:37.000Z', '2026-09-15T10:41:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 }, source: 'tcp' });
    expect(field(c, A, 'placement')).toMatchObject({ state: 'known', value: { rank: 1, order: 1 }, source: 'tcp' });

    // "raised once ... and again only after a snapshot of the race has carried a row" (DERIVATIONS §4.12): whatever the
    // diagnostic count does (row 8), a second emptying in a row still retracts nothing.
    c.applyUnit(emptyTable(4, P, '2026-09-15T10:46:37.000Z', '2026-09-15T10:46:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 }, source: 'tcp' });

    // a snapshot of the race that carries a row again, then a new emptying: still retracts nothing.
    c.applyUnit([
      { ingestSeq: 6, event: 'xml-rewrite-detected', observedAt: '2026-09-15T10:51:37.000Z', changedAfter: '2026-09-15T10:51:32.000Z' } as GivenElement,
      { ingestSeq: 7, snapshot: { source: 'xml', phaseId: P, mode: 'results', rows: [{ bib: '11', outcome: dur(90.12), placement: { rank: 1, order: 1 }, judgingComplete: true }] }, observedAt: '2026-09-15T10:51:37.000Z' } as GivenElement,
    ]);
    c.applyUnit(emptyTable(8, P, '2026-09-15T10:56:37.000Z', '2026-09-15T10:56:32.000Z'));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 90.12 } });
    expect(field(c, A, 'placement')).toMatchObject({ state: 'known', value: { rank: 1, order: 1 } });
  });
});

describe('ADR-015 Rev 5 rule 5, the guard on the count (#321 row 7)', () => {
  it('DERIVATIONS §4.12: xml-table-emptied counts a tcp result only where changedAfter is later than its delivery; a first read or a table that never had rows raises none (guard: retraction side only, passes today; the count itself is row 8)', () => {
    const P = 'K1M_BR1_10';

    // (a) changedAfter null (a first read): retracts nothing either way (rule 5 does not depend on the guard for retraction).
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([k.snap('tcp', '2026-01-01T10:00:00.000Z', { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
      c.applyUnit(emptyTable(2, P, '2026-01-01T10:00:30.000Z', null));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
    }

    // (b) changedAfter earlier than the tcp delivery: retracts nothing (as every guard case does for rule 5).
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([k.snap('tcp', '2026-01-01T10:00:00.000Z', { outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
      c.applyUnit(emptyTable(2, P, '2026-01-01T10:00:30.000Z', '2026-01-01T09:59:50.000Z'));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
    }

    // (c) a race whose table never had rows: a start-list-mode empty table, no prior result -- nothing to retract, no Attempt exists.
    {
      const A = `${P}:9`;
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(emptyTable(1, P, '2026-01-01T10:00:30.000Z', '2026-01-01T10:00:25.000Z'));
      expect(c.attempts()).not.toContain(A);
    }

    // (d) an xml-held result counts whatever the content age -- again, retraction is unaffected: it stays known from xml either way.
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
    }
  });
});
