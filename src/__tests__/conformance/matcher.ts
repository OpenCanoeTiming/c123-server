/**
 * The `expect` semantics of CONFORMANCE-VECTORS §1, as one small module.
 *
 * - An envelope field (or any key) left out of `expect` is not asserted: objects match as a subset.
 * - `null`, an absent key and `0` are three different things (CONTRACTS §1.2, §1.3): an expected key must
 *   be an own property of the actual object, and `null` equals only `null`.
 * - Arrays match by length and order.
 * - `note` is commentary and never compared.
 * - Anything the harness cannot interpret raises `VectorMismatch` ("unsupported ..."), never passes.
 */
import type { MergePort, NotificationMessage } from './port.js';

export class VectorMismatch extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VectorMismatch';
  }
}

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const show = (x: unknown): string => (x === undefined ? 'undefined (absent)' : JSON.stringify(x));

/** Subset match of `expected` against `actual`; throws `VectorMismatch` at the first difference. */
export function matchValue(expected: unknown, actual: unknown, path = '$'): void {
  if (expected === null) {
    if (actual !== null) throw new VectorMismatch(`${path}: expected null, got ${show(actual)}`);
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) throw new VectorMismatch(`${path}: expected an array, got ${show(actual)}`);
    if (actual.length !== expected.length) {
      throw new VectorMismatch(`${path}: expected ${expected.length} elements, got ${actual.length}: ${show(actual)}`);
    }
    expected.forEach((e, i) => matchValue(e, actual[i], `${path}[${i}]`));
    return;
  }
  if (isObj(expected)) {
    if (!isObj(actual)) throw new VectorMismatch(`${path}: expected an object, got ${show(actual)}`);
    for (const k of Object.keys(expected)) {
      if (!own(actual, k)) throw new VectorMismatch(`${path}.${k}: expected ${show(expected[k])}, key absent`);
      matchValue(expected[k], actual[k], `${path}.${k}`);
    }
    return;
  }
  if (actual !== expected) throw new VectorMismatch(`${path}: expected ${show(expected)}, got ${show(actual)}`);
}

/** A client-visible message with the index of the first element of the unit that emitted it. */
export interface LoggedMessage {
  message: NotificationMessage;
  /** Given-index (0-based, `then` elements continue after `given`) of the unit's first element. */
  unitStart: number;
}

export interface MergeObservation {
  port: MergePort;
  attemptId: string; // context.attemptId, defaulted
  log: LoggedMessage[];
  /**
   * The vector-level `scope` of a merge vector (`entry` | `phase`). Not defined in CONFORMANCE-VECTORS §1; the
   * data uses it on four merge vectors. `entry`: Entry-named keys address the Entry. `phase`: the keys address a
   * Phase, which the port has no accessor for, so they are refused rather than guessed.
   */
  vectorScope?: string;
}

