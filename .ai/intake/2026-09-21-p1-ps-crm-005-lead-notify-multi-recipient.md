# PS-CRM-005 — Lead notification email must reach both kim@ and steven@

**Date:** 2026-09-21 · **Priority:** P1 · **Status:** verified on staging 2026-09-21 (send path; kim@ delivery pending DNS)
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

Owner requirement (2026-09-21): lead notification emails go to
**both** `kim@mindbyndr.com` and `steven@mindbyndr.com`. The shipped
implementation (`LeadNotifyService.email`) builds `to: [to]` from a single
`LEAD_NOTIFY_TO` string — one recipient only. Current staging value is
`steven@mindbyndr.com` alone.

Separate constraint (unchanged by this ticket): until `mynaani.com` is
verified in Resend (GoDaddy DNS pending), sandbox sends only reach the
Resend account-owner address. `kim@` delivery requires either domain
verification or a paid-tier allowance — flagged as a deploy-time check,
not a code blocker.

## Options

- **A — Comma-separated `LEAD_NOTIFY_TO`.** Parse the var into a list
  (`"a@x,b@y" → [a@x, b@y]`). One variable, matches Resend's array API,
  no schema change. Env validation splits on comma and validates each
  entry as an email.
- **B — A second variable (`LEAD_NOTIFY_TO_2`).** Simpler code but doesn't
  scale and invites `LEAD_NOTIFY_TO_3`. Rejected.

Option A: comma-separated list in `LEAD_NOTIFY_TO`.

## Edge cases

- Whitespace around commas — trim each entry.
- A malformed entry in the list — validate each entry; a bad one should
  warn and be dropped, not kill the whole send (matches "optional
  capability never throws").
- Empty list after parsing → channel off, same as unset today.
- Duplicate addresses in the list → dedupe before send.
- Staging vs production lists can differ per environment — no code change
  needed, it's just env config.

## Acceptance criteria

- [ ] `LEAD_NOTIFY_TO="steven@mindbyndr.com,kim@mindbyndr.com"` produces a
      Resend send with both addresses in `to`.
- [ ] Unit test covers list parsing: two recipients, whitespace,
      duplicates, malformed entry.
- [ ] `.env.example` documents the comma-separated format.
- [ ] `env.validation.ts` validates each list entry.
- [ ] Staging var updated to both addresses; one smoke form submit shows
      a send to both (Resend sandbox will still only deliver to the
      account owner until DNS verifies — assert the API request, not
      inbox delivery).

## Implemented (2026-09-21)

Option A shipped: `LEAD_NOTIFY_TO` parses as a comma-separated list —
trimmed, email-validated, deduped; malformed entries dropped; empty list
behaves as unset. Unit tests cover multi-recipient, whitespace,
duplicates, malformed entries, and empty list.

## Staging verification (2026-09-21)

Api deployed `a00ea44a`; `LEAD_NOTIFY_TO` set to
`steven@mindbyndr.com,kim@mindbyndr.com`. Smoke submit filed
`cmubbdv3o000102ohkhehtb7o` and the service issued the Resend send —
Resend returned **403** because the sandbox rejects non-account-owner
recipients until `mynaani.com` verifies. Expected and documented: the
multi-recipient request is proven; kim@ inbox delivery awaits DNS.
