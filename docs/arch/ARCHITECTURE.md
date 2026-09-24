# Architecture — c123 Ecosystem

The target state `CONTRACTS.md` implies. Read that document first — this one explains why it is
shaped the way it is, where the five deployable pieces sit around it, and walks the scenarios the
brief requires. Every principle below is traceable to a named symptom in `EVIDENCE.md`; a principle
that isn't has been cut.

---

## 1. The domain model, briefly

```
Organiser (cloud tenant only)
  └─ Event (bridge- or, later, registry-assigned; stable across days)
       └─ Category (Canoe123 Class; carries `discipline`)
            └─ Phase (one Canoe123 RaceId; carries `date`, `roundKind`, `status`)
                 └─ Attempt (keyed by phaseId + bib — not entryId, see below)
                      ├─ entry: Observed<{entryId}>   — a mutable pointer, not a fixed key
                      ├─ status, outcome, gates        — all Observed<T>
Entry (one competitor within a Category, keyed by Canoe123's `Id`)
Standing (derived per Category, never stored as primary state)
```

Two deliberate departures from what Canoe123's own vocabulary suggests:

**"Race" does not survive as a single entity.** Today it conflates what this model splits into
`Category` (K1M) and `Phase` (K1M's second run) — `EVIDENCE.md` Exhibit 8 is every client
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
upstream interface (TCP, UDP, XML, CIS). Every other deployable renders what the domain layer
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
design never computes any of them: `Standing.rank` is mechanical arithmetic over `Attempt.outcome`
values plus a narrow, stated exception for relaying an upstream tie-break assertion (`CONTRACTS.md`
§5) — never an invented competition rule. `Phase.status`'s `official` value is Canoe123's own
judgement, relayed, not decided by us. There is nothing here to make pluggable for a second
federation, because nothing here encodes a federation's rules in the first place.

---

## 3. The five deployables

| Component | Owns | Does not own |
|---|---|---|
| **c123-server** | The domain layer entirely: ingest across TCP/UDP/XML/CIS, the merge invariants (`CONTRACTS.md` §4), `Standing` computation, write routing and confirmation tracking, translation into both the on-site and live-ingest contracts. | Any rendering decision. |
| **c123-scoreboard** | Display-lifetime policy, layout, locale, visual emphasis — rendering the on-site contract (§7). | Finish detection, gate parsing, merge, precedence — all retired from its `providers/utils/` layer by having nothing left to decide there. |
| **c123-penalty-check** | Write initiation (including against closed Phases, `CONTRACTS.md` §2.9), its own workflow-tracking state ("has a judge visually compared this gate against the paper protocol") — kept, but now keyed on the domain's own `(phaseId, bib)` rather than a fourth incompatible fingerprint (`EVIDENCE.md` Exhibit 7's third entrant). | Gate parsing — retires its second, incompatible parser entirely. |
| **live-mini-server** | A tenant-scoped store of exactly what the ingest contract asserts (`CONTRACTS.md` §8), applying the *same* merge invariants as c123-server (§4 is not on-site-specific), durability across on-site disconnection, tenant isolation, the public calendar (§8.4), accepting direct organiser corrections independent of the bridge being online (§8.5). | Ranking, lifecycle status, or any other recomputation — retires `EventLifecycleService`'s independent judgement and the two-parser XML re-ingestion of `EVIDENCE.md` Exhibit 9. |
| **live-mini-client** | Spectator-facing layout and locale, its own (likely lighter) display-lifetime policy. | Everything a client never owned. |

---

## 4. Data flow

