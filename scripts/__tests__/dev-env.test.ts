import { execFile, execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = path.join(ROOT, 'scripts/dev-env.mjs')
const FIXTURE_DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/protocol-docs')
const DEFAULT_PORTS = [27333, 27340, 27123, 8080]
const T = 60_000

interface Run { code: number; stdout: string; stderr: string; ms: number }

function run(args: string[], opts: { env?: NodeJS.ProcessEnv; cwd?: string; script?: string } = {}): Promise<Run> {
  const t0 = Date.now()
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [opts.script ?? SCRIPT, ...args],
      { cwd: opts.cwd ?? ROOT, env: opts.env ?? process.env, timeout: 90_000 },
      (err, stdout, stderr) => {
        const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0
        resolve({ code, stdout, stderr, ms: Date.now() - t0 })
      },
    )
  })
}

const tmpDirs: string[] = []
const stateDirs: string[] = []

function tmp(prefix = 'devenv-'): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix))
  tmpDirs.push(d)
  return d
}
/** Own copy of the fake protocol-docs dir (own calls.log per test). */
function makeDocs(): string {
  const d = path.join(tmp('devenv-docs-'), 'docs')
  cpSync(FIXTURE_DOCS, d, { recursive: true })
  return d
}
function makeState(): string {
  const d = path.join(tmp('devenv-state-'), 'state')
  stateDirs.push(d)
  return d
}
function readState(stateDir: string) {
  return JSON.parse(readFileSync(path.join(stateDir, 'state.json'), 'utf8'))
}
function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true } catch { return false }
}
function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' })
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('error', () => resolve(false))
  })
}
async function status(url: string): Promise<number> {
  try { return (await fetch(url)).status } catch { return 0 }
}
/** True when some process has the state dir in its command line. */
function processesFor(stateDir: string): boolean {
  try {
    execFileSync('pgrep', ['-f', stateDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')])
    return true
  } catch { return false }
}
const baseEnv = (extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => {
  const env = { ...process.env, ...extra }
  delete env.C123_PROTOCOL_DOCS
  return { ...env, ...extra }
}
function up(docs: string, stateDir: string, extra: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return run(['--recording', 'rec-1', '--protocol-docs', docs, '--state-dir', stateDir, ...extra], { env: baseEnv(env) })
}

afterEach(async () => {
  for (const s of stateDirs.splice(0)) {
    let pids: number[] = []
    try {
      const st = readState(s)
      pids = [st.player?.pid, st.server?.pid].filter((p) => typeof p === 'number')
    } catch { /* no state */ }
    await run(['--down', '--state-dir', s], { env: baseEnv() })
    for (const p of pids) { try { process.kill(p, 'SIGKILL') } catch { /* gone */ } }
  }
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('dev-env', () => {
  it('up: player and server healthy on free ports', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state)
    expect(r.code, r.stderr).toBe(0)
    const st = readState(state)
    expect(st).toEqual({
      recording: 'rec-1',
      speed: expect.any(Number),
      xmlPath: expect.any(String),
      startedAt: expect.anything(),
      player: { pid: expect.any(Number), tcpPort: expect.any(Number), controlPort: expect.any(Number) },
      server: { pid: expect.any(Number), port: expect.any(Number) },
    })
    const ports = [st.player.tcpPort, st.player.controlPort, st.server.port]
    expect(new Set(ports).size).toBe(3)
    for (const p of ports) expect(DEFAULT_PORTS).not.toContain(p)
    expect(await status(`http://127.0.0.1:${st.player.controlPort}/status`)).toBe(200)
    expect(await status(`http://127.0.0.1:${st.server.port}/api/status`)).toBe(200)
  }, T)

  it('up: prints ports and attach hints', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state)
    expect(r.code, r.stderr).toBe(0)
    const st = readState(state)
    expect(r.stdout).toContain(String(st.server.port))
    expect(r.stdout).toContain(`ws://127.0.0.1:${st.server.port}/ws`)
    expect(r.stdout).toContain(`http://127.0.0.1:${st.server.port}`)
    expect(r.stdout).toContain(`http://127.0.0.1:${st.player.controlPort}`)
    expect(r.stdout).toContain('--down')
  }, T)

  it('up: player argv', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state, ['--speed', '4'])
    expect(r.code, r.stderr).toBe(0)
    const st = readState(state)
    const argv: string[] = JSON.parse(readFileSync(path.join(state, 'player-argv.json'), 'utf8'))
    const val = (n: string) => argv[argv.indexOf(n) + 1]
    expect(argv[0]).toBe(path.join(docs, 'recordings', 'rec-1'))
    expect(val('--port')).toBe(String(st.player.tcpPort))
    expect(val('--control-port')).toBe(String(st.player.controlPort))
    expect(path.resolve(val('--xml-out')).startsWith(path.resolve(state) + path.sep)).toBe(true)
    for (const f of ['--autoplay', '--no-udp', '--no-cis']) expect(argv).toContain(f)
    expect(val('--speed')).toBe('4')
  }, T)

  it('up: speed defaults to 1', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state)
    expect(r.code, r.stderr).toBe(0)
    const argv: string[] = JSON.parse(readFileSync(path.join(state, 'player-argv.json'), 'utf8'))
    expect(argv[argv.indexOf('--speed') + 1]).toBe('1')
    expect(readState(state).speed).toBe(1)
  }, T)

  it('up: fetches without force, then resolves path', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state)
    expect(r.code, r.stderr).toBe(0)
    const calls: string[][] = readFileSync(path.join(docs, 'calls.log'), 'utf8')
      .trim().split('\n').map((l) => JSON.parse(l))
    expect(calls).toEqual([['fetch', 'rec-1'], ['path', 'rec-1']])
    expect(calls.flat()).not.toContain('--force')
  }, T)

  it('up: unknown recording fails and leaves nothing', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await run(
      ['--recording', 'unknown-xyz', '--protocol-docs', docs, '--state-dir', state],
      { env: baseEnv() },
    )
    expect(r.code).not.toBe(0)
    expect(r.stderr).toContain('unknown-xyz')
    expect(existsSync(path.join(state, 'state.json'))).toBe(false)
    expect(processesFor(state)).toBe(false)
  }, T)

  it('up: player that dies fails fast', async () => {
    const docs = makeDocs(), state = makeState()
    const r = await up(docs, state, [], { STUB_PLAYER_DIE: '1' })
    expect(r.code).not.toBe(0)
    expect(r.ms).toBeLessThan(30_000)
    expect(r.stderr).toContain('player.log')
    expect(existsSync(path.join(state, 'state.json'))).toBe(false)
    expect(processesFor(state)).toBe(false)
  }, T)

  it('down: stops both and removes state', async () => {
    const docs = makeDocs(), state = makeState()
    expect((await up(docs, state)).code).toBe(0)
    const st = readState(state)
    const ports = [st.player.tcpPort, st.player.controlPort, st.server.port]
    const d = await run(['--down', '--state-dir', state], { env: baseEnv() })
    expect(d.code, d.stderr).toBe(0)
    expect(isAlive(st.player.pid)).toBe(false)
    expect(isAlive(st.server.pid)).toBe(false)
    for (const p of ports) expect(await portOpen(p)).toBe(false)
    expect(existsSync(path.join(state, 'state.json'))).toBe(false)
  }, T)

  it('down: nothing to stop is a no-op', async () => {
    const state = makeState()
    mkdirSync(state, { recursive: true })
    const d = await run(['--down', '--state-dir', state], { env: baseEnv() })
    expect(d.code, d.stderr).toBe(0)
  }, T)

  it('side by side: two environments are independent', async () => {
    const docs = makeDocs(), a = makeState(), b = makeState()
    const [ra, rb] = await Promise.all([up(docs, a), up(docs, b)])
    expect(ra.code, ra.stderr).toBe(0)
    expect(rb.code, rb.stderr).toBe(0)
    const sa = readState(a), sb = readState(b)
    const ports = [sa, sb].flatMap((s) => [s.player.tcpPort, s.player.controlPort, s.server.port])
    expect(new Set(ports).size).toBe(6)
    const healthy = async (s: typeof sa) =>
      [await status(`http://127.0.0.1:${s.player.controlPort}/status`), await status(`http://127.0.0.1:${s.server.port}/api/status`)]
    expect(await healthy(sa)).toEqual([200, 200])
    expect(await healthy(sb)).toEqual([200, 200])
    expect((await run(['--down', '--state-dir', a], { env: baseEnv() })).code).toBe(0)
    expect(await healthy(sb)).toEqual([200, 200])
    expect(isAlive(sa.server.pid)).toBe(false)
  }, T * 2)

  it('up: refuses a second up on the same state dir', async () => {
    const docs = makeDocs(), state = makeState()
    expect((await up(docs, state)).code).toBe(0)
    const st = readState(state)
    const r2 = await up(docs, state)
    expect(r2.code).not.toBe(0)
    expect(r2.stderr.toLowerCase()).toContain('already running')
    expect(await status(`http://127.0.0.1:${st.player.controlPort}/status`)).toBe(200)
    expect(await status(`http://127.0.0.1:${st.server.port}/api/status`)).toBe(200)
  }, T)

  it('up: server home is inside the state dir', async () => {
    const docs = makeDocs(), state = makeState()
    const home = tmp('devenv-home-')
    const r = await up(docs, state, [], { HOME: home })
    expect(r.code, r.stderr).toBe(0)
    const log = path.join(state, 'home', '.c123-server', 'server.log')
    for (let i = 0; i < 50 && !existsSync(log); i++) await new Promise((x) => setTimeout(x, 200))
    expect(existsSync(log)).toBe(true)
    expect(existsSync(path.join(home, '.c123-server'))).toBe(false)
  }, T)

  describe('protocol docs', () => {
    it('flag beats env', async () => {
      const flagDocs = makeDocs(), envDocs = makeDocs(), state = makeState()
      const r = await run(
        ['--recording', 'rec-1', '--protocol-docs', flagDocs, '--state-dir', state],
        { env: baseEnv({ C123_PROTOCOL_DOCS: envDocs }) },
      )
      expect(r.code, r.stderr).toBe(0)
      expect(existsSync(path.join(flagDocs, 'calls.log'))).toBe(true)
      expect(existsSync(path.join(envDocs, 'calls.log'))).toBe(false)
    }, T)

    it('env is used', async () => {
      const envDocs = makeDocs(), state = makeState()
      const r = await run(
        ['--recording', 'rec-1', '--state-dir', state],
        { env: baseEnv({ C123_PROTOCOL_DOCS: envDocs }) },
      )
      expect(r.code, r.stderr).toBe(0)
      expect(existsSync(path.join(envDocs, 'calls.log'))).toBe(true)
    }, T)

    it('not found names the three places', async () => {
      // temp repo whose parent holds no c123-protocol-docs sibling
      const parent = tmp('devenv-norepo-')
      const repo = path.join(parent, 'repo')
      mkdirSync(path.join(repo, 'scripts'), { recursive: true })
      mkdirSync(path.join(repo, 'node_modules'), { recursive: true })
      writeFileSync(path.join(repo, 'node_modules', '.package-lock.json'), '{}') // no npm ci
      execFileSync('git', ['init', '-q'], { cwd: repo })
      cpSync(SCRIPT, path.join(repo, 'scripts', 'dev-env.mjs'))
      const state = path.join(parent, 'state')
      const r = await run(
        ['--recording', 'rec-1', '--state-dir', state],
        { env: baseEnv(), cwd: repo, script: path.join(repo, 'scripts', 'dev-env.mjs') },
      )
      expect(r.code).not.toBe(0)
      expect(r.stderr).toContain('--protocol-docs')
      expect(r.stderr).toContain('C123_PROTOCOL_DOCS')
      expect(r.stderr).toContain(path.join(parent, 'c123-protocol-docs'))
    }, T)
  })

  it('package.json exposes dev:env', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    expect(pkg.scripts['dev:env']).toContain('scripts/dev-env.mjs')
  })
})
