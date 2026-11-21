#!/usr/bin/env node
/**
 * Builds the committed fixture A of the outage gate (#208) from the synthetic recording
 * `2026-11-09-outage-nkz19so-0930` and the original it replays (`2026-09-19-2026-nkz-19so`). Run once, by hand; the test never
 * runs it. Reproducible: same recordings, same bytes (gzip level 9, no mtime).
 *
 *   node build.mjs <recordings .cache dir> <output dir>
 *
 * Output: <output dir>/outage-nkz19so-0930/{manifest.json, 001-outage.jsonl.gz}. A v3 recording directory once the chunk is
 * gunzipped (the test does that into a temporary directory).
 *
 * The synthetic recording was made by protocol-docs tools/player.js replaying nkz-19so from 2026-09-19T09:30:00Z at 1x into
 * tools/recorder.js (protocol-docs#37), XML via --xml-out/--xml-path, TCP cuts --cuts "2026-09-19T09:35:00.000Z/170,2026-09-19T09:45:00.000Z/15".
 * Its wall clock is 2026-11-09, its data 2026-09-19. EVERY instant (chunk `_meta.startTime`, manifest chunk start/end, `ts` stay
 * chunk-relative) is moved by ONE constant offset so that the first TimeOfDay record's instant equals the instant of its original
 * record in nkz-19so (found by content). #208 words this as "the first TCP data record"; that record is the player's seek burst whose
 * originals precede the player start by up to 12 s, which breaks the data's own clock (see the manifest `rebase.rule`).
 *
 * Edits (everything else is byte-identical to the recording): only the cut window below is kept (#399), and inside it the XML
 * snapshots of the quiet stretch between the two outages are dropped (the manifest's `fixture.edits` and `fixture.cut` state both); `_snapshot` lines dropped (recorder state images, the gate does not read
 * them); the three base64 `<ReportImage*>` elements of every XML snapshot's `<Events>` emptied (report logos, as in rerun-paths); `_meta` and manifest instants rebased; manifest `event.date` and `host`/path fields neutralised; `fixture` object and
 * `tcpStateAtStart` added. Kept: `_event`, tcp and xml records. Published-results rule: names, clubs, ICF ids as recorded; Birthdate
 * only as year (checked below, the recording already holds YYYY-01-01).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const [cache, outRoot] = process.argv.slice(2);
// The cut (#399): chunk-relative ts of the synthetic recording, in ms. It opens 15 s before the first TCP cut (ts 301502, the
// player's 09:35:00) so the core holds the start list, race configs and results of the running classes (RaceConfig/Results/Schedule
// repeat every few seconds, the XML every 35 s) before the first outage, and it ends 60 s after the second reconnect (ts 916480),
// where the test's last interval ends. The recording's first connect (ts 14) and its recorder-stop disconnect fall outside.
const CUT_FROM_TS = 286500;
const CUT_TO_TS = 976500;
// XML snapshots weigh ~70 kB gzipped each and dominate the file. Kept: the first one at or after the cut start (the state before the
// first outage) and every snapshot inside an outage or its 60 s after (XML keeps flowing while the TCP is cut: the rows the outage
// tests present). Dropped: the others, i.e. the quiet stretch between the two outages.
const KEEP_XML_BETWEEN = [[301502, 542517], [901476, 976500]];
if (!cache || !outRoot) throw new Error('usage: build.mjs <recordings .cache dir> <output dir>');
const SYN = '2026-11-09-outage-nkz19so-0930';
const ORIG = '2026-09-19-2026-nkz-19so';
const P = Date.parse;
const iso = (ms) => new Date(ms).toISOString();

const synDir = join(cache, SYN);
const synMan = JSON.parse(readFileSync(join(synDir, 'manifest.json'), 'utf8'));
const chunk = synMan.chunks[0];
const base = P(chunk.startTime);
const lines = readFileSync(join(synDir, chunk.file), 'utf8').split('\n').filter((l) => l !== '');
const recs = lines.map((l) => JSON.parse(l));
const firstTcp = recs.find((o) => o.src === 'tcp');
const firstInstant = base + firstTcp.ts;
// The anchor is the first TimeOfDay record, not the first record: the first records are the player's seek burst (RaceConfig,
// Results, OnCourse) whose originals lie up to 12 s BEFORE the player start, so equating the burst with its original would put
// every later instant ~12 s off the data's own clock (TimeOfDay, dtFinish...) and the gate-2 checker (property 1) would see
// observedAt earlier than the times the messages carry. TimeOfDay "hh:mm:ss" is unique per day: its original is found by content.
const anchor = recs.find((o) => o.src === 'tcp' && o.type === 'TimeOfDay');
const anchorInstant = base + anchor.ts;
const origMan = JSON.parse(readFileSync(join(cache, ORIG, 'manifest.json'), 'utf8'));
const PLAYER_START = P('2026-09-19T09:30:00.000Z');
let matched = null;
for (const c of origMan.chunks) {
  if (P(c.endTime) < PLAYER_START || P(c.startTime) > PLAYER_START + 120e3) continue;
  const b = P(c.startTime);
  for (const l of readFileSync(join(cache, ORIG, c.file), 'utf8').split('\n')) {
    if (!l.startsWith('{"ts"')) continue;
    const o = JSON.parse(l);
    if (o.src !== 'tcp' || o.type !== 'TimeOfDay' || o.data !== anchor.data) continue;
    const t = b + o.ts;
    if (t >= PLAYER_START && (matched === null || t < matched.t)) matched = { t, chunk: c.file, ts: o.ts };
  }
}
if (matched === null) throw new Error('no original record found');
const offset = matched.t - anchorInstant;


const out = [];
let dropped = 0;
let images = 0;
let xmlDropped = 0;
let firstXmlKept = false;
let firstXmlInstant = 0;
let messages = 0;
const tsOf = (l) => Number(l.match(/^\{"ts":(\d+)/)[1]);
const shiftTs = (l) => l.replace(/^\{"ts":(\d+)/, (_m, t) => `{"ts":${Number(t) - CUT_FROM_TS}`);
for (const l of lines) {
  if (l.startsWith('{"_meta"')) {
    const m = JSON.parse(l);
    m._meta.startTime = iso(P(m._meta.startTime) + CUT_FROM_TS + offset);
    out.push(JSON.stringify(m));
    continue;
  }
  const ts = tsOf(l);
  if (ts < CUT_FROM_TS || ts > CUT_TO_TS) continue;
  if (l.includes('"_snapshot"')) { dropped++; continue; }
  if (l.includes('"src":"xml"')) {
    const keep = !firstXmlKept || KEEP_XML_BETWEEN.some(([a, b]) => ts >= a && ts <= b);
    if (!firstXmlKept) firstXmlInstant = base + ts + offset;
    firstXmlKept = true;
    if (!keep) { xmlDropped++; continue; }
  }
  messages++;
  if (l.includes('"src":"xml"')) {
    // the three base64 <ReportImage*> elements of <Events> (report logos; no gate reads them): same stated edit as rerun-paths
    const o = JSON.parse(l);
    const d = o.data.replace(/<ReportImage(Left|Right|Footer)>[^<]*<\/ReportImage\1>/g, (_m, k) => { images++; return `<ReportImage${k} />`; });
    out.push(JSON.stringify({ ...o, ts: o.ts - CUT_FROM_TS, data: d, size: d.length }));
    continue;
  }
  out.push(shiftTs(l));
}
const birth = [...lines.join('\n').matchAll(/Birthdate="?>?(\d{4}-\d{2}-\d{2})/g), ...lines.join('\n').matchAll(/<Birthdate>(\d{4}-\d{2}-\d{2})/g)].filter((m) => !m[1].endsWith('-01-01'));
if (birth.length > 0) throw new Error(`full birth dates present: ${birth.length}`);

const name = 'outage-nkz19so-0930';
const file = '001-outage.jsonl.gz';
const text = out.join('\n') + '\n';
const gz = gzipSync(Buffer.from(text), { level: 9 });
gz[4] = gz[5] = gz[6] = gz[7] = 0; // mtime: reproducible bytes
mkdirSync(join(outRoot, name), { recursive: true });
writeFileSync(join(outRoot, name, file), gz);

const manifest = {
  version: 3,
  event: { name: '2026_NKZ_19so', date: '2026-09-19' },
  recorder: synMan.recorder,
  host: '127.0.0.1',
  chunks: [{
    ...chunk,
    file: '001-outage.jsonl',
    startTime: iso(base + CUT_FROM_TS + offset),
    endTime: iso(base + CUT_TO_TS + offset),
    startOffset: chunk.startOffset + CUT_FROM_TS,
    duration: CUT_TO_TS - CUT_FROM_TS,
    messages,
    snapshots: 0,
    size: Buffer.byteLength(text),
  }],
  totalDuration: CUT_TO_TS - CUT_FROM_TS,
  totalMessages: messages,
  tcpStateAtStart: 'connected', // the cut opens inside the first connection (its connect, ts 14 of the recording, lies before the cut)
  fixture: {
    name,
    synthetic: true,
    source: {
      recording: SYN,
      madeBy: 'protocol-docs tools/player.js (1x, from 2026-09-19T09:30:00Z) into tools/recorder.js (protocol-docs#37), XML via --xml-out/--xml-path',
      originalRecording: ORIG,
      window: { from: '2026-09-19T09:30:00Z', to: iso(P(synMan.chunks[0].endTime) + offset) }, // the recording the cut was taken from
      cuts: [
        { at: '2026-09-19T09:35:00.000Z', seconds: 170, via: 'player --cuts, TCP only; XML keeps flowing' },
        { at: '2026-09-19T09:45:00.000Z', seconds: 15, via: 'player --cuts, TCP only; XML keeps flowing' },
      ],
      playerCutsLog: 'TCP cut for 170s at wall-clock 15:19:42, recording instant 2026-09-19T09:35:00.000Z; TCP cut for 15s at wall-clock 15:29:42, recording instant 2026-09-19T09:45:00.000Z',
      recordedEventsWall: [
        '2026-11-09T14:14:41.118Z tcp-connected', '2026-11-09T14:19:42.606Z tcp-disconnected', '2026-11-09T14:22:43.621Z tcp-connected',
        '2026-11-09T14:29:42.580Z tcp-disconnected', '2026-11-09T14:29:57.584Z tcp-connected', '2026-11-09T14:39:46.020Z tcp-disconnected (recorder-stop)',
      ],
    },
    cut: {
      why: 'a short cut around the two recorded reconnects (#399), taken from the recording by build.mjs; the offset is the one of the whole recording, so every kept record keeps the instant it had',
      fromTs: CUT_FROM_TS,
      toTs: CUT_TO_TS,
      from: iso(base + CUT_FROM_TS + offset),
      to: iso(base + CUT_TO_TS + offset),
      windowWhy: `opens 15 s before the first TCP cut (${iso(base + 301502 + offset)}) so the core holds the start list, race configs and results of the running classes, and the first XML snapshot, before the first outage (RaceConfig and Results repeat every few seconds in the recording; the first XML snapshot at or after the start is kept); ends 60 s after the second reconnect (${iso(base + 916480 + offset)}), the end of the last test interval. The recording's own first connect and recorder-stop disconnect lie outside, hence tcpStateAtStart connected and four recorded events.`,
      judgedFrom: iso(firstXmlInstant),
      judgedFromWhy: 'a cold start in the middle of a stream: the core has Results and OnCourse but not yet the start list of the XML, so the checker is given --window judgedFrom..to (as for the real recording B, row 5); everything before the first XML snapshot is warm-up',
      xmlKept: 'the first snapshot at or after the start, and every snapshot from the first disconnect to 60 s after the first reconnect and from the second disconnect to the end; the others (the quiet stretch between the outages) are dropped',
    },
    rebase: {
      offsetMs: offset,
      rule: 'one constant offset added to every instant (chunk startTime, manifest start/end); record ts stay chunk-relative. The anchor is the first TimeOfDay record (unique content, found in nkz-19so by content), which lands on its original instant. The literal rule of #208 (first TCP data record = its original) would anchor the player seek burst, whose originals lie up to 12 s before the player start: every instant would then be ~12 s off the data\'s own clock and gate-2 property 1 reports false violations (observed).',
      firstTcpRecordInstant: iso(base + tsOf(lines.find((l) => l.startsWith('{"ts"') && l.includes('"src":"tcp"') && tsOf(l) >= CUT_FROM_TS)) + offset),
      anchorRecord: { type: 'TimeOfDay', data: anchor.data, syntheticInstantBeforeRebase: iso(anchorInstant), originalRecording: ORIG, originalChunk: matched.chunk, originalTs: matched.ts, originalInstant: iso(matched.t) },
    },
    edits: [`${dropped} recorder _snapshot lines dropped`, `${images} base64 <ReportImageLeft|Right|Footer> elements emptied in the XML snapshots' <Events> (report logos; size fields adjusted)`, `records outside the cut window dropped, record ts shifted by ${CUT_FROM_TS} ms (chunk-relative)`, `${xmlDropped} XML snapshots outside the outages dropped (size)`, 'instants rebased by offsetMs', 'manifest host/xml path neutralised, event.date 2026-09-19', 'fixture and tcpStateAtStart added', 'chunk gzipped'],
    birthdates: 'year only, as recorded (YYYY-01-01); names, clubs, ICF ids as recorded',
  },
};
writeFileSync(join(outRoot, name, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`offset ${offset} ms (${offset / 86400e3} days); cut ${iso(base + CUT_FROM_TS + offset)}..${iso(base + CUT_TO_TS + offset)}; gz ${gz.length} bytes; ${dropped} _snapshot lines dropped; ${images} report images emptied`);
