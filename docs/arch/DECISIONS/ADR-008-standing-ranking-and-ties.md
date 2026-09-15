# ADR-008: Standing is computed mechanically; upstream rank resolves only genuine ties

## Context

Raised directly by the orchestrator as unresolved after round one: `Standing.rank` was described as
"mechanical best-of comparison **or** direct relay of an upstream-asserted `Rank`" without a
switching rule. Two problems follow from leaving it that way: what happens when the two disagree, and
what happens on a tie the maintainer has told us not to invent a tie-break rule for
(`CONSTRAINTS.md` §1.8 — federation-specific ranking schemes must not be baked into the domain core).
`live-mini` already carries an open issue about tie-aware ranking, so this is a live gap, not a
theoretical one.

## Options considered

**A — Always trust and relay an upstream `Rank` field verbatim.** Rejected: reintroduces exactly the
two-sources-of-truth ambiguity `DECISIONS/ADR-003` exists to remove for two-run precedence
(`EVIDENCE.md` Exhibit 3), now at the ranking layer instead of the value layer. It also fails
`BRIEF.md` §5.6's implementability bar — "trust whatever the field says" is not a rule Claude Code
can write a test against, because there is nothing to check it against.

**B — Always compute rank ourselves, ignore any upstream `Rank` entirely.** Rejected: it silently
shows a tie in cases where an official has actually resolved one — itself a wrong fact, and a
different flavour of the exact problem this design exists to remove. `CONSTRAINTS.md` §1.8 says not
to *invent* federation-specific rules; it does not say to discard an official's own resolution of one.

**C — Mechanical computation is the default and the only thing independently checkable; an explicit
upstream `Rank` overrides it narrowly, only where our own arithmetic ties two or more entries;
disagreement on a non-tied ordering is never silently accepted or silently overridden — it is
recorded as an anomaly.** Chosen (`CONTRACTS.md` §5).

## Decision

C, exactly as specified:

1. Sort by outcome value (`totalSeconds` or `ordinal.order`), ascending. Mechanical, ours, testable.
2. Equal values get equal rank (standard skip ranking) by default — we do not invent a tie-break.
3. An explicit upstream `Rank` that differentiates a mechanically-tied group resolves it — treated as
   a competition-rules judgement we are told to relay, not invent.
4. An upstream `Rank` disagreeing with a *non-tied* mechanical ordering never wins silently: the
   mechanical ordering stands, and the disagreement is recorded in `Standing.anomalies`.
5. No-result entries (`dns`/`dnf`/`dsq`/`cap`) get `rank: null`, never a fabricated number — this is
   not federation-specific; a nonexistent time cannot be ranked under any ruleset.

## Why

This is the narrowest rule that keeps both properties the constraints ask for at once: verifiable
(the mechanical part is a pure function of `Attempt.outcome` values, testable without reading any
implementation) and federation-neutral (the one place a real ruleset might differ — how a tie is
broken — is relayed, never guessed at).

## What it costs

An anomaly-surfacing mechanism (`Standing.anomalies`) that a naive "trust the field" design would not
need — small, but real added contract surface, and a decision about who consumes it (the on-site
admin UI, primarily; not a spectator-facing signal, consistent with `DECISIONS/ADR-004`'s stance on
not nagging about internal disagreements).

## What it forecloses

Any implementation, on-site or in `live-mini`, treating an upstream `Rank` field as unconditionally
authoritative. This directly resolves `live-mini`'s open tie-aware-ranking issue by giving it one
precise rule to implement rather than leaving it to invent its own — which is exactly how its current
independent ranking logic came to exist (`EVIDENCE.md` Exhibit 9).
