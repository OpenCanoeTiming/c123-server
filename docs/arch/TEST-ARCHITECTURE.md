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

- **The domain layer** (`c123-server`, `live-mini-server`) is a pure function of the *ingest
  sequence* — `CONTRACTS.md` §4 INV-6 already makes this orderable independent of wall-clock time.
  Given the same ordered inputs, it must produce the same outputs, full stop, with no third
  variable involved.
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

**What it proves:** an implementation of the merge rule (`CONTRACTS.md` §4's eight invariants and the
source-ranking table) is correct, in isolation, with no recording and no running server.

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
{ "id": "inv-2c-stale-cis-refused",
  "given": [
    { "source": "tcp", "observedAt": "2026-09-15T10:14:02.083Z",
      "eventTime": "2026-09-15T10:14:02.079Z", "value": { "totalSeconds": 82.36 } },
    { "source": "cis", "observedAt": "2026-09-15T10:14:11.400Z",
      "eventTime": "2026-09-15T09:58:00.000Z", "value": { "totalSeconds": 81.90 } }
  ],
  "expect": { "value": { "totalSeconds": 82.36 }, "source": "tcp",
              "note": "cis outranks tcp for this category, but its eventTime is older — INV-2c refuses it" } }
```

Roughly 25–30 vectors cover this precisely: one or two per invariant, one per row of the §4 ranking
table, the tie-break and no-result cases from §5. Each of `c123-server` and `live-mini-server` writes
a thin adapter that feeds these vectors into its own merge function and asserts the result — proving
both satisfy the same data-defined contract without either depending on the other's code.

**This is the minimum that proves the contract implementable before any server code exists.** Every
vector is written directly from `CONTRACTS.md` prose; none needs a recording, a running server, or an
upstream fact. It is also the fastest possible feedback loop during implementation — a merge-rule
regression fails a millisecond-scale test, not a multi-minute replay.

### 3.2 Tier 2 — Replay determinism

**What it proves:** `CONTRACTS.md` §4's central claim, made falsifiable. This is the direct answer to
§1's opening problem.

Two distinct artifacts, not one, because conflating them is exactly what would make the check
meaningless:

- **An ingest fixture** — the raw sequence of upstream messages a domain layer actually receives,
  with their true arrival characteristics. This is not a new concept: it is what
  `extract-excerpt.js` already produces (`c123-protocol-docs/tools/extract-excerpt.js`) — a
  player-v3-playable slice of a real recording, already checksummed. Nothing new needs building here.
- **A domain-state fixture** — the sequence of presented values the domain layer *produces* when fed
  an ingest fixture: the same shape as the WS/SSE delta stream `CONTRACTS.md` §7.2/§8.4 already
  define (`{seq, type, ..., fields}`), captured to a file instead of streamed live. **This does not
  exist today, in either tooling or concept** — confirmed directly, not assumed: every existing tool
  (`player.js`, `replay-server.js`, `test-utils.js`) operates on the *inbound* side, emulating or
  replaying what Canoe123 sends; nothing anywhere captures what `c123-server` itself emits on `/ws`.
  The QA spec noticed this gap and assigned it to be solved separately, inside `c123-server`'s own
  repo (spec lines 138–143) — the duplication §1 opens with, concretely.

**The one new tool this design requires**, living alongside the others in `c123-protocol-docs`:
start `player.js` against an ingest fixture, start (or attach to) a `c123-server` instance pointed at
it, open its `/ws` connection following `CONTRACTS.md` §1.6's subscribe-before-snapshot sequence
exactly as any real client must, and record every message received, in order, to a file. That file is
the domain-state fixture — both the golden baseline for this tier and, unchanged, tier 3's input
(§4 below).

**The falsification mechanism, precisely:** feed the same ingest fixture into the domain layer twice
— replaying the captured raw messages directly against the ingest boundary, not re-running the player
against real time, so player/network jitter is removed from the question entirely — and diff the two
resulting domain-state fixtures byte for byte. They must be identical, including `observedAt` (fixed
because it was captured once, at original ingest, and is being replayed, not regenerated) and
`confidence`/`provisional`/`source` on every field. **A non-empty diff is the falsification
`CONTRACTS.md` §4 currently has no way to produce.**

**The same domain-state fixture verifies both merge implementations at once.** Because §8.3's push
shape is a re-serialisation of exactly what this fixture already contains, the identical fixture can
be replayed a second time as a sequence of `PUT` calls against a `live-mini-server` test instance;
its own presented values, read back over §8.4, must match. One fixture, two independent
implementations, one check — rather than building a second real-Canoe123 pipeline for `live-mini`
that would only prove the same thing a second, more expensive way.

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

**The clock requirement — a structural requirement this tier cannot work without, stated in §5.**

**Harness shape:**

1. Load a domain-state fixture.
2. Initialise the client under test with its first entry as a hydration snapshot; set the fake clock
   to that entry's `observedAt`.
3. For each subsequent entry: advance the fake clock to its `observedAt` (the real recorded gap,
   whether that gap came from a real recording or was chosen deliberately in a synthetic fixture),
   then apply the delta exactly as the real transport would deliver it.
4. Assert on rendered output — DOM via testing-library, or the view-model a render function consumes
   — at whatever points matter: immediately after a step, or after advancing the clock further with
   **no new fixture entry**, to test a grace period or TTL expiring on elapsed time alone.

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
and only tier 4 needed it. Recorded as a genuine tooling gap in §9, not glossed over.

---

## 4. The fixture format

**One format, used four ways**, because it is the same thing every time — a sequence of the same
`{seq, type, attemptId|phaseId|categoryId, fields|standing|write|sources}` deltas `CONTRACTS.md`
§7.2/§8.4 already define, with a file-level header:

```json
{ "fixtureId": "slalom-br2-finale",
  "source": { "kind": "recording", "excerpt": "2026-04-19-jarni-ne-odp#003", "sha256": "…" },
  "domainLayerVersion": "2.0.0",
  "asOfSeq": 0,
  "steps": [
    { "seq": 1044, "observedAt": "2026-09-15T10:14:02.083Z", "type": "attempt.updated",
      "attemptId": "K1M_ST_BR2_6:9", "fields": { "outcome": { "state": "known", "value": {...}, ... } } }
  ] }
