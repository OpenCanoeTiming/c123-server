import { describe, it, expect } from 'vitest';
import { parseTcp } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, obsOf, withAttr, type El } from './helpers.js';

/**
 * #377 (DERIVATIONS §2.1 "on TCP the RaceId token is the fallback, the one read of an id by any parser"; CONFORMANCE-VECTORS §1 "the core reads no class
 * and no pair from an id"). Channel: TCP `Results` message (it carries no DisId). The parser, not the core, states `format` for a Phase it first sees there.
 * Every test builds its own message and context; nothing is shared. Mutant for every row: a parser that states no `format` from a Results message
 * (today's behaviour) -> `obsOf(..., 'format')` is undefined -> red.
 */
const fmtOf = (els: El[], id: string): El | undefined => obsOf(els as never, 'format', { phaseId: id });

describe('#377 row 1: a TCP Results message states the Phase\'s format from the RaceId token (DERIVATIONS §2.1 fallback)', () => {
  it.each([
    { n: 'BR2 slalom second run', msg: TCP.resultsBr2, fromId: 'K1M_BR2_19', id: 'K1M_BR2_19', format: 'BR2' },
    { n: 'BR1 slalom first run', msg: TCP.resultsBr1, fromId: 'K1M_BR1_19', id: 'K1M_BR1_19', format: 'BR1' },
    { n: 'Cross time trial id K1M_XT_19', msg: TCP.resultsXtFault9, fromId: 'MX1_XT_26', id: 'K1M_XT_19', format: 'XT' },
    { n: 'renamed class, prefix differs (K1M-X_BR2_19)', msg: TCP.resultsBr2, fromId: 'K1M_BR2_19', id: 'K1M-X_BR2_19', format: 'BR2' },
  ])('§2.1: $n: the emitted Phase element carries format $format from the token, source tcp', ({ msg, fromId, id, format }) => {
    const text = fromId === id ? msg : withAttr(msg, 'RaceId', fromId, id);
    expect(text, 'precondition: a Results message').toContain('<Results');
    expect(text, 'precondition: the message states no DisId').not.toMatch(/DisId/);
    expect(text, 'precondition: the message names the id').toContain(`RaceId="${id}"`);
    const els = parseTcp(text, ctx()) as El[];
    expect(obsOf(els as never, 'classId', { phaseId: id }), 'precondition: the Phase is described by this message').toBeDefined();
    expect(fmtOf(els, id)).toMatchObject({ value: format, source: 'tcp' });
  });
});
