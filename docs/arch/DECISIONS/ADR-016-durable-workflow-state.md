# ADR-016: Durable workflow state — gate checks with a value snapshot, flags, keyed by event identity

## Context

Penalty-check's judges compare each displayed penalty against the paper protocol and tick it off.
They also raise review requests ("podněty") on a gate, with a comment and a suggested value, which
an official later resolves. Neither fact exists in Canoe123. Today's code (E2, read by the
orchestrator): `c123-server/src/checks/types.ts` stores a `CheckEntry { checkedAt, value, tag? }`
where `value` is the penalty at check time, `null` deliberately distinct from a clean `0`, and a
`FlagEntry { id, bib, gate, createdAt, comment, suggestedValue?, resolved, resolvedAt?, resolution? }`;
files are per XML filename, keyed `bib:gate`; `ChecksStore.ts:758-763` writes atomically;
`checks/fingerprint.ts` decides "same event" by a schedule overlap of at least 0.5 (`EVIDENCE.md`
Exhibit 7). `c123-penalty-check/src/hooks/useChecks.ts:333` derives `stale` by comparing the stored
value with the live one.

`CONTRACTS.md` §2.10 as written had lost two things the maintainer confirmed must stay: the value
snapshot, without which a check silently stops being stale after a late correction (a protest 30
minutes later is routine), and the flags. Issue #168 adds that the durability guarantee had no
verification path: the state appears in no recording, so tiers 2 and 3 cannot cover it.

## Decision

1. **Two durable workflow entities** (`CONTRACTS.md` §2.10): `GateCheck`, keyed
   `(attemptId, run, gate)`, carrying `valueAtCheck: number | null`; and `GateFlag`, keyed by its own
   id, carrying comment, suggested value and resolution. Both are workflow bookkeeping, not domain
   facts, and neither crosses to the live tier.
2. **Staleness is derived by the server**, never stored and never computed by a tablet: a check is
   `verified` when `valueAtCheck` equals the presented gate penalty, `stale` otherwise, with
   `null` and `0` distinct and team sums compared as sums. Every tablet then agrees, and the rule is
   testable as a vector. This follows `ADR-002`: two tablets disagreeing about "stale" would be two
   interpretations of one fact.
3. **The store is keyed by `eventId`**, the identity the bridge asserts (`CONTRACTS.md` §2.2). A new
   event, which is an explicit admin action, opens a new, empty store; the old one stays on disk and
   is never merged. A change of XML file or of race day inside an event changes nothing. This
   retires the 0.5 schedule-overlap heuristic: identity is asserted, not guessed, so there is
   nothing left to guess.
4. **Interplay with the rest of the contract:**
   - a new run generation (`ADR-013`) starts with no checks and no open flags; the old generation's
     stay readable under their own `run`;
   - a retraction or contradiction (`ADR-015`) never deletes a check; the presented penalty becomes
     `not-yet`, so a check made against a value is now `stale`, and a check made against `null` is
     still `verified`. A result moved to another bib leaves the check with the bib it was made on:
     the paper protocol is per bib as raced;
   - the re-baseline keeps checks and flags and recomputes their status against the rebuilt values;
   - `entry` being re-pointed (INV-4) does not move a check: it belongs to the Attempt, not the person.
5. **Durability is a contract guarantee with a verification path.** Every change is written
   atomically (temporary file, then rename) before the write is acknowledged and before it is pushed;
   the file is validated on load. It is verified by ordinary unit and integration tests of the store
   in `c123-server`, outside the replay and fixture tiers (`TEST-ARCHITECTURE.md` §3.5): this is a
   bounded storage feature, not race behaviour, and it gets no tier and no harness of its own. Only
   the contract-level rules, what `stale` compares against and the re-run and re-bib interplay, are
   tier-1 vectors.

## Options considered

**A — Keep `{checked: boolean}` and let the tablet compare against the live value.** Rejected: the
snapshot is the only way to know what the judge actually saw, and a tablet-side comparison is a
second interpretation.

**B — Store the derived status.** Rejected: it would go stale the moment the penalty changed, which
is the case it exists for.

**C — Key the store by upstream's own event id or by XML filename.** Rejected: both change on a file
switch inside one event (`ARCHITECTURE.md` Scenario E), which would split a day's checks in two.

## What it costs

A value snapshot per check, a status recomputation whenever a presented gate penalty changes, and
ordinary store tests in one repository.

## What it forecloses

Any tier deriving `stale` itself, and any store that merges two events' workflow state.
