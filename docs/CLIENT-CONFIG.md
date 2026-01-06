# Client Configuration (Remote Scoreboard Management)

This document describes how the C123 Server centrally manages scoreboard client configurations. Administrators can set display parameters (layout, rows, custom title) from the dashboard, and clients receive these settings automatically via WebSocket.

---

## Overview

The client configuration system allows administrators to:

1. **View all connected scoreboards** - See which clients are online
2. **Name clients** - Assign labels like "TV in Hall A" for easy identification
3. **Push configuration** - Set display parameters that are sent to clients
4. **Define custom parameters** - Add organization-specific settings

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Client Config Flow                              │
│                                                                      │
│   Admin UI                 Server                    Scoreboard      │
│  ┌────────┐           ┌──────────────┐           ┌──────────────┐   │
│  │ Edit   │──PUT───▶  │ ClientConfig │──WS push──▶│ Apply config │   │
│  │ config │           │  Storage     │            │ (displayRows │   │
│  └────────┘           └──────────────┘            │  layout, etc)│   │
│                             │                     └──────────────┘   │
│                             ▼                                        │
│                       settings.json                                  │
│                       clientConfigs{}                                │
│                                                                      │
│      Identify by IP ◀──connect──  WS :27123/ws                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Known Parameters

These parameters are recognized by the C123 Server and scoreboard implementations:

| Parameter | Type | Range/Values | Description |
|-----------|------|--------------|-------------|
| `type` | string | `'vertical'` \| `'ledwall'` | Layout mode |
| `displayRows` | number | 3-20 | Number of rows for LED wall scaling |
| `customTitle` | string | any | Custom title override |
| `raceFilter` | string[] | race IDs | Only show these races |
| `showOnCourse` | boolean | true/false | Show OnCourse data |
| `showResults` | boolean | true/false | Show Results data |
| `scrollToFinished` | boolean | true/false | Scroll to finished competitor (default: true) |
| `assets` | object | AssetUrls | Logo and banner images (see below) |

### Asset Parameters

The `assets` field contains image URLs for branding:

| Key | Type | Description |
|-----|------|-------------|
| `logoUrl` | string | Main event logo (max 200×80 px recommended) |
| `partnerLogoUrl` | string | Partner/sponsor logo (max 300×80 px) |
| `footerImageUrl` | string | Footer banner image (max 1920×200 px) |

Values can be URLs (`https://...`) or data URIs (`data:image/png;base64,...`).

**Merge Priority:** Per-client assets override global defaults. If neither is set, scoreboard uses its own fallback.

### Parameter Behavior

- **`undefined`** = "not set, use client default/auto-detection"
- **explicit value** = "use this value"

Only explicitly set parameters are pushed to clients. This allows clients to use their own defaults for unset values.

---

## WebSocket Messages

Two new message types are used for client configuration:

### ConfigPush (Server → Client)

Sent by server when:
1. Client connects (if config exists for that IP)
2. Admin updates client configuration

```json
{
  "type": "ConfigPush",
  "timestamp": "2025-01-05T10:30:00.000Z",
  "data": {
    "type": "ledwall",
    "displayRows": 8,
    "customTitle": "Finish Line Display",
    "label": "TV in Hall A",
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
| `type` | string | Layout mode (`vertical` or `ledwall`) |
| `displayRows` | number | Number of display rows |
| `customTitle` | string | Custom title for scoreboard |
| `raceFilter` | string[] | Race ID filter |
| `showOnCourse` | boolean | Show OnCourse data |
| `showResults` | boolean | Show Results data |
| `scrollToFinished` | boolean | Scroll to finished competitor (default: true) |
| `custom` | object | Custom parameters (key-value) |
| `label` | string | Admin-assigned label |
| `clientId` | string | Server-assigned client identifier (see below) |
| `assets` | object | Asset images (logoUrl, partnerLogoUrl, footerImageUrl) |

Only set parameters are included. Empty/undefined values are omitted.

### Server-Assigned Client ID

When `clientId` is included in ConfigPush, the client should adopt it:

1. **Store the ID** in localStorage for future connections
2. **Reconnect with the new ID** using `ws://server:27123/ws?clientId=<new-id>`

