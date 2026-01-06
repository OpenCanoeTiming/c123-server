# C123 Server - Plán a stav projektu

## Vize

**C123 Server** = štíhlá mezivrstva předávající **autentická data z C123** scoreboardům.

- Scoreboard pracuje přímo s nativními C123 daty (ne CLI formátem)
- Server nemodifikuje data, pouze je parsuje a předává
- XML soubor slouží jako sekundární zdroj pro historická/doplňková data

---

## Stav projektu: FUNKČNÍ ✅

Server je kompletně implementovaný a funkční. Všechny plánované fáze (7-15) dokončeny.

### Co je hotovo

| Oblast | Popis |
|--------|-------|
| **TCP/UDP** | Připojení k C123 na :27333, reconnect logika, UDP discovery |
| **WebSocket** | Real-time stream pro scoreboardy na `/ws` |
| **REST API** | XML data, konfigurace klientů, status |
| **Admin UI** | Dashboard na `/`, správa klientů, log viewer |
| **XML polling** | Auto/manual/URL režimy, file watcher |
| **Client config** | Remote konfigurace scoreboardů přes ConfigPush |

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
| **C123 Server** | 27123 | HTTP + WS + API |

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
- Detaily: `docs/C123-PROTOCOL.md`, `docs/INTEGRATION.md`

### Current="Y"

- Označuje aktuálně jedoucí kategorii v Results
- Klíčové pro sledování flow závodu

---

## Dokumentace

| Soubor | Účel |
|--------|------|
| `docs/C123-PROTOCOL.md` | WebSocket protokol, typy zpráv |
| `docs/REST-API.md` | REST endpointy |
| `docs/INTEGRATION.md` | Návod pro integrátory |
| `docs/CLIENT-CONFIG.md` | Remote konfigurace klientů |
| `docs/SCOREBOARD-REQUIREMENTS.md` | Požadavky na scoreboard |
| `docs/CLI-DIFFERENCES.md` | Rozdíly oproti CLI verzi |

---

## TODO: Revize dokumentace

Před delší pauzou v projektu je třeba zkontrolovat a doplnit dokumentaci.

### Krok 1: Kontrola REST-API.md ✅
- [x] Ověřit všechny endpointy vs skutečná implementace
- [x] Zkontrolovat response formáty
- [x] Doplnit chybějící endpointy (Configuration API, Event API, Logs API)
- [x] Aktualizovat GET /api/clients o nová pole (configKey, hasExplicitId, sessionCount, ipAddress)

### Krok 2: Kontrola C123-PROTOCOL.md ✅
- [x] Ověřit typy WS zpráv vs kód
- [x] Zkontrolovat formáty dat
- [x] Doplnit příklady
- [x] Přidat dokumentaci LogEntry zprávy (chyběla)
- [x] Opravit XmlChange sections (StartList → Participants)
- [x] Opravit OnCourse time/total formát (centisekundy jako string)
- [x] Přidat tabulku Result Row Fields včetně BR1/BR2 polí

### Krok 3: Revize INTEGRATION.md ✅
- [x] Aktualizovat quick start (přidán clientId příklad)
- [x] Ověřit BR1/BR2 sekci (implementace odpovídá dokumentaci)
- [x] Přidat troubleshooting (Connection, Data, Config issues + Debugging Tips)

### Krok 4: Stav projektu README ✅
- [x] Vytvořit/aktualizovat README.md s přehledem
- [x] Instalace a spuštění
- [x] Základní použití

### Krok 5: Konzistence ✅
- [x] Cross-reference mezi dokumenty
- [x] Sjednotit terminologii
- [x] Odstranit zastaralé informace

**Změny provedené:**
- README.md: Přidány chybějící odkazy na CLIENT-CONFIG.md a SCOREBOARD-REQUIREMENTS.md
- SCOREBOARD-REQUIREMENTS.md: Opraveny špatné porty (8084 → 27123)
- SCOREBOARD-REQUIREMENTS.md: Opraveny jednotky času (milliseconds → centiseconds)
- INTEGRATION.md: Opraven odkaz na neexistující discovery-client.ts

---

## TODO: Asset management

Centrální správa obrázků (logo, partneři, footer) s distribucí přes ConfigPush.

### Blok A1: Centrální assets konfigurace ✅

#### A1.1 Server config ✅
- [x] Přidat `defaultAssets` do server config
  - `logoUrl?: string` - hlavní logo
  - `partnerLogoUrl?: string` - logo partnerů
  - `footerImageUrl?: string` - sponzorský banner
- [x] Podpora formátů: URL (`http://...`) nebo data URI (`data:image/...`)

#### A1.2 ConfigPush integrace ✅
- [x] Automatické posílání assets v ConfigPush všem klientům při připojení
- [x] Per-client override v client config (přepíše default)
- [x] Merge logika: Per-client > Global default > Neposlat (scoreboard fallback)

#### A1.3 Persistentní ukládání ✅
- [x] Uložit default assets do `settings.json`
- [x] Per-client assets v client configs

---

### Blok A2: Admin UI - Asset helper ✅

