import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { createContextTracker } from '../context-tracker.js';
import { ctx, obsOf, withAttr, OBSERVED_AT, type El } from './helpers.js';

/**
 * #287 (M2 P3b): sibling pairing by `classId` and `format`, never by the RaceId (CONTRACTS §2.4 "Pairing", DERIVATIONS §2.1 and its example,
 * DERIVATIONS §10 item 48; maintainer decision 2026-11-11; design-authority record item 17).
 *
 * Channel: the XML snapshot (`Schedule.ClassId`, `DisId`, `StartTime`); on TCP the class comes from what the context tracker (`createContextTracker`,
 * as the recording drivers and the on-site server use it) has learned from earlier snapshots and messages.
 * ITEM 49 (a) (DERIVATIONS §10): a parser states a first run's `pair` with `siblingPhaseId: null`, always; the core derives the first run's sibling. So every first-run
 * expectation here is `null`, and the first-run pairing is asserted one tier up, in `src/core/__tests__/pairing-pipeline-287.test.ts` (parser, tracker, core).
 * Every test builds its own snapshot; nothing is shared. A precondition assert in each test keeps it from passing vacuously.
 *
 */

type Row = { id: string; cls: string; dis: string; day: string };
const sched = (r: Row): string =>
  `<Schedule><RaceId>${r.id}</RaceId><RaceOrder>1</RaceOrder><StartTime>${r.day}T09:00:00+02:00</StartTime><ClassId>${r.cls}</ClassId><DisId>${r.dis}</DisId><CourseNr>1</CourseNr><RaceStatus>0</RaceStatus></Schedule>`;
const xmlOf = (rows: Row[]): string =>
  `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${rows.map(sched).join('')}</Canoe123Data>`;
const parse = (rows: Row[]): El[] => parseXmlSnapshot(xmlOf(rows), ctx({ phaseDates: {} })) as El[];

const pairOf = (els: El[], id: string): El | null => (obsOf(els as never, 'pair', { phaseId: id })?.value as El | null | undefined) ?? null;
/** The stated sibling; asserts the Phase's `pair` was stated at all (a paired token), so `null` is a stated null and never an absent element. */
const sibOf = (els: El[], id: string): string | null => {
  const p = pairOf(els, id);
  expect(p, `pair stated for ${id}`).not.toBeNull();
  return (p as El).siblingPhaseId ?? null;
};
const valueOf = (els: El[], field: string, id: string): unknown => obsOf(els as never, field, { phaseId: id })?.value;
/** The old rule's notion of "same class": the RaceId up to the format token. Used only in preconditions. */
const prefixOf = (id: string): string => id.replace(/_[A-Z0-9]+_\d+(_[A-Z]+)?$/, '');

