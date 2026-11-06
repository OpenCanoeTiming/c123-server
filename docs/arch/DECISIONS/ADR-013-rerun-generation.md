# ADR-013: A re-run starts a new run generation; the earlier run is retracted explicitly

## Context

Canoe123 lets the operator put a bib back on course in a race where it already has a result. It
flags this with a localised "overwriting results" warning on the on-course row. This is observed
upstream behaviour (E1, source). The maintainer's answer describes what follows. A re-run deletes the
recorded result, and the run is raced again. Until the re-run finishes, it looks as if the athlete
never did that run. The display must not keep showing the old result.

The contract as written could not express this:
- §3.2 forbade `finished → on-course`;
- INV-1 forbids a known value from regressing to `not-yet`;
- `WriteRequest` and `VerificationState`, both keyed on `(phaseId, bib)`, would silently attach to a
  run that no longer counts.

## Options considered

**A — Keep showing the old result until the re-run finishes.** Rejected by the maintainer.

**B — A new `attemptId` per physical run.** Rejected. Canoe123 keeps exactly one result per race and
bib, and the re-run's result replaces the earlier one. Two Attempts for one scored participation
would misrepresent the upstream record, and every reference to the first `attemptId` would be
orphaned.

**C — One Attempt, with an explicit run generation.** Chosen.

## Decision

C.

- `Attempt.run` is an `Observed<number>`. It starts at 1.
- **A new generation begins only on explicit upstream evidence** that the recorded run is being
  replaced:
  - (a) an on-course observation of this bib in this phase, carrying a start time that is not the
    current generation's start; or
  - (b) the results-table row for this Attempt observed cleared, meaning time, total and mark all
    empty, after the Attempt had been known.
- **On a new generation**, every run-scoped field becomes `not-yet`, explicitly and pushed, unless the
  triggering observation itself carries it (for example `status: 'on-course'`). The run-scoped fields
  are:
  - `status`, `outcome`, `gates` and `splits`;
  - `placement`, `pairTotal` and `countingRun`;
  - `underReview`, `qualified` and `faults`;
  - `courseOrder` and `timeToBeat`.
- **Bindings survive a new generation:** `entry`, `bib`, `startOrder`, `heat`, `startLane`.
- **Observations are attributed to a generation.** A results-table observation whose finish time
  precedes the current generation's start describes an earlier run. It is retained as history and
  never presented. INV-2c already protects this boundary, because a re-run's finish is later than
  the run it replaces.
- **INV-1 is amended, not weakened.** Monotonic knowledge holds within a generation. A generation
  change is the only regression the contract admits. It is itself an explicit, observed transition,
  never an inference from something a message leaves out.
- **Status.** §3.2 gains one transition: from `finished` or any no-result status to `at-start` or
  `on-course`, permitted only together with a generation increment.
- **Writes and checks are scoped to a generation.**
  - A `WriteRequest` still `pending` when its generation is superseded resolves to `superseded`
    (`ADR-010`, Revision).
  - `VerificationState` is keyed on `(attemptId, run, gate)`. A judge's check of an earlier run's
    penalty is never carried over to the re-run.

## What it costs

One field and one transition. It also costs one rule an implementation must follow exactly:
generation attribution. Conformance vectors cover it.

## What it forecloses

A second Attempt for the same race and bib. It also forecloses showing a retracted result: a client
that wants to show "re-run in progress" reads `run > 1` together with the current status.

## Open

It is unconfirmed (E4) whether Canoe123 clears the results row at the moment the bib is staged, or
only when the re-run finishes. The rule works either way:
- (b) fires at clearing;
- (a) fires at the new start.

An operator who stages a finished bib and removes it again without starting it triggers neither
condition, unless Canoe123 cleared the row. In that case the contract shows what Canoe123 itself
then holds.

## Revision — retraction and generation are separate (2026-09-24)

Trigger (b) above, "the results-table row observed cleared", is not a generation change. It is a
**retraction** (`ADR-015`): the result is gone, the run may or may not be raced again, and the
Attempt returns to `not-started` or to whatever the on-course stream currently shows. A generation
increments only on trigger (a): a start observed for this bib that is not the current generation's
start. A re-run therefore appears as a retraction (often invisible on TCP, since the re-run wizard
pushes nothing) followed by a new start. A finish taken away from an athlete who is still running is
neither: the on-course stream shows the same start with no finish, and `ADR-015`'s contradiction
rule applies, within the same generation. `VerificationState` and pending `WriteRequest`s are still
scoped to the generation and untouched by a retraction.

## Revision 2 — the replaced run is kept out by attribution alone (2026-10-14)

The Decision says "INV-2c already protects this boundary, because a re-run's finish is later than the
run it replaces." INV-2c no longer compares event times (`ADR-003` Revision 5), so that sentence is
superseded. The boundary rests on the attribution rule stated beside it: a results-table observation
whose finish precedes the current generation's start describes the replaced run, is retained as
history and is never presented (`DERIVATIONS.md` §4.11). A replaced run's row that carries no finish —
a mark — is covered by the stale-mark rule (`CONTRACTS.md` §2.6; `DERIVATIONS.md` §4.12). Vector
`rerun-old-generation-row-not-presented` already tests attribution, not INV-2c.

## Revision 3 — attribution per source: a TCP row has no finish time (2026-10-14)

0 of 667,388 recorded TCP `Results` rows carry a finish time (`ADR-017` D1). Revision 2 rested the
replaced-run boundary on "a row whose finish precedes the new generation's start", which only an XML
row can satisfy. A TCP row is now attributed by run time: within a generation that began with an
observed new start, it is the current generation's only once that generation's finish has been seen on
the on-course stream and the row's `Time` equals the on-course `Time` at that finish; until then a TCP
row carrying a time describes the replaced run and is never presented; a mark-only row follows the
stale-mark rule. With the re-run wizard (the normal path) the question rarely arises; without it, the
old row stays in every push until the new finish and would otherwise have been presented as the
running athlete's result. `DERIVATIONS.md` §4.11 carries the rule; vector
`rerun-tcp-row-before-new-finish-not-presented`.

## Revision 4 — a changed start is the trigger only with no finish and a recorded generation (2026-11-06)

The merge core's first sweep over all seven recordings (round 19) found seven listings that changed
an Attempt's `dtStart`; one was the re-run of Revision 3's recorded episode (nkz-19so C1M_BR1_19:7).
The other six were corrections of a start impulse inside the same run: three mid-run before any
finish, one a false start deleted and given again, and three after the finish, where the listing
carried the same `dtFinish` with a new `Time` and the row with the new time had been pushed
0.1–0.2 s earlier. Trigger (a), "a start time that is not the current generation's start",
incremented on all seven, wiped the row just pushed and reset writes and checks for a run that was
never re-raced. The trigger now reads: a listing with a start different from the generation's
recorded start **and no finish, while the generation is recorded** — the stream listed a finish for
its start, or a results-table row with a time or a mark was attributed to it, a later retraction
notwithstanding. Every other change of the listed start is a start correction inside the generation:
the recorded start follows the listing, nothing presented changes at the listing, the moved time
arrives as the next row (`CONTRACTS.md` §4 INV-2c, same source). The one case the stream cannot
decide, a re-run begun and finished inside a TCP outage, reads as a correction by default
(`DERIVATIONS.md` §10 item 23). `CONTRACTS.md` §2.6 and `DERIVATIONS.md` §4.11 carry the rule and
the seven cases; `TEST-ARCHITECTURE.md` property 10 reads it from the raw stream.
