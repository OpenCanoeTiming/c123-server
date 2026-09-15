# ADR-004: CIS as a best-effort primary source; degradation is honest, never announced

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
