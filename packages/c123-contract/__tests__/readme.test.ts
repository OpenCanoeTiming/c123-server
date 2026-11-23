// The README is what a client reads before pinning the package (issue #434, "Installing from the registry").
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { PKG_DIR, SCHEMA_FILES } from './paths.js'

const readme = readFileSync(join(PKG_DIR, 'README.md'), 'utf8')

describe('README install section', () => {
  test('tells a client how to reach the registry', () => {
    expect(readme).toMatch(/^## Install$/m)
    expect(readme).toContain('@opencanoetiming:registry=https://npm.pkg.github.com')
    expect(readme).toContain('NODE_AUTH_TOKEN')
    expect(readme).toContain('read:packages')
  })

  test('names every shipped schema', () => {
    for (const f of SCHEMA_FILES) expect(readme, f).toContain(f)
  })
})
