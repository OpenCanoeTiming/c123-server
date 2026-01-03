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
const ws = new WebSocket(`ws://${serverUrl}/ws`);

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

### Reference Implementation

A complete TypeScript implementation is available at [`discovery-client.ts`](./discovery-client.ts).

Copy the file into your scoreboard project and use it:

```typescript
import {
  discoverC123Server,
  getWebSocketUrl,
  isServerAlive,
  getServerInfo,
} from './discovery-client';

// Basic usage
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

The implementation includes:

- `discoverC123Server()` - Main discovery function with caching
- `getLocalIPViaWebRTC()` - WebRTC-based local IP detection
- `scanSubnet()` - Parallel subnet scanning with optimized order
- `probeServer()` - Single server probe with timeout
- `isServerAlive()` - Server availability check
- `getServerInfo()` - Get server details (version, event name)
- `normalizeServerUrl()` - URL normalization helper
- `getWebSocketUrl()` - Convert HTTP URL to WebSocket URL

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

| Type | Frequency | Description |
|------|-----------|-------------|
| `TimeOfDay` | ~1/second | Heartbeat with current time |
| `OnCourse` | ~2/second | Competitors currently on course |
| `Results` | ~20-40s | Result tables (rotates through categories) |
| `RaceConfig` | ~20s | Gate configuration |
| `Schedule` | ~40s | Race schedule |

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

## XML Change Notifications

The main WebSocket connection (`/ws`) also receives XML change notifications. Listen for `XmlChange` messages:

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
  }
};
```

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
- [CLI-DIFFERENCES.md](CLI-DIFFERENCES.md) - Migration guide from CLI format
