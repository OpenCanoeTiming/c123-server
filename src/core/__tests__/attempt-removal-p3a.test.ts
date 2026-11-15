import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { createMergeCore } from '../index.js';
import { at, kit, type Core } from './kit.js';
import { coreWith } from './streams.js';

/**
 * #365 rows 3-8 (M2 P3a part 2 of 3, "an upstream removal is removed, keyed by the bib"): ADR-015 Revisions 6 and 7 --
 * an admitted XML snapshot whose race carries no row of the Attempt's bib removes it (DERIVATIONS §4.12 "the row is
 * absent" the admitted branch, "a row that returns"); CONTRACTS §2.6, §2.10, §4 INV-4, INV-7 rule 4, §7.2
 * (`attempt.deleted`); DERIVATIONS §10 item 38 (a)-(j) with its example. Part 1 (#321, merged) built the per-field
 * retraction and its guard; this file is only the removal itself -- every scenario below is built so the retraction
 * alone (already correct) would NOT explain what is asserted, isolating what #365 adds. Hand streams, no real clock.
 *
 * Every Attempt a test below expects to stay removed is one the snapshot IS admitted for: off the on-course set, and
 * every `tcp` observation of it (a listing included) delivered before the removing snapshot's `changedAfter`. Every
 * Attempt a test expects to stay is one the snapshot is NOT admitted for, or one no results-table row of its race has
 * ever named, or one still named by a row (a swap). Each block says which, and why.
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
const deleted = (msgs: Array<{ type: string; [k: string]: unknown }>, attemptId: string) => msgs.filter((m) => m['type'] === 'attempt.deleted' && m['attemptId'] === attemptId);
const updatedFor = (msgs: Array<{ type: string; [k: string]: unknown }>, attemptId: string) => msgs.filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === attemptId);

describe('ADR-015 Rev 6 rule 2, DERIVATIONS §10 item 38 (c) (#365 row 3)', () => {
  it('ADR-015 Rev 6 rule 2, §10 item 38 (c): a tcp observation of the Attempt delivered after changedAfter, a listing included, holds the removal back; the per-field retraction applies; the next admitted snapshot removes', () => {
    const A = 'K1M_BR1_6:11', B = 'K1M_BR1_6:9', P = 'K1M_BR1_6';
    const k = kit(A, P);
    const c = k.core();

    // bib 11 starts, finishes (the stream's inference), then the race's results-table push presents the finish from tcp (rule 1).
    c.applyUnit(k.listing(T('10:38:40.000'), T('10:38:40.000')));
    c.applyUnit(k.listing(T('10:40:00.000'), T('10:38:40.000'), T('10:40:00.000'), { runSeconds: 90.12 }));
    c.applyUnit([
      push(
        1,
        'tcp',
        P,
        'results',
        [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, judgingComplete: true },
        ],
        T('10:40:59.500'),
      ),
    ]);
    expect(c.presented(A)['outcome']).toMatchObject({ state: 'known', source: 'tcp' });

    // a late listing (10:41:40, after the changedAfter below) re-states the same finish: a tcp observation of the Attempt,
    // delivered after changedAfter, "a listing included" (item 38 (c)) -- even though the result row's own delivery
    // (10:40:59.500) predates it. This also keeps bib 11 in the on-course set (item 38 (c)'s other clause): upstream's
    // grid is still showing it, which is exactly why a stale listing like this one must hold the removal back.
    c.applyUnit(k.listing(T('10:41:40.000'), T('10:38:40.000'), T('10:40:00.000'), { runSeconds: 90.12 }));

    const m1 = c.notifications().length;
    c.applyUnit([rewrite(2, T('10:41:37.000'), T('10:41:32.000')), push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000'))]);
    const unit1 = c.notifications().slice(m1);

    // not removed: the guard refuses (the late listing postdates changedAfter).
    expect(c.attempts(), 'held back, not removed').toContain(A);
    expect(deleted(unit1, A)).toEqual([]);
    // the per-field retraction still applies (#321's rule: its own guard reads the tcp *result row's* delivery, 10:40:59.500, which does predate changedAfter).
    expect(c.presented(A)['outcome'], 'retracted').toEqual({ state: 'not-yet' });
    expect(c.presented(A)['placement'], 'retracted').toEqual({ state: 'not-yet' });
    // bib 9 is untouched.
    expect(c.presented(B)['outcome']).toMatchObject({ state: 'known', value: { totalSeconds: 84 } });

    // the Attempt genuinely leaves the on-course set now (closure): no further listing follows it.
    c.applyUnit([{ ingestSeq: 4, event: 'oncourse-left', attemptId: A, observedAt: T('10:41:45.000') }]);
    expect(c.oncourse().attemptIds).not.toContain(A);

    // the next rewrite: changedAfter now postdates every tcp observation of the Attempt, the late listing included (10:41:40.000).
    const m2 = c.notifications().length;
    c.applyUnit([rewrite(5, T('10:41:55.000'), T('10:41:50.000')), push(6, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:55.000'))]);
    const unit2 = c.notifications().slice(m2);

    expect(c.attempts(), 'now admitted: removed').not.toContain(A);
    expect(deleted(unit2, A)).toHaveLength(1);
    expect(updatedFor(unit2, A), 'no attempt.updated for the removed Attempt in its unit').toEqual([]);
  });

  it('ADR-015 Rev 6 rule 2: changedAfter null (a first read) never qualifies for removal', () => {
    const A = 'K1M_BR1_15:11', P = 'K1M_BR1_15';
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([push(1, 'tcp', P, 'results', [{ bib: '11', outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:00:00.000'))]);

    const m = c.notifications().length;
    c.applyUnit([rewrite(2, T('10:00:30.000'), null), push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:00:30.000'))]);
    const unit = c.notifications().slice(m);

    expect(c.attempts(), 'changedAfter null never qualifies, whatever the race holds').toContain(A);
    expect(deleted(unit, A)).toEqual([]);
  });
});

describe('DERIVATIONS §10 item 38 (b), (d) (#365 row 4)', () => {
  it('§10 item 38 (b), (d): an Attempt only the on-course stream named is not removed by an absent XML row; TCP\'s absent row never removes', () => {
    // (b) stream-only: bib 77 is named only by a listing, never by a results-table row of either source.
    {
      const A = 'K1M_BR1_6:77', P = 'K1M_BR1_6';
      const k = kit(A, P);
      const c = k.core();
      c.applyUnit(k.listing(T('10:39:00.000'), T('10:39:00.000')));
      // closure: off the on-course set, so the only reason it could stay is item 38 (b) itself, not the on-course exemption.
      c.applyUnit([{ ingestSeq: 1, event: 'oncourse-left', attemptId: A, observedAt: T('10:39:10.000') }]);
      expect(c.oncourse().attemptIds).not.toContain(A);

      const m = c.notifications().length;
      // an admitted snapshot of the race (changedAfter well after the listing) that never lists bib 77.
      c.applyUnit([rewrite(2, T('10:41:37.000'), T('10:41:32.000')), push(3, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000'))]);
      const unit = c.notifications().slice(m);

      expect(c.attempts(), 'never named by a results-table row: kept').toContain(A);
      expect(deleted(unit, A)).toEqual([]);
    }

    // (d) TCP's absent row only retracts, never removes, whatever the guard would otherwise allow.
    {
      const A = 'K1M_BR1_16:11', B = 'K1M_BR1_16:9', P = 'K1M_BR1_16';
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
            { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, judgingComplete: true },
          ],
          T('10:40:59.500'),
        ),
      ]);

      const m = c.notifications().length;
      // the race's next tcp push lists bib 9 only: a later, fresher tcp observation, the kind of delivery that would admit an xml removal outright.
      c.applyUnit([push(2, 'tcp', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:10.000'))]);
      const unit = c.notifications().slice(m);

      expect(c.attempts(), 'TCP never removes').toContain(A);
      expect(deleted(unit, A)).toEqual([]);
      // it did retract (#321's TCP absent-row rule): the fields went not-yet.
      expect(c.presented(A)['outcome'], 'retracted, not removed').toEqual({ state: 'not-yet' });
      expect(c.presented(B)['outcome']).toMatchObject({ state: 'known', value: { totalSeconds: 84 } });
    }
  });
});

describe('ADR-015 Rev 6 rule 4 (#365 row 5)', () => {
  it('ADR-015 Rev 6 rule 4: the removed Attempt leaves every Standing; each Standing that changed is pushed whole once', () => {
    const P = 'K1M_BR1_17', A = `${P}:11`, B = `${P}:9`;
    const key = `phase:${P}/all`;
    const snap = (source: 'tcp' | 'xml', t: number, rows: unknown[]): GivenElement => ({ ingestSeq: t, observedAt: at(t), snapshot: { source, phaseId: P, mode: 'results', rows } }) as GivenElement;
    const row = (bib: string, rank: number, order: number, total: number) => ({ bib, outcome: dur(total), placement: { rank, order }, judgingComplete: true });

    const c = coreWith([]);
    c.applyUnit([snap('tcp', 10, [row('9', 1, 1, 84), row('11', 2, 2, 90.12)])]);
    const standingsSent = (from = 0) => c.notifications().slice(from).filter((m) => m['type'] === 'standing.updated' && (m['standing'] as { standingKey: string }).standingKey === key);
    const before = standingsSent().at(-1)!['standing'] as { entries: Array<{ bib: string }> };
    expect(before.entries.map((e) => e.bib).sort()).toEqual(['11', '9']);

    const m = c.notifications().length;
    // an admitted removal: changedAfter (20) postdates the tcp delivery (10); bib 11 is off course (no listing was ever sent).
    c.applyUnit([
      { ingestSeq: 20, event: 'xml-rewrite-detected', observedAt: at(20), changedAfter: at(15) } as GivenElement,
      snap('xml', 20, [row('9', 1, 1, 84)]),
    ]);
    const unit = c.notifications().slice(m);

    expect(c.attempts()).not.toContain(A);
    expect(deleted(unit, A)).toHaveLength(1);

    // the Standing is pushed whole, once, without bib 11 -- asserted on core.standings() (the conformance harness cannot read Standing rows).
    const standingPushes = standingsSent(m);
    expect(standingPushes, 'pushed exactly once for this unit').toHaveLength(1);
    const pushed = standingPushes[0]!['standing'] as { entries: Array<{ bib: string }> };
    expect(pushed.entries.map((e) => e.bib)).toEqual(['9']);
    const held = c.standings().find((s) => (s as unknown as { standingKey: string }).standingKey === key) as unknown as { entries: Array<{ bib: string }> };
    expect(held.entries.map((e) => e.bib)).toEqual(['9']);

    // ordering (CONTRACTS §7.2): the standing.updated that drops the Attempt follows its attempt.deleted.
    const deletedIdx = unit.findIndex((msg) => msg['type'] === 'attempt.deleted' && msg['attemptId'] === A);
    const standingIdx = unit.indexOf(standingPushes[0]!);
    expect(deletedIdx).toBeGreaterThanOrEqual(0);
    expect(standingIdx).toBeGreaterThan(deletedIdx);
    expect(c.attempts()).toContain(B);
  });
});

describe('CONTRACTS §4 rule 4, DERIVATIONS §10 item 38 (f) (#365 row 6)', () => {
  it('CONTRACTS §4 rule 4, §10 item 38 (f): a pending write of the removed Attempt resolves mismatched without confirmedValue, in the removal\'s unit, before attempt.deleted', () => {
    const A = 'K1M_BR1_18:11', P = 'K1M_BR1_18';
    const k = kit(A, P);
    const c = k.core();
    const cells = [{ number: 1, penalty: 0 }];
    c.applyUnit([
      push(
        1,
        'tcp',
        P,
        'results',
        [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true, gates: cells },
          { bib: '11', outcome: dur(90.12), placement: { rank: 2, order: 2 }, judgingComplete: true, gates: cells },
        ],
        T('10:40:59.500'),
      ),
    ]);
    // a provisional write on bib 11's gate 1, requesting penalty 2 -- pending (DERIVATIONS §6; CONTRACTS §2.9).
    c.applyUnit([{ ingestSeq: 2, attemptId: A, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: T('10:41:05.000'), value: [{ number: 1, penalty: 2 }], confidence: 'authoritative', run: 1 }]);
    expect((c.writeRequest() as { status?: string }).status).toBe('pending');

    const m = c.notifications().length;
    // an admitted removal: off course (no listing ever sent), changedAfter postdates the tcp push.
    c.applyUnit([rewrite(3, T('10:41:37.000'), T('10:41:32.000')), push(4, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true, gates: cells }], T('10:41:37.000'))]);
    const unit = c.notifications().slice(m);

    expect(c.attempts()).not.toContain(A);
    const deletedMsgs = deleted(unit, A);
    expect(deletedMsgs, 'exactly one attempt.deleted').toHaveLength(1);
    const writeMsgs = unit.filter((msg) => msg['type'] === 'write.updated');
    expect(writeMsgs, 'the write resolves in the removal\'s unit').toHaveLength(1);
    const write = writeMsgs[0]!['write'] as { status: string; confirmedValue?: unknown };
    expect(write.status, 'mismatched, not confirmed or superseded').toBe('mismatched');
    expect(write, 'no confirmedValue: upstream\'s table holds no result where one was requested').not.toHaveProperty('confirmedValue');
    // ordering: write.updated precedes attempt.deleted (CONTRACTS §7.2).
    expect(unit.indexOf(writeMsgs[0]!)).toBeLessThan(unit.indexOf(deletedMsgs[0]!));
    // the unit sends no attempt.updated for the removed Attempt.
    expect(updatedFor(unit, A)).toEqual([]);
  });
});

describe('ADR-015 Rev 6 rule 5, Rev 7 rule 3 (#365 row 7)', () => {
  it('ADR-015 Rev 6 rule 5, Rev 7 rule 3: a file listing race A without bib 11 and race B with it removes A:11 and creates B:11 in the same unit', () => {
    const PA = 'K1M_BR1_6', PB = 'K1M_BR1_7';
    const A = `${PA}:11`, Bnew = `${PB}:11`;
    const c = createMergeCore();

    // bib 11 raced in A, off course (no listing), its Entry on record.
    c.applyUnit([
      push(
        1,
        'tcp',
        PA,
        'results',
        [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '11', entry: { entryId: 'E11' }, outcome: dur(90.12), placement: { rank: 2, order: 2 }, judgingComplete: true },
        ],
        T('10:40:59.500'),
      ),
    ]);
    // a genuine Entry resource (CONTRACTS §2.5), not just the Attempt's own entry pointer, to show it is not removed (item 38 (h)).
    c.applyUnit([{ ingestSeq: 2, entryId: 'E11', field: 'displayName', source: 'tcp', kind: 'result-row', observedAt: T('10:40:59.500'), value: 'J. Doe', confidence: 'authoritative' }]);
    expect(c.entryIds()).toContain('E11');

    const m = c.notifications().length;
    // one XML save (one unit): race A's table carries bib 9 only; race B's table, previously unseen, carries bib 11.
    c.applyUnit([
      rewrite(3, T('10:41:37.000'), T('10:41:32.000')),
      push(4, 'xml', PA, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000')),
      push(5, 'xml', PB, 'results', [{ bib: '11', entry: { entryId: 'E11' }, outcome: dur(79.4), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:41:37.000')),
    ]);
    const unit = c.notifications().slice(m);

    expect(c.attempts()).not.toContain(A);
    expect(c.attempts()).toContain(Bnew);
    expect(deleted(unit, A)).toHaveLength(1);
    const created = updatedFor(unit, Bnew);
    expect(created.length, 'the creating message carries the whole resource (CONTRACTS §7.2)').toBeGreaterThanOrEqual(1);
    expect(created[0]!['fields']).toMatchObject({ phaseId: PB, bib: '11' });
    expect(c.presented(Bnew)['run']).toMatchObject({ state: 'known', value: 1 });
    // the Entry is not removed (item 38 (h)): the same entryId still on record, unaffected by the move.
    expect(c.entryIds()).toContain('E11');
    expect(c.entry('E11')['displayName']).toMatchObject({ state: 'known', value: 'J. Doe' });
  });
});

describe('ADR-015 Rev 7 rules 2-4, DERIVATIONS §10 item 38 example (#365 row 8)', () => {
  it('Rev 7 rules 2-4, §10 item 38 example: a one-step swap keeps both Attempts and swaps entry; a swap through an intermediate bib removes and recreates, run 1', () => {
    // (a) a one-step swap: both bibs stay named in the same save, just under the other competitor's Id. Nothing calls the
    // absent-row path at all here (every bib stays named) -- this guards a removal implementation that keys off `Id`
    // instead of the bib (CONTRACTS §2.6 "the bib is the key of a run's data").
    {
      const PA = 'K1M_BR1_19', A11 = `${PA}:11`, A12 = `${PA}:12`;
      const c = createMergeCore();
      // tcp carries the results only; `entry` (the Id pointer) is xml-only here, as the merged vector
      // attempt-kept-when-bib-stays-under-another-entry models it, so the swap below is a same-source (xml)
      // supersession (INV-2c "the later-ingested observation always supersedes"), not a cross-source guard case.
      c.applyUnit([
        push(1, 'tcp', PA, 'results', [
          { bib: '11', outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '12', outcome: dur(85), placement: { rank: 2, order: 2 }, judgingComplete: true },
        ], T('10:00:00.000')),
      ]);
      c.applyUnit([
        rewrite(2, T('10:00:05.000'), null),
        push(3, 'xml', PA, 'results', [
          { bib: '11', entry: { entryId: 'EX' }, outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '12', entry: { entryId: 'EY' }, outcome: dur(85), placement: { rank: 2, order: 2 }, judgingComplete: true },
        ], T('10:00:05.000')),
      ]);
      expect(c.presented(A11)['entry']).toMatchObject({ value: { entryId: 'EX' } });

      const m = c.notifications().length;
      c.applyUnit([
        rewrite(4, T('10:01:00.000'), T('10:00:30.000')),
        push(5, 'xml', PA, 'results', [
          { bib: '11', entry: { entryId: 'EY' }, outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '12', entry: { entryId: 'EX' }, outcome: dur(85), placement: { rank: 2, order: 2 }, judgingComplete: true },
        ], T('10:01:00.000')),
      ]);
      const unit = c.notifications().slice(m);

      expect(unit.filter((msg) => msg['type'] === 'attempt.deleted'), 'neither bib is removed').toEqual([]);
      expect(c.attempts().sort()).toEqual([A11, A12].sort());
      expect(c.presented(A11)['entry'], 'entry swapped').toMatchObject({ value: { entryId: 'EY' } });
      expect(c.presented(A12)['entry'], 'entry swapped').toMatchObject({ value: { entryId: 'EX' } });
      expect(c.presented(A11)['run']).toMatchObject({ value: 1 }); // "nothing else of the Attempt changes for that reason: not run" (Rev 7 rule 2)
      // checks and flags stay the bib's regardless (CONTRACTS §2.10): since neither Attempt is ever removed here, there is
      // nothing for the core to do -- the onsite ChecksStore keeps keying on (attemptId, run, gate), asserted at that level.
    }

    // (b) a swap through an intermediate bib: one save leaves bib 11 out (removed), the next carries it again, as another
    // competitor's bib now (Y's). The returning Attempt is run 1, carrying none of the removed one's result state --
    // not its run generation (bumped to 2 below), not a mark it presented (dsq), not its finish.
    {
      const P = 'K1M_BR1_20', A = `${P}:11`, B = `${P}:9`;
      const c = createMergeCore();
      c.applyUnit([push(1, 'tcp', P, 'results', [{ bib: '11', entry: { entryId: 'EX' }, outcome: dur(80), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:00:00.000'))]);
      expect(c.presented(A)['run']).toMatchObject({ value: 1 });

      // the run bumps to 2 (a re-run) and the new run is marked dsq.
      c.applyUnit([{ ingestSeq: 2, attemptId: A, field: 'run', source: 'tcp', kind: 'inference', observedAt: T('10:01:00.000'), value: 2, eventTime: T('10:00:55.000'), confidence: 'authoritative' }]);
      c.applyUnit([push(3, 'tcp', P, 'results', [{ bib: '11', status: 'dsq', judgingComplete: true }], T('10:02:00.000'))]);
      expect(c.presented(A)['run']).toMatchObject({ value: 2 });
      expect(c.presented(A)['status']).toMatchObject({ value: 'dsq' });

      // the save that leaves bib 11 out, off course, changedAfter postdating every tcp observation above: removed.
      c.applyUnit([rewrite(4, T('10:03:00.000'), T('10:02:30.000')), push(5, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:03:00.000'))]);
      expect(c.attempts()).not.toContain(A);

      // the save that carries bib 11 again, now Y's: creates it fresh.
      c.applyUnit([
        rewrite(6, T('10:04:00.000'), T('10:03:30.000')),
        push(7, 'xml', P, 'results', [
          { bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true },
          { bib: '11', entry: { entryId: 'EY' }, outcome: dur(70), placement: { rank: 1, order: 1 }, judgingComplete: true },
        ], T('10:04:00.000')),
      ]);

      expect(c.attempts()).toContain(A);
      expect(c.presented(A)['run'], 'run 1, not the removed one\'s generation 2').toMatchObject({ value: 1 });
      expect(c.presented(A)['status'], 'no trace of the removed one\'s dsq mark').toMatchObject({ value: 'finished' });
      expect(c.presented(A)['outcome'], 'presented fresh from the returning row only').toMatchObject({ value: { totalSeconds: 70 } });
      expect(c.presented(A)['entry']).toMatchObject({ value: { entryId: 'EY' } });
      expect(c.presented(B)['outcome']).toMatchObject({ value: { totalSeconds: 84 } }); // untouched throughout
      // the bib's checks are served again once the Attempt returns -- asserted at the onsite level (checks are not core
      // state): src/onsite/__tests__/attempt-deleted-p3a.test.ts (#365 row 9).
    }
  });
});
