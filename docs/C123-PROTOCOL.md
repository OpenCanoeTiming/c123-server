# C123 Protocol Documentation

This document describes the Canoe123 (C123) protocol used for real-time communication between the C123 timing system and the C123 Server.

---

## Overview

C123 is the primary timing system for canoe slalom races. It provides data through multiple network interfaces:

| Channel | Port | Protocol | Format | Use Case |
|---------|------|----------|--------|----------|
| **TCP** | 27333 | TCP socket | XML | Primary - reliable, complete data |
| **UDP** | 27333 | UDP broadcast | XML | Discovery, simple displays |
| **UDP** | 10600 | UDP broadcast | Base64 | Mobile app (penalty entry) |

The C123 Server connects to TCP:27333 and transforms XML messages to JSON for WebSocket clients.

---

## Message Format

### Wire Format (TCP)

Messages are pipe-delimited (`|`) XML fragments wrapped in `<Canoe123>` root element:

```xml
<Canoe123 System="Main">
  <!-- message content -->
</Canoe123>|<Canoe123 System="Main">...</Canoe123>|
```

### WebSocket Output Format

C123 Server wraps parsed data in JSON envelopes:

```json
{
  "type": "MessageType",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": { ... }
}
```

---

## Message Types

### TimeOfDay

Heartbeat message with current system time. Sent approximately every second.

**Frequency:** ~1 message/second

**XML:**
```xml
<Canoe123 System="Main">
  <TimeOfDay>19:04:20</TimeOfDay>
</Canoe123>
```

**JSON:**
```json
{
  "type": "TimeOfDay",
  "timestamp": "2025-01-02T19:04:20.000Z",
  "data": {
    "time": "19:04:20"
  }
}
```

---

### OnCourse

Competitors currently on the course. This is the most frequent message type, updating multiple times per second whenever there's movement.

**Frequency:** ~2 messages/second (more during active racing)

**XML:**
```xml
<Canoe123 System="Main">
  <OnCourse Total="2" Position="1">
    <Participant
      StartOrder="9"
      Bib="9"
      Id="30034.K1M_ST"
      Name="KOPEČEK Michal"
      Club="VS Tábor"
      Nat=""
      Race="K1m - střední trať - 2. jízda"
      RaceId="K1M_ST_BR2_6"
      Warning="" />
    <Result
      Type="C"
      Gates="0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,"
      Completed="N"
      chStart="1"
      chSplit1="1"
      chSplit2="1"
      chFinish="1"
      dtStart="16:14:00.000"
      dtSplit1=""
      dtSplit2=""
      dtFinish="" />
    <Result
      Type="T"
      Pen="54"
      Time="8115"
      Total="8169"
      TTBDiff="+12.79"
      TTBName="J. KREJČÍ"
      Rank="8" />
  </OnCourse>
</Canoe123>
```

**JSON:**
```json
{
  "type": "OnCourse",
  "timestamp": "2025-01-02T16:14:08.115Z",
  "data": {
    "total": 2,
    "competitors": [
      {
        "bib": "9",
        "name": "KOPEČEK Michal",
        "club": "VS Tábor",
        "nat": "",
        "raceId": "K1M_ST_BR2_6",
        "raceName": "K1m - střední trať - 2. jízda",
        "startOrder": 9,
        "warning": "",
        "gates": "0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,",
        "completed": false,
        "dtStart": "16:14:00.000",
        "dtFinish": null,
        "pen": 54,
        "time": "8115",
        "total": "8169",
        "ttbDiff": "+12.79",
        "ttbName": "J. KREJČÍ",
        "rank": 8,
        "position": 1
      }
    ]
  }
}
```

#### OnCourse Attributes

**Container:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `Total` | number | Total competitors currently on course |
| `Position` | number | Position of this competitor (1 = closest to finish) |

**Participant:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `Bib` | string | Start number |
| `Name` | string | Full name |
| `Club` | string | Club name |
| `Nat` | string | Nationality code |
| `RaceId` | string | Race identifier (e.g., `K1M_ST_BR2_6`) |
| `Race` | string | Race name |
| `StartOrder` | number | Order of start |
| `Warning` | string | Warning flag (yellow card, etc.) |

**Result Type="C" (Course/Checkpoint):**
| Attribute | Type | Description |
|-----------|------|-------------|
| `Gates` | string | Penalties per gate: `0`=clean, `2`=touch, `50`=miss, empty=not passed |
| `Completed` | Y/N | Whether run is completed |
| `dtStart` | timestamp | Start time (e.g., `"16:14:00.000"`) |
| `dtFinish` | timestamp | Finish time (empty string until finish) |

