// BRIEFS S1 step 6: parse-only sweep (no merge) of every recording, in full.
//   node dist/sweep.js <recordings .cache dir> <out.json> [event ...]
// Per recording: messages, unparseable messages, unknown message types, unknown format tokens,
// unparseable-cell cases, fabricated-course signatures; plus the facts the S1 gaps rest on.
import { createReadStream, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { parseTcp } from './tcp.js';
import { readSnapshot } from './snapshot.js';
import { fabricatedCourse, parseComma, parseFixedWidth, parseLayout } from './gates.js';
import { formatFromRaceId } from './format.js';

const KNOWN_FORMATS = new Set(['BR1', 'BR2', 'HT1', 'HT2', 'EL1', 'EL2', 'TR1', 'TR2', 'NHT2', 'SR1', 'SR2', 'QF', 'SF', 'SFB', 'FI', 'FIB',
  'SP1', 'SP2', 'SPF', 'TSR', 'XT', 'XT1', 'XT2', 'X8', 'X4', 'XS', 'XF', 'XER', 'SLER', 'WWER', 'RXER', 'SUF', 'TS1', 'TS2', 'TSF', 'TFI']);
const TCP_TYPES = new Set(['OnCourse', 'Results', 'Schedule', 'RaceConfig', 'TimeOfDay', 'TVS', 'TimingInput']);

type Stats = Record<string, any>;

async function sweep(dir: string): Promise<Stats> {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const st: Stats = {
    chunks: manifest.chunks.length, records: 0, bySrc: {} as Record<string, number>,
    tcp: { messages: 0, unparseable: 0, unparseableSamples: [] as string[], unknownTypes: {} as Record<string, number>, types: {} as Record<string, number>,
      unknownFormatTokens: {} as Record<string, number>, unparseableCells: { results: 0, oncourse: 0, samples: [] as string[] },
      fabricatedRaceConfig: 0, raceConfigs: 0, fabricatedSamples: [] as string[],
      resultsRowsWithDtFinish: 0, resultsRows: 0, resultsGatesWidths: {} as Record<string, number>,
      oncourse: { listings: 0, emptyMsgs: 0, unassigned: 0, finisherListings: 0, finisherWithPosition: 0, finisherNoPosition: 0,
        notArmedNoStart: 0, armedNoStart: 0, maxResendGapMs: 0, resendOver2500: 0, reappearAfter2500: 0 },
      maxSilenceMs: 0, silencesOver5s: [] as { at: string; ms: number }[] },
    xml: { snapshots: 0, invalid: 0, invalidReasons: {} as Record<string, number>, unknownFormatTokens: {} as Record<string, number>,
      unparseableCells: 0, cellSamples: [] as string[], emptyCourses: 0, coursesSeen: {} as Record<string, string>, phasesOnEmptyCourse: {} as Record<string, number>,
      secondRunRows: 0, secondRunRowsCatIdEmptyButCategorised: 0, untimedRows: 0 },
  };
  const recStart = Date.parse(manifest.chunks[0].startTime) - manifest.chunks[0].startOffset;
  const lastSeen = new Map<string, number>();
  const gone = new Map<string, number>();
  let lastTcp: number | null = null;
  for (const chunk of manifest.chunks) {
    const rl = createInterface({ input: createReadStream(join(dir, chunk.file), 'utf8'), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      let rec: any;
      try { rec = JSON.parse(line); } catch { st.badJsonLines = (st.badJsonLines ?? 0) + 1; continue; }
      if (rec._meta || rec._snapshot || rec._annotation) continue;
      st.records++;
      st.bySrc[rec.src] = (st.bySrc[rec.src] ?? 0) + 1;
      const t = recStart + chunk.startOffset + (rec.ts ?? 0);
      if (rec.src === 'tcp') {
        const T = st.tcp;
        T.messages++;
        if (lastTcp !== null && t - lastTcp > T.maxSilenceMs) T.maxSilenceMs = t - lastTcp;
        if (lastTcp !== null && t - lastTcp > 5000) T.silencesOver5s.push({ at: new Date(lastTcp).toISOString(), ms: t - lastTcp });
        lastTcp = t;
        for (const [k, v] of lastSeen) if (t - v > 2500) { lastSeen.delete(k); gone.set(k, v); }
        let m;
        try { m = parseTcp(rec.data); } catch (e) { T.unparseable++; if (T.unparseableSamples.length < 5) T.unparseableSamples.push(String(rec.data).slice(0, 160)); continue; }
        if (m.type === 'unknown' || !TCP_TYPES.has(m.type)) { const n = m.type === 'unknown' ? m.name : m.type; T.unknownTypes[n] = (T.unknownTypes[n] ?? 0) + 1; continue; }
        T.types[m.type] = (T.types[m.type] ?? 0) + 1;
        if (m.type === 'OnCourse') {
          const O = T.oncourse;
          if (m.empty || !m.p) { O.emptyMsgs++; lastSeen.clear(); continue; }
          if (!m.p.RaceId || m.p.RaceId === '<unassigned>') { O.unassigned++; continue; }
          O.listings++;
          const id = `${m.p.RaceId}:${(m.p.Bib ?? '').trim()}`;
          const prev = lastSeen.get(id);
          if (prev !== undefined) { const g = t - prev; if (g > O.maxResendGapMs) O.maxResendGapMs = g; }
          else if (gone.has(id)) { O.reappearAfter2500++; gone.delete(id); }
          lastSeen.set(id, t);
          const c = m.c ?? {};
          if (c.dtFinish?.trim()) { O.finisherListings++; if (m.position && m.position > 0) O.finisherWithPosition++; else O.finisherNoPosition++; }
          if (!c.dtStart?.trim()) { if (c.chStart === '1') O.armedNoStart++; else O.notArmedNoStart++; }
          if (c.Gates !== undefined) {
            const p = parseComma(c.Gates, 30);
            if (p.unparseable.length) { T.unparseableCells.oncourse += p.unparseable.length; if (T.unparseableCells.samples.length < 10) T.unparseableCells.samples.push(`oncourse ${id}: ${JSON.stringify(p.unparseable)}`); }
          }
          const fmt = formatFromRaceId(m.p.RaceId);
          if (!KNOWN_FORMATS.has(fmt)) T.unknownFormatTokens[fmt] = (T.unknownFormatTokens[fmt] ?? 0) + 1;
        } else if (m.type === 'Results') {
          if (m.raceId && m.raceId !== '<unassigned>') {
            const fmt = formatFromRaceId(m.raceId);
            if (!KNOWN_FORMATS.has(fmt)) T.unknownFormatTokens[fmt] = (T.unknownFormatTokens[fmt] ?? 0) + 1;
          }
          for (const row of m.rows) {
            T.resultsRows++;
            if (row.r.dtFinish !== undefined || row.p.dtFinish !== undefined) T.resultsRowsWithDtFinish++;
            const g = row.r.Gates ?? '';
            T.resultsGatesWidths[g.length] = (T.resultsGatesWidths[g.length] ?? 0) + 1;
            if (g.trim()) {
              const p = parseFixedWidth(g, 30);
              if (p.unparseable.length) { T.unparseableCells.results += p.unparseable.length; if (T.unparseableCells.samples.length < 10) T.unparseableCells.samples.push(`results ${m.raceId}:${(row.p.Bib ?? '').trim()}: ${JSON.stringify(p.unparseable)}`); }
            }
          }
        } else if (m.type === 'RaceConfig') {
          T.raceConfigs++;
          const a = m.a;
          if (fabricatedCourse(a.GateConfig ?? '', a.GateCaptions ?? '', Number(a.NrGates ?? 0))) {
            T.fabricatedRaceConfig++;
            if (T.fabricatedSamples.length < 5) T.fabricatedSamples.push(`${new Date(t).toISOString()} NrGates=${a.NrGates} GateConfig=${a.GateConfig} Captions=${(a.GateCaptions ?? '').slice(0, 40)}`);
          }
        }
      } else if (rec.src === 'xml' && rec.type === 'XmlSnapshot') {
        const X = st.xml;
        X.snapshots++;
        const r = readSnapshot(rec.data);
        if (!r.ok) { X.invalid++; X.invalidReasons[r.reason] = (X.invalidReasons[r.reason] ?? 0) + 1; continue; }
        const courses = new Map<string, string>();
        for (const c of r.tables.courses) { const nr = (c.CourseNr ?? '').trim(); courses.set(nr, c.CourseConfig ?? ''); X.coursesSeen[nr] = c.CourseConfig ?? ''; }
        const phaseCourse = new Map<string, string>();
        const second = new Set<string>();
        for (const s of r.tables.schedule) {
          if (!s.RaceId || s.RaceId === '<unassigned>') continue;
          const fmt = s.DisId ?? '';
          if (fmt && !KNOWN_FORMATS.has(fmt)) X.unknownFormatTokens[fmt] = (X.unknownFormatTokens[fmt] ?? 0) + 1;
          phaseCourse.set(s.RaceId, (s.CourseNr ?? '').trim());
          if (/^(BR2|HT2|EL2|TR2|NHT2|SR2|SUF)$/.test(fmt)) second.add(s.RaceId);
        }
        const catOf = new Map(r.tables.participants.map((p) => [p.Id ?? '', (p.CatId ?? '').trim()]));
        for (const row of r.tables.results) {
          const rid = row.RaceId ?? '';
          const layout = courses.get(phaseCourse.get(rid) ?? '') ?? '';
          if (row.Time !== undefined && layout === '' && phaseCourse.has(rid)) X.phasesOnEmptyCourse[rid] = (X.phasesOnEmptyCourse[rid] ?? 0) + 1;
          if (row.Gates?.trim()) {
            const n = layout ? parseLayout(layout).slots.length : 30;
            const p = parseFixedWidth(row.Gates, n);
            if (p.unparseable.length) { X.unparseableCells += p.unparseable.length; if (X.cellSamples.length < 10) X.cellSamples.push(`${rid}:${(row.Bib ?? '').trim()} ${JSON.stringify(p.unparseable)}`); }
          }
          if (second.has(rid)) {
            X.secondRunRows++;
            if (!(row.CatId ?? '').trim() && catOf.get(row.Id ?? '')) X.secondRunRowsCatIdEmptyButCategorised++;
          }
          if (row.Time !== undefined && (row.RnkOrder !== undefined || row.TotalRnkOrder !== undefined) && !(row.dtFinish ?? '').trim()) X.untimedRows++;
        }
        for (const v of courses.values()) if (v === '') X.emptyCourses++;
      }
    }
  }
  return st;
}

async function main() {
  const [root, out, ...only] = process.argv.slice(2);
  const events = (only.length ? only : readdirSync(root!).filter((d) => !d.startsWith('.'))).sort();
  const result: Record<string, Stats> = {};
  for (const ev of events) {
    const t0 = Date.now();
    result[ev] = await sweep(join(root!, ev));
    result[ev]!.wallClockMs = Date.now() - t0;
    console.log(`${ev}: ${result[ev]!.records} records, tcp ${result[ev]!.tcp.messages}, xml ${result[ev]!.xml.snapshots}, ${result[ev]!.wallClockMs} ms`);
    writeFileSync(out!, JSON.stringify(result, null, 2) + '\n');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
