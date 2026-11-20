# ADR-015: Retraction is first-class — scope snapshots, contradiction by the on-course stream, and the operator re-baseline

The decision and the revisions below state the rules as they now stand; each revision keeps
its number because other documents and the code cite it. The narrative of each revision (the
question, the reasoning of its round, the vectors it moved) is in git under the tag
`contract-archive-2026-11`. The maintainer's rulings applied here are `RULINGS.md` R-4, R-6, R-7
and R-8.

## Context

The maintainer's statement after the consolidated revision: in-race noise and corrections are
normal, and the system must tolerate them, or at least allow a force-push of the results after an
intervention. The examples are all routine:
- a DNS set, then cleared when the athlete turns up late;
- a wrong bib started, removed from the course, and the correct bib put on;
- a finish given to the wrong athlete, or two finishes swapped, and fixed after the fact;
- bibs shifted over two or three finishes, and the results moved back;
- a penalty changed tens of minutes later after a protest.

INV-1 as written ("a field never regresses from `known` because a later message omits it") was
designed against `EVIDENCE.md` Exhibit 1, where a partial message wiped the whole state. Applied to
these corrections it does the opposite harm: it freezes a wrong value against upstream's explicit
statement that the value is gone. A cleared DNS would stay DNS, and a deleted result would stay on
the board.

The evidence, all E1 (recordings, and verified upstream behaviour stated without its provenance):
- **A TCP `Results` message is always a complete statement of one race's results table** at build
  time. None of 17,496 recorded messages was partial. In a first-run or single-run race the message
  lists every row with a total or a mark. In a paired second run it lists every row with a combined
  rank, and a row with only a first-run result has an empty time. When nobody is ranked, it falls back
  to the start list. Three cleared DNSs made the row vanish, and all three athletes then raced.
- **Only the UDP copy is cut into fragments.** It is not consumed (`ADR-011`).
- **Some correction paths change the stored row with no push:** "delete selected results", deleting
  an impulse, the re-run wizard, a start-terminal DNS, and DNF or DSQ before the finish. They show only
  at the race's next push, at rotation (up to ~10 min), or in the XML.
- **One path does not even clear the stored row.** Taking a finish away on the on-course grid leaves
  the old result in every later push until the athlete finishes again or the operator edits it.
  Recorded: a bib shown as leader with 48.64 s for 31 s, and another as first with 9.16 s for 71 s.
  Seven such cases. The only immediate tell is the on-course stream showing that bib running again.
- **The XML snapshot is complete** (2,236 of 2,236) and consistent as of one instant. But the save
  can land between two operator actions, so for one save cycle it can show half a correction: the
  same finish on two bibs, a penalty on neither, or one run on two races. A duplicate finish persisted
  for hours and was resolved by a DNF, not by clearing the time. The file never marks a retraction;
  an empty field also means "not raced" or "on course".
- **The XML write is a temporary file copied over the event file,** not a rename. No torn read was
  observed in 2,236 reads, but the window is real. The file is written only when a "changes pending"
  flag is set; the Kayak Cross heat ranking never sets it, so Cross heat results reached the file
  1.5–10 min late.
- **E2.** Live ingest is upsert-only (`LiveTransformer.ts:170-240`, live-mini
  `ResultIngestService.ts:86`), so no clear ever reaches live. On-site, `EventState.ts:196-197`
  replaces the whole results object with each push, so a vanished row disappears there by accident
  and a stale row survives exactly as long as upstream keeps sending it.

## Options considered

**A — Keep INV-1 as written and rely on the re-baseline alone.** Rejected. Every cleared DNS and every
deleted result would need an operator action to leave the board.

**B — Treat every message as full state.** Rejected. That is Exhibit 1: an on-course message describes
one participant, and a missing source says nothing.

**C — Distinguish scope snapshots from other messages; make explicit absence in a snapshot a
retraction; use the on-course stream as evidence against a stale finish; add an operator re-baseline
for what no message will ever clear.** Chosen.

