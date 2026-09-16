# Derivations — From Source to Contract

`CONTRACTS.md` §6 says *whether* a value is derivable. This document says *how* — the actual
transformation, precisely enough to implement without re-reading `DOMAIN-FACTS.md`, and precise
enough that writing it down could show a claimed derivation does not actually work. Two of them did
not, on inspection, and are fixed here and in `ARCHITECTURE.md` rather than left standing. Every
derivation below is stated the same four ways, because a reader needs all four to implement any of
them without guessing:

1. **The source expression** — which upstream field, which interface, the exact transformation.
2. **Its conditionality** — what must hold for the derivation to run at all.
3. **The resulting envelope** — `source`, `confidence`, whether `eventTime` is present, what sets
   `provisional`.
4. **The failure mode** — what the value becomes when the derivation cannot run.

Covers what `CONTRACTS.md` asserts, not every field Canoe123 emits — the same discipline as
everywhere else in this engagement.

---

## 0. Notation

- `OnCourse.<field>` / `Results.<field>` — a field on the TCP push message of that type, for a given
  `(RaceId, Bib)`.
- `CIS.GetResult(<RaceId>, <Bib>).<field>` — a field on a CIS `GetResult` response, explicit about
  which RaceId was queried, since (§5.5 below) this matters and was not obvious in advance.
- `«phaseId, bib»` — the Attempt this derivation targets, per `CONTRACTS.md` §2.6.
- `→ known/not-yet/unavailable` — the resulting `Observed<T>` state (§1.2).

---

## 1. Category

**`categoryId`, `code`.** Source: `OnCourse.RaceId` or `Results.RaceId`, the class-identifying prefix
before the phase marker (`K1M_ST` from `K1M_ST_BR2_6`) — `code` is that substring, unmodified;
`categoryId` is the same string, scoped by `eventId` per `CONTRACTS.md` §8.1's compound-key
requirement. Conditionality: none — present on every message. Envelope: `source: 'tcp'`,
`confidence: 'authoritative'`, no `eventTime` (a class identifier has no event time). Failure mode:
none — this is structural parsing, not a fact that can be absent once any message for the category
has arrived; before that, `not-yet`.

**`discipline`.** Source: the *set* of `roundKind` values (§2 below) observed under this
`categoryId` — `'cross'` if any is one of `XT/X4/XS/XF/XER`, `'slalom'` otherwise. Conditionality:
at least one Phase must have been observed. Envelope: `source: 'tcp'`, `confidence: 'inferred'`
(derived from a set of observations, not asserted directly by any single field) — this is the one
Category-level field that is `inferred` rather than `authoritative`, worth stating since nothing
upstream ever says "this is a Cross category" in one place; it is read off the phase structure.
Failure mode: `not-yet` until the first Phase is known.

---

## 2. Phase

**`phaseId`.** = `RaceId` verbatim. No transformation. Always `authoritative`, `source: 'tcp'`.

**`roundKind`.** Source: `Schedule.DisId` or the phase-marker substring of `RaceId`
(`_BR1_`/`_BR2_`/`_QUA_`/`_SEM_`/`_FIN_`/`_XT_`/`_X4_`/`_XS_`/`_XF_`/`_XER_`, `DOMAIN-FACTS.md` §6) —
prefer `Schedule.DisId` when a `Schedule` message has been seen (it is the field actually named for
this purpose); fall back to the `RaceId` substring before the first `Schedule` push arrives, since
`RaceId` is present on every message and `Schedule` pushes only every ~40 s (`DOMAIN-FACTS.md` §3). A
token outside the ten known values is carried through unrecognised rather than rejected
(`CONTRACTS.md` §2.4). Envelope: `source: 'tcp'`, `confidence: 'authoritative'` either way — both
are Canoe123's own direct statement, never inferred by us. Failure mode: none once any message for
the Phase has arrived.

