/**
 * Recorded excerpts as ingest units for the #210 tests (cut from the recordings, fixtures under src/core/__tests__/fixtures; expected values are
 * read from the recorded text, never from an implementation). Every call builds fresh data.
 *
 *   odp:  2026-04-18 jarni-so-odp, C1M_BR2_18 bib 56 (RIHA Vitek): on-course listings, a finish, the result rows, the closing listing,
 *         then a RaceConfig and the XML snapshot (Classes, Participants with Birthdate 2014, Schedule, CourseData, Results with gates; gate 13 = 2).
 *   jne:  2026-04-19 jarni-ne-do, K1M_BR2_19 bib 22: a result row whose Gates cell holds text (two unparseable-cell diagnostics), then the XML snapshot.
 *   nkz:  2026-09-19 nkz-19so, C1M_BR1_19 bib 7: run 1 (listing, row, finish), the row wiped (retraction), then run 2 (start, row, finish).
 */
import { REC } from '../../core/__tests__/fixtures/real-excerpts.js';
import { R19 } from '../../core/__tests__/fixtures/round19-excerpts.js';
import { EMPTY_ONCOURSE, feedTcp, feedXml, derived, type Env } from './onsite-harness.js';

export interface Unit { kind: 'tcp' | 'xml'; rec: { observedAt: string; data: string } }
const tcp = (rec: { observedAt: string; data: string }): Unit => ({ kind: 'tcp', rec });
const xml = (rec: { observedAt: string; data: string }): Unit => ({ kind: 'xml', rec });
const byTime = (us: Unit[]): Unit[] => [...us].sort((a, b) => Date.parse(a.rec.observedAt) - Date.parse(b.rec.observedAt));

