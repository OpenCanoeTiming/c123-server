# C123 Server - Plán a stav projektu

## Vize

**C123 Server** = štíhlá mezivrstva předávající **autentická data z C123** scoreboardům.

- Scoreboard pracuje přímo s nativními C123 daty (ne CLI formátem)
- Server nemodifikuje data, pouze je parsuje a předává
- XML soubor slouží jako sekundární zdroj pro historická/doplňková data

---

## Stav projektu: FUNKČNÍ ✅

Server je kompletně implementovaný a funkční.

### Údržba dokumentace

| Krok | Status | Popis |
|------|--------|-------|
| D1 | ✅ | Aktualizovat odkazy na analysis/ po její reorganizaci |
| D2 | ✅ | Sjednotit C123 protokol dokumentaci s analysis/ |
| D3 | ⬜ | Přidat příklady XML do docs/ nebo odkázat na analysis/captures/ |

**D1-D2 dokončeno:** `docs/C123-PROTOCOL.md` nyní odkazuje na `analysis/c123-protocol.md` pro nativní protokol.

| Oblast | Popis |
|--------|-------|
| **TCP/UDP** | Připojení k C123 na :27333, reconnect logika, UDP discovery |
| **WebSocket** | Real-time stream pro scoreboardy na `/ws` |
| **REST API** | XML data, konfigurace klientů, status, assets |
| **Admin UI** | Dashboard na `/`, správa klientů, log viewer, asset management |
| **XML polling** | Auto/manual/URL režimy, file watcher |
| **Client config** | Remote konfigurace scoreboardů přes ConfigPush |
| **Assets** | Centrální správa obrázků (logo, partneři, footer) s per-client overrides |

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         C123 Server                                 │
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
└─────────────────────────────────────────────────────────────────────┘
```

### Porty

| Služba | Port | Poznámka |
|--------|------|----------|
| **C123 (upstream)** | 27333 | Canoe123 protokol, nelze měnit |
| **C123 Server** | 27123 | HTTP + WS + API (vše na jednom portu) |

---

## Klíčové koncepty

### C123 Protokol

| Zpráva | Frekvence | Popis |
|--------|-----------|-------|
| **TimeOfDay** | ~1×/s | Heartbeat |
| **OnCourse** | vícekrát/s | Závodníci na trati |
| **Results** | nepravidelně | Výsledky (rotují kategorie) |
| **RaceConfig** | ~20s | Konfigurace kategorie |
| **Schedule** | ~40s | Rozpis závodů |

### BR1/BR2 (BetterRun)

- CZ specifický formát pro dvě jízdy
- **Server NEŘEŠÍ merge** - předává autentická data
- **Scoreboard řeší merge** pomocí REST API `/api/xml/races/:raceId/results?merged=true`

### Current="Y"

Označuje aktuálně jedoucí kategorii v Results - klíčové pro sledování flow závodu.

---

## Dokumentace

| Soubor | Účel |
|--------|------|
| `docs/C123-PROTOCOL.md` | WebSocket protokol, typy zpráv |
| `docs/REST-API.md` | REST endpointy včetně Assets API |
| `docs/INTEGRATION.md` | Návod pro integrátory |
| `docs/CLIENT-CONFIG.md` | Remote konfigurace klientů (ConfigPush) |
| `docs/SCOREBOARD-REQUIREMENTS.md` | Požadavky na scoreboard |
| `docs/CLI-DIFFERENCES.md` | Rozdíly oproti CLI verzi |

---

## Plánované úpravy: Assets

### A1: Reset logo do default ⬜

**Problém:** Když admin vymaže logo na serveru, scoreboard ho má stále v localStorage. Server pošle ConfigPush bez daného assetu (undefined), ale scoreboard nerozlišuje:
- `undefined` = nezměněno (ponechat localStorage)
- `undefined` = smazáno (vymazat z localStorage, použít default)

**Řešení:** Explicitní signalizace resetu pomocí `null`:

1. **C123 Server** (`src/unified/UnifiedServer.ts`):
   - Při DELETE /api/config/assets/:key nastavit hodnotu na `null` (ne undefined)
   - ConfigPush pak pošle `{ logoUrl: null }` místo `{ }` bez klíče

2. **C123 Server** (`src/protocol/types.ts`):
   - Upravit typy v AssetUrls: `logoUrl?: string | null`

3. **Scoreboard-V3** (`src/providers/C123ServerProvider.ts`):
   - V handleConfigPush() rozlišovat:
     - `undefined` = nezměněno
     - `null` = vymazat z localStorage
     - `string` = nastavit novou hodnotu

4. **Scoreboard-V3** (`src/utils/assetStorage.ts`):
   - Přidat funkci `clearAsset(key)` pro mazání jednotlivých assetů

**Soubory k úpravě:**
- `c123-server/src/config/types.ts` - typy AssetUrls
- `c123-server/src/config/AppSettings.ts` - clearDefaultAsset vrací null
- `c123-server/src/unified/UnifiedServer.ts` - DELETE endpoint logika
- `c123-server/src/ws/ScoreboardSession.ts` - sendConfigPush() zahrnuje null hodnoty
- `canoe-scoreboard-v3/src/types/c123server.ts` - ConfigPush typy
- `canoe-scoreboard-v3/src/providers/C123ServerProvider.ts` - handleConfigPush
- `canoe-scoreboard-v3/src/utils/assetStorage.ts` - partial clear

---

### A2: Podpora SVG logo přes base64 ⬜

**Stav:** Částečně podporováno - validace přijímá `data:image/*` včetně SVG.

**Potřeba ověřit:**
1. Validace regex `^data:image\/` akceptuje `data:image/svg+xml;base64,...`
2. Admin UI umí uploadnout SVG a převést na base64
3. Scoreboard správně renderuje SVG z data URI

**Kroky:**
1. Ověřit validaci v `c123-server/src/unified/UnifiedServer.ts` - ✅ funguje
2. Admin UI (`src/admin/dashboard.html`) - zkontrolovat upload handler
3. Přidat explicitní test pro SVG formát
4. Dokumentovat v `docs/REST-API.md` podporované formáty

**Soubory k úpravě:**
- `c123-server/src/admin/dashboard.html` - upload handler (pokud nefunguje)
- `c123-server/docs/REST-API.md` - dokumentace formátů

---

## Reference

| Zdroj | Popis |
|-------|-------|
| `../analysis/07-sitova-komunikace.md` | C123 protokol analýza |
| `../analysis/captures/*.xml` | XML struktura příklady |
| `../analysis/recordings/*.jsonl` | Timing analýza |
| Tag `v1.0.0-cli` | Archivovaná CLI-kompatibilní verze |
