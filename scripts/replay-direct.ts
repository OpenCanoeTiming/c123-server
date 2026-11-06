/**
 * Direct-injection ingest path (#242, TEST-ARCHITECTURE §3.2): a recording's tcp and XML records, in recorded order, through the
 * production `parseTcp`, `parseXmlSnapshot` and `createMergeCore`, one element per step, and the step log the gate-2 checker reads.
 *
 *   npm run replay:direct -- --recording <dir> [--from <iso>] [--to <iso>] [--events <file>] --out <file>
 *
 * Step log: `{"hydration":{"asOfSeq":0,"state":{...empty...}}}`, then `{i,element,deltas,stateHash}` per element, then
 * `{"end":{"steps":n}}`. `deltas` are the §7.2 messages the core notified for that element alone (applied as a unit of one).
 * `stateHash` is an order-independent digest of the presented state (every Attempt and Entry a delta has touched, each Standing,
 * the on-course list, the diagnostics, the writes), updated from what each step touched; keys are sorted before hashing.
 *
 * Determinism (CONTRACTS §4): time is the recording's alone (chunk `startTime` + record `ts`); no clock is read. Inputs the recordings
 * lack (TEST-ARCHITECTURE §9): one `tcp-connected` at the first TCP record, unless `--events` states its own. `--events` is a JSON
 * array of `{ event, observedAt, scope?, changedAfter? }` (tcp-connected, tcp-disconnected, rebaseline), merged by `observedAt`,
 * before a record of the same instant, those inside the window only. An XML snapshot whose text repeats the previous one is a poll
 * that saw no change and is not delivered; a delivered one follows an `xml-rewrite-detected` whose `changedAfter` is null for the
 * first snapshot, else the previous poll (`observedAt` minus the recorder's 5 s). `--from`/`--to` are inclusive; what precedes
 * `--from` is not replayed and the hydration is the empty state. The recording is streamed: memory does not grow with its length.
 */
import { closeSync, createReadStream, existsSync, openSync, readFileSync, readdirSync, statSync, writeSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseTcp, parseXmlSnapshot } from '../src/ingest/index.js';
import type { IngestElement } from '../src/ingest/index.js';
import { createMergeCore } from '../src/core/index.js';
import { createContextTracker } from './lib/ingest-context.js';

const POLL_MS = 5000;
const ZONE = 'Europe/Prague';
const USAGE = 'usage: npm run replay:direct -- --recording <dir> [--from <iso>] [--to <iso>] [--events <file>] --out <file>\n';
const fail = (msg: string, code = 2): never => {
  process.stderr.write(`${msg}\n${code === 2 ? USAGE : ''}`);
  process.exit(code);
};

const args = new Map<string, string>();
for (let k = 2; k < process.argv.length; k += 2) {
  const flag = process.argv[k] ?? '';
  const value = process.argv[k + 1];
  if (!['--recording', '--from', '--to', '--events', '--out'].includes(flag) || value === undefined) fail(`bad argument ${flag}`);
  args.set(flag, value as string);
}
const recDir = args.get('--recording');
const outFile = args.get('--out');
if (recDir === undefined) fail('--recording is required');
if (outFile === undefined) fail('--out is required');
if (!existsSync(recDir as string) || !statSync(recDir as string).isDirectory()) fail(`recording directory not found: ${recDir}`);
const instant = (flag: string, fallback: number): number => {
  const v = args.get(flag);
  if (v === undefined) return fallback;
  const t = Date.parse(v);
  if (Number.isNaN(t)) fail(`${flag} is not an ISO instant: ${v}`);
  return t;
};
const from = instant('--from', -Infinity);
const to = instant('--to', Infinity);

interface StatedEvent { event: string; observedAt: string; at: number; [key: string]: unknown }
let stated: StatedEvent[] = [];
const eventsFile = args.get('--events');
if (eventsFile !== undefined) {
  const raw: unknown = JSON.parse(readFileSync(eventsFile, 'utf8'));
  if (!Array.isArray(raw)) fail('--events must hold a JSON array');
  stated = (raw as Record<string, unknown>[])
    .map((e, n) => {
      if (typeof e['event'] !== 'string' || typeof e['observedAt'] !== 'string' || Number.isNaN(Date.parse(e['observedAt']))) fail(`--events entry ${n} needs event and observedAt`);
      return { ...e, at: Date.parse(e['observedAt'] as string) } as StatedEvent;
    })
    .filter((e) => e.at >= from && e.at <= to)
    .sort((a, b) => a.at - b.at); // stable: stated order kept for one instant
}

