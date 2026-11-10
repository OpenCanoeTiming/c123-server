/**
 * Data gate (#207): both re-run paths, each in both arrival orders, replayed by `scripts/replay-direct.ts` and read by the gate-2
 * checker (protocol-docs `tools/gate2/check.js`). Black box: child processes, the step log is the only evidence.
 *
 * Sources of the rules: DERIVATIONS §4.11 (generation trigger, attribution per source, the recorded episode), §4.12 (stale mark,
 * the R16 sentence), §4.4 (row/finish order, 72 % / 28 %), §4.1, ADR-013 (+ Revisions 3 and 4), CONTRACTS §2.6, INV-7,
 * TEST-ARCHITECTURE §3.2 property 10 (and 4, 6).
 *
 * Fixtures: `scripts/__tests__/fixtures/rerun-paths/<name>/` (v3 recording directories, one Attempt each, built by `build.mjs`
 * from the recordings; each manifest.json carries a `fixture` object: synthetic or not, source recording and window, edits).
 * Row 1 cuts the real recording and is skipped when it is absent. The checker is skipped when absent.
 *
 * Test names cite the rule: `DERIVATIONS 4.11 ...`, `R16`, `property 10`. Assertions are read from the presented state rebuilt
 * from the step log's `attempt.updated` deltas (fields merge per Attempt); nothing is read from `src/`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/replay-direct.ts')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const FIXTURES = path.join(ROOT, 'scripts/__tests__/fixtures/rerun-paths')
const PD = process.env.C123_PROTOCOL_DOCS ?? '/workspace/timing/c123-protocol-docs'
const CHECKER = path.join(PD, 'tools/gate2/check.js')
const NKZ = path.join(PD, 'recordings/.cache/2026-09-19-2026-nkz-19so')
const T = 900_000

const dirs: string[] = []
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'rerun-paths-')); dirs.push(d); return d }

type Env = { state?: string; value?: unknown; observedAt?: string; source?: string }
type Fields = Record<string, Env>
interface Delta { type: string; attemptId?: string; fields?: Fields; diagnostics?: { attemptId?: string; kind?: string; mark?: string; run?: number }[] }
interface Step { i: number; elements: Record<string, unknown>[]; deltas: Delta[] }
interface Point { i: number; at: string; f: Fields; stale: boolean }

const cache = new Map<string, Step[]>() // a replay of a read-only recording is deterministic (CONTRACTS §4); only its result is shared
function replay(recording: string, extra: string[] = []): Step[] {
  const key = recording + extra.join(' ')
  const hit = cache.get(key)
  if (hit) return hit
  const steps = replayOnce(recording, extra)
  cache.set(key, steps)
  return steps
}
function replayOnce(recording: string, extra: string[]): Step[] {
  const out = path.join(tmp(), 'steps.jsonl')
  const r = spawnSync(TSX, [SCRIPT, '--recording', recording, ...extra, '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: T })
  expect(r.status, r.stderr).toBe(0)
  lastLog.set(recording + extra.join(' '), out)
  const lines = readFileSync(out, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as Record<string, unknown>)
  return lines.slice(1, -1) as unknown as Step[]
}
const lastLog = new Map<string, string>()

interface Gate2 { exit: number; violations: { step: number; property: number; attemptId?: string; field?: string; evidence: string }[]; exercised: Record<string, number> }
function gate2(recording: string, extra: string[] = [], window?: string): Gate2 {
  const out = lastLog.get(recording + extra.join(' '))
  expect(out, 'replay first').toBeTypeOf('string')
  const args = [CHECKER, out as string, '--recording', recording, ...(window ? ['--window', window] : [])]
  const c = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: T, maxBuffer: 1 << 28 })
  expect(c.status, c.stderr).not.toBe(2)
  const report = JSON.parse(c.stdout.split('\n')[0] as string) as Omit<Gate2, 'exit'>
  return { exit: c.status ?? 1, violations: report.violations, exercised: report.exercised }
}

/** The presented state of one Attempt after each step that touched it (fields merge, as a client applies `attempt.updated`). */
function trail(steps: Step[], attemptId: string): Point[] {
  const f: Fields = {}
  const pts: Point[] = []
  let stale = false
  for (const s of steps) {
    let touched = false
    for (const d of s.deltas) {
      if (d.type === 'attempt.updated' && d.attemptId === attemptId) { Object.assign(f, d.fields); touched = true }
      if (d.type === 'diagnostics.updated') stale = (d.diagnostics ?? []).some((x) => x.attemptId === attemptId && x.kind === 'stale-mark')
    }
    if (touched) pts.push({ i: s.i, at: (s.elements.find((e) => typeof e['observedAt'] === 'string')?.['observedAt'] as string) ?? '', f: { ...f }, stale })
  }
  return pts
}
const known = (e: Env | undefined): unknown => (e?.state === 'known' ? e.value : undefined)
const runOf = (p: Point): number | undefined => known(p.f['run']) as number | undefined
const statusOf = (p: Point): string | undefined => known(p.f['status']) as string | undefined
const outcomeOf = (p: Point): { kind?: string; status?: string; runSeconds?: number; penaltySeconds?: number } | undefined => known(p.f['outcome']) as never
const MARKS = new Set(['dnf', 'dns', 'dsq', 'cap', 'dnq', 'nps', 'dsq-2', 'ncs', 'cancelled'])

