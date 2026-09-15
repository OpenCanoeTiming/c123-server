# ADR-007: The on-site contract stays Canoe123-shaped; the live contract does not

## Context

`BRIEF.md` §5.7 asks explicitly: the on-site contract serves clients that exist to display *this*
timing system, while the live contract was meant to outlive it — note the asymmetry, and decide
whether it is right.

## Options considered

**A — Make the on-site contract vendor-neutral too**, abstracting `Phase.roundKind` and gate
encodings the way the live contract does. Rejected: `CONSTRAINTS.md` §1.1 fixes Canoe123 as the sole
on-site upstream for this ecosystem's deployments, with no design permitted to assume otherwise. An
on-site vendor-neutral abstraction would be built against a second on-site protocol that has never
been seen and is not asked for — precisely the "designing around a change nobody has agreed to" the
brief warns against (`BRIEF.md` §1), and it would cost `c123-scoreboard`/`c123-penalty-check` real
implementation complexity (an abstraction layer with exactly one real instance behind it) for a
benefit nobody has requested.

**B — Make the live contract Canoe123-shaped too**, matching the on-site one for consistency.
Rejected: this is the system's actual current state (`CURRENT-STATE.md`: live-mini's ingest is "a
Canoe123-shaped pipe... down to pushing the raw XML file") and is named directly as the problem
`BRIEF.md` §5.7 commissions a fix for. It also actively conflicts with `CONSTRAINTS.md` §1.7/§1.8: a
shared cloud tier across independent organisers, with adoption by other paddling communities
considered likely, cannot remain shaped around one on-site vendor's wire format.

**C — Keep the asymmetry: on-site contract uses Canoe123-native tokens (`roundKind`, `phaseId` =
`RaceId`); live contract uses vendor-neutral structural flags (`multiRun`, `scoringKind`) instead.**
Chosen (`CONTRACTS.md` §7, §8.3).

## Decision

C.

## Why

The two contracts serve genuinely different futures. On-site's future is fixed by `CONSTRAINTS.md`
§1.1 — Canoe123, permanently, for this ecosystem. The live contract's future is open by design
(§1.8's unknown adopters, the maintainer's own stated ambition in `DECISIONS/ADR-006`). Designing both
identically would either over-abstract the one that doesn't need it or under-abstract the one that
does.

## What it costs — stated plainly, not left implicit

**A third-party organiser running different timing software could build a bridge to the public live
tier and get a working calendar entry, live results, and a spectator page — but could not reuse
`c123-scoreboard` or `c123-penalty-check` at their venue.** Those two components speak a contract
intentionally shaped around what Canoe123 emits: `roundKind` tokens, gate encodings whose position-
correctness is derived from Canoe123's own two wire formats, write commands (`PenaltyCorrection`)
that are Canoe123's own terminal protocol. An adopter with different on-site hardware gets the public
half of this ecosystem for free and has to build their own venue-side software for the other half.

This is judged the right trade, not an oversight: building venue-side software against a protocol
this project has never seen would be speculative in exactly the way the brief prohibits, and the
actual, firm requirement in scope (`CONSTRAINTS.md` §1.5, Kayak Cross) is satisfied without it.

## What it forecloses

On-site vendor-neutrality is not ruled out forever — only undesigned now, for lack of a second real
protocol to design against. If a second on-site timing system's protocol becomes a real, specified
target in the future, that is a new engagement with real material to work from, not a speculative
extension of this one.
