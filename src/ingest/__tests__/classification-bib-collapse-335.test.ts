import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { CLS } from '../../core/__tests__/fixtures/classification-excerpts.js';
import { ctx, type El } from './helpers.js';

// #335 (reopened 2026-11-15; maintainer's decision, PR #363). CONTRACTS §1.3 + DERIVATIONS §0.1 / §4.10: a classification row's bib (XER, SLER, WWER) is
// relayed as Canoe123 writes it, trimmed, the inner whitespace collapsed to one space ("t   13" -> "t 13"). An Attempt row's bib is trimmed only.
// Recorded text: TCP.resultsXer (cp3-cross WX1_XER_26 013 ts=28146) and the MX1_XER_26 XML excerpt CLS[4] (cp3-cross 011-0958 ts=1642220, rows "t    7", "t   13" ...);
// only the Bib text is edited, as the test names say. Expected values are the rule's, never read from the parser.
const PD = { MX1_XER_26: '2026-04-26', WX1J_XER_26_JUN: '2026-04-26' };
const snapOf = (els: unknown, phaseId: string): El => (els as El[]).find((x) => x.snapshot?.phaseId === phaseId)!.snapshot;
const bibs = (els: unknown, phaseId: string): string[] => snapOf(els, phaseId).rows.map((r: El) => r.bib);
const tcpXer = (bib: string, tok = 'XER'): string => TCP.resultsXer.replace('Bib="4"', `Bib="${bib}"`).replace('WX1_XER_26', `WX1_${tok}_26`);
const xmlMx1 = (edits: Array<[string, string]>): string => edits.reduce((d, [a, b]) => { if (!d.includes(a)) throw new Error(`no ${a} in the excerpt`); return d.replace(a, b); }, CLS[4]!.data);
const xmlCtx = () => ctx({ phaseDates: { ...ctx().phaseDates, ...PD } });

describe('CONTRACTS §1.3 (2026-11-15): a classification row\'s bib is trimmed and its inner whitespace collapsed to one space', () => {
  it.each([
    ['t   13', 't 13'], ['t    7', 't 7'], ['t  174', 't 174'], ['  13', '13'], ['13', '13'],
  ])('CONTRACTS §1.3 / DERIVATIONS §4.10: TCP XER row bib %j -> %j', (raw, want) => {
    expect(bibs(parseTcp(tcpXer(raw), ctx()), 'WX1_XER_26')[0]).toBe(want);
  });

  it.each(['SLER', 'WWER'])('CONTRACTS §1.3: the same collapse for a %s classification row (TCP)', (tok) => {
    expect(bibs(parseTcp(tcpXer('t   13', tok), ctx()), `WX1_${tok}_26`)[0]).toBe('t 13');
  });

  it.each([
    ['t   13', 't 13'], ['t    7', 't 7'], ['t  174', 't 174'], ['  13', '13'],
  ])('CONTRACTS §1.3 / DERIVATIONS §4.10: XML XER row bib %j -> %j (recorded excerpt, one Bib edited)', (raw, want) => {
    const edits: Array<[string, string]> = raw === 't   13' ? [] : raw === 't    7' ? [] : raw === 't  174' ? [['<Bib>t   13</Bib>', `<Bib>${raw}</Bib>`]] : [['<Bib>2</Bib>', `<Bib>${raw}</Bib>`]];
    const rows = snapOf(parseXmlSnapshot(xmlMx1(edits), xmlCtx()), 'MX1_XER_26').rows as El[];
    expect(rows.map((r) => r.bib)).toContain(want);
    expect(rows.map((r) => r.bib).filter((b) => /^t\s{2,}/.test(b)), 'no padded bib is relayed').toEqual([]);
  });

  it('CONTRACTS §1.3: every recorded XML classification bib is relayed trimmed and collapsed (t    7 -> t 7, t   13 -> t 13)', () => {
    const got = bibs(parseXmlSnapshot(CLS[4]!.data, xmlCtx()), 'MX1_XER_26');
    expect(got).toEqual(expect.arrayContaining(['t 7', 't 13', 't 3']));
    for (const b of got) expect(b).toBe(b.trim().replace(/\s+/g, ' '));
  });

  it('CONTRACTS §1.3: every recorded TCP classification bib is relayed trimmed and collapsed', () => {
    const got = bibs(parseTcp(CLS[2]!.data, xmlCtx()), 'MX1_XER_26');
    expect(got).toEqual(expect.arrayContaining(['t 7', 't 13', 't 3', '3']));
    for (const b of got) expect(b).toBe(b.trim().replace(/\s+/g, ' '));
  });
});

describe('CONTRACTS §1.3 (2026-11-15): an Attempt row\'s bib is trimmed only (inner whitespace kept)', () => {
  it('slalom Attempt row (resultsBr1): "  55" -> "55"; "A   55" keeps its inner spaces', () => {
    expect(bibs(parseTcp(TCP.resultsBr1, ctx()), 'K1M_BR1_19')[0]).toBe('55');
    expect(bibs(parseTcp(TCP.resultsBr1.replace('Bib="  55"', 'Bib="A   55"'), ctx()), 'K1M_BR1_19')[0]).toBe('A   55');
  });
  it.each([
    ['XT', 'resultsStartList', 'WX1_XT_26', 'Bib="  25"', '25'],
    ['XS', 'resultsHeatOrderOnly', 'WX1_XS_26', 'Bib="1"', '1'],
  ] as const)('Kayak Cross %s Attempt row: trimmed ("  25" -> "25"), an inner-spaced bib is not collapsed', (_k, fx, phase, raw, plain) => {
    expect(bibs(parseTcp(TCP[fx], ctx()), phase)[0]).toBe(plain);
    const padded = TCP[fx].replace(raw, 'Bib="x   9"');
    expect(bibs(parseTcp(padded, ctx()), phase)[0]).toBe('x   9');
  });
  it('Kayak Cross XF Attempt row (synthetic RaceId on the recorded XS message): an inner-spaced bib is not collapsed', () => {
    const msg = TCP.resultsHeatOrderOnly.replace('WX1_XS_26', 'WX1_XF_26').replace('Bib="1"', 'Bib="x   9"');
    const els = parseTcp(msg, ctx({ phaseDates: { ...ctx().phaseDates, WX1_XF_26: '2026-04-26' } }));
    expect(bibs(els, 'WX1_XF_26')[0]).toBe('x   9');
  });
});
