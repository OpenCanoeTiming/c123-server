# Client Obligations — c123 Ecosystem

A derived checklist, not a normative document: the sections each item cites are normative, and
where this file and a cited section differ, the cited section wins. **When a cited section changes,
update this file in the same change;** `scripts/check-obligations.js` checks both that every
citation resolves and that no cited section changed without this file. Citations name a document
without `.md` and its section, or `ADR-NNN` for `DECISIONS/ADR-NNN-*.md`.

For each deployable other than c123-server, as named in `ARCHITECTURE.md`'s "The five deployables",
its own section plus the Common section is the definition of done for its migration to the new
contract. Nothing here adds an obligation. Disagreements between documents, and duties implied but
not stated, are listed unresolved under "Gaps and conflicts". Derived at 0c199af, plus the working
tree's visual-regression bullet in TEST-ARCHITECTURE's "What is deliberately not tested".

---

## Common

### All four deployables

- [ ] Never reinterpret upstream-derived data, not even "just this once" for one feature; c123-server's domain layer is the only interpreter (ADR-002; ARCHITECTURE §2).
- [ ] Import no interpretation logic from another repository; share only types and data (ADR-002; TEST-ARCHITECTURE §3.1).
- [ ] Take the contract's types and its two JSON schemas from `@opencanoetiming/c123-contract` as a pinned dependency; never restate the contract in a parallel hand-written schema (ARCHITECTURE §3, §5).
- [ ] Treat `phaseId` (Canoe123 `RaceId`), `entryId` (Canoe123 `Id`) and `classId` as opaque; never parse them for class, run, age category, crew or day (CONTRACTS §1.1, §2.3, §2.5; ADR-001).
- [ ] Take structure only from its own fields: `Class.discipline`, `Phase.kind`, `Phase.pair`, `Phase.scoringKind`, `Phase.heats` (CONTRACTS §2.3, §2.4; ADR-014).
- [ ] Key every Attempt-level record by `attemptId` = `(phaseId, bib)`, never by bib alone (CONTRACTS §2.6; ARCHITECTURE §5).
- [ ] Keep `null` distinct from an absent key and from `0`; never coerce `null` to `0` or `""` (CONTRACTS §1.2, §1.3; ARCHITECTURE §5).
- [ ] Branch on `error.code` only; never parse `error.message` (CONTRACTS §1.4).
- [ ] Pin a specific domain-state fixture set by id and version in a committed reference; never a floating "latest" (TEST-ARCHITECTURE §6).
- [ ] Consume only fixtures whose `admitted` block is complete (TEST-ARCHITECTURE §4, §6).
- [ ] Fail, loudly, on a `domainLayerVersion` mismatch between a fixture and the consumer; re-pin deliberately instead of warning (TEST-ARCHITECTURE §4).
- [ ] Keep tier-4 smoke tests few; they prove only that the wiring connects (TEST-ARCHITECTURE §3.4).

### Rendering clients — c123-scoreboard, c123-penalty-check, live-mini-client

**Boundary**
- [ ] Own only presentation: display lifetime, layout and pagination, locale, visual emphasis, non-domain filtering, the choice of featured competitor (ARCHITECTURE §2).
- [ ] Detect no finish, parse no gate string, merge no sources and apply no precedence (ARCHITECTURE §3; TEST-ARCHITECTURE §3.1).
- [ ] Take a finish only from `status` becoming `finished`; never from a change in `running.elapsedSeconds`, such as whole seconds turning into decimals during a split hold (CONTRACTS §2.6; DERIVATIONS §4.1).
- [ ] Compute no rank, age-category rank or order; show `placement` and `Standing` as delivered (ARCHITECTURE §2; CONTRACTS §5; ADR-012).
- [ ] Decide no Phase status; show `Phase.status` from its closed set (CONTRACTS §3.1; ARCHITECTURE §5).
- [ ] Never infer a correction from `Phase.status`; recognise changed results only from field-level changes of `outcome`, `gates` or `placement` (CONTRACTS §3.1).
- [ ] Treat no `Phase.status` value as final (CONTRACTS §3.1).
- [ ] Label status, format, round and discipline tokens by a client-side lookup; expect no natural-language domain text on the wire (CONTRACTS §1.3; ARCHITECTURE §2).
- [ ] Never assume `nation` is a country, for example by rendering it as a flag (CONTRACTS §2.5).
- [ ] Group results by day only from `Phase.date`, never from `Event.details.startDate` or `endDate` (CONTRACTS §2.2; ARCHITECTURE §6.E).

**Identity**
- [ ] Identify a run by `Attempt.bib`; expect `Entry.eventBib` to be `unavailable{not-applicable}` where bibs are issued per race (CONTRACTS §2.5).
- [ ] Treat `Attempt.entry` as a mutable pointer: a `known → known` change is a correction of who raced, applied like any field update (CONTRACTS §2.6, §4; ARCHITECTURE §1).
- [ ] Treat `entryId` as identifying a competitor within one event only; use a member's `externalId` `{scheme, value}` for identity across events (CONTRACTS §2.5; ADR-006).
- [ ] Render a person with `externalId: null` as an ordinary participant, never a degraded one (CONTRACTS §2.5, §8.3).

