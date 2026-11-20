# Contributing

c123-server is being rebuilt in place on `main`. Venues run the legacy line (tag `legacy-2026`) until release 1.0. The design is in [`docs/arch`](docs/arch/README.md); it is normative.

## How a change is made

1. **One issue per change.** Its first line names the evidence: a recording, an operator action, or the impact.
2. **A branch and a pull request**, squash-merged. Conventional commits; Release Please owns versions and the changelog.
3. **The failing test is its own commit**, before the code that makes it pass.
4. **A change to what a client sees starts in the contract text** (`docs/arch`), citing a recording, an operator action or a maintainer ruling. `CLIENT-OBLIGATIONS.md` changes in the same pull request as the sections it cites.
5. **One independent review.** It blocks only for a defect: wrong behaviour in a recorded case, under a known operator action or with a high impact; a breach of the client-visible contract; red CI or red gates. Other notes stay in the review comment.
6. **The pull request is the record:** what and why, how it was verified (commands and results), and the review comment with its verdict in the first line.

There is no rule, test or special case for a situation nobody recorded. An unknown situation is recovered by re-baseline, restart or reload.

## Checks

| Check | Where | What |
|---|---|---|
| CI | every pull request | lint, typecheck, build, tests, the Windows installer build |
| Obligations | pull requests touching `docs/arch` | `node scripts/check-obligations.js` |
| Gates on real recordings | `main`, by the maintainers' gate runner | `npm run gates`: data tests, a replay of seven recorded race days through an independent checker, and the final state against Canoe123's last XML. The result is the commit status `gates/recordings`. |

A pull request that changes `src/core`, `src/ingest`, `scripts/replay-direct.ts` or the checker pin runs the gates on two recordings before it merges (`npm run gates -- --only cp3-cross,jarni-ne-odp`). The recordings are private; without them, ask a maintainer to run it. The checker version is pinned in [`scripts/gates/protocol-docs.ref`](scripts/gates/README.md).

A red `main` is reverted first and diagnosed second.

## Where things are

- **Contract and design:** `docs/arch`, starting at its `README.md`. Maintainer rulings: `docs/arch/RULINGS.md`.
- **Work:** the project board [Rebuild 2026/27](https://github.com/orgs/OpenCanoeTiming/projects/3), milestones M2 Server shell to M6 Release 1.0.
- **Parked hardening:** milestone `Hardening (after Jarní slalom)`. Nobody works on it before the first race.

## Rules

- Stage files by name (`git add <file>`). Never commit agent or tool state folders. No force push.
- The `legacy/2026` branch takes fixes only, and only from the maintainer.
- This repository is public. State how Canoe123 behaves, never how that was established.
- Czech with the maintainer; English in code, commits, issues and documents.
