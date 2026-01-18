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

## Next: Admin UI - Full Design System Migration

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

### Phase 3: Component Migration

Replace local/inline styles with design system classes:

- [x] **Header** - migrated to `.status-dot-*` classes from design system
- [x] **LIVE indicator** - vodácký badge style (`.badge-success` + `.status-dot-glow`)
- [x] **Clients cards** - use `.card .card-interactive .card-compact .card-status-success` from design system
- [x] **Tabs** - migrated to `.tabs > .tab-list > .tab` structure from design system
- [ ] **Log viewer** - migrate from inline styles to design system `.log-viewer` component
- [ ] **Modal (client editor)** - FIX: broken layout (partial screen), use `.modal` properly
- [ ] **Buttons** - ensure all use `.btn`, `.btn-secondary`, `.btn-danger`
- [ ] **Status dots** - use `.status`, `.status--connected`, `.status--error`
- [ ] **Tables** - use design system table classes
- [ ] **Forms/inputs** - use design system form classes

### Known Issues to Fix

| Component | Problem | Solution |
|-----------|---------|----------|
| Client editor modal | Shows in partial screen, not fullscreen overlay | Fix modal CSS, use design system `.modal` |
| ~~Tabs (Logs/Sources/XML/Assets)~~ | ~~Rendered vertically~~ | ~~Use horizontal `.tabs` from design system~~ ✅ Fixed |
| Log viewer | Hardcoded inline styles | Migrate to design system log component |
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

## Next: CourseData REST Endpoint

**Cíl:** Přidat endpoint `/api/xml/courses` pro načtení segmentů trati.

**Důvod:** c123-scoring potřebuje segment informace pro automatické gate groups.

**Kontext:**
- XML obsahuje `<CourseData>` s `CourseConfig: "NNRNSNRNS..."` kde `S` = split
- Aktuální WS `RaceConfig` posílá `gateConfig` bez `S`
- Nový endpoint vrátí původní data včetně split pozic

### Kroky

- [x] 1. Přidat interface `XmlCourseData` do `src/service/XmlDataService.ts`
  ```typescript
  export interface XmlCourseData {
    courseNr: number
    courseConfig: string  // "NNRNSNRNS..." včetně S
    splits: number[]      // Gate numbers where splits occur
  }
  ```

- [x] 2. Přidat metodu `getCourses()` do `XmlDataService`
  - Parsovat `<CourseData>` elementy z XML
  - Extrahovat `CourseNr` a `CourseConfig`
  - Spočítat `splits[]` - pozice branek kde je `S`

- [x] 3. Přidat route a handler do `src/unified/UnifiedServer.ts`
  ```typescript
  this.app.get('/api/xml/courses', this.handleXmlCourses.bind(this));
  ```

- [x] 4. Dokumentace - přidat do `docs/REST-API.md`

- [x] 5. Build a test

**Soubory:**
```
src/service/XmlDataService.ts    # Přidat XmlCourseData + getCourses()
src/unified/UnifiedServer.ts     # Přidat /api/xml/courses route
docs/REST-API.md                 # Dokumentace
```

**Verifikace:**
```bash
npm run build && npm test
curl http://localhost:27123/api/xml/courses
# Očekávat: {"courses":[{"courseNr":1,"courseConfig":"NNRN...","splits":[4,8,12]},...]}
```

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

### Design Decisions

| Aspect | Decision | Reason |
|--------|----------|--------|
| Framework | Vanilla JS + CSS | Simplicity, no build tools |
| Fonts | Self-hosted (Inter, JetBrains Mono) | Offline operation at races |
| Icons | Inline SVG | No external dependencies |
| State | URL hash + localStorage | Persistence, shareable |
| Mobile | Mobile-first | Frequent tablet usage |
