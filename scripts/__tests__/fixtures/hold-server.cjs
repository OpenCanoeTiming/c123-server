// Preload (NODE_OPTIONS=--require): blocks the real c123-server entry (argv holds src/cli.ts) for
// HOLD_SERVER_MS so it cannot answer health before the test's stub player has died (#232).
// Every other node process (dev-env.mjs, the stub player) is left alone.
if (process.argv.slice(1).some((a) => a.replace(/\\/g, '/').endsWith('src/cli.ts'))) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.HOLD_SERVER_MS || 4000))
}
