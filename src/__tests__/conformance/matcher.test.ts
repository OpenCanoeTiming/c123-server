import { describe, it, expect } from 'vitest';
import { matchMergeExpect, matchValue, VectorMismatch, type LoggedMessage, type MergeObservation } from './matcher.js';
import { groupUnits, loadVectors, resolveContext, runVector, type Vector } from './run-vector.js';
import { newRecorder, scriptedPort, type Scripted } from './test-ports.js';
import type { GivenElement, NotificationMessage } from './port.js';

const A = 'K1M_BR1_6:9';
const passes = (f: () => void): void => expect(f).not.toThrow();
const mismatch = (f: () => void): void => expect(f).toThrow(VectorMismatch);

function obs(script: Scripted, log: LoggedMessage[] = [], attemptId = A, vectorScope?: string): MergeObservation {
  const port = scriptedPort(script).createMergePort({ attemptId, xmlPollIntervalSeconds: 5 });
  return { port, attemptId, log, ...(vectorScope ? { vectorScope } : {}) };
}
const msg = (unitStart: number, message: NotificationMessage): LoggedMessage => ({ unitStart, message });

describe('expect semantics (CONFORMANCE-VECTORS §1 "expect is the presented state after the last given")', () => {
  it('rule: an envelope field left out of expect is not asserted', () => {
    const o = obs({ presented: { [A]: { outcome: { state: 'known', value: { totalSeconds: 85 }, source: 'tcp', provisional: false, confidence: 'authoritative' } } } });
    passes(() => matchMergeExpect({ outcome: { state: 'known' } }, o));
    passes(() => matchMergeExpect({ outcome: { state: 'known', value: { totalSeconds: 85 } } }, o));
    mismatch(() => matchMergeExpect({ outcome: { state: 'known', provisional: true } }, o));
  });

  it('rule: a field not named by expect is not asserted at all', () => {
    const o = obs({ presented: { [A]: { outcome: { state: 'known' }, status: { state: 'not-yet' } } } });
    passes(() => matchMergeExpect({ outcome: { state: 'known' } }, o));
  });

  it('CONTRACTS §1.3 gate penalty: null is distinct from 0', () => {
    const gates = (penalty: unknown) => ({ gates: { state: 'known', value: [{ number: 4, penalty }] } });
    const want = (penalty: unknown) => ({ gates: { state: 'known', value: [{ number: 4, penalty }] } });
    passes(() => matchMergeExpect(want(null), obs({ presented: { [A]: gates(null) } })));
    passes(() => matchMergeExpect(want(0), obs({ presented: { [A]: gates(0) } })));
    mismatch(() => matchMergeExpect(want(null), obs({ presented: { [A]: gates(0) } })));
    mismatch(() => matchMergeExpect(want(0), obs({ presented: { [A]: gates(null) } })));
  });

  it('CONTRACTS §1.2: null is distinct from an absent key', () => {
    const absent = obs({ presented: { [A]: { outcome: { state: 'known' } } } });
    const nulled = obs({ presented: { [A]: { outcome: { state: 'known', eventTime: null } } } });
    mismatch(() => matchMergeExpect({ outcome: { eventTime: null } }, absent));
    passes(() => matchMergeExpect({ outcome: { eventTime: null } }, nulled));
    mismatch(() => matchMergeExpect({ outcome: { eventTime: 0 } }, nulled));
    mismatch(() => matchMergeExpect({ outcome: { eventTime: 0 } }, absent));
  });

  it('CONTRACTS §1.2: an expected key that is absent from the actual object fails, undefined is not null', () => {
    mismatch(() => matchValue({ a: null }, { a: undefined }));
    mismatch(() => matchValue(0, undefined));
    mismatch(() => matchValue(0, null));
    mismatch(() => matchValue(null, 0));
    passes(() => matchValue(0, 0));
  });

  it('rule: note is never compared, at the top of expect or in an expectSequence step', () => {
    const o = obs({ presented: { [A]: { status: { state: 'known', value: 'finished' } } } });
    passes(() => matchMergeExpect({ status: { state: 'known' }, note: 'this describes something that is not so' }, o));
    const v: Vector = {
      id: 'x', invariant: 'x', description: '', context: { attemptId: A },
      given: [{ ingestSeq: 1, field: 'status', source: 'tcp', kind: 'inference', observedAt: 't', value: 'finished', confidence: 'authoritative' }],
      expectSequence: [{ afterGivenIndex: 0, expect: { status: { state: 'known' }, note: 'wrong prose' } }],
      expect: { note: 'only a note' },
    };
    passes(() => runVector(v, scriptedPort({ presented: { [A]: { status: { state: 'known' } } } })));
  });

  it('rule: arrays are compared by length and order (oncourse, diagnostics, gates)', () => {
    mismatch(() => matchMergeExpect({ oncourse: ['a', 'b'] }, obs({ oncourse: { attemptIds: ['b', 'a'] } })));
    mismatch(() => matchMergeExpect({ oncourse: ['a'] }, obs({ oncourse: { attemptIds: ['a', 'b'] } })));
    passes(() => matchMergeExpect({ oncourse: ['a', 'b'] }, obs({ oncourse: { attemptIds: ['a', 'b'] } })));
    passes(() => matchMergeExpect({ oncourse: [] }, obs({ oncourse: { attemptIds: [] } })));
    mismatch(() => matchValue([{ n: 1 }, { n: 2 }], [{ n: 2 }, { n: 1 }]));
  });

  it('rule: <attemptId>.<field> routes to that Attempt, an unprefixed key to context.attemptId', () => {
    const o = obs({ presented: { [A]: { status: { state: 'known', value: 'dns' } }, 'K1W_BR1_19:53': { status: { state: 'known', value: 'finished' } } } });
    passes(() => matchMergeExpect({ status: { value: 'dns' }, 'K1W_BR1_19:53.status': { value: 'finished' } }, o));
    mismatch(() => matchMergeExpect({ 'K1W_BR1_19:53.status': { value: 'dns' } }, o));
    mismatch(() => matchMergeExpect({ status: { value: 'finished' } }, o));
  });

  it('rule: the default Attempt comes from context.attemptId, and K1M_BR1_6:9 where the vector names none', () => {
    expect(resolveContext(undefined).attemptId).toBe('K1M_BR1_6:9');
    expect(resolveContext({ tier: 'live' }).attemptId).toBe('K1M_BR1_6:9');
    expect(resolveContext({ attemptId: 'K1M_BR1_19:9' }).attemptId).toBe('K1M_BR1_19:9');
    const o = obs({ presented: { 'K1M_BR1_19:9': { run: { state: 'known', value: 2 } } } }, [], 'K1M_BR1_19:9');
    passes(() => matchMergeExpect({ run: { value: 2 } }, o));
  });

  it('rule: in a vector of scope entry, Entry fields (displayName, ageCategoryId, members[0].externalId) read the Entry, other keys the Attempt', () => {
    const o = obs({ entry: { displayName: { state: 'known', value: 'FR51' }, 'members[0].externalId': { state: 'unavailable', reason: 'not-applicable' } }, presented: { [A]: { courseOrder: { state: 'known', value: 1 } } } }, [], A, 'entry');
    passes(() => matchMergeExpect({ courseOrder: { value: 1 } }, o));
    // without the entry scope the same key addresses the Attempt, which does not present it
    mismatch(() => matchMergeExpect({ displayName: { value: 'FR51' } }, obs({ entry: { displayName: { state: 'known', value: 'FR51' } }, presented: { [A]: {} } })));
    passes(() => matchMergeExpect({ displayName: { value: 'FR51' }, 'members[0].externalId': { state: 'unavailable', reason: 'not-applicable' } }, o));
    mismatch(() => matchMergeExpect({ ageCategoryId: { state: 'known' } }, o));
  });

  it('unexpressible: a vector of scope phase is refused, not guessed (vectors inv6-clock-jump-does-not-reorder-merge, phasestatus-official-to-revised-skips-unofficial)', () => {
    for (const id of ['inv6-clock-jump-does-not-reorder-merge', 'phasestatus-official-to-revised-skips-unofficial']) {
      const v = loadVectors().find((x) => x.id === id)!;
      expect(v.scope, id).toBe('phase');
      expect(() => runVector(v, scriptedPort({ presented: { [A]: { status: v.expect.status as object } } })), id).toThrow(/unexpressible/);
    }
  });

  it('rule: an expect key the Attempt does not present fails, it is never skipped', () => {
    mismatch(() => matchMergeExpect({ nonsense: { state: 'known' } }, obs({ presented: { [A]: {} } })));
  });

  it('rule: oncourse featuredByUpstream null is distinct from an absent property', () => {
    passes(() => matchMergeExpect({ featuredByUpstream: null }, obs({ oncourse: { attemptIds: [], featuredByUpstream: null } })));
    mismatch(() => matchMergeExpect({ featuredByUpstream: null }, obs({ oncourse: { attemptIds: [] } })));
  });

  it('rule: writeRequest asserts the write status, only the keys it lists', () => {
    passes(() => matchMergeExpect({ writeRequest: { status: 'mismatched' } }, obs({ writeRequest: { status: 'mismatched', confirmedValue: 1 } })));
    mismatch(() => matchMergeExpect({ writeRequest: { status: 'confirmed' } }, obs({ writeRequest: { status: 'pending' } })));
  });
});

