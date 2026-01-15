/**
 * C123 Server - Admin Dashboard JavaScript
 * Extracted from UnifiedServer.ts
 */

// ===========================================
// Utility Functions
// ===========================================

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

function statusClass(status) {
  if (status === 'connected') return 'connected';
  if (status === 'connecting') return 'connecting';
  return 'disconnected';
}

function hasFocus(el) {
  return document.activeElement === el;
}

function hasTextSelection() {
  const sel = window.getSelection();
  return sel && sel.toString().length > 0;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

// ===========================================
// Status Refresh
// ===========================================

async function refresh() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    // Current race display
    const currentRace = data.event.raceName
      ? data.event.raceName + ' (ID: ' + (data.event.currentRaceId || '-') + ')'
      : 'No active race';
    document.getElementById('currentRace').textContent = currentRace;

    // Skip table updates if user has text selected (to preserve copy ability)
    if (!hasTextSelection()) {
      // Sources
      const sourcesBody = document.querySelector('#sourcesTable tbody');
      sourcesBody.innerHTML = data.sources.map(s =>
        '<tr>' +
        '<td>' + s.name + '</td>' +
        '<td>' + s.type.toUpperCase() + '</td>' +
        '<td><span class="status ' + statusClass(s.status) + '"></span>' + s.status + '</td>' +
        '<td>' + (s.host ? s.host + ':' + s.port : (s.path || '-')) + '</td>' +
        '</tr>'
      ).join('');
    }

    document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById('lastUpdate').innerHTML = '<span class="error">Error: ' + e.message + '</span>';
  }
}

// ===========================================
// XML Config Functions
// ===========================================

let currentMode = 'manual';

async function loadXmlConfig() {
  try {
    const res = await fetch('/api/config/xml');
    const data = await res.json();

    document.getElementById('xmlPath').textContent = data.path || '(not set)';
    document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';

    if (data.isWindows) {
      document.getElementById('modeSelector').style.display = 'block';

      // Update available paths display
      const mainPathEl = document.getElementById('mainPath');
      const offlinePathEl = document.getElementById('offlinePath');

      if (data.availablePaths) {
        const mainPath = data.availablePaths.main;
        const offlinePath = data.availablePaths.offline;

        mainPathEl.textContent = mainPath.path
          ? (mainPath.exists ? mainPath.path : mainPath.path + ' (not found)')
          : '(not configured)';
        mainPathEl.style.color = mainPath.exists ? '#00ff88' : '#ff6b6b';

        offlinePathEl.textContent = offlinePath.path
          ? (offlinePath.exists ? offlinePath.path : offlinePath.path + ' (not found)')
          : '(not configured)';
        offlinePathEl.style.color = offlinePath.exists ? '#00ff88' : '#ff6b6b';
      }

      // Only update mode radio if user is not interacting with the XML config form
      const isEditingXmlConfig = document.activeElement?.closest('#xmlConfigCard') !== null;

      if (!isEditingXmlConfig) {
        // Select current mode radio
        currentMode = data.mode || 'manual';
        const modeRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
        if (modeRadio) modeRadio.checked = true;

        // Show/hide manual path input based on mode
        updateManualPathVisibility(currentMode);
      }
    }

    // Only update input value if it doesn't have focus (user might be typing)
    const xmlPathInput = document.getElementById('xmlPathInput');
    if (data.path && !hasFocus(xmlPathInput)) {
      xmlPathInput.value = data.path;
    }

    document.getElementById('xmlConfigError').style.display = 'none';
  } catch (e) {
    showXmlError('Failed to load config: ' + e.message);
  }
}

function updateManualPathVisibility(mode) {
  const manualSection = document.getElementById('manualPathSection');
  if (mode === 'manual') {
    manualSection.style.display = 'flex';
  } else {
    manualSection.style.display = 'none';
  }
}

