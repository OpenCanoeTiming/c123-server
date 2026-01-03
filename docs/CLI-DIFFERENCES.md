# CLI vs C123 Server - Differences Guide

This document describes the differences between the legacy CLI format (v1.0.0-cli) and the new C123 Server format. Use this guide when migrating a scoreboard client from CLI to native C123 data.

---

## Overview

The legacy CLI format emulated the behavior of the Canoe123 CLI interface. The new C123 Server format passes through authentic C123 protocol data with minimal transformation.

| Aspect | CLI Format (v1) | C123 Server (v2) |
|--------|-----------------|------------------|
| Data source | Processed/aggregated | Raw C123 data |
| Message types | `top`, `oncourse`, `comp` | `Results`, `OnCourse`, `TimeOfDay`, ... |
| State management | Server-side | Client-side |
| Finish detection | `HighlightBib` from server | Client watches `dtFinish` |
| Race status | Numeric `RaceStatus` | `Current="Y/N"` attribute |

---

## Message Type Mapping

### Results (was: `top`)

**CLI format:**
```json
{
  "msg": "top",
  "HighlightBib": "9",
  "RaceStatus": 3,
  "data": [
    {
      "rank": 1,
      "bib": "1",
      "name": "KREJCI Jakub",
      "total": "78.99",
      "pen": 2
    }
  ]
}
```

**C123 Server format:**
```json
{
  "type": "Results",
  "timestamp": "2025-01-02T10:30:46.456Z",
  "data": {
    "raceId": "K1M_ST_BR2_6",
    "classId": "K1M_ST",
    "isCurrent": true,
    "mainTitle": "K1m - short track",
    "subTitle": "2nd Run",
    "rows": [
      {
        "rank": 1,
        "bib": "1",
        "name": "KREJCI Jakub",
        "givenName": "Jakub",
        "familyName": "KREJCI",
        "club": "TJ DUKLA Praha",
        "time": "78.99",
        "pen": 2,
        "total": "78.99"
      }
    ]
  }
}
```

**Key differences:**

| CLI | C123 Server | Migration Notes |
|-----|-------------|-----------------|
| `msg: "top"` | `type: "Results"` | Change message type check |
| `HighlightBib` | Not present | Implement finish detection (see below) |
| `RaceStatus` (1-5) | `isCurrent` (boolean) | Use `isCurrent: true` to identify active race |
| `data[]` | `data.rows[]` | Data nested under `rows` property |
| Flat structure | Includes race metadata | Access `mainTitle`, `subTitle`, `raceId` |

---

### OnCourse (was: `oncourse`)

**CLI format:**
```json
{
  "msg": "oncourse",
  "data": [
    {
      "bib": "9",
      "name": "KOPECEK Michal",
      "time": "81.15",
      "pen": 4,
      "rank": 3
    }
  ]
}
```

**C123 Server format:**
```json
{
  "type": "OnCourse",
  "timestamp": "2025-01-02T16:14:08.115Z",
  "data": {
    "total": 2,
    "competitors": [
      {
        "bib": "9",
        "name": "KOPECEK Michal",
        "club": "VS Tabor",
        "raceId": "K1M_ST_BR2_6",
        "raceName": "K1m - short track - 2nd run",
        "startOrder": 9,
        "dtStart": "16:14:00.000",
        "dtFinish": null,
        "pen": 54,
        "time": "81.15",
        "total": "81.69",
        "ttbDiff": "+12.79",
        "ttbName": "J. KREJCI",
        "rank": 8,
        "position": 1
      }
    ]
  }
}
```

**Key differences:**

| CLI | C123 Server | Migration Notes |
|-----|-------------|-----------------|
| `msg: "oncourse"` | `type: "OnCourse"` | Change message type check |
| `data[]` | `data.competitors[]` | Data nested under `competitors` |
| Limited fields | Full C123 data | More fields available: `dtStart`, `dtFinish`, `ttbDiff`, etc. |
| No position info | `position` field | Shows order on course (1 = closest to finish) |

---

### Competitor Highlight (was: `comp`)

