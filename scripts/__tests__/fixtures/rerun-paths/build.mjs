#!/usr/bin/env node
/**
 * Builds the five committed re-run fixtures (#207) from the recordings in c123-protocol-docs. Run once, by hand; the
 * test never runs it and the fixtures are what is committed. Reproducible: same recordings, same bytes.
 *
 *   node build.mjs <recordings .cache dir> <output dir>
 *
 * Every fixture is a v3 recording directory (manifest.json + one chunk) holding ONE Attempt of its source, as an excerpt:
 *  - tcp records kept: OnCourse messages of the Attempt (upstream sends one Participant per message), Results messages with
 *    only the Attempt's Row, the race's Schedule element, RaceConfig (consecutive identical ones once), TimeOfDay for 15 s after
 *    each kept record (the leave rule, DERIVATIONS 4.1, counts other tcp messages arriving);
 *  - xml records kept: one snapshot per change of the Attempt's own content, holding Events (without Report* images),
 *    the Attempt's Participants, its Classes, its Schedule, its Results row, CourseData;
 *  - published-results rule: names, clubs and ICF ids as recorded; Birthdate reduced to YYYY-01-01.
 * Each fixture's manifest.json carries a `fixture` object: synthetic yes/no, source recording and window, and the edits.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [cache, outRoot] = process.argv.slice(2);
if (!cache || !outRoot) throw new Error('usage: build.mjs <recordings .cache dir> <output dir>');
const iso = (ms) => new Date(ms).toISOString();
const P = (s) => Date.parse(s);

/** Records of one recording in [from, to], in recorded order. */
function* records(rec, from, to) {
  const dir = join(cache, rec);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  for (const c of manifest.chunks) {
    if (P(c.endTime) < P(from) || P(c.startTime) > P(to)) continue;
    const base = P(c.startTime);
    for (const line of readFileSync(join(dir, c.file), 'utf8').split('\n')) {
      if (!line.startsWith('{"ts"')) continue;
      const o = JSON.parse(line);
      if (typeof o.data !== 'string' || (o.src !== 'tcp' && o.src !== 'xml')) continue;
      const t = base + o.ts;
      if (t < P(from) || t > P(to)) continue;
      yield { t, src: o.src, type: o.type, data: o.data };
    }
  }
  return manifest;
}
const eventOf = (rec) => JSON.parse(readFileSync(join(cache, rec, 'manifest.json'), 'utf8')).event;

const attr = (tag, k) => (new RegExp(`\\b${k}="([^"]*)"`).exec(tag) ?? [])[1];
const wrap = (inner) => `<Canoe123 System="Main">${inner}</Canoe123>`;

// ---- tcp -------------------------------------------------------------------------------------------------------------
const onCourseOf = (d) => {
  const p = /<Participant\b[^>]*\/>/.exec(d);
  return p ? { tag: p[0], bib: attr(p[0], 'Bib').trim(), race: attr(p[0], 'RaceId') } : null;
};
const rowsOf = (d) => [...d.matchAll(/<Row\b[^>]*>[\s\S]*?<\/Row>/g)].map((m) => {
  const p = /<Participant\b[^>]*\/>/.exec(m[0]);
  return { text: m[0], bib: p ? attr(p[0], 'Bib').trim() : null, ptag: p ? p[0] : null };
});

