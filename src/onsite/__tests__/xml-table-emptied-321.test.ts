/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #321 row 8 (M2 P3a part 1 of 3): the ingest-only diagnostic `xml-table-emptied` (DERIVATIONS
 * §0.5, §4.12; §10 item 26) reaches the admin log, the `OnsiteOptions.adminLog` option
 * `store-set-aside` already uses, and never `GET /api/diagnostics` nor `diagnostics.updated`: no
 * wire shape moves (ADR-015 Revision 5 rule 5). No route for an ingest-only kind exists yet
 * (finding #367; `src/onsite/index.ts`'s `AdminLogEntry` has only `'store-set-aside'`), so this is
 * new on-site coverage, not a replay of an existing route. Interface: onsite-harness.ts header,
 * `startup-store.test.ts`'s `logger()` pattern.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, feedXml, get, openWs, type Env } from './onsite-harness.js';
import { feed, ODP } from './datasets.js';
import type { OnsiteOptions } from '../index.js';

afterEach(disposeAll);

const logger = (): { entries: Array<Record<string, unknown>>; opts: Partial<OnsiteOptions> } => {
  const entries: Array<Record<string, unknown>> = [];
  return { entries, opts: { adminLog: (e: unknown) => { entries.push(e as Record<string, unknown>); } } as unknown as Partial<OnsiteOptions> };
};

/**
 * The recorded snapshot (`ODP.xmlRec()`) with its one `<Results>` row of `C1M_BR2_18` removed, the
 * `<Schedule>` row kept: a race the schedule names with no result row at all (ADR-015 Revision 5
 * rule 5's "wholly empty table", not a row's fields gone blank). Only this one `<Results>` block
 * exists in the fixture (checked against `R19.rcXml.data`), so the replace is unambiguous.
 */
const emptiedXml = (ms: number): { observedAt: string; data: string } => ({
  observedAt: new Date(ms).toISOString(),
  data: ODP.xmlRec().data.replace(/<Results>[\s\S]*?<\/Results>\n/, ''),
});

describe('#321 row 8: xml-table-emptied reaches the admin log, never the wire', () => {
  it('DERIVATIONS §0.5, §10 item 26: xml-table-emptied reaches the admin log and never GET /api/diagnostics nor diagnostics.updated', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    const ws = await openWs(env);
    for (const u of ODP.units()) await feed(env, u); // bib 56 of C1M_BR2_18 holds a result (the setup the emptying retracts nothing from).
    await ws.barrier();
    ws.take(); // drop the setup messages: only the emptying's own traffic is checked below.

    // the race's table is emptied an hour later: content age well past bib 56's last tcp delivery (the guard admits the count).
    await feedXml(env, emptiedXml(Date.parse(ODP.xmlRec().observedAt) + 3_600_000));
    await ws.barrier();

    expect(log.entries, 'exactly one admin-log entry for the emptying').toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'xml-table-emptied', phaseId: ODP.phaseId, count: 1 });

    const wire = ws.take();
    for (const m of wire) expect(JSON.stringify(m), `no wire message names it: ${JSON.stringify(m)}`).not.toMatch(/xml-table-emptied/i);
    expect(wire.filter((m) => m['type'] === 'diagnostics.updated'), 'no diagnostics.updated for an ingest-only kind').toEqual([]);

    const diag = await get(env, '/api/diagnostics');
    expect(JSON.stringify(diag.body), 'GET /api/diagnostics does not carry it').not.toMatch(/xml-table-emptied/i);

    // bib 56's result is untouched (rule 5: a wholly empty table retracts nothing).
    const attempts = await get(env, `/api/phases/${ODP.phaseId}/attempts`);
    const a = attempts.body.attempts.find((x: any) => x.attemptId === ODP.attemptId);
    expect(a.outcome.state).toBe('known');
  });
});
