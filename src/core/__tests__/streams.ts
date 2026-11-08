/**
 * Builders for the core tests (#203): the stream as the server will feed it, `parseTcp` / `parseXmlSnapshot` output in unchanged,
 * the connection's `tcp-connected` / `tcp-disconnected` and the reader's `xml-rewrite-detected` (DERIVATIONS §0.3 "What the reader
 * stamps": the event first, then the snapshot's elements, one unit). No shared mutable state: every call builds fresh, frozen data.
 */
import { createMergeCore } from '../index.js';
import { parseTcp, parseXmlSnapshot } from '../../ingest/index.js';
import { splitRaceId } from '../../ingest/common.js';
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
export const ctxFor = (rec: Rec, phaseDates: Record<string, string>, over: Record<string, unknown> = {}): ReturnType<typeof ingestCtx> =>
  ingestCtx({ observedAt: rec.observedAt, phaseDates: { ...ingestCtx().phaseDates, ...phaseDates }, ...over });

export const connected = (observedAt: string): Unit => deepFreeze([{ ingestSeq: 0, event: 'tcp-connected', observedAt }]);
export const disconnected = (observedAt: string): Unit => deepFreeze([{ ingestSeq: 0, event: 'tcp-disconnected', observedAt }]);

/** One recorded TCP message through `parseTcp`: the unit as the parser emits it. */
export const tcpUnit = (rec: Rec, phaseDates: Record<string, string>, over: Record<string, unknown> = {}): Unit =>
  deepFreeze(parseTcp(rec.data, ctxFor(rec, phaseDates, over)) as Unit);

/** One recorded XML snapshot as the reader delivers it: the rewrite event (with `changedAfter`), then `parseXmlSnapshot`'s elements. */
export const xmlUnit = (rec: Rec, phaseDates: Record<string, string>, changedAfter: string | null, over: Record<string, unknown> = {}): Unit =>
  deepFreeze([
    { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: rec.observedAt, changedAfter },
    ...(parseXmlSnapshot(rec.data, ctxFor(rec, phaseDates, over)) as Unit),
  ]);

/** A recorded message received at another moment, or with its text edited: the only way a derived (not recorded) case is built. */
export const derive = (rec: Rec, over: { observedAt?: string; edit?: (data: string) => string }): Rec => ({
  ...rec,
  observedAt: over.observedAt ?? rec.observedAt,
  data: over.edit ? over.edit(rec.data) : rec.data,
});

/** An operator-visible event the recordings do not hold (TEST-ARCHITECTURE §9): the closure of an Attempt's run. */
export const left = (attemptId: string, observedAt: string): Unit => deepFreeze([{ ingestSeq: 0, event: 'oncourse-left', attemptId, observedAt }]);

/**
 * Round 27d-2 (CONTRACTS §2.7, §5 step 1): a Standing is published only once its Phase has a `classId`, which the parsers state from `Results@ClassId` or
 * `Schedule.ClassId`. Hand streams here name Phases with no such element; the harness convention (CONFORMANCE-VECTORS §1: a Phase no element has described
 * has the id's class part as its `classId`) is applied once, here: before the first unit that names a Phase, the observation the parser would emit.
 * A test's own `classId` element is never overridden (it is seen first). Nothing else about a unit changes.
 */
function withClassIds(core: MergePort): MergePort {
  const stated = new Set<string>();
  const phasesOf = (el: Record<string, any>): string[] => [
    el['snapshot']?.phaseId, el['phaseId'], typeof el['attemptId'] === 'string' ? (el['attemptId'] as string).slice(0, (el['attemptId'] as string).lastIndexOf(':')) : undefined,
  ].filter((x): x is string => typeof x === 'string' && x !== '');
  const apply = core.applyUnit.bind(core);
  core.applyUnit = (unit) => {
    const extra: Record<string, unknown>[] = [];
    for (const el of unit as Record<string, any>[]) {
      if (el['field'] === 'classId' && typeof el['phaseId'] === 'string') stated.add(el['phaseId']);
    }
    for (const el of unit as Record<string, any>[]) {
      for (const id of phasesOf(el)) {
        if (stated.has(id)) continue;
        stated.add(id);
        extra.push({ ingestSeq: 0, observedAt: el['observedAt'], field: 'classId', phaseId: id, source: 'tcp', kind: 'result-row', value: splitRaceId(id).classKey, confidence: 'authoritative' });
      }
    }
    return apply([...extra, ...unit] as typeof unit);
  };
  return core;
}

/** A fresh core with the units applied in order. */
export function coreWith(units: Unit[], options: Record<string, unknown> = {}): MergePort {
  // `classIdsFromIds: false` is the one opt-out: a test of what happens while a Phase's class is still unknown (round 27 deferral)
  const { classIdsFromIds = true, ...coreOptions } = options;
  const raw = createMergeCore(coreOptions) as MergePort;
  const core = classIdsFromIds === false ? raw : withClassIds(raw);
  for (const u of units) core.applyUnit(u);
  return core;
}

/** An attribute of the first `<tag ...>` carrying it, in recorded text, for expected values taken from the record, not from the parser. */
export function attrOf(data: string, tag: string, name: string): string {
  // The first <tag> that carries the attribute: an on-course message holds two <Result> elements (Type C has the dates, Type T the Time).
  for (const el of data.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))) {
    const v = new RegExp(`\\b${name}="([^"]*)"`).exec(el[0])?.[1];
    if (v !== undefined) return v;
  }
  throw new Error(`no ${tag}@${name} in the recorded text`);
}

/** `dtFinish="12:48:36.640"` is the venue's local time of day; `offset` is its UTC offset on that date (+02:00 in CEST). */
export const instantOf = (date: string, timeOfDay: string, offset: string): string => new Date(`${date}T${timeOfDay}${offset}`).toISOString();
