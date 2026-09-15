# ADR-001: A domain entity spine — Organiser, Event, Category, Phase, Entry, Attempt

## Context

Today's system has no entity between "the whole event" and "a row on the wire." Canoe123's `Race`
concept (`RaceId`, e.g. `K1M_ST_BR2_6`) already conflates two different sport-domain things: which
class is racing (K1M) and which scored round this is (its second run). Every client that needs
either piece separately re-derives it by parsing the string (`EVIDENCE.md` Exhibit 8) — including,
in one case, generating a Czech display string from a regex match on the same id. On-course state is
keyed by `bib` alone, which collides the moment two attempts with the same bib coexist — impossible
in ordinary slalom (one competitor on course at a time), guaranteed in Kayak Cross (four at once,
same Phase) and structurally exposed the moment two categories overlap.

Three incompatible notions of "is this the same event" coexist (`EVIDENCE.md` Exhibit 7): a TCP
schedule fingerprint, an XML schedule fingerprint, and a checks-persistence fingerprint, agreeing
with none of the others, one of them accepting a 50%-fuzzy match.

## Options considered

**A — Keep `Race` as the unit; add category/run as derived sub-fields, computed once, centrally,
instead of per-client.** Genuinely reduces Exhibit 8's duplication. Rejected as insufficient: it
still leaves no entity for "a competitor's participation in one round" — the thing that actually has
a lifecycle, a start, a finish, gate penalties — so on-course collisions and Exhibit 1's whole-object
replace bug have nowhere better to attach than before.

**B — A spine of `Organiser → Event → Category → Phase → Entry → Attempt`.** Chosen. `Category` and
`Phase` split what `RaceId` conflates; `Attempt` is the missing unit with a lifecycle; `Entry` gives
a competitor a stable identity across the phases of one category, backed by Canoe123's own `Id`
field (confirmed stable across BR1/BR2 by direct example; inferred, not confirmed, across QUA/SEM/FIN
— `CONTRACTS.md` §2.5).

**C — Model directly on a generic sports-timing ontology** (Round, Heat, Bracket, borrowed from
outside canoe slalom). Rejected: nothing about this system's actual data justifies it, and the brief
is explicit that generic architectural prose — true of every system, therefore useful for none — is
not wanted. The spine chosen is built entirely from what §1–§9 of `DOMAIN-FACTS.md` actually
describes, not from an imported abstraction.

## Decision

B. `Category`, `Phase`, `Entry`, `Attempt` as defined in `CONTRACTS.md` §2.

## Why

Every one of `EVIDENCE.md`'s ten exhibits traces to an identity or entity that today has no single,
owned definition. Exhibits 7 and 8 are this directly; Exhibit 1's on-course collision and
whole-object-replace bug are symptoms of `Attempt` not existing as a keyed entity at all.

## What it costs

A real modelling investment before a line of server code changes — `CONTRACTS.md` §2 is that cost,
paid once, here, rather than five times, once per component, as has happened so far.
`Attempt.attemptId = (phaseId, bib)` rather than `(phaseId, entryId)` — settled only after the
maintainer's answer that entry↔attempt bindings are retroactively correctable (§ maintainer answer
A7) — costs one extra level of indirection (`Attempt.entry` is `Observed`, not a plain foreign key)
that would not have been obvious from the audit alone.

## What it forecloses

Nothing structural. `Phase.roundKind` is deliberately open-ended (`CONTRACTS.md` §2.4) rather than a
hard enum, so a round type this design has never seen does not require a spine change, only a new
value — the property Kayak Cross was used to test (`BRIEF.md` §5.5, walked through in
`ARCHITECTURE.md` Scenario D).