**`date`.** Source: `Schedule.StartTime`'s date component if a `Schedule` push has been seen for this
`RaceId`; otherwise the date of the *first observation of any kind* for this `RaceId` (its `Phase`'s
own creation moment). Conditionality: assigned once, on first observation — `CONTRACTS.md` §2.4's
immutability requirement means this derivation runs exactly once per Phase and is never re-evaluated,
which must be enforced explicitly (a naive "recompute from the latest Schedule" implementation would
violate it the first time a correction landed days later, § maintainer answer A7). Envelope:
`source: 'tcp'`, `confidence: 'authoritative'` if from `Schedule`, `'inferred'` if from first-
observation fallback (we are inferring the date from when *we* saw it, not from Canoe123 asserting
one). Failure mode: none — a Phase cannot exist in domain state without having been observed once.

**`status`.** Source: `RaceConfig.RaceStatus` (`c123-protocol.md`'s status push) or `Schedule`'s own
status field, mapped through the closed table already given in `CONTRACTS.md` §3.1. Conditionality:
none for the mapping itself, but see the finding below. Envelope: `source: 'tcp'`,
`confidence: 'authoritative'` — Canoe123's own status is always asserted, never inferred, even though
what it means is sometimes stale relative to reality.

> **Finding, not a new fact but worth restating precisely here: `status` reliably reports Canoe123's
> own field, and unreliably reports whether a correction happened underneath it.** `CONTRACTS.md`
> §3.1 already states this (decompiled-source-verified: `RaceStatus` is operator-set only, never
> touched by `PenaltyCorrection`) — repeated here only because a derivation document is where an
> implementer would otherwise reasonably assume "the source field name says `RaceStatus`, so reading
> it is the whole derivation," which is true of the *value* and false of what a reader might expect
> it to *mean*.

**`multiRun`, `scoringKind`.** Structural, from `roundKind`: `multiRun = roundKind ∈ {BR1, BR2}`;
`scoringKind = 'ordinal'` if `roundKind ∈ {X4, XS, XF}` (Cross's ordinal-scored phases; `XT`, a time
trial, is `'duration'` despite being a Cross round — checked directly, `DOMAIN-FACTS.md` §8's own
table lists `Time` as an ordinal only for "X4/XS/XF", not `XT`), else `'duration'`. No upstream
message states either field directly; both are computed once, deterministically, from `roundKind`
already resolved above. `confidence: 'authoritative'` regardless — this is exact, total logic, not a
guess, so the `inferred` label (reserved for evidence-not-assertion, `CONTRACTS.md` §1.2) does not
apply to a lookup table with no uncertainty in it.

---

## 3. Entry

**`entryId`.** On-site: Canoe123's `Id` field (`ICFcode.ClassId`), used directly as the opaque
contract identifier (`CONTRACTS.md` §1.1's on-site exception). Stable across BR1/BR2 — confirmed
against a matched pair in the protocol docs; stable across QUA/SEM/FIN — inferred from field
composition and the analogous Cross elimination chain, not directly confirmed, carried forward from
round one as a stated residual risk (`CONTRACTS.md` §2.5).

**`bib`, `name`.** Source: `OnCourse.Bib`/`Results.Bib` and the embedded athlete name field on either
message. Envelope: `source: 'tcp'`, `confidence: 'authoritative'`. Failure mode: `not-yet` before any
message names this competitor.

---

## 4. Attempt

The substantial section — every named risk area concentrates here.

### 4.1 `status` — slalom finish detection

**Source expression.** Track `dtFinish` (`OnCourse.dtFinish`) as internal per-`«phaseId,bib»` state
— **not itself a contract field** (`CONTRACTS.md` §1.2 lists it only as an `eventTime` source, never
as its own `Attempt` field) — because the transition, not the value, is the signal: on the first
`OnCourse` message where `dtFinish` is non-empty and the domain layer's own retained record of the
previous value for this `«phaseId,bib»` was empty, `status → 'finished'`, `eventTime = dtFinish`. This
requires the domain layer to retain the last-seen `dtFinish` per Attempt as implementation state for
as long as the Attempt is being tracked — stated explicitly because nothing in `CONTRACTS.md`'s
public shape carries `dtFinish`, and an implementer reading only the contract could reasonably not
realise this bookkeeping is required at all.

Two lower-confidence fallbacks, used only while `dtFinish` has not yet been observed non-empty:
`OnCourse.Time` changing from a whole-second to a decimal format (`confidence: inferred`); the
downstream `HighlightBib` signal (`confidence: inferred`, and CLI-only, so absent unless that channel
is wired up). Neither ever overrides a `dtFinish`-sourced transition once one exists.

**Conditionality.** None beyond an `OnCourse` message for this `«phaseId,bib»` existing at all.

**Envelope.** `source: 'tcp'`. `confidence: 'authoritative'` for the `dtFinish` signal (Canoe123's own
direct assertion of the moment), `'inferred'` for either fallback. `eventTime` present and equal to
the parsed `dtFinish` timestamp when that signal fired it; absent for the two fallbacks, which have no
better event time than their own `observedAt`. `provisional`: `false` — the fact *that* the competitor
finished is not provisional even while their *outcome* still is (§4.3) — these are different fields
with different confidence trajectories, and conflating them was a risk worth naming explicitly even
though it did not turn out to be a bug: `status` and `outcome` must be allowed to settle at different
times, and nothing in the contract forces them together.

**Failure mode.** `not-yet` before the first transition; `dns`/`dnf`/`dsq`/`cap` sourced from
`RemoveFromCourse.Reason` instead, same envelope treatment, no finish-detection derivation involved.

### 4.2 `status` — Kayak Cross

No transformation to derive from OnCourse at all — confirmed empirically against a real recorded
Cross heat: `chStart`, `chFinish`, `dtStart`, `dtFinish`, `Completed` never transition per-competitor
for Cross. **Source expression:** `Results.Rank`/`Results.Time` becoming non-empty for this
`«phaseId,bib»`. This is not a signal the domain layer interprets — it is a direct operator assertion
(§4.5 below), and `status → 'finished'` the instant it is observed, pushed with no debounce
(`ARCHITECTURE.md` §6.D). Envelope: `source: 'operator-assertion'`, `confidence: 'authoritative'`, no
`eventTime` (Cross has none to give), `provisional: false` — an operator's own call is not awaiting
further confirmation the way a mechanical inference is. Failure mode: `not-yet` for the entire heat
until the operator enters it; a heat can legitimately show several Attempts `not-yet` and one
`finished` simultaneously (`CONTRACTS.md` §2.6 already establishes this is not a bug).

### 4.3 `outcome` — slalom, single run, on-course phase

**This is where a genuine defect was found — not designed around, fixed.**

The derivation as first stated in `ARCHITECTURE.md` §6.A — compute `totalSeconds` mechanically from
`OnCourse.Time` plus the gate penalties visible in `OnCourse.Gates`, evaluated at the exact message
where `dtFinish` transitions — **is unsafe as a one-shot computation.** Checked against real recorded
finishes, not assumed: in two full-day recordings, roughly 9–10% of finishes still had blank gate
slots — trailing *and interior* ones, not only trailing — at the exact `dtFinish`-transition message,
resolving on later `OnCourse` messages up to several seconds afterward. In two traced cases the
`Pen`/`Total` Canoe123 itself later reported changed materially after `dtFinish` had already fired —
one by 2 penalty points, one by 50. The four-second OnCourse/Results overlap `DOMAIN-FACTS.md` §5
documents exists, mechanically, because gate judging can still be catching up during exactly that
window — the finding gives the four-second number a cause, not only a duration.

**Corrected source expression.** `outcome` is not computed once at the `dtFinish` transition; it is
computed at the transition **and recomputed on every subsequent `OnCourse` message for the same
`«phaseId,bib»`** — `runSeconds = OnCourse.Time`, `penaltySeconds = Σ(parseGates(OnCourse.Gates))`
(§4.6's algorithm), `totalSeconds = runSeconds + penaltySeconds` — until either the Attempt's own
gate count is fully populated (no blank slots remain) or a `Results` row for this `RaceId` arrives
and supersedes it via §4.4's mechanism. **This requires the domain layer to keep tracking a
`«phaseId,bib»` for `OnCourse` updates after `status` has already become `'finished'`** — a tracking
lifetime distinct from, and longer than, whether that Attempt still appears in `GET /api/oncourse`
(`CONTRACTS.md` §7.1 filters that list by `status == 'on-course'`, correctly excluding a finished
Attempt immediately; the *internal* tracking window that feeds `outcome`'s recomputation is a
separate, longer-lived concern the contract's public shape does not need to expose, but an
implementation must not conflate the two, since conflating them is exactly how this defect would
otherwise ship silently).

**Conditionality.** Requires `OnCourse` messages to keep arriving for this `«phaseId,bib»` during the
overlap window — true by construction, since Canoe123 keeps it in `OnCourse` for exactly this reason.

**Envelope.** `source: 'tcp'`, `confidence: 'inferred'` throughout this phase (we are computing, not
reading an asserted total), `provisional: true` — genuinely provisional in the literal sense now,
not only formally: the value can and does change while provisional, which is the corrected behaviour
this section exists to specify. Once `Results` (§4.4) or CIS confirms, the newer, authoritative
observation supersedes per `CONTRACTS.md` §4's ordinary same-field precedence rules — no special case
needed there; the fix is entirely in not treating the `dtFinish` instant as a completion signal for
gate judging, which it is not.

**Failure mode.** `not-yet` before `dtFinish`; never `unavailable` — some estimate is always available
once finished, per the maintainer's own stance against withholding a value that can be shown, aging,
rather than shown as absent (§ maintainer answer A1).

### 4.4 `outcome` — slalom, `Results`-row-sourced (single run, or the better run of a pair)

**Source expression.** `Results.Time`, `Results.Pen`, `Results.Total` read directly — no
recomputation, since these are Canoe123's own asserted figures, not evidence to reconstruct from.
`runSeconds = Results.Time` (or, for the pair case below, whichever run this row's `Time` actually
describes), `penaltySeconds = Results.Pen`, `totalSeconds = Results.Total`. A same-source,
later-`observedAt` observation naturally supersedes §4.3's inferred value with no CIS required —
this is the mechanism `ARCHITECTURE.md` §6.A's "without CIS configured, `tcp` corrects itself"
already described; this document states precisely which fields feed it.

**Conditionality.** A `Results` row for this `RaceId` must have arrived — up to the ~30 s rotation
period after finishing (`DOMAIN-FACTS.md` §3).

**Envelope.** `source: 'tcp'`, `confidence: 'authoritative'` — this is the one slalom `outcome`
derivation that reads an asserted figure rather than reconstructing one. `provisional`: `false` once
CIS is not configured for this deployment (nothing more authoritative will ever report — `CONTRACTS.md`
§1.2's `provisional` definition applies exactly as written); `true` if CIS is configured and has not
yet reported, per the `§4` ranking table.

**Failure mode.** Falls back to §4.3's inferred value while no `Results` row has arrived yet; never
`unavailable` for a single-run or better-run outcome.

### 4.5 `outcome` — the superseded run of a two-run pair

The case `DOMAIN-FACTS.md` §4 names directly: once BR2 completes, `Results.Time`/`Results.Gates`
always describe run 2, and `Results.Pen`/`Results.Total`/`Results.Rank` describe whichever run is
better — **never both, on this one row.** Two independent recovery paths, precisely:

**(a) The superseded run's own live-observed data, cached.** Because BR1 and BR2 are separate
`RaceId`s, BR1 had its *own* `Results` row, sourced via §4.4 exactly as any single-run Attempt is,
*while BR1 was itself the active phase*. Nothing about BR2 starting erases that observation —
monotonic knowledge (`CONTRACTS.md` §4 INV-1) means it is retained, gates included, for as long as
this server instance has been running since BR1 finished. **Conditionality: this server was observing
live during BR1.** Envelope: unchanged from whatever §4.3/§4.4 already assigned it at the time —
`source`/`confidence`/`provisional` do not change just because a sibling Phase later completed.
**Failure mode: `unavailable{reason: 'not-observed-live-and-cis-unavailable'}`** if this server was
not running during BR1 *and* CIS is not configured for this deployment — the one case truly requiring
external help. **The precise trigger for this determination, made explicit here because writing a
conformance vector for it exposed that it had not been stated:** this is `unavailable`, not `not-yet`,
only once the domain layer can conclude the fact *should* exist and cannot be supplied — concretely,
once BR2's own outcome has itself been observed (BR2 cannot exist without BR1 having already run) and
neither a cached BR1 record nor a reachable CIS can supply it. Before BR2 has been observed at all,
the correct state is still `not-yet` — the domain layer cannot yet distinguish "BR1 hasn't happened"
from "BR1 happened but wasn't cached," and INV-1 requires it not to guess. `not-yet` and this
`unavailable` case would otherwise look like the same absence from a distance; they are not, and the
distinguishing condition is BR2's own arrival.

**(b) CIS, queried against the superseded run's own `RaceId` specifically — checked, not assumed.**
`CIS.GetResult(<BR1's RaceId>, bib)` remains fully and correctly queryable **indefinitely** after BR2
completes — confirmed against a real two-run recording where the identical query, repeated hours
after BR2 had already finished and been queried hundreds of times itself, returned byte-identical
`StartDayTime`/`FinishDayTime`/`GateTimes`/`Total1` to its very first response. There is no
"current race only" restriction to design around; this had been an open assumption and is now
settled. The response gives `runSeconds`/`penaltySeconds` directly from its own `Time1`(or `Time2`,
matching whichever run's `RaceId` was queried)/`Pen1` fields, and gate detail from **`Gates`**
specifically — a sparse `gateNumber=penalty` list (`"3=2;16=2"`), confirmed as its own field, distinct
from `GateTimes` (passage timestamps, not judgments) — parsed per §4.6(c) below. Conditionality: CIS
configured and reachable, and "Init Event to CIS" performed that morning (`DOMAIN-FACTS.md` §2).
Envelope: `source: 'cis'`, `confidence: 'authoritative'`, `eventTime` present (`FinishDayTime`,
confirmed a real field carrying the run's own finish moment), `provisional: false` — this is the
top-ranked source for this field category with nothing above it to await. Failure mode:
`unavailable{reason: 'not-configured'}` or `'source-unreachable'` per `CONTRACTS.md` §2.8's
`SourceStatus`.

**Path (a) and (b) are independent, not sequential** — if both are available, `CONTRACTS.md` §4's
ranking table already governs which is presented (`cis` outranks `tcp`'s cached value once CIS has
actually reported this fact — path (a)'s cached value remains retained, per-source, and available to
surface again if CIS ever disconnects, per INV-2b).

### 4.6 Gate parsing — three encodings, one contract shape

`CONTRACTS.md` §2.6 already commits to `gates` being position-correct by construction; this is the
algorithm that makes that true, replacing `EVIDENCE.md` Exhibit 2's two independently-wrong parsers
with one, specified once:

**(a) `OnCourse.Gates`** — comma-separated, dense, one token per gate in order:
`"0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,"`. Split on `,`; token at index `i` (0-based) is gate `i+1`;
`""` → `null`, otherwise parse as integer. No special casing — the dense, ordered structure means
position is never ambiguous.

**(b) `Results.Gates`** — fixed-width, dense, space-padded: `DOMAIN-FACTS.md` gives "typically 25
gates × 3 chars" as an approximation, not a constant to hard-code. **The robust derivation:** the
domain layer already knows this course's gate count from `RaceConfig`/`Schedule` by the time a
`Results` row needs parsing; compute `width = len(Results.Gates) / gateCount` (must divide evenly —
if it does not, that is a parse anomaly worth surfacing as a diagnostic, not silently guessing) and
chunk the string into exactly `gateCount` fixed-width slices, **never split on whitespace** — chunk
`i` (0-based) is gate `i+1`; each chunk trimmed and parsed, blank → `null`. This is the literal fix
for Exhibit 2's bug: splitting on whitespace collapses consecutive blanks and shifts every position
after them; fixed-width chunking cannot, by construction, regardless of how many leading or interior
gates are unjudged.

**(c) `CIS.GetResult(...).Gates`** — sparse, `gateNumber=penalty` pairs, semicolon-separated:
`"3=2;16=2"`. Split on `;`, each token splits on `=` into `(gateNumber, penalty)`; every gate number
in `[1, gateCount]` **not** mentioned defaults to `0` (clean) — correct specifically because CIS is
only ever consulted for a run already known complete (§4.5), so "not mentioned" cannot mean
"not yet judged" the way a blank does in (a)/(b); that reading is only valid post-completion and this
derivation is only ever invoked post-completion. A gate number outside `[1, gateCount]` is a parse
anomaly, surfaced the same way as (b)'s width mismatch.

All three produce the same contract shape, `Gate[] = {number, penalty}[]`, `penalty: 0 | 2 | 50 |
null` — the encoding a client sees is always (c)'s dense equivalent regardless of which of the three
encodings produced it; which one is recorded only in the field's own `source`.

### 4.7 `outcome` — Kayak Cross

**Source expression.** `outcome.value = { kind: 'ordinal', order: <derived from Results.Rank> }` the
instant `Results.Rank`/`Results.Time` populate for this bib (§4.2). `Results.Time` itself is not the
order — `DOMAIN-FACTS.md` §8 states it directly: `Time` in `X4`/`XS`/`XF` carries finish order encoded
as `1000`/`2000`/`3000`/`4000`, not a duration — `order = Results.Time / 1000`. **Conditionality:**
none beyond the operator having entered it; this is an assertion, not a computation with a failure
mode of its own. **Envelope:** `source: 'operator-assertion'`, `confidence: 'authoritative'`, no
`eventTime`, `provisional: false` — same reasoning as §4.2, restated because `outcome` and `status`
are different fields that happen to be asserted by the identical signal here, which is worth being
explicit is a coincidence of Cross specifically, not a general rule linking the two fields.

### 4.8 `upstreamRank`

**Source expression.** `Results.Rank` (`source: 'tcp'`) or `CIS.GetResult(...).Rank` if present in
that response (`source: 'cis'`) — `CONTRACTS.md` §4's ranking table already governs precedence
between the two when both report; this document adds only the field mapping, since the precedence
mechanism itself needed no new logic beyond what §4 already specifies generally. **Conditionality:**
a `Results` row (or CIS response) carrying a non-empty `Rank`. **Envelope:** `confidence:
'authoritative'` always — a rank is asserted, never inferred, by either source. **Failure mode:**
`not-yet` before any source reports a rank for this Attempt — legitimate and common before a category
has enough finishers to rank meaningfully.

### 4.9 `entry` (the mutable pointer)

**Source expression.** Initial binding: `Bib` on the first `OnCourse`/`Results` message for this
`«phaseId,bib»`, resolved to an `entryId` via §3's derivation. **Correction:** the maintainer's
answer (§ maintainer answer A7) establishes this can be reasserted after the fact — the derivation for
a correction is not upstream-automatic (no Canoe123 field flags "this bib was reassigned"); it is an
operator or organiser action entered directly (`CONTRACTS.md` §8.5's direct-correction path), always
`source: 'operator-write'`, never inferred from wire data, because nothing in Canoe123's wire format
asserts this fact at all — it is a human noticing a discrepancy against a paper record, which is
exactly why `CONTRACTS.md` §2.6 modelled this pointer as `Observed` rather than a fixed key in the
first place.

---

## 5. `SourceStatus`

**Source expression.** Not a value read from any single upstream field — a state machine over
connection events on each transport: `tcp`/`xml` are `'connected'` while the respective socket/file
watch is open and has delivered a message within a stated liveness window,
`'reconnecting'` while a reconnect attempt is in flight, `'unreachable'` after a stated number of
failed attempts. `cis` additionally has `'not-configured'` when no CIS endpoint is set for this
deployment at all, distinct from `'unreachable'` (configured, but not currently answering) —
`CONTRACTS.md` §2.8 already names both states; this is the derivation that produces them.
**Conditionality:** none — always computable, since it describes our own connections, not upstream
content. **Envelope:** not `Observed`-wrapped at all (`CONTRACTS.md` §2.8 states this explicitly) —
it is diagnostic connectivity state, not a domain fact with provenance of its own.

---

## 6. `WriteRequest` — the echo-matching derivation

**Source expression.** `submittedAt`/`requestedValue` set at submission (`CONTRACTS.md` §7.3).
`status → 'confirmed'` when a subsequent `OnCourse`/`Results` observation of the *same target field*
(the same `«phaseId,bib»`, the same gate or status) arrives with a value equal to `requestedValue`;
`→ 'mismatched'` when one arrives unequal. **This is a field-level comparison, not a whole-message
one** — worth stating precisely, since a `Results` row touching this bib for an unrelated reason
(a rotation refresh with no actual change) must not be mistaken for an echo of a *different* field's
write. **Conditionality:** the write must actually reach Canoe123's terminal channel — no derivation
runs before that; `pending` persists until the specific field it targeted next reports, however long
that takes (`DECISIONS/ADR-010`, no timeout). **Envelope:** the confirmed/mismatched value itself
follows the ordinary field derivation (§4.3/§4.4/§4.6) once observed — `WriteRequest` only tracks
*whether* a subsequent observation matched, not a second copy of the value's own provenance.

---

## 7. What could not be derived at all

Consistent with `CONTRACTS.md` §6, restated here only where the *mechanism*, not merely the
possibility, needed settling:

- **Event spanning multiple days** — confirmed again here: no derivation exists because no upstream
  field encodes it; §2's `date` derivation deliberately does not attempt to infer a multi-day
  grouping, only a single Phase's own date.
- **Run-1 detail, never observed live, CIS absent** — the one case in §4.5 with no recovery path at
  all. Everything else this document set out to derive, it derived.

---

## 8. Findings — where writing this down forced a change

1. **§4.3's mechanical on-course total computation was unsafe as a one-shot derivation.** Checked
   against real recordings, not assumed correct: gate judging can still be in flight — for ~9–10% of
   real finishes across two full-day recordings, on interior gates as well as trailing ones — at the
   exact instant `dtFinish` transitions, with the eventual `Pen`/`Total` changing by as much as 50
   points afterward. Fixed by making the computation ongoing (recomputed on every subsequent
   `OnCourse` message) rather than a single evaluation at the transition, and by requiring the domain
   layer to keep tracking a finished Attempt for `OnCourse` updates independently of whether it still
   appears in the public "on course" resource. `ARCHITECTURE.md` §6.A's wording ("computes
   `totalSeconds`... the moment `dtFinish` transitions") is corrected to match, below.
2. **CIS's queryability against a superseded run's own RaceId, and its explicit per-gate penalty
   field, were both assumptions rather than confirmed facts before this pass.** Checked, not assumed:
   both hold, cleanly and without qualification — `CONTRACTS.md` §6's `[D]`/`[A]` marks for this row
   stand as written, now with a demonstrated mechanism behind the claim rather than an inference from
   documentation alone.
3. **`Results.Gates`'s fixed width was documented only as "typically 3 chars," never confirmed as a
   constant.** The derivation in §4.6(b) is written to derive the width from the known gate count
   rather than hard-coding a number that the dossier itself only offers as an approximation —
   avoiding a latent bug rather than one already found.
4. **§4.5(a)'s `unavailable` failure mode had no stated trigger, found while writing a conformance
   vector for it, not while writing this document the first time.** `not-yet` (never observed) and
   `unavailable` (observed to be absent) look identical from outside until the exact condition that
   separates them is named: BR1's detail is `unavailable` only once BR2's own arrival lets the domain
   layer conclude it *should* exist, never before. Added to §4.5(a) above. `docs/arch/vectors/
   tier1-conformance.json`'s `two-run-br1-unavailable-no-cache-no-cis` is the vector that found this.

No value marked `[D]` or `[A]` in `CONTRACTS.md` §6 turned out to be undeliverable; the findings above
are corrections to *how* and *when*, not reversals of *whether*.
