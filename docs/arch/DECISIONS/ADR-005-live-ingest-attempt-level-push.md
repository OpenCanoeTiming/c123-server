# ADR-005: The live ingest contract pushes Attempts, not files; tenancy is a public calendar

## Context

The live tier's ingest contract was meant to be a generalised interface any canoe timing software
could push results into. It has drifted into pushing the raw Canoe123 XML file as the unit of
transfer — the whole Saturday file goes up while Sunday's race runs, and separating the two days
today requires creating two separate events on a service that, per `CONSTRAINTS.md` §1.7, is shared
across every organiser using this ecosystem, not just one. `EVIDENCE.md` Exhibit 9 shows the
consequence downstream: fields sent and ignored, a whole `gates` ingest branch that nothing ever
populates, ranking recomputed independently rather than relayed.

## Options considered

**A — Keep file-level push, add day-separation metadata to the file envelope.** Reduces the
`BRIEF.md` §5.7 symptom without removing its cause: the unit of transfer stays an artefact of
Canoe123's own export shape (`c123-xml-tools`' domain, not ours to redesign) rather than a decision
made about what the *contract* should carry.

**B — Category-level push (one message per category's current standing).** Closer, but still
coarser than what `CONTRACTS.md` §2.6 needs: a single Attempt correction (Scenario B, or a
maintainer-described week-later dispute) would have to be expressed as "resend the whole category,"
which reintroduces whole-object replace at the network boundary — exactly what ADR-003 removes at
the domain layer.

**C — Attempt-level push, with Category/Phase/Entry as their own smaller resources pushed on their
own change, every push an idempotent upsert by identity.** Chosen (`CONTRACTS.md` §8.3).

## Decision

C. The unit of push is one Attempt (or one Category, Phase, or Entry) changing. Every push is an
idempotent `PUT`, never an append — required both for safe retry and for `CONTRACTS.md` §8.5's
requirement that a direct organiser correction and a possibly-still-live bridge push compose safely.
"Wins" is not decided by recency alone (§4 INV-2, amended after review — see `ADR-003`): a direct
correction is asserted `provisional: false`, ranks above an automated bridge push for its field, and
is superseded only by a later human assertion or a specifically-triggered re-read of the top-ranked
automated source (§4 INV-2b) — never by a routine push arriving after it. INV-5's idempotent-upsert
semantics are what let both callers compose without a distributed lock, each retained per its own
source rather than overwriting the other's slot.

**Tenancy is a public calendar, not a visibility policy per organiser.** The maintainer's answer,
given directly: organisers should be visible to each other, modelled as a shared calendar of
parallel events (§ maintainer answer A4). `GET /public/events` (`CONTRACTS.md` §8.4) is therefore a
first-class, unauthenticated read resource, not an access-control decision layered on top of
per-event visibility. Isolation still applies fully to *writes*: the `X-API-Key` scoping
(`CONTRACTS.md` §8.1) is unchanged by this — only reads of the calendar are public by design.

## Why

Multi-day separation (`ARCHITECTURE.md` Scenario E) falls out of this for free: a Phase's `date` is
fixed once, independent of when any particular push happens to arrive, so Saturday's and Sunday's
races push under the same `eventId` throughout, without the operator creating two events.

## What it costs

The on-site bridge must translate, not forward — a real increase in what `c123-server` must do
compared with today's "push the file" (`ARCHITECTURE.md` §4). This is not extra scope invented for
vendor-neutrality's own sake: it is the same domain-layer output ADR-002 already requires for the
on-site contract, serialised a second way, so the marginal cost is the translation layer itself, not
a second interpretation effort.

## What it forecloses

Any future "just push the file, we'll sort it out downstream" shortcut — `CONTRACTS.md` §8.6 refuses
raw vendor payloads and any push that doesn't name its target entity by id at every level.

## Revision — child-entity ids were never stated as event-scoped

An adversarial pass (two organisers, same event name, shared cloud instance) found that this ADR's
own collision-proofing (`eventId` opaque and organiser-scoped, §1.7) stopped one level too shallow.
`categoryId`, `phaseId` (Canoe123's own `RaceId`), and `entryId` are all Canoe123-derived tokens, and
Canoe123's identifiers are not organiser-safe — `RaceId` is deterministic from class, phase, and day
number, so two independent venues running the same class on the same numbered day mint the identical
one. E3: the contradiction is with this ADR's own stated goal, not an external fact. **Fix, in
`CONTRACTS.md` §8.1:** every id below `Event` is unique only within its event; the cloud store's
actual key for any such entity is always the compound `(eventId, localId)`, regardless of whether a
wire path repeats `eventId` at that segment — supplied by the authenticated key for writes (§8.3) and
already present in the path for public reads (§8.4). No endpoint shape changed; what changed is an
explicit statement of what the storage layer must key on, which nothing before this said outright.

## Revision 2 — what the live tier receives after the consolidated revision (2026-09-24)

- **Placement is pushed, standings are not.** Each Attempt carries upstream's `placement`, and the
  store assembles standings exactly as the on-site server does (`ADR-012`). live-mini ranks nothing.
- **New resources and fields.** Courses become their own resource. Entries carry members, club,
  nation, age category and birth date. Attempts carry a run generation.
- **The unit of push is unchanged:** one resource changing.

## Revision 3 — deletion and scope replacement on the wire (2026-09-24)

An upsert-only ingest cannot carry a retraction, and today's live path is upsert-only
(`EVIDENCE.md` Exhibit 12, E2). The live contract now has three ways to remove knowledge, all
idempotent: an explicit `not-yet` inside a partial Attempt push resets that field; `DELETE` removes
an Attempt; a whole-Phase `PUT` replaces every Attempt of that Phase, which is what the on-site
re-baseline (`ADR-015`) emits. The unit of push is unchanged; the vocabulary of what a push can say
is completed.

## Revision 4 — one sentence of the Decision is superseded (2026-09-25)

The Decision above says a direct correction is superseded by "a specifically-triggered re-read of
the top-ranked automated source (§4 INV-2b)". INV-2b no longer re-queries (`ADR-011`), and
`CONTRACTS.md` §8.5 with INV-2 rule 4 now governs: a direct correction yields to a later assertion of
the same kind, or to a results-table observation that *changes* the bridge's own retained value
afterwards. The sentence is left in place as history; the contract is the rule.

