# Development Log - C123 Server

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
