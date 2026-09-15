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

C, specified as five invariants (`CONTRACTS.md` §4) rather than a merge algorithm, per the brief's
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
wire and in code than today's flat DTOs. Every field needs its own freshness comparison rather than
one whole-object version check, which is real implementation surface, paid once in the domain layer
(`c123-server`) and once more in `live-mini` (which must apply the same invariants — `CONTRACTS.md`
§4 is explicitly not on-site-specific).

## What it forecloses

Any future shortcut of replacing a whole entity's state wholesale on message arrival — which is
precisely the shortcut that produced Exhibit 1. A write's optimistic value (Scenario B) can no longer
be silently reverted by an unrelated message that happens to omit the field it touched.
