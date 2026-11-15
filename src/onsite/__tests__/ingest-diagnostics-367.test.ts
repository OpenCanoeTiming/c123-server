/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #373 row 10, finding #367 (DERIVATIONS §0.5): the parser's ingest-only diagnostic kinds
 * (`unparseable-field`, `gates-absent`, and the other two §0.5 lists) reach the on-site admin log
 * through the route PR #369 built for the core's own `xml-table-emptied`
 * (`OnsiteOptions.adminLog`, `drainIngestDiagnostics()`), never `GET /api/diagnostics` nor `/ws`
 * (ADR-015 Revision 5 rule 5's wire silence, read as covering every ingest-only kind, not only
 * `xml-table-emptied`). On main today they reach neither (#367's own wording: "the core's
 * `applyDiagnostic` ... keeps only `unparseable-cell` and `member-sum-mismatch` and drops every
 * other kind, and the on-site process passes no diagnostic to `adminLog`"). Interface:
 * onsite-harness.ts header; the `logger()` pattern and the wire/`/api/diagnostics` assertions are
 * `xml-table-emptied-321.test.ts`'s own, extended to the parser's kinds.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, disposeAll, feedTcp, feedXml, get, openWs, type Env } from './onsite-harness.js';
import { ODP } from './datasets.js';
import { TCP } from '../../ingest/__tests__/fixtures/tcp.js';
import type { OnsiteOptions } from '../index.js';

afterEach(disposeAll);

const logger = (): { entries: Array<Record<string, unknown>>; opts: Partial<OnsiteOptions> } => {
  const entries: Array<Record<string, unknown>> = [];
  return { entries, opts: { adminLog: (e: unknown) => { entries.push(e as Record<string, unknown>); } } as unknown as Partial<OnsiteOptions> };
};

/**
 * `ODP.xmlRec()` (datasets.ts) carries no `<Events>` table at all (its own header: "Classes,
 * Participants ..., Schedule, CourseData, Results"). One is injected here, ahead of the one
 * `<Participants>` block, with an unparseable `StartDate` (month 13, DERIVATIONS §10 item 40 (b)
 * / 42). ASSUMED SHAPE (not read from source, taken from #367's own issue text): the diagnostic
 * is `{ kind: 'unparseable-field', where: 'event', ... }`.
 */
const EVENTS_BAD_START_DATE =
  '  <Events>\r\n    <EventId>CZE1.1</EventId>\r\n    <MainTitle>Test Event</MainTitle>\r\n' +
  '    <StartDate>2026-13-45T00:00:00+02:00</StartDate>\r\n    <EndDate>2026-09-20T08:30:37+02:00</EndDate>\r\n  </Events>\n';
const xmlWithBadEventDate = (ms: number): { observedAt: string; data: string } => ({
  observedAt: new Date(ms).toISOString(),
  data: ODP.xmlRec().data.replace('<Participants>', `${EVENTS_BAD_START_DATE}<Participants>`),
});

/**
 * `TCP.onCourseFinished` (nkz-19so, bib 57, `K1M_BR1_19`, `dtFinish` stated: a finished listing)
 * with its `Gates` attribute removed entirely (`gates.test.ts` row (a)'s own pattern,
 * `.replace(/ Gates="[^"]*"/, '')`): no duration inference is possible (DERIVATIONS §0.5's
 * `gates-absent`). ASSUMED SHAPE: `{ kind: 'gates-absent', attemptId: 'K1M_BR1_19:57', ... }`.
 */
const FINISHED_NO_GATES = TCP.onCourseFinished.replace(/ Gates="[^"]*"/, '');

describe('#373 row 10, finding #367: the parser\'s ingest-only diagnostic kinds reach adminLog, never the wire', () => {
  it('DERIVATIONS §0.5: an unparseable StartDate (month 13) reaches adminLog once as unparseable-field, never GET /api/diagnostics nor /ws', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take(); // drop the setup traffic: only the unparseable snapshot's own unit is checked below.

    await feedXml(env, xmlWithBadEventDate(Date.parse(ODP.startAt) + 60_000));
    await ws.barrier();

    const own = log.entries.filter((e) => e['kind'] === 'unparseable-field');
    expect(own, 'exactly one admin-log entry for the unparseable StartDate').toHaveLength(1);
    expect(own[0]).toMatchObject({ kind: 'unparseable-field', where: 'event' });

    const wire = ws.take();
    for (const m of wire) expect(JSON.stringify(m), `no wire message names it: ${JSON.stringify(m)}`).not.toMatch(/unparseable-field/i);
    expect(wire.filter((m) => m['type'] === 'diagnostics.updated'), 'no diagnostics.updated for an ingest-only kind').toEqual([]);

    const diag = await get(env, '/api/diagnostics');
    expect(JSON.stringify(diag.body), 'GET /api/diagnostics does not carry it').not.toMatch(/unparseable-field/i);
  });

  it('DERIVATIONS §0.5: a finished on-course listing with no Gates attribute reaches adminLog once as gates-absent, never GET /api/diagnostics nor /ws', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: '2026-09-19T06:00:00.000Z', ...log.opts });
    const ws = await openWs(env);
    await ws.barrier();
    ws.take();

    await feedTcp(env, { observedAt: new Date(env.clock.now() + 1000).toISOString(), data: FINISHED_NO_GATES });
    await ws.barrier();

    const own = log.entries.filter((e) => e['kind'] === 'gates-absent');
    expect(own, 'exactly one admin-log entry for the finished listing with no Gates').toHaveLength(1);
    expect(own[0]).toMatchObject({ kind: 'gates-absent', attemptId: 'K1M_BR1_19:57' });

    const wire = ws.take();
    for (const m of wire) expect(JSON.stringify(m), `no wire message names it: ${JSON.stringify(m)}`).not.toMatch(/gates-absent/i);
    expect(wire.filter((m) => m['type'] === 'diagnostics.updated'), 'no diagnostics.updated for an ingest-only kind').toEqual([]);

    const diag = await get(env, '/api/diagnostics');
    expect(JSON.stringify(diag.body), 'GET /api/diagnostics does not carry it').not.toMatch(/gates-absent/i);
  });
});