```

`source.kind` is `"recording"` (traceable to an excerpt's checksum, tier 2's natural output) or
`"synthetic"` (hand-authored, with a `reason` string instead of an excerpt reference — written
directly from a `CONTRACTS.md` clause or an invariant, the same way tier 1's vectors are).
`domainLayerVersion` ties a fixture to the wire-protocol version it was captured against
(`c123-server/CLAUDE.md`'s existing `VERSION` constant) — a fixture generated against one version is
not silently assumed valid against a later one; see §6.

**A fixture is a captured, file-based instance of exactly what a real client already has to consume
live.** No second data model, no translation step between "what a test feeds a client" and "what
production feeds a client" — the harness in §3.3 is, deliberately, indistinguishable from a real,
slow subscription as far as the client code under test can tell.

---

## 5. The clock requirement

**Every piece of client code that makes a display-lifetime decision — a grace period, an eviction
TTL, a highlight duration, auto-scroll pacing, the departing timeout — must read time through an
injected clock, never by calling `Date.now()`, `setTimeout`, or `setInterval` directly.**

```ts
interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): TimerHandle
  clearTimeout(handle: TimerHandle): void
}
```

A thin production implementation wraps the real globals; a thin test implementation is a virtual
clock a test advances explicitly and deterministically — most of the stack already has one available
(`c123-live-mini#105` already configures Vitest, which ships fake timers; the other repos'
equivalents are no heavier to add). This is genuinely new discipline in exactly one place per
repository — today's timing logic (`SB/context/constants.ts`, `useDeparting.ts`, `useAutoScroll.ts`,
`useHighlight.ts`, `EventState`'s `HIGHLIGHT_DURATION_MS`/`ONCOURSE_TTL_MS`) almost certainly calls the
real globals directly, since nothing before this needed it not to — but it is a mechanical,
narrowly-scoped change per site, not a redesign, and it is the one thing §2's second determinism
cannot be tested at all without. `c123-scoreboard#43`'s own account of its "Phase M" E2E suite —
five failing tests, attributed to "mock-server/timing issues" — is a live example of what happens
without this discipline: timing asserted against real elapsed time is exactly what produces flaky,
hard-to-diagnose failures, independent of whether the feature under test is even wrong.

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
the same question.

