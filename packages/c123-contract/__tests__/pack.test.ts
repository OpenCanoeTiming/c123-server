// Rows 14-17. Real `npm pack` into temp dirs; `prepack` (the implementer's) copies the
// schemas from docs/arch/schemas into packages/c123-contract/schemas (gitignored).
import { spawnSync } from 'node:child_process'
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { PKG_DIR, ROOT, SCHEMAS_DIR, SCHEMA_FILES, TSC } from './paths.js'

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const PKG_NAME = '@opencanoetiming/c123-contract'

const tmpDirs: string[] = []
const tmp = (p: string) => {
  const d = mkdtempSync(join(tmpdir(), p))
  tmpDirs.push(d)
  return d
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

// prepack writes packages/c123-contract/schemas; leave the worktree as found.
const schemasDirExisted = existsSync(join(PKG_DIR, 'schemas'))
afterAll(() => {
  if (!schemasDirExisted) rmSync(join(PKG_DIR, 'schemas'), { recursive: true, force: true })
})

function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? ''), stdout: r.stdout ?? '' }
}

function pack(): { tgz: string; dest: string } {
  const dest = tmp('c123-pack-')
  const r = run(NPM, ['pack', '--pack-destination', dest, '--json', '--no-audit', '--no-fund'], PKG_DIR)
  expect(r.status, r.out).toBe(0)
  const tgz = readdirSync(dest).find((f) => f.endsWith('.tgz'))
  expect(tgz, `no tarball in ${dest}: ${r.out}`).toBeDefined()
  return { tgz: join(dest, tgz as string), dest }
}

function unpack(tgz: string): string {
  const out = tmp('c123-unpack-')
  const r = run('tar', ['-xzf', tgz, '-C', out], out)
  expect(r.status, r.out).toBe(0)
  return join(out, 'package')
}

describe('row 14 tarball contents', () => {
  test('tarball holds only index.d.ts, schemas, package.json, README, LICENSE', () => {
    const r = run(NPM, ['pack', '--dry-run', '--json', '--no-audit', '--no-fund'], PKG_DIR)
    expect(r.status, r.out).toBe(0)
    const json = JSON.parse(r.stdout.slice(r.stdout.indexOf('['))) as { files: { path: string }[] }[]
    const paths = json[0].files.map((f) => f.path)
    expect(paths).toContain('index.d.ts')
    expect(paths).toContain('package.json')
    expect(paths.filter((p) => /\.(c|m)?js$/.test(p))).toEqual([])
    const allowed = (p: string) =>
      p === 'index.d.ts' || p === 'package.json' || /^README(\.md)?$/i.test(p) ||
      /^LICEN[CS]E(\.md|\.txt)?$/i.test(p) || /^schemas\/[\w.-]+\.json$/.test(p)
    expect(paths.filter((p) => !allowed(p))).toEqual([])

    const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')) as Record<string, any>
    expect(pkg.name).toBe(PKG_NAME)
    expect(pkg).not.toHaveProperty('dependencies')
    expect(pkg).not.toHaveProperty('main')
    expect(pkg.publishConfig?.registry).toBe('https://npm.pkg.github.com')
    expect(JSON.stringify(pkg.exports['.'])).toContain('index.d.ts')
    expect(JSON.stringify(pkg.exports['./schemas/*'])).toContain('schemas/')
  }, 120_000)
})

describe('row 15 shipped schemas', () => {
  test('packed schemas are byte-identical to docs/arch/schemas', () => {
    const { tgz } = pack()
    const dir = unpack(tgz)
    for (const f of SCHEMA_FILES) {
      const packed = readFileSync(join(dir, 'schemas', f))
      const authority = readFileSync(join(SCHEMAS_DIR, f))
      expect(packed.equals(authority), f).toBe(true)
    }
    expect(readdirSync(join(dir, 'schemas')).sort()).toEqual([...SCHEMA_FILES].sort())
  }, 120_000)
})

describe('row 16 consumer', () => {
  test('a consumer compiles against the tarball', () => {
    const { tgz } = pack()
    const proj = tmp('c123-consumer-')
    writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'consumer', version: '1.0.0', type: 'module', private: true }))
    const inst = run(NPM, ['install', tgz, '--ignore-scripts', '--no-audit', '--no-fund'], proj)
    expect(inst.status, inst.out).toBe(0)

    const variants: Record<string, object> = {
      nodenext: { module: 'nodenext', moduleResolution: 'nodenext', resolveJsonModule: true },
      bundler: { module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true },
    }
    for (const [name, opts] of Object.entries(variants)) {
      const dir = join(proj, name)
      mkdirSync(dir)
      writeFileSync(
        join(dir, 'main.ts'),
        `import type { Attempt } from '${PKG_NAME}'\n` +
          `import observed from '${PKG_NAME}/schemas/observed.schema.json' with { type: 'json' }\n` +
          `import errorSchema from '${PKG_NAME}/schemas/error.schema.json' with { type: 'json' }\n` +
          `import admitted from '${PKG_NAME}/schemas/fixture-admitted.schema.json' with { type: 'json' }\n` +
          `export const bib: Attempt['bib'] = '9'\n` +
          `export const ids: string[] = [observed.$id, errorSchema.$id, admitted.$id]\n`,
      )
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { target: 'ES2022', lib: ['ES2022'], types: [], strict: true, noEmit: true, skipLibCheck: false, ...opts },
          files: ['main.ts'],
        }),
      )
      const r = run(process.execPath, [TSC, '-p', join(dir, 'tsconfig.json')], dir)
      expect(r.out, name).toBe('')
      expect(r.status, name).toBe(0)
    }
  }, 240_000)
})

describe('row 17 installer', () => {
  test('production install ignores the package', () => {
    const dir = tmp('c123-prod-')
    // as scripts/prepare-installer-payload.js does: only these two files
    copyFileSync(join(ROOT, 'package.json'), join(dir, 'package.json'))
    copyFileSync(join(ROOT, 'package-lock.json'), join(dir, 'package-lock.json'))
    const r = run(NPM, ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], dir)
    expect(r.status, r.out).toBe(0)
    expect(existsSync(join(dir, 'node_modules', '@opencanoetiming', 'c123-contract'))).toBe(false)
    expect(existsSync(join(dir, 'node_modules', 'ajv'))).toBe(false) // devDependencies stay out too
  }, 300_000)
})

