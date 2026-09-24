# Contracts — c123 Ecosystem

This is the primary deliverable. Everything in `ARCHITECTURE.md` and `DECISIONS/` exists to justify
and explain what is stated here. Every clause is written to be testable before any implementation
exists. If a clause could not be turned into a failing test, it has been sharpened or cut.

The vocabulary comes from canoe slalom and Kayak Cross, not from Canoe123's wire format. Where a value
is shaped by what Canoe123 happens to emit, that is stated explicitly as a derivability note, never
left implicit.

**Consolidated revision, 2026-09-24.** This version absorbs four sets of input:
- the reverse pass, which checked every field Canoe123 emits against this contract;
- a latency measurement from finish to result;
- the maintainer's answers to eight operational questions;
- the open contract gaps #165 (course structure), #166 (per-competitor fields, running time,
  on-course position) and #171 (identity).

The decisions behind it are `DECISIONS/ADR-011` to `ADR-014`, plus dated revisions to earlier ADRs.
Review history that used to live inline in this document now lives in those ADRs. This document
states the contract as it now stands.

---

## 0. How to read this document

Each entity section states the entity's identity, its fields with their derivability, the invariants
that hold for it, and its legal state transitions where relevant.
- §1 defines vocabulary used everywhere else. Read it first.
- §2–§6 are the domain model that both wire contracts are built from.
- §7 is the on-site wire contract; §8 is the live wire contract.
- §6 is the list of what today's sources cannot supply.
- `DERIVATIONS.md` says how each value here is produced from upstream fields. Its §9 lists every
  upstream field deliberately *not* modelled, with the reason.

Derivability tags, used throughout:

- **[D]** Derivable. Stated with its source.
- **[A]** Derivable only approximately. The approximation is part of the value's own semantics and is
  carried in its envelope, never a silent implementation guess.
- **[N]** Not derivable from any source available today. Collected in §6.

**Sources.** Canoe123 is read through exactly two interfaces:
- the **TCP push** (`tcp`), which carries on-course state and event-driven result pushes;
- the **XML snapshot file** (`xml`), which carries the complete record, including facts TCP never
  carries.

CIS is not consumed (`DECISIONS/ADR-011`).

---

## 1. Conventions

### 1.1 Identity and its provenance

Every entity below has an identity field. Two rules apply to all of them:

**On-site, identity may be derived from Canoe123.** Canoe123 is the only on-site upstream, by fixed
topology (`CONSTRAINTS.md` §1.1). Nothing is lost by letting on-site identity lean on it.

**In the live/ingest contract, identity is opaque and provenance-neutral.** A field like `entryId`
or `eventId` is a stable string the contract can key on. The contract does not know or care whether
it was minted by the on-site bridge (true today) or issued by a future central registry (possible
later). The full argument and its cost are in `DECISIONS/ADR-006`. The resulting rule, stated
wherever it bites: never derive the *meaning* of a live-contract identity field from how it was
produced. On-site identifiers taken from Canoe123 (`Id`, `RaceId`) are used verbatim and never
parsed.

### 1.2 The observation envelope

Every value in this contract that comes from the outside world is wrapped. A structural field, such
as an entity's own id, is not.

```ts
type Observed<T> =
  | { state: 'known'; value: T; observedAt: Timestamp; eventTime?: Timestamp;
      source: SourceTag; confidence: 'authoritative' | 'inferred'; provisional: boolean }
  | { state: 'not-yet' }
  | { state: 'unavailable'; reason: UnavailableReason }

type SourceTag = 'tcp' | 'xml' | 'operator-write'
type UnavailableReason = 'not-configured' | 'source-unreachable' | 'not-applicable'
type Timestamp = string   // ISO-8601 with an explicit offset or Z
```

A field's envelope, as delivered, holds the single value the domain layer currently *presents* for
it. §4 defines how that value is chosen. It is not simply whichever observation arrived last.

The fields, precisely:

- **`observedAt`.** When *our own ingest boundary* captured the observation: the moment a TCP message
  or an XML snapshot is received and parsed, never at outbound serialisation. This is the direct fix
  for `EVIDENCE.md` Exhibit 1. It is used for display and staleness only. Merge ordering uses the
  ingest sequence instead (INV-6).
- **`eventTime`.** Present only when Canoe123 gives a real event time for the fact: a start or finish
  time. Upstream sends every event time as a bare time of day on
  Canoe123's own timing clock, with no date and no zone. `eventTime` is built by
  `DERIVATIONS.md` §0.2's rule: the owning Phase's `date`, plus that time of day, plus the venue's
  configured zone. It is expressed on Canoe123's clock and never shifted to the server's clock.
  Canoe123's clock is the official time, and this contract never compares `eventTime` with
  `observedAt`. The gate-judging stamps upstream calls `GateTimes` are **not** event times
  (`DERIVATIONS.md` §9).
- **`source`.** The upstream channel that produced this observation.
- **`confidence`.** Two values only:
  - `authoritative`: the source states the fact directly. Examples are a result-table row, a finish
    time, an operator's entry.
  - `inferred`: the domain layer derived the value from evidence of the fact rather than from an
    assertion of it. Examples are a total computed from on-course time plus gate penalties before any
    result row exists, and a finish recognised from the on-course stream.

  It is deliberately not a numeric score. A numeric score would invite each client to choose its own
  threshold, which is exactly the kind of domain decision this design removes from clients.
- **`provisional`.** `true` while **the value may still move**. That is the case while any of these
  holds:
  - it is an on-course inference not yet superseded by a results-table observation of the same run;
  - it is a result whose judging is incomplete (at least one gate of the Phase's course is still
    blank) and whose run is not yet closed;
  - it is an optimistic write still awaiting its echo (§2.9).

  Otherwise it is `false`. This marks the state honestly in either mode of Canoe123's "ranking with
  incomplete penalties" setting:
  - **setting on:** the first result push can precede the last gate's judgement, and the value stays
    provisional until judging completes;
  - **setting off:** the first push already follows the last gate.

  `provisional` answers "might this still move". `confidence` answers "how was this produced". A
  client needs both and must not conflate them.

**Wire encoding.** `state` is a JSON string discriminant, present on every envelope.
- A `known` envelope always carries `value`, `observedAt`, `source`, `confidence` and `provisional`,
  never `null`. It carries `eventTime` **only when applicable. Otherwise the key is omitted entirely,
  never sent as `null`.**
- `not-yet` carries no other key. `unavailable` carries only `reason`.

The omission rule is deliberate. A decoder may treat a missing `eventTime` and an explicit `null` the
same way. An encoder must never emit the `null`: `null` is a real, meaningful value elsewhere in this
contract (`Gate.penalty`, §2.6). This is the direct fix for `EVIDENCE.md` Exhibit 5.

```json
{ "state": "known", "value": 82.36, "observedAt": "2026-09-15T10:14:02.083Z",
  "eventTime": "2026-09-15T10:14:02.079Z", "source": "tcp", "confidence": "authoritative",
  "provisional": false }
{ "state": "known", "value": "K1M", "observedAt": "2026-09-15T09:00:00.000Z",
  "source": "xml", "confidence": "authoritative", "provisional": false }
{ "state": "not-yet" }
{ "state": "unavailable", "reason": "not-applicable" }
```

`reason` is a closed set, never free text:
- `'not-configured'`: the source that would carry this is not set up. For example, no XML path is
  configured, or no course is defined for the Phase.
- `'source-unreachable'`: the source is configured but not answering right now.
- `'not-applicable'`: the fact does not exist for this entity, permanently and by its nature. For
  example, a forerunner has no registry identity (§2.5), and a heat number does not apply to a race
  without heats.

A `value` that is itself a discriminated union (`Outcome`, §2.6) nests its own `kind` inside `value`,
with no special-casing at the envelope level.

**The trichotomy**, *unknown* / *not yet* / *zero*:

- **`not-yet`.** The fact does not exist yet. Examples: an `Attempt` before its start; the run-scoped
  fields of a new run generation (§2.6).
- **`unavailable { reason }`.** Nothing configured can supply the fact, or it does not apply. This
  state is reserved for exactly that. It is **never** used because the latest message simply did not
  mention the field (INV-1, INV-3).
- **`known { value: 0 }`.** A real, asserted zero. It is structurally distinct from both of the
  above, which is the fix for `EVIDENCE.md` Exhibit 5.

### 1.3 Units and encodings

- **Durations** are in **seconds**, decimal. Upstream units differ by interface. TCP sends formatted
  seconds. The XML snapshot sends integer milliseconds for times and totals, and integer seconds for
  penalties. The domain layer normalises at ingest, once (`DERIVATIONS.md` §0.1).