**D — Confirm every XML retraction with a second snapshot before applying it.** Rejected. It adds a
save cycle to every legitimate retraction and still does not tell a half-correction from a whole
one. The half-correction hazard is bounded, upstream's own state, and covered by the diagnostics
and the re-baseline instead.

## Decision

C, precisely (`CONTRACTS.md` §4 INV-1, INV-2d, INV-7; §2.6; §3.2; §7.1–§7.2; §8.3–§8.4).

1. **Scope snapshots.** A fourth kind of observation: a complete statement of one race's results
   table. Exactly two messages are scope snapshots:
   - a TCP `Results` message, for the race it names, in either mode. In start-list mode it states
     that nobody in the race has a result or a mark, which is what "delete all results" produces;
   - an XML snapshot, for every race in it.

   Nothing else is: an on-course message, a UDP fragment, an operator write, a missing source.
2. **Retraction.** For an Attempt whose presented result came from results-table observations, a
   scope snapshot of its race that states no result is a retraction observation. It sets the
   retracted fields to `not-yet`, explicitly, and is pushed like any change. It never retracts an
   on-course inference, because a race's push can precede the row being written.
3. **INV-1 is narrowed to omission.** Monotonic knowledge still protects against omission in a
   non-snapshot message, a missing source, and a snapshot of another race.
4. **An XML retraction is guarded by content age (INV-2c).** The XML lags TCP by up to a save
   cycle, so a snapshot written before a result push must not retract it. An XML retraction, and
   the mark exception of INV-2 rule 2, apply to a `tcp` observation only when the snapshot's
   `changedAfter` is later than that observation's latest delivery; `null`, a first read, never
   qualifies. Otherwise the snapshot is ignored for that field, and the next snapshot settles it.
   The re-baseline's own read (decision 8, step 2) carries the same stamp. INV-2c states this guard
   as the general rule for any cross-source supersession (`ADR-003` Revision 5), so a snapshot
   rewritten in the seconds before a TCP disconnect does not take over during the outage
   (`DERIVATIONS.md` §10 item 8).
5. **Contradiction by the on-course stream.** A finish presented from a results-table row is
   contradicted the moment the on-course stream lists the Attempt with the same start and no finish.
   The Attempt returns to `on-course` with a `running` outcome and no placement. Rows carrying the
   contradicted finish time stay unpresented until a row carries a different finish, a mark, or a
   retraction, or the on-course stream shows a finish again.
6. **A mark overrides a time.** A row with a mark presents `no-result`, whatever time it carries.
7. **Half-corrections are surfaced, not guessed.** Two Attempts presenting the same finish time raise
   a `duplicate-finish` diagnostic. Nothing is auto-resolved.
8. **The operator re-baseline.** An admin action per race or per event discards every retained
   upstream observation for the scope's result fields, re-reads the current XML snapshot as a scope
   snapshot, lets the on-course stream and the next TCP push refill the `tcp` slots, and pushes the
   whole scope to every on-site client and to live as a replace. Identities, entries, run
   generations, verification state and write requests survive it. It is an event in the ingest
   sequence, so replay stays deterministic.
9. **The live wire carries deletion and replacement.** An explicit `not-yet` in a partial push resets
   the field; an Attempt can be deleted; a Phase's Attempts can be replaced whole. Upsert-only is
   recorded as an antipattern (`EVIDENCE.md` Exhibit 12).
10. **The state machine admits the routine transitions:** `finished → on-course` on a contradicted
    finish; a mark `→ not-started` on a retraction; `dns → not-started | at-start | on-course` on a
    cleared DNS.

## Why

The maintainer's operating reality is that results move. A contract that could only add knowledge
would be wrong within the first hour of a real race day, and the evidence shows exactly how. What
this decision preserves is the point of INV-1: no message that is silent about a fact can delete it.
What it adds is the one thing a full-state statement is for: saying that a fact is gone.

## What it costs

- An implementation must know which race each snapshot describes and which mode it is in, and must
  track on-course membership per Attempt. Both were already required.
- Transient wrong values for up to one save cycle when the XML captures half a correction. They are
  upstream's own state at that instant, and the diagnostics make them visible.
