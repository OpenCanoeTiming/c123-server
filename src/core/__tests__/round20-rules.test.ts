import { describe, it, expect } from 'vitest';
import { at, attemptMessages, diagnosticKinds, field, kit } from './kit.js';

// Round 20 (#204; #258 O1-O8, #260 contract questions) code items of docs "design-round20" "What changes in code", one behaviour change each.
// Hand streams in the element shape of the conformance vectors (kit.ts); expected values come from the contract sentence named in each test
// name, never from the core. Real-data cases of the same items are in real-excerpts.test.ts.

const A = 'K1M_BR1_6:9';
const P = 'K1M_BR1_6';
const duration = (runSeconds: number, penaltySeconds = 0) => ({ kind: 'duration', runSeconds, penaltySeconds, totalSeconds: runSeconds + penaltySeconds });

describe('code item 4 (O1, CQ1): no-result is the presentation of the presented status, never a field of the row (CONTRACTS §2.6, §4 rule 2; DERIVATIONS §4.1; P12)', () => {
  it('a mark refused by rule 2\'s guard shows nowhere, a time on its row with it: status stays left-without-finish, outcome stays pending (contract question 1; vector inv2-rule2-refused-xml-mark-shows-no-outcome)', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.obs('status', 'tcp', 'inference', at(40), 'left-without-finish')]);
    c.applyUnit(k.xml(at(70), at(30), { status: 'dnf', outcome: duration(90) })); // content 30 s is older than the tcp observation at 40 s
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'left-without-finish', source: 'tcp' });
    expect(field(c, A, 'outcome')).toEqual({ state: 'not-yet' });
  });

  it('once the content postdates the tcp observation the mark and its no-result outcome are presented together, from xml (vector inv2-rule2-refused-xml-mark-shows-no-outcome, then step)', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.obs('status', 'tcp', 'inference', at(40), 'left-without-finish')]);
    c.applyUnit(k.xml(at(70), at(30), { status: 'dnf', outcome: duration(90) }));
    c.applyUnit(k.xml(at(100), at(80), { status: 'dnf', outcome: duration(90) }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dnf', source: 'xml' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'no-result', status: 'dnf' }, source: 'xml' });
  });

  it('P12 biconditional, the reverse direction (#258 O1): tcp deleted the row, a newer xml dns: status dns and outcome no-result dns, never status dns with outcome not-yet', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(10), { outcome: duration(90), placement: { rank: 3, order: 3 }, judgingComplete: true })]);
    c.applyUnit([k.snap('tcp', at(20), {}, 'start-list')]); // the row is gone: a retraction, status back to not-started
    c.applyUnit(k.xml(at(40), at(30), { status: 'dns' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dns', source: 'xml' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'no-result', status: 'dns' } });
  });

  it('non-ranked is a finished run: status non-ranked beside the row\'s own duration, never a no-result outcome (CONTRACTS §2.6 `Outcome` no-result set excludes it)', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(10), { status: 'non-ranked', outcome: duration(90), judgingComplete: true })]);
    expect(field(c, A, 'status')).toMatchObject({ value: 'non-ranked' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 90 } });
  });

  it('a mark row that is presented keeps the row\'s time in the slot and presents no-result over it while the mark shows (DERIVATIONS §4.1 "whatever time it carries")', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(10), { status: 'dnf', outcome: duration(48.64), judgingComplete: true })]);
    expect(field(c, A, 'status')).toMatchObject({ value: 'dnf' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'no-result', status: 'dnf' } });
  });
});

