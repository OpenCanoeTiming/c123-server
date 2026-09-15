# ADR-003: The observation envelope and per-field monotonic merge

## Context

`EVIDENCE.md` Exhibit 1: there is no model of event time in this system, not a weak one. Every
outbound timestamp is minted at message serialisation, not when anything happened
(`protocol/factory.ts:26-28` per the audit). `dtStart`/`dtFinish` — the only real event times
Canoe123 gives — are stored as opaque strings, never parsed or compared. No sequence numbers exist
anywhere. Ordering is raw TCP arrival order. `Results` replaces the whole state object on arrival,
so a late or partial message can silently revert the race. The maintainer's own framing, given after
round one: incompleteness is *local in time* — results build up progressively, and a message lacking
a value is not evidence the value was unknown a moment ago. He named the live client's flicker
(values appearing and disappearing) as a direct consequence, on a par with `EVIDENCE.md`'s ten
exhibits.

## Options considered

**A — Add sequence numbers to the wire protocol and reorder on receipt.** Not available: Canoe123 is
immutable upstream (`CONSTRAINTS.md` §1.1); we cannot add a sequence number to a wire format we do
not control, and inventing our own on receipt only reorders what we already receive in an order we
did not choose.

**B — A single "last message wins" rule, but keyed per-entity instead of globally.** Better than
today (removes cross-entity interference) but does not address the maintainer's actual answer:
per-entity replace still lets a message that omits one field of an otherwise-known entity erase that
field. This is the literal shape of today's bug, narrowed but not removed.

**C — An observation envelope on every value (`observedAt`, `eventTime?`, `source`, `confidence`,
`provisional`), merged per field, never regressed by an omission, only ever replaced by a strictly
newer observation.** Chosen.

## Decision

C, specified as eight invariants (`CONTRACTS.md` §4) rather than a merge algorithm, per the brief's
instruction to state what the contract constrains and stop there. `observedAt` is captured at the
ingest boundary — the moment a message is received and parsed — never at outbound serialisation,
which is the literal fix for Exhibit 1's `factory.ts` bug.

## Why

This is the direct, load-bearing consequence of the maintainer's stated principle: "knowledge is
monotonic." It also happens to be the only design that satisfies `CONSTRAINTS.md`'s verifiability
requirement without a testing-strategy deliverable: given the same sequence of ingested messages with
their true `observedAt` values, the resulting state is a pure function of that sequence — replay is
deterministic because nothing in the merge depends on wall-clock time at replay, only on timestamps
captured once, at original ingest.

## What it costs

Every domain value is a small tagged structure, not a bare number or string — more verbose on the
wire and in code than today's flat DTOs. Every field needs its own precedence comparison — recency
*and*, since the revision below, source authority — rather than one whole-object version check, paid
once in the domain layer (`c123-server`) and once more in `live-mini` (which must apply the same
invariants — `CONTRACTS.md` §4 is explicitly not on-site-specific). Concretely, a field's merge state
is now a small per-source map (one retained observation per source that has ever reported it), not a
single mutable slot — more storage and more comparison logic than the freshness-only version, in
exchange for the correctness argued in the revision below.

## What it forecloses

Any future shortcut of replacing a whole entity's state wholesale on message arrival — which is
precisely the shortcut that produced Exhibit 1. A write's optimistic value (Scenario B) can no longer
be silently reverted by an unrelated message that happens to omit the field it touched. As of the
revision below, it also forecloses a source with a worse answer for a field displacing a source with
a better one merely by arriving later in ingest order.

## Revision — an authority gate added after review

