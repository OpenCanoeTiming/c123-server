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

function showError(elementId, msg) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
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
      } else if (msg.type === 'XmlMismatch') {
        showMismatchBanner(msg.data);
      } else if (msg.type === 'ClientsUpdate') {
        // Live update of clients list
        clientsData = msg.data.clients || [];
        renderClients();
      } else if (msg.type === 'LiveStatus') {
        // Live update of Live-Mini status
        renderLiveStatus(msg.data);
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
// Live-Mini Functions
// ===========================================

let liveStatus = null;
let liveTimerInterval = null;
let liveServerUrl = '';
let liveMasterKey = '';
let liveApiKeyValue = null;
let liveImageData = null;

/**
 * Periodically refresh relative time displays for Live-Mini channels.
 * Without this, timestamps only update when a new push happens.
 */
function startLiveTimerRefresh() {
  if (liveTimerInterval) return;
  liveTimerInterval = setInterval(() => {
    if (!liveStatus || !liveStatus.channels) return;
    const channelIdMap = { xml: 'Xml', oncourse: 'OnCourse', results: 'Results' };
    for (const [channel, idSuffix] of Object.entries(channelIdMap)) {
      const ch = liveStatus.channels[channel];
      if (ch) {
        const el = document.getElementById('liveChannel' + idSuffix + 'Last');
        if (el) {
          el.textContent = ch.lastPushAt ? formatRelativeTime(ch.lastPushAt) : 'Never';
        }
      }
    }
  }, 1000);
}

/**
 * Render Live-Mini status panel
 */
function renderLiveStatus(status) {
  liveStatus = status;
  startLiveTimerRefresh();

  const notConfigured = document.getElementById('liveNotConfigured');
  const connected = document.getElementById('liveConnected');
  const statusBadge = document.getElementById('liveStatusBadge');

  if (!notConfigured || !connected || !statusBadge) return;

  // Update status badge
  const stateBadgeMap = {
    'not_configured': { text: 'Not Configured', class: 'badge-secondary' },
    'connected': { text: 'Connected', class: 'badge-success' },
    'paused': { text: 'Paused', class: 'badge-warning' },
    'error': { text: 'Error', class: 'badge-danger' },
    'disconnected': { text: 'Disconnected', class: 'badge-secondary' }
  };
  const badge = stateBadgeMap[status.state] || stateBadgeMap['not_configured'];
  statusBadge.innerHTML = '<span class="badge ' + badge.class + '">' + escapeHtml(badge.text) + '</span>';

  // Show appropriate panel
  if (status.state === 'not_configured' || status.state === 'disconnected') {
    notConfigured.style.display = 'block';
    connected.style.display = 'none';
    return;
  }

  notConfigured.style.display = 'none';
  connected.style.display = 'block';

  // Update server & event info
  const serverDisplay = document.getElementById('liveServerDisplay');
  const eventIdDisplay = document.getElementById('liveEventIdDisplay');
  const eventStatusDisplay = document.getElementById('liveEventStatusDisplay');
  const connectedAtDisplay = document.getElementById('liveConnectedAtDisplay');

  if (serverDisplay) serverDisplay.textContent = status.serverUrl || '-';
  if (eventIdDisplay) eventIdDisplay.textContent = status.eventId || '-';
  if (eventStatusDisplay) {
    const statusBadgeClass = {
      'draft': 'badge-secondary',
      'startlist': 'badge-info',
      'running': 'badge-success',
      'finished': 'badge-warning',
      'official': 'badge-primary'
    }[status.eventStatus] || 'badge-secondary';
    eventStatusDisplay.innerHTML = '<span class="badge ' + statusBadgeClass + '">' + escapeHtml(status.eventStatus || '-') + '</span>';
  }
  if (connectedAtDisplay) {
    connectedAtDisplay.textContent = status.connectedAt ? formatRelativeTime(status.connectedAt) : '-';
  }

  // Update API key display (show full key — user can copy it)
  var apiKeyDisplay = document.getElementById('liveApiKeyDisplay');
  if (apiKeyDisplay) {
    apiKeyDisplay.textContent = liveApiKeyValue || '-';
  }

  // Update channel cards
  updateLiveChannel('Xml', status.channels.xml);
  updateLiveChannel('OnCourse', status.channels.oncourse);
  updateLiveChannel('Results', status.channels.results);

  // Update channel toggles (now inside channel cards)
  var toggleXml = document.getElementById('liveToggleXml');
  var toggleOnCourse = document.getElementById('liveToggleOnCourse');
  var toggleResults = document.getElementById('liveToggleResults');

  if (toggleXml) toggleXml.checked = status.channels.xml.enabled;
  if (toggleOnCourse) toggleOnCourse.checked = status.channels.oncourse.enabled;
  if (toggleResults) toggleResults.checked = status.channels.results.enabled;

  // Update pause button
  const pauseBtn = document.getElementById('livePauseBtn');
  const pauseBtnText = document.getElementById('livePauseBtnText');
  if (pauseBtn && pauseBtnText) {
    if (status.state === 'paused') {
      pauseBtnText.textContent = 'Resume';
    } else {
      pauseBtnText.textContent = 'Pause';
    }
  }

  // Show circuit breaker warning
  const cbWarning = document.getElementById('liveCircuitBreakerWarning');
  if (cbWarning) {
    if (status.circuitBreaker.isOpen) {
      cbWarning.style.display = 'block';
      cbWarning.textContent = 'Circuit breaker open! ' + status.circuitBreaker.consecutiveFailures + ' consecutive failures. Will retry automatically.';
    } else {
      cbWarning.style.display = 'none';
    }
  }

  // Show global error
  const errorDisplay = document.getElementById('liveErrorDisplay');
  if (errorDisplay) {
    if (status.state === 'error' && status.lastError) {
      errorDisplay.style.display = 'block';
      errorDisplay.innerHTML = '<strong>Last error:</strong> ' + escapeHtml(status.lastError);
    } else {
      errorDisplay.style.display = 'none';
    }
  }
}

/**
 * Update single channel card
 */
function updateLiveChannel(channelName, channelStatus) {
  const dot = document.getElementById('liveChannel' + channelName + 'Dot');
  const pushes = document.getElementById('liveChannel' + channelName + 'Pushes');
  const errors = document.getElementById('liveChannel' + channelName + 'Errors');
  const last = document.getElementById('liveChannel' + channelName + 'Last');

  if (!dot || !pushes || !errors || !last) return;

  // Update status dot
  if (channelStatus.enabled) {
    if (channelStatus.lastError) {
      dot.className = 'status-dot status-dot-danger';
    } else if (channelStatus.totalPushes > 0) {
      dot.className = 'status-dot status-dot-success';
    } else {
      dot.className = 'status-dot status-dot-warning';
    }
  } else {
    dot.className = 'status-dot status-dot-muted';
  }

  // Update stats
  pushes.textContent = channelStatus.totalPushes;
  errors.textContent = channelStatus.totalErrors;
  last.textContent = channelStatus.lastPushAt ? formatRelativeTime(channelStatus.lastPushAt) : 'Never';
}

/**
 * Format relative time
 */
function formatRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return diffSec + 's ago';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return Math.floor(diffSec / 86400) + 'd ago';
  } catch (e) {
    return isoString;
  }
}

