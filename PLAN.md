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
| **REST API** | XML data, konfigurace klientů, status, assets, C123 write |
| **Admin UI** | Dashboard na `/`, správa klientů, log viewer, asset management |
| **XML polling** | Auto/manual/URL režimy, file watcher |
| **Client config** | Remote konfigurace scoreboardů přes ConfigPush |
| **Assets** | Centrální správa obrázků s per-client overrides, SVG podpora |
| **Write API** | Scoring, RemoveFromCourse, Timing endpointy pro c123-scoring |

---

## Architektura

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
| `docs/REST-API.md` | REST endpointy včetně Assets a Write API |
| `docs/INTEGRATION.md` | Návod pro integrátory |
| `docs/CLIENT-CONFIG.md` | Remote konfigurace klientů (ConfigPush) |
| `docs/SCOREBOARD-REQUIREMENTS.md` | Požadavky na scoreboard |
| `docs/CLI-DIFFERENCES.md` | Rozdíly oproti CLI verzi |
| `docs/XML-FORMAT.md` | XML struktura s příklady |

---

## Reference

| Zdroj | Popis |
|-------|-------|
| `../c123-protocol-docs/` | C123 protokol dokumentace |
| `../analysis/07-sitova-komunikace.md` | C123 protokol analýza |
| `../analysis/captures/*.xml` | XML struktura příklady |
| `../analysis/recordings/*.jsonl` | Timing analýza |
| Tag `v1.0.0-cli` | Archivovaná CLI-kompatibilní verze |

---

## Zbývající práce

### Validace s reálným C123 (vyžaduje hardware)

- [ ] Test Write API s reálným C123 (penalizace se projeví v OnCourse)
- [ ] Test graceful error handling bez C123
- [ ] Test s více scoring terminály současně

### Nice-to-have (future)

- [ ] Service worker pro offline podporu
- [ ] Cross-browser testování (Chrome, Firefox, Safari, Edge)

---

## Historie implementace

| Fáze | Popis | Status |
|------|-------|--------|
| Core | TCP/UDP sources, WebSocket, REST API, XML polling | ✅ |
| Admin UI v1 | Inline HTML/CSS/JS v UnifiedServer | ✅ |
| Admin UI v2 | Extrakce do souborů, "Dark Performance" design, accessibility | ✅ |
| Write API | Scoring, RemoveFromCourse, Timing endpointy + testy | ✅ |

### Design rozhodnutí

| Aspekt | Rozhodnutí | Důvod |
|--------|-----------|-------|
| Framework | Vanilla JS + CSS | Jednoduchost, žádné build tools |
| Fonts | Self-hosted (Inter, JetBrains Mono) | Offline provoz na závodech |
| Icons | Inline SVG | Žádné externí závislosti |
| State | URL hash + localStorage | Persistence, shareable |
| Mobile | Mobile-first | Časté použití na tabletu |
