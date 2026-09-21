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

Two paths — Vercel is not hosting here, it is the model plumbing inside
the eve framework:

- **Path 1 — AI Gateway key (minimal).** The eve/AI-SDK runtime routes
  model calls through Vercel's AI Gateway; the CRM's model setting is
  stored in gateway format (`anthropic/claude-sonnet-5`). On Vercel
  hosting OIDC auth is free; self-hosted needs
  `AI_GATEWAY_API_KEY`. `VERCEL_OIDC_TOKEN` only works when the service
  itself runs on Vercel — it does not, so the API key is the option.
  Owner creates a key at `vercel.com/dashboard/ai/api-keys`, sets it on
  the `agent` service (production first, then staging), redeploys.
  Requires a Vercel account; gateway usage is billed at provider rates.
- **Path 2 — Direct provider (no Vercel, more code).** eve accepts a
  provider-authored `LanguageModel`
  (`@ai-sdk/anthropic` + `ANTHROPIC_API_KEY`). But `selectedModel()`
  reads a gateway-format id from `AppSetting.agentModelId` — bypassing
  the gateway means mapping settings to provider instances and changing
  the settings contract. Real code work; only worth it if the owner
  refuses Vercel.

## Verification (agent-side, once the key lands)

- [ ] Trigger a contact filing on staging → confirm `identify` task
      completes without `MODEL_CALL_FAILED`.
- [ ] Same check on production after the key is set there.
- [ ] If Path 2 is chosen instead: new intake + provider selection
      decision (which LLM vendor, key custody, settings-page migration).

## Notes

- Pre-existing failure — found during PS-CRM-004 staging verification.
- The RocketChat alert sweep (`sweepNewContactAlerts`) does not need the
  model and is unaffected.
