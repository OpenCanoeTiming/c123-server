/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pure builders shared by the #300 / #345 write-path tests (no state: every call builds a fresh process and fresh data).
 * Data: datasets.ts (jarni-so-odp C1M_BR2_18 bib 56, 19 gates, gate 13 = 2 in the recorded snapshot).
 */
import { expect } from 'vitest';
import { boot, derived, feedXml, get, post, setInstance, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { R19 } from '../../core/__tests__/fixtures/round19-excerpts.js';
import type { OnsiteOptions } from '../index.js';

export const PATH = `/api/attempts/${ODP.phaseId}/56/penalty`;
export const FLAGS = `/api/attempts/${ODP.phaseId}/56/flags`;
export const WRITES_FILE = '/data/onsite/writes-ev-1.json';
export const GOOD = { gate: ODP.gate, value: 50 };
export const K = (k: string): Record<string, string> => ({ 'Idempotency-Key': k });
export const write = (env: Env, body: unknown = GOOD, key = 'k1'): ReturnType<typeof post> => post(env, PATH, body, K(key));

/** An admin log collector: the entries `OnsiteOptions.adminLog` receives, in order. */
export function adminLog(): { entries: J[]; opts: Partial<OnsiteOptions> } {
  const entries: J[] = [];
  return { entries, opts: { adminLog: (e: unknown) => { entries.push(e as J); } } as unknown as Partial<OnsiteOptions> };
}

/**
 * The recorded stream through the closure of the run (bib 56 finished, left the on-course set), TCP connected to `Main`.
 * `tcpRows: false` feeds the snapshot alone (the gates are known from `xml` only).
 */
export async function closedRun(over: { tcpRows?: boolean; extra?: Partial<OnsiteOptions> } = {}): Promise<Env> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...(over.extra ?? {}) });
  const units = ODP.unitsXmlFirst();
  for (const u of over.tcpRows === false ? units.slice(0, 1) : units) await feed(env, u);
  if (over.tcpRows !== false) await feed(env, ODP.emptyAt(env.clock.now() + 1000));
  await setInstance(env, 'Main');
  const oc = await get(env, '/api/oncourse');
  expect(oc.body.attempts.map((a: J) => a.attemptId), 'precondition: the run is closed').not.toContain(ODP.attemptId);
  return env;
}

/** The recorded snapshot with bib 56's Results row reduced to a start-list row: no times, no gates, no ranks (a derived case). */
export const startListXml = (): { observedAt: string; data: string } => derived(R19.rcXml, {
  edit: (d) => d
    .replace(/<dtStart>[^<]*<\/dtStart>/, '<dtStart />').replace(/<dtFinish>[^<]*<\/dtFinish>/, '<dtFinish />').replace(/<Time>120980<\/Time>/, '<Time />')
    .replace(/<Gates>[^<]*<\/Gates>/, '<Gates />').replace(/<GateTimes>[^<]*<\/GateTimes>/, '<GateTimes />').replace(/<Pen>2<\/Pen>/, '<Pen />').replace(/<Total>122980<\/Total>/, '<Total />')
    .replace(/<(Rnk|RnkOrder|CatRnk|CatRnkOrder|TotalRnk|TotalRnkOrder|TotalCatRnk|TotalCatRnkOrder)>\d+<\/\1>/g, '<$1 />'),
});

/** A process whose only knowledge of bib 56 is the start-list snapshot (the course is bound, no gates vector is stated), TCP up as `Main`. */
export async function startListOnly(extra: Partial<OnsiteOptions> = {}): Promise<Env> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...extra });
  await feedXml(env, startListXml());
  await setInstance(env, 'Main');
  return env;
}

export const attemptOf = async (env: Env): Promise<J> => (await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts.find((x: J) => x.attemptId === ODP.attemptId);

/** The gate count of the Attempt's course, read from the course resource (hydration), not from the Attempt. */
export async function courseGateCount(env: Env): Promise<number> {
  const body = (await get(env, '/api/events/current')).body;
  const known = (body.courses as J[]).filter((c) => c.gates?.state === 'known');
  expect(known.length, 'precondition: exactly one course states its gates in the recorded snapshot of the Phase (course 1)').toBeGreaterThan(0);
  const g = known.find((c) => c.courseId === '1') ?? known[0]!;
  return Array.isArray(g.gates.value) ? g.gates.value.length : (g.gates.value as number);
}

/**
 * A failing writes store: every rename onto the writes file fails (after its temporary file was written) while `failing` is true. A failed rename,
 * not a kill. The `fs` the store is opened with is the injected one (`env.fs`), the natural seam of this process.
 */
export function failWritesStore(env: Env): { stop(): void; failures: number } {
  const ctl = { failures: 0, on: true, stop: () => { ctl.on = false; } };
  env.fs.ctl.beforeRename = (_from: string, to: string): void => {
    if (ctl.on && to.includes('writes-')) { ctl.failures++; throw Object.assign(new Error('EIO rename'), { code: 'EIO' }); }
  };
  return { get failures() { return ctl.failures; }, stop: ctl.stop } as { stop(): void; failures: number };
}

/** What a restart over `env`'s durable files finds, after a kill (only completed renames survive), as a new process with the stream replayed. */
export async function restartedAfterKill(env: Env, extra: Partial<OnsiteOptions> = {}): Promise<Env> {
  const fs2 = env.fs.afterKill();
  env.h.kill();
  const env2 = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: fs2, clock: virtualClock(env.clock.now() + 60_000), ...extra });
  for (const u of ODP.unitsXmlFirst()) await feed(env2, u);
  await feed(env2, ODP.emptyAt(env2.clock.now() + 1000));
  await setInstance(env2, 'Main');
  return env2;
}

/** The writes file as parsed, or undefined when it does not exist. */
export function writesFile(env: Env): { writes: J[]; writeKeys: Record<string, J>; flagKeys: Record<string, J> } | undefined {
  const t = env.fs.files.get(WRITES_FILE);
  return t === undefined ? undefined : JSON.parse(t);
}
