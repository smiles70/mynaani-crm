# Intake — Lead notification pipeline: RocketChat + email on every form entry

**Date:** 2026-09-20
**Status:** intake
**Process:** v9.51 (see `PROCESS_AGENTS.md`)
**Source:** owner requirement — every site form submission must (1) file
a CRM entry, (2) fire an email to `kim@mindbyndr.com`, (3) post a
RocketChat notification.

## Verified current state (2026-09-20, prod-checked via Railway API + repo)

| Link | Status | Evidence |
| --- | --- | --- |
| Form → CRM entry | **Working** | `TrackingIngestService` keeps `form_submit`; `TrackingFilingService.file` is the only path to `Contact`; prod ingest returns 204 live |
| CRM → RocketChat | **Dead config** | `ROCKETCHAT_WEBHOOK_URL` is set on the Railway `agent` service, but **zero code references it** — no reader anywhere in this repo |
| CRM → email `kim@` | **Not built** | No outbound-mail dependency or code anywhere (`resend`/`nodemailer`/`sendgrid`/`smtp` — none in any package.json); mailbox pipeline is inbound-only |
| Agent notification | Partial | `agent.contactCreated` enqueues a `kind:"identify"` AgentTask — the agent is told about new contacts but has no notify tool |

## Problem statement

New leads (contact, partner, gift forms on mynaani.com) land in the CRM
silently. Kim never learns about them unless she opens the CRM. The
intended loop — form → CRM row → email to kim@mindbyndr.com + RocketChat
ping — exists only for its first leg.

## Options

### A — eve agent action (follows the Slack pattern)

Add `AGENT_ACTION_TYPES.ROCKETCHAT_MESSAGE_POST` beside
`SLACK_MESSAGE_POST` in `apps/agent/agent/lib/agent-actions.ts` — the
eve pattern: agent gets a `post_rocketchat_message` tool, gated on the
`ROCKETCHAT_WEBHOOK_URL` capability. Email goes through an eve tool too
(new dep for outbound send).

- Fits "intelligence lives in apps/agent"; the notify decision can use
  context (lead source, dedupe, quiet hours).
- Heavier: the agent must be invoked and choose to act for a routine
  ping; a missed agent run means a missed notification.

### B — deterministic notify step in the API (plumbing, not intelligence)

`TrackingFilingService.file` already knows when a *new* contact is
filed. A thin `LeadNotifyService` posts to `ROCKETCHAT_WEBHOOK_URL` and
sends email immediately after a successful `file` — the same place
`agent.contactCreated` is called. No agent involvement.

- Notification is plumbing: same message every time, no judgement
  needed → deterministic beats agentic here (api.md's rule is about
  *intelligence*, not transport).
- Cheapest path: one POST to the webhook + one email send, idempotent
  on `dedupeKey`; cannot silently skip like an agent task can.
- RocketChat needs no new dependency — incoming webhooks accept a plain
  HTTP POST.

### C — keep email out of the CRM entirely

Noni's backend already emails on inquiry via Resend (currently
`EMAIL_OVERRIDE_TO=steven@mindbyndr.com`). Point it at `kim@` — zero CRM
code. But the notification then originates outside the CRM and won't
fire for leads that arrive via other paths (Retell call filing, agent
tool submissions).

## Recommendation

**B for RocketChat + C→B hybrid for email**: RocketChat webhook post in
`LeadNotifyService` (deterministic, zero new deps). For email, decide at
implementation: if Noni's Resend notification can switch to `kim@`
without losing steven's copy, that ships today; the CRM-side email send
(via a new mail dep or the existing Gmail connection's send scope) is
the durable fix but needs a provider decision.

## Edge cases

- **Duplicate submissions** — `dedupeKey` collapses resends within 1
  min; notify must hook post-`file` so duplicates don't double-ping.
- **Filed-as-skip** (`skipReason`, machine addresses, suppressed
  domains) — notify only on a *filed* contact, not every stored row.
- **CRM-side Retell filings** — Retell call entries should notify too;
  hook must cover every path that creates a Contact, not just forms.
- **Webhook down / RocketChat restart** — fire-and-log with retry, not
  blocking the ingest response.
- **`ROCKETCHAT_WEBHOOK_URL` missing** — capability-optional per
  AGENTS.md: absent var removes the capability, never throws.
- **Email provider choice** — Resend (new dep) vs connected Gmail send
  scope vs staying in Noni backend.
- **Quiet hours / digest** — out of scope for v1; note for follow-up.

## Acceptance

- [ ] Every path that files a Contact emits exactly one RocketChat post
      to `#crm-alerts` (or the configured channel) with name/email/source
- [ ] kim@mindbyndr.com receives an email per filed lead (provider TBD)
- [ ] Duplicate/skipped submissions produce no notifications
- [ ] Missing webhook URL degrades silently; covered by unit test
- [ ] Real prod form submission → observable CRM row + RC ping + email

