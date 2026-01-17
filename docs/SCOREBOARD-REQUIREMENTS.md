# Scoreboard Requirements

This document describes what a scoreboard client must implement when working with C123 Server. The server passes through raw C123 data, so the scoreboard must handle several processing tasks.

---

## Overview

| Responsibility | Implementation |
|----------------|----------------|
| Finish detection | Client (track `dtFinish`) |
| BR1/BR2 merge | Client or REST API (`?merged=true`) |
| Results filtering | Client (use `isCurrent`) |
| Competitor highlight | Client |
| Race status tracking | Client (use `isCurrent`) |

---

## 1. Finish Detection

### What It Is

Detecting when a competitor crosses the finish line. C123 does not send explicit "finish" events.

### How to Detect

Track the `dtFinish` field in OnCourse messages:

1. When `dtFinish` is `null` or empty: competitor is still on course
2. When `dtFinish` changes to a timestamp: competitor just finished

### Implementation

```typescript
class FinishDetector {
  private previousState = new Map<string, string | null>();

  /**
   * Process OnCourse data and detect finish
   * @returns Bib of competitor who just finished, or null
   */
  detect(competitors: Array<{ bib: string; dtFinish: string | null }>): string | null {
    let finishedBib: string | null = null;

    for (const competitor of competitors) {
      const previous = this.previousState.get(competitor.bib);

      // Finish detected: dtFinish was null/empty, now has value
      if (previous === null && competitor.dtFinish) {
        finishedBib = competitor.bib;
      }

      this.previousState.set(competitor.bib, competitor.dtFinish);
    }

    // Clean up competitors who left the course
    const currentBibs = new Set(competitors.map(c => c.bib));
    for (const bib of this.previousState.keys()) {
      if (!currentBibs.has(bib)) {
        this.previousState.delete(bib);
      }
    }

    return finishedBib;
  }

  /**
   * Reset detector state (e.g., on reconnect)
   */
  reset(): void {
    this.previousState.clear();
  }
}
```

### Timing Behavior

After finish detection:

| Time | Event |
|------|-------|
| t=0 | `dtFinish` changes from null to timestamp |
| t=0 | `time` changes from running (integer ms) to final (decimal seconds) |
| t+4s | Competitor disappears from OnCourse |
| t+4-20s | Competitor appears in next Results rotation |

### Recommended Behavior

- Show finish highlight for 4-6 seconds after detection
- Highlight should include competitor's final time and provisional rank
- Consider playing audio/visual notification

---

## 2. BR1/BR2 Merge Logic

### What It Is

**BR = BetterRun** (Best Run) - combining first run (BR1) and second run (BR2) results to show overall standings based on the better of two runs.

This is a popular race format in Czech Republic where competitors get two attempts and only the better result counts.

### Scoreboard Challenge

When displaying real-time results from C123 native data, the scoreboard faces a specific challenge with BetterRun format:

| Problem | Description |
|---------|-------------|
| **During BR2** | C123 shows BR2 results in real-time, but overall standings require comparing with BR1 |
| **Finish highlight** | Competitor finishes BR2, but their rank may differ between BR2-only and overall |
| **Which result to show?** | BR2 time vs overall best time - scoreboard must decide |

**Recommendation:** During BR2, fetch merged results via REST API after each finish to show correct overall standings.

### Other Race Types (No Merge Needed)

These competition formats don't have the BR1/BR2 merge problem:

| Type | RaceId Pattern | Description |
|------|----------------|-------------|
| **Cross Quarterfinal** | `*_X4_*` | Single heat, direct elimination |
| **Cross Semifinal** | `*_XS_*` | Single heat, direct elimination |
| **Cross Final** | `*_XF_*` | Single heat, final standings |
| **Time Trial** | `*_XT_*` | Qualification for Cross |
| **Single Run** | No `_BR` suffix | One run only |

For these formats, C123 results are directly usable without merge logic.

### When Merge IS Needed

- Two-run slalom races (BR1 + BR2)
- Displaying overall results during BR2
- Final standings after both runs

### Implementation Options

#### Option A: Use REST API (Recommended)

```typescript
async function getMergedResults(raceId: string): Promise<MergedResult[]> {
  const response = await fetch(
    `http://${server}:27123/api/xml/races/${raceId}/results?merged=true`
  );
  const { results } = await response.json();
  return results;
}
```

**Pros:** Simple, server handles complexity
**Cons:** Additional HTTP request

#### Option B: Client-Side Merge

```typescript
interface RunResult {
  time: number;   // seconds
  pen: number;    // penalty seconds
  total: number;  // time + pen
}

