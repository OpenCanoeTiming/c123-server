/**
 * Shapes of the ingest unit (#201). One upstream message or one XML snapshot is one unit: every element it
 * yields shares `source` and `observedAt` (CONTRACTS §1.6, CONFORMANCE-VECTORS §1 "Ingest units").
 *
 * The elements are the vocabulary of the conformance port (`src/__tests__/conformance/port.ts`), minus what only the
 * core can know. `ingestSeq` here is the position inside the unit; the core renumbers.
 *
 * - `{ field, attemptId | entryId | classId | phaseId | courseId, source, kind, value, confidence, observedAt }`
 *   is a resolved observation; `{ field, <key>, source, kind, state: 'unavailable', reason }` states not-applicable /
 *   not-configured; `{ field, <key>, state: 'not-yet' }` is an explicit not-yet.
 * - `{ snapshot: { source, phaseId, mode, rows } }` is a scope snapshot (INV-7).
 * - `{ event }`, `{ diagnostic }`, `{ sourceStatus }`,
 *   `{ unparseable }` (a message that could not be read), `{ unknownType }` (a TCP message type nobody models).
 */
export type IngestElement = { ingestSeq: number; observedAt: string; [key: string]: unknown };

import type { Course } from '@opencanoetiming/c123-contract';

/** The value type inside an `Observed<T>` (the known arm). */
export type Known<O> = Extract<O, { state: 'known' }> extends { value: infer V } ? V : never;
export type CourseSlot = Known<Course['slots']>[number];

/** What a derivation needs from outside the message. No clock, no I/O (#201 Shape). */
export interface IngestContext {
  /** When the message was received (ISO). Stamped on every element; never read as a time of the timing clock. */
  observedAt: string;
  /** IANA zone of the venue (DERIVATIONS §0.2). Absent: `eventTime` is omitted, never guessed. */
  zone?: string | undefined;
  /** phaseId -> `YYYY-MM-DD`, the Phase.date known to the caller. */
  phaseDates?: Record<string, string> | undefined;
  /** Unused by the parsers and the core; the vector harness's setting (CONFORMANCE-VECTORS §1). */
  xmlPollIntervalSeconds?: number | undefined;
  /** phaseId -> the course bound to it (slots as in CONTRACTS §2.12). */
  courses?: Record<string, { courseId: string; slots: CourseSlot[] }> | undefined;
  /** Course of the currently running Phase: the only course a TCP `RaceConfig` may refresh (§2.3). */
  boundCourseId?: string | undefined;
  /** Date of Canoe123's timing clock, for `TimeOfDay` (§5). */
  eventDate?: string | undefined;
  /** Registry scheme, supplied by bridge configuration (§3). */
  externalIdScheme?: string | undefined;
}
