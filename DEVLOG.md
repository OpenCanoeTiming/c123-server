# C123 Server - Development Log

## 2026-04-10 — Windows installer (Inno Setup + bundled Node.js)

**Problem:** End users (race organizers) had to clone the repo, install Node.js, run `npm install` + `npm run build`, and only then `npm start -- install`. Too many steps for non-technical users; see issue #9.

**Attempted:**
- Considered `pkg` / `nexe` / Node.js SEA for a single `.exe`. All fight the ESM `"type": "module"` project setup, the static admin-ui assets, and the `node-windows`/`systray2` optional deps that bundle their own `.exe` binaries. Rejected as fragile.
- Considered NSIS vs Inno Setup vs WiX. Inno Setup wins on maintainability (Pascal-like scripts), modern default UI, and a proven track record with bundling Node.js — Node.js itself uses Inno Setup for its Windows installer.

**Solution:**
1. **`scripts/prepare-installer-payload.js`** stages a deterministic `build-output/` tree: `runtime/node.exe` (downloaded once from nodejs.org, cached in `.cache/node-runtime/`) + `app/dist/` + `app/node_modules/` (prod only, via `npm ci --omit=dev --ignore-scripts`) + `LICENSE` + `README.txt`. Writes `installer/iss-defines.iss` with AppVersion from package.json and BuildCommit from git.
2. **`installer/c123-server.iss`** — Inno Setup 6 script. `[Run]` calls `{app}\runtime\node.exe {app}\app\dist\cli.js install` after files are copied, reusing the existing `WindowsService` wrapper around `node-windows`. `[UninstallRun]` does stop → uninstall → firewall delete in order. Uses LZMA2 ultra64 solid compression — 96 MB uncompressed payload shrinks to a ~23 MB installer.
3. **`.github/workflows/release.yml`** — windows-latest builds the installer on every push to main (rolling `preview` GitHub Release), on tag push (stable release with auto-generated notes), and on PRs (workflow artifact only). Relies on Inno Setup being pre-installed on `windows-latest` runners with a `choco install` fallback.
4. **`/api/update-check` endpoint + admin UI banner** — fail-safe GitHub Releases version check, 1-hour cache, 3 s timeout, ignores prereleases so the rolling preview tag does not trigger false upgrade banners. Opt-out via `updateCheck: false` in `settings.json` for closed networks.

**Gotchas learned along the way:**

- **`node-windows` captures `process.execPath` into service XML.** Confirmed by running `node dist/cli.js install` from an elevated shell — the generated `winsw.js` config shows `executable: 'C:\\Program Files\\nodejs\\node.exe'`, the absolute path of whichever `node.exe` ran the CLI. This made the Inno Setup `[Run]` section design critical: it **must** call `{app}\runtime\node.exe` explicitly (not just `node.exe`) with `WorkingDir: {app}\app`, otherwise the service would point at whatever Node the installer happened to find via PATH. With the explicit path, the service config is deterministically bound to our bundled runtime and survives any changes to user PATH (Volta, nvm-windows, global Node uninstall, …).

- **Pascal block comments in `.iss` `[Code]` section don't nest.** Writing `{ mentions {app} here }` as a comment breaks the compiler with `'BEGIN' expected` because the inner `}` closes the comment early. Solution: use `//` line comments in `[Code]` only.

- **`npm ci --omit=dev` leaves empty scope directories behind.** After `--omit=dev --ignore-scripts` in `build-output/app/`, the `node_modules/` contained 99 real prod packages *plus* 15 empty directories for skipped dev scopes (`@eslint/`, `@vitest/`, `@esbuild/`, `@types/`, `@typescript-eslint/`). Zero bytes, but cluttered. The stage script now prunes any empty dir under `node_modules/` after `npm ci`.

- **`node.exe` is ~71 MB, not ~30 MB** as I had estimated from memory. That's the bulk of the installer payload. LZMA2 ultra64 solid compression gets it down to ~23 MB final installer size.

- **GNU tar in Git Bash does NOT extract zip files.** My first stage-script attempt called `tar -xf node.zip`. Works with Windows native bsdtar (`C:\Windows\System32\tar.exe`) but not with MSYS GNU tar, which is what `/usr/bin/tar` resolves to in Git Bash. Switched to PowerShell `Expand-Archive` — always available on Win 10+, same on GitHub Actions `windows-latest`.

**Lesson:** Before bundling anything as a deterministic payload, always verify by running the exact built artefact from the exact expected path (`build-output/runtime/node.exe build-output/app/dist/cli.js run`), not just "it builds". This is what caught the stage-script path issues early.

**Follow-ups discovered during the first real install:**

- **Service detection bug in installer.** First real install triggered a false-positive "service could not be registered automatically" warning at the end of setup, even though the service WAS registered and running. Root cause: `node-windows` mangles the service name (`C123Server` → id `c123server.exe`), and the Pascal `[Code]` helper was querying `sc query C123Server` which finds nothing because that name doesn't exist in SCM — only the display name does. Switched to `RegKeyExists(HKLM\SYSTEM\CurrentControlSet\Services\c123server.exe)` with a retry loop. Much more reliable than sc.exe because the registry write is atomic and immediate.

- **No tray icon in installer mode.** Installer-managed service runs in Session 0, which cannot show tray icons (Windows architectural limit since Vista's Session 0 isolation). `systray2` silently no-ops there. Previous `npm start` usage had a tray because it ran in the user's interactive session. This is not a bug, it's an inherent trade-off of Windows services. Documented in `docs/DEPLOYMENT.md`; tracked as a follow-up improvement in issue #69 ("Tray monitor for installer-managed service" — a separate user-session helper polling `/api/status`).

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

---

## 2026-03-24 - Block 7: Live Admin UI Improvements (#51, #52, #53)

### Completed
- [x] LiveClient authMode refactor — request() accepts 'apiKey' | 'masterKey' | 'none'
- [x] createEvent() now sends X-Master-Key header instead of X-API-Key
- [x] New listEvents() method — GET /api/v1/admin/events with master key auth
- [x] imageData field added to CreateEventRequest for event image upload
- [x] LiveEventSummary and ListEventsResponse types added
- [x] GET /api/live/events proxy endpoint in UnifiedServer (avoids CORS)
- [x] handleLiveConnect accepts masterKey, passes to LiveClient and imageData to createEvent
- [x] handleLiveStatus returns apiKey from settings
- [x] Admin UI NOT_CONFIGURED state restructured: shared URL+masterKey inputs, 3 action buttons
- [x] Browse Events modal with event list, status badges, one-click connect
- [x] Manual Connect modal replaces old inline "Connect to Existing" tab
- [x] Event ID hint updated (issue #53)
- [x] Image upload with drag/drop, preview, 500KB limit in event creation modal (issue #52)
- [x] API Key display with copy-to-clipboard in connected state
- [x] Channel toggles moved inside channel cards
- [x] Updated LiveClient tests for authMode and masterKey header
- [x] All 540 tests pass, 0 lint errors

### Problems and solutions
1. **Problem:** masterKey must not be persisted to settings.json (server-level password)
   **Solution:** Stored only as JS variable in browser session (liveServerUrl, liveMasterKey)

2. **Problem:** Channel toggles were a separate section, cluttering the UI
   **Solution:** Moved toggles inside each channel card with border-top separator

### Notes
- Master key is session-only, never saved to AppSettings
- Event image is sent as base64 data URL in createEvent request body
- Browse Events uses server-side proxy to avoid CORS issues with direct browser fetch
