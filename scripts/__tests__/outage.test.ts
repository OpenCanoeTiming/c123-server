/**
 * Data gate (#208): outage and reconnect. `scripts/replay-direct.ts` over a synthetic outage recording (fixture A) and a real
 * recording with two stated outages (B), read by the gate-2 checker (protocol-docs `tools/gate2/check.js`). Black box: child
 * processes; the step log is the only evidence.
 *
 * Sources of the rules: TEST-ARCHITECTURE §3 gate 1 (stated events), §3.2 properties 8 and 13 (the outage path), INV-2 rule 2,
 * CONTRACTS §4 (determinism; connection events are inputs), ADR-017 Revision 6 (a stated outage drops the TCP records inside it).
 *
 * Fixture A: `scripts/__tests__/fixtures/outage/outage-nkz19so-0930/` (manifest.json + gzipped chunk, built by `fixtures/outage/build.mjs`
 * from the synthetic recording 2026-11-09-outage-nkz19so-0930; every instant rebased by one constant offset stated in the manifest).
 * The chunk holds the recorder's own `_event` records, so A needs no `--events` (row 1 of #208 makes replay-direct read them).
 * Fixture B: jarni-ne-do 08:55-09:10 (real recording, skipped when absent) with `fixtures/outage/jarni-ne-do-events.json`, the two
 * ~168 s TCP gaps stated at the instants of the raw gap (last record before + 1 ms; first record after).
 * Baseline for row 6: nkz-19so 09:30 to the end of A's window, no outage (skipped when absent). The checker is skipped when absent.
 *
 * Test names cite the rule: `property 8`, `INV-2 rule 2`, `CONTRACTS §4`, `#208 row N` (the issue's test plan).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/replay-direct.ts')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const FIXTURES = path.join(ROOT, 'scripts/__tests__/fixtures/outage')
const A_DIR = path.join(FIXTURES, 'outage-nkz19so-0930')
const B_EVENTS = path.join(FIXTURES, 'jarni-ne-do-events.json')
const PD = process.env.C123_PROTOCOL_DOCS ?? '/workspace/timing/c123-protocol-docs'
const CHECKER = path.join(PD, 'tools/gate2/check.js')
const CACHE = path.join(PD, 'recordings/.cache')
const NKZ = path.join(CACHE, '2026-09-19-2026-nkz-19so')
const JARNI = path.join(CACHE, '2026-04-19-jarni-ne-do')
const T = 1_200_000
const B_FROM = '2026-04-19T08:55:00Z'
const B_TO = '2026-04-19T09:10:00Z'

const haveChecker = existsSync(CHECKER)
const haveNkz = existsSync(NKZ)
const haveJarni = existsSync(JARNI)

const dirs: string[] = []
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'outage-')); dirs.push(d); return d }

/** Fixture A as a v3 recording directory (manifest + gunzipped chunk), made once per run in a temporary directory. */
let A: string
const manifestA = (): { chunks: { file: string; startTime: string; endTime: string }[]; tcpStateAtStart: string; fixture: Record<string, any>; event: { date: string } } =>
  JSON.parse(readFileSync(path.join(A_DIR, 'manifest.json'), 'utf8'))
const chunkTextA = (): string => gunzipSync(readFileSync(path.join(A_DIR, '001-outage.jsonl.gz'))).toString('utf8')
beforeAll(() => {
  A = tmp()
  writeFileSync(path.join(A, 'manifest.json'), readFileSync(path.join(A_DIR, 'manifest.json')))
  writeFileSync(path.join(A, manifestA().chunks[0]!.file), chunkTextA())
})

type Env = { state?: string; value?: unknown; provisional?: boolean }
interface Delta { type: string; attemptId?: string; fields?: Record<string, Env>; standing?: Record<string, unknown> }
interface Step { i: number; elements: { event?: string; observedAt?: string }[]; deltas: Delta[]; stateHash: string }

