# ADR-017: Spike outcomes — what running the design against recordings changed

Date: 2026-10-14. Status: accepted (S1–S4 final; S5 prepares a runbook the maintainer executes and
cannot move the design; anything it files lands as a trailing revision).

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
| S1-8 | DESIGN-GAP | adopt, 3 s constant | DERIVATIONS §4.1 leave rule, `onCourseLeaveAfterSeconds`; M1 re-measures the gap distribution (§10) |
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

## Risks retired, and not

- **S1, retired.** Determinism: 10/10 hash pairs over five windows. Vectors 84/85 (S1-1). Gate 2
  clean on properties 1–5, 7–10, 12–14; P6/P11/P15 violations all contract conflicts, resolved here.
  Parse sweep: 0/0/0/0 over 7 recordings; the only unparseable cells are operator free text. Replay
  22–47× real time on slalom, 229× on Cross, on a Pi 5 at 232–271 MB RSS, with no REST, WS or
  persistence. *Not retired:* rule 2's outage path and property 8 during a disconnect (no window had a
  TCP silence); run generations (property 10 never ran); re-baseline (property 13 never ran); writes;
  the live tier beyond six vectors.
- **S2, retired as a pipeline.** 1 m 48 s end to end, 413 lines. Fixture nkz-19so 09:30–09:45: 59
  hydration bodies, 29,405 deltas, 181 MB raw / 14.8 MB gzipped (97 % standings, D3). Gate 1 true;
  gate 2 false only through S1-11/12/13/15; gate 3 mechanical 59 match, 0 mismatch, 25 changed after
  the window and all 25 equal the window-end XML; the human line is with the maintainer. The fixture
  alone reproduces the replay's final state (11/11 sections) and the first delta's `seq` exceeds the
  hydration `asOfSeq`. *Not retired:* gate 3's tier-1 cross-check; checks, flags, writes, re-baseline
  and deletion in a fixture; reconnection; consumer-side D-properties; §6 publication.
- **S3, retired; §10's question answered.** `DataProvider` harness 249 + 94 lines, ~16 min agent
  time, all four assertions without touching `src/`, one clock; mock-WS port estimated 165–190 lines
  plus a browser, a `src/` hook and two clocks. About 200 of the 249 lines are repo-specific: the cost
  is relocated, not removed, in a deterministic form. Elapsed-time-only eviction fails today as
  expected (E2, `ScoreboardContext.tsx:341-416`, no timer). *Not retired:* the post-migration
  driver's cost; human hours (E4); the other two client repos.
- **S4, retired for the rate.** Steady-state peak 12.2 pushes/s coalesced (733/min, nkz-20ne);
  busiest-minute bytes ≤ 4,753 B/s; on-course set 3–7 pushes/min; cold-start burst 1,172 Attempts;
  connect burst 152–1,167 rows; re-baseline never observed. Today's `/results` on a Pi 5: ~1,100–2,400
  rows/s, CPU-bound; margin 90–200× — a machine floor, not the §8.3 store's. *Not retired:* the §8.3
  store's own overhead (M3); the Railway machine; fan-out.
- **S5, prepared; execution pending the maintainer.** A runbook, a thin WS output over S1's domain, a
  headless latency client and a PowerShell sampler (329 lines); `player.js` confirmed at 10.00×. Linux
  reference on the Pi 5, two WS clients at 1× and 10×: receive latency p50 15–31 ms, p95 35–52 ms, max
  211 ms; 0 torn XML reads from `player.js`'s own writer, and the torn-read retry path proven on a
  synthetic torn write (6 of 17 reads torn, all recovered on the next retry 50 ms later). The venue
  laptop's CPU and memory over an hour and the real Canoe123-writer figure are the maintainer's; the
  poll interval (5 s in the spike and the vectors) is a deployment setting whose venue value comes from
  that run (`DERIVATIONS.md` §10 item 18). S1's figures bound the rest: a full nkz-19so day is 11–24
  minutes of CPU on a Pi 5 under 300 MB.

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
   its presented state equals the direct-injection replay's.
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

