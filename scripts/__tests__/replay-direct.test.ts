/**
 * Direct-injection ingest path (#242): `scripts/replay-direct.ts`, run as
 *   npm run replay:direct -- --recording <dir> [--from <iso>] [--to <iso>] [--events <file>] --out <file>
 * Black box: every test drives the script as a child process and reads the step log it writes.
 *
 * The format is the checker's reader (protocol-docs `tools/gate2/check.js` readStepLog, `lib/raw.js` for the recording):
 * line 1 `{"hydration":{"asOfSeq":n,"state":{...}}}`, then one `{i,element,deltas,stateHash}` per ingested element with i
 * counting from 1, then `{"end":{"steps":n}}`.
 *
 * Choices this file fixes where the issue leaves the interface open (the implementer follows them):
 *  - Connection events the recordings lack (TEST-ARCHITECTURE §9): by default ONE `tcp-connected` is stated, at the
 *    `observedAt` of the first TCP record (the `--tcp-connected` default; sweep-merge does the same). An optional
 *    `--events <file>` holds a JSON array of `{ event, observedAt, scope?, changedAfter? }` (`tcp-disconnected`,
 *    `tcp-connected`, `rebaseline` with `scope`), merged into the sequence by `observedAt`, before a record of the same
 *    instant. A `tcp-connected` in that file replaces the default one. jarni-ne-do's outage is stated this way.
 *  - XML: a snapshot whose text repeats the previous one is a poll that saw no change and is not delivered. A delivered one is
 *    preceded by `xml-rewrite-detected` with `changedAfter` null for the recording's first snapshot, else the previous poll
 *    (`observedAt` minus the recorder's 5 s), the key always present (CONFORMANCE-VECTORS §1, DERIVATIONS §0.3).
 *  - `--from`/`--to` (ISO, inclusive) select records by recorded time; what precedes `--from` is not replayed, the hydration
 *    is the empty state at the window start. Chunks of the manifest wholly outside the window need not be read.
 *  - Exit 0 on success; non-zero on a missing `--out`, a missing recording directory.
 * Row 5 and 6 (real windows through the checker, whole recording) are the PR record, not here.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/replay-direct.ts')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const PD = process.env.C123_PROTOCOL_DOCS ?? '/workspace/timing/c123-protocol-docs'
const CHECKER = path.join(PD, 'tools/gate2/check.js')
const CACHE = path.join(PD, 'recordings/.cache')
const T = 120_000

const dirs: string[] = []
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'replay-direct-')); dirs.push(d); return d }

const START = '2026-09-15T10:00:00.000Z'
const at = (ms: number): string => new Date(Date.parse(START) + ms).toISOString()

const oncourse = (finish: string, done: string): string =>
  `<Canoe123 System="Main"><OnCourse Total="1" Position="1"><Participant StartOrder="28" Bib="25" Id="9155.MX1" Name="BURGER Jonatan" Club="USK Pha" Nat="" Race="MX1 Individual" RaceId="MX1_XT_26" Warning="" /><Result Type="C" Gates="0,0,0,0,0,0,0,0,0" Completed="${done}" chStart="0" chSplit1="1" chSplit2="1" chFinish="0" dtStart="12:00:00.040" dtSplit1="" dtSplit2="" dtFinish="${finish}" /><Result Type="T" Pen="0" Time="${finish ? '74.77' : ''}" Total="${finish ? '74.77' : '0.00'}" TTBDiff="" TTBName="" Rank="" /></OnCourse></Canoe123>`
const EMPTY = '<Canoe123 System="Main"><OnCourse Total="0" Position="0" /></Canoe123>'
const xml = (pen: string): string =>
  `<?xml version="1.0" standalone="yes"?>\r\n<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">\r\n  <Schedule>\r\n    <RaceId>MX1_XT_26</RaceId>\r\n    <RaceOrder>2</RaceOrder>\r\n    <StartTime>2026-09-15T12:00:00+02:00</StartTime>\r\n    <Time>12:00:00</Time>\r\n    <ClassId>MX1</ClassId>\r\n    <DisId>XT</DisId>\r\n    <FirstBib>1</FirstBib>\r\n    <MaxStarters>8</MaxStarters>\r\n    <StartInterval>1:00</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>1</CourseNr>\r\n    <RaceStatus>0</RaceStatus>\r\n  </Schedule>\r\n  <Results>\r\n    <RaceId>MX1_XT_26</RaceId>\r\n    <Id>9155.MX1</Id>\r\n    <StartOrder>28</StartOrder>\r\n    <Bib>  25</Bib>\r\n    <StartTime>12:00:00</StartTime>\r\n    <Time>7477</Time>\r\n    <Pen>${pen}</Pen>\r\n    <Rnk>1</Rnk>\r\n    <RnkOrder>1</RnkOrder>\r\n    <IsRanked>true</IsRanked>\r\n  </Results>\r\n</Canoe123Data>`

/** A v3 recording (recordings/README.md): manifest.json + one chunk. ts is ms after the chunk's _meta.startTime. */
function recording(): string {
  const dir = tmp()
  const rec = (ts: number, src: string, type: string, data: string): string => JSON.stringify({ ts, src, type, data, size: data.length })
  const lines = [
    JSON.stringify({ _meta: { version: 3, seq: 1, eventDir: 'x', startTime: START, label: 'x', races: [], prevChunk: null, nextChunk: null } }),
    JSON.stringify({ ts: 0, _snapshot: { raceConfig: null, schedule: null, onCourse: null, results: {}, timeOfDay: null, tvs: null } }),
    rec(100, 'tcp', 'OnCourse', oncourse('', 'N')),
    rec(5100, 'tcp', 'OnCourse', oncourse('12:01:14.817', 'Y')),
    rec(7000, 'tcp', 'OnCourse', EMPTY),
    rec(8000, 'xml', 'XmlSnapshot', xml('0')),
    rec(13000, 'xml', 'XmlSnapshot', xml('2')),
    rec(14000, 'xml', 'XmlSnapshot', xml('2')),
    rec(15000, 'udp27333', 'OnCourse', oncourse('', 'N')),
  ]
  writeFileSync(path.join(dir, '001-x.jsonl'), lines.join('\n') + '\n')
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
    version: 3, event: { name: 'x', date: '2026-09-15' },
    chunks: [{ seq: 1, file: '001-x.jsonl', startTime: START, endTime: at(20000) }],
  }))
  return dir
}

