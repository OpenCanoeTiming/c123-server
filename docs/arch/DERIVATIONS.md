# Derivations — From Source to Contract

`CONTRACTS.md` §6 says *whether* a value is derivable. This document says *how*: the actual
transformation, precise enough to implement without re-reading `DOMAIN-FACTS.md`, and precise enough
that writing it down can show a claimed derivation does not work. Every derivation is stated four
ways:
1. the **source expression**;
2. its **conditionality**;
3. the **resulting envelope**;
4. the **failure mode**.

**History.** How this document came to be, and every earlier version of it, is in git under the tag
`contract-archive-2026-11`.

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
| bib | padded to 4 chars in `Results`; unpadded in `OnCourse` | padded in some files | trimmed string; a classification row's inner padding collapsed to one space (§4.10) |
| "behind" gaps | pre-formatted strings | pre-formatted strings | not relayed; derived (`CONTRACTS.md` §5) |

**Normalise once, at ingest.** Trim every bib, and collapse a classification row's inner padding (§4.10). Divide XML milliseconds by 1000. Treat an empty
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
- **An XML snapshot**, for every race in it. Upstream rewrites the file whole from its current
  tables at every save. A retraction shows in one of two ways: the row stays with its result
  fields empty (a result deleted, a mark taken back), or the row is gone (a competitor deleted,
  moved or given another bib; a redrawn start list). The first retracts; the second removes the
  Attempt, the guard permitting, when no row of the race carries its bib (§4.12).
- **Mode is read the same way for every table**, classification Phases included, and **a table with
  no rows is a scope snapshot in start-list mode** (TCP: a `Results` message with no row; XML: a
  Schedule race with no `Results` row). The parser emits it like any other (`RXER` excepted: a title
  that never carries rows, skipped by both parsers, §4.10). The core applies INV-7 to it as
  written: a TCP table with no rows retracts as its start-list case; an XML table with no rows
  retracts nothing and, where the race holds results, raises `xml-table-emptied` (`CONTRACTS.md`
  §4 INV-7; §4.12); a classification
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

**What the reader stamps** (`CONTRACTS.md` §4 INV-2c). Each whole read is one unit:
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
(`CONTRACTS.md` §7.1 reports it on the re-baseline, as a report). Recorded (E2): the file goes up to 55 min without a write (gaps of 230, 1,147 and 3,335 s between the first
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
event and an empty schedule statement (below), which removes no Phase (`TEST-ARCHITECTURE.md`
§3.2 property 3: an `xml-rewrite-detected` on its own changes nothing).

**The schedule statement** (`CONTRACTS.md` §4 INV-7; `DECISIONS/ADR-015` Revision 9). Each whole
read also states which races the snapshot's `Schedule` table names: the parser emits one
schedule statement per read, the `RaceId`s of its schedule rows (the `<unassigned>` placeholder
and class `NA` excluded, §0.4), before the read's race tables. The core removes a Phase that a
schedule statement no longer names, under the guard of §4.12; an empty statement removes
nothing; the conditions in full, the read's own tables included, are §4.12 and §10 item 54.
TCP's `Schedule` message states no such thing: it never removes. No recording holds a valid and
empty file: every first snapshot of the seven carried Participants, Classes, Schedule, Results,
CourseData and Events.

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
- a first run's `pair.siblingPhaseId`: the inverse of the second runs' stated pairs, which moves
  when another Phase is stated, so no message about the first run can state it (§2.1; §10 item 49);
- the removal of a Phase its schedule no longer names, and of an Attempt whose bib its race no
  longer carries (§4.12);
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

The core raises two further ingest-only kinds, `xml-table-emptied` (§4.12): an XML table with no
rows over a race that holds results, and `xml-schedule-emptied` (§4.12): an XML schedule naming
no race while Phases it would have removed stand. Each needs the held state, so neither can be
the parser's. Like the parser's four they reach the admin log and never `GET /api/diagnostics`.

---

## 1. Class

- **`classId`, `code`.**
  - Source: `XML.Participants.ClassId` / `XML.Schedule.ClassId`, or `Results.ClassId` on TCP, used
    verbatim.
  - **Never the `RaceId` prefix.** Upstream builds a `RaceId` as
    `<ClassId>_<DisId>_<day>[_<attribute>]`, and in every recording and sample its class part
    equals the `ClassId` exactly:

    | `RaceId` | `ClassId` | Where |
    |---|---|---|
    | `K1M_ST_BR1_6` | `K1M_ST` | a class id with an underscore |
    | `K1M-ZS_BR1_25` | `K1M-ZS` | a class id with a hyphen |
    | `MX1J_XT_26_JUN` | `MX1J` | an attribute sub-race, the suffix after the day (cp3-cross) |

    The prefix is still not the class, for two reasons. It cannot be cut off mechanically: a class
    id may itself hold `_`, and a suffix may follow the day. And it goes stale: upstream rebuilds
    a `RaceId` only while its race is at the initial status, so after an operator renames a class
    or moves a race to another class, a started race keeps its old prefix while `ClassId` follows
    the change on every Schedule and Participant row (observed upstream behaviour; no recording
    holds a rename). The same rule covers pairing (§2.1).
  - Envelope: `source` is the channel; `confidence: 'authoritative'`; no `eventTime`.
  - Failure mode: `not-yet` until first seen.
- **`name`.**
  - Source: `XML.Classes.Class`, with `Results.MainTitle` as a TCP fallback. Upstream falls back to the
    class id itself when no title is set.
  - This is organiser-authored text, carried verbatim (`CONTRACTS.md` §1.3). `LongTitle` is not
    modelled (§9).
- **`discipline`.**
  - Source: `'cross'` if any Phase of the class has a Cross format (`X8/X4/XS/XF/XT/XT1/XT2/XER`),
    otherwise `'slalom'` — over the Phases known at the step, on either channel: a TCP `Results`
    message names its `RaceId`, whose token decides, so the Class's creating message carries it
    (`CONTRACTS.md` §1.6); it is re-evaluated as Phases are added, and in practice never moves, a
    slalom class gaining no Cross Phase.
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
- **`classId`** is `XML.Schedule.ClassId`, or the `ClassId` of the TCP `Results` message naming the
  `RaceId`; never the `RaceId` prefix (§1). TCP `Schedule` and `OnCourse` carry no class (E1, the
  message layouts), so a Phase first seen on either is created — its first message sent,
  `CONTRACTS.md` §1.6 — at the first observation that states its class; its Attempts exist from their
  first row (§4) and name it by `phaseId` meanwhile.
- **`format`.**
  - Source: `XML.Schedule.DisId`. On TCP, fall back to the `RaceId` token between the class and the
    day number, because **TCP `Schedule` has no `DisId` attribute**.
  - An attribute sub-race carries a suffix (`WX1J_XT_26_JUN`). The token is still the part before the
    day number.
  - Once the snapshot has stated `DisId` for the Phase, that is its `format`, and a TCP message's
    token no longer decides it (a default, §10 item 37). The token is the one part of an id any
    parser reads, and only as this fallback.
- **`stage`.** From the format token by `CONTRACTS.md` §2.4's mapping; an unknown token is `run`.
  `confidence: 'authoritative'`, a lookup.
- **`kind`, `scoringKind`, `pair`, `heats`.**
  - These come from `CONTRACTS.md` §2.4's token table, a lookup with no uncertainty, so
    `confidence: 'authoritative'`. They are presented with the Phase's first message, at the first
    observation that states its class on either channel (`CONTRACTS.md` §1.6: the first message for a
    new id carries the whole resource; the `classId` bullet above), never deferred to the snapshot
    when TCP states it.
  - `pair.siblingPhaseId` is found by two fields, never by the id (maintainer, 2026-11-11, #287;
    `CONTRACTS.md` §2.4). For a second run it is the Phase with the same `classId` whose `format`
    is the first-run token of this one: `BR2`→`BR1`, `HT2`→`HT1`, `EL2`→`EL1`,
    `TR2`→`TR1`, `SR2`→`SR1`, `TS2`→`TS1`, `SUF`→`BR2`, `FI` and `FIB`→`SF`, `TFI`→`TSF`. For a
    first-run token (`BR1`, `HT1`, `EL1`, `TR1`, `SR1`, `TS1`) it is the second run that names
    this Phase, the inverse of that lookup and not a lookup of its own (a default, §10 item
    48; the core derives it, below); `BR2`, `SF` and `TSF` are only named, and keep their own
    `pair`.
    This mirrors upstream's own lookup: by the schedule row's `ClassId` and a fixed token table,
    never by the `RaceId` string.
  - **The tiebreak is the day.** For a second run, one match is the sibling. With several,
    take the one whose `date` equals this Phase's. If that leaves none or more than one,
    `siblingPhaseId` stays `null` (a default, not recorded). A first run takes the second run
    that names it; where several name it, the one on its day; if that leaves none or more than
    one, `null`. *Example,* one class: a `BR1` on the 19th, a `BR1` on the 20th and a `BR2` on
    the 20th. The `BR2` finds two first runs and names the one of the 20th, which names it
    back. The `BR1` of the 19th is named by nothing: `null`. With the `BR2` on the 21st
    instead, it finds two first runs and neither on its day: `null`, and so are both first
    runs. With a single `BR1` on the 19th and the `BR2` on the 20th, one matches: they pair
    across the days, each naming the other.
  - **A first run's sibling is the core's to derive, not a parser's to state** (a default, §10
    item 49). It is the inverse of what the second runs state, so it moves when another Phase
    is stated, and no message about the first run can keep it current: on TCP a first run's
    `Results` comes before its second run is known, and nothing states the first run again
    (§0.5). So:
    - a parser states a second run's sibling by the lookup above, over the Phase table in `ctx`;
    - a parser states a first-run token's `pair` with its `role`, its `combination` and
      `siblingPhaseId: null`, always, and the core reads no sibling stated for a first run;
    - in every unit that changed a Phase, the core takes for each first run the second runs
      whose stated `pair` names it, leaves out any whose stated `classId` differs from the
      first run's (next bullet), applies the tiebreak above, and presents the result in the
      first run's `pair` in that unit (`CONTRACTS.md` §1.6). The live tier takes the presented
      `pair` in the Phase push (`CONTRACTS.md` §8.3) and derives nothing.
  - **A second run whose class differs from the first run's does not name it.** `CONTRACTS.md`
    §2.4's "the Phase with the same `classId`" is read on the two Phases' `classId` as they
    stand at that step, not as they stood when the second run's `pair` was stated. *Example,*
    §2.4's rename over two snapshots: first `K1M_BR1_19` and `K1M_BR2_19`, both of class `K1M`;
    then `K1M_BR1_19` and `K1M-X_BR2_19`, both of class `K1M-X`. No later snapshot holds
    `K1M_BR2_19`, so that Phase keeps what was last stated of it: class `K1M` and a `pair`
    naming `K1M_BR1_19`. It no longer names the first run, whose class is now `K1M-X`, so the
    first run's sibling is `K1M-X_BR2_19` and not a tie between the two. Once a save that
    schedules `K1M-X_BR2_19` and not `K1M_BR2_19` is admitted for the old Phase, `K1M_BR2_19` is
    removed (maintainer, 2026-11-16; §4.12; §10 item 54), and the class rule above only covers
    the saves before that.
  - **The class check needs both classes stated.** It looks for a statement gone stale, and
    only a difference between two stated classes shows one. Whoever states a second run's
    sibling has already applied the class rule: a parser names a first run only when it knows
    the two classes are equal. So where the first run's class has not been stated, the second
    run's `pair` is all there is, and it stands. That includes a Phase nothing has stated at
    all. Being named makes it that second run's first run; no id is read to say so. It has no
    `date`, so several second runs naming it leave `null`. There is no Phase to present it
    on; it serves what reads across the pair (§4.5). This arises in the vectors, whose adapter
    names a first run the vector may not hold (`two-run-br1-unavailable-no-live-no-xml`:
    only `K1M_BR2_6` is described, and run 1's `outcome` is `unavailable{not-configured}`
    through it). On site a parser names no first run whose class nothing has stated.
  - **No id is parsed or built.** The earlier reading, "the same class part of the id with the
    other token", fails after a class rename or a race moved to another class: the started first
    run keeps its old `RaceId` prefix, the second run's `ClassId` follows the change, and the two
    ids no longer share a prefix while the two Phases still share a `classId` (§1). `format` is
    the Phase's own field, stated as the `format` bullet above says; pairing reads the field.
  - Until a Phase with that class and token is known, `siblingPhaseId` is `null`; `role` and
    `combination` are the token's regardless, so §4.4's second-run reading applies from the first
    row.
  - **`NHT1` and `NHT2`** are known formats and single runs, `pair: null` (maintainer,
    2026-11-12, closing §10 item 31). Upstream ranks `NHT2` as its own run; `NHT1` qualifies its
    runners and seeds `NHT2`'s start list. That link is not a pairing and is not in the map.
    Neither token is in any of the seven recordings or the samples (E1, absence).
- **`date`.**
  - Source: the date part of `XML.Schedule.StartTime`, a full date-time with offset. Envelope:
    `source: 'xml'`, `confidence: 'authoritative'`.
  - Fallback before the snapshot is read: the date of the first observation of any kind for this
    `RaceId`, with `confidence: 'inferred'` — its `observedAt` read in the venue's configured zone
    (§0.2), never the UTC date. With no zone configured nothing is inferred: `date` stays
    `not-yet` until the snapshot states it, as `eventTime` is omitted (§0.2).
  - **TCP `Schedule` has a `StartTime` element, but upstream always emits it empty.** It is never a
    source.
  - The snapshot's date is assigned once and never re-derived (INV-5). An inferred date is replaced
    by the snapshot's exactly once; in the recordings every inferred date agreed with it.
  - A `StartTime` whose first ten characters are not a calendar date states neither `date` nor
    `scheduledStart` and raises `unparseable-field` (§10 item 42).
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
    `N`/`R`/`D`/`E`, in order, with `gateNumber` for `N`/`R` only. A slot carries no `caption` on
    site: `slots` is the snapshot's alone, and upstream's captions are `Course.captions`, TCP's,
    where caption `i` names slot `i` (the refresh below; §10 item 32). `S` and `I` produce no
    slot. An `S` or `I` before the first gate (`DS…`, after the Cross ramp) records nothing.
