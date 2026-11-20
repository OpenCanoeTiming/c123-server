# Maintainer rulings

The decisions the maintainer made on the contract, one row each, stated as the rule that now holds, with where it is applied.
The full former decision log (defaults, contract rounds and process records) is in git under the tag `contract-archive-2026-11`.

A row is cited by its id, R-n.

## Principles

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-1 | 2026-11-12 | "Canoe123's results are the truth; the printed results come from there." Where the contract assembles or numbers what a result list prints (a rank, an order, which entries a list shows), it follows what Canoe123 prints, and a difference is a defect of the assembly. | `README.md`, ground rules; CONTRACTS §5 |
| R-2 | 2026-11-12 | "The bib is the key of a run's data; the competitor's identity under a bib may change." Times, penalties and the fact that penalties were checked are recorded against the bib, and a different competitor later under a bib is no error. | `README.md`, ground rules; CONTRACTS §2.6, §4 INV-4 |

## Retraction, removal, re-baseline

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-3 | 2026-11-06 | A classification table emptied after it had rows keeps the last built Standing, never an empty one; its `asOf` shows its age. | CONTRACTS §5, §8.3, §8.6; DERIVATIONS §4.10 |
| R-4 | 2026-11-11 | An absent XML row retracts, as on TCP, under the content-age guard. A wholly empty XML table retracts nothing and raises a diagnostic. | ADR-015 Revision 5; CONTRACTS §4 INV-7; DERIVATIONS §0.3, §4.12 |
| R-5 | 2026-11-12 | `xml-table-emptied` and a store file set aside at load reach the admin log only, with no wire diagnostic: the Canoe123 operator watches the admin UI. | CONTRACTS §2.10; DERIVATIONS §10 items 26 and 33 |
| R-6 | 2026-11-12 | "A competitor removed upstream (deleted, moved or re-bibbed) has their Attempt REMOVED", when an admitted XML snapshot no longer carries it under the content-age guard: `attempt.deleted` on site, `DELETE` to live. A moved competitor appears as a new Attempt in the other Phase. | ADR-015 Revision 6; CONTRACTS §2.6, §4 INV-7, §7.2, §8.3; DERIVATIONS §4.12, §10 item 38 |
| R-7 | 2026-11-12 | "The data belongs to the bib." An Attempt is removed only when its bib leaves the race; a re-bib or swap that leaves the bib in the race keeps the Attempt and re-points its `entry`. Checks and flags stay keyed by the Attempt (Phase and bib) and are served whenever it exists, whoever the competitor is. | ADR-015 Revision 7; CONTRACTS §2.6, §2.10, §4 INV-7; DERIVATIONS §10 item 38 |
| R-8 | 2026-11-16 | A race that leaves Canoe123's schedule has its Phase removed (`phase.deleted` for clients, `DELETE` on live), only from an admitted XML snapshot under the content-age guard. An empty table is not a removal. | ADR-015 Revision 9; CONTRACTS §2.4, §4 INV-7, §7.2, §8.3, §8.4; DERIVATIONS §4.12, §10 item 54 |

## Re-runs and restarts

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-9 | 2026-11-06 | The leave constant `onCourseLeaveAfterSeconds` is 4 s. | DERIVATIONS §4.1; ADR-017 Revision 5 |
| R-10 | 2026-11-10 | A server restart during a re-run is an accepted risk: the server stores nothing extra, and the operator resolves mismatched checks and pending corrections by hand. | DERIVATIONS §10 item 25 |
| R-11 | 2026-11-11 | There is no manual "mark as re-run" admin action. The two shapes the stream cannot decide (a re-run whose start and finish both fall inside a TCP outage; a mid-run mark followed by a start change) are accepted risks, resolved by the operator by hand. | DERIVATIONS §4.11, §10 item 23 |
| R-12 | 2026-11-12 | The accepted restart risk (R-10) covers on site only: "Live must never show `run` decreasing." | CONTRACTS §8.3; DERIVATIONS §10 item 25 |

## Writes

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-13 | 2026-11-11 | A pending write whose result was deleted resolves `mismatched`, to be revisited with the penalty-check operators in M4 (c123-penalty-check#169). | CONTRACTS §4 INV-2 rule 4 |

## Durability

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-14 | 2026-11-11 | A corrupt store file must not stop the server from starting. | CONTRACTS §2.10; DERIVATIONS §10 item 33 |
| R-15 | 2026-11-12 | Power loss on the venue laptop may roll back the last acknowledged check or flag: accepted. The venue documentation tells the operator to run the laptop on a charged battery. | CONTRACTS §2.10; DERIVATIONS §10 item 34 |
| R-16 | 2026-11-14 | The residual of the `seq` floor (a second set-aside with the clock set back below an earlier recovery's floor regresses `seq` once) is accepted as a residual risk, with no further narrowing. | CONTRACTS §1.6; DERIVATIONS §10 item 33 |

## Classes, formats, pairing

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-17 | 2026-11-11 | An attribute sub-class such as `K1M-HO` or `K1M-ST` is a separate class until one race = one XML is solved in the live ingest (M5, c123-live-mini#268); such classes were a workaround for several races of a day in one XML, and more such tricks are to be expected. | DERIVATIONS §2.1, §10 item 5 |
| R-18 | 2026-11-11 | A second run is paired with its first by `ClassId` and the `DisId` map, as upstream does. The `RaceId` is never parsed for pairing. | CONTRACTS §2.4, "Pairing"; DERIVATIONS §2.1 |
| R-19 | 2026-11-12 | "NHT combination: there is none." `NHT1` and `NHT2` are single runs, `pair: null`. | CONTRACTS §2.4; ADR-014 Revision 2; DERIVATIONS §10 item 31 |

## Standings

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-20 | 2026-11-12 | A category standing lists its unplaced entries too, after the placed ones and without a rank, as on a result list. Category ranks follow Canoe123's numbering (5 and 6 where upstream numbers them so), not a shared rank. | CONTRACTS §5 step 4; ADR-012 Revision 2 |

## Kayak Cross

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-21 | 2026-11-15 | The `XER` bib is relayed as Canoe123 writes it, its inner padding collapsed to one space (`t 13`). Nothing joins across Kayak Cross Phases by bib: a competitor across Phases is its `entryId`. | CONTRACTS §1.3, §2.6; DERIVATIONS §4.10; ADR-001 Revision 3 |
| R-22 | 2026-11-15 | No `XER` means no overall result; "heats only" never meant hiding the time trial, so such a class shows every Cross Phase's own standing, the time trial included. | CONTRACTS §2.4; DERIVATIONS §4.10 |
| R-23 | 2026-11-16 | A Kayak Cross time-trial athlete who leaves upstream's on-course list without a finish becomes `left-without-finish`, as in slalom. The heats are unchanged. | CONTRACTS §2.6, §3.2, §7.1; DERIVATIONS §4.1, §10 item 43 |

## Wire

| id | date | ruling | where it is applied |
|---|---|---|---|
| R-24 | 2026-11-10 | `/api/events/current` carries `pendingPhaseIds`, the Phases whose class is not yet known, so a hydrating client can request their Attempts. | CONTRACTS §1.6, §7.1 |
| R-25 | 2026-11-14 | `event.changed` is sent with the same `eventId` when the presented Event's `details` or `name` change. A client holding that `eventId` replaces the Event whole, with no re-hydration. | CONTRACTS §7.2 |
