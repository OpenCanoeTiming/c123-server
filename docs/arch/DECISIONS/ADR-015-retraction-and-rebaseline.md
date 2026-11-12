# ADR-015: Retraction is first-class — scope snapshots, contradiction by the on-course stream, and the operator re-baseline

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
4. **An XML retraction is guarded by write time.** The XML lags TCP by up to a save cycle, so a
   snapshot written before a result push must not retract it. An XML retraction, and the mark
   exception of INV-2 rule 2, apply only when the rewrite was detected more than one poll interval
   after the TCP observation they would displace. Otherwise the snapshot is ignored for that field,
   and the next snapshot settles it.
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

## Revision — the write-time guard is INV-2c (2026-10-14)

The guard this ADR introduced for XML retractions and for rule 2's mark exception — the snapshot's
`lastRewriteDetectedAt` minus the poll interval must be later than the `tcp` observation's
`observedAt` — turned out to be the general rule for any cross-source supersession, and INV-2c now
states it as such (`ADR-003` Revision 5). Nothing changes for retraction except the name. One
residual this ADR left open is closed by it: a snapshot rewrite that happened in the seconds before a
TCP disconnect no longer takes over during the outage (`DERIVATIONS.md` §10 item 8).

## Revision 2 — contradiction matched by finish or run time; the lift keeps contradicted rows unpresented (2026-10-14)

INV-2d held back "rows whose finish time equals the contradicted one". A TCP row has no finish time
(`ADR-017` D1), and in both contradictions the spike replayed no on-course finish preceded the false
row either, so the contradicted finish itself had no time. The record is now
`{ finishTime: Timestamp | null; runSeconds }`; a retained row carries the contradicted finish when its
`dtFinish` equals `finishTime` (XML) or, having none, its `Time` equals `runSeconds` (TCP); the lift
is a different finish by the same comparison, a mark, a retraction, or the on-course stream listing a
finish. After a lift by the on-course stream the contradicted rows stay unpresented; only rows carrying
the new finish present (S1-20). The second-run retraction cases are completed: a time-empty row
retracts the mark in `status` too (recorded: a cleared second-run DNS, then the athlete raced), and an
XML second-run row with no time is the time-empty case, not a first-run retraction, since before run 2
every such row already carries the combined placement with no time (S1-6, S1-7).

## Revision 3 — the guard reads `changedAfter` (2026-11-05, second pass 2026-11-06)

Decision 4 and the first revision state the guard as "detected more than one poll interval after"
and "`lastRewriteDetectedAt` minus the poll interval". Since round 18 the content age is the
reader's `changedAfter` (`ADR-003` Revision 6; `CONTRACTS.md` §4 INV-2c), `null` on a first read,
which never qualifies. The re-baseline's own read (decision 8, step 2) carries the same stamp.
An absent XML row and an XML table with no rows are not retractions (INV-7, XML bullet); TCP's
absent row and start-list table remain so. (That sentence was the round-18 default; Revision 5
replaces it.)

## Revision 4 — the stream withdraws a finish it alone stated; a retraction supersedes the `tcp` slot (2026-11-06)

INV-2d is for a finish presented from a results-table observation. A finish the on-course stream
alone has stated — `dtFinish` set, no row having recorded the generation (`ADR-013` Revision 4) —
is withdrawn by the next listing of the Attempt without it: `status` follows that listing
(`at-start` or `on-course`), the generation's finish and the `duration` inference are forgotten, no
diagnostic; in slalom and the Cross time trial alike, a Cross heat listing no finish (recorded:
cp3-cross WX1_XT_26:25, a time trial, a finish impulse with no start and no time, withdrawn four
minutes later, the athlete then `DNS`; `DERIVATIONS.md` §4.1; `CONTRACTS.md` §3.2). A listing with
`dtStart` and `dtFinish` empty is `at-start`, outside a Cross heat, whatever preceded it in the
generation — a start impulse deleted included, recorded twice; with `dtFinish` set and no start it
is `finished`, the case above, recorded once — and displaces no table-presented `finished` or mark
(`DERIVATIONS.md` §4.1; `CONTRACTS.md` §3.2, second and third pass). An XML
retraction that passes the guard supersedes the `tcp` observation it retracts, which is no longer a
candidate of its source; a TCP row restating the value afterwards is a new observation and is
presented (`DERIVATIONS.md` §4.12). Steps 1 and 2 of the re-baseline reach the core as one ingest
unit after the read has succeeded (`CONTRACTS.md` §4).

## Revision 5 — an absent XML row retracts again; a wholly empty XML table does not (decided 2026-11-11, written 2026-11-12)

