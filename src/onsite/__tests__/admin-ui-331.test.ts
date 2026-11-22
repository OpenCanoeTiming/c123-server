/**
 * #331 part 2: the admin page of the on-site process (src/admin-ui). Evidence: CONTRACTS §7.1 (the routes and their bodies), §1.4
 * (error envelope, `source-unavailable` reason), §2.8 (a missing source must not nag, maintainer answer A1), ARCHITECTURE §6
 * ("A stale value that nothing clears": the operator learns from `snapshotWrittenAt` whether the correction was already in the snapshot).
 * main.js is an ES module whose request building and response-to-view logic are plain exported functions, tested here without a DOM.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, disposeAll } from './onsite-harness.js';
import { ODP } from './datasets.js';
import * as ui from '../../admin-ui/main.js';

afterEach(disposeAll);

const WRITTEN = '2026-04-19T10:15:30.000Z';
const DETECTED = '2026-04-19T10:15:36.000Z';
const ok = { asOfSeq: 7, scope: { kind: 'event' }, snapshotWrittenAt: WRITTEN, snapshotDetectedAt: DETECTED, attempts: 42 };
const envelope = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details !== undefined ? { details } : {}) } });

describe('re-baseline (§7.1)', () => {
  it('the whole event: POST /api/rebaseline with { scope: { kind: "event" } }', () => {
    expect(ui.rebaselineRequest({ kind: 'event' })).toEqual({ method: 'POST', path: '/api/rebaseline', body: { scope: { kind: 'event' } } });
  });

  it('one Phase: the scope carries the phaseId and nothing else', () => {
    expect(ui.rebaselineRequest({ kind: 'phase', phaseId: 'K1M-3', extra: 1 } as never)).toEqual({
      method: 'POST', path: '/api/rebaseline', body: { scope: { kind: 'phase', phaseId: 'K1M-3' } },
    });
  });

  it('200: snapshotWrittenAt comes first and is rendered, then snapshotDetectedAt and attempts (ARCHITECTURE §6)', () => {
    const view = ui.rebaselineView(200, ok);
    expect(view.ok).toBe(true);
    expect(view.lines[0]).toMatchObject({ value: expect.stringContaining('10:15:30') });
    const html = ui.renderRebaselineResult(view);
    expect(html).toContain(WRITTEN);
    expect(html).toContain(DETECTED);
    expect(html).toContain('42');
    expect(html.indexOf(WRITTEN)).toBeLessThan(html.indexOf(DETECTED));
    expect(html).toMatch(/safe to repeat/i);
  });

  it('409 source-unavailable: shows its reason, readable, not as success', () => {
    for (const reason of ['not-configured', 'unreadable', 'invalid']) {
      const view = ui.rebaselineView(409, envelope('source-unavailable', 'the XML snapshot is ' + reason, { reason }));
      expect(view.ok).toBe(false);
      const html = ui.renderRebaselineResult(view);
      expect(html).toContain(reason);
      expect(html).toContain('alert-error');
      expect(html).not.toContain('undefined');
    }
  });

  it('404 phase-not-found and 400 validation-failed are readable errors with the server message', () => {
    const nf = ui.renderRebaselineResult(ui.rebaselineView(404, envelope('phase-not-found', 'no Phase X in this event')));
    expect(nf).toContain('no Phase X in this event');
    const bad = ui.renderRebaselineResult(ui.rebaselineView(400, envelope('validation-failed', 'malformed re-baseline request', [{ field: 'scope', issue: 'must be an object' }])));
    expect(bad).toContain('malformed re-baseline request');
    expect(bad).toContain('scope');
    expect(bad).toContain('must be an object');
  });

  it('a body that is not JSON (or any other status) is still shown as an error with the status', () => {
    const html = ui.renderRebaselineResult(ui.rebaselineView(502, null));
    expect(html).toContain('502');
    expect(html).toContain('alert-error');
  });

  it('the scope choice: the whole event first, then every Phase under its class, labelled by title or format', () => {
    const known = (value: string) => ({ state: 'known', value });
    const classes = [{ classId: 'K1M', name: known('K1 men') }, { classId: 'C1W', name: { state: 'not-yet' } }];
    const phases = {
      K1M: [{ phaseId: 'R-1', classId: 'K1M', format: 'BR1', date: '2026-04-19', title: known('K1 men, 1st run') }],
      C1W: [{ phaseId: 'R-2', classId: 'C1W', format: 'BR2', date: '2026-04-19', title: { state: 'not-yet' } }],
    };
    const options = ui.scopeOptions(classes, phases);
    expect(options[0]).toMatchObject({ scope: { kind: 'event' } });
    expect(options.slice(1).map((o: { scope: unknown }) => o.scope)).toEqual([{ kind: 'phase', phaseId: 'R-1' }, { kind: 'phase', phaseId: 'R-2' }]);
    expect(options[1].label).toContain('K1 men');
    expect(options[2].label).toContain('C1W');
    expect(options[2].label).toContain('BR2');
  });
});

describe('sources (§2.8: a missing source must not nag)', () => {
  const sources = {
    tcp: { state: 'connected', upstreamInstance: 'main', timingClockOffsetSeconds: 0.4 },
    xml: { state: 'not-configured', lastRewriteDetectedAt: null },
    live: { state: 'not-configured', pendingResources: 0, lastAcceptedAt: null, lastError: null },
  };

  it('not-configured sources are quiet: neutral tone, no error or warning styling', () => {
    const rows = ui.sourceRows(sources);
    expect(rows.map((r: { id: string }) => r.id)).toEqual(['tcp', 'xml', 'live']);
    for (const id of ['xml', 'live']) {
      const row = rows.find((r: { id: string }) => r.id === id);
      expect(row).toMatchObject({ quiet: true, tone: 'neutral' });
    }
    const html = ui.renderSources(sources);
    expect(html).toContain('not configured');
    expect(html).not.toMatch(/badge-(error|warning)|alert|text-error|text-warning/);
  });

  it('a configured source that is down is shown as a problem; the connected one as fine', () => {
    const rows = ui.sourceRows({ ...sources, tcp: { state: 'unreachable', upstreamInstance: null, timingClockOffsetSeconds: null }, xml: { state: 'reconnecting', lastRewriteDetectedAt: null } });
    expect(rows[0]).toMatchObject({ quiet: false, tone: 'error' });
    expect(rows[1]).toMatchObject({ quiet: false, tone: 'warning' });
    expect(ui.sourceRows(sources)[0]).toMatchObject({ tone: 'success' });
  });

  it('details: the upstream instance, the last rewrite, the live last error', () => {
    const rows = ui.sourceRows({
      tcp: sources.tcp,
      xml: { state: 'connected', lastRewriteDetectedAt: WRITTEN },
      live: { state: 'rejected', pendingResources: 3, lastAcceptedAt: null, lastError: { code: 'bad-key', at: DETECTED } },
    });
    expect(rows[0].detail).toContain('main');
    expect(rows[1].detail).toContain(WRITTEN);
    expect(rows[2].detail).toContain('bad-key');
    expect(rows[2].detail).toContain('3');
  });
});

describe('current event and a new event (§7.1, ARCHITECTURE §6 Scenario E)', () => {
  it('the new-event request: POST /api/admin/events with the trimmed name', () => {
    expect(ui.newEventRequest('  Jarni slalom 2027 ')).toEqual({ method: 'POST', path: '/api/admin/events', body: { name: 'Jarni slalom 2027' } });
  });

  it('an empty name is refused before any request', () => {
    expect(ui.newEventNameError('   ')).toMatch(/name/i);
    expect(ui.newEventNameError('Jarni slalom')).toBeNull();
  });

  it('201 shows the new event; 400 shows the server message and the field issues', () => {
    const created = ui.newEventView(201, { event: { eventId: 'ev-9', name: 'Jarni slalom 2027' } });
    expect(created.ok).toBe(true);
    expect(JSON.stringify(created)).toContain('ev-9');
    const bad = ui.newEventView(400, envelope('validation-failed', 'malformed event', [{ field: 'name', issue: 'must not be empty' }]));
    expect(bad.ok).toBe(false);
    expect(JSON.stringify(bad)).toContain('must not be empty');
  });

  it('GET /api/events/current: name and eventId; 404 means no event', () => {
    expect(ui.eventView(200, { event: { eventId: 'ev-1', name: 'Test Event' } })).toEqual({ hasEvent: true, name: 'Test Event', eventId: 'ev-1' });
    expect(ui.eventView(404, envelope('event-not-found', 'no event'))).toEqual({ hasEvent: false, name: null, eventId: null });
  });
});

describe('diagnostics (§4 Diagnostic)', () => {
  it('one row per diagnostic with its kind and what it names; an empty list says so', () => {
    const rows = ui.diagnosticRows([
      { kind: 'duplicate-finish', phaseId: 'R-1', finishTime: WRITTEN, bibs: ['3', '5'] },
      { kind: 'unparseable-cell', attemptId: 'a-1', source: 'xml', slot: 2, text: '??' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('duplicate-finish');
    expect(rows[0].detail).toContain('R-1');
    expect(rows[0].detail).toContain('3');
    expect(rows[1].detail).toContain('??');
    expect(ui.renderDiagnostics([])).toMatch(/no diagnostics/i);
    expect(ui.renderDiagnostics([{ kind: 'stale-mark', attemptId: 'a-2', run: 1, mark: 'DNS' }])).toContain('stale-mark');
  });

  it('text from upstream is escaped', () => {
    const html = ui.renderDiagnostics([{ kind: 'unparseable-cell', attemptId: 'a-1', source: 'tcp', slot: 1, text: '<img src=x onerror=alert(1)>' }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('the page is served by the on-site process', () => {
  it('GET / is the page referencing main.js and styles.css; GET /admin-ui/main.js is served as JavaScript', async () => {
    const env = await boot({ startAt: ODP.startAt });
    const base = `http://127.0.0.1:${env.h.port}`;
    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('/admin-ui/main.js');
    expect(html).toContain('/admin-ui/styles.css');
    expect(html).toContain('type="module"');
    const js = await fetch(`${base}/admin-ui/main.js`);
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('javascript');
    expect(await js.text()).toContain('export function rebaselineRequest');
  });

  it('the page calls only routes the on-site process serves (§7.1, /api/logs, /api/clients*, /api/admin/events)', () => {
    const src = readFileSync(new URL('../../admin-ui/main.js', import.meta.url), 'utf8');
    for (const gone of ['/api/status', '/api/event\'', '/api/config/', '/api/live/', '/api/xml/mismatch', '/api/update-check']) {
      expect(src, gone).not.toContain(gone);
    }
  });
});
