// Spike S2 admission: the TEST-ARCHITECTURE §3.2 gates over a candidate fixture, written as its `admitted` block.
//   node admit.mjs --candidate <c1.json> --candidate2 <c2.json> --run1 <dir> --run2 <dir> --checker <json>
//                  --excerpt <dir> --recording <dir> --schema <fixture-admitted.schema.json> --out <fixture.json>
//                  --report <gate3.json>
// Gate 1: S1's two step logs and final states, and the two candidates projected from them, byte-identical.
// Gate 2: S1's checker found no violation. Gate 3 (mechanical, TEST-ARCHITECTURE §3.2 round 10): for every Attempt that
// finished inside the window, the fixture's final presented outcome, gates, placement and pairTotal against its row in
// upstream's XML at the window end (the window's last snapshot), read here independently of S1 (DERIVATIONS §0.1,
// §4.4, §4.6(b), §4.7 units); a field whose day-final value differs is listed as changed after the window. The human
// line is never written by this tool: it stays a TODO until the maintainer confirms the final XML against the
// published results. The block is validated against schemas/fixture-admitted.schema.json before it is written.
import { createReadStream, createWriteStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { ClientState, canonical, compareStates, excerptMeta, sha256 } from './fold.mjs';

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i < 0) throw new Error(`missing --${n}`);
  return process.argv[i + 1];
};
const fileSha = (p) => sha256(readFileSync(p));

/** The JSON Schema subset fixture-admitted.schema.json uses: type, required, properties, additionalProperties,
 *  items, minItems/maxItems, minimum, pattern. Returns the list of violations. */
