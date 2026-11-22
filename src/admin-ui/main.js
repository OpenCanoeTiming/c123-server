/**
 * Admin page of the on-site process (CONTRACTS §7.1; /api/clients*, /api/logs, /api/admin/events).
 * An ES module: request building and response-to-view logic are exported plain functions (no DOM), the DOM wiring runs only in a browser.
 */

// ---------------------------------------------------------------------------------------------------------------------
// Pure part
// ---------------------------------------------------------------------------------------------------------------------

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const known = (observed) => (observed && observed.state === 'known' ? observed.value : null);

/** What the server said, as far as the error envelope (§1.4) carries it. */
function errorOf(body) {
  const e = body && typeof body === 'object' ? body.error : null;
  return e && typeof e === 'object' ? e : null;
}
function issuesOf(error) {
  return error && Array.isArray(error.details) ? error.details.map((d) => `${d.field}: ${d.issue}`) : [];
}

// ---- re-baseline ----------------------------------------------------------------------------------------------------

export function rebaselineRequest(scope) {
  const clean = scope.kind === 'phase' ? { kind: 'phase', phaseId: scope.phaseId } : { kind: 'event' };
  return { method: 'POST', path: '/api/rebaseline', body: { scope: clean } };
}

export function phaseLabel(phase) {
  return known(phase.title) ?? `${phase.format} ${phase.date}`;
}

/** The scope choice: the whole event, then every Phase under its class. `phasesByClass` maps classId to Phase[]. */
export function scopeOptions(classes, phasesByClass) {
  const options = [{ scope: { kind: 'event' }, label: 'The whole event' }];
  for (const cls of classes) {
    const className = known(cls.name) ?? cls.classId;
    for (const phase of phasesByClass[cls.classId] ?? []) {
      options.push({ scope: { kind: 'phase', phaseId: phase.phaseId }, label: `${className}: ${phaseLabel(phase)} (${phase.phaseId})` });
    }
  }
  return options;
}

export function scopeLabel(scope) {
  return scope && scope.kind === 'phase' ? `Phase ${scope.phaseId}` : 'the whole event';
}

export function rebaselineView(status, body) {
  if (status === 200 && body) {
    return {
      ok: true,
      title: `Re-baseline done for ${scopeLabel(body.scope)}`,
      lines: [
        { label: 'Snapshot file written at', value: body.snapshotWrittenAt },
        { label: 'Snapshot read at', value: body.snapshotDetectedAt },
        { label: 'Attempts in scope', value: String(body.attempts) },
      ],
      note: 'If the correction was made after the snapshot file was written, save it in Canoe123 and run this again. It is safe to repeat.',
    };
  }
  const error = errorOf(body);
  if (status === 409 && error && error.code === 'source-unavailable') {
    const reason = error.details && error.details.reason ? error.details.reason : 'unknown';
    return { ok: false, title: 'The XML snapshot is not available, nothing was changed', lines: [{ label: 'Reason', value: reason }], note: error.message ?? '' };
  }
  const lines = issuesOf(error).map((issue) => ({ label: 'Field', value: issue }));
  if (error) return { ok: false, title: error.message || `Error ${status}`, lines, note: `${status} ${error.code}` };
  return { ok: false, title: `Unexpected response ${status}`, lines, note: '' };
}

export function renderRebaselineResult(view) {
  const lines = view.lines.map((l) => `<dt>${escapeHtml(l.label)}</dt><dd>${escapeHtml(l.value)}</dd>`).join('');
  return `<div class="alert ${view.ok ? 'alert-success' : 'alert-error'}" role="${view.ok ? 'status' : 'alert'}"><div class="alert-content">` +
    `<div class="alert-title">${escapeHtml(view.title)}</div>` +
    (lines ? `<dl class="kv">${lines}</dl>` : '') +
    (view.note ? `<p class="text-sm">${escapeHtml(view.note)}</p>` : '') +
    '</div></div>';
}

// ---- sources --------------------------------------------------------------------------------------------------------

const TONES = { connected: 'success', reconnecting: 'warning', unreachable: 'error', retrying: 'warning', rejected: 'error', 'not-configured': 'neutral' };

