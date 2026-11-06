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
  - left the course without a finish;
  - result marks set on upstream's silent paths;
  - cell-wise gate merging for a second run's own penalty;
  - under review;
  - Cross placement.

**Revision round 2** (`DECISIONS/ADR-015`) added 15 vectors for retraction, contradiction, marks over
time, half-corrections, the re-baseline and the live tier's explicit reset.

**Round 3** (`DECISIONS/ADR-016`, #168) added 5 workflow-state vectors for gate checks: only the
contract-level rules. Durability and the flag lifecycle are ordinary store tests in `c123-server`
(`TEST-ARCHITECTURE.md` §3.5), not vectors.

**Round 4** added 3: the on-course set and its push, and two live-tier vectors (bare values wrapped,
Attempt deletion).

**Gap 21** added 2 live on-course vectors.

**Gap 22** added 1: a confirmed write later changed upstream stays confirmed. **Round 6** added 1: a
classification pushed to the live tier.

**Round 7** added 1: an untimed placed row.

**Round 8** (2026-10-14) rewrote the two INV-2c vectors — content age across sources, and a same-source
earlier finish superseding — and added 1: a finisher stays in the on-course set until closure.

**Round 12** (2026-10-15, `DECISIONS/ADR-017` Revision 4) removed every input finish time from TCP rows
(14 vectors), reshaped `rerun-stale-mark-not-presented` to the usual arrival order, fixed an
out-of-range `afterGivenIndex`, and gave `inv2-rule3-single-source-field` a second field.

**Round 9** (2026-10-14, `DECISIONS/ADR-017`) fixed `rerun-stale-mark-not-presented` (its `then` mark is
presented), dropped `finishTime` from TCP snapshot rows, gave every merge vector a `context.attemptId`,
and added 8: TCP attribution by run time (with the result push arriving before the on-course finish,
as recorded), the INV-2d lift, placement only when ranked, no standing re-send on a running tick, pair
fields provisional while run 2 runs, `status` never provisional, an Attempt unstaged before its start,
and a first-run row wiped in place (the recorded jury re-run).

**100 vectors:** 87 merge vectors, 8 standing-assembly vectors and 5 workflow-state vectors. The number is what the coverage
needed, not a target. **c123-server runs 94 of them, live-mini-server 23** (§1, "Which vectors each
component runs"); 17 run in both suites.

**Round 14** (2026-11-05, server#200) stated that split, made the two live lists total over every tag,
gave `live-explicit-not-yet-resets-field` the `context.tier: 'live'` the other five `live-ingest`
vectors already carried, and turned the last three prose `notifications` into data (the object form in
§1); no vector asserts anything different. `note` is commentary and is never asserted. It also stated
the **ingest unit** (`CONTRACTS.md` §1.6, a behavioural rule: messages are emitted per upstream
message, in a vector consecutive observations with the same `source` and `observedAt`), and retired
the number form of `notifications`: `inv5-identical-redelivery-is-a-noop` now asserts
`{ "attempt.updated": 1 }`, which is what INV-5 means there (a correct core also sends the
`standing.updated` §5 step 3 requires for the new unplaced entry, which the map does not assert).

**Round 15** (2026-11-05, server#200) defined `scope` on a merge vector and on an observation (§1,
"Scope of a field"): which of the Attempt, its Entry or its Phase a field name addresses, and that
the Phase is `context.phase`, else `context.attemptId`'s; it also defined `context.phase` and the
set-level keys `oncourse`, `attempts`, `featuredByUpstream` and `standing`. `inv6-clock-jump-does-not-reorder-merge`
and `phasestatus-official-to-revised-skips-unofficial` assert `Phase.status` of `K1M_BR1_6` and
stand: `running ⇄ paused` and `official → revised` directly are `CONTRACTS.md` §3.1's transitions,
and the later-ingested, earlier-clocked observation wins by INV-6. Both gained `context.phase`; the
first dropped `source` from its `expect` (a Phase field's source is `bridge` on the live tier, where
this vector also runs); what it asserts, `paused` presented, is unchanged.

**Round 16** (2026-11-05, server#200, PR #235) stated four matching rules the harness needs (§1):
a `not-yet` or `unavailable` expectation is matched whole, since those envelopes carry no other key
(`CONTRACTS.md` §1.2), so a retraction that flips `state` and keeps a stale `value` fails, keyed on
the presented envelope's `state`; inside a `known` envelope's `value` a key left out is not asserted,
but an expectation that states an `Outcome` `value` always states its `kind` (18 expectations that wrote `{ totalSeconds }` alone now write `{ kind: 'duration', totalSeconds }`;
`totalSeconds` exists on no other variant, so nothing they assert changed); `gateStatus` is exact over
every presented gate, an unlisted presented gate being `plain`; a source-less observation is a unit of
its own, and the `given`/`then` seam is always a unit boundary. Checked against the spike core on all
87 server vectors: 84 pass, the same three as before (values, not matching).

**Round 17** (2026-11-05, server#240, #243, #247, the #201 review) ruled the parsers' and the
checker's open cases before the merge core (#203). Two vectors stop asserting an envelope at
`members[0].externalId`, a path no deployable serves: `inv3-not-applicable-external-id` and
`live-bare-value-wrapped-as-bridge` now assert `externalId: null` inside `members`' `known` value
(`CONTRACTS.md` §2.5), which is what they meant, a person with no registry identity fully
renderable; no vector uses a path any more. `live-classification-rows-replaced-whole` writes
`decidedIn` as upstream's round token (`F`, `SF`), not a format token. §1 states the shape of a
classification Phase's scope snapshot (`ClassificationRow`s), the `untimed` row flag, and that `run`
on an observation is stamped by the core (`DERIVATIONS.md` §0.5, §4.11). Nothing any vector asserts
changed.

**Round 18** (2026-11-05, the server#202 and #201 reviews) redefined content age (`CONTRACTS.md` §4
INV-2c): an `xml-rewrite-detected` event may carry `changedAfter`, the last moment the reader saw
the file in its previous state (`null` = unknown), and that is the snapshot's content age; an event
without it keeps meaning `observedAt` minus `context.xmlPollIntervalSeconds`, resolved by the
harness before the core sees the unit, so no vector changed. §1 also states that an empty table is
a start-list scope snapshot and that a classification snapshot replaces the Phase's rows whole
under INV-2c's guard. One vector is owed, `inv2c-first-read-unknown-age-refused` (second pass):
`tcp` rows present results for Attempts A and C; `tcp-disconnected`; a rewrite with
`changedAfter: null` whose snapshot carries a different value for A, an empty row for C and a
result for B, which no `tcp` observation presents — A and C unchanged, B presented from `xml`;
`then` a rewrite whose `changedAfter` follows the disconnect and repeats A's refused value (the same
value, source and generation: INV-5 advances the retained candidate's content age, INV-2c settles
it), A's new value presented. It lands with
the harness change that reads the key, since the suite counts are pinned in code (93/87 → 94/88).

**Round 19** (2026-11-06, the merge core's first sweep over all seven recordings, server#203; second
pass the same day) restated the generation trigger (`CONTRACTS.md` §2.6; `DERIVATIONS.md` §4.11): a
listing that changes the start increments `run` only with no finish and a recorded generation —
recorded by a row attributed after the recorded start, never by the stream alone; every other start
change is a correction inside the generation. No existing vector changes: the `run-generation`
vectors state the generation through a `run` observation (below), and no vector lists a changed
start (`rerun-status-transition-legal-only-with-generation`'s bare `status` observations stand for
a table-presented finish; it does not exercise `DERIVATIONS.md` §4.1's withdrawal of a stream
finish, which only a listing vector can). **Six vectors are owed**, all merge, all on site
(94/88 → 100/94), their `given` from the recordings' shapes. In each, "a listing with `Time`" is an
`onCourse` observation with a sibling `outcome` inference (`running` or `duration`) at the same
step, as in `rerun-tcp-row-before-new-finish-not-presented`.
(1) `start-correction-mid-run-keeps-generation` (K1M_BR1_18:138 and K1M_BR1_20:115 in one): listing
with `dtStart: null` (`at-start`), listing start S1 with `Time` 0 (`on-course`, `running`), listing
with `dtStart: null` (`at-start`, `outcome: not-yet`), listing start S0 earlier than S1, no finish,
`Time` 8 → `run` 1, `status: on-course`, `running` 8, no `attempt.updated` carrying `run`; `then`
the finish and the row presented as usual.
(2) `start-correction-after-finish-row-first` (C1M_BR2_18:56 as recorded): listing with
`dtStart: null`, listing start S1, row 81.62 rank 11, finish listing with `Time` 81.62, row 120.98
rank 60, listing with start S0, the same `dtFinish` and `Time` 120.98 → `run` 1, `status: finished`,
`outcome` 120.98 from `tcp` with the unchanged finish as `eventTime`, placement rank 60,
`diagnostics: []`.
(3) `start-correction-after-finish-listing-first`: the same with the correcting listing before the
120.98 row: after the listing `outcome` still 81.62 from `tcp` (rule 1), no `contradicted-finish`;
after the row 120.98.
(4) `rerun-trigger-new-start-after-recorded-finish` (C1M_BR1_19:7 by listings): listing with
`dtStart: null`, listing start S1, row 96.69 rank 1, finish listing with `Time` 96.69 (the recorded
order, the row 55 ms before the finish; attribution is `rerun-tcp-row-before-new-finish-not-presented`'s,
this vector asserts the trigger), `oncourse-left` (closure 10:48:45; `status: finished` from the
table), a `tcp` start-list snapshot retracting the row (`status: not-started`, the Attempt not
listed), a listing with `dtStart: null` (`status: at-start`, `run` 1), a listing with the new start
S2 and no finish → `run` 2 with every run-scoped field `not-yet` in that delta and
`status: on-course`; `then` the row 83.57 before the finish, the finish with 83.57 → attributed and
presented.
(5) `inv2-rule2-reconnect-redelivery-regains-precedence`: `tcp` 84.36; `tcp-disconnected`; a
rewrite whose `changedAfter` follows the disconnect with `xml` 134.36, presented; `tcp-connected`;
`tcp` re-sends 84.36 → presented from `tcp` with the re-delivery's `observedAt`, one
`attempt.updated` for the source change (INV-5 as restated in `CONTRACTS.md` §4).
(6) `start-correction-after-cleared-mark-keeps-generation` (the cleared-`DNS` first start, seven
recorded Attempts, written as a first run): row `DNS` with no start (`status: dns`), listing with
`dtStart: null` (`dns` stands: a listing displaces no table mark), a `tcp` scope snapshot with the
row present and empty (retraction; `status: at-start`, as the stream shows), listing start S1
(`on-course`, `run` 1: the first start is no change), listing start S0 earlier and no finish →
`run` 1, `status: on-course`, no `attempt.updated` carrying `run`; `then` the finish and the row
presented as usual.

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
  - optionally `eventTime` and `run`, the run generation (stamped by the core at attribution,
    `DERIVATIONS.md` §4.11; the parser emits none);
  - optionally `judgingComplete` (whether every course gate is judged in this observation; `null`
    where no course is configured) and `runClosed`;
  - optionally `attemptId`; a vector whose observations carry none names its Attempt in
    `context.attemptId` (default `K1M_BR1_6:9`), so no vector has an implicit Attempt.

  Observations are *resolved*: `DERIVATIONS.md` has already turned wire fields into these values.
  These vectors test the merge, not the derivation. A `status` inference of `on-course` or `finished`
  implies an observed start (`DERIVATIONS.md` §4.1). **A `tcp` `result-row` observation, and a `tcp`
  snapshot row, never carries `eventTime` or `finishTime` on input** (`ADR-017` D1): the finish reaches
  the merge only as an on-course `inference` — `status: finished` or an `outcome` with `eventTime` —
  and a row is attributed to it by `outcome.runSeconds`; an attributed row's presented `outcome` then
  carries the finish as `eventTime`. Live-tier pushes are resolved values and may carry it.
- **Connection and operator events.** Each has `ingestSeq`, `event` and `observedAt`. The events are
  `tcp-disconnected`, `tcp-connected`, `xml-rewrite-detected` (optionally `changedAfter: Timestamp |
  null`, see Content age), `oncourse-empty`, `oncourse-left`
  (this Attempt stopped being listed) and `rebaseline` (with `scope`). They exist because INV-2's
  rule 2 depends on TCP continuity, INV-7's guard on the rewrite time, and the re-baseline is an
  event in the ingest sequence.
- **Content age** (INV-2c and INV-7's guard). An `xml` observation's or snapshot's content age is
  the latest preceding `xml-rewrite-detected` event's `changedAfter` where the event carries that
  key (a `Timestamp`, or `null`: unknown, INV-2c; `DERIVATIONS.md` §0.3);
  where it does not, that event's `observedAt` minus `context.xmlPollIntervalSeconds`, which defaults
  to 5 where absent; with no preceding rewrite event, its own `observedAt` minus the interval. A
  reader always stamps `changedAfter`; the subtraction exists for vectors written without it, and
  **the harness does it before `applyUnit`**: it stamps `changedAfter` on a keyless event and, for
  an `xml` element with no preceding event, prepends to that element's unit a synthesised
  `xml-rewrite-detected` carrying the computed value (outside the vector's element indices, so
  `afterGivenIndex` and `ingestSeq` are unchanged). The core reads content age from the event's
  `changedAfter` alone — absence as a key is a programming error, never `null` and never the
  interval — and `context.xmlPollIntervalSeconds` is the harness's. A `tcp`
  observation's content age is its `observedAt`.
- **Scope snapshots** (INV-7). `{ ingestSeq, snapshot: { source, phaseId, mode, rows }, observedAt }`.
  `mode` is `results` or `start-list`; each row carries `bib` and the resolved fields the row states
  (`outcome`, `placement`, `pairTotal`, `status` for a mark, `judgingComplete`, `timeEmpty` for a
  second-run row with no run-2 time, `untimed` for a placed row with no finish time — resolved on
  the XML row by the parser and already inherited onto a TCP row of the same Attempt by the core,
  `DERIVATIONS.md` §4.4 — and `finishTime` **on XML rows only**: a TCP row carries no finish
  time, and INV-2d and generation attribution match it by `outcome.runSeconds`). A row's `placement` is
  given resolved: `null` where upstream's `Rank` is empty, whatever its `RankOrder`
  (`DERIVATIONS.md` §4.7). A row that carries nothing states no result. A parser emits a table
  with no rows as `mode: 'start-list'`, `rows: []` (`DERIVATIONS.md` §0.3); in a vector, `rows: []`
  with `mode: 'results'` is a table whose other rows are elided — the named row is absent — and
  asserts the same (`retraction-dns-cleared-then-races`). **A scope snapshot of a
  classification Phase** (`CONTRACTS.md` §2.4) carries `CONTRACTS.md` §8.3 `ClassificationRow`s
  instead — `entryId`, `bib`, `rank`, `order`, `decidedIn`, the last `null` where only TCP has stated
  the row — creates no Attempt, and replaces the Phase's rows whole under INV-2c's guard alone
  (`DERIVATIONS.md` §4.10, which also keeps `decidedIn` across a TCP row's `null`); on site it is
  the only element that carries classification rows, the `push: 'classification'` element being
  the live tier's.
- **On-course listing.** An observation with `field: 'onCourse'` and
  `value: { dtStart, dtFinish }` states what the on-course stream lists for the Attempt (INV-2d,
  `DERIVATIONS.md` §4.11: a changed `dtStart` is the generation trigger or a start correction by
  that section's rule; `DERIVATIONS.md` §4.1: an empty `dtStart` is `at-start`). The listing's
  `Time` is a sibling `outcome` inference observation (`running` or `duration`) at the same step.
  **A `run` observation** (`field: 'run'`, `kind: inference`) is the file's
  shorthand for the trigger already decided: it states the generation; its `eventTime`, where
  present, is the generation's recorded start, and rows are attributed against it; without one
  the generation has no recorded start and attribution raises no question
  (`rebaseline-keeps-writes-and-generation` presents its XML row for that reason).
- A `kind: 'fragment'` observation stands for any single-row, non-snapshot message.
- **Live-tier elements.** `{ ingestSeq, push: 'entry' | 'class' | 'phase' | 'course' | 'oncourse' |
  'classification', body }` is a bare §8.3 push; the event `delete` with `attemptId` is a `DELETE`. `expect.notifications` may be a map of
  message type to count.
- **Scope of a field.** A `field` in an observation and an unprefixed key in `expect`,
  `expectSequence` or `then` name a field of the Attempt, unless the name exists only on its Entry
  (`CONTRACTS.md` §2.5: `displayName`, `members`, `club`, `nation`, `ageCategoryId`, `eventBib`,
  `isTeam`) or only on its Phase (§2.4), in which case they name that resource's field. No key is a
  path: a member's field is asserted inside `members`' `known` `value` under the subset rule below. `status` and `scheduledStart` exist on
  both the Attempt and the Phase, and `scope` decides: a vector's `scope: 'phase'` makes them the
  Phase's; an observation's own `scope` says the same for that element and overrides the vector's;
  `'entry'`, `'attempt'` or absent, they are the Attempt's. `scope: 'entry'` says the vector is
  about the Entry and moves nothing, so `inv2-rule3-single-source-field` reads `ageCategoryId` from
  the Entry and `status` and `courseOrder` from the Attempt under one `scope: 'entry'`. Eight keys
  name no resource field and are defined by this section alone: `diagnostics`, `writeRequest`,
  `notifications` and `note` (below); `oncourse`, the on-course set as the array of `attemptId` in
  the order `CONTRACTS.md` §7.1 `GET /api/oncourse` states (§8.4 on live); and, in the live vectors,
  `featuredByUpstream` (that response's field), `attempts` (the set of `attemptId` the store holds,
  order not asserted) and `standing`, a map from `standingKey` (`CONTRACTS.md` §5) to that Standing's
  entries in order, each entry asserting only the keys it lists. **The Phase is `context.phase`
  where present, else the one `context.attemptId` belongs to;** a vector states an `attemptId` as
  `${phaseId}:${bib}` (§2.6), and where both are present they agree. Reading the Phase off the id is
  a convention of this file alone, for a harness: a deployable finds a Phase through `Attempt.phaseId`
  and parses no identifier (`CONTRACTS.md` §1.1). The Entry is that Attempt's; where no element sets
  the Attempt's `entry` pointer, every Entry field in the vector is one Entry's. Neither needs a
  creation element: like the Attempt, each exists once observed. A merge port therefore exposes three
  presented resources, the Attempt, its Entry and its Phase (a `phase(phaseId)` beside `entry()`),
  and is told with each observation which one it addresses. A Phase field has no run generation, so
  between two observations of one source only INV-6 orders them, whatever their `kind`. On site
  `Phase.status` comes from `tcp` or `xml` (`DERIVATIONS.md` §2.2); on the live tier it is a bare
  value in a Phase body that the store presents as `bridge` (`CONTRACTS.md` §8.3), so **no
  expectation on a Phase field asserts `source`**, and a live adapter feeds the two `Phase.status`
  vectors as two Phase pushes of one Phase. The presented value is the mapped closed value, with
  `CONTRACTS.md` §3.1's transitions as the legal ones; the first observation of a Phase is not a
  transition.
- **Ingest units** (`CONTRACTS.md` §1.6). Messages are emitted per upstream message, not per
  observation: the core merges every observation one upstream message yields, then sends at most one
  message per changed resource. In a vector, **consecutive observations with the same `source` and the
  same `observedAt` are one unit** (`observedAt` is the moment that upstream message was received,
  `CONTRACTS.md` §1.2); every event, scope snapshot and live-tier element is a unit of its own. A
  harness applying element by element finds the boundary by looking at the next element: it flushes
  notifications when the next element is not an observation with the same `source` and `observedAt`,
  and after the last element. A merge port may take a unit whole (`applyUnit(elements)`) or one element
  at a time with a flush at the boundary; either satisfies this. Each observation keeps its own
  `ingestSeq`, which still orders the merge
  within the unit. No `afterGivenIndex` in the file falls inside a unit, and none may. **Two edges:**
  a source-less observation (the `unavailable` one) states no upstream message, so it is a unit of
  its own and never groups with a neighbour; and the seam between `given` and `then` is always a
  unit boundary, since `then` follows an asserted intermediate state, which can only exist at one.

**Which vectors each component runs.** Each component feeds its own merge function through a thin
adapter (`TEST-ARCHITECTURE.md` §3.1); the sets overlap, and each suite asserts its own count.

**c123-server runs 94: every vector not tagged `live-ingest`.** The tag is the rule; apart from it,
every merge vector is on-site material (`tcp`, `xml` and `operator-write` observations, the
source-less `unavailable` observation, connection and operator events, scope snapshots and
on-course listings), and all 8 `standing-assembly` and all 5 `workflow-state` vectors are the
server's (`ARCHITECTURE.md` §3: c123-server owns the on-site domain layer whole, `CONTRACTS.md` §4
and §5 with the anomaly checks, and the checks store). It runs **none of the six `live-ingest`
vectors**. Five feed a bare §8.3 push, a `DELETE` or an explicit `not-yet` observation into a store
that applies the live merge, and c123-server has no such store: on the bridge it only sends
(`CONTRACTS.md` §8.3). The sixth, `live-running-then-finished-latest-wins`, is `tcp` observations
only, but its result row carries `eventTime`, which the format above forbids on site (`ADR-017` D1)
and allows only as a live push, and it asserts §8.3's "the later-ingested one is presented". The
spike's live store was a spike (`DECISIONS/ADR-017`), not a server duty. A suite selects them by
`invariant: 'live-ingest'`; every one also carries `context.tier: 'live'`. No on-site vector depends
on a `live-ingest` one: the on-site side of a reset or a replace is a `notifications` expectation of
the `run-generation`, `INV-7` and `rebaseline` vectors (`attempt.updated` with explicit `not-yet`,
`scope.replaced`); on site a retraction is field-level and there is no deletion message
(`CONTRACTS.md` §7.2).

**live-mini-server runs 23** (`CONTRACTS.md` §8.3, "Merge on the live tier"). The two lists below
cover every tag in the file, each tag in exactly one, with named exceptions where a tag is split; a
suite asserts 23. In live vectors an observation's `source` is the one the bridge states
(`CONTRACTS.md` §8.3, "Attempt fields arrive already wrapped"), so `tcp` there is a forwarded on-site
envelope, not a live source; `provisional` and `confidence` arrive the same way, so a live adapter
feeds them resolved.

**Runs:** the `INV-1` vectors **except** the two built on scope snapshots
(`retraction-not-from-fragment`, `retraction-not-in-other-race-snapshot`); every `INV-3`,
`trichotomy`, `INV-4`, `INV-5`, `INV-6`, `under-review`, `phase-status-transition` and `live-ingest`
vector (plain resolved observations, presented as pushed and later-ingested wins); of the
`operator-write` vectors only the two no-echo
corrections (`operator-correction-not-displaced-by-redelivery`,
`operator-correction-displaced-by-changed-upstream-value`), since a `WriteRequest` exists on site
only; and the `standing-assembly` vectors **except** the three anomaly
ones (`standing-category-rank-disagreement-recorded`, `standing-order-disagreement-anomaly`,
`standing-cross-never-checked`), since the live tier assembles without steps 4 and 7 of
`CONTRACTS.md` §5. That is 2 + 2 + 1 + 1 + 1 + 1 + 1 + 1 + 6 + 2 + 5 = 23.

**Runs none tagged** `INV-2 rule 1`, `INV-2 rule 1 gates`, `INV-2 rule 2`, `INV-2 rule 2 exception`,
`INV-2 rule 3`, `INV-2b`, `INV-2c`, `INV-2d`, `INV-7`, `INV-7 guard`, `placement`, `provisional`,
`ongoing-recomputation`, `run-generation`, `attempt-status-transition`, `left-without-finish`,
`marks`, `half-correction`, `rebaseline`, `oncourse`, `standing-push`, `two-run`, `cross-outcome` or
`workflow-state`: those need the on-course stream and its inferences, connection events and content
age, scope snapshots, generation triggers or the checks store, none of which the live wire carries
(a generation change reaches live as explicit `not-yet`). `ARCHITECTURE.md` §3's "the same merge
invariants" means exactly this subset.

**`expect` is the presented state after the last given.**
- An envelope field left out of `expect` is not asserted. **That subset rule applies to a `known`
  envelope only:** `{ state: 'not-yet' }` and `{ state: 'unavailable', reason }` are matched whole,
  because an envelope in those states carries no other key (`CONTRACTS.md` §1.2, "Wire encoding"), so
  a presented `{ state: 'not-yet', value: … }` fails the expectation; that is what retraction (INV-7)
  exists to prevent. **The match is keyed on the presented envelope's `state`, not on the
  expectation's:** a presented `not-yet` or `unavailable` must equal the expectation exactly, and an
  expectation that states no `state` (`{ provisional: true }`) is met only by a `known` envelope.
  Inside a `known` envelope's `value`, an object matches as a subset too (a key left out is not
  asserted; arrays by length and order), with one obligation on the file: an expectation that states
  an `Outcome` `value` (`CONTRACTS.md` §2.6, a discriminated union) always states its `kind`, so a
  partial `{ kind: 'duration', totalSeconds }` is not met by another variant.
- Keys may be prefixed by an `attemptId` (`K1M_BR1_6:9.outcome`).
- `diagnostics` asserts the current diagnostics; a `stale-mark` is current only while the withheld
  mark is on the presented row.
- `writeRequest` asserts the write status.
- `notifications` asserts the number of client-visible messages, one per changed resource: a
  second-run Phase has a `phase` and a `pair` standing (`CONTRACTS.md` §5), so one serialised change
  there is two `standing.updated`; a creation message counts once however many snapshots preceded it.
  It is a map from message type (`CONTRACTS.md` §7.2 on
  site, §8.4 on live) to a count or to an object `{ count, afterGivenIndex?, attemptId?, scope?,
  fields? }`: `count` (required) is the number of messages of that type that match the filters;
  `afterGivenIndex` counts only messages of ingest units whose elements all follow that 0-based index
  (the `expectSequence` convention); `attemptId` restricts to messages for that Attempt; `scope`
  restricts `scope.replaced` to that scope; `fields` names keys the single matching message's `fields`
  must carry, each with the value `expect` states for it under `<field>` or `<attemptId>.<field>` for
  the message's Attempt (the object's `attemptId`, else `context.attemptId`), presence only where
  `expect` states none; other keys are not asserted. A type absent from the map is not asserted. A
  `notifications` expectation always counts §7.2 (on site) or §8.4 (live) messages, never a §8.3 push.
- `note`, wherever it appears, is commentary for the reader and is never asserted. Every assertion of
  a vector is in `expect`, `expectSequence` or `then`.

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

### Workflow-state vectors

`given` holds `checks`, `flags` and `presented` (per Attempt: the current `run` and the presented
`gates`, `null` where `Attempt.gates` is not `known`). A `then` step is a new `presented` state.
`expect` is `gateStatus`, a map of `attemptId:run:gate` to `flagged | verified | stale | plain`, plus
optionally the resulting `checks` (only the fields listed are asserted). **`gateStatus` is exact over
the presented gates:** its domain is every `attemptId:run:gate` of `presented` (after `then`), with
the presented `run`; a key in that domain left out of the map is asserted `plain` (`CONTRACTS.md`
§2.10: the display state is a lookup for every gate, `plain` where no flag and no check applies), a
listed key outside it is asserted as listed, and an unlisted key outside it (an earlier generation's
check, readable under its own `run`) is not asserted.

---

## 2. Coverage map

| Area | Vectors | Count |
|---|---|---|
| INV-1 (monotonic knowledge) | `inv1-untouched-field-not-regressed`, `inv1-never-observed-stays-not-yet` | 2 |
| INV-2 rule 1 (result row over inference) | `inv2-rule1-result-row-supersedes-inference`, `inv2-rule1-inference-never-supersedes-result-row` | 2 |
| INV-2 rule 2 (TCP continuity) | `inv2-rule2-connected-tcp-beats-later-xml`, `-xml-takes-over-after-disconnect`, `-reconnect-does-not-restore-stale-tcp`, `-fresh-tcp-after-reconnect-wins`, `-xml-alone-at-cold-start`; round 19: `-reconnect-redelivery-regains-precedence` | 6 |
| INV-2 rule 1, `gates` cell-wise | `gates-blank-result-cell-keeps-judged-oncourse-cell`, `gates-result-vector-authoritative-after-leaving` | 2 |
| INV-2 rule 2 exception (marks on silent paths) | `left-without-finish-then-mark-from-xml`, `xml-mark-does-not-override-tcp-finish` | 2 |
| `left-without-finish` | `left-without-finish-observed-not-dnf` | 1 |
| INV-7 (retraction) | `retraction-vanished-row-first-run`, `-dns-cleared-then-races`, `-start-list-mode-clears-all`, `-does-not-touch-inference`, `-second-run-time-empty-keeps-placement`, `-from-xml-row-cleared`, `-first-run-row-present-empty`; the guard: `retraction-xml-guard-rewrite-before-push` | 8 |
| INV-1 against retraction (omission is not absence) | `retraction-not-from-fragment`, `retraction-not-in-other-race-snapshot` | 2 |
| INV-2d (contradiction by the on-course stream; the lift) | `contradiction-oncourse-running-again`, `contradiction-lift-keeps-stale-rows-unpresented` | 2 |
| Marks over time; half-corrections | `status-overrides-time`, `half-correction-snapshot-duplicate-finish` | 2 |
| Re-baseline | `rebaseline-discards-stale-tcp-and-rebuilds-from-xml`, `rebaseline-keeps-writes-and-generation` | 2 |
| Live tier: explicit reset, bare values wrapped, deletion, on-course set and running state, classification rows | `live-explicit-not-yet-resets-field`, `live-bare-value-wrapped-as-bridge`, `live-attempt-deleted`, `live-oncourse-set-replaced-whole`, `live-running-then-finished-latest-wins`, `live-classification-rows-replaced-whole` | 6 |
| The on-course set and `oncourse.updated` | `oncourse-set-order-and-push`, `oncourse-finisher-stays-listed-until-closure`, `oncourse-unstaged-before-start-returns-to-not-started` | 3 |
| Placement known only when upstream ranks the row | `placement-not-yet-while-rank-empty` | 1 |
| No standing re-send on a running tick | `standing-not-resent-on-running-tick` | 1 |
| Workflow state (§2.10): what `stale` compares against (`null` vs `0`, team sums, `gates` not known), the re-run and re-bib interplay | `check-stale-definition`, `check-null-vs-zero-distinct`, `check-team-sum-compared`, `check-not-carried-to-new-generation`, `check-stays-with-bib-when-result-moves` | 5 |
| INV-2 rule 3 (single-source fields) | `inv2-rule3-single-source-field` | 1 |
| INV-2 rule 4 (operator writes) | the six `operator-write-*` and `operator-correction-*` vectors, including `superseded`, plus `operator-write-confirmed-then-changed-upstream` | 7 |
| INV-2b (surfaced, never adopted) | `inv2b-disagreement-surfaced-not-adopted` | 1 |
| INV-2c (content age across sources; the same source always supersedes) | `inv2c-snapshot-older-than-push-refused-during-outage`, `inv2c-same-source-earlier-finish-supersedes`, `inv2c-first-read-unknown-age-refused` | 3 |
| INV-3 and the trichotomy | `trichotomy-known-zero-not-confused-with-absence`, `trichotomy-unavailable-persists-explicitly`, `inv3-not-applicable-external-id` | 3 |
| INV-4, INV-5, INV-6 | one each | 3 |
| `provisional` in both upstream modes; pair fields; `status` | `provisional-incomplete-judging-then-settles`, `-first-push-already-complete`, `-run-closed-without-course`, `-pair-fields-while-run-2-on-course`, `status-never-provisional` | 5 |
| Ongoing recomputation before the result push | `ongoing-recomputation-provisional-total-revised-by-late-gate` | 1 |
| Run generation (re-run) | `rerun-retracts-run-scoped-fields`, `rerun-old-generation-row-not-presented`, `rerun-tcp-row-before-new-finish-not-presented`, `rerun-status-transition-legal-only-with-generation`, `rerun-stale-mark-not-presented`; round 19: `rerun-trigger-new-start-after-recorded-finish`, `start-correction-mid-run-keeps-generation`, `start-correction-after-finish-row-first`, `start-correction-after-finish-listing-first`, `start-correction-after-cleared-mark-keeps-generation` | 10 |
| Marks and review; untimed rows | `under-review-independent-of-provisional`, `second-run-dns-keeps-combined-placement`, `attemptstatus-finished-to-dsq-post-finish`, `untimed-row-outcome-not-applicable` | 4 |
| Two-run | `two-run-br1-untouched-by-br2`, `-recovered-from-xml-cold`, `-unavailable-no-live-no-xml` | 3 |
| Kayak Cross | `cross-outcome-not-yet-before-operator-entry`, `-from-placement-not-time`, `-corrected-after-next-heat-started` | 3 |
| Phase status transition | `phasestatus-official-to-revised-skips-unofficial` | 1 |
| Standing assembly (§5) | relayed order and single-run tie; combined tie with no anomaly; unplaced entries; age-category assembly; category-rank disagreement; order disagreement; Cross never checked; behind and flags | 8 |

---

## 3. What these vectors do not cover

- **Derivation from raw wire fields.** The second-run outcome (time plus the sum of run 2's own cells, never
  the row's `Pen`/`Total`), gate-string parsing, units, sentinels, the fabricated-course
  signatures and generation triggers are all Tier 2's job, against real recordings.
  `DERIVATIONS.md` §4 is the specification.
- **Timing.** These vectors say nothing about speed. The measured push latency is evidence for the
  design, not a tier-1 assertion.
- **Multi-organiser isolation** (`CONTRACTS.md` §8.1). That is a storage property, verified by
  live-mini-server's own store tests (`TEST-ARCHITECTURE.md` §3.5).
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
5. **Scope snapshots needed their own `given` shape** (round 2). A retraction is a statement about a
   whole race, not about one field, so a per-field observation could not express "this row is
   absent". The `snapshot` element is that shape; its `mode` is what makes start-list mode
   expressible.
6. **The XML write-time guard needed the poll interval in `context`** (`xmlPollIntervalSeconds`),
   because the guard is defined in terms of it.
7. **Workflow state needed a third shape** (round 3). Its rules are functions over stored checks and
   the presented state, not over observations. Only those rules are vectors; durability and the flag
   lifecycle are store tests (`TEST-ARCHITECTURE.md` §3.5).
8. **INV-2c needed content age, not event times** (round 8). An event-time floor could not express a
   finish legitimately moved earlier. The rewrite event and the poll interval of decision 6 now carry
   INV-2c too, with a stated default for the interval.
9. **TCP rows carry no `finishTime`; every vector names its Attempt** (round 9, spike S1-1/2/4). A
   vector that gave a TCP row a finish time was testing a rule the wire cannot satisfy; the match is by
   run time. An implicit Attempt per vector made one vector ambiguous.
10. **Notification counts are per resource** (round 10, S1-26/27). Two vectors miscounted: one forgot
    that a second-run Phase has two standings, one counted a leave for an Attempt it had never listed.
    The rule is stated above; the vectors were fixed, not the merge.
11. **No TCP row carries a finish on input** (round 12, opponent review). Fourteen vectors gave a TCP
    result-row observation or snapshot row an `eventTime`/`finishTime`, and the one meant to catch a
    stale mark in a re-run could only pass with it. They now supply the finish as an on-course inference
    where they need it, and `rerun-stale-mark-not-presented` delivers the stale row before the finish,
    the usual order, which is where the spike's core presented the stale DNF.
12. **`afterGivenIndex` indexes `given` only.** A `then` step cannot be asserted mid-way; a vector that
    needs an intermediate assertion after a `then` element moves that element into `given`. One vector
    had an out-of-range index and was silently never evaluated (R4b).
13. **No per-member envelope** (round 17, server#240). Two vectors asserted `unavailable{not-applicable}`
    at `members[0].externalId`; `members` is the wrapped unit and a member's `externalId` is `null`
    (`CONTRACTS.md` §2.5), so no deployable serves that path. They now assert the `null` inside
    `members`' value; what they assert is unchanged, and no vector uses a path.
14. **A classification snapshot carries `ClassificationRow`s** (round 17, server#243). The checker could
    not tell which row shape property 15 reads; it is `CONTRACTS.md` §8.3's flat row, `decidedIn` being
    upstream's round token or `null`. `live-classification-rows-replaced-whole` wrote `XF`/`XS` for it and
    now writes `F`/`SF`; whole replacement and relay, which it asserts, are unchanged.
15. **Content age is carried by the rewrite event, not computed from the interval** (round 18,
    server#202 review). Detection minus the interval dated a first read after `setPath` as fresh
    whatever the file's age, and a delayed poll's read as earlier than it could be; `changedAfter`
    states what the reader knows, `null` included. Decision 6's interval stays as the reading of an
    event written without the key, so every existing vector asserts what it did.
16. **The generation trigger is a listing, and a changed start is not always one** (round 19,
    server#203 sweep). Seven start changes in the recordings, one re-run: a vector that states
    `run: 2` through a `run` observation tests what follows a generation change, not what makes
    one, and no vector listed a changed start. The owed vectors give the trigger and the four
    correction shapes as listings (94/88 → 100/94 with the reconnect re-delivery); the `run`
    observation stays as the shorthand §1 defines.