describe('diagnostics (CONFORMANCE-VECTORS §1 "diagnostics asserts the current diagnostics")', () => {
  it('diagnostics: the current list must equal the expected one, subset per element, in order', () => {
    const d = [{ kind: 'source-disagreement', field: 'gates', sources: ['tcp', 'xml'], extra: 1 }];
    passes(() => matchMergeExpect({ diagnostics: [{ kind: 'source-disagreement', field: 'gates', sources: ['tcp', 'xml'] }] }, obs({ diagnostics: d })));
    mismatch(() => matchMergeExpect({ diagnostics: [{ kind: 'stale-mark' }] }, obs({ diagnostics: d })));
  });

  it('diagnostics: an expected empty list fails while one is current (none where the vector expects none)', () => {
    passes(() => matchMergeExpect({ diagnostics: [] }, obs({ diagnostics: [] })));
    mismatch(() => matchMergeExpect({ diagnostics: [] }, obs({ diagnostics: [{ kind: 'stale-mark' }] })));
  });

  it('diagnostics: an expect without the key does not assert them', () => {
    passes(() => matchMergeExpect({}, obs({ diagnostics: [{ kind: 'stale-mark' }] })));
  });

  it('diagnostics: the diagnostics current at an intermediate step are the ones asserted (stale-mark is current only while withheld)', () => {
    const v: Vector = {
      id: 'x', invariant: 'x', description: '',
      given: [
        { ingestSeq: 1, field: 'status', source: 'tcp', kind: 'inference', observedAt: 'a', value: 'dnf', confidence: 'authoritative' },
        { ingestSeq: 2, field: 'status', source: 'tcp', kind: 'inference', observedAt: 'b', value: 'dsq', confidence: 'authoritative' },
      ],
      expectSequence: [{ afterGivenIndex: 0, expect: { diagnostics: [{ kind: 'stale-mark' }] } }],
      expect: { diagnostics: [] },
    };
    let n = 0;
    const port = scriptedPort({}, undefined, {});
    const base = port.createMergePort;
    port.createMergePort = (c) => {
      const m = base(c);
      return { ...m, applyUnit: (e) => { m.applyUnit(e); n++; }, diagnostics: () => (n === 1 ? [{ kind: 'stale-mark' }] : []) };
    };
    passes(() => runVector(v, port));
  });
});

