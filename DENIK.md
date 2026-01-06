# Deníček vývoje - C123 Server

Záznamy o průběhu vývoje, co fungovalo, co ne, slepé uličky.

---

## 2026-01-06

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
