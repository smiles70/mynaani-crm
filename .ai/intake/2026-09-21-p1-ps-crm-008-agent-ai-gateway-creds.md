# PS-CRM-008 — Agent AI gateway has no credentials (staging AND production)

**Date:** 2026-09-21 · **Priority:** P1 · **Status:** RESOLVED 2026-09-21
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

## Progress (2026-09-21)

Owner supplied `AI_GATEWAY_API_KEY` (vck_…). Set on the `agent` service
in staging AND production; both redeployed. Staging smoke task:
authentication now passes — the gateway rejects with a NEW error:
"requires a valid credit card on file to service requests." Owner must
add a card at the Vercel dashboard (free credits unlock once a card is
on file). No further code/config work needed.

## Progress 2 (2026-09-21)

Card added; `customer_verification_required` cleared. New gateway error:
`Free tier users do not have access to this model` — the CRM's configured
model `zai/glm-5.2` is paid-tier. Owner choice: top up gateway credits,
or switch the model on the CRM settings page to a free-tier model.
Everything else in the chain is verified working.

## Resolution (2026-09-21)

Owner's card verified on the AI Gateway page. `zai/glm-5.2` remained
restricted (paid-tier model), so `AppSetting.agentModelId` was set to
`zai/glm-4.7-flash` (200k context, free-tier, same vendor family) on
BOTH staging and production — a settings value, reversible on the
settings page; a credits top-up restores `glm-5.2` anytime.

Prod verification: smoke filing `prod-smoke-glm47@verify-lead.test` →
identify task session `wrun_01M32HE1DPXS39SJQF0CVAWGRZ` completed
3 steps with real inference (10.9k→11.6k in, ~$0.0026). Zero
MODEL_CALL_FAILED. Full chain live: form → file → RocketChat alert →
Resend email → AI enrichment.
