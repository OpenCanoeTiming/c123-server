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

### 0.3 Scope snapshots and the XML read

**Scope snapshots** (`CONTRACTS.md` §4 INV-7). Two messages are complete statements of a race's
results table, and only these two:
- **A TCP `Results` message**, for the race it names. Upstream builds it from the stored table at that
  moment, in both the event-driven and the rotation case. It is one `|`-terminated string, and none
  of 17,496 recorded messages failed to parse. Its mode is read structurally: **results mode** when
  any row carries a placement or a mark; **start-list mode** otherwise, when upstream lists the whole
  start list in start order (its subtitle also gets a literal " - Start List" suffix, which is not
  relied on). Upstream uses start-list mode exactly when nobody in the race is ranked, so a
  start-list-mode message for a race that had results means every result was deleted.
- **An XML snapshot**, for every race in it. Rows are never deleted from the file; a retraction shows
  only as fields going empty.

**The XML read.** The file is written as a temporary file copied over the event file, not an atomic
rename. Readers validate every read (well-formed, root closing tag present) and retry on failure. No
torn read was observed in 2,236 reads by a 5 s poller, but the window is real. The read is triggered
when the file's modification time or size changes; the detection time is `xml.lastRewriteDetectedAt`
(§5), and the write happened within one poll interval before it.

### 0.4 Ingest filters

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
  its description) is relayed as the Phase's own class, which upstream derives (`MX1J`). No base-class
  link is stored anywhere upstream: in the recorded event `MX1J` and `WX1J` were separate classes
  with the same people entered twice, and their time-trial "times" were rank × 1000 typed by the
  operator. Such a class is an ordinary separate Class. Nothing is inferred about its relation to
  another class.

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
  - `D` is the Kayak Cross start ramp (caption `ST`) and `E` the roll zone (`RZ`). Each is a judging
    slot that does not advance the gate number. Build `Course.slots` from the layout: one slot per
    `N`/`R`/`D`/`E`, in order, with `gateNumber` for `N`/`R` only and the caption from
    `RaceConfig.GateCaptions` at the same index. `S` and `I` produce no slot.
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
- An Attempt leaves the list when upstream stops listing it, or on "course empty". OnCourse re-sends
  every listed athlete at least once a second, so "stopped listing" is detectable within about a
  second.

**`left-without-finish`, slalom only.**
- **The rule.** An Attempt that leaves the list with `dtFinish` never observed becomes
  `left-without-finish`, `confidence: 'authoritative'`. What is asserted is that upstream removed the
  athlete; no reason is inferred.
- **Why a separate status.** Removal before a finish with DNF or DSQ, and DNS from the start judge's
  terminal, push nothing on TCP (observed upstream behaviour). Of 145 recorded transitions:
  - 59 arrived in their own immediate push;
  - 21 at run closure, about 20 s later;
  - 57 on another athlete's push: median 20–52 s, worst 522 s;
  - 8 only by rotation, up to about 600 s.