// ---- xml -------------------------------------------------------------------------------------------------------------
const blocks = (xml, name) => [...xml.matchAll(new RegExp(`\\r?\\n  <${name}>[\\s\\S]*?\\n  </${name}>`, 'g'))].map((m) => m[0]);
const inner = (b, k) => (new RegExp(`<${k}>([\\s\\S]*?)</${k}>`).exec(b) ?? [])[1];
const HEAD = '<?xml version="1.0" standalone="yes"?>\r\n<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">';
const yearOnly = (b) => b.replace(/<Birthdate>(\d{4})-\d\d-\d\d(T[^<]*)<\/Birthdate>/, '<Birthdate>$1-01-01$2</Birthdate>');
function xmlParts(xml, { id, classId, race, bib }) {
  const events = blocks(xml, 'Events').map((b) => b.replace(/\r?\n    <Report\w+[\s\S]*?(?=\r?\n    <(?!\/)|\r?\n  <\/Events>)/g, '').replace(/\r?\n    <Report\w*\s*\/>/g, ''));
  return {
    events,
    participant: blocks(xml, 'Participants').filter((b) => inner(b, 'Id') === id).map(yearOnly),
    classes: blocks(xml, 'Classes').filter((b) => inner(b, 'ClassId') === classId),
    schedule: blocks(xml, 'Schedule').filter((b) => inner(b, 'RaceId') === race),
    results: blocks(xml, 'Results').filter((b) => inner(b, 'RaceId') === race && inner(b, 'Bib').trim() === bib),
    course: blocks(xml, 'CourseData'),
  };
}
const xmlDoc = (parts, results = parts.results) =>
  [HEAD, ...parts.events, ...parts.participant, ...parts.classes, ...parts.schedule, ...results, ...parts.course, '</Canoe123Data>'].join('');

// ---- an excerpt of one Attempt ---------------------------------------------------------------------------------------
/**
 * `src` {rec, race, bib, id, classId, from, to}; hooks (all optional) edit what is kept:
 *   onCourse(rec) -> rec | null          for each kept OnCourse record
 *   row(rec, rowObj) -> rowText | null    for each kept Results record's Row
 *   xmlResults(rec, resultsBlock) -> block | null
 *   extra(out)                           add records
 */
function excerpt(src, hooks = {}) {
  const out = [];
  let lastKept = -Infinity;
  const todo = [];
  let lastSchedule, lastConfig, lastXml;
  let ident = null; // the Attempt's own Participant tag / XML Participants, taken from the source
  for (const r of records(src.rec, src.from, src.to)) {
    const keep = (o) => { out.push(o); lastKept = o.t; };
    if (r.src === 'tcp' && r.type === 'OnCourse') {
      const oc = onCourseOf(r.data);
      if (oc && oc.bib === src.bib && oc.race === src.race) {
        ident ??= oc.tag;
        const o = hooks.onCourse ? hooks.onCourse(r) : r;
        if (o) keep({ ...o, src: 'tcp', type: 'OnCourse' });
      }
    } else if (r.src === 'tcp' && r.type === 'Results') {
      const head = /<Results\b[^>]*>/.exec(r.data)[0];
      if (attr(head, 'RaceId') !== src.race) continue;
      const row = rowsOf(r.data).find((x) => x.bib === src.bib);
      // a push of the race without the Attempt's Row is kept as a push with no Row: absence retracts (INV-7)
      const text = row ? (hooks.row ? hooks.row(r, row) : row.text) : '';
      if (!row) { keep({ t: r.t, src: 'tcp', type: 'Results', data: wrap(`${head}</Results>`), absent: true }); continue; }
      if (text) keep({ t: r.t, src: 'tcp', type: 'Results', data: wrap(`${head}${text}</Results>`) });
    } else if (r.src === 'tcp' && r.type === 'Schedule') {
      const race = [...r.data.matchAll(/<Race\b[^>]*>[\s\S]*?<\/Race>/g)].map((m) => m[0]).find((x) => attr(x, 'RaceId') === src.race);
      if (race) {
        const data = wrap(`<Schedule>${race}</Schedule>`);
        if (data !== lastSchedule) { lastSchedule = data; keep({ t: r.t, src: 'tcp', type: 'Schedule', data }); }
      }
    } else if (r.src === 'tcp' && r.type === 'RaceConfig') {
      if (r.data !== lastConfig) { lastConfig = r.data; keep({ t: r.t, src: 'tcp', type: 'RaceConfig', data: r.data }); }
    } else if (r.src === 'tcp' && r.type === 'TimeOfDay') {
      if (r.t - lastKept <= 15000) out.push({ t: r.t, src: 'tcp', type: 'TimeOfDay', data: r.data });
    } else if (r.src === 'xml') {
      const parts = xmlParts(r.data, src);
      if (parts.results.length === 0) continue;
      const results = hooks.xmlResults ? parts.results.map((b) => hooks.xmlResults(r, b)).filter(Boolean) : parts.results;
      const data = xmlDoc(parts, results);
      if (data !== lastXml) { lastXml = data; keep({ t: r.t, src: 'xml', type: 'XmlSnapshot', data }); }
    }
  }
  return { out, ident };
}