/** DERIVATIONS 4.11/4.12, R16: while run 2 has not finished, nothing of run 1's result or mark is presented. */
function staleOverRunning(pts: Point[]): string[] {
  const bad: string[] = []
  for (const p of pts) {
    if (runOf(p) !== 2) continue
    const st = statusOf(p)
    if (st === 'finished') break // run 2 finished: from here its own result is presented (checked by the callers)
    const o = outcomeOf(p)
    // a mark presented over the running athlete turns `status` into the mark, so the mark itself is the violation
    if (st !== undefined && MARKS.has(st)) bad.push(`step ${p.i}: status ${st}`)
    if (o && o.kind !== 'running') bad.push(`step ${p.i}: outcome ${JSON.stringify(o)}`)
    for (const k of ['placement', 'pairTotal', 'countingRun']) if (known(p.f[k]) !== undefined) bad.push(`step ${p.i}: ${k} ${JSON.stringify(known(p.f[k]))}`)
  }
  return bad
}
const runsNeverDecrease = (pts: Point[]): boolean => {
  let max = 0
  for (const p of pts) { const r = runOf(p); if (r === undefined) continue; if (r < max) return false; max = r }
  return true
}
const firstRun = (pts: Point[], n: number): Point | undefined => pts.find((p) => runOf(p) === n)
/**
 * The whole presented state of the Attempt and its Standings at the end of the log, without envelope instants (the row's own
 * delivery, which the arrival order moves, DERIVATIONS 4.11), `Standing.asOf` and `seq` (round 27g Q3).
 */
function endState(steps: Step[], attemptId: string): unknown {
  const pts = trail(steps, attemptId)
  const f = (pts[pts.length - 1] as Point).f
  const attempt = Object.fromEntries(Object.entries(f).map(([k, e]) => [k, { ...e, observedAt: undefined }]))
  const standings = new Map<string, unknown>()
  for (const s of steps) for (const d of s.deltas) {
    const st = (d as unknown as { standing?: Record<string, unknown> }).standing
    if (d.type === 'standing.updated' && st) { const { asOf: _a, seq: _s, ...rest } = st; standings.set(String(st['standingKey']), JSON.parse(JSON.stringify(rest, (k, v) => (k === 'observedAt' || k === 'asOf' || k === 'seq' ? undefined : v)))) }
  }
  return { attempt: JSON.parse(JSON.stringify(attempt)), standings: [...standings.entries()].sort() }
}

const fx = (name: string): string => path.join(FIXTURES, name)
const manifest = (name: string): { fixture: { name: string; synthetic: boolean; source: Record<string, unknown>; edits: string[]; order: string }; event: { date: string } } =>
  JSON.parse(readFileSync(path.join(fx(name), 'manifest.json'), 'utf8'))
const fixtureRows = (name: string): string[] =>
  readFileSync(path.join(fx(name), '001-excerpt.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"type":"Results"') && l.includes('Time=')).map((l) => (JSON.parse(l) as { data: string }).data)