type El = Record<string, unknown>
/** Round 24 ruling 1: a step is one ingest unit (CONTRACTS §1.6), the log names its `elements` in ingest order. */
interface Step { i: number; elements: El[]; deltas: Record<string, unknown>[]; stateHash: string }
interface Log { hydration: { asOfSeq: number; state: Record<string, unknown> }; steps: Step[]; end: { steps: number }; text: string }

function replay(args: string[], opts: { preload?: string } = {}): { code: number; stderr: string; out: string } {
  const out = path.join(tmp(), 'steps.jsonl')
  const pre = opts.preload === undefined ? [] : ['--import', opts.preload]
  const r = spawnSync(TSX, [...pre, SCRIPT, ...args, '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: T })
  return { code: r.status ?? 1, stderr: r.stderr, out }
}
function read(out: string): Log {
  const text = readFileSync(out, 'utf8')
  const objs = text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as Record<string, unknown>)
  return {
    hydration: objs[0]!['hydration'] as Log['hydration'],
    steps: objs.slice(1, -1) as unknown as Step[],
    end: (objs[objs.length - 1] as { end: { steps: number } }).end,
    text,
  }
}
function ok(args: string[], opts: { preload?: string } = {}): Log {
  const r = replay(args, opts)
  expect(r.code, r.stderr).toBe(0)
  return read(r.out)
}
interface Placed { step: Step; element: El }
/** Every element of every step with the step that holds it, in log order. */
const flat = (steps: Step[]): Placed[] => steps.flatMap((step) => step.elements.map((element) => ({ step, element })))
const events = (steps: Step[], name?: string): Placed[] => flat(steps).filter((p) => typeof p.element['event'] === 'string' && (name === undefined || p.element['event'] === name))
const writeEvents = (list: unknown[]): string => { const f = path.join(tmp(), 'events.json'); writeFileSync(f, JSON.stringify(list)); return f }

describe('row 1: step log format (checker readStepLog)', () => {
  it('round 24 ruling 1 (CONTRACTS §1.6; TEST-ARCHITECTURE §3.2): hydration line, one numbered step per ingest unit holding its `elements` (plural, never `element`), closing end line', () => {
    const log = ok(['--recording', recording()])
    expect(log.hydration.asOfSeq).toEqual(expect.any(Number))
    const state = log.hydration.state
    for (const k of ['phases', 'attempts', 'entries', 'standings']) expect(Array.isArray(state[k]), k).toBe(true)
    expect(state['oncourse']).toBeTypeOf('object')
    expect(log.steps.length).toBeGreaterThan(0)
    log.steps.forEach((s, n) => {
      expect(s.i).toBe(n + 1)
      expect(Array.isArray(s.elements)).toBe(true)
      expect(s.elements.length).toBeGreaterThan(0)
      expect('element' in s).toBe(false)
      expect(Array.isArray(s.deltas)).toBe(true)
      expect(s.stateHash).toMatch(/^\S+$/)
    })
    expect(log.end).toEqual({ steps: log.steps.length })
    expect(log.text.endsWith('\n')).toBe(true)
  })

  it('vector-vocabulary: every element is classified in CONFORMANCE-VECTORS §1 terms (observation, event or snapshot) with observedAt', () => {
    const log = ok(['--recording', recording()])
    for (const { element: e } of flat(log.steps)) {
      expect(e['observedAt'], JSON.stringify(e)).toEqual(expect.any(String))
      const observation = typeof e['field'] === 'string' && typeof e['source'] === 'string'
      expect(observation || typeof e['event'] === 'string' || typeof e['snapshot'] === 'object' || typeof e['diagnostic'] === 'object' || 'unparseable' in e || 'unknownType' in e || 'sourceStatus' in e, JSON.stringify(e)).toBe(true)
    }
    const fields = new Set(flat(log.steps).map((p) => p.element['field']))
    expect(fields.has('status')).toBe(true)
    expect(fields.has('onCourse')).toBe(true)
  })

  it('CONTRACTS §7.2: deltas carry type and a strictly increasing integer seq across the log; the first listing yields an attempt.updated', () => {
    const log = ok(['--recording', recording()])
    const seqs = log.steps.flatMap((s) => s.deltas.map((d) => d['seq']))
    expect(seqs.length).toBeGreaterThan(0)
    seqs.forEach((q, n) => { expect(Number.isInteger(q)).toBe(true); if (n > 0) expect(q as number).toBeGreaterThan(seqs[n - 1] as number) })
    expect(seqs[0] as number).toBeGreaterThan(log.hydration.asOfSeq)
    const types = new Set(log.steps.flatMap((s) => s.deltas.map((d) => d['type'])))
    expect(types.has('attempt.updated')).toBe(true)
    expect(log.steps.some((s) => s.deltas.some((d) => d['attemptId'] === 'MX1_XT_26:25'))).toBe(true)
  })

  it('TEST-ARCHITECTURE §3.2: only tcp and xml records are ingested (a udp27333 duplicate is not a step)', () => {
    const log = ok(['--recording', recording()])
    expect(flat(log.steps).some((p) => p.element['observedAt'] === at(15000))).toBe(false)
    expect(flat(log.steps).some((p) => p.element['source'] === 'udp27333')).toBe(false)
  })

  it('exit contract: no --out, or a missing recording directory, is a non-zero exit', () => {
    const noOut = spawnSync(TSX, [SCRIPT, '--recording', recording()], { cwd: ROOT, encoding: 'utf8', timeout: T })
    expect(noOut.status).not.toBe(0)
    expect(noOut.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
    expect(noOut.stderr.length).toBeGreaterThan(0) // a usage message
    const missing = replay(['--recording', path.join(tmp(), 'nope')])
    expect(missing.code).not.toBe(0)
    expect(missing.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
    expect(existsSync(missing.out)).toBe(false)
  })
})

describe('row 2: what CONTRACTS §4 determinism names', () => {
  it('CONTRACTS §4 recorded observedAt: each tcp element carries the record time (chunk startTime + ts), one instant per message', () => {
    const log = ok(['--recording', recording()])
    const tcp = flat(log.steps).filter((p) => p.element['source'] === 'tcp' && p.element['field'] !== undefined)
    const instants = [...new Set(tcp.map((p) => p.element['observedAt']))]
    expect(instants).toEqual([at(100), at(5100)])
    const first = tcp.filter((p) => p.element['observedAt'] === at(100)).map((p) => p.element['field'])
    expect(first.indexOf('status')).toBeGreaterThanOrEqual(0)
    expect(first.indexOf('status')).toBeLessThan(first.indexOf('onCourse'))
  })

  it('CONTRACTS §4 TCP connect (the --tcp-connected default): one tcp-connected, at the first tcp record, before its elements', () => {
    const log = ok(['--recording', recording()])
    const c = events(log.steps, 'tcp-connected')
    expect(c).toHaveLength(1)
    expect(c[0]!.element['observedAt']).toBe(at(100))
    expect(c[0]!.step.elements).toHaveLength(1) // a connection event is a unit of its own (CONTRACTS §1.6)
    expect(c[0]!.step.i).toBeLessThan(flat(log.steps).find((p) => p.element['source'] === 'tcp')!.step.i)
  })

  it('CONTRACTS §4 TCP connect and disconnect from --events: stated events sit in observedAt order; a tcp-connected there replaces the default', () => {
    const f = writeEvents([
      { event: 'tcp-connected', observedAt: at(50) },
      { event: 'tcp-disconnected', observedAt: at(9000) },
      { event: 'tcp-connected', observedAt: at(10000) },
    ])
    const log = ok(['--recording', recording(), '--events', f])
    expect(events(log.steps, 'tcp-connected').map((p) => p.element['observedAt'])).toEqual([at(50), at(10000)])
    const d = events(log.steps, 'tcp-disconnected')
    expect(d).toHaveLength(1)
    expect(d[0]!.element['observedAt']).toBe(at(9000))
    const times = flat(log.steps).map((p) => Date.parse(p.element['observedAt'] as string))
    times.forEach((t, n) => { if (n > 0) expect(t).toBeGreaterThanOrEqual(times[n - 1]!) })
    const xmlBefore = flat(log.steps).find((p) => p.element['observedAt'] === at(8000))!.step
    const xmlAfter = flat(log.steps).find((p) => p.element['observedAt'] === at(13000))!.step
    expect(xmlBefore.i).toBeLessThan(d[0]!.step.i)
    expect(d[0]!.step.i).toBeLessThan(xmlAfter.i)
  })

  it('CONTRACTS §4 re-baselines + round 24 ruling 1: a rebaseline from --events is one unit with its re-read snapshot: the event with its scope first, then the last snapshot\'s elements, in order', () => {
    const scope = { kind: 'phase', phaseId: 'MX1_XT_26' }
    const f = writeEvents([{ event: 'rebaseline', observedAt: at(12000), scope }])
    const log = ok(['--recording', recording(), '--events', f])
    const r = events(log.steps, 'rebaseline')
    expect(r).toHaveLength(1)
    expect(r[0]!.element['scope']).toEqual(scope)
    expect(r[0]!.element['observedAt']).toBe(at(12000))
    const unit = r[0]!.step
    expect(unit.elements[0]!['event']).toBe('rebaseline')
    // the snapshot read at 8000 (the last one before the instant) is re-read inside the same step: xml elements follow the event
    expect(unit.elements.slice(1).some((e) => e['source'] === 'xml' || (typeof e['snapshot'] === 'object' && e['snapshot'] !== null))).toBe(true)
    expect(unit.i).toBeGreaterThan(flat(log.steps).find((p) => p.element['observedAt'] === at(8000))!.step.i)
    expect(unit.i).toBeLessThan(flat(log.steps).find((p) => p.element['observedAt'] === at(13000))!.step.i)
  })

  it('vector xml-rewrite changedAfter (CONFORMANCE-VECTORS §1 content age): first snapshot null, later one the previous poll, key always present, before its snapshot elements', () => {
    const log = ok(['--recording', recording()])
    const rw = events(log.steps, 'xml-rewrite-detected')
    expect(rw).toHaveLength(2) // the third snapshot repeats the second: not delivered
    for (const s of rw) expect(Object.prototype.hasOwnProperty.call(s.element, 'changedAfter')).toBe(true)
    expect(rw[0]!.element['observedAt']).toBe(at(8000))
    expect(rw[0]!.element['changedAfter']).toBeNull()
    expect(rw[1]!.element['observedAt']).toBe(at(13000))
    const ca = Date.parse(rw[1]!.element['changedAfter'] as string)
    expect(ca).toBeGreaterThanOrEqual(Date.parse(at(8000)))
    expect(ca).toBeLessThan(Date.parse(at(13000)))
    // round 24 ruling 1: the rewrite event and its snapshot's elements are ONE unit (DERIVATIONS §0.3: every race it carries, the rewrite event included); the event leads
    const unit = rw[0]!.step
    expect(unit.elements[0]!['event']).toBe('xml-rewrite-detected')
    expect(unit.elements.length).toBeGreaterThan(1)
    expect(unit.elements.slice(1).every((e) => e['source'] === 'xml' || typeof e['snapshot'] === 'object')).toBe(true)
    expect(flat(log.steps).some((p) => p.element['observedAt'] === at(14000))).toBe(false)
  })

  it('CONTRACTS §4 oncourse-empty: an OnCourse Total=0 message is a step classified as the oncourse-empty event', () => {
    const log = ok(['--recording', recording()])
    const e = events(log.steps, 'oncourse-empty')
    expect(e).toHaveLength(1)
    expect(e[0]!.element['observedAt']).toBe(at(7000))
    expect(e[0]!.step.elements.every((x) => x['observedAt'] === at(7000))).toBe(true) // the message's own unit
  })

  it('CONTRACTS §4 "nothing depends on wall-clock time at replay": a process whose clock is 400 days ahead writes the same bytes', () => {
    const shift = path.join(tmp(), 'shift.mjs')
    writeFileSync(shift, `const R = Date; const D = 3.456e10
class S extends R { constructor(...a) { if (a.length === 0) super(R.now() + D); else super(...a) } static now() { return R.now() + D } }
globalThis.Date = S\n`)
    const dir = recording()
    const f = writeEvents([{ event: 'tcp-disconnected', observedAt: at(9000) }])
    const a = replay(['--recording', dir, '--events', f])
    const b = replay(['--recording', dir, '--events', f], { preload: shift })
    expect(a.code, a.stderr).toBe(0)
    expect(b.code, b.stderr).toBe(0)
    expect(readFileSync(b.out)).toEqual(readFileSync(a.out))
  })

  it('--from/--to: records are selected by recorded time, inclusive; earlier ones are not steps', () => {
    const log = ok(['--recording', recording(), '--from', at(5000), '--to', at(8000)])
    const times = flat(log.steps).map((p) => p.element['observedAt'] as string)
    expect(times.length).toBeGreaterThan(0)
    for (const t of times) { expect(t >= at(5000)).toBe(true); expect(t <= at(8000)).toBe(true) }
    expect(times).toContain(at(5100))
    expect(times).toContain(at(8000))
    expect(times).not.toContain(at(100))
    expect(times).not.toContain(at(13000))
    expect(log.steps[0]!.i).toBe(1)
    expect(log.end.steps).toBe(log.steps.length)
  })
})

/** A v3 recording of exactly the given records (ts ms after START). */
function recordingOf(records: { ts: number; src: 'tcp' | 'xml'; type: string; data: string }[]): string {
  const dir = tmp()
  const lines = [
    JSON.stringify({ _meta: { version: 3, seq: 1, eventDir: 'x', startTime: START, label: 'x', races: [], prevChunk: null, nextChunk: null } }),
    ...records.map((r) => JSON.stringify({ ...r, size: r.data.length })),
  ]
  writeFileSync(path.join(dir, '001-x.jsonl'), lines.join('\n') + '\n')
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ version: 3, event: { name: 'x', date: '2026-09-15' }, chunks: [{ seq: 1, file: '001-x.jsonl', startTime: START, endTime: at(60000) }] }))
  return dir
}
/** An OnCourse listing in the shape of the recorded ones (names invented), `total` Attempts on the course. */
const listing = (bib: number, total: number, pos: number, dtStart = '12:00:00.040'): string =>
  `<Canoe123 System="Main"><OnCourse Total="${total}" Position="${pos}"><Participant StartOrder="${bib}" Bib="${bib}" Id="${bib}.MX1" Name="TESTER Hand" Club="TJ Test" Nat="" Race="MX1 Individual" RaceId="MX1_XT_26" Warning="" /><Result Type="C" Gates="0,0,0,0,0,0,0,0,0" Completed="N" chStart="0" chSplit1="0" chSplit2="0" chFinish="0" dtStart="${dtStart}" dtSplit1="" dtSplit2="" dtFinish="" /><Result Type="T" Pen="0" Time="" Total="0.00" TTBDiff="" TTBName="" Rank="" /></OnCourse></Canoe123>`