This allows administrators to:
- Name new clients from the dashboard
- Reassign client identities
- Move configurations between machines

**Client implementation:**

```typescript
function handleConfigPush(data: ConfigPushData) {
  // If server assigned a new clientId, adopt it
  if (data.clientId && data.clientId !== currentClientId) {
    localStorage.setItem('c123-clientId', data.clientId);

    // Reconnect with new ID (optional: immediate or on next connection)
    reconnectWithNewId(data.clientId);
  }

  // ... apply other config
}
```

### ClientState (Client → Server)

Optional message for client to report its current state:

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
| `current` | object | Yes | Current parameter values in use |
| `version` | string | No | Client version |
| `capabilities` | string[] | No | Supported features |

---

## Scoreboard Implementation

### Handling ConfigPush

```typescript
interface AssetUrls {
  logoUrl?: string;
  partnerLogoUrl?: string;
  footerImageUrl?: string;
}

interface ConfigPushData {
  type?: 'vertical' | 'ledwall';
  displayRows?: number;
  customTitle?: string;
  raceFilter?: string[];
  showOnCourse?: boolean;
  showResults?: boolean;
  scrollToFinished?: boolean;
  custom?: Record<string, string | number | boolean>;
  label?: string;
  assets?: AssetUrls;
}

class ScoreboardClient {
  private config: ConfigPushData = {};

  constructor() {
    // Initialize with URL params or defaults
    this.config = this.getInitialConfig();
  }

  handleMessage(message: { type: string; data: unknown }) {
    switch (message.type) {
      case 'ConfigPush':
        this.applyConfig(message.data as ConfigPushData);
        break;
      // ... other message types
    }
  }

  private applyConfig(pushed: ConfigPushData) {
    // Merge pushed config with current config
    // Only override values that are explicitly set (not undefined)
    for (const [key, value] of Object.entries(pushed)) {
      if (value !== undefined) {
        (this.config as Record<string, unknown>)[key] = value;
      }
    }

    // Re-render with new config
    this.render();

    // Optionally report state back to server
    this.reportState();
  }

  private reportState() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ClientState',
        timestamp: new Date().toISOString(),
        data: {
          current: this.config,
          version: '3.0.0',
          capabilities: ['configPush', 'forceRefresh'],
        },
      }));
    }
  }

  private getInitialConfig(): ConfigPushData {
    const params = new URLSearchParams(window.location.search);
    return {
      type: params.get('type') as 'vertical' | 'ledwall' | undefined,
      displayRows: params.has('displayRows')
        ? parseInt(params.get('displayRows')!, 10)
        : undefined,
      customTitle: params.get('customTitle') || undefined,
    };
  }
}
```

### Full Example with Connection