function write(dir, src, out, fixture) {
  mkdirSync(dir, { recursive: true });
  const sorted = out.map((o, n) => ({ ...o, n })).sort((a, b) => a.t - b.t || a.n - b.n);
  const start = P(src.from);
  const end = P(src.to);
  const lines = [JSON.stringify({ _meta: { version: 3, seq: 1, eventDir: fixture.name, startTime: src.from, label: fixture.name, races: [], prevChunk: null, nextChunk: null } })];
  for (const o of sorted) lines.push(JSON.stringify({ ts: o.t - start, src: o.src, type: o.type, data: o.data, size: o.data.length }));
  writeFileSync(join(dir, '001-excerpt.jsonl'), lines.join('\n') + '\n');
  const ev = eventOf(src.rec);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    version: 3,
    event: { name: ev.name, date: ev.date },
    recorder: 'c123-recorder/3.0.0',
    fixture,
    chunks: [{ seq: 1, file: '001-excerpt.jsonl', label: fixture.name, startTime: src.from, endTime: src.to, duration: end - start, races: [], messages: sorted.length }],
  }, null, 2) + '\n');
  return sorted;
}

// =====================================================================================================================
// nkz-19so C1M_BR1_19 bib 7, the recorded jury re-run (rows 1 and 2)
// =====================================================================================================================
const NKZ = { rec: '2026-09-19-2026-nkz-19so', race: 'C1M_BR1_19', bib: '7', id: '119189.C1M', classId: 'C1M', from: '2026-09-19T10:44:00.000Z', to: '2026-09-19T12:43:59.000Z' };
const nkzBefore = excerpt(NKZ);
write(join(outRoot, 'nkz-bib7-row-before'), NKZ, nkzBefore.out, {
  name: 'nkz-bib7-row-before',
  synthetic: false,
  source: { recording: NKZ.rec, window: [NKZ.from, NKZ.to], attempt: `${NKZ.race}:${NKZ.bib}` },
  order: 'row before the on-course finish (recorded: the run-2 result row at 12:41:44.250Z, the finish listing at 12:41:44.358Z)',
  edits: [
    'trimmed to one Attempt: other bibs, races, TVS, TimingInput, CIS and udp records removed; Results messages keep only the Attempt\'s Row; XML snapshots keep Events (Report* images removed), the Attempt\'s Participants, its Classes, Schedule and Results row, CourseData; identical consecutive trimmed snapshots once',
    'TimeOfDay kept only for 15 s after a kept record',
    'a race push that carries no Row of the Attempt is kept as a Results message with no Row (absence retracts, INV-7)',
    'no record of the Attempt moved, removed or added',
  ],
});

const FIN = nkzBefore.out.find((o) => o.src === 'tcp' && o.type === 'OnCourse' && o.data.includes('dtFinish="14:41:44.000"'));
const ROW = nkzBefore.out.find((o) => o.src === 'tcp' && o.type === 'Results' && o.t === P('2026-09-19T12:41:44.250Z'));
if (!FIN || !ROW) throw new Error('nkz anchors not found');
const gap = FIN.t - ROW.t; // 108 ms
const nkzAfter = nkzBefore.out.map((o) => (o === ROW ? { ...o, t: FIN.t + gap } : o));
write(join(outRoot, 'nkz-bib7-row-after'), NKZ, nkzAfter, {
  name: 'nkz-bib7-row-after',
  synthetic: true,
  source: { recording: NKZ.rec, window: [NKZ.from, NKZ.to], attempt: `${NKZ.race}:${NKZ.bib}` },
  order: 'row after the on-course finish (the 28 % order, DERIVATIONS 4.4 and 4.11)',
  edits: [
    'same trimming as nkz-bib7-row-before',
    `moved: the tcp Results record of run 2's first result row (recorded 2026-09-19T12:41:44.250Z, ${gap} ms BEFORE the first on-course listing with dtFinish 14:41:44.000, 12:41:44.358Z) to ${iso(FIN.t + gap)}, the same ${gap} ms AFTER it; content unchanged`,
    'why it matches upstream: the row and the listing are two pushes of one finish; recorded finishes arrive in either order (72 % row first, 28 % listing first, DERIVATIONS 4.4), and 4.11 states the attribution of a row arriving after the finish listing; nothing else of the Attempt is moved, removed or added',
  ],
});