The original decision above specified INV-2 as freshness-only: a `known` field replaced by any
strictly newer `observedAt`, with no regard to which source produced either observation. Review
caught that this is unsound: recency of *our own receipt* is not evidence of quality, and a source
with a coarser or slower-updating answer for a given field can still out-arrive, in ingest-time terms,
a source that already gave the right answer. On a two-run race, a CIS-confirmed total could be pushed
back out by the next TCP `Results` rotation and pulled back at the following CIS poll — a value
oscillating on the rotation period between right and wrong, reproducing the maintainer's own named
symptom (§ maintainer answer A1's flicker) at a slower, harder-to-notice cadence, inside the very
mechanism built to remove it.

**Fix:** INV-2 is now authority-gated, not freshness-only — a field's merge state retains the latest
observation *per source*, and the presented value is the latest observation from the highest-ranked
*available* source for that field's category (a small, explicit table, `CONTRACTS.md` §4 — never one
global order, since no single order is correct for every field). A companion invariant, INV-2b,
prevents this from permanently hiding a genuine correction that only ever arrives through a
lower-ranked channel: a disagreement between a lower-ranked source and the presented value triggers a
targeted re-query of the top-ranked source rather than being discarded or adopted directly. Optimistic
writes and Cross's operator-asserted heat order (both already a form of direct human assertion) sit
outside the ranking table entirely, by necessity — Scenario B requires a write to be visible the
instant it is submitted, before any ranking comparison could apply.

This still satisfies the "why" above: replay determinism is unchanged, because the ranking table and
each observation's `(source, observedAt)` are both fixed at ingest — nothing in the presentation rule
depends on wall-clock time at replay, only on facts captured once, same as before. What changed is
only that "the same input sequence" now includes which source each observation came from, not only
when we received it.

## Revision 2 — two gaps found under an adversarial pass, both in the fix above

Instructed to attack the contract rather than extend it, and to require an evidence class for every
finding (E1 upstream-verified, E2 our-own-code-verified, E3 internal contradiction, E4 unevidenced),
review turned up two more defects, both inside the authority gate the first revision added, before
either could be found live.

**Gap 1 (E3, confirmed E1) — ranking alone cannot tell a top-ranked source's stale content from its
fresh content.** A CIS poll can return an answer that was already old when Canoe123 produced it, with
an `observedAt` that is perfectly fresh because that only records when *we* received the reply. Since
INV-2 ranks by source alone, such a reply would still displace a correct, fresher TCP-derived value —
the same class of defect Revision 1 fixed, recurring one layer down, inside the fix itself. This is
E3 by itself (the contradiction is with INV-1's own promise, and with the reason `eventTime` exists in
the envelope at all — §1.2 built it to answer exactly "as of when," then §4 never consulted it). It is
also now E1: CIS's actual response was checked, not assumed — `GetResult` carries genuine per-
competitor upstream timestamps (`FinishDayTime`, `StartDayTime`, `GateTimes`), confirmed both in the
protocol documentation and in live SOAP traffic from a real recorded race, which is what makes the fix
below implementable rather than aspirational. **Fix: INV-2c** — where both the presented value and a
candidate carry an `eventTime`, a candidate with a strictly earlier `eventTime` never supersedes,
regardless of rank. A floor beneath the table, not a replacement for it.

**Gap 2 (E3) — `observedAt` orders the merge and is wall-clock, and a venue laptop's clock is not
guaranteed monotonic.** An NTP correction, a DST transition, or an operator fixing a wrong clock
mid-event can move it, possibly backward — nothing in INV-2 as revised accounted for this, despite
depending entirely on "strictly newer `observedAt`" throughout. **Fix: INV-6** — every ordering
comparison in this section is now defined over an internal, strictly-increasing sequence assigned at
the same ingest instant as `observedAt`, never over `observedAt` itself. This is not the wire sequence
number `CONSTRAINTS.md` §1.1 rules out (that would mean instrumenting Canoe123's own protocol); it is
assigned by us, at our own boundary, and never leaves the domain layer — `observedAt` keeps its
original job, display and staleness, and only that job.

Both fixes are additive to the invariant list (`CONTRACTS.md` §4 now states eight, not six) and change
nothing about which values are exposed on the wire — the correction is entirely inside how the domain
layer decides what to present, exactly where Revision 1's fix also lived.
