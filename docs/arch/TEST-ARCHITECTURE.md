# Test Architecture — c123 Ecosystem

Greenfield, designed from `CONTRACTS.md` and `ARCHITECTURE.md` as they now stand, not from the
existing QA-layer spec or plan. What survives from that work is stated at the end, reached by
designing, not by starting there. Same discipline as `CONTRACTS.md`: precise enough to implement
against, honest about what it leaves open. This document is a contract for tests, not a test suite —
no code, no assertions, the shape both need to exist in before either is written.

---

## 0. How to read this document

§1 states why this exists and what it must be able to prove. §2 is the one design decision
everything else follows from — two different kinds of determinism, needing two different
mechanisms. §3 is the four tiers. §4–§6 are the shared machinery every tier depends on: the fixture
format, the clock requirement, and where fixtures live. §7 answers directly the question this whole
engagement was commissioned to answer: how a test says which component is wrong. §8–§9 are the
honest boundaries — what stays untested, and what of the existing tooling and plans this replaces,
keeps, or requires rework.

---

## 1. Why this document, and why now

`CONTRACTS.md` §4 states a determinism claim in exactly these words: "given the same sequence of
ingested messages... the resulting state is a pure function of that sequence." **Nothing in the
ecosystem today could falsify that sentence.** It is the single most load-bearing claim in the
primary deliverable, and until this document, it was a promise with no mechanism that could prove it
false. §3.2 below is that mechanism.

Second, independently of the domain design: each of the four deployable repositories carries its own
open issue planning a testing approach — `c123-server#66`, `c123-scoreboard#43`,
`c123-penalty-check#52`, `c123-live-mini#105` — and `c123-live-mini#105` contains a table, "Ecosystem
Resources to Reuse," naming what to borrow from each of its three siblings: a mock WebSocket server
and Playwright screenshot pattern from `c123-penalty-check`, a recording-based fixture loader from
`c123-server`, and the replay tooling from `c123-protocol-docs`. Read plainly, this is four
independent decisions about how to verify the same underlying fact, one layer above the four
independent decisions about how to *interpret* it that the rest of this engagement exists to remove.
The existing QA-layer design spec (`c123-protocol-docs/docs/specs/2026-05-13-qa-layer-design.md`)
states its own baseline policy outright, at lines 138–143: **"Baselines are stored in each project's
repo, not in protocol-docs... projects own the expected output."** That sentence is the duplication
this document is written to remove, checked against the actual spec text rather than assumed.

Third: of that spec's eight planned tasks, only the first two — `extract-excerpt.js` and
`test-utils.js` — are built. `qa/excerpts/` is empty; `qa/README.md`, the seven planned scenario
excerpts, and the verification-matrix document do not exist. Almost nothing is actually in flight.
This is a genuinely greenfield moment, not a redesign of working infrastructure.

---

## 2. Two determinisms, two machines

`ARCHITECTURE.md` §2 already drew the line this document builds on: the server owns any decision
whose wrong answer is a wrong *fact*; a client owns any decision whose wrong answer is a worse
*presentation*. Testing inherits that split exactly, because the two halves are deterministic in
different variables:

- **The domain layer's merge state** (`c123-server`, `live-mini-server`) is a pure function of the
  *ingest sequence* — `CONTRACTS.md` §4 INV-6 already makes this orderable independent of wall-clock
  time. Given the same ordered inputs, it must produce the same outputs, full stop.
- **A third category exists, found under review rather than designed in from the start: some
  domain-layer facts are also a function of wall-clock-*now*, at read time, not only of the ingest
  sequence.** `CONTRACTS.md` §8.4's calendar `status` is the concrete instance — `live`/`upcoming`/
  `past` is computed from whether a push arrived within a stated 5-minute window of *now*, a
  deliberate and still-correct design decision, but one this document's first draft's categorical
  claim above did not leave room for. §3.1 extends to cover it, rather than leaving it untested by
  every tier, which is exactly where it fell when only two categories were named.
