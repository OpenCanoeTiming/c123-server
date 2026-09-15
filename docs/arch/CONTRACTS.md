# Contracts — c123 Ecosystem

The primary deliverable. Everything in `ARCHITECTURE.md` and `DECISIONS/` exists to justify and
explain what is stated here. Every clause is written to be testable before any implementation
exists: if a clause cannot be turned into a failing test, it has been sharpened or cut.

Vocabulary comes from canoe slalom and Kayak Cross, not from Canoe123's wire format. Where a value
is shaped the way it is because of what Canoe123 happens to emit, that is stated explicitly as a
derivability note, not left implicit.

---

## 0. How to read this document

Each entity section states: identity, fields with their derivability, invariants that hold for
that entity, and legal state transitions where relevant. §1 defines vocabulary used everywhere
else — read it first. §7 and §8 are the two wire contracts (on-site, live); everything before them
is the domain model both are built from. §6 is the standalone costed list the brief asks for: what
depending on CIS buys, and what nothing today can buy.

Derivability tags, used throughout:

- **[D]** Derivable — stated with its source.
- **[A]** Derivable only approximately — the approximation is part of the value's own semantics,
  carried in its envelope, never a silent implementation guess.
- **[N]** Not derivable from any source available today — collected in §6.

---

## 1. Conventions

### 1.1 Identity and its provenance

Every entity below has an identity field. Two rules apply to all of them:

**On-site, identity may be Canoe123-derived.** Canoe123 is the sole on-site upstream by fixed
topology (`CONSTRAINTS.md` §1.1); nothing is lost by letting on-site identity lean on it.

**In the live/ingest contract, identity is opaque and provenance-neutral.** A field like `entryId`
or `eventId` is a stable string the contract can key on; the contract does not know or care whether
it was minted by the on-site bridge (true today) or issued by a future central registry (true
later, if one is built). See `DECISIONS/ADR-006-identity-provenance-invariance.md` for the full
argument and its cost. This document states the resulting rule wherever it bites: never derive a
live-contract identity field's *meaning* from how it was produced.

### 1.2 The observation envelope

This is the answer to §5.3 of the brief: what a value asserts, and as of when. Every value in this
contract that comes from the outside world — as opposed to a structural field like an entity's own
id — is wrapped:

```ts
type Observed<T> =
  | { state: 'known'; value: T; observedAt: Timestamp; eventTime?: Timestamp;
      source: SourceTag; confidence: 'authoritative' | 'inferred'; provisional: boolean }
  | { state: 'not-yet' }
  | { state: 'unavailable'; reason: string }

type SourceTag = 'tcp' | 'cis' | 'xml' | 'operator-write' | 'operator-assertion'
type Timestamp = string   // ISO-8601, always a wall clock, never "ms since start"
```

A field's envelope, as delivered to a client, holds the single value the domain layer currently
*presents* for it — chosen by the precedence rule in §4, which weighs source authority as well as
recency. It is not simply whichever observation arrived last; §4 states exactly why not.

Field meanings, precisely:

- **`observedAt`** — when *our own ingest boundary* captured this observation. Captured the moment
  a TCP/UDP/CIS/XML message is received and parsed, never at outbound serialisation. This is the
  direct fix for `EVIDENCE.md` Exhibit 1: today's `timestamp` is minted when a message is built for
  a client, which answers a question nobody asks. `observedAt` answers "as of when do we believe
  this."
- **`eventTime`** — present only when Canoe123 gives a real event timestamp for this fact:
  `dtStart`, `dtFinish`, or an operator-assertion timestamp (Kayak Cross heat order, §2.6). Absent
  for everything else — an on-course time-of-day snapshot, for instance, has no better event time
  than its `observedAt`, and the contract says so by omission rather than faking one.
- **`source`** — which upstream channel produced this specific observation. Not decoration: it is
  what lets a consumer (or an operator, or a test) ask "would this be different with CIS
  connected," without needing to know anything else about how the value was produced.
- **`confidence`** — `authoritative` when the source directly states the fact (Canoe123's own
  `dtFinish`, an operator's Cross heat-order entry, CIS's explicit two-run totals); `inferred` when
  our domain layer derived it from a signal that is evidence of the fact rather than an assertion of
  it (the `Time`-format-change finish signal; the arithmetic `Total − Pen` reconstruction of a
  superseded run 1). This is not a numeric score — it is closed to exactly these two values, because
  a numeric confidence would invite a client to make its own threshold judgement, which is exactly
  the kind of domain decision §5 asks us to remove.
- **`provisional`** — `true` only while a strictly more-authoritative source *configured for this
  deployment* has not yet reported on this specific field. If no more-authoritative source is
  configured (no CIS licence at this venue), the value is `provisional: false` — it is as final as
  this deployment will ever produce, even though its `confidence` may still read `inferred`.
  `provisional` answers "might this still move"; `confidence` answers "how was it produced." A
  client needs both and must not conflate them.