- One admin action, with a UI touchpoint, and one more message type on both wires.

## What it forecloses

Any tier that stores upstream results with upsert-only semantics. Any client that applies a
`scope.replaced` message as a merge rather than a replace.

## Open

- Which operator action produced each recorded retraction cannot be read from the stream (E4).
- Whether the live-mini XML ingest today overwrites results cleared on TCP is unverified (E4).

## Revision 2 — contradiction matched by finish or run time; the lift keeps contradicted rows unpresented

A TCP row has no finish time (`ADR-017` D1). The INV-2d record is
`{ finishTime: Timestamp | null; runSeconds }`; a retained row carries the contradicted finish when
its `dtFinish` equals `finishTime` (XML) or, having none, its `Time` equals `runSeconds` (TCP). The
lift is a different finish by the same comparison, a mark, a retraction, or the on-course stream
listing a finish. After a lift by the on-course stream the contradicted rows stay unpresented; only
rows carrying the new finish present (S1-20). In a second run, a time-empty row retracts the mark
in `status` too (recorded: a cleared second-run DNS, then the athlete raced), and an XML second-run
row with no time is the time-empty case, not a first-run retraction, since before run 2 every such
row already carries the combined placement with no time (S1-6, S1-7).

## Revision 4 — the stream withdraws a finish it alone stated; a retraction supersedes the `tcp` slot

INV-2d is for a finish presented from a results-table observation. A finish the on-course stream
alone has stated — `dtFinish` set, no row having recorded the generation (`ADR-013` Revision 4) —
is withdrawn by the next listing of the Attempt without it: `status` follows that listing
(`at-start` or `on-course`), the generation's finish and the `duration` inference are forgotten, no
diagnostic; in slalom and the Cross time trial alike, a Cross heat listing no finish (recorded:
cp3-cross WX1_XT_26:25, a time trial, a finish impulse with no start and no time, withdrawn four
minutes later, the athlete then `DNS`; `DERIVATIONS.md` §4.1; `CONTRACTS.md` §3.2). A listing with
`dtStart` and `dtFinish` empty is `at-start`, outside a Cross heat, whatever preceded it in the
generation — a start impulse deleted included; with `dtFinish` set and no start it is `finished`,
the case above — and displaces no table-presented `finished` or mark (`DERIVATIONS.md` §4.1;
`CONTRACTS.md` §3.2). An XML retraction that passes the guard supersedes the `tcp` observation it
retracts, which is no longer a candidate of its source; a TCP row restating the value afterwards is
a new observation and is presented (`DERIVATIONS.md` §4.12). Steps 1 and 2 of the re-baseline reach
the core as one ingest unit after the read has succeeded (`CONTRACTS.md` §4).

## Revision 5 — an absent XML row retracts; a wholly empty XML table does not

The maintainer's ruling (`RULINGS.md` R-4): an absent XML row retracts, under the content-age
guard; a wholly empty XML table retracts nothing and raises a diagnostic.

**Upstream behaviour.** Upstream rewrites the file whole from its current tables at every save:

| Operator action | In the next file |
|---|---|
| A result deleted (selected results, the re-run wizard); a DNS, DNF or DSQ set or cleared | The row stays. Its result fields are empty, or only its status changes |
| A competitor deleted; a competitor moved to another race or class; a bib changed | The row is gone from that race. A moved or re-bibbed competitor appears under the new race or bib |
| A start list generated again or redrawn | The race's rows are rebuilt, so there can be fewer or other rows (the same whole rewrite; this action itself was not traced, E4) |

No recording holds a removal.

**The rule** (`CONTRACTS.md` §4 INV-7; `DERIVATIONS.md` §0.3, §4.12):

1. **An absent row is a retraction, as on TCP.** For an Attempt whose presented result fields came
   from results-table observations, an XML snapshot of its race that carries at least one row and
   not this Attempt's retracts `outcome`, `gates` (in Kayak Cross `faults`), `placement`,
   `underReview`, `qualified` and any mark in `status`; in a paired second run also `pairTotal`
   and `countingRun`.