- **The presentation layer** (`c123-scoreboard`, `c123-penalty-check`, `c123-live-mini`'s client) is
  a function of *a sequence of domain states plus elapsed time*. Auto-scroll, highlight duration,
  grace periods before eviction, the departing timeout, Kayak Cross's "shown before the next heat
  starts" deadline — every one of these has the clock as a genuine input, not incidental detail.
  `CONTRACTS.md` §2.6 already requires the domain layer to push a Cross assertion the instant it is
  ingested, with no artificial delay; what a client does with the time *between* that push and
  whatever comes next is exactly the variable this tier exists to control.

A test architecture that hands a client a fixed snapshot and asserts on it once can see the first
kind of determinism and is blind to the second. Both need to be first-class or the design fails
exactly where the maintainer warned it would.

---

## 3. Four tiers

### 3.1 Tier 1 — Contract conformance

**What it proves:** an implementation of the merge rule (`CONTRACTS.md` §4's ten invariants and the
precedence rules) is correct, in isolation, with no recording and no running server.

**Who this applies to:** exactly the two components that implement the merge rule —
`c123-server` and `live-mini-server` (`ARCHITECTURE.md` §3: live-mini applies "the *same* merge
invariants," not its own). It does not apply to any rendering client; they never merge anything.

**Shape:** a small set of hand-authored **test vectors**, data only, no shared runtime code (the same
discipline `DECISIONS/ADR-002`/`ADR-003` already committed to: share types and data, never share
logic across repository boundaries). Each vector is: an ordered list of synthetic observations
(`source`, `observedAt`, optionally `eventTime`, `value`) for one field, and the expected presented
envelope after they are applied in order. Every invariant gets at least one vector written directly
from its `CONTRACTS.md` §4 clause — the INV-2c vector below is written straight from that clause's
own prose, not from any recording:

```json
{ "id": "inv2c-older-event-refused",
  "given": [
    { "ingestSeq": 1, "source": "tcp", "kind": "result-row", "observedAt": "2026-09-15T10:40:00.000Z",
      "eventTime": "2026-09-15T10:39:58.000Z", "value": { "totalSeconds": 84.0 } },
    { "ingestSeq": 2, "event": "tcp-disconnected", "observedAt": "2026-09-15T10:41:00.000Z" },
    { "ingestSeq": 3, "source": "xml", "kind": "result-row", "observedAt": "2026-09-15T10:41:10.000Z",
      "eventTime": "2026-09-15T10:14:02.079Z", "value": { "totalSeconds": 88.5 } }
  ],
  "expect": { "value": { "totalSeconds": 84.0 }, "source": "tcp",
              "note": "rule 2 alone would let the post-disconnect xml row win; its eventTime is older, so INV-2c refuses it" } }
```

(Shape abbreviated here. The authoritative format is `CONFORMANCE-VECTORS.md` §1.) The vectors
cover:
- every invariant and every rule of INV-2;
- `provisional` in both upstream modes;
- run generations;
- §5's standing assembly.

The count is 104 as of round 20 (`CONFORMANCE-VECTORS.md` §2). Each of `c123-server` and `live-mini-server` writes
a thin adapter that feeds the vectors `CONFORMANCE-VECTORS.md` §1 assigns to it (98 and 23; 17 are in
both) into its own merge function and asserts the result — proving
both satisfy the same data-defined contract without either depending on the other's code.

**This is the minimum that proves the contract implementable before any server code exists.** Every
vector is written directly from `CONTRACTS.md` prose; none needs a recording, a running server, or an
upstream fact. It is also the fastest possible feedback loop during implementation — a merge-rule
regression fails a millisecond-scale test, not a multi-minute replay.

**A second, structurally identical class of vector: server-side time-windowed reads — §2's third
determinism.** `CONTRACTS.md` §8.4's calendar `status` derivation (a push within the last 5 minutes
of *now* is `live`) is not a merge decision, but it is exactly as isolable and exactly as synthetic:
given a fixed set of recorded push timestamps and an injected "now," assert the derived `status`
without needing a real clock, a real 5-minute wait, or any recording. This requires the *server* side
of the same discipline §5 states for clients — `live-mini-server`'s calendar computation reads "now"
through an injected clock, never `Date.now()` directly — extended there, not invented twice. A
handful of vectors at and around the 5-minute boundary (just under, just over, exactly at) belong in
this same tier, alongside the merge vectors, for the same reason: both are unit-scale, contract-
derived, and need nothing but the contract's own prose to write.

### 3.2 Tier 2 — Replay determinism, and the correctness gate it is not a substitute for

**What it proves, precisely — and what it does not.** This tier proves `CONTRACTS.md` §4's central
claim exactly as worded: that the domain layer "is a pure function of" the ingest sequence. It proves
*reproducibility*. It does not, by itself, prove *correctness* — a deterministic-but-wrong merge
implementation reproduces its own wrong answer every time and passes a reproducibility check
trivially. The first draft of this document conflated the two, describing fixture generation and
fixture verification as one mechanism without saying what checks a captured fixture *before* it
becomes the pinned ground truth three other repositories trust. Found under independent review, not
designed in from the start, and worth stating exactly why it matters: today, four independent,
separately-fallible client implementations mean a systematic misinterpretation tends to *surface* as
visible disagreement between them — the accidental safety net behind several of `EVIDENCE.md`'s
exhibits. A single authorial domain layer, correctly, per `ARCHITECTURE.md` §2/`DECISIONS/ADR-002`,
removes that net. **The tension is real and is named here rather than designed around: you cannot
have both one interpreter in production and independent cross-checking from disagreement in test.**
The resolution is not to reintroduce a second interpreter — that would undo the reason `ADR-002` gives
`live-mini-server` no domain logic of its own — but to source test-time authority from *outside* every
implementation: `CONTRACTS.md` prose (tier 1) and, for real race numbers specifically, a human
checking a fixture once against what officials actually published. Neither is "another interpreter
that might disagree"; both are exactly the kind of authority a single-interpreter production design
still leaves available in test.

**Two distinct artifacts, not one:**

- **An ingest fixture** — the raw sequence of upstream messages a domain layer actually receives,
  with their true arrival characteristics. Not a new concept: it is what `extract-excerpt.js`
  already produces (`c123-protocol-docs/tools/extract-excerpt.js`) — a player-v3-playable slice of a
  real recording, already checksummed. Nothing new needs building here.
- **A domain-state fixture** — the sequence of presented values the domain layer *produces* when fed
  an ingest fixture: the same shape as the WS/SSE delta stream `CONTRACTS.md` §7.2/§8.4 already
  define (`{seq, type, ..., fields}`), captured to a file instead of streamed live. **This does not
  exist today, in either tooling or concept** — confirmed directly: every existing tool (`player.js`,
  `replay-server.js`, `test-utils.js`) operates on the *inbound* side; nothing anywhere captures what
  `c123-server` itself emits on `/ws`. The QA spec noticed this gap and assigned it to be solved
  separately, inside `c123-server`'s own repo (spec lines 138–143) — the duplication §1 opens with.

**The one new tool this design requires**, living alongside the others in `c123-protocol-docs`: the
**capture tool projects the direct-injection replay onto the §4 format**. The replay emits one step per
ingest unit (`CONTRACTS.md` §1.6) — its elements classified in `CONFORMANCE-VECTORS.md` §1's vocabulary, the §7.2 deltas
it produced, and a state hash — and the tool folds the cold-start portion into the hydration step, then
writes every later delta with its producing element's recorded `observedAt`. **A replay begins at the
first record of the stream the checker reads** — the recording's or the excerpt's — and a capture
window inside it opens with a hydration step holding the core's state at that instant; **the step
log gate 2 reads begins where the raw stream begins, not at the hydration** — the checker's memory
(the generation's recorded row, the carry, properties 5, 10 and 11) is built from the steps before
the window, which the hydration's GET bodies do not hold — and the hydration step and the window
bound the published fixture's steps and its `violations` and `exercised` counts (§4; round 24,
second pass); a window is never a cold start at a later instant of a stream the checker reads from its beginning, since closure,
content age and the carry (properties 5, 8, 11) would then be read over records the core never saw
(round 24: 9,072 such violations in one window). A cold start at a chosen instant is an excerpt cut
there, log and raw stream alike. The result is a
**candidate** domain-state fixture: candidate, not golden, until it passes the three gates below. A
`/ws` capture of a player-driven server is **not** a candidate (spike S2-6): its `observedAt` values are
the server's clock during playback, two captures differ, and gate 1 could not diff them; it is a tier-4
smoke artefact. Measured in the spike: excerpt → replay twice → checker → projection twice → admission
in 1 m 48 s, and the fixture alone (hydration plus deltas) reproduces the replay's final state exactly.

**Gate 1 — determinism (necessary, not sufficient).** Feed the same ingest fixture into the domain
layer twice — replaying the captured raw messages directly against the ingest boundary, not
re-running the player against real time, so player/network jitter is removed from the question
entirely — and diff the two resulting candidates byte for byte, `observedAt` included. **The replay
carries everything `CONTRACTS.md` §4's determinism paragraph names:** every message with its recorded
`observedAt`, the TCP connect and disconnect events, the detection time of every XML rewrite, and any
re-baseline, in recorded order; the domain layer reads no clock of its own while replaying. Without
the events, INV-2 rule 2 and INV-7's write-time guard are never exercised and gate 1 passes
trivially. Where the recording lacks them (§9: the recorder wrote connection changes to the console,
and no recording holds a re-baseline), a stated outage or re-baseline is declared in the fixture's
`source` (`events`, each with its instant, scope and reason); the replay drops every TCP record
inside a stated outage and plays a stated re-baseline as `CONTRACTS.md` §4's unit, the `rebaseline`
event with the last snapshot read; **the raw stream the gate-2 checker reads omits the same records**,
the interval taken from the log's `tcp-disconnected`/`tcp-connected` pair, which `source.events`
restates, so no property is read over records the core was told never arrived (round 24, second
pass: a cp3-cross outage of 139 records otherwise raised property 8 on a snapshot inside it). Such a fixture is evidence for properties 8 and 13 (`exercised`)
and gate 2 judges it like any other; it is a candidate with a declared input the recording lacked,
not a synthetic fixture (§4), which carries no raw stream and so exercises only the **D** properties
(round 24). A non-empty diff fails the candidate outright: a real non-determinism bug (uninitialised
state, a race condition) that would otherwise poison every downstream tier silently. Passing proves
only self-consistency.

**Gate 2 — invariant conformance, checked as a property of the replay, not against a known answer.**

*What the checker reads.* The admission replay, step by step. **A step is one ingest unit**
(`CONTRACTS.md` §1.6; `CONFORMANCE-VECTORS.md` §1: one upstream message, one event, one XML
snapshot read — every race it carries, the rewrite event included, `DERIVATIONS.md` §0.3 — one
re-baseline with its snapshot re-read) — its elements in ingest order, `elements`
plural in the log, plus any `oncourse-left` the core derived at that message (`DERIVATIONS.md` §4.1,
§4.8; listed after the message's own elements and verified against the raw stream, never trusted) —
and the deltas (§7.2 shapes) the unit produced. Where a property names the step's element
e<sub>i</sub>, the condition holds when one element of the unit satisfies it (round 24: the earlier
"one ingested element" contradicted §1.6, and a unit's deltas cannot be attributed to one of its
elements). Elements are classified in `CONFORMANCE-VECTORS.md` §1's own
vocabulary, which the direct-injection path emits beside each step's deltas: an **observation**
(`attemptId`, `source`, `kind: inference | result-row | operator | fragment`, the fields it carries,
`run`, `observedAt`, optional `eventTime`); an **event** (`tcp-connected`, `tcp-disconnected`,
`xml-rewrite-detected` with its `changedAfter`, `oncourse-empty`, `oncourse-left`, `rebaseline` with `scope`); a **scope
snapshot** (`source`, `phaseId`, `mode`, `rows`); an **on-course listing** of one Attempt. The §4
fixture is the deltas alone. So gate 2 runs once, at admission, on the replay log; the properties
marked **D** read deltas only and can be re-run by any consumer on the published fixture.

*The properties.* Each is a check on consecutive presented states, S<sub>i−1</sub> and S<sub>i</sub>,
and the element e<sub>i</sub> between them. "Regression" means a field's `state` going from `known`
to `not-yet` or `unavailable`. Unless stated, everything is per Attempt and per run generation;
"result fields" are the run-scoped fields `CONTRACTS.md` §2.6 lists. A violation is reported with
the step index, the Attempt, the field and the property number.

1. **Sequence (INV-6) D.** `seq` strictly increases across deltas, and the first delta's `seq`
   exceeds the hydration step's `asOfSeq`. No `observedAt` in any delta is a replay-time clock
   value: each is the recorded `observedAt` of the element that produced that observation, at or
   before the step (a creation message or a standing legitimately carries earlier envelopes; so
   does a row the merge held for the stream's finish, `DERIVATIONS.md` §4.11, presented at the
   listing that settled it with its own `observedAt` **and its own value** — the fields the row
   states, `outcome`, `placement`, `qualified` and the like, each at the instant of the row that
   stated the presented value, never a new value on an old instant; `status` is not among them: a
   row's `finished` over the unit's own listing of the finish is the listing's element, INV-5,
   and keeps the listing's envelope — recorded: nkz-19so C1M_BR1_19:7, the row of 12:41:44.250
   presented at the listing of 12:41:44.358, `outcome` the row's, `status` the listing's; round 25
   and its second pass; a retraction's fallback to the retained stream inference keeps that
   listing's envelope, property 5 — recorded: jarni-so-odp K1W_BR2_18:16, `at-start` of
   14:11:39.886 presented at the clearing of 14:12:08; and a mark a snapshot re-delivers after the
   guard refused its first read is the re-delivery's element and instant, INV-5, the `no-result`
   outcome with it (`CONTRACTS.md` §2.6), never the refused read's; round 26).
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
   covering the Attempt or a listing of it with `dtStart` empty — the stream withdrawing what it
   alone stated (`DERIVATIONS.md` §4.3, §4.1; `ADR-015` Revision 4), `status` the leave's
   `left-without-finish` or the listing's `at-start`, every other field unchanged (round 26).
   `unavailable` appears only with a closed reason, and only at a step that carries the field for the
   Attempt (property 3) or at a scope snapshot of its race, never at a connection event, a `fragment`
   or by itself (INV-3): a `not-configured` decided from `SourceStatus` or the snapshot
   (`DERIVATIONS.md` §4.6; a `RaceConfig` decides none), and the `not-applicable` a `RaceConfig`'s
   `NrSplits` decides for `splits` (`DERIVATIONS.md` §4.8), are presented at the Attempt's next such
   step.
5. **Retraction is scoped and guarded (INV-7).** At a scope-snapshot step for race R, a regression
   of an Attempt of R touches only the fields INV-7 names for the case — first or single run:
   `outcome`, `gates` (in Kayak Cross `faults`), `placement`, `underReview`, `qualified` and a mark
   in `status`; paired second
   run with the row absent: those plus `pairTotal` and `countingRun`; second run with an empty time:
   `outcome` and `gates` (`faults`) only, `placement` and `pairTotal` being the row's, `known` or
   `not-yet` as its `Rank` and `Total` state them (INV-7 "follow the row"; `DERIVATIONS.md` §4.7,
   §4.12) — a change there is the row's statement, not this property's regression, and so is the
   `not-yet` an empty `Rank` states on a row carrying a mark (round 26) — and never `entry`, `bib`, `startOrder`, `heat`,
   `startLane` or `run`. It never touches a field whose presented value is an on-course inference
   (`kind: inference`, or `outcome.kind: 'running'`). Afterwards `status` is what the on-course
   listing shows for the Attempt (`at-start`, `on-course`, or an inferred `finished` that still
   stands), else `not-started`; a `finished → on-course` at this step is this property's, not
   property 7's. For an `xml` snapshot
   retracting or displacing a `tcp`-presented field, the snapshot's content age
   (`CONFORMANCE-VECTORS.md` §1: the latest `xml-rewrite-detected`'s `changedAfter`, `null` never
   qualifying; without the key, its time minus the poll interval) is later than that field's
   presented `tcp` observation's content age (INV-2c: the `observedAt` of its latest delivery, a
   rotation's re-send included, read from the raw stream; for the stream's `status` inference, the
   latest listing stating it, or the message at which the leave was evaluated); otherwise the field
   is unchanged at that step, and so is every other field that re-delivery carried — a mark the guard
   refused holds back its row's time too (`CONTRACTS.md` §2.6). The guard's refusal is rule 2's
   mark exception only — a mark over a `tcp` `status` of `not-started`, `at-start` or
   `left-without-finish`; a mark over `on-course` or `finished` is refused by rule 2's continuity,
   and that row's other fields reach rule 1 as §2.6 says (recorded: jarni-so-odp C1M_BR2_18:65 at
   14:02:47.758, running, `gates` the row's; round 26). An `xml` row that makes the Attempt
   untimed (`CONTRACTS.md` §2.6; `DERIVATIONS.md` §4.4: placed, no `dtFinish` on the row and none
   on the raw stream for the Attempt) asserts `outcome: unavailable{not-applicable}` over the TCP
   row's presumed-timed duration outside the guard — an INV-3 determination no `tcp` row can
   contradict, a TCP row carrying no finish time — and is no retraction: `status` stays
   `finished` and every other field stands (recorded: cp3-cross WX1J_XT_26_JUN, the snapshot of
   06:12:22.482 over pushes to 06:12:23.908; round 26). Where the replay log carries the snapshot's rows, as the vector format does, the
   checker also asserts completeness: every Attempt of R presenting results-table values whose row
   states no result is retracted in that step — for a `tcp` snapshot an absent row and a start-list
   table included; for an `xml` snapshot a present row only, since an absent XML row and an empty
   XML table state nothing (INV-7). A refusal holds the field's value and `source`; `provisional`,
   recomputed when the course binds (property 11), and an `eventTime` the Phase date first lets
   `DERIVATIONS.md` §0.2 build (§0.5, §4.4: from the on-course finish, never from the refused row)
   may change at the snapshot step that supplies them, and "changes" and "flips" here, in 6(c) and
   in property 8 mean a change of value or `source` (round 24).
6. **Precedence (INV-2 rules 1–3).** (a) Once a result field presents a `result-row` observation, it
   never afterwards presents an `inference` for the same generation, except through a contradiction
   (property 7) or after a retraction (property 5). (b) `gates` is merged cell by cell: while
   upstream still lists the Attempt (no `oncourse-left` for it in this generation that a later
   `oncourse.updated` of the generation has not undone by listing it again, as property 11 reads it;
   read from the raw stream at admission; "still in the latest `oncourse.updated`" is the **D**
   reading, for a re-run on the published fixture only; before any row of the generation the
   stream's vector is an inference, `confidence: 'inferred'`, and once a row is presented the merged
   vector carries the row's envelope, `CONTRACTS.md` §1.2), a judged cell (`0`, `2`, `50`) never becomes
   `null` at a results-table step — upstream's own withdrawal, the stream's listing blanking a cell
   it judged, is presented wherever no presented row of the generation holds that cell judged: the
   presented row's cell blank, or no row of the generation yet (recorded: nkz-19so K1M_BR2_19:79,
   cells 14–17 judged 25 s into the run and blank 11 s later, mid-run, no row; round 23),
   `provisional` recomputed; a row's judged cell stands against the stream blank (INV-2 rule 1; recorded:
   jarni-so-odp C1M_BR1_18:26 cell 19 at 12:17:19.030, the row `0`) (D4; property 11's list;
   recorded: nkz-19so C1W_BR1_19:40 cell 16 at 08:38:18.181, the presented TCP row — the row rule 2
   presents, not the latest row of either source — blank while the
   XML row still holds `0`; round 21, second pass); after it has left, and until a
   re-listing of the generation, cells change only at a results-table
   step. (c) A field presented from `tcp` flips to `xml` only: after a `tcp-disconnected` that
   followed the step that ingested the presented `tcp` observation; by rule 2's mark exception
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
10. **Run generation (`ADR-013`).** `run` never decreases. It increments only at an on-course listing
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
    message per unit; round 24), and `status` is `at-start` or
    `on-course`. **A listing that changes the start otherwise is a start correction:** `run`, every
    presented results-table value and `placement` are unchanged at that step (value and `source`,
    as property 5 reads "changes"; the finish `eventTime` `DERIVATIONS.md` §4.4 lets the listing
    attach to the row's unchanged outcome is no change; round 26); `status` and the
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
11. **Provisional (§1.2).** `status` is never provisional. Every other presented result value — the
    judging clause reaching the fields `CONTRACTS.md` §1.2 names, `underReview` and `qualified`
    included — has
    `provisional: true` exactly when: it is an inference (`kind: inference`, or
    `outcome.kind: 'running'`); or the run is not closed (`DERIVATIONS.md` §4.4, read from the
    raw stream at admission: no `Completed="Y"` listing of it carrying a `dtFinish`, no
    `oncourse-left` for it in this generation that a later `oncourse.updated` of the generation has
    not undone by listing it again (§4.1's false leave; round 21) — in a **D** re-run, listed in an earlier
    `oncourse.updated` and absent from the latest, so an Attempt never listed is not closed by
    that — and no presented no-result mark, `non-ranked` closing nothing) and either a presented
    `gates` cell is `null`, a Kayak Cross Attempt's `faults` carries `judgingComplete: false` (the
    parser reads it over the slot cells and stamps the `faults` observation alone, and only a `known`
    one; the observation is the presented one — the row's once a row stating a result is presented,
    INV-2 rule 1 having no cell exception for `faults`, the stream's listing after it retained and
    never read (recorded: cp3-cross MX1_XT_26:41 at 08:12:38.051; round 26) — a `not-yet` `faults` with a course bound, every slot blank, carries no stamp and is not under
    this clause, `CONTRACTS.md` §1.2; the row's other observations carry no
    judging stamp, `runClosed` at most, `DERIVATIONS.md` §4.4, §4.6(d); the Cross branch never reads
    `gates`, which is `unavailable{not-applicable}` there; round 23), or `gates`, in Cross `faults`, is
    not `known` because no course is bound — the Attempt's Phase has no `known` `courseId`, or that
    Course no `known` `gates`, the binding the `false → true` sentence below names; `not-yet` is the
    state of this case, `DERIVATIONS.md` §4.6, not only `unavailable{not-configured}` (round 24) —
    and the observation's `judgingComplete` is not `true` (the
    parser stamps `null`, or nothing, without a course, CONFORMANCE-VECTORS §1; a `true` stamp is its judgement
    against a course and settles the value; round 21) — this judging clause does not reach an Attempt
    with no run yet (`status` absent or `not-started`, its row carrying neither time nor mark: the values
    are run 1's, settled there, until the carry below begins; `CONTRACTS.md` §1.2's first exemption) nor what a heat's row asserts with its
    `placement`: the placement, the ordinal built from it, and its `qualified` and `underReview` from
    the step the placement is presented — upstream's whole result asserted after the judging
    (`CONTRACTS.md` §1.2 states the exemption; `DERIVATIONS.md` §4.2, §4.7; round 21); before that step they are under the clause like any
    value, and a heat's `faults` stays under it until the heat leaves the list (§4.2, §4.4's
    closure; round 23); or it is a second run's `placement`,
    `pairTotal` or `countingRun` carried over from run 1, from the Attempt's first on-course listing
    in run 2, staged or started, until a
    row of run 2 carrying its time or its mark restates that field — unless the content-age guard
    refused its mark **by the checker's own comparison** (property 5's reading: the snapshot's
    `changedAfter` against the presented `tcp` observation's latest delivery, made only where the
    row's mark would change the presented `tcp` `status`, rule 2's mark exception — one of
    `not-started`, `at-start`, `left-without-finish`, property 5 — as property 8
    reads it; a row with no mark, and a row whose mark the presented `status` already is, are never
    refused; never by whether a presentation followed), in which case the row restates nothing (INV-7
    "ignored for that field", the time held back with the mark, `CONTRACTS.md` §2.6) and the carry
    stands; a retraction of the restating row (property 5: its mark cleared in place, the row gone)
    ends its restatement, and the row of run 2 with no time and no mark that follows leaves the
    fields carried again, the regression property 4 names having come first (recorded: jarni-so-odp
    C1M_BR2_18:51, `dns` at 13:48:30 cleared at 13:54:15, its start 13:54:59; round 26); a row the
    guard admits restates the field whether or not the system under test presents
    it, so a `provisional` left `true` after an admitted row is this property's report (recorded:
    jarni-ne-do K1M_BR2_19:62, the XML `dns` row of 08:55:33 refused against the leave of 08:55:31,
    the TCP `dns` row of 08:55:39 restating `placement` and `pairTotal`, the next XML read
    `countingRun` — its `dns` already presented, nothing to guard; and K1M_BR2_19:50's XML time row
    of 08:50:12 with no mark, read while the Attempt was still listed, restating `countingRun`;
    round 25, the comparison named in its second pass, its reach in the third)
    — judged field by field, since
    `countingRun` arrives only with the XML row; or its `source` is `operator-write` with a pending
    `WriteRequest`. It goes `false → true` only through a regression first (property 4), at the
    Attempt's first on-course listing of a generation (staged or started; recorded: nkz-19so
    C1W_BR2_19:35 staged at 10:28:09.809) or one that lists it while no course is bound (a
    cold start: the results push precedes the first snapshot), at a re-listing within the generation
    that undoes a leave (`DERIVATIONS.md` §4.4; round 21), at upstream's withdrawal of a judged cell
    while it is listed — the stream's own listing blanking the cell, no presented row of the generation
    holding it judged (its cell blank, or no row yet),
    a row's judged cell standing (INV-2 rule 1), property 6(b); D4 recomputes on the
    presented cells (recorded: nkz-19so C1W_BR1_19:40 cell 16, the row blank at 08:38:18.153, the stream
    at .181, back at .562; round 21, second pass) — or when a course binds — the first
    step after which the Attempt's Phase has a `known` `courseId` and that Course a `known` `gates`
    (`phase.updated`, `course.updated`; **D**) — and shows a blank cell. A `standing.updated` entry's `provisional` is the disjunction over its Attempt's `outcome`,
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
    category's placed entries (`CONTRACTS.md` §5 steps 2–4; the checker assembles them from its own
    held Attempts, not from the message alone; recorded: cp3-cross at a stated 09:05Z re-baseline,
    `heat:WX1_XS_26:1/all` with its heat's placements in no XML row, rebuilt by the next TCP push;
    round 25 and its second pass). Across it, `entry`, `bib`, `run`,
    `startOrder`, `heat`, `startLane`, every check and flag, and every `WriteRequest` are unchanged;
    afterwards every presented value of a field §4 step 1 discards has `source` `tcp` or `xml`, and
    none of those has `source: tcp` until a `tcp` observation of it follows (`courseOrder`, `timeToBeat`
    and `status`'s lifecycle values survive the re-baseline with their `tcp` source; `splits` and a
    `running` outcome are on step 1's list and do not; round 24).
14. **On-course set (§7.1).** The set is upstream's list. An `attemptId` enters `oncourse.updated` only
    at an on-course listing of that Attempt and leaves only at an `oncourse-left` or `oncourse-empty`
    element — the `oncourse-left` being the one the core derived at that step's TCP message, checked
    against the raw stream by `DERIVATIONS.md` §4.1's rule (round 24) — never because its `status`
    became `finished` or a mark, which keep it listed until
    closure. **D:** every listed Attempt has a presented status other than `not-started` and
    `left-without-finish`; the list is ordered by presented `courseOrder` ascending, Attempts without
    one last by `startOrder`.
15. **Standing (§5) D.** Every placed entry of a whole-class `standing.updated` has the `rank` and
    `order` of its Attempt's presented `placement`; entries sort by `order`; unplaced entries follow
    in step 3's order; an age-category `rank` is `1 +` the number of same-category entries with a
    strictly smaller class rank; `provisional` and `underReview` follow step 5; an entry's `result`
    is `pending` while its Attempt is `pending` or `running`. A `standing.updated` appears only at a
    step that changed the standing as serialised (§5 step 1): an Attempt's `placement`, a result
    outcome, `pairTotal`, `provisional` or `underReview`; an Entry's `ageCategoryId` becoming known (a
    category standing's first publication); a second Phase's `pair.siblingPhaseId` becoming known
    (the `pair` standing's first publication, §5 step 1); a snapshot's category ranks raising or
    clearing an anomaly; or `scope.replaced`. A running athlete's tick never produces one. **A `classification`
    standing has no Attempts:** its entries come from the classification Phase's rows (§5 step 2), each
    entry's `rank` and `order` equal its row's and its `decidedIn` its row's or, where a `tcp` row
    states `null`, the last admitted `xml` row's for that `entryId` (a refused snapshot moves
    nothing); its first publication is its first row
    observation (a scope snapshot of the Phase with no rows before that publishes nothing, and one
    with no rows after rows changes nothing: the Standing stays as last built, `asOf` included —
    maintainer, 2026-11-06); each
    scope snapshot of the Phase that passes INV-2c's guard across sources (`DERIVATIONS.md` §4.10:
    an `xml` snapshot against `tcp`-built rows needs a later `changedAfter`, `null` never; a `tcp`
    snapshot always) replaces its rows whole, and it changes only at such a snapshot or
    `scope.replaced`. The spike's checker
    applied the Attempt clause to it and reported 673 violations on the Cross event result (XER), which
    was never part of a spike window (`DECISIONS/ADR-017` Revision 4). A classification row is
    `CONTRACTS.md` §8.3's `ClassificationRow`, flat: `rank: number | null`, a numeric `order`,
    `decidedIn: string | null`; on site it arrives in a scope snapshot of the classification Phase
    (`CONFORMANCE-VECTORS.md` §1), and a `null` `decidedIn` is relayed as `null`.

