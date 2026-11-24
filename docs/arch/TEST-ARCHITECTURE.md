# Test Architecture — c123 Ecosystem

How the rebuild is tested: what each tier proves, what exists today and what is not built. It
states the shape tests take and the rules they follow, not the tests themselves. The reasoning
that led here is in git under the tag `contract-archive-2026-11`.

---

## 0. How to read this document

§2 is the split everything follows from. §3 is the four tiers; §3.2 holds the gate-2 checker's
properties and §3.6 the checker conditions moved from `CONTRACTS.md`. §4–§6 are the fixture
format, the clock requirement and fixture distribution. §7 says which component a failing test
names, §8 what is deliberately not tested, §9 what exists and what is not built, §10 what is left
open.

A piece marked **Not built** names the issue that parks it. c123-protocol-docs#15, #16 and #20 and
c123-server#336 are in the milestone "Hardening (after Jarní slalom)".

---

## 1. Why this document, and why now

`CONTRACTS.md` §4 claims that, given the same sequence of ingested messages, the resulting state is
a pure function of that sequence. This document says how that claim and the invariants are
checked: by hand-authored vectors (tier 1) and by replaying real recordings through the real core
against an invariant checker and Canoe123's own results (tier 2). It is one design for all four
deployables, in place of a test plan per repository: one interpreter in production
(`DECISIONS/ADR-002`), and test authority from outside every implementation.

---

## 2. Two determinisms, two machines

Testing follows `ARCHITECTURE.md` §2: the server owns any decision whose wrong answer is a wrong
*fact*; a client owns any decision whose wrong answer is a worse *presentation*.

- **The domain layer's merge state** (`c123-server`, `live-mini-server`) is a pure function of the
  *ingest sequence*, ordered by INV-6 independently of wall-clock time. Given the same ordered
  inputs, it produces the same outputs.
- **Some domain-layer facts are also a function of wall-clock *now* at read time.**
  `CONTRACTS.md` §8.4's calendar `status` is the instance: `live`/`upcoming`/`past` depends on
  whether a push arrived within 5 minutes of *now*. §3.1 covers it.