describe('round 24 ruling 1 (CONTRACTS §1.6, TEST-ARCHITECTURE §3.2): a step is one ingest unit', () => {
  it('one TCP message is one step holding all its elements in ingest order, though it yields several (obligation: the unit notifies once)', () => {
    const dir = recordingOf([{ ts: 100, src: 'tcp', type: 'OnCourse', data: listing(25, 1, 1) }])
    const log = ok(['--recording', dir])
    const msgStep = log.steps.filter((s) => s.elements.some((e) => e['source'] === 'tcp' && e['field'] !== undefined))
    expect(msgStep).toHaveLength(1)
    const fields = msgStep[0]!.elements.map((e) => e['field'])
    expect(fields.indexOf('status')).toBeGreaterThanOrEqual(0)
    expect(fields.indexOf('onCourse')).toBeGreaterThan(fields.indexOf('status'))
    // the deltas are the unit's, once per changed resource (§1.6: at most one message per changed resource)
    const perAttempt = msgStep[0]!.deltas.filter((d) => d['type'] === 'attempt.updated' && d['attemptId'] === 'MX1_XT_26:25')
    expect(perAttempt).toHaveLength(1)
  })

  it('two TCP messages recorded in the same millisecond are two steps (TRIAGE A1: 9,718 cp3-cross records share a millisecond with the previous one; the boundary is the message, not observedAt)', () => {
    const dir = recordingOf([
      { ts: 100, src: 'tcp', type: 'OnCourse', data: listing(25, 2, 1) },
      { ts: 100, src: 'tcp', type: 'OnCourse', data: listing(26, 2, 2) },
    ])
    const log = ok(['--recording', dir])
    const holding = (bib: string) => log.steps.filter((s) => s.elements.some((e) => e['attemptId'] === `MX1_XT_26:${bib}` && e['field'] === 'onCourse'))
    expect(holding('25')).toHaveLength(1)
    expect(holding('26')).toHaveLength(1)
    expect(holding('25')[0]!.i).not.toBe(holding('26')[0]!.i)
    expect(holding('25')[0]!.elements.some((e) => e['attemptId'] === 'MX1_XT_26:26')).toBe(false)
  })

  it('an XML snapshot read is one step with the rewrite event first (DERIVATIONS §0.3), and an event is a step of its own', () => {
    const f = writeEvents([{ event: 'tcp-disconnected', observedAt: at(9000) }])
    const log = ok(['--recording', recording(), '--events', f])
    for (const name of ['tcp-disconnected', 'tcp-connected']) for (const p of events(log.steps, name)) expect(p.step.elements, name).toHaveLength(1)
    // round 24 ruling 1: the message that yields oncourse-empty also yields sourceStatus; both are elements of its one unit
    for (const p of events(log.steps, 'oncourse-empty')) expect(p.step.elements).toContain(p.element)
    const xmlSteps = log.steps.filter((s) => s.elements.some((e) => e['event'] === 'xml-rewrite-detected'))
    expect(xmlSteps).toHaveLength(2)
    for (const s of xmlSteps) expect(s.elements[0]!['event']).toBe('xml-rewrite-detected')
  })

  it('P10 premise (ruling 1): the log has no more steps than ingest units: recording() holds 5 delivered units (3 tcp + 2 xml) plus the default connect', () => {
    const log = ok(['--recording', recording()])
    expect(log.steps).toHaveLength(6)
  })
})

