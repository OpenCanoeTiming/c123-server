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

#### 9.1 C123 protokol dokumentace ⏱️ ~1 session
**Výstup:** `docs/C123-PROTOCOL.md`

- [ ] Popis všech C123 zpráv (TimeOfDay, OnCourse, Results, ...)
- [ ] Timing chování (frekvence, rotace Results)
- [ ] Struktura atributů s příklady
- [ ] Detekce dojetí (dtFinish logika)
- [ ] RaceId formát a význam Current atributu

#### 9.2 REST API dokumentace ⏱️ ~1 session
**Výstup:** `docs/REST-API.md`

- [ ] Všechny endpoints s příklady
- [ ] Request/response formáty
- [ ] Error handling
- [ ] WebSocket change notifications

#### 9.3 Odlišnosti od CLI ⏱️ ~1 session
**Výstup:** `docs/CLI-DIFFERENCES.md`

Pro migrace z CLI na C123 Server:

| CLI | C123 Server | Poznámka |
|-----|-------------|----------|
| `msg: "top"` | `type: "Results"` | Žádný HighlightBib, RaceStatus |
| `msg: "oncourse"` | `type: "OnCourse"` | Surová data, žádný "comp" |
| `msg: "comp"` | Není | Scoreboard si určí sám |
| `HighlightBib` | Není | Scoreboard sleduje dtFinish |
| `RaceStatus` | `Current` atribut | Y/N místo číselného stavu |

- [ ] Kompletní mapování CLI → C123 formát
- [ ] Co musí scoreboard implementovat sám
- [ ] Příklady kódu pro adaptaci

---

### Fáze 10: Podklady pro scoreboard (pouze dokumentace)

*Implementace scoreboardu je mimo scope tohoto projektu.*

#### 10.1 Integration guide
**Výstup:** `docs/INTEGRATION.md`

- [ ] Jak se připojit k WebSocket
- [ ] Jak používat REST API
- [ ] Doporučená architektura klienta
- [ ] Příklady v JS/TS

#### 10.2 Scoreboard requirements
**Výstup:** `docs/SCOREBOARD-REQUIREMENTS.md`

Co musí scoreboard implementovat:
- [ ] Finish detection (sledování dtFinish)
- [ ] BR1/BR2 merge logika
- [ ] Results filtering (Current vs historické)
- [ ] OnCourse → aktuální závodník

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
