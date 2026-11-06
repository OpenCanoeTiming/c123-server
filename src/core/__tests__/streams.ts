/**
 * Builders for the core tests (#203): the stream as the server will feed it, `parseTcp` / `parseXmlSnapshot` output in unchanged,
 * the connection's `tcp-connected` / `tcp-disconnected` and the reader's `xml-rewrite-detected` (DERIVATIONS §0.3 "What the reader
 * stamps": the event first, then the snapshot's elements, one unit). No shared mutable state: every call builds fresh, frozen data.
 */
import { createMergeCore } from '../index.js';
import { parseTcp, parseXmlSnapshot } from '../../ingest/index.js';
import { ctx as ingestCtx } from '../../ingest/__tests__/helpers.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';
import type { Rec } from './fixtures/real-excerpts.js';

export type Unit = GivenElement[];

const deepFreeze = <T>(o: T): T => {
  if (typeof o === 'object' && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

/** The ingest context of a recorded excerpt: its own receipt time, the venue's zone and the Phase dates the excerpt's phases have. */
export const ctxFor = (rec: Rec, phaseDates: Record<string, string>): ReturnType<typeof ingestCtx> =>
  ingestCtx({ observedAt: rec.observedAt, phaseDates: { ...ingestCtx().phaseDates, ...phaseDates } });

export const connected = (observedAt: string): Unit => deepFreeze([{ ingestSeq: 0, event: 'tcp-connected', observedAt }]);
export const disconnected = (observedAt: string): Unit => deepFreeze([{ ingestSeq: 0, event: 'tcp-disconnected', observedAt }]);

/** One recorded TCP message through `parseTcp`: the unit as the parser emits it. */
export const tcpUnit = (rec: Rec, phaseDates: Record<string, string>): Unit =>
  deepFreeze(parseTcp(rec.data, ctxFor(rec, phaseDates)) as Unit);

/** One recorded XML snapshot as the reader delivers it: the rewrite event (with `changedAfter`), then `parseXmlSnapshot`'s elements. */
export const xmlUnit = (rec: Rec, phaseDates: Record<string, string>, changedAfter: string | null): Unit =>
  deepFreeze([
    { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: rec.observedAt, changedAfter },
    ...(parseXmlSnapshot(rec.data, ctxFor(rec, phaseDates)) as Unit),
  ]);

/** A fresh core with the units applied in order. */
export function coreWith(units: Unit[]): MergePort {
  const core = createMergeCore({}) as MergePort;
  for (const u of units) core.applyUnit(u);
  return core;
}

/** An attribute of the first `<tag ...>` in recorded text, for expected values taken from the record, not from the parser. */
export function attrOf(data: string, tag: string, name: string): string {
  const el = new RegExp(`<${tag}\\b[^>]*>`).exec(data)?.[0];
  const v = el === undefined ? undefined : new RegExp(`\\b${name}="([^"]*)"`).exec(el)?.[1];
  if (v === undefined) throw new Error(`no ${tag}@${name} in the recorded text`);
  return v;
}

/** `dtFinish="12:48:36.640"` is the venue's local time of day; `offset` is its UTC offset on that date (+02:00 in CEST). */
export const instantOf = (date: string, timeOfDay: string, offset: string): string => new Date(`${date}T${timeOfDay}${offset}`).toISOString();
