import { describe, it, expect } from 'vitest';
import { at, attemptMessages, field, kit } from './kit.js';

// #259: the eight rules the merge core's review (#257) found unpinned by mutation, one test each. A mutant is named by the review's number;
// the rule is the contract sentence in each test name. Hand streams in the element shape of the vectors (kit.ts); expected values come from
// the contract, never from the core. The review checked the behaviour under each correct by hand.

const A = 'K1M_BR1_6:9';
const P = 'K1M_BR1_6';
const duration = (runSeconds: number, penaltySeconds = 0) => ({ kind: 'duration', runSeconds, penaltySeconds, totalSeconds: runSeconds + penaltySeconds });
const S1 = '2026-09-15T10:00:00.000Z';
const S2 = '2026-09-15T10:30:00.000Z';

describe('#259 M31: INV-2 rule 2 exception is guarded by content age (CONTRACTS §4 INV-2c "null fails ... rule 2\'s mark exception"; INV-7 guard)', () => {
  it('an xml mark whose content is older than, or unknown against, the tcp observation it would displace is refused: left-without-finish stands; a later content presents the mark', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.obs('status', 'tcp', 'inference', at(40), 'left-without-finish')]);
    c.applyUnit(k.xml(at(70), at(30), { status: 'dns' })); // older
    expect(field(c, A, 'status')).toMatchObject({ value: 'left-without-finish', source: 'tcp' });
    c.applyUnit(k.xml(at(75), null, { status: 'dns' })); // unknown: null fails every content-age comparison
    expect(field(c, A, 'status')).toMatchObject({ value: 'left-without-finish', source: 'tcp' });
    c.applyUnit(k.xml(at(100), at(90), { status: 'dns' }));
    expect(field(c, A, 'status')).toMatchObject({ value: 'dns', source: 'xml' });
  });
});

describe('#259 M33: a retained tcp row describes the replaced run unless its Time equals the finish\'s (CONTRACTS §2.6; DERIVATIONS §4.11 "Attribution per source"; ADR-017 D1)', () => {
  it('run 2 begun, the old run\'s row re-sent (Time 90) before the finish, the finish listed with Time 85.5 and no new row: the old row is never presented, the outcome is run 2\'s 85.5', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(0), S1));
    c.applyUnit([k.snap('tcp', at(100), { outcome: duration(90), placement: { rank: 1, order: 1 }, judgingComplete: true })]);
    c.applyUnit(k.listing(at(100.1), S1, '2026-09-15T10:01:30.000Z', { runSeconds: 90 }));
    c.applyUnit(k.listing(at(1800), S2)); // a different start, no finish, the generation recorded: run 2
    expect(field(c, A, 'run')).toMatchObject({ value: 2 });
    c.applyUnit([k.snap('tcp', at(1850), { outcome: duration(90), placement: { rank: 1, order: 1 }, judgingComplete: true })]); // the rotation re-sends run 1's row
    c.applyUnit(k.listing(at(1886), S2, '2026-09-15T10:31:25.500Z', { runSeconds: 85.5 }));
    expect(field(c, A, 'outcome')).toMatchObject({ state: 'known', value: { kind: 'duration', runSeconds: 85.5 } });
    expect(field(c, A, 'placement')).toEqual({ state: 'not-yet' });
  });
});

describe('#259 M3: a row records the generation only if it stated something the table did not already hold (DERIVATIONS §4.11 "Recorded")', () => {
  it('a time held before the first start, re-sent unchanged by a rotation after it: nothing recorded, the later changed start with no finish is a correction, run stays 1', () => {
    const k = kit(A, P);
    const c = k.core();
    const row = (t: number) => k.snap('tcp', at(t), { outcome: duration(90), placement: { rank: 1, order: 1 }, judgingComplete: true });
    c.applyUnit([row(-60)]); // the table holds Time 90 before any start is known
    c.applyUnit(k.listing(at(0), S1, '2026-09-15T10:01:30.000Z', { runSeconds: 90 })); // the first start, with its finish: no change of this section's
    c.applyUnit([row(100)]); // a rotation: the same Time, nothing the table did not hold
    c.applyUnit(k.listing(at(1800), S2));
    expect(field(c, A, 'run')).toMatchObject({ value: 1 });
  });
});

