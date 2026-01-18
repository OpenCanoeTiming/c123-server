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
| **Write API** | Scoring, RemoveFromCourse, Timing endpoints for c123-scoring |

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
| `../analysis/07-sitova-komunikace.md` | C123 protocol analysis |
| `../analysis/captures/*.xml` | XML structure examples |
| `../analysis/recordings/*.jsonl` | Timing analysis |
| Tag `v1.0.0-cli` | Archived CLI-compatible version |

---

## Completed: Admin UI - Full Design System Migration ✅

### Goal

Complete migration from CSS variable aliasing to **native design system classes**. Current state uses aliases which is a compatibility layer - target is strict design system usage.

### Approach: Strict Design System

**No fallbacks, no local component styles** - all UI components must use `timing-design-system` classes directly.

### Phase 1: CSS Sync (Completed ✅)

- [x] 1. Copy `timing.css` from design system to `src/admin-ui/`
- [x] 2. Update `index.html` to link timing.css
- [x] 3. CSS variable aliasing for backward compatibility

### Phase 2: Auto-refresh timing.css (Completed ✅)

- [x] 1. Add `postinstall` script to copy fresh `timing.css` from `timing-design-system`
- [x] 2. Add `prebuild` script as backup
- [x] 3. Document: after `npm install` timing.css is always current
- [x] 4. Fallback: if timing-design-system not found, keep existing file (offline mode)

```json
// package.json scripts
"postinstall": "node scripts/sync-design-system.js",
"prebuild": "node scripts/sync-design-system.js"
```

### Phase 3: Component Migration (Completed ✅)

Replace local/inline styles with design system classes:

- [x] **Header** - migrated to `.status-dot-*` classes from design system
- [x] **LIVE indicator** - vodácký badge style (`.badge-success` + `.status-dot-glow`)
- [x] **Clients cards** - use `.card .card-interactive .card-compact .card-status-success` from design system
- [x] **Tabs** - migrated to `.tabs > .tab-list > .tab` structure from design system
- [x] **Log viewer** - migrated from inline styles to `.log-*` component classes in styles.css
- [x] **Modal (client editor)** - added responsive `.modal-two-col` single column on mobile
- [x] **Buttons** - local implementation in styles.css (design system doesn't have button component)
- [x] **Status dots** - local implementation using `.status-dot-*` classes (design system doesn't have)
- [x] **Tables** - local implementation in styles.css (design system doesn't have table component)
- [x] **Forms/inputs** - local implementation in styles.css (design system doesn't have form component)

### Known Issues to Fix

| Component | Problem | Solution |
|-----------|---------|----------|
| ~~Client editor modal~~ | ~~Shows in partial screen, not fullscreen overlay~~ | ~~Added responsive two-col → one-col~~ ✅ Fixed |
| ~~Tabs (Logs/Sources/XML/Assets)~~ | ~~Rendered vertically~~ | ~~Use horizontal `.tabs` from design system~~ ✅ Fixed |
| ~~Log viewer~~ | ~~Hardcoded inline styles~~ | ~~Migrated to `.log-*` classes~~ ✅ Fixed |
| ~~LIVE badge~~ | ~~Generic styling~~ | ~~Use vodácký (canoe) accent from design system~~ ✅ Fixed |

### Files to Modify

```
src/admin-ui/
├── index.html      # Update class names to design system
├── styles.css      # MINIMIZE - only app-specific overrides
├── main.js         # Update generated HTML class names
└── timing.css      # Auto-synced from design system
scripts/
└── sync-design-system.js  # NEW - auto-sync script
```

### Verification

```bash
# After npm install, timing.css should be fresh
npm install
ls -la src/admin-ui/timing.css

# Visual check - all components should match design system
npm start
# Open http://localhost:27123
```

---

## Completed: CourseData REST Endpoint ✅

**Cíl:** Přidat endpoint `/api/xml/courses` pro načtení segmentů trati.

Endpoint `/api/xml/courses` vrací course data včetně gate configuration a split pozic.
Pro c123-scoring automatické gate groups.

---

## Remaining Work

### Validation with Real C123 (Requires Hardware)

- [ ] Test Write API with real C123 (penalties reflect in OnCourse)
- [ ] Test graceful error handling without C123
- [ ] Test with multiple scoring terminals simultaneously

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
| Write API | Scoring, RemoveFromCourse, Timing endpoints + tests | ✅ |
| CourseData API | `/api/xml/courses` endpoint for gate config and splits | ✅ |

### Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| Framework | Vanilla JS + CSS | Simplicity, no build tools |
| Fonts | Self-hosted (Inter, JetBrains Mono) | Offline operation at races |
| Icons | Inline SVG | No external dependencies |
| State | URL hash + localStorage | Persistence, shareable |
| Mobile | Mobile-first | Frequent tablet usage |
