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

Push timing data to remote c123-live-server + Admin UI panel.

```
C123.exe ──TCP:27333──► c123-server ──HTTP/JSON──► c123-live (cloud)
                            │                            │
                       (local LAN)                  (public internet)
```

### Next step

Live Admin UI improvements completed (#51, #52, #53). Ready for merge.

### Block 1: Types, HTTP Client, Settings ✅

- [x] Create `src/live/types.ts` — API request/response types, LiveStatus, LiveConfig
- [x] Create `src/live/LiveClient.ts` — stateless HTTP client (native fetch)
  - Methods: `createEvent()`, `pushXml()`, `pushOnCourse()`, `pushResults()`, `transitionStatus()`
  - Retry with exponential backoff (1s → 2s → 4s → 8s → 30s max)
  - Respect 429 Too Many Requests, 10s timeout per request
  - X-API-Key header authentication
- [x] Extend `AppSettings` in `src/config/AppSettings.ts` — add `live` section
  - Fields: enabled, serverUrl, apiKey, eventId, eventStatus, pushXml, pushOnCourse, pushResults
- [x] Unit tests for LiveClient (mocked fetch)

### Block 2: Transformer ✅

- [x] Create `src/live/LiveTransformer.ts`
- [x] Participant ID mapping: `Map<"bib:raceId", participantId>`
  - Built from XML: for each schedule item (raceId → classId), map all participants of that class
  - Refreshed on every XML change via XmlDataService
  - If mapping missing → skip push (XML must come first)
- [x] OnCourse transform: bib→number, gates→(number|null)[], pen×100, time→number, dt→ISO 8601
- [x] Results transform: time/total seconds→centiseconds, gates→structured array, status extraction
- [x] Event metadata extraction from XmlDataService (mainTitle, eventId, location, discipline)
- [x] Unit tests for all transformations (especially participant ID mapping edge cases)

### Block 3: Pusher + Server Integration ✅

- [x] Create `src/live/LivePusher.ts` — main orchestrator
  - Subscribe to: XmlChangeNotifier (XML push, debounce 2s), EventState change (OnCourse throttle 2/s, Results debounce 1s per raceId)
  - Buffer strategy: XML "last wins", Results "last wins per raceId", OnCourse throttle/drop, transitions queue
  - Circuit breaker: 5 consecutive failures → 30s pause → retry
  - Emit `statusChange` for Admin UI WebSocket
- [x] Integrate into `src/server.ts` — create LivePusher, wire up events via getters
- [x] Pusher starts/stops via API, not automatically on server start
- [x] Unit tests for LivePusher (connect, disconnect, pause/resume, debounce/throttle, circuit breaker)

### Block 4: API Endpoints ✅

- [x] Add routes to `src/unified/UnifiedServer.ts`:
  - `GET /api/live/status` — current pusher state
  - `POST /api/live/connect` — set URL, create event on live, store apiKey, start push
  - `POST /api/live/disconnect` — stop push, optionally clear config
  - `POST /api/live/pause` — pause/resume push
  - `POST /api/live/force-push-xml` — immediate XML push
  - `POST /api/live/transition` — event status change on live
  - `PATCH /api/live/config` — toggle push channels (xml/oncourse/results)
- [x] Add `LiveStatus` message type to admin WS broadcast (throttle 2/s)

### Block 5: Admin UI — Live Results Panel ✅

- [x] Add HTML section in `index.html` — after clients section, before tabs
- [x] Three UI states: Not Configured → Connected/Active → Error/Disconnected
- [x] Not Configured: URL input + "Connect & Create Event" button
- [x] Event creation flow: pre-fill metadata from XML, editable fields, confirm → POST /api/live/connect
- [x] Connected: status dot, server/event info, push status card (per-channel), event lifecycle viz, channel toggles, action buttons (pause, force push, disconnect)
- [x] Error: failure count, last error, retry/disconnect buttons
- [x] WebSocket handler for `LiveStatus` messages
- [x] Use design system classes (.card, .badge, .status-dot, .btn), minimal local CSS
- [x] All patterns consistent with existing Admin UI (vanilla JS, fetch, toasts)

### Block 6: Post-review fixes ✅

Found during PR review (#22). Three breaking bugs + code quality.

#### Bugs (breaking)

- [x] Fix `loadLiveStatus()` in `main.js` — response is `{ status: {...} }`, must call `renderLiveStatus(data.status)` not `renderLiveStatus(data)`
- [x] Fix `createLiveEvent()` in `main.js` — sends `eventMetadata` key but server reads `metadata` → rename to `metadata`
- [x] Fix OnCourse time/total units in `LiveTransformer.ts` — `time` and `total` sent as seconds (float) but live expects hundredths (centiseconds). Use `parseFormattedTimeToCentiseconds()` instead of `parseTimeToSeconds()`

#### Code quality

- [x] Static import `node:fs/promises` at top of `LivePusher.ts` instead of dynamic `await import()`
- [x] Deep copy in `LivePusher.getStatus()` — `channels` and `circuitBreaker` are nested objects, shallow spread `{...this.status}` leaks references
- [x] Remove unused `_checksum` parameter from `xmlChangeListener` callback type (line 84)

#### Admin UI: inline styles → CSS classes

- [x] Extract inline styles from `index.html` Live Results section into proper CSS classes in `styles.css`
- [x] Use design system classes where applicable (flex layouts, spacing, typography)
- [x] Match pattern used in rest of Admin UI (clients section, status bar, etc.)

#### Tests

- [x] Fix unit tests for transformer (time/total unit change)
- [x] Verify all existing tests still pass after fixes

### Key Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| Participant ID | `(bib, raceId)` → lookup XML `<Id>` | Bib not unique across classes, raceId available in TCP |
| Admin UI placement | Standalone section above tabs (after clients) | Operator needs at-a-glance status during race |
| Framework | Vanilla JS (same as existing Admin UI) | Consistency, no build step |
| Buffering | "Last wins" per channel/race, drop stale OnCourse | Fresh data always better, no need for deep queue |
| XML first | OnCourse/Results push skipped until XML sent | live needs participants from XML before accepting JSON |

---

## Remaining Work

### Block 7: Live Admin UI Improvements (Issues #51, #52, #53) ✅

- [x] **#51 X-Master-Key support** — `LiveClient` authMode refactor (apiKey/masterKey/none), `createEvent()` uses masterKey, `listEvents()` new method
- [x] **#52 Event image upload** — `imageData` in `CreateEventRequest`, drag/drop upload in modal, 500KB limit, preview
- [x] **#53 Event ID hint** — Updated hint text: "Live results identifier used in public URLs. Independent from C123 XML Event ID."
- [x] **Admin UI restructure** — NOT_CONFIGURED: shared URL+masterKey inputs, 3 action buttons (Create/Browse/Manual)
- [x] **Browse Events modal** — `GET /api/live/events` proxy endpoint, event list with status badges, one-click connect
- [x] **Manual Connect modal** — Replaces old inline "Connect to Existing" tab
- [x] **API Key display** — Masked key in connected state info grid with copy-to-clipboard button
- [x] **Channel toggles** — Moved inside channel cards for cleaner layout
- [x] **handleLiveStatus** — Now returns apiKey from settings
- [x] All 540 tests pass, 0 lint errors

### Nice-to-have (Future)

- [ ] Service worker for offline support
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Auto-transition suggestions (C123 race status → live event lifecycle)

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
