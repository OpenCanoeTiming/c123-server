# C123 Server - Plan and Project Status

## Vision

**C123 Server** = lean middleware layer passing **authentic C123 data** to scoreboards.

- Scoreboard works directly with native C123 data (not CLI format)
- Server doesn't modify data, only parses and forwards it
- XML file serves as secondary source for historical/supplementary data

---

## Project Status: FUNCTIONAL ✅

Server is completely implemented and functional.

| Area | Description |
|------|-------------|
| **TCP/UDP** | Connection to C123 on :27333, reconnect logic, UDP discovery |
| **WebSocket** | Real-time stream for scoreboards on `/ws` |
| **REST API** | XML data, client configuration, status, assets, C123 write |
| **Admin UI** | Dashboard on `/`, client management, log viewer, asset management |
| **XML polling** | Auto/manual/URL modes, file watcher |
| **Client config** | Remote scoreboard configuration via ConfigPush |
| **Assets** | Centralized image management with per-client overrides, SVG support |
| **Write API** | PenaltyCorrection, Scoring, RemoveFromCourse, Timing for c123-scoring |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server                                 │
│                                                                     │
│   Sources                    Core                     Output        │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐    │
│  │ TcpSource    │◄─────▶│              │       │              │    │
│  │   :27333     │       │  C123Proxy   │──────▶│  Unified     │    │
│  ├──────────────┤       │ (XML → JSON) │       │  Server      │    │
│  │ UdpDiscovery │──────▶│              │       │   :27123     │───▶│ Clients
│  │   :27333     │       └──────────────┘       │              │    │
│  └──────────────┘                              │  /      admin│    │
│                         ┌──────────────┐       │  /ws   WS    │    │
│  ┌──────────────┐       │  XmlService  │──────▶│  /api  REST  │    │
│  │ XmlSource    │──────▶│ (data + push)│       └──────────────┘    │
│  │ (file/URL)   │       └──────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Ports

| Service | Port | Note |
|---------|------|------|
| **C123 (upstream)** | 27333 | Canoe123 protocol, cannot be changed |
| **C123 Server** | 27123 | HTTP + WS + API (all on one port) |

---

## Key Concepts

### C123 Protocol

| Message | Frequency | Description |
|---------|-----------|-------------|
| **TimeOfDay** | ~1×/s | Heartbeat |
| **OnCourse** | multiple/s | Competitors on course |
| **Results** | irregular | Results (categories rotate) |
| **RaceConfig** | ~20s | Category configuration |
| **Schedule** | ~40s | Race schedule |

### Write API (for c123-scoring)

| Endpoint | Format | Use Case |
|----------|--------|----------|
| `POST /api/c123/scoring` | `<Scoring>` | Competitors ON COURSE |
| `POST /api/c123/scoring` + raceId | `<PenaltyCorrection>` | FINISHED competitors |
| `POST /api/c123/remove-from-course` | `<RemoveFromCourse>` | DNS/DNF/CAP |
| `POST /api/c123/timing` | `<Timing>` | Manual timing impulse |

### BR1/BR2 (BetterRun)

- CZ-specific format for two runs
- **Server DOESN'T handle merge** - passes authentic data
- **Scoreboard handles merge** using REST API `/api/xml/races/:raceId/results?merged=true`

### Current="Y"

Indicates currently running category in Results - key for race flow tracking.

---

## Documentation

| File | Purpose |
|------|---------|
| `docs/C123-PROTOCOL.md` | WebSocket protocol, message types |
| `docs/REST-API.md` | REST endpoints including Assets and Write API |
| `docs/INTEGRATION.md` | Integration guide |
| `docs/CLIENT-CONFIG.md` | Remote client configuration (ConfigPush) |
| `docs/SCOREBOARD-REQUIREMENTS.md` | Scoreboard requirements |
| `docs/CLI-DIFFERENCES.md` | Differences from CLI version |
| `docs/XML-FORMAT.md` | XML structure with examples |

---

## References

| Source | Description |
|--------|-------------|
| `../c123-protocol-docs/` | C123 protocol documentation |
| `../c123-scoring/resources-private/orig_src/` | Original Canoe123Term source |
| Tag `v1.0.0-cli` | Archived CLI-compatible version |

---

## Remaining Work

### Nice-to-have (Future)

- [ ] Service worker for offline support
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Implementation History

| Phase | Description | Status |
|-------|-------------|--------|
| Core | TCP/UDP sources, WebSocket, REST API, XML polling | ✅ |
| Admin UI v1 | Inline HTML/CSS/JS in UnifiedServer | ✅ |
| Admin UI v2 | Extraction to files, "Dark Performance" design, accessibility | ✅ |
| Write API v1 | Scoring, RemoveFromCourse, Timing endpoints + tests | ✅ |
| CourseData API | `/api/xml/courses` endpoint for gate config and splits | ✅ |
| Design System | Full migration to `timing-design-system` components | ✅ |
| Write API v2 | PenaltyCorrection for finished competitors, null for delete | ✅ |

### Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| Framework | Vanilla JS + CSS | Simplicity, no build tools |
| Fonts | Self-hosted (Inter, JetBrains Mono) | Offline operation at races |
| Icons | Inline SVG | No external dependencies |
| State | URL hash + localStorage | Persistence, shareable |
| Mobile | Mobile-first | Frequent tablet usage |
