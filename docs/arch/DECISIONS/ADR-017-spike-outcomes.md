# ADR-017: Spike outcomes — what running the design against recordings changed

Date: 2026-10-14. Status: accepted (S1–S4 final; S5 prepares a runbook the maintainer executes and
cannot move the design; anything it files lands as a trailing revision).

The decision and the revisions below state what holds now; each revision keeps its number because
other documents and the code cite it. The narrative of the spike's re-runs and of each revision is in
git under the tag `contract-archive-2026-11`.

## Context

The production plan's M0 spike ran five scope-boxed risks against the design at `be151b2`, with
throwaway code on `spike/m0`: S1 replay determinism in a real process, S2 the capture and admission
pipeline, S3 the tier-3 harness cost, S4 the live ingest rate, S5 on-site hardware. The agents were
told to take the reading that made the vectors pass wherever the design was silent, and to file every
such reading: 38 entries (S1-1..25, S2-1..7, S3-1..3, S4-1..3) of three kinds — `DESIGN-GAP`,
`UPSTREAM-NEW`, `CHECKER-FAIL`. Every `CHECKER-FAIL` is by definition a contract conflict and is
resolved in the contract, never in the checker.

The headline results: determinism held on five windows replayed twice in separate processes
(step-log and final-state sha256 identical, 10 of 10 pairs); 84 of 85 vectors passed, the one failure
being the vector's own defect; the parse-only sweep over all seven recordings found 0 unparseable
TCP messages, 0 unknown types, 0 unknown format tokens, 0 invalid XML reads; every gate-2 violation
traced to a contract conflict, none to an implementation bug; the capture pipeline ran end to end in
1 m 48 s and its fixture alone reproduces the replay's final state; the live push peak is 12.2
pushes/s coalesced; the tier-3 harness costs 249 + 94 lines.

## Decision

All 38 entries are adopted. Five decisions carry 27 of them and are stated here; the rest are
one-line amendments listed in the table below. The amendments are applied in `CONTRACTS.md`,
`DERIVATIONS.md`, `TEST-ARCHITECTURE.md`, `CONFORMANCE-VECTORS.md`, the vectors (85 → 93),
`CLIENT-OBLIGATIONS.md` and the revisions of ADR-012, ADR-013 and ADR-015 in the same round.

### D1. A TCP result row has no finish time; attribution and contradiction match by run time

0 of 667,388 recorded TCP `Results` rows carry `dtFinish` (E1). Round 8 rested the re-run protection
on "a row whose finish precedes the new generation's start"; INV-2d, the stale-mark rule and
`duplicate-finish` named a row's finish time. On TCP none had anything to read.

A results-table observation is attributed to a run generation, and matched for contradiction, by the
finish it carries where it carries one, else by its run time. XML rows: by `dtFinish`, as before. TCP
rows, within a generation that began with an observed new start: the row is the current generation's
only once that generation's finish has been seen on the on-course stream and the row's `Time` equals
the on-course `Time` at that finish; until then a TCP row carrying a time describes the replaced run
and is retained, never presented; a TCP row carrying a mark and no time follows the stale-mark rule.
Generation 1 and cold starts raise no question. `eventTime` on a TCP-row outcome is the generation's
on-course finish when so attributed, absent otherwise, and is never a merge key. INV-2d records
`{ finishTime: Timestamp | null; runSeconds }` and matches retained rows by `dtFinish` where present,
else by `Time`; after a lift by the on-course stream the contradicted rows stay unpresented.
`duplicate-finish` compares `eventTime` only. Untimed rows are decided from the snapshot and inherited
by the TCP row. Gaps S1-4, S1-5, S1-20.

### D2. `placement` is known only when upstream ranks the row

A marked row's raw `RankOrder` keeps moving as upstream's grid sort key (2,261 against 920 changed
rows in 30 min, S4-2); in a Cross heat `RankOrder` is the lane order until the operator asserts the
order athlete by athlete (S1-24). `Attempt.placement` is `known` iff upstream's `Rank` is non-empty
(`ral` rows carry one). A row with an empty `Rank` has `placement: not-yet`, whatever `RankOrder`
says. Hence a marked row never pushes a placement, a Cross lane order is not a placement, §5 step 2 is
exact, and an unplaced standing entry is an Attempt presenting an outcome other than `pending` or
`running`, or a mark, and no placement (S1-18). A finish still re-ranks every slower placed row, so
placement-only pushes are 78–94 % of Results-row pushes (S4-3); each is ~160 B and the placement
really changed; recorded as the capacity figure. Gaps S4-2, S4-3, S1-18, S1-24.

