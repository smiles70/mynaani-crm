# PS-CRM-002 — No outbound email capability in CRM

**Date:** 2026-09-20 · **Priority:** P1 · **Status:** implemented — awaiting staging verification
**Parent:** `.ai/intake/2026-09-20-p1-lead-notification-pipeline.md`
**Research:** `.ai/research/2026-09-20-lead-notification-verification.md`

## Problem statement

The CRM cannot send email at all. Requirement: each filed lead emails
`kim@mindbyndr.com`. No mail dependency or send path exists; the
mailbox pipeline is inbound-only.

## Root cause (confirmed)

No `resend`/`nodemailer`/`sendgrid`/`postmark`/`smtp` dependency in any
`package.json`; no send code path. `cron-mailboxes` + `mailbox/` only
ingest.

## Options

- **A — Resend dep in `apps/api`** (recommended): Noni already uses
  Resend; add minimal send module inside `LeadNotifyService`.
  New envs: `RESEND_API_KEY`, `LEAD_NOTIFY_TO`.
- **B — Gmail connection send scope:** the mailbox OAuth connection may
  gain `gmail.send`; sends *as* the connected account — owner visibility
  unclear, scope change needs re-consent.
- **C — Noni-side notify:** repoint Noni's `EMAIL_OVERRIDE_TO`/notify
  address to `kim@` — ships today, but covers only Noni-form leads, not
  Retell filings or agent-created contacts.

## Edge cases

- Same dedupe/skip gating as PS-CRM-001 — notify only on filed contact.
- Send failure must not fail the ingest request (async + retry).
- `LEAD_NOTIFY_TO` configurable; never hardcode the address.
- From-address depends on verified sender domain (Resend `send.` SPF).

## Acceptance

- [ ] kim@mindbyndr.com receives one email per filed lead
- [ ] Provider + env documented in `.env.example` + env.validation.ts
- [ ] Unit test covers send-trigger conditions and failure isolation
- [ ] Live prod submission → delivered email observable

## Implemented (2026-09-20)

Option A shipped: `LeadNotifyService` in `apps/api/src/tracking/`
sends a Resend email per filed lead, invoked by
`TrackingIngestService.submission` after `filing.file` returns
`filed:true`. Dedupe suppresses repeat notifications; missing env vars
disable the channel silently; send failures are logged, never thrown.
Envs: `RESEND_API_KEY`, `LEAD_NOTIFY_TO`, `LEAD_NOTIFY_FROM` — three
homes done (.env.example, env.validation.ts, turbo.json).
