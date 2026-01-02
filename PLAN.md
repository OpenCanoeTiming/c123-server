# Plán: C123 Server - Chytrá mezivrstva pro Canoe Scoreboard

## Cíl

Vytvořit **C123 Server** - samostatnou službu, která:
1. Automaticky najde C123 přes UDP broadcast (bez konfigurace)
2. Čte nativní XML (lokálně/URL) pro kompletní data obou jízd
3. Poskytuje "učesaná" data scoreboardům přes WebSocket (CLI-kompatibilní formát)
4. Nabízí admin dashboard pro správu připojených scoreboardů

**CLI zůstává jako záložní varianta**, ale C123 Server bude primární.

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server                                  │
│                                                                      │
│   Sources                    State                    Output         │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐     │
│  │ UdpDiscovery │──────▶│              │       │  WebSocket   │     │
│  │   :27333     │       │  EventState  │──────▶│   :27084     │────▶│ Scoreboardy
│  ├──────────────┤       │              │       └──────────────┘     │
│  │ TcpSource    │──────▶│ - RaceState  │                            │
│  │   :27333     │       │ - BR1BR2Merge│       ┌──────────────┐     │
│  ├──────────────┤       │ - FinishDet. │──────▶│ AdminServer  │     │
│  │ XmlFileSource│──────▶│              │       │   :8084      │     │
│  └──────────────┘       └──────────────┘       └──────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Adresářová struktura

```
c123-server/
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── PLAN.md
│
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hlavní orchestrace
│   │
│   ├── sources/              # Zdroje dat
│   │   ├── types.ts
│   │   ├── UdpDiscovery.ts   # UDP broadcast listener + auto-discovery
│   │   ├── TcpSource.ts      # TCP:27333 připojení
│   │   └── XmlFileSource.ts  # XML soubory (lokální/URL)
│   │
│   ├── parsers/              # XML parsování
│   │   ├── xml-parser.ts
│   │   ├── oncourse.ts
│   │   ├── results.ts
│   │   └── participants.ts
│   │
│   ├── state/                # Agregovaný stav
│   │   ├── EventState.ts
│   │   ├── RaceState.ts
│   │   ├── BR1BR2Merger.ts   # Spojování jízd
│   │   └── FinishDetector.ts # Detekce dojetí
│   │
│   ├── output/               # Výstupy
│   │   ├── WebSocketServer.ts
│   │   ├── ScoreboardSession.ts
│   │   └── MessageFormatter.ts
│   │
│   ├── admin/                # Admin dashboard
│   │   ├── AdminServer.ts
│   │   ├── api/
│   │   └── static/
│   │
│   └── service/              # Windows služba
│       └── windows-service.ts
│
└── shared/                   # Sdílené typy (pro budoucí npm package)
    └── types/
        ├── messages.ts       # CLI message format
        └── scoreboard.ts
```

---

## Klíčové kvality

1. **Sledování flow závodu** - zobrazovat výsledky kategorie, která zrovna jede, dokud se nerozjede další
2. **XML validace** - identifikovat správný XML soubor, detekovat nekompatibilitu s real-time daty (jiný závod)
3. **XML je živá databáze** - soubor se průběžně mění, polling pro aktualizace
4. **Cross-platform** - Windows primární, ale schopno běžet i jinde (Linux, macOS)

---

## Vývoj a testování

Vývoj běží proti **nahraným datům z analýzy** (`../analysis/recordings/`):
- Obsahují nativní C123 data (TCP) i CLI data (WS)
- Lze pustit vedle sebe a sledovat rozdíly
- Dobré pro odladění logiky, která má fungovat ve scoreboardu

---

## Implementační fáze

### Fáze 0: Inicializace projektu [DONE]

1. `c123-server/CLAUDE.md` - instrukce pro Claude Code
2. `c123-server/PLAN.md` - kopie tohoto plánu
3. `c123-server/package.json` - základní setup
4. `c123-server/tsconfig.json`

---

### Fáze 1: Základ (MVP) [DONE]

**Cíl:** Funkční server, který nahradí c123-proxy.js

1. ✅ **TcpSource** (rozšíření c123-proxy.js)
   - TCP připojení k C123:27333
   - Pipe-delimited XML parsing
   - Reconnect s exponential backoff

2. ✅ **Základní XML parsery** (převzít z C123Provider.ts)
   - `parseOnCourse()` - závodníci na trati
   - `parseResults()` - výsledky
   - `parseTimeOfDay()` - systémový čas

3. ✅ **EventState** - jednoduchý stav
   - Aktuální závod, závodníci, výsledky

