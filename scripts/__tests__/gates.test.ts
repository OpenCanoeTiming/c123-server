/**
 * `npm run gates` (#313): data-gate tests, whole-recording gate 2, mechanical gate 3. Black box: child processes against a fake
 * protocol-docs directory (stub checker, stub gate-3 comparator, stub recordings, stub replay), so rows 1-6 need no real recording.
 * Rows 7-9 of the issue's test plan are whole runs for the verifier and reviewer; they are not tested here.
 *
 * INTERFACE FIXED BY THESE TESTS (the implementation is `scripts/gates.ts`, run as `tsx scripts/gates.ts`; `npm run gates` wraps it):
 *   flags
 *     --protocol-docs <dir>        protocol-docs checkout; default env C123_PROTOCOL_DOCS, then ../c123-protocol-docs
 *     --recordings <dir>           directory holding the 7 recording directories; default <protocol-docs>/recordings/.cache.
 *                                  A recording `<name>` is the entry whose directory name equals `<name>` or ends with `-<name>`
 *                                  (e.g. 2026-09-19-2026-nkz-19so). The 7 names: nkz-19so, cp3-cross, jarni-ne-odp, jarni-ne-do
 *                                  (reference set), jarni-so-do, jarni-so-odp, nkz-20ne (extras). Its "source sha256" is the
 *                                  sha256 of `<recording dir>/manifest.json`.
 *     --out <dir>                  output directory: step logs `<name>.steps.jsonl` and gate-3 summaries `<name>.gate3.json` go there
 *     --data-gate-tests <a,b,..>   comma-separated data-gate test files (paths relative to the server root); default is the real list.
 *                                  Added so a test can point the step at stub files (running the real ones would recurse). Env
 *                                  C123_GATES_DATA_TESTS is the same list.
 *     --replay-script <file>       replaces scripts/replay-direct.ts; invoked `tsx <file> --recording <dir> --out <steps.jsonl>`
 *     --known-differences <file>   default scripts/gates/known-differences.json (relative to the server root)
 *   env  C123_PROTOCOL_DOCS
 *   known-differences file: JSON array of entries { recording, attemptId, field, issue }; `recording` is the short name (nkz-19so).
 *   external commands (protocol-docs):
 *     node <pd>/tools/gate2/check.js <steps.jsonl> --recording <dir>                          exit 1 on a violation
 *     node <pd>/tools/gate3/final-state.js <steps.jsonl> --recording <dir> --summary <out.json>  exit 1 on any difference; the
 *       summary JSON has `differences: [{ recording, attemptId, field, xml, presented }]` (assumed from c123-protocol-docs#41)
 *   header (stdout, before the steps run), one item per line:
 *     server commit: <sha> dirty: yes|no
 *     protocol-docs path: <abs path>
 *     protocol-docs commit: <sha> dirty: yes|no
 *     recording <name> sha256 <64 hex>              (all 7)
 *     skip count: <n>                               (printed after step 1)
 *     step-log <name> sha256 <64 hex>               (all 7, printed after step 2)
 *     step 1 data-gate tests: PASS|FAIL
 *     step 2 gate 2: PASS|FAIL
 *     step 3 gate 3: PASS|FAIL
 *   exit codes: 0 all steps pass; 1 a step FAILS (all steps still run and report); 2 a prerequisite is missing (protocol-docs dir,
 *     checker, comparator, a recording): stderr names the missing piece, no step line says PASS.
 *
 * Sources: the issue #313 scope and test plan rows 1-6 (named `#313 row N`).
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/gates.ts')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const STUB_PASS = 'scripts/__tests__/fixtures/gates/stub-pass.test.ts'
const STUB_SKIP = 'scripts/__tests__/fixtures/gates/stub-skip.test.ts'
const NAMES = ['nkz-19so', 'cp3-cross', 'jarni-ne-odp', 'jarni-ne-do', 'jarni-so-do', 'jarni-so-odp', 'nkz-20ne']
const T = 240_000

const dirs: string[] = []
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }) })
const tmp = (): string => { const d = mkdtempSync(path.join(tmpdir(), 'gates-')); dirs.push(d); return d }
const sha = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex')
const git = (cwd: string, ...args: string[]): string =>
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).stdout.trim()

const CHECK_STUB = `// stub gate-2 checker: fails when the recording dir holds FAIL_GATE2
import { existsSync } from 'node:fs'
import path from 'node:path'
const i = process.argv.indexOf('--recording')
if (i < 0) { console.error('no --recording'); process.exit(2) }
process.exit(existsSync(path.join(process.argv[i + 1], 'FAIL_GATE2')) ? 1 : 0)
`
// stub comparator: differences come from <pd>/stub-gate3.json { "<name>": [ { attemptId, field, xml, presented } ] }
const FINAL_STUB = `import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
const a = process.argv
const rec = a[a.indexOf('--recording') + 1]
const summary = a[a.indexOf('--summary') + 1]
if (!a.includes('--summary') || !a.includes('--recording') || !existsSync(a[2])) process.exit(2)
const cfg = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../stub-gate3.json'), 'utf8'))
const base = path.basename(rec)
const name = Object.keys(cfg).find((n) => base === n || base.endsWith('-' + n))
const differences = (name ? cfg[name] : []).map((d) => ({ recording: name, ...d }))
writeFileSync(summary, JSON.stringify({ differences }))
process.exit(differences.length ? 1 : 0)
`
const REPLAY_STUB = `import { writeFileSync } from 'node:fs'
import path from 'node:path'
const a = process.argv
const rec = path.basename(a[a.indexOf('--recording') + 1])
writeFileSync(a[a.indexOf('--out') + 1], 'stub steps for ' + rec + '\\n')
`

interface World {
  pd: string
  rec: string
  out: string
  replay: string
  known: string
  gate3: Record<string, Record<string, unknown>[]>
}
const recDir = (name: string): string => `2026-01-01-${name}`
const stepLog = (name: string): string => `stub steps for ${recDir(name)}\n`

/** A fake protocol-docs checkout (a git repo with the stubs committed) and a recordings set of the 7 stub recordings. */
function world(opts: { omitChecker?: boolean; omitComparator?: boolean; omit?: string[]; dirtyPd?: boolean } = {}): World {
  const root = tmp()
  const pd = path.join(root, 'pd')
  const rec = path.join(root, 'recordings')
  mkdirSync(path.join(pd, 'tools/gate2'), { recursive: true })
  mkdirSync(path.join(pd, 'tools/gate3'), { recursive: true })
  mkdirSync(rec)
  writeFileSync(path.join(pd, 'package.json'), '{"type":"module"}')
  if (!opts.omitChecker) writeFileSync(path.join(pd, 'tools/gate2/check.js'), CHECK_STUB)
  if (!opts.omitComparator) writeFileSync(path.join(pd, 'tools/gate3/final-state.js'), FINAL_STUB)
  writeFileSync(path.join(pd, 'stub-gate3.json'), '{}')
  writeFileSync(path.join(root, 'replay.mjs'), REPLAY_STUB)
  writeFileSync(path.join(root, 'known.json'), '[]')
  git(pd, 'init', '-q')
  git(pd, 'add', '-A')
  git(pd, 'commit', '-q', '-m', 'stubs')
  if (opts.dirtyPd) writeFileSync(path.join(pd, 'uncommitted.txt'), 'x')
  for (const n of NAMES) {
    if (opts.omit?.includes(n)) continue
    mkdirSync(path.join(rec, recDir(n)))
    writeFileSync(path.join(rec, recDir(n), 'manifest.json'), JSON.stringify({ stub: n }))
  }
  return { pd, rec, out: path.join(root, 'out'), replay: path.join(root, 'replay.mjs'), known: path.join(root, 'known.json'), gate3: {} }
}
function run(w: World, tests: string[] = [STUB_PASS], extra: string[] = []) {
  writeFileSync(path.join(w.pd, 'stub-gate3.json'), JSON.stringify(w.gate3))
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.C123_PROTOCOL_DOCS
  delete env.C123_GATES_DATA_TESTS
  const r = spawnSync(
    TSX,
    [SCRIPT, '--protocol-docs', w.pd, '--recordings', w.rec, '--out', w.out, '--data-gate-tests', tests.join(','),
      '--replay-script', w.replay, '--known-differences', w.known, ...extra],
    { cwd: ROOT, encoding: 'utf8', timeout: T, env },
  )
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, all: r.stdout + r.stderr }
}

