# Current State — What the Four Components Do Today

A factual map. Judgements about it are in `EVIDENCE.md`; this file is the terrain.

Prefixes: `SRV/` = `c123-server/src/`, `SB/` = `c123-scoreboard/src/`,
`PC/` = `c123-penalty-check/src/`, `LM/` = `c123-live-mini/packages/`.

---

## Deployment picture

```
  Canoe123 (Windows, at the venue)
     │  TCP/UDP :27333          XML file on disk
     ▼
  c123-server ──────────── one process, one port :27123
     │   /ws          WebSocket  →  scoreboard (Raspberry Pi), penalty-check (tablets)
     │   /api/*       REST       →  clients read XML-derived data, write scoring
     │   /            admin SPA  →  operator
     └── HTTP push    →  live-mini-server (Railway, public internet)
                                 └── React client → spectators' phones
```

Everything left of the push is on the venue LAN and must work with the internet unplugged.
Everything right of it is public and must survive the LAN link going away.

Approximate size: server 33k lines, scoreboard 24k, penalty-check 15k, live-mini split across two
packages. Single maintainer, working with Claude Code.

---

## c123-server — on-site middleware

**Ingest.** Four inbound paths, of which two reach domain state.

| Path | File | Role |
|---|---|---|
| UDP :27333 | `SRV/sources/UdpDiscovery.ts` | Discovery only. Emits `discovered`; the XML payload of UDP datagrams is never parsed into state (`server.ts:667-683` subscribes only to `discovered`). |
| TCP :27333 | `SRV/sources/TcpSource.ts` | **The real feed.** Pipe-delimited stream (`:117-125`) carrying `OnCourse`, `Results`, `TimeOfDay`, `RaceConfig`, `Schedule`. Also the write channel for Scoring / PenaltyCorrection / RemoveFromCourse / Timing (`:171-197`). |
| XML file → state | `SRV/sources/XmlFileSource.ts` → `server.ts:737` | Emits whole-file contents; parses to `unknown` and is discarded. See `EVIDENCE.md` Exhibit 4. |
| XML file → services | `SRV/xml/XmlChangeNotifier.ts`, `SRV/service/XmlDataService.ts` | Live. Section-level MD5 change detection; lazy reads with 5 s TTL serving all `/api/xml/*`. |

There is **no CIS/HTTP ingest**. The richest upstream interface (`DOMAIN-FACTS.md` §2) is unused.

**State.** `SRV/state/EventState.ts` (301 lines) is the aggregate, fed exclusively by TCP.
`processMessage` (`:54-82`) dispatches by type; `updateOnCourse` (`:130`), `updateResults`
(`:189`), `onFinish` (`:222`), `setHighlight` (`:230`). Its one explicit precedence rule accepts
results whose C123 `Current="Y"` flag is set, else those matching the `currentRaceId` derived from
OnCourse, and discards the rest (`:189-217`) — replacing the whole results object wholesale, with
no per-competitor merge.

**Outputs.**

| Surface | File | Character |
|---|---|---|
| `/ws` | `SRV/ws/WebSocketServer.ts`, `ScoreboardSession.ts` | Reshaped upstream messages, largely uninterpreted |
| `/api/*` | `SRV/unified/UnifiedServer.ts` (**3764 lines**) | REST over XML-derived data, config, client management, checks |
| `/` | `SRV/admin/AdminServer.ts` | Operator SPA |
| push | `SRV/live/LivePusher.ts`, `LiveClient.ts`, `LiveTransformer.ts` | Interpreted — the only reconciling path (`EVIDENCE.md` Exhibit 3) |

**Other subsystems.** `SRV/checks/` penalty-verification persistence with its own fingerprint;
`SRV/config/` persisted settings and Windows detection; `SRV/tray/` Windows tray and
notifications.

**Documentation that is part of the problem.** `docs/SCOREBOARD-REQUIREMENTS.md` (540 lines) and
`docs/INTEGRATION.md` (1118 lines) instruct clients how to interpret server data — "How to
Detect", "Implementation Options", "Recommended Timing Constants", "Handling Empty Objects",
"OnCourse Penalty Grace Period". The server publishes recipes rather than results.

