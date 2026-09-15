# Evidence — Where Interpretation Lives Today, and Where It Disagrees With Itself

Ten exhibits from the current code. Each is a concrete, cited symptom. The design being
commissioned will be judged on whether it makes these impossible, not merely fixed.

Every claim carries a `file:line` reference, valid as of 2026-09-15. The most load-bearing ones
(1, 2, 3, 4, 5) were verified directly against the code and, where behavioural, executed. The
others come from an audit pass and are cited but not individually re-executed — dispatch a scout
if a decision turns on one.

Repository prefixes: `SRV/` = `c123-server/src/`, `SB/` = `c123-scoreboard/src/`,
`PC/` = `c123-penalty-check/src/`, `LM/` = `c123-live-mini/packages/`.

---

## Exhibit 1 — There is no model of time. Not a weak one; none.

| Fact | Location |
|------|----------|
| Every outbound message's `timestamp` is minted at serialisation: `new Date().toISOString()` | `SRV/protocol/factory.ts:26-28` |
| `dtStart` / `dtFinish` — the only real event times C123 provides — are stored as opaque strings | `SRV/protocol/xml-parser.ts:195-196` |
| Those strings are never parsed or compared, only tested for presence | `SRV/state/EventState.ts:136` |
| No sequence number exists on any message type | `SRV/protocol/types.ts:246` |
| Ordering is therefore raw TCP arrival order off the pipe splitter | `SRV/sources/TcpSource.ts:117-125` |

Nothing reorders, buffers, or rejects a late message. The `timestamp` on the wire answers *"when
did the server serialise this"*, which is not a question any consumer is asking.


**Verified exhaustively.** Every `timestamp:` assignment on every outbound message was enumerated:
the seven factories (`SRV/protocol/factory.ts:36,47,58,69,80,95,110`), thirteen inline sites in
`SRV/unified/UnifiedServer.ts` (`:461,491,529,587,640,664,677,745,809,850,904,923,2213`), and
`SRV/ws/ScoreboardSession.ts:366`. The single apparent exception, `LogEntry`
(`UnifiedServer.ts:558`), carries a timestamp minted server-side at log creation
(`SRV/utils/LogBuffer.ts:89`) — a different reading of the same server clock, not upstream time.
**No outbound message anywhere carries a timestamp derived from Canoe123 data.** This can be
stated categorically.

Three consequences follow directly from arrival-order-only sequencing:

- **Out-of-order Results silently revert the race.** `Results` replaces the whole object
  (`SRV/state/EventState.ts:193,208`) with no per-competitor merge, so a late message reinstates
  old ranks and deletes rows that had appeared.
- **Two concurrent races sharing a bib collide.** `OnCourse` is last-seen-wins keyed on `bib`
  alone, not `bib:raceId` (`SRV/state/EventState.ts:41,143`). Kayak Cross runs four competitors at
  once (`DOMAIN-FACTS.md` §8).
- **A finish can be missed entirely.** Detection compares only against the immediately previous
  snapshot (`SRV/state/EventState.ts:136`, rebuilt `:172-176`). If `dtFinish` and the competitor's
  disappearance arrive in the same message, no finish event ever fires.

**Why it matters:** "assembling the correct temporal sequence" is not a hard problem being solved
imperfectly here. It is not attempted. Every component that needs ordering invents a proxy for it,
and each invents a different one. This is the root from which most other exhibits grow.

**What the design must answer:** whether this system needs its own notion of event time, what it
would be a function of, and what becomes possible once it exists.

---

## Exhibit 2 — The same gate string, parsed two incompatible ways

C123 encodes per-gate penalties in two formats: comma-separated in OnCourse
(`"0,0,0,2,0,0,2,0,50,,,,,,"`) and fixed-width space-padded in Results (`"  0  0  2  0  0  0 50"`).

`SB/providers/utils/parseGates.ts:36` splits on `/[,\s]+/` and **drops empty entries**;
`getPenaltyGates` (`:79-91`) then derives the gate number from array position, `i + 1`.
`PC/utils/gates.ts:17-32` sniffs the format and, for fixed-width, reads 3-character blocks,
**preserving blanks as `null`**.

**Measured against real race data**, not reasoned about: 575 distinct `Gates="…"` strings pulled
from a recording of an actual race (`c123-protocol-docs/recordings/.cache/2026-04-19-jarni-ne-do/`
— 329 comma-format from `<OnCourse>`, the remainder fixed-width from `<Result>`), with both parsers
transcribed verbatim from source and run over the corpus. Three distinct failures, all present in
real data:

