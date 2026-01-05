# Development Log - C123 Server

## 2026-01-05: Odstranění BR1BR2Merger

### Problém
Server modifikoval TCP stream výsledky pomocí `BR1BR2Merger` třídy, která přidávala BR1 data k BR2 výsledkům. To bylo v rozporu se záměrem "tenkého serveru", který má předávat autentická C123 data bez transformace.

### Řešení
- Odstraněn `BR1BR2Merger.ts` a jeho testy
- Odstraněno použití v `server.ts` (`handleXmlMessage`, `scheduleChange` handler)
- Server nyní předává čistá C123 data

### BR merge logika nyní
- **TCP stream:** Server předává data bez modifikace
- **REST API:** `GET /api/xml/races/:id/results?merged=true` vrací sloučené BR1+BR2 výsledky z XML
- **Scoreboard:** Používá REST API pro dotažení BR1 dat během BR2 zobrazení

Viz `../canoe-scoreboard-v3/docs/SolvingBR1BR2.md` pro kompletní analýzu řešení.

---

## 2026-01-05: Fáze 14 - Connectivity opravy

### Problém 1: UDP status indikátor po odpojení TCP
**Symptom:** Po odpojení TCP svítí UDP kontrolka zeleně, i když UDP v té chvíli nechodí.

**Analýza:**
- `UdpDiscoverySourceAdapter` kontroloval `discoveredHost` - jednou nastavený, nikdy se neresetoval
- Po TCP disconnect se nic nedělo s UDP stavem
- UDP discovery socket běžel dál, ale status byl stále "connected"

**Řešení:**
1. Přidána `reset()` metoda do `UdpDiscovery`
   - Resetuje `discoveredHost` na null
   - Restartuje timeout timer pokud běží
2. Server volá `handleTcpDisconnect()` při TCP disconnect
   - Resetuje UDP discovery pro správný status
   - Neresetuje `Server.discoveredHost` - TcpSource sám reconnectuje
3. Při re-discovery stejného hostu se ignoruje (TcpSource reconnectuje)
4. Při discovery jiného hostu se zastaví starý TcpSource

**Slepé uličky:**
- Původně jsem chtěl resetovat i `Server.discoveredHost`, ale to způsobilo že se při re-discovery vytvářel nový TcpSource a přerušoval reconnect
- Řešení: ponechat `Server.discoveredHost` a v discovery handleru ignorovat stejný host

### Problém 2: Recovery po ztrátě Canoe123
**Analýza ukázala že aktuální implementace je robustní:**
- TcpSource má exponential backoff (1s → 30s)
- EventState drží data během výpadku
- Schedule change detekce funguje pro změnu eventu

**Závěr:** Není potřeba žádná oprava, pouze dokumentace.

### Testy
- 4 nové testy pro `reset()` metodu
- Celkem 304 testů prochází

---

## 2026-01-05: Fáze 15 - Remote Client Configuration ✅ DOKONČENO

### Co bylo implementováno

1. **Datový model (15.1)**
   - `ClientConfig` typ s known params (type, displayRows, customTitle) + custom params
   - `CustomParamDefinition` pro uživatelsky definované parametry
   - Nové WS zprávy: `ConfigPush`, `ClientState`

2. **Session rozšíření (15.2)**
   - Identifikace klientů podle IP adresy
   - Automatický `ConfigPush` při připojení
   - Podpora `ClientState` zpráv od klientů

3. **Storage a persistence (15.3)**
   - `AppSettingsManager` rozšířen o client configs
   - Ukládání do `settings.json`
   - Custom param definitions

4. **REST API (15.4)**
   - `GET /api/clients` - seznam klientů
   - `PUT /api/clients/:ip/config` - nastavení konfigurace
   - `PUT /api/clients/:ip/label` - pojmenování klienta
   - `DELETE /api/clients/:ip` - smazání konfigurace
   - `POST /api/clients/:ip/refresh` - force refresh jednoho klienta
   - `GET/PUT /api/config/custom-params` - definice custom parametrů

5. **Push mechanismus (15.5)**
   - Automatický push při změně konfigurace
   - Push při připojení klienta

6. **Admin UI (15.6)**
   - Kompaktní grid karet klientů
   - Detail modal s editací
   - Force refresh tlačítko
   - Real-time aktualizace přes WebSocket

7. **Dokumentace (15.7)**
   - `docs/CLIENT-CONFIG.md` - kompletní dokumentace
   - Aktualizace `docs/C123-PROTOCOL.md`, `docs/REST-API.md`

### Poznámky k implementaci

- **Identifikace podle IP**: Funguje dobře pro lokální síť. Při použití reverse proxy nutno nastavit X-Forwarded-For.
- **ConfigPush**: Posílají se pouze nastavené hodnoty (undefined se neposílá) - scoreboard si zachová své defaults.
- **Custom params**: Admin může definovat vlastní parametry pro budoucí rozšíření scoreboardu.

### Testy
- 130+ nových testů pro client config funkcionalitu
- Celkem prochází všechny testy (git clean)

### Co zbývá udělat (future work)
- [ ] WebSocket notifikace o stavu C123 připojení (ConnectionStatus zpráva)
- [ ] Admin UI zobrazení doby od posledního připojení/odpojení
- [ ] Bulk operations pro více klientů najednou
