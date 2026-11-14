import { describe, it, expect } from 'vitest';
import { at } from './kit.js';
import { CLS, type ClsRec } from './fixtures/classification-excerpts.js';
import { coreWith, tcpUnit, xmlUnit, derive, type Unit } from './streams.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// #335 (reopened 2026-11-15; maintainer's decision, PR #363): Kayak Cross bibs across Phases. DERIVATIONS §4.10 / §0.1, CONTRACTS §1.3, CLIENT-OBLIGATIONS (Kayak Cross lines):
// nothing joins across Phases by bib (entryId across Phases; an Attempt = Phase + bib within one); a classification row's bib is trimmed and collapsed to one space;
// a class with no XER, or an XER whose table is empty, publishes no classification Standing.
// Recorded text: CLS[2] (TCP MX1_XER_26, 52 rows, cp3-cross 011-0958 ts=1631234) and CLS[4] (XML snapshot, same Phase, ts=1642220), fixtures/classification-excerpts.ts (verbatim).
// In both, bibs 3, 4 and 7 are held by two entries each: a plain F/SF row ("3") and a T row ("t    3"). Expected values are read from the recorded text, never from the core.
// Every test builds its own core; no real clock (kit.ts BASE offsets, or the record's own observedAt).

type Std = { standingKey: string; asOf: string; entries: Array<Record<string, any>> };
type Core = ReturnType<typeof coreWith>;
const CP = 'MX1_XER_26';
const CKEY = `classification:${CP}/all`;
const DAY = { MX1_XER_26: '2026-04-26', WX1J_XER_26_JUN: '2026-04-26' };
const sent = (c: Core, from = 0): Std[] => c.notifications().slice(from).filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std);
const cls = (c: Core, from = 0): Std[] => sent(c, from).filter((s) => s.standingKey.startsWith('classification:'));
const collapse = (b: string): string => b.trim().replace(/\s+/g, ' ');
const el = (e: unknown): GivenElement => e as GivenElement;
const changedBefore = (r: ClsRec): string => new Date(Date.parse(r.observedAt) - 5000).toISOString();

interface Own { entryId: string; bib: string; rank: number | null; order: number | null; decidedIn: string | null }
const num = (s: string | undefined): number | null => (s === undefined || s === '' ? null : Number(s));
/** Rows of MX1_XER_26 as the record states them, by regex on the recorded text. */
function tcpRows(data: string): Own[] {
  return [...data.matchAll(/<Row [^>]*>(.*?)<\/Row>/gs)].map((m) => {
    const p = m[1]!;
    return { entryId: /Id="([^"]*)"/.exec(p)![1]!, bib: collapse(/Bib="([^"]*)"/.exec(p)![1]!), rank: num(/Rank="([^"]*)"/.exec(p)![1]), order: num(/RankOrder="([^"]*)"/.exec(p)![1]), decidedIn: null };
  });
}
function xmlRows(data: string): Own[] {
  return [...data.matchAll(/<Results>(.*?)<\/Results>/gs)].filter((m) => m[1]!.includes('<RaceId>MX1_XER_26</RaceId>')).map((m) => {
    const p = m[1]!;
    const g = (t: string): string | undefined => new RegExp(`<${t}>([^<]*)</${t}>`).exec(p)?.[1];
    return { entryId: g('Id')!, bib: collapse(g('Bib')!), rank: num(g('Rnk')), order: num(g('RnkOrder')), decidedIn: g('RecordType') ?? null };
  });
}
const view = (s: Std) => s.entries.map((e) => ({ entryId: e['entryId'], bib: e['bib'], rank: e['rank'], order: e['order'], decidedIn: e['decidedIn'] }));
const byEntry = (rows: Own[]) => Object.fromEntries(rows.map((r) => [r.entryId, r]));