**Observed states**
- [ ] Handle all three envelope states on every `Observed` field (`known`, `not-yet`, `unavailable`), and keep a `known` value of `0` distinct from both others (CONTRACTS §1.2).
- [ ] Render `unavailable` by default as "not known", exactly like `not-yet`, whatever its `reason`; the one allowed distinction is hiding a field or column that is `not-applicable` (CONTRACTS §1.2).
- [ ] Show a missing or degraded source only through the affected values; never a spectator-facing banner (CONTRACTS §1.2, §2.8, §6; ADR-011).
- [ ] Read `provisional` (may still move) and `confidence` (how it was produced) as two facts; never conflate them (CONTRACTS §1.2).
- [ ] Mark `provisional` and `underReview` visibly, distinctly from each other and from a settled value; both can be true at once (ARCHITECTURE §2, §6.H; CONTRACTS §2.6).
- [ ] Tell whether a value is still accruing from `outcome.kind` being `running`, never by cross-referencing `status` (CONTRACTS §2.6).
- [ ] Display `running.elapsedSeconds` and `penaltySeconds` as delivered: upstream's own display, including its split hold (CONTRACTS §2.6; DERIVATIONS §4.3).
- [ ] Tick the running time locally, if at all, only through the injected `Clock`, snapping to every new `running` value and stopping the instant `status` leaves `on-course` (CONTRACTS §2.6; TEST-ARCHITECTURE §5).
- [ ] Stop the tick `runningStaleAfterSeconds`, a named constant of 3 s, past the last `running` value's `observedAt`: freeze the display at that value and show it as stale, with its age; never clear it by time and never let it run on, on either tier (CONTRACTS §2.6).
- [ ] Render `left-without-finish` as an observed removal with no reason; show a mark only once `status` carries one; never infer DNF (CONTRACTS §2.6, §3.2, §7.1; ARCHITECTURE §6.G).
- [ ] Render `outcome.kind: 'no-result'` as its mark, whatever time the row carried; never let a time suppress a mark (CONTRACTS §2.6).
- [ ] Show `non-ranked` as raced and timed but unranked, and `ral` where its `placement` puts it (CONTRACTS §2.6).
- [ ] Read a second-run mark as describing run 2 only; the combined result stays in `placement` and `pairTotal` (CONTRACTS §2.6, §5).
- [ ] Render `Gate.penalty: null` as not judged, never `0`; accept team values that are member sums such as 4, 52, 100 or 150 (CONTRACTS §1.3, §2.6; ADR-014).
- [ ] Expect `memberPenalties` to be absent until the next XML snapshot, and present afterwards (CONTRACTS §2.6; DERIVATIONS §4.6).
- [ ] Expect `gates: unavailable{not-configured}` when no course is configured, with the penalty sum still in `outcome.penaltySeconds` (CONTRACTS §2.6, §2.12).
- [ ] For Kayak Cross, show `faults` (its `gates` is `unavailable{not-applicable}`) and the heat order from `ordinal.order` (CONTRACTS §2.6).
- [ ] Render `timeToBeat` by its `mode`, unsigned `target` or signed `delta`, with `holder`; never as a rank (CONTRACTS §2.6).
- [ ] Show the six diagnostic kinds, `source-disagreement`, `contradicted-finish`, `duplicate-finish`, `stale-mark`, `member-sum-mismatch` and `unparseable-cell`, to the admin audience only (CONTRACTS §4, §7.1, §7.2).
- [ ] While a half-correction stands, present exactly what upstream states, with no hiding and no marking (CONTRACTS §4; ARCHITECTURE §6.I).

**Results and standings**
- [ ] For a second run of a pair, show `outcome` as run 2's own time, penalty and total, and `pairTotal` as the combined result (CONTRACTS §2.6, §5).
- [ ] Take which run counts from `countingRun`, which carries upstream's own fact for display (CONTRACTS §2.6, §5).
- [ ] Show a result without a rank until `placement` is known; never fill in a computed rank (CONTRACTS §5; ADR-012).
- [ ] Render Standing entries in delivered order; unplaced entries (`rank: null`, `order: null`) come last, in an order with no ranking meaning (CONTRACTS §5).
- [ ] Where standings are shown, show age-category standings alongside the class standing, not instead of it (CONTRACTS §2.3; ADR-014).
- [ ] Render a `classification` Standing from its own entries, with `decidedIn`, as upstream last built it; a classification Phase has no Attempts (CONTRACTS §2.4, §2.7; DERIVATIONS §4.10).
- [ ] Show a classification's age from its `Standing.asOf`, compared with the `asOf` of its contributing Phases' standings, so that a lag behind them is visible (CONTRACTS §2.4, §5).
- [ ] Identify each Standing by its `standingKey` (CONTRACTS §2.7, §5).

