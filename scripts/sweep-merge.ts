/**
 * Whole-recording sweep of the merge core (#203, row 14): every `tcp` and XML record of every recording through the parsers and
 * `createMergeCore`, one unit at a time. Prints, per recording, Attempts, generations, retractions, contradictions, refusals,
 * leaves, messages and diagnostics by kind, Standings by scope and by cause (what changed since the key's last push, CONTRACTS §5 step 1),
 * anomalies by kind, with samples; stops on the first exception (exit 1).
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
import type { IngestElement } from '../src/ingest/index.js';
import { createContextTracker } from './lib/ingest-context.js';
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

type Pushed = { standingKey: string; scope: { kind: string }; entries: Record<string, unknown>[]; anomalies: { kind: string }[] };
const CAUSED_BY = ['rank', 'order', 'result', 'pairTotalSeconds', 'behindSeconds', 'provisional', 'underReview', 'decidedIn'] as const;
/** What differs between a Standing and the one last pushed under its key: the causes of §5 step 1, `first` when there is none. */
function causes(prev: Pushed | undefined, now: Pushed): string[] {
  if (prev === undefined) return ['first publication'];
  const found = new Set<string>();
  const before = new Map(prev.entries.map((e) => [String(e['entryId']), e]));
  if (before.size !== now.entries.length || now.entries.some((e) => !before.has(String(e['entryId'])))) found.add('entries added or removed');
  for (const e of now.entries) {
    const was = before.get(String(e['entryId']));
    if (was !== undefined) for (const f of CAUSED_BY) if (JSON.stringify(was[f]) !== JSON.stringify(e[f])) found.add(f);
  }
  if (JSON.stringify(prev.anomalies) !== JSON.stringify(now.anomalies)) found.add('anomalies');
  if (found.size === 0) found.add('entry sequence');
  return [...found];
}


for (const rec of readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory() && (only === undefined || d.includes(only))).sort()) {
  const started = process.hrtime.bigint();
  const recDir = join(dir, rec);
  const manifestPath = join(recDir, 'manifest.json');
  const eventDate: string | undefined = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { event?: { date?: string } }).event?.date : undefined;
  const { ctx, learn } = createContextTracker(ZONE, eventDate, 'sweep');

  const core = createMergeCore({ zone: ZONE });
  const messages: Counter = new Map();
  const raised: Counter = new Map();
  const ingestOnly: Counter = new Map();
  const live = new Set<string>();
  const lastPushed = new Map<string, Pushed>();
  const byScope: Counter = new Map();
  const byCause: Counter = new Map();
  const anomalies: Counter = new Map(); // by kind and standingKey while running; by kind and scope at the end
  const categories: Counter = new Map();
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
      if (m.type === 'standing.updated') {
        const st = m['standing'] as Pushed;
        bump(byScope, st.scope.kind);
        if (!st.standingKey.endsWith('/all')) bump(categories, st.scope.kind);
        for (const c of causes(lastPushed.get(st.standingKey), st)) bump(byCause, c);
        const had = new Set((lastPushed.get(st.standingKey)?.anomalies ?? []).map((a) => JSON.stringify(a)));
        for (const a of st.anomalies) if (!had.has(JSON.stringify(a))) {
          bump(anomalies, `${a.kind} ${st.standingKey}`);
          sample(`anomaly ${a.kind}`, `${where} ${st.standingKey} ${JSON.stringify(a)}`);
        }
        lastPushed.set(st.standingKey, st);
      } else if (m.type === 'scope.replaced') for (const st of m['standings'] as Pushed[]) lastPushed.set(st.standingKey, st);
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
      for (const e of els) {
        const d = e['diagnostic'] as { kind: string } | undefined;
        if (d !== undefined && d.kind !== 'unparseable-cell' && d.kind !== 'member-sum-mismatch') bump(ingestOnly, d.kind);
      }
      learn(els, isXml);
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
  out.push(`  standings pushed by scope: ${sorted(byScope)}`);
  out.push(`  standings pushed by cause: ${sorted(byCause)}`);
  const seconds = new Set([...lastPushed.keys()].filter((k) => k.startsWith('pair:')).map((k) => k.slice(5, k.indexOf('/'))));
  const anomalyScopes: Counter = new Map();
  for (const [k, n] of anomalies) {
    const [kind, key = ''] = k.split(' ');
    const scope = key.slice(0, key.indexOf(':'));
    bump(anomalyScopes, `${kind} in ${scope === 'phase' && seconds.has(key.slice(6, key.indexOf('/'))) ? 'phase of a second run' : scope}${key.endsWith('/all') ? '' : ' (age category)'}`, n);
  }
  out.push(`  standings pushed for an age category, by scope: ${sorted(categories)}`);
  out.push(`  anomalies raised, by kind and scope: ${sorted(anomalyScopes)}`);
  for (const [k, list] of [...samples].sort((a, b) => (a[0] < b[0] ? -1 : 1))) for (const s of list) out.push(`    ${k}: ${s}`);
  process.stderr.write(`${rec}: ${(Number(process.hrtime.bigint() - started) / 1e9).toFixed(1)} s\n`);
}
process.stdout.write(out.join('\n') + '\n');