2. **The guard is decision 4's** (INV-2c). Against a `tcp` observation the retraction applies only
   when the snapshot's `changedAfter` is later than that observation's latest delivery; `null`, a
   first read, never qualifies. Otherwise the snapshot is ignored for that field and the next one
   settles it. The snapshot's own earlier `xml` observation is always superseded: the same source,
   later ingested.
3. **What is never retracted:** an on-course inference, `entry`, `bib`, `startOrder`, `heat`,
   `startLane`, `run`, and any field of an Attempt never present in a results-table observation.
   Whether the Attempt itself is removed is Revisions 6 and 7.
4. **A row that returns** after a retraction (the snapshot not admitted for a removal) is a new
   observation of upstream's table and is presented by the ordinary rules, as Revision 4 says of a
   TCP row after an XML retraction. After a removal the returning row creates a new Attempt
   (Revision 6 rule 5).
5. **A wholly empty table retracts nothing.** That is an XML snapshot naming a race in its
   schedule with no result row for it at all. A table whose rows are all blank is not this case:
   each blank row retracts as a present row. One read of the lagging source does not clear a whole
   race. A deliberate "delete all results" keeps the rows, blanked, and TCP pushes it at once in
   start-list mode, which retracts (decision 1). Where the race holds at least one result an
   absent row would have retracted (Revision 8), the core raises `xml-table-emptied`, an
   ingest-only diagnostic: it reaches the admin log, never `GET /api/diagnostics`, so no wire
   shape moves (`RULINGS.md` R-5). It is raised once per emptying. If the race was really emptied,
   the re-baseline (decision 8) is the remedy.
6. **Unchanged:** the three TCP forms; a classification Phase's emptied table, which keeps the
   last built Standing (`RULINGS.md` R-3); a race the file does not name, which is a snapshot of
   another race and states nothing (INV-1).

**Example.** Bib 11 has a result from a TCP push at 10:40:59 and is still in the on-course set,
so no snapshot is admitted for its removal (Revision 6 rule 2). The file saved at 10:41:35 lists
the race without bib 11; its `changedAfter` is 10:41:32. Bib 11's `outcome` and `placement` go
`not-yet`, pushed as any change. Had the same file been a first read (`changedAfter: null`),
nothing would move until the next save.

**What it costs.** A save that lands between the two halves of a move shows the result in neither
race for one save cycle. That is upstream's own table at that instant, like every half-correction.

## Revision 6 — an absent row removes the Attempt

The maintainer's ruling (`RULINGS.md` R-6): "A competitor removed upstream (deleted, moved or
re-bibbed) has their Attempt REMOVED", from an admitted XML snapshot under the content-age guard. A
moved competitor appears as a new Attempt in the other Phase. The bridge sends `DELETE` for it to
live. By Revision 5's table, the row is gone exactly for a competitor deleted, moved or re-bibbed
(and for a redrawn start list), and stays, blanked, for a deleted result or a mark, so an absent
row states that the Attempt no longer exists upstream.

**The rule** (`CONTRACTS.md` §2.6, §4 INV-7, §7.2, §8.3; `DERIVATIONS.md` §4.12, §10 item 38). The
ruling fixes the trigger and the guard; the rest are defaults taken inside it:
1. **The trigger is the race's results table in the snapshot**, start-list rows included: an
   Attempt is removed when no row of the race carries its bib (Revision 7 rule 1). The class's
   participants table carries the Entry, not the Attempt, and removes nothing. Only an Attempt a
   results-table row of its race has named is removed; one only the on-course stream has named is
   TCP's.
2. **The guard is decision 4's, over the whole Attempt.** The snapshot is admitted for the Attempt
   when its `changedAfter` is later than the latest delivery of every `tcp` observation of the
   Attempt, an on-course listing included; `null` never qualifies; and an Attempt in the on-course
   set is never removed. Where the snapshot is not admitted, Revision 5's per-field retraction
   applies as written, and a later snapshot settles the removal.