**(a) The scoreboard mislabels gate numbers — 26 of 329 real OnCourse strings.**

```
gates : 0,0,0,0,0,,0,0,0,0,0,2,0,0,0,2,0,0     ← gate 6 not judged
truth : gate 12 = +2,  gate 16 = +2
shown : gate 11 = +2,  gate 15 = +2            ← off by one

gates : 0,0,0,,,,0,0,0,0,0,2,,,,,,
truth : gate 12 = +2
shown : gate  9 = +2                            ← off by three
```

**(b) On the fixed-width Results format the scoreboard is wrong on 239 of 242 strings.** Leading
unjudged gates are dropped rather than preserved, so `"           0  0  2 …"` — gates 1-3
unjudged — has its +2 reported at **gate 3** when it belongs to **gate 6**. This is the common
case, not an edge case.

**(c) The same row yields a different gate number depending on which transport delivered it.**
Penalty-check parses the fixed-width format correctly over WebSocket, but on the REST path
`PC/services/resultsApi.ts:70` trims the leading spaces and `PC/utils/gates.ts:42-44` restores at
most two characters — so one row parses as **gate 1 over REST and gate 4 over WS**. 4 of 242 real
strings do this, and `PC/App.tsx:271` takes whichever source arrived first.

For orientation, the mechanism on synthetic input:

```
input  "0,0,0,2,0,0,2,0,50,,,,,,"   (OnCourse)
  scoreboard    → gate 4: +2, gate 7: +2, gate 9: +50
  penalty-check → [0]                     ← whole string collapses to one clean gate

input  a blank at gate 2
  scoreboard    → penalty reported at gate 2      ← shifted by one
  penalty-check → penalty reported at gate 3      ← positionally correct
```

The scoreboard's own doc comment at `SB/providers/utils/parseGates.ts:15-16` states that an empty
between separators means `null`, not yet passed. The code six lines below filters it away.
**Contract and implementation contradict each other inside one file.**

Downstream, `SB/utils/getGateClass.ts:24-28` maps `null`/`0` to no styling, `2` to a touch, and
**everything else** to a 50-second miss. Penalty-check keeps the raw number.

**Resolved:** all 329 comma strings collapse to `[0]` in penalty-check — length 1 where truth is
18 — because `parseResultsGatesString` has no comma branch at all and `parseInt("0,0,0,…")` stops
at the first comma. This is **latent rather than live**: penalty-check stores `OnCourse.gates`
(`PC/hooks/useC123WebSocket.ts:157`) but nothing currently consumes it. The first feature that does
will silently receive a single clean gate.

**A third reading exists.** `SRV/unified/UnifiedServer.ts:3341-3353` parses the XML `Gates` field
directly for the `/api/checks` gate lookup, bypassing both client parsers and the live
transformer. Three independent readings of one field, in three components, none aware of the
others.

**Why it matters:** a penalised gate is among the most elementary facts this system knows, and two
applications do not agree on it. Neither is careless — each handles the format it happened to see.
What is missing is a place where the meaning of that string is settled once.

---

## Exhibit 3 — The only cross-source reconciliation runs on one of two outbound paths

`SRV/live/LiveTransformer.ts:201-220` holds the system's sole explicit precedence rule across
sources, for second-run penalties:

```ts
if (cached !== undefined) {        // 1: OnCourse penalty cache (10 s TTL)
  pen = Math.round(cached.pen * 100); total = time != null ? time + pen : null;
} else if (xmlRow?.pen != null) {  // 2: XML file
  pen = xmlRow.pen * 100; total = time != null ? time + pen : null;
} else if (tcpConsistent) {        // 3: TCP as-is
} else { /* pass TCP through knowing pen/total are BR1 values */ }
```

Three properties, each significant:

**It infers corruption arithmetically.** `isTcpConsistent` (`:297-303`) decides whether upstream
data is trustworthy by testing `Math.abs(tot - (t + pen)) < 0.02`. A missing signal from C123 is
replaced by a floating-point guess.

