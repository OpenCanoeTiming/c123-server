/**
 * The run of one vector, against a `ConformancePort` taken as a parameter (so tests can inject a
 * controllable port), and the registration of one test per vector (so the ledger and strict mode
 * can be exercised without running this suite recursively).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type {
  ConformancePort,
  GivenElement,
  StandingGiven,
  StandingScope,
  VectorContext,
  WorkflowGiven,
} from './port.js';
import { matchMergeExpect, matchValue, resolveResource, VectorMismatch, type LoggedMessage, type MergeObservation } from './matcher.js';

export interface Vector {
  id: string;
  invariant: string;
  description: string;
  context?: Record<string, unknown>;
  given: unknown;
  expect: Record<string, unknown>;
  expectSequence?: Array<{ afterGivenIndex: number; expect: Record<string, unknown> }>;
  then?: unknown[];
  scope?: StandingScope | string;
  ageCategoryId?: string;
  upstreamCategoryRanks?: Record<string, number>;
}

const here = dirname(fileURLToPath(import.meta.url));
export const VECTORS_PATH = resolve(here, '../../../docs/arch/vectors/tier1-conformance.json');
export const EXPECTED_RED_PATH = resolve(here, 'expected-red.json');

export function loadVectors(): Vector[] {
  return (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { vectors: Vector[] }).vectors;
}

/** CONFORMANCE-VECTORS §1: c123-server runs every vector not tagged `live-ingest`. */
export const isServerVector = (v: Vector): boolean => v.invariant !== 'live-ingest';
export const serverVectors = (all: Vector[] = loadVectors()): Vector[] => all.filter(isServerVector);

export const DEFAULT_ATTEMPT_ID = 'K1M_BR1_6:9';
export const DEFAULT_XML_POLL_INTERVAL_SECONDS = 5;

/** The vector's context with the documented defaults (§1: `attemptId`, "Content age"). */
export function resolveContext(raw: Record<string, unknown> | undefined): VectorContext {
  return {
    ...raw,
    attemptId: typeof raw?.attemptId === 'string' ? raw.attemptId : DEFAULT_ATTEMPT_ID,
    xmlPollIntervalSeconds:
      typeof raw?.xmlPollIntervalSeconds === 'number' ? raw.xmlPollIntervalSeconds : DEFAULT_XML_POLL_INTERVAL_SECONDS,
  };
}

/** `context.phase`, else the phase of `context.attemptId` (`${phaseId}:${bib}`; a convention of the vector file, §1). */
export function resolvePhaseId(context: VectorContext): string {
  if (typeof context.phase === 'string') return context.phase;
  return context.attemptId.slice(0, context.attemptId.lastIndexOf(':'));
}

const isObservation = (e: GivenElement): boolean => 'field' in e;

/**
 * The ingest-unit rule (§1): consecutive observations with the same `source` and `observedAt` are one
 * unit; every event, snapshot and live-tier element is a unit of its own. A source-less observation
 * (the `unavailable` ones) states no source, so it never groups.
 */
export function groupUnits(elements: GivenElement[], firstIndex = 0): Array<{ start: number; elements: GivenElement[] }> {
  const units: Array<{ start: number; elements: GivenElement[] }> = [];
  elements.forEach((el, i) => {
    const last = units[units.length - 1];
    const prev = last?.elements[last.elements.length - 1];
    if (
      last && prev && isObservation(el) && isObservation(prev) &&
      typeof (el as { source?: unknown }).source === 'string' &&
      (el as { source?: string }).source === (prev as { source?: string }).source &&
      el.observedAt === prev.observedAt
    ) {
      last.elements.push(el);
    } else {
      units.push({ start: firstIndex + i, elements: [el] });
    }
  });
  return units;
}

