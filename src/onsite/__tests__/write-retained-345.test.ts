/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * #345 item 50 (g) (DA ruling item 21, CQ3; DERIVATIONS §6): after a step that resolved a write, every write left pending on the cell takes the delivered
 * value as its retained value, whichever source delivered it; a later delivery of that value, on TCP or in the XML, is the earlier write's echo arriving
 * again and no echo for the later write. Tests (N), (N'), (N''). Channel: the write path (REST); TCP results rows and the XML snapshot.
 * N7 (re-review): a concurrent same-key flag request while a failing key binding is still writing.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { boot, derived, disposeAll, feedXml, setInstance, virtualClock, type Env, type J } from './onsite-harness.js';
import { ODP, feed } from './datasets.js';
import { R19 } from '../../core/__tests__/fixtures/round19-excerpts.js';
import { FLAGS, K, WRITES_FILE, adminLog, attemptOf, closedRun, rowOver, write, writeState } from './write-fixtures-300.js';
import { post } from './onsite-harness.js';

afterEach(disposeAll);
const cell = (g: J, n: number): number | null => g.value.find((c: J) => c.number === n).penalty;

/** The recorded snapshot restating the presented run (Time 81.62, as `ODP.xmlWithGate13`) with gate 3 = `v` (gate 13 stays 2), at `ms`. */
const xmlWithGate3 = (v: 0 | 2 | 50, ms: number): { observedAt: string; data: string } => derived(R19.rcXml, {
  observedAt: new Date(ms).toISOString(),
  edit: (d) => {
    const pen = 2 + v;
    return d.replace(/<Gates>((?:...){2})(...)/, (_m, a) => `<Gates>${a as string}${String(v).padStart(3, ' ')}`).replace(/<Pen>2<\/Pen>/, `<Pen>${pen}</Pen>`)
      .replace(/<Time>120980<\/Time>/, '<Time>81620</Time>').replace(/<Total>122980<\/Total>/, `<Total>${81620 + pen * 1000}</Total>`)
      .replace(/<dtStart>[^<]*<\/dtStart>/, '<dtStart>15:51:40.580</dtStart>')
      .replace(/<Rnk>\d+<\/Rnk>/, '<Rnk>11</Rnk>').replace(/<RnkOrder>\d+<\/RnkOrder>/, '<RnkOrder>11</RnkOrder>')
      .replace(/<TotalRnk>\d+<\/TotalRnk>/, '<TotalRnk>11</TotalRnk>').replace(/<TotalRnkOrder>\d+<\/TotalRnkOrder>/, '<TotalRnkOrder>11</TotalRnkOrder>');
  },
});
/** An XML save written after both writes: a poll sees the old file after the submissions, then the new file appears (its content age is later than `submittedAt`). */
async function xmlSave(env: Env, v: 0 | 2 | 50): Promise<void> {
  await env.clock.advance(10_000);
  await feedXml(env, xmlWithGate3(v, env.clock.now() + 1000));
}

/**
 * The XML-only lifetime (the snapshot alone: gates known from `xml`, gate 3 = 0; an XML delivery is an echo only where it is what is presented) and writes
 * 2 then 50 on it, both admitted and pending.
 */
async function twoWrites(): Promise<{ env: Env; a: string; b: string }> {
  const env = await closedRun({ tcpRows: false });
  expect((await attemptOf(env)).gates, 'precondition: the vector is known from xml').toMatchObject({ state: 'known', source: 'xml' });
  expect(cell((await attemptOf(env)).gates, 3), 'precondition: the cell holds 0').toBe(0);
  const a = await write(env, { gate: 3, value: 2 }, 'ka');
  const b = await write(env, { gate: 3, value: 50 }, 'kb');
  expect([a.status, b.status], 'precondition: both admitted').toEqual([202, 202]);
  expect([(await writeState(env, a.body.writeId)).status, (await writeState(env, b.body.writeId)).status], 'precondition: both pending').toEqual(['pending', 'pending']);
  return { env, a: a.body.writeId, b: b.body.writeId };
}
const st = async (env: Env, ...ids: string[]): Promise<string[]> => Promise.all(ids.map(async (i) => (await writeState(env, i)).status));

describe('CQ3 (item 21): the retained value of a write left pending moves with a resolution by either source', () => {
  it('(N) item 50 (g): an XML save stating 2 confirms the first; a TCP row stating 2 is no echo for the second: pending, 50 presented; a TCP row stating 50 confirms it', async () => {
    const { env, a, b } = await twoWrites();
    await xmlSave(env, 2);
    expect(await st(env, a, b), 'precondition: the save confirmed the first and left the second pending').toEqual(['confirmed', 'pending']);
    await feed(env, rowOver(env, { 3: 2 }));
    expect((await writeState(env, b)).status, 'the earlier write\'s echo arriving again').toBe('pending');
    const g = (await attemptOf(env)).gates;
    expect(g).toMatchObject({ source: 'operator-write', provisional: true });
    expect(cell(g, 3)).toBe(50);
    await feed(env, rowOver(env, { 3: 50 }));
    expect((await writeState(env, b)).status).toBe('confirmed');
  });

  it('(N\') item 50 (g): the same with a restart after the XML save (the moved value is stored): the same outcome', async () => {
    const { env: env1, a, b } = await twoWrites();
    await xmlSave(env1, 2);
    expect(await st(env1, a, b), 'precondition: the save confirmed the first and left the second pending').toEqual(['confirmed', 'pending']);
    await env1.h.stop();
    const env = await boot({ startAt: ODP.startAt, eventDate: ODP.day, fs: env1.fs, clock: virtualClock(env1.clock.now() + 60_000) });
    await setInstance(env, 'Main');
    await feedXml(env, derived(R19.rcXml, { edit: (d) => d.replace(/<Results>[\s\S]*?<\/Results>/, '') }));
    expect(await attemptOf(env), 'precondition: course bound, the Attempt does not exist yet').toBeUndefined();
    expect(await st(env, a, b), 'precondition: the second resumed pending').toEqual(['confirmed', 'pending']);
    await feed(env, rowOver(env, { 3: 2 }));
    expect((await writeState(env, b)).status, 'its stored retained value is 2').toBe('pending');
    await feed(env, rowOver(env, { 3: 50 }));
    expect((await writeState(env, b)).status).toBe('confirmed');
  });

  it('(N\'\') item 50 (g): the mirror: a TCP row confirms the first; an XML save stating 2 leaves the second pending', async () => {
    const { env, a, b } = await twoWrites();
    await feed(env, rowOver(env, { 3: 2 }));
    expect(await st(env, a, b), 'precondition: the row confirmed the first and left the second pending').toEqual(['confirmed', 'pending']);
    await xmlSave(env, 2);
    expect((await writeState(env, b)).status, 'the XML save restates the value the second command was sent over').toBe('pending');
    await xmlSave(env, 50);
    expect((await writeState(env, b)).status, 'an XML save stating 50 confirms it').toBe('confirmed');
  });
});

describe('N7 (re-review): a flag key while a failing key binding is still writing', () => {
  it('§1.5 / §2.10: a concurrent same-key flag request does not read the key as bound: it waits for the first\'s outcome; after the 500 it is a new creation (201, a new id) and exactly one admin entry names the failure', async () => {
    const a = adminLog();
    const issued: string[] = [];
    let n = 0;
    const env = await closedRun({ extra: { ...a.opts, newId: () => { const id = `flag-${++n}`; issued.push(id); return id; } } });
    // the first rename onto the writes file is held, then fails
    let reached!: () => void; const reachedP = new Promise<void>((r) => { reached = r; });
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    let armed = true;
    env.fs.ctl.beforeRename = async (_f: string, to: string): Promise<void> => {
      if (armed && to.includes('writes-')) { armed = false; reached(); await gate; throw Object.assign(new Error('EIO rename'), { code: 'EIO' }); }
    };
    const logged = a.entries.filter((e) => e['kind'] === 'store-write-failed').length;
    const body = { gate: 5, comment: 'touched?' };
    const first = post(env, FLAGS, body, K('f1'));
    await reachedP;
    expect(issued, 'precondition: the first request chose its id and is writing the binding').toHaveLength(1);
    let secondDone = false;
    const second = post(env, FLAGS, body, K('f1')).then((r) => { secondDone = true; return r; });
    for (let i = 0; i < 50; i++) await new Promise<void>((r) => setImmediate(r));
    expect(secondDone, 'the second request waits for the first\'s outcome: it did not answer from a bound key').toBe(false);
    release();
    const r1 = await first;
    expect(r1.status, 'the failed creation is not acknowledged').toBe(500);
    const r2 = await second;
    expect(r2.status, 'after the failure the key is free: a new creation').toBe(201);
    expect(issued).toHaveLength(2);
    expect(r2.body.flagId).toBe(issued[1]);
    expect(r2.body.flagId).not.toBe(issued[0]);
    const failures = a.entries.filter((e) => e['kind'] === 'store-write-failed').slice(logged);
    expect(failures, 'exactly one admin log entry for the failed binding').toHaveLength(1);
    expect(failures[0]).toMatchObject({ kind: 'store-write-failed', store: 'writes', file: WRITES_FILE });
  });
});