**Result Type="T" (Time/Total):**
| Attribute | Type | Description |
|-----------|------|-------------|
| `Pen` | number | Total penalty in seconds |
| `Time` | string | Running time in centiseconds as string (e.g., `"8115"` = 81.15s) |
| `Total` | string | Total time (time + penalties) in centiseconds as string (e.g., `"8169"` = 81.69s) |
| `TTBDiff` | string | Difference to leader (e.g., `"+12.79"`) |
| `TTBName` | string | Leader's name |
| `Rank` | number | Current rank |

---

### Results

Result table for a race. C123 rotates through different categories, sending results for each.

**Frequency:** Irregular, ~every 20-40 seconds per category

**Key Behavior:** The `Current` attribute indicates whether this is the currently active race:
- `Current="Y"` - This race is currently running
- `Current="N"` - Historical results (previous category)

**XML:**
```xml
<Canoe123 System="Main">
  <Results
    RaceId="K1M_ST_BR2_6"
    ClassId="K1M_ST"
    Current="Y"
    MainTitle="K1m - střední trať"
    SubTitle="1st and 2nd Run">
    <Row Number="1">
      <Participant
        Bib="1"
        Id="12054.K1M_ST"
        Name="KREJČÍ Jakub"
        Club="TJ DUKLA Praha"
        Nat=""
        GivenName="Jakub"
        FamilyName="KREJČÍ"
        StartOrder="1"
        StartTime="10:06:45" />
      <Result
        Type="T"
        HeatNr="0"
        Q=""
        IRM=""
        Pen="2"
        Gates="0 0 0 0 0 0 0 0 0 0 0 0 2 0 2 0 2 0 0 0 0 0 0 0"
        Time="79.99"
        Total="78.99"
        Rank="1"
        RankOrder="1"
        Behind=""
        PP="" />
    </Row>
  </Results>
</Canoe123>
```

**JSON:**
```json
{
  "type": "Results",
  "timestamp": "2025-01-02T10:30:46.456Z",
  "data": {
    "raceId": "K1M_ST_BR2_6",
    "classId": "K1M_ST",
    "isCurrent": true,
    "mainTitle": "K1m - střední trať",
    "subTitle": "1st and 2nd Run",
    "rows": [
      {
        "rank": 1,
        "bib": "1",
        "name": "KREJČÍ Jakub",
        "givenName": "Jakub",
        "familyName": "KREJČÍ",
        "club": "TJ DUKLA Praha",
        "nat": "",
        "startOrder": 1,
        "startTime": "10:06:45",
        "gates": "0 0 0 0 0 0 0 0 0 0 0 0 2 0 2 0 2 0 0 0 0 0 0 0",
        "pen": 2,
        "time": "79.99",
        "total": "78.99",
        "behind": ""
      }
    ]
  }
}
```

#### Result Row Fields

| Field | Type | Description |
|-------|------|-------------|
| `rank` | number | Position in results |
| `bib` | string | Start number |
| `name` | string | Full name |
| `givenName` | string | Given/first name |
| `familyName` | string | Family/last name |
| `club` | string | Club name |
| `nat` | string | Nationality code |
| `startOrder` | number | Order of start |
| `startTime` | string | Start time (e.g., `"10:06:45"`) |
| `gates` | string | Gate penalties, space-separated (e.g., `"0 0 2 0 50"`) |
| `pen` | number | Total penalty seconds |
| `time` | string | Run time formatted (e.g., `"79.99"`) |
| `total` | string | Total time formatted (e.g., `"81.99"`) |
| `behind` | string | Time behind leader (e.g., `"+1.51"`) |
| `status` | string | Optional: `"DNS"`, `"DNF"`, or `"DSQ"` for invalid results |

**BR1/BR2 fields** (only in second run results):
| Field | Type | Description |
|-------|------|-------------|
| `prevTime` | number | Previous run time in centiseconds |
| `prevPen` | number | Previous run penalty seconds |
| `prevTotal` | number | Previous run total in centiseconds |
| `prevRank` | number | Previous run rank |
| `totalTotal` | number | Best of both runs in centiseconds |
| `totalRank` | number | Overall rank (best run) |
| `betterRun` | number | Which run was better: `1` or `2` |

#### Results Rotation

C123 periodically sends results for all categories. Example timing from recording:

```
ts=26971  RaceId=K1W_ST_BR1_7  Current=N  (historical)
ts=57129  RaceId=C1M_ST_BR2_7  Current=N  (historical)
ts=62985  RaceId=K1M_ST_BR2_6  Current=Y  (active race!)
ts=87253  RaceId=K1W_ST_BR2_7  Current=N  (historical)
```

