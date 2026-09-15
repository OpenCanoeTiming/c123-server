# Brief — Target Architecture for the c123 Ecosystem

You are being brought in as a specialist for one thing: **design judgement on a hard problem.**
Everything that is legwork has already been done for you, and everything that remains legwork
should be delegated, not performed. Your time here is the expensive resource in the project.

---

## 1. The mission

Four applications read the same canoe-slalom race from the same timing system and each reaches
its own conclusions about what is happening. The maintainer's own statement of the goal:

> Eliminate the problems we live with today — above all the endless debugging of component
> behaviour on top of inconsistent and heterogeneous data coming from Canoe123's various
> interfaces.

That sentence, not any architectural ideal, is the measure of success. The system today has no
single answer to *"what is true right now"*. Each component computes its own answer, from a
different subset of the available evidence, observed at a different moment, using rules that were
written down as advice rather than executed as code. Debugging is endless because there is nothing
to debug *against*: no component is wrong relative to a definition, because there is no definition.

**Design the thing that has a definition.**

## 2. What you must read, and in what order

1. `CONSTRAINTS.md` — what is fixed, what is open, and the operating reality.
2. `DOMAIN-FACTS.md` — what Canoe123 actually is. The hardest content is in §2 (unequal
   interfaces), §3 (unsynchronised cadences), §4 (two-run data loss), §5 (no finish event) and
   §8 (Kayak Cross). Read these closely; the design stands or falls on them.
3. `CURRENT-STATE.md` — what our four components do today.
4. `EVIDENCE.md` — the catalogue of duplicated and divergent interpretation, with file and line
   references.

Read each once. Do not summarise them back to anyone.

## 3. How you work here

**Do not read source code.** Not one file under any repository's `src/`. The audit has been done
and is in `CURRENT-STATE.md` and `EVIDENCE.md`.

**You may distrust the audit, and you should.** It was produced by another model and has blind
spots. When a design decision turns on a fact you are not willing to take on faith, dispatch a
scout: an `Agent` call with `model: "opus"` or `model: "sonnet"`, asking **one** question, with
the instruction *"answer only what is asked, cite file:line, hard cap 150 lines"*. Scouts are free;
your own context is not. Record every place you disagreed with the audit — that list is a required
part of your output.

**Upstream behaviour is checkable.** Authoritative reference material for what Canoe123 actually
does is held locally (`DOMAIN-FACTS.md` §10). Where a design decision turns on upstream behaviour,
have a scout check it instead of assuming. Do not quote it, name its files, or let its contents
into a deliverable — it is private and the deliverables go to a public repository.

**Write each document once, completely.** Do not draft, review and rewrite prose. Spend your
thinking on the design, not on the documentation.

**Ask about business, decide about technique.** The maintainer will answer questions about race
operations, competition rules, what officials and spectators need, and anything that changes the
long-run cost of maintaining this ecosystem with AI agents. He does not want to be asked
programmer questions — those are yours to decide. Route questions through the orchestrator who
dispatched you; do not block waiting for an answer if you can proceed under a stated assumption.

## 4. What you are designing

The target architecture for: `c123-server` (on-site middleware), `c123-scoreboard` (venue
display), `c123-penalty-check` (tablet penalty verification), and `c123-live-mini` (cloud server
plus public spectator client).

How radical to be is **your call**, and it is a real question, not a formality. The repository
topology and deployment shape are fixed (`CONSTRAINTS.md` §1); everything inside them is open,
including the premise that the on-site server should own interpretation. Argue for what you
choose and record what you rejected.

## 5. The seven questions your design must answer

These are the acceptance criteria. A design that reads well but cannot answer these has failed.

1. **Single locus.** For each of these, name the one place where it is decided: whether a
   competitor has finished; whether a run is complete; which run's time is shown in a two-run
   race; a category's status; a competitor's rank. *"The server documents the recommended
   algorithm and each client implements it"* is the current state and is a failing answer.

