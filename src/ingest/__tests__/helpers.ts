/**
 * Shared helpers for the #201 parser tests. No shared mutable state: every helper builds fresh data.
 *
 * ASSUMED SHAPES (DERIVATIONS/CONTRACTS do not fix them; #201 says "the same elements the conformance port
 * takes", src/__tests__/conformance/port.ts). If the implementation differs, only this file and `ctx()` change.
 *
 *   parseTcp(message: string, ctx): GivenElement[]      parseXmlSnapshot(xml: string, ctx): GivenElement[]
 *
 *   - A TCP `Results` message and every XML snapshot Phase yield ONE scope-snapshot element
 *     `{ snapshot: { source, phaseId, mode, rows }, observedAt }`; a row is `{ bib, ...resolved fields }` whose keys
 *     are the Attempt field names (`outcome`, `placement`, `pairTotal`, `gates`, `faults`, `heat`, `startLane`,
 *     `startOrder`, `scheduledStart`, `qualified`, `underReview`, `entry`, `countingRun`, `splits`) plus the
 *     vector row keys `status` (a result mark), `timeEmpty`, `finishTime` (XML only), `judgingComplete`.
 *   - An `OnCourse` message yields observation elements `{ field, attemptId, source, kind, value, confidence,
 *     observedAt, eventTime?, judgingComplete? }` (fields: status, outcome, gates, courseOrder, timeToBeat, onCourse).
 *   - Entry/Class/Phase/Course values are observation elements too, addressed by `entryId` / `classId` /
 *     `phaseId` / `courseId` (+ `resource`), `field` = the contract field name.
 *   - Classification rows: `{ push: 'classification', phaseId, body: { rows, asOf } }`.
 *   - A diagnostic is `{ diagnostic: { kind, ... } }`; an unparseable message is `{ unparseable: { reason, ... } }`.
 *   - Not-applicable / not-configured is `{ field, state: 'unavailable', reason }` (no value).
 *   - ctx: see `ctx()`.
 */
import { XML } from './fixtures/xml.js';
import type { GivenElement } from '../../__tests__/conformance/port.js';

export type El = Record<string, any>;
export type Slot = { slot: number; kind: 'gate' | 'start-ramp' | 'roll-zone'; gateNumber?: number; caption?: string };

export const xmlFixture = (name: string): string => {
  const x = XML[name];
  if (x === undefined) throw new Error(`no XML fixture ${name}`);
  return x;
};

/** n slalom gates, slot i = gate i, captions "1".."n". */
export function slalomSlots(n: number): Slot[] {
  return Array.from({ length: n }, (_, i) => ({ slot: i + 1, kind: 'gate' as const, gateNumber: i + 1, caption: String(i + 1) }));
}
/** The recorded 9-slot Kayak Cross course: layout DNNRNNNER, captions ST,1,2,3,4,5,6,RZ,7 (DERIVATIONS 2.3). */
export const CROSS_SLOTS: Slot[] = [
  { slot: 1, kind: 'start-ramp', caption: 'ST' },
  { slot: 2, kind: 'gate', gateNumber: 1, caption: '1' },
  { slot: 3, kind: 'gate', gateNumber: 2, caption: '2' },
  { slot: 4, kind: 'gate', gateNumber: 3, caption: '3' },
  { slot: 5, kind: 'gate', gateNumber: 4, caption: '4' },
  { slot: 6, kind: 'gate', gateNumber: 5, caption: '5' },
  { slot: 7, kind: 'gate', gateNumber: 6, caption: '6' },
  { slot: 8, kind: 'roll-zone', caption: 'RZ' },
  { slot: 9, kind: 'gate', gateNumber: 7, caption: '7' },
];

export const OBSERVED_AT = '2026-09-19T08:00:00.000Z';

/**
 * ASSUMED ctx: `observedAt` (ingest receipt, ISO), `zone` (IANA), `phaseDates` (phaseId -> YYYY-MM-DD, the Phase.date
 * known to the caller), `xmlPollIntervalSeconds`, `courses` (phaseId -> { courseId, slots } bound course),
 * `boundCourseId` (course of the currently running Phase, for RaceConfig), `eventDate` (date of the TimeOfDay clock), `externalIdScheme`.
 */