*What this gate is, and is not.* It is a mechanical, oracle-free check: it needs no ground truth,
only the shape the invariants already commit to, and it catches the whole class of "deterministic
but wrong" merge bugs that violate the contract's own stated structure, which is most of them. It
does not catch a bug that is invariant-conformant and still numerically wrong (a unit error, a
misparsed field, a wrong gate cell) — gate 3 is what catches that. Nor does it see the retained,
non-presented observations: INV-2b's `source-disagreement` diagnostics are its only trace of them,
and whether such a disagreement *should* have been raised is a tier-1 question. A property that a
correct replay cannot satisfy is a finding against the contract, not against the replay: it is
reported to the design authority, never relaxed in the checker.

**Who writes the checker, and what it reads** (opponent review of the spike, `DECISIONS/ADR-017`
Revision 4). The gate-2 checker is written by a different author than the merge core, from this
section's text alone, and **mutation-tested per property**: each property must fail on a replay
deliberately broken for it, and a property that no window exercises is not evidence until one does (in
the spike, P10 and P13 ran zero times and P4, P7 and P8 two to four). **The fixture says which:**
`evidence.gate2.exercised` records, per property, the number of steps that evaluated it
(`schemas/fixture-admitted.schema.json`); a zero does not block admission, it tells every consumer
that the fixture is no evidence for that property, and `violations` lists only what was evaluated. Properties that judge membership,
element classification or attribution — 3, 6, 10, 11, 13 and 14 — **read upstream's raw stream**, not
the ingest's own elements: a checker that trusts the `oncourse-left` the code under test emitted cannot
see a wrong leave, and the spike's did not see a 10.7 s TCP stall empty a Kayak Cross heat's on-course
set. At admission the checker therefore runs with the recording (`--recording`); without it only the
properties marked **D**, and the **D** readings of 6(b) and 11, can be evaluated, and such a run admits
nothing. A checker failure has three possible verdicts — contract conflict, implementation bug, checker
bug — and the design authority assigns it; "the reading that makes the vectors pass" is not a verdict,
and a spike brief must not make it one.

