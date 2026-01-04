# Plán: C123 Server v2 - Lean Data Proxy

## Vize

**C123 Server** = štíhlá mezivrstva předávající **autentická data z C123** s minimální transformací.

Předchozí verze (v1.0.0-cli) emulovala CLI rozhraní. Nový přístup se zbavuje CLI závislosti - scoreboard bude pracovat přímo s autentickými C123 daty.

---

## Architektura v2

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server v2                              │
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
│  └──────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Klíčové principy

1. **Autentická data** - žádná emulace CLI, předáváme co přijde z C123
2. **XML → JSON parsing** - C123 posílá pipe-delimited XML fragmenty, parsujeme je na JSON objekty se zachováním původní struktury atributů
3. **XML soubor jako samostatná služba** - REST API nad XML databází, nezávislé na real-time streamu
4. **Scoreboard se adaptuje** - práce s nativními C123 daty, ne s CLI formátem

---

## Chování C123 (z analýzy nahrávky)

### Typy zpráv a jejich frekvence

| Zpráva | Frekvence | Popis |
|--------|-----------|-------|
| **TimeOfDay** | ~1× za sekundu | Heartbeat, aktuální čas |
| **OnCourse** | Vícekrát za sekundu | Závodníci na trati, aktualizuje se při každé změně |
| **RaceConfig** | ~20 sekund | Konfigurace aktuální kategorie |
| **Schedule** | ~40 sekund | Rozpis všech závodů |
| **Results** | Nepravidelně | Výsledky, rotují se různé kategorie |
| **TVS** | Občasně | Time Video Sync |

### Rotace Results

C123 rotuje výsledky různých kategorií. Atribut `Current="Y"` označuje aktuálně jedoucí kategorii:

```
ts=26971  RaceId=K1W_ST_BR1_7  Current=N  (historické)
ts=57129  RaceId=C1M_ST_BR2_7  Current=N  (historické)
ts=62985  RaceId=K1M_ST_BR2_6  Current=Y  (aktuální závod!)
ts=87253  RaceId=K1W_ST_BR2_7  Current=N  (historické)
...
```

### Detekce dojetí

Závodník dojel = `dtFinish` přechází z prázdného řetězce na timestamp:
- Před dojetím: `dtFinish=""`
- Po dojetí: `dtFinish="2025-01-02T10:30:45"`

Závodník zůstává v OnCourse ~4 sekundy po dojetí, pak zmizí.

---

## Datové toky

### 1. Real-time C123 stream (TCP)
```
C123 (Canoe123) ──TCP:27333──▶ C123 Server ──WS:27123/ws──▶ Scoreboard

Formát: pipe-delimited XML fragmenty
Transformace: XML parsing → JSON objekty (zachování struktury)
```

### 2. XML databáze (file)
```
C123 XML soubor ──watch/poll──▶ C123 Server ──REST:27123/api──▶ Web clients
                                            ──WS:27123/ws────▶ (XmlChange notifikace)

Přístupy (Windows priorita):
- Lokální cesta: fs.watch() nebo chokidar (Windows NTFS events)
- SMB síťová cesta: polling (ReadDirectoryChangesW nefunguje přes síť)
- HTTP/HTTPS URL: polling s ETag/Last-Modified
```

---

## Archivovaná verze (v1.0.0-cli)

<details>
<summary>CLI-kompatibilní implementace - DOKONČENO</summary>

### Fáze 0-6: Kompletní implementace ✅

Verze tagovaná jako `v1.0.0-cli` obsahuje:
- TcpSource, UdpDiscovery, XmlFileSource
- EventState s BR1/BR2 mergováním
- MessageFormatter s CLI-kompatibilním formátem
- WebSocketServer emitující top/oncourse/comp zprávy
- AdminServer s dashboard UI
- 148 unit testů

Tato verze funguje, ale zavádí zbytečnou závislost na CLI formátem.

</details>

---

## Nové fáze implementace

Každý krok (7.1, 7.2, ...) je navržen tak, aby se dal zvládnout v rámci **jednoho Claude Code session**.

---

### Fáze 7: Čistý C123 protokol

#### 7.1 Nové typy a protokol ✅
**Vstup:** Analýza C123 XML formátu
**Výstup:** `src/protocol/` s novými typy

- [x] Vytvořit `src/protocol/types.ts`
- [x] Definovat zprávy: `TimeOfDay`, `OnCourse`, `Results`, `Schedule`, `RaceConfig`
- [x] Zachovat strukturu atributů z XML (Bib, Name, Time, dtFinish, ...)
- [x] Přidat envelope s metadaty: `{ type, timestamp, data }`
- [x] Unit testy

