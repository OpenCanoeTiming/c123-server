# Development Log - C123 Server

Records of development progress, what worked, what didn't, dead ends.

---

## 2026-01-06 (afternoon 3)

### Completed

**INTEGRATION.md Documentation Revision (Step 3)**
- Quick Start: added example with clientId for multiple scoreboards
- BR1/BR2 section: verified vs implementation (getMergedResults in XmlDataService) - matches
- Troubleshooting: new complete section with tables:
  - Connection Issues
  - Data Issues
  - Configuration Issues
  - Debugging Tips (5 curl commands)
  - Common Mistakes (5 anti-patterns)
- Build: OK

### What Worked
- Direct implementation reading (XmlDataService.ts:438) for documentation verification
- Systematic endpoint list for completeness check

---

## 2026-01-06 (afternoon 2)

### Completed

**C123-PROTOCOL.md Documentation Revision**
- Comparison of WS message types vs code (protocol/types.ts, parser-types.ts)
- Found and fixed issues:
  - Added missing `LogEntry` message documentation
  - Fixed `XmlChange.sections` - docs had `StartList`, code has `Participants`
  - Fixed `OnCourse` JSON example - `time/total` are raw centiseconds as string ("8115"), not formatted ("81.15")
  - Added complete Result Row Fields table including BR1/BR2 fields
- Tests: 413 passed

### What Worked
- Checking tests as source of truth for data formats

---

## 2026-01-06 (afternoon)

### Completed

**REST-API.md Documentation Revision**
- Documentation vs actual implementation comparison in UnifiedServer.ts
- Added missing sections:
  - Configuration API (`/api/config`, `/api/config/xml`, `/api/config/xml/autodetect`, `/api/config/xml/detect`)
  - Event API (`/api/event` GET/POST)
  - Logs API (`/api/logs`)
- Updated GET `/api/clients` section with new fields:
  - `configKey`, `hasExplicitId`, `sessionCount`, `ipAddress`
- Tests: 413 passed

### What Worked
- Systematic approach: grep routes → compare with docs → add missing
- Vitest with `--run` flag for non-interactive mode

---

## 2026-01-06 (morning)

### Completed

**1. BR1/BR2 Handling Documentation**
- Added lessons learned from V3 scoreboard implementation
- C123-PROTOCOL.md: critical warning - TCP stream pen/total contains BR1 data!
- INTEGRATION.md: new section on BR1/BR2 merge strategy with OnCourse grace period
- REST-API.md: notes on empty objects, merged endpoint recommendation

**2. Feature: Server-assigned clientId**
- Server can push `clientId` to clients via ConfigPush message
- Client should adopt this ID for future connections
- Implementation: type in `ClientConfig`, API validation, UI input in dashboard modal
- Documentation in CLIENT-CONFIG.md, REST-API.md, C123-PROTOCOL.md

### What Worked
- Clean clientId implementation - backend, API, UI, documentation in one unit
- BR1/BR2 issue documentation will help future integrators

### Notes
- No bugs, no tests - purely feature + docs day

---

## Older History (Before Log)

### Phase 14 - Connectivity Fixes
- UDP reset, TCP reconnect logic

### Phase 13 - XML Source Selector
- 3 modes (auto/manual/URL)
- Event name, force refresh, log viewer

### Phase 11-12 - Consolidation
- One port 27123 (UnifiedServer)
- Autodiscovery (`/api/discover`)

### Phase 7-10 - Foundation
- Clean C123 protocol (removed CLI emulation)
- XML REST API, file watcher
- Documentation in `docs/`

---

*Format: date, what was done, what worked/didn't work, notes for future instances*
