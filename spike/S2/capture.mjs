// Spike S2 capture tool: projects S1's step log onto the TEST-ARCHITECTURE §4 fixture format (a candidate:
// no `admitted` block; admit.mjs adds it). Usage:
//   node capture.mjs --steps <steps.jsonl> --excerpt <dir> --fixture-id <id> --version-from <UnifiedServer.ts>
//                    --out <candidate.json> [--final-state <final-state.json>] [--summary <json>]
// The hydration step is the client state after the window's cold-start XML snapshot (every step up to and
// including the last scope snapshot of the first valid XML read), as §7.1 bodies; then every later delta with
// its seq and the recorded observedAt of the element that produced it. One step per line, so admit.mjs and a
// consumer can stream it.
import { createReadStream, createWriteStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { ClientState, compareStates, excerptMeta, sortDeep } from './fold.mjs';

const arg = (n, def) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i < 0) { if (def !== undefined) return def; throw new Error(`missing --${n}`); }
  return process.argv[i + 1];
};

async function main() {
  const meta = excerptMeta(arg('excerpt'));
  const version = /const VERSION = '([^']+)'/.exec(readFileSync(arg('version-from'), 'utf8'))?.[1];
  if (!version) throw new Error('no VERSION constant found');
  const header = {
    fixtureId: arg('fixture-id'),
    source: { kind: 'recording', excerpt: `${meta.source.recording}#${meta.source.from}-${meta.source.to}`, sha256: meta.checksum.replace(/^sha256:/, '') },
    domainLayerVersion: version,
    asOfSeq: 0,           // the counter before the window's first element: the replay starts cold
  };
  const out = createWriteStream(arg('out'));
  const head = JSON.stringify(header);
  out.write(head.slice(0, -1) + ',"steps":[\n');

  const client = new ClientState(), full = new ClientState();
  let phase = 'pre', group = null, counter = 0, seqModelOk = true, first = true, hydration = null;
  const stats = { steps: 0, deltasBeforeHydration: 0, fixtureDeltas: 0, byType: {}, bytes: 0 };
  const emit = (obj) => {
    const line = JSON.stringify(obj);
    stats.bytes += line.length + 2;
    out.write((first ? '' : ',\n') + line);
    first = false;
  };
  const hydrate = () => {
    hydration = { step: group.lastStep, observedAt: group.observedAt, asOfSeq: counter };
    emit({ kind: 'hydration', observedAt: group.observedAt, asOfSeq: counter, responses: sortDeep(client.responses(counter)) });
    phase = 'post';
  };

  const rl = createInterface({ input: createReadStream(arg('steps'), 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const r = JSON.parse(line), el = r.element;
    stats.steps++;
    if (phase === 'group') {
      const inGroup = el.source === 'xml' && el.observedAt === group.observedAt && (el.class === 'observation' || el.class === 'scope-snapshot');
      if (inGroup) { if (el.what === 'xml-structure') group.structure = true; group.lastStep = r.step; }
      else if (group.structure) hydrate();
      else phase = 'pre';                                     // that read did not validate: wait for the next one
    }
    if (phase === 'pre' && el.class === 'event' && el.event === 'xml-rewrite-detected') {
      phase = 'group'; group = { observedAt: el.observedAt, structure: false, lastStep: r.step };
    }
    // S1's counter: one seq per element, then one per delta (merge.ts apply/pushDelta). Checked, not assumed.
    counter++;
    for (const d of r.deltas) {
      if (d.seq !== ++counter) { seqModelOk = false; counter = d.seq; }
      full.apply(d);
      if (phase === 'post') {
        const { seq, type, ...rest } = d;
        emit({ seq, observedAt: el.observedAt, type, ...sortDeep(rest) });
        stats.fixtureDeltas++;
        stats.byType[type] = (stats.byType[type] ?? 0) + 1;
      } else { client.apply(d); stats.deltasBeforeHydration++; }
    }
  }
  if (phase === 'group' && group.structure) hydrate();
  if (!hydration) throw new Error('no valid cold-start XML snapshot in the window');
  out.write('\n]}\n');
  await new Promise((res) => out.end(res));

  const summary = { header, hydration, seqModelOk, finalCounter: counter, ...stats, unknownTypes: full.unknownTypes };
  // Self-check: the whole delta stream of the step log, folded as a client would, reproduces S1's final state.
  if (process.argv.includes('--final-state')) {
    const { seq, ...s1 } = JSON.parse(readFileSync(arg('final-state'), 'utf8'));
    summary.foldAllVsFinalState = compareStates(full.presented(), s1);
    summary.finalStateSeqMatchesCounter = seq === counter;
  }
  summary.orphanAttempts = [...client.attempts.values()].filter((a) => !client.phases.has(a.phaseId)).map((a) => a.attemptId);
  const text = JSON.stringify(summary, null, 2) + '\n';
  if (process.argv.includes('--summary')) writeFileSync(arg('summary'), text);
  process.stdout.write(text);
}

main().catch((e) => { console.error(e); process.exit(1); });
