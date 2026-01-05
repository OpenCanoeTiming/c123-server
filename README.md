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
# Development mode with hot reload
npm run dev

# Production mode (after build)
npm start

# With options (note the -- to pass arguments)
npm start -- --host 192.168.1.5
npm start -- --xml /path/to/results.xml
```

The server starts on port **27123** with:
- Admin dashboard: http://localhost:27123/
- WebSocket: ws://localhost:27123/ws
- REST API: http://localhost:27123/api/

## Command Line Options

```
Usage: npm start -- [command] [options]

Commands:
  run         Run the server (default)
  install     Install as Windows service
  uninstall   Uninstall Windows service
  start       Start the Windows service
  stop        Stop the Windows service

Options:
  --host <ip>         C123 host IP (disables auto-discovery)
  --port <port>       C123 source port (default: 27333)
  --server-port <p>   Server port for HTTP + WebSocket (default: 27123)
  --xml <path>        XML file path for results data
  --no-discovery      Disable UDP auto-discovery
  --no-autodetect     Disable Canoe123 XML autodetection (Windows)
  -d, --debug         Enable verbose debug logging
  -h, --help          Show help message
  -v, --version       Show version

Environment variables:
  C123_SERVER_PORT    Server port (overrides default, overridden by --server-port)
  PORT                Fallback for server port (if C123_SERVER_PORT not set)
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
npm start -- install
npm start -- start
```

Manage the service:

```bash
npm start -- stop
npm start -- uninstall
```

## Configuration

### Persistent Settings

Settings are automatically saved and restored across restarts:

| Platform | Settings Path |
|----------|---------------|
| Windows | `%APPDATA%\c123-server\settings.json` |
| Linux/macOS | `~/.c123-server/settings.json` |

Settings include:
- XML file path and source mode
- Event name override
- Server port

### XML Source Modes

Three modes for selecting the XML data source:

| Mode | Description |
|------|-------------|
| **auto-offline** | Offline copy from `AutoCopyFolder` (default, recommended) |
| **auto-main** | Main event file (`CurrentEventFile` from C123 config) |
| **manual** | User-specified path |

On Windows, the server automatically detects Canoe123 configuration and extracts XML paths.

## Admin Dashboard

Open http://localhost:27123 to access the admin dashboard:

- View connected scoreboards
- Monitor data sources (C123, XML)
- Configure XML source mode (auto-main, auto-offline, manual)
- Set event name override
- View real-time logs
- Force refresh all connected clients

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

## Troubleshooting

### Connection Issues

**Cannot connect to C123 (Canoe123)**
- Verify C123 is running and broadcasting on port 27333
- Check that both machines are on the same network
- On Windows, ensure Windows Firewall allows UDP/TCP port 27333
- Try specifying the C123 host directly: `npm start -- --host 192.168.1.5`

**Scoreboards cannot connect**
- Ensure port 27123 is not blocked by firewall
- On Windows, add firewall rule: `netsh advfirewall firewall add rule name="C123 Server" dir=in action=allow protocol=TCP localport=27123`
- Check that the server is listening: visit http://localhost:27123 in browser

### XML Issues

**XML not detected on Windows**
- Ensure Canoe123 has been run at least once (creates user.config)
- Check if AutoCopyFolder is configured in Canoe123
- Use `--xml <path>` to specify path manually
- Use `--no-autodetect` to disable autodetection and set path via admin UI

**XML not updating**
- For network paths (SMB), the server uses polling (not filesystem events)
- Default poll interval is 1 second (configurable via debounce settings)
- Verify the XML file is being modified by Canoe123

### General

**Server won't start**
- Check if port 27123 is already in use: `netstat -an | find "27123"`
- Use a different port: `npm start -- --server-port 8080`
- Check logs for specific error messages

**Windows Service issues**
- Ensure you run the command prompt as Administrator
- Check Windows Event Log for service-related errors
- Verify node-windows optional dependency is installed

## Documentation

- [C123-PROTOCOL.md](docs/C123-PROTOCOL.md) - C123 protocol reference
- [REST-API.md](docs/REST-API.md) - REST API documentation
- [INTEGRATION.md](docs/INTEGRATION.md) - Scoreboard integration guide
- [CLI-DIFFERENCES.md](docs/CLI-DIFFERENCES.md) - Migration from CLI format
- [SCOREBOARD-REQUIREMENTS.md](docs/SCOREBOARD-REQUIREMENTS.md) - What scoreboards must implement

## License

MIT
