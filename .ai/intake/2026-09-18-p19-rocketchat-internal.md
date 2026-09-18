# Intake — RocketChat as private Steven↔Kim ops channel + notifications

**Date:** 2026-09-18
**Status:** staging-green — RC workspace + #crm-alerts notifier live on
staging (2026-09-18); Steven/Kim accounts + prod rollout still pending
**Process:** v9.51 pipeline; research updated in
`.ai/research/2026-09-18-automation-assessment.md`

## Problem statement

Steven and Kim need a business communication channel beyond email —
private, self-hosted, consistent with the private-CRM posture. It
must push them a notification whenever a site form is submitted or a
call/chat leaves a message.

**Explicitly out of scope:** Omnichannel/livechat, site visitors,
any customer-facing surface. Internal two-person ops channel only.

## Current state

- No internal chat exists; email only.
- CRM already files contacts on form submit (live) and fires
  `agent.contactCreated` tasks.
- CRM has a Slack integration the agent uses for posting — Slack is
  not connected, and the user wants RocketChat instead.
- Retell voicemail/message events not yet ingested (p16 intake lane).

## Required state

1. RocketChat workspace on Railway, public registration off, exactly
   two accounts (Steven, Kim), plus a notification bot.
2. `#crm-alerts` (or similar) channel receives a message on:
   - a) form submission filed as a Contact (name, org, link to record)
   - b) Retell call that left a message / completed inquiry
   - c) Retell chat that captured a contact
3. Notification is fire-and-forget and optional — missing webhook URL
   must never break filing (capabilities pattern).
4. Mobile apps work for Steven/Kim (RC has iOS/Android clients).

## Design notes (from research)

- RC incoming webhooks accept Slack-format payloads —
  `POST /hooks/{id}/{token}` with `{"text": ...}`. The notification
  path is one HTTP call.
- Deployment: RC app service + MongoDB service on Railway (MongoDB
  is a hard dependency). Internal-only usage → smallest resource
  tier; still a stateful service needing backups.
- Notification firing point: agent-side notifier, not the API
  ("intelligence lives in apps/agent") — hook `contactCreated` task
  handling + future Retell intake tasks.
- Webhook URL lives as env/setting: `ROCKETCHAT_WEBHOOK_URL`.
  Absent → capability off.

## Edge cases

- Notification fires before/without full contact data — post name +
  email + org, link to CRM record.
- RC down → notification lost; filing unaffected (fire-and-forget,
  log only).
- Voicemail before p16 lands → b/c notifications start when the
  Retell webhook ships; forms notify immediately.
- Two webhooks (forms vs calls) vs one channel — one channel,
  message prefixes `[form]`/`[call]`/`[chat]`.
- MongoDB backup — reuse the Noni nightly-backup pattern.
- Spam from junk contacts → notification only on successfully filed
  contacts, not skipped submissions.

## Open items

- Channel name + message format preference.
- Whether notifications should also go to email as fallback.