### D3. A standing changes only when its serialised form changes; a running athlete is not a result

A second-run athlete holds a combined placement from run 1; while running run 2 the standing entry's
`result` was the ticking `running` outcome, and every tick re-sent the phase, pair and category
standings whole: 37,168 `standing.updated`, 427 MB, ~25/s in one 25-minute window; 97 % of S2's
181 MB fixture (S1-25). `StandingEntry.result` is the Attempt's outcome only when it is a result
(`duration`, `ordinal`, `no-result`); while `pending` or `running` it is `{ kind: 'pending' }`.
`Standing.asOf` is the ingest time of the latest observation that changed the standing as
serialised. `standing.updated` is emitted only when the serialised standing changes: INV-5 applied to
a whole resource. Gate-2 property 15 follows, including the first publication of a category standing
when an Entry's `ageCategoryId` becomes known and a snapshot's category ranks arriving (S1-13). Gaps
S1-25, S1-13.

### D4. Status is never provisional; provisional may rise at a run start or when the course binds

`DERIVATIONS.md` §4.1 said `status` is never provisional; §1.2 did not, and gate-2 property 11 failed
on `status` 1,544–3,944 times per window (S1-11). Property 11's "false → true only through a
regression" failed on run-1 combined fields when run 2 starts and on cold-start finishers whose gate
completeness is unknown until the course binds (S1-12). Now: `status` is never provisional;
provisional is computed on the presented, merged `gates` (S1-10) and is true while a presented cell
is blank, or while completeness cannot be judged because no course is bound, and the Attempt is still
on upstream's list; a second run's `placement`, `pairTotal` and `countingRun` are provisional while
run 2 is on course. Gaps S1-10, S1-11, S1-12.

### D5. A fixture's identity, its admission block, its capture point, and gate 3 for a mid-race window

`TEST-ARCHITECTURE.md` §4 left four things to the first implementer (S2-1, S2-4, S2-5, S2-7), and
§3.2 described the capture tool as a `/ws` capture of a player-driven server, whose `observedAt`
values gate 1 cannot diff (S2-6). Now: `domainLayerVersion: { contract, generator }` — fail loudly on
`contract` only, a `generator` change means re-admission and a new fixture revision, the catalogue key
is `<fixtureId>@<contract>+<generator>`; the `admitted` block has a schema
(`schemas/fixture-admitted.schema.json`) and "complete" means gate 1 and gate 2 true, no mechanical
mismatch, and a `human-checked-<date> by <name>` line — gate 2 is never relaxed to admit; the capture
tool projects the direct-injection replay, and a `/ws` capture is a tier-4 artefact; gate 3's
mechanical part compares each in-window finisher against upstream's XML at the window end, listing
day-final differences as "changed after the window", and the human line confirms, per day, that the
final XML equals the published results. Hydration-step fields and `source.excerpt` forms are fixed.
Gaps S2-1, S2-4, S2-5, S2-6, S2-7.

## The gap table