/**
 * Open event creation modal
 */
async function openEventCreationModal() {
  var modal = document.getElementById('liveEventModal');
  if (!modal) return;

  // Pre-fill server URL + master key from previous values
  var serverUrlInput = document.getElementById('liveEventServerUrl');
  var masterKeyInput = document.getElementById('liveEventMasterKey');
  if (serverUrlInput) serverUrlInput.value = liveServerUrl;
  if (masterKeyInput) masterKeyInput.value = liveMasterKey;

  // Pre-fill event metadata from XML
  var mainTitleInput = document.getElementById('liveEventMainTitle');
  var eventIdInput = document.getElementById('liveEventEventId');
  var locationInput = document.getElementById('liveEventLocation');
  var disciplineSelect = document.getElementById('liveEventDiscipline');

  var eventNameEl = document.getElementById('eventName');
  if (mainTitleInput && eventNameEl) {
    mainTitleInput.value = eventNameEl.textContent.trim();
  }

  if (eventIdInput && mainTitleInput && mainTitleInput.value) {
    eventIdInput.value = mainTitleInput.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  if (locationInput) locationInput.value = '';
  if (disciplineSelect) disciplineSelect.value = 'Slalom';

  modal.style.display = 'flex';
  trapFocus(modal.querySelector('.modal-content'));
}

/**
 * Close event creation modal
 */
function closeLiveEventModal() {
  var modal = document.getElementById('liveEventModal');
  if (modal) {
    modal.style.display = 'none';
    releaseFocus();
  }
  hideError('liveEventModalError');
  clearLiveEventImage();
}

/**
 * Create live event and connect
 */
async function createLiveEvent() {
  var serverUrlInput = document.getElementById('liveEventServerUrl');
  var masterKeyInput = document.getElementById('liveEventMasterKey');
  liveServerUrl = serverUrlInput ? serverUrlInput.value.trim() : '';
  liveMasterKey = masterKeyInput ? masterKeyInput.value.trim() : '';

  if (!liveServerUrl) {
    showError('liveEventModalError', 'Please enter a server URL');
    return;
  }
  try { new URL(liveServerUrl); } catch (e) {
    showError('liveEventModalError', 'Invalid URL format');
    return;
  }

  var mainTitle = document.getElementById('liveEventMainTitle').value.trim();
  var eventId = document.getElementById('liveEventEventId').value.trim();
  var location = document.getElementById('liveEventLocation').value.trim();
  var discipline = document.getElementById('liveEventDiscipline').value;

  if (!mainTitle || !eventId) {
    showError('liveEventModalError', 'Event name and ID are required');
    return;
  }

  var metadata = {
    mainTitle: mainTitle,
    eventId: eventId,
    location: location || null,
    discipline: discipline
  };

  if (liveImageData) {
    metadata.imageData = liveImageData;
  }

  try {
    var res = await fetch('/api/live/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: liveServerUrl,
        masterKey: liveMasterKey || undefined,
        metadata: metadata
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect');
    }

    showToast('Connected to Live-Mini server', 'success');
    closeLiveEventModal();

    // Refresh status
    loadLiveStatus();
  } catch (error) {
    showError('liveEventModalError', error.message);
  }
}

/**
 * Disconnect from live
 */
async function disconnectLive() {
  if (!confirm('Disconnect from Live-Mini server? This will stop all data push.')) {
    return;
  }

  try {
    const res = await fetch('/api/live/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearConfig: true })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to disconnect');
    }

    liveApiKeyValue = null;
    liveImageData = null;
    showToast('Disconnected from Live-Mini', 'success');
    loadLiveStatus();
  } catch (error) {
    showToast('Failed to disconnect: ' + error.message, 'error');
  }
}

