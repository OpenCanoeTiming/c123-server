# C123 Server

Smart middleware for canoe slalom timing - bridge between Canoe123 timing software and scoreboards.

## Features

- **Single port architecture** - All services (Admin, WebSocket, REST API) on port 27123
- **Auto-discovery** - Automatically finds C123 on the local network via UDP broadcast
- **Native C123 protocol** - Passes authentic C123 data (XML → JSON) without CLI emulation
- **XML REST API** - Full access to race data (schedule, participants, results)
- **Finish detection** - Detects when athletes cross the finish line via dtFinish tracking
- **Admin dashboard** - Web interface for monitoring and configuration
- **Windows auto-config** - Automatically detects XML path from Canoe123 settings
- **Persistent settings** - Configuration survives restarts

## Installation

```bash
npm install
npm run build
```

## Quick Start

```bash
# Auto-discovery mode
c123-server

# Connect to specific C123
c123-server --host 192.168.1.5

# With XML file for complete results
c123-server --xml /path/to/results.xml
```

The server starts on port **27123** with:
- Admin dashboard: http://localhost:27123/
- WebSocket: ws://localhost:27123/ws
- REST API: http://localhost:27123/api/

## Command Line Options

```
Usage: c123-server [command] [options]

Commands:
  run         Run the server (default)
  install     Install as Windows service
  uninstall   Uninstall Windows service
  start       Start the Windows service
  stop        Stop the Windows service

Options:
  --host <ip>          C123 host IP (disables auto-discovery)
  --port <port>        C123 port (default: 27333)
  --server-port <p>    Server port for all services (default: 27123)
  --xml <path>         XML file path for results data
  --no-discovery       Disable UDP auto-discovery
  -d, --debug          Enable verbose debug logging
  -h, --help           Show help message
  -v, --version        Show version
```

## Ports

| Service | Port | Description |
|---------|------|-------------|
| C123 (upstream) | 27333 | TCP + UDP (Canoe123 software) |
| **C123 Server** | 27123 | All services (HTTP + WS) |

### Endpoints on port 27123

| Path | Protocol | Purpose |
|------|----------|---------|
| `/` | HTTP | Admin dashboard (SPA) |
| `/ws` | WebSocket | Real-time C123 data + XML change notifications |
| `/api/*` | HTTP | REST API (status, config, XML data) |
| `/api/discover` | HTTP | Server discovery endpoint |

## WebSocket Messages

Real-time C123 data in JSON format:

```json
{
  "type": "OnCourse",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": {
    "total": 2,
    "competitors": [
      {
        "bib": "9",
        "name": "KOPEČEK Michal",
        "time": "81.15",
        "dtFinish": null,
        "rank": 8
      }
    ]
  }
}
```

Message types: `TimeOfDay`, `OnCourse`, `Results`, `RaceConfig`, `Schedule`, `XmlChange`

## REST API

```bash
# Server status
GET /api/status

# Race schedule
GET /api/xml/schedule

# Participants
GET /api/xml/participants

# Race results
GET /api/xml/races/:id/results

# Merged BR1+BR2 results
GET /api/xml/races/:id/results?merged=true
```

See [docs/REST-API.md](docs/REST-API.md) for full API documentation.

## Windows Service

Install as a Windows service for automatic startup:

```bash
c123-server install
c123-server start
```

Manage the service:

```bash
c123-server stop
c123-server uninstall
```

## Admin Dashboard

Open http://localhost:27123 to access the admin dashboard:

- View connected scoreboards
- Monitor data sources (C123, XML)
- Configure XML path (manual or auto-detect from Canoe123)
- View server status and connections

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server v2                              │
│                                                                     │
│   Sources                    Core                     Output        │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐    │
│  │ TcpSource    │──────▶│              │       │              │    │
│  │   :27333     │       │  C123Proxy   │──────▶│  Unified     │    │
│  ├──────────────┤       │ (XML → JSON) │       │  Server      │    │
│  │ UdpDiscovery │──────▶│              │       │   :27123     │───▶│ Clients
│  │   :27333     │       └──────────────┘       │              │    │
│  └──────────────┘                              │  /      admin│    │
│                         ┌──────────────┐       │  /ws   WS    │    │
│  ┌──────────────┐       │  XmlService  │──────▶│  /api  REST  │    │
│  │ XmlSource    │──────▶│ (data + push)│       └──────────────┘    │
│  │ (file/URL)   │       └──────────────┘                           │
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## Documentation

- [C123-PROTOCOL.md](docs/C123-PROTOCOL.md) - C123 protocol reference
- [REST-API.md](docs/REST-API.md) - REST API documentation
- [INTEGRATION.md](docs/INTEGRATION.md) - Scoreboard integration guide
- [CLI-DIFFERENCES.md](docs/CLI-DIFFERENCES.md) - Migration from CLI format
- [SCOREBOARD-REQUIREMENTS.md](docs/SCOREBOARD-REQUIREMENTS.md) - What scoreboards must implement

## License

MIT