- **The presentation layer** (`c123-scoreboard`, `c123-penalty-check`, `c123-live-mini`'s client) is
  a function of *a sequence of domain states plus elapsed time*: auto-scroll, highlight duration,
  grace periods before eviction, the departing timeout, how long a Kayak Cross heat stays shown.
  The clock is an input (§3.3, §5).

A test that hands a client a fixed snapshot and asserts once sees the first kind and is blind to
the last.

---

## 3. Four tiers

### 3.1 Tier 1 — Contract conformance

**What it proves:** an implementation of the merge rule (`CONTRACTS.md` §4's invariants and
precedence rules) is correct, in isolation, with no recording and no running server.

**Who this applies to:** exactly the two components that implement the merge rule, `c123-server`
and `live-mini-server` (`ARCHITECTURE.md` §3: live-mini applies the same merge invariants, not its
own). It does not apply to any rendering client; they never merge anything.

**Shape:** hand-authored **test vectors**, data only, with no shared runtime code (the discipline of
`DECISIONS/ADR-002`/`ADR-003`: share types and data, never logic across repository boundaries).
A vector is an ordered list of synthetic inputs and the expected presented state after they are
applied in order. Every invariant has at least one vector written directly from its
`CONTRACTS.md` clause, and none needs a recording, a running server or an upstream fact. The
format is `CONFORMANCE-VECTORS.md` §1; the data is `vectors/tier1-conformance.json`. The vectors
cover every invariant and every rule of INV-2, `provisional` in both upstream modes, run
generations and §5's standing assembly.

**What exists.** 121 vectors (`CONFORMANCE-VECTORS.md` §2). Each of `c123-server` and
`live-mini-server` writes a thin adapter that feeds the vectors `CONFORMANCE-VECTORS.md` §1 assigns
to it (115 and 24; 18 are in both) into its own merge function and asserts the result, so both
satisfy the same data-defined contract without either depending on the other's code.
`c123-server`'s adapter runs its 115 against the real core in CI on every PR
(`src/__tests__/conformance/`), with the expected-red ledger for test-first work
(`CONFORMANCE-VECTORS.md` §2). `live-mini-server`'s runner is part of its migration and does not
exist yet.

**Time-windowed reads: a second class of vector.** The calendar `status` is not a merge decision,
but it is as isolable: given fixed push timestamps and an injected "now", assert the derived
`status` just under, exactly at and just over the 5-minute boundary, with no real clock and no
recording. `live-mini-server`'s calendar computation reads "now" through an injected `Clock` (§5),
never `Date.now()`. These vectors belong in this tier, beside the merge vectors. None is written
yet; they are part of `live-mini-server`'s migration.

### 3.2 Tier 2 — Replay determinism, and the correctness gate it is not a substitute for

**What it proves, and what it does not.** Replaying a real recording through the real core proves
*reproducibility*, not *correctness*: a deterministic but wrong merge reproduces its wrong answer
every time. With one interpreter (`DECISIONS/ADR-002`) no second implementation can disagree, and
none is reintroduced for tests; authority comes from outside every implementation:
`CONTRACTS.md` prose (the gate-2 properties) and Canoe123's own results (gate 3).

**What exists: `npm run gates`** (`scripts/gates.ts`), on the seven whole recordings (nkz-19so,
cp3-cross, jarni-ne-odp, jarni-ne-do, jarni-so-do, jarni-so-odp, nkz-20ne), in three steps:
1. the data-gate tests (the direct-injection replay, the re-run paths, outages, and the real
   process against the player with its write path), which fail on any skip;
2. each recording replayed by the direct-injection path below, its step log read by the gate-2
   checker with the recording (`--recording`);
3. the mechanical gate 3: each replay's final presented state against the recording's last XML
   snapshot.

Exit 0 when every step passes, 1 when a step fails (every step still runs), 2 when a prerequisite
is missing. `--only` runs steps 2 and 3 on named recordings; such a partial run is never a gates
pass. The gate-2 checker and the gate-3 comparator are c123-protocol-docs' `tools/gate2/check.js`
and `tools/gate3/final-state.js`, **pinned by commit in `scripts/gates/protocol-docs.ref`**: the run
stops when the protocol-docs checkout is at another commit or has changes under `tools/`, and
`scripts/gates/README.md` says how to bump the pin. CI does not run the gates (c123-server#324).
The maintainers' gate runner runs the gates on every new commit of `main` and writes the result
as the commit status `gates/recordings`. A PR touching `src/core`, `src/ingest`,
`scripts/replay-direct.ts` or the checker pin runs a partial run on two recordings before it
merges (`--only cp3-cross,jarni-ne-odp`).

**The direct-injection replay** (`scripts/replay-direct.ts`) feeds a recording's TCP and XML
records, in recorded order, straight into the ingest boundary through the production parsers and
merge core, one ingest unit per step, bypassing the player and the network. **The replay carries
everything `CONTRACTS.md` §4's determinism paragraph names:** every message with its recorded
`observedAt`, the TCP connect and disconnect events, the detection time of every XML rewrite, and
any re-baseline, in recorded order; the domain layer reads no clock of its own while replaying.
Without the events, INV-2 rule 2 and INV-7's write-time guard are never exercised. Where the
recording lacks them (§9), a stated outage or re-baseline is given to the replay (`--events`; in a
fixture, its `source.events`, each with its instant, scope and reason): the replay drops every TCP
record inside a stated outage and plays a stated re-baseline as `CONTRACTS.md` §4's unit, the
`rebaseline` event with the last snapshot read. **The raw stream the gate-2 checker reads omits the
same records**, the interval taken from the log's `tcp-disconnected`/`tcp-connected` pair, so no
property is read over records the core was told never arrived. Such a replay is evidence for
properties 8 and 13 (`exercised`) and gate 2 judges it like any other; it is a replay with a
declared input the recording lacked, not a synthetic fixture (§4), which carries no raw stream and
so exercises only the **D** properties.

**The step log** is what gate 2 reads: a hydration line, then one step per ingest unit
(`CONTRACTS.md` §1.6) with its elements, the §7.2 deltas the unit produced and a state hash, then an
end line (the format is in `scripts/replay-direct.ts`'s header; the on-site process writes the same
log). **A replay begins at the first record of the stream the checker reads** — the recording's or
the excerpt's — **and the step log gate 2 reads begins where the raw stream begins**: the checker's
memory (the generation's recorded row, the carry, properties 5, 10 and 11) is built from the steps
before any point it judges. A window is never a cold start at a later instant of a stream the
checker reads from its beginning, since closure, content age and the carry (properties 5, 8, 11)
would then be read over records the core never saw. A cold start at a chosen instant is an excerpt
cut there, log and raw stream alike. A step log or `/ws` capture of a player-driven process is a
tier-4 artefact (§3.4), never a fixture candidate: its `observedAt` values are the server's clock
during playback.

**Gate 1 — determinism (necessary, not sufficient).** The same ingest input, replayed twice
directly against the ingest boundary, gives byte-identical output, `observedAt` included. A
non-empty diff is a real non-determinism bug (uninitialised state, a race condition) that would
otherwise poison every later check; passing proves only self-consistency. What exists: a data-gate
test replays a window twice and compares the logs byte for byte; `npm run gates` replays each
recording once.

**Capture and admission of fixtures.** Projecting a replay onto the §4 format, and admitting the
result through gates 1–3 as pinned ground truth for other repositories. **Not built:**
c123-protocol-docs#15, with the human half of gate 3 in c123-server#336. Once built, a capture
window inside a longer replay opens with a hydration step holding the core's state at that instant,
and that step and the window bound the fixture's steps and its `violations` and `exercised` counts.

**Gate 2 — invariant conformance, checked as a property of the replay, not against a known answer.**

*What the checker reads.* The replay's step log, step by step. **A step is one ingest unit**
(`CONTRACTS.md` §1.6; `CONFORMANCE-VECTORS.md` §1: one upstream message, one event, one XML
snapshot read — every race it carries, the rewrite event included, `DERIVATIONS.md` §0.3 — one
re-baseline with its snapshot re-read) — its elements in ingest order, `elements`
plural in the log, plus any `oncourse-left` the core derived at that message (`DERIVATIONS.md` §4.1,
§4.8; listed after the message's own elements and verified against the raw stream, never trusted) —
and the deltas (§7.2 shapes) the unit produced. Where a property names the step's element
e<sub>i</sub>, the condition holds when one element of the unit satisfies it (a unit's deltas cannot be
attributed to one of its elements). Elements are classified in `CONFORMANCE-VECTORS.md` §1's own
vocabulary, which the direct-injection path emits beside each step's deltas: an **observation**
(`attemptId`, `source`, `kind: inference | result-row | operator | fragment`, the fields it carries,
`run`, `observedAt`, optional `eventTime`); an **event** (`tcp-connected`, `tcp-disconnected`,
`xml-rewrite-detected` with its `changedAfter`, `oncourse-empty`, `oncourse-left`, `rebaseline` with `scope`); a **scope
snapshot** (`source`, `phaseId`, `mode`, `rows`); an **on-course listing** of one Attempt. A §4
fixture is the deltas alone. Gate 2 runs on the replay's step log; the properties marked **D** read
deltas only and can be re-run by any consumer on deltas alone, a published fixture's included.

*The properties.* Each is a check on consecutive presented states, S<sub>i−1</sub> and S<sub>i</sub>,
and the element e<sub>i</sub> between them. "Regression" means a field's `state` going from `known`
to `not-yet` or `unavailable`. Unless stated, everything is per Attempt and per run generation;
"result fields" are the run-scoped fields `CONTRACTS.md` §2.6 lists. A violation is reported with
the step index, the Attempt, the field and the property number.

1. **Sequence (INV-6) D.** Three rules, then the cases in which an envelope older than its step is
   right.
   - **(a) `seq`.** `seq` strictly increases across deltas, and the first delta's `seq` exceeds the
     hydration step's `asOfSeq`.
   - **(b) No replay-time clock value.** Every `observedAt` in a delta is the recorded `observedAt`
     of the element that produced that observation, at or before the step **in ingest order**
     (INV-6). Ingest order is not clock order: a real process applies an XML unit, stamped at its
     detection (`DERIVATIONS.md` §0.3), after the TCP units it received during the read, so a
     log's instants are not monotonic across sources. A replay-time clock value is one that
     exceeds every instant the log has seen up to the step.
   - **(c) The reject half, for every field.** An envelope on the step's own instant has a
     producer of its own `source` among the unit's elements; a `tcp` vector on an `xml` unit's
     instant is a violation. Without this clause the cases below would let through a core that
     restamps at the step. What an element produces, on its own instant and `source`:
     - *A scope snapshot* produces, for an Attempt it names or covers: the fields its row
       states; what the contract derives from them at that step, the `no-result` outcome of a
       presented mark (`CONTRACTS.md` §2.6); and the result fields INV-7 retracts. It never
       produces an on-course field, nor anything for an Attempt it neither names nor covers.
     - *A retraction* is every INV-7 form. From `tcp`: the row absent, the row present with no
       time and no mark, the message in start-list mode. From `xml`, each only where the
       content-age guard admits it: the row present with no time, no finish time and no mark,
       and the row absent from a table that carries other rows. An `xml` table with no rows
       retracts nothing and produces nothing. What a retraction presents is the retained stream
       inference with its own element's envelope where one is retained — the listing's, or for
       the leave's `left-without-finish` the leave's element, `oncourse-left` or `oncourse-empty`
       (`DERIVATIONS.md` §4.1, §4.8), `tcp` on the instant of the TCP message at which the leave
       was evaluated — else `not-started` on the retraction's own
       instant and `source` (property 5).
     - *`oncourse-left` and `oncourse-empty`* are the core's evaluation at a TCP message
       (`DERIVATIONS.md` §4.1, §4.8), so what they produce — `status`, the stream's withdrawn
       `running` outcome, the set — is `tcp`.

     One default (`DERIVATIONS.md` §10 item 28): a merged `gates` vector takes its `source` from
     the presented row and its instant from the element that last changed the presented cells
     (`CONTRACTS.md` §1.2). Where the presented row is the other source's — an `xml` row
     presented after a re-baseline or an outage, a `tcp` listing then judging a cell — that
     listing is the producer, and the vector is `xml` on the listing's instant.

   **An earlier instant is legitimate wherever (b) admits it.** The cases below are the ones
   whose envelope needed stating, and in each of them only the envelope stated here is right.
   The list is not closed: any other envelope older than its step — a value whose `provisional`
   flips at a closure and keeps its row's instant, for one — is judged by (b) and (c) alone. A
   second run's merged `outcome` is another: `DERIVATIONS.md` §4.4 gives its instant, a core
   test pins it, and no clause here names it (a default, `DERIVATIONS.md` §10 item 46 (a)).
   - **A creation message or a standing** carries earlier envelopes.
   - **A row the merge held for the stream's finish** (`DERIVATIONS.md` §4.11) is presented at the
     listing that settled it, with its own `observedAt` **and its own value**: the fields the row
     states — `outcome`, `placement`, `qualified` and the like — each at the instant of the row
     that stated the presented value, never a new value on an old instant. `status` is not among
     them: a row's `finished` over the unit's own listing of the finish is the listing's element
     (INV-5) and keeps the listing's envelope. *Recorded:* nkz-19so C1M_BR1_19:7, the row of
     12:41:44.250 presented at the listing of 12:41:44.358; `outcome` the row's, `status` the
     listing's.
   - **A retraction's fallback** to the retained stream inference keeps the envelope of the
     element that drew it (property 5): a listing's, or the leave's (`oncourse-left` or
     `oncourse-empty`) for a `left-without-finish` (`CONTRACTS.md` §3.2). *Recorded:* jarni-so-odp K1W_BR2_18:16, the
     `at-start` of 14:11:39.886 presented at the clearing of 14:12:08; no recording holds the
     `left-without-finish` case.
   - **A mark the guard refused at its first read** and a later snapshot re-delivers is the
     re-delivery's element and instant (INV-5), the `no-result` outcome with it (`CONTRACTS.md`
     §2.6), never the refused read's.
   - **A late-bound `gates` or `faults` vector.** The binding step is the scope snapshot of the
     race at which `DERIVATIONS.md` §4.6's `known` condition — `courseId` known and that Course's
     `gates` known — is first met for the Phase, or met again after `unavailable{not-configured}`,
     and no other step: a later snapshot naming another course finds no retained cells, every
     cell since the binding having been read at its own step. At the binding step the core builds
     the vector from the cells retained for the Attempt, the latest cells of that source in the
     **generation** (§4.6), and the envelope is the one an earlier binding would have given:
     - `source` is the presented observation's. The cells are its statement and the course the
       key to read them; a binding changes no cell.
     - `observedAt` is the instant `CONTRACTS.md` §1.2 gives the merged vector: the **later** of
       the presented row's own element and the element's that last changed the presented cells on
       the bound course, a listing's included; after a retraction, the last cell-changing
       listing's.
     - An identical re-delivery after either moves nothing (INV-5). Identical is to the presented
       merged cells, never to that source's previous row (§1.2).

     *Recorded* (instants in recording UTC): cp3-cross MX1_XT_26:52, the row of 08:45:00.903
     read on the course of the snapshot of 08:45:05.614: the vector is `tcp` at 00.903.
     MX1_XT_26:8, listings 08:45:00.775–05.518 and the row of 00.903 all stating nine clean
     cells: the vector at 00.903.
     nkz-19so K1M_BR2_19:81, the row of 09:30:05.719 with cell 23 blank, the listing of 06.150
     judging it clean, the row of 12.811 restating the merged cells: the vector at 06.150, whether
     the course binds at 11.556 (nkz-19so) or at 13.551 (the #208 fixture cut from it); a core
     that stamps 12.811 on a late binding is the planted defect the checker rejects.
2. **Envelopes (§1.2) D.** Every presented envelope validates against `schemas/observed.schema.json`:
   `eventTime` omitted when absent, never `null`; `unavailable.reason` in the closed set; `source`
   never `bridge` on site.
3. **No spontaneous change.** A presented field of an Attempt changes at step i only if
   e<sub>i</sub> is: an observation or snapshot carrying that field for that Attempt; a scope
   snapshot of the Attempt's race (INV-7); an on-course listing of the Attempt (INV-2d, `ADR-013`,
   `left-without-finish`); `oncourse-left` or `oncourse-empty` covering it; or a `rebaseline` whose
   scope contains its Phase. A connection event, an `xml-rewrite-detected` on its own, a `fragment`,
   an observation of another Attempt or a snapshot of another race changes nothing presented. In
   particular, a `tcp-connected` never flips a presented value back to `tcp` by itself: TCP's
   pre-outage observations do not outrank a snapshot read during the outage (INV-2 rule 2, second
   case). `SourceStatus` and diagnostics may change at any step.
4. **No regression by omission (INV-1, INV-3).** A regression occurs only at: a scope snapshot of
   the Attempt's race (property 5); a listing of the Attempt that increments `run` in the same delta
   (property 10) or contradicts a finish (property 7); a `rebaseline` of its scope (property 13);
   and, for the stream's own `running` outcome alone, an `oncourse-left` or `oncourse-empty`
   covering the Attempt (slalom and the Kayak Cross time trial: a Kayak Cross heat's leave
   withdraws nothing, `DERIVATIONS.md` §10 item 35; the time trial, §4.1), a listing of it with `dtStart` empty, or a listing of it with a `dtFinish` that
   yields no `duration` (an empty `Time`, or a slalom listing with no `Gates`) — the stream withdrawing what it alone stated (`DERIVATIONS.md` §4.3, §4.1,
   §10 item 43; `ADR-015` Revision 4), `status` as §4.1 gives it at that element (the leave's
   `left-without-finish` or `not-started`, a table `finished` or mark standing; the listing's
   `at-start` or `finished`), every other field unchanged. The property reads the presented
   state. Where a table `finished` or mark masks the withdrawn inference, nothing presented
   changes at that step, and the withdrawal is judged at the step that would present the
   inference again, a retraction of the table value (property 5(b)). No test or checker reads
   a retained, unpresented observation.
   `unavailable` appears only with a closed reason, and only at a step that carries the field for the
   Attempt (property 3) or at a scope snapshot of its race, never at a connection event, a `fragment`
   or by itself (INV-3): a `not-configured` decided from `SourceStatus` or the snapshot
   (`DERIVATIONS.md` §4.6; a `RaceConfig` decides none), and the `not-applicable` a `RaceConfig`'s
   `NrSplits` decides for `splits` (`DERIVATIONS.md` §4.8), are presented at the Attempt's next such
   step.
5. **Retraction is scoped and guarded (INV-7).** Five rules about a scope-snapshot step for race R.
   - **(a) Scope.** A regression of an Attempt of R touches only the fields INV-7 names for the
     case:
     - first or single run: `outcome`, `gates` (in Kayak Cross `faults`), `placement`,
       `underReview`, `qualified` and a mark in `status`;
     - paired second run with the row absent: those plus `pairTotal` and `countingRun`;
     - second run with an empty time: `outcome` and `gates` (`faults`) only; a mark in `status`
       goes with them (INV-7), a `known → known` change and so no regression as this section
       defines one. `placement` and
       `pairTotal` are the row's, `known` or `not-yet` as its `Rank` and `Total` state them (INV-7
       "follow the row"; `DERIVATIONS.md` §4.7, §4.12): a change there is the row's statement,
       not this property's regression, and so is the `not-yet` an empty `Rank` states on a row
       carrying a mark. `countingRun` stands at a present `tcp` row, which has no column for it,
       and is the row's at an `xml` row, `BetterRunNr` `0` as `not-yet` (INV-7). *Recorded:*
       jarni-ne-odp C1M_BR2_19:64, the snapshot of 11:40:25.507.

     It never touches `entry`, `bib`, `startOrder`, `heat`, `startLane` or `run`, and never a
     field whose presented value is an on-course inference (`kind: inference`, or
     `outcome.kind: 'running'`).
   - **(b) `status` afterwards** is what the on-course listing shows for the Attempt (`at-start`,
     `on-course`, or an inferred `finished` that still stands; after an `oncourse-left` or
     `oncourse-empty` covering the Attempt in the generation, with a start and no finish standing at the leave (one the stream withdrew is not
     standing, `DERIVATIONS.md` §4.1) and no re-listing since, the
     leave's `left-without-finish`, `DERIVATIONS.md` §4.12), else `not-started`; a
     `finished → on-course` at this step is this property's, not property 7's.
   - **(c) The content-age guard.** For an `xml` snapshot retracting or displacing a
     `tcp`-presented field, the snapshot's content age is later than that field's presented `tcp`
     observation's content age; otherwise the field is unchanged at that step, and so is every
     other field that re-delivery carried — a mark the guard refused holds back its row's time
     too (`CONTRACTS.md` §2.6).
     - The snapshot's content age (`CONFORMANCE-VECTORS.md` §1) is the latest
       `xml-rewrite-detected`'s `changedAfter`, `null` never qualifying; without the key, its
       time minus the poll interval.
     - The `tcp` observation's content age (INV-2c) is the `observedAt` of its latest delivery,
       a rotation's re-send included, read from the raw stream; for the stream's `status`
       inference, the latest listing stating it, or the message at which the leave was evaluated.
     - The guard's refusal is rule 2's mark exception only: a mark over a `tcp` `status` of
       `not-started`, `at-start` or `left-without-finish`. A mark over `on-course` or `finished`
       is refused by rule 2's continuity, and that row's other fields reach rule 1 as §2.6 says.
       *Recorded:* jarni-so-odp C1M_BR2_18:65 at 14:02:47.758, running, `gates` the row's.
     - A refusal holds the field's value and `source`. `provisional`, recomputed when the course
       binds (property 11), and an `eventTime` the Phase date first lets `DERIVATIONS.md` §0.2
       build (§0.5, §4.4: from the on-course finish, never from the refused row) may change at
       the snapshot step that supplies them. "Changes" and "flips" here, in 6(c) and in
       property 8 mean a change of value or `source`.
   - **(d) An untimed row is no retraction.** An `xml` row that makes the Attempt untimed
     (`CONTRACTS.md` §2.6; `DERIVATIONS.md` §4.4: placed, no `dtFinish` on the row and none on the
     raw stream for the Attempt) asserts `outcome: unavailable{not-applicable}` over the TCP
     row's presumed-timed duration, outside the guard: an INV-3 determination no `tcp` row can
     contradict, a TCP row carrying no finish time. `status` stays `finished` and every other
     field stands. *Recorded:* cp3-cross WX1J_XT_26_JUN, the snapshot of 06:12:22.482 over pushes
     to 06:12:23.908.
   - **(e) Completeness.** Where the replay log carries the snapshot's rows, as the vector format
     does, every Attempt of R presenting results-table values whose row states no result is
     retracted in that step, the guard of (c) permitting. That holds for a present row that
     states no result and for an absent row, from either source, and for a `tcp` start-list
     table. One exception: an `xml` snapshot of R with no row at all retracts nothing (INV-7);
     the `xml-table-emptied` diagnostic it may raise goes to the admin log, which the checker
     does not read. `countingRun` is asked of an `xml` row, present or absent, and of an absent
     `tcp` row, never of a present `tcp` row, which cannot state it. **An absent `xml` row removes
     the Attempt** — no row of the snapshot's table for R carries its bib, and a results-table
     row of R has named it (`CONTRACTS.md` §4 INV-7; `DERIVATIONS.md` §10 item 38 (b)) — where
     the snapshot is admitted for the whole Attempt (every `tcp` observation of it, listings
     included, older than `changedAfter`, and the Attempt not in the on-course set): in that step
     the Attempt is gone and one `attempt.deleted` names it; where not admitted, (e) applies
     field by field. A row that carries the bib under another `Id` is present, not absent: no
     removal, `entry` re-pointed (the bib is the key of a run's data, maintainer, 2026-11-12). *Example:* bib 11
     presents a `tcp` result and is off course; an `xml` snapshot of the race lists bibs 9 and 10
     only and its content age is later than bib 11's push: bib 11's Attempt is removed in that
     step. The same snapshot with `changedAfter: null` leaves it, by (c). **A race the
     snapshot's schedule no longer names removes its Phase** (`CONTRACTS.md` §4 INV-7;
     `DECISIONS/ADR-015` Revision 9), where an XML schedule named it before and the snapshot is
     admitted for the whole Phase (every `tcp` observation of it or its Attempts older than
     `changedAfter`, none of its Attempts in the on-course set): in that step the Phase and its
     Attempts are gone and one `phase.deleted` names it, with no `attempt.deleted` for them; a
     schedule that names no race removes nothing. The gate-2 checker has no clause for the
     Phase removal yet.
6. **Precedence (INV-2 rules 1–3).** (a) Once a result field presents a `result-row` observation, it
   never afterwards presents an `inference` for the same generation, except through a contradiction
   (property 7) or after a retraction (property 5). (b) `gates` is merged cell by cell: while
   upstream still lists the Attempt (no `oncourse-left` for it in this generation that a later
   `oncourse.updated` of the generation has not undone by listing it again, as property 11 reads it;
   read from the raw stream at admission; "still in the latest `oncourse.updated`" is the **D**
   reading, for a re-run on the published fixture only; before any row of the generation the
   stream's vector is an inference, `confidence: 'inferred'`, and once a row is presented the merged
   vector carries the row's envelope, `CONTRACTS.md` §1.2), a judged cell (`0`, `2`, `50`) never becomes
   `null` at a results-table step — and at the listing that increments `run` the vector is the new
   generation's, named `not-yet` or the listing's own cells in that delta (property 10, `ADR-013`),
   the previous generation's row holding nothing of it, so (b) reads the generation the delta
   presents — upstream's own withdrawal, the stream's listing blanking a cell
   it judged, is presented wherever no presented row of the generation holds that cell judged: the
   presented row's cell blank, or no row of the generation yet (recorded: nkz-19so K1M_BR2_19:79,
   cells 14–17 judged 25 s into the run and blank 11 s later, mid-run, no row),
   `provisional` recomputed; a row's judged cell stands against the stream blank (INV-2 rule 1; recorded:
   jarni-so-odp C1M_BR1_18:26 cell 19 at 12:17:19.030, the row `0`) (D4; property 11's list;
   recorded: nkz-19so C1W_BR1_19:40 cell 16 at 08:38:18.181, the presented TCP row — the row rule 2
   presents, not the latest row of either source — blank while the
   XML row still holds `0`); after it has left, and until a
   re-listing of the generation, cells change only at a results-table
   step. (c) A field presented from `tcp` flips to `xml` only: after a `tcp-disconnected` that
   followed the step that ingested the presented `tcp` observation — its latest delivery, a
   re-delivery that restates the value being an ingest step of its own (INV-5) — by rule 2's
   mark exception
   (`status` from `not-started`, `at-start` or `left-without-finish` to a no-result mark,
   `non-ranked` excluded); by an INV-7
   retraction from the snapshot (property 5); by rule 1, a snapshot result row superseding an on-course
   inference, `status` excepted (its stream inference is rule 2's `tcp` side, so its flip to an
   `xml` mark is the exception case above, guarded); or at a `rebaseline` — the first three under
   property 8's content-age guard; rule 1
   involves no content age (INV-2c), and the false leader it can admit is property 7's to catch. A
   `no-result` `outcome` never flips on its own: it is the presented `status`'s (property 12). (d) Each field's presented `source` lies in the
   set `CONTRACTS.md` §4 INV-2 rule 3 names: `courseOrder`, `timeToBeat`, a `running` outcome and
   `Course.captions` only `tcp`; `countingRun`, `Entry.members`, `ageCategoryId`, `eventBib` and
   `isTeam`, `Class.ageCategories`, `Event.details`, `Phase.courseId`, `Phase.scheduledStart` and
   `title`, `Course.layout` and `sectorEndsAfterGate` only `xml`. Fields without an envelope of their
   own (`Gate.memberPenalties`, `Course.courseId`) are not clauses. A first run's own figures are its
   own Attempt's, from either source.
7. **Contradiction (INV-2d).** `status` goes `finished → on-course` only at: an on-course listing of
   the Attempt with the generation's start and no finish, the finish having been presented from a
   results-table observation (this property); a listing without a finish while the presented
   `finished` is a stream inference and no results-table finish is presented — no row has recorded
   the generation, or the row that did has been retracted since, the generation staying recorded
   (`DERIVATIONS.md` §4.1, §4.11: the stream withdraws its own finish, in slalom and the Cross time
   trial alike; `at-start` where the listing has no start; no diagnostic; raw stream at admission);
   a listing that starts a new generation
   (property 10, `at-start` being the other target there); a retraction (property 5); or a
   `rebaseline` of its scope (property 13), which ingests a scope snapshot. In the first
   case, in that same step `outcome` becomes
   `running`, `placement`, `pairTotal` and `countingRun` become `not-yet`, and `diagnostics.updated`
   carries a `contradicted-finish` for the Attempt, with `finishTime` (`null` where no finish time is
   known) and `runSeconds`. While that diagnostic stands, no step presents a results-table `outcome`
   for the Attempt carrying the contradicted finish: equal `eventTime` where both have one, else equal
   run time (`DERIVATIONS.md` §4.12). The diagnostic disappears only at a step presenting a different
   finish by the same comparison, a mark or a retraction, or at a listing of the Attempt with a
   finish; after such a lift the contradicted rows stay unpresented. Kayak Cross Attempts never show the first case.
8. **Content age across sources (INV-2c).** A presented results-table field flips from `tcp` to `xml`
   only if the snapshot's content age, as property 5 reads it, is later than the presented
   `tcp` observation's content age — the `observedAt` of its latest delivery, from the raw stream,
   not the presented envelope's (property 5's guard is this rule applied to retraction); a flip from
   an `inference` to an `xml` row is rule 1 and needs none, except for `status`, whose stream
   inference is rule 2's `tcp` side and is delivered by every listing that states it (property
   6(c)); a
   `changedAfter: null` snapshot (`DERIVATIONS.md` §0.3: no stat since start or `setPath` showed
   another signature) therefore never flips one. A flip
   from `xml` to `tcp` needs no such check: a `tcp` observation's content age, its latest
   delivery's `observedAt`, is always later than a snapshot that preceded it.
   From the same source, a later-ingested observation may present any `eventTime`, an earlier one
   included; the checker never compares event times for precedence.