async function setXmlPath() {
  const path = document.getElementById('xmlPathInput').value.trim();
  if (!path) {
    showXmlError('Please enter a path');
    return;
  }

  try {
    const res = await fetch('/api/config/xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'manual', path })
    });
    const data = await res.json();

    if (data.error) {
      showXmlError(data.error);
      return;
    }

    document.getElementById('xmlPath').textContent = data.path || '(not set)';
    document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';
    document.getElementById('xmlConfigError').style.display = 'none';
    loadXmlConfig(); // Reload to update all fields
  } catch (e) {
    showXmlError('Failed to set path: ' + e.message);
  }
}

function showXmlError(msg) {
  const el = document.getElementById('xmlConfigError');
  el.textContent = msg;
  el.style.display = 'block';
}

// Mode radio change handler
function initXmlModeHandlers() {
  document.querySelectorAll('input[name="xmlMode"]').forEach(function(radio) {
    radio.addEventListener('change', async function() {
      const newMode = this.value;

      if (newMode === 'manual') {
        updateManualPathVisibility('manual');
        return; // Wait for user to enter path and click Set Path
      }

      try {
        const res = await fetch('/api/config/xml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: newMode })
        });
        const data = await res.json();

        if (data.error) {
          showXmlError(data.error);
          // Revert to previous mode
          const prevRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
          if (prevRadio) prevRadio.checked = true;
          return;
        }

        currentMode = newMode;
        document.getElementById('xmlPath').textContent = data.path || '(not set)';
        document.getElementById('xmlSource').textContent = data.source ? '(' + data.source + ')' : '';
        document.getElementById('xmlConfigError').style.display = 'none';
        updateManualPathVisibility(newMode);
      } catch (e) {
        showXmlError('Failed to change mode: ' + e.message);
        // Revert to previous mode
        const prevRadio = document.querySelector('input[name="xmlMode"][value="' + currentMode + '"]');
        if (prevRadio) prevRadio.checked = true;
      }
    });
  });
}

// ===========================================
// Event Name Functions
// ===========================================

async function loadEventName() {
  try {
    const res = await fetch('/api/event');
    const data = await res.json();

    document.getElementById('eventName').textContent = data.name || '(not set)';
    document.getElementById('eventSource').textContent = data.source ? '(' + data.source + ')' : '';

    // Only update input if it doesn't have focus (user might be typing)
    const eventNameInput = document.getElementById('eventNameInput');
    if (!hasFocus(eventNameInput)) {
      if (data.source === 'manual') {
        eventNameInput.value = data.name || '';
      } else {
        eventNameInput.value = '';
        eventNameInput.placeholder = data.name ? 'Override: ' + data.name : 'Event name override';
      }
    }

    document.getElementById('eventError').style.display = 'none';
  } catch (e) {
    showEventError('Failed to load event name: ' + e.message);
  }
}

async function setEventName() {
  const name = document.getElementById('eventNameInput').value.trim();
  if (!name) {
    showEventError('Please enter an event name');
    return;
  }

  try {
    const res = await fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();

    if (data.error) {
      showEventError(data.error);
      return;
    }

    document.getElementById('eventName').textContent = data.name || '(not set)';
    document.getElementById('eventSource').textContent = data.source ? '(' + data.source + ')' : '';
    document.getElementById('eventError').style.display = 'none';
  } catch (e) {
    showEventError('Failed to set event name: ' + e.message);
  }
}

async function clearEventName() {
  try {
    const res = await fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: null })
    });
    const data = await res.json();

    if (data.error) {
      showEventError(data.error);
      return;
    }

    loadEventName(); // Reload to get XML name if available
  } catch (e) {
    showEventError('Failed to clear event name: ' + e.message);
  }
}

function showEventError(msg) {
  const el = document.getElementById('eventError');
  el.textContent = msg;
  el.style.display = 'block';
}

// ===========================================
// Log Viewer Functions
// ===========================================

let logEntries = [];
let ws = null;
const MAX_LOG_ENTRIES = 200;

const levelColors = {
  debug: '#888',
  info: '#00ff88',
  warn: '#ffaa00',
  error: '#ff6b6b'
};

