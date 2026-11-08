/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #210 rows 1, 2, 3 (tier 1): hydration bodies (CONTRACTS §7.1), on-site serialisation (§7 intro), `/api/oncourse` (§7.1).
 * Interface: onsite-harness.ts header. Data: datasets.ts (recorded excerpts).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { api, boot, disposeAll, get, openWs, WHOLE, type J } from './onsite-harness.js';
import { feed, JNE, ODP } from './datasets.js';

afterEach(disposeAll);

const SCHEMAS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/arch/schemas');
function validators() {
  const Ctor = ((Ajv2020 as any).default ?? Ajv2020) as new (o: object) => any;
  const ajv = new Ctor({ strict: true, allErrors: true });
  const load = (f: string): J => JSON.parse(readFileSync(resolve(SCHEMAS, f), 'utf8')) as J;
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  const observed = ajv.compile(load('observed.schema.json'));
  const error = ajv.compile(load('error.schema.json'));
  return { observed, error };
}
const keys = (o: J): string[] => Object.keys(o).sort();

async function odp() {
  const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
  for (const u of ODP.units()) await feed(env, u);
  return env;
}

describe('row 1: hydration bodies (CONTRACTS §7.1)', () => {
  it('contract §7.1 GET /api/events/current: { asOfSeq, event, classes, courses }, a Class and a Course per recorded id, each Observed field valid against observed.schema.json', async () => {
    const env = await odp();
    const r = await get(env, '/api/events/current');
    expect(r.status).toBe(200);
    expect(keys(r.body)).toEqual(['asOfSeq', 'classes', 'courses', 'event', 'pendingPhaseIds']);
    expect(r.body.pendingPhaseIds, 'normally empty: every observed Phase has a class').toEqual([]);
    expect(typeof r.body.asOfSeq).toBe('number');
    expect(r.body.event).toMatchObject({ eventId: 'ev-1', name: 'Test Event' });
    expect(r.body.classes.map((c: J) => c.classId), 'every Class of the event, the recorded XML lists several').toContain(ODP.classId);
    expect(new Set(r.body.classes.map((c: J) => c.classId)).size).toBe(r.body.classes.length);
    for (const c of r.body.classes as J[]) { expect(keys(c)).toEqual(['ageCategories', 'classId', 'code', 'discipline', 'eventId', 'name']); expect(c.eventId).toBe('ev-1'); }
    expect(r.body.courses.length).toBeGreaterThan(0);
    const { observed } = validators();
    for (const c of r.body.courses as J[]) {
      expect(c.eventId).toBe('ev-1');
      for (const f of ['layout', 'gates', 'slots', 'sectorEndsAfterGate', 'splitsAfterGate', 'captions']) expect(observed(c[f]), `${c.courseId}.${f}: ${JSON.stringify(observed.errors)}`).toBe(true);
    }
  });

  it('contract §7.1 GET /api/classes/{classId}/phases|entries|standings|attempts: each body is its normative shape with a top-level asOfSeq and every Observed field valid', async () => {
    const env = await odp();
    const { observed } = validators();
    const cls = encodeURIComponent(ODP.classId);

    const ph = await get(env, `/api/classes/${cls}/phases`);
    expect(ph.status).toBe(200);
    expect(keys(ph.body)).toEqual(['asOfSeq', 'phases']);
    const phase = (ph.body.phases as J[]).find((p) => p.phaseId === ODP.phaseId)!;
    expect(keys(phase)).toEqual([...WHOLE['phase']!, 'phaseId'].sort());
    for (const f of ['courseId', 'scheduledStart', 'programmeOrder', 'title', 'status']) expect(observed(phase[f]), `phase.${f}`).toBe(true);

    const en = await get(env, `/api/classes/${cls}/entries`);
    expect(en.status).toBe(200);
    expect(keys(en.body)).toEqual(['asOfSeq', 'entries']);
    expect(keys(en.body.entries[0])).toEqual([...WHOLE['entry']!, 'entryId'].sort());
    for (const f of ['displayName', 'members', 'club', 'nation', 'ageCategoryId', 'eventBib', 'isTeam']) expect(observed(en.body.entries[0][f]), `entry.${f}`).toBe(true);

    const st = await get(env, `/api/classes/${cls}/standings`);
    expect(st.status).toBe(200);
    expect(keys(st.body)).toEqual(['asOfSeq', 'standings']);
    expect(st.body.standings.length).toBeGreaterThan(0);
    for (const s of st.body.standings as J[]) expect(keys(s)).toEqual(['anomalies', 'ageCategoryId', 'asOf', 'classId', 'entries', 'scope', 'standingKey'].sort());

    const at = await get(env, `/api/phases/${encodeURIComponent(ODP.phaseId)}/attempts`);
    expect(at.status).toBe(200);
    expect(keys(at.body)).toEqual(['asOfSeq', 'attempts']);
    const a = (at.body.attempts as J[]).find((x) => x.attemptId === ODP.attemptId)!;
    expect(keys(a)).toEqual([...WHOLE['attempt']!, 'attemptId'].sort());
    for (const f of WHOLE['attempt']!.filter((k) => k !== 'phaseId' && k !== 'bib')) expect(observed(a[f]), `attempt.${f}: ${JSON.stringify(a[f])}`).toBe(true);
  });

  it('contract §7.1 GET /api/oncourse, /api/phases/{id}/checks, /api/diagnostics: { asOfSeq, ... } shapes; GET /api/sources is an unwrapped SourceStatus with no asOfSeq', async () => {
    const env = await odp();
    const oc = await get(env, '/api/oncourse');
    expect(keys(oc.body)).toEqual(['asOf', 'asOfSeq', 'attempts', 'featuredByUpstream']);
    const ck = await get(env, `/api/phases/${encodeURIComponent(ODP.phaseId)}/checks`);
    expect(ck.status).toBe(200);
    expect(keys(ck.body)).toEqual(['asOfSeq', 'checks', 'flags']);
    const dg = await get(env, '/api/diagnostics');
    expect(keys(dg.body)).toEqual(['asOfSeq', 'diagnostics']);
    const src = await get(env, '/api/sources');
    expect(src.status).toBe(200);
    expect('asOfSeq' in src.body).toBe(false);
    expect(keys(src.body)).toEqual(['live', 'tcp', 'xml']);
    expect(keys(src.body.tcp)).toEqual(['state', 'timingClockOffsetSeconds', 'upstreamInstance']);
    expect(keys(src.body.xml)).toEqual(['lastRewriteDetectedAt', 'state']);
    expect(keys(src.body.live)).toEqual(['lastAcceptedAt', 'lastError', 'pendingResources', 'state']);
    expect(src.body.tcp.state).toBe('connected');
    expect(src.body.xml.state).toBe('connected');
    expect(src.body.live.state).toBe('not-configured');
  });

  it('contract §7.1 error rows: no event configured is 404 event-not-found; an unknown class is 404 class-not-found; an unknown phase is 404 phase-not-found, each an error.schema.json envelope', async () => {
    const { error } = validators();
    const none = await boot({ startAt: ODP.startAt, eventId: undefined, eventName: undefined });
    const noEvent = await get(none, '/api/events/current');
    expect(noEvent.status).toBe(404);
    expect(noEvent.body.error.code).toBe('event-not-found');
    expect(error(noEvent.body), JSON.stringify(error.errors)).toBe(true);

    const env = await odp();
    for (const [path, code] of [
      ['/api/classes/NOPE/phases', 'class-not-found'],
      ['/api/classes/NOPE/entries', 'class-not-found'],
      ['/api/classes/NOPE/standings', 'class-not-found'],
      ['/api/phases/NOPE/attempts', 'phase-not-found'],
      ['/api/phases/NOPE/checks', 'phase-not-found'],
    ] as const) {
      const r = await get(env, path);
      expect(r.status, path).toBe(404);
      expect(r.body.error.code, path).toBe(code);
      expect(error(r.body), `${path}: ${JSON.stringify(error.errors)}`).toBe(true);
      expect('details' in r.body.error, `${path}: details is absent on this code, never null`).toBe(false);
    }
  });
});