9. **Idempotence (INV-5) D.** No delta carries a field whose envelope equals the presented one, or
   differs from it only in `observedAt`. A re-delivered identical observation is not client-visible.
   The one exception is the run-increment delta, whose run-scoped fields property 10 requires
   explicitly even when already `not-yet`.
10. **Run generation (`ADR-013`).** `run` never decreases; on a replay of an upstream stream — a
    core with no durable state, which is what this property is evaluated on — a creating message
    presents it as `1` (`CONTRACTS.md` §2.6, 1-based; `ADR-013` "it starts at 1"; a vector's `run`
    observation states a generation directly, `CONFORMANCE-VECTORS.md` §1, and is outside this
    clause; how a restarted server, whose §2.10 store and the live tier key by the generation, learns
    the current one is not solved, an accepted risk, `DERIVATIONS.md` §10 item 25), and it increments
    **by one** — each trigger is one generation — only at an on-course listing
    of the Attempt that carries a start different from the generation's recorded start **and no
    finish, while the generation is recorded** (`DERIVATIONS.md` §4.11's two terms, tracked by the
    checker from the raw stream and the rows: the recorded start is the generation's first listed
    start, so the listing that gives it is no change; recorded means a row with a time or a mark,
    attributed after that start, that stated something the table did not already hold on either
    source — a mark standing on either source at the recorded start records nothing however it
    arrives afterwards — kept through a retraction, cleared by a contradiction, never given by the
    stream alone). In that same delta
    every run-scoped field is named — none omitted — `not-yet`, or the value the same unit's listing
    gives it (`courseOrder`, a `running` outcome, the stream's cells; `CONTRACTS.md` §1.6: one
    message per unit), and `status` is `at-start` or
    `on-course`. **A listing that changes the start otherwise is a start correction:** `run`, every
    presented results-table value and `placement` are unchanged at that step (value and `source`,
    as property 5 reads "changes"; the finish `eventTime` `DERIVATIONS.md` §4.4 lets the listing
    attach to the row's unchanged outcome is no change); `status` and the
    on-course inferences are the listing's, as at any listing (`DERIVATIONS.md` §4.1, §4.3:
    `running` takes its `Time`); and the generation's recorded start is the listing's from then
    on. A listing with an empty start changes neither `run` nor the recorded start; with `dtFinish`
    empty too its `status` is `at-start` outside a Cross heat (in a heat `on-course`,
    `DERIVATIONS.md` §4.2), with a `dtFinish` it is `finished` (a finish impulse with no start,
    recorded once: cp3-cross WX1_XT_26:25 at 07:16:59Z), in both cases unless a table-presented
    `finished` or mark stands (`DERIVATIONS.md` §4.1). No
    results-table observation whose finish precedes the new generation's start is presented
    afterwards (`DERIVATIONS.md` §4.11). Mutation: a checker built on "a different start alone"
    must fail on the recorded post-finish corrections (jarni-so-odp C1M_BR2_18:56 and the two
    nkz-19so K1M_BR2_19 cases), and one built on "any start change in a recorded generation" on the
    eight Attempts that reached their first start with a mark on the table (`DERIVATIONS.md`
    §4.11), K1M_BR2_19:54 included, whose XML copy of the standing `DNS` arrives 3.1 s after the
    start; the correct replay keeps `run` at 1 in all of them.