**Gate 3 — cross-checked against tier 1 where they overlap, against published results over whole
races, and once by a person.** Where a candidate exercises a shape tier 1 already has a synthetic vector for
(a two-run BR2 case, a Cross ordinal outcome), the candidate's result for that shape must agree with the
vector's `expect` — contract-derived ground truth checking real data, not real data self-authorising.
**Mechanical part, for admission:** the window **spans whole races** — every race whose Attempts the
fixture asserts has its full on-course span inside the window — and for every finisher of those races
`outcome`, `gates`, `pairTotal` and `placement` are compared with the **published results** (the day's
final XML stands in for them once the human line certifies it), in `DERIVATIONS.md`'s units; a
difference is a mismatch unless a listed, dated protest correction explains it. **The weaker candidate
check**, for a window that cuts a race: each in-window finisher against upstream's XML at the window's
last snapshot, every day-final difference listed as "changed after the window". It can never admit:
placements of a cut race are then checked only against what the replay itself ingested. The spike's
first fixture (nkz-19so 09:30–09:45) was such a window — 21 of 21 placements moved after it — while
whole-race windows were available in the same recording (C1W_BR1_19 08:34–09:03Z, C1W_BR2_19
10:24–10:53Z); gate 3 was redefined to fit it, and the opponent review undid that (`DECISIONS/ADR-017`
Revision 4). **Human part:** a person certifies **the fixture**, not only the final XML: that the
published results of the races in the window equal the fixture's final values, by signing the
comparison report, once, at admission — `human-checked-<date> by <name>`. Not repeated per CI run, and
not a substitute for gates 1–2, which are what makes the check repeatable afterward.

