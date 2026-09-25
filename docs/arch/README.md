# Architecture Revision — Working Folder

Tracking issue: [#161](https://github.com/OpenCanoeTiming/c123-server/issues/161)

A design-phase workspace for rebuilding how responsibility is divided across the `c123-*`
ecosystem. **This folder is temporary.** Once the rebuild is complete it is removed; nothing here
is intended to become permanent documentation.

## Layout

| Path | Role |
|---|---|
| `inputs/BRIEF.md` | The assignment: mission, method, the seven questions the design must answer, four scenarios it must survive, deliverables. A fifth scenario — the multi-day event — was added during review and appears in `ARCHITECTURE.md`, not here |
| `inputs/EVIDENCE.md` | Eleven documented symptoms in the current code, with file and line references |
| `inputs/DOMAIN-FACTS.md` | What Canoe123 is as a data source — unequal interfaces, cadences, known data loss |
| `inputs/CURRENT-STATE.md` | Map of what the four components do today |
| `inputs/CONSTRAINTS.md` | What is fixed, what is open, operating reality |
| `ARCHITECTURE.md` | Target state — domain model, deployable boundaries, data flow, principles traced to `EVIDENCE.md`, nine scenario walkthroughs (A–I) |
| `CONTRACTS.md` | The primary deliverable — domain entities, the observation envelope, merge invariants, ranking, the derivability ledger, the on-site and live-ingest contracts |
| `DECISIONS/` | Sixteen ADRs, `ADR-001` through `ADR-016`. `ADR-004` and `ADR-008` are superseded by `ADR-011` and `ADR-012`; their original text is kept |
| `TEST-ARCHITECTURE.md` | Four test tiers, the fixture format, and the clock-control requirement that makes presentation-layer timing assertable |
| `DERIVATIONS.md` | For every value `CONTRACTS.md` asserts: the exact upstream source field, transformation, conditionality, and resulting envelope. §9 lists every upstream field deliberately *not* modelled, and why; §10 lists open technical questions |
| `schemas/` | JSON Schema for the two wire shapes reused everywhere: the observation envelope and the error response |
| `CONFORMANCE-VECTORS.md` + `vectors/tier1-conformance.json` | The tier-1 hand-authored conformance vectors `TEST-ARCHITECTURE.md` §3.1 calls for — format, coverage map, and what could not be written |
| `CLIENT-OBLIGATIONS.md` | Derived checklist of everything the design requires of each deployable other than the server, each line citing its source; the definition of done for a client's migration. `scripts/check-obligations.js` keeps it in step (see ground rules) |

## Where to start

The contract is 1,250 lines and the test architecture 600. Nobody should read this folder front
to back. Depending on what you are here to judge:

| You are reviewing | Read, in order |
|---|---|
| **Whether the design is right at all** | `inputs/EVIDENCE.md` (the symptoms it answers) → `ARCHITECTURE.md` → `CONTRACTS.md` §1–§4 |
| **Whether it can be built** | `CONTRACTS.md` §7–§8 (the wire contracts) → `DERIVATIONS.md` → `vectors/tier1-conformance.json` |
| **A specific decision** | `DECISIONS/` — each ADR states the alternatives considered and what the choice costs |
| **The test strategy** | `TEST-ARCHITECTURE.md`, then `CONFORMANCE-VECTORS.md` |
| **In one hour** | `ARCHITECTURE.md`, then `CONTRACTS.md` §1.2 (the observation envelope) and §4 (the merge invariants). Those two sections are the design; everything else follows from them |

**What has already been checked, so a reviewer need not repeat it.** The design went through these
passes, and fifteen defects were found and fixed before anything was implemented:
- an independent review pass;
- an adversarial pass under an evidence standard;
- a wire-precision pass;
- a derivation pass that validated the ledger's own claims.

**The consolidated revision** (2026-09-24, `DECISIONS/ADR-011`–`014`) then absorbed four inputs:
- a reverse pass over every field Canoe123 emits on TCP, in the XML snapshot and on CIS;
- a finish-to-result latency measurement;
- the maintainer's answers to eight operational questions;
- the gaps #165, #166 and #171.

Its main outcomes:
- CIS is no longer consumed;
- standings relay Canoe123's own order;
- re-runs are run generations;
- `Category` is renamed `Class`, and age categories are first-class.

**Revision round 2** (2026-09-24, `DECISIONS/ADR-015`) made retraction first-class: a TCP result push
and an XML snapshot are complete statements of a race, their stated absence retracts, the on-course
stream contradicts a stale finish, and an operator re-baseline rebuilds a race or event and pushes
it everywhere as a replace.

Cross-references, section numbers, JSON validity and internal
counts were mechanically verified. Hunting for internal inconsistency is largely spent ground.

Where a human reviewer beats what has been done: whether the entity spine matches how officials
and organisers actually think about a race; whether keying an `Attempt` by bib rather than by
competitor is natural or treacherous in practice; whether the operational burden the design
assumes is bearable by one maintainer; and whether "show a value stale for tens of seconds rather
than let it flicker" is right for a judge as well as for a spectator.

## Open questions, collected

Scattered through the documents by design — each sits where it arose — and indexed here so a
reader can see the whole set at once.

| Question | Where |
|---|---|
| Open technical questions from the reverse pass: the terminal reset, the layout letters `D`/`E`, other classification tokens, further upstream pairings, the base class of a sub-class, per-gate marks in Kayak Cross, the timing of a re-run's row clearing, the residual XML takeover window, and late-finish outliers. | `DERIVATIONS.md` §10 |
| Every upstream field deliberately not modelled, and why. | `DERIVATIONS.md` §9 |
| Whether `recordings-cli.js`'s versioning composes with the second axis a domain-state fixture needs. | `TEST-ARCHITECTURE.md` §10 |
| Whether re-implementing the tier-3 harness driver in three client repos is cheaper than the mock-server porting it replaces, or relocates the same cost. | `TEST-ARCHITECTURE.md` §10 |
| What the tier-1 vectors deliberately do not cover. | `CONFORMANCE-VECTORS.md` §3 |
| What is deliberately not tested at all. | `TEST-ARCHITECTURE.md` §8 |
| What could not be derived from today's sources. | `DERIVATIONS.md` §7 |

## Ground rules for this phase

- **Nothing is fixed during the current season.** Defects catalogued in `EVIDENCE.md` are left
  standing deliberately: several are questions the design must answer, and repairing them
  piecemeal would destroy the evidence.
- **Provenance of upstream behaviour stays in the private `c123-protocol-docs` repository.** This
  folder documents behaviour, not how it was established.
- **`CLIENT-OBLIGATIONS.md` changes in the same PR as the sections it cites.** It is derived, so the
  cited sections win. `scripts/check-obligations.js` runs in CI (`.github/workflows/docs-arch.yml`)
  and fails in two cases: a citation no longer resolves, or a cited section or ADR changed while the
  checklist did not. Label the PR `obligations-unchanged` when the change affects no obligation.

## Implementation sequence

Built from decisions already taken. It is not a migration plan: the running system keeps working
as it is until each part is replaced.

1. **Settle any open upstream question** (`DERIVATIONS.md` §10) that the part being built depends on.
2. **Server first, test-first.** Tier-1 conformance vectors (`vectors/tier1-conformance.json`) are
   written as failing tests before the code that passes them. The server implements the contract
   (`CONTRACTS.md` §7 on-site, §8 live ingest).
3. **Test tooling, as the server needs it.** Build the pieces listed under "Needs rework, or does
   not yet exist" in `TEST-ARCHITECTURE.md` §9: the domain-state capture tool, the direct-injection
   ingest path, write-echo emulation in `player.js`, and fixture versioning (§10). Each gets its own
   issue when its turn comes. End-to-end checks and demos run the whole line, `player.js` feeding
   c123-server with the client connected normally (tier 4, §3.4). The tier-3 harness (§3.3) feeds
   fixtures to a client without it.
4. **Clients one at a time.** Each deployable other than the server migrates in its own issue. The
   checklist for that issue is its section of `CLIENT-OBLIGATIONS.md`, together with the common
   section. A client is migrated when every item is met and tested.
5. **Retire the superseded documents** listed below once the contract replacing them is implemented.

## Deferred to implementation

Recorded here rather than done now, because this branch is an architecture revision and
nothing in it is merged or implemented yet.

- **Retire `docs/SCOREBOARD-REQUIREMENTS.md` and `docs/INTEGRATION.md`.** These are the documents
  in which the server tells clients how to interpret its data — Exhibit 6 of `inputs/EVIDENCE.md`,
  and the clearest statement of the problem this revision exists to remove. The design obsoletes
  them, but they accurately describe the system that is actually running, and `main` still has no
  replacement. Deprecate them when the contract they are superseded by is implemented, not before:
  pointing readers at a contract nothing implements would be worse than leaving them standing.
- **An OpenAPI specification for §7 and §8.** Deliberately deferred as a derived artefact. If it is
  ever written it must *replace* the `CONTRACTS.md` §7/§8 tables as the normative source rather
  than sit alongside them — two sources of truth for one set of shapes is the disease this project
  treats. `CONTRACTS.md` §1.7 carries the reasoning against writing it now.
