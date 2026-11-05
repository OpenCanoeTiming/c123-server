// Rows 1-3. CONTRACTS.md is read live: the top-level `type` declarations of its ```ts
// blocks are compared, two-way, with the package's index.d.ts by tsc.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { CONTRACTS_MD, PKG_DIR, TSC } from './paths.js'

const EXPECTED_NAMES = [
  'Observed',
  'SourceTag',
  'UnavailableReason',
  'Timestamp',
  'ErrorCode',
  'WriteNotPossibleReason',
  'SourceUnavailableReason',
  'ErrorEnvelope',
  'Organiser',
  'Event',
  'EventDetails',
  'Class',
  'AgeCategory',
  'Phase',
  'PairRole',
  'Stage',
  'ExternalId',
  'Person',
  'Entry',
  'Attempt',
  'AttemptStatus',
  'ResultMark',
  'Outcome',
  'Gate',
  'Split',
  'Faults',
  'TimeToBeat',
  'Placement',
  'Standing',
  'StandingEntry',
  'Anomaly',
  'SourceStatus',
  'ConnState',
  'WriteRequest',
  'GateCheck',
  'GateFlag',
  'Course',
  'PhaseStatus',
  'Diagnostic',
  'OnsitePerson',
  'OnsiteEntry',
  'OnsiteEvent',
  'EventCurrentResponse',
  'ClassPhasesResponse',
  'ClassEntriesResponse',
  'PhaseAttemptsResponse',
  'ClassStandingsResponse',
  'OnCourseResponse',
  'PhaseChecksResponse',
  'SourcesResponse',
  'DiagnosticsResponse',
  'RebaselineScope',
  'RebaselineRequest',
  'RebaselineResponse',
  'WsMessage',
  'WsPayload',
  'PenaltyWriteRequest',
  'GateCheckRequest',
  'GateFlagCreateRequest',
  'FlagResolutionRequest',
  'LivePhase',
  'ClassPut',
  'CoursePut',
  'PhasePut',
  'EntryPutMember',
  'EntryPut',
  'AttemptPut',
  'ClassificationRow',
  'ClassificationPut',
  'OnCoursePut',
  'PhaseAttemptsPut',
  'ClassPutResponse',
  'CoursePutResponse',
  'PhasePutResponse',
  'EntryPutResponse',
  'AttemptPutResponse',
  'ClassificationPutResponse',
  'OnCoursePutResponse',
  'PhaseAttemptsPutResponse',
  'PublicEventsQuery',
  'PublicEventSummary',
  'PublicEventsResponse',
  'PublicEventResponse',
  'PublicPerson',
  'PublicEntry',
  'PublicEntriesResponse',
  'PublicStanding',
  'PublicStandingsResponse',
  'PublicAttemptsResponse',
  'PublicOnCourseResponse',
  'PublicHeartbeat',
  'PublicStreamMessage',
]

// The one ts block that declares nothing: the worked example of §2.11 (illustrative
// field lines, not types). Excluded by its first line, not by being empty.
const ILLUSTRATIVE_BLOCK_FIRST_LINE = /^\/\/ t\+0\.0s/

type Decl = { name: string; generic: boolean; text: string }

function extractDecls(markdown: string): { decls: Decl[]; skippedBlocks: number } {
  const lines = markdown.split('\n')
  const out: Decl[] = []
  let skippedBlocks = 0
  let inTs = false
  let skipBlock = false
  let firstLine = true
  let declsInBlock = 0
  let cur: string[] | null = null
  const flush = () => {
    if (cur) {
      const head = /^type (\w+)(<[^=]*>)?\s*=/.exec(cur[0])
      if (head) {
        out.push({ name: head[1], generic: !!head[2], text: cur.join('\n') })
        declsInBlock++
      }
    }
    cur = null
  }
  for (const line of lines) {
    if (!inTs) {
      if (/^```ts\s*$/.test(line)) {
        inTs = true
        firstLine = true
        skipBlock = false
        declsInBlock = 0
      }
      continue
    }
    if (/^```/.test(line)) {
      flush()
      inTs = false
      if (skipBlock) skippedBlocks++
      else if (declsInBlock === 0) throw new Error('a ts block declared no type and is not the named illustrative block')
      continue
    }
    if (firstLine && line.trim() !== '') {
      firstLine = false
      if (ILLUSTRATIVE_BLOCK_FIRST_LINE.test(line)) skipBlock = true
    }
    if (skipBlock) continue
    if (line.trim() === '') {
      flush()
      continue
    }
    if (/^type \w+/.test(line)) {
      flush()
      cur = [line]
    } else if (cur && (/^\s/.test(line) || line.startsWith('}'))) {
      cur.push(line) // multi-line object and union declarations, trailing comments
    } else {
      throw new Error(`unrecognised top-level line in a ts block: ${line}`)
    }
  }
  return { decls: out, skippedBlocks }
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
  const docSrc = decls.map((d) => `export ${d.text}`).join('\n\n') + '\n'
  writeFileSync(join(dir, 'doc.ts'), docSrc)
  const names = decls.map((d) => ({ n: d.name, g: d.generic }))
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

const doc = () => extractDecls(readFileSync(CONTRACTS_MD, 'utf8')).decls
const pkgDts = () => readFileSync(join(PKG_DIR, 'index.d.ts'), 'utf8')

describe('CONTRACTS drift (rows 1-3)', () => {
  test('every type in CONTRACTS ts blocks is exported and identical', () => {
    const r = compare(pkgDts(), doc())
    expect(r.out).toBe('')
    expect(r.status).toBe(0)
  }, 120_000)

  test('extraction finds the full named list', () => {
    const { decls, skippedBlocks } = extractDecls(readFileSync(CONTRACTS_MD, 'utf8'))
    expect(decls.map((d) => d.name)).toEqual(EXPECTED_NAMES)
    expect(EXPECTED_NAMES).toHaveLength(92)
    expect(new Set(EXPECTED_NAMES).size).toBe(92)
    expect(skippedBlocks).toBe(1)
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

