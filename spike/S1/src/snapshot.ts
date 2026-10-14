// The XML snapshot (DERIVATIONS §0.3 read validation; §1–§4 XML derivations). XML times are integer
// milliseconds and penalties integer seconds (§0.1): a parser written from the TCP mapping is off by ×1000.
import { child, col, parseXml, XmlError, type XNode } from './xml.js';

export type XmlTables = {
  event: Record<string, string>;
  participants: Record<string, string>[];
  classes: { row: Record<string, string>; categories: Record<string, string>[] }[];
  schedule: Record<string, string>[];
  results: Record<string, string>[];
  courses: Record<string, string>[];
};

export type ReadResult = { ok: true; tables: XmlTables } | { ok: false; reason: string };

function flat(row: XNode): Record<string, string> {
  const o: Record<string, string> = {};
  for (const c of row.children) if (c.children.length === 0) o[c.name] = c.text;
  return o;
}

/** §0.3: validate every read (well-formed, root closing tag present). The replay cannot retry; it skips. */
export function readSnapshot(text: string): ReadResult {
  if (!/<\/Canoe123Data>\s*$/.test(text)) return { ok: false, reason: 'root closing tag missing' };
  let root: XNode;
  try { root = parseXml(text); } catch (e) { return { ok: false, reason: e instanceof XmlError ? e.message : String(e) }; }
  if (root.name !== 'Canoe123Data') return { ok: false, reason: `unexpected root ${root.name}` };
  const t: XmlTables = { event: {}, participants: [], classes: [], schedule: [], results: [], courses: [] };
  for (const r of root.children) {
    switch (r.name) {
      case 'Events': t.event = flat(r); break;
      case 'Participants': t.participants.push(flat(r)); break;
      case 'Classes': t.classes.push({ row: flat(r), categories: r.children.filter((c) => c.name === 'Categories').map(flat) }); break;
      case 'Schedule': t.schedule.push(flat(r)); break;
      case 'Results': t.results.push(flat(r)); break;
      case 'CourseData': t.courses.push(flat(r)); break;
    }
  }
  void child; void col;
  return { ok: true, tables: t };
}

/** "" or absent → undefined (DERIVATIONS §0.1: an empty attribute is absent, never zero). */
export function int(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const s = v.trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