function formatLogTime(iso) {
  if (!iso) return '';
  return iso.slice(11, 23); // HH:mm:ss.SSS
}

function renderLogEntry(entry) {
  const time = formatLogTime(entry.timestamp);
  const color = levelColors[entry.level] || '#eee';
  const level = entry.level.toUpperCase().padEnd(5);
  return '<div class="log-entry" data-level="' + entry.level + '" style="margin-bottom: 2px;">' +
    '<span style="color: #666;">' + time + '</span> ' +
    '<span style="color: ' + color + ';">' + level + '</span> ' +
    '<span style="color: #00d4ff;">[' + escapeHtml(entry.component) + ']</span> ' +
    '<span>' + escapeHtml(entry.message) + '</span>' +
    '</div>';
}

function renderAllLogs() {
  const container = document.getElementById('logEntries');
  const noLogs = document.getElementById('noLogs');
  const filtered = getFilteredLogs();

  if (filtered.length === 0) {
    container.innerHTML = '';
    noLogs.style.display = 'block';
  } else {
    noLogs.style.display = 'none';
    container.innerHTML = filtered.map(renderLogEntry).join('');
  }

  updateLogStats();

  if (document.getElementById('logAutoScroll').checked) {
    const logContainer = document.getElementById('logContainer');
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

function getFilteredLogs() {
  const showDebug = document.getElementById('logLevelDebug').checked;
  const showInfo = document.getElementById('logLevelInfo').checked;
  const showWarn = document.getElementById('logLevelWarn').checked;
  const showError = document.getElementById('logLevelError').checked;
  const search = document.getElementById('logSearch').value.toLowerCase().trim();

  return logEntries.filter(function(entry) {
    // Level filter
    if (entry.level === 'debug' && !showDebug) return false;
    if (entry.level === 'info' && !showInfo) return false;
    if (entry.level === 'warn' && !showWarn) return false;
    if (entry.level === 'error' && !showError) return false;

    // Search filter
    if (search) {
      const matchComponent = entry.component.toLowerCase().includes(search);
      const matchMessage = entry.message.toLowerCase().includes(search);
      if (!matchComponent && !matchMessage) return false;
    }

    return true;
  });
}

function filterLogs() {
  renderAllLogs();
}

function updateLogStats() {
  const filtered = getFilteredLogs();
  document.getElementById('logStats').textContent =
    filtered.length + ' of ' + logEntries.length + ' entries shown';
}

function clearLogDisplay() {
  logEntries = [];
  renderAllLogs();
}

function addLogEntry(entry) {
  logEntries.push(entry);
  // Keep buffer limited
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
  }
  renderAllLogs();
}

async function loadInitialLogs() {
  try {
    const res = await fetch('/api/logs?limit=100&order=asc');
    const data = await res.json();
    logEntries = data.entries || [];
    renderAllLogs();
  } catch (e) {
    console.error('Failed to load logs:', e);
  }
}

function connectLogWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(protocol + '//' + window.location.host + '/ws?admin=1');

  ws.onmessage = function(event) {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'LogEntry') {
        addLogEntry({
          level: msg.data.level,
          component: msg.data.component,
          message: msg.data.message,
          timestamp: msg.timestamp,
          data: msg.data.data
        });
      } else if (msg.type === 'ClientsUpdate') {
        // Live update of clients list
        clientsData = msg.data.clients || [];
        renderClients();
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  ws.onclose = function() {
    // Reconnect after 3 seconds
    setTimeout(connectLogWebSocket, 3000);
  };

  ws.onerror = function() {
    ws.close();
  };
}

// ===========================================
// Client Management Functions
// ===========================================

let clientsData = [];
let currentModalIp = null;

async function loadClients() {
  try {
    const res = await fetch('/api/clients');
    const data = await res.json();
    clientsData = data.clients || [];
    renderClients();
  } catch (e) {
    console.error('Failed to load clients:', e);
  }
}

function renderClients() {
  const grid = document.getElementById('clientsGrid');
  const noClients = document.getElementById('noClients');
  const status = document.getElementById('clientsStatus');

  const onlineCount = clientsData.filter(c => c.online).length;
  status.textContent = onlineCount + ' online, ' + clientsData.length + ' total';

  // Skip grid update if user has text selected (to preserve copy ability)
  if (hasTextSelection()) {
    return;
  }

  if (clientsData.length === 0) {
    grid.innerHTML = '';
    noClients.style.display = 'block';
    return;
  }

  noClients.style.display = 'none';
  grid.innerHTML = clientsData.map(renderClientCard).join('');
}

function renderClientCard(client) {
  const statusClass = client.online ? 'online' : 'offline';
  const statusText = client.online ? 'online' : 'offline';
  const label = client.label || '(unnamed)';
  const labelClass = client.label ? '' : 'empty';

  // Build params display
  const params = [];
  if (client.serverConfig) {
    if (client.serverConfig.type) params.push({ key: 'type', value: client.serverConfig.type });
    if (client.serverConfig.displayRows) params.push({ key: 'rows', value: client.serverConfig.displayRows });
    if (client.serverConfig.customTitle) params.push({ key: 'title', value: truncate(client.serverConfig.customTitle, 15) });
  }

  const paramsHtml = params.length > 0
    ? params.map(p => '<span class="client-param">' + p.key + ': <span class="client-param-value">' + escapeHtml(String(p.value)) + '</span></span>').join('')
    : '<span class="client-param">default config</span>';

  // Show configKey (clientId or IP) and actual IP if different
  const configKey = client.configKey || client.ip;
  const idTypeLabel = client.hasExplicitId ? 'ID' : 'IP';
  const ipInfo = client.hasExplicitId && client.ipAddress
    ? '<span style="font-size: 0.8em; color: #666; margin-left: 5px;">(' + escapeHtml(client.ipAddress) + ')</span>'
    : '';

  return '<div class="client-card ' + statusClass + '" data-ip="' + escapeHtml(configKey) + '">' +
    '<div class="client-header">' +
    '<span class="client-ip" title="' + idTypeLabel + ': ' + escapeHtml(configKey) + '">' + escapeHtml(configKey) + '</span>' + ipInfo +
    '<div class="client-status">' +
    '<span class="client-status-dot ' + statusClass + '"></span>' +
    '<span style="font-size: 0.8em; color: #888;">' + statusText + '</span>' +
    '</div>' +
    '</div>' +
    '<div class="client-label ' + labelClass + '" onclick="openClientModal(\'' + escapeHtml(configKey) + '\')">' + escapeHtml(label) + '</div>' +
    '<div class="client-params">' + paramsHtml + '</div>' +
    '<div class="client-actions">' +
    '<button class="client-btn" onclick="openClientModal(\'' + escapeHtml(configKey) + '\')">Edit</button>' +
    (client.online ? '<button class="client-btn refresh" onclick="refreshClient(\'' + escapeHtml(configKey) + '\')">Refresh</button>' : '') +
    '</div>' +
    '</div>';
}

function openClientModal(configKey) {
  currentModalIp = configKey;
  const client = clientsData.find(c => (c.configKey || c.ip) === configKey);
  console.log('openClientModal', configKey, 'client:', client, 'serverConfig:', client?.serverConfig);

  // Show configKey and IP info
  const idInfo = client?.hasExplicitId
    ? configKey + ' (from ' + (client?.ipAddress || 'unknown IP') + ')'
    : configKey;
  document.getElementById('modalClientIp').textContent = idInfo;
  document.getElementById('modalLabel').value = client?.label || '';

  // Config fields
  const cfg = client?.serverConfig || {};
  document.getElementById('modalType').value = cfg.type || '';
  document.getElementById('modalDisplayRows').value = cfg.displayRows || '';
  document.getElementById('modalCustomTitle').value = cfg.customTitle || '';
  document.getElementById('modalClientId').value = cfg.clientId || '';
  // scrollToFinished: default true if not set
  document.getElementById('modalScrollToFinished').checked = cfg.scrollToFinished !== false;

  // Client state
  const state = client?.clientState;
  document.getElementById('modalClientState').textContent = state ? JSON.stringify(state, null, 2) : '-';

  // Load assets into modal
  loadModalAssets(cfg.assets);

  document.getElementById('modalError').style.display = 'none';
  document.getElementById('clientModal').style.display = 'flex';
}

function closeClientModal() {
  document.getElementById('clientModal').style.display = 'none';
  currentModalIp = null;
}

async function saveClientLabel() {
  if (!currentModalIp) return;
  const label = document.getElementById('modalLabel').value.trim();

  if (!label) {
    showModalError('Please enter a label');
    return;
  }

  try {
    const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp) + '/label', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label })
    });
    const data = await res.json();

    if (data.error) {
      showModalError(data.error);
      return;
    }

    loadClients();
    showClientMessage('Label saved for ' + currentModalIp);
  } catch (e) {
    showModalError('Failed: ' + e.message);
  }
}

