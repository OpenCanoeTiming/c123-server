/**
 * Parse-only sweep (#201, row 22): feeds every `tcp` and XML record of every recording through the ingest parsers and
 * prints stable, sorted counts. Streams the JSONL, never loads a file whole.
 *
 *   npm run sweep:parse -- <recordings .cache dir>
 *
 * The caller's context (phase dates, bound courses) is rebuilt from the parsers' own output, the way the server
 * will; it is reset per recording. Timing goes to stderr so stdout is identical between runs.
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseTcp, parseXmlSnapshot } from '../src/ingest/index.js';
import type { IngestContext, IngestElement, CourseSlot } from '../src/ingest/index.js';

const dir = process.argv[2];
if (dir === undefined || !existsSync(dir)) {
  process.stderr.write('usage: npm run sweep:parse -- <recordings .cache dir>\n');
  process.exit(2);
}

type Counter = Map<string, number>;
const bump = (c: Counter, k: string, n = 1): void => void c.set(k, (c.get(k) ?? 0) + n);
const stats = {
  byType: new Map<string, number>(), unparseable: new Map<string, number>(), unknownTypes: new Map<string, number>(), tokens: new Map<string, number>(),
  cells: new Map<string, number>(), fabricated: new Map<string, number>(), diagnostics: new Map<string, number>(), marks: new Map<string, number>(),
  elements: 0, records: 0, recordings: 0, files: 0,
};
const samples: Record<string, string[]> = { unparseable: [], unknownTypes: [], unparseableField: [], other: [] };
const sample = (k: string, s: string): void => {
  const list = samples[k];
  if (list !== undefined && list.length < 5) list.push(s);
};
const perRecording: string[] = [];

for (const rec of readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort()) {
  const recDir = join(dir, rec);
  const manifestPath = join(recDir, 'manifest.json');
  const eventDate: string | undefined = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { event?: { date?: string } }).event?.date : undefined;
  const phaseDates: Record<string, string> = {};
  const phaseCourse = new Map<string, string>();
  const courseSlots = new Map<string, CourseSlot[]>();
  const ctx: IngestContext = {
    observedAt: '', zone: 'Europe/Prague', phaseDates, courses: {}, boundCourseId: undefined, eventDate, externalIdScheme: 'sweep',
  };
  const rebuild = (): void => {
    const courses: Record<string, { courseId: string; slots: CourseSlot[] }> = {};
    for (const [phaseId, courseId] of phaseCourse) {
      const slots = courseSlots.get(courseId);
      if (slots !== undefined) courses[phaseId] = { courseId, slots };
    }
    ctx.courses = courses;
  };
  let tcp = 0;
  let xml = 0;
  stats.recordings++;
  for (const file of readdirSync(recDir).filter((f) => f.endsWith('.jsonl')).sort()) {
    stats.files++;
    let base = 0;
    const rl = createInterface({ input: createReadStream(join(recDir, file)), crlfDelay: Infinity });
    let lineNo = 0;
    for await (const line of rl) {
      lineNo++;
      if (lineNo === 1) {
        base = Date.parse((JSON.parse(line) as { _meta: { startTime: string } })._meta.startTime);
        continue;
      }
      const isXml = line.includes('"type":"XmlSnapshot"');
      if (!isXml && !line.includes('"src":"tcp"')) continue;
      const r = JSON.parse(line) as { ts: number; type: string; data: unknown };
      stats.records++;
      ctx.observedAt = new Date(base + r.ts).toISOString();
      const where = `${rec}/${file} ts=${r.ts}`;
      const text = typeof r.data === 'string' ? r.data : String(r.data);
      let els: IngestElement[];
      if (isXml) {
        xml++;
        bump(stats.byType, 'xml/XmlSnapshot');
        els = parseXmlSnapshot(text, ctx);
      } else {
        tcp++;
        bump(stats.byType, `tcp/${r.type}`);
        els = parseTcp(text, ctx);
      }
      stats.elements += els.length;
      let refresh = false;
      for (const e of els) {
        const un = e['unparseable'] as { reason: string; text: string } | undefined;
        if (un !== undefined) {
          bump(stats.unparseable, `${isXml ? 'xml' : 'tcp'}: ${un.reason}`);
          sample('unparseable', `${where} ${un.reason}: ${un.text.slice(0, 100)}`);
        }
        const unk = e['unknownType'] as { name: string } | undefined;
        if (unk !== undefined) {
          bump(stats.unknownTypes, unk.name);
          sample('unknownTypes', `${where} ${unk.name}`);
        }
        const d = e['diagnostic'] as Record<string, unknown> | undefined;
        if (d !== undefined) {
          const kind = String(d['kind']);
          bump(stats.diagnostics, kind);
          if (kind === 'unknown-format-token') bump(stats.tokens, JSON.stringify(d['token']));
          else if (kind === 'fabricated-course') bump(stats.fabricated, (d['signatures'] as string[]).join('+'));
          else if (kind === 'unparseable-cell') bump(stats.cells, `${String(d['source'])} text=${JSON.stringify(String(d['text']).trim())}`);
          else if (kind === 'unparseable-field') sample('unparseableField', `${where} ${JSON.stringify(d)}`);
          else sample('other', `${where} ${JSON.stringify(d)}`);
        }
        const snap = e['snapshot'] as { rows: { status?: string }[] } | undefined;
        if (snap !== undefined) for (const row of snap.rows) if (row.status === 'other') bump(stats.marks, 'row mark mapped to other');
        // keep the caller's context in step with what the parsers stated
        const field = e['field'];
        if (isXml && field === 'date' && typeof e['phaseId'] === 'string') phaseDates[e['phaseId']] = e['value'] as string;
        else if (isXml && field === 'courseId' && typeof e['phaseId'] === 'string' && typeof e['value'] === 'string') { phaseCourse.set(e['phaseId'], e['value']); refresh = true; }
        else if (field === 'slots' && typeof e['courseId'] === 'string' && Array.isArray(e['value'])) {
          const have = courseSlots.get(e['courseId']);
          const next = e['value'] as CourseSlot[];
          // an XML refresh carries no captions: keep TCP's when the layout is the same
          if (!(isXml && have !== undefined && have.length === next.length && have.every((s, i) => s.kind === next[i]?.kind))) courseSlots.set(e['courseId'], next);
          refresh = true;
        } else if (!isXml && typeof e['attemptId'] === 'string' && field === 'status') {
          const phaseId = e['attemptId'].slice(0, e['attemptId'].lastIndexOf(':'));
          ctx.boundCourseId = phaseCourse.get(phaseId) ?? ctx.boundCourseId;
        }
      }
      if (refresh) rebuild();
    }
  }
  perRecording.push(`  ${rec}: tcp ${tcp}, xml ${xml}`);
}

const section = (title: string, c: Counter, empty = '  none'): string[] => {
  const rows = [...c].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return [`${title}: ${rows.reduce((s, r) => s + r[1], 0)}`, ...(rows.length === 0 ? [empty] : rows.slice(0, 60).map(([k, n]) => `  ${k}: ${n}`)), ...(rows.length > 60 ? [`  ... ${rows.length - 60} more`] : [])];
};
const out: string[] = [
  `recordings: ${stats.recordings}, files: ${stats.files}, records parsed: ${stats.records}, elements: ${stats.elements}`,
  ...perRecording,
  ...section('messages by type', stats.byType),
  ...section('unparseable messages', stats.unparseable),
  ...samples['unparseable']!.map((s) => `  sample ${s}`),
  ...section('unknown types', stats.unknownTypes),
  ...samples['unknownTypes']!.map((s) => `  sample ${s}`),
  ...section('unknown format tokens', stats.tokens),
  ...section('unparseable-cell cases', stats.cells),
  ...section('fabricated-course signatures', stats.fabricated),
  ...section('diagnostics by kind', stats.diagnostics),
  ...samples['unparseableField']!.map((s) => `  sample unparseable-field ${s}`),
  ...samples['other']!.map((s) => `  sample ${s}`),
  ...section('result marks mapped to other', stats.marks),
];
process.stdout.write(out.join('\n') + '\n');
