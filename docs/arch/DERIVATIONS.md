# Derivations — From Source to Contract

`CONTRACTS.md` §6 says *whether* a value is derivable. This document says *how*: the actual
transformation, precise enough to implement without re-reading `DOMAIN-FACTS.md`, and precise enough
that writing it down can show a claimed derivation does not work. Every derivation is stated four
ways:
1. the **source expression**;
2. its **conditionality**;
3. the **resulting envelope**;
4. the **failure mode**.

**Consolidated revision, 2026-09-24.** Rewritten after the reverse pass, which checked every field
Canoe123 emits on TCP, in the XML snapshot and on CIS, and after a latency measurement. The previous
version read three TCP fields that do not exist or are never filled. It sliced result gate strings by
the wrong width, gave no XML units, and derived the Cross order from `Time`. §8 records what changed.

**Scope.** §1–§6 cover every value the contract asserts. **§9 covers every upstream field the
contract does *not* model, and why.** A field in neither place is a gap, and should be reported.
Behaviour described as "observed upstream behaviour" was checked against the decompiled upstream
source or recordings. That source is never quoted or named here.

---

## 0. Conventions every derivation relies on

**Notation.**
- **TCP.** `OnCourse.<attr>`, `Results.<attr>`, `Schedule.<attr>`, `RaceConfig.<attr>` and
  `TimeOfDay` are the TCP push messages. `OnCourse` has attributes on its root and on its two
  `Result` children, `[C]` and `[T]`.
- **XML.** `XML.<Table>.<Column>` is the snapshot file.
- **Targets.** `«phaseId,bib»` is the Attempt targeted.
- **"Result push"** means a TCP `Results` message for one race. It is either:
  - **event-driven** (`Current="Y"`), sent immediately whenever upstream recalculates that race's
    ranking; or
  - **rotation** (`Current="N"`), sent for one race every ~30 s, cycling through every race, so a
    given race comes round only every few minutes (median 280–355 s, worst 920 s, measured).

  Only event-driven pushes matter for latency. Both are ordinary observations for merge.

### 0.1 Units and normalisation

| Quantity | TCP | XML snapshot | Contract |
|---|---|---|---|
| run time, total | formatted seconds, 2 dp (`"82.36"`); running time is whole seconds, space-padded | integer **milliseconds** (`84190`) | seconds, decimal |
| penalty | integer seconds | integer seconds | seconds |
| second-run combined total | `Results.Total` on the second run's row | `TotalTotal`, ms | seconds |
| time of day (start, finish, split) | `H:MM:SS.fff`, no date | `H:MM:SS.fff`, no date | `eventTime` via §0.2 |
| gate penalties on a result row | fixed width, §4.6(b) | fixed width, §4.6(b) | `Gate[]` |
| bib | padded to 4 chars in `Results`; unpadded in `OnCourse` | padded in some files | trimmed string |
| "behind" gaps | pre-formatted strings | pre-formatted strings | not relayed; derived (`CONTRACTS.md` §5) |

**Normalise once, at ingest.** Trim every bib. Divide XML milliseconds by 1000. Treat an empty
attribute as absent, never as zero.

### 0.2 `eventTime` construction

Every upstream event time is a bare time of day on Canoe123's timing clock. The construction is:
`eventTime = Phase.date + time of day + the venue's configured zone offset`.
- The result is expressed on Canoe123's own clock. It is never shifted to the server clock:
  Canoe123's clock is the official time, and the contract never compares `eventTime` with
  `observedAt`.
- A race crossing midnight is not handled, and is not a real case.
- **Failure mode:** no configured zone means `eventTime` is omitted, never guessed.

### 0.3 Ingest filters

These are never domain entities:
- **The staged-without-race sentinel.** On-course rows or result rows with `RaceId="<unassigned>"`
  (with empty `Id` and `Name` on TCP) never become a Phase or an Attempt. The snapshot also has a
  pseudo-schedule row of the same name.
- **The pseudo-class `NA`**, "not entered or assigned".
- **Row-number, print, finance and UI columns** (§9).

---

## 1. Class

- **`classId`, `code`.**
  - Source: `XML.Participants.ClassId` / `XML.Schedule.ClassId`, or `Results.ClassId` on TCP, used
    verbatim.
  - **Never the `RaceId` prefix.** For a hyphenated class the two differ (`K1M-ST` against
    `K1M_ST`).
  - Envelope: `source` is the channel; `confidence: 'authoritative'`; no `eventTime`.
  - Failure mode: `not-yet` until first seen.
