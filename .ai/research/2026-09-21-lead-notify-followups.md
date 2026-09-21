# Research memo — PS-CRM-004/005 lead-notification follow-ups

**Date:** 2026-09-21 · **Scope:** defect verification memo (proportionate —
defect tickets, not architectural decisions; the ≥20-source gather does not
apply per AGENTS.md defect fast-path).

## PS-CRM-004 — sweep watermark persistence

**Confirmed in code** (`apps/agent/agent/lib/rocketchat.ts`, `b73b543`):

- `let watermark = 0` — module scope, dies with the process.
- `since = max(watermark, now - LOOKBACK_MS)`, `LOOKBACK_MS = 2min` —
  restart or outage >2min silently drops contacts.
- `MAX_ALERTS_PER_SWEEP = 10` + `break` on first failed post — ordering and
  backpressure already handled.

**Options checked against the codebase:**

- AppSetting single-row table exists but is typed columns — persisting a
  watermark there still needs a Prisma migration. No win over the column.
- `alertedAt DateTime?` on `contact` (option B) is one nullable column +
  index, and removes the time-window reasoning entirely: the sweep selects
  `alertedAt: null AND source IN (TRACKING, RETELL)`, posts, stamps the row.
  Backfill `alertedAt = now()` in the migration so existing contacts don't
  flood the channel on deploy.
- Migrations are manual (`bun run db:deploy` — no startup migration in the
  Dockerfile), so staging gets `db:deploy` via the Railway tunnel after the
  agent deploys. `require-local-db.ts` guards migrate-dev to local hosts —
  the tunnel is localhost-bound so it passes; `railway_test` on the tunnel
  is used for the integration spec, the real staging db only for
  `db:deploy`.

**Decision:** option B (`alertedAt` column). Reversible (drop column),
additive, exactly-once.

## PS-CRM-005 — multi-recipient LEAD_NOTIFY_TO

**Confirmed in code** (`apps/api/src/tracking/lead-notify.service.ts`):
`to: [to]` — single string, single recipient.

**Decision:** comma-separated list, parsed once in the service
(`split(',').map(trim)` — dedupe, drop malformed entries with a warn,
empty-after-parse = channel off). No schema change. `.env.example` and
`env.validation.ts` updated. Owner requirement: staging value becomes
`steven@mindbyndr.com,kim@mindbyndr.com`.

**Deploy-time caveat (unchanged):** Resend sandbox only delivers to the
account-owner address until `mynaani.com` verifies — the staging assertion
is the Resend API request containing both addresses, not kim@ inbox
delivery.

## Codebase conflict check

- No code comments (AGENTS.md) — none added.
- Optional capability never throws — malformed entries drop to warn; the
  send itself still catches.
- No `Record<string, unknown>` — recipient list is `string[]`.
- Agent code: no vendor intelligence added to the API; the sweep stays in
  `apps/agent`.

## Blockers / gaps

- kim@ inbox delivery blocked on DNS verification (external, pending).
- Staging agent AI-gateway credentials still missing (pre-existing,
  unrelated to this change — sweep does not need the model).
