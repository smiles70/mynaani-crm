# Research — Push discipline and source of truth (p8)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p8-push-discipline.md`
**Question:** How should the `mynaani` branch reach `origin`, and what
keeps deployed code and pushed source in lockstep?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| PROCESS_AGENTS.md §2 | this repo | governor | Atomic commits, why-before-what, no secrets — already followed for the five commits |
| CONTRIBUTING.md | upstream repo | workflow | Upstream releases via `release` branch + release-please; our fork does not need that machinery for internal deploys |
| Session evidence | this workspace | state | 5 commits on `mynaani`, working tree clean, `railway up` ships the tree not the repo |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Push `mynaani` to origin as the long-lived working branch | Matches fork reality — `mynaani` is already the deploy source; release-please machinery unnecessary for a two-user internal tool | High |
| PR `mynaani` → `release` per upstream flow | Adds a gate with no reviewers; upstream's flow serves their SaaS release cadence | Low |
| Stay local-only | The problem being fixed | Rejected |

## Selected approach

Push `mynaani` to `origin` now; convention going forward: a deploy
command (`railway up`) that ships tree changes is followed by a push
of the same commits — recorded in `.railway/README.md` ops notes.
Pre-push check: `git diff origin/mynaani..HEAD --stat` plus a secret
grep over the diff (password, `BETTER_AUTH_SECRET`, `PGPASSWORD`).

## Edge cases

- Verify no secret values landed in any of the five commits before
  pushing — grep the full diff for the known values.
- `.railway/node_modules` must not be tracked — it is gitignored;
  verify with `git status` before push.
- Branch protection on `mynaani`: none configured; a plain
  `git push -u origin mynaani` suffices.
- If origin has newer commits (it shouldn't — nothing pushed there
  since clone), fetch first and rebase locally.