describe('#287 pairing by classId and format (XML snapshot: Schedule.ClassId, DisId, StartTime)', () => {
  it('row 1, CONTRACTS §2.4 Pairing example, DERIVATIONS §2.1: K1M_ST_BR1_6 + K1M_ST_BR2_6, both ClassId K1M_ST, the second run names the first, the first run states null (item 49 a)', () => {
    const els = parse([
      { id: 'K1M_ST_BR1_6', cls: 'K1M_ST', dis: 'BR1', day: '2026-09-06' },
      { id: 'K1M_ST_BR2_6', cls: 'K1M_ST', dis: 'BR2', day: '2026-09-06' },
    ]);
    expect(valueOf(els, 'classId', 'K1M_ST_BR2_6')).toBe('K1M_ST');
    expect(valueOf(els, 'format', 'K1M_ST_BR1_6')).toBe('BR1');
    expect(sibOf(els, 'K1M_ST_BR2_6')).toBe('K1M_ST_BR1_6');
    expect(sibOf(els, 'K1M_ST_BR1_6')).toBeNull();
    expect(pairOf(els, 'K1M_ST_BR2_6')).toMatchObject({ role: 'second', combination: 'best' });
    expect(pairOf(els, 'K1M_ST_BR1_6')).toMatchObject({ role: 'first', combination: 'best' });
  });

  it('row 2, CONTRACTS §2.4 Pairing example: K1M-ZS_BR1_25 + K1M-ZS_BR2_25, both ClassId K1M-ZS, the second run names the first, the first run states null (hyphenated class)', () => {
    const els = parse([
      { id: 'K1M-ZS_BR2_25', cls: 'K1M-ZS', dis: 'BR2', day: '2026-04-25' },
      { id: 'K1M-ZS_BR1_25', cls: 'K1M-ZS', dis: 'BR1', day: '2026-04-25' },
    ]);
    expect(valueOf(els, 'classId', 'K1M-ZS_BR1_25')).toBe('K1M-ZS');
    expect(sibOf(els, 'K1M-ZS_BR2_25')).toBe('K1M-ZS_BR1_25');
    expect(sibOf(els, 'K1M-ZS_BR1_25')).toBeNull();
  });

  it('row 3, CONTRACTS §2.4 Pairing examples: MX1J_XT_26_JUN (ClassId MX1J, DisId XT) is a single run, pair null', () => {
    const els = parse([{ id: 'MX1J_XT_26_JUN', cls: 'MX1J', dis: 'XT', day: '2026-04-26' }]);
    expect(valueOf(els, 'classId', 'MX1J_XT_26_JUN')).toBe('MX1J');
    expect(valueOf(els, 'format', 'MX1J_XT_26_JUN')).toBe('XT');
    expect(pairOf(els, 'MX1J_XT_26_JUN')).toBeNull();
  });

  it('row 4, DERIVATIONS §2.1 "no id is parsed" (constructed): X_BR1_26_JUN + X_BR2_26_JUN, ClassId X, the second run names the first across the _JUN suffix, the first run states null', () => {
    const els = parse([
      { id: 'X_BR1_26_JUN', cls: 'X', dis: 'BR1', day: '2026-04-26' },
      { id: 'X_BR2_26_JUN', cls: 'X', dis: 'BR2', day: '2026-04-26' },
    ]);
    expect(valueOf(els, 'format', 'X_BR2_26_JUN')).toBe('BR2');
    expect(sibOf(els, 'X_BR2_26_JUN')).toBe('X_BR1_26_JUN');
    expect(sibOf(els, 'X_BR1_26_JUN')).toBeNull();
  });

  it('row 5, CONTRACTS §2.4 Pairing (rename example): K1M_BR1_19 + K1M-X_BR2_19, both ClassId K1M-X, the second run names the first although the RaceId prefixes differ; the first run states null', () => {
    const rows: Row[] = [
      { id: 'K1M_BR1_19', cls: 'K1M-X', dis: 'BR1', day: '2026-09-19' },
      { id: 'K1M-X_BR2_19', cls: 'K1M-X', dis: 'BR2', day: '2026-09-19' },
    ];
    expect(prefixOf('K1M_BR1_19')).not.toBe(prefixOf('K1M-X_BR2_19')); // precondition: the old prefix rule cannot find this pair
    for (const order of [rows, [...rows].reverse()]) {
      const els = parse(order);
      expect(valueOf(els, 'classId', 'K1M_BR1_19')).toBe('K1M-X');
      expect(sibOf(els, 'K1M-X_BR2_19')).toBe('K1M_BR1_19');
      expect(sibOf(els, 'K1M_BR1_19')).toBeNull();
    }
  });

  describe.each([
    ['snapshot order BR1, BR1, BR2', [0, 1, 2]],
    ['snapshot order BR2 first', [2, 1, 0]],
    ['snapshot order BR1 of the 20th first', [1, 2, 0]],
  ])('rows 6 to 8 in %s', (_name, order) => {
    const pick = (rows: Row[]): Row[] => order.filter((i) => rows[i] !== undefined).map((i) => rows[i] as Row);
    const R = (id: string, dis: string, day: string): Row => ({ id, cls: 'K1M', dis, day });

    it('row 6, DERIVATIONS §2.1 example, §10 item 48: BR1 19th, BR1 20th, BR2 20th: the BR2 names the BR1 of the 20th; both BR1 state null (the core derives the first run side)', () => {
      const els = parse(pick([R('K1M_BR1_19', 'BR1', '2026-09-19'), R('K1M_BR1_20', 'BR1', '2026-09-20'), R('K1M_BR2_20', 'BR2', '2026-09-20')]));
      expect(valueOf(els, 'date', 'K1M_BR1_19')).toBe('2026-09-19'); // precondition: the days really differ
      expect(valueOf(els, 'date', 'K1M_BR1_20')).toBe('2026-09-20');
      expect(sibOf(els, 'K1M_BR2_20')).toBe('K1M_BR1_20');
      expect(sibOf(els, 'K1M_BR1_20')).toBeNull();
      expect(sibOf(els, 'K1M_BR1_19')).toBeNull();
    });

    it('row 7, DERIVATIONS §2.1 example, §10 item 48: BR1 19th, BR1 20th, BR2 21st: the BR2 is null and so are both BR1 (several first runs, none on its day)', () => {
      const els = parse(pick([R('K1M_BR1_19', 'BR1', '2026-09-19'), R('K1M_BR1_20', 'BR1', '2026-09-20'), R('K1M_BR2_21', 'BR2', '2026-09-21')]));
      expect(valueOf(els, 'date', 'K1M_BR2_21')).toBe('2026-09-21');
      expect(pairOf(els, 'K1M_BR2_21')).toMatchObject({ role: 'second', combination: 'best' }); // the pair is stated, its sibling is the null
      expect(sibOf(els, 'K1M_BR2_21')).toBeNull();
      expect(sibOf(els, 'K1M_BR1_19')).toBeNull();
      expect(sibOf(els, 'K1M_BR1_20')).toBeNull();
    });

    it('row 8, DERIVATIONS §2.1 example: BR1 19th, BR2 20th: a single match pairs across the days: the BR2 names the BR1, the BR1 states null', () => {
      const els = parse(pick([R('K1M_BR1_19', 'BR1', '2026-09-19'), R('K1M_BR2_20', 'BR2', '2026-09-20')]));
      expect(valueOf(els, 'date', 'K1M_BR1_19')).not.toBe(valueOf(els, 'date', 'K1M_BR2_20'));
      expect(sibOf(els, 'K1M_BR2_20')).toBe('K1M_BR1_19');
      expect(sibOf(els, 'K1M_BR1_19')).toBeNull();
    });
  });

  it('row 8b, DERIVATIONS §10 item 48 (the recorded shape, six of seven recordings): two BR1 and two BR2 of one class, one of each per day: each BR2 names its same-day BR1, each BR1 states null', () => {
    const R = (id: string, dis: string, day: string): Row => ({ id, cls: 'K1M', dis, day });
    const rows = [
      R('K1M_BR1_19', 'BR1', '2026-09-19'), R('K1M_BR2_19', 'BR2', '2026-09-19'),
      R('K1M_BR1_20', 'BR1', '2026-09-20'), R('K1M_BR2_20', 'BR2', '2026-09-20'),
    ];
    for (const order of [rows, [...rows].reverse(), [rows[2], rows[1], rows[3], rows[0]] as Row[]]) {
      const els = parse(order);
      expect(sibOf(els, 'K1M_BR2_19')).toBe('K1M_BR1_19');
      expect(sibOf(els, 'K1M_BR1_19')).toBeNull();
      expect(sibOf(els, 'K1M_BR2_20')).toBe('K1M_BR1_20');
      expect(sibOf(els, 'K1M_BR1_20')).toBeNull();
    }
  });

  it('row 9, CONTRACTS §2.4 "no part of a RaceId is read": K1M_BR1_6 (class K1M) and K1M_BR2_6 (class K1M_ST) share a prefix and never pair across classes', () => {
    const same = parse([
      { id: 'K1M_BR1_6', cls: 'K1M', dis: 'BR1', day: '2026-09-06' },
      { id: 'K1M_BR2_6', cls: 'K1M', dis: 'BR2', day: '2026-09-06' },
    ]);
    expect(prefixOf('K1M_BR1_6')).toBe(prefixOf('K1M_BR2_6')); // precondition: the ids would pair under the old prefix rule
    expect(sibOf(same, 'K1M_BR2_6')).toBe('K1M_BR1_6'); // precondition: with one class they do pair, so the snapshot builder is sound
    const els = parse([
      { id: 'K1M_BR1_6', cls: 'K1M', dis: 'BR1', day: '2026-09-06' },
      { id: 'K1M_BR2_6', cls: 'K1M_ST', dis: 'BR2', day: '2026-09-06' },
    ]);
    expect(valueOf(els, 'classId', 'K1M_BR1_6')).toBe('K1M');
    expect(valueOf(els, 'classId', 'K1M_BR2_6')).toBe('K1M_ST');
    expect(sibOf(els, 'K1M_BR2_6')).toBeNull();
    expect(sibOf(els, 'K1M_BR1_6')).toBeNull();
  });

  it('row 9, CONTRACTS §2.4: a second run of class K1M_ST picks the K1M_ST first run, not the K1M first run whose RaceId prefix it shares', () => {
    const els = parse([
      { id: 'K1M_BR1_6', cls: 'K1M', dis: 'BR1', day: '2026-09-06' },
      { id: 'K1M_ST_BR1_6', cls: 'K1M_ST', dis: 'BR1', day: '2026-09-06' },
      { id: 'K1M_BR2_6', cls: 'K1M_ST', dis: 'BR2', day: '2026-09-06' },
    ]);
    expect(prefixOf('K1M_BR2_6')).toBe(prefixOf('K1M_BR1_6')); // precondition: the old rule would take K1M_BR1_6
    expect(sibOf(els, 'K1M_BR2_6')).toBe('K1M_ST_BR1_6');
    expect(sibOf(els, 'K1M_ST_BR1_6')).toBeNull();
    expect(sibOf(els, 'K1M_BR1_6')).toBeNull(); // named by no second run of its class
  });

  it('CONTRACTS §2.4 Pairing table (guard): HT, EL, TR, SR second runs name their first-run token (first runs state null); SUF names BR2, which keeps its own pair with BR1', () => {
    const cases: Array<[first: string, second: string, combination: string]> = [
      ['HT1', 'HT2', 'best'], ['EL1', 'EL2', 'best'], ['TR1', 'TR2', 'best'], ['SR1', 'SR2', 'sum'],
    ];
    for (const [a, b, combination] of cases) {
      const els = parse([{ id: `K1M_${a}_19`, cls: 'K1M', dis: a, day: '2026-09-19' }, { id: `K1M_${b}_19`, cls: 'K1M', dis: b, day: '2026-09-19' }]);
      expect(pairOf(els, `K1M_${b}_19`), b).toMatchObject({ role: 'second', siblingPhaseId: `K1M_${a}_19`, combination });
      expect(pairOf(els, `K1M_${a}_19`), a).toMatchObject({ role: 'first', siblingPhaseId: null, combination });
    }
    const els = parse([
      { id: 'K1M_BR1_19', cls: 'K1M', dis: 'BR1', day: '2026-09-19' },
      { id: 'K1M_BR2_19', cls: 'K1M', dis: 'BR2', day: '2026-09-19' },
      { id: 'K1M_SUF_19', cls: 'K1M', dis: 'SUF', day: '2026-09-19' },
    ]);
    expect(pairOf(els, 'K1M_SUF_19')).toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR2_19', combination: 'sum' });
    expect(pairOf(els, 'K1M_BR2_19')).toMatchObject({ role: 'second', siblingPhaseId: 'K1M_BR1_19', combination: 'best' });
    expect(pairOf(els, 'K1M_BR1_19')).toMatchObject({ role: 'first', siblingPhaseId: null });
  });

  it('row 11, CONTRACTS §2.4 NHT bullet (closing DERIVATIONS §10 item 31): NHT1 and NHT2 are single runs, pair null, no pair between them', () => {
    const els = parse([
      { id: 'K1M_NHT1_19', cls: 'K1M', dis: 'NHT1', day: '2026-09-19' },
      { id: 'K1M_NHT2_19', cls: 'K1M', dis: 'NHT2', day: '2026-09-19' },
    ]);
    expect(valueOf(els, 'format', 'K1M_NHT1_19')).toBe('NHT1'); // precondition: both are in the snapshot with their formats
    expect(valueOf(els, 'format', 'K1M_NHT2_19')).toBe('NHT2');
    expect(pairOf(els, 'K1M_NHT1_19')).toBeNull();
    expect(pairOf(els, 'K1M_NHT2_19')).toBeNull();
    for (const id of ['K1M_NHT1_19', 'K1M_NHT2_19']) {
      expect(valueOf(els, 'kind', id)).toBe('race');
      expect(valueOf(els, 'scoringKind', id)).toBe('duration');
      expect(valueOf(els, 'heats', id)).toBe(false);
    }
  });

  it('row 11, CONTRACTS §2.4 format table (#287 issue comment, TS1/TS2 "a sum pair if not already"): TS1 + TS2 of one class are a sum pair: TS2 names TS1, TS1 states null', () => {
    const els = parse([
      { id: 'K1M_TS1_19', cls: 'K1M', dis: 'TS1', day: '2026-09-19' },
      { id: 'K1M_TS2_19', cls: 'K1M', dis: 'TS2', day: '2026-09-19' },
    ]);
    expect(valueOf(els, 'format', 'K1M_TS2_19')).toBe('TS2');
    expect(pairOf(els, 'K1M_TS2_19')).toEqual({ role: 'second', siblingPhaseId: 'K1M_TS1_19', combination: 'sum' });
    expect(pairOf(els, 'K1M_TS1_19')).toEqual({ role: 'first', siblingPhaseId: null, combination: 'sum' });
  });
});