## Revision — the recorded re-run and the measured exit delay (2026-10-14, later the same day)

A scout measuring the exit delay found a genuine jury re-run in nkz-19so (C1M_BR1_19 bib 7, same
participant: run 1 10:46–10:48Z with a score, the TCP row wiped in place at 10:56:58, gone by 12:02,
run 2 12:40–12:42Z with the result push 108 ms before the on-course finish). Checked against the
rules, it refined two of them: INV-7's first-run case now names a row *present with no time and no
mark* as a retraction (it covered only an absent row and start-list mode), and D1's attribution keeps a
TCP row that arrives before the generation's on-course finish and attributes it when the finish arrives
with the same `Time`, instead of treating every such row as the replaced run's. Vector
`retraction-first-run-row-present-empty` is new; `rerun-tcp-row-before-new-finish-not-presented` now
delivers the row before the finish, as recorded. The exit delay's measured range is in §7.1, and S5's
preparation figures are above. 93 vectors.

## Revision 2 — the round-9 re-run (2026-10-14)

S1 re-ran the five windows on round 9: determinism 10/10, the four CHECKER-FAILs closed (0 violations
on P6, P15 and P11-status), D3 measured — the 10:05–10:30 step log fell from 422 MB to 43 MB and
`standing.updated` from 37,168 to 426, all serialised changes. Six more gaps, all adopted: two vectors
miscounted notifications (S1-26: a second-run Phase has a `phase` and a `pair` standing, so two
messages per change; S1-27: a leave for an Attempt never listed changes nothing) and were fixed, not
the merge; `left-without-finish` requires an observed start, which the stream's `on-course` or
`finished` implies (S1-28); a second run's carried-over `placement`, `pairTotal` and `countingRun` are
provisional from run 2's start until run 2's own row replaces them (S1-29, reading 3: the row usually
arrives before the finish); property 11's transition clause gains the cold-start case, an Attempt
listed while no course is bound (S1-30, CHECKER-FAIL, two steps); and D1's retain-and-attribute is the
normal path in every generation — the result push preceded the on-course finish message in 86 of 120
recorded finishes, by 0.055–0.709 s (S1-31, E1). 93 vectors.

## Revision 3 — the spike is closed on the design side (2026-10-14)

S1's round-10 re-run (`spike/m0` b7e0ee0): 93 of 93 vectors; the two affected windows (09:30–09:45,
10:44–10:57) replayed twice with matching hashes; 0 gate-2 violations in both. Every CHECKER-FAIL the
spike raised is closed. One last wording gap, S1-32: the carried second-run fields settle field by
field — `placement` and `pairTotal` at run 2's TCP row, `countingRun` only at its XML row, which is the
sole carrier of `BetterRunNr` (recorded: K1M_BR2_19:78, TCP row 09:31:51.169Z, XML row 09:31:56.698Z).
`CONTRACTS.md` §1.2/§2.6 and property 11 now say "until a row of run 2, with its time or mark, restates
that field". No code re-run is needed. What remains is execution, not design: S5's run on the venue
laptop, and M1's data gates listed above.

## Revision 4 — the opponent review (2026-10-15)

An independent reviewer (Opus, fresh context, read-only) re-ran the spike's code. The headline numbers
reproduce — 93/93 on byte-identical vectors, identical hashes, 0 violations, the fixture valid — and
the design decisions D1–D3 stand (D1 forced by data and free of athlete confusion; D2 and D3 sound).
What they prove is narrower than this ADR said, and five things beyond the five windows were wrong.