11. **Provisional (§1.2).** `status` is never provisional. Every other presented result value —
    the judging clause reaching the fields `CONTRACTS.md` §1.2 names, `underReview` and
    `qualified` included — has `provisional: true` **exactly when** one of (a)–(d) holds.
    - **(a) Inference.** It is an inference (`kind: inference`, or `outcome.kind: 'running'`).
    - **(b) Judging open.** The run is not closed, and its judging is incomplete or cannot be
      judged.
      - *Not closed* (`DERIVATIONS.md` §4.4, read from the raw stream at admission): no
        `Completed="Y"` listing of it carrying a `dtFinish`; no `oncourse-left` for it in this
        generation that a later `oncourse.updated` of the generation has not undone by listing it
        again (§4.1's false leave) — in a **D** re-run, listed in an earlier `oncourse.updated`
        and absent from the latest, so an Attempt never listed is not closed by that; and no
        presented no-result mark, `non-ranked` closing nothing.
      - *Incomplete, slalom:* a presented `gates` cell is `null`.
      - *Incomplete, Kayak Cross:* the Attempt's `faults` carries `judgingComplete: false`. The
        parser reads it over the slot cells and stamps the `faults` observation alone, and only a
        `known` one; the row's other observations carry no judging stamp, `runClosed` at most
        (`DERIVATIONS.md` §4.4, §4.6(d)), and the Cross branch never reads `gates`, which is
        `unavailable{not-applicable}` there. The observation read is the presented one: the row's
        once a row stating a result is presented, INV-2 rule 1 having no cell exception for
        `faults`, the stream's listing after it retained and never read (*recorded:* cp3-cross
        MX1_XT_26:41 at 08:12:38.051). A `not-yet` `faults` with a course bound, every slot
        blank, carries no stamp and is not under this clause (`CONTRACTS.md` §1.2).
      - *Cannot be judged:* `gates`, in Cross `faults`, is not `known` because no course is
        bound — the Attempt's Phase has no `known` `courseId`, or that Course no `known`
        `gates`, the binding the `false → true` rule below names; `not-yet` is the state of this
        case (`DERIVATIONS.md` §4.6), not only `unavailable{not-configured}` — and the
        observation's `judgingComplete` is not `true`. The parser stamps `null`, or nothing,
        without a course (`CONFORMANCE-VECTORS.md` §1); a `true` stamp is its judgement against
        a course and settles the value.
      - *Two exemptions* (`CONTRACTS.md` §1.2). The clause does not reach an Attempt with no run
        yet — `status` absent or `not-started`, its row carrying neither time nor mark: the
        values are run 1's, settled there, until the carry of (c) begins. Nor does it reach what
        a heat's row asserts with its `placement` — the placement, the ordinal built from it,
        and its `qualified` and `underReview` — from the step the placement is presented:
        upstream's whole result, asserted after the judging (`DERIVATIONS.md` §4.2, §4.7).
        Before that step they are under the clause like any value, and a heat's `faults` stays
        under it until the heat leaves the list (§4.2, §4.4's closure).
    - **(c) Carried from run 1.** It is a second run's `placement`, `pairTotal` or `countingRun`
      carried over from run 1, from the Attempt's first on-course listing in run 2, staged or
      started, until a row of run 2 carrying its time or its mark restates that field — judged
      field by field, since `countingRun` arrives only with the XML row.
      - *A refused mark restates nothing* (INV-7 "ignored for that field", the time held back
        with the mark, `CONTRACTS.md` §2.6), and the carry stands. Refused means refused **by
        the checker's own comparison**, property 5's reading as property 8 reads it: the
        snapshot's `changedAfter` against the presented `tcp` observation's latest delivery,
        made only where the row's mark would change the presented `tcp` `status` — rule 2's
        mark exception, one of `not-started`, `at-start`, `left-without-finish`. A row with no
        mark, and a row whose mark the presented `status` already is, are never refused; and
        never by whether a presentation followed.
      - *An admitted row restates* the field whether or not the system under test presents it,
        so a `provisional` left `true` after an admitted row is this property's report.
      - *A retraction of the restating row* (property 5: its mark cleared in place, the row
        gone) ends its restatement, and the row of run 2 with no time and no mark that follows
        leaves the fields carried again, the regression property 4 names having come first.

      *Recorded:* jarni-ne-do K1M_BR2_19:62, the XML `dns` row of 08:55:33 refused against the
      leave of 08:55:31, the TCP `dns` row of 08:55:39 restating `placement` and `pairTotal`,
      the next XML read `countingRun`, its `dns` already presented and nothing to guard.
      K1M_BR2_19:50, the XML time row of 08:50:12 with no mark, read while the Attempt was still
      listed, restating `countingRun`. jarni-so-odp C1M_BR2_18:51, `dns` at 13:48:30 cleared at
      13:54:15, its start 13:54:59.
    - **(d) A pending write.** Its `source` is `operator-write` with a pending `WriteRequest`.

    **It goes `false → true` only** through a regression first (property 4), or at one of these
    steps:
    - the Attempt's first on-course listing of a generation, staged or started (*recorded:*
      nkz-19so C1W_BR2_19:35 staged at 10:28:09.809), or one that lists it while no course is
      bound (a cold start: the results push precedes the first snapshot);
    - a re-listing within the generation that undoes a leave (`DERIVATIONS.md` §4.4);
    - upstream's withdrawal of a judged cell while it is listed, property 6(b): the stream's own
      listing blanking the cell, no presented row of the generation holding it judged (its cell
      blank, or no row yet), a row's judged cell standing (INV-2 rule 1). D4 recomputes on the
      presented cells (*recorded:* nkz-19so C1W_BR1_19:40 cell 16, the row blank at 08:38:18.153,
      the stream at .181, back at .562);
    - a course binding — the first step after which the Attempt's Phase has a `known`
      `courseId` and that Course a `known` `gates` (`phase.updated`, `course.updated`; **D**) —
      and showing a blank cell.

    A `standing.updated` entry's `provisional` is the disjunction over its Attempt's `outcome`,
    `placement` and `pairTotal` (§5 step 5).
