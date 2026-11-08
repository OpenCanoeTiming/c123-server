/** Inputs of the checks wiring, validated before the store is touched (CONTRACTS §1.4 `validation-failed`, §2.10; #273). */
import type { GateKey } from '../store/checks.js';

export interface Refusal { field: string; issue: string }
export class ValidationError extends Error {
  readonly code = 'validation-failed';
  constructor(readonly details: Refusal[]) {
    super(`validation-failed: ${details.map((d) => `${d.field} ${d.issue}`).join('; ')}`);
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function key(i: Record<string, unknown>, out: Refusal[]): void {
  if (!isStr(i['attemptId'])) out.push({ field: 'attemptId', issue: 'must be a string' });
  if (!isInt(i['run'])) out.push({ field: 'run', issue: 'must be an integer' });
  if (!isInt(i['gate'])) out.push({ field: 'gate', issue: 'must be an integer' });
}
const optional = (i: Record<string, unknown>, name: string, ok: (v: unknown) => boolean, issue: string, out: Refusal[]): void => {
  if (i[name] !== undefined && !ok(i[name])) out.push({ field: name, issue });
};
function done(out: Refusal[]): void {
  if (out.length > 0) throw new ValidationError(out);
}

export function checkInput(i: unknown): GateKey & { valueAtCheck: number | null; checkedBy?: string } {
  const out: Refusal[] = [];
  if (!isObj(i)) throw new ValidationError([{ field: 'body', issue: 'must be an object' }]);
  key(i, out);
  if (!('valueAtCheck' in i) || (i['valueAtCheck'] !== null && typeof i['valueAtCheck'] !== 'number')) out.push({ field: 'valueAtCheck', issue: 'must be a number or null' });
  optional(i, 'checkedBy', isStr, 'must be a string', out);
  if ('status' in i) out.push({ field: 'status', issue: 'is derived, never written' });
  done(out);
  return { attemptId: i['attemptId'] as string, run: i['run'] as number, gate: i['gate'] as number, valueAtCheck: i['valueAtCheck'] as number | null, ...(isStr(i['checkedBy']) ? { checkedBy: i['checkedBy'] } : {}) };
}

export function checkKeyInput(i: unknown): GateKey {
  const out: Refusal[] = [];
  if (!isObj(i)) throw new ValidationError([{ field: 'body', issue: 'must be an object' }]);
  key(i, out);
  done(out);
  return { attemptId: i['attemptId'] as string, run: i['run'] as number, gate: i['gate'] as number };
}

export function flagInput(i: unknown): GateKey & { comment: string; suggestedValue?: number; createdBy?: string } {
  const out: Refusal[] = [];
  if (!isObj(i)) throw new ValidationError([{ field: 'body', issue: 'must be an object' }]);
  key(i, out);
  if (!isStr(i['comment'])) out.push({ field: 'comment', issue: 'must be a string' });
  optional(i, 'suggestedValue', (v) => typeof v === 'number', 'must be a number', out);
  optional(i, 'createdBy', isStr, 'must be a string', out);
  done(out);
  return {
    attemptId: i['attemptId'] as string, run: i['run'] as number, gate: i['gate'] as number, comment: i['comment'] as string,
    ...(typeof i['suggestedValue'] === 'number' ? { suggestedValue: i['suggestedValue'] } : {}),
    ...(isStr(i['createdBy']) ? { createdBy: i['createdBy'] } : {}),
  };
}

export function resolutionInput(flagId: unknown, i: unknown): { note?: string; resolvedBy?: string } {
  const out: Refusal[] = [];
  if (!isStr(flagId)) out.push({ field: 'flagId', issue: 'must be a string' });
  const body = i === undefined ? {} : i;
  if (!isObj(body)) throw new ValidationError([{ field: 'body', issue: 'must be an object' }]);
  optional(body, 'note', isStr, 'must be a string', out);
  optional(body, 'resolvedBy', isStr, 'must be a string', out);
  done(out);
  return { ...(isStr(body['note']) ? { note: body['note'] } : {}), ...(isStr(body['resolvedBy']) ? { resolvedBy: body['resolvedBy'] } : {}) };
}