- **Where the mark comes from.** The XML snapshot at about 35 s (INV-2, rule 2's exception), or TCP's
  next push of the race.
- Kayak Cross never uses it.

**Result marks, closed-set mapping.** A row with a mark presents `outcome: no-result`, whatever time
it carries: a DNF row can keep a time, even another athlete's finish (`CONTRACTS.md` §2.6).
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
- **No-results arrive only here, and not always promptly.**
  - A mark typed in the results grid, set by the scoring session, set after a finish, or set at run
    closure is pushed immediately.
  - A mark set on the silent paths (start-terminal DNS, removal before a finish) reaches TCP only with
    the race's next push or its rotation. See `left-without-finish` above.
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

**TCP, the second run of a pair.** The recipe was traced in the source and confirmed on recordings.
On the second-run row, `Time`, `Gates` and `IRM` are run 2's own. `Pen`, `Total` and `Rank` are the
combined values.
- `runSeconds`:
  - from the first on-course message with `dtFinish` set, `OnCourse.Result[T]@Time`;
  - then from `Results.Result@Time` when the row arrives. The two values are identical.
- **Gate cells** are merged from `OnCourse.Result[C]@Gates` and `Results.Result@Gates`, per §4.6(e).
- `penaltySeconds` is the sum of the merged, judged cells. It is final when no cell is blank, or when
  the run is closed.
- `totalSeconds = runSeconds + penaltySeconds`.
- `pairTotal = @Total`.
- **Never use `@Pen` or `@Total` for run 2.** They describe the *counting* run: when run 1 is better,
  they are run 1's figures. Run 1 was better in 41% of recorded second-run finishes. They are not a
  reliable run-1 source either. Run 1 comes from its own first-run row, or from the XML's `Prev*`
  fields.
- **Evidence.** The final TCP row matched the XML's run-2 time and gate cells in 982 of 982
  second-run finishes, across six recordings: 407 of them with run 1 better. Every penalty change
  pushes the row immediately, even when run 1 stays the better run, because the push is triggered by
  run 2's own total. All 24 recorded corrections made after the athlete had left the on-course list
  arrived the same way.
- **Today's code does not do this.** It reconstructs run 2's penalty from an on-course cache, the XML
  or the combined `Pen`, and never reads the gate cells (`inputs/EVIDENCE.md`, Exhibit 3 addendum).

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

**Cells are per slot, not per gate** (`CONTRACTS.md` §2.12). Cell `i` (0-based) belongs to
`Course.slots[i]`. A gate's penalty is the cell of the slot whose `gateNumber` it is; the cells of a
start-ramp or roll-zone slot are judging marks for Kayak Cross faults (d), never gate penalties. On a
slalom course every slot is a gate, so cell `i` is gate `i+1`.

**(a) `OnCourse.Result[C]@Gates`.**
- The string is comma-separated, dense, one token per slot: `"0,0,2,,,"`.
- Split on `,`. Token `i` is slot `i`. `""` means `null`.
- The width follows upstream's gate count even when that count is fabricated (§2.3). Keep only the
  first `gateCount` tokens of the known course.
- The attribute is omitted entirely when no course configuration is attached.

**(b) `Results.Result@Gates` and `XML.Results.Gates`.**
- The string is fixed-width: **3 characters per cell, 30 cells, whatever the course.**
  - 90 characters in 99.8% of TCP rows at one event, and 578 of 580 snapshot rows on a 23-gate course.
  - Shorter, trimmed strings occur (3, 18, 27, 69 characters).
- Chunk from the left by 3. A missing cell is blank. Trim each chunk; blank means `null`, otherwise
  parse as an integer. **A cell that is not an integer parses as `null` and raises
  `unparseable-cell`:** the field is free text in the operator's grid, and a recorded row carried a
  note in it (`"pozor !!!!!"`, `Pen="1"`). Keep the first `slotCount` cells.
- **Never split on whitespace.** That collapses blanks and shifts every later gate: `EVIDENCE.md`
  Exhibit 2.
- The previous rule, `width = length / gateCount`, was wrong on every row of a 23-gate course. On a
  9-gate Cross course it divided evenly as width 10, which is silently wrong.

**(c) Team rows** (`TR1/TR2`, `TSR`, `TS1/TS2/TSF`, `TFI`; source and static sample only, no recording).
- `Gates` holds the per-gate **sum** over the members (4, 52, 100, 150…). Upstream computes it from
  the member cells whenever one changes, and leaves it blank while any member is unjudged; a `C`
  mark counts as 50.
- `XML.Results.Gates1..3` hold each member's cells, in the same fixed-width format, and fill
  `memberPenalties`. **TCP never carries them**, so `memberPenalties` appears at the next snapshot.
- A crew cell that differs from the member sum (8 of 691 judged cells in the sample) is a
  crew-level edit made upstream; present the crew cell, raise `member-sum-mismatch`.

**(d) Kayak Cross.** Settled against the source and the recorded Cross event (E1):
- The cells are **fault marks**, not penalty seconds: only `""`, `0` and `2` occur. `gates` is
  `unavailable{not-applicable}` for Cross Attempts.
- **`faults` is derived from the cells plus the captions, on TCP and in the XML alike:** `count` is
  the number of cells marked `2`; `gates` lists those slots' captions (`ST`, `1`…`6`, `RZ`, `7`);
  `lastCleanGate` is the highest gate number whose slot cell is `0` before the first fault. This
  reproduced `XML.Results.NrFLT`/`FLT`/`LastCleanGate` exactly: 136 of 136 rows.
- **Ignore `Pen` in Cross.** In the time trial the marks are never added into `Pen` (`Pen 0` and
  `Total = Time` in all 293 rows); in heats the on-course stream adds them while the result rows
  are inconsistent (3 of 16 faulted bibs showed `Pen 0`). The time trial ranks by faults, then last
  clean gate, then time; that ranking is relayed as `placement`, never recomputed.

**(e) Merging on-course and result-row gate cells** (`CONTRACTS.md` §4, INV-2 rule 1).
- Keep one value per gate, updated in receive order from both vectors.
- A newer judged value overwrites an older one.
- **A blank result-row cell never overwrites a judged on-course cell while the Attempt is still on the
  on-course list.** Upstream sends no result push when the last missing gate is judged clean, so for
  up to about 20 s, until the run closes, the row shows that cell blank while the on-course stream
  shows `0`.
- Once the Attempt has left the list, the result row's vector is authoritative whole. That is how
  later corrections land.

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
- **`featuredByUpstream`** (`CONTRACTS.md` §7.1) is the Attempt named by `TVS@Odd_Bib`/`@Odd_RaceId`
  when that bib is on the on-course list, else by `@Even_Bib`/`@Even_RaceId`, else `null`. Upstream
  alternates the two channels by starter. It is optional; the default featured competitor is the
  first Attempt of the on-course list, the one next to pass the finish (maintainer answer, round 2).
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

### 4.10 Classification rows (`XER`, `SLER`, `WWER`)

- The classification Phase's `XML.Results` rows, or TCP result rows for that race, feed its
  `classification` Standing directly. They create **no Attempts**.
- Upstream assembles the rows from the final, then the semi-final, then the heats, **only when the
  operator presses "calculate event result"**. A later correction in a contributing Phase does not
  reach the classification until it is pressed again. The Standing is relayed as last built, with its
  own `observedAt`; nothing is recomputed. `RXER` is a title only and never carries rows.
- `rank` and `order` come from `Rnk`/`RnkOrder`. `decidedIn` comes from `RecordType` (`F`, `SF`,
  `1/2`, `1/4`, `T`).
- Upstream generates these rows from the rounds. They are relayed, never recomputed.

### 4.11 `run` (run generation)

**Upstream evidence of a re-run** (`DECISIONS/ADR-013`).
- Upstream sets `OnCourse.Participant@Warning` to a localised "overwriting results" string when a bib
  is put on course in a race where it already has a result. The text is never carried.
- **What upstream does** (observed upstream behaviour; no recorded instance): the re-run wizard wipes
  the stored row immediately on confirm, with no push; the next push shows the row gone (first run)
  or `Time=""` (second run), plus the new scheduled start. That is a retraction (§4.12) followed by a
  new start. **The wizard is the normal path** (maintainer, 2026-09-25): operators use it, and it
  schedules the re-run at a specific time. Staging a finished bib *without* the wizard is the
  exception, and it never clears the row: the old result stays in
  every push until the new finish overwrites it, and an old DNF is not cleared even then (§4.12,
  stale mark).
- **The generation increments on exactly one trigger:** an on-course observation for this
  `«phaseId,bib»` with a non-empty `dtStart` different from the current generation's recorded start.
  A result row observed cleared is a **retraction** (§4.12), not a generation change
  (`DECISIONS/ADR-013` Revision). A re-run therefore appears as a retraction, often invisible on TCP
  because the re-run wizard pushes nothing, followed by a new start.
- On increment, the run-scoped fields become `not-yet`, and the change is pushed.
- A later result row whose `dtFinish` precedes the new generation's start describes the replaced run.
  It is retained as history and never presented.

### 4.12 Retraction and contradiction (`DECISIONS/ADR-015`)

**What upstream emits for each correction** (observed upstream behaviour, E1):

| Operator action | On TCP |
|---|---|
| A status, time or penalty edited in the results grid, including set to empty; a paste; a finish impulse given, also after the fact; an on-course row relabelled to another bib once it has a total; a scoring-terminal correction; "delete all results" | immediate push of the race |
| "Delete selected results"; a start or finish impulse deleted with the delete-impulse command; the re-run wizard; a start-terminal DNS; DNF or DSQ before the finish | **no push**; visible at the race's next push, at rotation, or in the XML |
| A finish cleared or overwritten on the on-course grid; an on-course row relabelled *away* from a bib | **the stored row is not even cleared**; the old result stays in every later push until the athlete finishes again or the operator edits it |

**Retraction from a TCP push** (INV-7). For each Attempt of the race whose presented result fields
came from results-table observations:
- **First-run or single-run race.** The row is absent, or the message is in start-list mode:
  retract `outcome`, `gates`, `placement`, `underReview`, `qualified` and any mark in `status`.
  Recorded: three cleared DNSs vanished this way, and all three athletes then raced.
- **Paired second run.** The row is absent: retract as above plus `pairTotal` and `countingRun`. The
  row is present with `Time` empty and `IRM` empty: retract run 2's `outcome` and `gates`; take
  `placement` and `pairTotal` from the row, since an athlete with only a first-run result is listed
  that way. Recorded: five DNSs and one CAP cleared in place.
- **Never:** an Attempt whose outcome is still an on-course inference; an Attempt never present in a
  results-table observation; a row that was never present.

**Retraction from an XML snapshot.** The row carries no time, no finish time and no mark, for an
Attempt previously known from a results-table observation: retract as the TCP first-run case.
**Guard:** apply it against a `tcp` observation only when `xml.lastRewriteDetectedAt` minus the poll
interval is later than that observation's `observedAt`. Otherwise the snapshot may predate the push,
and it is ignored for that field until the next snapshot. The same guard applies to the mark
exception of INV-2 rule 2. Recorded: the XML was five minutes *ahead* of TCP's rotation on one
cleared wrong-race row, and 7 s behind TCP on a cleared DNS.

**After a retraction,** `status` is what the on-course stream currently shows for the Attempt
(`at-start`, `on-course`), else `not-started`.

**Contradiction by the on-course stream** (INV-2d). Track per Attempt and generation the finish time
last presented from a results-table observation. When an on-course message lists the Attempt with
the generation's `dtStart` and an empty `dtFinish` after that:
- record the contradicted finish time; present `status: on-course`, `outcome: running`,
  `placement`/`pairTotal`/`countingRun: not-yet`; raise `contradicted-finish`;
- keep every results-table row for the Attempt whose `dtFinish` equals the contradicted time
  retained and unpresented;
- lift the record when a row carries a different `dtFinish`, a mark, or a retraction, or when the
  on-course stream lists the Attempt with a `dtFinish` again.

Recorded: seven finishes withdrawn on the on-course grid; in two cases later pushes still carried
the withdrawn time for 31 s and 71 s; in every case the row changed next only when the athlete's own
real finish arrived, 2–94 s later.

**Duplicate finishes.** Two Attempts of one Phase presenting the same `dtFinish` raise
`duplicate-finish` with both bibs. Recorded on TCP six times (a finish given to one bib, then the
other) and in the XML for hours once, resolved by a DNF. Nothing is auto-resolved.

**Half-corrections in the XML.** A save can land between two operator actions. Recorded within one
snapshot: the same finish on two bibs (three times), one run on two races for 70 s, a penalty on
neither of two bibs for 35 s. Each such state is upstream's own table at that instant and is
presented as such, with the diagnostics above. The next snapshot or push resolves it; the operator's
re-baseline (`CONTRACTS.md` §4) is the remedy for one that never does.

**A stale mark after a re-run** (`CONTRACTS.md` §2.6). Remember the mark, if any, the Attempt
carried when the generation incremented. On a row of the new generation whose `dtFinish` is later
than the generation's start, a mark equal to that remembered one is not presented and raises
`stale-mark`; `outcome` is derived from the row's time and cells as usual. A different mark, or a
mark on a row with no new finish, is presented.

**Standing after a retraction or contradiction:** the entry is unplaced (`CONTRACTS.md` §5 step 3).

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
  INV-2's rule 2 means by "a rewrite detected after the disconnect", and what §4.12's write-time
  guard subtracts the poll interval from. The file is written on a timer (a venue setting, 65 s by
  default, 35 s at the recorded NKZ) and only when upstream has flagged a change: an operator edit,
  an import, or a slalom rank change. A penalty correction flags one only when a rank moves, when the
  race has a marked row (DNS, DNF, DSQ, CAP, RAL, DQB), or when it was typed in the results grid;
  otherwise it waits for the next flagged change; after racing has ended it reaches the file at the
  end-of-day save, which always happens, automatically or manually (maintainer, 2026-09-25), while
  TCP carries it meanwhile. The Kayak Cross heat ranking never flags one: Cross heat results reached the file
  1.5–10 min late in a recording. Nothing is written in upstream's offline mode.

---

## 6. `WriteRequest` echo matching

- **`confirmed`:** a later results-table observation of the same target field, for the same run
  generation, equals `requestedValue`.
- **`mismatched`:** it arrives unequal.
- **`superseded`:** the generation increments first (§4.11).
- The comparison is field-level: a row refreshed for an unrelated reason is not an echo of a different
  field.
- The echo arrives as an event-driven result push, because a correction recalculates the race.

**When a write is accepted** (`CONTRACTS.md` §7.3). Let `listed` be whether the Attempt is currently
on upstream's on-course list (§4.1). `listed` → refused, `run-not-closed`; a team-boat Attempt →
refused, `team-boat`; otherwise the penalty goes as the correction command with the race id. Only
that one command is used; upstream's on-course scoring command is not part of the contract.

**`GateCheck.status`** (`CONTRACTS.md` §2.10). Derived at serialisation, never stored:
`presented = Attempt.gates` is `known` ? `gates.value[gate − 1].penalty` : `null`;
`status = (valueAtCheck === presented) ? 'verified' : 'stale'`, with `null === null` true and
`null === 0` false. A team's `penalty` is already the member sum (§4.6(c)), so no further arithmetic.
Recomputed, and `check.updated` pushed, whenever the presented `gates` of that Attempt and generation
changes: a late correction, a retraction, a contradiction, a re-baseline. The display state
`flagged | verified | stale | plain` is a lookup over open flags and the check, in that order.

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
12. **A second run's own outcome comes from time plus the sum of the gate cells**, with the cells
    merged across the on-course and result streams (§4.4, §4.6(e)). This settles a recurring
    maintainer complaint without CIS: run 2's detail is complete on TCP within a second, even when run
    1 is the better run.
13. **Result marks are not always pushed**, and `left-without-finish` is the honest interim state
    (§4.1).
15. **#179 answered from the source** (2026-09-25): start ramp and roll zone as judging slots (§2.3,
    §4.6); Cross faults derived from the cells, `Pen` ignored (§4.6(d)); `SLER`/`WWER` as
    classifications with stated staleness (§4.10); super-final and legacy final as summed pairs,
    relayed (`CONTRACTS.md` §2.4); attribute sub-classes as ordinary classes (§2.1); the re-run
    wizard's silent wipe and the stale mark (§4.11, §4.12); the reset-scoring-terminals action never
    touching the write channel, and writes addressed to the connected instance (`CONTRACTS.md` §7.3).
