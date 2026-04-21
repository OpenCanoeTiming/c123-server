# Claude Code Instructions - C123 Server

## Project

C123 Server — smart middleware layer between Canoe123 and web clients for canoe slalom races. Provides WebSocket bridge, REST API, and Admin UI on a single port.

**GitHub:** OpenCanoeTiming/c123-server | **License:** MIT | **Status:** Active development

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
│   ├── checks/               # Penalty verification persistence
│   └── admin/                # Admin dashboard (SPA)
└── shared/types/             # Shared types
```

### Ports

| Service | Port | Note |
|---------|------|------|
| C123 (upstream) | 27333 | Canoe123 protocol (TCP + UDP), cannot be changed |
| **C123 Server** | 27123 | One port for everything (HTTP + WS) |

### Endpoints on Port 27123

| Path | Protocol | Purpose |
|------|----------|---------|
| `/` | HTTP | Admin dashboard (SPA) |
| `/ws` | WebSocket | Real-time data for scoreboards |
| `/api/*` | HTTP | REST API (status, config, XML data, checks) |

Port 27123 is mnemonic (C-1-2-3) and IANA unassigned.

---

## Key References

| Purpose | Path |
|---------|------|
| **Protocol documentation** | `../c123-protocol-docs/c123-protocol.md` |
| **XML format reference** | `../c123-protocol-docs/c123-xml-format.md` |
| **Recordings for testing** | `../c123-protocol-docs/recordings/` |
| **Replay tools** | `../c123-protocol-docs/tools/` |
| **Design system** | `../timing-design-system/` |
| **REST API docs** | `./docs/REST-API.md` |
| **WebSocket protocol** | `./docs/C123-PROTOCOL.md` |

---

## Important Rules

1. **Single port** — all services (Admin, WS, API) on one port 27123
2. **Design system mandatory** — use `@opencanoetiming/timing-design-system` for all UI, no inline styles for things the design system covers
3. **Cross-platform** — Windows primary, but must run on Linux/macOS
4. **XML as live database** — C123 XML file changes continuously, polling for updates

---

## Development

```bash
# Install
npm install

# Start server (connects to C123 or replay)
npm start -- --host localhost

# Run tests
npm test

# Build
npm run build
```

### Testing with recorded data

```bash
# Fetch a recording (one-time per event) and start the player
cd ../c123-protocol-docs
node tools/recordings-cli.js list                      # see what's available
node tools/recordings-cli.js fetch 2026-04-19-jarni-ne-odp
node tools/player.js \
  "$(node tools/recordings-cli.js path 2026-04-19-jarni-ne-odp)" \
  --autoplay --xml-out /tmp/c123-replay.xml

# In another terminal — start c123-server pointing at the player
cd ../c123-server
npm start -- --host 127.0.0.1 --xml /tmp/c123-replay.xml --no-discovery
```

Player emulates TCP, UDP, CIS HTTP and writes the XML snapshot file. For
Control API (programmatic seek/speed from tests) and other recipes see
[`../c123-protocol-docs/recordings/README.md`](../c123-protocol-docs/recordings/README.md#quick-start).

---

## Key Qualities

1. **Race flow tracking** — display results for the currently running category
2. **XML validation** — identify correct XML file, detect incompatibility
3. **Penalty check persistence** — checks and flags stored per-gate with WebSocket broadcast
4. **Cross-platform** — Windows primary, but runs on Linux/macOS too

---

## Persistent Settings

Application saves user settings to file to survive restart:

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\c123-server\settings.json` |
| Linux/macOS | `~/.c123-server/settings.json` |

**Principle:** Every manual setting (XML path, autodetect on/off) is automatically saved. Use `AppSettingsManager` from `src/config/AppSettings.ts`.

---

## Design System

**`@opencanoetiming/timing-design-system` is mandatory for all UI components.**

1. Always use design system classes first — buttons, cards, modals, tabs, badges, tables, forms
2. Only create local styles when component doesn't exist in design system
3. Never duplicate — if design system has it, use it
4. Consider contributing missing components back to design system

```
../timing-design-system/dist/timing.css  # Source
src/admin-ui/timing.css                   # Auto-synced copy
```

---

## Workflow

Issue-driven development. Every change starts with a GitHub issue.

### 1. Rozbor (Analysis)
- Comment on issue: restate problem, challenge the idea, define scope, identify risks
- Use `/second-opinion` for non-trivial architectural decisions

### 2. Plan
- Use Claude Code plan mode to design implementation
- Post plan summary to issue: key decisions, files to change, approach
- Get user confirmation before implementation

### 3. Implement
- Branch from main: `feat/{N}-{slug}` or `fix-{N}-{slug}`
- Commit incrementally, push regularly
- Comment on issue with progress updates

### 4. PR & Review
- Every issue → PR with `Closes #N`
- Include test plan in PR description
- Summarize what changed and why

---

## DEVLOG.md

Append-only record of dead ends, surprising problems, and solutions. Never edit existing entries.

```markdown
## YYYY-MM-DD — Short description

**Problem:** What went wrong or didn't work
**Attempted:** What was tried
**Solution:** What actually worked (or: still open)
**Lesson:** What to remember next time
```

---

## Language

- User communication: **Czech**
- Documentation (README, docs): **English**
- Code, comments, commit messages: **English**

---

## Commit Message Format

```
feat: add TcpSource with reconnect logic
fix: correct XML parsing for Results
test: add unit tests for FinishDetector
```

---

## Versioning & Releases

This project uses **Release Please** (commit-based) for automatic versioning. **Never manually bump `package.json` version or edit `CHANGELOG.md`** — Release Please owns both via its rolling release PR.

### How it works

1. Every push to `main` runs `.github/workflows/release-please.yml`.
2. Release Please keeps a rolling **release PR** open (label `autorelease: pending`) that aggregates pending changes and proposes the next version.
3. Merging the release PR creates:
   - A commit `chore(main): release X.Y.Z` on `main`
   - A git tag `vX.Y.Z`
   - A GitHub Release with generated CHANGELOG
   - Triggers `release.yml` (the Windows installer build) → attaches `c123-server-setup-X.Y.Z.exe` to the stable release
4. `release.yml` continues to produce rolling preview builds on every push to `main` (attached to the `preview` pre-release).

### Commit types and bump rules

| Commit type | Bump | Shown in CHANGELOG |
|---|---|---|
| `feat:` | **minor** (see 0.x note) | ✓ Features |
| `fix:` / `perf:` | **patch** | ✓ Bug Fixes / Performance |
| `feat!:` or `BREAKING CHANGE:` | **minor** (see 0.x note) | ✓ Features |
| `revert:` / `docs:` | none | ✓ Reverts / Documentation |
| `chore:` / `ci:` / `test:` / `style:` / `refactor:` / `build:` | **none** | hidden |
| `chore(deps):` / `chore(deps-dev):` (dependabot) | **none** | hidden |

**0.x series note:** Project is configured with `bump-minor-pre-major: true`. While in 0.x, `feat!:` bumps **minor** instead of major so breaking changes don't accidentally promote to 1.0.0. See "Graduating to 1.0.0" below.

**Note on `VERSION = '2.0.0'` in `UnifiedServer.ts`:** that constant is the **wire-protocol version** advertised via `/api/status` and `/api/info`. It is independent of the npm package version (`APP_VERSION` from `src/utils/appVersion.ts`, which reads `package.json`). Bump the wire-protocol constant only when clients need to renegotiate.

### Rules for agents preparing PRs

1. **Always use conventional commits** (`feat:`, `fix:`, `chore:`...). Release Please reads commit prefixes to decide bumps.
2. **Don't edit `package.json` version or `CHANGELOG.md`** in regular PRs — Release Please owns those.
3. **Don't merge the release PR together with feature PRs** — it must be the last to merge in a release cycle.
4. **PR title should keep the commit prefix** (squash merges — ensure the final merged commit stays conventional).
5. **Never commit skill state** — `.superpowers/` and `.claude/` are local per-session tool state. Prefer `git add <file>` over `git add -A`.
6. **Dependency bumps on `@opencanoetiming/timing-design-system`** are a separate `chore:` commit, not bundled with feature work. Let Release Please decide whether it matters for the release.

### Graduating to 1.0.0

To force a release to a specific version (e.g., graduating from 0.x to 1.0.0), add this footer to a commit in the next release cycle:

```
Release-As: 1.0.0
```
