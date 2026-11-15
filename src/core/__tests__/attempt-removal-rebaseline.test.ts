import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { createMergeCore } from '../index.js';

/**
 * #373 row 12 (M2 P3a follow-up; review of PR #370, CQ2, corrected on review of PR #372, O1/O2;
 * DERIVATIONS §4.12 "Admitted", §10 item 38 (l); CONTRACTS §4 INV-7, re-baseline step 2; §7.2
 * `attempt.deleted`). Tests only: "Both halves are the merged core's" (DERIVATIONS §10 item 38 (l)).
 *
 * *Messages.* A removal inside a re-baseline's unit is sent as `attempt.deleted`, like every other
 * removal, with the pending write's `write.updated` before it, and the unit's `scope.replaced`
 * follows without the Attempt.
 *
 * *Guard.* The removal still counts every `tcp` delivery that named the Attempt, a results row and
 * an on-course listing alike; the re-baseline does not reset it. Step 1 discards a row's result
 * values but keeps what the same delivery stated of the Attempt's identity and lifecycle `status`,
 * so "met by nothing step 1 discarded" (CONTRACTS §4 step 2) still counts that delivery. A `tcp`
 * delivery later than the re-baseline's own `changedAfter` therefore holds the removal back, the
 * same as for an ordinary (non-re-baseline) snapshot (`attempt-removal-p3a.test.ts`'s own cases).
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
const rebaseline = (ingestSeq: number, observedAt: string, phaseId: string): GivenElement =>
  ({ ingestSeq, event: 'rebaseline', observedAt, scope: { kind: 'phase', phaseId } }) as GivenElement;
const T = (hms: string): string => `2026-09-15T${hms}Z`;
const deleted = (msgs: Array<{ type: string; [k: string]: unknown }>, attemptId: string) => msgs.filter((m) => m['type'] === 'attempt.deleted' && m['attemptId'] === attemptId);

describe('§10 item 38 (l) (#373 row 12, review of PR #370 CQ2 / PR #372 O1-O2)', () => {
  it('(i) a per-Phase re-baseline whose read lacks bib 11, off course, every tcp delivery predating changedAfter: removed; unit order write.updated (mismatched), attempt.deleted, scope.replaced without it', () => {
    const P = 'K1M_BR1_30', A = `${P}:11`, B = `${P}:9`;
    const c = createMergeCore();
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
        T('10:00:00.000'),
      ),
    ]);
    // a provisional write on bib 11's gate 1, pending (DERIVATIONS §6; CONTRACTS §2.9), to pin the unit's order.
    c.applyUnit([{ ingestSeq: 2, attemptId: A, field: 'gates', source: 'operator-write', kind: 'operator', observedAt: T('10:00:10.000'), value: [{ number: 1, penalty: 2 }], confidence: 'authoritative', run: 1 }]);
    expect((c.writeRequest() as { status?: string }).status).toBe('pending');

    const m = c.notifications().length;
    // the re-baseline's own read: changedAfter (10:00:30) postdates every tcp delivery of bib 11 above (10:00:00,
    // 10:00:10); bib 11 is off course (no listing was ever sent); the fresh read names bib 9 only.
    c.applyUnit([
      rebaseline(3, T('10:01:00.000'), P),
      rewrite(4, T('10:01:00.000'), T('10:00:30.000')),
      push(5, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true, gates: cells }], T('10:01:00.000')),
    ]);
    const unit = c.notifications().slice(m);

    expect(c.attempts(), 'removed: the re-baseline\'s own read is admitted for it').not.toContain(A);
    expect(c.attempts(), 'bib 9 stays').toContain(B);
    const deletedMsgs = deleted(unit, A);
    expect(deletedMsgs, 'exactly one attempt.deleted').toHaveLength(1);
    const scopeMsgs = unit.filter((msg) => msg['type'] === 'scope.replaced');
    expect(scopeMsgs, 'exactly one scope.replaced').toHaveLength(1);
    const scopeIds = (scopeMsgs[0]!['attempts'] as Array<{ attemptId: string }>).map((a) => a.attemptId);
    expect(scopeIds, 'scope.replaced no longer carries the removed Attempt').not.toContain(A);
    expect(scopeIds, 'it does carry the one that stays').toContain(B);

    const writeMsgs = unit.filter((msg) => msg['type'] === 'write.updated');
    expect(writeMsgs, 'the pending write resolves in the removal\'s unit').toHaveLength(1);
    const write = writeMsgs[0]!['write'] as { status: string; confirmedValue?: unknown };
    expect(write.status, 'mismatched, not confirmed').toBe('mismatched');
    expect(write).not.toHaveProperty('confirmedValue');

    // order (CONTRACTS §7.2, §10 item 38 (l)): write.updated, then attempt.deleted, then scope.replaced.
    const idxWrite = unit.indexOf(writeMsgs[0]!);
    const idxDeleted = unit.indexOf(deletedMsgs[0]!);
    const idxScope = unit.indexOf(scopeMsgs[0]!);
    expect(idxWrite, 'write.updated precedes attempt.deleted').toBeLessThan(idxDeleted);
    expect(idxDeleted, 'attempt.deleted precedes scope.replaced').toBeLessThan(idxScope);
  });

  it('(ii) the same, but a TCP results row for bib 11 delivered after changedAfter: not removed, stays in scope.replaced with its result fields not-yet until the next push', () => {
    const P = 'K1M_BR1_31', A = `${P}:11`, B = `${P}:9`;
    const c = createMergeCore();
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
        T('10:00:00.000'),
      ),
    ]);
    // a later tcp delivery of bib 11 (a results row), after what the re-baseline below states as changedAfter.
    c.applyUnit([push(2, 'tcp', P, 'results', [{ bib: '11', outcome: dur(91), placement: { rank: 2, order: 2 }, judgingComplete: true }], T('10:00:40.000'))]);

    const m = c.notifications().length;
    // changedAfter (10:00:30) predates the 10:00:40 delivery above: the guard refuses. The fresh read still lacks bib 11.
    c.applyUnit([
      rebaseline(3, T('10:01:00.000'), P),
      rewrite(4, T('10:01:00.000'), T('10:00:30.000')),
      push(5, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:01:00.000')),
    ]);
    const unit = c.notifications().slice(m);

    expect(c.attempts(), 'held back: a tcp delivery of bib 11 postdates changedAfter').toContain(A);
    expect(deleted(unit, A)).toEqual([]);

    const scopeMsgs = unit.filter((msg) => msg['type'] === 'scope.replaced');
    expect(scopeMsgs, 'exactly one scope.replaced').toHaveLength(1);
    const scopeEntry = (scopeMsgs[0]!['attempts'] as Array<{ attemptId: string; outcome?: unknown; placement?: unknown }>).find((a) => a.attemptId === A);
    expect(scopeEntry, 'bib 11 stays in scope.replaced').toBeDefined();
    // step 1 discards the row's result values regardless: the fresh read never named it, so its result fields are not-yet until the next push.
    expect(scopeEntry!.outcome, 'result fields not-yet, not the discarded 90.12').toEqual({ state: 'not-yet' });
    expect(scopeEntry!.placement, 'result fields not-yet').toEqual({ state: 'not-yet' });
    expect(c.presented(B)['outcome']).toMatchObject({ value: { totalSeconds: 84 } }); // untouched throughout
  });

  it('(iii) the same as (ii), but the later delivery is an on-course listing and bib 11 is then off course: not removed', () => {
    const P = 'K1M_BR1_32', A = `${P}:11`, B = `${P}:9`;
    const c = createMergeCore();
    const obs = (field: string, observedAt: string, value: unknown, extra: Record<string, unknown> = {}): GivenElement =>
      ({ ingestSeq: 0, attemptId: A, field, source: 'tcp', kind: 'inference', observedAt, value, confidence: 'authoritative', ...extra }) as GivenElement;

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
        T('10:00:00.000'),
      ),
    ]);
    // an on-course listing of bib 11 at 10:00:40 (after changedAfter, below): a tcp delivery, item 38 (l)'s
    // "a results row and an on-course listing alike". Bib 11 then leaves the on-course set before the re-baseline runs.
    c.applyUnit([obs('onCourse', T('10:00:40.000'), { dtStart: T('10:00:40.000'), dtFinish: null }), obs('status', T('10:00:40.000'), 'on-course')]);
    c.applyUnit([{ ingestSeq: 2, event: 'oncourse-left', attemptId: A, observedAt: T('10:00:45.000') }]);
    expect(c.oncourse().attemptIds, 'off course again by the time the re-baseline runs').not.toContain(A);

    const m = c.notifications().length;
    c.applyUnit([
      rebaseline(3, T('10:01:00.000'), P),
      rewrite(4, T('10:01:00.000'), T('10:00:30.000')),
      push(5, 'xml', P, 'results', [{ bib: '9', outcome: dur(84), placement: { rank: 1, order: 1 }, judgingComplete: true }], T('10:01:00.000')),
    ]);
    const unit = c.notifications().slice(m);

    expect(c.attempts(), 'held back: the listing\'s own delivery (10:00:40) postdates changedAfter (10:00:30), whether or not bib 11 is on course now').toContain(A);
    expect(deleted(unit, A)).toEqual([]);
    expect(c.attempts(), 'bib 9 stays').toContain(B);
  });
});
