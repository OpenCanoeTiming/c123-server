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
import { boot, disposeAll, feedTcp, feedXml, get, openWs, XML_PATH, type Env } from './onsite-harness.js';
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

  it('DERIVATIONS §4.12 rows 6b/6c: xml-table-emptied is raised once per emptying, not once per empty snapshot, and again once a row has returned', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    for (const u of ODP.units()) await feed(env, u);

    // 6a: the first emptying raises one entry (row 8's own scenario, repeated here as the base of the sequence).
    let at = Date.parse(ODP.xmlRec().observedAt) + 3_600_000;
    await feedXml(env, emptiedXml(at));
    expect(log.entries, '6a: one entry').toHaveLength(1);

    // 6b: a second empty snapshot of the same still-emptied race raises no second entry.
    at += 600_000;
    await feedXml(env, emptiedXml(at));
    expect(log.entries, '6b: still one entry, none added').toHaveLength(1);

    // a snapshot of the race that carries a row again (the recorded row restored).
    at += 600_000;
    await feedXml(env, { observedAt: new Date(at).toISOString(), data: ODP.xmlRec().data });
    expect(log.entries, 'restoring the row raises no entry of its own').toHaveLength(1);

    // 6c: a new emptying after the row returned raises one more entry.
    at += 600_000;
    await feedXml(env, emptiedXml(at));
    expect(log.entries, '6c: a second entry, for the new emptying').toHaveLength(2);
    expect(log.entries[1]).toMatchObject({ kind: 'xml-table-emptied', phaseId: ODP.phaseId, count: 1 });
  });
});

describe('#321 row 7: the guard on xml-table-emptied\'s count (DERIVATIONS §4.12)', () => {
  it('DERIVATIONS §4.12 row 7a: a first read (changedAfter null) of an empty table over a tcp-held result raises none', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    for (const u of ODP.units()) if (u.kind === 'tcp') await feedTcp(env, u.rec); // bib 56's result, tcp-held, no xml read of this path yet.
    // the first-ever read of the xml path: the reader has no earlier stat, so changedAfter is null (DERIVATIONS §0.3).
    await feedXml(env, emptiedXml(env.clock.now() + 3_600_000));
    expect(log.entries, 'a first read never qualifies: no entry').toHaveLength(0);
  });

  it('DERIVATIONS §4.12 row 7b: a file whose changedAfter predates the tcp delivery raises none', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    for (const u of ODP.units()) await feed(env, u);
    const lastStat = env.clock.now(); // feedXml leaves the clock one poll after the recorded instant: the reader's last stat (rebaseline.test.ts's own technique).

    // a new tcp delivery of bib 56, after lastStat: the Attempt's last tcp delivery is now lastStat + 30s.
    const tTcp = lastStat + 30_000;
    await feedTcp(env, ODP.rowAt(tTcp).rec);

    // a big jump with no poll in between (VClock.jump fires no timer), then the file is rewritten and the
    // backlogged poll fires at the jumped instant: changedAfter is still the reader's last real stat, lastStat
    // (verified directly against the step log before committing this test; see the test record) -- which
    // predates tTcp, so the guard refuses the only candidate, and the diagnostic (count 0) is not raised at all.
    const much = tTcp + 3_600_000;
    env.fs.put(XML_PATH, emptiedXml(much).data, much);
    env.clock.jump(much);
    await env.clock.advance(5_000);

    expect(log.entries, 'the guard refuses the only candidate: no entry').toHaveLength(0);
  });

  it('DERIVATIONS §4.12 row 7c: a race whose table never had rows raises none', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    // the very first unit this process ever sees for this path is already the empty table: no row, tcp or xml, ever named this race.
    await feedXml(env, emptiedXml(Date.parse(ODP.startAt) + 60_000));
    expect(log.entries, 'no Attempt ever held a result here: no entry').toHaveLength(0);
    expect((await get(env, `/api/phases/${ODP.phaseId}/attempts`)).body.attempts).toEqual([]);
  });

  it('DERIVATIONS §4.12 row 7d: an xml-held result counts whatever the content age', async () => {
    const log = logger();
    const env: Env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...log.opts });
    await feedXml(env, ODP.xmlRec()); // bib 56's result is xml-held: no tcp push ever stated it (contrast with row 7a/7b, both tcp-held).
    const before = await get(env, `/api/phases/${ODP.phaseId}/attempts`);
    expect(before.body.attempts.find((x: any) => x.attemptId === ODP.attemptId).outcome.source, 'precondition: xml, not tcp').toBe('xml');

    await feedXml(env, emptiedXml(Date.parse(ODP.xmlRec().observedAt) + 3_600_000));
    expect(log.entries, 'the xml-held result is counted, unconditionally').toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'xml-table-emptied', phaseId: ODP.phaseId, count: 1 });
  });
});
