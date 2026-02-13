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

---

## Process

### Before starting work

1. Read `PLAN.md` — current status and next steps (~100 lines max)
2. If a step is too large, split into smaller parts

### During work

1. **Implementation:** Work in blocks (~70% context usage)
2. **Continuously:** Update `PLAN.md` when plan changes
3. **After completing a step:** Mark `- [x]` in PLAN.md

### After completing a block/iteration

1. **PLAN.md:** Mark completed steps, update "Next step"
2. **DEVLOG.md:** **APPEND ONLY** (see below)
3. **Commit:** Commit changes

### If blocked or problem is bigger than expected

Update PLAN.md with new sections and steps, finish current work, leave further work to a fresh instance.

### DEVLOG.md rules

⚠️ **DEVLOG.md is NOT read at the start of an iteration!**

- Serves as append-only log for history
- Read only when diagnosing problems
- After each iteration, append entry at the end:

```bash
cat >> DEVLOG.md << 'EOF'

---

## YYYY-MM-DD - Phase X.Y: Description

### Completed
- [x] Task 1
- [x] Task 2

### Problems and solutions
1. **Problem:** description
   **Solution:** how resolved

### Notes
Important decisions, tasks for next time
EOF
```

### Project files

| File | Purpose | When to read |
|------|---------|--------------|
| `PLAN.md` | Current plan (~100 lines) | **Always at start** |
| `CLAUDE.md` | Instructions + quick reference | Always (automatic) |
| `DEVLOG.md` | Work history | **Only when diagnosing** |
| `docs/` | Protocol, API, integration docs | When needed |

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