**Decision (maintainer, 2026-11-11; replaces the last sentence of Revision 3):** "an absent XML row
retracts again, under the existing content-age guard; a wholly empty XML table retracts nothing and
raises a diagnostic."

**Why.** Revision 3's sentence rested on "rows are never deleted from the file; a cleared result
shows as fields going empty". That is true of half the corrections. Upstream rewrites the file
whole from its current tables at every save (observed upstream behaviour):

| Operator action | In the next file |
|---|---|
| A result deleted (selected results, the re-run wizard); a DNS, DNF or DSQ set or cleared | The row stays. Its result fields are empty, or only its status changes |
| A competitor deleted; a competitor moved to another race or class; a bib changed | The row is gone from that race. A moved or re-bibbed competitor appears under the new race or bib |
| A start list generated again or redrawn | The race's rows are rebuilt, so there can be fewer or other rows (the same whole rewrite; this action itself was not traced, E4) |

No recording holds a removal, so nothing recorded shows either way. Under Revision 3 a removed
competitor's result stood in every XML-fed value until an operator re-baseline.

**The rule** (`CONTRACTS.md` §4 INV-7; `DERIVATIONS.md` §0.3, §4.12):

1. **An absent row is a retraction, as on TCP.** For an Attempt whose presented result fields came
   from results-table observations, an XML snapshot of its race that carries at least one row and
   not this Attempt's retracts `outcome`, `gates` (in Kayak Cross `faults`), `placement`,
   `underReview`, `qualified` and any mark in `status`; in a paired second run also `pairTotal`
   and `countingRun`.
2. **The guard is decision 4's, unchanged** (INV-2c). Against a `tcp` observation the retraction
   applies only when the snapshot's `changedAfter` is later than that observation's latest
   delivery; `null`, a first read, never qualifies. Otherwise the snapshot is ignored for that
   field and the next one settles it. The snapshot's own earlier `xml` observation is always
   superseded: the same source, later ingested.
3. **What is never retracted stays so:** an on-course inference, `entry`, `bib`, `startOrder`,
   `heat`, `startLane`, `run`, and any field of an Attempt never present in a results-table
   observation. The Attempt itself is not removed.
4. **A row that returns** is a new observation of upstream's table and is presented by the
   ordinary rules, as Revision 4 says of a TCP row after an XML retraction.
5. **A wholly empty table retracts nothing.** That is an XML snapshot naming a race in its
   schedule with no result row for it at all. A table whose rows are all blank is not this case:
   each blank row retracts as a present row. One read of the lagging source does not clear a whole
   race. A deliberate "delete all results" keeps the rows, blanked, and TCP pushes it at once in
   start-list mode, which retracts (decision 1). Where the race holds at least one result an
   absent row would have retracted, the core raises `xml-table-emptied`, an ingest-only
   diagnostic: it reaches the admin log, never `GET /api/diagnostics`, so no wire shape moves. It
   is raised once per emptying. If the race was really emptied, the re-baseline (decision 8) is
   the remedy.
6. **Unchanged:** the three TCP forms; a classification Phase's emptied table, which keeps the
   last built Standing (maintainer, 2026-11-06); a race the file does not name, which is a
   snapshot of another race and states nothing (INV-1).

**Example.** Bib 11 has a result from a TCP push at 10:40:59. The operator deletes the competitor.
The file saved at 10:41:35 lists the race without bib 11; its `changedAfter` is 10:41:32. Bib 11's
`outcome` and `placement` go `not-yet` and its `status` `not-started`, pushed as any change. Had
the same file been a first read (`changedAfter: null`), nothing would move until the next save.

**What it costs.**
- A save that lands between the two halves of a move shows the result in neither race for one
  save cycle. That is upstream's own table at that instant, like every half-correction.
- A competitor deleted upstream stays on our start list as a `not-started` Attempt, on site and on
  live. Whether a removal should remove the Attempt is the open maintainer question recorded in
  `CLIENT-OBLIGATIONS.md`, "Gaps and conflicts".
- The level of `xml-table-emptied` is a default: the admin log. Making it a wire `Diagnostic`,
  visible in the admin UI, is a contract-package change (`DERIVATIONS.md` §10 item 26).

**Vectors.** `inv2c-first-read-unknown-age-refused` pinned Revision 3's sentence in its last step;
its expected outcome for the absent row is now `not-yet`. Four vectors are added:
`retraction-xml-absent-row`, `retraction-xml-absent-row-guard`,
`retraction-xml-absent-row-then-returns` and `retraction-xml-empty-table-retracts-nothing`. The
core follows in the M2 server batch; until then the changed vector and the first three new ones
are on the expected-red ledger (`CONFORMANCE-VECTORS.md` §2). The fourth passes today.