**Client recommendation:** Filter results by `isCurrent: true` to show only the active race, or cache all results to show historical data.

---

### RaceConfig

Configuration of the current course - number of gates and their types.

**Frequency:** ~every 20 seconds

**XML:**
```xml
<Canoe123 System="Main">
  <RaceConfig
    NrSplits="0"
    NrGates="24"
    GateConfig="NNRNNRNRNNNRNNRNRNNRNNRN"
    GateCaptions="1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24" />
</Canoe123>
```

**JSON:**
```json
{
  "type": "RaceConfig",
  "timestamp": "2025-01-02T10:30:00.000Z",
  "data": {
    "nrSplits": 0,
    "nrGates": 24,
    "gateConfig": "NNRNNRNRNNNRNNRNRNNRNNRN",
    "gateCaptions": "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24"
  }
}
```

**Gate Config:**
- `N` = Normal (downstream gate)
- `R` = Reverse (upstream gate)

---

### Schedule

List of all races in the competition.

**Frequency:** ~every 40 seconds

**XML:**
```xml
<Canoe123 System="Main">
  <Schedule>
    <Race
      Order="101"
      RaceId="K1M_ST_BR1_6"
      Race="K1m - střední trať - 1. jízda"
      MainTitle="K1m - střední trať"
      SubTitle="1st Run"
      ShortTitle="K1m - střední trať - 1. jízda"
      RaceStatus="5">
      <StartTime />
    </Race>
  </Schedule>
</Canoe123>
```

**JSON:**
```json
{
  "type": "Schedule",
  "timestamp": "2025-01-02T10:30:00.000Z",
  "data": {
    "races": [
      {
        "order": 101,
        "raceId": "K1M_ST_BR1_6",
        "race": "K1m - střední trať - 1. jízda",
        "mainTitle": "K1m - střední trať",
        "subTitle": "1st Run",
        "shortTitle": "K1m - střední trať - 1. jízda",
        "raceStatus": 5,
        "startTime": ""
      }
    ]
  }
}
```

**Race Status:**
| Status | Meaning |
|--------|---------|
| 3 | Running |
| 4 | Unknown |
| 5 | Finished |

---

## RaceId Format

Race IDs follow the pattern: `{CLASS}_{COURSE}_{RUN}_{VERSION}`

Examples:
- `K1M_ST_BR1_6` - K1 Men, Short Track, Best Run 1, version 6
- `K1W_ST_BR2_7` - K1 Women, Short Track, Best Run 2, version 7
- `C1M_ST_BR2_7` - C1 Men, Short Track, Best Run 2, version 7

**Components:**
| Part | Meaning | Examples |
|------|---------|----------|
| Class | Boat class + gender | `K1M`, `K1W`, `C1M`, `C1W` |
| Course | Track type | `ST` (Short Track) |
| Run | Which run | `BR1` (1st run), `BR2` (2nd run) |
| Version | Internal version | Increments with changes |

---

## Finish Detection

There is no explicit "finish" event in the C123 protocol. Finish is detected by watching for changes in the `dtFinish` field.

### Detection Logic

```typescript
function detectFinish(prev: OnCourseCompetitor[], curr: OnCourseCompetitor[]) {
  for (const competitor of curr) {
    const previous = prev.find(p => p.bib === competitor.bib);
    if (previous && !previous.dtFinish && competitor.dtFinish) {
      // This competitor just finished!
      return competitor;
    }
  }
  return null;
}
```

### Finish Timeline

When a competitor finishes:

```
t=0ms     dtFinish changes from "" to "10:35:11.325"
          Time changes from "53" (running) to "51.20" (final with decimals)

t+4000ms  Competitor disappears from OnCourse
          (moves to Results)
```

### Signals

| Signal | Location | How to Detect | Reliability |
|--------|----------|---------------|-------------|
| `dtFinish` | OnCourse | Empty → timestamp | **High** |
| `time` format | OnCourse | Integer → decimal | Medium |
| Disappears | OnCourse | Not in list | After ~4 seconds |

---

## Two-Run (BR1/BR2) Handling

Canoe slalom typically has two runs (Best Run format). The second run (BR2) results in the TCP stream have specific limitations that clients must handle.

### Critical: TCP Stream Data Limitations

**IMPORTANT:** The TCP stream `Results` message for BR2 has non-obvious field meanings:

