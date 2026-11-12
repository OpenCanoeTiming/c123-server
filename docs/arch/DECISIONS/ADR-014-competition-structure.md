# ADR-014: Competition structure — classes, age categories, formats, heats, classifications, courses

## Context

The reverse pass found that the entity spine (`ADR-001`) survives. What was wrong was the structure
hung inside it:

- **Naming.** The contract's `Category` was Canoe123's *class*. In both Canoe123 and ICF usage,
  "category" means an age band.
- **Age categories were missing.** At national events they exist inside every class. They are
  official results, and the maintainer confirmed they are shown alongside the class standing.
- **Formats.** The round vocabulary named three tokens Canoe123 does not have: `QUA`, `SEM` and
  `FIN`. It also missed the international heat format, which pairs two runs exactly as `BR1/BR2`
  does. The rule that a pair is best-of was assumed and never stated. For some formats upstream sums
  the two runs.
- **Kayak Cross heats and the final classification.** One Cross race holds several heats. The Cross
  final-classification race (`XER`) holds a classification, not attempts.
- **Course structure** (#165) had no home in the contract.
- **Crews and teams** (#166) had no home in the contract.

The maintainer's rule for formats: the model stays open to every format Canoe123 supports, even where
live results do not implement it yet. The implementation priority is:
1. best-run slalom;
2. Kayak Cross;
3. semi-final plus final, possibly with heats;
4. sprint;
5. one-run slalom, sprint and patrol (team) races.

## Decision

1. **Rename `Category` to `Class`** throughout the contract: `classId`, `/classes/`, `class-not-found`.
   "Category" now means an age category only. `ADR-001` to `ADR-010` keep their original wording;
   read `Category` there as `Class`.
2. **Age categories.**
   - Age categories are relayed, never computed. `Class.ageCategories` lists them, from the event's
     own category table.
   - `Entry.ageCategoryId` is Canoe123's own assignment. The rule from birth year to category is
     federation matter, and Canoe123 has already applied it.
   - Age-category standings are first-class. They are published alongside the class standing and
     assembled from it (`ADR-012`).
3. **Formats are open.** `Phase.format` carries upstream's token verbatim. A table of known tokens
   (`CONTRACTS.md` §2.4) maps the structural properties:
   - **Pairing.** First and second run of a pair. A second run combines as *best* for `BR2`, `HT2`,
     `NHT2`, `EL2` and `TR2`, and as *sum* for every other second-run format. This is E1, from the
     source.
   - **Scoring kind.** Ordinal for Cross head-to-head rounds.
   - **Phase kind.** `race` or `classification`.
   - **Heats.**

   An unknown token is carried, never rejected, and defaults to a single-run, duration-scored race.
   Live results may leave a format unimplemented. The model never closes one off.
4. **Heats.** `Attempt.heat` and `Attempt.startLane` carry them. In Cross, upstream's `StartTime`
   field carries the lane, not a time. Standings have a heat scope. A heat is a grouping inside a
   Phase, not an entity: it has no attributes of its own.
5. **Classifications.**
   - A Phase of kind `classification` (`XER`) holds no Attempts. Its rows are upstream's final
     classification of the event and feed a Standing of scope `classification`. Each entry records
     which round decided its place.
   - Other upstream tokens that look like event rankings (`RXER`, `SLER`, `WWER`) default to unknown
     until checked. This is E4 and recorded as an open question.
6. **Courses** (#165). A `Course` is referenced by `Phase`, not owned by it. Its layout string is the
   single truth:
   - gate count, gate kinds, sector boundaries (`S`) and split positions (`I`) are all derived from
     the layout;
   - upstream's transmitted gate count is ignored, because the stream fabricates a 25- or 30-gate
     course when none is configured;
   - course numbers exist only in the XML snapshot;
   - TCP describes only the currently selected course, and is used only to refresh that one.
7. **Crews and teams** (#166).
   - `Entry.members` is a list of 1 to N persons. Each has given and family name, an optional birth
     date, and a required-or-null external identity (`ADR-006`, Revision 3).
   - A team's members come from upstream's member references, resolved against the participant
     records.
   - A team's per-gate penalty is the sum over its members, so `Gate.penalty` is an integer, not
     strictly `0|2|50`.
8. **`pair` replaces `multiRun`** on `Phase`, on both tiers. It states the role, the sibling Phase and
   the combination rule.

## What it costs

One vocabulary change across the contract, made once, in the consolidated revision, when it is
cheapest. It also costs a known-token table to keep current. An unknown token degrades to "single-run
race", never to an error.

## What it forecloses

Any client inferring pairing, scoring kind or heat structure from a token string. The domain layer
states them.

## Revision — #179 answers (2026-09-25)

- **Formats (point 3).** `SLER` and `WWER` join `XER` as event-result classifications; `RXER` is a
  title only. A super-final after a second run, and a final after a semi-final under upstream's
  per-machine legacy-finals setting, both combine as the *sum* of two runs with the tie broken by the
  better run. Neither is computed: the setting is not in the event file, so two machines could rank
  the same final differently, and only relay is safe (`CONTRACTS.md` §2.4).
- **Courses (point 6).** `D` is the Kayak Cross start ramp and `E` the roll zone: judging slots that
  count in upstream's gate count and in every gate string's width but never advance the gate number.
  `Course.slots` carries them; cells are parsed per slot (`CONTRACTS.md` §2.12, `DERIVATIONS.md`
  §4.6).
- **Kayak Cross faults** are derived from the cells and captions, on both interfaces; upstream's
  `Pen` is ignored in Cross (`DERIVATIONS.md` §4.6(d)).
- **Attribute sub-classes** are ordinary separate classes; no base-class link exists upstream.

## Revision — the evidence class of `NHT2` in decision 3 (2026-11-12)

Decision 3 lists `NHT2` among the second runs that combine as *best* and calls the list E1. For
`NHT2` that class does not hold. A later reading of upstream's behaviour did not confirm that
`NHT1` and `NHT2` are combined at all: it found the second run ranked as its own run, the first
only seeding it. No recording or sample holds either token. The evidence class for `NHT2` is
therefore E4, not established; for `BR2`, `HT2`, `EL2` and `TR2` it is unchanged.

The decision itself is not changed here. `NHT1`/`NHT2` are a pair with `combination: 'best'` by
the maintainer's decision of 2026-11-11 (`CONTRACTS.md` §2.4), which stands until it is verified
on real `NHT` data or with the maintainer (`DERIVATIONS.md` §10 item 31).

## Revision 2 — `NHT2` is not a pair (2026-11-12)

The previous revision kept `NHT1`/`NHT2` as a pair combining as *best*, by the maintainer's
decision of 2026-11-11, with the evidence class E4. The maintainer has replaced that decision
(2026-11-12; `DECISIONS/LOG.md`): there is no NHT combination. Upstream's two-run total and
better-run path takes `BR2`, `HT2`, `EL2` and `TR2` and excludes `NHT2`; `NHT2` is ranked as its own
run, and `NHT1` only qualifies its runners and seeds `NHT2`'s start list (upstream behaviour).

Decision 3's pairing bullet therefore reads: a second run combines as *best* for `BR2`, `HT2`,
`EL2` and `TR2` (E1, unchanged), and as *sum* for every other paired second run. `NHT1` and `NHT2`
are known single-run formats, `pair: null` (`CONTRACTS.md` §2.4). The qualification and start-list
link between them is not modelled. `DERIVATIONS.md` §10 item 31 is closed.