- **Dates** are `YYYY-MM-DD`. **Timestamps** are full ISO-8601 with an explicit offset or `Z`.
- **Bibs** are strings, trimmed of upstream's padding before they are used anywhere. Result-table bibs
  arrive padded to four characters (`DERIVATIONS.md` §0.1).
- **Gate penalties** are an integer number of seconds, or `null` for not yet judged or passed. `null`
  is never coerced to `0`. A single-crew boat's value is always `0`, `2` or `50`. A team's value is
  the sum over its members (§2.6).
- **No field carries natural-language text describing domain state.** Status, format, round and
  discipline are closed or opaque identifiers. A human-readable label is a client-side lookup, in
  whatever language the client chooses. This generalises the fix for `EVIDENCE.md` Exhibit 8.
  **Organiser-authored text is different.** An event title, a class name or a race title is data the
  organiser typed, like a competitor's name. It is carried verbatim and never generated by the domain
  layer. Canoe123's own localised labels, such as round subtitles and warnings, are not carried
  (`DERIVATIONS.md` §9).

### 1.4 Errors

One envelope, shared by §7 and §8, so a bridge or client author handles rejection once, not per
endpoint:

```json
{ "error": { "code": "phase-not-found", "message": "no Phase K1M_ST_BR3_6 in this event" } }
```

**`code` is the contract; `message` is not.** `code` is a closed, kebab-case identifier — a test
asserts against it, and it cannot change without a breaking-change bump. `message` is for logs and a
human reading them; it may be reworded at any time without that being a breaking change, and no
client may parse it. Codes used anywhere in §7 or §8, each with the HTTP status it always carries:

| `code` | HTTP status | Where |
|---|---|---|
| `event-not-found` | 404 | §7 (no event configured yet), §8.4 |
| `class-not-found` | 404 | §7, §8.4 |
| `course-not-found` | 404 | §7, §8.4 |
| `phase-not-found` | 404 | §7, §8.4 |
| `attempt-not-found` | 404 | §7 writes — `phaseId`/`bib` don't resolve to a known Attempt |
| `write-not-found` | 404 | §7 |
| `validation-failed` | 400 | both — malformed body; carries `error.details: [{field, issue}]` |
| `vendor-payload-rejected` | 400 | §8.6 — a raw vendor export where a structured resource was required |
| `unauthorized` | 401 | §8 — missing or unrecognised `X-API-Key` |
| `forbidden` | 403 | §8 — key recognised but revoked or suspended |
| `rate-limited` | 429 | §8.3 — carries an HTTP `Retry-After` header, seconds |

§7 has no `unauthorized`/`forbidden` — the on-site network is trusted (`CONSTRAINTS.md` §1.2, venue
LAN), and no operation in §7 requires a credential, matching today's precedent.

### 1.5 Idempotency

**`PUT` (§8.3) is idempotent by construction, per INV-5 — no header, no special casing.** Retrying an
identical body any number of times is always safe: the domain layer retains it per source and merges
it by §4's precedence rules regardless of how many times the same observation arrives. A retried `PUT`
returns `200` with the current resolved resource every time, whether the body was new, a duplicate,
or superseded by something else in the interim — a client never needs to distinguish these cases to
know the retry was safe.

**`POST` (§7 writes) is not naturally idempotent — each call means "submit a new correction" — so it
requires a client-supplied `Idempotency-Key` header,** an opaque string the client generates once per
correction attempt (a UUID is sufficient). The server retains the mapping from key to the
`WriteRequest` it produced for at least 24 hours. A retry with the **same** key returns `200` with
that same `WriteRequest`, whatever its current `status`, and never submits a second command upstream.
A **different** key is always a new correction, even against the same field — a judge revising their
own just-submitted correction is a second legitimate `WriteRequest`, not a retry, and gets its own.

### 1.6 Snapshot and subscription ordering

Every push-capable stream (§7's WebSocket, §8.4's public feed) assigns each outbound message a
connection-scoped, strictly increasing integer, `seq` — drawn from the same internal ingest sequence
INV-6 (§4) requires, but exposed here for a narrower purpose than INV-2's precedence: `seq` only lets
a client tell whether it has already incorporated a given update, the way a log offset or a database
WAL position would. It carries no ranking or authority information and a client must not treat it as
one — precedence among sources is entirely the domain layer's decision (§4), settled before anything
reaches the wire.

**The handshake this fixes** (found in adversarial review, not designed in from the start): a
snapshot fetched over REST and a subscription opened afterward leaves a gap — any update landing
between the two calls is in neither. So every hydration/snapshot response carries a top-level
`asOfSeq: number`, and the required sequence is:

1. Open the stream connection first.
2. Buffer every message received, by `seq`, without applying it yet.
3. Request the snapshot.
4. On the snapshot response, discard every buffered message with `seq ≤ asOfSeq` — already reflected
   — and apply the rest, in `seq` order.
5. Apply every subsequent message as it arrives, ordinarily.

Both on-site client applications and the public spectator client are required to implement this; §7
and §8.4 each restate only the connection-specific detail, not this sequence.

### 1.7 Machine-readable schemas — scoped narrowly, deliberately

`docs/arch/schemas/observed.schema.json` and `error.schema.json` are real JSON Schema, not
illustration — every envelope and every error response in §7 and §8 validates against one of them.
They exist because these two shapes appear in nearly every response either contract sends, so a
single machine-checkable definition of each is worth more than the same prose repeated at every use
site staying in sync by discipline alone.

**Deliberately not done: a full OpenAPI document for every operation in §7 and §8.** Every endpoint
below is already a table — method, path, request shape, response shape, status codes — precise enough
to write a test from without reading an implementation, which is the bar this pass was set. A parallel
OpenAPI file would restate that same information a second time, in a second format, before a line of
server code exists to generate it from — and this design has already been revised three times under
active review in the course of one week; a second representation of every endpoint is a second place
each future revision must land correctly, across five separate repositories, for a benefit (schema-
driven test/client generation) nobody has asked for as a deliverable. If that changes once server-side
implementation begins, generating OpenAPI *from* the implementation's route definitions is the better
order to do it in — describing what was built, rather than a second hand-maintained forecast of it.

---

## 2. Domain entities

```
Organiser (cloud tenant only)
  └─ Event
       ├─ Course            (referenced by Phases, §2.12)
       └─ Class             (K1M, C1W… carries discipline and its age categories)
            ├─ Entry        (one competitor or crew within the Class, 1..N members)
            └─ Phase        (one Canoe123 race: a run, a round, or a classification)
                 └─ Attempt (keyed by phaseId + bib; carries a run generation)
Standing — assembled per scope (phase, pair, heat, classification) × (whole class | one age category)
```

### 2.1 Organiser

The cloud-tier tenant boundary (`CONSTRAINTS.md` §1.7). It is not modelled on-site at all: an on-site
deployment is single-tenant by fixed topology.

```ts
type Organiser = { organiserId: string; name: string }
```

**Invariant:** every `Event` belongs to exactly one `Organiser`. Every write to an event's data is
authorised by a credential that resolves to that organiser (§8.1). The public read contract (§8.4)
never requires knowing which organiser owns an event.

### 2.2 Event

```ts
type Event = {
  eventId: string                  // opaque, §1.1
  organiserId: string              // cloud tier only
  name: string                     // organiser-authored title
  details: Observed<EventDetails>  // [D] xml
}
type EventDetails = {
  subtitle?: string; venue?: string; facility?: string
  startDate: string; endDate: string   // as the organiser entered them in Canoe123 — fallible
}
```

**Event identity is asserted, never discovered.** The on-site bridge mints `eventId` and persists it
across days (Scenario E, `ARCHITECTURE.md`). A future central registry could issue it instead
(`DECISIONS/ADR-006`).

- **The event title** defaults to the snapshot's own title. It is organiser-authored text (§1.3).
- **Upstream's own event id** in the snapshot is **not** exposed. It is an input to the operational
  check "is this still the same Canoe123 event" (`ARCHITECTURE.md` Scenario E), never an identity.

**Both file layouts must work.** An organiser may keep one Canoe123 file per race day, or one file for
a whole multi-day event. The snapshot of a multi-day file carries the event's date range and dated
races for every day. It carries the next day's start lists the evening before. Nothing in this
contract assumes either layout.

- **Day grouping** comes from each Phase's own `date` (§2.4), never from `details.startDate`/`endDate`.
  Those are operator-entered, and one recorded event's range was off by a day.

