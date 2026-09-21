# PS-CRM-007 — One undeliverable recipient must not cancel the whole lead email

**Date:** 2026-09-21 · **Priority:** P1 · **Status:** verified on staging 2026-09-21
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`

## Problem statement

With `LEAD_NOTIFY_TO=steven@mindbyndr.com,kim@mindbyndr.com` on staging,
Resend rejected the entire send with 403 — sandbox mode refuses
non-account-owner recipients, and a multi-recipient send is all-or-
nothing. Result: while `mynaani.com` DNS verification is pending, **no**
lead email reaches anyone, including `steven@`.

Confirmed in code: `LeadNotifyService.email` builds `to: [...]` and sends
a single Resend request — one rejectable address cancels every address.
Observed live: staging log `Lead notify email returned non-2xx status=403`
on `cmubbdv3o000102ohkhehtb7o`.

## Options

- **A — One send per recipient.** Loop the recipient list; each Resend
  request carries a single `to`. A 403 on `kim@` leaves `steven@`'s copy
  delivered, and the warn names the failed address. Also right long-term:
  per-recipient failure isolation survives any future deliverability
  issue, not just sandbox.
- **B — Revert staging to steven@ only until DNS.** Zero code, but the
  production config then ships the same all-or-nothing bug — any
  deliverability problem on one address silently kills all lead email.
  Rejected: fixes the symptom, keeps the defect.
- **C — Resend batch endpoint.** Sends N emails in one API call. Same
  isolation as A with fewer HTTP calls, but adds a second endpoint's
  failure semantics. A is simpler; C is a later optimisation.

Option A.

## Edge cases

- Mixed list where some addresses fail and some pass — each send
  independent; per-recipient warn carries the address.
- All recipients fail — each warn logs; ingest still unaffected
  (notify is fire-and-forget, never throws).
- Rate limits — two sends per lead is trivial volume; no batching needed
  at current scale.
- The email body/subject is identical per recipient — no templating
  change.

## Acceptance criteria

- [ ] With a mixed list (`steven@` + `kim@`), steven@'s send succeeds and
      kim@'s failure logs a warn naming the address — verified on staging.
- [ ] Unit test: per-recipient send count, partial-failure isolation.
- [ ] Production gets the same code; kim@ delivery unblocks itself when
      DNS verifies — no config change needed.

## Implemented + staging verification (2026-09-21)

`email()` loops the parsed recipient list; `send()` issues one Resend
request per address so each is independent. Api deployed `8842810b`.
Smoke contacts `smoke-pscrm007@` and `smoke-b-pscrm007@verify-lead.test`
filed and were stamped `alertedAt` by the new sweep on the next tick.
Unit test proves partial-failure isolation (steven@ 200 + kim@ 403 →
both attempted independently). Live inbox delivery remains the
PS-CRM-006 human check — Resend key is send-only.

## Correction (2026-09-21)

First prod verification ran while env vars were pending (--skip-deploys)
— no sends occurred. After api redeploy 9f811248: per-recipient behavior
confirmed live — steven@ 2xx, kim@ 403 logged with the address named.