4. ✅ **WebSocketServer** - CLI-kompatibilní výstup
   - Port 27084 (vedle C123)
   - Emituje `top`, `oncourse`, `comp` zprávy

**Reference:**
- `../canoe-scoreboard-v2/scripts/c123-proxy.js` - základ pro TcpSource
- `../canoe-scoreboard-v2/src/providers/C123Provider.ts` - XML parsing

---

### Fáze 2: Auto-discovery + Detekce dojetí

1. ✅ **UdpDiscovery**
   - Poslouchá UDP broadcast 27333
   - Automaticky najde C123 IP
   - Spustí TcpSource bez manuální konfigurace

2. ✅ **FinishDetector** (implementováno v EventState)
   - Sleduje změnu `dtFinish` (z "" na timestamp)
   - Emituje `HighlightBib` pro scoreboard
   - Zajistí highlight i bez CLI

3. ✅ **MessageFormatter**
   - Transformace EventState → CLI JSON zprávy
   - Kompletní formát: top, oncourse, comp, control

---

### Fáze 3: XML soubory + BR1/BR2 [DONE]

1. ✅ **XmlFileSource**
   - Načítání XML z lokální cesty nebo URL (OneDrive)
   - Polling pro změny
   - Poskytuje Participants, kompletní Results

2. ✅ **BR1BR2Merger**
   - Cache BR1 výsledků při jejich příjmu
   - Spojení s BR2 daty (PrevTime, PrevPen)
   - Výpočet TotalTotal (nejlepší z obou jízd)

3. ✅ **Rozšířené zprávy**
   - Nový formát pro obě jízdy v UI
   - Zachování zpětné kompatibility

---

### Fáze 4: Admin dashboard + Per-scoreboard config

1. ✅ **AdminServer** (Express, port 8084)
   - REST API: `/api/status`, `/api/scoreboards`, `/api/sources`
   - POST `/api/scoreboards/:id/config` - nastavení

2. ✅ **ScoreboardSession**
   - Individuální konfigurace per scoreboard
   - Filtrace kategorií (raceFilter)
   - Custom visibility

3. **Dashboard UI** (minimalistické)
   - Přehled připojených scoreboardů
   - Status zdrojů (C123, XML)
   - Inline editace nastavení

---

### Fáze 5: Windows služba + Produkční hardening

1. **Windows service wrapper** (node-windows)
   - Instalace: `c123-server install`
   - Auto-start při boot
   - Auto-recovery při pádu

2. **Robustnost**
   - Detekce výměny závodu
   - Zotavení z restartu C123 a z vymeny zavodu v c123
   - Logging, monitoring

---

### Testovani a zpetna vazba

Vytvor testy ktere otestuji vsechny funkcnosti

otestuj e2e proti nahravce

otestuj se scoreboardem, spust testy na scoreboardu proti C123 serveru

vystupy z testu zapis jako dalsi fazi sem do planu

---

## Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| **C123** | 27333 | Existující (TCP + UDP) |
| **C123 Server WS** | 27084 | Pro scoreboardy (vedle C123) |
| **C123 Server Admin** | 8084 | Web dashboard |

---

## Formát zpráv (CLI-kompatibilní)

Server emituje **identické zprávy jako CLI**, takže scoreboard nepotřebuje změny:

```json
// top (výsledky)
{
  "msg": "top",
  "data": {
    "RaceName": "K1m - střední trať",
    "RaceStatus": "3",
    "HighlightBib": "9",
    "list": [{ "Rank": 1, "Bib": "1", "Name": "...", "Total": "78.99", "Pen": 2 }]
  }
}

// oncourse (na trati)
{
  "msg": "oncourse",
  "data": [{ "Bib": "9", "Name": "...", "Time": "8115", "dtFinish": "" }]
}

// comp (aktuální závodník)
{
  "msg": "comp",
  "data": { "Bib": "9", "Name": "...", "Time": "8115" }
}
```

---

## Reference z analýzy

- `../analysis/07-sitova-komunikace.md` - C123 protokol, detekce dojetí
- `../analysis/captures/xboardtest02_jarni_v1.xml` - XML struktura, BR1/BR2 formát
- `../canoe-scoreboard-v2/src/providers/C123Provider.ts` - existující XML parsing
- `../canoe-scoreboard-v2/scripts/c123-proxy.js` - TCP socket handling

---

## Oddělitelnost

Pro budoucí vyčlenění do samostatného projektu:
- Sdílené typy v `shared/types/` (CLI message format)
- Žádné importy z `canoe-scoreboard-v2/src/`
- Samostatný package.json bez workspace závislostí
- Publikovatelný jako `@canoe-scoreboard/c123-server`
