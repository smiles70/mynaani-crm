# PS-CRM-009 — Restore `zai/glm-5.2` (or stronger) once gateway credits are topped up

**Date:** 2026-09-21 · **Priority:** P3 — future enhancement · **Status:** parked
**Parent:** `.ai/intake/2026-09-21-p1-ps-crm-008-agent-ai-gateway-creds.md`

## Context

PS-CRM-008 resolved the credential problem by moving the agent model to
`zai/glm-4.7-flash` — free-tier, proven working, 200k context. The
trade-off: flash is a weaker, faster model than the configured default
`glm-5.2-fast` (1M context). Enrichment and agent task quality may be
lower until a paid model is restored.

## Trigger to un-park

Owner tops up paid credits on the Vercel AI Gateway (the $5 free
credits do not unlock restricted models — `RestrictedModelsError` is
per-model, not per-account).

## Change

- [ ] Set `AppSetting.agentModelId` back to `zai/glm-5.2-fast` (and
      `agentModelContextWindow` to `1000000`) in Settings → Agent on
      production and staging — no deploy needed, read per session.
- [ ] Verify one agent task completes a `MODEL_CALL` against `glm-5.2`.
- [ ] Alternatively evaluate `zai/glm-5.2` (non-fast) or a paid
      Anthropic tier — gateway catalog lists the pricing per model.
