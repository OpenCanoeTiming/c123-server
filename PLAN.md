# C123 Server - Plán a stav projektu

## Vize

**C123 Server** = štíhlá mezivrstva předávající **autentická data z C123** scoreboardům.

- Scoreboard pracuje přímo s nativními C123 daty (ne CLI formátem)
- Server nemodifikuje data, pouze je parsuje a předává
- XML soubor slouží jako sekundární zdroj pro historická/doplňková data

---

## Stav projektu: FUNKČNÍ ✅

Server je kompletně implementovaný a funkční.

| Oblast | Popis |
|--------|-------|
| **TCP/UDP** | Připojení k C123 na :27333, reconnect logika, UDP discovery |
| **WebSocket** | Real-time stream pro scoreboardy na `/ws` |
| **REST API** | XML data, konfigurace klientů, status, assets |
| **Admin UI** | Dashboard na `/`, správa klientů, log viewer, asset management |
| **XML polling** | Auto/manual/URL režimy, file watcher |
| **Client config** | Remote konfigurace scoreboardů přes ConfigPush |
| **Assets** | Centrální správa obrázků (logo, partneři, footer) s per-client overrides, SVG podpora |

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server                                 │
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
└─────────────────────────────────────────────────────────────────────┘
```

### Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| **C123 (upstream)** | 27333 | Canoe123 protokol, nelze měnit |
| **C123 Server** | 27123 | HTTP + WS + API (vše na jednom portu) |

---

## Klíčové koncepty

### C123 Protokol

| Zpráva | Frekvence | Popis |
|--------|-----------|-------|
| **TimeOfDay** | ~1×/s | Heartbeat |
| **OnCourse** | vícekrát/s | Závodníci na trati |
| **Results** | nepravidelně | Výsledky (rotují kategorie) |
| **RaceConfig** | ~20s | Konfigurace kategorie |
| **Schedule** | ~40s | Rozpis závodů |

### BR1/BR2 (BetterRun)

- CZ specifický formát pro dvě jízdy
- **Server NEŘEŠÍ merge** - předává autentická data
- **Scoreboard řeší merge** pomocí REST API `/api/xml/races/:raceId/results?merged=true`

### Current="Y"

Označuje aktuálně jedoucí kategorii v Results - klíčové pro sledování flow závodu.

---

## Dokumentace

| Soubor | Účel |
|--------|------|
| `docs/C123-PROTOCOL.md` | WebSocket protokol, typy zpráv |
| `docs/REST-API.md` | REST endpointy včetně Assets API |
| `docs/INTEGRATION.md` | Návod pro integrátory |
| `docs/CLIENT-CONFIG.md` | Remote konfigurace klientů (ConfigPush) |
| `docs/SCOREBOARD-REQUIREMENTS.md` | Požadavky na scoreboard |
| `docs/CLI-DIFFERENCES.md` | Rozdíly oproti CLI verzi |
| `docs/XML-FORMAT.md` | XML struktura s příklady |

---

## Reference

| Zdroj | Popis |
|-------|-------|
| `../analysis/07-sitova-komunikace.md` | C123 protokol analýza |
| `../analysis/captures/*.xml` | XML struktura příklady |
| `../analysis/recordings/*.jsonl` | Timing analýza |
| Tag `v1.0.0-cli` | Archivovaná CLI-kompatibilní verze |

---

## Admin UI Redesign (V2)

### Revize současného stavu (2025-01)

**Silné stránky:**
- Funkční dark theme s dobrým kontrastem
- Jasná struktura sekcí (Event, Sources, XML, Clients, Assets, Logs)
- Real-time aktualizace, drag-and-drop pro assets
- Responsive grid layout

**Slabé stránky:**
- Veškerý kód (3000+ řádků HTML/CSS/JS) inline v `UnifiedServer.ts`
- Chybí vizuální hierarchie - všechny sekce vypadají stejně
- Žádné loading states, minimal feedback
- Accessibility problémy (contrast, focus management, ARIA)
- Malé touch targets na mobilu

### Návrh nového designu

#### 1. Design System

**Barevná paleta (rozšířená):**
```
Background:
  --bg-primary:    #0f0f1a     (tmavší pro lepší kontrast)
  --bg-card:       #1a1a2e     (karty)
  --bg-elevated:   #252545     (modaly, hover)

Text:
  --text-primary:  #f0f0f5     (hlavní obsah)
  --text-secondary:#9090a0     (pomocný text)
  --text-muted:    #606070     (disabled)

Accent:
  --accent:        #00d4ff     (primární akce)
  --accent-hover:  #00a8cc     (hover)
  --accent-subtle: rgba(0,212,255,0.1)

Semantic:
  --success:       #00ff88     (connected, ok)
  --warning:       #ffb800     (connecting, attention)
  --error:         #ff4757     (disconnected, error)
  --info:          #5c7cfa     (informační)
```

**Typography:**
```
--font-sans:  'Inter', system-ui, sans-serif
--font-mono:  'JetBrains Mono', 'Fira Code', monospace

--text-xs:    0.75rem   (labels, tags)
--text-sm:    0.875rem  (secondary content)
--text-base:  1rem      (body)
--text-lg:    1.125rem  (section headers)
--text-xl:    1.5rem    (page title)
```

**Spacing & Sizing:**
```
--space-1: 0.25rem    --radius-sm: 4px
--space-2: 0.5rem     --radius-md: 8px
--space-3: 0.75rem    --radius-lg: 12px
--space-4: 1rem
--space-6: 1.5rem
--space-8: 2rem
```

#### 2. Komponenty

**Card (základní kontejner):**
- Subtilní border (#252545)
- Jemný box-shadow pro hloubku
- Větší padding (space-6)
- Header s ikonou + title + optional actions

**StatusBadge:**
- Pulzující animace pro "connecting"
- Tooltip s detaily
- Lepší accessibility (role="status")

**Button variants:**
- Primary (accent) - hlavní akce
- Secondary (ghost) - sekundární
- Danger (error) - destruktivní
- Icon-only s tooltip

**Form controls:**
- Větší touch targets (min 44px)
- Clear focus rings
- Inline validation messages
- Loading states

**Modal (vylepšený):**
- Backdrop blur
- Focus trap
- Escape to close
- Animace open/close

#### 3. Layout improvements

```
┌────────────────────────────────────────────────────────────┐
│  ┌─ Header ─────────────────────────────────────────────┐  │
│  │ 🎿 C123 Server              Port: 27123   ● Online  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Event Info (prominent) ─────────────────────────────┐  │
│  │  🏁 K1 Muži - 1. kolo           Race #42             │  │
│  │  Custom name: [_______________]  [Set] [Clear]       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Status Bar (compact) ───────────────────────────────┐  │
│  │  TCP ●  |  UDP ●  |  XML ●  |  Clients: 3 online     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Tabs ───────────────────────────────────────────────┐  │
│  │  [Sources] [XML Config] [Clients] [Assets] [Logs]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ Tab Content ────────────────────────────────────────┐  │
│  │                                                       │  │
│  │   (obsah podle vybraného tabu)                       │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Klíčové změny:**
- Header s globálním statusem (vždy viditelný)
- Event info prominentně nahoře (nejdůležitější info)
- Kompaktní status bar místo velké tabulky
- Tab navigation pro sekce (méně scrollování)

### Implementační plán

#### Blok A: Příprava a extrakce (1 session)
- [ ] A1: Vytvořit `src/admin-ui/` adresář
- [ ] A2: Extrahovat CSS do `styles.css` (CSS custom properties)
- [ ] A3: Extrahovat JS do `main.js` (ES modules)
- [ ] A4: Vytvořit `index.html` template
- [ ] A5: Upravit UnifiedServer pro servírování souborů

#### Blok B: Design system základ (1 session)
- [ ] B1: Implementovat CSS custom properties (barvy, spacing)
- [ ] B2: Přidat Inter + JetBrains Mono fonty (self-hosted)
- [ ] B3: Vytvořit základní komponenty (Card, Button, Badge)
- [ ] B4: Implementovat nový header s global status

#### Blok C: Tab navigation a layout (1 session)
- [ ] C1: Implementovat tab systém (vanilla JS)
- [ ] C2: Redesign Sources jako kompaktní status bar
- [ ] C3: Event info sekce nahoře
- [ ] C4: Responzivní mobile-first layout

#### Blok D: Komponenty a UX (1 session)
- [ ] D1: Nový modal s backdrop blur a focus trap
- [ ] D2: Loading states pro async operace
- [ ] D3: Toast notifications pro feedback
- [ ] D4: Vylepšené form controls

#### Blok E: Clients a Assets redesign (1 session)
- [ ] E1: Client cards s lepší hierarchií
- [ ] E2: Client edit modal vylepšení
- [ ] E3: Assets grid s lepším drag-and-drop UX
- [ ] E4: Asset preview lightbox

#### Blok F: Accessibility a polish (1 session)
- [ ] F1: ARIA labels a roles
- [ ] F2: Keyboard navigation
- [ ] F3: Focus management
- [ ] F4: Color contrast audit a fixes
- [ ] F5: Animace a transitions

### Design rozhodnutí

| Aspekt | Rozhodnutí | Důvod |
|--------|-----------|-------|
| Framework | Vanilla JS + CSS | Jednoduchost, žádné build tools |
| Fonts | Self-hosted | Offline provoz na závodech |
| Icons | Inline SVG | Žádné externí závislosti |
| State | URL hash + localStorage | Persistence, shareable |
| Mobile | Mobile-first | Časté použití na tabletu |

### Metriky úspěchu

- [ ] Lighthouse accessibility score > 90
- [ ] Všechny touch targets min 44x44px
- [ ] First contentful paint < 500ms
- [ ] Funguje offline (service worker optional)
- [ ] Testováno na Chrome, Firefox, Safari, Edge
