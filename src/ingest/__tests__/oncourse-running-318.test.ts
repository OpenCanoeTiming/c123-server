import { describe, expect, it } from 'vitest';
import { parseTcp } from '../index.js';
import { ctx, allObs, diagnostics } from './helpers.js';
import { listingText } from '../../core/__tests__/text.js';

// #318 N3 (DERIVATIONS §4.3 `running` bullet 1: "at a listing that shows `at-start` ... whatever `Time` that listing carries"; §10 item 43 (b);
// DA ruling item 16 (iv)). The listing is constructed in the recorded shape (core/__tests__/text.ts). Every test builds its own text; no real clock.
const outcomes = (text: string, race: string): any[] => allObs(parseTcp(text, ctx({ phaseDates: { ...ctx().phaseDates, [race]: '2026-09-19' } })), 'outcome');

describe('the parser states no running outcome from a listing that shows at-start (#318 N3)', () => {
  it('vector-rule #318 row 4 / DA (iv): slalom dtStart="" and Time="17.00": no outcome element of kind running', () => {
    const text = listingText({ race: 'K1M_BR1_19', bib: 51, dtStart: '', time: '17.00' });
    expect(text, 'precondition: at-start (dtStart empty, no finish)').toMatch(/dtStart="" [^>]*dtFinish=""/);
    expect(outcomes(text, 'K1M_BR1_19').filter((o) => o.value?.kind === 'running')).toEqual([]);
  });

  it('vector-rule #318 row 4 guard: the same listing with a dtStart does state running 17 (the rule is the empty dtStart, not the Time)', () => {
    const text = listingText({ race: 'K1M_BR1_19', bib: 51, dtStart: '11:59:40.000', time: '17.00' });
    expect(outcomes(text, 'K1M_BR1_19')).toMatchObject([{ attemptId: 'K1M_BR1_19:51', value: { kind: 'running', elapsedSeconds: 17 } }]);
  });

  it('item 35 / DA (vi) guard: a Cross heat listing with dtStart="" and a Time does state running (a heat listing is on-course)', () => {
    const text = listingText({ race: 'WX1_XS_26', bib: 2, dtStart: '', time: '17.00' });
    expect(outcomes(text, 'WX1_XS_26')).toMatchObject([{ attemptId: 'WX1_XS_26:2', value: { kind: 'running', elapsedSeconds: 17 } }]);
  });

  it('vector-rule #318 row 4, Cross time trial: WX1_XT_26 dtStart="" and Time="17.00" states no running (§4.1: at-start outside a heat)', () => {
    const text = listingText({ race: 'WX1_XT_26', bib: 2, dtStart: '', time: '17.00' });
    expect(outcomes(text, 'WX1_XT_26').filter((o) => o.value?.kind === 'running')).toEqual([]);
  });
});

describe('N4 (PR #379 review): an at-start listing with a Time still logs an unparseable Pen (DERIVATIONS §0.5, §4.3: an empty Pen is absent, a bad one is a diagnostic)', () => {
  it('vector-rule #318 N4: slalom dtStart="" Time="17.00" Pen="x": exactly one unparseable-field diagnostic naming Pen, and no running', () => {
    const text = listingText({ race: 'K1M_BR1_19', bib: 51, dtStart: '', time: '17.00' }).replace('Pen="0"', 'Pen="x"');
    expect(text, 'precondition: at-start listing with a bad Pen').toMatch(/Pen="x"/);
    const els = parseTcp(text, ctx());
    expect(diagnostics(els).filter((d: any) => d.kind === 'unparseable-field' && d.name === 'Pen')).toHaveLength(1);
    expect(allObs(els, 'outcome').filter((o: any) => o.value?.kind === 'running')).toEqual([]);
  });
});
