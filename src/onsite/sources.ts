/**
 * Sources of the on-site process (#397): the TCP source and discovery, the XML reader, `SourceStatus` and its heartbeat.
 * What a source delivers goes to `unit`, the unit pipeline's entry, given by the caller.
 */
import { createXmlReader, parseTcp, type IngestElement } from '../ingest/index.js';
import { TcpSource } from '../sources/TcpSource.js';
import type { Source } from '../sources/types.js';
import { background, emit, HEARTBEAT_SECONDS, type OnsiteContext } from './context.js';
import type { J } from './wire.js';

const DEFAULT_TCP_PORT = 27333;
const mapTcpState = (s: string): 'connected' | 'reconnecting' => (s === 'connected' ? 'connected' : 'reconnecting');

export const sourcesNow = (cx: OnsiteContext): J => ({
  tcp: { state: cx.tcpState, upstreamInstance: cx.upstreamInstance, timingClockOffsetSeconds: cx.timingClockOffsetSeconds },
  xml: { state: cx.xmlStatus.state, lastRewriteDetectedAt: cx.xmlStatus.lastRewriteDetectedAt },
  live: { state: 'not-configured', pendingResources: 0, lastAcceptedAt: null, lastError: null },
});
/** `sources.updated` when `SourceStatus` changed since the last one sent. */
export function sourcesChange(cx: OnsiteContext): J[] {
  const sources = sourcesNow(cx);
  const text = JSON.stringify(sources);
  if (text === cx.sourcesSent) return [];
  cx.sourcesSent = text;
  return [{ type: 'sources.updated', sources }];
}

/** Attaches the TCP source given or configured, and starts discovery where it is in use. */
export function startTcp(cx: OnsiteContext, unit: (elements: IngestElement[]) => void): void {
  const { opts } = cx;
  function onTcpMessage(text: string): void {
    cx.tracker.ctx.observedAt = cx.iso();
    const els = parseTcp(text, cx.tracker.ctx);
    if (els.length === 0) return;
    cx.tracker.learn(els, false);
    unit(els);
  }
  function onTcpStatus(status: string): void {
    cx.tcpState = mapTcpState(status);
    if (status === 'connected' || status === 'disconnected') cx.toFile(`tcp ${status}`);
    const at = cx.iso();
    if (status === 'connected') unit([{ ingestSeq: 0, event: 'tcp-connected', observedAt: at }]);
    else if (status === 'disconnected') {
      unit([{ ingestSeq: 0, event: 'tcp-disconnected', observedAt: at }]);
      if (discoveryInUse) opts.discovery?.reset();
    } else background(cx, async () => { await emit(cx, sourcesChange(cx)); });
  }

  const tcpOpt = opts.tcp;
  const given = tcpOpt !== undefined && 'source' in tcpOpt;
  const hostOpt = tcpOpt !== undefined && !('source' in tcpOpt) ? tcpOpt.host : undefined;
  // legacy rule (`src/server.ts`): discovery runs only while no TCP host is configured
  const discoveryInUse = opts.discovery !== undefined && opts.discovery !== null && !given && hostOpt === undefined;
  const makeSource = (host: string, port: number): Source => (tcpOpt !== undefined && !('source' in tcpOpt) && tcpOpt.create !== undefined ? tcpOpt.create(host, port) : new TcpSource({ host, port }));
  function attach(src: Source): void {
    if (cx.tcp !== undefined && cx.tcp !== src) cx.tcp.stop();
    cx.tcp = src;
    src.on('message', (text) => { if (cx.tcp === src) onTcpMessage(text); });
    src.on('status', (status) => { if (cx.tcp === src) onTcpStatus(status); });
    src.on('error', (e) => { cx.log('tcp source', e); });
    src.start();
  }
  let discoveredHost: string | null = null;
  const tcpPort = tcpOpt !== undefined && !('source' in tcpOpt) ? (tcpOpt.port ?? DEFAULT_TCP_PORT) : DEFAULT_TCP_PORT;
  if (tcpOpt !== undefined && 'source' in tcpOpt) attach(tcpOpt.source);
  else if (hostOpt !== undefined) attach(makeSource(hostOpt, tcpPort));
  if (discoveryInUse && opts.discovery) {
    opts.discovery.on('discovered', (host: string) => {
      if (discoveredHost === host) return; // the source is already reconnecting by itself
      discoveredHost = host;
      attach(makeSource(host, tcpPort));
    });
    opts.discovery.on('error', (e: unknown) => { cx.log('discovery', e); });
    void Promise.resolve(opts.discovery.start()).catch((e: unknown) => { cx.log('discovery', e); });
  }
}

export function startReader(cx: OnsiteContext, unit: (elements: IngestElement[]) => void): void {
  const { opts, clock, fs } = cx;
  cx.reader = createXmlReader({
    path: opts.xml?.path, pollIntervalSeconds: opts.xml?.pollSeconds, clock, fs, ctx: cx.tracker.ctx,
    onUnit: (elements) => {
      cx.tracker.learn(elements, true);
      unit(elements);
    },
    onStatus: (status) => {
      if (status.state !== cx.xmlStatus.state) cx.toFile(`xml ${status.state}`);
      cx.xmlStatus = status;
      background(cx, async () => { await emit(cx, sourcesChange(cx)); });
    },
  });
  cx.reader.start();
}

/** The heartbeat: the one message exempt from the no-op rule (§7.2). */
export const arm = (cx: OnsiteContext): void => {
  cx.beat = cx.clock.setTimeout(() => {
    arm(cx);
    background(cx, async () => {
      const sources = sourcesNow(cx);
      cx.sourcesSent = JSON.stringify(sources);
      await emit(cx, [{ type: 'sources.updated', sources }]);
    });
  }, HEARTBEAT_SECONDS * 1000);
};