| Field | What You Might Expect | What It Actually Contains |
|-------|----------------------|---------------------------|
| `Time` | BR2 time | BR2 time ✓ |
| `Pen` | BR2 penalty | **Penalty of BETTER run** (could be BR1!) |
| `Total` | BR2 total | **Best of both runs** (not BR2 total!) |

This means when BR1 was better than BR2:
- `Pen` contains BR1 penalty, not BR2 penalty
- `Total` shows BR1 total, making it impossible to calculate BR2 total from stream data alone

### Example: BR2 Results in TCP Stream

```xml
<!-- Bib 1: BR1 was better (78.99) than BR2 (81.99) -->
<Result Type="T" Time="79.99" Pen="2" Total="78.99" Rank="1"/>
<!--           ↑ BR2 time    ↑ BR1 pen!  ↑ BR1 total (best)! -->
```

**Verified on live data (2026-01-05):**

| Bib | Time (BR2) | Pen in Results | BR2 calculated | Total in Results | Conclusion |
|-----|------------|----------------|----------------|------------------|------------|
| 1   | 79.99      | 2              | 81.99          | **78.99**        | BR1 was better (pen is from BR1) |
| 5   | 87.30      | 2              | 89.30          | **84.33**        | BR1 was better (pen is from BR1) |
| 9   | 51.20      | 6              | 57.20          | 57.20            | BR2 was better (pen is from BR2) |

### Data Availability Summary

| Scenario | BR2 Time | BR2 Penalty | BR1 Data |
|----------|----------|-------------|----------|
| BR1 was better | ✓ Available | ❌ **NOT in Results.pen** | Can infer total from `Total` |
| BR2 was better | ✓ Available | ✓ In `Pen` | ❌ **NOT AVAILABLE** |

### Where to Get Complete BR1/BR2 Data

1. **OnCourse message** (during BR2):
   - Contains correct BR2 `pen` for competitors currently on course
   - Updates in real-time as gates are passed

2. **XML File (REST API)** - **Recommended:**
   - `GET /api/xml/races/:raceId/results?merged=true`
   - Contains complete data for both runs: `run1`, `run2`, `bestTotal`, `bestRank`
   - Updated with ~1-2 second delay after finish

3. **BR2 Results in XML:**
```xml
<Results>
  <RaceId>K1M_ST_BR2_6</RaceId>
  <Time>79990</Time>           <!-- BR2 time (centiseconds) -->
  <Pen>6</Pen>                 <!-- BR2 penalty -->
  <Total>85990</Total>         <!-- BR2 total -->

  <PrevTime>76990</PrevTime>   <!-- BR1 time -->
  <PrevPen>2</PrevPen>         <!-- BR1 penalty -->
  <PrevTotal>78990</PrevTotal> <!-- BR1 total -->

  <TotalTotal>78990</TotalTotal>   <!-- Best of both -->
  <BetterRunNr>1</BetterRunNr>     <!-- 1=BR1 better, 2=BR2 better -->
</Results>
```

### Recommended Client Strategy

