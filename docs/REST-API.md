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
| **Configuration API** | `/api/config` | Server configuration (XML source, event name) |
| **Event API** | `/api/event` | Event name management |
| **Broadcast API** | `/api/broadcast` | Broadcast messages to all clients |
| **Client Management API** | `/api/clients` | Manage scoreboard client configurations |
| **Custom Parameters API** | `/api/config/custom-params` | Define custom client parameters |
| **Assets API** | `/api/config/assets` | Default asset images (logos, banners) |
| **Logs API** | `/api/logs` | Log entries retrieval |
| **C123 Write API** | `/api/c123` | Send commands to C123 (scoring, timing) |

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

**Important Notes for Merged Results:**

1. **Empty objects for missing runs:** If a competitor hasn't completed a run yet, the field will be an empty object `{}`, not `undefined`:
   ```json
   {
     "bib": "5",
     "run1": { "time": 8156, "pen": 4, "total": 8196, "rank": 3 },
     "run2": {},  // Not undefined!
     "bestTotal": 8196,
     "bestRank": 3
   }
   ```
   Check for empty objects: `Object.keys(row.run2).length === 0`

2. **Why use merged results?** The WebSocket `Results` message for BR2 contains misleading data - `pen` may be from BR1 (the better run), and `total` is always the best of both runs. The merged REST API provides accurate, complete data for both runs.

3. **Timing:** XML file updates ~1-2 seconds after finish. For real-time BR2 penalty, use the `pen` field from `OnCourse` message.