**Retired, honestly.** *S1 is retired for the named windows only* — 63 min of one slalom day and 45 min
of Cross, two of seven recordings, no finals, XER, team, C2, re-run, outage or re-baseline — and not
retired until items 1–4 of the M1 list above pass. Determinism held by construction: a single-threaded
file loop with no clock, socket or timer. Gate 2 was self-referential (the checker trusted the
ingest's own elements) and narrowed or vacuous in places (P10 and P13 ran zero times, P4/P7/P8 two to
four), with the same author as the core. *S2* is a mild overclaim: gate 3 was redefined to fit a
mid-race window while whole-race windows were available, the admission schema did not enforce
"complete", the human line certified the final XML rather than the fixture, and the tier-1 cross-check
was never done. *S3* is a mild overclaim: human hours are E4 and the mock-WS side an estimate. *S4* is
close to fair: the real core's rate agrees (≤ 7.4/s), its bytes run 35 % above S4's maximum
(6,434 B/s), and the margin swamps both.

**Five findings from running the code beyond the windows** (R13–R17, adopted; the table above): a
real merge bug — a stale pre-re-run DNF presented as run 2's status in the usual arrival order, because
the stale-mark check ran only on attributed rows, and the one vector meant to catch it fed TCP a finish
time D1 says TCP never carries (R16); a silent deviation inside a tested window — a 10.7 s TCP stall
emptied a Cross heat's on-course set with 0 violations, the stall exemption never implemented (R13);
circular evidence behind the 3 s leave constant, whose sweep evicted entries older than 2.5 s before
measuring, with real gaps of 3.04–4.29 s in four recordings (R14); property 15 with no classification
case, 673 violations on XER (R15); and a residual mis-attribution when two runs share a `Time` to
0.01 s (R17, DERIVATIONS §10 item 19).

**What changed in round 12.** §4.11/§4.12 reconciled: the stale-mark rule applies to any row of
generation ≥ 2 before attribution. The leave constant is 5 s provisionally and an M1 measurement over
the whole gap distribution; the stall exemption is stated as a rule the spike did not implement; a false
leave clears on re-listing and recomputes `provisional`. Gate 3's admission needs a window spanning
whole races checked against published results, the window-end comparison is a candidate check, the
human line certifies the fixture, and the schema enforces `status: admitted` with `if/then`. Property
15 gained the classification case. INV-2c's evidence now cites jarni-ne-odp only; the nkz 42/43 event
was a penalty move. CONTRACTS §7.2/§8.4 gained a heartbeat and the clients a liveness obligation, so a
ghost on a half-open connection cannot stand indefinitely (S3-3 follow-up). DERIVATIONS §0.2 names an
IANA zone. TEST-ARCHITECTURE §3.2 requires a checker by a different author, mutation-tested per
property, reading upstream's stream for the membership properties, and admits "implementation bug" as a
verdict — the spike's brief had excluded it, so every core-versus-checker disagreement moved the
contract to the core; R13 and R16 are what that framing could not surface. Fourteen vectors lost input
finish times on TCP rows; two were fixed outright (the stale-mark vector in the usual order; an
out-of-range `afterGivenIndex` that was never evaluated); `inv2-rule3-single-source-field` gained a
second field after a mutation probe showed its only assertion was skipped by the adapter. 93 vectors.

**The spike code** is kept as a **differential oracle**, not as M1's base: M1 runs its core and the
spike core on the same excerpts and diffs presented states, which is the second interpreter
TEST-ARCHITECTURE §3.2 says single-interpreter production loses. It is not M1's base because it was not
test-first (eight vectors written after the code, three corrected after it disagreed), has R16 and R13
in it, and is not production-shaped (one 1,574-line merge file, 96 `any`, no I/O layer, no polling, no
persistence, a fixed `+02:00`). The checker, the step-log format, the excerpt time-base fix and S2's
projection are worth porting as tooling, each re-reviewed against §3.2 by someone other than its author.

**Not adopted:** a rule comparing a row's cells with the on-course stream's before attributing (R17's
remedy). The case needs an equal `Time` to 0.01 s, the finish-first order and a rotation inside run 2,
and lasts under a second; recorded as residual (DERIVATIONS §10 item 19) until M1's data shows it.
