# ADR-004: CIS as a best-effort primary source; degradation is honest, never announced

> **Status: Decision superseded by `ADR-011` (2026-09-24).** CIS is no longer consumed. The no-nagging
> principle below still holds, and now applies to TCP and the XML snapshot. Original text kept for the record.

## Context

CIS is the only interface carrying both runs of a two-run race and gate-by-gate passage times
(`DOMAIN-FACTS.md` §2); today's code does not use it at all, and most of its reconstruction
machinery exists only because of that gap. The maintainer holds the licence, but `CONSTRAINTS.md`
§1.7/§2.6 establish this is not true of every organiser: several independent groups use this
ecosystem, isolated on-site, and CIS availability is a genuine per-deployment variable, not a
project-wide given — an operator must also have performed an "Init Event to CIS" step and hold the
right OS privileges, both of which can fail on a race morning even where the licence exists
(`DOMAIN-FACTS.md` §2).

## Options considered

**A — Require CIS.** Rejected: it would make every organiser without the licence unable to run the
system at all, which `CONSTRAINTS.md` explicitly rules out by naming CIS availability as
deployment-variable rather than fixed.

**B — Ignore CIS, as today.** Rejected: it is the only source for two-run gate detail once a run is
superseded on the wire (absent live caching — `DOMAIN-FACTS.md` §4) and for robustness to a
mid-event server restart (`ARCHITECTURE.md` Scenario C). Leaving it unused is exactly the gap the
brief calls out as a design decision nobody has actually made.

**C — CIS as best-effort, polled opportunistically, preferred when connected, with every affected
value carrying honest provenance regardless of whether it is.** Chosen.

**On the notification question specifically — a fourth option, given directly by the maintainer
after round one:** a spectator-facing "results may be incomplete" banner. Explicitly rejected by the
maintainer: he would rather show some values stale for tens of seconds than notify about
incompleteness, and was explicit that CIS absence is handled organisationally between organisers, not
by the system nagging about it.

## Decision

C. `SourceStatus.cis` (`CONTRACTS.md` §2.8) is a diagnostic resource, consumed by the on-site admin
UI. The only effect a missing CIS connection has on any client-facing value is indirect: the specific
fields it would have supplied carry `unavailable{reason}` or a `provisional`/`confidence` marker
lower than CIS would have produced — never a separate alert.

## Why

The maintainer's principle directly: incompleteness is local in time, and the system's job is to
behave *consistently* without a source, not to advertise its absence. This is also the only answer
consistent with `CONSTRAINTS.md` §1.8: an adopter running without CIS, on a deployment nobody here can
inspect, has no channel back to us to ask what a missing value means — the contract has to say so on
its own, quietly, in the value itself.

## What it costs

Every value that CIS would improve needs two honest paths specified, not one — `CONTRACTS.md` §6's
derivability ledger states both for every affected field, with-CIS and without, rather than assuming
one deployment shape.

## What it forecloses

Any future feature that assumes CIS is present without checking — the contract has no field that
silently degrades to a wrong number when CIS doesn't answer; it degrades to an honestly-marked
`unavailable` or lower-confidence value instead.

## One more source, addressed explicitly rather than left silent

`DOMAIN-FACTS.md` §1 lists a fourth interface this ADR had not named: Canoe123's own UDP broadcast of
`VIEWER_MAIN` (UDP:27333), carrying the same content as the TCP push, guaranteed present. Distinct
from our own UDP autodiscovery (`CONSTRAINTS.md` §1.3, a different protocol, unrelated purpose) — this
is Canoe123 broadcasting the same feed a second way. Today's code already answers whether to use it:
`UdpDiscovery.ts` treats it as discovery-only and never parses its payload into state
(`CURRENT-STATE.md`, confirmed by its own audit citation, `server.ts:667-683` subscribing only to
`discovered`) — E2 evidence, our own code, not upstream behaviour. **This design makes the same
choice, deliberately, not by omission:** TCP's push already meets the on-course latency requirement
(`DOMAIN-FACTS.md` §3), and consuming a second, connectionless copy of the identical feed would only
buy a redundancy path for exactly the case TCP disconnects — at the cost of a second per-message
consistency question (does the UDP copy of a given fact ever race ahead of or behind its TCP twin) that
nothing today shows a need to answer. Not used; recorded as a decision rather than an absence.

## Revision — the stated justification for CIS was false, not merely optimistic

This ADR's Decision, above, argued for depending on CIS because it is "the only interface carrying
both runs of a two-run race and gate-by-gate passage times," quoting `DOMAIN-FACTS.md` §2 directly.
**Checked against a real two-day event, this is false, not merely incomplete.** CIS was unreachable
for the event's entire duration — 61,000 polls, every response an empty envelope, the operator never
having performed "Init Event to CIS" — and the on-site XML snapshot alone reconstructed both runs,
gate-by-gate penalties, and (all but one row of 738) gate passage times for every finished Attempt of
the weekend: 397 completed BR1 runs, 384 completed BR2 runs. `DOMAIN-FACTS.md` §2's own listing of
`GateTimes` as a "CIS-only capability" is corrected alongside this ADR, and `CONTRACTS.md` §4/§6 carry
the same correction into the contract itself.

**What CIS actually retains, reassessed rather than defended: on-demand immediacy, not completeness.**
It can be queried the instant an answer is wanted, rather than waited on for Canoe123's own XML
rewrite (measured at a ~35 s median) or a TCP `Results` rotation of comparable order. This is real,
narrower value than the ADR originally claimed: it is what `CONTRACTS.md` §4 INV-2b's re-query
trigger actually calls on, and it shrinks the worst-case latency for any value XML would otherwise
take up to a rewrite cycle to reflect. It is not a source of completeness the XML snapshot lacks —
the snapshot supplies that on its own, to every deployment, with no licence, no configuration, and no
operator action that can fail on a race morning.

**One thing this revision does not resolve, stated as a limit of the evidence rather than an
omission:** `DOMAIN-FACTS.md` §2 also credits CIS with pre-computed `Rank`/`TTBDiff` for *on-course,
not-yet-finished* competitors — a genuinely different question (live, provisional ranking) from the
finished-run completeness this investigation settled. CIS never answered a single poll all weekend,
so this specific claim could not be tested either way, and is recorded here as untested, not as
confirmed or refuted.

**Cost of the correction:** none to the architecture itself — CIS was already modelled as best-effort
and never required, and that Decision is unchanged. What changes is the *reason* to keep polling it,
and `CONTRACTS.md` §4's ranking table, which this revision brings into line with the evidence.

## Revision 2 — superseded (2026-09-24)

The Revision above left CIS one argument, on-demand immediacy, and one untested claim, an on-course
pre-computed rank. The reverse pass and a latency measurement settled both, as observed upstream
behaviour:
- **Immediacy.** On the same recalculation trigger that re-feeds CIS, TCP pushes the race
  immediately. The median delay was 0.14–0.41 s after the finish impulse, over 1,533 finishes.
- **The on-course rank claim is false.** CIS leaves rank blank while a competitor is running, exactly
  as TCP does.

CIS also accepts unauthenticated overwrites from the LAN, and cannot show whether it is serving the
current event. The Decision is superseded by `ADR-011`. The option-A/B/C analysis above is kept only
as history.
