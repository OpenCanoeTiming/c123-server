import { describe, expect, it } from 'vitest';
import { parseComma, parseFixedWidth, parseLayout, fabricatedCourse } from '../src/gates.js';
import { parseTcp } from '../src/tcp.js';
import { readSnapshot } from '../src/snapshot.js';
import { eventTimeOf } from '../src/util.js';
import { markOf, phaseStatus } from '../src/ingest.js';
import { formatFromRaceId } from '../src/format.js';

describe('DERIVATIONS §4.6 gate strings', () => {
  it('fixed width: 3 characters per cell, chunked from the left, blanks kept in place', () => {
    const s = '  0  2      50' + ' '.repeat(76);
    expect(parseFixedWidth(s, 6).cells).toEqual([0, 2, null, null, 50, null]);
  });
  it('a non-integer cell parses as null and raises unparseable-cell', () => {
    const p = parseFixedWidth('  0poz  2', 3);
    expect(p.cells).toEqual([0, null, 2]);
    expect(p.unparseable).toEqual([{ slot: 2, text: 'poz' }]);
  });
  it('comma form keeps the first slotCount tokens', () => {
    expect(parseComma('0,0,2,,,', 4).cells).toEqual([0, 0, 2, null]);
  });
});

describe('DERIVATIONS §2.3 layout', () => {
  it('S and I make no slot; D and E are slots that do not advance the gate number', () => {
    const l = parseLayout('DNNRNNNER');
    expect(l.gates.length).toBe(7);
    expect(l.slots.length).toBe(9);
    expect(l.slots[0]).toMatchObject({ kind: 'start-ramp' });
    expect(l.slots[7]).toMatchObject({ kind: 'roll-zone' });
    const s = parseLayout('RNNNSNRNSN');
    expect(s.gates.length).toBe(8);
    expect(s.sectorEndsAfterGate).toEqual([4, 7]);
  });
  it('fabricated course signatures', () => {
    expect(fabricatedCourse('', '', 30)).toBe(true);
    expect(fabricatedCourse('NNR', '', 3)).toBe(true);
    expect(fabricatedCourse('NNR', '1,2,3', 25)).toBe(true);
    expect(fabricatedCourse('NNR', '1,2,3', 3)).toBe(false);
  });
});

describe('DERIVATIONS §0.2 eventTime', () => {
  it('phase date + time of day + venue zone, expressed in UTC', () => {
    expect(eventTimeOf('2026-09-19', '9:56:18.42', '+02:00')).toBe('2026-09-19T07:56:18.420Z');
    expect(eventTimeOf('2026-09-19', '10:31:37.940', '+02:00')).toBe('2026-09-19T08:31:37.940Z');
  });
  it('no zone: omitted, never guessed', () => {
    expect(eventTimeOf('2026-09-19', '9:56:18.42', null)).toBeNull();
  });
});

describe('TCP messages', () => {
  it('Results rows: padded bib, formatted seconds', () => {
    const m = parseTcp('<Canoe123 System="Main"><Results RaceId="K1M_BR1_19" ClassId="K1M" Current="Y" MainTitle="K1 muži"><Row Number="1"><Participant Bib="  83" Id="35001.K1M" /><Result Type="T" IRM="" Pen="0" Gates="" Time="87.30" Total="87.30" Rank="1" RankOrder="1" PP="" /></Row></Results></Canoe123>');
    expect(m.type).toBe('Results');
    if (m.type !== 'Results') return;
    expect(m.rows[0]!.p.Bib).toBe('  83');
    expect(Number(m.rows[0]!.r.Time)).toBe(87.3);
  });
  it('single-quoted attributes (TimingInput) and the explicit course-empty message', () => {
    expect(parseTcp("<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelSTF' ChannelNr='0' Time='9:56:18.420' /></Canoe123>").type).toBe('TimingInput');
    const e = parseTcp('<Canoe123 System="Main"><OnCourse Total="0" Position="0" /></Canoe123>');
    expect(e.type === 'OnCourse' && e.empty).toBe(true);
  });
});

describe('XML snapshot (§0.1 units, §0.3 validation)', () => {
  const doc = (body: string) => `<?xml version="1.0" standalone="yes"?>\r\n<Canoe123Data xmlns="x">${body}</Canoe123Data>`;
  it('a torn read (no root closing tag) does not validate', () => {
    expect(readSnapshot('<?xml version="1.0"?><Canoe123Data><Results><RaceId>X</RaceId>').ok).toBe(false);
  });
  it('times are integer milliseconds; the sentinel race id is entity-encoded', () => {
    const r = readSnapshot(doc('<Results><RaceId>K1M_BR1_19</RaceId><Bib>   1</Bib><Time>78800</Time><Pen>4</Pen><Gates xml:space="preserve">  0  2</Gates></Results><Schedule><RaceId>&lt;unassigned&gt;</RaceId></Schedule>'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number(r.tables.results[0]!.Time) / 1000).toBe(78.8);
    expect(r.tables.results[0]!.Bib).toBe('   1');
    expect(r.tables.results[0]!.Gates).toBe('  0  2');
    expect(r.tables.schedule[0]!.RaceId).toBe('<unassigned>');
  });
});

describe('closed sets', () => {
  it('race status (CONTRACTS §3.1), marks (DERIVATIONS §4.1), format token (§2.1)', () => {
    expect([0, 1, 8, 12].map(phaseStatus)).toEqual(['scheduled', 'scheduled', 'scheduled', 'scheduled']);
    expect(phaseStatus(3)).toBe('running');
    expect(phaseStatus(99)).toBe('other');
    expect(markOf('DSQ-R')).toBe('dsq-r');
    expect(markOf('NON-RK')).toBe('non-ranked');
    expect(markOf('XYZ')).toBe('other');
    expect(formatFromRaceId('K1M_ST_BR1_6')).toBe('BR1');
    expect(formatFromRaceId('WX1J_XT_26_JUN')).toBe('XT');
  });
});