---

## 7. Diagnosing disagreement between two components

**Answered directly, since it was the original point of the whole engagement:** each tier's input is
the *previous* tier's already-verified output, so the tier at which a test first fails names the
component at fault.

- Tier 1 fails → the merge rule itself, in whichever implementation failed it (`c123-server` or
  `live-mini-server`) — wrong before a single recording is even involved.
- Tier 1 passes, tier 2 fails → the domain layer's handling of some real upstream behaviour tier 1's
  synthetic vectors didn't cover — the fixture that exposed it becomes a new tier-1 vector, closing
  the gap for good rather than only for this one recording.
- Tier 2 passes for the fixture in question, a client's tier 3 fails → that client, unambiguously —
  it received the correct domain state (tier 2 already proved that) and rendered it wrong.
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
- **`c123-xml-tools` and `timing-design-system`.** Out of scope here exactly as they were out of scope
  for the architecture itself (`CONSTRAINTS.md` §1.6) — context, not subjects.
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
  capture tool drives, and exactly what a realistic tier-4 smoke test needs.
- `extract-excerpt.js` — already produces exactly the "ingest fixture" §3.2 needs, checksum included.
  Zero rework; it was simply never used yet (`qa/excerpts/` is empty).
- `recordings-cli.js` — its push/fetch/catalog mechanism is reused as-is for fixture distribution
  (§6), not replaced.
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
- **The domain-state-output capture tool** (§3.2) — confirmed to not exist in any form; every current
  tool operates on the inbound side only. The one genuinely new piece of tooling this design requires.
- **`test-utils.js`** — its three functions (`findFreePort`, `startPlayer`, `waitForTcpData`) are
  narrowly scoped to standing up a player instance and reading raw pipe-delimited TCP off it; nothing
  in it addresses WS output capture, fixture loading, or clock control. Plausibly extended rather than
  replaced, but the two capabilities this design actually needs from a shared utility layer —
  capturing a domain-state fixture, and loading one into a tier-3 harness — are not there today.
- **Write-echo emulation** — `player.js` explicitly does not emulate the write-side channels
  (`tools/player.js:904`). Tier 1 covers the merge-rule half of write handling without it; a
  realistic tier-4 round trip does not exist until this is built, and is recorded here as a gap
  rather than assumed solved.
- **The QA-layer spec and plan documents themselves** — encode the per-project premise §1 and this
  section both name as obsolete. Superseding them, not amending them, is the honest description; they
  are not wrong about the tools, only about the shape the tools should serve.

---

## 10. Left open

- The exact vector count and coverage for tier 1 (§3.1 gives a target range and method, not the
  vectors themselves — writing them is implementation, test-first, the same relationship
  `CONTRACTS.md` has to the server code it precedes).
- Which test runner/framework each repository uses for tier 3 is that repository's own choice; this
  document requires the clock-injection discipline (§5) and the fixture format (§4), not a specific
  library.
- Whether `domainLayerVersion` mismatches between a fixture and a consumer should fail loudly or warn
  — an operational policy question for whoever wires tier 3 into CI, not a contract question.
- CI wiring, schedule, and enforcement generally — deliberately out of scope, per `CONSTRAINTS.md` §4.
