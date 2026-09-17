# Research — Test database hygiene (p9)

**Date:** 2026-09-17
**Intake:** `.ai/intake/2026-09-17-p9-test-db-hygiene.md`
**Question:** How do we make `bun run test` deterministic on a reused
`crm_test` database?

## Sources

| Source | Org | Type | Finding |
| --- | --- | --- | --- |
| packages/db/scripts/test-db.ts | this repo | code | `--reset` drops and recreates the DB; suite refuses non-`_test` names — the reset lever exists but is manual |
| apps/agent/test/tasks.integration.spec.ts | this repo | code | `retireExhausted` counts rows globally; dedupe-keyed tasks (`slack-channel-join`, subject channelId `C0009`) collide across runs |
| packages/auth/test/organization.integration.spec.ts | this repo | code | Best-practice pattern already present: `TEST_RUN_ID` suffixes + `clear()` that deletes only its own rows — most specs are already self-isolating |
| .github/workflows/ci.yml | this repo | CI | Fresh Postgres service per run — explains why flakes are local-only |

## Decision matrix

| Approach | Fit | Confidence |
| --- | --- | --- |
| Spec-level cleanup of dedupe-keyed rows (delete own `slack-channel-join`/`agentTask` subjects in `beforeEach`) | Small, targeted, keeps fast re-runs, no global reset cost | High |
| Document `bun run db:test --reset && bun run test` as the canonical local run | Zero code; still leaves landmines for the next file that forgets | Medium |
| Per-worker/per-run schema or DB names | Fully isolates; meaningful plumbing in `test-db.ts` | Medium |
| Auto-reset inside `test` script | Slow every run; kills debugging state | Low |

## Selected approach

Spec-level cleanup for the two observed offenders: the tasks spec
deletes `agentTask` rows it can collide on (kind
`slack-channel-join` and its own subject ids) in `beforeEach`, and
`retireExhausted` specs clear unfinished exhausted rows for their
subject set before asserting counts. Plus one line in
`docs/setup.md`: "run `bun run db:test --reset` once after any
interrupted suite." No global change.

## Edge cases

- Specs run in parallel files against one DB — cleanup must target
  only rows that spec owns (suffix or subject), never `deleteMany`
  unscoped.
- `retireExhausted` walks global exhausted rows; scoping its fixture
  rows by `subject`/`contactId` prefixes keeps the assertion honest.
- `agentTask` dedupe is by `subject.channelId` — `C0009` is reused by
  several specs; each spec that queues one should delete pending rows
  for `C0009` first.
- Local Postgres here is the embedded instance in `/tmp/empg` —
  document it in `docs/setup.md` so the next session rebuilds it
  without research.