// =====================================================================================================================
// jarni-so-odp K1W_BR1_18 bib 24: a recorded single run ending in DNF, then a non-wizard re-run (rows 3 and 4)
// =====================================================================================================================
const J = { rec: '2026-04-18-jarni-so-odp', race: 'K1W_BR1_18', bib: '24', id: null, classId: 'K1W', from: '2026-04-18T12:58:00.000Z', to: '2026-04-18T13:05:30.000Z' };
const DONOR = '30';
// the Attempt's identity, from its own recorded records
let ident24;
let id24;
for (const r of records(J.rec, J.from, J.to)) {
  if (r.src === 'tcp' && r.type === 'OnCourse') { const oc = onCourseOf(r.data); if (oc && oc.bib === J.bib && oc.race === J.race) { ident24 = oc.tag; break; } }
}
id24 = attr(ident24, 'Id');
J.id = id24;
const donor = { ...J, bib: DONOR, id: null };
for (const r of records(J.rec, J.from, J.to)) {
  if (r.src === 'tcp' && r.type === 'OnCourse') { const oc = onCourseOf(r.data); if (oc && oc.bib === DONOR && oc.race === J.race) { donor.id = attr(oc.tag, 'Id'); break; } }
}
const donorRun = excerpt(donor);
const own = excerpt(J);

// the donor's records, relabelled as bib 24
const relabelOc = (o) => ({ ...o, data: o.data.replace(/<Participant\b[^>]*\/>/, ident24) });
const donorOc = donorRun.out.filter((o) => o.type === 'OnCourse').map(relabelOc);
const donorStart = donorOc.find((o) => /dtStart="[^"]+"/.test(o.data)).t;
const donorFin = donorOc.find((o) => /dtFinish="[^"]+"/.test(o.data)).t;
const ownLastOc = [...own.out].reverse().find((o) => o.type === 'OnCourse');
// the Results message of the donor's first row carrying a time
const donorRowRec = donorRun.out.find((o) => o.type === 'Results' && /Time="[0-9.]+"/.test(o.data));
const donorXmlFirst = donorRun.out.find((o) => o.src === 'xml' && /<Time>\d+<\/Time>/.test(o.data));
if (!donorRowRec || !donorXmlFirst) throw new Error('donor anchors not found');
const ownTcpRow = own.out.filter((o) => o.type === 'Results').find((o) => o.data.includes('IRM="DNF"'));
const ownXmlRow = own.out.filter((o) => o.src === 'xml').find((o) => /<Status>DNF<\/Status>/.test(o.data));

const withDnf = (text) => text.replace(/IRM=""/, 'IRM="DNF"');
const relabelDonorRow = (data, ptag) => data.replace(/<Participant\b[^>]*\/>/, ptag).replace(/IRM=""/, 'IRM="DNF"');

