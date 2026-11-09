/**
 * The parser context a recording driver rebuilds from the parsers' own output (sweep:parse, sweep:merge, replay:direct): phase dates
 * and the Course slots each Phase uses. The drivers share only this; how they feed the core differs.
 */
import type { CourseSlot, IngestContext, IngestElement } from './index.js';

export interface ContextTracker {
  ctx: IngestContext;
  /** Learns from the elements one record produced; `isXml` is true for an XML snapshot's elements. */
  learn(elements: readonly IngestElement[], isXml: boolean): void;
}

export function createContextTracker(zone: string, eventDate: string | undefined, externalIdScheme: string): ContextTracker {
  const phaseDates: Record<string, string> = {};
  const phaseCourse = new Map<string, string>();
  const courseSlots = new Map<string, CourseSlot[]>();
  const ctx: IngestContext = { observedAt: '', zone, phaseDates, courses: {}, eventDate, externalIdScheme };
  const rebuild = (): void => {
    const courses: Record<string, { courseId: string; slots: CourseSlot[] }> = {};
    for (const [phaseId, courseId] of phaseCourse) {
      const slots = courseSlots.get(courseId);
      if (slots !== undefined) courses[phaseId] = { courseId, slots };
    }
    ctx.courses = courses;
  };
  const learn = (elements: readonly IngestElement[], isXml: boolean): void => {
    let refresh = false;
    for (const e of elements) {
      const field = e['field'];
      if (isXml && field === 'date' && typeof e['phaseId'] === 'string') phaseDates[e['phaseId']] = e['value'] as string;
      else if (isXml && field === 'courseId' && typeof e['phaseId'] === 'string' && typeof e['value'] === 'string') {
        phaseCourse.set(e['phaseId'], e['value']);
        refresh = true;
      } else if (field === 'slots' && typeof e['courseId'] === 'string' && Array.isArray(e['value'])) {
        courseSlots.set(e['courseId'], e['value'] as CourseSlot[]);
        refresh = true;
      }
    }
    if (refresh) rebuild();
  };
  return { ctx, learn };
}
