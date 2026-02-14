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

## Current: Live-Mini Integration (Issues #4, #5)

Push timing data to remote c123-live-mini-server + Admin UI panel.

```
C123.exe ──TCP:27333──► c123-server ──HTTP/JSON──► c123-live-mini (cloud)
                            │                            │
                       (local LAN)                  (public internet)
```

### Next step

Block 5: Admin UI - Live Results Panel

### Block 1: Types, HTTP Client, Settings ✅

- [x] Create `src/live-mini/types.ts` — API request/response types, LiveMiniStatus, LiveMiniConfig
- [x] Create `src/live-mini/LiveMiniClient.ts` — stateless HTTP client (native fetch)
  - Methods: `createEvent()`, `pushXml()`, `pushOnCourse()`, `pushResults()`, `transitionStatus()`
  - Retry with exponential backoff (1s → 2s → 4s → 8s → 30s max)
  - Respect 429 Too Many Requests, 10s timeout per request
  - X-API-Key header authentication
- [x] Extend `AppSettings` in `src/config/AppSettings.ts` — add `liveMini` section
  - Fields: enabled, serverUrl, apiKey, eventId, eventStatus, pushXml, pushOnCourse, pushResults
- [x] Unit tests for LiveMiniClient (mocked fetch)

### Block 2: Transformer ✅

- [x] Create `src/live-mini/LiveMiniTransformer.ts`
- [x] Participant ID mapping: `Map<"bib:raceId", participantId>`
  - Built from XML: for each schedule item (raceId → classId), map all participants of that class
  - Refreshed on every XML change via XmlDataService
  - If mapping missing → skip push (XML must come first)
- [x] OnCourse transform: bib→number, gates→(number|null)[], pen×100, time→number, dt→ISO 8601
- [x] Results transform: time/total seconds→centiseconds, gates→structured array, status extraction
- [x] Event metadata extraction from XmlDataService (mainTitle, eventId, location, discipline)
- [x] Unit tests for all transformations (especially participant ID mapping edge cases)

### Block 3: Pusher + Server Integration ✅

- [x] Create `src/live-mini/LiveMiniPusher.ts` — main orchestrator
  - Subscribe to: XmlChangeNotifier (XML push, debounce 2s), EventState change (OnCourse throttle 2/s, Results debounce 1s per raceId)
  - Buffer strategy: XML "last wins", Results "last wins per raceId", OnCourse throttle/drop, transitions queue
  - Circuit breaker: 5 consecutive failures → 30s pause → retry
  - Emit `statusChange` for Admin UI WebSocket
- [x] Integrate into `src/server.ts` — create LiveMiniPusher, wire up events via getters
- [x] Pusher starts/stops via API, not automatically on server start
- [x] Unit tests for LiveMiniPusher (connect, disconnect, pause/resume, debounce/throttle, circuit breaker)

### Block 4: API Endpoints ✅

- [x] Add routes to `src/unified/UnifiedServer.ts`:
  - `GET /api/live-mini/status` — current pusher state
  - `POST /api/live-mini/connect` — set URL, create event on live-mini, store apiKey, start push
  - `POST /api/live-mini/disconnect` — stop push, optionally clear config
  - `POST /api/live-mini/pause` — pause/resume push
  - `POST /api/live-mini/force-push-xml` — immediate XML push
  - `POST /api/live-mini/transition` — event status change on live-mini
  - `PATCH /api/live-mini/config` — toggle push channels (xml/oncourse/results)
- [x] Add `LiveMiniStatus` message type to admin WS broadcast (throttle 2/s)

### Block 5: Admin UI — Live Results Panel

- [ ] Add HTML section in `index.html` — after clients section, before tabs
- [ ] Three UI states: Not Configured → Connected/Active → Error/Disconnected
- [ ] Not Configured: URL input + "Connect & Create Event" button
- [ ] Event creation flow: pre-fill metadata from XML, editable fields, confirm → POST /api/live-mini/connect
- [ ] Connected: status dot, server/event info, push status card (per-channel), event lifecycle viz, channel toggles, action buttons (pause, force push, disconnect)
- [ ] Error: failure count, last error, retry/disconnect buttons
- [ ] WebSocket handler for `LiveMiniStatus` messages
- [ ] Use design system classes (.card, .badge, .status-dot, .btn), minimal local CSS
- [ ] All patterns consistent with existing Admin UI (vanilla JS, fetch, toasts)

### Key Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| Participant ID | `(bib, raceId)` → lookup XML `<Id>` | Bib not unique across classes, raceId available in TCP |
| Admin UI placement | Standalone section above tabs (after clients) | Operator needs at-a-glance status during race |
| Framework | Vanilla JS (same as existing Admin UI) | Consistency, no build step |
| Buffering | "Last wins" per channel/race, drop stale OnCourse | Fresh data always better, no need for deep queue |
| XML first | OnCourse/Results push skipped until XML sent | live-mini needs participants from XML before accepting JSON |

---

## Remaining Work

### Nice-to-have (Future)

- [ ] Service worker for offline support
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Auto-transition suggestions (C123 race status → live-mini event lifecycle)

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
