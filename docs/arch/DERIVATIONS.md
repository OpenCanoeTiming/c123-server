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
Behaviour described as "observed upstream behaviour" is verified behaviour, stated here without
its provenance, which stays in the private protocol repository; recordings are cited where they
apply.

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
`eventTime = Phase.date + time of day + the venue's configured zone`, the zone being an **IANA zone
name** (`Europe/Prague`), never a fixed offset: a fixed offset is wrong across a DST switch, and the
spring races sit next to one (the spike's replay used `+02:00`, a shortcut the design does not allow).
- The result is expressed on Canoe123's own clock. It is never shifted to the server clock:
  Canoe123's clock is the official time, and the contract never compares `eventTime` with
  `observedAt`.
- A race crossing midnight is not handled, and is not a real case.
- **At a DST switch** (stated for determinism; no race runs at night): a time of day in the repeated
  autumn hour resolves to the later instant, standard time (`2:30:00` on 2026-10-25 in
  `Europe/Prague` is `01:30Z`); one in the skipped spring hour is shifted forward by the gap.
- **Who builds it** (§0.5). The parser builds `eventTime` when `ctx` carries the Phase's date;
  otherwise it emits the bare time of day (`H:MM:SS.fff`) in the value and no `eventTime`, and the
  core builds it from the inferred date (§2.1) at the ingest seam. The vectors see only the result.
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
- **Mode is read the same way for every table**, classification Phases included, and **a table with
  no rows is a scope snapshot in start-list mode** (TCP: a `Results` message with no row; XML: a
  Schedule race with no `Results` row). The parser emits it like any other (`RXER` excepted: a title
  that never carries rows, skipped by both parsers, §4.10). The core applies INV-7 to it as
  written: a TCP table with no rows retracts as its start-list case; an XML table with no rows, like
  an absent XML row, states nothing (`CONTRACTS.md` §4 INV-7, XML bullet); a classification
  Phase's table with no rows, from either source, changes its rows not at all (§4.10; maintainer,
  2026-11-06). Recorded (cp3-cross,
  E1): 741 empty Cross heat and final tables (521 XML, 220 TCP) and 508 empty classification tables
  (354 XML, 154 TCP), every one before any row of that race existed, so none retracted anything; no
  table emptied after rows existed, in any recording (all seven scanned, either source; the six
  other than cp3-cross hold no empty table at all).

**The TCP connect burst** (observed upstream behaviour, E1, all seven recordings). On connect, upstream
sends the current race's whole `Results` table at once, before the rotation resumes: 152–1,167 rows in
the recordings. It is a scope snapshot like any other, and it is why a cold-started server has the
current race within seconds (`CONTRACTS.md` §2.8 counts it for the bridge).

**The XML read.** The file is written as a temporary file copied over the event file, not an atomic
rename. Readers validate every read (well-formed, root closing tag present) and retry on failure. No
torn read was observed in 2,236 reads by a 5 s poller, but the window is real. The read is triggered
when the file's modification time or size changes; the detection time is `xml.lastRewriteDetectedAt`
(§5). The watcher polls; `fs.watch` is not
used: it is unreliable over network shares and under some Windows filter drivers (spike S5).

