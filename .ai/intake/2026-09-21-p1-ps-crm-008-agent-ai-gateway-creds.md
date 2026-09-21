# PS-CRM-008 — Agent AI gateway has no credentials (staging AND production)

**Date:** 2026-09-21 · **Priority:** P1 · **Status:** BLOCKED — needs owner secret
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

Every model call by the `agent` service fails with
`MODEL_CALL_FAILED: AI Gateway received no credentials` — **80 failures
in production logs, 62+ on staging**. The eve runtime wants
`AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`; neither variable exists on
the `agent` service in either environment.

Effect: every queued `AgentTask` (contact identification, enrichment,
agent runs) dispatches and then dies at the model step. CRM data still
files correctly — notifications and filing are unaffected — but no
AI-powered work completes.

## Fix

Owner action, not code:

- [ ] Create a Vercel AI Gateway key
      (`vercel.com/dashboard/ai/api-keys`) **or** run `eve link` to mint
      `VERCEL_OIDC_TOKEN` for the project.
- [ ] Set `AI_GATEWAY_API_KEY` on the `agent` service — production first
      (real tasks are failing there now), then staging.
- [ ] Redeploy agent; confirm `MODEL_CALL_FAILED` stops and a queued
      task completes.

## Verification (agent-side, once the key lands)

- [ ] Trigger a contact filing on staging → confirm `identify` task
      completes without `MODEL_CALL_FAILED`.
- [ ] Same check on production after the key is set there.

## Notes

- Pre-existing failure — found during PS-CRM-004 staging verification.
- The RocketChat alert sweep (`sweepNewContactAlerts`) does not need the
  model and is unaffected.
