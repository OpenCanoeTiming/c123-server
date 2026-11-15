import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { field, kit } from './kit.js';

/**
 * #321 rows 1-5 (M2 P3a part 1 of 3, "the retraction core"): ADR-015 Revision 5 rule 1 -- an XML
 * snapshot that carries other rows of the race and not this Attempt's retracts outcome, gates,
 * placement, underReview, qualified and any mark in status, under the content-age guard (INV-2c),
 * as TCP's absent row does (DERIVATIONS §4.12 "Retraction from an XML snapshot"; CONTRACTS §4
 * INV-7). Every Attempt here either stays in the on-course set or has a tcp observation delivered
 * after the retracting snapshot's changedAfter, so the snapshot is never admitted for removal
 * (ADR-015 Revision 6 rule 2): part 2 (#365) removes an Attempt only where the snapshot IS
 * admitted for it, so these rows stay true once that lands. Bib 11 at 10:40:59, the rewrite's
 * changedAfter 10:41:32, are ADR-015's own "Example". Hand streams, no real clock.
 */
const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });
const push = (
  ingestSeq: number,
  source: 'tcp' | 'xml',
  phaseId: string,
  mode: 'results' | 'start-list',
  rows: Array<Record<string, unknown>>,
  observedAt: string,
): GivenElement => ({ ingestSeq, snapshot: { source, phaseId, mode, rows }, observedAt }) as GivenElement;
const rewrite = (ingestSeq: number, observedAt: string, changedAfter: string | null): GivenElement =>
  ({ ingestSeq, event: 'xml-rewrite-detected', observedAt, changedAfter }) as GivenElement;
const T = (hms: string): string => `2026-09-15T${hms}Z`;

describe('ADR-015 Rev 5 rule 1 (#321 row 1)', () => {
  it('ADR-015 Rev 5 rule 1: an XML snapshot that carries other rows and not this bib retracts outcome, gates, placement, underReview, qualified and the mark', () => {
    const A = 'K1M_BR1_6:11', B = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P);
    const c = k.core();
    // bib 11 finishes and stays listed: the on-course set keeps a finisher until closure (CONTRACTS §7.1).
    c.applyUnit(k.listing(T('10:40:00.000'), T('10:38:40.000'), T('10:40:00.000'), { runSeconds: 90.12 }));
    // the race's results push: bib 9, and bib 11 DSQ'd after the finish (a mark over a time, DERIVATIONS §4.12 rule 6).
    c.applyUnit([
      push(
        1,
        'tcp',
        P,
        'results',
        [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
          {
            bib: '11',
            outcome: dur(90.12),
            placement: { rank: 2, order: 2 },
            gates: [{ number: 1, penalty: 0 }],
            underReview: true,
            qualified: true,
            judgingComplete: true,
            status: 'dsq',
          },
        ],
        T('10:40:59.500'),
      ),
    ]);
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'dsq' });

    // the XML snapshot carries bib 9 only: bib 11's row is absent, the guard passed (ADR-015's own "Example").
    c.applyUnit([
      rewrite(2, T('10:41:37.000'), T('10:41:32.000')),
      push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000')),
    ]);

    for (const f of ['outcome', 'gates', 'placement', 'underReview', 'qualified']) expect(field(c, A, f), f).toEqual({ state: 'not-yet' });
    // "After a retraction" (DERIVATIONS §4.12): status is what the stream currently shows -- bib 11 is still listed finished.
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'finished' });
    expect(c.attempts()).toContain(A);
    // bib 9 is untouched by bib 11's absence.
    expect(field(c, B, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 84 } });
    expect(field(c, B, 'placement')).toMatchObject({ state: 'known', value: { rank: 1, order: 1 } });
  });
});

