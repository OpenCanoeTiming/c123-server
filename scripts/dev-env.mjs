#!/usr/bin/env node
// Dev environment in one command: recording player + server on free ports.
//   node scripts/dev-env.mjs --recording <id> [--speed N] [--protocol-docs <path>] [--state-dir <path>]
//   node scripts/dev-env.mjs --down [--state-dir <path>]
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HEALTH_TIMEOUT_MS = 60_000 // both services bind within seconds; a hung child must not outlast the 2-minute acceptance
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fail(msg, code = 1) {
  console.error(`dev-env: ${msg}`)
  process.exit(code)
}

function parseArgs(argv) {
  const o = { down: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      if (i + 1 >= argv.length) fail(`${a} needs a value`, 2)
      return argv[++i]
    }
    if (a === '--down') o.down = true
    else if (a === '--recording') o.recording = next()
    else if (a === '--speed') o.speed = next()
    else if (a === '--protocol-docs') o.protocolDocs = next()
    else if (a === '--state-dir') o.stateDir = next()
    else fail(`unknown argument ${a}`, 2)
  }
  return o
}

const isAlive = (pid) => {
  try {
    process.kill(pid, 0)
  } catch (e) {
    return e.code === 'EPERM'
  }
  // A zombie (exited, not yet reaped) still answers signal 0; treat it as gone.
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8')
    if (stat.slice(stat.lastIndexOf(')') + 2, stat.lastIndexOf(')') + 3) === 'Z') return false
  } catch { /* no procfs */ }
  return true
}

/** Command line of a pid: /proc first, then ps. null when neither source exists. */
function cmdlineOf(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ')
  } catch (e) {
    if (fs.existsSync('/proc/self')) return e.code === 'ENOENT' ? '' : null // procfs present, pid gone
  }
  try {
    return execFileSync('ps', ['-o', 'args=', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) {
    return e.code === 'ENOENT' ? null : '' // ps missing: unknown; ps failed: no such pid
  }
}

/** A pid read from disk is this env's process only if it is alive and its command line holds the state dir. */
function isOurs(pid, stateDir) {
  if (!Number.isInteger(pid) || !isAlive(pid)) return false
  const cmd = cmdlineOf(pid)
  if (cmd === null) return true // no way to tell (e.g. Windows without ps): trust the pid
  return cmd.includes(stateDir)
}

async function killPid(pid) {
  if (!isAlive(pid)) return true
  try { process.kill(pid, 'SIGTERM') } catch { /* gone */ }
  for (let i = 0; i < 50 && isAlive(pid); i++) await sleep(100)
  if (isAlive(pid)) {
    try { process.kill(pid, 'SIGKILL') } catch { /* gone */ }
    for (let i = 0; i < 50 && isAlive(pid); i++) await sleep(100)
  }
  return !isAlive(pid)
}

async function allocPorts(n) {
  // Keep every probe socket open until all are chosen so the ports are distinct.
  const servers = []
  const ports = []
  for (let i = 0; i < n; i++) {
    const s = net.createServer()
    await new Promise((res, rej) => { s.once('error', rej); s.listen(0, '127.0.0.1', res) })
    servers.push(s)
    ports.push(s.address().port)
  }
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))))
  return ports
}

function resolveDocs(o) {
  const candidates = []
  if (o.protocolDocs) candidates.push(path.resolve(o.protocolDocs))
  if (process.env.C123_PROTOCOL_DOCS) candidates.push(path.resolve(process.env.C123_PROTOCOL_DOCS))
  let sibling = '<main checkout>/../c123-protocol-docs'
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    sibling = path.join(path.dirname(common), '..', 'c123-protocol-docs')
    sibling = path.resolve(sibling)
  } catch { /* not a git checkout */ }
  // Flag and env are explicit: the first one given wins, no silent fallthrough.
  const explicit = candidates[0]
  const dir = explicit ?? sibling
  if (fs.existsSync(path.join(dir, 'tools', 'player.js'))) return dir
  fail(
    `protocol docs not found (looked in ${dir}). Provide them via --protocol-docs <path>, ` +
    `the C123_PROTOCOL_DOCS environment variable, or a c123-protocol-docs directory at ${sibling}`,
  )
}

/** null when the file is absent; exits non-zero when it exists but cannot be read. */
function readState(file) {
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') return null
    fail(`cannot read ${file}: ${e.message}`)
  }
  try {
    const st = JSON.parse(text)
    if (st && typeof st === 'object') return st
  } catch { /* fall through */ }
  return fail(`${file} is unreadable (not valid JSON); inspect it, or remove it if nothing is running`)
}