```typescript
class ConfigAwareScoreboard {
  private ws: WebSocket | null = null;
  private config: ConfigPushData = {};
  private serverUrl: string;
  private clientId: string | null;

  constructor(serverUrl: string, clientId?: string) {
    this.serverUrl = serverUrl;
    this.clientId = clientId || this.getClientIdFromUrl();
    this.config = this.getDefaults();
  }

  private getClientIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('clientId');
  }

  connect() {
    // Include clientId in WebSocket URL if available
    const wsUrl = this.clientId
      ? `ws://${this.serverUrl}/ws?clientId=${encodeURIComponent(this.clientId)}`
      : `ws://${this.serverUrl}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected - waiting for ConfigPush');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'Connected':
          // Server will send ConfigPush next if config exists
          console.log('Server connected:', message.data);
          break;

        case 'ConfigPush':
          console.log('Received config:', message.data);
          this.applyConfig(message.data);
          break;

        case 'OnCourse':
        case 'Results':
          // Apply race filter if set
          if (this.shouldShowMessage(message)) {
            this.handleRaceData(message);
          }
          break;

        case 'ForceRefresh':
          console.log('Force refresh:', message.data.reason);
          this.refresh();
          break;
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 3000);
    };
  }

  private applyConfig(pushed: ConfigPushData) {
    // Merge with existing config
    this.config = { ...this.config, ...this.filterDefined(pushed) };

    // Apply layout changes
    if (this.config.type === 'ledwall') {
      this.setLedWallMode(this.config.displayRows || 10);
    } else {
      this.setVerticalMode();
    }

    // Apply title
    if (this.config.customTitle) {
      document.title = this.config.customTitle;
    }

    // Apply assets (logos, banners)
    if (this.config.assets) {
      if (this.config.assets.logoUrl) {
        this.setLogo(this.config.assets.logoUrl);
      }
      if (this.config.assets.partnerLogoUrl) {
        this.setPartnerLogo(this.config.assets.partnerLogoUrl);
      }
      if (this.config.assets.footerImageUrl) {
        this.setFooterBanner(this.config.assets.footerImageUrl);
      }
    }

    // Report state back
    this.reportState();
  }

  private filterDefined(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  }

  private shouldShowMessage(message: { type: string; data: { raceId?: string } }): boolean {
    // If no filter, show everything
    if (!this.config.raceFilter?.length) return true;

    // Check if raceId matches filter
    const raceId = message.data?.raceId;
    if (!raceId) return true;

    return this.config.raceFilter.includes(raceId);
  }

  private reportState() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ClientState',
        timestamp: new Date().toISOString(),
        data: {
          current: this.config,
          version: '3.0.0',
        },
      }));
    }
  }

  private getDefaults(): ConfigPushData {
    return {
      type: 'vertical',
      displayRows: 10,
      showOnCourse: true,
      showResults: true,
    };
  }

  // Implementation-specific methods
  private setLedWallMode(rows: number) { /* ... */ }
  private setVerticalMode() { /* ... */ }
  private handleRaceData(message: unknown) { /* ... */ }
  private refresh() { /* ... */ }
  private setLogo(url: string) { /* ... */ }
  private setPartnerLogo(url: string) { /* ... */ }
  private setFooterBanner(url: string) { /* ... */ }
}
```

---

## REST API

### GET /api/clients

Get list of all clients (online and known offline).

**Response:**
```json
{
  "clients": [
    {
      "ip": "192.168.1.50",
      "label": "TV in Hall A",
      "online": true,
      "sessionId": "client-42",
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
    },
    {
      "ip": "192.168.1.51",
      "label": "Start Display",
      "online": false,
      "serverConfig": {
        "type": "vertical"
      },
      "lastSeen": "2025-01-04T18:00:00.000Z"
    }
  ]
}
```

### PUT /api/clients/:ip/config

Update configuration for a client. Automatically pushes changes if client is online.

**Request:**
```json
{
  "type": "ledwall",
  "displayRows": 10,
  "customTitle": "Finish Line"
}
```

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

**Validation:**
- `type`: Must be `'vertical'` or `'ledwall'`
- `displayRows`: Must be 3-20
- `raceFilter`: Must be an array of strings
- `showOnCourse`, `showResults`, `scrollToFinished`: Must be boolean

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

### DELETE /api/clients/:ip

Delete stored configuration for a client.

**Response:**
```json
{
  "success": true,
  "deleted": true
}
```

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

---

## Custom Parameters

Administrators can define additional parameters for organization-specific needs.

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

**Validation:**
- `key`: Required, non-empty string
- `label`: Required, non-empty string
- `type`: Must be `'string'`, `'number'`, or `'boolean'`
- `defaultValue`: Must match the specified type

### Using Custom Parameters

When set, custom parameters appear in the `custom` field of ConfigPush:

```json
{
  "type": "ConfigPush",
  "data": {
    "type": "ledwall",
    "displayRows": 8,
    "custom": {
      "showSponsors": false,
      "scrollSpeed": 3
    }
  }
}
```

Client implementation:

