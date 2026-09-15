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
