# ADR-012: Standing relays Canoe123's own order; the server assembles it and checks it, but never ranks

Supersedes the Decision of `ADR-008`, which computed rank mechanically and used upstream's rank only
to break genuine ties.

## Context

`ADR-008` made mechanical sorting the rule, on the grounds that it can be checked independently, and
kept an upstream `Rank` only to break ties. Real data now shows that Canoe123's ranking is itself the
set of competition rules that `CONSTRAINTS.md` §1.8 tells us not to reimplement. All of the following
is observed upstream behaviour (E1):

- **Ties.** A tie on a single run keeps a shared `Rank`, with the sequence in `RankOrder`. A tie on a
  combined better-of-two total is broken upstream by the run that did not count: in one race, two
  totals of 80.23 were ranked 6 and 7. So `ADR-008` step 3, which read `Rank` to break ties, could
  never fire for a single run. For a combined total it would reproduce upstream's result only by
  accident.
- **Result marks.** `RAL` is ranked last. `NON-RK` raced but is not ranked. In a second-run race, a
  `DNS` mark refers to run 2 only, and the athlete keeps a combined rank from run 1: bib 112 was
  marked `DNS` and ranked 110th.
- **Kayak Cross.** Athletes with faults rank after every clean finisher, whatever their finish order.
  The rank differed from the finish order in 28 of 64 heat rows at one event and 36 of 137 at
  another. The small final ranks from 5.
- **Formats.** For some formats the combined result is the sum of both runs, not the better one.
- **Test.** Recomputing each rank as 1 + the number of strictly lower totals agreed with upstream on
  99.8% of 277,000 rows across three recordings. Every mismatch inspected was a combined-total tie.

Upstream's placement also arrives fast. Every finish is followed by an event-driven results push, a
median of 0.14–0.41 s after the finish impulse (`ADR-011`). That push carries the complete ranked
field of the race.

## Options considered

**A — Keep `ADR-008`: rank mechanically, and relay only to break ties.** Rejected. The tie-break
reads a field that cannot carry it. Every rule listed above would appear as an anomaly or a wrong
rank.

**B — Relay upstream's order and rank, and compute our own rank as a display fallback until the
first push arrives.** Rejected. The fallback window is about half a second. In that window a
server-computed rank would be shown, then replaced whenever it differs. In the combined-tie case it
differs systematically. A value that appears for half a second and then changes is the flicker the
maintainer named (`EVIDENCE.md` Exhibit 11). A second code path whose output is visible for 0.5 s is
not worth what it costs.

**C — Relay upstream's order and rank. Assemble age-category standings from the relayed class
order. Use mechanical comparison only as an anomaly check.** Chosen.

## Decision

C, precisely:

1. **Placement is relayed.** Each `Attempt.placement` carries `{rank, order}` exactly as upstream
   states it for the standing its phase publishes. For the second run of a pair, that is the combined
   standing. Every `Standing` sorts by the relayed `order` and shows the relayed `rank`
   (`CONTRACTS.md` §5).
2. **Age-category standings are assembled, not ranked.** Canoe123 emits category ranks only in the
   XML snapshot, a median of about 20 s after the finish. The class ranking arrives in about 0.5 s.
   The assembly is:
   - filter the class standing by `ageCategoryId`;
   - category rank = 1 + the number of entries in the same category with a strictly better class
     rank;
   - order = class order.

   This reproduced upstream's own category ranks exactly: 1,855 rows, 0 mismatches, both single-run
   and combined. It applies no rule of its own; it is a filter of upstream's ranking. When the
   snapshot's own category rank later arrives and disagrees, the disagreement is recorded as an
   anomaly. It is never silently adopted in either direction.
3. **No display fallback.** Until placement is observed, `StandingEntry.rank` is `null` and the entry
   is listed after every placed entry. There is no second, server-computed rank to flicker from.
4. **Mechanical comparison is an anomaly check only.** In a duration-scored scope, an anomaly is
   recorded when relayed order places a strictly worse numeric result ahead of a strictly better one,
   among entries that carry no result mark. Ties are never flagged, because upstream legitimately
   breaks them. Cross scopes are never checked, because their order follows rules rather than
   arithmetic.
5. **Assembly is the same on both tiers.** live-mini assembles standings from the pushed `placement`
   and `ageCategoryId` exactly as c123-server does. It ranks nothing. This resolves the contradiction
   between `ARCHITECTURE.md` §3 ("live-mini owns no ranking") and the old §5, which live-mini would
   have had to run.
6. **The gap to the leader is derived.** `behindSeconds` is the entry's result minus the leader's
   result, for duration scopes only. Upstream's pre-formatted "behind" strings are not relayed.

## Why

This is the principle `ADR-008` already stated, which is to relay competition rules and never invent
them, now applied to the order itself, where the rules actually live. It also keeps what `ADR-008`
valued. The relay is testable: given a placement, the standing has one correct shape. The
independent check survives as the anomaly check (step 4).

## What it costs

The standing is only as correct as Canoe123's ranking. That is accepted, because Canoe123's ranking
is the official one. Before upstream has placed a new finisher, which takes about 0.5 s in the
recordings, the scoreboard shows the result without a rank.

Where the event runs Canoe123 with "ranking with incomplete penalties" switched on, the first
placement can be based on unfinished judging. At one recorded event, 18% of first ranks in run 1
later changed. The contract marks this honestly: `provisional` stays `true` until judging completes
or the run is closed (`CONTRACTS.md` §1.2, §2.6). This works the same way whichever mode the event
uses.

## What it forecloses

Any tier computing a rank from outcomes, as distinct from assembling one. The anomaly check computes
an ordering but publishes nothing except the anomaly.
