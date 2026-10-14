// Minimal strict XML reader for Canoe123 TCP messages and the XML snapshot. Whitespace in text is kept
// verbatim (fixed-width Gates, padded Bib); entities are decoded. Throws XmlError on malformed input.

export type XNode = { name: string; attrs: Record<string, string>; children: XNode[]; text: string };

export class XmlError extends Error {}

const ENT: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

export function decode(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e]!);
}

const ATTR = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

export function parseXml(src: string): XNode {
  const root: XNode = { name: '#document', attrs: {}, children: [], text: '' };
  const stack: XNode[] = [root];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) { stack[stack.length - 1]!.text += decode(src.slice(i)); break; }
    if (lt > i) stack[stack.length - 1]!.text += decode(src.slice(i, lt));
    if (src.startsWith('<?', lt)) { const e = src.indexOf('?>', lt); if (e < 0) throw new XmlError('unterminated declaration'); i = e + 2; continue; }
    if (src.startsWith('<!--', lt)) { const e = src.indexOf('-->', lt); if (e < 0) throw new XmlError('unterminated comment'); i = e + 3; continue; }
    if (src.startsWith('<![CDATA[', lt)) { const e = src.indexOf(']]>', lt); if (e < 0) throw new XmlError('unterminated CDATA'); stack[stack.length - 1]!.text += src.slice(lt + 9, e); i = e + 3; continue; }
    const gt = findTagEnd(src, lt);
    if (gt < 0) throw new XmlError(`unterminated tag at ${lt}`);
    const body = src.slice(lt + 1, gt);
    if (body[0] === '/') {
      const name = body.slice(1).trim();
      const top = stack.pop();
      if (!top || top.name !== name || stack.length === 0) throw new XmlError(`mismatched </${name}> (open: ${top?.name})`);
      i = gt + 1;
      continue;
    }
    const selfClose = body.endsWith('/');
    const inner = selfClose ? body.slice(0, -1) : body;
    const m = /^([A-Za-z_][\w:.-]*)/.exec(inner);
    if (!m) throw new XmlError(`bad tag at ${lt}`);
    const node: XNode = { name: m[1]!, attrs: {}, children: [], text: '' };
    ATTR.lastIndex = m[1]!.length;
    let a: RegExpExecArray | null;
    while ((a = ATTR.exec(inner))) node.attrs[a[1]!] = decode(a[3] ?? a[4] ?? '');
    stack[stack.length - 1]!.children.push(node);
    if (!selfClose) stack.push(node);
    i = gt + 1;
  }
  if (stack.length !== 1) throw new XmlError(`unclosed <${stack[stack.length - 1]!.name}>`);
  const els = root.children;
  if (els.length !== 1) throw new XmlError(`expected one root element, got ${els.length}`);
  return els[0]!;
}

function findTagEnd(src: string, from: number): number {
  let q: string | null = null;
  for (let i = from + 1; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '>') return i;
  }
  return -1;
}

export function child(n: XNode, name: string): XNode | undefined {
  return n.children.find((c) => c.name === name);
}

/** Text of a column element of a DataSet row; undefined when the element is absent. */
export function col(row: XNode, name: string): string | undefined {
  const c = child(row, name);
  return c ? c.text : undefined;
}