- **Refresh from TCP.**
  - `RaceConfig.GateConfig` is the currently selected course's layout. TCP strips the `S` markers.
  - `RaceConfig` gives no course number and names no race, and the selected course need not be a
    running Phase's: at jarni-so-odp 14:45Z it switched from course 1 (19 gates) to course 2 (18)
    while today's results still rotated and nothing real was on course (E1); assigning it
    to the Phase of the last on-course message overwrote course 1 and produced 583 false `gates`
    disagreements in a sweep. **The core matches it to a Course by its gate string:** the Course
    whose `layout` with the `S` markers removed equals `GateConfig` (every string in all seven
    recordings equals a stripped layout of its snapshot, cp3-cross `DNNRNNNER` included). It
    refreshes that course only, and only its `captions` (`source: tcp`) — `gates`, `slots` and
    `splitsAfterGate` are equal by construction; two courses of one snapshot with equal stripped
    layouts are both refreshed, the captions describing the string they share (not recorded; a
    default); a string matching no snapshot course, a fabricated one included,
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
- **`classId`** is `XML.Participants.ClassId`, or the `ClassId` of the TCP `Results` message whose
  row names the participant — the carriers of the Class's own id (§1; E1, the layouts). Every row
  that creates an Entry carries it, so the creating message does (`CONTRACTS.md` §7.2); an on-course
  listing states no Entry field.
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
  - Source: `Birthdate`, as entered. Many organisers enter only the year, as `YYYY-01-01`. A
    non-empty one whose first ten characters are not a calendar date is absent and raises
    `unparseable-field` (§10 item 42).
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
(`CONTRACTS.md` §3.2). It exists until an admitted XML snapshot of its race no longer carries its
row (§4.12; `CONTRACTS.md` §2.6).

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
  whatever preceded it in the generation** (E1; the finish clause and the heat exception from the
  trace below and §4.2): the ordinary staging; a start impulse deleted (recorded twice: nkz-20ne
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
- **A finish the stream alone has stated is the stream's to withdraw** (E1). While no
  results-table row has recorded the generation (§4.11's sense: a row with a time or a mark,
  attributed after the recorded start), or after the row that recorded it has been retracted and
  the stream still lists the finish (nothing from the table is presented; the generation stays
  recorded, §4.11; a rule, 0 in seven recordings), the next listing of the Attempt
  without a `dtFinish` withdraws it: `status` is what that listing shows (`at-start` with no `dtStart`, else
  `on-course`), the generation's finish and the `duration` inference are forgotten, no diagnostic
  is raised (INV-2d is for a finish presented from the table). The closure a `Completed` on that
  finish gave goes with it (§4.4; a default, §10 item 51): with no finish there is no result to
  complete, so §4.3's stop (b) binds the next finish only from that finish's own `Y`. It applies wherever the stream lists
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
  ingest time while other TCP messages keep arriving.** The constant is **4 s** (E1:
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
  stated at the worst phase** (E1, from the review's replay): the 2.59 s
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
  evaluation: at a TCP message that arrives `onCourseLeaveAfterSeconds` or more after the
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

**`left-without-finish`, slalom and the Kayak Cross time trial.**
- **The rule.** An Attempt that leaves the list with a start observed — a `dtStart`, or the stream
  having stated `on-course` or `finished`, which this section derives from one — and `dtFinish` never
  observed becomes `left-without-finish`, `confidence: 'authoritative'`. What is asserted is that
  upstream removed the athlete; no reason is inferred. An Attempt unstaged before any start returns to
  `not-started` (observed: bib 68 staged for 5 s into the next day's race, then removed); listed again
  in the same generation, it returns to `at-start` or `on-course` as a newer inference. **"Observed"
  is read on the stream's state at the leave:** a start the stream has since withdrawn (a later
  listing with `dtStart` empty) and a finish it has since withdrawn (the withdrawal below) count as
  not observed, so the leave yields what the Attempt's last listing showed: `at-start` gives
  `not-started`, `on-course` gives `left-without-finish`, a stream `finished` stays. The generation's
  recorded start is kept all the same (§4.11); only the leave reads the current state. One rule for
  slalom and the time trial (E1: cp3-cross WX1_XT_26:25, start listed, deleted at 07:15:34, a finish
  impulse with no start at 07:16:59 withdrawn at 07:20:57, staged until it left at 07:30:02:
  `not-started`, then the `dns` row; a default, 2026-11-16).
- **Why a separate status.** Removal before a finish with DNF or DSQ, and DNS from the start judge's
  terminal, push nothing on TCP (observed upstream behaviour). Of 145 recorded transitions:
  - 59 arrived in their own immediate push;
  - 21 at run closure, about 20 s later;
  - 57 on another athlete's push: median 20–52 s, worst 522 s;
  - 8 only by rotation, up to about 600 s.
- **Where the mark comes from.** The XML snapshot at about 35 s (INV-2, rule 2's exception), or TCP's
  next push of the race.
- **The Kayak Cross time trial follows slalom** (maintainer, 2026-11-16; `RULINGS.md` R-23): the
  rule above applies to an `XT`, `XT1` or `XT2` Attempt as written, `left-without-finish` with a
  start observed and `not-started` from `at-start`, and INV-2 rule 2's exception brings the mark
  from the next save. This replaces §10 item 43 (c), (d) for the time trial. **A Kayak Cross
  heat never uses it:** a heat's leave changes no `status` (§4.2; `CONTRACTS.md` §7.1; §10 item
  35).

**Result marks, closed-set mapping.** A row with a mark presents `outcome: no-result`, whatever time
it carries: a DNF row can keep a time, even another athlete's finish (`CONTRACTS.md` §2.6). That is
the core's presentation of a presented mark — of the presented `status`, never a field of the row's
own: a mark refused for `status` (INV-2 rule 2, INV-2c) shows nowhere (`CONTRACTS.md` §2.6); the parser emits the time beside the mark (§0.5), and a
withheld stale mark leaves the time presented (§4.12).
- Sources:
  - `Results.Result@IRM` on TCP, where upstream sends `*` (under review, below) as empty;
  - `Results.Result@PP = "*"` on TCP;
  - `XML.Results.Status`.
- The mapping:
  - `DNS`, `DNF`, `CAP`, `RAL`, `DSQ`, `DSQ-R` and `DQB` map to `dns`, `dnf`, `cap`, `ral`, `dsq`,
    `dsq-r` and `dqb`.
  - `NON-RK` maps to `non-ranked`, a finished run excluded from ranking.
  - `*` is upstream's under-review flag, not a result mark: it sets no `status` and states no
    result (§4.6(b), §4.11). It means `underReview: true`, with the run otherwise `finished`.
    Every result row that carries a time, a mark or a placement states `underReview`, `false`
    without the `*`, so a withdrawn `*` clears; a row that stated it only when true could never
    clear it (INV-1). A row carrying none of the three states nothing (INV-7's blank row,
    `CONFORMANCE-VECTORS.md` §1).
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
  This is a heat's rule only. The time trial, whose stream lists start and finish per competitor
  (§4.4), takes §4.1's leave rule as slalom does, `left-without-finish` included (maintainer,
  2026-11-16).

### 4.3 `outcome` while on course, and between finish and the first result push

**`running`.**
- `elapsedSeconds` is `OnCourse.Result[T]@Time`, whole seconds while running. `penaltySeconds` is
  `@Pen`; in a Kayak Cross time trial it is `0` by rule (§4.4), `@Pen` being ignored in Cross (§4.6(d)).
- The value is upstream's own display. It includes a configurable offset, and during a split hold it
  shows the split time. It is relayed as displayed: `confidence: 'authoritative'`,
  `provisional: true`. It follows the listing: a start correction that moves `Time` moves it
  (§4.11; recorded 0 → 89 at jarni-so-do K1M_BR1_18:138), and a listing with `dtStart` empty ends
  it (§4.1: the start deleted, `outcome` back to `not-yet`).
- **It is the outcome of an Attempt the stream shows `on-course`, and it ends where the stream's
  own status leaves that** (`CONTRACTS.md` §2.6; defaults, §10 item 43):
  - at a listing that shows `at-start` (§4.1: `dtStart` empty, outside a Cross heat), whatever
    `Time` that listing carries;
  - at a listing with a `dtFinish`: the `duration` inference below replaces it, and where that
    listing yields none — its `Time` is empty, or a slalom listing has no `Gates` (§4.6(a)) —
    nothing does, so `outcome` is `not-yet` until a row states one;
  - at a slalom or Kayak Cross time-trial leave, on every path of §4.1's rule (the time trial
    since the maintainer's decision of 2026-11-16).

  A Kayak Cross heat's leave ends nothing (§10 item 35). So no presented state pairs a `running`
  outcome with a `status` other than `on-course`.

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

**Failure mode:** `not-yet` before the finish, and after a finish listing that yields no
`duration` (the `running` bullet above) until a row states the outcome. Never `unavailable`.

### 4.4 `outcome` from a result row

**Untimed rows** (`CONTRACTS.md` §2.6). A result row in a duration-scored Phase with a placement
(`Rank`/`RankOrder` or `Rnk`/`RnkOrder`) but no finish time (`dtFinish` empty or absent on the
row, which §0.1 reads alike: real snapshots omit the element on such rows; and no
`dtFinish` ever seen on the on-course stream for this Attempt) presents `outcome:
unavailable{not-applicable}`, whatever `Time` says. Recorded: junior Cross time-trial rows with
`Time="100.00" Total="100.00" Pen="" Gates=""` and real ranks, later rank × 1000; 24 of 32 rows of
one class kept the placeholder through the semi-finals. Untimed is read from the snapshot row
(`dtFinish` empty, time and placement present) and inherited by the TCP row of the same Attempt, which
carries no finish time of its own; before the first snapshot a TCP row is presumed timed, and the
flip at that snapshot is an INV-3 assertion over the TCP row, outside INV-2c's guard — no `tcp` row
carries a finish time to contradict it — with `status` staying `finished`. Recorded: 47
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
- The outcome's `observedAt` is the element's that last changed the presented value — `runSeconds`
  or a merged cell, a listing's included (`CONTRACTS.md` §1.2) — never a re-delivered row's whose
  own cell change the merge does not present (INV-5; recorded: nkz-20ne K1M_BR2_20:63 at
  09:41:25.154, the row's 50 blanked while the stream's cell stands).
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
  parser had a course: `true` settles the value, `null` or no stamp without one is this case —
  and the run is not closed. `status` is never provisional (§4.1). This is what marks a push that upstream sent before judging
  finished: with "ranking with incomplete penalties" on, the first push precedes the last gate.
- **Run closed** — the one definition; `CONTRACTS.md` §1.2, INV-2 and property 11 point here —
  means the first of: `Completed = "Y"` seen for the generation **on an on-course listing that
  carries its `dtFinish`**, or as a row's `runClosed` (the parser stamps it on an outcome
  observation only) — upstream's own "judging complete": §4.3, the auto-complete needs the penalties
  complete, a finish and the delay, and precedes the removal by the display delay; it coincided with
  the leave in only 34–70 % of closures; a `Y` on a listing with no finish closes nothing, there
  being no result to complete (recorded once in 1,142 first-`Y` listings: cp3-cross WX1_XT_26:19,
  `Completed="Y"` while staged at 07:35:54.193Z, its start 9:35:59, its finish
  9:37:09, its real `Y` at 07:37:55.676Z; E1); the Attempt leaving the
  on-course list (§4.1; a re-listing within the generation undoes that leave and its closure alone —
  the flag clears and `provisional` is recomputed, `false → true` included, property 11; one such flip
  at 4 s on five traced recordings, jarni-so-odp C1M_BR2_18:51, `countingRun` `false → true` at
  13:54:16.854, re-listed 344 s after its leave with blank cells, its start 13:54:59, its finish
  13:56:43, so the other reading would hold `provisional: false` through a run; E1);
  or a no-result mark presented — `Outcome`'s `no-result` set, so a refused
  mark closes nothing and `non-ranked`, a finished run, closes nothing: its blank cell is judged
  like any finisher's. Leaving the list is the set's closure (`CONTRACTS.md` §7.1); `Completed`
  closes the run while it is still listed (`DECISIONS/ADR-017` Revision 5). A stream finish withdrawn
  afterwards (§4.1) undoes the closure its `Y` gave, as a re-listing undoes a leave's (§10 item 51). A closure that flips `provisional` is a change of presented state
  and is pushed (`CONTRACTS.md` §7.2). An Attempt never listed is not closed by that alone: a row with
  a blank cell for it stays provisional until one of the three
  (`provisional-incomplete-judging-then-settles`; a past race's row that upstream left unjudged says
  so honestly).
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
    `PrevRnkOrder`. **They are not read.** They restate the first-run row of
    the same snapshot, on the second-run Attempt, which has no field for run 1's figures
    (`CONTRACTS.md` §2.6: a second run's `outcome` is run 2's own); they carry no `dtFinish`, so
    nothing could attribute them to a generation (§4.11); and the first-run row is complete and
    frozen. Run 1 is the first-run Attempt, `siblingPhaseId:bib`, with its own generation.
  - A cold read of one day's final snapshot recovered 397 first runs and 384 second runs complete.
  - Envelope: `source: 'xml'`, `confidence: 'authoritative'`.
- **(b) From this server's own retained observation**, if it was running during run 1 (INV-1).

**Failure mode.** `unavailable{not-configured}` only once run 2 has been observed and neither path
can supply run 1: the XML source is not configured (`SourceStatus.xml`, §5) and this server did
not observe run 1. Before that, the state is `not-yet`.

**The on-site process never gives `source-unreachable`** (a default, §10 item 30). While a
configured XML source is unreachable, run 1's detail stays `not-yet`: the next successful read
supplies it. Three reasons:
- no client renders the two states differently (`CONTRACTS.md` §1.2);
- the admin audience already sees that the source is unreachable, in `SourceStatus.xml.state` (§5);
- a reason that followed the reader's state would make that state an event of the ingest sequence,
  with a place in replay and in the fixtures (`CONTRACTS.md` §4, Determinism), for a difference
  nobody sees.

The reason stays in the closed set (`CONTRACTS.md` §1.2); nothing on site produces it. The core
has no option to give it (#337, PR #371), and the vector `two-run-br1-unavailable-no-live-no-xml`
feeds the input the process does give, no XML configured (§10 item 30).

`PrevRnk` in Cross means the rank in the previous round, not a previous run, and is not modelled
(§9).

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
  INV-7's retraction case — states its `gates` vector,
  every cell `null` for `Gates=""`, `provisional` by §4.4 (a mark closes the run, so a `DNS` row's
  all-null vector is settled); a row stating neither states nothing, its `Gates` included
  (recorded: `IRM="DNS" Gates=""` on second-run rows, nkz-19so K1M_BR2_19:107). A mark here is
  a result mark that sets `status` (§4.1): `*` is none, so a row carrying `*` and no time
  states no result and no `gates` vector (§4.11 reads it the same way; recorded: jarni-so-odp
  K1W_BR2_18:16, an XML `*` row 25 s after the start). Kayak
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
  reused, and so is the cells' envelope: the vector carries the `source` and `observedAt` of the
  presented observation as `CONTRACTS.md` §1.2 states it — the latest cells of that source in the
  generation read on the course; the instant the later of the presented row's and the last cell
  change's, a listing's included, an identical re-delivery — one restating the merged cells as an
  earlier binding would have presented them, whatever that source's previous row said — moving
  nothing — never the
  binding unit's: the course is the key to read a statement already captured (§1.2), and a
  vector of that source on the snapshot's instant is `TEST-ARCHITECTURE.md` §3.2 property 1's
  violation (recorded: cp3-cross MX1_XT_26, 43 vectors from the rows of the push of
  08:45:00.903Z read on the course of the snapshot of 08:45:05.614Z). An earlier binding
  includes one during a TCP outage. Suppose cells of the other source, retained meanwhile, would
  have displaced the retained vector on a bound course, whether equal or not: rule 2 and INV-2c
  decide by ingest order, the connection and content age, never by a cell difference
  (`CONTRACTS.md` §4). Then
  the identical re-delivery after the reconnect regains precedence as it would on a bound course,
  and the vector carries the re-delivery's instant (INV-5; §10 item 39).
- **`unavailable{not-configured}`** when nothing configured can supply a course: the XML source is
  not configured (`SourceStatus.xml`, §5), so nothing can ever bind; or the snapshot shows the Phase
  with no `CourseNr`, or a course whose layout is empty (the snapshot's determination). A fabricated
  `RaceConfig` (§2.3's tests) decides nothing presented: it names no Phase to hold the state for,
  so the parser's `fabricated-course` is an ingest-only diagnostic. A snapshot that
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
  blank. The stamp lives on the `faults` observation alone, and only on a `known` one: a
  `not-yet` `faults` (every slot blank) carries no key (`CONTRACTS.md` §1.2) and no stamp, so an
  untimed row of a bound course is not under the judging clause; a row's outcome observation
  carries `runClosed`, never a judging stamp (§4.4), so no other stamp decides `provisional`.
- **`faults` is derived from the cells plus the captions, on TCP and in the XML alike:** `count` is
  the number of cells marked `2`; `gates` lists those slots' captions (`ST`, `1`…`6`, `RZ`, `7`),
  each built from the slot itself — the gate number, `ST` for the start ramp, `RZ` for the roll
  zone — which is what every recorded `GateCaptions` holds, so the value does not depend on
  whether a `RaceConfig` has been seen (§10 item 32);
  `lastCleanSlot` is upstream's 1-based **slot position** (not the gate number: `ST` and `RZ` count) of
  the last slot judged `0` before the first fault; `0` if none; a clean run on the recorded 9-slot
  course reads `9`, above its 7 numbered gates (values seen: 0 ×176, 9 ×122, then 3, 8, 6, 2, 1). This
  reproduced `XML.Results.NrFLT`/`FLT`/`LastCleanGate` exactly: 136 of 136 rows.
- **`faults` is not merged across the two streams** (a default, §10 item 24). `gates` merges cell
  by cell ((e)), but a Cross Attempt's `faults` is the presented observation's value whole, with
  that observation's envelope, `observedAt` included (`CONTRACTS.md` §1.2). A fault the stream
  judges after a row shows at the next row, and one the stream judges and withdraws after a row
  never shows.
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
  blank 11 s later, with no row of the generation yet: nothing stood against the blank) —
  while a row's judged cell stands against a stream blank. The merged vector is
  a results-table value with cells taken from the stream, not an inference: once the stream fills
  the last blank cell it is settled (`CONTRACTS.md` §1.2). Before any row of the
  generation the stream's vector is an on-course inference, `confidence: 'inferred'`; the merged
  vector carries the row's envelope, `observedAt` the later of the row's own instant and the
  element's that last changed its cells (`CONTRACTS.md` §1.2).

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
  presented `true`: a stated fact is never dropped. The boundary is by `stage` (E4;
  recorded: `Q` throughout the junior time trial, E1).
- **`underReview`** is §4.1's `*` flag.

### 4.8 On-course extras

- **`courseOrder`** is `OnCourse@Position`: 1 is closest to the finish. It is a property of the
  message, which carries one participant. Slalom showed up to 12 simultaneous positions.
- **The on-course set** (`CONTRACTS.md` §7.1) is upstream's list as the stream shows it. An Attempt
  enters at its first on-course message and leaves at `oncourse-left` (§4.1: upstream stopped listing
  it) or at the explicit course-empty message. The leave is the core's own evaluation at a TCP
  message (§0.5), never an input: a vector supplies `oncourse-left` by hand because it has no stream
  to evaluate, and a replay step records the leaves the core derived at its message as elements the
  checker verifies against the raw stream (`TEST-ARCHITECTURE.md` §3.2). A finish transition changes `status`, not membership:
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
    `not-configured`; `TEST-ARCHITECTURE.md` §3.2 properties 3 and 4).
  - No recorded event armed splits, so this derivation is source-verified only.

### 4.9 `entry` (the mutable pointer)

- **Initial binding:** the row's `Id`, verbatim.
- **A correction** (the wrong person raced under a bib) is an operator write (`CONTRACTS.md` §8.5). No
  upstream field flags it.
- **Another `Id` under the same bib** in a later row of the race (upstream re-bibbed or swapped
  competitors and the bib stayed in the race) re-points `entry` by the ordinary rules (INV-4): the
  bib is the key of a run's data and the competitor's identity under it may change (maintainer,
  2026-11-12). The Attempt, its `run` and its checks stay; nothing is removed (§4.12).

### 4.10 Classification rows (`XER`, `SLER`, `WWER`)

- The classification Phase's `XML.Results` rows, or TCP result rows for that race, feed its
  `classification` Standing directly. They create **no Attempts**.
- Upstream assembles the rows from the final, then the semi-final, then the heats, **only when the
  operator presses "calculate event result"**. A later correction in a contributing Phase does not
  reach the classification until it is pressed again. The Standing is relayed as last built, with its
  own `observedAt`; nothing is recomputed. `RXER` is a title only and never carries rows.
- **A class may have no classification.** If the operator never presses "calculate event result",
  no `XER` row exists: the class has no `XER` race, or an `XER` race whose table stays empty (E1,
  upstream behaviour; observed on the public Canoe123 live feeds of ICF WRR Montgomery 2026 and
  WRR Oklahoma City 2026, heats raced and the `XER` table empty). No classification
  Standing is published then (the first-row rule below): the class has no overall result, and its
  Cross results are its race Phases' own standings, the time trial's included (`CONTRACTS.md` §2.4).
- `rank` and `order` come from `Rnk`/`RnkOrder`. `decidedIn` comes from `RecordType` (`F`, `SF`,
  `1/2`, `1/4`, `T`), verbatim: an open token, not a format (`CONTRACTS.md` §2.7). TCP's
  classification rows carry no `RecordType`: a row's `decidedIn` is `null` until the snapshot states
  it for that `entryId`, and the core keeps the snapshot's across later TCP rows.
- **`bib` is the row's `Bib` as Canoe123 writes it, trimmed at both ends (§0.1), with each run of
  inner whitespace collapsed to one space, and nothing removed** (maintainer, 2026-11-15, Q3): on
  a row ranked from the time trial it keeps upstream's `t`, and `t   13` and `t    7` are relayed
  as `t 13` and `t 7`. The rule is one rule for every classification row, `XER`, `SLER` and
  `WWER` alike, as the bib has always been read here; the collapse changes only a bib with inner
  whitespace, which in the recordings is only a `t` bib (a trimmed number has none). It follows
  "Canoe123's results are the truth; the printed results come from there" (`README.md`, ground
  rules): what Canoe123 wrote is relayed, and only its padding, which no printed list shows, goes.
  Upstream writes the `t` on every row ranked from the time trial (`RecordType` `T`), in the XML
  and on TCP alike, **whether or not any round was renumbered** (E1, upstream behaviour): per
  `entryId`, on exactly the 92 of 124 entries whose `RecordType` is `T`, in all 98 snapshots; on
  TCP, which carries no `RecordType`, 1,257 prefixed and 440 plain rows, matching the XML per
  `entryId` (E1, cp3-cross). **The number after `t` is the entry's bib in the time-trial Phase;
  the plain number of a row decided in a knockout round is its bib in that round.**
- **A Kayak Cross round's bibs may be renumbered or equal to the time-trial bibs; neither is
  guaranteed** (E1, upstream behaviour). Upstream's automatic start-list build of the first knockout
  round after a time trial gives every qualifier a new bib, 1..N in time-trial rank order (seeded
  into the bracket), where N is the round's size, 8, 16 or 32; no setting disables it (observed: 8
  at cp3-cross, 16 and 32 on the public live feeds of ODM 2026 Praha and the 2026 World Ranking
  Race in Prague). When the start list is built automatically, later knockout rounds, and
  repechages, carry the bib over unchanged. An operator
  who builds the heats another way, by hand, keeps the time-trial bibs (observed: the public live
  feed of WRR Oklahoma City 2026, `X8` and `X4` on the `XT` bibs; which action the operator used is
  not established, E4). **Nothing may be inferred from the `t` about
  renumbering**, nor from its absence. Where the rounds were renumbered, one athlete carries two
  bibs and the two number ranges overlap, so the number without its `t` repeats within one
  classification: recorded (cp3-cross, E1; #335 reopened, 2026-11-14), 864 of 864 `T` rows carry
  `t` and the `XT` bib, 304 of 304 `F` and `SF` rows the `XS`/`XF` bib, which is the time-trial
  rank for all 32 finalists, and every finalist's two bibs differ. Kept, the bib repeats in no
  classification table (98 XML snapshots, 209 TCP messages); stripped, it repeats in two of the
  four (WX1_XER_26: 6, 7; MX1_XER_26: 3, 4, 7, each held by two entries). Where they were not, the
  same number can name one athlete in every round. **So a bib never joins across Phases**: a
  classification entry is the row with its `entryId`, never the one with its bib
  (`TEST-ARCHITECTURE.md` §3.2 property 15), and across the Cross Phases a competitor is its
  `entryId`, the one key stable across all of them (E1), which is the bib principle applied per
  Phase (`CONTRACTS.md` §2.6). The prefix is no field and is not read as `decidedIn`, which stays
  the snapshot's (above). No other bib in the seven recordings carries a letter: `XT`, `XS`, `XF`,
  `BR1` and `BR2` rows, `OnCourse` and `TVS`. `X4`, `1/2` and `1/4` rows and the `SLER`/`WWER`
  tables are not recorded (E4). **Correction:** the M2 P2 ruling of 2026-11-14 read `bib` as "the
  race bib" without the `t`; that was wrong (it tested the prefix against `RecordType`, not
  uniqueness) and was withdrawn the same day. How a spectator sees the bib (`t 13` as relayed, or
  the number with a label) is the clients' UI design, not the wire.
- On site the rows reach the core as a scope snapshot of the classification Phase whose rows are
  `CONTRACTS.md` §8.3 `ClassificationRow`s (`CONFORMANCE-VECTORS.md` §1), and as nothing else: the
  parser emits no `{push: 'classification'}`, which is the bridge's message to live. **Precedence:**
  classification rows are no Attempt's fields, so INV-2 rules 1–2 do not apply; the later-ingested
  snapshot replaces the Phase's rows whole, whatever its `mode` (an empty table is start-list mode,
  §0.3) and whichever source, under INV-2c's guard alone: an `xml` snapshot replaces rows a `tcp`
  snapshot has stated only when its `changedAfter` is later than the `observedAt` of the latest
  `tcp` delivery of those rows (`null` never) — a `tcp` snapshot that built them, or one that
  re-delivered them equal after an `xml` snapshot built them, since INV-5 advances a `tcp`
  observation's content age at every re-delivery (INV-2c) — and a `tcp` snapshot always
  replaces. Recorded (cp3-cross, E2, `scan-cls.ts`): at 10:26:13 the XML carried upstream's newer build ahead of TCP's rotation, by 89 s
  (MX1_XER_26, TCP at 10:27:42) and 119 s (WX1J_XER_26_JUN, TCP at 10:28:12), which rule 2 would
  have held back; on the reversal TCP led, by 21 s (MX1_XER_26, 10:28:42, XML 10:29:03) and 44 s
  (WX1J_XER_26_JUN, 10:29:24, XML 10:30:08). The guard admits both and still refuses a
  save-cycle-stale file. `decidedIn` is kept per `entryId` from the last **admitted** XML row where
  the TCP row states `null` (above): from the latest admitted XML snapshot of the Phase that
  carries rows, whose rows replace the kept values whole, so an entry that snapshot omits keeps
  none and reads `null` on a later TCP row until a save states it again (a default, §10 item 52);
  a refused snapshot moves nothing, `decidedIn` included (INV-2c
  "retained and not presented"; E4, the recording holds no refusal). An operator re-baseline
  keeps the rows and the kept values; its read replaces them as any snapshot does (§10 item 52). The core dates the
  Standing's `asOf` by the `observedAt` of the latest snapshot that changed it (`CONTRACTS.md` §5;
  TCP re-sends the same rows on rotation, 10:27:12, 10:35:14, 10:43:16, which move nothing), and
  publishes the Standing first at its first row: an empty table before any row publishes nothing;
  **one after rows changes nothing: the last built Standing stays presented, `asOf` showing its
  age** (maintainer decision, 2026-11-06, closing §10 item 22; no recorded instance; whole
  replacement, and an empty table read as a start-list snapshot, hold for a snapshot carrying
  rows, and a classification's empty table from either source is no retraction, §0.3). The bridge therefore never pushes an emptied classification to live, and
  `PUT …/classification` with `rows: []` is refused there (`CONTRACTS.md` §8.3, §8.6). The gate-2
  checker reads that shape (`TEST-ARCHITECTURE.md` §3.2 property 15; vector
  `classification-emptied-keeps-last-standing`).
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
  an empty `dtFinish`, while the generation is recorded.** Two terms, stated here once (every other section points here):
  - **The recorded start** is the `dtStart` of the generation's first listing that carries one,
    compared as the listed text. The listing that gives it changes nothing of this section's — no
    `run`, no correction — and is otherwise a listing like any other: a finish the table presented
    before any start is contradicted by it when it carries no finish (INV-2d, §4.12; the cold-start
    or outage shape of a non-wizard re-run, the row then unpresented until the new finish), while a
    mark is no finish and stands (eight recorded Attempts reached their first start
    with a `DNS` or `CAP` already on the table, seven of them cleared before the start; compared
    against an unset start they would have made nine increments of the recorded one). A listing
    with `dtStart` empty leaves it as it is — a start deleted is given again, recorded twice; a
    finish impulse with no start, once — and takes its `status` from §4.1.
  - **Recorded** means a results-table row carrying a time or a mark was attributed to the
    generation after its recorded start was known and stated something the table did not already
    hold for it on either source. **A mark standing on either source at the recorded start records
    nothing however it arrives afterwards:** re-sent by a rotation of its own source, it is INV-5's
    re-delivery; first carried by the other source once a save catches up, it is the same mark
    (E1: nkz-19so K1M_BR2_19:54, TCP `DNS` 09:46:35.827Z, the start 09:46:59.844, the
    XML's first `DNS` 09:47:02.964, 3.1 s after the start; a save lags up to one cycle, so any mark
    typed in the 35 s before a start arrives this way). So a mid-run correction for an athlete who
    raced after a cleared or standing `DNS` keeps `run` 1, which is what the term is for: no false
    increment on a first run. A mark no source held at the start, attributed after it, records (the
    mid-run mark, §10 item 23). A mark here is one of §4.1's result marks that sets `status`; `*`
    (`underReview`, §4.1) with no time states no outcome and records nothing (a rule:
    K1W_BR2_18:16's XML `*` 25 s after its start keeps `run` 1). A retraction since does not un-record it (the run was
    raced; its result was deleted, which is the re-run's first half). A contradiction does (INV-2d:
    the athlete is on course with that start, so the row described no finish of this run); the
    next row attributed records it again. The stream records nothing by itself: a finish it lists
    with no row behind it is its to withdraw (§4.1), so §4.1 and this rule never claim one listing;
    and a TCP row retained until the generation's finish (attribution, below) records at its
    attribution, not before. A row whose mark INV-7's guard refused records nothing either: the
    guard refuses the observation (`CONTRACTS.md` §2.6), and the snapshot that restates it and
    is admitted records then.
  **Every other change of the listed start is a start correction** within the generation (E1): the recorded start becomes the listing's, and the `Time` the generation remembers at its
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
  the mark was a slip and the start was corrected afterwards. Neither shape is recorded; both are accepted risks, the operator resolving
  them by hand (§10 item 23; maintainer, 2026-11-11). A row retained in the row-before-finish window records
  nothing until attributed, so a correction inside that window is a correction; rows are retained
  that way only in a generation begun by a new start (attribution per source, below), while in the
  first generation a row before the finish is attributed on arrival and records then, so a moved
  start with no finish inside that window would increment (a rule; not recorded: §4.4
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
- **Nothing persists `run` across a server restart** (an accepted risk, maintainer 2026-11-10,
  `RULINGS.md` R-10; §10 item 25). A restarted server re-derives it from upstream alone, so a
  re-run Attempt presents `run` 1: the re-run's checks read `stale`, run 1's compare against the
  re-run's gates, and the operator resolves checks and pending corrections by hand (§6). Live never
  lowers a stored `run` (`CONTRACTS.md` §8.3; R-12).
- **Attribution per source.** An XML row whose `dtFinish` precedes the new generation's start
  describes the replaced run. A TCP row carries no finish time: within a generation that began with
  an observed new start, it is the current generation's only once that generation's finish has been
  seen on the on-course stream and the row's `Time` equals the on-course `Time` at that finish (the
  two are identical, §4.4); a TCP row carrying a time that arrives before that finish is retained and
  attributed when the finish arrives with the same `Time` — the usual order, §4.4: 72 % of recorded
  finishes, the run-2 push 108 ms before the finish among them — and presented then with its own
  envelope, `observedAt` the row's delivery, not the finish's (the attribution is the core's
  evaluation, the observation the row's; `status` at that unit is the listing's, §4.1) — else it describes the replaced run;
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
  result is listed that way — `not-yet` where its `Rank` or `Total` is empty, as §4.7 reads an empty
  `Rank` (recorded: jarni-ne-odp C1M_BR2_19:64 at 11:40:07, run 1 marked `dnf` in the same push, no
  combined result left). `countingRun` stands: no TCP column states it (§4.4), and the
  XML row restates it at its next read, `BetterRunNr` `0` as `not-yet` (recorded: the same Attempt,
  `1` → `0` in the snapshot of 11:40:25.507). Recorded: five DNSs and one CAP cleared in place; C1W_BR2_19 bib 7 went
  `dns` → `not-started` and then raced. Such a clearing retracts a mark row that had ended the
  second-run carry; the carry resumes (`CONTRACTS.md` §1.2).
- **Never:** an Attempt whose outcome is still an on-course inference; an Attempt never present in a
  results-table observation; a row that was never present.

**What the XML file shows for each correction** (observed upstream behaviour; the file is rewritten
whole from upstream's current tables at every save):

| Operator action | In the next file |
|---|---|
| A result deleted ("delete selected results", the re-run wizard); a DNS, DNF or DSQ set or cleared | the row stays; its result fields are empty, or only its status changes |
| A competitor deleted; a competitor moved to another race or class; a bib changed | the row is gone from that race; a moved or re-bibbed competitor appears under the new race or bib |
| A start list generated again or redrawn | the race's rows are rebuilt: fewer or other rows (the same rewrite; this action itself was not traced, E4) |

No recording holds a removed row or a table emptied after it had rows.

**Retraction from an XML snapshot** (INV-7; `DECISIONS/ADR-015` Revision 5). For an Attempt
previously known from a results-table observation:
- **The row is present and carries no time, no finish time and no mark.** For a first-run or
  single-run row, retract as the TCP first-run case; for a second-run row, as the TCP time-empty
  case — before run 2 every second-run row already carries `TotalRnk` and `TotalTotal` with no
  time.
- **The row is absent**, that is no row of a table that carries other rows carries the
  Attempt's bib: **the Attempt is removed** (maintainer, 2026-11-12; `DECISIONS/ADR-015`
  Revisions 6 and 7), when the snapshot is admitted for it. The row is the race's row of the XML
  `Results` table that carries the bib, start-list rows included; the `Participants` table
  carries the Entry and removes nothing. A row under the bib with another `Id` is present, not
  absent: a re-bib or swap that leaves the bib in the race keeps the Attempt and re-points its
  `entry` (§4.9). Only an Attempt a results-table
  row of its race has named is removed. Admitted: the snapshot's `changedAfter` is later than
  the latest delivery of every `tcp` observation of the Attempt, an on-course listing included
  (`null` never qualifies; a re-baseline's own read included, whose step 1 keeps what each
  delivery stated of the Attempt itself, §10 item 38 (l)), and the Attempt is not in the on-course
  set. Not admitted: retract
  as the TCP absent-row case, `pairTotal` and `countingRun` included in a paired second run,
  under the guard below field by field; a later snapshot settles the removal. In the removal's
  unit a pending write of the Attempt resolves `mismatched` without `confirmedValue` (`CONTRACTS.md` §4 rule 4), the
  Attempt leaves every Standing, and `attempt.deleted` is its one message. A re-bibbed or
  moved competitor is another Attempt (`phaseId:bib`): the old bib's Attempt is removed where no
  row of its race carries that bib any more, and the new one is created by its own row, in the
  same unit when one snapshot carries both. A swap of two bibs within a race keeps both
  Attempts; their Entries swap. TCP's absent row
  retracts and never removes. Defaults: §10 item 38.
- **The table has no rows at all:** nothing is retracted. Where at least one Attempt of the race
  holds a result the absent-row case would retract — the guard below included: a result held
  from `tcp` counts only where the snapshot's `changedAfter` is later than its latest delivery,
  so a first read, or a file written before the results it lacks, raises nothing — the core
  raises `xml-table-emptied` with the `phaseId` and the number of such Attempts (ingest-only,
  §0.5). It is raised once: at the first
  such snapshot, and again only after an XML snapshot of the race has carried a row; a TCP push
  carrying rows does not re-arm it (§10 item 41 (a)). A table that
  never had rows raises nothing (all 521 recorded empty XML race tables are of this kind, §0.3).
  If the race was really emptied, TCP's start-list push retracts it, or the operator
  re-baselines.
- **The race is absent from the schedule:** no row of the snapshot's `Schedule` table names it
  (the schedule statement, §0.3). **The Phase is removed** (maintainer, 2026-11-16;
  `DECISIONS/ADR-015` Revision 9), when the snapshot is admitted for it: its `changedAfter` is
  later than the latest delivery of every `tcp` observation of the Phase or of any Attempt of it
  (a TCP `Schedule` naming it, a `Results` message of it, an on-course listing of one of its
  Attempts; `null` never qualifies), and no Attempt of it is in the on-course set. Only a Phase
  an XML schedule statement has named is removed; one only TCP has named is never removed by
  this. Not admitted: nothing of the Phase moves, and a later snapshot settles it. In the unit:
  pending writes of its Attempts resolve `mismatched` without `confirmedValue`; then the Phase,
  its Attempts, its classification rows and kept `decidedIn`, the diagnostics of it and its
  Attempts and every Standing whose scope names it go, as one `phase.deleted`; a first run whose
  sibling it was is derived again (§2.1), a second run naming it presents `siblingPhaseId: null`,
  and their `phase.updated` follow. **An empty schedule
  statement removes nothing;** where at least one Phase would have been removed, the guard
  applied, the core raises `xml-schedule-emptied` with the number of such Phases (ingest-only,
  §0.5), once, re-armed by a schedule statement that names a race. Defaults: §10 item 54,
  among them that a race the same read's tables still carry is not removed by it (m). No
  recording holds a race leaving the schedule or an empty schedule (E4; the P3c sweep's scan, 2,032
  distinct snapshots).
- **A row that returns** after an absent-row retraction is a new `xml` observation and is
  presented by the ordinary rules: at once where no `tcp` observation stands, else under rule 2.
  After a removal it creates a new Attempt, `run` 1, carrying none of the removed one's result
  state (no generation, contradiction record or remembered mark); the checks and flags of its
  bib are served again and pushed in the unit that creates it (`CONTRACTS.md` §2.10; §10 item
  38 (m)).

**Guard (INV-2c, content age),** for the present row and the absent row alike: apply the
retraction against a `tcp` observation only when the snapshot's
`changedAfter` (§0.3; `null` never qualifies) is later than that observation's `observedAt`.
Otherwise the snapshot may predate the push, and it is ignored for that field until the next
snapshot, the field's earlier `xml` value included (§10 item 41 (b)). The same guard applies to the mark exception of INV-2 rule 2, and to any snapshot value
displacing a `tcp` value during an outage. Recorded: the XML was five minutes *ahead* of TCP's rotation on one
jury-invalidated row (C1M_BR1_19 bib 7, later re-run, §4.11), and 7 s behind TCP on a cleared DNS.
Its cost, accepted (§10 item 9): a real `dns` saved in the seconds before the leave is refused
against the listing and waits for the next rewrite (recorded: 105 s of `not-started`, nkz-20ne
C1M_BR1_20:64), and a snapshot written between a DNS cleared in the grid and the athlete's
restaging can show the cleared `dns` for up to about 35 s; a late `dns` is acceptable
(`CONTRACTS.md` §2.6).

**After a retraction,** `status` is what the on-course stream currently shows for the Attempt
(`at-start`, `on-course`, or a `finished` it still lists), else `not-started`. What the stream
shows is its latest inference for the generation, the leave's `left-without-finish` included:
where the leave (an `oncourse-left` or an `oncourse-empty`, §4.1) drew
`left-without-finish` (§4.1: a start and no finish standing at the leave) that is the status, in
either order of the leave and the retracted row. So the leave's inference is recorded when it
is drawn, also while a table `finished` or mark outranks it and it is not presented. A finisher
who left the list at closure has no such inference and returns to `not-started` (recorded: the
wiped row of nkz-19so C1M_BR1_19:7, §4.11). An XML retraction that
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
asserts `null`, which is right for what it feeds (E1).

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
- **`superseded`:** the generation increments first (§4.11). The core decides it, like every
  outcome of this section (§0.5), for a write resumed after a restart too (§10 item 44 (c)).
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
- **A retained value is a `known` one.** A slot that is `not-yet` or `unavailable` retains no
  cell: a retraction's marker states no result, and cells held while no course is bound are not
  a `gates` value (§4.6). At submission the write then records that none was retained. At a
  later delivery such a slot is no prior, and the comparison is with the value the write
  recorded, or with none. *Example:* a write is pending with `2` retained; the Phase's course
  becomes not configured and TCP re-sends the row, retained as `unavailable{not-configured}`; the
  course binds again and TCP re-sends `2`. That is a re-delivery of the retained `2`, and the
  write stays `pending` (§10 item 44 (d)).
- **Several pending writes on one Attempt** (a default, §10 item 50). Writes on different cells
  are judged independently, each on its own cell. Writes on one cell are answered in the order
  sent, as their commands go down one socket in that order. At a delivery of the cell:
  - **It is an echo for the oldest pending write** — it changes that write's retained value or
    states its requested value. The oldest resolves by this section's rule. Each next write
    is `confirmed` in the same step while the delivery states its requested value too. The
    first one whose value it does not state stays `pending`, and no later one is judged.
  - **It is no echo for the oldest, but states the requested value of a later pending write.**
    Upstream's table has then passed every earlier command on the cell. The latest write whose
    value it states is `confirmed`. Every write sent before that one resolves in the same
    step: `confirmed` where the delivery states its value, else `mismatched` with the
    delivered cell.
  - **Otherwise** it is a re-delivery and resolves nothing.

  After a step that resolved a write, every write left pending on the cell takes the
  delivered value as its retained value, whichever source delivered it and against both: a
  later delivery of that value, on TCP or in the XML, is the earlier write's echo arriving
  again and no echo for this one, whatever that source itself last held. The value goes into
  the write's durable record too, so that this holds in any lifetime. *Examples,* gate 3 holding `0`.
  - A judge writes `2`, then `50`. A row with `2` confirms the first write and leaves the
    second `pending`, `50` still presented; a row with `50` then confirms the second. One
    row with `50` instead resolves the first `mismatched` and the second `confirmed`. A
    rotation re-sending `0` before either resolves neither.
  - A judge writes `2` by a slip, then `0`, and upstream answers with one row stating `0`. It
    is no echo for the first write and states the second's value: the first is `mismatched`,
    the second `confirmed`.
  - A judge writes `2`, then `50`, and an XML save confirms the first before TCP's row does.
    TCP's row stating `2` then leaves the second `pending`, and its row stating `50` confirms
    it.
- The echo arrives as an event-driven result push, because a correction recalculates the race.
- **After a restart** a stored `pending` write resumes at load (`CONTRACTS.md` §1.5), keyed by its
  target and generation, and its echo is the next results-table observation of the target cell for
  that generation, under this section's rule unchanged, so that no outcome depends on the server's
  uptime. What makes that possible: **the durable record of a write carries, from its submission,
  the source's retained value of the target cell — or that none was retained** (a field of the
  stored record, not of the wire's `WriteRequest`). Behind an earlier write on its cell the record follows that write's
  resolution (above). Several pending writes of one Attempt resume together, in one step and in
  the order sent, before the first delivery is judged against any of them; that delivery is
  then judged once, by the rule above, as it would have been without the restart. Otherwise a `pending` write's retained value cannot have
  changed since its submission, a change having resolved it, so the persisted value is exactly the
  one the core held at the restart; on resume it is the retained value again, and: a delivery equal
  to it is a re-delivery, the write stays `pending` (`DECISIONS/ADR-010`'s lost echo); a change
  resolves it, `mismatched`, or `confirmed` if it changes to the requested value; with none retained
  the first delivery is a change and resolves it, as `operator-write-mismatched-echo-wins` pins in
  any lifetime. On XML the content-age guard against `submittedAt` applies as always (the first read
  after a restart has `changedAfter: null` and resolves nothing). No on-course condition applies:
  the write was accepted when the Attempt had left the set, and acceptance is not re-judged. The
  on-site layer hands a stored `pending` write to the core once the core holds its Attempt, as an
  operator element carrying the stored `target.run`: where the Attempt's generation has passed
  it, the core creates the write `superseded`, with no optimistic value, and pushes it; where the
  generation is the stored one, the rule above runs; where the core does not yet present that
  generation, nothing is handed over (§10 item 44 (c)). A target
  generation the restarted core does not present is §10 item 25's accepted risk: nothing more is
  stored, and the operator resolves the pending correction by hand (maintainer, 2026-11-10).

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
- **The base class of an attribute sub-class** (§2.1; §10 item 5).

---

## 8. Findings — what the consolidated revision changed here

What the consolidated revision of 2026-09-24 and the later reviews changed here is in git under the tag
`contract-archive-2026-11`.

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
- the scoring-terminal reset flag (§10 item 1).

---

## 10. Cases, defaults and what reopens them

One row per case the sections above leave to a default, per question answered, and per question still open: what the server does, on what basis, and what evidence would reopen it.
A new default, for a case a recording or a known operator action shows, is one new row cited by its number; its reasoning goes into the pull request, not into this document.

| item | case | behaviour | basis | reopens when |
|---|---|---|---|---|
| 1 | Does "reset scoring terminals" reach the write channel? | Answered: no, see `CONTRACTS.md` §7.3. | operator action | never |
| 2 | The layout letters `D` and `E` | Answered: the Cross start ramp and roll zone, judging slots that do not advance the gate number, see §2.3, §4.6. | recording cp3-cross | never |
| 3 | Are `RXER`, `SLER` and `WWER` classifications? | Answered: `SLER` and `WWER` are, like `XER`; `RXER` is a title only, see §4.10. | upstream behaviour | never |
| 4 | The super-final and legacy-final combination | Answered: the sum of two runs, a tie broken by the better run, relayed and never computed, see `CONTRACTS.md` §2.4. | upstream behaviour | never |
| 5 | The base class of an attribute sub-class | Answered: none is stored; it is an ordinary separate class, see §2.1. | maintainer ruling 2026-11-11, `RULINGS.md` R-17 | never |
| 6 | Kayak Cross per-gate marks on TCP | Answered: fault marks in the cells, never `Pen`, see §4.6(d). | recording cp3-cross | never |
| 7 | Does a re-run clear the row at staging or at the new finish? | Answered: the wizard wipes it at once with no push; staging without the wizard never clears it, see §4.11. | operator action | never |
| 8 | A snapshot rewritten just before a TCP disconnect | Answered by INV-2c, content age across sources, see `CONTRACTS.md` §4 and §4.12. | contract rule | never |
| 9 | A DNS cleared in the grid and the athlete restaged; a real `dns` saved just before the leave | The guard refuses a snapshot older than the restaging listing. Accepted: a snapshot written between the clearing and the restaging can still show the `dns` for up to about 35 s, and a real `dns` saved just before the leave waits for the next rewrite, see §4.12, Guard. | recording nkz-20ne C1M_BR1_20:64 (105 s); a late `dns` is acceptable, `CONTRACTS.md` §2.6 | a recording where a cleared `dns` shows after the restaging |
| 10 | The 11–27 s late-finish outliers | Answered: a finish assigned after the fact, or two finishes swapped late; both are corrections, see §4.12, "A finish moved earlier". | operator action | never |
| 11 | Which operator action caused each recorded retraction | Not a question: the stream does not say, and no rule depends on it; what each action emits is §4.12's tables. | operator action | never |
| 12 | Does the legacy live-mini XML ingest overwrite results cleared on TCP? | Answered for the rebuild: the rebuilt live tier reads no XML and takes the bridge's pushes alone (`CONTRACTS.md` §8), so the question exists on the legacy line only. | contract rule | never |
| 13 | A no-reorder penalty correction after racing ends may not reach the XML | Answered: TCP carries it, and the end-of-day save always writes it, see §5 and `CONTRACTS.md` §2.8. | operator action | never |
| 14 | Can the terminal channel set a mark on a closed run? | Answered: no; marks are the operator's, see `CONTRACTS.md` §7.3. | upstream behaviour | never |
| 15 | Does the on-course message carry `Position` for a listed finisher? | Answered: yes, on every one, see §4.8. | recordings, 68,894 of 68,894 messages | never |
| 16 | The leave constant `onCourseLeaveAfterSeconds` | Answered: 4 s, see §4.1. | recordings (seven); maintainer ruling 2026-11-06, `RULINGS.md` R-9 | a recording or the venue-laptop check (#198) shows a non-removal gap above 3.0 s, a whole-list pause above 2.5 s, or a TCP silence between 2.0 s and the constant |
| 17 | The interval from a finish to the on-course exit | Answered: a venue setting, about 20 s at most venues, see `CONTRACTS.md` §7.1. | recordings (seven, 1,995 closures) | never |
| 18 | The XML poll interval and the torn-read retry budget | Open: deployment settings, the poll interval 5 s by default; the guard reads `changedAfter` (§0.3), so the interval bounds only how late a change is seen. | default | the venue values from the venue-laptop check (#198) |
| 19 | Two runs of one athlete with the same `Time` to 0.01 s | A stale row from before a re-run without the wizard, re-sent by rotation during run 2 with exactly run 2's time, is attributed to run 2 and presents run 1's penalty and placement until upstream's next push, under a second. Accepted residual. | default, nothing recorded | a recording shows it; the remedy would compare the row's cells with the stream's before attributing |
| 20 | A recorded `duplicate-finish` on TCP | Raised as §4.12, "Duplicate finishes", states. | recordings jarni-ne-odp (C1M_BR1_19 bibs 64 and 65; K1W_BR2_19 bibs 18 and 19) and jarni-ne-do (K1M_BR1_19 bibs 133 and 134) | pinned by a test (#340) |
| 21 | `NHT2`'s first-run token | Superseded by item 31. | maintainer ruling 2026-11-12, `RULINGS.md` R-19 | never |
| 22 | A classification table emptied after it had rows | Answered: the last built Standing stays, `asOf` showing its age, see §4.10. | maintainer ruling 2026-11-06, `RULINGS.md` R-3 | never |
| 23 | A re-run inside a TCP outage; a mid-run mark followed by a start change | The first reads as a start correction and the second as a re-run, see §4.11. Accepted risks; the operator resolves them by hand. | maintainer ruling 2026-11-11, `RULINGS.md` R-11 | a recording of either shape |
| 24 | A Kayak Cross `faults` value the stream and a row judge differently | No merge: the presented observation's `faults` whole, with its own envelope, see §4.6(d). | recording cp3-cross (MX1_XT_26:26, WX1_XT_26:9) | a recording where this presents a wrong value for longer than a save cycle |
| 25 | `run` across a server restart | Not persisted: a restarted server re-derives it, so a re-run Attempt can present `1`, see §4.11 and §6. Live never lowers a stored `run` (`CONTRACTS.md` §8.3). | maintainer rulings 2026-11-10 and 2026-11-12, `RULINGS.md` R-10, R-12 | never: accepted risk |
| 26 | Where `xml-table-emptied` is reported | Answered: the admin log only, no wire diagnostic, see §0.5, §4.12. | maintainer ruling 2026-11-12, `RULINGS.md` R-5 | never |
| 27 | What a per-Phase re-baseline of a paired Phase replaces | Checker only, see `TEST-ARCHITECTURE.md` §3.2 property 13: `CONTRACTS.md` §7.2 stands, and the checker's scope is the named Phase alone. | default | the gate row in #333 |
| 28 | A merged `gates` vector whose presented row is the other source's | Checker only, see `TEST-ARCHITECTURE.md` §3.2 property 1. | default | a client branches on `source` together with `observedAt` |
| 29 | A classification Standing across a re-baseline | Its entries are the classification Phase's rows, which step 1 does not discard; the read replaces them under §4.10's rule, or changes nothing with an empty table. So `scope.replaced` carries a published classification Standing as last built, and a re-baseline never drops one. | default, nothing recorded | a replay of a re-baseline over a classification Phase shows otherwise |
| 30 | `unavailable{source-unreachable}` on site | Never given on site: run 1's detail stays `not-yet` while a configured XML source is unreachable, see §4.5. | default, nothing recorded | a client needs to tell the two states apart |
| 31 | The `NHT1`/`NHT2` combination | Answered: there is none; both are single runs, `pair: null`, and an `NHT2` row's `Total` and `Rank` are run 2's own, see §2.1. | maintainer ruling 2026-11-12, `RULINGS.md` R-19 | never |
| 32 | Kayak Cross slot captions | A faulted slot is named by the slot itself (the gate number, `ST`, `RZ`), never from `GateCaptions`, so `faults` is equal from TCP and the XML, see §2.3, §4.6(d). | recordings: every `GateCaptions` equals those names | a recording whose Cross captions differ from them |
| 33 | A store file that fails validation at load | Set aside under another name; the store opens empty, the server starts, and the admin log says so; nothing is on the wire (`CONTRACTS.md` §2.10). The `seq` counter then restarts at the process clock's `now()` in milliseconds, never at zero (`CONTRACTS.md` §1.6). The `seq` file is copied aside as text, so bytes that are not valid UTF-8 are not kept, and stays under its own name until a valid mark replaces it by temporary file and rename: a crash at any point leaves a file the next start recovers from. Lost: checks and flags, pending writes (resolved by hand), and the idempotency keys (item 44 (a)). Residual: a second set-aside with the clock set back below an earlier recovery's floor can regress `seq` once; a client that kept its last `seq` discards messages until the counter passes it, and its next handshake recovers. | maintainer rulings 2026-11-11, 2026-11-12 and 2026-11-14, `RULINGS.md` R-14, R-5, R-16 | a venue reports a clock set back across a recovery |
| 34 | What "durable" covers | A crash of the server process leaves the previous complete state on every platform (`CONTRACTS.md` §2.10). Against a power loss it is best effort: the directory entry is flushed where the platform offers it, and Windows does not, so a write acknowledged just before the power fails may roll back to the previous complete state. Nothing acknowledged is ever half-written. | maintainer ruling 2026-11-12, `RULINGS.md` R-15 | the venue-laptop check (#198) shows a half-written file |
| 35 | A Kayak Cross heat's leave | Changes neither `status` nor the stream's `running` outcome: the clock no longer ticks, and a client shows it stale after `runningStaleAfterSeconds` (`CONTRACTS.md` §2.6) until the row brings the placement, see §4.2, §4.3. | recording cp3-cross: every heat leaves the list together | the scoreboard work (M3) finds a frozen heat clock misleading |
| 36 | A re-run finished over a standing mark without the wizard: does upstream rank the marked row? | Either shape is read: the stale mark is withheld, the row's time and cells are presented, and `placement` is `known` exactly when `Rank` is non-empty (§4.7, §4.12). The re-run fixtures assume the ranked shape and name it in their manifests. | default, nothing recorded | a recording of the case |
| 37 | `format` once the snapshot has stated `DisId` | The snapshot's `DisId` holds from its first statement; a later TCP token does not displace it, see §2.1. | default, nothing recorded | a recording where a Phase's token and its `DisId` differ |
| 38 | An upstream removal and the Attempt | Removed when no row of its race in an admitted XML snapshot carries its bib; a moved competitor is a new Attempt in the other Phase; a re-bib or swap that leaves the bib in the race keeps the Attempt and re-points `entry`, see §4.12. Rows 38 (a) to (m) are the defaults inside it. | maintainer rulings 2026-11-12, `RULINGS.md` R-6, R-7; no recording holds a removal | a recording of a removal that these rows present wrongly, or if TCP is to remove as well |
| 38 (a) | What triggers the removal | The race's `Results` row, never the `Participants` row, see §4.12. | operator action: a deleted result keeps the `Participants` row, a move between races of one class keeps it too | as item 38 |
| 38 (b) | Which Attempt can be removed | Only one a results-table row of its race has named, a start-list row included, see §4.12. | default, nothing recorded | as item 38 |
| 38 (c) | The guard | Covers the whole Attempt: every `tcp` observation, on-course listings included, predates the snapshot's `changedAfter`, and an Attempt in the on-course set is never removed; where the guard refuses, the per-field retraction applies, see §4.12. | default | as item 38 |
| 38 (d) | TCP's absent row | Retracts and never removes, see §4.12. | maintainer ruling 2026-11-12, `RULINGS.md` R-6 (the ruling names the XML) | as item 38 |
| 38 (e) | The message | On site `attempt.deleted { seq, attemptId }`, and no `attempt.updated` for the Attempt in that unit; to live `DELETE`, see `CONTRACTS.md` §7.2, §8.3. | default inside `RULINGS.md` R-6 | never |
| 38 (f) | A pending write of the removed Attempt | Resolves `mismatched` without `confirmedValue`, before the removal, see §4.12. | default | as item 38 |
| 38 (g) | Its checks and flags | Stay in the store, unserved while the Attempt does not exist, served again if the same `attemptId` returns, whoever the competitor then is, see `CONTRACTS.md` §2.10. | maintainer ruling 2026-11-12, `RULINGS.md` R-7 | never |
| 38 (h) | Its Entry | Stays. | default, nothing recorded | as item 38 |
| 38 (i) | A row that returns | Creates a new Attempt, `run` 1, carrying none of the removed one's result state (generation, contradiction record, remembered mark); its checks and flags are (g)'s, see §4.12. | default, nothing recorded | as item 38 |
| 38 (j) | A wholly empty table | Removes nothing, see §4.12. | maintainer ruling 2026-11-11, `RULINGS.md` R-4 | never |
| 38 (k) | A flag's resolution while the Attempt is removed | A flag write: `404 attempt-not-found`, checked after `flag-not-found`, with nothing stored or pushed, see `CONTRACTS.md` §2.10, §7.4. | default, nothing recorded | as item 38 |
| 38 (l) | A removal inside a re-baseline | Sent as `attempt.deleted` like every removal, its pending write's `write.updated` first; the unit's `scope.replaced` follows without it, and on live the Phase replace removes it. The guard still counts every `tcp` delivery that named the Attempt, a row or a listing: step 1 discards result values and keeps identity and lifecycle `status`, so a file older than TCP's latest naming of the bib removes nothing, see §4.12, `CONTRACTS.md` §4. | default, nothing recorded | a recording where TCP keeps naming a bib the file has dropped, so that no re-baseline can remove it |
| 38 (m) | A returning Attempt's checks and flags | The unit that creates it sends, after its `attempt.updated`, one `check.updated` per check and one `flag.updated` per flag its reads then serve. The same holds for any Attempt created while the store holds checks or flags for it, such as the first creation after a restart, see `CONTRACTS.md` §2.10, §7.2. | default, nothing recorded | as item 38 |
| 39 | A TCP outage while no course is bound | Answered: decided as on a bound course. Where an XML snapshot during the outage would have displaced TCP (rule 2 and INV-2c: ingest order, the connection and content age, never a cell comparison), TCP's identical re-send regains precedence at its own instant; otherwise the first delivery's instant stays, see §4.6(b), `CONTRACTS.md` §1.2. | contract rule | never |
| 40 (a) | Which Event name wins | A non-blank name the operator entered, by boot flag or "start a new event", wins, and the snapshot's title never displaces it. With none entered, the name is the snapshot's title and follows it, each change sent as a same-id `event.changed`. Whether the name was entered is held and persisted with the Event, see `CONTRACTS.md` §2.2. | default, nothing recorded | organisers want the file's title to follow edits made after a name was typed |
| 40 (b) | What an unparseable date is | The date part is the first ten characters and must name a calendar day (month `01`–`12`, a day the month has, 29 February only in a leap year); what follows is not read. Otherwise `details` is not stated and `unparseable-field` is raised, see `CONTRACTS.md` §2.2. | default, nothing recorded: every recorded date is well formed | a recording whose time part shows its date part is not the day the organiser meant |
| 41 (a) | What re-arms `xml-table-emptied` | An XML snapshot of the race that carries a row; a TCP push carrying rows does not, see §4.12. | default, nothing recorded | an operator misses an emptying that came after a TCP-only stretch |
| 41 (b) | A refused XML retraction and the field's earlier `xml` value | Answered, see §4.12, Guard: the refused snapshot moves nothing of the field, its `xml` slot included. The retained `xml` value is never presented, since every path that takes a `tcp` value away replaces the `xml` slot or puts a later `tcp` observation over it. | default | a path is added that takes a `tcp` value away and leaves the `xml` slot with no later `tcp` observation over it |
| 41 (c) | When `xml-table-emptied` is raised | Only where the guard would have admitted the retraction: a first read or a file older than the results it lacks raises nothing, and the first later admitted snapshot raises it, see §4.12. | default inside `RULINGS.md` R-4 | an operator misses an emptied table because every read of it was older than TCP's last delivery |
| 42 | Every date the XML states | Item 40 (b)'s rule reads every date part: `Schedule.StartTime` and `Participants.Birthdate`/`Birthdate2`. An unparseable `StartTime` states neither `date` nor `scheduledStart` and raises one `unparseable-field` (`where` the `phaseId`, `name` `StartTime`); the Phase keeps what it holds, and pairing and `eventTime` take no date from it. An unparseable `Birthdate` leaves `birthDate` absent, `birthYear` falls back to `Participants.Year`, and raises `unparseable-field` (`where` the participant's `Id`, `name` `Birthdate` or `Birthdate2`). An empty value is absent, with no diagnostic. See §2.1, §3. | default, nothing recorded: every recorded value is well formed | a recording with an invalid date part, or birth dates entered in a form that crowds the admin log |
| 43 | `running` beside a status other than `on-course` | Never presented: `running` ends where the stream's own status leaves `on-course`, see §4.3. | recordings: 0 such pairs over every step of the seven replays | a non-zero count, or with item 35 |
| 43 (a) | A finish listing with no `duration` to infer | `running` ends, and `outcome` is `not-yet` until a row states one; slalom and the Cross time trial alike, see §4.3. | recording cp3-cross WX1_XT_26:25 (234 such listings) | as item 43 |
| 43 (b) | An `at-start` listing that carries a `Time` | States no `running`, see §4.3. | default, nothing recorded | as item 43 |
| 43 (c) | What a leave yields | In slalom and the Cross time trial no `running` survives a leave (§4.1); in a Cross heat the leave changes neither `status` nor the outcome (item 35). | maintainer ruling 2026-11-16, `RULINGS.md` R-23 | as item 43 |
| 43 (d) | A Cross time-trial athlete removed before a finish | Superseded by `RULINGS.md` R-23: `left-without-finish`, the mark from the next save, see §4.1. | maintainer ruling 2026-11-16, `RULINGS.md` R-23 | never |
| 44 (a) | A same-key retry after the keys were lost | A new request: the same gate and value go upstream again, or a second flag is raised. Accepted residual, see `CONTRACTS.md` §1.5. | default, nothing recorded | a venue reports a doubled correction or flag after a restart, or the venue-laptop check (#198) shows a store failing validation in ordinary use |
| 44 (b) | A refusal "the Attempt has no run yet" | Answered: there is none, see `CONTRACTS.md` §7.3. | contract rule | never |
| 44 (c) | Who decides `superseded` for a write resumed after a restart | The core, see §6, "After a restart". | default | never |
| 44 (d) | A retained value that is not `known` | Retains no cell, see §6. | default | never |
| 45 | A second run withdrawn with no run to come | After a run-2 row is retracted, the time-empty row keeps `placement`, `pairTotal` and `countingRun` carried, `provisional: true`, until a row of run 2 states a time or a mark, also where the run never comes. | default, nothing recorded (the one recorded cleared run-2 mark, jarni-so-odp C1M_BR2_18:51, raced 44 s later) | a recording of the case, or M3 or M5 find a provisional entry in an `official` Phase's standing misleading; ending the carry at `official` is then the rule to weigh |
| 46 (a) | The merged run-2 `outcome`'s instant and gate 2 | Checker only, see `TEST-ARCHITECTURE.md` §3.2 property 1. | default | a client orders or ages by that `observedAt` |
| 46 (b) | `exercised` counts under a stated outage or re-baseline | Checker only, see `TEST-ARCHITECTURE.md` §3.2. | default | a fixture holds a recorded outage beside a stated one |
| 46 (c) | `CONTRACTS.md` §5 step 4's "0 mismatches" not re-measured | Superseded by item 53 (a). | recordings | never |
| 47 | `source-unreachable` in the closed set | It stays, although nothing on site produces it (§4.5): removing it changes the schema and the contract package for nothing a client sees. | default | the 1.0 contract freeze (M6): drop it there if it still has no producer |
| 48 | A first run's `siblingPhaseId` | The inverse of the second runs' lookup, see §2.1. One shape stays one-way: two second runs that name one first run, which names only the one on its day. | default inside `RULINGS.md` R-18; recordings: every paired slalom class has one first and one second run per day | a recording where a class's first and second runs are not one of each per day |
| 49 (a) | Who derives a first run's sibling | Answered: the core; a parser states a first run's `pair` with `siblingPhaseId: null`, see §2.1. | default | never |
| 49 (b) | A second run and a first run of another class | It stops naming the first run once both Phases' stated `classId` differ; while the first run's class is not stated, the second run's `pair` stands, see §2.1. | default, nothing recorded | a recording of a class rename |
| 49 (c) | A Phase the schedule no longer holds | Superseded by item 54. | maintainer ruling 2026-11-16, `RULINGS.md` R-8 | never |
| 49 (d) | A held Phase with neither `format` nor `pair` stated, named by a second run under (b) | It is that pair's first run: `pair` is `{ role: 'first', combination, siblingPhaseId }`, the combination the naming pair's and the sibling item 48's. Its `format`, `stage`, `kind`, `scoringKind` and `heats` are not presented until a `format` is stated, and the core reads them meanwhile as `CONTRACTS.md` §2.4's unknown-token row; the first `format` stated decides them and the role. | default, nothing recorded: on site every first statement of a Phase carries its `format` | a deployable creates a Phase without a stated `format` |
| 50 | Several writes pending on one Attempt | See `CONTRACTS.md` §4 rule 4 and §6; rows 50 (a) to (g) are the defaults. | default; no recording holds a write | penalty-check (M4) wants one correction per gate at a time |
| 50 (a) | What is presented | The rules 1–3 vector as it stands at each step, every pending write's cell laid over it, the later write's on a shared cell; `operator-write`, `provisional: true` while any write is pending; `observedAt` the element's that last changed the presented vector, and a step that changes no presented cell sends no `gates`. See `CONTRACTS.md` §4 rule 4. | default | as item 50 |
| 50 (b) | How echoes resolve them | Different cells independently; one cell in the order sent, the oldest first, see §6. | default | as item 50 |
| 50 (c) | A delivery the oldest write cannot use | It answers the latest write whose value it states and resolves the ones before it, see §6. | default | as item 50 |
| 50 (d) | Several pending writes after a restart | They resume in one step, in the order sent, and the first delivery is judged once against all of them, see §6. | default | as item 50 |
| 50 (e) | A pending write with no course bound | It presents nothing; from the step the course binds its cell is laid over, for an Attempt with no cells of its own too. A write whose gate the bound course does not have lays nothing over and stays `pending`. See `CONTRACTS.md` §4 rule 4. | default | as item 50 |
| 50 (f) | An assertion beside a pending write | No deployable has both. In the shared core a pending write is judged at every delivery whether or not its value is presented, and of two operator observations the later-ingested one is presented. | default | as item 50 |
| 50 (g) | A resolution and the later writes' retained value | The delivered value becomes every remaining write's retained value, against both sources, see §6. | default | as item 50 |
| 51 | A stream finish withdrawn or contradicted after its `Completed` stop | The closure goes with the finish its listing carried: the next finish's `duration` is inferred afresh, and the run closes again at its own `Y`, the leave or a mark, see §4.1, §4.4. | default; recordings: the seven recorded withdrawn or contradicted finishes carried no `Y` before | a recording of a `Completed` finish withdrawn or contradicted |
| 52 (a) | An entry the latest admitted XML leaves out | Its kept `decidedIn` reads `null` on later TCP rows until a save states it: the kept values are the latest admitted snapshot's that carries rows, replaced whole, see §4.10. | default, nothing recorded | a recording where an entry leaves a classification build and returns |
| 52 (b) | A re-baseline and the classification rows | Kept, with the kept `decidedIn`; the read replaces them as any snapshot does, under INV-2c's guard, see §4.10, `CONTRACTS.md` §4. | default, nothing recorded | an operator needs a re-baseline to clear a classification |
| 53 (a) | Category numbering on a class tie | Answered: consecutive, in class order, as upstream numbers it, see `CONTRACTS.md` §5 step 4. | recordings: 0 mismatches over 493,763 row-instances of the seven | never |
| 53 (b) | Category ranks in Kayak Cross heats and classifications | Answered: no category standing is published there, so nothing is checked, see `CONTRACTS.md` §5 step 1. | recording cp3-cross | age-category standings are published for a Cross heat or a classification |
| 53 (c) | A second-run Phase's category ranks | Not checked: the check reads `CatRnk` of first-run and single-run rows only, see `CONTRACTS.md` §5 step 4. | recordings: upstream fills `TotalCatRnk` late | never |
| 53 (d) | An unplaced row's `CatRnk` | Answered: not read, the check reads placed rows only, see `CONTRACTS.md` §5 step 4. | recording jarni-ne-odp | never |
| 53 (e) | When the category check compares | Only while the whole-class standing presents the latest snapshot's class order; otherwise nothing is compared and an anomaly recorded earlier is withdrawn, see `CONTRACTS.md` §5 step 4. | recordings: a save lagging TCP's push raised transient anomalies | never |
| 54 | A race that leaves the schedule | Its Phase is removed when an admitted XML snapshot no longer schedules it; an empty schedule removes nothing, see §4.12. Rows 54 (a) to (n) are the defaults inside it. | maintainer ruling 2026-11-16, `RULINGS.md` R-8; no recording holds a race leaving the schedule | a recording of a race leaving the schedule that these rows present wrongly, or of TCP's `Schedule` still naming a race the file has dropped, which the guard would then never remove while TCP is connected |
| 54 (a) | What triggers the removal | The snapshot's `Schedule` table (§0.3), never its results tables, see §4.12. | default inside `RULINGS.md` R-8 | as item 54 |
| 54 (b) | Which Phase can be removed | Only one an XML schedule statement has named, admitted or not, a first read's included; a Phase only TCP has named stays, and TCP's `Schedule` never removes, see §4.12. | default | as item 54 |
| 54 (c) | The guard | Covers the whole Phase: every `tcp` observation of it or of its Attempts predates the snapshot's `changedAfter`, and a Phase with an Attempt in the on-course set is never removed; not admitted, nothing moves, see §4.12. | default | as item 54 |
| 54 (d) | The message | One `phase.deleted { phaseId }`, which implies its Attempts and Standings, with no `attempt.deleted` or `standing.updated` for them; on live one `DELETE`, see `CONTRACTS.md` §7.2, §8.3. | default inside `RULINGS.md` R-8 | never |
| 54 (e) | Pending writes of its Attempts | Resolve `mismatched` without `confirmedValue`, before the `phase.deleted`, see §4.12. | default | as item 54 |
| 54 (f) | Checks and flags of its Attempts | Stay in the store, served again when an `attemptId` returns; the Phase's checks read answers `404 phase-not-found` meanwhile, see `CONTRACTS.md` §2.10, §7.1. | default | as item 54 |
| 54 (g) | Which Standings go | Those whose scope names the Phase: its `phase`, `heat` and `classification` standings, a `pair` keyed by it or naming it as the first run, whole class and every category, the set `scope.replaced` covers. A surviving second run's `pair` standing is published again from its first entry once a first run is named. See `CONTRACTS.md` §4 INV-7. | default | as item 54 |
| 54 (h) | Pairing after a removal | A first run that named the removed Phase is derived again in the unit; a second run that named it presents `siblingPhaseId: null`. The core never presents a sibling naming a Phase it removed and has not created again (n): such a stated sibling is retained and presents `null`, at later statements too, until then; the rule is the core's, and the parser tracks no removal. A second run naming a Phase never held stays as 49 (b), (d) have it. Each Phase whose pairing changed is sent as `phase.updated` after the `phase.deleted`, in one unit, see §4.12. | default | as item 54 |
| 54 (i) | Its classification rows and kept `decidedIn` | Go with the Phase, see §4.12. | default | as item 54 |
| 54 (j) | A returning Phase | A new Phase, created whole by the ordinary rule, its `date` the snapshot's, its Attempts `run` 1 with none of the removed ones' result state, their checks and flags served again, see `CONTRACTS.md` §4 INV-7. | default | as item 54 |
| 54 (k) | `xml-schedule-emptied` | Raised as `xml-table-emptied` is: once per emptying, under the guard, re-armed by a schedule statement that names a race, see §4.12. | default inside `RULINGS.md` R-8 | as item 54 |
| 54 (l) | A removal inside a re-baseline | The same guard, counting every `tcp` delivery that named the Phase. An event re-baseline sends each `phase.deleted` before its `scope.replaced`; a Phase re-baseline whose read removes its own Phase sends the `phase.deleted`, no `scope.replaced`, and answers `200` with `attempts: 0`, see `CONTRACTS.md` §7.1. | default | as item 54 |
| 54 (m) | A race the read's own tables still carry | Not removed by that read: the removal is decided over the whole read, and a scope snapshot of the race with at least one row carries it, schedule row or not; a later read that carries neither removes it. A table with no rows carries nothing. | default, nothing recorded | the code follows it under #392 |
| 54 (n) | What "created again" means | Created as clients see it: at the first observation that states its class, when its `phase.updated` goes out. A classless observation of the removed id creates nothing for a client, so a second run's stated sibling keeps presenting `null` until the creating message is sent; the second run's `phase.updated` follows it in the same unit. | default, nothing recorded | the code follows it under #392 |

---

## 11. Server procedures moved from CONTRACTS

Each subsection below is moved word for word from the `CONTRACTS.md` section its title names,
where a one-line pointer to it now stands. Inside them a bare section number, an invariant
(INV-n) and "rule n" refer to `CONTRACTS.md`, and "above" and "below" to the original place.

### 11.1 Condition 2 of `provisional` in full: the judging clause (from CONTRACTS section 1.2)

**Condition 2 in full: the judging clause.**
- **It reaches every field a row states for the run:** `outcome`, `gates` (in Kayak Cross
  `faults`), `placement`, `pairTotal`, `countingRun`, `underReview` and `qualified`. `status` is
  outside it (above), and the on-course facts (`courseOrder`, `timeToBeat`, `splits`) are asserted,
  not judged.
- **First exemption: an Attempt with no run yet** — `status` absent or `not-started`, its row
  carrying neither time nor mark — has no run to judge. Its values are the previous run's,
  settled there, until the carry of condition 3 begins.
- **Second exemption: a Kayak Cross heat's placement.** The `placement`, the ordinal built from
  it, and the `qualified` and `underReview` the row states with it are upstream's whole result,
  asserted after the judging, and leave this clause at the step the placement is presented. The
  heat's `faults` stays under it until the heat leaves the list (`DERIVATIONS.md` §4.2, §4.7).

*Examples.* A first result push with gate 14 still blank is provisional until the judge enters
the gate or the run closes (§2.11). A row pushed at a cold start, before the first snapshot binds
a course, is provisional until the course binds and shows no blank cell, or the run closes. Before run 2 a
second-run row carries the combined placement and total with no time: those values are run 1's,
and the clause does not reach them.

### 11.2 Condition 3 of `provisional` in full: the second-run carry (from CONTRACTS section 1.2)

**Condition 3 in full: the second-run carry.**
- **It begins** at the Attempt's first on-course listing in run 2, staged or started: the stream
  saying the run is about to happen.
- **It ends field by field** when a row of run 2 — one carrying its time or its mark — restates
  the field: `placement` and `pairTotal` come with the TCP row, `countingRun` only with the XML
  row (`DERIVATIONS.md` §4.4; the TCP row usually arrives before the on-course finish message,
  §2.6). A row of run 2 without either restates run 1's values and leaves them carried.
- **A row whose mark INV-7's guard refused restates nothing:** the snapshot is ignored for that
  field and the time is held back with the mark (§2.6), so the values stay carried. Refused means
  refused by the guard's own content-age comparison, the snapshot's `changedAfter` against the
  `tcp` observation's latest delivery, never by whether a presentation followed. The comparison
  is made only where the row's mark would change a `status` presented from `tcp` (rule 2's mark
  exception), so a row with no mark, and a row whose mark the presented `status` already is, are
  never refused.
- **A row the guard admits restates the field** whether or not it is then presented, so a row
  withheld after admission leaves nothing carried.
- **A retraction of the restating row** — its mark cleared in place, or the row gone (INV-7) —
  ends its restatement: the row of run 2 without time or mark that follows leaves the fields
  carried again, the run being about to happen once more.

*Examples* (recorded; property 11 gives the instants). An athlete is staged for run 2 with
no start yet (nkz-19so C1W_BR2_19:35): `placement` and `pairTotal` are provisional from that
listing. An XML `dns` row is refused by the guard against a leave two seconds earlier (jarni-ne-do
K1M_BR2_19:62) and the carry stands; the TCP `dns` row that follows restates `placement` and
`pairTotal`, and the next XML read restates `countingRun`. A run-2 `dns` cleared in place before
the athlete raced (jarni-so-odp C1M_BR2_18:51): the values are carried again.

### 11.3 Format tokens and their structural properties (from CONTRACTS section 2.4)

| Upstream format tokens | `kind` | `pair` | `scoringKind` | `heats` |
|---|---|---|---|---|
| `BR1`/`BR2` (best-run slalom), `HT1`/`HT2` (international heats), `EL1`/`EL2`, `TR1`/`TR2` | race | first / second, `combination: 'best'` | duration | no |
| `SR1`/`SR2`, `TS1`/`TS2` and any other paired second run | race | first / second, `combination: 'sum'` | duration | no |
| `QF`, `SF`, `SFB`, `FI`, `FIB`, `SP1`, `SP2`, `SPF`, `TSR`, `XT`, `XT1`, `XT2`, `NHT1`, `NHT2` (heats with direct qualification; see Pairing) and single-run tokens generally | race | `null` | duration | no |
| `X8`, `X4`, `XS`, `XF` (Kayak Cross head-to-head) | race | `null` | ordinal | yes |
| `XER`, `SLER`, `WWER` (event-result classifications: "ER" = event result) | classification | `null` | ordinal | no |
| `RXER` (a title only; upstream calculates nothing for it) | classification, never holding rows | `null` | ordinal | no |
| `SUF` (super-final after a second run) | race | second of a pair with the `BR2`, `combination: 'sum'` | duration | no |
| `FI` or `FIB` after an `SF` under upstream's legacy-finals setting; `TFI` after a `TSF` (whether under that setting is not established) | race | second of a pair with that semi-final, `combination: 'sum'` — only when its rows carry a combined total, see below | duration | no |
| any unknown token | race | `null` | duration | no |

### 11.4 Pairing: a second run names its first (from CONTRACTS section 2.4)

- **A second run names its first by two fields of the Phase: its `classId` and its `format`.**
  The first run is the Phase with the same `classId` whose `format` this table gives for the
  second run's:

  | Second run | `BR2` | `HT2` | `EL2` | `TR2` | `SR2` | `TS2` | `SUF` | `FI`, `FIB` | `TFI` |
  |---|---|---|---|---|---|---|---|---|---|
  | Its first run | `BR1` | `HT1` | `EL1` | `TR1` | `SR1` | `TS1` | `BR2` | `SF` | `TSF` |

  A first-run token (`BR1`, `HT1`, `EL1`, `TR1`, `SR1`, `TS1`) names the second run that names
  it: the pairing is made from the second run's side, as upstream makes it, and the first run's
  pointer is its inverse, never a lookup of its own (a default; `DERIVATIONS.md` §10 item 48).
  `BR2`, `SF` and `TSF` are only named, by the `SUF` or the final:
  their own `pair` is their row of the format table above. This is how upstream itself links two
  runs (observed upstream behaviour).

### 11.5 Pairing: no `RaceId` read, and `combination` (from CONTRACTS section 2.4)

- **No part of a `RaceId` is read for pairing,** and no sibling id is built from this Phase's id.
  `classId` is the class field's value, verbatim (§2.3), which covers pairing too: after a rename
  the two runs still share a `classId`, while a started first run keeps its old `RaceId` prefix.
  *Examples.* `K1M_ST_BR2_6` and `K1M_ST_BR1_6` pair because both state `classId` `K1M_ST` and
  their formats are `BR2` and `BR1`; the same for `K1M-ZS_BR2_25` with `K1M-ZS_BR1_25`. An
  attribute sub-race (`MX1J_XT_26_JUN`, class `MX1J`, format `XT`) has no second run and pairs
  with nothing. A rename, illustrative since no recording holds one: class `K1M` becomes `K1M-X`
  after its first run started, and the second run's id is rebuilt. The Phases are `K1M_BR1_19`
  and `K1M-X_BR2_19`, both with `classId` `K1M-X`: they pair. Reading the prefix would not find
  the first run.
- `combination` is `'best'` exactly for `BR2`, `HT2`, `EL2` and `TR2`. Upstream sums both runs
  for every other second run.

### 11.6 Run generation: what increments `run` (from CONTRACTS section 2.6)

- `run` increments on exactly one piece of upstream evidence: an on-course listing of the Attempt
  that carries a start different from the generation's recorded start **and no finish, for a
  generation that is recorded** — a results-table row carrying a time or a mark was attributed to
  it after its recorded start was known and stated something the table did not already hold on
  either source (a mark standing at the recorded start records nothing however it arrives
  afterwards), a retraction since notwithstanding; a contradiction (§4 INV-2d) un-records it until the next row,
  and the on-course stream records nothing by itself (`DERIVATIONS.md` §4.11 defines both terms;
  `DECISIONS/ADR-013` Revision 4). The recorded start is the first start listed for the generation:
  the listing that gives it changes nothing of this rule's (§4 INV-2d still applies at it,
  `DERIVATIONS.md` §4.11), and a listing with no start leaves it. **Any other
  change of the listed start is a start correction inside the generation:** at the listing no
  results-table value, `run` or placement changes; the on-course inferences and `status` follow the
  listing as they follow any listing (§3.2; `DERIVATIONS.md` §4.1, §4.3); the generation's recorded
  start becomes the listing's, and a time the correction moved reaches the Attempt as the next
  results-table row, which supersedes like any correction (§4 INV-2c, same source); checks and
  writes stay with the generation. Recorded: seven start changes in four
  recordings, six of them corrections — mid-run, before any finish; after the finish, the listing
  carrying the same `dtFinish` with a new time; a start deleted and given again — and one re-run
  (`DERIVATIONS.md` §4.11). A recorded result row
  observed cleared is a retraction (§4 INV-7), not a generation change (`DECISIONS/ADR-013`
  Revision); a re-run appears as that retraction followed by the new start.

### 11.7 Run generation: attributing observations (from CONTRACTS section 2.6)

- Observations are attributed to a generation by the finish they carry, else by run time
  (`DERIVATIONS.md` §4.11): an XML row by `dtFinish`; a TCP row, which carries no finish time, is the
  current generation's only once that generation's finish has been seen on the on-course stream and
  the row's `Time` equals it. A TCP row with a time that arrives before that finish is retained: it is
  attributed to the current generation if the on-course finish then arrives with the same `Time`,
  else it describes the replaced run and is never presented. This is the usual order, in every
  generation: in 72 % of recorded finishes the result push precedes the on-course message that shows
  the finish, by 0.06–0.71 s, because the push follows the finish impulse within about 0.3 s while the
  on-course stream shows the finish on its next cycle (`DERIVATIONS.md` §4.4). A row attributed later
  gains the finish as `eventTime`; its `observedAt` stays its own.

### 11.8 Finish per discipline (from CONTRACTS section 2.6)

**Finish is a per-discipline strategy** (`DECISIONS/ADR-009`).
- **Slalom:** the finish-time transition on the on-course stream. The authoritative source is
  Canoe123's own finish time. There is no fallback. Upstream shows a split time with decimals during
  a split hold, so a whole-seconds-to-decimals change is not a finish, and the downstream highlight
  signal is our own derivative, not an upstream one.
- **Cross:** no per-competitor finish signal exists on the on-course stream. The heat order is the
  operator's assertion, entered after conferring with the finish judge. It reaches us as ordinary
  results-table observations: `source` is the channel it arrived on, `tcp` or `xml`, with
  `confidence: 'authoritative'`. It is pushed on, un-debounced, the moment it is ingested.

### 11.9 The bridge's delivery to live (from CONTRACTS section 2.8)

**The bridge's delivery to live is part of the contract, because its absence was a defect.** In an
end-to-end Cross test of the old system, the live push's circuit breaker opened after five failures
and stayed open until c123-server was restarted, silently (`EVIDENCE.md` Exhibit 12). The rules:
- the bridge keeps, per resource, only its **current** state awaiting delivery, coalesced; never a
  queue of intermediate values;
- delivery retries with exponential backoff from 1 s to a 60 s cap, **indefinitely**; there is no
  breaker that stays open, and nothing needs a restart;
- `429` honours `Retry-After`; `401`/`403` sets `state: 'rejected'`, stops retrying that key and
  reports it, since only configuration can fix it;
- after any outage, rejection cleared, or restart, the bridge re-pushes the current state of every
  resource changed since `lastAcceptedAt`. Every push is an idempotent `PUT` (§1.5), so re-pushing
  is always safe and needs no negotiation;
- a TCP (re)connect on site brings the current race's whole results table at once
  (`DERIVATIONS.md` §0.3), so a bridge restart or reconnect incurs, besides the cold-start burst of
  every Attempt in the snapshot, a burst of the current race's rows: 152–1,167 rows in the recordings;
- the state is visible in `SourceStatus.live` and pushed as `sources.updated` (§7.2), admin only.

### 11.10 Durability of checks and flags (from CONTRACTS section 2.10)

**Durability is a contract guarantee.** Nothing upstream can reconstruct this state; everything else
is recoverable from the XML snapshot in one read. So:
- every change is written to durable storage atomically, as a temporary file then a rename, so a
  crash at any point leaves the previous complete state;
- a write is acknowledged (§7.4) and pushed (§7.2) only after it is durable;
- the store is validated on load, and a file that fails validation is reported to the admin
  audience and never silently replaced: it is set aside under another name, the store opens
  empty and the server starts; the report is an admin log entry, nothing on the wire
  (maintainer, 2026-11-12; `DERIVATIONS.md` §10 item 33);
- `TEST-ARCHITECTURE.md` §3.5 is the verification path.

### 11.11 Kinds of observation (from CONTRACTS section 4)

**Kinds of observation.** Every observation of an Attempt fact is one of four kinds:
- an **on-course inference**, computed by the domain layer from the TCP on-course stream;
- a **results-table observation**: a TCP result push, or an XML snapshot row. Both are renderings of
  Canoe123's own results table;
- a **scope snapshot**: a complete statement of one race's results table. Exactly two messages are
  scope snapshots: a TCP result push, for the race it names, and an XML snapshot, for every race in
  it. Nothing else is. An on-course message describes one participant; a UDP fragment describes one
  row and is not consumed at all (`DECISIONS/ADR-011`); a disconnected source says nothing. A TCP
  result push was complete in 17,496 of 17,496 recorded messages. **A table with no rows is a scope
  snapshot in start-list mode** (its mode is read structurally like any other, `DERIVATIONS.md`
  §0.3); recorded only before any row of that race ever existed, where it changes nothing. From
  TCP it retracts as start-list mode does; from the XML it retracts nothing (INV-7);
- an **operator write** (`operator-write`).

### 11.12 INV-2 rules 1 to 3 (from CONTRACTS section 4)

1. **A results-table observation supersedes an on-course inference** of the same run generation, and
   is never superseded by one. The inference exists only for the fraction of a second before the
   result push arrives (`DECISIONS/ADR-011` gives the measured latency).

   **`gates` is the exception: it is merged cell by cell.**
   - While the Attempt is in the on-course set (§7.1: upstream's list, which keeps a finisher until
     closure), each gate cell takes the newest *judged* value from either kind of observation.
   - A cell that is blank in a result row never overwrites a cell the on-course stream has already
     judged. Upstream pushes nothing when the last missing gate is judged clean, so for up to about
     20 s its result row shows that cell blank while the on-course stream already shows `0`
     (observed upstream behaviour).
   - Once the Attempt has left the list, the result row's gate vector is authoritative whole. That
     includes later corrections.
   - Within one kind the later observation replaces the earlier whole (INV-2c's same-source
     sentence): a cell the stream judged and later shows blank is blank — upstream withdrew it —
     while a row's judged cell stands against a stream blank. The merged vector is a results-table
     value with cells taken from the stream, not an inference (§1.2; `DERIVATIONS.md` §4.6(e)).
   - `outcome.penaltySeconds` of a second run is the sum of the merged cells (§2.6,
     `DERIVATIONS.md` §4.4).
2. **Between `tcp` and `xml` results-table observations of the same field, `tcp` wins while TCP has
   stayed connected since that `tcp` observation was ingested.** Canoe123 pushes these changes to its
   results table on TCP immediately:
   - finish and every penalty change;
   - corrections, including to closed races;
   - closure of a run;
   - the paired second race whenever the first changes;
   - result marks typed in the results grid or set by the online-scoring session.

   For all of these, a connected TCP is never behind the snapshot. **For `status`, the on-course
   stream's inference is the `tcp` side of this rule:** an `xml` row's `status` displaces a stream
   `on-course` or `finished` only by the exception below or after a disconnect, never while TCP is
   connected (`xml-mark-does-not-override-tcp-finish`); the row's other fields follow rule 1
   (`no-result` is none of them: it is `status`'s presentation, §2.6). **A listing's `entry` is
   likewise rule 2's `tcp` side:** an `xml` row restating it changes nothing presented, its
   `source` included.

   **The one exception is a result mark set on a silent path.** Upstream sends no TCP push for:
   - a DNS entered from the start judge's terminal;
   - a DNF or DSQ entered by removing the athlete from the course before a finish.

   So an `xml` observation of `status` carrying a no-result mark — `Outcome`'s `no-result` set,
   every mark but `non-ranked`, which is a finished run typed in the grid and pushed — supersedes
   a presented `tcp` status
   of `not-started`, `at-start` or `left-without-finish`. None of those is a mark, and none can be a
   finish. This is how the reason for `left-without-finish` arrives at the next save, not at TCP's
   next incidental push (§2.6). INV-2c's content-age guard applies: the snapshot's content must be
   newer than the `tcp` observation it displaces — and that observation is delivered by every
   listing that states it (INV-2c), so on an Attempt upstream still lists `at-start` the mark
   waits for TCP's row or for the first rewrite whose content age postdates the last listing
   (E1: on five recordings this costs 1.1 s once and removes a 2.6 s `dns`
   flash and a 10 s cleared `dns`); a mark the guard refused holds back its whole row (§2.6). **Otherwise the later-ingested observation wins,
   under the same guard,** decided at a step that ingests an observation of the field: a
   connection event presents nothing by itself (`TEST-ARCHITECTURE.md` §3.2 property 3), so a
   candidate refused while TCP was connected is presented at the first snapshot of its race after
   the disconnect that restates it (INV-5 advances its content age, INV-2c settles it), not at the
   disconnect. This covers two cases:
   - During an outage, a snapshot rewrite *detected after the disconnect* takes over, provided its
     content age postdates TCP's last observation of the field (INV-2c); a rewrite that happened in
     the seconds before the disconnect does not, and the next one does.
   - After reconnection, TCP's pre-outage observations no longer outrank a snapshot that was read
     later.
3. **Facts only one source carries** use that source alone:
   - on-course facts — `courseOrder`, `timeToBeat`, a `running` outcome — and `Course.captions`:
     TCP only;
   - `countingRun`, `Entry.members`, `ageCategoryId`, `eventBib` and `isTeam`,
     `Class.ageCategories`, `Event.details`, `Phase.courseId`, `Phase.scheduledStart` and `title`,
     `Course.layout` and `sectorEndsAfterGate`: the XML only. (`Gate.memberPenalties` reaches
     `gates` only from the snapshot, §2.6, and `Course.courseId` is structural; neither has a
     `source` of its own, so neither is listed.) A first run's own figures are its own Attempt's and
     follow rules 1–2; the second-run row's `PrevTime`, `PrevPen`, `PrevTotal`, `PrevStatus`,
     `PrevRnk` and `PrevRnkOrder` are not read (`DERIVATIONS.md` §4.5).

### 11.13 INV-2d, the contradicted finish (from CONTRACTS section 4)

- **INV-2d (the on-course stream contradicts a stale finish).** When the on-course stream lists an
  Attempt with the current generation's start and no finish, after a finish was presented for it
  from a results-table observation, that finish is **contradicted**:
  - `status` returns to `on-course`, `outcome` to the on-course `running` value, `placement`,
    `pairTotal` and `countingRun` to `not-yet`;
  - the contradicted finish is recorded as `{ finishTime: Timestamp | null; runSeconds: number }`:
    `finishTime` is the presented `eventTime` where the finish was observed on the on-course stream
    or in the XML, else `null`, since a TCP row carries no finish time;
  - every results-table observation of this Attempt carrying the contradicted finish — by `dtFinish`
    where the row has one, else by run time — stays retained and unpresented, also after the lift;
  - the contradiction is lifted by a results-table observation carrying a different finish by the
    same comparison, a mark, or a retraction (INV-7), or by the on-course stream listing the Attempt
    with a finish again.

  Evidence: taking a finish away on upstream's on-course grid does not clear the stored result, so
  later pushes keep carrying it. Seven recorded cases; two of them showed a false leader for 31 s and
  71 s. Kayak Cross heats are exempt: their on-course stream never shows a finish (§2.6;
  `DERIVATIONS.md` §4.2); a Cross time trial's does (`DERIVATIONS.md` §4.4) and is treated as
  slalom's, here and under the stream's own withdrawal (§3.2).

### 11.14 INV-7: absence in a TCP result push (from CONTRACTS section 4)

- **TCP, first-run or single-run race:** the row is absent, **or present with no time and no mark**
  (recorded: a jury-invalidated run wiped in place at 10:56:58, the row gone an hour later), or the
  message is in start-list mode (no row carries a placement or a mark; upstream falls back to that
  mode exactly when nobody is ranked, which is what "delete all results" produces). Retracted: `outcome`, `gates`
  (in Kayak Cross `faults`, its judging field, here and below),
  `placement`, `underReview`, `qualified`, and any mark in `status`.
- **TCP, paired second run:** the row is absent: as above, plus `pairTotal` and `countingRun`. The
  row is present with an empty time and no mark: `outcome`, `gates` **and any mark in `status`** of
  run 2 are retracted (recorded: a second-run `dns` cleared in place, the athlete then raced);
  `placement` and `pairTotal` follow the row, since an athlete with only a first-run result is
  listed that way — `not-yet` where its `Rank` or `Total` is empty (recorded: jarni-ne-odp
  C1M_BR2_19:64 at 11:40:07, run 1 marked `dnf`, no combined result left).
  **`countingRun` is outside a present TCP row's statement:** no TCP column carries it
  (`DERIVATIONS.md` §4.4), so the row leaves it standing (INV-1) until the XML row — its sole
  carrier — restates it, `BetterRunNr` `0` being `not-yet`; the retraction reaches it only with
  the row absent (recorded: the same Attempt, `BetterRunNr` `1` → `0` in the snapshot of
  11:40:25.507, 18 s after the push).

### 11.15 INV-7: a present XML row with no result (from CONTRACTS section 4)

- **XML, the row is present** and carries no time, no finish time and no mark. A first-run or
  single-run row: as the TCP first-run case. A second-run row: as the TCP time-empty case, and
  `countingRun` is the row's as `BetterRunNr` states it, `0` being `not-yet` — before run 2,
  every second-run row in the snapshot already carries the combined placement and total with no
  time. This is how a deleted result, or a DNS, DNF or DSQ taken back, shows in the file: the
  row stays and its fields go empty.

### 11.16 Determinism (from CONTRACTS section 4)

**Determinism.** Given the same sequence of ingested observations, each carrying its source, kind,
run generation and ingest sequence, plus the same TCP connection events and re-baseline events, the
presented state is a pure function of that sequence. Nothing depends on wall-clock time at replay.

### 11.17 The derivability ledger (from CONTRACTS section 6)

What today's sources can and cannot supply. One column: CIS is not consumed (`DECISIONS/ADR-011`),
and nothing below depends on it. `DERIVATIONS.md` says *how* each value is produced.

| Value | Derivability |
|---|---|
| On-course state, running time, on-course order, time to beat | [D] TCP, ~2 messages/s |
| Slalom finish | [D] finish-time transition, TCP, authoritative |
| Result, penalties, class placement, combined placement | [D] TCP result push, median 0.14–0.41 s after the finish impulse (1,533 finishes). Also [D] from the XML snapshot, the complete record at cold start |
| A second run's own time, penalties and gates, including when run 1 is the better run | [D] TCP result push. The time and the gate cells are run 2's own; penalty = sum of the cells. Upstream's `Pen`/`Total` on that row describe the counting run and are never used for run 2. Matched the snapshot in 982 of 982 second-run finishes |
| A retraction: a cleared DNS, a deleted result, a finish moved to the right bib | [D] TCP result push, immediate when the correction was made in the results grid; at the race's next push or rotation (up to ~10 min) when made on a silent path; the XML snapshot at one save cycle. A finish taken away on the on-course grid is never cleared upstream: it is contradicted by the on-course stream at once (§4 INV-2d), and cleared for good only by the operator's re-baseline |
| Result marks (DNS, DNF, DSQ, …) | [D] Immediate when entered in the results grid, by the scoring session, or after a finish. Late when entered on the silent paths (start-terminal DNS, removal before a finish): then from the XML snapshot at ~35 s, or TCP's next push of the race. The fact that the athlete *left without a finish* is immediate, and carries no reason (§2.6) |
| Whether the result may still move | [D] from gate completeness against the course layout, plus run closure (§1.2) |
| Run 1's detail, once run 2 has superseded it on TCP | [D] XML snapshot, unconditionally. Also from this server's own retained observation of run 1 |
| Age-category standing | [D] assembled from class placement and the entry's category, at class-rank latency. The snapshot's own category ranks follow ~20 s later, as a check |
| Kayak Cross heat order | [D] operator assertion via the result push, as upstream placement. TCP only in practice: the XML snapshot carried Cross heat results 1.5–10 min late, because the Cross ranking never triggers a save |
| Event metadata: title, venue, dates | [D] XML snapshot. Dates are operator-entered and fallible |
| Multi-day grouping | [D] from each Phase's own date. The *identity* of a multi-day event is asserted, never derived (§2.2) |
| Members, club, nation, age category, birth date | [D] XML snapshot. Club and name are also in TCP result rows |
| Course layout and race→course binding | [D] XML snapshot. The current course is refreshed from TCP. Captions are TCP only |
| Splits | [D] where upstream arms them. Not populated at any recorded event, because none had splits armed |
| Registry-verified identity (spelling, nationality) | **[N]** Canoe123 is the only identity source that exists |
| Which registry an external id belongs to | **[N]** Asserted by the bridge operator from configuration (§2.5). Upstream would need a registry field per participant. It would buy scheme tagging without trusting configuration |
| Parent class of a sub-classified class (a juniors race run as its own class) | **[N]** The attribute is relayed on the Phase; the link to its base class is not stated upstream. Open technical question, `DERIVATIONS.md` §10 |
| Tie-breaking | [D] relayed from upstream's order; never computed (§5) |

### 11.18 Sending a penalty write, and the command (from CONTRACTS section 7.3)

The send
(a design default): the key is reserved as in flight, the command is written to the socket and its
acceptance awaited, and the step that creates the `WriteRequest`, applies the optimistic value and
pushes both (§2.9) runs before the next upstream unit is applied — upstream units received
meanwhile queue behind it, milliseconds — so that no echo can pass before the write exists (INV-2
rule 4 would leave it `pending` for ever, `DECISIONS/ADR-010`'s lost echo) and no same-key retry
can send a second command (§1.5). A refused or failed write creates no `WriteRequest`, binds no key
and pushes nothing — refusing rather than holding, by the same reasoning as the window after the
finish above. **Once the socket has accepted the command the write exists,** whatever happens to
its durable record (§1.5): if storing it fails, the `WriteRequest` and its key stay bound in
memory, the `202` and the push go out as usual — a same-key retry is still answered from the key
and sends nothing — and the failure is reported to the admin audience: an admin log entry and
nothing on the wire, as for a store file set aside (§2.10). What is lost until the store writes
again is the restart guarantee alone: the next successful write of the writes store (§1.5: the
`WriteRequest`s and both key maps, so a flag's key binding is such a write), whatever
change it carries, also stores every `WriteRequest` and key that memory alone holds, each as last
pushed, and a restart after it finds them.
The command is one XML document on one line, the `Canoe123` envelope naming the
connected instance and the correction element with the race id, bib, gate and value, followed by
the stream's message terminator; whitespace inside the element is not a contract item.

### 11.19 Addressing the connected instance (from CONTRACTS section 7.3)

**Every write is addressed to the connected instance.** Canoe123's command envelope names the
instance it is for, and a Backup instance ignores a command addressed to Main (observed upstream
behaviour). The server therefore addresses each write to `SourceStatus.tcp.upstreamInstance` (§2.8),
never to a constant.

### 11.20 The ingest sequence, notifying per unit and the `seq` floor (from CONTRACTS section 1.6)

Each outbound message takes the next value of the counter; an element's ingest sequence (INV-6, §4)
is the value the counter had when it was ingested, so one element may produce many messages, each
with its own `seq`. A core may apply observations one at a time, but it notifies per unit
(`CONFORMANCE-VECTORS.md` §1, "Ingest units"), and a replay step is one unit
(`TEST-ARCHITECTURE.md` §3.2). The counter's high-water mark is persisted with the same discipline as
§2.10. On site, a mark that fails validation at load is set aside, and the counter restarts at a
floor above any value issued in practice; on site, the guarantee carries the one residual stated in
`DERIVATIONS.md` §10 item 33, which the maintainer accepted as a residual risk (`RULINGS.md` R-16).
Neither relaxes anything for live-mini's counter.