| id | kind | verdict | where it landed |
|---|---|---|---|
| S1-1 | DESIGN-GAP | adopt: fix the vector | `rerun-stale-mark-not-presented`: the later, different mark is presented; `stale-mark` clears |
| S1-2 | DESIGN-GAP | adopt | CONFORMANCE §1: every merge vector names its Attempt (`context.attemptId`) |
| S1-3 | DESIGN-GAP | adopt | CONTRACTS §1.6: one counter, each outbound message takes the next value |
| S1-4 | DESIGN-GAP | adopt, D1 | CONTRACTS §4 INV-2d, §2.6; DERIVATIONS §4.4, §4.11, §4.12; ADR-013 R3; ADR-015 R2 |
| S1-5 | DESIGN-GAP | adopt, D1 | DERIVATIONS §4.4: untimed from the snapshot, inherited by TCP |
| S1-6 | DESIGN-GAP | adopt | INV-7 second run, time empty: the mark in `status` is retracted too (E1: bib 7 `dns` → `not-started` → raced) |
| S1-7 | DESIGN-GAP | adopt | INV-7 XML bullet: a second-run row with no time is the TCP time-empty case |
| S1-8 | DESIGN-GAP | adopt; the constant is 4 s (Revision 5) | DERIVATIONS §4.1 leave rule, `onCourseLeaveAfterSeconds` |
| S1-9 | DESIGN-GAP | adopt; tooling M2 | TEST-ARCHITECTURE §3.2/§4/§9: fixtures carry an absolute start and connection events; the recorder writes them |
| S1-10 | DESIGN-GAP | adopt, D4 | DERIVATIONS §4.4 |
| S1-11 | CHECKER-FAIL | adopt, D4 | CONTRACTS §1.2; property 11 |
| S1-12 | CHECKER-FAIL | adopt, D4 | CONTRACTS §1.2, §2.6; property 11 |
| S1-13 | CHECKER-FAIL | adopt, D3 | property 15 |
| S1-14 | UPSTREAM-NEW | adopt | CONTRACTS §5 step 4: compare only rows whose `CatId` is set; DERIVATIONS §4.7, §9 |
| S1-15 | CHECKER-FAIL | adopt | property 6(c) lists the INV-7 retraction and rule 1 over an inference |
| S1-16 | UPSTREAM-NEW | adopt | DERIVATIONS §4.1; CONTRACTS §3.2: `at-start → not-started`, `left-without-finish → at-start \| on-course` |
| S1-17 | DESIGN-GAP | adopt | DERIVATIONS §4.1: `at-start` = listed with `dtStart` empty; `chStart` is the arming flag only |
| S1-18 | DESIGN-GAP | adopt, D2 | CONTRACTS §5 step 3 |
| S1-19 | DESIGN-GAP | adopt | INV-2b "settled" defined |
| S1-20 | DESIGN-GAP | adopt, D1 | INV-2d lift |
| S1-21 | DESIGN-GAP | adopt | CONTRACTS §2.4 / DERIVATIONS §2.1: an inferred `date` is replaced by the snapshot's once |
| S1-22 | DESIGN-GAP | adopt | property 9 excepts the run-increment delta |
| S1-23 | DESIGN-GAP | adopt | property 1 wording |
| S1-24 | UPSTREAM-NEW | adopt, D2 | DERIVATIONS §4.2, §4.7 |
| S1-25 | DESIGN-GAP | adopt, D3 | CONTRACTS §2.7, §5, §7.2, §8.3 |
| S2-1 | DESIGN-GAP | adopt, D5 | TEST-ARCHITECTURE §4 hydration step |
| S2-2 | DESIGN-GAP | adopt | CONTRACTS §7.1: `/api/oncourse` gains `asOf`; §7.2 example |
| S2-3 | DESIGN-GAP | adopt; tooling M2 | TEST-ARCHITECTURE §4 `source.excerpt`; the label leaves the excerpt checksum |
| S2-4 | DESIGN-GAP | adopt, D5 | TEST-ARCHITECTURE §4, §6, §10 |
| S2-5 | DESIGN-GAP | adopt, D5 | `schemas/fixture-admitted.schema.json` |
| S2-6 | DESIGN-GAP | adopt, D5 | TEST-ARCHITECTURE §3.2 |
| S2-7 | DESIGN-GAP | adopt, D5 | TEST-ARCHITECTURE §3.2 gate 3 |
| S3-1 | DESIGN-GAP | adopt | TEST-ARCHITECTURE §5: a rule takes effect within one stated tick period of its deadline |
| S3-2 | DESIGN-GAP | adopt | TEST-ARCHITECTURE §3.3: the fake clock starts at a stated offset from `observedAt` |
| S3-3 | DESIGN-GAP | adopt | CLIENT-OBLIGATIONS: stale-competitor eviction is deleted with the on-course reducer; the grace period stays |
| S4-1 | UPSTREAM-NEW | adopt as fact | DERIVATIONS §0.3, CONTRACTS §2.8: the TCP connect burst |
| S4-2 | DESIGN-GAP | adopt, D2 | CONTRACTS §8.3: the diff is against presented fields |
| S4-3 | UPSTREAM-NEW | adopt as the figure | TEST-ARCHITECTURE §8 capacity note |
| S1-26 | DESIGN-GAP | adopt: fix the vector | `standing-not-resent-on-running-tick` counts a `phase` and a `pair` standing: 4 messages |
| S1-27 | DESIGN-GAP | adopt: fix the vector | `retraction-first-run-row-present-empty` dropped the leave of an Attempt it never listed |
| S1-28 | DESIGN-GAP | adopt | DERIVATIONS §4.1: a start is a `dtStart` or the stream stating `on-course`/`finished` |
| S1-29 | DESIGN-GAP | adopt, reading 3 | §1.2/§2.6, property 11: carried pair fields provisional until run 2's own row restates them |
| S1-30 | CHECKER-FAIL | adopt | property 11's transition clause: an Attempt listed while no course is bound |
| S1-31 | UPSTREAM-NEW | adopt | D1's retain-and-attribute is the normal path (86/120, 0.055–0.709 s): §2.6, DERIVATIONS §4.4, §4.11 |
| S1-32 | DESIGN-GAP | adopt | carried fields settle field by field: `placement`/`pairTotal` at the TCP row, `countingRun` at the XML row |
| R13 | opponent review, E1+E2 | adopt | the stall exemption is a rule the spike never implemented: a 10.7 s TCP stall emptied a Cross heat's set; DERIVATIONS §4.1 |
| R14 | opponent review, E1 | adopt | real unchanged-listing gaps of 3.04–4.29 s refute the 3 s constant; 5 s provisional, M1 measures; a false leave is not harmless |
| R15 | opponent review, E3 | adopt | property 15 had no classification case: 673 violations on XER; restated |
| R16 | opponent review, E2+E3 | adopt | §4.11/§4.12 reconciled: the stale-mark rule applies before attribution; the vector reshaped to the usual order |
| R17 | opponent review, E2 | record (§10 item 19) | equal `Time` across two runs can mis-attribute for under a second; residual unless M1's data shows it |