const MERGE_KEYS = ['id', 'invariant', 'description', 'context', 'given', 'expect', 'expectSequence', 'then', 'scope'];
const STANDING_KEYS = ['id', 'invariant', 'description', 'context', 'given', 'expect', 'scope', 'ageCategoryId', 'upstreamCategoryRanks'];
const WORKFLOW_KEYS = ['id', 'invariant', 'description', 'context', 'given', 'expect', 'expectSequence', 'then'];
function noAssertions(where: string, el: unknown): void {
  if (typeof el !== 'object' || el === null) throw new VectorMismatch(`${where}: expected an object`);
  for (const k of ASSERTION_KEYS) if (k in el) throw new VectorMismatch(`${where}: an element carries '${k}', which no one reads`);
}

const STEP_KEYS = ['afterGivenIndex', 'expect'];
const WORKFLOW_GIVEN_KEYS = ['checks', 'flags', 'presented'];

function closed(where: string, obj: unknown, allowed: string[]): void {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) throw new VectorMismatch(`${where}: expected an object`);
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) throw new VectorMismatch(`${where}: unknown key '${k}' (an assertion outside the read paths would pass unread)`);
  }
}

/**
 * Closed key sets (CONFORMANCE-VECTORS §1: "Every assertion of a vector is in `expect`, `expectSequence` or `then`"):
 * a key the harness does not read is refused, not dropped. Per vector shape, for a step, and for `then` elements.
 */
export function assertClosedKeys(v: Vector): void {
  const g = v.given as Record<string, unknown>;
  const shape = Array.isArray(v.given) ? 'merge' : 'entries' in g ? 'standing' : 'checks' in g && 'presented' in g ? 'workflow' : 'unknown';
  if (shape === 'unknown') throw new VectorMismatch(`unrecognised vector shape for ${v.id}`);
  closed(`${v.id}`, v, shape === 'merge' ? MERGE_KEYS : shape === 'standing' ? STANDING_KEYS : WORKFLOW_KEYS);
  if (shape === 'standing') closed(`${v.id}.given`, g, ['entries']);
  if (shape === 'workflow') closed(`${v.id}.given`, g, WORKFLOW_GIVEN_KEYS);
  (v.expectSequence ?? []).forEach((s, i) => closed(`${v.id}.expectSequence[${i}]`, s, STEP_KEYS));
  (v.then ?? []).forEach((t, i) => {
    if (shape === 'workflow') closed(`${v.id}.then[${i}]`, t, ['presented']);
    else noAssertions(`${v.id}.then[${i}]`, t);
  });
  if (shape === 'merge') (v.given as unknown[]).forEach((e, i) => noAssertions(`${v.id}.given[${i}]`, e));
}

/** An element is an input. These keys carry assertions, and no element may hold one (they would never be read). */
const ASSERTION_KEYS = ['expect', 'expectSequence', 'then', 'checks', 'gateStatus', 'notifications', 'diagnostics', 'writeRequest'];

/** `notifications.*.afterGivenIndex`: 0-based into `given`, in range, on a unit boundary (§1, R4b). */
function checkNotificationIndices(where: string, expect: Record<string, unknown>, given: GivenElement[]): void {
  const n = expect.notifications;
  if (typeof n !== 'object' || n === null) return;
  const lasts = new Set(groupUnits(given).map((u) => u.start + u.elements.length - 1));
  for (const [type, spec] of Object.entries(n)) {
    if (typeof spec !== 'object' || spec === null || !('afterGivenIndex' in spec)) continue;
    const i = (spec as { afterGivenIndex: unknown }).afterGivenIndex;
    if (typeof i !== 'number' || !Number.isInteger(i) || i < -1 || i >= given.length) {
      throw new VectorMismatch(`${where}notifications.${type}.afterGivenIndex ${String(i)} is out of range of given (${given.length} elements)`);
    }
    if (i !== -1 && !lasts.has(i)) throw new VectorMismatch(`${where}notifications.${type}.afterGivenIndex ${i} falls inside an ingest unit (§1 forbids it)`);
  }
}