/**
 * Open Select Event modal (Browse Events)
 */
function openSelectEventModal() {
  var modal = document.getElementById('liveSelectEventModal');
  if (!modal) return;

  // Pre-fill server inputs from previous values
  var serverUrlInput = document.getElementById('liveBrowseServerUrl');
  var masterKeyInput = document.getElementById('liveBrowseMasterKey');
  if (serverUrlInput) serverUrlInput.value = liveServerUrl;
  if (masterKeyInput) masterKeyInput.value = liveMasterKey;

  // Reset list state
  var loadingEl = document.getElementById('liveEventsLoading');
  var emptyEl = document.getElementById('liveEventsEmpty');
  var listEl = document.getElementById('liveEventsList');
  if (loadingEl) loadingEl.style.display = 'none';
  if (emptyEl) emptyEl.style.display = 'none';
  if (listEl) listEl.innerHTML = '';
  hideError('liveSelectEventModalError');

  modal.style.display = 'flex';
  trapFocus(modal.querySelector('.modal-content'));
}

/**
 * Load events list in Browse Events modal
 */
async function loadBrowseEvents() {
  var serverUrlInput = document.getElementById('liveBrowseServerUrl');
  var masterKeyInput = document.getElementById('liveBrowseMasterKey');
  liveServerUrl = serverUrlInput ? serverUrlInput.value.trim() : '';
  liveMasterKey = masterKeyInput ? masterKeyInput.value.trim() : '';

  if (!liveServerUrl) {
    showError('liveSelectEventModalError', 'Please enter a server URL');
    return;
  }
  try { new URL(liveServerUrl); } catch (e) {
    showError('liveSelectEventModalError', 'Invalid URL format');
    return;
  }

  var loadingEl = document.getElementById('liveEventsLoading');
  var emptyEl = document.getElementById('liveEventsEmpty');
  var listEl = document.getElementById('liveEventsList');

  if (loadingEl) loadingEl.style.display = 'block';
  if (emptyEl) emptyEl.style.display = 'none';
  if (listEl) listEl.innerHTML = '';
  hideError('liveSelectEventModalError');

  try {
    var res = await fetch('/api/live/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl: liveServerUrl, masterKey: liveMasterKey || undefined })
    });
    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch events');
    }

    if (loadingEl) loadingEl.style.display = 'none';

    var events = data.events || [];
    if (events.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    var html = '';
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      var statusClass = {
        'draft': 'badge-secondary',
        'startlist': 'badge-info',
        'running': 'badge-success',
        'finished': 'badge-warning',
        'official': 'badge-primary'
      }[ev.status] || 'badge-secondary';

      var maskedKey = ev.apiKey && ev.apiKey.length > 12
        ? ev.apiKey.substring(0, 6) + '...' + ev.apiKey.substring(ev.apiKey.length - 4)
        : (ev.apiKey || '-');

      html += '<div class="live-event-row">'
        + '<div class="live-event-row-info">'
        + '<div class="live-event-row-title">' + escapeHtml(ev.mainTitle) + '</div>'
        + '<div class="live-event-row-meta">'
        + '<span>' + escapeHtml(ev.eventId) + '</span>'
        + '<span class="badge ' + statusClass + '">' + escapeHtml(ev.status) + '</span>'
        + '<span>' + escapeHtml(maskedKey) + '</span>'
        + '</div>'
        + '</div>'
        + '<button class="btn btn-sm btn-primary" data-event-id="' + escapeHtml(ev.eventId) + '" data-api-key="' + escapeHtml(ev.apiKey) + '">Connect</button>'
        + '</div>';
    }
    if (listEl) {
      listEl.innerHTML = html;
      // Event delegation for connect buttons (avoids inline JS / XSS)
      listEl.querySelectorAll('button[data-event-id]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          selectAndConnectEvent(btn.dataset.eventId, btn.dataset.apiKey);
        });
      });
    }
  } catch (error) {
    if (loadingEl) loadingEl.style.display = 'none';
    showError('liveSelectEventModalError', error.message);
  }
}

