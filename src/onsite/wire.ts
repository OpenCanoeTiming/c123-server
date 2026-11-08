/** The on-site serialisation (CONTRACTS §7 intro): `birthYear` for `birthDate`, no `organiserId`, the `eventId` the core never sees. */
import type { Message } from '../core/types.js';

export type J = Record<string, unknown>;
export interface CurrentEvent { eventId: string; name: string }

/** `OnsiteEvent`. The core states no event details: `details` is `not-yet` (§2.2 `Observed`). */
export const onsiteEvent = (e: CurrentEvent): J => ({ eventId: e.eventId, name: e.name, details: { state: 'not-yet' } });

/** DERIVATIONS `birthDate`: the year of the date as entered, `null` where there is none. */
const birthYear = (birthDate: unknown): number | null => (typeof birthDate === 'string' && /^\d{4}/.test(birthDate) ? Number(birthDate.slice(0, 4)) : null);

/** `members: Observed<Person[]>` to `Observed<OnsitePerson[]>`. */
function onsiteMembers(members: unknown): unknown {
  const m = members as { state?: string; value?: unknown } | undefined;
  if (m?.state !== 'known' || !Array.isArray(m.value)) return members;
  return { ...m, value: (m.value as J[]).map(({ birthDate, ...person }) => ({ ...person, birthYear: birthYear(birthDate) })) };
}

export function onsiteEntry(entry: J): J {
  return 'members' in entry ? { ...entry, members: onsiteMembers(entry['members']) } : entry;
}

export const classWhole = (cls: J, eventId: string): J => ({ ...cls, eventId });
export const courseWhole = (course: J, eventId: string): J => ({ ...course, eventId });

/**
 * A core message as a client receives it, before `seq`. `classesSent` holds the Classes whose creating message has gone out: that one
 * carries the `eventId` the process gives every Class (§2.3), later ones are partial.
 */
export function toWire(m: Message, eventId: string, classesSent: Set<string>): J {
  const rest: J & { type: string } = { ...m };
  delete rest['seq']; // the core's own stamp: the process stamps from its one counter
  switch (rest.type) {
    case 'entry.updated': return { ...rest, fields: onsiteEntry(rest['fields'] as J) };
    case 'class.updated': {
      const id = rest['classId'] as string;
      if (classesSent.has(id)) return rest;
      classesSent.add(id);
      return { ...rest, fields: { ...(rest['fields'] as J), eventId } };
    }
    case 'course.updated': return { ...rest, course: courseWhole(rest['course'] as J, eventId) };
    default: return rest;
  }
}

export const phaseOfAttempt = (attemptId: string): string => attemptId.slice(0, attemptId.lastIndexOf(':'));
