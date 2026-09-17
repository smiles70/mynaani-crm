# Process Layer Rules — AGNOSTIC (v9.51 discipline)

> This file carries the Process v9.51 operating discipline into this
> repository. It is **repo-agnostic**: nothing here assumes a specific
> stack, product, or audience. Pair it with the repo's own `AGENTS.md`
> (codebase conventions). Where the two conflict on codebase style —
> e.g. upstream's "no code comments" and "no Co-Authored-By trailer" —
> **the repo's own AGENTS.md wins**; this file governs process, not style.

## 1. Discipline layers

Three layers, all active:

1. **Delivery orchestration** — the pipeline in §2, in order, no skips.
2. **Repo hygiene + canonical knowledge** — the repo is self-describing:
   intakes, research memos, ADRs, and skills trace every change.
3. **Cost/token governance** — agentic work is measured; burns are
   reported, not hidden.

## 2. The pipeline

Every piece of work runs these stages **in order**. No code is written
before stage 8. Each stage produces an artifact; artifacts make the
pipeline idempotent — re-running a stage updates its artifact in
place, it never duplicates it. An intake's `**Status:**` line records
the furthest stage reached.

### Stage 1 — Problem-statement intake

A dated file in `.ai/intake/YYYY-MM-DD-p<N>-<slug>.md` with the
problem statement, current state, required state, edge cases, and
open items. One file per distinct problem — a repeat of the same
problem updates the existing file, it does not file a second.

### Stage 2 — Research protocol

Immediately after intake. A dated memo in `.ai/research/` containing:

- **Source table — ≥20 verifiable published sources.** Aim for ≥5
  FAANG/top-tier engineering sources, ≥5 academic/standards bodies,
  ≥5 industry/security/operations, ≤5 discussion sources that add a
  counter-argument. Every URL reachable; cite URL, org, title,
  finding.
- **Decision matrix — ≥3 realistic alternatives** with confidence
  (High / Medium / Low) and a reasoned best fit for this codebase.

A smaller memo is permitted only for config-level changes reversible
in minutes; the memo must say so and justify it.

### Stage 3 — Failure and edge-case analysis

For the proposed solution: the top **30 common failure cases** and
top **30 edge cases**. Each row: trigger, impact class (functional /
performance / security / cost / operational / UX / compliance), and
proposed remediation. Recorded as a matrix in the research memo.

### Stage 4 — Remediation verification

Each remediation from stage 3 is **tested against this codebase** —
grep the existing handlers, run the path, confirm the mitigation
actually holds here. Not assumed. The memo's conflict-check column
records the evidence.

### Stage 5 — Implementation plan

Decompose into **workstreams → epics → blocks → racks**. Order
streams safety-first, then efficiency; mark what runs in parallel.
Recorded in the intake or `.ai/plan/`. Still no code.

### Stage 6 — Architecture pass

Check the plan against FAANG practice and the modular-monolith
discipline: one deployable, module boundaries, no new services or
vendors without an ADR. An architecture choice gets a numbered ADR in
`docs/decisions/`. Still no code.

### Stage 7 — Preflight

All workstreams checked against the actual codebase: file paths,
imports, existing helpers, env vars, pinned deps. Every discrepancy
is called out and remediated in the plan **before** coding.

### Stage 8 — Implement

Code, in small atomic commits. Repo `AGENTS.md` conventions apply in
full.

### Stage 9 — Test gates

Unit tests, regression tests, e2e, then the **full suite** —
`bun run test`, `bun run lint`, `bun run check-types`. All green or
iterate. A gate that cannot run says so loudly — never pass vacuously.

### Stage 10 — Staging

Deploy to staging. Smoke checks, e2e, and a **full browser test**
(console errors, network failures, visual check). All green.

### Stage 11 — Production gate

Stop. Report readiness to the human. **Production deploys require
explicit human permission — no exceptions.**

## Hard gates

- **Production deploys require explicit human permission.** No
  exceptions. Staging deploys may be routine; production never is.
- **Commit hygiene:** atomic commits, message states *why* before *what*,
  never commit secrets or env values, never force-push or rewrite shared
  history without approval. Stage explicit paths only — never
  `git add -A` / `git add .`; review `git diff --cached --stat` first.
- **No silent no-ops.** A gate, test, or check that cannot run must say
  so loudly — never pass vacuously.
- **Destructive ops need confirmation:** data loss, force-push,
  history rewrite, external side effects.

## 3. Traceability

- `.ai/intake/` — work intake, one file per request; the `**Status:**`
  line records the furthest pipeline stage reached.
- `.ai/research/` — dated research memos with source tables and the
  failure/edge-case remediation matrix.
- `.ai/plan/` — workstream/epic/block/rack plans (stage 5), when a
  plan does not fit inside its intake.
- `docs/decisions/` — ADRs, numbered, immutable once accepted.
- `.devin/skills/` — reusable agent skills discovered by sessions.
- `.devin/workflows/the-process.md` — the orchestration workflow.

Every shipped change traces back: intake → research → failure/edge
analysis → remediation verification → plan → architecture pass →
preflight → implementation → test evidence → staging evidence →
human-approved production promotion.

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
