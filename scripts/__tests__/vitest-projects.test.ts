/**
 * How `vitest.config.ts` splits the test files into projects (#324, #325). Black box: `vitest list --filesOnly --json` and the
 * config's exported projects, read in child processes.
 *
 *   - The stub data-gate files under scripts/__tests__/fixtures/gates are collected only when env C123_GATES_STUBS=1 (gates.test.ts
 *     sets it for its children); a normal run never collects them, so CI shows no skipped stub.
 *   - The tests of the legacy directories src/sources, src/ws and src/xml form the project `legacy`, retried up to 2 times when env CI
 *     is set and never otherwise. No test of the new code (src/core, src/ingest, src/onsite, src/store, src/adapters, packages) is in it.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
// node + the package's entry script: node_modules/.bin holds .cmd shims on Windows, which spawnSync cannot run without a shell
const VITEST = path.join(ROOT, 'node_modules/vitest/vitest.mjs')
const TSX = path.join(ROOT, 'node_modules/tsx/dist/cli.mjs')
const T = 120_000

function env(extra: Record<string, string>): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env }
  delete e.C123_GATES_STUBS
  delete e.CI
  return { ...e, ...extra }
}
function list(extra: Record<string, string> = {}): { file: string; project: string }[] {
  const r = spawnSync(process.execPath, [VITEST, 'list', '--filesOnly', '--json'], { cwd: ROOT, encoding: 'utf8', timeout: T, env: env(extra) })
  expect(r.status, r.stderr).toBe(0)
  const rows = JSON.parse(r.stdout.slice(r.stdout.indexOf('['))) as { file: string; projectName: string }[]
  return rows.map((x) => ({ file: path.relative(ROOT, x.file).split(path.sep).join('/'), project: x.projectName }))
}
function retries(extra: Record<string, string>): Record<string, unknown> {
  const code = "import('./vitest.config.ts').then((m) => console.log(JSON.stringify(Object.fromEntries(" +
    'm.default.test.projects.map((p) => [p.test.name, p.test.retry ?? 0])))))'
  const r = spawnSync(process.execPath, [TSX, '-e', code], { cwd: ROOT, encoding: 'utf8', timeout: T, env: env(extra) })
  expect(r.status, r.stderr).toBe(0)
  return JSON.parse(r.stdout) as Record<string, unknown>
}
const STUBS = /^scripts\/__tests__\/fixtures\/gates\//
const LEGACY = /^src\/(sources|ws|xml)\//
const NEW_CODE = /^(src\/(core|ingest|onsite|store|adapters)\/|packages\/)/

describe('vitest projects (#324, #325)', () => {
  it('a normal run collects no gates fixture stub; C123_GATES_STUBS=1 collects them in the tools project', () => {
    const normal = list()
    expect(normal.length).toBeGreaterThan(0)
    expect(normal.filter((x) => STUBS.test(x.file))).toEqual([])
    const stubs = list({ C123_GATES_STUBS: '1' }).filter((x) => STUBS.test(x.file))
    expect(stubs.map((x) => x.file).sort()).toEqual([
      'scripts/__tests__/fixtures/gates/stub-env.test.ts',
      'scripts/__tests__/fixtures/gates/stub-pass.test.ts',
      'scripts/__tests__/fixtures/gates/stub-skip.test.ts',
    ])
    expect(new Set(stubs.map((x) => x.project))).toEqual(new Set(['tools']))
  }, T)

  it('the legacy directories, and only they, are the project legacy; no test of the new code is in it', () => {
    const rows = list()
    const legacy = rows.filter((x) => LEGACY.test(x.file))
    expect(legacy.length).toBeGreaterThan(0)
    for (const x of legacy) expect(x.project, x.file).toBe('legacy')
    for (const x of rows.filter((r) => r.project === 'legacy')) expect(x.file).toMatch(LEGACY)
    for (const x of rows.filter((r) => NEW_CODE.test(r.file))) expect(x.project, x.file).not.toBe('legacy')
  }, T)

  it('the legacy project retries 2 times under CI and never otherwise; no other project retries', () => {
    const ci = retries({ CI: 'true' })
    expect(ci.legacy).toBe(2)
    expect(retries({}).legacy).toBe(0)
    for (const [name, n] of Object.entries(ci)) if (name !== 'legacy') expect(n, name).toBe(0)
  }, T)
})