describe('#335 cp3-cross MX1_XER_26 (CLIENT-OBLIGATIONS 2026-11-15; DERIVATIONS §4.10)', () => {
  it('CLIENT-OBLIGATIONS (2026-11-15) + DERIVATIONS §4.10: cp3-cross MX1_XER_26, bibs 3, 4 and 7 held by two entries each, entries match their own rows by entryId', () => {
    for (const [source, rec] of [['tcp', CLS[2]!], ['xml', CLS[4]!]] as const) {
      const own = source === 'tcp' ? tcpRows(rec.data) : xmlRows(rec.data);
      const held = (b: string) => own.filter((r) => r.bib === b || r.bib === `t ${b}`);
      for (const b of ['3', '4', '7']) expect(held(b), `${source}: the record holds bib ${b} twice`).toHaveLength(2);
      const unit: Unit = source === 'tcp' ? tcpUnit(rec, DAY) : xmlUnit(rec, DAY, changedBefore(rec));
      const c = coreWith([unit]);
      const out = cls(c).filter((s) => s.standingKey === CKEY);
      expect(out, `${source}: one classification Standing`).toHaveLength(1);
      const entries = view(out[0]!);
      expect(entries, `${source}: one entry per row`).toHaveLength(own.length);
      const mine = byEntry(own);
      for (const e of entries) {
        const r = mine[e.entryId as string]!;
        expect(r, `${source}: entry ${e.entryId} is a recorded row`).toBeDefined();
        expect(e, `${source}: entry ${e.entryId} equals its own row`).toEqual({ entryId: r.entryId, bib: r.bib, rank: r.rank, order: r.order, decidedIn: r.decidedIn });
      }
      // the T row of a shared bib says "t 3", the plain row "3": the same two people, nobody takes the other's row
      const bibOf = (id: string) => entries.find((e) => e.entryId === id)!.bib;
      expect([bibOf('119076.MX1'), bibOf('119094.MX1')], `${source}: bib 3`).toEqual(['t 3', '3']);
      expect([bibOf('9184.MX1'), bibOf('49003.MX1')], `${source}: bib 4`).toEqual(['t 4', '4']);
      expect([bibOf('9050.MX1'), bibOf('12019.MX1')], `${source}: bib 7`).toEqual(['t 7', '7']);
      expect(entries.every((e) => e.bib === collapse(String(e.bib))), `${source}: no padded bib`).toBe(true);
    }
  });

  it('INV-5: an XML and a TCP row whose raw padding differs give the same bib; a TCP re-send of equal rows changes nothing', () => {
    // different padding in the raw text, same bib after the collapse
    const tcp = coreWith([tcpUnit(CLS[2]!, DAY)]);
    const repadded = derive(CLS[2]!, { observedAt: '2026-04-26T10:26:30.000Z', edit: (d) => d.replace(/Bib="t\s+(\d+)"/g, 'Bib="t $1"').replace(/Bib="t    3"/, 'Bib="t  3"') });
    expect(repadded.data).not.toBe(CLS[2]!.data);
    const xml = coreWith([xmlUnit(CLS[4]!, DAY, changedBefore(CLS[4]!))]);
    const bibsOf = (c: Core) => Object.fromEntries(view(cls(c).find((s) => s.standingKey === CKEY)!).map((e) => [e.entryId, e.bib]));
    expect(bibsOf(xml)).toEqual(bibsOf(tcp));
    expect(bibsOf(tcp)['119076.MX1']).toBe('t 3');
    // the re-send: equal rows, other padding
    const m = tcp.notifications().length;
    const first = cls(tcp).at(-1)!;
    tcp.applyUnit(tcpUnit(repadded, DAY));
    expect(sent(tcp, m), 'no standing.updated for the re-send').toHaveLength(0);
    expect(cls(tcp).at(-1)!.asOf, 'asOf unchanged').toBe(first.asOf);
    // and a second identical-padding re-send is quiet too
    tcp.applyUnit(tcpUnit(derive(CLS[2]!, { observedAt: '2026-04-26T10:27:00.000Z' }), DAY));
    expect(sent(tcp, m)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------- synthetic Kayak Cross

const PHASES = { MX1_XT_26: '2026-04-26', MX1_XS_26: '2026-04-26', MX1_XF_26: '2026-04-26', MX1_XER_26: '2026-04-26' };
interface R { bib: string; id: string; heat?: number; rank?: number | null; order?: number | null; time?: string }
const race = (raceId: string, sub: string, rows: R[]): string => {
  const body = rows.map((r, i) => `<Row Number="${i + 1}"><Participant Bib="${r.bib}" Id="${r.id}" Name="NAME${i} Given" Club="K" Nat="" GivenName="Given" FamilyName="NAME${i}" StartOrder="${i + 1}" StartTime="" /><Result Type="T" HeatNr="${r.heat ?? 0}" Q="" IRM="" Pen="" Gates="" Time="${r.time ?? ''}" Total="${r.time ?? ''}" Rank="${r.rank ?? ''}" RankOrder="${r.order ?? ''}" Behind="" PP="" /></Row>`).join('');
  return `<Canoe123 System="Main"><Results RaceId="${raceId}" ClassId="MX1" Current="Y" MainTitle="Men's Kayak Cross" SubTitle="${sub}">${body}</Results></Canoe123>`;
};
const rec = (t: number, data: string): ClsRec => ({ kind: 'tcp', recording: 'synthetic', chunk: 'synthetic', ts: t, observedAt: at(t), data });
const tcp = (t: number, data: string): Unit => tcpUnit(rec(t, data), PHASES);
const attemptIds = (c: Core): string[] => [...new Set(c.notifications().filter((m) => m.type === 'attempt.updated').map((m) => m['attemptId'] as string))];
const phaseStd = (c: Core, phaseId: string): Std[] => sent(c).filter((s) => s.standingKey === `phase:${phaseId}/all`);
const rebase = (t: number, phaseId: string): Unit => [
  el({ ingestSeq: 900, event: 'rebaseline', observedAt: at(t), scope: { kind: 'phase', phaseId } }),
  el({ ingestSeq: 901, event: 'xml-rewrite-detected', observedAt: at(t), changedAfter: at(t - 5) }),
  el({ ingestSeq: 902, observedAt: at(t), snapshot: { source: 'xml', phaseId, mode: 'results', rows: [] } }),
];
const replacedKeys = (c: Core, from: number): string[] =>
  c.notifications().slice(from).filter((m) => m.type === 'scope.replaced').flatMap((m) => (m['standings'] as Std[]).map((s) => s.standingKey));

describe('#335 Kayak Cross bibs across Phases (synthetic; DERIVATIONS §4.10, 2026-11-15)', () => {
  it('DERIVATIONS (2026-11-15): heats that keep the XT bibs join right by entryId; nothing assumes 1..N', () => {
    // XT bib = XS bib = XF bib for the finalists (5, 40: not 1..N); the non-qualifier (XT bib 12) shows in the XER as "t   12"
    const xt = [{ bib: '5', id: '5001.MX1', rank: 1, order: 1, time: '60.00' }, { bib: '12', id: '9012.MX1', rank: 2, order: 2, time: '61.00' }, { bib: '40', id: '4040.MX1', rank: 3, order: 3, time: '62.00' }];
    const heat = (bibs: Array<[string, string]>) => bibs.map(([bib, id], i) => ({ bib, id, heat: 1, rank: i + 1, order: i + 1, time: `${70 + i}.00` }));
    const xer = [
      { bib: '5', id: '5001.MX1', rank: 1, order: 1 },
      { bib: '40', id: '4040.MX1', rank: 2, order: 2 },
      { bib: 't   12', id: '9012.MX1', rank: 3, order: 3 },
    ];
    const c = coreWith([
      tcp(10, race('MX1_XT_26', 'Time Trial', xt)),
      tcp(20, race('MX1_XS_26', 'Semifinals', heat([['5', '5001.MX1'], ['40', '4040.MX1']]))),
      tcp(30, race('MX1_XF_26', 'Final', heat([['5', '5001.MX1'], ['40', '4040.MX1']]))),
      tcp(40, race('MX1_XER_26', 'Final Result', xer)),
    ]);
    const ids = attemptIds(c);
    for (const a of ['MX1_XT_26:5', 'MX1_XS_26:5', 'MX1_XF_26:5', 'MX1_XT_26:12', 'MX1_XS_26:40', 'MX1_XF_26:40']) expect(ids, a).toContain(a);
    expect(ids, 'the bib 12 of the XER row is not an Attempt of a heat').not.toContain('MX1_XS_26:12');
    expect(ids.filter((a) => a.startsWith('MX1_XER_26')), 'a classification row creates no Attempt').toEqual([]);
    const std = cls(c).filter((s) => s.standingKey === CKEY).at(-1)!;
    expect(view(std).map(({ bib: _b, ...rest }) => rest)).toEqual([
      { entryId: '5001.MX1', rank: 1, order: 1, decidedIn: null },
      { entryId: '4040.MX1', rank: 2, order: 2, decidedIn: null },
      { entryId: '9012.MX1', rank: 3, order: 3, decidedIn: null },
    ]);
    expect(view(std).map((e) => e.bib), 'CONTRACTS §1.3: the non-qualifier is "t 12", the finalist plain "5": no renumbering is inferred from the t').toEqual(['5', '40', 't 12']);
    // the finalist's XT, XS and XF Attempts are three Attempts of one entry (entryId across Phases), each in its own Phase standing
    for (const p of ['MX1_XT_26', 'MX1_XS_26', 'MX1_XF_26']) expect(phaseStd(c, p).length, p).toBeGreaterThan(0);
    expect(phaseStd(c, 'MX1_XS_26').at(-1)!.entries.map((e) => e['entryId']).sort()).toEqual(['4040.MX1', '5001.MX1']);
  });

  it('DERIVATIONS §4.10 (2026-11-15): a class with no XER publishes no classification Standing; the heat standings are present', () => {
    const xt = [{ bib: '5', id: '5001.MX1', rank: 1, order: 1, time: '60.00' }, { bib: '12', id: '9012.MX1', rank: 2, order: 2, time: '61.00' }];
    const c = coreWith([
      tcp(10, race('MX1_XT_26', 'Time Trial', xt)),
      tcp(20, race('MX1_XS_26', 'Semifinals', [{ bib: '5', id: '5001.MX1', heat: 1, rank: 1, order: 1, time: '70.00' }, { bib: '12', id: '9012.MX1', heat: 1, rank: 2, order: 2, time: '71.00' }])),
    ]);
    expect(phaseStd(c, 'MX1_XT_26').length, 'the XT standing is there').toBeGreaterThan(0);
    expect(phaseStd(c, 'MX1_XS_26').length, 'the heat standing is there').toBeGreaterThan(0);
    expect(cls(c), 'no standing.updated of kind classification').toEqual([]);
    const m = c.notifications().length;
    c.applyUnit(rebase(100, 'MX1_XT_26'));
    expect(replacedKeys(c, m).filter((k) => k.startsWith('classification:')), 'not in hydration').toEqual([]);
  });

  it('DERIVATIONS §4.10: an XER whose table is empty in every snapshot (XML and TCP) publishes no classification Standing', () => {
    const xt = [{ bib: '5', id: '5001.MX1', rank: 1, order: 1, time: '60.00' }];
    const emptyTcp = `<Canoe123 System="Main"><Results RaceId="MX1_XER_26" ClassId="MX1" Current="N" MainTitle="Men's Kayak Cross" SubTitle="Final Result - Start List" /></Canoe123>`;
    const emptyXml = CLS[1]!; // the recorded XML snapshot whose MX1_XER_26 and WX1J_XER_26_JUN Schedules carry no Results rows (cp3-cross 011-0958 ts=1371857)
    expect(emptyXml.data).not.toMatch(/<Bib>/);
    const c = coreWith([
      tcp(10, race('MX1_XT_26', 'Time Trial', xt)),
      tcp(20, emptyTcp),
      xmlUnit(emptyXml, { ...DAY }, changedBefore(emptyXml)),
      tcp(30, emptyTcp),
    ]);
    expect(phaseStd(c, 'MX1_XT_26').length, 'the core is alive: the XT standing is published').toBeGreaterThan(0);
    expect(cls(c), 'no classification standing.updated').toEqual([]);
    const m = c.notifications().length;
    c.applyUnit(rebase(100, CP).map((e) => e));
    expect(replacedKeys(c, m).filter((k) => k.startsWith('classification:')), 'not in hydration').toEqual([]);
  });
});
