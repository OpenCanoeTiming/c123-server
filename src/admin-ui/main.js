/**
 * C123 Server - Admin Dashboard JavaScript
 * Extracted from UnifiedServer.ts
 */

// ===========================================
// Toast Notifications (D3)
// ===========================================

const toastIcons = {
  success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
  error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
  warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
  info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
};

let toastContainer = null;

function initToastContainer() {
  if (toastContainer) return;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('role', 'region');
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(toastContainer);
}

function showToast(message, type, duration) {
  if (type === undefined) type = 'info';
  if (duration === undefined) duration = 4000;

  initToastContainer();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'alert');

  toast.innerHTML =
    '<span class="toast-icon">' + (toastIcons[type] || toastIcons.info) + '</span>' +
    '<span class="toast-message">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" aria-label="Close notification">' +
      '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">' +
        '<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>' +
      '</svg>' +
    '</button>';

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', function() {
    removeToast(toast);
  });

  toastContainer.appendChild(toast);

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(function() {
      removeToast(toast);
    }, duration);
  }

  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.classList.add('toast-exit');
  setTimeout(function() {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 200);
}

// ===========================================
// Focus Trap for Modal (D1)
// ===========================================

let focusTrapElement = null;
let lastFocusedElement = null;

function trapFocus(element) {
  lastFocusedElement = document.activeElement;
  focusTrapElement = element;

  // Make modal content focusable
  element.setAttribute('tabindex', '-1');
  element.focus();

  document.addEventListener('keydown', handleFocusTrap);
}

function releaseFocus() {
  document.removeEventListener('keydown', handleFocusTrap);

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }

  focusTrapElement = null;
  lastFocusedElement = null;
}

function handleFocusTrap(e) {
  if (!focusTrapElement) return;
  if (e.key !== 'Tab') return;

  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = focusTrapElement.querySelectorAll(focusableSelectors);
  const focusable = Array.prototype.filter.call(focusableElements, function(el) {
    return el.offsetParent !== null; // visible elements only
  });

  if (focusable.length === 0) return;

  const firstFocusable = focusable[0];
  const lastFocusable = focusable[focusable.length - 1];

  if (e.shiftKey) {
    // Shift+Tab
    if (document.activeElement === firstFocusable || document.activeElement === focusTrapElement) {
      e.preventDefault();
      lastFocusable.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }
}

// ===========================================
// Loading State Helpers (D2)
// ===========================================

function setButtonLoading(button, loading) {
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

function withLoading(button, asyncFn) {
  return async function() {
    setButtonLoading(button, true);
    try {
      await asyncFn.apply(this, arguments);
    } finally {
      setButtonLoading(button, false);
    }
  };
}

// ===========================================
// Tab Navigation
// ===========================================

let currentTab = 'logs';
const validTabs = ['logs', 'sources', 'xml', 'assets'];

function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(function(tab) {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    const isActive = panel.id === 'panel-' + tabId;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  currentTab = tabId;

  // Store in URL hash for persistence
  window.location.hash = tabId;
}

function initTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash && validTabs.includes(hash)) {
    switchTab(hash);
  }
}

/**
 * Keyboard navigation for tabs (Arrow keys, Home, End)
 */
function initTabKeyboardNavigation() {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;

  tablist.addEventListener('keydown', function(e) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const currentIndex = validTabs.indexOf(currentTab);

    let newIndex = -1;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== -1) {
      switchTab(validTabs[newIndex]);
      tabs[newIndex].focus();
    }
  });
}

// ===========================================
// Compact Status Bar
// ===========================================

function renderStatusBar(sources) {
  const statusBar = document.getElementById('statusBar');
  if (!statusBar) return;

  const html = sources.map(function(s) {
    const statusCls = statusClass(s.status);
    // For XML source, show full path; for TCP/UDP show host:port
    const details = s.host ? s.host + ':' + s.port : (s.path || '-');
    const isXml = s.type === 'xml';
    return '<div class="status-bar-item' + (isXml ? ' status-bar-item-wide' : '') + '">' +
      '<span class="status-dot ' + statusCls + '"></span>' +
      '<span class="status-bar-label">' + s.name + '</span>' +
      '<span class="status-bar-value' + (isXml ? ' status-bar-value-path' : '') + '" title="' + escapeHtml(details) + '">' + escapeHtml(details) + '</span>' +
      '</div>';
  }).join('');

  statusBar.innerHTML = html;
}

