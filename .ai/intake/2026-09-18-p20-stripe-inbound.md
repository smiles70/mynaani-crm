# Intake — Stripe webhook → CRM contact ingestion (learner purchases)

**Date:** 2026-09-18
**Status:** open — parked; option A agreed (direct Stripe → CRM webhook)
**Process:** v9.51 pipeline; reuses the p16 receiver pattern
(`.ai/intake/2026-09-18-p16-retell-inbound.md`, skill:
`omnichannel_skills`)

## Problem statement

The learner (B2C) journey is half-visible in the CRM. The tracking
tag on the app shell already files a Contact on every magic-link
request (`signin-email` input → `emailFrom` → contact) and tracks
page views across `/curriculum` and `/paywall`. But a completed
purchase is invisible: `checkout.session.completed` happens
server-side between Stripe and the Noni backend. The browser
tracker cannot see it, and nothing forwards it. Paying learners
never appear in the CRM.

## Current state

- Noni backend already dedupes Stripe events (`stripe_event`
  model) and handles billing internally — untouched by this intake.
- CRM has the p16 receiver pattern shipped: signed webhook →
  dedupe table → find-or-create Contact → Activity note →
  `agent.contactCreated` trigger.
- No Stripe signing secret, endpoint, or env var exists in the CRM.

## Required state (Option A — Stripe posts directly to the CRM)

1. `POST /api/stripe/webhook` on the CRM API. Verifies Stripe's
   `Stripe-Signature` header (HMAC-SHA256 over raw body + timestamp,
   `STRIPE_WEBHOOK_SECRET`, ~5 min tolerance). Raw-body requirement
   identical to p16.
2. Dedupe on Stripe `event.id` (Stripe retries are normal) — replay
   is a `204` no-op.
3. On `checkout.session.completed`: find-or-create Contact by
   `customer_details.email`; attach Activity note — product
   (`modules_4_5`), amount, currency, Stripe customer id, mode
   (self-purchase vs gift if distinguishable).
4. Optionally handle `customer.subscription.deleted` /
   `charge.refunded` later — out of scope for the first pass.
5. `STRIPE_WEBHOOK_SECRET` in `env.validation.ts` + `.env.example`
   (optional, MinLength). Absent → `503`, never silently accept.
6. Endpoint registered in the Stripe dashboard (test + live modes)
   or via `stripe webhook_endpoints create`.
7. RocketChat alert (p19) can then fire "new paying learner" on the
   same `contactCreated` trigger — no extra work.

## Out of scope

- Entitlement, billing, fulfilment — those stay in the Noni app.
  The CRM records that a person paid, not what they can access.
- Stripe `customer` objects created outside checkout (invoices,
  manual) — capture only `checkout.session.completed` initially.
- Backfill of historical purchasers (could be a one-off script if
  wanted — separate intake).

## Edge cases

- Learner pays with a different email than their magic-link email →
  two contacts; the agent's identify task can merge later.
- Gift purchases: buyer email ≠ learner email. The note should say
  who paid; do NOT assume the buyer is the learner.
- `checkout.session.completed` can arrive before
  `payment_intent.succeeded` — file on checkout completion; payment
  state is Noni's concern.
- Stripe test-mode events carry no real identity — fine in staging.
- Free-track learners who never pay stay as TRACKING-sourced
  contacts — no change.

## Open items

- Stripe mode(s): wire test + live, or live only.
- Whether the note should distinguish self-purchase vs gift
  (check what `checkout.session` metadata Noni sets — may need a
  `metadata.journey` field added Noni-side for clean labelling).
- Sequencing vs p17/p18/p19.
