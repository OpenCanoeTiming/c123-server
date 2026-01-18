# Claude Code Instructions - C123 Server

## Project

C123 Server - smart middleware layer between Canoe123 and scoreboards for canoe slalom races.

---

## Paths and Documentation

| Purpose | Path |
|---------|------|
| **This project** | `/workspace/csb-v2/c123-server/` |
| **Implementation plan** | `./PLAN.md` |
| **Scoreboard project** | `../canoe-scoreboard-v2/` (READONLY - reference) |
| **Analysis** | `../analysis/` (READONLY) |

### Key References

- **`../analysis/07-sitova-komunikace.md`** - C123 protocol, finish detection
- **`../analysis/captures/xboardtest02_jarni_v1.xml`** - XML structure, BR1/BR2 format
- **`../canoe-scoreboard-v2/scripts/c123-proxy.js`** - TCP socket handling (basis for TcpSource)
- **`../canoe-scoreboard-v2/src/providers/C123Provider.ts`** - XML parsing (reference)

---

## Language

- User communication: **Czech**
- Documentation (README, docs): **English**
- Code, comments, commit messages: **English**

---

## Architecture

```
c123-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Main orchestration
│   ├── sources/              # Data sources (UDP, TCP, XML)
│   ├── parsers/              # XML parsing
│   ├── state/                # Aggregated state
│   ├── output/               # WebSocket server
│   └── admin/                # Admin dashboard
└── shared/types/             # Shared types
```

---

## Ports

| Service | Port | Note |
|---------|------|------|
| C123 (upstream) | 27333 | Canoe123 protocol (TCP + UDP), cannot be changed |
| **C123 Server** | 27123 | One port for everything (HTTP + WS) |

### Endpoints on Port 27123

| Path | Protocol | Purpose |
|------|----------|---------|
| `/` | HTTP | Admin dashboard (SPA) |
| `/ws` | WebSocket | Real-time data for scoreboards |
| `/api/*` | HTTP | REST API (status, config, XML data) |

Port 27123 is mnemonic (C-1-2-3) and IANA unassigned.

---

## Development and Testing

Development runs against **recorded data from analysis**:

```bash
# Recording contains TCP (C123) and WS (CLI) data
../analysis/recordings/rec-2025-12-28T09-34-10.jsonl
```

Process: Always, especially for additional requests and changes, first update documentation as plan and intent, add necessary steps to the plan, then implement them gradually. Try to divide planned tasks into blocks that can be handled by Claude Code with Opus 4.5 up to ~70% context usage, because we'll run fresh instances for each block. Commit at the latest after each block. Don't do more than one block before clear or compact.

If any deviation from required behavior is discovered, or a problem cannot be solved or turns out to be bigger, then update the plan with new sections and steps as needed, finish, and leave further work to a fresh instance.

Keep a development log - what worked, what didn't, what was tried, etc. So dead ends aren't explored again.

---

## Key Qualities

1. **Race flow tracking** - display results for the currently running category
2. **XML validation** - identify correct XML file, detect incompatibility
3. **XML as live database** - file changes continuously, polling for updates
4. **Cross-platform** - Windows primary, but runs on Linux/macOS too
5. **Single port** - all services (Admin, WS, API) on one port 27123

---

## Persistent Settings

Application saves user settings to file to survive restart:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\c123-server\settings.json` |
| Linux/macOS | `~/.c123-server/settings.json` |

**Principle:** Every manual setting (XML path, autodetect on/off) is automatically saved. For future modifications always use `AppSettingsManager` from `src/config/AppSettings.ts`.

---

## Separability

This project is prepared for extraction to a standalone repository:
- No imports from `canoe-scoreboard-v2/src/`
- Shared types in `shared/types/`
- Standalone package.json

---

## Commit Message Format

```
feat: add TcpSource with reconnect logic
fix: correct XML parsing for Results
test: add unit tests for FinishDetector
```

---

## Design System Priority

**`timing-design-system` is mandatory for all UI components.**

### Rules

1. **Always use design system classes first** - buttons, cards, modals, tabs, badges, tables, forms
2. **Only create local styles when component doesn't exist** in design system
3. **Never duplicate** - if design system has it, use it
4. **Vodácký (canoe) theme** - use design system's canoe-specific styling for LIVE indicators, accents
5. **No inline styles** for things that design system covers

### Location

```
../timing-design-system/dist/timing.css  # Source
src/admin-ui/timing.css                   # Auto-synced copy
```

### When Adding New UI

1. Check `timing-design-system` for existing component
2. If exists → use design system class names
3. If doesn't exist → create minimal local style in `styles.css`
4. Consider contributing missing component back to design system

---

*Detailed implementation plan → see `./PLAN.md`*