**The on-course exit delay, measured** (E1, seven recordings, 1,995 closures). `C123-PROTOCOL.md`'s
"about +4 s" against `CONTRACTS.md` §7.1's "about 20 s" was an E3 between documents. Upstream's
auto-complete setting is about 20 s at six of seven venues (medians 18.9–19.9 s; 54–73 % of closures
in [18, 20) s) and about 47 s at one (cp3-cross, p90 57 s); the two NKZ days add a minority of manual
closes under 5 s (12.6 % and 34.9 %), the path the protocol doc's figure describes; every recording has
a tail to 126–781 s. §7.1 states the range, and no client may assume a fixed value. `Completed="Y"`
coincided with the closure in only 34–70 % of cases, so it stays a trigger, not the closure.

## What M1 must still prove on data

In the order of risk to next season (opponent review, list D; Revision 4). S1 is not retired until
items 1–4 pass; every item runs through direct injection twice and a gate-2 checker written by a
different author than the core (TEST-ARCHITECTURE §3.2), and M1's presented state is diffed against
the spike core on the same excerpts.

1. **Kayak Cross finals and the event result:** cp3-cross 09:30–10:40Z (four overlapping XF phases,
   XER). It fails today on property 15's classification case.
2. **The leave rule under stalls and the real gap tail:** cp3-cross 09:18:38Z (a 10.7 s stall, a Cross
   heat), nkz-20ne 11:53:51Z (21.5 s), and the four unchanged-listing gaps above 3 s; set
   `onCourseLeaveAfterSeconds` from the whole distribution measured with no cut-off.
3. **Re-runs, both paths, both arrival orders:** the recorded nkz-19so C1M_BR1_19 bib 7 (run 1
   10:46–10:48Z, wiped in place 10:56:58, gone by 12:02, run 2 12:40–12:42Z, the push 108 ms before
   the finish) — replay 10:44–12:43Z; and a synthetic non-wizard re-run with a DNF, row-first and
   finish-first. This covers R16, the §4.11/§4.12 reconciliation, property 10 and S1-22, none of which
   has run.
4. **Outage and reconnect:** jarni-ne-do 08:55–09:10, after recording one deliberate disconnect on the
   bench, since the recorder writes no connection events.
5. **A real process:** sockets, the XML poll timer and the leave rule, fed by `player.js` at 1× and 10×;
   its presented state equals the direct-injection replay's (what is compared, and on which clock:
   Revision 7).
6. **Gate-2 strength:** the second checker, mutation-tested per property, on windows that exercise
   properties 4, 7, 8, 10 and 13.
7. **The XML writer's real timing** (S5, the maintainer's run): INV-2c and INV-7's guard depend on the
   poll interval matching it.