/**
 * Close Select Event modal
 */
function closeSelectEventModal() {
  var modal = document.getElementById('liveSelectEventModal');
  if (modal) {
    modal.style.display = 'none';
    releaseFocus();
  }
  hideError('liveSelectEventModalError');
}

/**
 * Connect to a selected event from the list
 */
async function selectAndConnectEvent(eventId, apiKey) {
  try {
    var res = await fetch('/api/live/reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl: liveServerUrl, apiKey: apiKey, eventId: eventId })
    });

    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect');
    }

    liveApiKeyValue = apiKey;
    showToast('Connected to event: ' + eventId, 'success');
    closeSelectEventModal();
    loadLiveStatus();
  } catch (error) {
    showError('liveSelectEventModalError', error.message);
  }
}

/**
 * Open Manual Connect modal
 */
function openManualConnectModal() {
  var modal = document.getElementById('liveManualConnectModal');
  if (!modal) return;

  // Pre-fill server URL from previous values, clear other fields
  var serverUrlInput = document.getElementById('liveManualServerUrl');
  var apiKeyInput = document.getElementById('liveManualApiKey');
  var eventIdInput = document.getElementById('liveManualEventId');
  if (serverUrlInput) serverUrlInput.value = liveServerUrl;
  if (apiKeyInput) apiKeyInput.value = '';
  if (eventIdInput) eventIdInput.value = '';

  modal.style.display = 'flex';
  trapFocus(modal.querySelector('.modal-content'));
  hideError('liveManualConnectModalError');
}