describe('code item 5 (CQ9; B4): the exception\'s marks are Outcome\'s no-result set minus non-ranked, and closure uses the same set (CONTRACTS §4 rule 2, §3.2; DERIVATIONS §4.4)', () => {
  const lwf = (k: ReturnType<typeof kit>, c: ReturnType<ReturnType<typeof kit>['core']>): void => c.applyUnit([k.obs('status', 'tcp', 'inference', at(40), 'left-without-finish')]);

  it('an xml non-ranked does not supersede a tcp left-without-finish (a finished run typed in the grid and pushed; left-without-finish -> non-ranked is no transition)', () => {
    const k = kit(A, P);
    const c = k.core();
    lwf(k, c);
    c.applyUnit(k.xml(at(110), at(100), { status: 'non-ranked', outcome: duration(90) }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'left-without-finish', source: 'tcp' });
  });

  it('an xml ral supersedes a tcp left-without-finish (CONTRACTS §3.2 gains `ral` out of left-without-finish)', () => {
    const k = kit(A, P);
    const c = k.core();
    lwf(k, c);
    c.applyUnit(k.xml(at(110), at(100), { status: 'ral' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'ral', source: 'xml' });
  });

  const withBlankCell = (status: string) => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(10), { status, outcome: duration(90, 2), gates: [{ number: 3, penalty: null }, { number: 4, penalty: 2 }], judgingComplete: false })]);
    return c;
  };

  it('non-ranked closes nothing: its blank cell is judged like any finisher\'s, so gates and outcome stay provisional (DERIVATIONS §4.4, B4)', () => {
    const c = withBlankCell('non-ranked');
    expect(field(c, A, 'gates')).toMatchObject({ state: 'known', provisional: true });
    expect(field(c, A, 'outcome')).toMatchObject({ provisional: true });
  });

  it('control: a dnf mark closes the run, so the same blank cell is no longer provisional (DERIVATIONS §4.4 "a mark")', () => {
    const c = withBlankCell('dnf');
    expect(field(c, A, 'gates')).toMatchObject({ state: 'known', provisional: false });
  });
});

describe('code item 6 (CQ3, B1a, B1b, N2): guards compare content age; a listing delivers the stream\'s status; INV-2b is decided at a re-delivery and cleared only by a value change (CONTRACTS §4 INV-2b, INV-2c, INV-5)', () => {
  it('B1a: a listing is a delivery of status: staged at 100 and again at 200, an xml dns whose content is 150 is refused (older than the latest delivery), one at 250 is presented', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(100), null));
    c.applyUnit(k.listing(at(200), null));
    c.applyUnit(k.xml(at(205), at(150), { status: 'dns' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'at-start', source: 'tcp' });
    c.applyUnit(k.xml(at(255), at(250), { status: 'dns' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dns', source: 'xml' });
  });

  it('B1a control: with one listing at 100 an xml dns of content 150 is presented (the guard compares the latest delivery, not a later one that never happened)', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(100), null));
    c.applyUnit(k.xml(at(155), at(150), { status: 'dns' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dns', source: 'xml' });
  });

  const tcpRow = (k: ReturnType<typeof kit>, t: number) => k.snap('tcp', at(t), { outcome: duration(82.36, 2), judgingComplete: true });
  const xmlRow = (k: ReturnType<typeof kit>, t: number, changedAfter: number) => k.xml(at(t), at(changedAfter), { outcome: duration(82.36, 52), judgingComplete: true });

  it('N2: disagree runs at a re-delivery. An xml row older than the tcp one raises nothing; the file re-read at a later content age is the first step to meet the age condition and raises source-disagreement', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([tcpRow(k, 100)]);
    c.applyUnit(xmlRow(k, 110, 90));
    expect(diagnosticKinds(c)).not.toContain('source-disagreement');
    c.applyUnit(xmlRow(k, 160, 150)); // identical row, content age now later than the tcp observation's
    expect(diagnosticKinds(c)).toContain('source-disagreement');
    expect(field(c, A, 'outcome')).toMatchObject({ source: 'tcp', value: { penaltySeconds: 2 } }); // never adopted
  });

  it('B1b/N2: a re-delivery never clears: a rotation re-sending the identical tcp row leaves the standing source-disagreement', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([tcpRow(k, 100)]);
    c.applyUnit(xmlRow(k, 160, 150));
    expect(diagnosticKinds(c)).toContain('source-disagreement');
    c.applyUnit([tcpRow(k, 300)]);
    expect(diagnosticKinds(c)).toContain('source-disagreement');
  });

  it('a value change clears it: the xml row corrected to the tcp value (a later content age) leaves no source-disagreement', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([tcpRow(k, 100)]);
    c.applyUnit(xmlRow(k, 160, 150));
    c.applyUnit(k.xml(at(400), at(390), { outcome: duration(82.36, 2), judgingComplete: true }));
    expect(diagnosticKinds(c)).not.toContain('source-disagreement');
  });
});

