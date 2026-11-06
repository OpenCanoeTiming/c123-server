/**
 * Whole-recording sweep of the merge core (#203, row 14): every `tcp` and XML record of every recording through the parsers and
 * `createMergeCore`, one unit at a time. Prints, per recording, Attempts, generations, retractions, contradictions, refusals,
 * leaves, messages and diagnostics by kind, with samples; stops on the first exception (exit 1).
 *
 *   npm run sweep:merge -- <recordings .cache dir> [recording name filter]
 *
 * As in `sweep:parse`, the parser context is rebuilt from the parsers' own output, per recording. The recordings hold no connection
 * records (TEST-ARCHITECTURE §9): one `tcp-connected` precedes the first TCP record. The reader's `changedAfter` is the previous poll
 * (`observedAt` - 5 s, the recorder's interval) and `null` for a recording's first snapshot; a snapshot whose text repeats the previous
 * one is a poll that saw no change, and is not delivered. Timing goes to stderr so stdout is identical between runs.
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseTcp, parseXmlSnapshot } from '../src/ingest/index.js';
import type { IngestContext, IngestElement, CourseSlot } from '../src/ingest/index.js';
import { createMergeCore } from '../src/core/index.js';

const POLL_MS = 5000;
const SAMPLES = 8;
const ZONE = 'Europe/Prague';
const dir = process.argv[2];
const only = process.argv[3];
if (dir === undefined || !existsSync(dir)) {
  process.stderr.write('usage: npm run sweep:merge -- <recordings .cache dir> [recording name filter]\n');
  process.exit(2);
}

type Counter = Map<string, number>;
const bump = (c: Counter, k: string, n = 1): void => void c.set(k, (c.get(k) ?? 0) + n);
const sorted = (c: Counter): string => [...c].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([k, n]) => `${k} ${n}`).join(', ') || 'none';
const out: string[] = [];


for (const rec of readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory() && (only === undefined || d.includes(only))).sort()) {
  const started = process.hrtime.bigint();
  const recDir = join(dir, rec);
  const manifestPath = join(recDir, 'manifest.json');
  const eventDate: string | undefined = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { event?: { date?: string } }).event?.date : undefined;
  const phaseDates: Record<string, string> = {};
  const phaseCourse = new Map<string, string>();
  const courseSlots = new Map<string, CourseSlot[]>();
  const ctx: IngestContext = { observedAt: '', zone: ZONE, phaseDates, courses: {}, boundCourseId: undefined, eventDate, externalIdScheme: 'sweep' };
  const rebuild = (): void => {
    const courses: Record<string, { courseId: string; slots: CourseSlot[] }> = {};
    for (const [phaseId, courseId] of phaseCourse) {
      const slots = courseSlots.get(courseId);
      if (slots !== undefined) courses[phaseId] = { courseId, slots };
    }
    ctx.courses = courses;
  };

  const core = createMergeCore({ zone: ZONE });
  const messages: Counter = new Map();
  const raised: Counter = new Map();
  const ingestOnly: Counter = new Map();
  const live = new Set<string>();
  const samples = new Map<string, string[]>();
  const sample = (k: string, s: string): void => {
    const list = samples.get(k) ?? [];
    if (list.length < SAMPLES) list.push(s);
    samples.set(k, list);
  };
  let tcp = 0;
  let xml = 0;
  let skippedXml = 0;
  let lastXml: string | undefined;
  let peakListed = 0;
  let before = { ...core.counters(), refusals: { ...core.counters().refusals } };

  const apply = (unit: IngestElement[], where: string): void => {
    try {
      core.applyUnit(unit);
    } catch (e) {
      process.stderr.write(`EXCEPTION ${where}: ${e instanceof Error ? e.stack : String(e)}\n`);
      process.exit(1);
    }
    const after = core.counters();
    const sent = core.drainNotifications();
    for (const m of sent) {
      bump(messages, m.type);
      if (m.type === 'diagnostics.updated') {
        const now = new Set((m['diagnostics'] as Record<string, unknown>[]).map((d) => JSON.stringify(d)));
        for (const k of now) {
          if (live.has(k)) continue;
          const d = JSON.parse(k) as { kind: string };
          bump(raised, d.kind);
          sample(`diagnostic ${d.kind}`, `${where} ${k}`);
        }
        live.clear();
        for (const k of now) live.add(k);
      }
    }
    const touched = (want: (f: Record<string, { state?: string; value?: unknown }>) => boolean): string =>
      sent.filter((m) => m.type === 'attempt.updated' && want(m['fields'] as Record<string, { state?: string; value?: unknown }>)).map((m) => String(m['attemptId'])).slice(0, 4).join(' ');
    if (after.retractions !== before.retractions) sample('retraction', `${where} +${after.retractions - before.retractions} ${touched((f) => f['outcome']?.state === 'not-yet' || f['placement']?.state === 'not-yet')}`);
    if (after.generations !== before.generations) sample('generation', `${where} ${touched((f) => (f['run']?.value as number | undefined) !== undefined && (f['run']?.value as number) > 1)}`);
    if (after.contradictions !== before.contradictions) sample('contradiction', `${where} ${touched((f) => f['placement']?.state === 'not-yet' || f['status']?.value === 'on-course')}`);
    for (const [k, n] of Object.entries(after.refusals)) if (n !== (before.refusals[k] ?? 0)) sample(`refusal ${k}`, `${where} +${n - (before.refusals[k] ?? 0)}`);
    peakListed = Math.max(peakListed, core.oncourse().attemptIds.length);
    before = { ...after, refusals: { ...after.refusals } };
  };

  for (const file of readdirSync(recDir).filter((f) => f.endsWith('.jsonl')).sort()) {
    let base = 0;
    let lineNo = 0;
    for await (const line of createInterface({ input: createReadStream(join(recDir, file)), crlfDelay: Infinity })) {
      lineNo++;
      if (lineNo === 1) {
        base = Date.parse((JSON.parse(line) as { _meta: { startTime: string } })._meta.startTime);
        continue;
      }
      const isXml = line.includes('"type":"XmlSnapshot"');
      if (!isXml && !line.includes('"src":"tcp"')) continue;
      const r = JSON.parse(line) as { ts: number; type: string; data: unknown };
      ctx.observedAt = new Date(base + r.ts).toISOString();
      const where = `${file.slice(0, 3)}:${r.ts} ${ctx.observedAt.slice(11, 23)}`;
      const text = typeof r.data === 'string' ? r.data : String(r.data);
      let els: IngestElement[];
      if (isXml) {
        if (text === lastXml) {
          skippedXml++;
          continue;
        }
        els = parseXmlSnapshot(text, ctx);
        if (els.some((e) => 'unparseable' in e)) continue; // a torn read: the reader retries, nothing is delivered
        const changedAfter = lastXml === undefined ? null : new Date(base + r.ts - POLL_MS).toISOString();
        lastXml = text;
        xml++;
        apply([{ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: ctx.observedAt, changedAfter }, ...els], where);
      } else {
        if (tcp === 0) apply([{ ingestSeq: 0, event: 'tcp-connected', observedAt: ctx.observedAt }], where);
        tcp++;
        els = parseTcp(text, ctx);
        apply(els, where);
      }
      let refresh = false;
      for (const e of els) {
        const d = e['diagnostic'] as { kind: string } | undefined;
        if (d !== undefined && d.kind !== 'unparseable-cell' && d.kind !== 'member-sum-mismatch') bump(ingestOnly, d.kind);
        const field = e['field'];
        if (isXml && field === 'date' && typeof e['phaseId'] === 'string') phaseDates[e['phaseId']] = e['value'] as string;
        else if (isXml && field === 'courseId' && typeof e['phaseId'] === 'string' && typeof e['value'] === 'string') { phaseCourse.set(e['phaseId'], e['value']); refresh = true; }
        else if (field === 'slots' && typeof e['courseId'] === 'string' && Array.isArray(e['value'])) {
          const have = courseSlots.get(e['courseId']);
          const next = e['value'] as CourseSlot[];
          const sameLayout = have !== undefined && have.length === next.length && have.every((s, i) => s.kind === next[i]?.kind);
          // XML carries no captions: keep TCP's. TCP refreshes captions only: its RaceConfig names no course, and with two races
          // alternating it describes the other one (jarni-so-odp 14:43-14:46, DERIVATIONS §2.3 "the currently running Phase")
          if (isXml ? !sameLayout : sameLayout || have === undefined) courseSlots.set(e['courseId'], next);
          refresh = true;
        } else if (!isXml && typeof e['attemptId'] === 'string' && field === 'status') {
          const phaseId = e['attemptId'].slice(0, e['attemptId'].lastIndexOf(':'));
          ctx.boundCourseId = phaseCourse.get(phaseId) ?? ctx.boundCourseId;
        }
      }
      if (refresh) rebuild();
    }
  }

  const c = core.counters();
  const standing: Counter = new Map();
  for (const d of core.diagnostics()) bump(standing, d.kind);
  out.push(`${rec}: tcp ${tcp}, xml delivered ${xml} (repeats not delivered ${skippedXml})`);
  out.push(`  attempts ${core.attempts().length}, generations ${c.generations}, retractions ${c.retractions}, contradictions ${c.contradictions}, leaves ${c.leaves}, peak on-course ${peakListed}, listed at end ${core.oncourse().attemptIds.length}`);
  out.push(`  refusals: ${sorted(new Map(Object.entries(c.refusals)))}`);
  out.push(`  diagnostics raised: ${sorted(raised)}`);
  out.push(`  diagnostics standing at end: ${sorted(standing)}`);
  out.push(`  ingest-only (admin log): ${sorted(ingestOnly)}`);
  out.push(`  messages: ${sorted(messages)}`);
  for (const [k, list] of [...samples].sort((a, b) => (a[0] < b[0] ? -1 : 1))) for (const s of list) out.push(`    ${k}: ${s}`);
  process.stderr.write(`${rec}: ${(Number(process.hrtime.bigint() - started) / 1e9).toFixed(1)} s\n`);
}
process.stdout.write(out.join('\n') + '\n');

