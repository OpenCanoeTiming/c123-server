import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { XER_PREFIX_XML } from './fixtures/xml-xer-prefix.js';
import { ctx, type El } from './helpers.js';

// DERIVATIONS §4.10 "`bib` is the race bib" (PR #355), CONTRACTS §1.3: a classification row's Bib that starts with `t` and
// whitespace is read without them, then trimmed (§0.1); the prefix is no field and is not read as decidedIn. Issue #335 (M2 P2).
const classif = (els: unknown, phaseId: string): El => {
  const e = (els as El[]).find((x) => x.snapshot?.phaseId === phaseId);
  if (!e) throw new Error(`no snapshot for ${phaseId}`);
  return e.snapshot;
};
const xmlRow = (race: string, bib: string, recordType: string, rnk = '1'): string =>
  `<Results><RaceId>${race}</RaceId><Id>${bib.trim()}.X</Id><StartOrder>1</StartOrder><Bib>${bib}</Bib><Status /><Rnk>${rnk}</Rnk><RnkOrder>${rnk}</RnkOrder>` +
  `<RecordType>${recordType}</RecordType><HeatNr>0</HeatNr></Results>`;
const xml = (...rows: string[]): string =>
  `<?xml version="1.0" standalone="yes"?>\r\n<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${rows.join('')}</Canoe123Data>`;
const tcpXer = (...bibs: string[]): string =>
  TCP.resultsXer.replace(/<Row Number="2">.*<\/Row>/s, '').replace('Bib="4"', `Bib="${bibs[0]}"`) .replace('</Row>', '</Row>' +
    bibs.slice(1).map((b, i) => `<Row Number="${i + 2}"><Participant Bib="${b}" Id="${i + 2}.WX1" Name="X Y" Club="C" Nat="" GivenName="Y" FamilyName="X" StartOrder="${i + 2}" StartTime="" /><Result Type="T" HeatNr="0" Q="" IRM="" Pen="" Gates="" Time="" Total="" Rank="${i + 2}" RankOrder="${i + 2}" Behind="" PP="" /></Row>`).join(''));

describe('#335 classification bib time-trial prefix', () => {
  it('DERIVATIONS §4.10: an XER row\'s Bib "t   13" is read as bib "13" (XML)', () => {
    const rows = classif(parseXmlSnapshot(xml(xmlRow('WX1_XER_26', 't   13', 'T', '9'), xmlRow('WX1_XER_26', '7', 'F', '1')), ctx()), 'WX1_XER_26').rows as El[];
    expect(rows.map((r) => [r.bib, r.decidedIn])).toEqual([['13', 'T'], ['7', 'F']]);
  });
  it('DERIVATIONS §4.10: a TCP classification row\'s Bib "t   13" is read as bib "13"', () => {
    const rows = classif(parseTcp(tcpXer('t   13', '7'), ctx()), 'WX1_XER_26').rows as El[];
    expect(rows.map((r) => [r.bib, r.decidedIn])).toEqual([['13', null], ['7', null]]);
  });
  it('DERIVATIONS §4.10: only a leading t followed by whitespace is stripped', () => {
    const rows = classif(parseXmlSnapshot(xml(xmlRow('WX1_XER_26', 't13', 'T', '1'), xmlRow('WX1_XER_26', 'T   13', 'T', '2'), xmlRow('WX1_XER_26', '  13 ', 'F', '3')), ctx()), 'WX1_XER_26').rows as El[];
    expect(rows.map((r) => r.bib)).toEqual(['t13', 'T   13', '13']);
  });
  it('DERIVATIONS §4.10: an Attempt row\'s bib is not read with the classification rule', () => {
    const msg = TCP.resultsXtFault.replace('Bib="  23"', 'Bib="13"');
    const rows = classif(parseTcp(msg, ctx()), 'WX1_XT_26').rows as El[];
    expect(rows.map((r) => r.bib)).toEqual(['13']);
  });
  it('cp3-cross excerpt: every T row\'s bib loses the prefix, F and SF rows unchanged', () => {
    const rows = classif(parseXmlSnapshot(XER_PREFIX_XML, ctx()), 'WX1_XER_26').rows as El[];
    expect(rows.map((r) => [r.bib, r.decidedIn])).toEqual([
      ['4', 'F'], ['1', 'F'], ['5', 'SF'], ['8', 'SF'], ['13', 'T'], ['19', 'T'], ['7', 'T'], ['25', 'T'],
    ]);
    expect(rows.filter((r) => String(r.bib).startsWith('t'))).toEqual([]);
  });
});
