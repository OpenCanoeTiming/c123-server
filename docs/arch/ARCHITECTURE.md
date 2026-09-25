# Architecture — c123 Ecosystem

The target state `CONTRACTS.md` implies. Read that document first — this one explains why it is
shaped the way it is, where the five deployable pieces sit around it, and walks the scenarios the
brief requires. Every principle below is traceable to a named symptom in `EVIDENCE.md`; a principle
that isn't has been cut.

---

## 1. The domain model, briefly

```
Organiser (cloud tenant only)
  └─ Event (bridge- or, later, registry-assigned; stable across days and file layouts)
       ├─ Course (layout string; referenced by Phases)
       └─ Class (Canoe123 class, e.g. K1M; carries `discipline` and its age categories)
            ├─ Entry (one athlete, crew or team; 1..N members; keyed by Canoe123's `Id`, opaque)
            └─ Phase (one Canoe123 race: a run, a round or a classification; open `format`)
                 └─ Attempt (keyed by phaseId + this race's bib; carries a run generation)
                      ├─ entry: Observed<{entryId}>   — a mutable pointer, not a fixed key
                      ├─ status, outcome, gates, placement, … — all Observed<T>
Standing (assembled per scope and age category from relayed placement; never ranked by us)
```

**Consolidated revision, 2026-09-24** (`DECISIONS/ADR-011` to `ADR-014`):
- `Category` is renamed `Class`. "Category" now means an age category.
- CIS is no longer consumed.
- Standings relay Canoe123's own order.
- A re-run is a new run generation inside the same Attempt.

Two deliberate departures from what Canoe123's own vocabulary suggests:

