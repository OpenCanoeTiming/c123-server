# ADR-009: Finish detection is a per-discipline strategy; Kayak Cross's outcome is asserted, not inferred

## Context

`CONSTRAINTS.md` §1.5 makes Kayak Cross a firm requirement, not a thought experiment: both live
results and the scoreboard must work for a Cross race next season. `DOMAIN-FACTS.md` §8 frames the
gap as "finish detection via `dtFinish` fails because the field doesn't exist," which reads as though
a substitute signal simply needs finding. A scout check against a real recorded Cross heat found this
understates the problem: `chStart`, `chFinish`, `dtStart`, `dtFinish`, and `Completed` never
transition per-competitor for Cross at all; OnCourse clears for the whole heat together, well after
the fact, not per competitor. The one channel that does carry a per-competitor finish signal is the
`Results` stream's `Rank`/`Time` field becoming non-empty — and the maintainer was explicit, after
round one, that this is not a signal we detect: it is an operator's own assertion, entered after
conferring with the finish judge, at human pace, carrying a real deadline (published before the next
heat starts, because afterwards there is nowhere prominent left to show it).

## Options considered

**A — Synthesise a finish proxy from an existing OnCourse field**, such as the `Gates` string filling
to all checkpoints. Rejected: the scout confirmed this is a checkpoint-progress signal only, not
authoritative — treating it as a finish assertion risks declaring a competitor finished (or
implicitly ranked) on evidence that is neither the operator's own word nor an event Canoe123 itself
asserts, exactly the kind of quiet guess this whole redesign exists to remove from a fact as
consequential as who won.

**B — Treat Cross as out of scope for the `Attempt.status`/`outcome` model entirely**, modelling it
through a separate mechanism. Rejected: it fails `BRIEF.md` §5.5's actual test — "does the domain
model need structural change, or only new values" — by manufacturing a structural change where the
existing entity model, examined properly, does not need one.

**C — Model finish-detection as an explicit, per-discipline strategy from the start: slalom uses the
existing `dtFinish`-transition signal chain; Cross uses the `Results`-stream operator assertion, with
`source: 'operator-assertion'`, `confidence: authoritative`, pushed the instant it's ingested, no
batching.** Chosen (`CONTRACTS.md` §2.6, `ARCHITECTURE.md` Scenario D).

## Decision

C.

## Why

This is the one piece of real structural foresight Cross demands, and it is foresight grounded in a
checked fact, not a guess: a per-discipline finish strategy has to exist as a first-class concept in
the domain layer *before* Cross is implemented, because retrofitting it onto a slalom-only detector
later would mean rewriting the one piece of logic every other exhibit-fix depends on being singular
(`DECISIONS/ADR-002`). Everything else Cross needs — `Outcome`'s `ordinal` variant, `Attempt` keyed
plural per Phase, `Category.discipline` — was already general enough without a Cross-specific change.

## What it costs

Two named finish strategies from day one instead of one with an exception bolted on later — a small
amount of upfront design, entirely justified by checked evidence rather than anticipated need.

## What it forecloses

A future third discipline needing its own finish rule does not require changing the *interface* —
only registering a new strategy against a new `discipline` value. It also forecloses any
implementation from ever treating Cross's `Gates`-fill progress as authoritative for anything beyond
optional, explicitly-non-authoritative presentation (a "checkpoint progress" indicator, if a client
chooses to show one) — it must never drive `Attempt.status` or `outcome`.

## Addendum — completing the Cross model (2026-09-24)

This ADR made `/api/oncourse` plural so it could hold four competitors at once. That was necessary
but not sufficient. The consolidated revision adds the rest:
- **`Attempt.courseOrder`**, from upstream's on-course position. Without it the four competitors in a
  heat cannot be ordered; in Cross nothing else distinguishes them.
- **`Attempt.heat` and `startLane`.** One Cross race holds several heats, and each heat's order
  restarts at 1 (`ADR-014`).
- **The ordinal is upstream's placement, never `Time`.** Athletes with faults rank after clean
  finishers whatever their finish order, and the heat order restarts in every heat. So neither form
  of dividing `Time` is right: TCP already formats the order as `1.00`, and the snapshot stores it in
  milliseconds (E1).

The operator-assertion framing above is unchanged as semantics: it is the operator's entry that
populates the placement in the result push. As a **source tag** it is withdrawn. The assertion reaches
us as ordinary result rows, on TCP and in the snapshot, and it must be merged by the same rules as
every other result row. A separate tag outside the merge rules let a stale snapshot row displace a
fresher TCP push of a corrected order.
