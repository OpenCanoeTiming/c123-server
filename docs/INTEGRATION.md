# C123 Server Integration Guide

This guide explains how to integrate a scoreboard client with the C123 Server. It covers server discovery, WebSocket connections, REST API usage, and recommended client architecture.

---

## Quick Start

### 1. Discover or Configure Server

```javascript
// Option A: URL parameter (explicit)
const serverUrl = new URLSearchParams(location.search).get('server');

// Option B: Auto-discovery (recommended)
const serverUrl = await discoverC123Server();

// Option C: Cached from previous session
const serverUrl = localStorage.getItem('c123-server-url');
```

### 2. Connect to WebSocket (real-time data)

```javascript
// Basic connection
const ws = new WebSocket(`ws://${serverUrl}/ws`);

// With explicit clientId (recommended for multiple scoreboards)
const clientId = localStorage.getItem('c123-clientId') || 'my-scoreboard';
const ws = new WebSocket(`ws://${serverUrl}/ws?clientId=${clientId}`);

ws.onopen = () => {
  console.log('Connected to C123 Server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

### 3. Use REST API (static data)

```javascript
// Get race schedule
const schedule = await fetch(`http://${serverUrl}/api/xml/schedule`)
  .then(r => r.json());

// Get merged results for a race
const results = await fetch(`http://${serverUrl}/api/xml/races/K1M_ST_BR1_6/results?merged=true`)
  .then(r => r.json());
```

---

## Server Endpoints

All services run on a single port (default **27123**):

| Path | Protocol | Purpose |
|------|----------|---------|
| `/` | HTTP | Admin dashboard |
| `/ws` | WebSocket | Real-time C123 data (OnCourse, Results, TimeOfDay) |
| `/api/*` | HTTP | REST API (status, config, XML data) |
| `/api/discover` | HTTP | Server discovery endpoint |

**Base URL:** `http://<server>:27123`

---

## Server Discovery

The scoreboard can automatically find a C123 Server on the local network without manual configuration.

### Discovery Algorithm

```
1. Check URL parameter ?server=host:port → use directly
2. Check localStorage cache → verify if still alive
3. Get hosting server IP (where scoreboard is served from)
4. Scan subnet starting from that IP
5. Cache discovered server for future use
```

### Discovery Endpoint

**Request:**
```
GET /api/discover
```

**Response:**
```json
{
  "service": "c123-server",
  "version": "2.0.0",
  "port": 27123,
  "eventName": "Czech Cup 2025"
}
```

The endpoint has CORS enabled (`Access-Control-Allow-Origin: *`) to allow cross-origin discovery requests from browsers.

### Discovery Functions

A discovery module should implement these core functions:

| Function | Purpose |
|----------|---------|
| `discoverC123Server()` | Main discovery with caching |
| `probeServer(url)` | Single server probe with timeout |
| `isServerAlive(url)` | Quick availability check |
| `getServerInfo(url)` | Get server details (version, event) |
| `getWebSocketUrl(httpUrl)` | Convert HTTP URL to WebSocket URL |

**Example usage:**

```typescript
// Basic discovery
const serverUrl = await discoverC123Server();
if (serverUrl) {
  const ws = new WebSocket(getWebSocketUrl(serverUrl));
}

// With options
const serverUrl = await discoverC123Server({
  timeout: 500,           // Longer probe timeout
  subnets: ['10.0.0'],    // Scan specific subnet
});

// Check server info
const info = await getServerInfo('http://192.168.1.50:27123');
console.log(info?.eventName); // "Czech Cup 2025"
```

### Usage in Scoreboard

```typescript
class ScoreboardApp {
  private serverUrl: string | null = null;

  async initialize() {
    // Show "Searching for server..." UI
    this.showSearching();

    this.serverUrl = await discoverC123Server();

    if (this.serverUrl) {
      this.connect();
    } else {
      this.showManualConfig();
    }
  }

  private connect() {
    const ws = new WebSocket(`${this.serverUrl.replace('http', 'ws')}/ws`);
    // ... handle connection
  }

  private showManualConfig() {
    // Show UI for manual server URL input
    // When user enters URL, save to localStorage and retry
  }
}
```

### Discovery Timing

| Scenario | Expected Time |
|----------|---------------|
| URL parameter provided | < 50ms |
| Cached server still alive | < 250ms |
| Server on same IP as scoreboard host | < 300ms |
| Full subnet scan (worst case) | 2-5 seconds |

---

## WebSocket Connection

### Connection URL

```
ws://<server-ip>:27123/ws
```

### Initial Message

Upon connection, the server sends a `Connected` message:

```json
{
  "type": "Connected",
  "timestamp": "2025-01-02T10:30:00.000Z",
  "data": {
    "version": "2.0.0",
    "c123Connected": true,
    "xmlLoaded": true
  }
}
```

### Message Types

| Type | Source | Description |
|------|--------|-------------|
| `TimeOfDay` | C123 | Heartbeat with current time (~1/second) |
| `OnCourse` | C123 | Competitors currently on course (~2/second) |
| `Results` | C123 | Result tables - rotates through categories (~20-40s) |
| `RaceConfig` | C123 | Gate configuration (~20s) |
| `Schedule` | C123 | Race schedule (~40s) |
| `Connected` | Server | Sent on WebSocket connection |
| `XmlChange` | Server | XML file was updated |
| `ForceRefresh` | Server | Admin triggered refresh |
| `ConfigPush` | Server | Configuration pushed to client |
| `ClientState` | Client | Client reports its state (optional) |

### Message Format

All messages have the same envelope:

```json
{
  "type": "MessageType",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": { ... }
}
```

---

## Handling Real-time Data

### Basic Message Handler

```typescript
interface C123Message {
  type: string;
  timestamp: string;
  data: unknown;
}

const ws = new WebSocket('ws://192.168.1.50:27123/ws');

ws.onmessage = (event) => {
  const message: C123Message = JSON.parse(event.data);

  switch (message.type) {
    case 'OnCourse':
      handleOnCourse(message.data);
      break;
    case 'Results':
      handleResults(message.data);
      break;
    case 'TimeOfDay':
      handleTimeOfDay(message.data);
      break;
    case 'RaceConfig':
      handleRaceConfig(message.data);
      break;
    case 'Schedule':
      handleSchedule(message.data);
      break;
  }
};
```

### Handling OnCourse

```typescript
interface OnCourseData {
  total: number;
  competitors: Array<{
    bib: string;
    name: string;
    club: string;
    raceId: string;
    raceName: string;
    startOrder: number;
    dtStart: string;
    dtFinish: string | null;
    pen: number;
    time: string;
    total: string;
    ttbDiff: string;
    ttbName: string;
    rank: number;
    position: number;
  }>;
}

function handleOnCourse(data: OnCourseData) {
  // Display competitors currently on course
  for (const competitor of data.competitors) {
    console.log(`${competitor.bib} ${competitor.name}: ${competitor.time}s (rank ${competitor.rank})`);
  }
}
```

### Handling Results

```typescript
interface ResultsData {
  raceId: string;
  classId: string;
  isCurrent: boolean;
  mainTitle: string;
  subTitle: string;
  rows: Array<{
    rank: number;
    bib: string;
    name: string;
    givenName: string;
    familyName: string;
    club: string;
    time: string;
    pen: number;
    total: string;
  }>;
}

function handleResults(data: ResultsData) {
  // Only show current race results
  if (data.isCurrent) {
    displayResults(data);
  } else {
    // Cache historical results
    resultsCache.set(data.raceId, data);
  }
}
```

---

## Finish Detection

The C123 protocol does not send explicit "finish" events. Your client must detect finish by watching for `dtFinish` changes.

### Implementation

```typescript
class FinishDetector {
  private previousState = new Map<string, { dtFinish: string | null }>();

  process(competitors: Array<{ bib: string; dtFinish: string | null }>): string | null {
    let finishedBib: string | null = null;

    for (const competitor of competitors) {
      const previous = this.previousState.get(competitor.bib);

      // Finish detected: dtFinish changed from null/empty to a timestamp
      if (previous && !previous.dtFinish && competitor.dtFinish) {
        finishedBib = competitor.bib;
      }

      this.previousState.set(competitor.bib, { dtFinish: competitor.dtFinish });
    }

    // Cleanup competitors no longer on course
    const currentBibs = new Set(competitors.map(c => c.bib));
    for (const bib of this.previousState.keys()) {
      if (!currentBibs.has(bib)) {
        this.previousState.delete(bib);
      }
    }

    return finishedBib;
  }
}
```

### Usage

```typescript
const finishDetector = new FinishDetector();

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'OnCourse') {
    const finishedBib = finishDetector.process(message.data.competitors);

    if (finishedBib) {
      const competitor = message.data.competitors.find(c => c.bib === finishedBib);
      showFinishHighlight(competitor);
    }
  }
};
```

### Finish Timeline

```
t=0ms      dtFinish changes from null to "10:35:11.325"
           time changes from running (integer) to final (decimal)

t+4000ms   Competitor disappears from OnCourse
           Appears in Results
```

**Recommendation:** Show finish highlight for 4-6 seconds after detection.

---

## BR1/BR2 Merge Strategy

When displaying two-run (Best Run) races, you need a strategy to show both run times with the correct penalties.

### The Problem

The TCP stream `Results` message for BR2 has misleading data:

| Field | Expected | Actual |
|-------|----------|--------|
| `time` | BR2 time | BR2 time ✓ |
| `pen` | BR2 penalty | **Penalty of BETTER run** (may be BR1!) |
| `total` | BR2 total | **Best of both runs** |

This means you **cannot trust `Results.pen`** for displaying the actual BR2 penalty when BR1 was better.

### Data Sources and Their Reliability

| Source | Data | Latency | Reliability for BR2 pen |
|--------|------|---------|------------------------|
| **OnCourse** | `pen` for on-course competitors | Real-time | ✅ **Correct** (during and briefly after run) |
| **REST API** | `run1`, `run2` complete | ~1-2s delay | ✅ **Authoritative** |
| **Results** | `pen`, `total` | Real-time | ⚠️ **May be from BR1!** |

### Recommended Implementation

```typescript
// Priority for BR2 penalty:
// 1. OnCourse penalties (real-time, most accurate)
// 2. REST API cache (authoritative, slight delay)
// 3. Results.pen (fallback - may be wrong!)

const br2Pen = onCoursePen ?? cachedRestApiPen ?? result.pen;
```

### OnCourse Penalty Grace Period

When a competitor finishes BR2:
1. They stay in OnCourse for ~4 seconds with correct penalty
2. Then they disappear from OnCourse
3. REST API may not be updated yet (~1-2s delay)

**Solution:** Cache OnCourse penalties with a grace period (10 seconds recommended):

```typescript
interface OnCoursePenaltyCache {
  [bib: string]: {
    pen: number;
    lastSeen: number;  // timestamp
  }
}

const GRACE_PERIOD_MS = 10_000;

function getOnCoursePenalty(bib: string, cache: OnCoursePenaltyCache): number | null {
  const entry = cache[bib];
  if (!entry) return null;

  // Use cached penalty if within grace period
  if (Date.now() - entry.lastSeen < GRACE_PERIOD_MS) {
    return entry.pen;
  }

  return null;
}
```

### Complete Data Flow

```
BR2 Start ──────────────────────────────────────────────────► Time
    │
    ├─ OnCourse updates (pen accurate)
    │
    ├─ Competitor finishes
    │   └─ dtFinish set, still in OnCourse (~4s)
    │
    ├─ Competitor leaves OnCourse
    │   └─ Grace period: cached penalty still valid (10s)
    │
    ├─ Results message arrives
    │   └─ ⚠️ pen may be from BR1!
    │
    └─ REST API updated
        └─ ✅ Complete data: run1, run2, bestTotal
```

### REST API Usage for BR1/BR2

```typescript
// Fetch merged results for a class (works with either BR1 or BR2 raceId)
async function getMergedResults(raceId: string) {
  const response = await fetch(
    `http://${server}:27123/api/xml/races/${raceId}/results?merged=true`
  );
  return response.json();
}

// Response format:
{
  "results": [
    {
      "bib": "1",
      "run1": { "time": 7899, "pen": 2, "total": 8099, "rank": 1 },
      "run2": { "time": 7756, "pen": 0, "total": 7756, "rank": 2 },
      "bestTotal": 7756,
      "bestRank": 1
    }
  ],
  "merged": true,
  "classId": "K1M_ST"
}
```

### Handling Empty Objects

REST API may return `run2: {}` instead of `undefined` for competitors who haven't done BR2 yet:

```typescript
// WRONG - empty object passes this check
if (!row.run2) return undefined;

// CORRECT
if (!row.run2 || Object.keys(row.run2).length === 0) return undefined;
```

### Timing Constants (Recommended)

```typescript
const INITIAL_FETCH_DELAY_MS = 500;      // Delay before first REST fetch after BR2 start
const DEBOUNCE_FETCH_MS = 1_000;          // Debounce REST fetch after Results
const BR1_REFRESH_INTERVAL_MS = 30_000;   // Periodic refresh of REST data
const ONCOURSE_PENALTY_GRACE_MS = 10_000; // Grace period for OnCourse penalties
```

### Reference Implementation

See the V3 Scoreboard implementation at `../canoe-scoreboard-v3/docs/SolvingBR1BR2.md` for a complete analysis and working implementation.

---

## REST API Usage

### Get Race Schedule

```typescript
async function getSchedule() {
  const response = await fetch('http://192.168.1.50:27123/api/xml/schedule');
  const { schedule } = await response.json();
  return schedule;
}
```

### Get Participants

```typescript
async function getParticipants() {
  const response = await fetch('http://192.168.1.50:27123/api/xml/participants');
  const { participants } = await response.json();
  return participants;
}
```

### Get Race Results

```typescript
// Single run results
async function getResults(raceId: string) {
  const response = await fetch(`http://192.168.1.50:27123/api/xml/races/${raceId}/results`);
  const { results } = await response.json();
  return results;
}

// Merged BR1+BR2 results (recommended for two-run races)
async function getMergedResults(raceId: string) {
  const response = await fetch(`http://192.168.1.50:27123/api/xml/races/${raceId}/results?merged=true`);
  const { results } = await response.json();
  return results;
}
```

### Get Specific Run

```typescript
async function getRunResults(raceId: string, run: 'BR1' | 'BR2') {
  const response = await fetch(`http://192.168.1.50:27123/api/xml/races/${raceId}/results/${run}`);
  const { results } = await response.json();
  return results;
}
```

---

## XML Change and Admin Notifications

The main WebSocket connection (`/ws`) also receives XML change notifications and admin commands. Listen for `XmlChange` and `ForceRefresh` messages:

```typescript
// Same WebSocket connection used for real-time data
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'OnCourse':
    case 'Results':
    case 'TimeOfDay':
      // Handle real-time C123 data
      handleC123Message(message);
      break;

    case 'XmlChange':
      // XML file was updated - refresh relevant data via REST API
      const { sections, checksum } = message.data;

      if (sections.includes('Results')) {
        refreshResults();
      }
      if (sections.includes('Participants')) {
        refreshParticipants();
      }
      break;

    case 'ForceRefresh':
      // Admin triggered a refresh - reload all data
      console.log('Force refresh:', message.data.reason);
      refreshAllData();
      break;
  }
};
```

### Handling ForceRefresh

When the admin triggers a refresh from the dashboard, all connected clients receive a `ForceRefresh` message:

```typescript
function handleForceRefresh(message: { data: { reason?: string } }) {
  console.log('Refresh requested:', message.data.reason || 'No reason given');

  // Reload all cached data
  Promise.all([
    refreshSchedule(),
    refreshParticipants(),
    refreshResults(),
  ]).then(() => {
    // Re-render UI
    render();
  });
}
```

This is useful when the admin needs to force all scoreboards to update immediately, for example after fixing a configuration issue or uploading corrected data.

---

## Remote Configuration (ConfigPush)

The C123 Server can push configuration to clients remotely. This allows administrators to set display parameters (layout, rows, title) from the dashboard without requiring manual configuration on each scoreboard.

### Handling ConfigPush

When connecting, the server may send a `ConfigPush` message with stored configuration for your client's IP address:

```typescript
interface ConfigPushData {
  type?: 'vertical' | 'ledwall';
  displayRows?: number;
  customTitle?: string;
  raceFilter?: string[];
  showOnCourse?: boolean;
  showResults?: boolean;
  custom?: Record<string, string | number | boolean>;
  label?: string;
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'ConfigPush') {
    applyConfig(message.data as ConfigPushData);
  }
};

function applyConfig(config: ConfigPushData) {
  // Only apply values that are explicitly set (not undefined)
  if (config.type) setLayout(config.type);
  if (config.displayRows) setRowCount(config.displayRows);
  if (config.customTitle) setTitle(config.customTitle);

  // Handle custom parameters
  if (config.custom) {
    for (const [key, value] of Object.entries(config.custom)) {
      setCustomParam(key, value);
    }
  }
}
```

### Reporting Client State

Optionally, your client can report its current state back to the server:

```typescript
function reportState() {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ClientState',
      timestamp: new Date().toISOString(),
      data: {
        current: {
          type: currentLayout,
          displayRows: currentRows,
        },
        version: '3.0.0',
        capabilities: ['configPush', 'forceRefresh'],
      },
    }));
  }
}
```

This helps administrators see what values each scoreboard is actually using.

See [CLIENT-CONFIG.md](CLIENT-CONFIG.md) for complete documentation.

---

## Recommended Client Architecture

### State Management

```typescript
interface ScoreboardState {
  // Connection status
  connected: boolean;
  c123Connected: boolean;

  // Real-time data
  onCourse: OnCourseCompetitor[];
  currentResults: ResultsData | null;
  timeOfDay: string;

  // Cached data
  resultsCache: Map<string, ResultsData>;
  schedule: RaceSchedule[];
  participants: Map<string, Participant>;

  // UI state
  highlightBib: string | null;
  highlightUntil: number | null;
}
```

### Data Flow

```
                    ┌─────────────────┐
                    │  C123 Server    │
                    │    :27123       │
                    └────────┬────────┘
                             │ WebSocket
                             ▼
┌────────────────────────────────────────────────────┐
│                    Scoreboard                       │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐              │
│  │ WebSocket    │───▶│ Message      │              │
│  │ Client       │    │ Router       │              │
│  └──────────────┘    └──────┬───────┘              │
│                             │                       │
│         ┌───────────────────┼───────────────────┐  │
│         ▼                   ▼                   ▼  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────┐  │
│  │ OnCourse     │    │ Results      │    │ Time │  │
│  │ Handler      │    │ Handler      │    │ Sync │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┘  │
│         │                   │                       │
│         ▼                   ▼                       │
│  ┌──────────────┐    ┌──────────────┐              │
│  │ Finish       │    │ Results      │              │
│  │ Detector     │    │ Cache        │              │
│  └──────┬───────┘    └──────────────┘              │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────────────────────┐              │
│  │         State Store              │              │
│  └──────────────┬───────────────────┘              │
│                 │                                   │
│                 ▼                                   │
│  ┌──────────────────────────────────┐              │
│  │         UI Renderer              │              │
│  └──────────────────────────────────┘              │
└────────────────────────────────────────────────────┘
```

### Complete Example

```typescript
class ScoreboardClient {
  private ws: WebSocket | null = null;
  private finishDetector = new FinishDetector();
  private state: ScoreboardState;

  constructor(private serverUrl: string) {
    this.state = this.initialState();
  }

  connect() {
    this.ws = new WebSocket(`ws://${this.serverUrl}/ws`);

    this.ws.onopen = () => {
      this.state.connected = true;
      this.onStateChange();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      this.state.connected = false;
      this.onStateChange();
      // Reconnect after delay
      setTimeout(() => this.connect(), 3000);
    };
  }

  private handleMessage(message: C123Message) {
    switch (message.type) {
      case 'Connected':
        this.state.c123Connected = message.data.c123Connected;
        break;

      case 'OnCourse':
        this.handleOnCourse(message.data);
        break;

      case 'Results':
        this.handleResults(message.data);
        break;

      case 'TimeOfDay':
        this.state.timeOfDay = message.data.time;
        break;
    }

    this.onStateChange();
  }

  private handleOnCourse(data: OnCourseData) {
    this.state.onCourse = data.competitors;

    // Detect finish
    const finishedBib = this.finishDetector.process(data.competitors);
    if (finishedBib) {
      this.state.highlightBib = finishedBib;
      this.state.highlightUntil = Date.now() + 5000; // 5 second highlight
    }

    // Clear expired highlight
    if (this.state.highlightUntil && Date.now() > this.state.highlightUntil) {
      this.state.highlightBib = null;
      this.state.highlightUntil = null;
    }
  }

  private handleResults(data: ResultsData) {
    // Cache all results
    this.state.resultsCache.set(data.raceId, data);

    // Update current if this is the active race
    if (data.isCurrent) {
      this.state.currentResults = data;
    }
  }

  private onStateChange() {
    // Notify UI to re-render
    this.render();
  }

  private render() {
    // Update UI based on state
  }

  private initialState(): ScoreboardState {
    return {
      connected: false,
      c123Connected: false,
      onCourse: [],
      currentResults: null,
      timeOfDay: '',
      resultsCache: new Map(),
      schedule: [],
      participants: new Map(),
      highlightBib: null,
      highlightUntil: null,
    };
  }
}

// Usage
const client = new ScoreboardClient('192.168.1.50');
client.connect();
```

---

## Troubleshooting

### Connection Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Cannot find server | Server not running or firewall blocking | Check server is running on port 27123, check firewall settings |
| WebSocket disconnects immediately | Invalid URL or server error | Check WebSocket URL format: `ws://host:27123/ws` |
| No data received | C123 not connected to server | Check `/api/status` - verify `c123Connected: true` |
| XML data not available | XML file not configured | Check admin dashboard, verify XML file path |

### Data Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Missing results for some races | C123 rotates results, not all cached | Implement results caching per raceId |
| BR2 penalties incorrect | Using Results.pen instead of proper source | Use OnCourse.pen or REST API merged results |
| Finish not detected | Not tracking dtFinish changes | Implement FinishDetector pattern (see above) |
| Old data showing | Client not handling XmlChange/ForceRefresh | Handle these message types to refresh data |

### Configuration Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Config not applied | Client not handling ConfigPush | Implement ConfigPush handler |
| Multiple clients same config | All using IP-based identification | Use explicit `clientId` in WebSocket URL |
| Config lost after restart | Server-side: settings.json issue | Check file permissions, disk space |

### Debugging Tips

1. **Check server status:**
   ```bash
   curl http://server:27123/api/status
   ```

2. **Verify XML availability:**
   ```bash
   curl http://server:27123/api/xml/status
   ```

3. **Monitor WebSocket messages:**
   Open browser DevTools → Network → WS tab to see all messages

4. **Check server logs:**
   ```bash
   curl "http://server:27123/api/logs?limit=50&level=warn"
   ```

5. **Test discovery endpoint:**
   ```bash
   curl http://server:27123/api/discover
   ```

### Common Mistakes

1. **Hardcoding server IP** - Use discovery or allow URL parameter configuration
2. **Not caching results** - Results rotate through categories, cache all received
3. **Trusting BR2 Results.pen** - May contain BR1 penalty, use OnCourse or REST API
4. **Ignoring XmlChange** - Miss data updates, implement refresh on this message
5. **Not handling reconnection** - Network issues happen, implement exponential backoff

---

## Error Handling

### WebSocket Reconnection

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;

  constructor(
    private url: string,
    private onMessage: (data: unknown) => void
  ) {}

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // Reset delay on successful connection
    };

    this.ws.onmessage = (event) => {
      this.onMessage(JSON.parse(event.data));
    };

    this.ws.onclose = () => {
      // Exponential backoff
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}
```

### REST API Error Handling

```typescript
async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Best Practices

### 1. Cache Results

C123 rotates results for different categories. Cache all results to allow users to view any race:

```typescript
const resultsCache = new Map<string, ResultsData>();

// On Results message
resultsCache.set(data.raceId, data);

// To display a specific race
function showRace(raceId: string) {
  const results = resultsCache.get(raceId);
  if (results) displayResults(results);
}
```

### 2. Use REST API for Complete Data

The WebSocket provides real-time updates but may miss data if connection drops. Use REST API to fetch complete state:

```typescript
async function syncState() {
  const [schedule, participants] = await Promise.all([
    fetch(`http://${server}:27123/api/xml/schedule`).then(r => r.json()),
    fetch(`http://${server}:27123/api/xml/participants`).then(r => r.json()),
  ]);

  state.schedule = schedule.schedule;
  state.participants = new Map(participants.participants.map(p => [p.id, p]));
}
```

### 3. Filter by isCurrent

Only show currently running race results by default:

```typescript
if (message.type === 'Results' && message.data.isCurrent) {
  displayResults(message.data);
}
```

### 4. Handle Time Formats

Times are in centiseconds (1/100s). Convert for display:

```typescript
function formatTime(centiseconds: number): string {
  const seconds = centiseconds / 100;
  return seconds.toFixed(2);
}

// 7899 -> "78.99"
```

---

## See Also

- [C123-PROTOCOL.md](C123-PROTOCOL.md) - Complete C123 protocol reference
- [REST-API.md](REST-API.md) - REST API documentation
- [CLIENT-CONFIG.md](CLIENT-CONFIG.md) - Remote client configuration
- [CLI-DIFFERENCES.md](CLI-DIFFERENCES.md) - Migration guide from CLI format