const haveChecker = existsSync(CHECKER)
const NKZ_ID = 'C1M_BR1_19:7'
const NKZ_RUN1_SCORE = 96.69

// ---------------------------------------------------------------------------------------------------------------------
describe('row 1: the recorded jury re-run, recorded order (nkz-19so C1M_BR1_19 bib 7, 10:44-12:43Z)', () => {
  // replayed from 10:30Z so that the checker's memory is warm at the 10:44Z opening of the window it reports on (TEST-ARCHITECTURE 3.2:
  // a cold cut reports the attempts already running at its first step)
  const win = ['--from', '2026-09-19T10:30:00.000Z', '--to', '2026-09-19T12:43:59.000Z']
  const real = (): Step[] => replay(NKZ, win)

  it.skipIf(!existsSync(NKZ) || !haveChecker)('property 10 + DERIVATIONS 4.11 recorded episode: the cut window gives gate 2 zero reports and exercises property 10', () => {
    real()
    const g = gate2(NKZ, win, '2026-09-19T10:44:00.000Z,2026-09-19T12:43:59.000Z')
    expect(g.violations).toEqual([])
    expect(g.exit).toBe(0)
    expect(g.exercised['10']).toBeGreaterThan(0)
  }, T)

  it.skipIf(!existsSync(NKZ))('R16 (DERIVATIONS 4.12 stale-mark sentence, 4.11): at every step where bib 7 run 2 is at-start or on-course, no presented field carries run 1 score or a mark', () => {
    const pts = trail(real(), NKZ_ID)
    expect(pts.some((p) => runOf(p) === 1 && outcomeOf(p)?.runSeconds === NKZ_RUN1_SCORE)).toBe(true) // run 1 was presented (setup holds)
    expect(pts.filter((p) => runOf(p) === 2 && (statusOf(p) === 'on-course' || statusOf(p) === 'at-start')).length).toBeGreaterThan(10)
    expect(staleOverRunning(pts)).toEqual([])
    expect(pts.filter((p) => runOf(p) === 2).some((p) => outcomeOf(p)?.runSeconds === NKZ_RUN1_SCORE)).toBe(false)
  }, T)

  it.skipIf(!existsSync(NKZ))('DERIVATIONS 4.11 recorded episode: run is 2 from the new start listing (12:40:20Z) on, never decreases, and run 2 ends finished with its own score', () => {
    const pts = trail(real(), NKZ_ID)
    expect(runsNeverDecrease(pts)).toBe(true)
    const first = firstRun(pts, 2)
    expect(first?.at).toBe('2026-09-19T12:40:20.264Z')
    expect(['at-start', 'on-course']).toContain(statusOf(first as Point))
    expect(pts.slice(pts.indexOf(first as Point)).every((p) => runOf(p) === 2)).toBe(true)
    const last = pts[pts.length - 1] as Point
    expect(statusOf(last)).toBe('finished')
    expect(outcomeOf(last)?.kind).toBe('duration')
    expect(outcomeOf(last)?.runSeconds).toBe(83.57)
  }, T)
})

