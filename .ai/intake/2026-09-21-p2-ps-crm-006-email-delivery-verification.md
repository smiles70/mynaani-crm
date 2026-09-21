# PS-CRM-006 — Lead notification email delivery is unverified end-to-end

**Date:** 2026-09-21 · **Priority:** P2 · **Status:** intake
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

The 2026-09-21 staging smoke proved the API accepted the send: a filed
contact produced zero `LeadNotifyService` warnings, meaning Resend
returned 2xx. But `RESEND_API_KEY` is a **send-restricted key** —
`GET /emails` returns 401 — so there is no programmatic way to confirm the
message was accepted *for delivery*, queued, or actually arrived.

Current proof is absence-of-error only. Nothing has observed an email in
any inbox.

## Options

- **A — Human inbox check (no code).** Ask the owner to look at the
  `steven@mindbyndr.com` inbox for `New lead: PS-CRM-002 Smoke Three`
  (~2026-09-21 04:22 UTC). Cheapest possible verification; already
  possible right now.
- **B — Resend dashboard check.** The Resend account's Emails log shows
  delivery status for every send regardless of key scope. Owner clicks
  the dashboard; no code.
- **C — Resend webhook → CRM.** Resend can POST delivery/bounce events to
  an endpoint; logging `email.delivered` would make future verification
  self-serve. More moving parts; worth it only if lead volume grows.
- **D — Full-access API key for verification only.** Rotate to a key with
  read scope — weakens the least-privilege posture for marginal gain.
  Rejected.

Options A/B close this ticket today. Option C is a candidate follow-up
intake if verification becomes routine.

## Edge cases

- Sandbox sender (`onboarding@resend.dev`) delivers only to the Resend
  account-owner address — a "no email in kim@'s inbox" result is expected
  until DNS verifies and is NOT a bug; the assertion is delivery to the
  account-owner address.
- Resend may accept (2xx) then bounce — a bounce is still a successful
  API send; delivery failure needs the dashboard or webhook to see.

## Acceptance criteria

- [ ] The smoke email (`New lead: PS-CRM-002 Smoke Three`,
      `smoke3-pscrm002@verify-lead.test`, sent ~2026-09-21 04:22 UTC) is
      confirmed received or its Resend dashboard status recorded.
- [ ] Result written back into this intake; PS-CRM-002 closes only after
      this verification lands.
