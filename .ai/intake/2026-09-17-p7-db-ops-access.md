# Intake — Safe operator access to Postgres on Railway

**Date:** 2026-09-17
**Status:** open — worked around twice with temporary TCP proxies
**Process:** v9.51 (see `PROCESS_AGENTS.md`)

## Problem statement

Operator DB work (role promotion, user cleanup, migration checks)
requires reaching Postgres, which only listens on
`postgres.railway.internal`. Twice this session the workaround was
`tcpProxyCreate` — a public port into the production database —
used for minutes, then deleted. Every open minute is an exposed,
password-only gate on the internet, and the open/delete cycle relies
on the operator remembering to close it.

## Current state

- `railway ssh` to the api service exists but hung this session.
- `railway connect` / `railway run` cannot reach internal hostnames
  from a laptop.
- Both proxies were deleted and verified gone.
- No documented procedure exists for a one-off DB command.

## Required state

1. A documented, repeatable way to run one-off DB commands that does
   not expose a public TCP port — or that self-closes.
2. If a proxy is ever required, its lifetime is bounded by the
   command itself, not by memory.

## Edge cases

- `railway ssh` non-interactive command support is flaky (hung this
  session); an interactive fallback may be needed.
- Scripts could run inside the api container (`railway ssh` exec)
  where DATABASE_URL is already present.
- A dedicated `tools/db-admin.sh` that opens a proxy, runs a command,
  and deletes the proxy in a `trap` bounds the window to seconds.

## Open items

- Prefer `railway ssh` exec vs bounded proxy script vs a
  `tools/db-admin.ts` run inside a one-off deploy.