describe('round 24 ruling 4 (DERIVATIONS §0.5, §4.1, §4.8; TRIAGE D4): a leave is the core\'s derivation, logged as an element of the step that evaluated it', () => {
  // X (bib 51) and Y (bib 44) listed together at 0; then only Y, once a second: X has left at the message 4.000 s on (leave-rule.test, constant 4 s).
  const stream = (lastMs: number) => recordingOf([
    { ts: 0, src: 'tcp', type: 'OnCourse', data: listing(44, 2, 1) },
    { ts: 0, src: 'tcp', type: 'OnCourse', data: listing(51, 2, 2) },
    ...[1000, 2000, 3000, 4000].filter((t) => t <= lastMs).map((t) => ({ ts: t, src: 'tcp' as const, type: 'OnCourse', data: listing(44, 2, 1) })),
  ])

  it('the leave is an `oncourse-left` element naming the Attempt, last in the unit of the message that evaluated the rule (4.000 s), at that message\'s observedAt', () => {
    const log = ok(['--recording', stream(4000)])
    const left = events(log.steps, 'oncourse-left')
    expect(left).toHaveLength(1)
    expect(left[0]!.element['attemptId']).toBe('MX1_XT_26:51')
    expect(left[0]!.element['observedAt']).toBe(at(4000))
    const unit = left[0]!.step
    expect(unit.elements.at(-1)).toBe(left[0]!.element) // listed after the message's own elements
    expect(unit.elements.length).toBeGreaterThan(1)
    expect(unit.elements.slice(0, -1).some((e) => e['attemptId'] === 'MX1_XT_26:44' && e['field'] === 'onCourse')).toBe(true)
  })

  it('no leave is logged while the rule has not fired (3.000 s), and none is logged for a message that is not its evaluation', () => {
    const log = ok(['--recording', stream(3000)])
    expect(events(log.steps, 'oncourse-left')).toHaveLength(0)
  })

  it('the derived leave\'s effect is in the same step\'s deltas (the on-course list), not in a later one', () => {
    const log = ok(['--recording', stream(4000)])
    const unit = events(log.steps, 'oncourse-left')[0]!.step
    expect(unit.deltas.some((d) => d['type'] === 'oncourse.updated')).toBe(true)
    // no attempt.updated: left-without-finish is slalom only (DERIVATIONS §4.1); a Cross leave changes no presented field (CONTRACTS §1.6/INV-5)
  })
})

