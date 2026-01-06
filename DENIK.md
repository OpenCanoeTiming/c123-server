# Deníček vývoje - C123 Server

Záznamy o průběhu vývoje, co fungovalo, co ne, slepé uličky.

---

## 2026-01-06 (odpoledne 3)

### Provedeno

**Revize INTEGRATION.md dokumentace (Krok 3)**
- Quick Start: přidán příklad s clientId pro multiple scoreboards
- BR1/BR2 sekce: ověřeno vs implementace (getMergedResults v XmlDataService) - odpovídá
- Troubleshooting: nová kompletní sekce s tabulkami:
  - Connection Issues
  - Data Issues
  - Configuration Issues
  - Debugging Tips (5 curl příkazů)
  - Common Mistakes (5 anti-patterns)
- Build: OK

### Co fungovalo
- Přímé čtení implementace (XmlDataService.ts:438) pro ověření dokumentace
- Systematický seznam endpointů pro kontrolu kompletnosti

---

## 2026-01-06 (odpoledne 2)

### Provedeno

**Revize C123-PROTOCOL.md dokumentace**
- Porovnání typů WS zpráv vs kód (protocol/types.ts, parser-types.ts)
- Nalezené a opravené problémy:
  - Přidána chybějící dokumentace `LogEntry` zprávy
  - Opraveno `XmlChange.sections` - dokumentace měla `StartList`, kód má `Participants`
  - Opraveno `OnCourse` JSON příklad - `time/total` jsou raw centisekundy jako string ("8115"), ne formátované ("81.15")
  - Přidána kompletní tabulka Result Row Fields včetně BR1/BR2 polí
- Testy: 413 passed

### Co fungovalo
- Kontrola testů jako zdroj pravdy pro formáty dat

---

## 2026-01-06 (odpoledne)

### Provedeno

**Revize REST-API.md dokumentace**
- Porovnání dokumentace vs skutečná implementace v UnifiedServer.ts
- Doplněny chybějící sekce:
  - Configuration API (`/api/config`, `/api/config/xml`, `/api/config/xml/autodetect`, `/api/config/xml/detect`)
  - Event API (`/api/event` GET/POST)
  - Logs API (`/api/logs`)
- Aktualizována sekce GET `/api/clients` o nová pole:
  - `configKey`, `hasExplicitId`, `sessionCount`, `ipAddress`
- Testy: 413 passed

### Co fungovalo
- Systematický přístup: grep routes → porovnat s docs → doplnit
- Vitest s `--run` flag pro non-interactive mode

---

## 2026-01-06 (ráno)

### Provedeno

**1. Dokumentace BR1/BR2 handling**
- Doplněny lessons learned z implementace V3 scoreboardu
- C123-PROTOCOL.md: kritické varování - TCP stream pen/total obsahuje BR1 data!
- INTEGRATION.md: nová sekce o merge strategii BR1/BR2 s OnCourse grace periodem
- REST-API.md: poznámky o prázdných objektech, doporučení merged endpointu

**2. Feature: server-assigned clientId**
- Server může pushovat `clientId` klientům přes ConfigPush zprávu
- Klient by měl toto ID adoptovat pro budoucí připojení
- Implementace: typ v `ClientConfig`, validace v API, UI input v dashboard modalu
- Dokumentace v CLIENT-CONFIG.md, REST-API.md, C123-PROTOCOL.md

### Co fungovalo
- Čistá implementace clientId - backend, API, UI, dokumentace v jednom celku
- Dokumentace BR1/BR2 problematiky pomůže budoucím integrátorům

### Poznámky
- Žádné bugy, žádné testy - čistě feature + docs den

---

## Starší historie (před deníčkem)

### Fáze 14 - Connectivity opravy
- UDP reset, TCP reconnect logika

### Fáze 13 - XML source selector
- 3 režimy (auto/manual/URL)
- Event name, force refresh, log viewer

### Fáze 11-12 - Konsolidace
- Jeden port 27123 (UnifiedServer)
- Autodiscovery (`/api/discover`)

### Fáze 7-10 - Základ
- Čistý C123 protokol (odstranění CLI emulace)
- XML REST API, file watcher
- Dokumentace v `docs/`

---

*Formát: datum, co se udělalo, co fungovalo/nefungovalo, poznámky pro budoucí instance*