async function saveClientConfig() {
  if (!currentModalIp) return;

  const config = {};
  const type = document.getElementById('modalType').value;
  const rows = document.getElementById('modalDisplayRows').value;
  const title = document.getElementById('modalCustomTitle').value.trim();
  const clientId = document.getElementById('modalClientId').value.trim();

  if (type) config.type = type;
  if (rows) config.displayRows = parseInt(rows, 10);
  // Send customTitle: null to clear, or the value to set
  config.customTitle = title || null;
  // Send clientId if set (allows server to assign/rename client identity)
  if (clientId) config.clientId = clientId;
  // scrollToFinished: only send if unchecked (false), otherwise don't send (uses default true)
  const scrollToFinished = document.getElementById('modalScrollToFinished').checked;
  if (!scrollToFinished) config.scrollToFinished = false;

  // Include asset overrides if any have been modified
  if (Object.keys(modalAssets).length > 0) {
    config.assets = {};
    ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'].forEach(function(key) {
      if (key in modalAssets) {
        config.assets[key] = modalAssets[key];
      }
    });
    if (Object.keys(config.assets).length === 0) {
      delete config.assets;
    }
  }

  try {
    const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp) + '/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();

    if (data.error) {
      showModalError(data.error);
      return;
    }

    loadClients();
    closeClientModal();
    showClientMessage('Config saved and pushed to ' + data.pushedToSessions + ' session(s)');
  } catch (e) {
    showModalError('Failed: ' + e.message);
  }
}