**The trichotomy** (§5.3's *unknown* / *not yet* / *zero*):

- `not-yet` — the fact does not exist yet. An `Attempt` before it starts; a `Phase` before it is
  scheduled. Not an error, not missing data — the honest state of a thing that hasn't happened.
- `unavailable { reason }` — the fact exists, or will, but nothing currently configured can supply
  it. Reserved strictly for this case. **Never** used because the latest message simply didn't
  mention the field — see the monotonic merge rule, §4, which is the maintainer's own answer to
  this exact question and overrides any weaker reading elsewhere in this document.
- `known { value: 0, ... }` — a real, asserted zero. Structurally distinct from both of the above by
  construction (it is a variant of `known`), which is the direct fix for `EVIDENCE.md` Exhibit 5:
  the transport can never again collapse `null` into `0`, because there is no code path where the
  absence of a `known` observation can be mistaken for one.

### 1.3 Units and encodings

- All durations in **seconds**, decimal, never centiseconds or a mix (today's `Time`/`Pen`/`Total`
  fields are seconds already; CIS fields are not re-verified here — the domain layer normalises at
  ingest, once).
- All dates `YYYY-MM-DD`, all timestamps full ISO-8601 with an explicit offset or `Z`.
- Gate penalties: `0 | 2 | 50 | null`. `null` means not yet judged/passed — never coerced to `0`.
- No field in any contract value carries natural-language text describing domain state. Status,
  round, and discipline are closed identifiers; a human-readable label is a client-side lookup
  keyed on the identifier, in whatever language and register the client chooses. This is the
  structural generalisation of the fix for `EVIDENCE.md` Exhibit 8 — not "don't emit Czech," but
  "don't emit language, in any language, from the domain layer, ever."

---

## 2. Domain entities

### 2.1 Organiser

The cloud-tier tenant boundary (`CONSTRAINTS.md` §1.7). Not modelled on-site at all — an on-site
deployment is single-tenant by fixed topology.

```ts
type Organiser = {
  organiserId: string   // opaque; a credential subject, not a display name
  name: string
}
```

**Invariant:** every `Event` belongs to exactly one `Organiser`. Authorisation for every write to
that event's data is scoped by the credential that resolves to this `organiserId` — see §8.1.
Isolation is a contract property, not a deployment detail: nothing in the read-side public contract
(§8.4) ever requires knowing which organiser owns an event to read its public results, and nothing
in the write-side contract ever accepts a write without a credential resolving to the target
organiser.

### 2.2 Event

```ts
type Event = {
  eventId: string        // opaque — see §1.1
  organiserId: string
  name: string            // e.g. "Jarní pohár 2026" — organiser-supplied, opaque to the domain layer
}
```

**[N] An Event spanning multiple days is not derivable from Canoe123 at all.** Canoe123 has no
concept of a multi-day event; each racing day is, from its perspective, a fresh export. Event
identity is established by the on-site bridge (persisted locally, reused across days by default —
see Scenario E in `ARCHITECTURE.md`) or, in the future, by a central registry — either way, it is
asserted, never discovered. This is the sharpest instance of the brief's third derivability outcome:
recorded here as what the current data genuinely cannot tell us, not designed around silently.

**Invariant:** `Event.eventId`, once minted, never changes and is never reused for a different
competition. A fresh competition on the same laptop is a deliberate operator action (§ Scenario E),
never inferred from a changed XML/TCP source.

### 2.3 Category

```ts
type Category = {
  categoryId: string       // derived from Canoe123 Class token — [D] TCP/CIS
  eventId: string
  code: string              // raw Canoe123 class string, e.g. "K1M-ST" — opaque, not translated
  discipline: 'slalom' | 'cross'   // [D] structural — from which Phase roundKinds appear under it
}
```

`discipline` is exposed explicitly rather than left for a client to infer from `roundKind` tokens,
because two structurally different things hang off it: which `Attempt.outcome` variant applies
(§2.6) and which finish-detection strategy the domain layer used to produce `Attempt.status`
(`ARCHITECTURE.md` §2, `DECISIONS/ADR-009`).

### 2.4 Phase

One scored round within a Category — exactly one Canoe123 `RaceId`. This is the entity `EVIDENCE.md`
found missing: today "Race" conflates Category and Phase, and every client re-derives the split by
regex (Exhibit 8).

```ts
type Phase = {
  phaseId: string            // = Canoe123 RaceId, adopted directly — [D]
  categoryId: string
  roundKind: RoundKind        // [D] TCP/XML `DisId`
  date: string                 // YYYY-MM-DD, assigned once, immutable — see §4 INV-5
  status: Observed<PhaseStatus> // [D]/[A] — see §3.1
  multiRun: boolean             // true for BR1/BR2-style pairs — [D] structural, from roundKind
  scoringKind: 'duration' | 'ordinal'  // [D] structural, from Category.discipline
}

type RoundKind = 'BR1' | 'BR2' | 'QUA' | 'SEM' | 'FIN' | 'XT' | 'X4' | 'XS' | 'XF' | 'XER'
  // open-ended in practice: an unrecognised token is carried through as an opaque string
  // rather than rejected. This is a known-value set, not a hard enum — Canoe123 is immutable
  // upstream (CONSTRAINTS.md §1.1) but not exhaustively documented.
```

**`date` is assigned once, from the Phase's first observation or its scheduled slot, and never
changes** — even if a correction to this Phase's results is pushed a week later (§ maintainer
answer A7). This is what makes multi-day aggregation (Scenario E) correct under late correction:
the Phase's place in the calendar is fixed at the moment it becomes known, not at the moment any
particular push happens to arrive.

**Invariant:** a `Phase` with `multiRun: true` always has exactly one sibling `Phase` in the same
`Category` with the complementary run number. `Standing` for a multiRun category (§2.7) is computed
across the pair, never a single Phase in isolation.

### 2.5 Entry

A competitor within a Category — one athlete/boat, persistent across every Phase of that Category.

