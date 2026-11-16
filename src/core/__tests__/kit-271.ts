/**
 * Builders shared by the #271 / #358 core tests: a hand-written XML snapshot of one slalom race as Canoe123 writes it (so the real parser
 * states the rows, `CatId`, `CatRnk`), and the ingest of it through the reader's unit. No shared mutable state: every call builds fresh text.
 */
import { at } from './kit.js';
import { xmlUnit, type Unit } from './streams.js';

export const RACE = 'K1M_BR1_19';
export const DAY = '2026-09-19';

export interface XmlRow {
  id: string; // `<entry>.K1M`
  bib: string;
  catId: string;
  /** Rnk and RnkOrder; undefined = an unplaced row. */
  rnk?: number;
  catRnk?: number;
  /** milliseconds; undefined = no time. */
  timeMs?: number;
  status?: string;
  /** Raw extra elements of the Results row (a second run's Prev and Total columns). */
  extra?: string;
}

const results = (race: string, r: XmlRow): string =>
  `<Results><RaceId>${race}</RaceId><Id>${r.id}</Id><StartOrder>${r.bib}</StartOrder><Bib>${r.bib.padStart(4, ' ')}</Bib><StartTime>9:21:00</StartTime>` +
  `<Status>${r.status ?? ''}</Status>` +
  (r.timeMs !== undefined ? `<dtStart>09:21:01.000</dtStart><dtFinish>09:22:${String(Math.floor(r.timeMs / 1000) % 60).padStart(2, '0')}.000</dtFinish><Time>${r.timeMs}</Time><Pen>0</Pen><Total>${r.timeMs}</Total>` : '') +
  (r.rnk !== undefined ? `<Rnk>${r.rnk}</Rnk><RnkOrder>${r.rnk}</RnkOrder>` : '') +
  (r.catRnk !== undefined ? `<CatRnk>${r.catRnk}</CatRnk><CatRnkOrder>${r.catRnk}</CatRnkOrder>` : '') +
  `<CatId>${r.catId}</CatId>${r.extra ?? ''}<RecordType /><BetterRunNr>0</BetterRunNr><HeatNr>0</HeatNr></Results>`;

const participant = (r: XmlRow): string =>
  `<Participants><Id>${r.id}</Id><ClassId>K1M</ClassId><EventBib>${r.bib}</EventBib><ICFId>${r.id.split('.')[0]}</ICFId><FamilyName>N${r.bib}</FamilyName><GivenName>G</GivenName><Club>C</Club><CatId>${r.catId}</CatId><IsTeam>false</IsTeam></Participants>`;

/** One XML file: Schedule of the race, the participants and the race's Results rows. */
export function xmlFile(rows: XmlRow[], race = RACE): string {
  const sched = `<Schedule><RaceId>${race}</RaceId><RaceOrder>1</RaceOrder><StartTime>2026-09-19T09:15:00+02:00</StartTime><Time>09:15:00</Time><ClassId>K1M</ClassId><DisId>${race.split('_')[1]}</DisId><CourseNr>1</CourseNr><RaceStatus>5</RaceStatus></Schedule>`;
  return `<?xml version="1.0" standalone="yes"?><Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">${sched}${rows.map(participant).join('')}${rows.map((r) => results(race, r)).join('')}</Canoe123Data>`;
}

/** The reader's unit for that file: the rewrite event with the content age `ageAt`, then the parser's elements. */
export function xmlSnapshotUnit(rows: XmlRow[], t: number, ageAt: number | null, race = RACE): Unit {
  return xmlUnit({ recording: 'hand', chunk: 'hand', ts: 0, observedAt: at(t), data: xmlFile(rows, race) }, { [race]: DAY }, ageAt === null ? null : at(ageAt));
}