async function deleteClientConfig() {
  if (!currentModalIp) return;

  if (!confirm('Delete configuration for ' + currentModalIp + '?')) return;

  try {
    const res = await fetch('/api/clients/' + encodeURIComponent(currentModalIp), {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.error) {
      showModalError(data.error);
      return;
    }

    loadClients();
    closeClientModal();
    showClientMessage('Config deleted for ' + currentModalIp);
  } catch (e) {
    showModalError('Failed: ' + e.message);
  }
}

async function refreshClient(ip) {
  try {
    const res = await fetch('/api/clients/' + encodeURIComponent(ip) + '/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Admin triggered refresh' })
    });
    const data = await res.json();

    if (data.error) {
      showClientMessage('Error: ' + data.error, true);
      return;
    }

    showClientMessage('Refresh sent to ' + ip);
  } catch (e) {
    showClientMessage('Failed: ' + e.message, true);
  }
}

async function refreshAllClients() {
  try {
    const res = await fetch('/api/broadcast/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Admin triggered refresh' })
    });
    const data = await res.json();

    if (data.error) {
      showClientMessage('Error: ' + data.error, true);
      return;
    }

    showClientMessage('Refresh sent to ' + data.clientsNotified + ' client(s)');
  } catch (e) {
    showClientMessage('Failed: ' + e.message, true);
  }
}

function showModalError(msg) {
  const el = document.getElementById('modalError');
  el.textContent = msg;
  el.style.display = 'block';
}