function writeStateAtomic(file, st) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2) + '\n')
  fs.renameSync(tmp, file)
}

const statePids = (st) => [st.server?.pid, st.player?.pid].filter((p) => Number.isInteger(p))

async function down(stateDir) {
  const file = path.join(stateDir, 'state.json')
  const st = readState(file)
  if (!st) {
    console.log('dev-env: nothing to stop')
    return
  }
  const pids = statePids(st).filter((p) => isOurs(p, stateDir))
  const results = await Promise.all(pids.map(killPid))
  if (results.some((ok) => !ok)) fail(`could not stop all processes (pids ${pids.join(', ')}); state.json kept`)
  fs.rmSync(file, { force: true })
  const lock = readLock(path.join(stateDir, 'up.lock'))
  if (lock !== null && !isAlive(lock)) fs.rmSync(path.join(stateDir, 'up.lock'), { force: true })
  console.log('dev-env: stopped')
}

function readLock(file) {
  try {
    const n = Number(fs.readFileSync(file, 'utf8').trim())
    return Number.isInteger(n) && n > 0 ? n : 0
  } catch { return null }
}

/** Takes <state>/up.lock with `wx`; a lock held by a dead pid is replaced. */
function takeLock(stateDir) {
  const file = path.join(stateDir, 'up.lock')
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, String(process.pid), { flag: 'wx' })
      return file
    } catch (e) {
      if (e.code !== 'EEXIST') fail(`cannot create ${file}: ${e.message}`)
    }
    const holder = readLock(file)
    if (holder !== null && holder !== 0 && isAlive(holder)) fail(`already running: another up holds ${file} (pid ${holder})`)
    fs.rmSync(file, { force: true }) // stale
  }
  return fail(`already running: another up holds ${file}`)
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })
    let out = '', err = ''
    c.stdout.on('data', (d) => (out += d))
    c.stderr.on('data', (d) => (err += d))
    c.on('error', (e) => resolve({ code: 1, out, err: err + e.message }))
    c.on('close', (code) => resolve({ code: code ?? 1, out, err }))
  })
}

