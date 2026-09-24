# Tier-1 Conformance Vectors

`TEST-ARCHITECTURE.md` §3.1 names these vectors as the minimum that proves the contract implementable
before any server code exists. They are also the outside authority that Tier 2's admission gate 3
checks a captured fixture against. The data lives in `vectors/tier1-conformance.json`. It is
hand-authored, with no shared runtime code (`DECISIONS/ADR-002`/`ADR-003`).

**Consolidated revision, 2026-09-24.** Rebuilt against the consolidated contract.
- **Retired:** every vector that exercised CIS. CIS is not consumed (`DECISIONS/ADR-011`).
- **Rewritten:** the ranking-table rows became vectors for INV-2's rules. The mechanical tie-break
  vectors became standing-assembly vectors (`DECISIONS/ADR-012`).
- **New coverage:**
  - reconnection after a TCP outage (R52);
  - provisional marking in both upstream modes;
  - re-run generations;
  - age-category assembly;
  - second-run marks;
  - under review;
  - Cross placement.

**50 vectors:** 42 merge vectors and 8 standing-assembly vectors. The number is what the coverage
needed, not a target.

---

## 1. Format

### Merge vectors

Each vector has:
- `id`;
- `invariant`, a coverage tag;
- `description`;
- an optional `context`;
- an ordered `given`;
- `expect`.

**`given` contains two kinds of element.**
- **Observations.** Each has these fields:
  - `ingestSeq`, `field`, `source` (`tcp`, `xml` or `operator-write`) and `kind` (`inference`,
    `result-row` or `operator`);
  - `observedAt`, `value` and `confidence`;
  - optionally `eventTime` and `run`, the run generation;
  - optionally `judgingComplete` (whether every course gate is judged in this observation; `null`
    where no course is configured) and `runClosed`;
  - optionally `attemptId`, when a vector involves more than one Attempt.

  Observations are *resolved*: `DERIVATIONS.md` has already turned wire fields into these values.
  These vectors test the merge, not the derivation.
- **Connection events.** Each has `ingestSeq`, `event` and `observedAt`. The events are
  `tcp-disconnected`, `tcp-connected`, `xml-rewrite-detected` and `oncourse-empty`. They exist
  because INV-2's rule 2 depends on TCP continuity.

**`expect` is the presented state after the last given.**
- An envelope field left out of `expect` is not asserted.
- Keys may be prefixed by an `attemptId` (`K1M_BR1_6:9.outcome`).
- `diagnostics` asserts INV-2b's surfaced disagreements.
- `writeRequest` asserts the write status.
- `notifications` asserts the number of client-visible changes.

**`expectSequence` + `then`** assert an intermediate state. `afterGivenIndex` is 0-based, and `-1`
means before any given. The observations in `then` are applied after it.

### Standing-assembly vectors

`given.entries` holds resolved Attempt facts:
- `entryId`, `bib`, `status`;
- `placement` (`{rank, order}` or `null`);
- `result`, `pairTotal`, `ageCategoryId`;
- `provisional`, `underReview`.

`scope` names the Standing scope. `ageCategoryId`, where present, asks for that category's standing.
`upstreamCategoryRanks` supplies the snapshot's own category ranks for the check. `expect` is the
assembled `standing`, in order, plus `anomalies` (`CONTRACTS.md` §5).

---

## 2. Coverage map

| Area | Vectors | Count |
|---|---|---|
| INV-1 (monotonic knowledge) | `inv1-untouched-field-not-regressed`, `inv1-never-observed-stays-not-yet` | 2 |
| INV-2 rule 1 (result row over inference) | `inv2-rule1-result-row-supersedes-inference`, `inv2-rule1-inference-never-supersedes-result-row` | 2 |
| INV-2 rule 2 (TCP continuity) | `inv2-rule2-connected-tcp-beats-later-xml`, `-xml-takes-over-after-disconnect`, `-reconnect-does-not-restore-stale-tcp`, `-fresh-tcp-after-reconnect-wins`, `-xml-alone-at-cold-start` | 5 |
| INV-2 rule 3 (single-source fields) | `inv2-rule3-single-source-field` | 1 |
| INV-2 rule 4 (operator writes) | the six `operator-write-*` and `operator-assertion-*` vectors, including `superseded` | 6 |
| INV-2b (surfaced, never adopted) | `inv2b-disagreement-surfaced-not-adopted` | 1 |
| INV-2c (older event refused) | `inv2c-older-event-refused`, `inv2c-does-not-apply-without-eventtime` | 2 |
| INV-3 and the trichotomy | `trichotomy-known-zero-not-confused-with-absence`, `trichotomy-unavailable-persists-explicitly`, `inv3-not-applicable-external-id` | 3 |
| INV-4, INV-5, INV-6 | one each | 3 |
| `provisional` in both upstream modes | `provisional-incomplete-judging-then-settles`, `-first-push-already-complete`, `-run-closed-without-course` | 3 |
| Ongoing recomputation before the result push | `ongoing-recomputation-provisional-total-revised-by-late-gate` | 1 |
| Run generation (re-run) | `rerun-retracts-run-scoped-fields`, `rerun-old-generation-row-not-presented`, `rerun-status-transition-legal-only-with-generation` | 3 |
| Marks and review | `under-review-independent-of-provisional`, `second-run-dns-keeps-combined-placement`, `attemptstatus-finished-to-dsq-post-finish` | 3 |
| Two-run | `two-run-br1-untouched-by-br2`, `-recovered-from-xml-cold`, `-unavailable-no-live-no-xml` | 3 |
| Kayak Cross | `cross-outcome-not-yet-before-operator-entry`, `-from-placement-not-time`, `-corrected-after-next-heat-started` | 3 |
| Phase status transition | `phasestatus-official-to-revised-skips-unofficial` | 1 |
| Standing assembly (§5) | relayed order and single-run tie; combined tie with no anomaly; unplaced entries; age-category assembly; category-rank disagreement; order disagreement; Cross never checked; behind and flags | 8 |

---

## 3. What these vectors do not cover

- **Derivation from raw wire fields.** Gate-string parsing, units, sentinels, the fabricated-course
  signatures and generation triggers are all Tier 2's job, against real recordings.
  `DERIVATIONS.md` §4 is the specification.
- **Timing.** These vectors say nothing about speed. The measured push latency is evidence for the
  design, not a tier-1 assertion.
- **Multi-organiser isolation** (`CONTRACTS.md` §8.1). That is a storage property.
- **The full wire shapes of §7 and §8.** Those are integration-level concerns.

---

## 4. What could not be written

Nothing. The previous edition could not express INV-2b's re-query trigger as a vector. The re-query
no longer exists (`DECISIONS/ADR-011`): INV-2b now only surfaces a diagnostic, and that is a
presented-state fact, covered by `inv2b-disagreement-surfaced-not-adopted`.

---

## 5. Decisions this rebuild forced

1. **Connection events in `given`.** INV-2's rule 2 depends on TCP continuity, so an input sequence
   without connection events could not express it. Adopted as a second kind of `given` element.
2. **`kind`, `run`, `judgingComplete` and `runClosed` on observations.** Precedence (rule 1),
   generation attribution and `provisional` depend on them. They are resolved by `DERIVATIONS.md`,
   exactly as `source` and `confidence` already were.
3. **Unplaced entries needed a stated order** to be a well-formed vector. `CONTRACTS.md` §5 step 3
   now states it: `AttemptStatus` declaration order, then bib.
4. **INV-2b needed a stated diagnostic shape.** `CONTRACTS.md` §4 and §7.1 now state it.