interface MergedResult {
  bib: string;
  name: string;
  club: string;
  run1?: RunResult;
  run2?: RunResult;
  bestTotal: number;
  bestRank: number;
}

function mergeResults(br1Rows: ResultRow[], br2Rows: ResultRow[]): MergedResult[] {
  const merged = new Map<string, MergedResult>();

  // Process BR1 results
  for (const row of br1Rows) {
    const run1 = parseRunResult(row);
    merged.set(row.bib, {
      bib: row.bib,
      name: row.name,
      club: row.club,
      run1,
      bestTotal: run1.total,
      bestRank: 0
    });
  }

  // Process BR2 results
  for (const row of br2Rows) {
    const run2 = parseRunResult(row);
    const existing = merged.get(row.bib);

    if (existing) {
      existing.run2 = run2;
      // Best of two runs
      if (run2.total < existing.bestTotal) {
        existing.bestTotal = run2.total;
      }
    } else {
      // Competitor only has BR2 (e.g., DNS in BR1)
      merged.set(row.bib, {
        bib: row.bib,
        name: row.name,
        club: row.club,
        run2,
        bestTotal: run2.total,
        bestRank: 0
      });
    }
  }

  // Sort by best total and assign ranks
  const sorted = Array.from(merged.values())
    .sort((a, b) => a.bestTotal - b.bestTotal);

  sorted.forEach((result, index) => {
    result.bestRank = index + 1;
  });

  return sorted;
}

function parseRunResult(row: ResultRow): RunResult {
  return {
    time: parseFloat(row.time),
    pen: row.pen,
    total: parseFloat(row.total)
  };
}
```

### RaceId Format

BR1 and BR2 races share the same class ID but differ in race ID:

| Run | RaceId Pattern | Example |
|-----|----------------|---------|
| BR1 | `{class}_BR1_{number}` | `K1M_ST_BR1_6` |
| BR2 | `{class}_BR2_{number}` | `K1M_ST_BR2_6` |

To find the corresponding run:
```typescript
function getOtherRunId(raceId: string): string {
  if (raceId.includes('_BR1_')) {
    return raceId.replace('_BR1_', '_BR2_');
  }
  return raceId.replace('_BR2_', '_BR1_');
}
```

---

## 3. Results Filtering

### What It Is

Deciding which Results messages to display. C123 rotates through all race categories.

### Why Needed

Without filtering, the display would constantly switch between different races.

### Available Approaches

#### Approach A: Show Only Current Race

```typescript
function handleResults(data: ResultsData): void {
  if (data.isCurrent) {
    displayResults(data);
  }
}
```

Use `isCurrent: true` to identify the actively running race.

#### Approach B: Let User Select Race

```typescript
const resultsCache = new Map<string, ResultsData>();
let selectedRaceId: string | null = null;

function handleResults(data: ResultsData): void {
  // Cache all incoming results
  resultsCache.set(data.raceId, data);

  // Display if this is the selected race
  if (data.raceId === selectedRaceId) {
    displayResults(data);
  }
}

function selectRace(raceId: string): void {
  selectedRaceId = raceId;
  const cached = resultsCache.get(raceId);
  if (cached) {
    displayResults(cached);
  }
}
```

#### Approach C: Auto-Follow with Manual Override

```typescript
let autoFollow = true;
let selectedRaceId: string | null = null;

function handleResults(data: ResultsData): void {
  resultsCache.set(data.raceId, data);

  if (autoFollow && data.isCurrent) {
    displayResults(data);
  } else if (!autoFollow && data.raceId === selectedRaceId) {
    displayResults(data);
  }
}

// User manually selects a race
function manualSelectRace(raceId: string): void {
  autoFollow = false;
  selectedRaceId = raceId;
}

// User wants to return to auto-follow
function enableAutoFollow(): void {
  autoFollow = true;
}
```

### Results Rotation Timing

| Message Type | Frequency |
|--------------|-----------|
| Results (current race) | Every 20-40 seconds |
| Results (all races) | Full rotation every 2-3 minutes |

---

## 4. OnCourse to Current Competitor

### What It Is

Determining which on-course competitor to highlight (typically the one closest to finish).

### How to Identify

OnCourse data includes a `position` field:
- `position: 1` = closest to finish line
- Higher positions = further from finish

```typescript
function getCurrentCompetitor(competitors: OnCourseCompetitor[]): OnCourseCompetitor | null {
  if (competitors.length === 0) return null;

  // Find competitor closest to finish (lowest position number)
  return competitors.reduce((closest, current) =>
    current.position < closest.position ? current : closest
  );
}
```

### Alternative: Use Start Order

If position data is unavailable:

```typescript
function getCurrentCompetitorByStartOrder(
  competitors: OnCourseCompetitor[]
): OnCourseCompetitor | null {
  if (competitors.length === 0) return null;

  // Lowest start order = started earliest = closest to finish
  return competitors.reduce((earliest, current) =>
    current.startOrder < earliest.startOrder ? current : earliest
  );
}
```

---

## 5. State Management

### Recommended State Structure

```typescript
interface ScoreboardState {
  // Connection
  wsConnected: boolean;
  c123Available: boolean;
  xmlAvailable: boolean;

