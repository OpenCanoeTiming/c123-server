// Rows 1-3. CONTRACTS.md is read live: the top-level `type` declarations of its ```ts
// blocks are compared, two-way, with the package's index.d.ts by tsc.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { type Decl, extractDecls } from './extract.js'
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


// ---------------------------------------------------------------- row 2: the extractor fails loudly (review O2)
describe('extractor throws on what it cannot read (row 2)', () => {
  const md = (body: string) => '# t\n\n```ts\ntype A = string\n```\n\n' + body
  const ts = (inner: string) => md('```ts\n' + inner + '\n```\n')

  test('D1 generic default beside other declarations throws', () => {
    expect(() => extractDecls(ts('type NewOne<T = string> = { a: T }\ntype B = string'))).toThrow(/declaration head/)
  })
  test('D2 "=" on the next line throws', () => {
    expect(() => extractDecls(ts('type NewTwo\n  = string'))).toThrow(/declaration head/)
  })
  test('D3 a ```typescript fence throws', () => {
    expect(() => extractDecls(md('```typescript\ntype X = string\n```\n'))).toThrow(/fence/)
  })
  test('D4 an info string after ts throws', () => {
    expect(() => extractDecls(md('```ts title="x"\ntype X = string\n```\n'))).toThrow(/fence/)
  })
  test('D5 an indented fence throws', () => {
    expect(() => extractDecls(md('- item\n\n   ```ts\n   type X = string\n   ```\n'))).toThrow(/fence/)
  })
  test('D8 a type line inside the skipped illustrative block throws', () => {
    expect(() => extractDecls(md('```ts\n// t+0.0s example\noutcome: { }\ntype NewEight = string\n```\n'))).toThrow(/skipped block/)
  })
  test('D6 a plain new type is extracted (and so missing from the name list)', () => {
    const { decls } = extractDecls(ts('type NewSix = string'))
    expect(decls.map((d) => d.name)).toEqual(['A', 'NewSix'])
  })
  test('D7 an interface in a ts block throws', () => {
    expect(() => extractDecls(ts('interface NewSeven { a: string }'))).toThrow(/unrecognised top-level line/)
  })
  test('D9 D1\'s form alone in its block throws', () => {
    expect(() => extractDecls(md('```ts\ntype NewNine<T = string> = { a: T }\n```\n'))).toThrow()
  })
  test('the illustrative block, json and bare fences are accepted', () => {
    const { decls, skippedBlocks } = extractDecls(
      ts('type B = {\n  a: 1\n}   // c\n\ntype C =\n  | 1\n  | 2') +
        '```json\n{ "a": 1 }\n```\n\n```\nplain\n```\n\n```ts\n// t+0.0s example\noutcome: {}\n```\n',
    )
    expect(decls.map((d) => d.name)).toEqual(['A', 'B', 'C'])
    expect(skippedBlocks).toBe(1)
  })
})

describe('index.d.ts exports nothing else (ARCHITECTURE §3)', () => {
  test('the exported names are exactly the extracted declarations', () => {
    const names = [...pkgDts().matchAll(/^export\s+(?:declare\s+)?(?:type|interface|const|let|var|function|class|enum|namespace)\s+(\w+)/gm)].map((m) => m[1])
    expect(names).toEqual(EXPECTED_NAMES)
    expect(pkgDts()).not.toMatch(/^export\s+(?:default|\*|\{)/m)
    expect(pkgDts()).not.toMatch(/^(?!export\b)(?:declare\s+)?(?:const|let|var|function|class|enum)\b/m)
  })
})