**Invariant:** `eventId`, once minted, never changes and is never reused for a different competition.
Starting a genuinely new competition on the same laptop is a deliberate operator action, never
inferred from a changed source.

### 2.3 Class

A class of boat and competitor, such as K1M or C1W. It is exactly one Canoe123 class. **Renamed from
`Category`** (`DECISIONS/ADR-014`): in both Canoe123 and ICF usage, "category" means an age band, and
here it means only that.

```ts
type Class = {
  classId: string                          // = Canoe123 ClassId, verbatim — [D]
  eventId: string
  code: string                             // = classId; opaque, never translated
  name: Observed<string>                   // organiser-authored class title — [D] xml, tcp
  discipline: 'slalom' | 'cross'           // [D] structural, from the formats of its Phases
  ageCategories: Observed<AgeCategory[]>   // [D] xml; empty list where the event uses none
}
type AgeCategory = { ageCategoryId: string; name: string }   // Canoe123 CatId and its name
```

- **`classId` is read from Canoe123's class field, never from a `RaceId` prefix.** For a hyphenated
  class the two differ (`K1M-ST` against `K1M_ST`).
- **Canoe123 lists pseudo-classes, which are never Classes.** One means "not assigned". The race
  staged with the literal id `<unassigned>` is likewise never a Phase (`DERIVATIONS.md` §0.3).
- **`discipline`** is exposed explicitly, because two structurally different things hang off it: the
  `Outcome` variant (§2.6), and the finish strategy (`DECISIONS/ADR-009`).

**Age categories are relayed, never computed** (`DECISIONS/ADR-014`). At national events every class
contains age categories. Canoe123 assigns each entry to one, from its own year-based rule. The rule is
federation matter and is not ours to apply. Age-category standings are official results and
first-class: they are shown *alongside* the class standing, not instead of it (§5).

### 2.4 Phase

One Canoe123 race: exactly one `RaceId`. A Phase is a run, a round, or a classification.

```ts
type Phase = {
  phaseId: string                     // = Canoe123 RaceId, verbatim — [D]
  classId: string
  format: string                      // upstream's format token, verbatim, open vocabulary — [D]
  kind: 'race' | 'classification'     // [D] structural, from format
  scoringKind: 'duration' | 'ordinal' // [D] structural, from format
  pair: PairRole | null               // [D] structural, from format and schedule
  heats: boolean                      // [D] structural, from format
  date: string                        // YYYY-MM-DD, assigned once, immutable — INV-5
  courseId: Observed<string>          // [D] xml; not-applicable for a classification
  scheduledStart: Observed<Timestamp> // [D] xml, the scheduled start
  programmeOrder: Observed<number>    // [D] tcp, xml — position in the event's running order
  title: Observed<string>             // organiser-authored race title, where set — [D] xml
  status: Observed<PhaseStatus>       // [D] — §3.1
}
type PairRole = { role: 'first' | 'second'; siblingPhaseId: string; combination: 'best' | 'sum' }
```

**`format` is open** (maintainer answer Q6; `DECISIONS/ADR-014`). Every format Canoe123 supports is
representable, even where live results do not implement it yet. The known tokens map to structural
properties as follows. All of this is E1, from the upstream format vocabulary and upstream's own
pairing and combination behaviour.

| Upstream format tokens | `kind` | `pair` | `scoringKind` | `heats` |
|---|---|---|---|---|
| `BR1`/`BR2` (best-run slalom), `HT1`/`HT2` (international heats), `EL1`/`EL2`, `TR1`/`TR2` | race | first / second, `combination: 'best'` | duration | no |
| `NHT2` | race | second of a pair where upstream defines one, `'best'` | duration | no |
| `SR1`/`SR2` and any other paired second run | race | first / second, `combination: 'sum'` | duration | no |
| `QF`, `SF`, `SFB`, `FI`, `FIB`, `SP1`, `SP2`, `SPF`, `TSR`, `XT`, `XT1`, `XT2` and single-run tokens generally | race | `null` | duration | no |
| `X8`, `X4`, `XS`, `XF` (Kayak Cross head-to-head) | race | `null` | ordinal | yes |
| `XER` (Kayak Cross final classification) | classification | `null` | ordinal | no |
| any unknown token | race | `null` | duration | no |

**Pairing.**
- A second run names its first by class and format: `BR2` pairs with the same class's `BR1` on the
  same day, and likewise for `HT`, `EL`, `TR` and `SR`.
- `combination` is `'best'` exactly for `BR2`, `HT2`, `NHT2`, `EL2` and `TR2`. Upstream sums both runs
  for every other second run.
- The tokens `QUA`/`SEM`/`FIN`, which appeared in an earlier draft of this contract and in the
  protocol documentation, **do not exist upstream**.
- Two further pairings exist upstream: a super-final following a second run, and a final following a
  semi-final under a legacy-finals setting. Neither is modelled yet. This is recorded as an open
  technical question (`DERIVATIONS.md` §10).

**`XER` is a classification, not a round.** Its rows are upstream's final classification of the whole
Cross event. Each row says which round decided that athlete's place. A classification Phase holds no
Attempts; it feeds a `classification` Standing (§2.7). Other upstream tokens that look like event
rankings (`RXER`, `SLER`, `WWER`) stay "unknown" until checked (E4, `DERIVATIONS.md` §10).

**`date` is assigned once and never changes**, even if a correction to the Phase's results is pushed a
week later. That is what keeps multi-day grouping correct under late correction.

### 2.5 Entry

A competitor within a Class: one athlete, crew or team, persistent across every Phase of that Class.

```ts
type ExternalId = { scheme: string; value: string }   // scheme: open string, e.g. 'icf', 'cz-rgc'

type Person = {
  givenName: string
  familyName: string
  birthDate?: string                  // YYYY-MM-DD as entered upstream; see "Birth date" below
  externalId: ExternalId | null       // null = no registry identity at all (not-applicable)
}

type Entry = {
  entryId: string                     // opaque, §1.1 — on-site, Canoe123 Id verbatim, never parsed
  classId: string
  displayName: Observed<string>       // upstream's pre-assembled name, or a team's name — [D]
  members: Observed<Person[]>         // 1..N — [D] xml
  club: Observed<string>              // [D] xml, tcp
  nation: Observed<string>            // [D] xml — see "Nation" below
  ageCategoryId: Observed<string>     // [D] xml; not-applicable where the class has no age categories
  eventBib: Observed<string>          // [D] xml; not-applicable where bibs are issued per race
}
```