/** Fields of the Entry resource (CONTRACTS `Entry`); read only in a vector whose scope is `entry`. */
const ENTRY_FIELD = /^(displayName|members|club|nation|ageCategoryId|eventBib|isTeam)(\[|\.|$)/;
const PREFIXED = /^([^.:\s]+:[^.\s]+)\.(.+)$/;

/** Splits `K1M_BR1_6:9.outcome` into attempt and field; an unprefixed key addresses `attemptId`. */
export function splitKey(key: string, attemptId: string): { attemptId: string; field: string; prefixed: boolean } {
  const m = PREFIXED.exec(key);
  return m ? { attemptId: m[1]!, field: m[2]!, prefixed: true } : { attemptId, field: key, prefixed: false };
}

const NOTIFICATION_KEYS = new Set(['count', 'afterGivenIndex', 'attemptId', 'scope', 'fields']);

/** `notifications`: a map of message type to a count or to the object form. Number/string forms do not exist. */
export function matchNotifications(
  expected: unknown,
  obs: MergeObservation,
  stepExpect: Record<string, unknown>,
): void {
  if (!isObj(expected)) {
    throw new VectorMismatch(`notifications: must be a map of message type to count or object, got ${show(expected)}`);
  }
  for (const [type, spec] of Object.entries(expected)) {
    if (typeof spec === 'number') {
      matchCount(type, spec, obs.log.filter((l) => l.message.type === type).length);
      continue;
    }
    if (!isObj(spec)) {
      throw new VectorMismatch(`notifications.${type}: a count or an object, got ${show(spec)}`);
    }
    for (const k of Object.keys(spec)) {
      if (!NOTIFICATION_KEYS.has(k)) throw new VectorMismatch(`notifications.${type}: unknown key '${k}'`);
    }
    if (typeof spec.count !== 'number') throw new VectorMismatch(`notifications.${type}: 'count' is required`);
    const after = spec.afterGivenIndex;
    if (after !== undefined && typeof after !== 'number') {
      throw new VectorMismatch(`notifications.${type}.afterGivenIndex must be a number`);
    }
    const matching = obs.log.filter(({ message, unitStart }) => {
      if (message.type !== type) return false;
      if (typeof after === 'number' && !(unitStart > after)) return false;
      if (spec.attemptId !== undefined && message.attemptId !== spec.attemptId) return false;
      if (spec.scope !== undefined) {
        try {
          matchValue(spec.scope, message.scope);
        } catch {
          return false;
        }
      }
      return true;
    });
    matchCount(type, spec.count, matching.length);
    if (spec.fields !== undefined) {
      if (!Array.isArray(spec.fields) || spec.fields.some((f) => typeof f !== 'string')) {
        throw new VectorMismatch(`notifications.${type}.fields must be a list of field names`);
      }
      if (matching.length !== 1) {
        throw new VectorMismatch(`notifications.${type}.fields needs exactly one matching message, got ${matching.length}`);
      }
      const msg = matching[0]!.message;
      const carried = msg.fields;
      if (!isObj(carried)) throw new VectorMismatch(`notifications.${type}: the message carries no 'fields'`);
      const msgAttempt = typeof spec.attemptId === 'string' ? spec.attemptId : obs.attemptId;
      for (const f of spec.fields as string[]) {
        if (!own(carried, f)) throw new VectorMismatch(`notifications.${type}: message fields lack '${f}'`);
        const keys = msgAttempt === obs.attemptId ? [`${msgAttempt}.${f}`, f] : [`${msgAttempt}.${f}`];
        const stated = keys.find((k) => own(stepExpect, k));
        if (stated !== undefined) matchValue(stepExpect[stated], carried[f], `notifications.${type}.fields.${f}`);
      }
    }
  }
}

function matchCount(type: string, want: number, got: number): void {
  if (want !== got) throw new VectorMismatch(`notifications.${type}: expected ${want} message(s), got ${got}`);
}

/** Asserts one `expect` object (final or `expectSequence`) against the merge port's current state. */
export function matchMergeExpect(expect: Record<string, unknown>, obs: MergeObservation): void {
  for (const [key, want] of Object.entries(expect)) {
    if (key === 'note') continue;
    switch (key) {
      case 'diagnostics':
        matchValue(want, obs.port.diagnostics(), 'diagnostics');
        continue;
      case 'writeRequest':
        matchValue(want, obs.port.writeRequest(), 'writeRequest');
        continue;
      case 'notifications':
        matchNotifications(want, obs, expect);
        continue;
      case 'oncourse':
        matchValue(want, obs.port.oncourse().attemptIds, 'oncourse');
        continue;
      case 'featuredByUpstream':
        matchValue({ featuredByUpstream: want }, obs.port.oncourse(), 'oncourse');
        continue;
      case 'attempts':
        matchValue(want, obs.port.attempts(), 'attempts');
        continue;
      case 'standing':
        throw new VectorMismatch("unsupported: 'standing' in a merge vector (only live-ingest vectors use it)");
    }
    const { attemptId, field, prefixed } = splitKey(key, obs.attemptId);
    if (obs.vectorScope === 'phase' && !prefixed) {
      throw new VectorMismatch(`unexpressible: '${key}' in a vector with scope 'phase' addresses a Phase; the port has no Phase accessor and CONFORMANCE-VECTORS §1 does not define the scope key`);
    }
    if (obs.vectorScope === 'entry' && ENTRY_FIELD.test(field)) {
      if (prefixed) throw new VectorMismatch(`unsupported: '${key}' addresses an Entry field through an Attempt prefix`);
      const entry = obs.port.entry();
      if (!own(entry, field)) throw new VectorMismatch(`${key}: Entry field absent`);
      matchValue(want, entry[field], key);
      continue;
    }
    const presented = obs.port.presented(attemptId);
    if (!own(presented, field)) throw new VectorMismatch(`${key}: field absent from presented(${attemptId})`);
    matchValue(want, presented[field], key);
  }
}
