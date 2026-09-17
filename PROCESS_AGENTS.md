# Process Layer Rules — AGNOSTIC (v9.51 discipline)

> This file carries the Process v9.51 operating discipline into this
> repository. It is **repo-agnostic**: nothing here assumes a specific
> stack, product, or audience. Pair it with the repo's own `AGENTS.md`
> (codebase conventions). Where the two conflict on codebase style —
> e.g. upstream's "no code comments" and "no Co-Authored-By trailer" —
> **the repo's own AGENTS.md wins**; this file governs process, not style.

## 1. Discipline layers

Three layers, all active:

1. **Delivery orchestration** — intake → research → implementation →
   preflight → tests → UAT → deploy, in that order, no skips.
2. **Repo hygiene + canonical knowledge** — the repo is self-describing:
   intakes, research memos, ADRs, and skills trace every change.
3. **Cost/token governance** — agentic work is measured; burns are
   reported, not hidden.

## 2. Hard gates

- **Production deploys require explicit human permission.** No
  exceptions. Staging deploys may be routine; production never is.
- **Commit hygiene:** atomic commits, message states *why* before *what*,
  never commit secrets or env values, never force-push or rewrite shared
  history without approval.
- **Research before options:** any request touching external vendors,
  new infra, or architecture choices gets a research memo in
  `.ai/research/` first — sources table with org/type/finding —
  before an implementation is proposed.
- **Intake cadence:** every distinct piece of work starts as a dated
  file in `.ai/intake/` (`YYYY-MM-DD-p<1|2|3>-<slug>.md`) with problem
  statement, scope, constraints, and edge cases.
- **Intake triggers research immediately.** Once a problem-statement
  intake exists, the next action is the research protocol — a dated
  memo in `.ai/research/` with a sources table — before any
  implementation is proposed or written. Do not sit on a filed intake.
- **No silent no-ops.** A gate, test, or check that cannot run must say
  so loudly — never pass vacuously.
- **Destructive ops need confirmation:** data loss, force-push,
  history rewrite, external side effects.

## 3. Traceability

- `.ai/intake/` — work intake, one file per request.
- `.ai/research/` — dated research memos with source tables.
- `docs/decisions/` — ADRs, numbered, immutable once accepted.
- `.devin/skills/` — reusable agent skills discovered by sessions.
- `.devin/workflows/the-process.md` — the orchestration workflow.

Every shipped change traces back: intake → research → ADR (if an
architecture choice) → implementation → test evidence.

## 4. Fork-specific notes (this repo)

- **Upstream sync:** `upstream` remote = `trycompai/crm`, push disabled.
  Sync via `git fetch upstream && git merge upstream/release` on a
  branch, never directly on the default branch.
- **Our differentiators live in clear seams:** branding, the intake
  webhook from the Noni backend, and deploy config — keep them isolated
  so upstream merges stay cheap.
- **Single-tenant, two users:** `ALLOWED_SIGN_IN` env governs access;
  never build an invite/signup surface.
- **The repo's own AGENTS.md applies in full** — including its ban on
  code comments and coauthor trailers.