describe('code item 8 (CQ5): a retraction is an observation of each field it retracts, displacing an operator slot (CONTRACTS §4 rule 4; #212)', () => {
  const withRow = (k: ReturnType<typeof kit>, c: ReturnType<ReturnType<typeof kit>['core']>) =>
    c.applyUnit([k.snap('tcp', at(0), { outcome: duration(82.36), gates: [{ number: 4, penalty: 0 }], judgingComplete: true })]);

  it('an assertion (provisional false) is displaced by a retraction: gates is not-yet, not the operator\'s value on a not-started Attempt', () => {
    const k = kit(A, P);
    const c = k.core();
    withRow(k, c);
    c.applyUnit([k.obs('gates', 'tcp', 'result-row', at(10), [{ number: 4, penalty: 2 }], { provisionalOverride: false, source: 'operator-write', kind: 'operator', run: 1 } as never)]);
    c.applyUnit([k.snap('tcp', at(100), {}, 'start-list')]);
    expect(field(c, A, 'gates')).toEqual({ state: 'not-yet' });
    expect(field(c, A, 'status')).toMatchObject({ value: 'not-started' });
  });

  it('a pending write of a retracted field resolves mismatched with no confirmedValue: upstream\'s table holds no result where one was requested', () => {
    const k = kit(A, P);
    const c = k.core();
    withRow(k, c);
    c.applyUnit([k.obs('gates', 'tcp', 'result-row', at(10), [{ number: 4, penalty: 2 }], { source: 'operator-write', kind: 'operator', run: 1 } as never)]);
    expect((c.writeRequest() as { status?: string }).status).toBe('pending');
    c.applyUnit([k.snap('tcp', at(100), {}, 'start-list')]);
    const w = c.writeRequest() as { status?: string; confirmedValue?: unknown };
    expect(w.status).toBe('mismatched');
    expect(w).not.toHaveProperty('confirmedValue');
    expect(field(c, A, 'gates')).toEqual({ state: 'not-yet' });
  });
});

describe('code item 9 (O2): a closure that flips provisional is pushed (CONTRACTS §1.6, §7.2 "a change of presented state is sent"; DERIVATIONS §4.4 `Completed = "Y"`)', () => {
  it('the finish is listed (Completed N), the row holds a blank cell (provisional true); a later listing with the same finish and Completed Y closes the run: provisional false is presented AND sent', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(0), '2026-09-15T09:58:37.640Z'));
    c.applyUnit(k.listing(at(82), '2026-09-15T09:58:37.640Z', '2026-09-15T10:00:00.000Z', { runSeconds: 82.36 }));
    c.applyUnit([k.snap('tcp', at(82.1), { outcome: duration(82.36, 2), gates: [{ number: 3, penalty: null }, { number: 4, penalty: 2 }], judgingComplete: false })]);
    expect(field(c, A, 'gates')).toMatchObject({ provisional: true });
    const from = c.notifications().length;
    // the closing listing: the same start and finish, Completed="Y" (the stream's `runClosed`, DERIVATIONS §4.4); nothing else about it differs
    c.applyUnit([...k.listing(at(103), '2026-09-15T09:58:37.640Z', '2026-09-15T10:00:00.000Z', { runSeconds: 82.36 }).map((e) => ({ ...e, ...('field' in e && e.field === 'outcome' ? { runClosed: true } : {}) }))]);
    expect(field(c, A, 'gates')).toMatchObject({ provisional: false });
    const sent = attemptMessages(c, from, A);
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.some((m) => (m.fields['gates'] as { provisional?: boolean } | undefined)?.provisional === false)).toBe(true);
  });
});