// ===========================================
// Utility Functions
// ===========================================

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

function statusClass(status) {
  if (status === 'connected') return 'status-dot-success';
  if (status === 'connecting') return 'status-dot-warning status-dot-pulse';
  return 'status-dot-error';
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

    // Update header status indicators
    updateHeaderStatus(data.sources);

    // Update compact status bar
    renderStatusBar(data.sources);

    // Skip table updates if user has text selected (to preserve copy ability)
    if (!hasTextSelection()) {
      // Sources table (in Sources tab)
      const sourcesBody = document.querySelector('#sourcesTable tbody');
      if (sourcesBody) {
        sourcesBody.innerHTML = data.sources.map(s =>
          '<tr>' +
          '<td>' + escapeHtml(s.name) + '</td>' +
          '<td>' + s.type.toUpperCase() + '</td>' +
          '<td><span class="status-dot ' + statusClass(s.status) + '"></span>' + s.status + '</td>' +
          '<td>' + escapeHtml(s.host ? s.host + ':' + s.port : (s.path || '-')) + '</td>' +
          '</tr>'
        ).join('');
      }
    }

    document.getElementById('lastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById('lastUpdate').innerHTML = '<span class="error">Error: ' + e.message + '</span>';
  }
}

/**
 * Update header status indicators based on source statuses
 */
