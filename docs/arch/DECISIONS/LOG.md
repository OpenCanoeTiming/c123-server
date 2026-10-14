# Decision log

Append-only. One line per default taken by the orchestrator where the maintainer was not asked first
(production plan §7). Columns: date · scope · question · default taken · why reversible · cost of reversing.
A decision that hardens into a rule becomes an ADR.

| Date | Scope | Question | Default taken | Why reversible | Cost of reversing |
|---|---|---|---|---|---|
| 2026-10-14 | c123-protocol-docs | Merge or discard the unmerged September branch `wip/excerpt-output-format` (excerpt dir becomes a playable v3 recording: `manifest.json` = player manifest, `excerpt.json` = metadata)? | Merged as PR #14 (squash). Tests 74/74 on both sides; the maintainer was told the default and did not object. | One squash commit on `main`; no release, no consumer yet except spike S2. | `git revert` of one commit; re-cut any excerpt made with the new layout. |