**Push, snapshot and sequencing**
- [ ] Hydrate by the handshake: open the stream, buffer messages by `seq`, request every snapshot needed, discard buffered messages with `seq` at or below the smallest `asOfSeq`, apply the rest in `seq` order, then apply live messages in `seq` order (CONTRACTS §1.6, §7.2, §8.4).
- [ ] After any reconnection, repeat the whole handshake for every resource held; there is no replay and no resume, and the last applied `seq` serves only to discard already-applied messages after re-hydration (CONTRACTS §1.6, §8.4).
- [ ] Use `seq` only to tell whether a change is already incorporated; never as ranking or authority (CONTRACTS §1.6).
- [ ] Create an entity when a `*.updated` message names an id not held; the first message for a new id carries the whole resource (CONTRACTS §1.6).
- [ ] Apply `attempt.updated`, `phase.updated`, `entry.updated` and `class.updated` as per-field deltas; an omitted field is untouched, never reset (CONTRACTS §7.2).
- [ ] Apply an explicit `{ "state": "not-yet" }` in a delta as a reset of that field (CONTRACTS §7.2, §8.3).
- [ ] Replace the whole resource on `standing.updated` and `course.updated` (CONTRACTS §7.2).
- [ ] Replace the whole on-course set, in the message's order, on every `oncourse.updated` (CONTRACTS §7.2, §8.4).
- [ ] Apply `scope.replaced` as a replace, never a merge: remove every Attempt and Standing of the scope absent from the message, and leave Phases, Entries, Classes and Courses untouched (CONTRACTS §7.2, §8.4; ADR-015).

**Retraction and re-run**
- [ ] Show a retraction at once: `status` back to what the on-course stream shows or `not-started`, the retracted fields `not-yet`, the entry out of the placed standing (CONTRACTS §2.6, §3.2; ARCHITECTURE §6.I).
- [ ] Show a contradicted finish as running again: `status: on-course`, `outcome: running`, no placement (CONTRACTS §2.6, §4; ARCHITECTURE §6.I).
- [ ] On a new run generation, stop showing the old result and show the athlete as if that run had not happened; to say "re-run", read `run > 1` with the current status (CONTRACTS §2.6; ADR-013; ARCHITECTURE §6.F).

**Clock and display lifetime** — part of every client migration's definition of done
- [ ] Read time in every display-lifetime rule through an injected `Clock` (`now`, `setTimeout`, `clearTimeout`, `requestFrame`, `cancelFrame`); never call `Date.now()`, `setTimeout`, `setInterval` or `requestAnimationFrame` directly (TEST-ARCHITECTURE §5).
- [ ] Re-evaluate every display-lifetime rule on a clock tick, not only when data arrives, so a lapsed grace period evicts on elapsed time alone (ARCHITECTURE §2; TEST-ARCHITECTURE §5).
- [ ] Wrap the real `requestAnimationFrame` in the production `Clock`; advance frames explicitly in the test `Clock` (TEST-ARCHITECTURE §5).
- [ ] Use a fake `Clock` in tests, never a global fake-timer patch (TEST-ARCHITECTURE §5).
- [ ] Keep compositor-driven animation (smooth `scrollTo` or `scrollIntoView`, CSS `@keyframes`) behind `prefers-reduced-motion`, asserted by Playwright once settled (TEST-ARCHITECTURE §5).
- [ ] Apply the Clock rule during this migration, not as a retrofit; rewrite or delete the sites the server now covers, such as the on-course reducer, the run-2 merger and the on-course penalty cache (TEST-ARCHITECTURE §5).
- [ ] State the client's own display-lifetime policy, such as grace periods, highlight duration, auto-scroll pacing and the departing timeout, so tests assert against it (TEST-ARCHITECTURE §3.3, §7).

**Tests**
- [ ] Give every display-lifetime rule a tier-3 test that advances a fake `Clock` (TEST-ARCHITECTURE §5).
- [ ] Feed tier-3 tests domain-state fixtures, from tier 2 or synthetic, never recordings or raw Canoe123 traffic (TEST-ARCHITECTURE §3.3).
- [ ] Drive the tier-3 harness as specified: initialise from the fixture's `kind: "hydration"` step as the handshake would, clock at its `observedAt`; per step, advance the clock to the step's `observedAt` and apply the delta as the transport would; assert after steps and after advancing the clock with no new step (TEST-ARCHITECTURE §3.3, §4).
- [ ] Write threshold cases as hand-authored `source.kind: "synthetic"` fixtures with a `reason`, in the same format (TEST-ARCHITECTURE §3.3, §4).
- [ ] Own the assertions and thresholds in the client's repository; share only the fixture format (TEST-ARCHITECTURE §3.3).
- [ ] Retire bespoke mock-WebSocket servers and fixture loaders; do not port penalty-check's mock server into live-mini (TEST-ARCHITECTURE §9).
- [ ] Write no tier-1 tests: a rendering client implements no merge rule (TEST-ARCHITECTURE §3.1).

### On-site clients — c123-scoreboard, c123-penalty-check

