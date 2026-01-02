# C123 Server

Smart middleware for canoe slalom timing - bridge between Canoe123 timing software and scoreboards.

## Features

- **Auto-discovery** - Automatically finds C123 on the local network via UDP broadcast
- **CLI-compatible output** - Scoreboards work without changes
- **BR1/BR2 merging** - Combines both runs with best time calculation
- **Finish detection** - Highlights athletes when they cross the finish line
- **Admin dashboard** - Web interface for monitoring and per-scoreboard configuration
- **Windows service** - Run as a system service with auto-start

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic (auto-discovery)

```bash
c123-server
```

The server will automatically discover C123 on the network and start serving data to scoreboards.

### Connect to specific C123

```bash
c123-server --host 192.168.1.5
```

### With XML file for complete results

```bash
c123-server --xml /path/to/results.xml
```

### All options

```
Usage: c123-server [command] [options]

Commands:
  run         Run the server (default)
  install     Install as Windows service
  uninstall   Uninstall Windows service
  start       Start the Windows service
  stop        Stop the Windows service

Options:
  --host <ip>       C123 host IP (disables auto-discovery)
  --port <port>     C123 port (default: 27333)
  --ws-port <port>  WebSocket port for scoreboards (default: 27084)
  --admin-port <p>  Admin dashboard port (default: 8084)
  --xml <path>      XML file path for results data
  --no-discovery    Disable UDP auto-discovery
  -h, --help        Show help message
  -v, --version     Show version
```

## Ports

| Service | Port | Description |
|---------|------|-------------|
| C123 (existing) | 27333 | TCP + UDP (Canoe123 software) |
| WebSocket | 27084 | Scoreboard connections |
| Admin | 8084 | Web dashboard |

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

**Note:** Requires `node-windows` optional dependency.

## Admin Dashboard

Open http://localhost:8084 to access the admin dashboard:

- View connected scoreboards
- Monitor data sources (C123, XML)
- Configure per-scoreboard settings (race filter, visibility)

### REST API

- `GET /api/status` - Server status overview
- `GET /api/scoreboards` - List connected scoreboards
- `GET /api/sources` - Data source status
- `POST /api/scoreboards/:id/config` - Update scoreboard config

## Message Format

The server emits CLI-compatible JSON messages:

```json
// top (results)
{
  "msg": "top",
  "data": {
    "RaceName": "K1m - middle course",
    "RaceStatus": "3",
    "HighlightBib": "9",
    "list": [{ "Rank": 1, "Bib": "1", "Name": "...", "Total": "78.99", "Pen": 2 }]
  }
}

// oncourse (on course)
{
  "msg": "oncourse",
  "data": [{ "Bib": "9", "Name": "...", "Time": "8115", "dtFinish": "" }]
}

// comp (current competitor)
{
  "msg": "comp",
  "data": { "Bib": "9", "Name": "...", "Time": "8115" }
}
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

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server                                 │
│                                                                     │
│   Sources                    State                    Output        │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐    │
│  │ UdpDiscovery │──────>│              │       │  WebSocket   │    │
│  │   :27333     │       │  EventState  │──────>│   :27084     │───>│ Scoreboards
│  ├──────────────┤       │              │       └──────────────┘    │
│  │ TcpSource    │──────>│ - RaceState  │                           │
│  │   :27333     │       │ - BR1BR2Merge│       ┌──────────────┐    │
│  ├──────────────┤       │ - FinishDet. │──────>│ AdminServer  │    │
│  │ XmlFileSource│──────>│              │       │   :8084      │    │
│  └──────────────┘       └──────────────┘       └──────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## License

MIT