  // Real-time data
  onCourse: OnCourseCompetitor[];
  currentRaceResults: ResultsData | null;
  timeOfDay: string;

  // Cached data
  resultsCache: Map<string, ResultsData>;
  schedule: Race[];
  participants: Map<string, Participant>;

  // Finish detection
  finishDetector: FinishDetector;
  highlightBib: string | null;
  highlightExpiresAt: number | null;

  // User selection
  selectedRaceId: string | null;
  autoFollowCurrentRace: boolean;
}
```

### State Updates

| Event | State Changes |
|-------|---------------|
| OnCourse message | Update `onCourse`, run finish detection, update highlight |
| Results message | Update cache, conditionally update `currentRaceResults` |
| TimeOfDay message | Update `timeOfDay` |
| User selects race | Set `selectedRaceId`, disable `autoFollowCurrentRace` |
| Highlight expires | Clear `highlightBib` and `highlightExpiresAt` |

---

## 6. Error Handling

### Connection Loss

```typescript
class ScoreboardClient {
  private reconnectDelay = 1000;
  private maxDelay = 30000;

  private handleDisconnect(): void {
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);

    // Show connection lost indicator
    this.state.wsConnected = false;
    this.render();

    // Attempt reconnect
    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  private handleConnect(): void {
    // Reset backoff
    this.reconnectDelay = 1000;

    // Reset finish detector (state may be stale)
    this.state.finishDetector.reset();

    // Sync complete state from REST API
    this.syncFromRestApi();
  }
}
```

### Missed Data

After reconnection, sync state from REST API:

```typescript
async function syncFromRestApi(): Promise<void> {
  const [schedule, participants] = await Promise.all([
    fetch(`http://${server}:27123/api/xml/schedule`).then(r => r.json()),
    fetch(`http://${server}:27123/api/xml/participants`).then(r => r.json())
  ]);

  state.schedule = schedule.schedule;
  state.participants = new Map(
    participants.participants.map(p => [p.bib, p])
  );
}
```

---

## 7. Time Formats

### OnCourse Time

Running time in OnCourse is in **centiseconds** (1/100th of a second):

```typescript
// OnCourse time: "8115" = 81.15 seconds
function formatRunningTime(centiseconds: string): string {
  const cs = parseInt(centiseconds, 10);
  const seconds = cs / 100;
  return seconds.toFixed(2); // "81.15"
}
```

### Results Time

Final time in Results is in **seconds** (decimal string):

```typescript
// Results time: "78.99" = 78.99 seconds
function formatFinalTime(time: string): string {
  return parseFloat(time).toFixed(2); // Already in seconds
}
```

### dtFinish / dtStart

ISO 8601 time strings:

```typescript
// "16:14:08.115" or "2025-01-02T16:14:08.115Z"
function formatTimestamp(dt: string): string {
  // Extract time portion if full ISO
  const time = dt.includes('T') ? dt.split('T')[1].split('Z')[0] : dt;
  return time.substring(0, 8); // "16:14:08"
}
```

---

## Implementation Checklist

Essential features for a working scoreboard:

- [ ] **WebSocket connection** with auto-reconnect
- [ ] **Message routing** for OnCourse, Results, TimeOfDay
- [ ] **Finish detection** using dtFinish tracking
- [ ] **Results filtering** by isCurrent or user selection
- [ ] **Results caching** for all received races
- [ ] **BR1/BR2 merge** via REST API or client logic
- [ ] **Current competitor** identification from OnCourse
- [ ] **Time formatting** for running and final times
- [ ] **Connection status** display
- [ ] **Error recovery** with state sync from REST API

---

## See Also

- [INTEGRATION.md](INTEGRATION.md) - How to connect to C123 Server
- [C123-PROTOCOL.md](C123-PROTOCOL.md) - C123 message reference
- [REST-API.md](REST-API.md) - REST API documentation