function dnfFixture(name, rowMovedAfterFinish) {
  const rowAt = rowMovedAfterFinish ? donorFin + (donorFin - donorRowRec.t) : donorRowRec.t;
  const out = [];
  // own records: listings and the DNF rows, as recorded, up to the donor's first row with a time; the DNF row keeps being pushed
  for (const o of own.out) {
    if (o.type === 'OnCourse') out.push(o);
    else if (o.type === 'Results') { if (o.t < rowAt) out.push(o); }
    else if (o.src === 'xml') { if (o.t < donorXmlFirst.t) out.push(o); }
    else out.push(o);
  }
  // the donor's listings as bib 24's new run
  for (const o of donorOc) out.push(o);
  // the donor's Results messages: the Row without a time (start list, running) is not carried: the pushes of the real stream
  // before the donor's row keep bib 24's recorded DNF row, one Row per message; from the first row with a time the donor's rows,
  // relabelled and keeping the standing DNF mark
  const ptag24 = rowsOf(own.out.find((o) => o.type === 'Results' && !o.absent).data)[0].ptag;
  for (const o of donorRun.out) {
    if (o.type !== 'Results') continue;
    const moved = o === donorRowRec ? rowAt : o.t;
    if (moved < rowAt && o !== donorRowRec) continue; // pushes before the donor's row: bib 24's own DNF rows (above) stand
    out.push({ ...o, t: moved, data: relabelDonorRow(o.data, ptag24) });
  }
  // the donor's XML rows from its first row with a time, relabelled and keeping Status DNF
  const xmlParts24 = xmlParts(own.out.find((o) => o.src === 'xml').data, { ...J });
  for (const o of donorRun.out) {
    if (o.src !== 'xml' || o.t < donorXmlFirst.t) continue;
    const parts = xmlParts(o.data, donor);
    const row = parts.results[0]
      .replace(/<Id>[^<]*<\/Id>/, `<Id>${id24}</Id>`)
      .replace(/<StartOrder>[^<]*<\/StartOrder>/, `<StartOrder>${attr(ident24, 'StartOrder')}</StartOrder>`)
      .replace(/<Bib>[^<]*<\/Bib>/, `<Bib>${(inner(ownXmlRow ? xmlParts(ownXmlRow.data, J).results[0] : '', 'Bib'))}</Bib>`)
      .replace(/<Status \/>|<Status><\/Status>/, '<Status>DNF</Status>');
    out.push({ ...o, data: xmlDoc(xmlParts24, [row]) });
  }
  return out;
}

const dnfEdits = (extra) => [
  'trimmed to one Attempt as the other fixtures (see nkz-bib7-row-before); Results messages keep only one Row',
  `kept as recorded: bib ${J.bib}'s on-course listings up to the DNF (start 14:59:01.040 listed 2026-04-18T12:59:01Z, last listing 13:01:00Z), the XML row with Status DNF (13:01:33Z) and every TCP push of its DNF row (Pen 100, no Time) up to the new finish`,
  `added: the run-${J.bib === '24' ? 2 : 2} listings, copied from bib ${DONOR}'s recorded run of the same race (start listed 13:02:59.807Z, finish listing 13:04:37.037Z, closure) with the Participant tag replaced by bib ${J.bib}'s; no wizard wipe: bib ${J.bib}'s DNF row keeps being pushed unchanged until the donor's row replaces it`,
  `added: the run-2 result rows, copied from bib ${DONOR}'s recorded TCP Row and XML Results row (Time, Pen, Gates, Rank, dtFinish) with the identity replaced by bib ${J.bib}'s and the DNF mark KEPT (IRM="DNF", Status DNF): upstream overwrites the finish and not the mark (DERIVATIONS 4.11 intro, 4.12 "stale mark"; "an old DNF is not cleared even then")`,
  `removed: bib ${DONOR}'s own records (its Row, listings and XML row stand only as bib ${J.bib}'s run 2); every later TCP push and XML snapshot carries the run-2 row`,
  ...extra,
];
const J_SRC = { recording: J.rec, window: [J.from, J.to], attempt: `${J.race}:${J.bib}`, donor: `${J.race}:${DONOR}` };

