/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #373 row 13's optional case (M2 P3a follow-up; DERIVATIONS §10 item 42, CONTRACTS §2.4 "date is
 * assigned once and never changes", INV-5): a Phase that already has a date from an earlier
 * snapshot keeps it across a later snapshot whose `Schedule.StartTime` is unparseable -- the later
 * snapshot states no `date` at all (item 42: "the Phase keeps what it holds ... a date a snapshot
 * stated earlier stays"), so nothing is retracted and no `phase.updated` carries a changed `date`.
 * The parser's `unparseable-field` (`where` the phaseId, `name` `StartTime`) still reaches the
 * admin log, the route finding #367 and row 10 (`ingest-diagnostics-367.test.ts`) pin, never
 * `GET /api/diagnostics` nor `/ws`. Interface: onsite-harness.ts header; `logger()` pattern from
 * `xml-table-emptied-321.test.ts` / `ingest-diagnostics-367.test.ts`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, feedXml, get, openWs, type Env } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import type { OnsiteOptions } from '../index.js';

afterEach(disposeAll);

const logger = (): { entries: Array<Record<string, unknown>>; opts: Partial<OnsiteOptions> } => {
  const entries: Array<Record<string, unknown>> = [];
  return { entries, opts: { adminLog: (e: unknown) => { entries.push(e as Record<string, unknown>); } } as unknown as Partial<OnsiteOptions> };
};

/** `ODP.xmlRec()` (datasets.ts) gives `C1M_BR2_18` its date, '2026-04-18', from its own recorded
 * `Schedule.StartTime` (`2026-04-18T15:22:40+02:00`, checked against the fixture). A derived
 * snapshot with that one StartTime made unparseable (30 February), everything else -- including
 * every row's result data -- kept as recorded, at a later `observedAt`. */
const RECORDED_START_TIME = '<StartTime>2026-04-18T15:22:40+02:00</StartTime>';
const invalidStartTimeXml = (ms: number): { observedAt: string; data: string } => {
  const data = ODP.xmlRec().data;
  if (!data.includes(RECORDED_START_TIME)) throw new Error('fixture no longer carries the recorded StartTime');
  return derived(ODP.xmlRec(), { observedAt: new Date(ms).toISOString(), edit: (d) => d.replace(RECORDED_START_TIME, '<StartTime>2026-02-30T15:22:40+02:00</StartTime>') });
};

const phaseOf = async (env: Env): Promise<Record<string, unknown>> => {
  const r = await get(env, `/api/classes/${encodeURIComponent(ODP.classId)}/phases`);
  const p = (r.body.phases as Array<Record<string, unknown>>).find((x) => x['phaseId'] === ODP.phaseId);
  if (!p) throw new Error(`no Phase ${ODP.phaseId} in ${JSON.stringify(r.body)}`);
  return p;
};

describe('§10 item 42, CONTRACTS §2.4 INV-5: a Phase keeps an earlier date across an unparseable StartTime', () => {
  it('the date stays; no phase.updated carries a changed date; one unparseable-field reaches adminLog, never GET /api/diagnostics nor /ws', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    for (const u of ODP.units()) await feed(env, u); // the recorded units, StartTime valid throughout: the Phase's date is set, '2026-04-18'.

    const before = await phaseOf(env);
    expect(before['date'], 'precondition: the Phase already has a date from the recorded snapshot').toBe('2026-04-18');

    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop the setup/connect traffic: only the invalid-StartTime snapshot's own unit is checked below.

    await feedXml(env, invalidStartTimeXml(Date.parse(ODP.xmlRec().observedAt) + 3_600_000));
    await ws.barrier();
    const wire = ws.take();

    const after = await phaseOf(env);
    expect(after['date'], 'the date stays: an unparseable StartTime states no date, and INV-5 keeps what was stated earlier').toBe('2026-04-18');

    const phaseUpdates = wire.filter((m) => m['type'] === 'phase.updated' && m['phaseId'] === ODP.phaseId);
    for (const m of phaseUpdates) expect((m['fields'] as Record<string, unknown>), 'no phase.updated for this phase carries a changed date').not.toHaveProperty('date');

    const own = log.entries.filter((e) => e['kind'] === 'unparseable-field' && e['where'] === ODP.phaseId && e['name'] === 'StartTime');
    expect(own, 'exactly one admin-log entry for the unparseable StartTime').toHaveLength(1);

    for (const m of wire) expect(JSON.stringify(m), `no wire message names it: ${JSON.stringify(m)}`).not.toMatch(/unparseable-field/i);
    // ODP's own data raises an unrelated tcp/xml source-disagreement on C1M_BR2_18:56's placement (present on main
    // too, with no StartTime edit at all): diagnostics.updated is sent for THAT, and DERIVATIONS §0.5's rule is
    // only that the ingest-only kind itself never reaches it, not that nothing does.
    const diagUpdates = wire.filter((m) => m['type'] === 'diagnostics.updated') as Array<{ diagnostics: Array<{ kind: string }> }>;
    for (const m of diagUpdates) expect(m.diagnostics.filter((d) => d.kind === 'unparseable-field'), 'no diagnostics.updated carries the ingest-only kind').toEqual([]);
    const diag = await get(env, '/api/diagnostics');
    expect(JSON.stringify(diag.body), 'GET /api/diagnostics does not carry it').not.toMatch(/unparseable-field/i);
  });
});