#### 7.2 Refaktoring na čistý passthrough ✅
**Vstup:** Nové typy z 7.1
**Výstup:** Zjednodušený server bez CLI logiky

- [x] Odstranit MessageFormatter (CLI formát)
- [x] Odstranit CLI-specifické typy (top, oncourse, comp)
- [x] EventState zůstává pro finish detection, ale neposílá se celý stav
- [x] WebSocket posílá přímo parsované C123 zprávy s envelope
- [x] Aktualizovat testy (157 testů)

#### 7.3 Cleanup a reorganizace ✅
**Vstup:** Refaktorovaný kód z 7.2
**Výstup:** Čistá struktura projektu

- [x] Smazat nepoužívaný CLI kód
- [x] Reorganizovat adresáře (output/ → ws/, parsers/ → protocol/)
- [x] Aktualizovat importy
- [x] Ověřit všechny testy (157 testů)

---

### Fáze 8: XML REST API

#### 8.1 Základní XML REST ✅
**Vstup:** Existující XmlFileSource
**Výstup:** REST endpoints v AdminServer

- [x] `GET /api/xml/status` - je XML dostupné, checksum, timestamp
- [x] `GET /api/xml/schedule` - rozpis závodů (RaceList)
- [x] `GET /api/xml/participants` - všichni závodníci
- [x] XmlDataService s cachováním a validací
- [x] Unit testy (14 testů)

#### 8.2 Results a Startlists API ✅
**Vstup:** REST základ z 8.1
**Výstup:** Kompletní race endpoints

- [x] `GET /api/xml/races` - seznam závodů (id, name, status)
- [x] `GET /api/xml/races/:id` - detail závodu
- [x] `GET /api/xml/races/:id/startlist` - startovka závodu
- [x] `GET /api/xml/races/:id/results` - výsledky (obě jízdy)
- [x] `GET /api/xml/races/:id/results/:run` - BR1 nebo BR2
- [x] Query params: `?merged=true` pro spojené výsledky
- [x] Unit testy (25 testů pro XmlDataService)

#### 8.3 Windows file monitoring ✅
**Vstup:** Existující XmlFileSource
**Výstup:** Optimalizovaný file watcher pro Windows

- [x] Použít `chokidar` pro cross-platform watching
- [x] Windows: využívá ReadDirectoryChangesW (NTFS events)
- [x] Fallback na polling pro síťové cesty (SMB)
- [x] Konfigurovatelný polling interval
- [x] Debounce pro rapid changes (C123 píše často)
- [x] Unit testy (10 testů pro FileWatcher)

#### 8.4 XML change notifications ✅
**Vstup:** File watcher z 8.3
**Výstup:** Push notifikace pro změny

- [x] WebSocket notifikace pro změny (původně XmlWebSocketServer :27085, nyní součást UnifiedServer /ws)
- [x] Message: `{ type: "XmlChange", data: { sections, checksum }, timestamp }`
- [x] Klient si stáhne změněná data přes REST
- [x] Diff detection (XmlChangeNotifier s per-section MD5 hash)
- [x] Unit testy (23 testů pro XmlChangeNotifier a XmlWebSocketServer)

---

### Fáze 9: Dokumentace (podklady pro scoreboard)

#### 9.1 C123 protokol dokumentace ✅
**Výstup:** `docs/C123-PROTOCOL.md`

- [x] Popis všech C123 zpráv (TimeOfDay, OnCourse, Results, ...)
- [x] Timing chování (frekvence, rotace Results)
- [x] Struktura atributů s příklady
- [x] Detekce dojetí (dtFinish logika)
- [x] RaceId formát a význam Current atributu

#### 9.2 REST API dokumentace ✅
**Výstup:** `docs/REST-API.md`

- [x] Všechny endpoints s příklady
- [x] Request/response formáty
- [x] Error handling
- [x] WebSocket change notifications

#### 9.3 Odlišnosti od CLI ✅
**Výstup:** `docs/CLI-DIFFERENCES.md`

Pro migrace z CLI na C123 Server:

| CLI | C123 Server | Poznámka |
|-----|-------------|----------|
| `msg: "top"` | `type: "Results"` | Žádný HighlightBib, RaceStatus |
| `msg: "oncourse"` | `type: "OnCourse"` | Surová data, žádný "comp" |
| `msg: "comp"` | Není | Scoreboard si určí sám |
| `HighlightBib` | Není | Scoreboard sleduje dtFinish |
| `RaceStatus` | `Current` atribut | Y/N místo číselného stavu |