/**
 * Close Manual Connect modal
 */
function closeManualConnectModal() {
  var modal = document.getElementById('liveManualConnectModal');
  if (modal) {
    modal.style.display = 'none';
    releaseFocus();
  }
  hideError('liveManualConnectModalError');
}

/**
 * Connect manually to an existing event
 */
async function manualConnectLive() {
  var serverUrl = document.getElementById('liveManualServerUrl').value.trim();
  var apiKey = document.getElementById('liveManualApiKey').value.trim();
  var eventId = document.getElementById('liveManualEventId').value.trim();

  if (!serverUrl) {
    showError('liveManualConnectModalError', 'Please enter a server URL');
    return;
  }

  try {
    new URL(serverUrl);
  } catch (e) {
    showError('liveManualConnectModalError', 'Invalid URL format');
    return;
  }

  if (!apiKey) {
    showError('liveManualConnectModalError', 'Please enter an API key');
    return;
  }

  if (!eventId) {
    showError('liveManualConnectModalError', 'Please enter an event ID');
    return;
  }

  try {
    var res = await fetch('/api/live/reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl: serverUrl, apiKey: apiKey, eventId: eventId })
    });

    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to connect');
    }

    liveServerUrl = serverUrl;
    liveApiKeyValue = apiKey;
    showToast('Connected to event: ' + eventId, 'success');
    closeManualConnectModal();
    loadLiveStatus();
  } catch (error) {
    showError('liveManualConnectModalError', error.message);
  }
}

/**
 * Copy API key to clipboard
 */
async function copyApiKey() {
  if (!liveApiKeyValue) {
    showToast('No API key to copy', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(liveApiKeyValue);
    showToast('API key copied to clipboard', 'success');
  } catch (e) {
    // Fallback for older browsers
    var textArea = document.createElement('textarea');
    textArea.value = liveApiKeyValue;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('API key copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy API key', 'error');
    }
    document.body.removeChild(textArea);
  }
}

/**
 * Initialize live image upload handlers
 */
function initLiveImageUpload() {
  var dropZone = document.getElementById('liveImageDropZone');
  var fileInput = document.getElementById('liveImageInput');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', function(e) {
    if (e.target.tagName !== 'BUTTON') {
      fileInput.click();
    }
  });

  dropZone.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      processLiveImageFile(e.target.files[0]);
    }
  });

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
      processLiveImageFile(e.dataTransfer.files[0]);
    }
  });
}

/**
 * Process uploaded image file for live event
 */
function processLiveImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('liveEventModalError', 'Please select an image file');
    return;
  }

  if (file.size > 500 * 1024) {
    showError('liveEventModalError', 'Image must be under 500KB');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    liveImageData = e.target.result;

    var placeholder = document.getElementById('liveImagePlaceholder');
    var preview = document.getElementById('liveImagePreview');
    var previewImg = document.getElementById('liveImagePreviewImg');

    if (placeholder) placeholder.style.display = 'none';
    if (preview) {
      preview.style.display = 'flex';
      if (previewImg) previewImg.src = liveImageData;
    }
    hideError('liveEventModalError');
  };
  reader.readAsDataURL(file);
}

/**
 * Clear live event image
 */
function clearLiveEventImage() {
  liveImageData = null;

  var placeholder = document.getElementById('liveImagePlaceholder');
  var preview = document.getElementById('liveImagePreview');
  var previewImg = document.getElementById('liveImagePreviewImg');
  var fileInput = document.getElementById('liveImageInput');

  if (placeholder) placeholder.style.display = '';
  if (preview) preview.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (fileInput) fileInput.value = '';
}