describe('notifications map and object form (CONFORMANCE-VECTORS §1 "notifications")', () => {
  const m = (type: string, extra: Record<string, unknown> = {}): NotificationMessage => ({ type, ...extra });

  it('map: a message type to a count; counts must match exactly', () => {
    const log = [msg(0, m('attempt.updated')), msg(1, m('attempt.updated')), msg(1, m('oncourse.updated'))];
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': 2, 'oncourse.updated': 1 } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': 1 } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'standing.updated': 1 } }, obs({}, log)));
  });

  it('map: a type absent from the map is not asserted', () => {
    const log = [msg(0, m('attempt.updated')), msg(0, m('standing.updated')), msg(0, m('standing.updated'))];
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': 1 } }, obs({}, log)));
  });

  it('map: a count of 0 is asserted (zero is not "absent")', () => {
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': 0 } }, obs({}, [])));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': 0 } }, obs({}, [msg(0, m('attempt.updated'))])));
  });

  it('object form: count is required', () => {
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { attemptId: A } } }, obs({}, [])));
  });

  it('object form: afterGivenIndex counts only units whose elements all follow that index', () => {
    const log = [msg(0, m('attempt.updated')), msg(2, m('attempt.updated')), msg(3, m('attempt.updated'))];
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 2, afterGivenIndex: 1 } } }, obs({}, log)));
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 3, afterGivenIndex: -1 } } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 3, afterGivenIndex: 1 } } }, obs({}, log)));
    // a unit starting AT the index does not follow it
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 1, afterGivenIndex: 2 } } }, obs({}, log)));
  });

  it('object form: attemptId restricts to messages for that Attempt', () => {
    const log = [msg(0, m('attempt.updated', { attemptId: 'K1W_BR1_19:53' })), msg(0, m('attempt.updated', { attemptId: 'K1W_BR1_19:12' }))];
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 1, attemptId: 'K1W_BR1_19:53' } } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 2, attemptId: 'K1W_BR1_19:53' } } }, obs({}, log)));
  });

  it('object form: scope restricts scope.replaced to that scope', () => {
    const log = [msg(0, m('scope.replaced', { scope: { kind: 'phase', phaseId: 'P1' } })), msg(0, m('scope.replaced', { scope: { kind: 'event' } }))];
    passes(() => matchMergeExpect({ notifications: { 'scope.replaced': { count: 1, scope: { kind: 'event' } } } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'scope.replaced': { count: 1, scope: { kind: 'class' } } } }, obs({}, log)));
  });

  it('object form: fields names keys the single matching message must carry (presence only where expect states none)', () => {
    const log = [msg(1, m('attempt.updated', { fields: { run: { state: 'known', value: 2 }, status: { state: 'known', value: 'on-course' } } }))];
    const spec = { count: 1, fields: ['run', 'status'] };
    passes(() => matchMergeExpect({ notifications: { 'attempt.updated': spec } }, obs({}, log)));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 1, fields: ['run', 'outcome'] } } }, obs({}, log)));
  });

  it('object form: fields values resolve <field> for the context Attempt and <attemptId>.<field> for another', () => {
    const log = [msg(1, m('attempt.updated', { attemptId: 'K1W_BR1_19:53', fields: { outcome: { state: 'not-yet' } } }))];
    const n = { 'attempt.updated': { count: 1, attemptId: 'K1W_BR1_19:53', fields: ['outcome'] } };
    const st = { presented: { 'K1W_BR1_19:53': { outcome: { state: 'not-yet' } } } };
    passes(() => matchMergeExpect({ notifications: n, 'K1W_BR1_19:53.outcome': { state: 'not-yet' } }, obs(st, log)));
    mismatch(() => matchMergeExpect({ notifications: n, 'K1W_BR1_19:53.outcome': { state: 'known' } }, obs(st, log)));
    const own = [msg(1, m('attempt.updated', { fields: { run: { state: 'known', value: 2 } } }))];
    const nOwn = { 'attempt.updated': { count: 1, fields: ['run'] } };
    const stOwn = { presented: { [A]: { run: { state: 'known', value: 2 } } } };
    passes(() => matchMergeExpect({ notifications: nOwn, run: { value: 2 } }, obs(stOwn, own)));
    const st3 = { presented: { [A]: { run: { state: 'known', value: 3 } } } }; // presented agrees; only the message differs
    mismatch(() => matchMergeExpect({ notifications: nOwn, run: { value: 3 } }, obs(st3, own)));
  });

  it('object form: fields needs exactly one matching message', () => {
    const one = m('attempt.updated', { fields: { run: { state: 'known' } } });
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 2, fields: ['run'] } } }, obs({}, [msg(0, one), msg(0, one)])));
  });

  it('format: a number or string form of notifications does not exist and fails (round 14)', () => {
    mismatch(() => matchMergeExpect({ notifications: 1 }, obs({}, [msg(0, m('attempt.updated'))])));
    mismatch(() => matchMergeExpect({ notifications: 0 }, obs({}, [])));
    mismatch(() => matchMergeExpect({ notifications: 'one attempt.updated' }, obs({}, [])));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': 'one' } }, obs({}, [])));
    mismatch(() => matchMergeExpect({ notifications: { 'attempt.updated': { count: 1, nonsense: true } } }, obs({}, [msg(0, m('attempt.updated'))])));
  });
});

