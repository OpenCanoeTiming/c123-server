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

#### Design Philosophy: "Dark Performance"

Inspirace BMW M-line: čistý, funkční design s výraznými kontrastními akcenty.
Žádný vizuální bloat - každý prvek má účel. Různé aplikace sdílejí stejný
základ, ale mají unikátní identitu (header, akcentní barva).

```
┌─────────────────────────────────────────────────────────────┐
│ ████  C123-SERVER                          :27123  ● LIVE  │  ← Výrazný header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Čistý, tmavý obsah bez zbytečných dekorací               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 1. Design System

**Barevná paleta "Anthracite":**
```
Base (shared across apps):
  --bg-body:       #0a0a0a     (čistá černá)
  --bg-surface:    #141414     (karty, panely)
  --bg-elevated:   #1f1f1f     (hover, modaly)
  --bg-input:      #0d0d0d     (input fields)

  --border:        #2a2a2a     (subtilní hranice)
  --border-focus:  #404040     (focus state)

Text:
  --text-primary:  #ffffff     (hlavní obsah)
  --text-secondary:#888888     (pomocný text)
  --text-muted:    #555555     (disabled, placeholders)

Semantic (shared):
  --success:       #00d26a     (connected, ok)
  --warning:       #ff9500     (connecting, attention)
  --error:         #ff3b30     (disconnected, error)
```

**App-specific accent (C123-SERVER = Electric Blue):**
```
  --accent:        #0088ff     (primární akce, links)
  --accent-hover:  #0066cc     (hover state)
  --accent-subtle: rgba(0,136,255,0.12)
  --accent-glow:   rgba(0,136,255,0.4)   (pro header stripe)
```

**Alternativní akcenty pro budoucí apps:**
```
  Scoreboard Admin:  #ff3366  (Racing Red)
  Timing System:     #00cc88  (Timing Green)
  Results Portal:    #aa66ff  (Purple)
```

**Typography:**
```
--font-sans:  'Inter', -apple-system, system-ui, sans-serif
--font-mono:  'JetBrains Mono', 'SF Mono', monospace

--text-xs:    0.75rem   12px  (tags, badges)
--text-sm:    0.8125rem 13px  (secondary, table cells)
--text-base:  0.875rem  14px  (body - kompaktní admin UI)
--text-lg:    1rem      16px  (section headers)
--text-xl:    1.125rem  18px  (card titles)
--text-2xl:   1.5rem    24px  (header app name)

--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-bold:   600
```

**Spacing & Sizing:**
```
--space-1:  4px     --radius-sm: 4px
--space-2:  8px     --radius-md: 6px
--space-3: 12px     --radius-lg: 8px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px

--header-height: 48px
--sidebar-width: 240px  (if needed later)
```

#### 2. Header Component

Klíčový identifikační prvek - na první pohled jasné, která app běží.

```
┌─────────────────────────────────────────────────────────────┐
│▌ C123-SERVER                              :27123   ● LIVE  │
└─────────────────────────────────────────────────────────────┘
 ↑
 Accent stripe (4px, glow effect)
```

```css
.header {
  height: 48px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent);
  box-shadow: 0 0 20px var(--accent-glow);
}

.header-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #fff;
}

.header-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
}
```

#### 3. Komponenty

**Card:**
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  /* Žádné shadows - flat design */
}

.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 500;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
```

**Status Indicator:**
```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.status-dot.connecting {
  background: var(--warning);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-dot.error {
  background: var(--error);
}
```

**Button variants:**
```css
.btn {
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}
.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-focus);
}

.btn-danger {
  background: transparent;
  border: 1px solid var(--error);
  color: var(--error);
}
.btn-danger:hover {
  background: rgba(255,59,48,0.12);
}
```

**Form inputs:**
```css
.input {
  height: 36px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0 12px;
  font-size: 13px;
  color: var(--text-primary);
}

.input:focus {
  border-color: var(--accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-subtle);
}
```

**Table (pro Sources, Logs):**
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 10px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}

