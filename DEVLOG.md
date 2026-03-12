# C123 Server - Development Log

## 2025-01-18: Write API Fix - PenaltyCorrection

### Problem
Zápis penalizací do C123 nefungoval. Server logoval "Sending penalty" ale v C123 se nic nedělo.

### Investigation
1. Původní Canoe123Term v `resources-private/orig_src/` používá dva různé XML formáty:
   - `<Scoring>` - pro závodníky **na trati** (gridOnCourse)
   - `<PenaltyCorrection>` - pro **dojeté** závodníky (gridControl)

2. c123-scoring je reimplementace terminálu pro kontrolu penalizací DOJETÝCH závodníků - tedy potřebuje `PenaltyCorrection`, ne `Scoring`.

3. Originální terminál posílá kompaktní XML (bez whitespace/newlines) - `XmlDocument.OuterXml`.

### Solution
1. **Kompaktní XML formát** - odstraněny newlines a whitespace
2. **PenaltyCorrection podpora** - přidán volitelný `raceId` parametr:
   - Bez raceId → `<Scoring>` (on course)
   - S raceId → `<PenaltyCorrection>` (finished)
3. **Null value** - `value: null` posílá prázdný `Value=""` pro smazání penalizace

### API
```
POST /api/c123/scoring
Body: { raceId?: string, bib: string, gate: number, value: 0|2|50|null }
```

### Commits
- `dbc33d5` - fix: use compact XML format for C123 write commands
- `b205be1` - feat: add PenaltyCorrection support for finished competitors
- `8229b36` - feat: support null value to delete penalty

### Tested
Otestováno s reálným C123 na 192.168.68.108:27333 - penalizace se správně zapisují a mažou.

---

## 2025-01-18: Schedule on WebSocket Connection

### Problem
Server neposílal Schedule zprávu při připojení WebSocket klienta.

### Solution
Přidáno odeslání Schedule z EventState při připojení nového klienta (po Connected a ConfigPush).

### Commit
- `41c27e5` - fix: send Schedule message on WebSocket client connection

---

## 2026-02-14 - Block 6: Post-review fixes

### Completed
- [x] Fix `loadLiveStatus()` — unwrap `data.status` from API response
- [x] Fix `createLiveEvent()` — rename `eventMetadata` to `metadata` to match server
- [x] Fix OnCourse time/total units — use `parseFormattedTimeToCentiseconds()` for consistent centisecond format
- [x] Remove unused `parseTimeToSeconds()` method
- [x] Static import `node:fs/promises` in LivePusher
- [x] Deep copy via `structuredClone()` in `getStatus()` to prevent reference leaks
- [x] Remove unused `_checksum` parameter from XML change listener
- [x] Extract all inline styles from Live-Mini HTML into CSS classes
- [x] Use design system variables (spacing, typography, border-radius) in new CSS classes
- [x] Fix transformer test expectations for centisecond time/total values
- [x] All 514 tests pass

### Notes
- `parseTimeToSeconds` was only used for OnCourse time/total, removed entirely after switching to centiseconds
- `structuredClone()` is available in Node.js 17+ (our target), provides true deep copy