describe('row 2: on-site serialisation (CONTRACTS §7 intro, DERIVATIONS birthDate)', () => {
  it('contract §7 OnsitePerson: members[].birthYear is the recorded year (Birthdate 2014-01-01 in the XML), a number, and no member carries birthDate, on REST', async () => {
    const env = await odp();
    const en = await get(env, `/api/classes/${ODP.classId}/entries`);
    const entry = (en.body.entries as J[]).find((e) => e.members.state === 'known')!;
    expect(entry.members.value.length).toBeGreaterThan(0);
    for (const m of entry.members.value as J[]) {
      expect(m.birthYear).toBe(ODP.birthYear);
      expect('birthDate' in m).toBe(false);
    }
  });

  it('contract §7 OnsitePerson: birthYear is a number or null on every member of every entry, birthDate never present (REST, jarni-ne-do snapshot)', async () => {
    const env = await boot({ startAt: '2026-04-19T08:00:00.000Z', eventDate: JNE.day });
    for (const u of JNE.units()) await feed(env, u);
    const en = await get(env, '/api/classes/K1M/entries');
    const persons = (en.body.entries as J[]).flatMap((e) => (e.members.state === 'known' ? e.members.value : []) as J[]);
    expect(persons.length).toBeGreaterThan(0);
    for (const p of persons) {
      expect(p.birthYear === null || typeof p.birthYear === 'number').toBe(true);
      expect('birthDate' in p).toBe(false);
    }
  });

  it('contract §7 OnsitePerson: entry.updated pushes members with birthYear and without birthDate, the creating message included', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    for (const u of ODP.units()) await feed(env, u);
    await ws.barrier();
    const withMembers = ws.messages.filter((m) => m.type === 'entry.updated' && m.fields.members?.state === 'known');
    expect(withMembers.length).toBeGreaterThan(0);
    for (const m of withMembers) for (const p of m.fields.members.value as J[]) {
      expect(p.birthYear).toBe(ODP.birthYear);
      expect('birthDate' in p).toBe(false);
    }
  });

  it('contract §7 OnsiteEvent: the Event has no organiserId, on REST and on event.changed alike', async () => {
    const env = await odp();
    const ws = await openWs(env);
    const changed = await ws.until((m) => m.type === 'event.changed');
    const rest = (await get(env, '/api/events/current')).body.event as J;
    expect('organiserId' in rest).toBe(false);
    expect('organiserId' in changed.event).toBe(false);
    expect(keys(rest)).toEqual(['details', 'eventId', 'name']);
    expect(changed.event).toEqual(rest);
  });
});

