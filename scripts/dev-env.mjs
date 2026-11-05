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
const HEALTH_TIMEOUT_MS = 180_000 // the player reads a large recording before it answers
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

function readState(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

async function down(stateDir) {
  const file = path.join(stateDir, 'state.json')
  const st = readState(file)
  if (!st) {
    console.log('dev-env: nothing to stop')
    return
  }
  const pids = [st.server?.pid, st.player?.pid].filter((p) => Number.isInteger(p))
  const results = await Promise.all(pids.map(killPid))
  if (results.some((ok) => !ok)) fail(`could not stop all processes (pids ${pids.join(', ')}); state.json kept`)
  fs.rmSync(file, { force: true })
  console.log('dev-env: stopped')
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

async function up(o) {
  if (!o.recording) fail('--recording <id> is required', 2)
  const speed = o.speed === undefined ? 1 : Number(o.speed)
  if (!Number.isFinite(speed) || speed <= 0) fail(`invalid --speed ${o.speed}`, 2)
  const stateDir = path.resolve(o.stateDir ?? path.join(ROOT, '.dev-env'))
  const stateFile = path.join(stateDir, 'state.json')

  const existing = readState(stateFile)
  if (existing) {
    const live = [existing.player?.pid, existing.server?.pid].some((p) => Number.isInteger(p) && isAlive(p))
    if (live) fail(`already running (state: ${stateFile}); run with --down first`)
    fs.rmSync(stateFile, { force: true }) // stale
  }

  const docs = resolveDocs(o)
  fs.mkdirSync(path.join(stateDir, 'home'), { recursive: true })

  if (!fs.existsSync(path.join(ROOT, 'node_modules', '.package-lock.json'))) {
    console.log('dev-env: installing dependencies (npm ci)')
    const r = spawnSync('npm', ['ci'], { cwd: ROOT, stdio: 'inherit' })
    if (r.status !== 0) fail('npm ci failed')
  }

  const cli = path.join(docs, 'tools', 'recordings-cli.js')
  const fetched = await run(process.execPath, [cli, 'fetch', o.recording])
  if (fetched.code !== 0) fail(`could not fetch recording ${o.recording}: ${(fetched.err || fetched.out).trim()}`)
  const pathed = await run(process.execPath, [cli, 'path', o.recording])
  const recDir = pathed.out.trim().split('\n').pop()?.trim()
  if (pathed.code !== 0 || !recDir) fail(`could not resolve recording ${o.recording}: ${(pathed.err || pathed.out).trim()}`)

  const [tcpPort, controlPort, serverPort] = await allocPorts(3)
  const xmlPath = path.join(stateDir, 'replay.xml')
  const playerLog = path.join(stateDir, 'player.log')
  const serverLog = path.join(stateDir, 'server.log')
  fs.rmSync(xmlPath, { force: true })

  const children = []
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
  const abort = async (msg, log) => {
    await Promise.all(children.map((r) => killPid(r.pid)))
    fs.rmSync(stateFile, { force: true })
    fail(`${msg}${log ? ` (see ${log})` : ''}`)
  }

  const player = spawnDetached([
    path.join(docs, 'tools', 'player.js'), recDir,
    '--port', String(tcpPort), '--control-port', String(controlPort),
    '--xml-out', xmlPath, '--autoplay', '--no-udp', '--no-cis', '--speed', String(speed),
  ], playerLog)
  const home = path.join(stateDir, 'home')
  const server = spawnDetached([
    '--import', 'tsx', 'src/cli.ts',
    '--host', '127.0.0.1', '--port', String(tcpPort), '--server-port', String(serverPort),
    '--xml', xmlPath, '--no-discovery', '--no-autodetect', '--no-tray',
  ], serverLog, { cwd: ROOT, env: { ...process.env, HOME: home, APPDATA: home } })

  const healthy = async (url) => {
    try { return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status === 200 } catch { return false }
  }
  const targets = [
    { rec: player, name: 'player', url: `http://127.0.0.1:${controlPort}/status`, ok: false },
    { rec: server, name: 'server', url: `http://127.0.0.1:${serverPort}/api/status`, ok: false },
  ]
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  while (targets.some((t) => !t.ok)) {
    for (const t of targets) {
      if (t.ok) continue
      if (t.rec.exited) await abort(`${t.name} exited before becoming healthy`, t.rec.log)
      t.ok = await healthy(t.url)
    }
    if (targets.every((t) => t.ok)) break
    if (Date.now() > deadline) {
      const t = targets.find((x) => !x.ok)
      await abort(`${t.name} not healthy after ${HEALTH_TIMEOUT_MS / 1000}s`, t.rec.log)
    }
    await sleep(250)
  }

  fs.writeFileSync(stateFile, JSON.stringify({
    recording: o.recording, speed, xmlPath, startedAt: new Date().toISOString(),
    player: { pid: player.pid, tcpPort, controlPort },
    server: { pid: server.pid, port: serverPort },
  }, null, 2) + '\n')
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