**Only a candidate that passes all three is published and pinned (§6).** From that point, this tier's
job changes from admission to **regression**: a future ingest of the *same* ingest fixture is diffed
against the *stored, admitted* domain-state fixture, not against a second fresh run — this is the
check gate 1 alone cannot do, since two fresh runs of newly-regressed-but-still-deterministic code
agree with each other and tell you nothing. A regression diff failing means something that was
verified correct no longer is; it is investigated against `CONTRACTS.md` prose directly, the same way
gate 3 was satisfied the first time.

**The same admitted fixture cross-checks `live-mini-server`, with one asymmetry stated plainly.**
Because §8.3's push shape re-serialises exactly what this fixture already contains, an *admitted*
fixture can be replayed a second time as `PUT` calls against a `live-mini-server` test instance; its
presented values, read back over §8.4, must match. But `c123-server` generated the fixture and
`live-mini-server` is checked against it — this pairing can only ever implicate `live-mini-server`,
never `c123-server`, and only once the fixture has cleared gates 1–3 does that asymmetry stop being a
problem: at that point `c123-server`'s correctness for this fixture is independently established, so a
`live-mini-server` disagreement really does mean `live-mini-server` is wrong. A disagreement surfacing
*during* admission, before gates 1–3 have run, proves nothing about which of the two is at fault — see
§7.

Initial fixture catalogue: the seven scenarios the existing spec already named and never built —
`slalom-br1-normal`, `slalom-br2-finale`, `dsq-dns-mid-race`, `large-field`, `race-transition`,
`multi-day-sunday`, `kayak-cross` — map onto this engagement's own scenarios closely enough (A, C, D,
E respectively) to keep as the starting catalogue rather than inventing new selection criteria.

### 3.3 Tier 3 — Presentation rendering

**What it proves:** a client, given a domain-state fixture and a controllable clock, renders what its
own stated display-lifetime policy says it should, at every point in elapsed time — not just at the
moment a fixture step arrives.

**The inversion this makes possible, stated precisely:** because the domain layer already resolves
every value before it reaches a client (`ARCHITECTURE.md` §2, zero-interpretation clients), a
rendering test's input is a domain-state fixture — the *output* of tier 2 — never a recording, and
never raw Canoe123 traffic. `c123-scoreboard`, `c123-penalty-check`, and `c123-live-mini`'s client
each stop needing their own replay pipeline, their own recording-derived scenarios, or their own mock
WebSocket server built to a bespoke shape — the exact three items `c123-live-mini#105`'s reuse table
names as things to port between repos. They consume the one shared fixture format instead.

**What is not shared, and must not be:** the *assertions*. `ARCHITECTURE.md` §2's own test —
"could two correctly-implemented clients legitimately disagree and both be right?" — means display-
lifetime policy is correctly different per client, per audience (a Raspberry Pi at the venue, a
tablet, a spectator's phone). Each repository owns and tests its own thresholds (grace periods,
highlight duration, auto-scroll pacing, the departing timeout) against the shared fixture format —
shared infrastructure, local judgement, the same division already established for domain types versus
domain logic.

**The clock requirement — a structural requirement this tier cannot work without, stated in §5, and
narrower than it first looks.** Checked directly against real scoreboard code under review, not
assumed: some display-lifetime logic genuinely is `setTimeout`/`Date.now()`-based and the fake-clock
harness reaches it as designed. Some is not, in two different ways that need two different answers —
both stated precisely in §5, not glossed over here. And one mechanism — grace-period and stale-
competitor eviction, the thing closest to `EVIDENCE.md`'s flicker exhibit and the closest thing this
whole engagement has to a motivating symptom — **has no timer for a fake clock to intercept at all
today**: it recomputes only when a new action is dispatched, never on elapsed time alone. Advancing
the harness's clock with no new fixture entry, as step 4 below describes, asserts nothing against
that code as it stands. This is a requirement on the *target client architecture*, not on the test —
moved to `ARCHITECTURE.md` §2, stated there.

**Harness shape:**

1. Load a domain-state fixture.
2. Initialise the client under test from the fixture's hydration step (§4): a `kind: "hydration"`
   entry carrying the §7.1/§8.4 response bodies and their `asOfSeq`, applied exactly as the
   subscribe-before-snapshot handshake would; set the fake clock to **a stated non-zero offset from
   that entry's `observedAt`** (the harness names it, e.g. +37 s), never to `observedAt` itself: a
   client that anchors any display lifetime on a payload's `observedAt` instead of its own receipt
   time must fail here, and with the clock equal to `observedAt` it could not (spike S3-2).
3. For each subsequent entry: advance the fake clock by the gap between its `observedAt` and the
   previous entry's (the real recorded gap, whether that gap came from a real recording or was chosen
   deliberately in a synthetic fixture), keeping the offset, then apply the delta exactly as the real
   transport would deliver it.
4. Assert on rendered output — DOM via testing-library, or the view-model a render function consumes
   — at whatever points matter: immediately after a step, or after advancing the clock further with
   **no new fixture entry**, to test a grace period expiring on elapsed time alone. The assertion
   instant is the deadline plus the client's stated tick period (§5), never deadline + 1 ms.

