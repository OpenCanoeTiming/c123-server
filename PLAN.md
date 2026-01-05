# Plán: C123 Server v2 - Lean Data Proxy

## Vize

**C123 Server** = štíhlá mezivrstva předávající **autentická data z C123** s minimální transformací.

Scoreboard pracuje přímo s nativními C123 daty (ne CLI formátem).

---

## Architektura

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
└─────────────────────────────────────────────────────────────────────┘
```

---

## Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| **C123 (upstream)** | 27333 | Canoe123 protokol (TCP + UDP), nelze měnit |
| **C123 Server** | 27123 | Jeden port pro vše (HTTP + WS) |

### Endpointy na portu 27123

```
http://server:27123/       → Admin dashboard (SPA)
ws://server:27123/ws       → WebSocket pro scoreboardy
http://server:27123/api/*  → REST API (status, config, XML data)
```

---

## C123 Protokol (shrnutí)

### Typy zpráv

| Zpráva | Frekvence | Popis |
|--------|-----------|-------|
| **TimeOfDay** | ~1×/s | Heartbeat |
| **OnCourse** | vícekrát/s | Závodníci na trati |
| **Results** | nepravidelně | Výsledky (rotují kategorie) |
| **RaceConfig** | ~20s | Konfigurace kategorie |
| **Schedule** | ~40s | Rozpis závodů |

### Klíčové koncepty

- **Current="Y"** - označuje aktuálně jedoucí kategorii v Results
- **dtFinish** - prázdný → timestamp = závodník dojel
- **BR = BetterRun** - nejlepší ze dvou jízd (CZ specifický formát)

---

## Formát WebSocket zpráv

```json
{
  "type": "Results",
  "timestamp": "2025-01-02T10:30:46.456Z",
  "data": {
    "RaceId": "K1M_ST_BR2_6",
    "Current": "Y",
    "rows": [{ "Participant": {...}, "Result": {...} }]
  }
}
```

Další typy: `TimeOfDay`, `OnCourse`, `RaceConfig`, `Schedule`, `XmlChange`, `ConfigPush`, `ForceRefresh`, `LogEntry`

---

## Dokončené fáze ✅

| Fáze | Co obsahuje |
|------|-------------|
| **7** | Čistý C123 protokol, odstranění CLI emulace |
| **8** | XML REST API (`/api/xml/*`), file watcher, XmlChange notifikace |
| **9-10** | Dokumentace (`docs/*.md`) |
| **11** | Konsolidace na jeden port 27123 (UnifiedServer) |
| **12** | Autodiscovery (`/api/discover`, `docs/discovery-client.ts`) |
| **13** | XML source selector (3 režimy), event name, force refresh, log viewer |
| **14** | Connectivity opravy (UDP reset, TCP reconnect) |
| **15** | Remote client config (`/api/clients/*`, ConfigPush, Admin UI) |

Detaily viz `docs/` a `DEV-LOG.md`.

---

## Architektonická rozhodnutí

### BR1/BR2 Merge - řeší scoreboard, NE server ✅

Server **neimplementuje** BR1/BR2 merge logiku na TCP streamu. Princip:

- Server předává autentická data z C123 bez transformace
- BR merge logiku řeší **scoreboard** (klient)
- Scoreboard využívá REST API `GET /api/xml/races/:raceId/results` pro dotažení BR1 dat během BR2
- REST API `?merged=true` vrací sloučené výsledky obou jízd z XML souboru

**Odstraněno:** `BR1BR2Merger` třída, která dříve modifikovala TCP stream výsledky.

Viz `../canoe-scoreboard-v3/docs/SolvingBR1BR2.md` pro kompletní analýzu.

---

## Future Work

### Nice-to-have vylepšení

- [ ] **ConnectionStatus** - WS notifikace pro klienty o stavu C123 připojení
- [ ] **Uptime display** - Admin UI zobrazení doby od posledního připojení/odpojení
- [ ] **Bulk operations** - Hromadné operace pro více klientů najednou

---

## Reference

| Zdroj | Popis |
|-------|-------|
| `../analysis/07-sitova-komunikace.md` | C123 protokol analýza |
| `../analysis/captures/*.xml` | XML struktura příklady |
| `../analysis/recordings/*.jsonl` | Timing analýza |
| Tag `v1.0.0-cli` | Archivovaná CLI-kompatibilní verze |