```typescript
function applyConfig(data: ConfigPushData) {
  // Known parameters
  if (data.type) setLayout(data.type);
  if (data.displayRows) setRows(data.displayRows);

  // Custom parameters
  if (data.custom) {
    if ('showSponsors' in data.custom) {
      setSponsorVisibility(data.custom.showSponsors as boolean);
    }
    if ('scrollSpeed' in data.custom) {
      setScrollSpeed(data.custom.scrollSpeed as number);
    }
  }
}
```

---

## Client Identification

Clients can be identified in two ways:

### 1. Explicit Client ID (Recommended for multiple clients per machine)

Clients can specify a unique `clientId` in the WebSocket URL:

```
ws://server:27123/ws?clientId=main-display
ws://server:27123/ws?clientId=ledwall-1
ws://server:27123/ws?clientId=start-area
```

**Benefits:**
- Each client has independent configuration
- Multiple scoreboards on the same machine work correctly
- Configuration is tied to the `clientId`, not the IP
- Easy to pre-configure clients before deployment

**Implementation in scoreboard:**

```typescript
// URL-based configuration
const url = new URL(window.location.href);
const clientId = url.searchParams.get('clientId');

// Connect with clientId
const wsUrl = clientId
  ? `ws://server:27123/ws?clientId=${encodeURIComponent(clientId)}`
  : `ws://server:27123/ws`;

const ws = new WebSocket(wsUrl);
```

**Example setup:**
```
# Main display at finish line
http://scoreboard-app/?clientId=finish-main

# LED wall near start
http://scoreboard-app/?clientId=start-ledwall

# Backup display
http://scoreboard-app/?clientId=backup-1
```

### 2. IP-based Identification (Default fallback)

If no `clientId` is provided, clients are identified by their IP address:

1. `X-Forwarded-For` header (if behind proxy)
2. `X-Real-IP` header (if behind proxy)
3. Socket remote address

**Note:** All clients from the same IP share configuration when using IP-based identification. This can cause conflicts when running multiple scoreboards on one machine.

### API Response Fields

The `/api/clients` endpoint includes identification info:

```json
{
  "clients": [
    {
      "ip": "main-display",
      "configKey": "main-display",
      "hasExplicitId": true,
      "ipAddress": "192.168.1.50",
      "label": "Finish Line Main",
      "online": true
    },
    {
      "ip": "192.168.1.51",
      "configKey": "192.168.1.51",
      "hasExplicitId": false,
      "ipAddress": null,
      "label": "Start Display",
      "online": true
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `configKey` | Unique identifier used for config storage (clientId or IP) |
| `hasExplicitId` | `true` if using explicit clientId, `false` if IP-based |
| `ipAddress` | Actual IP address (only for online clients with explicit ID) |
| `ip` | Alias for `configKey` (backwards compatibility) |

### Behind Proxy

If the server is behind a reverse proxy, ensure the proxy forwards client IP:

**Nginx:**
```nginx
location /ws {
    proxy_pass http://localhost:27123;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## Persistence

Client configurations are stored in `settings.json`:

**Windows:** `%APPDATA%\c123-server\settings.json`
**Linux/macOS:** `~/.c123-server/settings.json`

```json
{
  "clientConfigs": {
    "192.168.1.50": {
      "type": "ledwall",
      "displayRows": 8,
      "label": "TV in Hall A",
      "lastSeen": "2025-01-05T10:30:00.000Z"
    },
    "192.168.1.51": {
      "type": "vertical",
      "label": "Start Display",
      "lastSeen": "2025-01-04T18:00:00.000Z"
    }
  },
  "customParamDefinitions": [
    {
      "key": "showSponsors",
      "label": "Show Sponsors",
      "type": "boolean",
      "defaultValue": true
    }
  ]
}
```

---

## See Also

- [C123-PROTOCOL.md](C123-PROTOCOL.md) - WebSocket message types
- [REST-API.md](REST-API.md) - Full REST API documentation
- [INTEGRATION.md](INTEGRATION.md) - Integration guide for scoreboards