3. **TCP's absent row still retracts and never removes.** The ruling names the XML snapshot; the
   next save follows a removal within a save cycle.
4. **What the removal does.** The Attempt is gone from every read and every Standing (the
   Standings that held it are pushed whole where they changed). On site it is one
   `attempt.deleted { seq, attemptId }`, §8.4's shape, and no `attempt.updated` for that Attempt
   in the unit. A pending `WriteRequest` of it resolves `mismatched` without `confirmedValue`, as
   on a retraction, in the same unit, before the removal. Its checks and flags stay in the store
   and are not served while it does not exist (`CONTRACTS.md` §2.10). The Entry is not removed.
   The bridge sends `DELETE /ingest/v2/attempts/{phaseId}/{bib}`.
5. **A row that reappears** creates a new Attempt by the ordinary rule, `run` 1, carrying none of
   the removed one's result state (no generation, contradiction record or remembered mark); its
   checks and flags are the bib's and are served again (Revision 7 rule 4). A moved or re-bibbed
   competitor's new row creates its Attempt the same way, in the same unit as the old one's removal when one
   snapshot carries both.
6. **Unchanged:** a wholly empty table removes and retracts nothing (Revision 5 rule 5); a
   classification table holds no Attempts; a race the file does not name states nothing.

**Example.** Bib 11 of `K1M_BR1_6` holds a TCP result of 10:40:59 and is off course. The operator
moves the competitor to `K1M_BR1_7`. The file saved next, content age 10:41:32, lists `K1M_BR1_6`
without bib 11 and `K1M_BR1_7` with it. In that unit `K1M_BR1_6:11` is removed
(`attempt.deleted`, its Standings re-pushed) and `K1M_BR1_7:11` is created by its row.

**What it costs.** A save that lands between the two halves of an operator's move shows the
competitor in neither race for one save cycle, and the Attempt goes and comes back as a new one, so
a client shows it as new. A judge's check on a removed Attempt is not shown until the Attempt
returns. The guard can hold a removal back for one save cycle while TCP keeps listing the Attempt.

## Revision 7 — the bib is the key of a run's data

The maintainer's ruling (`RULINGS.md` R-2, R-7): "The data belongs to the bib. Timing is built on
start numbers, and the names are secondary. Times, penalties, and the fact that penalties were
checked are recorded against the bib, and that is also how they are collected on the course. If a
different name later appears under a bib, nothing is wrong, because the data stays bound to the
bib."

**The rule** (`CONTRACTS.md` §2.6, §2.10, §4 INV-7; `DERIVATIONS.md` §4.9, §4.12, §10 item 38):
1. **The trigger is the bib.** An Attempt is removed only when its bib leaves the race: no row of
   the race's results table in a snapshot admitted for the Attempt (Revision 6 rule 2) carries
   its bib. A row is the Attempt's by its bib, not by the competitor's `Id`.
2. **A re-bib or swap that leaves the bib in the race keeps the Attempt.** The row that carries
   the bib is the Attempt's row and is read by the present-row rules; its `Id` re-points `entry`
   (`CONTRACTS.md` §4 INV-4), and nothing else of the Attempt changes for that reason: not `run`,
   not a result field the row restates, not a check.
3. **A moved competitor:** the bib leaves race A, so A's Attempt is removed there (Revision 6);
   the row in race B creates B's Attempt by the ordinary rule, or re-points an Attempt B already
   holds under that bib. **A swap within a race:** both bibs stay, both Attempts stay, and their
   Entries swap. A swap done through an intermediate bib, one save at a time, removes and
   recreates the Attempt of each bib that one save leaves out (Revision 6 rule 5).
4. **Checks and flags stay the bib's.** They are keyed by the Attempt (Phase and bib) and served
   whenever that Attempt exists, whoever the competitor under the bib is, a recreated Attempt
   included (`CONTRACTS.md` §2.10; `DERIVATIONS.md` §10 item 38 default (g)).