export function sourceRows(sources) {
  const row = (id, name, state, detail) => ({
    id, name, state, quiet: state === 'not-configured', tone: TONES[state] ?? 'neutral',
    text: state === 'not-configured' ? 'not configured' : state, detail,
  });
  const { tcp, xml, live } = sources;
  const tcpDetail = [tcp.upstreamInstance ? `instance ${tcp.upstreamInstance}` : null,
    typeof tcp.timingClockOffsetSeconds === 'number' ? `clock offset ${tcp.timingClockOffsetSeconds} s` : null].filter(Boolean).join(', ');
  const xmlDetail = xml.lastRewriteDetectedAt ? `last rewrite ${xml.lastRewriteDetectedAt}` : '';
  const liveDetail = live.state === 'not-configured' ? '' : [
    `${live.pendingResources} pending`,
    live.lastAcceptedAt ? `last accepted ${live.lastAcceptedAt}` : null,
    live.lastError ? `last error ${live.lastError.code} at ${live.lastError.at}` : null,
  ].filter(Boolean).join(', ');
  return [row('tcp', 'TCP (Canoe123)', tcp.state, tcpDetail), row('xml', 'XML snapshot', xml.state, xmlDetail), row('live', 'Live', live.state, liveDetail)];
}

export function renderSources(sources) {
  return sourceRows(sources).map((r) => {
    const badge = r.quiet ? 'badge badge-neutral' : `badge badge-${r.tone}`;
    return `<tr><th scope="row">${escapeHtml(r.name)}</th><td><span class="${badge}">${escapeHtml(r.text)}</span></td>` +
      `<td class="${r.quiet ? 'text-muted' : ''}">${escapeHtml(r.detail)}</td></tr>`;
  }).join('');
}

// ---- current event, new event ---------------------------------------------------------------------------------------

export function eventView(status, body) {
  if (status === 200 && body && body.event) return { hasEvent: true, name: body.event.name, eventId: body.event.eventId };
  return { hasEvent: false, name: null, eventId: null };
}

export function newEventNameError(name) {
  return String(name ?? '').trim() === '' ? 'Enter a name for the new event.' : null;
}

export function newEventRequest(name) {
  return { method: 'POST', path: '/api/admin/events', body: { name: String(name).trim() } };
}

export function newEventView(status, body) {
  if (status === 201 && body && body.event) {
    return { ok: true, title: `New event started: ${body.event.name}`, lines: [{ label: 'Event id', value: body.event.eventId }], note: '' };
  }
  const error = errorOf(body);
  const lines = issuesOf(error).map((issue) => ({ label: 'Field', value: issue }));
  return { ok: false, title: error ? error.message : `Unexpected response ${status}`, lines, note: error ? `${status} ${error.code}` : '' };
}

// ---- diagnostics ----------------------------------------------------------------------------------------------------