8. **`duplicate-finish` on TCP after D1:** the six recorded instances.
9. **Live bytes and fan-out from the real core** on Railway (the spike core's on-course deltas ran
   6.4 kB/s, 35 % above S4's maximum).
10. **Event times across a DST switch** with an IANA zone (DERIVATIONS §0.2).
11. Re-run S2's pipeline on a whole-race window (C1W_BR1_19 08:34–09:03Z or C1W_BR2_19 10:24–10:53Z):
    gate 2 true, gate 3 against published results, the human line certifying the fixture.

## What it costs

Eight more vectors, one more schema, and a merge core that keeps per-Attempt run-time bookkeeping
for attribution and contradiction. The standings fix removes about 97 % of the delta volume.

## What it forecloses

Treating a TCP row's finish as known; presenting a placement upstream has not ranked; re-sending a
standing for a running athlete's ticks; admitting a fixture over a failing gate 2.

## Revision 4 — the opponent review

An independent reviewer re-ran the spike's code: the headline numbers reproduce and D1–D3 stand,
but S1 is retired for the named windows only, and not until items 1–4 of the M1 list above pass.
Its five findings (R13–R17) are in the gap table. What holds since:
- The stale-mark rule applies to any row of generation ≥ 2 before attribution (§4.11/§4.12
  reconciled; R16).
- The leave rule's stall exemption is a rule, and a false leave clears on re-listing and
  recomputes `provisional` (R13). The constant is Revision 5's.
- Property 15 has a classification case (R15).
- Gate 3's admission needs a window spanning whole races checked against published results, never
  a definition fitted to a mid-race window; the window-end comparison is a candidate check; the
  human line certifies the fixture; the schema enforces `status: admitted` with `if/then`.
- CONTRACTS §7.2/§8.4 carry a heartbeat and the clients a liveness obligation, so a ghost on a
  half-open connection cannot stand indefinitely.
- DERIVATIONS §0.2 names an IANA zone.
- TEST-ARCHITECTURE §3.2: the gate-2 checker is written by a different author than the core,
  mutation-tested per property, reads upstream's stream for the membership properties, and admits
  "implementation bug" as a verdict. An assertion the harness skips is no assertion: a mutation
  probe must see it fail (`inv2-rule3-single-source-field` asserts a second field for that reason).
- No vector gives a TCP row an input finish time (D1).

**The spike code** is a **differential oracle**, not M1's base: M1 runs its core and the spike core
on the same excerpts and diffs presented states, the second interpreter TEST-ARCHITECTURE §3.2 says
single-interpreter production loses. It is not M1's base because it was not test-first, has R16 and
R13 in it, and is not production-shaped. The checker, the step-log format, the excerpt time-base
fix and S2's projection are worth porting as tooling, each re-reviewed against §3.2 by someone other
than its author.

**Not adopted:** a rule comparing a row's cells with the on-course stream's before attributing (R17's
remedy). The case needs an equal `Time` to 0.01 s, the finish-first order and a rotation inside run 2,
and lasts under a second; it is a residual (DERIVATIONS §10 item 19) until M1's data shows it.

## Revision 5 — closure and the leave constant

D4's "while the Attempt is still on upstream's list" is read as `DERIVATIONS.md` §4.4's one definition
of a closed run: the first of upstream's `Completed = "Y"` on a listing carrying the finish (second
pass: a `Y` on a staged listing, recorded once, closes nothing), the Attempt leaving the on-course
list, or a no-result mark presented. `Completed` closes the run while it is still listed (it precedes the leave by the display delay
and coincided with it in only 34–70 % of closures), so a complete result is not held provisional for
those seconds; `CONTRACTS.md` §1.2 now points at §4.4 instead of stating a second definition. The carry
of a second run's pair fields begins at the Attempt's first listing in run 2, staged or started. "What
M1 must still prove on data" item 2, the leave rule's constant, is settled: `onCourseLeaveAfterSeconds`
= 4 s from the whole distribution over seven recordings (`DERIVATIONS.md` §4.1, §10 item 16).

## Revision 6 — the step, the window and the stated input