#### A2.1 Upload/input komponenta ✅
- [x] Upload/paste obrázku → automatická konverze do base64
- [x] URL input → fetch a převod do base64 (pro offline použití)
- [x] Drag & drop podpora

#### A2.2 Automatický resize ✅
- [x] Canvas-based resize na přiměřené rozlišení:
  - Logo: max 200x80px
  - Partners: max 300x80px
  - Footer: max 1920x200px
- [x] Zachování aspect ratio
- [x] Output jako PNG nebo JPEG dle původního formátu

#### A2.3 Preview a validace ✅
- [x] Preview před uložením
- [x] Validace velikosti (varování při >100KB base64)
- [x] Zobrazení aktuální velikosti v KB

#### A2.4 UI integrace ✅
- [x] Sekce "Default Assets" v admin dashboardu
- [x] Per-client asset overrides v client config panelu
- [x] Clear/reset tlačítko pro návrat k defaults

---

### Review Fáze A (6.1.2026)

**Celkové hodnocení: ✅ Implementace kompletní, ✅ Dokumentace kompletní**

#### Co je implementováno a funguje

| Oblast | Stav | Poznámka |
|--------|------|----------|
| **A1.1 Server config** | ✅ | `AssetUrls` typ v `src/config/types.ts`, podpora URL i data URI |
| **A1.2 ConfigPush integrace** | ✅ | Merge logika per-client > global v `ScoreboardSession.getEffectiveAssets()` |
| **A1.3 Persistentní ukládání** | ✅ | Kompletní API v `AppSettingsManager` (get/set/clear default i per-client) |
| **A2.1 Upload/input** | ✅ | Drag&drop, paste, file input, URL fetch |
| **A2.2 Auto resize** | ✅ | Canvas-based resize (200x80, 300x80, 1920x200) |
| **A2.3 Preview/validace** | ✅ | Preview s rozměry, warning při >500KB |
| **A2.4 UI integrace** | ✅ | Default Assets sekce + per-client overrides v modalu |

#### REST API endpointy (implementovány, ale nezdokumentovány)

| Endpoint | Metoda | Účel |
|----------|--------|------|
| `/api/config/assets` | GET | Získání default assets |
| `/api/config/assets` | PUT | Nastavení (partial update) |
| `/api/config/assets/:key` | DELETE | Smazání konkrétního assetu |

#### Testy

- ✅ Všech 443 testů prošlo
- ✅ Assets API testy v `UnifiedServer.test.ts`

#### Zjištěné nedostatky v dokumentaci (opraveno ✅)

| Dokument | Chybělo | Stav |
|----------|---------|------|
| `docs/REST-API.md` | Celá sekce "Assets API" s endpointy | ✅ Doplněno |
| `docs/CLIENT-CONFIG.md` | Zmínka o `assets` poli v ConfigPush | ✅ Doplněno |
| `docs/C123-PROTOCOL.md` | Dokumentace `assets` v ConfigPush zprávě | ✅ Doplněno |

### Doplnění dokumentace ✅

#### Krok A3.1: Doplnit REST-API.md ✅

- [x] Přidat sekci "Assets API" s endpointy GET/PUT/DELETE
- [x] Dokumentovat formát AssetUrls (logoUrl, partnerLogoUrl, footerImageUrl)
- [x] Příklady požadavků a odpovědí

#### Krok A3.2: Doplnit CLIENT-CONFIG.md ✅

- [x] Přidat `assets` pole do ConfigPush dokumentace
- [x] Příklad ConfigPush s assets
- [x] Vysvětlit merge logiku (per-client > global > fallback)

#### Krok A3.3: Doplnit C123-PROTOCOL.md ✅

- [x] Přidat `assets` do ConfigPush message dokumentace

---

## Blok A4: Parametr scrollToFinished ✅

**Přidáno:** 2026-01-06

### Popis

Přidán nový konfigurovatelný parametr `scrollToFinished` pro scoreboardy:
- Typ: `boolean` (výchozí: `true`)
- Účel: Ovládá, zda se scoreboard automaticky scrolluje na pozici závodníka po dojetí
- Když je `false`, závodník je pouze zvýrazněn bez automatického scrollu

### Implementace

| Soubor | Změna |
|--------|-------|
| `src/config/types.ts` | Přidán `scrollToFinished?: boolean` do ClientConfig |
| `src/unified/UnifiedServer.ts` | Validace boolean + checkbox v admin UI |
| `src/ws/ScoreboardSession.ts` | Přidání do ConfigPush dat |
| `docs/CLIENT-CONFIG.md` | Dokumentace parametru |

### Použití

V admin dashboard je nový checkbox "Scroll to Finished" v konfiguraci klienta.

---

## Reference

| Zdroj | Popis |
|-------|-------|
| `../analysis/07-sitova-komunikace.md` | C123 protokol analýza |
| `../analysis/captures/*.xml` | XML struktura příklady |
| `../analysis/recordings/*.jsonl` | Timing analýza |
| Tag `v1.0.0-cli` | Archivovaná CLI-kompatibilní verze |