export function diagnosticRows(list) {
  return list.map((d) => {
    const { kind, ...rest } = d;
    const detail = Object.entries(rest).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`).join('; ');
    return { kind, detail };
  });
}

export function renderDiagnostics(list) {
  if (list.length === 0) return '<p class="text-muted">No diagnostics.</p>';
  return '<table class="table table-compact"><thead><tr><th scope="col">Kind</th><th scope="col">Detail</th></tr></thead><tbody>' +
    diagnosticRows(list).map((r) => `<tr><td class="mono">${escapeHtml(r.kind)}</td><td>${escapeHtml(r.detail)}</td></tr>`).join('') + '</tbody></table>';
}

// ---- clients (/api/clients*, same shapes as the legacy server) -------------------------------------------------------

export function clientConfigRequest(key, form) {
  const config = {};
  if (form.type) config.type = form.type;
  if (form.displayRows) config.displayRows = parseInt(form.displayRows, 10);
  config.customTitle = form.customTitle.trim() || null;
  if (form.clientId.trim()) config.clientId = form.clientId.trim();
  config.scrollToFinished = form.scrollToFinished;
  config.browseAfterHighlight = form.browseAfterHighlight;
  return { method: 'PUT', path: `/api/clients/${encodeURIComponent(key)}/config`, body: config };
}

export function renderClientCard(client) {
  const key = client.configKey || client.ip;
  const cfg = client.serverConfig || {};
  const parts = [cfg.type ? `<dt>Layout</dt><dd>${escapeHtml(cfg.type)}</dd>` : '', cfg.displayRows ? `<dt>Rows</dt><dd>${escapeHtml(cfg.displayRows)}</dd>` : '',
    cfg.customTitle ? `<dt>Title</dt><dd>${escapeHtml(cfg.customTitle)}</dd>` : ''].join('');
  const online = client.online ? '<span class="badge badge-success">Online</span>' : '<span class="badge badge-neutral">Offline</span>';
  return `<div class="card card-compact" role="listitem"><div class="card-header"><span class="font-medium">${escapeHtml(client.label || '(unnamed)')}</span>${online}</div>` +
    `<div class="card-body flex flex-col gap-2"><div class="mono text-xs text-muted">${client.hasExplicitId ? 'ID' : 'IP'} ${escapeHtml(key)}` +
    `${client.hasExplicitId && client.ipAddress ? ' from ' + escapeHtml(client.ipAddress) : ''}</div>` +
    (parts ? `<dl class="kv">${parts}</dl>` : '<div class="text-muted text-sm">Default configuration</div>') + '</div>' +
    `<div class="card-footer"><button class="btn btn-sm" data-action="edit-client" data-key="${escapeHtml(key)}">Edit</button>` +
    (client.online ? `<button class="btn btn-sm" data-action="refresh-client" data-key="${escapeHtml(key)}">Refresh</button>` : '') + '</div></div>';
}

// ---- logs -----------------------------------------------------------------------------------------------------------

export function logsPath(limit) {
  return `/api/logs?limit=${limit}`;
}

export function renderLogs(lines, search) {
  const needle = String(search ?? '').toLowerCase();
  const shown = lines.filter((l) => needle === '' || l.toLowerCase().includes(needle));
  return shown.map((l) => `<div class="log-entry"><span class="log-message">${escapeHtml(l)}</span></div>`).join('');
}

// ---------------------------------------------------------------------------------------------------------------------
// Browser part
// ---------------------------------------------------------------------------------------------------------------------

const POLL_MS = 4000;

async function call(req) {
  const init = { method: req.method ?? 'GET' };
  if (req.body !== undefined) { init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(req.body); }
  const res = await fetch(req.path, init);
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, body };
}

function startPage() {
  const $ = (id) => document.getElementById(id);
  let phasesByClass = {};
  let classes = [];
  let clients = [];
  let editing = null;

  const toast = (html, el) => { el.innerHTML = html; };

  async function loadEvent() {
    const { status, body } = await call({ path: '/api/events/current' });
    const ev = eventView(status, body);
    $('eventName').textContent = ev.hasEvent ? ev.name : 'No event';
    $('eventId').textContent = ev.hasEvent ? ev.eventId : '';
    classes = status === 200 ? body.classes : [];
    phasesByClass = {};
    await Promise.all(classes.map(async (c) => {
      const r = await call({ path: `/api/classes/${encodeURIComponent(c.classId)}/phases` });
      phasesByClass[c.classId] = r.status === 200 ? r.body.phases : [];
    }));
    const select = $('scopeSelect');
    const previous = select.value;
    const options = scopeOptions(classes, phasesByClass);
    select.innerHTML = options.map((o, i) => `<option value="${i}">${escapeHtml(o.label)}</option>`).join('');
    if (previous && Number(previous) < options.length) select.value = previous;
    select.dataset.ready = '1';
    $('rebaselineBtn').disabled = !ev.hasEvent;
  }

  async function pollSources() {
    try {
      const { body } = await call({ path: '/api/sources' });
      $('sourcesBody').innerHTML = renderSources(body);
    } catch { /* retried at the next tick */ }
  }
  async function pollDiagnostics() {
    try {
      const { body } = await call({ path: '/api/diagnostics' });
      $('diagnostics').innerHTML = renderDiagnostics(body.diagnostics);
    } catch { /* retried at the next tick */ }
  }
  async function pollLogs() {
    try {
      const { body } = await call({ path: logsPath(200) });
      const box = $('logEntries');
      const stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 8;
      box.innerHTML = renderLogs(body.lines, $('logSearch').value);
      if (stick) box.scrollTop = box.scrollHeight;
    } catch { /* retried at the next tick */ }
  }
  async function loadClients() {
    try {
      const { body } = await call({ path: '/api/clients' });
      clients = body.clients || [];
      $('clientsOnline').textContent = String(clients.filter((c) => c.online).length);
      $('clientsTotal').textContent = String(clients.length);
      $('noClients').classList.toggle('hidden', clients.length > 0);
      if (!window.getSelection().toString()) $('clientsGrid').innerHTML = clients.map(renderClientCard).join('');
    } catch { /* retried at the next tick */ }
  }

  $('rebaselineBtn').addEventListener('click', async () => {
    const option = scopeOptions(classes, phasesByClass)[Number($('scopeSelect').value)];
    if (!option || !window.confirm(`Re-baseline ${scopeLabel(option.scope)}? Retained upstream results of the scope are discarded and rebuilt from the XML snapshot.`)) return;
    const button = $('rebaselineBtn');
    button.disabled = true;
    try {
      const { status, body } = await call(rebaselineRequest(option.scope));
      toast(renderRebaselineResult(rebaselineView(status, body)), $('rebaselineResult'));
    } catch (e) {
      toast(renderRebaselineResult(rebaselineView(0, null)).replace('Unexpected response 0', `Request failed: ${escapeHtml(e.message)}`), $('rebaselineResult'));
    } finally { button.disabled = false; }
    pollSources();
    pollDiagnostics();
  });

  $('newEventForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('newEventName').value;
    const problem = newEventNameError(name);
    if (problem) { toast(renderRebaselineResult({ ok: false, title: problem, lines: [], note: '' }), $('newEventResult')); return; }
    if (!window.confirm(`Start a new event "${name.trim()}"? It opens a new, empty store; the current event stays on disk but is no longer served.`)) return;
    try {
      const { status, body } = await call(newEventRequest(name));
      const view = newEventView(status, body);
      toast(renderRebaselineResult(view), $('newEventResult'));
      if (view.ok) { $('newEventName').value = ''; await loadEvent(); }
    } catch (e) {
      toast(renderRebaselineResult({ ok: false, title: `Request failed: ${e.message}`, lines: [], note: '' }), $('newEventResult'));
    }
  });

  $('logSearch').addEventListener('input', pollLogs);

  // clients
  const dialog = $('clientModal');
  const clientError = (msg) => { $('modalError').textContent = msg; $('modalError').classList.toggle('hidden', !msg); };
  $('clientsGrid').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const key = button.dataset.key;
    if (button.dataset.action === 'refresh-client') {
      await call({ method: 'POST', path: `/api/clients/${encodeURIComponent(key)}/refresh`, body: { reason: 'Admin triggered refresh' } });
      return;
    }
    const client = clients.find((c) => (c.configKey || c.ip) === key);
    const cfg = (client && client.serverConfig) || {};
    editing = key;
    $('modalClientKey').textContent = key;
    $('modalLabel').value = (client && client.label) || '';
    $('modalClientId').value = cfg.clientId || '';
    $('modalType').value = cfg.type || '';
    $('modalDisplayRows').value = cfg.displayRows || '';
    $('modalCustomTitle').value = cfg.customTitle || '';
    $('modalScrollToFinished').checked = cfg.scrollToFinished !== false;
    $('modalBrowseAfterHighlight').checked = cfg.browseAfterHighlight === true;
    clientError('');
    dialog.showModal();
  });
  $('refreshAll').addEventListener('click', () => call({ method: 'POST', path: '/api/broadcast/refresh', body: { reason: 'Admin triggered refresh' } }));
  $('modalClose').addEventListener('click', () => dialog.close());
  $('modalSave').addEventListener('click', async () => {
    const label = $('modalLabel').value.trim();
    const form = { type: $('modalType').value, displayRows: $('modalDisplayRows').value, customTitle: $('modalCustomTitle').value, clientId: $('modalClientId').value,
      scrollToFinished: $('modalScrollToFinished').checked, browseAfterHighlight: $('modalBrowseAfterHighlight').checked };
    try {
      const current = clients.find((c) => (c.configKey || c.ip) === editing);
      if (label && label !== ((current && current.label) || '')) {
        const r = await call({ method: 'PUT', path: `/api/clients/${encodeURIComponent(editing)}/label`, body: { label } });
        if (r.status !== 200) { clientError(r.body && r.body.error ? r.body.error : `Error ${r.status}`); return; }
      }
      const r = await call(clientConfigRequest(editing, form));
      if (r.status !== 200) { clientError(r.body && r.body.error ? r.body.error : `Error ${r.status}`); return; }
      dialog.close();
      loadClients();
    } catch (e) { clientError(`Failed: ${e.message}`); }
  });
  $('modalDelete').addEventListener('click', async () => {
    if (!window.confirm(`Delete the configuration of ${editing}?`)) return;
    const r = await call({ method: 'DELETE', path: `/api/clients/${encodeURIComponent(editing)}` });
    if (r.status !== 200) { clientError(r.body && r.body.error ? r.body.error : `Error ${r.status}`); return; }
    dialog.close();
    loadClients();
  });

  const tick = () => { pollSources(); pollDiagnostics(); pollLogs(); loadClients(); };
  loadEvent().catch(() => undefined);
  tick();
  setInterval(tick, POLL_MS);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startPage);
  else startPage();
}