describe('round 24, code list "Stated events file" (TEST-ARCHITECTURE §3.2 gate 1; ADR-017 Revision 6): a stated outage drops the TCP records inside it', () => {
  it('records between a stated tcp-disconnected and the next tcp-connected are not replayed (5.1 s record dropped), the pair is logged, records outside stay', () => {
    const f = writeEvents([{ event: 'tcp-connected', observedAt: at(50) }, { event: 'tcp-disconnected', observedAt: at(4000) }, { event: 'tcp-connected', observedAt: at(6000) }])
    const log = ok(['--recording', recording(), '--events', f])
    const els = flat(log.steps).map((p) => p.element)
    expect(els.some((e) => e['observedAt'] === at(5100))).toBe(false)
    expect(els.some((e) => e['observedAt'] === at(100))).toBe(true)
    expect(els.some((e) => e['observedAt'] === at(7000) && e['event'] === 'oncourse-empty')).toBe(true)
    const d = events(log.steps, 'tcp-disconnected')[0]!
    const c = events(log.steps, 'tcp-connected').find((p) => p.element['observedAt'] === at(6000))!
    expect(d.step.i).toBeLessThan(c.step.i)
  })

  it('XML snapshots inside the outage are still read (only TCP records are dropped)', () => {
    const f = writeEvents([{ event: 'tcp-connected', observedAt: at(50) }, { event: 'tcp-disconnected', observedAt: at(7500) }, { event: 'tcp-connected', observedAt: at(13500) }])
    const log = ok(['--recording', recording(), '--events', f])
    const els = flat(log.steps).map((p) => p.element)
    expect(els.some((e) => e['event'] === 'xml-rewrite-detected' && e['observedAt'] === at(8000))).toBe(true)
    expect(els.some((e) => e['event'] === 'xml-rewrite-detected' && e['observedAt'] === at(13000))).toBe(true)
  })

  it('an outage with no tcp-connected after it drops the TCP records to the end of the window', () => {
    const f = writeEvents([{ event: 'tcp-connected', observedAt: at(50) }, { event: 'tcp-disconnected', observedAt: at(6000) }])
    const log = ok(['--recording', recording(), '--events', f])
    expect(flat(log.steps).some((p) => p.element['observedAt'] === at(7000))).toBe(false)
    expect(flat(log.steps).some((p) => p.element['observedAt'] === at(5100))).toBe(true)
  })
})