- [x] Kompletní mapování CLI → C123 formát
- [x] Co musí scoreboard implementovat sám
- [x] Příklady kódu pro adaptaci

---

### Fáze 10: Podklady pro scoreboard (pouze dokumentace)

*Implementace scoreboardu je mimo scope tohoto projektu.*

#### 10.1 Integration guide ✅
**Výstup:** `docs/INTEGRATION.md`

- [x] Jak se připojit k WebSocket
- [x] Jak používat REST API
- [x] Doporučená architektura klienta
- [x] Příklady v JS/TS

#### 10.2 Scoreboard requirements ✅
**Výstup:** `docs/SCOREBOARD-REQUIREMENTS.md`

Co musí scoreboard implementovat:
- [x] Finish detection (sledování dtFinish)
- [x] BR1/BR2 merge logika
- [x] Results filtering (Current vs historické)
- [x] OnCourse → aktuální závodník

---

### Fáze 11: Konsolidace portů

Sloučení všech služeb (Admin, WS, REST) na jeden port 27123 pro jednodušší deployment a konfiguraci.

#### 11.1 Refaktoring serverové architektury ✅
**Vstup:** Oddělené servery (AdminServer :8084, WebSocketServer :27084, XmlWebSocketServer :27085)
**Výstup:** Jeden UnifiedServer na portu 27123

- [x] Vytvořit `src/unified/UnifiedServer.ts` - jeden HTTP server s Express
- [x] Integrace WebSocket upgrade na path `/ws` (real-time C123 data)
- [x] Integrace REST API na path `/api/*`
- [x] Admin dashboard (statické soubory) na root `/`
- [x] XML WebSocket notifikace přesunout na `/ws` (type: XmlChange)
- [x] Unit testy (23 testů)

#### 11.2 Odstranění starých serverů ✅
**Vstup:** Fungující UnifiedServer z 11.1
**Výstup:** Čistá architektura bez duplicit

- [x] Deprecovat `AdminServer` (sloučeno do UnifiedServer)
- [x] Deprecovat `WebSocketServer` (sloučeno)
- [x] Deprecovat `XmlWebSocketServer` (sloučeno)
- [x] Aktualizovat `Server.ts` orchestraci - nyní používá pouze UnifiedServer
- [x] Aktualizovat testy - všechny testy aktualizovány na nový port model (236 testů)

#### 11.3 Konfigurace a environment ✅
**Vstup:** UnifiedServer
**Výstup:** Konfigurabilní port s rozumným default

- [x] Default port: 27123
- [x] Env variable: `C123_SERVER_PORT` nebo `PORT`
- [x] CLI argument: `--server-port` (již existoval)
- [x] Aktualizovat `AppSettings` pro persistenci
- [x] Aktualizovat admin dashboard UI pro zobrazení správného portu

#### 11.4 Aktualizace dokumentace ✅
**Vstup:** Fungující konsolidovaný server
**Výstup:** Aktualizovaná dokumentace všude

- [x] `CLAUDE.md` - sekce Porty (již správně)
- [x] `PLAN.md` - sekce Porty (již aktualizováno)
- [x] `docs/REST-API.md` - Base URL, všechny příklady (již správně)
- [x] `docs/INTEGRATION.md` - všechny porty a příklady kódu (již správně)
- [x] `docs/C123-PROTOCOL.md` - opravena zmínka o /ws/xml na /ws
- [x] `README.md` - kompletně přepsáno pro v2 architekturu

---

### Fáze 12: Autodiscovery

Automatické nalezení c123-server ve stejné síti pro scoreboard aplikace.

#### Principy

1. **Server se identifikuje** - discovery endpoint s CORS
2. **Scoreboard hledá** - HTTP scan začínající od vlastní IP
3. **Cache** - pamatovat si poslední nalezený server
4. **Fallback** - URL parametr jako dosud (`?server=192.168.1.50:27123`)

#### 12.1 Discovery endpoint na serveru ✅
**Vstup:** UnifiedServer z fáze 11
**Výstup:** Identifikační endpoint

- [x] `GET /api/discover` endpoint
  ```json
  {
    "service": "c123-server",
    "version": "2.0.0",
    "port": 27123,
    "eventName": "Český pohár 2025"  // z XML pokud dostupné
  }
  ```
