import { describe, it, expect } from 'vitest';
import { coreWith } from './streams.js';
import { parseXmlSnapshot } from '../../ingest/index.js';
import { ctx, OBSERVED_AT } from '../../ingest/__tests__/helpers.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

// DERIVATIONS §4.10 "`bib` is the race bib" (PR #355), CONTRACTS §1.3; issue #335 (M2 P2, orchestrator ruling: a core test, not a vector).
// The XML is the recorded cp3-cross WX1_XER_26 excerpt written out below (rows as recorded, trimmed to the fields read).
type Std = { standingKey: string; entries: Array<Record<string, any>> };
const row = (id: string, bib: string, rt: string, rnk: string): string =>
  `<Results><RaceId>WX1_XER_26</RaceId><Id>${id}</Id><StartOrder>1</StartOrder><Bib>${bib}</Bib><Status /><Rnk>${rnk}</Rnk><RnkOrder>${rnk}</RnkOrder><RecordType>${rt}</RecordType><HeatNr>0</HeatNr></Results>`;
const XML =
  '<?xml version="1.0" standalone="yes"?>\r\n<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd"><Schedule><RaceId>WX1_XER_26</RaceId><RaceOrder>13</RaceOrder><ClassId>WX1</ClassId><DisId>XER</DisId><CourseNr>1</CourseNr><RaceStatus>5</RaceStatus></Schedule>' +
  row('121081.WX1', 't   13', 'T', '9') + row('61039.WX1', '7', 'F', '1') + '</Canoe123Data>';

describe('#335 the classification Standing presents the plain bib', () => {
  it('DERIVATIONS §4.10: the classification Standing presents bib "13" for an XER row written "t   13"', () => {
    const c = coreWith([]);
    const els = parseXmlSnapshot(XML, ctx()) as unknown as GivenElement[];
    const rewrite = { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: OBSERVED_AT, changedAfter: new Date(Date.parse(OBSERVED_AT) - 5000).toISOString() } as unknown as GivenElement;
    c.applyUnit([rewrite, ...els]);
    const st = c.notifications().filter((m) => m.type === 'standing.updated').map((m) => m['standing'] as Std).filter((s) => s.standingKey === 'classification:WX1_XER_26/all');
    expect(st.length).toBeGreaterThan(0);
    const rows = st.at(-1)!.entries.map((e) => [e['entryId'], e['bib'], e['decidedIn']]);
    expect(rows).toEqual(expect.arrayContaining([['121081.WX1', '13', 'T'], ['61039.WX1', '7', 'F']]));
    expect(rows).toHaveLength(2);
  });
});