describe('code item 10 (O3): contradicted-finish.finishTime is the presented eventTime where the finish was observed in the XML (CONTRACTS §4 INV-2d)', () => {
  it('a tcp row presented with the xml row\'s finish time, then a listing with the start and no finish: the diagnostic records that finishTime, not null', () => {
    const k = kit(A, P);
    const c = k.core();
    const FINISH = '2026-09-15T10:01:30.000Z';
    c.applyUnit(k.listing(at(0), '2026-09-15T10:00:07.640Z'));
    c.applyUnit([k.snap('tcp', at(88), { outcome: duration(82.36, 0), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    c.applyUnit(k.xml(at(95), at(90), { outcome: duration(82.36, 0), placement: { rank: 1, order: 1 }, finishTime: FINISH, judgingComplete: true }));
    c.applyUnit(k.listing(at(120), '2026-09-15T10:00:07.640Z')); // on course again with the same start and no finish
    const d = (c.diagnostics() as Array<Record<string, unknown>>).find((x) => x['kind'] === 'contradicted-finish');
    expect(d).toMatchObject({ attemptId: A, runSeconds: 82.36, finishTime: FINISH });
  });
});

describe('code item 11 (O4): the stream\'s re-delivery regains precedence after an outage (CONTRACTS §4 INV-5, rule 2 "the on-course stream\'s inference is the tcp side")', () => {
  it('outage, an xml dnf presented, reconnect, the stream keeps listing on-course: status is on-course from tcp again, with the re-delivery\'s observedAt, and the change is pushed', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(10), '2026-09-15T09:59:55.000Z'));
    c.applyUnit([k.event('tcp-disconnected', at(20))]);
    c.applyUnit(k.xml(at(40), at(30), { status: 'dnf' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dnf', source: 'xml' });
    c.applyUnit([k.event('tcp-connected', at(50))]);
    const from = c.notifications().length;
    c.applyUnit(k.listing(at(60), '2026-09-15T09:59:55.000Z'));
    expect(field(c, A, 'status')).toMatchObject({ value: 'on-course', source: 'tcp', observedAt: at(60) });
    expect(attemptMessages(c, from, A).some((m) => 'status' in m.fields)).toBe(true);
  });
});

describe('code item 12 (O5): run\'s envelope is the triggering listing\'s (CONTRACTS §1.2 observedAt, source)', () => {
  it('the Attempt first seen from xml, raced, re-run: run 2 carries tcp and the observedAt of the listing with the new start, not the first observation\'s', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.xml(at(0), null, {})); // the first observation of the Attempt: an xml start-list row
    c.applyUnit(k.listing(at(10), '2026-09-15T10:00:10.000Z'));
    c.applyUnit([k.snap('tcp', at(100), { outcome: duration(90), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    c.applyUnit(k.listing(at(100.1), '2026-09-15T10:00:10.000Z', '2026-09-15T10:01:40.000Z', { runSeconds: 90 }));
    c.applyUnit(k.listing(at(300), '2026-09-15T10:04:00.000Z')); // a different start, no finish, the generation recorded: the one trigger
    expect(field(c, A, 'run')).toMatchObject({ state: 'known', value: 2, source: 'tcp', observedAt: at(300) });
  });
});

describe('code item 13 (O6): a finish presented from the XML alone is contradicted (CONTRACTS §4 INV-2d; CQ2: rule 1 is unguarded, this is the one safeguard)', () => {
  it('connected, the stream running, an xml row with a firm duration and rank 1 (a false leader); the next listing without a finish contradicts it: outcome back to running, placement not-yet, contradicted-finish raised', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(10), '2026-09-15T09:59:30.000Z'));
    c.applyUnit([k.obs('outcome', 'tcp', 'inference', at(11), { kind: 'running', elapsedSeconds: 41, penaltySeconds: 0 }, { provisional: true })]);
    c.applyUnit(k.xml(at(50), at(45), { outcome: duration(82.36), placement: { rank: 1, order: 1 }, finishTime: '2026-09-15T10:00:52.000Z', judgingComplete: true }));
    c.applyUnit(k.listing(at(51), '2026-09-15T09:59:30.000Z'));
    c.applyUnit([k.obs('outcome', 'tcp', 'inference', at(51), { kind: 'running', elapsedSeconds: 81, penaltySeconds: 0 }, { provisional: true })]);
    expect(field(c, A, 'placement')).toEqual({ state: 'not-yet' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'running' } });
    expect(diagnosticKinds(c)).toContain('contradicted-finish');
  });
});

describe('code item 14 (O8a, O8b): the recording of a generation (DERIVATIONS §4.11)', () => {
  const S1 = '2026-09-15T10:00:00.000Z';
  const S2 = '2026-09-15T10:30:00.000Z';

  it('O8a: a standing dns, then a row stating a new time on it, records the generation: a start later changed with no finish is a re-run (run 2)', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(-60), { status: 'dns' })]);
    c.applyUnit(k.listing(at(0), S1));
    c.applyUnit([k.snap('tcp', at(100), { status: 'dns', outcome: duration(90) })]); // stated something the table did not already hold: a time
    c.applyUnit(k.listing(at(1800), S2));
    expect(field(c, A, 'run')).toMatchObject({ value: 2 });
  });

  it('O8a control: the standing dns re-sent unchanged (a rotation) records nothing, the changed start is a correction: run stays 1', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(-60), { status: 'dns' })]);
    c.applyUnit(k.listing(at(0), S1));
    c.applyUnit([k.snap('tcp', at(100), { status: 'dns' })]);
    c.applyUnit(k.listing(at(1800), S2));
    expect(field(c, A, 'run')).toMatchObject({ value: 1 });
  });
});

