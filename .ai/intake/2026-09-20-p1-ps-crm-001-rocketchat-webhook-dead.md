# PS-CRM-001 — RocketChat lead notification: dead config

**Date:** 2026-09-20 · **Priority:** P1 · **Status:** SUPERSEDED — already implemented
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`
**Research:** `.ai/research/2026-09-20-lead-notification-verification.md`

## Problem statement

`ROCKETCHAT_WEBHOOK_URL` is set on the production `agent` service, but
no code in this repo reads it. No RocketChat notification has ever
fired. A new form lead posts nothing to `#crm-alerts`.

## Root cause (confirmed)

`grep -rn rocketchat` across the repo (excluding node_modules): zero
matches in any source file. The env var exists; the reader does not.

## Options

- **A — eve action:** `AGENT_ACTION_TYPES.ROCKETCHAT_MESSAGE_POST` +
  `post_rocketchat_message` tool, mirroring `SLACK_MESSAGE_POST`.
- **B — deterministic notify (recommended):** `LeadNotifyService` in
  `apps/api`, invoked by `TrackingFilingService.file` after a filed
  contact. Plain HTTP POST to the webhook; no new dependency.

## Edge cases

- Duplicate submissions (`dedupeKey`) must not double-post.
- `skipReason` filings produce no notification.
- Missing webhook URL degrades silently (capabilities pattern).
- RocketChat down/restart → retry or fire-and-log, never block ingest.
- Retell-sourced contacts should notify identically — hook at filing,
  not at form ingest.

## Acceptance

- [ ] One RocketChat post per filed Contact, all sources
- [ ] Unit test: filed contact → POST body; skipped contact → none
- [ ] Missing env var → capability off, no throw
- [ ] Live form submission → visible `#crm-alerts` post

## Correction (2026-09-20, after rebase onto origin/mynaani)

The "dead config" root cause was wrong — the finding was made on a
stale checkout. Commit `b73b543` (2026-09-18) added
`apps/agent/agent/lib/rocketchat.ts`: `sweepNewContactAlerts` posts new
TRACKING/RETELL contacts to `#crm-alerts` via `ROCKETCHAT_WEBHOOK_URL`,
and intakes p18/p19 are marked live on staging + production. The env
var is read — by the agent, not the API. **No new code needed.**
Residual gap closed separately: `ROCKETCHAT_WEBHOOK_URL` was missing
from `turbo.json` globalPassThroughEnv — added.