/** recording() plus the recorder's own `_event` lines (protocol-docs recordings/README.md, PR #37): connected 50, outage 4000-6000, recorder-stop 17000. */
function recordingWithEvents(): string {
  const dir = recording()
  const f = path.join(dir, '001-x.jsonl')
  const rec = (ts: number, data: string): string => JSON.stringify({ ts, src: 'tcp', type: 'OnCourse', data, size: data.length })
  const ev = (ts: number, event: string, reason?: string): string => JSON.stringify({ ts, _event: { event, host: '127.0.0.1', port: 27333, ...(reason ? { reason } : {}) } })
  const lines = readFileSync(f, 'utf8').split('\n').filter((l) => l !== '')
  lines.push(ev(50, 'tcp-connected'), rec(4000, oncourse('', 'N')), ev(4000, 'tcp-disconnected', 'close'), rec(6000, EMPTY), ev(6000, 'tcp-connected'), ev(17000, 'tcp-disconnected', 'recorder-stop'))
  // the file is in recorded order (the recorder writes in arrival order): re-sort stably by ts, an event before a record of the same ts
  const keyed = lines.map((l, n) => ({ l, n, o: JSON.parse(l) as { ts?: number; _event?: unknown } }))
  const sorted = keyed.filter((k) => k.o.ts !== undefined).sort((a, b) => (a.o.ts! - b.o.ts!) || (Number(b.o._event !== undefined) - Number(a.o._event !== undefined)) || a.n - b.n)
  writeFileSync(f, [keyed.find((k) => k.o.ts === undefined)!.l, ...sorted.map((k) => k.l)].join('\n') + '\n')
  return dir
}