**"Race" does not survive as a single entity.** Today it conflates what this model splits into
`Class` (K1M) and `Phase` (K1M's second run) — `EVIDENCE.md` Exhibit 8 is every client
re-deriving that split from a `RaceId` string by regex. Splitting it once, centrally, is most of
what makes `CONTRACTS.md` §7's zero-interpretation clients possible.

**`Attempt` is keyed by `(phaseId, bib)`, not `(phaseId, entryId)`.** This was the working model at
the start of this design; it changed on the maintainer's answer that a mis-bibbed competitor can be
discovered and corrected up to a week after a race (`CONTRACTS.md` §2.6). What is physically stable
is that someone wearing a given bib went down the course in a given Phase; *who* that was is a
correctable assertion, `Attempt.entry`, carrying the same observation envelope as any other value —
not the identity key itself. Keying on `entryId` would have made every correction a structural
rebind; keying on `bib` makes it an ordinary field update.

---

## 2. Where interpretation lives, and the line that decides what doesn't

**All of it lives in `c123-server`'s domain layer** — the only component that ever sees every
upstream interface it uses (the TCP push and the XML snapshot). Every other deployable renders what the domain layer
asserts. This resolves `CONSTRAINTS.md` §2.1 in favour of the stated working hypothesis, for a
reason stronger than convenience: `EVIDENCE.md`'s ten exhibits are ten instances of the same
component (a client, or one of two egress paths) needing an answer and having nowhere to look it
up. A second, independent domain implementation — even a well-intentioned one in `live-mini` — is
exactly the mechanism that produced Exhibit 3 and Exhibit 9. One locus is not a style preference; it
is the only structure under which two components can be found to disagree, rather than each being
locally correct and mutually inconsistent.

**The line between what the server decides and what a client legitimately still decides:**

> The server owns any decision whose wrong answer is a wrong *fact* — whether someone finished,
> what their time or rank is, what a phase's status is, who is on course right now. A client owns
> any decision whose wrong answer is merely a worse *presentation* — and the test for which side a
> given decision is on is whether two correctly-implemented clients could legitimately disagree
> about it and both still be right.

Concretely, what legitimately stays client-side, named rather than left as an unstated exception to
"zero interpretation" (this section exists because the first round of this design overclaimed that
line):

- **Display lifetime.** How long a finisher stays pinned in an on-course view after finishing, how
  long a just-completed Kayak Cross heat's result stays prominent once the next heat is already
  running (the maintainer's own example — see Scenario D). The server's obligation is only that the
  fact was available in time to be shown (§4); how long to keep showing it is layout policy, exactly
  the kind already living in `scoreboard/context/constants.ts` today.
- **Layout, pagination, and screen real estate** — a Raspberry Pi-driven venue board, a tablet, and
  a spectator's phone legitimately show different amounts of the same facts.
- **Locale.** Every status and round identifier is a closed vocabulary token (`CONTRACTS.md` §1.3);
  turning `unofficial` into a word, in Czech, English, or anything else, is a client-side lookup.
  Nothing in the domain layer emits language, which is the generalisation of the fix for `EVIDENCE.md`
  Exhibit 8's Czech string, driven by `CONSTRAINTS.md` §1.8: an adopter under a different federation
  must not have to renegotiate what a contract value *means*, only relabel it.
- **Visual emphasis** — highlight animation, transition timing, which is presentational by
  definition.
- **Non-domain filtering conveniences** — "show only my club's competitors" changes nothing about
  what is true.
- **Which competitor to feature.** The default is the athlete next to pass the finish, the first
  Attempt of the on-course list. Canoe123's own TV selection is offered as an optional alternative
  (`CONTRACTS.md` §7.1); a scoreboard may follow either.

**Two things every rendering client must show, not may.** Layout is the client's; these are not:
- **`provisional`** and **`underReview`** are shown, distinctly from each other and from a settled
  value, on the scoreboard and in live results (maintainer answer Q7: the asterisks), and in
  penalty-check too: a judge verifying penalties must see that judging is still in flight or that an
  official is holding the result. How they are marked is presentation; that they are marked is not.
- **A pending write** is shown as pending until confirmed, and never cleared by the client on its
  own (`CONTRACTS.md` §2.9).

**Display-lifetime code must re-evaluate on a clock tick, not only when new data arrives — a
requirement on the client's own architecture, not a stylistic preference.** Found necessary under
`TEST-ARCHITECTURE.md`'s review, not designed in from the start: a component that only recomputes
"is this still inside its grace period" when a dispatched action triggers a re-render has no path by
which pure elapsed time — no new data, just the clock moving — can be observed, tested, or, in
production, acted on promptly. *Client-owned* (the point of this whole section) was never meant to
mean *only reactive to new data*; a finisher whose grace period lapses between two unrelated updates
must still be evicted when it lapses, not only whenever some other update happens to arrive and
trigger a recompute. This is what makes `TEST-ARCHITECTURE.md` §3.3's fake-clock harness able to
assert grace-period and stale-eviction behaviour at all, rather than only whatever a client happens
to recompute when a fixture step lands.

**Federation-specific matter is separable by construction, not by policy.** Ranking-point schemes,
age-class coding, and "what counts official" differ by federation (`CONSTRAINTS.md` §1.8). This
design never computes any of them. `Standing` relays Canoe123's own order and rank, and assembles
age-category standings by filtering that order (`CONTRACTS.md` §5, `DECISIONS/ADR-012`). Tie-breaks,
result-mark ranking and Kayak Cross fault ranking are all upstream's; no tier invents one. `Phase.status`'s `official` value is Canoe123's own
judgement, relayed, not decided by us. There is nothing here to make pluggable for a second
federation, because nothing here encodes a federation's rules in the first place. **The same
principle turned out to apply to identity, not only to rules:** an organiser fills Canoe123's `ICFId`
element with whichever registry identifies their own entrants — a national federation's own numbers
for domestic athletes, genuine ICF codes for others — and the contract treats the registry itself as
federation-specific data, carried as an explicit `scheme` alongside the value rather than assumed to
always mean one particular registry (`CONTRACTS.md` §2.5, `DECISIONS/ADR-006` Revision 2).

---

## 3. The five deployables

| Component | Owns | Does not own |
|---|---|---|
| **c123-server** | The domain layer entirely: ingest from the TCP push and the XML snapshot (UDP for discovery only; CIS not consumed, `DECISIONS/ADR-011`), the merge invariants (`CONTRACTS.md` §4), `Standing` assembly, write routing and confirmation tracking, translation into both the on-site and live-ingest contracts. | Any rendering decision. |
| **c123-scoreboard** | Display-lifetime policy, layout, locale, visual emphasis — rendering the on-site contract (§7). | Finish detection, gate parsing, merge, precedence — all retired from its `providers/utils/` layer by having nothing left to decide there. |
| **c123-penalty-check** | Write initiation (including against closed Phases, `CONTRACTS.md` §2.9), its own durable workflow state — gate checks carrying the penalty seen at check time, and flags (judges' review requests with comment, suggested value and resolution), `CONTRACTS.md` §2.10 — stored on the server per `eventId`, keyed on `(phaseId, bib, run, gate)` rather than a fourth incompatible fingerprint (`EVIDENCE.md` Exhibit 7's third entrant). Staleness ("the penalty changed after the check") is derived by the server, so every tablet agrees. | Gate parsing — retires its second, incompatible parser entirely. |
| **live-mini-server** | A tenant-scoped store of exactly what the ingest contract asserts (`CONTRACTS.md` §8), applying the merge invariants that a single resolved source admits (`CONTRACTS.md` §8.3, "Merge on the live tier": INV-1, 3, 4, 5, 6 and INV-2 rule 4; not the on-course, connection or snapshot rules, which never leave the venue) and the same standing assembly as c123-server without its anomaly checks (§5), durability across on-site disconnection, tenant isolation, the public calendar (§8.4), accepting direct organiser corrections independent of the bridge being online (§8.5). | Ranking, lifecycle status, or any other recomputation — retires `EventLifecycleService`'s independent judgement and the two-parser XML re-ingestion of `EVIDENCE.md` Exhibit 9. |
| **live-mini-client** | Spectator-facing layout and locale, its own (likely lighter) display-lifetime policy. | Everything a client never owned. |

**The shared types package, named.** The row in §5 that requires "a shared types/schema package
underlying every DTO and the ingest schema" is `@opencanoetiming/c123-contract`: the TypeScript types
of `CONTRACTS.md` §2 and the two JSON schemas of `docs/arch/schemas/`, and nothing else. No runtime
logic ever (`DECISIONS/ADR-002`, `ADR-003`). It is published from `c123-server`'s repository, which
already holds `shared/types/`, versioned with the wire-protocol version, and consumed by the four
other deployables as a pinned dependency, exactly as every repository consumes
`timing-design-system` today. Bumping it is the one place a shape change becomes visible to all
five at once, which is the point.

---

## 4. Data flow

```
Canoe123 — TCP push, XML snapshot file   (UDP: discovery only; CIS: not consumed)
        │  observedAt captured here, at the ingest boundary — never at outbound serialisation
        ▼
c123-server domain layer
   merge invariants (§4) → Observed<> state → Standing assembly (§5)
        │                                            │
        │ on-site contract, §7                        │ live-ingest contract, §8
        │ (Canoe123-native tokens)                    │ (vendor-neutral, Attempt-level push)
        ▼                                            ▼
scoreboard, penalty-check                      live-mini-server
(Pi, tablets — venue LAN)                       (tenant store, same invariants)
                                                        │
                                                        ▼
                                                 live-mini-client
                                                 (spectator phones — public internet)
```

The two egress paths (on-site, live) are two *serialisations* of one domain layer's state, not two
reconciliation implementations. This is what retires `EVIDENCE.md` Exhibit 3: there is no second
place doing the arithmetic, because there is no second domain layer to do it in.

---

## 5. Principles, each traced to a named symptom

| Principle | Retires |
|---|---|
| Per-field monotonic merge; a value is never regressed by a message that omits it (`CONTRACTS.md` §4 INV-1) | Exhibit 1 — out-of-order Results silently reverting the race; also the "flicker" the maintainer named directly — values appearing and disappearing on the live client today |
| `observedAt` captured at the ingest boundary, never at outbound serialisation | Exhibit 1's stated root cause |
| `Attempt` keyed by `(phaseId, bib)`, never `bib` alone | Exhibit 1's concurrent-race collision, blocking Kayak Cross |
| Gate-number assignment centralised once in the domain layer, position-correct by construction | Exhibit 2 — two independently-wrong client parsers |
| One domain layer feeding both egress paths, not a second reconciliation living only in one | Exhibit 3 — the only cross-source reconciliation ran on one of two outbound paths |
| A shared types/schema package underlying every DTO and the ingest schema | Exhibit 4 (a dead ingest path reporting healthy), Exhibit 5 (`null` silently collapsed at the boundary), Exhibit 9 (fields sent, ignored, recomputed) |
| One finish-detection strategy per discipline, exported *and* actually used | Exhibit 6 — the tested definition was dead code; a second, inline one ran instead |
| `Phase`/`Attempt` identity assigned once, centrally, and reused everywhere including workflow-tracking state | Exhibit 7 — three incompatible fingerprints for "is this the same event," one of them a 50%-fuzzy match |
| `Class`/`Phase`/format identity derived once, structurally, never re-parsed from a string per client | Exhibit 8 — identity derived by regex, with presentation language leaking into the derivation |
| Closed, language-free status and outcome vocabularies asserted by the domain layer | Exhibit 10 — five domain rulings, one of them duplicated, inside a file whose job was display reshaping |

---

## 6. Scenarios

Rewritten in the consolidated revision. The timings are measured, from recordings of four events and
1,533 finishes (`DECISIONS/ADR-011`).

### A — The finish, in a best-of-two race

Run 2 of bib 9 beats their run 1. The event runs Canoe123 with "ranking with incomplete penalties"
switched on.

- **t+0.0 s: the finish.** The on-course stream's finish time appears. `status → finished`,
  authoritative. The domain layer computes an inferred `duration` from the on-course time and the gates
  judged so far: `provisional: true`, `confidence: inferred`. It pushes that on both tiers. It does
  **not** compute a rank.
- **t+0.3 s: the result push.** Canoe123 recalculates the race and pushes it immediately
  (`Current="Y"`, median 0.14–0.41 s). This is a results-table observation, so it supersedes the
  inference (`CONTRACTS.md` §4 INV-2, rule 1). The Attempt now carries:
  - its own run-2 figures: the time, and the penalty as the sum of run 2's own gate cells. This
    holds even when run 1 stays the better run, where upstream's `Pen`/`Total` on this row are run
    1's;
  - `pairTotal`, the combined better-run total;
  - `placement`, the combined rank, already tie-broken upstream.

  If a gate is still blank, all of it stays `provisional: true`. `Standing` re-assembles: the class
  standing, and the athlete's age-category standing assembled from it at the same moment.
- **t+2 s: the last gate is judged.** Upstream recalculates and pushes again. The values settle to
  `provisional: false`, and the rank may move: at one event, 18% of first ranks in run 1 did. If the
  event runs with that setting **off**, the first push waits for the last gate and arrives already
  `provisional: false`. Both cases are marked honestly.
- **t+~35 s: the snapshot rewrite.** The XML snapshot is rewritten with the same row. TCP has stayed
  connected, so its observation stays presented (INV-2, rule 2). The snapshot's own age-category rank
  arrives here, and is used only to check the assembled one.
- **The rotation** comes round to this race only minutes later. It changes nothing.
- **What people see.** The scoreboard shows result and rank within about half a second of the finish,
  with a provisional mark while judging is still in flight. The spectator sees the same values a
  network hop later. Run 1's Attempt is never touched by any of this.

### B — The write echo

A judge corrects a gate penalty on the tablet.

- **The request.** The domain layer creates a `WriteRequest { status: 'pending' }` targeting the
  current run generation. In the same step it optimistically updates `Attempt.gates`:
  `source: 'operator-write'`, `provisional: true`. Every on-site client sees the correction in the same
  push cycle. **The tablet itself shows nothing before that push**: it renders the server's optimistic
  value and the write's `pending` state, never a local guess (`CONTRACTS.md` §2.9).
- **The command.** The write is issued through Canoe123's correction command, which carries an explicit
  race id, so a closed Phase is writable.
- **The echo.** Upstream recalculates and pushes the race immediately, and that push is the echo.
  - If it matches, the status is `confirmed`.
  - If it differs, the status is `mismatched`, and `gates` shows what upstream actually holds.
  - If a re-run starts first, the status is `superseded`.
- **No echo** is not engineered as a timeout (`DECISIONS/ADR-010`). It is a failed write (maintainer
  answer A6): the tablet keeps showing it as unconfirmed, with how long it has been pending, and the
  judge re-submits or checks Canoe123 by hand. The client never clears it on its own.

### C — The venue without CIS, and the cold restart

This is now simply how every venue runs: CIS is not consumed (`DECISIONS/ADR-011`).

- **A server started cold at any point of the day** reads the XML snapshot once. From it, it recovers
  every race's rows:
  - run 1's frozen row, and run 2's summary of run 1;
  - placements, age categories, members and course layouts.

  On a real event, a cold start in the afternoon recovered 397 first runs and 384 second runs complete.
- **TCP then carries every change from that moment on**, immediately.
- **If the XML path is not configured or not readable**, `SourceStatus` shows it in the admin UI.
  Values only the snapshot carries are `unavailable{reason}`: age categories, members, and run 1 after
  a restart that happened mid-race. There is never a spectator-facing banner.

### D — The heat

Four Kayak Cross competitors on course at once, one heat of one Phase.

- **`GET /api/oncourse`** returns all four, ordered by `courseOrder`, upstream's on-course position.
  This is the ordering that `ADR-009`'s plurality lacked (`DECISIONS/ADR-009` addendum).
- **Nothing detects an individual finish.** The heat leaves the on-course list together, and the four
  Attempts stay `on-course`.
- **The operator enters the heat order** after conferring with the finish judge. It arrives in the
  immediate result push, as each bib's `placement`, and upstream's placement is the order:
  - athletes with faults are placed after clean finishers, whatever their finish order;
  - in the final, the B-final ranks from 5.

  `outcome` is `ordinal`, with the order within the heat. `faults` carries fault count, faulted gates
  and last clean gate.
- **Standing.** The heat Standing and the Phase Standing, which orders by heat then order, both
  re-assemble. Later, the `XER` classification Phase feeds the event's final classification. It has no
  Attempts.
- **The deadline** ("before the next heat starts") splits cleanly:
  - pushing the order the instant it is ingested is the server's job;
  - how long the finished heat stays prominent is the scoreboard's display policy (§2).

### E — The multi-day event, in either file layout

Saturday: the operator starts c123-server. `AppSettings` mints an `eventId` for the weekend. Each Phase
gets its own `date` at first observation. Pushes go to live-mini under that `eventId`.

- **One file for the whole weekend** (seen in every multi-day recording). Saturday's snapshot already
  holds Sunday's races and start lists. Sunday's Phases simply have Sunday's date. The operator does
  nothing.
- **One file per race day** (the maintainer's own preference). On Sunday the operator points Canoe123
  at a new file. The upstream event id in the snapshot changes, and the operational continuity check
  notices. That check is the successor to `EVIDENCE.md` Exhibit 7's fingerprints. It uses that id as
  an input, never as identity, and it **does not reset `eventId`**. Sunday's Phases get Sunday's date
  under the same event. The operator does nothing.
- **Either way, the spectator sees one calendar entry**, with results grouped by Phase date.
- **Starting a genuinely different competition** on the same laptop needs one deliberate action in the
  admin UI. That is never inferred from data.
- **Nothing assumes either layout.** Day grouping comes only from Phase dates, never from the event's
  own date range, which is operator-entered and was a day off at one recorded event.

### F — The re-run

An athlete is obstructed, and the jury grants a re-run.

- **The trigger.** The operator puts the bib back on course in a race where it already has a result.
  Upstream shows its "overwriting results" warning, and a new start follows.
- **The domain layer starts run generation 2** (`DECISIONS/ADR-013`). In one push, `run` becomes 2, and
  `outcome`, `gates`, `placement`, `pairTotal`, `underReview` and `faults` become `not-yet`. `status`
  becomes `on-course`.
- **What people see.** The scoreboard and live results show the athlete as if that run had not
  happened yet (maintainer answer Q2). The old result is not shown. The athlete drops out of the
  placed part of the standing until the re-run's own result push places them again.
- **Writes and checks.** A pending penalty write against run 1 resolves to `superseded`. Judges' checks
  of run 1's gates do not carry over.

### G — Left the course without a finish

A slalom athlete is removed from the course mid-run.
- **What TCP shows.** The athlete disappears from the on-course list at once. Upstream sends no push
  with the reason: a removal before the finish is one of its silent paths.
- **The domain layer** sets `status: left-without-finish` immediately. This is an observed fact with
  no reason, never inferred as DNF.
- **The reason** (DNF, DSQ) follows from the XML snapshot at about 35 s, or earlier if another
  athlete's push carries it. The scoreboard can show "off course" at once, and the mark when it is
  known.

### H — A result under review

The operator marks a result as under review, shown as an asterisk on upstream's own output.

- **The push.** Upstream pushes the race, and `underReview` becomes `true` on the Attempt and on every
  Standing entry for it. Scoreboard and live results show the mark (maintainer answer Q7).
- **Independence from `provisional`.** `underReview` means an official is holding the result.
  `provisional` means judging may still move it. They are independent, and a client shows each as it
  chooses.
- **Clearing.** When the operator clears the mark, the next push sets `underReview: false`.

### I — In-race corrections, and the re-baseline

Results move during a race day (`DECISIONS/ADR-015`). Four routine cases, each walked through the
contract:

- **A DNS cleared when the athlete turns up.** The operator clears the mark in the results grid.
  Upstream pushes the race at once, and the athlete's row is simply absent from a first-run race's
  push. That absence in a complete statement is a retraction (§4 INV-7): `status` returns to
  `not-started`, the mark's `no-result` outcome to `not-yet`, and the change is pushed as explicit
  `not-yet` values. The athlete then starts, races and finishes normally. Recorded three times, and
  all three raced. Had the DNS come from the start judge's terminal instead, upstream would have
  pushed nothing, and the retraction would come from the XML at the next save, guarded so that a
  snapshot written before the push cannot undo a later result.
- **A finish given to the wrong bib.** Bib 55 is shown as leader with 48.64 s. The operator takes
  the finish away on the on-course grid and gives it to bib 56. Upstream never clears bib 55's stored
  row, and keeps pushing it. But the on-course stream lists bib 55 running again, with its start and
  no finish. That contradicts the finish (§4 INV-2d): bib 55 returns to `on-course` and drops out of
  the placed part of the standing at once, and a `contradicted-finish` diagnostic appears. Bib 56's
  new row is presented normally. Both rows carry the same finish time for a moment, so a
  `duplicate-finish` diagnostic is raised too. When bib 55 finishes for real, 40 s later, its row
  carries a different finish time, and the contradiction is lifted. Without INV-2d the board would
  have shown a false leader for 31 s.
- **Several results shifted back.** Three athletes were credited with each other's finishes, then
  corrected one by one. Each correction is a results-grid edit, pushed immediately; each push is a
  complete statement of the race, so each athlete's row is replaced by its own value as the operator
  reaches it. In between, the standing shows exactly what upstream's table shows. The XML snapshot
  written mid-correction shows two bibs with one finish; that is presented as upstream's state, with
  a diagnostic, and the next push resolves it.
- **A stale value that nothing clears.** A wrong result stays in upstream's table on a path that
  pushes nothing, and the athlete never finishes again. The operator opens the admin UI and runs the
  re-baseline for that race (§4). The domain layer discards what it retained for the race, reads the
  current XML snapshot, presents it, and pushes the race to every scoreboard and to live as a
  replace. The next TCP push refills the TCP slots. The response shows the snapshot's write time, so
  the operator knows whether the correction was already in it, and the action is safe to repeat.

---

## 7. Identity provenance invariance — why it appears in the contract, not just an ADR

The maintainer's requirement that the live-ingest contract must not change shape when a future
central calendar/registry exists is not a footnote — it is why `CONTRACTS.md` §1.1 states identity
as opaque *before* a single entity is defined, rather than as an implementation note. The full
argument, what it costs today, and the risk it heads off (a reversal of which system is the source
of truth for who is racing) is in `DECISIONS/ADR-006-identity-provenance-invariance.md`.

---

## 8. What this rejects, and why

Unchanged from the direction accepted in round one, now final: no event bus, no message broker, no
sixth "domain service" repository, no merging of the five repositories (`CONSTRAINTS.md` §1.4
forbids the last outright), no event-sourced log. All five deployables stay five; every wire
protocol in `CONTRACTS.md` §7/§8 is REST plus one push mechanism — WebSocket on-site, Server-Sent
Events for the public tier (§8.4, pinned down under wire-precision review; the two never needed to
match, since only the on-site tier's clients ever write anything back). What changed since round one
is entirely inside the domain model — the
entity spine, the observation envelope, and the `(phaseId, bib)` identity correction — not the
technology or topology around it. `DECISIONS/ADR-007` states plainly what is given up by *not*
generalising the on-site contract to be vendor-neutral as well: a third-party adopter's bridge gets
the public live tier, but cannot reuse `c123-scoreboard` or `c123-penalty-check`, because those speak
a contract intentionally shaped around what Canoe123 emits. That is judged the right trade for a
topology fixed to one on-site vendor (`CONSTRAINTS.md` §1.1) — but it is a trade, stated, not an
oversight.

**Also out of scope, stated rather than left silent:**
- **Automatic failover to a backup Canoe123 instance.** Switching is the timekeeper's manual work: the
  server is re-pointed by hand (maintainer answer Q8). `SourceStatus.tcp.upstreamInstance` shows which
  instance is live, and nothing acts on it.
- **CIS.** It is not consumed at all (`DECISIONS/ADR-011`).
- **Client configuration and remote client control.** This covers ConfigPush, `clientId`, per-IP
  client records and remote scoreboard control from the admin UI. They are an operational concern,
  not domain truth. The maintainer decided they stay outside the redesign (c123-server#169). They
  keep today's mechanism, and they are fixed independently, before or after the redesign, then pinned
  by regression tests (c123-server#3, #145, c123-scoreboard#127). The contract neither carries nor
  constrains them.