function validate(sc, v, at) {
  const out = [];
  const t = sc.type;
  const ok = t === 'object' ? v && typeof v === 'object' && !Array.isArray(v) : t === 'array' ? Array.isArray(v)
    : t === 'integer' ? Number.isInteger(v) : t === undefined ? true : typeof v === t;
  if (!ok) return [`${at}: not ${t}`];
  if (t === 'object') {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}.${k}: missing`);
    for (const [k, x] of Object.entries(v)) {
      if (sc.properties?.[k]) out.push(...validate(sc.properties[k], x, `${at}.${k}`));
      else if (sc.additionalProperties === false) out.push(`${at}.${k}: not allowed`);
      else if (typeof sc.additionalProperties === 'object') out.push(...validate(sc.additionalProperties, x, `${at}.${k}`));
    }
  }
  if (t === 'array') {
    if (sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
    if (sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
    if (sc.items) v.forEach((x, i) => out.push(...validate(sc.items, x, `${at}[${i}]`)));
  }
  if (sc.minimum !== undefined && v < sc.minimum) out.push(`${at}: below ${sc.minimum}`);
  if (sc.pattern && !new RegExp(sc.pattern).test(v)) out.push(`${at}: does not match ${sc.pattern}`);
  return out;
}

async function* lines(path) {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l;
}

// ───────── the XML snapshot, read independently of S1 ─────────

function tables(xml) {
  const rows = (tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => {
    const o = {};
    for (const c of m[1].matchAll(/<(\w+)>([^<]*)<\/\1>|<(\w+) \/>/g)) o[c[1] ?? c[3]] = c[2] ?? '';
    return o;
  });
  return { results: rows('Results'), schedule: rows('Schedule'), courses: rows('CourseData') };
}

const ms = (x) => (x === null || x === undefined ? x : Math.round(x * 1000));
const num = (s) => (s === undefined || s.trim() === '' ? null : Number(s.trim()));

/** The four compared fields of one XML row, in contract units. Second runs read the combined columns (§4.7). */
function xmlFields(row, gateCount) {
  const second = /_BR2_/.test(row.RaceId);
  const status = (row.Status ?? '').trim();
  const time = num(row.Time), pen = num(row.Pen), total = num(row.Total);
  let outcome = null;
  if (status && status !== '*') outcome = { kind: 'no-result', status: status.toLowerCase() };
  else if (time !== null) outcome = { kind: 'duration', run: ms(time / 1000), pen: ms(pen), total: ms(total / 1000) };
  let gates = null;
  if ((row.Gates ?? '').trim() !== '') {
    gates = [];
    for (let i = 0; i < gateCount; i++) gates.push(num(row.Gates.slice(3 * i, 3 * i + 3)));   // §4.6(b): 3 chars per cell
  }
  const rank = num(second ? row.TotalRnk : row.Rnk), order = num(second ? row.TotalRnkOrder : row.RnkOrder);
  const placement = order === null ? null : { rank, order };
  const tt = second ? num(row.TotalTotal) : null;
  return { outcome, gates, placement, pairTotal: tt === null ? null : ms(tt / 1000) };
}

/** The same four fields as the fixture presents them. Anything not `known` compares as null. */
function fixtureFields(a) {
  const k = (f) => (a[f]?.state === 'known' ? a[f].value : null);
  const o = k('outcome');
  let outcome = null;
  if (o?.kind === 'duration') outcome = { kind: 'duration', run: ms(o.runSeconds), pen: ms(o.penaltySeconds), total: ms(o.totalSeconds) };
  else if (o?.kind === 'no-result') outcome = { kind: 'no-result', status: o.status };
  else if (o) outcome = { kind: o.kind };
  const g = k('gates');
  const p = k('placement');
  const pt = k('pairTotal');
  return {
    outcome,
    gates: g ? [...g].sort((x, y) => x.number - y.number).map((x) => x.penalty) : null,
    placement: p ? { rank: p.rank, order: p.order } : null,
    pairTotal: pt === null ? null : ms(pt),
  };
}

function lastXml(path, perLine) {
  let last = null;
  return (async () => {
    for await (const l of lines(path)) {
      if (!l.includes('"src":"xml"')) continue;
      const r = JSON.parse(l);
      if (r.src === 'xml' && r.type === 'XmlSnapshot') last = perLine(r);
    }
    return last;
  })();
}

async function main() {
  const candidate = arg('candidate'), excerpt = arg('excerpt'), recording = arg('recording');
  const meta = excerptMeta(excerpt);
  const recManifest = JSON.parse(readFileSync(join(recording, 'manifest.json'), 'utf8'));
  const recStart = Date.parse(recManifest.chunks[0].startTime) - recManifest.chunks[0].startOffset;
  const windowFrom = new Date(recStart + meta.source.from).toISOString();
  const windowTo = new Date(recStart + meta.source.to).toISOString();

  // ── consumer fold of the candidate: hydration bodies, then every delta after asOfSeq
  const it = lines(candidate);
  const first = (await it.next()).value;
  const header = JSON.parse(first.slice(0, -',"steps":['.length) + '}');
  let client = null, asOfSeq = null, lastSeq = -Infinity, seqOk = true, firstAboveAsOf = null, deltas = 0;
  // "Finished inside the window": the fixture presents `status: finished` from `tcp` with a finish eventTime, i.e. a
  // dtFinish seen on the on-course stream, which the replay only carries for the window. The cold-start XML also
  // presents `finished` with an eventTime for every earlier finisher; those have source `xml` and do not count.
  const finished = new Map();      // attemptId → { observedAt of that step, finish eventTime }
  const finishOf = (env) => (env?.state === 'known' && env.value === 'finished' && env.source === 'tcp' && env.eventTime ? env.eventTime : null);
  for await (const raw of it) {
    if (raw === ']}') break;
    const s = JSON.parse(raw.endsWith(',') ? raw.slice(0, -1) : raw);
    if (s.kind === 'hydration') {
      asOfSeq = s.asOfSeq;
      client = ClientState.fromResponses(s.responses);
      for (const a of client.attempts.values()) if (finishOf(a.status)) finished.set(a.attemptId, { observedAt: s.observedAt, finish: finishOf(a.status) });
      continue;
    }
    deltas++;
    if (firstAboveAsOf === null) firstAboveAsOf = s.seq > asOfSeq;
    if (!(s.seq > lastSeq)) seqOk = false;
    lastSeq = s.seq;
    client.apply(s);
    const st = s.type === 'attempt.updated' ? s.fields?.status : null;
    const f = finishOf(st);
    if (f && !finished.has(s.attemptId)) finished.set(s.attemptId, { observedAt: s.observedAt, finish: f });
  }
  const { seq: _s, ...s1Final } = JSON.parse(readFileSync(join(arg('run1'), 'final-state.json'), 'utf8'));
  const consumerFold = compareStates(client.presented(), s1Final);

  // ── gate 1
  const h = {
    steps: [fileSha(join(arg('run1'), 'steps.jsonl')), fileSha(join(arg('run2'), 'steps.jsonl'))],
    finalState: [fileSha(join(arg('run1'), 'final-state.json')), fileSha(join(arg('run2'), 'final-state.json'))],
    candidate: [fileSha(candidate), fileSha(arg('candidate2'))],
  };
  const gate1 = Object.values(h).every(([a, b]) => a === b);

  // ── gate 2
  const ck = JSON.parse(readFileSync(arg('checker'), 'utf8'));
  const violations = Object.fromEntries(ck.properties.map((p) => [`P${p.property}`, p.violations]));
  const gate2 = ck.properties.length === 15 && ck.properties.every((p) => p.violations === 0);

  // ── gate 3, mechanical part
  const lastChunk = recManifest.chunks.at(-1);
  const finalXml = await lastXml(join(recording, lastChunk.file), (r) => ({
    data: r.data, at: new Date(Date.parse(lastChunk.startTime) + r.ts).toISOString(), file: lastChunk.file, ts: r.ts }));
  const endXml = await lastXml(join(excerpt, 'data.jsonl'), (r) => ({ data: r.data, at: new Date(recStart + meta.source.from + r.ts).toISOString(), ts: r.ts }));
  const fin = tables(finalXml.data), end = tables(endXml.data);
  const gateCountOf = (t, raceId) => {
    const cn = (t.schedule.find((s) => s.RaceId === raceId)?.CourseNr ?? '').trim();
    const cfg = t.courses.find((c) => (c.CourseNr ?? '').trim() === cn)?.CourseConfig ?? '';
    return [...cfg].filter((c) => c === 'N' || c === 'R').length;
  };
  const rowOf = (t, raceId, bib) => t.results.find((r) => r.RaceId === raceId && (r.Bib ?? '').trim() === bib);
  const rows = [], counts = { attempts: finished.size, fields: 0, match: 0, mismatch: 0, changedAfterWindow: 0, changedAfterWindowEqualsWindowEnd: 0, noFinalRow: 0 };
  for (const [id, at] of [...finished].sort(([x], [y]) => (x < y ? -1 : 1))) {
    const a = client.attempts.get(id), raceId = a.phaseId, bib = a.bib;
    const fRow = rowOf(fin, raceId, bib), eRow = rowOf(end, raceId, bib);
    if (!fRow || !eRow) { counts.noFinalRow++; rows.push({ attemptId: id, ...at, result: fRow ? 'no-window-end-row' : 'no-final-row' }); continue; }
    const gc = gateCountOf(end, raceId);
    const fx = fixtureFields(a), ev = xmlFields(eRow, gc), fv = xmlFields(fRow, gateCountOf(fin, raceId));
    const fields = {};
    // match + mismatch count the comparison with the window end; changedAfterWindow lists every field whose day-final
    // value differs from the window end, and changedAfterWindowEqualsWindowEnd those of them the fixture matches.
    for (const f of ['outcome', 'gates', 'placement', 'pairTotal']) {
      counts.fields++;
      const atEnd = canonical(fx[f]) === canonical(ev[f]), changed = canonical(fv[f]) !== canonical(ev[f]);
      if (!atEnd) counts.mismatch++;
      else if (!changed) counts.match++;
      if (changed) { counts.changedAfterWindow++; if (atEnd) counts.changedAfterWindowEqualsWindowEnd++; }
      fields[f] = atEnd && !changed ? 'match'
        : { verdict: atEnd ? 'changed-after-window' : 'mismatch', fixture: fx[f], windowEndXml: ev[f], ...(changed ? { finalXml: fv[f] } : {}) };
    }
    rows.push({ attemptId: id, ...at, gateCount: gc, fields });
  }
  const report = {
    window: { from: windowFrom, to: windowTo },
    finalXml: { chunk: finalXml.file, ts: finalXml.ts, detectedAt: finalXml.at, sha256: sha256(finalXml.data), bytes: Buffer.byteLength(finalXml.data) },
    windowEndXml: { ts: endXml.ts, detectedAt: endXml.at, sha256: sha256(endXml.data) },
    units: 'XML Time/Total/TotalTotal ms ÷ 1000, Pen s, Gates 3-char cells (first N+R of CourseConfig), Rnk/RnkOrder or TotalRnk/TotalRnkOrder on BR2; compared at 1 ms',
    counts, rows,
  };
  const reportText = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(arg('report'), reportText);

  const admitted = {
    gate1,
    gate2,
    gate3: {
      mechanical: { ...counts, report: { file: arg('report').split('/').pop(), sha256: sha256(reportText) } },
      human: `TODO(maintainer): confirm that the final XML snapshot of 2026-09-19 (recording 2026-09-19-2026-nkz-19so, ${finalXml.file} ts ${finalXml.ts}, sha256 ${report.finalXml.sha256}) equals the published results of the day (CONTRACTS §2.8), then replace this string with "human-checked-<date> by <name>"`,
    },
    evidence: {
      gate1: { stepLogSha256: h.steps, finalStateSha256: h.finalState, candidateSha256: h.candidate },
      gate2: { checker: 'spike/S1/src/checker.ts', violations },
    },
  };
  const problems = validate(JSON.parse(readFileSync(arg('schema'), 'utf8')), admitted, 'admitted');
  if (problems.length) throw new Error(`admitted block does not follow the schema: ${problems.join('; ')}`);
  const out = createWriteStream(arg('out'));
  const head = JSON.stringify({ fixtureId: header.fixtureId, source: header.source, domainLayerVersion: header.domainLayerVersion, admitted, asOfSeq: header.asOfSeq });
  out.write(head.slice(0, -1) + ',"steps":[\n');
  let n = 0;
  for await (const l of lines(candidate)) if (n++ > 0) out.write(l + '\n');
  await new Promise((res) => out.end(res));
  const fixtureSha = fileSha(arg('out'));
  writeFileSync(arg('out') + '.sha256', `${fixtureSha}  ${arg('out').split('/').pop()}\n`);

  console.log(JSON.stringify({ gate1, gate2, violations, counts, consumerFold, seqOk, firstAboveAsOf, deltas, fixtureSha256: fixtureSha }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
