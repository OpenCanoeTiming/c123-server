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
  /** A later TCP row of bib 56 that states gate 13 as clean (the presented penalty moves 2 -> 0): a protest-style correction. */
  correction: (): Unit => tcp(derived(R19.c4RowB, {
    observedAt: new Date(Date.parse(R19.rcXml.observedAt) + 60_000).toISOString(),
    edit: (d) => d.replace(/Gates="((?:...){12})(...)/, 'Gates="$1  0').replace(/ Pen="\d+"/, ' Pen="0"'),
  })),
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
