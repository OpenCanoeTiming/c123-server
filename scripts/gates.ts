/**
 * `npm run gates` (#313): data-gate tests (no skips), gate 2 on the 7 whole recordings, mechanical gate 3. Its output is the verification record.
 *
 *   npm run gates -- [--protocol-docs <dir>] [--recordings <dir>] [--out <dir>] [--data-gate-tests <a,b>] [--replay-script <file>]
 *                    [--known-differences <file>]
 *
 * Exit 0: every step passes. 1: a step fails (all steps still run). 2: a prerequisite is missing or unusable (protocol-docs, the checker,
 * the comparator, a recording); nothing is reported as passed.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TSX = path.join(ROOT, 'node_modules/.bin/tsx')
const NAMES = ['nkz-19so', 'cp3-cross', 'jarni-ne-odp', 'jarni-ne-do', 'jarni-so-do', 'jarni-so-odp', 'nkz-20ne']
const DATA_GATE_TESTS = [
  'scripts/__tests__/replay-direct.test.ts',
  'scripts/__tests__/rerun-paths.test.ts',
  'scripts/__tests__/outage.test.ts',
  'scripts/__tests__/onsite-process.test.ts',
  'scripts/__tests__/onsite-write.test.ts',
]

const args = new Map<string, string>()
for (let k = 2; k < process.argv.length; k += 2) {
  const flag = process.argv[k] ?? ''
  const value = process.argv[k + 1]
  if (!['--protocol-docs', '--recordings', '--out', '--data-gate-tests', '--replay-script', '--known-differences'].includes(flag) || value === undefined) {
    process.stderr.write(`gates: bad argument ${flag}\n`)
    process.exit(2)
  }
  args.set(flag, value)
}

const sha = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex')
const git = (cwd: string, ...a: string[]): { sha: string; dirty: string } => {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' })
  const st = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' })
  return { sha: head.status === 0 ? head.stdout.trim() : 'unknown', dirty: st.status === 0 && st.stdout.trim() === '' ? 'no' : 'yes' }
}
const out = (s: string): void => void process.stdout.write(s + '\n')
// Generous per-child limits (RPi): a child that runs past its limit is killed and its step FAILS, naming the child.
const LIMIT_TESTS_MS = 3600_000
const LIMIT_CHILD_MS = 1800_000
const BUF = 1 << 28
type Run = ReturnType<typeof spawnSync>
/** Runs a child with a time limit; prints its elapsed time; returns the result and, when it timed out or died on a signal, why. */
const child = (what: string, cmd: string, a: string[], opts: Parameters<typeof spawnSync>[2], limit = LIMIT_CHILD_MS): { r: Run; killed?: string } => {
  const t0 = Date.now()
  const r = spawnSync(cmd, a, { ...opts, timeout: limit, maxBuffer: BUF })
  out(`  ${what}: exit ${String(r.status)} after ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  if (r.status !== null) return { r }
  const code = (r.error as NodeJS.ErrnoException | undefined)?.code
  const killed = code === 'ETIMEDOUT' ? `timed out after ${limit / 1000} s` : `ended without an exit code (${code ?? `signal ${String(r.signal)}`})`
  process.stderr.write(`gates: ${what} ${killed}\n`)
  return { r, killed }
}
/** sha256 of a recording: its manifest, then each chunk file the manifest lists (name and content), streamed. */
const recordingSha = (dir: string): string => {
  const h = createHash('sha256')
  const m = readFileSync(path.join(dir, 'manifest.json'))
  h.update(m)
  let chunks: { file?: unknown }[] = []
  try {
    const parsed = (JSON.parse(m.toString('utf8')) as { chunks?: unknown }).chunks
    if (!Array.isArray(parsed)) throw new Error('manifest lists no chunks')
    chunks = parsed as { file?: unknown }[]
  } catch (e) {
    missing(`readable manifest in ${dir} (${(e as Error).message})`)
  }
  const buf = Buffer.alloc(8 << 20)
  for (const c of chunks) {
    if (typeof c.file !== 'string') missing(`chunk file name in ${path.join(dir, 'manifest.json')}`)
    const f = path.join(dir, c.file as string)
    if (!existsSync(f)) missing(`chunk ${c.file as string} of ${dir}`)
    h.update(`\0${c.file as string}\0`)
    const fd = openSync(f, 'r')
    try {
      for (let n = readSync(fd, buf); n > 0; n = readSync(fd, buf)) h.update(buf.subarray(0, n))
    } finally { closeSync(fd) }
  }
  return h.digest('hex')
}
const missing = (what: string): never => {
  process.stderr.write(`gates: prerequisite missing: ${what}\n`)
  process.exit(2)
}

// ---- prerequisites (exit 2 before anything runs)
const pd = path.resolve(args.get('--protocol-docs') ?? process.env.C123_PROTOCOL_DOCS ?? path.join(ROOT, '..', 'c123-protocol-docs'))
if (!existsSync(pd) || !statSync(pd).isDirectory()) missing(`protocol-docs directory ${pd}`)
const checker = path.join(pd, 'tools/gate2/check.js')
const comparator = path.join(pd, 'tools/gate3/final-state.js')
if (!existsSync(checker)) missing(`tools/gate2/check.js in ${pd}`)
if (!existsSync(comparator)) missing(`tools/gate3/final-state.js in ${pd}`)
const recRoot = path.resolve(args.get('--recordings') ?? path.join(pd, 'recordings/.cache'))
const entries = existsSync(recRoot) ? readdirSync(recRoot) : []
const recDirs = new Map<string, string>()
for (const n of NAMES) {
  const hit = entries.find((e) => e === n || e.endsWith(`-${n}`))
  if (hit === undefined || !existsSync(path.join(recRoot, hit, 'manifest.json'))) missing(`recording ${n} in ${recRoot}`)
  else recDirs.set(n, path.join(recRoot, hit))
}
const replayScript = args.get('--replay-script') !== undefined ? path.resolve(args.get('--replay-script')!) : path.join(ROOT, 'scripts/replay-direct.ts')
const knownFile = path.resolve(args.get('--known-differences') ?? path.join(ROOT, 'scripts/gates/known-differences.json'))
interface Known { recording: string; attemptId: string; field: string; issue: string; gate?: number }
let known: Known[]
try {
  known = JSON.parse(readFileSync(knownFile, 'utf8')) as Known[]
  if (!Array.isArray(known)) throw new Error('not an array')
} catch (e) {
  known = []
  missing(`known-differences file ${knownFile} (${(e as Error).message})`)
}
for (const k of known) {
  if (typeof k !== 'object' || k === null || typeof k.issue !== 'string' || k.issue.trim() === '') {
    missing(`tracking issue in known-differences entry ${JSON.stringify(k)} (${knownFile}); every entry names the issue tracking it`)
  }
}
const outDir = path.resolve(args.get('--out') ?? mkdtempSync(path.join(tmpdir(), 'c123-gates-')))
mkdirSync(outDir, { recursive: true })
const testFiles = (args.get('--data-gate-tests') ?? process.env.C123_GATES_DATA_TESTS ?? DATA_GATE_TESTS.join(',')).split(',').filter((s) => s !== '')
const overrides: string[] = []
if (args.has('--replay-script') && replayScript !== path.join(ROOT, 'scripts/replay-direct.ts')) overrides.push(`--replay-script ${replayScript}`)
if (testFiles.join(',') !== DATA_GATE_TESTS.join(',')) {
  overrides.push(args.has('--data-gate-tests') ? `--data-gate-tests ${testFiles.join(',')}` : `C123_GATES_DATA_TESTS ${testFiles.join(',')}`)
}
if (knownFile !== path.join(ROOT, 'scripts/gates/known-differences.json')) overrides.push(`--known-differences ${knownFile}`)

// ---- header
const server = git(ROOT)
const pdGit = git(pd)
out(`server commit: ${server.sha} dirty: ${server.dirty}`)
out(`protocol-docs path: ${pd}`)
out(`protocol-docs commit: ${pdGit.sha} dirty: ${pdGit.dirty}`)
out(`recordings path: ${recRoot}`)
for (const n of NAMES) out(`recording ${n} sha256 ${recordingSha(recDirs.get(n)!)}`)
out(`known-differences: ${knownFile} sha256 ${sha(readFileSync(knownFile))}`)
out(`data-gate tests: ${testFiles.join(',')}`)
out(`replay script: ${replayScript}`)
for (const o of overrides) out(`override: ${o}`)
if (overrides.length > 0) out('inputs: NON-DEFAULT (see override lines)')
out(`output dir: ${outDir}`)

const verdicts: boolean[] = []

// ---- step 1: data-gate tests, no skips
out('running step 1: data-gate tests')
const jsonFile = path.join(outDir, 'data-gate-tests.json')
rmSync(jsonFile, { force: true })
const { r: t } = child('vitest', TSX.replace(/tsx$/, 'vitest'), ['run', '--project', 'tools', ...testFiles, '--reporter=default', '--reporter=json', `--outputFile.json=${jsonFile}`],
  { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, C123_PROTOCOL_DOCS: pd } }, LIMIT_TESTS_MS)
let skips = -1
try {
  const j = JSON.parse(readFileSync(jsonFile, 'utf8')) as { numPendingTests?: number; numTodoTests?: number }
  skips = (j.numPendingTests ?? 0) + (j.numTodoTests ?? 0)
} catch { /* unreadable report: counts as a failure below */ }
out(`skip count: ${skips < 0 ? 'unknown' : skips}`)
const step1 = t.status === 0 && skips === 0
out(`step 1 data-gate tests: ${step1 ? 'PASS' : 'FAIL'}`)
verdicts.push(step1)

// ---- step 2: replay + gate 2 on each recording
const logs = new Map<string, string>()
const gate2Failed: string[] = []
for (const n of NAMES) {
  const dir = recDirs.get(n)!
  const log = path.join(outDir, `${n}.steps.jsonl`)
  out(`step 2: replaying ${n} (${new Date().toISOString()})`)
  rmSync(log, { force: true })
  const { r, killed: rk } = child(`replay of ${n}`, TSX, ['--max-old-space-size=3072', replayScript, '--recording', dir, '--out', log], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
  if (r.status !== 0 || !existsSync(log)) {
    out(`step 2: replay of ${n} failed (${rk ?? `exit ${String(r.status)}`})`)
    gate2Failed.push(n)
    continue
  }
  logs.set(n, log)
  out(`step 2: checking ${n}`)
  // Streamed (not buffered): a run with many violations must still report a FAIL, not overflow into "checker unusable".
  const { r: c, killed: ck } = child(`gate-2 checker on ${n}`, 'node', [checker, log, '--recording', dir], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] })
  if (ck !== undefined) {
    out(`step 2: gate-2 checker on ${n} ${ck}`)
    gate2Failed.push(n)
    continue
  }
  if (c.status === 2) {
    process.stderr.write(`gates: gate-2 checker unusable on ${n} (exit ${String(c.status)})\n`)
    out('step 2 gate 2: NOT RUN (checker exit 2)')
    process.exit(2)
  }
  if (c.status !== 0) {
    out(`step 2: gate-2 violation in ${n}`)
    gate2Failed.push(n)
  }
}
for (const n of NAMES) out(`step-log ${n} sha256 ${logs.has(n) ? sha(readFileSync(logs.get(n)!)) : 'missing'}`)
const step2 = gate2Failed.length === 0
out(`step 2 gate 2: ${step2 ? 'PASS' : `FAIL (${gate2Failed.join(', ')})`}`)
verdicts.push(step2)

// ---- step 3: gate 3 against the known differences
interface Diff { recording: string; attemptId: string; field: string; xml?: unknown; presented?: unknown; gate?: number }
const used = new Set<Known>()
const problems: string[] = []
for (const n of NAMES) {
  const log = logs.get(n)
  if (log === undefined) { problems.push(`${n}: no step log (gate 2 replay failed)`); continue }
  const dir = recDirs.get(n)!
  const base = path.basename(dir)
  const summary = path.join(outDir, `${n}.gate3.json`)
  out(`step 3: comparing ${n}`)
  rmSync(summary, { force: true }) // a summary not written by this run is never read
  const { r: c, killed: mk } = child(`gate-3 comparator on ${n}`, 'node', [comparator, log, '--recording', dir, '--summary', summary], { cwd: ROOT, encoding: 'utf8' })
  if (c.status !== 0 && c.stderr) process.stderr.write(`gates: gate-3 comparator stderr on ${n}:\n${String(c.stderr)}\n`)
  if (mk !== undefined) { problems.push(`${n}: gate-3 comparator ${mk}`); continue }
  if (c.status === 2) {
    process.stderr.write(`gates: gate-3 comparator unusable on ${n} (exit 2)\n`)
    out('step 3 gate 3: NOT RUN (comparator exit 2)')
    process.exit(2)
  }
  if (c.status !== 0 && c.status !== 1) { problems.push(`${n}: comparator exit ${String(c.status)} (neither 0 nor 1)`); continue }
  let diffs: Diff[] = []
  try {
    diffs = (JSON.parse(readFileSync(summary, 'utf8')) as { differences: Diff[] }).differences
  } catch {
    problems.push(`${n}: comparator exit ${String(c.status)} with no readable summary`)
    continue
  }
  if (c.status === 1 && diffs.length === 0) problems.push(`${n}: comparator reports a difference but its summary lists none`)
  for (const d of diffs) {
    const hit = known.find((k) => (k.recording === n || k.recording === base || k.recording === d.recording) && k.attemptId === d.attemptId && k.field === d.field &&
      (d.field !== 'Gates' || k.gate === undefined || k.gate === d.gate))
    if (hit) {
      used.add(hit)
      out(`tolerated: ${n} ${d.attemptId} ${d.field} ${hit.issue}`)
    } else problems.push(`${n}: unlisted difference attempt ${d.attemptId} field ${d.field}${d.gate !== undefined ? ` gate ${d.gate}` : ''} xml ${JSON.stringify(d.xml)} presented ${JSON.stringify(d.presented)}`)
  }
}
for (const k of known) if (!used.has(k)) problems.push(`stale known-differences entry no longer differs: ${k.recording} ${k.attemptId} ${k.field} (${k.issue})`)
for (const p of problems) out(`step 3: ${p}`)
const step3 = problems.length === 0
out(`step 3 gate 3: ${step3 ? 'PASS' : 'FAIL'}`)
verdicts.push(step3)

process.exit(verdicts.every(Boolean) ? 0 : 1)