function showClientMessage(msg, isError) {
  const el = document.getElementById('clientMessage');
  el.textContent = msg;
  el.style.color = isError ? '#ff6b6b' : '#00ff88';
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 3000);
}

// ===========================================
// Modal Asset Override Functions
// ===========================================

let modalAssets = {};

function initModalAssetHandlers() {
  ['Logo', 'PartnerLogo', 'FooterImage'].forEach(function(name) {
    const key = name.charAt(0).toLowerCase() + name.slice(1) + 'Url';
    const dropZone = document.getElementById('modal' + name + 'DropZone');
    const fileInput = document.getElementById('modal' + name + 'Input');

    if (!dropZone || !fileInput) return;

    // Click to upload
    dropZone.addEventListener('click', function(e) {
      if (e.target.tagName !== 'BUTTON') {
        fileInput.click();
      }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        processModalAssetFile(key, e.target.files[0]);
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processModalAssetFile(key, e.dataTransfer.files[0]);
      }
    });
  });
}

function processModalAssetFile(key, file) {
  if (!file.type.startsWith('image/')) {
    showModalError('Please select an image file');
    return;
  }

  const limits = ASSET_SIZE_LIMITS[key];
  if (!limits) return;

  // SVG files: keep as-is (vector format, no resize needed)
  if (file.type === 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      modalAssets[key] = dataUrl;
      updateModalAssetPreview(key, dataUrl);
      updateModalAssetInfo(key, dataUrl, 'SVG', 'vector');
    };
    reader.readAsDataURL(file);
    return;
  }

  // Read and resize raster image
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (img.width > limits.maxWidth || img.height > limits.maxHeight) {
        const ratio = Math.min(limits.maxWidth / img.width, limits.maxHeight / img.height);
        targetWidth = Math.round(img.width * ratio);
        targetHeight = Math.round(img.height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? 0.85 : undefined;
      const dataUrl = canvas.toDataURL(outputType, quality);

      modalAssets[key] = dataUrl;
      updateModalAssetPreview(key, dataUrl);
      updateModalAssetInfo(key, dataUrl, targetWidth, targetHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateModalAssetPreview(key, dataUrl) {
  const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
  const preview = document.getElementById('modal' + name + 'Preview');
  const placeholder = document.getElementById('modal' + name + 'Placeholder');
  const dropZone = document.getElementById('modal' + name + 'DropZone');

  if (preview && placeholder) {
    if (dataUrl) {
      preview.innerHTML = '<img src="' + dataUrl + '" alt="' + name + '">';
      placeholder.style.display = 'none';
      if (dropZone) dropZone.classList.add('has-value');
    } else {
      preview.innerHTML = '';
      placeholder.style.display = 'block';
      if (dropZone) dropZone.classList.remove('has-value');
    }
  }
}

function updateModalAssetInfo(key, dataUrl, width, height) {
  const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
  const info = document.getElementById('modal' + name + 'Info');

  if (info) {
    if (dataUrl) {
      const sizeKB = Math.round(dataUrl.length / 1024);
      info.textContent = width + 'x' + height + ' (' + sizeKB + ' KB) - will be saved with config';
      info.className = sizeKB > 100 ? 'modal-asset-info warning' : 'modal-asset-info';
    } else {
      info.textContent = '';
      info.className = 'modal-asset-info';
    }
  }
}

function clearModalAsset(key) {
  modalAssets[key] = null;
  updateModalAssetPreview(key, null);
  const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
  const info = document.getElementById('modal' + name + 'Info');
  if (info) {
    info.textContent = 'Cleared - will use global default';
    info.className = 'modal-asset-info';
  }
}

function useDefaultAsset(key) {
  delete modalAssets[key];
  updateModalAssetPreview(key, null);
  const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
  const info = document.getElementById('modal' + name + 'Info');
  if (info) {
    info.textContent = 'Using global default';
    info.className = 'modal-asset-info';
  }
}

function loadModalAssets(assets) {
  modalAssets = {};
  ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'].forEach(function(key) {
    if (assets && assets[key] !== undefined) {
      modalAssets[key] = assets[key];
      if (assets[key]) {
        updateModalAssetPreview(key, assets[key]);
        const img = new Image();
        img.onload = function() {
          updateModalAssetInfo(key, assets[key], img.width, img.height);
        };
        img.src = assets[key];
      } else {
        updateModalAssetPreview(key, null);
        const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
        const info = document.getElementById('modal' + name + 'Info');
        if (info) {
          info.textContent = 'Explicitly cleared';
          info.className = 'modal-asset-info';
        }
      }
    } else {
      updateModalAssetPreview(key, null);
      const name = key.replace('Url', '').replace(/^(.)/, function(m) { return m.toUpperCase(); });
      const info = document.getElementById('modal' + name + 'Info');
      if (info) {
        info.textContent = 'Using global default';
        info.className = 'modal-asset-info';
      }
    }
  });
}

// ===========================================
// Default Asset Management Functions
// ===========================================

const ASSET_SIZE_LIMITS = {
  logoUrl: { maxWidth: 200, maxHeight: 80 },
  partnerLogoUrl: { maxWidth: 300, maxHeight: 80 },
  footerImageUrl: { maxWidth: 1920, maxHeight: 200 }
};

function initAssetHandlers() {
  ['logo', 'partnerLogo', 'footerImage'].forEach(function(name) {
    const key = name + 'Url';
    const dropZone = document.getElementById(name + 'DropZone');
    const fileInput = document.getElementById(name + 'Input');

    if (!dropZone || !fileInput) return;

    // Click to upload
    dropZone.addEventListener('click', function() {
      fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        processAssetFile(key, e.target.files[0]);
      }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processAssetFile(key, e.dataTransfer.files[0]);
      }
    });

    // Paste handler
    dropZone.addEventListener('focus', function() {
      dropZone.dataset.focused = '1';
    });
    dropZone.addEventListener('blur', function() {
      dropZone.dataset.focused = '';
    });
  });

  // Global paste handler
  document.addEventListener('paste', function(e) {
    const focusedZone = document.querySelector('.asset-drop-zone[data-focused="1"]');
    if (!focusedZone) return;

    const key = focusedZone.dataset.key;
    if (!key) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processAssetFile(key, file);
          e.preventDefault();
          break;
        }
      }
    }
  });
}