12. **Marks (§2.6) D.** `outcome` is `{ kind: 'no-result' }` **exactly when** `status` is a result
    mark other than `non-ranked`, with the same status and the status's envelope, whatever time the
    row carried; a mark refused for `status` (properties 6(c) and 8) shows in no field. Two Attempts of one Phase presenting the same
    finish `eventTime` have a `duplicate-finish` diagnostic in that step.
13. **Re-baseline (`ADR-015`).** `scope.replaced` appears only at a `rebaseline` step and carries every
    Attempt of the scope and the Standings §7.2 names — none with no entries: a Standing of the
    scope absent from the message is one whose own Attempts give no entry on the state after the
    message's Attempts are applied — the Phase's, the second Phase's for a `pair` (which the
    message of a first-Phase scope does not carry), the heat's, and for an age category that
    category's entries, placed or not (`CONTRACTS.md` §5 steps 2–4; the checker assembles them from its own
    held Attempts, not from the message alone; recorded: cp3-cross at a stated 09:05Z re-baseline,
    `heat:WX1_XS_26:1/all` with its heat's placements in no XML row, rebuilt by the next TCP push). Across it, `entry`, `bib`, `run`,
    `startOrder`, `heat`, `startLane`, every check and flag, and every `WriteRequest` are unchanged;
    afterwards every presented value of a field §4 step 1 discards has `source` `tcp` or `xml`, and
    none of those has `source: tcp` until a `tcp` observation of it follows (`courseOrder`, `timeToBeat`
    and `status`'s lifecycle values survive the re-baseline with their `tcp` source; `splits` and a
    `running` outcome are on step 1's list and do not).
14. **On-course set (§7.1).** The set is upstream's list. An `attemptId` enters `oncourse.updated` only
    at an on-course listing of that Attempt and leaves only at an `oncourse-left` or `oncourse-empty`
    element — the `oncourse-left` being the one the core derived at that step's TCP message, checked
    against the raw stream by `DERIVATIONS.md` §4.1's rule — never because its `status`
    became `finished` or a mark, which keep it listed until
    closure. **D:** every listed Attempt has a presented status other than `not-started` and
    `left-without-finish`; the list is ordered by presented `courseOrder` ascending, Attempts without
    one last by `startOrder`.
15. **Standing (§5) D.** Every placed entry of a whole-class `standing.updated` has the `rank` and
    `order` of its Attempt's presented `placement`; entries sort by `order`; unplaced entries follow
    in step 3's order; an age-category standing lists the category's entries in that order, a
    placed entry's `rank` and `order` being its position among the category's placed entries
    (consecutive across a class tie) and an unplaced one's `null`; `provisional` and `underReview` follow step 5; an entry's `result`
    is `pending` while its Attempt is `pending` or `running`. A `standing.updated` appears only at a
    step that changed the standing as serialised (§5 step 1): an Attempt's `placement`, a result
    outcome, `pairTotal`, `provisional` or `underReview`; an entry's Attempt removed (§4 INV-7); an Entry's `ageCategoryId` becoming known (a
    category standing's first publication); a second Phase's `pair.siblingPhaseId` becoming known
    (the `pair` standing's first publication, §5 step 1); a snapshot's category ranks raising or
    clearing an anomaly; or `scope.replaced`. A running athlete's tick never produces one. **A `classification`
    standing has no Attempts:** its entries come from the classification Phase's rows (§5 step 2), each
    entry's `rank` and `order` equal those of the row with its `entryId` (a classification's bibs are
    not keyed on, DERIVATIONS §4.10) and its `decidedIn` its row's or, where a `tcp` row
    states `null`, the last admitted `xml` row's for that `entryId` (a refused snapshot moves
    nothing); its first publication is its first row
    observation (a scope snapshot of the Phase with no rows before that publishes nothing, and one
    with no rows after rows changes nothing: the Standing stays as last built, `asOf` included —
    maintainer, 2026-11-06); each
    scope snapshot of the Phase that passes INV-2c's guard across sources (`DERIVATIONS.md` §4.10:
    an `xml` snapshot against rows a `tcp` snapshot has stated, built or re-delivered equal,
    needs a `changedAfter` later than their latest `tcp` delivery, `null` never; a `tcp`
    snapshot always) replaces its rows whole, and it changes only at such a snapshot or
    `scope.replaced`. A classification row is
    `CONTRACTS.md` §8.3's `ClassificationRow`, flat: `rank: number | null`, a numeric `order`,
    `decidedIn: string | null`; on site it arrives in a scope snapshot of the classification Phase
    (`CONFORMANCE-VECTORS.md` §1), and a `null` `decidedIn` is relayed as `null`.

*What this gate is, and is not.* It is a mechanical, oracle-free check: it needs no ground truth,
only the shape the invariants already commit to, and it catches the whole class of "deterministic
but wrong" merge bugs that violate the contract's own stated structure, which is most of them. It
does not catch a bug that is invariant-conformant and still numerically wrong (a unit error, a
misparsed field, a wrong gate cell) — gate 3 is what catches that. Nor does it see the retained,
non-presented observations: INV-2b's `source-disagreement` diagnostics are its only trace of them,
and whether such a disagreement *should* have been raised is a tier-1 question. And it is blind to
a stale mark presented over a running athlete after a re-run (`DERIVATIONS.md` §4.12): with the stale-mark rule removed from a core, the step logs of the DNF re-run fixtures
change and the checker reports nothing. That defect is caught by the vector
`rerun-stale-mark-not-presented` and by the re-run data gate's own assertions
(`scripts/__tests__/rerun-paths.test.ts`); no property clause is added for it (accepted by
the maintainer, 2026-11-11). A property that a
correct replay cannot satisfy is a finding against the contract, not against the replay: it is
reported to the design authority, never relaxed in the checker.

