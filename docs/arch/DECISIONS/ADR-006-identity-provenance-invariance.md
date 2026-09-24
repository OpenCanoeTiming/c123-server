# ADR-006: Identity provenance invariance in the live ingest contract

## Context

The maintainer, after round one, was explicit about something not otherwise recoverable from the
audit: he wants the live ingest contract's *shape* to remain unchanged if a central calendar,
athlete registry, and per-event timekeeper-key system are ever built — while being equally explicit
that **no such integration should be designed now.** It does not exist; the federation's own analysis
has not settled the question that would shape it (whether results are entered by the organiser
locally or centrally); designing against it would be, in his words, divination.

What he wants instead is a principle applied to what already exists: today, the on-site bridge mints
its own event id and self-issues its own API key; tomorrow, in the world he describes, a central
authority would issue both, and entry identity might originate in a registry rather than in the
timing system. He names the risk directly: **today Canoe123 is the source of truth for who is
racing; in that future world, entries would flow the other way, from the registry into the timing
system.** A design that builds its spine on "the timing system knows who is competing" in a way that
requires replacing that assumption if the direction reverses pays for the reversal twice.

## Options considered

**A — Wait and redesign the ingest contract later, once a registry exists.** Rejected: this is
exactly the second breaking change the live contract's own stated ambition — to outlive Canoe123
(`BRIEF.md` §5.7) — exists to avoid. Building it Canoe123-shaped now and fixing it later is the same
mistake the current live ingest contract already made once.

**B — Design a speculative integration now** — guess at the registry's API, build a client for it,
shape `Entry`/`Event` around assumptions about how it will authenticate or what it will call things.
Rejected on the maintainer's own explicit instruction: the federation's analysis is unresolved on the
one question (who enters results) that would determine this shape, so any guess here is pure
invention with nothing to check it against.

**C — Make the ingest contract's identity fields opaque and provenance-neutral now, without building
anything for a registry that doesn't exist.** Chosen.

## Decision

`eventId` and `entryId` (`CONTRACTS.md` §1.1, §8.2) are opaque strings to the ingest contract. Today,
both are minted by the on-site bridge — it self-issues its own API key at event creation and derives
`entryId` from Canoe123's `Id` field. Nothing in any request or resource shape in `CONTRACTS.md` §8
encodes that provenance. Only authorisation — the credential resolving to an `(organiserId, eventId)`
pair — is a hard structural requirement; how the identifiers inside that scope came to exist is not.

## Why

This sits directly on top of the tenancy model already required for other reasons
(`CONSTRAINTS.md` §1.7, `DECISIONS/ADR-005`): the API key already resolves an event, deliberately,
today. Making the invariance deliberate rather than incidental means the one thing that would need to
change, if a registry is ever built, is *who calls the endpoint and where the opaque string
originally came from* — never the endpoint's shape, never what `entryId` means to a consumer of this
contract.

## What it costs today

Nothing measurable: the bridge already mints both ids itself; this ADR asks it to keep doing exactly
that, under a contract that doesn't name the fact. The only real cost is discipline — nowhere in
`CONTRACTS.md` §8 may a field's *meaning* be defined in terms of "comes from the timing system,"
even though today, in practice, it always does.

## What it buys

Avoiding a second breaking redesign of the live contract specifically for the reason the current one
needed this engagement in the first place: its shape drifted to match one upstream's artefacts
(`BRIEF.md` §5.7). If a registry is built later, adapting to it is additive — a new provenance for
the same opaque field — not a second contract-shape migration across every consumer.

## What it forecloses

Building any bridge-side migration tooling for a registry that does not exist — correctly, per the
maintainer's instruction. It also forecloses the on-site contract (`CONTRACTS.md` §7) from this same
constraint: on-site, Canoe123 is the sole upstream by fixed topology (`CONSTRAINTS.md` §1.1), and
that is not expected to reverse, so on-site identity is free to be Canoe123-derived in both meaning
and mechanism. The invariance is scoped to the live contract, where the maintainer's stated future
actually bears.

## Revision — `ICFId`, not `entryId`, is the field a registry would bind to

This ADR's Decision treats `entryId` as opaque and provenance-neutral, with the implicit picture that
a future registry would eventually issue *that* field. An exhaustive analysis of Canoe123's `Id`
composition (`DECISIONS/ADR-001`'s Revision) shows this picture was never quite right: `entryId`,
derived from `Id`, embeds the class token of the event it was minted in — the same athlete is a
different `Id` at an event that structures categories differently. It identifies a competitor
*within one event*, not a person. A future registry, whose entire purpose is identifying a person
*across* events, could not sensibly bind to it.

**`ICFId` is the field it would bind to** — the maintainer's own scoping, given directly: "as external
identity, definitely `ICFId` — but that only matters for live and for sending results out." `ICFId` is
frozen at registration (a crew substitution can leave it disagreeing with who actually raced —
`CONTRACTS.md` §2.5's own note on this) and, per the same analysis, is absent for 14 of 1,483 real
entries (forerunners, proxies) with no external identity to have. It is carried on `Entry` alongside
`entryId`, required on the live ingest contract specifically (`CONTRACTS.md` §8.3), and never derived
by parsing `entryId` — consistent with `ADR-001`'s revision, not in tension with it.

**This strengthens the invariance argument rather than weakening it.** The original argument was that
an opaque `entryId` lets a future registry attach without a second contract-shape migration. Naming
`ICFId` specifically as the seam a registry would actually use makes that concrete rather than
aspirational: the field to watch for a future binding is not a hypothetical "whichever id `Entry`
happens to have," it is the one already carried for exactly this purpose, today, for a different
reason (cross-event reporting). Nothing about `entryId`'s own opacity changes for this to hold.

**Cost:** none — `ICFId` was already going to be carried once the live contract needed cross-event
identity for its own sake (§8.3); this revision only names it as the same field a registry would
later use, rather than leaving that connection to be rediscovered.
