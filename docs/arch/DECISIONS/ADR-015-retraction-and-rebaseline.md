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

The evidence, all E1 from recordings and the decompiled source (behaviour only):
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