**A step is one ingest unit** (`CONTRACTS.md` §1.6 governs; `TEST-ARCHITECTURE.md`
§3.2's "one ingested element" withdrawn): the log names the unit's elements, the leaves the core
derived at that message among them, and property 10's reset delta names every run-scoped field with
the value the same unit gives it. **A window opens on a hydration step**: the replay begins where the
checker's raw stream begins, and a cold start at a chosen instant is an excerpt cut there; a window
that starts the core cold at a later instant of a stream the checker reads from its beginning is no
fixture. **A stated outage or re-baseline is
a declared input** in the fixture's `source.events`, the replay dropping the TCP records inside the
outage and playing the re-baseline as §4's unit; it is evidence for properties 8 and 13 and gate 2
judges it like any other, where a synthetic fixture (§4) can reach only the **D** properties. D4 is
completed in `CONTRACTS.md` §1.2: the judging clause names its fields (`underReview` and `qualified`
included) and carries the heat exemption; the stream's gate
cells are an inference, `confidence: 'inferred'`, until a row of the generation is presented.

The checker's raw stream omits the records a stated outage dropped; the step log gate 2 reads
begins where the raw stream begins and the hydration step bounds the published fixture and its
counts; `CONTRACTS.md` §1.2 names both exemptions and "a row stating a result"; property 13 names
`courseOrder` and `timeToBeat`.

## Revision 7 — gate 5: the real process's clock, its comparison and its log

Item 5 of "What M1 must still prove on data", stated precisely.

**The process runs on the player's clock** (E3: `DERIVATIONS.md` §4.1 states the leave rule in
ingest time, `CONTRACTS.md` §4 states that nothing depends on wall-clock time, and ingest time is the
injected `Clock`, `TEST-ARCHITECTURE.md` §5). Fed at N×, the process is started with a `Clock` that
advances N seconds per wall second from the excerpt's first recorded instant — the time basis the
direct replay and the checker's `--recording` already read, the 1970-based one of the known
excerpt-tooling finding included — read at the wall instant the player emits its first record (the
player started paused, the origin set at play), so no start-up gap is added to the receipt instants;
its poll, heartbeat and leave rule run on it. At 10× on the
wall clock the 4 s constant would judge a world ten times faster, which the rule was never stated
for, and the poll would sit at ten times the recorded distance; neither is a finding about the
process. Production starts it at rate 1 on the system clock; how the rate and origin are given is the
entry's.

**What gate 5 compares, closed, at both speeds.** Every structural field; every set (the on-course
set's membership and order, `featuredByUpstream`, each Standing's entries, the diagnostics); and of
every `Observed` field its `state`, `value`, `eventTime`, `source`, `confidence` and `provisional`.
Removed before comparing, and nothing else: the stamps `observedAt`, `asOf`, `seq` and `asOfSeq` — a
real process stamps receipt instants, later than the recorded ones by its delivery latency, N-fold at
N× — and `source` on `run` alone: `run` is the core's own stamp (`DERIVATIONS.md` §4.11,
`DECISIONS/ADR-013`), carried on the envelope of the observation at which the generation was first
seen, which no INV-2 rule orders between the two sources, so at a cold start it is the real arrival
order of the XML poll against the TCP stream. On every other field `source` is compared: INV-2 rule 2
orders the sources (`tcp` holds against an equal `xml` and displaces it, `TEST-ARCHITECTURE.md` §3.2
property 8), so a `source` difference there is a precedence or connection-event defect in the
plumbing, the kind this gate exists to catch (INV-5 governs one source, so it never excuses a `source`
difference). Any other
difference fails; one that comes from real timing is reported with its cause, never added to the
list.

**Gate 2 on the process's log** (E2: the receive latency measured in the spike's S5 preparation — p50 15–31 ms, p95
35–52 ms, max 211 ms — against `DERIVATIONS.md` §4.1's 0.5–0.8 s leave margin at the worst recorded
phase). The log is a tier-4 artefact, not a candidate (`TEST-ARCHITECTURE.md` §3.2, the player-driven
capture). Its instants are receipt instants on the recording's axis, so the properties that read the
raw stream (3, 6, 10, 11, 13, 14) compare them with recorded ones across the delivery latency: at 1×
that latency sits inside the leave margin and the checker, run with `--recording`, is expected to
report 0 — an expectation, not evidence; at 10× it is 0.15–0.5 s of recorded time at p50–p95, the
floor of the margin, and 2.1 s at the measured maximum, outside it, so the 10× log is asserted
written and well-formed (its first line the hydration step) and is no gate-2 evidence. The **D**-only
reading admits nothing (§3.2) and is not used. A violation at 1× is a verdict for the design authority
like any other (§3.2), never a tolerance. The 10× on-course set is still expected equal at the
window's end: a latency spike leaves an Attempt only across a non-removal pause within about 2 s of
the 4 s constant, and the recorded pauses stop at 2.59 s (`DERIVATIONS.md` §4.1); a difference is
reported with its gap.
