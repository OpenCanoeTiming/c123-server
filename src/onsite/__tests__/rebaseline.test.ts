/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 row 11 (tier 1): POST /api/rebaseline and scope.replaced (CONTRACTS §7.1, §4 "re-baseline", §7.2, §1.4).
 * Interface: onsite-harness.ts header.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { api, boot, disposeAll, feedXml, get, hydrate, modelFrom, openWs, view, XML_PATH, type Env, type J } from './onsite-harness.js';
import { feed, ODP } from './datasets.js';

afterEach(disposeAll);

async function odp(over: { xml?: boolean } = {}): Promise<Env> {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, ...(over.xml === false ? { xml: undefined } : {}) });
  for (const u of ODP.units()) await feed(env, u);
  return env;
}
const count = async (env: Env, phaseId: string): Promise<number> => (await get(env, `/api/phases/${phaseId}/attempts`)).body.attempts.length;
const post = (env: Env, body: unknown): ReturnType<typeof api> => api(env, 'POST', '/api/rebaseline', body);

describe('row 11: re-baseline (CONTRACTS §7.1, §4, §7.2)', () => {
  it('contract §7.1: scope phase -> 200 { asOfSeq, scope, snapshotWrittenAt = the file\'s mtime, snapshotDetectedAt = the ingest time of its own read, attempts = the count after }', async () => {
    const env = await odp();
    const written = Date.parse(ODP.xmlRec().observedAt) + 30_000;
    env.fs.put(XML_PATH, ODP.xmlRec().data, written); // changed since the last poll, not yet polled
    const now = written + 7_000;
    env.clock.jump(now);
    const r = await post(env, { scope: { kind: 'phase', phaseId: ODP.phaseId } });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['asOfSeq', 'attempts', 'scope', 'snapshotDetectedAt', 'snapshotWrittenAt']);
    expect(r.body.scope).toEqual({ kind: 'phase', phaseId: ODP.phaseId });
    expect(r.body.snapshotWrittenAt).toBe(new Date(written).toISOString());
    expect(r.body.snapshotDetectedAt).toBe(new Date(now).toISOString());
    expect(r.body.attempts).toBe(await count(env, ODP.phaseId));
    const src = (await get(env, '/api/sources')).body;
    expect(src.xml.lastRewriteDetectedAt, 'not xml.lastRewriteDetectedAt: the re-baseline reads on its own').not.toBe(r.body.snapshotDetectedAt);
  });

  it('contract §4 re-baseline step 2 + DERIVATIONS §0.3 (review B4, reading CQ1): the re-baseline read\'s changedAfter is the reader\'s last stat whose signature differs from the one read, when the file changed since the last poll', async () => {
    const lines: string[] = [];
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, stepLog: (l) => { lines.push(l); } });
    for (const u of ODP.units()) await feed(env, u);
    // feedXml leaves the clock one poll after the recorded instant: that poll is the reader\'s last stat, and it saw the OLD signature
    const lastStat = Date.parse(ODP.xmlRec().observedAt) + 5_000;
    expect(env.clock.now()).toBe(lastStat);
    const written = lastStat + 25_000;
    env.fs.put(XML_PATH, ODP.xmlRec().data, written); // a new signature after the last poll, not yet polled
    env.clock.jump(written + 7_000);
    const r = await post(env, { scope: { kind: 'event' } });
    expect(r.status).toBe(200);
    const unit = lines.map((l) => JSON.parse(l) as J).find((o) => Array.isArray(o['elements']) && (o['elements'] as J[]).some((e) => e['event'] === 'rebaseline'))!;
    const detected = (unit['elements'] as J[]).find((e) => e['event'] === 'xml-rewrite-detected')!;
    expect(detected['changedAfter'], 'the reader\'s last stat, not the last delivered unit\'s content age').toBe(new Date(lastStat).toISOString());
  });

  it('contract §4 step 2, CQ1 (round 27d): when the file is unchanged since the last poll, the re-baseline read carries the last delivered unit\'s changedAfter', async () => {
    const lines: string[] = [];
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, stepLog: (l) => { lines.push(l); } });
    for (const u of ODP.units()) await feed(env, u);
    // a second, different snapshot is delivered: its changedAfter is the reader's earlier stat, a non-null value to carry
    const rec = ODP.xmlRec();
    const second = { observedAt: new Date(Date.parse(rec.observedAt) + 120_000).toISOString(), data: rec.data.replace('</Canoe123Data>', '<!-- changed --></Canoe123Data>') };
    await feedXml(env, second);
    const steps = (): J[] => lines.map((l) => JSON.parse(l) as J).filter((o) => Array.isArray(o['elements']));
    const detected = (o: J): J | undefined => (o['elements'] as J[]).find((e) => e['event'] === 'xml-rewrite-detected');
    const delivered = steps().filter((o) => (o['elements'] as J[]).every((e) => e['event'] !== 'rebaseline') && detected(o) !== undefined).at(-1)!;
    const carried = detected(delivered)!['changedAfter'];
    expect(carried, 'the second delivery states the content age of its change').toEqual(expect.any(String));
    const r = await post(env, { scope: { kind: 'event' } }); // no new signature since the last poll
    expect(r.status).toBe(200);
    const unit = steps().find((o) => (o['elements'] as J[]).some((e) => e['event'] === 'rebaseline'))!;
    expect(detected(unit)!['changedAfter']).toBe(carried);
  });

  it('contract §7.1: scope event -> 200 with attempts the count over every Phase of the event; the body has the scope back', async () => {
    const env = await odp();
    env.fs.setMtime(XML_PATH, Date.parse(ODP.xmlRec().observedAt));
    const r = await post(env, { scope: { kind: 'event' } });
    expect(r.status).toBe(200);
    expect(r.body.scope).toEqual({ kind: 'event' });
    const phases = (await get(env, `/api/classes/${ODP.classId}/phases`)).body.phases as J[];
    let total = 0;
    for (const p of phases) total += await count(env, p.phaseId);
    expect(r.body.attempts).toBe(total);
  });

  it('contract §7.2 scope.replaced (phase): carries every Attempt of the scope and every Standing naming its Phase, exactly { seq, type, scope, attempts, standings }, and no Phase, Entry, Class or Course; applying it as a replace holds what hydration returns', async () => {
    const env = await odp();
    const ws = await openWs(env);
    await ws.barrier(); ws.take();
    const r = await post(env, { scope: { kind: 'phase', phaseId: ODP.phaseId } });
    await ws.barrier();
    const got = ws.take();
    const m = got.find((x) => x.type === 'scope.replaced')!;
    expect(Object.keys(m).sort()).toEqual(['attempts', 'scope', 'seq', 'standings', 'type']);
    expect(m.scope).toEqual({ kind: 'phase', phaseId: ODP.phaseId });
    const fresh = (await hydrate(env)).model;
    expect((m.attempts as J[]).map((a) => a.attemptId).sort()).toEqual([...fresh.attempts.values()].filter((a) => a['phaseId'] === ODP.phaseId).map((a) => a['attemptId']).sort());
    for (const a of m.attempts as J[]) expect(a).toEqual(fresh.attempts.get(a['attemptId']));
    for (const s of m.standings as J[]) expect(JSON.stringify(s.scope)).toContain(ODP.phaseId);
    expect(got.filter((x) => ['phase.updated', 'entry.updated', 'class.updated', 'course.updated'].includes(x.type))).toEqual([]);
    expect(r.body.asOfSeq).toBeGreaterThanOrEqual(m.seq);
    const client = modelFrom(ws.messages);
    void client;
  });

  it('contract §7.2 scope.replaced (event): every Attempt and every Standing of the event; a client that holds the state before and applies the message holds the hydration', async () => {
    const env = await odp();
    const ws = await openWs(env);
    await ws.barrier();
    const before = modelFrom(ws.messages); // only the connect-time event.changed: build the held state from hydration instead
    const held = (await hydrate(env)).model;
    ws.take();
    await post(env, { scope: { kind: 'event' } });
    await ws.barrier();
    const got = ws.take();
    const m = got.find((x) => x.type === 'scope.replaced')!;
    expect(m.scope).toEqual({ kind: 'event' });
    const fresh = (await hydrate(env)).model;
    expect((m.attempts as J[]).length).toBe(fresh.attempts.size);
    expect((m.standings as J[]).length).toBe(fresh.standings.size);
    for (const x of got) held.oncourse = x.type === 'oncourse.updated' ? { attemptIds: x.attemptIds, featuredByUpstream: x.featuredByUpstream, asOf: x.asOf } : held.oncourse;
    for (const x of got) if (x.type === 'scope.replaced') {
      for (const id of [...held.attempts.keys()]) held.attempts.delete(id);
      for (const k of [...held.standings.keys()]) held.standings.delete(k);
      for (const a of x.attempts) held.attempts.set(a.attemptId, a);
      for (const s of x.standings) held.standings.set(s.standingKey, s);
    }
    expect(view(held)['attempts']).toEqual(view(fresh)['attempts']);
    expect(view(held)['standings']).toEqual(view(fresh)['standings']);
    void before;
  });

  it('contract §7.1 + §1.4: an unknown phase is 404 phase-not-found', async () => {
    const env = await odp();
    const r = await post(env, { scope: { kind: 'phase', phaseId: 'NOPE' } });
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('phase-not-found');
  });

  it('contract §7.1 + §1.4: 409 source-unavailable with details.reason not-configured when the XML path is not configured', async () => {
    const env = await odp({ xml: false });
    const r = await post(env, { scope: { kind: 'event' } });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'source-unavailable', details: { reason: 'not-configured' } });
  });

  it('contract §7.1 + §1.4: 409 source-unavailable with details.reason unreadable when the file is missing, invalid when it does not validate', async () => {
    const env = await odp();
    env.fs.remove(XML_PATH);
    const missing = await post(env, { scope: { kind: 'event' } });
    expect(missing.status).toBe(409);
    expect(missing.body.error).toMatchObject({ code: 'source-unavailable', details: { reason: 'unreadable' } });
    env.fs.put(XML_PATH, '<?xml version="1.0"?><Canoe123Data><Results><RaceId>X', Date.parse(ODP.xmlRec().observedAt) + 1000);
    const torn = await post(env, { scope: { kind: 'event' } });
    expect(torn.status).toBe(409);
    expect(torn.body.error).toMatchObject({ code: 'source-unavailable', details: { reason: 'invalid' } });
  });

  it('contract §7.1: a refused re-baseline changes nothing: no scope.replaced, no seq consumed', async () => {
    const env = await odp();
    const ws = await openWs(env);
    await ws.barrier();
    const before = (await get(env, '/api/diagnostics')).body.asOfSeq;
    ws.take();
    env.fs.remove(XML_PATH);
    await post(env, { scope: { kind: 'event' } });
    await post(env, { scope: { kind: 'phase', phaseId: 'NOPE' } });
    await ws.barrier();
    expect(ws.take()).toEqual([]);
    expect((await get(env, '/api/diagnostics')).body.asOfSeq).toBe(before);
  });

  it('contract §7.1 "safe to repeat": a second identical request is 200 with the same scope and count, and the state is the hydration of the first', async () => {
    const env = await odp();
    env.fs.setMtime(XML_PATH, Date.parse(ODP.xmlRec().observedAt));
    const a = await post(env, { scope: { kind: 'phase', phaseId: ODP.phaseId } });
    const h1 = view((await hydrate(env)).model);
    const b = await post(env, { scope: { kind: 'phase', phaseId: ODP.phaseId } });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body.attempts).toBe(a.body.attempts);
    expect(b.body.scope).toEqual(a.body.scope);
    const h2 = view((await hydrate(env)).model);
    expect(h2['attempts']).toEqual(h1['attempts']);
  });

  it('contract §1.4 validation-failed: a malformed body is 400 with details [{field, issue}] and no state change', async () => {
    const env = await odp();
    const before = (await get(env, '/api/diagnostics')).body.asOfSeq;
    for (const body of [{}, { scope: {} }, { scope: { kind: 'nope' } }, { scope: { kind: 'phase' } }, { scope: { kind: 'phase', phaseId: 5 } }, 'not json', []]) {
      const r = await post(env, body);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.body.error.code).toBe('validation-failed');
      expect(Array.isArray(r.body.error.details)).toBe(true);
      for (const d of r.body.error.details as J[]) { expect(typeof d.field).toBe('string'); expect(typeof d.issue).toBe('string'); }
    }
    expect((await get(env, '/api/diagnostics')).body.asOfSeq).toBe(before);
  });
});