export const ODP = {
  day: '2026-04-18',
  startAt: '2026-04-18T13:00:00.000Z',
  phaseId: 'C1M_BR2_18',
  classId: 'C1M',
  attemptId: 'C1M_BR2_18:56',
  /** The recorded gate 13 penalty of bib 56 in the XML snapshot, and the instant after it at which a derived TCP row states 0 for it. */
  gate: 13,
  penaltyInXml: 2,
  birthYear: 2014,
  units: (): Unit[] => byTime([tcp(R19.c4Stage), tcp(R19.c4Start), tcp(R19.c4RowA), tcp(R19.c4Finish), tcp(R19.c4Corr), tcp(R19.c4RowB), tcp(R19.c4Closed), tcp(R19.rc19), xml(R19.rcXml)]),
  xmlRec: () => R19.rcXml,
  /**
   * A TCP row of bib 56 that restates the presented run (the recorded row C4RowA: Time 81.62, rank 11) with only the target gate changed, as upstream\'s correction
   * does: gate 13 stated as `value`, Pen and Total following from it. A row that restated another run (a different Time) would be refused as a contradicted row
   * and never reach the echo rule (INV-2 rule 4).
   */
  restate: (value: 0 | 2 | 50, ms: number): Unit => tcp(derived(R19.c4RowA, {
    observedAt: new Date(ms).toISOString(),
    edit: (d) => d.replace(/Gates="((?:...){12})(...)/, (_m, a) => `Gates="${a as string}${String(value).padStart(3, ' ')}`)
      .replace(/ Pen="\d+"/, ` Pen="${value}"`).replace(/ Total="[^"]*"/, ` Total="${(81.62 + value).toFixed(2)}"`),
  })),
  /**
   * Like `restate`, for the recorded snapshot\'s own run (Time 120.98, rank 60, the run an XML-only lifetime presents): a TCP row with only gate 13 changed to `value`.
   */
  restate120: (value: 0 | 2 | 50, ms: number): Unit => tcp(derived(R19.c4RowB, {
    observedAt: new Date(ms).toISOString(),
    edit: (d) => d.replace(/Gates="((?:...){12})(...)/, (_m, a) => `Gates="${a as string}${String(value).padStart(3, ' ')}`)
      .replace(/ Pen="\d+"/, ` Pen="${value}"`).replace(/ Total="[^"]*"/, ` Total="${(120.98 + value).toFixed(2)}"`),
  })),
  /** A later TCP row of bib 56 that states gate 13 as clean (the presented penalty moves 2 -> 0): a protest-style correction, a restatement of the presented run. */
  correction: (): Unit => ODP.restate(0, Date.parse(R19.rcXml.observedAt) + 60_000),
  /** RaceConfig with splits armed: the same recorded message with NrSplits changed (a derived case). */
  raceConfigArmed: (): Unit => tcp(derived(R19.rc19, {
    observedAt: new Date(Date.parse(R19.rcXml.observedAt) + 90_000).toISOString(),
    edit: (d) => d.replace('NrSplits="0"', 'NrSplits="2"'),
  })),
  /** A TCP row of bib 56 after the snapshot (which binds the Phase to its Course) whose first two gate cells hold text: two unparseable-cell diagnostics (§1.3). */
  textRow: (): Unit => tcp(derived(R19.c4RowB, {
    observedAt: new Date(Date.parse(R19.rcXml.observedAt) + 60_000).toISOString(),
    edit: (d) => d.replace(/Gates="(...)(...)/, 'Gates="poz or'),
  })),
  /** The same row restated later with the text gone (the recorded cells): the diagnostics are no longer current. */
  cleanRow: (): Unit => tcp(derived(R19.c4RowB, { observedAt: new Date(Date.parse(R19.rcXml.observedAt) + 70_000).toISOString() })),
  /** The text row received again, unchanged. */
  textRowAgain: (): Unit => tcp(derived(R19.c4RowB, {
    observedAt: new Date(Date.parse(R19.rcXml.observedAt) + 65_000).toISOString(),
    edit: (d) => d.replace(/Gates="(...)(...)/, 'Gates="poz or'),
  })),
  /** A Results row of bib 56 received at `ms` (a non-listing TCP message: where a leave may be derived, DERIVATIONS §4.1). */
  rowAt: (ms: number): Unit => tcp(derived(R19.c4RowB, { observedAt: new Date(ms).toISOString() })),
  /** The recorded result row of bib 56 with its class given as the hyphenated `C1M-ST` while the RaceId keeps its prefix `C1M` (§2.3: ClassId is upstream's own, never the RaceId prefix). */
  hyphenRow: (): Unit => tcp(derived(R19.c4RowB, { edit: (d) => d.replace('ClassId="C1M"', 'ClassId="C1M-ST"') })),
  /** The snapshot first, then the listings and rows (§7.3 validates a gate against the Phase's course, which only the snapshot binds). */
  unitsXmlFirst: (): Unit[] => { const u = ODP.units(); return [u.find((x) => x.kind === 'xml')!, ...u.filter((x) => x.kind !== 'xml')]; },
  /**
   * The recorded snapshot restating the presented run of bib 56 with only gate 13 changed to `value`, Pen and Total following. Which run is presented depends on the order the stream arrived in: with the snapshot first the TCP rows win and the presented run is 81.62 (rank 11, the default `run: 81`); in the recorded order (snapshot last) the held 120.98 run is presented and `run: 120` restates that one. An XML row carrying a finish that the core holds as contradicted is refused (INV-2d), so a snapshot for a lifetime that holds a contradiction must restate the presented run:
   * a snapshot written after the correction. (The recorded snapshot\'s own row, Time 120.98, is another state and would be held against the TCP row.)
   */
  xmlWithGate13: (value: 0 | 2 | 50, run: 81 | 120 = 81): Unit => ({ kind: 'xml', rec: derived(R19.rcXml, { edit: (d) => {
    let e = d.replace(/<Gates>((?:...){12})(...)/, (_m, a) => `<Gates>${a as string}${String(value).padStart(3, ' ')}`).replace(/<Pen>2<\/Pen>/, `<Pen>${value}</Pen>`);
    if (run === 120) return e.replace(/<Total>122980<\/Total>/, `<Total>${120980 + value * 1000}</Total>`); // the recorded snapshot\'s own run (Time 120.98), only the gate changed
    e = e.replace(/<Time>120980<\/Time>/, '<Time>81620</Time>').replace(/<Total>122980<\/Total>/, `<Total>${81620 + value * 1000}</Total>`)
      .replace(/<dtStart>[^<]*<\/dtStart>/, '<dtStart>15:51:40.580</dtStart>') // the presented run\'s start (the TCP finish listing): Time 81.62 ends at the recorded finish 15:53:02.200
      .replace(/<Rnk>\d+<\/Rnk>/, '<Rnk>11</Rnk>').replace(/<RnkOrder>\d+<\/RnkOrder>/, '<RnkOrder>11</RnkOrder>')
      .replace(/<TotalRnk>\d+<\/TotalRnk>/, '<TotalRnk>11</TotalRnk>').replace(/<TotalRnkOrder>\d+<\/TotalRnkOrder>/, '<TotalRnkOrder>11</TotalRnkOrder>');
    return e;
  } }) }),
  /** The recorded snapshot with bib 56 a team boat (`IsTeam` true): a derived case, the recorded text is otherwise unchanged. */
  teamXml: (): Unit => ({ kind: 'xml', rec: derived(R19.rcXml, { edit: (d) => d.replace('<IsTeam>false</IsTeam>', '<IsTeam>true</IsTeam>') }) }),
  /** The row an echo is: the presented run restated with gate 13 stated as `value`, received at `ms` (see `restate`). */
  echo: (value: 0 | 2 | 50, ms: number): Unit => ODP.restate(value, ms),
  /** The re-run wizard\'s wipe: the row of bib 56 gone from the table (a start-list row with nothing stated). */
  wipe: (ms: number): Unit => tcp(derived(R19.c4RowB, {
    observedAt: new Date(ms).toISOString(),
    edit: (d) => d.replace('Current="Y"', 'Current="N"').replace('SubTitle="1st and 2nd Run"', 'SubTitle="1st and 2nd Run - Start List"')
      .replace(/ Pen="\d+"/, ' Pen=""').replace(/ Gates="[^"]*"/, ' Gates=""').replace(/ Time="[^"]*"/, ' Time=""').replace(/ Total="[^"]*"/, ' Total=""')
      .replace(/ Rank="\d*"/, ' Rank=""').replace(/ RankOrder="\d*"/, ' RankOrder=""').replace(/ Behind="[^"]*"/, ' Behind=""'),
  })),
  /** The listing of a new start of bib 56 (a different dtStart, no finish): the generation increments (DERIVATIONS §4.11). */
  rerun: (ms: number): Unit => tcp(derived(R19.c4Start, { observedAt: new Date(ms).toISOString(), edit: (d) => d.replace(/dtStart="[^"]*"/, 'dtStart="17:40:00.000"') })),
  emptyAt: (ms: number): Unit => tcp({ observedAt: new Date(ms).toISOString(), data: EMPTY_ONCOURSE }),
  /** `n` listings of different bibs (derived from the recorded start listing), Position `positions[i]` or none for null: courseOrder = Position (DERIVATIONS §4.8). */
  listings: (positions: (string | null)[], bibs: number[], startOrders: number[]): Unit[] => positions.map((pos, i) => tcp(derived(R19.c4Start, {
    observedAt: new Date(Date.parse(R19.c4Start.observedAt) + 10_000 + i * 100).toISOString(),
    edit: (d) => {
      const bib = bibs[i]!;
      let e = d.replace(/Bib="\d+"/, `Bib="${bib}"`).replace(/StartOrder="\d+"/, `StartOrder="${startOrders[i]!}"`).replace(/Id="[^"]*"/, `Id="9${bib}.C1M"`);
      e = pos === null ? e.replace(/ Position="\d+"/, '') : e.replace(/Position="\d+"/, `Position="${pos}"`);
      return e;
    },
  }))),
};

export const JNE = {
  day: '2026-04-19',
  startAt: '2026-04-19T08:00:00.000Z',
  phaseId: 'K1M_BR2_19',
  attemptId: 'K1M_BR2_19:22',
  /** The recorded row has text in its Gates cell. */
  units: (): Unit[] => byTime([tcp(REC.j1Row), xml(REC.j2Xml)]),
  /** The same row restated at a later instant with the text cells blanked: the diagnostics are no longer current. */
  restated: (): Unit => tcp(derived(REC.j1Row, {
    observedAt: new Date(Date.parse(REC.j2Xml.observedAt) + 5_000).toISOString(),
    edit: (d) => d.replace(/Gates="[^"]*"/, `Gates="${' '.repeat(80)}"`),
  })),
  sameRow: (): Unit => tcp(derived(REC.j1Row, { observedAt: new Date(Date.parse(REC.j2Xml.observedAt) + 2_000).toISOString() })),
};

/** cp3-cross, a Kayak Cross heat WX1_XF_26 (TCP only): a Cross Phase for the `cross` refusal. */
export const CROSS = {
  day: '2026-04-26',
  startAt: '2026-04-26T10:00:00.000Z',
  phaseId: 'WX1_XF_26',
  units: (): Unit[] => [tcp(R19.xfStartList), tcp(R19.xfFinal)],
  /** A bib of the recorded final. */
  bib: ((): string => /<Participant Bib="\s*(\d+)"/.exec(R19.xfFinal.data)![1]!)(),
};

export const NKZ = {
  day: '2026-09-19',
  startAt: '2026-09-19T10:00:00.000Z',
  phaseId: 'C1M_BR1_19',
  attemptId: 'C1M_BR1_19:7',
  /** Run 1, the wipe (retraction), the row gone, then run 2 (§4 INV-7, ADR-013). */
  units: (): Unit[] => byTime([tcp(REC.n1Start), tcp(REC.n2Row), tcp(REC.n3Finish), tcp(REC.n4Wiped), tcp(REC.n5Gone), tcp(REC.n6Start), tcp(REC.n7Row), tcp(REC.n8Finish)]),
};

export async function feed(env: Env, u: Unit): Promise<void> {
  if (u.kind === 'tcp') await feedTcp(env, u.rec);
  else await feedXml(env, u.rec);
}
