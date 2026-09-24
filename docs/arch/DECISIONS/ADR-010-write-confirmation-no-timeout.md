# ADR-010: Write confirmation is pending/confirmed/mismatched, with no engineered timeout

## Context

Scenario B: a judge corrects a gate penalty on the tablet; the write goes upstream and is echoed back
on a cadence we do not control. The brief asks directly what is true in the intervening seconds, and
what happens if the echo never arrives, or comes back different from what was written. Asked
afterward, the maintainer gave a specific, narrow answer: a lost echo is a failed write, full stop —
it must be surfaced and resolved with a person, and we should not engineer a timeout policy to decide
when "still pending" becomes "failed."

## Options considered

**A — A numeric timeout** (e.g. some multiple of the known ~30 s Results rotation), after which a
pending write auto-flips to failed. Rejected on direct instruction: "do not engineer a timeout
policy." Also weak on its own terms — any fixed number either fires too early during a legitimate
slow rotation or too late to be useful, and a public contract meant to serve deployments this project
cannot inspect (`CONSTRAINTS.md` §1.8) has no basis for guessing at one operational tempo that fits
them all.

**B — No confirmation tracking at all** — a write is fire-and-forget, and reality is whatever the
next full snapshot happens to show. Close to today's actual behaviour. Rejected: it leaves Scenario
B's central question — what is true in the intervening seconds — unanswered, and it never surfaces a
write that silently failed to take effect, which is precisely what the maintainer wants made visible.

**C — Track `pending → confirmed | mismatched` indefinitely; no timeout; `submittedAt` always present
so any client can compute elapsed time itself; resolution is explicitly an operator-facing action
outside this contract's scope.** Chosen (`CONTRACTS.md` §2.9).

## Decision

C. `WriteRequest.status` has exactly three values. `pending` persists until an upstream observation
for the same field, with a later `observedAt`, either matches (`confirmed`) or differs
(`mismatched`) — never on the strength of elapsed time alone.

## Why

This is a direct implementation of the maintainer's stated policy, and it keeps a real separation:
the *contract's* job is to state a fact honestly (is this write confirmed, yes or no, and if not, for
how long has it been open) — not to encode an operational judgement (how long is too long) that
depends on circumstances this design cannot see and, per `CONSTRAINTS.md` §1.8, may never get to ask
about.

## What it costs

No system-driven safety net: if nobody notices a long-pending write, nothing escalates it
automatically. Accepted deliberately — this is an operator-facing responsibility by the maintainer's
own instruction, not a gap left by oversight.

## What it forecloses

Any future "smart" retry-or-timeout heuristic being folded into this contract as though it were part
of the asserted fact. Such a thing remains buildable as an admin-UI convenience layered on top of the
observable `pending`/`submittedAt` state — the contract commits to none of it, deliberately, so that
convenience can change without being a contract-breaking change.

## Revision — a fourth terminal status, `superseded` (2026-09-24)

A write can target a run that stops counting: a re-run starts a new generation (`ADR-013`) while the
write is still `pending`. Such a write resolves to `superseded`, and is never matched against the
re-run's penalties. This is still not a timeout. It is an observed upstream transition, and the
person who submitted the write sees it resolve.
