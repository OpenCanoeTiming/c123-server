# Decision log

Append-only. One line per default taken by the orchestrator where the maintainer was not asked first
(production plan §7). Columns: date · scope · question · default taken · why reversible · cost of reversing.
A decision that hardens into a rule becomes an ADR.

| Date | Scope | Question | Default taken | Why reversible | Cost of reversing |
|---|---|---|---|---|---|
| 2026-10-14 | c123-protocol-docs | Merge or discard the unmerged September branch `wip/excerpt-output-format` (excerpt dir becomes a playable v3 recording: `manifest.json` = player manifest, `excerpt.json` = metadata)? | Merged as PR #14 (squash). Tests 74/74 on both sides; the maintainer was told the default and did not object. | One squash commit on `main`; no release, no consumer yet except spike S2. | `git revert` of one commit; re-cut any excerpt made with the new layout. |
| 2026-10-14 | c123-server | Merge the design branch to `main` now that the spike is complete? | Yes: one squash PR, docs only (the maintainer's condition "after the spike" is met; asked, answered "no preference"). | A docs-only squash commit; `git revert` restores `main`. | One revert; the branch history stays. |
| 2026-10-14 | five repos | Freeze the legacy line now (tag `legacy-2026`, branch `legacy/2026`)? | Yes, at each repo's last release (server v0.12.1, scoreboard v3.5.4, penalty-check v1.5.2, live-mini v0.13.0); timing-design-system at its current `main` head, since its consumers pin it by npm version (the plan said "no releases"; a v0.9.0 tag exists but is 17 commits behind). Asked, answered "no preference". | Tags and branches are refs; delete them to undo. | Nothing else references them yet. |
