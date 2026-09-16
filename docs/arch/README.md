# Architecture Revision — Working Folder

Tracking issue: [#161](https://github.com/OpenCanoeTiming/c123-server/issues/161)

A design-phase workspace for rebuilding how responsibility is divided across the `c123-*`
ecosystem. **This folder is temporary.** Once the rebuild is complete it is removed; nothing here
is intended to become permanent documentation.

## Layout

| Path | Role |
|---|---|
| `inputs/BRIEF.md` | The assignment: mission, method, the seven questions the design must answer, four scenarios it must survive, deliverables |
| `inputs/EVIDENCE.md` | Ten documented symptoms in the current code, with file and line references |
| `inputs/DOMAIN-FACTS.md` | What Canoe123 is as a data source — unequal interfaces, cadences, known data loss |
| `inputs/CURRENT-STATE.md` | Map of what the four components do today |
| `inputs/CONSTRAINTS.md` | What is fixed, what is open, operating reality |
| `ARCHITECTURE.md` | Target state — domain model, deployable boundaries, data flow, principles traced to `EVIDENCE.md`, five scenario walkthroughs |
| `CONTRACTS.md` | The primary deliverable — domain entities, the observation envelope, merge invariants, ranking, the derivability ledger, the on-site and live-ingest contracts |
| `DECISIONS/` | Ten ADRs, `ADR-001` through `ADR-010` |
| `TEST-ARCHITECTURE.md` | Four test tiers, the fixture format, and the clock-control requirement that makes presentation-layer timing assertable |
| `DERIVATIONS.md` | For every value `CONTRACTS.md` asserts: the exact upstream source field, transformation, conditionality, and resulting envelope — checked against real recorded data, not left as a claim |
| `schemas/` | JSON Schema for the two wire shapes reused everywhere: the observation envelope and the error response |

## Ground rules for this phase

- **Nothing is fixed during the current season.** Defects catalogued in `EVIDENCE.md` are left
  standing deliberately: several are questions the design must answer, and repairing them
  piecemeal would destroy the evidence.
- **Provenance of upstream behaviour stays in the private `c123-protocol-docs` repository.** This
  folder documents behaviour, not how it was established.

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
  treats (`ADR-…`, and `CONTRACTS.md` §1.7 for the reasoning against writing it now).