const logs = new Map<string, string>() // key -> step log path; a replay of a read-only recording is deterministic (CONTRACTS §4), only its result is shared
function replayTo(recording: string, extra: string[], out: string): void {
  const r = spawnSync(TSX, [SCRIPT, '--recording', recording, ...extra, '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: T })
  expect(r.status, r.stderr).toBe(0)
}
function replay(recording: string, extra: string[] = []): string {
  const key = recording + ' ' + extra.join(' ')
  const hit = logs.get(key)
  if (hit) return hit
  const out = path.join(tmp(), 'steps.jsonl')
  replayTo(recording, extra, out)
  logs.set(key, out)
  return out
}
const sha = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex')
/** The steps of a log, one parsed line at a time (the logs are tens of MB). */
function* steps(file: string): Generator<Step> {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('{"hydration"') || line.startsWith('{"end"') || line.trim() === '') continue
    yield JSON.parse(line) as Step
  }
}
const finalHash = (file: string): string => { let h = ''; for (const s of steps(file)) h = s.stateHash; return h }
const instantOf = (s: Step): number => Date.parse(s.elements.find((e) => typeof e.observedAt === 'string')?.observedAt as string)

interface Gate2 { exit: number; violations: { step: number; property: number; attemptId?: string; field?: string; evidence: string }[]; exercised: Record<string, number> }
function gate2(stepLog: string, recording: string, window?: string): Gate2 {
  const args = [CHECKER, stepLog, '--recording', recording, ...(window ? ['--window', window] : [])]
  const c = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: T, maxBuffer: 1 << 28 })
  expect(c.status, c.stderr).not.toBe(2)
  const report = JSON.parse(c.stdout.split('\n')[0] as string) as Omit<Gate2, 'exit'>
  return { exit: c.status ?? 1, violations: report.violations, exercised: report.exercised }
}
const shown = (g: Gate2): string => {
  const by: Record<string, number> = {}
  for (const v of g.violations) by[`P${v.property}`] = (by[`P${v.property}`] ?? 0) + 1
  return `${g.violations.length} violations ${JSON.stringify(by)}; first: ${JSON.stringify(g.violations.slice(0, 2))}`
}

/** The recorder's `_event` lines of A, as instants (chunk startTime + ts). */
function recordedEvents(): { event: string; at: number }[] {
  const base = Date.parse(manifestA().chunks[0]!.startTime)
  return chunkTextA().split('\n').filter((l) => l.startsWith('{"ts"') && l.includes('"_event"'))
    .map((l) => { const o = JSON.parse(l) as { ts: number; _event: { event: string } }; return { event: o._event.event, at: base + o.ts } })
}
const statedB = (): { event: string; observedAt: string }[] => JSON.parse(readFileSync(B_EVENTS, 'utf8'))

/** Every reconnect as an interval: from the disconnect to 60 s after the reconnect. */
function intervals(list: { event: string; at: number }[]): { from: number; to: number; label: string }[] {
  const out: { from: number; to: number; label: string }[] = []
  let down: number | null = null
  for (const e of list) {
    if (e.event === 'tcp-disconnected') down = e.at
    else if (e.event === 'tcp-connected' && down !== null) { out.push({ from: down, to: e.at + 60_000, label: `${new Date(down).toISOString()}..${new Date(e.at).toISOString()}+60s` }); down = null }
  }
  return out
}

// -------- presented-state change tracking (deltas only) ---------------------------------------------------------------------
const GONE = '\u2205'
const canonEnv = (e: Env): string => JSON.stringify({ s: e.state, v: e.value, p: e.provisional })
/** Leaf paths of a Standing, entries keyed by entryId; envelope bookkeeping (asOf, seq, observedAt) is not presented. */
function flatten(v: unknown, prefix: string, out: Map<string, string>): void {
  if (Array.isArray(v)) {
    v.forEach((x, n) => {
      const id = x && typeof x === 'object' && 'entryId' in (x as object) ? `entry:${String((x as { entryId: unknown }).entryId)}` : String(n)
      flatten(x, `${prefix}/${id}`, out)
    })
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (k !== 'asOf' && k !== 'seq' && k !== 'observedAt') flatten(x, `${prefix}/${k}`, out)
  } else out.set(prefix, JSON.stringify(v ?? null))
}

/**
 * Flicker (#208 row 7): in each interval, a presented field of an Attempt or a Standing that returns to a value it held earlier in
 * the interval (A, B, A), or is cleared and restored. The value held when the interval starts counts as the first value.
 */
