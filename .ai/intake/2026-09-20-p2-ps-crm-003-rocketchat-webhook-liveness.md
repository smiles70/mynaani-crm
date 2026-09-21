# PS-CRM-003 — RocketChat webhook URL liveness unverified

**Date:** 2026-09-20 · **Priority:** P2 · **Status:** RESOLVED 2026-09-20
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

The `ROCKETCHAT_WEBHOOK_URL` value on the Railway `agent` service may be
stale: it predates the current `rocketchat-prod` service and nothing has
ever exercised it. Implementing PS-CRM-001 against a dead URL silently
produces nothing.

## Verification (only task)

- [ ] POST a test message to the configured webhook URL; confirm the
      message lands in the expected channel.
- [ ] If dead: create a fresh incoming webhook in `rocketchat-prod`,
      update the `agent` service env var, redeploy.
- [ ] Record result here; close PS-CRM-001's acceptance gate.

## Edge cases

- Webhook may target a channel that no longer exists.
- URL may point at an old service domain — verify host matches
  `RAILWAY_SERVICE_ROCKETCHAT_PROD_URL`.

## Result (2026-09-20)

POST to the configured webhook returned **200**; host is
`rocketchat-prod-production.up.railway.app` — matches the live
`rocketchat-prod` service. A probe message was delivered to the
configured channel. Webhook is live; no action needed. PS-CRM-001 can
implement against this URL.