describe('#208 row 1: recorded _event lines (recordings/README.md; TEST-ARCHITECTURE §3 gate 1; ADR-017 Revision 6)', () => {
  it('recorded _event lines become tcp-connected/tcp-disconnected events', () => {
    const log = ok(['--recording', recordingWithEvents()])
    const c = events(log.steps, 'tcp-connected').map((p) => p.element['observedAt'])
    const d = events(log.steps, 'tcp-disconnected').map((p) => p.element['observedAt'])
    // no default tcp-connected at the first TCP record (at(100)) when the recording has its own
    expect(c).toEqual([at(50), at(6000)])
    // the outage start and recorder-stop are both tcp-disconnected, at their instants
    expect(d).toEqual([at(4000), at(17000)])
    // an event is a unit of its own (CONTRACTS §1.6) and sits before a record of the same instant
    const connectAt6000 = events(log.steps, 'tcp-connected').find((p) => p.element['observedAt'] === at(6000))!
    const recordAt6000 = flat(log.steps).find((p) => p.element['observedAt'] === at(6000) && p.element['event'] === 'oncourse-empty')!
    expect(connectAt6000.step.elements).toHaveLength(1)
    expect(connectAt6000.step.i).toBeLessThan(recordAt6000.step.i)
  })

  it('recorded outage drops the TCP records inside it exactly as a stated one (records at 4000 after the disconnect and 5100 are dropped, 6000 after the connect stays)', () => {
    const recorded = flat(ok(['--recording', recordingWithEvents()]).steps).map((p) => p.element)
    expect(recorded.some((e) => e['source'] === 'tcp' && e['observedAt'] === at(4000))).toBe(false)
    expect(recorded.some((e) => e['observedAt'] === at(5100))).toBe(false)
    expect(recorded.some((e) => e['observedAt'] === at(100))).toBe(true)
    expect(recorded.some((e) => e['event'] === 'oncourse-empty' && e['observedAt'] === at(6000))).toBe(true)
  })

  it('recorded events and --events merge by observedAt: a stated outage on top of a recorded one is logged too, in order', () => {
    const f = writeEvents([{ event: 'tcp-disconnected', observedAt: at(9000) }, { event: 'tcp-connected', observedAt: at(10000) }])
    const log = ok(['--recording', recordingWithEvents(), '--events', f])
    const all = events(log.steps).filter((p) => String(p.element['event']).startsWith('tcp-')).map((p) => `${String(p.element['event'])}@${String(p.element['observedAt'])}`)
    expect(all).toEqual([
      `tcp-connected@${at(50)}`, `tcp-disconnected@${at(4000)}`, `tcp-connected@${at(6000)}`,
      `tcp-disconnected@${at(9000)}`, `tcp-connected@${at(10000)}`, `tcp-disconnected@${at(17000)}`,
    ])
  })
})

