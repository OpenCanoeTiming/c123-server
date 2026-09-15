# Constraints

Two lists. The first is fixed and not open to redesign. The second is explicitly open —
including things that look settled today.

---

## 1. Non-negotiable

### 1.1 Canoe123 is immutable upstream
Its TCP/UDP protocol and XML format are given. No change can be requested of it, and no design
may assume one. Section 1–9 of `DOMAIN-FACTS.md` describes what must be absorbed.

### 1.2 Offline LAN operation at the venue
The on-site server runs on a **Windows laptop** at the race site, on a local network with no
reliable internet. The scoreboard runs on a **Raspberry Pi**, penalty verification on **tablets**.
Every on-site function must work with the internet unplugged. Nothing on the critical path may
depend on a cloud service. Windows is the primary target; Linux and macOS must also run.

### 1.3 One port and autodiscovery
Everything the on-site server offers — HTTP, WebSocket, admin UI — is served on port **27123**.
Clients find the server by **UDP autodiscovery**. Neither is up for redesign: they exist so that
a non-technical volunteer can get a scoreboard working at a race without configuring anything.

### 1.4 Separate repositories
The current split into independent GitHub repositories stays. **No monorepo, no merging of
components.** A shared library distributed as a package is a different question and is open
(see 2.4) — what is closed is the repository topology.

### 1.5 Kayak Cross next season
The intention is to run a Cross race next season with both live results and the scoreboard
working. Cross breaks assumptions the current code holds implicitly (`DOMAIN-FACTS.md` §8) and is
already blocked by concrete code (`EVIDENCE.md` Exhibit 1). This is a requirement on the design,
not an aspiration.

### 1.6 The current component set
`c123-server` (on-site middleware), `c123-scoreboard` (venue display), `c123-penalty-check`
(tablet verification), `c123-live-mini` (cloud server + public spectator client). These four
plus the live-mini server are in scope. `timing-design-system`, `c123-xml-tools` and
`c123-protocol-docs` are context, not subjects.

### 1.7 Several organiser groups, isolated on site, shared in the cloud
The ecosystem is used by **several independent organiser groups**. On site they are fully
isolated: own venue, own server, own LAN, own Canoe123, no coupling. The cloud tier is the
opposite — multiple live instances are possible, but the expectation is **a single shared
instance** serving all of them. Event identity must therefore be unique across organisers who
never coordinate, and isolation and authorisation are contract concerns rather than deployment
details.

### 1.8 The cloud tier is genuinely remote
`live-mini-server` runs on Railway, is publicly reachable, and **must survive losing its link to
the on-site server**. It cannot be modelled as a thin view over an always-available upstream.

---

## 2. Open to challenge

Everything not listed in section 1. Explicitly including:

**2.1 Where domain interpretation lives.** Server, shared library, clients, or split — this is
the central question, not a settled premise. The working hypothesis is "the on-site server owns
interpretation and clients render", but it is a hypothesis to be argued for or against, not an
instruction.

**2.2 The WebSocket and REST contracts.** Message types, shapes, granularity, push-vs-pull,
snapshot-vs-delta. Breaking changes are acceptable: all clients are ours and the rebuild happens
in one off-season window.

**2.3 The internal structure of any component.** Layering, module boundaries, what
`UnifiedServer.ts` should become.

**2.4 Shared code distribution.** Whether a shared domain package should exist, what belongs in
it, and how it is versioned and consumed across separate repositories.

**2.5 Whether live-mini keeps its own domain model** or becomes a projection of a shared one,
given 1.6.

**2.6 Which upstream interfaces to use.** Today TCP plus the XML file; CIS is not used at all.
**We hold the CIS licence**, so it is genuinely available to us — though other organiser groups
(§1.7) may not hold it, so the available source set really does vary by deployment — and it is the only interface carrying
both runs of a two-run race and gate passage times. Whether to depend on it, and how to behave
when it does not answer, is an open design question with large consequences (`DOMAIN-FACTS.md` §2).

**2.7 The live ingest contract.** It was intended as a generalised interface for canoe results
from any timing software and has drifted into a Canoe123-shaped pipe, down to pushing the raw XML
file as the unit of transfer. Redesigning it as a vendor-neutral contract is in scope and wanted.

---

## 3. Operating reality that shapes acceptable answers

- **Users are volunteers,** not operators. Setup happens on a race morning under time pressure.
  A design that is correct but needs configuration will not survive contact with a club race.
- **Failure is public and immediate.** A wrong number on the scoreboard is seen by everyone at the
  venue, during the race, and cannot be retracted.
- **The race does not wait.** There is no maintenance window during an event and no opportunity to
  restart and re-sync without visible consequence.
- **Development is agentic.** Future work is done by the maintainer together with Claude Code.
  Design choices that lower the cost of agentic development — explicit contracts, narrow modules,
  decisions recorded rather than inferred — carry real weight, and this is a stated priority.
- **Several organiser groups, one maintainer.** The software has users beyond its author, on
  deployments he does not operate and cannot inspect when something looks wrong.
- **One maintainer.** Any design whose correctness depends on sustained coordination across four
  codebases by several people is not viable.

---

## 4. Out of scope for this engagement

- **Migration plan.** Only the target state is wanted. Sequencing is decided separately.
- **Testing strategy as a deliverable.** It is a known, separate topic. *Verifiability* remains a
  required quality of the design (see below) — but no test plan is asked for.
- **Implementation.** No code. The output is a design that Claude Code can later implement,
  starting server-side.
- **Fixing anything now.** The current season finishes on the behaviour that exists, which is at
  least predictable. Known defects catalogued in `EVIDENCE.md` are deliberately left standing —
  several of them are questions the design must answer, and repairing them piecemeal beforehand
  would destroy the evidence.
