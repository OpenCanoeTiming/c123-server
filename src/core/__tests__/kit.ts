/**
 * Hand streams in the element shape of the conformance vectors (CONFORMANCE-VECTORS §1), for rules the recordings do not hold (a re-delivery,
 * a boundary, a refused mark). One kit per test: the ingest sequence is a closure counter, nothing is shared between tests.
 */
import { createMergeCore } from '../index.js';
import { fmtOf, splitRaceId } from '../../ingest/common.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

export type Core = MergePort;
export type Unit = GivenElement[];

export const BASE = '2026-09-15T10:00:00.000Z';
export const at = (seconds: number): string => new Date(Date.parse(BASE) + seconds * 1000).toISOString();

export function kit(attemptId: string, phaseId: string) {
  let seq = 0;
  const bib = attemptId.slice(phaseId.length + 1);
  const next = (): number => ++seq;
  const obs = (field: string, source: 'tcp' | 'xml', kind: 'inference' | 'result-row', observedAt: string, value: unknown, extra: Record<string, unknown> = {}): GivenElement =>
    ({ ingestSeq: next(), attemptId, field, source, kind, observedAt, value, confidence: 'authoritative', ...extra }) as GivenElement;
  /** A results table push for the Attempt's race: one row, as the parsers emit it (`bib`, resolved fields). */
  const snap = (source: 'tcp' | 'xml', observedAt: string, row: Record<string, unknown>, mode: 'results' | 'start-list' = 'results'): GivenElement =>
    ({ ingestSeq: next(), observedAt, snapshot: { source, phaseId, mode, rows: [{ bib, ...row }] } }) as GivenElement;
  /** The reader's event for the snapshot that follows: its content age (`changedAfter`). */
  const rewrite = (observedAt: string, changedAfter: string | null): GivenElement => ({ ingestSeq: next(), event: 'xml-rewrite-detected', observedAt, changedAfter }) as GivenElement;
  const event = (name: string, observedAt: string): GivenElement => ({ ingestSeq: next(), event: name, observedAt, attemptId }) as GivenElement;
  /** An on-course listing: the `onCourse` observation and the `status` it implies (DERIVATIONS §4.1), one unit. */
  const listing = (observedAt: string, dtStart: string | null, dtFinish: string | null = null, extra: { runSeconds?: number } = {}): Unit => {
    const status = dtFinish !== null ? 'finished' : dtStart !== null ? 'on-course' : 'at-start';
    return [
      obs('onCourse', 'tcp', 'inference', observedAt, { dtStart, dtFinish }),
      obs('status', 'tcp', 'inference', observedAt, status, dtFinish !== null ? { eventTime: dtFinish } : {}),
      ...(dtFinish !== null && extra.runSeconds !== undefined ? [obs('outcome', 'tcp', 'inference', observedAt, { kind: 'duration', runSeconds: extra.runSeconds, penaltySeconds: 0, totalSeconds: extra.runSeconds })] : []),
    ];
  };
  const xml = (observedAt: string, changedAfter: string | null, row: Record<string, unknown>): Unit => [rewrite(observedAt, changedAfter), snap('xml', observedAt, row)];
  /**
   * #377 (DERIVATIONS §2.1; CONFORMANCE-VECTORS §1): the core reads no id, so a Phase whose units state no `format` or `pair` is given them the way the
   * conformance adapter does: `format` is the id's token; `pair` is the token's role and combination, a second run naming the id that carries its first
   * run's token, a first run and a single run stating null/no sibling. A statement a test makes itself is never overridden.
   */
  const core = (): Core => {
    const c = createMergeCore({ attemptId }) as unknown as Core;
    const apply = c.applyUnit.bind(c);
    const has = new Map<string, Set<string>>();
    const phasesOf = (e: Record<string, any>): string[] =>
      [e['snapshot']?.phaseId, e['phaseId'], typeof e['attemptId'] === 'string' ? (e['attemptId'] as string).slice(0, (e['attemptId'] as string).lastIndexOf(':')) : undefined]
        .filter((x): x is string => typeof x === 'string' && x !== '');
    c.applyUnit = (unit) => {
      const els = unit as Record<string, any>[];
      for (const e of els) if (typeof e['phaseId'] === 'string' && typeof e['field'] === 'string') (has.get(e['phaseId']) ?? has.set(e['phaseId'], new Set()).get(e['phaseId'])!).add(e['field']);
      const extra: Record<string, unknown>[] = [];
      const seen = new Set<string>();
      for (const e of els) {
        for (const id of phasesOf(e)) {
          if (seen.has(id)) continue;
          seen.add(id);
          const got = has.get(id) ?? has.set(id, new Set()).get(id)!;
          const { classKey, token, rest } = splitRaceId(id);
          const st = (f: string, value: unknown): void => {
            got.add(f);
            extra.push({ ingestSeq: 0, observedAt: e['observedAt'], field: f, phaseId: id, source: 'tcp', kind: 'result-row', value, confidence: 'authoritative' });
          };
          if (!got.has('format')) st('format', token);
          if (!got.has('pair')) {
            const row = fmtOf(token).pair;
            st('pair', row === null ? null : { role: row.role, siblingPhaseId: row.role === 'second' ? `${classKey}_${row.siblings[0]}_${rest}` : null, combination: row.combination });
          }
        }
      }
      return apply([...extra, ...unit] as typeof unit);
    };
    return c;
  };
  return { obs, snap, rewrite, event, listing, xml, core };
}

export const field = (c: Core, a: string, f: string): any => c.presented(a)[f];
export const attemptMessages = (c: Core, from: number, a: string): Array<{ type: string; fields: Record<string, any> }> =>
  c.notifications().slice(from).filter((m) => m['type'] === 'attempt.updated' && m['attemptId'] === a) as never;
export const diagnosticKinds = (c: Core): string[] => (c.diagnostics() as Array<{ kind: string }>).map((d) => d.kind);