describe('ingest units (CONFORMANCE-VECTORS §1 "Ingest units"; CONTRACTS §1.6)', () => {
  const obsv = (seq: number, source: string, at: string, field = 'outcome'): GivenElement =>
    ({ ingestSeq: seq, field, source, kind: 'inference', observedAt: at, value: 1, confidence: 'authoritative' }) as GivenElement;

  it('unit rule: consecutive observations with the same source and observedAt are one unit', () => {
    const u = groupUnits([obsv(1, 'tcp', 't1'), obsv(2, 'tcp', 't1'), obsv(3, 'tcp', 't2'), obsv(4, 'xml', 't2')]);
    expect(u.map((x) => [x.start, x.elements.length])).toEqual([[0, 2], [2, 1], [3, 1]]);
  });

  it('unit rule: every event, snapshot and live-tier element is a unit of its own', () => {
    const ev = { ingestSeq: 2, event: 'tcp-disconnected', observedAt: 't1' } as GivenElement;
    const snap = { ingestSeq: 3, observedAt: 't1', snapshot: { source: 'tcp', phaseId: 'P', mode: 'results', rows: [] } } as GivenElement;
    const snap2 = { ...snap, ingestSeq: 4 } as GivenElement;
    const push = { ingestSeq: 5, observedAt: 't1', push: 'entry', body: {} } as GivenElement;
    const u = groupUnits([obsv(1, 'tcp', 't1'), ev, snap, snap2, push, push]);
    expect(u.map((x) => x.elements.length)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('unit rule: a non-observation between two same-source observations splits them', () => {
    const ev = { ingestSeq: 2, event: 'oncourse-empty', observedAt: 't1' } as GivenElement;
    expect(groupUnits([obsv(1, 'tcp', 't1'), ev, obsv(3, 'tcp', 't1')]).map((x) => x.elements.length)).toEqual([1, 1, 1]);
  });

  it('vector rerun-retracts-run-scoped-fields: the two two-element units reach applyUnit whole and afterGivenIndex 1 counts only the second', () => {
    const v = loadVectors().find((x) => x.id === 'rerun-retracts-run-scoped-fields')!;
    const exp = v.expect as Record<string, unknown>;
    const rec = newRecorder();
    const fields = { run: exp.run, status: exp.status, outcome: exp.outcome, placement: exp.placement };
    const port = scriptedPort(
      {
        presented: { [A]: { run: exp.run, status: exp.status, outcome: exp.outcome, placement: exp.placement } },
        // the unit that starts the re-run (second unit, given[2..3]) is the one message; the first unit emits an older one
        emit: (n) => (n === 0 ? [{ type: 'attempt.updated', attemptId: A, fields: { outcome: { state: 'known' } } }] : n === 1 ? [{ type: 'attempt.updated', attemptId: A, fields }] : []),
      },
      rec,
    );
    runVector(v, port);
    expect(rec.units.map((u) => u.map((e) => (e as { ingestSeq: number }).ingestSeq))).toEqual([[1, 2], [3, 4]]);
  });

  it('vector rerun-retracts-run-scoped-fields: applying element by element would miscount (the unit rule is load-bearing)', () => {
    const v = loadVectors().find((x) => x.id === 'rerun-retracts-run-scoped-fields')!;
    const exp = v.expect as Record<string, unknown>;
    const fields = { run: exp.run, status: exp.status, outcome: exp.outcome, placement: exp.placement };
    // a port that notifies once per element (4 times), as a per-observation core would
    const port = scriptedPort({
      presented: { [A]: { run: exp.run, status: exp.status, outcome: exp.outcome, placement: exp.placement } },
      emit: (_n, unit) => unit.map(() => ({ type: 'attempt.updated', attemptId: A, fields })),
    });
    mismatch(() => runVector(v, port));
  });

  it('expectSequence: afterGivenIndex -1 asserts before any given is applied (vector two-run-br1-unavailable-no-live-no-xml)', () => {
    const v = loadVectors().find((x) => x.id === 'two-run-br1-unavailable-no-live-no-xml')!;
    const seen: Array<{ applied: number }> = [];
    const port = scriptedPort({});
    const base = port.createMergePort;
    port.createMergePort = (c) => {
      const m = base(c);
      let applied = 0;
      return {
        ...m,
        applyUnit: (e) => { applied += e.length; m.applyUnit(e); },
        presented: () => { seen.push({ applied }); return { outcome: applied === 0 ? { state: 'not-yet' } : { state: 'unavailable', reason: 'source-unreachable' } }; },
      };
    };
    runVector(v, port);
    expect(seen.map((s) => s.applied)).toEqual([0, 1]);
  });

  it('expectSequence: afterGivenIndex is 0-based and steps interleave with then (vector rerun-stale-mark-not-presented: steps at 2 and 3, then final)', () => {
    const v = loadVectors().find((x) => x.id === 'rerun-stale-mark-not-presented')!;
    const A2 = 'K1M_BR1_19:9';
    // the state each reading must see: after 3 units (given[0..2]), after 4, after 5 (given + then)
    const expects = [v.expectSequence![0]!.expect, v.expectSequence![1]!.expect, v.expect];
    const reads: number[] = [];
    const port = scriptedPort({});
    const base = port.createMergePort;
    port.createMergePort = (c) => {
      const m = base(c);
      let units = 0;
      const e = () => expects[units - 3]!;
      return {
        ...m,
        applyUnit: (u) => { units++; m.applyUnit(u); },
        diagnostics: () => (e().diagnostics as unknown[] | undefined) ?? [],
        presented: () => {
          reads.push(units);
          const out: Record<string, unknown> = {};
          for (const [k, val] of Object.entries(e())) if (k.startsWith(`${A2}.`)) out[k.slice(A2.length + 1)] = val;
          return out;
        },
      };
    };
    runVector(v, port);
    expect(new Set(reads)).toEqual(new Set([3, 4, 5]));
    expect(reads[0]).toBe(3);
  });

  it('expectSequence: an afterGivenIndex inside an ingest unit is refused (§1 "none may")', () => {
    const el = (seq: number): GivenElement => ({ ingestSeq: seq, field: 'outcome', source: 'tcp', kind: 'inference', observedAt: 't', value: 1, confidence: 'authoritative' }) as GivenElement;
    const v: Vector = { id: 'x', invariant: 'x', description: '', given: [el(1), el(2)], expectSequence: [{ afterGivenIndex: 0, expect: {} }], expect: {} };
    mismatch(() => runVector(v, scriptedPort({})));
  });
});

describe('content age and context (CONFORMANCE-VECTORS §1 "Content age"; issue #200 row 13)', () => {
  it('context.xmlPollIntervalSeconds reaches the port, and is 5 where the vector has none', () => {
    const base = { id: 'x', invariant: 'x', description: '', given: [] as unknown[], expect: {} };
    const rec = newRecorder();
    runVector({ ...base, context: { xmlPollIntervalSeconds: 4 } }, scriptedPort({}, rec));
    runVector({ ...base, context: { attemptId: 'K1M_BR1_19:9' } }, scriptedPort({}, rec));
    runVector({ ...base }, scriptedPort({}, rec));
    expect(rec.contexts.map((c) => c.xmlPollIntervalSeconds)).toEqual([4, 5, 5]);
    expect(rec.contexts[1]!.attemptId).toBe('K1M_BR1_19:9');
  });

  it('context: the other context keys are passed through verbatim (tcpConnectedThroughout, discipline, phase)', () => {
    const rec = newRecorder();
    runVector({ id: 'x', invariant: 'x', description: '', given: [], expect: {}, context: { tcpConnectedThroughout: true, discipline: 'cross', phase: 'P' } }, scriptedPort({}, rec));
    expect(rec.contexts[0]).toMatchObject({ tcpConnectedThroughout: true, discipline: 'cross', phase: 'P' });
  });

  it('every vector that states xmlPollIntervalSeconds reaches the port with its own value', () => {
    for (const v of loadVectors().filter((x) => typeof x.context?.xmlPollIntervalSeconds === 'number')) {
      const rec = newRecorder();
      try { runVector(v, scriptedPort({}, rec)); } catch { /* the stub answers wrongly; only the context matters */ }
      expect(rec.contexts[0]!.xmlPollIntervalSeconds, v.id).toBe(v.context!.xmlPollIntervalSeconds);
    }
  });
});

describe('standing and workflow vectors (issue #200 rows 11, 12)', () => {
  const base = { invariant: 'x', description: '' };

  it('standing: standing is matched in order (subset per row) and anomalies by list', () => {
    const v: Vector = { ...base, id: 's', scope: { kind: 'phase', phaseId: 'P' }, given: { entries: [] }, expect: { standing: [{ entryId: 'B', rank: 1 }, { entryId: 'A', rank: null }], anomalies: [] } };
    const mk = (standing: unknown[], anomalies: unknown[] = []) => scriptedPort({}, undefined, { assembleStanding: () => ({ standing, anomalies }) });
    passes(() => runVector(v, mk([{ entryId: 'B', rank: 1, order: 1 }, { entryId: 'A', rank: null, order: null }])));
    mismatch(() => runVector(v, mk([{ entryId: 'A', rank: null }, { entryId: 'B', rank: 1 }])));
    mismatch(() => runVector(v, mk([{ entryId: 'B', rank: 1 }, { entryId: 'A' }])));
    mismatch(() => runVector(v, mk([{ entryId: 'B', rank: 1 }, { entryId: 'A', rank: null }], [{ kind: 'order-disagreement' }])));
  });

  it('standing: the port receives entries, scope, ageCategoryId and upstreamCategoryRanks', () => {
    const v = loadVectors().find((x) => x.id === 'standing-category-rank-disagreement-recorded')!;
    let got: unknown[] = [];
    runVector(v, scriptedPort({}, undefined, { assembleStanding: (g, s) => { got = [g, s]; return { standing: [{ entryId: 'B', rank: 1 }], anomalies: [{ kind: 'category-rank-disagreement', entryId: 'B', assembled: 1, upstream: 2 }] }; } }));
    expect(got[1]).toEqual(v.scope);
    expect(got[0]).toMatchObject({ ageCategoryId: 'DM', upstreamCategoryRanks: { B: 2 } });
    expect((got[0] as { entries: unknown[] }).entries).toEqual((v.given as { entries: unknown[] }).entries);
  });

  it('standing: a vector without ageCategoryId or upstreamCategoryRanks passes neither key', () => {
    const v = loadVectors().find((x) => x.id === 'standing-relays-upstream-order')!;
    let got: object = {};
    try { runVector(v, scriptedPort({}, undefined, { assembleStanding: (g) => { got = g; return { standing: [], anomalies: [] }; } })); } catch { /* wrong answer */ }
    expect(Object.keys(got)).toEqual(['entries']);
  });

  it('standing: the assembled ageCategoryId is asserted when the vector states one', () => {
    const v: Vector = { ...base, id: 's', scope: { kind: 'phase', phaseId: 'P' }, given: { entries: [] }, expect: { ageCategoryId: 'DM', standing: [] } };
    passes(() => runVector(v, scriptedPort({}, undefined, { assembleStanding: () => ({ standing: [], anomalies: [], ageCategoryId: 'DM' }) })));
    mismatch(() => runVector(v, scriptedPort({}, undefined, { assembleStanding: () => ({ standing: [], anomalies: [] }) })));
    mismatch(() => runVector(v, scriptedPort({}, undefined, { assembleStanding: () => ({ standing: [], anomalies: [], ageCategoryId: null }) })));
  });

  it('workflow: gateStatus is asserted for the listed keys only; checks only for the listed fields', () => {
    const v = loadVectors().find((x) => x.id === 'check-not-carried-to-new-generation')!;
    const ok = scriptedPort({}, undefined, { gateStatus: () => ({ gateStatus: { 'C1W_BR1_19:38:2:7': 'plain', 'other:1:1': 'stale' }, checks: [{ attemptId: 'C1W_BR1_19:38', run: 1, gate: 7, valueAtCheck: 2, checkedAt: 'x' }] }) });
    passes(() => runVector(v, ok));
    mismatch(() => runVector(v, scriptedPort({}, undefined, { gateStatus: () => ({ gateStatus: { 'C1W_BR1_19:38:2:7': 'stale' }, checks: [{ attemptId: 'C1W_BR1_19:38', run: 1, gate: 7, valueAtCheck: 2 }] }) })));
    mismatch(() => runVector(v, scriptedPort({}, undefined, { gateStatus: () => ({ gateStatus: { 'C1W_BR1_19:38:2:7': 'plain' }, checks: [{ attemptId: 'C1W_BR1_19:38', run: 1, gate: 7, valueAtCheck: 0 }] }) })));
  });

  it('workflow: then is a new presented; the step at afterGivenIndex -1 sees the original (vector check-stale-definition)', () => {
    const v = loadVectors().find((x) => x.id === 'check-stale-definition')!;
    const penalties: unknown[] = [];
    const port = scriptedPort({}, undefined, {
      gateStatus: (g) => {
        const p = (g.presented['C1W_BR1_19:38']!.gates as Array<{ penalty: number }>)[0]!.penalty;
        penalties.push(p);
        return { gateStatus: { 'C1W_BR1_19:38:1:7': p === 2 ? 'verified' : 'stale' } };
      },
    });
    passes(() => runVector(v, port));
    expect(penalties).toEqual([2, 50]);
  });

  it('workflow: null and 0 stay distinct in what the port is given (vector check-null-vs-zero-distinct)', () => {
    const v = loadVectors().find((x) => x.id === 'check-null-vs-zero-distinct')!;
    let seen: WorkflowGivenLike | undefined;
    type WorkflowGivenLike = { checks: Array<{ gate: number; valueAtCheck: unknown }>; presented: Record<string, { gates: Array<{ number: number; penalty: unknown }> }> };
    try { runVector(v, scriptedPort({}, undefined, { gateStatus: (g) => { seen = g as unknown as WorkflowGivenLike; return { gateStatus: {} }; } })); } catch { /* wrong answer */ }
    expect(seen!.checks.map((c) => c.valueAtCheck)).toEqual([null, 0, null, 2]);
    expect(seen!.presented['C1W_BR1_19:38']!.gates.map((g) => g.penalty)).toEqual([0, null, null, null]);
  });
});