```
Canoe123 — TCP push, UDP push, XML file, CIS poll
        │  observedAt captured here, at the ingest boundary — never at outbound serialisation
        ▼
c123-server domain layer
   merge invariants (§4) → Observed<> state → Standing computation
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
| `Category`/`Phase`/round identity derived once, structurally, never re-parsed from a string per client | Exhibit 8 — identity derived by regex, with presentation language leaking into the derivation |
| Closed, language-free status and outcome vocabularies asserted by the domain layer | Exhibit 10 — five domain rulings, one of them duplicated, inside a file whose job was display reshaping |

---

## 6. Scenarios

### A — The late rotation

Run 2 beats run 1. The domain layer does not wait for Canoe123's `Total`/`Pen` fields to say so —
it computes `totalSeconds` itself from OnCourse's own `Time` and per-gate penalties, because that
arithmetic is ours to do and needs no upstream confirmation. **Not as a single computation at the
instant `dtFinish` transitions** — `DERIVATIONS.md` §4.3 corrects that: real recordings show gate
judging can still be catching up for several seconds after `dtFinish` fires, sometimes changing the
total materially. The computation is ongoing, recomputed on each subsequent OnCourse message for the
same Attempt, until the gate count is complete or `Results`/CIS supersedes it.

- **t+1s:** `Attempt.outcome` set — `confidence: inferred`, `provisional: true` (TCP Results'
  independently-sourced `Total`/`Pen`, or CIS, haven't corroborated yet, and the mechanical total may
  still be revised by a trailing gate judgement, per `DERIVATIONS.md` §4.3). `Standing` recomputes
  immediately: this Entry's best total now beats their run 1 (retained in domain state by monotonic
  knowledge — see Scenario C for what backs it), so rank changes. `attempt.updated` and
  `standing.updated` push on-site and, in the same step, translate into the live-ingest push — not a
  second computation.
- **t+10s:** if CIS is configured, its poll has likely already corroborated: `confidence` flips to
  `authoritative`, `provisional` to `false`, value unchanged in the ordinary case.
- **t+30s:** TCP `Results` rotates round regardless of CIS. While CIS is configured and has already
  reported, `cis` outranks `tcp` for this field-category (`CONTRACTS.md` §4 INV-2), so this message
  updates `tcp`'s own retained slot only — the presented value is unchanged whether the rotation
  agrees or not, and never oscillates on the rotation period. If it disagrees, that disagreement is
  surfaced as a diagnostic and triggers a fresh, targeted CIS read for this bib rather than being
  adopted from TCP directly or silently discarded (§4 INV-2b). Without CIS configured, `tcp` is the
  top-ranked available source throughout, so the rotation's own value *is* what's presented — still
  never a regression, since it is that same source correcting itself, not a lower-ranked source
  overriding a better one.
- **The scoreboard at t+1s already shows the correct leader**, not Canoe123's own stale value; the
  30-second rotation window this scenario is built to expose never produces a visible wrong answer,
  only a `provisional` flag a client may or may not choose to render.
- **The spectator sees the same thing**, on the same trigger (the Attempt changing), typically a
  second or two later than on-site for the network hop — not a different value produced by a
  different reconciliation path. If the cloud link is down, the spectator sees the last value,
  ageing, until reconnection replays the backlog — safely, because every push is an idempotent
  upsert (§4 INV-5).

### B — The write echo

A judge corrects a gate penalty on the tablet.

- The domain layer creates a `WriteRequest { status: 'pending' }` and, in the same step, optimistically
  updates `Attempt.gates` — `source: 'operator-write'`, `confidence: authoritative` (a human just
  asserted it), `provisional: true`. Every on-site client, not only penalty-check, sees the corrected
  value within the same push cycle as any other Attempt update — there is no separate "my own write"
  channel.
- The write is issued upstream via Canoe123's `PenaltyCorrection` command, which — unlike `Scoring` —
  carries an explicit `RaceId` and is documented for post-completion use, which is what makes writing
  against a closed Phase (the maintainer's requirement, `CONTRACTS.md` §2.9) possible without CIS.
- **When the echo arrives:** if it matches, `WriteRequest.status → 'confirmed'`, and the same
  `Attempt.gates` field gets a newer `known` observation, now `source: 'tcp'`, `provisional: false`.
  If it differs, `WriteRequest.status → 'mismatched'` **and** `Attempt.gates` updates to what the
  echo actually says — the domain layer never keeps asserting what was requested once the record of
  truth says otherwise, but the mismatch itself is never swallowed; both facts are visible.
- **If the echo never arrives:** per the maintainer, this is not engineered as a timeout. `pending`
  persists indefinitely; every client can compute "pending for how long" from `submittedAt` and
  render that as it sees fit, but the contract asserts no threshold at which pending becomes failure.
  Resolution is operator-facing, outside this contract's scope by design.

### C — The unlicensed venue

CIS is not configured; a two-run race is running; run 2 beats run 1. **Nothing is missing, in the
ordinary case or the restart case — corrected here after a real two-day event showed the original
version of this scenario was wrong about which one needed CIS.**

If this server session has been running continuously since run 1, the full run-1 `Attempt`, gates
included, was captured in domain state while it was live, and monotonic knowledge (§4 INV-1) means it
does not vanish because run 2's wire message doesn't repeat it. If instead this server instance was
started fresh between run 1 and run 2 — genuinely never having observed run 1 live — the XML snapshot
recovers it anyway: Canoe123's own export keeps run 1's `<Results>` row, frozen from the moment it
finished, independently of anything our server did or didn't see, and run 2's own row separately
states which run won and summarises the other (`CONTRACTS.md` §4/§6, `DERIVATIONS.md` §4.5). `Standing`
computes identically in every case, because the comparison is mechanical arithmetic regardless of
which source supplied the inputs.

**What this scenario's earlier version got wrong:** it credited CIS with "robustness to a restart" —
the one thing left needing a licence, in a design otherwise built not to depend on one. Checked
against a real weekend where CIS was unreachable throughout (61,000 polls, every response empty) and
a cold-started analysis still recovered complete two-run detail for every finisher from the XML
snapshot alone, that credit belongs to the snapshot, not to CIS. What CIS actually buys, once XML
already supplies completeness, is on-demand immediacy — an answer *now* rather than waited on for the
snapshot's own ~35 s rewrite cycle — which matters for latency-sensitive cases, not for whether this
scenario's numbers are ever wrong (`DECISIONS/ADR-004`'s Revision).

**How anyone finds out there's a gap at all, in the one case that remains genuinely unrecoverable —
neither this server nor any prior instance ever observed run 1 live, *and* the XML path is itself
unavailable (misconfigured, or the file unreadable):** the operator sees `SourceStatus` reflect it in
the admin UI at any time, informational, not an alert; a client encountering the resulting
`unavailable` value renders its ordinary "not known" treatment — the same one it would use for any
not-yet-known fact — because nothing about this narrower case is structurally different from any
other absent value. There is no spectator-facing "results may be incomplete" banner, deliberately:
the maintainer was explicit that staleness should be borne quietly, never nagged about.

### D — The heat

Four Kayak Cross competitors on course at once, one Phase, no `dtStart`/`dtFinish`.

- `GET /api/oncourse` returns all four `Attempt`s under the same `phaseId` — plural by construction
  (`CONTRACTS.md` §7), never a singleton "current competitor." This is what admits Cross without a
  structural change: the model never assumed one active Attempt per Phase in the first place.
- **Nothing detects an individual finish**, because nothing upstream signals one — checked directly
  against a recorded heat: `chStart`, `chFinish`, `Completed` never transition per-competitor for
  Cross, and OnCourse clears for the whole heat together, well after the fact. The authoritative
  signal is the `Results` stream's `Rank`/`Time` field for a bib becoming non-empty — and per the
  maintainer, **this is not a detection at all**: it is the operator's own assertion, entered after
  conferring with the finish judge, at human pace, possibly one bib at a time rather than all four
  together.
- Each bib's `outcome: { kind: 'ordinal', order }` arrives as its own ordinary Attempt update —
  `source: 'operator-assertion'`, `confidence: authoritative` — the instant it's ingested, no
  batching. `Standing` for the heat is legitimately partial while some bibs are still `not-yet`; this
  is monotonic knowledge doing exactly its job, not a bug to paper over.
- **What bends:** the finish-detection *mechanism* — a different source, a different latency
  profile, human-paced rather than sub-second. **What does not bend:** the entity model. `Phase`,
  `Attempt`, `Category.discipline`, `Outcome`'s `ordinal` variant were all already generic enough;
  Cross exercises values these structures already admitted, not new ones.
- **The "before the next heat starts" deadline is split cleanly by the fact/presentation line
  (§2):** the server's obligation is to push the operator's assertion the instant it is ingested,
  with no artificial delay — that is a fact-timeliness guarantee, unconditional. How long the
  scoreboard keeps the just-finished heat's result on screen once the next heat's on-course view is
  already live is display-lifetime policy, owned by the scoreboard, the same category of decision as
  today's grace-period constants.

### E — The multi-day event

Saturday: the operator starts c123-server for the first time this weekend. `AppSettings` (the
existing persisted-settings mechanism, `c123-server/CLAUDE.md`) gets a new `eventId`, "Jarní pohár
2026." Each Phase that runs gets `date: 2026-09-19`, fixed at first observation (`CONTRACTS.md`
§2.4). Attempt-level pushes go to live-mini under this `eventId` throughout the day.

Saturday evening, the laptop is closed. Sunday morning, the operator reopens it, pointed — as is
normal Canoe123 operating practice — at a fresh export for Sunday's races. **`AppSettings` still
holds Saturday's `eventId`; nothing about this requires operator action.** The technical layer that
notices "this looks like a different underlying Canoe123 session" (the successor to today's three
fingerprints, `EVIDENCE.md` Exhibit 7 — kept, but narrowed to exactly this operational question, and
separated from event identity, which it was never actually deciding) fires purely as an operational
signal; it does not reset `eventId`. Sunday's Phases get `date: 2026-09-20` under the same event.

**The spectator sees one calendar entry**, opened to show Saturday's now-final results and Sunday's
live results grouped by date — never two separate events on the shared cloud service, which is
today's actual complaint (`BRIEF.md` §5.7). **The operator does nothing** for this, the ordinary
case. Starting a genuinely different competition on the same laptop later is the one case that needs
a deliberate action — an explicit "start new event" in the admin UI — kept rare and explicit rather
than inferred from data, because inferring it from data is exactly the fragile 50%-overlap heuristic
`EVIDENCE.md` Exhibit 7 already shows failing.

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