/**
 * Toggle pause/resume
 */
async function toggleLivePause() {
  if (!liveStatus) return;

  const isPaused = liveStatus.state === 'paused';

  try {
    const res = await fetch('/api/live/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: !isPaused })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle pause');
    }

    showToast(isPaused ? 'Push resumed' : 'Push paused', 'success');
    loadLiveStatus();
  } catch (error) {
    showToast('Failed to toggle pause: ' + error.message, 'error');
  }
}

/**
 * Force push XML
 */
async function forcePushXml() {
  try {
    const res = await fetch('/api/live/force-push-xml', {
      method: 'POST'
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to force push');
    }

    showToast('XML push triggered', 'success');
  } catch (error) {
    showToast('Failed to push XML: ' + error.message, 'error');
  }
}

/**
 * Toggle channel push
 */
async function toggleLiveChannel(channel) {
  const checkbox = document.getElementById('liveToggle' + (channel === 'xml' ? 'Xml' : channel === 'oncourse' ? 'OnCourse' : 'Results'));
  if (!checkbox) return;

  const enabled = checkbox.checked;

  try {
    const body = {};
    body['push' + (channel === 'xml' ? 'Xml' : channel === 'oncourse' ? 'OnCourse' : 'Results')] = enabled;

    const res = await fetch('/api/live/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update config');
    }

    showToast('Channel ' + (enabled ? 'enabled' : 'disabled'), 'success');
  } catch (error) {
    showToast('Failed to update channel: ' + error.message, 'error');
    checkbox.checked = !enabled; // Revert
  }
}

/**
 * Open status transition modal
 */
function openTransitionModal() {
  if (!liveStatus) return;

  const select = document.getElementById('liveNewStatus');
  if (select && liveStatus.eventStatus) {
    select.value = liveStatus.eventStatus;
  }

  const modal = document.getElementById('liveTransitionModal');
  if (modal) {
    modal.style.display = 'flex';
    trapFocus(modal.querySelector('.modal-content'));
  }
}

/**
 * Close transition modal
 */
function closeLiveTransitionModal() {
  const modal = document.getElementById('liveTransitionModal');
  if (modal) {
    modal.style.display = 'none';
    releaseFocus();
  }
  hideError('liveTransitionModalError');
}

/**
 * Transition event status
 */
async function transitionLiveStatus() {
  if (!liveStatus || !liveStatus.eventId) return;

  const newStatus = document.getElementById('liveNewStatus').value;

  try {
    const res = await fetch('/api/live/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: liveStatus.eventId,
        status: newStatus
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to transition status');
    }

    showToast('Event status updated to ' + newStatus, 'success');
    closeLiveTransitionModal();
    loadLiveStatus();
  } catch (error) {
    showError('liveTransitionModalError', error.message);
  }
}

/**
 * Delete live event on remote server and disconnect
 */
async function deleteLiveEvent() {
  if (!liveStatus || !liveStatus.eventId) return;

  if (!confirm('Delete event "' + liveStatus.eventId + '" on the remote server? This cannot be undone.')) {
    return;
  }

  try {
    var res = await fetch('/api/live/delete-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: liveStatus.eventId })
    });

    var data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete event');
    }

    liveApiKeyValue = null;
    liveImageData = null;
    showToast('Event deleted and disconnected', 'success');
    closeLiveTransitionModal();
    loadLiveStatus();
  } catch (error) {
    showError('liveTransitionModalError', error.message);
  }
}

/**
 * Load live status from API
 */
