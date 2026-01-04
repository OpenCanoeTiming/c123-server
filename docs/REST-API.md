# C123 Server REST API Documentation

This document describes the REST API provided by the C123 Server for accessing race data, monitoring server status, and managing connections.

---

## Overview

The C123 Server provides the following APIs:

| Category | Base URL | Description |
|----------|----------|-------------|
| **Discovery API** | `/api/discover` | Server identification for auto-discovery |
| **Server API** | `/api` | Server status, sources, scoreboards |
| **XML Data API** | `/api/xml` | Race data from XML file (schedule, results, participants) |

**Base URL:** `http://<server>:27123`

---

## Discovery API

### GET /api/discover

Simple endpoint for automatic server discovery. Returns minimal server identification with CORS enabled for cross-origin requests.

**Response:**

```json
{
  "service": "c123-server",
  "version": "2.0.0",
  "port": 27123,
  "eventName": "Czech Cup 2025"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `service` | string | Always `"c123-server"` - used to identify the service |
| `version` | string | Server version |
| `port` | number | Port the server is running on |
| `eventName` | string | Current event name from XML (if available) |

**CORS Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

**Usage:** Scoreboards can probe IP addresses in the local subnet with a short timeout (200ms) to find available C123 servers. See [INTEGRATION.md](INTEGRATION.md#server-discovery) for full discovery implementation.

---

## Server Status API

### GET /api/status

Get overall server status including uptime, connected scoreboards, and current event information.

**Response:**

```json
{
  "version": "0.1.0",
  "uptime": 3600,
  "sources": [
    {
      "name": "C123 TCP",
      "type": "tcp",
      "status": "connected",
      "host": "192.168.1.100",
      "port": 27333
    }
  ],
  "scoreboards": {
    "connected": 2,
    "list": [
      {
        "id": "abc12345-...",
        "connectedAt": "2025-01-02T10:00:00.000Z",
        "lastActivity": "2025-01-02T10:30:00.000Z",
        "config": {
          "showOnCourse": true,
          "showResults": true
        }
      }
    ]
  },
  "event": {
    "currentRaceId": "K1M_ST_BR2_6",
    "raceName": "K1m - short track",
    "onCourseCount": 2,
    "resultsCount": 24
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Server version |
| `uptime` | number | Uptime in seconds |
| `sources` | array | Data source status |
| `sources[].status` | string | `connected`, `connecting`, `disconnected` |
| `scoreboards.connected` | number | Number of connected scoreboards |
| `event.currentRaceId` | string | Currently active race ID |
| `event.onCourseCount` | number | Competitors currently on course |

---

### GET /api/sources

Get status of all data sources.

**Response:**

```json
{
  "sources": [
    {
      "name": "C123 TCP",
      "type": "tcp",
      "status": "connected",
      "host": "192.168.1.100",
      "port": 27333
    },
    {
      "name": "XML File",
      "type": "xml",
      "status": "connected",
      "path": "C:\\Canoe123\\event.xml"
    }
  ]
}
```

---

### GET /api/scoreboards

Get list of connected scoreboards.

**Response:**

```json
{
  "connected": 2,
  "scoreboards": [
    {
      "id": "abc12345-6789-...",
      "connectedAt": "2025-01-02T10:00:00.000Z",
      "lastActivity": "2025-01-02T10:30:00.000Z",
      "config": {
        "showOnCourse": true,
        "showResults": true,
        "raceFilter": ["K1M_ST"]
      }
    }
  ]
}
```

---

### POST /api/scoreboards/:id/config

Update configuration for a specific scoreboard.

**Request:**

```json
{
  "showOnCourse": true,
  "showResults": false,
  "raceFilter": ["K1M_ST", "K1W_ST"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `showOnCourse` | boolean | Enable/disable OnCourse messages |
| `showResults` | boolean | Enable/disable Results messages |
| `raceFilter` | string[] | Only send data for these class IDs |

**Response:**

```json
{
  "success": true,
  "config": {
    "showOnCourse": true,
    "showResults": false,
    "raceFilter": ["K1M_ST", "K1W_ST"]
  }
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 404 | `{ "error": "Scoreboard not found" }` |
| 400 | `{ "error": "raceFilter must be an array" }` |

---

### GET /health

Simple health check endpoint.

**Response:**

```json
{
  "status": "ok"
}
```

---

## XML Data API

These endpoints provide access to race data from the C123 XML file. Data is cached and automatically refreshed when the file changes.

### GET /api/xml/status

Get XML data availability and statistics.

**Response (available):**

```json
{
  "available": true,
  "path": "C:\\Canoe123\\event.xml",
  "lastModified": "2025-01-02T10:30:00.000Z",
  "checksum": "12345-67-89",
  "participantCount": 48,
  "scheduleCount": 8
}
```

**Response (not available):**

```json
{
  "available": false,
  "path": null,
  "lastModified": null,
  "checksum": null,
  "participantCount": 0,
  "scheduleCount": 0
}
```

---

### GET /api/xml/schedule

Get race schedule (list of all races with times).

**Response:**

```json
{
  "schedule": [
    {
      "raceId": "K1M_ST_BR1_6",
      "raceOrder": 101,
      "startTime": "10:00:00",
      "classId": "K1M_ST",
      "disId": "BR1",
      "firstBib": "1",
      "startInterval": "60",
      "raceStatus": 5,
      "customTitle": "K1m - short track - 1st run"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `raceId` | string | Unique race identifier |
| `classId` | string | Class identifier (e.g., `K1M_ST`) |
| `disId` | string | Run identifier (`BR1` or `BR2`) |
| `raceStatus` | number | 3=Running, 5=Finished |
| `startTime` | string | Scheduled start time (HH:MM:SS) |
| `startInterval` | string | Interval between starts in seconds |

---

### GET /api/xml/participants

Get all participants (competitors) in the event.

**Response:**

```json
{
  "participants": [
    {
      "id": "12054.K1M_ST",
      "classId": "K1M_ST",
      "bib": "1",
      "icfId": "CZE12345",
      "familyName": "KREJCI",
      "givenName": "Jakub",
      "club": "TJ DUKLA Praha",
      "ranking": "12.50",
      "year": "1995",
      "catId": "SEN",
      "isTeam": false
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique participant ID |
| `classId` | string | Class the participant is registered in |
| `bib` | string | Start number |
| `familyName` | string | Last name |
| `givenName` | string | First name |
| `familyName2` | string | Second paddler last name (for C2) |
| `givenName2` | string | Second paddler first name (for C2) |
| `club` | string | Club name |
| `isTeam` | boolean | True for C2/team entries |

---

### GET /api/xml/races

Get list of all races with status information.

**Response:**

```json
{
  "races": [
    {
      "raceId": "K1M_ST_BR1_6",
      "classId": "K1M_ST",
      "disId": "BR1",
      "name": "K1m - short track - 1st run",
      "startTime": "10:00:00",
      "raceOrder": 101,
      "raceStatus": 5,
      "participantCount": 24,
      "hasResults": true
    }
  ]
}
```

---

### GET /api/xml/races/:id

Get detailed information about a specific race.

**Parameters:**

| Name | Description |
|------|-------------|
| `id` | Race ID (e.g., `K1M_ST_BR1_6`) |

**Response:**

```json
{
  "race": {
    "raceId": "K1M_ST_BR1_6",
    "classId": "K1M_ST",
    "disId": "BR1",
    "name": "K1m - short track - 1st run",
    "startTime": "10:00:00",
    "raceOrder": 101,
    "raceStatus": 5,
    "participantCount": 24,
    "hasResults": true,
    "startlistCount": 24,
    "resultsCount": 24,
    "relatedRaces": ["K1M_ST_BR2_6"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `relatedRaces` | string[] | Other runs of the same class (BR1 <-> BR2) |
| `startlistCount` | number | Number of entries in startlist |
| `resultsCount` | number | Number of results available |

**Errors:**

| Status | Response |
|--------|----------|
| 404 | `{ "error": "Race not found" }` |

---

### GET /api/xml/races/:id/startlist

Get startlist for a specific race.

**Response:**

```json
{
  "startlist": [
    {
      "startOrder": 1,
      "bib": "1",
      "participantId": "12054.K1M_ST",
      "startTime": "10:00:00",
      "familyName": "KREJCI",
      "givenName": "Jakub",
      "club": "TJ DUKLA Praha"
    }
  ]
}
```

---

### GET /api/xml/races/:id/results

Get results for a specific race.

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `merged` | boolean | `false` | If `true`, return merged BR1+BR2 results for the class |

**Response (merged=false):**

```json
{
  "results": [
    {
      "raceId": "K1M_ST_BR1_6",
      "id": "12054.K1M_ST",
      "startOrder": 1,
      "bib": "1",
      "startTime": "10:00:00",
      "status": "",
      "time": 7899,
      "pen": 2,
      "total": 7899,
      "rank": 1,
      "participant": {
        "id": "12054.K1M_ST",
        "classId": "K1M_ST",
        "bib": "1",
        "familyName": "KREJCI",
        "givenName": "Jakub",
        "club": "TJ DUKLA Praha",
        "isTeam": false
      }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Run time in centiseconds (7899 = 78.99s) |
| `pen` | number | Penalty in seconds |
| `total` | number | Total time in centiseconds |
| `rank` | number | Position in results |
| `status` | string | Empty for valid, `DSQ`, `DNS`, `DNF` for invalid |

**Response (merged=true):**

```json
{
  "results": [
    {
      "bib": "1",
      "participantId": "12054.K1M_ST",
      "familyName": "KREJCI",
      "givenName": "Jakub",
      "club": "TJ DUKLA Praha",
      "run1": {
        "time": 7899,
        "pen": 2,
        "total": 7899,
        "rank": 1
      },
      "run2": {
        "time": 7756,
        "pen": 0,
        "total": 7756,
        "rank": 2
      },
      "bestTotal": 7756,
      "bestRank": 1
    }
  ],
  "merged": true,
  "classId": "K1M_ST"
}
```

---

### GET /api/xml/races/:id/results/:run

Get results for a specific run (BR1 or BR2) of a race.

**Parameters:**

| Name | Description |
|------|-------------|
| `id` | Race ID (e.g., `K1M_ST_BR1_6`) |
| `run` | Run identifier: `BR1` or `BR2` (case-insensitive) |

**Response:**

```json
{
  "results": [...],
  "run": "BR2",
  "raceId": "K1M_ST_BR2_6"
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "Invalid run parameter. Use BR1 or BR2." }` |
| 404 | `{ "error": "No BR2 race found for this class" }` |

---

## Broadcast API

### POST /api/broadcast/refresh

Force all connected WebSocket clients to refresh their data. Sends a `ForceRefresh` message to all connected scoreboards.

**Request:**

```json
{
  "reason": "Admin triggered refresh"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Optional reason for the refresh (sent to clients) |

**Response:**

```json
{
  "success": true,
  "clientsNotified": 3,
  "reason": "Admin triggered refresh"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` if request was processed |
| `clientsNotified` | number | Number of clients that received the message |
| `reason` | string | The reason sent to clients (or `null` if none) |

**WebSocket Message Sent:**

```json
{
  "type": "ForceRefresh",
  "timestamp": "2025-01-02T10:32:00.000Z",
  "data": {
    "reason": "Admin triggered refresh"
  }
}
```

**Use cases:**
- After fixing a configuration issue that affected all scoreboards
- After manually updating or replacing the XML file
- When scoreboards appear to be showing stale data

---

## WebSocket Change Notifications

For real-time updates when the XML file changes, connect to the main WebSocket endpoint.

**Endpoint:** `ws://<server>:27123/ws`

The same WebSocket connection used for real-time C123 data also delivers XML change notifications.

**Message format:**

```json
{
  "type": "XmlChange",
  "timestamp": "2025-01-02T10:31:00.000Z",
  "data": {
    "sections": ["Results", "StartList"],
    "checksum": "12345-67-89"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sections` | string[] | Which sections changed: `Participants`, `Schedule`, `Results` |
| `checksum` | string | New file checksum |

**Client workflow:**

1. Connect to WebSocket (`/ws`)
2. Handle both real-time C123 messages and `XmlChange` notifications
3. When `XmlChange` received, fetch updated data via REST API (e.g., `/api/xml/races/:id/results`)

---

## Error Handling

All endpoints return consistent error responses:

**Service unavailable (503):**

```json
{
  "error": "XML data service not available"
}
```

**Not found (404):**

```json
{
  "error": "Race not found"
}
```

**Bad request (400):**

```json
{
  "error": "Invalid run parameter. Use BR1 or BR2."
}
```

**Internal error (500):**

```json
{
  "error": "Error message describing the issue"
}
```

---

## Time Format

Times in results are stored as **centiseconds** (1/100th of a second):

| Value | Meaning |
|-------|---------|
| `7899` | 78.99 seconds |
| `8156` | 81.56 seconds |

To convert to display format:

```javascript
function formatTime(centiseconds) {
  const seconds = centiseconds / 100;
  return seconds.toFixed(2);
}
```

---

## See Also

- [C123-PROTOCOL.md](C123-PROTOCOL.md) - Real-time WebSocket protocol
- [INTEGRATION.md](INTEGRATION.md) - Integration guide for clients
