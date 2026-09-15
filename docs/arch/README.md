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
| `ARCHITECTURE.md` | *(to come)* Target state |
| `CONTRACTS.md` | *(to come)* The primary deliverable — what is asserted, and as of when |
| `DECISIONS/` | *(to come)* ADRs |

## Ground rules for this phase

- **Nothing is fixed during the current season.** Defects catalogued in `EVIDENCE.md` are left
  standing deliberately: several are questions the design must answer, and repairing them
  piecemeal would destroy the evidence.
- **Provenance of upstream behaviour stays in the private `c123-protocol-docs` repository.** This
  folder documents behaviour, not how it was established.