**Fixtures for this tier may be captured from a real recording (tier 2's natural output) or
hand-authored, in the identical format, to land exactly on a threshold** — a real recording is
unlikely to happen to finish a run at precisely 29,999ms before some eviction constant; a three-line
synthetic fixture can, and is the right tool for that specific assertion. Both feed the same harness.

**Kayak Cross's deadline, concretely:** tier 2 already asserts the *fact* half — the domain layer
presents the operator's heat-order assertion within some small, stated latency of ingest, well before
the next heat's own first on-course observation appears later in the same fixture. Tier 3 asserts the
*presentation* half against that same fixture: what the scoreboard renders in the gap between the two,
and for how long afterward — exactly the split `ARCHITECTURE.md` §6.D already argued for, now
executable.

### 3.4 Tier 4 — End-to-end smoke

**What it proves:** the wiring connects — a real `c123-server` process, pointed at a real (or
player-emulated) Canoe123, actually serves a real client build over the real network path, a write
actually round-trips *something*, a bridge push actually reaches a real `live-mini-server` instance.

**What it does not prove, deliberately:** anything about domain semantics or presentation timing —
those are tiers 1–3's job, already exercised far more cheaply. This tier is kept few and expensive on
purpose; its only question is "does the plumbing connect," and it should stay small enough that a
failure here almost always means transport, deployment, or version skew, never a merge-rule or
display bug that slipped through the earlier tiers.

**The one thing today's tooling cannot yet give this tier:** a realistic write-echo. Checked directly
against prior research in this engagement — `player.js` explicitly does not emulate the write-side
channels (`tools/player.js:904`: UDP:27334, the terminal-command channel `PenaltyCorrection` travels
on, is "not emulated by player"). So `c123-penalty-check#52`'s explicit goal — "test the write API via
a replay server for round-trip correctness" — cannot be fully realised by tier 4 alone today. Tier 1
can still test the *merge* half precisely (a synthetic "submitted write, then a synthetic echo"
vector, §3.1) without needing a real echo at all; only the realistic upstream round trip is blocked,
and only tier 4 needed it. Recorded as a genuine tooling gap in §9, not glossed over. **Decided,
not left open:** penalty-check's tier-4 smoke covers request → `WriteRequest{pending}` → push, and
stops there; the echo half is tier 1's (`operator-write-*` vectors). A realistic upstream echo at tier
4 waits for the player to emulate the terminal channel, and `c123-penalty-check#52` is met by the two
tiers together, minus that.

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

**Tenant isolation** (`CONTRACTS.md` §8.1) is the same kind of thing on live-mini-server: a storage
property, verified by that store's own integration tests, not by a tier. The cases, one line each:
two keys, same `classId`/`phaseId`/`entryId`/`bib`, no leakage in either direction through any §8.4
read or the stream; a key never reads or writes another event; a revoked key gets `403` and changes
nothing; a public read of an unknown `eventId` is `404`, never another organiser's data.

---

## 4. The fixture format

**One format, used four ways**, because it is the same thing every time — a sequence of the same
`{seq, type, …}` deltas `CONTRACTS.md` §7.2/§8.4 define — `attempt.updated`, `attempt.deleted`,
`phase.updated`, `entry.updated`, `class.updated`, `course.updated`, `standing.updated`,
`oncourse.updated`, `scope.replaced`, `event.changed`, `write.updated`, `sources.updated`,
`diagnostics.updated`, `check.updated`, `flag.updated`, each with the payload keys those sections give — as `CONTRACTS.md`
§7.2/§8.4 already define, with a file-level header:

```json
{ "fixtureId": "slalom-br2-finale",
  "source": { "kind": "recording", "excerpt": "2026-04-19-jarni-ne-odp#003", "sha256": "…" },
  "domainLayerVersion": { "contract": "3.0.0", "generator": "c123-server 1.0.0 (a1b2c3d)" },
  "admitted": { "status": "admitted", "gate1": true, "gate2": true,
                "gate3": { "mechanical": { "against": "published-results", "windowSpansWholeRaces": true,
                                           "attempts": 41, "fields": 164, "match": 164, "mismatch": 0,
                                           "changedAfterWindow": 0, "changedAfterWindowEqualsWindowEnd": 0,
                                           "noFinalRow": 0, "report": { "file": "…gate3.json", "sha256": "…" } },
                           "human": "human-checked-2026-09-16 by <name>" },
                "evidence": { "gate1": { "stepLogSha256": ["…", "…"], "finalStateSha256": ["…", "…"],
                                         "candidateSha256": ["…", "…"] },
                              "gate2": { "checker": "…", "violations": {},
                                         "exercised": { "P1": 412, "P2": 412, "…": 0 } } } },
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
label (spike S2-3). Where the replay began before the window (§3.2), `source.input` names the stream
replayed, `<recording>#<fromMs>-<toMs>` from the recording's first record to the window's end, with
its own `sha256`; like `events`, prose only until the schema names it (round 24, second pass).

**`domainLayerVersion` has two axes** (`DECISIONS/ADR-017` D5). `contract` is the version of the §7/§8
wire shapes: the server's wire-protocol `VERSION` once the new contract is implemented (it leaves
today's 2.0.0, since every client renegotiates), and until then a `docs/arch@<commit>` ref.
`generator` is the c123-server release and commit that produced the deltas. **A `contract` mismatch
fails, loudly** — a warning would let a stale fixture keep passing, which is the silent-propagation
failure §3.2's admission gates exist to prevent; a consumer that wants the older fixture re-pins
deliberately. A `generator` change is not a consumer's concern: it requires re-admission through gates
1–3 and a new fixture revision (§6). One identifier conflated the two and never moved when the merge
logic did (spike S2-4).

**The hydration step** holds every §7.1 (or §8.4) GET body of the event at one `asOfSeq`, taken at the
step that completes the cold-start snapshot read or, for a window inside a longer replay (§3.2), at
the window's opening step; its `observedAt` is the recorded time of the last
element those bodies reflect. The file-level `asOfSeq` is the counter when capture began, 0 for a cold
replay. A delta step's `observedAt` is the recorded `observedAt` of the element that produced it
(spike S2-1).

**`admitted` is what distinguishes a candidate from a golden baseline** (§3.2), and it has a schema
that enforces it: `schemas/fixture-admitted.schema.json`. The block carries `status`, `candidate` or
`admitted`, and the schema's `if/then` allows `admitted` **only** with `gate1` and `gate2` true,
`gate3.mechanical.against: "published-results"`, `windowSpansWholeRaces: true`, `mismatch` 0 and
`gate3.human` matching `human-checked-<date> by <name>`; the `evidence` block carries the two step-log,
final-state and candidate hashes of gate 1 and the checker's violation counts and, per property, how
many steps evaluated it (`exercised`; §3.2). The first schema stated
completeness only in prose, so a block with `gate2: false` and a TODO validated (opponent review R10).
A candidate is never something a consumer pins to; only an admitted fixture is published to the
catalogue at all (§6). Gate 2 is never relaxed to admit: a candidate waits for the contract amendment
and the pipeline is re-run.

**A fixture is a captured, file-based instance of exactly what a real client already has to consume
live.** No second data model, no translation step between "what a test feeds a client" and "what
production feeds a client" — the harness in §3.3 is, deliberately, indistinguishable from a real,
slow subscription as far as the client code under test can tell.

---

## 5. The clock requirement

**Every piece of code that makes a display-lifetime decision — client-side, or the server-side
time-windowed reads §3.1 now also covers — must read time through an injected clock, never by
calling `Date.now()`, `setTimeout`, `setInterval`, or `requestAnimationFrame` directly.**

```ts
interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): TimerHandle
  clearTimeout(handle: TimerHandle): void
  requestFrame(fn: (t: number) => void): TimerHandle
  cancelFrame(handle: TimerHandle): void
}
```

**`requestFrame` was missing from this document's first draft, and the omission was not cosmetic.**
Checked against real scoreboard code under review: continuous auto-scroll and the re-render driver
behind highlight/departing timing are `requestAnimationFrame`/`performance.now()`-based, not
`setTimeout`-based — a `Clock` without a frame method cannot intercept them at all, and the existing
unit test that appears to cover this only passes because the test runner's fake-timer mode happens to
patch `requestAnimationFrame` globally, an undocumented dependency this design was silently relying
on rather than stating. Stated now: any production `Clock` wraps the real `requestAnimationFrame`;
any test `Clock` advances frames the same deliberate, explicit way it advances timers.

**What no `Clock`, real or fake, can reach: browser-compositor animation** — native
`scrollTo`/`scrollIntoView({behavior:'smooth'})` and CSS `@keyframes` (the highlight pulse). These run
outside JavaScript's clock entirely once started. Not a gap this design closes: the existing pattern
(`prefers-reduced-motion` to disable the animation, Playwright to assert the resulting state once it
settles) is kept as-is for exactly this category, and tier 3's fake-clock harness is not the tool for
it.

A thin production implementation wraps the real globals; a thin test implementation is a virtual
clock a test advances explicitly and deterministically — most of the stack already has one available
(`c123-live-mini#105` already configures Vitest, which ships fake timers; the other repos'
equivalents are no heavier to add). This is genuinely new discipline in exactly one place per
repository — today's timing logic (`SB/context/constants.ts`, `useDeparting.ts`, `useAutoScroll.ts`,
`useHighlight.ts`, `EventState`'s `HIGHLIGHT_DURATION_MS`/`ONCOURSE_TTL_MS`) almost certainly calls the
real globals directly, since nothing before this needed it not to — but it is a mechanical,
narrowly-scoped change per site, not a redesign. `c123-scoreboard#43`'s own account of its "Phase M"
E2E suite — five failing tests, attributed to "mock-server/timing issues" — is a live example of what
happens without this discipline: timing asserted against real elapsed time is exactly what produces
flaky, hard-to-diagnose failures, independent of whether the feature under test is even wrong.

**When it is done (maintainer decision, c123-server#167): during each client's migration to this
contract, not retrofitted to today's code.** The sites that most need it are the on-course reducer,
the run-2 merger and the on-course penalty cache. Once the server interprets upstream, these are
rewritten or deleted, so a retrofit would be thrown away. The rule is part of every client
migration's definition of done:
- every display-lifetime rule reads time through the `Clock`;
- every such rule is also re-evaluated on a clock tick, and **takes effect no later than one tick
  period after its deadline**; the client states its tick period with its policy (§3.3), a period
  above 1 s with a stated reason, and its tier-3 tests assert at deadline + that period (spike S3-1:
  without a stated period a test cannot pick its instant, and a correct periodic client fails at
  deadline + 1 ms);
- every such rule has a tier-3 test that advances a fake `Clock`.

The fake `Clock` is not a global fake-timer patch.

**On the server side, the same interface, the same discipline, a different reason: `§3.1`'s
time-windowed reads (the live-ingest calendar's `status`) need "now" to be injectable for exactly the
same reason a client's grace period does** — not because server-side code has a rendering loop, but
because a test asserting "just under the 5-minute window" versus "just over it" cannot wait 5 real
minutes, or 5 real minutes minus one millisecond, without the suite becoming unusable. `live-mini-
server`'s calendar computation depends on this `Clock`, not on `Date.now()`, for the same reason
`c123-scoreboard`'s eviction logic does — one requirement, stated once, applied on both sides of the
boundary this document draws.

---

## 6. Ownership and distribution

**`c123-protocol-docs` owns fixture generation and the canonical store** — it already holds this role
for recordings, and nothing about fixtures changes the shape of the job, only what gets stored.
`recordings-cli.js`'s existing mechanism (`push <event> --release <tag>`, a git-tracked catalog
separate from a gitignored local cache, `fetch`/`list`/`path` for consumers) is reused as-is for
domain-state fixtures, catalogued alongside recordings rather than as a new system.

**Each consuming repository pulls a specific, pinned fixture set — never a floating "latest."** A
committed reference (a lockfile-shaped entry naming fixture id and version) is a deliberate,
single-repo, single-line change to advance — exactly the relationship `@opencanoetiming/timing-design-
system` already has with every repo that consumes it (`c123-server/CLAUDE.md`'s own Design System
section), a precedent already proven in this ecosystem, not a new one being invented. **This is what
keeps a shared fixture from becoming a five-repository coordination burden for one maintainer**: one
place generates, four places pull on their own schedule, and a fixture regenerated after a
`domainLayerVersion` bump does not retroactively break anyone until they choose to re-pin.

`c123-server` is the only repository that *generates* new domain-state fixtures, being the sole
on-site domain-layer implementation — but the artifact it produces is published outward, not kept as
a private baseline the way the current spec proposes. That is the entire fix to §1's duplication: one
authorial location, many pinned consumers, instead of four repositories each owning its own answer to
the same question. Only an *admitted* fixture (§3.2's three gates) is ever published this way — a
candidate that fails admission is never a coordination question for anyone downstream.

A fixture has three identities, and the catalogue key carries all of them:
`<fixtureId>@<contract>+<generator>` — the scenario, the wire shapes it conforms to, and the release
that generated it (§4; `DECISIONS/ADR-017` D5). Fixtures are published gzipped (the spike's first was
181 MB raw, 14.8 MB gzipped, and about 10 MB raw once standings stopped re-sending on every tick).

---

## 7. Diagnosing disagreement between two components

**Answered directly, since it was the original point of the whole engagement:** each tier's input is
the *previous* tier's already-verified output, so the tier at which a test first fails names the
component at fault.

- Tier 1 fails → the merge rule itself, in whichever implementation failed it (`c123-server` or
  `live-mini-server`) — wrong before a single recording is even involved. Symmetric only for the 17
  vectors both run (`CONFORMANCE-VECTORS.md` §1), where the other implementation is a comparison; a
  failure in a vector only one of them runs names that implementation alone.
- A candidate domain-state fixture fails **gate 1** (§3.2, determinism) → `c123-server` specifically,
  unambiguously — a non-determinism bug, not a wrong-answer one.
- Gate 1 passes, **gate 2** (invariant conformance) fails → `c123-server` again, unambiguously — its
  own output violates `CONTRACTS.md` §4's structure, checkable without reference to anything else.
- Gate 2 passes, **gate 3** (cross-checked against tier 1 / the human numeric check) disagrees → **not
  automatically attributable.** Either the candidate is wrong, or the tier-1 vector it's checked
  against didn't cover this shape correctly, or the human's expectation was wrong. Adjudicated against
  `CONTRACTS.md` prose directly — this is the one point in the whole pipeline where a person reads the
  contract and decides, because it is the one point where the contract meets a real recording for the
  first time. Once resolved, the fixture is admitted and this ambiguity does not recur for it.
- **Only after admission**, a `live-mini-server` tier-2 cross-check against that fixture fails →
  `live-mini-server`, unambiguously — `c123-server`'s correctness for this exact fixture was already
  established at gates 1–3, so the asymmetry inherent in "one generates, one is checked against it"
  (§3.2) stops being a problem once the generated side has independent backing.
- An **already-admitted** fixture's regression check fails against its stored baseline → whichever
  implementation changed since admission, investigated the same way gate 3 was resolved the first
  time — this is what a code change breaking previously-verified behaviour looks like.
- Tier 2 (admitted) passes for the fixture in question, a client's tier 3 fails → that client,
  unambiguously — it received the correct domain state and rendered it wrong.
- **All relevant tiers pass, and two deployed clients still visibly disagree:** this is the case tier
  4 exists for, and it splits two ways. First, check whether both clients are pinned to the *same*
  fixture/`domainLayerVersion` generation (§6) — a stale pin reproducing an already-fixed disagreement
  is not a new bug, it is an unadvanced pin. Second, if pins match and both pass their own suites yet
  still disagree live, the live case is not covered by any fixture yet — which is itself the finding,
  and the fix is to capture it as a new tier-2 fixture, not to patch the symptom in one client.
- **Two clients disagree on a presentation-layer fact — how long a finisher stays pinned, when a
  highlight fades.** Per `ARCHITECTURE.md` §2, this is not automatically a bug at all. The question a
  test can answer is narrower and still decisive: does each client match *its own* stated policy
  (§3.3)? If both do, the disagreement is a legitimate, designed difference in audience, not a defect
  — and a test suite that tried to force agreement here would be re-introducing exactly the single-
  answer assumption `ARCHITECTURE.md` §2 argued against.

---

## 8. What is deliberately not tested

- **Ground-truth validation against official result sheets.** Confirmed against the existing spec's
  own stated non-goal (line ~20) and kept: whether a fixture's numbers match what officials actually
  published is a one-time human judgement at fixture-authoring time (§4's `source.kind: "recording"`
  provenance is what that judgement is checked against), not an automated, repeated assertion —
  domain expertise about a specific real race is exactly the kind of question this engagement has
  routed to the maintainer throughout, not something a test can adjudicate.
- **Nightly or full-recording runs.** Excerpts exist precisely so CI never needs a 3.6 GB recording;
  a full-recording pass, if ever wanted, is an operational decision for whoever runs CI, not a
  contract requirement.
- **Cross-client visual/pixel-identical comparison.** §7's last point is the reason: two clients are
  not required to look alike, only to each satisfy their own stated policy.
- **Visual regression within one client, as a tier.** Screenshot suites, such as today's Playwright
  suites in `c123-scoreboard` and `c123-penalty-check`, stay with each client as its own discipline.
  They sit outside the four tiers, which neither adopt nor retire them (maintainer decision,
  c123-server#170). Tier 3 asserts behaviour on the DOM or view-model; appearance is the client's.
- **`c123-xml-tools` and `timing-design-system`.** Out of scope here exactly as they were out of scope
  for the architecture itself (`CONSTRAINTS.md` §1.6) — context, not subjects.
- **Capacity under load, as a tier.** The spike measured it once (`DECISIONS/ADR-017`): a live push
  peak of 12.2 pushes/s coalesced, and a finish re-ranking every slower placed row so that
  placement-only pushes are 78–94 % of Results-row pushes (~160 B each). Any later estimate starts
  from those figures, not from "one or two rows per finish"; the §8.3 store's own margin is M3's to
  measure.
- **A migration plan for existing tests.** This document states the target shape; deciding which of
  today's tests move first, get deleted, or run alongside the new tiers during a transition is
  sequencing, explicitly out of scope for this engagement throughout (`CONSTRAINTS.md` §4).

---

## 9. What survives, what's obsoleted, what needs rework

Reached by designing from `CONTRACTS.md`/`ARCHITECTURE.md` first, then checked against what actually
exists (`c123-protocol-docs/docs/specs/2026-05-13-qa-layer-design.md`, `docs/plans/2026-05-13-qa-
layer-implementation.md`, and the five named tools) — not the other way round.

**Survives, and becomes more central, not less:**
- `player.js` — the full v3-format emulator with its Control API is exactly what tier 2's new
  capture tool drives, and exactly what a realistic tier-4 smoke test needs. Its CIS emulation is
  no longer needed at all (`DECISIONS/ADR-011`). Only the TCP and XML emulation matter.
- `extract-excerpt.js` — produces the "ingest fixture" §3.2 needs, with two reworks found by the
  spike: it writes `_meta.startTime` as an epoch offset (`1970-01-01T…`), so an absolute start needs the
  source manifest, and it writes the free-text label into the checksummed line, so one window has one
  checksum per label (S1-9, S2-3). Both are M2 items; the layout (`manifest.json`, `excerpt.json`,
  `data.jsonl`) is settled.
- `recorder.js` — writes TCP connection changes only to the console (S1-9); it must write them as
  records, because INV-2 rule 2 and INV-7's guard are decided by them (M2).
- `recordings-cli.js` — its push/fetch/catalog mechanism is reused as-is for fixture distribution
  (§6), not replaced.
- The tier-3 harness as a `DataProvider`/delta-handler driver per client — built once in the spike
  (S3): 249 infrastructure + 94 test lines, every assertion without touching `src/`, one clock; the
  mock-WS port it replaces (`c123-live-mini#105`) is retired.
- The seven named scenarios from the unbuilt `qa/README.md` — a reasonable starting catalogue for
  tier 2's fixtures, kept for their selection rationale even though the surrounding per-project
  verification-matrix concept they were designed for does not survive.

**Obsoleted:**
- The **per-project verification matrix** and the explicit "baselines live in each project's repo"
  policy (spec lines 121–143) — the exact pattern this document replaces with one authorial location
  and pinned consumption (§6).
- Each repository's own bespoke mock-WebSocket/fixture-loader pattern, and the plan (visible in
  `c123-live-mini#105`'s reuse table) to hand-port `c123-penalty-check`'s mock server into
  `c123-live-mini` — superseded by the shared fixture format (§4) feeding tier 3's harness directly;
  there is nothing left to port.
- `replay-server.js` — already marked deprecated in its own repository's documentation
  (`recordings/README.md`: "legacy... use Player v3 instead"), consistent with this design's exclusive
  reliance on `player.js`. Confirming an existing decision, not making a new one.

**Needs rework, or does not yet exist:**
- **The capture tool** (§3.2) — a projection of the direct-injection replay onto §4, plus the
  admission step. The spike's 413-line pipeline (S2) is the prototype to rewrite in M2, not to keep.
- **The direct-injection ingest-boundary replay path** (§3.2 gates 1/2, and the regression check) —
  omitted from this list in the first draft, an oversight, not a judgement that it's unneeded: gates 1
  and 2 specifically require feeding captured raw messages into `c123-server`'s ingest boundary
  directly, bypassing the player and the network. Checked under review, not assumed: `c123-server`'s
  own `parseXmlMessage`/`EventState.processMessage` are already free of transport I/O, so this is cheap
  to build, not a design risk — but it does not exist yet either, and belongs on this list.
- **`test-utils.js`** — its three functions (`findFreePort`, `startPlayer`, `waitForTcpData`) are
  narrowly scoped to standing up a player instance and reading raw pipe-delimited TCP off it; nothing
  in it addresses WS output capture, fixture loading, or clock control. Plausibly extended rather than
  replaced, but the two capabilities this design actually needs from a shared utility layer —
  capturing a domain-state fixture, and loading one into a tier-3 harness — are not there today.
- ~~**`player.js`'s `CisEmulator` has two real bugs**~~ and ~~**INV-2b's live re-query has no test
  path**~~. Both are **moot since the consolidated revision.** CIS is not consumed
  (`DECISIONS/ADR-011`), and INV-2b no longer re-queries: it only surfaces a diagnostic, which tier 1
  covers. The two emulator bugs remain real in the tool, but they block nothing this design needs.
- **Write-echo emulation** — `player.js` explicitly does not emulate the write-side channels
  (`tools/player.js:904`). Tier 1 covers the merge-rule half of write handling without it; a
  realistic tier-4 round trip does not exist until this is built, and is recorded here as a gap
  rather than assumed solved.
- **The QA-layer spec and plan documents themselves** — encode the per-project premise §1 and this
  section both name as obsolete. Superseding them, not amending them, is the honest description; they
  are not wrong about the tools, only about the shape the tools should serve.

---

## 10. Left open

- ~~**The exact vector count and coverage for tier 1.**~~ **Resolved.** 35 vectors were written, then 84 after the consolidated revision; the estimate did undercount, as the review suspected. Coverage map and the gaps that remain are in `CONFORMANCE-VECTORS.md` §2–§3. Original text follows for the record.
- **The exact vector count and coverage for tier 1.** §3.1 gives a target range (~25–30) and method,
  not the vectors themselves — writing them is implementation, test-first, the same relationship
  `CONTRACTS.md` has to the server code it precedes. Raised directly under review: the §4 ranking
  table alone has four rows, each with a no-CIS variant, plus the tie-break and no-result cases from
  §5 — whether 25–30 actually covers that combinatorially, or was an estimate that undercounts it, is
  not resolved here and shouldn't be guessed at; the real count is whatever writing them honestly
  produces.
- ~~**Whether `recordings-cli.js`'s existing versioning is sufficient for what a domain-state fixture
  needs.**~~ **Resolved (§4, §6; `DECISIONS/ADR-017` D5):** three identities, catalogue key
  `<fixtureId>@<contract>+<generator>`; `recordings-cli.js` needs that key and gzip, an M2 item.
- ~~**Whether re-implementing tier 3's harness driver in three client repos is actually cheaper than
  the mock-WS porting it replaces.**~~ **Answered by building one (spike S3):** 249 + 94 lines, about
  200 of them scoreboard-specific, against an estimated 165–190 lines plus a browser, a `src/` hook
  and two clocks for the mock-WS port. The cost is relocated rather than removed, in a deterministic
  form that can assert everything the port could not; the challenge was fair and the inversion holds.
- ~~**INV-2b's fixture-format extension.**~~ Moot: INV-2b no longer triggers a query
  (`DECISIONS/ADR-011`).
- ~~**TCP connection events in fixtures.**~~ **Verified absent (spike S1-9):** the recorder logs them
  to the console only. Until it writes them as records (M2, §9), a replay connects before the first
  TCP message and infers nothing; rule 2's outage path is then untested on recordings.
- **Re-baseline events in fixtures.** The operator re-baseline (`CONTRACTS.md` §4) is an event in the
  ingest sequence. A tier-2 fixture that reproduces a recorded correction incident needs a way to
  place one; the tier-1 `rebaseline` event is the shape. No recording contains one, because the
  action does not exist yet.
- Which test runner/framework each repository uses for tier 3 is that repository's own choice; this
  document requires the clock-injection discipline (§5) and the fixture format (§4), not a specific
  library.
- ~~Whether `domainLayerVersion` mismatches between a fixture and a consumer should fail loudly or
  warn.~~ **Resolved (§4): fail.**
- CI wiring, schedule, and enforcement generally — deliberately out of scope, per `CONSTRAINTS.md` §4.
