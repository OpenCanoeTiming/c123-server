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
        "time": "81.15",
        "total": "81.69",
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
| `Time` | number | Running time in centiseconds |
| `Total` | number | Total time (time + penalties) in centiseconds |
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

Canoe slalom typically has two runs. The second run (BR2) results present some data limitations.

### Data Availability in BR2

| Scenario | 2nd Run Data | 1st Run Data |
|----------|--------------|--------------|
| 1st run better | `Time` + `Gates` | Can calculate from `Total` |
| 2nd run better | `Time` + `Gates` = `Total` | **NOT AVAILABLE** |

### BR2 Result Fields

When viewing BR2 results, additional fields are present:

```json
{
  "prevTime": 8156,        // 1st run time (centiseconds)
  "prevPen": 4,            // 1st run penalty
  "prevTotal": 8196,       // 1st run total
  "prevRank": 3,           // 1st run rank
  "totalTotal": 8156,      // Best of both runs
  "totalRank": 2,          // Overall rank
  "betterRun": 1           // Which run was better (1 or 2)
}
```

### Recommendation

For complete BR1/BR2 data:
1. Cache BR1 Results when they arrive
2. Merge with BR2 Results for complete view
3. Or use the XML file API which has complete data

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
    "sections": ["Results", "StartList"],
    "checksum": "abc123..."
  }
}
```

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