- [x] CORS hlavičky pro `/api/discover`:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  ```
- [x] Rychlá odpověď (< 50ms) - žádné I/O blokování
- [x] Unit testy

#### 12.2 Discovery utilita pro scoreboard ✅
**Výstup:** `docs/discovery-client.ts` - referenční implementace

Algoritmus:
1. Zkontrolovat URL parametr `?server=` → použít přímo
2. Zkontrolovat `localStorage['c123-server-url']` → ověřit dostupnost
3. Zjistit IP odkud je scoreboard hostován (nebo WebRTC pro lokální IP)
4. Scanovat subnet začínající od této IP (nejprve .1, pak okolní)
5. Při nalezení uložit do localStorage

- [x] Referenční TypeScript implementace v docs/
- [x] `getLocalIPViaWebRTC()` - zjištění IP pomocí WebRTC
- [x] `getHostingServerIP()` - zjištění IP z `location.hostname`
- [x] `scanSubnet()` - paralelní fetch s 200ms timeout, optimalizované pořadí
- [x] `discoverC123Server()` - orchestrace celého flow s options
- [x] Optimalizace: prioritní IP adresy (.1, .2, .10, .100, ...)

#### 12.3 Aktualizace dokumentace ✅
**Výstup:** Aktualizovaná dokumentace

- [x] `docs/INTEGRATION.md` - sekce Discovery (odkaz na discovery-client.ts)
- [x] Příklady kódu pro scoreboard implementaci (v discovery-client.ts)
- [x] Popis fallback mechanismů (URL param → cache → subnet scan)

---
## Dodatecna zjisteni a ukoly

 - [x] Kešují se XML data, nebo každý dotaz na API vede na čtení XML?
   - **Ano, kešují se.** `XmlDataService` drží parsed XML v `cachedData`.
   - Metoda `loadIfNeeded()` kontroluje `mtime` souboru - pokud se nezměnil, vrací keš.
   - Při změně `mtime` se soubor znovu načte a naparsuje.
 - [x] přikládám komplexní XML  závod LODM včetně cross a dalších disciplin sem do slozky - pro zobecnění rozhraní
   - **Analyzováno.** Soubor `2024-LODM-fin.xml` (2.5 MB) obsahuje komplexní závod.
   - Nové disciplíny Cross: X4 (čtvrtfinále), XS (semi), XF (finále), XT (time trial), XER (extended results)
   - Nové atributy Results: `HeatNr`, `RoundNr`, `NrFLT`, `FLT` (pro Cross)
   - Týmové soutěže: `Member1`, `Member2`, `Member3`, `NOC`
   - **Rozhraní není třeba měnit** - REST API předává raw data, scoreboard si vytáhne co potřebuje.
   - XML přidán do `.gitignore` (velký soubor, testovací data)
   - [x] není potřeba s ohledem na zištěné disciplíny a typy jízd měnit REST API nebo něco kolem BR1/BR2 merge logika ? Pokud ano, proveď. Možná jen poznámka že BR je BetterRun, tedy lepší ze dvou jízd, což je v CZ oblíbený model, ale má problém při zobrazení výsledku na scoreboardu z ntivních C123 dat. Jiné typy soutěží by problém mít neměly.
     - **Vyřešeno dokumentací.** REST API není třeba měnit - předává raw data, scoreboard si vytáhne co potřebuje.
     - Doplněno do `docs/SCOREBOARD-REQUIREMENTS.md` a `docs/CLI-DIFFERENCES.md`:
       - Vysvětlení BR = BetterRun (nejlepší ze dvou jízd)
       - Popis problému při zobrazení na scoreboardu během BR2
       - Tabulka dalších typů soutěží (Cross X4/XS/XF, Time Trial XT) které problém nemají
       - Doporučení: použít REST API merge endpoint pro správné celkové pořadí 
 - [x] `EventState` zůstává pro detekci dojetí a sledování závodů -- není to nějaký relikt principu CLI nebo to je v C123 rozhraní ok?
   - **Není relikt CLI.** EventState poskytuje užitečné funkce pro C123 protokol:
   - **Finish detection:** Detekuje přechod `dtFinish` z prázdného na timestamp, emituje `finish` event
   - **Race tracking:** Sleduje `currentRaceId` z OnCourse zpráv, filtruje rotující Results
   - **Results filtering:** C123 posílá Results různých kategorií, EventState přijímá pouze `Current=Y` nebo odpovídající currentRaceId
   - **Schedule fingerprint:** Detekuje změnu závodu pro reset cache
   - Tyto funkce zůstávají v serveru, scoreboard dostává již filtrovaná data
 
 - [x] Rozvinutý autoconfig: c123 server na windows provede detekci aktuálního XML a nastaví ho
   - `WindowsConfigDetector` hledá v `%LOCALAPPDATA%\SIWIDATA\Canoe123.exe_Url_*\<version>\user.config`
   - Parsuje `CurrentEventFile` a `AutoCopyFolder` z XML konfigurace
   - Preferuje AutoCopyFolder + filename (offline kopie), fallback na CurrentEventFile
   - Periodické monitorování změn (výchozí: 30s interval)
   - Admin dashboard zobrazuje aktuální cestu, source (manual/autodetect), umožňuje přepínání
   - API: `GET /api/config/xml`, `POST /api/config/xml`, `POST /api/config/xml/autodetect`

 - [x] persistentní nastavení na Windows: služba/aplikace na windows si uchová nastavení i přes vypnutí/restart
   - `AppSettingsManager` ukládá settings do JSON souboru:
     - Windows: `%APPDATA%\c123-server\settings.json`
     - Linux/macOS: `~/.c123-server/settings.json`
   - Ukládá: xmlPath (ruční), xmlAutoDetect, xmlAutoDetectInterval, lastAutoDetectedPath
   - Server.initFromSettings() načítá nastavení při startu
   - Každá změna se automaticky ukládá

---

## Formát zpráv v2

### WebSocket (real-time C123 data)

```json
{
  "type": "TimeOfDay",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": {
    "Time": "10:30:45"
  }
}
```

```json
{
  "type": "OnCourse",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": {
    "runners": [
      {
        "Bib": "9",
        "Name": "PRSKAVEC Jiří",
        "Time": "8115",
        "dtFinish": "",
        "StartOrder": "9",
        "StartTime": "10:30:00"
      }
    ]
  }
}
```

```json
{
  "type": "Results",
  "timestamp": "2025-01-02T10:30:46.456Z",
  "data": {
    "RaceId": "K1M_ST_BR2_6",
    "ClassId": "K1M_ST",
    "Current": "Y",
    "MainTitle": "K1m - střední trať",
    "SubTitle": "2nd Run",
    "rows": [
      {
        "Number": "1",
        "Participant": {
          "Bib": "1",
          "Name": "PRSKAVEC Jiří",
          "Club": "USK Praha"
        },
        "Result": {
          "Time": "78.99",
          "Pen": "2",
          "Total": "80.99",
          "Rank": "1"
        }
      }
    ]
  }
}
```

### WebSocket (XML změny)

```json
{
  "type": "xml-change",
  "timestamp": "2025-01-02T10:31:00.000Z",
  "sections": ["Results", "StartList"]
}
```

---

## Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| **C123** | 27333 | Upstream Canoe123 (TCP + UDP), nelze měnit |
| **C123 Server** | 27123 | Jeden port pro vše (HTTP + WS) |

### Struktura endpointů na portu 27123

```
http://server:27123/       → Admin dashboard (SPA)
ws://server:27123/ws       → WebSocket pro scoreboardy (real-time C123 data)
http://server:27123/api/*  → REST API (status, config, XML data)
```

**Zdůvodnění:**
- Jeden port = jednodušší firewall, CORS, deployment
- Port 27123 je mnemotechnický (C-1-2-3)
- Sousední s C123 protokolem (27333)
- IANA unassigned - žádné konflikty

---

### Fáze 13: Admin vylepšení a UX

#### 13.1 XML source selector - 3 režimy ✅
**Vstup:** Současný autodetect (pouze offline kopie)
**Výstup:** Rozšířené možnosti výběru XML souboru

Tři režimy:
1. **auto main** - hlavní event file (`CurrentEventFile` z C123 konfigurace)
2. **auto offline** - offline kopie (`AutoCopyFolder` + filename) - současný default
3. **manual** - uživatel zadá cestu ručně

- [x] Rozšířit `WindowsConfigDetector` o extrakci obou cest (main + offline)
  - `getAvailablePaths()` - vrací obě cesty s informací o existenci
  - `detectByMode(mode)` - detekce podle zvoleného režimu
- [x] Přidat typ `XmlSourceMode`: `'auto-main' | 'auto-offline' | 'manual'`
- [x] Upravit `AppSettings` pro ukládání zvoleného režimu
  - `setXmlSourceMode(mode)` - nastaví režim
  - `getXmlSourceMode()` - vrátí aktuální režim
- [x] REST API: rozšířit `GET /api/config/xml` o `availablePaths` (main, offline) a `mode`
- [x] REST API: rozšířit `POST /api/config/xml` o parametr `mode`
- [x] Admin UI: radio buttons pro výběr režimu, zobrazení obou cest s existencí
- [x] Unit testy (11 nových testů)

#### 13.2 Event name management ✅
**Vstup:** Částečná detekce event name
**Výstup:** Správná detekce + manuální override + API

XML struktura: `<Events><MainTitle>` obsahuje název akce (např. "Jarní slalomy 2024")

- [x] Analyzovat XML strukturu pro správný event name (název akce)
  - Element `<Events><MainTitle>` obsahuje název
  - `XmlDataService.getEventName()` již existuje a extrahuje správně
- [x] Přidat `eventNameOverride` do `AppSettings` pro manuální přepsání
  - `setEventNameOverride(name)`, `getEventNameOverride()`, `clearEventNameOverride()`
  - Persists do settings.json
- [x] REST API: `GET /api/event` - vrací { name, source: 'xml' | 'manual' | null }
- [x] REST API: `POST /api/event` - nastaví manuální override, `{ name: null }` vymaže
- [x] Upravit `/api/discover` - použije override pokud nastaven, jinak XML
- [x] Admin UI: sekce Event s event name, source, input pro override, tlačítka Set/Clear
- [x] Unit testy (6 nových testů)

#### 13.3 Force refresh signál pro klienty ✅
**Vstup:** WebSocket komunikace
**Výstup:** Mechanismus pro vynucení refreshe klientů

Use case: Admin chce vynutit reload všech připojených scoreboardů.

- [x] Definovat WS zprávu `{ type: "ForceRefresh", timestamp, data: { reason? } }`
- [x] Admin UI: tlačítko "Refresh All Clients" v sekci Connected Scoreboards
- [x] REST API: `POST /api/broadcast/refresh` - trigger force refresh
- [x] Scoreboard dokumentace: jak reagovat na ForceRefresh (C123-PROTOCOL.md, INTEGRATION.md, REST-API.md)
- [x] Unit testy (11 nových testů pro ForceRefresh funkcionalitu)

#### 13.4 Log viewer v admin UI ✅
**Vstup:** Console output aplikace
**Výstup:** Zobrazení logů v admin dashboard

- [x] Implementovat in-memory ring buffer pro logy (posledních N záznamů)
  - `LogBuffer` class s ring buffer implementací
  - Globální instance přes `getLogBuffer()`
  - Podpora filtrování, offsetu, limitu
- [x] REST API: `GET /api/logs` - vrací posledních N log entries
  - Query params: `limit`, `offset`, `level`, `levels`, `search`, `order`
  - Vrací `{ entries, total, limit, offset, bufferSize }`
- [x] WebSocket: `{ type: "LogEntry", data: { level, component, message, data?, timestamp } }`
  - Broadcast přes `Logger.setBroadcastCallback()`
  - Automaticky se odesílá při každém logu
- [x] Admin UI: log viewer panel (scrollable, auto-update)
  - WebSocket připojení pro real-time logy
  - Initial load přes REST API
  - Auto-scroll, max 200 entries v UI
- [x] Filtry: level (debug, info, warn, error), search
  - Checkboxy pro jednotlivé úrovně
  - Textové vyhledávání v component/message
  - Clear tlačítko
- [x] Unit testy (19 nových testů pro LogBuffer a API)

#### 13.5 README aktualizace
**Vstup:** Zastaralý README.md
**Výstup:** Aktuální dokumentace pro deployment

- [ ] Přepsat Quick Start sekci
- [ ] Aktualizovat Installation (npm, binary, Docker?)
- [ ] Přepsat Configuration sekci (env variables, settings.json)
- [ ] Deployment instrukce pro Windows
- [ ] Deployment instrukce pro Linux/Docker (optional)
- [ ] Troubleshooting sekce (firewall, porty, ...)
- [ ] Screenshots admin UI (optional)

---

## Reference

- `../analysis/07-sitova-komunikace.md` - C123 protokol
- `../analysis/captures/xboardtest02_jarni_v1.xml` - XML struktura
- `../analysis/recordings/rec-2025-12-28T09-34-10.jsonl` - timing analýza
- Tag `v1.0.0-cli` - předchozí CLI-kompatibilní verze