describe('#287 row 10 TCP path: the class comes from what the context tracker has learned (snapshot or an earlier Results), never from the RaceId (DERIVATIONS §2.1 classId and pair bullets)', () => {
  const fresh = () => createContextTracker('Europe/Prague', '2026-09-19', 'cz-rgc');
  type Tracker = ReturnType<typeof fresh>;
  const stamp = (t: Tracker): Tracker['ctx'] => { t.ctx.observedAt = OBSERVED_AT; return t.ctx; };
  /** An XML snapshot read and learned, as the recording drivers and the on-site server do. */
  const learnSnapshot = (t: Tracker, rows: Row[]): void => { t.learn(parseXmlSnapshot(xmlOf(rows), stamp(t)) as El[], true); };
  /** A TCP message parsed with the tracker's ctx and learned. */
  const tcp = (t: Tracker, msg: string): El[] => { const els = parseTcp(msg, stamp(t)) as El[]; t.learn(els, false); return els; };
  const resultsOf = (base: string, raceId: string, classId: string): string => withAttr(withAttr(base, 'RaceId', base === TCP.resultsBr1 ? 'K1M_BR1_19' : 'K1M_BR2_19', raceId), 'ClassId', 'K1M', classId);
  const schedule = (ids: string[]): string =>
    '<Canoe123 System="Main"><Schedule>' + ids.map((id, i) => `<Race Order="${i + 1}" RaceId="${id}" Race="x" MainTitle="x" SubTitle="x" ShortTitle="x" RaceStatus="0"><StartTime /></Race>`).join('') + '</Schedule></Canoe123>';
  const sibTcp = (els: El[], id: string): string | null => {
    const p = pairOf(els, id);
    expect(p, `pair stated for ${id}`).not.toBeNull();
    return (p as El).siblingPhaseId ?? null;
  };
  const br1: Row = { id: 'K1M_BR1_19', cls: 'K1M', dis: 'BR1', day: '2026-09-19' };

  it.each([
    ['same prefix', 'K1M_BR2_19', 'K1M'],
    ['renamed class, prefixes differ', 'K1M-X_BR2_19', 'K1M-X'],
  ])('a snapshot learned, then a Results message for the BR2 (%s): the BR2 names the BR1 of its ClassId', (_n, br2, cls) => {
    const t = fresh();
    learnSnapshot(t, [{ ...br1, cls }]);
    if (cls !== 'K1M') expect(prefixOf(br2)).not.toBe(prefixOf('K1M_BR1_19')); // precondition: the old rule cannot find it
    const els = tcp(t, resultsOf(TCP.resultsBr2, br2, cls));
    expect(valueOf(els, 'classId', br2)).toBe(cls); // precondition: the message states the class
    expect(sibTcp(els, br2)).toBe('K1M_BR1_19');
  });

  it('no snapshot, a BR1 Results then a BR2 Results, both stating ClassId (renamed class): they pair without any snapshot', () => {
    const t = fresh();
    tcp(t, resultsOf(TCP.resultsBr1, 'K1M_BR1_19', 'K1M-X'));
    const els = tcp(t, resultsOf(TCP.resultsBr2, 'K1M-X_BR2_19', 'K1M-X'));
    expect(sibTcp(els, 'K1M-X_BR2_19')).toBe('K1M_BR1_19');
  });

  it('the class of the first run is unknown (only the BR2 Results, no snapshot, ids sharing a prefix): the sibling is null; with the snapshot learned they pair', () => {
    expect(prefixOf('K1M_BR1_19')).toBe(prefixOf('K1M_BR2_19')); // precondition: the old rule would pair them
    const known = fresh();
    learnSnapshot(known, [br1]);
    expect(sibTcp(tcp(known, resultsOf(TCP.resultsBr2, 'K1M_BR2_19', 'K1M')), 'K1M_BR2_19')).toBe('K1M_BR1_19'); // precondition: pairable
    const alone = fresh();
    expect(sibTcp(tcp(alone, resultsOf(TCP.resultsBr2, 'K1M_BR2_19', 'K1M')), 'K1M_BR2_19')).toBeNull();
  });

  it('the learned class of the first run differs from the Results\' ClassId: no pair across classes, null', () => {
    const t = fresh();
    learnSnapshot(t, [{ ...br1, cls: 'K1M_ST' }]);
    const els = tcp(t, resultsOf(TCP.resultsBr2, 'K1M_BR2_19', 'K1M'));
    expect(valueOf(els, 'classId', 'K1M_BR2_19')).toBe('K1M');
    expect(sibTcp(els, 'K1M_BR2_19')).toBeNull();
  });

  it('a TCP Schedule states no class: with nothing learned neither Phase has one and neither names the other; after the snapshot the second run names the first, the first run states null', () => {
    const ids = ['K1M_BR1_19', 'K1M_BR2_19'];
    const withSnapshot = fresh();
    learnSnapshot(withSnapshot, [br1, { id: 'K1M_BR2_19', cls: 'K1M', dis: 'BR2', day: '2026-09-19' }]);
    const learned = tcp(withSnapshot, schedule(ids));
    expect(sibTcp(learned, 'K1M_BR2_19')).toBe('K1M_BR1_19'); // precondition: pairable, same prefix
    expect(sibTcp(learned, 'K1M_BR1_19')).toBeNull();
    const none = tcp(fresh(), schedule(ids));
    expect(sibTcp(none, 'K1M_BR2_19')).toBeNull();
    expect(sibTcp(none, 'K1M_BR1_19')).toBeNull();
  });
});
