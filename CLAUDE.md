# Claude Code Instructions - C123 Server

## Projekt

C123 Server - chytrá mezivrstva mezi Canoe123 a scoreboardy pro kanoistické slalomové závody.

---

## Cesty a dokumentace

| Účel | Cesta |
|------|-------|
| **Tento projekt** | `/workspace/csb-v2/c123-server/` |
| **Implementační plán** | `./PLAN.md` |
| **Scoreboard projekt** | `../canoe-scoreboard-v2/` (READONLY - reference) |
| **Analýza** | `../analysis/` (READONLY) |

### Klíčové reference

- **`../analysis/07-sitova-komunikace.md`** - C123 protokol, detekce dojetí
- **`../analysis/captures/xboardtest02_jarni_v1.xml`** - XML struktura, BR1/BR2 formát
- **`../canoe-scoreboard-v2/scripts/c123-proxy.js`** - TCP socket handling (základ pro TcpSource)
- **`../canoe-scoreboard-v2/src/providers/C123Provider.ts`** - XML parsing (reference)

---

## Jazyk

- Komunikace a dokumentace: **čeština**
- Kód, komentáře, commit messages: **angličtina**

---

## Architektura

```
c123-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hlavní orchestrace
│   ├── sources/              # Zdroje dat (UDP, TCP, XML)
│   ├── parsers/              # XML parsování
│   ├── state/                # Agregovaný stav
│   ├── output/               # WebSocket server
│   └── admin/                # Admin dashboard
└── shared/types/             # Sdílené typy
```

---

## Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| C123 (existující) | 27333 | TCP + UDP |
| **C123 Server WS** | 27084 | Pro scoreboardy |
| **C123 Server Admin** | 8084 | Web dashboard |

---

## Vývoj a testování

Vývoj běží proti **nahraným datům z analýzy**:

```bash
# Nahrávka obsahuje TCP (C123) i WS (CLI) data
../analysis/recordings/rec-2025-12-28T09-34-10.jsonl
```


Proces: vzdy, zejmena u dodateckych pozadavku a zmen, nejprve aktualizovat dokumentaci jako plan a zamer, doplnit pripadne kroky do planu a ty pak postupne realizovat

---

## Klíčové kvality

1. **Sledování flow závodu** - zobrazovat výsledky kategorie, která zrovna jede
2. **XML validace** - identifikovat správný XML soubor, detekovat nekompatibilitu
3. **XML je živá databáze** - soubor se průběžně mění, polling pro aktualizace
4. **Cross-platform** - Windows primární, ale běží i na Linux/macOS
5. **CLI-kompatibilní výstup** - scoreboard nepotřebuje změny

---

## Oddělitelnost

Tento projekt je připraven na vyčlenění do samostatného repozitáře:
- Žádné importy z `canoe-scoreboard-v2/src/`
- Sdílené typy v `shared/types/`
- Samostatný package.json

---

## Commit message formát

```
feat: add TcpSource with reconnect logic
fix: correct XML parsing for Results
test: add unit tests for FinishDetector
```

---

*Detailní plán implementace → viz `./PLAN.md`*
