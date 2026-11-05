// Extractor for the ts blocks of CONTRACTS.md (rows 1-2). It throws on whatever it cannot
// read, so a declaration cannot escape the drift check silently (ADR-017 R4).

// The one ts block that declares nothing: the worked example of §2.11 (illustrative
// field lines, not types). Excluded by its first line, not by being empty.
export const ILLUSTRATIVE_BLOCK_FIRST_LINE = /^\/\/ t\+0\.0s/

export type Decl = { name: string; generic: boolean; text: string }

export function extractDecls(markdown: string): { decls: Decl[]; skippedBlocks: number } {
  const lines = markdown.split('\n')
  const out: Decl[] = []
  let skippedBlocks = 0
  let fence: 'none' | 'ts' | 'other' = 'none'
  let skipBlock = false
  let firstLine = true
  let declsInBlock = 0
  let cur: string[] | null = null
  const flush = (lineNo: number) => {
    if (cur) {
      const head = /^type (\w+)(<[^=>]*>)?\s*=/.exec(cur[0])
      if (!head) throw new Error(`line ${lineNo}: cannot parse the declaration head: ${cur[0]}`)
      out.push({ name: head[1], generic: !!head[2], text: cur.join('\n') })
      declsInBlock++
    }
    cur = null
  }
  for (const [i, line] of lines.entries()) {
    const lineNo = i + 1
    if (/^\s*```/.test(line)) {
      if (!/^```(ts|json)?$/.test(line)) throw new Error(`line ${lineNo}: unsupported fence: ${line}`)
      if (fence === 'none') {
        fence = line === '```ts' ? 'ts' : 'other'
        firstLine = true
        skipBlock = false
        declsInBlock = 0
      } else {
        if (line !== '```') throw new Error(`line ${lineNo}: opening fence inside a block: ${line}`)
        if (fence === 'ts') {
          flush(lineNo)
          if (skipBlock) skippedBlocks++
          else if (declsInBlock === 0) throw new Error(`line ${lineNo}: a ts block declared no type and is not the named illustrative block`)
        }
        fence = 'none'
      }
      continue
    }
    if (fence !== 'ts') continue
    if (firstLine && line.trim() !== '') {
      firstLine = false
      if (ILLUSTRATIVE_BLOCK_FIRST_LINE.test(line)) skipBlock = true
    }
    if (skipBlock) {
      if (/^type /.test(line)) throw new Error(`line ${lineNo}: a type declaration inside the skipped block: ${line}`)
      continue
    }
    if (line.trim() === '') {
      flush(lineNo)
      continue
    }
    if (/^type /.test(line)) {
      flush(lineNo)
      cur = [line]
    } else if (cur && (/^\s/.test(line) || line.startsWith('}'))) {
      cur.push(line) // multi-line object and union declarations, trailing comments
    } else {
      throw new Error(`line ${lineNo}: unrecognised top-level line in a ts block: ${line}`)
    }
  }
  if (fence !== 'none') throw new Error('unterminated fence at end of document')
  return { decls: out, skippedBlocks }
}