function flicker(file: string, list: { from: number; to: number; label: string }[]): { interval: string; key: string; values: string[] }[] {
  const current = new Map<string, string>()
  const hist = list.map(() => new Map<string, string[]>())
  const standings = new Map<string, Map<string, string>>()
  const found: { interval: string; key: string; values: string[] }[] = []
  const note = (key: string, next: string, t: number): void => {
    const before = current.get(key)
    if (before === next) return
    list.forEach((iv, n) => {
      if (t < iv.from || t > iv.to) return
      const h = hist[n]!
      let seq = h.get(key)
      if (!seq) { seq = before === undefined ? [] : [before]; h.set(key, seq) }
      if (seq.includes(next)) found.push({ interval: iv.label, key, values: [...seq, next] })
      seq.push(next)
    })
    current.set(key, next)
  }
  for (const s of steps(file)) {
    const t = instantOf(s)
    for (const d of s.deltas) {
      if (d.type === 'attempt.updated' && d.attemptId && d.fields) {
        for (const [f, e] of Object.entries(d.fields)) if (e && typeof e === 'object' && 'state' in e) note(`a:${d.attemptId}.${f}`, canonEnv(e), t)
      } else if (d.type === 'standing.updated' && d.standing) {
        const sk = String(d.standing['standingKey'] ?? d.standing['classId'])
        const now = new Map<string, string>()
        flatten(d.standing, `s:${sk}`, now)
        const prev = standings.get(sk) ?? new Map<string, string>()
        for (const [k, v] of now) note(k, v, t)
        for (const k of prev.keys()) if (!now.has(k)) note(k, GONE, t)
        standings.set(sk, now)
      }
    }
  }
  return found
}

