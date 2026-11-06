/**
 * Hand-built TCP text in the exact shape of the recorded messages (cut from cp3-cross 07:35:54Z and jarni-ne-do 09:14:06Z, DERIVATIONS §0.5):
 * an `OnCourse` listing and a `Results` push, for streams the recordings do not hold (a boundary, a re-delivery, a re-timed message).
 * Names are invented. Every call builds fresh data; nothing is shared.
 */
import type { Rec } from './fixtures/real-excerpts.js';

export interface ListingSpec {
  race: string;
  bib: number;
  total?: number;
  pos?: number;
  dtStart?: string;
  dtFinish?: string;
  time?: string;
  completed?: boolean;
  gates?: string;
  rank?: string;
}

/** An `OnCourse` message: Participant, `Type="C"` (dates, cells, `Completed`) and `Type="T"` (`Time`) results, as recorded. */
export const listingText = (o: ListingSpec): string =>
  `<Canoe123 System="Main"><OnCourse Total="${o.total ?? 1}" Position="${o.pos ?? 1}"><Participant StartOrder="${o.bib}" Bib="${o.bib}" Id="${o.bib}.K1M" Name="TESTER Hand" Club="TJ Test" Nat="" Race="K1M" RaceId="${o.race}" Warning="" />` +
  `<Result Type="C" Gates="${o.gates ?? ',,,,,'}" Completed="${o.completed === true ? 'Y' : 'N'}" chStart="0" chSplit1="0" chSplit2="0" chFinish="0" dtStart="${o.dtStart ?? ''}" dtSplit1="" dtSplit2="" dtFinish="${o.dtFinish ?? ''}" />` +
  `<Result Type="T" Pen="0" Time="${o.time ?? ''}" Total="0.00" TTBDiff="" TTBName="" Rank="${o.rank ?? ''}" /></OnCourse></Canoe123>`;

/** The bare "course empty" message. */
export const courseEmptyText = (): string => '<Canoe123 System="Main"><OnCourse Total="0" Position="0" /></Canoe123>';

/** A message received at `observedAt`, in the shape of a recorded one. */
export const msg = (observedAt: string, data: string): Rec => ({ recording: 'hand', chunk: 'hand', ts: 0, observedAt, data });

/** `base` plus `ms` milliseconds, as an ISO instant. */
export const plus = (base: string, ms: number): string => new Date(Date.parse(base) + ms).toISOString();