.table tr:hover {
  background: var(--bg-elevated);
}
```

**Modal:**
```css
.modal-backdrop {
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 480px;
  width: 90%;
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}
```

#### 4. Layout

```
┌─────────────────────────────────────────────────────────────┐
│▌ C123-SERVER                              :27123   ● LIVE  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ EVENT ──────────────────────────────────────────────┐  │
│  │  K1 Muži - 1. kolo                        Race #42   │  │
│  │  [Custom name____________]  [Set] [Clear]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  TCP ● Connected    UDP ● Listening    XML ● Loaded         │
│                                                             │
│  ┌─ SOURCES ─┬─ XML ─┬─ CLIENTS ─┬─ ASSETS ─┬─ LOGS ───┐   │
│  │                                                      │   │
│  │   Tab content                                        │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Klíčové změny:**
- Header s accent stripe vlevo - okamžitá identifikace aplikace
- Event info prominentně pod headerem
- Inline status bar (TCP/UDP/XML) - kompaktní přehled
- Tab navigation pro sekce - méně scrollování, rychlá navigace

### Implementační plán

#### Blok A: Příprava a extrakce (1 session) ✅ DONE
- [x] A1: Vytvořit `src/admin-ui/` adresář
- [x] A2: Extrahovat CSS do `styles.css`
- [x] A3: Extrahovat JS do `main.js`
- [x] A4: Vytvořit `index.html` template
- [x] A5: Upravit UnifiedServer pro servírování souborů

**Poznámky k bloku A:**
- CSS/JS/HTML jsou nyní v `src/admin-ui/` (kopírováno do `dist/` při buildu)
- UnifiedServer.ts zredukován z ~3800 na ~2000 řádků
- Testy aktualizovány pro novou architekturu
- Build script: `tsc && cp -r src/admin-ui dist/`

#### Blok B: Design system základ (1 session) ✅ DONE
- [x] B1: Implementovat CSS custom properties (barvy, spacing)
- [x] B2: Přidat Inter + JetBrains Mono fonty (self-hosted)
- [x] B3: Vytvořit základní komponenty (Card, Button, Badge)
- [x] B4: Implementovat nový header s global status

**Poznámky k bloku B:**
- CSS design system s "Dark Performance" themem (Anthracite)
- Self-hosted Inter a JetBrains Mono fonty v `/admin-ui/fonts/`
- Nový header s accent stripe a real-time status indikátory (TCP/UDP/XML/LIVE)
- Badge komponenta pro status labely
- Všechny barvy, spacing, typography jako CSS custom properties

#### Blok C: Tab navigation a layout (1 session) ✅ DONE
- [x] C1: Implementovat tab systém (vanilla JS)
- [x] C2: Redesign Sources jako kompaktní status bar
- [x] C3: Event info sekce nahoře
- [x] C4: Responzivní mobile-first layout

**Poznámky k bloku C:**
- Tab navigace s 5 sekcemi (Sources, XML, Clients, Assets, Logs)
- Stav tabu persistován v URL hash (#sources, #xml, atd.)
- Event info bar prominentně nahoře s názvem závodu a eventu
- Kompaktní status bar pro rychlý přehled všech zdrojů
- Mobile-first responsive layout (breakpoints 768px a 480px)
- Větší touch targets na mobilu (min 44px)
- Keyboard navigation - Escape zavírá modal

#### Blok D: Komponenty a UX (1 session) ✅ DONE
- [x] D1: Nový modal s backdrop blur a focus trap
- [x] D2: Loading states pro async operace
- [x] D3: Toast notifications pro feedback
- [x] D4: Vylepšené form controls

**Poznámky k bloku D:**
- Toast notifications s animacemi (slide-in/out), ikonami a auto-dismiss
- Focus trap pro modal - Tab/Shift+Tab cykluje v modalu, Escape zavírá
- Loading states pro buttony (.btn.loading) se spinnerem
- Skeleton loading placeholders pro async content
- Vylepšené form controls: form-group, form-label, select, checkbox, radio, switch/toggle, textarea
- Input validace (error/success states) a input groups s addony
- Všechny notifikace (client, asset) nyní používají toast systém

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
