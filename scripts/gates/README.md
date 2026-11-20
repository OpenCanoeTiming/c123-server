# Gates inputs

`npm run gates` (`scripts/gates.ts`) reads two files from this directory.

## `protocol-docs.ref`

The full commit SHA of the c123-protocol-docs checkout whose gate-2 checker (`tools/gate2/check.js`) and gate-3 comparator
(`tools/gate3/final-state.js`) the gates use. The run stops with exit 2 when the checkout given by `--protocol-docs` is at another
commit, or has uncommitted or untracked changes under `tools/`. The header prints the pin.

The pin is a commit SHA of a private repository. It reveals nothing beyond the fact that such a commit exists.

To bump it:

1. Merge the checker change in c123-protocol-docs.
2. Bump `protocol-docs.ref` to that merge commit in the same c123-server PR as the core change that needs it, so the PR's gates run
   uses the new checker.

## `known-differences.json`

Gate-3 differences that are tolerated. Each entry names `recording`, `attemptId`, `field` (and `gate` for `Gates`), the two values it
tolerates, `xml` (the recording's last XML) and `presented`, and the `issue` tracking it. A listed difference with other values fails
step 3; an entry that no longer differs fails as stale.