14. **Retraction is first-class** (§0.3, §4.12; `DECISIONS/ADR-015`). A TCP result push and an XML
    snapshot are complete statements of a race; their stated absence retracts. The on-course stream
    contradicts a finish taken away on the on-course grid, which upstream never clears. A mark
    overrides a time. A result row observed cleared is a retraction, not a new run generation.

---

## 9. Not modelled, and why (appendix)

Every upstream field the reverse pass found and the contract does not carry. "Internal" means print,
finance, UI or start-list-generation scratch. "Never filled" means the field is in upstream's schema,
but no code path or recording ever filled it.

**TCP**

| Field | Why not modelled |
|---|---|
| `OnCourse.Participant@Race`, `Results@SubTitle`, `Schedule.Race@Race`/`@SubTitle`/`@ShortTitle` | Upstream-generated localised labels (`CONTRACTS.md` §1.3). On-site clients label from `format`, showing an unknown token verbatim; live clients from `title` and the structural fields (`CONTRACTS.md` §8.3) |
| `OnCourse.Participant@Warning` | Localised text. Its fact, a re-run, is modelled as `run` (§4.11) |
| `OnCourse.Result[C]@chFinish`, `@chSplit1/2` | Arming flags. `chStart` is used for `at-start`; the others add nothing a consumer needs |
| `OnCourse.Result[T]@Total`, `@Rank` | The running total is `running`'s two parts. The rank is unreliable as placement (§4.7) |
| `Results.Row@Number` | Upstream list position. `order` supersedes it |
| `Results.Result@Behind` | A formatted gap. Derived instead (`CONTRACTS.md` §5) |
| `Results@Current` | Used at ingest as a freshness signal only |
| `TimingInput` (all) | Raw hardware impulses, with no bib |
| `TVS@Odd_Bib`, `@Even_Bib` and their race ids | Carried as `featuredByUpstream` on the on-course response (§4.8), optional. The default featured competitor is the athlete next to pass the finish (maintainer answer, round 2) |

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

