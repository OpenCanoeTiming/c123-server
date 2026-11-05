// Stub of c123-protocol-docs tools/player.js: binds --port (TCP) and --control-port (HTTP /status),
// writes its argv to <dir of --xml-out>/player-argv.json and a minimal XML to --xml-out.
const fs = require('fs')
const net = require('net')
const http = require('http')
const path = require('path')
const argv = process.argv.slice(2)
const opt = (n) => argv[argv.indexOf(n) + 1]
if (process.env.STUB_PLAYER_DIE === '1') {
  console.error('stub player: dying at once')
  process.exit(3)
}
const xmlOut = opt('--xml-out')
fs.writeFileSync(path.join(path.dirname(xmlOut), 'player-argv.json'), JSON.stringify(argv))
fs.writeFileSync(xmlOut, '<?xml version="1.0"?><Canoe123Data></Canoe123Data>\n')
const tcp = net.createServer((s) => s.on('error', () => {}))
tcp.listen(Number(opt('--port')), '127.0.0.1')
// STUB_PLAYER_MODE=silent: binds but never answers health.
// STUB_PLAYER_MODE=die-after: answers /status, exits 500 ms after the first answer.
const mode = process.env.STUB_PLAYER_MODE
const ctl = http.createServer((req, res) => {
  if (mode === 'silent') return
  if (req.url === '/status') {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ state: 'playing' }))
    if (mode === 'die-after') setTimeout(() => process.exit(4), 500)
  } else {
    res.statusCode = 404
    res.end()
  }
})
ctl.listen(Number(opt('--control-port')), '127.0.0.1')
process.on('SIGTERM', () => process.exit(0))
