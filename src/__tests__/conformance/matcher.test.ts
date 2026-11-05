import { describe, it, expect } from 'vitest';
import { matchMergeExpect, matchValue, readPath, resolveResource, SECTION_KEYS, VectorMismatch, type LoggedMessage, type MergeObservation } from './matcher.js';
import { groupUnits, loadVectors, resolveContext, runVector, serverVectors, type Vector } from './run-vector.js';
import { newRecorder, scriptedPort, type Scripted } from './test-ports.js';
import type { GivenElement, NotificationMessage } from './port.js';

const A = 'K1M_BR1_6:9';
const passes = (f: () => void): void => expect(f).not.toThrow();
const mismatch = (f: () => void): void => expect(f).toThrow(VectorMismatch);

function obs(script: Scripted, log: LoggedMessage[] = [], attemptId = A, vectorScope?: string): MergeObservation {
  const port = scriptedPort(script).createMergePort({ attemptId, xmlPollIntervalSeconds: 5 });
  return { port, attemptId, log, phaseId: attemptId.slice(0, attemptId.lastIndexOf(':')), ...(vectorScope ? { vectorScope } : {}) };
}
const msg = (unitStart: number, message: NotificationMessage): LoggedMessage => ({ unitStart, message });

describe('expect semantics (CONFORMANCE-VECTORS §1 "expect is the presented state after the last given")', () => {
  it('rule: an envelope field left out of expect is not asserted', () => {
    const o = obs({ presented: { [A]: { outcome: { state: 'known', value: { kind: 'duration', totalSeconds: 85 }, source: 'tcp', provisional: false, confidence: 'authoritative' } } } });
    passes(() => matchMergeExpect({ outcome: { state: 'known' } }, o));
    passes(() => matchMergeExpect({ outcome: { state: 'known', value: { kind: 'duration', totalSeconds: 85 } } }, o));
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

  it('scope of a field (§1): a plain status reads the Attempt, never the Phase', () => {
    const o = obs({ presented: { [A]: { status: { state: 'known', value: 'dns' } } }, phases: { K1M_BR1_6: { status: { state: 'known', value: 'official' } } } });
    passes(() => matchMergeExpect({ status: { value: 'dns' } }, o));
    mismatch(() => matchMergeExpect({ status: { value: 'official' } }, o));
  });

  it('scope of a field (§1): a vector of scope phase reads status and scheduledStart from the Phase of context.attemptId (K1M_BR1_6)', () => {
    const o = obs({ presented: { [A]: { status: { state: 'known', value: 'dns' } } }, phases: { K1M_BR1_6: { status: { state: 'known', value: 'paused' }, scheduledStart: { state: 'known', value: 't' } } } }, [], A, 'phase');
    passes(() => matchMergeExpect({ status: { value: 'paused' }, scheduledStart: { value: 't' } }, o));
    mismatch(() => matchMergeExpect({ status: { value: 'dns' } }, o));
    // a prefixed key still addresses that Attempt
    passes(() => matchMergeExpect({ [`${A}.status`]: { value: 'dns' } }, o));
  });

  it('scope of a field (§1): the Phase is context.phase where present, else the phase of context.attemptId', () => {
    const v = { id: 'x', invariant: 'x', description: '', scope: 'phase', context: { attemptId: 'K1M_BR1_6:9', phase: 'OTHER_PHASE' }, given: [] as unknown[], expect: { status: { value: 'official' } } } as Vector;
    const official = { status: { state: 'known', value: 'official' } };
    passes(() => runVector(v, scriptedPort({ phases: { OTHER_PHASE: official } })));
    mismatch(() => runVector({ ...v, context: { attemptId: 'K1M_BR1_6:9' } }, scriptedPort({ phases: { OTHER_PHASE: official } })));
    passes(() => runVector({ ...v, context: { attemptId: 'K1M_BR1_6:9' } }, scriptedPort({ phases: { K1M_BR1_6: official } })));
  });

  it('scope of a field (§1): scope entry reads Entry-only names from the Entry and moves nothing else (vector inv2-rule3-single-source-field)', () => {
    const o = obs({ entry: { ageCategoryId: { state: 'known', value: 'DM' }, members: [{ externalId: { state: 'unavailable', reason: 'not-applicable' } }] }, presented: { [A]: { courseOrder: { state: 'known', value: 1 }, status: { state: 'known', value: 'on-course' } } } }, [], A, 'entry');
    passes(() => matchMergeExpect({ ageCategoryId: { value: 'DM' }, 'members[0].externalId': { state: 'unavailable', reason: 'not-applicable' }, courseOrder: { value: 1 }, status: { value: 'on-course' } }, o));
    mismatch(() => matchMergeExpect({ courseOrder: { value: 2 } }, o));
  });

  it('scope of a field (§1): a path resolves by its first segment, status and scheduledStart by scope', () => {
    expect(resolveResource('members[0].externalId')).toBe('entry');
    expect(resolveResource('status')).toBe('attempt');
    expect(resolveResource('status', 'phase')).toBe('phase');
    expect(resolveResource('status', 'entry')).toBe('attempt');
    expect(resolveResource('status', 'attempt')).toBe('attempt');
    expect(resolveResource('title')).toBe('phase');
    expect(resolveResource('outcome', 'phase')).toBe('attempt');
  });

  it('scope of a field (§1): an observation tells the port its resource; an observation scope overrides the vector scope', () => {
    const rec = newRecorder();
    const el = (seq: number, field: string, extra: Record<string, unknown> = {}) => ({ ingestSeq: seq, field, source: 'tcp', kind: 'result-row', observedAt: `t${seq}`, value: 1, confidence: 'authoritative', ...extra });
    const v = { id: 'x', invariant: 'x', description: '', scope: 'phase', context: { attemptId: A }, given: [el(1, 'status'), el(2, 'status', { scope: 'attempt' }), el(3, 'outcome'), el(4, 'displayName')], expect: {} } as Vector;
    runVector(v, scriptedPort({}, rec));
    const tagged = rec.units.flat() as unknown as Array<{ resource: string; phaseId?: string }>;
    expect(tagged.map((e) => e.resource)).toEqual(['phase', 'attempt', 'attempt', 'entry']);
    expect(tagged[0]!.phaseId).toBe('K1M_BR1_6');
  });

  it('scope of a field (§1): a key that resolves to nothing fails loudly, a vector never passes by being unread', () => {
    expect(() => matchMergeExpect({ nonsense: {} }, obs({}))).toThrow(/unresolved/);
    expect(() => matchMergeExpect({ standing: {} }, obs({}))).toThrow(/unresolved/);
    expect(() => matchMergeExpect({ [`${A}.displayName`]: {} }, obs({}))).toThrow(/unresolved/);
    const v = { id: 'x', invariant: 'x', description: '', context: { attemptId: A }, given: [{ ingestSeq: 1, field: 'mystery', source: 'tcp', kind: 'inference', observedAt: 't', value: 1, confidence: 'authoritative' }], expect: {} } as Vector;
    expect(() => runVector(v, scriptedPort({}))).toThrow(/unresolved/);
  });

  it('scope of a field (§1): every observation field and expect key in the 87 server vectors resolves', () => {
    const unresolved: string[] = [];
    const check = (id: string, name: string, scope: unknown) => { try { resolveResource(name, scope); } catch { unresolved.push(`${id}: ${name}`); } };
    for (const v of serverVectors().filter((x) => Array.isArray(x.given))) {
      for (const e of [...(v.given as GivenElement[]), ...((v.then ?? []) as GivenElement[])]) if ('field' in e) check(v.id, e.field as string, typeof e.scope === 'string' ? e.scope : v.scope);
      for (const ex of [v.expect, ...(v.expectSequence ?? []).map((s) => s.expect)]) {
        for (const k of Object.keys(ex)) {
          if (SECTION_KEYS.has(k)) continue;
          const m = /^[^.:\s]+:[^.\s]+\.(.+)$/.exec(k);
          check(v.id, m ? m[1]! : k, v.scope);
        }
      }
    }
    expect(unresolved).toEqual([]);
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

describe('closed keys and indices (review O2, O3)', () => {
  const el = (seq: number, at = `t${seq}`) => ({ ingestSeq: seq, field: 'outcome', source: 'tcp', kind: 'inference', observedAt: at, value: 1, confidence: 'authoritative' });
  const merge = (over: Record<string, unknown>): Vector => ({ id: 'x', invariant: 'x', description: '', context: { attemptId: A }, given: [el(1), el(2)], expect: {}, ...over }) as Vector;
  const refuses = (v: Vector, re: RegExp) => expect(() => runVector(v, scriptedPort({ presented: { [A]: { outcome: {} } } }))).toThrow(re);

  it('§1 R4b: a notifications afterGivenIndex out of range is refused, in expect and in a step', () => {
    refuses(merge({ expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: 99 } } } }), /out of range/);
    refuses(merge({ expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: -2 } } } }), /out of range/);
    refuses(merge({ expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: 2 } } } }), /out of range/);
    refuses(merge({ expectSequence: [{ afterGivenIndex: 0, expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: 99 } } } }] }), /out of range/);
  });

  it('§1 "Ingest units": a notifications afterGivenIndex inside a unit is refused; on a boundary or -1 it is accepted', () => {
    const same = { given: [el(1, 'same'), el(2, 'same'), el(3, 'later')] };
    refuses(merge({ ...same, expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: 0 } } } }), /inside an ingest unit/);
    passes(() => runVector(merge({ ...same, expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: 1 } } } }), scriptedPort({})));
    passes(() => runVector(merge({ ...same, expect: { notifications: { 'attempt.updated': { count: 0, afterGivenIndex: -1 } } } }), scriptedPort({})));
  });

  it('§1 "Every assertion of a vector is in expect, expectSequence or then": unknown vector keys are refused (a typo, expectSequense)', () => {
    refuses(merge({ expectSequense: [] }), /unknown key 'expectSequense'/);
    refuses(merge({ expectation: {} }), /unknown key/);
  });

  it('§1: a standing vector with expectSequence or then is refused, not ignored', () => {
    const s = { id: 's', invariant: 'x', description: '', scope: { kind: 'phase', phaseId: 'P' }, given: { entries: [] }, expect: { standing: [] } };
    passes(() => runVector(s as unknown as Vector, scriptedPort({})));
    refuses({ ...s, expectSequence: [{ afterGivenIndex: -1, expect: { standing: [{ entryId: 'nope' }] } }] } as unknown as Vector, /unknown key 'expectSequence'/);
    refuses({ ...s, then: [{}] } as unknown as Vector, /unknown key 'then'/);
    refuses({ ...s, given: { entries: [], extra: 1 } } as unknown as Vector, /unknown key 'extra'/);
  });

  it('§1: a workflow then element holds only presented; expect or checks in it is refused', () => {
    const w = { id: 'w', invariant: 'x', description: '', given: { checks: [], flags: [], presented: {} }, then: [{ presented: {} }], expect: { gateStatus: {} } };
    passes(() => runVector(w as unknown as Vector, scriptedPort({})));
    refuses({ ...w, then: [{ presented: {}, expect: { gateStatus: { 'a:1:1': 'stale' } } }] } as unknown as Vector, /unknown key 'expect'/);
    refuses({ ...w, then: [{ presented: {}, checks: [] }] } as unknown as Vector, /unknown key 'checks'/);
    refuses({ ...w, given: { checks: [], flags: [], presented: {}, expect: {} } } as unknown as Vector, /unknown key 'expect'/);
  });

  it('§1: a step holds only afterGivenIndex and expect; a merge then element holds no expect', () => {
    refuses(merge({ expectSequence: [{ afterGivenIndex: -1, expect: {}, extra: 1 }] }), /unknown key 'extra'/);
    refuses(merge({ then: [{ ...el(3), expect: { outcome: { state: 'known' } } }] }), /carries 'expect'/);
    refuses(merge({ given: [{ ...el(1), notifications: { 'attempt.updated': 5 } }] }), /carries 'notifications'/);
  });

  it('review: members[0].externalId is read by path from the Entry, and an absent step fails', () => {
    const entry = { members: [{ externalId: { state: 'unavailable', reason: 'not-applicable' } }] };
    expect(readPath(entry, 'members[0].externalId')).toEqual({ found: true, value: { state: 'unavailable', reason: 'not-applicable' } });
    expect(readPath(entry, 'members[1].externalId').found).toBe(false);
    expect(readPath({ 'members[0].externalId': 1 }, 'members[0].externalId').found).toBe(false); // no synthetic flat key
    expect(resolveResource('format')).toBe('phase');
  });
});