describe('row 3: /api/oncourse (CONTRACTS §7.1)', () => {
  const ids = (b: J): string[] => (b.attempts as J[]).map((a) => a.attemptId);

  it('contract §7.1: asOf is null and the set is empty before any on-course observation; an empty array is valid', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const r = await get(env, '/api/oncourse');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ attempts: [], featuredByUpstream: null, asOf: null });
  });

  it('contract §7.1: ordered by courseOrder ascending (1 = closest to the finish), Attempts without one last, by startOrder', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const sent = ODP.listings(['3', '1', '2', null, null], [11, 12, 13, 14, 15], [31, 32, 33, 35, 34]);
    for (const u of sent) await feed(env, u);
    const r = await get(env, '/api/oncourse');
    const at = r.body.attempts as J[];
    expect(ids(r.body).slice(0, 3)).toEqual([`${ODP.phaseId}:12`, `${ODP.phaseId}:13`, `${ODP.phaseId}:11`]);
    for (const a of at.slice(0, 3)) expect(a.courseOrder.state).toBe('known');
    const rest = at.slice(3);
    expect(rest.map((a) => a.courseOrder.state)).toEqual(['not-yet', 'not-yet']);
    const so = rest.map((a) => a.startOrder);
    if (so.every((s: J) => s.state === 'known')) expect(so[0].value).toBeLessThan(so[1].value);
    expect(r.body.asOf, 'the ingest time of the unit at which the set last changed (round 27)').toBe(sent.at(-1)!.rec.observedAt);
  });

  it('contract §7.1 "A finish does not remove it": a finished Attempt stays listed with status finished until upstream drops it, then leaves on the oncourse-empty message', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const units = ODP.units();
    const upToFinish = units.slice(0, units.findIndex((u) => u.rec.data.includes('dtFinish="1') ) + 1);
    for (const u of upToFinish) await feed(env, u);
    const listed = await get(env, '/api/oncourse');
    const a = (listed.body.attempts as J[]).find((x) => x.attemptId === ODP.attemptId);
    expect(a, 'the finisher is still in the set').toBeDefined();
    expect(a!.status.value).toBe('finished');
    await feed(env, ODP.emptyAt(Date.parse(upToFinish.at(-1)!.rec.observedAt) + 1000));
    expect(ids((await get(env, '/api/oncourse')).body)).not.toContain(ODP.attemptId);
  });

  it('contract §7.2 oncourse.updated is the same set and order as /api/oncourse, attemptIds in courseOrder', async () => {
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day });
    const ws = await openWs(env);
    for (const u of ODP.listings(['2', '1'], [21, 22], [41, 42])) await feed(env, u);
    await ws.barrier();
    const last = [...ws.messages].reverse().find((m) => m.type === 'oncourse.updated')!;
    const rest = await get(env, '/api/oncourse');
    expect(last.attemptIds).toEqual(ids(rest.body));
    expect(last.attemptIds).toEqual([`${ODP.phaseId}:22`, `${ODP.phaseId}:21`]);
    expect(last.asOf).toBe(rest.body.asOf);
  });
});

void api;
