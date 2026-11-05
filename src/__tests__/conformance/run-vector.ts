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

function runMerge(v: Vector, port: ConformancePort): void {
  const context = resolveContext(v.context);
  const merge = port.createMergePort(context);
  const given = v.given as GivenElement[];
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

function runWorkflow(v: Vector, port: ConformancePort): void {
  const given = v.given as WorkflowGiven;
  const check = (g: WorkflowGiven, expect: Record<string, unknown>, where: string): void => {
    const result = port.gateStatus(g);
    for (const [key, want] of Object.entries(expect)) {
      if (key === 'note') continue;
      if (key === 'gateStatus') matchValue(want, result.gateStatus, `${where}gateStatus`);
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
  if (Array.isArray(v.given)) return runMerge(v, port);
  const g = v.given as Record<string, unknown>;
  if ('entries' in g) return runStanding(v, port);
  if ('checks' in g && 'presented' in g) return runWorkflow(v, port);
  throw new VectorMismatch(`unrecognised vector shape for ${v.id}`);
}

// --- ledger and registration -------------------------------------------------------------------

export const isStrict = (env: Record<string, string | undefined> = process.env): boolean => env.VECTORS_STRICT === '1';

export function loadExpectedRed(): string[] {
  return JSON.parse(readFileSync(EXPECTED_RED_PATH, 'utf8')) as string[];
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