**What it costs.** A judge's check made under one competitor is served under the next one the
bib carries; that is the ruling (the paper protocol is per bib as raced). Whether upstream lets
two rows of a race share a bib inside one save, or forces a swap through an intermediate bib, is
not established (E4); rules 2 and 3 cover both.

## Revision 8 — `xml-table-emptied` is raised under the content-age guard (a default)

Revision 5 rule 5 raises `xml-table-emptied` "where the race holds at least one result an absent
row would have retracted". Read with rule 2, that counts a result held from `tcp` only where the
guard would have admitted the retraction: the snapshot's `changedAfter` is later than the result's
latest delivery (`CONTRACTS.md` §4 INV-7; `DERIVATIONS.md` §4.12). So:
- a first read, whose `changedAfter` is `null`, raises nothing;
- a file written before the results it lacks raises nothing;
- the first later snapshot of the still-empty table that the guard admits raises it.

A result held from `xml` alone counts at once. The entry tells the operator that this file would
have cleared results; a file older than those results would not have cleared them, so it has
nothing to report. A default (`DERIVATIONS.md` §10 item 41 (c)): it reopens if an operator misses
an emptied table because every read of it was older than TCP's last delivery of the race.

*Example.* TCP pushes a race's results at 10:40:59. A file whose `changedAfter` is 10:40:55 names
the race with no row: nothing is retracted and nothing is logged. The next save, `changedAfter`
10:41:32, still has no row: `xml-table-emptied` is logged once.

## Revision 9 — a Phase that leaves the schedule is removed

The maintainer's ruling (`RULINGS.md` R-8): a race that disappears from Canoe123's schedule
(deleted, or its `RaceId` rebuilt after a `ClassId` rename) has its Phase removed, `phase.deleted`
for clients and `DELETE` to live through the bridge, only from an admitted XML snapshot under the
content-age check; an empty table does not count as a removal. It is Revision 6's reasoning one
level up: upstream rewrites the file whole at every save, so a race its schedule no longer names
no longer exists upstream. No recording holds a race leaving the schedule (E4).

**The rule** (`CONTRACTS.md` §2.4, §4 INV-7, §7.1, §7.2, §8.3, §8.4; `DERIVATIONS.md` §2.1,
§4.12, §10 item 54). The ruling fixes the trigger, the guard and the empty-table case; the rest
are defaults taken inside it, by analogy with Revisions 6 and 7:
1. **The trigger is the snapshot's schedule:** the races its `Schedule` table names, the
   staged-without-race placeholder and the pseudo-class `NA` excluded (`DERIVATIONS.md` §0.4). A
   Phase no schedule row of an admitted snapshot names is removed. The race's results table is
   not the trigger: a race the schedule names with no result row is an emptied table (Revision
   5 rule 5), not a removal.