function updateHeaderStatus(sources) {
  const tcpEl = document.getElementById('headerTcpStatus');
  const udpEl = document.getElementById('headerUdpStatus');
  const xmlEl = document.getElementById('headerXmlStatus');
  const liveEl = document.getElementById('headerLive');

  // Find source statuses
  const tcp = sources.find(s => s.type === 'tcp');
  const udp = sources.find(s => s.type === 'udp');
  const xml = sources.find(s => s.type === 'file' || s.type === 'xml');

  // Update TCP status
  if (tcpEl && tcp) {
    tcpEl.className = 'status-dot ' + statusClass(tcp.status);
  }

  // Update UDP status
  if (udpEl && udp) {
    udpEl.className = 'status-dot ' + statusClass(udp.status);
  }

  // Update XML status
  if (xmlEl && xml) {
    xmlEl.className = 'status-dot ' + statusClass(xml.status);
  }

  // Show LIVE indicator if TCP is connected
  if (liveEl) {
    liveEl.style.display = (tcp && tcp.status === 'connected') ? 'flex' : 'none';
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

let eventNameEditMode = false;

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

function toggleEventNameEdit() {
  eventNameEditMode = !eventNameEditMode;
  const form = document.getElementById('eventNameForm');
  const input = document.getElementById('eventNameInput');

  if (eventNameEditMode) {
    form.style.display = 'flex';
    input.focus();
  } else {
    form.style.display = 'none';
  }
}

async function saveEventName() {
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

    // Hide form after successful save
    eventNameEditMode = false;
    document.getElementById('eventNameForm').style.display = 'none';
    showToast('Event name saved', 'success');
  } catch (e) {
    showEventError('Failed to set event name: ' + e.message);
  }
}

function cancelEventNameEdit() {
  eventNameEditMode = false;
  document.getElementById('eventNameForm').style.display = 'none';
  document.getElementById('eventError').style.display = 'none';
  loadEventName(); // Reset input to current value
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

function formatLogTime(iso) {
  if (!iso) return '';
  return iso.slice(11, 23); // HH:mm:ss.SSS
}

function renderLogEntry(entry) {
  const time = formatLogTime(entry.timestamp);
  const level = entry.level.toUpperCase().padEnd(5);
  const levelClass = 'log-level log-level-' + entry.level;
  return '<div class="log-entry" data-level="' + entry.level + '">' +
    '<span class="log-time">' + time + '</span>' +
    '<span class="' + levelClass + '">' + level + '</span>' +
    '<span class="log-component">' + escapeHtml(entry.component) + '</span>' +
    '<span class="log-message">' + escapeHtml(entry.message) + '</span>' +
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
  const onlineCountEl = document.getElementById('clientsOnlineCount');
  const totalCountEl = document.getElementById('clientsTotalCount');

  const onlineCount = clientsData.filter(c => c.online).length;

  // Update count displays
  if (onlineCountEl) onlineCountEl.textContent = onlineCount;
  if (totalCountEl) totalCountEl.textContent = clientsData.length;

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
  const statusText = client.online ? 'Online' : 'Offline';
  const label = client.label || '(unnamed)';
  const labelClass = client.label ? '' : 'empty';

  // Show configKey (clientId or IP) and actual IP if different
  const configKey = client.configKey || client.ip;
  const idTypeLabel = client.hasExplicitId ? 'ID' : 'IP';
  const ipHint = client.hasExplicitId && client.ipAddress
    ? '<div class="client-ip-hint">from ' + escapeHtml(client.ipAddress) + '</div>'
    : '';

  // Build config display
  const cfg = client.serverConfig || {};
  var configHtml = '';

  if (cfg.type || cfg.displayRows || cfg.customTitle) {
    configHtml = '<div class="client-config">';
    if (cfg.type) {
      configHtml += '<div class="client-config-row">' +
        '<svg class="client-config-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>' +
        '<span class="client-config-label">Layout</span>' +
        '<span class="client-config-value">' + escapeHtml(cfg.type) + '</span>' +
        '</div>';
    }
    if (cfg.displayRows) {
      configHtml += '<div class="client-config-row">' +
        '<svg class="client-config-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>' +
        '<span class="client-config-label">Rows</span>' +
        '<span class="client-config-value">' + cfg.displayRows + '</span>' +
        '</div>';
    }
    if (cfg.customTitle) {
      configHtml += '<div class="client-config-row">' +
        '<svg class="client-config-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/></svg>' +
        '<span class="client-config-label">Title</span>' +
        '<span class="client-config-value">' + escapeHtml(truncate(cfg.customTitle, 20)) + '</span>' +
        '</div>';
    }
    configHtml += '</div>';
  } else {
    configHtml = '<div class="client-params"><span class="client-param">Default configuration</span></div>';
  }

  // Action buttons with icons
  const editIcon = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>';
  const refreshIcon = '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>';

  // Card status class for colored left border (design system .card-status-*)
  const cardStatusClass = client.online ? 'card-status-success' : '';

  // Use design system .card .card-interactive + .card-compact + status variant
  return '<div class="card card-interactive card-compact client-card ' + cardStatusClass + ' ' + statusClass + '" data-ip="' + escapeHtml(configKey) + '">' +
    '<div class="client-header">' +
      '<div class="client-identity">' +
        '<span class="client-ip" title="' + idTypeLabel + ': ' + escapeHtml(configKey) + '">' + escapeHtml(configKey) + '</span>' +
        ipHint +
      '</div>' +
      '<div class="client-status">' +
        '<span class="client-status-badge ' + statusClass + '">' +
          '<span class="client-status-dot ' + statusClass + '"></span>' +
          statusText +
        '</span>' +
      '</div>' +
    '</div>' +
    '<div class="card-body client-body">' +
      '<div class="client-label ' + labelClass + '" onclick="openClientModal(\'' + escapeHtml(configKey) + '\')">' + escapeHtml(label) + '</div>' +
      configHtml +
      '<div class="client-actions">' +
        '<button class="client-btn primary" onclick="openClientModal(\'' + escapeHtml(configKey) + '\')">' + editIcon + ' Edit</button>' +
        (client.online ? '<button class="client-btn refresh" onclick="refreshClient(\'' + escapeHtml(configKey) + '\')">' + refreshIcon + ' Refresh</button>' : '') +
      '</div>' +
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

  // Set status badge
  const statusBadge = document.getElementById('modalClientStatus');
  const isOnline = client?.online;
  statusBadge.className = 'client-status-badge ' + (isOnline ? 'online' : 'offline');
  statusBadge.innerHTML = '<span class="client-status-dot ' + (isOnline ? 'online' : 'offline') + '"></span>' + (isOnline ? 'Online' : 'Offline');

  document.getElementById('modalLabel').value = client?.label || '';

  // Config fields
  const cfg = client?.serverConfig || {};
  document.getElementById('modalType').value = cfg.type || '';
  document.getElementById('modalDisplayRows').value = cfg.displayRows || '';
  document.getElementById('modalCustomTitle').value = cfg.customTitle || '';
  document.getElementById('modalClientId').value = cfg.clientId || '';
  // scrollToFinished: default true if not set
  document.getElementById('modalScrollToFinished').checked = cfg.scrollToFinished !== false;

  // Load assets into modal
  loadModalAssets(cfg.assets);

  document.getElementById('modalError').style.display = 'none';
  document.getElementById('clientModal').style.display = 'flex';

  // Enable focus trap
  const modalContent = document.querySelector('#clientModal .modal-content');
  if (modalContent) {
    trapFocus(modalContent);
  }
}

function closeClientModal() {
  document.getElementById('clientModal').style.display = 'none';
  currentModalIp = null;

  // Release focus trap
  releaseFocus();
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
  // Also show toast for better visibility
  showToast(msg, 'error');
}

function showClientMessage(msg, isError) {
  // Use toast notifications instead of inline message
  showToast(msg, isError ? 'error' : 'success');
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

    // Keyboard activation (Enter or Space)
    dropZone.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
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
// Asset Lightbox (E4)
// ===========================================

let currentLightbox = null;

function openLightbox(imageSrc, title, width, height) {
  if (currentLightbox) {
    closeLightbox();
  }

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-label', 'Image preview');

  const sizeInfo = width && height ? width + ' × ' + height : '';
  const sizeKB = imageSrc ? Math.round(imageSrc.length / 1024) : 0;

  lightbox.innerHTML =
    '<div class="lightbox-content" onclick="event.stopPropagation()">' +
      '<img class="lightbox-image" src="' + imageSrc + '" alt="' + escapeHtml(title || 'Preview') + '">' +
      '<div class="lightbox-info">' +
        (title ? '<span>' + escapeHtml(title) + '</span>' : '') +
        (sizeInfo ? '<span>' + sizeInfo + '</span>' : '') +
        (sizeKB ? '<span>' + sizeKB + ' KB</span>' : '') +
      '</div>' +
    '</div>' +
    '<button class="lightbox-close" onclick="closeLightbox()" aria-label="Close">' +
      '<svg viewBox="0 0 20 20" fill="currentColor">' +
        '<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>' +
      '</svg>' +
    '</button>';

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.body.appendChild(lightbox);
  currentLightbox = lightbox;

  // Trap focus and handle escape
  document.addEventListener('keydown', handleLightboxKeydown);
}

function closeLightbox() {
  if (currentLightbox) {
    currentLightbox.remove();
    currentLightbox = null;
    document.removeEventListener('keydown', handleLightboxKeydown);
  }
}

function handleLightboxKeydown(e) {
  if (e.key === 'Escape') {
    closeLightbox();
  }
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

    // Keyboard activation (Enter or Space)
    dropZone.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
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
  const dropZone = document.getElementById(name + 'DropZone');
  const label = getAssetLabel(key);

  if (preview && placeholder) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = label;
    img.style.cursor = 'zoom-in';
    img.title = 'Click to preview';

    // Store dimensions for lightbox
    img.onload = function() {
      img.dataset.width = img.naturalWidth;
      img.dataset.height = img.naturalHeight;
    };

    img.onclick = function(e) {
      e.stopPropagation();
      openLightbox(dataUrl, label, img.dataset.width, img.dataset.height);
    };

    preview.innerHTML = '';
    preview.appendChild(img);
    placeholder.style.display = 'none';
    if (dropZone) dropZone.classList.add('has-image');
  }
}

function clearAssetPreview(key) {
  const name = key.replace('Url', '');
  const preview = document.getElementById(name + 'Preview');
  const placeholder = document.getElementById(name + 'Placeholder');
  const info = document.getElementById(name + 'Info');
  const dropZone = document.getElementById(name + 'DropZone');

  if (preview) preview.innerHTML = '';
  if (placeholder) placeholder.style.display = 'flex';
  if (info) info.textContent = '';
  if (dropZone) dropZone.classList.remove('has-image');
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
  // Use toast notifications
  showToast(msg, 'error');
}

function showAssetMessage(msg) {
  // Use toast notifications
  showToast(msg, 'success');
}

// ===========================================
// Initialization
// ===========================================

function init() {
  // Initialize tab from URL hash
  initTabFromHash();

  // Listen for hash changes
  window.addEventListener('hashchange', initTabFromHash);

  // Initialize keyboard navigation for tabs
  initTabKeyboardNavigation();

  // Initialize handlers
  initXmlModeHandlers();
  initModalAssetHandlers();
  initAssetHandlers();

  // Close modal when clicking outside
  document.getElementById('clientModal').addEventListener('click', function(e) {
    if (e.target === this) closeClientModal();
  });

  // Keyboard navigation for modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('clientModal').style.display !== 'none') {
      closeClientModal();
    }
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