function processAssetFile(key, file) {
  if (!file.type.startsWith('image/')) {
    showAssetError('Please select an image file');
    return;
  }

  const limits = ASSET_SIZE_LIMITS[key];
  if (!limits) return;

  // SVG files: keep as-is (vector format, no resize needed)
  if (file.type === 'image/svg+xml') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      saveAsset(key, dataUrl, 'SVG', 'vector');
    };
    reader.readAsDataURL(file);
    return;
  }

  // Read and resize raster image
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (img.width > limits.maxWidth || img.height > limits.maxHeight) {
        const ratio = Math.min(limits.maxWidth / img.width, limits.maxHeight / img.height);
        targetWidth = Math.round(img.width * ratio);
        targetHeight = Math.round(img.height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = outputType === 'image/jpeg' ? 0.85 : undefined;
      const dataUrl = canvas.toDataURL(outputType, quality);

      saveAsset(key, dataUrl, targetWidth, targetHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveAsset(key, dataUrl, width, height) {
  try {
    const body = {};
    body[key] = dataUrl;

    const res = await fetch('/api/config/assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.error) {
      showAssetError(data.error);
      return;
    }

    updateAssetPreview(key, dataUrl);
    updateAssetInfo(key, dataUrl, width, height);
    showAssetMessage(getAssetLabel(key) + ' saved (' + width + 'x' + height + ')');
  } catch (e) {
    showAssetError('Failed to save: ' + e.message);
  }
}

async function setAssetFromUrl(key) {
  const inputId = key.replace('Url', '') + 'UrlInput';
  const input = document.getElementById(inputId);
  const url = input ? input.value.trim() : '';

  if (!url) {
    showAssetError('Please enter a URL');
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showAssetError('URL must start with http:// or https://');
    return;
  }

  try {
    showAssetMessage('Loading image from URL...');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch image: ' + response.status);
    }

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    const file = new File([blob], 'image', { type: blob.type });
    processAssetFile(key, file);

    if (input) input.value = '';
  } catch (e) {
    showAssetError('Failed to load URL: ' + e.message);
  }
}

async function clearAsset(key) {
  try {
    const res = await fetch('/api/config/assets/' + key, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.error) {
      showAssetError(data.error);
      return;
    }

    clearAssetPreview(key);
    showAssetMessage(getAssetLabel(key) + ' cleared');
  } catch (e) {
    showAssetError('Failed to clear: ' + e.message);
  }
}

async function loadAssets() {
  try {
    const res = await fetch('/api/config/assets');
    const data = await res.json();

    if (data.assets) {
      ['logoUrl', 'partnerLogoUrl', 'footerImageUrl'].forEach(function(key) {
        const value = data.assets[key];
        if (value) {
          updateAssetPreview(key, value);
          const img = new Image();
          img.onload = function() {
            updateAssetInfo(key, value, img.width, img.height);
          };
          img.src = value;
        } else {
          clearAssetPreview(key);
        }
      });
    }
  } catch (e) {
    console.error('Failed to load assets:', e);
  }
}

function updateAssetPreview(key, dataUrl) {
  const name = key.replace('Url', '');
  const preview = document.getElementById(name + 'Preview');
  const placeholder = document.getElementById(name + 'Placeholder');

  if (preview && placeholder) {
    preview.innerHTML = '<img src="' + dataUrl + '" alt="' + getAssetLabel(key) + '">';
    placeholder.style.display = 'none';
  }
}

function clearAssetPreview(key) {
  const name = key.replace('Url', '');
  const preview = document.getElementById(name + 'Preview');
  const placeholder = document.getElementById(name + 'Placeholder');
  const info = document.getElementById(name + 'Info');

  if (preview) preview.innerHTML = '';
  if (placeholder) placeholder.style.display = 'block';
  if (info) info.textContent = '';
}

function updateAssetInfo(key, dataUrl, width, height) {
  const name = key.replace('Url', '');
  const info = document.getElementById(name + 'Info');

  if (info) {
    const sizeKB = Math.round(dataUrl.length / 1024);
    info.textContent = width + 'x' + height + ' (' + sizeKB + ' KB)';
    info.className = sizeKB > 100 ? 'asset-info warning' : 'asset-info';
  }
}

function getAssetLabel(key) {
  const labels = {
    logoUrl: 'Logo',
    partnerLogoUrl: 'Partner logo',
    footerImageUrl: 'Footer banner'
  };
  return labels[key] || key;
}

function showAssetError(msg) {
  const el = document.getElementById('assetError');
  const msgEl = document.getElementById('assetMessage');
  if (msgEl) msgEl.style.display = 'none';
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 5000);
  }
}

function showAssetMessage(msg) {
  const el = document.getElementById('assetMessage');
  const errEl = document.getElementById('assetError');
  if (errEl) errEl.style.display = 'none';
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 3000);
  }
}

// ===========================================
// Initialization
// ===========================================

function init() {
  // Initialize handlers
  initXmlModeHandlers();
  initModalAssetHandlers();
  initAssetHandlers();

  // Close modal when clicking outside
  document.getElementById('clientModal').addEventListener('click', function(e) {
    if (e.target === this) closeClientModal();
  });

  // Initial data load
  refresh();
  loadXmlConfig();
  loadEventName();
  loadInitialLogs();
  loadClients();
  loadAssets();
  connectLogWebSocket();

  // Periodic refresh
  setInterval(refresh, 2000);
  setInterval(loadXmlConfig, 5000);
  setInterval(loadEventName, 5000);
  setInterval(loadClients, 3000);
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
