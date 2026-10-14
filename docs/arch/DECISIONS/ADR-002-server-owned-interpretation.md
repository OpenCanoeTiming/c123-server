# ADR-002: Interpretation lives in the on-site server; the fact/presentation line decides the rest

## Context

`CONSTRAINTS.md` §2.1 leaves this genuinely open: "the working hypothesis is 'the on-site server
owns interpretation and clients render', but it is a hypothesis to be argued for or against, not an
instruction." Today, interpretation is spread across at least four places — `EventState`,
`LiveTransformer` (reachable only from one of two egress paths), each client's own mapper/reducer
layer, and `live-mini`'s independent ingest and ranking services — with no shared vocabulary and no
mechanism by which two of them could be found to disagree (`CURRENT-STATE.md`, closing section).

## Options considered

**A — Leave interpretation distributed, but document one canonical algorithm each component must
implement.** This is close to today's actual state (`docs/SCOREBOARD-REQUIREMENTS.md`,
`docs/INTEGRATION.md` — "the server publishes recipes rather than results," `CURRENT-STATE.md`).
Rejected outright: the brief names this exact answer as the current state and a failing one
(`BRIEF.md` §5.1).

**B — A shared library of interpretation logic, imported by all five deployables.** Attractive in
principle — one implementation, many call sites. Rejected for this project specifically:
`CONSTRAINTS.md` §1.4 fixes five separate repositories with independent release cycles, and §3 states
"one maintainer" as an operating reality. A shared *logic* library (not just types) means every
domain-logic bugfix requires coordinated version bumps across five repos before it is actually fixed
anywhere — exactly the "sustained coordination across four codebases by several people" the
constraints call not viable, even with one person doing all the coordinating themselves, repeatedly.

**C — All interpretation in the on-site server's domain layer; every other component renders.**
Chosen. Only one component (`c123-server`) ever observes every upstream interface at once — TCP,
UDP, XML, CIS. Every client, on-site or cloud, only ever sees what the server chooses to assert.
Locating interpretation anywhere it can see is a structural argument, not a stylistic one.

## Decision

C, with one necessary refinement over a naive reading of "clients render": a genuine line exists
between decisions whose wrong answer is a wrong *fact* (server-owned) and decisions whose wrong
answer is merely a worse *presentation* (client-owned) — display lifetime, layout, locale, visual
emphasis. `ARCHITECTURE.md` §2 names this line explicitly and lists what legitimately stays
client-side, because the first round of this design stated "zero interpretation" without that list
and the orchestrator correctly flagged it as overclaimed.

## Why

`EVIDENCE.md`'s pattern, stated in its own closing section: "not carelessness... each is a locally
reasonable decision made by someone who needed an answer and had nowhere to look it up." A single
locus is the only structure that gives every component somewhere to look.

## What it costs

The on-site server's domain layer becomes larger and more consequential than `UnifiedServer.ts` is
today (`CURRENT-STATE.md`: 3764 lines already) — this design does not shrink that component's
responsibility, it makes it the *only* place carrying it, which is a concentration of correctness
risk as much as a removal of duplication. Mitigated by `CONTRACTS.md`'s invariants being precise
enough to test independently of any implementation (§4, §5) — the brief's own stated bar for the
primary deliverable.

## What it forecloses

A future in which any client independently reinterprets upstream data "just this once" for a feature
its author found convenient — which is, by the audit's own account, exactly how today's state
accumulated.