---

## c123-scoreboard — venue display

React SPA on a Raspberry Pi. Abstracts its input behind a `DataProvider` interface with three
implementations: `SB/providers/C123ServerProvider.ts` (primary, WebSocket), `CLIProvider.ts`
(legacy), `ReplayProvider.ts` (recordings).

Between the socket and the screen sit two layers of interpretation. `SB/providers/utils/`
translates and decides: `br1br2Merger.ts` (456 lines), `c123ServerMapper.ts` (281),
`parseGates.ts`, `detectFinish.ts`, `normalizeCompetitor.ts`, `messageHandlers.ts`,
`validation.ts`. Then `SB/context/ScoreboardContext.tsx` decides again in its reducer — results
race-filtering (`:191-217`), pending-highlight freshness (`:234-265`), grace-period eviction
(`:366-374`), stale eviction (`:406-416`), current competitor as oldest non-finished (`:430-443`),
`activeRaceId` derivation (`:447-456`), results wipe on category change (`:477-482`), and its own
inline finish detection (`:514-527`).

Display lifetime rules live in `SB/context/constants.ts:10-44`. Two-run merging has its own
design document, `docs/SolvingBR1BR2.md` (237 lines).

---

## c123-penalty-check — tablet verification

React SPA on tablets, used by judges to compare digital penalties against paper protocols.
**Reads** over WebSocket (`PC/hooks/useC123WebSocket.ts`), **writes** over REST
(`PC/services/scoringApi.ts` → `POST /api/c123/scoring`, `remove-from-course`, `timing`).

Its own interpretation lives in `PC/utils/gates.ts` (a second, incompatible gate parser — Exhibit
2), `PC/utils/verification.ts`, `PC/hooks/useSchedule.ts`, `PC/hooks/useGateGroups.ts`,
`PC/hooks/useChecks.ts`. Verification state is persisted server-side via `SRV/checks/`, keyed by a
fingerprint that differs from `EventState`'s (Exhibit 7).

It is the only component that **writes** to C123. Writes race with reads: a corrected value is
echoed back later through a push whose timing nobody controls.

---

## c123-live-mini — cloud tier

npm-workspaces monorepo. `LM/server` is Fastify + SQLite (Kysely, repository pattern) on Railway;
`LM/client` is a mobile-first React app for spectators. No admin UI — administration happens
through c123-server.

**Ingest.** Four HTTP channels, all authenticated by `X-API-Key`, with the event resolved *by API
key* rather than by id — deliberately (`LM/server/src/services/IngestService.ts:90-92`). XML
debounced 2 s, OnCourse throttled to 10 Hz, Results debounced 1 s per race, one push in flight per
channel, circuit breaker at 3 failures → 3 s lockout (`SRV/live/LivePusher.ts:53-62`, `:430`,
`:483`, `:586`, `:719-727`).

Each channel arrives at a different level of interpretation: **XML raw** (re-parsed by live-mini's
own independent parser), **OnCourse reshaped** (units converted, `participantId` injected from a
bib↔race map, unmapped rows dropped), **Results interpreted** (the BR2 repair of Exhibit 3).

Schedule, RaceConfig, TimeOfDay, highlight and checks/flags exist upstream and are **never
pushed**. The results channel is a single-race stream, because `EventState` filtered it upstream
before live-mini ever saw it.

**Its own domain model.** Thirteen migrations defining `events`, `classes`, `categories`,
`participants`, `races`, `results`, `courses`, `ingest_records`. It recomputes ranking and
category placement itself rather than using the values sent to it (Exhibit 9), and decides event
lifecycle status in `EventLifecycleService.ts` while c123-server decides its own in
`SRV/live/deriveEventStatus.ts`.

It is closer to an independent domain model fed from upstream than to a cache of one.

---

## The shape of the problem, stated neutrally

Five deployable pieces. One upstream system with several unequal interfaces. Interpretation
happens in at least four places — `EventState`, `LiveTransformer`, each client's mapper layer, and
live-mini's ingest and services — with no shared vocabulary, no shared notion of time, and no
mechanism by which two of them could be found to disagree.