2. **Zero-interpretation clients.** How many domain decisions must a newly written client make in
   order to render current standings correctly? The target is none. Show the message or resource
   shape that makes it so.

3. **Authority and time — expressed in the contract, not solved in the algorithm.**
   Read `EVIDENCE.md` Exhibit 1 first.

   There is at present **no model of event time in this system at all** — not a weak one, none.
   Every timestamp on the wire is minted at serialisation (`protocol/factory.ts:26-28`), recording
   when the server serialised a message rather than when anything happened. The only true event
   times Canoe123 supplies, `dtStart` and `dtFinish`, are kept as opaque strings, never parsed or
   compared, only tested for presence. No sequence numbers exist. Ordering is raw TCP arrival
   order. Every component that needs ordering has invented its own proxy.

   What is wanted from you is **not** a finished merge algorithm. The maintainer's position, and it
   is a reasonable one: the merging can be wrestled into place under the hood — it has been
   wrestled into place inside the components already. What has never existed is a statement of what
   is true.

   So: make the contract say, for every value it carries, **what that value asserts and as of
   when** — precisely enough that no consumer ever needs to know which upstream interface it came
   from, how old it is, or what had to be reconciled to produce it, unless the contract tells it.
   Staleness, provenance where it matters, the distinction between *unknown*, *not yet*, and
   *zero*, what happens to a value we wrote ourselves while its upstream echo is still in flight.

   Give the merge rule as far as the contract constrains it — the observable semantics any
   implementation must satisfy — and stop there. Implementation is ours.

4. **Source selection and degradation.** We hold the CIS licence, so the richest upstream
   interface is genuinely available — and it carries both runs of a two-run race and gate-by-gate
   passage times, which nothing else does (`DOMAIN-FACTS.md` §2). The present code does not use it
   at all, and most of its reconstruction machinery exists for that reason. Decide deliberately
   which interfaces the architecture consumes and why. Then say what happens, and how anyone finds
   out, when a source that is expected does not answer — CIS still needs an operator action and
   the right privileges on a race morning. Silently producing different numbers depending on which
   sources responded is the failure mode to design out.

5. **Structural extensibility.** Kayak Cross has no `dtStart`/`dtFinish`, runs four competitors
   head-to-head, and its `Time` field carries finish order rather than a duration
   (`DOMAIN-FACTS.md` §8). It is also already blocked by a concrete line: on-course competitors are
   keyed by `bib` alone rather than `bib:raceId`, so four simultaneous competitors collide
   (`EVIDENCE.md` Exhibit 1). Under your design, how many components change to support Cross, and
   does the domain model need structural change or only new values?

   **This is a firm requirement, not a thought experiment.** The intention is to run a Cross race
   next season with both live results and the scoreboard working.

6. **Implementability.** Work begins server-side: build the domain and the API with tests, then
   adapt each client onto it. Can Claude Code implement that server-side work from your contracts
   without inventing semantics? Anything it would have to guess is a gap in your output.

7. **The live interface: a canoe-results contract, not a Canoe123 pipe.**
   The cloud tier's ingest contract was meant to be a *generalised* live interface — somewhere any
   canoe timing software could push results, not just Canoe123. It has drifted a long way from
   that and is now shaped throughout by Canoe123's own format.

   The drift shows most plainly in the unit of transfer: what gets pushed is *the XML file*. The
   whole Saturday file goes up while Sunday's race is running, and separating the two days
   currently requires creating two separate events on the live service. The push granularity is an
   artefact of the upstream file format rather than a decision anyone made.

   Design this contract properly: what its resources are, what the unit of push is (event, day,
   race, competitor-run), what identity it keys on, what a *different* timing system would have to
   supply in order to use it, and what it refuses to accept. Say plainly what this costs — a
   vendor-neutral ingest contract means the on-site bridge must translate rather than forward, and
   that work has to land somewhere.

   Note the asymmetry and decide whether it is right: the on-site contract serves clients that
   exist to display *this* timing system, while the live contract was meant to outlive it.