function npmCi() {
  const execpath = process.env.npm_execpath
  const r = execpath && fs.existsSync(execpath)
    ? spawnSync(process.execPath, [execpath, 'ci'], { cwd: ROOT, stdio: 'inherit' })
    : spawnSync('npm', ['ci'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
  return r.status === 0
}

async function up(o) {
  if (!o.recording) fail('--recording <id> is required', 2)
  const speed = o.speed === undefined ? 1 : Number(o.speed)
  if (!Number.isFinite(speed) || speed <= 0) fail(`invalid --speed ${o.speed}`, 2)
  const stateDir = path.resolve(o.stateDir ?? path.join(ROOT, '.dev-env'))
  const stateFile = path.join(stateDir, 'state.json')
  const docs = resolveDocs(o)
  fs.mkdirSync(path.join(stateDir, 'home'), { recursive: true })

  const lockFile = takeLock(stateDir)
  const children = []
  let finished = false
  const releaseLock = () => { try { fs.rmSync(lockFile, { force: true }) } catch { /* ignore */ } }
  process.on('exit', releaseLock)
  const cleanup = async () => {
    await Promise.all(children.map((r) => killPid(r.pid)))
    fs.rmSync(stateFile, { force: true })
    releaseLock()
  }
  const abort = async (msg, log) => {
    await cleanup()
    fail(`${msg}${log ? ` (see ${log})` : ''}`)
  }
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.on(sig, () => {
      if (finished) return
      finished = true
      cleanup().then(() => {
        console.error(`dev-env: interrupted (${sig}); stopped what had started`)
        process.exit(code)
      })
    })
  }

  const existing = readState(stateFile)
  if (existing) {
    if (statePids(existing).some((p) => isOurs(p, stateDir))) {
      releaseLock()
      fail(`already running (state: ${stateFile}); run with --down first`)
    }
    fs.rmSync(stateFile, { force: true }) // stale: nothing of it is alive
  }

  if (!fs.existsSync(path.join(ROOT, 'node_modules', '.package-lock.json'))) {
    console.log('dev-env: installing dependencies (npm ci)')
    if (!npmCi()) await abort('npm ci failed')
  }
  // The server serves src/admin-ui as it is: refresh the design system copy, which a single-package
  // `npm install <pkg>` leaves stale (it runs no postinstall). Not strict: a missing package only warns.
  spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-design-system.js')], { cwd: ROOT, stdio: 'inherit' })

  const cli = path.join(docs, 'tools', 'recordings-cli.js')
  const fetched = await run(process.execPath, [cli, 'fetch', o.recording])
  if (fetched.code !== 0) await abort(`could not fetch recording ${o.recording}: ${(fetched.err || fetched.out).trim()}`)
  const pathed = await run(process.execPath, [cli, 'path', o.recording])
  const recDir = pathed.out.trim().split('\n').pop()?.trim()
  if (pathed.code !== 0 || !recDir) await abort(`could not resolve recording ${o.recording}: ${(pathed.err || pathed.out).trim()}`)

  const [tcpPort, controlPort, serverPort] = await allocPorts(3)
  const xmlPath = path.join(stateDir, 'replay.xml')
  const playerLog = path.join(stateDir, 'player.log')
  const serverLog = path.join(stateDir, 'server.log')
  fs.rmSync(xmlPath, { force: true })

  const spawnDetached = (args, logFile, extra = {}) => {
    const fd = fs.openSync(logFile, 'w')
    const c = spawn(process.execPath, args, { detached: true, stdio: ['ignore', fd, fd], ...extra })
    fs.closeSync(fd)
    const rec = { child: c, exited: false, pid: c.pid, log: logFile }
    c.on('exit', () => { rec.exited = true })
    c.on('error', () => { rec.exited = true })
    children.push(rec)
    return rec
  }
  const state = {
    recording: o.recording, speed, xmlPath, startedAt: new Date().toISOString(),
    player: null, server: null,
  }
  const player = spawnDetached([
    path.join(docs, 'tools', 'player.js'), recDir,
    '--port', String(tcpPort), '--control-port', String(controlPort),
    '--xml-out', xmlPath, '--autoplay', '--no-udp', '--no-cis', '--speed', String(speed),
  ], playerLog)
  state.player = { pid: player.pid, tcpPort, controlPort }
  writeStateAtomic(stateFile, state) // early, so --down reaches a partly started env
  const home = path.join(stateDir, 'home')
  const server = spawnDetached([
    '--import', 'tsx', 'src/cli.ts',
    '--host', '127.0.0.1', '--port', String(tcpPort), '--server-port', String(serverPort),
    '--xml', xmlPath, '--no-discovery', '--no-autodetect', '--no-tray',
  ], serverLog, { cwd: ROOT, env: { ...process.env, HOME: home, APPDATA: home } })

  state.server = { pid: server.pid, port: serverPort }
  writeStateAtomic(stateFile, state)

  const healthy = async (url) => {
    try { return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status === 200 } catch { return false }
  }
  const targets = [
    { rec: player, name: 'player', url: `http://127.0.0.1:${controlPort}/status`, ok: false },
    { rec: server, name: 'server', url: `http://127.0.0.1:${serverPort}/api/status`, ok: false },
  ]
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  const checkAlive = async (what) => {
    for (const t of targets) {
      if (t.rec.exited || !isAlive(t.rec.pid)) await abort(`${t.name} exited ${what}`, t.rec.log)
    }
  }
  while (targets.some((t) => !t.ok)) {
    await checkAlive('before becoming healthy')
    for (const t of targets) {
      if (!t.ok) t.ok = await healthy(t.url)
    }
    await checkAlive('before becoming healthy')
    if (targets.every((t) => t.ok)) break
    if (Date.now() > deadline) {
      const t = targets.find((x) => !x.ok)
      await abort(`${t.name} not healthy after ${HEALTH_TIMEOUT_MS / 1000}s`, t.rec.log)
    }
    await sleep(250)
  }

  await sleep(0)
  await checkAlive('right after answering')
  finished = true
  for (const r of children) r.child.unref()

  console.log(`dev-env: up (recording ${o.recording}, speed ${speed})
  server:   http://127.0.0.1:${serverPort}  (status: /api/status)
  ws:       ws://127.0.0.1:${serverPort}/ws
  player:   control http://127.0.0.1:${controlPort}  (tcp ${tcpPort})
  logs:     ${playerLog}
            ${serverLog}
  state:    ${stateFile}
  stop:     node scripts/dev-env.mjs --down${o.stateDir ? ` --state-dir ${stateDir}` : ''}`)
  process.exit(0)
}

const o = parseArgs(process.argv.slice(2))
if (o.down) await down(path.resolve(o.stateDir ?? path.join(ROOT, '.dev-env')))
else await up(o)