export function ctx(over: Record<string, unknown> = {}): Record<string, any> {
  return {
    observedAt: OBSERVED_AT,
    zone: 'Europe/Prague',
    phaseDates: {
      K1M_BR1_19: '2026-09-19', K1M_BR2_19: '2026-09-19', C1W_BR1_19: '2026-09-19', FOR_BR1_19: '2026-09-19',
      WX1_XT_26: '2026-04-26', MX1_XT_26: '2026-04-26', WX1J_XS_26_JUN: '2026-04-26', WX1_XS_26: '2026-04-26',
      MX1J_XT_26_JUN: '2026-04-26', WX1_XER_26: '2026-04-26',
    },
    xmlPollIntervalSeconds: 5,
    courses: {
      K1M_BR1_19: { courseId: '1', slots: slalomSlots(23) },
      K1M_BR2_19: { courseId: '1', slots: slalomSlots(23) },
      WX1_XT_26: { courseId: '1', slots: CROSS_SLOTS },
      MX1_XT_26: { courseId: '1', slots: CROSS_SLOTS },
      WX1J_XS_26_JUN: { courseId: '1', slots: CROSS_SLOTS },
      WX1_XS_26: { courseId: '1', slots: CROSS_SLOTS },
      MX1J_XT_26_JUN: { courseId: '1', slots: CROSS_SLOTS },
    },
    boundCourseId: '1',
    eventDate: '2026-09-19',
    externalIdScheme: 'cz-rgc',
    ...over,
  };
}

export const instant = (s: unknown): number => Date.parse(String(s));

export function snapshotOf(els: GivenElement[], phaseId?: string): El {
  const s = (els as El[]).find((e) => e.snapshot && (phaseId === undefined || e.snapshot.phaseId === phaseId));
  if (!s) throw new Error(`no snapshot element${phaseId ? ' for ' + phaseId : ''} in ${JSON.stringify(els).slice(0, 300)}`);
  return s.snapshot;
}
export function rowOf(els: GivenElement[], phaseId: string, bib: string): El {
  const r = (snapshotOf(els, phaseId).rows as El[]).find((x) => x.bib === bib);
  if (!r) throw new Error(`no row ${phaseId}:${bib}`);
  return r;
}
export function obsOf(els: GivenElement[], field: string, key: Record<string, string> = {}): El | undefined {
  return (els as El[]).find((e) => e.field === field && Object.entries(key).every(([k, v]) => e[k] === v));
}
export function allObs(els: GivenElement[], field: string): El[] {
  return (els as El[]).filter((e) => e.field === field);
}
export const diagnostics = (els: GivenElement[]): El[] => (els as El[]).filter((e) => e.diagnostic).map((e) => e.diagnostic);
export const unparseable = (els: GivenElement[]): El[] => (els as El[]).filter((e) => e.unparseable);
export const penalties = (gates: El[]): (number | null)[] => gates.map((g) => g.penalty);
/** Gate[] for the given penalties, numbered 1.. (slalom). */
export const gatesOf = (p: (number | null)[]): El[] => p.map((penalty, i) => ({ number: i + 1, penalty }));

/** Presented mark/lifecycle status of an Attempt: a row's `status`, else an observation `status` for the attempt. */
export function statusOf(els: GivenElement[], phaseId: string, bib: string): unknown {
  for (const e of els as El[]) {
    if (e.snapshot?.phaseId === phaseId) {
      const r = (e.snapshot.rows as El[]).find((x) => x.bib === bib);
      if (r && r.status !== undefined) return r.status;
    }
  }
  return (els as El[]).find((e) => e.field === 'status' && e.attemptId === `${phaseId}:${bib}`)?.value;
}
/** Replace a Results row's attribute inside the one-row fixture (synthetic variant of the recorded row). */
export const withAttr = (msg: string, attr: string, from: string, to: string): string => {
  const a = `${attr}="${from}"`;
  if (!msg.includes(a)) throw new Error(`fixture has no ${a}`);
  return msg.replace(a, `${attr}="${to}"`);
};