describe('npm run gates (#313)', () => {
  it('#313 control: all stubs agree -> exit 0, three steps PASS, skip count 0', () => {
    const r = run(world())
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toMatch(/step 1 data-gate tests: PASS/)
    expect(r.stdout).toMatch(/step 2 gate 2: PASS/)
    expect(r.stdout).toMatch(/step 3 gate 3: PASS/)
    expect(r.stdout).toMatch(/skip count: 0\b/)
  }, T)

  it('#313 row 1: protocol-docs without the gate-2 checker -> exit 2, names tools/gate2/check.js, no step PASS', () => {
    const r = run(world({ omitChecker: true }))
    expect(r.status).toBe(2)
    expect(r.all).toContain('tools/gate2/check.js')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#313 row 1: protocol-docs without the gate-3 comparator -> exit 2, names tools/gate3/final-state.js, no step PASS', () => {
    const r = run(world({ omitComparator: true }))
    expect(r.status).toBe(2)
    expect(r.all).toContain('tools/gate3/final-state.js')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#313 row 1: a protocol-docs directory that does not exist -> exit 2, nothing passed', () => {
    const w = world()
    const r = run({ ...w, pd: path.join(w.pd, 'nonexistent') })
    expect(r.status).toBe(2)
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#313 row 1: protocol-docs location falls back to env C123_PROTOCOL_DOCS when --protocol-docs is absent', () => {
    const w = world({ omitChecker: true })
    const env = { ...process.env, C123_PROTOCOL_DOCS: w.pd }
    const r = spawnSync(TSX, [SCRIPT, '--recordings', w.rec, '--out', w.out, '--data-gate-tests', STUB_PASS, '--replay-script', w.replay,
      '--known-differences', w.known], { cwd: ROOT, encoding: 'utf8', timeout: T, env })
    expect(r.status).toBe(2)
    expect(r.stdout + r.stderr).toContain('tools/gate2/check.js')
  }, T)

  it.each(NAMES)('#313 row 2: recordings set missing %s -> exit 2, names it, no step PASS', (missing) => {
    const r = run(world({ omit: [missing] }))
    expect(r.status).toBe(2)
    expect(r.all).toContain(missing)
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#313 row 3: a data-gate test file that skips -> step 1 FAIL, skip count > 0, exit 1', () => {
    const r = run(world(), [STUB_PASS, STUB_SKIP])
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 1 data-gate tests: FAIL/)
    const m = /skip count: (\d+)/.exec(r.stdout)
    expect(m, r.stdout).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThan(0)
  }, T)

  it('#313 row 4: header has both commits and dirty flags, every recording with sha256, every step-log sha256, verdicts', () => {
    const w = world({ dirtyPd: true })
    const r = run(w)
    expect(r.status, r.all).toBe(0)
    const serverSha = git(ROOT, 'rev-parse', 'HEAD')
    const serverDirty = git(ROOT, 'status', '--porcelain') !== '' ? 'yes' : 'no'
    expect(r.stdout).toContain(`server commit: ${serverSha} dirty: ${serverDirty}`)
    expect(r.stdout).toContain(`protocol-docs path: ${w.pd}`)
    expect(r.stdout).toContain(`protocol-docs commit: ${git(w.pd, 'rev-parse', 'HEAD')} dirty: yes`)
    for (const n of NAMES) {
      expect(r.stdout, n).toContain(`recording ${n} sha256 ${sha(JSON.stringify({ stub: n }))}`)
      expect(r.stdout, n).toContain(`step-log ${n} sha256 ${sha(stepLog(n))}`)
    }
    expect(r.stdout).toMatch(/step 1 data-gate tests: PASS/)
    expect(r.stdout).toMatch(/step 2 gate 2: PASS/)
    expect(r.stdout).toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 row 4: a clean protocol-docs checkout is reported dirty: no', () => {
    const w = world()
    const r = run(w)
    expect(r.stdout).toContain(`protocol-docs commit: ${git(w.pd, 'rev-parse', 'HEAD')} dirty: no`)
  }, T)

  it('#313 scope: a gate-2 violation on one recording -> step 2 FAIL naming it, exit 1', () => {
    const w = world()
    writeFileSync(path.join(w.rec, recDir('jarni-ne-odp'), 'FAIL_GATE2'), '')
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 2 gate 2: FAIL/)
    expect(r.all).toContain('jarni-ne-odp')
  }, T)

  it('#313 row 5: a known-differences entry that no longer differs -> step 3 FAIL, names the stale entry, exit 1', () => {
    const w = world()
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', issue: 'OpenCanoeTiming/c123-server#999' }]))
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 3 gate 3: FAIL/)
    expect(r.all).toContain('K1M_BR2_19:67')
    expect(r.all).toContain('countingRun')
    expect(r.all).toContain('nkz-19so')
  }, T)

  it('#313 row 6: an unlisted difference -> step 3 FAIL naming recording, attempt and field, exit 1', () => {
    const w = world()
    w.gate3['nkz-19so'] = [{ attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet' }]
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 3 gate 3: FAIL/)
    expect(r.all).toContain('nkz-19so')
    expect(r.all).toContain('K1M_BR2_19:67')
    expect(r.all).toContain('countingRun')
  }, T)

  it('#313 row 6: a difference listed with an issue is tolerated -> step 3 PASS, exit 0', () => {
    const w = world()
    w.gate3['nkz-19so'] = [{ attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet' }]
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', issue: 'OpenCanoeTiming/c123-server#999' }]))
    const r = run(w)
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 row 6: a listed difference does not hide a different unlisted field on the same attempt', () => {
    const w = world()
    w.gate3['nkz-19so'] = [
      { attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet' },
      { attemptId: 'K1M_BR2_19:67', field: 'pen', xml: 2, presented: 0 },
    ]
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', issue: 'OpenCanoeTiming/c123-server#999' }]))
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.all).toContain('pen')
  }, T)
})