```ts
type Entry = {
  entryId: string    // opaque — see §1.1. On-site, derived from Canoe123 Id (ICFcode+ClassId)
  categoryId: string
  bib: Observed<string>    // [D] — display number; correctable, see §2.6's binding note
  name: Observed<string>   // [D] — athlete/boat display name, raw, not translated
}
```

**Derivability note on `entryId` stability.** Confirmed directly: Canoe123's `Id` field is
identical for the same competitor's BR1 and BR2 entries (a matched pair was checked). For
QUA→SEM→FIN specifically, no direct sample exists; the equivalent Cross elimination chain
(XT→X4→XS→XF→XER) shows the same stability, and `Id`'s own composition (ICF registration code +
class, with no phase component) makes cross-phase stability the structural default rather than an
accident. Treated as **[D]** for BR1/BR2 and Cross elimination, **[A]** — inferred, not directly
observed — for QUA/SEM/FIN. Flagged as a residual risk, not a blocker: even if wrong, the failure
mode is a spurious new `Entry` rather than silent data corruption, and is visible (a competitor
would appear to have zero prior-phase attempts).

### 2.6 Attempt

One Entry's participation in one Phase. The unit with a lifecycle: on-course state, timing, gate
penalties.

```ts
type Attempt = {
  attemptId: string          // = `${phaseId}:${bib}` — stable identity, see the binding note below
  phaseId: string
  entry: Observed<{ entryId: string }>   // mutable pointer — see below
  status: Observed<AttemptStatus>         // [D]/[A] — see §3.2
  outcome: Observed<Outcome>
  gates: Observed<Gate[]>
  upstreamRank: Observed<number>           // Canoe123's or CIS's own Rank — input to §5, never presented directly as Standing.rank
}

type AttemptStatus = 'not-started' | 'on-course' | 'finished' | 'dns' | 'dnf' | 'dsq' | 'cap' | 'other'

type Outcome =
  | { kind: 'pending' }
  | { kind: 'duration'; runSeconds: number; penaltySeconds: number; totalSeconds: number }  // slalom
  | { kind: 'ordinal'; order: number }                                                       // cross
  | { kind: 'no-result'; status: 'dns' | 'dnf' | 'dsq' | 'cap' | 'other' }

type Gate = { number: number; penalty: 0 | 2 | 50 | null }
```

**Attempt identity is `(phaseId, bib)`, not `(phaseId, entryId)`.** This is a deliberate revision
from the working hypothesis this design started with. The reason is the maintainer's answer on
corrections (§ maintainer answer A7): it can emerge, up to a week after a race, that a different
person raced under a given bib. What is structurally stable is the physical fact — someone wearing
bib 9 went down the course in `K1M_ST_BR2_6` — and *who that was* is the correctable assertion, not
the identity key. Keying `Attempt` on `bib` and carrying `entry` as an `Observed` pointer makes that
correction a normal field update (a new, newer-`observedAt` `known` observation) rather than a
structural rebind that would orphan every downstream reference to the old `attemptId`.

This is also the direct fix for `EVIDENCE.md` Exhibit 1's on-course collision: on-course state is
keyed by `(phaseId, bib)`, never `bib` alone, so Kayak Cross's four simultaneous competitors — same
Phase, different bibs — never collide, and two categories that happen to reuse a bib number never
collide either, because they are different `phaseId`s.

**`gates` is position-correct by construction.** The domain layer owns gate-number assignment
centrally, from whichever wire encoding it received (comma-separated in OnCourse, fixed-width in
Results — `DOMAIN-FACTS.md` §6); a client never sees either raw string. This retires
`EVIDENCE.md` Exhibit 2 by removing the two independently-wrong client parsers' reason to exist,
not by fixing either of them.

**Finish detection is a per-discipline strategy, not one rule.** For slalom: primary signal is the
`dtFinish` transition (`eventTime` present, `confidence: authoritative`); `Time`-format change and
`HighlightBib` are corroborating, lower-confidence fallbacks (`confidence: inferred`) used only when
`dtFinish` is not yet observed. For Cross: **there is no per-competitor OnCourse finish signal at
all** — checked directly against a recorded Cross heat: `chStart`, `chFinish`, `dtStart`, `dtFinish`
and `Completed` never transition per-competitor; the whole heat clears from OnCourse together, well
after the fact. The authoritative signal is the `Results` stream's `Rank`/`Time` field for that bib
becoming non-empty — and per the maintainer, **this is not a detected signal at all: it is an
operator's assertion**, entered after conferring with the finish judge, arriving at human latency.
`Attempt.outcome` for Cross therefore carries `source: 'operator-assertion'`, `confidence:
authoritative` — never `inferred` — once the Results stream reports it; before that, `outcome` is
`{ state: 'not-yet' }` for as long as the heat runs, structurally correctly, because we genuinely
have nothing better.

**Deadline consequence (§6.D in `ARCHITECTURE.md`):** the domain layer pushes an operator-asserted
Cross outcome the instant it is ingested — no debounce, no batching, no waiting for a rotation. This
is the server's half of the maintainer's "publish before the next heat starts" requirement; the
other half — how long that result stays visible once the next heat is already running — is display
policy, owned by the client (§3 of `ARCHITECTURE.md`).

### 2.7 Standing

Derived, not primary state — the current ranking view for a Category (or, for a `multiRun` Phase
pair, across both). Recomputed by the domain layer whenever a contributing `Attempt` changes.

