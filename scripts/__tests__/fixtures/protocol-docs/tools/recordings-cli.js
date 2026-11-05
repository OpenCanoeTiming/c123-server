// Stub of c123-protocol-docs tools/recordings-cli.js. Records each call to ../calls.log.
const fs = require('fs')
const path = require('path')
const docs = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
fs.appendFileSync(path.join(docs, 'calls.log'), JSON.stringify(args) + '\n')
const [cmd, id] = args
if (!id || id.startsWith('unknown')) {
  console.error(`recording not found: ${id}`)
  process.exit(1)
}
if (cmd === 'fetch') process.exit(0)
if (cmd === 'path') {
  const dir = path.join(docs, 'recordings', id)
  fs.mkdirSync(dir, { recursive: true })
  console.log(dir)
  process.exit(0)
}
console.error('unknown command ' + cmd)
process.exit(2)