**What the reader stamps** (round 18; `CONTRACTS.md` §4 INV-2c). Each whole read is one unit:
`xml-rewrite-detected`, then the snapshot's elements, all with `observedAt` = the first detection of
the change read (not the moment a retry succeeded). **Detection** is the first stat, a poll's or a
read's closing stat, that saw the signature later read whole. The event also carries
**`changedAfter`**, the reader's last stat before the change: the time, taken before the call, of
the last successful stat that showed a signature other than the one read whole. That is the
previous poll in the steady state (one interval before detection), or the closing stat of a read;
earlier only after failed stats, or a stat that itself hung; `null` when no stat since start or
`setPath` showed a different signature (a first read whose file moved before the read that
succeeded therefore has one; a first read that failed validation under the signature later read
whole still has `null`, no other signature having been seen; #255). `changedAfter` is taken before
its stat's call, the latest instant the file is known to have been in the old state; **`observedAt`
is taken after the detecting stat returns**, the earliest instant the new state is known to exist,
so it never precedes the write (#255: a before-the-call stamp preceded 22 of 40 writes in a probe).
The write happened after `changedAfter`; that is the
snapshot's content age, and the core computes nothing from the poll interval. `null` means unknown
and **fails every content-age comparison** (`CONTRACTS.md` §4 INV-2c); nothing else changes, so a
first read presents where no `tcp` observation does and the next rewrite settles the rest. The
file's modification time is never used: on a share it is the writer's clock, not ours
(`CONTRACTS.md` §7.1 reports it on the re-baseline, as a report). Recorded (E2, review of round
18): the file goes up to 55 min without a write (gaps of 230, 1,147 and 3,335 s between the first
two snapshots of jarni-so-odp, nkz-20ne and cp3-cross, 205 s at nkz-19so, 5–10 s at the other
three), so a file set at run time is routinely minutes old.

**Validation and the states** (§5). A read that fails validation is **torn** while the file is still
moving: after the retry bound, a stat that differs from the one at detection means a write in
progress; that stat is the new signature's detection, read at the next poll. A stat unchanged since detection means the file is
**invalid as it stands**: that poll is a failed poll (`reconnecting`, `unreachable` after five), and
the file is re-read once per poll until its stat changes or it validates; that re-read is a failed
poll and not a burst, so it counts in neither `tornReads` nor `abandonedReads` (#255: the burst that
found the file invalid counted once). A well-formed file whose
root closes but that names no race is **valid and empty**: a rewrite of nothing, the unit is the
event alone (`TEST-ARCHITECTURE.md` §3.2 property 3: an `xml-rewrite-detected` on its own changes
nothing). No recording holds one: every first snapshot of the seven carried Participants, Classes,
Schedule, Results, CourseData and Events.

### 0.4 Ingest filters

These are never domain entities:
- **The staged-without-race sentinel.** On-course rows or result rows with `RaceId="<unassigned>"`
  (with empty `Id` and `Name` on TCP) never become a Phase or an Attempt. The snapshot also has a
  pseudo-schedule row of the same name.
- **The pseudo-class `NA`**, "not entered or assigned", with every Schedule row, Phase and result row
  of it (a sample carried a Schedule row `NA_Unknown_28`): the filter is by class, so what belongs to
  the class goes with it.
- **Row-number, print, finance and UI columns** (§9).

### 0.5 The parser and the core

The parser is a pure function of one upstream message and a context the core supplies (`ctx`: the
course bound to each Phase, the Phase dates the snapshot has stated, the participants index, the
Phase table). It emits that message's resolved values and per-message diagnostics, nothing else.
**It never emits `run`, never attributes to a generation, never inherits across messages and never
retracts.** It emits what a row states, not what is presented: a row carrying a mark and a time
yields `status` with the mark and `outcome` with the `duration` (the vectors' row shape); turning
the mark into `no-result` is the core's presentation (§4.1), and under a withheld stale mark the
time is what is presented (§4.12). A `RaceConfig` it emits as a course refresh keyed by its gate
string, with `captions`, `splitsArmed` and, fabricated, the ingest-only diagnostic; the Course it
refreshes is the core's to find (§2.3). The core owns everything that needs state:
- the run generation and attribution, which stamp `run` on each observation (§4.11);
- `eventTime` where `ctx` had no Phase date (§0.2);
- course binding, `gates` and Cross `faults` from retained cells, and the `unavailable{not-configured}`
  determination (§4.6);
- the untimed flag's inheritance by a TCP row (§4.4);
- the on-course set, the leave rule and `featuredByUpstream` (§4.1, §4.8);
- the splits-armed state (§2.3, §4.8), the cell merge (§4.6(e)), retraction and contradiction (§4.12),
  echo matching (§6), `provisional`, and the diagnostics that compare observations
  (`source-disagreement`, `contradicted-finish`, `duplicate-finish`, `stale-mark`);
- content age: the reader stamps `observedAt` and `changedAfter` (§0.3); the core compares them
  (`CONTRACTS.md` §4 INV-2c, INV-7);
- a classification Standing's publication: the parser emits a classification table as a scope
  snapshot of `ClassificationRow`s and nothing else — `{push: 'classification'}` is what the bridge
  sends to live (`CONTRACTS.md` §8.3), never a parser output; the core replaces the Phase's rows
  whole from each such snapshot under INV-2c's guard, dates the Standing's `asOf` by the
  `observedAt` of the snapshot that changed it, and publishes it first at its first row (§4.10).

The parser raises `unparseable-cell` and `member-sum-mismatch` (`CONTRACTS.md` §4) and four
ingest-only kinds that reach the admin log and never `GET /api/diagnostics`: `unknown-format-token`
(a format token outside `CONTRACTS.md` §2.4's table; the Phase is still built by the table's last
row), `unresolved-member` (a team member reference matching no participant, §3), `unparseable-field`
(an attribute whose text is not of its type, such as a `Rank` with an empty `RankOrder`, §4.7, or a
time that does not parse) and `gates-absent` (a finished slalom on-course listing without `Gates`,
§4.6(a): no duration inference is possible). A parser diagnostic reports, never guesses: a value it
cannot read is absent, not invented.

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
- **`stage`.** From the format token by `CONTRACTS.md` §2.4's mapping; an unknown token is `run`.
  `confidence: 'authoritative'`, a lookup.
- **`kind`, `scoringKind`, `pair`, `heats`.**
  - These come from `CONTRACTS.md` §2.4's token table, a lookup with no uncertainty, so
    `confidence: 'authoritative'`. They are presented with the Phase's first message, from the first
    observation of the `RaceId` on either channel (`CONTRACTS.md` §1.6: the first message for a new
    id carries the whole resource), never deferred to the snapshot (round 24).
  - `pair.siblingPhaseId` is the Phase with the same `classId` and the first-run token. When several
    exist, take the one with the same schedule date. This mirrors upstream's own pairing behaviour.
    Until the schedule names it, `siblingPhaseId` is `null`; `role` and `combination` are the token's
    regardless, so §4.4's second-run reading applies from the first row. An `NHT2` has `pair: null`
    until its first-run token is known (§10 item 21); its rows read as a single run meanwhile.
- **`date`.**
  - Source: the date part of `XML.Schedule.StartTime`, a full date-time with offset. Envelope:
    `source: 'xml'`, `confidence: 'authoritative'`.
  - Fallback before the snapshot is read: the date of the first observation of any kind for this
    `RaceId`, with `confidence: 'inferred'` — its `observedAt` read in the venue's configured zone
    (§0.2), never the UTC date (round 19). With no zone configured nothing is inferred: `date` stays
    `not-yet` until the snapshot states it, as `eventTime` is omitted (§0.2).
  - **TCP `Schedule` has a `StartTime` element, but upstream always emits it empty.** It is never a
    source.
  - The snapshot's date is assigned once and never re-derived (INV-5). An inferred date is replaced
    by the snapshot's exactly once; in the recordings every inferred date agreed with it.
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
  - `S` ends a sector: record the number of the gate before it; an end equal to the previous one is
    not repeated (`CONTRACTS.md` §2.12: cp3-cross course 1 `DSNSNSRSNSNSNSESRS` gives
    `[1,2,3,4,5,6,7]`, the roll zone's sector ending after gate 6 like the one before it).
  - `I` is a split point: record the gate before it.
  - `D` is the Kayak Cross start ramp (caption `ST`) and `E` the roll zone (`RZ`). Each is a judging
    slot that does not advance the gate number. Build `Course.slots` from the layout: one slot per
    `N`/`R`/`D`/`E`, in order, with `gateNumber` for `N`/`R` only and the caption from
    `RaceConfig.GateCaptions` at the same index. `S` and `I` produce no slot. An `S` or `I` before
    the first gate (`DS…`, after the Cross ramp) records nothing.
- **Refresh from TCP.**
  - `RaceConfig.GateConfig` is the currently selected course's layout. TCP strips the `S` markers.
  - `RaceConfig` gives no course number and names no race, and the selected course need not be a
    running Phase's: at jarni-so-odp 14:45Z it switched from course 1 (19 gates) to course 2 (18)
    while today's results still rotated and nothing real was on course (round 19, E1); assigning it
    to the Phase of the last on-course message overwrote course 1 and produced 583 false `gates`
    disagreements in a sweep. **The core matches it to a Course by its gate string:** the Course
    whose `layout` with the `S` markers removed equals `GateConfig` (every string in all seven
    recordings equals a stripped layout of its snapshot, cp3-cross `DNNRNNNER` included). It
    refreshes that course only, and only its `captions` (`source: tcp`) — `gates`, `slots` and
    `splitsAfterGate` are equal by construction; two courses of one snapshot with equal stripped
    layouts are both refreshed, the captions describing the string they share (not recorded; a
    default, `DECISIONS/LOG.md`); a string matching no snapshot course, a fabricated one included,
    refreshes nothing. `layout`
    and `sectorEndsAfterGate` are the snapshot's alone and are never emitted from `RaceConfig`
    (`CONTRACTS.md` §2.12). The parser emits `splitsArmed` from `NrSplits`; what `splits` presents is
    the core's (§4.8).
  - `RaceConfig.GateCaptions` gives `captions`. Captions are TCP only.
  - `RaceConfig.NrSplits` says whether splits are armed. Zero means no split times will come.
- **Ignore upstream's transmitted gate count** (`RaceConfig.NrGates`). The stream substitutes 30 when
  no course configuration is attached, and 25 for a slalom course with an empty layout. Neither is
  marked as a fallback.
- **Detect a fabricated course.** Upstream fabricated the course when any of these holds:
  - the gate string is empty while the count is non-zero;
  - the captions are empty while the gate string is non-empty;
  - the string's gate count differs from the transmitted count.
- **Failure mode:** an empty layout gives `unavailable{reason:'not-configured'}` for `gates`. The
  same applies to every Attempt's `gates` on that course. A fabricated `RaceConfig` decides nothing
  (§4.6).

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
  - A member reference that matches no participant leaves `members` `not-yet` for the Entry and
    raises `unresolved-member` (§0.5); no partial crew is emitted.
  - On TCP, `Results.Member1..3` are display names only and are not carried: `displayName` already
    shows the team's name, and identity comes from the snapshot.
  - A team's own `ICFId` is synthetic and not carried.
- **`externalId`.**
  - `value` is `ICFId`, or `ICFId2` for the second member, from the snapshot only: **TCP carries no
    registry number.**
  - `scheme` is supplied by bridge configuration, never derived (`CONTRACTS.md` §6, [N]).
  - When the element is absent, `externalId` is `null`, served as `null` inside the `known` `members`
    value (`CONTRACTS.md` §2.5); it is never wrapped.
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
- **`isTeam`** is `XML.Participants.IsTeam`; it marks a team or patrol row, the only rows upstream
  judges per member (§4.6(c)). A C2 double is `false`.
- **`eventBib`.**
  - Source: `XML.Participants.EventBib`, trimmed, where `XML.Events.BibHandling` is `EventWide`.
  - With `Startlist` bib handling it is `unavailable{not-applicable}`: bibs are issued per race.
- **Do not read `_Bib` as a bib.** It is an organiser-imported value that looks like one (§9).

---

## 4. Attempt

**Identity.** `bib` is `Results.Participant@Bib`, `OnCourse.Participant@Bib` or `XML.Results.Bib`,
trimmed. `attemptId` is `${phaseId}:${bib}`. The Attempt exists from the first row that names it,
which may be a start-list row a day ahead; its `status` is `not-started` from that row
(`CONTRACTS.md` §3.2, round 20).

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
- `at-start`: listed with `dtStart` empty. `chStart` is the arming flag only (1 = armed for the start
  impulse) and does not change status; listings with `chStart = 0` and no start are 189–36,312 per
  recording. Together they are about 8% of on-course traffic. In a Cross heat a listing is `on-course`
  (§4.2).
- `on-course`: `dtStart` non-empty and `dtFinish` empty.
- **A listing with `dtStart` and `dtFinish` empty is `at-start`, outside a Cross heat (§4.2),
  whatever preceded it in the generation** (round 19, second pass, E1; the finish clause and the
  heat exception third pass, from the trace below and §4.2): the ordinary staging; a start impulse deleted (recorded twice: nkz-20ne
  K1M_BR1_20:115 at 07:16:19Z, the real start given 5 s later; cp3-cross WX1_XT_26:25 at 07:15:34Z
  after 199 s on the clock — both listings carry `Time` empty, so `on-course` would present a clock
  upstream no longer shows); a stream finish withdrawn (next bullet). With `dtFinish` set and no
  `dtStart` the listing is `finished` by the first rule above, a finish impulse with no start
  (recorded once: cp3-cross WX1_XT_26:25 at 07:16:59Z, the trace below; `CONTRACTS.md` §3.2
  `at-start → finished`). The `running` inference goes
  with the start it showed (§4.3). Two things such a listing does not do: it displaces no
  `finished` or mark presented from the table (INV-2 rule 1; INV-2d needs the generation's start),
  and it changes the generation's recorded start not at all (§4.11: a start given again after a
  deletion is a start correction, never a new generation).
- **A finish the stream alone has stated is the stream's to withdraw** (round 19, E1). While no
  results-table row has recorded the generation (§4.11's sense: a row with a time or a mark,
  attributed after the recorded start), or after the row that recorded it has been retracted and
  the stream still lists the finish (nothing from the table is presented; the generation stays
  recorded, §4.11; third pass, rule, 0 in seven recordings), the next listing of the Attempt
  without a `dtFinish` withdraws it: `status` is what that listing shows (`at-start` with no `dtStart`, else
  `on-course`), the generation's finish and the `duration` inference are forgotten, no diagnostic
  is raised (INV-2d is for a finish presented from the table). It applies wherever the stream lists
  finishes per competitor: slalom and the Cross time trial (`XT`, §4.4) alike; a Cross heat lists
  none (§4.2). Recorded: cp3-cross WX1_XT_26:25 — start 9:12:14.973 listed 07:12:16Z; the start
  deleted at 07:15:34 (`at-start`); a finish impulse with no start and no `Time` at 07:16:59
  (`finished`, the generation's recorded start kept); the listing without it at 07:20:57
  (`at-start`); the athlete staged with nothing until 07:30:00; `DNS` in the XML at 07:30:19 and on
  TCP at 07:32:17; the exception of INV-2 rule 2 then applies to the `at-start`, two minutes
  before TCP's row.
- `chFinish` ("armed for the finish impulse") adds nothing to this and is not modelled.

**The on-course list.**
- Every `OnCourse` message carries one participant, its `@Position` (`courseOrder`), and `@Total`,
  the number on course.
- A bare `<OnCourse Total="0" Position="0"/>` with no children is upstream's explicit "course empty".
- An Attempt leaves the list when upstream stops listing it, or on "course empty". **Upstream has
  stopped listing an Attempt when no on-course message names it for `onCourseLeaveAfterSeconds` of
  ingest time while other TCP messages keep arriving.** The constant is **4 s** (round 20, E1:
  the whole distribution of unchanged-listing gaps over all seven recordings with no cut-off,
  557,883 pairs, closing §10 item 16). What the distribution shows: 99.87 % of re-listings come
  under 1.5 s; the longest pause with the stream alive that was not a removal is **2.59 s** — eight
  Attempts in two whole-list pauses of 2.57–2.59 s (jarni-so-do K1M_BR2_18 bibs 125–130 at
  09:45:01Z, nkz-20ne C1W_BR2_20 bibs 27 and 29 at 10:34:21Z), `Total` constant throughout, a
  listed finisher among them; every longer alive gap of an unchanged listing — 3.04, 3.68, 3.86,
  4.29 and 9.67 s, then 83.8 s and up (3.05 s is upstream's own "course empty", 33.6 s a changed
  listing) — was a real unstage and restage: inside each, upstream listed a full cycle of `Total`
  distinct other bibs with `Total` one lower, and the Attempt was listed again afterwards (at
  4.29 s another bib took the vacated slot meanwhile; at 9.67 and 83.8 s it returned to a shorter
  list). So the "false leaves at 3 s" of the earlier measurement were true leaves. **The margin,
  stated at the worst phase** (round 20, second pass, E1 from the review's replay): the 2.59 s
  gap is one phase of a whole-list pause of 2.16 s (jarni-so-do, TCP silent 1.11 s) or 1.9 s
  (nkz-20ne, TCP wholly silent); an Attempt named one listing cycle before such a pause (cycle p90
  1.03–1.05 s, p99 1.15–1.35 s, up to 2.48 s at `Total` 11, where upstream's tick stopped at
  position 10) reaches 3.2–3.5 s, so 4 s leaves 0.5–0.8 s at the recorded worst phase, and a pause
  one cycle longer than any recorded would reach 4.2–4.9 s and be a leave for those Attempts; a
  TCP silence of 2.7–3.9 s — under the constant, so not a stall by the rule below — would leave
  every Attempt whose phase carries it past 4 s (recorded silences stop at 1.90 s and resume at
  10.68 s). The figures are these seven recordings' machines; S5 re-measures on the venue laptop.
  3 s would sit under the worst recorded phase; the extra second of 5 s buys margin against a shape
  never recorded and reports every real removal a second later. The cost of
  each side: a leave too early flips `provisional` to `false` on values upstream still lists with
  blank cells (P11; a finisher was among the recorded hiccups), a leave too late shows a removed
  row for the constant. The spike's figure, "a maximum re-send gap of 2.48 s", was circular: its
  sweep evicted entries older than 2.5 s before measuring the gap (E2, opponent review). **A removal
  and a restage faster than the constant are not seen**: the Attempt stays listed, which is what
  upstream showed net; a slower one is a leave and a re-listing, `status` per the rule below and
  `CONTRACTS.md` §3.2 (`not-started → at-start`, `left-without-finish → at-start | on-course`), the
  generation unchanged since no start changed. That a restaged Attempt with no start looks, in its
  own listings, exactly like a hiccupped one matters to the measurement (the classification above
  reads the other bibs' `Total`), not to the rule: either way the re-listing restores the same
  state. **The stall exemption is a rule, not an option:** the gap is counted only while other TCP messages keep
  arriving, so a gap that spans a TCP stall or disconnect is not a leave; after the stream resumes the
  list is re-learned, and an Attempt not re-listed within the threshold has left. Stated as one
  evaluation (round 19): at a TCP message that arrives `onCourseLeaveAfterSeconds` or more after the
  previous TCP message, nothing leaves and every listed Attempt counts from that message; at every
  other TCP message an Attempt not named for the constant has left. The first half is why
  `contradiction-oncourse-running-again` holds with its re-listings elided (the recording lists bib
  55 every second across that gap; the vector's 9 s with no element is a stall by this sentence);
  the second half is #204's with the constant. The spike did not
  implement it: a 10.7 s TCP stall (cp3-cross 09:18:38Z) emptied a Kayak Cross heat's on-course set,
  with 0 checker violations, inside one of its own windows (opponent review R13). The rule is evaluated
  at every ingested TCP message, never on a timer, so replay is deterministic. **A false leave is not
  harmless:** it leaves `provisional: false` on values whose Attempt upstream still lists with blank
  cells (D4; nine P11 violations in one replay). So the leave flag clears on re-listing within the
  generation, `status` returns per `CONTRACTS.md` §3.2 (`left-without-finish → at-start | on-course`,
  `not-started → at-start`), and `provisional` is recomputed. Cycle completion over `Position`/`Total`
  was rejected: `Total` changes mid-cycle.

**`left-without-finish`, slalom only.**
- **The rule.** An Attempt that leaves the list with a start observed — a `dtStart`, or the stream
  having stated `on-course` or `finished`, which this section derives from one — and `dtFinish` never
  observed becomes `left-without-finish`, `confidence: 'authoritative'`. What is asserted is that
  upstream removed the athlete; no reason is inferred. An Attempt unstaged before any start returns to
  `not-started` (observed: bib 68 staged for 5 s into the next day's race, then removed); listed again
  in the same generation, it returns to `at-start` or `on-course` as a newer inference.
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
it carries: a DNF row can keep a time, even another athlete's finish (`CONTRACTS.md` §2.6). That is
the core's presentation of a presented mark — of the presented `status`, never a field of the row's
own: a mark refused for `status` (INV-2 rule 2, INV-2c) shows nowhere (`CONTRACTS.md` §2.6, round
20); the parser emits the time beside the mark (§0.5), and a
withheld stale mark leaves the time presented (§4.12).
- Sources:
  - `Results.Result@IRM` on TCP, where upstream sends the `*` mark as empty;
  - `Results.Result@PP = "*"` on TCP;
  - `XML.Results.Status`.
- The mapping:
  - `DNS`, `DNF`, `CAP`, `RAL`, `DSQ`, `DSQ-R` and `DQB` map to `dns`, `dnf`, `cap`, `ral`, `dsq`,
    `dsq-r` and `dqb`.
  - `NON-RK` maps to `non-ranked`, a finished run excluded from ranking.
  - `*` means `underReview: true`, with the run otherwise `finished`. Every result row that carries a
    time, a mark or a placement states `underReview`, `false` without the mark, so a withdrawn `*`
    clears; a row that stated it only when true could never clear it (INV-1). A row carrying none of
    the three states nothing (INV-7's blank row, `CONFORMANCE-VECTORS.md` §1).
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
- `status → 'finished'` when this bib's result row gains a placement, that is a non-empty `Rank`. In a
  heat, `RankOrder` alone is the lane order from the first judging push and is not a placement
  (observed: WX1_XS_26, every row `RankOrder` 1–4 with empty `Rank`, `Time` and `IRM` until the
  operator asserted the order athlete by athlete). The placement is the operator's assertion, entered
  after conferring with the finish judge. The same rule gives an untimed row (§4.4) its status: a
  placed row never seen on course is `finished` (47 junior time-trial Attempts at cp3-cross, E1).
- `source` is the channel it arrived on, with `confidence: 'authoritative'`, no `eventTime` and
  `provisional: false`. It is pushed with no debounce.
- Until then the Attempt stays `on-course`, even after the heat has left the on-course list together.

### 4.3 `outcome` while on course, and between finish and the first result push

**`running`.**
- `elapsedSeconds` is `OnCourse.Result[T]@Time`, whole seconds while running. `penaltySeconds` is
  `@Pen`; in a Kayak Cross time trial it is `0` by rule (§4.4), `@Pen` being ignored in Cross (§4.6(d)).
- The value is upstream's own display. It includes a configurable offset, and during a split hold it
  shows the split time. It is relayed as displayed: `confidence: 'authoritative'`,
  `provisional: true`. It follows the listing: a start correction that moves `Time` moves it
  (§4.11; recorded 0 → 89 at jarni-so-do K1M_BR1_18:138), and a listing with `dtStart` empty ends
  it (§4.1: the start deleted, `outcome` back to `not-yet`).

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
  - (b) `OnCourse.Result[C]@Completed = "Y"` on a listing carrying the finish (§4.4);
  - (c) the Attempt leaving the on-course list.
- **A start correction carrying the generation's finish** (§4.11: a listing with a different
  `dtStart`, the same `dtFinish` and a new `Time`) restates `runSeconds` from its `Time` whether or
  not (b) or (c) has ended the recomputation: the stops end the gate recomputation from ordinary
  listings, while this listing states the time the next row will carry, and no row need ever
  follow. Under (a) the inference is retained and not presented (INV-2 rule 1); the moved time
  arrives as the row. A listing without the finish after a stream-only `finished` forgets the
  inference altogether (§4.1).
- `Completed` is upstream's own "run closed" mark. It is sent only when upstream auto-completes the
  run, which needs penalties complete, a finish and the configured delay, or when a terminal asserts
  it. A run the operator removes by hand never sends it. So it is a trigger, not *the* trigger.
  Measured: `Completed="Y"` coincided with the bib leaving the list in only 34–70 % of closures across
  the seven recordings.
- **Envelope:** `source: 'tcp'`, `confidence: 'inferred'`, `provisional: true`.

**Failure mode:** `not-yet` before the finish. Never `unavailable`.

### 4.4 `outcome` from a result row

**Untimed rows** (`CONTRACTS.md` §2.6). A result row in a duration-scored Phase with a placement
(`Rank`/`RankOrder` or `Rnk`/`RnkOrder`) but no finish time (`dtFinish` empty on the row, and no
`dtFinish` ever seen on the on-course stream for this Attempt) presents `outcome:
unavailable{not-applicable}`, whatever `Time` says. Recorded: junior Cross time-trial rows with
`Time="100.00" Total="100.00" Pen="" Gates=""` and real ranks, later rank × 1000; 24 of 32 rows of
one class kept the placeholder through the semi-finals. Untimed is read from the snapshot row
(`dtFinish` empty, time and placement present) and inherited by the TCP row of the same Attempt, which
carries no finish time of its own; before the first snapshot a TCP row is presumed timed. Recorded: 47
junior time-trial Attempts at cp3-cross by the raw rule over all 98 snapshots (43 in the final one;
`WX1J_XT_26_JUN:25` appears in 30), 0 in every slalom snapshot checked (jarni-ne-do, E1). The flag
is the parser's on an XML row (`dtFinish` empty, time and placement present); its inheritance by the
Attempt's TCP rows is the core's (§0.5). The vectors carry it resolved on either row (`untimed: true`).

**Kayak Cross time trial** (`XT`, `XT1`, `XT2`; duration-scored). `runSeconds = Time`,
`penaltySeconds = 0` and `totalSeconds = runSeconds` by rule (`CONTRACTS.md` §2.6): Cross has no time
penalties, `Pen` is ignored (§4.6(d)), and upstream's own rows agree (`Pen 0`, `Total = Time`, 293 of
293). The on-course finish of an `XT` run gives the same shape as §4.3's inference with
`penaltySeconds: 0`; `faults` carries the judging.

**TCP, single run or the first run of a pair.** `runSeconds = Results.Result@Time`,
`penaltySeconds = @Pen`, `totalSeconds = @Total`.

**TCP, the second run of a pair.** The recipe is confirmed on recordings (E1).
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
  reliable run-1 source either. Run 1 is the first-run Attempt's own (§4.5).
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
- `eventTime` comes from `dtFinish` where present: the XML row carries one, a TCP row never does (0 of
  667,388 recorded rows). **In every generation, a TCP row's finish is the on-course finish with the
  same `Time`, whichever arrives first:** the row's outcome takes it as `eventTime`, and INV-2d matches
  on it, once the finish is seen; the row's `observedAt` stays its own. The result push usually
  arrives first — 86 of 120 recorded finishes (72 %), by 0.055–0.709 s, median 0.224 s — because the
  push follows the finish impulse within about 0.3 s while the on-course stream shows the finish on its
  next cycle; in none of the 86 did an on-course message without a finish fall in between, so no false
  contradiction arises. A row has no `eventTime` until then, or ever for a cold-start row before the
  first snapshot. `eventTime` is for display and diagnostics; it is never a merge key.
- **`provisional`** is `true` while a presented, merged gate cell is blank (§4.6(e): the on-course `0`
  fills a cell the row still shows blank for about 20 s), or while completeness cannot be judged
  because no course is bound yet — the observation's `judgingComplete` is that judgement where the
  parser had a course: `true` settles the value, `null` or no stamp without one is this case (round
  21) — and the run is not closed. `status` is never provisional (§4.1). This is what marks a push that upstream sent before judging
  finished: with "ranking with incomplete penalties" on, the first push precedes the last gate.
- **Run closed** — the one definition; `CONTRACTS.md` §1.2, INV-2 and property 11 point here —
  means the first of: `Completed = "Y"` seen for the generation **on an on-course listing that
  carries its `dtFinish`**, or as a row's `runClosed` (the parser stamps it on an outcome
  observation only) — upstream's own "judging complete": §4.3, the auto-complete needs the penalties
  complete, a finish and the delay, and precedes the removal by the display delay; it coincided with
  the leave in only 34–70 % of closures; a `Y` on a listing with no finish closes nothing, there
  being no result to complete (recorded once in 1,142 first-`Y` listings: cp3-cross WX1_XT_26:19,
  `Completed="Y"` while staged at 07:35:54.193Z, its start 9:35:59, its finish
  9:37:09, its real `Y` at 07:37:55.676Z; round 20, second pass, E1); the Attempt leaving the
  on-course list (§4.1; a re-listing within the generation undoes that leave and its closure alone —
  the flag clears and `provisional` is recomputed, `false → true` included, property 11; one such flip
  at 4 s on five traced recordings, jarni-so-odp C1M_BR2_18:51, `countingRun` `false → true` at
  13:54:16.854, re-listed 344 s after its leave with blank cells, its start 13:54:59, its finish
  13:56:43, so the other reading would hold `provisional: false` through a run; round 21, second
  pass, E1); or a no-result mark presented — `Outcome`'s `no-result` set, so a refused
  mark closes nothing and `non-ranked`, a finished run, closes nothing: its blank cell is judged
  like any finisher's (round 20, second pass). Leaving the list is the set's closure (`CONTRACTS.md` §7.1); `Completed`
  closes the run while it is still listed (round 20, settling §1.2 against this section;
  `DECISIONS/ADR-017` Revision 5). A closure that flips `provisional` is a change of presented state
  and is pushed (`CONTRACTS.md` §7.2). An Attempt never listed is not closed by that alone: a row with
  a blank cell for it stays provisional until one of the three
  (`provisional-incomplete-judging-then-settles`; a past race's row that upstream left unjudged says
  so honestly; round 19).
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
    `PrevRnkOrder`. **They are not read** (round 17, server#201 O3). They restate the first-run row of
    the same snapshot, on the second-run Attempt, which has no field for run 1's figures
    (`CONTRACTS.md` §2.6: a second run's `outcome` is run 2's own); they carry no `dtFinish`, so
    nothing could attribute them to a generation (§4.11); and the first-run row is complete and
    frozen. Run 1 is the first-run Attempt, `siblingPhaseId:bib`, with its own generation.
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
  note in it (`"pozor !!!!!"`, `Pen="1"`). Keep the first `slotCount` cells; cells beyond it belong
  to no slot and raise nothing (a recorded 127-character `Gates` carried the remains of a note in
  cells 22–23 of an 18-slot course). **The empty string is thirty missing cells**, not no statement:
  a row that states a result — a time or a mark, `CONTRACTS.md` §4 INV-7's own test; a placement
  alone is no result of this run, a second-run row carrying the pair's placement with no time being
  INV-7's retraction case (round 20, second pass) — states its `gates` vector,
  every cell `null` for `Gates=""`, `provisional` by §4.4 (a mark closes the run, so a `DNS` row's
  all-null vector is settled); a row stating neither states nothing, its `Gates` included
  (round 20; recorded: `IRM="DNS" Gates=""` on second-run rows, nkz-19so K1M_BR2_19:107). Kayak
  Cross `faults` keeps its own rule, (d).
- **Never split on whitespace.** That collapses blanks and shifts every later gate: `EVIDENCE.md`
  Exhibit 2.
- The previous rule, `width = length / gateCount`, was wrong on every row of a 23-gate course. On a
  9-gate Cross course it divided evenly as width 10, which is silently wrong.

**No course bound yet** (§0.5). With no course in `ctx` the parser emits the parsed cells as they
stand — `cells`, 30 from a fixed-width string, every token from an on-course string — and no `gates`
or `faults`, and raises no `unparseable-cell`, since a cell may belong to no slot. The core retains
the latest cells per source and decides among three states:
- **`not-yet`** until one of the other two holds (`CONTRACTS.md` §1.2): a real `RaceConfig` seen
  while the snapshot is still pending decides nothing.
- **`known`** once a snapshot binds a course to the Phase — `courseId` known and that Course's `gates`
  known; only the snapshot carries course numbers (`CONTRACTS.md` §2.12), so a `RaceConfig` never
  binds — built from the retained cells: `Gate[]` from the first `slotCount` cells, or in Kayak Cross
  `faults` from the cells and the captions (d); the parser's cell→`Gate[]`/`faults` function is
  reused.
- **`unavailable{not-configured}`** when nothing configured can supply a course: the XML source is
  not configured (`SourceStatus.xml`, §5), so nothing can ever bind; or the snapshot shows the Phase
  with no `CourseNr`, or a course whose layout is empty (the snapshot's determination). A fabricated
  `RaceConfig` (§2.3's tests) decides nothing presented: it names no Phase to hold the state for
  (round 19), so the parser's `fabricated-course` is an ingest-only diagnostic. A snapshot that
  later binds a real course replaces `unavailable` with `known`.

The core presents whichever state holds at a step that carries gate cells for the Attempt — a result
row or an on-course listing — or at a scope snapshot of its race, never at the `RaceConfig` or
`SourceStatus` step itself (`TEST-ARCHITECTURE.md` §3.2 properties 3 and 4). The spike's replay
windows reached this path: S1-12 (cold-start finishers whose completeness is unknown until the course
binds) and S1-30 (an Attempt listed while no course is bound), the case property 11 names as "the
results push precedes the first snapshot" (`DECISIONS/ADR-017` D4); whole recordings were not counted.

**(c) Team rows** (`TR1/TR2`, `TSR`, `TS1/TS2/TSF`, `TFI`; source and static sample only, no recording).
- `Gates` holds the per-gate **sum** over the members (4, 52, 100, 150…). Upstream computes it from
  the member cells whenever one changes, and leaves it blank while any member is unjudged; a `C`
  mark counts as 50.
- `XML.Results.Gates1..3` hold each member's cells, in the same fixed-width format, and fill
  `memberPenalties`. **TCP never carries them**, so `memberPenalties` appears at the next snapshot.
- A crew cell that differs from the member sum (8 of 691 judged cells in the sample) is a
  crew-level edit made upstream; present the crew cell, raise `member-sum-mismatch`.

**(d) Kayak Cross.** Settled on the recorded Cross event and verified upstream behaviour (E1):
- The cells are **fault marks**, not penalty seconds: only `""`, `0` and `2` occur; any other text is
  `unparseable-cell` and `null`. `gates` is `unavailable{not-applicable}` for Cross Attempts.
- `faults` is `not-yet` while no cell is judged: a `{ count: 0, gates: [], lastCleanSlot: 0 }` would
  assert a judging that has not happened. Once any cell is judged it is emitted whole, `provisional`
  under §4.4's rule read over the slot cells: the parser stamps `judgingComplete` on the `faults`
  observation — every slot cell judged — exactly as on `gates`, since the value itself carries no
  blank (round 19). The stamp lives on the `faults` observation alone, and only on a `known` one: a
  `not-yet` `faults` (every slot blank) carries no key (`CONTRACTS.md` §1.2) and no stamp, so an
  untimed row of a bound course is not under the judging clause; a row's outcome observation
  carries `runClosed`, never a judging stamp (§4.4), so no other stamp decides `provisional`
  (round 23, review O1).
- **`faults` is derived from the cells plus the captions, on TCP and in the XML alike:** `count` is
  the number of cells marked `2`; `gates` lists those slots' captions (`ST`, `1`…`6`, `RZ`, `7`);
  `lastCleanSlot` is upstream's 1-based **slot position** (not the gate number: `ST` and `RZ` count) of
  the last slot judged `0` before the first fault; `0` if none; a clean run on the recorded 9-slot
  course reads `9`, above its 7 numbered gates (values seen: 0 ×176, 9 ×122, then 3, 8, 6, 2, 1). This
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
- **Within one kind the later observation replaces the earlier whole** (`CONTRACTS.md` §4 INV-2c,
  the same-source sentence): a cell the stream judged and later shows blank is blank — upstream
  withdrew it (recorded: nkz-19so K1M_BR2_19:79, cells 14–17 shown judged 25 s into a 90 s run and
  blank 11 s later, with no row of the generation yet: nothing stood against the blank; round 23) —
  while a row's judged cell stands against a stream blank. The merged vector is
  a results-table value with cells taken from the stream, not an inference: once the stream fills
  the last blank cell it is settled (`CONTRACTS.md` §1.2, round 20). Before any row of the
  generation the stream's vector is an on-course inference, `confidence: 'inferred'`; the merged
  vector carries the row's envelope, `observedAt` the element's that last changed its cells
  (`CONTRACTS.md` §1.2; round 24).

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
- **An empty `Rank` means no placement: `not-yet`.** `RankOrder` alone is upstream's grid sort key — a
  marked row's keeps moving as other athletes finish, a Cross heat's is the lane order — and is carried
  for no one. `placement` is `known` iff `Rank` is non-empty; `ral` rows carry one. A `Rank` with an
  empty `RankOrder` (never recorded) gives no `placement` and raises `unparseable-field`; nothing is
  invented.
- **Never read `OnCourse.Result[T]@Rank` as placement.** At the start of a second run it holds the
  first run's rank. It is blank for most first-run finishes.
- **Upstream pushes the second-run race whenever the first run changes.** So a second-run Attempt has
  a combined placement before it is run.
- **Category ranks are read only from rows whose `CatId` is set** (`CONTRACTS.md` §5 step 4). On a
  second-run row with an empty `CatId`, `TotalCatRnk` repeats the class rank and `PrevCatRnk` holds
  the category rank; up to 196,621 such row-instances per recording.
- **Envelope.** `confidence: 'authoritative'`. `provisional` follows §4.4; in a Kayak Cross heat the
  placement, the ordinal built from it and the `qualified` and `underReview` stated with it leave the
  judging clause at the step the placement is presented (`CONTRACTS.md` §1.2 states the exemption;
  §4.2).

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
- **`qualified`** is `Results.Result@Q` or `XML.Results.Qualified`, equal to `"Q"`, stated `known` on
  every result row that carries a time, a mark or a placement (a blank row states nothing, INV-7) in a
  Phase whose `stage` is not `final`, `super-final` or `classification`; on a `run` Phase without a
  cut this is `known: false` throughout. On
  those three it is `unavailable{not-applicable}`, except that a row there carrying `Q` is still
  presented `true`: a stated fact is never dropped. The boundary is by `stage` (round 17, E4;
  recorded: `Q` throughout the junior time trial, E1).
- **`underReview`** is §4.1's `*` mark.

### 4.8 On-course extras

- **`courseOrder`** is `OnCourse@Position`: 1 is closest to the finish. It is a property of the
  message, which carries one participant. Slalom showed up to 12 simultaneous positions.
- **The on-course set** (`CONTRACTS.md` §7.1) is upstream's list as the stream shows it. An Attempt
  enters at its first on-course message and leaves at `oncourse-left` (§4.1: upstream stopped listing
  it) or at the explicit course-empty message. The leave is the core's own evaluation at a TCP
  message (§0.5), never an input: a vector supplies `oncourse-left` by hand because it has no stream
  to evaluate, and a replay step records the leaves the core derived at its message as elements the
  checker verifies against the raw stream (`TEST-ARCHITECTURE.md` §3.2; round 24). A finish transition changes `status`, not membership:
  upstream keeps the finisher listed until it closes the run, about 20 s later (`Completed="Y"` where
  auto-complete is on, else removal). The set is ordered by each listed Attempt's `courseOrder`; an
  Attempt whose message carries no `Position` sorts last by `startOrder`.
- **`featuredByUpstream`** (`CONTRACTS.md` §7.1) is the Attempt named by `TVS@Odd_Bib`/`@Odd_RaceId`
  when that bib is on the on-course list, else by `@Even_Bib`/`@Even_RaceId`, else `null`. Upstream
  alternates the two channels by starter. It is optional; the default featured competitor is the
  first Attempt of the on-course list, the one next to pass the finish (maintainer answer, round 2).
- **`timeToBeat`** comes from `OnCourse.Result[T]@TTBDiff`.
  - An unsigned value (`88.38`) is `mode: 'target'`.
  - A signed value (`+1.23`, `-0.40`) is `mode: 'delta'`.
  - An empty value emits nothing: the field is `not-yet` before the first value, and the last value
    stands until the run's end (INV-1; run-scoped).
  - `holder` is `@TTBName`.
  - It is never a rank.
- **`splits`.**
  - Source: `OnCourse.Result[C]@dtSplit1/2`, or `XML.Results.dtSplit1..3`, minus `dtStart`.
  - Only when splits are armed (`RaceConfig.NrSplits > 0`); `unavailable{not-applicable}` otherwise.
    The armed state is the core's, from the parser's `splitsArmed` (§2.3); the parser emits `splits`
    whenever a split time is present. The `unavailable` is presented at the Attempt's next step that
    carries it or at a scope snapshot of its race, never at the `RaceConfig` step itself (as §4.6's
    `not-configured`; `TEST-ARCHITECTURE.md` §3.2 properties 3 and 4; round 24).
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
  `1/2`, `1/4`, `T`), verbatim: an open token, not a format (`CONTRACTS.md` §2.7). TCP's
  classification rows carry no `RecordType`: a row's `decidedIn` is `null` until the snapshot states
  it for that `entryId`, and the core keeps the snapshot's across later TCP rows.
- On site the rows reach the core as a scope snapshot of the classification Phase whose rows are
  `CONTRACTS.md` §8.3 `ClassificationRow`s (`CONFORMANCE-VECTORS.md` §1), and as nothing else: the
  parser emits no `{push: 'classification'}`, which is the bridge's message to live. **Precedence:**
  classification rows are no Attempt's fields, so INV-2 rules 1–2 do not apply; the later-ingested
  snapshot replaces the Phase's rows whole, whatever its `mode` (an empty table is start-list mode,
  §0.3) and whichever source, under INV-2c's guard alone: an `xml` snapshot replaces rows a `tcp`
  snapshot built only when its `changedAfter` is later than that snapshot's `observedAt` (`null`
  never), and a `tcp` snapshot always replaces. Recorded (cp3-cross, E2, `scan-cls.ts`, third pass
  of round 18): at 10:26:13 the XML carried upstream's newer build ahead of TCP's rotation, by 89 s
  (MX1_XER_26, TCP at 10:27:42) and 119 s (WX1J_XER_26_JUN, TCP at 10:28:12), which rule 2 would
  have held back; on the reversal TCP led, by 21 s (MX1_XER_26, 10:28:42, XML 10:29:03) and 44 s
  (WX1J_XER_26_JUN, 10:29:24, XML 10:30:08). The guard admits both and still refuses a
  save-cycle-stale file. `decidedIn` is kept per `entryId` from the last **admitted** XML row where
  the TCP row states `null` (above); a refused snapshot moves nothing, `decidedIn` included (INV-2c
  "retained and not presented"; E4, the recording holds no refusal). The core dates the
  Standing's `asOf` by the `observedAt` of the latest snapshot that changed it (`CONTRACTS.md` §5;
  TCP re-sends the same rows on rotation, 10:27:12, 10:35:14, 10:43:16, which move nothing), and
  publishes the Standing first at its first row: an empty table before any row publishes nothing;
  **one after rows changes nothing: the last built Standing stays presented, `asOf` showing its
  age** (maintainer decision, 2026-11-06, closing §10 item 22; no recorded instance; what rounds
  18 and 19 said of whole replacement and of an empty table as a start-list snapshot holds for a
  snapshot carrying rows, and a classification's empty table from either source is no retraction,
  §0.3). The bridge therefore never pushes an emptied classification to live, and
  `PUT …/classification` with `rows: []` is refused there (`CONTRACTS.md` §8.3, §8.6). The gate-2
  checker reads that shape (`TEST-ARCHITECTURE.md` §3.2 property 15;
  `classification-emptied-keeps-last-standing`, owed).
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
- **The generation increments on exactly one trigger:** an on-course listing of this
  `«phaseId,bib»` with a non-empty `dtStart` different from the generation's recorded start **and
  an empty `dtFinish`, while the generation is recorded.** Two terms, stated here once (round 19 and
  its second pass; every other section points here):
  - **The recorded start** is the `dtStart` of the generation's first listing that carries one,
    compared as the listed text. The listing that gives it changes nothing of this section's — no
    `run`, no correction — and is otherwise a listing like any other: a finish the table presented
    before any start is contradicted by it when it carries no finish (INV-2d, §4.12; the cold-start
    or outage shape of a non-wizard re-run, the row then unpresented until the new finish), while a
    mark is no finish and stands (round 20) (eight recorded Attempts reached their first start
    with a `DNS` or `CAP` already on the table, seven of them cleared before the start; compared
    against an unset start they would have made nine increments of the recorded one). A listing
    with `dtStart` empty leaves it as it is — a start deleted is given again, recorded twice; a
    finish impulse with no start, once — and takes its `status` from §4.1.
  - **Recorded** means a results-table row carrying a time or a mark was attributed to the
    generation after its recorded start was known and stated something the table did not already
    hold for it on either source. **A mark standing on either source at the recorded start records
    nothing however it arrives afterwards:** re-sent by a rotation of its own source, it is INV-5's
    re-delivery; first carried by the other source once a save catches up, it is the same mark
    (third pass, E1: nkz-19so K1M_BR2_19:54, TCP `DNS` 09:46:35.827Z, the start 09:46:59.844, the
    XML's first `DNS` 09:47:02.964, 3.1 s after the start; a save lags up to one cycle, so any mark
    typed in the 35 s before a start arrives this way). So a mid-run correction for an athlete who
    raced after a cleared or standing `DNS` keeps `run` 1, which is what the term is for: no false
    increment on a first run. A mark no source held at the start, attributed after it, records (the
    mid-run mark, §10 item 23). A mark here is one of §4.1's result marks that sets `status`; `*`
    (`underReview`, §4.1) with no time states no outcome and records nothing (third pass, rule:
    K1W_BR2_18:16's XML `*` 25 s after its start keeps `run` 1). A retraction since does not un-record it (the run was
    raced; its result was deleted, which is the re-run's first half). A contradiction does (INV-2d:
    the athlete is on course with that start, so the row described no finish of this run); the
    next row attributed records it again. The stream records nothing by itself: a finish it lists
    with no row behind it is its to withdraw (§4.1), so §4.1 and this rule never claim one listing;
    and a TCP row retained until the generation's finish (attribution, below) records at its
    attribution, not before.
  **Every other change of the listed start is a start correction** within the generation (round 19,
  E1): the recorded start becomes the listing's, and the `Time` the generation remembers at its
  finish becomes the listing's where the listing carries the finish; at the listing no
  results-table value, no `run` and no placement changes (INV-2 rule 1: an inference never
  supersedes a row), while the on-course inferences follow it as they follow any listing (§4.3:
  `running` takes the new `Time`, recorded 0 → 89; a `duration` not yet superseded takes it too)
  and `status` is the listing's by §4.1, a start correction being no transition of its own; the
  moved time arrives as the next results-table row and supersedes by `CONTRACTS.md` §4 INV-2c's
  same-source sentence; checks keep their generation and their `status` is recomputed only if the
  presented `gates` change; a pending write stays pending (§6: the re-pushed row is no echo unless
  the target cell moved). Recorded, all seven start changes of the seven recordings, scanned from
  the raw stream:

  | Case | Listing that changed the start | What it was | Ruling |
  |---|---|---|---|
  | jarni-so-do K1M_BR1_18:138 | 08:01:53Z, 10:01:01.650 → 10:00:23.480, no finish, no row ever | start moved 38 s earlier mid-run (`Time` jumped 0 → 89) | correction |
  | nkz-19so K1W_BR2_19:9 | 14:54:36Z, 16:54:19.290 → 16:53:39.150, no finish, no row of run 2 | start moved 40 s earlier mid-run | correction |
  | nkz-20ne K1M_BR1_20:115 | 07:16:24Z, 9:15:37.960 → 9:16:16.250 after a listing with `dtStart` empty at 07:16:19; no finish, no row | a false start deleted and the real one given 38 s later | correction |
  | jarni-so-odp C1M_BR2_18:56 | 13:53:25.786Z, 15:51:40.580 → 15:51:01.220 with the same `dtFinish` 15:53:02.200; the row 81.62/rank 11 → 120.98/rank 60 pushed 101 ms earlier | start moved 39 s earlier after the finish | correction |
  | nkz-19so K1M_BR2_19:53 | 09:48:43Z, 11:47:38.170 → 11:46:59.980, same `dtFinish`; row 49.77/rank 1 → 87.96/rank 30, 199 ms earlier | the start impulse had been bib 52's; 14 s of a false leader, upstream's own | correction |
  | nkz-19so K1M_BR2_19:52 | 09:49:12Z, 11:47:38.520 → 11:47:38.170, same `dtFinish`; row 92.09 → 92.44, 192 ms earlier | the impulse handed over from bib 53, 2 s after the finish | correction |
  | nkz-19so C1M_BR1_19:7 | 12:40:20Z, 12:46:59.950 → 14:40:20.430, no finish; the generation's finish 12:48:36.640 was listed at 10:48:37, its row retracted at 10:56:58 | the jury re-run below | **new generation** |

  The earlier trigger, a different `dtStart` alone, incremented on all seven: for the three
  post-finish corrections it wiped the row pushed 0.1–0.2 s before the listing and left the Attempt
  at `not-yet` until the race's next push (10 min for C1M_BR2_18:56), set pending writes
  `superseded` and reset checks; for the other three (two mid-run, one start deleted and given
  again) it presented `run: 2` for an athlete with no recorded run and dropped a second run's
  carried-over pair fields. **Both arrival orders**
  give the same end state: row then listing (recorded, all three post-finish cases) presents the
  new time from the row and the listing changes nothing; listing then row keeps the old row for
  the interval, since no finish is contradicted (`dtFinish` present) and no generation changes, and
  the row supersedes when it arrives. **What the stream cannot decide:** a re-run whose start and
  finish both fall inside a TCP outage reaches the server as one listing with a new start and a new
  finish, which this rule reads as a correction (`run` stays, the newest row rules, nothing is
  hidden); the alternative reading would wipe a correct result until the race is pushed again. The
  safer default is the correction. Its mirror image: a mark attributed mid-run (a `DNF` typed while
  the athlete is still listed) records the generation, so a start change with no finish after it
  reads as a re-run — right when the mark ended the run and the jury granted another, wrong when
  the mark was a slip and the start was corrected afterwards. Neither shape is recorded; §10 item
  23 carries both to the maintainer. A row retained in the row-before-finish window records
  nothing until attributed, so a correction inside that window is a correction; rows are retained
  that way only in a generation begun by a new start (attribution per source, below), while in the
  first generation a row before the finish is attributed on arrival and records then, so a moved
  start with no finish inside that window would increment (third pass, rule; not recorded: §4.4
  finds no finishless listing in any of the 86 windows). `OnCourse.Participant@Warning`
  decides nothing: it was empty at the recorded re-run, the row having been wiped two hours before.
  A result row observed cleared is a **retraction** (§4.12), not a generation change
  (`DECISIONS/ADR-013` Revision). A re-run therefore appears as a retraction, often invisible on TCP
  because the re-run wizard pushes nothing, followed by a new start.
- **The recorded episode** (nkz-19so, C1M_BR1_19 bib 7, the same participant both times; E1): run 1 on
  course 10:46:44Z, finish 10:48:37, result push Pen 6 / 96.69 / rank 1, closure 10:48:45. At 10:56:58
  the TCP row was wiped in place — empty time, rank, penalty and gates: a retraction, INV-7's
  present-and-empty case (the XML had emptied it at 10:51:53). By 12:02:04 the row was gone: a
  retraction again, a no-op. Staged with no start at 12:40:09 (`not-started → at-start`); run 2's
  start 14:40:20.430 listed at 12:40:20 (the generation increments), result push
  12:41:44.250 with the new score, on-course finish 12:41:44.358 — the row arrived 108 ms before the
  finish and was attributed when the finish arrived with the same `Time`; closure 12:42:47. Upstream's
  sequence is present-with-score → present-empty → gone → present-with-new-score, never a straight
  wipe. M1 replays it (`DECISIONS/ADR-017`).
- On increment, the run-scoped fields become `not-yet`, and the change is pushed.
- **`run` is the core's** (§0.5). The parser emits no `run`; the core stamps the generation on each
  observation when it attributes it (below), and that stamped element is what the replay log and the
  vectors carry (`CONFORMANCE-VECTORS.md` §1). An observation the parser marked `run: 1` would claim
  a generation it cannot know.
- **Attribution per source.** An XML row whose `dtFinish` precedes the new generation's start
  describes the replaced run. A TCP row carries no finish time: within a generation that began with
  an observed new start, it is the current generation's only once that generation's finish has been
  seen on the on-course stream and the row's `Time` equals the on-course `Time` at that finish (the
  two are identical, §4.4); a TCP row carrying a time that arrives before that finish is retained and
  attributed when the finish arrives with the same `Time` — the usual order, §4.4: 72 % of recorded
  finishes, the run-2 push 108 ms before the finish among them — and presented then with its own
  envelope, `observedAt` the row's delivery, not the finish's (the attribution is the core's
  evaluation, the observation the row's; `status` at that unit is the listing's, §4.1; round 25,
  second pass) — else it describes the replaced run;
  a TCP row carrying a mark and no time cannot be attributed and is judged by the stale-mark rule
  (§4.12) whether or not the generation's finish has been seen: equal to the remembered mark, it is
  withheld with `stale-mark`; different, it is presented. Either way the replaced run's row
  is retained as history and never presented. After the new finish, upstream's one row per bib is the
  new run's, so a later TCP row with a different `Time` is a correction and supersedes (same source,
  INV-2c).

### 4.12 Retraction and contradiction (`DECISIONS/ADR-015`)

**What upstream emits for each correction** (observed upstream behaviour, E1):

| Operator action | On TCP |
|---|---|
| A status, time or penalty edited in the results grid, including set to empty; a paste; a finish impulse given, also after the fact; an on-course row relabelled to another bib once it has a total; a scoring-terminal correction; "delete all results" | immediate push of the race |
| "Delete selected results"; a start or finish impulse deleted with the delete-impulse command; the re-run wizard; a start-terminal DNS; DNF or DSQ before the finish | **no push**; visible at the race's next push, at rotation, or in the XML |
| A finish cleared or overwritten on the on-course grid; an on-course row relabelled *away* from a bib | **the stored row is not even cleared**; the old result stays in every later push until the athlete finishes again or the operator edits it |

**Retraction from a TCP push** (INV-7). For each Attempt of the race whose presented result fields
came from results-table observations:
- **First-run or single-run race.** The row is absent, present with no time and no mark, or the
  message is in start-list mode: retract `outcome`, `gates`, `placement`, `underReview`, `qualified`
  and any mark in `status`. Recorded: three cleared DNSs vanished this way, and all three athletes then
  raced; a jury-invalidated run was wiped in place and later re-run (§4.11).
- **Paired second run.** The row is absent: retract as above plus `pairTotal` and `countingRun`. The
  row is present with `Time` empty and `IRM` empty: retract run 2's `outcome`, `gates` and any mark in
  `status`; take `placement` and `pairTotal` from the row, since an athlete with only a first-run
  result is listed that way. Recorded: five DNSs and one CAP cleared in place; C1W_BR2_19 bib 7 went
  `dns` → `not-started` and then raced.
- **Never:** an Attempt whose outcome is still an on-course inference; an Attempt never present in a
  results-table observation; a row that was never present.

**Retraction from an XML snapshot.** The row carries no time, no finish time and no mark, for an
Attempt previously known from a results-table observation: for a first-run or single-run row, retract
as the TCP first-run case; for a second-run row, as the TCP time-empty case — before run 2 every
second-run row already carries `TotalRnk` and `TotalTotal` with no time. An absent XML row and an
XML table with no rows state nothing (`CONTRACTS.md` §4 INV-7; the file lists every entry, §0.3).
**Guard (INV-2c, content age):** apply it against a `tcp` observation only when the snapshot's
`changedAfter` (§0.3; `null` never qualifies) is later than that observation's `observedAt`.
Otherwise the snapshot may predate the push, and it is ignored for that field until the next
snapshot. The same guard applies to the mark exception of INV-2 rule 2, and to any snapshot value
displacing a `tcp` value during an outage. Recorded: the XML was five minutes *ahead* of TCP's rotation on one
jury-invalidated row (C1M_BR1_19 bib 7, later re-run, §4.11), and 7 s behind TCP on a cleared DNS.

**After a retraction,** `status` is what the on-course stream currently shows for the Attempt
(`at-start`, `on-course`, or a `finished` it still lists), else `not-started`. An XML retraction that
passes the guard supersedes the `tcp` observation it retracts: that value is no longer a candidate
of its source (a `tcp` marker would outrank every later XML value while connected), and a TCP row
restating it afterwards is a new observation of upstream's table and is presented.

**A finish moved earlier.** A results-grid edit that gives an athlete an earlier finish than the one
presented — two athletes' finishes swapped, three results shifted back to their owners one by one —
arrives as an ordinary push of the race. The later-ingested row of the same source supersedes,
whatever its `dtFinish` (`CONTRACTS.md` §4 INV-2c compares content age across sources, never event
times). Recorded: jarni-ne-odp 12:55–13:05, three athletes corrected one by one (not yet replayed; M1).
The nkz-19so 10:05–10:30 event once cited here was a gate-penalty move with unchanged event times, not
evidence either way. The previous edition's event-time floor would have refused the correction for
every athlete whose true finish was the earlier one.

**Contradiction by the on-course stream** (INV-2d). Track per Attempt and generation the finish last
presented from a results-table observation: its `eventTime` where one is known (the on-course finish,
or the XML row's `dtFinish`), else `null`, and its run time. When an on-course message lists the
Attempt with the generation's `dtStart` and an empty `dtFinish` after that:
- record the contradicted finish as `{ finishTime, runSeconds }`; present `status: on-course`,
  `outcome: running`, `placement`/`pairTotal`/`countingRun: not-yet`; raise `contradicted-finish`
  with both;
- keep every results-table row for the Attempt carrying that finish — `dtFinish` equal where the row
  has one (XML), else `Time` equal (TCP) — retained and unpresented, also after the lift;
- lift the record when a row carries a different finish by the same comparison, a mark, or a
  retraction, or when the on-course stream lists the Attempt with a `dtFinish` again.

Recorded: in both contradictions of the spike's windows (nkz-19so 07:56 bib 55, 09:37 bib 67) the
false row came first, the stream showed its finish 98 ms and 257 ms later and before the
contradicting listing, so the row had gained it as `eventTime` (§4.4) and `finishTime` carries it;
the match is by run time either way. `contradiction-oncourse-running-again` elides that listing and
asserts `null`, which is right for what it feeds (round 20, E1; the earlier sentence described the
spike).

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
carried when the generation incremented. On **any** row of generation ≥ 2 — attributed by its finish,
or carrying no time and so not attributable — a mark equal to that remembered one is not presented
and raises `stale-mark`; the row's time and cells, where it has them, are attributed and presented as
usual. A different mark is presented, whether the athlete is still on course (a DSQ entered mid-run)
or not; once it is, the withheld mark is no longer on the row and the diagnostic clears. The earlier
wording, "a mark on a row with no new finish is presented", contradicted §4.11 and would present a
stale DNF over a running athlete in the usual arrival order, where the row precedes the finish (opponent
review R16, E2: the spike applied the stale-mark check only to rows it had attributed).

**Standing after a retraction or contradiction:** the entry is unplaced (`CONTRACTS.md` §5 step 3).

---

## 5. `SourceStatus`

- **`tcp.state`, `xml.state`.**
  - A connection state machine: `connected` while the socket or file watch is open and live;
    `reconnecting` while a reconnect is in flight; `unreachable` after a stated number of failures.
  - `xml` is `not-configured` when no path is set; `reconnecting` from the moment a path is set
    until its first poll reports; then per `CONTRACTS.md` §2.8: `connected` when the last poll found
    the file unchanged since the last whole read or read it whole (a change under retry counts),
    `reconnecting` on a failed poll — missing, unreadable, or invalid with a stat unchanged since
    detection (§0.3) — and `unreachable` from the fifth consecutive failure. A valid file naming no
    race is `connected`.
- **`tcp.upstreamInstance`** is `Canoe123@System` on every message: `Main`, `Backup` or `Offline`.
- **`tcp.timingClockOffsetSeconds`** is `TimeOfDay` (Canoe123's timing clock, once a second) minus the
  server clock at receipt. It is diagnostic only.
- **`live`** is the bridge's own delivery state (`CONTRACTS.md` §2.8): `connected` after an accepted
  push with nothing pending; `retrying` while backing off; `unreachable` after the backoff has reached
  its cap; `rejected` on `401`/`403`; `not-configured` with no key. `pendingResources` counts
  resources whose current state is not yet accepted; `lastAcceptedAt` and `lastError` are what they
  say.
- **`xml.lastRewriteDetectedAt`** is the first detection of the change last read whole (a change
  under retry or abandoned is not reported until read whole) **of the path currently set**: a unit
  delivered for a path replaced during its delivery (`setPath`, or stop and start, re-entered from
  `onUnit`) leaves it untouched, since the stamp would describe the old path (#255). This is what INV-2's rule 2 means by
  "a rewrite detected after the disconnect"; the guard of §4.12 reads the unit's `changedAfter`
  (§0.3), not this field. The file is written on a timer (a venue setting, 65 s by
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
  field. The field is the target gate's cell: the `gates` cell whose `number` is the gate the request
  names (#212; in the vectors, the `number` of `requestedValue`'s one cell), its `penalty` against
  the requested one; a row in which only another cell moved re-delivers the target cell and is no
  echo.
- An echo is an observation that changes its source's retained value of the field or states the
  requested value (`CONTRACTS.md` §4 rule 4): a rotation re-sending the old cells, or a row
  re-pushed because a start was corrected (§4.11), is a re-delivery (INV-5) and no echo. A write
  whose correction upstream dropped therefore stays `pending` until the cell changes, which is
  `DECISIONS/ADR-010`'s lost echo. An `xml` observation is an echo only if its content age
  (`changedAfter`) is later than `submittedAt`; a save written before the correction is retained and
  settles nothing.
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
15. **#179 answered** (2026-09-25, E1): start ramp and roll zone as judging slots (§2.3,
    §4.6); Cross faults derived from the cells, `Pen` ignored (§4.6(d)); `SLER`/`WWER` as
    classifications with stated staleness (§4.10); super-final and legacy final as summed pairs,
    relayed (`CONTRACTS.md` §2.4); attribute sub-classes as ordinary classes (§2.1); the re-run
    wizard's silent wipe and the stale mark (§4.11, §4.12); the reset-scoring-terminals action never
    touching the write channel, and writes addressed to the connected instance (`CONTRACTS.md` §7.3).
14. **Retraction is first-class** (§0.3, §4.12; `DECISIONS/ADR-015`). A TCP result push and an XML
    snapshot are complete statements of a race; their stated absence retracts. The on-course stream
    contradicts a finish taken away on the on-course grid, which upstream never clears. A mark
    overrides a time. A result row observed cleared is a retraction, not a new run generation.
16. **INV-2c compared event times; it now compares content age across sources** (round 8,
    2026-10-14; §4.12). The event-time floor refused a corrected finish earlier than the presented one,
    the routine shape of a swap or a shift back. The replaced run of a re-run is kept out by
    generation attribution alone (§4.11).
17. **The on-course set is upstream's list** (round 8; §4.8). A finisher stays in it as `finished`
    until closure; the earlier `CONTRACTS.md` §7.1 dropped it at the finish, 20 s before the write
    rule's closure.
18. **A TCP result row carries no finish time** (round 9, `DECISIONS/ADR-017` D1; §4.4, §4.11, §4.12).
    Attribution to a generation and the INV-2d match work by run time on TCP, by `dtFinish` on XML.
19. **`placement` is known only when upstream ranks the row** (D2; §4.2, §4.7). `RankOrder` alone is a
    sort key: a marked row's moves with every finish, a Cross heat's is the lane order.
20. **Provisional is computed on the presented gates; `status` is never provisional** (D4; §4.4).
21. **The leave rule has a number**, `onCourseLeaveAfterSeconds` = 3 s, and `at-start` is any listing
    without a start (S1-8, S1-16, S1-17; §4.1). Round 20 set it to 4 s from the whole distribution
    (§4.1).
22. **The parser/core line is stated** (round 17, 2026-11-05, server#201 review and #247; §0.5).
    the six `Prev*` run-1 columns are not read (§4.5); `run` is stamped by the core (§4.11); cells are retained before a
    course binds (§4.6); the untimed flag is the parser's and its inheritance the core's, 47 Attempts
    (§4.4); an untimed row is `finished` (§4.2); an `XT` `duration` carries `penaltySeconds: 0`
    (§4.4); `faults` is `not-yet` until a cell is judged (§4.6(d)); `qualified` is bounded by `stage`
    (§4.7); every row states `underReview` (§4.1); `decidedIn` is `null` from TCP (§4.10); DST
    arithmetic and the `NA` schedule rows are stated (§0.2, §0.4); `Member1..3` are not carried (§3).
23. **Content age is the reader's `changedAfter`, not detection minus the interval** (round 18,
    2026-11-05, server#202 review; §0.3, §4.12). The subtraction overstated a first read's freshness
    by the file's whole age and a delayed poll's by the delay; `null` on a first read refuses what
    cannot be dated. Also: an empty table is a start-list scope snapshot, the on-site parsers emit no
    classification push, the `xml` states are defined for an invalid and an empty file (§5), and a
    repeated sector end is dropped (§2.3).

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
| `Results.PrevTime`, `PrevPen`, `PrevTotal`, `PrevStatus`, `PrevRnk` (slalom meaning), `PrevRnkOrder` | Run 1's figures restated on the second-run row. Run 1 is its own Attempt, whose row is frozen and complete (§4.5); `PrevCatRnk*` stays the §5 step 4 check |
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

Items 1–7 and 13 were answered on 2026-09-25 (#179; E1, verified upstream behaviour); item 8 was closed by INV-2c
on 2026-10-14; items 15 and 17 were answered by the spike and the exit-delay measurement; item 16 by
the round-20 measurement; item 22 by the maintainer (2026-11-06). Items 9, 11, 12, 18, 19, 20, 21
and 23 remain.

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
   is added. Their operator-typed time-trial rows are handled as untimed rows (§4.4), whatever the
   reading turns out to be.
6. ~~Per-gate marks in Kayak Cross on TCP.~~ **Answered:** fault marks in the cells, never `Pen`
   (§4.6(d)).
7. ~~Does a re-run clear the row at staging or at the new finish?~~ **Answered:** the wizard wipes it
   at once with no push; staging without the wizard never clears it (§4.11).
8. ~~After a TCP disconnect, the first snapshot rewrite detected afterwards takes over (INV-2, rule 2).
   If that rewrite happened in the few seconds *before* the disconnect, its content can predate TCP's
   last push.~~ **Closed (round 8, 2026-10-14):** INV-2c compares content age across sources; a
   snapshot whose `lastRewriteDetectedAt` minus the poll interval predates TCP's last observation of
   the field is not presented, and the next snapshot is.
9. Rule 2's exception lets an XML mark supersede a TCP `at-start`. If a DNS is *cleared* in the grid,
   which pushes immediately, and the athlete is staged again within one snapshot interval, a
   snapshot written before the clearing can show DNS for up to about 35 s. This is rare, and accepted
   as residual. Narrowed (round 20, second pass): the restaging listing is a delivery of the
   `at-start` (`CONTRACTS.md` §4 INV-2c), so a snapshot written before it is refused by the guard;
   what remains is a snapshot written between the clearing and the restaging.
10. ~~The cause of the 11–27 s late-finish outliers.~~ Answered (maintainer, round 2): the operator
    assigns a finish retroactively after a judge reports the passage, or swaps two athletes' finishes
    noticed late. Both are corrections that §4.12 now models.
11. Which operator action produced each recorded retraction cannot be read from the stream. The
    "stale row survives" behaviour matches the on-course grid edit path. No recorded instance of
    "delete selected results" exists; its no-push behaviour is verified but unrecorded (E1).
12. Whether today's live-mini XML ingest overwrites results that were cleared on TCP (E4).
14. ~~Whether upstream's terminal channel can set a result mark on a closed run.~~ **Answered (2026-09-25,
    E1):** no. The only status command targets an on-course slot by position and
    ignores the bib; on a closed or never-started run there is no slot, and no command clears a mark.
    The status write has left the contract; marks are the operator's (`CONTRACTS.md` §7.3).
13. ~~A no-reorder penalty correction after racing ends may never trigger an XML write.~~ **Answered:**
    confirmed (E1); the conditions are stated in §5 and `CONTRACTS.md` §2.8. TCP carries
    it regardless, and the maintainer confirms the file is always saved at the end, so the gap is a
    transient window, never lasting.
15. ~~Whether upstream's on-course message still carries `Position` for a finisher it keeps listed
    until closure.~~ **Answered (spike S1 sweep, E1): yes.** 68,894 of 68,894 on-course messages for
    listed finishers carry `Position`.
16. ~~The distribution of unchanged-listing gaps behind `onCourseLeaveAfterSeconds` (§4.1), measured over
    all recordings **with no cut-off** (the spike's measurement evicted entries older than 2.5 s first and
    was circular). Known so far: 3.04, 3.68, 3.86, 4.29 s with the stream alive, then 9.67 s. The
    constant is 5 s until M1 sets it; whether the four gaps are rotation hiccups or real unstage/restage
    decides whether it can be smaller.~~ **Answered (round 20, 2026-11-06, E1):** measured over all
    seven recordings; the four gaps and the 9.67 s one are real unstage/restage (a full cycle of
    `Total` distinct other bibs listed inside each), the longest hiccup is 2.59 s, the constant is
    4 s (§4.1). Re-measure when a recording is added, and on the venue laptop (S5): a
    non-removal gap above 3.0 s, a whole-list pause above 2.5 s, or a TCP silence between 2.0 s
    and the constant reopens it (second pass: the trigger named in numbers; the recorded maxima
    are 2.59, 2.16 and 1.90 s).
19. **Two runs of one athlete with the same `Time` to 0.01 s.** A stale row from before a non-wizard
    re-run, re-sent by rotation during run 2 and carrying exactly run 2's finishing time, is attributed
    to run 2 and presents run 1's penalty and placement until upstream's next push (opponent review R17,
    E2; needs the finish-first order, 28 %, a rotation inside run 2 and an equal time; lasts under a
    second). Accepted as residual unless M1's data shows it; a remedy would compare the row's cells with
    the on-course stream's before attributing.
20. **`duplicate-finish` on TCP after D1.** The six recorded TCP instances were never replayed, and no
    replayed window raised one; M1 replays them.
21. **`NHT2`'s first-run token.** `CONTRACTS.md` §2.4 pairs it "where upstream defines one"; which
    schedule token it pairs with is unstated, so until it is settled an `NHT2` has `pair: null`
    (§2.1). In no recording. (Round 17.)
17. ~~The finish → on-course-exit interval per recording.~~ **Measured (E1, seven recordings, 1,995
    closures):** about 20 s at six of seven venues (medians 18.9–19.9 s; 54–73 % in [18, 20) s), about
    47 s at cp3-cross (p90 57 s), manual closes under 5 s on the two NKZ days (12.6 %, 34.9 %) — the
    path `C123-PROTOCOL.md`'s "~4 s" describes — and a tail to 126–781 s. A venue setting;
    `CONTRACTS.md` §7.1 states the range. The protocol doc's figure is corrected in that repository.
18. The XML poll interval (`pollIntervalMs`, 5 s in the spike and the vectors) and the torn-read retry
    budget are deployment settings. Since round 18 the guard reads the reader's `changedAfter` (§0.3),
    so the interval bounds only how late a change is seen; the vectors keep `xmlPollIntervalSeconds`
    for events written without `changedAfter`. The venue values come from
    S5's execution against Canoe123's real copy-over writer (maintainer).
22. ~~**A classification table emptied after it had rows.** The core would publish the Standing empty
    (§4.10, whole replacement). No recording shows one (cp3-cross: all 508 empty classification
    tables precede the first row). A default; if upstream can clear a built classification, the
    maintainer says whether an empty Standing or the last built one is wanted. (Round 18.)~~
    **Decided (maintainer, 2026-11-06):** the last built Standing is kept, `asOf` showing its age
    (§4.10; `CONTRACTS.md` §5, §8.3, §8.6).
23. **A re-run inside a TCP outage.** A re-run whose start and finish both fall in an outage arrives
    as one listing with a new start and a new finish, which §4.11 reads as a start correction:
    `run` stays, the newest row is presented, a pending write of the old run is resolved by the new
    run's row and the old run's checks compare against the new gates. Nothing upstream distinguishes
    it from a start and a finish both corrected. The safer default is the correction (nothing is
    hidden); whether an admin action to mark a re-run by hand is wanted is the maintainer's. The
    mirror shape (second pass): a mark attributed while the athlete is still listed records the
    generation, so a later start change with no finish reads as a re-run; a slip of a mark followed
    by a start correction would therefore increment. Not recorded either way. (Round 19.)
