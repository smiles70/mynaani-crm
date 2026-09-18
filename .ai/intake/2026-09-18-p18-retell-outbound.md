# Intake — Retell outbound calls (callback + outreach)

**Date:** 2026-09-18
**Status:** open — workstream started for the learner-help lane
**Process:** v9.51 pipeline; paired with the Noni
`learner-help-channel` intake and p19 RocketChat alerts.

## Problem statement

The Retell agent answers inbound calls only. Two flows need it to
dial out:

1. **Learner callback (primary driver):** a stuck learner taps
   "Call me" → the Retell outbound agent must dial their number
   within seconds, 24/7.
2. **Scheduled outreach (original p18 scope):** the CRM should be
   able to place calls to contacts (e.g., a facility said "call me
   Thursday") — agent-initiated, recorded as activity.

## Current state

- Voice agent `agent_83c72268174e906ec2ed82a564` answers inbound on
  +18774094144; p16 files every completed call as a CRM contact.
- Retell API key (webhook-badged) is set on staging + prod CRM API.
- No outbound capability exists anywhere; no `create-phone-call`
  call in either codebase.

## Required state (learner lane first)

1. Noni backend `POST /api/help/callback` calls Retell
   `POST /v2/create-phone-call` — `from_number` +18774094144,
   `to_number` = learner's number, `override_agent_id` = voice agent
   (or a dedicated outbound agent if persona needs differ).
2. The outbound call rings from the toll-free number the learner
   just saw on screen ("it will ring from 1-877-409-4144").
3. The completed outbound call still hits `/api/retell/webhook`
   (`call_ended` fires for outbound too) → contact + activity in
   the CRM. Verify `from_number`/`to_number` direction is handled —
   for outbound, the learner is `to_number`, not `from_number`.
   (Filing code must not file the toll-free line as the contact.)
4. Rate-limit / abuse guard on the callback endpoint — a public
   "call any number" endpoint is a toll-fraud vector. Signed-in
   learner or throttled anonymous; cap per number/day.
5. Outreach lane (later): CRM-side "call this contact" action →
   same create-phone-call path, triggered by the agent or a
   scheduled task; records an activity.

## Edge cases

- Bad/typo number → Retell API rejects or call fails fast; surface
  "we couldn't reach that number" state, don't retry silently.
- Learner doesn't pick up → no auto-redial spam (one retry max,
  or none); RC alert still tells a human to try.
- Same number hammered → per-number and per-IP rate caps.
- Outbound webhook direction → filing must use `to_number` for
  outbound identity (edge case for the p16 identityOf path).
- After-hours calls → Retell is 24/7; human follow-up is not —
  copy must not promise a person at 3am. The AI answers; humans
  follow up via the RC alert.
- International numbers → restrict to +1 to match the product's
  service area (and toll-fraud exposure).

## Open items

- Dedicated outbound agent vs reusing the voice agent — the
  receptionist prompt is inbound-framed; an outbound "you asked
  for help" opening line may need a separate agent or
  `retell_llm_dynamic_variables`.
- Cost per outbound call (~per-minute) — owner should know the
  running cost, no action needed.
- Sequencing: learner lane ships with the Noni help card; outreach
  lane can wait for its own sub-intake.