2. **Only a Phase an XML snapshot's schedule has named is removed,** by any schedule statement,
   admitted or not (a first read's included). A Phase only TCP has named
   (its `Results`, `Schedule` or an on-course listing; no XML configured, or a file that lags) is
   TCP's, as an Attempt only the stream named is (Revision 6 rule 1). TCP's own `Schedule` never
   removes, as TCP's absent row never removes (Revision 6 rule 3).
3. **The guard is decision 4's, over the whole Phase.** The snapshot is admitted for the Phase
   when its `changedAfter` is later than the latest delivery of every `tcp` observation of the
   Phase or of any Attempt of it: a TCP `Schedule` naming it, a `Results` message of it, an
   on-course listing of one of its Attempts. `null` never qualifies, and a Phase one of whose
   Attempts is in the on-course set is never removed. Where the snapshot is not admitted, nothing
   of the Phase moves: a race the file does not name is a snapshot of another race for its
   Attempts and states nothing of them (INV-1); a later snapshot settles the removal.
4. **An empty schedule removes nothing.** A snapshot whose schedule names no race, a file that
   names no race included (`DERIVATIONS.md` §0.3, "valid and empty"), removes no Phase. Where the
   guard would have admitted the removal of at least one Phase, the core raises
   `xml-schedule-emptied`, ingest-only like `xml-table-emptied`: the admin log, never
   `GET /api/diagnostics`, once per emptying. If the event really was emptied, the operator
   starts a new event.
5. **What the removal does, in one unit.** A pending `WriteRequest` of any of its Attempts
   resolves `mismatched` without `confirmedValue`, before the removal (Revision 6 rule 4). Then
   the Phase is gone from every read, with every Attempt of it, its classification rows and the
   `decidedIn` kept for them, every diagnostic of it or of its Attempts, and every Standing whose
   scope names it: `phase`, `heat`, `classification`, a `pair` on either side, the whole class
   and every age category. On site that is **one `phase.deleted { phaseId }`**, the only message
   for the Phase, its Attempts and those Standings in the unit: no `attempt.deleted`, no
   `standing.updated`, no `check.updated` for them. Checks and flags stay in the store, keyed by
   `attemptId` (Revision 7 rule 4). The Class, its Entries and the Courses stay. To live the
   bridge sends `DELETE /ingest/v2/phases/{phaseId}`, and no `DELETE` per Attempt.
6. **What follows from it in the same unit.** A first run whose sibling was the removed Phase
   has its `pair` derived again (`DERIVATIONS.md` §10 item 49 (a)), `null` or another second run,
   sent as `phase.updated` after the `phase.deleted`. A second run whose presented sibling was
   the removed Phase presents `siblingPhaseId: null` from the removal, until a later statement
   names a first run, its `phase.updated` likewise after the `phase.deleted` in the same unit, so
   no message at a unit boundary names a removed Phase; its `pair` standing, whose scope named
   the removed Phase, went with the `phase.deleted` and is published again from its first entry
   once a first run is named.
7. **A Phase that returns** is created again, whole, by the ordinary rule: the first message for
   its id carries the whole resource, its `date` is the snapshot's (a new Phase, so INV-5's
   once-only date starts again), its Attempts are created by their rows, `run` 1, carrying none
   of the removed ones' result state, and the checks and flags of each returning `attemptId` are
   served again and pushed (`DERIVATIONS.md` §10 item 38 (g), (m)).
8. **The re-baseline.** Its read is a snapshot like any other, so its schedule removes under the
   same guard, which still counts every `tcp` delivery that named the Phase (step 1 discards
   result values, not identities; `DERIVATIONS.md` §10 item 38 (l)). An event re-baseline sends
   each `phase.deleted` before its `scope.replaced`, which carries none of the removed Phases'
   Attempts or Standings. A Phase re-baseline whose read removes its Phase sends the
   `phase.deleted` and no `scope.replaced`, and answers `200` with `attempts: 0`; a later
   re-baseline of that `phaseId` is `404 phase-not-found`.
9. **Unchanged:** `Phase.status` `cancelled` is upstream's status of a race that stays in the
   schedule, and nothing infers a removal from it or it from a removal; an Attempt's removal
   (Revisions 6 and 7) is unchanged for a Phase that stays.

**Example.** `K1M_BR1_6` and `K1M_BR2_6` are scheduled; the first run names the second as its
sibling. The operator deletes the second run. The next save, content age 09:10:00, later than
every TCP delivery naming `K1M_BR2_6`, schedules `K1M_BR1_6` alone. In that unit `K1M_BR2_6` is
removed (one `phase.deleted`, its Attempts and its `phase` and `pair` standings with it), and
`K1M_BR1_6` follows with a `phase.updated` whose `pair.siblingPhaseId` is `null`.

**What it costs.** One wire message on each tier and one live endpoint; client duties to remove a
Phase with what it holds. A file pointed at the wrong event, read while TCP is quiet, removes every
Phase TCP is not naming, as it would every Attempt (Revision 6); TCP's next mention recreates a
live race, and the operator's remedy is the right file. A rename shows the old Phase removed and
the rebuilt one created, which is what upstream did. The guard can hold a removal back while TCP
keeps naming the race; TCP's `Schedule` names every race of the event in each message in every
recording, so a race deleted upstream is expected to drop out of it at once, which is not recorded (E4; `DERIVATIONS.md` §10 item 54 reopens on it).