```ts
type Standing = {
  categoryId: string
  asOf: Timestamp
  entries: StandingEntry[]
  anomalies: Anomaly[]     // never silently dropped — see §5
}

type StandingEntry = {
  entryId: string
  rank: number | null       // null for no-result entries — see §5
  outcome: Outcome           // the resolved outcome this rank is based on
  provisional: boolean
}

type Anomaly = { kind: 'rank-disagreement'; entryId: string; ourRank: number; upstreamRank: number }
```

The ranking algorithm is specified in §5, precisely enough to test independently of any
implementation.

### 2.8 Source status

Diagnostic, not spectator-facing — the maintainer was explicit that a missing source must not nag
(§ maintainer answer A1).

```ts
type SourceStatus = {
  tcp: ConnState
  cis: ConnState | 'not-configured'
  xml: ConnState
}
type ConnState = 'connected' | 'reconnecting' | 'unreachable'
```

Consumed by the on-site admin UI. Not pushed to scoreboard/penalty-check/spectator surfaces as an
alert — its only effect on those surfaces is indirect, through `unavailable{reason}` on the specific
values it affects (§6).

### 2.9 Write request

The contract's answer to Scenario B and to the maintainer's answer A6 (no timeout policy).

```ts
type WriteRequest = {
  writeId: string
  target: { phaseId: string; bib: string; field: 'gate-penalty' | 'status' }
  requestedValue: unknown
  submittedAt: Timestamp
  status: 'pending' | 'confirmed' | 'mismatched'
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}
```

**No timeout field exists, deliberately.** `pending` persists until an upstream observation for the
same field arrives with a later `observedAt`; if it matches, `confirmed`; if it differs,
`mismatched`. A `WriteRequest` never times out into a failure state on its own — per the maintainer,
a lost echo is a failed write that must be surfaced and resolved by a person, not guessed at by a
duration threshold. `submittedAt` is always present, so any client that wants to show "pending for
Ns" computes it locally; the contract does not define what duration should worry anyone.

**Writes target `(phaseId, bib)` explicitly, including a closed Phase.** Nothing in this contract
restricts writes to the "current" phase. This is required directly by the maintainer (§ maintainer
answer A2): penalty-check must be able to open a completed run 1 and correct it. Upstream, this is
carried by Canoe123's `PenaltyCorrection` terminal command, which takes an explicit `RaceId`
parameter and is documented for post-completion use — unlike `Scoring`, which has no race-targeting
parameter and is necessarily current-race-only. The contract does not depend on which upstream
command the domain layer chooses; it only requires that closed-phase writes are accepted and
tracked identically to current-phase ones.

### 2.10 Verification state (penalty-check's own workflow bookkeeping)

Not a sport-domain fact — a judge checking a displayed penalty against a paper protocol changes
nothing about what happened on the water. Kept as its own namespace, server-persisted because
multiple tablets must see the same check-off state, but deliberately outside §2.1–§2.9: its wrong
value is a worse workflow, never a wrong fact, so it sits on the client side of the line in §2 of
`ARCHITECTURE.md` even though it happens to be stored on the server for sharing, not rendering.

```ts
type VerificationState = {
  attemptId: string     // = the domain's own (phaseId, bib) — see below
  gate: number
  checked: boolean
  checkedBy?: string
  checkedAt?: Timestamp
}
```

**Keyed on the domain layer's own `attemptId`, not a separate fingerprint.** Today,
`checks/fingerprint.ts` computes its own event-identity fingerprint, independent of and disagreeing
with the two others audited in `EVIDENCE.md` Exhibit 7. That third fingerprint's actual job was never
"is this the same event" — it was "which attempt does this checked gate belong to," a question the
domain layer's own `(phaseId, bib)` identity already answers exactly. Reusing it removes the need
for a third scheme to exist at all, rather than reconciling it with the other two.

### 2.11 Worked example — the observation envelope through Scenario A

`Attempt` for bib 9, `K1M_ST_BR2_6`, run 2 beating run 1, at three points on the timeline walked in
`ARCHITECTURE.md` §6.A (values illustrative):

```ts
// t+1s — dtFinish just transitioned; totalSeconds computed by us from OnCourse Time + gates
{
  attemptId: "K1M_ST_BR2_6:9",
  entry: { state: 'known', value: { entryId: '30034.K1M_ST' }, observedAt: '…T10:14:02.100Z',
           source: 'tcp', confidence: 'authoritative', provisional: false },
  status: { state: 'known', value: 'finished', observedAt: '…T10:14:02.083Z',
            eventTime: '…T10:14:02.079Z', source: 'tcp', confidence: 'authoritative', provisional: false },
  outcome: { state: 'known',
             value: { kind: 'duration', runSeconds: 82.36, penaltySeconds: 0, totalSeconds: 82.36 },
             observedAt: '…T10:14:02.083Z', source: 'tcp', confidence: 'inferred', provisional: true },
}

// t+10s — CIS poll corroborates (this deployment has CIS configured)
// outcome.value unchanged; observedAt: '…T10:14:11.400Z', source: 'cis',
// confidence: 'authoritative', provisional: false — cis now outranks tcp for this
// field-category (§4 INV-2) and has reported, so its observation is what's presented

// t+30s — the TCP Results rotation lands. Per §4 INV-2, this updates tcp's own
// retained slot only — it does not touch what's presented, because cis remains
// top-ranked-and-available for this field-category and has already reported.
// outcome (presented) is UNCHANGED from t+10s: still source: 'cis', observedAt:
// '…T10:14:11.400Z' — not overwritten by the t+30s message's own, later observedAt.
// If the rotation's value disagrees with cis's, that disagreement is surfaced as a
// diagnostic and triggers a fresh CIS GetResult for this bib (§4 INV-2b); it is never
// adopted from tcp directly, and it never oscillates on the 30-second rotation period.

// run 1's own Attempt, "K1M_ST_BR1_6:9", is untouched throughout this entire sequence —
// still 'known', still the value observed when it finished, still not provisional,
// because nothing in run 2's messages ever mentions it (§4 INV-1)
```

