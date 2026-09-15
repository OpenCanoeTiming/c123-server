# Domain Facts — Canoe123 as a Data Source

Compiled for the architecture rebuild. Sources: `c123-protocol-docs/c123-protocol.md`,
`c123-protocol-docs/c123-xml-format.md`. This file states what the upstream system *is*, not
what our code does. Provenance for individual facts lives in that private repository; keep it
there.

Canoe123 ("C123") is a closed, third-party timing application running on a Windows machine
at the venue. It cannot be changed, and no feature request can be made of it. Every property
below is a constraint to be absorbed, not a defect to be fixed upstream.

---

## 1. C123 exposes the same event through several unequal interfaces

| # | Interface | Transport | Direction | Delivery | Guaranteed present? |
|---|-----------|-----------|-----------|----------|---------------------|
| 1 | VIEWER_MAIN | TCP :27333 | C123 → us | Push | Yes |
| 2 | VIEWER_MAIN | UDP :27333 | C123 → broadcast | Push | Yes |
| 3 | TERMINAL_MAIN | UDP :27334 | us → C123 | Command | Yes |
| 4 | CIS | HTTP :80 (configurable) | us → C123 | Poll | **Licensed — and we hold the licence** |
| 5 | Mobile/Android | UDP :10600 | bidirectional | AES+Base64 | Not used by us |
| 6 | CanoeLiveInterface | WS :8081 | C123 → us | Push (JSON) | Legacy; transform only |
| 7 | XML snapshot file | filesystem | C123 → us | Continuous rewrite | Yes, if path known |

The current c123-server uses TCP:27333 bidirectionally (reads *and* writes commands through it),
which differs from the native terminal protocol that separates read (27333) from write (27334).

**The architecturally important fact:** these interfaces do not carry the same data, do not carry
it at the same fidelity, and are not all available at every venue.

## 2. Fidelity differs per interface — and the richest one is optional

| Fact | TCP :27333 | CIS `/live` | Consequence |
|------|-----------|-------------|-------------|
| On-course competitors | push ~2/s | poll | CIS adds pre-computed Rank, TTBDiff, split diffs |
| Results | push, **rotating ~30 s** | on demand per RaceId | TCP gives a category's results only once per rotation |
| **Both runs of a two-run race** | **best run only** | **Time1+Pen1+Total1 and Time2+Pen2+Total2** | CIS solves the BR2 loss described in §4 |
| **Gate passage times** | absent | `GateTimes` per gate | CIS-only capability |
| Athlete directory | names embedded in messages | `GetAthletes` standalone | CIS-only |
| Event metadata (venue, discipline, logos) | absent | `GetEvent` | CIS-only |
| Schedule | push ~40 s | on demand, adds GateConfig `S` markers | different shape |
| Race config | push ~20 s | `GetStatus.RaceConfig` | same data |
| Time of day | push 1/s | `GetStatus.OfficialTime` | both |
| Write penalties | Scoring via TCP/UDP | `SetScores` via HTTP | both |

**We hold the CIS licence.** It is therefore a source this project may genuinely depend on — which
matters, because it is the only interface carrying both runs of a two-run race and gate-by-gate
passage times. Much of the reconstruction machinery in the current code exists only because CIS
was never used.

Two residual conditions remain, and they are operational rather than commercial: CIS needs
Administrator privileges or a registered URL ACL on the timing machine, and an operator must have
performed the "Init Event to CIS" action for the event. Both can fail on a race morning.

**Design consequence:** depending on CIS is now a design *choice*, not a forced constraint. Make it
deliberately, and say what the system does — and how it says so — when a source it expects is not
answering. Silently producing different numbers depending on which sources happened to respond is
the failure mode to design out.

## 3. Push cadences are unequal and unsynchronised

| Message | Cadence |
|---------|---------|
| TimeOfDay | 1/s |
| OnCourse | ~2/s |
| RaceConfig | ~20 s |
| Schedule | ~40 s |
| Results | rotating, ~30 s per cycle |

Nothing coordinates these. Two messages describing the same competitor can arrive in either
order and can disagree, because they were produced at different moments. **Results rotation is
the sharpest case: a category's results snapshot may be up to a full rotation old, while OnCourse
data about the same competitors is 500 ms old.**

## 4. Two-run races (BR1/BR2) lose data by design

In a second run, C123 sends:

```xml
<Result Type="T"
  Time="82.36"          <!-- 2nd run raw time -->
  Gates="0 0 0 2 ..."   <!-- 2nd run per-gate penalties -->
  Pen="0"               <!-- penalty of the BEST run -->
  Total="81.72"         <!-- total of the BEST run -->
  Rank="1" />
```

`Time` and `Gates` describe run 2. `Pen`, `Total` and `Rank` describe whichever run is better.

| Scenario | Run 2 recoverable | Run 1 recoverable |
|----------|-------------------|-------------------|
| Run 1 is better | yes (Time + Gates) | yes, by derivation: `Total − Pen` |
| Run 2 is better | yes (= Total) | **no — irretrievably absent** |

