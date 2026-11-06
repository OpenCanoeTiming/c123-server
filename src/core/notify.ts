/**
 * The flush after a unit (CONTRACTS §1.6, §7.2): at most one message per changed resource, carrying every field the unit changed;
 * the message that creates an id carries the whole resource. Per-unit diagnostics are recomputed here, for what the unit touched.
 */
import { disagreement } from './precedence.js';
import { oncourseView } from './oncourse.js';
import { presentedFinish, settled, viewAttempt } from './presentation.js';
import { changedStandings, noteFacts, replacedStandings } from './publish.js';
import { viewResource } from './resources.js';
import { wireWrite } from './writes.js';
import type { AttemptState, CoreState, Diagnostic, Message, ResourceState } from './types.js';

const emit = (s: CoreState, m: Omit<Message, 'seq'>): void => {
  s.log.push({ ...m, seq: ++s.counter } as Message);
};

function diff(view: Record<string, unknown>, sent: Map<string, string>, created: boolean, force?: ReadonlySet<string>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(view)) {
    const text = JSON.stringify(v);
    if (text === undefined) continue;
    if (!created || sent.get(k) !== text || force?.has(k) === true) fields[k] = v;
    sent.set(k, text);
  }
  return fields;
}

const COMPARED = ['status', 'outcome', 'gates', 'placement', 'pairTotal', 'underReview', 'qualified'] as const;

function attemptDiagnostics(a: AttemptState): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const field of COMPARED) {
    const fs = a.slots.get(field);
    if (fs === undefined || !disagreement(fs, settled(a, fs.tcp) && settled(a, fs.xml))) continue;
    out.push({ kind: 'source-disagreement', attemptId: a.id, field, sources: ['tcp', 'xml'] });
  }
  if (a.contradiction !== undefined) out.push({ kind: 'contradicted-finish', attemptId: a.id, ...a.contradiction });
  if (a.withheld !== undefined) out.push({ kind: 'stale-mark', attemptId: a.id, run: a.gen.n, mark: a.withheld });
  return out;
}

/** §2.6: two Attempts of one Phase presenting the same finish `eventTime`. */
function duplicateFinishes(s: CoreState, phase: ResourceState): void {
  const byFinish = new Map<string, string[]>();
  for (const a of phase.attempts ?? []) {
    if (a.finish === undefined) continue;
    const bibs = byFinish.get(a.finish);
    if (bibs === undefined) byFinish.set(a.finish, [a.bib]);
    else bibs.push(a.bib);
  }
  const found: Diagnostic[] = [];
  for (const [finishTime, bibs] of byFinish) if (bibs.length > 1) found.push({ kind: 'duplicate-finish', phaseId: phase.id, finishTime, bibs: bibs.sort() });
  if (found.length > 0) s.phaseDiagnostics.set(phase.id, found);
  else s.phaseDiagnostics.delete(phase.id);
}

export function currentDiagnostics(s: CoreState): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const a of s.attempts.values()) out.push(...a.diagnostics);
  for (const d of s.phaseDiagnostics.values()) out.push(...d);
  out.push(...s.parserDiagnostics.values());
  return out;
}

const inScope = (scope: unknown, a: AttemptState): boolean => {
  const sc = scope as { kind?: string; phaseId?: string };
  return sc.kind === 'event' || sc.phaseId === a.phaseId;
};

function flushRebaseline(s: CoreState): void {
  const scope = s.pendingRebaseline;
  const attempts = [...s.attempts.values()].filter((a) => inScope(scope, a));
  const views = attempts.map((a) => {
    const view = viewAttempt(s, a);
    diff(view, a.sent, true);
    noteFacts(s, a, view);
    a.created = true;
    a.force.clear();
    s.dirtyAttempts.delete(a);
    return view;
  });
  emit(s, { type: 'scope.replaced', scope, attempts: views, standings: replacedStandings(s, scope as { kind?: string; phaseId?: string }) });
  s.pendingRebaseline = undefined;
}

export function flush(s: CoreState, xmlInUnit: boolean): void {
  const phases = new Set<ResourceState>();
  for (const a of s.dirtyAttempts) {
    const raised = attemptDiagnostics(a);
    if (JSON.stringify(raised) !== JSON.stringify(a.diagnostics)) {
      a.diagnostics = raised;
      s.diagnosticsDirty = true;
    }
    const finish = presentedFinish(a);
    if (finish === a.finish) continue;
    if (finish === undefined) delete a.finish;
    else a.finish = finish;
    const p = s.phases.get(a.phaseId);
    if (p !== undefined) phases.add(p);
  }
  for (const p of phases) {
    duplicateFinishes(s, p);
    s.diagnosticsDirty = true;
  }

  for (const p of s.dirtyPhases) {
    const fields = diff(viewResource(p, 'phase'), p.sent, p.created);
    p.created = true;
    s.dirtyScopes.add(p.id);
    if (Object.keys(fields).length > 0) emit(s, { type: 'phase.updated', phaseId: p.id, fields });
  }
  s.dirtyPhases.clear();
  for (const { type, resource } of s.dirtyResources) {
    if (type === 'course') {
      if (Object.keys(diff(viewResource(resource, 'course'), resource.sent, resource.created)).length > 0) emit(s, { type: 'course.updated', course: viewResource(resource, 'course') });
      resource.created = true;
      continue;
    }
    const fields = diff(viewResource(resource, type), resource.sent, resource.created);
    resource.created = true;
    if (type === 'entry') for (const phaseId of s.entryPhases.get(resource.id) ?? []) s.dirtyScopes.add(phaseId);
    if (Object.keys(fields).length > 0) emit(s, { type: `${type}.updated`, [type === 'entry' ? 'entryId' : 'classId']: resource.id, fields });
  }
  s.dirtyResources.clear();

  if (s.pendingRebaseline !== undefined) {
    if (xmlInUnit) flushRebaseline(s);
    else for (const a of [...s.dirtyAttempts]) if (inScope(s.pendingRebaseline, a)) s.dirtyAttempts.delete(a);
  }
  for (const a of s.dirtyAttempts) {
    const view = viewAttempt(s, a);
    noteFacts(s, a, view);
    const fields = diff(view, a.sent, a.created, a.force);
    a.created = true;
    a.force.clear();
    if (Object.keys(fields).length > 0) emit(s, { type: 'attempt.updated', attemptId: a.id, fields });
  }
  s.dirtyAttempts.clear();
  for (const standing of changedStandings(s)) emit(s, { type: 'standing.updated', standing });

  for (const w of s.dirtyWrites) emit(s, { type: 'write.updated', write: wireWrite(w) });
  s.dirtyWrites.clear();

  const on = oncourseView(s);
  const key = JSON.stringify([on.attemptIds, on.featuredByUpstream]);
  if (key !== s.oncourseSent) {
    s.oncourseSent = key;
    emit(s, { type: 'oncourse.updated', ...on });
  }
  if (!s.diagnosticsDirty) return;
  s.diagnosticsDirty = false;
  const diagnostics = currentDiagnostics(s);
  const text = JSON.stringify(diagnostics);
  if (text !== s.diagnosticsSent) {
    s.diagnosticsSent = text;
    emit(s, { type: 'diagnostics.updated', diagnostics });
  }
}
