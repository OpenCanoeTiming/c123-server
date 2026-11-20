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
 *   round 3 additions (review of #317, B1-B4, C1):
 *     recording <name> sha256 <hex> covers the manifest AND every chunk file the manifest lists (any change to a chunk changes it)
 *     known-differences: <abs path> sha256 <64 hex>              (always printed, also for an empty file)
 *     tolerated: <recording> <attemptId> <field> <issue>         (one line per tolerated difference)
 *     override: <flag-or-env> <value>                            (one line per override in effect: --replay-script, --data-gate-tests,
 *                                                                 --known-differences, env C123_GATES_DATA_TESTS; none for the defaults)
 *   a gate-3 summary not written by this run is never read; a comparator that exits 1 without a fresh summary, or exits other than 0/1,
 *   fails step 3. A known-differences entry without a non-blank `issue` is refused (exit 2, names the entry).
 *   exit codes: 0 all steps pass; 1 a step FAILS (all steps still run and report); 2 a prerequisite is missing (protocol-docs dir,
 *     checker, comparator, a recording): stderr names the missing piece, no step line says PASS.
 *   #324 additions (pinned checker, pinned known-difference values, partial runs):
 *     --protocol-docs-ref <file>   the file holding the protocol-docs commit SHA the gates must use (40 hex); default
 *                                  scripts/gates/protocol-docs.ref. A non-default file is an override line.
 *                                  The protocol-docs HEAD must equal the pin and tools/ must have no uncommitted or untracked change,
 *                                  else exit 2; the message names both SHAs and the bump path (scripts/gates/README.md).
 *     header: protocol-docs pin: <sha>
 *     known-differences entry: { recording, attemptId, field, xml, presented, issue, gate? }; `xml` and `presented` are the two values
 *       it tolerates (the comparator summary's names). A listed difference with other values FAILS step 3; an entry without both
 *       values is refused (exit 2, names the entry). tolerated line: tolerated: <rec> <attemptId> <field> <issue> xml <json> presented <json>
 *     --only <name[,name...]>      PARTIAL run: step 1 is not run, steps 2 and 3 run on the named recordings only, only those recordings
 *                                  must exist; an unknown name is exit 2. Header line `run: PARTIAL ...`; the last line is
 *                                  `verdict: PARTIAL PASS|PARTIAL FAIL`. The stale check covers entries of the selected recordings only.
 *     a full run's last line is `verdict: PASS|FAIL`.
 *     env C123_GATES_STUBS=1 lets the tools project collect the stub data-gate files under fixtures/gates (the normal run does not).
 *
 * Sources: the issue #313 scope and test plan rows 1-6 (named `#313 row N`); #324 (named `#324 ...`), #319 N14.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/gates.ts')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const STUB_PASS = 'scripts/__tests__/fixtures/gates/stub-pass.test.ts'
const STUB_ENV = 'scripts/__tests__/fixtures/gates/stub-env.test.ts'
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
const d = process.argv[i + 1]
if (existsSync(path.join(d, 'EXIT2_GATE2'))) process.exit(2)
process.exit(existsSync(path.join(d, 'FAIL_GATE2')) ? 1 : 0)
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
const mode = name ? cfg[name] : []
if (mode === 'crash') { console.error('stub comparator crashed'); process.exit(1) } // like an uncaught exception: exit 1, no summary
if (mode === 'exit2') process.exit(2)
if (mode === 'exit3') process.exit(3)
const differences = mode.map((d) => ({ recording: name, ...d }))
writeFileSync(summary, JSON.stringify({ differences }))
process.exit(differences.length ? 1 : 0)
`
const REPLAY_STUB = `import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const a = process.argv
const dir = a[a.indexOf('--recording') + 1]
if (existsSync(path.join(dir, 'FAIL_REPLAY'))) { console.error('stub replay failed'); process.exit(3) }
const rec = path.basename(dir)
writeFileSync(a[a.indexOf('--out') + 1], 'stub steps for ' + rec + '\\n')
`

interface World {
  pd: string
  rec: string
  out: string
  replay: string
  known: string
  /** the --protocol-docs-ref file; run() writes the stub checkout's HEAD into it unless `pin` is set */
  ref: string
  pin?: string
  gate3: Record<string, Record<string, unknown>[] | string>
}
const recDir = (name: string): string => `2026-01-01-${name}`
const manifest = (n: string): string => JSON.stringify({ stub: n, chunks: [{ file: '001-chunk.jsonl' }] })
const chunk = (n: string): string => `{"stub-chunk":"${n}"}\n`
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
    writeFileSync(path.join(rec, recDir(n), 'manifest.json'), manifest(n))
    writeFileSync(path.join(rec, recDir(n), '001-chunk.jsonl'), chunk(n))
  }
  return { pd, rec, out: path.join(root, 'out'), replay: path.join(root, 'replay.mjs'), known: path.join(root, 'known.json'),
    ref: path.join(root, 'protocol-docs.ref'), gate3: {} }
}
/** Writes the stub comparator's config (it is gitignored by nobody, so it sits outside tools/) and the pin file. */
function prepare(w: World): void {
  if (existsSync(w.pd)) writeFileSync(path.join(w.pd, 'stub-gate3.json'), JSON.stringify(w.gate3))
  writeFileSync(w.ref, (w.pin ?? (existsSync(w.pd) ? git(w.pd, 'rev-parse', 'HEAD') : '0'.repeat(40))) + '\n')
}
function run(w: World, tests: string[] = [STUB_PASS], extra: string[] = [], extraEnv: Record<string, string> = {}) {
  prepare(w)
  const env: NodeJS.ProcessEnv = { ...process.env, C123_GATES_STUBS: '1' }
  delete env.C123_PROTOCOL_DOCS
  delete env.C123_GATES_DATA_TESTS
  Object.assign(env, extraEnv)
  const r = spawnSync(
    TSX,
    [SCRIPT, '--protocol-docs', w.pd, '--recordings', w.rec, '--out', w.out, '--data-gate-tests', tests.join(','),
      '--replay-script', w.replay, '--known-differences', w.known, '--protocol-docs-ref', w.ref, ...extra],
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
    expect(r.stdout).toMatch(/^run: FULL$/m)
    expect(r.stdout.trimEnd().split('\n').at(-1)).toBe('verdict: PASS')
    expect(r.stdout).not.toMatch(/PARTIAL/)
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
    prepare(w)
    const env = { ...process.env, C123_PROTOCOL_DOCS: w.pd, C123_GATES_STUBS: '1' }
    const r = spawnSync(TSX, [SCRIPT, '--recordings', w.rec, '--out', w.out, '--data-gate-tests', STUB_PASS, '--replay-script', w.replay,
      '--known-differences', w.known, '--protocol-docs-ref', w.ref], { cwd: ROOT, encoding: 'utf8', timeout: T, env })
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
      expect(r.stdout, n).toMatch(new RegExp(`^recording ${n} sha256 [0-9a-f]{64}$`, 'm'))
      expect(r.stdout, n).toContain(`step-log ${n} sha256 ${sha(stepLog(n))}`)
    }
    expect(r.stdout).toMatch(/step 1 data-gate tests: PASS/)
    expect(r.stdout).toMatch(/step 2 gate 2: PASS/)
    expect(r.stdout).toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 finding 311: step 1 runs the data-gate files with C123_PROTOCOL_DOCS set to the --protocol-docs dir, overriding an inherited value', () => {
    const w = world()
    const seen = path.join(path.dirname(w.pd), 'env-seen.txt')
    const r = run(w, [STUB_ENV], [], { C123_GATES_STUB_OUT: seen, C123_PROTOCOL_DOCS: '/nonexistent/other-protocol-docs' })
    expect(r.status, r.all).toBe(0)
    expect(readFileSync(seen, 'utf8')).toBe(w.pd)
  }, T)

  it('#313 C1: a changed chunk with an unchanged manifest changes that recording\'s printed sha256 and no other', () => {
    const w = world()
    const line = (out: string, n: string): string => new RegExp(`^recording ${n} sha256 [0-9a-f]{64}$`, 'm').exec(out)?.[0] ?? ''
    const a = run(w)
    expect(a.status, a.all).toBe(0)
    writeFileSync(path.join(w.rec, recDir('nkz-19so'), '001-chunk.jsonl'), '{"stub-chunk":"edited"}\n')
    const b = run(w)
    expect(b.status, b.all).toBe(0)
    expect(line(a.stdout, 'nkz-19so')).not.toBe('')
    expect(line(b.stdout, 'nkz-19so')).not.toBe(line(a.stdout, 'nkz-19so'))
    expect(line(b.stdout, 'cp3-cross')).toBe(line(a.stdout, 'cp3-cross'))
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
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet',
      issue: 'OpenCanoeTiming/c123-server#999' }]))
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
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet',
      issue: 'OpenCanoeTiming/c123-server#999' }]))
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
    writeFileSync(w.known, JSON.stringify([{ recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet',
      issue: 'OpenCanoeTiming/c123-server#999' }]))
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.all).toContain('pen')
  }, T)

  const KNOWN = { recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet', issue: 'OpenCanoeTiming/c123-server#999' }
  const DIFF = { attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet' }

  it.each(['crash', 'exit3'])('#313 B1: comparator %s with an old listed-only summary in --out -> step 3 FAIL, never PASS', (mode) => {
    const w = world()
    w.gate3['nkz-19so'] = [DIFF]
    writeFileSync(w.known, JSON.stringify([KNOWN]))
    const first = run(w)
    expect(first.status, first.all).toBe(0)
    w.gate3 = { 'nkz-19so': mode }
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 B1: comparator exit 1 without writing any summary (fresh --out) -> step 3 FAIL', () => {
    const w = world()
    w.gate3 = { 'cp3-cross': 'crash' }
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 B2: gate-2 checker exit 2 -> not a pass: overall exit != 0, step 2 not PASS', () => {
    const w = world()
    writeFileSync(path.join(w.rec, recDir('cp3-cross'), 'EXIT2_GATE2'), '')
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.stdout).not.toMatch(/step 2 gate 2: PASS/)
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 B2: gate-3 comparator exit 2 -> not a pass: overall exit != 0, step 3 not PASS', () => {
    const w = world()
    w.gate3 = { 'jarni-so-do': 'exit2' }
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 B2: a failed replay (non-zero, no step log) -> step 2 FAIL and step 3 not PASS', () => {
    const w = world()
    writeFileSync(path.join(w.rec, recDir('nkz-20ne'), 'FAIL_REPLAY'), '')
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.stdout).toMatch(/step 2 gate 2: FAIL/)
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it.each([
    ['missing', { recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, presented: 'not-yet' }],
    ['empty', { ...KNOWN, issue: '' }],
    ['blank', { ...KNOWN, issue: '   ' }],
  ])('#313 B3: a known-differences entry with %s issue is refused, exit != 0, names the entry', (_n, entry) => {
    const w = world()
    w.gate3['nkz-19so'] = [DIFF]
    writeFileSync(w.known, JSON.stringify([entry]))
    const r = run(w)
    expect(r.status, r.all).not.toBe(0)
    expect(r.all).toContain('K1M_BR2_19:67')
    expect(r.stdout).not.toMatch(/step 3 gate 3: PASS/)
  }, T)

  it('#313 B4: the record lists every tolerated difference with its issue, and the known-differences path and sha256', () => {
    const w = world()
    w.gate3['nkz-19so'] = [DIFF]
    const text = JSON.stringify([KNOWN])
    writeFileSync(w.known, text)
    const r = run(w)
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toContain(`known-differences: ${w.known} sha256 ${sha(text)}`)
    expect(r.stdout).toMatch(/^tolerated: nkz-19so K1M_BR2_19:67 countingRun OpenCanoeTiming\/c123-server#999 xml 1 presented "not-yet"$/m)
  }, T)

  it('#313 B4: no tolerated lines when nothing is tolerated, and the known-differences sha256 is still printed', () => {
    const w = world()
    const r = run(w)
    expect(r.stdout).toContain(`known-differences: ${w.known} sha256 ${sha('[]')}`)
    expect(r.stdout).not.toMatch(/^tolerated:/m)
  }, T)

  it('#313 B4: every override in effect is listed (--replay-script, --data-gate-tests, --known-differences)', () => {
    const w = world()
    const r = run(w, [STUB_PASS])
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toMatch(new RegExp(`^override: --replay-script ${w.replay.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'))
    expect(r.stdout).toMatch(/^override: --data-gate-tests .*stub-pass\.test\.ts/m)
    expect(r.stdout).toContain(`override: --known-differences ${w.known}`)
  }, T)

  it('#313 B4: an override from env C123_GATES_DATA_TESTS is listed too', () => {
    const w = world()
    prepare(w)
    const env: NodeJS.ProcessEnv = { ...process.env, C123_GATES_DATA_TESTS: STUB_PASS, C123_GATES_STUBS: '1' }
    delete env.C123_PROTOCOL_DOCS
    const r = spawnSync(TSX, [SCRIPT, '--protocol-docs', w.pd, '--recordings', w.rec, '--out', w.out, '--replay-script', w.replay,
      '--known-differences', w.known, '--protocol-docs-ref', w.ref], { cwd: ROOT, encoding: 'utf8', timeout: T, env })
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stdout).toMatch(/^override: C123_GATES_DATA_TESTS .*stub-pass\.test\.ts/m)
  }, T)

  // ---- #324: the checker is pinned
  it('#324 pin: the committed pin file holds one full commit SHA', () => {
    expect(readFileSync(path.join(ROOT, 'scripts/gates/protocol-docs.ref'), 'utf8')).toMatch(/^[0-9a-f]{40}\n?$/)
  })

  it('#324 pin: the header prints the pin and an override line for a non-default pin file', () => {
    const w = world()
    const r = run(w)
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toContain(`protocol-docs pin: ${git(w.pd, 'rev-parse', 'HEAD')}`)
    expect(r.stdout).toContain(`override: --protocol-docs-ref ${w.ref}`)
  }, T)

  it('#324 pin: a protocol-docs checkout at another commit -> exit 2, names both SHAs and the bump path, no PASS', () => {
    const w = world()
    const head = git(w.pd, 'rev-parse', 'HEAD')
    w.pin = 'a'.repeat(40)
    const r = run(w)
    expect(r.status, r.all).toBe(2)
    expect(r.all).toContain(head)
    expect(r.all).toContain('a'.repeat(40))
    expect(r.all).toContain('protocol-docs.ref')
    expect(r.all).toContain('scripts/gates/README.md')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it.each([
    ['a modified tracked file', 'tools/gate2/check.js'],
    ['an untracked file', 'tools/gate3/extra.js'],
  ])('#324 pin: %s under tools/ in the protocol-docs checkout -> exit 2, no PASS', (_n, file) => {
    const w = world()
    writeFileSync(path.join(w.pd, file), '// changed\n', { flag: 'a' })
    const r = run(w)
    expect(r.status, r.all).toBe(2)
    expect(r.all).toContain('tools/')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it.each([['not a SHA', 'f7f56eb'], ['empty', '']])('#324 pin: a pin file that is %s -> exit 2, no PASS', (_n, pin) => {
    const w = world()
    w.pin = pin
    const r = run(w)
    expect(r.status, r.all).toBe(2)
    expect(r.all).toContain('protocol-docs.ref')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#324 pin: a protocol-docs directory that is not a git checkout -> exit 2, no PASS', () => {
    const w = world()
    rmSync(path.join(w.pd, '.git'), { recursive: true, force: true })
    w.pin = '0'.repeat(40)
    const r = run(w)
    expect(r.status, r.all).toBe(2)
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  // ---- #319 N14: a known difference pins its two values
  it('#319 N14: the committed known-differences entries all carry xml and presented', () => {
    const entries = JSON.parse(readFileSync(path.join(ROOT, 'scripts/gates/known-differences.json'), 'utf8')) as Record<string, unknown>[]
    expect(entries.length).toBeGreaterThan(0)
    for (const e of entries) {
      expect(e, JSON.stringify(e)).toHaveProperty('xml')
      expect(e, JSON.stringify(e)).toHaveProperty('presented')
      expect(e.xml, JSON.stringify(e)).not.toBeNull()
      expect(e.presented, JSON.stringify(e)).not.toBeNull()
    }
  })

  it.each([
    ['presented', { ...DIFF, presented: 'counting' }],
    ['xml', { ...DIFF, xml: 2 }],
    ['type of xml', { ...DIFF, xml: '1' }],
  ])('#319 N14: a listed difference whose %s differs from the entry -> step 3 FAIL naming both values, exit 1', (_n, diff) => {
    const w = world()
    w.gate3['nkz-19so'] = [diff]
    writeFileSync(w.known, JSON.stringify([KNOWN]))
    const r = run(w)
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 3 gate 3: FAIL/)
    expect(r.stdout).not.toMatch(/^tolerated:/m)
    const line = r.stdout.split('\n').find((l) => l.startsWith('step 3: ') && l.includes('K1M_BR2_19:67')) ?? ''
    expect(line, r.stdout).toContain('countingRun')
    expect(line).toContain(JSON.stringify(diff.xml))
    expect(line).toContain(JSON.stringify(diff.presented))
    expect(line).toContain('"not-yet"')
  }, T)

  it.each([
    ['no xml', { recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', presented: 'not-yet', issue: 'OpenCanoeTiming/c123-server#999' }],
    ['no presented', { recording: 'nkz-19so', attemptId: 'K1M_BR2_19:67', field: 'countingRun', xml: 1, issue: 'OpenCanoeTiming/c123-server#999' }],
  ])('#319 N14: a known-differences entry with %s is refused -> exit 2, names the entry, no PASS', (_n, entry) => {
    const w = world()
    w.gate3['nkz-19so'] = [DIFF]
    writeFileSync(w.known, JSON.stringify([entry]))
    const r = run(w)
    expect(r.status, r.all).toBe(2)
    expect(r.all).toContain('K1M_BR2_19:67')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  // ---- #324: partial runs
  const stepLogLines = (out: string): string[] => [...out.matchAll(/^step-log (\S+) sha256/gm)].map((m) => m[1]!)

  it('#324 --only: steps 2 and 3 on the named recordings only, step 1 not run, PARTIAL in header and verdict, exit 0', () => {
    const w = world({ omit: ['nkz-20ne', 'jarni-so-do'] }) // unselected recordings need not exist
    // a skipping data-gate file would FAIL step 1, so a PASS proves step 1 did not run
    const r = run(w, [STUB_SKIP], ['--only', 'cp3-cross,nkz-19so'])
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toMatch(/^run: PARTIAL .*cp3-cross.*nkz-19so/m)
    expect(r.stdout).not.toMatch(/^run: FULL$/m)
    expect(r.stdout).not.toMatch(/step 1 data-gate tests: (PASS|FAIL)/)
    expect(r.stdout).toMatch(/step 1 data-gate tests: NOT RUN/)
    expect(r.stdout).toMatch(/step 2 gate 2: PASS/)
    expect(r.stdout).toMatch(/step 3 gate 3: PASS/)
    expect(stepLogLines(r.stdout).sort()).toEqual(['cp3-cross', 'nkz-19so'])
    expect([...r.stdout.matchAll(/^recording (\S+) sha256/gm)].map((m) => m[1]).sort()).toEqual(['cp3-cross', 'nkz-19so'])
    expect(r.stdout.trimEnd().split('\n').at(-1)).toMatch(/^verdict: PARTIAL PASS\b/)
    expect(r.stdout).not.toMatch(/^verdict: PASS/m)
  }, T)

  it('#324 --only: a failure on a selected recording -> exit 1, verdict PARTIAL FAIL', () => {
    const w = world()
    writeFileSync(path.join(w.rec, recDir('cp3-cross'), 'FAIL_GATE2'), '')
    const r = run(w, [STUB_PASS], ['--only', 'cp3-cross'])
    expect(r.status, r.all).toBe(1)
    expect(r.stdout).toMatch(/step 2 gate 2: FAIL/)
    expect(r.stdout.trimEnd().split('\n').at(-1)).toMatch(/^verdict: PARTIAL FAIL\b/)
  }, T)

  it('#324 --only: an unselected recording\'s failure is not run', () => {
    const w = world()
    writeFileSync(path.join(w.rec, recDir('nkz-20ne'), 'FAIL_GATE2'), '')
    const r = run(w, [STUB_PASS], ['--only', 'cp3-cross'])
    expect(r.status, r.all).toBe(0)
  }, T)

  it.each([['unknown', 'cp3-cross,no-such-recording'], ['empty', '']])('#324 --only: an %s name -> exit 2, no PASS', (_n, list) => {
    const r = run(world(), [STUB_PASS], ['--only', list])
    expect(r.status, r.all).toBe(2)
    if (list !== '') expect(r.all).toContain('no-such-recording')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#324 --only: a selected recording that is missing -> exit 2, names it', () => {
    const r = run(world({ omit: ['cp3-cross'] }), [STUB_PASS], ['--only', 'cp3-cross'])
    expect(r.status, r.all).toBe(2)
    expect(r.all).toContain('cp3-cross')
    expect(r.all).not.toMatch(/PASS/)
  }, T)

  it('#324 --only: the stale check covers only the selected recordings', () => {
    const w = world()
    writeFileSync(w.known, JSON.stringify([{ ...KNOWN, recording: 'nkz-20ne' }]))
    const quiet = run(w, [STUB_PASS], ['--only', 'cp3-cross'])
    expect(quiet.status, quiet.all).toBe(0)
    const stale = run(w, [STUB_PASS], ['--only', 'cp3-cross,nkz-20ne'])
    expect(stale.status, stale.all).toBe(1)
    expect(stale.stdout).toMatch(/stale known-differences entry.*nkz-20ne/)
  }, T)

  it('#324 --only: a listed difference on a selected recording is tolerated by value', () => {
    const w = world()
    w.gate3['nkz-19so'] = [DIFF]
    writeFileSync(w.known, JSON.stringify([KNOWN]))
    const r = run(w, [STUB_PASS], ['--only', 'nkz-19so'])
    expect(r.status, r.all).toBe(0)
    expect(r.stdout).toMatch(/^tolerated: nkz-19so K1M_BR2_19:67 countingRun /m)
  }, T)
})
