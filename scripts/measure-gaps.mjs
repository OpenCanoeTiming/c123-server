#!/usr/bin/env node
/**
 * #204 measurement: distribution of unchanged-listing gaps on the TCP on-course stream, no cut-off of any kind.
 *
 *   npm run measure:gaps -- <recordings .cache dir> [--rows N] [--only <recording-dir-substring>]
 *
 * Standalone (node >= 18, no dependencies). Streams every .jsonl line by line; only the TCP message timestamps (8 bytes
 * + 1 byte each) and the last listing per Attempt are kept in memory, per recording.
 *
 * Definitions (departures are printed in the report header):
 *  - Attempt = RaceId + Bib of the Participant of an `OnCourse` TCP message. Time = chunk startTime + ts (ms).
 *  - A pair = two consecutive OnCourse records naming the same Attempt in one recording. UNCHANGED when dtStart and
 *    dtFinish are both equal (so the same generation by construction); CHANGED otherwise (a real unstage/restage or a
 *    start/finish arriving - not a gap in the sense of the question, reported separately).
 *  - For each gap: length, other TCP messages inside, longest silence of all TCP inside (silence = time between
 *    consecutive TCP messages, boundary messages included), explicit "course empty" (Total=0, no Participant) messages inside.
 *  - Stream alive = no all-TCP silence of ALIVE_SILENCE_S (2 s) or more inside the gap.
 *  - False leave for constant C, stall evaluation of DERIVATIONS 4.1: walking TCP messages strictly inside the gap, a
 *    message arriving >= C after the previous TCP message is a stall: nothing leaves and the Attempt counts from it;
 *    otherwise the Attempt leaves if the message is >= C after the Attempt's anchor (last naming, or last stall message).
 *    The relisting message itself names the Attempt and cannot cause a leave. Gaps with an explicit course-empty inside are
 *    not counted (that leave is upstream's statement, independent of C).
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dir = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i > 0 ? args[i + 1] : d; };
if (!dir || !existsSync(dir)) { process.stderr.write('usage: npm run measure:gaps -- <recordings .cache dir> [--rows N] [--only substr]\n'); process.exit(2); }
const MAXROWS = Number(opt('--rows', 60));
const ONLY = opt('--only', '');
const ALIVE_SILENCE_S = 2;
const CONSTS = [3, 4, 5, 6, 8, 10];
const LONG_S = 2.5;
const BINS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 15, 20, 30, 60, 120, Infinity];
const binLabel = (i) => `${i === 0 ? 0 : BINS[i - 1]}-${BINS[i] === Infinity ? 'inf' : BINS[i]}`;
const binOf = (s) => { let i = 0; while (s >= BINS[i]) i++; return i; };

class Growable { // append-only typed array
  constructor(Type) { this.Type = Type; this.a = new Type(1 << 16); this.n = 0; }
  push(v) { if (this.n === this.a.length) { const b = new this.Type(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = v; }
}
const lowerBound = (arr, n, v) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };

const RE_HEAD = /^\{"ts":(\d+),"src":"tcp","type":"([^"]*)"/;
const attr = (s, name) => { const m = new RegExp(`${name}=\\\\"([^\\\\"]*)\\\\"`).exec(s); return m ? m[1] : undefined; };
const RE_PART = /Participant /g;

const total = { hist: new Array(BINS.length).fill(0), histAlive: new Array(BINS.length).fill(0), histChanged: new Array(BINS.length).fill(0) };
const per = []; // per recording summaries
const rows = []; // long unchanged gaps
const changedRows = [];
const traces = [];
const TRACE_MAX_S = 15;
const stalls = []; // all-TCP silences >= 2 s
const anomalies = { nonMonotonic: 0, multiParticipant: 0, noHeadMatch: 0, badJson: 0 };

const recs = readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory() && d.includes(ONLY)).sort();
for (const rec of recs) {
  const recDir = join(dir, rec);
  const T = new Growable(Float64Array); // absolute ms of each TCP message
  const K = new Growable(Uint8Array); // 0 other, 1 OnCourse (names an Attempt), 2 course-empty
  const typeNames = []; const typeCode = new Map(); // other-type name -> code (>=3)
  const bigSil = new Growable(Int32Array); // index i of messages whose silence (T[i]-T[i-1]) >= ALIVE_SILENCE_S
  const emptyIdx = new Growable(Int32Array);
  const last = new Map(); // attempt -> {idx, t, s, f, file, line, total, pos}
  const fileOf = []; // per message: file number (for stalls)
  const lineOf = new Growable(Int32Array);
  const KID = new Growable(Int32Array), POS = new Growable(Uint8Array), TOT = new Growable(Uint8Array); const keyNames = []; const keyId = new Map();
  const fileIdx = new Growable(Uint16Array);
  const files = readdirSync(recDir).filter((f) => f.endsWith('.jsonl')).sort();
  const R = { rec, tcp: 0, oncourse: 0, pairs: 0, unchanged: 0, changed: 0, hist: new Array(BINS.length).fill(0), histAlive: new Array(BINS.length).fill(0),
    histChanged: new Array(BINS.length).fill(0), over25: 0, over25alive: 0, over25emptied: 0, fl: Object.fromEntries(CONSTS.map((c) => [c, 0])), flTrue: Object.fromEntries(CONSTS.map((c) => [c, 0])), flRaw: Object.fromEntries(CONSTS.map((c) => [c, 0])),
    stall2: 0, maxSilence: 0, emptyMsgs: 0, longestAlive: 0 };
  let prevT = -Infinity;
  const t0 = Date.now();
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    let base = 0, lineNo = 0;
    const rl = createInterface({ input: createReadStream(join(recDir, file)), crlfDelay: Infinity });
    for await (const line of rl) {
      lineNo++;
      if (lineNo === 1) { try { base = Date.parse(JSON.parse(line)._meta.startTime); } catch { anomalies.badJson++; } continue; }
      if (!line.includes('"src":"tcp"')) continue;
      let ts, type;
      const h = RE_HEAD.exec(line);
      if (h) { ts = Number(h[1]); type = h[2]; }
      else { try { const o = JSON.parse(line); if (o.src !== 'tcp') continue; ts = o.ts; type = o.type; } catch { anomalies.badJson++; continue; } anomalies.noHeadMatch++; }
      const t = base + ts;
      if (t < prevT) anomalies.nonMonotonic++;
      const idx = T.n;
      R.tcp++;
      if (idx > 0) {
        const sil = t - prevT;
        if (sil > R.maxSilence) R.maxSilence = sil;
        if (sil >= ALIVE_SILENCE_S * 1000) { bigSil.push(idx); R.stall2++; stalls.push({ rec, t: prevT, tEnd: t, len: sil / 1000, afterFile: fileIdx.a[idx - 1], afterLine: lineOf.a[idx - 1], file, line: lineNo, idx }); }
      }
      prevT = t;
      let kind = 0;
      if (type === 'OnCourse') {
        const pi = line.indexOf('Participant ');
        if (pi < 0) { kind = 2; emptyIdx.push(idx); R.emptyMsgs++; last.clear?.call; }
        else {
          kind = 1; R.oncourse++;
          if (line.indexOf('Participant ', pi + 5) > 0) anomalies.multiParticipant++;
          const key = `${attr(line, 'RaceId')}|${attr(line, 'Bib')}`;
          const s = attr(line, 'dtStart') ?? '', f = attr(line, 'dtFinish') ?? '';
          const kid = keyId.has(key) ? keyId.get(key) : (keyId.set(key, keyNames.length), keyNames.push(key), keyNames.length - 1);
          const cur = { kid, idx, t, s, f, file: fi, line: lineNo, total: attr(line, 'Total'), pos: attr(line, 'Position') };
          const p = last.get(key);
          if (p) handlePair(R, p, cur, T, K, bigSil, emptyIdx, typeNames, files, key, rec, { KID, POS, TOT, keyNames });
          last.set(key, cur);
        }
      } else if (!typeCode.has(type)) { typeCode.set(type, 3 + typeNames.length); typeNames.push(type); }
      { const o = last.size >= 0 && kind === 1 ? last.get(`${attr(line, 'RaceId')}|${attr(line, 'Bib')}`) : undefined; KID.push(o ? o.kid : -1); POS.push(o ? Math.min(255, Number(o.pos) || 0) : 0); TOT.push(o ? Math.min(255, Number(o.total) || 0) : 0); }
      T.push(t); K.push(kind === 0 ? typeCode.get(type) : kind); lineOf.push(lineNo); fileIdx.push(fi);
    }
    process.stderr.write(`${rec}/${file} done ${((Date.now() - t0) / 1000).toFixed(0)}s tcp=${R.tcp}\n`);
  }
  per.push(R);
  for (let i = 0; i < BINS.length; i++) { total.hist[i] += R.hist[i]; total.histAlive[i] += R.histAlive[i]; total.histChanged[i] += R.histChanged[i]; }
  R.files = files;
}

function handlePair(R, p, c, T, K, bigSil, emptyIdx, typeNames, files, key, rec, X) {
  R.pairs++;
  const gap = (c.t - p.t) / 1000;
  const unchanged = p.s === c.s && p.f === c.f;
  // range of messages strictly inside: p.idx+1 .. c.idx-1 (c.idx is not yet pushed but equals T.n)
  const lo = p.idx + 1, hi = c.idx; // [lo, hi)
  const inside = hi - lo;
  // alive: no big silence at message index in (p.idx, c.idx] i.e. silences between p.idx..c.idx
  const bs = lowerBound(bigSil.a, bigSil.n, lo);
  const hasBig = bs < bigSil.n && bigSil.a[bs] <= hi; // silence ending at message index <= hi (hi = relisting message, not yet in T; its silence is checked by caller order -> handled below)
  const bi = bin(gap);
  if (!unchanged) { R.changed++; R.histChanged[bi]++; }
  else { R.unchanged++; R.hist[bi]++; }
  // silence ending at the relisting message itself is already in bigSil (pushed before handlePair)
  const aliveAll = !hasBig;
  if (unchanged && aliveAll) R.histAlive[bi]++;
  if (unchanged && aliveAll && gap > R.longestAlive) R.longestAlive = gap;
  const needDetail = gap >= LONG_S || (unchanged && gap >= CONSTS[0]);
  if (!needDetail) return;
  // exact scan of the span
  let minTot = 999; const totals = {}; let maxSil = 0, nOC = 0, nOther = 0, nEmpty = 0; const types = {};
  let prev = p.t;
  for (let i = lo; i < hi; i++) {
    const d = T.a[i] - prev; if (d > maxSil) maxSil = d; prev = T.a[i];
    const k = K.a[i];
    if (k === 1) { const tt = X.TOT.a[i]; totals[tt] = (totals[tt] ?? 0) + 1; if (tt < minTot) minTot = tt; }
    if (k === 1) nOC++; else if (k === 2) nEmpty++; else { nOther++; types[typeNames[k - 3]] = (types[typeNames[k - 3]] ?? 0) + 1; }
  }
  { const d = c.t - prev; if (d > maxSil) maxSil = d; }
  maxSil /= 1000;
  // Total test: Total = number on course as upstream states it. If a message inside states a Total below the Attempt's own prior
  // Total, upstream had counted it out (real unstage); if no inside message states less, it stayed counted (hiccup of the listing).
  const prevTot = Number(p.total) || 0;
  const verdict = nEmpty ? 'course-empty' : nOC === 0 ? 'no-OC-evidence' : minTot < prevTot ? 'counted-out' : 'counted-throughout';
  if (unchanged) {
    if (gap >= LONG_S) { R.over25++; if (maxSil < ALIVE_SILENCE_S) R.over25alive++; if (nEmpty) R.over25emptied++; }
    // false leaves with the stall evaluation
    for (const C of CONSTS) {
      if (gap * 1000 >= C * 1000 && !nEmpty) R.flRaw[C]++;
      if (nEmpty) continue;
      let anchor = p.t, pv = p.t, leave = false;
      for (let i = lo; i < hi; i++) {
        const ti = T.a[i];
        if (ti - pv >= C * 1000) anchor = ti; // stall: nothing leaves, counts from here
        else if (ti - anchor >= C * 1000) { leave = true; break; }
        pv = ti;
      }
      if (leave) { R.fl[C]++; if (verdict === 'counted-throughout') R.flTrue[C]++; }
    }
  }
  if (gap >= LONG_S) {
    const rowObj = { rec, key, t: new Date(p.t).toISOString(), len: gap, nOC, nOther, nEmpty, maxSil, types, s: p.s, f: p.f, s2: c.s, f2: c.f,
      from: `${files[p.file]}:${p.line}`, to: `${files[c.file]}:${c.line}`, pos: `${p.pos}/${p.total}->${c.pos}/${c.total}`, totals: Object.entries(totals).map(([k, v]) => `${k}x${v}`).join(' '), alive: maxSil < ALIVE_SILENCE_S, verdict };
    (unchanged ? rows : changedRows).push(rowObj);
    if (unchanged && gap <= TRACE_MAX_S && maxSil < ALIVE_SILENCE_S && traces.length < 40) {
      const lines = []; let tr = 0;
      for (let i = lo; i < hi && lines.length < 70; i++) {
        if (K.a[i] === 1) lines.push(`  +${((T.a[i] - p.t) / 1000).toFixed(2)} ${X.keyNames[X.KID.a[i]]} ${X.POS.a[i]}/${X.TOT.a[i]}`);
        else if (K.a[i] === 2) lines.push(`  +${((T.a[i] - p.t) / 1000).toFixed(2)} COURSE-EMPTY`);
        else if (typeNames[K.a[i] - 3] !== 'TimeOfDay') lines.push(`  +${((T.a[i] - p.t) / 1000).toFixed(2)} (${typeNames[K.a[i] - 3]})`);
      }
      traces.push(`### ${rec} ${key} ${rowObj.t} gap ${gap.toFixed(2)} s, listed before ${p.pos}/${p.total}, after ${c.pos}/${c.total}\n${lines.join('\n')}`);
    }
  }
}
function bin(g) { return binOf(g); }

// ---------- report ----------
const pad = (s, n) => String(s).padStart(n);
const out = [];
const P = (s = '') => out.push(s);
P('# measure-gaps report');
P(`recordings: ${per.length}; anomalies: ${JSON.stringify(anomalies)}`);
P('');
P('## Totals per recording');
P('| recording | tcp msgs | OnCourse listings | pairs | unchanged | changed | unchanged >2.5 s | of which alive | with course-empty inside | longest alive unchanged gap (s) | max all-TCP silence (s) | silences >=2 s |');
P('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const R of per) P(`| ${R.rec} | ${R.tcp} | ${R.oncourse} | ${R.pairs} | ${R.unchanged} | ${R.changed} | ${R.over25} | ${R.over25alive} | ${R.over25emptied} | ${R.longestAlive.toFixed(2)} | ${(R.maxSilence / 1000).toFixed(2)} | ${R.stall2} |`);
const hist = (title, key) => {
  P(''); P(`## ${title}`);
  P('| bin (s) | ' + per.map((r) => r.rec.replace(/^\d{4}-\d\d-\d\d-/, '')).join(' | ') + ' | all |');
  P('|---|' + '---|'.repeat(per.length + 1));
  for (let i = 0; i < BINS.length; i++) P(`| ${binLabel(i)} | ${per.map((r) => r[key][i]).join(' | ')} | ${total[key][i]} |`);
};
hist('Histogram: unchanged-listing gaps, all', 'hist');
hist('Histogram: unchanged-listing gaps, stream alive (no all-TCP silence >= 2 s inside)', 'histAlive');
hist('Histogram: CHANGED pairs (dtStart/dtFinish differ) - real unstage/restage, start or finish arriving', 'histChanged');
P(''); P('## False leaves per constant (stall evaluation of 4.1 applied; "raw" = gap >= C without it)');
P('| recording | ' + CONSTS.map((c) => `${c} s`).join(' | ') + ' | ' + CONSTS.map((c) => `raw ${c}`).join(' | ') + ' |');
P('|---|' + '---|'.repeat(CONSTS.length * 2));
for (const R of per) P(`| ${R.rec} | ${CONSTS.map((c) => R.fl[c]).join(' | ')} | ${CONSTS.map((c) => R.flRaw[c]).join(' | ')} |`);
P(`| all | ${CONSTS.map((c) => per.reduce((a, r) => a + r.fl[c], 0)).join(' | ')} | ${CONSTS.map((c) => per.reduce((a, r) => a + r.flRaw[c], 0)).join(' | ')} |`);
const fmtRow = (r) => `| ${r.verdict} | ${r.rec.replace(/^\d{4}-\d\d-\d\d-/, '')} | ${r.key} | ${r.t} | ${r.len.toFixed(2)} | ${r.nOC}+${r.nOther}${r.nEmpty ? '+' + r.nEmpty + 'E' : ''} | ${r.maxSil.toFixed(2)} | ${r.alive ? 'alive' : 'STALL'} | ${r.s ? 'start' : 'no start'}${r.f ? '+fin' : ''} -> ${r.s2 ? 'start' : 'no start'}${r.f2 ? '+fin' : ''} | ${r.pos} | ${r.from} .. ${r.to} | ${Object.entries(r.types).map(([k, v]) => k + ':' + v).join(',')} | ${r.totals} |`;
const head = '| Total test | rec | attempt | at | len s | inside OC+other(+E=course-empty) | longest silence s | stream | listing | pos/total | raw lines | other types inside | Total values seen inside (value x count) |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|';
P(''); P('## False leaves restricted to gaps where upstream kept counting the Attempt in Total (counted-throughout), same stall evaluation');
P('| recording | ' + CONSTS.map((c) => `${c} s`).join(' | ') + ' |'); P('|---|' + '---|'.repeat(CONSTS.length));
for (const R of per) P(`| ${R.rec} | ${CONSTS.map((c) => R.flTrue[c]).join(' | ')} |`);
P(`| all | ${CONSTS.map((c) => per.reduce((a, r) => a + r.flTrue[c], 0)).join(' | ')} |`);
P(''); P(`## Unchanged gaps > ${LONG_S} s, longest first (${rows.length} total; first ${MAXROWS})`); P(head);
rows.sort((a, b) => b.len - a.len);
for (const r of rows.slice(0, MAXROWS)) P(fmtRow(r));
P(''); P(`## CHANGED pairs > ${LONG_S} s, stream alive (${changedRows.filter((r) => r.alive).length} total; first ${MAXROWS} by length)`); P(head);
changedRows.sort((a, b) => b.len - a.len);
for (const r of changedRows.filter((r) => r.alive).slice(0, MAXROWS)) P(fmtRow(r));
P(''); P(`## All-TCP silences >= ${ALIVE_SILENCE_S} s (${stalls.length}); first 100 by length`);
P('| rec | from | to | len s | last msg before (file:line) | first msg after (file:line) |'); P('|---|---|---|---|---|---|');
stalls.sort((a, b) => b.len - a.len);
const fileNameOf = (rec, i) => { try { return readdirSync(join(dir, rec)).filter((f) => f.endsWith('.jsonl')).sort()[i]; } catch { return i; } };
for (const s of stalls.slice(0, 100)) P(`| ${s.rec.replace(/^\d{4}-\d\d-\d\d-/, '')} | ${new Date(s.t).toISOString()} | ${new Date(s.tEnd).toISOString()} | ${s.len.toFixed(2)} | ${fileNameOf(s.rec, s.afterFile)}:${s.afterLine} | ${s.file}:${s.line} |`);
P(''); P('## Traces: unchanged alive gaps 2.5-15 s (OnCourse listings inside as +offset key position/total; non-OnCourse types other than TimeOfDay shown)'); for (const t of traces) P(t);
process.stdout.write(out.join('\n') + '\n');
