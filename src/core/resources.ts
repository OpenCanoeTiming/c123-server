/**
 * Phases, Entries, Classes and Courses (CONTRACTS §2.3-§2.5, §2.12) and the classification rows (DERIVATIONS §4.10). They have no
 * run generation: same source, later-ingested (INV-6); across sources rule 2. Classification rows create no Attempt.
 */
import { present } from './precedence.js';
import { envelope } from './presentation.js';
import { fieldSlots, retain, slotOf } from './retention.js';
import { refuse } from './counters.js';
import type { ClassificationRow, CoreState, Element, ResourceState, Source } from './types.js';

/** Fields that are not `Observed` on the wire (§2.3, §2.4). */
const PLAIN: ReadonlySet<string> = new Set(['classId', 'format', 'kind', 'scoringKind', 'pair', 'heats', 'stage', 'date', 'code', 'discipline', 'splitsArmed']);

const PHASE_FIELDS = ['courseId', 'scheduledStart', 'programmeOrder', 'title', 'status'];
const ENTRY_FIELDS = ['displayName', 'members', 'club', 'nation', 'ageCategoryId', 'eventBib', 'isTeam'];
const CLASS_FIELDS = ['name', 'ageCategories'];
const COURSE_FIELDS = ['layout', 'gates', 'slots', 'sectorEndsAfterGate', 'splitsAfterGate', 'captions'];

/** One field of a Phase, Entry, Class or Course. Returns whether anything presented may have changed. */
export function observeResource(s: CoreState, r: ResourceState, el: Element, field: string, source: Source, seq: number): boolean {
  if (PLAIN.has(field)) {
    if (field === 'date') {
      if (r.dateFixed === true) return false;
      r.dateFixed = true;
    }
    const value = el['value'];
    const cur = r.plain.get(field) as { siblingPhaseId?: unknown } | undefined;
    if (field === 'pair' && (value as { siblingPhaseId?: unknown } | null)?.siblingPhaseId === null && cur?.siblingPhaseId) return false; // the schedule named it: a cold TCP guess never unnames it
    if (JSON.stringify(cur) === JSON.stringify(value)) return false;
    r.plain.set(field, value);
    return true;
  }
  const stated = el['state'] === 'unavailable' || el['state'] === 'not-yet' ? { state: el['state'], reason: el['reason'] } : el['value'];
  const slot = slotOf(s, el, source, 'row', stated, seq, el['confidence'] === 'inferred' ? { confidence: 'inferred' } : {});
  return retain(fieldSlots(r.fields, field), source, slot);
}

export function viewResource(r: ResourceState, kind: 'phase' | 'entry' | 'class' | 'course'): Record<string, unknown> {
  const names = kind === 'phase' ? PHASE_FIELDS : kind === 'entry' ? ENTRY_FIELDS : kind === 'class' ? CLASS_FIELDS : COURSE_FIELDS;
  const key = kind === 'phase' ? 'phaseId' : kind === 'entry' ? 'entryId' : kind === 'class' ? 'classId' : 'courseId';
  const out: Record<string, unknown> = { [key]: r.id };
  for (const [k, v] of r.plain) if (k !== 'splitsArmed') out[k] = v;
  for (const f of new Set([...names, ...r.fields.keys()])) out[f] = envelope(present(r.fields.get(f)), false);
  return out;
}

/** §4.10: replaced whole, whichever source, under INV-2c's guard alone; a refused snapshot moves nothing, `decidedIn` included. */
export function applyClassification(s: CoreState, phaseId: string, source: Source, el: Element, rows: ClassificationRow[]): void {
  const cur = s.classifications.get(phaseId);
  const at = Date.parse(el.observedAt);
  if (cur === undefined && rows.length === 0) return; // publishes first at its first row
  if (cur !== undefined && source === 'xml' && cur.builtBy === 'tcp') {
    const age = s.rewrite?.changedAfter ?? null;
    if (age === null || age <= cur.at) {
      refuse(s, 'classification-guard');
      return;
    }
  }
  const decided = new Map((cur?.rows ?? []).map((r) => [r.entryId, r.decidedIn]));
  const next = rows.map((r) => (source === 'tcp' && r.decidedIn === null ? { ...r, decidedIn: decided.get(r.entryId) ?? null } : r));
  // TCP re-sends the same rows on rotation: those move nothing, `asOf` included
  if (cur !== undefined && JSON.stringify(cur.rows) === JSON.stringify(next)) return;
  s.classifications.set(phaseId, { rows: next, asOf: el.observedAt, builtBy: source, at });
}