**CLI format:**
```json
{
  "msg": "comp",
  "data": {
    "bib": "9",
    "name": "KOPECEK Michal",
    "time": "81.15",
    "pen": 4,
    "rank": 3,
    "finished": true
  }
}
```

**C123 Server:** No direct equivalent. The scoreboard must implement this logic itself.

**Migration:** See [Finish Detection](#finish-detection) section below.

---

## Removed Features

These features from CLI are not present in C123 Server. The scoreboard client must implement them.

### 1. HighlightBib

**CLI behavior:** Server sent `HighlightBib` in `top` messages to indicate which competitor just finished.

**C123 Server:** Not available. Client must detect finish by watching `dtFinish` field changes.

### 2. RaceStatus Numbers

**CLI behavior:** Numeric `RaceStatus` field (1=Scheduled, 3=Running, 5=Finished).

**C123 Server:** Use `isCurrent: true/false` in Results to identify active race.

### 3. Aggregated `comp` Message

**CLI behavior:** Server aggregated data and sent `comp` message when competitor finished.

**C123 Server:** Not available. Client must:
1. Watch for finish in OnCourse
2. Build competitor detail from Results and OnCourse data

---

## Finish Detection

The scoreboard must implement finish detection by tracking `dtFinish` changes.

### Implementation

```typescript
interface OnCourseCompetitor {
  bib: string;
  name: string;
  dtFinish: string | null;
  // ... other fields
}

class FinishDetector {
  private previousState: Map<string, OnCourseCompetitor> = new Map();

  processOnCourse(competitors: OnCourseCompetitor[]): OnCourseCompetitor | null {
    let finishedCompetitor: OnCourseCompetitor | null = null;

    for (const competitor of competitors) {
      const previous = this.previousState.get(competitor.bib);

      // Detect finish: dtFinish was empty, now has value
      if (previous && !previous.dtFinish && competitor.dtFinish) {
        finishedCompetitor = competitor;
      }

      this.previousState.set(competitor.bib, competitor);
    }

    // Clean up competitors no longer on course
    const currentBibs = new Set(competitors.map(c => c.bib));
    for (const bib of this.previousState.keys()) {
      if (!currentBibs.has(bib)) {
        this.previousState.delete(bib);
      }
    }

    return finishedCompetitor;
  }
}
```

### Usage

```typescript
const detector = new FinishDetector();

ws.on('message', (msg) => {
  const message = JSON.parse(msg);

  if (message.type === 'OnCourse') {
    const finished = detector.processOnCourse(message.data.competitors);

    if (finished) {
      // Competitor just finished - trigger highlight animation
      showFinishHighlight(finished);
    }
  }
});
```

### Finish Timeline

After `dtFinish` becomes non-null:

```
t=0ms     dtFinish changes from null to "10:35:11.325"
          time changes from running (integer) to final (decimal: "51.20")

t+4000ms  Competitor disappears from OnCourse
          Appears in next Results rotation
```

**Recommendation:** Display highlight for 4-6 seconds after detecting finish.

---

## Results Filtering

C123 rotates results for all categories. The scoreboard should filter to show relevant data.

### Show Only Current Race

```typescript
ws.on('message', (msg) => {
  const message = JSON.parse(msg);

  if (message.type === 'Results') {
    if (message.data.isCurrent) {
      // This is the currently running race - display it
      displayResults(message.data);
    } else {
      // Historical results - optionally cache for later
      cacheResults(message.data.raceId, message.data);
    }
  }
});
```

### Track Multiple Categories

```typescript
const resultsCache = new Map<string, ResultsData>();

ws.on('message', (msg) => {
  const message = JSON.parse(msg);

  if (message.type === 'Results') {
    // Cache all results
    resultsCache.set(message.data.raceId, message.data);

    // Update display if this is the selected race
    if (message.data.raceId === selectedRaceId) {
      displayResults(message.data);
    }
  }
});
```

---

## BR1/BR2 Merge Logic

**BR = BetterRun** (Best Run) - a popular format in Czech Republic where competitors get two runs and only the better result counts.

### The Challenge

For two-run races, the scoreboard may need to merge BR1 and BR2 results. This creates a specific challenge during BR2:

| Issue | Description |
|-------|-------------|
| Real-time vs overall | C123 shows BR2 results, but scoreboard needs overall standings |
| Finish rank mismatch | Competitor's BR2 rank may differ from overall best rank |
| User expectation | Viewers expect to see overall standings, not just current run |

### Other Race Types (No Problem)

These formats work directly without merge:

- **Cross (X4/XS/XF)** - single heats with direct elimination
- **Time Trial (XT)** - single run qualification
- **Single Run events** - no BR suffix in RaceId

### Option 1: Use REST API (Recommended)

```typescript
// Get pre-merged results from server
const response = await fetch('/api/xml/races/K1M_ST_BR1_6/results?merged=true');
const { results } = await response.json();
// results includes run1, run2, bestTotal, bestRank for each competitor
```

### Option 2: Merge in Client

```typescript
interface RunResult {
  time: number;
  pen: number;
  total: number;
  rank: number;
}

interface MergedResult {
  bib: string;
  name: string;
  run1?: RunResult;
  run2?: RunResult;
  bestTotal: number;
  bestRank: number;
}

function mergeResults(br1: ResultsData, br2: ResultsData): MergedResult[] {
  const merged = new Map<string, MergedResult>();

  // Process BR1
  for (const row of br1.rows) {
    merged.set(row.bib, {
      bib: row.bib,
      name: row.name,
      run1: { time: parseFloat(row.time), pen: row.pen, total: parseFloat(row.total), rank: row.rank },
      bestTotal: parseFloat(row.total),
      bestRank: row.rank
    });
  }

  // Process BR2
  for (const row of br2.rows) {
    const existing = merged.get(row.bib);
    const run2 = { time: parseFloat(row.time), pen: row.pen, total: parseFloat(row.total), rank: row.rank };

    if (existing) {
      existing.run2 = run2;
      // Update best if BR2 is better
      if (run2.total < existing.bestTotal) {
        existing.bestTotal = run2.total;
      }
    } else {
      merged.set(row.bib, {
        bib: row.bib,
        name: row.name,
        run2,
        bestTotal: run2.total,
        bestRank: 0  // Will be calculated
      });
    }
  }

  // Sort by best total and assign ranks
  const sorted = Array.from(merged.values()).sort((a, b) => a.bestTotal - b.bestTotal);
  sorted.forEach((r, i) => r.bestRank = i + 1);

  return sorted;
}
```

---

## Migration Checklist

When migrating from CLI to C123 Server format:

- [ ] Update message type checks (`msg` -> `type`)
- [ ] Update data access paths (`data[]` -> `data.competitors[]` / `data.rows[]`)
- [ ] Implement finish detection using `dtFinish` tracking
- [ ] Replace `RaceStatus` checks with `isCurrent` boolean
- [ ] Remove dependency on `HighlightBib` - detect finish locally
- [ ] Remove dependency on `comp` messages - build from OnCourse/Results
- [ ] Implement Results filtering (show only `isCurrent: true` or selected race)
- [ ] Consider using REST API for merged BR1/BR2 results
- [ ] Update timestamp handling (ISO 8601 format)

---

## Quick Reference

| What you need | CLI Format | C123 Server | How to get it |
|---------------|------------|-------------|---------------|
| Current results | `msg: "top"` | `type: "Results"` with `isCurrent: true` | Filter by `isCurrent` |
| On-course competitors | `msg: "oncourse"` | `type: "OnCourse"` | Direct mapping |
| Who just finished | `HighlightBib` | N/A | Track `dtFinish` changes |
| Finished competitor data | `msg: "comp"` | N/A | Build from OnCourse at finish |
| Race status | `RaceStatus: 3` | `isCurrent: true` | Check boolean |
| Complete race data | N/A | REST API | `/api/xml/races/:id` |
| Merged BR1/BR2 | N/A | REST API | `/api/xml/races/:id/results?merged=true` |

---

## See Also

- [C123-PROTOCOL.md](C123-PROTOCOL.md) - Complete C123 protocol documentation
- [REST-API.md](REST-API.md) - REST API for XML file data
- [INTEGRATION.md](INTEGRATION.md) - Integration guide for scoreboard clients