**It runs only for the live-mini push.** Confirmed by call-graph: every caller of
`transformResults`, `transformOnCourse` and `onCoursePenCache` sits inside `SRV/live/LivePusher.ts`
(`:730`, `:673`, `:448`); nothing outside `live/` touches them. The WebSocket path never reaches
the transformer — `SRV/server.ts:872-893` broadcasts the raw parser output, whose `pen` is
`parseInt(resultT['@_Pen'])` straight off the wire (`SRV/protocol/xml-parser.ts:281`), wrapped by
`createResults` and fanned out unchanged.

So in a second run where the first run was better, at one instant: **live-mini shows the corrected
penalty while every scoreboard and the penalty-check tablets show Canoe123's best-run value.** Not
a race condition — the designed behaviour of two egress paths that do different amounts of work.

**The duplication is documented in the code.** Line 217:

```
// Matches scoreboard fallback: onCoursePen ?? cache ?? result.pen
```

The author knew the scoreboard already implemented this rule and wrote a second implementation of
it in the server for a different egress path.

**Why it matters:** this is the clearest statement in the codebase that the system lacks a single
place where truth is determined. The comment is an admission.

---

## Exhibit 4 — A source wired into state that contributes nothing, unnoticed

`SRV/sources/XmlFileSource.ts:142-156` reads the whole XML file and emits it as a message. It
first validates `content.includes('<Canoe123')` (`:145`) — which **passes**, because the file root
`<Canoe123Data>` contains that substring. `SRV/server.ts:737` routes it to `handleXmlMessage`;
`SRV/protocol/xml-parser.ts:37` looks for `doc.Canoe123`, finds nothing, returns
`{type:'unknown'}`, and `SRV/server.ts:854` discards it.

The source is registered as a first-class source via `registerSource('XML File', 'xml', …)`
(`SRV/server.ts:733`) and reports healthy in the admin UI. It has exactly one consumer, and that
consumer throws its output away.

The file itself is *not* unused — `SRV/xml/XmlChangeNotifier.ts:136-202` and
`SRV/service/XmlDataService.ts` both read it for change detection and the REST surface. What is
dead is only its path into `EventState`. Nothing visibly broke, so nobody noticed.

**Why it matters:** when there is no definition of what should hold, you cannot detect that one of
your sources stopped contributing. It passed its own validation and reported healthy while
delivering nothing.

---

## Exhibit 5 — `null` is silently destroyed at the cloud boundary

`c123-server` sends `dtStart: string | null` and `time: number | null`
(`SRV/live/types.ts:65-66`). live-mini's ingest schema declares `dtStart: {type:'string'}` and
`time: {type:'integer'}` — **non-nullable** (`LM/server/src/schemas/index.ts:548,550`). Fastify
compiles schemas with `coerceTypes: 'array'`
(`@fastify/ajv-compiler/lib/default-ajv-options.js`).

Executed with the project's own ajv options:

```
sent     {"bib":9, "dtStart":null, "dtFinish":null, "time":null, "pen":0}
validates true            ← no error, no warning
stored   {"bib":9, "dtStart":"",   "dtFinish":null, "time":0,    "pen":0}
```

`dtFinish` survives as `null` because its schema correctly declares `['string','null']`.
The author handled nullability on one field and missed the adjacent one. The distinction between
*has not started* and *started, time zero* is lost, and the loss is reported as success.

**Why it matters:** the producer's types and the consumer's schema are two unsynchronised
statements of the same contract, and where they disagree the transport quietly resolves it. The
design must say what a contract is and how both ends can be held to one.

---

## Exhibit 6 — Two definitions of "finished", one of them dead

`SB/providers/utils/detectFinish.ts:14-38` defines the finish rule: previous `dtFinish` empty,
current non-empty, same bib. It is exported at `SB/providers/utils/index.ts:3` alongside
`isOnCourse` and `hasFinished` — and is consumed by **nothing outside its own test**.

The live rule is re-implemented inline in the reducer:

```ts
// SB/context/ScoreboardContext.tsx:514-527
for (const curr of newOnCourse) {
  const prevComp = state.onCourse.find(c => c.bib === curr.bib)
  if (prevComp && !prevComp.dtFinish && curr.dtFinish) { ... break }
}
```

Both derive from the recipe published in `c123-server/docs/SCOREBOARD-REQUIREMENTS.md` §1 and
`docs/INTEGRATION.md` §"Finish Detection" — documents in which the server tells clients how to
interpret its data instead of interpreting it.

**Why it matters:** the tested, exported, documented definition is not the one that runs. Fixing a
finish-detection bug in the obvious place would change nothing observable.

---

## Exhibit 7 — Three fingerprints for "is this the same event", none agreeing

