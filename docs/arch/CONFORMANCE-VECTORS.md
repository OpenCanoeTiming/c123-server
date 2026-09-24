# Tier-1 Conformance Vectors

The vectors `TEST-ARCHITECTURE.md` §3.1 calls the minimum that proves the contract implementable
before any server code exists — and, since the independent review's F1 fix, the outside authority
Tier 2's admission gate 3 checks a captured fixture against. Data lives in
`vectors/tier1-conformance.json`, hand-authored, no shared runtime code (`DECISIONS/ADR-002`/
`ADR-003`). This document is the format, the coverage map, and the two things the exercise found
that no vector could paper over.

36 vectors. Not a target hit — the number the coverage below actually needed. Row 2 of the ranking
table needed four on its own, to show authority, recency, the no-CIS fallback, and the third-ranked
`xml` case separately; some invariants (INV-4, INV-5, INV-6) needed exactly one, because there was
exactly one distinct behaviour to pin down.

---

## 1. Format

Every vector: `id`, `invariant` (a coverage tag — an `INV-N` number, a `ranking-row-N`, or a named
area like `two-run`), `description`, `context.cisConfigured`, an ordered `given`, and `expect` — the
presented envelope(s) a correct implementation must produce after applying `given` in order. Two
extensions to the shape sketched in `TEST-ARCHITECTURE.md` §3.1, both forced by vectors that could
not otherwise be written precisely (§4 below):

- **`expectSequence` + `then`**, for a vector that must assert an *intermediate* state, not only the
  final one — `ongoing-recomputation-*` needs this to show the total actually changing mid-sequence,
  which is the entire point of that vector.
- **Multi-attempt keying** (`"K1M_ST_BR1_6:9.outcome"` as an expectation key, rather than one implicit
  Attempt per vector) — the `two-run-*` vectors are inherently about two Attempts' independence, so a
  single-Attempt shape could not express what they need to prove.

**A second, distinct `given`/`expect` shape exists for the four `standing-tiebreak` vectors**, and
this is deliberate, not an inconsistency: those test `CONTRACTS.md` §5's ranking *algorithm* over
already-resolved outcomes, not the merge/precedence function every other vector exercises. Their
`given` is a list of `{entryId, outcome, upstreamRank?}` — resolved facts, not raw observations —
because §5 is a pure function of resolved values, and giving it anything else would test something
`CONTRACTS.md` doesn't claim it does.

---

## 2. Coverage map

