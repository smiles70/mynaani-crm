# Intake — Onboarding hard-gates on a Context API key we don't have

**Date:** 2026-09-18
**Status:** shipped to staging — verified e2e
**Process:** v9.51 pipeline (see `PROCESS_AGENTS.md` §2)

## Problem statement

After sign-in, users land on `/onboarding/research` which demands a
**Context API key** — Context.dev, a third-party company-research
enrichment service used by the upstream CRM's research agent. The
field is `required`; there is no skip path. Neither Steven nor Kim
has a Context.dev account. Every new user is blocked at onboarding
until they buy/register with a vendor Mynaani never chose.

## Current state

- `apps/app/app/(landing)/onboarding/research/research-form.tsx`:
  `apiKey` input is `required`, no skip link; on success it
  `router.replace("/")`.
- `CONTEXT_DEV_SIGNUP_URL = "https://link.context.dev/crm"` in
  `packages/db/src/settings.ts` — an upstream vendor referral link.
- The onboarding gate redirects ALL workspace routes until the key is
  set (verified: /workspace, /deals, /companies, /settings all 302 →
  /onboarding in the e2e).
- Repo rule: anything a self-hoster might not have is optional and
  must never throw — this gate violates that spirit.
- Mynaani's planned intelligence (Retell call/chat ingestion,
  submit_partner_inquiry) does not need Context.dev.

## Required state

1. The onboarding step offers "Skip for now" (or equivalent) that
   completes onboarding without a key.
2. The research agent degrades gracefully without the key — the
   optional-capability pattern from `docs/agent.md` /
   `capabilities.ts`.
3. A key can still be added later in `/settings` (the
   `settings/research-key.tsx` surface already exists).
4. The copy no longer implies the key is mandatory to use the CRM.

## Edge cases

- Agent research tasks without the key must fail visibly-but-softly
  (capability flag off), not crash or silently do nothing.
- Workspace gate logic (`workspace-label`/onboarding redirect) must
  release when the step is skipped — verify the redirect target of
  skipping matches the "key saved" path.
- Upstream merge cheapness: keep the change in the form/onboarding
  seam, not scattered.
- If the gate also checks "workspace named", skipping research must
  not bypass required steps — check the onboarding router order.

## Open items

- Skip vs remove the step entirely: skip preserves upstream shape and
  the settings path; remove is cleaner UX but drifts further.
- Whether skipping writes a marker (e.g. settings row) or just
  releases the gate.