- **`entryId` is opaque, full stop.** It is never parsed for class, category or crew (#171).
  - It is stable only within one event. The same athlete can have a different `Id` at an event that
    splits classes differently.
  - It identifies a competitor within this event, never a person. Cross-event identity is each
    member's `externalId`.
- **Members.** `members` is the crew shape the earlier `icfId`/`icfId2` pair stood in for
  (`DECISIONS/ADR-014` point 7).
  - A single boat has one member.
  - A two-person crew has two. The second member's names, birth date and registry number come from
    the participant record's own second-member fields.
  - A team or patrol has its members resolved from upstream's member references against the
    participant records. The references are ids in the snapshot, and are never parsed.
  - A team's own registry number is synthetic, references no registry, and is not carried.
- **External identity, per person** (#171, `DECISIONS/ADR-006`, Revisions 1–3).
  - It is read from the participant record's own registry-number elements, never from inside `Id`.
    `Id` is frozen at registration and can disagree with who is actually in the boat.
  - It is always qualified by `scheme`, because the same element holds different registries at
    different events. A Czech national race fills it with national registry numbers, while a foreign
    entrant may carry an ICF code.
  - Which registry a value belongs to is **[N]** from Canoe123's data. The operator of the bridge
    asserts it from configuration (§6).
  - A person with no registry identity at all has `externalId: null`. This applies to forerunners,
    placeholders, and unregistered or foreign entrants. Such a person is an ordinary participant, fully
    renderable in seeding order, never a degraded one.
- **Birth date** (maintainer answer Q4). The on-site contract (§7) carries only the **birth year**:
  no venue consumer needs the day, and the year is what places an athlete in an age category. The
  live ingest contract (§8.3) carries the birth date as entered, often `YYYY-01-01` with only the year
  meaningful. Whether the live store keeps it, and whether it is ever published, is live-client
  configuration, not a contract rule.
- **Nation.** Upstream's nation code, relayed as a string. At events where the competing units are
  regions, organisers legitimately fill it with regional codes. At national events, a foreign
  entrant's country may appear only inside the club name. A client must not assume `nation` is always
  a country, for example by rendering it as a flag.
- **Club and nation suppression.** Upstream's on-course stream blanks club or nation according to the
  event's club-usage setting. The results stream and the snapshot do not. `club` and `nation` are
  therefore derived from the snapshot and results rows only (`DERIVATIONS.md` §3).
- **Bibs.**
  - `eventBib` is present only where the event issues bibs event-wide. Where bibs are issued per race,
    it is `unavailable{not-applicable}`: all 124 competitors of one recorded Cross event changed bib
    between rounds.
  - The bib that identifies a run is always `Attempt.bib` (§2.6).

### 2.6 Attempt

One Entry's participation in one race Phase: the unit with a lifecycle.

```ts
type Attempt = {
  attemptId: string                    // = `${phaseId}:${bib}`
  phaseId: string
  bib: string                          // this race's bib, trimmed — structural identity
  entry: Observed<{ entryId: string }> // mutable pointer (INV-4)
  run: Observed<number>                // run generation, 1-based — DECISIONS/ADR-013
  startOrder: Observed<number>         // [D] tcp, xml
  scheduledStart: Observed<Timestamp>  // [D] slalom; not-applicable in Cross
  heat: Observed<number>               // [D] Cross heats; not-applicable otherwise
  startLane: Observed<number>          // [D] Cross heats; not-applicable otherwise
  status: Observed<AttemptStatus>      // §3.2
  outcome: Observed<Outcome>
  gates: Observed<Gate[]>              // not-applicable in Cross (see faults)
  splits: Observed<Split[]>            // [D] where splits are armed; not-applicable otherwise
  faults: Observed<Faults>             // Cross only; not-applicable in slalom
  courseOrder: Observed<number>        // on course only: 1 = closest to the finish — [D] tcp
  timeToBeat: Observed<TimeToBeat>     // on course only — [D] tcp
  placement: Observed<Placement>       // upstream's rank and order — §5
  pairTotal: Observed<number | null>   // second run of a pair only: the combined result, seconds
  countingRun: Observed<1 | 2>         // second run of a 'best' pair only: which run counts
  underReview: Observed<boolean>       // upstream's "under review" mark
  qualified: Observed<boolean>         // progression mark (Q); not-applicable where unused
}

type AttemptStatus =
  | 'not-started' | 'at-start' | 'on-course' | 'finished' | 'non-ranked'
  | 'dns' | 'dnf' | 'dsq' | 'dsq-r' | 'dqb' | 'cap' | 'ral' | 'other'

type Outcome =
  | { kind: 'pending' }                                                    // nothing yet
  | { kind: 'running'; elapsedSeconds: number; penaltySeconds: number }   // on course, ticking
  | { kind: 'duration'; runSeconds: number; penaltySeconds: number; totalSeconds: number }
  | { kind: 'ordinal'; order: number }                                     // Cross, within heat
  | { kind: 'no-result'; status: 'dns' | 'dnf' | 'dsq' | 'dsq-r' | 'dqb' | 'cap' | 'ral' | 'other' }

type Gate = { number: number; penalty: number | null; memberPenalties?: (number | null)[] }
type Split = { number: number; elapsedSeconds: number }
type Faults = { count: number; gates: string[]; lastCleanGate: number }  // gate captions as upstream names them
type TimeToBeat = { mode: 'target' | 'delta'; seconds: number; holder?: string }
type Placement = { rank: number | null; order: number }
```

**Identity is `(phaseId, bib)`.** What is physically stable is the fact that whoever wore bib 9 went
down the course in this race. *Who* that was is the correctable assertion `entry`: a competitor can
turn out, even a week later, to have raced under the wrong bib.
- The bib is this race's bib. Per-race bib issue does not disturb the key, because the key never
  claimed stability across Phases.
- Two kinds of collision cannot happen:
  - Kayak Cross's four simultaneous competitors are the same Phase with different bibs;
  - two classes reusing a bib number are different Phases.

**Run generation** (`DECISIONS/ADR-013`, maintainer answer Q2). A re-run deletes the recorded result,
and the run is raced again. Meanwhile, it looks as if the athlete never did that run.
- `run` increments on explicit upstream evidence of a re-run. That is either a new start observed
  for a bib whose run was already recorded, or the recorded result row cleared.
- On increment, every run-scoped field becomes `not-yet`, and the change is pushed:
  - `status`, `outcome`, `gates` and `splits`;
  - `faults`, `placement`, `pairTotal` and `countingRun`;
  - `underReview`, `qualified`, `courseOrder` and `timeToBeat`.
- The old result is **not** shown while the re-run happens. A client that wants to say "re-run" reads
  `run > 1`.

**Outcome, by phase of the run.**
- **`pending`:** nothing yet.
- **`running`:** on course. It carries upstream's own ticking running time and penalties so far
  (#166). It is displayed as upstream displays it, including upstream's split-hold behaviour
  (`DERIVATIONS.md` §4.3).
- **`duration`:** a slalom run's own time, penalties and total. On a second run of a pair, this is
  **run 2's own** figures. The combined result is `pairTotal`.
- **`ordinal`:** Cross. The athlete's order within the heat, **taken from upstream's placement, never
  from `Time`.** Athletes with faults rank after every clean finisher, whatever their finish order
  (`DECISIONS/ADR-009` addendum).
- **`no-result`:** a result mark that removes the run from the ranking.
- The earlier draft's gap, where running time had no shape (#166), is closed by the `running`
  variant. A client never has to cross-reference `status` to know whether a value is still
  accruing.

**Marks.**
- `status` carries upstream's full result-mark vocabulary (`DERIVATIONS.md` §4.1).
  - `non-ranked` raced and has a time, but is excluded from the ranking.
  - `ral` is placed last; placement says where.
  - `dsq-r` and `dqb` are distinct disqualifications that the earlier draft lost into `other`.
- **In a second run of a pair, a mark describes run 2 only.** The athlete keeps a combined placement
  from run 1. For example, one athlete was marked `dns` for run 2 and ranked 110th. `placement` and
  `pairTotal` carry that, independently of `status`.
- **`underReview`** is upstream's "under review" mark, shown as an asterisk on upstream's own output.
  It is first-class (maintainer answer Q7): clients show it on the scoreboard and in live results.
  It is independent of `provisional`:
  - `underReview` means an official is holding the result;
  - `provisional` means judging may still move it.

  Both can be true at once.

**`gates` is position-correct by construction.** Upstream encodes gate penalties in two different
string formats (`DERIVATIONS.md` §4.6). The domain layer owns gate numbering centrally, and a client
never sees a raw string. `gates` has exactly the Phase's course gate count. Where no course is
configured, `gates` is `unavailable{not-configured}`: upstream then fabricates a 25- or 30-gate grid
(§2.12), and relaying it would invent gates. `outcome.penaltySeconds` still carries upstream's own
penalty sum. A team boat's `penalty` is the sum over its members, with `memberPenalties` alongside.

**On-course facts.**
- **`courseOrder`** is upstream's on-course position: 1 is closest to the finish (#166).
  `/api/oncourse` is ordered by it (§7.1). It is the only way to order Kayak Cross's four
  simultaneous competitors (`DECISIONS/ADR-009` addendum).
- **`timeToBeat`** is upstream's comparison with the leader:
  - an unsigned **target** time on approach to a split or the finish;
  - a signed **delta** at a split, at the finish, or at the start of a second run;
  - `holder` is the leader's short display name, organiser data.

  It is **not** a rank.
- Upstream's on-course rank field is not used for `placement`. At the start of a second run it
  carries the *first* run's rank.

**Finish is a per-discipline strategy** (`DECISIONS/ADR-009`).
- **Slalom:** the finish-time transition on the on-course stream. The authoritative source is
  Canoe123's own finish time. There is no fallback. Upstream shows a split time with decimals during
  a split hold, so a whole-seconds-to-decimals change is not a finish, and the downstream highlight
  signal is our own derivative, not an upstream one.
- **Cross:** no per-competitor finish signal exists on the on-course stream. The heat order is the
  operator's assertion, entered after conferring with the finish judge. It reaches us as ordinary
  results-table observations: `source` is the channel it arrived on, `tcp` or `xml`, with
  `confidence: 'authoritative'`. It is pushed on, un-debounced, the moment it is ingested.
  - An earlier draft tagged this `operator-assertion`, a source outside the merge rules. That was
    wrong. It let a stale snapshot row, ingested later, displace a fresher TCP push of a corrected
    order. The human origin of the fact is semantics, not a separate channel.

### 2.7 Standing

Assembled, not primary state, and never ranked by us (`DECISIONS/ADR-012`). §5 specifies the
assembly precisely.

```ts
type Standing = {
  standingKey: string          // stable key of (scope, ageCategoryId) — §5
  classId: string
  scope: { kind: 'phase'; phaseId: string }
       | { kind: 'pair'; firstPhaseId: string; secondPhaseId: string }
       | { kind: 'heat'; phaseId: string; heat: number }
       | { kind: 'classification'; phaseId: string }
  ageCategoryId: string | null // null = the whole class
  asOf: Timestamp
  entries: StandingEntry[]
  anomalies: Anomaly[]
}

type StandingEntry = {
  entryId: string
  bib: string
  rank: number | null          // relayed; age-category rank assembled — §5
  order: number | null         // null until placed
  result: Outcome              // the Attempt's own outcome (for a pair: the second run's own)
  pairTotalSeconds?: number | null // pair scope only: the combined result the placement is based on
  behindSeconds: number | null // this entry's ranked value minus the leader's; duration scopes only
  provisional: boolean
  underReview: boolean
  decidedIn?: string           // classification scope only: the format of the round that placed the athlete
}

type Anomaly =
  | { kind: 'order-disagreement'; entryId: string; aheadOfEntryId: string }
  | { kind: 'category-rank-disagreement'; entryId: string; assembled: number; upstream: number }
```

### 2.8 Source status

Diagnostic and admin-facing only. Per maintainer answer A1, a missing source must not nag.

```ts
type SourceStatus = {
  tcp: { state: ConnState; upstreamInstance: 'main' | 'backup' | 'offline' | null;
         timingClockOffsetSeconds: number | null }
  xml: { state: ConnState | 'not-configured'; lastRewriteDetectedAt: Timestamp | null }
}
type ConnState = 'connected' | 'reconnecting' | 'unreachable'
```

**`upstreamInstance`** reports which Canoe123 instance the TCP feed comes from. Every upstream message
states it. Switching to a backup instance is the timekeeper's manual work: the server is re-pointed by
hand (maintainer answer Q8). Automatic failover is **out of scope**. The field exists only so the
admin UI can show which instance is live.

**`timingClockOffsetSeconds`** is the offset of Canoe123's timing clock from the server clock,
measured from upstream's once-a-second time-of-day message. It is a diagnostic only. Nothing is ever
corrected by it (§1.2 `eventTime`).

### 2.9 Write request

The contract's answer to Scenario B and to maintainer answer A6: there is no timeout policy
(`DECISIONS/ADR-010`).

```ts
type WriteRequest = {
  writeId: string
  target: { phaseId: string; bib: string; run: number; field: 'gate-penalty' | 'status' }
  requestedValue: unknown
  submittedAt: Timestamp
  status: 'pending' | 'confirmed' | 'mismatched' | 'superseded'
  confirmedValue?: unknown
  confirmedAt?: Timestamp
}
```

- **`pending` persists until an echo of the same field, for the same run generation, is ingested.**
  - If the echo matches, the status is `confirmed`.
  - If it differs, the status is `mismatched`.
  - If the targeted generation is replaced by a re-run first, the status is `superseded`
    (`DECISIONS/ADR-013`).
- No state is reached by the passage of time alone. A client may compute "pending for N s" from
  `submittedAt`.

**Writes may target a closed Phase** (maintainer answer A2). Canoe123's correction command carries an
explicit race id and works after completion. The contract only requires that closed-phase writes are
accepted and tracked identically to current-phase ones.

### 2.10 Verification state

Penalty-check's own workflow bookkeeping: whether a judge has compared a displayed penalty against
the paper protocol. It is not a sport-domain fact. It is stored on the server so every tablet shares
it.

```ts
type VerificationState = {
  attemptId: string; run: number; gate: number
  checked: boolean; checkedBy?: string; checkedAt?: Timestamp
}
```

- **It is keyed on the domain's own identity, plus the run generation.** A check of an earlier run's
  penalty never carries over to a re-run (`DECISIONS/ADR-013`).
- **It must be durable across restart.** Nothing upstream can reconstruct it. Everything else is
  recoverable from the XML snapshot in one read.

### 2.11 Worked example: the envelope through a finish

Take `Attempt` `K1M_BR2_6:9`, a second run that beats the first. The event runs Canoe123 with ranking
on incomplete penalties (values illustrative).

```ts
// t+0.0s — on-course finish-time transition. Our computation from on-course time + gates so far.
outcome:   { state:'known', value:{kind:'duration', runSeconds:82.36, penaltySeconds:0, totalSeconds:82.36},
             observedAt:'…T10:14:02.083Z', eventTime:'…T10:14:02.079Z',
             source:'tcp', confidence:'inferred', provisional:true }
status:    { state:'known', value:'finished', eventTime:'…T10:14:02.079Z', source:'tcp',
             confidence:'authoritative', provisional:false, … }

// t+0.3s — event-driven result push for this race (Current="Y"). A results-table observation now
// supersedes the inference (INV-2). Gate 14 is still blank, so it stays provisional.
outcome:   { …, source:'tcp', confidence:'authoritative', provisional:true }
placement: { state:'known', value:{ rank:3, order:3 }, source:'tcp', confidence:'authoritative',
             provisional:true }                       // the combined better-run rank
pairTotal: { state:'known', value:82.36, … provisional:true }

// t+2.1s — the judge enters gate 14 = 2. Upstream recalculates and pushes again.
outcome:   { value:{…, penaltySeconds:2, totalSeconds:84.36}, provisional:false, … }
placement: { value:{ rank:4, order:4 }, provisional:false, … }

// t+~35s — the XML snapshot is rewritten with the same row. TCP has stayed connected since t+2.1s,
// so the tcp observation remains presented (INV-2). No change, no push.

// Run 1's Attempt "K1M_BR1_6:9" is untouched throughout (INV-1). Its own fields are never mentioned
// by run 2's messages.
```

### 2.12 Course (#165)

A course layout. It is referenced by Phases, not owned by one: several races run on one course.

```ts
type Course = {
  courseId: string                       // Canoe123 course number — [D] xml only
  eventId: string
  layout: Observed<string>               // upstream's layout string, one char per element
  gates: Observed<{ number: number; kind: 'downstream' | 'upstream' }[]>
  sectorEndsAfterGate: Observed<number[]>
  splitsAfterGate: Observed<number[]>
  captions: Observed<string[]>           // [D] tcp only, current course only
}
```

**The layout string is the single truth.** Everything else is derived from it (`DERIVATIONS.md`
§2.3):
- **Gates:** `N` is a downstream gate and `R` an upstream gate.
- **`S` marks a sector boundary**, not a split.
- **`I` marks a split (intermediate) timing point**, not a sector. Upstream reports separately whether
  splits are armed; an unarmed split yields no split times.

Settled against observed upstream behaviour, after three wrong readings of a recording (#165).

- **Gate count comes from the layout. Upstream's transmitted gate count is ignored.** The stream
  fabricates a 25- or 30-gate course, silently and lastingly, when no layout is configured.
- A Phase whose course has an empty layout has `Course.gates` as `unavailable{not-configured}`, and so
  does its Attempts' `gates` (§2.6).
- **Only the snapshot carries course numbers.** TCP describes only the currently selected course,
  without its number. It is used only to refresh that course, and for the captions, which only TCP
  sends.
- The meaning of the layout letters `D` and `E` for gate numbering is an open technical question
  (`DERIVATIONS.md` §10). Until it is settled, they are carried in `layout` only.

---

## 3. State machines

### 3.1 `Phase.status`

Canoe123's 14-value race status is collapsed into a closed set, once, centrally, never left to each
client (`EVIDENCE.md` Exhibit 10).

| Closed value | Canoe123 race status values mapped |
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
| `other` | any value outside the 14 |

**Legal transitions:**
- `scheduled → running`, `running ⇄ paused`, `running → unofficial`;
- `unofficial ⇄ revised`, `unofficial → official`, `official → revised` (without passing back
  through `unofficial`);
- any state `→ protested`, and `protested → unofficial | official`;
- `scheduled → cancelled | postponed`.

No state is final.

**A client must never infer a correction from this field.** Upstream sets race status only by direct
operator action in its own UI. Penalty corrections never touch it (observed upstream behaviour). The
reliable signal that a Phase's results changed is ordinary field-level change: an Attempt's `outcome`,
`gates` or `placement` presenting a newer observation.

### 3.2 `Attempt.status`

- **The normal path:** `not-started → at-start → on-course → finished`.
  - `at-start`: staged in the start gate, armed for the start impulse and not yet started. It is 8% of
    on-course traffic in recordings, and #166 had no status for it.
  - `not-started → on-course` directly is legal too, when staging is not observed.
- **No-results:**
  - `not-started | at-start → dns`;
  - `on-course → dnf | dsq | dsq-r | dqb | cap | ral | other`.
- **Post-finish decisions and corrections:**
  - `finished → non-ranked | dsq | dsq-r | dqb | ral | other`;
  - any no-result status `→ finished`, when a mark is withdrawn.
- **Re-run** (`DECISIONS/ADR-013`): `finished` or any no-result status `→ at-start | on-course`,
  **only together with a `run` increment.** This is the one transition that retracts known facts. It
  is explicit and observed, never inferred from omission.

**Monotonic within a run generation** (§4 INV-1). A message that does not mention this Attempt never
reverts its status.

---

## 4. Merge and time invariants

These are the contract's answer to `EVIDENCE.md` Exhibit 1. They are invariants a merge
implementation must satisfy, not an algorithm.

**Kinds of observation.** Every observation of an Attempt fact is one of three kinds:
- an **on-course inference**, computed by the domain layer from the TCP on-course stream;
- a **results-table observation**: a TCP result push, or an XML snapshot row. Both are renderings of
  Canoe123's own results table;
- an **operator write** (`operator-write`).

- **INV-1 (monotonic knowledge, per run generation).** A field's `state` never regresses from `known`
  to `not-yet` or `unavailable` because a later message omits it. Merge is per field, never
  whole-object. The single exception is a new run generation (`DECISIONS/ADR-013`). It retracts the
  run-scoped fields (§2.6) explicitly, on observed upstream evidence of a re-run, and is pushed as an
  ordinary change.
- **INV-2 (precedence).** The domain layer retains the latest observation *per source* for each field.
  The presented value is chosen as follows:
  1. **A results-table observation supersedes an on-course inference** of the same run generation, and
     is never superseded by one. The inference exists only for the fraction of a second before the
     result push arrives (`DECISIONS/ADR-011` gives the measured latency).
  2. **Between `tcp` and `xml` results-table observations of the same field, `tcp` wins while TCP has
     stayed connected since that `tcp` observation was ingested.** Canoe123 pushes every change to its
     results table on TCP immediately:
     - finish, every penalty change, and the last gate judged;
     - corrections, including to closed races;
     - closure of a run;
     - the paired second race whenever the first changes.

     So a connected TCP is never behind the snapshot. **Otherwise the later-ingested observation
     wins.** This covers two cases:
     - During an outage, a snapshot rewrite *detected after the disconnect* takes over.
     - After reconnection, TCP's pre-outage observations no longer outrank a snapshot that was read
       later.

     The second case fixes a defect in the previous rule. There, a correction visible in the snapshot
     during an outage stayed hidden until TCP's rotation came round again, which takes up to ~15 min.
  3. **Facts only one source carries** use that source alone:
     - on-course facts, `courseOrder`, `timeToBeat`: TCP only;
     - the superseded run's summary, age categories, members, event details, course numbers:
       the XML only.
  4. **`operator-write` sits outside rules 1–3.**
     - **`provisional: true`** is an optimistic write awaiting one specific echo (§2.9). It is
       presented the instant it is submitted. The very next results-table observation of that field,
       for that run generation, supersedes it.
     - **`provisional: false`** is an assertion with no echo expected. Examples are a direct
       correction against the cloud store after the on-site session ended (§8.5). A later assertion of the same kind supersedes it. So does a
       results-table observation that **changes** its own source's retained value after the
       assertion: genuinely new upstream information. A re-delivery of the value that source already
       held never displaces an assertion (INV-5).
- **INV-2b (disagreement is surfaced, never silently adopted).** A retained, non-presented observation
  can disagree with the presented one after both have settled. Such a disagreement is surfaced as an
  admin diagnostic,
  `{ kind: 'source-disagreement'; attemptId: string; field: string; sources: SourceTag[] }`, served by
  `GET /api/diagnostics` (§7.1), the same audience as `SourceStatus`. It never changes the presented
  value by itself. There is no
  re-query: no on-demand source remains (`DECISIONS/ADR-011`), and neither remaining source can hold
  a correction back.
- **INV-2c (an older event does not displace a newer one).** Where the presented value and a candidate
  both carry an `eventTime`, a candidate with a strictly earlier `eventTime` never supersedes,
  whatever rule 2 says. In practice this protects a re-run: the re-run's finish is later than the run
  it replaces, so a stale row describing the replaced run cannot come back (`DECISIONS/ADR-013`).
- **INV-3 (`unavailable` is asserted, never defaulted).** `unavailable{reason}` is set only by an
  explicit determination that the fact cannot be supplied, or does not apply. It is never the default
  for "this message did not include the field".
- **INV-4 (identity bindings carry the same envelope).** `Attempt.entry` is `Observed`, like any other
  field. A correction to who raced under a bib is an ordinary `known → known` change.
- **INV-5 (idempotent supersession).** Re-delivering an identical observation, with the same `value`
  from the same source for the same run generation, is a no-op and triggers no client-visible
  notification. `Phase.date` is assigned once and is never re-derived.
- **INV-6 (ordering is a monotonic ingest sequence, never the wall clock).** Every "later" or "newer"
  above is defined over an internal, strictly increasing sequence, assigned at the ingest boundary
  together with `observedAt`. It is never defined by comparing `observedAt` values. A clock jump
  cannot reorder a merge decision. The sequence is exposed on the wire only as `seq` (§1.6), for
  reconciliation.

**Determinism.** Given the same sequence of ingested observations, each carrying its source, kind,
run generation and ingest sequence, plus the same TCP connection events, the presented state is a
pure function of that sequence. Nothing depends on wall-clock time at replay.

---

## 5. Standing assembly

Standings **relay** Canoe123's own order and rank. They are assembled identically on both tiers, and
no tier ranks (`DECISIONS/ADR-012`, superseding `ADR-008`).

1. **Scopes.** Each class publishes:
   - one `phase` standing per race Phase;
   - one `pair` standing per second-run Phase, keyed by the second Phase;
   - one `heat` standing per heat of a heat Phase;
   - one `classification` standing per classification Phase.

   Each duration-scored `phase` or `pair` standing is published twice: once for the whole class, and
   once per age category the class has.

   `standingKey = "<scope.kind>:<phaseId>[:<heat>]/<ageCategoryId | 'all'>"`, with `phaseId` being the
   second Phase for a pair.
2. **Whole-class entries.**
   - Each Attempt of the Phase with a `known` `placement` is an entry. It gets that `placement`'s
     `rank` and `order`.
   - Entries sort by `order`.
   - In a heat Phase's `phase` standing, entries sort by `(heat, order)`, as upstream does.
   - For a `pair`, the Attempts are the second Phase's. Their placement is already the combined one,
     and upstream pushes it as soon as the *first* run changes. `result` is the second run's own
     outcome, and `pairTotalSeconds` is `pairTotal`.
   - A `classification` takes its rows from the classification Phase's rows (`DERIVATIONS.md` §4.10).
3. **Unplaced entries** are listed after all placed ones, with `rank: null`, `order: null`. They are
   ordered by `status`, in the declaration order of `AttemptStatus` (§2.6), then by `bib`, compared
   numerically where both bibs are integers and as strings otherwise. This order is deterministic and
   carries no ranking meaning.
   - There is **no server-computed display rank**. Upstream places a finisher a median 0.14–0.41 s
     after the finish impulse (`DECISIONS/ADR-011`). A computed rank shown for half a second, then
     replaced wherever it differs, would be flicker.
   - Relayed marks keep upstream's placement. A `ral` athlete is placed last. A second-run `dns` keeps
     the combined placement from run 1.
4. **Age-category entries** (maintainer answer Q3; `DECISIONS/ADR-014`). Take the whole-class
   standing's placed entries whose Entry has this `ageCategoryId`, in class order. Then:
   - `rank = 1 +` the number of entries in the same category with a strictly smaller class `rank`;
   - `order` = position in that filtered list.

   This reproduced upstream's own category ranks, single-run and combined, exactly: 1,855 rows,
   0 mismatches. It makes category standings available at class-rank latency. Upstream's own category
   ranks reach only the snapshot, a median of ~20 s after the finish. When the snapshot's category
   rank arrives and differs from the assembled one, a `category-rank-disagreement` anomaly is
   recorded. The assembled rank stays presented.
5. **`provisional` and `underReview`** are copied from the entry's own Attempt. They are `true` if any
   of `outcome`, `placement` or `pairTotal` is provisional.
6. **`behindSeconds`** is the entry's ranked value minus the first-ordered entry's, for duration
   scopes. The ranked value is `pairTotalSeconds` for a pair, and `result.totalSeconds` otherwise. It
   is `null` otherwise, and `null` for entries without a numeric ranked value.
7. **Anomaly check, the one mechanical comparison** (`order-disagreement`). It applies in a
   duration-scored `phase` or `pair` standing, among placed entries with a numeric result and no
   no-result mark. An anomaly is recorded when an entry is ordered ahead of another whose result is
   strictly smaller. Ties are never flagged, because upstream breaks them legitimately: a combined tie
   by the run that did not count, and a single-run tie by its own order field. Cross scopes are never
   checked. Anomalies go to the admin audience only. They never reorder anything.

**Considered and rejected: deciding which run of a pair counts from upstream's `BetterRunNr`.** It is
not needed. The pair's combined total and placement are relayed. `countingRun` carries
`BetterRunNr`'s fact for display.

---

## 6. Derivability ledger

What today's sources can and cannot supply. One column: CIS is not consumed (`DECISIONS/ADR-011`),
and nothing below depends on it. `DERIVATIONS.md` says *how* each value is produced.

| Value | Derivability |
|---|---|
| On-course state, running time, on-course order, time to beat | [D] TCP, ~2 messages/s |
| Slalom finish | [D] finish-time transition, TCP, authoritative |
| Result, penalties, class placement, combined placement | [D] TCP result push, median 0.14–0.41 s after the finish impulse (1,533 finishes). Also [D] from the XML snapshot, the complete record at cold start |
| Whether the result may still move | [D] from gate completeness against the course layout, plus run closure (§1.2) |
| Run 1's detail, once run 2 has superseded it on TCP | [D] XML snapshot, unconditionally. Also from this server's own retained observation of run 1 |
| Age-category standing | [D] assembled from class placement and the entry's category, at class-rank latency. The snapshot's own category ranks follow ~20 s later, as a check |
| Kayak Cross heat order | [D] operator assertion via the result push, as upstream placement |
| Event metadata: title, venue, dates | [D] XML snapshot. Dates are operator-entered and fallible |
| Multi-day grouping | [D] from each Phase's own date. The *identity* of a multi-day event is asserted, never derived (§2.2) |
| Members, club, nation, age category, birth date | [D] XML snapshot. Club and name are also in TCP result rows |
| Course layout and race→course binding | [D] XML snapshot. The current course is refreshed from TCP. Captions are TCP only |
| Splits | [D] where upstream arms them. Not populated at any recorded event, because none had splits armed |
| Registry-verified identity (spelling, nationality) | **[N]** Canoe123 is the only identity source that exists |
| Which registry an external id belongs to | **[N]** Asserted by the bridge operator from configuration (§2.5). Upstream would need a registry field per participant. It would buy scheme tagging without trusting configuration |
| Parent class of a sub-classified class (a juniors race run as its own class) | **[N]** The attribute is relayed on the Phase; the link to its base class is not stated upstream. Open technical question, `DERIVATIONS.md` §10 |
| Tie-breaking | [D] relayed from upstream's order; never computed (§5) |

**How a deployment sees which sources it has:** through `SourceStatus` (§2.8), and through
`unavailable{reason}` and `provisional` on the specific values affected. There is never a
spectator-facing banner (maintainer answer A1).

---

## 7. On-site contract — c123-server ↔ scoreboard / penalty-check

This contract serves clients that exist to display *this* timing system (`DECISIONS/ADR-007`). It uses
Canoe123-native tokens directly: `format`, and `phaseId` equal to `RaceId`. **There is no
authentication:** the venue LAN is trusted (`CONSTRAINTS.md` §1.2).

**Tier-specific serialisation.** `Person.birthDate` is replaced by `birthYear: number | null`. Every
other shape is exactly §2's.

### 7.1 Hydration (REST, snapshot)

Every response except `/api/sources` carries `asOfSeq: number` (§1.6) at the top level.

| Method & path | 200 body | Error |
|---|---|---|
| `GET /api/events/current` | `{ asOfSeq, event: Event, classes: Class[], courses: Course[] }` | `404 event-not-found` |
| `GET /api/classes/{classId}/phases` | `{ asOfSeq, phases: Phase[] }` | `404 class-not-found` |
| `GET /api/classes/{classId}/entries` | `{ asOfSeq, entries: Entry[] }` | `404 class-not-found` |
| `GET /api/phases/{phaseId}/attempts` | `{ asOfSeq, attempts: Attempt[] }` | `404 phase-not-found` |
| `GET /api/classes/{classId}/standings` | `{ asOfSeq, standings: Standing[] }`: every scope of §5, for the whole class and per age category | `404 class-not-found` |
| `GET /api/oncourse` | `{ asOfSeq, attempts: Attempt[] }`: every Attempt currently on upstream's on-course list with status `at-start` or `on-course`, across every running Phase. **Ordered by `courseOrder` ascending**; Attempts without one come last, by `startOrder`. Plural by construction; an empty array is valid | — |
| `GET /api/sources` | `SourceStatus`, unwrapped | — |
| `GET /api/diagnostics` | `{ asOfSeq, diagnostics: Diagnostic[] }`: current INV-2b source disagreements. Admin audience only | — |

Membership of the on-course list is tracked from the on-course stream.
- An Attempt leaves the list when:
  - its status becomes `finished` or a no-result status;
  - upstream stops listing it;
  - upstream sends its explicit "course empty" message.
- Leaving the list never changes `status` by itself. A Kayak Cross heat leaves the list together,
  before the operator has asserted the order, and so stays `on-course` until that assertion
  arrives through its result row (`DERIVATIONS.md` §4.1).

### 7.2 Live updates (WebSocket `/ws`, delta)

Every message carries `seq` (§1.6).
- `attempt.updated`, `phase.updated`, `entry.updated` and `class.updated` carry only the changed
  fields. An omitted field is untouched, never reset. A run-generation change is sent as explicit
  `not-yet` values (INV-1).
- `standing.updated`, `course.updated`, `write.updated` and `sources.updated` carry the whole resource.

```json
{ "seq": 1044, "type": "attempt.updated", "attemptId": "K1M_BR2_6:9",
  "fields": { "outcome": { "state": "known", "value": {"kind":"duration", ...}, ... } } }
{ "seq": 1045, "type": "attempt.updated", "attemptId": "K1M_BR2_6:9",
  "fields": { "run": { "state": "known", "value": 2, ... }, "outcome": { "state": "not-yet" },
              "placement": { "state": "not-yet" }, "status": { "state": "known", "value": "on-course", ... } } }
{ "seq": 1046, "type": "standing.updated", "standing": { "standingKey": "pair:K1M_BR2_6/all", ... } }
{ "seq": 1047, "type": "write.updated", "write": { ...WriteRequest... } }
```

Clients **must** follow §1.6's subscribe-before-snapshot sequence.

### 7.3 Writes (REST)

Both writes require an `Idempotency-Key` (§1.5). Both may target a closed Phase (§2.9). Both target
the Attempt's run generation that is current at submission.

| Method & path | Body | First response | Retry (same key) | Error |
|---|---|---|---|---|
| `POST /api/attempts/{phaseId}/{bib}/penalty` | `{ "gate": number, "value": 0\|2\|50 }` | `202`, `Location: /api/writes/{writeId}`, body = `WriteRequest{status:'pending'}` | `200`, current `WriteRequest` | `404 attempt-not-found`; `400 validation-failed` (`value` not in `{0,2,50}`; `gate` outside the Phase's course gates; or the course is not configured) |
| `POST /api/attempts/{phaseId}/{bib}/status` | `{ "status": "dns"\|"dnf"\|"dsq"\|"cap" }` | as above | as above | as above; any other status string is `400 validation-failed` |
| `GET /api/writes/{writeId}` | — | `200 WriteRequest` | — | `404 write-not-found` |

The four write statuses the contract accepts are the ones Canoe123's terminal removal command takes.
Other marks, such as `dsq-r` and `ral`, are relayed but not writable here.

**The confirmation lifecycle over the wire** (§2.9, `DECISIONS/ADR-010`). These are snapshots of the
same `WriteRequest` over time:

```json
{ "writeId": "w-8f3a", "target": { "phaseId": "K1M_BR1_6", "bib": "9", "run": 1, "field": "gate-penalty" },
  "requestedValue": { "gate": 4, "value": 2 }, "submittedAt": "2026-09-15T14:02:11.000Z", "status": "pending" }
{ ..., "status": "confirmed", "confirmedValue": { "gate": 4, "value": 2 }, "confirmedAt": "2026-09-15T14:02:14.500Z" }
{ ..., "status": "mismatched", "confirmedValue": { "gate": 4, "value": 50 }, "confirmedAt": "2026-09-15T14:02:14.500Z" }
{ ..., "status": "superseded" }
```

No field ever encodes a timeout or a deadline.

---

## 8. Live ingest contract — bridge/organiser ↔ live-mini

Designed to outlive Canoe123 (`BRIEF.md` §5.7). Nothing in this section names a Canoe123 field,
message type or wire quirk. **live-mini assembles standings exactly as §5 does. It ranks nothing and
recomputes nothing else** (`DECISIONS/ADR-012`).

### 8.1 Authentication and tenancy

`X-API-Key` resolves to exactly one `(organiserId, eventId)` pair. **The key is the scope.** No request
names its target event by a client-supplied id checked against the key.

Every write in §8.3 and §8.5 can fail with:
- `401 unauthorized`: the key is missing or unrecognised;
- `403 forbidden`: the key is revoked;
- `429 rate-limited`: sent with `Retry-After`.

§8.4's public reads carry none of these.

**Every id below `Event` is unique only within its event.** `classId`, `phaseId`, `courseId`,
`entryId` and `bib` are Canoe123-derived tokens. Two independent venues running the same class on the
same numbered day mint the same `RaceId`. The store's key for every such entity is therefore always
the compound `(eventId, localId)`. An implementation that keys on a bare `classId`/`phaseId`/
`entryId` merges two organisers' data the first time they coincide.

### 8.2 Identity provenance invariance

`eventId` and `entryId` are opaque strings to this contract. Today the on-site bridge mints both. A
future central registry could issue them. The shape of every endpoint below is the same either way
(`DECISIONS/ADR-006`).

### 8.3 Push — resource-based, Attempt-level

Every push is an idempotent `PUT` upsert by identity (§1.5, INV-5). A successful push returns
`200 { <resource> }`, the current resolved resource. A malformed body gets `400 validation-failed`,
with `error.details` naming the field.

| Method & path | Body |
|---|---|
| `PUT /ingest/v2/classes/{classId}` | `{ "code": string, "name": string, "discipline": "slalom"\|"cross", "ageCategories": [{ "ageCategoryId": string, "name": string }] }` |
| `PUT /ingest/v2/courses/{courseId}` | `{ "gates": [{ "number": number, "kind": "downstream"\|"upstream" }], "sectorEndsAfterGate": number[], "splitsAfterGate": number[] }` |
| `PUT /ingest/v2/phases/{phaseId}` | `{ "classId": string, "kind": "race"\|"classification", "scoringKind": "duration"\|"ordinal", "pair": { "role": "first"\|"second", "siblingPhaseId": string, "combination": "best"\|"sum" } \| null, "heats": boolean, "date": "YYYY-MM-DD", "courseId": string \| null, "scheduledStart": Timestamp \| null, "programmeOrder": number \| null, "title": string \| null, "status": PhaseStatus }` |
| `PUT /ingest/v2/entries/{entryId}` | `{ "classId": string, "displayName": string, "club": string \| null, "nation": string \| null, "ageCategoryId": string \| null, "eventBib": string \| null, "members": [{ "givenName": string, "familyName": string, "birthDate"?: "YYYY-MM-DD", "externalId": { "scheme": string, "value": string } \| null }] }` |
| `PUT /ingest/v2/attempts/{phaseId}/{bib}` | any non-empty subset of the `Observed` fields of §2.6, each wrapped per §1.2 |

- **No format token on `Phase`.** The live contract carries only the structural properties of the
  format: `kind`, `scoringKind`, `pair` and `heats`. A vendor's round names would not fit a
  Canoe123-shaped vocabulary (`DECISIONS/ADR-007`).
- **Attempt pushes are partial. An omitted field is untouched.** A run-generation change is pushed as
  `run` together with explicit `not-yet` for the retracted fields. **Every completed Attempt's `gates`
  must eventually be pushed:** that is the fix for `EVIDENCE.md` Exhibit 9.
- **`externalId` is a required key per member, with `null` allowed.** Omitting it is
  `400 validation-failed`. So is a bare string, or an object without `scheme`. In the store, a `null`
  becomes `unavailable{reason:'not-applicable'}`. Such an entry is accepted and fully renderable
  (§2.5).
- **`birthDate` is optional, and carried as entered.** Whether the store keeps it, and whether it is
  published, is live-client configuration (maintainer answer Q4). The contract only transports it.
- **Forward references are allowed.** A Phase may name a `classId` or `courseId` not yet pushed. The
  store creates a stub. A bridge cannot guarantee discovery order under upstream's unsynchronised
  cadences.
- **The unit of transfer is one resource changing.** It is never a file, a day or an event. Saturday's
  and Sunday's races push independently under the same `eventId` (Scenario E).

### 8.4 Read — public, unauthenticated

**`GET /public/events?status=live|upcoming|past|all&cursor=&limit=`** is the calendar: several
organisers' events, running in parallel, each visibly carrying live results.

```json
{ "asOfSeq": 88213,
  "events": [
    { "eventId": "evt_9f2a", "organiserName": "TJ Slalom Praha", "name": "Jarní pohár 2026",
      "dateRange": { "start": "2026-09-19", "end": "2026-09-20" }, "status": "live" } ],
  "nextCursor": "eyJvZmZzZXQiOjUwfQ==" }
```

`status` is derived purely from ingest recency, never from `Phase.status`:
- `live`: at least one push in the last 5 minutes (a named constant);
- `past`: at least one push ever, but none in the last 5 minutes;
- `upcoming`: none ever.

`dateRange` spans the dates of the event's Phases. `limit` defaults to 50, with a maximum of 200.
Omitting `status` returns every event:
- live events first;
- then upcoming ones, soonest start first;
- then past ones, most recent end first.

An empty list is the answer to "no events match", never a `404`. `organiserName` is provisioned
out-of-band.

| Method & path | 200 body | Error |
|---|---|---|
| `GET /public/events/{eventId}` | `{ asOfSeq, event: Event, classes: Class[], phases: Phase[], courses: Course[] }` | `404 event-not-found` |
| `GET /public/events/{eventId}/classes/{classId}/entries` | `{ asOfSeq, entries: Entry[] }` (birth date per live-client configuration) | `404 event-not-found`, else `404 class-not-found` |
| `GET /public/events/{eventId}/classes/{classId}/standings` | `{ asOfSeq, standings: Standing[] }` | as above |
| `GET /public/events/{eventId}/phases/{phaseId}/attempts` | `{ asOfSeq, attempts: Attempt[] }` | `404 event-not-found`, else `404 phase-not-found` |

**Push transport: Server-Sent Events.** `GET /public/events/{eventId}/stream`, with
`Accept: text/event-stream`. It carries `attempt.updated`, `phase.updated`, `entry.updated`,
`class.updated`, `course.updated` and `standing.updated`, in §7.2's shapes. It never carries
`write.updated` or `sources.updated`. §1.6's subscribe-before-snapshot sequence applies.

### 8.5 Corrections after the on-site session has ended

A correction can surface up to a week later (maintainer answer A7), when the on-site laptop is long
gone. Any request authenticated for the event's organiser may `PUT` a correction directly, using
§8.3's shapes, with `source: 'operator-write'` and `provisional: false`.
- It is presented immediately.
- A routine bridge push of the same content does not displace it (§4 INV-2, rule 4).
- It is displaced only by a later assertion of the same kind, or by a results-table observation that
  changes the bridge's own retained value afterwards: a genuine later upstream correction.

This is also how a mis-bibbed run is corrected: `entry` is re-pointed (INV-4).

### 8.6 What this contract refuses

- A raw vendor payload of any kind: `400 vendor-payload-rejected`.
- A body that matches none of §8.3's shapes, including one missing a required identity key:
  `400 validation-failed`.
- Any non-idempotent operation. There is no "append a result", only "assert the current value".
- A value outside the closed vocabularies: `400 validation-failed`. This covers `discipline`,
  `scoringKind`, `kind`, `combination`, statuses and marks. A different timing system's bridge
  translates into these vocabularies; it does not extend them.

**What a different timing system supplies** to use this contract:
- classes, courses, phases (with structural format properties), entries;
- attempts carrying outcome, status, placement and honest provenance.

Nothing presumes TCP, an XML file or CIS exists. **The cost, stated plainly:** the on-site bridge must
translate, not forward. It does this with the same domain layer §7 already requires.