**Who writes the checker, and what it reads** (`DECISIONS/ADR-017` Revision 4). The gate-2 checker
is written by a different author than the merge core, from this section's text alone, and
**mutation-tested per property**: each property must fail on a replay deliberately broken for it,
and a property that no replay exercises is not evidence until one does. **A fixture says which:**
`evidence.gate2.exercised` records, per property, the number of steps that evaluated it
(`schemas/fixture-admitted.schema.json`); a zero does not block admission, it tells every consumer
that the fixture is no evidence for that property, and `violations` lists only what was evaluated.
A count under properties 8 and 13 may rest on a stated outage or re-baseline, an input the
recording lacked: the fixture's own `source.events` says so, and the count itself carries no mark
(a default, `DERIVATIONS.md` §10 item 46 (b)). Properties that judge membership, element
classification or attribution — 3, 6, 10, 11, 13 and 14 — **read upstream's raw stream**, not the
ingest's own elements: a checker that trusts the `oncourse-left` the code under test emitted cannot
see a wrong leave. The checker therefore runs with the recording (`--recording`); without it only
the properties marked **D**, and the **D** readings of 6(b) and 11, can be evaluated, and such a
run admits nothing. A checker failure has three possible verdicts — contract conflict,
implementation bug, checker bug — and the design authority assigns it; "the reading that makes the
vectors pass" is not a verdict.

**Gate 3 — against Canoe123's own results.**
- **What exists: the final state against the last XML.** Step 3 of `npm run gates` compares, for
  each recording, every Attempt's final presented state with the recording's last XML snapshot,
  field by field, in `DERIVATIONS.md`'s units. A difference fails the step unless
  `scripts/gates/known-differences.json` lists it. **A known difference pins its values:** each
  entry names the recording, the Attempt, the field (and the gate for `Gates`), the two values it
  tolerates, `xml` and `presented`, and the issue tracking it; a listed difference with other values
  fails, and an entry that no longer differs fails as stale. A failure is triaged as a server bug, a
  checker bug or a known upstream difference.