| Area | Vectors | Count |
|---|---|---|
| INV-1 (monotonic knowledge) | `inv1-untouched-field-not-regressed`, `inv1-unavailable-never-defaulted` | 2 |
| INV-2 (authority-gated replace) | all nine `ranking-row-*` vectors, §4's table exhaustively — see below | 9 |
| INV-2b (re-query, never silent override) | `inv2b-lower-ranked-disagreement-does-not-silently-adopt` — the observable-value half only, §3 | 1 |
| INV-2c (eventTime floor) | `inv2c-stale-cis-eventtime-refused`, `inv2c-does-not-apply-without-eventtime` | 2 |
| INV-3 (`unavailable` asserted, never defaulted) | the two `trichotomy-*` vectors | 2 |
| INV-4 (identity bindings are `Observed`) | `inv4-entry-correction-is-a-field-update` | 1 |
| INV-5 (idempotent supersession) | `inv5-identical-redelivery-is-a-noop` | 1 |
| INV-6 (monotonic sequence, not wall clock) | `inv6-clock-jump-does-not-reorder-merge` | 1 |
| §4 ranking table, row by row, with/without CIS | `ranking-row-1` (×1), `ranking-row-2` (×4: cis-confirms, cis-not-overridden, no-CIS self-correction, xml-only fallback), `ranking-row-3` (×1), `ranking-row-4` (×2: tcp-beats-xml, xml-fallback) | 8 |
| Operator-write / operator-assertion carve-out | `operator-write-provisional-presented-immediately`, `-confirmed-by-matching-echo`, `-mismatched-echo-wins`, `-provisional-false-not-superseded-by-incidental-report` | 4 |
| Two-run recovery (§4.5's three independent paths and the unrecoverable case) | `two-run-br1-untouched-by-br2`, `-recovered-via-xml-no-live-no-cis`, `-recovered-via-cis-after-restart`, `-unavailable-no-cache-no-xml-no-cis` | 4 |
| Kayak Cross operator-asserted outcome | `cross-outcome-not-yet-before-operator-entry`, `-operator-asserted`, `-corrected-after-next-heat-started` | 3 |
| Ongoing recomputation (`DERIVATIONS.md` §4.3's fix) | `ongoing-recomputation-provisional-total-revised-by-late-gate` | 1 |
| State-machine legal transitions | `phasestatus-official-to-revised-skips-unofficial`, `attemptstatus-finished-to-dsq-post-finish` | 2 |
| Standing computation (§5, beyond the brief's minimum ask) | the four `standing-tiebreak-*` vectors | 4 |

(Rows overlap by design — every `ranking-row-*` vector is also part of INV-2's coverage; the map
above counts each vector once, under whichever heading a reader would look for it first.)

**Beyond the minimum asked:** the four `standing-tiebreak` vectors. Not requested explicitly, but
`ADR-008`'s tie-break rule is exactly as precise and exactly as previously-flagged (the orchestrator's
open question after round one) as anything on the required list, and leaving it uncovered while
writing vectors for everything around it would have been a visible, avoidable gap.

---

## 3. What these vectors do not cover, stated plainly

- **The re-query *trigger* itself (INV-2b's other half).** See §4 — recorded as a finding, not
  quietly dropped.
- **The wire-level derivation from raw Canoe123 fields.** Every `given` observation is already
  resolved (`source`, `confidence`, `value` as `DERIVATIONS.md` would produce them) — these vectors
  test the *merge* function in isolation, per `TEST-ARCHITECTURE.md` §3.1's own scope. Whether
  `DERIVATIONS.md`'s transformations are themselves correct against real wire data is Tier 2's job,
  checked against real recordings, not this tier's.
- **Timing/latency assertions** — e.g. that a Cross assertion is pushed "instantly," or that the
  four-second overlap window behaves as `ongoing-recomputation-*` describes across *real* elapsed
  time. These vectors assert *what the merge produces given an ingest order*; they say nothing about
  wall-clock speed, which is `TEST-ARCHITECTURE.md`'s tier-3 clock-injection concern, not tier 1's.
- **Multi-organiser/tenancy isolation** (`CONTRACTS.md` §8.1's compound-key requirement). That is a
  storage-layer property, not a merge-function one — nothing about how two organisers' data must be
  keyed is expressible as an input sequence to a single Attempt's merge function.
- **The full `CONTRACTS.md` §7/§8 wire shapes** (status codes, error envelopes, the subscribe-before-
  snapshot handshake). Out of scope for conformance vectors by `TEST-ARCHITECTURE.md`'s own tier
  boundaries — those are integration-level, not unit-level, concerns.

---

## 4. What could not be written, and why

**INV-2b's re-query trigger cannot be expressed as a pure `given` → `expect` vector on the presented
value, and writing one anyway would have been the "vaguer vector to fill the slot" the brief warned
against.** The *value* half of INV-2b — a disagreement never silently overrides — is just INV-2's
ordinary behaviour restated, and `inv2b-lower-ranked-disagreement-does-not-silently-adopt` covers
exactly that, honestly labelled as covering only that. The *distinctive* half of INV-2b — that the
disagreement **triggers a targeted re-query** — is a side effect of the domain layer's own behaviour
on receiving an input, not a function of input to presented-state output. Testing it would require
deciding, here, that the merge function's own interface exposes triggered actions (an
`{newState, effects[]}` return shape, or an equivalent) — an interface decision `CONTRACTS.md` never
makes and this document should not make quietly on its behalf. This is exactly the same gap
`TEST-ARCHITECTURE.md` §9 already named ("no realistic test path... two ways to close it, neither
designed here") — reached independently, from the vector-writing side rather than the tooling side,
and landing on the same conclusion: recorded as untested by this tier, not solved by it.

---

## 5. Decisions this exercise forced, recorded rather than chosen quietly

1. **The base vector format (`given`/`expect` alone) is insufficient for a vector that must assert an
   intermediate state, not only a final one.** `expectSequence`/`then` (§1) is the extension; adopted
   here because `ongoing-recomputation-*` could not otherwise show the behaviour that motivated
   writing it in the first place.
2. **A second `given`/`expect` shape is required for `CONTRACTS.md` §5's ranking algorithm**, since it
   operates over resolved outcomes, not raw observations (§1). Naming this explicitly rather than
   forcing one uniform shape onto two different functions.
3. **The `not-yet` → `unavailable` boundary in the two-run unrecoverable case had no stated trigger**
   until `two-run-br1-unavailable-no-cache-no-xml-no-cis` (renamed after a real event added a fourth
   recovery path, see below) needed one to be a well-formed vector at all. Resolved in
   `DERIVATIONS.md` §4.5 and §8 (finding 4): the determination requires BR2's own arrival to be
   observed first: the domain layer cannot honestly assert "this should exist and cannot be supplied"
   before it knows BR2 happened, so before that point the honest state is still `not-yet`, even though
   intuitively "BR1 detail is gone" already sounds true from a purely definitional reading of the
   two-run scenario. This is a genuine domain-timing fact, not a wording preference, and every reader
   of `DERIVATIONS.md`'s prior text had to infer it rather than being told it.
4. **Added after this document's first draft: `two-run-br1-recovered-via-xml-no-live-no-cis`.** A
   real two-day event showed the XML snapshot alone recovers a superseded run's full detail with no
   live observation and no CIS — `DERIVATIONS.md` §4.5's now-primary path, previously untested by this
   suite because it was believed to need CIS or a cache to work at all. Its absence was itself a trace
   of the assumption the event disproved; recorded here rather than silently patched in.