async function loadLiveStatus() {
  try {
    var res = await fetch('/api/live/status');
    var data = await res.json();
    liveApiKeyValue = data.apiKey || null;
    renderLiveStatus(data.status);
  } catch (error) {
    console.error('Failed to load live status:', error);
  }
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

// =============================================
// XML Mismatch Banner
// =============================================

function showMismatchBanner(data) {
  var banner = document.getElementById('mismatchBanner');
  if (!banner) return;

  if (data.detected) {
    var msg = data.message || 'XML file does not match C123 live data';
    document.getElementById('mismatchMessage').textContent = msg;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function loadMismatchStatus() {
  fetch('/api/xml/mismatch')
    .then(function(res) { return res.json(); })
    .then(function(data) { showMismatchBanner(data); })
    .catch(function() { /* ignore */ });
}

function redetectXmlPath() {
  fetch('/api/config/xml/detect')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.path) {
        showToast('XML path re-detected: ' + data.path, 'success');
        loadXmlConfig();
      } else {
        showToast('No XML file detected', 'warning');
      }
    })
    .catch(function() {
      showToast('Failed to re-detect XML path', 'error');
    });
}

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
  initLiveImageUpload();

  // Close modal when clicking outside
  document.getElementById('clientModal').addEventListener('click', function(e) {
    if (e.target === this) closeClientModal();
  });

  const liveEventModal = document.getElementById('liveEventModal');
  if (liveEventModal) {
    liveEventModal.addEventListener('click', function(e) {
      if (e.target === this) closeLiveEventModal();
    });
  }

  const liveTransitionModal = document.getElementById('liveTransitionModal');
  if (liveTransitionModal) {
    liveTransitionModal.addEventListener('click', function(e) {
      if (e.target === this) closeLiveTransitionModal();
    });
  }

  var liveSelectEventModal = document.getElementById('liveSelectEventModal');
  if (liveSelectEventModal) {
    liveSelectEventModal.addEventListener('click', function(e) {
      if (e.target === this) closeSelectEventModal();
    });
  }

  var liveManualConnectModal = document.getElementById('liveManualConnectModal');
  if (liveManualConnectModal) {
    liveManualConnectModal.addEventListener('click', function(e) {
      if (e.target === this) closeManualConnectModal();
    });
  }

  // Keyboard navigation for modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const clientModal = document.getElementById('clientModal');
      if (clientModal && clientModal.style.display !== 'none') {
        closeClientModal();
      }
      if (liveEventModal && liveEventModal.style.display !== 'none') {
        closeLiveEventModal();
      }
      if (liveTransitionModal && liveTransitionModal.style.display !== 'none') {
        closeLiveTransitionModal();
      }
      if (liveSelectEventModal && liveSelectEventModal.style.display !== 'none') {
        closeSelectEventModal();
      }
      if (liveManualConnectModal && liveManualConnectModal.style.display !== 'none') {
        closeManualConnectModal();
      }
    }
  });

  // Initial data load
  refresh();
  loadXmlConfig();
  loadEventName();
  loadInitialLogs();
  loadClients();
  loadAssets();
  loadMismatchStatus();
  loadLiveStatus();
  loadUpdateCheck();
  connectLogWebSocket();

  // Periodic refresh
  setInterval(refresh, 2000);
  setInterval(loadXmlConfig, 5000);
  setInterval(loadEventName, 5000);
  setInterval(loadClients, 3000);
  // Update check is hourly — the server caches responses for 1 hour so
  // more frequent polling would just return the same payload.
  setInterval(loadUpdateCheck, 60 * 60 * 1000);
}

/**
 * Query /api/update-check and show the "new version available" banner if
 * a newer stable release is published on GitHub. Fail-safe: any error is
 * silently ignored so the banner stays hidden.
 */
async function loadUpdateCheck() {
  const banner = document.getElementById('updateBanner');
  const message = document.getElementById('updateMessage');
  const link = document.getElementById('updateLink');
  if (!banner || !message || !link) return;

  try {
    const response = await fetch('/api/update-check');
    if (!response.ok) return;
    const data = await response.json();

    if (data && data.isNewer && data.latest) {
      message.textContent =
        'A new version is available: v' + data.latest + ' (you have v' + data.current + ')';
      if (data.url) link.href = data.url;
      banner.style.display = '';
    } else {
      banner.style.display = 'none';
    }
  } catch (_err) {
    // Never break the admin UI because of a failed update check.
    banner.style.display = 'none';
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