- **`name`.**
  - Source: `XML.Classes.Class`, with `Results.MainTitle` as a TCP fallback. Upstream falls back to the
    class id itself when no title is set.
  - This is organiser-authored text, carried verbatim (`CONTRACTS.md` §1.3). `LongTitle` is not
    modelled (§9).
- **`discipline`.**
  - Source: `'cross'` if any Phase of the class has a Cross format (`X8/X4/XS/XF/XT/XT1/XT2/XER`),
    otherwise `'slalom'`.
  - Envelope: `confidence: 'inferred'`, because it is read off the phase structure.
  - **Do not use `XML.Events.CanoeDiscipline`.** It reads `Slalom` for a recorded Kayak Cross event.
- **`ageCategories`.**
  - Source: `XML.Classes/Categories` rows for this class, each giving `CatId` and `Category` (the
    name).
  - A class with no rows gives an empty list, which is a valid `known` value.
  - The age bounds (`FirstYear`/`LastYear`) are not modelled (§9).

---

## 2. Phase and Course

### 2.1 Phase identity and structure

- **`phaseId`** is `RaceId`, verbatim.
- **`format`.**
  - Source: `XML.Schedule.DisId`. On TCP, fall back to the `RaceId` token between the class and the
    day number, because **TCP `Schedule` has no `DisId` attribute**.
  - An attribute sub-race carries a suffix (`WX1J_XT_26_JUN`). The token is still the part before the
    day number.
- **`kind`, `scoringKind`, `pair`, `heats`.**
  - These come from `CONTRACTS.md` §2.4's token table, a lookup with no uncertainty, so
    `confidence: 'authoritative'`.
  - `pair.siblingPhaseId` is the Phase with the same `classId` and the first-run token. When several
    exist, take the one with the same schedule date. This mirrors upstream's own pairing behaviour.
- **`date`.**
  - Source: the date part of `XML.Schedule.StartTime`, a full date-time with offset. Envelope:
    `source: 'xml'`, `confidence: 'authoritative'`.
  - Fallback before the snapshot is read: the date of the first observation of any kind for this
    `RaceId`, with `confidence: 'inferred'`.
  - **TCP `Schedule` has a `StartTime` element, but upstream always emits it empty.** It is never a
    source.
  - Assigned once, never re-derived (INV-5).
- **`scheduledStart`** is the same `XML.Schedule.StartTime`, whole.
- **`programmeOrder`** is `XML.Schedule.RaceOrder`, or `Schedule.Race@Order` on TCP.
- **`title`** is `XML.Schedule.CustomTitle`, the organiser's own race title. Where it is empty the
  field is `not-yet`. Upstream's generated, localised titles (`Race`, `SubTitle`, `ShortTitle`) are
  never carried (§9).
- **`courseId`** is `XML.Schedule.CourseNr`. It is XML only: no TCP message carries a course number.
- **An attribute sub-race** (Cross juniors: `XML.Schedule.AttributeId`, with `XML.Attributes` giving
  its description) is relayed as the Phase's own class, which upstream derives (`MX1J`). The link to
  its base class is not stated upstream (§10).

### 2.2 `status`

- Source: `Schedule.Race@RaceStatus` on TCP, the only TCP carrier (`RaceConfig` has no status), or
  `XML.Schedule.RaceStatus`.
- It is mapped through `CONTRACTS.md` §3.1's table.
- Envelope: `confidence: 'authoritative'`.
- Upstream sets race status only by direct operator action. It never tells us whether results
  underneath changed.

### 2.3 Course (#165)

- **`courseId`, `layout`.**
  - Source: `XML.CourseData.CourseNr` and `CourseConfig`: one character per course element.
- **Parse the layout.**
  - `N` is a downstream gate and `R` an upstream gate. Gates are numbered 1.. in order.
  - `S` ends a sector: record the number of the gate before it.
  - `I` is a split point: record the gate before it.
  - `D` and `E` are carried in `layout` only; their effect on numbering is open (§10).
- **Refresh from TCP.**
  - `RaceConfig.GateConfig` is the currently selected course's layout. TCP strips the `S` markers.
  - `RaceConfig` gives no course number. Use it only to refresh the course of the currently running
    Phase.
  - `RaceConfig.GateCaptions` gives `captions`. Captions are TCP only.
  - `RaceConfig.NrSplits` says whether splits are armed. Zero means no split times will come.
- **Ignore upstream's transmitted gate count** (`RaceConfig.NrGates`). The stream substitutes 30 when
  no course configuration is attached, and 25 for a slalom course with an empty layout. Neither is
  marked as a fallback.
