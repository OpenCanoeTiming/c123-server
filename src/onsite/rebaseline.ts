/** Re-baseline of the on-site process (#397; CONTRACTS §4, §7.1): one fresh read of the XML snapshot, applied as one unit inside the queue. */
import { XMLValidator } from 'fast-xml-parser';
import { parseXmlSnapshot, type IngestContext, type IngestElement } from '../ingest/index.js';
import type { RebaselineOutcome, RebaselineScope } from './app.js';
import { phaseOfAttempt } from './wire.js';
import { enqueue, type OnsiteContext } from './context.js';
import { processUnit } from './units.js';

const ROOT_CLOSE = '</Canoe123Data>';

export async function rebaseline(cx: OnsiteContext, scope: RebaselineScope): Promise<RebaselineOutcome> {
  const { opts, fs, clock } = cx;
  return (await enqueue(cx, async (): Promise<RebaselineOutcome> => {
    if (scope.kind === 'phase' && !cx.core.phaseIds().includes(scope.phaseId)) return { ok: false, status: 404, code: 'phase-not-found' };
    const unavailable = (reason: 'not-configured' | 'unreadable' | 'invalid'): RebaselineOutcome => ({ ok: false, status: 409, code: 'source-unavailable', reason });
    if (opts.xml === undefined) return unavailable('not-configured');
    let sig: { mtimeMs: number; size: number };
    let text: string;
    try {
      sig = await fs.stat(opts.xml.path);
      text = await fs.read(opts.xml.path);
    } catch { return unavailable('unreadable'); }
    const at = clock.now();
    const stamp = new Date(at).toISOString();
    const ctx: IngestContext = { ...cx.tracker.ctx, observedAt: stamp };
    const els = text.includes(ROOT_CLOSE) && XMLValidator.validate(text) === true ? parseXmlSnapshot(text, ctx) : undefined;
    if (els === undefined || els.some((e) => 'unparseable' in e)) return unavailable('invalid');
    // §4 step 2: the read has its own ingest sequence; its content age by DERIVATIONS §0.3, from the reader's successful stats
    const changedAfter = cx.reader.changedAfterFor(sig);
    const unitEls: IngestElement[] = [
      { ingestSeq: 0, event: 'rebaseline', observedAt: stamp, scope },
      { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: stamp, changedAfter },
      ...els,
    ];
    cx.tracker.learn(els, true);
    await processUnit(cx, unitEls);
    const ids = cx.core.attempts();
    const attempts = scope.kind === 'event' ? ids.length : ids.filter((a) => phaseOfAttempt(a) === scope.phaseId).length;
    return { ok: true, body: { asOfSeq: cx.seq.current(), scope, snapshotWrittenAt: new Date(sig.mtimeMs).toISOString(), snapshotDetectedAt: stamp, attempts } };
  })) ?? { ok: false, status: 409, code: 'source-unavailable', reason: 'unreadable' }; // the process was killed under the request
}
