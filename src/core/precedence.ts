/**
 * Which retained observation is presented (INV-2 rules 1-4, INV-2b, INV-2c). Pure functions of the retained slots, so a
 * connection event moves nothing by itself: continuity is compared through each slot's `epoch`, and every comparison
 * is between the two observations as they were ingested.
 */
import type { FieldSlots, ResultMark, Slot } from './types.js';

/** `null` fails every content-age comparison (INV-2c). */
export const newerContent = (candidate: Slot, presented: Slot): boolean => candidate.age !== null && candidate.age > presented.at;

/** Rule 2: `tcp` wins while connected since it was ingested; otherwise the later-ingested wins, under INV-2c's guard. */
export function choose(tcp: Slot | undefined, xml: Slot | undefined): Slot | undefined {
  if (tcp === undefined || xml === undefined) return tcp ?? xml;
  if (xml.seq < tcp.seq) return tcp;
  return xml.epoch > tcp.epoch && newerContent(xml, tcp) ? xml : tcp;
}

/** Rules 1-4 for an ordinary field. */
export function present(fs: FieldSlots | undefined): Slot | undefined {
  if (fs === undefined) return undefined;
  if (fs.operator !== undefined) return fs.operator;
  const row = choose(fs.tcp, fs.xml);
  if (row === undefined) return fs.inference;
  // a retraction takes the result away, not what the stream states after it
  if (row.marker === true && fs.inference !== undefined && fs.inference.seq > row.seq) return fs.inference;
  return row;
}

const MARKS: ReadonlySet<unknown> = new Set<ResultMark>(['non-ranked', 'dns', 'dnf', 'dsq', 'dsq-r', 'dqb', 'cap', 'ral', 'other']);
export const isMark = (v: unknown): v is ResultMark => MARKS.has(v);

/** No lifecycle evidence of its own: what a row with no result, or a retraction, leaves behind. */
const isFloor = (slot: Slot): boolean => slot.value === 'not-started';
/** Rule 2's exception: none of these is a mark, and none can be a finish. */
const SILENT_PATH: ReadonlySet<unknown> = new Set(['not-started', 'at-start', 'left-without-finish']);

/**
 * `status`: the `tcp` view is its result rows over the stream, and rule 2 runs between that view and the XML, with the
 * exception for a mark set on a silent path, under the same guard.
 */
export function presentStatus(fs: FieldSlots | undefined): Slot | undefined {
  if (fs === undefined) return undefined;
  const { tcp, xml, inference } = fs;
  const view = tcp !== undefined && !isFloor(tcp) ? tcp : (inference ?? tcp);
  if (xml === undefined) return view;
  if (view === undefined) return xml;
  if (isFloor(xml)) return isFloor(view) && xml.seq > view.seq ? xml : view;
  if (isMark(xml.value) && SILENT_PATH.has(view.value)) return newerContent(xml, view) ? xml : view;
  return choose(view, xml);
}

/** Whether an XML candidate lost to `tcp` only on the guard (a refusal), for the counters. */
export const refusedByGuard = (tcp: Slot, xml: Slot): boolean => xml.seq > tcp.seq && xml.epoch > tcp.epoch && !newerContent(xml, tcp);

const comparable = (slot: Slot): string => {
  if (slot.state !== 'known') return slot.state;
  if (Array.isArray(slot.value)) return JSON.stringify(slot.value.map((g: { number?: unknown; penalty?: unknown }) => [g.number, g.penalty]));
  return JSON.stringify(slot.value);
};

/** INV-2b: the two sources differ, both settled, and the snapshot's content is later than the `tcp` observation it disagrees with. */
export const disagree = (tcp: Slot | undefined, xml: Slot | undefined): boolean =>
  tcp !== undefined && xml !== undefined && newerContent(xml, tcp) && comparable(tcp) !== comparable(xml);