No field of run 1's `Attempt` is touched by anything in run 2's timeline — not because the domain
layer special-cases two-run races, but because nothing in §4's invariants gives a later message the
power to alter a field it doesn't mention. And no field of run 2's `Attempt` oscillates once a
higher-ranked source has reported it — not because the domain layer special-cases the rotation, but
because §4 INV-2 never lets recency substitute for authority.

---

## 3. State machines

### 3.1 `Phase.status`

Collapses Canoe123's 14-value `RaceStatus` into a closed set, once, centrally — never left to each
client (`EVIDENCE.md` Exhibit 10).

| Closed value | Canoe123 `RaceStatus` values mapped |
|---|---|
| `scheduled` | 0 Scheduled, 1 StartList, 8 GettingReady, 12 Rescheduled |
| `running` | 3 InProgress |
| `paused` | 2 Delayed, 11 Interrupted |
| `unofficial` | 4 Unofficial, 9 Unconfirmed |
| `official` | 5 Official |
| `revised` | 6 Revised |
| `protested` | 10 Protested |
| `postponed` | 13 Postponed |
| `cancelled` | 7 Cancelled |
| `other` | any value not in the 14 documented today |

**Legal transitions:** `scheduled → running`, `running ⇄ paused`, `running → unofficial`,
`unofficial ⇄ revised`, `unofficial → official`, `official → revised` (a correction, §maintainer
answer A7 — **does not require passing back through `unofficial`**), any state `→ protested`,
`protested → unofficial | official`, `scheduled → cancelled | postponed`. No transition target is
final: `official` is not an end state the contract locks, because corrections happen.

### 3.2 `Attempt.status`

`not-started → on-course → finished`, or `not-started → dns`, or `on-course → dnf | dsq | cap`, or
(rarely) `finished → dsq` (post-finish disqualification). **Monotonic per §4**: once `finished` (or
a terminal non-result status), a later message that simply doesn't mention this Attempt never
reverts it to `not-started` or `on-course` — only an explicit newer observation changes it, and per
§4 that is always a correction, never a reversion-by-omission.

---

## 4. Merge and time invariants

This is the contract's answer to `EVIDENCE.md` Exhibit 1, stated as invariants a merge
implementation must satisfy — not an algorithm, per the brief's instruction to stop at what the
contract constrains.

- **INV-1 (monotonic knowledge).** A field's `state` never regresses from `known` to `not-yet` or
  `unavailable` because a later message omits it. Absence of a value in one message is not evidence
  of absence of the fact — this is the maintainer's own framing, and it is why merge is per-field,
  never whole-object: `EVIDENCE.md` Exhibit 1's "Results replaces the whole object" is exactly the
  violation this invariant exists to make structurally impossible, not merely discouraged.
- **INV-2 (authority-gated replace).** A field is not one mutable slot compared only by recency. The
  domain layer retains the latest `known` observation received *from each source* that has reported
  the field; the value the contract presents is the latest observation from the **highest-ranked
  source, among those `SourceStatus` (§2.8) currently reports available, that has reported this
  specific field.** Ranking is **per field-category**, never one global order over `SourceTag` —
  no single order is correct for every field (§6: `tcp` beats `cis` on timeliness for on-course
  facts; `cis` beats `tcp` on completeness for a finished Attempt once one exists):

  | Field category | Ranking, highest first |
  |---|---|
  | On-course position / running time (`Attempt.status = 'on-course'`) | `tcp` > `cis` |
  | Finished slalom `Attempt.outcome` / `Attempt.gates` | `cis` > `tcp` > `xml` (CIS configured) — `tcp` > `xml` (not configured) |
  | `Attempt.upstreamRank` | `cis` > `tcp` — same discipline as the row above; §5 consumes this field's presented value, never a raw pass-through of whichever of Canoe123's or CIS's own `Rank` last arrived |
  | `Phase.status` | `tcp` > `xml` |

  A source that is not currently top-ranked-and-available still has its own observation retained —
  so it can surface later, see INV-2b — but does not change what's presented while a higher-ranked
  source remains available and has reported. A *later* observation from the **currently-presented
  source itself** always supersedes its own earlier one; an ordinary correction from an authoritative
  source needs no special case, since presentation always reads that source's newest entry for as
  long as it stays top-ranked-and-available — which is what still lets a correction land, including
  one that arrives a week later against a Phase whose `status` is already `official`
  (§ maintainer answer A7).

  **`operator-write` and `operator-assertion` sit outside this table**, in two variants: **(a)
  `provisional: true`** — an optimistic write awaiting one specific expected echo (a gate-penalty
  correction we just issued, §2.9); presented the instant it is submitted, and the very next
  observation of that field, from *any* source, unconditionally supersedes it, confirming or
  `mismatched` — this is Scenario B's mechanism, unchanged. **(b) `provisional: false`** — an
  assertion with no echo expected: a Kayak Cross operator's heat-order call (§2.6 — it is already the
  final word, nothing confirms it further) or a direct correction entered against the cloud store
  with no live on-site session to echo through (§8.5). Presented immediately; superseded only by a
  *later* assertion of the same kind, or by the top-ranked automated source's own fresh, specifically
  triggered report (INV-2b) — never by an incidental report from a lower-ranked automated source.

  **This correction was made in review of an earlier draft**, which specified freshness only —
  replace on strictly newer `observedAt`, full stop, no authority gate. That rule was unsound: a
  message from a source with a worse answer for a given field could still displace a source with a
  better one purely by arriving later in our own ingest order. Concretely, on a two-run race, a
  CIS-confirmed total at `t=10s` could be pushed back out by a TCP `Results` rotation landing at
  `t=25s` and pulled back at the next CIS poll — a value oscillating on the rotation period between
  right and wrong, which is exactly the flicker the maintainer named as the reason monotonic merge
  was wanted (§ maintainer answer A1), now slower, and worse for being harder to notice. Worth
  recording precisely, since the *specific* illustration doesn't survive a check against
  `DOMAIN-FACTS.md` §4 unchanged: when run 2 is genuinely better, TCP's own `Total` field already
  equals run 2's value once Canoe123 has finished computing it, so this is not "TCP asserts the wrong
  run's number forever." The real exposure is a source's content being transiently stale relative to
  what a better source has already told us — rounding, a computation-in-progress window on Canoe123's
  own side, or simply two sources answering the same question to different precision — and pure
  recency-of-arrival has no defence against any of it. Slalom scenario A's "late rotation" walks the
  fixed version: OnCourse's `dtFinish` transition (sub-second) sets `Attempt.outcome` at `t+1s`,
  `source: tcp`, because `tcp` is the only source that has reported yet; a CIS poll at `t+10s`, if
  configured, outranks it and becomes presented; the `t+30s` `Results` rotation updates `tcp`'s own
  retained slot only, changing nothing presented — agreement or not, and regardless of which arrived
  more recently.