- [ ] Hydrate from the REST reads that apply: `/api/events/current`, `/api/classes/{classId}/phases`, `/entries`, `/standings`, `/api/phases/{phaseId}/attempts`, `/api/oncourse`, each carrying `asOfSeq` (CONTRACTS §7.1).
- [ ] Take live updates from the WebSocket `/ws`, every message carrying `seq` (CONTRACTS §7.2; ARCHITECTURE §8).
- [ ] Handle `404 event-not-found` on `/api/events/current` as "no event configured yet" (CONTRACTS §1.4, §7.1).
- [ ] On `event.changed` naming a different `eventId` than the one held, discard everything and re-hydrate (CONTRACTS §1.6, §7.2).
- [ ] Read `birthYear: number | null`; the on-site tier carries no birth date (CONTRACTS §2.5, §7; ADR-006).
- [ ] Use `format` and `phaseId` as Canoe123-native tokens, verbatim (CONTRACTS §7; ADR-007).
- [ ] Show an unknown `format` token verbatim, with what the structural fields say; never invent a name and never fail to render (CONTRACTS §2.4; DERIVATIONS §9).
- [ ] Keep the on-course set from `/api/oncourse` and `oncourse.updated`, in `courseOrder` with those lacking one last by `startOrder`; several at once and an empty set are both valid (CONTRACTS §7.1, §7.2).
- [ ] Keep a Kayak Cross heat that has left the on-course list at `on-course` until its order arrives; never treat leaving the list as a finish (CONTRACTS §7.1, §7.2; ARCHITECTURE §6.D).
- [ ] Ignore `Standing.anomalies`, which on-site serves for the admin UI only (CONTRACTS §2.7, §5).
- [ ] Treat `/api/sources`, `/api/diagnostics`, `diagnostics.updated` and `POST /api/rebaseline` as admin-audience only; ignore diagnostics and never expose the re-baseline (CONTRACTS §2.8, §4, §7.1, §7.2).
- [ ] Expect an optimistic write in the targeted field as `source: 'operator-write'`, `provisional: true`, in the same push cycle as its `WriteRequest` (CONTRACTS §2.9, §4; ARCHITECTURE §6.B).
- [ ] Keep the client's own screenshot suite for visual regression as its own discipline, outside the four tiers, which neither adopt nor retire it; tier-3 tests assert behaviour on the DOM or view-model, not appearance (TEST-ARCHITECTURE §3.3, §8).

---

## c123-scoreboard

- [ ] Own display-lifetime policy, layout, locale and visual emphasis for the on-site contract (ARCHITECTURE §3).
- [ ] Remove finish detection (`detectFinish`, the inline reducer rule), gate parsing (`parseGates`, `getPenaltyGates`), merge and precedence from `providers/utils/` (ARCHITECTURE §3, §5).
- [ ] Remove the parsing of `raceId` for run, class and category in `raceUtils`, and the Czech " - N. jízda" label built from it; label from `format` and `pair` by lookup (ARCHITECTURE §5; CONTRACTS §1.3; DERIVATIONS §9).
- [ ] Remove the domain rulings in `c123ServerMapper`: time over mark, `*` as under review, race status collapsed to two strings, on-course by `dtStart`, partial-or-full guessing; use `outcome`, `underReview`, `Phase.status`, the on-course set and the delta rules instead (ARCHITECTURE §5; CONTRACTS §2.6, §3.1, §7.1, §7.2).
- [ ] Delete the run-2 merger `br1br2Merger` and its penalty fallback chain; show run 2 from `outcome` and the combined result from `pairTotal` (CONTRACTS §2.6; TEST-ARCHITECTURE §5).
- [ ] Feature by default the first Attempt of the on-course set, the athlete next to pass the finish; offer `featuredByUpstream` only as an optional alternative, never the default (CONTRACTS §7.1; ARCHITECTURE §2; DERIVATIONS §4.8).
- [ ] Show all four Kayak Cross competitors of a heat, ordered by the on-course set (CONTRACTS §7.1, §7.2; ADR-009).
- [ ] Decide how long a finished Cross heat stays prominent as display policy, and test it at tier 3 over the gap between the order push and the next heat (ARCHITECTURE §6.D; TEST-ARCHITECTURE §3.3).
- [ ] Show result and rank as soon as they are pushed, with the provisional mark while judging is in flight (ARCHITECTURE §2, §6.A).
- [ ] Show `underReview` on the board (CONTRACTS §2.6; ARCHITECTURE §6.H).
- [ ] Show "off course" at once for `left-without-finish`, and the mark when it is known (ARCHITECTURE §6.G).
- [ ] Put grace-period and stale-competitor eviction under the `Clock` and a tier-3 test; today it recomputes only when an action is dispatched (ARCHITECTURE §2; TEST-ARCHITECTURE §3.3).
- [ ] Route today's timing sites (`context/constants.ts`, `useDeparting.ts`, `useAutoScroll.ts`, `useHighlight.ts`) through the `Clock` (TEST-ARCHITECTURE §5).
- [ ] Do not expose the re-baseline on a venue board (CONTRACTS §4).
- [ ] Keep client configuration and remote control (ConfigPush, `clientId`, per-IP records) on today's mechanism, outside the contract, pinned by regression tests (ARCHITECTURE §8).