Items 1–7 and 13 were answered from the source on 2026-09-25 (#179; E1). Items 8, 9, 11 and 12 remain.

1. ~~Does "reset scoring terminals" reach the write channel?~~ **Answered:** no. It resets the
   hardware judge terminals on their own port and raises a flag on the scoring service for about
   11 s; the TCP command receiver is untouched and nothing is emitted on TCP (`CONTRACTS.md` §7.3).
2. ~~The layout letters `D` and `E`.~~ **Answered:** the Cross start ramp and roll zone, judging
   slots that do not advance the gate number (§2.3, §4.6).
3. ~~Are `RXER`, `SLER` and `WWER` classifications?~~ **Answered:** `SLER` and `WWER` are event-result
   classifications like `XER`; `RXER` is a title only (§4.10).
4. ~~Combination for the super-final and the legacy final.~~ **Answered:** sum of two runs, tie
   broken by the better run; relayed, never computed (`CONTRACTS.md` §2.4).
5. ~~The base class of an attribute sub-class.~~ **Answered:** none is stored; an ordinary separate
   class (§2.1). The maintainer's reading of what these classes were is pending; nothing speculative
   is added.
6. ~~Per-gate marks in Kayak Cross on TCP.~~ **Answered:** fault marks in the cells, never `Pen`
   (§4.6(d)).
7. ~~Does a re-run clear the row at staging or at the new finish?~~ **Answered:** the wizard wipes it
   at once with no push; staging without the wizard never clears it (§4.11).
8. After a TCP disconnect, the first snapshot rewrite detected afterwards takes over (INV-2, rule 2).
   If that rewrite happened in the few seconds *before* the disconnect, its content can predate TCP's
   last push. The window is bounded by the file-watch interval. Accepted as residual.
9. Rule 2's exception lets an XML mark supersede a TCP `at-start`. If a DNS is *cleared* in the grid,
   which pushes immediately, and the athlete is staged again within one snapshot interval, a
   snapshot written before the clearing can show DNS for up to about 35 s. This is rare, and accepted
   as residual.
10. ~~The cause of the 11–27 s late-finish outliers.~~ Answered (maintainer, round 2): the operator
    assigns a finish retroactively after a judge reports the passage, or swaps two athletes' finishes
    noticed late. Both are corrections that §4.12 now models.
11. Which operator action produced each recorded retraction cannot be read from the stream. The
    "stale row survives" behaviour matches the on-course grid edit path. No recorded instance of
    "delete selected results" exists; its no-push behaviour is from the source only.
12. Whether today's live-mini XML ingest overwrites results that were cleared on TCP (E4).
14. Whether upstream's terminal channel can set a result mark (DNS, DNF, DSQ, CAP) on a run that has
    already left the on-course list. The removal command acts on a listed athlete; penalty-check now
    writes only closed runs. If there is no such path, the status write leaves the contract and the
    operator sets marks in Canoe123 (E4, to be read from the source).
13. ~~A no-reorder penalty correction after racing ends may never trigger an XML write.~~ **Answered:**
    confirmed from the source; the conditions are stated in §5 and `CONTRACTS.md` §2.8. TCP carries
    it regardless, and the maintainer confirms the file is always saved at the end, so the gap is a
    transient window, never lasting.
