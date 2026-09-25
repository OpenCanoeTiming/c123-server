# ADR-011: CIS is not consumed; TCP and the XML snapshot are the only upstream sources

Supersedes the Decision of `ADR-004` (CIS as a best-effort primary source). `ADR-004`'s principle on
degradation, which is to behave consistently without a source and never nag about it, is kept unchanged
and now applies to TCP and the XML snapshot.

## Context

`ADR-004` chose CIS as a best-effort primary source because it was believed to be the only interface
that carries both runs of a pair and gate detail. Its first Revision showed that the XML snapshot
carries both, and left CIS with one remaining argument: on-demand immediacy. A reverse pass over every
field CIS serves, and a latency measurement, removed that argument too. The maintainer approved
dropping CIS on one condition: result and rank must reach the scoreboard and live results within a
few seconds of the finish, best-of-two races included.

## Options considered

**A — Keep CIS as an optional accelerator.** Rejected. It accelerates nothing (see "Why", point 2).
It also brings a second decoding surface and a trust problem, and every CIS path needs a non-CIS twin
tested alongside it.

**B — Keep CIS only for the facts it alone serves.** Rejected. Those facts are listed under "What is
given up" below. None of them is a fact the contract carries.

**C — Consume no CIS operation at all.** Chosen.

## Decision

C. c123-server reads Canoe123 through exactly two interfaces:
- the TCP push, for on-course facts and event-driven result pushes;
- the XML snapshot, for the complete record, for cold start, and for the facts TCP never carries.

Canoe123's UDP broadcast stays discovery-only (`ADR-004`, closing addendum). `SourceTag` loses `cis`
(`CONTRACTS.md` §1.2). `SourceStatus` loses its `cis` member (§2.8). The merge rules lose their CIS
column, and INV-2b loses its re-query clause (§4). The derivability ledger becomes a single column
(§6).

**Never call.** If anything in this ecosystem ever touches the CIS port again, for any reason, these
operations stay off-limits:
- `Upload`: it replaces what CIS serves, and it is accepted without authentication.
- `SetScores`: it applies only to a bib currently on course, silently does nothing otherwise, always
  answers `OK`, and cannot target a closed phase.
- `SetStop`.
- `SetRaceConfig`, `SetOnCourse` and `SetOfficialTime`: each overwrites the state the status query
  serves.
- `GetVideos`: it makes the timing PC fetch whatever URL the caller supplies.
- The status query with a non-zero sector number: it marks a scoring sector online in Canoe123's own
  UI as a side effect.

**Security note.** Any host on the venue LAN can overwrite what CIS serves, without authentication.
CIS data is therefore only as trustworthy as the least trustworthy device on that network. This alone
disqualifies it from outranking the other sources, and the previous merge table ranked it highest.

## Why

The evidence is E1: observed upstream behaviour, from recordings, confirmed against the decompiled
source.

1. **CIS serves nothing unique.** It serves Canoe123's own results table and on-course record,
   re-rendered. Where compared, values were byte-identical to the XML snapshot: times, penalties,
   gate data and ranks. Every value the contract carries is on TCP, in the XML, or both.
2. **CIS is not faster.** CIS is re-fed a race when that race's ranking is recalculated. On the same
   trigger, TCP pushes the race immediately, marked `Current="Y"`. That trigger covers:
   - the finish;
   - every penalty change;
   - the last gate being judged;
   - corrections, including corrections to closed races;
   - the run being closed.

   When a first run changes, the paired second-run race is pushed as well. Measured over 1,533
   finishes in four recordings, all with best-of-two races:
   - every finish received such a push;
   - the median delay after the finish impulse was 0.14–0.41 s per event and run, with p90 ≤ 0.62 s;
   - in a second run, the pushed rank is already the combined better-run rank.

   The maintainer's latency condition is met without CIS. The rotation, which comes round to a given
   race only every few minutes, carries none of this.
3. **Integrity.** See the security note above.
4. **Validity cannot be seen.** "Reachable but never initialised" and "frozen on a previously loaded
   event" both look connected. The first state lasted an entire recorded two-day event (61,000
   empty polls). Six of the seven cached recordings are empty all day.
5. **Decoding traps.** CIS adds several:
   - two further gate encodings, one of which omits unjudged gates exactly as it omits clean ones;
   - status words inside numeric total fields;
   - an empty penalty field on second-run rows;
   - numeric sentinels.

   Each is a place where maintained code can be quietly wrong, and none of them buys a fact.
6. **The claim of an on-course rank is false.** The documented claim was that CIS pre-computes rank
   and time-behind for running competitors. In fact the rank is blank while running, and time-behind
   is a time-to-beat on approach to the finish. Both come from the same internal fields TCP
   serialises.
7. **Most adopters will not have the licence** (`CONSTRAINTS.md` §2.6). A design that needs no CIS is
   the same design for every deployment.

## What is given up

None of these facts is carried by the contract:
- live per-gate stamps during a run, which record when a judge entered a penalty, not when the boat
  passed the gate (see `ADR-003`, Revision 3);
- split differences retained per split, which never appeared in any recording because no split
  was armed at any recorded event;
- the CIS initialisation session id.

**Scoring-terminal reset.** Answered from the source (2026-09-25, #179): the action resets only the
hardware judge terminals on their own port and never touches the TCP command receiver the server
writes through. Penalty-check keeps no direct terminal channel, and nothing needs to react to the
reset (`CONTRACTS.md` §7.3).

## What it costs

Nothing measurable in latency or completeness, per the evidence above. `DERIVATIONS.md` loses its CIS
paths. `TEST-ARCHITECTURE.md` §9's two CIS emulator bugs stop blocking anything.

## What it forecloses

Re-introducing CIS needs a new ADR. That ADR must name a fact, or a latency, that TCP and the XML
snapshot demonstrably cannot supply.

## Revision — reopened and re-confirmed on the second-run question (2026-09-24)

The maintainer reopened this decision on a recurring pain point. In a best-of-two race where run 1 is
the better one, TCP's result push after run 2 appeared to lose run 2's own time, penalties and gates.
The rule given: if CIS can deliver run 2's detail immediately where nothing else can, use it. Both
sides were checked, as observed upstream behaviour (E1):

- **TCP carries run 2's detail.** The second-run row carries run 2's own time, gate cells and mark.
  Run 2's penalty is exactly the sum of the cells. The final row matched the XML in 982 of 982
  second-run finishes, 407 of them with run 1 better. Every penalty change pushes the row at once,
  and so did all 24 recorded later corrections. The median delay is 0.14–0.35 s. The earlier
  impression of loss came from reading `Pen`/`Total`, which describe the counting run.
- **CIS adds nothing here.** Its second-run row carries run 2's time, penalty, total and gates. It is
  refreshed by the same recalculation that triggers TCP's push. Its sparse gate string omits an
  unjudged gate exactly as a clean one: that happened in 4 of 70 recorded cases. A status set on a
  silent path (start-terminal DNS, removal before a finish) refreshes CIS no more than it pushes TCP.

The Decision stands. `DERIVATIONS.md` §4.4 and §4.6(e) carry the TCP recipe. The one real gap is run
1's detail after a cold start, and the XML snapshot is the path for that (§4.5).