---

## c123-penalty-check

**The penalty write and gates**
- [ ] Write only through `POST /api/attempts/{phaseId}/{bib}/penalty`, body `{ gate, value }` with `value` in {0, 2, 50}; it is the only write (CONTRACTS §2.9, §7.3).
- [ ] Offer no status or mark write; the operator sets and clears marks in Canoe123 (CONTRACTS §2.9, §7.3; ADR-010).
- [ ] Write only finished runs; never write for an athlete on course (CONTRACTS §7.3; ARCHITECTURE §6.B).
- [ ] Send an `Idempotency-Key` on every write: generated once per correction attempt, a UUID sufficing; the same key on a retry; a new key for a revised correction (CONTRACTS §1.5, §7.3).
- [ ] Handle `202` with `Location: /api/writes/{writeId}` and a pending `WriteRequest` on submit, and `200` with the current `WriteRequest` on a retry (CONTRACTS §7.3).
- [ ] While the Attempt is in the on-course set, disable the write, or on `409 write-not-possible` with `reason: 'run-not-closed'` tell the judge (CONTRACTS §7.3; ARCHITECTURE §6.B).
- [ ] Retry a write refused as `run-not-closed` on the first `oncourse.updated` whose `attemptIds` no longer contain the Attempt; reusing the `Idempotency-Key` or taking a new one are both correct, since a `409` creates no `WriteRequest` (CONTRACTS §1.5, §7.3).
- [ ] Hide or disable the penalty write up front for an Attempt whose Entry has `isTeam: true`, since the operator corrects team boats in Canoe123; treat `409 write-not-possible` with `reason: 'team-boat'` only as the backstop (CONTRACTS §2.5, §7.3; ARCHITECTURE §6.B).
- [ ] Handle `404 attempt-not-found` and `400 validation-failed` with `error.details`: a value outside {0, 2, 50}, a gate outside the course, a course not configured (CONTRACTS §1.4, §7.3).
- [ ] Allow writes against closed Phases; they are tracked identically (CONTRACTS §2.9, §7.3; ARCHITECTURE §3).
- [ ] Send every write through the server and keep no terminal channel; nothing reacts to the operator's "reset scoring terminals" (CONTRACTS §7.3; ARCHITECTURE §3; ADR-011).
- [ ] Read penalties only from `Attempt.gates`; delete its own gate parser, including the REST trim path (ARCHITECTURE §3; CONTRACTS §2.6).

**Write confirmation**
- [ ] Show no value of its own before the server's push; render the server's optimistic value (CONTRACTS §2.9; ARCHITECTURE §6.B).
- [ ] Track each write through `write.updated`, which carries the whole `WriteRequest`, or `GET /api/writes/{writeId}` (CONTRACTS §7.2, §7.3).
- [ ] Show a write as `pending`, distinctly, until it resolves; never show it as settled and never clear it on the client's own (CONTRACTS §2.9; ARCHITECTURE §2).
- [ ] Render all four statuses: `pending`, `confirmed`, `mismatched` with `confirmedValue`, and `superseded` (CONTRACTS §2.9, §7.3; ADR-010).
- [ ] On `mismatched`, show what upstream actually holds, as `Attempt.gates` presents it (ARCHITECTURE §6.B).
- [ ] Read `confirmed` as describing the echo, not permanence; show the field's current presented value, and leave the write `confirmed` when a later change arrives (CONTRACTS §2.9; ADR-010).
- [ ] Resolve nothing by elapsed time; show how long a write has been pending, from `submittedAt` (CONTRACTS §2.9, §7.3; ADR-010).
- [ ] Treat a write that stays `pending` as failed and resolve it with the user: re-submit, or check Canoe123 by hand (CONTRACTS §2.9; ARCHITECTURE §6.B).
- [ ] Expect a pending write against a replaced run generation to resolve to `superseded` (CONTRACTS §2.9; ADR-013).
- [ ] Cover request, pending `WriteRequest` and push in the tier-4 smoke test, and stop there; the echo half belongs to tier 1 (TEST-ARCHITECTURE §3.4).