The only complete remedies are caching BR1 results when they were live, or reading CIS
`GetResult`, which carries both runs explicitly. Caching means the correctness of a displayed
value depends on whether a process was running and listening earlier — i.e. on history, not on
current input. This is a statefulness requirement, not a convenience.

## 5. There is no finish event

C123 never announces a finish. A finish is inferred from `dtFinish` transitioning from `""` to a
timestamp inside the OnCourse message. Observed sequence for one competitor:

```
ts=62847  oncourse: Time="53"              (running, whole seconds)
ts=62985  Results message (updated)
ts=63212  CLI: HighlightBib = 9            (+42 ms, derived downstream)
ts=63213  oncourse: dtFinish="10:35:11.325", Time="51.20"   (decimals appear)
...       competitor remains in oncourse for ~4 s
ts=66920  oncourse: competitor disappears  (moved to Results)
```

Three usable signals, of unequal reliability: the `dtFinish` transition (high), the downstream
`HighlightBib` change (high, but CLI-only and derived), and the `Time` format changing from whole
seconds to decimals (medium). C123 is the origin; anything else is a derivative arriving 28–43 ms
later.

Competitor lifecycle in OnCourse: *at start* (`chStart=0`, `dtStart=""`) → *on course*
(`chStart=1`, running time) → *finished but still listed* (~4 s) → *gone, now in Results*.
The ~4 s overlap means a competitor legitimately exists in both OnCourse and Results at once,
with potentially different values.

## 6. The same concept is encoded differently in different messages

Per-gate penalties, `0` clean / `2` touch / `50` missed / empty not yet passed:

- OnCourse: comma-separated, `"0,0,0,2,0,0,2,0,50,,,,,,,,,,,,,,,"`
- Results: fixed-width space-padded, `"  0  0  2  0  0  0  50  0 ..."` (typically 25 gates × 3 chars)

Competitor identity appears as `Bib` (display number, unique within a race), `Id` (internal,
e.g. `30034.K1M_ST`) and `StartOrder`. Race identity appears as `RaceId` (`K1M_ST_BR2_6`) and
separately as a human string `Race` ("K1m - middle course - 2nd run"). Class identity has its own
format (`[Boat][Gender]-[Age]`, and for Cross `[Boat][X][Gender]-[Age][-Type]`).

## 7. Status vocabularies are larger than practice

`RaceStatus` has 14 values: 0 Scheduled, 1 StartList,
2 Delayed, 3 InProgress, 4 Unofficial, 5 Official, 6 Revised, 7 Cancelled, 8 GettingReady,
9 Unconfirmed, 10 Protested, 11 Interrupted, 12 Rescheduled, 13 Postponed. Only 0, 3, 4 and 5
are common in practice — so any consumer that has only ever seen those four may be silently
wrong about the rest.

Per-run status codes are a separate, smaller vocabulary: empty (completed), `DNS`, `DNF`, `DSQ`,
`CAP` (capsized, slalom-specific).

## 8. Kayak Cross breaks assumptions that slalom code holds implicitly

Kayak Cross is already present in the XML format and is an open feature request in both the
scoreboard and live-mini.

| Aspect | Slalom | Cross |
|--------|--------|-------|
| Gates | ~24, CourseNr=1 | ~6, CourseNr=2 or 4 |
| `dtStart` / `dtFinish` | present | **absent** |
| `Time` in X4/XS/XF | a time | **finish order** (1000, 2000, 3000, …) |
| Phase progression | BR1→BR2, or QUA→SEM→FIN | XT→X4→XS→XF→XER |
| Competitors at once | 1 | 4 (head-to-head) |
| Extra fields | — | `PrevRnk`, `RoundNr`, `Qualified`, `RecordType` |

Two load-bearing slalom assumptions fail outright: finish detection via `dtFinish` (the field does
not exist) and "`Time` is a duration" (it is an ordinal). Any design that treats the slalom shape
as *the* domain model will need structural change to admit Cross, not merely new fields.

## 9. Writing back to C123

We do not only read. Terminal commands exist for: Scoring (penalty entry), Timing (manual
impulse), RemoveFromCourse (status change such as DNS/DNF/DSQ), AddBibOnCourse, EditBibOnCourse,
PenaltyCorrection, BackupScoring, TVS (TV overlay). The penalty-check application writes through
these. Writes therefore race with reads: a value we just wrote will be echoed back later through
a push whose cadence we do not control.


## 10. Upstream behaviour can be checked, not guessed

Authoritative reference material for Canoe123's internal behaviour — enum values, field semantics,
edge cases — is held locally in the private `c123-protocol-docs` repository. Ask the orchestrator
for access rather than searching for it.

Treat it as read-only: consult it to decide, but do not quote it, name its files, or let its
contents into any deliverable. It is private and the deliverables are destined for a public
repository.

This changes the character of open questions about Canoe123: where this brief calls a behaviour
unknown, it is usually *checkable*. Prefer checking to assuming.