describe('code items 2, 3, 15 (CQ10, #258 cold start): the carry begins at the Attempt\'s first listing in run 2, and an unbound course makes a judged field provisional (CONTRACTS §1.2, §3.2; P11)', () => {
  const A2 = 'K1M_BR2_19:9';
  const P2 = 'K1M_BR2_19';
  const carriedRow = { placement: { rank: 3, order: 3 }, pairTotal: 82.36, timeEmpty: true, judgingComplete: true };

  it('a staged listing with no start is the first listing in run 2: the placement and pairTotal carried from run 1 are provisional there (false -> true at that listing, not only at the start)', () => {
    const k = kit(A2, P2);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(0), carriedRow)]);
    expect(field(c, A2, 'placement')).toMatchObject({ state: 'known', provisional: false });
    c.applyUnit(k.listing(at(600), null));
    expect(field(c, A2, 'status')).toMatchObject({ value: 'at-start' });
    expect(field(c, A2, 'placement')).toMatchObject({ value: { rank: 3 }, provisional: true });
    expect(field(c, A2, 'pairTotal')).toMatchObject({ value: 82.36, provisional: true });
  });

  it('cold start: the listing first, then the run-2 row with no time and no mark: the row restates run 1\'s values and leaves them carried, provisional (its judgingComplete stamp true is not the test)', () => {
    const k = kit(A2, P2);
    const c = k.core();
    c.applyUnit(k.listing(at(0), null));
    c.applyUnit([k.snap('tcp', at(60), carriedRow)]);
    expect(field(c, A2, 'placement')).toMatchObject({ state: 'known', value: { rank: 3 }, provisional: true });
    expect(field(c, A2, 'pairTotal')).toMatchObject({ state: 'known', value: 82.36, provisional: true });
  });

  it('a run-2 row carrying its time restates the field: no longer carried, provisional by judging alone (CONTRACTS §1.2 "until a row of run 2 ... restates that field")', () => {
    const k = kit(A2, P2);
    const c = k.core();
    c.applyUnit(k.listing(at(0), null));
    c.applyUnit(k.listing(at(10), '2026-09-15T09:59:59.000Z'));
    c.applyUnit([k.snap('tcp', at(100), { outcome: duration(80), placement: { rank: 2, order: 2 }, pairTotal: 162.36, judgingComplete: true })]);
    expect(field(c, A2, 'placement')).toMatchObject({ value: { rank: 2 }, provisional: false });
  });

  it('a first-run row with a time and no course bound (no gates known): the outcome cannot be judged complete, so it is provisional until the run is closed', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(10), { outcome: duration(82.36, 2), judgingComplete: null })]);
    expect(field(c, A, 'gates')).not.toMatchObject({ state: 'known' });
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', provisional: true });
  });
});
