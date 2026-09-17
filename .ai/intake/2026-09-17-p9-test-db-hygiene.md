# Intake — Test suite flakes on a dirty test database

**Date:** 2026-09-17
**Status:** open — observed locally; CI unaffected
**Process:** v9.51 (see `PROCESS_AGENTS.md`)

## Problem statement

`retireExhausted` limit tests and Slack-join dedupe specs fail when a
previous run left rows behind: unfinished `agentTask` rows for the
same `channelId` dedupe new joins, and exhausted rows inflate
retirement counts. The suite only passes reliably on a fresh
`crm_test` database. Developers running `bun run test` twice see
ghosts that are not bugs — or worse, learn to ignore red.

## Current state

- `packages/db/scripts/test-db.ts` creates and migrates `crm_test`;
  `--reset` drops it first.
- Nothing resets the DB before a run; data persists between runs.
- Specs use unique suffixes (`TEST_RUN_ID`) for most rows, but
  dedupe-keyed rows (`slack-channel-join` subject = channelId
  `C0009`) collide across runs.
- CI is unaffected: it provisions a fresh Postgres per run.

## Required state

1. A documented/standard way to run the suite against a clean DB
   (`bun run db:test --reset` before `bun run test`), or specs that
   cannot be polluted across runs.
2. Local flake history recorded so a red suite is never assumed
   environmental without checking.

## Edge cases

- Auto-resetting before every run adds migration time (~seconds) and
  kills the ability to debug against leftover state.
- Dedupe-keyed specs could clean their own subject rows in a
  `beforeEach`, isolating them without a global reset.
- Parallel test files sharing `crm_test` may already rely on
  uniqueness-by-suffix; a reset mid-run would break concurrent runs
  — reset belongs at suite start, not per file.

## Open items

- Choose: documented reset step vs spec-level subject cleanup vs
  per-worker database names.