const dnfBefore = dnfFixture('dnf-rerun-row-before', false);
write(join(outRoot, 'dnf-rerun-row-before'), J, dnfBefore, {
  name: 'dnf-rerun-row-before',
  synthetic: true,
  source: J_SRC,
  order: `row before the finish listing (as recorded for bib ${DONOR}: the TCP row ${iso(donorRowRec.t)} precedes the listing ${iso(donorFin)})`,
  edits: dnfEdits(['no record moved']),
});
const dnfAfter = dnfFixture('dnf-rerun-row-after', true);
write(join(outRoot, 'dnf-rerun-row-after'), J, dnfAfter, {
  name: 'dnf-rerun-row-after',
  synthetic: true,
  source: J_SRC,
  order: 'row after the finish listing (the 28 % order)',
  edits: dnfEdits([
    `moved: the TCP Results record of the run-2 row from ${iso(donorRowRec.t)} (${donorFin - donorRowRec.t} ms before the finish listing) to ${iso(donorFin + (donorFin - donorRowRec.t))} (the same gap after it); content unchanged. Matches upstream: the two pushes of one finish arrive in either order (DERIVATIONS 4.4)`,
  ]),
});

// =====================================================================================================================
// nkz-19so K1W_BR1_19 bib 53: a DNS standing on TCP when the start is listed; a later changed start is a correction (row 5)
// =====================================================================================================================
const M = { rec: '2026-09-19-2026-nkz-19so', race: 'K1W_BR1_19', bib: '53', id: null, classId: 'K1W', from: '2026-09-19T12:50:00.000Z', to: '2026-09-19T12:58:00.000Z' };
for (const r of records(M.rec, M.from, M.to)) {
  if (r.src === 'tcp' && r.type === 'OnCourse') { const oc = onCourseOf(r.data); if (oc && oc.bib === M.bib && oc.race === M.race) { M.id = attr(oc.tag, 'Id'); break; } }
}
const CORRECT_AT = P('2026-09-19T12:54:20.000Z');
const NEW_START = '14:53:40.140';
let firstCorrected;
const mark = excerpt(M, {
  onCourse: (r) => {
    if (r.t < CORRECT_AT || !/dtStart="14:53:40.200"/.test(r.data)) return r;
    firstCorrected ??= r.t;
    return { ...r, data: r.data.replace('dtStart="14:53:40.200"', `dtStart="${NEW_START}"`) };
  },
});
write(join(outRoot, 'mark-at-start-then-correction'), M, mark.out, {
  name: 'mark-at-start-then-correction',
  synthetic: true,
  source: { recording: M.rec, window: [M.from, M.to], attempt: `${M.race}:${M.bib}` },
  order: 'a TCP DNS row standing (2026-09-19T12:53:29.312Z) when the start is listed (12:53:49.355Z, dtStart 14:53:40.200); the athlete raced and finished 12:55:24Z',
  note: 'no recording holds a DNF standing at a start; the eight recorded Attempts that reached their first start with a mark on the table all hold a DNS or CAP (DERIVATIONS 4.11, third pass). This is the closest recorded shape: the mark is a result mark that sets status (4.1)',
  edits: [
    'trimmed to one Attempt as the other fixtures',
    `edited: from ${iso(firstCorrected)} on, every on-course listing of the Attempt (running and the finish listing and the closure) carries dtStart="${NEW_START}" instead of "14:53:40.200": a start moved 60 ms earlier mid-run with no finish, the recorded shape of the seven start changes (DERIVATIONS 4.11 table: K1W_BR2_19:9, K1M_BR1_20:115, jarni-so-do K1M_BR1_18:138). Time and dtFinish cells are left as recorded (the 60 ms is inside the whole-second clock the running listings show; the finish Time 103.86 is not recomputed)`,
    'no row added, moved or removed',
  ],
});

