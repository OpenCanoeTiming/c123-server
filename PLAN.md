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

## Next: Admin UI Design System Integration

### Goal

Integrate `timing-design-system` CSS into vanilla JS admin UI for visual consistency across timing tools.

### Approach: Vanilla CSS Only

**No React, no build tools** - just CSS classes from the design system.

**What we use from timing-design-system:**
- `dist/timing.css` - compiled CSS bundle
- CSS classes: buttons, cards, badges, tables, modals, toasts, tabs, header, status dots
- Fonts: Inter, JetBrains Mono (already self-hosted in admin-ui)

### Steps

- [x] 1. Copy `timing.css` from design system to `src/admin-ui/`
- [x] 2. Update `index.html` to link timing.css (before styles.css as override layer)
- [x] 3. Integrate design system via CSS variable aliasing:
  - Added `theme-dark` class to body
  - Aliased `--color-*` variables to legacy `--var` names in styles.css
  - All existing classes now use design system tokens
  - No class name changes needed - aliasing approach maintains compatibility
- [x] 4. Keep `main.js` logic - no changes needed (class names unchanged)
- [x] 5. Keep `styles.css` as override/extension layer with variable aliases
- [x] 6. Build and tests pass

### Files

```
src/admin-ui/
├── index.html      # Update CSS links
├── timing.css      # NEW - copy from design system
├── main.js         # Update class names if needed
├── styles.css      # Remove or keep for overrides
└── fonts/          # Already have Inter, JetBrains Mono
```

### Benefits

- Visual consistency with c123-scoreboard and c123-scoring
- No npm dependencies for admin-ui
- No build step
- Easy updates - just copy new timing.css

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