describe('ADR-015 Rev 5 rule 1, paired second run (#321 row 2)', () => {
  it('ADR-015 Rev 5 rule 1: in a paired second run the absent XML row also retracts pairTotal and countingRun', () => {
    const A = 'K1M_BR2_6:11', P = 'K1M_BR2_6';
    const k = kit(A, P);
    const c = k.core();
    // countingRun is XML-only (INV-2 rule 3); establish it from an xml row first (first read: changedAfter null).
    c.applyUnit([rewrite(1, T('10:30:00.000'), null), push(2, 'xml', P, 'results', [{ bib: '9', countingRun: 1 }, { bib: '11', countingRun: 1 }], T('10:30:00.000'))]);
    // bib 11 finishes and stays listed, so the Attempt is never admitted for removal (part 2).
    c.applyUnit(k.listing(T('10:40:00.000'), T('10:38:40.000'), T('10:40:00.000'), { runSeconds: 90.12 }));
    c.applyUnit([
      push(
        3,
        'tcp',
        P,
        'results',
        [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, pairTotal: 160, judgingComplete: true },
          { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, pairTotal: 174.12, judgingComplete: true },
        ],
        T('10:40:59.500'),
      ),
    ]);
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 1, source: 'xml' });
    expect(field(c, A, 'pairTotal')).toMatchObject({ state: 'known', value: 174.12 });

    c.applyUnit([
      rewrite(4, T('10:41:37.000'), T('10:41:32.000')),
      push(5, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, pairTotal: 160, countingRun: 1, judgingComplete: true }], T('10:41:37.000')),
    ]);

    expect(field(c, A, 'pairTotal'), 'pairTotal').toEqual({ state: 'not-yet' });
    expect(field(c, A, 'countingRun'), 'countingRun').toEqual({ state: 'not-yet' });
    expect(field(c, A, 'outcome'), 'outcome').toEqual({ state: 'not-yet' });
    expect(field(c, A, 'placement'), 'placement').toEqual({ state: 'not-yet' });
  });
});