- **INV-2b (disagreement triggers a re-query, never a silent override).** When a lower-ranked
  source's retained observation disagrees with the presented value, that disagreement is neither
  discarded nor adopted directly — it is surfaced as a diagnostic (the same admin-facing audience as
  `SourceStatus`) and, where the top-ranked source supports an on-demand query for that specific fact
  (CIS's `GetResult`, for one race and bib, does), triggers one. The presented value changes only
  from the top-ranked source's *own response* to that query, never from the lower-ranked source
  directly. This is what stops INV-2's authority gate from permanently hiding a genuine correction
  that only ever reaches us through a lower-ranked channel: a `PenaltyCorrection` entered over TCP
  against a closed Phase still forces a fresh CIS read rather than sitting invisibly behind a CIS
  observation nobody asked to refresh.
- **INV-3 (`unavailable` is asserted, never defaulted).** `unavailable{reason}` is set only by an
  explicit domain-layer determination that no configured source can supply the field right now
  (e.g. gate detail for a superseded run 1, with CIS not configured). It is never the default state
  for "this message's shape didn't include the field."
- **INV-4 (identity bindings carry the same envelope).** `Attempt.entry` is `Observed`, exactly like
  any other field — a correction to who raced under a bib is a normal `known → known` transition,
  not a structural rebind (§2.6).
- **INV-5 (idempotent supersession).** Re-delivering an identical observation — same `value`, same
  `observedAt` — is a no-op: it must not re-trigger a client-visible change notification. This is
  required for the live-ingest contract to accept safe retries and for a correction pushed by an
  organiser directly against the cloud store (§8.5) to compose safely with a bridge that might also
  still be pushing.

These six invariants are what "verifiability" (`CONSTRAINTS.md` §4) reduces to in practice: given
the same sequence of ingested messages, each carrying its true `observedAt` timestamp and known
source, the resulting state is a pure function of that sequence — replaying a recording is
deterministic because nothing in the merge depends on wall-clock time at the moment of replay, and
nothing in it depends on which source shouted last, only on the ranking table above and the
`observedAt` values captured at original ingest. Determinism was the property INV-2's freshness-only
first draft also had — the authority gate does not trade it away; a re-query triggered by INV-2b is
itself just another observation in the sequence, with its own `observedAt`, replayable exactly like
any other.

---

## 5. Standing computation

Answers the orchestrator's open question directly: what happens when a mechanically-derived rank
and an upstream-asserted one disagree, and what happens on a tie upstream doesn't resolve.

1. Entries with a numeric `Outcome` (`duration.totalSeconds` or `ordinal.order`) are sorted
   ascending by that value. This is mechanical arithmetic, independently verifiable by us — it is
   never delegated to an upstream `Rank` field, precisely to avoid the two-sources-of-truth problem
   this question raises.
2. **Equal outcome values receive equal rank** (standard skip ranking: 1, 2, 2, 4) by default. We do
   not invent a tie-break rule — per the maintainer, federation-specific rules like this must not be
   baked into the domain core (`CONSTRAINTS.md` §1.8).
3. **When `Attempt.upstreamRank` differentiates entries our mechanical comparison ties,** its
   *presented* value (§4's authority-gated precedence, never a raw pass-through of whichever of
   Canoe123's or CIS's own `Rank` field last arrived) is treated as a tie-break authority — it
   reflects a competition rule we are told not to reimplement — and resolves the tie: the tied group
   is reordered by it, receiving sequential (non-skip) ranks, with `StandingEntry` carrying no
   separate provenance field for this — the resolved `rank` is simply asserted, as any other value
   is. This is one precedence discipline throughout, not two: `upstreamRank` is a field like any
   other, subject to the same per-source retention and ranking as `outcome`.
4. **When the presented `upstreamRank` disagrees with a *non-tied* mechanical ordering,** the
   mechanical ordering is what the contract asserts — it is independently checkable, `upstreamRank`
   is not — and the disagreement is recorded in `Standing.anomalies`, never silently overridden in
   either direction. This is the target-state descendant of `EVIDENCE.md` Exhibit 3's arithmetic
   consistency check: kept as a diagnostic, never again as a mechanism for silently picking a value.
   Distinct from §4 INV-2b's disagreement handling, which operates one layer down, on a single
   field's competing source observations before `upstreamRank` is even presented — this step only
   ever sees the one value INV-2 already resolved.
5. **Entries with a `no-result` outcome (`dns`/`dnf`/`dsq`/`cap`/`other`) receive `rank: null`** —
   never a fabricated numeric rank — and are listed by `status` with a stable secondary order (by
   `bib`) for deterministic list position only. This is not a federation-specific choice: a
   non-existent time cannot be ranked, in any ruleset.

---

## 6. Derivability ledger

The brief's required third list: what today's sources genuinely cannot supply, and what CIS buys
where it is configured. **Availability of CIS is a deployment variable, not a project-wide given**
(`CONSTRAINTS.md` §2.6) — every line below states its behaviour both with and without CIS.

| Value | With CIS | Without CIS |
|---|---|---|
| On-course position/time | [D] TCP, ~500ms | same — CIS is poll-based and never faster than TCP here |
| Slalom finish | [D] `dtFinish` transition, TCP, authoritative | same |
| Run-2 outcome when run 1 was better | [D] mechanical, `Total − Pen`, from the wire | same |
| Run-2 outcome when run 2 was better, run-1 total | [D] CIS `GetResult`, both runs explicit | **[A]** only if this server observed run 1 live and cached it — a statefulness dependency, not a property of the current input alone |
| Run-1 gate-by-gate detail, once superseded | [D] CIS `GateTimes`/`GetResult` | **[A]** — same conditionality as the row above, not worse: monotonic knowledge (§4 INV-1) means the *whole* run-1 `Attempt`, gates included, was captured in domain state while it was live and does not vanish because run 2's wire message doesn't repeat it. Only genuinely **[N]** in the narrower case of this row's own condition failing *and* CIS absent — a mid-event server restart between run 1 and run 2, with no licence to fall back on |
| Cross heat order | [D] operator assertion via Results stream — same either way; CIS does not change this | same |
| Event spanning multiple days | **[N]** in both cases — never in Canoe123's data; always asserted by the bridge/operator (§2.2) | same |
| Athlete directory / event metadata | [D] CIS `GetAthletes`/`GetEvent` | [A] names embedded piecemeal in other messages |
| Tie-break beyond arithmetic equality | [D] only as an upstream `Rank` relay (§5.3) — never independently computed | same |
| Registry-verified identity (nationality, spelling) | **[N]** in both cases — out of scope; Canoe123 is the only identity source that exists | same |

**What CIS is deliberately not used for:** speed. It is poll-based (`DOMAIN-FACTS.md` §2); TCP
remains the on-course source of truth regardless of CIS availability. CIS's value is completeness
(both runs, gate detail), not latency — conflating the two would reintroduce the guessing this
design exists to remove.

**How a deployment finds out which column it is in:** `SourceStatus.cis` (§2.8), plus the
`unavailable{reason}` and `provisional` fields on the specific values affected. Never a spectator-
facing banner (§ maintainer answer A1) — the honesty is in the contract, read by whoever needs it,
not broadcast as an alert to whoever doesn't.

---

## 7. On-site contract — c123-server ↔ scoreboard / penalty-check

Serves clients that exist to display *this* timing system (`BRIEF.md` §5.7's asymmetry, argued for
in `DECISIONS/ADR-007`). Uses Canoe123-native tokens (`RoundKind`, `phaseId` = `RaceId`) directly —
justified because Canoe123 is this tier's only possible upstream by fixed topology, and inventing a
vendor-neutral abstraction here would be designing around a variety of on-site protocol this
ecosystem has never seen and has not been asked to support.

**Hydration (REST, snapshot):**

- `GET /api/events/current` → `Event`, `Category[]`
- `GET /api/categories/{categoryId}/phases` → `Phase[]`
- `GET /api/phases/{phaseId}/attempts` → `Attempt[]` (full envelope-wrapped state)
- `GET /api/categories/{categoryId}/standing` → `Standing`
- `GET /api/oncourse` → `Attempt[]` — every Attempt currently `on-course`, across every currently-
  running Phase. **Plural by construction**, not a singleton "current competitor" — this is what
  admits Kayak Cross's four-at-once without a structural change (§5 of `ARCHITECTURE.md`).
- `GET /api/sources` → `SourceStatus` (admin-facing)

**Live updates (WebSocket, delta):** after hydration, the socket carries per-entity deltas only —
`attempt.updated { attemptId, fields }`, `phase.updated { phaseId, fields }`,
`standing.updated { categoryId, entries }`, `write.updated { writeId, status }`,
`sources.updated { ... }`. This resolves `CONSTRAINTS.md` §2.2 (snapshot-vs-delta) explicitly:
REST is always a full current snapshot for a fresh client; the socket never re-sends what hydration
already established.

**Writes (REST):**

- `POST /api/attempts/{phaseId}/{bib}/penalty { gate, value }` → `WriteRequest`
- `POST /api/attempts/{phaseId}/{bib}/status { status }` → `WriteRequest`

Both accept any `phaseId`, including a closed one (§2.9). Neither is restricted to "the current
race." `GET /api/writes/{writeId}` polls a specific write; `write.updated` also pushes it.

---

## 8. Live ingest contract — bridge/organiser ↔ live-mini

Designed to outlive Canoe123 (`BRIEF.md` §5.7). Nothing in this section names a Canoe123 field,
message type, or wire quirk.

### 8.1 Authentication and tenancy

`X-API-Key` resolves to exactly one `(organiserId, eventId)` pair — the pattern already in use
today, kept and formalised (`CURRENT-STATE.md`: "the event resolved by API key... deliberately").
A key authorises writes to that event's resources only. No request identifies its target event by a
client-supplied id checked against the key — the key *is* the scope, which is what makes isolation a
contract property rather than an access-control list someone must remember to configure correctly.

### 8.2 Identity provenance invariance

`eventId` and `entryId` are opaque strings to this contract (§1.1). Today, both are minted by the
on-site bridge — the bridge self-issues its own API key at event creation and derives `entryId` from
Canoe123's `Id` field. Nothing in the request or resource shapes below encodes that fact. If a
central calendar/registry is built later (`CONSTRAINTS.md` §1.8, maintainer's stated ambition), it
would issue these ids and keys instead — the shape of every endpoint below is unchanged; only who
calls it, and where the opaque strings originally came from, differs. Costed fully in
`DECISIONS/ADR-006`.

### 8.3 Push — resource-based, Attempt-level

Every push is an idempotent upsert by identity (§4 INV-5), not an append:

- `PUT /ingest/v2/categories/{categoryId}` — `{ code, discipline }`
- `PUT /ingest/v2/phases/{phaseId}` — `{ categoryId, date, status, multiRun, scoringKind }` — note:
  **no `roundKind`.** The live contract carries only the structural flags a renderer needs
  (`multiRun`, `scoringKind`); a vendor-specific round token would be exactly the kind of thing
  `CONSTRAINTS.md` §1.8 asks us not to bake in — a different timing system's round names would not
  fit a Canoe123-shaped enum, and the on-site tier, which does need `roundKind`, already has it
  (§7). This is the asymmetry the brief asks us to weigh, kept deliberately (`DECISIONS/ADR-007`).
- `PUT /ingest/v2/entries/{entryId}` — `{ categoryId, bib, name }`
- `PUT /ingest/v2/attempts/{phaseId}/{bib}` — the full `Attempt` shape (§2.6), envelope-wrapped,
  **including `gates`.** This is the direct fix for `EVIDENCE.md` Exhibit 9's dead ingest branch:
  gate-by-gate detail for every completed Attempt is part of the push, not a schema nobody sends to.

The unit of transfer is one Attempt (or one Phase, Category, Entry) changing — never a file, never a
whole day, never a whole event. This is the direct answer to the brief's §5.7 granularity complaint:
Saturday's and Sunday's races push independently, tagged by their own Phase's `date`, under the same
`eventId` throughout — separating two days never again requires two events (Scenario E,
`ARCHITECTURE.md`).

### 8.4 Read — public, unauthenticated

- `GET /public/events` — **the calendar** (§ maintainer answer A4): every organiser's events,
  visible to every viewer, no per-organiser access policy to configure. `[{eventId, organiserName,
  name, dateRange, status}]`.
- `GET /public/events/{eventId}` → `Category[]`, `Phase[]` summary
- `GET /public/events/{eventId}/categories/{categoryId}/standing` → `Standing`
- Push mirrors §7's delta model, over the transport live-mini already uses.

### 8.5 Corrections after the on-site session has ended

The maintainer's answer on corrections (§ maintainer answer A7: disputes and mis-bibbing surface up
to a week later) implies the on-site laptop is very likely no longer running by the time a
correction is needed. **The ingest contract does not assume its caller is the bridge.** Any request
authenticated for an event's organiser may `PUT` a correction directly against the cloud store —
the endpoint shapes in §8.3 are exactly the ones used, `source: 'operator-write'`,
`provisional: false` — no echo is ever expected once the on-site session may be long over (§4 INV-2's
carve-out (b)). It is presented immediately and composes safely with a possibly-still-live bridge
push without special-casing which one "wins": a routine bridge push for the same field is an
automated-source observation ranked below it and does not displace it (§4 INV-2); only a later human
assertion, or a specifically-triggered fresh read from the top-ranked automated source (§4 INV-2b),
ever supersedes a standing correction. INV-5's idempotent-upsert semantics are what let the two
callers compose without a distributed lock — each `PUT` is retained per its own source, never a
destructive overwrite of the other's slot.

### 8.6 What this contract refuses

- A raw vendor payload of any kind (no "push the file").
- A push that does not name its target entity by id at every level.
- A non-idempotent operation — there is no "append a result," only "assert the current value of a
  field," which is what makes replay-safety and multi-caller composition (§8.5) hold without extra
  machinery.
- A vendor-specific round or status token (§8.3) — the closed vocabularies of §2–§3 are what a
  different timing system's bridge must translate into, not extend.

**What a different timing system would have to supply** to use this contract: entries, phases
(with `multiRun`/`scoringKind`, not a round name), and attempts carrying an outcome, a status, and
honest source/confidence — nothing that presumes TCP, UDP, CIS, or an XML file exists. **Cost, kept
plain rather than hidden:** the on-site bridge must translate Canoe123's shape into this one; it
cannot forward. That work is the same domain layer §7 already requires for the on-site contract, so
it is not additional scope invented for vendor-neutrality's sake — it is the on-site domain layer's
output, serialised a second way.