| | `EventState.createScheduleFingerprint` | `checks/fingerprint.computeScheduleFingerprint` | `XmlMismatchDetector.computeXmlFingerprint` |
|---|---|---|---|
| source | TCP `Schedule` | XML `Schedule` | XML |
| ordering | by `order` (`EventState.ts:94`) | sorted tokens (`fingerprint.ts:31`) | by `raceOrder` (`:170-179`) |
| token | `raceId` | `raceId@YYYY-MM-DD` (`fingerprint.ts:30`) | — |
| comparison | exact (`EventState.ts:112`) | ≥50 % overlap, `SAME_EVENT_MIN_RATIO = 0.5` (`fingerprint.ts:11,57-67`) | — |

The third carries a comment claiming it mirrors `EventState`; it does not mirror
`checks/fingerprint`. One of the three decides event identity by **fuzzy match at a 50 % threshold**.

**Why it matters:** event identity is a domain concept with three implementations and no owner.

---

## Exhibit 8 — Identity derived by parsing strings

`SB/utils/raceUtils.ts` establishes run, class and category identity by picking apart `raceId`:
run via substring `_BR2_` / `_BR1_` (`:20-32`), class via `/^(.+)_BR[12]_/` (`:58-62`), category
via the text before the first `_` (`:101-105`). `SB/providers/utils/c123ServerMapper.ts:194-214`
goes further and appends a **Czech** display string, `" - N. jízda"`, from a regex on the same id.

Meanwhile `SRV/state/EventState.ts:166` and `:199` both write `currentRaceId`, with no tiebreak —
whichever message arrives last wins, and each emits `raceChange`.

**Why it matters:** identity is structural information encoded in a string, re-derived by each
consumer, with presentation language leaking into the derivation.

---

## Exhibit 9 — Fields computed upstream, sent, ignored, and recomputed downstream

`c123-server` sends `catId`, `catRnk`, `totalBehind`, `catTotalBehind`
(`SRV/live/types.ts:101-104`). They are absent from live-mini's `LiveResultInput`
(`LM/server/src/types/ingest.ts:4-18`) and dropped (`ResultIngestService.ts:86-95`); live-mini
recomputes them itself.

In the other direction, `total`, `rank`, `ttbDiff`, `ttbName` on the on-course payload
(`SRV/live/types.ts:68-71`) are **not in live-mini's schema at all**, survive only because
`additionalProperties: false` was never set, and *are* consumed (`OnCourseStore.ts:50-53`).
A whole `gates: [{gate,time,pen}]` ingest branch exists for data that is never sent
(`ResultIngestService.ts:72-84`, versus `LiveTransformer.ts:223-236`).

The XML file is pushed **raw** (`SRV/live/LivePusher.ts:624-630`) and re-parsed by live-mini's own
independent parser (`LM/server/src/services/xml/`) — a second XML parser for the same file.

**Why it matters:** the contract is partly ignored, partly accidental, and partly dead. Ranking is
computed in two places. A field's survival depends on the absence of a schema keyword.

---

## Exhibit 10 — Domain precedence decided inside a display mapper

`SB/providers/utils/c123ServerMapper.ts:122-139` decides whether a competitor shows a time or a
status: **time wins** — any `total` other than `''`, `'0'` or `'0.00'` suppresses DNS/DNF/DSQ.
`:160` reads "under investigation" from `status === '*'`. `:179-181` reduces a 14-value
`RaceStatus` vocabulary (`DOMAIN-FACTS.md` §7) to two strings: `isCurrent ? "In Progress" :
"Unofficial"`. `:88` decides who is "actually on course" by dropping rows whose `dtStart` is
empty. `:97-106` guesses whether a message is partial or full by comparing `data.total` against
the number of survivors, and merges or replaces accordingly.

Alongside, `SB/providers/utils/messageHandlers.ts:64-80` duplicates, byte for byte, the
"who is current" rule from `c123ServerMapper.ts:49-63`.

**Why it matters:** five domain rulings live in a file whose stated job is to reshape a message
for display, and one of them is copy-pasted. A reader looking for the rules would not look here.

---

## What these ten have in common

Not carelessness. Each is a locally reasonable decision made by someone who needed an answer and
had nowhere to look it up. The system has no place where the answer lives, so every component
became its own authority — and authorities that never meet cannot be found to disagree.

That is why debugging is endless: there is nothing to debug *against*.