describe('matching rules of round 16 (CONFORMANCE-VECTORS §1 "expect", "Workflow-state", "Ingest units")', () => {
  const stale = { state: 'not-yet', value: { kind: 'duration', totalSeconds: 85 } }; // a retraction that flipped state and kept the value
  const present = (envelope: unknown) => obs({ presented: { [A]: { outcome: envelope } } });

  it('round 16 closed variants: a flipped not-yet that keeps a stale value fails an expectation { state: not-yet }', () => {
    passes(() => matchMergeExpect({ outcome: { state: 'not-yet' } }, present({ state: 'not-yet' })));
    mismatch(() => matchMergeExpect({ outcome: { state: 'not-yet' } }, present(stale)));
  });

  it('round 16 closed variants: a stateless expectation is met only by a known envelope (vector rerun-retracts-run-scoped-fields shape)', () => {
    mismatch(() => matchMergeExpect({ outcome: { provisional: true } }, present({ ...stale, provisional: true })));
    mismatch(() => matchMergeExpect({ outcome: { provisional: true } }, present({ state: 'not-yet' })));
    mismatch(() => matchMergeExpect({ outcome: { provisional: true } }, present({ state: 'unavailable', reason: 'source-unreachable' })));
    mismatch(() => matchMergeExpect({ outcome: { provisional: true } }, present({ state: 'garbage', provisional: true }))); // O5: not only the two closed variants
    mismatch(() => matchMergeExpect({ outcome: { provisional: true } }, present({ provisional: true, state: undefined })));
    passes(() => matchMergeExpect({ outcome: { provisional: true } }, present({ state: 'known', value: {}, provisional: true })));
  });

  it('round 16 closed variants: an unavailable envelope carrying an extra key fails; reason is compared', () => {
    const want = { state: 'unavailable', reason: 'not-applicable' };
    passes(() => matchMergeExpect({ outcome: want }, present({ state: 'unavailable', reason: 'not-applicable' })));
    mismatch(() => matchMergeExpect({ outcome: want }, present({ state: 'unavailable', reason: 'not-applicable', value: 1 })));
    mismatch(() => matchMergeExpect({ outcome: want }, present({ state: 'unavailable', reason: 'source-unreachable' })));
    mismatch(() => matchMergeExpect({ outcome: want }, present({ state: 'not-yet' })));
  });

  it('round 16 closed variants: a known envelope still matches as a subset, and a stateless expectation reads a known one', () => {
    passes(() => matchMergeExpect({ outcome: { state: 'known' } }, present({ state: 'known', value: 1, source: 'tcp' })));
    mismatch(() => matchMergeExpect({ outcome: { state: 'not-yet' } }, present({ state: 'known', value: 1 })));
  });

  it('round 16 closed variants: the same rule applies to notification fields', () => {
    const log = (fields: unknown) => [msg(1, { type: 'attempt.updated', fields })];
    const n = { 'attempt.updated': { count: 1, fields: ['outcome'] } };
    passes(() => matchMergeExpect({ notifications: n, outcome: { state: 'not-yet' } }, obs({ presented: { [A]: { outcome: { state: 'not-yet' } } } }, log({ outcome: { state: 'not-yet' } }))));
    mismatch(() => matchMergeExpect({ notifications: n, outcome: { state: 'not-yet' } }, obs({ presented: { [A]: { outcome: { state: 'not-yet' } } } }, log({ outcome: stale }))));
  });

  it('round 16 partial value: subset inside a known value, but an Outcome expectation must state its kind', () => {
    const o = present({ state: 'known', value: { kind: 'duration', runSeconds: 80, penaltySeconds: 5, totalSeconds: 85 } });
    passes(() => matchMergeExpect({ outcome: { state: 'known', value: { kind: 'duration', totalSeconds: 85 } } }, o));
    expect(() => matchMergeExpect({ outcome: { state: 'known', value: { totalSeconds: 85 } } }, o)).toThrow(/state its kind/);
    mismatch(() => matchMergeExpect({ outcome: { state: 'known', value: { kind: 'no-result', totalSeconds: 85 } } }, o));
    passes(() => matchMergeExpect({ outcome: { state: 'known' } }, o)); // no value stated: outside the obligation
  });

  const wf = (presented: unknown, expectGate: Record<string, string>): Vector => ({ id: 'w', invariant: 'x', description: '', given: { checks: [], flags: [], presented }, expect: { gateStatus: expectGate } }) as unknown as Vector;
  const status = (map: Record<string, string>) => scriptedPort({}, undefined, { gateStatus: () => ({ gateStatus: map }) });
  const presented = { 'P:1': { run: 1, gates: [{ number: 4, penalty: 2 }, { number: 5, penalty: 0 }] } };

  it('round 16 gateStatus: a spurious status on a presented gate the vector does not list fails (unlisted = plain)', () => {
    const v = wf(presented, { 'P:1:1:4': 'verified' });
    passes(() => runVector(v, status({ 'P:1:1:4': 'verified', 'P:1:1:5': 'plain' })));
    mismatch(() => runVector(v, status({ 'P:1:1:4': 'verified', 'P:1:1:5': 'stale' })));
    mismatch(() => runVector(v, status({ 'P:1:1:4': 'verified' }))); // the port states nothing for a presented gate
  });

  it('round 16 gateStatus: a listed key outside the presented domain is asserted as listed, an unlisted one is not', () => {
    const v = wf(presented, { 'P:1:1:4': 'verified', 'P:1:1:5': 'plain', 'P:1:1:9': 'stale' });
    passes(() => runVector(v, status({ 'P:1:1:4': 'verified', 'P:1:1:5': 'plain', 'P:1:1:9': 'stale', 'Q:1:1:1': 'stale' })));
    mismatch(() => runVector(v, status({ 'P:1:1:4': 'verified', 'P:1:1:5': 'plain', 'P:1:1:9': 'plain' })));
  });

  it('round 16 gateStatus: the domain uses the presented run and, after then, the new presented', () => {
    const v = { ...wf(presented, { 'P:1:2:4': 'plain' }), given: { checks: [], flags: [], presented: { 'P:1': { run: 2, gates: [{ number: 4, penalty: 2 }] } } } } as unknown as Vector;
    passes(() => runVector(v, status({ 'P:1:2:4': 'plain' })));
    const w = { ...wf(presented, { 'P:1:1:4': 'stale', 'P:1:1:5': 'plain' }), then: [{ presented: { 'P:1': { run: 1, gates: [{ number: 4, penalty: 50 }, { number: 5, penalty: 0 }] } } }] } as unknown as Vector;
    passes(() => runVector(w, status({ 'P:1:1:4': 'stale', 'P:1:1:5': 'plain' })));
    // a gate that exists only in the new presented is in the domain: unlisted, so asserted plain (O6)
    const x = { ...w, then: [{ presented: { 'P:1': { run: 1, gates: [{ number: 4, penalty: 50 }, { number: 5, penalty: 0 }, { number: 6, penalty: 2 }] } } }] } as unknown as Vector;
    passes(() => runVector(x, status({ 'P:1:1:4': 'stale', 'P:1:1:5': 'plain', 'P:1:1:6': 'plain' })));
    mismatch(() => runVector(x, status({ 'P:1:1:4': 'stale', 'P:1:1:5': 'plain', 'P:1:1:6': 'stale' })));
  });

  const obsv = (seq: number, source: string | undefined, at: string): GivenElement =>
    ({ ingestSeq: seq, field: 'members[0].externalId', ...(source ? { source } : {}), observedAt: at, state: 'unavailable', reason: 'not-applicable' }) as GivenElement;

  it('round 16 unit edges: a source-less pair makes two units, even at one observedAt', () => {
    expect(groupUnits([obsv(1, undefined, 't'), obsv(2, undefined, 't')]).map((u) => u.elements.length)).toEqual([1, 1]);
    expect(groupUnits([obsv(1, 'xml', 't'), obsv(2, undefined, 't'), obsv(3, 'xml', 't')]).map((u) => u.elements.length)).toEqual([1, 1, 1]);
  });

  it('round 16 unit edges: the given/then seam is always a boundary, even for equal source and observedAt', () => {
    const rec = newRecorder();
    const e = (seq: number) => ({ ingestSeq: seq, field: 'outcome', source: 'tcp', kind: 'inference', observedAt: 'same', value: 1, confidence: 'authoritative' });
    const v = { id: 'x', invariant: 'x', description: '', context: { attemptId: A }, given: [e(1)], then: [e(2)], expect: {} } as Vector;
    runVector(v, scriptedPort({}, rec));
    expect(rec.units.map((u) => u.length)).toEqual([1, 1]);
  });
});