See [INTEGRATION.md](INTEGRATION.md#br1br2-merge-strategy) for complete client implementation guidance.

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

## Configuration API

Endpoints for managing server configuration, primarily XML source settings.

### GET /api/config

Get complete server configuration including XML settings and custom parameters.

**Response:**

```json
{
  "settings": {
    "xmlAutoDetect": true,
    "xmlSourceMode": "auto-offline",
    "xmlManualPath": null,
    "eventNameOverride": null,
    "clientConfigs": {},
    "customParamDefinitions": []
  },
  "xml": {
    "path": "C:\\Canoe123\\xboard_offline.xml",
    "source": "autodetect",
    "autoDetectEnabled": true,
    "mode": "auto-offline"
  },
  "isWindows": true,
  "settingsPath": "C:\\Users\\User\\AppData\\Roaming\\c123-server\\settings.json"
}
```

---

### GET /api/config/xml

Get XML source configuration.

**Response:**

```json
{
  "path": "C:\\Canoe123\\xboard_offline.xml",
  "source": "autodetect",
  "autoDetectEnabled": true,
  "mode": "auto-offline",
  "availablePaths": {
    "main": {
      "path": "C:\\Canoe123\\xboard.xml",
      "exists": true
    },
    "offline": {
      "path": "C:\\Canoe123\\xboard_offline.xml",
      "exists": true
    }
  },
  "isWindows": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Currently active XML path |
| `source` | string | `"autodetect"`, `"manual"`, or `null` |
| `autoDetectEnabled` | boolean | Whether autodetection is enabled |
| `mode` | string | Current mode: `"auto-main"`, `"auto-offline"`, or `"manual"` |
| `availablePaths` | object | Windows-detected paths (main and offline) |
| `isWindows` | boolean | Whether server runs on Windows |

---

### POST /api/config/xml

Set XML source configuration. Supports setting manual path or changing mode.

**Request options:**

1. Set manual path (switches to manual mode):
```json
{
  "path": "C:\\MyRace\\data.xml"
}
```

2. Switch to auto mode (Windows only):
```json
{
  "mode": "auto-main"
}
```

3. Switch to manual mode with path:
```json
{
  "mode": "manual",
  "path": "C:\\MyRace\\data.xml"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | XML file path (required for manual mode) |
| `mode` | string | `"auto-main"`, `"auto-offline"`, or `"manual"` |

**Response:**

```json
{
  "success": true,
  "path": "C:\\MyRace\\data.xml",
  "source": "manual",
  "autoDetectEnabled": false,
  "mode": "manual",
  "availablePaths": {
    "main": { "path": "...", "exists": true },
    "offline": { "path": "...", "exists": true }
  }
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "path is required for manual mode" }` |
| 400 | `{ "error": "Auto modes are only available on Windows" }` |

---

### POST /api/config/xml/autodetect

Toggle XML autodetection (legacy endpoint, prefer POST /api/config/xml with mode).

**Request:**

```json
{
  "enabled": true
}
```

**Response:**

```json
{
  "success": true,
  "autoDetectEnabled": true,
  "mode": "auto-offline",
  "path": "C:\\Canoe123\\xboard_offline.xml",
  "source": "autodetect"
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "enabled must be a boolean" }` |
| 400 | `{ "error": "Autodetection is only available on Windows" }` |

---

### GET /api/config/xml/detect

Manually trigger Windows XML path detection (for testing/debugging).

**Response (Windows):**

```json
{
  "detected": {
    "mainXmlPath": "C:\\Canoe123\\xboard.xml",
    "offlineXmlPath": "C:\\Canoe123\\xboard_offline.xml"
  },
  "isWindows": true
}
```

**Response (Non-Windows):**

```json
{
  "error": "Autodetection is only available on Windows",
  "isWindows": false
}
```

---

## Event API

Manage event name displayed to clients.

### GET /api/event

Get current event name and its source.

**Response:**

```json
{
  "name": "Czech Cup 2025",
  "source": "xml"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Event name or `null` |
| `source` | string | `"manual"` (override), `"xml"` (from MainTitle), or `null` |

---

### POST /api/event

Set or clear event name override.

**Request (set override):**

```json
{
  "name": "My Custom Event Name"
}
```

**Request (clear override):**

```json
{
  "name": null
}
```

or

```json
{}
```

**Response (set):**

```json
{
  "success": true,
  "name": "My Custom Event Name",
  "source": "manual"
}
```

**Response (clear):**

```json
{
  "success": true,
  "name": null,
  "source": null,
  "message": "Event name override cleared, will use XML MainTitle if available"
}
```

---

## Logs API

Access server log entries for debugging and monitoring.

### GET /api/logs

Get log entries from the server's log buffer.

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 100 | Maximum entries to return (max: 500) |
| `offset` | number | 0 | Number of entries to skip |
| `level` | string | - | Minimum log level: `debug`, `info`, `warn`, `error` |
| `levels` | string | - | Comma-separated specific levels to include |
| `search` | string | - | Case-insensitive search in component or message |
| `order` | string | `desc` | `asc` (oldest first) or `desc` (newest first) |

**Example:**

```
GET /api/logs?limit=50&level=warn&search=XML
```

**Response:**

```json
{
  "entries": [
    {
      "timestamp": "2025-01-02T10:30:00.000Z",
      "level": "info",
      "component": "XmlSource",
      "message": "File changed, reloading",
      "data": { "path": "..." }
    }
  ],
  "total": 1500,
  "limit": 50,
  "offset": 0,
  "bufferSize": 2000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `entries` | array | Log entries matching filters |
| `total` | number | Total entries in buffer |
| `limit` | number | Applied limit |
| `offset` | number | Applied offset |
| `bufferSize` | number | Maximum buffer capacity |

---

## Client Management API

These endpoints allow managing connected scoreboard clients and their configurations.

### GET /api/clients

Get list of all clients (online and known offline).

**Response:**

```json
{
  "clients": [
    {
      "ip": "192.168.1.50",
      "configKey": "192.168.1.50",
      "hasExplicitId": false,
      "label": "TV in Hall A",
      "online": true,
      "sessionId": "client-42",
      "sessionCount": 1,
      "ipAddress": "192.168.1.50",
      "serverConfig": {
        "type": "ledwall",
        "displayRows": 8
      },
      "clientState": {
        "current": {
          "type": "ledwall",
          "displayRows": 8
        },
        "version": "3.0.0"
      },
      "lastSeen": "2025-01-05T10:30:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | Client config key (IP or clientId) - for backwards compatibility |
| `configKey` | string | Client identifier used for config lookup (IP or explicit clientId) |
| `hasExplicitId` | boolean | True if client provided explicit clientId (not IP-based) |
| `label` | string | Admin-assigned label |
| `online` | boolean | Whether client is currently connected |
| `sessionId` | string | WebSocket session ID (if online) |
| `sessionCount` | number | Number of active sessions for this configKey |
| `ipAddress` | string | Actual IP address of connected client (if online) |
| `serverConfig` | object | Configuration stored on server |
| `clientState` | object | Last reported state from client |
| `lastSeen` | string | ISO timestamp of last connection |

---

### PUT /api/clients/:ip/config

Update configuration for a client. If the client is online, changes are pushed immediately via WebSocket.

**Parameters:**

| Name | Description |
|------|-------------|
| `ip` | Client IP address |

**Request:**

```json
{
  "type": "ledwall",
  "displayRows": 10,
  "customTitle": "Finish Line",
  "clientId": "finish-display"
}
```

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `type` | string | `'vertical'` or `'ledwall'` | Layout mode |
| `displayRows` | number | 3-20 | Number of rows |
| `customTitle` | string | any | Custom title |
| `raceFilter` | string[] | array of strings | Race filter |
| `showOnCourse` | boolean | true/false | Show OnCourse data |
| `showResults` | boolean | true/false | Show Results data |
| `scrollToFinished` | boolean | true/false | Scroll to finished competitor (default: true) |
| `custom` | object | key-value pairs | Custom parameters |
| `clientId` | string | non-empty string | Server-assigned client ID (client adopts it) |

**Response:**

```json
{
  "success": true,
  "config": {
    "type": "ledwall",
    "displayRows": 10,
    "customTitle": "Finish Line",
    "label": "TV in Hall A"
  },
  "pushed": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation succeeded |
| `config` | object | Updated configuration |
| `pushed` | boolean | Whether config was pushed to online client |

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "Invalid type. Must be 'vertical' or 'ledwall'." }` |
| 400 | `{ "error": "displayRows must be between 3 and 20." }` |
| 400 | `{ "error": "scrollToFinished must be a boolean" }` |

---

### PUT /api/clients/:ip/label

Set label for a client.

**Request:**

```json
{
  "label": "TV in Hall A"
}
```

**Response:**

```json
{
  "success": true,
  "label": "TV in Hall A"
}
```

---

### DELETE /api/clients/:ip

Delete stored configuration for a client.

**Response:**

```json
{
  "success": true,
  "deleted": true
}
```

---

### POST /api/clients/:ip/refresh

Send ForceRefresh to a specific client.

**Request:**

```json
{
  "reason": "Manual refresh"
}
```

**Response:**

```json
{
  "success": true,
  "refreshed": true
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 404 | `{ "error": "Client not online" }` |

---

## Custom Parameters API

Manage custom parameter definitions for client configuration.

### GET /api/config/custom-params

Get list of defined custom parameters.

**Response:**

```json
{
  "definitions": [
    {
      "key": "showSponsors",
      "label": "Show Sponsors",
      "type": "boolean",
      "defaultValue": true
    },
    {
      "key": "scrollSpeed",
      "label": "Scroll Speed",
      "type": "number",
      "defaultValue": 5
    }
  ]
}
```

---

### PUT /api/config/custom-params

Set custom parameter definitions.

**Request:**

```json
{
  "definitions": [
    {
      "key": "showSponsors",
      "label": "Show Sponsors",
      "type": "boolean",
      "defaultValue": true
    }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `key` | string | Yes | Non-empty |
| `label` | string | Yes | Non-empty |
| `type` | string | Yes | `'string'`, `'number'`, or `'boolean'` |
| `defaultValue` | any | No | Must match type |

**Response:**

```json
{
  "success": true,
  "definitions": [
    {
      "key": "showSponsors",
      "label": "Show Sponsors",
      "type": "boolean",
      "defaultValue": true
    }
  ]
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "Each definition must have a non-empty key." }` |
| 400 | `{ "error": "Invalid type 'invalid'. Must be string, number, or boolean." }` |

---

## Assets API

Manage default asset images (logos, banners) for all scoreboards. Individual clients can override these via per-client configuration.

### Asset Types

| Key | Description | Recommended Size |
|-----|-------------|------------------|
| `logoUrl` | Main event logo | max 200×80 px |
| `partnerLogoUrl` | Partner/sponsor logo | max 300×80 px |
| `footerImageUrl` | Footer banner image | max 1920×200 px |

### Asset Value Formats

Assets can be specified as:

- **URL**: `https://example.com/logo.png` - fetched from network
- **Data URI**: `data:image/png;base64,iVBORw0KGgo...` - embedded base64

**Supported image formats:**

| Format | MIME Type | Notes |
|--------|-----------|-------|
| PNG | `image/png` | Preserves transparency |
| JPEG | `image/jpeg` | Best for photos |
| SVG | `image/svg+xml` | Vector format, not resized |
| GIF | `image/gif` | Converted to JPEG on upload |
| WebP | `image/webp` | Converted to JPEG on upload |

**Admin UI behavior:**
- Raster images (PNG, JPEG, GIF, WebP) are automatically resized to recommended dimensions
- SVG files are preserved as-is (vector format, no resize needed)
- All uploads are converted to data URIs for offline use

---

### GET /api/config/assets

Get current default assets configuration.

**Response:**

```json
{
  "assets": {
    "logoUrl": "data:image/png;base64,iVBORw0KGgo...",
    "partnerLogoUrl": null,
    "footerImageUrl": "https://example.com/banner.jpg"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `assets.logoUrl` | string \| null | Main logo (null if not set) |
| `assets.partnerLogoUrl` | string \| null | Partner logo (null if not set) |
| `assets.footerImageUrl` | string \| null | Footer banner (null if not set) |

---

### PUT /api/config/assets

Set default assets. Supports partial updates - only provided fields are modified.

**Request:**

```json
{
  "logoUrl": "data:image/png;base64,iVBORw0KGgo...",
  "partnerLogoUrl": "https://example.com/partner.png"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `logoUrl` | string \| null | Set logo (null to clear) |
| `partnerLogoUrl` | string \| null | Set partner logo (null to clear) |
| `footerImageUrl` | string \| null | Set footer banner (null to clear) |

**Response:**

```json
{
  "success": true,
  "assets": {
    "logoUrl": "data:image/png;base64,iVBORw0KGgo...",
    "partnerLogoUrl": "https://example.com/partner.png",
    "footerImageUrl": null
  }
}
```

**Validation:**

- Values must be strings (URL or data URI) or null
- URLs must start with `http://` or `https://`
- Data URIs must start with `data:image/`
- Warning logged if data URI exceeds 500KB

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "logoUrl must be a string or null" }` |
| 400 | `{ "error": "logoUrl must be a URL (http/https) or data URI (data:image/...)" }` |

---

### DELETE /api/config/assets/:key

Clear a specific default asset.

**Parameters:**

| Name | Description |
|------|-------------|
| `key` | Asset key: `logoUrl`, `partnerLogoUrl`, or `footerImageUrl` |

**Response:**

```json
{
  "success": true,
  "assets": {
    "logoUrl": null,
    "partnerLogoUrl": "https://example.com/partner.png",
    "footerImageUrl": null
  }
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "Invalid asset key: invalid. Must be one of: logoUrl, partnerLogoUrl, footerImageUrl" }` |

---

### Per-Client Asset Overrides

Individual clients can have asset overrides that take precedence over defaults. Set via client configuration:

**PUT /api/clients/:ip/config**

```json
{
  "assets": {
    "logoUrl": "data:image/png;base64,..."
  }
}
```

**Merge Priority:**

1. Per-client asset (if set)
2. Global default asset (if set)
3. Scoreboard fallback (client-side default)

See [CLIENT-CONFIG.md](CLIENT-CONFIG.md) for full client configuration documentation.

---

## C123 Write API

These endpoints allow sending commands to the C123 timing system. Commands are sent via TCP to C123 and require an active TCP connection.

**Prerequisites:**
- TCP connection to C123 must be established
- Returns `503 Service Unavailable` if TCP is not connected

---

### POST /api/c123/scoring

Send a penalty scoring command to C123.

**Request:**

```json
{
  "bib": "10",
  "gate": 5,
  "value": 2
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bib` | string | Yes | Non-empty | Competitor start number |
| `gate` | number | Yes | 1-24 | Gate number |
| `value` | number | Yes | 0, 2, or 50 | Penalty value |

**Penalty Values:**

| Value | Meaning |
|-------|---------|
| `0` | Clean pass (no penalty) |
| `2` | Touch (+2 seconds) |
| `50` | Missed/not taken (+50 seconds) |

**Response:**

```json
{
  "success": true,
  "bib": "10",
  "gate": 5,
  "value": 2
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "bib is required" }` |
| 400 | `{ "error": "gate must be a number between 1 and 24" }` |
| 400 | `{ "error": "value must be 0, 2, or 50" }` |
| 503 | `{ "error": "Not connected to C123", "detail": "TCP connection to C123 is not established" }` |

---

### POST /api/c123/remove-from-course

Remove a competitor from the course (DNS, DNF, CAP).

**Request:**

```json
{
  "bib": "10",
  "reason": "DNS",
  "position": 1
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bib` | string | Yes | Non-empty | Competitor start number |
| `reason` | string | Yes | DNS, DNF, CAP | Reason for removal |
| `position` | number | No | > 0 | Position (default: 1) |

**Reason Values:**

| Reason | Meaning |
|--------|---------|
| `DNS` | Did Not Start |
| `DNF` | Did Not Finish |
| `CAP` | Capsized |

**Response:**

```json
{
  "success": true,
  "bib": "10",
  "reason": "DNS",
  "position": 1
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "bib is required" }` |
| 400 | `{ "error": "reason must be DNS, DNF, or CAP" }` |
| 400 | `{ "error": "position must be a positive number" }` |
| 503 | `{ "error": "Not connected to C123" }` |

---

### POST /api/c123/timing

Send a manual timing impulse to C123.

**Request:**

```json
{
  "bib": "10",
  "channelPosition": "Start"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bib` | string | Yes | Non-empty | Competitor start number |
| `channelPosition` | string | Yes | Start, Finish, Split1, Split2 | Timing position |

**Channel Positions:**

| Position | Description |
|----------|-------------|
| `Start` | Start impulse |
| `Finish` | Finish impulse |
| `Split1` | First split time |
| `Split2` | Second split time |

**Response:**

```json
{
  "success": true,
  "bib": "10",
  "channelPosition": "Start"
}
```

**Errors:**

| Status | Response |
|--------|----------|
| 400 | `{ "error": "bib is required" }` |
| 400 | `{ "error": "channelPosition must be Start, Finish, Split1, or Split2" }` |
| 503 | `{ "error": "Not connected to C123" }` |

---

### WebSocket Notifications

When a C123 command is successfully sent, a `ScoringEvent` message is broadcast to all admin WebSocket connections.

**Message format:**

```json
{
  "type": "ScoringEvent",
  "timestamp": "2025-01-16T12:30:00.000Z",
  "data": {
    "eventType": "penalty",
    "bib": "10",
    "details": { "gate": 5, "value": 2 }
  }
}
```

| eventType | details |
|-----------|---------|
| `penalty` | `{ gate: number, value: 0 \| 2 \| 50 }` |
| `remove` | `{ reason: "DNS" \| "DNF" \| "CAP", position: number }` |
| `timing` | `{ channelPosition: "Start" \| "Finish" \| "Split1" \| "Split2" }` |

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
- [CLIENT-CONFIG.md](CLIENT-CONFIG.md) - Remote client configuration