- **Detect a fabricated course.** Upstream fabricated the course when any of these holds:
  - the gate string is empty while the count is non-zero;
  - the captions are empty while the gate string is non-empty;
  - the string's gate count differs from the transmitted count.
- **Failure mode:** an empty layout, or a fabricated one, gives `unavailable{reason:'not-configured'}`
  for `gates`. The same applies to every Attempt's `gates` on that course.

---

## 3. Entry

- **`entryId`** is `XML.Participants.Id`, or `Participant@Id` on TCP, used verbatim and **never
  parsed** (#171). Where `XML.Events.IDHandling` is `USER`, the operator typed the id by hand. That is
  where the non-conforming ids come from, and one more reason not to parse it.
- **`displayName`** is the pre-assembled `Participant@Name` on TCP, in the form `FAMILY Given`, or
  `FAMILY Given/FAMILY2 Given2` for a crew. For a team it is the team's `FamilyName`.
- **`members`.**
  - A single boat or crew comes from `XML.Participants`: `GivenName`/`FamilyName`/`Birthdate`/
    `ICFId`, then `GivenName2`/`FamilyName2`/`Birthdate2`/`ICFId2` when present.
  - A team (`IsTeam`) comes from `Member1..3`. These are participant `Id`s in the XML. Resolve each
    against the participants index **by whole-string match**, never by parsing.
  - On TCP, `Results.Member1..3` are already resolved to display names, and are emitted only when set.
    Use them only as a pre-snapshot fallback for display. They never give identity.
  - A team's own `ICFId` is synthetic and not carried.
- **`externalId`.**
  - `value` is `ICFId`, or `ICFId2` for the second member, from the snapshot only: **TCP carries no
    registry number.**
  - `scheme` is supplied by bridge configuration, never derived (`CONTRACTS.md` §6, [N]).
  - When the element is absent, `externalId` is `null`, which maps to `unavailable{not-applicable}`.
- **`birthDate`.**
  - Source: `Birthdate`, as entered. Many organisers enter only the year, as `YYYY-01-01`.
  - The on-site serialisation derives `birthYear` from it, falling back to `XML.Participants.Year`.
- **`club`.**
  - Source: `XML.Participants.Club`, or `Results.Participant@Club` on TCP.
  - **Never from `OnCourse.Participant@Club`.** Upstream's on-course stream blanks club and nation
    according to `XML.Events.ClubUsage`, and the results stream does not.
- **`nation`** is `XML.Participants.NOC` or `Results.Participant@Nat`, with the same rule as `club`.
- **`ageCategoryId`** is `XML.Participants.CatId`. It is empty where the class has no categories,
  which gives `unavailable{not-applicable}`. The age category is never computed from the birth year.
- **`eventBib`.**
  - Source: `XML.Participants.EventBib`, trimmed, where `XML.Events.BibHandling` is `EventWide`.
  - With `Startlist` bib handling it is `unavailable{not-applicable}`: bibs are issued per race.
- **Do not read `_Bib` as a bib.** It is an organiser-imported value that looks like one (§9).

---

## 4. Attempt

**Identity.** `bib` is `Results.Participant@Bib`, `OnCourse.Participant@Bib` or `XML.Results.Bib`,
trimmed. `attemptId` is `${phaseId}:${bib}`. The Attempt exists from the first row that names it,
which may be a start-list row a day ahead.

### 4.1 `status` and result marks

**The slalom finish.**
- Track `OnCourse.Result[C]@dtFinish` per `«phaseId,bib»` as internal state.
- On the first on-course message where it becomes non-empty, `status → 'finished'`, with `eventTime`
  from §0.2 and `confidence: 'authoritative'`.
- **No fallbacks.**
  - The whole-seconds-to-decimal change in `Time` is not a finish signal. With splits armed, upstream
    shows the 2-decimal split time for a hold period mid-run.
  - The downstream highlight signal is our own derivative, not an upstream message.

**`at-start` and `on-course`.**
- `at-start`: `OnCourse.Result[C]@chStart = 1` with `dtStart` empty. The competitor is armed for the
  start impulse, which is 8% of on-course traffic.
- `on-course`: `dtStart` non-empty and `dtFinish` empty.
- `chFinish` ("armed for the finish impulse") adds nothing to this and is not modelled.

**The on-course list.**
- Every `OnCourse` message carries one participant, its `@Position` (`courseOrder`), and `@Total`,
  the number on course.
- A bare `<OnCourse Total="0" Position="0"/>` with no children is upstream's explicit "course empty".
- An Attempt leaves the list when upstream stops listing it, or on "course empty". This never changes
  its status (`CONTRACTS.md` §7.1).

**Result marks, closed-set mapping.**
- Sources:
  - `Results.Result@IRM` on TCP, where upstream sends the `*` mark as empty;
  - `Results.Result@PP = "*"` on TCP;
  - `XML.Results.Status`.
- The mapping:
  - `DNS`, `DNF`, `CAP`, `RAL`, `DSQ`, `DSQ-R` and `DQB` map to `dns`, `dnf`, `cap`, `ral`, `dsq`,
    `dsq-r` and `dqb`.
  - `NON-RK` maps to `non-ranked`, a finished run excluded from ranking.
  - `*` means `underReview: true`, with the run otherwise `finished`.
  - Empty with a time means `finished`.
  - Any other value maps to `other`.
- **No-results arrive only here.**
  - They come at result-push latency, event-driven, because a removal with a mark recalculates the
    race.
  - The earlier "from `RemoveFromCourse.Reason`" was wrong. That is *our own* terminal command, not a
    message upstream sends.
- **On a second-run row, a mark describes run 2 only.** `placement` and `pairTotal` still come from
  the row. The athlete keeps the combined rank from run 1.

**Envelope.**
- `source` is the channel, with `confidence: 'authoritative'`.
- `provisional` is `false` for `status`. *That* the run finished is final even while its outcome is
  not.

### 4.2 Kayak Cross status and order

- No per-competitor signal exists on the on-course stream: `chStart`, `chFinish`, `dtStart`,
  `dtFinish` and `Completed` never transition per competitor in a heat.
- `status → 'finished'` when this bib's result row gains a placement. That placement is the operator's
  assertion, entered after conferring with the finish judge.
- `source` is the channel it arrived on, with `confidence: 'authoritative'`, no `eventTime` and
  `provisional: false`. It is pushed with no debounce.
- Until then the Attempt stays `on-course`, even after the heat has left the on-course list together.

### 4.3 `outcome` while on course, and between finish and the first result push

**`running`.**
- `elapsedSeconds` is `OnCourse.Result[T]@Time`, whole seconds while running. `penaltySeconds` is
  `@Pen`.
- The value is upstream's own display. It includes a configurable offset, and during a split hold it
  shows the split time. It is relayed as displayed: `confidence: 'authoritative'`,
  `provisional: true`.

**`duration`, the inference.**
- At the finish transition:
  - `runSeconds = OnCourse.Result[T]@Time` (now 2 dp);
  - `penaltySeconds = Σ` of the judged gates in `OnCourse.Result[C]@Gates`, per §4.6(a);
  - `totalSeconds` is their sum.
- **Recompute on every later on-course message** for this `«phaseId,bib»`. In recordings, gate judging
  was still incomplete at the finish for 2–21% of runs, depending on the event, and the total moved by
  up to 50 s afterwards.
- **Stop recomputing** at the first of:
  - (a) a results-table observation for this run generation, which supersedes the inference
    (INV-2, rule 1). In recordings this arrived a median of 0.14–0.41 s after the finish impulse;
  - (b) `OnCourse.Result[C]@Completed = "Y"`;
  - (c) the Attempt leaving the on-course list.
- `Completed` is upstream's own "run closed" mark. It is sent only when upstream auto-completes the
  run, which needs penalties complete, a finish and the configured delay, or when a terminal asserts
  it. A run the operator removes by hand never sends it. So it is a trigger, not *the* trigger.
- **Envelope:** `source: 'tcp'`, `confidence: 'inferred'`, `provisional: true`.

**Failure mode:** `not-yet` before the finish. Never `unavailable`.

### 4.4 `outcome` from a result row

**TCP, single run or the first run of a pair.** `runSeconds = Results.Result@Time`,
`penaltySeconds = @Pen`, `totalSeconds = @Total`.

**TCP, the second run of a pair.**
- `runSeconds = @Time` is run 2's own time.
- `penaltySeconds` is `Σ` over run 2's own `@Gates`, per §4.6(b). `@Pen` and `@Total` on this row
  describe the **counting** run, whichever it is.
- `totalSeconds` is their sum.
- `pairTotal = @Total`.

**XML, any row.**
- `runSeconds = Time/1000`, `penaltySeconds = Pen`, `totalSeconds = Total/1000`.
- Each row is its own run: the second run's row carries run 2's own figures.
- `pairTotal = TotalTotal/1000`, on second-run rows.
- `countingRun = BetterRunNr` (1 or 2; 0 means no pair yet, giving `not-yet`), on second-run rows of
  a `'best'` pair. It is XML only: TCP does not state it.

**Envelope.**
- `source` is the channel, with `confidence: 'authoritative'`.
- `eventTime` comes from `dtFinish` where present.
- **`provisional`** is `true` while the Phase's course has at least one gate blank in this row's gate
  string and the run is not closed. This is what marks a push that upstream sent before judging
  finished: with "ranking with incomplete penalties" on, the first push precedes the last gate.
- **Run closed** means `Completed = "Y"` was seen, or the Attempt left the on-course list, or it
  carries a no-result mark.
- Where the course is not configured, `provisional` stays `true` until the run is closed.

**Conditionality.** An event-driven push follows every finish, every penalty change and every
correction, including to a closed race (observed upstream behaviour). Measured over 1,533 finishes,
every one received a push, a median of 0.14–0.41 s after the finish impulse. The worst case was
27 s, where the finish itself arrived late.

### 4.5 A superseded run's detail

Once run 2 has been run, TCP's second-run row describes run 2's own time and gates, plus the counting
run's `Pen`, `Total` and `Rank`. TCP's first-run row for this athlete is not re-sent unless run 1
itself changes. Run 1's own detail is therefore available:
- **(a) From the XML snapshot, unconditionally.**
  - The first run's own `XML.Results` row is frozen from its finish onward: across 610 snapshots of
    one day it had exactly two byte states.
  - The second run's row also carries `PrevTime`, `PrevPen`, `PrevTotal`, `PrevStatus`, `PrevRnk` and
    `PrevRnkOrder`.
  - A cold read of one day's final snapshot recovered 397 first runs and 384 second runs complete.
  - Envelope: `source: 'xml'`, `confidence: 'authoritative'`.
- **(b) From this server's own retained observation**, if it was running during run 1 (INV-1).

**Failure mode.** `unavailable{source-unreachable | not-configured}` only once run 2 has been observed
and neither path can supply run 1. Before that, the state is `not-yet`. `PrevRnk` in Cross means the
rank in the previous round, not a previous run, and is not modelled (§9).

### 4.6 Gate parsing

**(a) `OnCourse.Result[C]@Gates`.**
- The string is comma-separated, dense, one token per gate: `"0,0,2,,,"`.
- Split on `,`. Token `i` is gate `i+1`. `""` means `null`.
- The width follows upstream's gate count even when that count is fabricated (§2.3). Keep only the
  first `gateCount` tokens of the known course.
- The attribute is omitted entirely when no course configuration is attached.

**(b) `Results.Result@Gates` and `XML.Results.Gates`.**
- The string is fixed-width: **3 characters per cell, 30 cells, whatever the course.**
  - 90 characters in 99.8% of TCP rows at one event, and 578 of 580 snapshot rows on a 23-gate course.
  - Shorter, trimmed strings occur (3, 18, 27, 69 characters).
- Chunk from the left by 3. A missing cell is blank. Trim each chunk; blank means `null`, otherwise
  parse as an integer. Keep the first `gateCount` cells.
- **Never split on whitespace.** That collapses blanks and shifts every later gate: `EVIDENCE.md`
  Exhibit 2.
- The previous rule, `width = length / gateCount`, was wrong on every row of a 23-gate course. On a
  9-gate Cross course it divided evenly as width 10, which is silently wrong.

**(c) Team rows.**
- `Gates` holds the per-gate **sum** over the members (52, 100, 150…).
- `XML.Results.Gates1..3` hold each member's cells, in the same fixed-width format, and fill
  `memberPenalties`.

**(d) Kayak Cross.**
- Per-gate marks in Cross are obstacle judgements, not penalty seconds. `gates` is
  `unavailable{not-applicable}` for Cross Attempts.
- `faults` comes from `XML.Results.NrFLT` (the count), `FLT` (`FLT(2,4,5)`, the gate captions) and
  `LastCleanGate`.
- Whether TCP carries the same in Cross is open (§10).

All encodings produce `Gate[]` with exactly the course's gate count. The encoding is recorded only in
`source`.

### 4.7 `placement`, `pairTotal`, `countingRun`, `qualified`, heats

**`placement.rank` and `placement.order`.**

| Row | TCP | XML |
|---|---|---|
| single run, or first run of a pair | `Results.Result@Rank`, `@RankOrder` | `Rnk`, `RnkOrder` |
| second run of a pair (combined) | `Results.Result@Rank`, `@RankOrder` | `TotalRnk`, `TotalRnkOrder` |
| Cross heat | `@Rank`, `@RankOrder` (order within the heat) | `Rnk`, `RnkOrder` |

- On the second-run row, XML `Rnk` is the run-2-only rank. It differed from `TotalRnk` on 93% of rows,
  and is not modelled (§9).
- A single-run tie shares `Rank`, with the sequence in the order field. A combined tie is broken
  upstream by the run that did not count.
- **An empty rank means `rank: null`.** Where an order is present, it is carried.
- **Never read `OnCourse.Result[T]@Rank` as placement.** At the start of a second run it holds the
  first run's rank. It is blank for most first-run finishes.
- **Upstream pushes the second-run race whenever the first run changes.** So a second-run Attempt has
  a combined placement before it is run.
- **Envelope.** `confidence: 'authoritative'`. `provisional` follows §4.4.

**Other fields from the result row.**
- **`ordinal.order`, Kayak Cross.** It is `placement.order`, never derived from `Time`. TCP's `Time`
  in heat rounds is `"1.00"`, `"2.00"`…, and the XML's is in milliseconds. In both, athletes with
  faults are placed after all clean finishers, whatever their finish order: rank differed from finish
  order in 28 of 64 heat rows at one event.
- **`heat`** is `Results.Result@HeatNr` or `XML.Results.HeatNr`. Zero means not applicable.
- **`startLane`.** In Cross heats, upstream's `StartTime` field carries the start lane (1–4), not a
  time.
- **`scheduledStart`.** In slalom, `StartTime` (`H:MM:SS`) is the scheduled start, built per §0.2.
- **`startOrder`** is `@StartOrder`.
- **`qualified`** is `Results.Result@Q` or `XML.Results.Qualified`, equal to `"Q"`. Where the Phase's
  format has no progression, it is `unavailable{not-applicable}`.
- **`underReview`** is §4.1's `*` mark.

### 4.8 On-course extras

- **`courseOrder`** is `OnCourse@Position`: 1 is closest to the finish. It is a property of the
  message, which carries one participant. Slalom showed up to 12 simultaneous positions.
- **`timeToBeat`** comes from `OnCourse.Result[T]@TTBDiff`.
  - An unsigned value (`88.38`) is `mode: 'target'`.
  - A signed value (`+1.23`, `-0.40`) is `mode: 'delta'`.
  - An empty value is `not-yet`.
  - `holder` is `@TTBName`.
  - It is never a rank.
- **`splits`.**
  - Source: `OnCourse.Result[C]@dtSplit1/2`, or `XML.Results.dtSplit1..3`, minus `dtStart`.
  - Only when splits are armed (`RaceConfig.NrSplits > 0`); `unavailable{not-applicable}` otherwise.
  - No recorded event armed splits, so this derivation is source-verified only.

### 4.9 `entry` (the mutable pointer)

- **Initial binding:** the row's `Id`, verbatim.
- **A correction** (the wrong person raced under a bib) is an operator write (`CONTRACTS.md` §8.5). No
  upstream field flags it.

### 4.10 Classification rows (Cross `XER`)

- The classification Phase's `XML.Results` rows, or TCP result rows for that race, feed its
  `classification` Standing directly. They create **no Attempts**.
- `rank` and `order` come from `Rnk`/`RnkOrder`. `decidedIn` comes from `RecordType` (`F`, `SF`,
  `1/2`, `1/4`, `T`).
- Upstream generates these rows from the rounds. They are relayed, never recomputed.

### 4.11 `run` (run generation)

**Upstream evidence of a re-run** (`DECISIONS/ADR-013`).
- Upstream sets `OnCourse.Participant@Warning` to a localised "overwriting results" string when a bib
  is put on course in a race where it already has a result. The text is never carried.
- **The generation increments on:**
  - (a) an on-course observation for this `«phaseId,bib»` with a non-empty `dtStart` different from the
    current generation's recorded start; or
  - (b) a result row for this Attempt observed with `Time`, `Total` and the mark all empty after
    having been known.
- On increment, the run-scoped fields become `not-yet`, and the change is pushed.
- A later result row whose `dtFinish` precedes the new generation's start describes the replaced run.
  It is retained as history and never presented.

---

## 5. `SourceStatus`

- **`tcp.state`, `xml.state`.**
  - A connection state machine: `connected` while the socket or file watch is open and live;
    `reconnecting` while a reconnect is in flight; `unreachable` after a stated number of failures.
  - `xml` is `not-configured` when no path is set.
- **`tcp.upstreamInstance`** is `Canoe123@System` on every message: `Main`, `Backup` or `Offline`.
- **`tcp.timingClockOffsetSeconds`** is `TimeOfDay` (Canoe123's timing clock, once a second) minus the
  server clock at receipt. It is diagnostic only.
- **`xml.lastRewriteDetectedAt`** is the moment a change of the file was last detected. This is what
  INV-2's rule 2 means by "a rewrite detected after the disconnect".

---

## 6. `WriteRequest` echo matching

- **`confirmed`:** a later results-table observation of the same target field, for the same run
  generation, equals `requestedValue`.
- **`mismatched`:** it arrives unequal.
- **`superseded`:** the generation increments first (§4.11).
- The comparison is field-level: a row refreshed for an unrelated reason is not an echo of a different
  field.
- The echo arrives as an event-driven result push, because a correction recalculates the race.

---

## 7. What could not be derived

- **The identity of a multi-day event.** One file per event, or one per day: both must work
  (`CONTRACTS.md` §2.2). The grouping of days is visible from Phase dates. Identity is asserted by the
  bridge.
- **Which registry an external id belongs to** ([N], configuration).
- **The base class of an attribute sub-class** (§10).

---

## 8. Findings — what the consolidated revision changed here

1. **Nonexistent or never-filled TCP fields were read.** Three were corrected: `Schedule.DisId`, which
   does not exist; `RaceConfig.RaceStatus`, which does not exist; and `Schedule.StartTime`, which is
   always empty.
2. **`RemoveFromCourse.Reason` was never an upstream message.** It is our own command. The highlight
   signal is our own derivative. Both are removed as sources (§4.1).
3. **The result-row gate width was derived wrongly.** The width is 3 and there are always 30 cells
   (§4.6(b)). The previous "finding 3", which claimed to avoid a latent bug, had introduced one.
4. **XML units were never stated.** Milliseconds for times, seconds for penalties (§0.1).
5. **The Cross order from `Time/1000` was wrong twice over:** the TCP format, and faults (§4.7).
6. **The Class came from the `RaceId` prefix.** It now comes from `ClassId` (§1).
7. **The registry number was sourced from TCP, which carries none** (§3).
8. **Bib padding and the `<unassigned>` sentinel** now have ingest rules (§0.1, §0.3).
9. **Completed and the stop-recompute rule.** Upstream's own run-closed mark is used, alongside two
   other triggers. The blank-slot heuristic is dropped as a stop signal (§4.3). It stays as the
   definition of *provisional* judging, where it is exact.
10. **The Results cadence is two mechanisms**, event-driven and rotation. The ~30 s rotation carries
    none of the latency-relevant values (§0).
11. **CIS paths removed** (`DECISIONS/ADR-011`). Their facts are all available from TCP or the XML.

---

## 9. Not modelled, and why (appendix)

Every upstream field the reverse pass found and the contract does not carry. "Internal" means print,
finance, UI or start-list-generation scratch. "Never filled" means the field is in upstream's schema,
but no code path or recording ever filled it.

**TCP**

| Field | Why not modelled |
|---|---|
| `OnCourse.Participant@Race`, `Results@SubTitle`, `Schedule.Race@Race`/`@SubTitle`/`@ShortTitle` | Upstream-generated localised labels (`CONTRACTS.md` §1.3). Clients label from `format` |
| `OnCourse.Participant@Warning` | Localised text. Its fact, a re-run, is modelled as `run` (§4.11) |
| `OnCourse.Result[C]@chFinish`, `@chSplit1/2` | Arming flags. `chStart` is used for `at-start`; the others add nothing a consumer needs |
| `OnCourse.Result[T]@Total`, `@Rank` | The running total is `running`'s two parts. The rank is unreliable as placement (§4.7) |
| `Results.Row@Number` | Upstream list position. `order` supersedes it |
| `Results.Result@Behind` | A formatted gap. Derived instead (`CONTRACTS.md` §5) |
| `Results@Current` | Used at ingest as a freshness signal only |
| `TimingInput` (all) | Raw hardware impulses, with no bib |
| `TVS@Odd_Bib`, `@Even_Bib` and their race ids | Upstream's TV featured-competitor choice. Whether the venue board should follow it is an open business question |

**XML snapshot**

| Field | Why not modelled |
|---|---|
| `Participants.Ranking`, `RankingPoints`, `Results.RacePoints`, `Schedule.PointTableNr`, `WorldRanking*`, `IsICFTopEvent` | Federation seeding and points. The design relays no federation numbers today. Revisit on demand |
| `Participants.Year`, `Classes/Categories.FirstYear`/`LastYear` | Inputs to upstream's age-category rule. The resulting `CatId` is relayed. `Year` is only the on-site birth-year fallback |
| `Participants.Gender` | Never filled |
| `Participants._Bib` | **Caution: it is not a bib.** An organiser-imported value (performance class) under a misleading name |
| `Participants.Draw`, `_Participations`, `_EntryFee`, `ArchiveData` | Internal |
| `Classes.LongTitle`, `EntryFee`, `BibDeposit`, `EventId`, `ICFEventCode` | A second title, finance, never filled |
| `CompOfficials` (all) | Officials and free-text misuse. No consumer asked. Revisit on demand |
| `Schedule.Time`, `FirstBib`, `StartInterval`, `JuryNr`, `MaxStarters`, `Progression`, `EndTime`, `ForeRunners`, `ForeStart`, `QualificationInfo`, `RSCCode`, video fields | Start-list generation, internal, or never filled. `MaxStarters` is a Cross quota; progression is relayed through `qualified` |
| `Results.TeamId`, `Forerunner`, `ForerunnerNOC`, `ExtraStartInt`, `IsRanked`, `Selected`, `SelRnk*`, `meta_tag`, `ArchiveData` | Never filled. **Caution: `IsRanked` looks meaningful and is never set** |
| `Results.Rnk` on a second-run row | The run-2-only rank, XML only, ~35 s late. Not needed for any standing. Revisit if a "run-2 rank" column is wanted |
| `Results.TotalBehind`, `catTotalBehind`, `TotalTotalBehind`, `catTotalTotalBehind` | Formatted gaps. Derived instead |
| `Results.CatRnk`, `CatRnkOrder`, `TotalCatRnk*`, `PrevCatRnk*` | Used only as the check against assembled category ranks (`CONTRACTS.md` §5 step 4) |
| `Results.TieBreaker` | Upstream's internal tie key. Its effect reaches us already applied, in the order fields |
| `Results.GateTimes` | **Not gate passages.** Each stamp is the official time at which a judge first entered a penalty for the gate, minus 2 s. Gaps are back-filled in 2 s steps, and the order along the course is only approximately monotonic. If ever needed: `Gate.judgedAt`, `confidence: 'inferred'`, never an `eventTime` |
| `Results.PrevRnk` (Cross meaning), `RoundNr`, `HasWildcard`, `Tag` | Cross ladder bookkeeping. Progression is relayed through `qualified` and the classification |
| `Results.CheckList*`, `_*Order`, `Print*`, `Sector*`, `PrevGates`, `PrevSplit1`, `ForceTVSChannel`, `TVSStream*` | Internal: print copies, paper check-list workflow, TV routing |
| `Events.Description`, `Country`, `NOC`, `TimeMode`, `TimingProvider`, `StartListsLocked`, report and logo fields, `ReportLanguage*`, `RankingOrderMode`, `AssignBibsReverse`, ODF codes, `CatHandling` | Free text, print layout, or never filled. Logos could brand a live page later. **Caution: `CanoeDiscipline` reads `Slalom` for a Cross event** |
| `GateStatistics` (all) | Derivable from `gates`. Always zero for two-run formats in recordings |
| `TeamResults`, `TeamResultsMembers`, `TeamResult`, `RaceParticipations`, `RaceClasses`, `ICFEventAssignment`, `MedalStandings`, `MedalsByEvent`, `GateStats`, `Clubs` | Never present in any sample. `RaceClasses`, if ever used, would break "one race = one class" and would need a new ADR |

**CIS.** Not consumed (`DECISIONS/ADR-011`). Its unique items were:
- live judge-entry gate stamps;
- retained split differences;
- the initialisation session id;
- the scoring-terminal reset flag (§10).

---

## 10. Open technical questions

These are E4: recorded here, not used to make rules.

1. Does the operator's "reset scoring terminals" action reach the terminal channel penalty-check
   already uses? CIS was the only documented carrier.
2. How do the layout letters `D` and `E` affect gate numbering? #165 describes them as variant markers
   that count as gates without advancing the number.
3. Are `RXER`, `SLER` and `WWER` classifications like `XER`? Until checked, they are unknown formats.
4. Upstream has two further pairings: a super-final following a second run, and a final following a
   semi-final under a legacy-finals setting. What combination applies to each?
5. What is the base class of an attribute sub-class (`MX1J` from `MX1`)? It is not stated in any
   upstream field seen so far.
6. Per-gate marks in Kayak Cross. The XML reverse pass found fault codes. An earlier scout found
   touches added into `Pen`. Which holds on TCP?
7. Does Canoe123 clear a result row at the moment a finished bib is staged for a re-run, or only at the
   new finish? §4.11 works either way.
8. After a TCP disconnect, the first snapshot rewrite detected afterwards takes over (INV-2, rule 2).
   If that rewrite happened in the few seconds *before* the disconnect, its content can predate TCP's
   last push. The window is bounded by the file-watch interval. Accepted as residual.
9. The cause of the 11–27 s late-finish outliers. The finish message itself was late; a manually
   entered finish is suspected.
