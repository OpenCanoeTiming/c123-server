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
│  │ TcpSource    │──────▶│              │       │  WebSocket   │    │
│  │   :27333     │       │  C123Proxy   │──────▶│   :27084     │───▶│ Scoreboardy
│  ├──────────────┤       │ (XML → JSON) │       └──────────────┘    │
│  │ UdpDiscovery │──────▶│              │                           │
│  │   :27333     │       └──────────────┘       ┌──────────────┐    │
│  └──────────────┘                              │  REST API    │    │
│                                                │   :8084      │───▶│ Web clients
│  ┌──────────────┐       ┌──────────────┐       └──────────────┘    │
│  │ XmlSource    │──────▶│  XmlService  │──────────────┘            │
│  │ (file/URL)   │       │ (API + push) │                           │
│  └──────────────┘       └──────────────┘                           │
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
C123 (Canoe123) ──TCP:27333──▶ C123 Server ──WS:27084──▶ Scoreboard

Formát: pipe-delimited XML fragmenty
Transformace: XML parsing → JSON objekty (zachování struktury)
```

### 2. XML databáze (file)
```
C123 XML soubor ──watch/poll──▶ C123 Server ──REST/WS──▶ Web clients

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

- [x] WebSocket kanál `/ws/xml` pro změny (XmlWebSocketServer na portu 27085)
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
| **C123** | 27333 | Existující (TCP + UDP) |
| **C123 Server WS** | 27084 | Real-time data |
| **C123 Server API** | 8084 | REST + Admin |

---

## Reference

- `../analysis/07-sitova-komunikace.md` - C123 protokol
- `../analysis/captures/xboardtest02_jarni_v1.xml` - XML struktura
- `../analysis/recordings/rec-2025-12-28T09-34-10.jsonl` - timing analýza
- Tag `v1.0.0-cli` - předchozí CLI-kompatibilní verze