function runMerge(v: Vector, port: ConformancePort): void {
  const context = resolveContext(v.context);
  const merge = port.createMergePort(context);
  const given = v.given as GivenElement[];
  checkNotificationIndices('', v.expect, given);
  for (const s of v.expectSequence ?? []) checkNotificationIndices(`after given[${s.afterGivenIndex}]: `, s.expect, given);
  const then = (v.then ?? []) as GivenElement[];
  const phaseId = resolvePhaseId(context);
  const vectorScope = typeof v.scope === 'string' ? v.scope : undefined;
  // Tell the port, per observation, which resource it addresses (§1 "Scope of a field").
  const tag = (e: GivenElement): GivenElement => {
    if (!('field' in e)) return e;
    const resource = resolveResource(e.field as string, typeof e.scope === 'string' ? e.scope : vectorScope);
    return { ...e, resource, ...(resource === 'phase' ? { phaseId } : {}) };
  };
  const units = [...groupUnits(given.map(tag)), ...groupUnits(then.map(tag), given.length)];
  const log: LoggedMessage[] = [];
  let seen = 0;
  let next = 0;
  const obs: MergeObservation = { port: merge, attemptId: context.attemptId, log, phaseId };
  if (vectorScope !== undefined) obs.vectorScope = vectorScope;

  const applyThrough = (index: number): void => {
    // Everything up to and including element `index`; -1 applies nothing.
    while (next < units.length && units[next]!.start + units[next]!.elements.length - 1 <= index) {
      const u = units[next++]!;
      merge.applyUnit(u.elements);
      const all = merge.notifications();
      for (const message of all.slice(seen)) log.push({ message, unitStart: u.start });
      seen = all.length;
    }
    const open = units[next];
    if (open && open.start <= index) {
      throw new VectorMismatch(`afterGivenIndex ${index} falls inside the ingest unit starting at ${open.start} (§1 forbids it)`);
    }
  };

  let lastIndex = -2;
  for (const step of v.expectSequence ?? []) {
    if (step.afterGivenIndex < lastIndex) throw new VectorMismatch('expectSequence must be in ascending afterGivenIndex order');
    if (step.afterGivenIndex >= given.length) throw new VectorMismatch(`afterGivenIndex ${step.afterGivenIndex} is out of range of given`);
    lastIndex = step.afterGivenIndex;
    applyThrough(step.afterGivenIndex);
    try {
      matchMergeExpect(step.expect, obs);
    } catch (e) {
      if (e instanceof VectorMismatch) e.message = `after given[${step.afterGivenIndex}]: ${e.message}`;
      throw e;
    }
  }
  applyThrough(given.length + then.length - 1);
  matchMergeExpect(v.expect, obs);
}

function runStanding(v: Vector, port: ConformancePort): void {
  const g = v.given as { entries: Array<Record<string, unknown>> };
  const given: StandingGiven = { entries: g.entries };
  if (v.ageCategoryId !== undefined) given.ageCategoryId = v.ageCategoryId;
  if (v.upstreamCategoryRanks !== undefined) given.upstreamCategoryRanks = v.upstreamCategoryRanks;
  const result = port.assembleStanding(given, v.scope as StandingScope);
  for (const [key, want] of Object.entries(v.expect)) {
    if (key === 'note') continue;
    if (key === 'standing' || key === 'anomalies') matchValue(want, (result as unknown as Record<string, unknown>)[key], key);
    else if (key === 'ageCategoryId') matchValue({ ageCategoryId: want }, result, 'result');
    else throw new VectorMismatch(`unsupported expect key '${key}' in a standing vector`);
  }
}

/**
 * `gateStatus` (CONFORMANCE-VECTORS §1, round 16): exact over the presented gates. Every `attemptId:run:gate` of
 * `presented` (with the presented `run`) is asserted, `plain` where the vector lists none; a listed key outside that
 * domain is asserted as listed; an unlisted key outside it is not asserted.
 */