**Gate checks and flags**
- [ ] Hydrate checks and flags from `GET /api/phases/{phaseId}/checks`, which returns every run generation and `asOfSeq` (CONTRACTS §7.1).
- [ ] Apply `check.updated`, whole, where `check: null` means removed, and `flag.updated`, the whole `GateFlag` (CONTRACTS §7.2).
- [ ] Check a gate with `PUT /api/attempts/{phaseId}/{bib}/checks/{gate}`, body `{ checkedBy? }`; re-verify after a correction by repeating it (CONTRACTS §7.4).
- [ ] Remove a check with `DELETE /api/attempts/{phaseId}/{bib}/checks/{gate}`, which returns `204` whether or not one existed (CONTRACTS §7.4).
- [ ] Raise a flag with `POST /api/attempts/{phaseId}/{bib}/flags`, body `{ gate, comment, suggestedValue?, createdBy? }`, with an `Idempotency-Key`; expect `201` and an open `GateFlag` (CONTRACTS §1.5, §7.4).
- [ ] Resolve a flag with `POST /api/flags/{flagId}/resolution`, body `{ note?, resolvedBy? }`; repeating it is safe; handle `404 flag-not-found` (CONTRACTS §1.4, §7.4).
- [ ] Put no `run` in any path; check and flag writes target the Attempt's current generation (CONTRACTS §7.4).
- [ ] Never change a penalty through a flag: apply a suggested value with a penalty write, and resolve the flag separately (CONTRACTS §7.4).
- [ ] Never derive `stale` on the tablet; show the server's `GateCheck.status`, `verified` or `stale` (CONTRACTS §2.10; ADR-016).
- [ ] Show a gate's state by the lookup: `flagged` if an open flag exists, else the check's `status`, else `plain` (CONTRACTS §2.10; DERIVATIONS §6).
- [ ] Key checks and flags by `(attemptId, run, gate)`; a new run generation starts with no checks and no open flags, and a check never carries to a re-run (CONTRACTS §2.10; ADR-013; ADR-016).
- [ ] Keep a check with the Attempt it was made on: a retraction, a contradiction, a result moved to another bib or a re-pointed `entry` never moves or deletes it (CONTRACTS §2.10; ADR-016).
- [ ] Expect checks, flags and pending writes to survive a re-baseline, with each check's `status` recomputed (CONTRACTS §2.10, §4).
- [ ] Drop its own event fingerprint; the server keys the store by `eventId` (CONTRACTS §2.10; ARCHITECTURE §3; ADR-016).

---

## live-mini-server

**Boundary**
- [ ] Store exactly what the ingest contract asserts, per tenant, durable across on-site disconnection (ARCHITECTURE §3).
- [ ] Apply INV-1, INV-3, INV-4, INV-5, INV-6 and INV-2 rule 4, and honour explicit `not-yet`, `DELETE` and the Phase replace; apply none of INV-2 rules 1 to 3, INV-2b, INV-2c, INV-2d or INV-7 (CONTRACTS §4, §8.3; ARCHITECTURE §3).
- [ ] Among bridge observations of one field, present the later-ingested one (CONTRACTS §4, §8.3).
- [ ] Assemble standings as c123-server does, from the pushed `placement` and `ageCategoryId`, without the category-rank check and without the order-anomaly check; rank nothing (CONTRACTS §5, §8; ADR-012).
- [ ] Set each Standing's `asOf` to the ingest time of the latest observation behind any of its entries (CONTRACTS §5).
- [ ] Recompute nothing else: retire `EventLifecycleService`'s independent judgement, the independent ranking and the second XML parser (ARCHITECTURE §3; CONTRACTS §8).
- [ ] Store a second run's `outcome`, which is run 2's own, and its `pairTotal` and `countingRun` as pushed; never recombine the runs (CONTRACTS §2.6, §8).
- [ ] Keep its own `seq` counter: one per server, strictly increasing, persisted, never regressing across a restart (CONTRACTS §1.6).

**Authentication and tenancy**
- [ ] Resolve `X-API-Key` to exactly one `(organiserId, eventId)`; the key is the scope, and no request names its event by a client-supplied id (CONTRACTS §8.1).
- [ ] Fail writes with `401 unauthorized`, `403 forbidden`, or `429 rate-limited` with `Retry-After`; never fail public reads this way (CONTRACTS §1.4, §8.1).
- [ ] Key every entity below Event by `(eventId, localId)`: class, phase, course, entry, attempt (CONTRACTS §8.1; ADR-005).
- [ ] Treat `eventId` and `entryId` as opaque; give no field a meaning derived from how it was minted (CONTRACTS §1.1, §8.2; ADR-006).