See [INTEGRATION.md](INTEGRATION.md#br1br2-merge-strategy) for complete implementation guidance.

**Quick summary:**
1. Use **OnCourse** `pen` as primary source during BR2 (real-time, accurate)
2. Fetch **REST API** merged results for complete data (authoritative, slight delay)
3. Never trust `Results.pen` for BR2 display - it may contain BR1 penalty

---

## Server-Generated Messages

The C123 Server adds these messages (not from C123 directly):

### Connected

Sent immediately when a WebSocket client connects:

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

### Error

Sent when errors occur:

```json
{
  "type": "Error",
  "timestamp": "2025-01-02T10:30:00.000Z",
  "data": {
    "code": "CONNECTION_LOST",
    "message": "Lost connection to C123"
  }
}
```

### XmlChange

Sent when the XML file changes (on the main `/ws` endpoint):

```json
{
  "type": "XmlChange",
  "timestamp": "2025-01-02T10:31:00.000Z",
  "data": {
    "sections": ["Results", "Participants"],
    "checksum": "abc123def456..."
  }
}
```

**Fields:**
- `sections`: Array of changed sections. Possible values: `"Participants"`, `"Schedule"`, `"Results"`, `"Classes"`
- `checksum`: MD5 hash of the entire XML file content

### LogEntry

Sent to admin clients for real-time log viewing (only on admin WebSocket connections):

```json
{
  "type": "LogEntry",
  "timestamp": "2025-01-02T10:31:15.000Z",
  "data": {
    "level": "info",
    "component": "TcpSource",
    "message": "Connected to C123 at 192.168.1.100:27333",
    "data": { "host": "192.168.1.100", "port": 27333 }
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `level` | string | Log level: `"debug"`, `"info"`, `"warn"`, `"error"` |
| `component` | string | Source component/module name |
| `message` | string | Human-readable log message |
| `data` | object | Optional additional structured data |

**Note:** This message type is primarily for the admin dashboard and not typically used by scoreboard clients.

### ForceRefresh

Sent by admin to force all clients to reload/refresh their data and UI:

```json
{
  "type": "ForceRefresh",
  "timestamp": "2025-01-02T10:32:00.000Z",
  "data": {
    "reason": "Admin triggered refresh"
  }
}
```

**Fields:**
- `reason` (optional): Human-readable reason for the refresh

**Client behavior:** When receiving this message, clients should:
1. Reload any cached data from the REST API
2. Re-render the UI
3. Optionally show a notification to the user

This is typically triggered manually by the admin when they want to force all scoreboards to update immediately (e.g., after fixing a configuration issue or uploading new data).

### ConfigPush

Sent by server to push configuration to a client (scoreboard). This is sent:
1. Immediately when client connects (if config exists for that IP)
2. When admin updates client configuration via REST API

```json
{
  "type": "ConfigPush",
  "timestamp": "2025-01-05T10:30:00.000Z",
  "data": {
    "type": "ledwall",
    "displayRows": 8,
    "customTitle": "Finish Line Display",
    "label": "TV in Hall A",
    "clientId": "finish-display",
    "assets": {
      "logoUrl": "data:image/png;base64,iVBORw0KGgo...",
      "footerImageUrl": "https://example.com/banner.jpg"
    }
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Layout mode: `'vertical'` or `'ledwall'` |
| `displayRows` | number | Number of display rows (3-20) |
| `customTitle` | string | Custom title override |
| `raceFilter` | string[] | Only show these race IDs |
| `showOnCourse` | boolean | Show OnCourse data |
| `showResults` | boolean | Show Results data |
| `custom` | object | Custom parameters (key-value) |
| `label` | string | Admin-assigned label for this client |
| `clientId` | string | Server-assigned client ID (client should adopt it) |
| `assets` | object | Asset images (see below) |

**Assets object:**
| Field | Type | Description |
|-------|------|-------------|
| `logoUrl` | string | Main event logo (URL or data URI) |
| `partnerLogoUrl` | string | Partner/sponsor logo (URL or data URI) |
| `footerImageUrl` | string | Footer banner image (URL or data URI) |

Assets are merged from global defaults and per-client overrides. Only set assets are included.

**Note:** Only explicitly set parameters are included. Undefined values are omitted, allowing clients to use their own defaults.

**Client behavior:** When receiving this message, clients should:
1. Merge pushed values with current configuration
2. Apply layout/display changes immediately
3. If `clientId` is set, store it and use for future connections
4. Optionally report current state back via `ClientState`

### ClientState

Sent by client to report its current state to the server (optional):

```json
{
  "type": "ClientState",
  "timestamp": "2025-01-05T10:30:01.000Z",
  "data": {
    "current": {
      "type": "ledwall",
      "displayRows": 8,
      "customTitle": "Finish Line Display"
    },
    "version": "3.0.0",
    "capabilities": ["configPush", "forceRefresh"]
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current` | object | Yes | Current configuration values in use |
| `version` | string | No | Client version |
| `capabilities` | string[] | No | Supported features |

**Server behavior:** The server stores this state and displays it in the admin dashboard, allowing administrators to see what values each client is actually using.

See [CLIENT-CONFIG.md](CLIENT-CONFIG.md) for complete documentation on client configuration.

---

## Connection Details

### TCP Connection

- **Host:** C123 server IP (typically on local network)
- **Port:** 27333
- **Encoding:** UTF-8
- **No handshake required** - C123 immediately starts sending data
- **Reconnect:** Automatic with exponential backoff

### UDP Broadcast

- **Address:** 255.255.255.255:27333
- **Content:** Same XML format as TCP
- **Limited:** Only `OnCourse` and `TimeOfDay` messages
- **Use case:** Discovery, simple displays

---

## Timing Characteristics

From analysis of production recordings:

| Metric | Value |
|--------|-------|
| TimeOfDay frequency | ~1/second |
| OnCourse frequency | ~2/second (more during activity) |
| Results rotation | ~20-40 seconds per category |
| RaceConfig frequency | ~20 seconds |
| Schedule frequency | ~40 seconds |
| Finish detection latency | < 10ms |

---

## See Also

- [REST-API.md](REST-API.md) - REST API for XML file data
- [INTEGRATION.md](INTEGRATION.md) - Integration guide for scoreboard clients