/** Sorted keys, undefined dropped as JSON.stringify drops it: the one serialisation the hash and the log both use. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canon(x))).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

const MOD = 1n << 256n;
const digestOf = (key: string, value: unknown): bigint => BigInt('0x' + createHash('sha256').update(`${key}\n${canon(value)}`).digest('hex'));

const manifestPath = join(recDir as string, 'manifest.json');
const manifest = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as { event?: { date?: string }; chunks?: { file: string; startTime: string; endTime?: string }[] }) : {};
const files: { file: string; start: number; end: number }[] =
  manifest.chunks !== undefined
    ? manifest.chunks.map((c) => ({ file: c.file, start: Date.parse(c.startTime), end: c.endTime === undefined ? Infinity : Date.parse(c.endTime) }))
    : readdirSync(recDir as string).filter((f) => f.endsWith('.jsonl')).sort().map((file) => ({ file, start: -Infinity, end: Infinity }));

const { ctx, learn } = createContextTracker(ZONE, manifest.event?.date, 'replay');
const core = createMergeCore({ zone: ZONE });
const fd = openSync(outFile as string, 'w');
const put = (o: unknown): void => void writeSync(fd, canon(o) + '\n');
put({ hydration: { asOfSeq: 0, state: { phases: [], attempts: [], entries: [], standings: [], oncourse: { attemptIds: [] }, diagnostics: [] } } });

let steps = 0;
let sum = 0n;
const parts = new Map<string, bigint>();
const setPart = (key: string, value: unknown): void => {
  const was = parts.get(key) ?? 0n;
  const now = value === undefined ? 0n : digestOf(key, value);
  sum = (sum - was + now + MOD) % MOD;
  if (now === 0n) parts.delete(key);
  else parts.set(key, now);
};

/** Refreshes the digest of whatever the step's deltas touched. */
function rehash(deltas: readonly Record<string, unknown>[]): string {
  for (const d of deltas) {
    switch (d['type']) {
      case 'attempt.updated': setPart(`a|${String(d['attemptId'])}`, core.presented(String(d['attemptId']))); break;
      case 'entry.updated': setPart(`e|${String(d['entryId'])}`, core.entry(String(d['entryId']))); break;
      case 'standing.updated': setPart(`s|${String((d['standing'] as { standingKey: string }).standingKey)}`, d['standing']); break;
      case 'scope.replaced': {
        const live = new Set(core.attempts());
        for (const k of [...parts.keys()]) if (k.startsWith('a|') && !live.has(k.slice(2))) setPart(k, undefined);
        for (const a of (d['attempts'] as { attemptId: string }[]) ?? []) setPart(`a|${a.attemptId}`, core.presented(a.attemptId));
        for (const st of (d['standings'] as { standingKey: string }[]) ?? []) setPart(`s|${st.standingKey}`, st);
        break;
      }
      case 'oncourse.updated': setPart('oncourse', core.oncourse()); break;
      case 'diagnostics.updated': setPart('diagnostics', d['diagnostics']); break;
      case 'write.updated': setPart(`w|${String((d['write'] as { writeId: string }).writeId)}`, d['write']); break;
      default: break;
    }
  }
  return sum.toString(16).padStart(64, '0');
}

function step(element: IngestElement | Record<string, unknown>): void {
  core.applyUnit([element as IngestElement]);
  const deltas = core.drainNotifications() as Record<string, unknown>[];
  steps++;
  put({ i: steps, element, deltas, stateHash: rehash(deltas) });
}

let next = 0; // stated events not yet injected
const injectUntil = (at: number): void => {
  while (next < stated.length && (stated[next] as StatedEvent).at <= at) {
    const { at: _at, ...element } = stated[next++] as StatedEvent;
    step(element);
  }
};

let tcpSeen = false;
let lastXml: string | undefined;
const defaultConnect = !stated.some((e) => e.event === 'tcp-connected');

for (const chunk of files) {
  if (chunk.end < from || chunk.start > to) continue;
  let base = chunk.start;
  let lineNo = 0;
  for await (const line of createInterface({ input: createReadStream(join(recDir as string, chunk.file)), crlfDelay: Infinity })) {
    lineNo++;
    if (lineNo === 1) {
      base = Date.parse((JSON.parse(line) as { _meta: { startTime: string } })._meta.startTime);
      continue;
    }
    const isXml = line.includes('"type":"XmlSnapshot"');
    if (!isXml && !line.includes('"src":"tcp"')) continue;
    const r = JSON.parse(line) as { ts: number; type: string; data: unknown };
    const at = base + r.ts;
    if (at < from) continue;
    if (at > to) break;
    ctx.observedAt = new Date(at).toISOString();
    const text = typeof r.data === 'string' ? r.data : String(r.data);
    injectUntil(at);
    if (isXml) {
      if (text === lastXml) continue;
      const els = parseXmlSnapshot(text, ctx);
      if (els.some((e) => 'unparseable' in e)) continue; // a torn read: the reader retries, nothing is delivered
      const changedAfter = lastXml === undefined ? null : new Date(at - POLL_MS).toISOString();
      lastXml = text;
      step({ ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: ctx.observedAt, changedAfter });
      for (const el of els) step(el);
      learn(els, true);
    } else {
      if (!tcpSeen && defaultConnect) step({ ingestSeq: 0, event: 'tcp-connected', observedAt: ctx.observedAt });
      tcpSeen = true;
      const els = parseTcp(text, ctx);
      for (const el of els) step(el);
      learn(els, false);
    }
  }
}
injectUntil(to === Infinity ? Infinity : to);
put({ end: { steps } });
closeSync(fd);
