// Rows 1-3. CONTRACTS.md is read live: the top-level `type` declarations of its ```ts
// blocks are compared, two-way, with the package's index.d.ts by tsc.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { CONTRACTS_MD, PKG_DIR, TSC } from './paths.js'

const EXPECTED_NAMES = [
  'Observed', 'SourceTag', 'UnavailableReason', 'Timestamp',
  'Organiser', 'Event', 'EventDetails', 'Class', 'AgeCategory',
  'Phase', 'PairRole', 'Stage',
  'ExternalId', 'Person', 'Entry',
  'Attempt', 'AttemptStatus', 'Outcome', 'Gate', 'Split', 'Faults', 'TimeToBeat', 'Placement',
  'Standing', 'StandingEntry', 'Anomaly',
  'SourceStatus', 'ConnState',
  'WriteRequest', 'GateCheck', 'GateFlag', 'Course',
]

// CONTRACTS §2.4 refers to `PhaseStatus` but no ```ts block declares it; §3.1's table is
// the normative text. Written out here from that table (10 closed values) so the doc
// side compiles and PhaseStatus is still compared.
const SECTION_3_1_PHASE_STATUS =
  "type PhaseStatus = 'scheduled' | 'running' | 'paused' | 'unofficial' | 'official' | 'revised' | 'protested' | 'postponed' | 'cancelled' | 'other'"

type Decl = { name: string; generic: boolean; text: string }

function extractDecls(markdown: string): Decl[] {
  const lines = markdown.split('\n')
  const out: Decl[] = []
  let inTs = false
  let cur: string[] | null = null
  const flush = () => {
    if (cur) {
      const head = /^type (\w+)(<[^=]*>)?\s*=/.exec(cur[0])
      if (head) out.push({ name: head[1], generic: !!head[2], text: cur.join('\n') })
    }
    cur = null
  }
  for (const line of lines) {
    if (!inTs) {
      if (/^```ts\s*$/.test(line)) inTs = true
      continue
    }
    if (/^```/.test(line)) {
      flush()
      inTs = false
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    if (/^type \w+/.test(line)) {
      flush()
      cur = [line]
    } else if (cur && (/^\s/.test(line) || line.startsWith('}'))) {
      cur.push(line)
    } else {
      flush()
    }
  }
  flush()
  return out
}

const tmpDirs: string[] = []
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'c123-drift-'))
  tmpDirs.push(d)
  return d
}
afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

/** Generate the comparison project and run the repo's tsc over it. */
function compare(indexDts: string, decls: Decl[]) {
  const dir = tmp()
  mkdirSync(join(dir, 'pkg'))
  writeFileSync(join(dir, 'pkg', 'index.d.ts'), indexDts)
  // The doc side is its own module: no DOM/global lib, so `Event` and `Class` are the doc's.
  const docSrc =
    decls.map((d) => `export ${d.text}`).join('\n\n') + `\n\nexport ${SECTION_3_1_PHASE_STATUS}\n`
  writeFileSync(join(dir, 'doc.ts'), docSrc)
  const names = [...decls.map((d) => ({ n: d.name, g: d.generic })), { n: 'PhaseStatus', g: false }]
  const cmp =
    `import type * as Pkg from './pkg/index'\nimport type * as Doc from './doc'\n` +
    `type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false\n` +
    `type Assert<T extends true> = T\n` +
    names
      .map(({ n, g }) => {
        const a = g ? '<unknown>' : ''
        return `export type Check_${n} = Assert<Equal<Pkg.${n}${a}, Doc.${n}${a}>>`
      })
      .join('\n') +
    '\n'
  writeFileSync(join(dir, 'compare.ts'), cmp)
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022'],
        types: [], strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: false,
      },
      files: ['compare.ts', 'doc.ts', 'pkg/index.d.ts'],
    }),
  )
  const r = spawnSync(process.execPath, [TSC, '--noEmit', '-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' })
  return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? '') }
}

const doc = () => extractDecls(readFileSync(CONTRACTS_MD, 'utf8'))
const pkgDts = () => readFileSync(join(PKG_DIR, 'index.d.ts'), 'utf8')

describe('CONTRACTS drift (rows 1-3)', () => {
  test('every type in CONTRACTS ts blocks is exported and identical', () => {
    const r = compare(pkgDts(), doc())
    expect(r.out).toBe('')
    expect(r.status).toBe(0)
  }, 120_000)

  test('extraction finds the full named list', () => {
    expect(doc().map((d) => d.name)).toEqual(EXPECTED_NAMES)
    expect(EXPECTED_NAMES).toHaveLength(32)
  })

  test('a widened field is detected', () => {
    const src = pkgDts()
    const at = src.search(/type\s+Attempt\s*=/)
    expect(at, 'index.d.ts must declare type Attempt').toBeGreaterThanOrEqual(0)

    const tail = src.slice(at)
    const widenRe = /(\bstatus\s*:\s*)Observed<AttemptStatus>/
    expect(widenRe.test(tail), 'Attempt.status: Observed<AttemptStatus> not found in index.d.ts').toBe(true)
    const widened = src.slice(0, at) + tail.replace(widenRe, '$1Observed<string>')
    const w = compare(widened, doc())
    expect(w.status).not.toBe(0)
    expect(w.out).toMatch(/TS2344/)

    const removeRe = /^[ \t]*underReview\s*:.*$/m
    expect(removeRe.test(tail), 'Attempt.underReview field not found in index.d.ts').toBe(true)
    const removed = src.slice(0, at) + tail.replace(removeRe, '')
    const m = compare(removed, doc())
    expect(m.status).not.toBe(0)
    expect(m.out).toMatch(/TS2344/)
  }, 120_000)
})

