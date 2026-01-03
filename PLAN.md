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
│  ├──────────────┤       │              │       └──────────────┘    │
│  │ UdpDiscovery │──────▶│ (min. transf)│                           │
│  │   :27333     │       │              │       ┌──────────────┐    │
│  └──────────────┘       └──────────────┘       │  REST API    │    │
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
2. **Minimální transformace** - XML→JSON je přijatelné, ale žádné "učesávání"
3. **XML jako samostatná služba** - API nad XML databází, nezávislé na scoreboardu
4. **Scoreboard se adaptuje** - práce s nativními C123 daty, ne s CLI formátem

---

## Datové toky

### 1. Real-time C123 stream (TCP)
```
C123 (Canoe123) ──TCP:27333──▶ C123 Server ──WS:27084──▶ Scoreboard

Zprávy: TimeOfDay, OnCourse, Schedule, Results (pipe-delimited XML)
Transformace: XML→JSON, případně envelope s metadaty (timestamp, source)
```

### 2. XML databáze (file/URL)
```
C123 XML soubor ──poll/watch──▶ C123 Server ──REST/WS──▶ Web clients

Přístupy:
- Lokální cesta: fs.watch() pro real-time změny
- SMB síťová cesta: polling (fs.watch nemusí fungovat)
- HTTP/HTTPS URL: polling s ETag/Last-Modified
- OneDrive: speciální handling (SharePoint API nebo download link)
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

Tato verze funguje, ale zavádí zbytečnou závislost na CLI formátu.

</details>

---

## Nové fáze implementace

Každý krok (7.1, 7.2, ...) je navržen tak, aby se dal zvládnout v rámci **jednoho Claude Code session**.

---

### Fáze 7: Lean protokol a refaktoring

#### 7.1 Definice nového protokolu ⏱️ ~1 session
**Vstup:** Analýza stávajícího C123 XML formátu
**Výstup:** `src/protocol/types.ts` s novými typy

- [ ] Vytvořit `src/protocol/types.ts`
- [ ] Definovat envelope: `C123Message<T>` s source, type, timestamp
- [ ] Definovat payloady: `OnCoursePayload`, `ResultsPayload`, `SchedulePayload`
- [ ] Zachovat strukturu blízkou raw XML (jen JSON konverze)
- [ ] Unit testy pro typy (validace struktury)

#### 7.2 Nový MessageFormatter ⏱️ ~1 session
**Vstup:** Nové typy z 7.1
**Výstup:** `src/output/MessageFormatterV2.ts`

- [ ] Vytvořit `MessageFormatterV2.ts` (vedle stávajícího)
- [ ] Jednoduchá transformace: XML data → C123Message envelope
- [ ] Žádné CLI mapování (HighlightBib, RaceStatus)
- [ ] Unit testy

#### 7.3 WebSocket s dual-mode ⏱️ ~1 session
**Vstup:** Nový formatter z 7.2
**Výstup:** WebSocket podporující oba protokoly

- [ ] Přidat config flag: `protocolVersion: "v1-cli" | "v2-lean"`
- [ ] V2 klienti dostávají nový formát
- [ ] V1 klienti (legacy) dostávají CLI formát
- [ ] Handshake při připojení (client posílá preferovanou verzi)

#### 7.4 Cleanup CLI kódu ⏱️ ~1 session
**Vstup:** Funkční v2 protokol
**Výstup:** Odstraněný CLI-specifický kód

- [ ] Odstranit staré CLI typy (nebo přesunout do legacy/)
- [ ] Zjednodušit EventState na pouhou agregaci
- [ ] Aktualizovat/odstranit staré testy

---

### Fáze 8: XML REST API

#### 8.1 Základní XML REST ⏱️ ~1 session
**Vstup:** Existující XmlFileSource
**Výstup:** REST endpoints v AdminServer

- [ ] `GET /api/xml/status` - je XML dostupné, checksum, timestamp
- [ ] `GET /api/xml/schedule` - rozpis závodů
- [ ] `GET /api/xml/participants` - všichni závodníci
- [ ] Swagger/OpenAPI dokumentace (komentáře v kódu)

#### 8.2 Results API ⏱️ ~1 session
**Vstup:** REST základ z 8.1
**Výstup:** Kompletní results endpoints

- [ ] `GET /api/xml/races` - seznam závodů (id, name, status)
- [ ] `GET /api/xml/races/:id` - detail závodu
- [ ] `GET /api/xml/races/:id/results` - výsledky (obě jízdy)
- [ ] `GET /api/xml/races/:id/results/:run` - BR1 nebo BR2
- [ ] Query params: `?merged=true` pro spojené výsledky

#### 8.3 XML source improvements ⏱️ ~1 session
**Vstup:** Existující XmlFileSource
**Výstup:** Robustnější XML handling

- [ ] `fs.watch()` pro lokální soubory (real-time)
- [ ] Fallback na polling když watch nefunguje (SMB)
- [ ] ETag/Last-Modified pro HTTP URLs
- [ ] Debounce pro rapid changes

#### 8.4 XML change notifications ⏱️ ~1 session
**Vstup:** Vylepšený XML source z 8.3
**Výstup:** Push notifikace pro změny

- [ ] WebSocket kanál `/ws/xml` pro změny
- [ ] Message: `{ type: "xml-change", section, timestamp }`
- [ ] Klient si stáhne data přes REST (pull)
- [ ] Subscription model (které sekce sledovat)

---

### Fáze 9: Dokumentace

#### 9.1 Protokol dokumentace ⏱️ ~1 session
**Výstup:** `docs/PROTOCOL.md`

- [ ] WebSocket protokol v2 specifikace
- [ ] Všechny message typy s příklady
- [ ] Handshake a connection lifecycle
- [ ] Error handling

#### 9.2 REST API dokumentace ⏱️ ~1 session
**Výstup:** `docs/API.md` nebo OpenAPI spec

- [ ] Všechny endpoints
- [ ] Request/response příklady
- [ ] Error codes
- [ ] Rate limiting (pokud bude)

#### 9.3 Integration guide ⏱️ ~1 session
**Výstup:** `docs/INTEGRATION.md`

- [ ] Jak napojit scoreboard
- [ ] Jak napojit jiné klienty
- [ ] Příklady kódu (JS/TS)
- [ ] Migrace z CLI

---

### Fáze 10: Scoreboard adaptace (external repo)

*Poznámka: Tyto kroky jsou v `canoe-scoreboard-v2/`, ne zde*

#### 10.1 Nový C123 Provider
- [ ] `C123ServerProvider.ts` - připojení na v2 protokol
- [ ] Mapování C123 dat na scoreboard state
- [ ] Finish detection na straně scoreboardu

#### 10.2 Integrace a testování
- [ ] E2E test s C123 Server v2
- [ ] Ověření všech funkcí scoreboardu

---

## Formát zpráv v2

### WebSocket (real-time C123 data)

```json
{
  "source": "c123",
  "type": "OnCourse",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": {
    "runners": [
      { "Bib": "9", "Name": "PRSKAVEC Jiří", "Time": "8115", "dtFinish": "" }
    ]
  }
}
```

```json
{
  "source": "c123",
  "type": "Results",
  "timestamp": "2025-01-02T10:30:46.456Z",
  "data": {
    "Race": "K1m - střední trať",
    "Run": "BR1",
    "results": [
      { "Bib": "1", "Rank": 1, "Time": "78.99", "Pen": 2 }
    ]
  }
}
```

### WebSocket (XML změny)

```json
{
  "source": "xml",
  "type": "update",
  "timestamp": "2025-01-02T10:31:00.000Z",
  "section": "Results",
  "raceId": "K1m_stredni"
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
- Tag `v1.0.0-cli` - předchozí CLI-kompatibilní verze
