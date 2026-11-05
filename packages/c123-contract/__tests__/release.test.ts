// Row 18. Release wiring for the contract package (issue #199 "Release").
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { ROOT } from './paths.js'

const PKG_PATH = 'packages/c123-contract'
const OUTPUT = `${PKG_PATH}--release_created`
const json = (f: string) => JSON.parse(readFileSync(join(ROOT, f), 'utf8')) as Record<string, any>

/** Split the `jobs:` mapping of a workflow into { jobId: body text } without a YAML parser. */
function jobs(yml: string): Record<string, string> {
  const lines = yml.split('\n')
  const start = lines.findIndex((l) => /^jobs:\s*$/.test(l))
  expect(start, 'workflow has a jobs: block').toBeGreaterThanOrEqual(0)
  const out: Record<string, string[]> = {}
  let cur: string | null = null
  for (const l of lines.slice(start + 1)) {
    if (/^\S/.test(l) && l.trim() !== '') break
    const m = /^ {2}([\w-]+):\s*$/.exec(l)
    if (m) {
      cur = m[1]
      out[cur] = []
    } else if (cur) out[cur].push(l)
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n')]))
}

describe('release wiring (row 18)', () => {
  test('release-please knows the package', () => {
    const cfg = json('release-please-config.json')
    const pkg = cfg.packages[PKG_PATH]
    expect(pkg, `packages["${PKG_PATH}"]`).toBeDefined()
    expect(pkg['release-type']).toBe('node')
    expect(pkg.component).toBe('c123-contract')
    expect(pkg['package-name']).toBe('@opencanoetiming/c123-contract')
    expect(pkg['bump-minor-pre-major']).toBe(true)
    // tag with component, so the contract and the server do not collide
    expect(pkg['include-component-in-tag']).not.toBe(false)

    expect(cfg['separate-pull-requests']).toBe(true)

    const root = cfg.packages['.']
    expect(root['exclude-paths'] ?? []).toContain(PKG_PATH)
    expect(root['include-component-in-tag']).toBe(false) // server tags stay vX.Y.Z

    const manifest = json('.release-please-manifest.json')
    expect(manifest).toHaveProperty(['.'])
    expect(manifest[PKG_PATH], 'manifest entry').toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('publish job is gated on the package', () => {
    const yml = readFileSync(join(ROOT, '.github/workflows/release-please.yml'), 'utf8')
    const all = jobs(yml)

    // release-please job exposes the package's output
    expect(all['release-please'], 'release-please job').toContain(OUTPUT)

    const publishers = Object.entries(all).filter(([, body]) => /npm publish/.test(body))
    expect(publishers.length, 'a job that runs npm publish').toBeGreaterThanOrEqual(1)
    const [id, body] = publishers.find(([, b]) => b.includes(OUTPUT)) ?? []
    expect(id, `a publishing job gated on ${OUTPUT}`).toBeDefined()
    const body_ = body as string

    const ifLine = body_.split('\n').find((l) => /^ {4}if:/.test(l)) ?? ''
    expect(ifLine).toContain(OUTPUT)
    expect(ifLine).toContain("'true'")
    expect(body_).toMatch(/needs:.*release-please/s)
    // npm publish runs in the package directory
    expect(body_).toMatch(
      new RegExp(`(working-directory:\\s*${PKG_PATH}|cd\\s+${PKG_PATH}|npm publish[^\\n]*(-w|--workspace)[ =]${PKG_PATH})`),
    )
    // and publishes to GitHub Packages with the job token
    expect(body_).toContain('https://npm.pkg.github.com')
    expect(body_).toMatch(/packages:\s*write/)
  })
})
