# PS-CRM-001 — RocketChat lead notification: dead config

**Date:** 2026-09-20 · **Priority:** P1 · **Status:** intake
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