// =====================================================================================================================
// jarni-so-odp K1W_BR1_18 bib 25: a recorded TIMED finish, then a non-wizard re-run with no wipe (#207 round 27g Q4)
// =====================================================================================================================
function timedFixture(name, rowMovedAfterFinish) {
  const T25 = { ...J, bib: '25', id: null };
  let tag25;
  for (const r of records(T25.rec, T25.from, T25.to)) {
    if (r.src === 'tcp' && r.type === 'OnCourse') { const oc = onCourseOf(r.data); if (oc && oc.bib === '25' && oc.race === T25.race) { tag25 = oc.tag; break; } }
  }
  T25.id = attr(tag25, 'Id');
  const mine = excerpt(T25);
  const don = excerpt(donor);
  const dOc = don.out.filter((o) => o.type === 'OnCourse').map((o) => ({ ...o, data: o.data.replace(/<Participant\b[^>]*\/>/, tag25) }));
  const dFin = dOc.find((o) => /dtFinish="[^"]+"/.test(o.data)).t;
  const dRow = don.out.find((o) => o.type === 'Results' && /Time="[0-9.]+"/.test(o.data));
  const dXml = don.out.find((o) => o.src === 'xml' && /<Time>\d+<\/Time>/.test(o.data));
  const rowAt = rowMovedAfterFinish ? dFin + (dFin - dRow.t) : dRow.t;
  const out = [];
  // bib 25's own records as recorded: the finish at 13:01:42Z and the timed row, pushed on every rotation, until the donor's row
  for (const o of mine.out) {
    if (o.type === 'OnCourse') { if (o.t < dOc[0].t) out.push(o); }
    else if (o.type === 'Results') { if (o.t < rowAt) out.push(o); }
    else if (o.src === 'xml') { if (o.t < dXml.t) out.push(o); }
    else out.push(o);
  }
  for (const o of dOc) out.push(o);
  const ptag = rowsOf(mine.out.find((o) => o.type === 'Results' && !o.absent).data)[0].ptag;
  for (const o of don.out) {
    if (o.type !== 'Results') continue;
    const moved = o === dRow ? rowAt : o.t;
    if (moved < rowAt && o !== dRow) continue;
    out.push({ ...o, t: moved, data: o.data.replace(/<Participant\b[^>]*\/>/, ptag) });
  }
  const parts25 = xmlParts(mine.out.find((o) => o.src === 'xml').data, T25);
  const bib25 = inner(parts25.results[0], 'Bib');
  for (const o of don.out) {
    if (o.src !== 'xml' || o.t < dXml.t) continue;
    const row = xmlParts(o.data, donor).results[0]
      .replace(/<Id>[^<]*<\/Id>/, `<Id>${T25.id}</Id>`)
      .replace(/<StartOrder>[^<]*<\/StartOrder>/, `<StartOrder>${attr(tag25, 'StartOrder')}</StartOrder>`)
      .replace(/<Bib>[^<]*<\/Bib>/, `<Bib>${bib25}</Bib>`);
    out.push({ ...o, data: xmlDoc(parts25, [row]) });
  }
  write(join(outRoot, name), T25, out, {
    name,
    synthetic: true,
    source: { recording: T25.rec, window: [T25.from, T25.to], attempt: `${T25.race}:25`, donor: `${T25.race}:${DONOR}` },
    order: rowMovedAfterFinish ? 'run-2 row after the finish listing (the 28 % order)' : `run-2 row before the finish listing (as recorded for bib ${DONOR})`,
    edits: [
      'trimmed to one Attempt as the other fixtures; Results messages keep only one Row',
      'kept as recorded: bib 25\'s run (start 12:59:40Z, finish listing 13:01:42.376Z), its timed TCP row and XML row, pushed on every rotation after the finish with the rank as recorded (the rank moves as others finish; the Time, Pen and gates do not)',
      `added: the re-run listings, copied from bib ${DONOR}'s recorded run of the same race (start listed 13:02:59.807Z, finish listing 13:04:37.037Z) with bib 25's Participant tag: staged and started again with no wizard wipe, so the old timed row is pushed unchanged through run 2 until the new finish (DERIVATIONS 4.11 intro: "the old result stays in every push until the new finish overwrites it")`,
      `added: the run-2 result rows, copied from bib ${DONOR}'s recorded TCP Row and XML Results row with bib 25's identity; no mark (the old row carried none)`,
      `removed: bib ${DONOR}'s own records`,
      rowMovedAfterFinish ? `moved: the run-2 TCP Results record from ${iso(dRow.t)} to ${iso(rowAt)}, the same gap after the finish listing (${iso(dFin)}); content unchanged` : 'no record moved',
    ],
  });
}
timedFixture('timed-rerun-row-before', false);
timedFixture('timed-rerun-row-after', true);
console.log('built', outRoot);