- **The admission form. Not built** (c123-server#336). A window that **spans whole races** — every
  race whose Attempts the fixture asserts has its full on-course span inside the window — compared,
  for every finisher, on `outcome`, `gates`, `pairTotal` and `placement` with the **published
  results** (the day's final XML stands in for them once the human line certifies it), a difference
  being a mismatch unless a listed, dated protest correction explains it; and a person certifying
  the fixture once, at admission, by signing the comparison report: `human-checked-<date> by
  <name>`. A window that cuts a race can only be checked against upstream's XML at its last
  snapshot (`against: window-end-xml`), and such a check never admits. Where a fixture exercises a
  shape a tier-1 vector has (a two-run BR2 case, a Cross ordinal outcome), its result for that
  shape must agree with the vector's `expect`.

**Regression against an admitted fixture.** A later ingest of the same input diffed against the
stored, admitted fixture, which two fresh runs of regressed but deterministic code cannot do.
**Not built:** it needs admitted fixtures (c123-protocol-docs#15).

**Cross-check of `live-mini-server` against an admitted fixture.** The fixture's deltas replayed as
§8.3 `PUT` calls against a `live-mini-server` test instance, the values read back over §8.4
compared, and the **D** properties run on the public stream. The pairing can only implicate
`live-mini-server`, and only once the fixture has cleared gates 1–3. **Not built:** it needs
admitted fixtures (c123-protocol-docs#15).

**Fixture catalogue.** **Not built** (c123-protocol-docs#16; §6).

### 3.3 Tier 3 — Presentation rendering

**What it proves:** a client, given a sequence of domain states and a controllable clock, renders
what its own stated display-lifetime policy says it should, at every point in elapsed time — not
only at the moment a step arrives.

**Its input is domain states, never a recording and never raw Canoe123 traffic:** the domain layer
resolves every value before it reaches a client (`ARCHITECTURE.md` §2), so no client needs a replay
pipeline or a mock WebSocket server of its own. The input is in the §4 format, captured from a
replay or hand-authored to land exactly on a threshold; both feed the same harness. Captured,
admitted fixtures and a shared set of synthetic ones are not built (§3.2; c123-protocol-docs#15,
#20). c123-scoreboard has the harness since c123-scoreboard#151, fed by its own synthetic fixtures (§4, `RULINGS.md` R-27).

**What is not shared, and must not be:** the *assertions*. Display-lifetime policy is correctly
different per client and audience (`ARCHITECTURE.md` §2: two correctly implemented clients may
legitimately disagree). Each repository owns and tests its own thresholds (grace periods,
highlight duration, auto-scroll pacing, the departing timeout) against the shared format.

**The clock requirement (§5)** is what this tier cannot work without. Frame-driven and
compositor-driven logic need §5's two answers. A rule that recomputes only when an action is
dispatched, as the scoreboard's grace-period and stale-competitor eviction does today, has no timer
for a fake clock to reach; re-evaluating on a tick is a requirement on the target client
architecture (`ARCHITECTURE.md` §2).

**Harness shape:**

1. Load the domain-state input.
2. Initialise the client under test from its hydration step (§4): a `kind: "hydration"` entry
   carrying the §7.1/§8.4 response bodies and their `asOfSeq`, applied exactly as the
   subscribe-before-snapshot handshake would. Set the fake clock to **a stated non-zero offset from
   that entry's `observedAt`** (the harness names it, e.g. +37 s), never to `observedAt` itself: a
   client that anchors a display lifetime on a payload's `observedAt` instead of its own receipt
   time must fail here, and with the clock equal to `observedAt` it could not.
3. For each later entry: advance the fake clock by the gap between its `observedAt` and the
   previous entry's, keeping the offset, then apply the delta exactly as the real transport would
   deliver it.
4. Assert on rendered output — the DOM via testing-library, or the view-model a render function
   consumes — immediately after a step, or after advancing the clock further with **no new entry**,
   to test a grace period expiring on elapsed time alone. The assertion instant is the deadline
   plus the client's stated tick period (§5), never deadline + 1 ms.

**Kayak Cross's deadline:** tier 2 asserts the fact half, that the domain layer presents the
operator's heat order when it is ingested, well before the next heat's first on-course
observation. Tier 3 asserts the presentation half: what the scoreboard renders between the two,
and for how long (`ARCHITECTURE.md` §6.D).

### 3.4 Tier 4 — End-to-end smoke

**What it proves:** the wiring connects. A real `c123-server` process, pointed at a real or
player-emulated Canoe123, serves a real client build over the real network path, a write
round-trips, a bridge push reaches a real `live-mini-server` instance.

**What it does not prove, deliberately:** anything about domain semantics or presentation timing;
tiers 1–3 cover those far more cheaply. This tier is kept few and expensive on purpose, so that a
failure here almost always means transport, deployment or version skew.

**What exists: the real process against the replay** (`scripts/__tests__/onsite-process.test.ts`,
`onsite-write.test.ts`, run in step 1 of `npm run gates`; `DECISIONS/ADR-017` item 5, Revision 7):
the process runs on the player's clock, rate and origin given at start; the comparison strips the
stamps and `source` on `run`, nothing else; its step log is a tier-4 artefact, gate 2 run on it
with `--recording` at 1× only.

**The write echo.** `player.js` does not emulate the write-side channel a `PenaltyCorrection`
travels on (c123-protocol-docs#19). Penalty-check's tier-4 smoke therefore covers request →
`WriteRequest{pending}` → push, and stops there; the echo half is tier 1's (`operator-write-*`
vectors). A realistic upstream echo at tier 4 waits for the player to emulate the channel, and
`c123-penalty-check#52` is met by the two tiers together, minus that.

### 3.5 Outside the tiers: durable workflow state (#168) and tenant isolation

Gate checks and flags (`CONTRACTS.md` §2.10) exist nowhere upstream, so they appear in no recording
and no fixture, and tiers 2 and 3 cannot cover them. They do not need to. They are a bounded storage
feature that stores and overwrites data and barely depends on timing or on what happens on course.
**Their durability is verified by ordinary unit and integration tests of the store in
`c123-server`, outside the replay and fixture tiers**, one per case:
- restart round-trip: written, process restarted, read back equal;
- crash mid-write: a failure between the temporary file and the rename leaves the previous complete
  state;
- event switch without merging: a new event opens an empty store and leaves the old file unchanged;
- re-run not carried over: a run-1 check reads `plain` for run 2;
- re-baseline preserved: checks and flags survive, status recomputed;
- stale after a late correction: a check against `2`, a later presented `50`, reads `stale`;
- flag lifecycle: create, `flagged`, resolve, back to the check status.

Only the genuinely contract-level rules are tier-1 vectors: what `stale` compares against (`null`
against `0`, team sums, `gates` not known) and the re-run and re-bib interplay
(`CONFORMANCE-VECTORS.md` §2).

**The writes store is the same kind of state** (`CONTRACTS.md` §1.5: every `WriteRequest` and
both key maps), and so are its tests: a failed store write, the keys across a restart, and a
`pending` write resumed after one. No recording holds a write, and no vector feeds a resumed
one. One rule here is a duty of whatever resumes writes, not of the merge alone: all pending
writes of one Attempt are handed to it in one unit, in the order sent
(`DERIVATIONS.md` §6; §10 item 50 (d)). Any adapter or deployable that resumes writes tests
that on its own hand-over, with two writes pending on one gate.

**Tenant isolation** (`CONTRACTS.md` §8.1) is the same kind of thing on live-mini-server: a storage
property, verified by that store's own integration tests, not by a tier. The cases, one line each:
two keys, same `classId`/`phaseId`/`entryId`/`bib`, no leakage in either direction through any §8.4
read or the stream; a key never reads or writes another event; a revoked key gets `403` and changes
nothing; a public read of an unknown `eventId` is `404`, never another organiser's data.

### 3.6 Checker conditions moved from CONTRACTS

Each subsection below is moved word for word from the `CONTRACTS.md` section its title names,
where a one-line pointer to it now stands. Inside them a bare section number, an invariant
(INV-n) and "rule n" refer to `CONTRACTS.md`, and "above" and "below" to the original place.

#### 3.6.1 Condition 1 of `provisional` in full: the gates vector's envelope (from CONTRACTS section 1.2)

**Condition 1 in full: the stream's cells and the merged vector.** `gates` is merged cell by cell
(§4 rule 1), so its envelope needs a rule of its own.
- **Before a row.** The stream's own gate cells — in Kayak Cross the `faults` built from them —
  are an inference while no row of the generation stating a result is presented:
  `confidence: 'inferred'`, never retracted (INV-7). A row states a result by a time or a mark,
  INV-7's test; cells alone state none.
- **Once such a row is presented,** the merged vector is that row's observation:
  `confidence: 'authoritative'`, `source` the presented row's. A cell merged in from the stream
  under rule 1's exception does not make the row's vector an inference.
- **Its `observedAt` is the later of two instants:** the presented observation's own element — the
  row whose observation of the field became presented — and the element's that last changed the
  presented cells, a listing's included. `observedAt` is when the presented observation was
  captured, and rule 1's supersession presents a new one, as INV-5's regained precedence does.
- **What moves it.** A row that first supersedes the stream's inference presents, equal cells or
  not: the supersession is a change of what is presented. A later row from the presented source
  restating equal cells is an INV-5 re-delivery and moves nothing; a row from another source that
  takes over under §4 rule 2 presents, equal cells or not (`DERIVATIONS.md` §10 item 39). Equal is to the **presented** merged cells — INV-5's
  own test is the value already presented from that source — never to that source's previous
  row, and whether a course was bound when the row arrived changes nothing of this.
- **After the row's retraction** the stream's vector is an inference again, with the envelope of
  the retained listing: the last listing that changed the presented cells, never a later
  identical delivery (INV-5).

*Examples* (recorded; `TEST-ARCHITECTURE.md` §3.2 property 1 gives the instants). A row and the
listings around it all state nine clean cells (cp3-cross MX1_XT_26:8): the vector carries the
row's instant, since the row superseded the inference and every later listing is identical. A row
arrives with cell 23 blank, a listing then judges the cell clean, and a second row fills it with
`0` (nkz-19so K1M_BR2_19:81): the vector carries the listing's instant; the second row differs
from the first and changes nothing presented, so it moves nothing.

#### 3.6.2 INV-2c, content age across sources (from CONTRACTS section 4)

*Applied by the server at runtime: moved to `DERIVATIONS.md` §11.23.*

#### 3.6.3 INV-7: the content-age guard on XML retractions (from CONTRACTS section 4)

*Applied by the server at runtime: moved to `DERIVATIONS.md` §11.24.*

#### 3.6.4 The conformance vectors' `pair` and class (from CONTRACTS section 5, step 1)

The conformance vectors, whose Phases no element describes, get a `pair` from their harness, which
states it as it states the class (`CONFORMANCE-VECTORS.md` §1, a convention of that file alone). A
standing waits for its Phase (§5 step 1); a vector's Phase has its class by convention from its
first observation (`CONFORMANCE-VECTORS.md` §1), so nothing waits there.

#### 3.6.5 A tier-1 vector's `confirmedValue` (from CONTRACTS section 7.3)

A tier-1 vector's `writeRequest.confirmedValue` is the merge
port's cell vector, the harness shape of `CONFORMANCE-VECTORS.md` §1, which this serialisation maps to
the target cell.

---

## 4. The fixture format

**One format for a domain-state fixture and for every tier-3 input:** a sequence of the `{seq, type,
…}` deltas `CONTRACTS.md` §7.2/§8.4 define — `attempt.updated`, `attempt.deleted`, `phase.updated`,
`phase.deleted`, `entry.updated`, `class.updated`, `course.updated`, `standing.updated`,
`oncourse.updated`, `scope.replaced`, `event.changed`, `write.updated`, `sources.updated`,
`diagnostics.updated`, `check.updated`, `flag.updated`, each with the payload keys those sections
give — after a hydration step, with a file-level header. A fixture is a file-based instance of
exactly what a real client consumes live: no second data model, so the tier-3 harness is, to the
client code under test, indistinguishable from a slow subscription. The capture that would produce
fixtures and the catalogue that would distribute them are not built (§3.2, §6). The `admitted`
block is fixed by `schemas/fixture-admitted.schema.json`, which the contract package ships.

```json
{ "fixtureId": "slalom-br2-finale",
  "source": { "kind": "recording", "excerpt": "2026-04-19-jarni-ne-odp#003", "sha256": "…" },
  "domainLayerVersion": { "contract": "3.0.0", "generator": "c123-server 1.0.0 (a1b2c3d)" },
  "admitted": { "status": "admitted", "gate1": true, "gate2": true, "gate3": { "…": "…" },
                "evidence": { "…": "…" } },
  "asOfSeq": 0,
  "steps": [
    { "kind": "hydration", "observedAt": "2026-09-15T10:13:50.000Z", "asOfSeq": 1040,
      "responses": { "/api/events/current": { ... }, "/api/phases/K1M_ST_BR2_6/attempts": { ... } } },
    { "seq": 1044, "observedAt": "2026-09-15T10:14:02.083Z", "type": "attempt.updated",
      "attemptId": "K1M_ST_BR2_6:9", "fields": { "outcome": { "state": "known", "value": {...}, ... } } }
  ] }
```

`source.kind` is `"recording"` (traceable to an excerpt's checksum, tier 2's natural output) or
`"synthetic"` (hand-authored, with a `reason` string instead of an excerpt reference — written
directly from a `CONTRACTS.md` clause or an invariant, the same way tier 1's vectors are).
`source.excerpt` is `<recording>#<chunk>` or `<recording>#<fromMs>-<toMs>` for a time window;
`source.sha256` is the excerpt's `data.jsonl` checksum, which must not include free text such as a
label. Where the replay began before the window (§3.2), `source.input` names the stream replayed,
`<recording>#<fromMs>-<toMs>` from the recording's first record to the window's end, with its own
`sha256`; like `events` (§3.2), prose only until the schema names it.

**`domainLayerVersion` has two axes** (`DECISIONS/ADR-017` D5). `contract` is the version of the
§7/§8 wire shapes: the server's wire-protocol `VERSION` once the new contract is implemented (it
leaves today's 2.0.0, since every client renegotiates), and until then a `docs/arch@<commit>` ref.
`generator` is the c123-server release and commit that produced the deltas. **A `contract`
mismatch fails, loudly**: a warning would let a stale fixture keep passing; a consumer that wants
the older fixture re-pins deliberately. A `generator` change is not a consumer's concern: it
requires re-admission through gates 1–3 and a new fixture revision (§6).

**A client's own synthetic fixtures, until the admission machinery exists** (`RULINGS.md` R-27). A
client's contract is the contract package it pins, which carries neither a wire-protocol `VERSION`
nor a `docs/arch` commit. So a client's synthetic fixture states the pinned package's version as
`domainLayerVersion.contract`, and the client's harness compares it with the `version` in
`@opencanoetiming/c123-contract/package.json`; a mismatch fails. The package ships no schema for
the whole file yet, only `fixture-admitted.schema.json`. Until it does, the harness checks the
header and the steps itself: `fixtureId`, `source.kind: "synthetic"` with a `reason`,
`domainLayerVersion.contract`, a first step of `kind: "hydration"`, and each delta step against the
package's delta types. An `admitted` block, where one is present, is validated against
`fixture-admitted.schema.json`.

**The hydration step** holds every §7.1 (or §8.4) GET body of the event at one `asOfSeq`, taken at
the step that completes the cold-start snapshot read or, for a window inside a longer replay
(§3.2), at the window's opening step; its `observedAt` is the recorded time of the last element
those bodies reflect. The file-level `asOfSeq` is the counter when capture began, 0 for a cold
replay. A delta step's `observedAt` is the recorded `observedAt` of the element that produced it.

**`admitted` is what distinguishes a candidate from a golden baseline** (§3.2), and its schema
enforces it: `schemas/fixture-admitted.schema.json`. The block carries `status`, `candidate` or
`admitted`, and the schema's `if/then` allows `admitted` **only** with `gate1` and `gate2` true,
`gate3.mechanical.against: "published-results"`, `windowSpansWholeRaces: true`, `mismatch` 0 and
`gate3.human` matching `human-checked-<date> by <name>`; the `evidence` block carries the two
step-log, final-state and candidate hashes of gate 1 and the checker's violation counts and, per
property, how many steps evaluated it (`exercised`; §3.2). A candidate is never something a
consumer pins to; only an admitted fixture is published (§6). Gate 2 is never relaxed to admit: a
candidate waits for the contract amendment and the pipeline is re-run.

---

## 5. The clock requirement

**Every piece of code that makes a display-lifetime decision — client-side, or the server-side
time-windowed reads of §3.1 — must read time through an injected clock, never by calling
`Date.now()`, `setTimeout`, `setInterval` or `requestAnimationFrame` directly.**

```ts
interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): TimerHandle
  clearTimeout(handle: TimerHandle): void
  requestFrame(fn: (t: number) => void): TimerHandle
  cancelFrame(handle: TimerHandle): void
}
```

**`requestFrame` is required:** continuous auto-scroll and the re-render driver behind highlight
and departing timing are `requestAnimationFrame`/`performance.now()`-based, and a `Clock` without a
frame method cannot intercept them. Any production `Clock` wraps the real `requestAnimationFrame`;
any test `Clock` advances frames the same explicit way it advances timers.

**What no `Clock`, real or fake, can reach: browser-compositor animation** — native
`scrollTo`/`scrollIntoView({behavior:'smooth'})` and CSS `@keyframes` (the highlight pulse). These
run outside JavaScript's clock once started. They stay behind `prefers-reduced-motion`, and
Playwright asserts the resulting state once it settles; tier 3's fake-clock harness is not the tool
for them.

A thin production implementation wraps the real globals; a thin test implementation is a virtual
clock a test advances explicitly and deterministically. In a client the sites are today's timing
logic — in the scoreboard `context/constants.ts`, `useDeparting.ts`, `useAutoScroll.ts` and
`useHighlight.ts` — each a mechanical, narrowly scoped change. In c123-server the XML reader and the
on-site process already read time through the `Clock`.

**When it is done (maintainer decision, c123-server#167): during each client's migration to this
contract, not retrofitted to today's code.** The sites that most need it are the on-course reducer,
the run-2 merger and the on-course penalty cache; once the server interprets upstream, these are
rewritten or deleted, so a retrofit would be thrown away. The rule is part of every client
migration's definition of done:
- every display-lifetime rule reads time through the `Clock`;
- every such rule is also re-evaluated on a clock tick, and **takes effect no later than one tick
  period after its deadline**; the client states its tick period with its policy (§3.3), a period
  above 1 s with a stated reason, and its tier-3 tests assert at deadline + that period (without a
  stated period a test cannot pick its instant, and a correct periodic client fails at
  deadline + 1 ms);
- every such rule has a tier-3 test that advances a fake `Clock`.

The fake `Clock` is not a global fake-timer patch.

**On the server side, the same interface and the same discipline:** §3.1's time-windowed reads (the
live-ingest calendar's `status`) need "now" to be injectable, because a test of "just under the
5-minute window" against "just over it" cannot wait 5 real minutes. `live-mini-server`'s calendar
computation depends on this `Clock`, not on `Date.now()`.

---

## 6. Ownership and distribution

**Not built** (c123-protocol-docs#16). What it is for: `c123-protocol-docs` stores admitted
domain-state fixtures beside the recordings, through `recordings-cli.js`'s catalogue
(`push <event> --release <tag>`, `fetch`/`list`/`path`), and `c123-server`, the only on-site domain
layer, is the only repository that generates them. **Each consuming repository pulls a specific,
pinned fixture set — never a floating "latest"** — through a committed reference naming fixture id
and version, advanced deliberately, as with `@opencanoetiming/timing-design-system`. A fixture has
three identities, and the catalogue key carries them: `<fixtureId>@<contract>+<generator>` (§4;
`DECISIONS/ADR-017` D5). Fixtures are published gzipped, and only admitted ones (§3.2).

---

## 7. Diagnosing disagreement between two components

Each tier's input is the previous tier's already-checked output, so the tier at which a test first
fails names the component at fault.

- Tier 1 fails → the merge rule in whichever implementation failed it (`c123-server` or
  `live-mini-server`). Symmetric only for the 18 vectors both run (`CONFORMANCE-VECTORS.md` §1),
  where the other implementation is a comparison; a failure in a vector only one of them runs names
  that implementation alone.
- Gate 1 fails → `c123-server`: a non-determinism bug, not a wrong-answer one.
- Gate 1 passes and gate 2 fails → `c123-server`'s output violates `CONTRACTS.md` §4's structure,
  checkable without reference to anything else; the verdict is assigned as §3.2 says.
- Gate 2 passes and gate 3 disagrees → **not automatically attributable**: the core, the
  comparison or upstream's own data may be wrong; a person adjudicates it against `CONTRACTS.md`
  prose.
- A client's tier 3 fails on correct domain states → that client: it received the correct state
  and rendered it wrong.
- With admitted fixtures (not built, §3.2): a `live-mini-server` cross-check failure names
  `live-mini-server`; an admitted fixture's regression failure names whichever implementation
  changed since admission.
- **All relevant tiers pass, and two deployed clients still visibly disagree:** first check that
  both are on the same contract version (§4); a stale one reproducing an already-fixed disagreement
  is not a new bug. If they match, the live case is covered by no test yet — that is the finding,
  and the fix is a new test of it, not a patch of the symptom in one client.
- **Two clients disagree on a presentation-layer fact** — how long a finisher stays pinned, when a
  highlight fades. Per `ARCHITECTURE.md` §2 this is not automatically a bug. The test question is
  whether each client matches *its own* stated policy (§3.3); if both do, the disagreement is a
  designed difference in audience.

---

## 8. What is deliberately not tested

- **Ground-truth validation against official result sheets, as a repeated assertion.** Whether a
  fixture's numbers match what officials published is a one-time human judgement at admission
  (§3.2, gate 3), not an automated, repeated assertion.
- **Whole recordings in CI.** CI replays no recording; `npm run gates` does, on demand and on the
  maintainers' runner (§3.2), and whether CI runs it is c123-server#324.
- **Cross-client visual or pixel-identical comparison.** Two clients are not required to look
  alike, only each to satisfy its own stated policy (§7).
- **Visual regression within one client, as a tier.** Screenshot suites, such as today's Playwright
  suites in `c123-scoreboard` and `c123-penalty-check`, stay with each client as its own discipline.
  They sit outside the four tiers, which neither adopt nor retire them (maintainer decision,
  c123-server#170). Tier 3 asserts behaviour on the DOM or view-model; appearance is the client's.
- **`c123-xml-tools` and `timing-design-system`.** Out of scope, as for the architecture
  (`CONSTRAINTS.md` §1.6).
- **Capacity under load, as a tier.** The spike measured it once (`DECISIONS/ADR-017`): a live push
  peak of 12.2 pushes/s coalesced, and a finish re-ranking every slower placed row so that
  placement-only pushes are 78–94 % of Results-row pushes (~160 B each). Any later estimate starts
  from those figures, not from "one or two rows per finish"; the §8.3 store's own margin is M3's to
  measure.
- **A migration plan for existing tests.** Which of today's tests move first, get deleted or run
  alongside the tiers is sequencing, out of scope here (`CONSTRAINTS.md` §4).

---

## 9. What survives, what's obsoleted, what needs rework

**Exists and is used:**
- `player.js`, with its Control API: drives tier 4 and the dev environment. Only its TCP and XML
  emulation matter; CIS is not consumed (`DECISIONS/ADR-011`), so its CIS emulator's two known
  bugs block nothing.
- `scripts/replay-direct.ts`, the gate-2 checker, the gate-3 comparator and `npm run gates` (§3.2);
  the tier-1 adapter (§3.1); the store tests (§3.5); the on-site process against the player (§3.4).
- `extract-excerpt.js`, for excerpts (`manifest.json`, `excerpt.json`, `data.jsonl`), and
  `recordings-cli.js`, for recordings.

**Inputs the recordings lack.** The recordings hold no connection records: `recorder.js` writes TCP
connection changes only to the console, and must write them as records, since INV-2 rule 2 and
INV-7's guard are decided by them. A replay therefore states one `tcp-connected` at the first TCP
record unless `--events` or the recording states its own (§3.2), and rule 2's outage path is tested
on recordings only through a stated outage. No recording holds a re-baseline; one is stated the
same way.

**Obsoleted:**
- The per-project verification matrix and the "baselines live in each project's repo" policy of the
  earlier QA-layer spec: one authorial location replaces them (§6).
- Each repository's own mock-WebSocket server and fixture loader, and the plan to port
  `c123-penalty-check`'s mock server into `c123-live-mini`: tier 3's harness on the shared format
  (§3.3, §4) replaces them, and nothing is left to port.
- `replay-server.js`, deprecated in favour of `player.js`.
- The QA-layer spec and plan themselves: superseded, not amended.

**Needs rework, or does not yet exist:**
- Capture and admission tooling (c123-protocol-docs#15; the human half of gate 3, c123-server#336),
  the fixture catalogue with two-axis versioning in `recordings-cli.js` (c123-protocol-docs#16) and
  synthetic fixtures (c123-protocol-docs#20): parked, "Hardening (after Jarní slalom)".
- Write-echo emulation in `player.js` (c123-protocol-docs#19).
- `extract-excerpt.js` writing an absolute start time instead of an epoch offset, and keeping the
  free-text label out of the checksum (c123-protocol-docs#18).
- The gates in CI (c123-server#324).
- `live-mini-server`'s tier-1 runner and calendar vectors (§3.1), and each client's tier-3 harness
  (§3.3; c123-scoreboard#151), in their migrations.
- `test-utils.js` stands up a player and reads raw TCP off it; loading domain states into a tier-3
  harness is not there.

---

## 10. Left open

- Which test runner each repository uses for tier 3 is its own choice; this document requires the
  clock-injection discipline (§5) and the format (§4), not a library.
- CI wiring and schedule of the gates: c123-server#324.
- **Answered:** `recordings-cli.js`'s versioning needs the second axis: a fixture has three
  identities, catalogue key `<fixtureId>@<contract>+<generator>`, with gzip (§4, §6; not built,
  c123-protocol-docs#16).
- **Answered:** re-implementing the tier-3 harness driver per client relocates the cost of the
  mock-server port rather than removing it, in a deterministic form that can assert what the port
  could not; the spike's driver took 249 infrastructure and 94 test lines.