// ---------------------------------------------------------------------------------------------------------------------
describe('#208 row 2: fixture A stated', () => {
  it('fixture A: manifest states source, window, cuts, offset', () => {
    const m = manifestA()
    const fx = m.fixture
    expect(fx['synthetic']).toBe(true)
    expect(String(fx['source']['recording'])).toBe('2026-11-09-outage-nkz19so-0930')
    expect(String(fx['source']['madeBy'])).toMatch(/player/)
    expect(String(fx['source']['madeBy'])).toMatch(/recorder/)
    expect(String(fx['source']['madeBy'])).toMatch(/#37/)
    expect(String(fx['source']['originalRecording'])).toBe('2026-09-19-2026-nkz-19so')
    expect(fx['source']['window']['from']).toMatch(/^2026-09-19T09:30:00/)
    expect(Date.parse(fx['source']['window']['to'])).toBeGreaterThan(Date.parse('2026-09-19T09:50:00Z'))
    expect(fx['source']['cuts'].map((c: { at: string; seconds: number }) => [c.at, c.seconds])).toEqual([['2026-09-19T09:35:00.000Z', 170], ['2026-09-19T09:45:00.000Z', 15]])
    expect(typeof fx['rebase']['offsetMs']).toBe('number')
    expect(fx['rebase']['offsetMs']).toBeLessThan(0) // the wall clock of the recording is 2026-11-09, the data 2026-09-19
    expect(['connected', 'disconnected', 'unknown']).toContain(m.tcpStateAtStart)
    expect(m.event.date).toBe('2026-09-19')
  })

  it('fixture A: instants are rebased by the stated constant offset onto the race day, recorded events kept', () => {
    const m = manifestA()
    const base = Date.parse(m.chunks[0]!.startTime)
    expect(new Date(base).toISOString().slice(0, 10)).toBe('2026-09-19')
    const text = chunkTextA()
    expect(JSON.parse(text.split('\n')[0] as string)._meta.startTime).toBe(m.chunks[0]!.startTime)
    const firstTcp = text.split('\n').filter((l) => l.startsWith('{"ts"') && l.includes('"src":"tcp"')).map((l) => JSON.parse(l) as { ts: number })[0]!
    expect(new Date(base + firstTcp.ts).toISOString()).toBe(m.fixture['rebase']['firstTcpRecordInstant'])
    expect(recordedEvents().map((e) => e.event)).toEqual(['tcp-connected', 'tcp-disconnected', 'tcp-connected', 'tcp-disconnected', 'tcp-connected', 'tcp-disconnected'])
    expect(text).not.toContain('"_snapshot"') // dropped, stated in manifest.fixture.edits
    expect(m.fixture['edits'].join(' ')).toMatch(/_snapshot/)
  })

  it('fixture A: no full birth dates (year only); names, clubs and ICF ids of the published results are kept', () => {
    const text = chunkTextA()
    const births = [...text.matchAll(/Birthdate(?:=\\?"|>)\s*(\d{4})-(\d{2})-(\d{2})/g)].map((x) => x[0])
    expect(births.length).toBeGreaterThan(0)
    expect(births.filter((b) => !/-01-01$/.test(b))).toEqual([])
    expect(text).toContain('KOPEČEK Michal')
    expect(text).toContain('VS Tábor')
    expect(text).toContain('30034.K1M')
  })
})

describe('#208 rows 3-4: fixture A (recorded outages 09:35:00 for 170 s and 09:45:00 for 15 s)', () => {
  it('fixture A: two replays are byte-identical (CONTRACTS §4 determinism)', () => {
    const one = path.join(tmp(), 'one.jsonl')
    const two = path.join(tmp(), 'two.jsonl')
    replayTo(A, [], one)
    replayTo(A, [], two)
    expect(sha(two)).toBe(sha(one))
    expect(finalHash(two)).toBe(finalHash(one))
  }, T)

  it.skipIf(!haveChecker)('fixture A: gate-2 checker reports 0 violations, property 8 exercised (an outage makes no re-baseline: P13 not claimed)', () => {
    const g = gate2(replay(A), A)
    expect(g.violations.length, shown(g)).toBe(0)
    expect(g.exit).toBe(0)
    expect(g.exercised['8'], 'property 8 exercised').toBeGreaterThan(0)
  }, T)

  it('fixture A: each reconnect starts with RaceConfig then Schedule (the player emulation of Canoe123 accept; scout-tcp-connect-burst E1)', () => {
    const base = Date.parse(manifestA().chunks[0]!.startTime)
    const recs = chunkTextA().split('\n').filter((l) => l.startsWith('{"ts"')).map((l) => JSON.parse(l) as { ts: number; src?: string; type?: string; _event?: { event: string } })
    const connects = recs.filter((r) => r._event?.event === 'tcp-connected')
    expect(connects).toHaveLength(3)
    for (const c of connects.slice(1)) { // the first connect is the player start (its seek burst), not a reconnect
      const after = recs.filter((r) => r.src === 'tcp' && r.ts >= c.ts).slice(0, 2).map((r) => r.type)
      expect(after, `reconnect at ${new Date(base + c.ts).toISOString()}`).toEqual(['RaceConfig', 'Schedule'])
    }
  })
})

describe('#208 row 5: jarni-ne-do from the stream start to 09:10 with the two ~168 s TCP gaps stated, judged on 08:55-09:10', () => {
  // A cold-start --from cut would be checked against raw records the core never saw (TEST-ARCHITECTURE §3.2, round 24): replay from the
  // stream start and let the checker's --window judge 08:55-09:10. The stated events are the four outage events only (no connect at 08:55).
  const extra = ['--to', B_TO, '--events', B_EVENTS]
  const baselineArgs = ['--to', B_TO]

  it.skipIf(!haveJarni)('the stated events are the raw TCP gaps: each disconnect 1 ms after the last record before a gap over 20 s, each connect at the first record after', () => {
    const man = JSON.parse(readFileSync(path.join(JARNI, 'manifest.json'), 'utf8')) as { chunks: { file: string; startTime: string }[] }
    const c = man.chunks.find((x) => Date.parse(x.startTime) <= Date.parse(B_FROM) && x.file.startsWith('005'))!
    const base = Date.parse(c.startTime)
    const times: number[] = []
    for (const l of readFileSync(path.join(JARNI, c.file), 'utf8').split('\n')) {
      if (!l.startsWith('{"ts"') || !l.includes('"src":"tcp"')) continue
      const t = base + (JSON.parse(l) as { ts: number }).ts
      if (t >= Date.parse(B_FROM) && t <= Date.parse(B_TO)) times.push(t)
    }
    const want: { event: string; observedAt: string }[] = []
    times.forEach((t, n) => {
      if (n > 0 && t - times[n - 1]! > 20_000) {
        want.push({ event: 'tcp-disconnected', observedAt: new Date(times[n - 1]! + 1).toISOString() }, { event: 'tcp-connected', observedAt: new Date(t).toISOString() })
      }
    })
    expect(statedB().map((e) => [e.event, e.observedAt])).toEqual(want.map((e) => [e.event, e.observedAt]))
  })

  it.skipIf(!haveJarni)('jarni-ne-do stream start to 09:10, window 08:55-09:10, with stated outages: deterministic, 0 violations', () => {
    const one = path.join(tmp(), 'one.jsonl')
    const two = path.join(tmp(), 'two.jsonl')
    replayTo(JARNI, extra, one)
    replayTo(JARNI, extra, two)
    expect(sha(two)).toBe(sha(one))
    if (!haveChecker) return
    logs.set(JARNI + ' ' + extra.join(' '), one)
    const g = gate2(one, JARNI, `${B_FROM},${B_TO}`)
    expect(g.violations.length, shown(g)).toBe(0)
    expect(g.exit).toBe(0)
    expect(g.exercised['8'], 'property 8 exercised').toBeGreaterThan(0)
  }, 2 * T)
})

// ---------------------------------------------------------------------------------------------------------------------
type EndAttempt = { run: string | undefined; outcome: string | undefined; placement: string | undefined }
/** run, outcome and placement of every Attempt at the end of a log (fields merge per Attempt; envelope instants are not compared). */
function endAttempts(file: string): Map<string, EndAttempt> {
  const f = new Map<string, Record<string, Env>>()
  for (const s of steps(file)) for (const d of s.deltas) if (d.type === 'attempt.updated' && d.attemptId && d.fields) f.set(d.attemptId, { ...(f.get(d.attemptId) ?? {}), ...d.fields })
  const pick = (e: Env | undefined): string | undefined => (e === undefined ? undefined : JSON.stringify({ s: e.state, v: e.value }))
  return new Map([...f].map(([id, x]) => [id, { run: pick(x['run']), outcome: pick(x['outcome']), placement: pick(x['placement']) }]))
}

describe('#208 row 6: re-hydration', () => {
  it.skipIf(!haveNkz)('fixture A: end state equals the no-outage replay of the same window (nkz-19so from 09:30, rebased instants aside)', () => {
    const to = manifestA().chunks[0]!.endTime
    const withOutage = endAttempts(replay(A))
    const baseline = endAttempts(replay(NKZ, ['--from', '2026-09-19T09:30:00Z', '--to', to]))
    const diffs: string[] = []
    for (const id of new Set([...withOutage.keys(), ...baseline.keys()])) {
      const a = withOutage.get(id)
      const b = baseline.get(id)
      if (!a || !b) { diffs.push(`${id}: only in ${a ? 'outage' : 'baseline'} replay`); continue }
      for (const k of ['run', 'outcome', 'placement'] as const) if (a[k] !== b[k]) diffs.push(`${id} ${k}: outage ${a[k]} | baseline ${b[k]}`)
    }
    expect(diffs.length, `${diffs.length} differences:\n${diffs.slice(0, 20).join('\n')}`).toBe(0)
  }, T)
})

describe('#208 row 7: no flicker on reconnect', () => {
  /** Flickers of the outage replay that do not occur (same interval, same field) in the no-outage replay of the same interval. */
  const outageOnly = (outage: string, baseline: string, iv: { from: number; to: number; label: string }[]): { interval: string; key: string; values: string[] }[] => {
    const seen = new Set(flicker(baseline, iv).map((x) => `${x.interval}|${x.key}`))
    return flicker(outage, iv).filter((x) => !seen.has(`${x.interval}|${x.key}`))
  }
  const listed = (name: string, f: { interval: string; key: string; values: string[] }[]): string[] => f.map((x) => `${name} ${x.interval} ${x.key}: ${x.values.join(' -> ')}`)

  it.skipIf(!haveNkz)('A and B: no flicker across each reconnect that the no-outage replay of the same interval lacks (INV-1 status monotonic, CONTRACTS §3.2; amended #208 row 7)', () => {
    const found: string[] = []
    const aEnd = manifestA().chunks[0]!.endTime
    found.push(...listed('A', outageOnly(replay(A), replay(NKZ, ['--from', '2026-09-19T09:30:00Z', '--to', aEnd]), intervals(recordedEvents()))))
    if (haveJarni) {
      const iv = intervals(statedB().map((e) => ({ event: e.event, at: Date.parse(e.observedAt) })))
      found.push(...listed('B', outageOnly(replay(JARNI, ['--to', B_TO, '--events', B_EVENTS]), replay(JARNI, ['--to', B_TO]), iv)))
    }
    expect(found.length, `${found.length} outage-only flickers (by Attempt):\n${found.slice(0, 12).join('\n')}`).toBe(0)
  }, 3 * T)

  it('A: the intervals are the two recorded reconnects (guards the test: two intervals, each holding steps)', () => {
    const iv = intervals(recordedEvents())
    expect(iv).toHaveLength(2)
    const log = replay(A)
    const inside = iv.map((x) => { let n = 0; for (const s of steps(log)) { const t = instantOf(s); if (t >= x.from && t <= x.to) n++ } return n })
    inside.forEach((n) => expect(n).toBeGreaterThan(100))
  }, T)
})