describe('#259 M24: a start correction makes the corrected start the recorded one (CONTRACTS §2.6; DERIVATIONS §4.11 "the recorded start becomes the listing\'s")', () => {
  it('start S1 listed, corrected to S1b, a row recorded, the athlete listed at S1b again with no finish: it is the recorded start, no re-run (run 1)', () => {
    const k = kit(A, P);
    const c = k.core();
    const S1B = '2026-09-15T09:59:20.000Z';
    c.applyUnit(k.listing(at(0), S1));
    c.applyUnit(k.listing(at(10), S1B)); // moved 40 s earlier mid-run, no finish: a correction
    expect(field(c, A, 'run')).toMatchObject({ value: 1 });
    c.applyUnit([k.snap('tcp', at(100), { outcome: duration(90), placement: { rank: 1, order: 1 }, judgingComplete: true })]); // records the generation
    c.applyUnit(k.listing(at(110), S1B));
    expect(field(c, A, 'run')).toMatchObject({ value: 1 });
  });
});

describe('#259 M14: a re-delivery gives tcp continuity since its own ingestion (CONTRACTS §4 INV-5, rule 2)', () => {
  it('tcp row, outage and reconnect, the same row re-sent, then a newer xml with another value while connected: the tcp value stands (tcp wins while connected since ITS ingestion)', () => {
    const k = kit(A, P);
    const c = k.core();
    const row = (t: number) => k.snap('tcp', at(t), { outcome: duration(82.36, 2), judgingComplete: true });
    c.applyUnit([row(10)]);
    c.applyUnit([k.event('tcp-disconnected', at(20))]);
    c.applyUnit([k.event('tcp-connected', at(30))]);
    c.applyUnit([row(40)]);
    c.applyUnit(k.xml(at(50), at(45), { outcome: duration(82.36, 52), judgingComplete: true }));
    expect(field(c, A, 'outcome')).toMatchObject({ source: 'tcp', value: { totalSeconds: 84.36 } });
  });
});

describe('#259 M16: a re-delivery with an unknown content age keeps the retained one (CONTRACTS §4 INV-5 "kept where the re-delivery\'s is null")', () => {
  it('xml content 150 refused while tcp (100) is connected; tcp drops; the file re-read with changedAfter null restates it: the kept age 150 postdates tcp\'s 100, so the xml value is presented', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit([k.snap('tcp', at(100), { outcome: duration(82.36, 2), judgingComplete: true })]);
    c.applyUnit(k.xml(at(155), at(150), { outcome: duration(82.36, 52), judgingComplete: true }));
    expect(field(c, A, 'outcome')).toMatchObject({ source: 'tcp' });
    c.applyUnit([k.event('tcp-disconnected', at(160))]);
    c.applyUnit(k.xml(at(200), null, { outcome: duration(82.36, 52), judgingComplete: true }));
    expect(field(c, A, 'outcome')).toMatchObject({ source: 'xml', value: { totalSeconds: 134.36 } });
  });
});

describe('#259 M17 and M30: a re-delivery keeps its place in the order and is a no-op across the gates cell merge (CONTRACTS §4 INV-5; P9; DERIVATIONS round 19 item 4 "keeps at")', () => {
  const merged = () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(k.listing(at(0), S1)); // on the on-course list: the cell merge applies
    const row = (t: number) => k.obs('gates', 'tcp', 'result-row', at(t), [{ number: 3, penalty: 2 }, { number: 4, penalty: 0 }], { judgingComplete: false });
    c.applyUnit([row(10)]);
    c.applyUnit([k.obs('gates', 'tcp', 'inference', at(20), [{ number: 3, penalty: 0 }, { number: 4, penalty: null }], { confidence: 'inferred' })]);
    return { k, c, row };
  };
  const cell3 = (c: ReturnType<typeof merged>['c']) => (field(c, A, 'gates').value as Array<{ number: number; penalty: number | null }>).find((g) => g.number === 3)?.penalty;

  it('M17: the stream judged gate 3 clean after the row said 2; a rotation re-sending the identical row does not make the row newer: gate 3 stays 0 and nothing is sent', () => {
    const { c, row } = merged();
    expect(cell3(c)).toBe(0);
    const from = c.notifications().length;
    c.applyUnit([row(30)]);
    expect(cell3(c)).toBe(0);
    expect(attemptMessages(c, from, A)).toEqual([]);
  });

  it('M30: the same rotation twice, the second after another stream tick: the newer stream cell is never out-ranked by the order a re-delivery is renewed to', () => {
    const { k, c, row } = merged();
    c.applyUnit([row(30)]);
    c.applyUnit([k.obs('gates', 'tcp', 'inference', at(40), [{ number: 3, penalty: 0 }, { number: 4, penalty: 0 }], { confidence: 'inferred' })]);
    c.applyUnit([row(50)]);
    expect(cell3(c)).toBe(0);
    const g = field(c, A, 'gates').value as Array<{ number: number; penalty: number | null }>;
    expect(g.find((x) => x.number === 4)?.penalty).toBe(0); // the stream's later judgement of gate 4 stands against the row's own 0
  });
});