## 6. Four scenarios your design must survive

Walk each one through your architecture explicitly, stating what every component holds and shows
at each step. These are where generic architecture dies.

**A — The late rotation.** A competitor finishes run 2 and beats their run 1. OnCourse reflects it
within 500 ms; the Results message for that category will not come round again for up to 30 s
(`DOMAIN-FACTS.md` §3). Meanwhile run 1's time is no longer retrievable from the wire at all,
because run 2 was better (§4). What does the scoreboard show at t+1 s, t+10 s, t+30 s? What does
the spectator on the cloud client see? Are they the same, and if not, is the difference stated or
accidental?

**B — The write echo.** A judge corrects a gate penalty on the tablet. The write goes upstream; it
will be echoed back in a push whose timing we do not control. What is true in the intervening
seconds, what do the other clients show, and what happens if the echo never arrives, or comes back
different from what was written?

**C — The unlicensed venue.** CIS is not available. A two-run race is running. What is different,
what is lost, and how does anyone find out — the operator, the client, the spectator?

**D — The heat.** A Kayak Cross heat: four competitors on course simultaneously, no finish
timestamps, `Time` values of 1000/2000/3000/4000 meaning first through fourth. What in your model
bends to accommodate this, and what breaks?

## 7. Deliverables

Written in **English**, into `c123-server/docs/arch/`. Total roughly 2000–3000 lines — dense; a
shorter document that answers §5 and §6 beats a longer one that does not.

Order matters here, and it differs from what you might expect: **the contract comes first.**

**`CONTRACTS.md`** — **the primary deliverable.** Everything else exists to justify and explain
it. Domain entities and their identity; states and legal transitions; invariants; what every value
asserts and as of when (§5.3); the shape of what the on-site server exposes, what each client
consumes, and the vendor-neutral live ingest contract (§5.7).

Three properties make it the primary deliverable rather than an appendix:

- **It makes competence visible.** A contract that says what the server asserts settles, by
  construction, what the clients no longer decide. The boundary argument in `ARCHITECTURE.md` is
  readable off it.
- **It is testable before anything is built.** Work begins server-side, test-first. Every clause
  should be one a test could be written against without first reading an implementation. If a
  clause cannot be turned into a failing test, it is prose — sharpen it or drop it.
- **It is the thing we will actually hold each other to.** Precision over coverage: twelve things
  specified exactly beat forty specified approximately.

**`ARCHITECTURE.md`** — the target state that the contract implies. What the domain model is; where
interpretation lives and why there; the boundary and responsibility of each of the five deployable
pieces; how data flows; the principles, each traceable to a named symptom in `EVIDENCE.md`. **A
principle that cannot be traced to a symptom is to be cut.** Include the four scenario
walkthroughs from §6.

**`DECISIONS/ADR-NNN-<slug>.md`** — one per real decision. Context, the options genuinely
considered, what was chosen, why, what it costs, and what it forecloses. An ADR with only one
option considered is not an ADR. Expect these to be the most re-read documents in the project.

Also return, in your final message rather than as a file: the places where you disagreed with the
audit, the assumptions you had to make, and the questions you want the maintainer to answer.

## 8. Explicitly not wanted

- **A migration plan.** Only the target state. Sequencing is decided separately.
- **A testing strategy.** Known, deliberately deferred. But *verifiability* is a required property
  of the design: replaying a recording must produce the same result every time, and it must be
  possible to say which component is wrong when two disagree.
- **Code.** Schemas and type sketches where they express a contract, yes. Implementations, no.
- **The problem restated back to us.** We wrote the dossier. Skip to the design.
- **Generic architectural prose.** "Introduce a domain layer", "define bounded contexts",
  "use events" — true of every system and therefore of no use here. Every claim in your output
  should be one that could only have been written about *this* system.