export function matchGateStatus(want: Record<string, string>, g: WorkflowGiven, got: Record<string, string>, path: string): void {
  const domain = new Set<string>();
  for (const [aid, p] of Object.entries(g.presented)) for (const gate of (p.gates ?? []) as Array<{ number: number }>) domain.add(`${aid}:${p.run}:${gate.number}`);
  const keys = new Set([...domain, ...Object.keys(want)]);
  for (const k of keys) {
    const expected = Object.prototype.hasOwnProperty.call(want, k) ? want[k] : 'plain';
    if (!Object.prototype.hasOwnProperty.call(got, k)) throw new VectorMismatch(`${path}.${k}: expected ${expected}, the port states none`);
    if (got[k] !== expected) throw new VectorMismatch(`${path}.${k}: expected ${String(expected)}${domain.has(k) && !Object.prototype.hasOwnProperty.call(want, k) ? ' (presented gate, unlisted)' : ''}, got ${String(got[k])}`);
  }
}

function runWorkflow(v: Vector, port: ConformancePort): void {
  const given = v.given as WorkflowGiven;
  const check = (g: WorkflowGiven, expect: Record<string, unknown>, where: string): void => {
    const result = port.gateStatus(g);
    for (const [key, want] of Object.entries(expect)) {
      if (key === 'note') continue;
      if (key === 'gateStatus') matchGateStatus(want as Record<string, string>, g, result.gateStatus, `${where}gateStatus`);
      else if (key === 'checks') matchValue(want, result.checks, `${where}checks`);
      else throw new VectorMismatch(`unsupported expect key '${key}' in a workflow vector`);
    }
  };
  let current = given;
  for (const step of v.expectSequence ?? []) {
    if (step.afterGivenIndex !== -1) throw new VectorMismatch('a workflow vector can only assert before its first then (afterGivenIndex -1)');
    check(current, step.expect, 'before then: ');
  }
  for (const t of (v.then ?? []) as Array<{ presented: WorkflowGiven['presented'] }>) {
    current = { ...current, presented: t.presented };
  }
  check(current, v.expect, '');
}

/** Runs one vector; resolves when it passes, throws (`VectorMismatch` for a wrong answer) when it does not. */
export function runVector(v: Vector, port: ConformancePort): void {
  assertClosedKeys(v);
  if (Array.isArray(v.given)) return runMerge(v, port);
  const g = v.given as Record<string, unknown>;
  if ('entries' in g) return runStanding(v, port);
  if ('checks' in g && 'presented' in g) return runWorkflow(v, port);
  throw new VectorMismatch(`unrecognised vector shape for ${v.id}`);
}

// --- ledger and registration -------------------------------------------------------------------

export const isStrict = (env: Record<string, string | undefined> = process.env): boolean => env.VECTORS_STRICT === '1';

export function loadExpectedRed(path: string = EXPECTED_RED_PATH): string[] {
  return JSON.parse(readFileSync(path, 'utf8')) as string[];
}

/** `fails`: a ledger id outside strict mode (goes red when the vector starts passing). Else `plain`. */
export function modeFor(id: string, expectedRed: readonly string[], strict: boolean): 'fails' | 'plain' {
  return !strict && expectedRed.includes(id) ? 'fails' : 'plain';
}

export const testName = (id: string): string => `vector ${id}`;

export interface ItLike {
  (name: string, fn: () => void): void;
  fails: (name: string, fn: () => void) => void;
}

/** Registers one test per vector. Returns the registered names. No skip, no todo, no filtering. */
export function registerVectorTests(opts: {
  vectors: Vector[];
  port: ConformancePort;
  expectedRed: readonly string[];
  strict: boolean;
  it: ItLike;
}): string[] {
  return opts.vectors.map((v) => {
    const name = testName(v.id);
    const body = (): void => runVector(v, opts.port);
    if (modeFor(v.id, opts.expectedRed, opts.strict) === 'fails') opts.it.fails(name, body);
    else opts.it(name, body);
    return name;
  });
}
