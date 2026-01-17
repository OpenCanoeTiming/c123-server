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

- Komunikace s uživatelem: **čeština**
- Dokumentace (README, docs): **angličtina**
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
| C123 (upstream) | 27333 | Canoe123 protokol (TCP + UDP), nelze měnit |
| **C123 Server** | 27123 | Jeden port pro vše (HTTP + WS) |

### Endpointy na portu 27123

| Path | Protokol | Účel |
|------|----------|------|
| `/` | HTTP | Admin dashboard (SPA) |
| `/ws` | WebSocket | Real-time data pro scoreboardy |
| `/api/*` | HTTP | REST API (status, config, XML data) |

Port 27123 je mnemotechnický (C-1-2-3) a IANA unassigned.

---

## Vývoj a testování

Vývoj běží proti **nahraným datům z analýzy**:

```bash
# Nahrávka obsahuje TCP (C123) i WS (CLI) data
../analysis/recordings/rec-2025-12-28T09-34-10.jsonl
```


Proces: vzdy, zejmena u dodateckych pozadavku a zmen, nejprve aktualizovat dokumentaci jako plan a zamer, doplnit pripadne kroky do planu a ty pak postupne realizovat. Snažit se plánované úkoly dělit do bloků, které jdou zvládnout pomocí claude code s opus 4.5 do cca 70% použitého kontextu, protože budeme pouštět na bloky postupně čerstvé instance. Commit nejpozději po každém bloku. Nedělat víc než jeden blok před clear nebo compact.

Pokud se zjistí nějaká odchylka od požadovaného chování, nebo se nedaří nějaký problém vyřešit nebo se ukáže že je větší, tak další postup je takový, že aktualizuješ plán o nové sekce a kroky dle potřeby a skončíš a necháš další práci na čerstvé instance.

Piš si deníček vývoje - co šlo, co nešlo, co se zkusilo, atd. Ať se neprozkoumávají slepé uličky.


---

## Klíčové kvality

1. **Sledování flow závodu** - zobrazovat výsledky kategorie, která zrovna jede
2. **XML validace** - identifikovat správný XML soubor, detekovat nekompatibilitu
3. **XML je živá databáze** - soubor se průběžně mění, polling pro aktualizace
4. **Cross-platform** - Windows primární, ale běží i na Linux/macOS
5. **Jeden port** - všechny služby (Admin, WS, API) na jednom portu 27123

---

## Persistentní nastavení

Aplikace ukládá uživatelská nastavení do souboru, aby přežila restart:

| Platforma | Cesta |
|-----------|-------|
| Windows | `%APPDATA%\c123-server\settings.json` |
| Linux/macOS | `~/.c123-server/settings.json` |

**Princip:** Každé manuální nastavení (XML path, autodetekce on/off) se automaticky ukládá. Při dalších úpravách vždy používat `AppSettingsManager` z `src/config/AppSettings.ts`.

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
