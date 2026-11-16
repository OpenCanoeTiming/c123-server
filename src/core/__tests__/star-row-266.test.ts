import { describe, it, expect } from 'vitest';
import { field, kit } from './kit.js';
import { parseXmlSnapshot } from '../../ingest/index.js';
import { ctx, xmlFixture } from '../../ingest/__tests__/helpers.js';

// #266 Q1 core (DERIVATIONS §4.6(b), §4.11): an admitted XML snapshot whose row is `*`, no time, `Gates=""` states no gates vector, so it
// disagrees with nothing. Channels: the XML snapshot (parsed by the real parser from the recorded slalom.xml row), TCP results row, on-course stream.
const P = 'K1M_BR2_19', A = `${P}:105`;
const T0 = Date.parse('2026-09-19T09:00:00.000Z');
const iso = (s: number): string => new Date(T0 + s * 1000).toISOString();

/** One XML read of the recorded fixture, the 105 row set to `status` (blank = states nothing); parser output with the reader's rewrite event first. */
const xmlRead = (observedAt: string, changedAfter: string | null, status: string) => {
  const data = xmlFixture('slalom.xml').replace('<Status>DNS</Status>', status === '' ? '<Status />' : `<Status>${status}</Status>`);
  return [
    { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt, changedAfter },
    ...parseXmlSnapshot(data, ctx({ observedAt })),
  ];
};

/** The stream's gates (an on-course inference), as the listing carries them, 23 slots, gate 1 judged 2. */
const streamCells = Array.from({ length: 23 }, (_, i) => ({ number: i + 1, penalty: i === 0 ? 2 : i < 5 ? 0 : null }));
const disagreements = (c: ReturnType<ReturnType<typeof kit>['core']>) =>
  (c.diagnostics() as Array<{ kind: string; attemptId?: string; field?: string }>).filter((d) => d.kind === 'source-disagreement' && d.attemptId === A);

describe('#266 Q1: an XML * row with no time (DERIVATIONS §4.6(b), §4.11; recorded jarni-so-odp K1W_BR2_18:16, an XML * row 25 s after the start)', () => {
  it('§4.6(b) channel xml vs on-course stream: an XML * row with no time raises no source-disagreement and moves no presented gates', () => {
    const k = kit(A, P);
    const c = k.core();
    c.applyUnit(xmlRead(iso(0), null, '') as never); // a first read: binds the course; the 105 row (blank status) states nothing
    c.applyUnit(k.listing(iso(5), iso(-20)));
    c.applyUnit([k.obs('gates', 'tcp', 'inference', iso(10), streamCells, { provisional: true })]);
    const before = structuredClone(field(c, A, 'gates'));
    expect(before, 'precondition (on-course stream): the stream\'s gates are presented, with a judged cell').toMatchObject({ state: 'known', source: 'tcp' });
    expect(before.value[0], 'precondition: gate 1 holds the judged penalty 2').toEqual({ number: 1, penalty: 2 });
    expect(disagreements(c), 'precondition: none before the xml * row').toEqual([]);

    c.applyUnit(xmlRead(iso(30), iso(20), '*') as never); // content age later than the stream's delivery: admitted
    expect(disagreements(c), 'no source-disagreement on the * row\'s Attempt').toEqual([]);
    expect(field(c, A, 'gates'), 'presented gates unchanged: value and envelope').toEqual(before);
  });
});