// ---------------------------------------------------------------------------------------------------------------------
describe('row 2: the recorded jury re-run in both arrival orders (committed excerpts of nkz-19so)', () => {
  const orders = [['nkz-bib7-row-before', 'before'], ['nkz-bib7-row-after', 'after']] as const
  for (const [name, order] of orders) {
    it(`DERIVATIONS 4.11 attribution per source (${order} the finish): R16 holds, run is 2 from the new start, run 2 ends with its own score`, () => {
      const pts = trail(replay(fx(name)), NKZ_ID)
      expect(staleOverRunning(pts)).toEqual([])
      expect(runsNeverDecrease(pts)).toBe(true)
      const first = firstRun(pts, 2)
      expect(first?.at).toBe('2026-09-19T12:40:20.264Z')
      expect(pts.slice(pts.indexOf(first as Point)).every((p) => runOf(p) === 2)).toBe(true)
      const last = pts[pts.length - 1] as Point
      expect(statusOf(last)).toBe('finished')
      expect(outcomeOf(last)?.runSeconds).toBe(83.57)
      expect(pts.filter((p) => runOf(p) === 2).some((p) => outcomeOf(p)?.runSeconds === NKZ_RUN1_SCORE)).toBe(false)
    }, T)

    it.skipIf(!haveChecker)(`property 10 (${order} the finish): gate 2 reports 0 and exercises property 10`, () => {
      replay(fx(name))
      const g = gate2(fx(name))
      expect(g.violations).toEqual([])
      expect(g.exercised['10']).toBeGreaterThan(0)
    }, T)
  }

  it('DERIVATIONS 4.4 + 4.11 (72 % / 28 %): the two arrival orders of the first run-2 row are really the two orders in the fixtures', () => {
    const order = (name: string): 'row-first' | 'finish-first' => {
      const recs = readFileSync(path.join(fx(name), '001-excerpt.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { ts: number; type?: string; data?: string })
      const fin = recs.find((r) => r.type === 'OnCourse' && r.data?.includes('dtFinish="14:41:44.000"'))
      const row = recs.find((r) => r.type === 'Results' && r.data?.includes('Time="83.57"'))
      return (row as { ts: number }).ts < (fin as { ts: number }).ts ? 'row-first' : 'finish-first'
    }
    expect(order('nkz-bib7-row-before')).toBe('row-first')
    expect(order('nkz-bib7-row-after')).toBe('finish-first')
  })

  it('DERIVATIONS 4.11 "both arrival orders give the same end state": the final presented values of run 2 agree', () => {
    expect(endState(replay(fx('nkz-bib7-row-after')), NKZ_ID)).toEqual(endState(replay(fx('nkz-bib7-row-before')), NKZ_ID))
  }, T)
})

// ---------------------------------------------------------------------------------------------------------------------
const DNF_ID = 'K1W_BR1_18:24'
const dnfOrders = [['dnf-rerun-row-before', 3, 'before'], ['dnf-rerun-row-after', 4, 'after']] as const
for (const [name, row, order] of dnfOrders) {
  describe(`row ${row}: non-wizard re-run after a DNF, run-2 row ${order} the finish listing (excerpt of jarni-so-odp K1W_BR1_18:24 + a donor run)`, () => {
    it('setup: run 1 ended in a presented DNF (a row with the mark), as recorded', () => {
      const pts = trail(replay(fx(name)), DNF_ID)
      const dnf = pts.find((p) => runOf(p) === 1 && statusOf(p) === 'dnf')
      expect(dnf).toBeDefined()
      expect(outcomeOf(dnf as Point)?.kind).toBe('no-result')
    }, T)

    it('DERIVATIONS 4.11 trigger (the DNF recorded the generation): run increments to 2 at the new start listing, never decreases', () => {
      const pts = trail(replay(fx(name)), DNF_ID)
      expect(runsNeverDecrease(pts)).toBe(true)
      const first = firstRun(pts, 2)
      expect(first?.at).toBe('2026-04-18T13:02:59.807Z')
      expect(statusOf(first as Point)).toBe('on-course')
      expect(pts.filter((p) => runOf(p) === 2).length).toBeGreaterThan(10)
      expect(pts.some((p) => (runOf(p) ?? 0) > 2)).toBe(false)
    }, T)

    it('R16 / DERIVATIONS 4.12 stale mark: the DNF is never presented while run 2 is at-start or on-course, and the stale-mark diagnostic is raised', () => {
      const pts = trail(replay(fx(name)), DNF_ID)
      expect(staleOverRunning(pts)).toEqual([])
      expect(pts.some((p) => runOf(p) === 2 && p.stale)).toBe(true)
    }, T)

    it('DERIVATIONS 4.11 + 4.12: run 2 result replaces the DNF, and the withheld mark is never presented in generation 2', () => {
      const pts = trail(replay(fx(name)), DNF_ID)
      const last = pts[pts.length - 1] as Point
      const time = Number(/Time="([0-9.]+)"/.exec(fixtureRows(name).slice(-1)[0] as string)?.[1])
      expect(runOf(last)).toBe(2)
      expect(statusOf(last)).toBe('finished')
      expect(outcomeOf(last)?.kind).toBe('duration')
      expect(outcomeOf(last)?.runSeconds).toBe(time)
      expect(pts.filter((p) => runOf(p) === 2).some((p) => MARKS.has(statusOf(p) ?? ''))).toBe(false)
    }, T)

    it.skipIf(!haveChecker)('property 10: gate 2 reports 0 with property 10 exercised', () => {
      replay(fx(name))
      const g = gate2(fx(name))
      expect(g.violations).toEqual([])
      expect(g.exercised['10']).toBeGreaterThan(0)
    }, T)
  })
}

describe('rows 3 and 4 together', () => {
  it('DERIVATIONS 4.4 + 4.11: the two DNF fixtures differ in arrival order only and converge on the same presented end state', () => {
    expect(endState(replay(fx('dnf-rerun-row-after')), DNF_ID)).toEqual(endState(replay(fx('dnf-rerun-row-before')), DNF_ID))
  }, T)
})

// ---------------------------------------------------------------------------------------------------------------------
const TIMED_ID = 'K1W_BR1_18:25'
const timedOrders = [['timed-rerun-row-before', 'before'], ['timed-rerun-row-after', 'after']] as const
for (const [name, order] of timedOrders) {
  describe(`round 27g Q4: non-wizard re-run after a TIMED finish, no wipe, run-2 row ${order} the finish listing (excerpt of jarni-so-odp K1W_BR1_18:25 + a donor run)`, () => {
    it('setup: run 1 finished with a presented time (the old timed row stands)', () => {
      const pts = trail(replay(fx(name)), TIMED_ID)
      const fin = pts.find((p) => runOf(p) === 1 && statusOf(p) === 'finished')
      expect(outcomeOf(fin as Point)?.kind).toBe('duration')
      expect(outcomeOf(fin as Point)?.runSeconds).toBe(121.37)
    }, T)

    it('ADR-013 Revision 3 + DERIVATIONS 4.11: the old timed row is pushed unchanged through run 2 and nothing of it is presented before the new finish', () => {
      const pts = trail(replay(fx(name)), TIMED_ID)
      const first = firstRun(pts, 2)
      expect(first?.at).toBe('2026-04-18T13:02:59.807Z')
      expect(runsNeverDecrease(pts)).toBe(true)
      expect(staleOverRunning(pts)).toEqual([])
      expect(pts.filter((p) => runOf(p) === 2).some((p) => p.f['outcome'] !== undefined && outcomeOf(p)?.runSeconds === 121.37)).toBe(false)
    }, T)

    it('DERIVATIONS 4.12: no stale mark (the old row carried none), and run 2 ends with its own time', () => {
      const pts = trail(replay(fx(name)), TIMED_ID)
      expect(pts.some((p) => p.stale)).toBe(false)
      const last = pts[pts.length - 1] as Point
      const time = Number(/Time="([0-9.]+)"/.exec(fixtureRows(name).slice(-1)[0] as string)?.[1])
      expect(runOf(last)).toBe(2)
      expect(statusOf(last)).toBe('finished')
      expect(outcomeOf(last)?.runSeconds).toBe(time)
    }, T)

    it.skipIf(!haveChecker)('property 10: gate 2 reports 0 with property 10 exercised', () => {
      replay(fx(name))
      const g = gate2(fx(name))
      expect(g.violations).toEqual([])
      expect(g.exercised['10']).toBeGreaterThan(0)
    }, T)
  })
}
describe('round 27g Q3 + Q4 together', () => {
  it('DERIVATIONS 4.11: the two timed fixtures differ in arrival order only and end in the same presented state (Standing.asOf and seq excluded)', () => {
    expect(endState(replay(fx('timed-rerun-row-after')), TIMED_ID)).toEqual(endState(replay(fx('timed-rerun-row-before')), TIMED_ID))
  }, T)
})

// ---------------------------------------------------------------------------------------------------------------------
describe('round 27g-2 B1: observedAt per arrival order (DERIVATIONS 4.11: the row\'s own delivery for the row\'s fields, the listing for status)', () => {
  /** Instants of the run-2 row (first Results record with the Time) and of the finish listing (first OnCourse with a dtFinish and that Time), read from the fixture file. */
  const instants = (name: string, time: string): { row: string; listing: string } => {
    const start = Date.parse((JSON.parse(readFileSync(path.join(fx(name), 'manifest.json'), 'utf8')) as { chunks: { startTime: string }[] }).chunks[0]?.startTime as string)
    const recs = readFileSync(path.join(fx(name), '001-excerpt.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { ts?: number; type?: string; data?: string })
    const at = (r?: { ts?: number }): string => new Date(start + (r?.ts as number)).toISOString()
    const row = recs.find((r) => r.type === 'Results' && r.data?.includes(`Time="${time}"`))
    const listing = recs.find((r) => r.type === 'OnCourse' && /dtFinish="[^"]+"/.test(r.data ?? '') && r.data?.includes(`Time="${time}"`))
    expect(row).toBeDefined()
    expect(listing).toBeDefined()
    return { row: at(row), listing: at(listing) }
  }
  const pairs = [
    ['nkz', NKZ_ID, '83.57', 'nkz-bib7-row-before', 'nkz-bib7-row-after'],
    ['dnf', DNF_ID, '96.86', 'dnf-rerun-row-before', 'dnf-rerun-row-after'],
    ['timed', TIMED_ID, '96.86', 'timed-rerun-row-before', 'timed-rerun-row-after'],
  ] as const
  for (const [label, id, time, before, after] of pairs) {
    it(`${label}: in each order outcome (and placement) carry the row's delivery instant and status the finish listing's; gates and faults are not asserted (CONTRACTS 1.2: the later of the row and the last cell-changing element)`, () => {
      for (const name of [before, after]) {
        const { row, listing } = instants(name, time)
        const pts = trail(replay(fx(name)), id)
        const rowPoint = pts.find((p) => runOf(p) === 2 && outcomeOf(p)?.kind === 'duration' && p.f['outcome']?.['confidence' as never] === 'authoritative')
        const finPoint = pts.find((p) => runOf(p) === 2 && statusOf(p) === 'finished')
        expect(rowPoint?.f['outcome']?.observedAt).toBe(row)
        expect(finPoint?.f['status']?.observedAt).toBe(listing)
        // CONTRACTS 1.2 (round 27e): gates are dated by the LATER of the presented row's element and the last element that changed the
        // presented cells; a later row restating equal cells moves nothing (INV-5). Read from the log: where the row's own step
        // changes the cells, the later of the row's delivery and the last earlier cell change; where it does not (the cells were
        // already presented from an earlier push), that earlier change.
        const steps = replay(fx(name))
        const at = (st: Step): string => (st.elements.find((e) => typeof e['observedAt'] === 'string')?.['observedAt'] as string) ?? ''
        const changesGates = (st: Step): boolean => st.deltas.some((d) => d.type === 'attempt.updated' && d.attemptId === id && d.fields?.['gates'] !== undefined)
        let lastCellChange = ''
        for (const st of steps) {
          if (st.i >= (rowPoint as Point).i) break
          if (changesGates(st)) lastCellChange = at(st)
        }
        const rowStep = steps.find((st) => st.i === (rowPoint as Point).i) as Step
        const expected = changesGates(rowStep) ? (lastCellChange > row ? lastCellChange : row) : lastCellChange
        expect(rowPoint?.f['gates']?.observedAt).toBe(expected)
      }
      // and the two orders really differ in the row's instant
      expect(instants(before, time).row).not.toBe(instants(after, time).row)
    }, T)
  }
})

// ---------------------------------------------------------------------------------------------------------------------
describe('row 5: a mark standing when the start is listed records nothing (excerpt of nkz-19so K1M_BR2_19:54, a DNS standing across the start; no DNF standing at a start is recorded)', () => {
  const ID = 'K1M_BR2_19:54'
  it('setup, DERIVATIONS 4.11 third pass E1 K1M_BR2_19:54: the DNS is presented at the step of the first start listing (the last presentation before it), not merely at some step', () => {
    const steps = replay(fx('mark-at-start-then-correction'))
    const startStep = steps.find((s) => s.elements.some((e) => e['attemptId'] === ID && e['field'] === 'onCourse' && (e['value'] as { dtStart?: unknown }).dtStart != null)) as Step
    expect(startStep, 'a start was listed').toBeDefined()
    const pts = trail(steps, ID)
    const standing = [...pts].reverse().find((p) => p.i <= startStep.i) as Point // what a client shows when the start is listed
    expect(standing, 'the Attempt was presented before the start').toBeDefined()
    expect(statusOf(standing)).toBe('dns')
    expect(pts.some((p) => p.i < startStep.i && statusOf(p) === 'dns'), 'the mark stood before the start listing').toBe(true)
  }, T)

  it('DERIVATIONS 4.11 "a mark standing at the recorded start records nothing": a later changed start with no finish is a start correction, run stays 1', () => {
    const steps = replay(fx('mark-at-start-then-correction'))
    const pts = trail(steps, ID)
    const starts = new Set(steps.flatMap((s) => s.elements).filter((e) => e['attemptId'] === ID && e['field'] === 'onCourse').map((e) => JSON.stringify((e['value'] as { dtStart?: unknown }).dtStart)).filter((v) => v !== 'null'))
    expect([...starts].length).toBe(2) // the start was listed, and then changed
    expect(pts.some((p) => runOf(p) !== undefined && runOf(p) !== 1)).toBe(false)
  }, T)

  it.skipIf(!haveChecker)('property 10: gate 2 reports 0, property 10 exercised', () => {
    replay(fx('mark-at-start-then-correction'))
    const g = gate2(fx('mark-at-start-then-correction'))
    expect(g.violations).toEqual([])
    expect(g.exercised['10']).toBeGreaterThan(0)
  }, T)
})

// ---------------------------------------------------------------------------------------------------------------------
describe('row 6: fixtures stated (published-results rule; synthetic fixtures name source, window, edits)', () => {
  const names = readdirSync(FIXTURES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  it('there are seven fixtures', () => expect(names).toEqual(['dnf-rerun-row-after', 'dnf-rerun-row-before', 'mark-at-start-then-correction', 'nkz-bib7-row-after', 'nkz-bib7-row-before', 'timed-rerun-row-after', 'timed-rerun-row-before']))
  for (const name of names) {
    it(`fixture ${name}: manifest states synthetic, source recording and window, order and edits`, () => {
      const f = manifest(name).fixture
      expect(typeof f.synthetic).toBe('boolean')
      expect(f.name).toBe(name)
      expect(String(f.source['recording'])).toMatch(/^20\d\d-\d\d-\d\d-/)
      expect(f.source['window']).toHaveLength(2)
      expect(f.order.length).toBeGreaterThan(10)
      expect(f.edits.length).toBeGreaterThan(1)
      if (f.synthetic) expect(f.edits.some((e) => /moved|added|edited/.test(e))).toBe(true)
    })
    it(`fixture ${name}: no full birth date; names, clubs and ICF ids as recorded`, () => {
      const lines = readFileSync(path.join(fx(name), '001-excerpt.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"type":"XmlSnapshot"'))
      expect(lines.length).toBeGreaterThan(0)
      for (const l of lines) {
        const xml = (JSON.parse(l) as { data: string }).data
        for (const m of xml.matchAll(/<Birthdate>([^<]*)<\/Birthdate>/g)) expect(m[1]).toMatch(/^\d{4}-01-01T/)
        const p = /<Participants>[\s\S]*?<\/Participants>/.exec(xml)?.[0] as string
        const id = /<Id>([^<]*)<\/Id>/.exec(p)?.[1] as string
        const icf = /<ICFId>([^<]*)<\/ICFId>/.exec(p)?.[1]
        expect(icf).toBe(id.split('.')[0]) // the ICF id is the id's number, as recorded
        const family = /<FamilyName>([^<]*)<\/FamilyName>/.exec(p)?.[1] as string
        const given = /<GivenName>([^<]*)<\/GivenName>/.exec(p)?.[1] as string
        const tcp = readFileSync(path.join(fx(name), '001-excerpt.jsonl'), 'utf8')
        expect(tcp).toContain(`Id=\\"${id}\\"`)
        expect(tcp).toContain(family)
        expect(given.length).toBeGreaterThan(0)
      }
    })
  }
})