**Ingest**
- [ ] Implement `PUT /ingest/v2/classes/{classId}`, `/courses/{courseId}`, `/phases/{phaseId}`, `/entries/{entryId}` and `/attempts/{phaseId}/{bib}` as idempotent upserts returning `200` with the current resolved resource, whether new, duplicate or superseded (CONTRACTS §1.5, §8.3).
- [ ] Treat an identical re-delivery as a no-op with no client-visible notification (CONTRACTS §4, §8.3).
- [ ] Apply Attempt pushes partially: an omitted field is untouched, and an explicit `{ "state": "not-yet" }` resets it (CONTRACTS §8.3).
- [ ] Implement `DELETE /ingest/v2/attempts/{phaseId}/{bib}`: `204` whether or not it existed; remove the Attempt and its standing entries (CONTRACTS §8.3).
- [ ] Implement `PUT /ingest/v2/phases/{phaseId}/attempts` as a replace: Attempts absent from the body are removed (CONTRACTS §8.3; ADR-015).
- [ ] Implement `PUT /ingest/v2/oncourse` as a whole replace of the on-course set, in course order, with `featuredByUpstream`; stub an `attemptId` not yet pushed (CONTRACTS §8.3).
- [ ] Never be upsert-only: a retraction, a contradiction and a run-generation change arrive as explicit `not-yet` and must take effect (CONTRACTS §8.3; ADR-005; ADR-015).
- [ ] Store every Attempt's `gates` as pushed (CONTRACTS §8.3).
- [ ] Accept the Entry body's `isTeam` flag and serve it as `Entry.isTeam` (CONTRACTS §2.5, §8.3).
- [ ] Wrap the bare values of Class, Phase, Entry and Course bodies as `known`, `source: 'bridge'`, `observedAt` the ingest time, `confidence: 'authoritative'`, `provisional: false`; keep the `source` the bridge states on Attempt fields (CONTRACTS §1.2, §8.3).
- [ ] Store a `null` in a nullable body field (`club`, `nation`, `ageCategoryId`, `eventBib`, `courseId`, `scheduledStart`, `programmeOrder`, `title`, a member's `externalId`) as `unavailable{reason:'not-applicable'}` (CONTRACTS §8.3).
- [ ] Accept forward references: create a stub for a `classId` or `courseId` not yet pushed (CONTRACTS §8.3).
- [ ] Expect no `format` token on a Phase; store `kind`, `scoringKind`, `pair` and `heats` (CONTRACTS §8.3; ADR-007).
- [ ] Take one resource changing as the unit of transfer, never a file, a day or an event (CONTRACTS §8.3; ADR-005).
- [ ] When pushes stop, keep the last on-course set and the last running values; clear nothing by the passage of time (CONTRACTS §8.3).
- [ ] Emit per push: `attempt.updated` for a partial Attempt push, `attempt.deleted` for a `DELETE`, `scope.replaced` for a Phase replace, the matching `*.updated` for Class, Phase, Entry and Course, `oncourse.updated` for the on-course set, then `standing.updated` for every affected Standing (CONTRACTS §8.3, §8.4).

**Validation**
- [ ] Reject a malformed body with `400 validation-failed` and `error.details` naming the field (CONTRACTS §1.4, §8.3).
- [ ] Require the `externalId` key on every member, `null` allowed; reject an omitted key, a bare string or an object without `scheme` with `400 validation-failed` (CONTRACTS §8.3; ADR-006).
- [ ] Reject values outside the closed vocabularies, such as `discipline`, `scoringKind`, `kind`, `combination`, statuses and marks, with `400 validation-failed`; never extend them (CONTRACTS §8.6).
- [ ] Reject a raw vendor payload with `400 vendor-payload-rejected` (CONTRACTS §8.6; ADR-005).
- [ ] Reject a body missing a required identity key; offer no non-idempotent operation (CONTRACTS §8.6).
- [ ] Accept `birthDate` as optional and as entered, and keep whatever was pushed (CONTRACTS §8.3, §8.4).

**Organiser corrections**
- [ ] Accept a direct correction, authenticated for the event's organiser, with `source: 'operator-write'` and `provisional: false`, whether or not the bridge is online (CONTRACTS §8.5; ARCHITECTURE §3).
- [ ] Present it immediately; let no routine bridge re-delivery displace it; displace it only by a later assertion of the same kind, or by a results-table observation that changes the bridge's retained value (CONTRACTS §4, §8.5; ADR-005).
- [ ] Accept the correction of a mis-bibbed run as a re-pointed `entry` (CONTRACTS §4, §8.5).

**Public read**
- [ ] Serve `GET /public/events` with `status=live|upcoming|past|all`, `cursor`, `limit` (default 50, maximum 200), `nextCursor` and `asOfSeq` (CONTRACTS §8.4).
- [ ] Derive calendar `status` only from ingest recency, `live` meaning a push within 5 minutes as a named constant; never from `Phase.status` (CONTRACTS §8.4).
- [ ] Read "now" for the calendar through an injected `Clock`, never `Date.now()` (TEST-ARCHITECTURE §3.1, §5).
- [ ] Compute `dateRange` from the event's Phase dates; order an unfiltered list live, then upcoming by soonest start, then past by latest end; answer "no match" with an empty list, never `404` (CONTRACTS §8.4).
- [ ] Provision `organiserName` out of band (CONTRACTS §8.4).
- [ ] Serve the event, entries, standings and attempts reads with `asOfSeq` and their `404` codes, without authentication and without requiring the reader to know the owning organiser (CONTRACTS §2.1, §8.4).
- [ ] Serve `GET /public/events/{eventId}/oncourse`, and push `oncourse.updated`, each with the set as last pushed, in course order, `featuredByUpstream`, and `asOf` the push's ingest time (CONTRACTS §7.2, §8.4).
- [ ] Serve every public `Standing`, in reads and on the stream, without `anomalies` (CONTRACTS §2.7, §8.4).
- [ ] Apply the per-event `birthDatePublication` setting, provisioned out of band with the key: `'year'` by default, serving `birthYear` only; `'full'` serving `birthDate` as pushed; `'none'` serving neither; the same in reads and on the stream (CONTRACTS §8.4).
- [ ] Serve `GET /public/events/{eventId}/stream` as `text/event-stream`, carrying `attempt.updated`, `attempt.deleted`, `phase.updated`, `entry.updated`, `class.updated`, `course.updated`, `standing.updated`, `oncourse.updated` and `scope.replaced`, each with its `seq` (CONTRACTS §1.6, §8.4).
- [ ] Never send `write.updated`, `sources.updated`, `check.updated`, `flag.updated`, `event.changed` or any diagnostic on the stream (CONTRACTS §2.10, §4, §8.4).
- [ ] Encode every envelope as the wire encoding requires, `eventTime` omitted rather than `null`, so that every envelope and error validates against the two schemas (CONTRACTS §1.2, §1.7).

**Tests**
- [ ] Run, through a thin adapter into its own merge function, the tier-1 vectors tagged `INV-1`, `INV-3`, `INV-4`, `INV-5`, `INV-6`, `operator-write` and `live-ingest`, and the `standing-assembly` vectors except the three anomaly ones (TEST-ARCHITECTURE §3.1; CONFORMANCE-VECTORS §1).
- [ ] Add tier-1 time-window vectors for calendar `status`: just under, exactly at and just over 5 minutes (TEST-ARCHITECTURE §3.1).
- [ ] Replay each admitted domain-state fixture as `PUT` calls, and check that values read back over the public reads match (TEST-ARCHITECTURE §3.2, §7).
- [ ] Verify tenant isolation with the store's own integration tests: no leakage between two keys with equal local ids, no cross-event access, `403` for a revoked key, `404` for an unknown `eventId` (TEST-ARCHITECTURE §3.5; CONFORMANCE-VECTORS §3).

---

## live-mini-client

- [ ] Own spectator-facing layout, locale and its own, likely lighter, display-lifetime policy (ARCHITECTURE §3).
- [ ] Provide the on-course view, with running time and penalties as they come in (ARCHITECTURE §3; CONTRACTS §8.3).
- [ ] Hydrate from the public reads, including `/public/events/{eventId}/oncourse`, and take updates from the SSE stream (CONTRACTS §8.4; ARCHITECTURE §8).
- [ ] Handle `404 event-not-found`, `class-not-found` and `phase-not-found` (CONTRACTS §1.4, §8.4).
- [ ] Render the calendar from the delivered `status`; page with `cursor` and `nextCursor`; treat an empty list as "no events match" (CONTRACTS §8.4).
- [ ] Show a multi-day event as one calendar entry, with results grouped by Phase `date` (ARCHITECTURE §6.E; CONTRACTS §2.2).
- [ ] Order the on-course view by the pushed set; treat an Attempt's `courseOrder` as informational, since it may lag (CONTRACTS §8.3, §8.4).
- [ ] Take the on-course set's age from `asOf` on the on-course read and on `oncourse.updated` (CONTRACTS §2.6, §7.2, §8.4).
- [ ] Feature by default the first Attempt of the on-course set; offer `featuredByUpstream` only as the optional alternative (CONTRACTS §8.4; ARCHITECTURE §2).
- [ ] Take each on-course athlete's `status`, `running` outcome, judged `gates` and `timeToBeat` from `attempt.updated` (CONTRACTS §8.3).
- [ ] On `attempt.deleted`, remove the Attempt and its standing entries (CONTRACTS §8.4).
- [ ] Label a Phase from its organiser-authored `title` when present, else from `pair.role`, `combination`, `heats`, `scoringKind` and `kind`; expect no `format` token (CONTRACTS §8.3; ADR-007; DERIVATIONS §9).
- [ ] Show birth data only as served: `birthYear`, `birthDate` or neither, per the event's publication setting (CONTRACTS §8.4).
- [ ] Expect no `anomalies`, diagnostics, `write.updated`, `sources.updated`, `check.updated`, `flag.updated` or `event.changed` on the live tier (CONTRACTS §2.7, §4, §8.4).

---

## Gaps and conflicts

Still open at 0c199af; each needs a decision in the cited documents before the items it touches close.

1. **Whose clock the stale tick uses.** The tick stops 3 s past the last `running` value's `observedAt`, a timestamp on the ingesting server's clock, which on the live tier is the venue laptop's. The client measures against its own clock, and nothing addresses the offset between the two, or says whether a client may measure from its own receipt of the value instead (CONTRACTS §1.2, §2.6, §8.3).
2. **Live-tier vectors that still need venue inputs.** The live tier runs every `INV-1` and `operator-write` vector. Two `INV-1` vectors are built on scope snapshots (`retraction-not-from-fragment`, `retraction-not-in-other-race-snapshot`), and four `operator-write` vectors assert a `WriteRequest` status, which exists only on site (CONFORMANCE-VECTORS §1; CONTRACTS §2.9, §8.3).
3. **Classification rows have no live ingest.** Standings on the live tier are assembled like the on-site ones, and a classification Standing takes its rows from the classification Phase. The live ingest has no shape that carries those rows, so live-mini-server cannot assemble one, and live-mini-client has none to show (CONTRACTS §2.4, §5, §8.3, §8.6).