describe('round 24 "Windows" (TEST-ARCHITECTURE §3.2): the log opens on a hydration when the replay starts where the raw stream starts', () => {
  it('without --from the replay starts at the first record: line 1 is the hydration of the cold (empty) core, asOfSeq 0, and step 1 is the first record\'s unit', () => {
    const log = ok(['--recording', recording()])
    expect(log.text.split('\n')[0]).toMatch(/^\{"hydration":/)
    expect(log.hydration.asOfSeq).toBe(0)
    expect(log.hydration.state['attempts']).toEqual([])
    expect(log.steps[0]!.i).toBe(1)
    expect(Math.min(...flat(log.steps).map((p) => Date.parse(p.element['observedAt'] as string)))).toBe(Date.parse(at(100)))
  })
})

describe('row 3: same parser and core as production (static)', () => {
  const src = existsSync(SCRIPT) ? readFileSync(SCRIPT, 'utf8') : ''
  it('the driver imports parseTcp and parseXmlSnapshot from the ingest module and createMergeCore from the core module', () => {
    expect(src).toMatch(/import\s*\{[^}]*\bparseTcp\b[^}]*\}\s*from\s*'(\.\.\/src|@)\/?ingest(\/index(\.js)?)?'|import\s*\{[^}]*\bparseTcp\b[^}]*\}\s*from\s*'\.\.\/src\/ingest\/(index|tcp)\.js'/)
    expect(src).toMatch(/import\s*\{[^}]*\bparseXmlSnapshot\b[^}]*\}\s*from\s*'\.\.\/src\/ingest\/(index|xml)\.js'|import\s*\{[^}]*\bparseXmlSnapshot\b[^}]*\}\s*from\s*'\.\.\/src\/ingest(\/index\.js)?'/)
    expect(src).toMatch(/import\s*\{[^}]*\bcreateMergeCore\b[^}]*\}\s*from\s*'\.\.\/src\/core(\/index)?(\.js)?'/)
  })
  it('nothing replaces them: no local definition of the parsers or the core, no import of a test double', () => {
    expect(src.length).toBeGreaterThan(0)
    expect(src).not.toMatch(/(function|const|let|var)\s+(parseTcp|parseXmlSnapshot|createMergeCore)\b/)
    expect(src).not.toMatch(/from\s*'[^']*(__tests__|conformance|mock|stub|fake)[^']*'/i)
  })
  it('row 2: the driver reads no wall clock (no Date.now(), no argument-less new Date(), no performance.now())', () => {
    expect(src.length).toBeGreaterThan(0)
    expect(src).not.toMatch(/Date\.now\s*\(/)
    expect(src).not.toMatch(/new\s+Date\s*\(\s*\)/)
    expect(src).not.toMatch(/performance\.now\s*\(/)
  })
  it('npm script replay:direct runs scripts/replay-direct.ts', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts['replay:direct']).toMatch(/scripts\/replay-direct\.ts/)
  })
  it('vitest.config.ts lists this file in TOOLS (real child processes)', () => {
    expect(readFileSync(path.join(ROOT, 'vitest.config.ts'), 'utf8')).toContain("'scripts/__tests__/replay-direct.test.ts'")
  })
})

describe('row 4: determinism', () => {
  it('CONTRACTS §4 determinism: two replays of one window give byte-identical step logs (synthetic, with events)', () => {
    const dir = recording()
    const f = writeEvents([{ event: 'tcp-disconnected', observedAt: at(9000) }, { event: 'rebaseline', observedAt: at(12000), scope: { kind: 'phase', phaseId: 'MX1_XT_26' } }])
    const a = replay(['--recording', dir, '--events', f])
    const b = replay(['--recording', dir, '--events', f])
    expect(a.code, a.stderr).toBe(0)
    expect(b.code, b.stderr).toBe(0)
    expect(readFileSync(b.out)).toEqual(readFileSync(a.out))
    expect(readFileSync(a.out).length).toBeGreaterThan(0)
  })

  const cp3 = path.join(CACHE, '2026-04-26-cp3-cross')
  // Local-only data: /workspace recordings and the checker are not in CI (skip with the reason, run locally).
  it.skipIf(!existsSync(cp3) || !existsSync(CHECKER))('real window cp3-cross 08:28:00-08:29:00Z: two replays are byte-identical and the checker accepts the log as input', () => {
    const args = ['--recording', cp3, '--from', '2026-04-26T08:28:00.000Z', '--to', '2026-04-26T08:29:00.000Z']
    const a = replay(args)
    const b = replay(args)
    expect(a.code, a.stderr).toBe(0)
    expect(b.code, b.stderr).toBe(0)
    expect(readFileSync(b.out)).toEqual(readFileSync(a.out))
    const log = read(a.out)
    expect(log.steps.length).toBeGreaterThan(0)
    const c = spawnSync(process.execPath, [CHECKER, a.out, '--recording', cp3], { encoding: 'utf8', timeout: T })
    expect([0, 1], `checker exit ${c.status}: ${c.stderr}`).toContain(c.status) // 2 is unusable input
    expect(() => JSON.parse(c.stdout)).not.toThrow()
  }, T * 2)

  it.skipIf(!existsSync(CHECKER))('the synthetic log is usable input for tools/gate2/check.js (exit 0 or 1, never 2)', () => {
    const dir = recording()
    const r = replay(['--recording', dir])
    expect(r.code, r.stderr).toBe(0)
    const c = spawnSync(process.execPath, [CHECKER, r.out, '--recording', dir], { encoding: 'utf8', timeout: T })
    expect([0, 1], `checker exit ${c.status}: ${c.stderr}`).toContain(c.status)
    const out = JSON.parse(c.stdout) as { exercised: Record<string, number> }
    expect(out.exercised).toBeTypeOf('object')
  })
})