describe('ADR-015 Rev 5 rule 2, the guard (#321 row 3)', () => {
  it('ADR-015 Rev 5 rule 2: an absent XML row does not retract a tcp value delivered at or after changedAfter, nor on a first read (changedAfter null)', () => {
    const A = 'K1M_BR1_8:11', P = 'K1M_BR1_8';
    const row = (): Array<Record<string, unknown>> => [
      { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
      { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, judgingComplete: true },
    ];
    const absentBib9Only = (): Array<Record<string, unknown>> => [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }];

    // (a) a rewrite whose content age predates the tcp push: the guard refuses; a later rewrite retracts.
    {
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([push(1, 'tcp', P, 'results', row(), T('10:00:00.000'))]);
      c.applyUnit([rewrite(2, T('10:00:30.000'), T('09:59:50.000')), push(3, 'xml', P, 'results', absentBib9Only(), T('10:00:30.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
      expect(field(c, A, 'placement')).toMatchObject({ state: 'known', source: 'tcp' });

      c.applyUnit([rewrite(4, T('10:01:00.000'), T('10:00:05.000')), push(5, 'xml', P, 'results', absentBib9Only(), T('10:01:00.000'))]);
      expect(field(c, A, 'outcome'), 'outcome').toEqual({ state: 'not-yet' });
      expect(field(c, A, 'placement'), 'placement').toEqual({ state: 'not-yet' });
    }

    // (b) changedAfter null (a first read, INV-2c) never qualifies: nothing retracted.
    {
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([push(1, 'tcp', P, 'results', row(), T('10:00:00.000'))]);
      c.applyUnit([rewrite(2, T('10:00:30.000'), null), push(3, 'xml', P, 'results', absentBib9Only(), T('10:00:30.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'tcp' });
      expect(field(c, A, 'placement')).toMatchObject({ state: 'known', source: 'tcp' });
    }
  });
});

describe('ADR-015 Rev 5 rules 2 and 4 (#321 row 4)', () => {
  it('ADR-015 Rev 5 rules 2 and 4: an absent row retracts the earlier xml observation; a row that returns is presented by the ordinary rules', () => {
    // (a) an xml-only result (no tcp observation ever) is retracted by the absent row whatever
    // the content age: the guard is against a tcp observation only (Revision 5 rule 2). The
    // Attempt stays in the on-course set, so part 2 would not remove it either.
    {
      const A = 'K1M_BR1_9:21', P = 'K1M_BR1_9';
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([rewrite(1, T('10:00:00.000'), T('09:59:55.000')), push(2, 'xml', P, 'results', [{ bib: '21', outcome: dur(75), placement: { rank: 3, order: 3 }, judgingComplete: true }], T('10:00:00.000'))]);
      c.applyUnit(k.listing(T('10:00:05.000'), T('09:58:35.000'), T('10:00:05.000'), { runSeconds: 75 }));
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', source: 'xml' });

      // the retracting snapshot's own changedAfter is null -- it still retracts: there is no tcp
      // observation for the guard to compare against, only xml's own earlier one (always
      // superseded, the same source, later ingested).
      c.applyUnit([rewrite(3, T('10:01:00.000'), null), push(4, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:01:00.000'))]);
      expect(field(c, A, 'outcome'), 'outcome').toEqual({ state: 'not-yet' });
      expect(field(c, A, 'placement'), 'placement').toEqual({ state: 'not-yet' });

      // the row returns: presented at once, source xml (no tcp observation stands).
      c.applyUnit([rewrite(5, T('10:02:00.000'), T('10:01:30.000')), push(6, 'xml', P, 'results', [{ bib: '21', outcome: dur(75), placement: { rank: 3, order: 3 }, judgingComplete: true }], T('10:02:00.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 75 }, source: 'xml' });
    }

    // (b) a row that returns against a standing tcp observation follows rule 2 (INV-2c): the
    // guard refuses the returning value until its content age postdates the tcp delivery.
    {
      const A = 'K1M_BR1_9:22', P = 'K1M_BR1_9';
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([
        push(
          1,
          'tcp',
          P,
          'results',
          [
            { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
            { bib: '22', outcome: dur(60), placement: { rank: 4, order: 4 }, judgingComplete: true },
          ],
          T('10:00:00.000'),
        ),
      ]);
      c.applyUnit(k.listing(T('10:00:05.000'), T('09:59:00.000'), T('10:00:05.000'), { runSeconds: 60 }));

      // absent, guard refused (predates the push): the tcp value stands.
      c.applyUnit([rewrite(2, T('10:00:30.000'), T('09:59:50.000')), push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:00:30.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 60 }, source: 'tcp' });

      // the row returns with a different value, still guard-refused (changedAfter still predates the push): tcp still stands.
      c.applyUnit([rewrite(4, T('10:01:00.000'), T('09:59:52.000')), push(5, 'xml', P, 'results', [{ bib: '22', outcome: dur(61), placement: { rank: 4, order: 4 }, judgingComplete: true }], T('10:01:00.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 60 }, source: 'tcp' });

      // a further return whose content age finally postdates the tcp delivery: rule 2 admits it.
      c.applyUnit([rewrite(6, T('10:01:30.000'), T('10:00:05.000')), push(7, 'xml', P, 'results', [{ bib: '22', outcome: dur(61), placement: { rank: 4, order: 4 }, judgingComplete: true }], T('10:01:30.000'))]);
      expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { totalSeconds: 61 }, source: 'xml' });
    }
  });
});

describe('ADR-015 Rev 5 rule 3 (#321 row 5)', () => {
  it('ADR-015 Rev 5 rule 3: the absent row leaves entry, bib, startOrder, run and an on-course inference', () => {
    // bib 11: entry, startOrder and the on-course inference stand, untouched by its own retraction.
    {
      const A = 'K1M_BR1_6:11', P = 'K1M_BR1_6';
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit([k.obs('entry', 'tcp', 'result-row', T('10:30:00.000'), { entryId: '23028.K1M' })]);
      c.applyUnit(k.listing(T('10:40:00.000'), T('10:38:40.000'), T('10:40:00.000'), { runSeconds: 90.12 }));
      c.applyUnit([
        push(
          1,
          'tcp',
          P,
          'results',
          [
            { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
            { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, startOrder: 7, judgingComplete: true },
          ],
          T('10:40:59.500'),
        ),
      ]);
      const entryBefore = field(c, A, 'entry');
      const bibBefore = c.presented(A)['bib'];
      const startOrderBefore = field(c, A, 'startOrder');
      const runBefore = field(c, A, 'run');
      const onCourseBefore = field(c, A, 'onCourse');

      c.applyUnit([rewrite(2, T('10:41:37.000'), T('10:41:32.000')), push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000'))]);

      // the retracted fields went not-yet; these never did.
      expect(field(c, A, 'outcome'), 'outcome').toEqual({ state: 'not-yet' });
      expect(field(c, A, 'entry')).toEqual(entryBefore);
      expect(c.presented(A)['bib']).toBe(bibBefore);
      expect(field(c, A, 'startOrder')).toEqual(startOrderBefore);
      expect(field(c, A, 'run')).toEqual(runBefore);
      expect(field(c, A, 'onCourse')).toEqual(onCourseBefore);
      expect(c.oncourse().attemptIds).toContain(A);
    }

    // an Attempt named only by the stream, never by a results-table observation, is untouched by the absent row.
    {
      const A = 'K1M_BR1_6:77', P = 'K1M_BR1_6';
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(k.listing(T('10:39:00.000'), T('10:39:00.000')));
      const statusBefore = field(c, A, 'status');

      c.applyUnit([rewrite(1, T('10:41:37.000'), T('10:41:32.000')), push(2, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000'))]);

      expect(field(c, A, 'status')).toEqual(statusBefore);
      expect(field(c, A, 'outcome')).toEqual({ state: 'not-yet' });
      expect(c.attempts()).toContain(A);
    }
  });
});
