/**
 * Gate display state (CONTRACTS §2.10, DERIVATIONS §6): pure, derived on every call, never stored.
 * A gate is `flagged` if an open flag exists, else its check's `verified`/`stale`, else `plain`.
 * `verified` means `valueAtCheck` equals the presented penalty (`null` when gates are not known; null and 0 differ).
 */

/** Input of a workflow-state evaluation: stored checks and flags, and what is presented now. */
export interface WorkflowGiven {
  checks: Array<Record<string, unknown>>;
  flags: unknown[];
  presented: Record<string, { run: number; gates: unknown[] | null }>;
}

export interface WorkflowResult {
  gateStatus: Record<string, string>;
  checks?: unknown[];
}

export type GateStatus = 'flagged' | 'verified' | 'stale' | 'plain';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const keyOf = (attemptId: string, run: number, gate: number): string => `${attemptId}:${run}:${gate}`;

function presentedPenalties(gates: unknown[] | null): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const g of gates ?? []) {
    if (!isRecord(g) || typeof g['number'] !== 'number') continue;
    out.set(g['number'], typeof g['penalty'] === 'number' ? g['penalty'] : null);
  }
  return out;
}

export function gateStatus(given: WorkflowGiven): WorkflowResult {
  const checks = given.checks.filter(isRecord);
  const flags = given.flags.filter(isRecord);
  const result: Record<string, string> = {};
  for (const [attemptId, p] of Object.entries(given.presented)) {
    const penalties = presentedPenalties(p.gates);
    const onThis = (r: Record<string, unknown>): boolean => r['attemptId'] === attemptId && r['run'] === p.run && typeof r['gate'] === 'number';
    const mine = checks.filter(onThis);
    const myFlags = flags.filter(onThis);
    const gates = new Set<number>(penalties.keys());
    for (const r of [...mine, ...myFlags]) gates.add(r['gate'] as number);
    for (const gate of gates) {
      const open = myFlags.some((f) => f['gate'] === gate && f['resolution'] === undefined);
      const check = mine.find((c) => c['gate'] === gate);
      let status: GateStatus = 'plain';
      if (open) status = 'flagged';
      else if (check) status = (check['valueAtCheck'] ?? null) === (penalties.get(gate) ?? null) ? 'verified' : 'stale';
      result[keyOf(attemptId, p.run, gate)] = status;
    }
  }
  return { gateStatus: result, checks: given.checks };
}

/**
 * One check's own status (CONTRACTS §2.10), apart from the gate's display state: `verified` when `valueAtCheck` equals the presented
 * penalty of that gate for that Attempt and generation, `stale` otherwise. A generation that is not the presented one has nothing
 * presented to equal, so it is `stale`; `null` and `0` stay distinct.
 */
export function checkStatus(check: { attemptId: string; run: number; gate: number; valueAtCheck: number | null }, presented: WorkflowGiven['presented']): 'verified' | 'stale' {
  const p = presented[check.attemptId];
  if (p === undefined || p.run !== check.run) return 'stale';
  return check.valueAtCheck === (presentedPenalties(p.gates).get(check.gate) ?? null) ? 'verified' : 'stale';
}
